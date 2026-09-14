import { createDecipheriv, createHash } from 'node:crypto';
import { createWordPressAdapter } from '@aieo/cms-adapters';
import {
  createAiGatewayAdapter,
  createAhrefsKeywordResearchProvider,
  createDataForSeoKeywordResearchProvider,
  createRedisTaskGovernance,
  createSemrushKeywordResearchProvider,
  type GatewayModel,
  type KeywordMetricResult,
  type KeywordResearchProvider,
  type Phase2TaskKind,
  type TaskGovernance
} from '@aieo/ai-providers';
import { fetchValidatedPublicUrl, validatePublicUrl, type ValidatedPublicUrl } from '@aieo/security';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import {
  getPhase2FailureStatus,
  getPhase2RetryDelayWithJitterMs,
  isRetryablePhase2ErrorCode
} from './phase2TaskState';

type SyncTaskScope =
  | 'full'
  | 'incremental'
  | 'article'
  | 'media'
  | 'suggestion_apply'
  | 'suggestion_rollback';

interface QueuedTask {
  id: string;
  siteId: string;
  scope: SyncTaskScope;
  targetCmsId?: string;
  suggestionId?: string;
  applySnapshotId?: string;
  siteUrl: string;
  wordpressAdminUsername?: string;
  wordpressApplicationPasswordEncrypted?: string;
  retryCount: number;
  maxRetries: number;
}

interface Phase2QueuedTask {
  id: string;
  workspaceId: string;
  kind: Phase2TaskKind;
  retryCount: number;
  maxRetries: number;
  providerKey?: string;
  requestId?: string;
  leaseOwner: string;
  deadlineAt?: string;
  reservationId?: string;
  runId?: string;
  projectId?: string;
  seedKeywords: string[];
  ownDomain?: string;
  competitorDomains: string[];
  market?: string;
  language?: string;
  device?: 'desktop' | 'mobile';
  engine?: 'google';
  locale?: string;
  productContext?: string;
  audience?: string;
  conversionGoal?: string;
}

interface WorkerOptions {
  databaseUrl: string;
  pollIntervalMs?: number;
  fetchImpl?: typeof fetch;
  logger?: Pick<Console, 'log' | 'error'>;
  workerId?: string;
  governance?: TaskGovernance;
}

interface WordPressCredentials {
  username: string;
  applicationPassword: string;
}

type PublicUrlValidator = (url: string) => Promise<ValidatedPublicUrl>;

const adapter = createWordPressAdapter();
const heartbeatMs = 30_000;
const defaultPollIntervalMs = 5_000;
const providerRatePolicy = { capacity: 20, refillWindowMs: 60_000 };
const providerCircuitPolicy = { failureThreshold: 5, failureWindowMs: 60_000, cooldownMs: 60_000 };

function normalizeWorkerErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (/^WORDPRESS_REST_[45]\d\d$/.test(message)) return message;
  if ([
    'UNSAFE_TARGET_URL',
    'WORDPRESS_REQUEST_TIMEOUT',
    'WORDPRESS_RESPONSE_INVALID',
    'WORDPRESS_RESPONSE_TOO_LARGE',
    'WORDPRESS_ARTICLE_RESPONSE_INVALID',
    'WORDPRESS_MEDIA_RESPONSE_INVALID',
    'WORDPRESS_CREDENTIALS_MISSING',
    'WORDPRESS_CREDENTIAL_FORMAT_INVALID',
    'WORDPRESS_CREDENTIAL_ENCRYPTION_KEY_REQUIRED',
    'SYNC_TASK_TARGET_MISSING',
    'SUGGESTION_TASK_INVALID',
    'SUGGESTION_NOT_APPROVED',
    'ROLLBACK_TASK_INVALID',
    'APPLY_SNAPSHOT_NOT_APPLIED',
    'PROVIDER_UNAVAILABLE',
    'KEYWORD_PROVIDER_TIMEOUT',
    'KEYWORD_PROVIDER_RESPONSE_INVALID',
    'KEYWORD_PROVIDER_HTTP_429',
    'KEYWORD_PROVIDER_HTTP_500',
    'KEYWORD_PROVIDER_HTTP_502',
    'KEYWORD_PROVIDER_HTTP_503',
    'KEYWORD_RESEARCH_INPUT_INVALID'
  ].includes(message)) {
    return message;
  }
  if (message.startsWith('AI_GATEWAY_')) return message.split(':', 1)[0];
  return 'WORKER_TASK_FAILED';
}

function logPhase2TaskEvent(
  logger: Pick<Console, 'log' | 'error'> | undefined,
  event: 'claimed' | 'completed' | 'failed',
  task: Phase2QueuedTask,
  errorCode?: string
) {
  logger?.log(JSON.stringify({
    service: 'worker',
    event: `phase2_task_${event}`,
    requestId: task.requestId,
    taskId: task.id,
    workspaceId: task.workspaceId,
    provider: task.providerKey ?? 'internal',
    model: undefined,
    attemptNo: task.retryCount + 1,
    retryCount: task.retryCount,
    cacheState: 'bypass',
    fallbackFrom: undefined,
    estimatedCost: 0,
    actualCost: 0,
    errorCode,
    timestamp: new Date().toISOString()
  }));
}

