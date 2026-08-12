<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ColumnsType } from 'ant-design-vue/es/table';
import type { EChartsOption } from 'echarts';
import AnalyticsChart from '../components/AnalyticsChart.vue';
import { getAnalyticsOverview, type AnalyticsOverview } from '../api/appInsights';
import { getSiteConnections, type SiteConnection } from '../api/siteConnections';

const { t } = useI18n();

const overview = ref<AnalyticsOverview | null>(null);
const sites = ref<SiteConnection[]>([]);
const selectedSiteId = ref('');
const startDate = ref(getDateOffsetValue(6));
const endDate = ref(getDateOffsetValue(0));
const isLoading = ref(false);
const loadError = ref('');

const siteOptions = computed(() => [
  { label: t('analytics.allSites'), value: '' },
  ...sites.value.map((site) => ({
    label: site.name,
    value: site.id
  }))
]);

const metricCards = computed(() => {
  const totals = overview.value?.totals ?? {
    activeUsers: 0,
    sessions: 0,
    pageViews: 0,
    conversions: 0
  };

  return [
    { title: t('analytics.activeUsers'), value: totals.activeUsers },
    { title: t('analytics.sessions'), value: totals.sessions },
    { title: t('analytics.pageViews'), value: totals.pageViews },
    { title: t('analytics.conversions'), value: totals.conversions }
  ];
});

const trendOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  legend: { top: 0 },
  grid: { top: 48, right: 20, bottom: 28, left: 44 },
  xAxis: {
    type: 'category',
    data: overview.value?.daily.map((item) => item.date) ?? []
  },
  yAxis: { type: 'value' },
  series: [
    {
      name: t('analytics.activeUsers'),
      type: 'line',
      smooth: true,
      data: overview.value?.daily.map((item) => item.activeUsers) ?? []
    },
    {
      name: t('analytics.sessions'),
      type: 'line',
      smooth: true,
      data: overview.value?.daily.map((item) => item.sessions) ?? []
    },
    {
      name: t('analytics.pageViews'),
      type: 'bar',
      data: overview.value?.daily.map((item) => item.pageViews) ?? []
    }
  ]
}));

const channelOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { top: 20, right: 20, bottom: 36, left: 120 },
  xAxis: { type: 'value' },
  yAxis: {
    type: 'category',
    data: overview.value?.channels.map((item) => item.channel).reverse() ?? []
  },
  series: [
    {
      name: t('analytics.sessions'),
      type: 'bar',
      data: overview.value?.channels.map((item) => item.sessions).reverse() ?? []
    }
  ]
}));

const pageColumns = computed<ColumnsType<AnalyticsOverview['pages'][number]>>(() => [
  { title: t('analytics.pagePath'), dataIndex: 'path', key: 'path' },
  { title: t('analytics.pageViews'), dataIndex: 'pageViews', key: 'pageViews' },
  { title: t('analytics.activeUsers'), dataIndex: 'activeUsers', key: 'activeUsers' }
]);

async function loadAnalytics() {
  isLoading.value = true;
  loadError.value = '';

  try {
    overview.value = await getAnalyticsOverview({
      siteId: selectedSiteId.value || undefined,
      startDate: startDate.value,
      endDate: endDate.value
    });
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('analytics.loadFailed');
  } finally {
    isLoading.value = false;
  }
}

async function loadSites() {
  const result = await getSiteConnections();
  sites.value = result.sites;
  const hasSelectedSite = sites.value.some((site) => site.id === selectedSiteId.value);

  if (!hasSelectedSite && sites.value.length > 0) {
    selectedSiteId.value = sites.value[0].id;
  }
}

async function loadAnalyticsPage() {
  isLoading.value = true;
  loadError.value = '';

  try {
    await loadSites();
    await loadAnalytics();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('analytics.loadFailed');
  } finally {
    isLoading.value = false;
  }
}

function getDateOffsetValue(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

onMounted(() => {
  void loadAnalyticsPage();
});
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('analytics.title') }}</h2>
        <p>{{ t('analytics.body') }}</p>
      </div>
      <div class="analytics-filter-row">
        <a-select
          v-model:value="selectedSiteId"
          class="analytics-site-select"
          :options="siteOptions"
          :disabled="isLoading"
          @change="loadAnalytics"
        />
        <input v-model="startDate" class="date-input" type="date" :aria-label="t('analytics.startDate')">
        <input v-model="endDate" class="date-input" type="date" :aria-label="t('analytics.endDate')">
        <a-button type="primary" :loading="isLoading" @click="loadAnalytics">
          {{ t('sites.refresh') }}
        </a-button>
      </div>
    </div>

    <a-alert
      v-if="overview && !overview.configured"
      class="section-alert"
      type="warning"
      show-icon
      :message="t('analytics.demoMode')"
      :description="t('analytics.demoModeDescription')"
    />
    <a-alert v-if="loadError" class="section-alert" type="error" show-icon :message="loadError" />

    <a-row :gutter="[16, 16]">
      <a-col v-for="metric in metricCards" :key="metric.title" :xs="24" :sm="12" :xl="6">
        <a-card>
          <a-statistic :title="metric.title" :value="metric.value" />
        </a-card>
      </a-col>
    </a-row>

    <a-row class="section-grid" :gutter="[16, 16]">
      <a-col :xs="24" :xl="15">
        <a-card :title="t('analytics.trendTitle')">
          <AnalyticsChart :option="trendOption" />
        </a-card>
      </a-col>
      <a-col :xs="24" :xl="9">
        <a-card :title="t('analytics.channelTitle')">
          <AnalyticsChart :option="channelOption" />
        </a-card>
      </a-col>
    </a-row>

    <a-card class="section-card" :title="t('analytics.topPages')">
      <a-table
        :columns="pageColumns"
        :data-source="overview?.pages ?? []"
        :loading="isLoading"
        :pagination="false"
        row-key="path"
      />
    </a-card>
  </section>
</template>
