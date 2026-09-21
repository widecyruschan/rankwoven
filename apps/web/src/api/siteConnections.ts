export type SiteConnectionStatus = 'connected' | 'revoked';
export type CmsPlatform = 'wordpress' | 'joomla' | 'opencart' | 'manual';
export type SiteConnectionMode = 'plugin' | 'api' | 'manual';
export type SyncTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'dead_letter';
export type SyncTaskScope =
  | 'full'
  | 'incremental'
  | 'article'
  | 'media'
  | 'suggestion_apply'
  | 'suggestion_rollback';
export type SuggestionStatus = 'pending' | 'approved' | 'applied' | 'failed' | 'rejected';
export type SuggestionTargetType = 'article' | 'media';
export type SeoAuditStatus = 'completed';
export type SeoAuditIssueSeverity = 'low' | 'medium' | 'high';
export type SuggestionType =
  | 'title'
  | 'meta_description'
  | 'content'
  | 'media_title'
  | 'media_caption'
  | 'media_description'
  | 'media_alt_text'
  | 'media_file_name'
  | 'internal_link';

export interface SiteConnection {
  id: string;
  platform: CmsPlatform;
  connectionMode: SiteConnectionMode;
  name: string;
  siteUrl: string;
  cmsVersion?: string;
  pluginVersion?: string;
  googleAnalyticsPropertyId?: string;
  competitorUrls?: string[];
  status: SiteConnectionStatus;
  createdAt: string;
  lastTokenUsedAt?: string;
  lastSyncAt?: string;
  lastSyncStats?: {
    articlesReceived: number;
    mediaReceived: number;
  };
  tokenPreview: string;
  wordpressAdminUsername?: string;
  wordpressApplicationPasswordConfigured: boolean;
  canWriteBack: boolean;
}

export interface SyncTask {
  id: string;
  siteId: string;
  siteName?: string;
  status: SyncTaskStatus;
  scope: SyncTaskScope;
  targetCmsId?: string;
  suggestionId?: string;
  applySnapshotId?: string;
  syncStartedAt?: string;
  updatedAfter?: string;
  batchesReceived: number;
  articlesReceived: number;
  mediaReceived: number;
  retryCount: number;
  maxRetries: number;
  nextRunAt?: string;
  deadLetteredAt?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface OptimizationSuggestion {
  id: string;
  siteId: string;
  auditIssueId?: string;
  targetType: SuggestionTargetType;
  targetCmsId: string;
  suggestionType: SuggestionType;
  fieldName: string;
  status: SuggestionStatus;
  currentValue?: string;
  suggestedValue: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  approvedAt?: string;
  appliedAt?: string;
  errorMessage?: string;
  applyTaskId?: string;
}

export interface ApplySnapshot {
  id: string;
  siteId: string;
  suggestionId?: string;
  taskId?: string;
  targetType: SuggestionTargetType;
  targetCmsId: string;
  fieldName: string;
  beforeValue?: string;
  afterValue: string;
  status: 'created' | 'applied' | 'rolled_back' | 'failed';
  createdAt: string;
  appliedAt?: string;
  rolledBackAt?: string;
  matchedAt?: string;
  errorMessage?: string;
}

export interface SeoAudit {
  id: string;
  siteId: string;
  status: SeoAuditStatus;
  score: number;
  rulesVersion: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface LatestAuditSummary {
  audit: SeoAudit;
  issueCounts: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface SeoAuditIssue {
  id: string;
  auditId: string;
  siteId: string;
  targetType: SuggestionTargetType;
  targetCmsId: string;
  ruleCode: string;
  severity: SeoAuditIssueSeverity;
  message: string;
  currentValue?: string;
  suggestedValue?: string;
  fieldName: string;
  source?: 'rankwoven' | 'ahrefs';
  category?: string;
  affectedPages?: number;
  change?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SyncedArticle {
  cmsId: string;
  type: 'post' | 'page' | 'portfolio' | 'product';
  title: string;
  slug: string;
  status: string;
  url: string;
  excerpt?: string;
  metaDescription?: string;
  contentHtml?: string;
  author?: string;
  categories: string[];
  tags: string[];
  featuredImageId?: string;
  publishedAt?: string;
  updatedAt: string;
}

export interface SyncedMedia {
  cmsId: string;
  title: string;
  url: string;
  mimeType?: string;
  fileName?: string;
  caption?: string;
  description?: string;
  altText?: string;
  attachedToCmsId?: string;
  attachedToTitle?: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface ArticleListParams extends PaginationParams {
  search?: string;
  status?: string;
  issue?: 'missing_meta' | 'missing_featured_image';
}

export interface MediaListParams extends PaginationParams {
  search?: string;
  issue?: 'missing_alt' | 'missing_file_name';
}

export interface MediaScanResult {
  site: SiteConnection;
  articlesReceived: number;
  mediaReceived: number;
  updatedAfter?: string;
}

export interface SuggestionListParams {
  targetType?: SuggestionTargetType;
  targetCmsIds?: string[];
  limit?: number;
}

export interface ManualRefreshTaskPayload {
  type: 'article' | 'media';
  cmsId: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3011';
const authStorageKey = 'rankwoven_auth_session';

function getStoredToken() {
  const rawValue = localStorage.getItem(authStorageKey);
  if (!rawValue) {
    return '';
  }

  try {
    const parsed = JSON.parse(rawValue) as { token?: unknown };
    return typeof parsed.token === 'string' ? parsed.token : '';
  } catch {
    return '';
  }
}

async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers
    }
  });
  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !body.success) {
    throw new Error(body.message || 'API request failed');
  }

