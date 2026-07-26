<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import {
  getSiteConnections,
  getSyncedMedia,
  type MediaListParams,
  type PaginationMeta,
  type SiteConnection,
  type SyncedMedia
} from '../api/siteConnections';

const { t } = useI18n();

const sites = ref<SiteConnection[]>([]);
const selectedSiteId = ref('');
const activeTab = ref('all');
const searchKeyword = ref('');
const media = ref<SyncedMedia[]>([]);
const pagination = ref<PaginationMeta>({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0
});
const isLoading = ref(false);
const errorMessage = ref('');
const selectedMedia = ref<SyncedMedia | null>(null);

const siteOptions = computed(() =>
  sites.value.map((site) => ({
    label: site.name,
    value: site.id
  }))
);

const activeIssue = computed<MediaListParams['issue']>(() => {
  if (activeTab.value === 'missing-alt') {
    return 'missing_alt';
  }

  if (activeTab.value === 'filename') {
    return 'missing_file_name';
  }

  return undefined;
});

const columns = computed<TableColumnsType<SyncedMedia>>(() => [
  {
    title: t('media.file'),
    dataIndex: 'fileName',
    key: 'fileName'
  },
  {
    title: t('media.imageTitleMeta'),
    dataIndex: 'title',
    key: 'title'
  },
  {
    title: t('media.altText'),
    dataIndex: 'altText',
    key: 'altText'
  },
  {
    title: t('media.mimeType'),
    dataIndex: 'mimeType',
    key: 'mimeType',
    width: 160
  },
  {
    title: t('articles.action'),
    key: 'action',
    width: 120
  }
]);

const tablePagination = computed<TablePaginationConfig>(() => ({
  current: pagination.value.page,
  pageSize: pagination.value.pageSize,
  total: pagination.value.total,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total) => t('common.totalItems', { total })
}));

async function loadSites() {
  const result = await getSiteConnections();
  sites.value = result.sites;
  selectedSiteId.value = selectedSiteId.value || result.sites[0]?.id || '';
}

async function loadMedia(nextPage = pagination.value.page, nextPageSize = pagination.value.pageSize) {
  if (!selectedSiteId.value) {
    media.value = [];
    pagination.value = {
      page: 1,
      pageSize: nextPageSize,
      total: 0,
      totalPages: 0
    };
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    const result = await getSyncedMedia(selectedSiteId.value, {
      page: nextPage,
      pageSize: nextPageSize,
      search: searchKeyword.value,
      issue: activeIssue.value
    });
    media.value = result.media;
    pagination.value = result.pagination;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('media.loadFailed');
  } finally {
    isLoading.value = false;
  }
}

function handleTableChange(nextPagination: TablePaginationConfig) {
  void loadMedia(nextPagination.current ?? 1, nextPagination.pageSize ?? pagination.value.pageSize);
}

function handleSearch(value: string) {
  searchKeyword.value = value;
  void loadMedia(1, pagination.value.pageSize);
}

function openMedia(record: SyncedMedia) {
  selectedMedia.value = record;
}

onMounted(async () => {
  try {
    await loadSites();
    await loadMedia();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('media.loadFailed');
  }
});

watch([selectedSiteId, activeTab], () => {
  void loadMedia(1, pagination.value.pageSize);
});
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('media.title') }}</h2>
        <p>{{ t('media.body') }}</p>
      </div>
      <div class="filter-toolbar">
        <a-select
          v-model:value="selectedSiteId"
          class="toolbar-select"
          :options="siteOptions"
          :placeholder="t('media.selectSite')"
        />
        <a-input-search
          v-model:value="searchKeyword"
          class="toolbar-input"
          :placeholder="t('media.searchPlaceholder')"
          allow-clear
          @search="handleSearch"
        />
        <a-button type="primary" :loading="isLoading" @click="loadMedia(1, pagination.pageSize)">
          {{ t('sites.refresh') }}
        </a-button>
      </div>
    </div>

    <a-alert v-if="errorMessage" class="page-alert" type="error" show-icon :message="errorMessage" />

    <section class="content-panel">
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="all" :tab="t('articles.filterAll')" />
        <a-tab-pane key="missing-alt" :tab="t('media.missingAlt')" />
        <a-tab-pane key="filename" :tab="t('media.filenameTab')" />
      </a-tabs>

      <a-table
        row-key="cmsId"
        :columns="columns"
        :data-source="media"
        :loading="isLoading"
        :pagination="tablePagination"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'fileName'">
            <strong>{{ record.fileName || record.title || t('common.untitled') }}</strong>
            <div class="table-subtext">{{ record.url }}</div>
          </template>
          <template v-else-if="column.key === 'title'">
            <span>{{ record.title || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'altText'">
            <span>{{ record.altText || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'mimeType'">
            <a-tag>{{ record.mimeType || '-' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" @click="openMedia(record)">
              {{ t('media.inspect') }}
            </a-button>
          </template>
        </template>
      </a-table>
    </section>

    <a-modal
      :open="Boolean(selectedMedia)"
      :title="selectedMedia?.fileName || selectedMedia?.title || t('common.untitled')"
      :footer="null"
      @cancel="selectedMedia = null"
    >
      <dl v-if="selectedMedia" class="detail-list">
        <dt>{{ t('articleSync.cmsId') }}</dt>
        <dd>{{ selectedMedia.cmsId }}</dd>
        <dt>{{ t('media.imageTitleMeta') }}</dt>
        <dd>{{ selectedMedia.title || '-' }}</dd>
        <dt>{{ t('media.altText') }}</dt>
        <dd>{{ selectedMedia.altText || '-' }}</dd>
        <dt>{{ t('media.filename') }}</dt>
        <dd>{{ selectedMedia.fileName || '-' }}</dd>
      </dl>
    </a-modal>
  </section>
</template>
