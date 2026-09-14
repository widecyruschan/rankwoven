import { createHash } from 'node:crypto';
import type {
  CompetitorRankedKeywordsResult,
  KeywordMetricResult,
  KeywordMetricsInput,
  KeywordMetricsResult,
  KeywordResearchProvider,
  KeywordResearchProviderCapabilities,
  RankedKeywordResult
} from './phase2.js';

export interface KeywordResearchProviderOptions {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  locationCode?: string | number;
  languageCode?: string;
  methodologyVersion?: string;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '');
}

function normalizeKeyword(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function readNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[$,%]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeCompetition(value: unknown) {
  const parsed = readNumber(value);
  if (parsed === undefined) return undefined;
  return Number(Math.min(1, Math.max(0, parsed > 1 ? parsed / 100 : parsed)).toFixed(4));
}

function hashPayload(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function makeSnapshotId(provider: string, input: unknown, response: unknown) {
  return `${provider}-${hashPayload({ input, response }).slice(0, 32)}`;
}

function createCapabilities(
  provider: KeywordResearchProviderCapabilities['provider'],
  supportsCompetitorRankedKeywords: boolean
): KeywordResearchProviderCapabilities {
  return {
    provider,
    supportsKeywordMetrics: true,
    supportsCompetitorRankedKeywords,
    supportsBacklinkOpportunities: false
  };
}

const knownLocationCodes: Record<string, number> = {
  US: 2840,
  GB: 2826,
  HK: 2344,
  TW: 2158,
  CN: 2156,
  ES: 2724,
  MX: 2484
};

interface JsonRequestOptions {
  fetchImpl: typeof fetch;
  url: string;
  apiKey: string;
  init?: RequestInit;
  timeoutMs: number;
}

async function requestJson({ fetchImpl, url, apiKey, init, timeoutMs }: JsonRequestOptions) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers
      }
    });
    if (!response.ok) {
      throw new Error(`KEYWORD_PROVIDER_HTTP_${response.status}`);
    }
    const responseCopy = response.clone();
    try {
      return await response.json() as unknown;
    } catch {
      const text = await responseCopy.text();
      if (text) return text;
      throw new Error('KEYWORD_PROVIDER_RESPONSE_INVALID');
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('KEYWORD_PROVIDER_TIMEOUT', { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function extractTaskItems(body: unknown): Record<string, unknown>[] {
  if (!body || typeof body !== 'object') return [];
  const tasks = (body as { tasks?: unknown }).tasks;
  if (!Array.isArray(tasks)) return [];
  return tasks.flatMap((task) => {
    if (!task || typeof task !== 'object') return [];
    const result = (task as { result?: unknown }).result;
    if (!Array.isArray(result)) return [];
    return result.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const record = item as Record<string, unknown>;
      if (Array.isArray(record.items)) {
        return record.items.filter((nested): nested is Record<string, unknown> => Boolean(nested && typeof nested === 'object'));
      }
      return [record];
    });
  });
}

function mapKeywordMetric(item: Record<string, unknown>): KeywordMetricResult | undefined {
  const keyword = normalizeKeyword(item.keyword ?? item.key ?? item.Ph ?? item.query);
  if (!keyword) return undefined;
  return {
    keyword,
    volume: readNumber(item.search_volume ?? item.monthly_search_volume ?? item.volume ?? item.Nq),
    cpcUsd: readNumber(item.cpc ?? item.Cpc ?? item.cpc_usd),
    competition: normalizeCompetition(item.competition ?? item.competition_index ?? item.Com),
    difficulty: readNumber(item.keyword_difficulty ?? item.difficulty ?? item.Kd ?? item.kd),
    trend: readNumber(item.trend ?? item.search_volume_trend),
    providerUpdatedAt: typeof item.last_updated_time === 'string' ? item.last_updated_time : undefined
  };
}

function mapRankedKeyword(item: Record<string, unknown>): RankedKeywordResult | undefined {
  const keyword = normalizeKeyword(item.keyword ?? item.key ?? item.query);
  if (!keyword) return undefined;
  const serpFeatures = Array.isArray(item.serp_features)
    ? item.serp_features.filter((value): value is string => typeof value === 'string')
    : [];
  return {
    keyword,
    rank: readNumber(item.rank_absolute ?? item.rank ?? item.position),
    url: typeof item.url === 'string' ? item.url : undefined,
    etv: readNumber(item.etv ?? item.traffic),
    serpFeatures
  };
}

export function createDataForSeoKeywordResearchProvider(options: KeywordResearchProviderOptions): KeywordResearchProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const timeoutMs = options.timeoutMs ?? 120_000;
  const defaultLocationCode = options.locationCode ?? 2840;
  const defaultLanguageCode = options.languageCode ?? 'en';
  const methodologyVersion = options.methodologyVersion ?? 'dataforseo-keyword-research-v1';

  const requestContext = (input: KeywordMetricsInput) => ({
    location_code: knownLocationCodes[input.market.trim().toUpperCase()] ?? defaultLocationCode,
    language_code: input.language || defaultLanguageCode,
    device: input.device,
    se_type: input.engine,
    market: input.market
  });

  return {
    id: 'dataforseo',
    async getCapabilities() {
      return createCapabilities('dataforseo', true);
    },
    async discoverKeywordMetrics(input) {
      const requestBody = [{
        keywords: input.seeds,
        ...requestContext(input),
        include_serp_info: false
      }];
      const body = await requestJson({
        fetchImpl,
        url: `${baseUrl}/keywords_data/google/keywords_for_keywords/live`,
        apiKey: options.apiKey,
        timeoutMs,
        init: { method: 'POST', body: JSON.stringify(requestBody) }
      });
      const metrics = extractTaskItems(body)
        .map(mapKeywordMetric)
        .filter((metric): metric is KeywordMetricResult => Boolean(metric));
      const collectedAt = new Date().toISOString();
      return {
        provider: 'dataforseo',
        providerSnapshotId: makeSnapshotId('dataforseo', requestBody, body),
        methodologyVersion,
        location: String(input.market),
        language: input.language,
        device: input.device,
        collectedAt,
        sourceType: 'provider_estimated',
        metrics,
        estimatedCost: 0,
        rawResponseHash: hashPayload(body)
      } satisfies KeywordMetricsResult;
    },
    async getCompetitorRankedKeywords(input) {
      const requestBody = [{
        target: input.domain,
        ...requestContext(input),
        limit: Math.min(100, Math.max(1, input.limit)),
        include_serp_info: true
      }];
      const body = await requestJson({
        fetchImpl,
        url: `${baseUrl}/dataforseo_labs/google/ranked_keywords/live`,
        apiKey: options.apiKey,
        timeoutMs,
        init: { method: 'POST', body: JSON.stringify(requestBody) }
      });
      const items = extractTaskItems(body)
        .map(mapRankedKeyword)
        .filter((item): item is RankedKeywordResult => Boolean(item))
        .filter((item) => item.rank === undefined || (item.rank >= 1 && item.rank <= 100));
      const collectedAt = new Date().toISOString();
      return {
        provider: 'dataforseo',
        providerSnapshotId: makeSnapshotId('dataforseo', requestBody, body),
        methodologyVersion,
        location: String(input.market),
        language: input.language,
        device: input.device,
        collectedAt,
        sourceType: 'provider_estimated',
        domain: input.domain,
        keywords: items.slice(0, 100),
        estimatedCost: 0,
        rawResponseHash: hashPayload(body)
      } satisfies CompetitorRankedKeywordsResult;
    }
  };
}

