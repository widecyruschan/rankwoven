import { createHash } from 'node:crypto';

export type AhrefsSiteAuditSeverity = 'error' | 'warning' | 'notice';
export type AhrefsSiteAuditCategory =
  | 'indexability'
  | 'ai_discoverability'
  | 'links'
  | 'redirects'
  | 'content'
  | 'social_tags'
  | 'duplicates'
  | 'localization'
  | 'performance'
  | 'images'
  | 'javascript'
  | 'css'
  | 'sitemaps'
  | 'external_pages'
  | 'other';

export interface AhrefsSiteAuditIssue {
  id: string;
  title: string;
  severity: AhrefsSiteAuditSeverity;
  category: AhrefsSiteAuditCategory;
  affectedPages: number;
  change?: number;
  recommendation: string;
}

export interface AhrefsSiteAuditReport {
  projectId: string;
  crawlDate?: string;
  comparisonDate?: string;
  healthScore?: number;
  crawledUrls?: number;
  issues: AhrefsSiteAuditIssue[];
  rawResponseHash: string;
  collectedAt: string;
}

export interface AhrefsSiteAuditIssuePageResult {
  issueId: string;
  urls: string[];
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface AhrefsSiteAuditRequest {
  apiUrl: string;
  apiKey: string;
  projectId: string;
  crawlDate?: string;
  comparisonDate?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : undefined;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value.replace(/[,%]/g, '').trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readFirstString(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = readString(record[key]);
    if (value) return value;
  }
  return '';
}

function readFirstNumber(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = readNumber(record[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function normalizeSeverity(value: unknown): AhrefsSiteAuditSeverity {
  const normalized = readString(value).toLowerCase();
  if (['error', 'critical', 'high'].includes(normalized)) return 'error';
  if (['warning', 'warn', 'medium'].includes(normalized)) return 'warning';
  return 'notice';
}

function getIssueCategory(title: string): AhrefsSiteAuditCategory {
  const value = title.toLowerCase();
  if (/canonical|noindex|nofollow|indexable|robots/.test(value)) return 'indexability';
  if (/ai crawler|ai-generated|indexnow|training bot|search bot/.test(value)) return 'ai_discoverability';
  if (/incoming internal|outgoing link|orphan|links? to/.test(value)) return 'links';
  if (/redirect|3xx|http to https|https to http|meta refresh/.test(value)) return 'redirects';
  if (/title|meta description|h1|word count|content/.test(value)) return 'content';
  if (/open graph|twitter|social/.test(value)) return 'social_tags';
  if (/duplicate/.test(value)) return 'duplicates';
  if (/hreflang|html lang|localization/.test(value)) return 'localization';
  if (/slow|core web|cls|fid|inp|lcp|viewport|font size|compressed|filesize|performance/.test(value)) return 'performance';
  if (/image|alt text/.test(value)) return 'images';
  if (/javascript/.test(value)) return 'javascript';
  if (/css/.test(value)) return 'css';
  if (/sitemap/.test(value)) return 'sitemaps';
  if (/external/.test(value)) return 'external_pages';
  return 'other';
}

function normalizeIssueCategory(value: string, title: string): AhrefsSiteAuditCategory {
  const normalized = value.toLowerCase().replace(/[\s-]+/g, '_');
  const categoryMap: Record<string, AhrefsSiteAuditCategory> = {
    'internal_pages': 'other',
    indexability: 'indexability',
    'ai_discoverability': 'ai_discoverability',
    links: 'links',
    redirects: 'redirects',
    content: 'content',
    'social_tags': 'social_tags',
    duplicates: 'duplicates',
    localization: 'localization',
    'usability_and_performance': 'performance',
    performance: 'performance',
    images: 'images',
    javascript: 'javascript',
    css: 'css',
    sitemaps: 'sitemaps',
    'external_pages': 'external_pages',
    other: 'other'
  };
  return categoryMap[normalized] ?? getIssueCategory(title);
}

function getRecommendation(title: string): string {
  const value = title.toLowerCase();
  if (/canonical points to redirect/.test(value)) return '將 canonical 更新為最終回應 200 的自我指向 URL，並在重新抓取前驗證該 URL 不再重定向。';
  if (/canonical.*incoming internal links|orphan|only one dofollow incoming/.test(value)) return '從相關文章、分類頁或導航加入至少兩條具語義關聯的內部連結，並指向 canonical URL。';
  if (/non-canonical page in sitemap|redirect in sitemap|4xx page in sitemap|5xx page in sitemap/.test(value)) return '從 Sitemap 移除非 canonical、重定向或錯誤 URL，只保留可索引且回應 200 的 canonical URL。';
  if (/meta description too short|meta description.*missing|meta description too long/.test(value)) return '使用 AI 依頁面主題產生唯一的 120 至 156 字 Meta Description，再由使用者審核後套用。';
  if (/title too long|title too short|title.*missing/.test(value)) return '使用 AI 產生包含主要意圖、長度適中的唯一 SEO Title，再由使用者審核後套用。';
  if (/multiple h1|h1.*missing/.test(value)) return '保留一個描述頁面主題的 H1，其餘段落標題改用 H2 至 H4，並在修改後重新檢測。';
  if (/low word count/.test(value)) return '以使用者搜尋意圖補足原創內容、實例、FAQ 與內部連結；不要只為增加字數而重複關鍵詞。';
  if (/slow server response.*ai|slow page/.test(value)) return '檢查 TTFB、快取、圖片大小與 render-blocking 資源；此問題需要主機或前端層面修復，不能自動寫回內容。';
  if (/indexnow/.test(value)) return '啟用或檢查 IndexNow，將已變更的 canonical URL 提交並保留提交結果以供重新檢查。';
  if (/http to https|https.*http mixed|https page links to http/.test(value)) return '將站內連結、canonical、圖片、CSS 與 JavaScript 更新為 HTTPS，並保留 HTTP 至 HTTPS 的單跳 301。';
  if (/page has no outgoing links/.test(value)) return '在內容中加入至少一條對讀者有幫助的相關內部連結，避免孤立的可索引頁面。';
  if (/open graph|twitter/.test(value)) return '補齊 Open Graph 與 X Card 的 title、description、image、url；URL 應與 canonical 一致。';
  if (/hreflang|html lang/.test(value)) return '檢查 BCP 47 language、每個互相對應的 hreflang、self-reference 與 x-default，並確保全部指向 canonical URL。';
  if (/alt text|image/.test(value)) return '為圖片加入描述其內容與頁面語境的 Alt Text；裝飾性圖片可保留空 Alt。';
  if (/robots/.test(value)) return '檢查 robots.txt 語法、抓取規則與 Sitemap 宣告，避免阻擋應被索引的公開內容。';
  return '先查看受影響 URL 與歷次變化，再以頁面類型、canonical、索引狀態及內容意圖制定修復方案。';
}

function extractIssueRecords(body: unknown): UnknownRecord[] {
  const root = asRecord(body);
  if (!root) return [];
  const directCandidates: unknown[] = [root.issues, root.items, root.results, root.data];
  const data = asRecord(root.data);
  if (data) directCandidates.push(data.issues, data.items, data.results);
  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) {
      return candidate.flatMap((item) => {
        const record = asRecord(item);
        return record ? [record] : [];
      });
    }
  }
  return [];
}

function readNestedNumber(body: UnknownRecord, keys: string[]) {
  const direct = readFirstNumber(body, keys);
  if (direct !== undefined) return direct;
  const data = asRecord(body.data);
  const statistics = asRecord(body.statistics) ?? asRecord(body.stats) ?? asRecord(data?.statistics) ?? asRecord(data?.stats);
  return statistics ? readFirstNumber(statistics, keys) : undefined;
}

function readNestedString(body: UnknownRecord, keys: string[]) {
  const direct = readFirstString(body, keys);
  if (direct) return direct;
  const data = asRecord(body.data);
  return data ? readFirstString(data, keys) : '';
}

function createAhrefsEndpoint(input: AhrefsSiteAuditRequest, resource: 'issues' | 'projects' | 'page-explorer') {
  const endpoint = new URL(input.apiUrl);
  const nextPathname = endpoint.pathname.replace(/\/issues\/?$/, `/${resource}`);
  if (nextPathname === endpoint.pathname && resource !== 'issues') {
    throw new Error('AHREFS_SITE_AUDIT_URL_INVALID');
  }
  endpoint.pathname = nextPathname;
  endpoint.searchParams.set('project_id', input.projectId);
  if (input.crawlDate) endpoint.searchParams.set('date', input.crawlDate);
  if (input.comparisonDate && resource !== 'projects') endpoint.searchParams.set('date_compared', input.comparisonDate);
  return endpoint;
}

async function fetchAhrefsJson(input: AhrefsSiteAuditRequest, endpoint: URL, signal: AbortSignal) {
  const response = await (input.fetchImpl ?? fetch)(endpoint, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${input.apiKey}` },
    signal
  });
  if (!response.ok) throw new Error(`AHREFS_SITE_AUDIT_HTTP_${response.status}`);
  return response.json() as Promise<unknown>;
}

function extractProjectRecord(body: unknown, projectId: string) {
  const root = asRecord(body);
  if (!root) return undefined;
  const data = asRecord(root.data);
  const candidates: unknown[] = [root.projects, root.items, root.results, root.data, data?.projects, data?.items, data?.results];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    for (const value of candidate) {
      const record = asRecord(value);
      if (!record) continue;
      const id = readFirstString(record, ['project_id', 'projectId', 'id']);
      if (!id || id === projectId) return record;
    }
  }
  return undefined;
}

function extractPageUrls(body: unknown) {
  const root = asRecord(body);
  if (!root) return [];
  const data = asRecord(root.data);
  const candidates: unknown[] = [root.pages, root.items, root.results, root.data, data?.pages, data?.items, data?.results];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return Array.from(new Set(candidate.flatMap((value) => {
      const record = asRecord(value);
      const url = record ? readFirstString(record, ['url', 'page_url', 'pageUrl']) : '';
      return url ? [url] : [];
    })));
  }
  return [];
}

export async function fetchAhrefsSiteAuditReport(input: AhrefsSiteAuditRequest): Promise<AhrefsSiteAuditReport> {
  const endpoint = createAhrefsEndpoint(input, 'issues');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 20_000);
  try {
    const body = await fetchAhrefsJson(input, endpoint, controller.signal);
    const root = asRecord(body) ?? {};
    const issues = extractIssueRecords(body).flatMap((record, index) => {
        const title = readFirstString(record, ['issue', 'issue_name', 'name', 'title', 'label']);
        if (!title) return [];
        const rawId = readFirstString(record, ['id', 'issue_id', 'key', 'code']);
        const affectedPages = Math.max(0, Math.round(readFirstNumber(record, ['crawled', 'affected_pages', 'affectedPages', 'url_count', 'urls', 'count', 'current']) ?? 0));
        const change = readFirstNumber(record, ['change', 'change_count', 'changeCount', 'delta']);
        return [{
          id: rawId || createHash('sha256').update(`${title}:${index}`).digest('hex').slice(0, 24),
          title,
          severity: normalizeSeverity(record.severity ?? record.importance ?? record.type),
          category: normalizeIssueCategory(readFirstString(record, ['category']), title),
          affectedPages,
          change: change === undefined ? undefined : Math.round(change),
          recommendation: getRecommendation(title)
        } satisfies AhrefsSiteAuditIssue];
      });
    let projectRecord: UnknownRecord | undefined;
    let projectBody: unknown;
    const rawScore = readNestedNumber(root, ['health_score', 'healthScore']);
    if (rawScore === undefined) {
      try {
        projectBody = await fetchAhrefsJson(input, createAhrefsEndpoint(input, 'projects'), controller.signal);
        projectRecord = extractProjectRecord(projectBody, input.projectId);
      } catch {
        // The issue report remains useful if the optional, free project summary is temporarily unavailable.
      }
    }
    const scoreValue = rawScore ?? (projectRecord ? readFirstNumber(projectRecord, ['health_score', 'healthScore']) : undefined);
    const crawledUrls = readNestedNumber(root, ['crawled_urls', 'crawledUrls', 'urls_crawled', 'total_urls'])
      ?? (projectRecord ? readFirstNumber(projectRecord, ['crawled', 'crawled_urls', 'crawledUrls', 'urls_crawled', 'total_urls']) : undefined);
    return {
      projectId: input.projectId,
      crawlDate: readNestedString(root, ['date', 'crawl_date', 'crawlDate']) || input.crawlDate,
      comparisonDate: readNestedString(root, ['date_compared', 'comparison_date', 'comparisonDate']) || input.comparisonDate,
      healthScore: scoreValue === undefined ? undefined : Math.max(0, Math.min(100, Math.round(scoreValue <= 1 ? scoreValue * 100 : scoreValue))),
      crawledUrls,
      issues,
      rawResponseHash: createHash('sha256').update(JSON.stringify({ issues: body, project: projectBody })).digest('hex'),
      collectedAt: new Date().toISOString()
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AHREFS_SITE_AUDIT_TIMEOUT', { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchAhrefsSiteAuditIssuePages(
  input: AhrefsSiteAuditRequest & { issueId: string; offset?: number; limit?: number }
): Promise<AhrefsSiteAuditIssuePageResult> {
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  const limit = Math.min(1_000, Math.max(1, Math.floor(input.limit ?? 100)));
  const endpoint = createAhrefsEndpoint(input, 'page-explorer');
  endpoint.searchParams.set('issue_id', input.issueId);
  endpoint.searchParams.set('select', 'url');
  endpoint.searchParams.set('offset', String(offset));
  endpoint.searchParams.set('limit', String(limit));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 20_000);
  try {
    const body = await fetchAhrefsJson(input, endpoint, controller.signal);
    const urls = extractPageUrls(body);
    return {
      issueId: input.issueId,
      urls,
      offset,
      limit,
      hasMore: urls.length === limit
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AHREFS_SITE_AUDIT_TIMEOUT', { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
