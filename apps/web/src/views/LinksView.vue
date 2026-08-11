<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { TableColumnsType } from 'ant-design-vue';
import { Link2, RefreshCw, WandSparkles } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import {
  applyOptimizationSuggestion,
  approveOptimizationSuggestion,
  batchApplyOptimizationSuggestions,
  batchApproveOptimizationSuggestions,
  generateInternalLinkSuggestions,
  getOptimizationSuggestions,
  getSiteConnections,
  type OptimizationSuggestion,
  type SiteConnection
} from '../api/siteConnections';

const { t } = useI18n();

const sites = ref<SiteConnection[]>([]);
const selectedSiteId = ref('');
const suggestions = ref<OptimizationSuggestion[]>([]);
const selectedSuggestionIds = ref<string[]>([]);
const isLoading = ref(false);
const isGenerating = ref(false);
const isApplying = ref(false);
const actionSuggestionId = ref('');
const successMessage = ref('');
const errorMessage = ref('');

const selectedSite = computed(() => sites.value.find((site) => site.id === selectedSiteId.value));
const canGenerateLinks = computed(() =>
  Boolean(selectedSite.value && selectedSite.value.wordpressApplicationPasswordConfigured)
);

const siteOptions = computed(() =>
  sites.value.map((site) => ({
    label: site.name,
    value: site.id
  }))
);

const linkSuggestions = computed(() =>
  suggestions.value.filter((suggestion) => suggestion.suggestionType === 'internal_link')
);

const actionableSuggestions = computed(() =>
  linkSuggestions.value.filter((suggestion) => isActionableSuggestion(suggestion))
);

const selectedActionableSuggestions = computed(() => {
  const selectedIds = new Set(selectedSuggestionIds.value);
  return actionableSuggestions.value.filter((suggestion) => selectedIds.has(suggestion.id));
});

const summaryItems = computed(() => [
  { label: t('links.summaryPending'), value: countByStatus('pending') },
  { label: t('links.summaryApproved'), value: countByStatus('approved') },
  { label: t('links.summaryApplied'), value: countByStatus('applied') },
  { label: t('links.summaryFailed'), value: countByStatus('failed') }
]);

const columns = computed<TableColumnsType<OptimizationSuggestion>>(() => [
  {
    title: t('links.source'),
    key: 'source',
    width: 220
  },
  {
    title: t('links.target'),
    key: 'target',
    width: 220
  },
  {
    title: t('links.anchor'),
    key: 'anchor',
    width: 180
  },
  {
    title: t('links.relevance'),
    key: 'relevance',
    width: 120
  },
  {
    title: t('links.reason'),
    key: 'reason'
  },
  {
    title: t('cmsAdapters.status'),
    key: 'status',
    width: 130
  },
  {
    title: t('links.action'),
    key: 'action',
    width: 150
  }
]);

const rowSelection = computed(() => ({
  selectedRowKeys: selectedSuggestionIds.value,
  onChange: (keys: Array<string | number>) => {
    selectedSuggestionIds.value = keys.map(String);
  },
  getCheckboxProps: (record: OptimizationSuggestion) => ({
    disabled: !isActionableSuggestion(record),
    name: record.id
  })
}));

async function loadSites() {
  const result = await getSiteConnections();
  sites.value = result.sites.filter((site) => site.status === 'connected');
  selectedSiteId.value = selectedSiteId.value || sites.value[0]?.id || '';
}

async function loadSuggestions() {
  if (!selectedSiteId.value) {
    suggestions.value = [];
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    const result = await getOptimizationSuggestions(selectedSiteId.value, {
      targetType: 'article',
      limit: 500
    });
    suggestions.value = result.suggestions.filter((suggestion) => suggestion.suggestionType === 'internal_link');
    selectedSuggestionIds.value = selectedSuggestionIds.value.filter((id) =>
      suggestions.value.some((suggestion) => suggestion.id === id && isActionableSuggestion(suggestion))
    );
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('links.loadFailed');
  } finally {
    isLoading.value = false;
  }
}

