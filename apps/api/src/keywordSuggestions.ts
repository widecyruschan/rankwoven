import type { FastifyInstance, FastifyReply } from 'fastify';
import type { TextGenerationProvider } from '@aieo/ai-providers';
import { z } from 'zod';
import { requireAuth, type AuthService } from './auth';
import { apiConfig } from './config';

const keywordSuggestionSchema = z.object({
  seedKeyword: z.string().trim().min(1).max(120),
  locale: z.string().trim().min(2).max(20).default('zh-Hant'),
  intent: z.enum(['informational', 'commercial', 'transactional', 'local']).default('informational')
});

export interface KeywordSuggestion {
  keyword: string;
  intent: 'informational' | 'commercial' | 'transactional' | 'local';
  difficulty: 'low' | 'medium' | 'high';
  opportunityScore: number;
  monthlySearchVolume?: number;
  cpcUsd?: number;
  competition?: number;
  source: 'ai-provider' | 'third-party-volume' | 'fallback';
  searchIntentSummary: string;
  contentAngle: string;
}

interface KeywordSuggestionService {
  createSuggestions(input: z.infer<typeof keywordSuggestionSchema> & { userId: string }): Promise<{
    source: KeywordSuggestion['source'];
    suggestions: KeywordSuggestion[];
  }>;
}

interface ThirdPartyKeywordMetric {
  keyword: string;
  monthlySearchVolume?: number;
  cpcUsd?: number;
  competition?: number;
}

function normalizeSeedKeyword(seedKeyword: string) {
  return seedKeyword.replace(/\s+/g, ' ').trim();
}

function getDifficulty(index: number): KeywordSuggestion['difficulty'] {
  if (index <= 1) {
    return 'low';
  }

  return index <= 4 ? 'medium' : 'high';
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

function buildKeywordTemplates(seedKeyword: string, intent: KeywordSuggestion['intent']) {
  const templates = {
    informational: [
      `${seedKeyword} 教學`,
      `${seedKeyword} 是什麼`,
      `${seedKeyword} 最佳實踐`,
      `${seedKeyword} 常見問題`,
      `${seedKeyword} 工具`,
      `${seedKeyword} 趨勢`
    ],
    commercial: [
      `${seedKeyword} 推薦`,
      `${seedKeyword} 比較`,
      `${seedKeyword} 價格`,
      `${seedKeyword} 方案`,
      `${seedKeyword} 服務商`,
      `${seedKeyword} 評價`
    ],
    transactional: [
      `${seedKeyword} 試用`,
      `${seedKeyword} 註冊`,
      `${seedKeyword} 報價`,
      `${seedKeyword} 顧問`,
      `${seedKeyword} 套餐`,
      `${seedKeyword} 開始使用`
    ],
    local: [
      `${seedKeyword} 香港`,
      `${seedKeyword} 附近`,
      `${seedKeyword} 本地服務`,
      `${seedKeyword} 公司`,
      `${seedKeyword} 專家`,
      `${seedKeyword} 案例`
    ]
  };

  return templates[intent];
}

function createKeywordSuggestions(
  seedKeyword: string,
  locale: string,
  intent: KeywordSuggestion['intent']
): KeywordSuggestion[] {
  const keyword = normalizeSeedKeyword(seedKeyword);
  const languageHint = locale.startsWith('zh') ? '繁體中文' : locale;

  return buildKeywordTemplates(keyword, intent).map((suggestion, index) => ({
    keyword: suggestion,
    intent,
    difficulty: getDifficulty(index),
    opportunityScore: Math.max(58, 92 - index * 6),
    monthlySearchVolume: Math.max(90, 1200 - index * 150),
    cpcUsd: Number((1.2 + index * 0.35).toFixed(2)),
    competition: Math.min(0.9, Number((0.18 + index * 0.11).toFixed(2))),
    source: 'fallback',
    searchIntentSummary: getIntentSummary(intent),
    contentAngle: `以${languageHint}內容建立「${suggestion}」頁面，加入可操作清單、內部連結和可審核 CTA。`
  }));
}

function toDifficulty(metric: ThirdPartyKeywordMetric, index: number): KeywordSuggestion['difficulty'] {
  if (metric.competition !== undefined) {
    if (metric.competition < 0.35) {
      return 'low';
    }

    return metric.competition < 0.7 ? 'medium' : 'high';
  }

  return getDifficulty(index);
}

function calculateOpportunityScore(metric: ThirdPartyKeywordMetric, index: number) {
  const volumeScore = Math.min(30, Math.round((metric.monthlySearchVolume ?? 300) / 100));
  const competitionPenalty = Math.round((metric.competition ?? 0.4) * 24);
  return Math.max(45, Math.min(96, 78 + volumeScore - competitionPenalty - index * 3));
}

async function fetchThirdPartyKeywordMetrics(
  seedKeyword: string,
  locale: string,
  intent: KeywordSuggestion['intent'],
  fetchImpl: typeof fetch
): Promise<ThirdPartyKeywordMetric[] | undefined> {
  if (!apiConfig.KEYWORD_VOLUME_API_URL || !apiConfig.KEYWORD_VOLUME_API_KEY) {
    return undefined;
  }

  const response = await fetchImpl(apiConfig.KEYWORD_VOLUME_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiConfig.KEYWORD_VOLUME_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      seedKeyword,
      locale,
      intent
    })
  });

  if (!response.ok) {
    return undefined;
  }

  const body = (await response.json()) as { keywords?: ThirdPartyKeywordMetric[] };
  return Array.isArray(body.keywords) ? body.keywords : undefined;
}