function getCredentialEncryptionKey() {
  if (process.env.NODE_ENV === 'production' && !process.env.WORDPRESS_CREDENTIAL_ENCRYPTION_KEY) {
    throw new Error('WORDPRESS_CREDENTIAL_ENCRYPTION_KEY_REQUIRED');
  }

  const secret =
    process.env.WORDPRESS_CREDENTIAL_ENCRYPTION_KEY ??
    process.env.JWT_SECRET ??
    'rankwoven-local-development-key';

  return createHash('sha256').update(secret).digest();
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

function mapQueuedTask(row: QueryResultRow): QueuedTask {
  return {
    id: row.id,
    siteId: row.site_id,
    scope: row.scope,
    targetCmsId: row.target_cms_id ?? undefined,
    suggestionId: row.suggestion_id ?? undefined,
    applySnapshotId: row.apply_snapshot_id ?? undefined,
    siteUrl: row.site_url,
    wordpressAdminUsername: row.wordpress_admin_username ?? undefined,
    wordpressApplicationPasswordEncrypted: row.wordpress_application_password_encrypted ?? undefined,
    retryCount: Number(row.retry_count ?? 0),
    maxRetries: Number(row.max_retries ?? 3)
  };
}

function getCredentials(task: QueuedTask): WordPressCredentials {
  if (!task.wordpressAdminUsername || !task.wordpressApplicationPasswordEncrypted) {
    throw new Error('WORDPRESS_CREDENTIALS_MISSING');
  }

  return {
    username: task.wordpressAdminUsername,
    applicationPassword: decryptWordPressCredential(task.wordpressApplicationPasswordEncrypted)
  };
}

function createBasicAuthHeader(credentials: WordPressCredentials) {
  return `Basic ${Buffer.from(`${credentials.username}:${credentials.applicationPassword}`).toString('base64')}`;
}

function buildWordPressUrl(siteUrl: string, path: string) {
  return `${siteUrl.replace(/\/+$/, '')}/wp-json/rankwoven/v1/${path.replace(/^\/+/, '')}`;
}

async function claimNextTask(client: PoolClient) {
  const result = await client.query(
    `
      SELECT
        st.*,
        sc.site_url,
        sc.wordpress_admin_username,
        sc.wordpress_application_password_encrypted
      FROM sync_tasks st
      JOIN site_connections sc ON sc.id = st.site_id
      WHERE st.status = 'queued'
        AND st.scope IN ('article', 'media', 'suggestion_apply', 'suggestion_rollback')
        AND (st.next_run_at IS NULL OR st.next_run_at <= now())
      ORDER BY st.created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `
  );
  const row = result.rows[0];

  if (!row) {
    return undefined;
  }

  await client.query(
    `
      UPDATE sync_tasks
      SET status = 'running',
          error_message = NULL
      WHERE id = $1
    `,
    [row.id]
  );

  return mapQueuedTask(row);
}

async function recoverExpiredPhase2Leases(client: PoolClient) {
  const result = await client.query(
    `UPDATE phase2_tasks
     SET status = CASE WHEN retry_count + 1 > max_retries THEN 'dead_letter' ELSE 'queued' END,
         retry_count = retry_count + 1,
         error_code = 'TASK_LEASE_EXPIRED',
         available_at = CASE
           WHEN retry_count + 1 > max_retries THEN available_at
           ELSE now() + ((LEAST(600000, 5000 * power(2, retry_count + 1)))::text || ' milliseconds')::interval
         END,
         lease_owner = NULL,
         lease_expires_at = NULL,
         completed_at = CASE WHEN retry_count + 1 > max_retries THEN now() ELSE NULL END,
         updated_at = now()
     WHERE status = 'running' AND lease_expires_at IS NOT NULL AND lease_expires_at <= now()
     RETURNING id, workspace_id, retry_count, max_retries, request_id, provider_key`
  );
  for (const row of result.rows) {
    await client.query(
      `INSERT INTO task_attempts (
         id, task_id, workspace_id, attempt_no, status, request_id, provider_key,
         error_code, started_at, completed_at, cost
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'TASK_LEASE_EXPIRED', now(), now(), 0)
       ON CONFLICT (task_id, attempt_no) DO NOTHING`,
      [
        crypto.randomUUID(), row.id, row.workspace_id, Number(row.retry_count),
        getPhase2FailureStatus(Number(row.retry_count), Number(row.max_retries)),
        row.request_id ?? null, row.provider_key ?? null
      ]
    );
  }
}

async function claimNextPhase2Task(client: PoolClient, workerId: string): Promise<Phase2QueuedTask | undefined> {
  const result = await client.query(
    `
      WITH ranked AS (
        SELECT id,
               row_number() OVER (
                 PARTITION BY workspace_id
                 ORDER BY priority DESC, available_at ASC, created_at ASC
               ) AS workspace_rank
        FROM phase2_tasks
        WHERE status = 'queued' AND available_at <= now()
      ), candidate AS (
        SELECT task.*, run.id AS run_id, run.project_id,
               run.seed_keywords, run.own_domain, run.competitor_domains,
               project.market, project.language, project.device, project.engine,
               run.locale, run.product_context, run.audience, run.conversion_goal
        FROM phase2_tasks task
        LEFT JOIN keyword_research_runs run ON run.task_id = task.id AND run.workspace_id = task.workspace_id
        LEFT JOIN keyword_research_projects project ON project.id = run.project_id AND project.workspace_id = task.workspace_id
        JOIN ranked ON ranked.id = task.id
        WHERE ranked.workspace_rank = 1
        ORDER BY task.priority DESC, task.available_at ASC, task.created_at ASC
        LIMIT 1
        FOR UPDATE OF task SKIP LOCKED
      )
      SELECT * FROM candidate
    `
  );
  const row = result.rows[0];
  if (!row) return undefined;

  await client.query(
    `UPDATE phase2_tasks
     SET status = 'running', started_at = COALESCE(started_at, now()),
         lease_owner = $2, lease_expires_at = now() + interval '30 seconds', updated_at = now()
     WHERE id = $1 AND status = 'queued'`,
    [row.id, workerId]
  );
  await client.query(
    `INSERT INTO task_attempts (
       id, task_id, workspace_id, attempt_no, status, request_id, provider_key, started_at
     ) VALUES ($1, $2, $3, $4, 'running', $5, $6, now())
     ON CONFLICT (task_id, attempt_no) DO UPDATE SET
       status = 'running', request_id = EXCLUDED.request_id, provider_key = EXCLUDED.provider_key,
       started_at = EXCLUDED.started_at, completed_at = NULL, error_code = NULL`,
    [crypto.randomUUID(), row.id, row.workspace_id, Number(row.retry_count ?? 0) + 1, row.request_id ?? null, row.provider_key ?? null]
  );
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    kind: row.kind,
    retryCount: Number(row.retry_count ?? 0),
    maxRetries: Number(row.max_retries ?? 3),
    providerKey: row.provider_key ?? undefined,
    requestId: row.request_id ?? undefined,
    leaseOwner: workerId,
    deadlineAt: row.deadline_at ? new Date(row.deadline_at).toISOString() : undefined,
    reservationId: row.reservation_id ?? undefined,
    runId: row.run_id ?? undefined,
    seedKeywords: Array.isArray(row.seed_keywords) ? row.seed_keywords : [],
    competitorDomains: Array.isArray(row.competitor_domains) ? row.competitor_domains : [],
    device: row.device === 'mobile' ? 'mobile' : 'desktop',
    engine: 'google',
    locale: row.locale ?? 'zh-Hant',
    projectId: row.project_id ?? undefined,
    ownDomain: row.own_domain ?? undefined,
    market: row.market ?? undefined,
    language: row.language ?? undefined,
    productContext: row.product_context ?? undefined,
    audience: row.audience ?? undefined,
    conversionGoal: row.conversion_goal ?? undefined
  };
}

async function processGatewayModelSyncTask(
  client: PoolClient,
  task: Phase2QueuedTask,
  fetchImpl: typeof fetch,
  governance?: TaskGovernance
) {
  const taskState = await client.query(
    `SELECT status FROM phase2_tasks WHERE id = $1 AND workspace_id = $2 AND lease_owner = $3`,
    [task.id, task.workspaceId, task.leaseOwner]
  );
  if (taskState.rows[0]?.status === 'cancellation_requested') {
    await client.query(
      `UPDATE phase2_tasks
       SET status = 'cancelled', completed_at = now(), lease_owner = NULL, lease_expires_at = NULL, updated_at = now()
       WHERE id = $1 AND workspace_id = $2 AND lease_owner = $3`,
      [task.id, task.workspaceId, task.leaseOwner]
    );
    await client.query(
      `UPDATE task_attempts
       SET status = 'cancelled', completed_at = now()
       WHERE task_id = $1 AND workspace_id = $2 AND attempt_no = $3`,
      [task.id, task.workspaceId, task.retryCount + 1]
    );
    return;
  }
  const gatewayKey = process.env.WENWEN_API_KEY;
  const gatewayBaseUrl = process.env.WENWEN_API_BASE_URL;
  if (!gatewayKey || !gatewayBaseUrl) {
    throw new Error('PROVIDER_UNAVAILABLE');
  }
  if (process.env.NODE_ENV === 'production' && !governance) {
    throw new Error('RATE_LIMIT_UNAVAILABLE');
  }
  const providerKey = task.providerKey ?? 'wenwen';
  if (governance) {
    const circuit = await governance.allowProvider(providerKey, 'gateway_model_sync', providerCircuitPolicy);
    const rateLimit = await governance.consume(`provider:${providerKey}:gateway_model_sync`, providerRatePolicy);
    if (!circuit.allowed || !rateLimit.allowed) {
      throw new Error('PROVIDER_UNAVAILABLE');
    }
  }

  const startedAt = Date.now();
  const leaseHeartbeat = setInterval(() => {
    client.query(
      `UPDATE phase2_tasks
       SET lease_expires_at = now() + interval '30 seconds', updated_at = now()
       WHERE id = $1 AND workspace_id = $2 AND status = 'running' AND lease_owner = $3`,
      [task.id, task.workspaceId, task.leaseOwner]
    ).catch(() => undefined);
  }, 15_000);
  try {
    const models = await createAiGatewayAdapter({
      baseUrl: gatewayBaseUrl,
      apiKey: gatewayKey,
      fetchImpl
    }).listModels();
    for (const model of models) {
      await saveGatewayModel(client, model);
    }
    await client.query(
      `UPDATE task_attempts
       SET status = 'completed', completed_at = now(), latency_ms = $4, cost = 0
       WHERE task_id = $1 AND workspace_id = $2 AND attempt_no = $3`,
      [task.id, task.workspaceId, task.retryCount + 1, Date.now() - startedAt]
    );
    await client.query(
      `UPDATE phase2_tasks
       SET status = 'completed', progress = 100, result = $2::jsonb, completed_at = now(),
           lease_owner = NULL, lease_expires_at = NULL, updated_at = now()
       WHERE id = $1 AND status = 'running' AND lease_owner = $3`,
      [task.id, JSON.stringify({ modelCount: models.length }), task.leaseOwner]
    );
    await governance?.recordProviderOutcome(providerKey, 'gateway_model_sync', true, providerCircuitPolicy);
  } catch (error) {
    await governance?.recordProviderOutcome(providerKey, 'gateway_model_sync', false, providerCircuitPolicy);
    throw error;
  } finally {
    clearInterval(leaseHeartbeat);
  }
}

