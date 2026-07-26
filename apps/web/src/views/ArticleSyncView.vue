<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  createManualRefreshTask,
  getSiteConnections,
  getSyncTasks,
  type CmsPlatform,
  type SiteConnection,
  type SyncTask,
  type SyncTaskScope,
  type SyncTaskStatus
} from '../api/siteConnections';

const { t, locale } = useI18n();

const sites = ref<SiteConnection[]>([]);
const tasks = ref<SyncTask[]>([]);
const isLoading = ref(false);
const isCreatingTask = ref(false);
const loadError = ref('');
const createTaskError = ref('');
const createTaskMessage = ref('');
const selectedSiteId = ref('');
const manualRefreshType = ref<'article' | 'media'>('article');
const manualRefreshCmsId = ref('');

const platformLabels: Record<CmsPlatform, string> = {
  wordpress: 'WordPress',
  joomla: 'Joomla',
  opencart: 'OpenCart'
};

const syncRows = computed(() =>
  sites.value.map((site) => ({
    id: site.id,
    site: site.name,
    platform: platformLabels[site.platform],
    articles: String(site.lastSyncStats?.articlesReceived ?? 0),
    media: String(site.lastSyncStats?.mediaReceived ?? 0),
    lastSync: formatLastSync(site.lastSyncAt),
    status: getSyncStatus(site)
  }))
);

const taskRows = computed(() =>
  tasks.value.map((task) => ({
    id: task.id,
    name: getTaskName(task),
    site: task.siteName ?? getSiteName(task.siteId),
    status: getTaskStatusLabel(task.status),
    scope: getTaskScopeLabel(task.scope),
    target: task.targetCmsId ?? '--',
    batch: `${task.batchesReceived}`,
    received: `${task.articlesReceived} / ${task.mediaReceived}`,
    progress: getTaskProgress(task),
    createdAt: formatDateTime(task.createdAt),
    completedAt: formatDateTime(task.completedAt)
  }))
);

const selectedSiteOptions = computed(() => sites.value.filter((site) => site.status === 'connected'));
const totalSites = computed(() => sites.value.length);
const connectedSites = computed(() => sites.value.filter((site) => site.status === 'connected').length);
const syncedSites = computed(() => sites.value.filter((site) => Boolean(site.lastSyncAt)).length);
const totalArticles = computed(() =>
  sites.value.reduce((total, site) => total + (site.lastSyncStats?.articlesReceived ?? 0), 0)
);
const totalMedia = computed(() =>
  sites.value.reduce((total, site) => total + (site.lastSyncStats?.mediaReceived ?? 0), 0)
);

const syncSteps = computed(() => [
  {
    label: t('articleSync.stepInventory'),
    value: `${connectedSites.value}/${totalSites.value}`,
    width: getRatioWidth(connectedSites.value, totalSites.value)
  },
  {
    label: t('articleSync.stepContent'),
    value: `${syncedSites.value}/${totalSites.value}`,
    width: getRatioWidth(syncedSites.value, totalSites.value)
  },
  {
    label: t('articleSync.stepArticles'),
    value: String(totalArticles.value),
    width: totalArticles.value > 0 ? '100%' : '0%'
  },
  {
    label: t('articleSync.stepMedia'),
    value: String(totalMedia.value),
    width: totalMedia.value > 0 ? '100%' : '0%'
  }
]);

