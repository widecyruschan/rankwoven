<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  Activity,
  BarChart3,
  CreditCard,
  Gauge,
  Image,
  LayoutDashboard,
  Link2,
  ListChecks,
  LogIn,
  LogOut,
  Search,
  PlugZap,
  Settings,
  Users,
  Waypoints
} from 'lucide-vue-next';
import rankwovenLogo from './assets/rankwoven-logo.svg';
import LanguageSwitcher from './components/LanguageSwitcher.vue';
import { useAuthStore } from './stores/auth';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const isNavigationOpen = ref(false);

const marketingItems = [
  { to: '/', labelKey: 'marketing.nav.features' },
  { to: '/pricing', labelKey: 'marketing.nav.pricing' },
  { to: '/login', labelKey: 'marketing.nav.login' }
];

const appNavigationItems = [
  { to: '/app', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/app/sites', labelKey: 'nav.sites', icon: Waypoints },
  { to: '/app/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
  { to: '/app/keywords', labelKey: 'nav.keywords', icon: Search },
  { to: '/app/media', labelKey: 'nav.media', icon: Image },
  { to: '/app/links', labelKey: 'nav.links', icon: Link2 },
  { to: '/app/tasks', labelKey: 'nav.tasks', icon: ListChecks },
  { to: '/app/cms-adapters', labelKey: 'nav.cmsAdapters', icon: PlugZap },
  { to: '/app/lighthouse', labelKey: 'nav.lighthouse', icon: Gauge },
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
const selectedMenuKeys = computed(() => [route.path]);
const marketingEntryLink = computed(() => (authStore.isLoggedIn ? '/app' : '/login'));
const marketingEntryLabelKey = computed(() => (authStore.isLoggedIn ? 'marketing.nav.dashboard' : 'marketing.nav.login'));

function toggleNavigation() {
  isNavigationOpen.value = !isNavigationOpen.value;
}

function navigateToMenuItem({ key }: { key: string }) {
  isNavigationOpen.value = false;
  void router.push(key);
}

function logout() {
  authStore.logout();
  void router.push('/login');
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
        <RouterLink class="icon-link-button" :to="marketingEntryLink">
          <LogIn :size="17" aria-hidden="true" />
          <span>{{ t(marketingEntryLabelKey) }}</span>
        </RouterLink>
      </div>
    </header>

    <RouterView />
  </div>

  <a-layout v-else class="app-shell">
    <a-layout-sider class="sidebar" :class="{ 'sidebar-open': isNavigationOpen }" width="272">
      <div class="brand">
        <img class="brand-logo" :src="rankwovenLogo" alt="RankWoven">
        <small>{{ shellSubtitle }}</small>
      </div>

      <a-menu
        class="nav-list"
        mode="inline"
        :selected-keys="selectedMenuKeys"
        :aria-label="t('app.mainNavigation')"
        @click="navigateToMenuItem"
      >
        <a-menu-item v-for="item in navigationItems" :key="item.to">
          <template #icon>
            <component :is="item.icon" :size="17" aria-hidden="true" />
          </template>
          {{ t(item.labelKey) }}
        </a-menu-item>
      </a-menu>
    </a-layout-sider>

    <a-layout class="main-panel">
      <a-layout-header class="topbar">
        <a-button class="menu-button" type="button" @click="toggleNavigation">
          {{ t('app.menu') }}
        </a-button>
        <div>
          <p>{{ topbarPhase }}</p>
          <h1>{{ currentTitle }}</h1>
        </div>
        <div class="topbar-actions">
          <RouterLink class="icon-link-button" to="/">
            {{ t('app.publicSite') }}
          </RouterLink>
          <RouterLink v-if="isAdminLayout" class="icon-link-button" to="/app">
            {{ t('app.customerDashboard') }}
          </RouterLink>
          <RouterLink v-else class="icon-link-button" to="/admin">
            {{ t('app.adminDashboard') }}
          </RouterLink>
          <LanguageSwitcher />
          <a-button @click="logout">
            <template #icon>
              <LogOut :size="16" aria-hidden="true" />
            </template>
            {{ t('app.logout') }}
          </a-button>
        </div>
      </a-layout-header>

      <a-layout-content>
        <RouterView />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>
