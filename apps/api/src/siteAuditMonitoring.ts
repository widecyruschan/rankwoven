import { createHash, randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Pool, type QueryResultRow } from 'pg';
import { z } from 'zod';
import { UnsafeTargetUrlError, fetchValidatedPublicUrl, validatePublicUrl, validateRedirectTarget, type ValidatedPublicUrl } from '@aieo/security';
import type { ApiResponse, TaskGovernance, Phase2Repository } from '@aieo/ai-providers';
import { requireAuth, type AuthService, type AuthUser } from './auth';
import type { SiteConnectionRepository } from './siteConnections';
import { apiConfig } from './config';
import { createLighthouseService } from './lighthouse';
import {
  type SiteAuditRepository,
  type SiteAuditIssueData,
  type SiteAuditResult
} from './siteAudit';
import {
  createRequestContext,
  getRouteKey,
  readIdempotency,
  sendIdempotencyError
} from './phase2Routes';

export type AuditFindingStatus = 'open' | 'ignored' | 'fixed' | 'persisting' | 'regressed' | 'partial';
export type AuditDisposition = 'fixed' | 'persisting' | 'regressed' | 'partial';
export type MonitorKind = 'competitor' | 'ai_visibility' | 'technical';
export type MonitorFrequency = 'daily' | 'weekly' | 'monthly';

export interface AuditPageRecord {
  id: string;
  workspaceId: string;
  siteId: string;
  auditId: string;
  url: string;
  normalizedUrl: string;
  httpStatus?: number;
  contentType?: string;
  title?: string;
  canonicalUrl?: string;
  robotsIndexable?: boolean;
  hasSchema?: boolean;
  internalLinksCount: number;
  externalLinksCount: number;
  crawlStatus: 'ok' | 'timeout' | 'blocked' | 'failed';
  errorCode?: string;
  createdAt: string;
}

