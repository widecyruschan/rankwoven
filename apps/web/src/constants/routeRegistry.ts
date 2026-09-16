import routeRegistryManifest from './routeRegistry.json';

export type RouteArea = 'public' | 'auth' | 'customer' | 'admin';
export type NavigationSurface = 'marketing_header' | 'marketing_footer' | 'customer_sidebar' | 'admin_sidebar' | 'none';
export type RouteComponentKey =
  | 'MarketingHomeView'
  | 'PublicContentView'
  | 'BlogView'
  | 'BlogArticleView'
  | 'PricingView'
  | 'LoginView'
  | 'RegisterView'
  | 'ForgotPasswordView'
  | 'ResetPasswordView'
  | 'DashboardView'
  | 'SitesView'
  | 'AnalyticsView'
  | 'KeywordSuggestionsView'
  | 'MediaOptimizationView'
  | 'ApplySuggestionsView'
  | 'LinksView'
  | 'TasksView'
  | 'CmsAdaptersView'
  | 'SettingsView'
  | 'AuditView'
  | 'SiteAuditView'
  | 'AdminOverviewView'
  | 'AdminCustomersView'
  | 'AdminUsageView'
  | 'AdminOperationsView'
  | 'AdminSettingsView'
  | 'ContentOptimizerView'
  | 'KeywordResearchView'
  | 'MonitorEventsView'
  | 'AlertsView'
  | 'BillingView'
  | 'LegacyRouteView';

export interface RouteRegistryEntry {
  id: string;
  path: string;
  name: string;
  area: RouteArea;
  layout: 'marketing' | 'app' | 'admin';
  componentKey?: RouteComponentKey;
  publicPageKey?: string;
  publicSeoKey?: string;
  titleKey?: string;
  descriptionKey?: string;
  keywordKey?: string;
  canonicalPath?: string;
  sitemapGroup?: 'pages' | 'tools' | 'blog';
  parentId?: string;
  migrationTargetId?: string;
  requiresRole?: 'admin';
  indexable: boolean;
  conditionalIndexable?: boolean;
  enabled?: boolean;
  planned?: boolean;
  dynamic?: boolean;
  nav?: boolean;
  navLabelKey?: string;
  navigationSurface?: NavigationSurface;
  navigationGroup?: string;
  navigationOrder?: number;
  availabilityPhase?: string;
  featureKey?: string;
  siteScope?: 'none' | 'optional' | 'required';
  legacyTargetId?: string;
  robotsPolicy?: 'index,follow' | 'noindex,nofollow,noarchive';
  redirect?: string;
}

export interface RouteRegistryManifest {
  version: number;
  routes: RouteRegistryEntry[];
  redirects: Array<{ from: string; to: string }>;
}

export const routeRegistry = routeRegistryManifest as RouteRegistryManifest;

export const activeRouteEntries = routeRegistry.routes.filter((route) => route.enabled !== false);

export const activePublicSeoRoutes = activeRouteEntries.filter(
  (route) =>
    route.area === 'public' && route.indexable && route.dynamic !== true && route.publicSeoKey
);

export const plannedRouteEntries = routeRegistry.routes.filter((route) => route.planned === true);

const routeMap = new Map(routeRegistry.routes.map((route) => [route.id, route]));

export function getRouteById(routeId: string) {
  const route = routeMap.get(routeId);
  if (!route) {
    throw new Error(`Route registry entry not found: ${routeId}`);
  }
  return route;
}

export function getRoutePath(routeId: string, params: Record<string, string> = {}) {
  return getRouteById(routeId).path.replace(/:([^/]+)/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `:${key}` : encodeURIComponent(value);
  });
}

export function getNavigationRoutes(area: RouteArea) {
  return activeRouteEntries.filter((route) => route.area === area && route.nav === true);
}

export function getNavigationGroups(surface: NavigationSurface) {
  const fallbackSurface = (route: RouteRegistryEntry) => {
    if (route.area === 'customer') return 'customer_sidebar';
    if (route.area === 'admin') return 'admin_sidebar';
    return 'none';
  };
  const routes = activeRouteEntries
    .filter((route) => {
      const isOnSurface = (route.navigationSurface ?? fallbackSurface(route)) === surface;
      return isOnSurface && (surface === 'marketing_footer' || route.nav === true);
    })
    .sort((left, right) => (left.navigationOrder ?? 0) - (right.navigationOrder ?? 0));
  return [...new Set(routes.map((route) => route.navigationGroup ?? 'default'))].map((group) => ({
    group,
    routes: routes.filter((route) => (route.navigationGroup ?? 'default') === group)
  }));
}

export function getBreadcrumbRoutes(routeId: string) {
  const result: RouteRegistryEntry[] = [];
  let current = routeMap.get(routeId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    result.unshift(current);
    seen.add(current.id);
    current = current.parentId ? routeMap.get(current.parentId) : undefined;
  }
  return result;
}
