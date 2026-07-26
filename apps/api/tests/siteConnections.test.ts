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
  }> = {}
) {
  const server = createServer({
    siteConnectionRepository: createInMemorySiteConnectionRepository()
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
            featuredImageId: '501'
          }
        ]
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
            contentHtml: '<p>No headings or internal links yet.</p>',
            updatedAt: '2026-07-26T08:00:00+00:00'
          }
        ],
        media: [
          {
            cmsId: '904',
            title: 'Hero Image',
            url: 'http://localhost:8088/wp-content/uploads/Hero Image 2026.JPG',
            mimeType: 'image/jpeg',
            fileName: 'Hero Image 2026.JPG',
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
        expect.objectContaining({ ruleCode: 'MEDIA_ALT_TEXT_MISSING' })
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
          fieldName: string;
          targetCmsId: string;
        }>;
      };
    }>();
    const titleSuggestion = suggestionsBody.data.suggestions.find(
      (suggestion) => suggestion.fieldName === 'title'
    );

    expect(suggestionsResponse.statusCode).toBe(200);
    expect(titleSuggestion).toMatchObject({
      status: 'pending',
      targetCmsId: '404'
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

    expect(applyResponse.statusCode).toBe(201);
    expect(applyResponse.json()).toMatchObject({
      data: {
        task: {
          scope: 'suggestion_apply',
          targetCmsId: '404',
          suggestionId: titleSuggestion?.id
        }
      }
    });
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