export interface AuditFindingRecord {
  id: string;
  workspaceId: string;
  siteId: string;
  auditId: string;
  pageId?: string;
  fingerprint: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  recommendation?: string;
  ruleVersion: string;
  status: AuditFindingStatus;
  ignoredReason?: string;
  ignoredUntil?: string;
  ignoredBy?: string;
  remediationTaskId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditRecheckRecord {
  id: string;
  workspaceId: string;
  siteId: string;
  findingId: string;
  auditId?: string;
  disposition: AuditDisposition;
  evidence: Record<string, unknown>;
  createdAt: string;
}

export interface AuditMetricRecord {
  id: string;
  workspaceId: string;
  siteId: string;
  auditId: string;
  metricName: string;
  sourceType: 'lighthouse_lab' | 'crux_field' | 'gsc_first_party' | 'deterministic_check';
  provider?: string;
  device?: string;
  window?: string;
  value?: number;
  status: 'available' | 'unavailable' | 'error';
  estimated: boolean;
  collectedAt: string;
}

export interface MonitorConfigRecord {
  id: string;
  workspaceId: string;
  siteId: string;
  kind: MonitorKind;
  targetUrl?: string;
  frequency: MonitorFrequency;
  timezone: string;
  threshold: number;
  status: 'active' | 'paused';
  quietPeriodMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface MonitorEventRecord {
  id: string;
  workspaceId: string;
  siteId: string;
  configId: string;
  runId: string;
  fingerprint: string;
  eventType: string;
  severity: 'info' | 'warning' | 'critical';
  baseline?: number;
  currentValue?: number;
  delta?: number;
  sourceType: string;
  recommendation?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MonitorRunRecord {
  id: string;
  workspaceId: string;
  configId: string;
  scheduledAt: string;
  status: 'queued' | 'running' | 'completed' | 'partial' | 'failed';
  provider?: string;
  model?: string;
  locale?: string;
  device?: string;
  sampledAt?: string;
  estimated: boolean;
  errorCode?: string;
  createdAt: string;
}

export interface AlertRecord {
  id: string;
  workspaceId: string;
  siteId: string;
  eventId: string;
  channel: 'in_app' | 'queue' | 'email';
  status: 'queued' | 'read' | 'muted' | 'sent';
  mutedUntil?: string;
  sentAt?: string;
  readAt?: string;
  createdAt: string;
}

export interface AuditBundle {
  audit: SiteAuditResult;
  pages: AuditPageRecord[];
  findings: AuditFindingRecord[];
  rechecks: AuditRecheckRecord[];
  metrics: AuditMetricRecord[];
  partialReasons: string[];
}

export interface AuditGraphPageInput {
  url: string;
  httpStatus?: number;
  title?: string;
  metaDescription?: string;
  h1Count?: number;
  wordCount?: number;
  canonicalUrl?: string;
  robotsIndexable?: boolean;
  hasSchema?: boolean;
  internalLinks?: string[];
  /** Absolute image URLs found in img src / srcset. */
  imageUrls?: string[];
  /** Absolute stylesheet and script asset URLs. */
  assetUrls?: string[];
}

export interface DeterministicFinding {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  url?: string;
  affectedUrls?: string[];
  affectedCount: number;
  recommendation?: string;
  /** Resource-level evidence such as localhost image URLs or mixed-content assets. */
  resourceUrls?: string[];
}

function isLocalDevelopmentHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return host === 'localhost'
    || host === '127.0.0.1'
    || host === '0.0.0.0'
    || host === '::1'
    || host.endsWith('.localhost');
}

/**
 * 對 crawler 輸出執行不依賴 AI 的基礎檢查，確保每次 run 的規則可重現。
 */
export function analyzeAuditPageGraph(
  pages: AuditGraphPageInput[],
  siteUrl: string,
  options: { includeOrphanCheck?: boolean } = {}
): DeterministicFinding[] {
  const findings: DeterministicFinding[] = [];
  const normalizedSite = normalizeAuditUrl(siteUrl);
  const inbound = new Map<string, number>(pages.map((page) => [normalizeAuditUrl(page.url), 0]));
  for (const page of pages) {
    for (const link of page.internalLinks ?? []) {
      const key = normalizeAuditUrl(link);
      if (inbound.has(key)) inbound.set(key, (inbound.get(key) ?? 0) + 1);
    }
  }
  const deadLinks = pages.filter((page) => page.httpStatus !== undefined && page.httpStatus >= 400);
  if (deadLinks.length) findings.push({ category: 'links', severity: 'high', title: '發現失效頁面或死鏈', description: `${deadLinks.length} 個頁面返回 HTTP ${deadLinks[0]?.httpStatus ?? 400}。`, url: deadLinks[0]?.url, affectedUrls: deadLinks.map((page) => page.url), affectedCount: deadLinks.length, recommendation: '修復目標連結或設定正確的 301/410 回應。' });
  const missingTitles = pages.filter((page) => !page.title);
  if (missingTitles.length) findings.push({ category: 'meta_tags', severity: 'critical', title: '頁面缺少 Title', description: `${missingTitles.length} 個頁面沒有可讀取的 Title 標籤。`, url: missingTitles[0]?.url, affectedUrls: missingTitles.map((page) => page.url), affectedCount: missingTitles.length, recommendation: '為頁面設定唯一且準確描述內容的 Title，建議控制在 25 至 65 字元。' });
  const invalidDescriptions = pages.filter((page) => !page.metaDescription || page.metaDescription.length < 70 || page.metaDescription.length > 160);
  if (invalidDescriptions.length) findings.push({ category: 'meta_tags', severity: 'high', title: 'Meta Description 長度不符合要求', description: `${invalidDescriptions.length} 個頁面的 Meta Description 未落在 70 至 160 字元範圍。`, url: invalidDescriptions[0]?.url, affectedUrls: invalidDescriptions.map((page) => page.url), affectedCount: invalidDescriptions.length, recommendation: '手動撰寫 70 至 160 字元的獨特 Meta Description，概述頁面價值與搜尋意圖。' });
  const invalidH1 = pages.filter((page) => page.h1Count !== undefined && page.h1Count !== 1);
  if (invalidH1.length) findings.push({ category: 'headings', severity: 'medium', title: 'H1 標題數量不正確', description: `${invalidH1.length} 個頁面沒有剛好一個 H1。`, url: invalidH1[0]?.url, affectedUrls: invalidH1.map((page) => page.url), affectedCount: invalidH1.length, recommendation: '保留一個清楚描述頁面主題的 H1，其餘段落標題請使用 H2 至 H4。' });
  const thinContent = pages.filter((page) => page.wordCount !== undefined && page.wordCount < 150);
  if (thinContent.length) findings.push({ category: 'content_quality', severity: 'medium', title: '頁面文字內容偏少', description: `${thinContent.length} 個頁面的可讀文字少於 150 個字詞單位。`, url: thinContent[0]?.url, affectedUrls: thinContent.map((page) => page.url), affectedCount: thinContent.length, recommendation: '依使用者意圖補充原創說明、規格、實例、FAQ 或相關閱讀連結，而非重複堆疊關鍵詞。' });
  const missingCanonical = pages.filter((page) => !page.canonicalUrl);
  if (missingCanonical.length) findings.push({ category: 'indexability', severity: 'medium', title: '頁面缺少 canonical', description: `${missingCanonical.length} 個頁面沒有自引用或有效 canonical。`, url: missingCanonical[0]?.url, affectedUrls: missingCanonical.map((page) => page.url), affectedCount: missingCanonical.length, recommendation: '為每個可索引頁面輸出唯一的自引用 canonical。' });
  const mismatchedCanonical = pages.filter((page) => page.canonicalUrl && normalizeAuditUrl(page.canonicalUrl) !== normalizeAuditUrl(page.url));
  if (mismatchedCanonical.length) findings.push({ category: 'indexability', severity: 'medium', title: 'canonical 與頁面 URL 不一致', description: `${mismatchedCanonical.length} 個頁面的 canonical 指向其他地址。`, url: mismatchedCanonical[0]?.url, affectedUrls: mismatchedCanonical.map((page) => page.url), affectedCount: mismatchedCanonical.length, recommendation: '確認跨 URL canonical 是有意設定，並避免指向不可索引頁面。' });
  const blocked = pages.filter((page) => page.robotsIndexable === false);
  if (blocked.length) findings.push({ category: 'indexability', severity: 'high', title: 'robots 指令阻止索引', description: `${blocked.length} 個頁面被 robots 或 meta 指令標記為不可索引。`, url: blocked[0]?.url, affectedUrls: blocked.map((page) => page.url), affectedCount: blocked.length, recommendation: '檢查 robots.txt 與 meta robots，確認阻止索引符合預期。' });
  const missingSchema = pages.filter((page) => page.hasSchema === false);
  if (missingSchema.length) findings.push({ category: 'structured_data', severity: 'low', title: '頁面缺少結構化資料', description: `${missingSchema.length} 個頁面沒有檢測到 JSON-LD 或其他 Schema。`, url: missingSchema[0]?.url, affectedUrls: missingSchema.map((page) => page.url), affectedCount: missingSchema.length, recommendation: '按頁面類型添加 Article、Product、FAQPage 或 WebSite Schema。' });
  const orphaned = options.includeOrphanCheck === false
    ? []
    : pages.filter((page) => normalizeAuditUrl(page.url) !== normalizedSite && (inbound.get(normalizeAuditUrl(page.url)) ?? 0) === 0);
  if (orphaned.length) findings.push({ category: 'links', severity: 'medium', title: '發現孤島頁面', description: `${orphaned.length} 個頁面沒有任何站內入鏈。`, url: orphaned[0]?.url, affectedUrls: orphaned.map((page) => page.url), affectedCount: orphaned.length, recommendation: '從相關內容、分類頁或導航加入有意義的站內連結。' });

  const localhostImagePages = pages.filter((page) =>
    (page.imageUrls ?? []).some((imageUrl) => {
      try {
        return isLocalDevelopmentHost(new URL(imageUrl).hostname);
      } catch {
        return false;
      }
    })
  );
  if (localhostImagePages.length) {
    const resourceUrls = [...new Set(
      localhostImagePages.flatMap((page) =>
        (page.imageUrls ?? []).filter((imageUrl) => {
          try {
            return isLocalDevelopmentHost(new URL(imageUrl).hostname);
          } catch {
            return false;
          }
        })
      )
    )].slice(0, 20);
    findings.push({
      category: 'images',
      severity: 'critical',
      title: '圖片指向本機開發位址',
      description:
        `${localhostImagePages.length} 個頁面引用了 localhost / 127.0.0.1 圖片，搜尋引擎與訪客無法抓取。` +
        (resourceUrls[0] ? ` 例如：${resourceUrls[0]}` : ''),
      url: localhostImagePages[0]?.url,
      affectedUrls: [...localhostImagePages.map((page) => page.url), ...resourceUrls],
      affectedCount: localhostImagePages.length,
      recommendation: '將圖片 URL 改為公開可訪問的正式網域路徑，並清除內容中殘留的本機開發位址。',
      resourceUrls
    });
  }

  const httpsPages = pages.filter((page) => {
    try {
      return new URL(page.url).protocol === 'https:';
    } catch {
      return false;
    }
  });
  const mixedContentPages = httpsPages.filter((page) => {
    const resources = [...(page.imageUrls ?? []), ...(page.assetUrls ?? []), ...(page.internalLinks ?? [])];
    return resources.some((resourceUrl) => {
      try {
        return new URL(resourceUrl).protocol === 'http:';
      } catch {
        return false;
      }
    });
  });
  if (mixedContentPages.length) {
    const resourceUrls = [...new Set(
      mixedContentPages.flatMap((page) =>
        [...(page.imageUrls ?? []), ...(page.assetUrls ?? []), ...(page.internalLinks ?? [])].filter((resourceUrl) => {
          try {
            return new URL(resourceUrl).protocol === 'http:';
          } catch {
            return false;
          }
        })
      )
    )].slice(0, 20);
    findings.push({
      category: 'security',
      severity: 'high',
      title: 'HTTPS/HTTP mixed content',
      description:
        `${mixedContentPages.length} 個 HTTPS 頁面仍引用 HTTP 資源，可能被瀏覽器阻擋並影響信任訊號。` +
        (resourceUrls[0] ? ` 例如：${resourceUrls[0]}` : ''),
      url: mixedContentPages[0]?.url,
      affectedUrls: [...mixedContentPages.map((page) => page.url), ...resourceUrls],
      affectedCount: mixedContentPages.length,
      recommendation: '將圖片、CSS、JS 與站內連結一律改為 HTTPS，並檢查 CDN / CMS 媒體庫網址設定。',
      resourceUrls
    });
  }

  return findings;
}

interface CrawledAuditPage extends AuditGraphPageInput {
  finalUrl: string;
  contentType?: string;
  crawlStatus: AuditPageRecord['crawlStatus'];
  errorCode?: string;
}

interface CrawlResult {
  pages: CrawledAuditPage[];
  partialReasons: string[];
}

const maxConnectedAuditPages = 200;
const maxAuditRedirects = 3;
const auditFetchTimeoutMs = 8_000;
const auditTotalTimeoutMs = 180_000;
const maxSitemapExpansionDepth = 2;

function normalizeHtmlText(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
}

function countVisibleTextUnits(body: string) {
  const text = body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const cjkCharacters = (text.match(/[\u3400-\u9fff]/gu) ?? []).length;
  const otherWords = (text.replace(/[\u3400-\u9fff]/gu, ' ').match(/[\p{L}\p{N}]+/gu) ?? []).length;
  return cjkCharacters + otherWords;
}

function findAttribute(tag: string, attribute: string) {
  const expression = new RegExp(`\\b${attribute}\\s*=\\s*(["'])(.*?)\\1`, 'i');
  return expression.exec(tag)?.[2]?.trim();
}

function resolveAuditAssetUrl(href: string, baseUrl: string): string | undefined {
  try {
    const resolved = new URL(href, baseUrl);
    return ['http:', 'https:'].includes(resolved.protocol) ? resolved.toString() : undefined;
  } catch {
    return undefined;
  }
}

function extractSrcsetUrls(srcset: string, baseUrl: string) {
  return srcset
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter((value): value is string => Boolean(value))
    .flatMap((href) => {
      const resolved = resolveAuditAssetUrl(href, baseUrl);
      return resolved ? [resolved] : [];
    });
}

function extractHtmlPage(url: string, httpStatus: number, contentType: string | undefined, body: string): CrawledAuditPage {
  const title = normalizeHtmlText(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(body)?.[1] ?? '');
  const descriptionTag = [...body.matchAll(/<meta\b[^>]*>/gi)].find((match) => findAttribute(match[0], 'name')?.toLowerCase() === 'description');
  const metaDescription = descriptionTag ? normalizeHtmlText(findAttribute(descriptionTag[0], 'content') ?? '') : '';
  const h1Count = [...body.matchAll(/<h1\b[^>]*>/gi)].length;
  const links = [...body.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>/gi)]
    .map((match) => match[2])
    .flatMap((href) => {
      const resolved = resolveAuditAssetUrl(href, url);
      return resolved ? [resolved] : [];
    });
  const imageUrls = [...new Set(
    [...body.matchAll(/<img\b[^>]*>/gi)].flatMap((match) => {
      const tag = match[0];
      const candidates = [
        findAttribute(tag, 'src'),
        findAttribute(tag, 'data-src'),
        findAttribute(tag, 'data-lazy-src')
      ].filter((value): value is string => Boolean(value));
      const srcset = findAttribute(tag, 'srcset') || findAttribute(tag, 'data-srcset');
      return [
        ...candidates.flatMap((href) => {
          const resolved = resolveAuditAssetUrl(href, url);
          return resolved ? [resolved] : [];
        }),
        ...(srcset ? extractSrcsetUrls(srcset, url) : [])
      ];
    })
  )];
  const stylesheetUrls = [...body.matchAll(/<link\b[^>]*>/gi)]
    .filter((match) => /\brel\s*=\s*(["'])[^"']*\bstylesheet\b[^"']*\1/i.test(match[0]))
    .flatMap((match) => {
      const href = findAttribute(match[0], 'href');
      const resolved = href ? resolveAuditAssetUrl(href, url) : undefined;
      return resolved ? [resolved] : [];
    });
  const scriptUrls = [...body.matchAll(/<script\b[^>]*>/gi)].flatMap((match) => {
    const src = findAttribute(match[0], 'src');
    const resolved = src ? resolveAuditAssetUrl(src, url) : undefined;
    return resolved ? [resolved] : [];
  });
  const canonicalTag = [...body.matchAll(/<link\b[^>]*>/gi)].find((match) => /\brel\s*=\s*(["'])[^"']*\bcanonical\b[^"']*\1/i.test(match[0]));
  const canonicalHref = canonicalTag ? findAttribute(canonicalTag[0], 'href') : undefined;
  let canonicalUrl: string | undefined;
  try { canonicalUrl = canonicalHref ? new URL(canonicalHref, url).toString() : undefined; } catch { canonicalUrl = undefined; }
  const robotsTag = [...body.matchAll(/<meta\b[^>]*>/gi)].find((match) => findAttribute(match[0], 'name')?.toLowerCase() === 'robots');
  const robotsContent = robotsTag ? findAttribute(robotsTag[0], 'content')?.toLowerCase() : undefined;
  return {
    url,
    finalUrl: url,
    httpStatus,
    contentType,
    title: title || undefined,
    metaDescription: metaDescription || undefined,
    h1Count,
    wordCount: countVisibleTextUnits(body),
    canonicalUrl,
    robotsIndexable: robotsContent ? !robotsContent.includes('noindex') : true,
    hasSchema: /<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1/i.test(body),
    internalLinks: links,
    imageUrls,
    assetUrls: [...new Set([...stylesheetUrls, ...scriptUrls])],
    crawlStatus: httpStatus >= 400 ? 'failed' : 'ok'
  };
}

async function fetchAuditText(
  initialTarget: ValidatedPublicUrl,
  fetchImpl: typeof fetch,
  allowedOrigin: string
): Promise<{ finalUrl: string; status: number; contentType?: string; body: string }> {
  let target = initialTarget;
  for (let redirectCount = 0; redirectCount <= maxAuditRedirects; redirectCount += 1) {
    if (target.url.origin !== allowedOrigin) throw new Error('AUDIT_TARGET_OUTSIDE_SITE');
    const response = await fetchValidatedPublicUrl(target, {
      headers: { accept: 'text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.1' },
      signal: AbortSignal.timeout(auditFetchTimeoutMs)
    }, fetchImpl);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirectCount === maxAuditRedirects) throw new Error('AUDIT_REDIRECT_LIMIT');
      target = await validateRedirectTarget(location, target.url);
      if (target.url.origin !== allowedOrigin) throw new Error('AUDIT_REDIRECT_OUTSIDE_SITE');
      continue;
    }
    return {
      finalUrl: target.url.toString(),
      status: response.status,
      contentType: response.headers.get('content-type') ?? undefined,
      body: await response.text()
    };
  }
  throw new Error('AUDIT_REDIRECT_LIMIT');
}

function parseRobots(body: string) {
  const sitemapUrls = [...body.matchAll(/^\s*sitemap:\s*(\S+)\s*$/gim)].map((match) => match[1]);
  const wildcardBlock = /user-agent\s*:\s*\*[\s\S]*?(?=\n\s*user-agent\s*:|$)/i.exec(body)?.[0] ?? '';
  const disallowPaths = [...wildcardBlock.matchAll(/^\s*disallow:\s*(\/\S*)\s*$/gim)].map((match) => match[1]);
  return { sitemapUrls, disallowPaths };
}

function parseSitemapUrls(body: string) {
  return [...body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => match[1]);
}

function isXmlSitemapPayload(contentType: string | undefined, body: string) {
  const type = contentType?.toLowerCase() ?? '';
  if (type.includes('xml') || type.includes('text/plain')) {
    return /<sitemapindex[\s>]|<urlset[\s>]/i.test(body);
  }
  return /<sitemapindex[\s>]|<urlset[\s>]/i.test(body);
}

function looksLikeSitemapUrl(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    return path.endsWith('.xml') || /(^|\/)sitemap(_index)?(\.xml)?$/i.test(path) || /\/wp-sitemap/i.test(path);
  } catch {
    return /\.xml($|\?)/i.test(url) || /sitemap(_index)?\.xml/i.test(url);
  }
}

/**
 * 連接站點的受控唯讀 crawler。正文只在當前請求中解析，絕不持久化。
 */
