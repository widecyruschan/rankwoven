import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import rawBody from 'fastify-raw-body';
import Fastify from 'fastify';
import {
  createNoopAiProviderRegistry,
  createRedisTaskGovernance,
  createWenwenAiProviderRegistry,
  type TextGenerationProvider,
  type TaskGovernance
} from '@aieo/ai-providers';
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
  createDefaultSiteAuditMonitoringRepository,
  type SiteAuditMonitoringRepository,
  registerSiteAuditMonitoringRoutes,
  startSiteAuditMonitoringScheduler
} from './siteAuditMonitoring';
import {
  createDefaultSiteConnectionRepository,
  type SiteConnectionRepository,
  registerSiteConnectionRoutes
} from './siteConnections';
import { createDefaultPhase2Repository } from './phase2Repository';
import { registerPhase2Routes } from './phase2Routes';
import { registerPhase2FeatureRoutes } from './phase2FeatureRoutes';
import { createKeywordResearchProviderFromConfig } from './keywordResearchService';
import {
  createDefaultBillingRepository,
  createStripeBillingProvider,
  registerBillingRoutes,
  type BillingProvider,
  type BillingRepository
} from './billing';
import type { KeywordResearchProvider, Phase2Repository } from '@aieo/ai-providers';

interface CreateServerOptions {
  siteConnectionRepository?: SiteConnectionRepository;
  authRepository?: AuthRepository;
  seoOptimizationRepository?: SeoOptimizationRepository;
  siteAuditRepository?: SiteAuditRepository;
  siteAuditMonitoringRepository?: SiteAuditMonitoringRepository;
  textGenerationProvider?: TextGenerationProvider;
  phase2Repository?: Phase2Repository;
  taskGovernance?: TaskGovernance;
  keywordResearchProvider?: KeywordResearchProvider;
  billingRepository?: BillingRepository;
  billingProvider?: BillingProvider;
}

export function createServer(options: CreateServerOptions = {}) {
  const app = Fastify({
    logger: true,
    trustProxy: apiConfig.TRUST_PROXY
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
  const phase2Repository = options.phase2Repository ?? createDefaultPhase2Repository(apiConfig.DATABASE_URL);
  const billingRepository = options.billingRepository ?? createDefaultBillingRepository(apiConfig.DATABASE_URL, phase2Repository);
  const siteAuditRepository = options.siteAuditRepository ?? createDefaultSiteAuditRepository(apiConfig.DATABASE_URL);
  const siteAuditMonitoringRepository = options.siteAuditMonitoringRepository ?? createDefaultSiteAuditMonitoringRepository(apiConfig.DATABASE_URL);
  const taskGovernance = options.taskGovernance ?? (
    apiConfig.REDIS_URL ? createRedisTaskGovernance(apiConfig.REDIS_URL) : undefined
  );

  const allowedCorsOrigins = new Set(
    apiConfig.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  );
  app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || allowedCorsOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS_ORIGIN_DENIED'), false);
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  // ── Global Rate Limiting ──
  app.register(rateLimit, {
    max: apiConfig.RATE_LIMIT_MAX,
    timeWindow: apiConfig.RATE_LIMIT_TIME_WINDOW_MS,
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: (_request, context) => ({
      success: false,
      message: '請求過於頻繁，請稍後再試',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSec: Math.ceil(context.ttl / 1000)
      }
    })
  });
  app.register(rawBody, { global: false, encoding: 'utf8', runFirst: true });

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
    authService,
    options.textGenerationProvider ?? aiProviders.text
  );

  registerSiteAuditRoutes(
    app,
    siteConnectionRepository,
    siteAuditRepository,
    authService,
    taskGovernance
  );

  registerSiteAuditMonitoringRoutes(
    app,
    siteConnectionRepository,
    siteAuditRepository,
    siteAuditMonitoringRepository,
    authService,
    phase2Repository,
    taskGovernance
  );

  registerPhase2Routes(app, phase2Repository, authService, taskGovernance);
  registerPhase2FeatureRoutes(app, phase2Repository, authService, siteConnectionRepository, options.keywordResearchProvider ?? createKeywordResearchProviderFromConfig());
  registerBillingRoutes(app, billingRepository, phase2Repository, authService, options.billingProvider ?? createStripeBillingProvider());

  // 啟動站點稽核排程器（每 30 分鐘檢查一次）
  const stopScheduler = startSiteAuditScheduler(
    siteAuditRepository
  );
  const stopMonitoringScheduler = startSiteAuditMonitoringScheduler(siteAuditMonitoringRepository);
  app.addHook('onClose', () => {
    stopScheduler();
    stopMonitoringScheduler();
  });
  app.addHook('onClose', async () => {
    await billingRepository.close?.();
    await taskGovernance?.close();
  });

  return app;
}
