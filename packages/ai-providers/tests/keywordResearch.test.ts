import { describe, expect, it } from 'vitest';
import {
  createAhrefsKeywordResearchProvider,
  createDataForSeoKeywordResearchProvider,
  createSemrushKeywordResearchProvider
} from '../src/keywordResearch';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

describe('Keyword Research Provider adapters', () => {
  it('normalizes DataForSEO metrics and ranked keywords with a snapshot', async () => {
    const requests: Request[] = [];
    const provider = createDataForSeoKeywordResearchProvider({
      baseUrl: 'https://dataforseo.test',
      apiKey: 'fixture-key',
      fetchImpl: async (input, init) => {
        requests.push(new Request(input, init));
        if (String(input).includes('ranked_keywords')) {
          return jsonResponse({ tasks: [{ result: [{ keyword: 'eco mat', rank_absolute: 8, url: 'https://competitor.test/eco-mat', etv: 12.5, serp_features: ['featured_snippet'] }] }] });
        }
        return jsonResponse({ tasks: [{ result: [{ keyword: 'yoga mat', search_volume: 1000, cpc: 1.2, competition: 0.4, keyword_difficulty: 32 }] }] });
      }
    });
    const input = { seeds: ['yoga mat'], market: 'US', language: 'en', device: 'desktop' as const, engine: 'google' as const };
    const metrics = await provider.discoverKeywordMetrics(input);
    expect(metrics).toMatchObject({ provider: 'dataforseo', sourceType: 'provider_estimated', providerSnapshotId: expect.stringContaining('dataforseo-') });
    expect(metrics.metrics[0]).toMatchObject({ keyword: 'yoga mat', volume: 1000, cpcUsd: 1.2, competition: 0.4, difficulty: 32 });
    const ranked = await provider.getCompetitorRankedKeywords({ ...input, domain: 'competitor.test', limit: 500 });
    expect(ranked.keywords[0]).toMatchObject({ keyword: 'eco mat', rank: 8, etv: 12.5 });
    expect(requests[0].headers.get('authorization')).toMatch(/^Basic /);
    expect(await requests[0].clone().text()).toContain('"location_code"');
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
});
