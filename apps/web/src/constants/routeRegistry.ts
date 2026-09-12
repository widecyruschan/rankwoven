import routeRegistryManifest from './routeRegistry.json';

export type RouteArea = 'public' | 'auth' | 'customer' | 'admin';
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
  | 'AdminSettingsView';

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
