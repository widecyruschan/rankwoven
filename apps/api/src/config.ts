import { z } from 'zod';

const optionalUrlSchema = z.preprocess((value) => (value === '' ? undefined : value), z.url().optional());

const envSchema = z.object({
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
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
    .enum(['dataforseo', 'ahrefs', 'semrush', 'generic'])
    .default('generic'),
  KEYWORD_VOLUME_API_URL: optionalUrlSchema,
  KEYWORD_VOLUME_API_KEY: z.string().optional(),
  AHREFS_API_URL: optionalUrlSchema,
  AHREFS_API_KEY: z.string().optional(),
  SEMRUSH_API_URL: optionalUrlSchema,
  SEMRUSH_API_KEY: z.string().optional(),
  SERPAPI_KEY: z.string().optional()
});

export const apiConfig = envSchema.parse(process.env);