export async function crawlConnectedSite(
  siteUrl: string,
  requestedPageLimit: number,
  fetchImpl: typeof fetch = fetch
): Promise<CrawlResult> {
  const pageLimit = Math.min(Math.max(1, requestedPageLimit), maxConnectedAuditPages);
  const rootTarget = await validatePublicUrl(siteUrl);
  const rootOrigin = rootTarget.url.origin;
  const partialReasons: string[] = [];
  const pages: CrawledAuditPage[] = [];
  const queued = [rootTarget.url.toString()];
  const visited = new Set<string>();
  const sitemapQueue: Array<{ url: string; depth: number }> = [];
  const startedAt = Date.now();
  let disallowPaths: string[] = [];

  const enqueueSitemap = (url: string, depth = 0) => {
    if (depth > maxSitemapExpansionDepth) return;
    sitemapQueue.push({ url, depth });
  };

  const expandSitemapBody = (body: string, depth: number) => {
    for (const loc of parseSitemapUrls(body)) {
      if (looksLikeSitemapUrl(loc) && depth < maxSitemapExpansionDepth) {
        enqueueSitemap(loc, depth + 1);
      } else {
        queued.push(loc);
      }
    }
  };

  try {
    const robotsTarget = await validatePublicUrl(new URL('/robots.txt', rootTarget.url).toString());
    const robots = await fetchAuditText(robotsTarget, fetchImpl, rootOrigin);
    if (robots.status >= 200 && robots.status < 300) {
      const parsed = parseRobots(robots.body);
      disallowPaths = parsed.disallowPaths;
      for (const sitemapUrl of parsed.sitemapUrls) {
        enqueueSitemap(sitemapUrl, 0);
      }
    }
  } catch {
    partialReasons.push('ROBOTS_FETCH_FAILED');
  }

  // Common CMS sitemap entry points when robots.txt omits them.
  for (const path of ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml']) {
    enqueueSitemap(new URL(path, rootTarget.url).toString(), 0);
  }

  while (sitemapQueue.length) {
    if (Date.now() - startedAt >= auditTotalTimeoutMs) {
      partialReasons.push('AUDIT_TOTAL_TIMEOUT');
      break;
    }
    const nextSitemap = sitemapQueue.shift();
    if (!nextSitemap) continue;
    let normalizedSitemap: string;
    try { normalizedSitemap = normalizeAuditUrl(nextSitemap.url); } catch { continue; }
    if (visited.has(`sitemap:${normalizedSitemap}`)) continue;
    visited.add(`sitemap:${normalizedSitemap}`);
    try {
      const sitemapTarget = await validatePublicUrl(nextSitemap.url);
      if (sitemapTarget.url.origin !== rootOrigin) continue;
      const sitemap = await fetchAuditText(sitemapTarget, fetchImpl, rootOrigin);
      if (sitemap.status >= 200 && sitemap.status < 300 && isXmlSitemapPayload(sitemap.contentType, sitemap.body)) {
        expandSitemapBody(sitemap.body, nextSitemap.depth);
      }
    } catch {
      partialReasons.push('SITEMAP_FETCH_FAILED');
    }
  }

  while (queued.length && pages.length < pageLimit) {
    if (Date.now() - startedAt >= auditTotalTimeoutMs) {
      partialReasons.push('AUDIT_TOTAL_TIMEOUT');
      break;
    }
    const candidate = queued.shift();
    if (!candidate) continue;
    let normalized: string;
    try { normalized = normalizeAuditUrl(candidate); } catch { continue; }
    if (visited.has(normalized)) continue;
    visited.add(normalized);
    let target: ValidatedPublicUrl;
    try {
      target = await validatePublicUrl(candidate);
      if (target.url.origin !== rootOrigin) continue;
    } catch {
      partialReasons.push('PAGE_URL_REJECTED');
      continue;
    }
    if (disallowPaths.some((path) => target.url.pathname.startsWith(path))) {
      pages.push({ url: target.url.toString(), finalUrl: target.url.toString(), crawlStatus: 'blocked', errorCode: 'ROBOTS_DISALLOW', internalLinks: [] });
      continue;
    }
    try {
      const response = await fetchAuditText(target, fetchImpl, rootOrigin);
      if (isXmlSitemapPayload(response.contentType, response.body) || looksLikeSitemapUrl(response.finalUrl)) {
        expandSitemapBody(response.body, 0);
        continue;
      }
      if (!response.contentType?.toLowerCase().includes('text/html') && !response.contentType?.toLowerCase().includes('application/xhtml+xml')) {
        // Resource / non-HTML URLs must not consume the HTML page budget.
        partialReasons.push('AUDIT_UNSUPPORTED_CONTENT_TYPE');
        continue;
      }
      const page = extractHtmlPage(response.finalUrl, response.status, response.contentType, response.body);
      pages.push(page);
      for (const link of page.internalLinks ?? []) {
        try {
          if (new URL(link).origin === rootOrigin) queued.push(link);
        } catch { /* Extractor only emits valid URLs. */ }
      }
    } catch (error) {
      const errorCode = error instanceof Error && error.message.startsWith('AUDIT_')
        ? error.message
        : error instanceof Error && error.name === 'TimeoutError'
          ? 'AUDIT_PAGE_TIMEOUT'
          : 'AUDIT_PAGE_FETCH_FAILED';
      pages.push({ url: target.url.toString(), finalUrl: target.url.toString(), crawlStatus: 'failed', errorCode, internalLinks: [] });
      partialReasons.push(errorCode);
    }
  }
  if (queued.length) partialReasons.push('PAGE_CAP_REACHED');
  return { pages, partialReasons: [...new Set(partialReasons)] };
}

/**
 * 只分析一個已連接站點的公開頁面。正文只在本次請求解析，不會寫回 CMS。
 */
