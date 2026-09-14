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
import { getBreadcrumbRoutes, getNavigationGroups, getRoutePath } from './constants/routeRegistry';
import { useTheme } from './composables/useTheme';
import { useAuthStore } from './stores/auth';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const { isDark } = useTheme();
const authStore = useAuthStore();
const isNavigationOpen = ref(false);
const rankwovenLogoSource = computed(() => (isDark.value ? rankwovenLogoDark : rankwovenLogo));

const navigationIcons = {
  'app-dashboard': LayoutDashboard, 'app-sites': Waypoints, 'app-analytics': BarChart3,
  'app-keywords': Search, 'app-media': Image, 'app-links': Link2, 'app-tasks': ListChecks,
  'app-cms-adapters': PlugZap, 'app-lighthouse': Gauge, 'app-settings': Settings,
  'admin-overview': BarChart3, 'admin-customers': Users, 'admin-usage': CreditCard,
  'admin-operations': Activity, 'admin-settings': Settings
} as const;

const marketingItems = computed(() => getNavigationGroups('marketing_header').flatMap((group) => group.routes));
const marketingFooterItems = computed(() => getNavigationGroups('marketing_footer').flatMap((group) => group.routes));

const currentTitle = computed(() => t(String(route.meta.titleKey ?? 'nav.dashboard')));
const currentLayout = computed(() => String(route.meta.layout ?? 'app'));
const isMarketingLayout = computed(() => currentLayout.value === 'marketing');
const isAdminLayout = computed(() => currentLayout.value === 'admin');
const currentSiteId = computed(() => typeof route.params.siteId === 'string' ? route.params.siteId : '');
const navigationGroups = computed(() => getNavigationGroups(isAdminLayout.value ? 'admin_sidebar' : 'customer_sidebar')
  .map((group) => ({ ...group, routes: group.routes.filter((item) => item.siteScope !== 'required' || Boolean(currentSiteId.value)) }))
  .filter((group) => group.routes.length > 0));
const breadcrumbs = computed(() => {
  const routeId = typeof route.meta.routeId === 'string' ? route.meta.routeId : '';
  return routeId ? getBreadcrumbRoutes(routeId) : [];
});
const shellSubtitle = computed(() => (isAdminLayout.value ? t('admin.subtitle') : t('app.brandSubtitle')));
const topbarPhase = computed(() => (isAdminLayout.value ? t('admin.phase') : t('app.phase')));
const selectedMenuKeys = computed(() => [route.path]);
const marketingEntryLink = computed(() => (authStore.isLoggedIn ? getRoutePath('app-dashboard') : getRoutePath('auth-login')));
const marketingEntryLabelKey = computed(() => (authStore.isLoggedIn ? 'marketing.nav.dashboard' : 'marketing.nav.login'));

function navigationPath(routeId: string, siteScoped = false) {
  return siteScoped && currentSiteId.value ? getRoutePath(routeId, { siteId: currentSiteId.value }) : getRoutePath(routeId);
}

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
          :key="item.id"
          :to="getRoutePath(item.id)"
          active-class=""
          exact-active-class="router-link-active"
        >
          {{ t(item.navLabelKey ?? item.titleKey ?? '') }}
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
        <RouterLink v-for="item in marketingFooterItems" :key="item.id" :to="getRoutePath(item.id)">
          {{ t(item.navLabelKey ?? item.titleKey ?? '') }}
        </RouterLink>
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
        <template v-for="group in navigationGroups" :key="group.group">
          <a-menu-item-group :title="t(`navigationGroups.${group.group}`)">
            <a-menu-item v-for="item in group.routes" :key="navigationPath(item.id, item.siteScope === 'required')">
              <template #icon>
                <component :is="navigationIcons[item.id as keyof typeof navigationIcons] ?? LayoutDashboard" :size="17" aria-hidden="true" />
              </template>
              {{ t(item.navLabelKey ?? item.titleKey ?? '') }}
            </a-menu-item>
          </a-menu-item-group>
        </template>
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
          <a-breadcrumb v-if="breadcrumbs.length > 1" class="app-breadcrumb">
            <a-breadcrumb-item v-for="crumb in breadcrumbs" :key="crumb.id">{{ t(crumb.titleKey ?? '') }}</a-breadcrumb-item>
          </a-breadcrumb>
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
