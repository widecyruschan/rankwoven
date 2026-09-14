import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalizedLoaded,
  type RouteRecordRaw
} from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useSiteStore } from '../stores/site';
import { i18n } from '../i18n';
import {
  activeRouteEntries,
  getRoutePath,
  getRouteById,
  type RouteRegistryEntry
} from '../constants/routeRegistry';
import { updateSeoHead } from '../utils/seoHead';
import { getSiteConnections } from '../api/siteConnections';
import { hasRequiredRole, type WorkspaceRole } from '../utils/roles';

const componentLoaders = {
  MarketingHomeView: () => import('../views/MarketingHomeView.vue'),
  PublicContentView: () => import('../views/PublicContentView.vue'),
  BlogView: () => import('../views/BlogView.vue'),
  BlogArticleView: () => import('../views/BlogArticleView.vue'),
  PricingView: () => import('../views/PricingView.vue'),
  LoginView: () => import('../views/LoginView.vue'),
  RegisterView: () => import('../views/RegisterView.vue'),
  ForgotPasswordView: () => import('../views/ForgotPasswordView.vue'),
  ResetPasswordView: () => import('../views/ResetPasswordView.vue'),
  DashboardView: () => import('../views/DashboardView.vue'),
  SitesView: () => import('../views/SitesView.vue'),
  AnalyticsView: () => import('../views/AnalyticsView.vue'),
  KeywordSuggestionsView: () => import('../views/KeywordSuggestionsView.vue'),
  MediaOptimizationView: () => import('../views/MediaOptimizationView.vue'),
  ApplySuggestionsView: () => import('../views/ApplySuggestionsView.vue'),
  LinksView: () => import('../views/LinksView.vue'),
  TasksView: () => import('../views/TasksView.vue'),
  CmsAdaptersView: () => import('../views/CmsAdaptersView.vue'),
  SettingsView: () => import('../views/SettingsView.vue'),
  AuditView: () => import('../views/AuditView.vue'),
  SiteAuditView: () => import('../views/SiteAuditView.vue'),
  AdminOverviewView: () => import('../views/AdminOverviewView.vue'),
  AdminCustomersView: () => import('../views/AdminCustomersView.vue'),
  AdminUsageView: () => import('../views/AdminUsageView.vue'),
  AdminOperationsView: () => import('../views/AdminOperationsView.vue'),
  AdminSettingsView: () => import('../views/AdminSettingsView.vue')
  ,ContentOptimizerView: () => import('../views/ContentOptimizerView.vue')
  ,KeywordResearchView: () => import('../views/KeywordResearchView.vue')
  ,MonitorEventsView: () => import('../views/MonitorEventsView.vue')
  ,AlertsView: () => import('../views/AlertsView.vue')
  ,LegacyRouteView: () => import('../views/LegacyRouteView.vue')
};

function buildRoute(entry: RouteRegistryEntry): RouteRecordRaw {
  if (entry.redirect && !entry.legacyTargetId) return { path: entry.path, name: entry.name, redirect: entry.redirect };
  if (entry.legacyTargetId) {
    return {
      path: entry.path,
      name: entry.name,
      component: componentLoaders.LegacyRouteView,
      meta: { layout: entry.layout, requiresAuth: true, indexable: false, routeId: entry.id, area: entry.area, legacyTargetId: entry.legacyTargetId }
    };
  }
  if (!entry.componentKey) throw new Error(`Enabled route is missing a component: ${entry.id}`);
  return {
    path: entry.path,
    name: entry.name,
    component: componentLoaders[entry.componentKey],
    meta: {
      titleKey: entry.titleKey,
      layout: entry.layout,
      publicPageKey: entry.publicPageKey,
      requiresAuth: entry.area === 'customer' || entry.area === 'admin',
      requiresRole: entry.requiresRole,
      indexable: entry.indexable,
      canonicalPath: entry.canonicalPath,
      descriptionKey: entry.descriptionKey,
      keywordKey: entry.keywordKey,
      routeId: entry.id,
      area: entry.area,
      sitemapGroup: entry.sitemapGroup
      ,siteScope: entry.siteScope ?? 'none'
      ,legacyTargetId: entry.legacyTargetId
    }
  };
}

