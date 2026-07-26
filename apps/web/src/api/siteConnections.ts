export type SiteConnectionStatus = 'connected' | 'revoked';
export type CmsPlatform = 'wordpress' | 'joomla' | 'opencart';
export type SyncTaskStatus = 'queued' | 'running' | 'completed' | 'failed';
export type SyncTaskScope = 'full' | 'incremental' | 'article' | 'media';

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
  syncStartedAt?: string;
  updatedAfter?: string;
  batchesReceived: number;
  articlesReceived: number;
  mediaReceived: number;
  createdAt: string;
  completedAt?: string;
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

async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
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
