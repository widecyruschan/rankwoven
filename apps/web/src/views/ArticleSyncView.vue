<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getSiteConnections, type CmsPlatform, type SiteConnection } from '../api/siteConnections';

const { t, locale } = useI18n();

const sites = ref<SiteConnection[]>([]);
const isLoading = ref(false);
const loadError = ref('');

const platformLabels: Record<CmsPlatform, string> = {
  wordpress: 'WordPress',
  joomla: 'Joomla',
  opencart: 'OpenCart'
};

const syncRows = computed(() =>
  sites.value.map((site) => ({
    id: site.id,
    site: site.name,
    platform: platformLabels[site.platform],
    articles: String(site.lastSyncStats?.articlesReceived ?? 0),
    media: String(site.lastSyncStats?.mediaReceived ?? 0),
    lastSync: formatLastSync(site.lastSyncAt),
    status: getSyncStatus(site)
  }))
);

const totalSites = computed(() => sites.value.length);
const connectedSites = computed(() => sites.value.filter((site) => site.status === 'connected').length);
const syncedSites = computed(() => sites.value.filter((site) => Boolean(site.lastSyncAt)).length);
const totalArticles = computed(() =>
  sites.value.reduce((total, site) => total + (site.lastSyncStats?.articlesReceived ?? 0), 0)
);
const totalMedia = computed(() =>
  sites.value.reduce((total, site) => total + (site.lastSyncStats?.mediaReceived ?? 0), 0)
);

const syncSteps = computed(() => [
  {
    label: t('articleSync.stepInventory'),
    value: `${connectedSites.value}/${totalSites.value}`,
    width: getRatioWidth(connectedSites.value, totalSites.value)
  },
  {
    label: t('articleSync.stepContent'),
    value: `${syncedSites.value}/${totalSites.value}`,
    width: getRatioWidth(syncedSites.value, totalSites.value)
  },
  {
    label: t('articleSync.stepArticles'),
    value: String(totalArticles.value),
    width: totalArticles.value > 0 ? '100%' : '0%'
  },
  {
    label: t('articleSync.stepMedia'),
    value: String(totalMedia.value),
    width: totalMedia.value > 0 ? '100%' : '0%'
  }
]);

function getRatioWidth(value: number, total: number) {
  if (total === 0) {
    return '0%';
  }

  return `${Math.round((value / total) * 100)}%`;
}

function formatLastSync(lastSyncAt?: string) {
  if (!lastSyncAt) {
    return '--';
  }

  const date = new Date(lastSyncAt);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function getSyncStatus(site: SiteConnection) {
  if (site.status === 'revoked') {
    return t('articleSync.statusRevoked');
  }

  if (!site.lastSyncAt) {
    return t('articleSync.statusPending');
  }

  return t('articleSync.statusDone');
}

async function loadSyncStatus() {
  isLoading.value = true;
  loadError.value = '';

  try {
    const result = await getSiteConnections();
    sites.value = result.sites;
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('articleSync.loadFailed');
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadSyncStatus();
});
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('articleSync.title') }}</h2>
        <p>{{ t('articleSync.body') }}</p>
      </div>
      <button class="primary-button" type="button" :disabled="isLoading" @click="loadSyncStatus">
        {{ isLoading ? t('articleSync.loading') : t('articleSync.primaryAction') }}
      </button>
    </div>

    <div class="prototype-grid">
      <section class="content-panel panel-wide">
        <div class="data-table" role="table">
          <div class="data-row data-head" role="row">
            <span>{{ t('articleSync.site') }}</span>
            <span>{{ t('sites.platform') }}</span>
            <span>{{ t('articleSync.articles') }}</span>
            <span>{{ t('articleSync.media') }}</span>
            <span>{{ t('articleSync.lastSync') }}</span>
            <span>{{ t('cmsAdapters.status') }}</span>
          </div>
          <div v-if="isLoading" class="data-row" role="row">
            <strong>{{ t('articleSync.loading') }}</strong>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span class="status-pill">{{ t('articleSync.statusLoading') }}</span>
          </div>
          <div v-else-if="loadError" class="data-row" role="row">
            <strong>{{ t('articleSync.loadFailed') }}</strong>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span class="status-pill">{{ loadError }}</span>
          </div>
          <div v-else-if="syncRows.length === 0" class="data-row" role="row">
            <strong>{{ t('articleSync.empty') }}</strong>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span class="status-pill">{{ t('articleSync.statusEmpty') }}</span>
          </div>
          <template v-else>
            <div v-for="row in syncRows" :key="row.id" class="data-row" role="row">
              <strong>{{ row.site }}</strong>
              <span>{{ row.platform }}</span>
              <span>{{ row.articles }}</span>
              <span>{{ row.media }}</span>
              <span>{{ row.lastSync }}</span>
              <span class="status-pill">{{ row.status }}</span>
            </div>
          </template>
        </div>
      </section>

      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('articleSync.pipelineTitle') }}</h2>
          <span>{{ t('articleSync.lastResult') }}</span>
        </div>
        <div class="pipeline-list">
          <div v-for="step in syncSteps" :key="step.label" class="pipeline-step">
            <span>{{ step.label }}</span>
            <div class="progress-track">
              <span class="progress-fill" :style="{ width: step.width }" />
            </div>
            <strong>{{ step.value }}</strong>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
