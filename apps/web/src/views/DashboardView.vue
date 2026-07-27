<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getSiteConnections, type SiteConnection } from '@/api/siteConnections';
import SearchConsolePanel from '@/components/SearchConsolePanel.vue';
import LighthousePanel from '@/components/LighthousePanel.vue';

const { t } = useI18n();
const metrics = computed(() => [
  { label: t('dashboard.connectedSites'), value: '3', tone: 'primary' },
  { label: t('dashboard.indexedArticles'), value: '1,284', tone: 'neutral' },
  { label: t('dashboard.pendingSuggestions'), value: '42', tone: 'accent' },
  { label: t('dashboard.runningTasks'), value: '7', tone: 'neutral' },
  { label: t('dashboard.averageScore'), value: '78', tone: 'primary' },
  { label: t('dashboard.crawlHealth'), value: '96%', tone: 'primary' }
]);

const pipelineSteps = computed(() => [
  { label: t('dashboard.pipelineScan'), value: '100%' },
  { label: t('dashboard.pipelineGenerate'), value: '64%' },
  { label: t('dashboard.pipelineReview'), value: '38%' },
  { label: t('dashboard.pipelineApply'), value: '22%' },
  { label: t('dashboard.pipelineDone'), value: '18%' }
]);

const priorities = computed(() => [
  t('dashboard.priorityArticle'),
  t('dashboard.priorityImage'),
  t('dashboard.priorityLinks')
]);

// Search Console & Lighthouse
const sites = ref<SiteConnection[]>([]);
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
            v-if="dashboardTab !== 'overview'"
            v-model:value="selectedSiteUrl"
            class="toolbar-select"
            :options="siteOptions"
            :placeholder="t('searchConsole.siteLabel')"
            style="min-width: 220px;"
          />
        </div>

        <template v-if="sites.length > 0">
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

        <div v-else class="panel-note" style="padding: 24px 0; text-align: center;">
          {{ t('dashboard.noSitesConnected') }}
        </div>
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

@media (max-width: 640px) {
  .toolbar-select {
    min-width: 160px !important;
    margin-top: 8px;
  }
}
</style>
