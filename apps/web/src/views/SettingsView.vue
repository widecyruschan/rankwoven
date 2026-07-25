<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const settingGroups = computed(() => [
  {
    title: t('settings.apiTitle'),
    items: ['https://rankwoven.com', 'https://api.rankwoven.com'],
    status: t('settings.configured')
  },
  {
    title: t('settings.aiTitle'),
    items: ['Wenwen API', 'OpenAI / Gemini / DeepSeek'],
    status: t('settings.enabled')
  },
  {
    title: t('settings.storageTitle'),
    items: ['Qiniu Kodo', 'assets.rankwoven.com'],
    status: t('settings.pending')
  },
  {
    title: t('settings.teamTitle'),
    items: ['Owner', 'Admin', 'Editor'],
    status: t('settings.notConfigured')
  }
]);
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <h2>{{ t('settings.title') }}</h2>
        <p>{{ t('settings.body') }}</p>
      </div>
    </div>

    <div class="settings-grid">
      <section v-for="group in settingGroups" :key="group.title" class="content-panel">
        <div class="panel-heading">
          <h2>{{ group.title }}</h2>
          <span class="status-pill">{{ group.status }}</span>
        </div>
        <ul class="plain-list">
          <li v-for="item in group.items" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>
  </section>
</template>
