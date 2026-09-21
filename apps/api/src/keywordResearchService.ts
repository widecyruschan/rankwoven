import {
  createDataForSeoKeywordResearchProvider,
  createEnrichingKeywordResearchProvider,
  createFallbackKeywordResearchProvider,
  createFreeKeywordResearchProvider,
  createSemrushKeywordResearchProvider,
  createSerpApiKeywordResearchProvider,
  isDataForSeoKeywordResearchConfiguration,
  type KeywordResearchProvider
} from '@aieo/ai-providers';
import { validatePublicUrl } from '@aieo/security';
import { apiConfig } from './config';

const locationCodes: Record<string, number> = {
  US: 2840,
  GB: 2826,
  HK: 2344,
  TW: 2158,
  CN: 2156,
  ES: 2724,
  MX: 2484
};

function getLocationCode(market: string) {
  return locationCodes[market.trim().toUpperCase()] ?? market;
}

function createSerpApiProviderFromConfig(): KeywordResearchProvider | undefined {
  const apiKey = apiConfig.SERPAPI_KEY?.trim();
  if (!apiKey) return undefined;
  return createSerpApiKeywordResearchProvider({ apiKey });
}

function createFreeProviderFromConfig(): KeywordResearchProvider {
  return createFreeKeywordResearchProvider({
    bingApiKey: apiConfig.BING_WEBMASTER_API_KEY?.trim() || undefined,
    braveApiKey: apiConfig.BRAVE_SEARCH_API_KEY?.trim() || undefined,
    validateUrl: async (url) => validatePublicUrl(url)
  });
}

export function createKeywordResearchProviderFromConfig(): KeywordResearchProvider {
  const provider = apiConfig.KEYWORD_VOLUME_PROVIDER;
  const apiUrl = apiConfig.KEYWORD_VOLUME_API_URL;
  const apiKey = apiConfig.KEYWORD_VOLUME_API_KEY;
  const serpApi = createSerpApiProviderFromConfig();
  const free = createFreeProviderFromConfig();

  let primary: KeywordResearchProvider | undefined;
  if (isDataForSeoKeywordResearchConfiguration(provider, apiUrl, apiKey) && apiUrl && apiKey) {
    primary = createDataForSeoKeywordResearchProvider({
      baseUrl: apiUrl,
      apiKey,
      locationCode: getLocationCode('US')
    });
  } else if (provider === 'semrush' && apiConfig.SEMRUSH_API_URL && apiConfig.SEMRUSH_API_KEY) {
    primary = createSemrushKeywordResearchProvider({
      baseUrl: apiConfig.SEMRUSH_API_URL,
      apiKey: apiConfig.SEMRUSH_API_KEY
    });
  }

  if (primary && serpApi && primary.id !== serpApi.id) {
    return createEnrichingKeywordResearchProvider(
      createFallbackKeywordResearchProvider(primary, serpApi),
      free
    );
  }
  return createEnrichingKeywordResearchProvider(primary ?? serpApi ?? free, free);
}