async function generateSuggestions() {
  if (!selectedSiteId.value) {
    errorMessage.value = t('links.selectSiteRequired');
    return;
  }

  if (!canGenerateLinks.value) {
    errorMessage.value = t('links.credentialsRequired');
    return;
  }

  isGenerating.value = true;
  successMessage.value = '';
  errorMessage.value = '';

  try {
    const result = await generateInternalLinkSuggestions(selectedSiteId.value, 100);
    successMessage.value = t('links.generateSuccess', {
      count: result.generated,
      articles: result.articlesScanned
    });
    await loadSuggestions();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('links.generateFailed');
  } finally {
    isGenerating.value = false;
  }
}

async function applySuggestion(suggestion: OptimizationSuggestion) {
  if (!selectedSiteId.value) {
    return;
  }

  actionSuggestionId.value = suggestion.id;
  successMessage.value = '';
  errorMessage.value = '';

  try {
    let suggestionId = suggestion.id;
    if (suggestion.status === 'pending' || suggestion.status === 'failed') {
      const approveResult = await approveOptimizationSuggestion(selectedSiteId.value, suggestion.id);
      suggestionId = approveResult.suggestion.id;
    }

    await applyOptimizationSuggestion(selectedSiteId.value, suggestionId);
    successMessage.value = t('links.applyQueued');
    await loadSuggestions();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('links.applyFailed');
  } finally {
    actionSuggestionId.value = '';
  }
}

async function applySelectedSuggestions() {
  if (!selectedSiteId.value || selectedActionableSuggestions.value.length === 0) {
    return;
  }

  isApplying.value = true;
  successMessage.value = '';
  errorMessage.value = '';

  try {
    const suggestionIds = selectedActionableSuggestions.value.map((suggestion) => suggestion.id);
    const approveResult = await batchApproveOptimizationSuggestions(selectedSiteId.value, suggestionIds);
    const approvedIds = approveResult.results
      .filter((result) => result.success)
      .map((result) => result.suggestionId);

    if (approvedIds.length === 0) {
      errorMessage.value = t('links.batchApplyFailed');
      return;
    }

    const applyResult = await batchApplyOptimizationSuggestions(selectedSiteId.value, approvedIds);
    successMessage.value = t('links.batchApplySuccess', {
      succeeded: applyResult.succeeded,
      failed: approveResult.failed + applyResult.failed
    });
    selectedSuggestionIds.value = [];
    await loadSuggestions();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('links.batchApplyFailed');
  } finally {
    isApplying.value = false;
  }
}

function isActionableSuggestion(suggestion: OptimizationSuggestion) {
  return ['pending', 'approved', 'failed'].includes(suggestion.status) && suggestion.suggestedValue.trim() !== '';
}

function countByStatus(status: OptimizationSuggestion['status']) {
  return linkSuggestions.value.filter((suggestion) => suggestion.status === status).length;
}

