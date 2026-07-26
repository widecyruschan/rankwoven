<script setup lang="ts">
import { computed, ref } from 'vue';
import type { TableColumnsType } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';

interface ProviderUsageRow {
  provider: string;
  calls: string;
  cost: string;
  status: string;
}

const { t } = useI18n();

const selectedProvider = ref<ProviderUsageRow | null>(null);

const providerRows = computed<ProviderUsageRow[]>(() => [
  { provider: 'OpenAI', calls: '186K', cost: '$860', status: t('admin.status.active') },
  { provider: 'Google Gemini', calls: '92K', cost: '$410', status: t('admin.status.active') },
  { provider: 'DeepSeek', calls: '74K', cost: '$188', status: t('admin.status.active') },
  { provider: t('admin.usage.wenwen'), calls: '352K', cost: '$1.46K', status: t('admin.status.active') },
  { provider: t('admin.usage.qiniu'), calls: '1.8 TB', cost: '$176', status: t('admin.status.watch') }
]);

const columns = computed<TableColumnsType<ProviderUsageRow>>(() => [
  {
    title: t('admin.usage.provider'),
    dataIndex: 'provider',
    key: 'provider'
  },
  {
    title: t('admin.usage.calls'),
    dataIndex: 'calls',
    key: 'calls'
  },
  {
    title: t('admin.usage.cost'),
    dataIndex: 'cost',
    key: 'cost'
  },
  {
    title: t('cmsAdapters.status'),
    dataIndex: 'status',
    key: 'status'
  },
  {
    title: t('admin.usage.route'),
    key: 'route'
  },
  {
    title: t('articles.action'),
    key: 'action',
    width: 120
  }
]);

function inspectProvider(provider: ProviderUsageRow) {
  selectedProvider.value = provider;
}
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('admin.usage.title') }}</h2>
        <p>{{ t('admin.usage.body') }}</p>
      </div>
    </div>

    <section class="content-panel">
      <a-tabs default-active-key="providers">
        <a-tab-pane key="providers" :tab="t('admin.usage.providersTab')" />
        <a-tab-pane key="storage" :tab="t('admin.usage.storageTab')" />
      </a-tabs>

      <a-table row-key="provider" :columns="columns" :data-source="providerRows" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'provider'">
            <strong>{{ record.provider }}</strong>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === t('admin.status.watch') ? 'warning' : 'success'">
              {{ record.status }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'route'">
            <span>{{ t('admin.usage.autoRoute') }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" @click="inspectProvider(record)">
              {{ t('admin.usage.inspect') }}
            </a-button>
          </template>
        </template>
      </a-table>
    </section>

    <a-modal
      :open="Boolean(selectedProvider)"
      :title="selectedProvider?.provider"
      :footer="null"
      @cancel="selectedProvider = null"
    >
      <dl v-if="selectedProvider" class="detail-list">
        <dt>{{ t('admin.usage.calls') }}</dt>
        <dd>{{ selectedProvider.calls }}</dd>
        <dt>{{ t('admin.usage.cost') }}</dt>
        <dd>{{ selectedProvider.cost }}</dd>
        <dt>{{ t('admin.usage.route') }}</dt>
        <dd>{{ t('admin.usage.autoRoute') }}</dd>
        <dt>{{ t('cmsAdapters.status') }}</dt>
        <dd>{{ selectedProvider.status }}</dd>
      </dl>
    </a-modal>
  </section>
</template>
