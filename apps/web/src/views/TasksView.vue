<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Modal, message } from 'ant-design-vue';
import { DownOutlined } from '@ant-design/icons-vue';
import type { TableColumnsType } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import {
  getSyncTasks,
  retrySyncTask,
  ignoreDeadLetterTask,
  batchRetrySyncTasks,
  batchIgnoreDeadLetterTasks,
  exportSyncTasks,
  getDeadLetterStats,
  type SyncTask,
  type SyncTaskScope,
  type SyncTaskStatus,
  type DeadLetterStats
} from '../api/siteConnections';

const { t, locale } = useI18n();

const tasks = ref<SyncTask[]>([]);
const isLoading = ref(false);
const loadError = ref('');
const activeTab = ref('all');
const selectedTask = ref<SyncTask | null>(null);
const filterScope = ref<string>('');
const filterStatus = ref<string>('');
const autoRefreshEnabled = ref(true);
const retryingTaskIds = ref<Set<string>>(new Set());
const ignoringTaskIds = ref<Set<string>>(new Set());
const selectedRowKeys = ref<string[]>([]);
const isBatchLoading = ref(false);
const deadLetterStats = ref<DeadLetterStats | null>(null);
let autoRefreshTimer: number | null = null;

const AUTO_REFRESH_INTERVAL_MS = 15000;

const scopeOptions = [
  { label: t('tasks.scopeAll'), value: '' },
  { label: t('articleSync.fullTask'), value: 'full' },
  { label: t('articleSync.incrementalTask'), value: 'incremental' },
  { label: t('articleSync.manualArticleTask'), value: 'article' },
  { label: t('articleSync.manualMediaTask'), value: 'media' },
  { label: t('articleSync.suggestionApplyTask'), value: 'suggestion_apply' },
  { label: t('articleSync.suggestionRollbackTask'), value: 'suggestion_rollback' }
];

const statusOptions = [
  { label: t('tasks.allTab'), value: '' },
  { label: t('tasks.statusQueued'), value: 'queued' },
  { label: t('tasks.statusRunning'), value: 'running' },
  { label: t('tasks.statusFailed'), value: 'failed' },
  { label: t('tasks.statusDeadLetter'), value: 'dead_letter' },
  { label: t('tasks.statusDone'), value: 'completed' }
];

const taskRows = computed(() =>
  filteredTasks.value.map((task) => ({
    id: task.id,
    raw: task,
    task: getTaskName(task),
    site: task.siteName ?? task.siteId,
    statusValue: task.status,
    status: getStatusLabel(task.status),
    progress: getProgressPercent(task),
    eta: getTaskTimeLabel(task),
    detail: getTaskDetail(task),
    isDeadLetter: task.status === 'dead_letter',
    isRetryable: task.status === 'dead_letter' || task.status === 'failed'
  }))
);

const filteredTasks = computed(() =>
  tasks.value.filter((task) => activeTab.value === 'all' || task.status === activeTab.value)
);

const batchableRows = computed(() =>
  taskRows.value.filter((r) => r.isRetryable)
);

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys as string[];
  },
  getCheckboxProps: (record: { isRetryable: boolean; id: string }) => ({
    disabled: !record.isRetryable,
    name: record.id
  })
}));

const columns = computed<TableColumnsType<(typeof taskRows.value)[number]>>(() => [
  {
    title: t('tasks.task'),
    dataIndex: 'task',
    key: 'task'
  },
  {
    title: t('tasks.site'),
    dataIndex: 'site',
    key: 'site'
  },
  {
    title: t('tasks.status'),
    dataIndex: 'status',
    key: 'status',
    width: 130
  },
  {
    title: t('tasks.progress'),
    dataIndex: 'progress',
    key: 'progress',
    width: 180
  },
  {
    title: t('tasks.eta'),
    dataIndex: 'eta',
    key: 'eta',
    width: 180
  },
  {
    title: t('tasks.detail'),
    dataIndex: 'detail',
    key: 'detail'
  },
  {
    title: t('articles.action'),
    key: 'action',
    width: 150
  }
]);

