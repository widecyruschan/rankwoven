<script setup lang="ts">
import { computed, ref } from 'vue';
import type { TableColumnsType } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';

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
    <div class="page-heading">
      <div>
        <h2>{{ t('admin.operations.title') }}</h2>
        <p>{{ t('admin.operations.body') }}</p>
      </div>
    </div>

    <section class="content-panel">
      <div class="panel-heading">
        <h2>{{ t('admin.operations.incidentTitle') }}</h2>
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
