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

/**
 * The established generic metric configuration may point directly to DataForSEO.
 * Project-based research must retain that compatibility without falling back to
 * an unrelated Ahrefs Keyword Explorer overview endpoint.
 */
export function isDataForSeoKeywordResearchConfiguration(
  provider: string | undefined,
  baseUrl: string | undefined,
  apiKey: string | undefined
) {
  if (!baseUrl || !apiKey) return false;
  if (provider === 'dataforseo') return true;
  if (provider !== 'generic') return false;

  try {
    return new URL(baseUrl).hostname.toLowerCase() === 'api.dataforseo.com';
  } catch {
    return false;
  }
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
        Authorization: `Basic ${Buffer.from(normalizeDataForSeoApiKey(apiKey)).toString('base64')}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers
      }
    });
    if (!response.ok) {
      let providerMessage = '';
      try {
        const body = await response.clone().json() as { status_code?: unknown; status_message?: unknown };
        providerMessage = typeof body.status_message === 'string' ? body.status_message : '';
        const statusCode = readNumber(body.status_code);
        if (statusCode === 40104 || /verify your account/i.test(providerMessage)) {
          throw new Error('KEYWORD_PROVIDER_ACCOUNT_UNVERIFIED');
        }
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('KEYWORD_PROVIDER_')) throw error;
      }
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

/**
 * Some deployments stored DataForSEO credentials as email:base64(email:password).
 * Normalize back to email:password before Basic auth.
 */
export function normalizeDataForSeoApiKey(apiKey: string) {
  const separator = apiKey.indexOf(':');
  if (separator <= 0) return apiKey;
  const email = apiKey.slice(0, separator);
  const password = apiKey.slice(separator + 1);
  try {
    const decoded = Buffer.from(password, 'base64').toString('utf8');
    if (decoded.startsWith(`${email}:`) && decoded.includes(':')) {
      return decoded;
    }
  } catch {
    // keep original key
  }
  return apiKey;
}

export function mapDataForSeoLanguageCode(language: string) {
  const normalized = language.trim().toLowerCase().replace(/_/g, '-');
  const mapped: Record<string, string> = {
    'zh-hant': 'zh_tw',
    'zh-tw': 'zh_tw',
    'zh-hk': 'zh_tw',
    'zh-hans': 'zh_cn',
    'zh-cn': 'zh_cn',
    'en-us': 'en',
    'en-gb': 'en',
    'en-hk': 'en',
    'en-au': 'en',
    'ja-jp': 'ja',
    'ko-kr': 'ko'
  };
  if (mapped[normalized]) return mapped[normalized];
  if (/^[a-z]{2}$/.test(normalized)) return normalized;
  const base = normalized.split('-')[0] ?? '';
  return /^[a-z]{2}$/.test(base) ? base : 'en';
}

function assertDataForSeoTasksSucceeded(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new Error('KEYWORD_PROVIDER_RESPONSE_INVALID');
  }
  const topLevelStatus = readNumber((body as { status_code?: unknown }).status_code);
  if (topLevelStatus !== undefined && topLevelStatus !== 20000) {
    if (topLevelStatus === 40104) throw new Error('KEYWORD_PROVIDER_ACCOUNT_UNVERIFIED');
    if (topLevelStatus >= 40100 && topLevelStatus < 40200) throw new Error('KEYWORD_PROVIDER_HTTP_401');
    if (topLevelStatus === 40201 || topLevelStatus === 40202 || topLevelStatus === 40203) {
      throw new Error('KEYWORD_PROVIDER_HTTP_429');
    }
    throw new Error('KEYWORD_PROVIDER_RESPONSE_INVALID');
  }
  const tasks = (body as { tasks?: unknown }).tasks;
  if (!Array.isArray(tasks) || tasks.length === 0) return;
  for (const task of tasks) {
    if (!task || typeof task !== 'object') continue;
    const taskStatus = readNumber((task as { status_code?: unknown }).status_code);
    if (taskStatus === undefined || taskStatus === 20000) continue;
    if (taskStatus === 40104) throw new Error('KEYWORD_PROVIDER_ACCOUNT_UNVERIFIED');
    if (taskStatus >= 40100 && taskStatus < 40200) throw new Error('KEYWORD_PROVIDER_HTTP_401');
    if (taskStatus === 40201 || taskStatus === 40202 || taskStatus === 40203) {
      throw new Error('KEYWORD_PROVIDER_HTTP_429');
    }
    throw new Error('KEYWORD_PROVIDER_RESPONSE_INVALID');
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
  const keywordData = item.keyword_data && typeof item.keyword_data === 'object'
    ? item.keyword_data as Record<string, unknown>
    : undefined;
  const keywordInfo = keywordData?.keyword_info && typeof keywordData.keyword_info === 'object'
    ? keywordData.keyword_info as Record<string, unknown>
    : undefined;
  const keyword = normalizeKeyword(
    item.keyword ?? item.key ?? item.Ph ?? item.query ?? keywordData?.keyword
  );
  if (!keyword) return undefined;
  return {
    keyword,
    volume: readNumber(
      item.search_volume
      ?? item.monthly_search_volume
      ?? item.volume
      ?? item.Nq
      ?? keywordInfo?.search_volume
    ),
    cpcUsd: readNumber(item.cpc ?? item.Cpc ?? item.cpc_usd ?? keywordInfo?.cpc),
    competition: normalizeCompetition(
      item.competition ?? item.competition_index ?? item.Com ?? keywordInfo?.competition
    ),
    difficulty: readNumber(item.keyword_difficulty ?? item.difficulty ?? item.Kd ?? item.kd),
    trend: readNumber(item.trend ?? item.search_volume_trend),
    providerUpdatedAt: typeof item.last_updated_time === 'string'
      ? item.last_updated_time
      : typeof keywordInfo?.last_updated_time === 'string'
        ? keywordInfo.last_updated_time
        : undefined
  };
}

function mapRankedKeyword(item: Record<string, unknown>): RankedKeywordResult | undefined {
  const keywordData = item.keyword_data && typeof item.keyword_data === 'object'
    ? item.keyword_data as Record<string, unknown>
    : undefined;
  const rankedSerp = item.ranked_serp_element && typeof item.ranked_serp_element === 'object'
    ? item.ranked_serp_element as Record<string, unknown>
    : undefined;
  const serpItem = rankedSerp?.serp_item && typeof rankedSerp.serp_item === 'object'
    ? rankedSerp.serp_item as Record<string, unknown>
    : undefined;
  const keyword = normalizeKeyword(
    item.keyword ?? item.key ?? item.query ?? keywordData?.keyword
  );
  if (!keyword) return undefined;
  const serpFeaturesSource = Array.isArray(item.serp_features)
    ? item.serp_features
    : Array.isArray(serpItem?.serp_features)
      ? serpItem.serp_features
      : [];
  const serpFeatures = serpFeaturesSource.filter((value): value is string => typeof value === 'string');
  return {
    keyword,
    rank: readNumber(
      item.rank_absolute
      ?? item.rank
      ?? item.position
      ?? serpItem?.rank_absolute
      ?? serpItem?.rank_group
    ),
    url: typeof item.url === 'string'
      ? item.url
      : typeof serpItem?.url === 'string'
        ? serpItem.url
        : undefined,
    etv: readNumber(item.etv ?? item.traffic ?? serpItem?.etv),
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
    language_code: mapDataForSeoLanguageCode(input.language || defaultLanguageCode),
    device: input.device,
    se_type: input.engine
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
      assertDataForSeoTasksSucceeded(body);
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
        target: input.domain.replace(/^www\./i, ''),
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
      assertDataForSeoTasksSucceeded(body);
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

export interface SerpApiKeywordResearchProviderOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Soft cap on SerpAPI requests per provider method (free tier friendly). */
  maxRequestsPerOperation?: number;
  methodologyVersion?: string;
}

const serpApiMarketLocale: Record<string, { gl: string; hl: string }> = {
  US: { gl: 'us', hl: 'en' },
  GB: { gl: 'uk', hl: 'en' },
  HK: { gl: 'hk', hl: 'zh-tw' },
  TW: { gl: 'tw', hl: 'zh-tw' },
  CN: { gl: 'cn', hl: 'zh-cn' },
  ES: { gl: 'es', hl: 'es' },
  MX: { gl: 'mx', hl: 'es' }
};

function resolveSerpApiLocale(market: string, language: string) {
  const mapped = serpApiMarketLocale[market.trim().toUpperCase()];
  if (mapped) return mapped;
  const lang = mapDataForSeoLanguageCode(language);
  return { gl: market.trim().toLowerCase().slice(0, 2) || 'us', hl: lang === 'zh_tw' ? 'zh-tw' : lang === 'zh_cn' ? 'zh-cn' : lang || 'en' };
}

function isKeywordProviderFailure(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return message.startsWith('KEYWORD_PROVIDER_') || message === 'PROVIDER_UNAVAILABLE';
}

function deriveBrandFromDomain(domain: string) {
  const labels = domain.toLowerCase().replace(/^www\./, '').split('.').filter(Boolean);
  const multiPartSecondLevel = new Set(['com', 'co', 'net', 'org', 'gov', 'edu', 'ac']);
  let brand = labels[0] ?? domain;
  if (labels.length >= 3 && multiPartSecondLevel.has(labels[labels.length - 2] ?? '')) {
    brand = labels[labels.length - 3] ?? brand;
  } else if (labels.length >= 2) {
    brand = labels[labels.length - 2] ?? brand;
  }
  return brand.replace(/[-_]+/g, ' ').trim();
}

function hostMatchesDomain(urlValue: string | undefined, domain: string) {
  if (!urlValue) return false;
  try {
    const host = new URL(urlValue).hostname.toLowerCase().replace(/^www\./, '');
    const target = domain.toLowerCase().replace(/^www\./, '');
    return host === target || host.endsWith(`.${target}`);
  } catch {
    return false;
  }
}

export function createSerpApiKeywordResearchProvider(
  options: SerpApiKeywordResearchProviderOptions
): KeywordResearchProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? 'https://serpapi.com/search');
  const timeoutMs = options.timeoutMs ?? 60_000;
  const maxRequests = Math.max(1, options.maxRequestsPerOperation ?? 8);
  const methodologyVersion = options.methodologyVersion ?? 'serpapi-keyword-research-v1';

  async function requestSerpApi(params: Record<string, string>) {
    const query = new URLSearchParams({ ...params, api_key: options.apiKey, output: 'json' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl}?${query.toString()}`, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`KEYWORD_PROVIDER_HTTP_${response.status}`);
      }
      const body = await response.json() as Record<string, unknown>;
      if (typeof body.error === 'string' && body.error.trim()) {
        const message = body.error.toLowerCase();
        if (message.includes('invalid') || message.includes('api key')) {
          throw new Error('KEYWORD_PROVIDER_HTTP_401');
        }
        if (message.includes('run out') || message.includes('quota') || message.includes('limit')) {
          throw new Error('KEYWORD_PROVIDER_HTTP_429');
        }
        throw new Error('KEYWORD_PROVIDER_RESPONSE_INVALID');
      }
      return body;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('KEYWORD_PROVIDER_TIMEOUT', { cause: error });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    id: 'serpapi',
    async getCapabilities() {
      return createCapabilities('serpapi', true);
    },
    async discoverKeywordMetrics(input) {
      const locale = resolveSerpApiLocale(input.market, input.language);
      const seeds = [...new Set(input.seeds.map((seed) => seed.trim()).filter(Boolean))].slice(0, Math.min(5, maxRequests));
      const metrics: KeywordMetricResult[] = [];
      const rawResponses: unknown[] = [];
      let requests = 0;
      for (const seed of seeds) {
        if (requests >= maxRequests) break;
        const body = await requestSerpApi({
          engine: 'google_autocomplete',
          q: seed,
          gl: locale.gl,
          hl: locale.hl
        });
        requests += 1;
        rawResponses.push(body);
        const suggestions = Array.isArray(body.suggestions) ? body.suggestions : [];
        for (const row of suggestions) {
          const keyword = normalizeKeyword(
            typeof row === 'string'
              ? row
              : row && typeof row === 'object'
                ? (row as { value?: unknown }).value
                : undefined
          );
          if (!keyword) continue;
          metrics.push({ keyword });
        }
        if (metrics.length === 0) {
          metrics.push({ keyword: seed });
        }
      }
      const unique = [...new Map(metrics.map((item) => [item.keyword.toLowerCase(), item])).values()].slice(0, 100);
      const collectedAt = new Date().toISOString();
      return {
        provider: 'serpapi',
        providerSnapshotId: makeSnapshotId('serpapi', { seeds, locale }, rawResponses),
        methodologyVersion,
        location: String(input.market),
        language: input.language,
        device: input.device,
        collectedAt,
        sourceType: 'provider_estimated',
        metrics: unique,
        estimatedCost: requests,
        rawResponseHash: hashPayload(rawResponses)
      } satisfies KeywordMetricsResult;
    },
    async getCompetitorRankedKeywords(input) {
      const locale = resolveSerpApiLocale(input.market, input.language);
      const domain = input.domain.replace(/^www\./i, '');
      const brand = deriveBrandFromDomain(domain) || domain;
      const rawResponses: unknown[] = [];
      let requests = 0;
      const ranked = new Map<string, RankedKeywordResult>();

      const siteBody = await requestSerpApi({
        engine: 'google',
        q: `site:${domain}`,
        gl: locale.gl,
        hl: locale.hl,
        num: '10',
        device: input.device
      });
      requests += 1;
      rawResponses.push(siteBody);
      const organic = Array.isArray(siteBody.organic_results) ? siteBody.organic_results : [];
      for (const row of organic) {
        if (!row || typeof row !== 'object') continue;
        const item = row as { title?: unknown; link?: unknown; position?: unknown };
        const title = normalizeKeyword(item.title);
        if (!title) continue;
        const keyword = title
          .replace(/\s*[|\-–—].*$/, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 120);
        if (!keyword) continue;
        ranked.set(keyword.toLowerCase(), {
          keyword,
          rank: readNumber(item.position) ?? 1,
          url: typeof item.link === 'string' ? item.link : undefined
        });
      }

      if (requests < maxRequests) {
        const brandBody = await requestSerpApi({
          engine: 'google',
          q: brand,
          gl: locale.gl,
          hl: locale.hl,
          num: '10',
          device: input.device
        });
        requests += 1;
        rawResponses.push(brandBody);
        const related = Array.isArray(brandBody.related_searches) ? brandBody.related_searches : [];
        const peopleAlsoAsk = Array.isArray(brandBody.related_questions) ? brandBody.related_questions : [];
        const candidateQueries = [
          ...related.map((row) => normalizeKeyword(
            row && typeof row === 'object' ? (row as { query?: unknown }).query : row
          )),
          ...peopleAlsoAsk.map((row) => normalizeKeyword(
            row && typeof row === 'object' ? (row as { question?: unknown }).question : row
          )),
          ...input.seeds.map((seed) => normalizeKeyword(seed))
        ].filter(Boolean);

        for (const query of [...new Set(candidateQueries)].slice(0, Math.max(0, maxRequests - requests))) {
          const body = await requestSerpApi({
            engine: 'google',
            q: query,
            gl: locale.gl,
            hl: locale.hl,
            num: '10',
            device: input.device
          });
          requests += 1;
          rawResponses.push(body);
          const results = Array.isArray(body.organic_results) ? body.organic_results : [];
          for (const row of results) {
            if (!row || typeof row !== 'object') continue;
            const item = row as { link?: unknown; position?: unknown };
            if (!hostMatchesDomain(typeof item.link === 'string' ? item.link : undefined, domain)) continue;
            ranked.set(query.toLowerCase(), {
              keyword: query,
              rank: readNumber(item.position),
              url: typeof item.link === 'string' ? item.link : undefined
            });
            break;
          }
          if (!ranked.has(query.toLowerCase())) {
            ranked.set(query.toLowerCase(), { keyword: query });
          }
        }
      }

      const keywords = [...ranked.values()]
        .filter((item) => item.rank === undefined || (item.rank >= 1 && item.rank <= 100))
        .slice(0, Math.min(100, Math.max(1, input.limit)));
      const collectedAt = new Date().toISOString();
      return {
        provider: 'serpapi',
        providerSnapshotId: makeSnapshotId('serpapi', { domain, locale, limit: input.limit }, rawResponses),
        methodologyVersion,
        location: String(input.market),
        language: input.language,
        device: input.device,
        collectedAt,
        sourceType: 'provider_estimated',
        domain: input.domain,
        keywords,
        estimatedCost: requests,
        rawResponseHash: hashPayload(rawResponses)
      } satisfies CompetitorRankedKeywordsResult;
    }
  };
}

