import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { z } from 'zod';
import { getBearerToken, requireAuth, type AuthService } from './auth';

const cmsPlatformSchema = z.enum(['wordpress', 'joomla', 'opencart']);

const createConnectionSchema = z.object({
  platform: cmsPlatformSchema.default('wordpress'),
  name: z.string().trim().min(1).max(160),
  siteUrl: z.url(),
  cmsVersion: z.string().trim().max(40).optional(),
  pluginVersion: z.string().trim().max(40).optional(),
  wordpressAdminUsername: z.string().trim().min(1).max(160).optional(),
  wordpressApplicationPassword: z.string().trim().min(1).max(240).optional()
}).superRefine((input, context) => {
  if (Boolean(input.wordpressAdminUsername) !== Boolean(input.wordpressApplicationPassword)) {
    context.addIssue({
      code: 'custom',
      message: 'WordPress 管理員用戶名和應用程式密碼必須同時提供',
      path: ['wordpressApplicationPassword']
    });
  }
});

const updateWordPressCredentialsSchema = z.object({
  wordpressAdminUsername: z.string().trim().min(1).max(160),
  wordpressApplicationPassword: z.string().trim().min(1).max(240)
});

const syncedArticleSchema = z.object({
  cmsId: z.string().trim().min(1).max(80),
  type: z.enum(['post', 'page']),
  title: z.string().trim().max(300),
  slug: z.string().trim().max(240),
  status: z.string().trim().max(40),
  url: z.url().or(z.literal('')),
  excerpt: z.string().max(2000).optional(),
  contentHtml: z.string().max(500_000).optional(),
  author: z.string().trim().max(160).optional(),
  categories: z.array(z.string().trim().max(160)).default([]),
  tags: z.array(z.string().trim().max(160)).default([]),
  featuredImageId: z.string().trim().max(80).optional(),
  publishedAt: z.string().trim().max(80).optional(),
  updatedAt: z.string().trim().max(80)
});

const syncedMediaSchema = z.object({
  cmsId: z.string().trim().min(1).max(80),
  title: z.string().trim().max(300),
  url: z.url().or(z.literal('')),
  mimeType: z.string().trim().max(120).optional(),
  fileName: z.string().trim().max(240).optional(),
  altText: z.string().trim().max(500).optional(),
  attachedToCmsId: z.string().trim().max(80).optional(),
  updatedAt: z.string().trim().max(80)
});

const syncPayloadSchema = z.object({
  syncStartedAt: z.string().trim().max(80).optional(),
  updatedAfter: z.string().trim().max(80).optional(),
  articles: z.array(syncedArticleSchema).max(1000).default([]),
  media: z.array(syncedMediaSchema).max(2000).default([])
});

const createSyncTaskSchema = z.object({
  syncStartedAt: z.string().trim().max(80).optional(),
  updatedAfter: z.string().trim().max(80).optional()
});

const manualRefreshTaskSchema = z.object({
  type: z.enum(['article', 'media']),
  cmsId: z.string().trim().min(1).max(80)
});

const syncBatchPayloadSchema = syncPayloadSchema.extend({
  batchIndex: z.number().int().min(1).max(1_000_000),
  isFinalBatch: z.boolean().default(false)
});

export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;
export type SyncedArticle = z.infer<typeof syncedArticleSchema>;
export type SyncedMedia = z.infer<typeof syncedMediaSchema>;
export type SyncPayload = z.infer<typeof syncPayloadSchema>;
export type ManualRefreshTaskInput = z.infer<typeof manualRefreshTaskSchema>;
export type CreateSyncTaskInput = z.infer<typeof createSyncTaskSchema> & {
  scope?: SyncTaskScope;
  targetCmsId?: string;
  suggestionId?: string;
};
export type SyncBatchPayload = z.infer<typeof syncBatchPayloadSchema>;
export type SiteConnectionStatus = 'connected' | 'revoked';
export type SyncTaskStatus = 'queued' | 'running' | 'completed' | 'failed';
export type SyncTaskScope = 'full' | 'incremental' | 'article' | 'media' | 'suggestion_apply';

export interface SiteConnection {
  id: string;
  workspaceId?: string;
  platform: CreateConnectionInput['platform'];
  name: string;
  siteUrl: string;
  cmsVersion?: string;
  pluginVersion?: string;
  status: SiteConnectionStatus;
  createdAt: string;
  lastTokenUsedAt?: string;
  lastSyncAt?: string;
  lastSyncStats?: {
    articlesReceived: number;
    mediaReceived: number;
  };
  tokenPreview: string;
  wordpressAdminUsername?: string;
  wordpressApplicationPasswordConfigured: boolean;
}

export interface SaveSyncResult {
  site: SiteConnection;
  articlesReceived: number;
  mediaReceived: number;
}

export interface SyncTask {
  id: string;
  siteId: string;
  siteName?: string;
  status: SyncTaskStatus;
  scope: SyncTaskScope;
  targetCmsId?: string;
  suggestionId?: string;
  errorMessage?: string;
  syncStartedAt?: string;
  updatedAfter?: string;
  batchesReceived: number;
  articlesReceived: number;
  mediaReceived: number;
  createdAt: string;
  completedAt?: string;
}

export interface SaveSyncBatchResult {
  site: SiteConnection;
  task: SyncTask;
  articlesReceived: number;
  mediaReceived: number;
}

export interface SiteConnectionRepository {
  create(input: CreateConnectionInput): Promise<{
    site: SiteConnection;
    apiToken: string;
  }>;
  list(workspaceId?: string): Promise<SiteConnection[]>;
  find(siteId: string): Promise<SiteConnection | undefined>;
  findForWorkspace(siteId: string, workspaceId: string): Promise<SiteConnection | undefined>;
  updateWordPressCredentials(
    siteId: string,
    credentials: WordPressCredentialsInput
  ): Promise<SiteConnection | undefined>;
  regenerateToken(siteId: string): Promise<{ site: SiteConnection; apiToken: string } | undefined>;
  revokeToken(siteId: string): Promise<SiteConnection | undefined>;
  verifyToken(siteId: string, apiToken: string): Promise<boolean>;
  saveSync(siteId: string, payload: SyncPayload): Promise<SaveSyncResult>;
  createSyncTask(siteId: string, input: CreateSyncTaskInput): Promise<SyncTask | undefined>;
  listSyncTasks(siteId?: string, workspaceId?: string): Promise<SyncTask[]>;
  getSyncTask(syncTaskId: string): Promise<SyncTask | undefined>;
  markSyncTaskRunning(syncTaskId: string): Promise<SyncTask | undefined>;
  markSyncTaskFailed(syncTaskId: string, errorMessage: string): Promise<SyncTask | undefined>;
  saveSyncBatch(
    siteId: string,
    syncTaskId: string,
    payload: SyncBatchPayload
  ): Promise<SaveSyncBatchResult | undefined>;
  listArticles(siteId: string): Promise<SyncedArticle[]>;
  listMedia(siteId: string): Promise<SyncedMedia[]>;
  getWordPressCredentials(siteId: string): Promise<WordPressCredentials | undefined>;
  close?(): Promise<void>;
}

