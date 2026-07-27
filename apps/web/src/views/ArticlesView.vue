<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import {
  getSiteConnections,
  getSyncedArticles,
  type ArticleListParams,
  type PaginationMeta,
  type SiteConnection,
  type SyncedArticle
} from '../api/siteConnections';
import SearchConsolePanel from '@/components/SearchConsolePanel.vue';

const { t } = useI18n();

const sites = ref<SiteConnection[]>([]);
const selectedSiteId = ref('');
const activeTab = ref('all');
const searchKeyword = ref('');
const statusFilter = ref<string | undefined>();
const articles = ref<SyncedArticle[]>([]);
const pagination = ref<PaginationMeta>({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0
});
const isLoading = ref(false);
const errorMessage = ref('');
const selectedArticle = ref<SyncedArticle | null>(null);

const siteOptions = computed(() =>
  sites.value.map((site) => ({
    label: site.name,
    value: site.id
  }))
);

const selectedSite = computed(() =>
  sites.value.find((s) => s.id === selectedSiteId.value)
);

const statusOptions = computed(() => [
  {
    label: t('articles.statusAll'),
    value: ''
  },
  {
    label: 'publish',
    value: 'publish'
  },
  {
    label: 'draft',
    value: 'draft'
  },
  {
    label: 'private',
    value: 'private'
  }
]);

const activeIssue = computed<ArticleListParams['issue']>(() => {
  if (activeTab.value === 'needs-review') {
    return 'missing_meta';
  }

  if (activeTab.value === 'quick-wins') {
    return 'missing_featured_image';
  }

  return undefined;
});

const columns = computed<TableColumnsType<SyncedArticle>>(() => [
  {
    title: t('articles.article'),
    dataIndex: 'title',
    key: 'title'
  },
  {
    title: t('articles.status'),
    dataIndex: 'status',
    key: 'status',
    width: 120
  },
  {
    title: t('articles.metaDescription'),
    dataIndex: 'metaDescription',
    key: 'metaDescription'
  },
  {
    title: t('articles.updatedAt'),
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 180
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

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
}

async function loadSites() {
  const result = await getSiteConnections();
  sites.value = result.sites;
  selectedSiteId.value = selectedSiteId.value || result.sites[0]?.id || '';
}

async function loadArticles(nextPage = pagination.value.page, nextPageSize = pagination.value.pageSize) {
  if (!selectedSiteId.value) {
    articles.value = [];
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
    const result = await getSyncedArticles(selectedSiteId.value, {
      page: nextPage,
      pageSize: nextPageSize,
      search: searchKeyword.value,
      status: statusFilter.value,
      issue: activeIssue.value
    });
    articles.value = result.articles;
    pagination.value = result.pagination;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('articles.loadFailed');
  } finally {
    isLoading.value = false;
  }
}

function handleTableChange(nextPagination: TablePaginationConfig) {
  void loadArticles(nextPagination.current ?? 1, nextPagination.pageSize ?? pagination.value.pageSize);
}

function handleSearch(value: string) {
  searchKeyword.value = value;
  void loadArticles(1, pagination.value.pageSize);
}

function openArticle(article: SyncedArticle) {
  selectedArticle.value = article;
}

onMounted(async () => {
  try {
    await loadSites();
    await loadArticles();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('articles.loadFailed');
  }
});

watch([selectedSiteId, activeTab], () => {
  void loadArticles(1, pagination.value.pageSize);
});

watch(statusFilter, () => {
  void loadArticles(1, pagination.value.pageSize);
});
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('articles.title') }}</h2>
        <p>{{ t('articles.body') }}</p>
      </div>
      <div class="filter-toolbar">
        <a-select
          v-model:value="selectedSiteId"
          class="toolbar-select"
          :options="siteOptions"
          :placeholder="t('articles.selectSite')"
        />
        <a-input-search
          v-model:value="searchKeyword"
          class="toolbar-input"
          :placeholder="t('articles.searchPlaceholder')"
          allow-clear
          @search="handleSearch"
        />
        <a-select
          v-model:value="statusFilter"
          class="toolbar-select toolbar-select-small"
          :options="statusOptions"
          :placeholder="t('articles.status')"
          allow-clear
        />
        <a-button type="primary" :loading="isLoading" @click="loadArticles(1, pagination.pageSize)">
          {{ t('sites.refresh') }}
        </a-button>
      </div>
    </div>

    <a-alert v-if="errorMessage" class="page-alert" type="error" show-icon :message="errorMessage" />

    <section class="content-panel">
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="all" :tab="t('articles.filterAll')" />
        <a-tab-pane key="needs-review" :tab="t('articles.filterNeedsReview')" />
        <a-tab-pane key="quick-wins" :tab="t('articles.filterQuickWins')" />
      </a-tabs>

      <a-table
        row-key="cmsId"
        :columns="columns"
        :data-source="articles"
        :loading="isLoading"
        :pagination="tablePagination"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'title'">
            <strong>{{ record.title || t('common.untitled') }}</strong>
            <div class="table-subtext">{{ record.url || record.slug }}</div>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag>{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'metaDescription'">
            <span>{{ record.metaDescription || record.excerpt || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'updatedAt'">
            <span>{{ formatDate(record.updatedAt) }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" @click="openArticle(record)">
              {{ t('articles.action') }}
            </a-button>
          </template>
        </template>
      </a-table>
    </section>

    <a-modal
      :open="Boolean(selectedArticle)"
      :title="selectedArticle?.title || t('common.untitled')"
      :footer="null"
      @cancel="selectedArticle = null"
    >
      <dl v-if="selectedArticle" class="detail-list">
        <dt>{{ t('articles.cmsId') }}</dt>
        <dd>{{ selectedArticle.cmsId }}</dd>
        <dt>{{ t('articles.metaDescription') }}</dt>
        <dd>{{ selectedArticle.metaDescription || '-' }}</dd>
        <dt>{{ t('articles.author') }}</dt>
        <dd>{{ selectedArticle.author || '-' }}</dd>
        <dt>{{ t('articles.updatedAt') }}</dt>
        <dd>{{ formatDate(selectedArticle.updatedAt) }}</dd>
      </dl>
    </a-modal>

    <!-- GSC Keywords for selected site -->
    <SearchConsolePanel
      v-if="selectedSiteId"
      :key="selectedSiteId"
      :site-url="selectedSite?.siteUrl"
      :compact="true"
    />
  </section>
</template>
