<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { TableColumnsType } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import { getSiteConnections, getSiteConnection, deleteSiteConnection, type CmsPlatform, type SiteConnection } from '../api/siteConnections';

const { t, locale } = useI18n();
const router = useRouter();

const apiSites = ref<SiteConnection[]>([]);
const isLoading = ref(false);
const loadError = ref('');
const activeTab = ref('connected');
const selectedSite = ref<SiteConnection | null>(null);
const isDetailLoading = ref(false);
const isDeleting = ref(false);
const deletingSiteId = ref('');
const sitePendingDelete = ref<SiteConnection | null>(null);

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
const connectedSiteCount = computed(() => siteRows.value.filter((site) => site.status === 'connected').length);
const revokedSiteCount = computed(() => siteRows.value.filter((site) => site.status === 'revoked').length);
const syncedSiteCount = computed(() => siteRows.value.filter((site) => site.lastSync !== '--').length);

const siteSummaryCards = computed(() => [
  {
    label: t('sites.connectedCount'),
    value: String(connectedSiteCount.value),
    tone: 'primary'
  },
  {
    label: t('sites.readySites'),
    value: String(Math.max(connectedSiteCount.value - revokedSiteCount.value, 0)),
    tone: 'accent'
  },
  {
    label: t('sites.syncCovered'),
    value: String(syncedSiteCount.value),
    tone: 'neutral'
  }
]);

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
    width: 260
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

async function openSiteDetail(site: SiteConnection) {
  selectedSite.value = site;
  isDetailLoading.value = true;

  try {
    const result = await getSiteConnection(site.id);
    selectedSite.value = result.site;
  } catch (error) {
    message.warning(error instanceof Error ? error.message : t('sites.detailLoadFailed'));
  } finally {
    isDetailLoading.value = false;
  }
}

function goToSitePage(path: string, siteId: string) {
  selectedSite.value = null;
  void router.push({ path, query: { siteId } });
}

function openDeleteConfirm(site: SiteConnection) {
  if (isDeleting.value) {
    return;
  }

  sitePendingDelete.value = site;
}

function closeDeleteConfirm() {
  if (isDeleting.value) {
    return;
  }

  sitePendingDelete.value = null;
}

async function handleDelete(site: SiteConnection): Promise<boolean> {
  isDeleting.value = true;
  deletingSiteId.value = site.id;
  loadError.value = '';

  try {
    await deleteSiteConnection(site.id);
    if (selectedSite.value?.id === site.id) {
      selectedSite.value = null;
    }
    message.success(t('sites.deleteSuccess'));
    await loadSites();
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : t('sites.deleteFailed');
    loadError.value = errorMessage;
    message.error(errorMessage);
    return false;
  } finally {
    isDeleting.value = false;
    deletingSiteId.value = '';
  }
}

