import { createClient, type RedisClientType } from 'redis';

export interface RateLimitPolicy {
  capacity: number;
  refillWindowMs: number;
}

export interface CircuitBreakerPolicy {
  failureThreshold: number;
  failureWindowMs: number;
  cooldownMs: number;
}

export interface GovernanceDecision {
  allowed: boolean;
  retryAfterMs: number;
}

export interface TaskGovernance {
  consume(key: string, policy: RateLimitPolicy): Promise<GovernanceDecision>;
  allowProvider(providerKey: string, operation: string, policy: CircuitBreakerPolicy): Promise<GovernanceDecision>;
  recordProviderOutcome(providerKey: string, operation: string, success: boolean, policy: CircuitBreakerPolicy): Promise<void>;
  close(): Promise<void>;
}

interface TokenBucketState {
  tokens: number;
  updatedAt: number;
}

interface CircuitState {
  failures: number[];
  openUntil: number;
  probeActive: boolean;
}

const consumeTokenBucketScript = `
local tokens = tonumber(redis.call('HGET', KEYS[1], 'tokens'))
local updatedAt = tonumber(redis.call('HGET', KEYS[1], 'updated_at'))
local capacity = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
if not tokens then tokens = capacity end
if not updatedAt then updatedAt = now end
local elapsed = math.max(0, now - updatedAt)
tokens = math.min(capacity, tokens + (elapsed * capacity / windowMs))
local allowed = 0
local retryAfterMs = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
else
  retryAfterMs = math.ceil((1 - tokens) * windowMs / capacity)
end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'updated_at', now)
redis.call('PEXPIRE', KEYS[1], windowMs * 2)
return { allowed, retryAfterMs }
`;

const allowCircuitProbeScript = `
local now = tonumber(ARGV[1])
local openUntil = tonumber(redis.call('HGET', KEYS[1], 'open_until')) or 0
if openUntil > now then
  return { 0, openUntil - now }
end
if openUntil > 0 then
  local probe = redis.call('HSETNX', KEYS[1], 'probe_active', 1)
  if probe == 0 then return { 0, 1000 } end
  redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[2]))
end
return { 1, 0 }
`;

const recordCircuitOutcomeScript = `
local now = tonumber(ARGV[1])
local success = ARGV[2] == '1'
local threshold = tonumber(ARGV[3])
local windowMs = tonumber(ARGV[4])
local cooldownMs = tonumber(ARGV[5])
if success then
  redis.call('DEL', KEYS[2])
  redis.call('HSET', KEYS[1], 'open_until', 0)
  redis.call('HDEL', KEYS[1], 'probe_active')
  redis.call('PEXPIRE', KEYS[1], cooldownMs)
  return 0
end
local member = tostring(now) .. ':' .. tostring(redis.call('INCR', KEYS[2] .. ':sequence'))
redis.call('ZADD', KEYS[2], now, member)
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now - windowMs)
local count = redis.call('ZCARD', KEYS[2])
redis.call('PEXPIRE', KEYS[2], windowMs)
redis.call('PEXPIRE', KEYS[2] .. ':sequence', windowMs)
redis.call('HDEL', KEYS[1], 'probe_active')
if count >= threshold then
  redis.call('HSET', KEYS[1], 'open_until', now + cooldownMs)
  redis.call('PEXPIRE', KEYS[1], cooldownMs)
end
return count
`;

function providerKey(provider: string, operation: string) {
  return `rankwoven:provider:${provider}:${operation}`;
}

function normalizePolicy(policy: RateLimitPolicy) {
  if (!Number.isFinite(policy.capacity) || policy.capacity <= 0 || !Number.isFinite(policy.refillWindowMs) || policy.refillWindowMs <= 0) {
    throw new Error('RATE_LIMIT_POLICY_INVALID');
  }
  return policy;
}

function normalizeCircuitPolicy(policy: CircuitBreakerPolicy) {
  if (
    !Number.isFinite(policy.failureThreshold) || policy.failureThreshold <= 0 ||
    !Number.isFinite(policy.failureWindowMs) || policy.failureWindowMs <= 0 ||
    !Number.isFinite(policy.cooldownMs) || policy.cooldownMs <= 0
  ) {
    throw new Error('CIRCUIT_BREAKER_POLICY_INVALID');
  }
  return policy;
}

