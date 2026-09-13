import { createDecipheriv, createHash } from 'node:crypto';
import { createWordPressAdapter } from '@aieo/cms-adapters';
import { createAiGatewayAdapter, type GatewayModel } from '@aieo/ai-providers';
import { fetchValidatedPublicUrl, validatePublicUrl, type ValidatedPublicUrl } from '@aieo/security';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

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
  kind: 'gateway_model_sync';
  retryCount: number;
  maxRetries: number;
}

interface WorkerOptions {
  databaseUrl: string;
  pollIntervalMs?: number;
  fetchImpl?: typeof fetch;
  logger?: Pick<Console, 'log' | 'error'>;
}

interface WordPressCredentials {
  username: string;
  applicationPassword: string;
}

type PublicUrlValidator = (url: string) => Promise<ValidatedPublicUrl>;

const adapter = createWordPressAdapter();
const heartbeatMs = 30_000;
const defaultPollIntervalMs = 5_000;

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
    'PROVIDER_UNAVAILABLE'
  ].includes(message)) {
    return message;
  }
  if (message.startsWith('AI_GATEWAY_')) return message.split(':', 1)[0];
  return 'WORKER_TASK_FAILED';
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

async function claimNextPhase2Task(client: PoolClient): Promise<Phase2QueuedTask | undefined> {
  const result = await client.query(
    `
      SELECT id, workspace_id, kind, retry_count, max_retries
      FROM phase2_tasks
      WHERE status = 'queued'
        AND kind = 'gateway_model_sync'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `
  );
  const row = result.rows[0];
  if (!row) return undefined;

  await client.query(
    `UPDATE phase2_tasks SET status = 'running', updated_at = now() WHERE id = $1 AND status = 'queued'`,
    [row.id]
  );
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    kind: 'gateway_model_sync',
    retryCount: Number(row.retry_count ?? 0),
    maxRetries: Number(row.max_retries ?? 3)
  };
}

async function processGatewayModelSyncTask(
  client: PoolClient,
  task: Phase2QueuedTask,
  fetchImpl: typeof fetch
) {
  const gatewayKey = process.env.WENWEN_API_KEY;
  const gatewayBaseUrl = process.env.WENWEN_API_BASE_URL;
  if (!gatewayKey || !gatewayBaseUrl) {
    throw new Error('PROVIDER_UNAVAILABLE');
  }

  const models = await createAiGatewayAdapter({
    baseUrl: gatewayBaseUrl,
    apiKey: gatewayKey,
    fetchImpl
  }).listModels();
  for (const model of models) {
    await saveGatewayModel(client, model);
  }
  await client.query(
    `
      INSERT INTO task_attempts (
        id, task_id, workspace_id, attempt_no, status, started_at, completed_at, cost
      ) VALUES ($1, $2, $3, $4, 'completed', now(), now(), 0)
      ON CONFLICT (task_id, attempt_no) DO NOTHING
    `,
    [crypto.randomUUID(), task.id, task.workspaceId, task.retryCount + 1]
  );
  await client.query(
    `UPDATE phase2_tasks SET status = 'completed', progress = 100, result = $2::jsonb, completed_at = now(), updated_at = now() WHERE id = $1`,
    [task.id, JSON.stringify({ modelCount: models.length })]
  );
}

async function failPhase2Task(client: PoolClient, task: Phase2QueuedTask, error: unknown) {
  const nextRetryCount = task.retryCount + 1;
  const status = nextRetryCount > task.maxRetries ? 'dead_letter' : 'queued';
  const errorCode = normalizeWorkerErrorCode(error);
  await client.query(
    `
      UPDATE phase2_tasks
      SET status = $2,
          retry_count = $3,
          error_code = $4,
          updated_at = now(),
          completed_at = CASE WHEN $2 = 'dead_letter' THEN now() ELSE NULL END
      WHERE id = $1 AND status = 'running'
    `,
    [task.id, status, nextRetryCount, errorCode]
  );
  await client.query(
    `
      INSERT INTO task_attempts (
        id, task_id, workspace_id, attempt_no, status, error_code, started_at, completed_at, cost
      ) VALUES ($1, $2, $3, $4, 'failed', $5, now(), now(), 0)
      ON CONFLICT (task_id, attempt_no) DO NOTHING
    `,
    [crypto.randomUUID(), task.id, task.workspaceId, nextRetryCount, errorCode]
  );
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
  validateUrl: PublicUrlValidator = validatePublicUrl
) {
  const client = await pool.connect();
  let task: QueuedTask | undefined;
  let phase2Task: Phase2QueuedTask | undefined;

  try {
    await client.query('BEGIN');
    phase2Task = await claimNextPhase2Task(client);
    if (phase2Task) {
      await client.query('COMMIT');
      await client.query('BEGIN');
      await processGatewayModelSyncTask(client, phase2Task, fetchImpl);
      await client.query('COMMIT');
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
      await failPhase2Task(client, phase2Task, error);
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

export { claimNextPhase2Task, processGatewayModelSyncTask, failPhase2Task };

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

  logWorkerHeartbeat(logger);
  const heartbeatTimer = setInterval(() => logWorkerHeartbeat(logger), heartbeatMs);
  const pollTimer = setInterval(() => {
    processNextQueuedTask(pool, options.fetchImpl ?? fetch).catch((error: unknown) => {
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
