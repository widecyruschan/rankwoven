import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'MarketingHome',
    component: () => import('../views/MarketingHomeView.vue'),
    meta: {
      titleKey: 'marketing.homeTitle',
      layout: 'marketing',
      requiresAuth: false
    }
  },
  {
    path: '/pricing',
    name: 'Pricing',
    component: () => import('../views/PricingView.vue'),
    meta: {
      titleKey: 'marketing.pricingTitle',
      layout: 'marketing',
      requiresAuth: false
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: {
      titleKey: 'login.title',
      layout: 'marketing',
      requiresAuth: false
    }
  },
  {
    path: '/app',
    name: 'AppDashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: {
      titleKey: 'nav.dashboard',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/sites',
    name: 'AppSites',
    component: () => import('../views/SitesView.vue'),
    meta: {
      titleKey: 'nav.sites',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/analytics',
    name: 'AppAnalytics',
    component: () => import('../views/AnalyticsView.vue'),
    meta: {
      titleKey: 'nav.analytics',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/keywords',
    name: 'AppKeywordSuggestions',
    component: () => import('../views/KeywordSuggestionsView.vue'),
    meta: {
      titleKey: 'nav.keywords',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/articles',
    name: 'AppArticles',
    component: () => import('../views/ArticlesView.vue'),
    meta: {
      titleKey: 'nav.articles',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/article-sync',
    name: 'AppArticleSync',
    component: () => import('../views/ArticleSyncView.vue'),
    meta: {
      titleKey: 'nav.articleSync',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/suggestions',
    name: 'AppSuggestions',
    component: () => import('../views/SuggestionsView.vue'),
    meta: {
      titleKey: 'nav.suggestions',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/media',
    name: 'AppMediaOptimization',
    component: () => import('../views/MediaOptimizationView.vue'),
    meta: {
      titleKey: 'nav.media',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/apply',
    name: 'AppApplySuggestions',
    component: () => import('../views/ApplySuggestionsView.vue'),
    meta: {
      titleKey: 'nav.apply',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/article-suggestions',
    name: 'AppArticleSuggestions',
    component: () => import('../views/ArticleSuggestionsView.vue'),
    meta: {
      titleKey: 'nav.articleSuggestions',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/review',
    name: 'AppReview',
    component: () => import('../views/ReviewView.vue'),
    meta: {
      titleKey: 'nav.review',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/links',
    name: 'AppLinks',
    component: () => import('../views/LinksView.vue'),
    meta: {
      titleKey: 'nav.links',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/tasks',
    name: 'AppTasks',
    component: () => import('../views/TasksView.vue'),
    meta: {
      titleKey: 'nav.tasks',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/cms-adapters',
    name: 'AppCmsAdapters',
    component: () => import('../views/CmsAdaptersView.vue'),
    meta: {
      titleKey: 'nav.cmsAdapters',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/settings',
    name: 'AppSettings',
    component: () => import('../views/SettingsView.vue'),
    meta: {
      titleKey: 'nav.settings',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/lighthouse',
    name: 'AppLighthouse',
    component: () => import('../views/AuditView.vue'),
    meta: {
      titleKey: 'nav.lighthouse',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/admin',
    name: 'AdminOverview',
    component: () => import('../views/AdminOverviewView.vue'),
    meta: {
      titleKey: 'admin.nav.overview',
      layout: 'admin',
      requiresAuth: true
    }
  },
  {
    path: '/admin/customers',
    name: 'AdminCustomers',
    component: () => import('../views/AdminCustomersView.vue'),
    meta: {
      titleKey: 'admin.nav.customers',
      layout: 'admin',
      requiresAuth: true
    }
  },
  {
    path: '/admin/usage',
    name: 'AdminUsage',
    component: () => import('../views/AdminUsageView.vue'),
    meta: {
      titleKey: 'admin.nav.usage',
      layout: 'admin',
      requiresAuth: true
    }
  },
  {
    path: '/admin/operations',
    name: 'AdminOperations',
    component: () => import('../views/AdminOperationsView.vue'),
    meta: {
      titleKey: 'admin.nav.operations',
      layout: 'admin',
      requiresAuth: true
    }
  },
  {
    path: '/admin/settings',
    name: 'AdminSettings',
    component: () => import('../views/AdminSettingsView.vue'),
    meta: {
      titleKey: 'admin.nav.settings',
      layout: 'admin',
      requiresAuth: true
    }
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});

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

  return true;
});
