<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const metrics = computed(() => [
  { label: t('dashboard.connectedSites'), value: '3', tone: 'primary' },
  { label: t('dashboard.indexedArticles'), value: '1,284', tone: 'neutral' },
  { label: t('dashboard.pendingSuggestions'), value: '42', tone: 'accent' },
  { label: t('dashboard.runningTasks'), value: '7', tone: 'neutral' },
  { label: t('dashboard.averageScore'), value: '78', tone: 'primary' },
  { label: t('dashboard.crawlHealth'), value: '96%', tone: 'primary' }
]);

const pipelineSteps = computed(() => [
  { label: t('dashboard.pipelineScan'), value: '100%' },
  { label: t('dashboard.pipelineGenerate'), value: '64%' },
  { label: t('dashboard.pipelineReview'), value: '38%' },
  { label: t('dashboard.pipelineApply'), value: '22%' },
  { label: t('dashboard.pipelineDone'), value: '18%' }
]);

const priorities = computed(() => [
  t('dashboard.priorityArticle'),
  t('dashboard.priorityImage'),
  t('dashboard.priorityLinks')
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
          <h2>{{ t('dashboard.pipelineTitle') }}</h2>
          <span>{{ t('dashboard.syncProgress') }}</span>
        </div>
        <div class="pipeline-list">
          <div v-for="step in pipelineSteps" :key="step.label" class="pipeline-step">
            <span>{{ step.label }}</span>
            <div class="progress-track">
              <span class="progress-fill" :style="{ width: step.value }" />
            </div>
            <strong>{{ step.value }}</strong>
          </div>
        </div>
      </section>

      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('dashboard.priorityTitle') }}</h2>
          <span>{{ t('dashboard.title') }}</span>
        </div>
        <ul class="priority-list">
          <li v-for="priority in priorities" :key="priority">{{ priority }}</li>
        </ul>
        <p class="panel-note">{{ t('dashboard.body') }}</p>
      </section>
    </div>
  </section>
</template>
