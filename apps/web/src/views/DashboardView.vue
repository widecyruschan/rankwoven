<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const metrics = computed(() => [
  { label: t('dashboard.connectedSites'), value: '0' },
  { label: t('dashboard.pendingSuggestions'), value: '0' },
  { label: t('dashboard.runningTasks'), value: '0' }
]);
</script>

<template>
  <section class="page-section">
    <div class="summary-grid">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </article>
    </div>

    <section class="content-panel">
      <h2>{{ t('dashboard.title') }}</h2>
      <p>{{ t('dashboard.body') }}</p>
    </section>
  </section>
</template>
