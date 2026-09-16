import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  createDeterministicUuid,
  hashRequestBody,
  hashContentSnapshot,
  sanitizeContentSnapshot,
  normalizePagination,
  type ApiResponse,
  type Phase2Repository,
  type KeywordResearchProvider
} from '@aieo/ai-providers';
import { fetchValidatedPublicUrl, UnsafeTargetUrlError, validatePublicUrl } from '@aieo/security';
import type { AuthService } from './auth';
import type { SiteConnectionRepository } from './siteConnections';
import {
  createRequestContext,
  getRouteKey,
  readIdempotency,
  requireRole,
  sendIdempotencyError
} from './phase2Routes';

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const projectParamsSchema = z.object({ projectId: z.string().uuid() });
const runParamsSchema = z.object({ runId: z.string().uuid() });
const contentRunParamsSchema = z.object({ runId: z.string().uuid() });

const createProjectSchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  market: z.string().trim().min(2).max(120),
  language: z.string().trim().min(2).max(20),
  device: z.enum(['desktop', 'mobile']).default('desktop'),
  engine: z.enum(['google']).default('google')
});

const createResearchRunSchema = z.object({
  seedKeywords: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  locale: z.string().trim().min(2).max(40).default('zh-Hant'),
  ownDomain: z.string().trim().max(253).optional(),
  competitorDomains: z.array(z.string().trim().min(1).max(253)).max(5).default([]),
  productContext: z.string().trim().max(1_000).optional(),
  audience: z.string().trim().max(500).optional(),
  conversionGoal: z.string().trim().max(500).optional()
});

const keywordFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  intent: z.string().trim().min(1).max(80).optional(),
  clusterId: z.string().uuid().optional(),
  sourceType: z.enum(['first_party_observed', 'provider_estimated', 'deterministic_check', 'ai_inferred', 'user_asserted']).optional(),
  minVolume: z.coerce.number().min(0).optional(),
  maxDifficulty: z.coerce.number().min(0).max(100).optional(),
  sort: z.enum(['opportunity', 'volume', 'difficulty', 'created']).default('opportunity')
});

const gapFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  classification: z.enum(['missing', 'weak', 'strong', 'shared']).optional(),
  competitorId: z.string().uuid().optional()
});

const createBriefSchema = z.object({
  primaryKeywordId: z.string().uuid(),
  audience: z.string().trim().max(500).optional(),
  locale: z.string().trim().min(2).max(20).default('zh-Hant')
});

const createContentOptimizationSchema = z.object({
  siteId: z.string().uuid(),
  articleId: z.number().int().positive().optional(),
  content: z.string().trim().min(1).max(500_000).optional(),
  sourceUrl: z.string().url().max(2_048).optional(),
  focusKeyword: z.string().trim().min(1).max(300),
  secondaryKeywords: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  locale: z.string().trim().min(2).max(20).default('zh-Hant'),
  targetMarket: z.string().trim().min(2).max(80).optional(),
  dialect: z.string().trim().min(2).max(40).optional(),
  audience: z.string().trim().max(500).optional(),
  funnelStage: z.string().trim().max(80).optional(),
  rulesVersion: z.string().trim().min(1).max(80).default('phase2-v1'),
  promptVersion: z.string().trim().min(1).max(80).default('phase2-v1'),
  schemaVersion: z.string().trim().min(1).max(80).default('phase2-v1')
}).refine((input) => [input.articleId, input.content, input.sourceUrl].filter(Boolean).length === 1, {
  message: '必須且只能提供已同步文章 ID、內容文字或公開 URL'
});

const createContentRewriteSchema = z.object({
  scope: z.enum(['title', 'meta', 'opening', 'paragraph', 'section', 'outline', 'full_document']),
  selector: z.string().trim().max(300).optional()
});

const updateContentSuggestionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  suggestedText: z.string().trim().min(1).max(500_000).optional()
});

const webhookParamsSchema = z.object({ provider: z.enum(['stripe', 'paypal']) });

function sendValidationError(reply: FastifyReply, details: unknown) {
  return reply.status(400).send({
    success: false,
    message: '請求資料格式不正確',
    error: { code: 'VALIDATION_ERROR', details }
  });
}

function sendWorkspaceNotFound(reply: FastifyReply) {
  return reply.status(404).send({
    success: false,
    message: '找不到工作區資源',
    error: { code: 'WORKSPACE_RESOURCE_NOT_FOUND' }
  });
}

async function saveIdempotentResponse(
  repository: Phase2Repository,
  request: FastifyRequest,
  workspaceId: string,
  key: string,
  requestHash: string,
  statusCode: number,
  responseBody: unknown
) {
  return repository.saveIdempotency({
    workspaceId,
    method: request.method,
    route: getRouteKey(request),
    key,
    requestHash,
    statusCode,
    responseBody,
    createdAt: new Date().toISOString()
  });
}

