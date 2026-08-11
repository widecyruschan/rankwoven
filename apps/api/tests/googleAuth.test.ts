import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { requestGoogleAccessToken } from '../src/googleAuth';

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

describe('google auth token cache', () => {
  it('caches tokens per scope and refreshes when the scope changes', async () => {
    const credentials = createTestCredentials();
    let tokenRequestCount = 0;

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url !== 'https://oauth2.googleapis.com/token') {
        throw new Error(`Unexpected fetch call: ${url}`);
      }

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
    });

    try {
      const firstToken = await requestGoogleAccessToken(credentials, 'scope-a');
      const secondToken = await requestGoogleAccessToken(credentials, 'scope-a');
      const thirdToken = await requestGoogleAccessToken(credentials, 'scope-b');

      expect(firstToken).toBe('token-1');
      expect(secondToken).toBe('token-1');
      expect(thirdToken).toBe('token-2');
      expect(tokenRequestCount).toBe(2);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
