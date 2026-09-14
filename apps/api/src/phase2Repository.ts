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
  type KeywordCandidate,
  type KeywordMetric,
  type KeywordObservation,
  type KeywordGapSnapshot,
  type CreateKeywordCandidateInput,
  type CreateKeywordMetricInput,
  type CreateKeywordObservationInput,
  type CreateKeywordGapSnapshotInput,
  type CreateKeywordResearchRunInput,
  type KeywordCandidateFilters,
  type KeywordGapFilters,
  type ContentBrief,
  type CreateContentBriefInput,
  type ContentOptimizationRun,
  type ContentOptimizationSnapshot,
  type ContentScoreCheckRecord,
  type ContentClaim,
  type ContentRewriteSuggestion,
  type EnqueueContentOptimizationRunInput,
  type CreateKeywordResearchProjectInput,
  type PaginationInput,
  type Phase2Repository,
  type Phase2Task,
  type Phase2TaskStatus,
  type ReserveUsageInput,
  type TaskAttempt,
  type UsageLedgerEntry,
  type Phase2UsageSummary,
  type EnqueueCostedTaskInput,
  type EnqueueKeywordResearchRunInput,
  type DeadLetterAction,
  createPagination
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
    providerKey: row.provider_key ?? undefined,
    availableAt: new Date(row.available_at ?? row.created_at).toISOString(),
    leaseOwner: row.lease_owner ?? undefined,
    leaseExpiresAt: row.lease_expires_at ? new Date(row.lease_expires_at).toISOString() : undefined,
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : undefined,
    deadlineAt: row.deadline_at ? new Date(row.deadline_at).toISOString() : undefined,
    cancellationRequestedAt: row.cancellation_requested_at ? new Date(row.cancellation_requested_at).toISOString() : undefined,
    requestId: row.request_id ?? undefined,
    replayOfTaskId: row.replay_of_task_id ?? undefined,
    priority: Number(row.priority ?? 50),
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
    taskId: row.task_id ?? undefined,
    requestId: row.request_id ?? undefined,
    units: Number(row.units),
    costEstimate: Number(row.cost_estimate),
    actualCost: row.actual_cost === null ? undefined : Number(row.actual_cost),
    idempotencyKey: row.idempotency_key ?? undefined,
    createdAt: new Date(row.created_at).toISOString()
  };
}

function mapDeadLetterAction(row: QueryResultRow): DeadLetterAction {
  return {
    id: row.id,
    taskId: row.task_id,
    workspaceId: row.workspace_id,
    action: row.action,
    actorId: row.actor_id,
    replacementTaskId: row.replacement_task_id ?? undefined,
    reason: row.reason,
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
    requestContextHash: row.request_context_hash ?? undefined,
    providerMethodologyVersion: row.provider_methodology_version ?? undefined,
    collectedAt: row.collected_at ? new Date(row.collected_at).toISOString() : undefined,
    partialReason: row.partial_reason ?? undefined,
    seedKeywords: Array.isArray(row.seed_keywords) ? row.seed_keywords : [],
    ownDomain: row.own_domain ?? undefined,
    competitorDomains: Array.isArray(row.competitor_domains) ? row.competitor_domains : [],
    locale: row.locale ?? undefined,
    productContext: row.product_context ?? undefined,
    audience: row.audience ?? undefined,
    conversionGoal: row.conversion_goal ?? undefined,
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
    createdAt: new Date(row.created_at).toISOString()
  };
}

function mapKeywordCandidate(row: QueryResultRow): KeywordCandidate {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    normalizedKeyword: row.normalized_keyword,
    displayKeyword: row.display_keyword,
    locale: row.locale,
    intent: row.intent ?? undefined,
    clusterId: row.cluster_id ?? undefined,
    sourceType: row.source_type,
    sourceRef: row.source_ref ?? undefined,
    volume: row.volume === null ? undefined : Number(row.volume),
    cpc: row.cpc === null ? undefined : Number(row.cpc),
    difficulty: row.difficulty === null ? undefined : Number(row.difficulty),
    confidence: row.confidence === null ? undefined : Number(row.confidence),
    opportunityScore: row.opportunity_score === null ? undefined : Number(row.opportunity_score),
    scoreConfidence: row.score_confidence === null ? undefined : Number(row.score_confidence),
    modelVersion: row.model_version ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapKeywordMetric(row: QueryResultRow): KeywordMetric {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    runId: row.run_id,
    candidateId: row.candidate_id,
    metricName: row.metric_name,
    numericValue: row.numeric_value === null ? undefined : Number(row.numeric_value),
    provider: row.provider ?? undefined,
    sourceType: row.source_type,
    providerSnapshotId: row.provider_snapshot_id ?? undefined,
    location: row.location ?? undefined,
    language: row.language ?? undefined,
    device: row.device ?? undefined,
    collectedAt: new Date(row.collected_at).toISOString(),
    providerUpdatedAt: row.provider_updated_at ? new Date(row.provider_updated_at).toISOString() : undefined,
    methodologyVersion: row.methodology_version ?? undefined,
    confidence: row.confidence === null ? undefined : Number(row.confidence),
    rawResponseRef: row.raw_response_ref ?? undefined
  };
}

function mapKeywordObservation(row: QueryResultRow): KeywordObservation {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    runId: row.run_id,
    candidateId: row.candidate_id,
    domainType: row.domain_type,
    competitorId: row.competitor_id ?? undefined,
    domain: row.domain,
    rank: row.rank === null ? undefined : Number(row.rank),
    url: row.url ?? undefined,
    etv: row.etv === null ? undefined : Number(row.etv),
    serpFeatures: Array.isArray(row.serp_features) ? row.serp_features : [],
    sourceType: row.source_type,
    provider: row.provider,
    providerSnapshotId: row.provider_snapshot_id ?? undefined,
    collectedAt: new Date(row.collected_at).toISOString()
  };
}

function mapKeywordGapSnapshot(row: QueryResultRow): KeywordGapSnapshot {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    runId: row.run_id,
    candidateId: row.candidate_id,
    classification: row.classification,
    ownBestRank: row.own_best_rank === null ? undefined : Number(row.own_best_rank),
    competitorBestRank: row.competitor_best_rank === null ? undefined : Number(row.competitor_best_rank),
    competitorIds: Array.isArray(row.competitor_ids) ? row.competitor_ids : [],
    evidenceRefs: Array.isArray(row.evidence_refs) ? row.evidence_refs : [],
    score: row.score === null ? undefined : Number(row.score),
    scoreConfidence: row.score_confidence === null ? undefined : Number(row.score_confidence),
    provider: row.provider,
    providerSnapshotId: row.provider_snapshot_id ?? undefined,
    collectedAt: new Date(row.collected_at).toISOString()
  };
}

