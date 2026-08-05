<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import {
  applyOptimizationSuggestion,
  approveOptimizationSuggestion,
  createSeoAudit,
  getOptimizationSuggestions,
  getSiteConnections,
  getSyncedMedia,
  scanSiteMedia,
  updateOptimizationSuggestion,
  type OptimizationSuggestion,
  type PaginationMeta,
  type SiteConnection,
  type SuggestionStatus,
  type SyncedMedia
} from '../api/siteConnections';

const { t } = useI18n();

type MediaFieldName = 'title' | 'caption' | 'description' | 'altText' | 'fileName';

interface MediaSuggestionRow {
  key: MediaFieldName;
  fieldLabel: string;
  currentValue: string;
  suggestion?: OptimizationSuggestion;
}

const mediaFieldOrder: MediaFieldName[] = ['title', 'caption', 'description', 'altText', 'fileName'];

const sites = ref<SiteConnection[]>([]);
const selectedSiteId = ref('');
const searchKeyword = ref('');
const media = ref<SyncedMedia[]>([]);
const mediaSuggestions = ref<OptimizationSuggestion[]>([]);
const pagination = ref<PaginationMeta>({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0
});
const isLoading = ref(false);
const isScanning = ref(false);
const actionSuggestionId = ref('');
const errorMessage = ref('');
const successMessage = ref('');
const selectedMedia = ref<SyncedMedia | null>(null);
const suggestionDrafts = ref<Record<string, string>>({});
const activeReviewField = ref<MediaFieldName | null>(null);

const selectedSite = computed(() => sites.value.find((site) => site.id === selectedSiteId.value));
const canScanSelectedSite = computed(() =>
  Boolean(selectedSite.value && selectedSite.value.wordpressApplicationPasswordConfigured)
);

const siteOptions = computed(() =>
  sites.value.map((site) => ({
    label: site.name,
    value: site.id
  }))
);

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
    title: t('media.seoStatus'),
    key: 'seoStatus',
    width: 170
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

const detailColumns = computed<TableColumnsType<MediaSuggestionRow>>(() => [
  {
    title: t('media.field'),
    dataIndex: 'fieldLabel',
    key: 'fieldLabel',
    width: 140
  },
  {
    title: t('articleSuggestions.current'),
    dataIndex: 'currentValue',
    key: 'currentValue'
  },
  {
    title: t('articleSuggestions.suggestion'),
    key: 'suggestion'
  },
  {
    title: t('cmsAdapters.status'),
    key: 'status',
    width: 130
  },
  {
    title: t('media.openReviewColumn'),
    key: 'action',
    width: 160
  }
]);

const mediaSuggestionSummary = computed(() => [
  {
    label: t('media.titleField'),
    value: countSuggestionsByType('title')
  },
  {
    label: t('media.caption'),
    value: countSuggestionsByField('caption')
  },
  {
    label: t('media.description'),
    value: countSuggestionsByField('description')
  },
  {
    label: t('media.altText'),
    value: countSuggestionsByField('altText')
  },
  {
    label: t('media.filename'),
    value: countSuggestionsByField('fileName')
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

const selectedMediaSuggestionRows = computed<MediaSuggestionRow[]>(() => {
  const currentMedia = selectedMedia.value;
  if (!currentMedia) {
    return [];
  }

  const suggestionMap = new Map<string, OptimizationSuggestion>();
  for (const suggestion of getSuggestionsForMedia(currentMedia.cmsId)) {
    if (!suggestionMap.has(suggestion.fieldName)) {
      suggestionMap.set(suggestion.fieldName, suggestion);
    }
  }

  return mediaFieldOrder.map((fieldName) => ({
    key: fieldName,
    fieldLabel: getMediaFieldLabel(fieldName),
    currentValue: getMediaCurrentValue(currentMedia, fieldName) || '-',
    suggestion: suggestionMap.get(fieldName)
  }));
});

const activeReviewRow = computed<MediaSuggestionRow | undefined>(() => {
  if (!activeReviewField.value) {
    return undefined;
  }

  return selectedMediaSuggestionRows.value.find((row) => row.key === activeReviewField.value);
});

async function loadSites() {
  const result = await getSiteConnections();
  sites.value = result.sites.filter((site) => site.status === 'connected');
  selectedSiteId.value = selectedSiteId.value || sites.value[0]?.id || '';
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
      search: searchKeyword.value
    });
    media.value = result.media;
    pagination.value = result.pagination;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('media.loadFailed');
  } finally {
    isLoading.value = false;
  }
}

