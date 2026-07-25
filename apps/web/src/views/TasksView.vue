<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const tasks = computed(() => [
  {
    task: 'WordPress content sync',
    site: 'rankwoven.com',
    status: t('tasks.statusRunning'),
    progress: '72%',
    eta: '04:20'
  },
  {
    task: 'Generate meta suggestions',
    site: 'docs.rankwoven.com',
    status: t('tasks.statusWaiting'),
    progress: '100%',
    eta: '00:00'
  },
  {
    task: 'Image alt text audit',
    site: 'shop.rankwoven.com',
    status: t('tasks.statusDone'),
    progress: '100%',
    eta: '00:00'
  },
  {
    task: 'Internal link embedding',
    site: 'rankwoven.com',
    status: t('tasks.statusFailed'),
    progress: '38%',
    eta: '--'
  }
]);
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('tasks.title') }}</h2>
        <p>{{ t('tasks.body') }}</p>
      </div>
    </div>

    <section class="content-panel">
      <div class="data-table" role="table">
        <div class="data-row data-head" role="row">
          <span>{{ t('tasks.task') }}</span>
          <span>{{ t('tasks.site') }}</span>
          <span>{{ t('tasks.status') }}</span>
          <span>{{ t('tasks.progress') }}</span>
          <span>{{ t('tasks.eta') }}</span>
        </div>
        <div v-for="task in tasks" :key="`${task.task}-${task.site}`" class="data-row" role="row">
          <strong>{{ task.task }}</strong>
          <span>{{ task.site }}</span>
          <span class="status-pill">{{ task.status }}</span>
          <span>
            <span class="progress-track">
              <span class="progress-fill" :style="{ width: task.progress === '--' ? '0%' : task.progress }" />
            </span>
          </span>
          <span>{{ task.eta }}</span>
        </div>
      </div>
    </section>
  </section>
</template>
