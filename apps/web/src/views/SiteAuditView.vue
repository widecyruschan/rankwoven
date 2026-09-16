<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  message,
  Modal,
  Card,
  Button,
  Spin,
  RadioGroup,
  RadioButton,
  Switch,
  InputNumber,
  Input,
  Alert,
  Progress,
  Tag,
  Table,
  Empty,
  Descriptions,
  DescriptionsItem,
  Badge,
  Statistic,
  Row,
  Col
} from 'ant-design-vue';
import { h } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  getSiteConnections,
  getSiteAuditConfig,
  updateSiteAuditConfig,
  runSiteAuditMonitoring,
  runManualSiteAudit,
  getSiteAuditResults,
  getSiteAuditMonitoringRun,
  getAdminSerpapiUsage,
  getSyncedArticles,
  createSeoAudit,
  getSeoAudits,
  getAhrefsSiteAuditConfig,
  getAhrefsSiteAuditIssuePages,
  getOptimizationSuggestions,
  batchApproveOptimizationSuggestions,
  batchApplyOptimizationSuggestions
} from '../api/siteConnections';
import type {
  SiteConnection,
  SiteAuditConfig,
  SiteAuditResult,
  SiteAuditResultWithIssues,
  SiteAuditIssue,
  SiteAuditSchedule,
  SiteAuditCrawlSource,
  SiteAuditMetric,
  SerpapiUsageStats,
  SyncedArticle,
  AhrefsSiteAuditConfig,
  AhrefsSiteAuditIssuePages,
  SeoAudit,
  SeoAuditIssue
} from '../api/siteConnections';

const { t } = useI18n();
const route = useRoute();

// ── state ──
const sites = ref<SiteConnection[]>([]);
const selectedSiteId = ref<string>('');
const loadingConfig = ref(false);
const loadingResults = ref(false);
const runningAudit = ref(false);
const runningManualAudit = ref(false);
const savingConfig = ref(false);
const configModalOpen = ref(false);
const oneClickFixing = ref(false);

const config = ref<SiteAuditConfig | null>(null);
const results = ref<SiteAuditResult[]>([]);
const latestResult = ref<SiteAuditResultWithIssues | null>(null);
const latestMetrics = ref<SiteAuditMetric[]>([]);
const quotaStats = ref<SerpapiUsageStats | null>(null);
const syncedContent = ref<SyncedArticle[]>([]);
const manualTargetUrl = ref('');
const manualContentCmsId = ref<string>();
const ahrefsConfig = ref<AhrefsSiteAuditConfig | null>(null);
const ahrefsPlatformAvailable = ref(false);
const ahrefsProviderErrorCode = ref('');
const latestAhrefsAudit = ref<SeoAudit | null>(null);
const latestAhrefsIssues = ref<SeoAuditIssue[]>([]);
const ahrefsIssuePages = ref<Record<string, AhrefsSiteAuditIssuePages>>({});
const loadingAhrefsIssueId = ref<string>();

// ── form model ──
const formSchedule = ref<SiteAuditSchedule>('disabled');
const formPageLimit = ref<number>(100);
const formCrawlSource = ref<SiteAuditCrawlSource>('website');
const formEmailNotification = ref<boolean>(false);

// ── computed ──
const hasSite = computed(() => !!selectedSiteId.value);
const selectedSite = computed(() => sites.value.find((site) => site.id === selectedSiteId.value));
const manualContentOptions = computed(() =>
  syncedContent.value
    .filter((article) => (article.type === 'post' || article.type === 'product') && article.status === 'publish' && article.url)
    .map((article) => ({
      value: article.cmsId,
      label: `[${article.type === 'product' ? tc('manualContentProduct') : tc('manualContentArticle')}] ${article.title}`
    }))
);

const scoreColor = computed(() => {
  const s = latestResult.value?.overallScore ?? 0;
  if (s >= 80) return '#52c41a';
  if (s >= 60) return '#faad14';
  return '#ff4d4f';
});

const statusColor = computed(() => {
  const s = latestResult.value?.status;
  if (s === 'completed') return 'success';
  if (s === 'partial') return 'warning';
  if (s === 'running' || s === 'queued') return 'processing';
  if (s === 'failed') return 'error';
  return 'default';
});

const severityColorMap: Record<string, string> = {
  critical: '#ff4d4f',
  high: '#fa8c16',
  medium: '#faad14',
  low: '#52c41a'
};

const canUseAhrefsFullSite = computed(() =>
  ahrefsPlatformAvailable.value
  || Boolean(ahrefsConfig.value?.enabled && ahrefsConfig.value?.projectId?.trim())
  || Boolean(ahrefsConfig.value?.projectId?.trim())
);

const hasAhrefsAuthError = computed(() => ahrefsProviderErrorCode.value === 'AHREFS_SITE_AUDIT_HTTP_401');

const ahrefsIssueDistribution = computed(() => {
  const counts = { error: 0, warning: 0, notice: 0, total: latestAhrefsIssues.value.length };
  for (const issue of latestAhrefsIssues.value) {
    const providerSeverity = issue.metadata?.providerSeverity;
    if (providerSeverity === 'error') counts.error += 1;
    else if (providerSeverity === 'warning') counts.warning += 1;
    else counts.notice += 1;
  }
  return counts;
});

