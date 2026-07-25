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
  });

  it('lists connected sites without exposing full tokens', async () => {
    const { server, body } = await createWordPressConnection();
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/site-connections'
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

  it('stores WordPress admin application password configuration without exposing the password', async () => {
    const { server, body } = await createWordPressConnection({
      wordpressAdminUsername: 'site-admin',
      wordpressApplicationPassword: 'abcd efgh ijkl mnop'
    });
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/site-connections'
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
    const response = await server.inject({
      method: 'PUT',
      url: `/api/v1/site-connections/${body.data.site.id}/wordpress-credentials`,
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
    expect(syncResponse.json()).toMatchObject({
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
  });

  it('regenerates a site token and rejects the previous token', async () => {
    const { server, body } = await createWordPressConnection();
    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/token/regenerate`
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

    expect(newTokenSyncResponse.statusCode).toBe(200);
  });

  it('revokes a site token and rejects future sync calls', async () => {
    const { server, body } = await createWordPressConnection();
    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${body.data.site.id}/token/revoke`
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
