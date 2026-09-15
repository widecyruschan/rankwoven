import { describe, expect, it } from 'vitest';
import { fetchAhrefsSiteAuditIssuePages, fetchAhrefsSiteAuditReport } from '../src/ahrefsSiteAudit';
import { createServer } from '../src/server';
import { createInMemorySeoOptimizationRepository } from '../src/seoOptimization';
import { createInMemorySiteConnectionRepository } from '../src/siteConnections';

describe('Ahrefs Site Audit provider', () => {
  it('requests the configured project crawl and normalizes issue metadata', async () => {
    const report = await fetchAhrefsSiteAuditReport({
      apiUrl: 'https://api.ahrefs.com/v3/site-audit/issues',
      apiKey: 'test-ahrefs-key',
      projectId: '10160561',
      crawlDate: '2026-09-13T07:03:02Z',
      comparisonDate: '2026-09-08T14:16:49Z',
      fetchImpl: async (url, init) => {
        const requestUrl = new URL(String(url));
        expect(requestUrl.pathname).toBe('/v3/site-audit/issues');
        expect(requestUrl.searchParams.get('project_id')).toBe('10160561');
        expect(requestUrl.searchParams.get('date')).toBe('2026-09-13T07:03:02Z');
        expect(requestUrl.searchParams.get('date_compared')).toBe('2026-09-08T14:16:49Z');
        expect(init?.headers).toMatchObject({ Authorization: 'Bearer test-ahrefs-key' });
        return new Response(JSON.stringify({
          health_score: 92,
          crawled_urls: 1332,
          issues: [
            {
              issue_id: 'canonical-redirect',
              issue: 'Canonical points to redirect',
              severity: 'error',
              affected_pages: 1,
              change: -584
            },
            {
              issue_id: 'meta-too-short',
              issue: 'Meta description too short',
              severity: 'warning',
              affected_pages: 430,
              change: 429
            }
          ]
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
    });

    expect(report).toMatchObject({
      projectId: '10160561',
      healthScore: 92,
      crawledUrls: 1332,
      issues: [
        {
          id: 'canonical-redirect',
          severity: 'error',
          category: 'indexability',
          affectedPages: 1,
          change: -584
        },
        {
          id: 'meta-too-short',
          severity: 'warning',
          category: 'content',
          affectedPages: 430,
          change: 429
        }
      ]
    });
    expect(report.issues[0]?.recommendation).toContain('canonical');
  });

  it('does not convert an Ahrefs provider error into an invented audit report', async () => {
    await expect(fetchAhrefsSiteAuditReport({
      apiUrl: 'https://api.ahrefs.com/v3/site-audit/issues',
      apiKey: 'test-ahrefs-key',
      projectId: '10160561',
      fetchImpl: async () => new Response('{}', { status: 429 })
    })).rejects.toThrow('AHREFS_SITE_AUDIT_HTTP_429');
  });

  it('reads the official crawled field and loads issue URLs through page explorer', async () => {
    let issuePageRequest: URL | undefined;
    const report = await fetchAhrefsSiteAuditReport({
      apiUrl: 'https://api.ahrefs.com/v3/site-audit/issues',
      apiKey: 'test-ahrefs-key',
      projectId: '10160558',
      fetchImpl: async (url) => {
        const requestUrl = new URL(String(url));
        if (requestUrl.pathname.endsWith('/issues')) {
          return new Response(JSON.stringify({
            issues: [{ issue_id: 'meta-too-short', name: 'Meta description too short', importance: 'Warning', crawled: 430, change: 429 }]
          }), { status: 200 });
        }
        if (requestUrl.pathname.endsWith('/projects')) {
          return new Response(JSON.stringify({ projects: [{ project_id: '10160558', health_score: 0.8, crawled: 585 }] }), { status: 200 });
        }
        issuePageRequest = requestUrl;
        return new Response(JSON.stringify({ pages: [{ url: 'https://example.com/a' }, { url: 'https://example.com/b' }] }), { status: 200 });
      }
    });

    expect(report).toMatchObject({ healthScore: 80, crawledUrls: 585, issues: [{ affectedPages: 430 }] });

    const pages = await fetchAhrefsSiteAuditIssuePages({
      apiUrl: 'https://api.ahrefs.com/v3/site-audit/issues',
      apiKey: 'test-ahrefs-key',
      projectId: '10160558',
      issueId: 'meta-too-short',
      offset: 100,
      limit: 2,
      fetchImpl: async (url) => {
        issuePageRequest = new URL(String(url));
        return new Response(JSON.stringify({ pages: [{ url: 'https://example.com/a' }, { url: 'https://example.com/b' }] }), { status: 200 });
      }
    });

    expect(issuePageRequest?.pathname).toBe('/v3/site-audit/page-explorer');
    expect(issuePageRequest?.searchParams.get('issue_id')).toBe('meta-too-short');
    expect(issuePageRequest?.searchParams.get('select')).toBe('url');
    expect(issuePageRequest?.searchParams.get('offset')).toBe('100');
    expect(pages).toEqual({ issueId: 'meta-too-short', urls: ['https://example.com/a', 'https://example.com/b'], offset: 100, limit: 2, hasMore: true });
  });

  it('stores Ahrefs project configuration per connected site', async () => {
    const siteRepository = createInMemorySiteConnectionRepository();
    const seoRepository = createInMemorySeoOptimizationRepository();
    const { site } = await siteRepository.create({
      platform: 'wordpress',
      name: 'Project site',
      siteUrl: 'https://example.com'
    });
    const server = createServer({ siteConnectionRepository: siteRepository, seoOptimizationRepository: seoRepository });
    const login = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'demo@rankwoven.com', password: 'rankwoven' }
    });
    const authorization = `Bearer ${login.json<{ data: { token: string } }>().data.token}`;
    const payload = {
      enabled: true,
      projectId: '10160561',
      crawlDate: '2026-09-13T07:03:02Z',
      comparisonDate: '2026-09-08T14:16:49Z'
    };
    const saved = await server.inject({
      method: 'PUT',
      url: `/api/v1/site-connections/${site.id}/ahrefs-site-audit/config`,
      headers: { authorization },
      payload
    });
    const loaded = await server.inject({
      method: 'GET',
      url: `/api/v1/site-connections/${site.id}/ahrefs-site-audit/config`,
      headers: { authorization }
    });
    expect(saved.statusCode).toBe(200);
    expect(loaded.json()).toMatchObject({ success: true, data: { config: payload } });
    await server.close();
  });
});
