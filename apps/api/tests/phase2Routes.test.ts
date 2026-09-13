import { describe, expect, it } from 'vitest';
import { createInMemoryPhase2Repository } from '@aieo/ai-providers';
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
    expect(run.statusCode).toBe(503);
    expect(run.json().error.code).toBe('PROVIDER_UNAVAILABLE');
  });

  it('hard-stops unconfigured content optimization and unsigned webhooks', async () => {
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
      payload: { siteId: site.site.id, content: 'A short article for review.' }
    });
    expect(content.statusCode).toBe(503);
    expect(content.json().error.code).toBe('PROVIDER_UNAVAILABLE');

    const unsignedWebhook = await server.inject({
      method: 'POST',
      url: '/api/v1/webhooks/stripe',
      payload: { event: 'checkout.completed' }
    });
    expect(unsignedWebhook.statusCode).toBe(400);
    expect(unsignedWebhook.json().error.code).toBe('VALIDATION_ERROR');
  });
});
