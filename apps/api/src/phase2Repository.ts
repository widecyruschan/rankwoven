import { randomUUID } from 'node:crypto';
import { Pool, type QueryResultRow } from 'pg';
import {
  assertTaskTransition,
  createInMemoryPhase2Repository,
  type AuditEvent,
  type CreateTaskInput,
  type GatewayModel,
  type GatewayPriceSnapshot,
  type GatewayModelProfile,
  type IdempotencyRecord,
  type EntitlementAssignment,
  type KeywordResearchProject,
  type KeywordResearchRun,
  type ContentOptimizationRun,
  type CreateKeywordResearchProjectInput,
  type PaginationInput,
  type Phase2Repository,
  type Phase2Task,
  type Phase2TaskStatus,
  type ReserveUsageInput,
  type TaskAttempt,
  type UsageLedgerEntry,
  type Phase2UsageSummary
} from '@aieo/ai-providers';

function mapTask(row: QueryResultRow): Phase2Task {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    siteId: row.site_id ?? undefined,
    kind: row.kind,
    status: row.status,
    progress: Number(row.progress),
    estimatedCredits: Number(row.estimated_credits),
    reservationId: row.reservation_id ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    requestHash: row.request_hash ?? undefined,
    result: row.result ?? undefined,
    errorCode: row.error_code ?? undefined,
    retryCount: Number(row.retry_count),
    maxRetries: Number(row.max_retries),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined
  };
}

function mapUsageEntry(row: QueryResultRow): UsageLedgerEntry {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    operation: row.operation,
    eventType: row.event_type,
    reservationId: row.reservation_id,
    provider: row.provider ?? undefined,
    gatewayModel: row.gateway_model ?? undefined,
    priceSnapshotId: row.price_snapshot_id ?? undefined,
    units: Number(row.units),
    costEstimate: Number(row.cost_estimate),
    actualCost: row.actual_cost === null ? undefined : Number(row.actual_cost),
    idempotencyKey: row.idempotency_key ?? undefined,
    createdAt: new Date(row.created_at).toISOString()
  };
}

function mapKeywordResearchProject(row: QueryResultRow): KeywordResearchProject {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    siteId: row.site_id,
    name: row.name,
    market: row.market,
    language: row.language,
    device: row.device,
    engine: row.engine,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapKeywordResearchRun(row: QueryResultRow): KeywordResearchRun {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    taskId: row.task_id ?? undefined,
    inputHash: row.input_hash,
    provider: row.provider,
    providerSnapshotId: row.provider_snapshot_id ?? undefined,
    status: row.status,
    costEstimate: Number(row.cost_estimate),
    actualCost: row.actual_cost === null ? undefined : Number(row.actual_cost),
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
    createdAt: new Date(row.created_at).toISOString()
  };
}