function createKeywordResearchProviderFromEnvironment(fetchImpl: typeof fetch): KeywordResearchProvider | undefined {
  const provider = process.env.KEYWORD_VOLUME_PROVIDER;
  const apiUrl = process.env.KEYWORD_VOLUME_API_URL;
  const apiKey = process.env.KEYWORD_VOLUME_API_KEY;
  if (provider === 'dataforseo' && apiUrl && apiKey) {
    return createDataForSeoKeywordResearchProvider({ baseUrl: apiUrl, apiKey, fetchImpl });
  }
  if (provider === 'semrush' && process.env.SEMRUSH_API_URL && process.env.SEMRUSH_API_KEY) {
    return createSemrushKeywordResearchProvider({
      baseUrl: process.env.SEMRUSH_API_URL,
      apiKey: process.env.SEMRUSH_API_KEY,
      fetchImpl
    });
  }
  if (process.env.AHREFS_KEYWORD_METRICS_ENABLED === 'true' && process.env.AHREFS_API_URL && process.env.AHREFS_API_KEY) {
    return createAhrefsKeywordResearchProvider({
      baseUrl: process.env.AHREFS_API_URL,
      apiKey: process.env.AHREFS_API_KEY,
      fetchImpl
    });
  }
  return undefined;
}

function parseKeywordIdeas(value: string) {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? value;
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start < 0 || end <= start) return [] as Array<{ keyword: string; intent?: string; parentTopic?: string; contentAngle?: string; confidence?: number }>;
  try {
    const parsed = JSON.parse(fenced.slice(start, end + 1)) as { suggestions?: unknown[]; keywords?: unknown[] };
    const rows = parsed.suggestions ?? parsed.keywords ?? [];
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => {
      if (typeof row === 'string') return { keyword: row };
      if (!row || typeof row !== 'object') return undefined;
      const item = row as Record<string, unknown>;
      const keyword = String(item.keyword ?? item.query ?? '').replace(/\s+/g, ' ').trim();
      if (!keyword) return undefined;
      return {
        keyword,
        intent: typeof item.intent === 'string' ? item.intent : undefined,
        parentTopic: typeof item.parentTopic === 'string' ? item.parentTopic : undefined,
        contentAngle: typeof item.contentAngle === 'string' ? item.contentAngle : undefined,
        confidence: typeof item.confidence === 'number' && item.confidence >= 0 && item.confidence <= 1 ? item.confidence : undefined
      };
    }).filter((item): item is { keyword: string; intent?: string; parentTopic?: string; contentAngle?: string; confidence?: number } => Boolean(item)).slice(0, 200);
  } catch {
    return [];
  }
}

async function generateKeywordIdeas(task: Phase2QueuedTask, fetchImpl: typeof fetch) {
  const apiKey = process.env.WENWEN_API_KEY;
  const baseUrl = process.env.WENWEN_API_BASE_URL;
  const modelId = process.env.WENWEN_TEXT_MODEL;
  if (!apiKey || !baseUrl || !modelId || task.seedKeywords.length === 0) return [] as ReturnType<typeof parseKeywordIdeas>;
  try {
    const result = await createAiGatewayAdapter({ baseUrl, apiKey, fetchImpl }).generateText({
      modelId,
      requestId: task.requestId,
      responseFormat: 'json_object',
      maxTokens: 2_000,
      messages: [
        {
          role: 'system',
          content: '你是關鍵詞研究助手。只輸出 JSON，不要輸出搜尋量、CPC、難度、排名或流量。欄位為 suggestions，每項包含 keyword、intent、parentTopic、contentAngle、confidence。'
        },
        {
          role: 'user',
          content: JSON.stringify({
            seeds: task.seedKeywords,
            market: task.market,
            language: task.language,
            locale: task.locale,
            productContext: task.productContext,
            audience: task.audience,
            conversionGoal: task.conversionGoal
          })
        }
      ]
    });
    if (result.refused || result.truncated) return [];
    return parseKeywordIdeas(result.text);
  } catch {
    return [];
  }
}

function deterministicKeywordIdeas(task: Phase2QueuedTask) {
  const suffixes = ['教學', '是什麼', '最佳實踐', '常見問題', '推薦', '比較', '價格', '工具'];
  return task.seedKeywords.flatMap((seed) => suffixes.map((suffix) => ({
    keyword: `${seed} ${suffix}`.replace(/\s+/g, ' ').trim(),
    intent: suffix === '推薦' || suffix === '比較' || suffix === '價格' ? 'commercial' : 'informational',
    contentAngle: `圍繞「${seed}」整理可執行的${suffix}內容`,
    confidence: 0.45
  }))).slice(0, 200);
}

function calculateKeywordScore(metric: KeywordMetricResult | undefined, ownRank?: number) {
  if (!metric) return { score: undefined, confidence: 0.25 };
  const volume = metric.volume ?? 0;
  const difficulty = metric.difficulty ?? (metric.competition === undefined ? undefined : metric.competition * 100);
  const demand = volume > 0 ? Math.min(30, Math.log2(Math.max(1, volume)) * 3) : undefined;
  const attainability = difficulty === undefined ? undefined : Math.max(0, 25 - difficulty * 0.25);
  const traction = ownRank === undefined ? undefined : Math.max(0, 15 - ownRank * 0.7);
  const available = [demand, attainability, traction].filter((value): value is number => value !== undefined);
  if (available.length === 0) return { score: undefined, confidence: 0.2 };
  const raw = available.reduce((sum, value) => sum + value, 0);
  const score = Math.max(0, Math.min(100, (raw / (available.length === 3 ? 70 : available.length === 2 ? 55 : 30)) * 100));
  return { score: Number(score.toFixed(3)), confidence: Number((available.length / 3).toFixed(3)) };
}

