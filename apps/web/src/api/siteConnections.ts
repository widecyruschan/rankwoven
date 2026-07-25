export type SiteConnectionStatus = 'connected' | 'revoked';
export type CmsPlatform = 'wordpress' | 'joomla' | 'opencart';

export interface SiteConnection {
  id: string;
  platform: CmsPlatform;
  name: string;
  siteUrl: string;
  cmsVersion?: string;
  pluginVersion?: string;
  status: SiteConnectionStatus;
  createdAt: string;
  lastSyncAt?: string;
  lastSyncStats?: {
    articlesReceived: number;
    mediaReceived: number;
  };
  tokenPreview: string;
  wordpressAdminUsername?: string;
  wordpressApplicationPasswordConfigured: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3011';

async function requestApi<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);
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
