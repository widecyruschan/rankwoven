import { createHash, randomUUID } from 'node:crypto';

export type Phase2ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_TOKEN_INVALID'
  | 'FORBIDDEN'
  | 'WORKSPACE_RESOURCE_NOT_FOUND'
  | 'ENTITLEMENT_REQUIRED'
  | 'QUOTA_EXCEEDED'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'TASK_STATE_INVALID'
  | 'PROVIDER_UNAVAILABLE'
  | 'PARTIAL_RESULT'
  | 'PRICE_SNAPSHOT_UNAVAILABLE'
  | 'STALE_CONTENT_SNAPSHOT'
  | 'UNSAFE_TARGET_URL'
  | 'SOURCE_VERIFICATION_FAILED';

export interface ApiErrorShape {
  code: Phase2ErrorCode | string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: ApiErrorShape;
}

export interface RequestContext {
  requestId: string;
  workspaceId: string;
  actorId: string;
  actorRole: 'owner' | 'admin' | 'editor' | 'viewer';
  idempotencyKey?: string;
}

export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

export function normalizePagination(input: PaginationInput = {}): Required<Pick<PaginationInput, 'page' | 'pageSize'>> {
  const page = Number.isInteger(input.page) && Number(input.page) > 0 ? Number(input.page) : 1;
  const pageSize = Number.isInteger(input.pageSize) && Number(input.pageSize) > 0
    ? Math.min(Number(input.pageSize), 100)
    : 20;

  return { page, pageSize };
}

export function createPagination(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
  };
}

export type Phase2TaskStatus =
  | 'queued'
  | 'running'
  | 'partial'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'dead_letter';

export type Phase2TaskKind =
  | 'keyword_research'
  | 'content_optimization'
  | 'content_rewrite'
  | 'gateway_model_sync'
  | 'backlink_analysis'
  | 'cms_publish';

export interface Phase2Task {
  id: string;
  workspaceId: string;
  siteId?: string;
  kind: Phase2TaskKind;
  status: Phase2TaskStatus;
  progress: number;
  estimatedCredits: number;
  reservationId?: string;
  idempotencyKey?: string;
  requestHash?: string;
  result?: Record<string, unknown>;
  errorCode?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateTaskInput {
  workspaceId: string;
  siteId?: string;
  kind: Phase2TaskKind;
  estimatedCredits: number;
  reservationId?: string;
  idempotencyKey?: string;
  requestHash?: string;
  maxRetries?: number;
}

export const phase2TaskTransitions: Record<Phase2TaskStatus, readonly Phase2TaskStatus[]> = {
  queued: ['running', 'cancelled', 'expired'],
  running: ['partial', 'completed', 'failed', 'cancelled', 'expired'],
  partial: ['completed', 'failed', 'cancelled', 'expired'],
  completed: [],
  failed: ['queued', 'dead_letter'],
  cancelled: [],
  expired: [],
  dead_letter: []
};

export function canTransitionTask(from: Phase2TaskStatus, to: Phase2TaskStatus): boolean {
  return phase2TaskTransitions[from].includes(to);
}

export function assertTaskTransition(from: Phase2TaskStatus, to: Phase2TaskStatus): void {
  if (!canTransitionTask(from, to)) {
    throw new Error('TASK_STATE_INVALID');
  }
}

export interface TaskAttempt {
  id: string;
  taskId: string;
  workspaceId: string;
  attemptNo: number;
  status: Phase2TaskStatus;
  providerRequestId?: string;
  errorCode?: string;
  startedAt: string;
  completedAt?: string;
  cost?: number;
}

export type UsageLedgerEventType = 'reserve' | 'finalize' | 'release';

export interface UsageLedgerEntry {
  id: string;
  workspaceId: string;
  operation: string;
  eventType: UsageLedgerEventType;
  reservationId: string;
  provider?: string;
  gatewayModel?: string;
  priceSnapshotId?: string;
  units: number;
  costEstimate: number;
  actualCost?: number;
  idempotencyKey?: string;
  createdAt: string;
}

export interface ReserveUsageInput {
  workspaceId: string;
  operation: string;
  reservationId?: string;
  provider?: string;
  gatewayModel?: string;
  priceSnapshotId?: string;
  units: number;
  costEstimate: number;
  idempotencyKey?: string;
}

export interface Phase2UsageSummary {
  reservedUnits: number;
  reservedCost: number;
  finalizedCost: number;
  releasedCost: number;
}

export interface IdempotencyRecord {
  workspaceId: string;
  method: string;
  route: string;
  key: string;
  requestHash: string;
  statusCode: number;
  responseBody: unknown;
  createdAt: string;
}

export function hashRequestBody(body: unknown): string {
  const canonicalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, nested]) => [key, canonicalize(nested)])
      );
    }
    return value;
  };

  return createHash('sha256').update(JSON.stringify(canonicalize(body ?? null))).digest('hex');
}

