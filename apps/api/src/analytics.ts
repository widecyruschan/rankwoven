import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth, type AuthService } from './auth';
import { readGoogleCredentials, requestGoogleAccessToken } from './googleAuth';
import type { SiteConnectionRepository } from './siteConnections';

export interface AnalyticsOverview {
  configured: boolean;
  source: 'google-analytics' | 'demo';
  propertyId?: string;
  siteId?: string;
  siteHost?: string;
  startDate: string;
  endDate: string;
  totals: {
    activeUsers: number;
    sessions: number;
    pageViews: number;
    conversions: number;
  };
  daily: Array<{
    date: string;
    activeUsers: number;
    sessions: number;
    pageViews: number;
  }>;
  channels: Array<{
    channel: string;
    sessions: number;
  }>;
  pages: Array<{
    path: string;
    pageViews: number;
    activeUsers: number;
  }>;
}

export interface AnalyticsService {
  getOverview(options?: AnalyticsOverviewOptions): Promise<AnalyticsOverview>;
}

interface AnalyticsOverviewOptions {
  siteId?: string;
  siteHost?: string;
  propertyId?: string;
  startDate?: string;
  endDate?: string;
}

interface GoogleAnalyticsRow {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
}

interface GoogleAnalyticsReport {
  rows?: GoogleAnalyticsRow[];
}

const googleAnalyticsScope = 'https://www.googleapis.com/auth/analytics.readonly';
const googleAnalyticsDataUrl = 'https://analyticsdata.googleapis.com/v1beta';
const analyticsOverviewQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

function getDefaultDateRange() {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 6);

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10)
  };
}

function readMetric(metrics: unknown[] | null | undefined, index: number) {
  const value = (metrics?.[index] as { value?: string } | undefined)?.value ?? '0';
  return Number.parseInt(value, 10) || 0;
}

function readDimension(dimensions: unknown[] | null | undefined, index: number) {
  return (dimensions?.[index] as { value?: string } | undefined)?.value ?? '';
}

