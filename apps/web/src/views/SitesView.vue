<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getSiteConnections, type CmsPlatform, type SiteConnection } from '../api/siteConnections';

const { t, locale } = useI18n();

const apiSites = ref<SiteConnection[]>([]);
const isLoading = ref(false);
const loadError = ref('');

const platformLabels: Record<CmsPlatform, string> = {
  wordpress: 'WordPress',
  joomla: 'Joomla',
  opencart: 'OpenCart'
};

const sites = computed(() =>
  apiSites.value.map((site) => ({
    id: site.id,
    name: site.name,
    platform: platformLabels[site.platform],
    health: site.status === 'connected' ? t('sites.healthReady') : t('sites.healthRevoked'),
    articles: String(site.lastSyncStats?.articlesReceived ?? 0),
    lastTokenUsed: formatDateTime(site.lastTokenUsedAt),
    lastSync: formatDateTime(site.lastSyncAt),
    status: site.status === 'connected' ? t('sites.statusConnected') : t('sites.statusRevoked')
  }))
);

const connectionSteps = computed(() => [
  t('sites.connectStepOne'),
  t('sites.connectStepTwo'),
  t('sites.connectStepThree')
]);

function formatDateTime(value?: string) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

async function loadSites() {
  isLoading.value = true;
  loadError.value = '';

  try {
    const result = await getSiteConnections();
    apiSites.value = result.sites;
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('sites.loadFailed');
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadSites();
});
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('sites.title') }}</h2>
        <p>{{ t('sites.body') }}</p>
      </div>
      <button class="primary-button" type="button" :disabled="isLoading" @click="loadSites">
        {{ isLoading ? t('sites.loading') : t('sites.refresh') }}
      </button>
    </div>

    <div class="prototype-grid">
      <section class="content-panel panel-wide">
        <div class="data-table" role="table">
          <div class="data-row data-head site-data-row" role="row">
            <span>{{ t('sites.name') }}</span>
            <span>{{ t('sites.platform') }}</span>
            <span>{{ t('sites.health') }}</span>
            <span>{{ t('sites.articles') }}</span>
            <span>{{ t('sites.lastTokenUsed') }}</span>
            <span>{{ t('sites.lastSync') }}</span>
            <span>{{ t('cmsAdapters.status') }}</span>
          </div>
          <div v-if="isLoading" class="data-row site-data-row" role="row">
            <strong>{{ t('sites.loading') }}</strong>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span class="status-pill">{{ t('sites.statusLoading') }}</span>
          </div>
          <div v-else-if="loadError" class="data-row site-data-row" role="row">
            <strong>{{ t('sites.loadFailed') }}</strong>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span class="status-pill">{{ loadError }}</span>
          </div>
          <div v-else-if="sites.length === 0" class="data-row site-data-row" role="row">
            <strong>{{ t('sites.empty') }}</strong>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span class="status-pill">{{ t('sites.statusEmpty') }}</span>
          </div>
          <template v-else>
            <div v-for="site in sites" :key="site.id" class="data-row site-data-row" role="row">
              <strong>{{ site.name }}</strong>
              <span>{{ site.platform }}</span>
              <span>{{ site.health }}</span>
              <span>{{ site.articles }}</span>
              <span>{{ site.lastTokenUsed }}</span>
              <span>{{ site.lastSync }}</span>
              <span class="status-pill">{{ site.status }}</span>
            </div>
          </template>
        </div>
      </section>

      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('sites.connectTitle') }}</h2>
        </div>
        <ol class="step-list">
          <li v-for="step in connectionSteps" :key="step">{{ step }}</li>
        </ol>
      </section>
    </div>
  </section>
</template>

<style scoped>
.site-data-row {
  grid-template-columns: minmax(180px, 1.4fr) repeat(6, minmax(92px, 1fr));
}

@media (max-width: 760px) {
  .site-data-row {
    grid-template-columns: 1fr;
  }
}
</style>
