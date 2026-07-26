import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createWordPressAdapter } from '@aieo/cms-adapters';
import { processNextQueuedTask } from '../src/index';

describe('worker adapter wiring', () => {
  it('can load the WordPress adapter', () => {
    expect(createWordPressAdapter().getCapabilities().platform).toBe('wordpress');
  });

  it('claims a manual article refresh task and writes the fetched article snapshot', async () => {
    const queries: string[] = [];
    const client = {
      async query(sql: string) {
        queries.push(sql);

        if (sql.includes('FROM sync_tasks st')) {
          return {
            rows: [
              {
                id: '00000000-0000-4000-8000-000000000301',
                site_id: '00000000-0000-4000-8000-000000000201',
                scope: 'article',
                target_cms_id: '101',
                retry_count: 0,
                max_retries: 3,
                site_url: 'http://wordpress.test',
                wordpress_admin_username: 'admin',
                wordpress_application_password_encrypted: encryptCredential('abcd efgh ijkl mnop')
              }
            ]
          };
        }

        return { rows: [] };
      },
      release: vi.fn()
    };
    const pool = {
      connect: vi.fn(async () => client)
    };
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        article: {
          cmsId: '101',
          type: 'post',
          title: 'Worker Refreshed Article',
          slug: 'worker-refreshed-article',
          status: 'publish',
          url: 'http://wordpress.test/worker-refreshed-article/',
          contentHtml: '<h1>Worker Refreshed Article</h1>',
          updatedAt: '2026-07-26T09:00:00+00:00'
        }
      })
    })) as unknown as typeof fetch;

    const task = await processNextQueuedTask(pool as never, fetchImpl);

    expect(task).toMatchObject({
      id: '00000000-0000-4000-8000-000000000301',
      scope: 'article',
      targetCmsId: '101'
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://wordpress.test/wp-json/rankwoven/v1/posts/101',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /)
        })
      })
    );
    expect(queries.some((query) => query.includes('INSERT INTO synced_articles'))).toBe(true);
    expect(queries.some((query) => query.includes("SET status = 'completed'"))).toBe(true);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('requeues failed tasks with retry metadata before dead-lettering', async () => {
    const queries: Array<{ sql: string; params?: unknown[] }> = [];
    const client = {
      async query(sql: string, params?: unknown[]) {
        queries.push({ sql, params });

        if (sql.includes('FROM sync_tasks st')) {
          return {
            rows: [
              {
                id: '00000000-0000-4000-8000-000000000302',
                site_id: '00000000-0000-4000-8000-000000000202',
                scope: 'article',
                target_cms_id: '102',
                retry_count: 0,
                max_retries: 3,
                site_url: 'http://wordpress.test',
                wordpress_admin_username: 'admin',
                wordpress_application_password_encrypted: encryptCredential('abcd efgh ijkl mnop')
              }
            ]
          };
        }

        return { rows: [] };
      },
      release: vi.fn()
    };
    const pool = {
      connect: vi.fn(async () => client)
    };
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({})
    })) as unknown as typeof fetch;

    const task = await processNextQueuedTask(pool as never, fetchImpl);

    expect(task).toMatchObject({
      id: '00000000-0000-4000-8000-000000000302',
      scope: 'article'
    });
    expect(
      queries.some(
        (query) =>
          query.sql.includes('retry_count = $3') &&
          query.params?.[1] === 'queued' &&
          query.params?.[2] === 1 &&
          query.params?.[3] === 'WORDPRESS_REST_503'
      )
    ).toBe(true);
  });
});

function encryptCredential(value: string) {
  const key = createHash('sha256').update('rankwoven-local-development-key').digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url')
  ].join(':');
}