export function createInMemoryTaskGovernance(now: () => number = Date.now): TaskGovernance {
  const buckets = new Map<string, TokenBucketState>();
  const circuits = new Map<string, CircuitState>();

  return {
    async consume(key, input) {
      const policy = normalizePolicy(input);
      const currentTime = now();
      const state = buckets.get(key) ?? { tokens: policy.capacity, updatedAt: currentTime };
      const elapsed = Math.max(0, currentTime - state.updatedAt);
      const tokens = Math.min(policy.capacity, state.tokens + (elapsed * policy.capacity) / policy.refillWindowMs);
      if (tokens < 1) {
        buckets.set(key, { tokens, updatedAt: currentTime });
        return { allowed: false, retryAfterMs: Math.ceil(((1 - tokens) * policy.refillWindowMs) / policy.capacity) };
      }
      buckets.set(key, { tokens: tokens - 1, updatedAt: currentTime });
      return { allowed: true, retryAfterMs: 0 };
    },
    async allowProvider(provider, operation, input) {
      normalizeCircuitPolicy(input);
      const key = providerKey(provider, operation);
      const state = circuits.get(key) ?? { failures: [], openUntil: 0, probeActive: false };
      const currentTime = now();
      if (state.openUntil > currentTime) {
        circuits.set(key, state);
        return { allowed: false, retryAfterMs: state.openUntil - currentTime };
      }
      if (state.openUntil > 0 && state.probeActive) return { allowed: false, retryAfterMs: 1_000 };
      if (state.openUntil > 0) state.probeActive = true;
      circuits.set(key, state);
      return { allowed: true, retryAfterMs: 0 };
    },
    async recordProviderOutcome(provider, operation, success, input) {
      const policy = normalizeCircuitPolicy(input);
      const key = providerKey(provider, operation);
      const currentTime = now();
      const state = circuits.get(key) ?? { failures: [], openUntil: 0, probeActive: false };
      if (success) {
        circuits.set(key, { failures: [], openUntil: 0, probeActive: false });
        return;
      }
      state.failures = state.failures.filter((timestamp) => timestamp >= currentTime - policy.failureWindowMs);
      state.failures.push(currentTime);
      state.probeActive = false;
      if (state.failures.length >= policy.failureThreshold) state.openUntil = currentTime + policy.cooldownMs;
      circuits.set(key, state);
    },
    async close() {}
  };
}

export function createRedisTaskGovernance(redisUrl: string): TaskGovernance {
  const client: RedisClientType = createClient({ url: redisUrl });
  let connectPromise: Promise<unknown> | undefined;

  async function getClient() {
    if (!client.isOpen) {
      connectPromise ??= client.connect();
      await connectPromise;
    }
    return client;
  }

  return {
    async consume(key, input) {
      const policy = normalizePolicy(input);
      const result = await (await getClient()).eval(consumeTokenBucketScript, {
        keys: [`rankwoven:rate:${key}`],
        arguments: [String(policy.capacity), String(policy.refillWindowMs), String(Date.now())]
      }) as [number, number];
      return { allowed: Number(result[0]) === 1, retryAfterMs: Number(result[1]) };
    },
    async allowProvider(provider, operation, input) {
      const policy = normalizeCircuitPolicy(input);
      const result = await (await getClient()).eval(allowCircuitProbeScript, {
        keys: [providerKey(provider, operation)],
        arguments: [String(Date.now()), String(policy.cooldownMs)]
      }) as [number, number];
      return { allowed: Number(result[0]) === 1, retryAfterMs: Number(result[1]) };
    },
    async recordProviderOutcome(provider, operation, success, input) {
      const policy = normalizeCircuitPolicy(input);
      const key = providerKey(provider, operation);
      await (await getClient()).eval(recordCircuitOutcomeScript, {
        keys: [key, `${key}:failures`],
        arguments: [
          String(Date.now()), success ? '1' : '0', String(policy.failureThreshold),
          String(policy.failureWindowMs), String(policy.cooldownMs)
        ]
      });
    },
    async close() {
      if (client.isOpen) await client.quit();
    }
  };
}
