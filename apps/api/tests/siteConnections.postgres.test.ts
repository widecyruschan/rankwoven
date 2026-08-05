import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';
import { createServer } from '../src/server';
import { PostgresSeoOptimizationRepository } from '../src/seoOptimization';
import { createPostgresSiteConnectionRepository } from '../src/siteConnections';

const postgresTestDatabaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const shouldRunPostgresTests = process.env.RUN_POSTGRES_TESTS === '1' && postgresTestDatabaseUrl;
const describePostgres = shouldRunPostgresTests ? describe : describe.skip;

describePostgres('database migrations', () => {
  it('allows all media suggestion types after expanding the constraint', async () => {
    const pool = new Pool({ connectionString: postgresTestDatabaseUrl as string });
    const client = await pool.connect();
    const schemaName = `migration_test_${crypto.randomUUID().replaceAll('-', '')}`;
    const migrationSql = await readFile(
      new URL('../../../db/migrations/0007_expand_media_suggestion_types.sql', import.meta.url),
      'utf8'
    );

    try {
      await client.query(`CREATE SCHEMA "${schemaName}"`);
      await client.query(`SET search_path TO "${schemaName}"`);
      await client.query(`
        CREATE TABLE optimization_suggestions (
          suggestion_type text NOT NULL CONSTRAINT optimization_suggestions_suggestion_type_check CHECK (
            suggestion_type IN ('title', 'meta_description', 'content', 'media_alt_text', 'media_file_name', 'internal_link')
          )
        )
      `);

      await client.query(migrationSql);
      await client.query(`
        INSERT INTO optimization_suggestions (suggestion_type)
        VALUES ('media_title'), ('media_caption'), ('media_description')
      `);

      const result = await client.query<{ suggestion_type: string }>(`
        SELECT suggestion_type
        FROM optimization_suggestions
        ORDER BY suggestion_type
      `);

      expect(result.rows.map((row) => row.suggestion_type)).toEqual([
        'media_caption',
        'media_description',
        'media_title'
      ]);
    } finally {
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      client.release();
      await pool.end();
    }
  });
});

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