  return body.data;
}

function createIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `rw-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function getSiteConnections() {
  return requestApi<{
    sites: SiteConnection[];
  }>('/api/v1/site-connections');
}

export async function createManualSite(input: { siteUrl: string; name?: string }) {
  return requestApi<{ site: SiteConnection }>('/api/v1/site-connections/manual', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

/** GET /api/v1/site-connections/:siteId — fetch a single site connection */
export async function getSiteConnection(siteId: string) {
  return requestApi<{
    site: SiteConnection;
  }>(`/api/v1/site-connections/${encodeURIComponent(siteId)}`);
}

export async function updateSiteAnalyticsSettings(
  siteId: string,
  settings: { googleAnalyticsPropertyId?: string }
) {
  return requestApi<{ site: SiteConnection }>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/analytics-settings`,
    { method: 'PUT', body: JSON.stringify(settings) }
  );
}

export async function updateSiteCompetitorUrls(siteId: string, competitorUrls: string[]) {
  return requestApi<{ site: SiteConnection }>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/competitor-urls`,
    { method: 'PUT', body: JSON.stringify({ competitorUrls }) }
  );
}

export interface SyncTaskListFilters {
  siteId?: string;
  scope?: SyncTaskScope;
  status?: SyncTaskStatus;
}

export async function getSyncTasks(filters?: SyncTaskListFilters) {
  const searchParams = new URLSearchParams();

  if (filters?.siteId) {
    searchParams.set('siteId', filters.siteId);
  }

  if (filters?.scope) {
    searchParams.set('scope', filters.scope);
  }

  if (filters?.status) {
    searchParams.set('status', filters.status);
  }

  const query = searchParams.toString();
  const path = `/api/v1/sync-tasks${query ? `?${query}` : ''}`;

  return requestApi<{
    tasks: SyncTask[];
  }>(path);
}

export async function retrySyncTask(taskId: string) {
  return requestApi<{
    task: SyncTask;
  }>(`/api/v1/sync-tasks/${encodeURIComponent(taskId)}/retry`, {
    method: 'POST'
  });
}

export async function ignoreDeadLetterTask(taskId: string) {
  return requestApi<{
    task: SyncTask;
  }>(`/api/v1/sync-tasks/${encodeURIComponent(taskId)}/ignore`, {
    method: 'POST'
  });
}

export async function batchRetrySyncTasks(taskIds: string[]) {
  return requestApi<{
    tasks: SyncTask[];
    retriedCount: number;
  }>('/api/v1/sync-tasks/batch/retry', {
    method: 'POST',
    body: JSON.stringify({ taskIds })
  });
}

export async function batchIgnoreDeadLetterTasks(taskIds: string[]) {
  return requestApi<{
    tasks: SyncTask[];
    ignoredCount: number;
  }>('/api/v1/sync-tasks/batch/ignore', {
    method: 'POST',
    body: JSON.stringify({ taskIds })
  });
}

export async function exportSyncTasks(params: {
  siteId?: string;
  scope?: string;
  status?: string;
  format?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params.siteId) searchParams.set('siteId', params.siteId);
  if (params.scope) searchParams.set('scope', params.scope);
  if (params.status) searchParams.set('status', params.status);
  if (params.format) searchParams.set('format', params.format);
  const query = searchParams.toString();
  const path = `/api/v1/sync-tasks/export${query ? `?${query}` : ''}`;

  // Return raw response for file download
  const token = getStoredToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  return response;
}

export interface DeadLetterStats {
  totalDeadLetters: number;
  bySite: { siteId: string; siteName: string; count: number; latestDeadLetter: string | null }[];
}

export async function getDeadLetterStats() {
  return requestApi<DeadLetterStats>('/api/v1/sync-tasks/dead-letter-stats');
}

export async function getDeadLetterAlert() {
  return requestApi<{
    totalDeadLetters: number;
    exceeded: boolean;
    severity: 'normal' | 'warning' | 'critical';
    threshold: number;
    bySite: { siteId: string; siteName: string; count: number; latestDeadLetter: string | null }[];
  }>('/api/v1/sync-tasks/dead-letter-alert');
}

export async function getDeadLetterAlertConfig() {
  return requestApi<{ threshold: number }>('/api/v1/sync-tasks/dead-letter-alert-config');
}

export async function updateDeadLetterAlertConfig(threshold: number) {
  return requestApi<{ threshold: number }>('/api/v1/sync-tasks/dead-letter-alert-config', {
    method: 'PUT',
    body: JSON.stringify({ threshold })
  });
}

export async function createManualRefreshTask(siteId: string, payload: ManualRefreshTaskPayload) {
  return requestApi<{
    task: SyncTask;
  }>(`/api/v1/site-connections/${encodeURIComponent(siteId)}/manual-refresh`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

function createPaginationQuery(params: ArticleListParams | MediaListParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.pageSize) {
    searchParams.set('pageSize', String(params.pageSize));
  }

  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }

  if ('status' in params && params.status?.trim()) {
    searchParams.set('status', params.status.trim());
  }

  if (params.issue) {
    searchParams.set('issue', params.issue);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function getSyncedArticles(siteId: string, params?: ArticleListParams) {
  return requestApi<{
    site: SiteConnection;
    articles: SyncedArticle[];
    pagination: PaginationMeta;
  }>(`/api/v1/site-connections/${encodeURIComponent(siteId)}/articles${createPaginationQuery(params)}`);
}

export async function getSyncedMedia(siteId: string, params?: MediaListParams) {
  return requestApi<{
    site: SiteConnection;
    media: SyncedMedia[];
    pagination: PaginationMeta;
  }>(`/api/v1/site-connections/${encodeURIComponent(siteId)}/media${createPaginationQuery(params)}`);
}

export async function scanSiteMedia(siteId: string, updatedAfter?: string) {
  return requestApi<MediaScanResult>(`/api/v1/site-connections/${encodeURIComponent(siteId)}/media-scan`, {
    method: 'POST',
    body: JSON.stringify({
      ...(updatedAfter ? { updatedAfter } : {})
    })
  });
}

function createSuggestionQuery(params?: SuggestionListParams) {
  const searchParams = new URLSearchParams();

  if (params?.targetType) {
    searchParams.set('targetType', params.targetType);
  }

  if (params?.targetCmsIds?.length) {
    searchParams.set('targetCmsIds', params.targetCmsIds.join(','));
  }

  if (params?.limit) {
    searchParams.set('limit', String(params.limit));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function getOptimizationSuggestions(siteId: string, params?: SuggestionListParams) {
  return requestApi<{
    suggestions: OptimizationSuggestion[];
    latestAudit?: LatestAuditSummary;
  }>(`/api/v1/site-connections/${encodeURIComponent(siteId)}/suggestions${createSuggestionQuery(params)}`);
}

export async function generateInternalLinkSuggestions(siteId: string, limit = 50) {
  return requestApi<{
    suggestions: OptimizationSuggestion[];
    generated: number;
    articlesScanned: number;
  }>(`/api/v1/site-connections/${encodeURIComponent(siteId)}/internal-links/generate`, {
    method: 'POST',
    body: JSON.stringify({ limit })
  });
}

export async function getApplyQueue(siteId: string) {
  return requestApi<{
    site: SiteConnection;
    suggestions: OptimizationSuggestion[];
    tasks: SyncTask[];
    snapshots: ApplySnapshot[];
  }>(`/api/v1/site-connections/${encodeURIComponent(siteId)}/apply-queue`);
}

export async function createSeoAudit(siteId: string) {
  return requestApi<{
    audit: SeoAudit;
    issues: SeoAuditIssue[];
  }>(`/api/v1/site-connections/${encodeURIComponent(siteId)}/audits`, {
    method: 'POST'
  });
}

export async function getSeoAudits(siteId: string) {
  return requestApi<{
    audits: SeoAudit[];
    issues: SeoAuditIssue[];
  }>(`/api/v1/site-connections/${encodeURIComponent(siteId)}/audits`);
}

export interface AhrefsSiteAuditConfig {
  siteId: string;
  enabled: boolean;
  projectId: string;
  crawlDate?: string;
  comparisonDate?: string;
  updatedAt: string;
}

export interface AhrefsSiteAuditConfigResponse {
  config: AhrefsSiteAuditConfig;
  platformManaged: boolean;
  platformAvailable: boolean;
  autoCreate: boolean;
  providerErrorCode?: string;
}

export interface AhrefsSiteAuditIssuePages {
  issueId: string;
  urls: string[];
  offset: number;
  limit: number;
  hasMore: boolean;
}

export async function getAhrefsSiteAuditConfig(siteId: string) {
  return requestApi<AhrefsSiteAuditConfigResponse>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/ahrefs-site-audit/config`
  );
}

