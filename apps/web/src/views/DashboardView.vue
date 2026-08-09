<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { Spin, Tag } from 'ant-design-vue';
import { ChartBar, Eye, Search, Target } from 'lucide-vue-next';
import { getSiteConnections, type SiteConnection } from '@/api/siteConnections';
import {
  getSearchConsoleKeywords,
  getLighthouseAudit,
  type SearchConsoleKeywordsResult,
  type LighthouseAuditResult
} from '@/api/appInsights';
import SearchConsolePanel from '@/components/SearchConsolePanel.vue';
import LighthousePanel from '@/components/LighthousePanel.vue';

const { t } = useI18n();
const router = useRouter();

// ── Dynamic metrics ──────────────────────────────────────────
const sites = ref<SiteConnection[]>([]);
const totalSyncedMedia = computed(() =>
  sites.value.reduce((total, site) => total + (site.lastSyncStats?.mediaReceived ?? 0), 0)
);
const metrics = computed(() => [
  {
    label: t('dashboard.connectedSites'),
    value: String(sites.value.length),
    tone: 'primary' as const
  },
  {
    label: t('dashboard.syncedMedia'),
    value: String(totalSyncedMedia.value),
    tone: 'neutral' as const
  },
  {
    label: t('dashboard.pendingSuggestions'),
    value: '--',
    tone: 'accent' as const
  },
  {
    label: t('dashboard.runningTasks'),
    value: '--',
    tone: 'neutral' as const
  },
  {
    label: t('dashboard.averageScore'),
    value: overviewLhScores.value
      ? String(Math.round(
          (overviewLhScores.value.performance +
            overviewLhScores.value.accessibility +
            overviewLhScores.value.bestPractices +
            overviewLhScores.value.seo) / 4
        ))
      : '--',
    tone: 'primary' as const
  },
  {
    label: t('dashboard.crawlHealth'),
    value: overviewGscData.value
      ? `${overviewGscData.value.keywords.length} keywords`
      : '--',
    tone: 'primary' as const
  }
]);

// ── Pipeline visualization (placeholder) ────────────────────
const pipelineSteps = computed(() => [
  { label: t('dashboard.pipelineScan'), value: '100%' },
  { label: t('dashboard.pipelineGenerate'), value: '64%' },
  { label: t('dashboard.pipelineReview'), value: '38%' },
  { label: t('dashboard.pipelineApply'), value: '22%' },
  { label: t('dashboard.pipelineDone'), value: '18%' }
]);

const priorities = computed(() => [
  t('dashboard.priorityImage'),
  t('dashboard.priorityLinks'),
  t('dashboard.prioritySiteAudit')
]);

// ── Site selection ───────────────────────────────────────────
const selectedSiteUrl = ref<string | undefined>();
const dashboardTab = ref('overview');

const siteOptions = computed(() =>
  sites.value.map((site) => ({
    label: site.name,
    value: site.siteUrl || site.name
  }))
);

const tabItems = [
  { key: 'overview', label: t('dashboard.overview') },
  { key: 'gsc', label: t('searchConsole.title') },
  { key: 'lighthouse', label: t('lighthouse.title') }
];

// ── Overview data fetching (GSC + Lighthouse) ───────────────
const overviewGscLoading = ref(false);
const overviewGscData = ref<SearchConsoleKeywordsResult | null>(null);
const overviewGscError = ref<string | null>(null);

const overviewLhLoading = ref(false);
const overviewLhData = ref<LighthouseAuditResult | null>(null);
const overviewLhScores = ref<LighthouseAuditResult['scores'] | null>(null);
const overviewLhError = ref<string | null>(null);

async function fetchOverviewGsc() {
  if (!selectedSiteUrl.value) return;
  overviewGscLoading.value = true;
  overviewGscError.value = null;
  try {
    overviewGscData.value = await getSearchConsoleKeywords({ siteUrl: selectedSiteUrl.value });
  } catch (err) {
    overviewGscError.value = (err as Error).message;
  } finally {
    overviewGscLoading.value = false;
  }
}

async function fetchOverviewLighthouse() {
  if (!selectedSiteUrl.value) return;
  overviewLhLoading.value = true;
  overviewLhError.value = null;
  try {
    overviewLhData.value = await getLighthouseAudit(selectedSiteUrl.value);
    overviewLhScores.value = overviewLhData.value.scores;
  } catch (err) {
    overviewLhError.value = (err as Error).message;
  } finally {
    overviewLhLoading.value = false;
  }
}