export function createRequestContext(input: Omit<RequestContext, 'requestId'> & { requestId?: string }): RequestContext {
  return {
    ...input,
    requestId: input.requestId ?? randomUUID()
  };
}

export interface AuditEvent {
  id: string;
  workspaceId: string;
  actorType: 'user' | 'system' | 'worker' | 'webhook';
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type GatewayEndpointType = 'chat' | 'embedding' | 'image';

export interface GatewayModel {
  gateway: 'wenwen';
  modelId: string;
  ownedBy?: string;
  supportedEndpointTypes: GatewayEndpointType[];
  capabilityStatus: 'pending' | 'verified' | 'unavailable';
  catalogHash: string;
  verifiedAt?: string;
}

export interface GatewayPriceSnapshot {
  id: string;
  gateway: 'wenwen';
  modelId: string;
  inputPrice?: number;
  outputPrice?: number;
  imagePrice?: number;
  currency: string;
  effectiveAt: string;
  verifiedAt: string;
  sourceRef: string;
}

export interface GatewayModelProfile {
  gateway: 'wenwen';
  profileKey: 'text.default' | 'text.high_quality' | 'text.batch' | 'embedding.default' | 'image.default';
  modelId: string;
  version: number;
  status: 'active' | 'disabled';
  updatedAt: string;
  updatedBy?: string;
}

export interface EntitlementAssignment {
  id: string;
  workspaceId: string;
  featureKey: string;
  limitValue: number;
  period: 'daily' | 'monthly' | 'lifetime';
  source: string;
  effectiveAt: string;
  expiresAt?: string;
}

export interface KeywordResearchProject {
  id: string;
  workspaceId: string;
  siteId: string;
  name: string;
  market: string;
  language: string;
  device: string;
  engine: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CreateKeywordResearchProjectInput {
  id?: string;
  workspaceId: string;
  siteId: string;
  name: string;
  market: string;
  language: string;
  device?: string;
  engine?: string;
}

export function createDeterministicUuid(value: string): string {
  const hex = createHash('sha256').update(value).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export interface KeywordResearchRun {
  id: string;
  workspaceId: string;
  projectId: string;
  taskId?: string;
  inputHash: string;
  provider: 'dataforseo' | 'ahrefs' | 'semrush';
  providerSnapshotId?: string;
  status: Phase2TaskStatus;
  costEstimate: number;
  actualCost?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ContentOptimizationRun {
  id: string;
  workspaceId: string;
  siteId: string;
  articleId?: number;
  inputHash: string;
  locale: string;
  rulesVersion: string;
  promptVersion: string;
  schemaVersion: string;
  gatewayModel: string;
  taskId?: string;
  status: Phase2TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GatewayTextRequest {
  modelId: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json_object';
  requestId?: string;
}

export interface GatewayTextResult {
  gateway: 'wenwen';
  modelId: string;
  text: string;
  inputTokens: number;
  outputTokens: number;
  requestId?: string;
  finishReason?: string;
  refused: boolean;
  truncated: boolean;
}

export interface GatewayEmbeddingRequest {
  modelId: string;
  input: string | string[];
  requestId?: string;
}

export interface GatewayEmbeddingResult {
  gateway: 'wenwen';
  modelId: string;
  embeddings: number[][];
  inputTokens: number;
  requestId?: string;
}

export interface GatewayImageRequest {
  modelId: string;
  prompt: string;
  size?: string;
  requestId?: string;
}

export interface GatewayImageResult {
  gateway: 'wenwen';
  modelId: string;
  urls: string[];
  imageCount: number;
  requestId?: string;
}

export interface AiGatewayAdapter {
  readonly gateway: 'wenwen';
  listModels(): Promise<GatewayModel[]>;
  generateText(input: GatewayTextRequest): Promise<GatewayTextResult>;
  createEmbedding(input: GatewayEmbeddingRequest): Promise<GatewayEmbeddingResult>;
  generateImage(input: GatewayImageRequest): Promise<GatewayImageResult>;
}

export interface SeoProviderCapabilities {
  provider: 'dataforseo' | 'ahrefs' | 'semrush';
  supportsKeywordDiscovery: boolean;
  supportsCompetitorKeywords: boolean;
  supportsBacklinkOpportunities: boolean;
}

export interface SeoMetricsProvider {
  readonly id: SeoProviderCapabilities['provider'];
  getCapabilities(): Promise<SeoProviderCapabilities>;
  discoverKeywords(input: KeywordDiscoveryInput): Promise<KeywordDiscoveryResult>;
  getCompetitorKeywords(input: CompetitorKeywordInput): Promise<CompetitorKeywordResult>;
  getBacklinkOpportunities(input: BacklinkOpportunityInput): Promise<BacklinkOpportunityResult>;
}

export interface KeywordDiscoveryInput { seedKeyword: string; market: string; language: string; device: string; }
export interface KeywordDiscoveryResult { provider: SeoProviderCapabilities['provider']; keywords: string[]; collectedAt: string; sourceType: 'provider_estimated'; }
export interface CompetitorKeywordInput { domain: string; market: string; language: string; device: string; }
export interface CompetitorKeywordResult { provider: SeoProviderCapabilities['provider']; keywords: string[]; collectedAt: string; sourceType: 'provider_estimated'; }
export interface BacklinkOpportunityInput { domain: string; targetUrl?: string; market?: string; }
export interface BacklinkOpportunityResult { provider: SeoProviderCapabilities['provider']; opportunities: string[]; collectedAt: string; sourceType: 'provider_estimated'; }

export interface PageFetchService {
  fetchPublicPage(input: { url: string; timeoutMs?: number }): Promise<{ url: string; statusCode: number; contentType: string; body: string; fetchedAt: string }>;
}

export interface PublishingTargetAdapter {
  readonly platform: 'wordpress' | 'ghost' | 'shopify';
  diagnose(): Promise<{ connected: boolean; message?: string }>;
  createDraft(input: { title: string; body: string }): Promise<{ id: string; url?: string }>;
  publish(input: { id: string }): Promise<{ id: string; url: string }>;
  fetchPublished(input: { id: string }): Promise<{ id: string; url: string; body: string }>;
}

export interface BillingProvider {
  createCheckoutSession(input: { workspaceId: string; priceId: string; successUrl: string; cancelUrl: string }): Promise<{ id: string; url: string }>;
  handleWebhook(input: { payload: string; signature: string }): Promise<{ eventId: string; accepted: boolean }>;
}

export interface Phase2Repository {
  findIdempotency(input: Pick<IdempotencyRecord, 'workspaceId' | 'method' | 'route' | 'key'>): Promise<IdempotencyRecord | undefined>;
  saveIdempotency(record: IdempotencyRecord): Promise<IdempotencyRecord>;
  createTaskWithIdempotency(
    input: CreateTaskInput,
    record: Omit<IdempotencyRecord, 'responseBody'>,
    createResponse: (task: Phase2Task) => Pick<IdempotencyRecord, 'statusCode' | 'responseBody'>
  ): Promise<{ task?: Phase2Task; replay?: IdempotencyRecord }>;
  createTask(input: CreateTaskInput): Promise<Phase2Task>;
  findTask(taskId: string, workspaceId: string): Promise<Phase2Task | undefined>;
  transitionTask(taskId: string, workspaceId: string, from: Phase2TaskStatus, to: Phase2TaskStatus, patch?: Partial<Pick<Phase2Task, 'progress' | 'result' | 'errorCode' | 'retryCount'>>): Promise<Phase2Task | undefined>;
  reserveUsage(input: ReserveUsageInput): Promise<UsageLedgerEntry>;
  finalizeUsage(workspaceId: string, reservationId: string, actualCost: number): Promise<UsageLedgerEntry | undefined>;
  releaseUsage(workspaceId: string, reservationId: string): Promise<UsageLedgerEntry | undefined>;
  getUsageSummary(workspaceId: string): Promise<Phase2UsageSummary>;
  getPeriodUsageUnits(workspaceId: string, operation: string, period: EntitlementAssignment['period']): Promise<number>;
  findActiveEntitlement(workspaceId: string, featureKey: string): Promise<EntitlementAssignment | undefined>;
  findActiveGatewayPriceSnapshot(modelId: string): Promise<GatewayPriceSnapshot | undefined>;
  createKeywordResearchProject(input: CreateKeywordResearchProjectInput): Promise<KeywordResearchProject>;
  listKeywordResearchProjects(workspaceId: string, pagination: Required<PaginationInput>): Promise<Paginated<KeywordResearchProject>>;
  findKeywordResearchProject(projectId: string, workspaceId: string): Promise<KeywordResearchProject | undefined>;
  createKeywordResearchRun(input: Omit<KeywordResearchRun, 'id' | 'createdAt'>): Promise<KeywordResearchRun>;
  findKeywordResearchRun(runId: string, workspaceId: string): Promise<KeywordResearchRun | undefined>;
  createContentOptimizationRun(input: Omit<ContentOptimizationRun, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContentOptimizationRun>;
  findContentOptimizationRun(runId: string, workspaceId: string): Promise<ContentOptimizationRun | undefined>;
  recordAttempt(attempt: Omit<TaskAttempt, 'id'>): Promise<TaskAttempt>;
  recordAudit(event: Omit<AuditEvent, 'id' | 'createdAt'> & { createdAt?: string }): Promise<AuditEvent>;
  listGatewayModels(): Promise<GatewayModel[]>;
  listGatewayProfiles(): Promise<GatewayModelProfile[]>;
  saveGatewayProfile(profile: GatewayModelProfile): Promise<GatewayModelProfile>;
  saveGatewayPriceSnapshot(snapshot: GatewayPriceSnapshot): Promise<void>;
  close?(): Promise<void>;
}

export function createInMemoryPhase2Repository(): Phase2Repository {
  const idempotency = new Map<string, IdempotencyRecord>();
  const tasks = new Map<string, Phase2Task>();
  const usage: UsageLedgerEntry[] = [];
  const attempts: TaskAttempt[] = [];
  const audits: AuditEvent[] = [];
  const models: GatewayModel[] = [];
  const prices: GatewayPriceSnapshot[] = [];
  const profiles = new Map<string, GatewayModelProfile>();
  const entitlements: EntitlementAssignment[] = [];
  const projects = new Map<string, KeywordResearchProject>();
  const researchRuns = new Map<string, KeywordResearchRun>();
  const contentRuns = new Map<string, ContentOptimizationRun>();

  const idempotencyKey = (input: Pick<IdempotencyRecord, 'workspaceId' | 'method' | 'route' | 'key'>) =>
    `${input.workspaceId}:${input.method}:${input.route}:${input.key}`;

  return {
    async findIdempotency(input) {
      return idempotency.get(idempotencyKey(input));
    },
    async saveIdempotency(record) {
      const key = idempotencyKey(record);
      const existing = idempotency.get(key);
      if (existing) {
        if (existing.requestHash !== record.requestHash) {
          throw new Error('IDEMPOTENCY_KEY_REUSED');
        }
        return existing;
      }
      idempotency.set(idempotencyKey(record), record);
      return record;
    },
    async createTaskWithIdempotency(input, record, createResponse) {
      const existing = idempotency.get(idempotencyKey(record));
      if (existing) {
        if (existing.requestHash !== record.requestHash) {
          throw new Error('IDEMPOTENCY_KEY_REUSED');
        }
        return { replay: existing };
      }
      const task = await this.createTask(input);
      const response = createResponse(task);
      const savedRecord: IdempotencyRecord = { ...record, ...response };
      idempotency.set(idempotencyKey(savedRecord), savedRecord);
      return { task };
    },
    async createTask(input) {
      const now = new Date().toISOString();
      const task: Phase2Task = {
        id: randomUUID(),
        workspaceId: input.workspaceId,
        siteId: input.siteId,
        kind: input.kind,
        status: 'queued',
        progress: 0,
        estimatedCredits: input.estimatedCredits,
        reservationId: input.reservationId,
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        retryCount: 0,
        maxRetries: input.maxRetries ?? 3,
        createdAt: now,
        updatedAt: now
      };
      tasks.set(task.id, task);
      return task;
    },
    async findTask(taskId, workspaceId) {
      const task = tasks.get(taskId);
      return task?.workspaceId === workspaceId ? task : undefined;
    },
    async transitionTask(taskId, workspaceId, from, to, patch = {}) {
      const task = tasks.get(taskId);
      if (!task || task.workspaceId !== workspaceId || task.status !== from) return undefined;
      assertTaskTransition(from, to);
      const updated: Phase2Task = {
        ...task,
        ...patch,
        status: to,
        updatedAt: new Date().toISOString(),
        ...(to === 'queued' ? { completedAt: undefined } : {}),
        ...(to === 'completed' || to === 'failed' || to === 'cancelled' || to === 'expired' || to === 'dead_letter'
          ? { completedAt: new Date().toISOString() }
          : {})
      };
      tasks.set(taskId, updated);
      return updated;
    },
    async reserveUsage(input) {
      if (input.idempotencyKey) {
        const existing = usage.find((entry) => entry.idempotencyKey === input.idempotencyKey && entry.workspaceId === input.workspaceId && entry.eventType === 'reserve');
        if (existing) return existing;
      }
      const entry: UsageLedgerEntry = {
        id: randomUUID(),
        workspaceId: input.workspaceId,
        operation: input.operation,
        eventType: 'reserve',
        reservationId: input.reservationId ?? randomUUID(),
        provider: input.provider,
        gatewayModel: input.gatewayModel,
        priceSnapshotId: input.priceSnapshotId,
        units: input.units,
        costEstimate: input.costEstimate,
        idempotencyKey: input.idempotencyKey,
        createdAt: new Date().toISOString()
      };
      usage.push(entry);
      return entry;
    },
    async finalizeUsage(workspaceId, reservationId, actualCost) {
      const reserved = usage.find((entry) => entry.workspaceId === workspaceId && entry.reservationId === reservationId && entry.eventType === 'reserve');
      if (!reserved || usage.some((entry) => entry.reservationId === reservationId && entry.eventType !== 'reserve')) return undefined;
      const entry: UsageLedgerEntry = {
        ...reserved,
        id: randomUUID(),
        eventType: 'finalize',
        actualCost,
        createdAt: new Date().toISOString()
      };
      usage.push(entry);
      return entry;
    },
    async releaseUsage(workspaceId, reservationId) {
      const reserved = usage.find((entry) => entry.workspaceId === workspaceId && entry.reservationId === reservationId && entry.eventType === 'reserve');
      if (!reserved || usage.some((entry) => entry.reservationId === reservationId && entry.eventType !== 'reserve')) return undefined;
      const entry: UsageLedgerEntry = {
        ...reserved,
        id: randomUUID(),
        eventType: 'release',
        actualCost: 0,
        createdAt: new Date().toISOString()
      };
      usage.push(entry);
      return entry;
    },
    async getUsageSummary(workspaceId) {
      return usage
        .filter((entry) => entry.workspaceId === workspaceId)
        .reduce<Phase2UsageSummary>(
          (summary, entry) => {
            if (entry.eventType === 'reserve') {
              summary.reservedUnits += entry.units;
              summary.reservedCost += entry.costEstimate;
            } else if (entry.eventType === 'finalize') {
              summary.finalizedCost += entry.actualCost ?? 0;
            } else {
              summary.releasedCost += entry.costEstimate;
            }
            return summary;
          },
          { reservedUnits: 0, reservedCost: 0, finalizedCost: 0, releasedCost: 0 }
        );
    },
    async getPeriodUsageUnits(workspaceId, operation) {
      return usage
        .filter((entry) => entry.workspaceId === workspaceId && entry.operation === operation && entry.eventType === 'reserve')
        .reduce((total, entry) => total + entry.units, 0);
    },
    async findActiveEntitlement(workspaceId, featureKey) {
      const now = new Date().toISOString();
      return entitlements.find((entitlement) =>
        entitlement.workspaceId === workspaceId &&
        entitlement.featureKey === featureKey &&
        entitlement.effectiveAt <= now &&
        (!entitlement.expiresAt || entitlement.expiresAt > now)
      );
    },
    async findActiveGatewayPriceSnapshot(modelId) {
      return prices
        .filter((snapshot) => snapshot.modelId === modelId && snapshot.effectiveAt <= new Date().toISOString())
        .sort((left, right) => right.effectiveAt.localeCompare(left.effectiveAt))[0];
    },
    async createKeywordResearchProject(input) {
      const now = new Date().toISOString();
      const project: KeywordResearchProject = {
        id: input.id ?? randomUUID(),
        workspaceId: input.workspaceId,
        siteId: input.siteId,
        name: input.name,
        market: input.market,
        language: input.language,
        device: input.device ?? 'desktop',
        engine: input.engine ?? 'google',
        status: 'draft',
        createdAt: now,
        updatedAt: now
      };
      projects.set(project.id, project);
      return project;
    },
    async listKeywordResearchProjects(workspaceId, pagination) {
      const matched = [...projects.values()]
        .filter((project) => project.workspaceId === workspaceId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      const offset = (pagination.page - 1) * pagination.pageSize;
      return {
        items: matched.slice(offset, offset + pagination.pageSize),
        pagination: createPagination(pagination.page, pagination.pageSize, matched.length)
      };
    },
    async findKeywordResearchProject(projectId, workspaceId) {
      const project = projects.get(projectId);
      return project?.workspaceId === workspaceId ? project : undefined;
    },
    async createKeywordResearchRun(input) {
      const run: KeywordResearchRun = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
      researchRuns.set(run.id, run);
      return run;
    },
    async findKeywordResearchRun(runId, workspaceId) {
      const run = researchRuns.get(runId);
      return run?.workspaceId === workspaceId ? run : undefined;
    },
    async createContentOptimizationRun(input) {
      const now = new Date().toISOString();
      const run: ContentOptimizationRun = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
      contentRuns.set(run.id, run);
      return run;
    },
    async findContentOptimizationRun(runId, workspaceId) {
      const run = contentRuns.get(runId);
      return run?.workspaceId === workspaceId ? run : undefined;
    },
    async recordAttempt(input) {
      const attempt: TaskAttempt = { ...input, id: randomUUID() };
      attempts.push(attempt);
      return attempt;
    },
    async recordAudit(input) {
      const event: AuditEvent = {
        ...input,
        id: randomUUID(),
        createdAt: input.createdAt ?? new Date().toISOString()
      };
      audits.push(event);
      return event;
    },
    async listGatewayModels() {
      return [...models];
    },
    async listGatewayProfiles() {
      return [...profiles.values()];
    },
    async saveGatewayProfile(profile) {
      profiles.set(profile.profileKey, profile);
      return profile;
    },
    async saveGatewayPriceSnapshot(snapshot) {
      prices.push(snapshot);
    }
  };
}
