import {
  assertTaskTransition,
  type Phase2TaskStatus
} from '@aieo/ai-providers';

export function getPhase2RetryDelayMs(retryCount: number, baseDelayMs = 5_000, maxDelayMs = 60_000) {
  const normalizedRetryCount = Math.max(0, Math.floor(retryCount));
  return Math.min(maxDelayMs, 2 ** normalizedRetryCount * baseDelayMs);
}

export function getPhase2RetryDelayWithJitterMs(
  retryCount: number,
  random: () => number = Math.random,
  baseDelayMs = 5_000,
  maxDelayMs = 600_000
) {
  const baseDelay = getPhase2RetryDelayMs(retryCount, baseDelayMs, maxDelayMs);
  const jitter = Math.max(0, Math.min(1, random())) * baseDelay * 0.2;
  return Math.floor(baseDelay + jitter);
}

export function isRetryablePhase2ErrorCode(errorCode: string) {
  return errorCode === 'TASK_LEASE_EXPIRED' ||
    errorCode === 'RATE_LIMIT_UNAVAILABLE' ||
    errorCode === 'PROVIDER_UNAVAILABLE' ||
    errorCode === 'AI_GATEWAY_TIMEOUT' ||
    /^AI_GATEWAY_HTTP_(429|5\d\d)$/.test(errorCode) ||
    errorCode === 'KEYWORD_PROVIDER_TIMEOUT' ||
    /^KEYWORD_PROVIDER_HTTP_(429|5\d\d)$/.test(errorCode);
}

export function getPhase2FailureStatus(retryCount: number, maxRetries: number): Phase2TaskStatus {
  return retryCount > maxRetries ? 'dead_letter' : 'queued';
}

export function validatePhase2Transition(from: Phase2TaskStatus, to: Phase2TaskStatus) {
  assertTaskTransition(from, to);
  return true;
}
