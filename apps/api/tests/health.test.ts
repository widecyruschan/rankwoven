import { describe, expect, it } from 'vitest';
import { createServer } from '../src/server';
import { createKeywordSuggestionService } from '../src/keywordSuggestions';
import { apiConfig } from '../src/config';
import { createInMemorySiteConnectionRepository } from '../src/siteConnections';

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

  it('filters analytics overview by connected site and date range', async () => {
    const siteConnectionRepository = createInMemorySiteConnectionRepository();
    const server = createServer({ siteConnectionRepository });
    const createSiteResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/site-connections',
      payload: {
        platform: 'wordpress',
        name: 'Analytics Site',
        siteUrl: 'https://www.rankwoven.com',
        cmsVersion: '6.8.2',
        pluginVersion: '0.1.0',
        googleAnalyticsPropertyId: '123456789'
      }
    });
    const siteId = createSiteResponse.json<{ data: { site: { id: string } } }>().data.site.id;
    const token = await loginDemoUser(server);
    const response = await server.inject({
      method: 'GET',
      url: `/api/v1/analytics/overview?siteId=${siteId}&startDate=2026-07-20&endDate=2026-07-26`,
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        siteId,
        siteHost: 'www.rankwoven.com',
        propertyId: '123456789',
        startDate: '2026-07-20',
        endDate: '2026-07-26'
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
      opportunityScore: expect.any(Number),
      monthlySearchVolume: expect.any(Number),
      source: 'fallback'
    });
    expect(body.data.source).toBe('fallback');
  });

  it('uses AI provider keyword suggestions when provider returns valid JSON', async () => {
    const service = createKeywordSuggestionService({
      provider: 'wenwen',
      model: 'keyword-test-model',
      generateTitle: async () => {
        throw new Error('not used');
      },
      generateMetaDescription: async () => {
        throw new Error('not used');
      },
      generateArticleDraft: async () => {
        throw new Error('not used');
      },
      rewriteContent: async () => {
        throw new Error('not used');
      },
      scoreContentQuality: async () => {
        throw new Error('not used');
      },
      generateOutline: async () => ({
        text: JSON.stringify({
          suggestions: [
            {
              keyword: 'AI SEO workflow',
              difficulty: 'medium',
              opportunityScore: 83,
              monthlySearchVolume: 1900,
              cpcUsd: 3.2,
              competition: 0.44,
              searchIntentSummary: 'Teams compare repeatable SEO workflows.',
              contentAngle: 'Build a workflow checklist with review gates.'
            }
          ]
        }),
        model: 'keyword-test-model',
        usage: {
          inputTokens: 10,
          outputTokens: 30
        }
      })
    });

    const result = await service.createSuggestions({
      seedKeyword: 'AI SEO',
      locale: 'en',
      intent: 'commercial',
      userId: '00000000-0000-4000-8000-000000000001'
    });

    expect(result).toMatchObject({
      source: 'ai-provider',
      suggestions: [
        {
          keyword: 'AI SEO workflow',
          intent: 'commercial',
          source: 'ai-provider',
          monthlySearchVolume: 1900
        }
      ]
    });
  });

  it('uses third-party keyword metrics when a volume provider is configured', async () => {
    const originalApiUrl = apiConfig.KEYWORD_VOLUME_API_URL;
    const originalApiKey = apiConfig.KEYWORD_VOLUME_API_KEY;
    apiConfig.KEYWORD_VOLUME_API_URL = 'https://keywords.example.test/query';
    apiConfig.KEYWORD_VOLUME_API_KEY = 'test-key';

    try {
      const service = createKeywordSuggestionService(undefined, async (_url, init) => {
        expect(init?.method).toBe('POST');
        expect(init?.headers).toMatchObject({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json'
        });

        return new Response(
          JSON.stringify({
            data: [
              {
                query: 'AI SEO tools',
                search_volume: '2400',
                cpc: '3.75',
                keyword_difficulty: 48
              },
              {
                keyword: 'AI SEO agency',
                volume: 720,
                cpc_usd: 6.2,
                competition: 0.64
              }
            ]
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      });

      const result = await service.createSuggestions({
        seedKeyword: 'AI SEO',
        locale: 'en',
        intent: 'commercial',
        userId: '00000000-0000-4000-8000-000000000001'
      });

      expect(result).toMatchObject({
        source: 'third-party-volume',
        suggestions: [
          {
            keyword: 'AI SEO tools',
            source: 'third-party-volume',
            monthlySearchVolume: 2400,
            cpcUsd: 3.75,
            competition: 0.48,
            difficulty: 'medium'
          },
          {
            keyword: 'AI SEO agency',
            monthlySearchVolume: 720,
            cpcUsd: 6.2,
            competition: 0.64
          }
        ]
      });
    } finally {
      apiConfig.KEYWORD_VOLUME_API_URL = originalApiUrl;
      apiConfig.KEYWORD_VOLUME_API_KEY = originalApiKey;
    }
  });
});
