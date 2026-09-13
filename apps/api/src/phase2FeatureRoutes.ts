import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  createDeterministicUuid,
  normalizePagination,
  type ApiResponse,
  type Phase2Repository
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
  seedKeywords: z.array(z.string().trim().min(1).max(300)).min(1).max(25),
  locale: z.string().trim().min(2).max(20).default('zh-Hant')
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

export function registerPhase2FeatureRoutes(
  app: FastifyInstance,
  repository: Phase2Repository,
  authService: AuthService,
  siteConnectionRepository: SiteConnectionRepository
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
    return { success: true, message: '操作成功', data: { project, latestRun: null, provider: 'dataforseo' } };
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
    return sendProviderUnavailable(reply, 'PROVIDER_UNAVAILABLE');
  });

  app.get('/api/v1/keyword-research/runs/:runId', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'viewer');
    if (!user) return reply;
    const parsed = runParamsSchema.safeParse(request.params);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);
    const run = await repository.findKeywordResearchRun(parsed.data.runId, user.workspaceId);
    if (!run) return sendWorkspaceNotFound(reply);
    return { success: true, message: '操作成功', data: { run, attempts: [] } };
  });

  app.get('/api/v1/keyword-research/projects/:projectId/keywords', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'viewer');
    if (!user) return reply;
    const projectParams = projectParamsSchema.safeParse(request.params);
    const pagination = paginationQuerySchema.safeParse(request.query);
    if (!projectParams.success || !pagination.success) return sendValidationError(reply, projectParams.error?.issues ?? pagination.error?.issues);
    const project = await repository.findKeywordResearchProject(projectParams.data.projectId, user.workspaceId);
    if (!project) return sendWorkspaceNotFound(reply);
    return {
      success: true,
      message: '操作成功',
      data: { items: [], pagination: { ...normalizePagination(pagination.data), total: 0, totalPages: 0 } }
    };
  });

  app.get('/api/v1/keyword-research/projects/:projectId/gaps', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'viewer');
    if (!user) return reply;
    const parsed = projectParamsSchema.safeParse(request.params);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);
    const project = await repository.findKeywordResearchProject(parsed.data.projectId, user.workspaceId);
    if (!project) return sendWorkspaceNotFound(reply);
    return {
      success: true,
      message: '操作成功',
      data: { provider: 'dataforseo', freshness: null, missing: [], weak: [], strong: [], shared: [] }
    };
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
    return sendProviderUnavailable(reply, 'PROVIDER_UNAVAILABLE');
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
