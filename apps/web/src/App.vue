<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import rankwovenLogo from './assets/rankwoven-logo.svg';
import LanguageSwitcher from './components/LanguageSwitcher.vue';

const route = useRoute();
const { t } = useI18n();
const isNavigationOpen = ref(false);

const currentTitle = computed(() => String(route.meta.title ?? 'AIEO'));

function toggleNavigation() {
  isNavigationOpen.value = !isNavigationOpen.value;
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar" :class="{ 'sidebar-open': isNavigationOpen }">
      <div class="brand">
        <img class="brand-logo" :src="rankwovenLogo" alt="RankWoven">
        <small>{{ t('app.brandSubtitle') }}</small>
      </div>

      <nav class="nav-list" aria-label="主導覽">
        <RouterLink to="/">{{ t('nav.dashboard') }}</RouterLink>
        <RouterLink to="/sites">{{ t('nav.sites') }}</RouterLink>
        <RouterLink to="/cms-adapters">{{ t('nav.cmsAdapters') }}</RouterLink>
        <RouterLink to="/settings">{{ t('nav.settings') }}</RouterLink>
      </nav>
    </aside>

    <main class="main-panel">
      <header class="topbar">
        <button class="menu-button" type="button" @click="toggleNavigation">
          {{ t('app.menu') }}
        </button>
        <div>
          <p>{{ t('app.phase') }}</p>
          <h1>{{ currentTitle }}</h1>
        </div>
        <LanguageSwitcher />
      </header>

      <RouterView />
    </main>
  </div>
</template>
