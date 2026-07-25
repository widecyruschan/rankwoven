<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const groups = computed(() => [
  {
    title: t('admin.settings.plansTitle'),
    items: [t('admin.settings.planLimits'), t('admin.settings.overageRules'), t('admin.settings.trialControls')]
  },
  {
    title: t('admin.settings.providersTitle'),
    items: [t('admin.settings.providerFallback'), t('admin.settings.providerBudgets'), t('admin.settings.providerKeys')]
  },
  {
    title: t('admin.settings.cmsTitle'),
    items: [t('admin.settings.wordpress'), t('admin.settings.joomla'), t('admin.settings.opencart')]
  },
  {
    title: t('admin.settings.teamTitle'),
    items: [t('admin.settings.roles'), t('admin.settings.auditLog'), t('admin.settings.security')]
  }
]);
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('admin.settings.title') }}</h2>
        <p>{{ t('admin.settings.body') }}</p>
      </div>
    </div>

    <div class="settings-grid">
      <section v-for="group in groups" :key="group.title" class="content-panel">
        <div class="panel-heading">
          <h2>{{ group.title }}</h2>
          <span class="status-pill">{{ t('settings.pending') }}</span>
        </div>
        <ul class="plain-list">
          <li v-for="item in group.items" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>
  </section>
</template>
