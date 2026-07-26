import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import MarketingHomeView from '../views/MarketingHomeView.vue';
import PricingView from '../views/PricingView.vue';
import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import SitesView from '../views/SitesView.vue';
import ArticlesView from '../views/ArticlesView.vue';
import ArticleSyncView from '../views/ArticleSyncView.vue';
import SuggestionsView from '../views/SuggestionsView.vue';
import MediaOptimizationView from '../views/MediaOptimizationView.vue';
import ApplySuggestionsView from '../views/ApplySuggestionsView.vue';
import ArticleSuggestionsView from '../views/ArticleSuggestionsView.vue';
import ReviewView from '../views/ReviewView.vue';
import LinksView from '../views/LinksView.vue';
import TasksView from '../views/TasksView.vue';
import CmsAdaptersView from '../views/CmsAdaptersView.vue';
import SettingsView from '../views/SettingsView.vue';
import AdminOverviewView from '../views/AdminOverviewView.vue';
import AdminCustomersView from '../views/AdminCustomersView.vue';
import AdminUsageView from '../views/AdminUsageView.vue';
import AdminOperationsView from '../views/AdminOperationsView.vue';
import AdminSettingsView from '../views/AdminSettingsView.vue';
import { useAuthStore } from '../stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'MarketingHome',
    component: MarketingHomeView,
    meta: {
      titleKey: 'marketing.homeTitle',
      layout: 'marketing',
      requiresAuth: false
    }
  },
  {
    path: '/pricing',
    name: 'Pricing',
    component: PricingView,
    meta: {
      titleKey: 'marketing.pricingTitle',
      layout: 'marketing',
      requiresAuth: false
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: {
      titleKey: 'login.title',
      layout: 'marketing',
      requiresAuth: false
    }
  },
  {
    path: '/app',
    name: 'AppDashboard',
    component: DashboardView,
    meta: {
      titleKey: 'nav.dashboard',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/sites',
    name: 'AppSites',
    component: SitesView,
    meta: {
      titleKey: 'nav.sites',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/articles',
    name: 'AppArticles',
    component: ArticlesView,
    meta: {
      titleKey: 'nav.articles',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/article-sync',
    name: 'AppArticleSync',
    component: ArticleSyncView,
    meta: {
      titleKey: 'nav.articleSync',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/suggestions',
    name: 'AppSuggestions',
    component: SuggestionsView,
    meta: {
      titleKey: 'nav.suggestions',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/media',
    name: 'AppMediaOptimization',
    component: MediaOptimizationView,
    meta: {
      titleKey: 'nav.media',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/apply',
    name: 'AppApplySuggestions',
    component: ApplySuggestionsView,
    meta: {
      titleKey: 'nav.apply',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/article-suggestions',
    name: 'AppArticleSuggestions',
    component: ArticleSuggestionsView,
    meta: {
      titleKey: 'nav.articleSuggestions',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/review',
    name: 'AppReview',
    component: ReviewView,
    meta: {
      titleKey: 'nav.review',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/links',
    name: 'AppLinks',
    component: LinksView,
    meta: {
      titleKey: 'nav.links',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/tasks',
    name: 'AppTasks',
    component: TasksView,
    meta: {
      titleKey: 'nav.tasks',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/cms-adapters',
    name: 'AppCmsAdapters',
    component: CmsAdaptersView,
    meta: {
      titleKey: 'nav.cmsAdapters',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/app/settings',
    name: 'AppSettings',
    component: SettingsView,
    meta: {
      titleKey: 'nav.settings',
      layout: 'app',
      requiresAuth: true
    }
  },
  {
    path: '/admin',
    name: 'AdminOverview',
    component: AdminOverviewView,
    meta: {
      titleKey: 'admin.nav.overview',
      layout: 'admin',
      requiresAuth: true
    }
  },
  {
    path: '/admin/customers',
    name: 'AdminCustomers',
    component: AdminCustomersView,
    meta: {
      titleKey: 'admin.nav.customers',
      layout: 'admin',
      requiresAuth: true
    }
  },
  {
    path: '/admin/usage',
    name: 'AdminUsage',
    component: AdminUsageView,
    meta: {
      titleKey: 'admin.nav.usage',
      layout: 'admin',
      requiresAuth: true
    }
  },
  {
    path: '/admin/operations',
    name: 'AdminOperations',
    component: AdminOperationsView,
    meta: {
      titleKey: 'admin.nav.operations',
      layout: 'admin',
      requiresAuth: true
    }
  },
  {
    path: '/admin/settings',
    name: 'AdminSettings',
    component: AdminSettingsView,
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
