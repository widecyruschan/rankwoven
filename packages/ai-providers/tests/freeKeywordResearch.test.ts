import { describe, expect, it } from 'vitest';
import {
  classifySearchIntent,
  createEnrichingKeywordResearchProvider,
  createFreeKeywordResearchProvider,
  expandLongTailKeywords
} from '../src/freeKeywordResearch';
import { createDataForSeoKeywordResearchProvider } from '../src/keywordResearch';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

describe('free keyword research', () => {
  it('classifies commercial and transactional intents', () => {
    expect(classifySearchIntent('best yoga mat')).toBe('commercial');
    expect(classifySearchIntent('yoga mat 價格')).toBe('transactional');
    expect(classifySearchIntent('what is yoga')).toBe('informational');
  });

  it('expands seeds with Google Autocomplete, Datamuse and Wikipedia', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('suggestqueries.google.com')) {
        return jsonResponse(['yoga', ['yoga mat', 'yoga for beginners', 'yoga pants']]);
      }
      if (url.includes('api.datamuse.com')) {
        return jsonResponse([{ word: 'pose' }, { word: 'stretch' }]);
      }
      if (url.includes('wikipedia.org')) {
        return jsonResponse(['yoga', ['Yoga', 'Yoga (philosophy)'], [], []]);
      }
      return jsonResponse({});
    };

    const keywords = await expandLongTailKeywords(['yoga'], {
      market: 'US',
      language: 'en',
      fetchImpl,
      maxKeywords: 50
    });
    const phrases = keywords.map((item) => item.keyword.toLowerCase());
    expect(phrases).toContain('yoga mat');
    expect(phrases.some((item) => item.includes('pose') || item.includes('stretch'))).toBe(true);
    expect(phrases).toContain('yoga');
    expect(keywords.some((item) => item.source === 'google_autocomplete')).toBe(true);
  });

  it('enriches paid metrics with free long-tail suggestions', async () => {
    const paid = createDataForSeoKeywordResearchProvider({
      baseUrl: 'https://dataforseo.test',
      apiKey: 'fixture-key',
      fetchImpl: async () => jsonResponse({
        status_code: 20000,
        tasks: [{
          status_code: 20000,
          result: [{ keyword: 'yoga mat', search_volume: 1000, cpc: 1.2, competition: 0.4, keyword_difficulty: 32 }]
        }]
      })
    });
    const free = createFreeKeywordResearchProvider({
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.includes('suggestqueries.google.com')) {
          return jsonResponse(['yoga', ['yoga mat for beginners']]);
        }
        if (url.includes('sitemap')) {
          return new Response('<?xml version="1.0"?><urlset><loc>https://competitor.test/eco-mat</loc></urlset>', {
            status: 200,
            headers: { 'content-type': 'application/xml' }
          });
        }
        return jsonResponse([]);
      }
    });
    const provider = createEnrichingKeywordResearchProvider(paid, free);
    const metrics = await provider.discoverKeywordMetrics({
      seeds: ['yoga'],
      market: 'US',
      language: 'en',
      device: 'desktop',
      engine: 'google'
    });
    expect(metrics.provider).toBe('dataforseo');
    expect(metrics.metrics.find((item) => item.keyword === 'yoga mat')?.volume).toBe(1000);
    expect(metrics.metrics.some((item) => item.keyword.toLowerCase().includes('beginners'))).toBe(true);

    const ranked = await provider.getCompetitorRankedKeywords({
      seeds: ['yoga'],
      market: 'US',
      language: 'en',
      device: 'desktop',
      engine: 'google',
      domain: 'competitor.test',
      limit: 50
    });
    expect(ranked.keywords.some((item) => item.keyword.toLowerCase().includes('eco mat') || item.url?.includes('eco-mat'))).toBe(true);
  });
});
