import type { FastifyInstance, FastifyReply } from 'fastify';
import { Pool, type QueryResultRow } from 'pg';
import { z } from 'zod';
import { requireAuth, type AuthService } from './auth';
import type {
  SiteConnectionRepository,
  SyncedArticle,
  SyncedMedia
} from './siteConnections';

type TargetType = 'article' | 'media';
type SuggestionStatus = 'pending' | 'approved' | 'applied' | 'failed' | 'rejected';
type SuggestionType = 'title' | 'meta_description' | 'content' | 'media_alt_text' | 'media_file_name' | 'internal_link';
type IssueSeverity = 'low' | 'medium' | 'high';

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
  errorMessage?: string;
}

export interface CreateSuggestionInput {
  targetType: TargetType;
  targetCmsId: string;
  suggestionType: SuggestionType;
  fieldName: string;
  currentValue?: string;
  suggestedValue: string;
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
  listSuggestions(siteId: string): Promise<OptimizationSuggestion[]>;
  findSuggestion(siteId: string, suggestionId: string): Promise<OptimizationSuggestion | undefined>;
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
    'media_alt_text',
    'media_file_name',
    'internal_link'
  ]),
  fieldName: z.string().trim().min(1).max(80),
  currentValue: z.string().max(20_000).optional(),
  suggestedValue: z.string().trim().min(1).max(20_000)
});

const defaultRulesVersion = '2026-07-26.mvp-1';
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
    suggestion_type IN ('title', 'meta_description', 'content', 'media_alt_text', 'media_file_name', 'internal_link')
  ),
  field_name varchar(80) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'applied', 'failed', 'rejected')),
  current_value text,
  suggested_value text NOT NULL,
  error_message text,
  apply_task_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  applied_at timestamptz
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
    suggestedValue: row.suggested_value,
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
    errorMessage: row.error_message ?? undefined
  };
}

function buildSeoIssues(articles: SyncedArticle[], media: SyncedMedia[]) {
  const issues: Array<Omit<SeoAuditIssue, 'id' | 'auditId' | 'siteId' | 'createdAt'>> = [];

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
        suggestedValue: '補充 2-3 個與主題相關的站內連結',
        fieldName: 'contentHtml'
      });
    }
  }

  for (const mediaItem of media) {
    if (!mediaItem.altText?.trim()) {
      issues.push({
        targetType: 'media',
        targetCmsId: mediaItem.cmsId,
        ruleCode: 'MEDIA_ALT_TEXT_MISSING',
        severity: 'high',
        message: '圖片缺少 Alt Text',
        currentValue: '',
        suggestedValue: normalizeImageText(mediaItem.title || mediaItem.fileName || '圖片說明'),
        fieldName: 'altText'
      });
    }

    if (mediaItem.fileName && !/^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+$/i.test(mediaItem.fileName)) {
      issues.push({
        targetType: 'media',
        targetCmsId: mediaItem.cmsId,
        ruleCode: 'MEDIA_FILE_NAME_FORMAT',
        severity: 'medium',
        message: '圖片檔名不利於搜尋引擎理解',
        currentValue: mediaItem.fileName,
        suggestedValue: normalizeFileName(mediaItem.fileName),
        fieldName: 'fileName'
      });
    }
  }

  return issues;
}

function normalizeTitleSuggestion(title: string) {
  const trimmed = title.trim();
  if (trimmed.length >= 25 && trimmed.length <= 65) {
    return trimmed;
  }

  return trimmed.length < 25 ? `${trimmed} 完整指南` : trimmed.slice(0, 62).trim();
}

function normalizeMetaDescriptionSuggestion(article: SyncedArticle) {
  const sourceText = article.excerpt?.trim() || article.title.trim();
  const normalized = sourceText.replace(/\s+/g, ' ');

  if (normalized.length > 155) {
    return `${normalized.slice(0, 152).trim()}...`;
  }

  if (normalized.length >= 70) {
    return normalized;
  }

  return `${normalized}，了解重點做法、常見問題與可立即套用的 SEO 優化建議。`;
}

