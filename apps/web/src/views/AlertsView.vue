<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';
import { getMonitoringAlerts, muteAlert, type MonitoringAlert } from '../api/siteConnections';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const alerts = ref<MonitoringAlert[]>([]);
const loading = ref(false);
const mutingAlertId = ref('');
const errorMessage = ref('');

async function loadAlerts() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const result = await getMonitoringAlerts();
    alerts.value = result.items;
  } catch {
    errorMessage.value = t('monitoring.alertLoadFailed');
  } finally {
    loading.value = false;
  }
}

async function mute(alert: MonitoringAlert) {
  mutingAlertId.value = alert.id;
  try {
    await muteAlert(alert.id);
    await loadAlerts();
    message.success(t('monitoring.muted'));
  } catch {
    message.error(t('monitoring.muteFailed'));
  } finally {
    mutingAlertId.value = '';
  }
}

onMounted(() => {
  void loadAlerts();
});
</script>

<template>
  <section class="alerts-view">
    <header class="page-header">
      <div>
        <h1>{{ t('monitoring.alertsTitle') }}</h1>
        <p>{{ t('monitoring.alertsDescription') }}</p>
      </div>
      <a-button :loading="loading" @click="loadAlerts">{{ t('monitoring.refresh') }}</a-button>
    </header>

    <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage" />
    <a-spin v-else-if="loading && alerts.length === 0" />
    <a-empty v-else-if="alerts.length === 0" :description="t('monitoring.alertsEmpty')" />
    <a-table v-else :data-source="alerts" :pagination="false" row-key="id" size="middle">
      <a-table-column key="channel" :title="t('monitoring.channel')" data-index="channel" />
      <a-table-column key="status" :title="t('monitoring.status')" data-index="status">
        <template #default="{ record }">
          <a-tag :color="record.status === 'muted' ? 'default' : 'processing'">{{ record.status }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column key="createdAt" :title="t('monitoring.detectedAt')" data-index="createdAt" />
      <a-table-column key="action" :title="t('monitoring.action')" align="right">
        <template #default="{ record }">
          <a-button
            v-if="record.status !== 'muted'"
            size="small"
            :loading="mutingAlertId === record.id"
            @click="mute(record)"
          >
            {{ t('monitoring.mute') }}
          </a-button>
        </template>
      </a-table-column>
    </a-table>
  </section>
</template>

<style scoped>
.alerts-view {
  display: grid;
  gap: 24px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-header h1 {
  margin: 0;
}

.page-header p {
  margin: 8px 0 0;
  color: var(--text-secondary, #64748b);
}
</style>
