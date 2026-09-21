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
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'demo@rankwoven.com',
          password: 'rankwoven'
        }
      });
      const authToken = loginResponse.json<{ data: { token: string } }>().data.token;
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/site-connections',
        headers: {
          authorization: `Bearer ${authToken}`
        },
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
          authorization: `Bearer ${authToken}`
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

  it('returns page performance from the Search Analytics page dimension', async () => {
    const server = createServer();
    const previousCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const credentials = createTestCredentials();
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON.stringify(credentials);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === 'https://oauth2.googleapis.com/token') {
        return new Response(JSON.stringify({ access_token: 'page-token', expires_in: 3600 }), { status: 200 });
      }
      if (url.includes('/searchAnalytics/query')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { dimensions?: string[] };
        expect(body.dimensions).toEqual(['page']);
        return new Response(JSON.stringify({ rows: [{ keys: ['https://www.rankwoven.com/seo/'], clicks: 12, impressions: 120, ctr: 0.1, position: 4.5 }] }), { status: 200 });
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });

    try {
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'demo@rankwoven.com', password: 'rankwoven' }
      });
      const authToken = loginResponse.json<{ data: { token: string } }>().data.token;
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/site-connections',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { platform: 'wordpress', name: 'GSC page site', siteUrl: 'https://www.rankwoven.com' }
      });
      const siteId = createResponse.json<{ data: { site: { id: string } } }>().data.site.id;
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/search-console/pages?siteId=${siteId}&startDate=2026-09-01&endDate=2026-09-20`,
        headers: { authorization: `Bearer ${authToken}` }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        success: true,
        data: {
          configured: true,
          startDate: '2026-09-01',
          endDate: '2026-09-20',
          pages: [{ page: 'https://www.rankwoven.com/seo/', clicks: 12, impressions: 120 }],
          totals: { totalClicks: 12, totalImpressions: 120 }
        }
      });
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
