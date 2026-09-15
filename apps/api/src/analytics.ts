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
  hostFilterHosts?: string[];
  availableHosts?: Array<{
    host: string;
    sessions: number;
  }>;
  hostFilterWarning?: string;
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

export function formatAnalyticsCalendarDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultDateRange() {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);

  return {
    startDate: formatAnalyticsCalendarDate(startDate),
    endDate: formatAnalyticsCalendarDate(endDate)
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
  // Never return a fixed sample period for a user-selected date range. A static
  // July sample made August/September selections look like the wrong month.
  const daily: AnalyticsOverview['daily'] = [];

  return {
    configured: false,
    source: 'demo',
    propertyId,
    siteId: options.siteId,
    siteHost: options.siteHost,
    hostFilterHosts: options.siteHost ? resolveHostNameCandidates(options.siteHost) : undefined,
    startDate: options.startDate ?? defaultDateRange.startDate,
    endDate: options.endDate ?? defaultDateRange.endDate,
    totals: {
      activeUsers: 0,
      sessions: 0,
      pageViews: 0,
      conversions: 0
    },
    daily,
    channels: [],
    pages: []
  };
}

/** Normalize apex / www so site-host tracking diagnostics stay consistent. */
export function resolveHostNameCandidates(siteHost?: string): string[] {
  const normalized = String(siteHost || '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');

  if (!normalized) {
    return [];
  }

  const withoutWww = normalized.startsWith('www.') ? normalized.slice(4) : normalized;
  const withWww = `www.${withoutWww}`;
  return [...new Set([normalized, withoutWww, withWww].filter(Boolean))];
}

export function createHostNameFilter(siteHost?: string) {
  const hosts = resolveHostNameCandidates(siteHost);
  if (hosts.length === 0) {
    return undefined;
  }

  if (hosts.length === 1) {
    return {
      filter: {
        fieldName: 'hostName',
        stringFilter: {
          matchType: 'EXACT' as const,
          value: hosts[0]
        }
      }
    };
  }

  return {
    orGroup: {
      expressions: hosts.map((host) => ({
        filter: {
          fieldName: 'hostName',
          stringFilter: {
            matchType: 'EXACT' as const,
            value: host
          }
        }
      }))
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
      const hostFilterHosts = resolveHostNameCandidates(options.siteHost);
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

        // Always read Property-level data so the same Property ID returns the same
        // charts for plugin and manual sites. Host isolation previously made plugin
        // sites look empty when only other hosts in the Property still had events.
        const [dailyReport, channelReport, pageReport, hostReport] = await Promise.all([
          runGoogleAnalyticsReport(propertyId, accessToken, {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'date' }],
            metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
            orderBys: [{ dimension: { dimensionName: 'date' } }]
          }),
          runGoogleAnalyticsReport(propertyId, accessToken, {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'sessionDefaultChannelGroup' }],
            metrics: [{ name: 'sessions' }],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
          }),
          runGoogleAnalyticsReport(propertyId, accessToken, {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'pagePath' }],
            metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
            orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
            limit: 8
          }),
          hostFilterHosts.length > 0
            ? runGoogleAnalyticsReport(propertyId, accessToken, {
                dateRanges: [{ startDate, endDate }],
                dimensions: [{ name: 'hostName' }],
                metrics: [{ name: 'sessions' }],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: 20
              })
            : Promise.resolve({ rows: [] } as GoogleAnalyticsReport)
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

        let availableHosts: AnalyticsOverview['availableHosts'];
        let hostFilterWarning: string | undefined;

        if (hostFilterHosts.length > 0) {
          availableHosts = (hostReport.rows ?? [])
            .map((row) => ({
              host: readDimension(row.dimensionValues, 0),
              sessions: readMetric(row.metricValues, 0)
            }))
            .filter((row) => row.host);

          const hostCandidateSet = new Set(hostFilterHosts);
          const siteHostSessions = availableHosts
            .filter((row) => hostCandidateSet.has(row.host.toLowerCase()))
            .reduce((sum, row) => sum + row.sessions, 0);

          if (totals.sessions > 0 && siteHostSessions === 0) {
            const hostList = availableHosts
              .slice(0, 5)
              .map((row) => `${row.host} (${row.sessions})`)
              .join(', ');
            hostFilterWarning =
              `下方數字是整份 GA4 Property 的流量。此站點 host（${hostFilterHosts.join(' / ')}）` +
              `在選定期間沒有事件；Property 內有流量的 hosts：${hostList || '無'}。` +
              `請在網站前台確認 Measurement ID 已正確送出 page_view。`;
          }
        }

        return {
          configured: true,
          source: 'google-analytics' as const,
          propertyId,
          siteId: options.siteId,
          siteHost: options.siteHost,
          hostFilterHosts: hostFilterHosts.length > 0 ? hostFilterHosts : undefined,
          availableHosts,
          hostFilterWarning,
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

      siteHost = new URL(site.siteUrl).hostname.toLowerCase();
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