function getTaskName(task: SyncTask) {
  const scopeLabels: Record<SyncTaskScope, string> = {
    full: t('articleSync.fullTask'),
    incremental: t('articleSync.incrementalTask'),
    article: t('articleSync.manualArticleTask'),
    media: t('articleSync.manualMediaTask'),
    suggestion_apply: t('articleSync.suggestionApplyTask'),
    suggestion_rollback: t('articleSync.suggestionRollbackTask')
  };

  return task.targetCmsId ? `${scopeLabels[task.scope]} #${task.targetCmsId}` : scopeLabels[task.scope];
}

function getStatusLabel(status: SyncTaskStatus) {
  const statusLabels: Record<SyncTaskStatus, string> = {
    queued: t('tasks.statusQueued'),
    running: t('tasks.statusRunning'),
    completed: t('tasks.statusDone'),
    failed: t('tasks.statusFailed'),
    dead_letter: t('tasks.statusDeadLetter')
  };

  return statusLabels[status];
}

function getProgressPercent(task: SyncTask) {
  if (task.status === 'completed' || task.status === 'failed' || task.status === 'dead_letter') {
    return 100;
  }

  if (task.status === 'running') {
    return Math.min(90, 35 + task.batchesReceived * 15);
  }

  return 15;
}

function getProgressStatus(status: SyncTaskStatus) {
  if (status === 'failed' || status === 'dead_letter') {
    return 'exception';
  }

  if (status === 'completed') {
    return 'success';
  }

  return 'active';
}

function getStatusColor(status: SyncTaskStatus) {
  const statusColors: Record<SyncTaskStatus, string> = {
    queued: 'default',
    running: 'processing',
    completed: 'success',
    failed: 'error',
    dead_letter: 'error'
  };

  return statusColors[status];
}

function getTaskTimeLabel(task: SyncTask) {
  if (task.completedAt) {
    return formatDateTime(task.completedAt);
  }

  if (task.status === 'queued') {
    return t('tasks.statusQueued');
  }

  return formatDateTime(task.createdAt);
}

function getTaskDetail(task: SyncTask) {
  if (task.status === 'failed' || task.status === 'dead_letter') {
    return task.errorMessage || t('tasks.noErrorMessage');
  }

  return t('tasks.batchSummary', {
    batches: task.batchesReceived,
    articles: task.articlesReceived,
    media: task.mediaReceived
  });
}

function formatDateTime(value?: string) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

async function loadTasks() {
  isLoading.value = true;
  loadError.value = '';

  try {
    const result = await getSyncTasks({
      scope: (filterScope.value || undefined) as SyncTaskScope | undefined,
      status: (filterStatus.value || undefined) as SyncTaskStatus | undefined
    });
    tasks.value = result.tasks;
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('tasks.loadFailed');
  } finally {
    isLoading.value = false;
  }
}

async function loadDeadLetterStats() {
  try {
    const result = await getDeadLetterStats();
    deadLetterStats.value = result;
  } catch {
    // Silently ignore stats load failures
  }
}

async function handleRetry(taskId: string) {
  retryingTaskIds.value = new Set([...retryingTaskIds.value, taskId]);
  try {
    await retrySyncTask(taskId);
    selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== taskId);
    await Promise.all([loadTasks(), loadDeadLetterStats()]);
  } catch {
    void message.error(t('tasks.retryFailed'));
  } finally {
    const next = new Set(retryingTaskIds.value);
    next.delete(taskId);
    retryingTaskIds.value = next;
  }
}

async function handleIgnore(taskId: string) {
  ignoringTaskIds.value = new Set([...ignoringTaskIds.value, taskId]);
  try {
    await ignoreDeadLetterTask(taskId);
    selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== taskId);
    await Promise.all([loadTasks(), loadDeadLetterStats()]);
  } catch {
    void message.error(t('tasks.ignoreFailed'));
  } finally {
    const next = new Set(ignoringTaskIds.value);
    next.delete(taskId);
    ignoringTaskIds.value = next;
  }
}

async function handleBatchRetry() {
  if (!selectedRowKeys.value.length) {
    void message.warning(t('tasks.emptySelected'));
    return;
  }

  Modal.confirm({
    title: t('tasks.batchRetry'),
    content: t('tasks.batchRetryConfirm', { count: selectedRowKeys.value.length }),
    onOk: async () => {
      isBatchLoading.value = true;
      try {
        await batchRetrySyncTasks(selectedRowKeys.value);
        void message.success(t('tasks.batchRetrySuccess', { count: selectedRowKeys.value.length }));
        selectedRowKeys.value = [];
        await Promise.all([loadTasks(), loadDeadLetterStats()]);
      } catch {
        void message.error(t('tasks.batchActionFailed'));
      } finally {
        isBatchLoading.value = false;
      }
    }
  });
}

