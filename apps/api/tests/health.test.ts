import { describe, expect, it } from 'vitest';
import { createServer } from '../src/server';

describe('api health route', () => {
  it('returns a successful health response', async () => {
    const server = createServer();
    const response = await server.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        service: 'api'
      }
    });
  });
});

describe('api provider route', () => {
  it('returns configured AI provider adapters', async () => {
    const server = createServer();
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/ai-providers'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        text: {
          provider: 'openai',
          fallbackProvider: 'anthropic'
        },
        embedding: {
          provider: 'openai'
        },
        image: {
          provider: 'google',
          fallbackProvider: 'openai'
        },
        mediaStorage: {
          provider: 'cloudflare-r2'
        },
        imageOptimization: {
          provider: 'cloudinary'
        }
      }
    });
  });
});