export async function updateAhrefsSiteAuditConfig(
  siteId: string,
  config: Pick<AhrefsSiteAuditConfig, 'enabled' | 'crawlDate' | 'comparisonDate'>
) {
  return requestApi<{ config: AhrefsSiteAuditConfig }>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/ahrefs-site-audit/config`,
    { method: 'PUT', body: JSON.stringify(config) }
  );
}

export async function getAhrefsSiteAuditIssuePages(
  siteId: string,
  issueId: string,
  options: { offset?: number; limit?: number } = {}
) {
  const query = new URLSearchParams();
  if (options.offset !== undefined) query.set('offset', String(options.offset));
  if (options.limit !== undefined) query.set('limit', String(options.limit));
  const suffix = query.size ? `?${query.toString()}` : '';
  return requestApi<AhrefsSiteAuditIssuePages>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/ahrefs-site-audit/issues/${encodeURIComponent(issueId)}/pages${suffix}`
  );
}

export async function approveOptimizationSuggestion(siteId: string, suggestionId: string) {
  return requestApi<{
    suggestion: OptimizationSuggestion;
  }>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/suggestions/${encodeURIComponent(suggestionId)}/approve`,
    {
      method: 'POST'
    }
  );
}

export async function updateOptimizationSuggestion(siteId: string, suggestionId: string, suggestedValue: string) {
  return requestApi<{
    suggestion: OptimizationSuggestion;
  }>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/suggestions/${encodeURIComponent(suggestionId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ suggestedValue })
    }
  );
}

export async function applyOptimizationSuggestion(siteId: string, suggestionId: string) {
  return requestApi<{
    suggestion: OptimizationSuggestion;
    snapshot: ApplySnapshot;
    task: SyncTask;
  }>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/suggestions/${encodeURIComponent(suggestionId)}/apply`,
    {
      method: 'POST'
    }
  );
}

