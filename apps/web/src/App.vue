<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  Activity,
  BarChart3,
  CreditCard,
  FileSearch,
  LayoutDashboard,
  Link2,
  ListChecks,
  LogIn,
  PlugZap,
  Settings,
  Sparkles,
  Users,
  Waypoints
} from 'lucide-vue-next';
import rankwovenLogo from './assets/rankwoven-logo.svg';
import LanguageSwitcher from './components/LanguageSwitcher.vue';

const route = useRoute();
const { t } = useI18n();
const isNavigationOpen = ref(false);

const marketingItems = [
  { to: '/', labelKey: 'marketing.nav.features' },
  { to: '/pricing', labelKey: 'marketing.nav.pricing' },
  { to: '/login', labelKey: 'marketing.nav.login' }
];

const appNavigationItems = [
  { to: '/app', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/app/sites', labelKey: 'nav.sites', icon: Waypoints },
  { to: '/app/articles', labelKey: 'nav.articles', icon: FileSearch },
  { to: '/app/review', labelKey: 'nav.review', icon: Sparkles },
  { to: '/app/links', labelKey: 'nav.links', icon: Link2 },
  { to: '/app/tasks', labelKey: 'nav.tasks', icon: ListChecks },
  { to: '/app/cms-adapters', labelKey: 'nav.cmsAdapters', icon: PlugZap },
  { to: '/app/settings', labelKey: 'nav.settings', icon: Settings }
];

const adminNavigationItems = [
  { to: '/admin', labelKey: 'admin.nav.overview', icon: BarChart3 },
  { to: '/admin/customers', labelKey: 'admin.nav.customers', icon: Users },
  { to: '/admin/usage', labelKey: 'admin.nav.usage', icon: CreditCard },
  { to: '/admin/operations', labelKey: 'admin.nav.operations', icon: Activity },
  { to: '/admin/settings', labelKey: 'admin.nav.settings', icon: Settings }
];

const currentTitle = computed(() => t(String(route.meta.titleKey ?? 'nav.dashboard')));
const currentLayout = computed(() => String(route.meta.layout ?? 'app'));
const isMarketingLayout = computed(() => currentLayout.value === 'marketing');
const isAdminLayout = computed(() => currentLayout.value === 'admin');
const navigationItems = computed(() => (isAdminLayout.value ? adminNavigationItems : appNavigationItems));
const shellSubtitle = computed(() => (isAdminLayout.value ? t('admin.subtitle') : t('app.brandSubtitle')));
const topbarPhase = computed(() => (isAdminLayout.value ? t('admin.phase') : t('app.phase')));

function toggleNavigation() {
  isNavigationOpen.value = !isNavigationOpen.value;
}
</script>

<template>
  <div v-if="isMarketingLayout" class="marketing-shell">
    <header class="marketing-topbar">
      <RouterLink class="marketing-brand" to="/">
        <img class="brand-logo" :src="rankwovenLogo" alt="RankWoven">
      </RouterLink>
      <nav class="marketing-nav" :aria-label="t('app.mainNavigation')">
        <RouterLink
          v-for="item in marketingItems"
          :key="item.to"
          :to="item.to"
          active-class=""
          exact-active-class="router-link-active"
        >
          {{ t(item.labelKey) }}
        </RouterLink>
      </nav>
      <div class="marketing-actions">
        <LanguageSwitcher />
        <RouterLink class="icon-link-button" to="/app">
          <LogIn :size="17" aria-hidden="true" />
          <span>{{ t('marketing.nav.dashboard') }}</span>
        </RouterLink>
      </div>
    </header>

    <RouterView />
  </div>

  <div v-else class="app-shell">
    <aside class="sidebar" :class="{ 'sidebar-open': isNavigationOpen }">
      <div class="brand">
        <img class="brand-logo" :src="rankwovenLogo" alt="RankWoven">
        <small>{{ shellSubtitle }}</small>
      </div>

      <nav class="nav-list" :aria-label="t('app.mainNavigation')">
        <RouterLink
          v-for="item in navigationItems"
          :key="item.to"
          :to="item.to"
          active-class=""
          exact-active-class="router-link-active"
        >
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
          <p>{{ topbarPhase }}</p>
          <h1>{{ currentTitle }}</h1>
        </div>
        <LanguageSwitcher />
      </header>

      <RouterView />
    </main>
  </div>
</template>
