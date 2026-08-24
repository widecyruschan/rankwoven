import { createRouter, createWebHistory, type RouteLocationNormalizedLoaded, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { i18n } from '../i18n';
import { publicSeoKeywordKeys } from '../constants/publicSeo';
import { updateSeoHead } from '../utils/seoHead';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'MarketingHome',
    component: () => import('../views/MarketingHomeView.vue'),
    meta: {
      titleKey: 'marketing.homeTitle',
      layout: 'marketing',
      requiresAuth: false,
      indexable: true,
      canonicalPath: '/',
      descriptionKey: 'marketing.homeDescription',
      keywordKey: publicSeoKeywordKeys.home
    }
  },
  ...(['features', 'docs', 'help', 'about', 'contact', 'privacy', 'terms'] as const).map((page) => ({
    path: `/${page}`,
    name: `${page[0].toUpperCase()}${page.slice(1)}`,
    component: () => import('../views/PublicContentView.vue'),
    meta: {
      titleKey: `publicPages.${page}.title`,
      layout: 'marketing',
      publicPageKey: page,
      requiresAuth: false,
      indexable: true,
      canonicalPath: `/${page}`,
      descriptionKey: `publicPages.${page}.body`,
      keywordKey: publicSeoKeywordKeys[page]
    }
  })),
  {
    path: '/blog',
    name: 'Blog',
    component: () => import('../views/BlogView.vue'),
    meta: {
      titleKey: 'publicPages.blog.title',
      layout: 'marketing',
      requiresAuth: false,
      indexable: true,
      canonicalPath: '/blog',
      descriptionKey: 'publicPages.blog.body',
      keywordKey: publicSeoKeywordKeys.blog
    }
  },
  {
    path: '/blog/:slug',
    name: 'BlogArticle',
    component: () => import('../views/BlogArticleView.vue'),
    meta: {
      titleKey: 'publicPages.blog.title',
      layout: 'marketing',
      requiresAuth: false,
      indexable: true,
      descriptionKey: 'publicPages.blog.body',
      keywordKey: publicSeoKeywordKeys.blog
    }
  },
  {
    path: '/pricing',
    name: 'Pricing',
    component: () => import('../views/PricingView.vue'),
    meta: {
      titleKey: 'marketing.pricingTitle',
      layout: 'marketing',
      requiresAuth: false,
      indexable: true,
      canonicalPath: '/pricing',
      descriptionKey: 'marketing.pricingDescription',
      keywordKey: publicSeoKeywordKeys.pricing
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: {
      titleKey: 'login.title',
      layout: 'marketing',
      requiresAuth: false,
      indexable: false,
      canonicalPath: '/login'
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterView.vue'),
    meta: {
      titleKey: 'register.title',
      layout: 'marketing',
      requiresAuth: false,
      indexable: false,
      canonicalPath: '/register'
    }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('../views/ForgotPasswordView.vue'),
    meta: {
      titleKey: 'forgotPassword.title',
      layout: 'marketing',
      requiresAuth: false,
      indexable: false,
      canonicalPath: '/forgot-password'
    }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('../views/ResetPasswordView.vue'),
    meta: {
      titleKey: 'resetPassword.title',
      layout: 'marketing',
      requiresAuth: false,
      indexable: false,
      canonicalPath: '/reset-password'
    }
  },
  {
    path: '/app',
    name: 'AppDashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: {
      titleKey: 'nav.dashboard',
      layout: 'app',
      requiresAuth: true,
      indexable: false,
      canonicalPath: '/app'
    }
  },
  {
    path: '/app/sites',
    name: 'AppSites',
    component: () => import('../views/SitesView.vue'),
    meta: {
      titleKey: 'nav.sites',
      layout: 'app',
      requiresAuth: true,
      indexable: false,
      canonicalPath: '/app/sites'
    }
  },
  {
    path: '/app/analytics',
    name: 'AppAnalytics',
    component: () => import('../views/AnalyticsView.vue'),
    meta: {
      titleKey: 'nav.analytics',
      layout: 'app',
      requiresAuth: true,
      indexable: false,
      canonicalPath: '/app/analytics'
    }
  },
  {
    path: '/app/keywords',
    name: 'AppKeywordSuggestions',
    component: () => import('../views/KeywordSuggestionsView.vue'),
    meta: {
      titleKey: 'nav.keywords',
      layout: 'app',
      requiresAuth: true,
      indexable: false,
      canonicalPath: '/app/keywords'
    }
  },
  {
    path: '/app/articles',
    redirect: '/app/sites'
  },
  {
    path: '/app/article-sync',
    redirect: '/app/tasks'
  },
  {
    path: '/app/suggestions',
    redirect: '/app/media'
  },
  {
    path: '/app/media',
    name: 'AppMediaOptimization',
    component: () => import('../views/MediaOptimizationView.vue'),
    meta: {
      titleKey: 'nav.media',
      layout: 'app',
      requiresAuth: true,
      indexable: false,
      canonicalPath: '/app/media'
    }
  },
  {
    path: '/app/apply',
    name: 'AppApplySuggestions',
    component: () => import('../views/ApplySuggestionsView.vue'),
    meta: {
      titleKey: 'nav.apply',
      layout: 'app',
      requiresAuth: true,
      indexable: false,
      canonicalPath: '/app/apply'
    }
  },
  {
    path: '/app/article-suggestions',
    redirect: '/app/media'
  },
  {
    path: '/app/review',
    redirect: '/app/media'
  },
  {
    path: '/app/links',
    name: 'AppLinks',
    component: () => import('../views/LinksView.vue'),
    meta: {
      titleKey: 'nav.links',
      layout: 'app',
      requiresAuth: true,
      indexable: false,
      canonicalPath: '/app/links'
    }
  },
  {
    path: '/app/tasks',
    name: 'AppTasks',
    component: () => import('../views/TasksView.vue'),
    meta: {
      titleKey: 'nav.tasks',
      layout: 'app',
      requiresAuth: true,
      indexable: false,
      canonicalPath: '/app/tasks'
    }
  },
  {
    path: '/app/cms-adapters',
    name: 'AppCmsAdapters',
    component: () => import('../views/CmsAdaptersView.vue'),
    meta: {
      titleKey: 'nav.cmsAdapters',
      layout: 'app',
      requiresAuth: true,
      indexable: false,
      canonicalPath: '/app/cms-adapters'
    }
  },
  {
    path: '/app/settings',
    name: 'AppSettings',
    component: () => import('../views/SettingsView.vue'),
    meta: {
      titleKey: 'nav.settings',
      layout: 'app',
      requiresAuth: true,
      indexable: false,
      canonicalPath: '/app/settings'
    }
  },
  {
    path: '/app/lighthouse',
    name: 'AppLighthouse',
    component: () => import('../views/AuditView.vue'),
    meta: {
      titleKey: 'nav.lighthouse',
      layout: 'app',
      requiresAuth: true,
      indexable: false,
      canonicalPath: '/app/lighthouse'
    }
  },
  {
    path: '/app/site-audit',
    name: 'AppSiteAudit',
    component: () => import('../views/SiteAuditView.vue'),
    meta: {
      titleKey: 'nav.siteAudit',
      layout: 'app',
      requiresAuth: true,
      indexable: false,
      canonicalPath: '/app/site-audit'
    }
  },
  {
    path: '/admin',
    name: 'AdminOverview',
    component: () => import('../views/AdminOverviewView.vue'),
    meta: {
      titleKey: 'admin.nav.overview',
      layout: 'admin',
      requiresAuth: true,
      indexable: false,
      canonicalPath: '/admin'
    }
  },
  {
    path: '/admin/customers',
    name: 'AdminCustomers',
    component: () => import('../views/AdminCustomersView.vue'),
    meta: {
      titleKey: 'admin.nav.customers',
      layout: 'admin',
      requiresAuth: true,
      indexable: false,
      canonicalPath: '/admin/customers'
    }
  },
  {
    path: '/admin/usage',
    name: 'AdminUsage',
    component: () => import('../views/AdminUsageView.vue'),
    meta: {
      titleKey: 'admin.nav.usage',
      layout: 'admin',
      requiresAuth: true,
      indexable: false,
      canonicalPath: '/admin/usage'
    }
  },
  {
    path: '/admin/operations',
    name: 'AdminOperations',
    component: () => import('../views/AdminOperationsView.vue'),
    meta: {
      titleKey: 'admin.nav.operations',
      layout: 'admin',
      requiresAuth: true,
      indexable: false,
      canonicalPath: '/admin/operations'
    }
  },
  {
    path: '/admin/settings',
    name: 'AdminSettings',
    component: () => import('../views/AdminSettingsView.vue'),
    meta: {
      titleKey: 'admin.nav.settings',
      layout: 'admin',
      requiresAuth: true,
      indexable: false,
      canonicalPath: '/admin/settings'
    }
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});

