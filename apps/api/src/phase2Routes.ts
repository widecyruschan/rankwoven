import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  hashRequestBody,
  normalizePagination,
  type ApiResponse,
  type GatewayModelProfile,
  type IdempotencyRecord,
  type Phase2Repository,
  type Phase2Task,
  type Phase2TaskStatus,
  type RequestContext,
  type TaskGovernance
} from '@aieo/ai-providers';
import { requireAuth, type AuthService, type AuthUser } from './auth';

const taskParamsSchema = z.object({ taskId: z.string().uuid() });
const deadLetterActionSchema = z.object({ reason: z.string().trim().min(3).max(500) });
const taskPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});
const taskIdempotencyHeader = z.string().trim().min(8).max(200);
const gatewayProfileKeys = ['text.default', 'text.high_quality', 'text.batch', 'embedding.default', 'image.default'] as const;
const gatewayProfileKeySchema = z.enum(gatewayProfileKeys);
const gatewayProfileParamsSchema = z.object({ profileKey: gatewayProfileKeySchema });
const gatewayProfileBodySchema = z.object({ modelId: z.string().trim().min(1).max(160) });

const roleRank: Record<AuthUser['role'], number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4
};

function publicTask(task: Phase2Task) {
  return {
    id: task.id,
    siteId: task.siteId,
    kind: task.kind,
    status: task.status,
    progress: task.progress,
    estimatedCredits: task.estimatedCredits,
    providerKey: task.providerKey,
    availableAt: task.availableAt,
    cancellationRequestedAt: task.cancellationRequestedAt,
    replayOfTaskId: task.replayOfTaskId,
    priority: task.priority,
    result: task.result,
    errorCode: task.errorCode,
    retryCount: task.retryCount,
    maxRetries: task.maxRetries,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt
  };
}

export async function requireRole(
  authService: AuthService,
  request: FastifyRequest,
  reply: FastifyReply,
  minimumRole: AuthUser['role']
) {
  const user = await requireAuth(authService, request, reply);
  if (!user) return undefined;

  if (roleRank[user.role] < roleRank[minimumRole]) {
    reply.status(403).send({
      success: false,
      message: '沒有足夠權限執行此操作',
      error: { code: 'FORBIDDEN' }
    });
    return undefined;
  }

  return user;
}

export function createRequestContext(request: FastifyRequest, user: AuthUser, idempotencyKey?: string): RequestContext {
  return {
    requestId: request.id,
    workspaceId: user.workspaceId,
    actorId: user.id,
    actorRole: user.role,
    idempotencyKey
  };
}

export function getRouteKey(request: FastifyRequest) {
  return request.routeOptions.url ?? request.url.split('?')[0];
}

async function enforceProviderTaskRateLimit(
  reply: FastifyReply,
  governance: TaskGovernance | undefined,
  workspaceId: string,
  actorId: string,
  operation: string
) {
  if (!governance) {
    if (process.env.NODE_ENV !== 'production') return true;
    reply.status(503).send({
      success: false,
      message: '任務限流服務暫時不可用',
      error: { code: 'RATE_LIMIT_UNAVAILABLE' }
    });
    return false;
  }
  try {
    const policy = { capacity: 5, refillWindowMs: 60_000 };
    const [actor, workspace] = await Promise.all([
      governance.consume(`actor:${actorId}:${operation}`, policy),
      governance.consume(`workspace:${workspaceId}:${operation}`, { capacity: 20, refillWindowMs: 60_000 })
    ]);
    if (actor.allowed && workspace.allowed) return true;
    reply.status(429).send({
      success: false,
      message: '任務建立過於頻繁，請稍後再試',
      error: { code: 'RATE_LIMIT_EXCEEDED', retryAfterSec: Math.ceil(Math.max(actor.retryAfterMs, workspace.retryAfterMs) / 1000) }
    });
    return false;
  } catch {
    reply.status(503).send({
      success: false,
      message: '任務限流服務暫時不可用',
      error: { code: 'RATE_LIMIT_UNAVAILABLE' }
    });
    return false;
  }
}

