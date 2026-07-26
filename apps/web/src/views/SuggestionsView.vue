<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { EChartsOption } from 'echarts';
import AnalyticsChart from '../components/AnalyticsChart.vue';
import {
  applyOptimizationSuggestion,
  approveOptimizationSuggestion,
  createSeoAudit,
  getOptimizationSuggestions,
  getSiteConnections,
  type OptimizationSuggestion,
  type SiteConnection,
  type SuggestionStatus,
  type SuggestionType
} from '../api/siteConnections';

const { t } = useI18n();

const sites = ref<SiteConnection[]>([]);
const suggestions = ref<OptimizationSuggestion[]>([]);
const selectedSiteId = ref('');
const isLoading = ref(false);
const isAuditing = ref(false);
const actionSuggestionId = ref('');
const loadError = ref('');
const actionMessage = ref('');
const actionError = ref('');

const selectedSiteOptions = computed(() => sites.value.filter((site) => site.status === 'connected'));

const queues = computed(() => [
  {
    label: t('suggestions.imageTitleMetaQueue'),
    value: String(countByType(['media_alt_text', 'media_file_name']))
  },
  {
    label: t('suggestions.contentQueue'),
    value: String(countByType(['title', 'meta_description', 'content']))
  },
  {
    label: t('suggestions.mediaQueue'),
    value: String(countByTarget('media'))
  }
]);

const suggestionStatusChartOption = computed<EChartsOption>(() => {
  const statusCounts = ['pending', 'approved', 'applied', 'failed', 'rejected'].map((status) => ({
    name: getStatusLabel(status as SuggestionStatus),
    value: suggestions.value.filter((suggestion) => suggestion.status === status).length
  }));

  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        name: t('suggestions.statusChartTitle'),
        type: 'pie',
        radius: ['48%', '70%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        data: statusCounts
      }
    ]
  };
});

const suggestionTypeChartOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { top: 20, right: 20, bottom: 36, left: 96 },
  xAxis: { type: 'value' },
  yAxis: {
    type: 'category',
    data: [
      t('suggestions.typeImageTitleMeta'),
      t('suggestions.typeContent'),
      t('suggestions.typeLinks')
    ].reverse()
  },
  series: [
    {
      name: t('suggestions.typeChartTitle'),
      type: 'bar',
      data: [
        countByType(['media_alt_text', 'media_file_name']),
        countByType(['title', 'meta_description', 'content']),
        countByType(['internal_link'])
      ].reverse()
    }
  ]
}));

const suggestionRows = computed(() =>
  suggestions.value.map((suggestion) => ({
    id: suggestion.id,
    target: `${getTargetLabel(suggestion)} #${suggestion.targetCmsId}`,
    type: getSuggestionTypeLabel(suggestion.suggestionType),
    priority: getPriorityLabel(suggestion),
    changes: suggestion.applyTaskId ? '1' : '--',
    status: getStatusLabel(suggestion.status),
    canApprove: suggestion.status === 'pending',
    canApply: suggestion.status === 'approved',
    suggestedValue: suggestion.suggestedValue,
    errorMessage: suggestion.errorMessage
  }))
);

function countByType(types: SuggestionType[]) {
  return suggestions.value.filter((suggestion) => types.includes(suggestion.suggestionType)).length;
}

function countByTarget(targetType: OptimizationSuggestion['targetType']) {
  return suggestions.value.filter((suggestion) => suggestion.targetType === targetType).length;
}

function getTargetLabel(suggestion: OptimizationSuggestion) {
  return suggestion.targetType === 'media' ? t('articleSuggestions.mediaBlock') : t('articles.article');
}

function getSuggestionTypeLabel(type: SuggestionType) {
  const labels: Record<SuggestionType, string> = {
    title: t('review.titleField'),
    meta_description: t('review.metaField'),
    content: t('suggestions.typeContent'),
    media_alt_text: t('media.altText'),
    media_file_name: t('media.filename'),
    internal_link: t('suggestions.typeLinks')
  };

  return labels[type];
}

function getPriorityLabel(suggestion: OptimizationSuggestion) {
  if (suggestion.status === 'failed') {
    return t('suggestions.high');
  }

  if (suggestion.targetType === 'media' || suggestion.suggestionType === 'title') {
    return t('suggestions.high');
  }

  return suggestion.suggestionType === 'internal_link' ? t('suggestions.low') : t('suggestions.medium');
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
    return;
  }

  const result = await getOptimizationSuggestions(selectedSiteId.value);
  suggestions.value = result.suggestions;
}