export async function crawlConnectedPage(
  siteUrl: string,
  targetUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<CrawlResult> {
  const siteTarget = await validatePublicUrl(siteUrl);
  const target = await validatePublicUrl(targetUrl);
  const allowedOrigin = siteTarget.url.origin;
  if (target.url.origin !== allowedOrigin) throw new Error('AUDIT_TARGET_OUTSIDE_SITE');

  const partialReasons: string[] = [];
  let disallowPaths: string[] = [];
  try {
    const robotsTarget = await validatePublicUrl(new URL('/robots.txt', siteTarget.url).toString());
    const robots = await fetchAuditText(robotsTarget, fetchImpl, allowedOrigin);
    if (robots.status >= 200 && robots.status < 300) {
      disallowPaths = parseRobots(robots.body).disallowPaths;
    }
  } catch {
    partialReasons.push('ROBOTS_FETCH_FAILED');
  }

  if (disallowPaths.some((path) => target.url.pathname.startsWith(path))) {
    return {
      pages: [{ url: target.url.toString(), finalUrl: target.url.toString(), crawlStatus: 'blocked', errorCode: 'ROBOTS_DISALLOW', internalLinks: [] }],
      partialReasons: ['ROBOTS_DISALLOW']
    };
  }

  try {
    const response = await fetchAuditText(target, fetchImpl, allowedOrigin);
    if (!response.contentType?.toLowerCase().includes('text/html') && !response.contentType?.toLowerCase().includes('application/xhtml+xml')) {
      return {
        pages: [{ url: response.finalUrl, finalUrl: response.finalUrl, httpStatus: response.status, contentType: response.contentType, crawlStatus: 'failed', errorCode: 'AUDIT_UNSUPPORTED_CONTENT_TYPE', internalLinks: [] }],
        partialReasons: ['AUDIT_UNSUPPORTED_CONTENT_TYPE']
      };
    }
    return { pages: [extractHtmlPage(response.finalUrl, response.status, response.contentType, response.body)], partialReasons };
  } catch (error) {
    const errorCode = error instanceof Error && error.message.startsWith('AUDIT_')
      ? error.message
      : error instanceof Error && error.name === 'TimeoutError'
        ? 'AUDIT_PAGE_TIMEOUT'
        : 'AUDIT_PAGE_FETCH_FAILED';
    return {
      pages: [{ url: target.url.toString(), finalUrl: target.url.toString(), crawlStatus: 'failed', errorCode, internalLinks: [] }],
      partialReasons: [...new Set([...partialReasons, errorCode])]
    };
  }
}

export interface SiteAuditMonitoringRepository {
  registerAudit(audit: SiteAuditResult): void;
  savePages(input: Omit<AuditPageRecord, 'id' | 'createdAt'>[]): Promise<AuditPageRecord[]>;
  saveFindings(input: Omit<AuditFindingRecord, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<AuditFindingRecord[]>;
  saveMetrics(input: Omit<AuditMetricRecord, 'id'>[]): Promise<AuditMetricRecord[]>;
  getBundle(workspaceId: string, auditId: string): Promise<AuditBundle | undefined>;
  getFinding(workspaceId: string, findingId: string): Promise<AuditFindingRecord | undefined>;
  updateFinding(findingId: string, updates: Partial<Pick<AuditFindingRecord, 'status' | 'ignoredReason' | 'ignoredUntil' | 'ignoredBy' | 'remediationTaskId'>>): Promise<AuditFindingRecord | undefined>;
  addRecheck(input: Omit<AuditRecheckRecord, 'id' | 'createdAt'>): Promise<AuditRecheckRecord>;
  createMonitor(input: Omit<MonitorConfigRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<MonitorConfigRecord>;
  listMonitors(workspaceId: string, siteId?: string): Promise<MonitorConfigRecord[]>;
  listDueMonitors(now: string): Promise<MonitorConfigRecord[]>;
  createMonitorRun(input: Omit<MonitorRunRecord, 'id' | 'createdAt'>): Promise<MonitorRunRecord>;
  completeMonitorRun(runId: string, status: MonitorRunRecord['status'], errorCode?: string): Promise<MonitorRunRecord | undefined>;
  getLatestAuditScore(workspaceId: string, siteId: string): Promise<{ score?: number; collectedAt: string } | undefined>;
  getLatestMonitorEvent(workspaceId: string, configId: string): Promise<MonitorEventRecord | undefined>;
  saveMonitorEvent(input: Omit<MonitorEventRecord, 'id' | 'createdAt'>): Promise<MonitorEventRecord>;
  listMonitorEvents(workspaceId: string, siteId: string | undefined, page: number, pageSize: number): Promise<{ items: MonitorEventRecord[]; total: number }>;
  createAlert(input: Omit<AlertRecord, 'id' | 'createdAt'>): Promise<AlertRecord>;
  listAlerts(workspaceId: string, page: number, pageSize: number): Promise<{ items: AlertRecord[]; total: number }>;
  muteAlert(workspaceId: string, alertId: string, mutedUntil: string): Promise<AlertRecord | undefined>;
  close?(): Promise<void>;
}

export function createIssueFingerprint(input: {
  category: string;
  ruleVersion?: string;
  url?: string;
  title?: string;
}): string {
  const normalizedUrl = input.url ? normalizeAuditUrl(input.url) : '';
  const value = [input.category, input.ruleVersion ?? 'ph2-10.1', normalizedUrl, (input.title ?? '').trim().toLowerCase()].join('|');
  return createHash('sha256').update(value).digest('hex');
}

export function deriveRecheckDisposition(previous: AuditFindingStatus, found: boolean, partial = false): AuditDisposition {
  if (partial) return 'partial';
  if (!found) return 'fixed';
  if (previous === 'fixed') return 'regressed';
  return 'persisting';
}

export async function recordMonitorEvent(
  repository: SiteAuditMonitoringRepository,
  input: Omit<MonitorEventRecord, 'id' | 'createdAt' | 'fingerprint'> & { fingerprint?: string },
  shouldQueueAlert = input.severity !== 'info'
) {
  const event = await repository.saveMonitorEvent({
    ...input,
    fingerprint: input.fingerprint ?? createIssueFingerprint({ category: input.eventType, title: input.sourceType })
  });
  const alert = shouldQueueAlert ? await repository.createAlert({
    workspaceId: event.workspaceId, siteId: event.siteId, eventId: event.id,
    channel: 'in_app', status: 'queued'
  }) : undefined;
  return { event, alert };
}

export async function processDueMonitorConfigs(
  repository: SiteAuditMonitoringRepository,
  now = nowIso(),
  logger: Pick<Console, 'error'> = console
) {
  const monitors = await repository.listDueMonitors(now);
  let processed = 0;
  for (const monitor of monitors) {
    const run = await repository.createMonitorRun({
      workspaceId: monitor.workspaceId,
      configId: monitor.id,
      scheduledAt: now,
      status: 'running',
      estimated: false
    });
    try {
      if (monitor.kind !== 'technical') {
        await repository.completeMonitorRun(run.id, 'partial', 'PROVIDER_UNAVAILABLE');
        processed += 1;
        continue;
      }
      const latestAudit = await repository.getLatestAuditScore(monitor.workspaceId, monitor.siteId);
      if (latestAudit?.score === undefined) {
        await repository.completeMonitorRun(run.id, 'partial', 'AUDIT_BASELINE_UNAVAILABLE');
        processed += 1;
        continue;
      }
      const previous = await repository.getLatestMonitorEvent(monitor.workspaceId, monitor.id);
      const delta = previous?.currentValue === undefined ? undefined : latestAudit.score - previous.currentValue;
      const isDrop = delta !== undefined && delta < 0 && Math.abs(delta) >= monitor.threshold;
      const severity = isDrop
        ? (Math.abs(delta ?? 0) >= Math.max(20, monitor.threshold * 2) ? 'critical' : 'warning')
        : 'info';
      const quietUntil = previous
        ? Date.parse(previous.createdAt) + monitor.quietPeriodMinutes * 60_000
        : 0;
      await recordMonitorEvent(repository, {
        workspaceId: monitor.workspaceId,
        siteId: monitor.siteId,
        configId: monitor.id,
        runId: run.id,
        fingerprint: createIssueFingerprint({ category: 'technical_audit_score', url: monitor.siteId, title: 'site-audit-score' }),
        eventType: 'technical_audit_score',
        severity,
        baseline: previous?.currentValue,
        currentValue: latestAudit.score,
        delta,
        sourceType: 'deterministic_check',
        recommendation: isDrop ? '查看最新網站檢測結果，優先處理新增的高嚴重度問題。' : undefined,
        metadata: { collectedAt: latestAudit.collectedAt, sourceLabel: 'deterministic_check' }
      }, severity !== 'info' && Date.parse(now) >= quietUntil);
      await repository.completeMonitorRun(run.id, 'completed');
      processed += 1;
    } catch {
      await repository.completeMonitorRun(run.id, 'failed', 'MONITOR_SAMPLE_FAILED');
      logger.error('[siteAuditMonitoring] 監控採樣失敗: MONITOR_SAMPLE_FAILED');
    }
  }
  return processed;
}

export function startSiteAuditMonitoringScheduler(
  repository: SiteAuditMonitoringRepository,
  intervalMs = 30 * 60_000
) {
  const timer = setInterval(() => {
    processDueMonitorConfigs(repository).catch(() => {
      console.error('[siteAuditMonitoring] 監控排程失敗: MONITOR_SCHEDULER_FAILED');
    });
  }, intervalMs);
  return () => clearInterval(timer);
}

function normalizeAuditUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return value.trim().toLowerCase();
  }
}

function nowIso() {
  return new Date().toISOString();
}

function mapFinding(row: QueryResultRow): AuditFindingRecord {
  return {
    id: row.id, workspaceId: row.workspace_id, siteId: row.site_id, auditId: row.audit_id,
    pageId: row.page_id ?? undefined, fingerprint: row.fingerprint, category: row.category,
    severity: row.severity, title: row.title, description: row.description,
    evidence: row.evidence ?? {}, recommendation: row.recommendation ?? undefined,
    ruleVersion: row.rule_version, status: row.status, ignoredReason: row.ignored_reason ?? undefined,
    ignoredUntil: row.ignored_until ? new Date(row.ignored_until).toISOString() : undefined,
    ignoredBy: row.ignored_by ?? undefined, remediationTaskId: row.remediation_task_id ?? undefined, createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapPage(row: QueryResultRow): AuditPageRecord {
  return {
    id: row.id, workspaceId: row.workspace_id, siteId: row.site_id, auditId: row.audit_id,
    url: row.url, normalizedUrl: row.normalized_url, httpStatus: row.http_status ?? undefined,
    contentType: row.content_type ?? undefined, title: row.title ?? undefined,
    canonicalUrl: row.canonical_url ?? undefined, robotsIndexable: row.robots_indexable ?? undefined,
    hasSchema: row.has_schema ?? undefined, internalLinksCount: Number(row.internal_links_count),
    externalLinksCount: Number(row.external_links_count), crawlStatus: row.crawl_status,
    errorCode: row.error_code ?? undefined, createdAt: new Date(row.created_at).toISOString()
  };
}

function mapMetric(row: QueryResultRow): AuditMetricRecord {
  return {
    id: row.id, workspaceId: row.workspace_id, siteId: row.site_id, auditId: row.audit_id,
    metricName: row.metric_name, sourceType: row.source_type, provider: row.provider ?? undefined,
    device: row.device ?? undefined, window: row.data_window ?? undefined,
    value: row.value === null ? undefined : Number(row.value), status: row.status,
    estimated: Boolean(row.estimated), collectedAt: new Date(row.collected_at).toISOString()
  };
}

function mapMonitor(row: QueryResultRow): MonitorConfigRecord {
  return {
    id: row.id, workspaceId: row.workspace_id, siteId: row.site_id, kind: row.kind,
    targetUrl: row.target_url ?? undefined, frequency: row.frequency, timezone: row.timezone,
    threshold: Number(row.threshold), status: row.status, quietPeriodMinutes: Number(row.quiet_period_minutes),
    createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapMonitorRun(row: QueryResultRow): MonitorRunRecord {
  return {
    id: row.id, workspaceId: row.workspace_id, configId: row.config_id,
    scheduledAt: new Date(row.scheduled_at).toISOString(), status: row.status,
    provider: row.provider ?? undefined, model: row.model ?? undefined,
    locale: row.locale ?? undefined, device: row.device ?? undefined,
    sampledAt: row.sampled_at ? new Date(row.sampled_at).toISOString() : undefined,
    estimated: Boolean(row.estimated), errorCode: row.error_code ?? undefined,
    createdAt: new Date(row.created_at).toISOString()
  };
}

function mapEvent(row: QueryResultRow): MonitorEventRecord {
  return {
    id: row.id, workspaceId: row.workspace_id, siteId: row.site_id, configId: row.config_id,
    runId: row.run_id, fingerprint: row.fingerprint, eventType: row.event_type, severity: row.severity,
    baseline: row.baseline === null ? undefined : Number(row.baseline),
    currentValue: row.current_value === null ? undefined : Number(row.current_value),
    delta: row.delta === null ? undefined : Number(row.delta), sourceType: row.source_type,
    recommendation: row.recommendation ?? undefined, metadata: row.metadata ?? {},
    createdAt: new Date(row.created_at).toISOString()
  };
}

function mapAlert(row: QueryResultRow): AlertRecord {
  return {
    id: row.id, workspaceId: row.workspace_id, siteId: row.site_id, eventId: row.event_id,
    channel: row.channel, status: row.status, mutedUntil: row.muted_until ? new Date(row.muted_until).toISOString() : undefined,
    sentAt: row.sent_at ? new Date(row.sent_at).toISOString() : undefined,
    readAt: row.read_at ? new Date(row.read_at).toISOString() : undefined,
    createdAt: new Date(row.created_at).toISOString()
  };
}

export function createInMemorySiteAuditMonitoringRepository(
  auditResults: Map<string, SiteAuditResult> = new Map()
): SiteAuditMonitoringRepository {
  const pages = new Map<string, AuditPageRecord>();
  const findings = new Map<string, AuditFindingRecord>();
  const rechecks = new Map<string, AuditRecheckRecord>();
  const metrics = new Map<string, AuditMetricRecord>();
  const monitors = new Map<string, MonitorConfigRecord>();
  const monitorRuns = new Map<string, MonitorRunRecord>();
  const events = new Map<string, MonitorEventRecord>();
  const alerts = new Map<string, AlertRecord>();
  return {
    registerAudit(audit) { auditResults.set(audit.id, audit); },
    async savePages(input) {
      const result = input.map((item) => ({ ...item, id: randomUUID(), createdAt: nowIso() }));
      result.forEach((item) => pages.set(item.id, item));
      return result;
    },
    async saveFindings(input) {
      const result = input.map((item) => ({ ...item, id: randomUUID(), createdAt: nowIso(), updatedAt: nowIso() }));
      result.forEach((item) => findings.set(item.id, item));
      return result;
    },
    async saveMetrics(input) {
      const result = input.map((item) => ({ ...item, id: randomUUID() }));
      result.forEach((item) => metrics.set(item.id, item));
      return result;
    },
    async getBundle(workspaceId, auditId) {
      const audit = auditResults.get(auditId);
      if (!audit) return undefined;
      const scopedPages = [...pages.values()].filter((item) => item.workspaceId === workspaceId && item.auditId === auditId);
      const scopedFindings = [...findings.values()].filter((item) => item.workspaceId === workspaceId && item.auditId === auditId);
      const findingIds = new Set(scopedFindings.map((item) => item.id));
      return {
        audit, pages: scopedPages, findings: scopedFindings,
        rechecks: [...rechecks.values()].filter((item) => findingIds.has(item.findingId)),
        metrics: [...metrics.values()].filter((item) => item.workspaceId === workspaceId && item.auditId === auditId),
        partialReasons: audit.status === 'partial' ? [audit.errorMessage ?? '部分頁面檢查失敗'] : []
      };
    },
    async getFinding(workspaceId, findingId) {
      const finding = findings.get(findingId);
      return finding?.workspaceId === workspaceId ? finding : undefined;
    },
    async updateFinding(findingId, updates) {
      const finding = findings.get(findingId);
      if (!finding) return undefined;
      const updated = { ...finding, ...updates, updatedAt: nowIso() };
      findings.set(findingId, updated);
      return updated;
    },
    async addRecheck(input) {
      const record = { ...input, id: randomUUID(), createdAt: nowIso() };
      rechecks.set(record.id, record);
      return record;
    },
    async createMonitor(input) {
      const record = { ...input, id: randomUUID(), createdAt: nowIso(), updatedAt: nowIso() };
      monitors.set(record.id, record);
      return record;
    },
    async listMonitors(workspaceId, siteId) {
      return [...monitors.values()].filter((item) => item.workspaceId === workspaceId && (!siteId || item.siteId === siteId));
    },
    async listDueMonitors(now) {
      const currentTime = Date.parse(now);
      return [...monitors.values()].filter((monitor) => {
        if (monitor.status !== 'active') return false;
        const latest = [...monitorRuns.values()]
          .filter((run) => run.configId === monitor.id)
          .sort((left, right) => right.scheduledAt.localeCompare(left.scheduledAt))[0];
        if (!latest) return true;
        const intervals: Record<MonitorFrequency, number> = { daily: 86_400_000, weekly: 604_800_000, monthly: 2_592_000_000 };
        return Date.parse(latest.scheduledAt) + intervals[monitor.frequency] <= currentTime;
      });
    },
    async createMonitorRun(input) {
      const existing = [...monitorRuns.values()].find((run) => run.configId === input.configId && run.scheduledAt === input.scheduledAt);
      if (existing) return existing;
      const record = { ...input, id: randomUUID(), createdAt: nowIso() };
      monitorRuns.set(record.id, record);
      return record;
    },
    async completeMonitorRun(runId, status, errorCode) {
      const run = monitorRuns.get(runId);
      if (!run) return undefined;
      const updated = { ...run, status, errorCode, sampledAt: nowIso() };
      monitorRuns.set(runId, updated);
      return updated;
    },
    async getLatestAuditScore(workspaceId, siteId) {
      void workspaceId;
      return [...auditResults.values()]
        .filter((audit) => audit.siteId === siteId && ['completed', 'partial'].includes(audit.status))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((audit) => ({ score: audit.overallScore, collectedAt: audit.completedAt ?? audit.createdAt }))[0];
    },
    async getLatestMonitorEvent(workspaceId, configId) {
      return [...events.values()]
        .filter((event) => event.workspaceId === workspaceId && event.configId === configId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
    },
    async saveMonitorEvent(input) {
      const existing = [...events.values()].find((item) => item.runId === input.runId && item.fingerprint === input.fingerprint);
      if (existing) return existing;
      const record = { ...input, id: randomUUID(), createdAt: nowIso() };
      events.set(record.id, record);
      return record;
    },
    async listMonitorEvents(workspaceId, siteId, page, pageSize) {
      const all = [...events.values()].filter((item) => item.workspaceId === workspaceId && (!siteId || item.siteId === siteId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { items: all.slice((page - 1) * pageSize, page * pageSize), total: all.length };
    },
    async createAlert(input) {
      const existing = [...alerts.values()].find((item) => item.eventId === input.eventId && item.channel === input.channel);
      if (existing) return existing;
      const record = { ...input, id: randomUUID(), createdAt: nowIso() };
      alerts.set(record.id, record);
      return record;
    },
    async listAlerts(workspaceId, page, pageSize) {
      const all = [...alerts.values()]
        .filter((alert) => alert.workspaceId === workspaceId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      return { items: all.slice((page - 1) * pageSize, page * pageSize), total: all.length };
    },
    async muteAlert(workspaceId, alertId, mutedUntil) {
      const alert = alerts.get(alertId);
      if (!alert || alert.workspaceId !== workspaceId) return undefined;
      const updated = { ...alert, status: 'muted' as const, mutedUntil };
      alerts.set(alertId, updated);
      return updated;
    }
  };
}

export class PostgresSiteAuditMonitoringRepository implements SiteAuditMonitoringRepository {
  private readonly pool: Pool;
  constructor(databaseUrl: string) { this.pool = new Pool({ connectionString: databaseUrl }); }

  registerAudit(audit: SiteAuditResult) { void audit; /* Audit result is already persisted by SiteAuditRepository. */ }

  async savePages(input: Omit<AuditPageRecord, 'id' | 'createdAt'>[]) {
    const result: AuditPageRecord[] = [];
    for (const item of input) {
      const row = await this.pool.query(
        `INSERT INTO site_audit_pages (id, workspace_id, site_id, audit_id, url, normalized_url, http_status, content_type, title, canonical_url, robots_indexable, has_schema, internal_links_count, external_links_count, crawl_status, error_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT (audit_id, normalized_url) DO UPDATE SET http_status=EXCLUDED.http_status, title=EXCLUDED.title, crawl_status=EXCLUDED.crawl_status RETURNING *`,
        [randomUUID(), item.workspaceId, item.siteId, item.auditId, item.url, item.normalizedUrl, item.httpStatus ?? null, item.contentType ?? null, item.title ?? null, item.canonicalUrl ?? null, item.robotsIndexable ?? null, item.hasSchema ?? null, item.internalLinksCount, item.externalLinksCount, item.crawlStatus, item.errorCode ?? null]
      );
      result.push(mapPage(row.rows[0]));
    }
    return result;
  }

  async saveFindings(input: Omit<AuditFindingRecord, 'id' | 'createdAt' | 'updatedAt'>[]) {
    const result: AuditFindingRecord[] = [];
    for (const item of input) {
      const row = await this.pool.query(
        `INSERT INTO site_audit_findings (id,workspace_id,site_id,audit_id,page_id,fingerprint,category,severity,title,description,evidence,recommendation,rule_version,status,ignored_reason,ignored_until,ignored_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16,$17) ON CONFLICT (audit_id,fingerprint) DO UPDATE SET evidence=EXCLUDED.evidence, status=EXCLUDED.status, updated_at=now() RETURNING *`,
        [randomUUID(), item.workspaceId, item.siteId, item.auditId, item.pageId ?? null, item.fingerprint, item.category, item.severity, item.title, item.description, JSON.stringify(item.evidence), item.recommendation ?? null, item.ruleVersion, item.status, item.ignoredReason ?? null, item.ignoredUntil ?? null, item.ignoredBy ?? null]
      );
      result.push(mapFinding(row.rows[0]));
    }
    return result;
  }

  async saveMetrics(input: Omit<AuditMetricRecord, 'id'>[]) {
    const result: AuditMetricRecord[] = [];
    for (const item of input) {
      const row = await this.pool.query(
        'INSERT INTO site_audit_metrics (id,workspace_id,site_id,audit_id,metric_name,source_type,provider,device,data_window,value,status,estimated,collected_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *',
        [randomUUID(), item.workspaceId, item.siteId, item.auditId, item.metricName, item.sourceType, item.provider ?? null, item.device ?? null, item.window ?? null, item.value ?? null, item.status, item.estimated, item.collectedAt]
      );
      result.push(mapMetric(row.rows[0]));
    }
    return result;
  }

  async getBundle(workspaceId: string, auditId: string) {
    const auditRow = await this.pool.query('SELECT * FROM site_audit_results WHERE id=$1', [auditId]);
    if (!auditRow.rows[0]) return undefined;
    const [pageRows, findingRows, recheckRows, metricRows] = await Promise.all([
      this.pool.query('SELECT * FROM site_audit_pages WHERE workspace_id=$1 AND audit_id=$2 ORDER BY created_at', [workspaceId, auditId]),
      this.pool.query('SELECT * FROM site_audit_findings WHERE workspace_id=$1 AND audit_id=$2 ORDER BY severity DESC, created_at', [workspaceId, auditId]),
      this.pool.query('SELECT * FROM site_audit_rechecks WHERE workspace_id=$1 AND finding_id IN (SELECT id FROM site_audit_findings WHERE audit_id=$2)', [workspaceId, auditId]),
      this.pool.query('SELECT * FROM site_audit_metrics WHERE workspace_id=$1 AND audit_id=$2 ORDER BY collected_at', [workspaceId, auditId])
    ]);
    const audit: SiteAuditResult = {
      id: auditRow.rows[0].id, siteId: auditRow.rows[0].site_id, status: auditRow.rows[0].status,
      overallScore: auditRow.rows[0].overall_score == null ? undefined : Number(auditRow.rows[0].overall_score),
      pagesCrawled: Number(auditRow.rows[0].pages_crawled), pagesIndexed: Number(auditRow.rows[0].pages_indexed),
      serpapiCreditsUsed: Number(auditRow.rows[0].serpapi_credits_used), errorMessage: auditRow.rows[0].error_message ?? undefined,
      startedAt: auditRow.rows[0].started_at ? new Date(auditRow.rows[0].started_at).toISOString() : undefined,
      completedAt: auditRow.rows[0].completed_at ? new Date(auditRow.rows[0].completed_at).toISOString() : undefined,
      createdAt: new Date(auditRow.rows[0].created_at).toISOString()
    };
    return {
      audit, pages: pageRows.rows.map(mapPage), findings: findingRows.rows.map(mapFinding),
      rechecks: recheckRows.rows.map((row) => ({ id: row.id, workspaceId: row.workspace_id, siteId: row.site_id, findingId: row.finding_id, auditId: row.audit_id ?? undefined, disposition: row.disposition, evidence: row.evidence ?? {}, createdAt: new Date(row.created_at).toISOString() })),
      metrics: metricRows.rows.map(mapMetric), partialReasons: audit.status === 'partial' ? [audit.errorMessage ?? '部分頁面檢查失敗'] : []
    };
  }

  async getFinding(workspaceId: string, findingId: string) {
    const row = await this.pool.query('SELECT * FROM site_audit_findings WHERE workspace_id=$1 AND id=$2', [workspaceId, findingId]);
    return row.rows[0] ? mapFinding(row.rows[0]) : undefined;
  }

  async updateFinding(findingId: string, updates: Partial<Pick<AuditFindingRecord, 'status' | 'ignoredReason' | 'ignoredUntil' | 'ignoredBy' | 'remediationTaskId'>>) {
    const columns: string[] = [];
    const values: unknown[] = [];
    const fields: Array<[keyof typeof updates, string]> = [['status', 'status'], ['ignoredReason', 'ignored_reason'], ['ignoredUntil', 'ignored_until'], ['ignoredBy', 'ignored_by'], ['remediationTaskId', 'remediation_task_id']];
    fields.forEach(([key, column]) => { if (updates[key] !== undefined) { values.push(updates[key]); columns.push(`${column}=$${values.length}`); } });
    if (!columns.length) return undefined;
    values.push(findingId);
    const row = await this.pool.query(`UPDATE site_audit_findings SET ${columns.join(',')}, updated_at=now() WHERE id=$${values.length} RETURNING *`, values);
    return row.rows[0] ? mapFinding(row.rows[0]) : undefined;
  }

  async addRecheck(input: Omit<AuditRecheckRecord, 'id' | 'createdAt'>) {
    const row = await this.pool.query('INSERT INTO site_audit_rechecks (id,workspace_id,site_id,finding_id,audit_id,disposition,evidence) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING *', [randomUUID(), input.workspaceId, input.siteId, input.findingId, input.auditId ?? null, input.disposition, JSON.stringify(input.evidence)]);
    const value = row.rows[0];
    return { id: value.id, workspaceId: value.workspace_id, siteId: value.site_id, findingId: value.finding_id, auditId: value.audit_id ?? undefined, disposition: value.disposition, evidence: value.evidence ?? {}, createdAt: new Date(value.created_at).toISOString() };
  }

  async createMonitor(input: Omit<MonitorConfigRecord, 'id' | 'createdAt' | 'updatedAt'>) {
    const row = await this.pool.query('INSERT INTO monitor_configs (id,workspace_id,site_id,kind,target_url,frequency,timezone,threshold,status,quiet_period_minutes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *', [randomUUID(), input.workspaceId, input.siteId, input.kind, input.targetUrl ?? null, input.frequency, input.timezone, input.threshold, input.status, input.quietPeriodMinutes]);
    return mapMonitor(row.rows[0]);
  }

  async listMonitors(workspaceId: string, siteId?: string) {
    const row = await this.pool.query('SELECT * FROM monitor_configs WHERE workspace_id=$1 AND ($2::uuid IS NULL OR site_id=$2) ORDER BY created_at DESC', [workspaceId, siteId ?? null]);
    return row.rows.map(mapMonitor);
  }

  async listDueMonitors(_now: string) {
    void _now;
    const row = await this.pool.query(
      `SELECT config.*
       FROM monitor_configs config
       LEFT JOIN LATERAL (
         SELECT scheduled_at FROM monitor_runs
         WHERE config_id = config.id
         ORDER BY scheduled_at DESC LIMIT 1
       ) latest ON true
       WHERE config.status = 'active' AND (
         latest.scheduled_at IS NULL OR latest.scheduled_at <= now() - CASE config.frequency
           WHEN 'daily' THEN interval '1 day'
           WHEN 'weekly' THEN interval '7 days'
           ELSE interval '30 days'
         END
       )
       ORDER BY config.created_at ASC
       LIMIT 25`
    );
    return row.rows.map(mapMonitor);
  }

  async createMonitorRun(input: Omit<MonitorRunRecord, 'id' | 'createdAt'>) {
    const row = await this.pool.query(
      `INSERT INTO monitor_runs (id,workspace_id,config_id,scheduled_at,status,provider,model,locale,device,sampled_at,estimated,error_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (config_id,scheduled_at) DO UPDATE SET status=monitor_runs.status
       RETURNING *`,
      [randomUUID(), input.workspaceId, input.configId, input.scheduledAt, input.status, input.provider ?? null, input.model ?? null, input.locale ?? null, input.device ?? null, input.sampledAt ?? null, input.estimated, input.errorCode ?? null]
    );
    return mapMonitorRun(row.rows[0]);
  }

  async completeMonitorRun(runId: string, status: MonitorRunRecord['status'], errorCode?: string) {
    const row = await this.pool.query(
      'UPDATE monitor_runs SET status=$1, error_code=$2, sampled_at=now() WHERE id=$3 RETURNING *',
      [status, errorCode ?? null, runId]
    );
    return row.rows[0] ? mapMonitorRun(row.rows[0]) : undefined;
  }

  async getLatestAuditScore(workspaceId: string, siteId: string) {
    const row = await this.pool.query(
      `SELECT result.overall_score, COALESCE(result.completed_at, result.created_at) AS collected_at
       FROM site_audit_results result
       JOIN site_connections site ON site.id = result.site_id
       WHERE result.site_id=$1 AND site.workspace_id=$2
         AND result.status IN ('completed', 'partial')
       ORDER BY result.created_at DESC LIMIT 1`,
      [siteId, workspaceId]
    );
    if (!row.rows[0]) return undefined;
    return {
      score: row.rows[0].overall_score === null ? undefined : Number(row.rows[0].overall_score),
      collectedAt: new Date(row.rows[0].collected_at).toISOString()
    };
  }

  async getLatestMonitorEvent(workspaceId: string, configId: string) {
    const row = await this.pool.query(
      'SELECT * FROM monitor_events WHERE workspace_id=$1 AND config_id=$2 ORDER BY created_at DESC LIMIT 1',
      [workspaceId, configId]
    );
    return row.rows[0] ? mapEvent(row.rows[0]) : undefined;
  }

  async saveMonitorEvent(input: Omit<MonitorEventRecord, 'id' | 'createdAt'>) {
    const row = await this.pool.query('INSERT INTO monitor_events (id,workspace_id,site_id,config_id,run_id,fingerprint,event_type,severity,baseline,current_value,delta,source_type,recommendation,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb) ON CONFLICT (run_id,fingerprint) DO UPDATE SET metadata=EXCLUDED.metadata RETURNING *', [randomUUID(), input.workspaceId, input.siteId, input.configId, input.runId, input.fingerprint, input.eventType, input.severity, input.baseline ?? null, input.currentValue ?? null, input.delta ?? null, input.sourceType, input.recommendation ?? null, JSON.stringify(input.metadata)]);
    return mapEvent(row.rows[0]);
  }

  async listMonitorEvents(workspaceId: string, siteId: string | undefined, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const [rows, count] = await Promise.all([
      this.pool.query('SELECT * FROM monitor_events WHERE workspace_id=$1 AND ($2::uuid IS NULL OR site_id=$2) ORDER BY created_at DESC LIMIT $3 OFFSET $4', [workspaceId, siteId ?? null, pageSize, offset]),
      this.pool.query('SELECT COUNT(*)::int AS total FROM monitor_events WHERE workspace_id=$1 AND ($2::uuid IS NULL OR site_id=$2)', [workspaceId, siteId ?? null])
    ]);
    return { items: rows.rows.map(mapEvent), total: Number(count.rows[0].total) };
  }

  async createAlert(input: Omit<AlertRecord, 'id' | 'createdAt'>) {
    const row = await this.pool.query('INSERT INTO alerts (id,workspace_id,site_id,event_id,channel,status,muted_until,sent_at,read_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (event_id,channel) DO UPDATE SET status=alerts.status RETURNING *', [randomUUID(), input.workspaceId, input.siteId, input.eventId, input.channel, input.status, input.mutedUntil ?? null, input.sentAt ?? null, input.readAt ?? null]);
    return mapAlert(row.rows[0]);
  }

  async listAlerts(workspaceId: string, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const [rows, count] = await Promise.all([
      this.pool.query('SELECT * FROM alerts WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [workspaceId, pageSize, offset]),
      this.pool.query('SELECT COUNT(*)::int AS total FROM alerts WHERE workspace_id=$1', [workspaceId])
    ]);
    return { items: rows.rows.map(mapAlert), total: Number(count.rows[0].total) };
  }

  async muteAlert(workspaceId: string, alertId: string, mutedUntil: string) {
    const row = await this.pool.query('UPDATE alerts SET status=\'muted\', muted_until=$1 WHERE id=$2 AND workspace_id=$3 RETURNING *', [mutedUntil, alertId, workspaceId]);
    return row.rows[0] ? mapAlert(row.rows[0]) : undefined;
  }

  async close() { await this.pool.end(); }
}

export function createDefaultSiteAuditMonitoringRepository(databaseUrl?: string): SiteAuditMonitoringRepository {
  return databaseUrl ? new PostgresSiteAuditMonitoringRepository(databaseUrl) : createInMemorySiteAuditMonitoringRepository();
}

export interface CruxFieldSnapshot {
  origin: string;
  window: string;
  status: 'available' | 'unavailable' | 'error';
  metrics: Record<string, number | undefined>;
  provider: 'crux';
  collectedAt: string;
  errorCode?: string;
}

const cruxCache = new Map<string, { expiresAt: number; value: CruxFieldSnapshot }>();
const auditLighthouseService = createLighthouseService();

export async function fetchCruxFieldData(targetUrl: string, options: { apiKey?: string; fetchImpl?: typeof fetch; timeoutMs?: number } = {}): Promise<CruxFieldSnapshot> {
  const parsed = new URL(targetUrl);
  const origin = parsed.origin;
  const cached = cruxCache.get(origin);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const apiKey = (options.apiKey ?? apiConfig.CRUX_API_KEY ?? '').trim();
  if (!apiKey) {
    return { origin, window: '28d', status: 'unavailable', metrics: {}, provider: 'crux', collectedAt: nowIso(), errorCode: 'CRUX_NOT_CONFIGURED' };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000);
  try {
    const endpoint = apiConfig.CRUX_API_URL ?? 'https://chromeuxreport.googleapis.com/v1/records:queryRecord';
    const response = await (options.fetchImpl ?? fetch)(endpoint + '?key=' + encodeURIComponent(apiKey), {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ origin }), signal: controller.signal
    });
    if (response.status === 404) {
      const value = { origin, window: '28d', status: 'unavailable' as const, metrics: {}, provider: 'crux' as const, collectedAt: nowIso(), errorCode: 'CRUX_NO_SAMPLE' };
      cruxCache.set(origin, { expiresAt: Date.now() + 15 * 60_000, value });
      return value;
    }
    if (!response.ok) return { origin, window: '28d', status: 'error', metrics: {}, provider: 'crux', collectedAt: nowIso(), errorCode: 'CRUX_PROVIDER_ERROR' };
    const payload = await response.json() as { record?: { metrics?: Record<string, { percentiles?: { p75?: number } }> } };
    const metrics: Record<string, number | undefined> = {};
    for (const [name, metric] of Object.entries(payload.record?.metrics ?? {})) metrics[name] = metric.percentiles?.p75;
    const value = { origin, window: '28d', status: Object.keys(metrics).length ? 'available' as const : 'unavailable' as const, metrics, provider: 'crux' as const, collectedAt: nowIso(), errorCode: Object.keys(metrics).length ? undefined : 'CRUX_NO_SAMPLE' };
    cruxCache.set(origin, { expiresAt: Date.now() + 15 * 60_000, value });
    return value;
  } catch (error) {
    return { origin, window: '28d', status: 'error', metrics: {}, provider: 'crux', collectedAt: nowIso(), errorCode: error instanceof Error && error.name === 'AbortError' ? 'CRUX_TIMEOUT' : 'CRUX_REQUEST_FAILED' };
  } finally { clearTimeout(timeout); }
}

function calculateDeterministicScore(findings: DeterministicFinding[]) {
  const penalties: Record<DeterministicFinding['severity'], number> = { critical: 25, high: 15, medium: 8, low: 3 };
  const penalty = findings.reduce((total, finding) => total + penalties[finding.severity] * Math.min(finding.affectedCount, 5), 0);
  return Math.max(0, Math.round(100 - penalty));
}

async function saveAuditMetrics(
  repository: SiteAuditMonitoringRepository,
  workspaceId: string,
  siteId: string,
  auditId: string,
  overallScore: number | undefined,
  siteUrl: string
) {
  const crux = await fetchCruxFieldData(siteUrl);
  const fieldMetrics = Object.entries(crux.metrics).map(([metricName, value]) => ({
    workspaceId, siteId, auditId, metricName, sourceType: 'crux_field' as const,
    provider: crux.provider, window: crux.window, value, status: crux.status,
    estimated: false, collectedAt: crux.collectedAt
  }));
  if (!fieldMetrics.length) {
    fieldMetrics.push({
      workspaceId, siteId, auditId, metricName: 'field_data', sourceType: 'crux_field' as const,
      provider: crux.provider, window: crux.window, value: undefined, status: crux.status,
      estimated: false, collectedAt: crux.collectedAt
    });
  }
  const metrics: Omit<AuditMetricRecord, 'id'>[] = [
    {
      workspaceId, siteId, auditId, metricName: 'overall_score', sourceType: 'deterministic_check',
      value: overallScore, status: overallScore === undefined ? 'unavailable' : 'available',
      estimated: false, collectedAt: nowIso()
    },
    ...fieldMetrics
  ];
  if (apiConfig.SITE_AUDIT_LIGHTHOUSE_ENABLED) {
    try {
      const lighthouse = await Promise.race([
        auditLighthouseService.auditUrl(siteUrl, 'mobile'),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('LIGHTHOUSE_TIMEOUT')), 12_000))
      ]);
      metrics.push(
        { workspaceId, siteId, auditId, metricName: 'performance_score', sourceType: 'lighthouse_lab', provider: 'lighthouse', device: 'mobile', value: lighthouse.scores.performance, status: 'available', estimated: false, collectedAt: lighthouse.timestamp },
        { workspaceId, siteId, auditId, metricName: 'seo_score', sourceType: 'lighthouse_lab', provider: 'lighthouse', device: 'mobile', value: lighthouse.scores.seo, status: 'available', estimated: false, collectedAt: lighthouse.timestamp },
        { workspaceId, siteId, auditId, metricName: 'largest_contentful_paint', sourceType: 'lighthouse_lab', provider: 'lighthouse', device: 'mobile', value: lighthouse.metrics.largestContentfulPaint.value, status: 'available', estimated: false, collectedAt: lighthouse.timestamp }
      );
    } catch {
      metrics.push({ workspaceId, siteId, auditId, metricName: 'lighthouse_lab', sourceType: 'lighthouse_lab', provider: 'lighthouse', device: 'mobile', status: 'error', estimated: false, collectedAt: nowIso() });
    }
  }
  await repository.saveMetrics(metrics);
}

async function executeConnectedSiteAudit(
  workspaceId: string,
  siteId: string,
  siteUrl: string,
  pageLimit: number,
  auditRepository: SiteAuditRepository,
  monitoringRepository: SiteAuditMonitoringRepository,
  targetUrl?: string
) {
  await validatePublicUrl(siteUrl);
  const audit = await auditRepository.createAuditResult(siteId, {
    status: 'running', pagesCrawled: 0, pagesIndexed: 0, serpapiCreditsUsed: 0, startedAt: nowIso()
  });
  monitoringRepository.registerAudit(audit);
  try {
    const crawl = targetUrl
      ? await crawlConnectedPage(siteUrl, targetUrl)
      : await crawlConnectedSite(siteUrl, pageLimit);
    const graphFindings = analyzeAuditPageGraph(crawl.pages, siteUrl, {
      includeOrphanCheck: !targetUrl
    });
    const pageRecords = await monitoringRepository.savePages(crawl.pages.map((page) => ({
      workspaceId, siteId, auditId: audit.id, url: page.finalUrl,
      normalizedUrl: normalizeAuditUrl(page.finalUrl), httpStatus: page.httpStatus,
      contentType: page.contentType, title: page.title, canonicalUrl: page.canonicalUrl,
      robotsIndexable: page.robotsIndexable, hasSchema: page.hasSchema,
      internalLinksCount: (page.internalLinks ?? []).filter((link) => {
        try { return new URL(link).origin === new URL(siteUrl).origin; } catch { return false; }
      }).length,
      externalLinksCount: (page.internalLinks ?? []).filter((link) => {
        try { return new URL(link).origin !== new URL(siteUrl).origin; } catch { return false; }
      }).length,
      crawlStatus: page.crawlStatus, errorCode: page.errorCode
    })));
    const pageByUrl = new Map(pageRecords.map((page) => [page.normalizedUrl, page.id]));
    const overallScore = calculateDeterministicScore(graphFindings);
    const status = crawl.partialReasons.length ? 'partial' as const : 'completed' as const;
    const updated = await auditRepository.updateAuditResult(audit.id, {
      status, overallScore, pagesCrawled: pageRecords.length, pagesIndexed: 0,
      errorMessage: crawl.partialReasons.length ? crawl.partialReasons.join(',') : undefined,
      completedAt: nowIso()
    });
    const finalAudit = updated ?? audit;
    monitoringRepository.registerAudit(finalAudit);
    await auditRepository.saveIssues(audit.id, siteId, graphFindings.map((finding) => ({
      category: finding.category as SiteAuditIssueData['category'], severity: finding.severity,
      title: finding.title, description: finding.description, url: finding.url,
      affectedUrls: finding.affectedUrls,
      affectedCount: finding.affectedCount, recommendation: finding.recommendation,
      sampleUrls: finding.resourceUrls
    })));
    await monitoringRepository.saveFindings(graphFindings.map((finding) => ({
      workspaceId, siteId, auditId: audit.id,
      pageId: finding.url ? pageByUrl.get(normalizeAuditUrl(finding.url)) : undefined,
      fingerprint: createIssueFingerprint({ category: finding.category, url: finding.url, title: finding.title }),
      category: finding.category, severity: finding.severity, title: finding.title,
      description: finding.description,
      evidence: {
        affectedCount: finding.affectedCount,
        url: finding.url,
        affectedUrls: finding.affectedUrls ?? [],
        resourceUrls: finding.resourceUrls ?? []
      },
      recommendation: finding.recommendation, ruleVersion: 'ph2-10.2', status: status === 'partial' ? 'partial' as const : 'open' as const
    })));
    await saveAuditMetrics(monitoringRepository, workspaceId, siteId, audit.id, overallScore, targetUrl ?? siteUrl);
    return monitoringRepository.getBundle(workspaceId, audit.id);
  } catch (error) {
    const code = error instanceof Error && error.message === 'UNSAFE_TARGET_URL' ? 'UNSAFE_TARGET_URL' : 'SITE_AUDIT_CRAWL_FAILED';
    const failed = await auditRepository.updateAuditResult(audit.id, { status: 'failed', errorMessage: code, completedAt: nowIso() });
    monitoringRepository.registerAudit(failed ?? audit);
    return monitoringRepository.getBundle(workspaceId, audit.id);
  }
}

function validationError(reply: FastifyReply, error: z.ZodError) {
  return reply.status(400).send({ success: false, message: '請求資料格式不正確', error: { code: 'VALIDATION_ERROR', details: error.issues } });
}

interface IdempotentWriteContext {
  key: string;
  requestHash: string;
}

async function beginIdempotentWrite(
  repository: Phase2Repository,
  request: FastifyRequest,
  reply: FastifyReply,
  user: AuthUser
): Promise<IdempotentWriteContext | undefined> {
  const idempotency = await readIdempotency(repository, request, createRequestContext(request, user));
  if (sendIdempotencyError(reply, idempotency)) return undefined;
  if (idempotency.existing) {
    reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    return undefined;
  }
  return { key: idempotency.key, requestHash: idempotency.requestHash };
}

async function saveIdempotentResponse(
  repository: Phase2Repository,
  request: FastifyRequest,
  workspaceId: string,
  context: IdempotentWriteContext,
  statusCode: number,
  responseBody: ApiResponse<unknown>
) {
  return repository.saveIdempotency({
    workspaceId,
    method: request.method,
    route: getRouteKey(request),
    key: context.key,
    requestHash: context.requestHash,
    statusCode,
    responseBody,
    createdAt: nowIso()
  });
}

const runSchema = z.object({ pageLimit: z.number().int().min(1).max(maxConnectedAuditPages).optional() });
const manualRunSchema = z.object({
  targetUrl: z.string().url().max(2_048).optional(),
  contentCmsId: z.string().trim().min(1).max(80).optional()
}).superRefine((value, context) => {
  if (Boolean(value.targetUrl) === Boolean(value.contentCmsId)) {
    context.addIssue({
      code: 'custom',
      message: '請提供一個站內 URL 或一個已同步內容 ID',
      path: ['targetUrl']
    });
  }
});
const ignoreSchema = z.object({ reason: z.string().trim().min(3).max(500), until: z.string().datetime().optional() });
const recheckSchema = z.object({ found: z.boolean(), partial: z.boolean().optional(), evidence: z.record(z.string(), z.unknown()).optional() });
const monitorSchema = z.object({ siteId: z.string().uuid(), kind: z.enum(['competitor', 'ai_visibility', 'technical']), targetUrl: z.string().url().optional(), frequency: z.enum(['daily', 'weekly', 'monthly']).default('weekly'), timezone: z.string().min(1).max(80).default('UTC'), threshold: z.number().finite().default(0), quietPeriodMinutes: z.number().int().min(0).max(43_200).default(1_440) });

export function registerSiteAuditMonitoringRoutes(
  app: FastifyInstance,
  siteRepository: SiteConnectionRepository,
  auditRepository: SiteAuditRepository,
  monitoringRepository: SiteAuditMonitoringRepository,
  authService: AuthService,
  phase2Repository: Phase2Repository,
  governance?: TaskGovernance
) {
  app.addHook('onClose', async () => { await monitoringRepository.close?.(); });

  app.post<{ Params: { siteId: string } }>('/api/v1/site-connections/:siteId/site-audit/runs', async (request, reply) => {
    const user = await requireAuth(authService, request, reply); if (!user) return reply;
    const idempotentWrite = await beginIdempotentWrite(phase2Repository, request, reply, user);
    if (!idempotentWrite) return reply;
    const site = await siteRepository.findForWorkspace(request.params.siteId, user.workspaceId);
    if (!site) return reply.status(404).send({ success: false, message: '找不到站點連接', error: { code: 'SITE_NOT_FOUND' } });
    const parsed = runSchema.safeParse(request.body ?? {}); if (!parsed.success) return validationError(reply, parsed.error);
    if (!governance && process.env.NODE_ENV === 'production') {
      return reply.status(503).send({ success: false, message: '稽核治理服務暫時不可用', error: { code: 'RATE_LIMIT_UNAVAILABLE' } });
    }
    if (governance) {
      const limit = await governance.consume(`workspace:${user.workspaceId}:site-audit-monitoring`, { capacity: 10, refillWindowMs: 60_000 });
      if (!limit.allowed) return reply.status(429).send({ success: false, message: '稽核建立過於頻繁，請稍後再試', error: { code: 'RATE_LIMIT_EXCEEDED', retryAfterSec: Math.ceil(limit.retryAfterMs / 1_000) } });
    }
    let bundle: AuditBundle | undefined;
    try {
      bundle = await executeConnectedSiteAudit(
        user.workspaceId,
        site.id,
        site.siteUrl,
        parsed.data.pageLimit ?? maxConnectedAuditPages,
        auditRepository,
        monitoringRepository
      );
    } catch (error) {
      if (error instanceof UnsafeTargetUrlError) {
        return reply.status(400).send({ success: false, message: '目標網址不符合安全抓取規則', error: { code: 'UNSAFE_TARGET_URL' } });
      }
      return reply.status(502).send({ success: false, message: '網站檢測暫時無法完成，請稍後重試', error: { code: 'SITE_AUDIT_CRAWL_FAILED' } });
    }
    const response = {
      success: true,
      message: bundle?.audit.status === 'failed' ? '稽核未能完成' : bundle?.audit.status === 'partial' ? '稽核部分完成' : '稽核已完成',
      data: bundle
    } satisfies ApiResponse<unknown>;
    const saved = await saveIdempotentResponse(phase2Repository, request, user.workspaceId, idempotentWrite, 201, response);
    return reply.status(saved.statusCode).send(saved.responseBody);
  });

  app.post<{ Params: { siteId: string } }>('/api/v1/site-connections/:siteId/site-audit/manual-runs', async (request, reply) => {
    const user = await requireAuth(authService, request, reply); if (!user) return reply;
    const idempotentWrite = await beginIdempotentWrite(phase2Repository, request, reply, user);
    if (!idempotentWrite) return reply;
    const site = await siteRepository.findForWorkspace(request.params.siteId, user.workspaceId);
    if (!site) return reply.status(404).send({ success: false, message: '找不到站點連接', error: { code: 'SITE_NOT_FOUND' } });
    const parsed = manualRunSchema.safeParse(request.body ?? {}); if (!parsed.success) return validationError(reply, parsed.error);
    if (!governance && process.env.NODE_ENV === 'production') {
      return reply.status(503).send({ success: false, message: '稽核治理服務暫時不可用', error: { code: 'RATE_LIMIT_UNAVAILABLE' } });
    }
    if (governance) {
      const limit = await governance.consume(`workspace:${user.workspaceId}:site-audit-manual`, { capacity: 10, refillWindowMs: 60_000 });
      if (!limit.allowed) return reply.status(429).send({ success: false, message: '單頁檢測建立過於頻繁，請稍後再試', error: { code: 'RATE_LIMIT_EXCEEDED', retryAfterSec: Math.ceil(limit.retryAfterMs / 1_000) } });
    }

    const content = parsed.data.contentCmsId
      ? await siteRepository.findArticle(site.id, parsed.data.contentCmsId)
      : undefined;
    if (parsed.data.contentCmsId && !content) {
      return reply.status(404).send({ success: false, message: '找不到已同步內容', error: { code: 'CONTENT_NOT_FOUND' } });
    }
    if (content && content.type !== 'post' && content.type !== 'product') {
      return reply.status(422).send({ success: false, message: '只支援分析已同步的文章或商品', error: { code: 'CONTENT_TYPE_NOT_SUPPORTED' } });
    }
    if (content && content.status !== 'publish') {
      return reply.status(422).send({ success: false, message: '只有已發佈內容可以進行公開網址檢測', error: { code: 'CONTENT_NOT_PUBLISHED' } });
    }
    const targetUrl = parsed.data.targetUrl ?? content?.url;
    if (!targetUrl) {
      return reply.status(422).send({ success: false, message: '內容沒有可分析的公開網址', error: { code: 'CONTENT_URL_UNAVAILABLE' } });
    }
    try {
      const [siteTarget, pageTarget] = await Promise.all([validatePublicUrl(site.siteUrl), validatePublicUrl(targetUrl)]);
      if (siteTarget.url.origin !== pageTarget.url.origin) {
        return reply.status(400).send({ success: false, message: '只能分析已連接網站同一 origin 的網址', error: { code: 'AUDIT_TARGET_OUTSIDE_SITE' } });
      }
    } catch (error) {
      if (error instanceof UnsafeTargetUrlError) {
        return reply.status(400).send({ success: false, message: '目標網址不符合安全抓取規則', error: { code: 'UNSAFE_TARGET_URL' } });
      }
      return reply.status(502).send({ success: false, message: '目標網址暫時無法驗證', error: { code: 'SITE_AUDIT_TARGET_VALIDATION_FAILED' } });
    }

    const bundle = await executeConnectedSiteAudit(
      user.workspaceId,
      site.id,
      site.siteUrl,
      1,
      auditRepository,
      monitoringRepository,
      targetUrl
    );
    const response = {
      success: true,
      message: bundle?.audit.status === 'failed' ? '單頁檢測未能完成' : bundle?.audit.status === 'partial' ? '單頁檢測部分完成' : '單頁檢測已完成',
      data: {
        bundle,
        target: content
          ? { kind: 'synced_content', cmsId: content.cmsId, contentType: content.type, url: targetUrl }
          : { kind: 'manual_url', url: targetUrl },
        writebackEnabled: false
      }
    } satisfies ApiResponse<unknown>;
    const saved = await saveIdempotentResponse(phase2Repository, request, user.workspaceId, idempotentWrite, 201, response);
    return reply.status(saved.statusCode).send(saved.responseBody);
  });

  app.get<{ Params: { runId: string } }>('/api/v1/site-audit/runs/:runId', async (request, reply) => {
    const user = await requireAuth(authService, request, reply); if (!user) return reply;
    const bundle = await monitoringRepository.getBundle(user.workspaceId, request.params.runId);
    if (!bundle) return reply.status(404).send({ success: false, message: '找不到稽核結果', error: { code: 'AUDIT_NOT_FOUND' } });
    return { success: true, message: '操作成功', data: bundle };
  });

  app.post<{ Params: { findingId: string } }>('/api/v1/site-audit/findings/:findingId/tasks', async (request, reply) => {
    const user = await requireAuth(authService, request, reply); if (!user) return reply;
    const idempotentWrite = await beginIdempotentWrite(phase2Repository, request, reply, user);
    if (!idempotentWrite) return reply;
    const finding = await monitoringRepository.getFinding(user.workspaceId, request.params.findingId);
    if (!finding) return reply.status(404).send({ success: false, message: '找不到稽核問題', error: { code: 'FINDING_NOT_FOUND' } });
    const task = await phase2Repository.createTask({ workspaceId: user.workspaceId, siteId: finding.siteId, kind: 'content_optimization', estimatedCredits: 0, idempotencyKey: idempotentWrite.key, requestHash: idempotentWrite.requestHash, requestId: request.id });
    const updatedFinding = await monitoringRepository.updateFinding(finding.id, { remediationTaskId: task.id });
    const response = { success: true, message: '修復任務已建立', data: { finding: updatedFinding, task } } satisfies ApiResponse<unknown>;
    const saved = await saveIdempotentResponse(phase2Repository, request, user.workspaceId, idempotentWrite, 201, response);
    return reply.status(saved.statusCode).send(saved.responseBody);
  });

  app.post<{ Params: { findingId: string } }>('/api/v1/site-audit/findings/:findingId/ignore', async (request, reply) => {
    const user = await requireAuth(authService, request, reply); if (!user) return reply;
    const idempotentWrite = await beginIdempotentWrite(phase2Repository, request, reply, user);
    if (!idempotentWrite) return reply;
    const parsed = ignoreSchema.safeParse(request.body); if (!parsed.success) return validationError(reply, parsed.error);
    const finding = await monitoringRepository.getFinding(user.workspaceId, request.params.findingId);
    if (!finding) return reply.status(404).send({ success: false, message: '找不到稽核問題', error: { code: 'FINDING_NOT_FOUND' } });
    const updated = await monitoringRepository.updateFinding(finding.id, { status: 'ignored', ignoredReason: parsed.data.reason, ignoredUntil: parsed.data.until, ignoredBy: user.id });
    const response = { success: true, message: '問題已忽略', data: { finding: updated } } satisfies ApiResponse<unknown>;
    const saved = await saveIdempotentResponse(phase2Repository, request, user.workspaceId, idempotentWrite, 200, response);
    return reply.status(saved.statusCode).send(saved.responseBody);
  });

  app.post<{ Params: { findingId: string } }>('/api/v1/site-audit/findings/:findingId/recheck', async (request, reply) => {
    const user = await requireAuth(authService, request, reply); if (!user) return reply;
    const idempotentWrite = await beginIdempotentWrite(phase2Repository, request, reply, user);
    if (!idempotentWrite) return reply;
    const parsed = recheckSchema.safeParse(request.body); if (!parsed.success) return validationError(reply, parsed.error);
    const finding = await monitoringRepository.getFinding(user.workspaceId, request.params.findingId);
    if (!finding) return reply.status(404).send({ success: false, message: '找不到稽核問題', error: { code: 'FINDING_NOT_FOUND' } });
    const disposition = deriveRecheckDisposition(finding.status, parsed.data.found, parsed.data.partial ?? false);
    const recheck = await monitoringRepository.addRecheck({ workspaceId: user.workspaceId, siteId: finding.siteId, findingId: finding.id, auditId: finding.auditId, disposition, evidence: parsed.data.evidence ?? {} });
    const updated = await monitoringRepository.updateFinding(finding.id, { status: disposition });
    const response = { success: true, message: '重新檢查已完成', data: { finding: updated, recheck } } satisfies ApiResponse<unknown>;
    const saved = await saveIdempotentResponse(phase2Repository, request, user.workspaceId, idempotentWrite, 200, response);
    return reply.status(saved.statusCode).send(saved.responseBody);
  });

  app.post('/api/v1/monitors', async (request, reply) => {
    const user = await requireAuth(authService, request, reply); if (!user) return reply;
    const idempotentWrite = await beginIdempotentWrite(phase2Repository, request, reply, user);
    if (!idempotentWrite) return reply;
    const parsed = monitorSchema.safeParse(request.body); if (!parsed.success) return validationError(reply, parsed.error);
    const site = await siteRepository.findForWorkspace(parsed.data.siteId, user.workspaceId);
    if (!site) return reply.status(404).send({ success: false, message: '找不到站點連接', error: { code: 'SITE_NOT_FOUND' } });
    if (parsed.data.targetUrl) { try { await validatePublicUrl(parsed.data.targetUrl); } catch { return reply.status(400).send({ success: false, message: '目標網址不符合安全抓取規則', error: { code: 'UNSAFE_TARGET_URL' } }); } }
    const monitor = await monitoringRepository.createMonitor({ workspaceId: user.workspaceId, siteId: site.id, kind: parsed.data.kind, targetUrl: parsed.data.targetUrl, frequency: parsed.data.frequency, timezone: parsed.data.timezone, threshold: parsed.data.threshold, status: 'active', quietPeriodMinutes: parsed.data.quietPeriodMinutes });
    const response = { success: true, message: '監控已建立', data: { monitor } } satisfies ApiResponse<unknown>;
    const saved = await saveIdempotentResponse(phase2Repository, request, user.workspaceId, idempotentWrite, 201, response);
    return reply.status(saved.statusCode).send(saved.responseBody);
  });

  app.get<{ Querystring: { siteId?: string } }>('/api/v1/monitors', async (request, reply) => {
    const user = await requireAuth(authService, request, reply); if (!user) return reply;
    const monitors = await monitoringRepository.listMonitors(user.workspaceId, request.query.siteId);
    return { success: true, message: '操作成功', data: { monitors } };
  });

  app.get<{ Querystring: { siteId?: string; page?: string; pageSize?: string } }>('/api/v1/monitor-events', async (request, reply) => {
    const user = await requireAuth(authService, request, reply); if (!user) return reply;
    const page = Math.max(1, Number(request.query.page ?? 1)); const pageSize = Math.min(100, Math.max(1, Number(request.query.pageSize ?? 20)));
    const result = await monitoringRepository.listMonitorEvents(user.workspaceId, request.query.siteId, page, pageSize);
    return { success: true, message: '操作成功', data: { items: result.items, pagination: { page, pageSize, total: result.total, totalPages: result.total ? Math.ceil(result.total / pageSize) : 0 } } };
  });

  app.get<{ Querystring: { page?: string; pageSize?: string } }>('/api/v1/alerts', async (request, reply) => {
    const user = await requireAuth(authService, request, reply); if (!user) return reply;
    const page = Math.max(1, Number(request.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(request.query.pageSize ?? 20)));
    const result = await monitoringRepository.listAlerts(user.workspaceId, page, pageSize);
    return { success: true, message: '操作成功', data: { items: result.items, pagination: { page, pageSize, total: result.total, totalPages: result.total ? Math.ceil(result.total / pageSize) : 0 } } };
  });

  app.post<{ Params: { alertId: string } }>('/api/v1/alerts/:alertId/mute', async (request, reply) => {
    const user = await requireAuth(authService, request, reply); if (!user) return reply;
    const idempotentWrite = await beginIdempotentWrite(phase2Repository, request, reply, user);
    if (!idempotentWrite) return reply;
    const until = new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString();
    const alert = await monitoringRepository.muteAlert(user.workspaceId, request.params.alertId, until);
    if (!alert) return reply.status(404).send({ success: false, message: '找不到告警', error: { code: 'ALERT_NOT_FOUND' } });
    const response = { success: true, message: '告警已靜默 24 小時', data: { alert } } satisfies ApiResponse<unknown>;
    const saved = await saveIdempotentResponse(phase2Repository, request, user.workspaceId, idempotentWrite, 200, response);
    return reply.status(saved.statusCode).send(saved.responseBody);
  });
}