interface InMemorySiteConnection extends SiteConnection {
  apiToken: string;
  wordpressApplicationPassword?: string;
}

type WordPressCredentialsInput = z.infer<typeof updateWordPressCredentialsSchema>;

export interface WordPressCredentials {
  site: SiteConnection;
  username: string;
  applicationPassword: string;
}

const defaultWorkspaceId = '00000000-0000-4000-8000-000000000001';

const siteConnectionMigrationSql = `
CREATE TABLE IF NOT EXISTS site_connections (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001',
  platform text NOT NULL CHECK (platform IN ('wordpress', 'joomla', 'opencart')),
  name varchar(160) NOT NULL,
  site_url text NOT NULL,
  cms_version varchar(40),
  plugin_version varchar(40),
  api_token_hash text NOT NULL UNIQUE,
  token_preview varchar(16) NOT NULL,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'revoked')),
  created_at timestamptz NOT NULL,
  last_token_used_at timestamptz,
  last_sync_at timestamptz,
  last_sync_stats jsonb,
  wordpress_admin_username varchar(160),
  wordpress_application_password_encrypted text
);

CREATE INDEX IF NOT EXISTS idx_site_connections_platform
  ON site_connections(platform);

ALTER TABLE site_connections
  ADD COLUMN IF NOT EXISTS workspace_id uuid NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

CREATE INDEX IF NOT EXISTS idx_site_connections_workspace
  ON site_connections(workspace_id, created_at DESC);

ALTER TABLE site_connections
  DROP CONSTRAINT IF EXISTS site_connections_status_check;

ALTER TABLE site_connections
  ADD CONSTRAINT site_connections_status_check
  CHECK (status IN ('connected', 'revoked'));

ALTER TABLE site_connections
  ADD COLUMN IF NOT EXISTS wordpress_admin_username varchar(160);

ALTER TABLE site_connections
  ADD COLUMN IF NOT EXISTS wordpress_application_password_encrypted text;

ALTER TABLE site_connections
  ADD COLUMN IF NOT EXISTS last_token_used_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_site_connections_last_token_used
  ON site_connections(last_token_used_at DESC);

CREATE TABLE IF NOT EXISTS sync_tasks (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  scope text NOT NULL DEFAULT 'full' CHECK (scope IN ('full', 'incremental', 'article', 'media', 'suggestion_apply')),
  target_cms_id varchar(80),
  suggestion_id uuid,
  sync_started_at varchar(80),
  updated_after varchar(80),
  batches_received integer NOT NULL DEFAULT 0,
  articles_received integer NOT NULL DEFAULT 0,
  media_received integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sync_tasks_site_created
  ON sync_tasks(site_id, created_at DESC);

ALTER TABLE sync_tasks
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'full';

ALTER TABLE sync_tasks
  ADD COLUMN IF NOT EXISTS target_cms_id varchar(80);

ALTER TABLE sync_tasks
  ADD COLUMN IF NOT EXISTS suggestion_id uuid;

ALTER TABLE sync_tasks
  ADD COLUMN IF NOT EXISTS error_message text;

ALTER TABLE sync_tasks
  DROP CONSTRAINT IF EXISTS sync_tasks_scope_check;

ALTER TABLE sync_tasks
  ADD CONSTRAINT sync_tasks_scope_check
  CHECK (scope IN ('full', 'incremental', 'article', 'media', 'suggestion_apply'));

CREATE TABLE IF NOT EXISTS sync_runs (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  task_id uuid REFERENCES sync_tasks(id) ON DELETE SET NULL,
  batch_index integer,
  sync_started_at varchar(80),
  updated_after varchar(80),
  completed_at timestamptz NOT NULL,
  articles_received integer NOT NULL DEFAULT 0,
  media_received integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_site_completed
  ON sync_runs(site_id, completed_at DESC);

ALTER TABLE sync_runs
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES sync_tasks(id) ON DELETE SET NULL;

ALTER TABLE sync_runs
  ADD COLUMN IF NOT EXISTS batch_index integer;

ALTER TABLE sync_runs
  ADD COLUMN IF NOT EXISTS updated_after varchar(80);

CREATE INDEX IF NOT EXISTS idx_sync_runs_task_batch
  ON sync_runs(task_id, batch_index);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_runs_unique_task_batch
  ON sync_runs(task_id, batch_index)
  WHERE task_id IS NOT NULL AND batch_index IS NOT NULL;

CREATE TABLE IF NOT EXISTS synced_articles (
  id bigserial PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  cms_id varchar(80) NOT NULL,
  type text NOT NULL CHECK (type IN ('post', 'page')),
  title varchar(300) NOT NULL,
  slug varchar(240) NOT NULL,
  status varchar(40) NOT NULL,
  url text NOT NULL DEFAULT '',
  excerpt text,
  content_html text,
  author varchar(160),
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  featured_image_id varchar(80),
  published_at varchar(80),
  cms_updated_at varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_id, cms_id)
);

CREATE INDEX IF NOT EXISTS idx_synced_articles_site_updated
  ON synced_articles(site_id, cms_updated_at DESC);

CREATE TABLE IF NOT EXISTS synced_media (
  id bigserial PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  cms_id varchar(80) NOT NULL,
  title varchar(300) NOT NULL,
  url text NOT NULL DEFAULT '',
  mime_type varchar(120),
  file_name varchar(240),
  alt_text varchar(500),
  attached_to_cms_id varchar(80),
  cms_updated_at varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_id, cms_id)
);

CREATE INDEX IF NOT EXISTS idx_synced_media_site_updated
  ON synced_media(site_id, cms_updated_at DESC);
`;

function generateSiteToken() {
  return `rw_${crypto.randomUUID().replaceAll('-', '')}`;
}

function getTokenPreview(apiToken: string) {
  return `${apiToken.slice(0, 8)}...`;
}

