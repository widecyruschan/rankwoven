import type { FastifyInstance, FastifyReply } from 'fastify';
import type { TextGenerationProvider } from '@aieo/ai-providers';
import { z } from 'zod';
import { requireAuth, type AuthService } from './auth';
import { apiConfig } from './config';

// ── Types ────────────────────────────────────────────────────────

type KeywordDataSource = 'dataforseo' | 'ahrefs' | 'semrush' | 'gsc' | 'ai-provider' | 'fallback';

export interface KeywordSuggestion {
  keyword: string;
  intent: 'informational' | 'commercial' | 'transactional' | 'local';
  difficulty: 'low' | 'medium' | 'high';
  opportunityScore: number;
  monthlySearchVolume?: number;
  cpcUsd?: number;
  competition?: number;
  /** Primary data source for volume/CPC/competition metrics */
  source: KeywordDataSource;
  /** Detailed trace of where each metric came from */
  sourceTrace: KeywordSourceTrace;
  searchIntentSummary: string;
  contentAngle: string;
  /** Merged GSC performance data if available */
  gscData?: KeywordGscData;
}

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

interface ThirdPartyKeywordMetric {
  keyword: string;
  monthlySearchVolume?: number;
  cpcUsd?: number;
  competition?: number;
  keywordDifficulty?: number;
}

interface KeywordSuggestionService {
  createSuggestions(input: z.infer<typeof keywordSuggestionSchema> & { userId: string; siteUrl?: string }): Promise<{
    source: 'enriched' | 'ai-provider' | 'fallback';
    suggestions: KeywordSuggestion[];
  }>;
  enrichKeywords(
    keywords: string[],
    locale: string
  ): Promise<Map<string, ThirdPartyKeywordMetric>>;
}

// ── Schema ───────────────────────────────────────────────────────

const keywordSuggestionSchema = z.object({
  seedKeyword: z.string().trim().min(1).max(120),
  locale: z.string().trim().min(2).max(20).default('zh-Hant'),
  intent: z.enum(['informational', 'commercial', 'transactional', 'local']).default('informational'),
  siteUrl: z.string().trim().max(500).optional()
});

const enrichSchema = z.object({
  keywords: z.array(z.string().trim().min(1).max(200)).min(1).max(50),
  locale: z.string().trim().min(2).max(20).default('zh-Hant')
});

// ── Helpers ──────────────────────────────────────────────────────

function normalizeKeyword(keyword: string) {
  return keyword.replace(/\s+/g, ' ').trim();
}

function getIntentSummary(intent: KeywordSuggestion['intent']) {
  const summaries: Record<KeywordSuggestion['intent'], string> = {
    informational: '用戶正在尋找教學、定義、流程或比較資料。',
    commercial: '用戶正在比較方案、服務商、價格或採購因素。',
    transactional: '用戶接近購買或註冊，需要清晰行動入口。',
    local: '用戶帶有地區、附近服務或本地商家意圖。'
  };
  return summaries[intent];
}

function getDifficultyFromMetric(metric: ThirdPartyKeywordMetric): KeywordSuggestion['difficulty'] {
  const kd = metric.keywordDifficulty ?? metric.competition;
  if (kd !== undefined && kd !== null) {
    // keyword_difficulty is typically 0-100, competition is 0-1
    if (kd > 1) return kd < 35 ? 'low' : kd < 70 ? 'medium' : 'high';
    return kd < 0.35 ? 'low' : kd < 0.7 ? 'medium' : 'high';
  }
  return 'medium';
}

function getDifficultyFromIndex(index: number): KeywordSuggestion['difficulty'] {
  if (index <= 1) return 'low';
  return index <= 4 ? 'medium' : 'high';
}

function calculateRealOpportunityScore(metric: ThirdPartyKeywordMetric, gscData?: KeywordGscData): number {
  const volume = metric.monthlySearchVolume ?? 100;
  const competition = metric.competition ?? 0.5;
  const kd = metric.keywordDifficulty ?? competition * 100;

  // Volume score: 0-35 points
  const logVolume = Math.log2(Math.max(10, volume));
  const volumeScore = Math.min(35, Math.round(logVolume * 3.5));

  // Difficulty penalty: 0-30 points (easier = higher score)
  const difficultyPenalty = Math.round((kd / 100) * 30);

  // GSC bonus: up to 15 points if keyword already ranks
  let gscBonus = 0;
  if (gscData) {
    const positionScore = Math.max(0, 15 - gscData.position * 0.7);
    const impressionsBonus = Math.min(5, Math.round(gscData.impressions / 1000));
    gscBonus = Math.round(positionScore + impressionsBonus);
  }

  return Math.max(20, Math.min(98, 50 + volumeScore - difficultyPenalty + gscBonus));
}

