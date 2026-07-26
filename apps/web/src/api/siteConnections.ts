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

export async function getSyncTasks(siteId?: string) {
  const path = siteId
    ? `/api/v1/site-connections/${encodeURIComponent(siteId)}/sync-tasks`
    : '/api/v1/sync-tasks';

  return requestApi<{
    tasks: SyncTask[];
  }>(path);
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