function hashSiteToken(apiToken: string) {
  return createHash('sha256').update(apiToken).digest('hex');
}

function getCredentialEncryptionKey() {
  const secret =
    process.env.WORDPRESS_CREDENTIAL_ENCRYPTION_KEY ??
    process.env.JWT_SECRET ??
    'rankwoven-local-development-key';

  return createHash('sha256').update(secret).digest();
}

function encryptWordPressCredential(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getCredentialEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url')
  ].join(':');
}

function decryptWordPressCredential(value: string) {
  const [version, iv, authTag, encrypted] = value.split(':');
  if (version !== 'v1' || !iv || !authTag || !encrypted) {
    throw new Error('WORDPRESS_CREDENTIAL_FORMAT_INVALID');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getCredentialEncryptionKey(),
    Buffer.from(iv, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

function toIsoString(value: unknown) {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function toLastSyncStats(value: unknown) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const stats = value as {
    articlesReceived?: unknown;
    mediaReceived?: unknown;
  };

  return {
    articlesReceived: Number(stats.articlesReceived ?? 0),
    mediaReceived: Number(stats.mediaReceived ?? 0)
  };
}

function toPublicConnection(connection: InMemorySiteConnection): SiteConnection {
  return {
    id: connection.id,
    workspaceId: connection.workspaceId,
    platform: connection.platform,
    name: connection.name,
    siteUrl: connection.siteUrl,
    cmsVersion: connection.cmsVersion,
    pluginVersion: connection.pluginVersion,
    status: connection.status,
    createdAt: connection.createdAt,
    lastTokenUsedAt: connection.lastTokenUsedAt,
    lastSyncAt: connection.lastSyncAt,
    lastSyncStats: connection.lastSyncStats,
    tokenPreview: connection.tokenPreview,
    wordpressAdminUsername: connection.wordpressAdminUsername,
    wordpressApplicationPasswordConfigured: Boolean(connection.wordpressApplicationPassword)
  };
}

function mapSiteRow(row: QueryResultRow): SiteConnection {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? undefined,
    platform: row.platform,
    name: row.name,
    siteUrl: row.site_url,
    cmsVersion: row.cms_version ?? undefined,
    pluginVersion: row.plugin_version ?? undefined,
    status: row.status,
    createdAt: toIsoString(row.created_at) ?? '',
    lastTokenUsedAt: toIsoString(row.last_token_used_at),
    lastSyncAt: toIsoString(row.last_sync_at),
    lastSyncStats: toLastSyncStats(row.last_sync_stats),
    tokenPreview: row.token_preview,
    wordpressAdminUsername: row.wordpress_admin_username ?? undefined,
    wordpressApplicationPasswordConfigured: Boolean(row.wordpress_application_password_encrypted)
  };
}

function mapArticleRow(row: QueryResultRow): SyncedArticle {
  return {
    cmsId: row.cms_id,
    type: row.type,
    title: row.title,
    slug: row.slug,
    status: row.status,
    url: row.url,
    excerpt: row.excerpt ?? undefined,
    contentHtml: row.content_html ?? undefined,
    author: row.author ?? undefined,
    categories: Array.isArray(row.categories) ? row.categories : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    featuredImageId: row.featured_image_id ?? undefined,
    publishedAt: row.published_at ?? undefined,
    updatedAt: row.cms_updated_at
  };
}

function mapMediaRow(row: QueryResultRow): SyncedMedia {
  return {
    cmsId: row.cms_id,
    title: row.title,
    url: row.url,
    mimeType: row.mime_type ?? undefined,
    fileName: row.file_name ?? undefined,
    altText: row.alt_text ?? undefined,
    attachedToCmsId: row.attached_to_cms_id ?? undefined,
    updatedAt: row.cms_updated_at
  };
}

function mapSyncTaskRow(row: QueryResultRow): SyncTask {
  return {
    id: row.id,
    siteId: row.site_id,
    siteName: row.site_name ?? undefined,
    status: row.status,
    scope: row.scope ?? 'full',
    targetCmsId: row.target_cms_id ?? undefined,
    suggestionId: row.suggestion_id ?? undefined,
    syncStartedAt: row.sync_started_at ?? undefined,
    updatedAfter: row.updated_after ?? undefined,
    batchesReceived: Number(row.batches_received ?? 0),
    articlesReceived: Number(row.articles_received ?? 0),
    mediaReceived: Number(row.media_received ?? 0),
    errorMessage: row.error_message ?? undefined,
    createdAt: toIsoString(row.created_at) ?? '',
    completedAt: toIsoString(row.completed_at)
  };
}

function createSiteConnection(id: string, input: CreateConnectionInput, apiToken: string): InMemorySiteConnection {
  return {
    id,
    workspaceId: defaultWorkspaceId,
    platform: input.platform,
    name: input.name,
    siteUrl: input.siteUrl,
    cmsVersion: input.cmsVersion,
    pluginVersion: input.pluginVersion,
    apiToken,
    tokenPreview: getTokenPreview(apiToken),
    status: 'connected',
    createdAt: new Date().toISOString(),
    wordpressAdminUsername: input.wordpressAdminUsername,
    wordpressApplicationPasswordConfigured: Boolean(input.wordpressApplicationPassword),
    wordpressApplicationPassword: input.wordpressApplicationPassword
  };
}

export function createInMemorySiteConnectionRepository(): SiteConnectionRepository {
  const sites = new Map<string, InMemorySiteConnection>();
  const articlesBySite = new Map<string, Map<string, SyncedArticle>>();
  const mediaBySite = new Map<string, Map<string, SyncedMedia>>();
  const syncTasks = new Map<string, SyncTask>();
  const syncTaskBatchIndexes = new Map<string, Set<number>>();

  return {
    async create(input) {
      const apiToken = generateSiteToken();
      const site = createSiteConnection(crypto.randomUUID(), input, apiToken);

      sites.set(site.id, site);
      articlesBySite.set(site.id, new Map());
      mediaBySite.set(site.id, new Map());

      return {
        site: toPublicConnection(site),
        apiToken
      };
    },
    async list(workspaceId) {
      return Array.from(sites.values())
        .filter((site) => !workspaceId || site.workspaceId === workspaceId)
        .map(toPublicConnection);
    },
    async find(siteId) {
      const site = sites.get(siteId);
      return site ? toPublicConnection(site) : undefined;
    },
    async findForWorkspace(siteId, workspaceId) {
      const site = sites.get(siteId);
      return site?.workspaceId === workspaceId ? toPublicConnection(site) : undefined;
    },
    async updateWordPressCredentials(siteId, credentials) {
      const site = sites.get(siteId);

      if (!site) {
        return undefined;
      }

      site.wordpressAdminUsername = credentials.wordpressAdminUsername;
      site.wordpressApplicationPassword = credentials.wordpressApplicationPassword;
      site.wordpressApplicationPasswordConfigured = true;

      return toPublicConnection(site);
    },
    async regenerateToken(siteId) {
      const site = sites.get(siteId);

      if (!site) {
        return undefined;
      }

      const apiToken = generateSiteToken();
      site.apiToken = apiToken;
      site.tokenPreview = getTokenPreview(apiToken);
      site.status = 'connected';
      site.lastTokenUsedAt = undefined;

      return {
        site: toPublicConnection(site),
        apiToken
      };
    },
    async revokeToken(siteId) {
      const site = sites.get(siteId);

      if (!site) {
        return undefined;
      }

      site.status = 'revoked';

      return toPublicConnection(site);
    },
    async verifyToken(siteId, apiToken) {
      const site = sites.get(siteId);
      if (site?.status !== 'connected' || site.apiToken !== apiToken) {
        return false;
      }

      site.lastTokenUsedAt = new Date().toISOString();
      return true;
    },
    async saveSync(siteId, payload) {
      const site = sites.get(siteId);

      if (!site) {
        throw new Error('SITE_NOT_FOUND');
      }

      const siteArticles = articlesBySite.get(siteId) ?? new Map<string, SyncedArticle>();
      const siteMedia = mediaBySite.get(siteId) ?? new Map<string, SyncedMedia>();

      for (const article of payload.articles) {
        siteArticles.set(article.cmsId, article);
      }

      for (const media of payload.media) {
        siteMedia.set(media.cmsId, media);
      }

      articlesBySite.set(siteId, siteArticles);
      mediaBySite.set(siteId, siteMedia);

      site.lastSyncAt = new Date().toISOString();
      site.lastSyncStats = {
        articlesReceived: payload.articles.length,
        mediaReceived: payload.media.length
      };

      return {
        site: toPublicConnection(site),
        articlesReceived: payload.articles.length,
        mediaReceived: payload.media.length
      };
    },
    async createSyncTask(siteId, input) {
      if (!sites.has(siteId)) {
        return undefined;
      }

      const now = new Date().toISOString();
      const task: SyncTask = {
        id: crypto.randomUUID(),
        siteId,
        status: 'queued',
        scope: input.scope ?? (input.updatedAfter ? 'incremental' : 'full'),
        targetCmsId: input.targetCmsId,
        suggestionId: input.suggestionId,
        syncStartedAt: input.syncStartedAt,
        updatedAfter: input.updatedAfter,
        batchesReceived: 0,
        articlesReceived: 0,
        mediaReceived: 0,
        createdAt: now
      };

      syncTasks.set(task.id, task);
      syncTaskBatchIndexes.set(task.id, new Set());
      return task;
    },
    async listSyncTasks(siteId, workspaceId) {
      return Array.from(syncTasks.values())
        .filter((task) => !siteId || task.siteId === siteId)
        .filter((task) => !workspaceId || sites.get(task.siteId)?.workspaceId === workspaceId)
        .map((task) => ({
          ...task,
          siteName: sites.get(task.siteId)?.name
        }))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
    async getSyncTask(syncTaskId) {
      const task = syncTasks.get(syncTaskId);
      return task
        ? {
            ...task,
            siteName: sites.get(task.siteId)?.name
          }
        : undefined;
    },
    async markSyncTaskRunning(syncTaskId) {
      const task = syncTasks.get(syncTaskId);
      if (!task) {
        return undefined;
      }

      task.status = 'running';
      task.errorMessage = undefined;
      return {
        ...task,
        siteName: sites.get(task.siteId)?.name
      };
    },
    async markSyncTaskFailed(syncTaskId, errorMessage) {
      const task = syncTasks.get(syncTaskId);
      if (!task) {
        return undefined;
      }

      task.status = 'failed';
      task.completedAt = new Date().toISOString();
      task.errorMessage = errorMessage;
      return {
        ...task,
        siteName: sites.get(task.siteId)?.name
      };
    },
    async saveSyncBatch(siteId, syncTaskId, payload) {
      const site = sites.get(siteId);
      const task = syncTasks.get(syncTaskId);

      if (!site || !task || task.siteId !== siteId) {
        return undefined;
      }

      const batchIndexes = syncTaskBatchIndexes.get(syncTaskId) ?? new Set<number>();
      if (batchIndexes.has(payload.batchIndex)) {
        return {
          site: toPublicConnection(site),
          task,
          articlesReceived: 0,
          mediaReceived: 0
        };
      }

      const siteArticles = articlesBySite.get(siteId) ?? new Map<string, SyncedArticle>();
      const siteMedia = mediaBySite.get(siteId) ?? new Map<string, SyncedMedia>();

      for (const article of payload.articles) {
        siteArticles.set(article.cmsId, article);
      }

      for (const media of payload.media) {
        siteMedia.set(media.cmsId, media);
      }

      articlesBySite.set(siteId, siteArticles);
      mediaBySite.set(siteId, siteMedia);

      task.status = payload.isFinalBatch ? 'completed' : 'running';
      batchIndexes.add(payload.batchIndex);
      syncTaskBatchIndexes.set(syncTaskId, batchIndexes);
      task.batchesReceived += 1;
      task.articlesReceived += payload.articles.length;
      task.mediaReceived += payload.media.length;

      if (payload.isFinalBatch) {
        task.completedAt = new Date().toISOString();
        site.lastSyncAt = task.completedAt;
        site.lastSyncStats = {
          articlesReceived: task.articlesReceived,
          mediaReceived: task.mediaReceived
        };
      }

      return {
        site: toPublicConnection(site),
        task,
        articlesReceived: payload.articles.length,
        mediaReceived: payload.media.length
      };
    },
    async listArticles(siteId) {
      return Array.from(articlesBySite.get(siteId)?.values() ?? []);
    },
    async listMedia(siteId) {
      return Array.from(mediaBySite.get(siteId)?.values() ?? []);
    },
    async getWordPressCredentials(siteId) {
      const site = sites.get(siteId);

      if (!site?.wordpressAdminUsername || !site.wordpressApplicationPassword) {
        return undefined;
      }

      return {
        site: toPublicConnection(site),
        username: site.wordpressAdminUsername,
        applicationPassword: site.wordpressApplicationPassword
      };
    }
  };
}

export function createPostgresSiteConnectionRepository(databaseUrl: string): SiteConnectionRepository {
  return new PostgresSiteConnectionRepository(databaseUrl);
}

export function createDefaultSiteConnectionRepository(databaseUrl?: string): SiteConnectionRepository {
  if (!databaseUrl) {
    return createInMemorySiteConnectionRepository();
  }

  return createPostgresSiteConnectionRepository(databaseUrl);
}

class PostgresSiteConnectionRepository implements SiteConnectionRepository {
  private readonly pool: Pool;
  private migrationPromise?: Promise<void>;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl
    });
  }

  async create(input: CreateConnectionInput) {
    await this.ensureSchema();

    const apiToken = generateSiteToken();
    const id = crypto.randomUUID();
    const now = new Date();
    const result = await this.pool.query(
      `
        INSERT INTO site_connections (
          id,
          workspace_id,
          platform,
          name,
          site_url,
          cms_version,
          plugin_version,
          api_token_hash,
          token_preview,
          status,
          created_at,
          wordpress_admin_username,
          wordpress_application_password_encrypted
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'connected', $10, $11, $12)
        RETURNING *
      `,
      [
        id,
        defaultWorkspaceId,
        input.platform,
        input.name,
        input.siteUrl,
        input.cmsVersion ?? null,
        input.pluginVersion ?? null,
        hashSiteToken(apiToken),
        getTokenPreview(apiToken),
        now,
        input.wordpressAdminUsername ?? null,
        input.wordpressApplicationPassword
          ? encryptWordPressCredential(input.wordpressApplicationPassword)
          : null
      ]
    );

    return {
      site: mapSiteRow(result.rows[0]),
      apiToken
    };
  }

  async list(workspaceId?: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `
        SELECT *
        FROM site_connections
        WHERE ($1::uuid IS NULL OR workspace_id = $1::uuid)
        ORDER BY created_at DESC
      `,
      [workspaceId ?? null]
    );

    return result.rows.map(mapSiteRow);
  }

  async find(siteId: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `
        SELECT *
        FROM site_connections
        WHERE id = $1
        LIMIT 1
      `,
      [siteId]
    );

    return result.rows[0] ? mapSiteRow(result.rows[0]) : undefined;
  }

  async findForWorkspace(siteId: string, workspaceId: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `
        SELECT *
        FROM site_connections
        WHERE id = $1
          AND workspace_id = $2
        LIMIT 1
      `,
      [siteId, workspaceId]
    );

    return result.rows[0] ? mapSiteRow(result.rows[0]) : undefined;
  }

  async updateWordPressCredentials(siteId: string, credentials: WordPressCredentialsInput) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `
        UPDATE site_connections
        SET wordpress_admin_username = $2,
            wordpress_application_password_encrypted = $3
        WHERE id = $1
        RETURNING *
      `,
      [
        siteId,
        credentials.wordpressAdminUsername,
        encryptWordPressCredential(credentials.wordpressApplicationPassword)
      ]
    );

    return result.rows[0] ? mapSiteRow(result.rows[0]) : undefined;
  }

  async regenerateToken(siteId: string) {
    await this.ensureSchema();

    const apiToken = generateSiteToken();
    const result = await this.pool.query(
      `
        UPDATE site_connections
        SET api_token_hash = $2,
            token_preview = $3,
            status = 'connected',
            last_token_used_at = NULL
        WHERE id = $1
        RETURNING *
      `,
      [siteId, hashSiteToken(apiToken), getTokenPreview(apiToken)]
    );

    if (!result.rows[0]) {
      return undefined;
    }

    return {
      site: mapSiteRow(result.rows[0]),
      apiToken
    };
  }

  async revokeToken(siteId: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `
        UPDATE site_connections
        SET status = 'revoked'
        WHERE id = $1
        RETURNING *
      `,
      [siteId]
    );

    return result.rows[0] ? mapSiteRow(result.rows[0]) : undefined;
  }

  async verifyToken(siteId: string, apiToken: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `
        UPDATE site_connections
        SET last_token_used_at = now()
        WHERE id = $1
          AND api_token_hash = $2
          AND status = 'connected'
        RETURNING id
      `,
      [siteId, hashSiteToken(apiToken)]
    );

    return result.rowCount === 1;
  }

  async saveSync(siteId: string, payload: SyncPayload) {
    await this.ensureSchema();

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const siteResult = await client.query(
        `
          SELECT *
          FROM site_connections
          WHERE id = $1
          FOR UPDATE
        `,
        [siteId]
      );

      if (!siteResult.rows[0]) {
        throw new Error('SITE_NOT_FOUND');
      }

      const completedAt = new Date();
      const lastSyncStats = {
        articlesReceived: payload.articles.length,
        mediaReceived: payload.media.length
      };

      for (const article of payload.articles) {
        await this.upsertArticle(client, siteId, article, completedAt);
      }

      for (const media of payload.media) {
        await this.upsertMedia(client, siteId, media, completedAt);
      }

      await client.query(
        `
          INSERT INTO sync_runs (
            id,
            site_id,
            task_id,
            batch_index,
            sync_started_at,
            updated_after,
            completed_at,
            articles_received,
            media_received,
            status
          )
          VALUES ($1, $2, NULL, NULL, $3, $4, $5, $6, $7, 'completed')
        `,
        [
          crypto.randomUUID(),
          siteId,
          payload.syncStartedAt ?? null,
          payload.updatedAfter ?? null,
          completedAt,
          payload.articles.length,
          payload.media.length
        ]
      );

      const updatedSite = await client.query(
        `
          UPDATE site_connections
          SET last_sync_at = $2,
              last_sync_stats = $3
          WHERE id = $1
          RETURNING *
        `,
        [siteId, completedAt, JSON.stringify(lastSyncStats)]
      );

      await client.query('COMMIT');

      return {
        site: mapSiteRow(updatedSite.rows[0]),
        articlesReceived: payload.articles.length,
        mediaReceived: payload.media.length
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createSyncTask(siteId: string, input: CreateSyncTaskInput) {
    await this.ensureSchema();
    const scope = input.scope ?? (input.updatedAfter ? 'incremental' : 'full');

    const result = await this.pool.query(
      `
        INSERT INTO sync_tasks (
          id,
          site_id,
          status,
          scope,
          target_cms_id,
          suggestion_id,
          sync_started_at,
          updated_after,
          created_at
        )
        SELECT $1, id, 'queued', $3, $4, $5, $6, $7, $8
        FROM site_connections
        WHERE id = $2
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        siteId,
        scope,
        input.targetCmsId ?? null,
        input.suggestionId ?? null,
        input.syncStartedAt ?? null,
        input.updatedAfter ?? null,
        new Date()
      ]
    );

    return result.rows[0] ? mapSyncTaskRow(result.rows[0]) : undefined;
  }

  async listSyncTasks(siteId?: string, workspaceId?: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `
        SELECT
          st.*,
          sc.name AS site_name
        FROM sync_tasks st
        JOIN site_connections sc ON sc.id = st.site_id
        WHERE ($1::uuid IS NULL OR st.site_id = $1::uuid)
          AND ($2::uuid IS NULL OR sc.workspace_id = $2::uuid)
        ORDER BY st.created_at DESC
        LIMIT 100
      `,
      [siteId ?? null, workspaceId ?? null]
    );

    return result.rows.map(mapSyncTaskRow);
  }

  async getSyncTask(syncTaskId: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `
        SELECT
          st.*,
          sc.name AS site_name
        FROM sync_tasks st
        JOIN site_connections sc ON sc.id = st.site_id
        WHERE st.id = $1
        LIMIT 1
      `,
      [syncTaskId]
    );

    return result.rows[0] ? mapSyncTaskRow(result.rows[0]) : undefined;
  }

  async markSyncTaskRunning(syncTaskId: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `
        UPDATE sync_tasks
        SET status = 'running',
            error_message = NULL
        WHERE id = $1
        RETURNING *
      `,
      [syncTaskId]
    );

    return result.rows[0] ? mapSyncTaskRow(result.rows[0]) : undefined;
  }

  async markSyncTaskFailed(syncTaskId: string, errorMessage: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `
        UPDATE sync_tasks
        SET status = 'failed',
            error_message = $2,
            completed_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [syncTaskId, errorMessage]
    );

    return result.rows[0] ? mapSyncTaskRow(result.rows[0]) : undefined;
  }

  async saveSyncBatch(siteId: string, syncTaskId: string, payload: SyncBatchPayload) {
    await this.ensureSchema();

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const taskResult = await client.query(
        `
          SELECT *
          FROM sync_tasks
          WHERE id = $1
            AND site_id = $2
          FOR UPDATE
        `,
        [syncTaskId, siteId]
      );

      if (!taskResult.rows[0]) {
        await client.query('ROLLBACK');
        return undefined;
      }

      const task = mapSyncTaskRow(taskResult.rows[0]);
      const batchCompletedAt = new Date();
      const existingBatchResult = await client.query(
        `
          SELECT id
          FROM sync_runs
          WHERE task_id = $1
            AND batch_index = $2
          LIMIT 1
        `,
        [syncTaskId, payload.batchIndex]
      );

      if (existingBatchResult.rows[0]) {
        const siteResult = await client.query(
          `
            SELECT *
            FROM site_connections
            WHERE id = $1
            LIMIT 1
          `,
          [siteId]
        );

        await client.query('COMMIT');

        return {
          site: mapSiteRow(siteResult.rows[0]),
          task,
          articlesReceived: 0,
          mediaReceived: 0
        };
      }

      for (const article of payload.articles) {
        await this.upsertArticle(client, siteId, article, batchCompletedAt);
      }

      for (const media of payload.media) {
        await this.upsertMedia(client, siteId, media, batchCompletedAt);
      }

      await client.query(
        `
          INSERT INTO sync_runs (
            id,
            site_id,
            task_id,
            batch_index,
            sync_started_at,
            updated_after,
            completed_at,
            articles_received,
            media_received,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed')
        `,
        [
          crypto.randomUUID(),
          siteId,
          syncTaskId,
          payload.batchIndex,
          task.syncStartedAt ?? payload.syncStartedAt ?? null,
          task.updatedAfter ?? payload.updatedAfter ?? null,
          batchCompletedAt,
          payload.articles.length,
          payload.media.length
        ]
      );

      const updatedTaskResult = await client.query(
        `
          UPDATE sync_tasks
          SET status = $3,
              batches_received = batches_received + 1,
              articles_received = articles_received + $4,
              media_received = media_received + $5,
              completed_at = CASE WHEN $6 THEN $2 ELSE completed_at END
          WHERE id = $1
          RETURNING *
        `,
        [
          syncTaskId,
          batchCompletedAt,
          payload.isFinalBatch ? 'completed' : 'running',
          payload.articles.length,
          payload.media.length,
          payload.isFinalBatch
        ]
      );
      const updatedTask = mapSyncTaskRow(updatedTaskResult.rows[0]);

      let updatedSite: SiteConnection;
      if (payload.isFinalBatch) {
        const lastSyncStats = {
          articlesReceived: updatedTask.articlesReceived,
          mediaReceived: updatedTask.mediaReceived
        };
        const siteResult = await client.query(
          `
            UPDATE site_connections
            SET last_sync_at = $2,
                last_sync_stats = $3
            WHERE id = $1
            RETURNING *
          `,
          [siteId, batchCompletedAt, JSON.stringify(lastSyncStats)]
        );
        updatedSite = mapSiteRow(siteResult.rows[0]);
      } else {
        const siteResult = await client.query(
          `
            SELECT *
            FROM site_connections
            WHERE id = $1
            LIMIT 1
          `,
          [siteId]
        );
        updatedSite = mapSiteRow(siteResult.rows[0]);
      }

      await client.query('COMMIT');

      return {
        site: updatedSite,
        task: updatedTask,
        articlesReceived: payload.articles.length,
        mediaReceived: payload.media.length
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listArticles(siteId: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `
        SELECT *
        FROM synced_articles
        WHERE site_id = $1
        ORDER BY cms_updated_at DESC, cms_id ASC
      `,
      [siteId]
    );

    return result.rows.map(mapArticleRow);
  }

  async listMedia(siteId: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `
        SELECT *
        FROM synced_media
        WHERE site_id = $1
        ORDER BY cms_updated_at DESC, cms_id ASC
      `,
      [siteId]
    );

    return result.rows.map(mapMediaRow);
  }

  async getWordPressCredentials(siteId: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `
        SELECT *
        FROM site_connections
        WHERE id = $1
          AND wordpress_admin_username IS NOT NULL
          AND wordpress_application_password_encrypted IS NOT NULL
        LIMIT 1
      `,
      [siteId]
    );
    const row = result.rows[0];

    if (!row) {
      return undefined;
    }

    return {
      site: mapSiteRow(row),
      username: row.wordpress_admin_username,
      applicationPassword: decryptWordPressCredential(row.wordpress_application_password_encrypted)
    };
  }

  async close() {
    await this.pool.end();
  }

  private async ensureSchema() {
    this.migrationPromise ??= this.pool.query(siteConnectionMigrationSql).then(() => undefined);
    await this.migrationPromise;
  }

  private async upsertArticle(
    client: PoolClient,
    siteId: string,
    article: SyncedArticle,
    syncedAt: Date
  ) {
    await client.query(
      `
        INSERT INTO synced_articles (
          site_id,
          cms_id,
          type,
          title,
          slug,
          status,
          url,
          excerpt,
          content_html,
          author,
          categories,
          tags,
          featured_image_id,
          published_at,
          cms_updated_at,
          synced_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (site_id, cms_id)
        DO UPDATE SET
          type = EXCLUDED.type,
          title = EXCLUDED.title,
          slug = EXCLUDED.slug,
          status = EXCLUDED.status,
          url = EXCLUDED.url,
          excerpt = EXCLUDED.excerpt,
          content_html = EXCLUDED.content_html,
          author = EXCLUDED.author,
          categories = EXCLUDED.categories,
          tags = EXCLUDED.tags,
          featured_image_id = EXCLUDED.featured_image_id,
          published_at = EXCLUDED.published_at,
          cms_updated_at = EXCLUDED.cms_updated_at,
          synced_at = EXCLUDED.synced_at
      `,
      [
        siteId,
        article.cmsId,
        article.type,
        article.title,
        article.slug,
        article.status,
        article.url,
        article.excerpt ?? null,
        article.contentHtml ?? null,
        article.author ?? null,
        JSON.stringify(article.categories),
        JSON.stringify(article.tags),
        article.featuredImageId ?? null,
        article.publishedAt ?? null,
        article.updatedAt,
        syncedAt
      ]
    );
  }

  private async upsertMedia(client: PoolClient, siteId: string, media: SyncedMedia, syncedAt: Date) {
    await client.query(
      `
        INSERT INTO synced_media (
          site_id,
          cms_id,
          title,
          url,
          mime_type,
          file_name,
          alt_text,
          attached_to_cms_id,
          cms_updated_at,
          synced_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (site_id, cms_id)
        DO UPDATE SET
          title = EXCLUDED.title,
          url = EXCLUDED.url,
          mime_type = EXCLUDED.mime_type,
          file_name = EXCLUDED.file_name,
          alt_text = EXCLUDED.alt_text,
          attached_to_cms_id = EXCLUDED.attached_to_cms_id,
          cms_updated_at = EXCLUDED.cms_updated_at,
          synced_at = EXCLUDED.synced_at
      `,
      [
        siteId,
        media.cmsId,
        media.title,
        media.url,
        media.mimeType ?? null,
        media.fileName ?? null,
        media.altText ?? null,
        media.attachedToCmsId ?? null,
        media.updatedAt,
        syncedAt
      ]
    );
  }
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

async function ensureSiteToken(
  repository: SiteConnectionRepository,
  request: FastifyRequest,
  reply: FastifyReply,
  site?: SiteConnection
) {
  if (!site) {
    reply.status(404).send({
      success: false,
      message: '找不到站點連接',
      error: {
        code: 'SITE_NOT_FOUND'
      }
    });
    return false;
  }

  if (!(await repository.verifyToken(site.id, getBearerToken(request)))) {
    reply.status(401).send({
      success: false,
      message: '站點 Token 無效',
      error: {
        code: 'SITE_TOKEN_INVALID'
      }
    });
    return false;
  }

  return true;
}

export function registerSiteConnectionRoutes(
  app: FastifyInstance,
  repository = createInMemorySiteConnectionRepository(),
  authService: AuthService
) {
  app.addHook('onClose', async () => {
    await repository.close?.();
  });

  app.post('/api/v1/site-connections', async (request, reply) => {
    const parsed = createConnectionSchema.safeParse(request.body);

    if (!parsed.success) {
      return validationError(reply, parsed.error);
    }

    const result = await repository.create(parsed.data);

    return reply.status(201).send({
      success: true,
      message: '站點連接已建立',
      data: result
    });
  });

  app.get('/api/v1/site-connections', async (request, reply) => {
    const user = await requireAuth(authService, request, reply);

    if (!user) {
      return reply;
    }

    return {
      success: true,
      message: '操作成功',
      data: {
        sites: await repository.list(user.workspaceId)
      }
    };
  });

  app.get('/api/v1/sync-tasks', async (request, reply) => {
    const user = await requireAuth(authService, request, reply);

    if (!user) {
      return reply;
    }

    return {
      success: true,
      message: '操作成功',
      data: {
        tasks: await repository.listSyncTasks(undefined, user.workspaceId)
      }
    };
  });

  app.get<{
    Params: {
      siteId: string;
    };
  }>('/api/v1/site-connections/:siteId', async (request, reply) => {
    const user = await requireAuth(authService, request, reply);

    if (!user) {
      return reply;
    }

    const site = await repository.findForWorkspace(request.params.siteId, user.workspaceId);

    if (!site) {
      return reply.status(404).send({
        success: false,
        message: '找不到站點連接',
        error: {
          code: 'SITE_NOT_FOUND'
        }
      });
    }

    return {
      success: true,
      message: '操作成功',
      data: {
        site
      }
    };
  });

  app.put<{
    Params: {
      siteId: string;
    };
  }>('/api/v1/site-connections/:siteId/wordpress-credentials', async (request, reply) => {
    const parsed = updateWordPressCredentialsSchema.safeParse(request.body);

    if (!parsed.success) {
      return validationError(reply, parsed.error);
    }

    const existingSite = await repository.find(request.params.siteId);
    const tokenAuthorized = await repository.verifyToken(
      request.params.siteId,
      getBearerToken(request)
    );

    if (!existingSite) {
      return reply.status(404).send({
        success: false,
        message: '找不到站點連接',
        error: {
          code: 'SITE_NOT_FOUND'
        }
      });
    }

    if (!tokenAuthorized) {
      const user = await requireAuth(authService, request, reply);

      if (!user) {
        return reply;
      }

      if (existingSite.workspaceId !== user.workspaceId) {
        return reply.status(404).send({
          success: false,
          message: '找不到站點連接',
          error: {
            code: 'SITE_NOT_FOUND'
          }
        });
      }
    }

    const site = await repository.updateWordPressCredentials(request.params.siteId, parsed.data);

    if (!site) {
      return reply.status(404).send({
        success: false,
        message: '找不到站點連接',
        error: {
          code: 'SITE_NOT_FOUND'
        }
      });
    }

    return {
      success: true,
      message: 'WordPress 管理員應用程式密碼已保存',
      data: {
        site
      }
    };
  });

  app.post<{
    Params: {
      siteId: string;
    };
  }>('/api/v1/site-connections/:siteId/token/regenerate', async (request, reply) => {
    const user = await requireAuth(authService, request, reply);

    if (!user) {
      return reply;
    }

    const site = await repository.findForWorkspace(request.params.siteId, user.workspaceId);
    if (!site) {
      return reply.status(404).send({
        success: false,
        message: '找不到站點連接',
        error: {
          code: 'SITE_NOT_FOUND'
        }
      });
    }

    const result = await repository.regenerateToken(request.params.siteId);

    if (!result) {
      return reply.status(404).send({
        success: false,
        message: '找不到站點連接',
        error: {
          code: 'SITE_NOT_FOUND'
        }
      });
    }

    return {
      success: true,
      message: '站點 Token 已重新生成',
      data: result
    };
  });

  app.post<{
    Params: {
      siteId: string;
    };
  }>('/api/v1/site-connections/:siteId/token/revoke', async (request, reply) => {
    const user = await requireAuth(authService, request, reply);

    if (!user) {
      return reply;
    }

    const existingSite = await repository.findForWorkspace(request.params.siteId, user.workspaceId);
    if (!existingSite) {
      return reply.status(404).send({
        success: false,
        message: '找不到站點連接',
        error: {
          code: 'SITE_NOT_FOUND'
        }
      });
    }

    const site = await repository.revokeToken(request.params.siteId);

    if (!site) {
      return reply.status(404).send({
        success: false,
        message: '找不到站點連接',
        error: {
          code: 'SITE_NOT_FOUND'
        }
      });
    }

    return {
      success: true,
      message: '站點 Token 已吊銷',
      data: {
        site
      }
    };
  });

  app.get<{
    Params: {
      siteId: string;
    };
  }>('/api/v1/site-connections/:siteId/sync-tasks', async (request, reply) => {
    const user = await requireAuth(authService, request, reply);

    if (!user) {
      return reply;
    }

    const site = await repository.findForWorkspace(request.params.siteId, user.workspaceId);

    if (!site) {
      return reply.status(404).send({
        success: false,
        message: '找不到站點連接',
        error: {
          code: 'SITE_NOT_FOUND'
        }
      });
    }

    return {
      success: true,
      message: '操作成功',
      data: {
        tasks: await repository.listSyncTasks(request.params.siteId, user.workspaceId)
      }
    };
  });

  app.post<{
    Params: {
      siteId: string;
    };
  }>('/api/v1/site-connections/:siteId/manual-refresh', async (request, reply) => {
    const user = await requireAuth(authService, request, reply);

    if (!user) {
      return reply;
    }

    const site = await repository.findForWorkspace(request.params.siteId, user.workspaceId);
    if (!site) {
      return reply.status(404).send({
        success: false,
        message: '找不到站點連接',
        error: {
          code: 'SITE_NOT_FOUND'
        }
      });
    }

    const parsed = manualRefreshTaskSchema.safeParse(request.body);

    if (!parsed.success) {
      return validationError(reply, parsed.error);
    }

    const task = await repository.createSyncTask(request.params.siteId, {
      scope: parsed.data.type,
      targetCmsId: parsed.data.cmsId
    });

    if (!task) {
      return reply.status(404).send({
        success: false,
        message: '找不到站點連接',
        error: {
          code: 'SITE_NOT_FOUND'
        }
      });
    }

    return reply.status(201).send({
      success: true,
      message: '手動刷新任務已建立',
      data: {
        task
      }
    });
  });

  app.post<{
    Params: {
      siteId: string;
    };
  }>('/api/v1/site-connections/:siteId/sync-tasks', async (request, reply) => {
    const site = await repository.find(request.params.siteId);

    if (!(await ensureSiteToken(repository, request, reply, site))) {
      return reply;
    }

    const parsed = createSyncTaskSchema.safeParse(request.body);

    if (!parsed.success) {
      return validationError(reply, parsed.error);
    }

    const task = await repository.createSyncTask(request.params.siteId, parsed.data);

    if (!task) {
      return reply.status(404).send({
        success: false,
        message: '找不到站點連接',
        error: {
          code: 'SITE_NOT_FOUND'
        }
      });
    }

    return reply.status(201).send({
      success: true,
      message: '同步任務已建立',
      data: {
        task
      }
    });
  });

  app.post<{
    Params: {
      siteId: string;
      syncTaskId: string;
    };
  }>('/api/v1/site-connections/:siteId/sync-tasks/:syncTaskId/batches', async (request, reply) => {
    const site = await repository.find(request.params.siteId);

    if (!(await ensureSiteToken(repository, request, reply, site))) {
      return reply;
    }

    const parsed = syncBatchPayloadSchema.safeParse(request.body);

    if (!parsed.success) {
      return validationError(reply, parsed.error);
    }

    const result = await repository.saveSyncBatch(
      request.params.siteId,
      request.params.syncTaskId,
      parsed.data
    );

    if (!result) {
      return reply.status(404).send({
        success: false,
        message: '找不到同步任務',
        error: {
          code: 'SYNC_TASK_NOT_FOUND'
        }
      });
    }

    return {
      success: true,
      message: '同步批次已接收',
      data: result
    };
  });

  app.post<{
    Params: {
      siteId: string;
    };
  }>('/api/v1/site-connections/:siteId/sync', async (request, reply) => {
    const site = await repository.find(request.params.siteId);

    if (!(await ensureSiteToken(repository, request, reply, site))) {
      return reply;
    }

    const parsed = syncPayloadSchema.safeParse(request.body);

    if (!parsed.success) {
      return validationError(reply, parsed.error);
    }

    const result = await repository.saveSync(request.params.siteId, parsed.data);

    return {
      success: true,
      message: '文章同步資料已接收',
      data: result
    };
  });

  app.get<{
    Params: {
      siteId: string;
    };
  }>('/api/v1/site-connections/:siteId/articles', async (request, reply) => {
    const site = await repository.find(request.params.siteId);

    if (!(await ensureSiteToken(repository, request, reply, site))) {
      return reply;
    }

    return {
      success: true,
      message: '操作成功',
      data: {
        site,
        articles: await repository.listArticles(request.params.siteId)
      }
    };
  });
}
