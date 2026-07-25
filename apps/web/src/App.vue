<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  FileSearch,
  LayoutDashboard,
  Link2,
  ListChecks,
  PlugZap,
  Settings,
  Sparkles,
  Waypoints
} from 'lucide-vue-next';
import rankwovenLogo from './assets/rankwoven-logo.svg';
import LanguageSwitcher from './components/LanguageSwitcher.vue';

const route = useRoute();
const { t } = useI18n();
const isNavigationOpen = ref(false);

const navigationItems = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/sites', labelKey: 'nav.sites', icon: Waypoints },
  { to: '/articles', labelKey: 'nav.articles', icon: FileSearch },
  { to: '/review', labelKey: 'nav.review', icon: Sparkles },
  { to: '/links', labelKey: 'nav.links', icon: Link2 },
  { to: '/tasks', labelKey: 'nav.tasks', icon: ListChecks },
  { to: '/cms-adapters', labelKey: 'nav.cmsAdapters', icon: PlugZap },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings }
];

const currentTitle = computed(() => t(String(route.meta.titleKey ?? 'nav.dashboard')));

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

      <nav class="nav-list" :aria-label="t('app.mainNavigation')">
        <RouterLink v-for="item in navigationItems" :key="item.to" :to="item.to">
          <component :is="item.icon" :size="17" aria-hidden="true" />
          <span>{{ t(item.labelKey) }}</span>
        </RouterLink>
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
