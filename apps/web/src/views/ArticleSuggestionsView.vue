<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { TableColumnsType } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import {
  applyOptimizationSuggestion,
  approveOptimizationSuggestion,
  getOptimizationSuggestions,
  getSiteConnections,
  type OptimizationSuggestion,
  type SiteConnection,
  type SuggestionStatus
} from '../api/siteConnections';

const { t } = useI18n();

const sites = ref<SiteConnection[]>([]);
const suggestions = ref<OptimizationSuggestion[]>([]);
const selectedSiteId = ref('');
const selectedTargetKey = ref('');
const isLoading = ref(false);
const actionSuggestionId = ref('');
const loadError = ref('');
const actionMessage = ref('');
const actionError = ref('');

interface ArticleChangeRow {
  id: string;
  area: string;
  current: string;
  suggestion: string;
  impact: string;
  status: string;
  canApprove: boolean;
  canApply: boolean;
}

const selectedSiteOptions = computed(() => sites.value.filter((site) => site.status === 'connected'));
const selectedSiteSelectOptions = computed(() =>
  selectedSiteOptions.value.map((site) => ({
    label: site.name,
    value: site.id
  }))
);
const groupedTargets = computed(() => {
  const groups = new Map<string, OptimizationSuggestion[]>();

  for (const suggestion of suggestions.value) {
    const key = `${suggestion.targetType}:${suggestion.targetCmsId}`;
    groups.set(key, [...(groups.get(key) ?? []), suggestion]);
  }

  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    label: `${items[0]?.targetType === 'media' ? t('articleSuggestions.mediaBlock') : t('articles.article')} #${items[0]?.targetCmsId}`,
    items
  }));
});
const currentTargetSuggestions = computed(() => {
  const selectedGroup = groupedTargets.value.find((group) => group.key === selectedTargetKey.value);
  return selectedGroup?.items ?? [];
});
const targetOptions = computed(() =>
  groupedTargets.value.map((target) => ({
    label: target.label,
    value: target.key
  }))
);
const articleChanges = computed<ArticleChangeRow[]>(() =>
  currentTargetSuggestions.value.map((suggestion) => ({
    id: suggestion.id,
    area: getAreaLabel(suggestion),
    current: suggestion.currentValue || '--',
    suggestion: suggestion.suggestedValue,
    impact: getImpactLabel(suggestion),
    status: getStatusLabel(suggestion.status),
    canApprove: suggestion.status === 'pending',
    canApply: suggestion.status === 'approved'
  }))
);
const reviewNotes = computed(() => [
  t('articleSuggestions.noteSnapshot'),
  t('articleSuggestions.noteDiff'),
  t('articleSuggestions.noteCms')
]);
const scoreLabel = computed(() => {
  const completedCount = currentTargetSuggestions.value.filter((suggestion) =>
    ['approved', 'applied'].includes(suggestion.status)
  ).length;
  const totalCount = currentTargetSuggestions.value.length;
  const currentScore = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return `SEO ${currentScore}`;
});

const changeColumns = computed<TableColumnsType<ArticleChangeRow>>(() => [
  {
    title: t('articleSuggestions.area'),
    dataIndex: 'area',
    key: 'area'
  },
  {
    title: t('articleSuggestions.current'),
    dataIndex: 'current',
    key: 'current'
  },
  {
    title: t('articleSuggestions.suggestion'),
    dataIndex: 'suggestion',
    key: 'suggestion'
  },
  {
    title: t('articleSuggestions.impact'),
    dataIndex: 'impact',
    key: 'impact',
    width: 110
  },
  {
    title: t('cmsAdapters.status'),
    dataIndex: 'status',
    key: 'status',
    width: 130
  },
  {
    title: t('articles.action'),
    key: 'action',
    width: 160
  }
]);

function getAreaLabel(suggestion: OptimizationSuggestion) {
  if (suggestion.fieldName === 'title') {
    return t('review.titleField');
  }

  if (suggestion.fieldName === 'metaDescription') {
    return t('review.metaField');
  }

  if (suggestion.fieldName === 'altText') {
    return t('media.altText');
  }

  if (suggestion.fieldName === 'fileName') {
    return t('media.filename');
  }

  return suggestion.targetType === 'media' ? t('articleSuggestions.mediaBlock') : t('articleSuggestions.contentBlock');
}

function getImpactLabel(suggestion: OptimizationSuggestion) {
  if (suggestion.status === 'failed') {
    return t('tasks.statusFailed');
  }

  return suggestion.targetType === 'media' || suggestion.fieldName === 'title' ? '+22%' : '+12%';
}

function getStatusLabel(status: SuggestionStatus) {
  const labels: Record<SuggestionStatus, string> = {
    pending: t('tasks.statusWaiting'),
    approved: t('suggestions.statusApproved'),
    applied: t('suggestions.statusApplied'),
    failed: t('tasks.statusFailed'),
    rejected: t('suggestions.statusRejected')
  };

  return labels[status];
}