export function createAhrefsKeywordResearchProvider(options: KeywordResearchProviderOptions): KeywordResearchProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const timeoutMs = options.timeoutMs ?? 120_000;
  const methodologyVersion = options.methodologyVersion ?? 'ahrefs-keyword-research-v1';

  async function request(input: KeywordMetricsInput, path: string, payload: Record<string, unknown>) {
    const body = await requestJson({
      fetchImpl,
      url: `${baseUrl}/${path.replace(/^\/+/, '')}`,
      apiKey: options.apiKey,
      timeoutMs,
      init: { method: 'POST', body: JSON.stringify(payload) }
    });
    const collectedAt = new Date().toISOString();
    return { body, collectedAt, input };
  }

  return {
    id: 'ahrefs',
    async getCapabilities() {
      return createCapabilities('ahrefs', true);
    },
    async discoverKeywordMetrics(input) {
      const result = await request(input, 'keywords', {
        keywords: input.seeds,
        country: input.market,
        language: input.language,
        device: input.device
      });
      const records = Array.isArray((result.body as { keywords?: unknown })?.keywords)
        ? (result.body as { keywords: Record<string, unknown>[] }).keywords
        : extractTaskItems(result.body);
      const metrics = records.map(mapKeywordMetric).filter((metric): metric is KeywordMetricResult => Boolean(metric));
      return {
        provider: 'ahrefs',
        providerSnapshotId: makeSnapshotId('ahrefs', input, result.body),
        methodologyVersion,
        location: input.market,
        language: input.language,
        device: input.device,
        collectedAt: result.collectedAt,
        sourceType: 'provider_estimated',
        metrics,
        estimatedCost: 0,
        rawResponseHash: hashPayload(result.body)
      } satisfies KeywordMetricsResult;
    },
    async getCompetitorRankedKeywords(input) {
      const result = await request(input, 'ranked-keywords', {
        domain: input.domain,
        country: input.market,
        language: input.language,
        device: input.device,
        limit: input.limit
      });
      const records = Array.isArray((result.body as { keywords?: unknown })?.keywords)
        ? (result.body as { keywords: Record<string, unknown>[] }).keywords
        : extractTaskItems(result.body);
      const keywords = records
        .map(mapRankedKeyword)
        .filter((item): item is RankedKeywordResult => Boolean(item))
        .filter((item) => item.rank === undefined || (item.rank >= 1 && item.rank <= 100))
        .slice(0, 100);
      return {
        provider: 'ahrefs',
        providerSnapshotId: makeSnapshotId('ahrefs', input, result.body),
        methodologyVersion,
        location: input.market,
        language: input.language,
        device: input.device,
        collectedAt: result.collectedAt,
        sourceType: 'provider_estimated',
        domain: input.domain,
        keywords,
        estimatedCost: 0,
        rawResponseHash: hashPayload(result.body)
      } satisfies CompetitorRankedKeywordsResult;
    }
  };
}