function mapContentBrief(row: QueryResultRow): ContentBrief {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    primaryKeywordId: row.primary_keyword_id,
    audience: row.audience ?? undefined,
    locale: row.locale,
    secondaryKeywords: Array.isArray(row.secondary_keywords) ? row.secondary_keywords : [],
    outline: Array.isArray(row.outline) ? row.outline : [],
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
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
    sourceKind: row.source_kind ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    contentLocale: row.content_locale ?? undefined,
    targetMarket: row.target_market ?? undefined,
    dialect: row.dialect ?? undefined,
    focusKeyword: row.focus_keyword ?? undefined,
    secondaryKeywords: Array.isArray(row.secondary_keywords) ? row.secondary_keywords : [],
    score: row.score === null || row.score === undefined ? undefined : Number(row.score),
    confidence: row.confidence === null || row.confidence === undefined ? undefined : Number(row.confidence),
    parentRunId: row.parent_run_id ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapContentSnapshot(row: QueryResultRow): ContentOptimizationSnapshot {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    runId: row.run_id,
    sourceKind: row.source_kind,
    sourceUrl: row.source_url ?? undefined,
    contentText: row.content_text,
    contentHash: row.content_hash,
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    capturedAt: new Date(row.captured_at).toISOString()
  };
}

function mapContentScoreCheck(row: QueryResultRow): ContentScoreCheckRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    runId: row.run_id,
    code: row.code,
    dimension: row.dimension,
    sourceType: row.source_type,
    status: row.status,
    weight: Number(row.weight),
    score: row.score === null ? undefined : Number(row.score),
    evidence: row.evidence ?? undefined,
    evidenceJson: row.evidence_json && typeof row.evidence_json === 'object' ? row.evidence_json : {},
    recommendation: row.recommendation ?? undefined
  };
}

function mapContentClaim(row: QueryResultRow): ContentClaim {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    runId: row.run_id,
    claimText: row.claim_text,
    sourceUrl: row.source_url ?? undefined,
    sourceTitle: row.source_title ?? undefined,
    sourceHash: row.source_hash ?? undefined,
    sourceExcerptHash: row.source_excerpt_hash ?? undefined,
    sourceType: row.source_type,
    verificationStatus: row.verification_status,
    blockedReason: row.blocked_reason ?? undefined
  };
}

