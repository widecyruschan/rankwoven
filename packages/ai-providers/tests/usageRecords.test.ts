import { describe, expect, it } from 'vitest';
import {
  createAiUsageRecord,
  createInMemoryAiUsageRecordRepository,
  createNoopAiProviderRegistry,
  estimateUsageCostUsd,
  summarizeUsageRecords
} from '../src';

describe('AI usage cost model', () => {
  it('estimates token, image and media cost in USD', () => {
    expect(
      estimateUsageCostUsd({
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        imageCount: 2,
        mediaBytes: 1024 * 1024 * 1024,
        inputTokenUsdPerMillion: 1,
        outputTokenUsdPerMillion: 4,
        imageUsdEach: 0.04,
        mediaUsdPerGb: 0.015
      })
    ).toBe(3.095);
  });

  it('creates auditable usage records with defaults', () => {
    const record = createAiUsageRecord({
      provider: 'openai',
      model: 'gpt-4.1-mini',
      operation: 'generate-title',
      siteId: 'site-1',
      userId: 'user-1',
      usage: {
        inputTokens: 1000,
        outputTokens: 200,
        inputTokenUsdPerMillion: 0.4,
        outputTokenUsdPerMillion: 1.6
      }
    });

    expect(record).toMatchObject({
      provider: 'openai',
      model: 'gpt-4.1-mini',
      operation: 'generate-title',
      status: 'estimated',
      retryCount: 0,
      inputTokens: 1000,
      outputTokens: 200,
      estimatedCostUsd: 0.00072
    });
  });

  it('summarizes records and supports in-memory filtering', () => {
    const repository = createInMemoryAiUsageRecordRepository();

    repository.create({
      provider: 'openai',
      model: 'text-embedding-3-small',
      operation: 'embed-text',
      siteId: 'site-1',
      userId: 'user-1',
      usage: {
        inputTokens: 1000,
        inputTokenUsdPerMillion: 0.02
      }
    });
    repository.create({
      provider: 'google',
      model: 'gemini-2.5-flash-image',
      operation: 'generate-featured-image',
      siteId: 'site-2',
      userId: 'user-1',
      usage: {
        imageCount: 1,
        imageUsdEach: 0.039
      }
    });

    expect(repository.summarize({ siteId: 'site-1' })).toMatchObject({
      records: 1,
      inputTokens: 1000,
      estimatedCostUsd: 0.00002
    });
    expect(summarizeUsageRecords(repository.list())).toMatchObject({
      records: 2,
      imageCount: 1,
      estimatedCostUsd: 0.03902
    });
  });
});

describe('noop provider registry', () => {
  it('exposes configured providers before real SDK adapters are installed', async () => {
    const registry = createNoopAiProviderRegistry({
      textProvider: 'wenwen',
      fallbackTextProvider: 'wenwen',
      embeddingProvider: 'wenwen',
      imageProvider: 'wenwen',
      imageFallbackProvider: 'wenwen',
      mediaStorageProvider: 'qiniu-kodo',
      imageOptimizationProvider: 'cloudinary',
      textModel: 'gpt-4.1-mini',
      embeddingModel: 'text-embedding-3-small',
      imageModel: 'gemini-2.5-flash-image'
    });

    expect(registry.text.provider).toBe('wenwen');
    expect(registry.text.model).toBe('gpt-4.1-mini');
    expect(registry.embedding.provider).toBe('wenwen');
    expect(registry.embedding.model).toBe('text-embedding-3-small');
    expect(registry.image.provider).toBe('wenwen');
    expect(registry.image.model).toBe('gemini-2.5-flash-image');
    await expect(
      registry.text.generateTitle({
        siteId: 'site-1',
        userId: 'user-1',
        keyword: 'AI SEO'
      })
    ).rejects.toThrow('AI provider adapter is not configured yet.');
  });
});
