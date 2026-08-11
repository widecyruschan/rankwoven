import type { TextGenerationProvider } from '@aieo/ai-providers';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Pool, type QueryResultRow } from 'pg';
import { z } from 'zod';
import { getBearerToken, requireAuth, type AuthService } from './auth';
import type {
  SiteConnectionRepository,
  SyncedArticle,
  SyncedMedia
} from './siteConnections';

type TargetType = 'article' | 'media';
type SuggestionStatus = 'pending' | 'approved' | 'applied' | 'failed' | 'rejected';
type SuggestionType =
  | 'title'
  | 'meta_description'
  | 'content'
  | 'media_title'
  | 'media_caption'
  | 'media_description'
  | 'media_alt_text'
  | 'media_file_name'
  | 'internal_link';
type IssueSeverity = 'low' | 'medium' | 'high';
type MediaSuggestionField = 'title' | 'caption' | 'description' | 'altText' | 'fileName';

export interface SeoAudit {
  id: string;
  siteId: string;
  status: 'completed';
  score: number;
  rulesVersion: string;
  createdAt: string;
}

export interface SeoAuditIssue {
  id: string;
  auditId: string;
  siteId: string;
  targetType: TargetType;
  targetCmsId: string;
  ruleCode: string;
  severity: IssueSeverity;
  message: string;
  currentValue?: string;
  suggestedValue?: string;
  fieldName: string;
  createdAt: string;
}

export interface OptimizationSuggestion {
  id: string;
  siteId: string;
  auditIssueId?: string;
  targetType: TargetType;
  targetCmsId: string;
  suggestionType: SuggestionType;
  fieldName: string;
  status: SuggestionStatus;
  currentValue?: string;
  suggestedValue: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  approvedAt?: string;
  appliedAt?: string;
  errorMessage?: string;
  applyTaskId?: string;
}

export type ApplySnapshotStatus = 'created' | 'applied' | 'rolled_back' | 'failed';

export interface ApplySnapshot {
  id: string;
  siteId: string;
  suggestionId?: string;
  taskId?: string;
  targetType: TargetType;
  targetCmsId: string;
  fieldName: string;
  beforeValue?: string;
  afterValue: string;
  status: ApplySnapshotStatus;
  createdAt: string;
  appliedAt?: string;
  rolledBackAt?: string;
  matchedAt?: string;
  errorMessage?: string;
}

export interface CreateSuggestionInput {
  targetType: TargetType;
  targetCmsId: string;
  suggestionType: SuggestionType;
  fieldName: string;
  currentValue?: string;
  suggestedValue: string;
  metadata?: Record<string, unknown>;
}

export interface ListSuggestionOptions {
  targetType?: TargetType;
  targetCmsIds?: string[];
  limit?: number;
}

export interface SeoOptimizationRepository {
  saveAudit(
    siteId: string,
    audit: Omit<SeoAudit, 'id' | 'siteId' | 'createdAt'>,
    issues: Array<Omit<SeoAuditIssue, 'id' | 'auditId' | 'siteId' | 'createdAt'>>
  ): Promise<{ audit: SeoAudit; issues: SeoAuditIssue[] }>;
  listAudits(siteId: string): Promise<SeoAudit[]>;
  listIssues(auditId: string): Promise<SeoAuditIssue[]>;
  createSuggestion(siteId: string, input: CreateSuggestionInput, auditIssueId?: string): Promise<OptimizationSuggestion>;
  listSuggestions(siteId: string, options?: ListSuggestionOptions): Promise<OptimizationSuggestion[]>;
  findSuggestion(siteId: string, suggestionId: string): Promise<OptimizationSuggestion | undefined>;
  updateSuggestion(siteId: string, suggestionId: string, suggestedValue: string): Promise<OptimizationSuggestion | undefined>;
  approveSuggestion(siteId: string, suggestionId: string): Promise<OptimizationSuggestion | undefined>;
  markSuggestionApplyQueued(
    siteId: string,
    suggestionId: string,
    applyTaskId: string
  ): Promise<OptimizationSuggestion | undefined>;
  createApplySnapshot(
    siteId: string,
    suggestion: OptimizationSuggestion,
    taskId?: string
  ): Promise<ApplySnapshot>;
  attachSnapshotTask(snapshotId: string, taskId: string): Promise<ApplySnapshot | undefined>;
  listApplySnapshots(siteId: string): Promise<ApplySnapshot[]>;
  findApplySnapshot(siteId: string, snapshotId: string): Promise<ApplySnapshot | undefined>;
  markApplySnapshotApplied(snapshotId: string): Promise<ApplySnapshot | undefined>;
  markApplySnapshotRolledBack(snapshotId: string): Promise<ApplySnapshot | undefined>;
  markApplySnapshotFailed(snapshotId: string, errorMessage: string): Promise<ApplySnapshot | undefined>;
  markSuggestionApplied(suggestionId: string): Promise<OptimizationSuggestion | undefined>;
  markSuggestionFailed(suggestionId: string, errorMessage: string): Promise<OptimizationSuggestion | undefined>;
  close?(): Promise<void>;
}

function summarizeAudit(audit: SeoAudit | undefined, issues: SeoAuditIssue[]) {
  if (!audit) {
    return undefined;
  }

  return {
    audit,
    issueCounts: {
      total: issues.length,
      high: issues.filter((issue) => issue.severity === 'high').length,
      medium: issues.filter((issue) => issue.severity === 'medium').length,
      low: issues.filter((issue) => issue.severity === 'low').length
    }
  };
}

const createSuggestionSchema = z.object({
  targetType: z.enum(['article', 'media']),
  targetCmsId: z.string().trim().min(1).max(80),
  suggestionType: z.enum([
    'title',
    'meta_description',
    'content',
    'media_title',
    'media_caption',
    'media_description',
    'media_alt_text',
    'media_file_name',
    'internal_link'
  ]),
  fieldName: z.string().trim().min(1).max(80),
  currentValue: z.string().max(20_000).optional(),
  suggestedValue: z.string().trim().min(1).max(500_000),
  metadata: z.record(z.string(), z.unknown()).optional()
});

const updateSuggestionSchema = z.object({
  suggestedValue: z.string().trim().min(1).max(500_000)
});

const listSuggestionsQuerySchema = z.object({
  targetType: z.enum(['article', 'media']).optional(),
  targetCmsIds: z
    .union([
      z.string().trim(),
      z.array(z.string().trim())
    ])
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }

      const rawValues = Array.isArray(value) ? value : value.split(',');
      const normalized = Array.from(
        new Set(
          rawValues
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
        )
      );

      return normalized.length > 0 ? normalized.slice(0, auditBatchSize) : undefined;
    }),
  limit: z.coerce.number().int().min(1).max(2_000).default(200)
});

const editorSeoGenerationSchema = z.object({
  mode: z.enum(['generate', 'analyze', 'save']).default('generate'),
  postType: z.enum(['post', 'page', 'portfolio', 'product']),
  currentTitle: z.string().trim().max(300).optional().default(''),
  currentSeoTitle: z.string().trim().max(300).optional().default(''),
  currentSlug: z.string().trim().max(240).optional().default(''),
  focusKeyphrase: z.string().trim().max(120).optional().default(''),
  excerpt: z.string().max(2000).optional().default(''),
  contentHtml: z.string().max(500_000).optional().default(''),
  currentMetaDescription: z.string().max(500).optional().default(''),
  locale: z.string().trim().min(2).max(20).default('zh-Hant')
});

const internalLinkGenerationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

const defaultRulesVersion = '2026-08-04.image-context-1';
const auditBatchSize = 100;

const seoOptimizationMigrationSql = `
CREATE TABLE IF NOT EXISTS seo_audits (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('completed')),
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  rules_version varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_audits_site_created
  ON seo_audits(site_id, created_at DESC);

CREATE TABLE IF NOT EXISTS seo_audit_issues (
  id uuid PRIMARY KEY,
  audit_id uuid NOT NULL REFERENCES seo_audits(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('article', 'media')),
  target_cms_id varchar(80) NOT NULL,
  rule_code varchar(80) NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  message text NOT NULL,
  current_value text,
  suggested_value text,
  field_name varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_audit_issues_site_target
  ON seo_audit_issues(site_id, target_type, target_cms_id);

CREATE TABLE IF NOT EXISTS optimization_suggestions (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  audit_issue_id uuid REFERENCES seo_audit_issues(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('article', 'media')),
  target_cms_id varchar(80) NOT NULL,
    suggestion_type text NOT NULL CHECK (
    suggestion_type IN ('title', 'meta_description', 'content', 'media_title', 'media_caption', 'media_description', 'media_alt_text', 'media_file_name', 'internal_link')
  ),
  field_name varchar(80) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'applied', 'failed', 'rejected')),
  current_value text,
  suggested_value text NOT NULL,
  metadata jsonb,
  error_message text,
  apply_task_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  applied_at timestamptz
);

ALTER TABLE optimization_suggestions
  ADD COLUMN IF NOT EXISTS metadata jsonb;

ALTER TABLE optimization_suggestions
  DROP CONSTRAINT IF EXISTS optimization_suggestions_suggestion_type_check;

ALTER TABLE optimization_suggestions
  ADD CONSTRAINT optimization_suggestions_suggestion_type_check CHECK (
    suggestion_type IN ('title', 'meta_description', 'content', 'media_title', 'media_caption', 'media_description', 'media_alt_text', 'media_file_name', 'internal_link')
  );

CREATE INDEX IF NOT EXISTS idx_optimization_suggestions_site_status
  ON optimization_suggestions(site_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS apply_snapshots (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  suggestion_id uuid REFERENCES optimization_suggestions(id) ON DELETE SET NULL,
  task_id uuid,
  target_type text NOT NULL CHECK (target_type IN ('article', 'media')),
  target_cms_id varchar(80) NOT NULL,
  field_name varchar(80) NOT NULL,
  before_value text,
  after_value text NOT NULL,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'applied', 'rolled_back', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz,
  rolled_back_at timestamptz,
  snapshot_matched_at timestamptz,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_apply_snapshots_site_created
  ON apply_snapshots(site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_apply_snapshots_suggestion
  ON apply_snapshots(suggestion_id);
`;

function toIsoString(value: unknown) {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value.toISOString() : String(value);
}

function mapAuditRow(row: QueryResultRow): SeoAudit {
  return {
    id: row.id,
    siteId: row.site_id,
    status: row.status,
    score: Number(row.score),
    rulesVersion: row.rules_version,
    createdAt: toIsoString(row.created_at) ?? ''
  };
}

function mapIssueRow(row: QueryResultRow): SeoAuditIssue {
  return {
    id: row.id,
    auditId: row.audit_id,
    siteId: row.site_id,
    targetType: row.target_type,
    targetCmsId: row.target_cms_id,
    ruleCode: row.rule_code,
    severity: row.severity,
    message: row.message,
    currentValue: row.current_value ?? undefined,
    suggestedValue: row.suggested_value ?? undefined,
    fieldName: row.field_name,
    createdAt: toIsoString(row.created_at) ?? ''
  };
}

function mapSuggestionRow(row: QueryResultRow): OptimizationSuggestion {
  const rawSuggestedValue = String(row.suggested_value ?? '');
  const extension = rawSuggestedValue.includes('.')
    ? rawSuggestedValue.split('.').pop()?.toLowerCase() ?? 'jpg'
    : 'jpg';
  const suggestedValue = row.target_type === 'media'
    ? normalizeMediaSuggestionValue(row.field_name, rawSuggestedValue, extension)
    : rawSuggestedValue;

  return {
    id: row.id,
    siteId: row.site_id,
    auditIssueId: row.audit_issue_id ?? undefined,
    targetType: row.target_type,
    targetCmsId: row.target_cms_id,
    suggestionType: row.suggestion_type,
    fieldName: row.field_name,
    status: row.status,
    currentValue: row.current_value ?? undefined,
    suggestedValue,
    metadata: row.metadata && typeof row.metadata === 'object'
      ? row.metadata as Record<string, unknown>
      : undefined,
    createdAt: toIsoString(row.created_at) ?? '',
    approvedAt: toIsoString(row.approved_at),
    appliedAt: toIsoString(row.applied_at),
    errorMessage: row.error_message ?? undefined,
    applyTaskId: row.apply_task_id ?? undefined
  };
}

