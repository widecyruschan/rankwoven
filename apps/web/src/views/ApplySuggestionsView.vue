<script setup lang="ts">
import { computed, ref } from 'vue';
import type { TableColumnsType } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const batches = computed(() => [
  {
    id: 'image-title-meta',
    name: t('apply.batchImageTitleMeta'),
    count: 38,
    risk: t('apply.riskLow'),
    riskTone: 'green',
    status: t('apply.ready'),
    statusTone: 'blue',
    lastSync: '10:42'
  },
  {
    id: 'media',
    name: t('apply.batchMedia'),
    count: 81,
    risk: t('apply.riskLow'),
    riskTone: 'green',
    status: t('apply.ready'),
    statusTone: 'blue',
    lastSync: '10:36'
  },
  {
    id: 'content',
    name: t('apply.batchContent'),
    count: 24,
    risk: t('apply.riskMedium'),
    riskTone: 'orange',
    status: t('tasks.statusWaiting'),
    statusTone: 'default',
    lastSync: '09:58'
  },
  {
    id: 'links',
    name: t('apply.batchLinks'),
    count: 52,
    risk: t('apply.riskMedium'),
    riskTone: 'orange',
    status: t('apply.ready'),
    statusTone: 'blue',
    lastSync: '09:41'
  }
]);

type BatchRow = (typeof batches.value)[number];

const activeTab = ref('ready');
const selectedBatch = ref<BatchRow | null>(null);
const safeguards = computed(() => [t('apply.snapshot'), t('apply.reviewOnly'), t('apply.rollback')]);
const filteredBatches = computed(() =>
  batches.value.filter((batch) => (activeTab.value === 'ready' ? batch.status === t('apply.ready') : batch.status !== t('apply.ready')))
);

const columns = computed<TableColumnsType<BatchRow>>(() => [
  {
    title: t('apply.batch'),
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: t('apply.count'),
    dataIndex: 'count',
    key: 'count',
    width: 100
  },
  {
    title: t('apply.risk'),
    dataIndex: 'risk',
    key: 'risk',
    width: 130
  },
  {
    title: t('cmsAdapters.status'),
    dataIndex: 'status',
    key: 'status',
    width: 130
  },
  {
    title: t('articleSync.lastSync'),
    dataIndex: 'lastSync',
    key: 'lastSync',
    width: 130
  },
  {
    title: t('articles.action'),
    key: 'action',
    width: 130
  }
]);
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('apply.title') }}</h2>
        <p>{{ t('apply.body') }}</p>
      </div>
      <a-button type="primary">{{ t('apply.primaryAction') }}</a-button>
    </div>

    <div class="prototype-grid">
      <section class="content-panel panel-wide">
        <a-tabs v-model:active-key="activeTab">
          <a-tab-pane key="ready" :tab="t('apply.readyTab')" />
          <a-tab-pane key="waiting" :tab="t('apply.waitingTab')" />
        </a-tabs>

        <a-table row-key="id" :columns="columns" :data-source="filteredBatches" :pagination="false">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <strong>{{ record.name }}</strong>
            </template>
            <template v-else-if="column.key === 'risk'">
              <a-tag :color="record.riskTone">{{ record.risk }}</a-tag>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="record.statusTone">{{ record.status }}</a-tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" @click="selectedBatch = record">
                {{ t('apply.applyOne') }}
              </a-button>
            </template>
          </template>
        </a-table>
      </section>

      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('apply.safeguardsTitle') }}</h2>
        </div>
        <ul class="check-list">
          <li v-for="item in safeguards" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>

    <a-modal
      :open="Boolean(selectedBatch)"
      :title="selectedBatch?.name || t('apply.detailTitle')"
      :ok-text="t('apply.applyOne')"
      :cancel-text="t('review.reject')"
      @cancel="selectedBatch = null"
      @ok="selectedBatch = null"
    >
      <dl v-if="selectedBatch" class="detail-list">
        <dt>{{ t('apply.count') }}</dt>
        <dd>{{ selectedBatch.count }}</dd>
        <dt>{{ t('apply.risk') }}</dt>
        <dd>{{ selectedBatch.risk }}</dd>
        <dt>{{ t('cmsAdapters.status') }}</dt>
        <dd>{{ selectedBatch.status }}</dd>
        <dt>{{ t('articleSync.lastSync') }}</dt>
        <dd>{{ selectedBatch.lastSync }}</dd>
      </dl>
    </a-modal>
  </section>
</template>
