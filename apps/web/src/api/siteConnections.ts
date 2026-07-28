export type SiteConnectionStatus = 'connected' | 'revoked';
export type CmsPlatform = 'wordpress' | 'joomla' | 'opencart';
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
  | 'media_alt_text'
  | 'media_file_name'
  | 'internal_link';

export interface SiteConnection {
  id: string;
  platform: CmsPlatform;
  name: string;
  siteUrl: string;
  cmsVersion?: string;
  pluginVersion?: string;
  googleAnalyticsPropertyId?: string;
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
  createdAt: string;
}

export interface SyncedArticle {
  cmsId: string;
  type: 'post' | 'page';
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
  altText?: string;
  attachedToCmsId?: string;
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

export async function getSiteConnections() {
  return requestApi<{
    sites: SiteConnection[];
  }>('/api/v1/site-connections');
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

export async function getOptimizationSuggestions(siteId: string) {
  return requestApi<{
    suggestions: OptimizationSuggestion[];
    latestAudit?: LatestAuditSummary;
  }>(`/api/v1/site-connections/${encodeURIComponent(siteId)}/suggestions`);
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

export async function batchApplyOptimizationSuggestions(siteId: string, suggestionIds: string[]) {
  return requestApi<BatchApplyResult>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/suggestions/batch-apply`,
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
  await requestApi<void>(`/api/v1/site-connections/${encodeURIComponent(siteId)}`, { method: 'DELETE' });
}

// ── Site Audit ──────────────────────────────────────────────────────────────

export type SiteAuditSchedule = 'weekly' | 'monthly' | 'disabled';
export type SiteAuditCrawlSource = 'website' | 'sitemap' | 'robots_txt';
export type SiteAuditStatus = 'queued' | 'running' | 'completed' | 'failed';
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
