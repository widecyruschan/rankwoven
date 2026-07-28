import type { FastifyInstance, FastifyReply } from 'fastify';
import { Pool, type QueryResultRow } from 'pg';
import { z } from 'zod';
import { requireAuth, type AuthService } from './auth';
import type { SiteConnectionRepository } from './siteConnections';

// ── Types ────────────────────────────────────────────────────────────────────

export type SiteAuditSchedule = 'weekly' | 'monthly' | 'disabled';
export type SiteAuditCrawlSource = 'website' | 'sitemap' | 'robots_txt';
export type SiteAuditIssueCategory =
  | 'meta_tags'
  | 'headings'
  | 'content_quality'
  | 'links'
  | 'images'
  | 'structured_data'
  | 'mobile'
  | 'performance'
  | 'indexability'
  | 'security'
  | 'other';
export type SiteAuditIssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SiteAuditConfig {
  siteId: string;
  schedule: SiteAuditSchedule;
  pageLimit: number;
  crawlSource: SiteAuditCrawlSource;
  emailNotification: boolean;
  lastAuditAt?: string;
  nextAuditAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SiteAuditResult {
  id: string;
  siteId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  overallScore?: number;
  pagesCrawled: number;
  pagesIndexed: number;
  serpapiCreditsUsed: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface SiteAuditIssue {
  id: string;
  auditId: string;
  siteId: string;
  category: SiteAuditIssueCategory;
  severity: SiteAuditIssueSeverity;
  title: string;
  description: string;
  url?: string;
  affectedCount: number;
  recommendation?: string;
  createdAt: string;
}

export interface SiteAuditResultWithIssues extends SiteAuditResult {
  issues: SiteAuditIssue[];
  issueSummary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    byCategory: Record<string, number>;
  };
}

// ── SerpApi Integration ──────────────────────────────────────────────────────

interface SerpApiOrganicResult {
  position: number;
  title: string;
  link: string;
  displayed_link: string;
  snippet: string;
  date?: string;
}

interface SerpApiSearchResponse {
  search_metadata: { status: string; total_time_taken: number };
  search_information?: { total_results: number };
  organic_results?: SerpApiOrganicResult[];
  pagination?: { current: number; next?: string; other_pages?: Record<string, string> };
  error?: string;
}

const SERPAPI_BASE_URL = 'https://serpapi.com/search';

function getSerpApiKey(): string {
  const raw = process.env.SERPAPI_KEY ?? '';
  const key = raw.trim();
  if (!key) {
    throw new Error('未設定 SERPAPI_KEY 環境變數');
  }
  return key;
}

function getSerpApiMonthlyLimit(): number {
  const limit = process.env.SERPAPI_MONTHLY_LIMIT;
  return Number(limit) || 250;
}

export class SerpApiQuotaExceededError extends Error {
  public readonly code = 'SERPAPI_QUOTA_EXCEEDED';
  public readonly used: number;
  public readonly limit: number;

  constructor(used: number, limit: number) {
    super(`SerpApi 本月配額已用盡（已用 ${used}/${limit}）`);
    this.name = 'SerpApiQuotaExceededError';
    this.used = used;
    this.limit = limit;
  }
}

/**
 * 透過 SerpApi 查詢 Google `site:` 搜尋，找出網站已建立索引的頁面。
 * 支援分頁取得結果，最多回傳 pageLimit 筆。
 */
async function fetchIndexedPages(
  domain: string,
  pageLimit: number
): Promise<{ pages: SerpApiOrganicResult[]; totalResults: number; creditsUsed: number }> {
  const key = getSerpApiKey();
  const pages: SerpApiOrganicResult[] = [];
  let totalResults = 0;
  let creditsUsed = 0;
  let start = 0;

  while (pages.length < pageLimit && start < 100) {
    const params = new URLSearchParams({
      engine: 'google',
      q: `site:${domain}`,
      api_key: key,
      num: `${Math.min(100, pageLimit - pages.length)}`,
      start: `${start}`,
      hl: 'zh-TW',
      gl: 'hk'
    });

    const response = await fetch(`${SERPAPI_BASE_URL}?${params}`);
    creditsUsed += 1;

    if (!response.ok) {
      console.error(
        `[siteAudit] SerpApi HTTP ${response.status} ${response.statusText} for site:${domain}`
      );
      break;
    }

    const data: SerpApiSearchResponse = await response.json();

    if (data.error) {
      const errMsg = data.error;
      console.error(`[siteAudit] SerpApi error for site:${domain}: ${errMsg}`);
      // 判斷是否為 API key 無效
      if (errMsg.toLowerCase().includes('invalid') || errMsg.toLowerCase().includes('api key')) {
        throw new Error(`SerpApi 驗證失敗：${errMsg}。請檢查 SERPAPI_KEY 是否正確。`);
      }
      throw new Error(`SerpApi 查詢失敗：${errMsg}`);
    }

    if (data.organic_results) {
      for (const result of data.organic_results) {
        if (pages.length >= pageLimit) break;
        pages.push(result);
      }
    }

    if (data.search_information?.total_results) {
      totalResults = data.search_information.total_results;
    }

    // 檢查是否有下一頁
    if (!data.pagination?.next || data.organic_results?.length === 0) {
      break;
    }

    start += 100;
  }

  return { pages, totalResults, creditsUsed };
}

/**
 * 從 domain URL 中擷取 domain（去掉 protocol 和路徑）。
 */
function extractDomain(siteUrl: string): string {
  try {
    const url = new URL(siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`);
    return url.hostname;
  } catch {
    return siteUrl.replace(/^https?:\/\//, '').replace(/\/.*/, '');
  }
}

// ── SEO Issue Detectors ──────────────────────────────────────────────────────

interface AuditPageData {
  url: string;
  title: string;
  snippet: string;
}

function detectSeoIssues(pages: AuditPageData[], siteUrl: string): SiteAuditIssueData[] {
  const issues: SiteAuditIssueData[] = [];

  // 1. Meta Tags 檢查
  const missingTitlePages: string[] = [];
  const shortTitlePages: string[] = [];
  const longTitlePages: string[] = [];
  const missingDescriptionPages: string[] = [];

  for (const page of pages) {
    if (!page.title || page.title.trim() === '') {
      missingTitlePages.push(page.url);
    } else if (page.title.length < 25) {
      shortTitlePages.push(page.url);
    } else if (page.title.length > 65) {
      longTitlePages.push(page.url);
    }

    if (!page.snippet || page.snippet.length < 70) {
      missingDescriptionPages.push(page.url);
    }
  }

  if (missingTitlePages.length > 0) {
    issues.push({
      category: 'meta_tags',
      severity: 'critical',
      title: '缺少 Title 標籤',
      description: `發現 ${missingTitlePages.length} 個頁面缺少 Title 標籤，這會嚴重影響搜尋引擎排名。`,
      affectedCount: missingTitlePages.length,
      recommendation: '為每個頁面設定獨特且描述性的 Title 標籤，長度建議在 25-65 字元之間。',
      sampleUrls: missingTitlePages.slice(0, 3)
    });
  }

  if (shortTitlePages.length > 0) {
    issues.push({
      category: 'meta_tags',
      severity: 'medium',
      title: 'Title 標籤過短',
      description: `發現 ${shortTitlePages.length} 個頁面的 Title 過短（少於 25 字元），可能無法充分描述頁面內容。`,
      affectedCount: shortTitlePages.length,
      recommendation: '將 Title 標籤擴展至 25-65 字元，包含主要關鍵字並準確描述頁面內容。',
      sampleUrls: shortTitlePages.slice(0, 3)
    });
  }

  if (longTitlePages.length > 0) {
    issues.push({
      category: 'meta_tags',
      severity: 'medium',
      title: 'Title 標籤過長',
      description: `發現 ${longTitlePages.length} 個頁面的 Title 超過 65 字元，可能在搜尋結果中被截斷。`,
      affectedCount: longTitlePages.length,
      recommendation: '將 Title 標籤縮短至 65 字元以內，確保在搜尋結果中完整顯示。',
      sampleUrls: longTitlePages.slice(0, 3)
    });
  }

  if (missingDescriptionPages.length > 0) {
    issues.push({
      category: 'meta_tags',
      severity: 'high',
      title: 'Meta Description 過短或缺失',
      description: `發現 ${missingDescriptionPages.length} 個頁面的 Meta Description 長度不足，可能影響點擊率。`,
      affectedCount: missingDescriptionPages.length,
      recommendation: '為每個頁面撰寫 70-160 字元的 Meta Description，包含關鍵字和行動號召。',
      sampleUrls: missingDescriptionPages.slice(0, 3)
    });
  }

  // 2. 頁面索引量檢查
  if (pages.length === 0) {
    issues.push({
      category: 'indexability',
      severity: 'critical',
      title: '網站無法被 Google 索引',
      description: `網站 ${extractDomain(siteUrl)} 在 Google 索引中找不到任何頁面。請檢查 robots.txt 或 noindex 設定。`,
      affectedCount: 1,
      recommendation: '檢查網站是否有 robots.txt 阻擋、noindex meta 標籤，或網站是否過新尚未被索引。'
    });
  } else if (pages.length < 10 && pages.length > 0) {
    issues.push({
      category: 'indexability',
      severity: 'high',
      title: '網站索引頁面數量偏低',
      description: `網站僅有 ${pages.length} 個頁面被 Google 索引，遠低於一般健康網站的標準。`,
      affectedCount: 1,
      recommendation: '檢查是否有重複內容、canonical 標籤設定不當，或網站結構不利於爬蟲。'
    });
  }

  // 3. URL 結構檢查
  const urlIssues: string[] = [];
  for (const page of pages) {
    const urlPath = new URL(page.url).pathname;
    if (/[A-Z]/.test(urlPath)) {
      urlIssues.push(page.url);
    } else if (/[_\s]/.test(urlPath)) {
      urlIssues.push(page.url);
    } else if (/[?&]/.test(urlPath) && urlPath.length > 100) {
      urlIssues.push(page.url);
    }
  }

  if (urlIssues.length > 0) {
    issues.push({
      category: 'indexability',
      severity: 'low',
      title: 'URL 結構不夠友善',
      description: `發現 ${urlIssues.length} 個頁面的 URL 包含大寫字母、底線或過長的查詢參數，不利於 SEO。`,
      affectedCount: urlIssues.length,
      recommendation: '使用小寫字母和連字號 (-) 的 URL 結構，保持簡短且有意義。',
      sampleUrls: urlIssues.slice(0, 3)
    });
  }

  // 4. 重複 Title 檢查
  const titleMap = new Map<string, string[]>();
  for (const page of pages) {
    const existing = titleMap.get(page.title) ?? [];
    existing.push(page.url);
    titleMap.set(page.title, existing);
  }

  const duplicateTitles = Array.from(titleMap.entries())
    .filter(([, urls]) => urls.length > 1);
  if (duplicateTitles.length > 0) {
    const totalAffected = duplicateTitles.reduce((sum, [, urls]) => sum + urls.length, 0);
    issues.push({
      category: 'content_quality',
      severity: 'high',
      title: '重複的 Title 標籤',
      description: `發現 ${duplicateTitles.length} 組重複的 Title 標籤，共影響 ${totalAffected} 個頁面。這會讓搜尋引擎難以判斷哪個頁面是最相關的。`,
      affectedCount: totalAffected,
      recommendation: '確保每個頁面都有獨特的 Title 標籤，反映該頁面的獨特內容。',
      sampleUrls: duplicateTitles[0]?.[1]?.slice(0, 3)
    });
  }

  // 5. SSL/HTTPS 檢查
  const nonHttpsPages = pages.filter((p) => p.url.startsWith('http://'));
  if (nonHttpsPages.length > 0) {
    issues.push({
      category: 'security',
      severity: 'critical',
      title: '網站未完整使用 HTTPS',
      description: `發現 ${nonHttpsPages.length} 個頁面仍使用 HTTP 而非 HTTPS。Google 將 HTTPS 作為排名信號。`,
      affectedCount: nonHttpsPages.length,
      recommendation: '將所有頁面強制重新導向至 HTTPS，並更新內部連結。',
      sampleUrls: nonHttpsPages.slice(0, 3).map((p) => p.url)
    });
  }

  return issues;
}

export interface SiteAuditIssueData {
  category: SiteAuditIssueCategory;
  severity: SiteAuditIssueSeverity;
  title: string;
  description: string;
  url?: string;
  affectedCount: number;
  recommendation?: string;
  sampleUrls?: string[];
}

/**
 * 計算整體 SEO 分數（0-100）。
 */
function calculateOverallScore(issues: SiteAuditIssueData[]): number {
  if (issues.length === 0) return 100;

  const severityWeights: Record<SiteAuditIssueSeverity, number> = {
    critical: 25,
    high: 15,
    medium: 8,
    low: 3
  };

  const totalPenalty = issues.reduce((sum, issue) => {
    const weight = severityWeights[issue.severity];
    return sum + weight * Math.min(issue.affectedCount, 5);
  }, 0);

  return Math.max(0, Math.round(100 - totalPenalty));
}

// ── Repository ────────────────────────────────────────────────────────────────

export interface SerpapiUsageStats {
  totalCreditsUsed: number;
  monthlyLimit: number;
  remaining: number;
  totalAudits: number;
  lastAuditAt?: string;
}

export interface SiteAuditRepository {
  getConfig(siteId: string): Promise<SiteAuditConfig | undefined>;
  upsertConfig(siteId: string, config: Omit<SiteAuditConfig, 'siteId' | 'createdAt' | 'updatedAt'>): Promise<SiteAuditConfig>;
  createAuditResult(siteId: string, result: Omit<SiteAuditResult, 'id' | 'siteId' | 'createdAt'>): Promise<SiteAuditResult>;
  updateAuditResult(auditId: string, updates: Partial<Pick<SiteAuditResult, 'status' | 'overallScore' | 'pagesCrawled' | 'pagesIndexed' | 'serpapiCreditsUsed' | 'errorMessage' | 'startedAt' | 'completedAt'>>): Promise<SiteAuditResult | undefined>;
  saveIssues(auditId: string, siteId: string, issues: SiteAuditIssueData[]): Promise<SiteAuditIssue[]>;
  listResults(siteId: string): Promise<SiteAuditResult[]>;
  getResultWithIssues(auditId: string): Promise<SiteAuditResultWithIssues | undefined>;
  listIssues(auditId: string): Promise<SiteAuditIssue[]>;
  findSitesDueForAudit(): Promise<Array<{ siteId: string; siteUrl: string }>>;
  getSerpapiUsageStats(): Promise<SerpapiUsageStats>;
  close?(): Promise<void>;
}

// ── In-Memory Repository ─────────────────────────────────────────────────────

function createInMemorySiteAuditRepository(): SiteAuditRepository {
  const configs = new Map<string, SiteAuditConfig>();
  const results = new Map<string, SiteAuditResult>();
  const issues = new Map<string, SiteAuditIssue[]>();

  return {
    async getConfig(siteId) {
      return configs.get(siteId);
    },
    async upsertConfig(siteId, configInput) {
      const existing = configs.get(siteId);
      const now = new Date().toISOString();
      const config: SiteAuditConfig = {
        siteId,
        schedule: configInput.schedule,
        pageLimit: configInput.pageLimit,
        crawlSource: configInput.crawlSource,
        emailNotification: configInput.emailNotification,
        lastAuditAt: configInput.lastAuditAt ?? existing?.lastAuditAt,
        nextAuditAt: configInput.nextAuditAt ?? existing?.nextAuditAt,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      };
      configs.set(siteId, config);
      return config;
    },
    async createAuditResult(siteId, resultInput) {
      const result: SiteAuditResult = {
        id: crypto.randomUUID(),
        siteId,
        createdAt: new Date().toISOString(),
        ...resultInput
      };
      results.set(result.id, result);
      issues.set(result.id, []);
      return result;
    },
    async updateAuditResult(auditId, updates) {
      const existing = results.get(auditId);
      if (!existing) return undefined;
      const updated = { ...existing, ...updates };
      results.set(auditId, updated);
      return updated;
    },
    async saveIssues(auditId, siteId, issueDataList) {
      const savedIssues: SiteAuditIssue[] = issueDataList.map((data) => ({
        id: crypto.randomUUID(),
        auditId,
        siteId,
        category: data.category,
        severity: data.severity,
        title: data.title,
        description: data.description,
        url: data.sampleUrls?.[0],
        affectedCount: data.affectedCount,
        recommendation: data.recommendation,
        createdAt: new Date().toISOString()
      }));
      issues.set(auditId, savedIssues);
      return savedIssues;
    },
    async listResults(siteId) {
      return Array.from(results.values())
        .filter((r) => r.siteId === siteId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async getResultWithIssues(auditId) {
      const result = results.get(auditId);
      if (!result) return undefined;
      const auditIssues = issues.get(auditId) ?? [];
      return { ...result, issues: auditIssues, issueSummary: summarizeIssues(auditIssues) };
    },
    async listIssues(auditId) {
      return issues.get(auditId) ?? [];
    },
    async findSitesDueForAudit() {
      // InMemory: only returns sites with configs where next_audit_at <= now
      const now = new Date().toISOString();
      return Array.from(configs.entries())
        .filter(([, c]) => c.schedule !== 'disabled' && c.nextAuditAt && c.nextAuditAt <= now)
        .map(([siteId]) => ({ siteId, siteUrl: '' }));
    },
    async getSerpapiUsageStats() {
      const monthlyLimit = getSerpApiMonthlyLimit();
      const totalCreditsUsed = Array.from(results.values()).reduce((sum, r) => sum + r.serpapiCreditsUsed, 0);
      const completedResults = Array.from(results.values()).filter((r) => r.status === 'completed');
      const lastAuditAt = completedResults.length > 0
        ? completedResults.reduce((latest, r) => (r.completedAt && r.completedAt > latest ? r.completedAt : latest), '')
        : undefined;
      return {
        totalCreditsUsed,
        monthlyLimit,
        remaining: Math.max(0, monthlyLimit - totalCreditsUsed),
        totalAudits: completedResults.length,
        lastAuditAt: lastAuditAt || undefined
      };
    }
  };
}

// ── PostgreSQL Repository ────────────────────────────────────────────────────

const siteAuditMigrationSql = `
CREATE TABLE IF NOT EXISTS site_audit_configs (
  site_id uuid PRIMARY KEY REFERENCES site_connections(id) ON DELETE CASCADE,
  schedule text NOT NULL DEFAULT 'disabled' CHECK (schedule IN ('weekly', 'monthly', 'disabled')),
  page_limit integer NOT NULL DEFAULT 100 CHECK (page_limit BETWEEN 10 AND 500),
  crawl_source text NOT NULL DEFAULT 'website' CHECK (crawl_source IN ('website', 'sitemap', 'robots_txt')),
  email_notification boolean NOT NULL DEFAULT false,
  last_audit_at timestamptz,
  next_audit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_audit_results (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  overall_score integer CHECK (overall_score BETWEEN 0 AND 100),
  pages_crawled integer NOT NULL DEFAULT 0,
  pages_indexed integer NOT NULL DEFAULT 0,
  serpapi_credits_used integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_audit_results_site
  ON site_audit_results(site_id, created_at DESC);

CREATE TABLE IF NOT EXISTS site_audit_issues (
  id uuid PRIMARY KEY,
  audit_id uuid NOT NULL REFERENCES site_audit_results(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN (
    'meta_tags', 'headings', 'content_quality', 'links',
    'images', 'structured_data', 'mobile', 'performance',
    'indexability', 'security', 'other'
  )),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  description text NOT NULL,
  url text,
  affected_count integer NOT NULL DEFAULT 1,
  recommendation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_audit_issues_audit
  ON site_audit_issues(audit_id, category, severity);
`;

function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapConfigRow(row: QueryResultRow): SiteAuditConfig {
  return {
    siteId: row.site_id,
    schedule: row.schedule,
    pageLimit: Number(row.page_limit),
    crawlSource: row.crawl_source,
    emailNotification: Boolean(row.email_notification),
    lastAuditAt: toIsoString(row.last_audit_at),
    nextAuditAt: toIsoString(row.next_audit_at),
    createdAt: toIsoString(row.created_at) ?? '',
    updatedAt: toIsoString(row.updated_at) ?? ''
  };
}

function mapResultRow(row: QueryResultRow): SiteAuditResult {
  return {
    id: row.id,
    siteId: row.site_id,
    status: row.status,
    overallScore: row.overall_score != null ? Number(row.overall_score) : undefined,
    pagesCrawled: Number(row.pages_crawled),
    pagesIndexed: Number(row.pages_indexed),
    serpapiCreditsUsed: Number(row.serpapi_credits_used),
    errorMessage: row.error_message ?? undefined,
    startedAt: toIsoString(row.started_at),
    completedAt: toIsoString(row.completed_at),
    createdAt: toIsoString(row.created_at) ?? ''
  };
}

function mapIssueRow(row: QueryResultRow): SiteAuditIssue {
  return {
    id: row.id,
    auditId: row.audit_id,
    siteId: row.site_id,
    category: row.category,
    severity: row.severity,
    title: row.title,
    description: row.description,
    url: row.url ?? undefined,
    affectedCount: Number(row.affected_count),
    recommendation: row.recommendation ?? undefined,
    createdAt: toIsoString(row.created_at) ?? ''
  };
}

function summarizeIssues(issues: SiteAuditIssue[]) {
  const byCategory: Record<string, number> = {};
  for (const issue of issues) {
    byCategory[issue.category] = (byCategory[issue.category] ?? 0) + 1;
  }
  return {
    total: issues.length,
    critical: issues.filter((i) => i.severity === 'critical').length,
    high: issues.filter((i) => i.severity === 'high').length,
    medium: issues.filter((i) => i.severity === 'medium').length,
    low: issues.filter((i) => i.severity === 'low').length,
    byCategory
  };
}

export class PostgresSiteAuditRepository implements SiteAuditRepository {
  private readonly pool: Pool;
  private migrationPromise?: Promise<void>;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async getConfig(siteId: string): Promise<SiteAuditConfig | undefined> {
    await this.ensureSchema();
    const result = await this.pool.query(
      'SELECT * FROM site_audit_configs WHERE site_id = $1',
      [siteId]
    );
    return result.rows[0] ? mapConfigRow(result.rows[0]) : undefined;
  }

  async upsertConfig(
    siteId: string,
    config: Omit<SiteAuditConfig, 'siteId' | 'createdAt' | 'updatedAt'>
  ): Promise<SiteAuditConfig> {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        INSERT INTO site_audit_configs (site_id, schedule, page_limit, crawl_source, email_notification, last_audit_at, next_audit_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (site_id) DO UPDATE SET
          schedule = EXCLUDED.schedule,
          page_limit = EXCLUDED.page_limit,
          crawl_source = EXCLUDED.crawl_source,
          email_notification = EXCLUDED.email_notification,
          last_audit_at = COALESCE(EXCLUDED.last_audit_at, site_audit_configs.last_audit_at),
          next_audit_at = COALESCE(EXCLUDED.next_audit_at, site_audit_configs.next_audit_at),
          updated_at = now()
        RETURNING *
      `,
      [
        siteId,
        config.schedule,
        config.pageLimit,
        config.crawlSource,
        config.emailNotification,
        config.lastAuditAt ?? null,
        config.nextAuditAt ?? null
      ]
    );
    return mapConfigRow(result.rows[0]);
  }

  async createAuditResult(
    siteId: string,
    result: Omit<SiteAuditResult, 'id' | 'siteId' | 'createdAt'>
  ): Promise<SiteAuditResult> {
    await this.ensureSchema();
    const queryResult = await this.pool.query(
      `
        INSERT INTO site_audit_results (id, site_id, status, overall_score, pages_crawled, pages_indexed, serpapi_credits_used, error_message, started_at, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        siteId,
        result.status,
        result.overallScore ?? null,
        result.pagesCrawled,
        result.pagesIndexed,
        result.serpapiCreditsUsed,
        result.errorMessage ?? null,
        result.startedAt ?? null,
        result.completedAt ?? null
      ]
    );
    return mapResultRow(queryResult.rows[0]);
  }

  async updateAuditResult(
    auditId: string,
    updates: Partial<
      Pick<
        SiteAuditResult,
        'status' | 'overallScore' | 'pagesCrawled' | 'pagesIndexed' | 'serpapiCreditsUsed' | 'errorMessage' | 'startedAt' | 'completedAt'
      >
    >
  ): Promise<SiteAuditResult | undefined> {
    await this.ensureSchema();
    const clauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Array<[keyof typeof updates, string]> = [
      ['status', 'status'],
      ['overallScore', 'overall_score'],
      ['pagesCrawled', 'pages_crawled'],
      ['pagesIndexed', 'pages_indexed'],
      ['serpapiCreditsUsed', 'serpapi_credits_used'],
      ['errorMessage', 'error_message'],
      ['startedAt', 'started_at'],
      ['completedAt', 'completed_at']
    ];

    for (const [key, col] of fieldMap) {
      if (key in updates && updates[key] !== undefined) {
        clauses.push(`${col} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex += 1;
      }
    }

    if (clauses.length === 0) {
      const r = await this.pool.query('SELECT * FROM site_audit_results WHERE id = $1', [auditId]);
      return r.rows[0] ? mapResultRow(r.rows[0]) : undefined;
    }

    values.push(auditId);
    const result = await this.pool.query(
      `UPDATE site_audit_results SET ${clauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] ? mapResultRow(result.rows[0]) : undefined;
  }

  async saveIssues(auditId: string, siteId: string, issueDataList: SiteAuditIssueData[]): Promise<SiteAuditIssue[]> {
    await this.ensureSchema();
    const savedIssues: SiteAuditIssue[] = [];

    for (const data of issueDataList) {
      const result = await this.pool.query(
        `
          INSERT INTO site_audit_issues (id, audit_id, site_id, category, severity, title, description, url, affected_count, recommendation)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `,
        [
          crypto.randomUUID(),
          auditId,
          siteId,
          data.category,
          data.severity,
          data.title,
          data.description,
          data.sampleUrls?.[0] ?? null,
          data.affectedCount,
          data.recommendation ?? null
        ]
      );
      savedIssues.push(mapIssueRow(result.rows[0]));
    }

    return savedIssues;
  }

  async listResults(siteId: string): Promise<SiteAuditResult[]> {
    await this.ensureSchema();
    const result = await this.pool.query(
      'SELECT * FROM site_audit_results WHERE site_id = $1 ORDER BY created_at DESC LIMIT 50',
      [siteId]
    );
    return result.rows.map(mapResultRow);
  }

  async getResultWithIssues(auditId: string): Promise<SiteAuditResultWithIssues | undefined> {
    await this.ensureSchema();
    const [result, issueRows] = await Promise.all([
      this.pool.query('SELECT * FROM site_audit_results WHERE id = $1', [auditId]),
      this.pool.query('SELECT * FROM site_audit_issues WHERE audit_id = $1 ORDER BY severity DESC, created_at ASC', [auditId])
    ]);

    if (!result.rows[0]) return undefined;

    const auditResult = mapResultRow(result.rows[0]);
    const issues = issueRows.rows.map(mapIssueRow);

    return {
      ...auditResult,
      issues,
      issueSummary: summarizeIssues(issues)
    };
  }

  async listIssues(auditId: string): Promise<SiteAuditIssue[]> {
    await this.ensureSchema();
    const result = await this.pool.query(
      'SELECT * FROM site_audit_issues WHERE audit_id = $1 ORDER BY severity DESC, created_at ASC',
      [auditId]
    );
    return result.rows.map(mapIssueRow);
  }

  async findSitesDueForAudit(): Promise<Array<{ siteId: string; siteUrl: string }>> {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        SELECT sc.id AS site_id, sc.site_url
        FROM site_audit_configs sac
        JOIN site_connections sc ON sc.id = sac.site_id
        WHERE sac.schedule != 'disabled'
          AND sac.next_audit_at IS NOT NULL
          AND sac.next_audit_at <= now()
          AND sc.status = 'connected'
        LIMIT 10
      `
    );
    return result.rows.map((r) => ({ siteId: r.site_id, siteUrl: r.site_url }));
  }

  async getSerpapiUsageStats(): Promise<SerpapiUsageStats> {
    await this.ensureSchema();
    const monthlyLimit = getSerpApiMonthlyLimit();
    const result = await this.pool.query(
      `
        SELECT
          COALESCE(SUM(serpapi_credits_used), 0) AS total_credits_used,
          COUNT(*) FILTER (WHERE status = 'completed') AS total_audits,
          MAX(completed_at) AS last_audit_at
        FROM site_audit_results
      `
    );
    const row = result.rows[0];
    return {
      totalCreditsUsed: Number(row.total_credits_used),
      monthlyLimit,
      remaining: Math.max(0, monthlyLimit - Number(row.total_credits_used)),
      totalAudits: Number(row.total_audits),
      lastAuditAt: row.last_audit_at ? new Date(row.last_audit_at).toISOString() : undefined
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async ensureSchema(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    this.migrationPromise ??= this.pool.query(siteAuditMigrationSql).then(() => undefined);
    await this.migrationPromise;
  }
}

export function createDefaultSiteAuditRepository(databaseUrl?: string): SiteAuditRepository {
  return databaseUrl
    ? new PostgresSiteAuditRepository(databaseUrl)
    : createInMemorySiteAuditRepository();
}

// ── Route Handlers ───────────────────────────────────────────────────────────

function validationError(reply: FastifyReply, error: z.ZodError) {
  return reply.status(400).send({
    success: false,
    message: '請求資料格式不正確',
    error: {
      code: 'VALIDATION_ERROR',
      details: error.issues
    }
  });
}

const updateConfigSchema = z.object({
  schedule: z.enum(['weekly', 'monthly', 'disabled']),
  pageLimit: z.number().int().min(10).max(500),
  crawlSource: z.enum(['website', 'sitemap', 'robots_txt']),
  emailNotification: z.boolean()
});

const runAuditSchema = z.object({
  pageLimit: z.number().int().min(10).max(500).optional()
});

/**
 * 計算下一個稽核時間。
 */
function computeNextAuditAt(schedule: SiteAuditSchedule): string | undefined {
  if (schedule === 'disabled') return undefined;

  const now = new Date();
  if (schedule === 'weekly') {
    now.setDate(now.getDate() + 7);
  } else if (schedule === 'monthly') {
    now.setMonth(now.getMonth() + 1);
  }
  return now.toISOString();
}

/**
 * 執行一次完整的 SEO 網站稽核。
 * 供 API 直接呼叫和 Worker 排程使用。
 */
export async function executeSiteAudit(
  siteId: string,
  siteUrl: string,
  auditRepository: SiteAuditRepository,
  pageLimit: number
): Promise<SiteAuditResult> {
  // ── Quota pre-check ──
  const stats = await auditRepository.getSerpapiUsageStats();
  if (stats.remaining <= 0) {
    throw new SerpApiQuotaExceededError(stats.totalCreditsUsed, stats.monthlyLimit);
  }

  const startedAt = new Date().toISOString();

  // 建立稽核記錄 (status: running)
  const auditResult = await auditRepository.createAuditResult(siteId, {
    status: 'running',
    overallScore: undefined,
    pagesCrawled: 0,
    pagesIndexed: 0,
    serpapiCreditsUsed: 0,
    startedAt
  });

  try {
    const domain = extractDomain(siteUrl);

    // 透過 SerpApi 查詢已索引頁面
    const { pages, totalResults: indexedCount, creditsUsed } = await fetchIndexedPages(domain, pageLimit);

    const pageDataList: AuditPageData[] = pages.map((p) => ({
      url: p.link,
      title: p.title,
      snippet: p.snippet
    }));

    // 檢測 SEO 問題
    const issueDataList = detectSeoIssues(pageDataList, siteUrl);
    const overallScore = calculateOverallScore(issueDataList);
    const completedAt = new Date().toISOString();

    // 儲存問題
    await auditRepository.saveIssues(auditResult.id, siteId, issueDataList);

    // 更新稽核結果
    const updated = await auditRepository.updateAuditResult(auditResult.id, {
      status: 'completed',
      overallScore,
      pagesCrawled: pages.length,
      pagesIndexed: indexedCount,
      serpapiCreditsUsed: creditsUsed,
      completedAt
    });

    if (!updated) {
      throw new Error('更新稽核結果失敗');
    }

    return updated;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '稽核失敗';
    console.error(`[siteAudit] 稽核失敗 siteId=${siteId}: ${errorMessage}`);

    const updated = await auditRepository.updateAuditResult(auditResult.id, {
      status: 'failed',
      errorMessage,
      completedAt: new Date().toISOString()
    });

    return updated ?? auditResult;
  }
}

/**
 * 註冊 Site Audit API 路由。
 */
export function registerSiteAuditRoutes(
  app: FastifyInstance,
  siteRepository: SiteConnectionRepository,
  auditRepository: SiteAuditRepository,
  authService: AuthService
) {
  app.addHook('onClose', async () => {
    await auditRepository.close?.();
  });

  // GET /api/v1/site-connections/:siteId/site-audit/config
  app.get<{ Params: { siteId: string } }>(
    '/api/v1/site-connections/:siteId/site-audit/config',
    async (request, reply) => {
      const user = await requireAuth(authService, request, reply);
      if (!user) return reply;

      const site = await siteRepository.findForWorkspace(request.params.siteId, user.workspaceId);
      if (!site) {
        return reply.status(404).send({
          success: false,
          message: '找不到站點連接',
          error: { code: 'SITE_NOT_FOUND' }
        });
      }

      const config = await auditRepository.getConfig(site.id);

      return {
        success: true,
        message: '操作成功',
        data: {
          config: config ?? {
            siteId: site.id,
            schedule: 'disabled' as const,
            pageLimit: 100,
            crawlSource: 'website' as const,
            emailNotification: false,
            createdAt: '',
            updatedAt: ''
          }
        }
      };
    }
  );

  // PUT /api/v1/site-connections/:siteId/site-audit/config
  app.put<{ Params: { siteId: string } }>(
    '/api/v1/site-connections/:siteId/site-audit/config',
    async (request, reply) => {
      const user = await requireAuth(authService, request, reply);
      if (!user) return reply;

      const site = await siteRepository.findForWorkspace(request.params.siteId, user.workspaceId);
      if (!site) {
        return reply.status(404).send({
          success: false,
          message: '找不到站點連接',
          error: { code: 'SITE_NOT_FOUND' }
        });
      }

      const parsed = updateConfigSchema.safeParse(request.body);
      if (!parsed.success) {
        return validationError(reply, parsed.error);
      }

      const nextAuditAt = computeNextAuditAt(parsed.data.schedule);
      const config = await auditRepository.upsertConfig(site.id, {
        schedule: parsed.data.schedule,
        pageLimit: parsed.data.pageLimit,
        crawlSource: parsed.data.crawlSource,
        emailNotification: parsed.data.emailNotification,
        nextAuditAt
      });

      return {
        success: true,
        message: '稽核設定已更新',
        data: { config }
      };
    }
  );

  // POST /api/v1/site-connections/:siteId/site-audit/run
  app.post<{ Params: { siteId: string } }>(
    '/api/v1/site-connections/:siteId/site-audit/run',
    async (request, reply) => {
      const user = await requireAuth(authService, request, reply);
      if (!user) return reply;

      const site = await siteRepository.findForWorkspace(request.params.siteId, user.workspaceId);
      if (!site) {
        return reply.status(404).send({
          success: false,
          message: '找不到站點連接',
          error: { code: 'SITE_NOT_FOUND' }
        });
      }

      const parsed = runAuditSchema.safeParse(request.body);
      if (!parsed.success) {
        return validationError(reply, parsed.error);
      }

      const config = await auditRepository.getConfig(site.id);
      const pageLimit = parsed.data?.pageLimit ?? config?.pageLimit ?? 100;

      // 檢查 SerpApi key（先 trim 避免空白字元）
      const serpApiKey = (process.env.SERPAPI_KEY ?? '').trim();
      if (!serpApiKey) {
        return reply.status(500).send({
          success: false,
          message: '未設定 SERPAPI_KEY 環境變數',
          error: { code: 'SERPAPI_NOT_CONFIGURED' }
        });
      }

      try {
        const result = await executeSiteAudit(site.id, site.siteUrl, auditRepository, pageLimit);

        // 更新 config 的 last_audit_at
        if (config) {
          const nextAt = computeNextAuditAt(config.schedule);
          await auditRepository.upsertConfig(site.id, {
            schedule: config.schedule,
            pageLimit: config.pageLimit,
            crawlSource: config.crawlSource,
            emailNotification: config.emailNotification,
            lastAuditAt: result.completedAt ?? new Date().toISOString(),
            nextAuditAt: nextAt ?? config.nextAuditAt
          });
        }

        const fullResult = await auditRepository.getResultWithIssues(result.id);

        return reply.status(201).send({
          success: true,
          message: 'SEO 稽核已完成',
          data: fullResult ?? result
        });
      } catch (error) {
        if (error instanceof SerpApiQuotaExceededError) {
          return reply.status(429).send({
            success: false,
            message: error.message,
            error: {
              code: error.code,
              used: error.used,
              limit: error.limit,
              remaining: Math.max(0, error.limit - error.used)
            }
          });
        }
        const message = error instanceof Error ? error.message : '稽核失敗';
        return reply.status(500).send({
          success: false,
          message: `稽核失敗：${message}`,
          error: { code: 'AUDIT_FAILED', details: message }
        });
      }
    }
  );

  // GET /api/v1/site-connections/:siteId/site-audit/results
  app.get<{ Params: { siteId: string } }>(
    '/api/v1/site-connections/:siteId/site-audit/results',
    async (request, reply) => {
      const user = await requireAuth(authService, request, reply);
      if (!user) return reply;

      const site = await siteRepository.findForWorkspace(request.params.siteId, user.workspaceId);
      if (!site) {
        return reply.status(404).send({
          success: false,
          message: '找不到站點連接',
          error: { code: 'SITE_NOT_FOUND' }
        });
      }

      const results = await auditRepository.listResults(site.id);
      const latest = results[0];

      return {
        success: true,
        message: '操作成功',
        data: {
          results,
          latest: latest ? await auditRepository.getResultWithIssues(latest.id) : null
        }
      };
    }
  );

  // GET /api/v1/site-connections/:siteId/site-audit/results/:auditId
  app.get<{ Params: { siteId: string; auditId: string } }>(
    '/api/v1/site-connections/:siteId/site-audit/results/:auditId',
    async (request, reply) => {
      const user = await requireAuth(authService, request, reply);
      if (!user) return reply;

      const site = await siteRepository.findForWorkspace(request.params.siteId, user.workspaceId);
      if (!site) {
        return reply.status(404).send({
          success: false,
          message: '找不到站點連接',
          error: { code: 'SITE_NOT_FOUND' }
        });
      }

      const result = await auditRepository.getResultWithIssues(request.params.auditId);
      if (!result || result.siteId !== site.id) {
        return reply.status(404).send({
          success: false,
          message: '找不到稽核結果',
          error: { code: 'AUDIT_NOT_FOUND' }
        });
      }

      return {
        success: true,
        message: '操作成功',
        data: result
      };
    }
  );

  // GET /api/v1/admin/serpapi-usage — admin usage stats for SerpApi
  app.get('/api/v1/admin/serpapi-usage', async (request, reply) => {
    const user = await requireAuth(authService, request, reply);
    if (!user) return reply;
    // Admin check: only workspace admins can view usage
    if (typeof user.role !== 'string' || user.role !== 'admin') {
      return reply.status(403).send({
        success: false,
        message: '需要管理員權限',
        error: { code: 'FORBIDDEN' }
      });
    }
    try {
      const stats = await auditRepository.getSerpapiUsageStats();
      const keyConfigured = Boolean((process.env.SERPAPI_KEY ?? '').trim());
      return {
        success: true,
        message: '操作成功',
        data: {
          ...stats,
          keyConfigured,
          freeTierReset: 'monthly' as const
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '獲取 SerpApi 使用統計失敗';
      console.error(`[siteAudit] 獲取使用統計失敗: ${message}`);
      return reply.status(500).send({
        success: false,
        message,
        error: { code: 'INTERNAL_ERROR' }
      });
    }
  });
}

/**
 * 供 Worker 呼叫：尋找所有需要執行排程稽核的站點。
 */
export function createSiteAuditExecutor(auditRepository: SiteAuditRepository) {
  return async (siteId: string, siteUrl: string, pageLimit: number): Promise<SiteAuditResult> => {
    return executeSiteAudit(siteId, siteUrl, auditRepository, pageLimit);
  };
}

/**
 * 尋找所有需要執行排程稽核的站點（供 Worker 排程使用）。
 */
export function getSitesDueForAudit(auditRepository: SiteAuditRepository) {
  return auditRepository.findSitesDueForAudit();
}

// ── Scheduled Audit Processor ─────────────────────────────────────────────────

/**
 * 處理所有到期排程稽核站點。
 * 遍歷找到所有需要稽核的站點，依序執行稽核。
 * 若 SerpApi key 未設定則跳過。
 */
export async function processDueScheduledAudits(
  auditRepository: SiteAuditRepository,
  logger: Pick<Console, 'log' | 'error'> = console
): Promise<number> {
  const trimmedKey = (process.env.SERPAPI_KEY ?? '').trim();
  if (!trimmedKey) {
    return 0;
  }

  try {
    // ── Quota pre-check ──
    const stats = await auditRepository.getSerpapiUsageStats();
    if (stats.remaining <= 0) {
      logger.log(`[siteAudit] SerpApi 本月配額已用盡（${stats.totalCreditsUsed}/${stats.monthlyLimit}），跳過排程稽核`);
      return 0;
    }

    const dueSites = await auditRepository.findSitesDueForAudit();
    if (dueSites.length === 0) return 0;

    logger.log(`[siteAudit] 發現 ${dueSites.length} 個站點需要排程稽核`);

    let processed = 0;
    for (const { siteId, siteUrl } of dueSites) {
      try {
        // 取得該站點的稽核設定以獲取 pageLimit
        const config = await auditRepository.getConfig(siteId);
        const pageLimit = config?.pageLimit ?? 100;

        logger.log(`[siteAudit] 開始排程稽核 siteId=${siteId} siteUrl=${siteUrl}`);

        const result = await executeSiteAudit(siteId, siteUrl, auditRepository, pageLimit);

        // 更新 config 的上次稽核時間和下次排程
        if (config) {
          const nextAt = computeNextAuditAt(config.schedule);
          await auditRepository.upsertConfig(siteId, {
            schedule: config.schedule,
            pageLimit: config.pageLimit,
            crawlSource: config.crawlSource,
            emailNotification: config.emailNotification,
            lastAuditAt: result.completedAt ?? new Date().toISOString(),
            nextAuditAt: nextAt ?? config.nextAuditAt
          });
        }

        processed += 1;
        logger.log(
          `[siteAudit] 排程稽核完成 siteId=${siteId} score=${result.overallScore ?? 'N/A'}`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知錯誤';
        logger.error(`[siteAudit] 排程稽核失敗 siteId=${siteId}: ${message}`);
      }
    }

    return processed;
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知錯誤';
    logger.error(`[siteAudit] 排程稽核查詢失敗: ${message}`);
    return 0;
  }
}

/**
 * 啟動排程稽核背景處理器。
 * 定期檢查是否有到期排程的站點並執行稽核。
 * 返回 cleanup 函數以停止排程。
 */
export function startSiteAuditScheduler(
  auditRepository: SiteAuditRepository,
  intervalMs: number = 30 * 60 * 1000 // 預設每 30 分鐘
): () => void {
  const timer = setInterval(() => {
    processDueScheduledAudits(auditRepository).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : '未知錯誤';
      console.error(`[siteAudit] 排程器錯誤: ${message}`);
    });
  }, intervalMs);

  return () => clearInterval(timer);
}