function mapThirdPartyMetrics(
  metrics: ThirdPartyKeywordMetric[],
  locale: string,
  intent: KeywordSuggestion['intent']
): KeywordSuggestion[] {
  const languageHint = locale.startsWith('zh') ? '繁體中文' : locale;

  return metrics.slice(0, 12).map((metric, index) => ({
    keyword: normalizeSeedKeyword(metric.keyword),
    intent,
    difficulty: toDifficulty(metric, index),
    opportunityScore: calculateOpportunityScore(metric, index),
    monthlySearchVolume: metric.monthlySearchVolume,
    cpcUsd: metric.cpcUsd,
    competition: metric.competition,
    source: 'third-party-volume',
    searchIntentSummary: getIntentSummary(intent),
    contentAngle: `以${languageHint}內容建立「${metric.keyword}」頁面，優先覆蓋高搜尋量題目並安排內部連結。`
  }));
}

function parseJsonObject(value: string) {
  const fencedMatch = value.match(/```json\s*([\s\S]*?)```/i);
  const rawJson = fencedMatch?.[1] ?? value;
  const startIndex = rawJson.indexOf('{');
  const endIndex = rawJson.lastIndexOf('}');

  if (startIndex < 0 || endIndex < startIndex) {
    return undefined;
  }

  try {
    return JSON.parse(rawJson.slice(startIndex, endIndex + 1)) as {
      suggestions?: Array<Partial<KeywordSuggestion>>;
    };
  } catch {
    return undefined;
  }
}

async function createAiKeywordSuggestions(
  textProvider: TextGenerationProvider | undefined,
  seedKeyword: string,
  locale: string,
  intent: KeywordSuggestion['intent'],
  userId: string
) {
  if (!textProvider) {
    return undefined;
  }

  try {
    const result = await textProvider.generateOutline({
      siteId: 'keyword-research',
      userId,
      locale,
      keyword: seedKeyword,
      title:
        `Generate keyword ideas for intent ${intent}. Return JSON with suggestions array, ` +
        'keyword, difficulty, opportunityScore, searchIntentSummary, contentAngle, monthlySearchVolume, cpcUsd, competition.'
    });
    const parsed = parseJsonObject(result.text);
    const suggestions = parsed?.suggestions
      ?.map((suggestion, index) => ({
        keyword: normalizeSeedKeyword(String(suggestion.keyword ?? '')),
        intent,
        difficulty:
          suggestion.difficulty === 'low' || suggestion.difficulty === 'medium' || suggestion.difficulty === 'high'
            ? suggestion.difficulty
            : getDifficulty(index),
        opportunityScore: Number(suggestion.opportunityScore ?? Math.max(58, 90 - index * 5)),
        monthlySearchVolume:
          suggestion.monthlySearchVolume === undefined ? undefined : Number(suggestion.monthlySearchVolume),
        cpcUsd: suggestion.cpcUsd === undefined ? undefined : Number(suggestion.cpcUsd),
        competition: suggestion.competition === undefined ? undefined : Number(suggestion.competition),
        source: 'ai-provider' as const,
        searchIntentSummary: String(suggestion.searchIntentSummary ?? getIntentSummary(intent)),
        contentAngle: String(suggestion.contentAngle ?? '')
      }))
      .filter((suggestion) => suggestion.keyword && suggestion.contentAngle);

    return suggestions?.length ? suggestions : undefined;
  } catch {
    return undefined;
  }
}

export function createKeywordSuggestionService(
  textProvider?: TextGenerationProvider,
  fetchImpl: typeof fetch = fetch
): KeywordSuggestionService {
  return {
    async createSuggestions(input) {
      const seedKeyword = normalizeSeedKeyword(input.seedKeyword);
      const thirdPartyMetrics = await fetchThirdPartyKeywordMetrics(seedKeyword, input.locale, input.intent, fetchImpl);
      if (thirdPartyMetrics?.length) {
        return {
          source: 'third-party-volume',
          suggestions: mapThirdPartyMetrics(thirdPartyMetrics, input.locale, input.intent)
        };
      }

      const aiSuggestions = await createAiKeywordSuggestions(
        textProvider,
        seedKeyword,
        input.locale,
        input.intent,
        input.userId
      );
      if (aiSuggestions?.length) {
        return {
          source: 'ai-provider',
          suggestions: aiSuggestions
        };
      }

      return {
        source: 'fallback',
        suggestions: createKeywordSuggestions(seedKeyword, input.locale, input.intent)
      };
    }
  };
}

export function registerKeywordSuggestionRoutes(
  app: FastifyInstance,
  authService: AuthService,
  keywordSuggestionService = createKeywordSuggestionService()
) {
  app.post('/api/v1/keyword-suggestions', async (request, reply: FastifyReply) => {
    const user = await requireAuth(authService, request, reply);
    if (!user) {
      return reply;
    }

    const parsed = keywordSuggestionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: '請求資料格式不正確',
        error: {
          code: 'VALIDATION_ERROR',
          details: parsed.error.issues
        }
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
        seedKeyword: normalizeSeedKeyword(parsed.data.seedKeyword),
        locale: parsed.data.locale,
        source: result.source,
        suggestions: result.suggestions
      }
    };
  });
}
