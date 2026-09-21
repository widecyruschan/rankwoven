import { ApiError } from './appInsights';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3011';
const authStorageKey = 'rankwoven_auth_session';

export interface ResearchKeyword {
  id: string;
  displayKeyword: string;
  intent?: string;
  volume?: number;
  difficulty?: number;
  opportunityScore?: number;
  sourceType: string;
}

export interface KeywordGap {
  id: string;
  classification: 'missing' | 'weak' | 'strong' | 'shared';
  score?: number;
  competitorBestRank?: number;
  displayKeyword?: string;
  evidenceRefs?: string[];
}

export interface KeywordResearchRunState {
  status: string;
  progress: number;
  errorCode?: string;
}

export interface ExpandedKeyword {
  keyword: string;
  intent?: string;
  source: string;
  volume?: number;
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

function hostnameFromSiteUrl(siteUrl: string) {
  try {
    return new URL(siteUrl).hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
  } catch {
    return '';
  }
}

export async function createCompetitorResearchProject(siteId: string, name: string) {
  return request<{ project: { id: string } }>('/api/v1/keyword-research/projects', {
    method: 'POST',
    headers: { 'Idempotency-Key': `research-project-${crypto.randomUUID()}` },
    body: JSON.stringify({ siteId, name, market: 'HK', language: 'zh-Hant', device: 'desktop', engine: 'google' })
  });
}

export async function runCompetitorResearch(
  projectId: string,
  competitorDomain: string,
  options: { seedKeywords?: string[]; ownDomain?: string } = {}
) {
  return request<{ runId: string; taskId: string; status: string }>(`/api/v1/keyword-research/projects/${projectId}/runs`, {
    method: 'POST',
    headers: { 'Idempotency-Key': `research-run-${crypto.randomUUID()}` },
    body: JSON.stringify({
      seedKeywords: options.seedKeywords ?? [],
      competitorDomains: [competitorDomain],
      ownDomain: options.ownDomain,
      locale: 'zh-Hant'
    })
  });
}

export async function expandLongTailKeywords(input: {
  seeds: string[];
  market?: string;
  language?: string;
  maxKeywords?: number;
}) {
  return request<{ keywords: ExpandedKeyword[]; sources: string[] }>('/api/v1/keyword-research/expand', {
    method: 'POST',
    body: JSON.stringify({
      seeds: input.seeds,
      market: input.market ?? 'HK',
      language: input.language ?? 'zh-Hant',
      maxKeywords: input.maxKeywords ?? 100
    })
  });
}

export async function getResearchRun(runId: string): Promise<KeywordResearchRunState> {
  const detail = await request<{
    run: { status: string; partialReason?: string };
    task?: { status: string; progress: number; errorCode?: string };
  }>(`/api/v1/keyword-research/runs/${runId}`, { method: 'GET' });
  const task = detail.task;
  return {
    status: task?.status ?? detail.run.status,
    progress: task?.progress ?? (detail.run.status === 'completed' ? 100 : 0),
    errorCode: task?.errorCode ?? detail.run.partialReason
  };
}

export function getResearchKeywords(projectId: string) {
  return request<{ items: ResearchKeyword[] }>(`/api/v1/keyword-research/projects/${projectId}/keywords?page=1&pageSize=100&sort=opportunity`, { method: 'GET' });
}

export function getResearchGaps(projectId: string) {
  return request<{ items: KeywordGap[] }>(`/api/v1/keyword-research/projects/${projectId}/gaps?page=1&pageSize=100`, { method: 'GET' });
}

export { hostnameFromSiteUrl };
