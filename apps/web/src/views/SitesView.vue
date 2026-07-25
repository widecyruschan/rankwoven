<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <section class="content-panel">
    <h2>{{ t('sites.title') }}</h2>
    <p>{{ t('sites.body') }}</p>
  </section>
</template>
