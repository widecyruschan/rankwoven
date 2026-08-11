import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth, type AuthService } from './auth';
import { type GoogleServiceAccountCredentials, readGoogleCredentials, requestGoogleAccessToken } from './googleAuth';
import type { SiteConnectionRepository } from './siteConnections';
import type { KeywordGscData } from './keywordSuggestions';

const searchConsoleScope = 'https://www.googleapis.com/auth/webmasters.readonly';
const searchConsoleWriteScope = 'https://www.googleapis.com/auth/webmasters';
const searchConsoleBaseUrl = 'https://searchconsole.googleapis.com/webmasters/v3';

// ── In-memory GSC keyword cache ──────────────────────────────────
// keyed by normalized lowercase keyword, maps to GSC performance data
const gscKeywordCache = new Map<string, KeywordGscData>();

export function getGscKeywordMap(): Map<string, KeywordGscData> {
  return gscKeywordCache;
}

export interface SearchConsoleKeyword {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleKeywordsResult {
  configured: boolean;
  source: 'search-console' | 'demo' | 'unavailable';
  siteUrl?: string;
  keywords: SearchConsoleKeyword[];
  totals: {
    totalClicks: number;
    totalImpressions: number;
    averageCtr: number;
    averagePosition: number;
  };
}

export interface SearchConsoleSitemapSubmissionResult {
  configured: boolean;
  source: 'search-console';
  siteUrl: string;
  sitemapUrl: string;
  submittedAt: string;
}

function computeTotals(keywords: SearchConsoleKeyword[]) {
  if (!keywords.length) {
    return { totalClicks: 0, totalImpressions: 0, averageCtr: 0, averagePosition: 0 };
  }

  const totalClicks = keywords.reduce((sum, kw) => sum + kw.clicks, 0);
  const totalImpressions = keywords.reduce((sum, kw) => sum + kw.impressions, 0);
  const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const averagePosition = keywords.reduce((sum, kw) => sum + kw.position, 0) / keywords.length;

  return { totalClicks, totalImpressions, averageCtr, averagePosition };
}

async function fetchSearchConsoleKeywords(
  siteUrl: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<SearchConsoleKeyword[]> {
  const keywords: SearchConsoleKeyword[] = [];
  let startRow = 0;
  const rowLimit = 250;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${searchConsoleBaseUrl}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit,
        startRow,
        aggregationType: 'auto'
      })
    });

    if (!response.ok) {
      throw new Error(`Search Console API returned ${response.status}`);
    }

    const body = (await response.json()) as { rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };
    const rows = body.rows ?? [];

    for (const row of rows) {
      keywords.push({
        query: row.keys[0] ?? '',
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position
      });
    }

    startRow += rowLimit;
    hasMore = rows.length >= rowLimit;
  }

  return keywords;
}

function getDefaultDateRange(daysBack = 28) {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - daysBack + 1);

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10)
  };
}

const searchConsoleQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
  siteUrl: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getSearchConsolePropertyCandidates(siteUrl: string): string[] {
  const candidates = [siteUrl];
  if (!siteUrl.startsWith('sc-domain:')) {
    const domain = extractDomain(siteUrl);
    if (domain !== '') {
      candidates.push(`sc-domain:${domain}`);
    }
  }

  return candidates;
}

function buildSitemapUrl(siteUrl: string, sitemapPath: string): string {
  const normalizedPath = sitemapPath.trim().replace(/^\/+/, '');
  const baseUrl = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
  return new URL(normalizedPath !== '' ? normalizedPath : 'sitemap.xml', baseUrl).toString();
}