export function createSemrushKeywordResearchProvider(options: KeywordResearchProviderOptions): KeywordResearchProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const timeoutMs = options.timeoutMs ?? 120_000;
  const methodologyVersion = options.methodologyVersion ?? 'semrush-keyword-research-v1';

  async function request(input: KeywordMetricsInput, params: URLSearchParams) {
    const body = await requestJson({
      fetchImpl,
      url: `${baseUrl}?${params.toString()}`,
      apiKey: options.apiKey,
      timeoutMs,
      init: { method: 'GET' }
    });
    const collectedAt = new Date().toISOString();
    return { body, collectedAt, input };
  }

  function parseCsv(value: unknown) {
    if (typeof value !== 'string') return [] as Record<string, unknown>[];
    const lines = value.trim().split(/\r?\n/);
    if (lines.length <= 1) return [];
    return lines.slice(1).map((line) => {
      const columns = line.split(';');
      return {
        Ph: columns[0], Nq: columns[1], Cpc: columns[2], Com: columns[3], Kd: columns[4],
        Po: columns[1], Ur: columns[2], Tr: columns[3]
      };
    });
  }

  return {
    id: 'semrush',
    async getCapabilities() {
      return createCapabilities('semrush', true);
    },
    async discoverKeywordMetrics(input) {
      const params = new URLSearchParams({
        type: 'phrase_all',
        key: options.apiKey,
        phrase: input.seeds.join(','),
        database: input.market.toLowerCase(),
        export_columns: 'Ph,Nq,Cpc,Com,Kd'
      });
      const result = await request(input, params);
      const metrics = parseCsv(result.body).map(mapKeywordMetric).filter((metric): metric is KeywordMetricResult => Boolean(metric));
      return {
        provider: 'semrush',
        providerSnapshotId: makeSnapshotId('semrush', input, result.body),
        methodologyVersion,
        location: input.market,
        language: input.language,
        device: input.device,
        collectedAt: result.collectedAt,
        sourceType: 'provider_estimated',
        metrics,
        estimatedCost: 0,
        rawResponseHash: hashPayload(result.body)
      } satisfies KeywordMetricsResult;
    },
    async getCompetitorRankedKeywords(input) {
      const params = new URLSearchParams({
        type: 'domain_organic',
        key: options.apiKey,
        display_date: new Date().toISOString().slice(0, 10),
        domain: input.domain,
        database: input.market.toLowerCase(),
        export_columns: 'Ph,Po,Ur,Tr'
      });
      const result = await request(input, params);
      const keywords = parseCsv(result.body)
        .map((item) => {
          const record = item as Record<string, unknown>;
          return mapRankedKeyword({ keyword: record.Ph, rank: record.Po, url: record.Ur, etv: record.Tr });
        })
        .filter((item): item is RankedKeywordResult => Boolean(item))
        .filter((item) => item.rank === undefined || (item.rank >= 1 && item.rank <= 100))
        .slice(0, 100);
      return {
        provider: 'semrush',
        providerSnapshotId: makeSnapshotId('semrush', input, result.body),
        methodologyVersion,
        location: input.market,
        language: input.language,
        device: input.device,
        collectedAt: result.collectedAt,
        sourceType: 'provider_estimated',
        domain: input.domain,
        keywords,
        estimatedCost: 0,
        rawResponseHash: hashPayload(result.body)
      } satisfies CompetitorRankedKeywordsResult;
    }
  };
}
