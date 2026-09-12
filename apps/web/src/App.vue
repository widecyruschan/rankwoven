<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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
import rankwovenLogoDark from './assets/rankwoven-logo-dark.svg';
import LanguageSwitcher from './components/LanguageSwitcher.vue';
import ThemeSwitcher from './components/ThemeSwitcher.vue';
import { getRoutePath } from './constants/routeRegistry';
import { useTheme } from './composables/useTheme';
import { useAuthStore } from './stores/auth';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const { isDark } = useTheme();
const authStore = useAuthStore();
const isNavigationOpen = ref(false);
const rankwovenLogoSource = computed(() => (isDark.value ? rankwovenLogoDark : rankwovenLogo));

const marketingItems = [
  { routeId: 'public-features', labelKey: 'marketing.nav.features' },
  { routeId: 'public-pricing', labelKey: 'marketing.nav.pricing' },
  { routeId: 'public-blog', labelKey: 'marketing.nav.blog' },
  { routeId: 'public-docs', labelKey: 'marketing.nav.docs' },
  { routeId: 'public-help', labelKey: 'marketing.nav.help' },
  { routeId: 'auth-login', labelKey: 'marketing.nav.login' }
].map((item) => ({ to: getRoutePath(item.routeId), labelKey: item.labelKey }));

const appNavigationItems = [
  { routeId: 'app-dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { routeId: 'app-sites', labelKey: 'nav.sites', icon: Waypoints },
  { routeId: 'app-analytics', labelKey: 'nav.analytics', icon: BarChart3 },
  { routeId: 'app-keywords', labelKey: 'nav.keywords', icon: Search },
  { routeId: 'app-media', labelKey: 'nav.media', icon: Image },
  { routeId: 'app-links', labelKey: 'nav.links', icon: Link2 },
  { routeId: 'app-tasks', labelKey: 'nav.tasks', icon: ListChecks },
  { routeId: 'app-cms-adapters', labelKey: 'nav.cmsAdapters', icon: PlugZap },
  { routeId: 'app-lighthouse', labelKey: 'nav.lighthouse', icon: Gauge },
  { routeId: 'app-settings', labelKey: 'nav.settings', icon: Settings }
].map((item) => ({ to: getRoutePath(item.routeId), labelKey: item.labelKey, icon: item.icon }));

const adminNavigationItems = [
  { routeId: 'admin-overview', labelKey: 'admin.nav.overview', icon: BarChart3 },
  { routeId: 'admin-customers', labelKey: 'admin.nav.customers', icon: Users },
  { routeId: 'admin-usage', labelKey: 'admin.nav.usage', icon: CreditCard },
  { routeId: 'admin-operations', labelKey: 'admin.nav.operations', icon: Activity },
  { routeId: 'admin-settings', labelKey: 'admin.nav.settings', icon: Settings }
].map((item) => ({ to: getRoutePath(item.routeId), labelKey: item.labelKey, icon: item.icon }));

const currentTitle = computed(() => t(String(route.meta.titleKey ?? 'nav.dashboard')));
const currentLayout = computed(() => String(route.meta.layout ?? 'app'));
const isMarketingLayout = computed(() => currentLayout.value === 'marketing');
const isAdminLayout = computed(() => currentLayout.value === 'admin');
const navigationItems = computed(() => (isAdminLayout.value ? adminNavigationItems : appNavigationItems));
const shellSubtitle = computed(() => (isAdminLayout.value ? t('admin.subtitle') : t('app.brandSubtitle')));
const topbarPhase = computed(() => (isAdminLayout.value ? t('admin.phase') : t('app.phase')));
const selectedMenuKeys = computed(() => [route.path]);
const marketingEntryLink = computed(() => (authStore.isLoggedIn ? getRoutePath('app-dashboard') : getRoutePath('auth-login')));
const marketingEntryLabelKey = computed(() => (authStore.isLoggedIn ? 'marketing.nav.dashboard' : 'marketing.nav.login'));

watch(
  locale,
  (value) => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = value === 'zh-Hant' ? 'zh-Hant' : value;
    }
  },
  { immediate: true }
);

function toggleNavigation() {
  isNavigationOpen.value = !isNavigationOpen.value;
}

function navigateToMenuItem({ key }: { key: string }) {
  isNavigationOpen.value = false;
  void router.push(key);
}

function logout() {
  authStore.logout();
  void router.push(getRoutePath('auth-login'));
}
</script>

<template>
  <div v-if="isMarketingLayout" class="marketing-shell">
    <header class="marketing-topbar">
      <RouterLink class="marketing-brand" :to="getRoutePath('marketing-home')">
        <img class="brand-logo" :src="rankwovenLogoSource" alt="RankWoven">
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
        <ThemeSwitcher />
        <LanguageSwitcher />
        <RouterLink class="icon-link-button" :to="marketingEntryLink">
          <LogIn :size="17" aria-hidden="true" />
          <span>{{ t(marketingEntryLabelKey) }}</span>
        </RouterLink>
      </div>
    </header>

    <RouterView />
    <footer class="marketing-footer">
      <div>
        <strong>RankWoven</strong>
        <span>{{ t('marketing.footer.tagline') }}</span>
      </div>
      <nav :aria-label="t('marketing.footer.legal')">
        <RouterLink :to="getRoutePath('public-about')">{{ t('marketing.nav.about') }}</RouterLink>
        <RouterLink :to="getRoutePath('public-contact')">{{ t('marketing.nav.contact') }}</RouterLink>
        <RouterLink :to="getRoutePath('public-privacy')">{{ t('marketing.footer.privacy') }}</RouterLink>
        <RouterLink :to="getRoutePath('public-terms')">{{ t('marketing.footer.terms') }}</RouterLink>
      </nav>
    </footer>
  </div>

  <a-layout v-else class="app-shell">
    <a-layout-sider class="sidebar" :class="{ 'sidebar-open': isNavigationOpen }" width="272">
      <div class="brand">
        <img class="brand-logo" :src="rankwovenLogoSource" alt="RankWoven">
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
          <RouterLink class="icon-link-button" :to="getRoutePath('marketing-home')">
            {{ t('app.publicSite') }}
          </RouterLink>
          <RouterLink v-if="isAdminLayout" class="icon-link-button" :to="getRoutePath('app-dashboard')">
            {{ t('app.customerDashboard') }}
          </RouterLink>
          <RouterLink v-else class="icon-link-button" :to="getRoutePath('admin-overview')">
            {{ t('app.adminDashboard') }}
          </RouterLink>
          <ThemeSwitcher />
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
