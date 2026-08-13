import type { TextGenerationProvider, TextGenerationResult } from '@aieo/ai-providers';
import { describe, expect, it } from 'vitest';
import { createServer } from '../src/server';
import { createInMemorySiteConnectionRepository } from '../src/siteConnections';
import { createInMemorySeoOptimizationRepository } from '../src/seoOptimization';

interface CreateSiteConnectionResponse {
  success: boolean;
  data: {
    site: {
      id: string;
      name: string;
      siteUrl: string;
      status: 'connected' | 'revoked';
      tokenPreview: string;
      wordpressAdminUsername?: string;
      wordpressApplicationPasswordConfigured: boolean;
      googleAnalyticsPropertyId?: string;
    };
    apiToken: string;
  };
}

interface RegenerateTokenResponse {
  success: boolean;
  data: {
    site: {
      id: string;
      status: 'connected' | 'revoked';
      tokenPreview: string;
    };
    apiToken: string;
  };
}

interface UpdateWordPressCredentialsResponse {
  success: boolean;
  data: {
    site: {
      id: string;
      wordpressAdminUsername?: string;
      wordpressApplicationPasswordConfigured: boolean;
    };
  };
}

interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: string;
      workspaceId: string;
      email: string;
    };
  };
}

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
  return response.json<LoginResponse>().data.token;
}

async function createWordPressConnection(
  payload: Partial<{
    wordpressAdminUsername: string;
    wordpressApplicationPassword: string;
  }> = {},
  serverOptions: Parameters<typeof createServer>[0] = {}
) {
  const server = createServer({
    siteConnectionRepository: createInMemorySiteConnectionRepository(),
    ...serverOptions
  });
  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/site-connections',
    payload: {
      platform: 'wordpress',
      name: 'Local WordPress',
      siteUrl: 'http://localhost:8088',
      cmsVersion: '6.8.2',
      pluginVersion: '0.1.0',
      ...payload
    }
  });

  return {
    server,
    response,
    body: response.json<CreateSiteConnectionResponse>()
  };
}

function createTextResult(text: string): TextGenerationResult {
  return {
    text,
    model: 'test-model',
    usage: {
      inputTokens: 10,
      outputTokens: 10
    }
  };
}

function rejectTextCall(): Promise<TextGenerationResult> {
  return Promise.reject(new Error('UNEXPECTED_TEXT_PROVIDER_CALL'));
}

function createStubTextProvider(rewriteHandler: (request: { title?: string; html?: string }) => string): TextGenerationProvider {
  return {
    provider: 'wenwen',
    model: 'test-model',
    generateTitle: rejectTextCall,
    generateMetaDescription: rejectTextCall,
    generateOutline: rejectTextCall,
    generateArticleDraft: rejectTextCall,
    scoreContentQuality: rejectTextCall,
    rewriteContent: async (request) => createTextResult(rewriteHandler(request))
  };
}