async function confirmDeleteSite() {
  if (!sitePendingDelete.value) {
    return;
  }

  const deleted = await handleDelete(sitePendingDelete.value);

  if (deleted) {
    sitePendingDelete.value = null;
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

    <div class="summary-grid compact-grid">
      <article v-for="card in siteSummaryCards" :key="card.label" class="metric-card" :data-tone="card.tone">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
      </article>
    </div>

    <section class="content-panel site-management-panel">
      <div class="site-onboarding-strip">
        <div>
          <span class="hero-eyebrow">{{ t('sites.onboardingEyebrow') }}</span>
          <h3>{{ t('sites.onboardingTitle') }}</h3>
          <p>{{ t('sites.onboardingBody') }}</p>
        </div>
        <ol class="site-step-list">
          <li>{{ t('sites.connectStepOne') }}</li>
          <li>{{ t('sites.connectStepTwo') }}</li>
          <li>{{ t('sites.connectStepThree') }}</li>
        </ol>
      </div>

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
        <template #emptyText>
          <div class="site-empty-state">
            <strong>{{ t('sites.empty') }}</strong>
            <span>{{ t('sites.emptyHint') }}</span>
            <a-button type="primary" :loading="isLoading" @click="loadSites">
              {{ t('sites.refresh') }}
            </a-button>
          </div>
        </template>
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
            <div class="site-action-buttons">
              <a-button type="link" @click="openSiteDetail(record.raw)">
                {{ t('common.viewDetails') }}
              </a-button>
              <a-button
                v-if="record.status === 'connected'"
                type="link"
                @click="router.push({ path: '/app/site-audit', query: { siteId: record.id } })"
              >
                {{ t('nav.siteAudit') }}
              </a-button>
              <a-button
                type="link"
                danger
                :loading="isDeleting && deletingSiteId === record.id"
                :disabled="isDeleting"
                @click.stop="openDeleteConfirm(record.raw)"
              >
                {{ t('sites.delete') }}
              </a-button>
            </div>
          </template>
        </template>
      </a-table>
    </section>

    <a-modal
      :open="Boolean(selectedSite)"
      :title="selectedSite?.name || t('sites.detailTitle')"
      :footer="null"
      width="640px"
      @cancel="selectedSite = null"
    >
      <a-spin :spinning="isDetailLoading">
        <div v-if="selectedSite" class="site-detail-panel">
          <dl class="detail-list">
            <dt>{{ t('sites.siteUrl') }}</dt>
            <dd>
              <a :href="selectedSite.siteUrl" target="_blank" rel="noopener noreferrer">
                {{ selectedSite.siteUrl }}
              </a>
            </dd>

            <dt>{{ t('sites.platform') }}</dt>
            <dd>{{ platformLabels[selectedSite.platform] }}</dd>

            <dt>{{ t('sites.status') }}</dt>
            <dd>
              <a-tag :color="selectedSite.status === 'connected' ? 'blue' : 'default'">
                {{
                  selectedSite.status === 'connected'
                    ? t('sites.statusConnected')
                    : t('sites.statusRevoked')
                }}
              </a-tag>
            </dd>

            <dt>{{ t('sites.lastSync') }}</dt>
            <dd>{{ formatDateTime(selectedSite.lastSyncAt) }}</dd>

            <dt>{{ t('sites.articlesSynced') }}</dt>
            <dd>{{ selectedSite.lastSyncStats?.articlesReceived ?? 0 }}</dd>

            <dt>{{ t('sites.mediaSynced') }}</dt>
            <dd>{{ selectedSite.lastSyncStats?.mediaReceived ?? 0 }}</dd>

            <dt>{{ t('sites.writebackStatus') }}</dt>
            <dd>
              <a-tag :color="selectedSite.wordpressApplicationPasswordConfigured ? 'green' : 'orange'">
                {{
                  selectedSite.wordpressApplicationPasswordConfigured
                    ? t('sites.configured')
                    : t('sites.notConfigured')
                }}
              </a-tag>
            </dd>

            <dt>{{ t('sites.analyticsStatus') }}</dt>
            <dd>
              <a-tag :color="selectedSite.googleAnalyticsPropertyId ? 'green' : 'orange'">
                {{
                  selectedSite.googleAnalyticsPropertyId
                    ? t('sites.configured')
                    : t('sites.notConfigured')
                }}
              </a-tag>
            </dd>
          </dl>

          <div class="site-detail-actions">
            <a-button type="primary" @click="goToSitePage('/app/site-audit', selectedSite.id)">
              {{ t('sites.openSiteAudit') }}
            </a-button>
            <a-button @click="goToSitePage('/app/tasks', selectedSite.id)">
              {{ t('sites.openTaskQueue') }}
            </a-button>
            <a-button @click="goToSitePage('/app/media', selectedSite.id)">
              {{ t('sites.openMediaOptimization') }}
            </a-button>
          </div>
        </div>
      </a-spin>
    </a-modal>

    <a-modal
      :open="Boolean(sitePendingDelete)"
      :title="t('sites.deleteConfirm')"
      :ok-text="t('sites.deleteConfirm')"
      ok-type="danger"
      :cancel-text="t('common.cancel')"
      :confirm-loading="isDeleting"
      :closable="!isDeleting"
      :keyboard="!isDeleting"
      :mask-closable="!isDeleting"
      centered
      @ok="confirmDeleteSite"
      @cancel="closeDeleteConfirm"
    >
      <div v-if="sitePendingDelete" class="site-delete-confirm">
        <strong>{{ sitePendingDelete.name }}</strong>
        <span>{{ sitePendingDelete.siteUrl }}</span>
        <p>{{ t('sites.deleteWarning') }}</p>
      </div>
    </a-modal>
  </section>
</template>
