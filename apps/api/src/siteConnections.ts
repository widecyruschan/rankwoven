import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
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

type CreateConnectionInput = z.infer<typeof createConnectionSchema>;
type SyncedArticle = z.infer<typeof syncedArticleSchema>;
type SyncedMedia = z.infer<typeof syncedMediaSchema>;
type SyncPayload = z.infer<typeof syncPayloadSchema>;

interface SiteConnection {
  id: string;
  platform: CreateConnectionInput['platform'];
  name: string;
  siteUrl: string;
  cmsVersion?: string;
  pluginVersion?: string;
  apiToken: string;
  status: 'connected';
  createdAt: string;
  lastSyncAt?: string;
  lastSyncStats?: {
    articlesReceived: number;
    mediaReceived: number;
  };
}

interface PublicSiteConnection extends Omit<SiteConnection, 'apiToken'> {
  tokenPreview: string;
}

interface SiteConnectionRepository {
  create(input: CreateConnectionInput): SiteConnection;
  list(): PublicSiteConnection[];
  find(siteId: string): SiteConnection | undefined;
  saveSync(siteId: string, payload: SyncPayload): {
    site: PublicSiteConnection;
    articlesReceived: number;
    mediaReceived: number;
  };
  listArticles(siteId: string): SyncedArticle[];
}

function toPublicConnection(connection: SiteConnection): PublicSiteConnection {
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
    tokenPreview: `${connection.apiToken.slice(0, 8)}...`
  };
}

export function createInMemorySiteConnectionRepository(): SiteConnectionRepository {
  const sites = new Map<string, SiteConnection>();
  const articlesBySite = new Map<string, Map<string, SyncedArticle>>();
  const mediaBySite = new Map<string, Map<string, SyncedMedia>>();

  return {
    create(input) {
      const now = new Date().toISOString();
      const site: SiteConnection = {
        id: crypto.randomUUID(),
        platform: input.platform,
        name: input.name,
        siteUrl: input.siteUrl,
        cmsVersion: input.cmsVersion,
        pluginVersion: input.pluginVersion,
        apiToken: `rw_${crypto.randomUUID().replaceAll('-', '')}`,
        status: 'connected',
        createdAt: now
      };

      sites.set(site.id, site);
      articlesBySite.set(site.id, new Map());
      mediaBySite.set(site.id, new Map());

      return site;
    },
    list() {
      return Array.from(sites.values()).map(toPublicConnection);
    },
    find(siteId) {
      return sites.get(siteId);
    },
    saveSync(siteId, payload) {
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
    listArticles(siteId) {
      return Array.from(articlesBySite.get(siteId)?.values() ?? []);
    }
  };
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

function ensureSiteToken(
  request: FastifyRequest,
  reply: FastifyReply,
  site?: SiteConnection
): site is SiteConnection {
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

  if (getBearerToken(request) !== site.apiToken) {
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
  app.post('/api/v1/site-connections', async (request, reply) => {
    const parsed = createConnectionSchema.safeParse(request.body);

    if (!parsed.success) {
      return validationError(reply, parsed.error);
    }

    const site = repository.create(parsed.data);

    return reply.status(201).send({
      success: true,
      message: '站點連接已建立',
      data: {
        site: toPublicConnection(site),
        apiToken: site.apiToken
      }
    });
  });

  app.get('/api/v1/site-connections', async () => ({
    success: true,
    message: '操作成功',
    data: {
      sites: repository.list()
    }
  }));

  app.get<{
    Params: {
      siteId: string;
    };
  }>('/api/v1/site-connections/:siteId', async (request, reply) => {
    const site = repository.find(request.params.siteId);

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
        site: toPublicConnection(site)
      }
    };
  });

  app.post<{
    Params: {
      siteId: string;
    };
  }>('/api/v1/site-connections/:siteId/sync', async (request, reply) => {
    const site = repository.find(request.params.siteId);

    if (!ensureSiteToken(request, reply, site)) {
      return reply;
    }

    const parsed = syncPayloadSchema.safeParse(request.body);

    if (!parsed.success) {
      return validationError(reply, parsed.error);
    }

    const result = repository.saveSync(request.params.siteId, parsed.data);

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
    const site = repository.find(request.params.siteId);

    if (!ensureSiteToken(request, reply, site)) {
      return reply;
    }

    return {
      success: true,
      message: '操作成功',
      data: {
        site: toPublicConnection(site),
        articles: repository.listArticles(request.params.siteId)
      }
    };
  });
}
