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

export interface ContentOptimizationDetail {
  run: { id: string; score?: number; confidence?: number; status: string };
  scoreChecks: ContentOptimizationCheck[];
  claims: Array<{ id: string; claimText: string; verificationStatus: string }>;
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

export function createContentOptimization(input: { siteId: string; content: string; focusKeyword: string }) {
  return request<{ runId: string; taskId: string }>('/api/v1/content-optimizations', {
    method: 'POST',
    headers: { 'Idempotency-Key': `content-${crypto.randomUUID()}` },
    body: JSON.stringify(input)
  });
}

export function getContentOptimization(runId: string) {
  return request<ContentOptimizationDetail>(`/api/v1/content-optimizations/${runId}`, { method: 'GET' });
}
