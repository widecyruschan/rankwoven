<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
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

const taskRows = computed(() =>
  tasks.value.map((task) => ({
    id: task.id,
    task: getTaskName(task),
    site: task.siteName ?? task.siteId,
    status: getStatusLabel(task.status),
    progress: getProgress(task),
    eta: getTaskTimeLabel(task),
    detail: getTaskDetail(task)
  }))
);

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

function getProgress(task: SyncTask) {
  if (task.status === 'completed' || task.status === 'failed') {
    return '100%';
  }

  if (task.status === 'running') {
    return `${Math.min(90, 35 + task.batchesReceived * 15)}%`;
  }

  return '15%';
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
      <button class="primary-button" type="button" :disabled="isLoading" @click="loadTasks">
        {{ isLoading ? t('tasks.loading') : t('sites.refresh') }}
      </button>
    </div>

    <section class="content-panel">
      <div v-if="loadError" class="form-message form-message-error">{{ loadError }}</div>
      <div class="data-table" role="table">
        <div class="data-row data-head" role="row">
          <span>{{ t('tasks.task') }}</span>
          <span>{{ t('tasks.site') }}</span>
          <span>{{ t('tasks.status') }}</span>
          <span>{{ t('tasks.progress') }}</span>
          <span>{{ t('tasks.eta') }}</span>
          <span>{{ t('tasks.detail') }}</span>
        </div>
        <div v-if="isLoading" class="data-row" role="row">
          <strong>{{ t('tasks.loading') }}</strong>
          <span>--</span>
          <span class="status-pill">{{ t('tasks.statusRunning') }}</span>
          <span>--</span>
          <span>--</span>
          <span>--</span>
        </div>
        <div v-else-if="taskRows.length === 0" class="data-row" role="row">
          <strong>{{ t('tasks.empty') }}</strong>
          <span>--</span>
          <span class="status-pill">{{ t('tasks.statusQueued') }}</span>
          <span>--</span>
          <span>--</span>
          <span>--</span>
        </div>
        <div v-for="task in taskRows" v-else :key="task.id" class="data-row" role="row">
          <strong>{{ task.task }}</strong>
          <span>{{ task.site }}</span>
          <span class="status-pill">{{ task.status }}</span>
          <span>
            <span class="progress-track">
              <span class="progress-fill" :style="{ width: task.progress }" />
            </span>
          </span>
          <span>{{ task.eta }}</span>
          <span>{{ task.detail }}</span>
        </div>
      </div>
    </section>
  </section>
</template>
