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
  | 'SOURCE_VERIFICATION_FAILED'
  | 'RATE_LIMIT_UNAVAILABLE'
  | 'TASK_LEASE_EXPIRED'
  | 'CANCELLATION_REQUESTED';

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
  | 'cancellation_requested'
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
  providerKey?: string;
  availableAt: string;
  leaseOwner?: string;
  leaseExpiresAt?: string;
  startedAt?: string;
  deadlineAt?: string;
  cancellationRequestedAt?: string;
  requestId?: string;
  replayOfTaskId?: string;
  priority: number;
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
  providerKey?: string;
  availableAt?: string;
  deadlineAt?: string;
  requestId?: string;
  replayOfTaskId?: string;
  priority?: number;
}

export const phase2TaskTransitions: Record<Phase2TaskStatus, readonly Phase2TaskStatus[]> = {
  queued: ['running', 'cancelled', 'expired'],
  running: ['queued', 'partial', 'completed', 'failed', 'cancellation_requested', 'expired'],
  cancellation_requested: ['cancelled', 'partial', 'failed', 'expired'],
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
  requestId?: string;
  providerKey?: string;
  gatewayModel?: string;
  cacheState?: 'hit' | 'miss' | 'bypass';
  fallbackFrom?: string;
  retryAfterMs?: number;
  latencyMs?: number;
  estimatedCost?: number;
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
  taskId?: string;
  requestId?: string;
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
  taskId?: string;
  requestId?: string;
  units: number;
  costEstimate: number;
  idempotencyKey?: string;
}

export interface Phase2UsageSummary {
  reservedUnits: number;
  activeReservedUnits: number;
  finalizedUnits: number;
  releasedUnits: number;
  reservedCost: number;
  finalizedCost: number;
  releasedCost: number;
}

export interface EnqueueCostedTaskInput extends CreateTaskInput {
  operation: string;
  featureKey: string;
  units: number;
  costEstimate: number;
  provider?: string;
  gatewayModel?: string;
  priceSnapshotId?: string;
  record: Omit<IdempotencyRecord, 'responseBody'>;
  actorId?: string;
}

export interface EnqueueKeywordResearchRunInput extends EnqueueCostedTaskInput {
  projectId: string;
  requestContextHash?: string;
  providerMethodologyVersion?: string;
  providerSnapshotId?: string;
  locale: string;
  collectedAt?: string;
  seedKeywords?: string[];
  ownDomain?: string;
  competitorDomains?: string[];
  productContext?: string;
  audience?: string;
  conversionGoal?: string;
}