export interface BatchApplyResult {
  results: Array<{
    suggestionId: string;
    success: boolean;
    taskId?: string;
    error?: string;
  }>;
  total: number;
  succeeded: number;
  failed: number;
}

export async function batchApplyOptimizationSuggestions(
  siteId: string,
  suggestionIds: string[],
  options: { safeOnly?: boolean } = {}
) {
  return requestApi<BatchApplyResult>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/suggestions/batch-apply`,
    {
      method: 'POST',
      body: JSON.stringify({ suggestionIds, ...(options.safeOnly ? { safeOnly: true } : {}) })
    }
  );
}

export async function batchApproveOptimizationSuggestions(siteId: string, suggestionIds: string[]) {
  return requestApi<BatchApplyResult>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/suggestions/batch-approve`,
    {
      method: 'POST',
      body: JSON.stringify({ suggestionIds })
    }
  );
}

export async function rollbackApplySnapshot(siteId: string, snapshotId: string) {
  return requestApi<{
    snapshot?: ApplySnapshot;
    task: SyncTask;
  }>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/apply-snapshots/${encodeURIComponent(snapshotId)}/rollback`,
    {
      method: 'POST'
    }
  );
}

/** DELETE /api/v1/site-connections/:siteId — remove a site and all cascaded data */
export async function deleteSiteConnection(siteId: string): Promise<void> {
  const token = getStoredToken();
  const response = await fetch(`${apiBaseUrl}/api/v1/site-connections/${encodeURIComponent(siteId)}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  let body: ApiResponse<unknown> | null = null;
  try {
    body = (await response.json()) as ApiResponse<unknown>;
  } catch {
    // DELETE may return 204/empty body; a successful HTTP status is enough here.
  }

  if (response.ok && (!body || body.success)) {
    return;
  }

  if (!response.ok || body?.success === false) {
    throw new Error(body?.message || 'Failed to delete site');
  }
}

