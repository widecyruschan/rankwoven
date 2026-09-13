import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { parseApiConfig } from '../src/config';
import { createServer } from '../src/server';
import { registerLighthouseRoutes } from '../src/lighthouse';
import { createInMemorySiteConnectionRepository } from '../src/siteConnections';

async function loginDemoUser(server: ReturnType<typeof createServer>) {
  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: 'demo@rankwoven.com', password: 'rankwoven' }
  });
  return response.json<{ data: { token: string } }>().data.token;
}

describe('security hardening', () => {
  it('rejects incomplete or duplicated production secrets', () => {
    expect(() => parseApiConfig({ NODE_ENV: 'production' })).toThrow();
    expect(() => parseApiConfig({
      NODE_ENV: 'production',
      JWT_SECRET: 'a'.repeat(16) + 'b'.repeat(16),
      WORDPRESS_CREDENTIAL_ENCRYPTION_KEY: 'a'.repeat(16) + 'b'.repeat(16)
    })).toThrow();
    expect(parseApiConfig({
      NODE_ENV: 'production',
      JWT_SECRET: '0123456789abcdefABCDEF0123456789',
      WORDPRESS_CREDENTIAL_ENCRYPTION_KEY: 'fedcba9876543210ZYXWVU9876543210'
    })).toMatchObject({ NODE_ENV: 'production' });
  });

  it('does not expose or log reset tokens', async () => {
    const server = createServer();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'demo@rankwoven.com' }
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).not.toHaveProperty('_devResetToken');
      expect(response.json()).not.toHaveProperty('_devResetUrl');
      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
      await server.close();
    }
  });

  it('blocks loopback URLs before Lighthouse performs an audit', async () => {
    const server = createServer();
    const token = await loginDemoUser(server);
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/lighthouse/audit?url=http://127.0.0.1/',
      headers: { authorization: `Bearer ${token}` }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'UNSAFE_TARGET_URL' } });
  });

  it('does not expose Lighthouse provider errors to clients or logs', async () => {
    const app = Fastify();
    const auditError = 'PageSpeed upstream body contains an internal secret';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const authService = {
      verifyToken: async () => ({
        id: '00000000-0000-4000-8000-000000000101',
        workspaceId: '00000000-0000-4000-8000-000000000001',
        name: 'Test User',
        email: 'test@example.com',
        role: 'owner' as const
      })
    };
    const siteRepository = {
      findForWorkspace: vi.fn()
    };
    const lighthouseService = {
      auditUrl: vi.fn().mockRejectedValue(new Error(auditError))
    };

    registerLighthouseRoutes(app, authService as never, siteRepository as never, lighthouseService);

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/lighthouse/audit?url=https://93.184.216.34/'
      });

      expect(response.statusCode).toBe(502);
      expect(response.json()).toMatchObject({ error: { code: 'LIGHTHOUSE_ERROR' } });
      expect(response.json()).not.toHaveProperty('error.details');
      expect(response.body).not.toContain(auditError);
      expect(errorSpy).toHaveBeenCalledWith('[lighthouse] Audit failed: LIGHTHOUSE_ERROR');
      expect(errorSpy.mock.calls.flat().join(' ')).not.toContain(auditError);
    } finally {
      errorSpy.mockRestore();
      await app.close();
    }
  });

  it('keeps sync task operations scoped to the current workspace', async () => {
    const repository = createInMemorySiteConnectionRepository();
    const workspaceA = '00000000-0000-4000-8000-000000000201';
    const workspaceB = '00000000-0000-4000-8000-000000000202';
    const input = {
      platform: 'wordpress' as const,
      name: 'Workspace Site',
      siteUrl: 'https://example.com'
    };
    const site = await repository.create(input, workspaceA);
    const task = await repository.createSyncTask(site.site.id, { scope: 'full' });

    expect(task).toBeDefined();
    await repository.markSyncTaskFailed(task!.id, 'WORKER_TASK_FAILED');

    await expect(repository.retrySyncTask(task!.id, workspaceB)).resolves.toBeUndefined();
    await expect(repository.listSyncTasks({ workspaceId: workspaceB })).resolves.toEqual([]);
    await expect(repository.listSyncTasks({ workspaceId: workspaceA })).resolves.toHaveLength(1);
  });

  it('requires authentication for dead-letter alert reads', async () => {
    const server = createServer({
      siteConnectionRepository: createInMemorySiteConnectionRepository()
    });

    try {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/sync-tasks/dead-letter-alert'
      });
      const configResponse = await server.inject({
        method: 'GET',
        url: '/api/v1/sync-tasks/dead-letter-alert-config'
      });

      expect(response.statusCode).toBe(401);
      expect(configResponse.statusCode).toBe(401);
    } finally {
      await server.close();
    }
  });
});