async function saveWorkerKeywordCandidate(client: PoolClient, task: Phase2QueuedTask, input: {
  keyword: string;
  locale: string;
  intent?: string;
  sourceType: string;
  sourceRef?: string;
  score?: number;
  scoreConfidence?: number;
  modelVersion?: string;
  metric?: KeywordMetricResult;
}) {
  const normalized = input.keyword.replace(/\s+/g, ' ').trim().toLowerCase();
  const result = await client.query(
    `INSERT INTO keyword_candidates (
       id, workspace_id, project_id, normalized_keyword, display_keyword, locale, intent,
       source_type, source_ref, volume, cpc, difficulty, confidence,
       opportunity_score, score_confidence, model_version
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     ON CONFLICT (project_id, normalized_keyword) DO UPDATE SET
       display_keyword = EXCLUDED.display_keyword,
       locale = EXCLUDED.locale,
       intent = COALESCE(EXCLUDED.intent, keyword_candidates.intent),
       source_type = EXCLUDED.source_type,
       source_ref = COALESCE(EXCLUDED.source_ref, keyword_candidates.source_ref),
       volume = COALESCE(EXCLUDED.volume, keyword_candidates.volume),
       cpc = COALESCE(EXCLUDED.cpc, keyword_candidates.cpc),
       difficulty = COALESCE(EXCLUDED.difficulty, keyword_candidates.difficulty),
       confidence = COALESCE(EXCLUDED.confidence, keyword_candidates.confidence),
       opportunity_score = COALESCE(EXCLUDED.opportunity_score, keyword_candidates.opportunity_score),
       score_confidence = COALESCE(EXCLUDED.score_confidence, keyword_candidates.score_confidence),
       model_version = COALESCE(EXCLUDED.model_version, keyword_candidates.model_version),
       updated_at = now()
     RETURNING id`,
    [
      crypto.randomUUID(), task.workspaceId, task.projectId, normalized, input.keyword, input.locale,
      input.intent ?? null, input.sourceType, input.sourceRef ?? null,
      input.metric?.volume ?? null, input.metric?.cpcUsd ?? null, input.metric?.difficulty ?? null,
      input.metric ? 1 : input.scoreConfidence ?? null, input.score ?? null, input.scoreConfidence ?? null,
      input.modelVersion ?? null
    ]
  );
  if (!result.rows[0]) throw new Error('KEYWORD_CANDIDATE_SAVE_FAILED');
  return String(result.rows[0].id);
}

async function processKeywordResearchTask(
  client: PoolClient,
  task: Phase2QueuedTask,
  fetchImpl: typeof fetch,
  governance?: TaskGovernance
) {
  if (!task.runId || !task.projectId || !task.market || !task.language || task.seedKeywords.length === 0) throw new Error('KEYWORD_RESEARCH_INPUT_INVALID');
  const provider = createKeywordResearchProviderFromEnvironment(fetchImpl);
  if (!provider) throw new Error('PROVIDER_UNAVAILABLE');
  if (process.env.NODE_ENV === 'production' && !governance) throw new Error('RATE_LIMIT_UNAVAILABLE');
  if (governance) {
    const circuit = await governance.allowProvider(provider.id, 'keyword_research', providerCircuitPolicy);
    const rate = await governance.consume(`provider:${provider.id}:keyword_research`, providerRatePolicy);
    if (!circuit.allowed || !rate.allowed) throw new Error('PROVIDER_UNAVAILABLE');
  }
  const state = await client.query(`SELECT status FROM phase2_tasks WHERE id = $1 AND workspace_id = $2 AND lease_owner = $3`, [task.id, task.workspaceId, task.leaseOwner]);
  if (state.rows[0]?.status === 'cancellation_requested') {
    await client.query(`UPDATE phase2_tasks SET status = 'cancelled', completed_at = now(), lease_owner = NULL, lease_expires_at = NULL, updated_at = now() WHERE id = $1 AND workspace_id = $2 AND lease_owner = $3`, [task.id, task.workspaceId, task.leaseOwner]);
    return;
  }
  const input = {
    seeds: task.seedKeywords,
    market: task.market,
    language: task.language,
    device: task.device ?? 'desktop',
    engine: task.engine ?? 'google'
  } as const;
  const metricResult = await provider.discoverKeywordMetrics(input);
  await client.query(`UPDATE phase2_tasks SET progress = 20, updated_at = now() WHERE id = $1 AND lease_owner = $2`, [task.id, task.leaseOwner]);
  const aiIdeas = await generateKeywordIdeas(task, fetchImpl);
  const generatedIdeas = aiIdeas.length > 0 ? aiIdeas : deterministicKeywordIdeas(task);
  const ideas = [...new Map([
    ...generatedIdeas,
    ...metricResult.metrics.map((metric) => ({ keyword: metric.keyword, intent: undefined, contentAngle: undefined, confidence: 1 }))
  ].map((idea) => [idea.keyword.toLowerCase(), idea])).values()];
  const modelVersion = aiIdeas.length > 0 ? process.env.WENWEN_TEXT_MODEL : 'deterministic-keyword-expansion-v1';
  const metricMap = new Map(metricResult.metrics.map((metric) => [metric.keyword.toLowerCase(), metric]));
  const candidateIds = new Map<string, string>();
  for (const idea of ideas) {
    const metric = metricMap.get(idea.keyword.toLowerCase());
    const score = calculateKeywordScore(metric);
    const candidateId = await saveWorkerKeywordCandidate(client, task, {
      keyword: idea.keyword,
      locale: task.locale ?? task.language,
      intent: idea.intent,
      sourceType: metric ? 'provider_estimated' : aiIdeas.length > 0 ? 'ai_inferred' : 'deterministic_check',
      sourceRef: metric ? metricResult.providerSnapshotId : undefined,
      score: score.score,
      scoreConfidence: score.confidence,
      modelVersion,
      metric
    });
    candidateIds.set(idea.keyword.toLowerCase(), candidateId);
    if (metric) {
      const metricRows: Array<[string, number | undefined]> = [
        ['volume', metric.volume], ['cpc_usd', metric.cpcUsd], ['competition', metric.competition],
        ['difficulty', metric.difficulty], ['trend', metric.trend]
      ];
      for (const [metricName, numericValue] of metricRows) {
        if (numericValue === undefined) continue;
        await client.query(
          `INSERT INTO keyword_metrics (
             id, workspace_id, run_id, candidate_id, metric_name, numeric_value, provider,
             source_type, provider_snapshot_id, location, language, device, collected_at,
             provider_updated_at, methodology_version, confidence, raw_response_ref
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'provider_estimated', $8, $9, $10, $11, $12, $13, $14, 1, $15)`,
          [
            crypto.randomUUID(), task.workspaceId, task.runId, candidateId, metricName, numericValue,
            metricResult.provider, metricResult.providerSnapshotId, metricResult.location, metricResult.language,
            metricResult.device, metricResult.collectedAt, metric.providerUpdatedAt ?? null,
            metricResult.methodologyVersion, metricResult.rawResponseHash ?? null
          ]
        );
      }
    }
  }
  await client.query(`UPDATE phase2_tasks SET progress = 45, updated_at = now() WHERE id = $1 AND lease_owner = $2`, [task.id, task.leaseOwner]);

  let competitorCount = 0;
  let observationCount = 0;
  for (const domain of task.competitorDomains.slice(0, 5)) {
    const competitor = await client.query(
      `INSERT INTO competitor_domains (id, workspace_id, project_id, normalized_domain)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (project_id, normalized_domain) DO UPDATE SET normalized_domain = EXCLUDED.normalized_domain
       RETURNING id`,
      [crypto.randomUUID(), task.workspaceId, task.projectId, domain]
    );
    const competitorId = String(competitor.rows[0].id);
    const ranked = await provider.getCompetitorRankedKeywords({ ...input, domain, limit: 100 });
    competitorCount += 1;
    for (const rankedKeyword of ranked.keywords.slice(0, 100)) {
      const key = rankedKeyword.keyword.toLowerCase();
      const candidateId = candidateIds.get(key) ?? await saveWorkerKeywordCandidate(client, task, {
        keyword: rankedKeyword.keyword,
        locale: task.locale ?? task.language,
        sourceType: 'provider_estimated',
        sourceRef: ranked.providerSnapshotId,
        score: undefined,
        scoreConfidence: 0.25,
        modelVersion
      });
      candidateIds.set(key, candidateId);
      await client.query(
        `INSERT INTO keyword_observations (
           id, workspace_id, run_id, candidate_id, domain_type, competitor_id, domain, rank,
           url, etv, serp_features, source_type, provider, provider_snapshot_id, collected_at
         ) VALUES ($1, $2, $3, $4, 'competitor', $5, $6, $7, $8, $9, $10::jsonb, 'provider_estimated', $11, $12, $13)`,
        [
          crypto.randomUUID(), task.workspaceId, task.runId, candidateId, competitorId, domain,
          rankedKeyword.rank ?? null, rankedKeyword.url ?? null, rankedKeyword.etv ?? null,
          JSON.stringify(rankedKeyword.serpFeatures ?? []), ranked.provider, ranked.providerSnapshotId, ranked.collectedAt
        ]
      );
      observationCount += 1;
      const score = calculateKeywordScore(metricMap.get(key));
      await client.query(`UPDATE keyword_candidates SET opportunity_score = COALESCE(opportunity_score, $2), score_confidence = COALESCE(score_confidence, $3), updated_at = now() WHERE id = $1 AND workspace_id = $4`, [candidateId, score.score, score.confidence, task.workspaceId]);
      await client.query(
        `INSERT INTO keyword_gap_snapshots (
           id, workspace_id, run_id, candidate_id, classification, competitor_best_rank,
           competitor_ids, evidence_refs, score, score_confidence, provider, provider_snapshot_id, collected_at
         ) VALUES ($1, $2, $3, $4, 'missing', $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12)
         ON CONFLICT (run_id, candidate_id) DO UPDATE SET
           competitor_best_rank = LEAST(COALESCE(keyword_gap_snapshots.competitor_best_rank, 101), EXCLUDED.competitor_best_rank),
           competitor_ids = EXCLUDED.competitor_ids,
           evidence_refs = EXCLUDED.evidence_refs,
           score = COALESCE(EXCLUDED.score, keyword_gap_snapshots.score),
           score_confidence = COALESCE(EXCLUDED.score_confidence, keyword_gap_snapshots.score_confidence),
           collected_at = EXCLUDED.collected_at`,
        [
          crypto.randomUUID(), task.workspaceId, task.runId, candidateId, rankedKeyword.rank ?? null,
          JSON.stringify([competitorId]), JSON.stringify([ranked.providerSnapshotId]), score.score,
          score.confidence, ranked.provider, ranked.providerSnapshotId, ranked.collectedAt
        ]
      );
    }
  }
  await client.query(`UPDATE keyword_research_runs SET status = 'completed', provider_snapshot_id = $2, provider_methodology_version = $3, collected_at = $4, partial_reason = $5 WHERE id = $1 AND workspace_id = $6`, [task.runId, metricResult.providerSnapshotId, metricResult.methodologyVersion, metricResult.collectedAt, aiIdeas.length > 0 ? null : 'AI gateway unavailable; deterministic expansion used', task.workspaceId]);
  if (task.reservationId) {
    await client.query(
      `INSERT INTO usage_ledger (
         id, workspace_id, operation, event_type, reservation_id, provider, task_id, request_id,
         units, cost_estimate, actual_cost
       )
       SELECT $1, workspace_id, operation, 'finalize', reservation_id, provider, task_id, request_id, units, cost_estimate, $2
       FROM usage_ledger reserve
       WHERE workspace_id = $3 AND reservation_id = $4 AND event_type = 'reserve'
         AND NOT EXISTS (SELECT 1 FROM usage_ledger terminal WHERE terminal.reservation_id = reserve.reservation_id AND terminal.event_type IN ('finalize', 'release'))`,
      [crypto.randomUUID(), metricResult.estimatedCost, task.workspaceId, task.reservationId]
    );
  }
  await client.query(
    `UPDATE phase2_tasks SET status = 'completed', progress = 100, result = $2::jsonb,
       completed_at = now(), lease_owner = NULL, lease_expires_at = NULL, updated_at = now()
     WHERE id = $1 AND status = 'running' AND lease_owner = $3`,
    [task.id, JSON.stringify({ provider: metricResult.provider, providerSnapshotId: metricResult.providerSnapshotId, candidateCount: candidateIds.size, competitorCount, observationCount, partial: aiIdeas.length === 0 }), task.leaseOwner]
  );
  await governance?.recordProviderOutcome(provider.id, 'keyword_research', true, providerCircuitPolicy);
}