export type IdempotencyCheck =
  | { error: { statusCode: number; body: ApiResponse<never> } }
  | { key: string; requestHash: string; existing?: IdempotencyRecord };

export async function readIdempotency(
  repository: Phase2Repository,
  request: FastifyRequest,
  context: RequestContext
): Promise<IdempotencyCheck> {
  const header = request.headers['idempotency-key'];
  const key = Array.isArray(header) ? header[0] : header;
  const parsed = taskIdempotencyHeader.safeParse(key);
  if (!parsed.success) {
    return {
      error: {
        statusCode: 400,
        body: {
          success: false,
          message: '寫入請求必須提供有效的 Idempotency-Key',
          error: { code: 'VALIDATION_ERROR', details: parsed.error.issues }
        }
      }
    };
  }

  const requestHash = hashRequestBody(request.body);
  const existing = await repository.findIdempotency({
    workspaceId: context.workspaceId,
    method: request.method,
    route: getRouteKey(request),
    key: parsed.data
  });

  if (existing && existing.requestHash !== requestHash) {
    return {
      error: {
        statusCode: 409,
        body: {
          success: false,
          message: 'Idempotency-Key 已用於其他請求',
          error: { code: 'IDEMPOTENCY_KEY_REUSED' }
        }
      }
    };
  }

  return { key: parsed.data, requestHash, existing };
}

export function sendIdempotencyError(
  reply: FastifyReply,
  result: IdempotencyCheck
): result is Extract<IdempotencyCheck, { error: unknown }> {
  if (!('error' in result)) return false;
  reply.status(result.error.statusCode).send(result.error.body);
  return true;
}

