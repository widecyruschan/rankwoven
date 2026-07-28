<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { TableColumnsType } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import {
  applyOptimizationSuggestion,
  batchApplyOptimizationSuggestions,
  getApplyQueue,
  getSiteConnections,
  rollbackApplySnapshot,
  type ApplySnapshot,
  type OptimizationSuggestion,
  type SiteConnection,
  type SyncTask
} from '../api/siteConnections';

const { t } = useI18n();

const sites = ref<SiteConnection[]>([]);
const selectedSiteId = ref('');
const suggestions = ref<OptimizationSuggestion[]>([]);
const tasks = ref<SyncTask[]>([]);
const snapshots = ref<ApplySnapshot[]>([]);
const activeTab = ref('approved');
const isLoading = ref(false);
const actionId = ref('');
const loadError = ref('');
const actionMessage = ref('');
const actionError = ref('');
const selectedSuggestionIds = ref<Set<string>>(new Set());
const diffSuggestion = ref<OptimizationSuggestion | null>(null);
const isBatchApplying = ref(false);
const batchApplyResult = ref('');

const connectedSites = computed(() => sites.value.filter((site) => site.status === 'connected'));
const siteOptions = computed(() =>
  connectedSites.value.map((site) => ({
    label: site.name,
    value: site.id
  }))
);

const approvedSuggestions = computed(() =>
  suggestions.value.filter((suggestion) => suggestion.status === 'approved')
);

const isApprovedTab = computed(() => activeTab.value === 'approved');

const allApprovedSelected = computed(() => {
  if (!isApprovedTab.value || approvedSuggestions.value.length === 0) return false;
  return approvedSuggestions.value.every((s) => selectedSuggestionIds.value.has(s.id));
});

const someApprovedSelected = computed(() => {
  if (!isApprovedTab.value) return false;
  return approvedSuggestions.value.some((s) => selectedSuggestionIds.value.has(s.id));
});

const appliedSnapshots = computed(() =>
  snapshots.value.filter((snapshot) => snapshot.status === 'applied')
);
const visibleSuggestions = computed(() =>
  activeTab.value === 'approved'
    ? approvedSuggestions.value
    : suggestions.value.filter((suggestion) => suggestion.status !== 'approved')
);
const visibleTasks = computed(() =>
  tasks.value.filter((task) => task.scope === 'suggestion_apply' || task.scope === 'suggestion_rollback')
);

const summaryCards = computed(() => [
  { label: t('apply.approvedCount'), value: String(approvedSuggestions.value.length) },
  { label: t('apply.runningTasks'), value: String(visibleTasks.value.filter((task) => task.status === 'running').length) },
  { label: t('apply.deadLetters'), value: String(visibleTasks.value.filter((task) => task.status === 'dead_letter').length) },
  { label: t('apply.rollbackReady'), value: String(appliedSnapshots.value.length) }
]);

const suggestionColumns = computed<TableColumnsType<OptimizationSuggestion>>(() => [
  { title: t('apply.target'), dataIndex: 'targetCmsId', key: 'targetCmsId', width: 130 },
  { title: t('suggestions.type'), dataIndex: 'suggestionType', key: 'suggestionType', width: 170 },
  { title: t('apply.field'), dataIndex: 'fieldName', key: 'fieldName', width: 150 },
  { title: t('articleSuggestions.suggestion'), dataIndex: 'suggestedValue', key: 'suggestedValue' },
  { title: t('cmsAdapters.status'), dataIndex: 'status', key: 'status', width: 130 },
  { title: t('articles.action'), key: 'action', width: 220 }
]);

const taskColumns = computed<TableColumnsType<SyncTask>>(() => [
  { title: t('articleSync.taskScope'), dataIndex: 'scope', key: 'scope' },
  { title: t('cmsAdapters.status'), dataIndex: 'status', key: 'status', width: 130 },
  { title: t('apply.retries'), key: 'retries', width: 130 },
  { title: t('articleSync.taskTarget'), dataIndex: 'targetCmsId', key: 'targetCmsId', width: 140 },
  { title: t('tasks.failedReason'), dataIndex: 'errorMessage', key: 'errorMessage' }
]);

