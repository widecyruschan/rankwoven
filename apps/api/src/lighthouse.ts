import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth, type AuthService } from './auth';
import type { SiteConnectionRepository } from './siteConnections';

const execFileAsync = promisify(execFile);

export interface LighthouseAuditResult {
  url: string;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  metrics: {
    firstContentfulPaint: { value: number; score: number };
    largestContentfulPaint: { value: number; score: number };
    totalBlockingTime: { value: number; score: number };
    cumulativeLayoutShift: { value: number; score: number };
    speedIndex: { value: number; score: number };
    interactive: { value: number; score: number };
  };
  diagnostics: Array<{
    title: string;
    description: string;
    score: number | null;
  }>;
  timestamp: string;
}

interface LighthouseJsonResult {
  categories?: Record<string, { id: string; title: string; score: number }>;
  audits?: Record<string, {
    id: string;
    title: string;
    description: string;
    score: number | null;
    numericValue?: number;
    displayValue?: string;
  }>;
  fetchTime?: string;
  configSettings?: { formFactor?: string };
}

const lighthouseQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
  url: z.string().url().optional(),
  strategy: z.enum(['mobile', 'desktop']).default('mobile')
});

function getMetricValue(
  audits: Record<string, { score: number | null; numericValue?: number }>,
  key: string
) {
  const audit = audits[key];
  return {
    value: audit?.numericValue ?? 0,
    score: audit?.score ?? 0
  };
}

function getDiagnostics(audits: Record<string, {
  title: string;
  description: string;
  score: number | null;
}>) {
  const diagnostics: Array<{ title: string; description: string; score: number | null }> = [];
  const diagnosticKeys = [
    'server-response-time',
    'render-blocking-resources',
    'unminified-css',
    'unminified-javascript',
    'unused-css-rules',
    'unused-javascript',
    'uses-optimized-images',
    'uses-responsive-images',
    'dom-size',
    'total-byte-weight',
    'offscreen-images',
    'uses-text-compression',
    'uses-long-cache-ttl',
    'mainthread-work-breakdown',
    'bootup-time',
    'font-display'
  ];

  for (const key of diagnosticKeys) {
    const audit = audits[key];
    if (audit && audit.score !== null && audit.score < 0.9) {
      diagnostics.push({
        title: audit.title,
        description: audit.description,
        score: audit.score
      });
    }
  }

  return diagnostics;
}

function parseLocalLighthouseResult(raw: string, url: string): LighthouseAuditResult {
  const data = JSON.parse(raw) as LighthouseJsonResult;
  const categories = data.categories ?? {};
  const audits = data.audits ?? {};

  return {
    url,
    scores: {
      performance: Math.round((categories.performance?.score ?? 0) * 100),
      accessibility: Math.round((categories.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score ?? 0) * 100),
      seo: Math.round((categories.seo?.score ?? 0) * 100)
    },
    metrics: {
      firstContentfulPaint: getMetricValue(audits, 'first-contentful-paint'),
      largestContentfulPaint: getMetricValue(audits, 'largest-contentful-paint'),
      totalBlockingTime: getMetricValue(audits, 'total-blocking-time'),
      cumulativeLayoutShift: getMetricValue(audits, 'cumulative-layout-shift'),
      speedIndex: getMetricValue(audits, 'speed-index'),
      interactive: getMetricValue(audits, 'interactive')
    },
    diagnostics: getDiagnostics(audits),
    timestamp: data.fetchTime ?? new Date().toISOString()
  };
}

interface PageSpeedInsightsResponse {
  lighthouseResult?: {
    categories?: Record<string, { score: number }>;
    audits?: Record<string, {
      title: string;
      description: string;
      score: number | null;
      numericValue?: number;
    }>;
    fetchTime?: string;
  };
  error?: { message: string };
}