function getRatioWidth(value: number, total: number) {
  if (total === 0) {
    return '0%';
  }

  return `${Math.round((value / total) * 100)}%`;
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

function formatLastSync(lastSyncAt?: string) {
  return formatDateTime(lastSyncAt);
}

function getSyncStatus(site: SiteConnection) {
  if (site.status === 'revoked') {
    return t('articleSync.statusRevoked');
  }

  if (!site.lastSyncAt) {
    return t('articleSync.statusPending');
  }

  return t('articleSync.statusDone');
}

function getSiteName(siteId: string) {
  return sites.value.find((site) => site.id === siteId)?.name ?? siteId;
}

function getTaskName(task: SyncTask) {
  if (task.scope === 'article') {
    return t('articleSync.manualArticleTask');
  }

  if (task.scope === 'media') {
    return t('articleSync.manualMediaTask');
  }

  if (task.scope === 'incremental') {
    return t('articleSync.incrementalTask');
  }

  return t('articleSync.fullTask');
}

function getTaskStatusLabel(status: SyncTaskStatus) {
  const statusLabels: Record<SyncTaskStatus, string> = {
    queued: t('articleSync.statusQueued'),
    running: t('articleSync.statusRunning'),
    completed: t('articleSync.statusDone'),
    failed: t('articleSync.statusFailed')
  };

  return statusLabels[status];
}

function getTaskScopeLabel(scope: SyncTaskScope) {
  const scopeLabels: Record<SyncTaskScope, string> = {
    full: t('articleSync.scopeFull'),
    incremental: t('articleSync.scopeIncremental'),
    article: t('articleSync.scopeArticle'),
    media: t('articleSync.scopeMedia')
  };

  return scopeLabels[scope];
}

function getTaskProgress(task: SyncTask) {
  if (task.status === 'completed') {
    return '100%';
  }

  if (task.status === 'failed') {
    return '100%';
  }

  if (task.status === 'running') {
    return `${Math.min(90, 40 + task.batchesReceived * 10)}%`;
  }

  return task.batchesReceived > 0 ? '35%' : '15%';
}

async function loadSyncStatus() {
  isLoading.value = true;
  loadError.value = '';

  try {
    const [siteResult, taskResult] = await Promise.all([getSiteConnections(), getSyncTasks()]);
    sites.value = siteResult.sites;
    tasks.value = taskResult.tasks;

    if (!selectedSiteId.value && selectedSiteOptions.value[0]) {
      selectedSiteId.value = selectedSiteOptions.value[0].id;
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('articleSync.loadFailed');
  } finally {
    isLoading.value = false;
  }
}

async function createManualTask() {
  createTaskError.value = '';
  createTaskMessage.value = '';

  if (!selectedSiteId.value || manualRefreshCmsId.value.trim() === '') {
    createTaskError.value = t('articleSync.manualRefreshRequired');
    return;
  }

  isCreatingTask.value = true;

  try {
    const result = await createManualRefreshTask(selectedSiteId.value, {
      type: manualRefreshType.value,
      cmsId: manualRefreshCmsId.value.trim()
    });
    const taskSiteName = getSiteName(result.task.siteId);
    tasks.value = [
      {
        ...result.task,
        siteName: taskSiteName
      },
      ...tasks.value
    ];
    manualRefreshCmsId.value = '';
    createTaskMessage.value = t('articleSync.taskCreated');
  } catch (error) {
    createTaskError.value = error instanceof Error ? error.message : t('articleSync.taskCreateFailed');
  } finally {
    isCreatingTask.value = false;
  }
}

onMounted(() => {
  void loadSyncStatus();
});
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('articleSync.title') }}</h2>
        <p>{{ t('articleSync.body') }}</p>
      </div>
      <button class="primary-button" type="button" :disabled="isLoading" @click="loadSyncStatus">
        {{ isLoading ? t('articleSync.loading') : t('articleSync.primaryAction') }}
      </button>
    </div>

    <div class="prototype-grid">
      <section class="content-panel panel-wide">
        <div class="panel-heading">
          <h2>{{ t('articleSync.manualRefresh') }}</h2>
          <span>{{ t('articleSync.manualRefreshHint') }}</span>
        </div>
        <div class="manual-refresh-form">
          <label>
            <span>{{ t('articleSync.site') }}</span>
            <select v-model="selectedSiteId" :disabled="isLoading || selectedSiteOptions.length === 0">
              <option v-for="site in selectedSiteOptions" :key="site.id" :value="site.id">
                {{ site.name }}
              </option>
            </select>
          </label>
          <label>
            <span>{{ t('articleSync.refreshType') }}</span>
            <select v-model="manualRefreshType">
              <option value="article">{{ t('articleSync.scopeArticle') }}</option>
              <option value="media">{{ t('articleSync.scopeMedia') }}</option>
            </select>
          </label>
          <label>
            <span>{{ t('articleSync.cmsId') }}</span>
            <input
              v-model="manualRefreshCmsId"
              type="text"
              inputmode="numeric"
              :placeholder="t('articleSync.cmsIdPlaceholder')"
            >
          </label>
          <button class="primary-button" type="button" :disabled="isCreatingTask" @click="createManualTask">
            {{ isCreatingTask ? t('articleSync.creatingTask') : t('articleSync.createTask') }}
          </button>
        </div>
        <p v-if="createTaskError" class="form-message form-message-error">{{ createTaskError }}</p>
        <p v-else-if="createTaskMessage" class="form-message">{{ createTaskMessage }}</p>
      </section>

      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('articleSync.pipelineTitle') }}</h2>
          <span>{{ t('articleSync.lastResult') }}</span>
        </div>
        <div class="pipeline-list">
          <div v-for="step in syncSteps" :key="step.label" class="pipeline-step">
            <span>{{ step.label }}</span>
            <div class="progress-track">
              <span class="progress-fill" :style="{ width: step.width }" />
            </div>
            <strong>{{ step.value }}</strong>
          </div>
        </div>
      </section>

      <section class="content-panel panel-wide">
        <div class="panel-heading">
          <h2>{{ t('articleSync.siteSyncTitle') }}</h2>
          <span>{{ t('articleSync.lastResult') }}</span>
        </div>
        <div class="data-table" role="table">
          <div class="data-row data-head" role="row">
            <span>{{ t('articleSync.site') }}</span>
            <span>{{ t('sites.platform') }}</span>
            <span>{{ t('articleSync.articles') }}</span>
            <span>{{ t('articleSync.media') }}</span>
            <span>{{ t('articleSync.lastSync') }}</span>
            <span>{{ t('cmsAdapters.status') }}</span>
          </div>
          <div v-if="isLoading" class="data-row" role="row">
            <strong>{{ t('articleSync.loading') }}</strong>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span class="status-pill">{{ t('articleSync.statusLoading') }}</span>
          </div>
          <div v-else-if="loadError" class="data-row" role="row">
            <strong>{{ t('articleSync.loadFailed') }}</strong>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span class="status-pill">{{ loadError }}</span>
          </div>
          <div v-else-if="syncRows.length === 0" class="data-row" role="row">
            <strong>{{ t('articleSync.empty') }}</strong>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span>--</span>
            <span class="status-pill">{{ t('articleSync.statusEmpty') }}</span>
          </div>
          <template v-else>
            <div v-for="row in syncRows" :key="row.id" class="data-row" role="row">
              <strong>{{ row.site }}</strong>
              <span>{{ row.platform }}</span>
              <span>{{ row.articles }}</span>
              <span>{{ row.media }}</span>
              <span>{{ row.lastSync }}</span>
              <span class="status-pill">{{ row.status }}</span>
            </div>
          </template>
        </div>
      </section>

      <section class="content-panel panel-wide">
        <div class="panel-heading">
          <h2>{{ t('articleSync.taskList') }}</h2>
          <span>{{ t('articleSync.batchProgress') }}</span>
        </div>
        <div class="data-table task-table" role="table">
          <div class="data-row data-head" role="row">
            <span>{{ t('tasks.task') }}</span>
            <span>{{ t('tasks.site') }}</span>
            <span>{{ t('tasks.status') }}</span>
            <span>{{ t('articleSync.taskScope') }}</span>
            <span>{{ t('articleSync.batchProgress') }}</span>
            <span>{{ t('articleSync.createdAt') }}</span>
          </div>
          <div v-if="isLoading" class="data-row" role="row">
            <strong>{{ t('articleSync.loading') }}</strong>
            <span>--</span>
            <span class="status-pill">{{ t('articleSync.statusLoading') }}</span>
            <span>--</span>
            <span>--</span>
            <span>--</span>
          </div>
          <div v-else-if="taskRows.length === 0" class="data-row" role="row">
            <strong>{{ t('articleSync.emptyTasks') }}</strong>
            <span>--</span>
            <span class="status-pill">{{ t('articleSync.statusEmpty') }}</span>
            <span>--</span>
            <span>--</span>
            <span>--</span>
          </div>
          <template v-else>
            <div v-for="task in taskRows" :key="task.id" class="data-row" role="row">
              <strong>
                {{ task.name }}
                <small>{{ t('articleSync.taskTarget') }}: {{ task.target }}</small>
              </strong>
              <span>{{ task.site }}</span>
              <span class="status-pill">{{ task.status }}</span>
              <span>{{ task.scope }}</span>
              <span>
                <span class="progress-track">
                  <span class="progress-fill" :style="{ width: task.progress }" />
                </span>
                <small>{{ task.batch }} {{ t('articleSync.batches') }} · {{ task.received }}</small>
              </span>
              <span>{{ task.createdAt }}</span>
            </div>
          </template>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.manual-refresh-form {
  display: grid;
  grid-template-columns: minmax(180px, 1.2fr) minmax(140px, 0.8fr) minmax(140px, 0.8fr) auto;
  gap: 12px;
  align-items: end;
}

.manual-refresh-form label {
  display: grid;
  gap: 6px;
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 700;
}

.manual-refresh-form input,
.manual-refresh-form select {
  min-height: 44px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-ink);
  font: inherit;
  padding: 9px 12px;
}

.form-message {
  margin: 12px 0 0;
  color: var(--color-brand-primary-dark);
  font-weight: 700;
}

.form-message-error {
  color: #b42318;
}

.task-table small {
  display: block;
  margin-top: 5px;
  color: var(--color-muted);
  font-size: 12px;
}

@media (max-width: 920px) {
  .manual-refresh-form {
    grid-template-columns: 1fr;
  }
}
</style>
