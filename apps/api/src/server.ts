import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { createNoopAiProviderRegistry, createWenwenAiProviderRegistry } from '@aieo/ai-providers';
import { createWordPressAdapter } from '@aieo/cms-adapters';
import {
  createAuthService,
  createDefaultAuthRepository,
  type AuthRepository,
  registerAuthRoutes
} from './auth';
import { registerAnalyticsRoutes } from './analytics';
import { apiConfig } from './config';
import { createKeywordSuggestionService, registerKeywordSuggestionRoutes, setGscKeywordMapGetter } from './keywordSuggestions';
import { registerLighthouseRoutes } from './lighthouse';
import { registerSearchConsoleRoutes, getGscKeywordMap } from './searchConsole';
import {
  createDefaultSeoOptimizationRepository,
  type SeoOptimizationRepository,
  registerSeoOptimizationRoutes
} from './seoOptimization';
import {
  createDefaultSiteAuditRepository,
  type SiteAuditRepository,
  registerSiteAuditRoutes,
  startSiteAuditScheduler
} from './siteAudit';
import {
  createDefaultSiteConnectionRepository,
  type SiteConnectionRepository,
  registerSiteConnectionRoutes
} from './siteConnections';

interface CreateServerOptions {
  siteConnectionRepository?: SiteConnectionRepository;
  authRepository?: AuthRepository;
  seoOptimizationRepository?: SeoOptimizationRepository;
  siteAuditRepository?: SiteAuditRepository;
}

export function createServer(options: CreateServerOptions = {}) {
  const app = Fastify({
    logger: true
  });
  const aiProviders = apiConfig.WENWEN_API_KEY
    ? createWenwenAiProviderRegistry({
        baseUrl: apiConfig.WENWEN_API_BASE_URL,
        apiKey: apiConfig.WENWEN_API_KEY,
        textProvider: apiConfig.AI_TEXT_PROVIDER,
        textModel: apiConfig.WENWEN_TEXT_MODEL,
        embeddingProvider: apiConfig.AI_EMBEDDING_PROVIDER,
        embeddingModel: apiConfig.WENWEN_EMBEDDING_MODEL,
        imageProvider: apiConfig.AI_IMAGE_PROVIDER,
        imageModel: apiConfig.WENWEN_IMAGE_MODEL
      })
    : createNoopAiProviderRegistry({
        textProvider: apiConfig.AI_TEXT_PROVIDER,
        fallbackTextProvider: apiConfig.AI_FALLBACK_TEXT_PROVIDER,
        embeddingProvider: apiConfig.AI_EMBEDDING_PROVIDER,
        imageProvider: apiConfig.AI_IMAGE_PROVIDER,
        imageFallbackProvider: apiConfig.AI_IMAGE_FALLBACK_PROVIDER,
        mediaStorageProvider: apiConfig.MEDIA_STORAGE_PROVIDER,
        imageOptimizationProvider: apiConfig.IMAGE_OPTIMIZATION_PROVIDER,
        proxyBaseUrl: apiConfig.WENWEN_API_BASE_URL,
        textModel: apiConfig.WENWEN_TEXT_MODEL,
        embeddingModel: apiConfig.WENWEN_EMBEDDING_MODEL,
        imageModel: apiConfig.WENWEN_IMAGE_MODEL
      });
  const authRepository = options.authRepository ?? createDefaultAuthRepository(apiConfig.DATABASE_URL);
  const authService = createAuthService(authRepository);
  const siteConnectionRepository =
    options.siteConnectionRepository ?? createDefaultSiteConnectionRepository(apiConfig.DATABASE_URL);

  app.register(cors, {
    origin: true
  });

  // ── Global Rate Limiting ──
  app.register(rateLimit, {
    max: apiConfig.RATE_LIMIT_MAX,
    timeWindow: apiConfig.RATE_LIMIT_TIME_WINDOW_MS,
    keyGenerator: (request) => {
      // Use X-Forwarded-For if behind reverse proxy
      const xff = request.headers['x-forwarded-for'];
      const ip = Array.isArray(xff) ? xff[0] : (xff ?? request.ip);
      return String(ip);
    },
    errorResponseBuilder: (_request, context) => ({
      success: false,
      message: '請求過於頻繁，請稍後再試',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSec: Math.ceil(context.ttl / 1000)
      }
    })
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
        proxyBaseUrl: apiConfig.WENWEN_API_BASE_URL,
        endpoint: '/v1/chat/completions',
        apiKeyConfigured: Boolean(apiConfig.WENWEN_API_KEY),
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
        proxyBaseUrl: apiConfig.WENWEN_API_BASE_URL,
        endpoint: '/v1/embeddings',
        apiKeyConfigured: Boolean(apiConfig.WENWEN_API_KEY),
        operations: ['embed-text', 'embed-article-chunk', 'embed-keyword']
      },
      image: {
        provider: aiProviders.image.provider,
        model: aiProviders.image.model,
        fallbackProvider: apiConfig.AI_IMAGE_FALLBACK_PROVIDER,
        proxyBaseUrl: apiConfig.WENWEN_API_BASE_URL,
        endpoint: '/v1/images/generations',
        apiKeyConfigured: Boolean(apiConfig.WENWEN_API_KEY),
        operations: ['generate-featured-image', 'generate-social-image', 'edit-image']
      },
      mediaStorage: {
        provider: apiConfig.MEDIA_STORAGE_PROVIDER,
        bucket: apiConfig.QINIU_BUCKET,
        publicDomain: apiConfig.QINIU_PUBLIC_DOMAIN,
        credentialsConfigured: Boolean(
          apiConfig.QINIU_ACCESS_KEY && apiConfig.QINIU_SECRET_KEY && apiConfig.QINIU_BUCKET
        )
      },
      imageOptimization: {
        provider: apiConfig.IMAGE_OPTIMIZATION_PROVIDER
      }
    }
  }));

  registerAuthRoutes(app, authService, authRepository);
  registerAnalyticsRoutes(app, authService, siteConnectionRepository);
  registerSearchConsoleRoutes(app, authService, siteConnectionRepository);
  registerLighthouseRoutes(app, authService, siteConnectionRepository);

  // Wire GSC keyword data into the keyword suggestion enrichment pipeline
  setGscKeywordMapGetter(getGscKeywordMap);
  registerKeywordSuggestionRoutes(app, authService, createKeywordSuggestionService(aiProviders.text));

  registerSiteConnectionRoutes(app, siteConnectionRepository, authService);

  registerSeoOptimizationRoutes(
    app,
    siteConnectionRepository,
    options.seoOptimizationRepository ?? createDefaultSeoOptimizationRepository(apiConfig.DATABASE_URL),
    authService
  );

  registerSiteAuditRoutes(
    app,
    siteConnectionRepository,
    options.siteAuditRepository ?? createDefaultSiteAuditRepository(apiConfig.DATABASE_URL),
    authService
  );

  // 啟動站點稽核排程器（每 30 分鐘檢查一次）
  const stopScheduler = startSiteAuditScheduler(
    options.siteAuditRepository ?? createDefaultSiteAuditRepository(apiConfig.DATABASE_URL)
  );
  app.addHook('onClose', () => {
    stopScheduler();
  });

  return app;
}
