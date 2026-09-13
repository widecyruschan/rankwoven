import { z } from 'zod';

const optionalUrlSchema = z.preprocess((value) => (value === '' ? undefined : value), z.url().optional());

export const apiConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  LEGACY_PASSWORD_HMAC_SECRET: z.string().optional(),
  WORDPRESS_CREDENTIAL_ENCRYPTION_KEY: z.string().optional(),
  WENWEN_API_BASE_URL: z.url().default('https://breakout.wenwen-ai.com'),
  WENWEN_API_KEY: z.string().optional(),
  WENWEN_TEXT_MODEL: z.string().default('gpt-4o-mini'),
  WENWEN_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  WENWEN_IMAGE_MODEL: z.string().default('gemini-2.5-flash-image'),
  AI_TEXT_PROVIDER: z
    .enum(['wenwen', 'openai', 'anthropic', 'google', 'deepseek'])
    .default('wenwen'),
  AI_FALLBACK_TEXT_PROVIDER: z
    .enum(['wenwen', 'openai', 'anthropic', 'google', 'deepseek'])
    .default('wenwen'),
  AI_EMBEDDING_PROVIDER: z.enum(['wenwen', 'openai', 'google']).default('wenwen'),
  AI_IMAGE_PROVIDER: z
    .enum(['wenwen', 'openai', 'google', 'adobe-firefly', 'stability-ai'])
    .default('wenwen'),
  AI_IMAGE_FALLBACK_PROVIDER: z
    .enum(['wenwen', 'openai', 'google', 'adobe-firefly', 'stability-ai'])
    .default('wenwen'),
  MEDIA_STORAGE_PROVIDER: z.enum(['qiniu-kodo', 'cloudflare-r2', 's3']).default('qiniu-kodo'),
  IMAGE_OPTIMIZATION_PROVIDER: z.enum(['cloudinary', 'imagekit']).default('cloudinary'),
  QINIU_ACCESS_KEY: z.string().optional(),
  QINIU_SECRET_KEY: z.string().optional(),
  QINIU_BUCKET: z.string().optional(),
  QINIU_REGION: z.string().optional(),
  QINIU_PUBLIC_DOMAIN: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS_JSON: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS_BASE64: z.string().optional(),
  KEYWORD_VOLUME_PROVIDER: z
    .enum(['dataforseo', 'semrush', 'generic'])
    .default('generic'),
  KEYWORD_VOLUME_API_URL: optionalUrlSchema,
  KEYWORD_VOLUME_API_KEY: z.string().optional(),
  AHREFS_KEYWORD_METRICS_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  AHREFS_API_URL: optionalUrlSchema,
  AHREFS_API_KEY: z.string().optional(),
  SEMRUSH_API_URL: optionalUrlSchema,
  SEMRUSH_API_KEY: z.string().optional(),
  SERPAPI_KEY: z.string().optional(),
  SERPAPI_MONTHLY_LIMIT: z.coerce.number().int().positive().default(250),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_TIME_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  CORS_ORIGINS: z.string().default('http://localhost:5173,https://rankwoven.com,https://app.rankwoven.com'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  ALLOW_LOCAL_LIGHTHOUSE_FALLBACK: z.enum(['true', 'false']).default('false').transform((value) => value === 'true')
}).superRefine((config, context) => {
  if (config.NODE_ENV !== 'production') return;

  const hasStrongSecret = (secret: string | undefined) => Boolean(secret && secret.length >= 32 && new Set(secret).size >= 16);

  if (!hasStrongSecret(config.JWT_SECRET)) {
    context.addIssue({
      code: 'custom',
      path: ['JWT_SECRET'],
      message: 'production requires a JWT_SECRET with at least 32 characters'
    });
  }
  if (!hasStrongSecret(config.WORDPRESS_CREDENTIAL_ENCRYPTION_KEY)) {
    context.addIssue({
      code: 'custom',
      path: ['WORDPRESS_CREDENTIAL_ENCRYPTION_KEY'],
      message: 'production requires a WordPress credential encryption key with at least 32 characters'
    });
  }
  if (
    config.JWT_SECRET &&
    config.WORDPRESS_CREDENTIAL_ENCRYPTION_KEY &&
    config.JWT_SECRET === config.WORDPRESS_CREDENTIAL_ENCRYPTION_KEY
  ) {
    context.addIssue({
      code: 'custom',
      path: ['WORDPRESS_CREDENTIAL_ENCRYPTION_KEY'],
      message: 'production JWT and WordPress credential encryption keys must differ'
    });
  }
});

export function parseApiConfig(environment: NodeJS.ProcessEnv = process.env) {
  return apiConfigSchema.parse(environment);
}

export const apiConfig = parseApiConfig();
