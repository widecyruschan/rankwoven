<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const adapters = computed(() => [
  { name: 'WordPress', phase: 'MVP', status: t('cmsAdapters.reference') },
  { name: 'Joomla', phase: 'Phase 2', status: t('cmsAdapters.reserved') },
  { name: 'OpenCart', phase: 'Phase 3', status: t('cmsAdapters.reserved') }
]);
</script>

<template>
  <section class="content-panel">
    <h2>{{ t('cmsAdapters.title') }}</h2>
    <div class="table-like" role="table" aria-label="CMS 適配器列表">
      <div class="table-row table-head" role="row">
        <span>{{ t('cmsAdapters.platform') }}</span>
        <span>{{ t('cmsAdapters.phase') }}</span>
        <span>{{ t('cmsAdapters.status') }}</span>
      </div>
      <div v-for="adapter in adapters" :key="adapter.name" class="table-row" role="row">
        <span>{{ adapter.name }}</span>
        <span>{{ adapter.phase }}</span>
        <span>{{ adapter.status }}</span>
      </div>
    </div>
  </section>
</template>
