import { createHash } from 'node:crypto';

export type ContentScoreDimension = 'on_page' | 'query_alignment' | 'topical_coverage' | 'readability' | 'trust_citability';
export type ContentScoreStatus = 'pass' | 'warning' | 'fail' | 'not_applicable';
export type ContentRewriteScope = 'title' | 'meta' | 'opening' | 'paragraph' | 'section' | 'outline' | 'full_document';

export interface ContentScoreCheck {
  code: string;
  dimension: ContentScoreDimension;
  status: ContentScoreStatus;
  weight: number;
  score: number;
  evidence: string;
  recommendation: string;
  sourceType: 'deterministic_check' | 'ai_inferred';
}

export interface ContentScoreSummary {
  score: number;
  confidence: number;
  earnedWeight: number;
  availableWeight: number;
  totalWeight: number;
  checks: ContentScoreCheck[];
}

export interface ContentScoreInput {
  content: string;
  focusKeyword: string;
  secondaryKeywords?: string[];
  title?: string;
  metaDescription?: string;
  sourceUrl?: string;
}

export interface ContentRewriteOutput {
  suggestedText: string;
  claims: Array<{
    text: string;
    sourceUrl?: string;
    sourceType: 'first_party_observed' | 'user_asserted' | 'source_required';
  }>;
}