export interface DeadLetterAction {
  id: string;
  taskId: string;
  workspaceId: string;
  action: 'replay' | 'ignore';
  actorId: string;
  replacementTaskId?: string;
  reason: string;
  createdAt: string;
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
  requestContextHash?: string;
  providerMethodologyVersion?: string;
  collectedAt?: string;
  partialReason?: string;
  seedKeywords?: string[];
  ownDomain?: string;
  competitorDomains?: string[];
  locale?: string;
  productContext?: string;
  audience?: string;
  conversionGoal?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export type KeywordMetricName =
  | 'volume' | 'cpc_usd' | 'competition' | 'difficulty' | 'trend'
  | 'gsc_clicks' | 'gsc_impressions' | 'gsc_ctr' | 'gsc_position';

export interface KeywordMetric {
  id: string;
  workspaceId: string;
  runId: string;
  candidateId: string;
  metricName: KeywordMetricName;
  numericValue?: number;
  provider?: string;
  sourceType: 'first_party_observed' | 'provider_estimated' | 'deterministic_check' | 'ai_inferred' | 'user_asserted';
  providerSnapshotId?: string;
  location?: string;
  language?: string;
  device?: string;
  collectedAt: string;
  providerUpdatedAt?: string;
  methodologyVersion?: string;
  confidence?: number;
  rawResponseRef?: string;
}

export interface KeywordObservation {
  id: string;
  workspaceId: string;
  runId: string;
  candidateId: string;
  domainType: 'own' | 'competitor';
  competitorId?: string;
  domain: string;
  rank?: number;
  url?: string;
  etv?: number;
  serpFeatures: string[];
  sourceType: 'first_party_observed' | 'provider_estimated';
  provider: string;
  providerSnapshotId?: string;
  collectedAt: string;
}

export type KeywordGapClassification = 'missing' | 'weak' | 'strong' | 'shared';

export interface KeywordGapSnapshot {
  id: string;
  workspaceId: string;
  runId: string;
  candidateId: string;
  classification: KeywordGapClassification;
  ownBestRank?: number;
  competitorBestRank?: number;
  competitorIds: string[];
  evidenceRefs: string[];
  score?: number;
  scoreConfidence?: number;
  provider: string;
  providerSnapshotId?: string;
  collectedAt: string;
}

export interface KeywordResearchProviderCapabilities {
  provider: 'dataforseo' | 'ahrefs' | 'semrush';
  supportsKeywordMetrics: boolean;
  supportsCompetitorRankedKeywords: boolean;
  supportsBacklinkOpportunities: boolean;
}

export interface KeywordMetricsInput {
  seeds: string[];
  market: string;
  language: string;
  device: 'desktop' | 'mobile';
  engine: 'google';
}

export interface KeywordMetricResult {
  keyword: string;
  volume?: number;
  cpcUsd?: number;
  competition?: number;
  difficulty?: number;
  trend?: number;
  providerUpdatedAt?: string;
}

export interface KeywordMetricsResult {
  provider: 'dataforseo' | 'ahrefs' | 'semrush';
  providerSnapshotId: string;
  methodologyVersion: string;
  location: string;
  language: string;
  device: 'desktop' | 'mobile';
  collectedAt: string;
  providerUpdatedAt?: string;
  sourceType: 'provider_estimated';
  metrics: KeywordMetricResult[];
  estimatedCost: number;
  rawResponseHash?: string;
}

export interface CompetitorRankedKeywordsInput extends KeywordMetricsInput {
  domain: string;
  limit: number;
}

export interface RankedKeywordResult {
  keyword: string;
  rank?: number;
  url?: string;
  etv?: number;
  serpFeatures?: string[];
}

export interface CompetitorRankedKeywordsResult {
  provider: 'dataforseo' | 'ahrefs' | 'semrush';
  providerSnapshotId: string;
  methodologyVersion: string;
  location: string;
  language: string;
  device: 'desktop' | 'mobile';
  collectedAt: string;
  sourceType: 'provider_estimated';
  domain: string;
  keywords: RankedKeywordResult[];
  estimatedCost: number;
  rawResponseHash?: string;
}

export interface KeywordResearchProvider {
  readonly id: KeywordResearchProviderCapabilities['provider'];
  getCapabilities(): Promise<KeywordResearchProviderCapabilities>;
  discoverKeywordMetrics(input: KeywordMetricsInput): Promise<KeywordMetricsResult>;
  getCompetitorRankedKeywords(input: CompetitorRankedKeywordsInput): Promise<CompetitorRankedKeywordsResult>;
}

export interface KeywordCandidate {
  id: string;
  workspaceId: string;
  projectId: string;
  normalizedKeyword: string;
  displayKeyword: string;
  locale: string;
  intent?: string;
  clusterId?: string;
  sourceType: KeywordMetric['sourceType'];
  sourceRef?: string;
  volume?: number;
  cpc?: number;
  difficulty?: number;
  confidence?: number;
  opportunityScore?: number;
  scoreConfidence?: number;
  modelVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKeywordResearchRunInput {
  workspaceId: string;
  projectId: string;
  taskId?: string;
  inputHash: string;
  requestContextHash?: string;
  provider: KeywordResearchProviderCapabilities['provider'];
  providerSnapshotId?: string;
  providerMethodologyVersion?: string;
  status: Phase2TaskStatus;
  costEstimate: number;
  collectedAt?: string;
  partialReason?: string;
  seedKeywords?: string[];
  ownDomain?: string;
  competitorDomains?: string[];
  locale?: string;
  productContext?: string;
  audience?: string;
  conversionGoal?: string;
}

export interface CreateKeywordCandidateInput {
  workspaceId: string;
  projectId: string;
  normalizedKeyword: string;
  displayKeyword: string;
  locale: string;
  intent?: string;
  sourceType: KeywordMetric['sourceType'];
  sourceRef?: string;
  opportunityScore?: number;
  scoreConfidence?: number;
  modelVersion?: string;
}

export interface CreateKeywordMetricInput extends Omit<KeywordMetric, 'id' | 'collectedAt'> {
  collectedAt?: string;
}

export interface CreateKeywordObservationInput extends Omit<KeywordObservation, 'id' | 'collectedAt'> {
  collectedAt?: string;
}

export interface CreateKeywordGapSnapshotInput extends Omit<KeywordGapSnapshot, 'id' | 'collectedAt'> {
  collectedAt?: string;
}

export interface KeywordCandidateFilters extends PaginationInput {
  intent?: string;
  clusterId?: string;
  sourceType?: KeywordMetric['sourceType'];
  minVolume?: number;
  maxDifficulty?: number;
  sort?: 'opportunity' | 'volume' | 'difficulty' | 'created';
}

export interface KeywordGapFilters extends PaginationInput {
  classification?: KeywordGapClassification;
  competitorId?: string;
}

export interface ContentBrief {
  id: string;
  workspaceId: string;
  projectId: string;
  primaryKeywordId: string;
  audience?: string;
  locale: string;
  secondaryKeywords: string[];
  outline: string[];
  status: 'draft' | 'approved' | 'in_progress' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentBriefInput {
  workspaceId: string;
  projectId: string;
  primaryKeywordId: string;
  audience?: string;
  locale: string;
  secondaryKeywords?: string[];
  outline?: string[];
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
  enqueueCostedTask(
    input: EnqueueCostedTaskInput,
    createResponse: (task: Phase2Task) => Pick<IdempotencyRecord, 'statusCode' | 'responseBody'>
  ): Promise<{ task?: Phase2Task; replay?: IdempotencyRecord }>;
  enqueueKeywordResearchRun(
    input: EnqueueKeywordResearchRunInput,
    createResponse: (task: Phase2Task, run: KeywordResearchRun) => Pick<IdempotencyRecord, 'statusCode' | 'responseBody'>
  ): Promise<{ task?: Phase2Task; run?: KeywordResearchRun; replay?: IdempotencyRecord }>;
  findTask(taskId: string, workspaceId: string): Promise<Phase2Task | undefined>;
  transitionTask(taskId: string, workspaceId: string, from: Phase2TaskStatus, to: Phase2TaskStatus, patch?: Partial<Pick<Phase2Task, 'progress' | 'result' | 'errorCode' | 'retryCount' | 'availableAt' | 'cancellationRequestedAt'>>): Promise<Phase2Task | undefined>;
  cancelTask(taskId: string, workspaceId: string): Promise<Phase2Task | undefined>;
  reserveUsage(input: ReserveUsageInput): Promise<UsageLedgerEntry>;
  finalizeUsage(workspaceId: string, reservationId: string, actualCost: number): Promise<UsageLedgerEntry | undefined>;
  releaseUsage(workspaceId: string, reservationId: string): Promise<UsageLedgerEntry | undefined>;
  getUsageSummary(workspaceId: string): Promise<Phase2UsageSummary>;
  getPeriodUsageUnits(workspaceId: string, operation: string, period: EntitlementAssignment['period']): Promise<number>;
  findActiveEntitlement(workspaceId: string, featureKey: string): Promise<EntitlementAssignment | undefined>;
  saveEntitlement(entitlement: EntitlementAssignment): Promise<EntitlementAssignment>;
  listDeadLetterTasks(workspaceId: string, pagination: Required<PaginationInput>): Promise<Paginated<Phase2Task>>;
  replayDeadLetterTask(taskId: string, workspaceId: string, actorId: string, reason: string, requestId?: string): Promise<{ task: Phase2Task; action: DeadLetterAction } | undefined>;
  ignoreDeadLetterTask(taskId: string, workspaceId: string, actorId: string, reason: string): Promise<DeadLetterAction | undefined>;
  findActiveGatewayPriceSnapshot(modelId: string): Promise<GatewayPriceSnapshot | undefined>;
  createKeywordResearchProject(input: CreateKeywordResearchProjectInput): Promise<KeywordResearchProject>;
  listKeywordResearchProjects(workspaceId: string, pagination: Required<PaginationInput>): Promise<Paginated<KeywordResearchProject>>;
  findKeywordResearchProject(projectId: string, workspaceId: string): Promise<KeywordResearchProject | undefined>;
  createKeywordResearchRun(input: CreateKeywordResearchRunInput): Promise<KeywordResearchRun>;
  findKeywordResearchRun(runId: string, workspaceId: string): Promise<KeywordResearchRun | undefined>;
  findKeywordResearchRunByInput(projectId: string, workspaceId: string, inputHash: string, provider: KeywordResearchRun['provider']): Promise<KeywordResearchRun | undefined>;
  findLatestKeywordResearchRun(projectId: string, workspaceId: string): Promise<KeywordResearchRun | undefined>;
  listKeywordCandidates(projectId: string, workspaceId: string, filters: KeywordCandidateFilters): Promise<Paginated<KeywordCandidate>>;
  listKeywordGaps(projectId: string, workspaceId: string, filters: KeywordGapFilters): Promise<Paginated<KeywordGapSnapshot>>;
  saveKeywordCandidate(input: CreateKeywordCandidateInput): Promise<KeywordCandidate>;
  saveKeywordMetric(input: CreateKeywordMetricInput): Promise<KeywordMetric>;
  saveKeywordObservation(input: CreateKeywordObservationInput): Promise<KeywordObservation>;
  saveKeywordGapSnapshot(input: CreateKeywordGapSnapshotInput): Promise<KeywordGapSnapshot>;
  createContentBrief(input: CreateContentBriefInput): Promise<ContentBrief>;
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
  const deadLetterActions: DeadLetterAction[] = [];
  const projects = new Map<string, KeywordResearchProject>();
  const researchRuns = new Map<string, KeywordResearchRun>();
  const candidates = new Map<string, KeywordCandidate>();
  const metrics: KeywordMetric[] = [];
  const observations: KeywordObservation[] = [];
  const gapSnapshots = new Map<string, KeywordGapSnapshot>();
  const briefs = new Map<string, ContentBrief>();
  const contentRuns = new Map<string, ContentOptimizationRun>();

  const idempotencyKey = (input: Pick<IdempotencyRecord, 'workspaceId' | 'method' | 'route' | 'key'>) =>
    `${input.workspaceId}:${input.method}:${input.route}:${input.key}`;

  const getPeriodStart = (period: EntitlementAssignment['period']) => {
    const now = new Date();
    if (period === 'daily') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    if (period === 'monthly') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return new Date(0).toISOString();
  };

  const hasTerminalUsageEvent = (reservationId: string) =>
    usage.some((entry) => entry.reservationId === reservationId && entry.eventType !== 'reserve');

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
        providerKey: input.providerKey,
        availableAt: input.availableAt ?? now,
        deadlineAt: input.deadlineAt,
        requestId: input.requestId,
        replayOfTaskId: input.replayOfTaskId,
        priority: input.priority ?? 50,
        retryCount: 0,
        maxRetries: input.maxRetries ?? 3,
        createdAt: now,
        updatedAt: now
      };
      tasks.set(task.id, task);
      return task;
    },
    async enqueueCostedTask(input, createResponse) {
      const existing = idempotency.get(idempotencyKey(input.record));
      if (existing) {
        if (existing.requestHash !== input.record.requestHash) throw new Error('IDEMPOTENCY_KEY_REUSED');
        return { replay: existing };
      }

      const entitlement = await this.findActiveEntitlement(input.workspaceId, input.featureKey);
      if (!entitlement) throw new Error('ENTITLEMENT_REQUIRED');
      const usedUnits = await this.getPeriodUsageUnits(input.workspaceId, input.operation, entitlement.period);
      if (usedUnits + input.units > entitlement.limitValue) throw new Error('QUOTA_EXCEEDED');

      const reservation = await this.reserveUsage({
        workspaceId: input.workspaceId,
        operation: input.operation,
        provider: input.provider,
        gatewayModel: input.gatewayModel,
        priceSnapshotId: input.priceSnapshotId,
        units: input.units,
        costEstimate: input.costEstimate,
        idempotencyKey: `usage:${input.record.key}`,
        requestId: input.requestId
      });
      const task = await this.createTask({ ...input, reservationId: reservation.reservationId });
      const response = createResponse(task);
      idempotency.set(idempotencyKey(input.record), { ...input.record, ...response });
      return { task };
    },
    async enqueueKeywordResearchRun(input, createResponse) {
      const runId = randomUUID();
      const result = await this.enqueueCostedTask({
        ...input,
        kind: 'keyword_research',
        providerKey: input.providerKey ?? input.provider,
        requestId: input.requestId
      }, (task) => {
        const run: KeywordResearchRun = {
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
        };
        return createResponse(task, run);
      });
      if (result.replay) return { replay: result.replay };
      if (!result.task) return result;
      const run: KeywordResearchRun = {
        id: runId,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        taskId: result.task.id,
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
      };
      researchRuns.set(run.id, run);
      return { task: result.task, run };
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
    async cancelTask(taskId, workspaceId) {
      const task = tasks.get(taskId);
      if (!task || task.workspaceId !== workspaceId) return undefined;
      if (task.status === 'queued') {
        const cancelled: Phase2Task = {
          ...task,
          status: 'cancelled',
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        };
        tasks.set(taskId, cancelled);
        if (task.reservationId && !hasTerminalUsageEvent(task.reservationId)) {
          await this.releaseUsage(workspaceId, task.reservationId);
        }
        return cancelled;
      }
      if (task.status !== 'running') return undefined;
      const requested: Phase2Task = {
        ...task,
        status: 'cancellation_requested',
        cancellationRequestedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      tasks.set(taskId, requested);
      return requested;
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
        taskId: input.taskId,
        requestId: input.requestId,
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
      const workspaceUsage = usage.filter((entry) => entry.workspaceId === workspaceId);
      const activeReservations = new Set(
        workspaceUsage
          .filter((entry) => entry.eventType === 'reserve' && !hasTerminalUsageEvent(entry.reservationId))
          .map((entry) => entry.reservationId)
      );
      return workspaceUsage.reduce<Phase2UsageSummary>(
          (summary, entry) => {
            if (entry.eventType === 'reserve') {
              summary.reservedUnits += entry.units;
              summary.reservedCost += entry.costEstimate;
              if (activeReservations.has(entry.reservationId)) {
                summary.activeReservedUnits += entry.units;
              }
            } else if (entry.eventType === 'finalize') {
              summary.finalizedUnits += entry.units;
              summary.finalizedCost += entry.actualCost ?? 0;
            } else {
              summary.releasedUnits += entry.units;
              summary.releasedCost += entry.costEstimate;
            }
            return summary;
          },
          {
            reservedUnits: 0,
            activeReservedUnits: 0,
            finalizedUnits: 0,
            releasedUnits: 0,
            reservedCost: 0,
            finalizedCost: 0,
            releasedCost: 0
          }
        );
    },
    async getPeriodUsageUnits(workspaceId, operation, period) {
      const periodStart = getPeriodStart(period);
      const scoped = usage.filter(
        (entry) => entry.workspaceId === workspaceId && entry.operation === operation && entry.createdAt >= periodStart
      );
      const activeReservations = new Set(
        scoped
          .filter((entry) => entry.eventType === 'reserve' && !hasTerminalUsageEvent(entry.reservationId))
          .map((entry) => entry.reservationId)
      );
      return scoped.reduce((total, entry) => {
        if (entry.eventType === 'finalize') return total + entry.units;
        if (entry.eventType === 'reserve' && activeReservations.has(entry.reservationId)) return total + entry.units;
        return total;
      }, 0);
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
    async saveEntitlement(entitlement) {
      const existingIndex = entitlements.findIndex((item) => item.id === entitlement.id);
      if (existingIndex >= 0) entitlements.splice(existingIndex, 1, entitlement);
      else entitlements.push(entitlement);
      return entitlement;
    },
    async listDeadLetterTasks(workspaceId, pagination) {
      const matched = [...tasks.values()]
        .filter((task) => task.workspaceId === workspaceId && task.status === 'dead_letter')
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      const offset = (pagination.page - 1) * pagination.pageSize;
      return {
        items: matched.slice(offset, offset + pagination.pageSize),
        pagination: createPagination(pagination.page, pagination.pageSize, matched.length)
      };
    },
    async replayDeadLetterTask(taskId, workspaceId, actorId, reason, requestId) {
      const original = tasks.get(taskId);
      if (!original || original.workspaceId !== workspaceId || original.status !== 'dead_letter') return undefined;
      if (deadLetterActions.some((action) => action.taskId === taskId && action.action === 'replay')) return undefined;
      const reservationId = original.reservationId && !hasTerminalUsageEvent(original.reservationId)
        ? original.reservationId
        : undefined;
      const task = await this.createTask({
        workspaceId,
        siteId: original.siteId,
        kind: original.kind,
        estimatedCredits: original.estimatedCredits,
        reservationId,
        providerKey: original.providerKey,
        requestId,
        replayOfTaskId: original.id,
        priority: original.priority,
        maxRetries: original.maxRetries
      });
      const action: DeadLetterAction = {
        id: randomUUID(),
        taskId,
        workspaceId,
        action: 'replay',
        actorId,
        replacementTaskId: task.id,
        reason,
        createdAt: new Date().toISOString()
      };
      deadLetterActions.push(action);
      return { task, action };
    },
    async ignoreDeadLetterTask(taskId, workspaceId, actorId, reason) {
      const task = tasks.get(taskId);
      if (!task || task.workspaceId !== workspaceId || task.status !== 'dead_letter') return undefined;
      if (deadLetterActions.some((action) => action.taskId === taskId && action.action === 'ignore')) return undefined;
      if (task.reservationId && !hasTerminalUsageEvent(task.reservationId)) {
        await this.releaseUsage(workspaceId, task.reservationId);
      }
      const action: DeadLetterAction = {
        id: randomUUID(),
        taskId,
        workspaceId,
        action: 'ignore',
        actorId,
        reason,
        createdAt: new Date().toISOString()
      };
      deadLetterActions.push(action);
      return action;
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
    async findKeywordResearchRunByInput(projectId, workspaceId, inputHash, provider) {
      return [...researchRuns.values()]
        .filter((run) => run.projectId === projectId && run.workspaceId === workspaceId && run.inputHash === inputHash && run.provider === provider)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
    },
    async findLatestKeywordResearchRun(projectId, workspaceId) {
      return [...researchRuns.values()]
        .filter((run) => run.projectId === projectId && run.workspaceId === workspaceId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
    },
    async saveKeywordCandidate(input) {
      const existing = [...candidates.values()].find(
        (candidate) => candidate.projectId === input.projectId && candidate.normalizedKeyword === input.normalizedKeyword
      );
      const now = new Date().toISOString();
      const candidate: KeywordCandidate = {
        id: existing?.id ?? randomUUID(),
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        normalizedKeyword: input.normalizedKeyword,
        displayKeyword: input.displayKeyword,
        locale: input.locale,
        intent: input.intent,
        sourceType: input.sourceType,
        sourceRef: input.sourceRef,
        opportunityScore: input.opportunityScore,
        scoreConfidence: input.scoreConfidence,
        modelVersion: input.modelVersion,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      };
      candidates.set(candidate.id, candidate);
      return candidate;
    },
    async saveKeywordMetric(input) {
      const metric: KeywordMetric = { ...input, id: randomUUID(), collectedAt: input.collectedAt ?? new Date().toISOString() };
      metrics.push(metric);
      return metric;
    },
    async saveKeywordObservation(input) {
      const observation: KeywordObservation = { ...input, id: randomUUID(), collectedAt: input.collectedAt ?? new Date().toISOString() };
      observations.push(observation);
      return observation;
    },
    async saveKeywordGapSnapshot(input) {
      const key = `${input.runId}:${input.candidateId}`;
      const snapshot: KeywordGapSnapshot = { ...input, id: gapSnapshots.get(key)?.id ?? randomUUID(), collectedAt: input.collectedAt ?? new Date().toISOString() };
      gapSnapshots.set(key, snapshot);
      return snapshot;
    },
    async listKeywordCandidates(projectId, workspaceId, filters) {
      const matched = [...candidates.values()].filter((candidate) => {
        if (candidate.projectId !== projectId || candidate.workspaceId !== workspaceId) return false;
        if (filters.intent && candidate.intent !== filters.intent) return false;
        if (filters.clusterId && candidate.clusterId !== filters.clusterId) return false;
        if (filters.sourceType && candidate.sourceType !== filters.sourceType) return false;
        return true;
      }).sort((left, right) => {
        if (filters.sort === 'created') return right.createdAt.localeCompare(left.createdAt);
        return (right.opportunityScore ?? -1) - (left.opportunityScore ?? -1);
      });
      const page = filters.page ?? 1;
      const pageSize = Math.min(filters.pageSize ?? 20, 100);
      const offset = (page - 1) * pageSize;
      return { items: matched.slice(offset, offset + pageSize), pagination: createPagination(page, pageSize, matched.length) };
    },
    async listKeywordGaps(projectId, workspaceId, filters) {
      const projectRunIds = new Set([...researchRuns.values()].filter((run) => run.projectId === projectId && run.workspaceId === workspaceId).map((run) => run.id));
      const matched = [...gapSnapshots.values()].filter((snapshot) =>
        snapshot.workspaceId === workspaceId && projectRunIds.has(snapshot.runId) &&
        (!filters.classification || snapshot.classification === filters.classification) &&
        (!filters.competitorId || snapshot.competitorIds.includes(filters.competitorId))
      ).sort((left, right) => (right.score ?? -1) - (left.score ?? -1));
      const page = filters.page ?? 1;
      const pageSize = Math.min(filters.pageSize ?? 20, 100);
      const offset = (page - 1) * pageSize;
      return { items: matched.slice(offset, offset + pageSize), pagination: createPagination(page, pageSize, matched.length) };
    },
    async createContentBrief(input) {
      const project = projects.get(input.projectId);
      const candidate = candidates.get(input.primaryKeywordId);
      if (!project || project.workspaceId !== input.workspaceId || !candidate || candidate.workspaceId !== input.workspaceId || candidate.projectId !== input.projectId) {
        throw new Error('WORKSPACE_RESOURCE_NOT_FOUND');
      }
      const now = new Date().toISOString();
      const brief: ContentBrief = {
        id: randomUUID(),
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        primaryKeywordId: input.primaryKeywordId,
        audience: input.audience,
        locale: input.locale,
        secondaryKeywords: input.secondaryKeywords ?? [],
        outline: input.outline ?? [],
        status: 'draft',
        createdAt: now,
        updatedAt: now
      };
      briefs.set(brief.id, brief);
      return brief;
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