async function handleSiteChange() {
  isLoading.value = true;
  loadError.value = '';
  actionMessage.value = '';
  actionError.value = '';

  try {
    await loadSuggestions();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('suggestions.loadFailed');
  } finally {
    isLoading.value = false;
  }
}

async function runSeoAudit() {
  if (!selectedSiteId.value) {
    actionError.value = t('suggestions.noSiteSelected');
    return;
  }

  isAuditing.value = true;
  actionMessage.value = '';
  actionError.value = '';
  loadError.value = '';

  try {
    await createSeoAudit(selectedSiteId.value);
    await loadSuggestions();
    actionMessage.value = t('suggestions.auditCompleted');
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : t('suggestions.auditFailed');
  } finally {
    isAuditing.value = false;
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
        <h2>{{ t('suggestions.title') }}</h2>
        <p>{{ t('suggestions.body') }}</p>
      </div>
      <div class="action-row">
        <select v-model="selectedSiteId" :disabled="isLoading || selectedSiteOptions.length === 0" @change="handleSiteChange">
          <option v-for="site in selectedSiteOptions" :key="site.id" :value="site.id">
            {{ site.name }}
          </option>
        </select>
        <button
          class="secondary-button"
          type="button"
          :disabled="isLoading || isAuditing || !selectedSiteId"
          @click="runSeoAudit"
        >
          {{ isAuditing ? t('suggestions.auditRunning') : t('suggestions.runAudit') }}
        </button>
        <RouterLink class="primary-button" to="/app/article-suggestions">{{ t('suggestions.openArticle') }}</RouterLink>
      </div>
    </div>

    <div class="summary-grid compact-grid">
      <article v-for="item in queues" :key="item.label" class="metric-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </div>

    <a-row class="section-grid" :gutter="[16, 16]">
      <a-col :xs="24" :xl="10">
        <a-card :title="t('suggestions.statusChartTitle')">
          <AnalyticsChart :option="suggestionStatusChartOption" height="280px" />
        </a-card>
      </a-col>
      <a-col :xs="24" :xl="14">
        <a-card :title="t('suggestions.typeChartTitle')">
          <AnalyticsChart :option="suggestionTypeChartOption" height="280px" />
        </a-card>
      </a-col>
    </a-row>

    <section class="content-panel">
      <div v-if="loadError" class="form-message form-message-error">{{ loadError }}</div>
      <div v-else-if="actionError" class="form-message form-message-error">{{ actionError }}</div>
      <div v-else-if="actionMessage" class="form-message">{{ actionMessage }}</div>

      <div class="data-table" role="table">
        <div class="data-row data-head" role="row">
          <span>{{ t('articles.article') }}</span>
          <span>{{ t('suggestions.type') }}</span>
          <span>{{ t('suggestions.priority') }}</span>
          <span>{{ t('suggestions.changes') }}</span>
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
        <div v-else-if="suggestionRows.length === 0" class="data-row" role="row">
          <strong>{{ t('suggestions.empty') }}</strong>
          <span>--</span>
          <span>--</span>
          <span>--</span>
          <span class="status-pill">{{ t('suggestions.statusReady') }}</span>
          <span>--</span>
        </div>
        <div v-for="row in suggestionRows" v-else :key="row.id" class="data-row" role="row">
          <strong>{{ row.target }}</strong>
          <span>{{ row.type }}</span>
          <span class="tag-pill">{{ row.priority }}</span>
          <span>{{ row.changes }}</span>
          <span class="status-pill">{{ row.status }}</span>
          <span class="action-row">
            <button
              v-if="row.canApprove"
              class="text-button"
              type="button"
              :disabled="actionSuggestionId === row.id"
              @click="approveSuggestion(row.id)"
            >
              {{ t('articleSuggestions.approve') }}
            </button>
            <button
              v-if="row.canApply"
              class="text-button"
              type="button"
              :disabled="actionSuggestionId === row.id"
              @click="applySuggestion(row.id)"
            >
              {{ t('apply.applyOne') }}
            </button>
            <RouterLink class="text-button" to="/app/article-suggestions">{{ t('suggestions.review') }}</RouterLink>
          </span>
        </div>
      </div>
    </section>
  </section>
</template>