function normalizeText(value: string) {
  return value
    .replace(/```[\s\S]*?(?:```|$)/g, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<(script|style|form|nav|footer|header|pre|code)\b[^>]*>[\s\S]*?(?:<\/\1>|$)/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(value: string) {
  return normalizeText(value).match(/\p{Script=Han}|[\p{L}\p{N}]+/gu) ?? [];
}

function containsPhrase(text: string, phrase: string) {
  const normalizedPhrase = normalizeText(phrase).toLowerCase();
  if (!normalizedPhrase) return false;
  return normalizeText(text).toLowerCase().includes(normalizedPhrase);
}

function check(
  code: string,
  dimension: ContentScoreDimension,
  status: ContentScoreStatus,
  weight: number,
  evidence: string,
  recommendation: string
): ContentScoreCheck {
  return {
    code,
    dimension,
    status,
    weight,
    score: status === 'pass' ? 100 : status === 'warning' ? 50 : status === 'not_applicable' ? 0 : 0,
    evidence,
    recommendation,
    sourceType: 'deterministic_check'
  };
}

export function hashContentSnapshot(content: string) {
  return createHash('sha256').update(normalizeText(content)).digest('hex');
}

export function sanitizeContentSnapshot(content: string) {
  return normalizeText(content);
}

export function scoreContent(input: ContentScoreInput): ContentScoreSummary {
  const body = normalizeText(input.content);
  const bodyWords = words(body);
  const focusKeyword = normalizeText(input.focusKeyword);
  const paragraphs = input.content
    .split(/<\/p>|\n{2,}/i)
    .map(normalizeText)
    .filter(Boolean);
  const introduction = paragraphs[0] ?? body.slice(0, 400);
  const sentences = body.split(/[.!?。！？]+/u).map((item) => item.trim()).filter(Boolean);
  const headings = (input.content.match(/<h[1-6]\b/gi) ?? []).length;
  const links = (input.content.match(/<a\b[^>]*href=/gi) ?? []).length;
  const citations = (input.content.match(/<a\b[^>]*href=["'][^"']+[^>]*>/gi) ?? []).length;
  const checks: ContentScoreCheck[] = [
    check(
      'on_page.length', 'on_page', bodyWords.length >= 300 ? 'pass' : bodyWords.length >= 150 ? 'warning' : 'fail', 10,
      `正文約有 ${bodyWords.length} 個文字單位。`, '補充具體且有用的正文內容。'
    ),
    check(
      'on_page.headings', 'on_page', bodyWords.length < 250 ? 'not_applicable' : headings > 0 ? 'pass' : 'warning', 8,
      `偵測到 ${headings} 個標題。`, '較長內容應使用清晰的 H2-H4 標題分段。'
    ),
    check(
      'on_page.links', 'on_page', links > 0 ? 'pass' : 'warning', 7,
      `偵測到 ${links} 條連結。`, '加入與讀者下一步相關的內部或可靠外部連結。'
    ),
    check(
      'query.focus_title', 'query_alignment', input.title ? containsPhrase(input.title, focusKeyword) ? 'pass' : 'fail' : 'not_applicable', 9,
      input.title ? '已檢查標題與焦點關鍵詞。' : '沒有可評估的標題。', '在標題自然加入焦點關鍵詞。'
    ),
    check(
      'query.focus_opening', 'query_alignment', containsPhrase(introduction, focusKeyword) ? 'pass' : 'fail', 9,
      '已檢查開場段落與焦點關鍵詞。', '在開場直接說明主題並自然使用焦點關鍵詞。'
    ),
    check(
      'query.focus_body', 'query_alignment', containsPhrase(body, focusKeyword) ? 'pass' : 'fail', 7,
      '已檢查正文與焦點關鍵詞。', '在正文自然涵蓋焦點關鍵詞，不要堆砌。'
    ),
    check(
      'topical.secondary', 'topical_coverage', (input.secondaryKeywords?.length ?? 0) === 0 ? 'not_applicable' :
        input.secondaryKeywords?.some((keyword) => containsPhrase(body, keyword)) ? 'pass' : 'warning', 20,
      `已提供 ${input.secondaryKeywords?.length ?? 0} 個次要關鍵詞。`, '涵蓋與讀者意圖直接相關的次要主題。'
    ),
    check(
      'readability.sentences', 'readability', sentences.length === 0 ? 'fail' :
        sentences.filter((sentence) => words(sentence).length > 35).length / sentences.length <= 0.3 ? 'pass' : 'warning', 8,
      `偵測到 ${sentences.length} 句。`, '拆分過長句子，讓每段只傳達一個重點。'
    ),
    check(
      'readability.paragraphs', 'readability', paragraphs.length >= 2 ? 'pass' : bodyWords.length < 120 ? 'not_applicable' : 'warning', 7,
      `偵測到 ${paragraphs.length} 個段落。`, '使用較短段落與清晰過渡，提升掃讀性。'
    ),
    check(
      'trust.answer_first', 'trust_citability', bodyWords.length < 80 ? 'not_applicable' : sentences.length > 0 && words(sentences[0]).length <= 45 ? 'pass' : 'warning', 7,
      '已檢查開場是否可直接回答主題。', '以一至兩句直接答案開始，再展開說明。'
    ),
    check(
      'trust.citations', 'trust_citability', citations > 0 ? 'pass' : 'warning', 8,
      `偵測到 ${citations} 條可見引用連結。`, '對具體外部事實加入可靠來源，或標示需要作者補充證據。'
    )
  ];
  const totalWeight = checks.reduce((total, item) => total + item.weight, 0);
  const applicable = checks.filter((item) => item.status !== 'not_applicable');
  const availableWeight = applicable.reduce((total, item) => total + item.weight, 0);
  const earnedWeight = applicable.reduce((total, item) => total + (item.weight * item.score) / 100, 0);
  return {
    score: availableWeight === 0 ? 0 : Number(((earnedWeight / availableWeight) * 100).toFixed(3)),
    confidence: totalWeight === 0 ? 0 : Number((availableWeight / totalWeight).toFixed(3)),
    earnedWeight: Number(earnedWeight.toFixed(3)),
    availableWeight,
    totalWeight,
    checks
  };
}

export function parseContentRewriteOutput(value: unknown): ContentRewriteOutput | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  if (typeof source.suggestedText !== 'string' || source.suggestedText.trim().length === 0 || source.suggestedText.length > 500_000) return undefined;
  const claims = Array.isArray(source.claims) ? source.claims.flatMap((claim) => {
    if (!claim || typeof claim !== 'object') return [];
    const item = claim as Record<string, unknown>;
    const text = typeof item.text === 'string' ? item.text.trim() : '';
    const sourceType = item.sourceType;
    if (!text || !['first_party_observed', 'user_asserted', 'source_required'].includes(String(sourceType))) return [];
    return [{ text, sourceUrl: typeof item.sourceUrl === 'string' ? item.sourceUrl : undefined, sourceType: sourceType as ContentRewriteOutput['claims'][number]['sourceType'] }];
  }) : [];
  return { suggestedText: source.suggestedText.trim(), claims };
}
