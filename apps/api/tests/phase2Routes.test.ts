import { describe, expect, it } from 'vitest';
import { createInMemoryPhase2Repository, createInMemoryTaskGovernance, type KeywordResearchProvider } from '@aieo/ai-providers';
import { createServer } from '../src/server';
import { createInMemorySiteConnectionRepository } from '../src/siteConnections';

const workspaceId = '00000000-0000-4000-8000-000000000001';

async function login(server: ReturnType<typeof createServer>) {
  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: 'demo@rankwoven.com', password: 'rankwoven' }
  });
  expect(response.statusCode).toBe(200);
  return response.json<{ data: { token: string } }>().data.token;
}

describe('phase 2 contract routes', () => {
  it('requires authentication and preserves workspace isolation for task reads', async () => {
    const repository = createInMemoryPhase2Repository();
    const server = createServer({ phase2Repository: repository });
    const unauthenticated = await server.inject({
      method: 'GET',
      url: '/api/v1/tasks/00000000-0000-4000-8000-000000000099'
    });
    expect(unauthenticated.statusCode).toBe(401);

    const otherTask = await repository.createTask({
      workspaceId: '00000000-0000-4000-8000-000000000002',
      kind: 'keyword_research',
      estimatedCredits: 1
    });
    const token = await login(server);
    const response = await server.inject({
      method: 'GET',
      url: `/api/v1/tasks/${otherTask.id}`,
      headers: { authorization: `Bearer ${token}` }
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('WORKSPACE_RESOURCE_NOT_FOUND');
  });

  it('returns a 202 model sync task and replays the same idempotent response', async () => {
    const repository = createInMemoryPhase2Repository();
    const server = createServer({ phase2Repository: repository });
    const token = await login(server);
    const headers = {
      authorization: `Bearer ${token}`,
      'idempotency-key': 'model-sync-1'
    };

    const first = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/ai-gateway/models/sync',
      headers
    });
    const second = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/ai-gateway/models/sync',
      headers
    });

    expect(first.statusCode).toBe(202);
    expect(second.statusCode).toBe(202);
    expect(second.json()).toEqual(first.json());
    expect(second.json().data.estimatedCredits).toBe(0);

    const models = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/ai-gateway/models',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(models.statusCode).toBe(200);
    expect(models.json()).toMatchObject({ success: true, data: { models: [] } });

    const profiles = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/ai-gateway/profiles',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(profiles.statusCode).toBe(200);
    expect(profiles.json().data.profiles).toHaveLength(5);
  });

  it('limits new provider tasks per actor without charging idempotent replays twice', async () => {
    const repository = createInMemoryPhase2Repository();
    const server = createServer({
      phase2Repository: repository,
      taskGovernance: createInMemoryTaskGovernance()
    });
    const token = await login(server);
    for (let index = 0; index < 5; index += 1) {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/admin/ai-gateway/models/sync',
        headers: {
          authorization: `Bearer ${token}`,
          'idempotency-key': `model-rate-limit-${index}`
        }
      });
      expect(response.statusCode).toBe(202);
    }
    const limited = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/ai-gateway/models/sync',
      headers: {
        authorization: `Bearer ${token}`,
        'idempotency-key': 'model-rate-limit-six'
      }
    });
    expect(limited.statusCode).toBe(429);
    expect(limited.json().error.code).toBe('RATE_LIMIT_EXCEEDED');
    const replay = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/ai-gateway/models/sync',
      headers: {
        authorization: `Bearer ${token}`,
        'idempotency-key': 'model-rate-limit-0'
      }
    });
    expect(replay.statusCode).toBe(202);
  });

  it('does not assign an unverified model to a gateway profile', async () => {
    const repository = createInMemoryPhase2Repository();
    const server = createServer({ phase2Repository: repository });
    const token = await login(server);
    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/admin/ai-gateway/profiles/text.default',
      headers: {
        authorization: `Bearer ${token}`,
        'idempotency-key': 'profile-update-1'
      },
      payload: { modelId: 'not-verified' }
    });
    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe('PROVIDER_UNAVAILABLE');
  });

  it('cancels a queued task only once and reports usage summary', async () => {
    const repository = createInMemoryPhase2Repository();
    const server = createServer({ phase2Repository: repository });
    const token = await login(server);
    const task = await repository.createTask({
      workspaceId,
      kind: 'content_optimization',
      estimatedCredits: 3
    });
    await repository.reserveUsage({
      workspaceId,
      operation: 'content_optimization',
      units: 1,
      costEstimate: 0.3
    });

    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/tasks/${task.id}/cancel`,
      headers: {
        authorization: `Bearer ${token}`,
        'idempotency-key': 'cancel-task-1'
      }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.task.status).toBe('cancelled');

    const usage = await server.inject({
      method: 'GET',
      url: '/api/v1/usage',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(usage.statusCode).toBe(200);
    expect(usage.json().data).toMatchObject({ reservedUnits: 1, reservedCost: 0.3 });
  });

  it('requests cancellation for running work and preserves dead-letter replay history', async () => {
    const repository = createInMemoryPhase2Repository();
    const server = createServer({ phase2Repository: repository });
    const token = await login(server);
    const runningTask = await repository.createTask({
      workspaceId,
      kind: 'gateway_model_sync',
      estimatedCredits: 0
    });
    await repository.transitionTask(runningTask.id, workspaceId, 'queued', 'running');
    const cancellation = await server.inject({
      method: 'POST',
      url: `/api/v1/tasks/${runningTask.id}/cancel`,
      headers: { authorization: `Bearer ${token}`, 'idempotency-key': 'cancel-running-1' }
    });
    expect(cancellation.statusCode).toBe(202);
    expect(cancellation.json().data.task.status).toBe('cancellation_requested');

    const deadLetter = await repository.createTask({
      workspaceId,
      kind: 'keyword_research',
      estimatedCredits: 1
    });
    await repository.transitionTask(deadLetter.id, workspaceId, 'queued', 'running');
    await repository.transitionTask(deadLetter.id, workspaceId, 'running', 'failed');
    await repository.transitionTask(deadLetter.id, workspaceId, 'failed', 'dead_letter');
    const listed = await server.inject({
      method: 'GET',
      url: '/api/v1/tasks/dead-letter?page=1&pageSize=20',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().data.items).toHaveLength(1);
    const replay = await server.inject({
      method: 'POST',
      url: `/api/v1/tasks/${deadLetter.id}/replays`,
      headers: { authorization: `Bearer ${token}`, 'idempotency-key': 'replay-dead-letter-1' },
      payload: { reason: '供應商已恢復' }
    });
    expect(replay.statusCode).toBe(202);
    expect(replay.json().data.task.replayOfTaskId).toBe(deadLetter.id);
  });

  it('creates an idempotent workspace-scoped keyword research project', async () => {
    const repository = createInMemoryPhase2Repository();
    const siteConnectionRepository = createInMemorySiteConnectionRepository();
    const site = await siteConnectionRepository.create({
      platform: 'wordpress',
      name: 'Keyword Project Site',
      siteUrl: 'https://keyword-project.example.test'
    });
    const server = createServer({ phase2Repository: repository, siteConnectionRepository });
    const token = await login(server);
    const headers = { authorization: `Bearer ${token}`, 'idempotency-key': 'keyword-project-1' };
    const payload = {
      siteId: site.site.id,
      name: 'Yoga Mats',
      market: 'US',
      language: 'en',
      device: 'desktop',
      engine: 'google'
    };
    const first = await server.inject({ method: 'POST', url: '/api/v1/keyword-research/projects', headers, payload });
    const second = await server.inject({ method: 'POST', url: '/api/v1/keyword-research/projects', headers, payload });
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(second.json()).toEqual(first.json());

    const projects = await server.inject({
      method: 'GET',
      url: '/api/v1/keyword-research/projects?page=1&pageSize=20',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(projects.statusCode).toBe(200);
    expect(projects.json().data.items).toHaveLength(1);

    const run = await server.inject({
      method: 'POST',
      url: `/api/v1/keyword-research/projects/${first.json().data.project.id}/runs`,
      headers: { authorization: `Bearer ${token}`, 'idempotency-key': 'keyword-run-1' },
      payload: { seedKeywords: ['eco-friendly yoga mat'] }
    });
    // Free keyword provider is always available; without entitlement the run is blocked.
    expect(run.statusCode).toBe(403);
    expect(run.json().error.code).toBe('ENTITLEMENT_REQUIRED');
  });

  it('queues a keyword research run with provider metadata and quota governance', async () => {
    const repository = createInMemoryPhase2Repository();
    const siteConnectionRepository = createInMemorySiteConnectionRepository();
    const site = await siteConnectionRepository.create({ platform: 'wordpress', name: 'Research Run Site', siteUrl: 'https://research-run.example.test' });
    const project = await repository.createKeywordResearchProject({ workspaceId, siteId: site.site.id, name: 'Research', market: 'US', language: 'en' });
    await repository.saveEntitlement({
      id: '00000000-0000-4000-8000-000000000201',
      workspaceId,
      featureKey: 'keyword_research',
      limitValue: 10,
      period: 'monthly',
      source: 'test',
      effectiveAt: new Date(Date.now() - 1_000).toISOString()
    });
    const provider: KeywordResearchProvider = {
      id: 'dataforseo',
      async getCapabilities() { return { provider: 'dataforseo', supportsKeywordMetrics: true, supportsCompetitorRankedKeywords: true, supportsBacklinkOpportunities: false }; },
      async discoverKeywordMetrics() { return { provider: 'dataforseo', providerSnapshotId: 'fixture-snapshot', methodologyVersion: 'fixture-v1', location: 'US', language: 'en', device: 'desktop', collectedAt: new Date().toISOString(), sourceType: 'provider_estimated', metrics: [], estimatedCost: 0 }; },
      async getCompetitorRankedKeywords(input) { return { provider: 'dataforseo', providerSnapshotId: 'fixture-competitor', methodologyVersion: 'fixture-v1', location: input.market, language: input.language, device: input.device, collectedAt: new Date().toISOString(), sourceType: 'provider_estimated', domain: input.domain, keywords: [], estimatedCost: 0 }; }
    };
    const server = createServer({ phase2Repository: repository, siteConnectionRepository, keywordResearchProvider: provider });
    const token = await login(server);
    const headers = { authorization: `Bearer ${token}`, 'idempotency-key': 'research-run-1' };
    const payload = { seedKeywords: ['eco-friendly yoga mat'], competitorDomains: ['competitor.example'], locale: 'en-US' };
    const first = await server.inject({ method: 'POST', url: `/api/v1/keyword-research/projects/${project.id}/runs`, headers, payload });
    const second = await server.inject({ method: 'POST', url: `/api/v1/keyword-research/projects/${project.id}/runs`, headers, payload });
    expect(first.statusCode).toBe(202);
    expect(second.statusCode).toBe(202);
    expect(second.json()).toEqual(first.json());
    expect(first.json().data.provider).toBe('dataforseo');
    expect(first.json().data.estimatedCredits).toBe(2);
    const cacheHit = await server.inject({ method: 'POST', url: `/api/v1/keyword-research/projects/${project.id}/runs`, headers: { authorization: `Bearer ${token}`, 'idempotency-key': 'research-run-cache-hit' }, payload });
    expect(cacheHit.statusCode).toBe(202);
    expect(cacheHit.json().data.cacheHit).toBe(true);
    expect(cacheHit.json().data.runId).toBe(first.json().data.runId);
    const usage = await server.inject({ method: 'GET', url: '/api/v1/usage', headers: { authorization: `Bearer ${token}` } });
    expect(usage.json().data.activeReservedUnits).toBe(2);

    const competitorOnly = await server.inject({
      method: 'POST',
      url: `/api/v1/keyword-research/projects/${project.id}/runs`,
      headers: { authorization: `Bearer ${token}`, 'idempotency-key': 'research-run-competitor-only' },
      payload: { seedKeywords: [], competitorDomains: ['competitor.example'], locale: 'en-US' }
    });
    expect(competitorOnly.statusCode).toBe(202);
    const inferredRun = await repository.findKeywordResearchRun(competitorOnly.json().data.runId, workspaceId);
    expect(inferredRun?.seedKeywords).toEqual(['competitor']);

    const taiwanCompetitor = await server.inject({
      method: 'POST',
      url: `/api/v1/keyword-research/projects/${project.id}/runs`,
      headers: { authorization: `Bearer ${token}`, 'idempotency-key': 'research-run-taiwan-competitor' },
      payload: { seedKeywords: [], competitorDomains: ['https://www.newscan.com.tw/'], locale: 'zh-Hant' }
    });
    expect(taiwanCompetitor.statusCode).toBe(202);
    const taiwanRun = await repository.findKeywordResearchRun(taiwanCompetitor.json().data.runId, workspaceId);
    expect(taiwanRun?.seedKeywords).toEqual(['newscan']);
    expect(taiwanRun?.competitorDomains).toEqual(['newscan.com.tw']);
  });

  it('queues a content optimization snapshot and keeps CMS apply disabled', async () => {
    const repository = createInMemoryPhase2Repository();
    const siteConnectionRepository = createInMemorySiteConnectionRepository();
    const site = await siteConnectionRepository.create({ platform: 'wordpress', name: 'Content Run Site', siteUrl: 'https://content-run.example.test' });
    await repository.saveGatewayProfile({ gateway: 'wenwen', profileKey: 'text.high_quality', modelId: 'content-model', version: 1, status: 'active', updatedAt: new Date().toISOString() });
    await repository.saveGatewayPriceSnapshot({ id: '00000000-0000-4000-8000-000000000251', gateway: 'wenwen', modelId: 'content-model', inputPrice: 0, outputPrice: 0, currency: 'USD', effectiveAt: new Date(Date.now() - 60_000).toISOString(), verifiedAt: new Date().toISOString(), sourceRef: 'fixture' });
    await repository.saveEntitlement({ id: '00000000-0000-4000-8000-000000000252', workspaceId, featureKey: 'content_optimization', limitValue: 5, period: 'monthly', source: 'fixture', effectiveAt: new Date(Date.now() - 60_000).toISOString() });
    const server = createServer({ phase2Repository: repository, siteConnectionRepository });
    const token = await login(server);
    const created = await server.inject({
      method: 'POST',
      url: '/api/v1/content-optimizations',
      headers: { authorization: `Bearer ${token}`, 'idempotency-key': 'content-run-1' },
      payload: { siteId: site.site.id, content: '<p>內容優化教學提供可執行步驟。</p>', focusKeyword: '內容優化' }
    });
    expect(created.statusCode).toBe(202);
    const runId = created.json<{ data: { runId: string } }>().data.runId;
    const detail = await server.inject({ method: 'GET', url: `/api/v1/content-optimizations/${runId}`, headers: { authorization: `Bearer ${token}` } });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().data.snapshot.contentText).toContain('內容優化');
    const apply = await server.inject({ method: 'POST', url: `/api/v1/content-optimizations/${runId}/apply`, headers: { authorization: `Bearer ${token}` } });
    expect(apply.statusCode).toBe(409);
    expect(apply.json().error.code).toBe('CMS_WRITE_DISABLED');
  });

  it('hard-stops unconfigured content optimization and rejects unsigned Stripe webhooks', async () => {
    const repository = createInMemoryPhase2Repository();
    const siteConnectionRepository = createInMemorySiteConnectionRepository();
    const site = await siteConnectionRepository.create({
      platform: 'wordpress',
      name: 'Content Optimization Site',
      siteUrl: 'https://content-optimization.example.test'
    });
    const server = createServer({ phase2Repository: repository, siteConnectionRepository });
    const token = await login(server);
    const content = await server.inject({
      method: 'POST',
      url: '/api/v1/content-optimizations',
      headers: { authorization: `Bearer ${token}`, 'idempotency-key': 'content-optimization-1' },
      payload: { siteId: site.site.id, content: 'A short article for review.', focusKeyword: '內容優化' }
    });
    expect(content.statusCode).toBe(503);
    expect(content.json().error.code).toBe('PROVIDER_UNAVAILABLE');

    const unsignedWebhook = await server.inject({
      method: 'POST',
      url: '/api/v1/webhooks/stripe',
      payload: { event: 'checkout.completed' }
    });
    expect(unsignedWebhook.statusCode).toBe(400);
    expect(unsignedWebhook.json().error.code).toBe('WEBHOOK_SIGNATURE_INVALID');
  });
});