/**
 * Prefer the primary provider; on Keyword provider failures, transparently retry with fallback.
 */
export function createFallbackKeywordResearchProvider(
  primary: KeywordResearchProvider,
  fallback: KeywordResearchProvider
): KeywordResearchProvider {
  return {
    id: primary.id,
    async getCapabilities() {
      const [primaryCapabilities, fallbackCapabilities] = await Promise.all([
        primary.getCapabilities(),
        fallback.getCapabilities()
      ]);
      return {
        provider: primaryCapabilities.provider,
        supportsKeywordMetrics: primaryCapabilities.supportsKeywordMetrics || fallbackCapabilities.supportsKeywordMetrics,
        supportsCompetitorRankedKeywords:
          primaryCapabilities.supportsCompetitorRankedKeywords || fallbackCapabilities.supportsCompetitorRankedKeywords,
        supportsBacklinkOpportunities:
          primaryCapabilities.supportsBacklinkOpportunities || fallbackCapabilities.supportsBacklinkOpportunities
      };
    },
    async discoverKeywordMetrics(input) {
      try {
        return await primary.discoverKeywordMetrics(input);
      } catch (error) {
        if (!isKeywordProviderFailure(error)) throw error;
        return fallback.discoverKeywordMetrics(input);
      }
    },
    async getCompetitorRankedKeywords(input) {
      try {
        return await primary.getCompetitorRankedKeywords(input);
      } catch (error) {
        if (!isKeywordProviderFailure(error)) throw error;
        return fallback.getCompetitorRankedKeywords(input);
      }
    }
  };
}
