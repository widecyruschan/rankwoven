<script setup lang="ts">
import { computed, ref } from 'vue';
import type { TableColumnsType } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';

interface CustomerRow {
  name: string;
  plan: string;
  sites: number;
  usage: string;
  status: string;
}

const { t } = useI18n();

const selectedCustomer = ref<CustomerRow | null>(null);

const customers = computed<CustomerRow[]>(() => [
  { name: 'Acme Media', plan: 'Growth', sites: 8, usage: '62%', status: t('admin.status.active') },
  { name: 'North Shop', plan: 'Starter', sites: 2, usage: '41%', status: t('admin.status.active') },
  { name: 'Bright Agency', plan: 'Agency', sites: 19, usage: '88%', status: t('admin.status.watch') },
  { name: 'Global Parts', plan: 'Enterprise', sites: 36, usage: '54%', status: t('admin.status.active') }
]);

const columns = computed<TableColumnsType<CustomerRow>>(() => [
  {
    title: t('admin.customers.customer'),
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: t('admin.customers.plan'),
    dataIndex: 'plan',
    key: 'plan'
  },
  {
    title: t('admin.customers.sites'),
    dataIndex: 'sites',
    key: 'sites'
  },
  {
    title: t('admin.customers.usage'),
    dataIndex: 'usage',
    key: 'usage'
  },
  {
    title: t('cmsAdapters.status'),
    dataIndex: 'status',
    key: 'status'
  },
  {
    title: t('articles.action'),
    key: 'action',
    width: 120
  }
]);

function openCustomer(customer: CustomerRow) {
  selectedCustomer.value = customer;
}
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('admin.customers.title') }}</h2>
        <p>{{ t('admin.customers.body') }}</p>
      </div>
      <a-button type="primary">{{ t('admin.customers.invite') }}</a-button>
    </div>

    <section class="content-panel">
      <a-tabs default-active-key="active">
        <a-tab-pane key="active" :tab="t('admin.customers.activeTab')" />
        <a-tab-pane key="watch" :tab="t('admin.customers.watchTab')" />
      </a-tabs>

      <a-table row-key="name" :columns="columns" :data-source="customers" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <strong>{{ record.name }}</strong>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === t('admin.status.watch') ? 'warning' : 'success'">
              {{ record.status }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" @click="openCustomer(record)">
              {{ t('admin.customers.open') }}
            </a-button>
          </template>
        </template>
      </a-table>
    </section>

    <a-modal
      :open="Boolean(selectedCustomer)"
      :title="selectedCustomer?.name"
      :footer="null"
      @cancel="selectedCustomer = null"
    >
      <dl v-if="selectedCustomer" class="detail-list">
        <dt>{{ t('admin.customers.plan') }}</dt>
        <dd>{{ selectedCustomer.plan }}</dd>
        <dt>{{ t('admin.customers.sites') }}</dt>
        <dd>{{ selectedCustomer.sites }}</dd>
        <dt>{{ t('admin.customers.usage') }}</dt>
        <dd>{{ selectedCustomer.usage }}</dd>
        <dt>{{ t('cmsAdapters.status') }}</dt>
        <dd>{{ selectedCustomer.status }}</dd>
      </dl>
    </a-modal>
  </section>
</template>