async function failPhase2Task(client: PoolClient, task: Phase2QueuedTask, error: unknown) {
  const nextRetryCount = task.retryCount + 1;
  const errorCode = normalizeWorkerErrorCode(error);
  const retryable = isRetryablePhase2ErrorCode(errorCode);
  const status = retryable ? getPhase2FailureStatus(nextRetryCount, task.maxRetries) : 'dead_letter';
  const availableAt = new Date(Date.now() + getPhase2RetryDelayWithJitterMs(task.retryCount));
  await client.query(
    `
      UPDATE phase2_tasks
      SET status = $2,
          retry_count = $3,
          error_code = $4,
          available_at = CASE WHEN $2 = 'queued' THEN $5 ELSE available_at END,
          lease_owner = NULL,
          lease_expires_at = NULL,
          updated_at = now(),
          completed_at = CASE WHEN $2 = 'dead_letter' THEN now() ELSE NULL END
      WHERE id = $1 AND status = 'running' AND lease_owner = $6
    `,
    [task.id, status, nextRetryCount, errorCode, availableAt, task.leaseOwner]
  );
  await client.query(
    `
      UPDATE task_attempts
      SET status = $4, error_code = $5, retry_after_ms = $6, completed_at = now(), cost = 0
      WHERE task_id = $1 AND workspace_id = $2 AND attempt_no = $3
    `,
    [
      task.id, task.workspaceId, nextRetryCount, status === 'dead_letter' ? 'dead_letter' : 'failed',
      errorCode, status === 'queued' ? getPhase2RetryDelayWithJitterMs(task.retryCount) : null
    ]
  );
  if (task.runId && status === 'dead_letter') {
    await client.query(
      `UPDATE keyword_research_runs
       SET status = 'failed', partial_reason = $2, completed_at = now()
       WHERE id = $1 AND workspace_id = $3`,
      [task.runId, errorCode, task.workspaceId]
    );
  }
}

async function saveGatewayModel(client: PoolClient, model: GatewayModel) {
  await client.query(
    `
      INSERT INTO gateway_model_catalog (
        id, gateway, model_id, owned_by, supported_endpoint_types,
        capability_status, catalog_hash, verified_at
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
      ON CONFLICT (gateway, model_id, catalog_hash) DO UPDATE SET
        owned_by = EXCLUDED.owned_by,
        supported_endpoint_types = EXCLUDED.supported_endpoint_types,
        verified_at = EXCLUDED.verified_at
    `,
    [
      crypto.randomUUID(),
      model.gateway,
      model.modelId,
      model.ownedBy ?? null,
      JSON.stringify(model.supportedEndpointTypes),
      model.capabilityStatus,
      model.catalogHash,
      model.verifiedAt ?? new Date().toISOString()
    ]
  );
}

