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