async function loadSuggestions() {
  if (!selectedSiteId.value) {
    mediaSuggestions.value = [];
    return;
  }

  try {
    const targetCmsIds = media.value.map((item) => item.cmsId);
    if (targetCmsIds.length === 0) {
      mediaSuggestions.value = [];
      return;
    }

    const result = await getOptimizationSuggestions(selectedSiteId.value, {
      targetType: 'media',
      targetCmsIds,
      limit: Math.max(targetCmsIds.length * mediaFieldOrder.length, 50)
    });
    mediaSuggestions.value = result.suggestions.filter((suggestion) => suggestion.targetType === 'media');
    if (selectedMedia.value) {
      refreshSuggestionDrafts(selectedMedia.value.cmsId);
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('media.loadSuggestionsFailed');
  }
}

async function refreshPageData(nextPage = pagination.value.page, nextPageSize = pagination.value.pageSize) {
  await loadMedia(nextPage, nextPageSize);
  await loadSuggestions();
}

async function scanAndAnalyzeMedia() {
  if (!selectedSiteId.value) {
    errorMessage.value = t('media.selectSiteRequired');
    return;
  }

  if (!canScanSelectedSite.value) {
    errorMessage.value = t('media.credentialsRequired');
    return;
  }

  isScanning.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const scanResult = await scanSiteMedia(selectedSiteId.value);
    const auditResult = await createSeoAudit(selectedSiteId.value);
    const mediaIssueCount = auditResult.issues.filter((issue) => issue.targetType === 'media').length;

    successMessage.value = t('media.scanSuccess', {
      media: scanResult.mediaReceived,
      articles: scanResult.articlesReceived,
      suggestions: mediaIssueCount
    });
    await refreshPageData(1, pagination.value.pageSize);
    refreshSuggestionDrafts();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('media.scanFailed');
  } finally {
    isScanning.value = false;
  }
}

async function approveSuggestion(suggestionId: string) {
  if (!selectedSiteId.value) {
    return;
  }

  actionSuggestionId.value = suggestionId;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    await approveOptimizationSuggestion(selectedSiteId.value, suggestionId);
    successMessage.value = t('media.approveSuccess');
    await loadSuggestions();
    refreshSuggestionDrafts();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('media.approveFailed');
  } finally {
    actionSuggestionId.value = '';
  }
}

async function saveSuggestionDraft(suggestion: OptimizationSuggestion) {
  if (!selectedSiteId.value) {
    return;
  }

  const nextValue = suggestionDrafts.value[suggestion.id]?.trim() ?? '';
  if (nextValue === '' || nextValue === suggestion.suggestedValue) {
    return;
  }

  actionSuggestionId.value = suggestion.id;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    await updateOptimizationSuggestion(selectedSiteId.value, suggestion.id, nextValue);
    successMessage.value = t('media.saveDraftSuccess');
    await loadSuggestions();
    refreshSuggestionDrafts();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('media.saveDraftFailed');
  } finally {
    actionSuggestionId.value = '';
  }
}

async function applySuggestion(suggestionId: string) {
  if (!selectedSiteId.value) {
    return;
  }

  actionSuggestionId.value = suggestionId;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    await applyOptimizationSuggestion(selectedSiteId.value, suggestionId);
    successMessage.value = t('media.applyQueued');
    await loadSuggestions();
    refreshSuggestionDrafts();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('media.applyFailed');
  } finally {
    actionSuggestionId.value = '';
  }
}

function handleTableChange(nextPagination: TablePaginationConfig) {
  void refreshPageData(nextPagination.current ?? 1, nextPagination.pageSize ?? pagination.value.pageSize);
}

function handleSearch(value: string) {
  searchKeyword.value = value;
  void refreshPageData(1, pagination.value.pageSize);
}

function openMedia(record: SyncedMedia) {
  selectedMedia.value = record;
  activeReviewField.value = null;
  refreshSuggestionDrafts(record.cmsId);
}

function closeMediaModal() {
  selectedMedia.value = null;
  activeReviewField.value = null;
}

function openSuggestionReview(row: MediaSuggestionRow) {
  if (!row.suggestion) {
    return;
  }

  activeReviewField.value = row.key;
}

function getSuggestionsForMedia(cmsId: string) {
  return mediaSuggestions.value.filter((suggestion) => suggestion.targetCmsId === cmsId);
}

function refreshSuggestionDrafts(targetCmsId = selectedMedia.value?.cmsId) {
  if (!targetCmsId) {
    suggestionDrafts.value = {};
    return;
  }

  suggestionDrafts.value = Object.fromEntries(
    getSuggestionsForMedia(targetCmsId).map((suggestion) => [suggestion.id, suggestion.suggestedValue])
  );
}

function countSuggestionsByField(fieldName: MediaFieldName) {
  return mediaSuggestions.value.filter(
    (suggestion) => suggestion.fieldName === fieldName && ['pending', 'approved', 'failed'].includes(suggestion.status)
  ).length;
}