const ahrefsIssueColumns = computed(() => [
  { title: tc('category'), dataIndex: 'category', key: 'category', width: 150 },
  { title: tc('severity'), dataIndex: 'severity', key: 'severity', width: 100 },
  { title: tc('issueTitle'), dataIndex: 'message', key: 'message', ellipsis: true },
  { title: tc('affected'), dataIndex: 'affectedPages', key: 'affectedPages', width: 110 },
  { title: tc('change'), dataIndex: 'change', key: 'change', width: 100 },
  { title: tc('issueRecommendation'), dataIndex: 'suggestedValue', key: 'suggestedValue', ellipsis: true, width: 280 }
]);

const issueColumns = computed(() => [
  {
    title: tc('category'),
    dataIndex: 'category',
    key: 'category',
    width: 160
  },
  {
    title: tc('severity'),
    dataIndex: 'severity',
    key: 'severity',
    width: 100
  },
  {
    title: tc('issueTitle'),
    dataIndex: 'title',
    key: 'title',
    ellipsis: true
  },
  {
    title: tc('affectedUrls'),
    key: 'affectedUrls',
    ellipsis: true,
    width: 200
  },
  {
    title: tc('issueRecommendation'),
    dataIndex: 'recommendation',
    key: 'recommendation',
    ellipsis: true,
    width: 260
  },
  {
    title: tc('affected'),
    dataIndex: 'affectedCount',
    key: 'affectedCount',
    width: 100
  }
]);

const historyColumns = computed(() => [
  {
    title: tc('date'),
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180
  },
  {
    title: tc('status'),
    dataIndex: 'status',
    key: 'status',
    width: 110
  },
  {
    title: tc('score'),
    dataIndex: 'overallScore',
    key: 'overallScore',
    width: 80
  },
  {
    title: tc('pages'),
    dataIndex: 'pagesCrawled',
    key: 'pagesCrawled',
    width: 80
  },
  {
    title: tc('issues'),
    key: 'issues',
    width: 80
  }
]);

// ── methods ──
async function loadConfig() {
  if (!selectedSiteId.value) return;
  ahrefsIssuePages.value = {};
  loadingConfig.value = true;
  try {
    const res = await getSiteAuditConfig(selectedSiteId.value);
    config.value = res.config;
    formSchedule.value = res.config.schedule;
    formPageLimit.value = res.config.pageLimit;
    formCrawlSource.value = res.config.crawlSource;
    formEmailNotification.value = res.config.emailNotification;
  } catch {
    config.value = null;
  }

  try {
    const result = await getAhrefsSiteAuditConfig(selectedSiteId.value);
    ahrefsConfig.value = result.config;
    ahrefsPlatformAvailable.value = Boolean(result.platformAvailable);
    ahrefsProviderErrorCode.value = result.providerErrorCode ?? '';
  } catch {
    ahrefsConfig.value = null;
    ahrefsPlatformAvailable.value = false;
    ahrefsProviderErrorCode.value = '';
  } finally {
    loadingConfig.value = false;
  }
}

async function loadResults() {
  if (!selectedSiteId.value) return;
  loadingResults.value = true;
  try {
    const res = await getSiteAuditResults(selectedSiteId.value);
    results.value = res.results;
    latestResult.value = res.latest;
    latestMetrics.value = [];
    if (res.latest) {
      try {
        const bundle = await getSiteAuditMonitoringRun(res.latest.id);
        latestMetrics.value = bundle.metrics;
      } catch {
        // Legacy audit runs may not have PH2-10 metrics.
      }
    }
  } catch {
    results.value = [];
    latestResult.value = null;
    latestMetrics.value = [];
  }

  try {
    const result = await getSeoAudits(selectedSiteId.value);
    const audit = result.audits[0];
    latestAhrefsAudit.value = audit?.metadata?.ahrefs ? audit : null;
    latestAhrefsIssues.value = latestAhrefsAudit.value
      ? result.issues.filter((issue) => issue.source === 'ahrefs')
      : [];
  } catch {
    latestAhrefsAudit.value = null;
    latestAhrefsIssues.value = [];
  } finally {
    loadingResults.value = false;
  }
}

async function loadSyncedContent() {
  if (!selectedSiteId.value) return;
  try {
    const result = await getSyncedArticles(selectedSiteId.value, { page: 1, pageSize: 100, status: 'publish' });
    syncedContent.value = result.articles;
  } catch {
    syncedContent.value = [];
  }
}

function openConfigModal() {
  if (config.value) {
    formSchedule.value = config.value.schedule;
    formPageLimit.value = config.value.pageLimit;
    formCrawlSource.value = config.value.crawlSource;
    formEmailNotification.value = config.value.emailNotification;
  }
  configModalOpen.value = true;
}

async function saveConfig() {
  if (!selectedSiteId.value) return;
  savingConfig.value = true;
  try {
    const res = await updateSiteAuditConfig(selectedSiteId.value, {
      schedule: formSchedule.value,
      pageLimit: formPageLimit.value,
      crawlSource: formCrawlSource.value,
      emailNotification: formEmailNotification.value
    });
    config.value = res.config;
    configModalOpen.value = false;
    message.success(tc('configSaved'));
  } catch {
    message.error(tc('errorSaveConfig'));
  } finally {
    savingConfig.value = false;
  }
}