function mapApplySnapshotRow(row: QueryResultRow): ApplySnapshot {
  return {
    id: row.id,
    siteId: row.site_id,
    suggestionId: row.suggestion_id ?? undefined,
    taskId: row.task_id ?? undefined,
    targetType: row.target_type,
    targetCmsId: row.target_cms_id,
    fieldName: row.field_name,
    beforeValue: row.before_value ?? undefined,
    afterValue: row.after_value,
    status: row.status,
    createdAt: toIsoString(row.created_at) ?? '',
    appliedAt: toIsoString(row.applied_at),
    rolledBackAt: toIsoString(row.rolled_back_at),
    matchedAt: toIsoString(row.snapshot_matched_at),
    errorMessage: row.error_message ?? undefined
  };
}

async function buildSeoIssues(
  articles: SyncedArticle[],
  media: SyncedMedia[],
  options: BuildSeoIssueOptions
) {
  const issues: Array<Omit<SeoAuditIssue, 'id' | 'auditId' | 'siteId' | 'createdAt'>> = [];
  const articleById = new Map(articles.map((article) => [article.cmsId, article]));
  const mediaSequenceByCmsId = buildMediaSequenceMap(media);

  for (const article of articles) {
    const titleLength = article.title.trim().length;
    if (titleLength < 25 || titleLength > 65) {
      issues.push({
        targetType: 'article',
        targetCmsId: article.cmsId,
        ruleCode: 'ARTICLE_TITLE_LENGTH',
        severity: titleLength < 10 ? 'high' : 'medium',
        message: '文章標題長度未落在建議範圍',
        currentValue: article.title,
        suggestedValue: normalizeTitleSuggestion(article.title),
        fieldName: 'title'
      });
    }

    const metaDescription = article.metaDescription?.trim() ?? '';
    if (metaDescription.length < 70 || metaDescription.length > 160) {
      issues.push({
        targetType: 'article',
        targetCmsId: article.cmsId,
        ruleCode: 'ARTICLE_META_DESCRIPTION_LENGTH',
        severity: metaDescription.length === 0 || metaDescription.length > 220 ? 'high' : 'medium',
        message: '文章 Meta Description 未落在建議範圍',
        currentValue: metaDescription,
        suggestedValue: normalizeMetaDescriptionSuggestion(article),
        fieldName: 'metaDescription'
      });
    }

    const h1Matches = article.contentHtml?.match(/<h1\b/gi) ?? [];
    if (h1Matches.length !== 1) {
      issues.push({
        targetType: 'article',
        targetCmsId: article.cmsId,
        ruleCode: 'ARTICLE_H1_COUNT',
        severity: h1Matches.length === 0 ? 'medium' : 'high',
        message: '文章內容應保留一個清楚的 H1',
        currentValue: String(h1Matches.length),
        suggestedValue: '保留一個主要 H1，其他段落標題改用 H2/H3',
        fieldName: 'contentHtml'
      });
    }

    const internalLinks = article.contentHtml?.match(/<a\s+[^>]*href=["']\/(?!\/)/gi) ?? [];
    if (internalLinks.length < 2) {
      issues.push({
        targetType: 'article',
        targetCmsId: article.cmsId,
        ruleCode: 'ARTICLE_INTERNAL_LINKS',
        severity: 'low',
        message: '文章內部連結不足',
        currentValue: String(internalLinks.length),
        suggestedValue: buildInternalLinkSuggestionValue(article, articles),
        fieldName: 'contentHtml'
      });
    }
  }

  const mediaIssueGroups = await mapWithConcurrency(media, 3, async (mediaItem) => {
    const mediaContext = buildMediaContext(
      mediaItem,
      articleById,
      mediaSequenceByCmsId.get(mediaItem.cmsId) ?? 1
    );
    const aiSuggestions = await generateAiMediaSuggestions(
      options.textProvider,
      options,
      mediaItem,
      mediaContext
    );

    const mediaIssues: Array<Omit<SeoAuditIssue, 'id' | 'auditId' | 'siteId' | 'createdAt'>> = [];
    const suggestedTitle = pickMediaSuggestionValue('title', aiSuggestions, mediaContext, mediaItem);
    if (shouldSuggestMediaField(mediaItem.title, suggestedTitle)) {
      mediaIssues.push({
        targetType: 'media',
        targetCmsId: mediaItem.cmsId,
        ruleCode: 'MEDIA_TITLE_CONTEXT',
        severity: 'medium',
        message: '圖片標題應結合所屬內容上下文',
        currentValue: mediaItem.title,
        suggestedValue: suggestedTitle,
        fieldName: 'title'
      });
    }

    const suggestedCaption = pickMediaSuggestionValue('caption', aiSuggestions, mediaContext, mediaItem);
    if (shouldSuggestMediaField(mediaItem.caption, suggestedCaption)) {
      mediaIssues.push({
        targetType: 'media',
        targetCmsId: mediaItem.cmsId,
        ruleCode: 'MEDIA_CAPTION_CONTEXT',
        severity: 'medium',
        message: '圖片簡介應根據文章或頁面上下文優化',
        currentValue: mediaItem.caption ?? '',
        suggestedValue: suggestedCaption,
        fieldName: 'caption'
      });
    }

    const suggestedDescription = pickMediaSuggestionValue('description', aiSuggestions, mediaContext, mediaItem);
    if (shouldSuggestMediaField(mediaItem.description, suggestedDescription)) {
      mediaIssues.push({
        targetType: 'media',
        targetCmsId: mediaItem.cmsId,
        ruleCode: 'MEDIA_DESCRIPTION_CONTEXT',
        severity: 'low',
        message: '圖片說明應根據文章或頁面上下文優化',
        currentValue: mediaItem.description ?? '',
        suggestedValue: suggestedDescription,
        fieldName: 'description'
      });
    }

    const suggestedAltText = pickMediaSuggestionValue('altText', aiSuggestions, mediaContext, mediaItem);
    if (shouldSuggestMediaField(mediaItem.altText, suggestedAltText)) {
      mediaIssues.push({
        targetType: 'media',
        targetCmsId: mediaItem.cmsId,
        ruleCode: 'MEDIA_ALT_TEXT_CONTEXT',
        severity: 'high',
        message: '圖片 Alt Text 應結合所屬內容上下文',
        currentValue: mediaItem.altText ?? '',
        suggestedValue: suggestedAltText,
        fieldName: 'altText'
      });
    }

    const suggestedFileName = pickMediaSuggestionValue('fileName', aiSuggestions, mediaContext, mediaItem);
    if (shouldSuggestMediaField(mediaItem.fileName, suggestedFileName, 'fileName')) {
      mediaIssues.push({
        targetType: 'media',
        targetCmsId: mediaItem.cmsId,
        ruleCode: mediaContext.contextSlug ? 'MEDIA_FILE_NAME_CONTEXT' : 'MEDIA_FILE_NAME_FORMAT',
        severity: 'medium',
        message: mediaContext.contextSlug ? '圖片檔名應根據關聯內容 slug 命名' : '圖片檔名不利於搜尋引擎理解',
        currentValue: mediaItem.fileName ?? '',
        suggestedValue: suggestedFileName,
        fieldName: 'fileName'
      });
    }

    return mediaIssues;
  });

  for (const mediaIssues of mediaIssueGroups) {
    issues.push(...mediaIssues);
  }

  return issues;
}

function normalizeInternalLinkTerms(values: string[]) {
  return values
    .map((value) => normalizePlainText(value).toLowerCase())
    .filter(Boolean);
}

function countSharedTerms(leftValues: string[], rightValues: string[]) {
  const leftTerms = new Set(normalizeInternalLinkTerms(leftValues));
  const rightTerms = new Set(normalizeInternalLinkTerms(rightValues));
  let sharedCount = 0;

  for (const term of leftTerms) {
    if (rightTerms.has(term)) {
      sharedCount += 1;
    }
  }

  return sharedCount;
}

function getInternalLinkTitleTokens(title: string) {
  return normalizePlainText(title)
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function buildInternalLinkReason(
  categoryMatches: number,
  tagMatches: number,
  titleMatches: number,
  isFallback: boolean
) {
  if (categoryMatches > 0) {
    return `共享 ${categoryMatches} 個分類，主題關聯度較高。`;
  }

  if (tagMatches > 0) {
    return `共享 ${tagMatches} 個標籤，可補強站內主題群。`;
  }

  if (titleMatches > 0) {
    return '標題關鍵詞有重疊，可作為相關閱讀補充。';
  }

  return isFallback ? '沒有明顯分類或標籤交集，先選擇近期內容補足站內導流。' : '可補充為相關閱讀連結。';
}

function buildInternalLinkSuggestionValue(article: SyncedArticle, articles: SyncedArticle[]) {
  const sourceTitleTokens = getInternalLinkTitleTokens(article.title);
  const candidates = articles
    .filter((candidate) => candidate.cmsId !== article.cmsId)
    .filter((candidate) => candidate.status === 'publish')
    .filter((candidate) => candidate.url.trim() !== '');

  const scoredCandidates = candidates
    .map((candidate) => {
      const categoryMatches = countSharedTerms(article.categories, candidate.categories);
      const tagMatches = countSharedTerms(article.tags, candidate.tags);
      const titleMatches = countSharedTerms(sourceTitleTokens, getInternalLinkTitleTokens(candidate.title));
      const score = categoryMatches * 4 + tagMatches * 3 + titleMatches * 2;

      return {
        candidate,
        categoryMatches,
        tagMatches,
        titleMatches,
        score
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.candidate.updatedAt.localeCompare(left.candidate.updatedAt);
    });

  const fallbackCandidates = scoredCandidates.length > 0
    ? []
    : candidates
        .slice()
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 3)
        .map((candidate, index) => ({
          candidate,
          categoryMatches: 0,
          tagMatches: 0,
          titleMatches: 0,
          score: Math.max(1, 3 - index)
        }));

  const selectedCandidates = (scoredCandidates.length > 0 ? scoredCandidates : fallbackCandidates).slice(0, 3);
  if (selectedCandidates.length === 0) {
    return '補充 2-3 個與主題相關的站內連結';
  }

  return JSON.stringify({
    format: 'rankwoven-internal-links-v1',
    intro: '建議在內容最後加入以下相關閱讀連結，避免破壞原有 WPBakery 或頁面建構器結構。',
    links: selectedCandidates.map((item) => ({
      targetCmsId: item.candidate.cmsId,
      targetTitle: item.candidate.title,
      targetUrl: item.candidate.url,
      anchorText: item.candidate.title,
      relevance: item.score >= 7 ? 'high' : item.score >= 4 ? 'medium' : 'low',
      reason: buildInternalLinkReason(
        item.categoryMatches,
        item.tagMatches,
        item.titleMatches,
        scoredCandidates.length === 0
      )
    }))
  });
}

function normalizeTitleSuggestion(title: string) {
  const trimmed = title.trim();
  if (trimmed.length >= 25 && trimmed.length <= 65) {
    return trimmed;
  }

  return trimmed.length < 25 ? `${trimmed} 完整指南` : trimmed.slice(0, 62).trim();
}

function normalizeMetaDescriptionSuggestion(article: SyncedArticle) {
  const sourceText = normalizePlainText(article.excerpt || article.contentHtml || article.title);
  const normalized = sourceText || normalizePlainText(article.title);

  if (normalized.length > 155) {
    return `${normalized.slice(0, 152).trim()}...`;
  }

  if (normalized.length >= 70) {
    return normalized;
  }

  return `${normalized}，了解重點做法、常見問題與可立即套用的 SEO 優化建議。`;
}

function normalizeImageText(value: string) {
  return normalizePlainText(value)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface MediaContext {
  contextTitle: string;
  contextSlug: string;
  contextSummary: string;
  contextDetail: string;
  placementContext: string;
  imageDescriptor: string;
  extension: string;
  sequenceNumber: number;
}

interface BuildSeoIssueOptions {
  siteId: string;
  userId: string;
  locale?: string;
  textProvider?: TextGenerationProvider;
}

interface AiMediaSuggestionResult {
  title?: string;
  caption?: string;
  description?: string;
  altText?: string;
  fileName?: string;
}

function buildMediaContext(
  mediaItem: SyncedMedia,
  articleById: Map<string, SyncedArticle>,
  sequenceNumber: number
): MediaContext {
  const attachedArticle = mediaItem.attachedToCmsId ? articleById.get(mediaItem.attachedToCmsId) : undefined;
  const contextTitle = mediaItem.attachedToTitle?.trim() || attachedArticle?.title.trim() || '';
  const contextSlug = attachedArticle?.slug.trim() ?? '';
  const placementContext = extractMediaPlacementContext(attachedArticle, mediaItem);
  const excerptText = normalizePlainText(attachedArticle?.excerpt || '');
  const contentText = normalizePlainText(attachedArticle?.contentHtml || '');
  const contextSummary = placementContext || excerptText || contentText;
  const contextDetail = placementContext || contentText || excerptText;
  const imageDescriptor = normalizeImageText(mediaItem.title || mediaItem.fileName || '');
  const extension = mediaItem.fileName?.includes('.')
    ? mediaItem.fileName.split('.').pop()?.toLowerCase() ?? 'jpg'
    : 'jpg';

  return {
    contextTitle,
    contextSlug,
    contextSummary,
    contextDetail,
    placementContext,
    imageDescriptor,
    extension,
    sequenceNumber
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractMediaPlacementContext(article: SyncedArticle | undefined, mediaItem: SyncedMedia) {
  const html = stripNonContentMarkup(article?.contentHtml ?? '');
  if (!html) {
    return '';
  }

  const lookupValues = [
    `wp-image-${mediaItem.cmsId}`,
    mediaItem.url,
    mediaItem.fileName,
    mediaItem.url ? mediaItem.url.split('/').pop()?.split('?')[0] ?? '' : ''
  ].filter((value): value is string => Boolean(value && value.trim()));

  const matchedValue = lookupValues.find((value) => new RegExp(escapeRegExp(value), 'i').test(html));
  if (!matchedValue) {
    return '';
  }

  const matchIndex = html.toLowerCase().indexOf(matchedValue.toLowerCase());
  if (matchIndex === -1) {
    return '';
  }

  const snippetStart = Math.max(0, matchIndex - 600);
  const snippetEnd = Math.min(html.length, matchIndex + 1200);
  return normalizePlainText(html.slice(snippetStart, snippetEnd));
}

function truncateContext(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength).trim()}...`;
}

function extractJsonObject(value: string) {
  const trimmedValue = value.trim();
  if (trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) {
    return trimmedValue;
  }

  const fencedMatch = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectMatch = value.match(/\{[\s\S]*\}/);
  return objectMatch?.[0]?.trim() ?? value.trim();
}

function normalizeAiTextValue(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return '';
  }

  return trimSeoText(normalizePlainText(value), maxLength);
}

function normalizeAiFileNameValue(value: unknown, fallbackExtension: string) {
  if (typeof value !== 'string' || value.trim() === '') {
    return '';
  }

  const normalizedValue = normalizePlainText(value);
  if (normalizedValue === '') {
    return '';
  }

  const rawFileName = normalizedValue.split('/').pop() ?? normalizedValue;
  const fileNameWithExtension = rawFileName.includes('.')
    ? rawFileName
    : `${rawFileName}.${fallbackExtension || 'jpg'}`;

  return normalizeFileName(fileNameWithExtension);
}

async function mapWithConcurrency<T, TResult>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<TResult>
) {
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => worker())
  );

  return results;
}

async function generateAiMediaSuggestions(
  textProvider: TextGenerationProvider | undefined,
  options: BuildSeoIssueOptions,
  mediaItem: SyncedMedia,
  mediaContext: MediaContext
): Promise<AiMediaSuggestionResult | undefined> {
  if (!textProvider) {
    return undefined;
  }

  const meaningfulContext = [
    mediaContext.contextTitle,
    mediaContext.placementContext,
    mediaContext.contextSummary,
    mediaContext.contextDetail
  ].some((value) => value.trim() !== '');

  if (!meaningfulContext) {
    return undefined;
  }

  try {
    const response = await textProvider.rewriteContent({
      siteId: options.siteId,
      userId: options.userId,
      locale: options.locale ?? 'zh-Hant',
      promptVersion: '2026-08-04.media-context-ai-1',
      title:
        'Return JSON only with keys title, caption, description, altText, fileName. ' +
        'Use Traditional Chinese for text fields, keep them concise and SEO-friendly, and make the filename lowercase ASCII with hyphens plus extension.',
      html: [
        `Article title: ${mediaContext.contextTitle || '(none)'}`,
        mediaContext.contextSlug ? `Article slug: ${mediaContext.contextSlug}` : '',
        mediaContext.placementContext ? `Image placement context: ${truncateContext(mediaContext.placementContext, 1200)}` : '',
        mediaContext.contextSummary ? `Article summary: ${truncateContext(mediaContext.contextSummary, 600)}` : '',
        mediaContext.contextDetail ? `Article detail: ${truncateContext(mediaContext.contextDetail, 1800)}` : '',
        `Current image title: ${normalizePlainText(mediaItem.title) || '(empty)'}`,
        `Current image caption: ${normalizePlainText(mediaItem.caption || '') || '(empty)'}`,
        `Current image description: ${normalizePlainText(mediaItem.description || '') || '(empty)'}`,
        `Current image alt text: ${normalizePlainText(mediaItem.altText || '') || '(empty)'}`,
        `Current filename: ${mediaItem.fileName || '(empty)'}`,
        `Preferred filename base slug: ${mediaContext.contextSlug || '(none)'}`,
        `Image descriptor from current metadata: ${mediaContext.imageDescriptor || '(none)'}`
      ]
        .filter(Boolean)
        .join('\n')
    });

    const parsed = JSON.parse(extractJsonObject(response.text)) as Record<string, unknown>;

    return {
      title: normalizeAiTextValue(parsed.title, 140),
      caption: normalizeAiTextValue(parsed.caption, 180),
      description: normalizeAiTextValue(parsed.description, 280),
      altText: normalizeAiTextValue(parsed.altText, 125),
      fileName: normalizeAiFileNameValue(parsed.fileName, mediaContext.extension)
    };
  } catch {
    return undefined;
  }
}

async function generateEditorSeoSuggestion(
  textProvider: TextGenerationProvider | undefined,
  input: EditorSeoGenerationInput & { siteId: string; userId: string }
): Promise<EditorSeoGenerationResult> {
  const fallback = buildEditorSeoFallback(input);

  if (!textProvider) {
    return fallback;
  }

  const meaningfulContext = [
    input.currentTitle,
    input.focusKeyphrase,
    input.excerpt,
    input.contentHtml
  ].some((value) => normalizePlainText(value).length > 0);

  if (!meaningfulContext) {
    return fallback;
  }

  try {
    const response = await textProvider.rewriteContent({
      siteId: input.siteId,
      userId: input.userId,
      locale: input.locale,
      promptVersion: '2026-08-08.editor-seo-ai-1',
      title:
        'Return JSON only with keys seoTitle, slug, metaDescription, analysis. ' +
        'Keep seoTitle and metaDescription concise. The slug must be lowercase, URL-safe, and suitable for WordPress. ' +
        'Use the same language as the current content. If the content is Chinese, keep the title and description in Chinese, but still make the slug URL-safe.',
      html: [
        `Post type: ${input.postType}`,
        input.focusKeyphrase ? `Focus keyphrase: ${input.focusKeyphrase}` : '',
        input.currentTitle ? `Current title: ${input.currentTitle}` : '',
        input.currentSeoTitle ? `Current SEO title: ${input.currentSeoTitle}` : '',
        input.currentSlug ? `Current slug: ${input.currentSlug}` : '',
        input.currentMetaDescription ? `Current meta description: ${input.currentMetaDescription}` : '',
        input.excerpt ? `Excerpt: ${input.excerpt}` : '',
        input.contentHtml ? `Content HTML: ${input.contentHtml}` : '',
        'Analyze the current content and return SEO suggestions that improve search intent match, clarity, and click-through rate.'
      ]
        .filter(Boolean)
        .join('\n')
    });

    const parsed = extractEditorSeoResult(response.text);
    const scoreResult = buildEditorSeoScore(input, {
      seoTitle: parsed.seoTitle || fallback.seoTitle,
      slug: parsed.slug || fallback.slug,
      metaDescription: parsed.metaDescription || fallback.metaDescription
    });
    return {
      seoTitle: parsed.seoTitle || fallback.seoTitle,
      slug: parsed.slug || fallback.slug,
      metaDescription: parsed.metaDescription || fallback.metaDescription,
      seoScore: scoreResult.score,
      scoreSummary: scoreResult.summary,
      scoreChecks: scoreResult.checks,
      analysis: [parsed.analysis, scoreResult.summary].filter(Boolean).join('\n') || fallback.analysis
    };
  } catch {
    return fallback;
  }
}

function analyzeCurrentEditorSeo(input: EditorSeoGenerationInput): EditorSeoGenerationResult {
  const seoTitle = trimSeoText(
    normalizePlainText(input.currentSeoTitle || input.currentTitle || input.focusKeyphrase || input.postType),
    65
  );
  const slug = normalizeEditorSeoSlug(input.currentSlug || input.currentTitle || input.focusKeyphrase || input.postType)
    || input.postType;
  const metaDescription = trimSeoText(
    normalizePlainText(input.currentMetaDescription || input.excerpt || input.currentTitle || input.focusKeyphrase),
    160
  );
  const scoreResult = buildEditorSeoScore(input, {
    seoTitle,
    slug,
    metaDescription
  });

  return {
    seoTitle,
    slug,
    metaDescription,
    seoScore: scoreResult.score,
    scoreSummary: scoreResult.summary,
    scoreChecks: scoreResult.checks,
    analysis: scoreResult.summary
  };
}

function pickMediaSuggestionValue(
  fieldName: MediaSuggestionField,
  aiSuggestions: AiMediaSuggestionResult | undefined,
  mediaContext: MediaContext,
  mediaItem: SyncedMedia
) {
  const fallbackBuilders: Record<MediaSuggestionField, () => string> = {
    title: () => buildMediaTitleSuggestion(mediaContext),
    caption: () => buildMediaCaptionSuggestion(mediaContext),
    description: () => buildMediaDescriptionSuggestion(mediaContext),
    altText: () => buildMediaAltTextSuggestion(mediaContext),
    fileName: () => buildMediaFileNameSuggestion(mediaItem, mediaContext)
  };

  const rawValue = aiSuggestions?.[fieldName]?.trim() || fallbackBuilders[fieldName]();
  return normalizeMediaSuggestionValue(fieldName, rawValue, mediaContext.extension);
}

function normalizeMediaSuggestionValue(fieldName: string, value: string, fallbackExtension = 'jpg') {
  if (fieldName === 'fileName') {
    return normalizeAiFileNameValue(value, fallbackExtension);
  }

  const maxLength = fieldName === 'title'
    ? 140
    : fieldName === 'caption'
      ? 180
      : fieldName === 'altText'
        ? 125
        : 280;

  return normalizeAiTextValue(value, maxLength);
}

function shouldSuggestMediaField(
  currentValue: string | undefined,
  suggestedValue: string,
  fieldName?: 'fileName'
) {
  if (!suggestedValue.trim()) {
    return false;
  }

  if (fieldName === 'fileName') {
    return normalizeComparableText(currentValue ?? '') !== normalizeComparableText(suggestedValue);
  }

  return normalizeSuggestionText(currentValue ?? '') !== normalizeSuggestionText(suggestedValue);
}

function buildMediaTitleSuggestion(mediaContext: MediaContext) {
  if (mediaContext.contextTitle) {
    const suggestion = mediaContext.sequenceNumber > 1
      ? `${mediaContext.contextTitle} ${mediaContext.sequenceNumber}`
      : mediaContext.contextTitle;
    return trimSeoText(suggestion, 140);
  }

  return mediaContext.imageDescriptor ? trimSeoText(mediaContext.imageDescriptor, 140) : '';
}

function buildMediaCaptionSuggestion(mediaContext: MediaContext) {
  const suggestion = mediaContext.contextSummary || mediaContext.contextTitle || mediaContext.imageDescriptor;
  return suggestion ? trimSeoText(suggestion, 180) : '';
}

function buildMediaDescriptionSuggestion(mediaContext: MediaContext) {
  const suggestion = mediaContext.contextDetail || mediaContext.contextSummary || mediaContext.contextTitle || mediaContext.imageDescriptor;
  return suggestion ? trimSeoText(suggestion, 280) : '';
}

function buildMediaAltTextSuggestion(mediaContext: MediaContext) {
  if (mediaContext.contextTitle) {
    const suggestion = mediaContext.sequenceNumber > 1
      ? `${mediaContext.contextTitle} ${mediaContext.sequenceNumber}`
      : mediaContext.contextTitle;
    return trimSeoText(suggestion, 125);
  }

  return mediaContext.imageDescriptor ? trimSeoText(mediaContext.imageDescriptor, 125) : '';
}

function buildMediaFileNameSuggestion(mediaItem: SyncedMedia, mediaContext: MediaContext) {
  if (mediaContext.contextSlug) {
    const normalizedSlug = normalizeSlugForFileName(mediaContext.contextSlug);
    if (normalizedSlug) {
      return `${normalizedSlug}-${mediaContext.sequenceNumber}.${mediaContext.extension || 'jpg'}`;
    }
  }

  return mediaItem.fileName ? normalizeFileName(mediaItem.fileName) : '';
}

function normalizeSeoText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeComparableText(value: string) {
  return normalizeSeoText(value).toLowerCase();
}

function normalizeSuggestionText(value: string) {
  return normalizeComparableText(normalizePlainText(value));
}

function trimSeoText(value: string, maxLength: number) {
  const normalized = normalizeSeoText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.slice(0, maxLength).trim();
}

function normalizePlainText(value: string) {
  return stripNonContentMarkup(value)
    .replace(/\[[^\]]*(?:\]|$)/g, ' ')
    .replace(/<[^>]*(?:>|$)/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripNonContentMarkup(value: string) {
  return value
    .replace(/```[\s\S]*?(?:```|$)/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|pre|code)\b[^>]*>[\s\S]*?(?:<\/\1>|$)/gi, ' ')
    .replace(/\[(?:\/)?[a-z][^\]]*(?:\]|$)/gi, ' ');
}

function buildMediaSequenceMap(media: SyncedMedia[]) {
  const sequenceMap = new Map<string, number>();
  const groupedMedia = new Map<string, SyncedMedia[]>();

  for (const mediaItem of media) {
    const groupKey = mediaItem.attachedToCmsId || mediaItem.cmsId;
    groupedMedia.set(groupKey, [...(groupedMedia.get(groupKey) ?? []), mediaItem]);
  }

  for (const items of groupedMedia.values()) {
    items
      .slice()
      .sort((left, right) => {
        const updatedComparison = left.updatedAt.localeCompare(right.updatedAt);
        if (updatedComparison !== 0) {
          return updatedComparison;
        }

        return left.cmsId.localeCompare(right.cmsId);
      })
      .forEach((item, index) => {
        sequenceMap.set(item.cmsId, index + 1);
      });
  }

  return sequenceMap;
}

function normalizeFileName(value: string) {
  const extension = value.includes('.') ? value.split('.').pop()?.toLowerCase() : 'jpg';
  const basename = value.replace(/\.[^.]+$/, '');
  const normalized = basename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return `${normalized || 'rankwoven-image'}.${extension || 'jpg'}`;
}

interface EditorSeoGenerationInput {
  postType: 'post' | 'page' | 'portfolio' | 'product';
  currentTitle: string;
  currentSeoTitle: string;
  currentSlug: string;
  focusKeyphrase: string;
  excerpt: string;
  contentHtml: string;
  currentMetaDescription: string;
  locale: string;
}

interface EditorSeoGenerationResult {
  seoTitle: string;
  slug: string;
  metaDescription: string;
  seoScore: number;
  scoreSummary: string;
  scoreChecks: EditorSeoScoreCheck[];
  analysis: string;
}

type EditorSeoScoreStatus = 'pass' | 'warning' | 'fail';

interface EditorSeoScoreCheck {
  key: string;
  label: string;
  status: EditorSeoScoreStatus;
  points: number;
  maxPoints: number;
  message: string;
}

interface EditorSeoScoreResult {
  score: number;
  maxScore: number;
  summary: string;
  checks: EditorSeoScoreCheck[];
}

function normalizeEditorSeoSlug(value: string) {
  const normalized = normalizePlainText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized.slice(0, 240);
}

function normalizeEditorSeoKeywordSlug(value: string) {
  return normalizePlainText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildEditorSeoScoreCheck(
  key: string,
  label: string,
  status: EditorSeoScoreStatus,
  points: number,
  maxPoints: number,
  message: string
): EditorSeoScoreCheck {
  return {
    key,
    label,
    status,
    points,
    maxPoints,
    message
  };
}

function buildEditorSeoScore(
  input: EditorSeoGenerationInput,
  fields: Pick<EditorSeoGenerationResult, 'seoTitle' | 'slug' | 'metaDescription'>
): EditorSeoScoreResult {
  const keyphrase = normalizePlainText(input.focusKeyphrase).toLowerCase();
  const keyphraseSlug = normalizeEditorSeoKeywordSlug(input.focusKeyphrase);
  const seoTitle = normalizePlainText(fields.seoTitle);
  const metaDescription = normalizePlainText(fields.metaDescription);
  const slug = normalizeEditorSeoSlug(fields.slug);
  const contentText = normalizePlainText(input.contentHtml).toLowerCase();
  const h1Count = (input.contentHtml.match(/<h1\b/gi) ?? []).length;
  const internalLinkCount = (input.contentHtml.match(/<a\s+[^>]*href=["'][^"']+["']/gi) ?? []).length;

  const checks: EditorSeoScoreCheck[] = [];

  checks.push(
    seoTitle.length >= 25 && seoTitle.length <= 65
      ? buildEditorSeoScoreCheck('title-length', 'SEO title 長度', 'pass', 15, 15, 'SEO title 長度落在建議範圍 25-65 字。')
      : seoTitle.length >= 15 && seoTitle.length <= 80
        ? buildEditorSeoScoreCheck('title-length', 'SEO title 長度', 'warning', 8, 15, 'SEO title 可再調整到 25-65 字之間。')
        : buildEditorSeoScoreCheck('title-length', 'SEO title 長度', 'fail', 0, 15, 'SEO title 過短或過長，建議調整到 25-65 字。')
  );

  if (keyphrase === '') {
    checks.push(buildEditorSeoScoreCheck('focus-in-title', '焦點關鍵詞在標題中', 'warning', 0, 15, '尚未設定 Focus keyphrase，無法檢查標題關鍵詞相關性。'));
  } else if (seoTitle.toLowerCase().includes(keyphrase)) {
    checks.push(buildEditorSeoScoreCheck('focus-in-title', '焦點關鍵詞在標題中', 'pass', 15, 15, 'SEO title 已包含 Focus keyphrase。'));
  } else {
    checks.push(buildEditorSeoScoreCheck('focus-in-title', '焦點關鍵詞在標題中', 'fail', 0, 15, 'SEO title 尚未包含 Focus keyphrase。'));
  }

  checks.push(
    metaDescription.length >= 70 && metaDescription.length <= 160
      ? buildEditorSeoScoreCheck('meta-length', 'Meta description 長度', 'pass', 15, 15, 'Meta description 長度落在建議範圍 70-160 字。')
      : metaDescription.length >= 50 && metaDescription.length <= 180
        ? buildEditorSeoScoreCheck('meta-length', 'Meta description 長度', 'warning', 8, 15, 'Meta description 可再調整到 70-160 字之間。')
        : buildEditorSeoScoreCheck('meta-length', 'Meta description 長度', 'fail', 0, 15, 'Meta description 過短、缺失或過長。')
  );

  if (keyphrase === '') {
    checks.push(buildEditorSeoScoreCheck('focus-in-meta', '焦點關鍵詞在描述中', 'warning', 0, 10, '尚未設定 Focus keyphrase，無法檢查描述關鍵詞相關性。'));
  } else if (metaDescription.toLowerCase().includes(keyphrase)) {
    checks.push(buildEditorSeoScoreCheck('focus-in-meta', '焦點關鍵詞在描述中', 'pass', 10, 10, 'Meta description 已包含 Focus keyphrase。'));
  } else {
    checks.push(buildEditorSeoScoreCheck('focus-in-meta', '焦點關鍵詞在描述中', 'fail', 0, 10, 'Meta description 尚未包含 Focus keyphrase。'));
  }

  if (slug !== '' && slug.length <= 75 && (keyphraseSlug === '' || slug.includes(keyphraseSlug))) {
    checks.push(buildEditorSeoScoreCheck('slug-quality', 'Slug 品質', 'pass', 10, 10, 'Slug 簡潔且與主題相關。'));
  } else if (slug !== '') {
    checks.push(buildEditorSeoScoreCheck('slug-quality', 'Slug 品質', 'warning', 5, 10, 'Slug 已存在，但可再縮短或更貼近 Focus keyphrase。'));
  } else {
    checks.push(buildEditorSeoScoreCheck('slug-quality', 'Slug 品質', 'fail', 0, 10, 'Slug 為空或不利於 SEO。'));
  }

  checks.push(
    contentText.length >= 300
      ? buildEditorSeoScoreCheck('content-length', '內容長度', 'pass', 10, 10, '內容長度足夠，可支撐主題完整性。')
      : contentText.length >= 150
        ? buildEditorSeoScoreCheck('content-length', '內容長度', 'warning', 5, 10, '內容略短，建議補充更多主題細節。')
        : buildEditorSeoScoreCheck('content-length', '內容長度', 'fail', 0, 10, '內容過短，難以支撐主要關鍵詞排名。')
  );

  checks.push(
    h1Count === 1
      ? buildEditorSeoScoreCheck('h1-count', 'H1 結構', 'pass', 10, 10, '內容保留單一 H1，結構清晰。')
      : h1Count === 0
        ? buildEditorSeoScoreCheck('h1-count', 'H1 結構', 'fail', 0, 10, '內容缺少 H1，建議保留一個主標題。')
        : buildEditorSeoScoreCheck('h1-count', 'H1 結構', 'warning', 5, 10, '內容有多個 H1，建議只保留一個。')
  );

  checks.push(
    internalLinkCount >= 2
      ? buildEditorSeoScoreCheck('internal-links', '內部連結', 'pass', 5, 5, '內容已包含足夠的內部連結。')
      : internalLinkCount === 1
        ? buildEditorSeoScoreCheck('internal-links', '內部連結', 'warning', 3, 5, '建議再補至少一條內部連結。')
        : buildEditorSeoScoreCheck('internal-links', '內部連結', 'fail', 0, 5, '內容尚未包含內部連結。')
  );

  if (keyphrase === '') {
    checks.push(buildEditorSeoScoreCheck('focus-in-content', '焦點關鍵詞在內容中', 'warning', 0, 10, '尚未設定 Focus keyphrase，無法檢查正文相關性。'));
  } else if (contentText.includes(keyphrase)) {
    checks.push(buildEditorSeoScoreCheck('focus-in-content', '焦點關鍵詞在內容中', 'pass', 10, 10, '內容正文已包含 Focus keyphrase。'));
  } else {
    checks.push(buildEditorSeoScoreCheck('focus-in-content', '焦點關鍵詞在內容中', 'fail', 0, 10, '內容正文尚未包含 Focus keyphrase。'));
  }

  const score = checks.reduce((total, check) => total + check.points, 0);
  const maxScore = checks.reduce((total, check) => total + check.maxPoints, 0);
  const failingChecks = checks.filter((check) => check.status !== 'pass').map((check) => check.message);
  const summary = failingChecks.length > 0
    ? `目前內容 SEO 分數 ${score}/${maxScore}。待優化：${failingChecks.join('；')}`
    : `目前內容 SEO 分數 ${score}/${maxScore}。主要 SEO 檢查項均已達標。`;

  return {
    score,
    maxScore,
    summary,
    checks
  };
}

function buildEditorSeoFallback(input: EditorSeoGenerationInput): EditorSeoGenerationResult {
  const focusKeyphrase = normalizePlainText(input.focusKeyphrase);
  const currentTitle = normalizePlainText(input.currentTitle);
  const currentSeoTitle = normalizePlainText(input.currentSeoTitle);
  const currentSlug = normalizeEditorSeoSlug(input.currentSlug);
  const currentMetaDescription = normalizePlainText(input.currentMetaDescription);
  const excerpt = normalizePlainText(input.excerpt);
  const contentText = normalizePlainText(input.contentHtml);
  const seedTitle = currentSeoTitle || currentTitle || focusKeyphrase || input.postType;
  const seoTitleBase = focusKeyphrase
    ? `${focusKeyphrase} - ${seedTitle}`.trim()
    : seedTitle;
  const seoTitle = trimSeoText(seoTitleBase, 65) || trimSeoText(seedTitle, 65);
  const slugSeed = focusKeyphrase || currentTitle || currentSlug || input.postType;
  const slug = normalizeEditorSeoSlug(slugSeed) || normalizeEditorSeoSlug(seedTitle) || input.postType;
  const metaDescriptionSource = currentMetaDescription || excerpt || contentText || seedTitle;
  const metaDescription = trimSeoText(
    focusKeyphrase
      ? `${metaDescriptionSource}。围绕 ${focusKeyphrase} 进一步优化页面结构、标题与可读性。`
      : `${metaDescriptionSource}。`,
    160
  );
  const analysis = focusKeyphrase
    ? `已根据当前内容与焦点关键词「${focusKeyphrase}」生成建议。`
    : '已根据当前内容生成建议。';
  const scoreResult = buildEditorSeoScore(input, {
    seoTitle,
    slug,
    metaDescription
  });

  return {
    seoTitle,
    slug,
    metaDescription,
    seoScore: scoreResult.score,
    scoreSummary: scoreResult.summary,
    scoreChecks: scoreResult.checks,
    analysis: `${analysis}\n${scoreResult.summary}`
  };
}

function extractEditorSeoResult(value: string) {
  const parsed = JSON.parse(extractJsonObject(value)) as Partial<EditorSeoGenerationResult> & {
    analysis?: string;
  };

  const seoTitle = trimSeoText(normalizePlainText(parsed.seoTitle ?? ''), 65);
  const slug = normalizeEditorSeoSlug(normalizePlainText(parsed.slug ?? ''));
  const metaDescription = trimSeoText(normalizePlainText(parsed.metaDescription ?? ''), 160);
  const analysis = trimSeoText(normalizePlainText(parsed.analysis ?? ''), 500);

  return {
    seoTitle,
    slug,
    metaDescription,
    seoScore: 0,
    scoreSummary: '',
    scoreChecks: [],
    analysis
  };
}

async function normalizeStoredMediaSuggestion(
  repository: SeoOptimizationRepository,
  siteId: string,
  suggestion: OptimizationSuggestion
) {
  if (suggestion.targetType !== 'media') {
    return suggestion;
  }

  const extension = suggestion.suggestedValue.includes('.')
    ? suggestion.suggestedValue.split('.').pop()?.toLowerCase() ?? 'jpg'
    : 'jpg';
  const normalizedValue = normalizeMediaSuggestionValue(
    suggestion.fieldName,
    suggestion.suggestedValue,
    extension
  );

  if (normalizedValue === '') {
    return undefined;
  }

  return repository.updateSuggestion(siteId, suggestion.id, normalizedValue);
}

function normalizeSlugForFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function toSuggestionType(issue: Omit<SeoAuditIssue, 'id' | 'auditId' | 'siteId' | 'createdAt'>): SuggestionType {
  if (issue.ruleCode === 'MEDIA_TITLE_CONTEXT') {
    return 'media_title';
  }

  if (issue.ruleCode === 'MEDIA_CAPTION_MISSING' || issue.ruleCode === 'MEDIA_CAPTION_CONTEXT') {
    return 'media_caption';
  }

  if (issue.ruleCode === 'MEDIA_DESCRIPTION_MISSING' || issue.ruleCode === 'MEDIA_DESCRIPTION_CONTEXT') {
    return 'media_description';
  }

  if (issue.ruleCode === 'MEDIA_ALT_TEXT_MISSING' || issue.ruleCode === 'MEDIA_ALT_TEXT_CONTEXT') {
    return 'media_alt_text';
  }

  if (issue.ruleCode === 'MEDIA_FILE_NAME_FORMAT' || issue.ruleCode === 'MEDIA_FILE_NAME_CONTEXT') {
    return 'media_file_name';
  }

  if (issue.ruleCode === 'ARTICLE_INTERNAL_LINKS') {
    return 'internal_link';
  }

  if (issue.ruleCode === 'ARTICLE_META_DESCRIPTION_LENGTH') {
    return 'meta_description';
  }

  return issue.fieldName === 'title' ? 'title' : 'content';
}

function matchesSuggestionFilters(
  suggestion: OptimizationSuggestion,
  options?: ListSuggestionOptions
) {
  if (options?.targetType && suggestion.targetType !== options.targetType) {
    return false;
  }

  if (options?.targetCmsIds?.length && !options.targetCmsIds.includes(suggestion.targetCmsId)) {
    return false;
  }

  return true;
}

function removeExistingActionableSuggestions(
  suggestions: Map<string, OptimizationSuggestion>,
  siteId: string,
  targetType: TargetType,
  targetCmsId: string,
  suggestionType: SuggestionType,
  fieldName: string
) {
  for (const [suggestionId, suggestion] of suggestions.entries()) {
    if (
      suggestion.siteId === siteId &&
      suggestion.targetType === targetType &&
      suggestion.targetCmsId === targetCmsId &&
      suggestion.suggestionType === suggestionType &&
      suggestion.fieldName === fieldName &&
      suggestion.status !== 'applied'
    ) {
      suggestions.delete(suggestionId);
    }
  }
}

export function createInMemorySeoOptimizationRepository(): SeoOptimizationRepository {
  const audits = new Map<string, SeoAudit>();
  const issues = new Map<string, SeoAuditIssue>();
  const suggestions = new Map<string, OptimizationSuggestion>();
  const applySnapshots = new Map<string, ApplySnapshot>();

  return {
    async saveAudit(siteId, auditInput, issueInputs) {
      const audit: SeoAudit = {
        id: crypto.randomUUID(),
        siteId,
        createdAt: new Date().toISOString(),
        ...auditInput
      };
      const savedIssues = issueInputs.map((issueInput) => ({
        id: crypto.randomUUID(),
        auditId: audit.id,
        siteId,
        createdAt: audit.createdAt,
        ...issueInput
      }));

      audits.set(audit.id, audit);
      for (const issue of savedIssues) {
        issues.set(issue.id, issue);
        if (issue.suggestedValue) {
          removeExistingActionableSuggestions(
            suggestions,
            siteId,
            issue.targetType,
            issue.targetCmsId,
            toSuggestionType(issue),
            issue.fieldName
          );
          const suggestion = createSuggestionFromIssue(siteId, issue);
          suggestions.set(suggestion.id, suggestion);
        }
      }

      return { audit, issues: savedIssues };
    },
    async listAudits(siteId) {
      return Array.from(audits.values())
        .filter((audit) => audit.siteId === siteId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
    async listIssues(auditId) {
      return Array.from(issues.values()).filter((issue) => issue.auditId === auditId);
    },
    async createSuggestion(siteId, input, auditIssueId) {
      removeExistingActionableSuggestions(
        suggestions,
        siteId,
        input.targetType,
        input.targetCmsId,
        input.suggestionType,
        input.fieldName
      );
      const suggestion = createSuggestion(siteId, input, auditIssueId);
      suggestions.set(suggestion.id, suggestion);
      return suggestion;
    },
    async listSuggestions(siteId, options) {
      return Array.from(suggestions.values())
        .filter((suggestion) => suggestion.siteId === siteId)
        .filter((suggestion) => matchesSuggestionFilters(suggestion, options))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
    async findSuggestion(siteId, suggestionId) {
      const suggestion = suggestions.get(suggestionId);
      return suggestion?.siteId === siteId ? suggestion : undefined;
    },
    async updateSuggestion(siteId, suggestionId, suggestedValue) {
      const suggestion = suggestions.get(suggestionId);
      if (!suggestion || suggestion.siteId !== siteId) {
        return undefined;
      }

      suggestion.suggestedValue = suggestedValue;
      suggestion.errorMessage = undefined;
      return suggestion;
    },
    async approveSuggestion(siteId, suggestionId) {
      const suggestion = suggestions.get(suggestionId);
      if (!suggestion || suggestion.siteId !== siteId) {
        return undefined;
      }

      suggestion.status = 'approved';
      suggestion.approvedAt = new Date().toISOString();
      return suggestion;
    },
    async markSuggestionApplyQueued(siteId, suggestionId, applyTaskId) {
      const suggestion = suggestions.get(suggestionId);
      if (!suggestion || suggestion.siteId !== siteId) {
        return undefined;
      }

      suggestion.applyTaskId = applyTaskId;
      return suggestion;
    },
    async createApplySnapshot(siteId, suggestion, taskId) {
      const snapshot: ApplySnapshot = {
        id: crypto.randomUUID(),
        siteId,
        suggestionId: suggestion.id,
        taskId,
        targetType: suggestion.targetType,
        targetCmsId: suggestion.targetCmsId,
        fieldName: suggestion.fieldName,
        beforeValue: suggestion.currentValue,
        afterValue: suggestion.suggestedValue,
        status: 'created',
        createdAt: new Date().toISOString()
      };
      applySnapshots.set(snapshot.id, snapshot);
      return snapshot;
    },
    async attachSnapshotTask(snapshotId, taskId) {
      const snapshot = applySnapshots.get(snapshotId);
      if (!snapshot) {
        return undefined;
      }

      snapshot.taskId = taskId;
      return snapshot;
    },
    async listApplySnapshots(siteId) {
      return Array.from(applySnapshots.values())
        .filter((snapshot) => snapshot.siteId === siteId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
    async findApplySnapshot(siteId, snapshotId) {
      const snapshot = applySnapshots.get(snapshotId);
      return snapshot?.siteId === siteId ? snapshot : undefined;
    },
    async markApplySnapshotApplied(snapshotId) {
      const snapshot = applySnapshots.get(snapshotId);
      if (!snapshot) {
        return undefined;
      }

      snapshot.status = 'applied';
      snapshot.appliedAt = new Date().toISOString();
      snapshot.errorMessage = undefined;
      return snapshot;
    },
    async markApplySnapshotRolledBack(snapshotId) {
      const snapshot = applySnapshots.get(snapshotId);
      if (!snapshot) {
        return undefined;
      }

      snapshot.status = 'rolled_back';
      snapshot.rolledBackAt = new Date().toISOString();
      snapshot.errorMessage = undefined;
      return snapshot;
    },
    async markApplySnapshotFailed(snapshotId, errorMessage) {
      const snapshot = applySnapshots.get(snapshotId);
      if (!snapshot) {
        return undefined;
      }

      snapshot.status = 'failed';
      snapshot.errorMessage = errorMessage;
      return snapshot;
    },
    async markSuggestionApplied(suggestionId) {
      const suggestion = suggestions.get(suggestionId);
      if (!suggestion) {
        return undefined;
      }

      suggestion.status = 'applied';
      suggestion.appliedAt = new Date().toISOString();
      suggestion.errorMessage = undefined;
      return suggestion;
    },
    async markSuggestionFailed(suggestionId, errorMessage) {
      const suggestion = suggestions.get(suggestionId);
      if (!suggestion) {
        return undefined;
      }

      suggestion.status = 'failed';
      suggestion.errorMessage = errorMessage;
      return suggestion;
    }
  };
}

export class PostgresSeoOptimizationRepository implements SeoOptimizationRepository {
  private readonly pool: Pool;
  private migrationPromise?: Promise<void>;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async saveAudit(
    siteId: string,
    auditInput: Omit<SeoAudit, 'id' | 'siteId' | 'createdAt'>,
    issueInputs: Array<Omit<SeoAuditIssue, 'id' | 'auditId' | 'siteId' | 'createdAt'>>
  ) {
    await this.ensureSchema();
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const auditResult = await client.query(
        `
          INSERT INTO seo_audits (id, site_id, status, score, rules_version)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `,
        [crypto.randomUUID(), siteId, auditInput.status, auditInput.score, auditInput.rulesVersion]
      );
      const audit = mapAuditRow(auditResult.rows[0]);
      const savedIssues: SeoAuditIssue[] = [];

      for (const issueInput of issueInputs) {
        const issueResult = await client.query(
          `
            INSERT INTO seo_audit_issues (
              id, audit_id, site_id, target_type, target_cms_id, rule_code, severity,
              message, current_value, suggested_value, field_name
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
          `,
          [
            crypto.randomUUID(),
            audit.id,
            siteId,
            issueInput.targetType,
            issueInput.targetCmsId,
            issueInput.ruleCode,
            issueInput.severity,
            issueInput.message,
            issueInput.currentValue ?? null,
            issueInput.suggestedValue ?? null,
            issueInput.fieldName
          ]
        );
        const issue = mapIssueRow(issueResult.rows[0]);
        savedIssues.push(issue);

        if (issue.suggestedValue) {
          await this.insertSuggestion(client, siteId, {
            targetType: issue.targetType,
            targetCmsId: issue.targetCmsId,
            suggestionType: toSuggestionType(issue),
            fieldName: issue.fieldName,
            currentValue: issue.currentValue,
            suggestedValue: issue.suggestedValue
          }, issue.id);
        }
      }

      await client.query('COMMIT');
      return { audit, issues: savedIssues };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listAudits(siteId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        SELECT *
        FROM seo_audits
        WHERE site_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `,
      [siteId]
    );
    return result.rows.map(mapAuditRow);
  }

  async listIssues(auditId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        SELECT *
        FROM seo_audit_issues
        WHERE audit_id = $1
        ORDER BY created_at ASC
      `,
      [auditId]
    );
    return result.rows.map(mapIssueRow);
  }

  async createSuggestion(siteId: string, input: CreateSuggestionInput, auditIssueId?: string) {
    await this.ensureSchema();
    const result = await this.insertSuggestion(this.pool, siteId, input, auditIssueId);
    return mapSuggestionRow(result.rows[0]);
  }

  async listSuggestions(siteId: string, options?: ListSuggestionOptions) {
    await this.ensureSchema();
    const filters = ['site_id = $1'];
    const values: Array<string | string[] | number> = [siteId];
    let parameterIndex = 2;

    if (options?.targetType) {
      filters.push(`target_type = $${parameterIndex}`);
      values.push(options.targetType);
      parameterIndex += 1;
    }

    if (options?.targetCmsIds?.length) {
      filters.push(`target_cms_id = ANY($${parameterIndex}::varchar[])`);
      values.push(options.targetCmsIds);
      parameterIndex += 1;
    }

    values.push(options?.limit ?? 200);

    const result = await this.pool.query(
      `
        SELECT *
        FROM optimization_suggestions
        WHERE ${filters.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${parameterIndex}
      `,
      values
    );
    return result.rows.map(mapSuggestionRow);
  }

  async findSuggestion(siteId: string, suggestionId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        SELECT *
        FROM optimization_suggestions
        WHERE id = $1
          AND site_id = $2
        LIMIT 1
      `,
      [suggestionId, siteId]
    );
    return result.rows[0] ? mapSuggestionRow(result.rows[0]) : undefined;
  }

  async updateSuggestion(siteId: string, suggestionId: string, suggestedValue: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        UPDATE optimization_suggestions
        SET suggested_value = $3,
            error_message = NULL
        WHERE id = $1
          AND site_id = $2
        RETURNING *
      `,
      [suggestionId, siteId, suggestedValue]
    );
    return result.rows[0] ? mapSuggestionRow(result.rows[0]) : undefined;
  }

  async approveSuggestion(siteId: string, suggestionId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        UPDATE optimization_suggestions
        SET status = 'approved',
            approved_at = COALESCE(approved_at, now()),
            error_message = NULL
        WHERE id = $1
          AND site_id = $2
        RETURNING *
      `,
      [suggestionId, siteId]
    );
    return result.rows[0] ? mapSuggestionRow(result.rows[0]) : undefined;
  }

  async markSuggestionApplyQueued(siteId: string, suggestionId: string, applyTaskId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        UPDATE optimization_suggestions
        SET apply_task_id = $3
        WHERE id = $1
          AND site_id = $2
        RETURNING *
      `,
      [suggestionId, siteId, applyTaskId]
    );
    return result.rows[0] ? mapSuggestionRow(result.rows[0]) : undefined;
  }

  async createApplySnapshot(siteId: string, suggestion: OptimizationSuggestion, taskId?: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        INSERT INTO apply_snapshots (
          id,
          site_id,
          suggestion_id,
          task_id,
          target_type,
          target_cms_id,
          field_name,
          before_value,
          after_value,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'created')
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        siteId,
        suggestion.id,
        taskId ?? null,
        suggestion.targetType,
        suggestion.targetCmsId,
        suggestion.fieldName,
        suggestion.currentValue ?? null,
        suggestion.suggestedValue
      ]
    );

    return mapApplySnapshotRow(result.rows[0]);
  }

  async attachSnapshotTask(snapshotId: string, taskId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        UPDATE apply_snapshots
        SET task_id = $2
        WHERE id = $1
        RETURNING *
      `,
      [snapshotId, taskId]
    );

    return result.rows[0] ? mapApplySnapshotRow(result.rows[0]) : undefined;
  }

  async listApplySnapshots(siteId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        SELECT *
        FROM apply_snapshots
        WHERE site_id = $1
        ORDER BY created_at DESC
        LIMIT 200
      `,
      [siteId]
    );

    return result.rows.map(mapApplySnapshotRow);
  }

  async findApplySnapshot(siteId: string, snapshotId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        SELECT *
        FROM apply_snapshots
        WHERE id = $1
          AND site_id = $2
        LIMIT 1
      `,
      [snapshotId, siteId]
    );

    return result.rows[0] ? mapApplySnapshotRow(result.rows[0]) : undefined;
  }

  async markApplySnapshotApplied(snapshotId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        UPDATE apply_snapshots
        SET status = 'applied',
            applied_at = now(),
            error_message = NULL
        WHERE id = $1
        RETURNING *
      `,
      [snapshotId]
    );

    return result.rows[0] ? mapApplySnapshotRow(result.rows[0]) : undefined;
  }

  async markApplySnapshotRolledBack(snapshotId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        UPDATE apply_snapshots
        SET status = 'rolled_back',
            rolled_back_at = now(),
            error_message = NULL
        WHERE id = $1
        RETURNING *
      `,
      [snapshotId]
    );

    return result.rows[0] ? mapApplySnapshotRow(result.rows[0]) : undefined;
  }

  async markApplySnapshotFailed(snapshotId: string, errorMessage: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        UPDATE apply_snapshots
        SET status = 'failed',
            error_message = $2
        WHERE id = $1
        RETURNING *
      `,
      [snapshotId, errorMessage]
    );

    return result.rows[0] ? mapApplySnapshotRow(result.rows[0]) : undefined;
  }

  async markSuggestionApplied(suggestionId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        UPDATE optimization_suggestions
        SET status = 'applied',
            applied_at = now(),
            error_message = NULL
        WHERE id = $1
        RETURNING *
      `,
      [suggestionId]
    );
    return result.rows[0] ? mapSuggestionRow(result.rows[0]) : undefined;
  }

  async markSuggestionFailed(suggestionId: string, errorMessage: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        UPDATE optimization_suggestions
        SET status = 'failed',
            error_message = $2
        WHERE id = $1
        RETURNING *
      `,
      [suggestionId, errorMessage]
    );
    return result.rows[0] ? mapSuggestionRow(result.rows[0]) : undefined;
  }

  async close() {
    await this.pool.end();
  }

  private async ensureSchema() {
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    this.migrationPromise ??= this.pool.query(seoOptimizationMigrationSql).then(() => undefined);
    await this.migrationPromise;
  }

  private async insertSuggestion(
    client: Pick<Pool, 'query'>,
    siteId: string,
    input: CreateSuggestionInput,
    auditIssueId?: string
  ) {
    await client.query(
      `
        DELETE FROM optimization_suggestions
        WHERE site_id = $1
          AND target_type = $2
          AND target_cms_id = $3
          AND field_name = $4
          AND suggestion_type = $5
          AND status != 'applied'
      `,
      [siteId, input.targetType, input.targetCmsId, input.fieldName, input.suggestionType]
    );

    return client.query(
      `
        INSERT INTO optimization_suggestions (
          id, site_id, audit_issue_id, target_type, target_cms_id, suggestion_type,
          field_name, status, current_value, suggested_value, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        siteId,
        auditIssueId ?? null,
        input.targetType,
        input.targetCmsId,
        input.suggestionType,
        input.fieldName,
        input.currentValue ?? null,
        input.suggestedValue,
        input.metadata ? JSON.stringify(input.metadata) : null
      ]
    );
  }
}

