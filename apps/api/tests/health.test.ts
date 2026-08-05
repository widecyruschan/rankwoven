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

  it('allows PUT requests through CORS preflight', async () => {
    const server = createServer();
    const response = await server.inject({
      method: 'OPTIONS',
      url: '/api/v1/site-connections/site-1/suggestions/suggestion-1',
      headers: {
        origin: 'https://rankwoven.com',
        'access-control-request-method': 'PUT',
        'access-control-request-headers': 'authorization,content-type'
      }
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-methods']).toContain('PUT');
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
          model: 'gpt-4o-mini',
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
    const service = createKeywordSuggestionService({
      provider: 'wenwen',
      model: 'keyword-test-model',
      generateOutline: async () => ({
        text: JSON.stringify({
          suggestions: [
            {
              keyword: 'AI SEO 推薦',
              difficulty: 'medium',
              opportunityScore: 85,
              monthlySearchVolume: 3600,
              cpcUsd: 4.5,
              competition: 0.52,
              searchIntentSummary: '企業尋找 AI SEO 服務供應商',
              contentAngle: '比較不同 AI SEO 工具的優劣與成本'
            },
            {
              keyword: 'AI SEO 工具',
              difficulty: 'low',
              opportunityScore: 72,
              monthlySearchVolume: 5400,
              cpcUsd: 2.8,
              competition: 0.38,
              searchIntentSummary: '用戶搜尋 AI SEO 相關工具',
              contentAngle: '推薦最佳 AI SEO 工具清單'
            },
            {
              keyword: 'AI SEO 公司',
              difficulty: 'high',
              opportunityScore: 60,
              monthlySearchVolume: 2400,
              cpcUsd: 6.2,
              competition: 0.71,
              searchIntentSummary: '尋找專業 AI SEO 代理公司',
              contentAngle: '如何選擇適合的 AI SEO 公司'
            },
            {
              keyword: 'AI SEO 軟體',
              difficulty: 'low',
              opportunityScore: 78,
              monthlySearchVolume: 3200,
              cpcUsd: 3.5,
              competition: 0.45,
              searchIntentSummary: '搜適合的 SEO 軟體',
              contentAngle: '2025 年必備 AI SEO 軟體評比'
            },
            {
              keyword: 'AI SEO 價格',
              difficulty: 'medium',
              opportunityScore: 68,
              monthlySearchVolume: 1800,
              cpcUsd: 7.0,
              competition: 0.55,
              searchIntentSummary: '了解 AI SEO 服務定價',
              contentAngle: 'AI SEO 服務價格完整比較'
            },
            {
              keyword: 'AI SEO 教學',
              difficulty: 'low',
              opportunityScore: 90,
              monthlySearchVolume: 8800,
              cpcUsd: 1.5,
              competition: 0.22,
              searchIntentSummary: '學習 AI SEO 技能',
              contentAngle: '從零開始學 AI SEO 完整攻略'
            }
          ]
        }),
        model: 'keyword-test-model',
        usage: { inputTokens: 100, outputTokens: 300 }
      }),
      generateTitle: async () => { throw new Error('not used'); },
      generateMetaDescription: async () => { throw new Error('not used'); },
      generateArticleDraft: async () => { throw new Error('not used'); },
      rewriteContent: async () => { throw new Error('not used'); },
      scoreContentQuality: async () => { throw new Error('not used'); }
    });

    const result = await service.createSuggestions({
      seedKeyword: 'AI SEO',
      locale: 'zh-Hant',
      intent: 'commercial',
      userId: '00000000-0000-4000-8000-000000000001'
    });

    expect(result.source).toBe('ai-provider');
    expect(result.suggestions).toHaveLength(6);
    expect(result.suggestions[0]).toMatchObject({
      keyword: 'AI SEO 推薦',
      intent: 'commercial',
      opportunityScore: expect.any(Number),
      difficulty: expect.any(String),
      source: 'ai-provider'
    });
    expect(result.suggestions[0].sourceTrace).toBeDefined();
    expect(result.suggestions[0].sourceTrace).toMatchObject({
      keywordIdea: 'ai-provider',
      verified: false
    });
  });

  it('uses AI provider keyword suggestions when provider returns valid JSON', async () => {
    const service = createKeywordSuggestionService({
      provider: 'wenwen',
      model: 'keyword-test-model',
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
      }),
      generateTitle: async () => { throw new Error('not used'); },
      generateMetaDescription: async () => { throw new Error('not used'); },
      generateArticleDraft: async () => { throw new Error('not used'); },
      rewriteContent: async () => { throw new Error('not used'); },
      scoreContentQuality: async () => { throw new Error('not used'); }
    });

    const result = await service.createSuggestions({
      seedKeyword: 'AI SEO',
      locale: 'en',
      intent: 'commercial',
      userId: '00000000-0000-4000-8000-000000000001'
    });

    expect(result.source).toBe('ai-provider');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({
      keyword: 'AI SEO workflow',
      intent: 'commercial',
      source: 'ai-provider',
      difficulty: expect.any(String),
      sourceTrace: expect.objectContaining({
        keywordIdea: 'ai-provider',
        verified: false
      })
    });
  });

  it('uses third-party keyword metrics when a volume provider is configured', async () => {
    const originalProvider = apiConfig.KEYWORD_VOLUME_PROVIDER;
    const originalApiUrl = apiConfig.KEYWORD_VOLUME_API_URL;
    const originalApiKey = apiConfig.KEYWORD_VOLUME_API_KEY;
    apiConfig.KEYWORD_VOLUME_PROVIDER = 'generic';
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
                keyword: 'AI SEO software',
                volume: 1200,
                cpc_usd: 4.5,
                competition: 0.55
              }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });

      const result = await service.createSuggestions({
        seedKeyword: 'AI SEO',
        locale: 'en',
        intent: 'commercial',
        userId: '00000000-0000-4000-8000-000000000001'
      });

      expect(['enriched', 'fallback']).toContain(result.source);
      expect(result.suggestions.length).toBeGreaterThan(0);

      // Suggestions should have sourceTrace info
      expect(result.suggestions[0].sourceTrace).toBeDefined();
    } finally {
      apiConfig.KEYWORD_VOLUME_PROVIDER = originalProvider;
      apiConfig.KEYWORD_VOLUME_API_URL = originalApiUrl;
      apiConfig.KEYWORD_VOLUME_API_KEY = originalApiKey;
    }
  });
});
