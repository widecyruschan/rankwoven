<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const customers = computed(() => [
  { name: 'Acme Media', plan: 'Growth', sites: '8', usage: '62%', status: t('admin.status.active') },
  { name: 'North Shop', plan: 'Starter', sites: '2', usage: '41%', status: t('admin.status.active') },
  { name: 'Bright Agency', plan: 'Agency', sites: '19', usage: '88%', status: t('admin.status.watch') },
  { name: 'Global Parts', plan: 'Enterprise', sites: '36', usage: '54%', status: t('admin.status.active') }
]);
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('admin.customers.title') }}</h2>
        <p>{{ t('admin.customers.body') }}</p>
      </div>
      <button class="primary-button" type="button">{{ t('admin.customers.invite') }}</button>
    </div>

    <section class="content-panel">
      <div class="data-table" role="table">
        <div class="data-row data-head" role="row">
          <span>{{ t('admin.customers.customer') }}</span>
          <span>{{ t('admin.customers.plan') }}</span>
          <span>{{ t('admin.customers.sites') }}</span>
          <span>{{ t('admin.customers.usage') }}</span>
          <span>{{ t('cmsAdapters.status') }}</span>
          <span>{{ t('articles.action') }}</span>
        </div>
        <div v-for="customer in customers" :key="customer.name" class="data-row" role="row">
          <strong>{{ customer.name }}</strong>
          <span>{{ customer.plan }}</span>
          <span>{{ customer.sites }}</span>
          <span>{{ customer.usage }}</span>
          <span class="status-pill">{{ customer.status }}</span>
          <button class="text-button" type="button">{{ t('admin.customers.open') }}</button>
        </div>
      </div>
    </section>
  </section>
</template>
