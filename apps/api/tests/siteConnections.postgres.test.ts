import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';
import { createServer } from '../src/server';
import { createPostgresSiteConnectionRepository } from '../src/siteConnections';

const postgresTestDatabaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const shouldRunPostgresTests = process.env.RUN_POSTGRES_TESTS === '1' && postgresTestDatabaseUrl;
const describePostgres = shouldRunPostgresTests ? describe : describe.skip;

interface CreateSiteConnectionResponse {
  data: {
    site: {
      id: string;
      wordpressAdminUsername?: string;
      wordpressApplicationPasswordConfigured: boolean;
    };
    apiToken: string;
  };
}

interface RegenerateTokenResponse {
  data: {
    site: {
      id: string;
      status: 'connected' | 'revoked';
      tokenPreview: string;
    };
    apiToken: string;
  };
}

describePostgres('PostgreSQL site connection repository', () => {
  it('persists site connections, token hash, sync runs, articles, and media', async () => {
    const databaseUrl = postgresTestDatabaseUrl as string;
    const repository = createPostgresSiteConnectionRepository(databaseUrl);
    const server = createServer({
      siteConnectionRepository: repository
    });
    const pool = new Pool({
      connectionString: databaseUrl
    });
    let siteId = '';

    try {
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/site-connections',
        payload: {
          platform: 'wordpress',
          name: `Postgres WordPress ${crypto.randomUUID()}`,
          siteUrl: 'http://localhost:8088',
          cmsVersion: '6.8.2',
          pluginVersion: '0.1.0',
          wordpressAdminUsername: 'postgres-admin',
          wordpressApplicationPassword: 'abcd efgh ijkl mnop'
        }
      });
      const createBody = createResponse.json<CreateSiteConnectionResponse>();
      siteId = createBody.data.site.id;

      expect(createResponse.statusCode).toBe(201);
      expect(createBody.data.apiToken).toMatch(/^rw_[a-f0-9]{32}$/);
      expect(createBody.data.site).toMatchObject({
        wordpressAdminUsername: 'postgres-admin',
        wordpressApplicationPasswordConfigured: true
      });
      expect(JSON.stringify(createBody)).not.toContain('abcd efgh ijkl mnop');

      const syncPayload = {
        syncStartedAt: '2026-07-25T15:14:18+00:00',
        articles: [
          {
            cmsId: '101',
            type: 'post',
            title: 'PostgreSQL Sync Article',
            slug: 'postgresql-sync-article',
            status: 'publish',
            url: 'http://localhost:8088/postgresql-sync-article/',
            excerpt: 'Stored in PostgreSQL.',
            contentHtml: '<p>Stored in PostgreSQL.</p>',
            author: 'Admin',
            categories: ['SEO'],
            tags: ['postgres'],
            featuredImageId: '501',
            publishedAt: '2026-07-20T08:00:00+00:00',
            updatedAt: '2026-07-25T08:00:00+00:00'
          }
        ],
        media: [
          {
            cmsId: '501',
            title: 'PostgreSQL Sync Image',
            url: 'http://localhost:8088/wp-content/uploads/postgresql-sync-image.jpg',
            mimeType: 'image/jpeg',
            fileName: 'postgresql-sync-image.jpg',
            altText: 'Image synced into PostgreSQL',
            attachedToCmsId: '101',
            updatedAt: '2026-07-25T08:00:00+00:00'
          }
        ]
      };

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const syncResponse = await server.inject({
          method: 'POST',
          url: `/api/v1/site-connections/${siteId}/sync`,
          headers: {
            authorization: `Bearer ${createBody.data.apiToken}`
          },
          payload: syncPayload
        });

        expect(syncResponse.statusCode).toBe(200);
      }

      const articlesResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/site-connections/${siteId}/articles`,
        headers: {
          authorization: `Bearer ${createBody.data.apiToken}`
        }
      });

      expect(articlesResponse.statusCode).toBe(200);
      expect(articlesResponse.json()).toMatchObject({
        success: true,
        data: {
          articles: [
            {
              cmsId: '101',
              title: 'PostgreSQL Sync Article'
            }
          ]
        }
      });

      const persisted = await pool.query(
        `
          SELECT
            sc.api_token_hash,
            sc.token_preview,
            sc.wordpress_admin_username,
            sc.wordpress_application_password_encrypted,
            COUNT(DISTINCT sa.id)::int AS article_count,
            COUNT(DISTINCT sm.id)::int AS media_count,
            COUNT(DISTINCT sr.id)::int AS sync_run_count
          FROM site_connections sc
          LEFT JOIN synced_articles sa ON sa.site_id = sc.id
          LEFT JOIN synced_media sm ON sm.site_id = sc.id
          LEFT JOIN sync_runs sr ON sr.site_id = sc.id
          WHERE sc.id = $1
          GROUP BY sc.id
        `,
        [siteId]
      );

      expect(persisted.rows[0]).toMatchObject({
        token_preview: `${createBody.data.apiToken.slice(0, 8)}...`,
        wordpress_admin_username: 'postgres-admin',
        article_count: 1,
        media_count: 1,
        sync_run_count: 2
      });
      expect(persisted.rows[0].api_token_hash).not.toBe(createBody.data.apiToken);
      expect(persisted.rows[0].wordpress_application_password_encrypted).not.toBe(
        'abcd efgh ijkl mnop'
      );
      expect(persisted.rows[0].wordpress_application_password_encrypted).toMatch(/^v1:/);

      const credentialsResponse = await server.inject({
        method: 'PUT',
        url: `/api/v1/site-connections/${siteId}/wordpress-credentials`,
        payload: {
          wordpressAdminUsername: 'updated-admin',
          wordpressApplicationPassword: 'qrst uvwx yz12 3456'
        }
      });

      expect(credentialsResponse.statusCode).toBe(200);
      expect(credentialsResponse.json()).toMatchObject({
        data: {
          site: {
            id: siteId,
            wordpressAdminUsername: 'updated-admin',
            wordpressApplicationPasswordConfigured: true
          }
        }
      });
      expect(JSON.stringify(credentialsResponse.json())).not.toContain('qrst uvwx yz12 3456');

      const regenerateResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${siteId}/token/regenerate`
      });
      const regenerateBody = regenerateResponse.json<RegenerateTokenResponse>();

      expect(regenerateResponse.statusCode).toBe(200);
      expect(regenerateBody.data.site).toMatchObject({
        id: siteId,
        status: 'connected',
        tokenPreview: `${regenerateBody.data.apiToken.slice(0, 8)}...`
      });
      expect(regenerateBody.data.apiToken).not.toBe(createBody.data.apiToken);

      const oldTokenSyncResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${siteId}/sync`,
        headers: {
          authorization: `Bearer ${createBody.data.apiToken}`
        },
        payload: {
          articles: [],
          media: []
        }
      });

      expect(oldTokenSyncResponse.statusCode).toBe(401);

      const revokeResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${siteId}/token/revoke`
      });

      expect(revokeResponse.statusCode).toBe(200);
      expect(revokeResponse.json()).toMatchObject({
        data: {
          site: {
            id: siteId,
            status: 'revoked'
          }
        }
      });

      const revokedTokenSyncResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${siteId}/sync`,
        headers: {
          authorization: `Bearer ${regenerateBody.data.apiToken}`
        },
        payload: {
          articles: [],
          media: []
        }
      });

      expect(revokedTokenSyncResponse.statusCode).toBe(401);

      const tokenStatus = await pool.query(
        `
          SELECT status, token_preview, api_token_hash
          FROM site_connections
          WHERE id = $1
        `,
        [siteId]
      );

      expect(tokenStatus.rows[0]).toMatchObject({
        status: 'revoked',
        token_preview: `${regenerateBody.data.apiToken.slice(0, 8)}...`
      });
      expect(tokenStatus.rows[0].api_token_hash).not.toBe(regenerateBody.data.apiToken);
    } finally {
      if (siteId) {
        await pool.query('DELETE FROM site_connections WHERE id = $1', [siteId]);
      }

      await pool.end();
      await server.close();
    }
  });
});
