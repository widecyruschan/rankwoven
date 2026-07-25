<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronDown, Globe2 } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { supportedLocales, type AppLocale } from '../i18n';

const { locale } = useI18n();
const isMenuOpen = ref(false);

const currentLanguage = computed(() => {
  return supportedLocales.find((item) => item.code === locale.value) ?? supportedLocales[0];
});

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
}

function selectLocale(nextLocale: AppLocale) {
  locale.value = nextLocale;
  isMenuOpen.value = false;
  globalThis.localStorage?.setItem('aieo-locale', nextLocale);
}
</script>

<template>
  <div class="language-switcher">
    <button class="language-button" type="button" @click="toggleMenu">
      <Globe2 :size="18" aria-hidden="true" />
      <span>{{ currentLanguage.label }}</span>
      <ChevronDown :size="18" aria-hidden="true" />
    </button>

    <div v-if="isMenuOpen" class="language-menu" role="menu">
      <button
        v-for="language in supportedLocales"
        :key="language.code"
        class="language-option"
        :class="{ 'language-option-active': language.code === locale }"
        type="button"
        role="menuitem"
        @click="selectLocale(language.code)"
      >
        <span>{{ language.label }}</span>
        <span v-if="language.code === locale">✓</span>
      </button>
    </div>
  </div>
</template>
