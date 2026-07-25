import { createHash } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { z } from 'zod';

const cmsPlatformSchema = z.enum(['wordpress', 'joomla', 'opencart']);

const createConnectionSchema = z.object({
  platform: cmsPlatformSchema.default('wordpress'),
  name: z.string().trim().min(1).max(160),
  siteUrl: z.url(),
  cmsVersion: z.string().trim().max(40).optional(),
  pluginVersion: z.string().trim().max(40).optional()
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
  articles: z.array(syncedArticleSchema).max(1000).default([]),
  media: z.array(syncedMediaSchema).max(2000).default([])
});

export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;
export type SyncedArticle = z.infer<typeof syncedArticleSchema>;
export type SyncedMedia = z.infer<typeof syncedMediaSchema>;
export type SyncPayload = z.infer<typeof syncPayloadSchema>;

export interface SiteConnection {
  id: string;
  platform: CreateConnectionInput['platform'];
  name: string;
  siteUrl: string;
  cmsVersion?: string;
  pluginVersion?: string;
  status: 'connected';
  createdAt: string;
  lastSyncAt?: string;
  lastSyncStats?: {
    articlesReceived: number;
    mediaReceived: number;
  };
  tokenPreview: string;
}

export interface SaveSyncResult {
  site: SiteConnection;
  articlesReceived: number;
  mediaReceived: number;
}

export interface SiteConnectionRepository {
  create(input: CreateConnectionInput): Promise<{
    site: SiteConnection;
    apiToken: string;
  }>;
  list(): Promise<SiteConnection[]>;
  find(siteId: string): Promise<SiteConnection | undefined>;
  verifyToken(siteId: string, apiToken: string): Promise<boolean>;
  saveSync(siteId: string, payload: SyncPayload): Promise<SaveSyncResult>;
  listArticles(siteId: string): Promise<SyncedArticle[]>;
  close?(): Promise<void>;
}

interface InMemorySiteConnection extends SiteConnection {
  apiToken: string;
}

const siteConnectionMigrationSql = `
CREATE TABLE IF NOT EXISTS site_connections (
  id uuid PRIMARY KEY,
  platform text NOT NULL CHECK (platform IN ('wordpress', 'joomla', 'opencart')),
  name varchar(160) NOT NULL,
  site_url text NOT NULL,
  cms_version varchar(40),
  plugin_version varchar(40),
  api_token_hash text NOT NULL UNIQUE,
  token_preview varchar(16) NOT NULL,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected')),
  created_at timestamptz NOT NULL,
  last_sync_at timestamptz,
  last_sync_stats jsonb
);

CREATE INDEX IF NOT EXISTS idx_site_connections_platform
  ON site_connections(platform);

CREATE TABLE IF NOT EXISTS sync_runs (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  sync_started_at varchar(80),
  completed_at timestamptz NOT NULL,
  articles_received integer NOT NULL DEFAULT 0,
  media_received integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_site_completed
  ON sync_runs(site_id, completed_at DESC);

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
    platform: connection.platform,
    name: connection.name,
    siteUrl: connection.siteUrl,
    cmsVersion: connection.cmsVersion,
    pluginVersion: connection.pluginVersion,
    status: connection.status,
    createdAt: connection.createdAt,
    lastSyncAt: connection.lastSyncAt,
    lastSyncStats: connection.lastSyncStats,
    tokenPreview: connection.tokenPreview
  };
}

function mapSiteRow(row: QueryResultRow): SiteConnection {
  return {
    id: row.id,
    platform: row.platform,
    name: row.name,
    siteUrl: row.site_url,
    cmsVersion: row.cms_version ?? undefined,
    pluginVersion: row.plugin_version ?? undefined,
    status: row.status,
    createdAt: toIsoString(row.created_at) ?? '',
    lastSyncAt: toIsoString(row.last_sync_at),
    lastSyncStats: toLastSyncStats(row.last_sync_stats),
    tokenPreview: row.token_preview
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

function createSiteConnection(id: string, input: CreateConnectionInput, apiToken: string): InMemorySiteConnection {
  return {
    id,
    platform: input.platform,
    name: input.name,
    siteUrl: input.siteUrl,
    cmsVersion: input.cmsVersion,
    pluginVersion: input.pluginVersion,
    apiToken,
    tokenPreview: getTokenPreview(apiToken),
    status: 'connected',
    createdAt: new Date().toISOString()
  };
}

export function createInMemorySiteConnectionRepository(): SiteConnectionRepository {
  const sites = new Map<string, InMemorySiteConnection>();
  const articlesBySite = new Map<string, Map<string, SyncedArticle>>();
  const mediaBySite = new Map<string, Map<string, SyncedMedia>>();

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
    async list() {
      return Array.from(sites.values()).map(toPublicConnection);
    },
    async find(siteId) {
      const site = sites.get(siteId);
      return site ? toPublicConnection(site) : undefined;
    },
    async verifyToken(siteId, apiToken) {
      return sites.get(siteId)?.apiToken === apiToken;
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
    async listArticles(siteId) {
      return Array.from(articlesBySite.get(siteId)?.values() ?? []);
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
          platform,
          name,
          site_url,
          cms_version,
          plugin_version,
          api_token_hash,
          token_preview,
          status,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'connected', $9)
        RETURNING *
      `,
      [
        id,
        input.platform,
        input.name,
        input.siteUrl,
        input.cmsVersion ?? null,
        input.pluginVersion ?? null,
        hashSiteToken(apiToken),
        getTokenPreview(apiToken),
        now
      ]
    );

    return {
      site: mapSiteRow(result.rows[0]),
      apiToken
    };
  }

  async list() {
    await this.ensureSchema();

    const result = await this.pool.query(`
      SELECT *
      FROM site_connections
      ORDER BY created_at DESC
    `);

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

  async verifyToken(siteId: string, apiToken: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `
        SELECT 1
        FROM site_connections
        WHERE id = $1
          AND api_token_hash = $2
        LIMIT 1
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
            sync_started_at,
            completed_at,
            articles_received,
            media_received,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'completed')
        `,
        [
          crypto.randomUUID(),
          siteId,
          payload.syncStartedAt ?? null,
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

function getBearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return '';
  }

  return authorization.slice('Bearer '.length).trim();
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
  repository = createInMemorySiteConnectionRepository()
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

  app.get('/api/v1/site-connections', async () => ({
    success: true,
    message: '操作成功',
    data: {
      sites: await repository.list()
    }
  }));

  app.get<{
    Params: {
      siteId: string;
    };
  }>('/api/v1/site-connections/:siteId', async (request, reply) => {
    const site = await repository.find(request.params.siteId);

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