// ── Site Audit ──────────────────────────────────────────────────────────────

export type SiteAuditSchedule = 'weekly' | 'monthly' | 'disabled';
export type SiteAuditCrawlSource = 'website' | 'sitemap' | 'robots_txt';
export type SiteAuditStatus = 'queued' | 'running' | 'partial' | 'completed' | 'failed' | 'cancelled';
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
  status: SiteAuditStatus;
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
  affectedUrls: string[];
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

export async function getSiteAuditConfig(siteId: string) {
  return requestApi<{ config: SiteAuditConfig }>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/site-audit/config`
  );
}

export async function updateSiteAuditConfig(
  siteId: string,
  config: {
    schedule: SiteAuditSchedule;
    pageLimit: number;
    crawlSource: SiteAuditCrawlSource;
    emailNotification: boolean;
  }
) {
  return requestApi<{ config: SiteAuditConfig }>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/site-audit/config`,
    { method: 'PUT', body: JSON.stringify(config) }
  );
}

export async function runSiteAudit(siteId: string, pageLimit?: number) {
  return requestApi<SiteAuditResultWithIssues>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/site-audit/run`,
    { method: 'POST', body: JSON.stringify({ pageLimit }) }
  );
}

export async function getSiteAuditResults(siteId: string) {
  return requestApi<{
    results: SiteAuditResult[];
    latest: SiteAuditResultWithIssues | null;
  }>(`/api/v1/site-connections/${encodeURIComponent(siteId)}/site-audit/results`);
}

export async function getSiteAuditResultDetail(siteId: string, auditId: string) {
  return requestApi<SiteAuditResultWithIssues>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/site-audit/results/${encodeURIComponent(auditId)}`
  );
}

export type AuditFindingStatus = 'open' | 'ignored' | 'fixed' | 'persisting' | 'regressed' | 'partial';
export type AuditDisposition = 'fixed' | 'persisting' | 'regressed' | 'partial';