function handleRunAudit() {
  if (!selectedSiteId.value) return;
  const useAhrefsFullSite = canUseAhrefsFullSite.value;
  Modal.confirm({
    title: tc('confirmationTitle'),
    content: useAhrefsFullSite ? tc('ahrefsConfirmationContent') : tc('confirmationContent'),
    okText: tc('confirm'),
    cancelText: tc('cancel'),
    onOk: async () => {
      runningAudit.value = true;
      try {
        if (useAhrefsFullSite) {
          const result = await createSeoAudit(selectedSiteId.value);
          if (result.audit.metadata?.ahrefs) {
            latestResult.value = null;
            results.value = [];
            latestMetrics.value = [];
            latestAhrefsAudit.value = result.audit;
            latestAhrefsIssues.value = result.issues.filter((issue) => issue.source === 'ahrefs');
            ahrefsIssuePages.value = {};
            const refreshed = await getAhrefsSiteAuditConfig(selectedSiteId.value);
            ahrefsConfig.value = refreshed.config;
            ahrefsPlatformAvailable.value = Boolean(refreshed.platformAvailable);
            ahrefsProviderErrorCode.value = refreshed.providerErrorCode ?? '';
            message.success(tc('status_completed'));
            return;
          }
          ahrefsProviderErrorCode.value = typeof result.audit.metadata?.ahrefsErrorCode === 'string'
            ? result.audit.metadata.ahrefsErrorCode
            : '';
          message.error(ahrefsProviderErrorCode.value === 'AHREFS_SITE_AUDIT_HTTP_401' ? tc('ahrefsAuthFailed') : tc('ahrefsUnavailable'));
        }

        latestAhrefsAudit.value = null;
        latestAhrefsIssues.value = [];
        ahrefsIssuePages.value = {};
        const bundle = await runSiteAuditMonitoring(
          selectedSiteId.value,
          Math.min(Math.max(formPageLimit.value || 100, 10), 200)
        );
        latestMetrics.value = bundle.metrics;
        const res = await getSiteAuditResults(selectedSiteId.value);
        latestResult.value = res.latest;
        results.value = res.results;
        message.success(tc('status_completed'));
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : '';
        message.error(errMsg || tc('errorRunAudit'));
      } finally {
        runningAudit.value = false;
      }
    }
  });
}

async function refreshManualAuditResult() {
  const res = await getSiteAuditResults(selectedSiteId.value);
  latestResult.value = res.latest;
  results.value = res.results;
}

async function handleManualUrlAudit() {
  const targetUrl = manualTargetUrl.value.trim();
  if (!targetUrl) {
    message.warning(tc('manualUrlRequired'));
    return;
  }
  await runManualAudit({ targetUrl });
}

async function handleSyncedContentAudit() {
  if (!manualContentCmsId.value) {
    message.warning(tc('manualContentRequired'));
    return;
  }
  await runManualAudit({ contentCmsId: manualContentCmsId.value });
}

async function runManualAudit(input: { targetUrl: string } | { contentCmsId: string }) {
  if (!selectedSiteId.value) return;
  runningManualAudit.value = true;
  try {
    const result = await runManualSiteAudit(selectedSiteId.value, input);
    latestAhrefsAudit.value = null;
    latestAhrefsIssues.value = [];
    ahrefsIssuePages.value = {};
    latestMetrics.value = result.bundle?.metrics ?? [];
    await refreshManualAuditResult();
    message.success(tc('manualCompleted'));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '';
    message.error(errorMessage || tc('manualFailed'));
  } finally {
    runningManualAudit.value = false;
  }
}

async function loadQuota() {
  try {
    quotaStats.value = await getAdminSerpapiUsage();
  } catch {
    // Silently fail — quota is a nice-to-have display
  }
}

function formatDate(s?: string): string {
  if (!s) return tc('never');
  return new Date(s).toLocaleString();
}

function tc(key: string): string {
  return t(`siteAudit.${key}`);
}

function getAhrefsIssueId(issue: SeoAuditIssue) {
  const issueId = issue.metadata?.providerIssueId;
  return typeof issueId === 'string' ? issueId : '';
}

function getAhrefsCrawledUrls(audit: SeoAudit | null) {
  const ahrefs = audit?.metadata?.ahrefs;
  if (!ahrefs || typeof ahrefs !== 'object') return undefined;
  const crawledUrls = (ahrefs as Record<string, unknown>).crawledUrls;
  return typeof crawledUrls === 'number' ? crawledUrls : undefined;
}

function formatAhrefsCategory(category?: string) {
  return category ? tc(`ahrefsCategory_${category}`) : '-';
}

async function loadAhrefsIssueUrls(issue: SeoAuditIssue) {
  const issueId = getAhrefsIssueId(issue);
  if (!selectedSiteId.value || !issueId || loadingAhrefsIssueId.value) return;

  const current = ahrefsIssuePages.value[issue.id];
  loadingAhrefsIssueId.value = issue.id;
  try {
    const result = await getAhrefsSiteAuditIssuePages(selectedSiteId.value, issueId, {
      offset: current ? current.offset + current.urls.length : 0,
      limit: 100
    });
    ahrefsIssuePages.value = {
      ...ahrefsIssuePages.value,
      [issue.id]: {
        ...result,
        urls: Array.from(new Set([...(current?.urls ?? []), ...result.urls]))
      }
    };
  } catch (error) {
    message.error(error instanceof Error ? error.message : tc('ahrefsAffectedUrlsFailed'));
  } finally {
    loadingAhrefsIssueId.value = undefined;
  }
}

