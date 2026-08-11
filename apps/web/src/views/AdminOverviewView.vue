<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Activity, Banknote, ShieldCheck } from 'lucide-vue-next';

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

const healthSignals = computed(() => [
  { label: t('admin.overview.responseSla'), value: '99.9%' },
  { label: t('admin.overview.apiUptime'), value: '99.98%' },
  { label: t('admin.overview.workerQueue'), value: '142' }
]);
</script>

<template>
  <section class="page-section">
    <section class="admin-command-hero">
      <div class="admin-hero-copy">
        <span class="hero-eyebrow">{{ t('admin.overview.heroEyebrow') }}</span>
        <h2>{{ t('admin.overview.heroTitle') }}</h2>
        <p>{{ t('admin.overview.heroBody') }}</p>
      </div>
      <div class="admin-hero-card">
        <div class="admin-hero-card-icon">
          <ShieldCheck :size="22" aria-hidden="true" />
        </div>
        <strong>{{ t('admin.overview.healthTitle') }}</strong>
        <div class="admin-signal-list">
          <div v-for="signal in healthSignals" :key="signal.label">
            <span>{{ signal.label }}</span>
            <strong>{{ signal.value }}</strong>
          </div>
        </div>
      </div>
    </section>

    <div class="summary-grid">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card" :data-tone="metric.tone">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </article>
    </div>

    <div class="prototype-grid">
      <section class="content-panel">
        <div class="panel-heading">
          <div class="panel-title-group">
            <Activity :size="18" aria-hidden="true" />
            <h2>{{ t('admin.overview.queueTitle') }}</h2>
          </div>
          <span class="status-pill">{{ t('admin.overview.lastHour') }}</span>
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
          <div class="panel-title-group">
            <Banknote :size="18" aria-hidden="true" />
            <h2>{{ t('admin.overview.riskTitle') }}</h2>
          </div>
          <span class="status-pill">{{ t('tasks.statusWaiting') }}</span>
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