function countSuggestionsByType(fieldName: MediaFieldName) {
  return countSuggestionsByField(fieldName);
}

function getMediaStatus(record: SyncedMedia) {
  const suggestions = getSuggestionsForMedia(record.cmsId);
  const actionableCount = suggestions.filter((suggestion) => ['pending', 'approved', 'failed'].includes(suggestion.status)).length;

  if (suggestions.some((suggestion) => suggestion.status === 'failed')) {
    return {
      color: 'red',
      label: t('tasks.statusFailed'),
      count: actionableCount
    };
  }

  if (suggestions.some((suggestion) => ['pending', 'approved'].includes(suggestion.status))) {
    return {
      color: 'gold',
      label: t('media.statusReview'),
      count: actionableCount
    };
  }

  if (suggestions.some((suggestion) => suggestion.status === 'applied')) {
    return {
      color: 'green',
      label: t('suggestions.statusApplied'),
      count: suggestions.filter((suggestion) => suggestion.status === 'applied').length
    };
  }

  return {
    color: 'green',
    label: t('media.statusReady'),
    count: 0
  };
}

function getSuggestionStatusLabel(status?: SuggestionStatus) {
  if (!status) {
    return t('media.noSuggestions');
  }

  const labels: Record<SuggestionStatus, string> = {
    pending: t('tasks.statusWaiting'),
    approved: t('suggestions.statusApproved'),
    applied: t('suggestions.statusApplied'),
    failed: t('tasks.statusFailed'),
    rejected: t('suggestions.statusRejected')
  };

  return labels[status];
}

function getMediaFieldLabel(fieldName: MediaFieldName) {
  const labels: Record<MediaFieldName, string> = {
    title: t('media.titleField'),
    caption: t('media.caption'),
    description: t('media.description'),
    altText: t('media.altText'),
    fileName: t('media.filename')
  };

  return labels[fieldName];
}

function getMediaCurrentValue(record: SyncedMedia, fieldName: MediaFieldName) {
  if (fieldName === 'fileName') {
    return record.fileName ?? '';
  }

  if (fieldName === 'caption') {
    return record.caption ?? '';
  }

  if (fieldName === 'description') {
    return record.description ?? '';
  }

  if (fieldName === 'altText') {
    return record.altText ?? '';
  }

  return record.title ?? '';
}

function getSuggestionDraftValue(suggestion?: OptimizationSuggestion) {
  if (!suggestion) {
    return '';
  }

  return suggestionDrafts.value[suggestion.id] ?? suggestion.suggestedValue;
}

function getSuggestionPreview(suggestion?: OptimizationSuggestion) {
  const value = getSuggestionDraftValue(suggestion).trim();
  if (value === '') {
    return '';
  }

  return value.length > 88 ? `${value.slice(0, 88).trim()}...` : value;
}

function isSuggestionDirty(suggestion?: OptimizationSuggestion) {
  if (!suggestion) {
    return false;
  }

  return getSuggestionDraftValue(suggestion).trim() !== suggestion.suggestedValue;
}

function isLongTextField(fieldName: MediaFieldName) {
  return fieldName === 'caption' || fieldName === 'description';
}

onMounted(async () => {
  try {
    await loadSites();
    await refreshPageData();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('media.loadFailed');
  }
});