function normalizeImageText(value: string) {
  return value
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function toSuggestionType(issue: Omit<SeoAuditIssue, 'id' | 'auditId' | 'siteId' | 'createdAt'>): SuggestionType {
  if (issue.ruleCode === 'MEDIA_ALT_TEXT_MISSING') {
    return 'media_alt_text';
  }

  if (issue.ruleCode === 'MEDIA_FILE_NAME_FORMAT') {
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
      const suggestion = createSuggestion(siteId, input, auditIssueId);
      suggestions.set(suggestion.id, suggestion);
      return suggestion;
    },
    async listSuggestions(siteId) {
      return Array.from(suggestions.values())
        .filter((suggestion) => suggestion.siteId === siteId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
    async findSuggestion(siteId, suggestionId) {
      const suggestion = suggestions.get(suggestionId);
      return suggestion?.siteId === siteId ? suggestion : undefined;
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

  async listSuggestions(siteId: string) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        SELECT *
        FROM optimization_suggestions
        WHERE site_id = $1
        ORDER BY created_at DESC
        LIMIT 200
      `,
      [siteId]
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
    this.migrationPromise ??= this.pool.query(seoOptimizationMigrationSql).then(() => undefined);
    await this.migrationPromise;
  }

  private async insertSuggestion(
    client: Pick<Pool, 'query'>,
    siteId: string,
    input: CreateSuggestionInput,
    auditIssueId?: string
  ) {
    return client.query(
      `
        INSERT INTO optimization_suggestions (
          id, site_id, audit_issue_id, target_type, target_cms_id, suggestion_type,
          field_name, status, current_value, suggested_value
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)
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
        input.suggestedValue
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

export function registerSeoOptimizationRoutes(
  app: FastifyInstance,
  siteRepository: SiteConnectionRepository,
  seoRepository: SeoOptimizationRepository,
  authService: AuthService
) {
  app.addHook('onClose', async () => {
    await seoRepository.close?.();
  });

  app.post<{ Params: { siteId: string } }>(
    '/api/v1/site-connections/:siteId/audits',
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

      const articles = await listAllArticlesForAudit(siteRepository, site.id);
      const media = await listAllMediaForAudit(siteRepository, site.id);
      const issues = buildSeoIssues(articles, media);
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

  app.get<{ Params: { siteId: string } }>(
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

      const audits = await seoRepository.listAudits(site.id);
      const latestAudit = audits[0];
      const latestIssues = latestAudit ? await seoRepository.listIssues(latestAudit.id) : [];

      return {
        success: true,
        message: '操作成功',
        data: {
          suggestions: await seoRepository.listSuggestions(site.id),
          latestAudit: summarizeAudit(latestAudit, latestIssues)
        }
      };
    }
  );

  app.get<{ Params: { siteId: string } }>(
    '/api/v1/site-connections/:siteId/apply-queue',
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

      const [suggestions, tasks, snapshots] = await Promise.all([
        seoRepository.listSuggestions(site.id),
        siteRepository.listSyncTasks(site.id, user.workspaceId),
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

      const suggestion = await seoRepository.createSuggestion(site.id, parsed.data);

      return reply.status(201).send({
        success: true,
        message: '建議已建立',
        data: { suggestion }
      });
    }
  );

  app.post<{ Params: { siteId: string; suggestionId: string } }>(
    '/api/v1/site-connections/:siteId/suggestions/:suggestionId/approve',
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

      const suggestion = await seoRepository.approveSuggestion(site.id, request.params.suggestionId);
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

  app.post<{ Params: { siteId: string; suggestionId: string } }>(
    '/api/v1/site-connections/:siteId/suggestions/:suggestionId/apply',
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

      const suggestion = await seoRepository.findSuggestion(site.id, request.params.suggestionId);
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

  app.post<{ Params: { siteId: string; snapshotId: string } }>(
    '/api/v1/site-connections/:siteId/apply-snapshots/:snapshotId/rollback',
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
