export interface AnalyticsOverview {
  configured: boolean;
  source: 'google-analytics' | 'demo';
  propertyId?: string;
  totals: {
    activeUsers: number;
    sessions: number;
    pageViews: number;
    conversions: number;
  };
  daily: Array<{
    date: string;
    activeUsers: number;
    sessions: number;
    pageViews: number;
  }>;
  channels: Array<{
    channel: string;
    sessions: number;
  }>;
  pages: Array<{
    path: string;
    pageViews: number;
    activeUsers: number;
  }>;
}

export interface KeywordSuggestion {
  keyword: string;
  intent: 'informational' | 'commercial' | 'transactional' | 'local';
  difficulty: 'low' | 'medium' | 'high';
  opportunityScore: number;
  searchIntentSummary: string;
  contentAngle: string;
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

export async function getAnalyticsOverview() {
  return requestApi<AnalyticsOverview>('/api/v1/analytics/overview');
}

export async function createKeywordSuggestions(payload: {
  seedKeyword: string;
  locale: string;
  intent: KeywordSuggestion['intent'];
}) {
  return requestApi<{
    seedKeyword: string;
    locale: string;
    suggestions: KeywordSuggestion[];
  }>('/api/v1/keyword-suggestions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
