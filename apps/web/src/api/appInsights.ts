export interface AnalyticsOverview {
  configured: boolean;
  source: 'google-analytics' | 'demo';
  propertyId?: string;
  siteId?: string;
  siteHost?: string;
  startDate: string;
  endDate: string;
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

export interface AnalyticsOverviewParams {
  siteId?: string;
  startDate?: string;
  endDate?: string;
}

// ── Keyword Suggestions ──────────────────────────────────────────

export type KeywordDataSource =
  | 'dataforseo'
  | 'ahrefs'
  | 'semrush'
  | 'gsc'
  | 'ai-provider'
  | 'fallback';

export interface KeywordSourceTrace {
  keywordIdea: 'ai-provider' | 'template';
  volume: KeywordDataSource | 'estimated';
  cpc: KeywordDataSource | 'estimated';
  competition: KeywordDataSource | 'estimated';
  difficulty: KeywordDataSource | 'estimated';
  verified: boolean;
}

export interface KeywordGscData {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface KeywordSuggestion {
  keyword: string;
  intent: 'informational' | 'commercial' | 'transactional' | 'local';
  difficulty: 'low' | 'medium' | 'high';
  opportunityScore: number;
  monthlySearchVolume?: number;
  cpcUsd?: number;
  competition?: number;
  source: KeywordDataSource;
  sourceTrace: KeywordSourceTrace;
  searchIntentSummary: string;
  contentAngle: string;
  gscData?: KeywordGscData;
}

export interface KeywordEnrichedItem {
  keyword: string;
  found: boolean;
  monthlySearchVolume?: number;
  cpcUsd?: number;
  competition?: number;
  keywordDifficulty?: number;
  source?: string;
  gscData?: KeywordGscData;
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
    },
    signal: init?.signal
  });
  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !body.success) {
    throw new Error(body.message || 'API request failed');
  }

  return body.data;
}

// ── Shared abort helpers ────────────────────────────────────────
const LIGHTHOUSE_TIMEOUT_MS = 90_000; // 90s timeout for Lighthouse audits

function requestWithTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fn(controller.signal).finally(() => clearTimeout(timer));
}

export async function getAnalyticsOverview(params: AnalyticsOverviewParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.siteId) {
    searchParams.set('siteId', params.siteId);
  }

  if (params.startDate) {
    searchParams.set('startDate', params.startDate);
  }

  if (params.endDate) {
    searchParams.set('endDate', params.endDate);
  }

  const queryString = searchParams.toString();
  return requestApi<AnalyticsOverview>(`/api/v1/analytics/overview${queryString ? `?${queryString}` : ''}`);
}

export async function createKeywordSuggestions(payload: {
  seedKeyword: string;
  locale: string;
  intent: KeywordSuggestion['intent'];
  siteUrl?: string;
}) {
  return requestApi<{
    seedKeyword: string;
    locale: string;
    source: 'enriched' | 'ai-provider' | 'fallback';
    suggestions: KeywordSuggestion[];
  }>('/api/v1/keyword-suggestions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function enrichKeywords(payload: {
  keywords: string[];
  locale: string;
}) {
  return requestApi<{
    enriched: KeywordEnrichedItem[];
  }>('/api/v1/keyword-suggestions/enrich', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getKeywordSources() {
  return requestApi<{
    sources: Array<{
      id: string;
      name: string;
      active: boolean;
      description: string;
    }>;
    activeProvider: string | null;
  }>('/api/v1/keyword-suggestions/sources');
}

// ── Search Console ──────────────────────────────────────────────

export interface SearchConsoleKeyword {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleKeywordsResult {
  configured: boolean;
  source: string;
  siteUrl: string;
  keywords: SearchConsoleKeyword[];
  totals: {
    totalClicks: number;
    totalImpressions: number;
    averageCtr: number;
    averagePosition: number;
  };
}

export interface SearchConsoleKeywordsParams {
  siteUrl?: string;
  startDate?: string;
  endDate?: string;
}

export async function getSearchConsoleKeywords(
  params: SearchConsoleKeywordsParams = {}
): Promise<SearchConsoleKeywordsResult> {
  const searchParams = new URLSearchParams();

  if (params.siteUrl) {
    searchParams.set('siteUrl', params.siteUrl);
  }

  if (params.startDate) {
    searchParams.set('startDate', params.startDate);
  }

  if (params.endDate) {
    searchParams.set('endDate', params.endDate);
  }

  const queryString = searchParams.toString();
  return requestApi<SearchConsoleKeywordsResult>(
    `/api/v1/search-console/keywords${queryString ? `?${queryString}` : ''}`
  );
}

// ── Lighthouse ──────────────────────────────────────────────────

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface LighthouseMetricEntry {
  value: number;
  score: number;
}

export interface LighthouseMetrics {
  firstContentfulPaint: LighthouseMetricEntry;
  largestContentfulPaint: LighthouseMetricEntry;
  totalBlockingTime: LighthouseMetricEntry;
  cumulativeLayoutShift: LighthouseMetricEntry;
  speedIndex: LighthouseMetricEntry;
  interactive: LighthouseMetricEntry;
}

export interface LighthouseDiagnostic {
  title: string;
  description: string;
  score: number;
  category?: string;
}

export interface LighthouseAuditResult {
  url: string;
  scores: LighthouseScores;
  metrics: LighthouseMetrics;
  diagnostics: LighthouseDiagnostic[];
  timestamp: string;
}

export async function getLighthouseAudit(url: string): Promise<LighthouseAuditResult> {
  return requestWithTimeout(
    (signal) =>
      requestApi<LighthouseAuditResult>(`/api/v1/lighthouse/audit?url=${encodeURIComponent(url)}`, { signal }),
    LIGHTHOUSE_TIMEOUT_MS
  );
}
