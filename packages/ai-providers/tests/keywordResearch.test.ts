import { describe, expect, it } from 'vitest';
import {
  createAhrefsKeywordResearchProvider,
  createDataForSeoKeywordResearchProvider,
  createFallbackKeywordResearchProvider,
  createSemrushKeywordResearchProvider,
  createSerpApiKeywordResearchProvider,
  isDataForSeoKeywordResearchConfiguration
} from '../src/keywordResearch';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

describe('Keyword Research Provider adapters', () => {
  it('uses DataForSEO for research when the established generic URL points to DataForSEO', () => {
    expect(isDataForSeoKeywordResearchConfiguration('generic', 'https://api.dataforseo.com/v3', 'fixture-key')).toBe(true);
    expect(isDataForSeoKeywordResearchConfiguration('generic', 'https://keywords.example.test/v1', 'fixture-key')).toBe(false);
    expect(isDataForSeoKeywordResearchConfiguration('generic', 'https://api.dataforseo.com/v3', undefined)).toBe(false);
  });

  it('normalizes DataForSEO metrics and ranked keywords with a snapshot', async () => {
    const requests: Request[] = [];
    const provider = createDataForSeoKeywordResearchProvider({
      baseUrl: 'https://dataforseo.test',
      apiKey: 'fixture-key',
      fetchImpl: async (input, init) => {
        requests.push(new Request(input, init));
        if (String(input).includes('ranked_keywords')) {
          return jsonResponse({
            status_code: 20000,
            tasks: [{
              status_code: 20000,
              result: [{
                items: [{
                  keyword_data: { keyword: 'eco mat' },
                  ranked_serp_element: {
                    serp_item: {
                      rank_absolute: 8,
                      url: 'https://competitor.test/eco-mat',
                      etv: 12.5,
                      serp_features: ['featured_snippet']
                    }
                  }
                }]
              }]
            }]
          });
        }
        return jsonResponse({
          status_code: 20000,
          tasks: [{ status_code: 20000, result: [{ keyword: 'yoga mat', search_volume: 1000, cpc: 1.2, competition: 0.4, keyword_difficulty: 32 }] }]
        });
      }
    });
    const input = { seeds: ['yoga mat'], market: 'US', language: 'en', device: 'desktop' as const, engine: 'google' as const };
    const metrics = await provider.discoverKeywordMetrics(input);
    expect(metrics).toMatchObject({ provider: 'dataforseo', sourceType: 'provider_estimated', providerSnapshotId: expect.stringContaining('dataforseo-') });
    expect(metrics.metrics[0]).toMatchObject({ keyword: 'yoga mat', volume: 1000, cpcUsd: 1.2, competition: 0.4, difficulty: 32 });
    const ranked = await provider.getCompetitorRankedKeywords({ ...input, domain: 'www.competitor.test', limit: 500 });
    expect(ranked.keywords[0]).toMatchObject({ keyword: 'eco mat', rank: 8, etv: 12.5 });
    expect(requests[0].headers.get('authorization')).toMatch(/^Basic /);
    expect(await requests[0].clone().text()).toContain('"location_code"');
    expect(await requests[1].clone().text()).toContain('"target":"competitor.test"');
  });

  it('maps zh-Hant language codes for DataForSEO and surfaces auth task errors', async () => {
    const requests: Request[] = [];
    const provider = createDataForSeoKeywordResearchProvider({
      baseUrl: 'https://dataforseo.test',
      apiKey: 'fixture-key',
      fetchImpl: async (input, init) => {
        requests.push(new Request(input, init));
        return jsonResponse({ status_code: 20000, tasks: [{ status_code: 40102, result: null }] });
      }
    });
    await expect(
      provider.discoverKeywordMetrics({ seeds: ['newscan'], market: 'TW', language: 'zh-Hant', device: 'desktop', engine: 'google' })
    ).rejects.toThrow('KEYWORD_PROVIDER_HTTP_401');
    expect(await requests[0].clone().text()).toContain('"language_code":"zh_tw"');
    expect(await requests[0].clone().text()).toContain('"location_code":2158');
  });

  it('normalizes double-encoded DataForSEO keys and reports unverified accounts', async () => {
    const { normalizeDataForSeoApiKey } = await import('../src/keywordResearch');
    const email = 'owner@example.test';
    const real = `${email}:secret-token`;
    const doubleEncoded = `${email}:${Buffer.from(real).toString('base64')}`;
    expect(normalizeDataForSeoApiKey(doubleEncoded)).toBe(real);

    const provider = createDataForSeoKeywordResearchProvider({
      baseUrl: 'https://dataforseo.test',
      apiKey: doubleEncoded,
      fetchImpl: async (_input, init) => {
        const authorization = new Request('https://dataforseo.test', init).headers.get('authorization') ?? '';
        expect(authorization).toBe(`Basic ${Buffer.from(real).toString('base64')}`);
        return jsonResponse({
          status_code: 40104,
          status_message: 'Please verify your account before using the API.'
        }, 403);
      }
    });
    await expect(
      provider.getCompetitorRankedKeywords({
        seeds: ['newscan'],
        market: 'TW',
        language: 'zh-Hant',
        device: 'desktop',
        engine: 'google',
        domain: 'newscan.com.tw',
        limit: 10
      })
    ).rejects.toThrow('KEYWORD_PROVIDER_ACCOUNT_UNVERIFIED');
  });

  it('normalizes Ahrefs JSON and caps competitor output at 100 rows', async () => {
    const provider = createAhrefsKeywordResearchProvider({
      baseUrl: 'https://ahrefs.test/api',
      apiKey: 'fixture-key',
      fetchImpl: async (input) => {
        if (String(input).endsWith('/ranked-keywords')) {
          return jsonResponse({ keywords: Array.from({ length: 105 }, (_, index) => ({ keyword: `term-${index}`, rank: index + 1 })) });
        }
        return jsonResponse({ keywords: [{ keyword: 'seo tool', volume: 250, cpc: 99, difficulty: 50 }] });
      }
    });
    const input = { seeds: ['seo tool'], market: 'US', language: 'en', device: 'desktop' as const, engine: 'google' as const };
    await expect(provider.discoverKeywordMetrics(input)).resolves.toMatchObject({ metrics: [{ keyword: 'seo tool', volume: 250, cpcUsd: 99 }] });
    const ranked = await provider.getCompetitorRankedKeywords({ ...input, domain: 'competitor.test', limit: 100 });
    expect(ranked.keywords).toHaveLength(100);
  });

  it('parses Semrush CSV and hides upstream error bodies', async () => {
    const provider = createSemrushKeywordResearchProvider({
      baseUrl: 'https://semrush.test/analytics',
      apiKey: 'fixture-key',
      fetchImpl: async () => new Response('Ph;Nq;Cpc;Com;Kd\nseo audit;400;2.5;0.3;42', { status: 200 })
    });
    await expect(provider.discoverKeywordMetrics({ seeds: ['seo audit'], market: 'US', language: 'en', device: 'desktop', engine: 'google' })).resolves.toMatchObject({ metrics: [{ keyword: 'seo audit', volume: 400, cpcUsd: 2.5, competition: 0.3, difficulty: 42 }] });

    const failing = createDataForSeoKeywordResearchProvider({
      baseUrl: 'https://dataforseo.test',
      apiKey: 'fixture-key',
      fetchImpl: async () => jsonResponse({ error: 'private provider detail' }, 429)
    });
    await expect(failing.discoverKeywordMetrics({ seeds: ['seo'], market: 'US', language: 'en', device: 'desktop', engine: 'google' })).rejects.toThrow('KEYWORD_PROVIDER_HTTP_429');
    await expect(failing.discoverKeywordMetrics({ seeds: ['seo'], market: 'US', language: 'en', device: 'desktop', engine: 'google' })).rejects.not.toThrow('private provider detail');
  });

  it('uses SerpAPI autocomplete and competitor SERP ranks as a free-tier friendly adapter', async () => {
    const requests: string[] = [];
    const provider = createSerpApiKeywordResearchProvider({
      apiKey: 'serp-key',
      baseUrl: 'https://serpapi.test/search',
      maxRequestsPerOperation: 4,
      fetchImpl: async (input) => {
        const url = String(input);
        requests.push(url);
        if (url.includes('engine=google_autocomplete')) {
          return jsonResponse({ suggestions: [{ value: 'yoga mat cleaner' }, { value: 'yoga mat bag' }] });
        }
        if (url.includes('q=site%3Acompetitor.test') || url.includes('q=site:competitor.test')) {
          return jsonResponse({
            organic_results: [{ title: 'Eco Yoga Mat | Competitor', link: 'https://competitor.test/eco', position: 1 }]
          });
        }
        if (url.includes('q=competitor') && !url.includes('site')) {
          return jsonResponse({
            related_searches: [{ query: 'best yoga mat' }],
            related_questions: [{ question: 'what yoga mat is best' }]
          });
        }
        return jsonResponse({
          organic_results: [
            { title: 'Other', link: 'https://other.test', position: 1 },
            { title: 'Competitor result', link: 'https://www.competitor.test/mat', position: 3 }
          ]
        });
      }
    });

    const metrics = await provider.discoverKeywordMetrics({
      seeds: ['yoga mat'],
      market: 'TW',
      language: 'zh-Hant',
      device: 'desktop',
      engine: 'google'
    });
    expect(metrics.provider).toBe('serpapi');
    expect(metrics.metrics.map((item) => item.keyword)).toEqual(expect.arrayContaining(['yoga mat cleaner', 'yoga mat bag']));
    expect(requests[0]).toContain('hl=zh-tw');
    expect(requests[0]).toContain('gl=tw');

    const ranked = await provider.getCompetitorRankedKeywords({
      seeds: ['yoga mat'],
      market: 'TW',
      language: 'zh-Hant',
      device: 'desktop',
      engine: 'google',
      domain: 'www.competitor.test',
      limit: 20
    });
    expect(ranked.provider).toBe('serpapi');
    expect(ranked.keywords.some((item) => item.keyword.toLowerCase().includes('yoga'))).toBe(true);
    expect(ranked.keywords.some((item) => item.rank === 3 || item.url?.includes('competitor.test'))).toBe(true);
  });

  it('falls back from DataForSEO to SerpAPI when the primary provider fails', async () => {
    const primary = createDataForSeoKeywordResearchProvider({
      baseUrl: 'https://dataforseo.test',
      apiKey: 'fixture-key',
      fetchImpl: async () => jsonResponse({ status_code: 40104, status_message: 'Please verify your account' }, 403)
    });
    const fallback = createSerpApiKeywordResearchProvider({
      apiKey: 'serp-key',
      fetchImpl: async () => jsonResponse({ suggestions: [{ value: 'fallback keyword' }] })
    });
    const provider = createFallbackKeywordResearchProvider(primary, fallback);
    await expect(
      provider.discoverKeywordMetrics({ seeds: ['seo'], market: 'US', language: 'en', device: 'desktop', engine: 'google' })
    ).resolves.toMatchObject({
      provider: 'serpapi',
      metrics: [{ keyword: 'fallback keyword' }]
    });
  });
});
