export type AiTextProviderName = 'wenwen' | 'openai' | 'anthropic' | 'google' | 'deepseek';
export type AiEmbeddingProviderName = 'wenwen' | 'openai' | 'google';
export type AiImageProviderName =
  | 'wenwen'
  | 'openai'
  | 'google'
  | 'adobe-firefly'
  | 'stability-ai';
export type MediaStorageProviderName = 'qiniu-kodo' | 'cloudflare-r2' | 's3';
export type ImageOptimizationProviderName = 'cloudinary' | 'imagekit';

export type AiOperation =
  | 'generate-title'
  | 'generate-meta-description'
  | 'generate-outline'
  | 'generate-article-draft'
  | 'rewrite-content'
  | 'score-content-quality'
  | 'embed-text'
  | 'embed-article-chunk'
  | 'embed-keyword'
  | 'generate-featured-image'
  | 'generate-social-image'
  | 'edit-image'
  | 'upload-original'
  | 'upload-variant'
  | 'optimize-image';

export type AiUsageStatus = 'estimated' | 'completed' | 'failed';

export interface ProviderContext {
  siteId: string;
  userId: string;
  locale?: string;
  promptVersion?: string;
}

export interface TextGenerationRequest extends ProviderContext {
  keyword?: string;
  title?: string;
  html?: string;
  outline?: string[];
  targetWordCount?: number;
}

export interface TextGenerationResult {
  text: string;
  model: string;
  usage: TokenUsage;
}

export interface EmbeddingRequest extends ProviderContext {
  text: string;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: TokenUsage;
}

export interface ImageGenerationRequest extends ProviderContext {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  format: 'png' | 'jpeg' | 'webp';
}

export interface ImageGenerationResult {
  assetUrl: string;
  model: string;
  width: number;
  height: number;
  format: 'png' | 'jpeg' | 'webp';
  usage: ImageUsage;
}

export interface MediaUploadRequest extends ProviderContext {
  fileName: string;
  mimeType: string;
  contentLength: number;
}

export interface MediaAssetResult {
  assetUrl: string;
  providerAssetId: string;
}

export interface ImageOptimizationRequest extends ProviderContext {
  sourceUrl: string;
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  quality?: number;
}

export interface TextGenerationProvider {
  readonly provider: AiTextProviderName;
  readonly model: string;
  generateTitle(request: TextGenerationRequest): Promise<TextGenerationResult>;
  generateMetaDescription(request: TextGenerationRequest): Promise<TextGenerationResult>;
  generateOutline(request: TextGenerationRequest): Promise<TextGenerationResult>;
  generateArticleDraft(request: TextGenerationRequest): Promise<TextGenerationResult>;
  rewriteContent(request: TextGenerationRequest): Promise<TextGenerationResult>;
  scoreContentQuality(request: TextGenerationRequest): Promise<TextGenerationResult>;
}

export interface EmbeddingProvider {
  readonly provider: AiEmbeddingProviderName;
  readonly model: string;
  embedText(request: EmbeddingRequest): Promise<EmbeddingResult>;
  embedArticleChunk(request: EmbeddingRequest): Promise<EmbeddingResult>;
  embedKeyword(request: EmbeddingRequest): Promise<EmbeddingResult>;
}