watch(selectedSiteId, () => {
  selectedMedia.value = null;
  activeReviewField.value = null;
  suggestionDrafts.value = {};
  successMessage.value = '';
  errorMessage.value = '';
  void refreshPageData(1, pagination.value.pageSize);
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
        <a-button
          type="primary"
          :disabled="!selectedSiteId || !canScanSelectedSite"
          :loading="isScanning"
          @click="scanAndAnalyzeMedia"
        >
          {{ t('media.scanAction') }}
        </a-button>
      </div>
    </div>

    <a-alert v-if="successMessage" class="page-alert" type="success" show-icon :message="successMessage" />
    <a-alert v-if="errorMessage" class="page-alert" type="error" show-icon :message="errorMessage" />

    <section class="content-panel">
      <div class="filter-toolbar">
        <a-tag v-for="item in mediaSuggestionSummary" :key="item.label" color="blue">
          {{ item.label }}: {{ item.value }}
        </a-tag>
      </div>

      <a-empty
        v-if="!isLoading && media.length === 0"
        :description="selectedSiteId ? t('media.emptyDescription') : t('media.selectSiteRequired')"
      >
        <a-button
          type="primary"
          :disabled="!selectedSiteId || !canScanSelectedSite"
          :loading="isScanning"
          @click="scanAndAnalyzeMedia"
        >
          {{ t('media.scanAction') }}
        </a-button>
      </a-empty>

      <a-table
        v-else
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
            <div>{{ record.title || '-' }}</div>
            <div class="table-subtext">{{ record.caption || record.description || '-' }}</div>
          </template>
          <template v-else-if="column.key === 'altText'">
            <span>{{ record.altText || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'seoStatus'">
            <a-tag :color="getMediaStatus(record).color">{{ getMediaStatus(record).label }}</a-tag>
            <div v-if="getMediaStatus(record).count > 0" class="table-subtext">
              {{ t('media.suggestionCount', { count: getMediaStatus(record).count }) }}
            </div>
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
      :width="960"
      @cancel="closeMediaModal"
    >
      <div v-if="selectedMedia" class="page-alert">
        <a-tag>{{ t('articleSync.cmsId') }}: {{ selectedMedia.cmsId }}</a-tag>
        <a-tag v-if="selectedMedia.attachedToTitle">
          {{ t('media.attachedTo') }}: {{ selectedMedia.attachedToTitle }}
        </a-tag>
        <a-tag v-else-if="selectedMedia.attachedToCmsId">
          {{ t('media.attachedTo') }} #{{ selectedMedia.attachedToCmsId }}
        </a-tag>
      </div>

      <a-table
        v-if="selectedMedia"
        row-key="key"
        :columns="detailColumns"
        :data-source="selectedMediaSuggestionRows"
        :pagination="false"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'currentValue'">
            <span>{{ record.currentValue || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'suggestion'">
            <div v-if="record.suggestion">
              <div>{{ getSuggestionPreview(record.suggestion) || '-' }}</div>
              <div v-if="record.suggestion.errorMessage" class="table-subtext">{{ record.suggestion.errorMessage }}</div>
            </div>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.suggestion?.status === 'failed' ? 'red' : record.suggestion?.status === 'approved' ? 'blue' : record.suggestion?.status === 'applied' ? 'green' : 'default'">
              {{ getSuggestionStatusLabel(record.suggestion?.status) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button
              v-if="record.suggestion"
              type="link"
              size="small"
              @click="openSuggestionReview(record)"
            >
              {{ t('media.openReview') }}
            </a-button>
            <span v-else>-</span>
          </template>
        </template>
      </a-table>
    </a-modal>

    <a-modal
      :open="Boolean(activeReviewRow?.suggestion)"
      :title="activeReviewRow ? `${activeReviewRow.fieldLabel} · ${selectedMedia?.fileName || selectedMedia?.title || t('common.untitled')}` : t('media.reviewTitle')"
      :footer="null"
      :width="720"
      @cancel="activeReviewField = null"
    >
      <template v-if="activeReviewRow?.suggestion">
        <div class="page-alert">
          <a-tag>{{ getSuggestionStatusLabel(activeReviewRow.suggestion.status) }}</a-tag>
        </div>

        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item :label="t('articleSuggestions.current')">
            {{ activeReviewRow.currentValue || '-' }}
          </a-descriptions-item>
          <a-descriptions-item :label="t('media.reviewSuggestionLabel')">
            <a-textarea
              v-if="isLongTextField(activeReviewRow.key)"
              v-model:value="suggestionDrafts[activeReviewRow.suggestion.id]"
              :auto-size="{ minRows: 4, maxRows: 8 }"
            />
            <a-input
              v-else
              v-model:value="suggestionDrafts[activeReviewRow.suggestion.id]"
            />
            <div class="table-subtext">{{ t('media.reviewHint') }}</div>
            <div v-if="activeReviewRow.suggestion.errorMessage" class="table-subtext">{{ activeReviewRow.suggestion.errorMessage }}</div>
          </a-descriptions-item>
        </a-descriptions>

        <div class="filter-toolbar">
          <a-button @click="activeReviewField = null">
            {{ t('common.cancel') }}
          </a-button>
          <a-button
            v-if="isSuggestionDirty(activeReviewRow.suggestion)"
            :loading="actionSuggestionId === activeReviewRow.suggestion.id"
            @click="saveSuggestionDraft(activeReviewRow.suggestion)"
          >
            {{ t('media.saveDraft') }}
          </a-button>
          <a-button
            v-if="activeReviewRow.suggestion.status === 'pending'"
            :loading="actionSuggestionId === activeReviewRow.suggestion.id"
            @click="approveSuggestion(activeReviewRow.suggestion.id)"
          >
            {{ t('articleSuggestions.approve') }}
          </a-button>
          <a-button
            v-if="activeReviewRow.suggestion.status === 'approved'"
            type="primary"
            :loading="actionSuggestionId === activeReviewRow.suggestion.id"
            @click="applySuggestion(activeReviewRow.suggestion.id)"
          >
            {{ t('media.queueApply') }}
          </a-button>
        </div>
      </template>
    </a-modal>
  </section>
</template>
