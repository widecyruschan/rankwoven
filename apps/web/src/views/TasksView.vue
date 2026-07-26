<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { TableColumnsType } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import {
  getSyncTasks,
  type SyncTask,
  type SyncTaskScope,
  type SyncTaskStatus
} from '../api/siteConnections';

const { t, locale } = useI18n();

const tasks = ref<SyncTask[]>([]);
const isLoading = ref(false);
const loadError = ref('');
const activeTab = ref('all');
const selectedTask = ref<SyncTask | null>(null);

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
    detail: getTaskDetail(task)
  }))
);

const filteredTasks = computed(() =>
  tasks.value.filter((task) => activeTab.value === 'all' || task.status === activeTab.value)
);

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
    width: 110
  }
]);

function getTaskName(task: SyncTask) {
  const scopeLabels: Record<SyncTaskScope, string> = {
    full: t('articleSync.fullTask'),
    incremental: t('articleSync.incrementalTask'),
    article: t('articleSync.manualArticleTask'),
    media: t('articleSync.manualMediaTask'),
    suggestion_apply: t('articleSync.suggestionApplyTask')
  };

  return task.targetCmsId ? `${scopeLabels[task.scope]} #${task.targetCmsId}` : scopeLabels[task.scope];
}

function getStatusLabel(status: SyncTaskStatus) {
  const statusLabels: Record<SyncTaskStatus, string> = {
    queued: t('tasks.statusQueued'),
    running: t('tasks.statusRunning'),
    completed: t('tasks.statusDone'),
    failed: t('tasks.statusFailed')
  };

  return statusLabels[status];
}

function getProgressPercent(task: SyncTask) {
  if (task.status === 'completed' || task.status === 'failed') {
    return 100;
  }

  if (task.status === 'running') {
    return Math.min(90, 35 + task.batchesReceived * 15);
  }

  return 15;
}

function getProgressStatus(status: SyncTaskStatus) {
  if (status === 'failed') {
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
    failed: 'error'
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
  if (task.status === 'failed') {
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
    const result = await getSyncTasks();
    tasks.value = result.tasks;
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('tasks.loadFailed');
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadTasks();
});
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('tasks.title') }}</h2>
        <p>{{ t('tasks.body') }}</p>
      </div>
      <a-button type="primary" :loading="isLoading" @click="loadTasks">
        {{ t('sites.refresh') }}
      </a-button>
    </div>

    <section class="content-panel">
      <a-alert v-if="loadError" class="page-alert" type="error" show-icon :message="loadError" />

      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="all" :tab="t('tasks.allTab')" />
        <a-tab-pane key="queued" :tab="t('tasks.statusQueued')" />
        <a-tab-pane key="running" :tab="t('tasks.statusRunning')" />
        <a-tab-pane key="failed" :tab="t('tasks.statusFailed')" />
        <a-tab-pane key="completed" :tab="t('tasks.statusDone')" />
      </a-tabs>

      <a-table
        row-key="id"
        :columns="columns"
        :data-source="taskRows"
        :loading="isLoading"
        :pagination="false"
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
            <a-button type="link" @click="selectedTask = record.raw">
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
