<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
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

const selectedSiteOptions = computed(() => sites.value.filter((site) => site.status === 'connected'));
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
const articleChanges = computed(() =>
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
        <select v-model="selectedSiteId" :disabled="isLoading || selectedSiteOptions.length === 0" @change="handleSiteChange">
          <option v-for="site in selectedSiteOptions" :key="site.id" :value="site.id">
            {{ site.name }}
          </option>
        </select>
        <select v-model="selectedTargetKey" :disabled="isLoading || groupedTargets.length === 0">
          <option v-for="target in groupedTargets" :key="target.key" :value="target.key">
            {{ target.label }}
          </option>
        </select>
        <button class="primary-button" type="button" :disabled="currentTargetSuggestions.every((suggestion) => suggestion.status !== 'approved')" @click="applyApprovedSuggestions">
          {{ t('articleSuggestions.applyApproved') }}
        </button>
      </div>
    </div>

    <div class="prototype-grid">
      <section class="content-panel panel-wide">
        <div v-if="loadError" class="form-message form-message-error">{{ loadError }}</div>
        <div v-else-if="actionError" class="form-message form-message-error">{{ actionError }}</div>
        <div v-else-if="actionMessage" class="form-message">{{ actionMessage }}</div>

        <div class="data-table" role="table">
          <div class="data-row data-head" role="row">
            <span>{{ t('articleSuggestions.area') }}</span>
            <span>{{ t('articleSuggestions.current') }}</span>
            <span>{{ t('articleSuggestions.suggestion') }}</span>
            <span>{{ t('articleSuggestions.impact') }}</span>
            <span>{{ t('cmsAdapters.status') }}</span>
            <span>{{ t('articles.action') }}</span>
          </div>
          <div v-if="isLoading" class="data-row" role="row">
            <strong>{{ t('suggestions.loading') }}</strong>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span class="status-pill">{{ t('tasks.statusRunning') }}</span>
            <span>--</span>
          </div>
          <div v-else-if="articleChanges.length === 0" class="data-row" role="row">
            <strong>{{ t('suggestions.empty') }}</strong>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span class="status-pill">{{ t('suggestions.statusReady') }}</span>
            <span>--</span>
          </div>
          <div v-for="change in articleChanges" v-else :key="change.id" class="data-row" role="row">
            <strong>{{ change.area }}</strong>
            <span>{{ change.current }}</span>
            <span>{{ change.suggestion }}</span>
            <span>{{ change.impact }}</span>
            <span class="status-pill">{{ change.status }}</span>
            <span class="action-row">
              <button
                v-if="change.canApprove"
                class="text-button"
                type="button"
                :disabled="actionSuggestionId === change.id"
                @click="approveSuggestion(change.id)"
              >
                {{ t('articleSuggestions.approve') }}
              </button>
              <button
                v-if="change.canApply"
                class="text-button"
                type="button"
                :disabled="actionSuggestionId === change.id"
                @click="applySuggestion(change.id)"
              >
                {{ t('apply.applyOne') }}
              </button>
            </span>
          </div>
        </div>
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