function updateRouteSeo(to: RouteLocationNormalizedLoaded) {
  if (typeof document === 'undefined') return;

  const titleKey = typeof to.meta.titleKey === 'string' ? to.meta.titleKey : 'marketing.homeTitle';
  const title = `${String(i18n.global.t(titleKey))} | RankWoven`;
  const descriptionKey = typeof to.meta.descriptionKey === 'string' ? to.meta.descriptionKey : '';
  const description = descriptionKey ? String(i18n.global.t(descriptionKey)) : '';
  const keywordKey = typeof to.meta.keywordKey === 'string' ? to.meta.keywordKey : '';
  const keyword = keywordKey ? String(i18n.global.t(keywordKey)) : '';
  const canonicalUrl = new URL(String(to.meta.canonicalPath ?? to.path), window.location.origin).toString();
  const locale = String(i18n.global.locale.value).replace('-', '_');

  updateSeoHead({
    title,
    description,
    canonicalUrl,
    indexable: to.meta.indexable === true,
    keywords: keyword ? [keyword] : undefined,
    type: to.path.startsWith('/blog/') ? 'article' : 'website',
    locale
  });
}

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    };
  }

  if (to.meta.requiresAuth) {
    const isSessionValid = await authStore.restoreSession();
    if (!isSessionValid) {
      return {
        path: '/login',
        query: {
          redirect: to.fullPath
        }
      };
    }
  }

  if (to.path === '/login' && authStore.isLoggedIn) {
    return '/app';
  }

  // Redirect logged-in users away from auth pages
  const authOnlyPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
  if (authOnlyPaths.includes(to.path) && authStore.isLoggedIn) {
    return '/app';
  }

  return true;
});

router.afterEach(updateRouteSeo);

export function refreshCurrentRouteSeo() {
  updateRouteSeo(router.currentRoute.value);
}
