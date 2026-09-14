import {
  createDataForSeoKeywordResearchProvider,
  createSemrushKeywordResearchProvider,
  isDataForSeoKeywordResearchConfiguration,
  type KeywordResearchProvider
} from '@aieo/ai-providers';
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

export function createKeywordResearchProviderFromConfig(): KeywordResearchProvider | undefined {
  const provider = apiConfig.KEYWORD_VOLUME_PROVIDER;
  const apiUrl = apiConfig.KEYWORD_VOLUME_API_URL;
  const apiKey = apiConfig.KEYWORD_VOLUME_API_KEY;
  if (isDataForSeoKeywordResearchConfiguration(provider, apiUrl, apiKey) && apiUrl && apiKey) {
    return createDataForSeoKeywordResearchProvider({
      baseUrl: apiUrl,
      apiKey,
      locationCode: getLocationCode('US')
    });
  }
  if (provider === 'semrush' && apiConfig.SEMRUSH_API_URL && apiConfig.SEMRUSH_API_KEY) {
    return createSemrushKeywordResearchProvider({ baseUrl: apiConfig.SEMRUSH_API_URL, apiKey: apiConfig.SEMRUSH_API_KEY });
  }
  return undefined;
}
