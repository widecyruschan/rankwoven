<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const syncRows = computed(() => [
  { site: 'rankwoven.com', platform: 'WordPress', articles: '486', changed: '32', status: t('articleSync.statusRunning') },
  { site: 'docs.rankwoven.com', platform: 'Joomla', articles: '312', changed: '18', status: t('articleSync.statusQueued') },
  { site: 'shop.rankwoven.com', platform: 'OpenCart', articles: '486', changed: '64', status: t('articleSync.statusDone') }
]);

const syncSteps = computed(() => [
  { label: t('articleSync.stepInventory'), value: '100%' },
  { label: t('articleSync.stepContent'), value: '76%' },
  { label: t('articleSync.stepMedia'), value: '58%' },
  { label: t('articleSync.stepSnapshot'), value: '42%' }
]);
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('articleSync.title') }}</h2>
        <p>{{ t('articleSync.body') }}</p>
      </div>
      <button class="primary-button" type="button">{{ t('articleSync.primaryAction') }}</button>
    </div>

    <div class="prototype-grid">
      <section class="content-panel panel-wide">
        <div class="data-table" role="table">
          <div class="data-row data-head" role="row">
            <span>{{ t('articleSync.site') }}</span>
            <span>{{ t('sites.platform') }}</span>
            <span>{{ t('articleSync.articles') }}</span>
            <span>{{ t('articleSync.changed') }}</span>
            <span>{{ t('cmsAdapters.status') }}</span>
            <span>{{ t('tasks.progress') }}</span>
          </div>
          <div v-for="row in syncRows" :key="row.site" class="data-row" role="row">
            <strong>{{ row.site }}</strong>
            <span>{{ row.platform }}</span>
            <span>{{ row.articles }}</span>
            <span>{{ row.changed }}</span>
            <span class="status-pill">{{ row.status }}</span>
            <span>{{ row.status === t('articleSync.statusRunning') ? '76%' : '100%' }}</span>
          </div>
        </div>
      </section>

      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('articleSync.pipelineTitle') }}</h2>
          <span>{{ t('articleSync.lastSync') }}</span>
        </div>
        <div class="pipeline-list">
          <div v-for="step in syncSteps" :key="step.label" class="pipeline-step">
            <span>{{ step.label }}</span>
            <div class="progress-track">
              <span class="progress-fill" :style="{ width: step.value }" />
            </div>
            <strong>{{ step.value }}</strong>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
