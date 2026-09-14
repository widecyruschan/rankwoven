<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  createSiteMonitor,
  getMonitorEvents,
  getSiteConnections,
  type MonitorEvent,
  type SiteConnection
} from '../api/siteConnections';

const { t } = useI18n();
const events = ref<MonitorEvent[]>([]);
const loading = ref(false);
const errorMessage = ref('');
const creating = ref(false);
const sites = ref<SiteConnection[]>([]);
const monitorSiteId = ref('');
const monitorKind = ref<'competitor' | 'ai_visibility' | 'technical'>('technical');
const monitorFrequency = ref<'daily' | 'weekly' | 'monthly'>('weekly');
const monitorThreshold = ref(5);

const siteOptions = computed(() => sites.value.map((site) => ({ value: site.id, label: site.name || site.siteUrl })));

async function loadEvents() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const result = await getMonitorEvents();
    events.value = result.items;
  } catch {
    errorMessage.value = t('monitoring.loadFailed');
  } finally {
    loading.value = false;
  }
}

async function loadSites() {
  try {
    const result = await getSiteConnections();
    sites.value = result.sites;
    monitorSiteId.value = monitorSiteId.value || result.sites[0]?.id || '';
  } catch {
    // Event loading exposes a user-facing failure; the creation form can remain unavailable.
  }
}

async function createMonitor() {
  if (!monitorSiteId.value) return;
  creating.value = true;
  try {
    await createSiteMonitor({
      siteId: monitorSiteId.value,
      kind: monitorKind.value,
      frequency: monitorFrequency.value,
      threshold: monitorThreshold.value
    });
    await loadEvents();
  } catch {
    errorMessage.value = t('monitoring.createFailed');
  } finally {
    creating.value = false;
  }
}

function severityType(severity: MonitorEvent['severity']) {
  if (severity === 'critical') return 'error';
  if (severity === 'warning') return 'warning';
  return 'info';
}

onMounted(() => {
  void loadEvents();
  void loadSites();
});
</script>

<template>
  <section class="monitor-events-view">
    <header class="page-header">
      <div>
        <h1>{{ t('monitoring.title') }}</h1>
        <p>{{ t('monitoring.description') }}</p>
      </div>
      <a-button :loading="loading" @click="loadEvents">{{ t('monitoring.refresh') }}</a-button>
    </header>

    <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage" />
    <a-card :title="t('monitoring.createTitle')" size="small">
      <a-form layout="inline" @finish="createMonitor">
        <a-form-item :label="t('monitoring.site')">
          <a-select v-model:value="monitorSiteId" :options="siteOptions" :placeholder="t('monitoring.selectSite')" style="min-width: 180px" />
        </a-form-item>
        <a-form-item :label="t('monitoring.kind')">
          <a-select v-model:value="monitorKind" style="width: 150px">
            <a-select-option value="technical">{{ t('monitoring.kindTechnical') }}</a-select-option>
            <a-select-option value="competitor">{{ t('monitoring.kindCompetitor') }}</a-select-option>
            <a-select-option value="ai_visibility">{{ t('monitoring.kindAiVisibility') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="t('monitoring.frequency')">
          <a-select v-model:value="monitorFrequency" style="width: 120px">
            <a-select-option value="daily">{{ t('monitoring.daily') }}</a-select-option>
            <a-select-option value="weekly">{{ t('monitoring.weekly') }}</a-select-option>
            <a-select-option value="monthly">{{ t('monitoring.monthly') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="t('monitoring.threshold')">
          <a-input-number v-model:value="monitorThreshold" :min="0" :max="100" />
        </a-form-item>
        <a-form-item>
          <a-button html-type="submit" type="primary" :disabled="!monitorSiteId" :loading="creating">{{ t('monitoring.create') }}</a-button>
        </a-form-item>
      </a-form>
    </a-card>
    <a-spin v-if="loading && events.length === 0" />
    <a-empty v-else-if="events.length === 0" :description="t('monitoring.empty')" />
    <a-table v-else :data-source="events" :pagination="false" row-key="id" size="middle">
      <a-table-column key="eventType" :title="t('monitoring.eventType')" data-index="eventType" />
      <a-table-column key="severity" :title="t('monitoring.severity')" data-index="severity">
        <template #default="{ record }">
          <a-tag :color="severityType(record.severity)">{{ record.severity }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column key="sourceType" :title="t('monitoring.source')" data-index="sourceType" />
      <a-table-column key="delta" :title="t('monitoring.change')" data-index="delta">
        <template #default="{ record }">{{ record.delta ?? t('monitoring.notAvailable') }}</template>
      </a-table-column>
      <a-table-column key="createdAt" :title="t('monitoring.detectedAt')" data-index="createdAt" />
    </a-table>
  </section>
</template>

<style scoped>
.monitor-events-view {
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