function mapContentOptimizationRun(row: QueryResultRow): ContentOptimizationRun {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    siteId: row.site_id,
    articleId: row.article_id === null ? undefined : Number(row.article_id),
    inputHash: row.input_hash,
    locale: row.locale,
    rulesVersion: row.rules_version,
    promptVersion: row.prompt_version,
    schemaVersion: row.schema_version,
    gatewayModel: row.gateway_model,
    taskId: row.task_id ?? undefined,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export class PostgresPhase2Repository implements Phase2Repository {
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async findIdempotency(input: Pick<IdempotencyRecord, 'workspaceId' | 'method' | 'route' | 'key'>) {
    const result = await this.pool.query(
      `
        SELECT workspace_id, method, route, idempotency_key, request_hash,
               status_code, response_body, created_at
        FROM idempotency_keys
        WHERE workspace_id = $1 AND method = $2 AND route = $3 AND idempotency_key = $4
        LIMIT 1
      `,
      [input.workspaceId, input.method, input.route, input.key]
    );
    const row = result.rows[0];
    if (!row) return undefined;

    return {
      workspaceId: row.workspace_id,
      method: row.method,
      route: row.route,
      key: row.idempotency_key,
      requestHash: row.request_hash,
      statusCode: Number(row.status_code),
      responseBody: row.response_body,
      createdAt: new Date(row.created_at).toISOString()
    } satisfies IdempotencyRecord;
  }

  async saveIdempotency(record: IdempotencyRecord) {
    const result = await this.pool.query(
      `
        INSERT INTO idempotency_keys (
          workspace_id, method, route, idempotency_key, request_hash,
          status_code, response_body, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
        ON CONFLICT (workspace_id, method, route, idempotency_key) DO NOTHING
        RETURNING workspace_id, method, route, idempotency_key, request_hash,
                  status_code, response_body, created_at
      `,
      [
        record.workspaceId,
        record.method,
        record.route,
        record.key,
        record.requestHash,
        record.statusCode,
        JSON.stringify(record.responseBody),
        record.createdAt
      ]
    );
    const row = result.rows[0];
    if (row) {
      return {
        workspaceId: row.workspace_id,
        method: row.method,
        route: row.route,
        key: row.idempotency_key,
        requestHash: row.request_hash,
        statusCode: Number(row.status_code),
        responseBody: row.response_body,
        createdAt: new Date(row.created_at).toISOString()
      } satisfies IdempotencyRecord;
    }

    const existing = await this.findIdempotency(record);
    if (!existing) throw new Error('IDEMPOTENCY_WRITE_CONFLICT');
    if (existing.requestHash !== record.requestHash) throw new Error('IDEMPOTENCY_KEY_REUSED');
    return existing;
  }

  async createTaskWithIdempotency(input: CreateTaskInput, record: Omit<IdempotencyRecord, 'responseBody'>, createResponse: (task: Phase2Task) => Pick<IdempotencyRecord, 'statusCode' | 'responseBody'>) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [`${record.workspaceId}:${record.method}:${record.route}:${record.key}`]
      );
      const existing = await client.query(
        `SELECT workspace_id, method, route, idempotency_key, request_hash, status_code, response_body, created_at FROM idempotency_keys WHERE workspace_id = $1 AND method = $2 AND route = $3 AND idempotency_key = $4 FOR UPDATE`,
        [record.workspaceId, record.method, record.route, record.key]
      );
      if (existing.rows[0]) {
        const row = existing.rows[0];
        if (row.request_hash !== record.requestHash) throw new Error('IDEMPOTENCY_KEY_REUSED');
        await client.query('COMMIT');
        return { replay: { workspaceId: row.workspace_id, method: row.method, route: row.route, key: row.idempotency_key, requestHash: row.request_hash, statusCode: Number(row.status_code), responseBody: row.response_body, createdAt: new Date(row.created_at).toISOString() } };
      }
      const taskResult = await client.query(
        `INSERT INTO phase2_tasks (id, workspace_id, site_id, kind, estimated_credits, reservation_id, idempotency_key, request_hash, max_retries) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [randomUUID(), input.workspaceId, input.siteId ?? null, input.kind, input.estimatedCredits, input.reservationId ?? null, input.idempotencyKey ?? null, input.requestHash ?? null, input.maxRetries ?? 3]
      );
      const task = mapTask(taskResult.rows[0]);
      const response = createResponse(task);
      await client.query(
        `INSERT INTO idempotency_keys (workspace_id, method, route, idempotency_key, request_hash, status_code, response_body, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
        [record.workspaceId, record.method, record.route, record.key, record.requestHash, response.statusCode, JSON.stringify(response.responseBody), record.createdAt]
      );
      await client.query('COMMIT');
      return { task };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createTask(input: CreateTaskInput) {
    const result = await this.pool.query(
      `
        INSERT INTO phase2_tasks (
          id, workspace_id, site_id, kind, estimated_credits, reservation_id,
          idempotency_key, request_hash, max_retries
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
      [
        randomUUID(),
        input.workspaceId,
        input.siteId ?? null,
        input.kind,
        input.estimatedCredits,
        input.reservationId ?? null,
        input.idempotencyKey ?? null,
        input.requestHash ?? null,
        input.maxRetries ?? 3
      ]
    );
    return mapTask(result.rows[0]);
  }

  async findTask(taskId: string, workspaceId: string) {
    const result = await this.pool.query(
      `SELECT * FROM phase2_tasks WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [taskId, workspaceId]
    );
    return result.rows[0] ? mapTask(result.rows[0]) : undefined;
  }

  async transitionTask(
    taskId: string,
    workspaceId: string,
    from: Phase2TaskStatus,
    to: Phase2TaskStatus,
    patch: Partial<Pick<Phase2Task, 'progress' | 'result' | 'errorCode' | 'retryCount'>> = {}
  ) {
    assertTaskTransition(from, to);
    const completed = ['completed', 'failed', 'cancelled', 'expired', 'dead_letter'].includes(to);
    const result = await this.pool.query(
      `
        UPDATE phase2_tasks
        SET status = $4,
            progress = COALESCE($5, progress),
            result = COALESCE($6::jsonb, result),
            error_code = COALESCE($7, error_code),
            retry_count = COALESCE($8, retry_count),
            updated_at = now(),
            completed_at = CASE WHEN $9 THEN COALESCE(completed_at, now()) ELSE NULL END
        WHERE id = $1 AND workspace_id = $2 AND status = $3
        RETURNING *
      `,
      [
        taskId,
        workspaceId,
        from,
        to,
        patch.progress ?? null,
        patch.result ? JSON.stringify(patch.result) : null,
        patch.errorCode ?? null,
        patch.retryCount ?? null,
        completed
      ]
    );
    return result.rows[0] ? mapTask(result.rows[0]) : undefined;
  }

  async reserveUsage(input: ReserveUsageInput) {
    const result = await this.pool.query(
      `
        INSERT INTO usage_ledger (
          id, workspace_id, operation, event_type, reservation_id, provider,
          gateway_model, price_snapshot_id, units, cost_estimate, idempotency_key
        ) VALUES ($1, $2, $3, 'reserve', $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (workspace_id, idempotency_key)
          WHERE idempotency_key IS NOT NULL
          DO NOTHING
        RETURNING *
      `,
      [
        randomUUID(),
        input.workspaceId,
        input.operation,
        input.reservationId ?? randomUUID(),
        input.provider ?? null,
        input.gatewayModel ?? null,
        input.priceSnapshotId ?? null,
        input.units,
        input.costEstimate,
        input.idempotencyKey ?? null
      ]
    );
    if (result.rows[0]) return mapUsageEntry(result.rows[0]);
    const existing = await this.pool.query(
      `
        SELECT * FROM usage_ledger
        WHERE workspace_id = $1 AND idempotency_key = $2 AND event_type = 'reserve'
        LIMIT 1
      `,
      [input.workspaceId, input.idempotencyKey]
    );
    if (!existing.rows[0]) throw new Error('USAGE_RESERVATION_CONFLICT');
    return mapUsageEntry(existing.rows[0]);
  }

  async finalizeUsage(workspaceId: string, reservationId: string, actualCost: number) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const reserved = await client.query(
        `SELECT * FROM usage_ledger WHERE workspace_id = $1 AND reservation_id = $2 AND event_type = 'reserve' FOR UPDATE`,
        [workspaceId, reservationId]
      );
      if (!reserved.rows[0]) {
        await client.query('ROLLBACK');
        return undefined;
      }
      const existing = await client.query(
        `SELECT 1 FROM usage_ledger WHERE workspace_id = $1 AND reservation_id = $2 AND event_type <> 'reserve' LIMIT 1`,
        [workspaceId, reservationId]
      );
      if (existing.rows[0]) {
        await client.query('ROLLBACK');
        return undefined;
      }
      const inserted = await client.query(
        `
          INSERT INTO usage_ledger (
            id, workspace_id, operation, event_type, reservation_id, provider,
            gateway_model, price_snapshot_id, units, cost_estimate, actual_cost
          )
          SELECT $1, workspace_id, operation, 'finalize', reservation_id, provider,
                 gateway_model, price_snapshot_id, units, cost_estimate, $2
          FROM usage_ledger
          WHERE workspace_id = $3 AND reservation_id = $4 AND event_type = 'reserve'
          RETURNING *
        `,
        [randomUUID(), actualCost, workspaceId, reservationId]
      );
      await client.query('COMMIT');
      return mapUsageEntry(inserted.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async releaseUsage(workspaceId: string, reservationId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const reserved = await client.query(
        `SELECT * FROM usage_ledger WHERE workspace_id = $1 AND reservation_id = $2 AND event_type = 'reserve' FOR UPDATE`,
        [workspaceId, reservationId]
      );
      if (!reserved.rows[0]) {
        await client.query('ROLLBACK');
        return undefined;
      }
      const existing = await client.query(
        `SELECT 1 FROM usage_ledger WHERE workspace_id = $1 AND reservation_id = $2 AND event_type <> 'reserve' LIMIT 1`,
        [workspaceId, reservationId]
      );
      if (existing.rows[0]) {
        await client.query('ROLLBACK');
        return undefined;
      }
      const inserted = await client.query(
        `
          INSERT INTO usage_ledger (
            id, workspace_id, operation, event_type, reservation_id, provider,
            gateway_model, price_snapshot_id, units, cost_estimate, actual_cost
          )
          SELECT $1, workspace_id, operation, 'release', reservation_id, provider,
                 gateway_model, price_snapshot_id, units, cost_estimate, 0
          FROM usage_ledger
          WHERE workspace_id = $2 AND reservation_id = $3 AND event_type = 'reserve'
          RETURNING *
        `,
        [randomUUID(), workspaceId, reservationId]
      );
      await client.query('COMMIT');
      return mapUsageEntry(inserted.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUsageSummary(workspaceId: string): Promise<Phase2UsageSummary> {
    const result = await this.pool.query(
      `
        SELECT
          COALESCE(SUM(CASE WHEN event_type = 'reserve' THEN units ELSE 0 END), 0) AS reserved_units,
          COALESCE(SUM(CASE WHEN event_type = 'reserve' THEN cost_estimate ELSE 0 END), 0) AS reserved_cost,
          COALESCE(SUM(CASE WHEN event_type = 'finalize' THEN actual_cost ELSE 0 END), 0) AS finalized_cost,
          COALESCE(SUM(CASE WHEN event_type = 'release' THEN cost_estimate ELSE 0 END), 0) AS released_cost
        FROM usage_ledger
        WHERE workspace_id = $1
      `,
      [workspaceId]
    );
    const row = result.rows[0];
    return {
      reservedUnits: Number(row.reserved_units),
      reservedCost: Number(row.reserved_cost),
      finalizedCost: Number(row.finalized_cost),
      releasedCost: Number(row.released_cost)
    };
  }

  async getPeriodUsageUnits(workspaceId: string, operation: string, period: EntitlementAssignment['period']) {
    const result = await this.pool.query(
      `
        SELECT COALESCE(SUM(units), 0) AS units
        FROM usage_ledger ledger
        WHERE workspace_id = $1
          AND operation = $2
          AND event_type = 'reserve'
          AND created_at >= CASE $3
            WHEN 'daily' THEN date_trunc('day', now())
            WHEN 'monthly' THEN date_trunc('month', now())
            ELSE '-infinity'::timestamptz
          END
      `,
      [workspaceId, operation, period]
    );
    return Number(result.rows[0].units);
  }

  async findActiveEntitlement(workspaceId: string, featureKey: string) {
    const result = await this.pool.query(
      `
        SELECT id, workspace_id, feature_key, limit_value, period, source, effective_at, expires_at
        FROM entitlement_assignments
        WHERE workspace_id = $1
          AND feature_key = $2
          AND effective_at <= now()
          AND (expires_at IS NULL OR expires_at > now())
        ORDER BY effective_at DESC
        LIMIT 1
      `,
      [workspaceId, featureKey]
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      featureKey: row.feature_key,
      limitValue: Number(row.limit_value),
      period: row.period,
      source: row.source,
      effectiveAt: new Date(row.effective_at).toISOString(),
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : undefined
    } satisfies EntitlementAssignment;
  }

  async findActiveGatewayPriceSnapshot(modelId: string) {
    const result = await this.pool.query(
      `
        SELECT * FROM gateway_price_snapshots
        WHERE gateway = 'wenwen'
          AND model_id = $1
          AND effective_at <= now()
        ORDER BY effective_at DESC
        LIMIT 1
      `,
      [modelId]
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      gateway: row.gateway,
      modelId: row.model_id,
      inputPrice: row.input_price === null ? undefined : Number(row.input_price),
      outputPrice: row.output_price === null ? undefined : Number(row.output_price),
      imagePrice: row.image_price === null ? undefined : Number(row.image_price),
      currency: row.currency,
      effectiveAt: new Date(row.effective_at).toISOString(),
      verifiedAt: new Date(row.verified_at).toISOString(),
      sourceRef: row.source_ref
    };
  }

  async createKeywordResearchProject(input: CreateKeywordResearchProjectInput) {
    const result = await this.pool.query(
      `
        INSERT INTO keyword_research_projects (
          id, workspace_id, site_id, name, market, language, device, engine, status
        )
        SELECT $1, $2, sc.id, $3, $4, $5, $6, $7, 'draft'
        FROM site_connections sc
        WHERE sc.id = $8 AND sc.workspace_id = $2
        ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id
        RETURNING *
      `,
      [
        input.id ?? randomUUID(),
        input.workspaceId,
        input.name,
        input.market,
        input.language,
        input.device ?? 'desktop',
        input.engine ?? 'google',
        input.siteId
      ]
    );
    if (!result.rows[0]) throw new Error('WORKSPACE_RESOURCE_NOT_FOUND');
    return mapKeywordResearchProject(result.rows[0]);
  }

  async listKeywordResearchProjects(workspaceId: string, pagination: Required<PaginationInput>) {
    const offset = (pagination.page - 1) * pagination.pageSize;
    const [items, count] = await Promise.all([
      this.pool.query(
        `
          SELECT * FROM keyword_research_projects
          WHERE workspace_id = $1
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3
        `,
        [workspaceId, pagination.pageSize, offset]
      ),
      this.pool.query(`SELECT COUNT(*)::int AS total FROM keyword_research_projects WHERE workspace_id = $1`, [workspaceId])
    ]);
    const total = Number(count.rows[0].total);
    return {
      items: items.rows.map(mapKeywordResearchProject),
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pagination.pageSize)
      }
    };
  }

  async findKeywordResearchProject(projectId: string, workspaceId: string) {
    const result = await this.pool.query(
      `SELECT * FROM keyword_research_projects WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [projectId, workspaceId]
    );
    return result.rows[0] ? mapKeywordResearchProject(result.rows[0]) : undefined;
  }

  async createKeywordResearchRun(input: Omit<KeywordResearchRun, 'id' | 'createdAt'>) {
    const result = await this.pool.query(
      `
        INSERT INTO keyword_research_runs (
          id, workspace_id, project_id, task_id, input_hash, provider,
          provider_snapshot_id, status, cost_estimate, actual_cost, started_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT DO NOTHING
        RETURNING *
      `,
      [
        randomUUID(),
        input.workspaceId,
        input.projectId,
        input.taskId ?? null,
        input.inputHash,
        input.provider,
        input.providerSnapshotId ?? null,
        input.status,
        input.costEstimate,
        input.actualCost ?? null,
        input.startedAt ?? null,
        input.completedAt ?? null
      ]
    );
    if (result.rows[0]) return mapKeywordResearchRun(result.rows[0]);
    const existing = await this.pool.query(
      `
        SELECT * FROM keyword_research_runs
        WHERE project_id = $1
          AND input_hash = $2
          AND provider = $3
          AND COALESCE(provider_snapshot_id, '') = COALESCE($4, '')
        LIMIT 1
      `,
      [input.projectId, input.inputHash, input.provider, input.providerSnapshotId ?? null]
    );
    if (!existing.rows[0]) throw new Error('KEYWORD_RESEARCH_RUN_CONFLICT');
    return mapKeywordResearchRun(existing.rows[0]);
  }

  async findKeywordResearchRun(runId: string, workspaceId: string) {
    const result = await this.pool.query(
      `SELECT * FROM keyword_research_runs WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [runId, workspaceId]
    );
    return result.rows[0] ? mapKeywordResearchRun(result.rows[0]) : undefined;
  }

  async createContentOptimizationRun(input: Omit<ContentOptimizationRun, 'id' | 'createdAt' | 'updatedAt'>) {
    const result = await this.pool.query(
      `
        INSERT INTO content_optimization_runs (
          id, workspace_id, site_id, article_id, input_hash, locale,
          rules_version, prompt_version, schema_version, gateway_model, task_id, status
        )
        SELECT $1, $2, sc.id, $3, $4, $5, $6, $7, $8, $9, $10, $11
        FROM site_connections sc
        WHERE sc.id = $12 AND sc.workspace_id = $2
        RETURNING *
      `,
      [
        randomUUID(),
        input.workspaceId,
        input.articleId ?? null,
        input.inputHash,
        input.locale,
        input.rulesVersion,
        input.promptVersion,
        input.schemaVersion,
        input.gatewayModel,
        input.taskId ?? null,
        input.status,
        input.siteId
      ]
    );
    if (!result.rows[0]) throw new Error('WORKSPACE_RESOURCE_NOT_FOUND');
    return mapContentOptimizationRun(result.rows[0]);
  }

  async findContentOptimizationRun(runId: string, workspaceId: string) {
    const result = await this.pool.query(
      `SELECT * FROM content_optimization_runs WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [runId, workspaceId]
    );
    return result.rows[0] ? mapContentOptimizationRun(result.rows[0]) : undefined;
  }

  async recordAttempt(input: Omit<TaskAttempt, 'id'>) {
    const result = await this.pool.query(
      `
        INSERT INTO task_attempts (
          id, task_id, workspace_id, attempt_no, status, provider_request_id, error_code,
          started_at, completed_at, cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
        [
        randomUUID(),
        input.taskId,
        input.workspaceId,
        input.attemptNo,
        input.status,
        input.providerRequestId ?? null,
        input.errorCode ?? null,
        input.startedAt,
        input.completedAt ?? null,
        input.cost ?? null
      ]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      taskId: row.task_id,
      workspaceId: input.workspaceId,
      attemptNo: Number(row.attempt_no),
      status: row.status,
      providerRequestId: row.provider_request_id ?? undefined,
      errorCode: row.error_code ?? undefined,
      startedAt: new Date(row.started_at).toISOString(),
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
      cost: row.cost === null ? undefined : Number(row.cost)
    } satisfies TaskAttempt;
  }

  async recordAudit(input: Omit<AuditEvent, 'id' | 'createdAt'> & { createdAt?: string }) {
    const id = randomUUID();
    const createdAt = input.createdAt ?? new Date().toISOString();
    const result = await this.pool.query(
      `
        INSERT INTO audit_events (
          id, workspace_id, actor_type, actor_id, action, resource_type,
          resource_id, request_id, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
        RETURNING *
      `,
      [
        id,
        input.workspaceId,
        input.actorType,
        input.actorId ?? null,
        input.action,
        input.resourceType,
        input.resourceId ?? null,
        input.requestId ?? null,
        JSON.stringify(input.metadata ?? {}),
        createdAt
      ]
    );
    const row = result.rows[0];
    return {
      ...input,
      id: row.id,
      createdAt: new Date(row.created_at).toISOString()
    } satisfies AuditEvent;
  }

  async listGatewayModels() {
    const result = await this.pool.query(
      `
        SELECT DISTINCT ON (model_id) *
        FROM gateway_model_catalog
        ORDER BY model_id ASC, verified_at DESC NULLS LAST
      `
    );
    return result.rows.map((row) => ({
      gateway: row.gateway,
      modelId: row.model_id,
      ownedBy: row.owned_by ?? undefined,
      supportedEndpointTypes: row.supported_endpoint_types,
      capabilityStatus: row.capability_status,
      catalogHash: row.catalog_hash,
      verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : undefined
    })) as GatewayModel[];
  }

  async listGatewayProfiles() {
    const result = await this.pool.query(
      `SELECT gateway, profile_key, model_id, version, status, updated_at, updated_by FROM gateway_model_profiles ORDER BY profile_key ASC`
    );
    return result.rows.map((row) => ({
      gateway: row.gateway,
      profileKey: row.profile_key,
      modelId: row.model_id,
      version: Number(row.version),
      status: row.status,
      updatedAt: new Date(row.updated_at).toISOString(),
      updatedBy: row.updated_by ?? undefined
    })) as GatewayModelProfile[];
  }

  async saveGatewayProfile(profile: GatewayModelProfile) {
    const result = await this.pool.query(
      `
        INSERT INTO gateway_model_profiles (
          gateway, profile_key, model_id, version, status, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (gateway, profile_key) DO UPDATE SET
          model_id = EXCLUDED.model_id,
          version = EXCLUDED.version,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
        RETURNING gateway, profile_key, model_id, version, status, updated_at, updated_by
      `,
      [
        profile.gateway,
        profile.profileKey,
        profile.modelId,
        profile.version,
        profile.status,
        profile.updatedAt,
        profile.updatedBy ?? null
      ]
    );
    const row = result.rows[0];
    return {
      gateway: row.gateway,
      profileKey: row.profile_key,
      modelId: row.model_id,
      version: Number(row.version),
      status: row.status,
      updatedAt: new Date(row.updated_at).toISOString(),
      updatedBy: row.updated_by ?? undefined
    } satisfies GatewayModelProfile;
  }

  async saveGatewayPriceSnapshot(snapshot: GatewayPriceSnapshot) {
    await this.pool.query(
      `
        INSERT INTO gateway_price_snapshots (
          id, gateway, model_id, input_price, output_price, image_price,
          currency, effective_at, verified_at, source_ref
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (gateway, model_id, effective_at) DO NOTHING
      `,
      [
        snapshot.id,
        snapshot.gateway,
        snapshot.modelId,
        snapshot.inputPrice ?? null,
        snapshot.outputPrice ?? null,
        snapshot.imagePrice ?? null,
        snapshot.currency,
        snapshot.effectiveAt,
        snapshot.verifiedAt,
        snapshot.sourceRef
      ]
    );
  }

  async close() {
    await this.pool.end();
  }
}

export function createDefaultPhase2Repository(databaseUrl?: string): Phase2Repository {
  return databaseUrl ? new PostgresPhase2Repository(databaseUrl) : createInMemoryPhase2Repository();
}