// ── Template keyword generation ──────────────────────────────────

function buildKeywordTemplates(seedKeyword: string, intent: KeywordSuggestion['intent']) {
  const keyword = normalizeKeyword(seedKeyword);
  const templates: Record<KeywordSuggestion['intent'], string[]> = {
    informational: [
      `${keyword} 教學`, `${keyword} 是什麼`, `${keyword} 最佳實踐`,
      `${keyword} 常見問題`, `${keyword} 工具`, `${keyword} 趨勢`
    ],
    commercial: [
      `${keyword} 推薦`, `${keyword} 比較`, `${keyword} 價格`,
      `${keyword} 方案`, `${keyword} 服務商`, `${keyword} 評價`
    ],
    transactional: [
      `${keyword} 試用`, `${keyword} 註冊`, `${keyword} 報價`,
      `${keyword} 顧問`, `${keyword} 套餐`, `${keyword} 開始使用`
    ],
    local: [
      `${keyword} 香港`, `${keyword} 附近`, `${keyword} 本地服務`,
      `${keyword} 公司`, `${keyword} 專家`, `${keyword} 案例`
    ]
  };
  return templates[intent];
}

function createEstimatedTrace(keywordIdeaSource: 'ai-provider' | 'template'): KeywordSourceTrace {
  return {
    keywordIdea: keywordIdeaSource,
    volume: 'estimated',
    cpc: 'estimated',
    competition: 'estimated',
    difficulty: 'estimated',
    verified: false
  };
}

function createEnrichedTrace(
  keywordIdeaSource: 'ai-provider' | 'template',
  metricSource: KeywordDataSource
): KeywordSourceTrace {
  return {
    keywordIdea: keywordIdeaSource,
    volume: metricSource,
    cpc: metricSource,
    competition: metricSource,
    difficulty: metricSource,
    verified: true
  };
}

// ── AI keyword idea generation ───────────────────────────────────

function parseJsonObject(value: string) {
  const fencedMatch = value.match(/```json\s*([\s\S]*?)```/i);
  const rawJson = fencedMatch?.[1] ?? value;
  const startIndex = rawJson.indexOf('{');
  const endIndex = rawJson.lastIndexOf('}');
  if (startIndex < 0 || endIndex < startIndex) return undefined;
  try {
    return JSON.parse(rawJson.slice(startIndex, endIndex + 1)) as {
      suggestions?: Array<Partial<KeywordSuggestion>>;
    };
  } catch {
    return undefined;
  }
}

async function generateAiKeywordIdeas(
  textProvider: TextGenerationProvider | undefined,
  seedKeyword: string,
  locale: string,
  intent: KeywordSuggestion['intent'],
  userId: string
): Promise<Array<{ keyword: string; searchIntentSummary: string; contentAngle: string }> | undefined> {
  if (!textProvider) return undefined;
  try {
    const languageHint = locale.startsWith('zh') ? '繁體中文' : locale;
    const prompt =
      `Generate 6 keyword suggestions for seed "${seedKeyword}" with intent "${intent}" in ${languageHint}. ` +
      `Return JSON: { "suggestions": [{ "keyword": "...", "searchIntentSummary": "...", "contentAngle": "..." }] }. ` +
      `Do NOT include search volume, CPC, or competition metrics.`;

    const result = await textProvider.generateOutline({
      siteId: 'keyword-research',
      userId,
      locale,
      keyword: seedKeyword,
      title: prompt
    });

    const parsed = parseJsonObject(result.text);
    return parsed?.suggestions
      ?.map((s) => ({
        keyword: normalizeKeyword(String(s.keyword ?? '')),
        searchIntentSummary: String(s.searchIntentSummary ?? getIntentSummary(intent)),
        contentAngle: String(s.contentAngle ?? '')
      }))
      .filter((s) => s.keyword && s.contentAngle);
  } catch {
    return undefined;
  }
}