async function completeTask(client: PoolClient, task: QueuedTask, articlesReceived: number, mediaReceived: number) {
  const completedAt = new Date();
  await client.query(
    `
      INSERT INTO sync_runs (
        id,
        site_id,
        task_id,
        batch_index,
        completed_at,
        articles_received,
        media_received,
        status
      )
      VALUES ($1, $2, $3, 1, $4, $5, $6, 'completed')
      ON CONFLICT DO NOTHING
    `,
    [crypto.randomUUID(), task.siteId, task.id, completedAt, articlesReceived, mediaReceived]
  );
  await client.query(
    `
      UPDATE sync_tasks
      SET status = 'completed',
          batches_received = 1,
          articles_received = $2,
          media_received = $3,
          completed_at = $4
      WHERE id = $1
    `,
    [task.id, articlesReceived, mediaReceived, completedAt]
  );
  await client.query(
    `
      UPDATE site_connections
      SET last_sync_at = $2,
          last_sync_stats = $3
      WHERE id = $1
    `,
    [
      task.siteId,
      completedAt,
      JSON.stringify({
        articlesReceived,
        mediaReceived
      })
    ]
  );
}

function getRetryDelayMs(retryCount: number) {
  return Math.min(60_000, 2 ** Math.max(0, retryCount) * 5_000);
}

async function failTask(client: PoolClient, task: QueuedTask, error: unknown) {
  const message = normalizeWorkerErrorCode(error);
  const nextRetryCount = task.retryCount + 1;
  const shouldDeadLetter = nextRetryCount > task.maxRetries;

  await client.query(
    `
      UPDATE sync_tasks
      SET status = $2,
          retry_count = $3,
          error_message = $4,
          next_run_at = $5,
          completed_at = CASE WHEN $2 IN ('failed', 'dead_letter') THEN now() ELSE NULL END,
          dead_lettered_at = CASE WHEN $2 = 'dead_letter' THEN now() ELSE dead_lettered_at END
      WHERE id = $1
    `,
    [
      task.id,
      shouldDeadLetter ? 'dead_letter' : 'queued',
      nextRetryCount,
      message,
      shouldDeadLetter ? null : new Date(Date.now() + getRetryDelayMs(task.retryCount))
    ]
  );

  if (task.suggestionId && shouldDeadLetter) {
    await client.query(
      `
        UPDATE optimization_suggestions
        SET status = 'failed',
            error_message = $2
        WHERE id = $1
      `,
      [task.suggestionId, message]
    );
  }

  if (task.applySnapshotId && shouldDeadLetter) {
    await client.query(
      `
        UPDATE apply_snapshots
        SET status = 'failed',
            error_message = $2
        WHERE id = $1
      `,
      [task.applySnapshotId, message]
    );
  }
}

async function fetchWordPressJson(
  fetchImpl: typeof fetch,
  url: string,
  credentials: WordPressCredentials,
  init: RequestInit | undefined,
  validateUrl: PublicUrlValidator
) {
  let target = await validateUrl(url);
  const trustedOrigin = target.url.origin;

  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const requestInit: RequestInit = {
        ...init,
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          Authorization: createBasicAuthHeader(credentials),
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
          ...init?.headers
        }
      };
      const response = fetchImpl === fetch
        ? await fetchValidatedPublicUrl(target, requestInit)
        : await fetchImpl(target.url.toString(), requestInit);
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers?.get('location');
        if (!location || redirectCount === 3) throw new Error('UNSAFE_TARGET_URL');
        target = await validateUrl(new URL(location, target.url).toString());
        if (target.url.origin !== trustedOrigin) throw new Error('UNSAFE_TARGET_URL');
        continue;
      }
      if (!response.ok) throw new Error(`WORDPRESS_REST_${response.status}`);
      const contentType = response.headers?.get('content-type') ?? '';
      const contentLength = Number(response.headers?.get('content-length') ?? 0);
      if (contentLength > 2 * 1024 * 1024 || (contentType && !contentType.includes('application/json'))) {
        throw new Error('WORDPRESS_RESPONSE_INVALID');
      }
      if (typeof response.text === 'function') {
        const body = await response.text();
        if (Buffer.byteLength(body, 'utf8') > 2 * 1024 * 1024) {
          throw new Error('WORDPRESS_RESPONSE_TOO_LARGE');
        }
        try {
          return JSON.parse(body) as Record<string, unknown>;
        } catch {
          throw new Error('WORDPRESS_RESPONSE_INVALID');
        }
      }
      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error('WORDPRESS_REQUEST_TIMEOUT', { cause: error });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('UNSAFE_TARGET_URL');
}

async function processManualRefreshTask(
  client: PoolClient,
  task: QueuedTask,
  fetchImpl: typeof fetch,
  validateUrl: PublicUrlValidator
) {
  if (!task.targetCmsId) {
    throw new Error('SYNC_TASK_TARGET_MISSING');
  }

  const credentials = getCredentials(task);
  const path = task.scope === 'article' ? `posts/${task.targetCmsId}` : `media/${task.targetCmsId}`;
  const body = await fetchWordPressJson(fetchImpl, buildWordPressUrl(task.siteUrl, path), credentials, undefined, validateUrl);
  const now = new Date();

  if (task.scope === 'article') {
    const article = body.article as Record<string, unknown> | undefined;
    if (!article) {
      throw new Error('WORDPRESS_ARTICLE_RESPONSE_INVALID');
    }

    await upsertArticle(client, task.siteId, article, now);
    await completeTask(client, task, 1, 0);
    return;
  }

  const media = body.media as Record<string, unknown> | undefined;
  if (!media) {
    throw new Error('WORDPRESS_MEDIA_RESPONSE_INVALID');
  }

  await upsertMedia(client, task.siteId, media, now);
  await completeTask(client, task, 0, 1);
}