const snapshotColumns = computed<TableColumnsType<ApplySnapshot>>(() => [
  { title: t('apply.target'), dataIndex: 'targetCmsId', key: 'targetCmsId', width: 130 },
  { title: t('apply.field'), dataIndex: 'fieldName', key: 'fieldName', width: 140 },
  { title: t('cmsAdapters.status'), dataIndex: 'status', key: 'status', width: 130 },
  { title: t('apply.before'), dataIndex: 'beforeValue', key: 'beforeValue' },
  { title: t('apply.after'), dataIndex: 'afterValue', key: 'afterValue' },
  { title: t('apply.matchedAt'), dataIndex: 'matchedAt', key: 'matchedAt', width: 180 },
  { title: t('articles.action'), key: 'action', width: 150 }
]);

async function loadSites() {
  const result = await getSiteConnections();
  sites.value = result.sites;

  if (!selectedSiteId.value && connectedSites.value[0]) {
    selectedSiteId.value = connectedSites.value[0].id;
  }
}

async function loadApplyQueue() {
  if (!selectedSiteId.value) {
    suggestions.value = [];
    tasks.value = [];
    snapshots.value = [];
    return;
  }

  const result = await getApplyQueue(selectedSiteId.value);
  suggestions.value = result.suggestions;
  tasks.value = result.tasks;
  snapshots.value = result.snapshots;
  selectedSuggestionIds.value = new Set();
}

async function refreshPage() {
  isLoading.value = true;
  loadError.value = '';
  actionError.value = '';
  actionMessage.value = '';

  try {
    await loadSites();
    await loadApplyQueue();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('apply.loadFailed');
  } finally {
    isLoading.value = false;
  }
}

async function handleSiteChange() {
  isLoading.value = true;
  loadError.value = '';
  actionError.value = '';
  actionMessage.value = '';

  try {
    await loadApplyQueue();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('apply.loadFailed');
  } finally {
    isLoading.value = false;
  }
}

async function applySuggestion(suggestionId: string) {
  actionId.value = suggestionId;
  actionError.value = '';
  actionMessage.value = '';

  try {
    await applyOptimizationSuggestion(selectedSiteId.value, suggestionId);
    await loadApplyQueue();
    actionMessage.value = t('apply.taskCreated');
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : t('apply.actionFailed');
  } finally {
    actionId.value = '';
  }
}

async function handleBatchApply() {
  if (selectedSuggestionIds.value.size === 0) return;

  isBatchApplying.value = true;
  actionError.value = '';
  actionMessage.value = '';
  batchApplyResult.value = '';

  try {
    const ids = Array.from(selectedSuggestionIds.value);
    const result = await batchApplyOptimizationSuggestions(selectedSiteId.value, ids);
    await loadApplyQueue();
    batchApplyResult.value = `${t('apply.batchSucceeded')}: ${result.succeeded} / ${result.total}`;

    if (result.failed > 0) {
      actionError.value = `${t('apply.batchFailed')}: ${result.failed} ${t('apply.items')}`;
    }
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : t('apply.actionFailed');
  } finally {
    isBatchApplying.value = false;
  }
}

function toggleSelectAll() {
  if (!isApprovedTab.value) return;

  if (allApprovedSelected.value) {
    selectedSuggestionIds.value = new Set();
  } else {
    selectedSuggestionIds.value = new Set(approvedSuggestions.value.map((s) => s.id));
  }
}

function showDiff(suggestion: OptimizationSuggestion) {
  diffSuggestion.value = suggestion;
}

function closeDiff() {
  diffSuggestion.value = null;
}