function mapContentRewriteSuggestion(row: QueryResultRow): ContentRewriteSuggestion {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    runId: row.run_id,
    taskId: row.task_id ?? undefined,
    scope: row.scope,
    selector: row.selector ?? undefined,
    beforeText: row.before_text,
    beforeHash: row.before_hash,
    suggestedText: row.suggested_text ?? undefined,
    diff: row.diff && typeof row.diff === 'object' ? row.diff : {},
    riskFlags: Array.isArray(row.risk_flags) ? row.risk_flags : [],
    status: row.status,
    revision: Number(row.revision),
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
        `INSERT INTO phase2_tasks (
          id, workspace_id, site_id, kind, estimated_credits, reservation_id,
          idempotency_key, request_hash, max_retries, provider_key, available_at,
          deadline_at, request_id, replay_of_task_id, priority
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11::timestamptz, now()), $12, $13, $14, $15) RETURNING *`,
        [
          randomUUID(), input.workspaceId, input.siteId ?? null, input.kind, input.estimatedCredits,
          input.reservationId ?? null, input.idempotencyKey ?? null, input.requestHash ?? null,
          input.maxRetries ?? 3, input.providerKey ?? null, input.availableAt ?? null,
          input.deadlineAt ?? null, input.requestId ?? null, input.replayOfTaskId ?? null, input.priority ?? 50
        ]
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

  async enqueueCostedTask(
    input: EnqueueCostedTaskInput,
    createResponse: (task: Phase2Task) => Pick<IdempotencyRecord, 'statusCode' | 'responseBody'>
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [`${input.record.workspaceId}:${input.record.method}:${input.record.route}:${input.record.key}`]
      );
      const existing = await client.query(
        `SELECT workspace_id, method, route, idempotency_key, request_hash, status_code, response_body, created_at
         FROM idempotency_keys
         WHERE workspace_id = $1 AND method = $2 AND route = $3 AND idempotency_key = $4
         FOR UPDATE`,
        [input.record.workspaceId, input.record.method, input.record.route, input.record.key]
      );
      if (existing.rows[0]) {
        const row = existing.rows[0];
        if (row.request_hash !== input.record.requestHash) throw new Error('IDEMPOTENCY_KEY_REUSED');
        await client.query('COMMIT');
        return {
          replay: {
            workspaceId: row.workspace_id,
            method: row.method,
            route: row.route,
            key: row.idempotency_key,
            requestHash: row.request_hash,
            statusCode: Number(row.status_code),
            responseBody: row.response_body,
            createdAt: new Date(row.created_at).toISOString()
          }
        };
      }

      await client.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [`${input.workspaceId}:${input.featureKey}:quota`]
      );
      const entitlementResult = await client.query(
        `SELECT id, workspace_id, feature_key, limit_value, period, source, effective_at, expires_at
         FROM entitlement_assignments
         WHERE workspace_id = $1 AND feature_key = $2
           AND effective_at <= now() AND (expires_at IS NULL OR expires_at > now())
         ORDER BY effective_at DESC
         LIMIT 1
         FOR UPDATE`,
        [input.workspaceId, input.featureKey]
      );
      const entitlement = entitlementResult.rows[0];
      if (!entitlement) throw new Error('ENTITLEMENT_REQUIRED');
      const usageResult = await client.query(
        `WITH period_ledger AS (
           SELECT *
           FROM usage_ledger
           WHERE workspace_id = $1 AND operation = $2
             AND created_at >= CASE $3
               WHEN 'daily' THEN date_trunc('day', now())
               WHEN 'monthly' THEN date_trunc('month', now())
               ELSE '-infinity'::timestamptz
             END
         ), active_reservations AS (
           SELECT reserve.reservation_id
           FROM period_ledger reserve
           WHERE reserve.event_type = 'reserve'
             AND NOT EXISTS (
               SELECT 1 FROM usage_ledger terminal
               WHERE terminal.workspace_id = reserve.workspace_id
                 AND terminal.reservation_id = reserve.reservation_id
                 AND terminal.event_type IN ('finalize', 'release')
             )
         )
         SELECT COALESCE(SUM(CASE
           WHEN event_type = 'finalize' THEN units
           WHEN event_type = 'reserve' AND reservation_id IN (SELECT reservation_id FROM active_reservations) THEN units
           ELSE 0
         END), 0) AS units
         FROM period_ledger`,
        [input.workspaceId, input.operation, entitlement.period]
      );
      if (Number(usageResult.rows[0].units) + input.units > Number(entitlement.limit_value)) {
        throw new Error('QUOTA_EXCEEDED');
      }

      const taskId = randomUUID();
      const reservationId = randomUUID();
      await client.query(
        `INSERT INTO usage_ledger (
           id, workspace_id, operation, event_type, reservation_id, provider,
           gateway_model, price_snapshot_id, task_id, request_id, units, cost_estimate, idempotency_key
         ) VALUES ($1, $2, $3, 'reserve', $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          randomUUID(), input.workspaceId, input.operation, reservationId, input.provider ?? null,
          input.gatewayModel ?? null, input.priceSnapshotId ?? null, taskId, input.requestId ?? null,
          input.units, input.costEstimate, `usage:${input.record.key}`
        ]
      );
      const taskResult = await client.query(
        `INSERT INTO phase2_tasks (
           id, workspace_id, site_id, kind, estimated_credits, reservation_id,
           idempotency_key, request_hash, max_retries, provider_key, available_at,
           deadline_at, request_id, replay_of_task_id, priority
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11::timestamptz, now()), $12, $13, $14, $15)
         RETURNING *`,
        [
          taskId, input.workspaceId, input.siteId ?? null, input.kind, input.estimatedCredits,
          reservationId, input.idempotencyKey ?? input.record.key, input.requestHash ?? input.record.requestHash,
          input.maxRetries ?? 3, input.providerKey ?? input.provider ?? null, input.availableAt ?? null,
          input.deadlineAt ?? null, input.requestId ?? null, input.replayOfTaskId ?? null, input.priority ?? 50
        ]
      );
      const task = mapTask(taskResult.rows[0]);
      const response = createResponse(task);
      await client.query(
        `INSERT INTO idempotency_keys (
           workspace_id, method, route, idempotency_key, request_hash,
           status_code, response_body, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
        [
          input.record.workspaceId, input.record.method, input.record.route, input.record.key,
          input.record.requestHash, response.statusCode, JSON.stringify(response.responseBody), input.record.createdAt
        ]
      );
      if (input.actorId) {
        await client.query(
          `INSERT INTO audit_events (
             id, workspace_id, actor_type, actor_id, action, resource_type,
             resource_id, request_id, metadata
           ) VALUES ($1, $2, 'user', $3, 'task.enqueued', 'phase2_task', $4, $5, $6::jsonb)`,
          [randomUUID(), input.workspaceId, input.actorId, taskId, input.requestId ?? null, JSON.stringify({ operation: input.operation })]
        );
      }
      await client.query('COMMIT');
      return { task };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async enqueueKeywordResearchRun(
    input: EnqueueKeywordResearchRunInput,
    createResponse: (task: Phase2Task, run: KeywordResearchRun) => Pick<IdempotencyRecord, 'statusCode' | 'responseBody'>
  ) {
    const runId = randomUUID();
    const result = await this.enqueueCostedTask({
      ...input,
      kind: 'keyword_research',
      providerKey: input.providerKey ?? input.provider
    }, (task) => createResponse(task, {
      id: runId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      taskId: task.id,
      inputHash: input.requestHash ?? input.record.requestHash,
      provider: input.provider as KeywordResearchRun['provider'],
      providerSnapshotId: input.providerSnapshotId,
      status: 'queued',
      costEstimate: input.costEstimate,
      requestContextHash: input.requestContextHash,
      providerMethodologyVersion: input.providerMethodologyVersion,
      seedKeywords: input.seedKeywords,
      ownDomain: input.ownDomain,
      competitorDomains: input.competitorDomains,
      locale: input.locale,
      productContext: input.productContext,
      audience: input.audience,
      conversionGoal: input.conversionGoal,
      createdAt: new Date().toISOString()
    }));
    if (result.replay) return { replay: result.replay };
    if (!result.task) return result;
    const run = await this.createKeywordResearchRun({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      taskId: result.task.id,
      inputHash: input.requestHash ?? input.record.requestHash,
      requestContextHash: input.requestContextHash,
      provider: input.provider as KeywordResearchRun['provider'],
      providerSnapshotId: input.providerSnapshotId,
      providerMethodologyVersion: input.providerMethodologyVersion,
      status: 'queued',
      costEstimate: input.costEstimate,
      collectedAt: input.collectedAt,
      partialReason: undefined,
      seedKeywords: input.seedKeywords,
      ownDomain: input.ownDomain,
      competitorDomains: input.competitorDomains,
      locale: input.locale,
      productContext: input.productContext,
      audience: input.audience,
      conversionGoal: input.conversionGoal
    });
    return { task: result.task, run };
  }

  async createTask(input: CreateTaskInput) {
    const result = await this.pool.query(
      `
        INSERT INTO phase2_tasks (
          id, workspace_id, site_id, kind, estimated_credits, reservation_id,
          idempotency_key, request_hash, max_retries, provider_key, available_at,
          deadline_at, request_id, replay_of_task_id, priority
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11::timestamptz, now()), $12, $13, $14, $15)
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
        input.maxRetries ?? 3,
        input.providerKey ?? null,
        input.availableAt ?? null,
        input.deadlineAt ?? null,
        input.requestId ?? null,
        input.replayOfTaskId ?? null,
        input.priority ?? 50
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
    patch: Partial<Pick<Phase2Task, 'progress' | 'result' | 'errorCode' | 'retryCount' | 'availableAt' | 'cancellationRequestedAt'>> = {}
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
            available_at = COALESCE($9::timestamptz, available_at),
            cancellation_requested_at = COALESCE($10::timestamptz, cancellation_requested_at),
            updated_at = now(),
            completed_at = CASE WHEN $11 THEN COALESCE(completed_at, now()) ELSE NULL END
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
        patch.availableAt ?? null,
        patch.cancellationRequestedAt ?? null,
        completed
      ]
    );
    return result.rows[0] ? mapTask(result.rows[0]) : undefined;
  }

  async cancelTask(taskId: string, workspaceId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const taskResult = await client.query(
        `SELECT * FROM phase2_tasks WHERE id = $1 AND workspace_id = $2 FOR UPDATE`,
        [taskId, workspaceId]
      );
      const row = taskResult.rows[0];
      if (!row || (row.status !== 'queued' && row.status !== 'running')) {
        await client.query('ROLLBACK');
        return undefined;
      }

      const isQueued = row.status === 'queued';
      const update = await client.query(
        `UPDATE phase2_tasks
         SET status = $3,
             cancellation_requested_at = CASE WHEN $3 = 'cancellation_requested' THEN now() ELSE cancellation_requested_at END,
             completed_at = CASE WHEN $3 = 'cancelled' THEN now() ELSE completed_at END,
             updated_at = now()
         WHERE id = $1 AND workspace_id = $2
         RETURNING *`,
        [taskId, workspaceId, isQueued ? 'cancelled' : 'cancellation_requested']
      );
      if (isQueued && row.reservation_id) {
        await client.query(
          `INSERT INTO usage_ledger (
             id, workspace_id, operation, event_type, reservation_id, provider,
             gateway_model, price_snapshot_id, task_id, request_id, units, cost_estimate, actual_cost
           )
           SELECT $1, workspace_id, operation, 'release', reservation_id, provider,
                  gateway_model, price_snapshot_id, task_id, request_id, units, cost_estimate, 0
           FROM usage_ledger reserve
           WHERE reserve.workspace_id = $2 AND reserve.reservation_id = $3 AND reserve.event_type = 'reserve'
             AND NOT EXISTS (
               SELECT 1 FROM usage_ledger terminal
               WHERE terminal.reservation_id = reserve.reservation_id
                 AND terminal.event_type IN ('finalize', 'release')
             )`,
          [randomUUID(), workspaceId, row.reservation_id]
        );
      }
      await client.query('COMMIT');
      return mapTask(update.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async reserveUsage(input: ReserveUsageInput) {
    const result = await this.pool.query(
      `
        INSERT INTO usage_ledger (
          id, workspace_id, operation, event_type, reservation_id, provider,
          gateway_model, price_snapshot_id, task_id, request_id, units, cost_estimate, idempotency_key
        ) VALUES ($1, $2, $3, 'reserve', $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        input.taskId ?? null,
        input.requestId ?? null,
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
            gateway_model, price_snapshot_id, task_id, request_id, units, cost_estimate, actual_cost
          )
          SELECT $1, workspace_id, operation, 'finalize', reservation_id, provider,
                 gateway_model, price_snapshot_id, task_id, request_id, units, cost_estimate, $2
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
            gateway_model, price_snapshot_id, task_id, request_id, units, cost_estimate, actual_cost
          )
          SELECT $1, workspace_id, operation, 'release', reservation_id, provider,
                 gateway_model, price_snapshot_id, task_id, request_id, units, cost_estimate, 0
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
        WITH workspace_ledger AS (
          SELECT * FROM usage_ledger WHERE workspace_id = $1
        ), active_reservations AS (
          SELECT reserve.reservation_id
          FROM workspace_ledger reserve
          WHERE reserve.event_type = 'reserve'
            AND NOT EXISTS (
              SELECT 1 FROM workspace_ledger terminal
              WHERE terminal.reservation_id = reserve.reservation_id
                AND terminal.event_type IN ('finalize', 'release')
            )
        )
        SELECT
          COALESCE(SUM(CASE WHEN event_type = 'reserve' THEN units ELSE 0 END), 0) AS reserved_units,
          COALESCE(SUM(CASE WHEN event_type = 'reserve' AND reservation_id IN (SELECT reservation_id FROM active_reservations) THEN units ELSE 0 END), 0) AS active_reserved_units,
          COALESCE(SUM(CASE WHEN event_type = 'finalize' THEN units ELSE 0 END), 0) AS finalized_units,
          COALESCE(SUM(CASE WHEN event_type = 'release' THEN units ELSE 0 END), 0) AS released_units,
          COALESCE(SUM(CASE WHEN event_type = 'reserve' THEN cost_estimate ELSE 0 END), 0) AS reserved_cost,
          COALESCE(SUM(CASE WHEN event_type = 'finalize' THEN actual_cost ELSE 0 END), 0) AS finalized_cost,
          COALESCE(SUM(CASE WHEN event_type = 'release' THEN cost_estimate ELSE 0 END), 0) AS released_cost
        FROM workspace_ledger
      `,
      [workspaceId]
    );
    const row = result.rows[0];
    return {
      reservedUnits: Number(row.reserved_units),
      activeReservedUnits: Number(row.active_reserved_units),
      finalizedUnits: Number(row.finalized_units),
      releasedUnits: Number(row.released_units),
      reservedCost: Number(row.reserved_cost),
      finalizedCost: Number(row.finalized_cost),
      releasedCost: Number(row.released_cost)
    };
  }

  async getPeriodUsageUnits(workspaceId: string, operation: string, period: EntitlementAssignment['period']) {
    const result = await this.pool.query(
      `
        WITH period_ledger AS (
          SELECT *
          FROM usage_ledger
          WHERE workspace_id = $1
            AND operation = $2
            AND created_at >= CASE $3
              WHEN 'daily' THEN date_trunc('day', now())
              WHEN 'monthly' THEN date_trunc('month', now())
              ELSE '-infinity'::timestamptz
            END
        ), active_reservations AS (
          SELECT reserve.reservation_id
          FROM period_ledger reserve
          WHERE reserve.event_type = 'reserve'
            AND NOT EXISTS (
              SELECT 1 FROM usage_ledger terminal
              WHERE terminal.workspace_id = reserve.workspace_id
                AND terminal.reservation_id = reserve.reservation_id
                AND terminal.event_type IN ('finalize', 'release')
            )
        )
        SELECT COALESCE(SUM(
          CASE
            WHEN event_type = 'finalize' THEN units
            WHEN event_type = 'reserve' AND reservation_id IN (SELECT reservation_id FROM active_reservations) THEN units
            ELSE 0
          END
        ), 0) AS units
        FROM period_ledger
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

  async saveEntitlement(entitlement: EntitlementAssignment) {
    const result = await this.pool.query(
      `INSERT INTO entitlement_assignments (
         id, workspace_id, feature_key, limit_value, period, source, effective_at, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (workspace_id, feature_key, period, effective_at)
       DO UPDATE SET limit_value = EXCLUDED.limit_value, source = EXCLUDED.source, expires_at = EXCLUDED.expires_at
       RETURNING id, workspace_id, feature_key, limit_value, period, source, effective_at, expires_at`,
      [
        entitlement.id, entitlement.workspaceId, entitlement.featureKey, entitlement.limitValue,
        entitlement.period, entitlement.source, entitlement.effectiveAt, entitlement.expiresAt ?? null
      ]
    );
    const row = result.rows[0];
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

  async listDeadLetterTasks(workspaceId: string, pagination: Required<PaginationInput>) {
    const offset = (pagination.page - 1) * pagination.pageSize;
    const [items, count] = await Promise.all([
      this.pool.query(
        `SELECT * FROM phase2_tasks
         WHERE workspace_id = $1 AND status = 'dead_letter'
         ORDER BY completed_at DESC NULLS LAST, updated_at DESC
         LIMIT $2 OFFSET $3`,
        [workspaceId, pagination.pageSize, offset]
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS total FROM phase2_tasks WHERE workspace_id = $1 AND status = 'dead_letter'`,
        [workspaceId]
      )
    ]);
    return {
      items: items.rows.map(mapTask),
      pagination: createPagination(pagination.page, pagination.pageSize, Number(count.rows[0].total))
    };
  }

  async replayDeadLetterTask(taskId: string, workspaceId: string, actorId: string, reason: string, requestId?: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const originalResult = await client.query(
        `SELECT * FROM phase2_tasks
         WHERE id = $1 AND workspace_id = $2 AND status = 'dead_letter'
         FOR UPDATE`,
        [taskId, workspaceId]
      );
      const original = originalResult.rows[0];
      if (!original) {
        await client.query('ROLLBACK');
        return undefined;
      }
      const existingAction = await client.query(
        `SELECT 1 FROM phase2_task_dead_letter_actions WHERE task_id = $1 AND action = 'replay' LIMIT 1`,
        [taskId]
      );
      if (existingAction.rows[0]) {
        await client.query('ROLLBACK');
        return undefined;
      }
      const activeReservation = original.reservation_id
        ? await client.query(
            `SELECT reservation_id FROM usage_ledger reserve
             WHERE reserve.workspace_id = $1 AND reserve.reservation_id = $2 AND reserve.event_type = 'reserve'
               AND NOT EXISTS (
                 SELECT 1 FROM usage_ledger terminal
                 WHERE terminal.reservation_id = reserve.reservation_id AND terminal.event_type IN ('finalize', 'release')
               )`,
            [workspaceId, original.reservation_id]
          )
        : { rows: [] as QueryResultRow[] };
      const replacementId = randomUUID();
      const taskResult = await client.query(
        `INSERT INTO phase2_tasks (
           id, workspace_id, site_id, kind, estimated_credits, reservation_id, max_retries,
           provider_key, request_id, replay_of_task_id, priority
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          replacementId, workspaceId, original.site_id, original.kind, original.estimated_credits,
          activeReservation.rows[0]?.reservation_id ?? null, original.max_retries,
          original.provider_key, requestId ?? null, taskId, original.priority
        ]
      );
      const actionResult = await client.query(
        `INSERT INTO phase2_task_dead_letter_actions (
           id, task_id, workspace_id, action, actor_id, replacement_task_id, reason
         ) VALUES ($1, $2, $3, 'replay', $4, $5, $6)
         RETURNING *`,
        [randomUUID(), taskId, workspaceId, actorId, replacementId, reason]
      );
      await client.query('COMMIT');
      return { task: mapTask(taskResult.rows[0]), action: mapDeadLetterAction(actionResult.rows[0]) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async ignoreDeadLetterTask(taskId: string, workspaceId: string, actorId: string, reason: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const taskResult = await client.query(
        `SELECT * FROM phase2_tasks
         WHERE id = $1 AND workspace_id = $2 AND status = 'dead_letter'
         FOR UPDATE`,
        [taskId, workspaceId]
      );
      const task = taskResult.rows[0];
      if (!task) {
        await client.query('ROLLBACK');
        return undefined;
      }
      const existingAction = await client.query(
        `SELECT 1 FROM phase2_task_dead_letter_actions WHERE task_id = $1 AND action = 'ignore' LIMIT 1`,
        [taskId]
      );
      if (existingAction.rows[0]) {
        await client.query('ROLLBACK');
        return undefined;
      }
      if (task.reservation_id) {
        await client.query(
          `INSERT INTO usage_ledger (
             id, workspace_id, operation, event_type, reservation_id, provider,
             gateway_model, price_snapshot_id, task_id, request_id, units, cost_estimate, actual_cost
           )
           SELECT $1, workspace_id, operation, 'release', reservation_id, provider,
                  gateway_model, price_snapshot_id, task_id, request_id, units, cost_estimate, 0
           FROM usage_ledger reserve
           WHERE reserve.workspace_id = $2 AND reserve.reservation_id = $3 AND reserve.event_type = 'reserve'
             AND NOT EXISTS (
               SELECT 1 FROM usage_ledger terminal
               WHERE terminal.reservation_id = reserve.reservation_id AND terminal.event_type IN ('finalize', 'release')
             )`,
          [randomUUID(), workspaceId, task.reservation_id]
        );
      }
      const actionResult = await client.query(
        `INSERT INTO phase2_task_dead_letter_actions (
           id, task_id, workspace_id, action, actor_id, reason
         ) VALUES ($1, $2, $3, 'ignore', $4, $5)
         RETURNING *`,
        [randomUUID(), taskId, workspaceId, actorId, reason]
      );
      await client.query('COMMIT');
      return mapDeadLetterAction(actionResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

  async createKeywordResearchRun(input: CreateKeywordResearchRunInput) {
    const result = await this.pool.query(
      `
        INSERT INTO keyword_research_runs (
          id, workspace_id, project_id, task_id, input_hash, provider,
          provider_snapshot_id, status, cost_estimate, actual_cost, started_at, completed_at,
      request_context_hash, provider_methodology_version, collected_at, partial_reason
          , seed_keywords, own_domain, competitor_domains, locale, product_context, audience, conversion_goal
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, NULL, NULL, $10, $11, $12, $13, $14::jsonb, $15, $16::jsonb, $17, $18, $19, $20)
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
        input.requestContextHash ?? null,
        input.providerMethodologyVersion ?? null,
        input.collectedAt ?? null,
        input.partialReason ?? null,
        JSON.stringify(input.seedKeywords ?? []),
        input.ownDomain ?? null,
        JSON.stringify(input.competitorDomains ?? []),
        input.locale ?? 'zh-Hant',
        input.productContext ?? null,
        input.audience ?? null,
        input.conversionGoal ?? null
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

  async findKeywordResearchRunByInput(projectId: string, workspaceId: string, inputHash: string, provider: KeywordResearchRun['provider']) {
    const result = await this.pool.query(
      `SELECT * FROM keyword_research_runs
       WHERE project_id = $1 AND workspace_id = $2 AND input_hash = $3 AND provider = $4
       ORDER BY created_at DESC LIMIT 1`,
      [projectId, workspaceId, inputHash, provider]
    );
    return result.rows[0] ? mapKeywordResearchRun(result.rows[0]) : undefined;
  }

  async findLatestKeywordResearchRun(projectId: string, workspaceId: string) {
    const result = await this.pool.query(
      `SELECT * FROM keyword_research_runs
       WHERE project_id = $1 AND workspace_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [projectId, workspaceId]
    );
    return result.rows[0] ? mapKeywordResearchRun(result.rows[0]) : undefined;
  }

  async saveKeywordCandidate(input: CreateKeywordCandidateInput) {
    const result = await this.pool.query(
      `INSERT INTO keyword_candidates (
         id, workspace_id, project_id, normalized_keyword, display_keyword, locale,
         intent, source_type, source_ref, opportunity_score, score_confidence, model_version
       )
       SELECT $1, $2, p.id, $3, $4, $5, $6, $7, $8, $9, $10, $11
       FROM keyword_research_projects p
       WHERE p.id = $12 AND p.workspace_id = $2
       ON CONFLICT (project_id, normalized_keyword) DO UPDATE SET
         display_keyword = EXCLUDED.display_keyword,
         locale = EXCLUDED.locale,
         intent = COALESCE(EXCLUDED.intent, keyword_candidates.intent),
         source_type = EXCLUDED.source_type,
         source_ref = COALESCE(EXCLUDED.source_ref, keyword_candidates.source_ref),
         opportunity_score = COALESCE(EXCLUDED.opportunity_score, keyword_candidates.opportunity_score),
         score_confidence = COALESCE(EXCLUDED.score_confidence, keyword_candidates.score_confidence),
         model_version = COALESCE(EXCLUDED.model_version, keyword_candidates.model_version),
         updated_at = now()
       RETURNING *`,
      [
        randomUUID(), input.workspaceId, input.normalizedKeyword, input.displayKeyword, input.locale,
        input.intent ?? null, input.sourceType, input.sourceRef ?? null, input.opportunityScore ?? null,
        input.scoreConfidence ?? null, input.modelVersion ?? null, input.projectId
      ]
    );
    if (!result.rows[0]) throw new Error('WORKSPACE_RESOURCE_NOT_FOUND');
    return mapKeywordCandidate(result.rows[0]);
  }

  async saveKeywordMetric(input: CreateKeywordMetricInput) {
    const result = await this.pool.query(
      `INSERT INTO keyword_metrics (
         id, workspace_id, run_id, candidate_id, metric_name, numeric_value, provider,
         source_type, provider_snapshot_id, location, language, device, collected_at,
         provider_updated_at, methodology_version, confidence, raw_response_ref
       )
       SELECT $1, $2, r.id, c.id, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11::timestamptz, now()), $12, $13, $14, $15
       FROM keyword_research_runs r
       JOIN keyword_candidates c ON c.id = $17 AND c.project_id = r.project_id AND c.workspace_id = r.workspace_id
       WHERE r.id = $16 AND r.workspace_id = $2
       RETURNING *`,
      [
        randomUUID(), input.workspaceId, input.metricName, input.numericValue ?? null, input.provider ?? null,
        input.sourceType, input.providerSnapshotId ?? null, input.location ?? null, input.language ?? null,
        input.device ?? null, input.collectedAt ?? null, input.providerUpdatedAt ?? null,
        input.methodologyVersion ?? null, input.confidence ?? null, input.rawResponseRef ?? null,
        input.runId, input.candidateId
      ]
    );
    if (!result.rows[0]) throw new Error('WORKSPACE_RESOURCE_NOT_FOUND');
    return mapKeywordMetric(result.rows[0]);
  }

  async saveKeywordObservation(input: CreateKeywordObservationInput) {
    const result = await this.pool.query(
      `INSERT INTO keyword_observations (
         id, workspace_id, run_id, candidate_id, domain_type, competitor_id, domain,
         rank, url, etv, serp_features, source_type, provider, provider_snapshot_id, collected_at
       )
       SELECT $1, $2, r.id, c.id, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, COALESCE($13::timestamptz, now())
       FROM keyword_research_runs r
       JOIN keyword_candidates c ON c.id = $15 AND c.project_id = r.project_id AND c.workspace_id = r.workspace_id
       WHERE r.id = $14 AND r.workspace_id = $2
       RETURNING *`,
      [
        randomUUID(), input.workspaceId, input.domainType, input.competitorId ?? null, input.domain,
        input.rank ?? null, input.url ?? null, input.etv ?? null, JSON.stringify(input.serpFeatures ?? []),
        input.sourceType, input.provider, input.providerSnapshotId ?? null, input.collectedAt ?? null,
        input.runId, input.candidateId
      ]
    );
    if (!result.rows[0]) throw new Error('WORKSPACE_RESOURCE_NOT_FOUND');
    return mapKeywordObservation(result.rows[0]);
  }

  async saveKeywordGapSnapshot(input: CreateKeywordGapSnapshotInput) {
    const result = await this.pool.query(
      `INSERT INTO keyword_gap_snapshots (
         id, workspace_id, run_id, candidate_id, classification, own_best_rank,
         competitor_best_rank, competitor_ids, evidence_refs, score, score_confidence,
         provider, provider_snapshot_id, collected_at
       )
       SELECT $1, $2, r.id, c.id, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, COALESCE($12::timestamptz, now())
       FROM keyword_research_runs r
       JOIN keyword_candidates c ON c.id = $14 AND c.project_id = r.project_id AND c.workspace_id = r.workspace_id
       WHERE r.id = $13 AND r.workspace_id = $2
       ON CONFLICT (run_id, candidate_id) DO UPDATE SET
         classification = EXCLUDED.classification,
         own_best_rank = EXCLUDED.own_best_rank,
         competitor_best_rank = EXCLUDED.competitor_best_rank,
         competitor_ids = EXCLUDED.competitor_ids,
         evidence_refs = EXCLUDED.evidence_refs,
         score = EXCLUDED.score,
         score_confidence = EXCLUDED.score_confidence,
         provider = EXCLUDED.provider,
         provider_snapshot_id = EXCLUDED.provider_snapshot_id,
         collected_at = EXCLUDED.collected_at
       RETURNING *`,
      [
        randomUUID(), input.workspaceId, input.classification, input.ownBestRank ?? null,
        input.competitorBestRank ?? null, JSON.stringify(input.competitorIds ?? []),
        JSON.stringify(input.evidenceRefs ?? []), input.score ?? null, input.scoreConfidence ?? null,
        input.provider, input.providerSnapshotId ?? null, input.collectedAt ?? null, input.runId, input.candidateId
      ]
    );
    if (!result.rows[0]) throw new Error('WORKSPACE_RESOURCE_NOT_FOUND');
    return mapKeywordGapSnapshot(result.rows[0]);
  }

  async listKeywordCandidates(projectId: string, workspaceId: string, filters: KeywordCandidateFilters) {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const offset = (page - 1) * pageSize;
    const values: unknown[] = [projectId, workspaceId];
    const clauses = ['c.project_id = $1', 'c.workspace_id = $2'];
    if (filters.intent) { values.push(filters.intent); clauses.push(`c.intent = $${values.length}`); }
    if (filters.clusterId) { values.push(filters.clusterId); clauses.push(`c.cluster_id = $${values.length}`); }
    if (filters.sourceType) { values.push(filters.sourceType); clauses.push(`c.source_type = $${values.length}`); }
    if (filters.minVolume !== undefined) { values.push(filters.minVolume); clauses.push(`COALESCE((SELECT MAX(m.numeric_value) FROM keyword_metrics m WHERE m.candidate_id = c.id AND m.metric_name = 'volume'), 0) >= $${values.length}`); }
    if (filters.maxDifficulty !== undefined) { values.push(filters.maxDifficulty); clauses.push(`COALESCE((SELECT MAX(m.numeric_value) FROM keyword_metrics m WHERE m.candidate_id = c.id AND m.metric_name = 'difficulty'), 101) <= $${values.length}`); }
    const orderBy = filters.sort === 'volume'
      ? `volume_value DESC NULLS LAST, c.created_at DESC`
      : filters.sort === 'difficulty'
        ? `difficulty_value ASC NULLS LAST, c.created_at DESC`
        : filters.sort === 'created'
          ? `c.created_at DESC`
          : `c.opportunity_score DESC NULLS LAST, c.created_at DESC`;
    const itemParams = [...values, pageSize, offset];
    const items = await this.pool.query(
      `SELECT c.*,
          (SELECT MAX(m.numeric_value) FROM keyword_metrics m WHERE m.candidate_id = c.id AND m.metric_name = 'volume') AS volume_value,
          (SELECT MAX(m.numeric_value) FROM keyword_metrics m WHERE m.candidate_id = c.id AND m.metric_name = 'difficulty') AS difficulty_value
       FROM keyword_candidates c
       WHERE ${clauses.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT $${itemParams.length - 1} OFFSET $${itemParams.length}`,
      itemParams
    );
    const count = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM keyword_candidates c WHERE ${clauses.join(' AND ')}`,
      values
    );
    const total = Number(count.rows[0].total);
    return { items: items.rows.map(mapKeywordCandidate), pagination: createPagination(page, pageSize, total) };
  }

  async listKeywordGaps(projectId: string, workspaceId: string, filters: KeywordGapFilters) {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const offset = (page - 1) * pageSize;
    const values: unknown[] = [projectId, workspaceId];
    const clauses = ['g.workspace_id = $2', `g.run_id IN (SELECT r.id FROM keyword_research_runs r WHERE r.project_id = $1 AND r.workspace_id = $2)`];
    if (filters.classification) { values.push(filters.classification); clauses.push(`g.classification = $${values.length}`); }
    if (filters.competitorId) { values.push(filters.competitorId); clauses.push(`g.competitor_ids @> $${values.length}::jsonb`); }
    const itemParams = [...values, pageSize, offset];
    const items = await this.pool.query(
      `SELECT g.* FROM keyword_gap_snapshots g WHERE ${clauses.join(' AND ')}
       ORDER BY g.score DESC NULLS LAST, g.collected_at DESC
       LIMIT $${itemParams.length - 1} OFFSET $${itemParams.length}`,
      filters.competitorId ? [...values.slice(0, -1), JSON.stringify([filters.competitorId]), pageSize, offset] : itemParams
    );
    const count = await this.pool.query(`SELECT COUNT(*)::int AS total FROM keyword_gap_snapshots g WHERE ${clauses.join(' AND ')}`, filters.competitorId ? [...values.slice(0, -1), JSON.stringify([filters.competitorId])] : values);
    const total = Number(count.rows[0].total);
    return { items: items.rows.map(mapKeywordGapSnapshot), pagination: createPagination(page, pageSize, total) };
  }

  async createContentBrief(input: CreateContentBriefInput) {
    const result = await this.pool.query(
      `INSERT INTO content_briefs (
         id, workspace_id, project_id, primary_keyword_id, secondary_keywords,
         outline, audience, locale, status
       )
       SELECT $1, $2, p.id, c.id, $3::jsonb, $4::jsonb, $5, $6, 'draft'
       FROM keyword_research_projects p
       JOIN keyword_candidates c ON c.project_id = p.id AND c.workspace_id = p.workspace_id
       WHERE p.id = $7 AND p.workspace_id = $2 AND c.id = $8
       RETURNING *`,
      [
        randomUUID(), input.workspaceId, JSON.stringify(input.secondaryKeywords ?? []), JSON.stringify(input.outline ?? []),
        input.audience ?? null, input.locale, input.projectId, input.primaryKeywordId
      ]
    );
    if (!result.rows[0]) throw new Error('WORKSPACE_RESOURCE_NOT_FOUND');
    return mapContentBrief(result.rows[0]);
  }

  async createContentOptimizationRun(input: Omit<ContentOptimizationRun, 'id' | 'createdAt' | 'updatedAt'>) {
    const result = await this.pool.query(
      `
        INSERT INTO content_optimization_runs (
          id, workspace_id, site_id, article_id, input_hash, locale,
          rules_version, prompt_version, schema_version, gateway_model, task_id, status,
          source_kind, source_url, content_locale, target_market, dialect, focus_keyword,
          secondary_keywords, score, confidence, parent_run_id
        )
        SELECT $1, $2, sc.id, $3, $4, $5, $6, $7, $8, $9, $10, $11,
               COALESCE($12, 'inline'), $13, COALESCE($14, $5), $15, $16, COALESCE($17, ''),
               COALESCE($18::jsonb, '[]'::jsonb), $19, $20, $21
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
        input.sourceKind ?? null,
        input.sourceUrl ?? null,
        input.contentLocale ?? null,
        input.targetMarket ?? null,
        input.dialect ?? null,
        input.focusKeyword ?? null,
        JSON.stringify(input.secondaryKeywords ?? []),
        input.score ?? null,
        input.confidence ?? null,
        input.parentRunId ?? null,
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

  async findContentOptimizationRunByInput(siteId: string, workspaceId: string, inputHash: string, gatewayModel: string) {
    const result = await this.pool.query(
      `SELECT * FROM content_optimization_runs
       WHERE site_id = $1 AND workspace_id = $2 AND input_hash = $3 AND gateway_model = $4
       ORDER BY created_at DESC LIMIT 1`,
      [siteId, workspaceId, inputHash, gatewayModel]
    );
    return result.rows[0] ? mapContentOptimizationRun(result.rows[0]) : undefined;
  }

  async enqueueContentOptimizationRun(input: EnqueueContentOptimizationRunInput, createResponse: (task: Phase2Task, run: ContentOptimizationRun) => Pick<IdempotencyRecord, 'statusCode' | 'responseBody'>) {
    const runId = randomUUID();
    const result = await this.enqueueCostedTask({ ...input, providerKey: input.providerKey ?? 'wenwen' }, (task) => createResponse(task, {
      id: runId, workspaceId: input.workspaceId, siteId: input.siteId!, articleId: input.articleId,
      inputHash: input.contentHash, locale: input.locale, rulesVersion: input.rulesVersion,
      promptVersion: input.promptVersion, schemaVersion: input.schemaVersion, gatewayModel: input.gatewayModel,
      taskId: task.id, status: 'queued', sourceKind: input.sourceKind, sourceUrl: input.sourceUrl,
      contentLocale: input.locale, targetMarket: input.targetMarket, dialect: input.dialect,
      focusKeyword: input.focusKeyword, secondaryKeywords: input.secondaryKeywords, parentRunId: input.parentRunId,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    }));
    if (result.replay || !result.task) return result;
    const run = await this.createContentOptimizationRun({
      workspaceId: input.workspaceId, siteId: input.siteId!, articleId: input.articleId,
      inputHash: input.contentHash, locale: input.locale, rulesVersion: input.rulesVersion,
      promptVersion: input.promptVersion, schemaVersion: input.schemaVersion, gatewayModel: input.gatewayModel,
      taskId: result.task.id, status: 'queued', sourceKind: input.sourceKind, sourceUrl: input.sourceUrl,
      contentLocale: input.locale, targetMarket: input.targetMarket, dialect: input.dialect,
      focusKeyword: input.focusKeyword, secondaryKeywords: input.secondaryKeywords, parentRunId: input.parentRunId
    });
    await this.pool.query(
      `INSERT INTO content_optimization_input_snapshots (
         id, workspace_id, run_id, source_kind, source_url, content_text, content_hash, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [randomUUID(), input.workspaceId, run.id, input.sourceKind, input.sourceUrl ?? null, input.contentText, input.contentHash, JSON.stringify(input.metadata ?? {})]
    );
    return { task: result.task, run };
  }

  async getContentOptimizationDetails(runId: string, workspaceId: string) {
    const run = await this.findContentOptimizationRun(runId, workspaceId);
    if (!run) return undefined;
    const [snapshot, checks, claims, suggestions] = await Promise.all([
      this.pool.query(`SELECT * FROM content_optimization_input_snapshots WHERE run_id = $1 AND workspace_id = $2 LIMIT 1`, [runId, workspaceId]),
      this.pool.query(`SELECT * FROM content_score_checks WHERE run_id = $1 AND workspace_id = $2 ORDER BY code`, [runId, workspaceId]),
      this.pool.query(`SELECT * FROM content_claims WHERE run_id = $1 AND workspace_id = $2 ORDER BY created_at`, [runId, workspaceId]),
      this.pool.query(`SELECT * FROM content_rewrite_suggestions WHERE run_id = $1 AND workspace_id = $2 ORDER BY created_at`, [runId, workspaceId])
    ]);
    return { run, snapshot: snapshot.rows[0] ? mapContentSnapshot(snapshot.rows[0]) : undefined, scoreChecks: checks.rows.map(mapContentScoreCheck), claims: claims.rows.map(mapContentClaim), suggestions: suggestions.rows.map(mapContentRewriteSuggestion) };
  }

  async saveContentScoreChecks(workspaceId: string, runId: string, checks: Omit<ContentScoreCheckRecord, 'id' | 'workspaceId' | 'runId'>[], score: number, confidence: number, status: Phase2TaskStatus) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM content_score_checks WHERE workspace_id = $1 AND run_id = $2`, [workspaceId, runId]);
      for (const item of checks) {
        await client.query(
          `INSERT INTO content_score_checks (id, workspace_id, run_id, code, dimension, source_type, status, weight, score, evidence, evidence_json, recommendation)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)`,
          [randomUUID(), workspaceId, runId, item.code, item.dimension, item.sourceType, item.status, item.weight, item.score ?? null, item.evidence ?? null, JSON.stringify(item.evidenceJson ?? {}), item.recommendation ?? null]
        );
      }
      await client.query(`UPDATE content_optimization_runs SET score = $3, confidence = $4, status = $5, updated_at = now() WHERE id = $1 AND workspace_id = $2`, [runId, workspaceId, score, confidence, status]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async saveContentClaim(input: Omit<ContentClaim, 'id' | 'workspaceId'> & { workspaceId: string }) {
    const result = await this.pool.query(
      `INSERT INTO content_claims (id, workspace_id, run_id, claim_text, source_url, source_title, source_hash, source_excerpt_hash, source_type, verification_status, blocked_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [randomUUID(), input.workspaceId, input.runId, input.claimText, input.sourceUrl ?? null, input.sourceTitle ?? null, input.sourceHash ?? null, input.sourceExcerptHash ?? null, input.sourceType, input.verificationStatus, input.blockedReason ?? null]
    );
    return mapContentClaim(result.rows[0]);
  }

  async createContentRewriteSuggestion(input: Omit<ContentRewriteSuggestion, 'id' | 'createdAt' | 'updatedAt'>) {
    const result = await this.pool.query(
      `INSERT INTO content_rewrite_suggestions (id, workspace_id, run_id, task_id, scope, selector, before_text, before_hash, suggested_text, diff, risk_flags, status, revision)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13) RETURNING *`,
      [randomUUID(), input.workspaceId, input.runId, input.taskId ?? null, input.scope, input.selector ?? null, input.beforeText, input.beforeHash, input.suggestedText ?? null, JSON.stringify(input.diff), JSON.stringify(input.riskFlags), input.status, input.revision]
    );
    return mapContentRewriteSuggestion(result.rows[0]);
  }

  async updateContentRewriteSuggestion(runId: string, suggestionId: string, workspaceId: string, patch: Pick<ContentRewriteSuggestion, 'status'> & Partial<Pick<ContentRewriteSuggestion, 'suggestedText' | 'riskFlags'>>) {
    const result = await this.pool.query(
      `UPDATE content_rewrite_suggestions SET status = $4, suggested_text = COALESCE($5, suggested_text), risk_flags = COALESCE($6::jsonb, risk_flags), updated_at = now()
       WHERE id = $1 AND run_id = $2 AND workspace_id = $3 RETURNING *`,
      [suggestionId, runId, workspaceId, patch.status, patch.suggestedText ?? null, patch.riskFlags ? JSON.stringify(patch.riskFlags) : null]
    );
    return result.rows[0] ? mapContentRewriteSuggestion(result.rows[0]) : undefined;
  }

  async recordAttempt(input: Omit<TaskAttempt, 'id'>) {
    const result = await this.pool.query(
      `
        INSERT INTO task_attempts (
          id, task_id, workspace_id, attempt_no, status, provider_request_id, request_id,
          provider_key, gateway_model, cache_state, fallback_from, retry_after_ms, latency_ms,
          estimated_cost, error_code, started_at, completed_at, cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `,
        [
        randomUUID(),
        input.taskId,
        input.workspaceId,
        input.attemptNo,
        input.status,
        input.providerRequestId ?? null,
        input.requestId ?? null,
        input.providerKey ?? null,
        input.gatewayModel ?? null,
        input.cacheState ?? null,
        input.fallbackFrom ?? null,
        input.retryAfterMs ?? null,
        input.latencyMs ?? null,
        input.estimatedCost ?? null,
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
      requestId: row.request_id ?? undefined,
      providerKey: row.provider_key ?? undefined,
      gatewayModel: row.gateway_model ?? undefined,
      cacheState: row.cache_state ?? undefined,
      fallbackFrom: row.fallback_from ?? undefined,
      retryAfterMs: row.retry_after_ms === null ? undefined : Number(row.retry_after_ms),
      latencyMs: row.latency_ms === null ? undefined : Number(row.latency_ms),
      estimatedCost: row.estimated_cost === null ? undefined : Number(row.estimated_cost),
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
