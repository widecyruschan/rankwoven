import type { TextGenerationProvider, TextGenerationResult } from '@aieo/ai-providers';
import { describe, expect, it } from 'vitest';
import { createServer } from '../src/server';
import { createInMemorySiteConnectionRepository } from '../src/siteConnections';

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
              post: 506,
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

      if (url.includes('/wp-json/wp/v2/posts/506') || url.includes('/wp-json/wp/v2/pages/506')) {
        return new Response('', { status: 404 });
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
      expect(
        suggestionsResponse
          .json<{ data: { suggestions: Array<{ fieldName: string }> } }>()
          .data.suggestions.map((suggestion) => suggestion.fieldName)
          .sort()
      ).toEqual(['altText', 'caption', 'description', 'fileName', 'title']);
      expect(requestedUrls.some((url) => url.includes('/wp-json/wp/v2/posts/506'))).toBe(true);
      expect(requestedUrls.some((url) => url.includes('/wp-json/wp/v2/pages/506'))).toBe(true);
      expect(requestedUrls.some((url) => url.includes('/wp-json/wp/v2/product/506'))).toBe(true);
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