function sendProviderUnavailable(reply: FastifyReply, code: 'PROVIDER_UNAVAILABLE' | 'PRICE_SNAPSHOT_UNAVAILABLE') {
  return reply.status(503).send({
    success: false,
    message: code === 'PRICE_SNAPSHOT_UNAVAILABLE'
      ? '尚未設定有效的模型價格快照，任務不能建立'
      : '此功能的供應商執行器尚未啟用',
    error: { code }
  });
}

function normalizeDomain(value: string) {
  const candidate = value.includes('://') ? value : `https://${value}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;
    if (parsed.username || parsed.password) return undefined;
    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
    if (!hostname || [...hostname].some((character) => character.charCodeAt(0) > 127) || hostname.length > 253 || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.includes(':')) return undefined;
    if (/^(10|127|169\.254|192\.168)\./.test(hostname) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return undefined;
    return hostname;
  } catch {
    return undefined;
  }
}

function deriveSeedKeywordFromDomain(domain: string) {
  const labels = domain.toLowerCase().replace(/^www\./, '').split('.').filter(Boolean);
  const multiPartSecondLevel = new Set(['com', 'co', 'net', 'org', 'gov', 'edu', 'ac']);
  let brand = labels[0] ?? '';
  if (labels.length >= 3 && multiPartSecondLevel.has(labels[labels.length - 2] ?? '')) {
    brand = labels[labels.length - 3] ?? brand;
  } else if (labels.length >= 2) {
    brand = labels[labels.length - 2] ?? brand;
  }
  return brand.replace(/[-_]+/g, ' ').trim().slice(0, 300);
}

export function inferResearchMarketFromSiteUrl(siteUrl: string) {
  try {
    const host = new URL(siteUrl).hostname.toLowerCase();
    if (host.endsWith('.tw') || host.includes('.com.tw')) return 'TW';
    if (host.endsWith('.hk') || host.includes('.com.hk')) return 'HK';
    if (host.endsWith('.cn') || host.includes('.com.cn')) return 'CN';
    if (host.endsWith('.uk') || host.endsWith('.gb')) return 'GB';
    if (host.endsWith('.us')) return 'US';
  } catch {
    // fall through
  }
  return 'US';
}

export function inferResearchLanguageFromMarket(market: string) {
  if (market === 'TW' || market === 'HK') return 'zh-Hant';
  if (market === 'CN') return 'zh-Hans';
  return 'en';
}

async function resolveContentSource(
  input: z.infer<typeof createContentOptimizationSchema>,
  siteConnectionRepository: SiteConnectionRepository
) {
  if (input.content) {
    const contentText = sanitizeContentSnapshot(input.content);
    return { sourceKind: 'inline' as const, contentText, metadata: { inputType: 'inline' } };
  }
  if (input.articleId) {
    const articles = await siteConnectionRepository.listArticles(input.siteId, { page: 1, pageSize: 100 });
    const article = articles.items.find((item) => Number(item.cmsId) === input.articleId);
    const contentText = sanitizeContentSnapshot(article?.contentHtml ?? '');
    if (!article || !contentText) throw new Error('CONTENT_SNAPSHOT_UNAVAILABLE');
    return {
      sourceKind: 'article' as const,
      contentText,
      sourceUrl: article.url,
      metadata: { inputType: 'article', title: article.title, metaDescription: article.metaDescription ?? '', cmsId: article.cmsId }
    };
  }
  if (!input.sourceUrl) throw new Error('CONTENT_SOURCE_INVALID');
  const target = await validatePublicUrl(input.sourceUrl);
  const response = await fetchValidatedPublicUrl(target, { headers: { Accept: 'text/html,application/xhtml+xml' } });
  if (!response.ok) throw new Error('CONTENT_SOURCE_INVALID');
  const contentType = response.headers.get('content-type') ?? '';
  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new Error('CONTENT_SOURCE_INVALID');
  const contentText = sanitizeContentSnapshot(await response.text());
  if (!contentText) throw new Error('CONTENT_SNAPSHOT_UNAVAILABLE');
  return { sourceKind: 'public_url' as const, sourceUrl: target.url.toString(), contentText, metadata: { inputType: 'public_url', contentType } };
}

function sendContentError(reply: FastifyReply, error: unknown) {
  const code = error instanceof UnsafeTargetUrlError ? 'CONTENT_SOURCE_UNSAFE' : error instanceof Error ? error.message : 'CONTENT_SOURCE_INVALID';
  const statusCode = code === 'CONTENT_SOURCE_UNSAFE' ? 400 : code === 'ENTITLEMENT_REQUIRED' ? 403 : code === 'QUOTA_EXCEEDED' ? 429 : 400;
  return reply.status(statusCode).send({
    success: false,
    message: code === 'CONTENT_SOURCE_UNSAFE' ? '內容來源不符合安全抓取規則' : '內容優化任務無法建立',
    error: { code }
  });
}

export function registerPhase2FeatureRoutes(
  app: FastifyInstance,
  repository: Phase2Repository,
  authService: AuthService,
  siteConnectionRepository: SiteConnectionRepository,
  keywordResearchProvider?: KeywordResearchProvider
) {
  app.post('/api/v1/keyword-research/projects', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'editor');
    if (!user) return reply;
    const parsed = createProjectSchema.safeParse(request.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);

    const idempotency = await readIdempotency(repository, request, createRequestContext(request, user));
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    const site = await siteConnectionRepository.findForWorkspace(parsed.data.siteId, user.workspaceId);
    if (!site) {
      return sendWorkspaceNotFound(reply);
    }

    try {
      const inferredMarket = parsed.data.name.includes('.')
        ? inferResearchMarketFromSiteUrl(parsed.data.name.includes('://') ? parsed.data.name : `https://${parsed.data.name}`)
        : inferResearchMarketFromSiteUrl(site.siteUrl);
      const project = await repository.createKeywordResearchProject({
        ...parsed.data,
        market: inferredMarket,
        language: inferResearchLanguageFromMarket(inferredMarket),
        workspaceId: user.workspaceId,
        id: createDeterministicUuid(`${user.workspaceId}:${getRouteKey(request)}:${idempotency.key}`)
      });
      const body = {
        success: true,
        message: '關鍵詞研究專案已建立',
        data: { project }
      } satisfies ApiResponse<{ project: typeof project }>;
      const saved = await saveIdempotentResponse(
        repository,
        request,
        user.workspaceId,
        idempotency.key,
        idempotency.requestHash,
        201,
        body
      );
      await repository.recordAudit({
        workspaceId: user.workspaceId,
        actorType: 'user',
        actorId: user.id,
        action: 'keyword_research.project.created',
        resourceType: 'keyword_research_project',
        resourceId: project.id,
        requestId: request.id
      });
      return reply.status(saved.statusCode).send(saved.responseBody);
    } catch (error) {
      if (error instanceof Error && error.message === 'WORKSPACE_RESOURCE_NOT_FOUND') {
        return sendWorkspaceNotFound(reply);
      }
      throw error;
    }
  });

  app.get('/api/v1/keyword-research/projects', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'viewer');
    if (!user) return reply;
    const parsed = paginationQuerySchema.safeParse(request.query);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);
    const result = await repository.listKeywordResearchProjects(user.workspaceId, normalizePagination(parsed.data));
    return { success: true, message: '操作成功', data: result };
  });

  app.get('/api/v1/keyword-research/projects/:projectId', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'viewer');
    if (!user) return reply;
    const parsed = projectParamsSchema.safeParse(request.params);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);
    const project = await repository.findKeywordResearchProject(parsed.data.projectId, user.workspaceId);
    if (!project) return sendWorkspaceNotFound(reply);
    const latestRun = await repository.findLatestKeywordResearchRun(project.id, user.workspaceId);
    return { success: true, message: '操作成功', data: { project, latestRun, provider: latestRun?.provider ?? 'dataforseo' } };
  });

  app.post('/api/v1/keyword-research/projects/:projectId/runs', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'editor');
    if (!user) return reply;
    const projectParams = projectParamsSchema.safeParse(request.params);
    const parsed = createResearchRunSchema.safeParse(request.body);
    if (!projectParams.success || !parsed.success) return sendValidationError(reply, projectParams.error?.issues ?? parsed.error?.issues);
    const project = await repository.findKeywordResearchProject(projectParams.data.projectId, user.workspaceId);
    if (!project) return sendWorkspaceNotFound(reply);
    const idempotency = await readIdempotency(repository, request, createRequestContext(request, user));
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    if (!keywordResearchProvider) return sendProviderUnavailable(reply, 'PROVIDER_UNAVAILABLE');

    const requestedSeedKeywords = [...new Set(parsed.data.seedKeywords.map((keyword) => keyword.replace(/\s+/g, ' ').trim()).filter(Boolean))];
    const ownDomain = parsed.data.ownDomain ? normalizeDomain(parsed.data.ownDomain) : undefined;
    const competitorDomains = [...new Set(parsed.data.competitorDomains.map(normalizeDomain).filter((domain): domain is string => Boolean(domain)))];
    if (parsed.data.ownDomain && !ownDomain) return sendValidationError(reply, [{ path: ['ownDomain'], message: '自有域名格式不正確' }]);
    if (ownDomain) {
      const site = await siteConnectionRepository.findForWorkspace(project.siteId, user.workspaceId);
      const connectedDomain = (() => {
        try {
          return new URL(site?.siteUrl ?? '').hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
        } catch {
          return '';
        }
      })();
      if (!connectedDomain || connectedDomain !== ownDomain) {
        return sendValidationError(reply, [{ path: ['ownDomain'], message: '自有域名必須與研究專案的已連接站點一致' }]);
      }
    }
    if (competitorDomains.length !== parsed.data.competitorDomains.length) {
      return sendValidationError(reply, [{ path: ['competitorDomains'], message: '競品域名只可包含公開 hostname，不可包含路徑或私人位址' }]);
    }
    const seedKeywords = requestedSeedKeywords.length > 0
      ? requestedSeedKeywords
      : [...new Set(competitorDomains.map(deriveSeedKeywordFromDomain).filter(Boolean))];
    if (seedKeywords.length === 0) {
      return sendValidationError(reply, [{ path: ['seedKeywords'], message: '必須提供核心關鍵詞或至少一個有效競品域名' }]);
    }

    const competitorMarket = competitorDomains[0]
      ? inferResearchMarketFromSiteUrl(`https://${competitorDomains[0]}/`)
      : project.market;
    const researchMarket = competitorDomains.length > 0 ? competitorMarket : project.market;
    const researchLanguage = competitorDomains.length > 0
      ? inferResearchLanguageFromMarket(researchMarket)
      : project.language;

    const input = {
      seedKeywords,
      ownDomain,
      competitorDomains,
      market: researchMarket,
      language: researchLanguage,
      device: project.device === 'mobile' ? 'mobile' as const : 'desktop' as const,
      engine: 'google' as const,
      locale: parsed.data.locale,
      productContext: parsed.data.productContext,
      audience: parsed.data.audience,
      conversionGoal: parsed.data.conversionGoal
    };
    const requestContextHash = hashRequestBody(input);
    const estimatedCredits = 1 + competitorDomains.length;
    const cachedRun = await repository.findKeywordResearchRunByInput(project.id, user.workspaceId, requestContextHash, keywordResearchProvider.id);
    if (cachedRun) {
      const cachedTask = cachedRun.taskId ? await repository.findTask(cachedRun.taskId, user.workspaceId) : undefined;
      const cachedBody = {
        success: true,
        message: '已返回相同研究输入的快照',
        data: {
          taskId: cachedTask?.id ?? cachedRun.taskId,
          runId: cachedRun.id,
          provider: cachedRun.provider,
          status: cachedTask?.status ?? cachedRun.status,
          progress: cachedTask?.progress ?? (cachedRun.status === 'completed' ? 100 : 0),
          estimatedCredits: cachedTask?.estimatedCredits ?? estimatedCredits,
          cacheHit: true
        }
      };
      const saved = await saveIdempotentResponse(repository, request, user.workspaceId, idempotency.key, idempotency.requestHash, 202, cachedBody);
      return reply.status(saved.statusCode).send(saved.responseBody);
    }
    try {
      const result = await repository.enqueueKeywordResearchRun({
        workspaceId: user.workspaceId,
        projectId: project.id,
        kind: 'keyword_research',
        estimatedCredits,
        operation: 'keyword_research',
        featureKey: 'keyword_research',
        units: estimatedCredits,
        costEstimate: Number((0.05 + competitorDomains.length * 0.05).toFixed(4)),
        provider: keywordResearchProvider.id,
        providerKey: keywordResearchProvider.id,
        requestHash: requestContextHash,
        requestContextHash,
        providerMethodologyVersion: `${keywordResearchProvider.id}-keyword-research-v1`,
        locale: parsed.data.locale,
        seedKeywords,
        ownDomain,
        competitorDomains,
        productContext: parsed.data.productContext,
        audience: parsed.data.audience,
        conversionGoal: parsed.data.conversionGoal,
        record: {
          workspaceId: user.workspaceId,
          method: request.method,
          route: getRouteKey(request),
          key: idempotency.key,
          requestHash: idempotency.requestHash,
          statusCode: 202,
          createdAt: new Date().toISOString()
        },
        actorId: user.id,
        priority: 50
      }, (task, run) => ({
        statusCode: 202,
        responseBody: {
          success: true,
          message: '關鍵詞研究任務已建立',
          data: {
            taskId: task.id,
            runId: run.id,
            provider: run.provider,
            status: task.status,
            progress: task.progress,
            estimatedCredits: task.estimatedCredits,
            cacheHit: false
          }
        }
      }));
      if (result.replay) return reply.status(result.replay.statusCode).send(result.replay.responseBody);
      if (!result.task || !result.run) throw new Error('KEYWORD_RESEARCH_RUN_CREATE_FAILED');
      await repository.recordAudit({
        workspaceId: user.workspaceId,
        actorType: 'user',
        actorId: user.id,
        action: 'keyword_research.run.requested',
        resourceType: 'keyword_research_run',
        resourceId: result.run.id,
        requestId: request.id,
        metadata: { provider: result.run.provider, competitorCount: competitorDomains.length }
      });
      const response = await repository.findIdempotency({
        workspaceId: user.workspaceId,
        method: request.method,
        route: getRouteKey(request),
        key: idempotency.key
      });
      return reply.status(response?.statusCode ?? 202).send(response?.responseBody ?? {
        success: true,
        message: '關鍵詞研究任務已建立',
        data: { taskId: result.task.id, runId: result.run.id, provider: result.run.provider, status: result.task.status, progress: result.task.progress, estimatedCredits: result.task.estimatedCredits, cacheHit: false }
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'ENTITLEMENT_REQUIRED') {
        return reply.status(403).send({ success: false, message: '目前套餐未包含關鍵詞研究額度', error: { code: 'ENTITLEMENT_REQUIRED' } });
      }
      if (error instanceof Error && error.message === 'QUOTA_EXCEEDED') {
        return reply.status(429).send({ success: false, message: '關鍵詞研究額度已達上限', error: { code: 'QUOTA_EXCEEDED' } });
      }
      throw error;
    }
  });

  app.get('/api/v1/keyword-research/runs/:runId', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'viewer');
    if (!user) return reply;
    const parsed = runParamsSchema.safeParse(request.params);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);
    const run = await repository.findKeywordResearchRun(parsed.data.runId, user.workspaceId);
    if (!run) return sendWorkspaceNotFound(reply);
    const task = run.taskId ? await repository.findTask(run.taskId, user.workspaceId) : undefined;
    return { success: true, message: '操作成功', data: { run, task, attempts: [] } };
  });

  app.get('/api/v1/keyword-research/projects/:projectId/keywords', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'viewer');
    if (!user) return reply;
    const projectParams = projectParamsSchema.safeParse(request.params);
    const pagination = keywordFiltersSchema.safeParse(request.query);
    if (!projectParams.success || !pagination.success) return sendValidationError(reply, projectParams.error?.issues ?? pagination.error?.issues);
    const project = await repository.findKeywordResearchProject(projectParams.data.projectId, user.workspaceId);
    if (!project) return sendWorkspaceNotFound(reply);
    return { success: true, message: '操作成功', data: await repository.listKeywordCandidates(project.id, user.workspaceId, pagination.data) };
  });

  app.get('/api/v1/keyword-research/projects/:projectId/gaps', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'viewer');
    if (!user) return reply;
    const parsed = projectParamsSchema.safeParse(request.params);
    const filters = gapFiltersSchema.safeParse(request.query);
    if (!parsed.success || !filters.success) return sendValidationError(reply, parsed.error?.issues ?? filters.error?.issues);
    const project = await repository.findKeywordResearchProject(parsed.data.projectId, user.workspaceId);
    if (!project) return sendWorkspaceNotFound(reply);
    return { success: true, message: '操作成功', data: await repository.listKeywordGaps(project.id, user.workspaceId, filters.data) };
  });

  app.post('/api/v1/keyword-research/projects/:projectId/briefs', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'editor');
    if (!user) return reply;
    const projectParams = projectParamsSchema.safeParse(request.params);
    const parsed = createBriefSchema.safeParse(request.body);
    if (!projectParams.success || !parsed.success) return sendValidationError(reply, projectParams.error?.issues ?? parsed.error?.issues);
    const project = await repository.findKeywordResearchProject(projectParams.data.projectId, user.workspaceId);
    if (!project) return sendWorkspaceNotFound(reply);
    const idempotency = await readIdempotency(repository, request, createRequestContext(request, user));
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    try {
      const brief = await repository.createContentBrief({
        workspaceId: user.workspaceId,
        projectId: project.id,
        primaryKeywordId: parsed.data.primaryKeywordId,
        audience: parsed.data.audience,
        locale: parsed.data.locale
      });
      const body = { success: true, message: '內容 Brief 已建立', data: { brief } } satisfies ApiResponse<{ brief: typeof brief }>;
      const saved = await saveIdempotentResponse(repository, request, user.workspaceId, idempotency.key, idempotency.requestHash, 201, body);
      await repository.recordAudit({ workspaceId: user.workspaceId, actorType: 'user', actorId: user.id, action: 'keyword_research.brief.created', resourceType: 'content_brief', resourceId: brief.id, requestId: request.id });
      return reply.status(saved.statusCode).send(saved.responseBody);
    } catch (error) {
      if (error instanceof Error && error.message === 'WORKSPACE_RESOURCE_NOT_FOUND') return sendWorkspaceNotFound(reply);
      throw error;
    }
  });

  app.post('/api/v1/content-optimizations', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'editor');
    if (!user) return reply;
    const parsed = createContentOptimizationSchema.safeParse(request.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);
    const idempotency = await readIdempotency(repository, request, createRequestContext(request, user));
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    if (!(await siteConnectionRepository.findForWorkspace(parsed.data.siteId, user.workspaceId))) {
      return sendWorkspaceNotFound(reply);
    }
    const profile = (await repository.listGatewayProfiles()).find(
      (candidate) => candidate.profileKey === 'text.high_quality' && candidate.status === 'active'
    );
    if (!profile) return sendProviderUnavailable(reply, 'PROVIDER_UNAVAILABLE');
    const priceSnapshot = await repository.findActiveGatewayPriceSnapshot(profile.modelId);
    if (!priceSnapshot) return sendProviderUnavailable(reply, 'PRICE_SNAPSHOT_UNAVAILABLE');
    try {
      const source = await resolveContentSource(parsed.data, siteConnectionRepository);
      const inputHash = hashRequestBody({
        contentHash: hashContentSnapshot(source.contentText), focusKeyword: parsed.data.focusKeyword,
        secondaryKeywords: parsed.data.secondaryKeywords, locale: parsed.data.locale,
        targetMarket: parsed.data.targetMarket, dialect: parsed.data.dialect, rulesVersion: parsed.data.rulesVersion,
        promptVersion: parsed.data.promptVersion, schemaVersion: parsed.data.schemaVersion, modelId: profile.modelId
      });
      const cachedRun = await repository.findContentOptimizationRunByInput(parsed.data.siteId, user.workspaceId, inputHash, profile.modelId);
      if (cachedRun) {
        const task = cachedRun.taskId ? await repository.findTask(cachedRun.taskId, user.workspaceId) : undefined;
        const body = { success: true, message: '已返回相同內容快照的分析', data: { taskId: task?.id ?? cachedRun.taskId, runId: cachedRun.id, status: task?.status ?? cachedRun.status, progress: task?.progress ?? 0, cacheHit: true } };
        const saved = await saveIdempotentResponse(repository, request, user.workspaceId, idempotency.key, idempotency.requestHash, 202, body);
        return reply.status(saved.statusCode).send(saved.responseBody);
      }
      const result = await repository.enqueueContentOptimizationRun({
        workspaceId: user.workspaceId, siteId: parsed.data.siteId, kind: 'content_optimization', estimatedCredits: 1,
        operation: 'content_optimization', featureKey: 'content_optimization', units: 1,
        costEstimate: Number(priceSnapshot.inputPrice ?? 0), provider: 'wenwen', providerKey: 'wenwen',
        gatewayModel: profile.modelId, priceSnapshotId: priceSnapshot.id, requestHash: inputHash,
        sourceKind: source.sourceKind, sourceUrl: source.sourceUrl, contentText: source.contentText, contentHash: inputHash,
        metadata: { ...source.metadata, audience: parsed.data.audience ?? '', funnelStage: parsed.data.funnelStage ?? '' },
        articleId: parsed.data.articleId, locale: parsed.data.locale, targetMarket: parsed.data.targetMarket, dialect: parsed.data.dialect,
        focusKeyword: parsed.data.focusKeyword, secondaryKeywords: parsed.data.secondaryKeywords,
        rulesVersion: parsed.data.rulesVersion, promptVersion: parsed.data.promptVersion, schemaVersion: parsed.data.schemaVersion,
        record: { workspaceId: user.workspaceId, method: request.method, route: getRouteKey(request), key: idempotency.key, requestHash: idempotency.requestHash, statusCode: 202, createdAt: new Date().toISOString() },
        actorId: user.id, requestId: request.id, priority: 50
      }, (task, run) => ({ statusCode: 202, responseBody: { success: true, message: '內容分析任務已建立', data: { taskId: task.id, runId: run.id, status: task.status, progress: task.progress, cacheHit: false } } }));
      if (result.replay) return reply.status(result.replay.statusCode).send(result.replay.responseBody);
      if (!result.task || !result.run) throw new Error('CONTENT_SNAPSHOT_UNAVAILABLE');
      await repository.recordAudit({ workspaceId: user.workspaceId, actorType: 'user', actorId: user.id, action: 'content_optimization.created', resourceType: 'content_optimization_run', resourceId: result.run.id, requestId: request.id });
      return reply.status(202).send({ success: true, message: '內容分析任務已建立', data: { taskId: result.task.id, runId: result.run.id, status: result.task.status, progress: result.task.progress, cacheHit: false } });
    } catch (error) { return sendContentError(reply, error); }
  });

  app.get('/api/v1/content-optimizations/:runId', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'viewer');
    if (!user) return reply;
    const parsed = contentRunParamsSchema.safeParse(request.params);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);
    const details = await repository.getContentOptimizationDetails(parsed.data.runId, user.workspaceId);
    if (!details) return sendWorkspaceNotFound(reply);
    return { success: true, message: '操作成功', data: details };
  });

  app.post('/api/v1/content-optimizations/:runId/rewrites', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'editor');
    if (!user) return reply;
    const params = contentRunParamsSchema.safeParse(request.params);
    const parsed = createContentRewriteSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return sendValidationError(reply, params.error?.issues ?? parsed.error?.issues);
    const idempotency = await readIdempotency(repository, request, createRequestContext(request, user));
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    const details = await repository.getContentOptimizationDetails(params.data.runId, user.workspaceId);
    if (!details?.snapshot) return sendWorkspaceNotFound(reply);
    const profile = (await repository.listGatewayProfiles()).find((candidate) => candidate.profileKey === 'text.high_quality' && candidate.status === 'active');
    const priceSnapshot = profile ? await repository.findActiveGatewayPriceSnapshot(profile.modelId) : undefined;
    if (!profile) return sendProviderUnavailable(reply, 'PROVIDER_UNAVAILABLE');
    if (!priceSnapshot) return sendProviderUnavailable(reply, 'PRICE_SNAPSHOT_UNAVAILABLE');
    try {
      const result = await repository.enqueueCostedTask({
        workspaceId: user.workspaceId, siteId: details.run.siteId, kind: 'content_rewrite', estimatedCredits: 1,
        operation: 'content_optimization', featureKey: 'content_optimization', units: 1, costEstimate: Number(priceSnapshot.inputPrice ?? 0),
        provider: 'wenwen', providerKey: 'wenwen', gatewayModel: profile.modelId, priceSnapshotId: priceSnapshot.id,
        record: { workspaceId: user.workspaceId, method: request.method, route: getRouteKey(request), key: idempotency.key, requestHash: idempotency.requestHash, statusCode: 202, createdAt: new Date().toISOString() }, actorId: user.id, requestId: request.id
      }, (task) => ({ statusCode: 202, responseBody: { success: true, message: '內容改寫任務已建立', data: { taskId: task.id } } }));
      if (result.replay) return reply.status(result.replay.statusCode).send(result.replay.responseBody);
      if (!result.task) throw new Error('CONTENT_SNAPSHOT_UNAVAILABLE');
      const suggestion = await repository.createContentRewriteSuggestion({ workspaceId: user.workspaceId, runId: details.run.id, taskId: result.task.id, scope: parsed.data.scope, selector: parsed.data.selector, beforeText: details.snapshot.contentText, beforeHash: hashContentSnapshot(details.snapshot.contentText), diff: {}, riskFlags: [], status: 'queued', revision: 1 });
      return reply.status(202).send({ success: true, message: '內容改寫任務已建立', data: { taskId: result.task.id, suggestionId: suggestion.id } });
    } catch (error) { return sendContentError(reply, error); }
  });

  app.post('/api/v1/content-optimizations/:runId/apply', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'editor');
    if (!user) return reply;
    const parsed = contentRunParamsSchema.safeParse(request.params);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);
    const details = await repository.getContentOptimizationDetails(parsed.data.runId, user.workspaceId);
    if (!details?.snapshot) return sendWorkspaceNotFound(reply);
    if (details.run.sourceKind === 'article' && details.run.articleId) {
      const articles = await siteConnectionRepository.listArticles(details.run.siteId, { page: 1, pageSize: 100 });
      const article = articles.items.find((item) => Number(item.cmsId) === details.run.articleId);
      if (!article || hashContentSnapshot(article.contentHtml ?? '') !== hashContentSnapshot(details.snapshot.contentText)) {
        return reply.status(409).send({ success: false, message: '內容快照已變更，請重新比較', error: { code: 'STALE_CONTENT_SNAPSHOT' } });
      }
    }
    return reply.status(409).send({ success: false, message: 'CMS 寫入尚未啟用', error: { code: 'CMS_WRITE_DISABLED' } });
  });

  app.post('/api/v1/content-optimizations/:runId/recheck', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'editor');
    if (!user) return reply;
    const parsed = contentRunParamsSchema.safeParse(request.params);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);
    const idempotency = await readIdempotency(repository, request, createRequestContext(request, user));
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    const details = await repository.getContentOptimizationDetails(parsed.data.runId, user.workspaceId);
    if (!details?.snapshot) return sendWorkspaceNotFound(reply);
    const profile = (await repository.listGatewayProfiles()).find((candidate) => candidate.profileKey === 'text.high_quality' && candidate.status === 'active');
    const priceSnapshot = profile ? await repository.findActiveGatewayPriceSnapshot(profile.modelId) : undefined;
    if (!profile) return sendProviderUnavailable(reply, 'PROVIDER_UNAVAILABLE');
    if (!priceSnapshot) return sendProviderUnavailable(reply, 'PRICE_SNAPSHOT_UNAVAILABLE');
    try {
      const runHash = hashRequestBody({ parentRunId: details.run.id, contentHash: details.snapshot.contentHash, profile: profile.modelId, timestamp: Date.now() });
      const result = await repository.enqueueContentOptimizationRun({
        workspaceId: user.workspaceId, siteId: details.run.siteId, kind: 'content_optimization', estimatedCredits: 1, operation: 'content_optimization', featureKey: 'content_optimization', units: 1, costEstimate: Number(priceSnapshot.inputPrice ?? 0), provider: 'wenwen', providerKey: 'wenwen', gatewayModel: profile.modelId, priceSnapshotId: priceSnapshot.id, requestHash: runHash,
        sourceKind: details.snapshot.sourceKind, sourceUrl: details.snapshot.sourceUrl, contentText: details.snapshot.contentText, contentHash: runHash, metadata: details.snapshot.metadata, articleId: details.run.articleId, locale: details.run.contentLocale ?? details.run.locale, targetMarket: details.run.targetMarket, dialect: details.run.dialect, focusKeyword: details.run.focusKeyword ?? '', secondaryKeywords: details.run.secondaryKeywords ?? [], rulesVersion: details.run.rulesVersion, promptVersion: details.run.promptVersion, schemaVersion: details.run.schemaVersion, parentRunId: details.run.id,
        record: { workspaceId: user.workspaceId, method: request.method, route: getRouteKey(request), key: idempotency.key, requestHash: idempotency.requestHash, statusCode: 202, createdAt: new Date().toISOString() }, actorId: user.id, requestId: request.id
      }, (task, run) => ({ statusCode: 202, responseBody: { success: true, message: '內容重新分析任務已建立', data: { taskId: task.id, runId: run.id } } }));
      if (result.replay) return reply.status(result.replay.statusCode).send(result.replay.responseBody);
      return reply.status(202).send({ success: true, message: '內容重新分析任務已建立', data: { taskId: result.task?.id, runId: result.run?.id } });
    } catch (error) { return sendContentError(reply, error); }
  });

  app.patch('/api/v1/content-optimizations/:runId/suggestions/:suggestionId', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'editor');
    if (!user) return reply;
    const parsed = contentRunParamsSchema.safeParse(request.params);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);
    const body = updateContentSuggestionSchema.safeParse(request.body);
    if (!body.success) return sendValidationError(reply, body.error.issues);
    if (!(await repository.findContentOptimizationRun(parsed.data.runId, user.workspaceId))) {
      return sendWorkspaceNotFound(reply);
    }
    const idempotency = await readIdempotency(repository, request, createRequestContext(request, user));
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    const suggestion = await repository.updateContentRewriteSuggestion(parsed.data.runId, String((request.params as { suggestionId?: string }).suggestionId ?? ''), user.workspaceId, body.data);
    if (!suggestion) return sendWorkspaceNotFound(reply);
    const response = { success: true, message: '內容建議已更新', data: { suggestion } };
    const saved = await saveIdempotentResponse(repository, request, user.workspaceId, idempotency.key, idempotency.requestHash, 200, response);
    return reply.status(saved.statusCode).send(saved.responseBody);
  });

  app.post('/api/v1/webhooks/:provider', async (request, reply) => {
    const parsed = webhookParamsSchema.safeParse(request.params);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);
    const signature = request.headers['x-webhook-signature'];
    if (!signature) {
      return reply.status(400).send({
        success: false,
        message: 'Webhook 簽名缺失',
        error: { code: 'VALIDATION_ERROR' }
      });
    }
    return sendProviderUnavailable(reply, 'PROVIDER_UNAVAILABLE');
  });
}