function getMetadataValue(suggestion: OptimizationSuggestion, key: string) {
  const value = suggestion.metadata?.[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function getRelevance(suggestion: OptimizationSuggestion) {
  const rawValue = suggestion.metadata?.relevance;
  const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue ?? 0);
  return Number.isFinite(numericValue) ? Math.round(numericValue) : 0;
}

function getStatusColor(status: OptimizationSuggestion['status']) {
  const colors: Record<OptimizationSuggestion['status'], string> = {
    pending: 'gold',
    approved: 'blue',
    applied: 'green',
    failed: 'red',
    rejected: 'default'
  };

  return colors[status];
}

function getStatusLabel(status: OptimizationSuggestion['status']) {
  const labels: Record<OptimizationSuggestion['status'], string> = {
    pending: t('tasks.statusWaiting'),
    approved: t('suggestions.statusApproved'),
    applied: t('suggestions.statusApplied'),
    failed: t('tasks.statusFailed'),
    rejected: t('suggestions.statusRejected')
  };

  return labels[status];
}

onMounted(async () => {
  try {
    await loadSites();
    await loadSuggestions();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('links.loadFailed');
  }
});

watch(selectedSiteId, () => {
  selectedSuggestionIds.value = [];
  successMessage.value = '';
  errorMessage.value = '';
  void loadSuggestions();
});
</script>

<template>
  <section class="page-section">
    <div class="page-heading link-assistant-heading">
      <div>
        <span class="hero-eyebrow">{{ t('links.heroEyebrow') }}</span>
        <h2>{{ t('links.title') }}</h2>
        <p>{{ t('links.body') }}</p>
      </div>
      <div class="filter-toolbar">
        <a-select
          v-model:value="selectedSiteId"
          class="toolbar-select"
          :options="siteOptions"
          :placeholder="t('links.selectSite')"
        />
        <a-button :disabled="!selectedSiteId" @click="loadSuggestions">
          <template #icon>
            <RefreshCw :size="16" aria-hidden="true" />
          </template>
          {{ t('sites.refresh') }}
        </a-button>
        <a-button
          type="primary"
          :disabled="!selectedSiteId || !canGenerateLinks"
          :loading="isGenerating"
          @click="generateSuggestions"
        >
          <template #icon>
            <WandSparkles :size="16" aria-hidden="true" />
          </template>
          {{ t('links.generateAction') }}
        </a-button>
      </div>
      <div class="link-safety-card">
        <strong>{{ t('links.safeAppend') }}</strong>
        <span>{{ t('links.applyHint') }}</span>
      </div>
    </div>

    <a-alert v-if="successMessage" class="page-alert" type="success" show-icon :message="successMessage" />
    <a-alert v-if="errorMessage" class="page-alert" type="error" show-icon :message="errorMessage" />

    <section class="content-panel link-opportunity-panel">
      <div class="panel-heading">
        <div>
          <h2>{{ t('links.reviewQueue') }}</h2>
          <span>{{ t('links.heroBody') }}</span>
        </div>
      </div>
      <div class="filter-toolbar">
        <a-tag v-for="item in summaryItems" :key="item.label" color="blue">
          {{ item.label }}: {{ item.value }}
        </a-tag>
        <a-button
          type="primary"
          :disabled="selectedActionableSuggestions.length === 0"
          :loading="isApplying"
          @click="applySelectedSuggestions"
        >
          <template #icon>
            <Link2 :size="16" aria-hidden="true" />
          </template>
          {{ t('links.applySelected', { count: selectedActionableSuggestions.length }) }}
        </a-button>
      </div>

      <a-empty
        v-if="!isLoading && linkSuggestions.length === 0"
        :description="selectedSiteId ? t('links.emptyDescription') : t('links.selectSiteRequired')"
      >
        <a-button
          type="primary"
          :disabled="!selectedSiteId || !canGenerateLinks"
          :loading="isGenerating"
          @click="generateSuggestions"
        >
          {{ t('links.generateAction') }}
        </a-button>
      </a-empty>

      <a-table
        v-else
        row-key="id"
        :columns="columns"
        :data-source="linkSuggestions"
        :loading="isLoading"
        :pagination="{ pageSize: 20 }"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'source'">
            <strong>{{ getMetadataValue(record, 'sourceTitle') || t('common.untitled') }}</strong>
            <div class="table-subtext">{{ getMetadataValue(record, 'sourceType') }}</div>
          </template>
          <template v-else-if="column.key === 'target'">
            <strong>{{ getMetadataValue(record, 'targetTitle') || '-' }}</strong>
            <div class="table-subtext">{{ getMetadataValue(record, 'targetUrl') }}</div>
          </template>
          <template v-else-if="column.key === 'anchor'">
            <a-tag>{{ getMetadataValue(record, 'anchorText') || '-' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'relevance'">
            <a-progress :percent="getRelevance(record)" size="small" />
          </template>
          <template v-else-if="column.key === 'reason'">
            <span>{{ getMetadataValue(record, 'reason') || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">
              {{ getStatusLabel(record.status) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button
              v-if="isActionableSuggestion(record)"
              type="link"
              :loading="actionSuggestionId === record.id"
              @click="applySuggestion(record)"
            >
              {{ t('links.action') }}
            </a-button>
            <span v-else>-</span>
          </template>
        </template>
      </a-table>
    </section>
  </section>
</template>