export interface ImageGenerationProvider {
  readonly provider: AiImageProviderName;
  readonly model: string;
  generateFeaturedImage(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
  generateSocialImage(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
  editImage(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
}

export interface MediaStorageProvider {
  readonly provider: MediaStorageProviderName;
  uploadOriginal(request: MediaUploadRequest): Promise<MediaAssetResult>;
  uploadVariant(request: MediaUploadRequest): Promise<MediaAssetResult>;
  getSignedUrl(assetUrl: string): Promise<string>;
  deleteAsset(assetUrl: string): Promise<void>;
}

export interface ImageOptimizationProvider {
  readonly provider: ImageOptimizationProviderName;
  resizeImage(request: ImageOptimizationRequest): Promise<MediaAssetResult>;
  convertFormat(request: ImageOptimizationRequest): Promise<MediaAssetResult>;
  compressImage(request: ImageOptimizationRequest): Promise<MediaAssetResult>;
  generateResponsiveVariants(request: ImageOptimizationRequest): Promise<MediaAssetResult[]>;
}

export interface AiProviderRegistry {
  text: TextGenerationProvider;
  embedding: EmbeddingProvider;
  image: ImageGenerationProvider;
  mediaStorage?: MediaStorageProvider;
  imageOptimization?: ImageOptimizationProvider;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ImageUsage {
  imageCount: number;
}

export interface MediaUsage {
  bytes: number;
}

export interface UsageCostInput {
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
  mediaBytes?: number;
  inputTokenUsdPerMillion?: number;
  outputTokenUsdPerMillion?: number;
  imageUsdEach?: number;
  mediaUsdPerGb?: number;
}

export interface AiUsageRecord {
  id: string;
  provider: string;
  model: string;
  operation: AiOperation;
  siteId: string;
  userId: string;
  status: AiUsageStatus;
  inputTokens: number;
  outputTokens: number;
  imageCount: number;
  mediaBytes: number;
  estimatedCostUsd: number;
  promptVersion?: string;
  locale?: string;
  keyword?: string;
  fallbackProvider?: string;
  failureReason?: string;
  retryCount: number;
  createdAt: string;
}

export interface CreateAiUsageRecordInput {
  provider: string;
  model: string;
  operation: AiOperation;
  siteId: string;
  userId: string;
  status?: AiUsageStatus;
  usage?: UsageCostInput;
  promptVersion?: string;
  locale?: string;
  keyword?: string;
  fallbackProvider?: string;
  failureReason?: string;
  retryCount?: number;
  createdAt?: string;
}

export interface UsageRecordFilter {
  siteId?: string;
  userId?: string;
  provider?: string;
  operation?: AiOperation;
}

export interface UsageSummary {
  records: number;
  inputTokens: number;
  outputTokens: number;
  imageCount: number;
  mediaBytes: number;
  estimatedCostUsd: number;
}

export interface AiUsageRecordRepository {
  create(input: CreateAiUsageRecordInput): AiUsageRecord;
  list(filter?: UsageRecordFilter): AiUsageRecord[];
  summarize(filter?: UsageRecordFilter): UsageSummary;
}

export interface ProviderRuntimeConfig {
  textProvider: AiTextProviderName;
  fallbackTextProvider: AiTextProviderName;
  embeddingProvider: AiEmbeddingProviderName;
  imageProvider: AiImageProviderName;
  imageFallbackProvider: AiImageProviderName;
  mediaStorageProvider: MediaStorageProviderName;
  imageOptimizationProvider: ImageOptimizationProviderName;
  proxyBaseUrl?: string;
  textModel?: string;
  embeddingModel?: string;
  imageModel?: string;
}

const bytesPerGb = 1024 * 1024 * 1024;

export function estimateUsageCostUsd(input: UsageCostInput = {}): number {
  const inputTokenCost =
    ((input.inputTokens ?? 0) / 1_000_000) * (input.inputTokenUsdPerMillion ?? 0);
  const outputTokenCost =
    ((input.outputTokens ?? 0) / 1_000_000) * (input.outputTokenUsdPerMillion ?? 0);
  const imageCost = (input.imageCount ?? 0) * (input.imageUsdEach ?? 0);
  const mediaCost = ((input.mediaBytes ?? 0) / bytesPerGb) * (input.mediaUsdPerGb ?? 0);

  return roundUsd(inputTokenCost + outputTokenCost + imageCost + mediaCost);
}

export function createAiUsageRecord(input: CreateAiUsageRecordInput): AiUsageRecord {
  return {
    id: crypto.randomUUID(),
    provider: input.provider,
    model: input.model,
    operation: input.operation,
    siteId: input.siteId,
    userId: input.userId,
    status: input.status ?? 'estimated',
    inputTokens: input.usage?.inputTokens ?? 0,
    outputTokens: input.usage?.outputTokens ?? 0,
    imageCount: input.usage?.imageCount ?? 0,
    mediaBytes: input.usage?.mediaBytes ?? 0,
    estimatedCostUsd: estimateUsageCostUsd(input.usage),
    promptVersion: input.promptVersion,
    locale: input.locale,
    keyword: input.keyword,
    fallbackProvider: input.fallbackProvider,
    failureReason: input.failureReason,
    retryCount: input.retryCount ?? 0,
    createdAt: input.createdAt ?? new Date().toISOString()
  };
}

export function createInMemoryAiUsageRecordRepository(): AiUsageRecordRepository {
  const records: AiUsageRecord[] = [];

  function list(filter: UsageRecordFilter = {}) {
    return records.filter((record) => matchesUsageFilter(record, filter));
  }

  return {
    create(input) {
      const record = createAiUsageRecord(input);
      records.push(record);
      return record;
    },
    list,
    summarize(filter = {}) {
      return summarizeUsageRecords(list(filter));
    }
  };
}

export function summarizeUsageRecords(records: AiUsageRecord[]): UsageSummary {
  return records.reduce<UsageSummary>(
    (summary, record) => ({
      records: summary.records + 1,
      inputTokens: summary.inputTokens + record.inputTokens,
      outputTokens: summary.outputTokens + record.outputTokens,
      imageCount: summary.imageCount + record.imageCount,
      mediaBytes: summary.mediaBytes + record.mediaBytes,
      estimatedCostUsd: roundUsd(summary.estimatedCostUsd + record.estimatedCostUsd)
    }),
    {
      records: 0,
      inputTokens: 0,
      outputTokens: 0,
      imageCount: 0,
      mediaBytes: 0,
      estimatedCostUsd: 0
    }
  );
}

export function createNoopAiProviderRegistry(config: ProviderRuntimeConfig): AiProviderRegistry {
  return {
    text: createNoopTextGenerationProvider(config.textProvider, config.textModel),
    embedding: createNoopEmbeddingProvider(config.embeddingProvider, config.embeddingModel),
    image: createNoopImageGenerationProvider(config.imageProvider, config.imageModel)
  };
}

function createNoopTextGenerationProvider(
  provider: AiTextProviderName,
  configuredModel?: string
): TextGenerationProvider {
  const model = configuredModel ?? `${provider}-not-configured`;

  return {
    provider,
    model,
    generateTitle: rejectProviderCall,
    generateMetaDescription: rejectProviderCall,
    generateOutline: rejectProviderCall,
    generateArticleDraft: rejectProviderCall,
    rewriteContent: rejectProviderCall,
    scoreContentQuality: rejectProviderCall
  };
}

function createNoopEmbeddingProvider(
  provider: AiEmbeddingProviderName,
  configuredModel?: string
): EmbeddingProvider {
  const model = configuredModel ?? `${provider}-not-configured`;

  return {
    provider,
    model,
    embedText: rejectProviderCall,
    embedArticleChunk: rejectProviderCall,
    embedKeyword: rejectProviderCall
  };
}

function createNoopImageGenerationProvider(
  provider: AiImageProviderName,
  configuredModel?: string
): ImageGenerationProvider {
  const model = configuredModel ?? `${provider}-not-configured`;

  return {
    provider,
    model,
    generateFeaturedImage: rejectProviderCall,
    generateSocialImage: rejectProviderCall,
    editImage: rejectProviderCall
  };
}

function rejectProviderCall(): Promise<never> {
  return Promise.reject(new Error('AI provider adapter is not configured yet.'));
}

function matchesUsageFilter(record: AiUsageRecord, filter: UsageRecordFilter) {
  return (
    (filter.siteId === undefined || record.siteId === filter.siteId) &&
    (filter.userId === undefined || record.userId === filter.userId) &&
    (filter.provider === undefined || record.provider === filter.provider) &&
    (filter.operation === undefined || record.operation === filter.operation)
  );
}

function roundUsd(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}
