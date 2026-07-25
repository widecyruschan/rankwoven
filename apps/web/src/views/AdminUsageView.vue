<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const providerRows = computed(() => [
  { provider: 'OpenAI', calls: '186K', cost: '$860', status: t('admin.status.active') },
  { provider: 'Google Gemini', calls: '92K', cost: '$410', status: t('admin.status.active') },
  { provider: 'DeepSeek', calls: '74K', cost: '$188', status: t('admin.status.active') },
  { provider: t('admin.usage.wenwen'), calls: '352K', cost: '$1.46K', status: t('admin.status.active') },
  { provider: t('admin.usage.qiniu'), calls: '1.8 TB', cost: '$176', status: t('admin.status.watch') }
]);
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
      <div class="data-table" role="table">
        <div class="data-row data-head" role="row">
          <span>{{ t('admin.usage.provider') }}</span>
          <span>{{ t('admin.usage.calls') }}</span>
          <span>{{ t('admin.usage.cost') }}</span>
          <span>{{ t('cmsAdapters.status') }}</span>
          <span>{{ t('admin.usage.route') }}</span>
          <span>{{ t('articles.action') }}</span>
        </div>
        <div v-for="row in providerRows" :key="row.provider" class="data-row" role="row">
          <strong>{{ row.provider }}</strong>
          <span>{{ row.calls }}</span>
          <span>{{ row.cost }}</span>
          <span class="status-pill">{{ row.status }}</span>
          <span>{{ t('admin.usage.autoRoute') }}</span>
          <button class="text-button" type="button">{{ t('admin.usage.inspect') }}</button>
        </div>
      </div>
    </section>
  </section>
</template>