async function refreshOverview() {
  await Promise.all([fetchOverviewGsc(), fetchOverviewLighthouse()]);
}

watch(selectedSiteUrl, () => {
  if (dashboardTab.value === 'overview' && selectedSiteUrl.value) {
    refreshOverview();
  } else {
    overviewGscData.value = null;
    overviewLhData.value = null;
    overviewLhScores.value = null;
  }
});

watch(dashboardTab, (tab) => {
  if (tab === 'overview' && selectedSiteUrl.value) {
    refreshOverview();
  }
});

// ── Lighthouse score helpers (overview) ─────────────────────
function scoreColor(v: number): string {
  if (v >= 90) return '#0cce6b';
  if (v >= 50) return '#ffa400';
  return '#ff4e42';
}

const ringRadius = 36;
const ringCircumference = 2 * Math.PI * ringRadius;
function ringOffset(score: number): number {
  return ringCircumference - (score / 100) * ringCircumference;
}

const lhScoreCards = computed(() => {
  if (!overviewLhScores.value) return [];
  const s = overviewLhScores.value;
  return [
    { key: 'performance', label: t('dashboard.performance'), value: Math.round(s.performance) },
    { key: 'accessibility', label: t('dashboard.accessibility'), value: Math.round(s.accessibility) },
    { key: 'bestPractices', label: t('dashboard.bestPractices'), value: Math.round(s.bestPractices) },
    { key: 'seo', label: t('lighthouse.seo'), value: Math.round(s.seo) }
  ];
});

// ── GSC summary stats ────────────────────────────────────────
const gscTotalClicks = computed(() =>
  overviewGscData.value
    ? overviewGscData.value.keywords.reduce((sum, k) => sum + k.clicks, 0)
    : 0
);
const gscTotalImpr = computed(() =>
  overviewGscData.value
    ? overviewGscData.value.keywords.reduce((sum, k) => sum + k.impressions, 0)
    : 0
);
const gscAvgCtr = computed(() => {
  if (!overviewGscData.value || overviewGscData.value.keywords.length === 0) return 0;
  return (
    overviewGscData.value.keywords.reduce((sum, k) => sum + k.ctr, 0) /
    overviewGscData.value.keywords.length
  );
});
const topGscKeywords = computed(() => {
  if (!overviewGscData.value) return [];
  return [...overviewGscData.value.keywords]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 3);
});

function navigateToTab(tab: string) {
  dashboardTab.value = tab;
}
function navigateToAudit() {
  router.push('/audit');
}

onMounted(async () => {
  try {
    const result = await getSiteConnections();
    sites.value = result.sites;
    if (sites.value.length > 0) {
      selectedSiteUrl.value = sites.value[0].siteUrl || sites.value[0].name;
    }
  } catch {
    // sites not critical for dashboard
  }
});
</script>

