<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const metrics = computed(() => [
  { label: t('admin.overview.mrr'), value: '$18.6K', tone: 'primary' },
  { label: t('admin.overview.customers'), value: '128', tone: 'neutral' },
  { label: t('admin.overview.activeSites'), value: '342', tone: 'primary' },
  { label: t('admin.overview.aiCost'), value: '$1.92K', tone: 'accent' },
  { label: t('admin.overview.successRate'), value: '98.4%', tone: 'primary' },
  { label: t('admin.overview.openReviews'), value: '219', tone: 'neutral' }
]);

const queues = computed(() => [
  { label: t('admin.overview.syncQueue'), value: '72%' },
  { label: t('admin.overview.auditQueue'), value: '58%' },
  { label: t('admin.overview.imageQueue'), value: '34%' }
]);
</script>

<template>
  <section class="page-section">
    <div class="summary-grid">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card" :data-tone="metric.tone">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </article>
    </div>

    <div class="prototype-grid">
      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('admin.overview.queueTitle') }}</h2>
          <span>{{ t('admin.overview.lastHour') }}</span>
        </div>
        <div class="pipeline-list">
          <div v-for="queue in queues" :key="queue.label" class="pipeline-step">
            <span>{{ queue.label }}</span>
            <div class="progress-track">
              <span class="progress-fill" :style="{ width: queue.value }" />
            </div>
            <strong>{{ queue.value }}</strong>
          </div>
        </div>
      </section>

      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('admin.overview.riskTitle') }}</h2>
          <span>{{ t('tasks.statusWaiting') }}</span>
        </div>
        <ul class="priority-list">
          <li>{{ t('admin.overview.riskProvider') }}</li>
          <li>{{ t('admin.overview.riskStorage') }}</li>
          <li>{{ t('admin.overview.riskBilling') }}</li>
        </ul>
      </section>
    </div>
  </section>
</template>
