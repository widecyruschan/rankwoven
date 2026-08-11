<script setup lang="ts">
import { computed, ref } from 'vue';
import type { TableColumnsType } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import { UserPlus, Users } from 'lucide-vue-next';

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

const watchedCustomers = computed(() =>
  customers.value.filter((customer) => customer.status === t('admin.status.watch')).length
);
const totalCustomerSites = computed(() =>
  customers.value.reduce((total, customer) => total + customer.sites, 0)
);
const customerStats = computed(() => [
  { label: t('admin.customers.totalCustomers'), value: String(customers.value.length), tone: 'primary' },
  { label: t('admin.customers.connectedSites'), value: String(totalCustomerSites.value), tone: 'primary' },
  { label: t('admin.customers.watchAccounts'), value: String(watchedCustomers.value), tone: 'accent' }
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
    <section class="admin-command-hero admin-command-hero--compact">
      <div class="admin-hero-copy">
        <span class="hero-eyebrow">{{ t('admin.customers.heroEyebrow') }}</span>
        <h2>{{ t('admin.customers.title') }}</h2>
        <p>{{ t('admin.customers.body') }}</p>
      </div>
      <div class="admin-hero-card">
        <div class="admin-hero-card-icon">
          <Users :size="22" aria-hidden="true" />
        </div>
        <strong>{{ t('admin.customers.segmentTitle') }}</strong>
        <span>{{ t('admin.customers.segmentBody') }}</span>
        <a-button type="primary">
          <template #icon>
            <UserPlus :size="16" aria-hidden="true" />
          </template>
          {{ t('admin.customers.invite') }}
        </a-button>
      </div>
    </section>

    <div class="summary-grid compact-grid">
      <article v-for="stat in customerStats" :key="stat.label" class="metric-card" :data-tone="stat.tone">
        <span>{{ stat.label }}</span>
        <strong>{{ stat.value }}</strong>
      </article>
    </div>

    <section class="content-panel admin-table-panel">
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