<template>
  <section class="page-section">
    <!-- Summary metrics -->
    <div class="summary-grid">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card" :data-tone="metric.tone">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </article>
    </div>

    <!-- Pipeline + Priorities -->
    <div class="prototype-grid">
      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('dashboard.pipelineTitle') }}</h2>
          <span>{{ t('dashboard.syncProgress') }}</span>
        </div>
        <div class="pipeline-list">
          <div v-for="step in pipelineSteps" :key="step.label" class="pipeline-step">
            <span>{{ step.label }}</span>
            <div class="progress-track">
              <span class="progress-fill" :style="{ width: step.value }" />
            </div>
            <strong>{{ step.value }}</strong>
          </div>
        </div>
      </section>

      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('dashboard.priorityTitle') }}</h2>
          <span>{{ t('dashboard.title') }}</span>
        </div>
        <ul class="priority-list">
          <li v-for="priority in priorities" :key="priority">{{ priority }}</li>
        </ul>
        <p class="panel-note">{{ t('dashboard.body') }}</p>
      </section>
    </div>

    <!-- SEO Insights tabs: GSC + Lighthouse -->
    <div class="prototype-grid">
      <section class="content-panel content-panel--full">
        <div class="panel-heading">
          <!-- eslint-disable vue/attribute-hyphenation -->
          <Tabs v-model:activeKey="dashboardTab" :items="tabItems" class="dashboard-tabs" />
          <!-- eslint-enable vue/attribute-hyphenation -->
          <a-select
            v-model:value="selectedSiteUrl"
            class="toolbar-select"
            :options="siteOptions"
            :placeholder="t('searchConsole.siteLabel')"
            style="min-width: 220px;"
          />
        </div>

        <!-- ── No sites connected ──────────────────────────── -->
        <div v-if="sites.length === 0" class="panel-note" style="padding: 24px 0; text-align: center;">
          {{ t('dashboard.noSitesConnected') }}
        </div>

        <!-- ── Overview TAB ────────────────────────────────── -->
        <template v-if="dashboardTab === 'overview' && sites.length > 0">
          <div v-if="selectedSiteUrl" class="overview-section">
            <!-- GSC Summary Card -->
            <div class="overview-card">
              <div class="overview-card-header" @click="navigateToTab('gsc')">
                <div class="overview-card-title-row">
                  <Search :size="18" class="overview-card-icon" />
                  <h3>{{ t('dashboard.gscSummary') }}</h3>
                </div>
                <span class="overview-card-link">{{ t('dashboard.viewFullReport') }}</span>
              </div>
              <Spin :spinning="overviewGscLoading" size="small">
                <div v-if="overviewGscError" class="overview-error">{{ overviewGscError }}</div>
                <template v-else-if="overviewGscData && overviewGscData.keywords.length > 0">
                  <div class="overview-stats-row">
                    <div class="overview-stat">
                      <span class="overview-stat-value">{{ gscTotalClicks }}</span>
                      <span class="overview-stat-label">{{ t('dashboard.gscTotalClicks') }}</span>
                    </div>
                    <div class="overview-stat">
                      <span class="overview-stat-value">{{ gscTotalImpr }}</span>
                      <span class="overview-stat-label">{{ t('dashboard.gscTotalImpr') }}</span>
                    </div>
                    <div class="overview-stat">
                      <span class="overview-stat-value">{{ gscAvgCtr.toFixed(1) }}%</span>
                      <span class="overview-stat-label">{{ t('dashboard.gscAvgCtr') }}</span>
                    </div>
                  </div>
                  <div class="overview-top-keywords">
                    <div class="overview-top-label">{{ t('keywords.topKeywordsByClicks') || 'Top keywords' }}</div>
                    <div v-for="kw in topGscKeywords" :key="kw.query" class="overview-kw-row">
                      <span class="overview-kw-query">{{ kw.query }}</span>
                      <span class="overview-kw-metrics">
                        <Tag color="blue">{{ kw.clicks }} clicks</Tag>
                        <Tag color="default">#{{ kw.position.toFixed(0) }}</Tag>
                      </span>
                    </div>
                  </div>
                </template>
                <div v-else-if="!overviewGscLoading" class="overview-empty-hint">
                  <Eye :size="32" class="overview-empty-icon" />
                  <span>{{ t('dashboard.gscNoData') }}</span>
                </div>
              </Spin>
            </div>

            <!-- Lighthouse Summary Card -->
            <div class="overview-card">
              <div class="overview-card-header" @click="navigateToTab('lighthouse')">
                <div class="overview-card-title-row">
                  <ChartBar :size="18" class="overview-card-icon" />
                  <h3>{{ t('dashboard.lighthouseSummary') }}</h3>
                </div>
                <span class="overview-card-link">{{ t('dashboard.viewFullReport') }}</span>
              </div>
              <Spin :spinning="overviewLhLoading" size="small">
                <div v-if="overviewLhError" class="overview-error">{{ overviewLhError }}</div>
                <template v-else-if="lhScoreCards.length > 0">
                  <div class="overview-gauges">
                    <div v-for="card in lhScoreCards" :key="card.key" class="overview-gauge">
                      <svg viewBox="0 0 100 100" class="overview-gauge-svg">
                        <circle cx="50" cy="50" :r="ringRadius" fill="none" stroke="#eaecf0" stroke-width="8" />
                        <circle
                          cx="50" cy="50" :r="ringRadius" fill="none"
                          :stroke="scoreColor(card.value)" stroke-width="8"
                          stroke-linecap="round"
                          :stroke-dasharray="ringCircumference"
                          :stroke-dashoffset="ringOffset(card.value)"
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <span class="overview-gauge-value" :style="{ color: scoreColor(card.value) }">
                        {{ card.value }}
                      </span>
                      <span class="overview-gauge-label">{{ card.label }}</span>
                    </div>
                  </div>
                </template>
                <div v-else-if="!overviewLhLoading" class="overview-empty-hint" @click="navigateToAudit">
                  <Target :size="32" class="overview-empty-icon" />
                  <span>{{ t('dashboard.lighthouseNoData') }}</span>
                </div>
              </Spin>
            </div>
          </div>
        </template>

        <!-- ── GSC TAB ─────────────────────────────────────── -->
        <template v-if="sites.length > 0 && dashboardTab !== 'overview'">
          <SearchConsolePanel
            v-show="dashboardTab === 'gsc'"
            :key="`gsc-${selectedSiteUrl}`"
            :site-url="selectedSiteUrl"
            :compact="true"
          />
          <LighthousePanel
            v-show="dashboardTab === 'lighthouse'"
            :key="`lh-${selectedSiteUrl}`"
            :site-url="selectedSiteUrl"
            :compact="true"
          />
        </template>
      </section>
    </div>
  </section>
