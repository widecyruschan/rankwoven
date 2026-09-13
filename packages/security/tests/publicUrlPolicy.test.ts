import { describe, expect, it, vi } from 'vitest';
import { UnsafeTargetUrlError, fetchValidatedPublicUrl, validatePublicUrl, validateRedirectTarget } from '../src/index';

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];

describe('public URL policy', () => {
  it('accepts a public HTTPS URL after DNS validation', async () => {
    await expect(validatePublicUrl('https://example.com/path', { lookup: publicLookup })).resolves.toMatchObject({
      url: expect.objectContaining({ hostname: 'example.com' }),
      resolvedAddresses: [{ address: '93.184.216.34', family: 4 }]
    });
  });

  it.each([
    'http://127.0.0.1/',
    'http://10.0.0.1/',
    'http://169.254.169.254/',
    'http://[::1]/',
    'http://[0:0:0:0:0:0:0:1]/',
    'http://[fc00::1]/',
    'http://localhost/',
    'ftp://example.com/',
    'https://example.com:3000/',
    'https://user:password@example.com/',
    'https://例子.example/'
  ])('rejects unsafe target %s', async (url) => {
    await expect(validatePublicUrl(url, { lookup: publicLookup })).rejects.toBeInstanceOf(UnsafeTargetUrlError);
  });

  it('revalidates redirect destinations', async () => {
    await expect(
      validateRedirectTarget('http://169.254.169.254/', new URL('https://example.com/'), { lookup: publicLookup })
    ).rejects.toBeInstanceOf(UnsafeTargetUrlError);
  });

  it('pins a validated hostname to its approved address', async () => {
    const target = await validatePublicUrl('https://example.com/', { lookup: publicLookup });
    await expect(fetchValidatedPublicUrl(target, { signal: AbortSignal.abort() })).rejects.toBeDefined();
  });

  it('does not follow redirects implicitly', async () => {
    const target = await validatePublicUrl('https://example.com/', { lookup: publicLookup });
    const fetchSpy = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    try {
      await expect(fetchValidatedPublicUrl(target)).resolves.toMatchObject({ status: 200 });
      expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