function expandedAhrefsIssueRow({ record }: { record: SeoAuditIssue }) {
  const pages = ahrefsIssuePages.value[record.id];
  const issueId = getAhrefsIssueId(record);
  const canLoadMore = pages ? pages.hasMore : Boolean(issueId);
  return h('div', { class: 'issue-expanded-row' }, [
    record.suggestedValue
      ? h('div', { class: 'issue-detail-section' }, [
          h('div', { class: 'issue-detail-label' }, tc('issueRecommendation')),
          h('p', { class: 'issue-detail-text' }, record.suggestedValue)
        ])
      : null,
    h('div', { class: 'issue-detail-section' }, [
      h('div', { class: 'issue-detail-label' }, tc('issueAffectedUrls')),
      pages?.urls.length
        ? h('ul', { class: 'issue-url-list' }, pages.urls.map((url) =>
            h('li', { key: url }, h('a', { href: url, target: '_blank', rel: 'noopener', class: 'issue-detail-link' }, url))
          ))
        : h('p', { class: 'issue-detail-text' }, tc('ahrefsAffectedUrlsHint')),
      canLoadMore
        ? h(Button, {
            size: 'small',
            loading: loadingAhrefsIssueId.value === record.id,
            onClick: () => void loadAhrefsIssueUrls(record)
          }, { default: () => pages ? tc('ahrefsLoadMoreUrls') : tc('ahrefsLoadUrls') })
        : null
    ])
  ]);
}