async function processSuggestionApplyTask(
  client: PoolClient,
  task: QueuedTask,
  fetchImpl: typeof fetch,
  validateUrl: PublicUrlValidator
) {
  if (!task.suggestionId || !task.targetCmsId) {
    throw new Error('SUGGESTION_TASK_INVALID');
  }

  const suggestionResult = await client.query(
    `
      SELECT *
      FROM optimization_suggestions
      WHERE id = $1
        AND site_id = $2
        AND status = 'approved'
      LIMIT 1
    `,
    [task.suggestionId, task.siteId]
  );
  const suggestion = suggestionResult.rows[0];
  if (!suggestion) {
    throw new Error('SUGGESTION_NOT_APPROVED');
  }

  const credentials = getCredentials(task);
  const targetType = String(suggestion.target_type);
  const fieldName = String(suggestion.field_name);

  // Read the real current WordPress field value before writeback
  const currentEndpoint = targetType === 'article' ? `posts/${task.targetCmsId}` : `media/${task.targetCmsId}`;
  const currentData = await fetchWordPressJson(
    fetchImpl,
    buildWordPressUrl(task.siteUrl, currentEndpoint),
    credentials,
    undefined,
    validateUrl
  );

  const currentItem = (targetType === 'article' ? currentData.article : currentData.media) as Record<string, unknown> | undefined;
  let realCurrentValue = '';

  if (currentItem) {
    if (fieldName === 'contentHtml') {
      realCurrentValue = String(currentItem.contentHtml ?? currentItem.content_html ?? '');
    } else if (fieldName === 'altText') {
      realCurrentValue = String(currentItem.altText ?? currentItem.alt_text ?? '');
    } else if (fieldName === 'fileName') {
      realCurrentValue = String(currentItem.fileName ?? currentItem.file_name ?? '');
    } else if (fieldName === 'metaDescription') {
      realCurrentValue = String(currentItem.metaDescription ?? currentItem.meta_description ?? '');
    } else {
      realCurrentValue = String(currentItem[fieldName] ?? '');
    }
  }

  // Read WordPress real-time field value and update snapshot for accurate rollback.
  // This ensures the snapshot's before_value reflects the actual WordPress value
  // at writeback time, not the potentially stale audit value.
  const beforeValueSnapshotUpdated = realCurrentValue !== '';
  if (beforeValueSnapshotUpdated) {
    const existingSnapshot = await client.query(
      `
        SELECT before_value
        FROM apply_snapshots
        WHERE suggestion_id = $1
          AND task_id = $2
        LIMIT 1
      `,
      [task.suggestionId, task.id]
    );

    const snapshotBeforeValue = String(existingSnapshot?.rows[0]?.before_value ?? '');

    if (snapshotBeforeValue !== realCurrentValue) {
      console.log(
        '[suggestion_apply] snapshot mismatch field=%s article=%s audit_length=%d wordpress_length=%d',
        fieldName,
        task.targetCmsId,
        snapshotBeforeValue.length,
        realCurrentValue.length
      );
    }

    // Always update the snapshot with the real WordPress value and record the match timestamp
    await client.query(
      `
        UPDATE apply_snapshots
        SET before_value = $2,
            snapshot_matched_at = now()
        WHERE suggestion_id = $1
          AND task_id = $3
      `,
      [task.suggestionId, realCurrentValue, task.id]
    );
  }

  const payload = buildSuggestionPayload(suggestion, currentItem);
  const path =
    targetType === 'article'
      ? `posts/${task.targetCmsId}/apply`
      : `media/${task.targetCmsId}/apply`;
  await fetchWordPressJson(fetchImpl, buildWordPressUrl(task.siteUrl, path), credentials, {
    method: 'POST',
    body: JSON.stringify(payload)
  }, validateUrl);

  await client.query(
    `
      UPDATE optimization_suggestions
      SET status = 'applied',
          applied_at = now(),
          error_message = NULL
      WHERE id = $1
    `,
    [task.suggestionId]
  );
  await client.query(
    `
      UPDATE apply_snapshots
      SET status = 'applied',
          applied_at = now(),
          error_message = NULL
      WHERE suggestion_id = $1
        AND task_id = $2
    `,
    [task.suggestionId, task.id]
  );
  await completeTask(client, task, targetType === 'article' ? 1 : 0, targetType === 'media' ? 1 : 0);
}

async function processSuggestionRollbackTask(
  client: PoolClient,
  task: QueuedTask,
  fetchImpl: typeof fetch,
  validateUrl: PublicUrlValidator
) {
  if (!task.applySnapshotId || !task.targetCmsId) {
    throw new Error('ROLLBACK_TASK_INVALID');
  }

  const snapshotResult = await client.query(
    `
      SELECT *
      FROM apply_snapshots
      WHERE id = $1
        AND site_id = $2
        AND status = 'applied'
      LIMIT 1
    `,
    [task.applySnapshotId, task.siteId]
  );
  const snapshot = snapshotResult.rows[0];
  if (!snapshot) {
    throw new Error('APPLY_SNAPSHOT_NOT_APPLIED');
  }

  const credentials = getCredentials(task);
  const payload = buildRollbackPayload(snapshot);
  const path =
    snapshot.target_type === 'article'
      ? `posts/${task.targetCmsId}/apply`
      : `media/${task.targetCmsId}/apply`;

  await fetchWordPressJson(fetchImpl, buildWordPressUrl(task.siteUrl, path), credentials, {
    method: 'POST',
    body: JSON.stringify(payload)
  }, validateUrl);

  await client.query(
    `
      UPDATE apply_snapshots
      SET status = 'rolled_back',
          rolled_back_at = now(),
          error_message = NULL
      WHERE id = $1
    `,
    [task.applySnapshotId]
  );
  await completeTask(client, task, snapshot.target_type === 'article' ? 1 : 0, snapshot.target_type === 'media' ? 1 : 0);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return entities[char] ?? char;
  });
}

function normalizeSafeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function parseInternalLinkSuggestionLinks(value: string) {
  try {
    const parsed = JSON.parse(value) as {
      links?: Array<{
        targetUrl?: unknown;
        targetTitle?: unknown;
        anchorText?: unknown;
        relevance?: unknown;
        reason?: unknown;
      }>;
    };

    if (!Array.isArray(parsed.links)) {
      return [];
    }

    return parsed.links
      .map((link) => {
        const href = normalizeSafeUrl(String(link.targetUrl ?? ''));
        const anchorText = String(link.anchorText ?? link.targetTitle ?? '').trim();
        if (!href || !anchorText) {
          return undefined;
        }

        return {
          href,
          anchorText,
          relevance: String(link.relevance ?? '').trim(),
          reason: String(link.reason ?? '').trim()
        };
      })
      .filter((link): link is { href: string; anchorText: string; relevance: string; reason: string } => Boolean(link));
  } catch {
    return [];
  }
}