function createSuggestionFromIssue(siteId: string, issue: SeoAuditIssue): OptimizationSuggestion {
  return createSuggestion(
    siteId,
    {
      targetType: issue.targetType,
      targetCmsId: issue.targetCmsId,
      suggestionType: toSuggestionType(issue),
      fieldName: issue.fieldName,
      currentValue: issue.currentValue,
      suggestedValue: issue.suggestedValue ?? issue.message
    },
    issue.id
  );
}

function createSuggestion(
  siteId: string,
  input: CreateSuggestionInput,
  auditIssueId?: string
): OptimizationSuggestion {
  return {
    id: crypto.randomUUID(),
    siteId,
    auditIssueId,
    targetType: input.targetType,
    targetCmsId: input.targetCmsId,
    suggestionType: input.suggestionType,
    fieldName: input.fieldName,
    status: 'pending',
    currentValue: input.currentValue,
    suggestedValue: input.suggestedValue,
    metadata: input.metadata,
    createdAt: new Date().toISOString()
  };
}

export function createDefaultSeoOptimizationRepository(databaseUrl?: string): SeoOptimizationRepository {
  return databaseUrl
    ? new PostgresSeoOptimizationRepository(databaseUrl)
    : createInMemorySeoOptimizationRepository();
}

function validationError(reply: FastifyReply, error: z.ZodError) {
  return reply.status(400).send({
    success: false,
    message: '請求資料格式不正確',
    error: {
      code: 'VALIDATION_ERROR',
      details: error.issues
    }
  });
}