</template>

<style scoped>
.dashboard-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

.dashboard-tabs :deep(.ant-tabs-tab) {
  font-weight: 600;
  font-size: 14px;
}

.toolbar-select {
  min-width: 220px;
}

/* ── Overview section ──────────────────────────────────────── */

.overview-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 16px;
}

.overview-card {
  background: var(--color-canvas, #fafafa);
  border: 1px solid var(--color-border, #f0f0f0);
  border-radius: 12px;
  padding: 20px;
  transition: box-shadow 0.2s;
}

.overview-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.overview-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  cursor: pointer;
}

.overview-card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.overview-card-title-row h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-ink, #262626);
}

.overview-card-icon {
  color: var(--color-primary, #1677ff);
  flex-shrink: 0;
}

.overview-card-link {
  font-size: 12px;
  color: var(--color-primary, #1677ff);
  white-space: nowrap;
}

.overview-card-link:hover {
  text-decoration: underline;
}

/* ── GSC overview stats ────────────────────────────────────── */

.overview-stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.overview-stat {
  flex: 1;
  text-align: center;
  padding: 10px 8px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.overview-stat-value {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-ink, #262626);
}

.overview-stat-label {
  display: block;
  font-size: 11px;
  color: var(--color-muted, #8c8c8c);
  margin-top: 2px;
}

.overview-top-keywords {
  margin-top: 8px;
}

.overview-top-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-muted, #8c8c8c);
  margin-bottom: 8px;
}

.overview-kw-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-top: 1px solid #f5f5f5;
}

.overview-kw-query {
  font-size: 13px;
  color: var(--color-ink, #262626);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 50%;
}

.overview-kw-metrics {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* ── Lighthouse overview gauges ────────────────────────────── */

.overview-gauges {
  display: flex;
  justify-content: space-around;
  align-items: flex-start;
  gap: 8px;
}

.overview-gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  position: relative;
}

.overview-gauge-svg {
  width: 82px;
  height: 82px;
}

.overview-gauge-value {
  position: absolute;
  top: 26px;
  font-size: 18px;
  font-weight: 700;
}

.overview-gauge-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-muted, #8c8c8c);
  margin-top: -4px;
}

/* ── Empty states ──────────────────────────────────────────── */

.overview-empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 0;
  color: var(--color-muted, #8c8c8c);
  font-size: 13px;
  cursor: pointer;
}

.overview-empty-icon {
  opacity: 0.4;
}

.overview-error {
  color: #ff4d4f;
  font-size: 13px;
  padding: 8px 0;
}

/* ── Responsive ────────────────────────────────────────────── */

@media (max-width: 768px) {
  .overview-section {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .overview-gauges {
    justify-content: space-between;
  }
}

@media (max-width: 640px) {
  .toolbar-select {
    min-width: 160px !important;
    margin-top: 8px;
  }

  .overview-stats-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  .overview-stat {
    flex: 1 1 calc(50% - 8px);
    min-width: 80px;
  }
}
</style>
