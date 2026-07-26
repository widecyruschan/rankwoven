export type SiteConnectionStatus = 'connected' | 'revoked';
export type CmsPlatform = 'wordpress' | 'joomla' | 'opencart';
export type SyncTaskStatus = 'queued' | 'running' | 'completed' | 'failed';
export type SyncTaskScope = 'full' | 'incremental' | 'article' | 'media' | 'suggestion_apply';
export type SuggestionStatus = 'pending' | 'approved' | 'applied' | 'failed' | 'rejected';
export type SuggestionTargetType = 'article' | 'media';
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
  syncStartedAt?: string;
  updatedAfter?: string;
  batchesReceived: number;
  articlesReceived: number;
  mediaReceived: number;
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

export async function getOptimizationSuggestions(siteId: string) {
  return requestApi<{
    suggestions: OptimizationSuggestion[];
  }>(`/api/v1/site-connections/${encodeURIComponent(siteId)}/suggestions`);
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
    task: SyncTask;
  }>(
    `/api/v1/site-connections/${encodeURIComponent(siteId)}/suggestions/${encodeURIComponent(suggestionId)}/apply`,
    {
      method: 'POST'
    }
  );
}
