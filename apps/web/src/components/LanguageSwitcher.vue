<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { GlobalOutlined } from '@ant-design/icons-vue';
import { supportedLocales, type AppLocale } from '../i18n';

const { locale } = useI18n();

const currentLanguage = computed(() => {
  return supportedLocales.find((item) => item.code === locale.value) ?? supportedLocales[0];
});

function selectLocale(nextLocale: AppLocale) {
  locale.value = nextLocale;
  globalThis.localStorage?.setItem('aieo-locale', nextLocale);
}
</script>

<template>
  <a-dropdown trigger="click">
    <a-button>
      <template #icon>
        <GlobalOutlined />
      </template>
      {{ currentLanguage.label }}
    </a-button>
    <template #overlay>
      <a-menu>
        <a-menu-item v-for="language in supportedLocales" :key="language.code" @click="selectLocale(language.code)">
          {{ language.label }}
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>