async function handleBatchIgnore() {
  if (!selectedRowKeys.value.length) {
    void message.warning(t('tasks.emptySelected'));
    return;
  }

  const deadLetterOnly = selectedRowKeys.value.filter(
    (id) => filteredTasks.value.find((t) => t.id === id)?.status === 'dead_letter'
  );

  if (!deadLetterOnly.length) {
    void message.warning(t('tasks.emptySelected'));
    return;
  }

  Modal.confirm({
    title: t('tasks.batchIgnore'),
    content: t('tasks.batchIgnoreConfirm', { count: deadLetterOnly.length }),
    onOk: async () => {
      isBatchLoading.value = true;
      try {
        await batchIgnoreDeadLetterTasks(deadLetterOnly);
        void message.success(t('tasks.batchIgnoreSuccess', { count: deadLetterOnly.length }));
        selectedRowKeys.value = [];
        await Promise.all([loadTasks(), loadDeadLetterStats()]);
      } catch {
        void message.error(t('tasks.batchActionFailed'));
      } finally {
        isBatchLoading.value = false;
      }
    }
  });
}

async function handleExport(format: 'csv' | 'json') {
  try {
    const response = await exportSyncTasks({
      scope: filterScope.value || undefined,
      status: filterStatus.value || undefined,
      format
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync-tasks-export.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch {
    void message.error(t('tasks.actionFailed'));
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  if (!autoRefreshEnabled.value) return;
  autoRefreshTimer = window.setInterval(() => {
    loadTasks();
    loadDeadLetterStats();
  }, AUTO_REFRESH_INTERVAL_MS);
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    window.clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

function toggleAutoRefresh() {
  autoRefreshEnabled.value = !autoRefreshEnabled.value;
  if (autoRefreshEnabled.value) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
}

onMounted(() => {
  void loadTasks();
  void loadDeadLetterStats();
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('tasks.title') }}</h2>
        <p>{{ t('tasks.body') }}</p>
      </div>
      <div class="page-heading-actions">
        <a-button :type="autoRefreshEnabled ? 'primary' : 'default'" @click="toggleAutoRefresh">
          {{ t('tasks.autoRefresh') }} {{ autoRefreshEnabled ? 'ON' : 'OFF' }}
        </a-button>
        <a-button type="primary" :loading="isLoading" @click="loadTasks">
          {{ t('sites.refresh') }}
        </a-button>
      </div>
    </div>

    <section class="content-panel">
      <!-- Dead-letter stats alert -->
      <a-alert
        v-if="deadLetterStats && deadLetterStats.totalDeadLetters > 0"
        class="page-alert"
        type="warning"
        show-icon
        closable
      >
        <template #message>
          <div class="dead-letter-alert-content">
            <span>{{ t('tasks.deadLetterAlert', { count: deadLetterStats.totalDeadLetters }) }}</span>
            <template v-if="deadLetterStats.bySite.length > 0">
              <span class="dead-letter-site-detail">
                <a-tag v-for="site in deadLetterStats.bySite" :key="site.siteId" color="orange">
                  {{ site.siteName }}: {{ site.count }}
                </a-tag>
              </span>
            </template>
          </div>
        </template>
      </a-alert>

      <a-alert v-if="loadError" class="page-alert" type="error" show-icon :message="loadError" />

      <!-- Batch action toolbar + filters -->
      <div class="filter-row">
        <a-select
          v-model:value="filterScope"
          style="width: 180px"
          :placeholder="t('tasks.scopeAll')"
          allow-clear
        >
          <a-select-option
            v-for="opt in scopeOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </a-select-option>
        </a-select>
        <a-select
          v-model:value="filterStatus"
          style="width: 150px; margin-left: 12px"
          :placeholder="t('tasks.allTab')"
          allow-clear
        >
          <a-select-option
            v-for="opt in statusOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </a-select-option>
        </a-select>

        <span v-if="selectedRowKeys.length > 0" class="selected-count">
          {{ t('tasks.selectedCount', { count: selectedRowKeys.length }) }}
        </span>

        <div class="filter-row-spacer" />

        <a-space v-if="batchableRows.length > 0">
          <a-button
            v-if="selectedRowKeys.length > 0"
            type="primary"
            size="small"
            :loading="isBatchLoading"
            @click="handleBatchRetry"
          >
            {{ t('tasks.batchRetry') }}
          </a-button>
          <a-button
            v-if="selectedRowKeys.length > 0"
            danger
            size="small"
            :loading="isBatchLoading"
            @click="handleBatchIgnore"
          >
            {{ t('tasks.batchIgnore') }}
          </a-button>
        </a-space>

        <a-dropdown>
          <template #overlay>
            <a-menu>
              <a-menu-item key="csv" @click="handleExport('csv')">
                {{ t('tasks.exportCsv') }}
              </a-menu-item>
              <a-menu-item key="json" @click="handleExport('json')">
                {{ t('tasks.exportJson') }}
              </a-menu-item>
            </a-menu>
          </template>
          <a-button size="small">
            {{ t('tasks.export') }} <DownOutlined />
          </a-button>
        </a-dropdown>
      </div>

      <a-tabs v-model:active-key="activeTab" @change="selectedRowKeys = []">
        <a-tab-pane key="all" :tab="t('tasks.allTab')" />
        <a-tab-pane key="queued" :tab="t('tasks.statusQueued')" />
        <a-tab-pane key="running" :tab="t('tasks.statusRunning')" />
        <a-tab-pane key="failed" :tab="t('tasks.statusFailed')" />
        <a-tab-pane key="dead_letter" :tab="t('tasks.statusDeadLetter')" />
        <a-tab-pane key="completed" :tab="t('tasks.statusDone')" />
      </a-tabs>

      <a-table
        row-key="id"
        :columns="columns"
        :data-source="taskRows"
        :loading="isLoading"
        :pagination="false"
        :row-selection="rowSelection"
      >
        <template #emptyText>{{ t('tasks.empty') }}</template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'task'">
            <strong>{{ record.task }}</strong>
            <div class="table-subtext">{{ record.raw.id }}</div>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.statusValue)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'progress'">
            <a-progress
              :percent="record.progress"
              :status="getProgressStatus(record.statusValue)"
              size="small"
            />
          </template>
          <template v-else-if="column.key === 'detail'">
            <span>{{ record.detail }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space v-if="record.isRetryable">
              <a-button
                v-if="record.raw.status === 'dead_letter'"
                type="link"
                danger
                :loading="ignoringTaskIds.has(record.id)"
                @click="handleIgnore(record.id)"
              >
                {{ t('tasks.ignore') }}
              </a-button>
              <a-button
                type="primary"
                size="small"
                :loading="retryingTaskIds.has(record.id)"
                @click="handleRetry(record.id)"
              >
                {{ t('tasks.retry') }}
              </a-button>
            </a-space>
            <a-button v-else type="link" @click="selectedTask = record.raw">
              {{ t('common.viewDetails') }}
            </a-button>
          </template>
        </template>
      </a-table>
    </section>

    <a-modal
      :open="Boolean(selectedTask)"
      :title="selectedTask ? getTaskName(selectedTask) : t('tasks.detailTitle')"
      :footer="null"
      @cancel="selectedTask = null"
    >
      <dl v-if="selectedTask" class="detail-list">
        <dt>{{ t('tasks.site') }}</dt>
        <dd>{{ selectedTask.siteName || selectedTask.siteId }}</dd>
        <dt>{{ t('articleSync.taskScope') }}</dt>
        <dd>{{ selectedTask.scope }}</dd>
        <dt>{{ t('articleSync.taskTarget') }}</dt>
        <dd>{{ selectedTask.targetCmsId || '-' }}</dd>
        <dt>{{ t('tasks.status') }}</dt>
        <dd>{{ getStatusLabel(selectedTask.status) }}</dd>
        <dt>{{ t('tasks.detail') }}</dt>
        <dd>{{ getTaskDetail(selectedTask) }}</dd>
        <dt>{{ t('articleSync.createdAt') }}</dt>
        <dd>{{ formatDateTime(selectedTask.createdAt) }}</dd>
      </dl>
    </a-modal>
  </section>
</template>
