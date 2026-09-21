import { ApiError } from './appInsights';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3011';
const authStorageKey = 'rankwoven_auth_session';

export interface ContentOptimizationCheck {
  code: string;
  dimension: string;
  status: 'pass' | 'warning' | 'fail' | 'not_applicable';
  evidence?: string;
  recommendation?: string;
}

export type ContentSourceKind = 'article' | 'inline' | 'public_url';
export type ContentRewriteScope = 'title' | 'meta' | 'opening' | 'paragraph' | 'section' | 'outline' | 'full_document';
export type ContentRewriteStatus = 'queued' | 'draft' | 'approved' | 'rejected' | 'blocked' | 'failed';

export interface ContentOptimizationRun {
  id: string;
  siteId: string;
  articleId?: number;
  status: string;
  sourceKind?: ContentSourceKind;
  sourceUrl?: string;
  focusKeyword?: string;
  secondaryKeywords?: string[];
  score?: number;
  confidence?: number;
}

export interface ContentOptimizationSnapshot {
  sourceKind: ContentSourceKind;
  sourceUrl?: string;
  contentText: string;
  metadata: Record<string, unknown>;
  capturedAt: string;
}

export interface ContentClaim {
  id: string;
  claimText: string;
  sourceUrl?: string;
  sourceType: string;
  verificationStatus: string;
  blockedReason?: string;
}

export interface ContentRewriteSuggestion {
  id: string;
  taskId?: string;
  scope: ContentRewriteScope;
  selector?: string;
  beforeText: string;
  suggestedText?: string;
  riskFlags: string[];
  status: ContentRewriteStatus;
  revision: number;
}

export interface ContentOptimizationDetail {
  run: ContentOptimizationRun;
  snapshot?: ContentOptimizationSnapshot;
  scoreChecks: ContentOptimizationCheck[];
  claims: ContentClaim[];
  suggestions: ContentRewriteSuggestion[];
}

export interface CreateContentOptimizationInput {
  siteId: string;
  articleId?: number;
  content?: string;
  sourceUrl?: string;
  focusKeyword: string;
  secondaryKeywords?: string[];
  locale?: string;
  targetMarket?: string;
  dialect?: string;
  tone?: string;
  audience?: string;
  funnelStage?: string;
}

function getToken() {
  try {
    return JSON.parse(localStorage.getItem(authStorageKey) ?? '{}').token as string | undefined;
  } catch {
    return undefined;
  }
}

async function request<T>(path: string, init: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${getToken() ?? ''}`, 'Content-Type': 'application/json', ...init.headers }
  });
  const body = await response.json() as { success: boolean; message: string; data: T; error?: { code?: string } };
  if (!response.ok || !body.success) throw new ApiError(body.message, body.error?.code);
  return body.data;
}

function createIdempotencyKey(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function createContentOptimization(input: CreateContentOptimizationInput) {
  return request<{ runId: string; taskId: string }>('/api/v1/content-optimizations', {
    method: 'POST',
    headers: { 'Idempotency-Key': createIdempotencyKey('content') },
    body: JSON.stringify(input)
  });
}

export function getContentOptimization(runId: string) {
  return request<ContentOptimizationDetail>(`/api/v1/content-optimizations/${runId}`, { method: 'GET' });
}

export function createContentRewrite(runId: string, input: { scope: ContentRewriteScope; selector?: string }) {
  return request<{ taskId: string; suggestionId: string }>(`/api/v1/content-optimizations/${runId}/rewrites`, {
    method: 'POST',
    headers: { 'Idempotency-Key': createIdempotencyKey('content-rewrite') },
    body: JSON.stringify(input)
  });
}

export function updateContentRewriteSuggestion(
  runId: string,
  suggestionId: string,
  input: { status: 'approved' | 'rejected'; suggestedText?: string }
) {
  return request<{ suggestion: ContentRewriteSuggestion }>(
    `/api/v1/content-optimizations/${runId}/suggestions/${suggestionId}`,
    {
      method: 'PATCH',
      headers: { 'Idempotency-Key': createIdempotencyKey('content-suggestion') },
      body: JSON.stringify(input)
    }
  );
}

export function recheckContentOptimization(runId: string) {
  return request<{ runId: string; taskId: string }>(`/api/v1/content-optimizations/${runId}/recheck`, {
    method: 'POST',
    headers: { 'Idempotency-Key': createIdempotencyKey('content-recheck') }
  });
}
