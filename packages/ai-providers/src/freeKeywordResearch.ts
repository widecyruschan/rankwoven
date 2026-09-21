import { createHash } from 'node:crypto';
import type {
  CompetitorRankedKeywordsInput,
  CompetitorRankedKeywordsResult,
  KeywordMetricResult,
  KeywordMetricsInput,
  KeywordMetricsResult,
  KeywordResearchProvider,
  RankedKeywordResult
} from './phase2.js';

export interface FreeKeywordResearchProviderOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  methodologyVersion?: string;
  /** Optional Bing Webmaster API key for volume enrichment. */
  bingApiKey?: string;
  /** Optional Brave Search API key for SERP demand cross-check. */
  braveApiKey?: string;
  /** Optional SSRF-safe URL validator (API/Worker should pass validatePublicUrl). */
  validateUrl?: (url: string) => Promise<{ url: URL } | URL>;
  maxSitemapUrls?: number;
  maxExpandedKeywords?: number;
}

export interface ExpandedKeyword {
  keyword: string;
  intent?: 'informational' | 'commercial' | 'transactional' | 'navigational';
  source: 'google_autocomplete' | 'datamuse' | 'wikipedia' | 'suffix' | 'brave' | 'bing' | 'sitemap';
  volume?: number;
}

export interface SitemapContentTopic {
  keyword: string;
  url: string;
  source: 'sitemap';
}

export interface SitemapContentGap {
  keyword: string;
  competitorUrl: string;
  classification: 'missing';
}

const latinLongTailSuffixes = [
  'how to',
  'what is',
  'best',
  'vs',
  'review',
  'pricing',
  'examples',
  'guide',
  'tools',
  'for beginners'
];

const cjkLongTailSuffixes = [
  '是什麼',
  '教學',
  '推薦',
  '比較',
  '價格',
  '怎麼選',
  '常見問題',
  '工具',
  '攻略',
  '評價'
];

