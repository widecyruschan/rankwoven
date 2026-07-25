<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const adapters = computed(() => [
  {
    name: 'WordPress',
    phase: 'MVP',
    status: t('cmsAdapters.reference'),
    capabilities: [t('cmsAdapters.sync'), t('cmsAdapters.audit'), t('cmsAdapters.apply'), t('cmsAdapters.rollback')]
  },
  {
    name: 'Joomla',
    phase: 'Phase 2',
    status: t('cmsAdapters.reserved'),
    capabilities: [t('cmsAdapters.sync'), t('cmsAdapters.audit')]
  },
  {
    name: 'OpenCart',
    phase: 'Phase 3',
    status: t('cmsAdapters.reserved'),
    capabilities: [t('cmsAdapters.sync'), t('cmsAdapters.audit')]
  }
]);
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('cmsAdapters.title') }}</h2>
      </div>
    </div>

    <section class="content-panel">
      <div class="data-table" role="table" aria-label="CMS adapters">
        <div class="data-row data-head" role="row">
          <span>{{ t('cmsAdapters.platform') }}</span>
          <span>{{ t('cmsAdapters.phase') }}</span>
          <span>{{ t('cmsAdapters.status') }}</span>
          <span>{{ t('cmsAdapters.capabilities') }}</span>
        </div>
        <div v-for="adapter in adapters" :key="adapter.name" class="data-row" role="row">
          <strong>{{ adapter.name }}</strong>
          <span>{{ adapter.phase }}</span>
          <span class="status-pill">{{ adapter.status }}</span>
          <span class="tag-group">
            <span v-for="capability in adapter.capabilities" :key="capability" class="tag-pill">
              {{ capability }}
            </span>
          </span>
        </div>
      </div>
    </section>
  </section>
</template>