export function registerPhase2Routes(
  app: FastifyInstance,
  repository: Phase2Repository,
  authService: AuthService,
  governance?: TaskGovernance
) {
  app.addHook('onClose', async () => {
    await repository.close?.();
  });

  app.get('/api/v1/tasks/dead-letter', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'admin');
    if (!user) return reply;
    const parsed = taskPaginationSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: '分頁參數格式不正確',
        error: { code: 'VALIDATION_ERROR', details: parsed.error.issues }
      });
    }
    const result = await repository.listDeadLetterTasks(user.workspaceId, normalizePagination(parsed.data));
    return {
      success: true,
      message: '操作成功',
      data: { ...result, items: result.items.map(publicTask) }
    };
  });

  app.post('/api/v1/tasks/:taskId/replays', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'admin');
    if (!user) return reply;
    const params = taskParamsSchema.safeParse(request.params);
    const body = deadLetterActionSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.status(400).send({
        success: false,
        message: '重跑任務參數格式不正確',
        error: { code: 'VALIDATION_ERROR', details: params.error?.issues ?? body.error?.issues }
      });
    }
    const context = createRequestContext(request, user);
    const idempotency = await readIdempotency(repository, request, context);
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    const replay = await repository.replayDeadLetterTask(
      params.data.taskId,
      user.workspaceId,
      user.id,
      body.data.reason,
      request.id
    );
    if (!replay) return reply.status(404).send({
      success: false,
      message: '找不到可重跑的死信任務',
      error: { code: 'WORKSPACE_RESOURCE_NOT_FOUND' }
    });
    const response = {
      success: true,
      message: '死信任務已建立重跑項目',
      data: { task: publicTask(replay.task), action: replay.action }
    } satisfies ApiResponse<{ task: ReturnType<typeof publicTask>; action: typeof replay.action }>;
    const saved = await repository.saveIdempotency({
      workspaceId: user.workspaceId,
      method: request.method,
      route: getRouteKey(request),
      key: idempotency.key,
      requestHash: idempotency.requestHash,
      statusCode: 202,
      responseBody: response,
      createdAt: new Date().toISOString()
    });
    await repository.recordAudit({
      workspaceId: user.workspaceId,
      actorType: 'user',
      actorId: user.id,
      action: 'task.dead_letter.replay',
      resourceType: 'phase2_task',
      resourceId: params.data.taskId,
      requestId: request.id,
      metadata: { replacementTaskId: replay.task.id }
    });
    return reply.status(saved.statusCode).send(saved.responseBody);
  });

  app.post('/api/v1/tasks/:taskId/dead-letter/ignore', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'admin');
    if (!user) return reply;
    const params = taskParamsSchema.safeParse(request.params);
    const body = deadLetterActionSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.status(400).send({
        success: false,
        message: '忽略死信參數格式不正確',
        error: { code: 'VALIDATION_ERROR', details: params.error?.issues ?? body.error?.issues }
      });
    }
    const context = createRequestContext(request, user);
    const idempotency = await readIdempotency(repository, request, context);
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    const action = await repository.ignoreDeadLetterTask(params.data.taskId, user.workspaceId, user.id, body.data.reason);
    if (!action) return reply.status(404).send({
      success: false,
      message: '找不到可忽略的死信任務',
      error: { code: 'WORKSPACE_RESOURCE_NOT_FOUND' }
    });
    const response = {
      success: true,
      message: '死信任務已忽略',
      data: { action }
    } satisfies ApiResponse<{ action: typeof action }>;
    const saved = await repository.saveIdempotency({
      workspaceId: user.workspaceId,
      method: request.method,
      route: getRouteKey(request),
      key: idempotency.key,
      requestHash: idempotency.requestHash,
      statusCode: 200,
      responseBody: response,
      createdAt: new Date().toISOString()
    });
    await repository.recordAudit({
      workspaceId: user.workspaceId,
      actorType: 'user',
      actorId: user.id,
      action: 'task.dead_letter.ignored',
      resourceType: 'phase2_task',
      resourceId: params.data.taskId,
      requestId: request.id
    });
    return reply.status(saved.statusCode).send(saved.responseBody);
  });

  app.get('/api/v1/tasks/:taskId', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'viewer');
    if (!user) return reply;

    const parsed = taskParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: '任務 ID 格式不正確',
        error: { code: 'VALIDATION_ERROR', details: parsed.error.issues }
      });
    }

    const task = await repository.findTask(parsed.data.taskId, user.workspaceId);
    if (!task) {
      return reply.status(404).send({
        success: false,
        message: '找不到任務',
        error: { code: 'WORKSPACE_RESOURCE_NOT_FOUND' }
      });
    }

    return {
      success: true,
      message: '操作成功',
      data: { task: publicTask(task) }
    } satisfies ApiResponse<{ task: ReturnType<typeof publicTask> }>;
  });

  app.post('/api/v1/tasks/:taskId/cancel', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'editor');
    if (!user) return reply;

    const parsed = taskParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: '任務 ID 格式不正確',
        error: { code: 'VALIDATION_ERROR', details: parsed.error.issues }
      });
    }

    const context = createRequestContext(request, user);
    const idempotency = await readIdempotency(repository, request, context);
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) {
      return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    }
    const task = await repository.findTask(parsed.data.taskId, user.workspaceId);
    if (!task) {
      const body = {
        success: false,
        message: '找不到任務',
        error: { code: 'WORKSPACE_RESOURCE_NOT_FOUND' }
      } satisfies ApiResponse<never>;
      const saved = await repository.saveIdempotency({
        workspaceId: user.workspaceId,
        method: request.method,
        route: getRouteKey(request),
        key: idempotency.key,
        requestHash: idempotency.requestHash,
        statusCode: 404,
        responseBody: body,
        createdAt: new Date().toISOString()
      });
      return reply.status(saved.statusCode).send(saved.responseBody);
    }

    if (task.status !== 'queued' && task.status !== 'running') {
      const body = {
        success: false,
        message: '目前任務狀態不允許取消',
        error: { code: 'TASK_STATE_INVALID' }
      } satisfies ApiResponse<never>;
      const saved = await repository.saveIdempotency({
        workspaceId: user.workspaceId,
        method: request.method,
        route: getRouteKey(request),
        key: idempotency.key,
        requestHash: idempotency.requestHash,
        statusCode: 409,
        responseBody: body,
        createdAt: new Date().toISOString()
      });
      return reply.status(saved.statusCode).send(saved.responseBody);
    }

    const cancelled = await repository.cancelTask(task.id, user.workspaceId);
    if (!cancelled) {
      const replay = await repository.findIdempotency({
        workspaceId: user.workspaceId,
        method: request.method,
        route: getRouteKey(request),
        key: idempotency.key
      });
      if (replay && replay.requestHash === idempotency.requestHash) {
        return reply.status(replay.statusCode).send(replay.responseBody);
      }
      return reply.status(409).send({
        success: false,
        message: '任務狀態已變更，請重新讀取後再試',
        error: { code: 'TASK_STATE_INVALID' }
      });
    }

    const body = {
      success: true,
      message: cancelled.status === 'cancellation_requested' ? '任務取消請求已提交' : '任務已取消',
      data: { task: publicTask(cancelled) }
    } satisfies ApiResponse<{ task: ReturnType<typeof publicTask> }>;
    const saved = await repository.saveIdempotency({
      workspaceId: user.workspaceId,
      method: request.method,
      route: getRouteKey(request),
      key: idempotency.key,
      requestHash: idempotency.requestHash,
      statusCode: cancelled.status === 'cancellation_requested' ? 202 : 200,
      responseBody: body,
      createdAt: new Date().toISOString()
    });
    await repository.recordAudit({
      workspaceId: user.workspaceId,
      actorType: 'user',
      actorId: user.id,
      action: 'task.cancel',
      resourceType: 'phase2_task',
      resourceId: task.id,
      requestId: request.id
    });
    return reply.status(saved.statusCode).send(saved.responseBody);
  });

  app.get('/api/v1/usage', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'viewer');
    if (!user) return reply;

    return {
      success: true,
      message: '操作成功',
      data: await repository.getUsageSummary(user.workspaceId)
    } satisfies ApiResponse<Awaited<ReturnType<Phase2Repository['getUsageSummary']>>>;
  });

  app.get('/api/v1/admin/ai-gateway/models', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'admin');
    if (!user) return reply;

    return {
      success: true,
      message: '操作成功',
      data: { models: await repository.listGatewayModels() }
    } satisfies ApiResponse<{ models: Awaited<ReturnType<Phase2Repository['listGatewayModels']>> }>;
  });

  app.post('/api/v1/admin/ai-gateway/models/sync', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'admin');
    if (!user) return reply;

    const context = createRequestContext(request, user);
    const idempotency = await readIdempotency(repository, request, context);
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) {
      return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    }
    if (!(await enforceProviderTaskRateLimit(reply, governance, user.workspaceId, user.id, 'gateway_model_sync'))) return reply;

    let createdBody: ApiResponse<{
      taskId: string;
      status: Phase2TaskStatus;
      progress: number;
      estimatedCredits: number;
    }> | undefined;
    let result: Awaited<ReturnType<Phase2Repository['createTaskWithIdempotency']>>;
    try {
      result = await repository.createTaskWithIdempotency(
        {
          workspaceId: user.workspaceId,
          kind: 'gateway_model_sync',
          estimatedCredits: 0,
          idempotencyKey: idempotency.key,
          requestHash: idempotency.requestHash
        },
        {
          workspaceId: user.workspaceId,
          method: request.method,
          route: getRouteKey(request),
          key: idempotency.key,
          requestHash: idempotency.requestHash,
          statusCode: 202,
          createdAt: new Date().toISOString()
        },
        (task) => {
          createdBody = {
            success: true,
            message: '模型目錄同步任務已建立',
            data: {
              taskId: task.id,
              status: task.status,
              progress: task.progress,
              estimatedCredits: task.estimatedCredits
            }
          };
          return { statusCode: 202, responseBody: createdBody };
        }
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'IDEMPOTENCY_KEY_REUSED') {
        return reply.status(409).send({
          success: false,
          message: 'Idempotency-Key 已用於其他請求',
          error: { code: 'IDEMPOTENCY_KEY_REUSED' }
        });
      }
      throw error;
    }
    if (result.replay) {
      return reply.status(result.replay.statusCode).send(result.replay.responseBody);
    }
    const task = result.task;
    if (!task || !createdBody) {
      throw new Error('PHASE2_TASK_CREATE_FAILED');
    }
    const body = createdBody;
    await repository.recordAudit({
      workspaceId: user.workspaceId,
      actorType: 'user',
      actorId: user.id,
      action: 'gateway.models.sync.requested',
      resourceType: 'phase2_task',
      resourceId: task.id,
      requestId: request.id
    });
    return reply.status(202).send(body);
  });

  app.get('/api/v1/admin/ai-gateway/profiles', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'admin');
    if (!user) return reply;

    const configured = await repository.listGatewayProfiles();
    const configuredByKey = new Map(configured.map((profile) => [profile.profileKey, profile]));
    return {
      success: true,
      message: '操作成功',
      data: {
        profiles: gatewayProfileKeys.map((profileKey) => configuredByKey.get(profileKey) ?? {
          profileKey,
          modelId: null,
          status: 'unconfigured'
        })
      }
    };
  });

  app.put('/api/v1/admin/ai-gateway/profiles/:profileKey', async (request, reply) => {
    const user = await requireRole(authService, request, reply, 'admin');
    if (!user) return reply;

    const parsedParams = gatewayProfileParamsSchema.safeParse(request.params);
    const parsedBody = gatewayProfileBodySchema.safeParse(request.body);
    if (!parsedParams.success || !parsedBody.success) {
      return reply.status(400).send({
        success: false,
        message: '模型 Profile 參數不正確',
        error: { code: 'VALIDATION_ERROR' }
      });
    }

    const context = createRequestContext(request, user);
    const idempotency = await readIdempotency(repository, request, context);
    if (sendIdempotencyError(reply, idempotency)) return reply;
    if (idempotency.existing) {
      return reply.status(idempotency.existing.statusCode).send(idempotency.existing.responseBody);
    }

    const model = (await repository.listGatewayModels()).find(
      (candidate) => candidate.modelId === parsedBody.data.modelId && candidate.capabilityStatus === 'verified'
    );
    if (!model) {
      const body = {
        success: false,
        message: '模型尚未通過 capability 驗證，暫時不能設為 Profile',
        error: { code: 'PROVIDER_UNAVAILABLE' }
      } satisfies ApiResponse<never>;
      await repository.saveIdempotency({
        workspaceId: user.workspaceId,
        method: request.method,
        route: getRouteKey(request),
        key: idempotency.key,
        requestHash: idempotency.requestHash,
        statusCode: 503,
        responseBody: body,
        createdAt: new Date().toISOString()
      });
      return reply.status(503).send(body);
    }

    const previous = (await repository.listGatewayProfiles()).find(
      (profile) => profile.profileKey === parsedParams.data.profileKey
    );
    const profile: GatewayModelProfile = {
      gateway: 'wenwen',
      profileKey: parsedParams.data.profileKey,
      modelId: model.modelId,
      version: (previous?.version ?? 0) + 1,
      status: 'active',
      updatedAt: new Date().toISOString(),
      updatedBy: user.id
    };
    const saved = await repository.saveGatewayProfile(profile);
    const body = {
      success: true,
      message: '模型 Profile 已更新',
      data: { profile: saved }
    } satisfies ApiResponse<{ profile: GatewayModelProfile }>;
    const persisted = await repository.saveIdempotency({
      workspaceId: user.workspaceId,
      method: request.method,
      route: getRouteKey(request),
      key: idempotency.key,
      requestHash: idempotency.requestHash,
      statusCode: 200,
      responseBody: body,
      createdAt: new Date().toISOString()
    });
    await repository.recordAudit({
      workspaceId: user.workspaceId,
      actorType: 'user',
      actorId: user.id,
      action: 'gateway.profile.updated',
      resourceType: 'gateway_model_profile',
      requestId: request.id,
      metadata: { profileKey: profile.profileKey, modelId: profile.modelId, version: profile.version }
    });
    return reply.status(persisted.statusCode).send(persisted.responseBody);
  });
}
