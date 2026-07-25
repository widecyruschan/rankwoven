import { z } from 'zod';

const envSchema = z.object({
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  AI_TEXT_PROVIDER: z.enum(['openai', 'anthropic', 'google', 'deepseek']).default('openai'),
  AI_FALLBACK_TEXT_PROVIDER: z.enum(['openai', 'anthropic', 'google', 'deepseek']).default('anthropic'),
  AI_EMBEDDING_PROVIDER: z.enum(['openai', 'google']).default('openai'),
  AI_IMAGE_PROVIDER: z
    .enum(['openai', 'google', 'adobe-firefly', 'stability-ai'])
    .default('google'),
  AI_IMAGE_FALLBACK_PROVIDER: z
    .enum(['openai', 'google', 'adobe-firefly', 'stability-ai'])
    .default('openai'),
  MEDIA_STORAGE_PROVIDER: z.enum(['cloudflare-r2', 's3']).default('cloudflare-r2'),
  IMAGE_OPTIMIZATION_PROVIDER: z.enum(['cloudinary', 'imagekit']).default('cloudinary')
});

export const apiConfig = envSchema.parse(process.env);
