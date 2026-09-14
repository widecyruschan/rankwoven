import { describe, expect, it } from 'vitest';
import {
  createInMemorySiteAuditMonitoringRepository,
  createIssueFingerprint,
  analyzeAuditPageGraph,
  crawlConnectedPage,
  crawlConnectedSite,
  processDueMonitorConfigs,
  recordMonitorEvent,
  deriveRecheckDisposition,
  fetchCruxFieldData
} from '../src/siteAuditMonitoring';
import { createInMemorySiteConnectionRepository } from '../src/siteConnections';
import { createServer } from '../src/server';

describe('site audit monitoring domain', () => {
  it('creates stable fingerprints for equivalent URLs', () => {
    const first = createIssueFingerprint({ category: 'meta_tags', url: 'https://Example.com/page/#section', title: 'Missing title' });
    const second = createIssueFingerprint({ category: 'meta_tags', url: 'https://example.com/page', title: 'Missing title' });
    expect(first).toBe(second);
  });

  it('derives fixed, persisting, regressed and partial dispositions', () => {
    expect(deriveRecheckDisposition('open', false)).toBe('fixed');
    expect(deriveRecheckDisposition('open', true)).toBe('persisting');
    expect(deriveRecheckDisposition('fixed', true)).toBe('regressed');
    expect(deriveRecheckDisposition('open', false, true)).toBe('partial');
  });

  it('detects canonical, dead-link, schema and orphan issues deterministically', () => {
    const findings = analyzeAuditPageGraph([
      { url: 'https://example.com/', httpStatus: 200, canonicalUrl: 'https://example.com/', hasSchema: true, internalLinks: ['https://example.com/article'] },
      { url: 'https://example.com/article', httpStatus: 404, hasSchema: false, internalLinks: [] },
      { url: 'https://example.com/orphan', httpStatus: 200, canonicalUrl: 'https://example.com/orphan', hasSchema: true, internalLinks: [] }
    ], 'https://example.com/');
    expect(findings.map((finding) => finding.title)).toEqual(expect.arrayContaining(['發現失效頁面或死鏈', '頁面缺少 canonical', '頁面缺少結構化資料', '發現孤島頁面']));
  });

  it('crawls robots and sitemap URLs without persisting page bodies', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith('/robots.txt')) {
        return new Response('User-agent: *\nSitemap: https://example.com/sitemap.xml', { status: 200, headers: { 'content-type': 'text/plain' } });
      }
      if (url.endsWith('/sitemap.xml')) {
        return new Response('<urlset><url><loc>https://example.com/sitemap-page</loc></url></urlset>', { status: 200, headers: { 'content-type': 'application/xml' } });
      }
      if (url.endsWith('/sitemap-page')) {
        return new Response('<html><head><title>Mapped</title><link rel="canonical" href="https://example.com/sitemap-page"></head><body></body></html>', { status: 200, headers: { 'content-type': 'text/html' } });
      }
      return new Response('<html><head><title>Home</title><link rel="canonical" href="https://example.com/"><script type="application/ld+json">{}</script></head><body><a href="/article">Article</a></body></html>', { status: 200, headers: { 'content-type': 'text/html' } });
    };
    const result = await crawlConnectedSite('https://example.com', 3, fetchImpl);
    expect(result.pages).toHaveLength(3);
    expect(result.pages[0]).toMatchObject({ title: 'Home', hasSchema: true, crawlStatus: 'ok' });
    expect(result.pages[0]?.internalLinks).toContain('https://example.com/article');
  });

  it('analyzes one connected-site page without creating an orphan-page finding', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith('/robots.txt')) {
        return new Response('User-agent: *', { status: 200, headers: { 'content-type': 'text/plain' } });
      }
      return new Response(
        '<html><head><title>Product guide for durable yoga mats</title><meta name="description" content="Choose a durable yoga mat with practical material, grip, and care guidance for everyday practice."><link rel="canonical" href="https://example.com/products/yoga-mat"><script type="application/ld+json">{}</script></head><body><h1>Durable yoga mat guide</h1><p>Useful product guidance.</p></body></html>',
        { status: 200, headers: { 'content-type': 'text/html' } }
      );
    };
    const result = await crawlConnectedPage('https://example.com', 'https://example.com/products/yoga-mat', fetchImpl);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]).toMatchObject({
      url: 'https://example.com/products/yoga-mat',
      h1Count: 1,
      hasSchema: true,
      crawlStatus: 'ok'
    });
    expect(result.pages[0]?.metaDescription).toContain('durable yoga mat');
    const findings = analyzeAuditPageGraph(result.pages, 'https://example.com', { includeOrphanCheck: false });
    expect(findings.some((finding) => finding.title === '發現孤島頁面')).toBe(false);
  });

  it('rejects a manual page outside the connected site origin', async () => {
    await expect(
      crawlConnectedPage('https://example.com', 'https://example.org/products/yoga-mat')
    ).rejects.toThrow('AUDIT_TARGET_OUTSIDE_SITE');
  });

  it('stops a manual page crawl when a redirect leaves the connected site', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith('/robots.txt')) {
        return new Response('User-agent: *', { status: 200, headers: { 'content-type': 'text/plain' } });
      }
      return new Response('', { status: 302, headers: { location: 'https://example.org/redirected' } });
    };
    const result = await crawlConnectedPage('https://example.com', 'https://example.com/products/yoga-mat', fetchImpl);
    expect(result.pages[0]).toMatchObject({ crawlStatus: 'failed', errorCode: 'AUDIT_REDIRECT_OUTSIDE_SITE' });
    expect(result.partialReasons).toContain('AUDIT_REDIRECT_OUTSIDE_SITE');
  });

  it('deduplicates monitor events and isolates workspaces', async () => {
    const repository = createInMemorySiteAuditMonitoringRepository();
    const input = {
      workspaceId: 'workspace-a', siteId: 'site-a', configId: 'config-a', runId: 'run-a',
      fingerprint: 'fingerprint-a', eventType: 'rank_drop', severity: 'warning' as const,
      sourceType: 'deterministic_check', metadata: {}
    };
    const first = await repository.saveMonitorEvent(input);
    const second = await repository.saveMonitorEvent(input);
    expect(second.id).toBe(first.id);
    expect((await repository.listMonitorEvents('workspace-a', undefined, 1, 20)).total).toBe(1);
    expect((await repository.listMonitorEvents('workspace-b', undefined, 1, 20)).total).toBe(0);
  });

  it('queues an in-app alert only for actionable monitor events', async () => {
    const repository = createInMemorySiteAuditMonitoringRepository();
    await recordMonitorEvent(repository, {
      workspaceId: 'workspace-a', siteId: 'site-a', configId: 'config-a', runId: 'run-a',
      eventType: 'technical_audit_score', severity: 'warning', sourceType: 'deterministic_check', metadata: {}
    });
    expect((await repository.listAlerts('workspace-a', 1, 20)).total).toBe(1);
  });

  it('samples technical monitors and alerts only on a threshold breach outside the quiet period', async () => {
    const audits = new Map();
    const repository = createInMemorySiteAuditMonitoringRepository(audits);
    const monitor = await repository.createMonitor({
      workspaceId: 'workspace-a', siteId: 'site-a', kind: 'technical', frequency: 'daily',
      timezone: 'UTC', threshold: 5, status: 'active', quietPeriodMinutes: 0
    });
    repository.registerAudit({ id: 'audit-1', siteId: 'site-a', status: 'completed', overallScore: 90, pagesCrawled: 1, pagesIndexed: 0, serpapiCreditsUsed: 0, createdAt: '2026-01-01T00:00:00.000Z' });
    await processDueMonitorConfigs(repository, '2026-01-01T00:00:00.000Z');
    repository.registerAudit({ id: 'audit-2', siteId: 'site-a', status: 'completed', overallScore: 80, pagesCrawled: 1, pagesIndexed: 0, serpapiCreditsUsed: 0, createdAt: '2026-01-02T00:00:00.000Z' });
    await processDueMonitorConfigs(repository, '2026-01-02T00:01:00.000Z');
    const events = await repository.listMonitorEvents('workspace-a', 'site-a', 1, 20);
    expect(events.items).toHaveLength(2);
    expect(events.items.find((event) => event.severity === 'warning')).toMatchObject({ configId: monitor.id, severity: 'warning', delta: -10 });
  });

  it('reports CrUX as unavailable when no API key is configured', async () => {
    const result = await fetchCruxFieldData('https://example.com', { apiKey: '' });
    expect(result.status).toBe('unavailable');
    expect(result.errorCode).toBe('CRUX_NOT_CONFIGURED');
  });

  it('requires idempotency keys for PH2-10 writes', async () => {
    const siteRepository = createInMemorySiteConnectionRepository();
    const { site } = await siteRepository.create({ platform: 'wordpress', name: 'Demo', siteUrl: 'https://example.com' });
    const server = createServer({ siteConnectionRepository: siteRepository });
    const login = await server.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'demo@rankwoven.com', password: 'rankwoven' } });
    const token = login.json<{ data: { token: string } }>().data.token;
    const response = await server.inject({ method: 'POST', url: '/api/v1/monitors', headers: { authorization: `Bearer ${token}` }, payload: { siteId: site.id, kind: 'technical' } });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    await server.close();
  });

  it('requires one manual audit target and rejects non-article synced content', async () => {
    const siteRepository = createInMemorySiteConnectionRepository();
    const { site } = await siteRepository.create({ platform: 'wordpress', name: 'Demo', siteUrl: 'https://example.com' });
    await siteRepository.saveSync(site.id, {
      articles: [{
        cmsId: 'page-1', type: 'page', title: 'About', slug: 'about', status: 'publish',
        url: 'https://example.com/about', categories: [], tags: [], updatedAt: '2026-09-15T00:00:00.000Z'
      }],
      media: []
    });
    const server = createServer({ siteConnectionRepository: siteRepository });
    const login = await server.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'demo@rankwoven.com', password: 'rankwoven' } });
    const authorization = `Bearer ${login.json<{ data: { token: string } }>().data.token}`;
    const missingTarget = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${site.id}/site-audit/manual-runs`,
      headers: { authorization, 'idempotency-key': 'manual-audit-missing-target' },
      payload: {}
    });
    const unsupportedContent = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${site.id}/site-audit/manual-runs`,
      headers: { authorization, 'idempotency-key': 'manual-audit-page-content' },
      payload: { contentCmsId: 'page-1' }
    });
    expect(missingTarget.statusCode).toBe(400);
    expect(unsupportedContent.statusCode).toBe(422);
    expect(unsupportedContent.json().error.code).toBe('CONTENT_TYPE_NOT_SUPPORTED');
    await server.close();
  });

  it('creates manual sites as read-only and upgrades the same URL when a plugin connects', async () => {
    const siteRepository = createInMemorySiteConnectionRepository();
    const server = createServer({ siteConnectionRepository: siteRepository });
    const login = await server.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'demo@rankwoven.com', password: 'rankwoven' } });
    const authorization = `Bearer ${login.json<{ data: { token: string } }>().data.token}`;
    const manual = await server.inject({
      method: 'POST',
      url: '/api/v1/site-connections/manual',
      headers: { authorization },
      payload: { siteUrl: 'https://example.com', name: 'Example manual site' }
    });
    const manualSite = manual.json<{ data: { site: { id: string; platform: string; connectionMode: string; canWriteBack: boolean } } }>().data.site;
    expect(manual.statusCode).toBe(201);
    expect(manualSite).toMatchObject({ platform: 'manual', connectionMode: 'manual', canWriteBack: false });

    const suggestion = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${manualSite.id}/suggestions`,
      headers: { authorization },
      payload: {
        targetType: 'article', targetCmsId: 'manual-page', suggestionType: 'title', fieldName: 'title',
        currentValue: 'Original title', suggestedValue: 'Suggested manual title'
      }
    });
    const suggestionId = suggestion.json<{ data: { suggestion: { id: string } } }>().data.suggestion.id;
    await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${manualSite.id}/suggestions/${suggestionId}/approve`,
      headers: { authorization }
    });
    const apply = await server.inject({
      method: 'POST',
      url: `/api/v1/site-connections/${manualSite.id}/suggestions/${suggestionId}/apply`,
      headers: { authorization }
    });
    expect(apply.statusCode).toBe(403);
    expect(apply.json().error.code).toBe('CMS_WRITEBACK_NOT_AVAILABLE');

    const plugin = await server.inject({
      method: 'POST',
      url: '/api/v1/site-connections',
      headers: { authorization },
      payload: { platform: 'wordpress', connectionMode: 'plugin', siteUrl: 'https://example.com', name: 'Example plugin site' }
    });
    const pluginSite = plugin.json<{ data: { site: { id: string; platform: string; connectionMode: string } } }>().data.site;
    const sites = await server.inject({ method: 'GET', url: '/api/v1/site-connections', headers: { authorization } });
    expect(plugin.statusCode).toBe(201);
    expect(pluginSite).toMatchObject({ id: manualSite.id, platform: 'wordpress', connectionMode: 'plugin' });
    expect(sites.json<{ data: { sites: unknown[] } }>().data.sites).toHaveLength(1);
    await server.close();
  });

  it('replays monitor creation with the same idempotency key', async () => {
    const siteRepository = createInMemorySiteConnectionRepository();
    const { site } = await siteRepository.create({ platform: 'wordpress', name: 'Demo', siteUrl: 'https://example.com' });
    const server = createServer({ siteConnectionRepository: siteRepository });
    const login = await server.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'demo@rankwoven.com', password: 'rankwoven' } });
    const headers = { authorization: `Bearer ${login.json<{ data: { token: string } }>().data.token}`, 'idempotency-key': 'monitor-create-001' };
    const payload = { siteId: site.id, kind: 'technical' };
    const first = await server.inject({ method: 'POST', url: '/api/v1/monitors', headers, payload });
    const replay = await server.inject({ method: 'POST', url: '/api/v1/monitors', headers, payload });
    expect(first.statusCode).toBe(201);
    expect(replay.statusCode).toBe(201);
    expect(replay.json()).toEqual(first.json());
    const monitors = await server.inject({ method: 'GET', url: '/api/v1/monitors', headers: { authorization: headers.authorization } });
    expect(monitors.json<{ data: { monitors: unknown[] } }>().data.monitors).toHaveLength(1);
    await server.close();
  });
});
