import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  createDeterministicUuid,
  hashRequestBody,
  normalizePagination,
  type ApiResponse,
  type Phase2Repository,
  type KeywordResearchProvider
} from '@aieo/ai-providers';
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
  seedKeywords: z.array(z.string().trim().min(1).max(300)).min(1).max(20),
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
  locale: z.string().trim().min(2).max(20).default('zh-Hant'),
  rulesVersion: z.string().trim().min(1).max(80).default('phase2-v1'),
  promptVersion: z.string().trim().min(1).max(80).default('phase2-v1'),
  schemaVersion: z.string().trim().min(1).max(80).default('phase2-v1')
}).refine((input) => Boolean(input.articleId || input.content), {
  message: '必須提供已同步文章 ID 或內容文字'
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
    if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) return undefined;
    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
    if (!hostname || [...hostname].some((character) => character.charCodeAt(0) > 127) || hostname.length > 253 || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.includes(':')) return undefined;
    if (/^(10|127|169\.254|192\.168)\./.test(hostname) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return undefined;
    return hostname;
  } catch {
    return undefined;
  }
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
    if (!(await siteConnectionRepository.findForWorkspace(parsed.data.siteId, user.workspaceId))) {
      return sendWorkspaceNotFound(reply);
    }

    try {
      const project = await repository.createKeywordResearchProject({
        ...parsed.data,
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

    const seedKeywords = [...new Set(parsed.data.seedKeywords.map((keyword) => keyword.replace(/\s+/g, ' ').trim()).filter(Boolean))];
    const ownDomain = parsed.data.ownDomain ? normalizeDomain(parsed.data.ownDomain) : undefined;
    const competitorDomains = [...new Set(parsed.data.competitorDomains.map(normalizeDomain).filter((domain): domain is string => Boolean(domain)))];
    if (parsed.data.ownDomain && !ownDomain) return sendValidationError(reply, [{ path: ['ownDomain'], message: '自有域名格式不正確' }]);
    if (ownDomain) {
      const site = await siteConnectionRepository.findForWorkspace(project.siteId, user.workspaceId);
      const connectedDomain = (() => {
        try { return new URL(site?.siteUrl ?? '').hostname.toLowerCase().replace(/\.$/, ''); } catch { return ''; }
      })();
      if (!connectedDomain || connectedDomain !== ownDomain) {
        return sendValidationError(reply, [{ path: ['ownDomain'], message: '自有域名必須與研究專案的已連接站點一致' }]);
      }
    }
    if (competitorDomains.length !== parsed.data.competitorDomains.length) {
      return sendValidationError(reply, [{ path: ['competitorDomains'], message: '競品域名只可包含公開 hostname，不可包含路徑或私人位址' }]);
    }

    const input = {
      seedKeywords,
      ownDomain,
      competitorDomains,
      market: project.market,
      language: project.language,
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
      (candidate) => candidate.profileKey === 'text.default' && candidate.status === 'active'
    );
    if (!profile) return sendProviderUnavailable(reply, 'PROVIDER_UNAVAILABLE');
    const priceSnapshot = await repository.findActiveGatewayPriceSnapshot(profile.modelId);
    if (!priceSnapshot) return sendProviderUnavailable(reply, 'PRICE_SNAPSHOT_UNAVAILABLE');
    const entitlement = await repository.findActiveEntitlement(user.workspaceId, 'content_optimization');
    if (!entitlement) {
      return reply.status(403).send({
        success: false,
        message: '目前套餐未包含內容優化額度',
        error: { code: 'ENTITLEMENT_REQUIRED' }
      });
    }
    const usedUnits = await repository.getPeriodUsageUnits(user.workspaceId, 'content_optimization', entitlement.period);
    if (usedUnits + 1 > entitlement.limitValue) {
      return reply.status(429).send({
        success: false,
        message: '內容優化額度已達上限',
        error: { code: 'QUOTA_EXCEEDED' }
      });
    }
    return sendProviderUnavailable(reply, 'PROVIDER_UNAVAILABLE');
  });

  app.get('/api/v1/content-optimizations/:runId', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'viewer');
    if (!user) return reply;
    const parsed = contentRunParamsSchema.safeParse(request.params);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);
    const run = await repository.findContentOptimizationRun(parsed.data.runId, user.workspaceId);
    if (!run) return sendWorkspaceNotFound(reply);
    return { success: true, message: '操作成功', data: { run, scoreChecks: [], claims: [], suggestions: [] } };
  });

  for (const path of [
    '/api/v1/content-optimizations/:runId/rewrites',
    '/api/v1/content-optimizations/:runId/apply',
    '/api/v1/content-optimizations/:runId/recheck'
  ]) {
    app.post(path, async (request, reply) => {
      const user = await requireRole(authService, request, reply, 'editor');
      if (!user) return reply;
      const parsed = contentRunParamsSchema.safeParse(request.params);
      if (!parsed.success) return sendValidationError(reply, parsed.error.issues);
      if (!(await repository.findContentOptimizationRun(parsed.data.runId, user.workspaceId))) {
        return sendWorkspaceNotFound(reply);
      }
      const idempotency = await readIdempotency(repository, request, createRequestContext(request, user));
      if (sendIdempotencyError(reply, idempotency)) return reply;
      if (idempotency.existing) return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
      return sendProviderUnavailable(reply, 'PROVIDER_UNAVAILABLE');
    });
  }

  app.patch('/api/v1/content-optimizations/:runId/suggestions/:suggestionId', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'editor');
    if (!user) return reply;
    const parsed = contentRunParamsSchema.safeParse(request.params);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);
    if (!(await repository.findContentOptimizationRun(parsed.data.runId, user.workspaceId))) {
      return sendWorkspaceNotFound(reply);
    }
    const idempotency = await readIdempotency(repository, request, createRequestContext(request, user));
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    return sendProviderUnavailable(reply, 'PROVIDER_UNAVAILABLE');
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