async function auditViaPageSpeedApi(url: string, strategy: 'mobile' | 'desktop'): Promise<LighthouseAuditResult> {
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PageSpeed Insights API returned ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as PageSpeedInsightsResponse;

  if (!data.lighthouseResult) {
    throw new Error(data.error?.message ?? 'No Lighthouse result returned');
  }

  const { categories, audits, fetchTime } = data.lighthouseResult;
  const auditMap = audits ?? {};

  return {
    url,
    scores: {
      performance: Math.round((categories?.performance?.score ?? 0) * 100),
      accessibility: Math.round((categories?.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((categories?.['best-practices']?.score ?? 0) * 100),
      seo: Math.round((categories?.seo?.score ?? 0) * 100)
    },
    metrics: {
      firstContentfulPaint: getMetricValue(auditMap, 'first-contentful-paint'),
      largestContentfulPaint: getMetricValue(auditMap, 'largest-contentful-paint'),
      totalBlockingTime: getMetricValue(auditMap, 'total-blocking-time'),
      cumulativeLayoutShift: getMetricValue(auditMap, 'cumulative-layout-shift'),
      speedIndex: getMetricValue(auditMap, 'speed-index'),
      interactive: getMetricValue(auditMap, 'interactive')
    },
    diagnostics: getDiagnostics(auditMap),
    timestamp: fetchTime ?? new Date().toISOString()
  };
}

async function auditViaLocalLighthouse(url: string, strategy: 'mobile' | 'desktop'): Promise<LighthouseAuditResult> {
  const args = [
    'lighthouse',
    url,
    '--output=json',
    '--chrome-flags=--headless --no-sandbox --disable-gpu --disable-dev-shm-usage',
    '--only-categories=performance,accessibility,best-practices,seo',
    '--quiet',
    '--max-wait-for-load=30000'
  ];

  if (strategy === 'desktop') {
    args.push('--preset=desktop');
  } else {
    args.push('--screenEmulation.mobile');
  }

  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    NODE_ENV: (process.env.NODE_ENV as string) ?? 'production'
  };

  // Ensure Chrome path is set for lighthouse's chrome-launcher
  if (!env.CHROME_PATH) {
    env.CHROME_PATH = process.platform === 'linux'
      ? '/usr/bin/chromium-browser'
      : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }
  if (!env.LIGHTHOUSE_CHROMIUM_PATH) {
    env.LIGHTHOUSE_CHROMIUM_PATH = env.CHROME_PATH;
  }

  const { stdout, stderr } = await execFileAsync('npx', args, {
    maxBuffer: 50 * 1024 * 1024,
    timeout: 180_000,
    env
  });

  if (!stdout) {
    throw new Error(`Lighthouse CLI returned no output: ${stderr?.slice(0, 200) ?? ''}`);
  }

  return parseLocalLighthouseResult(stdout, url);
}

export function createLighthouseService() {
  const throttleQueue: Array<{
    url: string;
    strategy: 'mobile' | 'desktop';
    resolve: (value: LighthouseAuditResult) => void;
    reject: (error: Error) => void;
  }> = [];
  let lastCallTime = 0;
  const minIntervalMs = 5000;
  let isProcessing = false;

  function processQueue() {
    if (isProcessing || !throttleQueue.length) {
      return;
    }

    const now = Date.now();
    const timeSinceLast = now - lastCallTime;

    if (timeSinceLast < minIntervalMs) {
      setTimeout(processQueue, minIntervalMs - timeSinceLast);
      return;
    }

    const item = throttleQueue.shift()!;
    isProcessing = true;
    lastCallTime = Date.now();

    doAuditUrl(item.url, item.strategy)
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => {
        isProcessing = false;
        setTimeout(processQueue, minIntervalMs);
      });
  }

  async function doAuditUrl(url: string, strategy: 'mobile' | 'desktop'): Promise<LighthouseAuditResult> {
    // Try PageSpeed Insights API first (fast, no local Chrome needed)
    try {
      return await auditViaPageSpeedApi(url, strategy);
    } catch (apiError) {
      // Fall back to local Lighthouse CLI
      try {
        return await auditViaLocalLighthouse(url, strategy);
      } catch (localError) {
        throw new Error(
          `Lighthouse audit failed for ${url}. ` +
          `API: ${apiError instanceof Error ? apiError.message : 'unknown'}. ` +
          `Local: ${localError instanceof Error ? localError.message : 'unknown'}`,
          { cause: localError }
        );
      }
    }
  }

  return {
    async auditUrl(url: string, strategy: 'mobile' | 'desktop' = 'mobile'): Promise<LighthouseAuditResult> {
      return new Promise<LighthouseAuditResult>((resolve, reject) => {
        throttleQueue.push({ url, strategy, resolve, reject });
        processQueue();
      });
    }
  };
}

export function registerLighthouseRoutes(
  app: FastifyInstance,
  authService: AuthService,
  siteRepository: SiteConnectionRepository,
  lighthouseService = createLighthouseService()
) {
  app.get('/api/v1/lighthouse/audit', async (request, reply: FastifyReply) => {
    const user = await requireAuth(authService, request, reply);
    if (!user) {
      return reply;
    }

    const parsedQuery = lighthouseQuerySchema.safeParse(request.query);
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

    let url: string | undefined;

    if (parsedQuery.data.siteId) {
      const site = await siteRepository.findForWorkspace(parsedQuery.data.siteId, user.workspaceId);
      if (!site) {
        return reply.status(404).send({
          success: false,
          message: '找不到站點連接',
          error: { code: 'SITE_NOT_FOUND' }
        });
      }

      url = site.siteUrl;
    } else if (parsedQuery.data.url) {
      url = parsedQuery.data.url;
    }

    if (!url) {
      return reply.status(400).send({
        success: false,
        message: '請提供 siteId 或 url',
        error: { code: 'VALIDATION_ERROR' }
      });
    }

    try {
      // Wrap audit in a timeout so the connection never hangs indefinitely.
      // Slightly longer than the frontend timeout (90s) so the frontend receives
      // an error response instead of a network-level abort.
      const AUDIT_TIMEOUT_MS = 95_000;
      const result = await Promise.race([
        lighthouseService.auditUrl(url, parsedQuery.data.strategy),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Lighthouse 審計超時（超過 95 秒），請稍後重試')), AUDIT_TIMEOUT_MS)
        )
      ]);
      return {
        success: true,
        message: '操作成功',
        data: result
      };
    } catch (error) {
      return reply.status(502).send({
        success: false,
        message: 'Lighthouse 審計失敗',
        error: {
          code: 'LIGHTHOUSE_ERROR',
          details: error instanceof Error ? error.message : '未知錯誤'
        }
      });
    }
  });
}