interface LoginResponse {
  data: {
    token: string;
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

describePostgres('PostgreSQL site connection repository', () => {
  it('persists site connections, token hash, sync runs, articles, and media', async () => {
    const databaseUrl = postgresTestDatabaseUrl as string;
    const repository = createPostgresSiteConnectionRepository(databaseUrl);
    const seoOptimizationRepository = new PostgresSeoOptimizationRepository(databaseUrl);
    const server = createServer({
      siteConnectionRepository: repository,
      seoOptimizationRepository
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
          googleAnalyticsPropertyId: '123456789',
          wordpressAdminUsername: 'postgres-admin',
          wordpressApplicationPassword: 'abcd efgh ijkl mnop'
        }
      });
      const createBody = createResponse.json<CreateSiteConnectionResponse>();
      siteId = createBody.data.site.id;
      const authToken = await loginDemoUser(server);

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
            metaDescription: 'PostgreSQL stored meta description for SEO auditing.',
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
            caption: 'Stored PostgreSQL media caption.',
            description: 'Stored PostgreSQL media description for contextual SEO tests.',
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
        url: `/api/v1/site-connections/${siteId}/media?page=1&pageSize=1`,
        headers: {
          authorization: `Bearer ${createBody.data.apiToken}`
        }
      });

      expect(mediaResponse.statusCode).toBe(200);
      expect(mediaResponse.json()).toMatchObject({
        success: true,
        data: {
          media: [
            {
              cmsId: '501',
              title: 'PostgreSQL Sync Image',
              caption: 'Stored PostgreSQL media caption.',
              description: 'Stored PostgreSQL media description for contextual SEO tests.'
            }
          ],
          pagination: {
            page: 1,
            pageSize: 1,
            total: 1,
            totalPages: 1
          }
        }
      });

      const searchedArticlesResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/site-connections/${siteId}/articles?search=postgresql&status=publish`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(searchedArticlesResponse.statusCode).toBe(200);
      expect(searchedArticlesResponse.json()).toMatchObject({
        data: {
          articles: [
            {
              cmsId: '101',
              title: 'PostgreSQL Sync Article'
            }
          ],
          pagination: {
            total: 1
          }
        }
      });

      const missingAltResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/site-connections/${siteId}/media?issue=missing_alt`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(missingAltResponse.statusCode).toBe(200);
      expect(missingAltResponse.json()).toMatchObject({
        data: {
          media: [],
          pagination: {
            total: 0
          }
        }
      });

      const persisted = await pool.query(
        `
          SELECT
            sc.api_token_hash,
            sc.token_preview,
            sc.wordpress_admin_username,
            sc.wordpress_application_password_encrypted,
            sc.google_analytics_property_id,
            sc.last_token_used_at,
            MAX(sa.meta_description) AS meta_description,
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
        google_analytics_property_id: '123456789',
        article_count: 1,
        media_count: 1,
        meta_description: 'PostgreSQL stored meta description for SEO auditing.',
        sync_run_count: 2
      });
      expect(persisted.rows[0].api_token_hash).not.toBe(createBody.data.apiToken);
      expect(persisted.rows[0].wordpress_application_password_encrypted).not.toBe(
        'abcd efgh ijkl mnop'
      );
      expect(persisted.rows[0].wordpress_application_password_encrypted).toMatch(/^v1:/);
      expect(persisted.rows[0].last_token_used_at).toBeInstanceOf(Date);

      const createTaskResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${siteId}/sync-tasks`,
        headers: {
          authorization: `Bearer ${createBody.data.apiToken}`
        },
        payload: {
          syncStartedAt: '2026-07-26T03:00:00+00:00',
          updatedAfter: '2026-07-25T08:00:00+00:00'
        }
      });
      const createTaskBody = createTaskResponse.json<{
        data: {
          task: {
            id: string;
          };
        };
      }>();

      expect(createTaskResponse.statusCode).toBe(201);

      for (const batch of [
        {
          batchIndex: 1,
          articles: [
            {
              cmsId: '201',
              type: 'post',
              title: 'PostgreSQL Task Article One',
              slug: 'postgresql-task-article-one',
              status: 'publish',
              url: 'http://localhost:8088/postgresql-task-article-one/',
              updatedAt: '2026-07-26T03:10:00+00:00'
            }
          ],
          media: []
        },
        {
          batchIndex: 2,
          isFinalBatch: true,
          articles: [
            {
              cmsId: '202',
              type: 'page',
              title: 'PostgreSQL Task Article Two',
              slug: 'postgresql-task-article-two',
              status: 'publish',
              url: 'http://localhost:8088/postgresql-task-article-two/',
              updatedAt: '2026-07-26T03:20:00+00:00'
            }
          ],
          media: [
            {
              cmsId: '701',
              title: 'PostgreSQL Task Image',
              url: 'http://localhost:8088/wp-content/uploads/postgresql-task-image.jpg',
              updatedAt: '2026-07-26T03:30:00+00:00'
            }
          ]
        }
      ]) {
        const batchResponse = await server.inject({
          method: 'POST',
          url: `/api/v1/site-connections/${siteId}/sync-tasks/${createTaskBody.data.task.id}/batches`,
          headers: {
            authorization: `Bearer ${createBody.data.apiToken}`
          },
          payload: batch
        });

        expect(batchResponse.statusCode).toBe(200);
      }

      const taskStatus = await pool.query(
        `
          SELECT
            st.status,
            st.scope,
            st.updated_after,
            st.batches_received,
            st.articles_received,
            st.media_received,
            COUNT(sr.id)::int AS sync_run_count
          FROM sync_tasks st
          LEFT JOIN sync_runs sr ON sr.task_id = st.id
          WHERE st.id = $1
          GROUP BY st.id
        `,
        [createTaskBody.data.task.id]
      );

      expect(taskStatus.rows[0]).toMatchObject({
        status: 'completed',
        scope: 'incremental',
        updated_after: '2026-07-25T08:00:00+00:00',
        batches_received: 2,
        articles_received: 2,
        media_received: 1,
        sync_run_count: 2
      });

      const manualRefreshResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${siteId}/manual-refresh`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          type: 'media',
          cmsId: '701'
        }
      });
      const manualRefreshBody = manualRefreshResponse.json<{
        data: {
          task: {
            id: string;
            scope: string;
            targetCmsId: string;
          };
        };
      }>();

      expect(manualRefreshResponse.statusCode).toBe(201);
      expect(manualRefreshBody.data.task).toMatchObject({
        scope: 'media',
        targetCmsId: '701'
      });

      const persistedManualTask = await pool.query(
        `
          SELECT scope, target_cms_id, batches_received
          FROM sync_tasks
          WHERE id = $1
        `,
        [manualRefreshBody.data.task.id]
      );

      expect(persistedManualTask.rows[0]).toMatchObject({
        scope: 'media',
        target_cms_id: '701',
        batches_received: 0
      });

      const listedTasksResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/site-connections/${siteId}/sync-tasks`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(listedTasksResponse.statusCode).toBe(200);
      expect(listedTasksResponse.json()).toMatchObject({
        data: {
          tasks: expect.arrayContaining([
            expect.objectContaining({
              siteId,
              siteName: expect.stringContaining('Postgres WordPress'),
              scope: 'media',
              targetCmsId: '701'
            }),
            expect.objectContaining({
              siteId,
              scope: 'incremental',
              batchesReceived: 2,
              articlesReceived: 2,
              mediaReceived: 1
            })
          ])
        }
      });

      const auditResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${siteId}/audits`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(auditResponse.statusCode).toBe(201);
      expect(auditResponse.json()).toMatchObject({
        data: {
          audit: {
            status: 'completed'
          }
        }
      });

      const persistedSuggestions = await pool.query(
        `
          SELECT COUNT(*)::int AS suggestion_count
          FROM optimization_suggestions
          WHERE site_id = $1
        `,
        [siteId]
      );

      expect(persistedSuggestions.rows[0].suggestion_count).toBeGreaterThan(0);

      const credentialsResponse = await server.inject({
        method: 'PUT',
        url: `/api/v1/site-connections/${siteId}/wordpress-credentials`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
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
        url: `/api/v1/site-connections/${siteId}/token/regenerate`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });
      const regenerateBody = regenerateResponse.json<RegenerateTokenResponse>();

      expect(regenerateResponse.statusCode).toBe(200);
      expect(regenerateBody.data.site).toMatchObject({
        id: siteId,
        status: 'connected',
        tokenPreview: `${regenerateBody.data.apiToken.slice(0, 8)}...`
      });
      expect(regenerateBody.data.apiToken).not.toBe(createBody.data.apiToken);
      expect(regenerateBody.data.site).not.toHaveProperty('lastTokenUsedAt');

      const resetTokenUsage = await pool.query(
        `
          SELECT last_token_used_at
          FROM site_connections
          WHERE id = $1
        `,
        [siteId]
      );

      expect(resetTokenUsage.rows[0].last_token_used_at).toBeNull();

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

      const failedTokenUsage = await pool.query(
        `
          SELECT last_token_used_at
          FROM site_connections
          WHERE id = $1
        `,
        [siteId]
      );

      expect(failedTokenUsage.rows[0].last_token_used_at).toBeNull();

      const revokeResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${siteId}/token/revoke`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
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
