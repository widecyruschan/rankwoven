import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createWordPressAdapter } from '@aieo/cms-adapters';
import { processNextQueuedTask } from '../src/index';

const allowPublicTestUrl = async (url: string) => ({
  url: new URL(url),
  resolvedAddresses: [{ address: '93.184.216.34', family: 4 }]
});

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

    const task = await processNextQueuedTask(pool as never, fetchImpl, allowPublicTestUrl);

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

  it('syncs Breakout gateway models through the phase 2 task queue', async () => {
    const previousKey = process.env.WENWEN_API_KEY;
    const previousBaseUrl = process.env.WENWEN_API_BASE_URL;
    process.env.WENWEN_API_KEY = 'test-gateway-key';
    process.env.WENWEN_API_BASE_URL = 'https://gateway.test';
    const queries: string[] = [];
    const client = {
      async query(sql: string) {
        queries.push(sql);
        if (sql.includes('FROM phase2_tasks')) {
          return {
            rows: [{
              id: '00000000-0000-4000-8000-000000000304',
              workspace_id: '00000000-0000-4000-8000-000000000001',
              kind: 'gateway_model_sync',
              retry_count: 0,
              max_retries: 3
            }]
          };
        }
        return { rows: [] };
      },
      release: vi.fn()
    };
    const pool = { connect: vi.fn(async () => client) };
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [{ id: 'gateway-text', owned_by: 'gateway', capabilities: ['chat'] }] })
    })) as unknown as typeof fetch;

    try {
      const task = await processNextQueuedTask(pool as never, fetchImpl, allowPublicTestUrl);
      expect(task).toMatchObject({ id: '00000000-0000-4000-8000-000000000304', kind: 'gateway_model_sync' });
      expect(fetchImpl).toHaveBeenCalledWith(
        'https://gateway.test/v1/models',
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-gateway-key' }) })
      );
      expect(queries.some((query) => query.includes('INSERT INTO gateway_model_catalog'))).toBe(true);
      expect(queries.some((query) => query.includes('INSERT INTO task_attempts'))).toBe(true);
      expect(queries.some((query) => query.includes("status = 'completed'"))).toBe(true);
    } finally {
      if (previousKey === undefined) delete process.env.WENWEN_API_KEY;
      else process.env.WENWEN_API_KEY = previousKey;
      if (previousBaseUrl === undefined) delete process.env.WENWEN_API_BASE_URL;
      else process.env.WENWEN_API_BASE_URL = previousBaseUrl;
    }
  });

  it('consumes a keyword research task and materializes provider metrics and competitor gaps', async () => {
    const previousProvider = process.env.KEYWORD_VOLUME_PROVIDER;
    const previousUrl = process.env.KEYWORD_VOLUME_API_URL;
    const previousKey = process.env.KEYWORD_VOLUME_API_KEY;
    process.env.KEYWORD_VOLUME_PROVIDER = 'dataforseo';
    process.env.KEYWORD_VOLUME_API_URL = 'https://dataforseo.test';
    process.env.KEYWORD_VOLUME_API_KEY = 'fixture-key';
    const queries: string[] = [];
    let candidateSequence = 0;
    const client = {
      async query(sql: string) {
        queries.push(sql);
        if (sql.includes('FROM phase2_tasks task')) {
          return {
            rows: [{
              id: '00000000-0000-4000-8000-000000000306',
              workspace_id: '00000000-0000-4000-8000-000000000001',
              kind: 'keyword_research',
              retry_count: 0,
              max_retries: 3,
              provider_key: 'dataforseo',
              request_id: 'request-306',
              project_id: '00000000-0000-4000-8000-000000000406',
              run_id: '00000000-0000-4000-8000-000000000506',
              reservation_id: '00000000-0000-4000-8000-000000000606',
              seed_keywords: ['yoga mat'],
              own_domain: null,
              competitor_domains: ['competitor.example'],
              market: 'US',
              language: 'en',
              device: 'desktop',
              engine: 'google',
              locale: 'en-US'
            }]
          };
        }
        if (sql.includes('INSERT INTO keyword_candidates')) {
          candidateSequence += 1;
          return { rows: [{ id: `00000000-0000-4000-8000-0000000004${String(candidateSequence).padStart(2, '0')}` }] };
        }
        if (sql.includes('INSERT INTO competitor_domains')) {
          return { rows: [{ id: '00000000-0000-4000-8000-000000000706' }] };
        }
        if (sql.includes('SELECT status FROM phase2_tasks')) return { rows: [{}] };
        return { rows: [] };
      },
      release: vi.fn()
    };
    const pool = { connect: vi.fn(async () => client) };
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('ranked_keywords')) {
        return new Response(JSON.stringify({ tasks: [{ result: [{ keyword: 'best yoga mat', rank_absolute: 6, url: 'https://competitor.example/best-yoga-mat', etv: 42, serp_features: [] }] }] }), { status: 200 });
      }
      return new Response(JSON.stringify({ tasks: [{ result: [{ keyword: 'yoga mat', search_volume: 1_000, cpc: 1.5, competition: 0.3, keyword_difficulty: 35 }] }] }), { status: 200 });
    }) as unknown as typeof fetch;

    try {
      const task = await processNextQueuedTask(pool as never, fetchImpl, allowPublicTestUrl, undefined, 'worker-306');
      expect(task).toMatchObject({ id: '00000000-0000-4000-8000-000000000306', kind: 'keyword_research' });
      const fetchUrls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((call) => String(call[0]));
      expect(fetchUrls.length).toBeGreaterThanOrEqual(2);
      expect(fetchUrls.some((url) => url.includes('ranked_keywords') || url.includes('dataforseo.test'))).toBe(true);
      const queryLog = queries.join('\n').toLowerCase();
      expect(queryLog).toContain('keyword_metrics');
      expect(queryLog).toContain('keyword_observations');
      expect(queryLog).toContain('keyword_gap_snapshots');
      expect(queries.some((query) => query.includes("status = 'completed'"))).toBe(true);
    } finally {
      if (previousProvider === undefined) delete process.env.KEYWORD_VOLUME_PROVIDER;
      else process.env.KEYWORD_VOLUME_PROVIDER = previousProvider;
      if (previousUrl === undefined) delete process.env.KEYWORD_VOLUME_API_URL;
      else process.env.KEYWORD_VOLUME_API_URL = previousUrl;
      if (previousKey === undefined) delete process.env.KEYWORD_VOLUME_API_KEY;
      else process.env.KEYWORD_VOLUME_API_KEY = previousKey;
    }
  });

  it('appends internal link suggestions without replacing builder content', async () => {
    const suggestionValue = JSON.stringify({
      format: 'rankwoven-internal-links-v1',
      intro: '建議在內容最後加入以下相關閱讀連結。',
      links: [
        {
          targetCmsId: '202',
          targetTitle: 'Related SEO Guide',
          targetUrl: 'http://wordpress.test/related-seo-guide/',
          anchorText: 'Related SEO Guide',
          relevance: 'high',
          reason: '共享分類，主題關聯度較高。'
        }
      ]
    });
    const queries: Array<{ sql: string; params?: unknown[] }> = [];
    let appliedContentHtml = '';
    const client = {
      async query(sql: string, params?: unknown[]) {
        queries.push({ sql, params });

        if (sql.includes('FROM sync_tasks st')) {
          return {
            rows: [
              {
                id: '00000000-0000-4000-8000-000000000303',
                site_id: '00000000-0000-4000-8000-000000000203',
                scope: 'suggestion_apply',
                target_cms_id: '101',
                suggestion_id: '00000000-0000-4000-8000-000000000403',
                apply_snapshot_id: '00000000-0000-4000-8000-000000000503',
                retry_count: 0,
                max_retries: 3,
                site_url: 'http://wordpress.test',
                wordpress_admin_username: 'admin',
                wordpress_application_password_encrypted: encryptCredential('abcd efgh ijkl mnop')
              }
            ]
          };
        }

        if (sql.includes('FROM optimization_suggestions')) {
          return {
            rows: [
              {
                id: '00000000-0000-4000-8000-000000000403',
                site_id: '00000000-0000-4000-8000-000000000203',
                target_type: 'article',
                target_cms_id: '101',
                suggestion_type: 'internal_link',
                field_name: 'contentHtml',
                status: 'approved',
                current_value: '0',
                suggested_value: suggestionValue
              }
            ]
          };
        }

        if (sql.includes('SELECT before_value')) {
          return { rows: [{ before_value: '[vc_row][vc_column]Original[/vc_column][/vc_row]' }] };
        }

        return { rows: [] };
      },
      release: vi.fn()
    };
    const pool = {
      connect: vi.fn(async () => client)
    };
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/wp-json/rankwoven/v1/posts/101') && init?.method !== 'POST') {
        return {
          ok: true,
          json: async () => ({
            article: {
              cmsId: '101',
              contentHtml: '[vc_row][vc_column]Original[/vc_column][/vc_row]'
            }
          })
        };
      }

      if (url.endsWith('/wp-json/rankwoven/v1/posts/101/apply')) {
        appliedContentHtml = JSON.parse(String(init?.body ?? '{}')).contentHtml;
        return {
          ok: true,
          json: async () => ({ success: true })
        };
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    }) as unknown as typeof fetch;

    const task = await processNextQueuedTask(pool as never, fetchImpl, allowPublicTestUrl);

    expect(task).toMatchObject({
      id: '00000000-0000-4000-8000-000000000303',
      scope: 'suggestion_apply',
      targetCmsId: '101'
    });
    expect(appliedContentHtml).toContain('[vc_row][vc_column]Original[/vc_column][/vc_row]');
    expect(appliedContentHtml).toContain('<div class="rankwoven-related-links">');
    expect(appliedContentHtml).toContain('<a href="http://wordpress.test/related-seo-guide/">Related SEO Guide</a>');
    expect(appliedContentHtml).not.toBe(suggestionValue);
    expect(queries.some((query) => query.sql.includes("SET status = 'applied'"))).toBe(true);
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

    const task = await processNextQueuedTask(pool as never, fetchImpl, allowPublicTestUrl);

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

  it('does not request a rejected Worker target URL', async () => {
    const queries: Array<{ sql: string; params?: unknown[] }> = [];
    const client = {
      async query(sql: string, params?: unknown[]) {
        queries.push({ sql, params });
        if (sql.includes('FROM sync_tasks st')) {
          return {
            rows: [{
              id: '00000000-0000-4000-8000-000000000305',
              site_id: '00000000-0000-4000-8000-000000000205',
              scope: 'article',
              target_cms_id: '101',
              retry_count: 0,
              max_retries: 3,
              site_url: 'http://127.0.0.1',
              wordpress_admin_username: 'admin',
              wordpress_application_password_encrypted: encryptCredential('abcd efgh ijkl mnop')
            }]
          };
        }
        return { rows: [] };
      },
      release: vi.fn()
    };
    const pool = { connect: vi.fn(async () => client) };
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const rejectTarget = async () => {
      throw new Error('UNSAFE_TARGET_URL');
    };

    await processNextQueuedTask(pool as never, fetchImpl, rejectTarget);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(queries.some((query) => query.params?.[3] === 'UNSAFE_TARGET_URL')).toBe(true);
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
