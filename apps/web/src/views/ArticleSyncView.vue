<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { TableColumnsType } from 'ant-design-vue';
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

interface SyncStatusRow {
  id: string;
  site: string;
  platform: string;
  articles: string;
  media: string;
  lastSync: string;
  status: string;
}

interface TaskStatusRow {
  id: string;
  name: string;
  site: string;
  status: string;
  scope: string;
  target: string;
  batch: string;
  received: string;
  progress: string;
  createdAt: string;
  completedAt: string;
}

const platformLabels: Record<CmsPlatform, string> = {
  wordpress: 'WordPress',
  joomla: 'Joomla',
  opencart: 'OpenCart'
};

const syncRows = computed<SyncStatusRow[]>(() =>
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

const taskRows = computed<TaskStatusRow[]>(() =>
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
const selectedSiteSelectOptions = computed(() =>
  selectedSiteOptions.value.map((site) => ({
    label: site.name,
    value: site.id
  }))
);
const refreshTypeOptions = computed(() => [
  {
    label: t('articleSync.scopeArticle'),
    value: 'article'
  },
  {
    label: t('articleSync.scopeMedia'),
    value: 'media'
  }
]);
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

const syncColumns = computed<TableColumnsType<SyncStatusRow>>(() => [
  {
    title: t('articleSync.site'),
    dataIndex: 'site',
    key: 'site'
  },
  {
    title: t('sites.platform'),
    dataIndex: 'platform',
    key: 'platform'
  },
  {
    title: t('articleSync.articles'),
    dataIndex: 'articles',
    key: 'articles'
  },
  {
    title: t('articleSync.media'),
    dataIndex: 'media',
    key: 'media'
  },
  {
    title: t('articleSync.lastSync'),
    dataIndex: 'lastSync',
    key: 'lastSync'
  },
  {
    title: t('cmsAdapters.status'),
    dataIndex: 'status',
    key: 'status'
  }
]);

const taskColumns = computed<TableColumnsType<TaskStatusRow>>(() => [
  {
    title: t('tasks.task'),
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: t('tasks.site'),
    dataIndex: 'site',
    key: 'site'
  },
  {
    title: t('tasks.status'),
    dataIndex: 'status',
    key: 'status'
  },
  {
    title: t('articleSync.taskScope'),
    dataIndex: 'scope',
    key: 'scope'
  },
  {
    title: t('articleSync.batchProgress'),
    key: 'progress'
  },
  {
    title: t('articleSync.createdAt'),
    dataIndex: 'createdAt',
    key: 'createdAt'
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

  if (task.scope === 'suggestion_apply') {
    return t('articleSync.suggestionApplyTask');
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
    media: t('articleSync.scopeMedia'),
    suggestion_apply: t('articleSync.scopeSuggestionApply')
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
      <a-button type="primary" :loading="isLoading" @click="loadSyncStatus">
        {{ isLoading ? t('articleSync.loading') : t('articleSync.primaryAction') }}
      </a-button>
    </div>

    <div class="prototype-grid">
      <section class="content-panel panel-wide">
        <div class="panel-heading">
          <h2>{{ t('articleSync.manualRefresh') }}</h2>
          <span>{{ t('articleSync.manualRefreshHint') }}</span>
        </div>
        <a-form class="manual-refresh-form" layout="vertical">
          <a-form-item :label="t('articleSync.site')">
            <a-select
              v-model:value="selectedSiteId"
              :disabled="isLoading || selectedSiteOptions.length === 0"
              :options="selectedSiteSelectOptions"
            />
          </a-form-item>
          <a-form-item :label="t('articleSync.refreshType')">
            <a-select v-model:value="manualRefreshType" :options="refreshTypeOptions" />
          </a-form-item>
          <a-form-item :label="t('articleSync.cmsId')">
            <a-input v-model:value="manualRefreshCmsId" :placeholder="t('articleSync.cmsIdPlaceholder')" />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" :loading="isCreatingTask" @click="createManualTask">
              {{ isCreatingTask ? t('articleSync.creatingTask') : t('articleSync.createTask') }}
            </a-button>
          </a-form-item>
        </a-form>
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
        <a-alert v-if="loadError" class="page-alert" type="error" show-icon :message="loadError" />
        <a-table
          row-key="id"
          :columns="syncColumns"
          :data-source="syncRows"
          :loading="isLoading"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'site'">
              <strong>{{ record.site }}</strong>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag>{{ record.status }}</a-tag>
            </template>
          </template>
        </a-table>
      </section>

      <section class="content-panel panel-wide">
        <div class="panel-heading">
          <h2>{{ t('articleSync.taskList') }}</h2>
          <span>{{ t('articleSync.batchProgress') }}</span>
        </div>
        <a-table
          row-key="id"
          :columns="taskColumns"
          :data-source="taskRows"
          :loading="isLoading"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <strong>{{ record.name }}</strong>
              <div class="table-subtext">{{ t('articleSync.taskTarget') }}: {{ record.target }}</div>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag>{{ record.status }}</a-tag>
            </template>
            <template v-else-if="column.key === 'progress'">
              <a-progress :percent="Number.parseInt(record.progress, 10)" size="small" />
              <div class="table-subtext">{{ record.batch }} {{ t('articleSync.batches') }} · {{ record.received }}</div>
            </template>
          </template>
        </a-table>
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

.manual-refresh-form .ant-form-item {
  margin-bottom: 0;
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
