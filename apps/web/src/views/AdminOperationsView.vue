<script setup lang="ts">
import { computed, ref } from 'vue';
import type { TableColumnsType } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import { BellRing, RadioTower } from 'lucide-vue-next';

const { t } = useI18n();

const incidents = computed(() => [
  {
    id: 'failed-publish',
    title: t('admin.operations.failedPublish'),
    target: 'shop.rankwoven.com',
    severity: t('admin.status.watch'),
    status: t('tasks.statusFailed'),
    color: 'red'
  },
  {
    id: 'provider-delay',
    title: t('admin.operations.providerDelay'),
    target: 'Wenwen API',
    severity: t('tasks.statusRunning'),
    status: t('tasks.statusRunning'),
    color: 'orange'
  },
  {
    id: 'review-backlog',
    title: t('admin.operations.reviewBacklog'),
    target: 'Agency segment',
    severity: t('tasks.statusWaiting'),
    status: t('tasks.statusWaiting'),
    color: 'blue'
  }
]);

const checks = computed(() => [
  {
    id: 'cert',
    title: t('admin.operations.checkCert'),
    target: 'rankwoven.com',
    status: t('admin.operations.passed'),
    color: 'green'
  },
  {
    id: 'queue',
    title: t('admin.operations.checkQueue'),
    target: 'Worker',
    status: t('admin.status.watch'),
    color: 'orange'
  },
  {
    id: 'webhook',
    title: t('admin.operations.checkWebhook'),
    target: 'WordPress',
    status: t('admin.operations.passed'),
    color: 'green'
  }
]);

const passedCheckCount = computed(() =>
  checks.value.filter((check) => check.status === t('admin.operations.passed')).length
);
const operationStats = computed(() => [
  { label: t('admin.operations.openIncidents'), value: String(incidents.value.length), tone: 'accent' },
  { label: t('admin.operations.passedChecks'), value: `${passedCheckCount.value}/${checks.value.length}`, tone: 'primary' },
  { label: t('admin.operations.livePipelines'), value: '5', tone: 'neutral' }
]);

type OperationRow = (typeof incidents.value)[number] | (typeof checks.value)[number];

const activeTab = ref('incidents');
const selectedOperation = ref<OperationRow | null>(null);

const columns = computed<TableColumnsType<OperationRow>>(() => [
  {
    title: t('admin.operations.event'),
    dataIndex: 'title',
    key: 'title'
  },
  {
    title: t('admin.operations.target'),
    dataIndex: 'target',
    key: 'target'
  },
  {
    title: t('admin.operations.severity'),
    dataIndex: 'severity',
    key: 'severity',
    width: 140
  },
  {
    title: t('cmsAdapters.status'),
    dataIndex: 'status',
    key: 'status',
    width: 140
  },
  {
    title: t('articles.action'),
    key: 'action',
    width: 110
  }
]);
</script>

<template>
  <section class="page-section">
    <section class="admin-command-hero admin-command-hero--compact">
      <div class="admin-hero-copy">
        <span class="hero-eyebrow">{{ t('admin.operations.heroEyebrow') }}</span>
        <h2>{{ t('admin.operations.title') }}</h2>
        <p>{{ t('admin.operations.body') }}</p>
      </div>
      <div class="admin-hero-card">
        <div class="admin-hero-card-icon">
          <RadioTower :size="22" aria-hidden="true" />
        </div>
        <strong>{{ t('admin.operations.liveCommand') }}</strong>
        <span>{{ t('admin.operations.liveCommandBody') }}</span>
      </div>
    </section>

    <div class="summary-grid compact-grid">
      <article v-for="stat in operationStats" :key="stat.label" class="metric-card" :data-tone="stat.tone">
        <span>{{ stat.label }}</span>
        <strong>{{ stat.value }}</strong>
      </article>
    </div>

    <section class="content-panel admin-table-panel">
      <div class="panel-heading">
        <div class="panel-title-group">
          <BellRing :size="18" aria-hidden="true" />
          <h2>{{ t('admin.operations.incidentTitle') }}</h2>
        </div>
        <a-tag color="processing">{{ t('admin.operations.live') }}</a-tag>
      </div>

      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="incidents" :tab="t('admin.operations.incidentsTab')" />
        <a-tab-pane key="checks" :tab="t('admin.operations.checksTab')" />
      </a-tabs>

      <a-table
        row-key="id"
        :columns="columns"
        :data-source="activeTab === 'incidents' ? incidents : checks"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'title'">
            <strong>{{ record.title }}</strong>
          </template>
          <template v-else-if="column.key === 'severity'">
            <a-tag v-if="'severity' in record" :color="record.color">{{ record.severity }}</a-tag>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.color">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" @click="selectedOperation = record">
              {{ t('admin.operations.open') }}
            </a-button>
          </template>
        </template>
      </a-table>
    </section>

    <a-modal
      :open="Boolean(selectedOperation)"
      :title="selectedOperation?.title || t('admin.operations.title')"
      :footer="null"
      @cancel="selectedOperation = null"
    >
      <dl v-if="selectedOperation" class="detail-list">
        <dt>{{ t('admin.operations.target') }}</dt>
        <dd>{{ selectedOperation.target }}</dd>
        <dt>{{ t('cmsAdapters.status') }}</dt>
        <dd>{{ selectedOperation.status }}</dd>
        <dt>{{ t('admin.operations.severity') }}</dt>
        <dd>{{ 'severity' in selectedOperation ? selectedOperation.severity : '-' }}</dd>
      </dl>
    </a-modal>
  </section>
</template>