describe('site connection routes', () => {
  it('creates a WordPress site connection and returns a setup token once', async () => {
    const { response, body } = await createWordPressConnection();

    expect(response.statusCode).toBe(201);
    expect(body).toMatchObject({
      success: true,
      data: {
        site: {
          name: 'Local WordPress',
          siteUrl: 'http://localhost:8088'
        }
      }
    });
    expect(body.data.site.id).toEqual(expect.any(String));
    expect(body.data.apiToken).toMatch(/^rw_[a-f0-9]{32}$/);
    expect(body.data.site.tokenPreview).toBe(`${body.data.apiToken.slice(0, 8)}...`);
    expect(body.data.site).not.toHaveProperty('lastTokenUsedAt');
  });

  it('lists connected sites without exposing full tokens', async () => {
    const { server, body } = await createWordPressConnection();
    const authToken = await loginDemoUser(server);
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/site-connections',
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        sites: [
          {
            id: body.data.site.id,
            tokenPreview: `${body.data.apiToken.slice(0, 8)}...`
          }
        ]
      }
    });
    expect(JSON.stringify(response.json())).not.toContain(body.data.apiToken);
  });

  it('rejects connected site list without a user token', async () => {
    const { server } = await createWordPressConnection();
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/site-connections'
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        code: 'AUTH_TOKEN_INVALID'
      }
    });
  });

  it('stores WordPress admin application password configuration without exposing the password', async () => {
    const { server, body } = await createWordPressConnection({
      wordpressAdminUsername: 'site-admin',
      wordpressApplicationPassword: 'abcd efgh ijkl mnop'
    });
    const authToken = await loginDemoUser(server);
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/site-connections',
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    expect(body.data.site).toMatchObject({
      wordpressAdminUsername: 'site-admin',
      wordpressApplicationPasswordConfigured: true
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        sites: [
          {
            id: body.data.site.id,
            wordpressAdminUsername: 'site-admin',
            wordpressApplicationPasswordConfigured: true
          }
        ]
      }
    });
    expect(JSON.stringify(response.json())).not.toContain('abcd efgh ijkl mnop');
  });

  it('updates per-site Google Analytics property settings with a site token', async () => {
    const { server, body } = await createWordPressConnection();
    const response = await server.inject({
      method: 'PUT',
      url: `/api/v1/site-connections/${body.data.site.id}/analytics-settings`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        googleAnalyticsPropertyId: '987654321'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        site: {
          id: body.data.site.id,
          googleAnalyticsPropertyId: '987654321'
        }
      }
    });

    const authToken = await loginDemoUser(server);
    const listResponse = await server.inject({
      method: 'GET',
      url: '/api/v1/site-connections',
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    expect(listResponse.json()).toMatchObject({
      data: {
        sites: [
          {
            id: body.data.site.id,
            googleAnalyticsPropertyId: '987654321'
          }
        ]
      }
    });
  });

  it('updates WordPress admin application password credentials for an existing site', async () => {
    const { server, body } = await createWordPressConnection();
    const authToken = await loginDemoUser(server);
    const response = await server.inject({
      method: 'PUT',
      url: `/api/v1/site-connections/${body.data.site.id}/wordpress-credentials`,
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        wordpressAdminUsername: 'editor-admin',
        wordpressApplicationPassword: 'qrst uvwx yz12 3456'
      }
    });
    const updated = response.json<UpdateWordPressCredentialsResponse>();

    expect(response.statusCode).toBe(200);
    expect(updated).toMatchObject({
      success: true,
      data: {
        site: {
          id: body.data.site.id,
          wordpressAdminUsername: 'editor-admin',
          wordpressApplicationPasswordConfigured: true
        }
      }
    });
    expect(JSON.stringify(updated)).not.toContain('qrst uvwx yz12 3456');
  });

  it('rejects article sync without a valid site token', async () => {
    const { server, body } = await createWordPressConnection();
    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync`,
      payload: {
        articles: [],
        media: []
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        code: 'SITE_TOKEN_INVALID'
      }
    });
  });

  it('stores synced articles and media for a valid site token', async () => {
    const { server, body } = await createWordPressConnection();
    const syncResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        articles: [
          {
            cmsId: '101',
            type: 'post',
            title: 'WordPress Image SEO Guide',
            slug: 'wordpress-image-seo-guide',
            status: 'publish',
            url: 'http://localhost:8088/wordpress-image-seo-guide/',
            excerpt: 'Image SEO guide excerpt.',
            metaDescription: 'Learn how to improve WordPress image SEO with practical optimization steps.',
            contentHtml: '<p>Improve image SEO.</p>',
            author: 'Admin',
            categories: ['SEO'],
            tags: ['image seo'],
            featuredImageId: '501',
            publishedAt: '2026-07-20T08:00:00+00:00',
            updatedAt: '2026-07-25T08:00:00+00:00'
          }
        ],
        media: [
          {
            cmsId: '501',
            title: 'Image SEO Dashboard',
            url: 'http://localhost:8088/wp-content/uploads/image-seo-dashboard.jpg',
            mimeType: 'image/jpeg',
            fileName: 'image-seo-dashboard.jpg',
            altText: 'WordPress image SEO dashboard',
            attachedToCmsId: '101',
            updatedAt: '2026-07-25T08:00:00+00:00'
          }
        ]
      }
    });

    expect(syncResponse.statusCode).toBe(200);
    const syncBody = syncResponse.json();

    expect(syncBody).toMatchObject({
      success: true,
      data: {
        articlesReceived: 1,
        mediaReceived: 1,
        site: {
          id: body.data.site.id,
          lastSyncStats: {
            articlesReceived: 1,
            mediaReceived: 1
          }
        }
      }
    });
    expect(syncBody.data.site.lastTokenUsedAt).toEqual(expect.any(String));

    const articlesResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${body.data.site.id}/articles`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      }
    });

    expect(articlesResponse.statusCode).toBe(200);
    expect(articlesResponse.json()).toMatchObject({
      success: true,
      data: {
        articles: [
          {
            cmsId: '101',
            title: 'WordPress Image SEO Guide',
            metaDescription: 'Learn how to improve WordPress image SEO with practical optimization steps.',
            featuredImageId: '501'
          }
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1
        }
      }
    });

    const mediaResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${body.data.site.id}/media?page=1&pageSize=20`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      }
    });

    expect(mediaResponse.statusCode).toBe(200);
    expect(mediaResponse.json()).toMatchObject({
      success: true,
      data: {
        media: [
          {
            cmsId: '501',
            title: 'Image SEO Dashboard',
            fileName: 'image-seo-dashboard.jpg',
            altText: 'WordPress image SEO dashboard'
          }
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1
        }
      }
    });

    const authToken = await loginDemoUser(server);
    const listResponse = await server.inject({
      method: 'GET',
      url: '/api/v1/site-connections',
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    expect(listResponse.json()).toMatchObject({
      data: {
        sites: [
          {
            id: body.data.site.id,
            lastTokenUsedAt: expect.any(String)
          }
        ]
      }
    });
  });

  it('paginates synced article lists for customer dashboard access', async () => {
    const { server, body } = await createWordPressConnection();
    const articles = Array.from({ length: 3 }, (_, index) => ({
      cmsId: String(700 + index),
      type: 'post',
      title: `Paged Article ${index + 1}`,
      slug: `paged-article-${index + 1}`,
      status: 'publish',
      url: `http://localhost:8088/paged-article-${index + 1}/`,
      updatedAt: `2026-07-2${index}T08:00:00+00:00`
    }));
    const syncResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        articles,
        media: []
      }
    });
    const authToken = await loginDemoUser(server);
    const pagedResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${body.data.site.id}/articles?page=2&pageSize=2`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    expect(syncResponse.statusCode).toBe(200);
    expect(pagedResponse.statusCode).toBe(200);
    expect(pagedResponse.json()).toMatchObject({
      success: true,
      data: {
        articles: [
          {
            cmsId: '700',
            title: 'Paged Article 1'
          }
        ],
        pagination: {
          page: 2,
          pageSize: 2,
          total: 3,
          totalPages: 2
        }
      }
    });
  });

  it('filters synced article and media lists by search, status, and SEO issue', async () => {
    const { server, body } = await createWordPressConnection();
    const syncResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        articles: [
          {
            cmsId: '801',
            type: 'post',
            title: 'Meta Ready Buying Guide',
            slug: 'meta-ready-buying-guide',
            status: 'publish',
            url: 'http://localhost:8088/meta-ready-buying-guide/',
            metaDescription: 'A complete buying guide with a strong meta description.',
            featuredImageId: '901',
            updatedAt: '2026-07-24T08:00:00+00:00'
          },
          {
            cmsId: '802',
            type: 'page',
            title: 'Draft Landing Page',
            slug: 'draft-landing-page',
            status: 'draft',
            url: 'http://localhost:8088/draft-landing-page/',
            metaDescription: '',
            updatedAt: '2026-07-25T08:00:00+00:00'
          }
        ],
        media: [
          {
            cmsId: '901',
            title: 'Buying Guide Hero',
            url: 'http://localhost:8088/wp-content/uploads/buying-guide-hero.jpg',
            fileName: 'buying-guide-hero.jpg',
            altText: 'Buying guide hero image',
            updatedAt: '2026-07-24T08:00:00+00:00'
          },
          {
            cmsId: '902',
            title: 'Draft Image',
            url: 'http://localhost:8088/wp-content/uploads/draft-image.jpg',
            fileName: '',
            altText: '',
            updatedAt: '2026-07-25T08:00:00+00:00'
          }
        ]
      }
    });
    const authToken = await loginDemoUser(server);

    expect(syncResponse.statusCode).toBe(200);

    const searchedArticlesResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${body.data.site.id}/articles?search=buying&status=publish`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });
    expect(searchedArticlesResponse.statusCode).toBe(200);
    expect(searchedArticlesResponse.json()).toMatchObject({
      data: {
        articles: [
          {
            cmsId: '801'
          }
        ],
        pagination: {
          total: 1
        }
      }
    });

    const missingMetaResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${body.data.site.id}/articles?issue=missing_meta`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });
    expect(missingMetaResponse.statusCode).toBe(200);
    expect(missingMetaResponse.json()).toMatchObject({
      data: {
        articles: [
          {
            cmsId: '802'
          }
        ],
        pagination: {
          total: 1
        }
      }
    });

    const missingMediaResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${body.data.site.id}/media?search=draft&issue=missing_alt`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });
    expect(missingMediaResponse.statusCode).toBe(200);
    expect(missingMediaResponse.json()).toMatchObject({
      data: {
        media: [
          {
            cmsId: '902'
          }
        ],
        pagination: {
          total: 1
        }
      }
    });
  });

  it('scans WordPress media, stores related content, and generates contextual media suggestions', async () => {
    const { server, body } = await createWordPressConnection({
      wordpressAdminUsername: 'site-admin',
      wordpressApplicationPassword: 'abcd efgh ijkl mnop'
    });
    const authToken = await loginDemoUser(server);
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/wp-json/wp/v2/media')) {
        return new Response(
          JSON.stringify([
            {
              id: 904,
              title: { rendered: 'Hero Image' },
              source_url: 'http://localhost:8088/wp-content/uploads/hero-image.jpg',
              media_type: 'image',
              mime_type: 'image/jpeg',
              alt_text: '',
              caption: { rendered: '<p>Hero image caption from WordPress.</p>' },
              description: { rendered: '<p>Hero image description from WordPress.</p>' },
              post: 404,
              modified_gmt: '2026-08-04T08:00:00'
            }
          ]),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-WP-TotalPages': '1'
            }
          }
        );
      }

      if (url.includes('/wp-json/wp/v2/posts/404')) {
        return new Response(
          JSON.stringify({
            id: 404,
            type: 'post',
            title: { rendered: '第 1 章：SEO 是什麼？搜尋引擎優化完整入門' },
            slug: 'what-is-seo',
            status: 'publish',
            link: 'http://localhost:8088/what-is-seo/',
            excerpt: { rendered: '<p>SEO 入門文章摘要。</p>' },
            content: {
              rendered:
                `[vc_custom_heading source="hero-image.jpg ${'x'.repeat(1400)}"]` +
                '<p>SEO 是搜尋引擎優化的完整入門內容。</p>'
            },
            author: 1,
            categories: [],
            tags: [],
            featured_media: 904,
            date_gmt: '2026-08-04T07:30:00',
            modified_gmt: '2026-08-04T08:00:00'
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }

      if (url.includes('/wp-json/wp/v2/pages/404')) {
        return new Response('', { status: 404 });
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    }) as typeof fetch;

    try {
      const scanResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${body.data.site.id}/media-scan`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {}
      });
      const mediaResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/site-connections/${body.data.site.id}/media`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });
      const auditResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${body.data.site.id}/audits`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });
      const suggestionsResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/site-connections/${body.data.site.id}/suggestions`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(scanResponse.statusCode).toBe(200);
      expect(scanResponse.json()).toMatchObject({
        success: true,
        data: {
          site: {
            id: body.data.site.id,
            lastSyncStats: {
              articlesReceived: 1,
              mediaReceived: 1
            }
          },
          articlesReceived: 1,
          mediaReceived: 1
        }
      });
      expect(mediaResponse.statusCode).toBe(200);
      expect(mediaResponse.json()).toMatchObject({
        data: {
          media: [
            {
              cmsId: '904',
              title: 'Hero Image',
              caption: 'Hero image caption from WordPress.',
              description: 'Hero image description from WordPress.',
              altText: '',
              attachedToCmsId: '404',
              attachedToTitle: '第 1 章：SEO 是什麼？搜尋引擎優化完整入門'
            }
          ]
        }
      });
      expect(auditResponse.statusCode).toBe(201);
      expect(suggestionsResponse.statusCode).toBe(200);
      expect(suggestionsResponse.json()).toMatchObject({
        data: {
          suggestions: expect.arrayContaining([
            expect.objectContaining({
              targetType: 'media',
              fieldName: 'title',
              suggestionType: 'media_title',
              suggestedValue: '第 1 章：SEO 是什麼？搜尋引擎優化完整入門'
            }),
            expect.objectContaining({
              targetType: 'media',
              fieldName: 'caption',
              suggestionType: 'media_caption',
              suggestedValue: 'SEO 入門文章摘要。'
            }),
            expect.objectContaining({
              targetType: 'media',
              fieldName: 'description',
              suggestionType: 'media_description',
              suggestedValue: 'SEO 是搜尋引擎優化的完整入門內容。'
            }),
            expect.objectContaining({
              targetType: 'media',
              fieldName: 'altText',
              suggestionType: 'media_alt_text',
              suggestedValue: '第 1 章：SEO 是什麼？搜尋引擎優化完整入門'
            }),
            expect.objectContaining({
              targetType: 'media',
              fieldName: 'fileName',
              suggestionType: 'media_file_name',
              suggestedValue: 'what-is-seo-1.jpg'
            })
          ])
        }
      });

      const filteredSuggestionsResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/site-connections/${body.data.site.id}/suggestions?targetType=media&targetCmsIds=904&limit=20`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(filteredSuggestionsResponse.statusCode).toBe(200);
      const filteredSuggestionsBody = filteredSuggestionsResponse.json<{
        data: {
          suggestions: Array<{
            id: string;
            targetType: string;
            targetCmsId: string;
            fieldName: string;
          }>;
        };
      }>();
      expect(filteredSuggestionsBody.data.suggestions.map((suggestion) => suggestion.fieldName).sort()).toEqual([
        'altText',
        'caption',
        'description',
        'fileName',
        'title'
      ]);

      const fileNameSuggestion = suggestionsResponse
        .json<{
          data: {
            suggestions: Array<{
              id: string;
              fieldName: string;
              targetType: string;
            }>;
          };
        }>()
        .data.suggestions.find((suggestion) => suggestion.targetType === 'media' && suggestion.fieldName === 'fileName');

      const updateSuggestionResponse = await server.inject({
        method: 'PUT',
        url: `/api/v1/site-connections/${body.data.site.id}/suggestions/${fileNameSuggestion?.id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          suggestedValue: 'what-is-seo-custom.jpg'
        }
      });

      expect(updateSuggestionResponse.statusCode).toBe(200);
      expect(updateSuggestionResponse.json()).toMatchObject({
        data: {
          suggestion: {
            id: fileNameSuggestion?.id,
            fieldName: 'fileName',
            suggestedValue: 'what-is-seo-custom.jpg'
          }
        }
      });

      const captionSuggestion = filteredSuggestionsBody.data.suggestions.find(
        (suggestion) => suggestion.fieldName === 'caption'
      );
      const updateCaptionResponse = await server.inject({
        method: 'PUT',
        url: `/api/v1/site-connections/${body.data.site.id}/suggestions/${captionSuggestion?.id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          suggestedValue: '乾淨的圖片簡介。[vc_custom_heading so'
        }
      });

      expect(updateCaptionResponse.statusCode).toBe(200);
      expect(updateCaptionResponse.json()).toMatchObject({
        data: {
          suggestion: {
            id: captionSuggestion?.id,
            suggestedValue: '乾淨的圖片簡介。'
          }
        }
      });

      const mediaSuggestionIds = filteredSuggestionsBody.data.suggestions.map((suggestion) => suggestion.id);
      const batchApproveResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${body.data.site.id}/suggestions/batch-approve`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          suggestionIds: mediaSuggestionIds
        }
      });

      expect(batchApproveResponse.statusCode).toBe(200);
      expect(batchApproveResponse.json()).toMatchObject({
        data: {
          total: 5,
          succeeded: 5,
          failed: 0
        }
      });

      const batchApplyResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${body.data.site.id}/suggestions/batch-apply`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          suggestionIds: mediaSuggestionIds
        }
      });

      expect(batchApplyResponse.statusCode).toBe(201);
      expect(batchApplyResponse.json()).toMatchObject({
        data: {
          total: 5,
          succeeded: 5,
          failed: 0
        }
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('recognizes WooCommerce product images through product REST parent context', async () => {
    const { server, body } = await createWordPressConnection({
      wordpressAdminUsername: 'site-admin',
      wordpressApplicationPassword: 'abcd efgh ijkl mnop'
    });
    const authToken = await loginDemoUser(server);
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      requestedUrls.push(url);

      if (url.includes('/wp-json/wp/v2/media')) {
        return new Response(
          JSON.stringify([
            {
              id: 906,
              title: { rendered: 'RankWoven Product Image' },
              source_url: 'http://localhost:8088/wp-content/uploads/rankwoven-product.jpg',
              media_type: 'image',
              mime_type: 'image/jpeg',
              alt_text: '',
              caption: { rendered: '' },
              description: { rendered: '' },
              post: null,
              modified_gmt: '2026-08-05T08:00:00'
            }
          ]),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-WP-TotalPages': '1'
            }
          }
        );
      }

      if (
        url.includes('/wp-json/wp/v2/posts/506') ||
        url.includes('/wp-json/wp/v2/pages/506') ||
        url.includes('/wp-json/wp/v2/portfolio/506')
      ) {
        return new Response('', { status: 404 });
      }

      if (url.includes('/wp-json/wc/store/v1/products')) {
        return new Response(
          JSON.stringify([
            {
              id: 506,
              images: [{ id: 906 }]
            }
          ]),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-WP-TotalPages': '1'
            }
          }
        );
      }

      if (url.includes('/wp-json/wp/v2/product/506')) {
        return new Response(
          JSON.stringify({
            id: 506,
            type: 'product',
            title: { rendered: 'RankWoven SEO 分析方案' },
            slug: 'rankwoven-seo-plan',
            status: 'publish',
            link: 'http://localhost:8088/product/rankwoven-seo-plan/',
            excerpt: { rendered: '<p>為網站提供 SEO 與 AI 搜尋優化分析。</p>' },
            content: { rendered: '<p>包含內容審核、圖片優化及搜尋可見度建議。</p>' },
            author: 1,
            featured_media: 906,
            date_gmt: '2026-08-05T07:30:00',
            modified_gmt: '2026-08-05T08:00:00'
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    }) as typeof fetch;

    try {
      const scanResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${body.data.site.id}/media-scan`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {}
      });
      const mediaResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/site-connections/${body.data.site.id}/media`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });
      const auditResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${body.data.site.id}/audits`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });
      const suggestionsResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/site-connections/${body.data.site.id}/suggestions?targetType=media&targetCmsIds=906&limit=20`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(scanResponse.statusCode).toBe(200);
      expect(scanResponse.json()).toMatchObject({
        data: {
          articlesReceived: 1,
          mediaReceived: 1
        }
      });
      expect(mediaResponse.statusCode).toBe(200);
      expect(mediaResponse.json()).toMatchObject({
        data: {
          media: [
            {
              cmsId: '906',
              attachedToCmsId: '506',
              attachedToTitle: 'RankWoven SEO 分析方案'
            }
          ]
        }
      });
      expect(auditResponse.statusCode).toBe(201);
      expect(suggestionsResponse.statusCode).toBe(200);
      const productSuggestions = suggestionsResponse
        .json<{ data: { suggestions: Array<{ fieldName: string; suggestedValue: string }> } }>()
        .data.suggestions;
      expect(productSuggestions.map((suggestion) => suggestion.fieldName).sort()).toEqual([
        'altText',
        'caption',
        'description',
        'fileName',
        'title'
      ]);
      expect(productSuggestions.find((suggestion) => suggestion.fieldName === 'title')?.suggestedValue).toBe(
        'RankWoven SEO 分析方案'
      );
      expect(productSuggestions.find((suggestion) => suggestion.fieldName === 'description')?.suggestedValue).toContain(
        '內容審核、圖片優化及搜尋可見度建議'
      );
      expect(requestedUrls.some((url) => url.includes('/wp-json/wp/v2/posts/506'))).toBe(true);
      expect(requestedUrls.some((url) => url.includes('/wp-json/wp/v2/pages/506'))).toBe(true);
      expect(requestedUrls.some((url) => url.includes('/wp-json/wp/v2/product/506'))).toBe(true);
      expect(requestedUrls.some((url) => url.includes('/wp-json/wc/store/v1/products'))).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('recognizes Portfolio and page images from rendered page content URLs', async () => {
    const { server, body } = await createWordPressConnection({
      wordpressAdminUsername: 'site-admin',
      wordpressApplicationPassword: 'abcd efgh ijkl mnop'
    });
    const authToken = await loginDemoUser(server);
    const seedSyncResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        articles: [],
        media: []
      }
    });
    expect(seedSyncResponse.statusCode).toBe(200);
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      requestedUrls.push(url);

      if (url.includes('/wp-json/wp/v2/media')) {
        return new Response(
          JSON.stringify([
            {
              id: 907,
              title: { rendered: 'pf (1)' },
              source_url: 'http://localhost:8088/wp-content/uploads/2015/07/pf-1.jpg',
              media_type: 'image',
              mime_type: 'image/jpeg',
              alt_text: '',
              caption: { rendered: '' },
              description: { rendered: '' },
              post: null,
              modified_gmt: '2026-08-05T08:00:00'
            }
          ]),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-WP-TotalPages': '1'
            }
          }
        );
      }

      if (url.includes('/wp-json/wc/store/v1/products')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-WP-TotalPages': '1'
          }
        });
      }

      if (url.includes('/wp-json/wp/v2/pages?')) {
        return new Response(
          JSON.stringify([
            {
              id: 1680,
              type: 'page',
              title: { rendered: '作品案例' },
              slug: 'projects',
              status: 'publish',
              link: 'http://localhost:8088/projects/',
              excerpt: { rendered: '<p>品牌網站設計及開發案例。</p>' },
              featured_media: 0,
              content: {
                rendered:
                  '<h1>作品案例</h1><p>品牌網站設計及開發案例。</p>' +
                  '<!-- gallery item -->' +
                  '<div class="project-item category-38"><div class="projects-box">' +
                  '<div class="projects-thumbnail"><img src="http://localhost:8088/wp-content/uploads/2015/07/pf-1-300x300.jpg" alt=""></div>' +
                  '<a href="http://localhost:8088/portfolio/eco-green-interior/">' +
                  '<span class="project-name id-color">Eco Green Interior</span></a>' +
                  '</div></div>' +
                  '<!-- close gallery item -->'
              },
              author: 1,
              date_gmt: '2026-08-05T07:30:00',
              modified_gmt: '2026-08-05T08:00:00'
            }
          ]),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-WP-TotalPages': '1'
            }
          }
        );
      }

      if (url === 'http://localhost:8088/portfolio/eco-green-interior/') {
        return new Response(
          '<div class="container project-view"><h2>Eco Green Interior</h2>' +
            '<p>Eco Green Interior is a sustainable residential interior design project.</p>' +
            '<h4>Our Solutions</h4><p>Natural materials and energy-efficient planning create a comfortable green home.</p></div>',
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html'
            }
          }
        );
      }

      if (url.includes('/wp-json/wp/v2/posts/1680')) {
        return new Response('', { status: 404 });
      }

      if (url.includes('/wp-json/wp/v2/pages/1680')) {
        return new Response(
          JSON.stringify({
            id: 1680,
            type: 'page',
            title: { rendered: '作品案例' },
            slug: 'projects',
            status: 'publish',
            link: 'http://localhost:8088/projects/',
            excerpt: { rendered: '<p>品牌網站設計及開發案例。</p>' },
            content: {
              rendered:
                '<h1>作品案例</h1><p>展示品牌網站設計、開發與 SEO 優化成果。</p>' +
                '<img src="http://localhost:8088/wp-content/uploads/2015/07/pf-1-300x300.jpg" alt="">'
            },
            author: 1,
            featured_media: 0,
            date_gmt: '2026-08-05T07:30:00',
            modified_gmt: '2026-08-05T08:00:00'
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    }) as typeof fetch;

    try {
      const scanResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${body.data.site.id}/media-scan`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {}
      });
      const mediaResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/site-connections/${body.data.site.id}/media`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });
      const auditResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${body.data.site.id}/audits`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });
      const suggestionsResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/site-connections/${body.data.site.id}/suggestions?targetType=media&targetCmsIds=907&limit=20`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(scanResponse.statusCode).toBe(200);
      expect(scanResponse.json()).toMatchObject({
        data: {
          articlesReceived: 1,
          mediaReceived: 1
        }
      });
      expect(mediaResponse.statusCode).toBe(200);
      expect(mediaResponse.json()).toMatchObject({
        data: {
          media: [
            {
              cmsId: '907',
              attachedToCmsId: '1680',
              attachedToTitle: 'Eco Green Interior'
            }
          ]
        }
      });
      expect(auditResponse.statusCode).toBe(201);
      expect(suggestionsResponse.statusCode).toBe(200);
      const portfolioSuggestions = suggestionsResponse
        .json<{ data: { suggestions: Array<{ fieldName: string; suggestedValue: string }> } }>()
        .data.suggestions;
      expect(portfolioSuggestions.map((suggestion) => suggestion.fieldName).sort()).toEqual([
        'altText',
        'caption',
        'description',
        'fileName',
        'title'
      ]);
      expect(portfolioSuggestions.find((suggestion) => suggestion.fieldName === 'title')?.suggestedValue).toBe(
        'Eco Green Interior'
      );
      expect(portfolioSuggestions.find((suggestion) => suggestion.fieldName === 'description')?.suggestedValue).toContain(
        'sustainable residential interior design project'
      );
      expect(requestedUrls.some((url) => url.includes('/wp-json/wp/v2/pages?'))).toBe(true);
      expect(requestedUrls).toContain('http://localhost:8088/portfolio/eco-green-interior/');
      expect(requestedUrls.find((url) => url.includes('/wp-json/wp/v2/media'))).not.toContain('modified_after=');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('uses AI to generate media suggestions from related WordPress article context when a text provider is configured', async () => {
    const textProvider = createStubTextProvider((request) => {
      expect(request.html).not.toContain('[vc_custom_heading');
      expect(request.html).not.toContain('const seoDebug');

      return JSON.stringify({
        title: '[vc_custom_heading]SEO 搜尋引擎運作流程圖解[/vc_custom_heading]',
        caption: '圖解搜尋引擎爬取、索引與排名流程，對應 SEO 入門文章重點。[vc_custom_heading so',
        description: '<code>const seoOutput = true;</code>這張圖片說明搜尋引擎從 Crawling、Indexing 到 Ranking 的基本流程，適合作為 SEO 是什麼這篇入門文章的主視覺說明。',
        altText: '```js\nconst seoAlt = true;\n```搜尋引擎爬取索引與排名流程圖',
        fileName: '[vc_custom_heading]seo-crawling-indexing-ranking.png'
      });
    });
    const { server, body } = await createWordPressConnection(
      {
        wordpressAdminUsername: 'site-admin',
        wordpressApplicationPassword: 'abcd efgh ijkl mnop'
      },
      {
        textGenerationProvider: textProvider
      }
    );
    const authToken = await loginDemoUser(server);
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/wp-json/wp/v2/media')) {
        return new Response(
          JSON.stringify([
            {
              id: 905,
              title: { rendered: 'seo chapter hero' },
              source_url: 'http://localhost:8088/wp-content/uploads/seo-chapter1.png',
              media_type: 'image',
              mime_type: 'image/png',
              alt_text: '',
              caption: { rendered: '' },
              description: { rendered: '' },
              post: 405,
              modified_gmt: '2026-08-04T08:00:00'
            }
          ]),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-WP-TotalPages': '1'
            }
          }
        );
      }

      if (url.includes('/wp-json/wp/v2/posts/405')) {
        return new Response(
          JSON.stringify({
            id: 405,
            type: 'post',
            title: { rendered: '第 1 章：SEO 是什麼？搜尋引擎優化完整入門' },
            slug: 'what-is-seo',
            status: 'publish',
            link: 'http://localhost:8088/what-is-seo/',
            excerpt: { rendered: '<p>SEO 入門文章摘要。</p>' },
            content: {
              rendered:
                `[vc_custom_heading source="seo-chapter1.png ${'x'.repeat(1400)}"]` +
                '<pre><code>const seoDebug = true;</code></pre>' +
                '<h1>第 1 章：SEO 是什麼？搜尋引擎優化完整入門</h1>' +
                '<p>這篇文章介紹 SEO 的定義、基本概念與搜尋引擎如何運作。</p>' +
                '<figure><img class="wp-image-905" src="http://localhost:8088/wp-content/uploads/seo-chapter1.png" alt="" /></figure>' +
                '<h2>1.1 SEO 的定義</h2>' +
                '<p>圖中展示搜尋引擎由爬取、索引到排名的主要流程。</p>'
            },
            author: 1,
            categories: [],
            tags: [],
            featured_media: 905,
            date_gmt: '2026-08-04T07:30:00',
            modified_gmt: '2026-08-04T08:00:00'
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }

      if (url.includes('/wp-json/wp/v2/pages/405')) {
        return new Response('', { status: 404 });
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    }) as typeof fetch;

    try {
      const scanResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${body.data.site.id}/media-scan`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {}
      });
      const auditResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${body.data.site.id}/audits`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });
      const suggestionsResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/site-connections/${body.data.site.id}/suggestions?targetType=media&targetCmsIds=905&limit=20`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(scanResponse.statusCode).toBe(200);
      expect(auditResponse.statusCode).toBe(201);
      expect(suggestionsResponse.statusCode).toBe(200);
      const suggestionsBody = suggestionsResponse.json<{
        data: {
          suggestions: Array<{
            fieldName: string;
            suggestedValue: string;
          }>;
        };
      }>();
      expect(suggestionsBody).toMatchObject({
        data: {
          suggestions: expect.arrayContaining([
            expect.objectContaining({
              targetType: 'media',
              targetCmsId: '905',
              fieldName: 'title',
              suggestedValue: 'SEO 搜尋引擎運作流程圖解'
            }),
            expect.objectContaining({
              targetType: 'media',
              targetCmsId: '905',
              fieldName: 'caption',
              suggestedValue: '圖解搜尋引擎爬取、索引與排名流程，對應 SEO 入門文章重點。'
            }),
            expect.objectContaining({
              targetType: 'media',
              targetCmsId: '905',
              fieldName: 'description',
              suggestedValue: '這張圖片說明搜尋引擎從 Crawling、Indexing 到 Ranking 的基本流程，適合作為 SEO 是什麼這篇入門文章的主視覺說明。'
            }),
            expect.objectContaining({
              targetType: 'media',
              targetCmsId: '905',
              fieldName: 'altText',
              suggestedValue: '搜尋引擎爬取索引與排名流程圖'
            }),
            expect.objectContaining({
              targetType: 'media',
              targetCmsId: '905',
              fieldName: 'fileName',
              suggestedValue: 'seo-crawling-indexing-ranking.png'
            })
          ])
        }
      });
      for (const suggestion of suggestionsBody.data.suggestions) {
        expect(suggestion.suggestedValue).not.toMatch(/\[vc_|<code|```|const seo/i);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('generates editor SEO recommendations from the current content and focus keyphrase', async () => {
    const textProvider = createStubTextProvider((request) => {
      expect(request.title).toContain('Return JSON only with keys seoTitle, slug, metaDescription, analysis');
      expect(request.html).toContain('Post type: post');
      expect(request.html).toContain('Focus keyphrase: AI SEO settings');
      expect(request.html).toContain('Current title: WordPress AI SEO Settings');
      expect(request.html).toContain('Current SEO title: AI SEO Settings for WordPress');
      expect(request.html).toContain('Current slug: wordpress-ai-seo-settings');
      expect(request.html).toContain('Current meta description: Old meta description');
      expect(request.html).toContain('Content HTML: <h1>WordPress AI SEO Settings</h1>');

      return JSON.stringify({
        seoTitle: 'WordPress AI SEO Settings | RankWoven',
        slug: 'wordpress-ai-seo-settings',
        metaDescription: 'AI SEO settings for WordPress editors who want better titles, slugs, and meta descriptions.',
        analysis: 'This article focuses on editor workflow and should keep the keyphrase near the start.'
      });
    });
    const { server, body } = await createWordPressConnection(
      {
        wordpressAdminUsername: 'site-admin',
        wordpressApplicationPassword: 'abcd efgh ijkl mnop'
      },
      {
        textGenerationProvider: textProvider
      }
    );

    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/editor-seo`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        postType: 'post',
        currentTitle: 'WordPress AI SEO Settings',
        currentSeoTitle: 'AI SEO Settings for WordPress',
        currentSlug: 'wordpress-ai-seo-settings',
        focusKeyphrase: 'AI SEO settings',
        excerpt: 'This article explains how to add SEO controls to WordPress editors.',
        contentHtml: '<h1>WordPress AI SEO Settings</h1><p>Use RankWoven to optimize titles and meta descriptions.</p>',
        currentMetaDescription: 'Old meta description',
        locale: 'zh-Hant'
      }
    });

    expect(response.statusCode).toBe(200);
    const responseBody = response.json<{
      success: boolean;
      data: {
        postType: string;
        focusKeyphrase: string;
        seoTitle: string;
        slug: string;
        metaDescription: string;
        analysis: string;
        seoScore: number;
        scoreSummary: string;
        scoreChecks: Array<{ key: string; status: string }>;
        mode: string;
      };
    }>();
    expect(responseBody).toMatchObject({
      success: true,
      data: {
        mode: 'generate',
        postType: 'post',
        focusKeyphrase: 'AI SEO settings',
        seoTitle: 'WordPress AI SEO Settings | RankWoven',
        slug: 'wordpress-ai-seo-settings',
        metaDescription: 'AI SEO settings for WordPress editors who want better titles, slugs, and meta descriptions.',
        scoreSummary: expect.stringContaining('目前內容 SEO 分數'),
        analysis: expect.stringContaining('This article focuses on editor workflow and should keep the keyphrase near the start.')
      }
    });
    expect(responseBody.data.seoScore).toBeGreaterThan(0);
    expect(responseBody.data.scoreChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'title-length' }),
        expect.objectContaining({ key: 'meta-length' }),
        expect.objectContaining({ key: 'content-length' })
      ])
    );
  });

  it('generates image attributes from AI using attachment context instead of filename cleanup', async () => {
    const textProvider = createStubTextProvider((request) => {
      expect(request.title).toContain('Return JSON only with keys title, caption, description, altText, fileName');
      expect(request.title).toContain('Do not derive semantic content by cleaning or rearranging the original filename');
      expect(request.html).toContain('Article title: 高端網頁設計案例');
      expect(request.html).toContain('Image placement context: 這張作品圖展示品牌首頁的視覺層級');
      expect(request.html).toContain('Current image title: (empty)');
      expect(request.html).toContain('Image file extension: jpg');
      expect(request.html).not.toContain('Current filename: IMG_9382-final-copy.jpg');

      return JSON.stringify({
        title: '品牌首頁視覺層級設計圖',
        caption: '展示高端網頁設計案例中的首頁版面與品牌視覺重點。',
        description: '這張圖片說明首頁設計如何透過視覺層級、內容區塊與行動引導提升品牌網站轉換。',
        altText: '高端網頁設計案例首頁視覺層級展示',
        fileName: 'premium-web-design-homepage-layout.jpg'
      });
    });
    const { server, body } = await createWordPressConnection(
      {
        wordpressAdminUsername: 'site-admin',
        wordpressApplicationPassword: 'abcd efgh ijkl mnop'
      },
      {
        textGenerationProvider: textProvider
      }
    );

    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/image-attributes`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        attachmentId: '9382',
        imageUrl: 'http://localhost:8088/wp-content/uploads/IMG_9382-final-copy.jpg',
        fileName: 'IMG_9382-final-copy.jpg',
        currentTitle: 'IMG 9382 final copy',
        attachedToCmsId: '1536',
        attachedToTitle: '高端網頁設計案例',
        contextPostType: 'page',
        contextTitle: '高端網頁設計案例',
        contextSlug: 'premium-web-design-case-study',
        contextExcerpt: '介紹企業網站改版如何提升品牌信任與查詢轉換。',
        contextHtml: '<p>這張作品圖展示品牌首頁的視覺層級、服務入口與 CTA 區塊。</p><figure><img class="wp-image-9382" src="http://localhost:8088/wp-content/uploads/IMG_9382-final-copy.jpg" /></figure>',
        locale: 'zh-Hant'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        source: 'ai',
        imageTitle: '品牌首頁視覺層級設計圖',
        title: '品牌首頁視覺層級設計圖',
        altText: '高端網頁設計案例首頁視覺層級展示',
        caption: '展示高端網頁設計案例中的首頁版面與品牌視覺重點。',
        description: '這張圖片說明首頁設計如何透過視覺層級、內容區塊與行動引導提升品牌網站轉換。',
        fileName: 'premium-web-design-homepage-layout.jpg'
      }
    });
  });

  it('falls back to content context without reusing the original image filename', async () => {
    const { server, body } = await createWordPressConnection();
    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/image-attributes`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        attachmentId: '9382',
        fileName: 'IMG_9382-final-copy.jpg',
        currentTitle: 'IMG 9382 final copy',
        attachedToCmsId: '1536',
        contextPostType: 'page',
        contextTitle: '高端網頁設計案例',
        contextSlug: 'premium-web-design-case-study',
        contextExcerpt: '介紹企業網站改版如何提升品牌信任與查詢轉換。',
        contextHtml: '<p>這張作品圖展示品牌首頁的視覺層級、服務入口與 CTA 區塊。</p>',
        locale: 'zh-Hant'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        source: 'local_context',
        imageTitle: '高端網頁設計案例',
        title: '高端網頁設計案例',
        altText: '高端網頁設計案例',
        caption: '介紹企業網站改版如何提升品牌信任與查詢轉換。',
        description: '這張作品圖展示品牌首頁的視覺層級、服務入口與 CTA 區塊。',
        fileName: 'premium-web-design-case-study-1.jpg'
      }
    });
    expect(JSON.stringify(response.json())).not.toContain('IMG_9382');
  });

  it('allows WordPress site tokens to read and apply internal link suggestions', async () => {
    const { server, body } = await createWordPressConnection({
      wordpressAdminUsername: 'site-admin',
      wordpressApplicationPassword: 'abcd efgh ijkl mnop'
    });

    const syncResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        articles: [
          {
            cmsId: '101',
            type: 'post',
            title: 'AI SEO Automation for WordPress Editors',
            slug: 'ai-seo-automation-wordpress',
            status: 'publish',
            url: 'http://localhost:8088/ai-seo-automation-wordpress/',
            contentHtml: '<h1>AI SEO Automation</h1><p>Automation workflow for WordPress SEO editors.</p>',
            categories: ['SEO'],
            tags: ['AI SEO'],
            updatedAt: '2026-08-04T08:00:00+00:00'
          },
          {
            cmsId: '102',
            type: 'post',
            title: 'WordPress Internal Link Strategy',
            slug: 'wordpress-internal-link-strategy',
            status: 'publish',
            url: 'http://localhost:8088/wordpress-internal-link-strategy/',
            contentHtml: '<h1>Internal Link Strategy</h1><p>Internal link planning for SEO.</p>',
            categories: ['SEO'],
            tags: ['AI SEO'],
            updatedAt: '2026-08-05T08:00:00+00:00'
          }
        ],
        media: []
      }
    });
    expect(syncResponse.statusCode).toBe(200);

    const auditResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/audits`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      }
    });
    expect(auditResponse.statusCode).toBe(201);

    const suggestionsResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${body.data.site.id}/suggestions?targetType=article&limit=20`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      }
    });
    expect(suggestionsResponse.statusCode).toBe(200);

    const internalLinkSuggestion = suggestionsResponse
      .json<{
        data: {
          suggestions: Array<{
            id: string;
            targetCmsId: string;
            suggestionType: string;
            suggestedValue: string;
          }>;
        };
      }>()
      .data.suggestions.find((suggestion) => suggestion.suggestionType === 'internal_link');

    expect(internalLinkSuggestion).toBeDefined();
    const parsedSuggestion = JSON.parse(internalLinkSuggestion?.suggestedValue ?? '{}') as {
      format?: string;
      links?: Array<{ targetCmsId: string; anchorText: string; relevance: string }>;
    };
    expect(parsedSuggestion).toMatchObject({
      format: 'rankwoven-internal-links-v1',
      links: expect.arrayContaining([
        expect.objectContaining({
          targetCmsId: expect.any(String),
          anchorText: expect.any(String),
          relevance: expect.stringMatching(/high|medium|low/)
        })
      ])
    });

    const approveResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/suggestions/${internalLinkSuggestion?.id}/approve`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      }
    });
    expect(approveResponse.statusCode).toBe(200);

    const applyResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/suggestions/${internalLinkSuggestion?.id}/apply`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      }
    });
    expect(applyResponse.statusCode).toBe(201);
    expect(applyResponse.json()).toMatchObject({
      data: {
        task: {
          scope: 'suggestion_apply',
          targetCmsId: internalLinkSuggestion?.targetCmsId
        }
      }
    });
  });

  it('syncs Portfolio and WooCommerce product content for SEO audits and link suggestions', async () => {
    const { server, body } = await createWordPressConnection();
    const syncResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        articles: [
          {
            cmsId: '301',
            type: 'product',
            title: 'RankWoven SEO 商品方案',
            slug: 'rankwoven-seo-product-plan',
            status: 'publish',
            url: 'http://localhost:8088/product/rankwoven-seo-product-plan/',
            contentHtml: '<h1>RankWoven SEO 商品方案</h1><p>AI SEO 商品頁優化。</p>',
            categories: ['SEO'],
            tags: ['RankWoven'],
            updatedAt: '2026-08-08T08:00:00+00:00'
          },
          {
            cmsId: '302',
            type: 'portfolio',
            title: 'RankWoven SEO Portfolio Case',
            slug: 'rankwoven-seo-portfolio-case',
            status: 'publish',
            url: 'http://localhost:8088/portfolio/rankwoven-seo-portfolio-case/',
            contentHtml: '<h1>RankWoven SEO Portfolio Case</h1><p>Portfolio case for AI SEO improvements.</p>',
            categories: ['SEO'],
            tags: ['RankWoven'],
            updatedAt: '2026-08-09T08:00:00+00:00'
          }
        ],
        media: []
      }
    });

    expect(syncResponse.statusCode).toBe(200);

    const articlesResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${body.data.site.id}/articles?pageSize=10`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      }
    });
    expect(articlesResponse.statusCode).toBe(200);
    expect(articlesResponse.json()).toMatchObject({
      data: {
        articles: expect.arrayContaining([
          expect.objectContaining({ cmsId: '301', type: 'product' }),
          expect.objectContaining({ cmsId: '302', type: 'portfolio' })
        ])
      }
    });

    const auditResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/audits`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      }
    });
    expect(auditResponse.statusCode).toBe(201);

    const suggestionsResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${body.data.site.id}/suggestions?targetType=article&limit=20`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      }
    });
    const productInternalLinkSuggestion = suggestionsResponse
      .json<{
        data: {
          suggestions: Array<{
            targetCmsId: string;
            suggestionType: string;
            suggestedValue: string;
          }>;
        };
      }>()
      .data.suggestions.find((suggestion) =>
        suggestion.targetCmsId === '301' && suggestion.suggestionType === 'internal_link'
      );
    const parsedSuggestion = JSON.parse(productInternalLinkSuggestion?.suggestedValue ?? '{}') as {
      links?: Array<{ targetCmsId: string; targetUrl: string }>;
    };

    expect(suggestionsResponse.statusCode).toBe(200);
    expect(productInternalLinkSuggestion).toBeDefined();
    expect(parsedSuggestion.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetCmsId: '302',
          targetUrl: 'http://localhost:8088/portfolio/rankwoven-seo-portfolio-case/'
        })
      ])
    );
  });

  it('extracts plain text meta descriptions without shortcode markup', async () => {
    const { server, body } = await createWordPressConnection();
    const authToken = await loginDemoUser(server);

    const syncResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        articles: [
          {
            cmsId: '909',
            type: 'post',
            title: '第 1 章：SEO 是什麼？搜尋引擎優化完整入門與實戰技巧',
            slug: 'what-is-seo',
            status: 'publish',
            url: 'http://localhost:8088/what-is-seo/',
            excerpt: '[vc_row css=".vc_custom_1785083156694{background-color:#fff;}"]SEO 是搜尋引擎優化的入門說明與實戰重點。[/vc_row]',
            contentHtml: '<p>[vc_row css=".vc_custom_1785083156694{background-color:#fff;}"]SEO 是搜尋引擎優化的入門說明與實戰重點。[/vc_row]</p>',
            updatedAt: '2026-08-04T08:00:00+00:00'
          }
        ],
        media: []
      }
    });

    expect(syncResponse.statusCode).toBe(200);

    const auditResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/audits`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });
    const suggestionsResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${body.data.site.id}/suggestions`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    expect(auditResponse.statusCode).toBe(201);
    expect(suggestionsResponse.statusCode).toBe(200);

    const metaDescriptionSuggestion = suggestionsResponse
      .json<{
        data: {
          suggestions: Array<{
            fieldName: string;
            suggestedValue: string;
          }>;
        };
      }>()
      .data.suggestions.find((suggestion) => suggestion.fieldName === 'metaDescription');

    expect(metaDescriptionSuggestion?.suggestedValue).toContain('SEO 是搜尋引擎優化的入門說明與實戰重點。');
    expect(metaDescriptionSuggestion?.suggestedValue).not.toContain('[vc_row');
  });

  it('creates a sync task and stores incremental batches until the final batch completes', async () => {
    const { server, body } = await createWordPressConnection();
    const updatedAfter = '2026-07-25T08:00:00+00:00';
    const createTaskResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync-tasks`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        syncStartedAt: '2026-07-26T03:00:00+00:00',
        updatedAfter
      }
    });
    const createTaskBody = createTaskResponse.json();

    expect(createTaskResponse.statusCode).toBe(201);
    expect(createTaskBody).toMatchObject({
      success: true,
      data: {
        task: {
          siteId: body.data.site.id,
          status: 'queued',
          scope: 'incremental',
          updatedAfter,
          batchesReceived: 0,
          articlesReceived: 0,
          mediaReceived: 0
        }
      }
    });

    const firstBatchResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync-tasks/${createTaskBody.data.task.id}/batches`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        batchIndex: 1,
        updatedAfter,
        articles: [
          {
            cmsId: '201',
            type: 'post',
            title: 'Incremental Article One',
            slug: 'incremental-article-one',
            status: 'publish',
            url: 'http://localhost:8088/incremental-article-one/',
            updatedAt: '2026-07-26T02:00:00+00:00'
          }
        ],
        media: []
      }
    });

    expect(firstBatchResponse.statusCode).toBe(200);
    expect(firstBatchResponse.json()).toMatchObject({
      data: {
        task: {
          status: 'running',
          batchesReceived: 1,
          articlesReceived: 1,
          mediaReceived: 0
        }
      }
    });

    const duplicateBatchResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync-tasks/${createTaskBody.data.task.id}/batches`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        batchIndex: 1,
        updatedAfter,
        articles: [
          {
            cmsId: '201',
            type: 'post',
            title: 'Incremental Article One',
            slug: 'incremental-article-one',
            status: 'publish',
            url: 'http://localhost:8088/incremental-article-one/',
            updatedAt: '2026-07-26T02:00:00+00:00'
          }
        ],
        media: []
      }
    });

    expect(duplicateBatchResponse.statusCode).toBe(200);
    expect(duplicateBatchResponse.json()).toMatchObject({
      data: {
        articlesReceived: 0,
        mediaReceived: 0,
        task: {
          batchesReceived: 1,
          articlesReceived: 1,
          mediaReceived: 0
        }
      }
    });

    const finalBatchResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync-tasks/${createTaskBody.data.task.id}/batches`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        batchIndex: 2,
        updatedAfter,
        isFinalBatch: true,
        articles: [
          {
            cmsId: '202',
            type: 'page',
            title: 'Incremental Article Two',
            slug: 'incremental-article-two',
            status: 'publish',
            url: 'http://localhost:8088/incremental-article-two/',
            updatedAt: '2026-07-26T02:10:00+00:00'
          }
        ],
        media: [
          {
            cmsId: '701',
            title: 'Incremental Image',
            url: 'http://localhost:8088/wp-content/uploads/incremental-image.jpg',
            mimeType: 'image/jpeg',
            fileName: 'incremental-image.jpg',
            updatedAt: '2026-07-26T02:20:00+00:00'
          }
        ]
      }
    });

    expect(finalBatchResponse.statusCode).toBe(200);
    expect(finalBatchResponse.json()).toMatchObject({
      data: {
        site: {
          id: body.data.site.id,
          lastSyncStats: {
            articlesReceived: 2,
            mediaReceived: 1
          }
        },
        task: {
          status: 'completed',
          batchesReceived: 2,
          articlesReceived: 2,
          mediaReceived: 1,
          completedAt: expect.any(String)
        }
      }
    });
  });

  it('removes stale content and internal link suggestions after a full rescan', async () => {
    const { server, body } = await createWordPressConnection();
    const authToken = await loginDemoUser(server);
    const articles = [
      {
        cmsId: '301',
        type: 'post',
        title: 'WordPress SEO Cluster Guide Complete Tutorial',
        slug: 'wordpress-seo-cluster-guide',
        status: 'publish',
        url: 'http://localhost:8088/wordpress-seo-cluster-guide/',
        excerpt: 'WordPress SEO cluster guide.',
        metaDescription: 'Learn how to build a complete WordPress SEO topic cluster with internal links.',
        contentHtml: '<h1>WordPress SEO Cluster Guide Complete Tutorial</h1><p>Build SEO topic clusters.</p>',
        author: 'Admin',
        categories: ['SEO'],
        tags: ['wordpress', 'internal links'],
        updatedAt: '2026-07-26T02:00:00+00:00'
      },
      {
        cmsId: '302',
        type: 'page',
        title: 'Advanced WordPress SEO Internal Linking Strategy',
        slug: 'advanced-wordpress-seo-internal-linking',
        status: 'publish',
        url: 'http://localhost:8088/advanced-wordpress-seo-internal-linking/',
        excerpt: 'Internal linking strategy.',
        metaDescription: 'Plan better internal links between WordPress articles, pages, products, and portfolio content.',
        contentHtml: '<h1>Advanced WordPress SEO Internal Linking Strategy</h1><p>Plan internal links.</p>',
        author: 'Admin',
        categories: ['SEO'],
        tags: ['wordpress', 'internal links'],
        updatedAt: '2026-07-26T02:10:00+00:00'
      },
      {
        cmsId: '303',
        type: 'portfolio',
        title: 'Portfolio SEO Case Study Internal Links',
        slug: 'portfolio-seo-case-study-internal-links',
        status: 'publish',
        url: 'http://localhost:8088/portfolio-seo-case-study-internal-links/',
        excerpt: 'Portfolio SEO case study.',
        metaDescription: 'A portfolio SEO case study showing how internal links improve discovery.',
        contentHtml: '<h1>Portfolio SEO Case Study Internal Links</h1><p>Portfolio SEO example.</p>',
        author: 'Admin',
        categories: ['SEO'],
        tags: ['portfolio', 'internal links'],
        updatedAt: '2026-07-26T02:20:00+00:00'
      }
    ];

    const firstTaskResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync-tasks`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        syncStartedAt: '2026-07-26T03:00:00+00:00'
      }
    });
    const firstTaskBody = firstTaskResponse.json();
    const firstBatchResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync-tasks/${firstTaskBody.data.task.id}/batches`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        batchIndex: 1,
        syncStartedAt: '2026-07-26T03:00:00+00:00',
        isFinalBatch: true,
        articles,
        media: []
      }
    });
    const firstAuditResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/audits`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      }
    });

    expect(firstTaskResponse.statusCode).toBe(201);
    expect(firstBatchResponse.statusCode).toBe(200);
    expect(firstAuditResponse.statusCode).toBe(201);

    const secondTaskResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync-tasks`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        syncStartedAt: '2026-07-26T04:00:00+00:00'
      }
    });
    const secondTaskBody = secondTaskResponse.json();
    const secondBatchResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync-tasks/${secondTaskBody.data.task.id}/batches`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        batchIndex: 1,
        syncStartedAt: '2026-07-26T04:00:00+00:00',
        isFinalBatch: true,
        articles: articles.slice(0, 2),
        media: []
      }
    });
    const secondAuditResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/audits`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      }
    });
    const articlesResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${body.data.site.id}/articles?page=1&pageSize=20`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });
    const suggestionsResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${body.data.site.id}/suggestions?targetType=article&limit=100`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });
    const visibleArticleIds = articlesResponse
      .json<{ data: { articles: Array<{ cmsId: string }> } }>()
      .data.articles.map((article) => article.cmsId);

    expect(secondTaskResponse.statusCode).toBe(201);
    expect(secondBatchResponse.statusCode).toBe(200);
    expect(secondAuditResponse.statusCode).toBe(201);
    expect(articlesResponse.statusCode).toBe(200);
    expect(visibleArticleIds).toEqual(['302', '301']);
    expect(JSON.stringify(suggestionsResponse.json())).not.toContain('"targetCmsId":"303"');
  });

  it('hides applied internal link suggestions when the target URL is removed', async () => {
    const seoRepository = createInMemorySeoOptimizationRepository();
    const { server, body } = await createWordPressConnection({}, {
      seoOptimizationRepository: seoRepository
    });
    const authToken = await loginDemoUser(server);
    const siteToken = body.data.apiToken;
    const siteId = body.data.site.id;

    const initialTaskResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${siteId}/sync-tasks`,
      headers: {
        authorization: `Bearer ${siteToken}`
      },
      payload: {
        syncStartedAt: '2026-08-10T01:00:00+00:00'
      }
    });
    const initialTaskId = initialTaskResponse.json().data.task.id;
    const initialBatchResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${siteId}/sync-tasks/${initialTaskId}/batches`,
      headers: {
        authorization: `Bearer ${siteToken}`
      },
      payload: {
        batchIndex: 1,
        syncStartedAt: '2026-08-10T01:00:00+00:00',
        isFinalBatch: true,
        articles: [
          {
            cmsId: '1670',
            type: 'post',
            title: 'SEO 文章內容與搜尋引擎優化完整指南',
            slug: 'seo-guide',
            status: 'publish',
            url: 'https://cyruschan.com/?page_id=1670',
            categories: ['SEO'],
            tags: ['SEO'],
            contentHtml: '<h1>SEO 文章內容與搜尋引擎優化完整指南</h1><p>內容尚未加入內部連結。</p>',
            updatedAt: '2026-08-10T00:00:00+00:00'
          },
          {
            cmsId: '1536',
            type: 'page',
            title: 'FAQ',
            slug: 'faq',
            status: 'publish',
            url: 'https://cyruschan.com/?page_id=1536',
            categories: ['SEO'],
            tags: ['SEO'],
            contentHtml: '<h1>FAQ</h1><p>常見問題。</p>',
            updatedAt: '2026-08-10T00:00:00+00:00'
          },
          {
            cmsId: '1700',
            type: 'post',
            title: 'SEO 內容優化實戰與常見問題',
            slug: 'seo-content-practice',
            status: 'publish',
            url: 'https://cyruschan.com/?page_id=1700',
            categories: ['SEO'],
            tags: ['SEO'],
            contentHtml: '<h1>SEO 內容優化實戰與常見問題</h1><p>另一個仍然存在的相關頁面。</p>',
            updatedAt: '2026-08-10T00:30:00+00:00'
          }
        ],
        media: []
      }
    });

    const createSuggestionResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${siteId}/suggestions`,
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        targetType: 'article',
        targetCmsId: '1670',
        suggestionType: 'internal_link',
        fieldName: 'contentHtml',
        currentValue: '<p>內容尚未加入內部連結。</p>',
        suggestedValue: JSON.stringify({
          format: 'rankwoven-internal-links-v1',
          links: [
            {
              targetTitle: 'FAQ',
              targetUrl: 'https://cyruschan.com/?page_id=1536',
              anchorText: 'FAQ',
              relevance: '20%',
              reason: '舊版建議只保存 targetUrl。'
            }
          ]
        }),
        metadata: {
          sourceCmsId: '1670',
          sourceTitle: 'SEO 文章內容與搜尋引擎優化完整指南',
          targetTitle: 'FAQ',
          targetUrl: 'https://cyruschan.com/?page_id=1536',
          anchorText: 'FAQ',
          relevance: 20,
          reason: '舊版建議只保存 targetUrl。'
        }
      }
    });
    const suggestionId = createSuggestionResponse.json().data.suggestion.id;
    await seoRepository.markSuggestionApplied(suggestionId);

    const rescanTaskResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${siteId}/sync-tasks`,
      headers: {
        authorization: `Bearer ${siteToken}`
      },
      payload: {
        syncStartedAt: '2026-08-10T02:00:00+00:00'
      }
    });
    const rescanTaskId = rescanTaskResponse.json().data.task.id;
    const rescanBatchResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${siteId}/sync-tasks/${rescanTaskId}/batches`,
      headers: {
        authorization: `Bearer ${siteToken}`
      },
      payload: {
        batchIndex: 1,
        syncStartedAt: '2026-08-10T02:00:00+00:00',
        isFinalBatch: true,
        articles: [
          {
            cmsId: '1670',
            type: 'post',
            title: 'SEO 文章內容與搜尋引擎優化完整指南',
            slug: 'seo-guide',
            status: 'publish',
            url: 'https://cyruschan.com/?page_id=1670',
            categories: ['SEO'],
            tags: ['SEO'],
            contentHtml: '<h1>SEO 文章內容與搜尋引擎優化完整指南</h1><p>內容尚未加入內部連結。</p>',
            updatedAt: '2026-08-10T02:00:00+00:00'
          },
          {
            cmsId: '1700',
            type: 'post',
            title: 'SEO 內容優化實戰與常見問題',
            slug: 'seo-content-practice',
            status: 'publish',
            url: 'https://cyruschan.com/?page_id=1700',
            categories: ['SEO'],
            tags: ['SEO'],
            contentHtml: '<h1>SEO 內容優化實戰與常見問題</h1><p>另一個仍然存在的相關頁面。</p>',
            updatedAt: '2026-08-10T02:00:00+00:00'
          }
        ],
        media: []
      }
    });
    const auditResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${siteId}/audits`,
      headers: {
        authorization: `Bearer ${siteToken}`
      }
    });
    const suggestionsResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${siteId}/suggestions?targetType=article&limit=100`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });
    const suggestions = suggestionsResponse.json().data.suggestions;

    expect(initialBatchResponse.statusCode).toBe(200);
    expect(createSuggestionResponse.statusCode).toBe(201);
    expect(rescanBatchResponse.statusCode).toBe(200);
    expect(auditResponse.statusCode).toBe(201);
    expect(suggestionsResponse.statusCode).toBe(200);
    expect(JSON.stringify(suggestions)).not.toContain('page_id=1536');
    expect(JSON.stringify(suggestions)).toContain('page_id=1700');
  });

  it('sanitizes legacy internal link suggestion HTML from list responses', async () => {
    const { server, body } = await createWordPressConnection();
    const authToken = await loginDemoUser(server);
    const siteToken = body.data.apiToken;
    const siteId = body.data.site.id;

    const syncResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${siteId}/sync`,
      headers: {
        authorization: `Bearer ${siteToken}`
      },
      payload: {
        articles: [
          {
            cmsId: '1670',
            type: 'post',
            title: 'SEO 文章內容與搜尋引擎優化完整指南',
            slug: 'seo-guide',
            status: 'publish',
            url: 'https://cyruschan.com/?page_id=1670',
            categories: ['SEO'],
            tags: ['SEO'],
            contentHtml: '<h1>SEO 指南</h1><p><a href="https://cyruschan.com/?page_id=1536">舊 FAQ</a></p>',
            updatedAt: '2026-08-12T00:00:00+00:00'
          },
          {
            cmsId: '1700',
            type: 'post',
            title: 'SEO 內容優化實戰與常見問題',
            slug: 'seo-content-practice',
            status: 'publish',
            url: 'https://cyruschan.com/?page_id=1700',
            categories: ['SEO'],
            tags: ['SEO'],
            contentHtml: '<h1>SEO 內容優化實戰與常見問題</h1><p>仍然存在的相關頁面。</p>',
            updatedAt: '2026-08-12T00:10:00+00:00'
          }
        ],
        media: []
      }
    });
    const createSuggestionResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${siteId}/suggestions`,
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        targetType: 'article',
        targetCmsId: '1670',
        suggestionType: 'internal_link',
        fieldName: 'contentHtml',
        currentValue: '<p><a href="https://cyruschan.com/?page_id=1536">舊 FAQ</a></p>',
        suggestedValue: [
          '<p><a href="https://cyruschan.com/?page_id=1536">舊 FAQ</a></p>',
          '<p data-rankwoven-internal-link="true">延伸閱讀：',
          '<a href="https://cyruschan.com/?page_id=1700">SEO 內容優化實戰</a></p>'
        ].join('\n'),
        metadata: {
          sourceCmsId: '1670',
          sourceTitle: 'SEO 文章內容與搜尋引擎優化完整指南',
          sourceUrl: 'https://cyruschan.com/?page_id=1670',
          targetCmsId: '1700',
          targetTitle: 'SEO 內容優化實戰與常見問題',
          targetUrl: 'https://cyruschan.com/?page_id=1700',
          anchorText: 'SEO 內容優化實戰',
          relevance: 42,
          reason: '仍然存在的相關頁面。'
        }
      }
    });
    const suggestionsResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${siteId}/suggestions?targetType=article&limit=100`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });
    const suggestions = suggestionsResponse
      .json<{
        data: {
          suggestions: Array<{
            currentValue?: string;
            suggestedValue: string;
            suggestionType: string;
          }>;
        };
      }>()
      .data.suggestions;
    const internalLinkSuggestion = suggestions.find((suggestion) => suggestion.suggestionType === 'internal_link');
    const parsedSuggestion = JSON.parse(internalLinkSuggestion?.suggestedValue ?? '{}') as {
      format?: string;
      links?: Array<{ targetUrl: string; anchorText: string }>;
    };

    expect(syncResponse.statusCode).toBe(200);
    expect(createSuggestionResponse.statusCode).toBe(201);
    expect(suggestionsResponse.statusCode).toBe(200);
    expect(JSON.stringify(suggestions)).not.toContain('page_id=1536');
    expect(internalLinkSuggestion?.currentValue).toBeUndefined();
    expect(parsedSuggestion).toMatchObject({
      format: 'rankwoven-internal-links-v1',
      links: [
        expect.objectContaining({
          targetUrl: 'https://cyruschan.com/?page_id=1700',
          anchorText: 'SEO 內容優化實戰'
        })
      ]
    });
  });

  it('hides internal link suggestions for trashed synced articles', async () => {
    const { server, body } = await createWordPressConnection();
    const authToken = await loginDemoUser(server);
    const siteToken = body.data.apiToken;
    const siteId = body.data.site.id;

    const syncTaskResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${siteId}/sync-tasks`,
      headers: {
        authorization: `Bearer ${siteToken}`
      },
      payload: {
        syncStartedAt: '2026-08-11T01:00:00+00:00'
      }
    });
    const syncTaskId = syncTaskResponse.json().data.task.id;
    const syncBatchResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${siteId}/sync-tasks/${syncTaskId}/batches`,
      headers: {
        authorization: `Bearer ${siteToken}`
      },
      payload: {
        batchIndex: 1,
        syncStartedAt: '2026-08-11T01:00:00+00:00',
        isFinalBatch: true,
        articles: [
          {
            cmsId: '1670',
            type: 'post',
            title: '第 1 章：SEO 是什麼？搜尋引擎優化完整入門',
            slug: 'seo',
            status: 'publish',
            url: 'https://cyruschan.com/seo/',
            categories: ['SEO'],
            tags: ['SEO'],
            contentHtml: '<h1>SEO 是什麼</h1><p>內容尚未加入內部連結。</p>',
            updatedAt: '2026-08-11T00:00:00+00:00'
          },
          {
            cmsId: '1536',
            type: 'page',
            title: 'FAQ',
            slug: 'faq',
            status: 'trash',
            url: 'https://cyruschan.com/?page_id=1536',
            categories: ['SEO'],
            tags: ['SEO'],
            contentHtml: '<h1>FAQ</h1><p>已移到回收桶。</p>',
            updatedAt: '2026-08-11T00:00:00+00:00'
          },
          {
            cmsId: '1700',
            type: 'post',
            title: 'SEO 內容優化實戰與常見問題',
            slug: 'seo-content-practice',
            status: 'publish',
            url: 'https://cyruschan.com/seo-content-practice/',
            categories: ['SEO'],
            tags: ['SEO'],
            contentHtml: '<h1>SEO 內容優化實戰與常見問題</h1><p>另一個仍然存在的相關頁面。</p>',
            updatedAt: '2026-08-11T00:00:00+00:00'
          }
        ],
        media: []
      }
    });

    const trashedTargetSuggestionResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${siteId}/suggestions`,
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        targetType: 'article',
        targetCmsId: '1670',
        suggestionType: 'internal_link',
        fieldName: 'contentHtml',
        currentValue: '<p>內容尚未加入內部連結。</p>',
        suggestedValue: JSON.stringify({
          format: 'rankwoven-internal-links-v1',
          links: [
            {
              targetCmsId: '1536',
              targetTitle: 'FAQ',
              targetUrl: 'https://cyruschan.com/?page_id=1536',
              anchorText: 'FAQ'
            }
          ]
        }),
        metadata: {
          sourceCmsId: '1670',
          sourceUrl: 'https://cyruschan.com/seo/',
          targetCmsId: '1536',
          targetUrl: 'https://cyruschan.com/?page_id=1536',
          anchorText: 'FAQ',
          relevance: 32
        }
      }
    });
    const trashedSourceSuggestionResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${siteId}/suggestions`,
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        targetType: 'article',
        targetCmsId: '1536',
        suggestionType: 'internal_link',
        fieldName: 'contentHtml',
        currentValue: '<p>已移到回收桶。</p>',
        suggestedValue: JSON.stringify({
          format: 'rankwoven-internal-links-v1',
          links: [
            {
              targetCmsId: '1700',
              targetTitle: 'SEO 內容優化實戰與常見問題',
              targetUrl: 'https://cyruschan.com/seo-content-practice/',
              anchorText: 'SEO 內容優化實戰'
            }
          ]
        }),
        metadata: {
          sourceCmsId: '1536',
          sourceUrl: 'https://cyruschan.com/?page_id=1536',
          targetCmsId: '1700',
          targetUrl: 'https://cyruschan.com/seo-content-practice/',
          anchorText: 'SEO 內容優化實戰',
          relevance: 24
        }
      }
    });
    const publishSuggestionResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${siteId}/suggestions`,
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        targetType: 'article',
        targetCmsId: '1670',
        suggestionType: 'internal_link',
        fieldName: 'contentHtml',
        currentValue: '<p>內容尚未加入內部連結。</p>',
        suggestedValue: JSON.stringify({
          format: 'rankwoven-internal-links-v1',
          links: [
            {
              targetCmsId: '1700',
              targetTitle: 'SEO 內容優化實戰與常見問題',
              targetUrl: 'https://cyruschan.com/seo-content-practice/',
              anchorText: 'SEO 內容優化實戰'
            }
          ]
        }),
        metadata: {
          sourceCmsId: '1670',
          sourceUrl: 'https://cyruschan.com/seo/',
          targetCmsId: '1700',
          targetUrl: 'https://cyruschan.com/seo-content-practice/',
          anchorText: 'SEO 內容優化實戰',
          relevance: 41
        }
      }
    });
    const suggestionsResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${siteId}/suggestions?targetType=article&limit=100`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });
    const suggestions = suggestionsResponse.json().data.suggestions;

    expect(syncTaskResponse.statusCode).toBe(201);
    expect(syncBatchResponse.statusCode).toBe(200);
    expect(trashedTargetSuggestionResponse.statusCode).toBe(201);
    expect(trashedSourceSuggestionResponse.statusCode).toBe(201);
    expect(publishSuggestionResponse.statusCode).toBe(201);
    expect(suggestionsResponse.statusCode).toBe(200);
    expect(JSON.stringify(suggestions)).not.toContain('page_id=1536');
    expect(JSON.stringify(suggestions)).toContain('seo-content-practice');
  });

  it('creates manual article and media refresh tasks and lists batch progress', async () => {
    const { server, body } = await createWordPressConnection();
    const authToken = await loginDemoUser(server);
    const articleTaskResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/manual-refresh`,
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        type: 'article',
        cmsId: '303'
      }
    });
    const articleTaskBody = articleTaskResponse.json();

    expect(articleTaskResponse.statusCode).toBe(201);
    expect(articleTaskBody).toMatchObject({
      success: true,
      data: {
        task: {
          siteId: body.data.site.id,
          status: 'queued',
          scope: 'article',
          targetCmsId: '303',
          batchesReceived: 0,
          articlesReceived: 0,
          mediaReceived: 0
        }
      }
    });

    const mediaTaskResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/manual-refresh`,
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        type: 'media',
        cmsId: '801'
      }
    });

    expect(mediaTaskResponse.statusCode).toBe(201);
    expect(mediaTaskResponse.json()).toMatchObject({
      data: {
        task: {
          scope: 'media',
          targetCmsId: '801'
        }
      }
    });

    const siteTasksResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${body.data.site.id}/sync-tasks`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    expect(siteTasksResponse.statusCode).toBe(200);
    expect(siteTasksResponse.json()).toMatchObject({
      success: true,
      data: {
        tasks: expect.arrayContaining([
          expect.objectContaining({
            siteId: body.data.site.id,
            siteName: 'Local WordPress',
            scope: 'article',
            targetCmsId: '303'
          }),
          expect.objectContaining({
            siteId: body.data.site.id,
            siteName: 'Local WordPress',
            scope: 'media',
            targetCmsId: '801'
          })
        ])
      }
    });

    const allTasksResponse = await server.inject({
      method: 'GET',
      url: '/api/v1/sync-tasks',
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    expect(allTasksResponse.statusCode).toBe(200);
    expect(allTasksResponse.json()).toMatchObject({
      data: {
        tasks: expect.arrayContaining([
          expect.objectContaining({
            scope: 'article',
            targetCmsId: '303'
          })
        ])
      }
    });
  });

  it('creates SEO audit issues, suggestion records, and approved apply tasks', async () => {
    const { server, body } = await createWordPressConnection();
    const authToken = await loginDemoUser(server);
    const syncResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        articles: [
          {
            cmsId: '404',
            type: 'post',
            title: 'Tiny',
            slug: 'tiny',
            status: 'publish',
            url: 'http://localhost:8088/tiny/',
            excerpt: 'Tiny article fallback summary.',
            metaDescription: '',
            contentHtml: '<p>No headings or internal links yet.</p>',
            updatedAt: '2026-07-26T08:00:00+00:00'
          }
        ],
        media: [
          {
            cmsId: '904',
            title: 'Hero Image 2026',
            url: 'http://localhost:8088/wp-content/uploads/Hero Image 2026.JPG',
            mimeType: 'image/jpeg',
            fileName: 'Hero Image 2026.JPG',
            caption: '',
            description: '',
            altText: '',
            attachedToCmsId: '404',
            updatedAt: '2026-07-26T08:00:00+00:00'
          }
        ]
      }
    });

    expect(syncResponse.statusCode).toBe(200);

    const auditResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/audits`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });
    const auditBody = auditResponse.json<{
      data: {
        audit: {
          id: string;
          score: number;
        };
        issues: Array<{
          ruleCode: string;
        }>;
      };
    }>();

    expect(auditResponse.statusCode).toBe(201);
    expect(auditBody.data.audit.score).toBeLessThan(100);
    expect(auditBody.data.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleCode: 'ARTICLE_TITLE_LENGTH' }),
        expect.objectContaining({ ruleCode: 'ARTICLE_META_DESCRIPTION_LENGTH' }),
        expect.objectContaining({ ruleCode: 'MEDIA_TITLE_CONTEXT' }),
        expect.objectContaining({ ruleCode: 'MEDIA_CAPTION_CONTEXT' }),
        expect.objectContaining({ ruleCode: 'MEDIA_DESCRIPTION_CONTEXT' }),
        expect.objectContaining({ ruleCode: 'MEDIA_ALT_TEXT_CONTEXT' }),
        expect.objectContaining({ ruleCode: 'MEDIA_FILE_NAME_CONTEXT' })
      ])
    );

    const suggestionsResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${body.data.site.id}/suggestions`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });
    const suggestionsBody = suggestionsResponse.json<{
      data: {
        suggestions: Array<{
          id: string;
          status: string;
          targetType: string;
          fieldName: string;
          suggestionType: string;
          targetCmsId: string;
          suggestedValue: string;
        }>;
      };
    }>();
    const titleSuggestion = suggestionsBody.data.suggestions.find(
      (suggestion) => suggestion.fieldName === 'title'
    );
    const metaDescriptionSuggestion = suggestionsBody.data.suggestions.find(
      (suggestion) => suggestion.fieldName === 'metaDescription'
    );
    const mediaTitleSuggestion = suggestionsBody.data.suggestions.find(
      (suggestion) => suggestion.targetType === 'media' && suggestion.fieldName === 'title'
    );
    const mediaCaptionSuggestion = suggestionsBody.data.suggestions.find(
      (suggestion) => suggestion.targetType === 'media' && suggestion.fieldName === 'caption'
    );
    const mediaDescriptionSuggestion = suggestionsBody.data.suggestions.find(
      (suggestion) => suggestion.targetType === 'media' && suggestion.fieldName === 'description'
    );
    const mediaAltTextSuggestion = suggestionsBody.data.suggestions.find(
      (suggestion) => suggestion.targetType === 'media' && suggestion.fieldName === 'altText'
    );
    const mediaFileNameSuggestion = suggestionsBody.data.suggestions.find(
      (suggestion) => suggestion.targetType === 'media' && suggestion.fieldName === 'fileName'
    );

    expect(suggestionsResponse.statusCode).toBe(200);
    expect(titleSuggestion).toMatchObject({
      status: 'pending',
      targetCmsId: '404'
    });
    expect(metaDescriptionSuggestion).toMatchObject({
      status: 'pending',
      suggestionType: 'meta_description',
      targetCmsId: '404'
    });
    expect(mediaTitleSuggestion).toMatchObject({
      status: 'pending',
      suggestionType: 'media_title',
      targetCmsId: '904',
      suggestedValue: 'Tiny'
    });
    expect(mediaCaptionSuggestion).toMatchObject({
      status: 'pending',
      suggestionType: 'media_caption',
      targetCmsId: '904',
      suggestedValue: 'Tiny article fallback summary.'
    });
    expect(mediaDescriptionSuggestion).toMatchObject({
      status: 'pending',
      suggestionType: 'media_description',
      targetCmsId: '904',
      suggestedValue: 'No headings or internal links yet.'
    });
    expect(mediaAltTextSuggestion).toMatchObject({
      status: 'pending',
      suggestionType: 'media_alt_text',
      targetCmsId: '904',
      suggestedValue: 'Tiny'
    });
    expect(mediaFileNameSuggestion).toMatchObject({
      status: 'pending',
      suggestionType: 'media_file_name',
      targetCmsId: '904',
      suggestedValue: 'tiny-1.jpg'
    });

    const approveResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/suggestions/${titleSuggestion?.id}/approve`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    expect(approveResponse.statusCode).toBe(200);
    expect(approveResponse.json()).toMatchObject({
      data: {
        suggestion: {
          status: 'approved'
        }
      }
    });

    const applyResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/suggestions/${titleSuggestion?.id}/apply`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });
    const applyBody = applyResponse.json<{
      data: {
        snapshot: {
          id: string;
          taskId: string;
          targetCmsId: string;
          fieldName: string;
          status: string;
        };
        task: {
          id: string;
          scope: string;
          targetCmsId: string;
          suggestionId?: string;
          applySnapshotId?: string;
        };
      };
    }>();

    expect(applyResponse.statusCode).toBe(201);
    expect(applyBody).toMatchObject({
      data: {
        snapshot: {
          targetCmsId: '404',
          fieldName: 'title',
          status: 'created',
          taskId: applyBody.data.task.id
        },
        task: {
          scope: 'suggestion_apply',
          targetCmsId: '404',
          suggestionId: titleSuggestion?.id,
          applySnapshotId: applyBody.data.snapshot.id
        }
      }
    });

    const applyQueueResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${body.data.site.id}/apply-queue`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });
    const applyQueueBody = applyQueueResponse.json<{
      data: {
        suggestions: Array<{ id: string; status: string }>;
        tasks: Array<{ scope: string; suggestionId?: string; applySnapshotId?: string }>;
        snapshots: Array<{ id: string; taskId?: string; status: string }>;
      };
    }>();

    expect(applyQueueResponse.statusCode).toBe(200);
    expect(applyQueueBody.data.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: titleSuggestion?.id,
          status: 'approved'
        })
      ])
    );
    expect(applyQueueBody.data.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: 'suggestion_apply',
          suggestionId: titleSuggestion?.id,
          applySnapshotId: applyBody.data.snapshot.id
        })
      ])
    );
    expect(applyQueueBody.data.snapshots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: applyBody.data.snapshot.id,
          taskId: applyBody.data.task.id,
          status: 'created'
        })
      ])
    );

    const rollbackTooEarlyResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/apply-snapshots/${applyQueueBody.data.snapshots[0].id}/rollback`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    expect(rollbackTooEarlyResponse.statusCode).toBe(409);
  });

  it('generates internal link suggestions for synced posts, pages, portfolio items, and products', async () => {
    const { server, body } = await createWordPressConnection();
    const authToken = await loginDemoUser(server);
    const syncResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        articles: [
          {
            cmsId: '501',
            type: 'post',
            title: 'Sustainable Interior Design Guide',
            slug: 'sustainable-interior-design-guide',
            status: 'publish',
            url: 'http://localhost:8088/sustainable-interior-design-guide/',
            excerpt: 'Sustainable interior design ideas for natural materials and furniture planning.',
            metaDescription: 'A guide to sustainable interior design with furniture and case study examples.',
            contentHtml: '<h1>Sustainable Interior Design Guide</h1><p>Plan natural materials and furniture for a greener home. <a href="/product/rattan-triple-seat-sofa/">See the sofa</a>.</p>',
            categories: ['Interior Design'],
            tags: ['sustainable', 'furniture'],
            updatedAt: '2026-08-09T08:00:00+00:00'
          },
          {
            cmsId: '502',
            type: 'product',
            title: 'Rattan Triple Seat Sofa',
            slug: 'rattan-triple-seat-sofa',
            status: 'publish',
            url: 'http://localhost:8088/product/rattan-triple-seat-sofa/',
            excerpt: 'Natural rattan sofa for sustainable interior furniture projects.',
            metaDescription: 'Shop a rattan triple seat sofa for sustainable interiors.',
            contentHtml: '<h1>Rattan Triple Seat Sofa</h1><p>Natural rattan seating for sustainable living rooms.</p>',
            categories: ['Furniture'],
            tags: ['rattan', 'sustainable'],
            updatedAt: '2026-08-09T08:00:00+00:00'
          },
          {
            cmsId: '503',
            type: 'portfolio',
            title: 'Eco Green Interior',
            slug: 'eco-green-interior',
            status: 'publish',
            url: 'http://localhost:8088/portfolio/eco-green-interior/',
            excerpt: 'Portfolio case study for sustainable interior design and natural materials.',
            metaDescription: 'Eco Green Interior portfolio case study.',
            contentHtml: '<h1>Eco Green Interior</h1><p>A sustainable interior design portfolio using natural furniture.</p>',
            categories: ['Portfolio'],
            tags: ['sustainable', 'interior'],
            updatedAt: '2026-08-09T08:00:00+00:00'
          },
          {
            cmsId: '504',
            type: 'page',
            title: 'Interior Design Services',
            slug: 'interior-design-services',
            status: 'publish',
            url: 'http://localhost:8088/interior-design-services/',
            excerpt: 'Interior design services for homes and commercial spaces.',
            metaDescription: 'Interior design services page.',
            contentHtml: '<h1>Interior Design Services</h1><p>Services for sustainable homes and furniture planning.</p>',
            categories: [],
            tags: ['interior'],
            updatedAt: '2026-08-09T08:00:00+00:00'
          }
        ],
        media: []
      }
    });

    expect(syncResponse.statusCode).toBe(200);

    const generateResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/internal-links/generate`,
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        limit: 10
      }
    });
    const generateBody = generateResponse.json<{
      data: {
        generated: number;
        articlesScanned: number;
        suggestions: Array<{
          targetType: string;
          targetCmsId: string;
          suggestionType: string;
          fieldName: string;
          suggestedValue: string;
          metadata?: Record<string, unknown>;
        }>;
      };
    }>();

    expect(generateResponse.statusCode).toBe(201);
    expect(generateBody.data.articlesScanned).toBe(4);
    expect(generateBody.data.generated).toBeGreaterThan(0);
    expect(generateBody.data.suggestions[0]).toMatchObject({
      targetType: 'article',
      suggestionType: 'internal_link',
      fieldName: 'contentHtml'
    });
    expect(generateBody.data.suggestions[0]?.metadata).toMatchObject({
      sourceCmsId: expect.any(String),
      sourceTitle: expect.any(String),
      targetCmsId: expect.any(String),
      targetTitle: expect.any(String),
      anchorText: expect.any(String),
      targetUrl: expect.stringContaining('http://localhost:8088/'),
      relevance: expect.any(Number),
      reason: expect.any(String)
    });
    expect(generateBody.data.suggestions[0]?.suggestedValue).toContain('data-rankwoven-internal-link="true"');
    expect(generateBody.data.suggestions[0]?.suggestedValue).toContain('<a href="http://localhost:8088/');
    expect(generateBody.data.suggestions.find((suggestion) =>
      suggestion.metadata?.sourceCmsId === '501' && suggestion.metadata?.targetCmsId === '502'
    )).toBeUndefined();

    const suggestionsResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${body.data.site.id}/suggestions?targetType=article`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    expect(suggestionsResponse.statusCode).toBe(200);
    expect(suggestionsResponse.json().data.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          suggestionType: 'internal_link',
          metadata: expect.objectContaining({
            anchorText: expect.any(String)
          })
        })
      ])
    );
  });

  it('rejects invalid manual refresh task input', async () => {
    const { server, body } = await createWordPressConnection();
    const authToken = await loginDemoUser(server);
    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/manual-refresh`,
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        type: 'article',
        cmsId: ''
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR'
      }
    });
  });

  it('regenerates a site token and rejects the previous token', async () => {
    const { server, body } = await createWordPressConnection();
    const authToken = await loginDemoUser(server);
    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/token/regenerate`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });
    const regenerated = response.json<RegenerateTokenResponse>();

    expect(response.statusCode).toBe(200);
    expect(regenerated).toMatchObject({
      success: true,
      data: {
        site: {
          id: body.data.site.id,
          status: 'connected'
        }
      }
    });
    expect(regenerated.data.apiToken).toMatch(/^rw_[a-f0-9]{32}$/);
    expect(regenerated.data.apiToken).not.toBe(body.data.apiToken);
    expect(regenerated.data.site.tokenPreview).toBe(`${regenerated.data.apiToken.slice(0, 8)}...`);
    expect(regenerated.data.site).not.toHaveProperty('lastTokenUsedAt');

    const oldTokenSyncResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        articles: [],
        media: []
      }
    });

    expect(oldTokenSyncResponse.statusCode).toBe(401);

    const newTokenSyncResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync`,
      headers: {
        authorization: `Bearer ${regenerated.data.apiToken}`
      },
      payload: {
        articles: [],
        media: []
      }
    });

    const newTokenSyncBody = newTokenSyncResponse.json();

    expect(newTokenSyncResponse.statusCode).toBe(200);
    expect(newTokenSyncBody.data.site.lastTokenUsedAt).toEqual(expect.any(String));
  });

  it('revokes a site token and rejects future sync calls', async () => {
    const { server, body } = await createWordPressConnection();
    const authToken = await loginDemoUser(server);
    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/token/revoke`,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        site: {
          id: body.data.site.id,
          status: 'revoked'
        }
      }
    });

    const syncResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/sync`,
      headers: {
        authorization: `Bearer ${body.data.apiToken}`
      },
      payload: {
        articles: [],
        media: []
      }
    });

    expect(syncResponse.statusCode).toBe(401);
    expect(syncResponse.json()).toMatchObject({
      success: false,
      error: {
        code: 'SITE_TOKEN_INVALID'
      }
    });
  });
});
