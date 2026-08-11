<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { LockKeyhole, Settings2 } from 'lucide-vue-next';

const { t } = useI18n();

const groups = computed(() => [
  {
    title: t('admin.settings.plansTitle'),
    items: [t('admin.settings.planLimits'), t('admin.settings.overageRules'), t('admin.settings.trialControls')],
    tone: 'primary'
  },
  {
    title: t('admin.settings.providersTitle'),
    items: [t('admin.settings.providerFallback'), t('admin.settings.providerBudgets'), t('admin.settings.providerKeys')],
    tone: 'accent'
  },
  {
    title: t('admin.settings.cmsTitle'),
    items: [t('admin.settings.wordpress'), t('admin.settings.joomla'), t('admin.settings.opencart')],
    tone: 'neutral'
  },
  {
    title: t('admin.settings.teamTitle'),
    items: [t('admin.settings.roles'), t('admin.settings.auditLog'), t('admin.settings.security')],
    tone: 'primary'
  }
]);

const governanceStats = computed(() => [
  { label: t('admin.settings.configuredModules'), value: '4', tone: 'primary' },
  { label: t('admin.settings.pendingReviews'), value: '7', tone: 'accent' },
  { label: t('admin.settings.secretSafe'), value: t('settings.configured'), tone: 'primary' }
]);
</script>

<template>
  <section class="page-section">
    <section class="admin-command-hero admin-command-hero--compact">
      <div class="admin-hero-copy">
        <span class="hero-eyebrow">{{ t('admin.settings.heroEyebrow') }}</span>
        <h2>{{ t('admin.settings.title') }}</h2>
        <p>{{ t('admin.settings.body') }}</p>
      </div>
      <div class="admin-hero-card">
        <div class="admin-hero-card-icon">
          <LockKeyhole :size="22" aria-hidden="true" />
        </div>
        <strong>{{ t('admin.settings.governanceTitle') }}</strong>
        <span>{{ t('admin.settings.governanceBody') }}</span>
      </div>
    </section>

    <div class="summary-grid compact-grid">
      <article v-for="stat in governanceStats" :key="stat.label" class="metric-card" :data-tone="stat.tone">
        <span>{{ stat.label }}</span>
        <strong>{{ stat.value }}</strong>
      </article>
    </div>

    <div class="settings-grid">
      <section v-for="group in groups" :key="group.title" class="content-panel admin-setting-card" :data-tone="group.tone">
        <div class="panel-heading">
          <div class="panel-title-group">
            <Settings2 :size="18" aria-hidden="true" />
            <h2>{{ group.title }}</h2>
          </div>
          <span class="status-pill">{{ t('settings.pending') }}</span>
        </div>
        <ul class="plain-list">
          <li v-for="item in group.items" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>
  </section>
</template>