const routes = activeRouteEntries.map(buildRoute);
const loginPath = getRoutePath('auth-login');
const appDashboardPath = getRoutePath('app-dashboard');

export const router = createRouter({ history: createWebHistory(), routes });

function updateRouteSeo(to: RouteLocationNormalizedLoaded) {
  if (typeof document === 'undefined') return;
  const titleKey = typeof to.meta.titleKey === 'string' ? to.meta.titleKey : 'marketing.homeTitle';
  const descriptionKey = typeof to.meta.descriptionKey === 'string' ? to.meta.descriptionKey : '';
  const keywordKey = typeof to.meta.keywordKey === 'string' ? to.meta.keywordKey : '';
  const canonicalUrl = new URL(
    String(to.meta.canonicalPath ?? to.path),
    window.location.origin
  ).toString();
  updateSeoHead({
    title: `${String(i18n.global.t(titleKey))} | RankWoven`,
    description: descriptionKey ? String(i18n.global.t(descriptionKey)) : '',
    canonicalUrl,
    indexable: to.meta.indexable === true,
    keywords: keywordKey ? [String(i18n.global.t(keywordKey))] : undefined,
    type: to.path.startsWith('/blog/') ? 'article' : 'website',
    locale: String(i18n.global.locale.value).replace('-', '_')
  });
}

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return { path: loginPath, query: { redirect: to.fullPath } };
  }
  if (to.meta.requiresAuth && !(await authStore.restoreSession())) {
    return { path: loginPath, query: { redirect: to.fullPath } };
  }
  if (!hasRequiredRole(authStore.user?.role, to.meta.requiresRole as WorkspaceRole | undefined)) return appDashboardPath;
  const siteScope = to.meta.siteScope;
  if (siteScope === 'required') {
    const siteId = typeof to.params.siteId === 'string' ? to.params.siteId : '';
    if (!/^[0-9a-f-]{36}$/i.test(siteId)) return getRoutePath('app-sites');
    try {
      const result = await getSiteConnections();
      if (!result.sites.some((site) => site.id === siteId)) return getRoutePath('app-sites');
    } catch {
      return getRoutePath('app-sites');
    }
  }
  const legacyTargetId = typeof to.meta.legacyTargetId === 'string' ? to.meta.legacyTargetId : undefined;
  if (legacyTargetId) {
    const target = getRouteById(legacyTargetId);
    const siteStore = useSiteStore();
    try {
      await siteStore.refreshSites();
    } catch {
      return getRoutePath('app-sites');
    }
    const querySiteId = typeof to.query.siteId === 'string' ? to.query.siteId : undefined;
    const siteId = querySiteId && siteStore.sites.some((site) => site.id === querySiteId)
      ? querySiteId
      : siteStore.selectedSiteId;
    if (target.siteScope === 'required' && siteId && /^[0-9a-f-]{36}$/i.test(siteId)) {
      return { path: getRoutePath(target.id, { siteId }), replace: true };
    }
    return { path: target.siteScope === 'required' ? getRoutePath('app-sites') : getRoutePath(target.id), replace: true };
  }
  if (to.path === loginPath && authStore.isLoggedIn) return appDashboardPath;
  const authOnlyPaths = [
    loginPath,
    getRoutePath('auth-register'),
    getRoutePath('auth-forgot-password'),
    getRoutePath('auth-reset-password')
  ];
  if (authOnlyPaths.includes(to.path) && authStore.isLoggedIn) return appDashboardPath;
  return true;
});

router.afterEach(updateRouteSeo);

export function refreshCurrentRouteSeo() {
  updateRouteSeo(router.currentRoute.value);
}