function normalizeKeyword(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function hashPayload(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function makeSnapshotId(provider: string, input: unknown, response: unknown) {
  return `${provider}-${hashPayload({ input, response }).slice(0, 32)}`;
}

function looksLikeCjk(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

function wikipediaLanguage(language: string) {
  const normalized = language.trim().toLowerCase().replace(/_/g, '-');
  if (normalized.startsWith('zh')) {
    if (normalized.includes('cn') || normalized.includes('hans')) return 'zh';
    return 'zh';
  }
  const base = normalized.split('-')[0] ?? 'en';
  return /^[a-z]{2}$/.test(base) ? base : 'en';
}

function autocompleteLocale(market: string, language: string) {
  const marketKey = market.trim().toUpperCase();
  const mapped: Record<string, { hl: string; gl: string }> = {
    US: { hl: 'en', gl: 'us' },
    GB: { hl: 'en', gl: 'uk' },
    HK: { hl: 'zh-TW', gl: 'hk' },
    TW: { hl: 'zh-TW', gl: 'tw' },
    CN: { hl: 'zh-CN', gl: 'cn' },
    ES: { hl: 'es', gl: 'es' },
    MX: { hl: 'es', gl: 'mx' }
  };
  if (mapped[marketKey]) return mapped[marketKey];
  const lang = wikipediaLanguage(language);
  return { hl: lang === 'zh' ? 'zh-TW' : lang, gl: marketKey.slice(0, 2).toLowerCase() || 'us' };
}

export function classifySearchIntent(
  keyword: string
): ExpandedKeyword['intent'] {
  const lower = keyword.toLowerCase();
  if (/(buy|price|pricing|優惠|價格|購買|訂購|coupon|discount)/i.test(lower)) return 'transactional';
  if (/(best|vs|比較|推薦|review|評價|top\s?\d)/i.test(lower)) return 'commercial';
  if (/(login|官方|官網|brand)/i.test(lower)) return 'navigational';
  return 'informational';
}

function slugToKeyword(pathname: string) {
  const segments = pathname
    .split('/')
    .map((part) => decodeURIComponent(part).replace(/\.[a-z0-9]+$/i, ''))
    .filter((part) => part && !/^(category|tag|page|wp-|feed|author|\d+)$/i.test(part));
  const last = segments.at(-1) ?? '';
  const phrase = last.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return phrase.length >= 2 ? phrase : '';
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  timeoutMs: number,
  init?: RequestInit
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'RankWovenFreeKeywordResearch/1.0',
        ...init?.headers
      }
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('KEYWORD_PROVIDER_TIMEOUT', { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function googleAutocomplete(
  fetchImpl: typeof fetch,
  seed: string,
  market: string,
  language: string,
  timeoutMs: number
): Promise<ExpandedKeyword[]> {
  const locale = autocompleteLocale(market, language);
  const queries = [seed];
  if (looksLikeCjk(seed)) {
    for (const suffix of ['怎麼', '是', '推薦', '教學']) {
      queries.push(`${seed}${suffix}`);
    }
  } else {
    for (const letter of 'abcdefghijklmnopqrstuvwxyz'.slice(0, 6)) {
      queries.push(`${seed} ${letter}`);
    }
  }

  const results: ExpandedKeyword[] = [];
  for (const query of [...new Set(queries)].slice(0, 8)) {
    const url = new URL('https://suggestqueries.google.com/complete/search');
    url.searchParams.set('client', 'firefox');
    url.searchParams.set('q', query);
    url.searchParams.set('hl', locale.hl);
    url.searchParams.set('gl', locale.gl);
    try {
      const response = await fetchWithTimeout(fetchImpl, url.toString(), timeoutMs);
      if (!response.ok) continue;
      const body = await response.json() as unknown;
      const suggestions = Array.isArray(body) && Array.isArray(body[1]) ? body[1] : [];
      for (const item of suggestions) {
        const keyword = normalizeKeyword(item);
        if (!keyword) continue;
        results.push({
          keyword,
          intent: classifySearchIntent(keyword),
          source: 'google_autocomplete'
        });
      }
    } catch {
      // Free sources are best-effort; skip failed queries.
    }
  }
  return results;
}

async function datamuseExpand(
  fetchImpl: typeof fetch,
  seed: string,
  timeoutMs: number
): Promise<ExpandedKeyword[]> {
  if (looksLikeCjk(seed)) return [];
  const endpoints = [
    `https://api.datamuse.com/words?ml=${encodeURIComponent(seed)}&max=25`,
    `https://api.datamuse.com/words?rel_trg=${encodeURIComponent(seed)}&max=25`
  ];
  const results: ExpandedKeyword[] = [];
  for (const endpoint of endpoints) {
    try {
      const response = await fetchWithTimeout(fetchImpl, endpoint, timeoutMs);
      if (!response.ok) continue;
      const body = await response.json() as Array<{ word?: string }>;
      if (!Array.isArray(body)) continue;
      for (const row of body) {
        const word = normalizeKeyword(row.word);
        if (!word || word.split(' ').length > 4) continue;
        const keyword = word.includes(seed.toLowerCase()) ? word : `${seed} ${word}`;
        results.push({
          keyword: normalizeKeyword(keyword),
          intent: classifySearchIntent(keyword),
          source: 'datamuse'
        });
      }
    } catch {
      // ignore
    }
  }
  return results;
}

async function wikipediaExpand(
  fetchImpl: typeof fetch,
  seed: string,
  language: string,
  timeoutMs: number
): Promise<ExpandedKeyword[]> {
  const lang = wikipediaLanguage(language);
  const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  url.searchParams.set('action', 'opensearch');
  url.searchParams.set('search', seed);
  url.searchParams.set('limit', '12');
  url.searchParams.set('namespace', '0');
  url.searchParams.set('format', 'json');
  try {
    const response = await fetchWithTimeout(fetchImpl, url.toString(), timeoutMs);
    if (!response.ok) return [];
    const body = await response.json() as unknown;
    const titles = Array.isArray(body) && Array.isArray(body[1]) ? body[1] : [];
    return titles
      .map((title) => normalizeKeyword(title))
      .filter(Boolean)
      .map((keyword) => ({
        keyword,
        intent: classifySearchIntent(keyword),
        source: 'wikipedia' as const
      }));
  } catch {
    return [];
  }
}

async function braveRelated(
  fetchImpl: typeof fetch,
  seed: string,
  apiKey: string,
  timeoutMs: number
): Promise<ExpandedKeyword[]> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', seed);
  url.searchParams.set('count', '10');
  try {
    const response = await fetchWithTimeout(fetchImpl, url.toString(), timeoutMs, {
      headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' }
    });
    if (!response.ok) return [];
    const body = await response.json() as {
      query?: { altered?: string };
      related?: { results?: Array<{ query?: string }> };
    };
    const related = body.related?.results ?? [];
    const keywords = related
      .map((row) => normalizeKeyword(row.query))
      .filter(Boolean);
    if (body.query?.altered) keywords.push(normalizeKeyword(body.query.altered));
    return keywords.map((keyword) => ({
      keyword,
      intent: classifySearchIntent(keyword),
      source: 'brave' as const
    }));
  } catch {
    return [];
  }
}

function suffixExpand(seed: string): ExpandedKeyword[] {
  const suffixes = looksLikeCjk(seed) ? cjkLongTailSuffixes : latinLongTailSuffixes;
  return suffixes.map((suffix) => {
    const keyword = looksLikeCjk(seed) ? `${seed}${suffix}` : `${seed} ${suffix}`;
    return {
      keyword: normalizeKeyword(keyword),
      intent: classifySearchIntent(keyword),
      source: 'suffix' as const
    };
  });
}

/**
 * Expand seed keywords into long-tail / related phrases using free public APIs.
 * Does not fabricate search volume unless Bing key is configured later.
 */
export async function expandLongTailKeywords(
  seeds: string[],
  options: {
    market?: string;
    language?: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    bingApiKey?: string;
    braveApiKey?: string;
    maxKeywords?: number;
  } = {}
): Promise<ExpandedKeyword[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 12_000;
  const market = options.market ?? 'US';
  const language = options.language ?? 'en';
  const maxKeywords = options.maxKeywords ?? 120;
  const uniqueSeeds = [...new Set(seeds.map((seed) => normalizeKeyword(seed)).filter(Boolean))].slice(0, 5);
  const collected: ExpandedKeyword[] = [];

  for (const seed of uniqueSeeds) {
    collected.push({ keyword: seed, intent: classifySearchIntent(seed), source: 'suffix' });
    const [auto, datamuse, wiki, brave] = await Promise.all([
      googleAutocomplete(fetchImpl, seed, market, language, timeoutMs),
      datamuseExpand(fetchImpl, seed, timeoutMs),
      wikipediaExpand(fetchImpl, seed, language, timeoutMs),
      options.braveApiKey
        ? braveRelated(fetchImpl, seed, options.braveApiKey, timeoutMs)
        : Promise.resolve([] as ExpandedKeyword[])
    ]);
    collected.push(...auto, ...datamuse, ...wiki, ...brave, ...suffixExpand(seed));
  }

  return [...new Map(
    collected
      .map((item) => ({ ...item, keyword: normalizeKeyword(item.keyword) }))
      .filter((item) => item.keyword.length >= 2)
      .map((item) => [item.keyword.toLowerCase(), item])
  ).values()].slice(0, maxKeywords);
}

function extractUrlsFromSitemapXml(body: string, limit: number) {
  const urls: string[] = [];
  for (const match of body.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
    const value = match[1]?.trim();
    if (!value) continue;
    urls.push(value);
    if (urls.length >= limit) break;
  }
  return urls;
}

async function resolveValidatedUrl(
  url: string,
  validateUrl?: FreeKeywordResearchProviderOptions['validateUrl']
) {
  if (!validateUrl) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('UNSAFE_TARGET_URL');
    }
    return parsed;
  }
  const validated = await validateUrl(url);
  return validated instanceof URL ? validated : validated.url;
}

/**
 * Collect content topics from a domain's public sitemap (competitor content analysis).
 */
export async function collectSitemapContentTopics(
  domain: string,
  options: FreeKeywordResearchProviderOptions = {}
): Promise<SitemapContentTopic[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxUrls = options.maxSitemapUrls ?? 200;
  const host = domain.replace(/^www\./i, '').toLowerCase();
  const candidates = [
    `https://${host}/sitemap.xml`,
    `https://${host}/sitemap_index.xml`,
    `https://www.${host}/sitemap.xml`,
    `https://${host}/wp-sitemap.xml`
  ];

  const topics: SitemapContentTopic[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    try {
      const target = await resolveValidatedUrl(candidate, options.validateUrl);
      const response = await fetchWithTimeout(fetchImpl, target.toString(), timeoutMs);
      if (!response.ok) continue;
      const contentType = response.headers.get('content-type') ?? '';
      const body = await response.text();
      if (!/<urlset|<sitemapindex/i.test(body) && !/xml/i.test(contentType)) continue;

      let pageUrls = extractUrlsFromSitemapXml(body, maxUrls);
      if (/<sitemapindex/i.test(body)) {
        const childSitemaps = pageUrls.slice(0, 5);
        pageUrls = [];
        for (const child of childSitemaps) {
          try {
            const childTarget = await resolveValidatedUrl(child, options.validateUrl);
            if (childTarget.hostname.replace(/^www\./i, '').toLowerCase() !== host
              && !childTarget.hostname.replace(/^www\./i, '').toLowerCase().endsWith(`.${host}`)) {
              continue;
            }
            const childResponse = await fetchWithTimeout(fetchImpl, childTarget.toString(), timeoutMs);
            if (!childResponse.ok) continue;
            pageUrls.push(...extractUrlsFromSitemapXml(await childResponse.text(), maxUrls - pageUrls.length));
            if (pageUrls.length >= maxUrls) break;
          } catch {
            // skip unsafe/unreachable child sitemaps
          }
        }
      }

      for (const pageUrl of pageUrls) {
        try {
          const parsed = new URL(pageUrl);
          const pageHost = parsed.hostname.replace(/^www\./i, '').toLowerCase();
          if (pageHost !== host && !pageHost.endsWith(`.${host}`)) continue;
          const keyword = slugToKeyword(parsed.pathname);
          if (!keyword || seen.has(keyword.toLowerCase())) continue;
          seen.add(keyword.toLowerCase());
          topics.push({ keyword, url: parsed.toString(), source: 'sitemap' });
          if (topics.length >= Math.min(100, maxUrls)) return topics;
        } catch {
          // skip invalid URLs
        }
      }
      if (topics.length > 0) return topics;
    } catch {
      // try next sitemap candidate
    }
  }
  return topics;
}

/**
 * Diff own vs competitor sitemap topics → content gaps.
 */
export async function compareSitemapContentGaps(
  ownDomain: string,
  competitorDomain: string,
  options: FreeKeywordResearchProviderOptions = {}
): Promise<SitemapContentGap[]> {
  const [ownTopics, competitorTopics] = await Promise.all([
    collectSitemapContentTopics(ownDomain, options),
    collectSitemapContentTopics(competitorDomain, options)
  ]);
  const ownKeys = new Set(ownTopics.map((topic) => topic.keyword.toLowerCase()));
  return competitorTopics
    .filter((topic) => !ownKeys.has(topic.keyword.toLowerCase()))
    .slice(0, 80)
    .map((topic) => ({
      keyword: topic.keyword,
      competitorUrl: topic.url,
      classification: 'missing' as const
    }));
}

export function createFreeKeywordResearchProvider(
  options: FreeKeywordResearchProviderOptions = {}
): KeywordResearchProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const methodologyVersion = options.methodologyVersion ?? 'free-keyword-research-v1';
  const maxExpanded = options.maxExpandedKeywords ?? 120;

  return {
    id: 'free',
    async getCapabilities() {
      return {
        provider: 'free',
        supportsKeywordMetrics: true,
        supportsCompetitorRankedKeywords: true,
        supportsBacklinkOpportunities: false
      };
    },
    async discoverKeywordMetrics(input: KeywordMetricsInput): Promise<KeywordMetricsResult> {
      const expanded = await expandLongTailKeywords(input.seeds, {
        market: input.market,
        language: input.language,
        fetchImpl,
        timeoutMs,
        bingApiKey: options.bingApiKey,
        braveApiKey: options.braveApiKey,
        maxKeywords: maxExpanded
      });
      const metrics: KeywordMetricResult[] = expanded.map((item) => ({
        keyword: item.keyword,
        volume: item.volume
      }));
      const collectedAt = new Date().toISOString();
      return {
        provider: 'free',
        providerSnapshotId: makeSnapshotId('free', input, expanded.map((item) => item.keyword)),
        methodologyVersion,
        location: String(input.market),
        language: input.language,
        device: input.device,
        collectedAt,
        sourceType: 'provider_estimated',
        metrics,
        estimatedCost: 0,
        rawResponseHash: hashPayload(expanded)
      };
    },
    async getCompetitorRankedKeywords(input: CompetitorRankedKeywordsInput): Promise<CompetitorRankedKeywordsResult> {
      const topics = await collectSitemapContentTopics(input.domain, {
        ...options,
        fetchImpl,
        timeoutMs
      });
      const seedExpanded = await expandLongTailKeywords(
        input.seeds.length > 0 ? input.seeds : [input.domain.split('.')[0] ?? input.domain],
        {
          market: input.market,
          language: input.language,
          fetchImpl,
          timeoutMs,
          braveApiKey: options.braveApiKey,
          maxKeywords: 40
        }
      );
      const keywords: RankedKeywordResult[] = [
        ...topics.map((topic) => ({ keyword: topic.keyword, url: topic.url })),
        ...seedExpanded.map((item) => ({ keyword: item.keyword }))
      ];
      const unique = [...new Map(keywords.map((item) => [item.keyword.toLowerCase(), item])).values()]
        .slice(0, Math.min(100, Math.max(1, input.limit)));
      const collectedAt = new Date().toISOString();
      return {
        provider: 'free',
        providerSnapshotId: makeSnapshotId('free-sitemap', input, unique.map((item) => item.keyword)),
        methodologyVersion,
        location: String(input.market),
        language: input.language,
        device: input.device,
        collectedAt,
        sourceType: 'provider_estimated',
        domain: input.domain,
        keywords: unique,
        estimatedCost: 0,
        rawResponseHash: hashPayload(unique)
      };
    }
  };
}

/**
 * Always enrich with free expansion; paid metrics win for volume/CPC/difficulty/rank.
 */
export function createEnrichingKeywordResearchProvider(
  primary: KeywordResearchProvider,
  free: KeywordResearchProvider = createFreeKeywordResearchProvider()
): KeywordResearchProvider {
  if (primary.id === 'free') return primary;

  return {
    id: primary.id,
    async getCapabilities() {
      const [primaryCapabilities, freeCapabilities] = await Promise.all([
        primary.getCapabilities(),
        free.getCapabilities()
      ]);
      return {
        provider: primaryCapabilities.provider,
        supportsKeywordMetrics: primaryCapabilities.supportsKeywordMetrics || freeCapabilities.supportsKeywordMetrics,
        supportsCompetitorRankedKeywords:
          primaryCapabilities.supportsCompetitorRankedKeywords || freeCapabilities.supportsCompetitorRankedKeywords,
        supportsBacklinkOpportunities:
          primaryCapabilities.supportsBacklinkOpportunities || freeCapabilities.supportsBacklinkOpportunities
      };
    },
    async discoverKeywordMetrics(input) {
      const freeResultPromise = free.discoverKeywordMetrics(input);
      let primaryResult: KeywordMetricsResult | undefined;
      try {
        primaryResult = await primary.discoverKeywordMetrics(input);
      } catch (error) {
        const freeResult = await freeResultPromise;
        if (freeResult.metrics.length > 0) return { ...freeResult, provider: primary.id };
        throw error;
      }
      const freeResult = await freeResultPromise.catch(() => undefined);
      const merged = new Map<string, KeywordMetricResult>();
      for (const metric of freeResult?.metrics ?? []) {
        merged.set(metric.keyword.toLowerCase(), metric);
      }
      for (const metric of primaryResult.metrics) {
        const existing = merged.get(metric.keyword.toLowerCase());
        merged.set(metric.keyword.toLowerCase(), existing
          ? {
              ...existing,
              ...metric,
              volume: metric.volume ?? existing.volume,
              cpcUsd: metric.cpcUsd ?? existing.cpcUsd,
              competition: metric.competition ?? existing.competition,
              difficulty: metric.difficulty ?? existing.difficulty,
              trend: metric.trend ?? existing.trend
            }
          : metric);
      }
      return {
        ...primaryResult,
        metrics: [...merged.values()].slice(0, 200),
        estimatedCost: primaryResult.estimatedCost + (freeResult?.estimatedCost ?? 0),
        methodologyVersion: `${primaryResult.methodologyVersion}+${freeResult?.methodologyVersion ?? 'free'}`
      };
    },
    async getCompetitorRankedKeywords(input) {
      const freeResultPromise = free.getCompetitorRankedKeywords(input);
      let primaryResult: CompetitorRankedKeywordsResult | undefined;
      try {
        primaryResult = await primary.getCompetitorRankedKeywords(input);
      } catch (error) {
        const freeResult = await freeResultPromise;
        if (freeResult.keywords.length > 0) return { ...freeResult, provider: primary.id };
        throw error;
      }
      const freeResult = await freeResultPromise.catch(() => undefined);
      const merged = new Map<string, RankedKeywordResult>();
      for (const item of freeResult?.keywords ?? []) {
        merged.set(item.keyword.toLowerCase(), item);
      }
      for (const item of primaryResult.keywords) {
        const existing = merged.get(item.keyword.toLowerCase());
        merged.set(item.keyword.toLowerCase(), existing
          ? {
              ...existing,
              ...item,
              rank: item.rank ?? existing.rank,
              url: item.url ?? existing.url,
              etv: item.etv ?? existing.etv,
              serpFeatures: item.serpFeatures ?? existing.serpFeatures
            }
          : item);
      }
      return {
        ...primaryResult,
        keywords: [...merged.values()].slice(0, Math.min(100, Math.max(1, input.limit))),
        estimatedCost: primaryResult.estimatedCost + (freeResult?.estimatedCost ?? 0),
        methodologyVersion: `${primaryResult.methodologyVersion}+${freeResult?.methodologyVersion ?? 'free'}`
      };
    }
  };
}