async function loadSitesAndSuggestions() {
  isLoading.value = true;
  loadError.value = '';
  actionMessage.value = '';
  actionError.value = '';

  try {
    const siteResult = await getSiteConnections();
    sites.value = siteResult.sites;

    if (!selectedSiteId.value && selectedSiteOptions.value[0]) {
      selectedSiteId.value = selectedSiteOptions.value[0].id;
    }

    await loadSuggestions();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('suggestions.loadFailed');
  } finally {
    isLoading.value = false;
  }
}

async function loadSuggestions() {
  if (!selectedSiteId.value) {
    suggestions.value = [];
    selectedTargetKey.value = '';
    return;
  }

  const result = await getOptimizationSuggestions(selectedSiteId.value);
  suggestions.value = result.suggestions;

  if (!selectedTargetKey.value || !groupedTargets.value.some((group) => group.key === selectedTargetKey.value)) {
    selectedTargetKey.value = groupedTargets.value[0]?.key ?? '';
  }
}

async function handleSiteChange() {
  isLoading.value = true;
  loadError.value = '';
  selectedTargetKey.value = '';

  try {
    await loadSuggestions();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('suggestions.loadFailed');
  } finally {
    isLoading.value = false;
  }
}

async function approveSuggestion(suggestionId: string) {
  await runSuggestionAction(suggestionId, async () => {
    const result = await approveOptimizationSuggestion(selectedSiteId.value, suggestionId);
    replaceSuggestion(result.suggestion);
    actionMessage.value = t('suggestions.approved');
  });
}

async function applySuggestion(suggestionId: string) {
  await runSuggestionAction(suggestionId, async () => {
    const result = await applyOptimizationSuggestion(selectedSiteId.value, suggestionId);
    if (result.suggestion) {
      replaceSuggestion(result.suggestion);
    }
    actionMessage.value = t('suggestions.applyTaskCreated');
  });
}

async function applyApprovedSuggestions() {
  const approvedSuggestions = currentTargetSuggestions.value.filter((suggestion) => suggestion.status === 'approved');

  for (const suggestion of approvedSuggestions) {
    await applySuggestion(suggestion.id);
  }
}

async function runSuggestionAction(suggestionId: string, action: () => Promise<void>) {
  actionSuggestionId.value = suggestionId;
  actionMessage.value = '';
  actionError.value = '';

  try {
    await action();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : t('suggestions.actionFailed');
  } finally {
    actionSuggestionId.value = '';
  }
}

function replaceSuggestion(nextSuggestion: OptimizationSuggestion) {
  suggestions.value = suggestions.value.map((suggestion) =>
    suggestion.id === nextSuggestion.id ? nextSuggestion : suggestion
  );
}

onMounted(() => {
  void loadSitesAndSuggestions();
});
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('articleSuggestions.title') }}</h2>
        <p>{{ t('articleSuggestions.body') }}</p>
      </div>
      <div class="action-row">
        <a-select
          v-model:value="selectedSiteId"
          class="toolbar-select"
          :disabled="isLoading || selectedSiteOptions.length === 0"
          :options="selectedSiteSelectOptions"
          @change="handleSiteChange"
        />
        <a-select
          v-model:value="selectedTargetKey"
          class="toolbar-select"
          :disabled="isLoading || groupedTargets.length === 0"
          :options="targetOptions"
        />
        <a-button type="primary" :disabled="currentTargetSuggestions.every((suggestion) => suggestion.status !== 'approved')" @click="applyApprovedSuggestions">
          {{ t('articleSuggestions.applyApproved') }}
        </a-button>
      </div>
    </div>

    <div class="prototype-grid">
      <section class="content-panel panel-wide">
        <div v-if="loadError" class="form-message form-message-error">{{ loadError }}</div>
        <div v-else-if="actionError" class="form-message form-message-error">{{ actionError }}</div>
        <div v-else-if="actionMessage" class="form-message">{{ actionMessage }}</div>

        <a-table
          row-key="id"
          :columns="changeColumns"
          :data-source="articleChanges"
          :loading="isLoading"
          :pagination="{ pageSize: 10 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'area'">
              <strong>{{ record.area }}</strong>
            </template>
            <template v-else-if="column.key === 'current'">
              <span class="table-subtext">{{ record.current }}</span>
            </template>
            <template v-else-if="column.key === 'suggestion'">
              <span>{{ record.suggestion }}</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag>{{ record.status }}</a-tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <div class="action-row">
                <a-button
                  v-if="record.canApprove"
                  type="link"
                  :loading="actionSuggestionId === record.id"
                  @click="approveSuggestion(record.id)"
                >
                  {{ t('articleSuggestions.approve') }}
                </a-button>
                <a-button
                  v-if="record.canApply"
                  type="link"
                  :loading="actionSuggestionId === record.id"
                  @click="applySuggestion(record.id)"
                >
                  {{ t('apply.applyOne') }}
                </a-button>
              </div>
            </template>
          </template>
        </a-table>
      </section>

      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('articleSuggestions.reviewTitle') }}</h2>
          <span>{{ scoreLabel }}</span>
        </div>
        <ul class="check-list">
          <li v-for="note in reviewNotes" :key="note">{{ note }}</li>
        </ul>
      </section>
    </div>
  </section>
</template>