async function ensureSiteTokenAccess(
  repository: SiteConnectionRepository,
  request: FastifyRequest,
  reply: FastifyReply,
  siteId: string
) {
  const site = await repository.find(siteId);
  if (!site) {
    reply.status(404).send({
      success: false,
      message: '找不到站點連接',
      error: {
        code: 'SITE_NOT_FOUND'
      }
    });
    return undefined;
  }

  if (!(await repository.verifyToken(site.id, getBearerToken(request)))) {
    reply.status(401).send({
      success: false,
      message: '站點 Token 無效',
      error: {
        code: 'SITE_TOKEN_INVALID'
      }
    });
    return undefined;
  }

  return site;
}

async function ensureSiteTokenOrWorkspaceAccess(
  repository: SiteConnectionRepository,
  authService: AuthService,
  request: FastifyRequest,
  reply: FastifyReply,
  siteId: string
) {
  const site = await repository.find(siteId);
  if (!site) {
    reply.status(404).send({
      success: false,
      message: '找不到站點連接',
      error: {
        code: 'SITE_NOT_FOUND'
      }
    });
    return undefined;
  }

  if (await repository.verifyToken(site.id, getBearerToken(request))) {
    return site;
  }

  const user = await requireAuth(authService, request, reply);
  if (!user) {
    return undefined;
  }

  if (site.workspaceId !== user.workspaceId) {
    reply.status(404).send({
      success: false,
      message: '找不到站點連接',
      error: {
        code: 'SITE_NOT_FOUND'
      }
    });
    return undefined;
  }

  return site;
}