export function createSearchConsoleService() {
  return {
    async getKeywords(
      siteUrl: string,
      credentials: GoogleServiceAccountCredentials,
      startDate?: string,
      endDate?: string
    ): Promise<SearchConsoleKeywordsResult> {
      const defaultDateRange = getDefaultDateRange(28);
      const sd = startDate ?? defaultDateRange.startDate;
      const ed = endDate ?? defaultDateRange.endDate;

      try {
        const accessToken = await requestGoogleAccessToken(credentials, searchConsoleScope);
        const candidates = getSearchConsolePropertyCandidates(siteUrl);

        for (const candidate of candidates) {
          try {
            const keywords = await fetchSearchConsoleKeywords(candidate, accessToken, sd, ed);

            // Populate the GSC keyword cache for cross-module access
            for (const kw of keywords) {
              const key = kw.query.toLowerCase().trim();
              if (key && !gscKeywordCache.has(key)) {
                gscKeywordCache.set(key, {
                  clicks: kw.clicks,
                  impressions: kw.impressions,
                  ctr: kw.ctr,
                  position: kw.position
                });
              }
            }

            return {
              configured: true,
              source: 'search-console',
              siteUrl: candidate,
              keywords,
              totals: computeTotals(keywords)
            };
          } catch {
            continue;
          }
        }

        return {
          configured: false,
          source: 'unavailable',
          siteUrl,
          keywords: [],
          totals: { totalClicks: 0, totalImpressions: 0, averageCtr: 0, averagePosition: 0 }
        };
      } catch {
        return {
          configured: false,
          source: 'unavailable',
          siteUrl,
          keywords: [],
          totals: { totalClicks: 0, totalImpressions: 0, averageCtr: 0, averagePosition: 0 }
        };
      }
    },

    async submitSitemap(
      siteUrl: string,
      credentials: GoogleServiceAccountCredentials,
      sitemapPath = 'sitemap.xml'
    ): Promise<SearchConsoleSitemapSubmissionResult> {
      const accessToken = await requestGoogleAccessToken(credentials, searchConsoleWriteScope);
      const sitemapUrl = buildSitemapUrl(siteUrl, sitemapPath);
      const candidates = getSearchConsolePropertyCandidates(siteUrl);
      let lastErrorMessage = '';

      for (const candidate of candidates) {
        const response = await fetch(
          `${searchConsoleBaseUrl}/sites/${encodeURIComponent(candidate)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json'
            }
          }
        );

        if (response.ok) {
          return {
            configured: true,
            source: 'search-console',
            siteUrl: candidate,
            sitemapUrl,
            submittedAt: new Date().toISOString()
          };
        }

        const errorText = (await response.text().catch(() => '')).trim();
        lastErrorMessage = errorText !== ''
          ? `Search Console API returned ${response.status}: ${errorText}`
          : `Search Console API returned ${response.status}`;
      }

      throw new Error(lastErrorMessage || 'Search Console sitemap submission failed');
    }
  };
}

export function registerSearchConsoleRoutes(
  app: FastifyInstance,
  authService: AuthService,
  siteRepository: SiteConnectionRepository,
  searchConsoleService = createSearchConsoleService()
) {
  app.get('/api/v1/search-console/keywords', async (request, reply: FastifyReply) => {
    const user = await requireAuth(authService, request, reply);
    if (!user) {
      return reply;
    }

    const parsedQuery = searchConsoleQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({
        success: false,
        message: '請求資料格式不正確',
        error: {
          code: 'VALIDATION_ERROR',
          details: parsedQuery.error.issues
        }
      });
    }

    let siteUrl: string | undefined;

    if (parsedQuery.data.siteId) {
      const site = await siteRepository.findForWorkspace(parsedQuery.data.siteId, user.workspaceId);
      if (!site) {
        return reply.status(404).send({
          success: false,
          message: '找不到站點連接',
          error: { code: 'SITE_NOT_FOUND' }
        });
      }

      siteUrl = site.siteUrl;
    } else if (parsedQuery.data.siteUrl) {
      siteUrl = parsedQuery.data.siteUrl;
    } else {
      return reply.status(400).send({
        success: false,
        message: '請提供 siteId 或 siteUrl',
        error: { code: 'VALIDATION_ERROR' }
      });
    }

    const credentials = await readGoogleCredentials();
    if (!credentials) {
      return {
        success: true,
        message: '未配置 Google 憑證',
        data: {
          configured: false,
          source: 'unavailable',
          siteUrl,
          keywords: [],
          totals: { totalClicks: 0, totalImpressions: 0, averageCtr: 0, averagePosition: 0 }
        } satisfies SearchConsoleKeywordsResult
      };
    }

    return {
      success: true,
      message: '操作成功',
      data: await searchConsoleService.getKeywords(
        siteUrl,
        credentials,
        parsedQuery.data.startDate,
        parsedQuery.data.endDate
      )
    };
  });
}
