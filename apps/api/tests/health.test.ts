import { describe, expect, it } from 'vitest';
import { createServer } from '../src/server';

describe('api health route', () => {
  it('returns a successful health response', async () => {
    const server = createServer();
    const response = await server.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        service: 'api'
      }
    });
  });
});

describe('api provider route', () => {
  it('returns configured AI provider adapters', async () => {
    const server = createServer();
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/ai-providers'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        text: {
          provider: 'wenwen',
          model: 'gpt-4.1-mini',
          fallbackProvider: 'wenwen',
          proxyBaseUrl: 'https://breakout.wenwen-ai.com',
          endpoint: '/v1/chat/completions',
          apiKeyConfigured: false
        },
        embedding: {
          provider: 'wenwen',
          model: 'text-embedding-3-small',
          endpoint: '/v1/embeddings',
          apiKeyConfigured: false
        },
        image: {
          provider: 'wenwen',
          model: 'gemini-2.5-flash-image',
          fallbackProvider: 'wenwen',
          endpoint: '/v1/images/generations',
          apiKeyConfigured: false
        },
        mediaStorage: {
          provider: 'qiniu-kodo',
          credentialsConfigured: false
        },
        imageOptimization: {
          provider: 'cloudinary'
        }
      }
    });
  });
});

async function loginDemoUser(server: ReturnType<typeof createServer>) {
  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      email: 'demo@rankwoven.com',
      password: 'rankwoven'
    }
  });

  expect(response.statusCode).toBe(200);
  return response.json<{ data: { token: string } }>().data.token;
}

describe('analytics and keyword routes', () => {
  it('returns analytics overview for authenticated users', async () => {
    const server = createServer();
    const token = await loginDemoUser(server);
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/analytics/overview',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        source: 'demo',
        totals: {
          activeUsers: expect.any(Number),
          sessions: expect.any(Number),
          pageViews: expect.any(Number)
        },
        daily: expect.any(Array),
        channels: expect.any(Array),
        pages: expect.any(Array)
      }
    });
  });

  it('creates keyword suggestions for authenticated users', async () => {
    const server = createServer();
    const token = await loginDemoUser(server);
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/keyword-suggestions',
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        seedKeyword: 'AI SEO',
        locale: 'zh-Hant',
        intent: 'commercial'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.seedKeyword).toBe('AI SEO');
    expect(body.data.suggestions).toHaveLength(6);
    expect(body.data.suggestions[0]).toMatchObject({
      keyword: 'AI SEO 推薦',
      intent: 'commercial',
      opportunityScore: expect.any(Number)
    });
  });
});