async function listAllArticlesForAudit(siteRepository: SiteConnectionRepository, siteId: string) {
  const articles: SyncedArticle[] = [];
  let page = 1;

  while (true) {
    const result = await siteRepository.listArticles(siteId, {
      page,
      pageSize: auditBatchSize
    });
    articles.push(...result.items);

    if (page >= result.pagination.totalPages) {
      break;
    }

    page += 1;
  }

  return articles;
}

async function listAllMediaForAudit(siteRepository: SiteConnectionRepository, siteId: string) {
  const media: SyncedMedia[] = [];
  let page = 1;

  while (true) {
    const result = await siteRepository.listMedia(siteId, {
      page,
      pageSize: auditBatchSize
    });
    media.push(...result.items);

    if (page >= result.pagination.totalPages) {
      break;
    }

    page += 1;
  }

  return media;
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeContent(value: string) {
  const normalized = stripHtml(value)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ');
  const latinTokens = normalized.match(/[a-z0-9][a-z0-9-]{2,}/g) ?? [];
  const cjkTokens = normalized.match(/[\u3400-\u9fff]{2,}/g) ?? [];

  return new Set([...latinTokens, ...cjkTokens].filter((token) => token.length >= 2));
}

function getArticleSearchText(article: SyncedArticle) {
  return [
    article.title,
    article.excerpt ?? '',
    article.metaDescription ?? '',
    article.categories.join(' '),
    article.tags.join(' '),
    article.contentHtml ?? ''
  ].join(' ');
}

function normalizeUrlForInternalLink(value: string, baseUrl?: string) {
  try {
    const url = new URL(value, baseUrl);
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, '') || '/'}`;
  } catch {
    return value.trim().replace(/\/+$/, '');
  }
}

function sourceAlreadyLinksToTarget(sourceHtml: string, targetUrl: string, sourceUrl: string) {
  const target = normalizeUrlForInternalLink(targetUrl);
  const hrefPattern = /<a\b[^>]*\bhref=["']([^"']+)["']/gi;

  for (const match of sourceHtml.matchAll(hrefPattern)) {
    const href = match[1] ?? '';
    if (normalizeUrlForInternalLink(href, sourceUrl) === target) {
      return true;
    }
  }

  return false;
}

function getInternalLinkRelevance(source: SyncedArticle, target: SyncedArticle) {
  const sourceTokens = tokenizeContent(getArticleSearchText(source));
  const targetTokens = tokenizeContent(getArticleSearchText(target));
  if (sourceTokens.size === 0 || targetTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of targetTokens) {
    if (sourceTokens.has(token)) {
      overlap += 1;
    }
  }

  const denominator = Math.max(4, Math.min(sourceTokens.size, targetTokens.size));
  const typeBoost = source.type !== target.type ? 8 : 4;
  const titleBoost = source.title.toLowerCase().includes(target.title.toLowerCase().slice(0, 12)) ? 8 : 0;

  return Math.min(98, Math.round((overlap / denominator) * 75 + typeBoost + titleBoost));
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildAnchorText(target: SyncedArticle) {
  const title = stripHtml(target.title).replace(/\s+/g, ' ').trim();
  return title.length > 90 ? title.slice(0, 90).trim() : title;
}

function appendInternalLink(contentHtml: string, targetUrl: string, anchorText: string) {
  const safeUrl = escapeHtmlAttribute(targetUrl);
  const safeAnchor = escapeHtmlText(anchorText);
  const linkBlock = `<p data-rankwoven-internal-link="true">延伸閱讀：<a href="${safeUrl}">${safeAnchor}</a></p>`;
  const trimmedContent = contentHtml.trim();

  return trimmedContent === '' ? linkBlock : `${trimmedContent}\n${linkBlock}`;
}

function getInternalLinkReason(source: SyncedArticle, target: SyncedArticle, relevance: number) {
  if (target.type === 'product') {
    return `目標商品與「${source.title}」內容語義相關，可把讀者導向可轉化頁面。`;
  }

  if (target.type === 'portfolio') {
    return `目標作品案例可補充「${source.title}」的實例證明，相關性 ${relevance}%。`;
  }

  return `兩個頁面有重疊主題與關鍵詞，可補強站內主題集群，相關性 ${relevance}%。`;
}

function buildInternalLinkSuggestions(articles: SyncedArticle[], limit: number) {
  const candidates: CreateSuggestionInput[] = [];
  const linkableArticles = articles.filter((article) =>
    article.cmsId.trim() !== '' &&
    article.title.trim() !== '' &&
    article.url.trim() !== ''
  );

  for (const source of linkableArticles) {
    const sourceHtml = source.contentHtml ?? '';
    const bestTarget = linkableArticles
      .filter((target) => target.cmsId !== source.cmsId)
      .filter((target) => !sourceAlreadyLinksToTarget(sourceHtml, target.url, source.url))
      .map((target) => ({
        target,
        relevance: getInternalLinkRelevance(source, target)
      }))
      .filter((candidate) => candidate.relevance >= 18)
      .sort((left, right) => right.relevance - left.relevance)[0];

    if (!bestTarget) {
      continue;
    }

    const anchorText = buildAnchorText(bestTarget.target);
    if (anchorText === '') {
      continue;
    }

    const suggestedValue = appendInternalLink(sourceHtml, bestTarget.target.url, anchorText);
    candidates.push({
      targetType: 'article',
      targetCmsId: source.cmsId,
      suggestionType: 'internal_link',
      fieldName: 'contentHtml',
      currentValue: sourceHtml,
      suggestedValue,
      metadata: {
        sourceCmsId: source.cmsId,
        sourceTitle: source.title,
        sourceType: source.type,
        sourceUrl: source.url,
        targetCmsId: bestTarget.target.cmsId,
        targetTitle: bestTarget.target.title,
        targetType: bestTarget.target.type,
        targetUrl: bestTarget.target.url,
        anchorText,
        relevance: bestTarget.relevance,
        reason: getInternalLinkReason(source, bestTarget.target, bestTarget.relevance)
      }
    });
  }

  return candidates
    .sort((left, right) => {
      const leftScore = Number(left.metadata?.relevance ?? 0);
      const rightScore = Number(right.metadata?.relevance ?? 0);
      return rightScore - leftScore;
    })
    .slice(0, limit);
}

export function registerSeoOptimizationRoutes(
  app: FastifyInstance,
  siteRepository: SiteConnectionRepository,
  seoRepository: SeoOptimizationRepository,
  authService: AuthService,
  textProvider?: TextGenerationProvider
) {
  app.addHook('onClose', async () => {
    await seoRepository.close?.();
  });

  app.post<{ Params: { siteId: string } }>(
    '/api/v1/site-connections/:siteId/audits',
    async (request, reply) => {
      const site = await ensureSiteTokenOrWorkspaceAccess(
        siteRepository,
        authService,
        request,
        reply,
        request.params.siteId
      );
      if (!site) {
        return reply;
      }

      const articles = await listAllArticlesForAudit(siteRepository, site.id);
      const media = await listAllMediaForAudit(siteRepository, site.id);
      const issues = await buildSeoIssues(articles, media, {
        siteId: site.id,
        userId: site.id,
        locale: 'zh-Hant',
        textProvider
      });
      const score = Math.max(0, 100 - issues.length * 8);
      const result = await seoRepository.saveAudit(
        site.id,
        {
          status: 'completed',
          score,
          rulesVersion: defaultRulesVersion
        },
        issues
      );

      return reply.status(201).send({
        success: true,
        message: 'SEO 審計已完成',
        data: result
      });
    }
  );

  app.get<{ Params: { siteId: string } }>(
    '/api/v1/site-connections/:siteId/audits',
    async (request, reply) => {
      const site = await ensureSiteTokenOrWorkspaceAccess(
        siteRepository,
        authService,
        request,
        reply,
        request.params.siteId
      );
      if (!site) {
        return reply;
      }

      const audits = await seoRepository.listAudits(site.id);
      const latestAudit = audits[0];

      return {
        success: true,
        message: '操作成功',
        data: {
          audits,
          issues: latestAudit ? await seoRepository.listIssues(latestAudit.id) : []
        }
      };
    }
  );

  app.post<{ Params: { siteId: string } }>(
    '/api/v1/site-connections/:siteId/editor-seo',
    async (request, reply) => {
      const site = await ensureSiteTokenAccess(siteRepository, request, reply, request.params.siteId);
      if (!site) {
        return reply;
      }

      const parsed = editorSeoGenerationSchema.safeParse(request.body);
      if (!parsed.success) {
        return validationError(reply, parsed.error);
      }

      const generated = parsed.data.mode === 'generate'
        ? await generateEditorSeoSuggestion(textProvider, {
            siteId: site.id,
            userId: site.id,
            ...parsed.data
          })
        : analyzeCurrentEditorSeo(parsed.data);

      return {
        success: true,
        message: parsed.data.mode === 'generate' ? 'SEO 建議已生成' : 'SEO 分析已完成',
        data: {
          ...generated,
          mode: parsed.data.mode,
          postType: parsed.data.postType,
          focusKeyphrase: parsed.data.focusKeyphrase
        }
      };
    }
  );

  app.post<{ Params: { siteId: string } }>(
    '/api/v1/site-connections/:siteId/internal-links/generate',
    async (request, reply) => {
      const user = await requireAuth(authService, request, reply);
      if (!user) {
        return reply;
      }

      const site = await siteRepository.findForWorkspace(request.params.siteId, user.workspaceId);
      if (!site) {
        return reply.status(404).send({
          success: false,
          message: '找不到站點連接',
          error: { code: 'SITE_NOT_FOUND' }
        });
      }

      const parsed = internalLinkGenerationSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return validationError(reply, parsed.error);
      }

      const articles = await listAllArticlesForAudit(siteRepository, site.id);
      const inputs = buildInternalLinkSuggestions(articles, parsed.data.limit);
      const suggestions: OptimizationSuggestion[] = [];

      for (const input of inputs) {
        suggestions.push(await seoRepository.createSuggestion(site.id, input));
      }

      return reply.status(201).send({
        success: true,
        message: `已生成 ${suggestions.length} 個內部連結建議`,
        data: {
          suggestions,
          generated: suggestions.length,
          articlesScanned: articles.length
        }
      });
    }
  );

  app.get<{
    Params: { siteId: string };
    Querystring: {
      targetType?: TargetType;
      targetCmsIds?: string | string[];
      limit?: number;
    };
  }>(
    '/api/v1/site-connections/:siteId/suggestions',
    async (request, reply) => {
      const site = await ensureSiteTokenOrWorkspaceAccess(
        siteRepository,
        authService,
        request,
        reply,
        request.params.siteId
      );
      if (!site) {
        return reply;
      }

      const parsedQuery = listSuggestionsQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return validationError(reply, parsedQuery.error);
      }

      const audits = await seoRepository.listAudits(site.id);
      const latestAudit = audits[0];
      const latestIssues = latestAudit ? await seoRepository.listIssues(latestAudit.id) : [];

      return {
        success: true,
        message: '操作成功',
        data: {
          suggestions: await seoRepository.listSuggestions(site.id, parsedQuery.data),
          latestAudit: summarizeAudit(latestAudit, latestIssues)
        }
      };
    }
  );

  app.get<{ Params: { siteId: string } }>(
    '/api/v1/site-connections/:siteId/apply-queue',
    async (request, reply) => {
      const site = await ensureSiteTokenOrWorkspaceAccess(
        siteRepository,
        authService,
        request,
        reply,
        request.params.siteId
      );
      if (!site) {
        return reply;
      }

      const [suggestions, tasks, snapshots] = await Promise.all([
        seoRepository.listSuggestions(site.id),
        siteRepository.listSyncTasks({ siteId: site.id }),
        seoRepository.listApplySnapshots(site.id)
      ]);

      return {
        success: true,
        message: '操作成功',
        data: {
          site,
          suggestions: suggestions.filter((suggestion) =>
            ['approved', 'applied', 'failed'].includes(suggestion.status)
          ),
          tasks: tasks.filter((task) =>
            task.scope === 'suggestion_apply' || task.scope === 'suggestion_rollback'
          ),
          snapshots
        }
      };
    }
  );

  app.post<{ Params: { siteId: string } }>(
    '/api/v1/site-connections/:siteId/suggestions',
    async (request, reply) => {
      const user = await requireAuth(authService, request, reply);
      if (!user) {
        return reply;
      }

      const site = await siteRepository.findForWorkspace(request.params.siteId, user.workspaceId);
      if (!site) {
        return reply.status(404).send({
          success: false,
          message: '找不到站點連接',
          error: { code: 'SITE_NOT_FOUND' }
        });
      }

      const parsed = createSuggestionSchema.safeParse(request.body);
      if (!parsed.success) {
        return validationError(reply, parsed.error);
      }

      const suggestedValue = parsed.data.targetType === 'media'
        ? normalizeMediaSuggestionValue(parsed.data.fieldName, parsed.data.suggestedValue)
        : parsed.data.suggestedValue;
      if (suggestedValue === '') {
        return reply.status(422).send({
          success: false,
          message: '媒體建議內容不能只包含代碼',
          error: { code: 'MEDIA_SUGGESTION_EMPTY_AFTER_FILTER' }
        });
      }

      const suggestion = await seoRepository.createSuggestion(site.id, {
        ...parsed.data,
        suggestedValue
      });

      return reply.status(201).send({
        success: true,
        message: '建議已建立',
        data: { suggestion }
      });
    }
  );

  app.put<{ Params: { siteId: string; suggestionId: string } }>(
    '/api/v1/site-connections/:siteId/suggestions/:suggestionId',
    async (request, reply) => {
      const user = await requireAuth(authService, request, reply);
      if (!user) {
        return reply;
      }

      const site = await siteRepository.findForWorkspace(request.params.siteId, user.workspaceId);
      if (!site) {
        return reply.status(404).send({
          success: false,
          message: '找不到站點連接',
          error: { code: 'SITE_NOT_FOUND' }
        });
      }

      const parsed = updateSuggestionSchema.safeParse(request.body);
      if (!parsed.success) {
        return validationError(reply, parsed.error);
      }

      const existingSuggestion = await seoRepository.findSuggestion(site.id, request.params.suggestionId);
      if (!existingSuggestion) {
        return reply.status(404).send({
          success: false,
          message: '找不到優化建議',
          error: { code: 'SUGGESTION_NOT_FOUND' }
        });
      }

      const suggestedValue = existingSuggestion.targetType === 'media'
        ? normalizeMediaSuggestionValue(existingSuggestion.fieldName, parsed.data.suggestedValue)
        : parsed.data.suggestedValue;
      if (suggestedValue === '') {
        return reply.status(422).send({
          success: false,
          message: '媒體建議內容不能只包含代碼',
          error: { code: 'MEDIA_SUGGESTION_EMPTY_AFTER_FILTER' }
        });
      }

      const suggestion = await seoRepository.updateSuggestion(
        site.id,
        request.params.suggestionId,
        suggestedValue
      );

      return {
        success: true,
        message: '建議已更新',
        data: { suggestion }
      };
    }
  );

  app.post<{ Params: { siteId: string; suggestionId: string } }>(
    '/api/v1/site-connections/:siteId/suggestions/:suggestionId/approve',
    async (request, reply) => {
      const site = await ensureSiteTokenOrWorkspaceAccess(
        siteRepository,
        authService,
        request,
        reply,
        request.params.siteId
      );
      if (!site) {
        return reply;
      }

      const existingSuggestion = await seoRepository.findSuggestion(site.id, request.params.suggestionId);
      if (!existingSuggestion) {
        return reply.status(404).send({
          success: false,
          message: '找不到優化建議',
          error: { code: 'SUGGESTION_NOT_FOUND' }
        });
      }

      const normalizedSuggestion = await normalizeStoredMediaSuggestion(
        seoRepository,
        site.id,
        existingSuggestion
      );
      if (!normalizedSuggestion) {
        return reply.status(422).send({
          success: false,
          message: '媒體建議內容不能只包含代碼',
          error: { code: 'MEDIA_SUGGESTION_EMPTY_AFTER_FILTER' }
        });
      }

      const suggestion = await seoRepository.approveSuggestion(site.id, normalizedSuggestion.id);
      if (!suggestion) {
        return reply.status(404).send({
          success: false,
          message: '找不到優化建議',
          error: { code: 'SUGGESTION_NOT_FOUND' }
        });
      }

      return {
        success: true,
        message: '建議已批准',
        data: { suggestion }
      };
    }
  );

  app.post<{ Params: { siteId: string }; Body: { suggestionIds: string[] } }>(
    '/api/v1/site-connections/:siteId/suggestions/batch-approve',
    async (request, reply) => {
      const site = await ensureSiteTokenOrWorkspaceAccess(
        siteRepository,
        authService,
        request,
        reply,
        request.params.siteId
      );
      if (!site) {
        return reply;
      }

      const { suggestionIds } = request.body;

      if (!Array.isArray(suggestionIds) || suggestionIds.length === 0) {
        return reply.status(400).send({
          success: false,
          message: '請提供至少一個建議 ID',
          error: { code: 'INVALID_INPUT' }
        });
      }

      const results: Array<{
        suggestionId: string;
        success: boolean;
        error?: string;
      }> = [];

      for (const suggestionId of suggestionIds) {
        try {
          const existingSuggestion = await seoRepository.findSuggestion(site.id, suggestionId);
          if (!existingSuggestion) {
            results.push({ suggestionId, success: false, error: 'SUGGESTION_NOT_FOUND' });
            continue;
          }

          const normalizedSuggestion = await normalizeStoredMediaSuggestion(
            seoRepository,
            site.id,
            existingSuggestion
          );
          if (!normalizedSuggestion) {
            results.push({ suggestionId, success: false, error: 'MEDIA_SUGGESTION_EMPTY_AFTER_FILTER' });
            continue;
          }

          const suggestion = await seoRepository.approveSuggestion(site.id, normalizedSuggestion.id);
          results.push({
            suggestionId,
            success: Boolean(suggestion),
            error: suggestion ? undefined : 'SUGGESTION_NOT_FOUND'
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
          results.push({ suggestionId, success: false, error: message });
        }
      }

      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return {
        success: true,
        message: `批量批准完成：${succeeded} 個成功，${failed} 個失敗`,
        data: {
          results,
          total: suggestionIds.length,
          succeeded,
          failed
        }
      };
    }
  );

  app.post<{ Params: { siteId: string; suggestionId: string } }>(
    '/api/v1/site-connections/:siteId/suggestions/:suggestionId/apply',
    async (request, reply) => {
      const site = await ensureSiteTokenOrWorkspaceAccess(
        siteRepository,
        authService,
        request,
        reply,
        request.params.siteId
      );
      if (!site) {
        return reply;
      }

      let suggestion = await seoRepository.findSuggestion(site.id, request.params.suggestionId);
      if (!suggestion) {
        return reply.status(404).send({
          success: false,
          message: '找不到優化建議',
          error: { code: 'SUGGESTION_NOT_FOUND' }
        });
      }

      if (suggestion.status !== 'approved') {
        return reply.status(409).send({
          success: false,
          message: '只有已批准的建議可以寫回 WordPress',
          error: { code: 'SUGGESTION_NOT_APPROVED' }
        });
      }

      suggestion = await normalizeStoredMediaSuggestion(seoRepository, site.id, suggestion);
      if (!suggestion) {
        return reply.status(422).send({
          success: false,
          message: '媒體建議內容不能只包含代碼',
          error: { code: 'MEDIA_SUGGESTION_EMPTY_AFTER_FILTER' }
        });
      }

      const snapshot = await seoRepository.createApplySnapshot(site.id, suggestion);
      const task = await siteRepository.createSyncTask(site.id, {
        scope: 'suggestion_apply',
        targetCmsId: suggestion.targetCmsId,
        suggestionId: suggestion.id,
        applySnapshotId: snapshot.id
      });

      if (!task) {
        await seoRepository.markApplySnapshotFailed(snapshot.id, 'SITE_NOT_FOUND');
        return reply.status(404).send({
          success: false,
          message: '找不到站點連接',
          error: { code: 'SITE_NOT_FOUND' }
        });
      }

      const updatedSnapshot = await seoRepository.attachSnapshotTask(snapshot.id, task.id);
      const updatedSuggestion = await seoRepository.markSuggestionApplyQueued(site.id, suggestion.id, task.id);

      return reply.status(201).send({
        success: true,
        message: '寫回任務已建立',
        data: {
          suggestion: updatedSuggestion,
          snapshot: updatedSnapshot ?? snapshot,
          task
        }
      });
    }
  );

  app.post<{ Params: { siteId: string }; Body: { suggestionIds: string[] } }>(
    '/api/v1/site-connections/:siteId/suggestions/batch-apply',
    async (request, reply) => {
      const site = await ensureSiteTokenOrWorkspaceAccess(
        siteRepository,
        authService,
        request,
        reply,
        request.params.siteId
      );
      if (!site) {
        return reply;
      }

      const { suggestionIds } = request.body;

      if (!Array.isArray(suggestionIds) || suggestionIds.length === 0) {
        return reply.status(400).send({
          success: false,
          message: '請提供至少一個建議 ID',
          error: { code: 'INVALID_INPUT' }
        });
      }

      const results: Array<{
        suggestionId: string;
        success: boolean;
        taskId?: string;
        error?: string;
      }> = [];

      for (const suggestionId of suggestionIds) {
        try {
          let suggestion = await seoRepository.findSuggestion(site.id, suggestionId);
          if (!suggestion) {
            results.push({ suggestionId, success: false, error: 'SUGGESTION_NOT_FOUND' });
            continue;
          }

          if (suggestion.status !== 'approved') {
            results.push({ suggestionId, success: false, error: 'SUGGESTION_NOT_APPROVED' });
            continue;
          }

          suggestion = await normalizeStoredMediaSuggestion(seoRepository, site.id, suggestion);
          if (!suggestion) {
            results.push({ suggestionId, success: false, error: 'MEDIA_SUGGESTION_EMPTY_AFTER_FILTER' });
            continue;
          }

          const snapshot = await seoRepository.createApplySnapshot(site.id, suggestion);
          const task = await siteRepository.createSyncTask(site.id, {
            scope: 'suggestion_apply',
            targetCmsId: suggestion.targetCmsId,
            suggestionId: suggestion.id,
            applySnapshotId: snapshot.id
          });

          if (!task) {
            await seoRepository.markApplySnapshotFailed(snapshot.id, 'SITE_NOT_FOUND');
            results.push({ suggestionId, success: false, error: 'TASK_CREATION_FAILED' });
            continue;
          }

          await seoRepository.attachSnapshotTask(snapshot.id, task.id);
          await seoRepository.markSuggestionApplyQueued(site.id, suggestion.id, task.id);

          results.push({ suggestionId, success: true, taskId: task.id });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
          results.push({ suggestionId, success: false, error: message });
        }
      }

      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return reply.status(201).send({
        success: true,
        message: `批量寫回完成：${succeeded} 個成功，${failed} 個失敗`,
        data: {
          results,
          total: suggestionIds.length,
          succeeded,
          failed
        }
      });
    }
  );

  app.post<{ Params: { siteId: string; snapshotId: string } }>(
    '/api/v1/site-connections/:siteId/apply-snapshots/:snapshotId/rollback',
    async (request, reply) => {
      const site = await ensureSiteTokenOrWorkspaceAccess(
        siteRepository,
        authService,
        request,
        reply,
        request.params.siteId
      );
      if (!site) {
        return reply;
      }

      const snapshot = await seoRepository.findApplySnapshot(site.id, request.params.snapshotId);
      if (!snapshot) {
        return reply.status(404).send({
          success: false,
          message: '找不到寫回快照',
          error: { code: 'APPLY_SNAPSHOT_NOT_FOUND' }
        });
      }

      if (snapshot.status !== 'applied') {
        return reply.status(409).send({
          success: false,
          message: '只有已套用快照可以建立回滾任務',
          error: { code: 'APPLY_SNAPSHOT_NOT_APPLIED' }
        });
      }

      const task = await siteRepository.createSyncTask(site.id, {
        scope: 'suggestion_rollback',
        targetCmsId: snapshot.targetCmsId,
        suggestionId: snapshot.suggestionId,
        applySnapshotId: snapshot.id
      });

      if (!task) {
        return reply.status(404).send({
          success: false,
          message: '找不到站點連接',
          error: { code: 'SITE_NOT_FOUND' }
        });
      }

      const updatedSnapshot = await seoRepository.attachSnapshotTask(snapshot.id, task.id);

      return reply.status(201).send({
        success: true,
        message: '回滾任務已建立',
        data: {
          snapshot: updatedSnapshot,
          task
        }
      });
    }
  );
}
