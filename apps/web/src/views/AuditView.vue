<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { getSiteConnections, type SiteConnection } from '@/api/siteConnections';
import LighthousePanel from '@/components/LighthousePanel.vue';

const { t } = useI18n();

const sites = ref<SiteConnection[]>([]);
const selectedSiteId = ref<string>('');

const siteOptions = computed(() =>
  sites.value.map((site) => ({
    label: site.name,
    value: site.id
  }))
);

const selectedSite = computed(() =>
  sites.value.find((s) => s.id === selectedSiteId.value)
);

onMounted(async () => {
  try {
    const result = await getSiteConnections();
    sites.value = result.sites;
    if (sites.value.length > 0) {
      selectedSiteId.value = sites.value[0].id;
    }
  } catch {
    // sites not critical
  }
});
</script>

<template>
  <section class="page-section">
    <!-- Page intro -->
    <div class="page-heading">
      <h1>{{ t('lighthouse.title') }}</h1>
      <p>{{ t('lighthouse.body') }}</p>
    </div>

    <!-- Site selector -->
    <div v-if="sites.length > 0" class="audit-toolbar">
      <div class="toolbar-group">
        <label class="toolbar-label">{{ t('searchConsole.siteLabel') }}</label>
        <a-select
          v-model:value="selectedSiteId"
          :options="siteOptions"
          :placeholder="t('searchConsole.siteLabel')"
          style="min-width: 280px;"
        />
      </div>
    </div>

    <!-- Full Lighthouse panel -->
    <LighthousePanel
      v-if="selectedSite"
      :key="selectedSiteId"
      :site-url="selectedSite.siteUrl"
    />

    <!-- No site connected -->
    <div v-else class="content-panel" style="text-align: center; padding: 48px;">
      <p class="panel-note">{{ t('dashboard.noSitesConnected') }}</p>
    </div>
  </section>
</template>

<style scoped>
.page-section {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-heading {
  margin-bottom: 24px;
}

.page-heading h1 {
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 700;
}

.page-heading p {
  margin: 0;
  color: var(--color-muted);
  font-size: 14px;
  line-height: 1.6;
}

.audit-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 20px;
}

.toolbar-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toolbar-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

@media (max-width: 640px) {
  .page-section {
    padding: 16px;
  }
}
</style>