async function rollbackSnapshot(snapshotId: string) {
  actionId.value = snapshotId;
  actionError.value = '';
  actionMessage.value = '';

  try {
    await rollbackApplySnapshot(selectedSiteId.value, snapshotId);
    await loadApplyQueue();
    actionMessage.value = t('apply.rollbackTaskCreated');
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : t('apply.actionFailed');
  } finally {
    actionId.value = '';
  }
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    approved: 'blue',
    applied: 'green',
    failed: 'red',
    queued: 'blue',
    running: 'gold',
    completed: 'green',
    dead_letter: 'red',
    created: 'blue',
    rolled_back: 'purple'
  };

  return colors[status] ?? 'default';
}

onMounted(() => {
  void refreshPage();
});
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('apply.title') }}</h2>
        <p>{{ t('apply.body') }}</p>
      </div>
      <div class="action-row">
        <a-select
          v-model:value="selectedSiteId"
          class="toolbar-select"
          :options="siteOptions"
          :disabled="isLoading || siteOptions.length === 0"
          @change="handleSiteChange"
        />
        <a-button :loading="isLoading" @click="refreshPage">{{ t('sites.refresh') }}</a-button>
      </div>
    </div>

    <div class="summary-grid compact-grid">
      <article v-for="item in summaryCards" :key="item.label" class="metric-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </div>

    <a-alert v-if="loadError" class="page-alert" type="error" show-icon :message="loadError" />
    <a-alert v-else-if="actionError" class="page-alert" type="error" show-icon :message="actionError" />
    <a-alert v-else-if="actionMessage" class="page-alert" type="success" show-icon :message="actionMessage" />
    <a-alert v-if="batchApplyResult" class="page-alert" type="info" show-icon :message="batchApplyResult" />

    <a-card class="section-card">
      <div class="card-toolbar">
        <a-tabs v-model:active-key="activeTab" class="card-tabs">
          <a-tab-pane key="approved" :tab="t('apply.readyTab')" />
          <a-tab-pane key="history" :tab="t('apply.historyTab')" />
        </a-tabs>

        <div v-if="isApprovedTab && approvedSuggestions.length > 0" class="batch-toolbar">
          <a-checkbox
            :checked="allApprovedSelected"
            :indeterminate="someApprovedSelected && !allApprovedSelected"
            @change="toggleSelectAll"
          >
            {{ t('common.selectAll') }}
          </a-checkbox>
          <a-button
            type="primary"
            size="small"
            :disabled="selectedSuggestionIds.size === 0"
            :loading="isBatchApplying"
            @click="handleBatchApply"
          >
            {{ t('apply.applySelected') }} ({{ selectedSuggestionIds.size }})
          </a-button>
        </div>
      </div>

      <a-table
        row-key="id"
        :columns="suggestionColumns"
        :data-source="visibleSuggestions"
        :loading="isLoading"
        :pagination="{ pageSize: 8 }"
        :row-selection="isApprovedTab ? {
          selectedRowKeys: Array.from(selectedSuggestionIds),
          onChange: (_keys: (string | number)[], rows: OptimizationSuggestion[]) => {
            selectedSuggestionIds = new Set(rows.map((r) => r.id));
          }
        } : undefined"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'suggestedValue'">
            <div class="table-subtext">{{ (record as OptimizationSuggestion).suggestedValue }}</div>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusColor((record as OptimizationSuggestion).status)">
              {{ (record as OptimizationSuggestion).status }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button
                type="link"
                size="small"
                @click="showDiff(record as OptimizationSuggestion)"
              >
                {{ t('apply.viewDiff') }}
              </a-button>
              <a-button
                v-if="(record as OptimizationSuggestion).status === 'approved'"
                type="link"
                :loading="actionId === (record as OptimizationSuggestion).id"
                @click="applySuggestion((record as OptimizationSuggestion).id)"
              >
                {{ t('apply.applyOne') }}
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-card class="section-card" :title="t('apply.taskQueue')">
      <a-table
        row-key="id"
        :columns="taskColumns"
        :data-source="visibleTasks"
        :loading="isLoading"
        :pagination="{ pageSize: 6 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="getStatusColor((record as SyncTask).status)">
              {{ (record as SyncTask).status }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'retries'">
            {{ (record as SyncTask).retryCount }} / {{ (record as SyncTask).maxRetries }}
          </template>
          <template v-else-if="column.key === 'errorMessage'">
            {{ (record as SyncTask).errorMessage || '--' }}
          </template>
        </template>
      </a-table>
    </a-card>

    <a-card class="section-card" :title="t('apply.snapshots')">
      <a-table
        row-key="id"
        :columns="snapshotColumns"
        :data-source="snapshots"
        :loading="isLoading"
        :pagination="{ pageSize: 6 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="getStatusColor((record as ApplySnapshot).status)">
              {{ (record as ApplySnapshot).status }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'beforeValue' || column.key === 'afterValue'">
            <div class="table-subtext">
              {{ String((record as ApplySnapshot)[column.key as 'beforeValue' | 'afterValue'] ?? '--') }}
            </div>
          </template>
          <template v-else-if="column.key === 'matchedAt'">
            <span v-if="(record as ApplySnapshot).matchedAt" class="table-subtext">
              {{ new Date((record as ApplySnapshot).matchedAt!).toLocaleString() }}
            </span>
            <span v-else class="table-subtext muted">--</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button
              v-if="(record as ApplySnapshot).status === 'applied'"
              type="link"
              :loading="actionId === (record as ApplySnapshot).id"
              @click="rollbackSnapshot((record as ApplySnapshot).id)"
            >
              {{ t('apply.rollbackOne') }}
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      :open="Boolean(diffSuggestion)"
      :title="diffSuggestion ? `${t('apply.viewDiff')} - ${diffSuggestion.fieldName}` : ''"
      :footer="null"
      width="720"
      @cancel="closeDiff"
    >
      <template v-if="diffSuggestion">
        <div class="diff-panel">
          <div class="diff-section">
            <h4>{{ t('apply.before') }}</h4>
            <div class="diff-box diff-before">
              <pre>{{ diffSuggestion.currentValue || t('apply.noData') }}</pre>
            </div>
          </div>
          <div class="diff-section">
            <h4>{{ t('apply.after') }}</h4>
            <div class="diff-box diff-after">
              <pre>{{ diffSuggestion.suggestedValue || t('apply.noData') }}</pre>
            </div>
          </div>
        </div>
        <div class="diff-detail">
          <dl class="detail-list">
            <dt>{{ t('apply.target') }}</dt>
            <dd>{{ diffSuggestion.targetCmsId }}</dd>
            <dt>{{ t('suggestions.type') }}</dt>
            <dd>{{ diffSuggestion.suggestionType }}</dd>
            <dt>{{ t('apply.field') }}</dt>
            <dd>{{ diffSuggestion.fieldName }}</dd>
            <dt>{{ t('cmsAdapters.status') }}</dt>
            <dd>
              <a-tag :color="getStatusColor(diffSuggestion.status)">
                {{ diffSuggestion.status }}
              </a-tag>
            </dd>
          </dl>
        </div>
        <div v-if="diffSuggestion.status === 'approved'" class="diff-actions">
          <a-button
            type="primary"
            :loading="actionId === diffSuggestion.id"
            @click="applySuggestion(diffSuggestion.id); closeDiff()"
          >
            {{ t('apply.applyOne') }}
          </a-button>
        </div>
      </template>
    </a-modal>
  </section>
</template>

<style scoped>
.card-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.card-tabs {
  flex: 1;
  min-width: 0;
}

.card-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

.batch-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.page-heading-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.diff-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.diff-section h4 {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
}

.diff-box {
  border-radius: 6px;
  padding: 12px;
  min-height: 60px;
  max-height: 300px;
  overflow: auto;
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.diff-box pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.diff-before {
  background-color: #fff1f0;
  border: 1px solid #ffa39e;
}

.diff-after {
  background-color: #f6ffed;
  border: 1px solid #b7eb8f;
}

.diff-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.filter-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 12px;
}
</style>