function stripExistingInternalLinkBlock(contentHtml: string) {
  return contentHtml
    .replace(/<div\b[^>]*class=["'][^"']*rankwoven-related-links[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')
    .trim();
}

function buildInternalLinkBlock(suggestedValue: string) {
  const links = parseInternalLinkSuggestionLinks(suggestedValue);
  if (links.length === 0) {
    return [
      '<div class="rankwoven-related-links">',
      '<p><strong>相關閱讀：</strong></p>',
      `<p>${escapeHtml(suggestedValue)}</p>`,
      '</div>'
    ].join('\n');
  }

  const items = links.map((link) => {
    const meta = [link.relevance ? `關聯度：${link.relevance}` : '', link.reason]
      .filter(Boolean)
      .join('，');
    const suffix = meta ? ` <span>${escapeHtml(meta)}</span>` : '';
    return `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.anchorText)}</a>${suffix}</li>`;
  });

  return [
    '<div class="rankwoven-related-links">',
    '<p><strong>相關閱讀：</strong></p>',
    '<ul>',
    ...items,
    '</ul>',
    '</div>'
  ].join('\n');
}

function appendInternalLinksToContent(contentHtml: string, suggestedValue: string) {
  const baseContent = stripExistingInternalLinkBlock(contentHtml);
  const internalLinkBlock = buildInternalLinkBlock(suggestedValue);

  return `${baseContent}\n\n${internalLinkBlock}`.trim();
}

function buildSuggestionPayload(suggestion: QueryResultRow, currentItem?: Record<string, unknown>) {
  const fieldName = String(suggestion.field_name);
  const suggestedValue = String(suggestion.suggested_value);
  const suggestionType = String(suggestion.suggestion_type ?? '');

  if (suggestionType === 'internal_link' && fieldName === 'contentHtml') {
    const currentContentHtml = String(currentItem?.contentHtml ?? currentItem?.content_html ?? '');
    return {
      contentHtml: appendInternalLinksToContent(currentContentHtml, suggestedValue)
    };
  }

  if (fieldName === 'contentHtml') {
    return { contentHtml: suggestedValue };
  }

  if (fieldName === 'altText') {
    return { altText: suggestedValue };
  }

  if (fieldName === 'fileName') {
    return { fileName: suggestedValue };
  }

  if (fieldName === 'metaDescription') {
    return { metaDescription: suggestedValue };
  }

  return { [fieldName]: suggestedValue };
}

function buildRollbackPayload(snapshot: QueryResultRow) {
  const fieldName = String(snapshot.field_name);
  const beforeValue = snapshot.before_value === null || snapshot.before_value === undefined
    ? ''
    : String(snapshot.before_value);

  if (fieldName === 'contentHtml') {
    return { contentHtml: beforeValue };
  }

  if (fieldName === 'altText') {
    return { altText: beforeValue };
  }

  if (fieldName === 'fileName') {
    return { fileName: beforeValue };
  }

  if (fieldName === 'metaDescription') {
    return { metaDescription: beforeValue };
  }

  return { [fieldName]: beforeValue };
}

async function upsertArticle(client: PoolClient, siteId: string, article: Record<string, unknown>, syncedAt: Date) {
  await client.query(
    `
      INSERT INTO synced_articles (
        site_id, cms_id, type, title, slug, status, url, excerpt, content_html,
        author, categories, tags, featured_image_id, published_at, cms_updated_at, synced_at
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
      String(article.cmsId),
      ['post', 'page', 'portfolio', 'product'].includes(String(article.type))
        ? String(article.type)
        : 'post',
      String(article.title ?? ''),
      String(article.slug ?? ''),
      String(article.status ?? ''),
      String(article.url ?? ''),
      article.excerpt ? String(article.excerpt) : null,
      article.contentHtml ? String(article.contentHtml) : null,
      article.author ? String(article.author) : null,
      JSON.stringify(Array.isArray(article.categories) ? article.categories : []),
      JSON.stringify(Array.isArray(article.tags) ? article.tags : []),
      article.featuredImageId ? String(article.featuredImageId) : null,
      article.publishedAt ? String(article.publishedAt) : null,
      String(article.updatedAt ?? new Date(0).toISOString()),
      syncedAt
    ]
  );
}

async function upsertMedia(client: PoolClient, siteId: string, media: Record<string, unknown>, syncedAt: Date) {
  await client.query(
    `
      INSERT INTO synced_media (
        site_id, cms_id, title, url, mime_type, file_name, caption, description,
        alt_text, attached_to_cms_id, cms_updated_at, synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (site_id, cms_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        url = EXCLUDED.url,
        mime_type = EXCLUDED.mime_type,
        file_name = EXCLUDED.file_name,
        caption = EXCLUDED.caption,
        description = EXCLUDED.description,
        alt_text = EXCLUDED.alt_text,
        attached_to_cms_id = EXCLUDED.attached_to_cms_id,
        cms_updated_at = EXCLUDED.cms_updated_at,
        synced_at = EXCLUDED.synced_at
    `,
    [
      siteId,
      String(media.cmsId),
      String(media.title ?? ''),
      String(media.url ?? ''),
      media.mimeType ? String(media.mimeType) : null,
      media.fileName ? String(media.fileName) : null,
      media.caption ? String(media.caption) : null,
      media.description ? String(media.description) : null,
      media.altText ? String(media.altText) : null,
      media.attachedToCmsId ? String(media.attachedToCmsId) : null,
      String(media.updatedAt ?? new Date(0).toISOString()),
      syncedAt
    ]
  );
}

export async function processNextQueuedTask(
  pool: Pool,
  fetchImpl: typeof fetch = fetch,
  validateUrl: PublicUrlValidator = validatePublicUrl,
  governance?: TaskGovernance,
  workerId: string = crypto.randomUUID(),
  logger?: Pick<Console, 'log' | 'error'>
) {
  const client = await pool.connect();
  let task: QueuedTask | undefined;
  let phase2Task: Phase2QueuedTask | undefined;

  try {
    await client.query('BEGIN');
    await recoverExpiredPhase2Leases(client);
    phase2Task = await claimNextPhase2Task(client, workerId);
    if (phase2Task) {
      logPhase2TaskEvent(logger, 'claimed', phase2Task);
      await client.query('COMMIT');
      await client.query('BEGIN');
      if (phase2Task.kind === 'gateway_model_sync') {
        await processGatewayModelSyncTask(client, phase2Task, fetchImpl, governance);
      } else if (phase2Task.kind === 'keyword_research') {
        await processKeywordResearchTask(client, phase2Task, fetchImpl, governance);
      } else {
        throw new Error('PROVIDER_UNAVAILABLE');
      }
      await client.query('COMMIT');
      logPhase2TaskEvent(logger, 'completed', phase2Task);
      return phase2Task;
    }
    task = await claimNextTask(client);

    if (!task) {
      await client.query('COMMIT');
      return undefined;
    }

    await client.query('COMMIT');

    await client.query('BEGIN');
    if (task.scope === 'article' || task.scope === 'media') {
      await processManualRefreshTask(client, task, fetchImpl, validateUrl);
    } else if (task.scope === 'suggestion_rollback') {
      await processSuggestionRollbackTask(client, task, fetchImpl, validateUrl);
    } else {
      await processSuggestionApplyTask(client, task, fetchImpl, validateUrl);
    }
    await client.query('COMMIT');

    return task;
  } catch (error) {
    await client.query('ROLLBACK');

    if (phase2Task) {
      if (phase2Task.kind === 'keyword_research' && phase2Task.providerKey) {
        await governance?.recordProviderOutcome(phase2Task.providerKey, 'keyword_research', false, providerCircuitPolicy);
      }
      await failPhase2Task(client, phase2Task, error);
      logPhase2TaskEvent(logger, 'failed', phase2Task, normalizeWorkerErrorCode(error));
      return phase2Task;
    }

    if (task) {
      await failTask(client, task, error);
      return task;
    }

    throw error;
  } finally {
    client.release();
  }
}

export { claimNextPhase2Task, recoverExpiredPhase2Leases, processGatewayModelSyncTask, failPhase2Task };

function logWorkerHeartbeat(logger: Pick<Console, 'log'> = console) {
  const capabilities = adapter.getCapabilities();
  logger.log(
    JSON.stringify({
      service: 'worker',
      status: 'idle',
      cmsAdapter: capabilities.platform,
      timestamp: new Date().toISOString()
    })
  );
}

export function startWorker(options: WorkerOptions) {
  const pool = new Pool({ connectionString: options.databaseUrl });
  const pollIntervalMs = options.pollIntervalMs ?? defaultPollIntervalMs;
  const logger = options.logger ?? console;
  const workerId = options.workerId ?? crypto.randomUUID();
  const governance = options.governance ?? (
    process.env.REDIS_URL ? createRedisTaskGovernance(process.env.REDIS_URL) : undefined
  );

  logWorkerHeartbeat(logger);
  const heartbeatTimer = setInterval(() => logWorkerHeartbeat(logger), heartbeatMs);
  const pollTimer = setInterval(() => {
    processNextQueuedTask(pool, options.fetchImpl ?? fetch, validatePublicUrl, governance, workerId, logger).catch((error: unknown) => {
      logger.error(
        JSON.stringify({
          service: 'worker',
          status: 'error',
          message: normalizeWorkerErrorCode(error),
          timestamp: new Date().toISOString()
        })
      );
    });
  }, pollIntervalMs);

  return async () => {
    clearInterval(heartbeatTimer);
    clearInterval(pollTimer);
    await governance?.close();
    await pool.end();
  };
}

if (process.env.NODE_ENV !== 'test') {
  if (!process.env.DATABASE_URL) {
    logWorkerHeartbeat();
    setInterval(logWorkerHeartbeat, heartbeatMs);
  } else {
    startWorker({
      databaseUrl: process.env.DATABASE_URL
    });
  }
}
