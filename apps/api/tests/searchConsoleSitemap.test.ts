import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createServer } from '../src/server';

function createTestCredentials() {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 1024,
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    },
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    }
  });

  return {
    client_email: `rankwoven-${randomUUID()}@example.com`,
    private_key: privateKey
  };
}

describe('search console sitemap submission', () => {
  it('submits sitemap.xml through the site connection route', async () => {
    const server = createServer();
    const previousCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const credentials = createTestCredentials();
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON.stringify(credentials);

    let tokenRequestCount = 0;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === 'https://oauth2.googleapis.com/token') {
        tokenRequestCount += 1;
        return new Response(
          JSON.stringify({
            access_token: `token-${tokenRequestCount}`,
            expires_in: 3600
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }

      if (url.startsWith('https://searchconsole.googleapis.com/webmasters/v3/sites/')) {
        expect(url).toContain('sitemaps');
        return new Response(null, { status: 204 });
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    try {
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/site-connections',
        payload: {
          platform: 'wordpress',
          name: 'Sitemap Site',
          siteUrl: 'https://www.rankwoven.com',
          cmsVersion: '6.8.2',
          pluginVersion: '0.1.0'
        }
      });
      const createBody = createResponse.json<{ data: { site: { id: string }; apiToken: string } }>();

      expect(createResponse.statusCode).toBe(201);

      const submitResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/site-connections/${createBody.data.site.id}/search-console/sitemaps`,
        headers: {
          authorization: `Bearer ${createBody.data.apiToken}`
        },
        payload: {
          sitemapPath: 'sitemap.xml'
        }
      });

      expect(submitResponse.statusCode).toBe(200);
      expect(submitResponse.json()).toMatchObject({
        success: true,
        data: {
          sitemapUrl: 'https://www.rankwoven.com/sitemap.xml',
          propertyUrl: 'https://www.rankwoven.com'
        }
      });
      expect(tokenRequestCount).toBe(1);
      expect(fetchSpy.mock.calls[1]?.[1]?.method).toBe('PUT');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    } finally {
      fetchSpy.mockRestore();
      if (previousCredentials === undefined) {
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
      } else {
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = previousCredentials;
      }
      await server.close();
    }
  });
});
