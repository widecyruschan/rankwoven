<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import type { TableColumnsType } from 'ant-design-vue';
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

interface SuggestionRow {
  id: string;
  target: string;
  type: string;
  priority: string;
  changes: string;
  status: string;
  canApprove: boolean;
  canApply: boolean;
  suggestedValue: string;
  errorMessage?: string;
}

const selectedSiteOptions = computed(() => sites.value.filter((site) => site.status === 'connected'));
const selectedSiteSelectOptions = computed(() =>
  selectedSiteOptions.value.map((site) => ({
    label: site.name,
    value: site.id
  }))
);

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

const workflowProgressChartOption = computed<EChartsOption>(() => ({
  color: ['#1677ff'],
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'none' },
    valueFormatter: (value) => `${value}%`
  },
  grid: { top: 10, right: 64, bottom: 8, left: 70 },
  xAxis: {
    type: 'value',
    max: 100,
    show: false
  },
  yAxis: {
    type: 'category',
    inverse: true,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: '#475467',
      fontSize: 13,
      fontWeight: 700,
      margin: 14
    },
    data: [
      t('dashboard.pipelineScan'),
      t('dashboard.pipelineGenerate'),
      t('dashboard.pipelineReview'),
      t('dashboard.pipelineApply'),
      t('dashboard.pipelineDone')
    ]
  },
  series: [
    {
      name: t('suggestions.workflowChartTitle'),
      type: 'bar',
      barWidth: 10,
      showBackground: true,
      backgroundStyle: {
        color: '#f2f4f7',
        borderRadius: 999
      },
      label: {
        show: true,
        position: 'right',
        color: '#1f2937',
        fontSize: 13,
        fontWeight: 800,
        formatter: '{c}%'
      },
      itemStyle: {
        borderRadius: 999
      },
      data: [100, 64, 38, 22, 18]
    }
  ]
}));

const suggestionRows = computed<SuggestionRow[]>(() =>
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

const suggestionColumns = computed<TableColumnsType<SuggestionRow>>(() => [
  {
    title: t('articles.article'),
    dataIndex: 'target',
    key: 'target'
  },
  {
    title: t('suggestions.type'),
    dataIndex: 'type',
    key: 'type'
  },
  {
    title: t('suggestions.priority'),
    dataIndex: 'priority',
    key: 'priority'
  },
  {
    title: t('suggestions.changes'),
    dataIndex: 'changes',
    key: 'changes'
  },
  {
    title: t('cmsAdapters.status'),
    dataIndex: 'status',
    key: 'status'
  },
  {
    title: t('articles.action'),
    key: 'action',
    width: 220
  }
]);

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
        <a-select
          v-model:value="selectedSiteId"
          class="toolbar-select"
          :disabled="isLoading || selectedSiteOptions.length === 0"
          :options="selectedSiteSelectOptions"
          @change="handleSiteChange"
        />
        <a-button
          :loading="isAuditing"
          :disabled="isLoading || !selectedSiteId"
          @click="runSeoAudit"
        >
          {{ isAuditing ? t('suggestions.auditRunning') : t('suggestions.runAudit') }}
        </a-button>
        <RouterLink class="primary-button" to="/app/article-suggestions">{{ t('suggestions.openArticle') }}</RouterLink>
      </div>
    </div>

    <div class="summary-grid compact-grid">
      <article v-for="item in queues" :key="item.label" class="metric-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </div>

    <a-card class="section-card workflow-chart-card" :title="t('suggestions.workflowChartTitle')">
      <template #extra>
        <span>{{ t('dashboard.syncProgress') }}</span>
      </template>
      <AnalyticsChart :option="workflowProgressChartOption" height="280px" />
    </a-card>

    <section class="content-panel">
      <div v-if="loadError" class="form-message form-message-error">{{ loadError }}</div>
      <div v-else-if="actionError" class="form-message form-message-error">{{ actionError }}</div>
      <div v-else-if="actionMessage" class="form-message">{{ actionMessage }}</div>

      <a-table
        row-key="id"
        :columns="suggestionColumns"
        :data-source="suggestionRows"
        :loading="isLoading"
        :pagination="{ pageSize: 10 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'target'">
            <strong>{{ record.target }}</strong>
            <div class="table-subtext">{{ record.suggestedValue }}</div>
          </template>
          <template v-else-if="column.key === 'priority'">
            <a-tag>{{ record.priority }}</a-tag>
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
              <RouterLink class="text-button" to="/app/article-suggestions">{{ t('suggestions.review') }}</RouterLink>
            </div>
          </template>
        </template>
      </a-table>
    </section>
  </section>
</template>
