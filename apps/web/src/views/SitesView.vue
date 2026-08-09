<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { TableColumnsType } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import { getSiteConnections, deleteSiteConnection, type CmsPlatform, type SiteConnection } from '../api/siteConnections';

const { t, locale } = useI18n();
const router = useRouter();

const apiSites = ref<SiteConnection[]>([]);
const isLoading = ref(false);
const loadError = ref('');
const activeTab = ref('connected');
const selectedSite = ref<SiteConnection | null>(null);
const isDeleting = ref(false);

const platformLabels: Record<CmsPlatform, string> = {
  wordpress: 'WordPress',
  joomla: 'Joomla',
  opencart: 'OpenCart'
};

function normalizeSiteUrl(siteUrl: string): string {
  try {
    const url = new globalThis.URL(siteUrl);
    url.hash = '';
    url.search = '';
    const path = url.pathname.replace(/\/+$/, '');
    return `${url.protocol.toLowerCase()}//${url.host.toLowerCase()}${path}`;
  } catch {
    return siteUrl.toLowerCase().replace(/\/+$/, '');
  }
}

const dedupedApiSites = computed(() => {
  const siteByKey = new Map<string, SiteConnection>();

  for (const site of apiSites.value) {
    const key = `${site.platform}:${normalizeSiteUrl(site.siteUrl)}`;

    if (!siteByKey.has(key)) {
      siteByKey.set(key, site);
    }
  }

  return Array.from(siteByKey.values());
});

const siteRows = computed(() =>
  dedupedApiSites.value.map((site) => ({
    id: site.id,
    raw: site,
    name: site.name,
    platform: platformLabels[site.platform],
    health: site.status === 'connected' ? t('sites.healthReady') : t('sites.healthRevoked'),
    lastTokenUsed: formatDateTime(site.lastTokenUsedAt),
    lastSync: formatDateTime(site.lastSyncAt),
    status: site.status,
    statusLabel: site.status === 'connected' ? t('sites.statusConnected') : t('sites.statusRevoked')
  }))
);

const filteredSiteRows = computed(() =>
  siteRows.value.filter((site) => (activeTab.value === 'connected' ? site.status === 'connected' : site.status === 'revoked'))
);

const columns = computed<TableColumnsType<(typeof siteRows.value)[number]>>(() => [
  {
    title: t('sites.name'),
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: t('sites.platform'),
    dataIndex: 'platform',
    key: 'platform',
    width: 130
  },
  {
    title: t('sites.health'),
    dataIndex: 'health',
    key: 'health',
    width: 130
  },
  {
    title: t('sites.lastTokenUsed'),
    dataIndex: 'lastTokenUsed',
    key: 'lastTokenUsed',
    width: 180
  },
  {
    title: t('sites.lastSync'),
    dataIndex: 'lastSync',
    key: 'lastSync',
    width: 180
  },
  {
    title: t('cmsAdapters.status'),
    dataIndex: 'statusLabel',
    key: 'statusLabel',
    width: 120
  },
  {
    title: t('sites.action'),
    key: 'action',
    width: 180
  }
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

async function handleDelete(site: SiteConnection) {
  isDeleting.value = true;

  try {
    await deleteSiteConnection(site.id);
    await loadSites();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('sites.deleteFailed');
  } finally {
    isDeleting.value = false;
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
      <a-button type="primary" :loading="isLoading" @click="loadSites">
        {{ t('sites.refresh') }}
      </a-button>
    </div>

    <a-alert v-if="loadError" class="page-alert" type="error" show-icon :message="loadError" />

    <section class="content-panel">
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="connected" :tab="t('sites.connectedTab')" />
        <a-tab-pane key="revoked" :tab="t('sites.revokedTab')" />
      </a-tabs>

      <a-table
        row-key="id"
        :columns="columns"
        :data-source="filteredSiteRows"
        :loading="isLoading"
        :pagination="false"
      >
        <template #emptyText>{{ t('sites.empty') }}</template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <strong>{{ record.name }}</strong>
            <div class="table-subtext">{{ record.raw.siteUrl }}</div>
          </template>
          <template v-else-if="column.key === 'health'">
            <a-tag :color="record.status === 'connected' ? 'green' : 'red'">{{ record.health }}</a-tag>
          </template>
          <template v-else-if="column.key === 'statusLabel'">
            <a-tag :color="record.status === 'connected' ? 'blue' : 'default'">{{ record.statusLabel }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" @click="selectedSite = record.raw">
              {{ t('common.viewDetails') }}
            </a-button>
            <a-button
              v-if="record.status === 'connected'"
              type="link"
              @click="router.push({ path: '/app/site-audit', query: { siteId: record.id } })"
            >
              {{ t('nav.siteAudit') }}
            </a-button>
            <a-popconfirm
              :title="t('sites.deleteWarning')"
              :ok-text="t('sites.deleteConfirm')"
              :cancel-text="t('sites.deleteCancelled')"
              @confirm="handleDelete(record.raw)"
            >
              <a-button type="link" danger>{{ t('sites.delete') }}</a-button>
            </a-popconfirm>
          </template>
        </template>
      </a-table>
    </section>

    <a-modal
      :open="Boolean(selectedSite)"
      :title="selectedSite?.name || t('sites.detailTitle')"
      :footer="null"
      @cancel="selectedSite = null"
    >
      <dl v-if="selectedSite" class="detail-list">
        <dt>{{ t('sites.platform') }}</dt>
        <dd>{{ platformLabels[selectedSite.platform] }}</dd>
        <dt>{{ t('sites.lastTokenUsed') }}</dt>
        <dd>{{ formatDateTime(selectedSite.lastTokenUsedAt) }}</dd>
        <dt>{{ t('sites.lastSync') }}</dt>
        <dd>{{ formatDateTime(selectedSite.lastSyncAt) }}</dd>
        <dt>{{ t('media.title') }}</dt>
        <dd>{{ selectedSite.lastSyncStats?.mediaReceived ?? 0 }}</dd>
      </dl>
    </a-modal>
  </section>
</template>