export interface SiteAuditFinding {
  id: string;
  workspaceId: string;
  siteId: string;
  auditId: string;
  pageId?: string;
  fingerprint: string;
  category: string;
  severity: SiteAuditIssueSeverity;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  recommendation?: string;
  status: AuditFindingStatus;
  ignoredReason?: string;
  ignoredUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SiteAuditMetric {
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

export interface SiteAuditBundle {
  audit: SiteAuditResult;
  pages: Array<Record<string, unknown>>;
  findings: SiteAuditFinding[];
  rechecks: Array<Record<string, unknown>>;
  metrics: SiteAuditMetric[];
  partialReasons: string[];
}

export interface ManualSiteAuditResult {
  bundle?: SiteAuditBundle;
  target:
    | { kind: 'manual_url'; url: string }
    | { kind: 'synced_content'; cmsId: string; contentType: 'post' | 'product'; url: string };
  writebackEnabled: false;
}

export async function runSiteAuditMonitoring(siteId: string, pageLimit?: number) {
  return requestApi<SiteAuditBundle>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/site-audit/runs`,
    { method: 'POST', headers: { 'Idempotency-Key': createIdempotencyKey() }, body: JSON.stringify({ pageLimit }) }
  );
}

export async function runManualSiteAudit(
  siteId: string,
  input: { targetUrl: string } | { contentCmsId: string }
) {
  return requestApi<ManualSiteAuditResult>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/site-audit/manual-runs`,
    { method: 'POST', headers: { 'Idempotency-Key': createIdempotencyKey() }, body: JSON.stringify(input) }
  );
}

export async function getSiteAuditMonitoringRun(runId: string) {
  return requestApi<SiteAuditBundle>(`/api/v1/site-audit/runs/${encodeURIComponent(runId)}`);
}

export async function ignoreSiteAuditFinding(findingId: string, reason: string, until?: string) {
  return requestApi<{ finding: SiteAuditFinding }>(
    `/api/v1/site-audit/findings/${encodeURIComponent(findingId)}/ignore`,
    { method: 'POST', headers: { 'Idempotency-Key': createIdempotencyKey() }, body: JSON.stringify({ reason, until }) }
  );
}

export async function recheckSiteAuditFinding(findingId: string, found: boolean, partial = false) {
  return requestApi<{ finding: SiteAuditFinding; recheck: { disposition: AuditDisposition } }>(
    `/api/v1/site-audit/findings/${encodeURIComponent(findingId)}/recheck`,
    { method: 'POST', headers: { 'Idempotency-Key': createIdempotencyKey() }, body: JSON.stringify({ found, partial }) }
  );
}

export interface MonitorEvent {
  id: string;
  siteId: string;
  configId: string;
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

export async function createSiteMonitor(input: {
  siteId: string;
  kind: 'competitor' | 'ai_visibility' | 'technical';
  targetUrl?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  timezone?: string;
  threshold?: number;
  quietPeriodMinutes?: number;
}) {
  return requestApi<{ monitor: Record<string, unknown> }>('/api/v1/monitors', {
    method: 'POST',
    headers: { 'Idempotency-Key': createIdempotencyKey() },
    body: JSON.stringify(input)
  });
}

export async function getMonitorEvents(siteId?: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (siteId) params.set('siteId', siteId);
  return requestApi<{ items: MonitorEvent[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(`/api/v1/monitor-events?${params.toString()}`);
}

export interface MonitoringAlert {
  id: string;
  eventId: string;
  channel: 'in_app' | 'queue' | 'email';
  status: 'queued' | 'read' | 'muted' | 'sent';
  mutedUntil?: string;
  sentAt?: string;
  readAt?: string;
  createdAt: string;
}

export async function getMonitoringAlerts(page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return requestApi<{ items: MonitoringAlert[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(`/api/v1/alerts?${params.toString()}`);
}

export async function muteAlert(alertId: string) {
  return requestApi<{ alert: Record<string, unknown> }>(`/api/v1/alerts/${encodeURIComponent(alertId)}/mute`, { method: 'POST', headers: { 'Idempotency-Key': createIdempotencyKey() } });
}

// ── Admin SerpApi Usage ──────────────────────────────────────────────────────

export interface SerpapiUsageStats {
  totalCreditsUsed: number;
  monthlyLimit: number;
  remaining: number;
  totalAudits: number;
  lastAuditAt?: string;
  keyConfigured: boolean;
  freeTierReset: string;
}

export async function getAdminSerpapiUsage() {
  return requestApi<SerpapiUsageStats>('/api/v1/admin/serpapi-usage');
}
