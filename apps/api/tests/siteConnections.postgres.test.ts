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
          pluginVersion: '0.1.0'
        }
      });
      const createBody = createResponse.json<CreateSiteConnectionResponse>();
      siteId = createBody.data.site.id;

      expect(createResponse.statusCode).toBe(201);
      expect(createBody.data.apiToken).toMatch(/^rw_[a-f0-9]{32}$/);

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
        article_count: 1,
        media_count: 1,
        sync_run_count: 2
      });
      expect(persisted.rows[0].api_token_hash).not.toBe(createBody.data.apiToken);
    } finally {
      if (siteId) {
        await pool.query('DELETE FROM site_connections WHERE id = $1', [siteId]);
      }

      await pool.end();
      await server.close();
    }
  });
});
