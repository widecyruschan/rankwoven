import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth, type AuthService } from './auth';

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
  searchIntentSummary: string;
  contentAngle: string;
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
    searchIntentSummary: getIntentSummary(intent),
    contentAngle: `以${languageHint}內容建立「${suggestion}」頁面，加入可操作清單、內部連結和可審核 CTA。`
  }));
}

export function registerKeywordSuggestionRoutes(app: FastifyInstance, authService: AuthService) {
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

    return {
      success: true,
      message: '操作成功',
      data: {
        seedKeyword: normalizeSeedKeyword(parsed.data.seedKeyword),
        locale: parsed.data.locale,
        suggestions: createKeywordSuggestions(parsed.data.seedKeyword, parsed.data.locale, parsed.data.intent)
      }
    };
  });
}