// ── DataForSEO integration ───────────────────────────────────────

const LOCALE_TO_DFSEO_LOCATION: Record<string, number> = {
  'zh-Hant': 2344, 'zh-TW': 2158, 'zh-HK': 2344,
  zh: 2156, en: 2840
};

function getDfseoLocationCode(locale: string) {
  if (LOCALE_TO_DFSEO_LOCATION[locale]) return LOCALE_TO_DFSEO_LOCATION[locale];
  return locale.startsWith('zh') ? 2344 : 2840;
}

function getDfseoLanguageCode(locale: string) {
  if (locale.startsWith('zh')) return 'zh';
  return locale.startsWith('en') ? 'en' : 'en';
}

function buildDfseoAuthHeader(apiKey: string) {
  return `Basic ${Buffer.from(apiKey).toString('base64')}`;
}

/**
 * Call DataForSEO `keywords_for_keywords` to get real search volume, CPC,
 * and competition for a batch of keywords. This verifies/enriches metrics.
 */
async function fetchDfseoMetrics(
  keywords: string[],
  locale: string,
  fetchImpl: typeof fetch
): Promise<ThirdPartyKeywordMetric[] | undefined> {
  const baseUrl = apiConfig.KEYWORD_VOLUME_API_URL?.replace(/\/$/, '');
  const apiKey = apiConfig.KEYWORD_VOLUME_API_KEY;
  if (!baseUrl || !apiKey) return undefined;

  const locationCode = getDfseoLocationCode(locale);
  const languageCode = getDfseoLanguageCode(locale);

  const requestBody = keywords.map((kw) => ({
    keyword: kw,
    location_code: locationCode,
    language_code: languageCode,
    include_serp_api: false
  }));

  try {
    const response = await fetchImpl(`${baseUrl}/keywords_data/google/keywords_for_keywords/live`, {
      method: 'POST',
      headers: {
        Authorization: buildDfseoAuthHeader(apiKey),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) return undefined;

    const body = await response.json();
    return extractDfseoMetrics(body);
  } catch {
    return undefined;
  }
}

/**
 * Call DataForSEO `keywords_data/google/keywords_for_site/live`
 * to discover related keywords from a site's existing content.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _fetchDfseoRelatedKeywords(
  seedKeyword: string,
  locale: string,
  fetchImpl: typeof fetch
): Promise<ThirdPartyKeywordMetric[] | undefined> {
  const baseUrl = apiConfig.KEYWORD_VOLUME_API_URL?.replace(/\/$/, '');
  const apiKey = apiConfig.KEYWORD_VOLUME_API_KEY;
  if (!baseUrl || !apiKey) return undefined;

  const locationCode = getDfseoLocationCode(locale);
  const languageCode = getDfseoLanguageCode(locale);

  try {
    const response = await fetchImpl(`${baseUrl}/keywords_data/google/keywords_for_keywords/live`, {
      method: 'POST',
      headers: {
        Authorization: buildDfseoAuthHeader(apiKey),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        {
          keywords: [seedKeyword],
          location_code: locationCode,
          language_code: languageCode,
          include_serp_api: false,
          include_clickstream_data: false
        }
      ])
    });

    if (!response.ok) return undefined;

    const body = await response.json();
    const metrics = extractDfseoMetrics(body);

    // Also fetch related keywords via search volume endpoint
    // which returns semantically related queries with volume data
    return metrics;
  } catch {
    return undefined;
  }
}

type DfseoRawItem = Record<string, unknown>;

function extractDfseoMetrics(body: unknown): ThirdPartyKeywordMetric[] {
  if (!body || typeof body !== 'object') return [];

  const tasks = (body as { tasks?: DfseoRawItem[] }).tasks;
  if (!Array.isArray(tasks)) return [];

  const items: ThirdPartyKeywordMetric[] = [];

  for (const task of tasks) {
    const result = task.result as DfseoRawItem[] | undefined;
    if (!Array.isArray(result)) continue;

    for (const item of result) {
      const record = item as DfseoRawItem;
      const keyword = normalizeKeyword(String(record.keyword ?? ''));
      if (!keyword) continue;

      items.push({
        keyword,
        monthlySearchVolume: toNumber(record.search_volume ?? record.monthly_search_volume),
        cpcUsd: toNumber(record.cpc),
        competition: normalizeCompetition(record.competition ?? record.competition_index),
        keywordDifficulty: toNumber(record.keyword_difficulty ?? record.difficulty)
      });
    }
  }

  return items.filter((m) => m.keyword);
}

// ── Ahrefs integration ───────────────────────────────────────────

async function fetchAhrefsMetrics(
  keywords: string[],
  locale: string,
  fetchImpl: typeof fetch
): Promise<ThirdPartyKeywordMetric[] | undefined> {
  const ahrefsUrl = apiConfig.AHREFS_API_URL;
  const ahrefsKey = apiConfig.AHREFS_API_KEY;
  if (!ahrefsUrl || !ahrefsKey) return undefined;

  try {
    // Ahrefs accepts up to 200 keywords per request
    const response = await fetchImpl(ahrefsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ahrefsKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        keywords: keywords.slice(0, 200),
        country: locale.startsWith('zh') ? 'tw' : 'us'
      })
    });

    if (!response.ok) return undefined;

    const body = (await response.json()) as {
      keywords?: Array<{
        keyword?: string;
        volume?: number;
        cpc?: number;
        difficulty?: number;
      }>;
    };

    return normalizeAhrefsSemrushMetrics(body.keywords ?? []);
  } catch {
    return undefined;
  }
}

// ── Semrush integration ──────────────────────────────────────────

async function fetchSemrushMetrics(
  keywords: string[],
  locale: string,
  fetchImpl: typeof fetch
): Promise<ThirdPartyKeywordMetric[] | undefined> {
  const semrushUrl = apiConfig.SEMRUSH_API_URL;
  const semrushKey = apiConfig.SEMRUSH_API_KEY;
  if (!semrushUrl || !semrushKey) return undefined;

  try {
    // Semrush uses GET with query params for bulk keyword data
    const db = locale.startsWith('zh') ? 'hk' : 'us';
    const params = new URLSearchParams({
      type: 'phrase_all',
      key: semrushKey,
      phrase: keywords.join(','),
      database: db,
      export_columns: 'Ph,Nq,Cpc,Com,Kd'
    });

    const response = await fetchImpl(`${semrushUrl}?${params.toString()}`, {
      method: 'GET'
    });

    if (!response.ok) return undefined;

    const text = await response.text();
    return parseSemrushCsv(text);
  } catch {
    return undefined;
  }
}

function parseSemrushCsv(csvText: string): ThirdPartyKeywordMetric[] {
  const lines = csvText.trim().split('\n');
  if (lines.length <= 1) return [];

  // Header: Ph,Nq,Cpc,Com,Kd
  const items: ThirdPartyKeywordMetric[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    if (cols.length < 2) continue;

    items.push({
      keyword: normalizeKeyword(cols[0]),
      monthlySearchVolume: toNumber(cols[1]),
      cpcUsd: toNumber(cols[2]),
      competition: normalizeCompetition(cols[3]),
      keywordDifficulty: toNumber(cols[4])
    });
  }

  return items.filter((m) => m.keyword);
}

// ── Generic third-party API (configurable) ───────────────────────

async function fetchGenericMetrics(
  keywords: string[],
  locale: string,
  fetchImpl: typeof fetch
): Promise<ThirdPartyKeywordMetric[] | undefined> {
  const apiUrl = apiConfig.KEYWORD_VOLUME_API_URL;
  const apiKey = apiConfig.KEYWORD_VOLUME_API_KEY;
  if (!apiUrl || !apiKey) return undefined;

  try {
    const response = await fetchImpl(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ keywords, locale })
    });

    if (!response.ok) return undefined;

    const body = await response.json();
    return normalizeAhrefsSemrushMetrics(extractGenericItems(body));
  } catch {
    return undefined;
  }
}

// ── Metric normalization helpers ─────────────────────────────────

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[$,%]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function normalizeCompetition(value: unknown): number | undefined {
  const n = toNumber(value);
  if (n === undefined) return undefined;
  return Number(Math.min(1, Math.max(0, n > 1 ? n / 100 : n)).toFixed(2));
}

type GenericRawItem = Record<string, unknown>;

function extractGenericItems(body: unknown): GenericRawItem[] {
  if (Array.isArray(body)) return body as GenericRawItem[];
  if (!body || typeof body !== 'object') return [];
  const record = body as Record<string, unknown>;
  if (Array.isArray(record.keywords)) return record.keywords as GenericRawItem[];
  if (Array.isArray(record.data)) return record.data as GenericRawItem[];
  if (Array.isArray(record.results)) return record.results as GenericRawItem[];
  return [];
}

function normalizeAhrefsSemrushMetrics(raw: GenericRawItem[]): ThirdPartyKeywordMetric[] {
  return raw
    .map((item) => ({
      keyword: normalizeKeyword(
        String(item.keyword ?? item.Ph ?? item.query ?? item.term ?? '')
      ),
      monthlySearchVolume: toNumber(item.volume ?? item.Nq ?? item.search_volume ?? item.monthlySearchVolume),
      cpcUsd: toNumber(item.cpc ?? item.Cpc ?? item.cpc_usd ?? item.cpcUsd),
      competition: normalizeCompetition(item.competition ?? item.Com ?? item.competition_index),
      keywordDifficulty: toNumber(item.difficulty ?? item.Kd ?? item.kd ?? item.keyword_difficulty)
    }))
    .filter((m) => m.keyword);
}

// ── Core enrichment pipeline ─────────────────────────────────────

interface EnrichedKeyword extends ThirdPartyKeywordMetric {
  keyword: string;
  keywordDifficulty?: number;
}

/**
 * Resolve which third-party provider to use based on config.
 * Priority: dataforseo > ahrefs > semrush > generic
 */
function resolveMetricProvider(): { provider: KeywordDataSource; enabled: boolean } | null {
  const provider = apiConfig.KEYWORD_VOLUME_PROVIDER;

  if (provider === 'dataforseo' && apiConfig.KEYWORD_VOLUME_API_URL && apiConfig.KEYWORD_VOLUME_API_KEY) {
    return { provider: 'dataforseo', enabled: true };
  }
  if (provider === 'ahrefs' && apiConfig.AHREFS_API_URL && apiConfig.AHREFS_API_KEY) {
    return { provider: 'ahrefs', enabled: true };
  }
  if (provider === 'semrush' && apiConfig.SEMRUSH_API_URL && apiConfig.SEMRUSH_API_KEY) {
    return { provider: 'semrush', enabled: true };
  }
  if (apiConfig.KEYWORD_VOLUME_API_URL && apiConfig.KEYWORD_VOLUME_API_KEY) {
    return { provider: provider as KeywordDataSource || 'dataforseo', enabled: true };
  }

  return null;
}

async function enrichWithThirdParty(
  keywords: string[],
  locale: string,
  fetchImpl: typeof fetch
): Promise<Map<string, EnrichedKeyword>> {
  const resolved = resolveMetricProvider();
  if (!resolved) return new Map();

  let metrics: ThirdPartyKeywordMetric[] | undefined;

  switch (resolved.provider) {
    case 'dataforseo':
      metrics = await fetchDfseoMetrics(keywords, locale, fetchImpl);
      break;
    case 'ahrefs':
      metrics = await fetchAhrefsMetrics(keywords, locale, fetchImpl);
      break;
    case 'semrush':
      metrics = await fetchSemrushMetrics(keywords, locale, fetchImpl);
      break;
    default:
      metrics = await fetchGenericMetrics(keywords, locale, fetchImpl);
  }

  if (!metrics?.length) return new Map();

  const map = new Map<string, EnrichedKeyword>();
  for (const m of metrics) {
    map.set(m.keyword.toLowerCase(), m);
  }
  return map;
}

// ── GSC data merge ───────────────────────────────────────────────

// GSC keyword map is exported from searchConsole.ts, we use a dynamic import
// to avoid circular dependencies. The map is keyed by normalized keyword.
let gscKeywordMapGetter: (() => Map<string, KeywordGscData>) | undefined;

export function setGscKeywordMapGetter(getter: () => Map<string, KeywordGscData>) {
  gscKeywordMapGetter = getter;
}

function getGscData(keyword: string): KeywordGscData | undefined {
  if (!gscKeywordMapGetter) return undefined;
  const map = gscKeywordMapGetter();
  return map.get(keyword.toLowerCase());
}

// ── Main suggestion creation ─────────────────────────────────────

function buildSuggestions(
  ideas: Array<{
    keyword: string;
    searchIntentSummary: string;
    contentAngle: string;
  }>,
  intent: KeywordSuggestion['intent'],
  enriched: Map<string, EnrichedKeyword>,
  metricProvider: KeywordDataSource | null
): KeywordSuggestion[] {
  return ideas.slice(0, 12).map((idea, index) => {
    const enrichedMetric = enriched.get(idea.keyword.toLowerCase());
    const gscData = getGscData(idea.keyword);

    if (enrichedMetric && metricProvider) {
      // Rich: real metrics from third-party API
      const source: KeywordDataSource = metricProvider;
      return {
        keyword: idea.keyword,
        intent,
        difficulty: getDifficultyFromMetric(enrichedMetric),
        opportunityScore: calculateRealOpportunityScore(enrichedMetric, gscData),
        monthlySearchVolume: enrichedMetric.monthlySearchVolume,
        cpcUsd: enrichedMetric.cpcUsd,
        competition: enrichedMetric.competition,
        source,
        sourceTrace: createEnrichedTrace('ai-provider', source),
        searchIntentSummary: idea.searchIntentSummary,
        contentAngle: idea.contentAngle,
        gscData
      };
    }

    // Lean: only keyword ideas, metrics are estimated
    return {
      keyword: idea.keyword,
      intent,
      difficulty: getDifficultyFromIndex(index),
      opportunityScore: gscData ? calculateRealOpportunityScore({ keyword: idea.keyword }, gscData) : Math.max(40, 88 - index * 7),
      monthlySearchVolume: undefined,
      cpcUsd: undefined,
      competition: undefined,
      source: 'ai-provider',
      sourceTrace: createEstimatedTrace('ai-provider'),
      searchIntentSummary: idea.searchIntentSummary,
      contentAngle: idea.contentAngle,
      gscData
    };
  });
}

// ── Service factory ──────────────────────────────────────────────

export function createKeywordSuggestionService(
  textProvider?: TextGenerationProvider,
  fetchImpl: typeof fetch = fetch
): KeywordSuggestionService {
  return {
    async createSuggestions(input) {
      const seedKeyword = normalizeKeyword(input.seedKeyword);
      const { locale, intent, userId } = input;
      const resolved = resolveMetricProvider();

      // Step 1: Generate keyword ideas (AI or template)
      const aiIdeas = await generateAiKeywordIdeas(textProvider, seedKeyword, locale, intent, userId);

      if (aiIdeas?.length) {
        const keywords = aiIdeas.map((i) => i.keyword);

        // Step 2: Enrich with real third-party metrics
        const enriched = await enrichWithThirdParty(keywords, locale, fetchImpl);

        if (enriched.size > 0 && resolved) {
          return {
            source: 'enriched',
            suggestions: buildSuggestions(aiIdeas, intent, enriched, resolved.provider)
          };
        }

        // AI ideas only, no enrichment available
        return {
          source: 'ai-provider',
          suggestions: buildSuggestions(aiIdeas, intent, new Map(), null)
        };
      }

      // Step 3: Fallback to template-based generation
      const templateKeywords = buildKeywordTemplates(seedKeyword, intent);
      const templateIdeas = templateKeywords.map((kw) => ({
        keyword: kw,
        searchIntentSummary: getIntentSummary(intent),
        contentAngle: `以內容建立「${kw}」頁面，加入可操作清單、內部連結和可審核 CTA。`
      }));

      // Attempt enrichment for template keywords
      const enriched = await enrichWithThirdParty(
        templateKeywords.map((k) => k),
        locale,
        fetchImpl
      );

      if (enriched.size > 0 && resolved) {
        return {
          source: 'enriched',
          suggestions: buildSuggestions(templateIdeas, intent, enriched, resolved.provider)
        };
      }

      return {
        source: 'fallback',
        suggestions: templateIdeas.map((idea, index) => ({
          keyword: idea.keyword,
          intent,
          difficulty: getDifficultyFromIndex(index),
          opportunityScore: Math.max(40, 88 - index * 7),
          source: 'fallback' as KeywordDataSource,
          sourceTrace: createEstimatedTrace('template'),
          searchIntentSummary: idea.searchIntentSummary,
          contentAngle: idea.contentAngle,
          gscData: getGscData(idea.keyword)
        }))
      };
    },

    async enrichKeywords(keywords, locale) {
      const enriched = await enrichWithThirdParty(keywords, locale, fetch);
      return enriched;
    }
  };
}

// ── Routes ───────────────────────────────────────────────────────

export function registerKeywordSuggestionRoutes(
  app: FastifyInstance,
  authService: AuthService,
  keywordSuggestionService = createKeywordSuggestionService()
) {
  // POST /api/v1/keyword-suggestions — generate keyword suggestions
  app.post('/api/v1/keyword-suggestions', async (request, reply: FastifyReply) => {
    const user = await requireAuth(authService, request, reply);
    if (!user) return reply;

    const parsed = keywordSuggestionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: '請求資料格式不正確',
        error: { code: 'VALIDATION_ERROR', details: parsed.error.issues }
      });
    }

    const result = await keywordSuggestionService.createSuggestions({
      ...parsed.data,
      userId: user.id
    });

    return {
      success: true,
      message: '操作成功',
      data: {
        seedKeyword: normalizeKeyword(parsed.data.seedKeyword),
        locale: parsed.data.locale,
        source: result.source,
        suggestions: result.suggestions
      }
    };
  });

  // POST /api/v1/keyword-suggestions/enrich — enrich keywords with real metrics
  app.post('/api/v1/keyword-suggestions/enrich', async (request, reply: FastifyReply) => {
    const user = await requireAuth(authService, request, reply);
    if (!user) return reply;

    const parsed = enrichSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: '請求資料格式不正確',
        error: { code: 'VALIDATION_ERROR', details: parsed.error.issues }
      });
    }

    const metrics = await keywordSuggestionService.enrichKeywords(
      parsed.data.keywords,
      parsed.data.locale
    );

    const results = parsed.data.keywords.map((kw) => {
      const enriched = metrics.get(normalizeKeyword(kw).toLowerCase());
      const gscData = getGscData(kw);

      if (enriched) {
        return {
          keyword: kw,
          found: true,
          monthlySearchVolume: enriched.monthlySearchVolume,
          cpcUsd: enriched.cpcUsd,
          competition: enriched.competition,
          keywordDifficulty: enriched.keywordDifficulty,
          source: resolveMetricProvider()?.provider ?? 'unknown',
          gscData
        };
      }

      return {
        keyword: kw,
        found: false,
        gscData
      };
    });

    return {
      success: true,
      message: '操作成功',
      data: { enriched: results }
    };
  });

  // GET /api/v1/keyword-suggestions/sources — list available data sources
  app.get('/api/v1/keyword-suggestions/sources', async (request, reply: FastifyReply) => {
    const user = await requireAuth(authService, request, reply);
    if (!user) return reply;

    const resolved = resolveMetricProvider();
    const sources: Array<{
      id: string;
      name: string;
      active: boolean;
      description: string;
    }> = [
      {
        id: 'dataforseo',
        name: 'DataForSEO',
        active: apiConfig.KEYWORD_VOLUME_PROVIDER === 'dataforseo' && !!apiConfig.KEYWORD_VOLUME_API_KEY,
        description: 'Real-time Google search volume, CPC, and competition data via DataForSEO API.'
      },
      {
        id: 'ahrefs',
        name: 'Ahrefs',
        active: apiConfig.KEYWORD_VOLUME_PROVIDER === 'ahrefs' && !!apiConfig.AHREFS_API_KEY,
        description: 'Keyword difficulty, search volume, and traffic potential from Ahrefs.'
      },
      {
        id: 'semrush',
        name: 'Semrush',
        active: apiConfig.KEYWORD_VOLUME_PROVIDER === 'semrush' && !!apiConfig.SEMRUSH_API_KEY,
        description: 'Search volume, trend, CPC, and competition from Semrush API.'
      },
      {
        id: 'gsc',
        name: 'Google Search Console',
        active: !!gscKeywordMapGetter,
        description: 'Actual clicks, impressions, CTR, and position from your connected GSC sites.'
      },
      {
        id: 'ai-provider',
        name: 'AI Generator',
        active: true,
        description: 'Keyword ideas generated by AI, metrics may be estimated.'
      }
    ];

    return {
      success: true,
      data: { sources, activeProvider: resolved?.provider ?? null }
    };
  });
}
