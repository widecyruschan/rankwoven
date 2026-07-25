<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const incidents = computed(() => [
  { title: t('admin.operations.failedPublish'), site: 'shop.rankwoven.com', severity: t('admin.status.watch') },
  { title: t('admin.operations.providerDelay'), site: 'Wenwen API', severity: t('tasks.statusRunning') },
  { title: t('admin.operations.reviewBacklog'), site: 'Agency segment', severity: t('tasks.statusWaiting') }
]);
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('admin.operations.title') }}</h2>
        <p>{{ t('admin.operations.body') }}</p>
      </div>
    </div>

    <div class="settings-grid">
      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('admin.operations.incidentTitle') }}</h2>
          <span>{{ t('admin.operations.live') }}</span>
        </div>
        <div class="operation-list">
          <article v-for="incident in incidents" :key="incident.title" class="operation-item">
            <div>
              <strong>{{ incident.title }}</strong>
              <span>{{ incident.site }}</span>
            </div>
            <span class="status-pill">{{ incident.severity }}</span>
          </article>
        </div>
      </section>

      <section class="content-panel">
        <div class="panel-heading">
          <h2>{{ t('admin.operations.checklistTitle') }}</h2>
        </div>
        <ul class="check-list">
          <li>{{ t('admin.operations.checkCert') }}</li>
          <li>{{ t('admin.operations.checkQueue') }}</li>
          <li>{{ t('admin.operations.checkWebhook') }}</li>
        </ul>
      </section>
    </div>
  </section>
</template>