function formatDate(value: string) {
  if (value.length !== 8) {
    return value;
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function createDemoOverview(propertyId?: string, options: AnalyticsOverviewOptions = {}): AnalyticsOverview {
  const defaultDateRange = getDefaultDateRange();
  const daily = [
    ['2026-07-20', 410, 520, 880],
    ['2026-07-21', 435, 548, 912],
    ['2026-07-22', 462, 594, 980],
    ['2026-07-23', 488, 621, 1044],
    ['2026-07-24', 510, 666, 1120],
    ['2026-07-25', 536, 690, 1188],
    ['2026-07-26', 552, 714, 1236]
  ].map(([date, activeUsers, sessions, pageViews]) => ({
    date: String(date),
    activeUsers: Number(activeUsers),
    sessions: Number(sessions),
    pageViews: Number(pageViews)
  }));

  return {
    configured: false,
    source: 'demo',
    propertyId,
    siteId: options.siteId,
    siteHost: options.siteHost,
    startDate: options.startDate ?? defaultDateRange.startDate,
    endDate: options.endDate ?? defaultDateRange.endDate,
    totals: {
      activeUsers: 3393,
      sessions: 4353,
      pageViews: 7360,
      conversions: 86
    },
    daily,
    channels: [
      { channel: 'Organic Search', sessions: 1850 },
      { channel: 'Direct', sessions: 960 },
      { channel: 'Referral', sessions: 620 },
      { channel: 'Organic Social', sessions: 480 },
      { channel: 'Email', sessions: 443 }
    ],
    pages: [
      { path: '/', pageViews: 1640, activeUsers: 920 },
      { path: '/pricing', pageViews: 780, activeUsers: 420 },
      { path: '/blog/wordpress-image-seo', pageViews: 650, activeUsers: 388 },
      { path: '/blog/internal-linking', pageViews: 548, activeUsers: 330 },
      { path: '/app/suggestions', pageViews: 412, activeUsers: 156 }
    ]
  };
}

function createHostNameFilter(siteHost?: string) {
  if (!siteHost) {
    return undefined;
  }

  return {
    filter: {
      fieldName: 'hostName',
      stringFilter: {
        matchType: 'EXACT',
        value: siteHost
      }
    }
  };
}



async function runGoogleAnalyticsReport(
  propertyId: string,
  accessToken: string,
  body: Record<string, unknown>
): Promise<GoogleAnalyticsReport> {
  const response = await fetch(`${googleAnalyticsDataUrl}/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error('Google Analytics report request failed');
  }

  return (await response.json()) as GoogleAnalyticsReport;
}

export function createGoogleAnalyticsService(): AnalyticsService {
  return {
    async getOverview(options = {}) {
      const defaultDateRange = getDefaultDateRange();
      const startDate = options.startDate ?? defaultDateRange.startDate;
      const endDate = options.endDate ?? defaultDateRange.endDate;
      const dimensionFilter = createHostNameFilter(options.siteHost);
      const propertyId = options.propertyId?.trim();

      if (!propertyId) {
        return createDemoOverview(propertyId, { ...options, startDate, endDate });
      }

      try {
        const credentials = await readGoogleCredentials();
        if (!credentials) {
          return createDemoOverview(propertyId, { ...options, startDate, endDate });
        }

        const accessToken = await requestGoogleAccessToken(credentials, googleAnalyticsScope);
        const [dailyReport, channelReport, pageReport] = await Promise.all([
          runGoogleAnalyticsReport(propertyId, accessToken, {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'date' }],
            metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
            ...(dimensionFilter ? { dimensionFilter } : {}),
            orderBys: [{ dimension: { dimensionName: 'date' } }]
          }),
          runGoogleAnalyticsReport(propertyId, accessToken, {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'sessionDefaultChannelGroup' }],
            metrics: [{ name: 'sessions' }],
            ...(dimensionFilter ? { dimensionFilter } : {}),
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
          }),
          runGoogleAnalyticsReport(propertyId, accessToken, {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'pagePath' }],
            metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
            ...(dimensionFilter ? { dimensionFilter } : {}),
            orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
            limit: 8
          })
        ]);

        const daily = (dailyReport.rows ?? []).map((row) => ({
          date: formatDate(readDimension(row.dimensionValues, 0)),
          activeUsers: readMetric(row.metricValues, 0),
          sessions: readMetric(row.metricValues, 1),
          pageViews: readMetric(row.metricValues, 2)
        }));
        const channels = (channelReport.rows ?? []).map((row) => ({
          channel: readDimension(row.dimensionValues, 0) || 'Unknown',
          sessions: readMetric(row.metricValues, 0)
        }));
        const pages = (pageReport.rows ?? []).map((row) => ({
          path: readDimension(row.dimensionValues, 0) || '/',
          pageViews: readMetric(row.metricValues, 0),
          activeUsers: readMetric(row.metricValues, 1)
        }));
        const totals = daily.reduce(
          (accumulator, item) => ({
            activeUsers: accumulator.activeUsers + item.activeUsers,
            sessions: accumulator.sessions + item.sessions,
            pageViews: accumulator.pageViews + item.pageViews,
            conversions: accumulator.conversions
          }),
          { activeUsers: 0, sessions: 0, pageViews: 0, conversions: 0 }
        );

        return {
          configured: true,
          source: 'google-analytics',
          propertyId,
          siteId: options.siteId,
          siteHost: options.siteHost,
          startDate,
          endDate,
          totals,
          daily,
          channels,
          pages
        };
      } catch {
        return createDemoOverview(propertyId, { ...options, startDate, endDate });
      }
    }
  };
}

export function registerAnalyticsRoutes(
  app: FastifyInstance,
  authService: AuthService,
  siteRepository: SiteConnectionRepository,
  analyticsService = createGoogleAnalyticsService()
) {
  app.get('/api/v1/analytics/overview', async (request, reply: FastifyReply) => {
    const user = await requireAuth(authService, request, reply);
    if (!user) {
      return reply;
    }

    const parsedQuery = analyticsOverviewQuerySchema.safeParse(request.query);
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

    let siteHost: string | undefined;
    let propertyId: string | undefined;
    if (parsedQuery.data.siteId) {
      const site = await siteRepository.findForWorkspace(parsedQuery.data.siteId, user.workspaceId);
      if (!site) {
        return reply.status(404).send({
          success: false,
          message: '找不到站點連接',
          error: { code: 'SITE_NOT_FOUND' }
        });
      }

      siteHost = new URL(site.siteUrl).hostname;
      propertyId = site.googleAnalyticsPropertyId;
    }

    return {
      success: true,
      message: '操作成功',
      data: await analyticsService.getOverview({
        siteId: parsedQuery.data.siteId,
        siteHost,
        propertyId,
        startDate: parsedQuery.data.startDate,
        endDate: parsedQuery.data.endDate
      })
    };
  });
}
