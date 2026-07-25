import cors from '@fastify/cors';
import Fastify from 'fastify';
import { createNoopAiProviderRegistry } from '@aieo/ai-providers';
import { createWordPressAdapter } from '@aieo/cms-adapters';
import { apiConfig } from './config';

export function createServer() {
  const app = Fastify({
    logger: true
  });
  const aiProviders = createNoopAiProviderRegistry({
    textProvider: apiConfig.AI_TEXT_PROVIDER,
    fallbackTextProvider: apiConfig.AI_FALLBACK_TEXT_PROVIDER,
    embeddingProvider: apiConfig.AI_EMBEDDING_PROVIDER,
    imageProvider: apiConfig.AI_IMAGE_PROVIDER,
    imageFallbackProvider: apiConfig.AI_IMAGE_FALLBACK_PROVIDER,
    mediaStorageProvider: apiConfig.MEDIA_STORAGE_PROVIDER,
    imageOptimizationProvider: apiConfig.IMAGE_OPTIMIZATION_PROVIDER
  });

  app.register(cors, {
    origin: true
  });

  app.get('/health', async () => ({
    success: true,
    message: 'API 服務正常',
    data: {
      service: 'api'
    }
  }));

  app.get('/api/v1/cms-adapters', async () => ({
    success: true,
    message: '操作成功',
    data: {
      adapters: [
        createWordPressAdapter().getCapabilities(),
        {
          platform: 'joomla',
          phase: 'Phase 2',
          status: 'reserved'
        },
        {
          platform: 'opencart',
          phase: 'Phase 3',
          status: 'reserved'
        }
      ]
    }
  }));

  app.get('/api/v1/ai-providers', async () => ({
    success: true,
    message: '操作成功',
    data: {
      text: {
        provider: aiProviders.text.provider,
        model: aiProviders.text.model,
        fallbackProvider: apiConfig.AI_FALLBACK_TEXT_PROVIDER,
        operations: [
          'generate-title',
          'generate-meta-description',
          'generate-outline',
          'generate-article-draft',
          'rewrite-content',
          'score-content-quality'
        ]
      },
      embedding: {
        provider: aiProviders.embedding.provider,
        model: aiProviders.embedding.model,
        operations: ['embed-text', 'embed-article-chunk', 'embed-keyword']
      },
      image: {
        provider: aiProviders.image.provider,
        model: aiProviders.image.model,
        fallbackProvider: apiConfig.AI_IMAGE_FALLBACK_PROVIDER,
        operations: ['generate-featured-image', 'generate-social-image', 'edit-image']
      },
      mediaStorage: {
        provider: apiConfig.MEDIA_STORAGE_PROVIDER
      },
      imageOptimization: {
        provider: apiConfig.IMAGE_OPTIMIZATION_PROVIDER
      }
    }
  }));

  return app;
}
