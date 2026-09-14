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
  getSyncedArticles
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
  SyncedArticle
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

const config = ref<SiteAuditConfig | null>(null);
const results = ref<SiteAuditResult[]>([]);
const latestResult = ref<SiteAuditResultWithIssues | null>(null);
const latestMetrics = ref<SiteAuditMetric[]>([]);
const quotaStats = ref<SerpapiUsageStats | null>(null);
const syncedContent = ref<SyncedArticle[]>([]);
const manualTargetUrl = ref('');
const manualContentCmsId = ref<string>();

// ── form model ──
const formSchedule = ref<SiteAuditSchedule>('disabled');
const formPageLimit = ref<number>(100);
const formCrawlSource = ref<SiteAuditCrawlSource>('website');
const formEmailNotification = ref<boolean>(false);

// ── computed ──
const hasSite = computed(() => !!selectedSiteId.value);
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
    title: tc('url'),
    dataIndex: 'url',
    key: 'url',
    ellipsis: true,
    width: 200
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
  Modal.confirm({
    title: tc('confirmationTitle'),
    content: tc('confirmationContent'),
    okText: tc('confirm'),
    cancelText: tc('cancel'),
    onOk: async () => {
      runningAudit.value = true;
      // Keep old latestResult visible while re-audit runs;
      // set reauditPending to show a "re-detecting" badge on the existing card
      try {
        const bundle = await runSiteAuditMonitoring(selectedSiteId.value, Math.min(formPageLimit.value, 25));
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

// ── expanded row render for issues ──
function expandedIssueRow({ record }: { record: SiteAuditIssue }) {
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
    record.url
      ? h('div', { class: 'issue-detail-section' }, [
          h('div', { class: 'issue-detail-label' }, tc('issueAffectedUrl')),
          h('a', { href: record.url, target: '_blank', rel: 'noopener', class: 'issue-detail-link' }, record.url)
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

        <!-- metrics row -->
        <Row v-if="latestResult" :gutter="16" class="metrics-row">
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
          v-if="latestResult"
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
            </template>
          </Table>

          <div v-if="latestResult.status === 'failed' && latestResult.errorMessage" class="error-msg">
            {{ latestResult.errorMessage }}
          </div>
        </Card>

        <Card v-if="latestMetrics.length > 0" :title="tc('metricsBySource')" class="result-card" size="small">
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
          v-if="!latestResult && !loadingResults"
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
            :min="1"
            :max="500"
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