// ── expanded row render for issues ──
function isResourceEvidenceUrl(url: string) {
  try {
    const parsed = new globalThis.URL(url);
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === 'http:'
      || host === 'localhost'
      || host === '127.0.0.1'
      || host === '0.0.0.0'
      || host === '::1'
      || host.endsWith('.localhost')
      || /\.(jpg|jpeg|png|gif|webp|svg|avif|css|js)(\?|$)/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function splitIssueEvidenceUrls(record: SiteAuditIssue) {
  const urls = getAffectedUrls(record);
  const resourceUrls = urls.filter((url) => isResourceEvidenceUrl(url));
  const pageUrls = urls.filter((url) => !resourceUrls.includes(url));
  return { pageUrls, resourceUrls };
}

function expandedIssueRow({ record }: { record: SiteAuditIssue }) {
  const { pageUrls, resourceUrls } = splitIssueEvidenceUrls(record);
  return h('div', { class: 'issue-expanded-row' }, [
    record.description
      ? h('div', { class: 'issue-detail-section' }, [
          h('div', { class: 'issue-detail-label' }, tc('issueDescription')),
          h('p', { class: 'issue-detail-text' }, record.description)
        ])
      : null,
    record.recommendation
      ? h('div', { class: 'issue-detail-section' }, [
          h('div', { class: 'issue-detail-label' }, tc('issueRecommendation')),
          h('p', { class: 'issue-detail-text' }, record.recommendation)
        ])
      : null,
    pageUrls.length > 0
      ? h('div', { class: 'issue-detail-section' }, [
          h('div', { class: 'issue-detail-label' }, tc('issueAffectedUrls')),
          h('ul', { class: 'issue-url-list' }, pageUrls.map((url) =>
            h('li', { key: url }, h('a', { href: url, target: '_blank', rel: 'noopener', class: 'issue-detail-link' }, url))
          ))
        ])
      : null,
    resourceUrls.length > 0
      ? h('div', { class: 'issue-detail-section' }, [
          h('div', { class: 'issue-detail-label' }, tc('issueResourceUrls')),
          h('ul', { class: 'issue-url-list' }, resourceUrls.map((url) =>
            h('li', { key: url }, [
              h('a', { href: url, target: '_blank', rel: 'noopener', class: 'issue-detail-link' }, url),
              ' ',
              h('span', { class: 'resource-badge' }, tc('resourceNotCrawlable'))
            ])
          ))
        ])
      : null,
    record.affectedCount > 1
      ? h('div', { class: 'issue-detail-section' }, [
          h('div', { class: 'issue-detail-label' }, tc('issueAffectedCount')),
          h('span', { class: 'issue-detail-text' }, String(record.affectedCount))
        ])
      : null
  ]);
}

function getAffectedUrls(record: { affectedUrls?: string[]; url?: string }) {
  return record.affectedUrls?.length ? record.affectedUrls : record.url ? [record.url] : [];
}

function normalizeAuditUrl(value: string) {
  try {
    const url = new globalThis.URL(value);
    return `${url.origin.toLowerCase()}${url.pathname.replace(/\/+$/, '') || '/'}${url.search}`;
  } catch {
    return value.trim().replace(/\/+$/, '').toLowerCase();
  }
}

const safeOneClickSuggestionTypes = new Set([
  'title',
  'meta_description'
]);

function getAffectedUrlSet() {
  const urls = [
    ...(latestResult.value?.issues.flatMap((issue) => issue.affectedUrls?.length ? issue.affectedUrls : issue.url ? [issue.url] : []) ?? []),
    ...Object.values(ahrefsIssuePages.value).flatMap((result) => result.urls)
  ];
  return new Set(urls.map(normalizeAuditUrl));
}

async function handleOneClickFix() {
  if (!selectedSite.value?.canWriteBack || !selectedSiteId.value) return;
  Modal.confirm({
    title: tc('oneClickFixTitle'),
    content: tc('oneClickFixConfirmation'),
    okText: tc('oneClickFixConfirm'),
    cancelText: tc('cancel'),
    onOk: async () => {
      oneClickFixing.value = true;
      try {
        await createSeoAudit(selectedSiteId.value);
        const result = await getOptimizationSuggestions(selectedSiteId.value, { limit: 500 });
        const affectedUrls = getAffectedUrlSet();
        const contentUrlByCmsId = new Map(
          syncedContent.value
            .filter((content) => content.url)
            .map((content) => [content.cmsId, normalizeAuditUrl(content.url)])
        );
        const eligible = result.suggestions.filter((suggestion) =>
          safeOneClickSuggestionTypes.has(suggestion.suggestionType) &&
          suggestion.status === 'pending' &&
          affectedUrls.has(contentUrlByCmsId.get(suggestion.targetCmsId) ?? '')
        );
        if (eligible.length === 0) {
          message.info(tc('oneClickFixNoEligible'));
          return;
        }
        const pendingIds = eligible.map((suggestion) => suggestion.id);
        const approval = await batchApproveOptimizationSuggestions(selectedSiteId.value, pendingIds);
        const approvedIds = approval.results.filter((item) => item.success).map((item) => item.suggestionId);
        const applyResult = approvedIds.length > 0
          ? await batchApplyOptimizationSuggestions(selectedSiteId.value, approvedIds)
          : { succeeded: 0, failed: 0, total: 0 };
        message.success(tc('oneClickFixSuccess').replace('{succeeded}', String(applyResult.succeeded)).replace('{failed}', String(approval.failed + applyResult.failed)));
      } catch (error) {
        message.error(error instanceof Error ? error.message : tc('oneClickFixFailed'));
      } finally {
        oneClickFixing.value = false;
      }
    }
  });
}

// ── watch ──
watch(selectedSiteId, () => {
  if (selectedSiteId.value) {
    // Set loading flags first so the spinner shows immediately,
    // keeping the previous result visible behind it until new data arrives.
    // Data is only replaced when loadConfig/loadResults succeed.
    loadingConfig.value = true;
    loadingResults.value = true;
    loadQuota();
    loadConfig();
    loadResults();
    loadSyncedContent();
  } else {
    config.value = null;
    results.value = [];
    latestResult.value = null;
    latestMetrics.value = [];
    ahrefsConfig.value = null;
    latestAhrefsAudit.value = null;
    latestAhrefsIssues.value = [];
    ahrefsIssuePages.value = {};
    syncedContent.value = [];
    manualTargetUrl.value = '';
    manualContentCmsId.value = undefined;
  }
});

watch(
  () => route.params.siteId,
  (siteId) => {
    if (typeof siteId === 'string') {
      selectedSiteId.value = siteId;
    }
  }
);

onMounted(async () => {
  try {
    const result = await getSiteConnections();
    sites.value = result.sites;

    const routeSiteId = typeof route.params.siteId === 'string' ? route.params.siteId : '';
    selectedSiteId.value = sites.value.some((site) => site.id === routeSiteId)
      ? routeSiteId
      : sites.value[0]?.id ?? '';
  } catch {
    // silently fail - site list will be empty
  }
});
</script>

<template>
  <div class="site-audit-view">
    <!-- header -->
    <div class="page-header">
      <div class="header-left">
        <h2>{{ tc('title') }}</h2>
        <p class="subtitle">{{ tc('description') }}</p>
      </div>
    </div>

    <Spin :spinning="loadingConfig || loadingResults" tip="Loading...">
      <!-- no site selected -->
      <Empty v-if="!hasSite" :description="tc('noSiteSelected')" />

      <!-- content -->
      <template v-else>
        <!-- action bar -->
        <div class="action-bar">
          <Button type="default" @click="openConfigModal">
            {{ tc('configure') }}
          </Button>
          <Button
            type="primary"
            :loading="runningAudit"
            @click="handleRunAudit"
          >
            {{ runningAudit ? tc('running') : tc('runNow') }}
          </Button>
          <Button
            v-if="selectedSite?.canWriteBack"
            type="default"
            :loading="oneClickFixing"
            @click="handleOneClickFix"
          >
            {{ tc('oneClickFix') }}
          </Button>
          <span v-if="quotaStats" class="quota-badge" :style="{ color: quotaStats.remaining <= 10 ? '#ff4d4f' : quotaStats.remaining <= 50 ? '#faad14' : undefined }">
            {{ tc('quotaRemaining').replace('{remaining}', String(quotaStats.remaining)).replace('{limit}', String(quotaStats.monthlyLimit)) }}
          </span>
          <span v-if="config?.schedule !== 'disabled'" class="schedule-hint">
            {{ tc('schedule') }}: {{ tc(`schedule${config?.schedule === 'weekly' ? 'Weekly' : 'Monthly'}`) }}
            &nbsp;|&nbsp;
            {{ tc('nextAudit') }}: {{ formatDate(config?.nextAuditAt) }}
          </span>
        </div>

        <Card :title="tc('manualTitle')" class="manual-audit-card" size="small">
          <Alert
            :message="tc('manualReadOnlyTitle')"
            :description="tc('manualReadOnlyDescription')"
            type="info"
            show-icon
          />
          <div class="manual-audit-grid">
            <div class="manual-audit-control">
              <label>{{ tc('manualUrlLabel') }}</label>
              <Input
                v-model:value="manualTargetUrl"
                :placeholder="tc('manualUrlPlaceholder')"
                @press-enter="handleManualUrlAudit"
              />
              <span class="hint">{{ tc('manualUrlHint') }}</span>
              <Button type="primary" :loading="runningManualAudit" @click="handleManualUrlAudit">
                {{ tc('manualAnalyzeUrl') }}
              </Button>
            </div>
            <div class="manual-audit-control">
              <label>{{ tc('manualContentLabel') }}</label>
              <Select
                v-model:value="manualContentCmsId"
                :options="manualContentOptions"
                :placeholder="tc('manualContentPlaceholder')"
                show-search
                allow-clear
                option-filter-prop="label"
              />
              <span class="hint">{{ tc('manualContentHint') }}</span>
              <Button :loading="runningManualAudit" @click="handleSyncedContentAudit">
                {{ tc('manualAnalyzeContent') }}
              </Button>
            </div>
          </div>
        </Card>

        <Alert
          v-if="canUseAhrefsFullSite"
          class="ahrefs-audit-notice"
          :type="hasAhrefsAuthError ? 'warning' : 'success'"
          show-icon
          :message="hasAhrefsAuthError ? tc('ahrefsUnavailable') : tc('ahrefsPlatformManagedTitle')"
          :description="hasAhrefsAuthError ? tc('ahrefsAuthFailed') : tc('ahrefsPlatformManagedDescription')"
        />
        <Alert
          v-else-if="hasSite"
          class="ahrefs-audit-notice"
          type="warning"
          show-icon
          :message="tc('limitedCrawlTitle')"
          :description="tc('limitedCrawlDescription')"
        />

        <Card
          v-if="latestAhrefsAudit"
          :title="tc('ahrefsLatestAudit')"
          class="result-card"
          size="small"
        >
          <template #extra>
            <Tag color="blue">Ahrefs</Tag>
          </template>

          <Row :gutter="16" class="metrics-row">
            <Col :xs="12" :sm="6">
              <Card size="small">
                <Statistic
                  :title="tc('overallScore')"
                  :value="latestAhrefsAudit.score"
                  suffix="/ 100"
                  :value-style="{ color: latestAhrefsAudit.score >= 80 ? '#52c41a' : latestAhrefsAudit.score >= 60 ? '#faad14' : '#ff4d4f' }"
                />
              </Card>
            </Col>
            <Col :xs="12" :sm="6">
              <Card size="small">
                <Statistic :title="tc('pagesCrawled')" :value="getAhrefsCrawledUrls(latestAhrefsAudit) ?? 0" />
              </Card>
            </Col>
            <Col :xs="12" :sm="6">
              <Card size="small">
                <Statistic :title="tc('ahrefsErrors')" :value="ahrefsIssueDistribution.error" :value-style="{ color: '#ff4d4f' }" />
              </Card>
            </Col>
            <Col :xs="12" :sm="6">
              <Card size="small">
                <Statistic :title="tc('ahrefsWarnings')" :value="ahrefsIssueDistribution.warning" :value-style="{ color: '#faad14' }" />
              </Card>
            </Col>
          </Row>

          <Descriptions bordered size="small" :column="2" class="ahrefs-summary-desc">
            <DescriptionsItem :label="tc('overallScore')">
              <Progress
                type="circle"
                :percent="latestAhrefsAudit.score"
                :width="60"
                :stroke-color="latestAhrefsAudit.score >= 80 ? '#52c41a' : latestAhrefsAudit.score >= 60 ? '#faad14' : '#ff4d4f'"
              />
            </DescriptionsItem>
            <DescriptionsItem :label="tc('pagesCrawled')">
              {{ getAhrefsCrawledUrls(latestAhrefsAudit) ?? '-' }}
            </DescriptionsItem>
            <DescriptionsItem :label="tc('lastAudit')">
              {{ formatDate(latestAhrefsAudit.createdAt) }}
            </DescriptionsItem>
            <DescriptionsItem :label="tc('ahrefsNotices')">
              {{ ahrefsIssueDistribution.notice }}
            </DescriptionsItem>
            <DescriptionsItem :label="tc('issues')">
              {{ ahrefsIssueDistribution.total }}
            </DescriptionsItem>
          </Descriptions>

          <Table
            v-if="latestAhrefsIssues.length > 0"
            :columns="ahrefsIssueColumns"
            :data-source="latestAhrefsIssues"
            :pagination="{ pageSize: 10 }"
            :expanded-row-render="expandedAhrefsIssueRow"
            :expand-row-by-click="true"
            size="small"
            row-key="id"
            class="issues-table"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'category'">
                {{ formatAhrefsCategory(record.category) }}
              </template>
              <template v-if="column.key === 'severity'">
                <Tag :color="severityColorMap[record.severity]">
                  {{ tc(`severity_${record.severity}`) }}
                </Tag>
              </template>
              <template v-if="column.key === 'affectedPages'">
                {{ record.affectedPages ?? 0 }}
              </template>
              <template v-if="column.key === 'change'">
                {{ record.change ?? '-' }}
              </template>
            </template>
          </Table>
          <Empty v-else :description="tc('allPassed')" />
        </Card>

        <!-- metrics row -->
        <Row v-if="latestResult && !latestAhrefsAudit" :gutter="16" class="metrics-row">
          <Col :xs="12" :sm="6">
            <Card size="small">
              <Statistic
                :title="tc('overallScore')"
                :value="latestResult.overallScore ?? 0"
                suffix="/ 100"
                :value-style="{ color: scoreColor }"
              />
            </Card>
          </Col>
          <Col :xs="12" :sm="6">
            <Card size="small">
              <Statistic
                :title="tc('pagesCrawled')"
                :value="latestResult.pagesCrawled"
              />
            </Card>
          </Col>
          <Col :xs="12" :sm="6">
            <Card size="small">
              <Statistic
                :title="tc('pagesIndexed')"
                :value="latestResult.pagesIndexed"
              />
            </Card>
          </Col>
          <Col :xs="12" :sm="6">
            <Card size="small">
              <Statistic
                :title="tc('searchCreditsUsed')"
                :value="latestResult.serpapiCreditsUsed"
              />
            </Card>
          </Col>
        </Row>

        <!-- latest result detail -->
        <Card
          v-if="latestResult && !latestAhrefsAudit"
          :title="tc('latestAudit')"
          class="result-card"
          size="small"
        >
          <template #extra>
            <span style="display: inline-flex; align-items: center; gap: 8px;">
              <Badge :status="statusColor" :text="tc(`status_${latestResult.status}`)" />
              <Tag v-if="runningAudit" color="processing">{{ tc('running') }}</Tag>
            </span>
          </template>

          <Descriptions bordered size="small" :column="2">
            <DescriptionsItem :label="tc('overallScore')">
              <Progress
                type="circle"
                :percent="latestResult.overallScore ?? 0"
                :width="60"
                :stroke-color="scoreColor"
              />
            </DescriptionsItem>
            <DescriptionsItem :label="tc('pagesCrawled')">
              {{ latestResult.pagesCrawled }}
            </DescriptionsItem>
            <DescriptionsItem :label="tc('lastAudit')">
              {{ formatDate(latestResult.completedAt || latestResult.createdAt) }}
            </DescriptionsItem>
            <DescriptionsItem :label="tc('searchCreditsUsed')">
              {{ latestResult.serpapiCreditsUsed }}
            </DescriptionsItem>
          </Descriptions>

          <!-- issue summary tags -->
          <div v-if="latestResult.issueSummary" class="issue-tags">
            <Tag v-if="latestResult.issueSummary.critical > 0" color="red">
              {{ tc('severity_critical') }}: {{ latestResult.issueSummary.critical }}
            </Tag>
            <Tag v-if="latestResult.issueSummary.high > 0" color="orange">
              {{ tc('severity_high') }}: {{ latestResult.issueSummary.high }}
            </Tag>
            <Tag v-if="latestResult.issueSummary.medium > 0" color="gold">
              {{ tc('severity_medium') }}: {{ latestResult.issueSummary.medium }}
            </Tag>
            <Tag v-if="latestResult.issueSummary.low > 0" color="green">
              {{ tc('severity_low') }}: {{ latestResult.issueSummary.low }}
            </Tag>
          </div>

          <!-- issues table -->
          <Table
            v-if="latestResult.issues && latestResult.issues.length > 0"
            :columns="issueColumns"
            :data-source="latestResult.issues"
            :pagination="{ pageSize: 10 }"
            :expanded-row-render="expandedIssueRow"
            :expand-row-by-click="true"
            size="small"
            row-key="id"
            class="issues-table"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'category'">
                {{ tc(`category_${record.category}`) }}
              </template>
              <template v-if="column.key === 'severity'">
                <Tag :color="severityColorMap[record.severity]">
                  {{ tc(`severity_${record.severity}`) }}
                </Tag>
              </template>
              <template v-if="column.key === 'affectedUrls'">
                <div v-if="getAffectedUrls(record).length" class="issue-url-preview">
                  <a
                    v-for="url in getAffectedUrls(record)"
                    :key="url"
                    :href="url"
                    target="_blank"
                    rel="noopener"
                    class="issue-detail-link"
                  >
                    {{ url }}
                  </a>
                </div>
                <span v-else>-</span>
              </template>
            </template>
          </Table>

          <div v-if="latestResult.status === 'failed' && latestResult.errorMessage" class="error-msg">
            {{ latestResult.errorMessage }}
          </div>
        </Card>

        <Card v-if="latestMetrics.length > 0 && !latestAhrefsAudit" :title="tc('metricsBySource')" class="result-card" size="small">
          <Table :data-source="latestMetrics" :pagination="false" size="small" row-key="id">
            <a-table-column key="metricName" :title="tc('metric')" data-index="metricName" />
            <a-table-column key="sourceType" :title="tc('source')" data-index="sourceType">
              <template #default="{ record }">
                {{ record.sourceType === 'lighthouse_lab' ? tc('sourceLighthouseLab') : record.sourceType === 'crux_field' ? tc('sourceCruxField') : record.sourceType }}
              </template>
            </a-table-column>
            <a-table-column key="value" :title="tc('value')" data-index="value">
              <template #default="{ record }">{{ record.value ?? tc('unavailable') }}</template>
            </a-table-column>
            <a-table-column key="status" :title="tc('status')" data-index="status" />
          </Table>
        </Card>

        <!-- no results -->
        <Empty
          v-if="!latestResult && !latestAhrefsAudit && !loadingResults"
          :description="tc('noResults')"
        />

        <!-- audit history -->
        <Card
          v-if="results.length > 1"
          :title="tc('auditHistory')"
          class="history-card"
          size="small"
        >
          <Table
            :columns="historyColumns"
            :data-source="results.slice(1)"
            :pagination="{ pageSize: 10 }"
            size="small"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'createdAt'">
                {{ formatDate(record.createdAt) }}
              </template>
              <template v-if="column.key === 'status'">
                <Badge
                  :status="record.status === 'completed' ? 'success' : record.status === 'running' ? 'processing' : record.status === 'failed' ? 'error' : 'default'"
                  :text="tc(`status_${record.status}`)"
                />
              </template>
              <template v-if="column.key === 'overallScore'">
                <span v-if="record.overallScore != null" :style="{ color: scoreColor }">
                  {{ record.overallScore }}
                </span>
                <span v-else>-</span>
              </template>
              <template v-if="column.key === 'issues'">
                {{ record.issueSummary?.total ?? '-' }}
              </template>
            </template>
          </Table>
        </Card>
      </template>
    </Spin>

    <!-- config modal -->
    <Modal
      v-model:open="configModalOpen"
      :title="tc('configure')"
      :confirm-loading="savingConfig"
      :ok-text="tc('saveConfig')"
      :cancel-text="tc('cancel')"
      @ok="saveConfig"
    >
      <div class="config-form">
        <div class="config-item">
          <label>{{ tc('schedule') }}</label>
          <RadioGroup v-model:value="formSchedule" button-style="solid">
            <RadioButton value="disabled">{{ tc('scheduleDisabled') }}</RadioButton>
            <RadioButton value="weekly">{{ tc('scheduleWeekly') }}</RadioButton>
            <RadioButton value="monthly">{{ tc('scheduleMonthly') }}</RadioButton>
          </RadioGroup>
        </div>

        <div class="config-item">
          <label>{{ tc('pageLimit') }}</label>
          <InputNumber
            v-model:value="formPageLimit"
            :min="10"
            :max="200"
            style="width: 100%"
          />
          <span class="hint">{{ tc('pageLimitHint') }}</span>
        </div>

        <div class="config-item">
          <label>{{ tc('crawlSource') }}</label>
          <RadioGroup v-model:value="formCrawlSource" button-style="solid">
            <RadioButton value="website">{{ tc('crawlSourceWebsite') }}</RadioButton>
            <RadioButton value="sitemap">{{ tc('crawlSourceSitemap') }}</RadioButton>
            <RadioButton value="robots_txt">{{ tc('crawlSourceRobots') }}</RadioButton>
          </RadioGroup>
        </div>

        <div class="config-item">
          <label>{{ tc('emailNotification') }}</label>
          <Switch v-model:checked="formEmailNotification" />
          <span class="hint">{{ tc('emailNotificationHint') }}</span>
        </div>

        <div class="config-item ahrefs-config-item">
          <label>{{ tc('ahrefsFullSiteTitle') }}</label>
          <Alert
            :type="canUseAhrefsFullSite ? 'success' : 'warning'"
            show-icon
            :message="canUseAhrefsFullSite ? (hasAhrefsAuthError ? tc('ahrefsUnavailable') : tc('ahrefsPlatformManagedTitle')) : tc('limitedCrawlTitle')"
            :description="canUseAhrefsFullSite ? (hasAhrefsAuthError ? tc('ahrefsAuthFailed') : tc('ahrefsPlatformManagedDescription')) : tc('limitedCrawlDescription')"
          />
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.site-audit-view {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 8px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.page-header h2 {
  margin: 0 0 4px 0;
  font-size: 22px;
}

.subtitle {
  margin: 0;
  color: #8c8c8c;
  font-size: 14px;
}

.action-bar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.schedule-hint {
  color: #8c8c8c;
  font-size: 13px;
  margin-left: 8px;
}

.metrics-row {
  margin-bottom: 20px;
}

.result-card {
  margin-bottom: 20px;
}

.ahrefs-audit-notice {
  margin-bottom: 20px;
}

.issue-tags {
  margin: 12px 0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.issues-table {
  margin-top: 12px;
}

.issue-expanded-row {
  padding: 8px 16px 8px 40px;
  background: #fafafa;
  border-radius: 4px;
}

.issue-detail-section {
  margin-bottom: 10px;
}

.issue-detail-section:last-child {
  margin-bottom: 0;
}

.issue-detail-label {
  font-weight: 600;
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.issue-detail-text {
  margin: 0;
  color: #262626;
  font-size: 14px;
  line-height: 1.6;
}

.issue-detail-link {
  color: #1677ff;
  font-size: 13px;
  word-break: break-all;
}

.resource-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 4px;
  background: #fff1f0;
  color: #cf1322;
  font-size: 12px;
  line-height: 20px;
}

.issue-url-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
}

.issue-url-preview {
  display: grid;
  gap: 2px;
  max-height: 110px;
  overflow: auto;
}

.error-msg {
  margin-top: 12px;
  color: #ff4d4f;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  padding: 8px 12px;
}

.history-card {
  margin-bottom: 20px;
}

.manual-audit-card {
  margin-bottom: 20px;
}

.manual-audit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.manual-audit-control {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.manual-audit-control label {
  font-weight: 600;
}

.manual-audit-control .hint {
  color: #8c8c8c;
  font-size: 12px;
}

@media (max-width: 720px) {
  .manual-audit-grid {
    grid-template-columns: 1fr;
  }
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.config-item label {
  display: block;
  font-weight: 500;
  margin-bottom: 4px;
}

.config-item .hint {
  display: block;
  color: #8c8c8c;
  font-size: 12px;
  margin-top: 4px;
}
</style>
