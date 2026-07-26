<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { TableColumnsType } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import {
  applyOptimizationSuggestion,
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
  { title: t('articles.action'), key: 'action', width: 150 }
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

    <a-card class="section-card">
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="approved" :tab="t('apply.readyTab')" />
        <a-tab-pane key="history" :tab="t('apply.historyTab')" />
      </a-tabs>

      <a-table
        row-key="id"
        :columns="suggestionColumns"
        :data-source="visibleSuggestions"
        :loading="isLoading"
        :pagination="{ pageSize: 8 }"
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
            <a-button
              v-if="(record as OptimizationSuggestion).status === 'approved'"
              type="link"
              :loading="actionId === (record as OptimizationSuggestion).id"
              @click="applySuggestion((record as OptimizationSuggestion).id)"
            >
              {{ t('apply.applyOne') }}
            </a-button>
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
  </section>
</template>
