import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import MarketingHomeView from '../views/MarketingHomeView.vue';
import PricingView from '../views/PricingView.vue';
import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import SitesView from '../views/SitesView.vue';
import ArticlesView from '../views/ArticlesView.vue';
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
      requiresAuth: false
    }
  },
  {
    path: '/app/sites',
    name: 'AppSites',
    component: SitesView,
    meta: {
      titleKey: 'nav.sites',
      layout: 'app',
      requiresAuth: false
    }
  },
  {
    path: '/app/articles',
    name: 'AppArticles',
    component: ArticlesView,
    meta: {
      titleKey: 'nav.articles',
      layout: 'app',
      requiresAuth: false
    }
  },
  {
    path: '/app/review',
    name: 'AppReview',
    component: ReviewView,
    meta: {
      titleKey: 'nav.review',
      layout: 'app',
      requiresAuth: false
    }
  },
  {
    path: '/app/links',
    name: 'AppLinks',
    component: LinksView,
    meta: {
      titleKey: 'nav.links',
      layout: 'app',
      requiresAuth: false
    }
  },
  {
    path: '/app/tasks',
    name: 'AppTasks',
    component: TasksView,
    meta: {
      titleKey: 'nav.tasks',
      layout: 'app',
      requiresAuth: false
    }
  },
  {
    path: '/app/cms-adapters',
    name: 'AppCmsAdapters',
    component: CmsAdaptersView,
    meta: {
      titleKey: 'nav.cmsAdapters',
      layout: 'app',
      requiresAuth: false
    }
  },
  {
    path: '/app/settings',
    name: 'AppSettings',
    component: SettingsView,
    meta: {
      titleKey: 'nav.settings',
      layout: 'app',
      requiresAuth: false
    }
  },
  {
    path: '/admin',
    name: 'AdminOverview',
    component: AdminOverviewView,
    meta: {
      titleKey: 'admin.nav.overview',
      layout: 'admin',
      requiresAuth: false
    }
  },
  {
    path: '/admin/customers',
    name: 'AdminCustomers',
    component: AdminCustomersView,
    meta: {
      titleKey: 'admin.nav.customers',
      layout: 'admin',
      requiresAuth: false
    }
  },
  {
    path: '/admin/usage',
    name: 'AdminUsage',
    component: AdminUsageView,
    meta: {
      titleKey: 'admin.nav.usage',
      layout: 'admin',
      requiresAuth: false
    }
  },
  {
    path: '/admin/operations',
    name: 'AdminOperations',
    component: AdminOperationsView,
    meta: {
      titleKey: 'admin.nav.operations',
      layout: 'admin',
      requiresAuth: false
    }
  },
  {
    path: '/admin/settings',
    name: 'AdminSettings',
    component: AdminSettingsView,
    meta: {
      titleKey: 'admin.nav.settings',
      layout: 'admin',
      requiresAuth: false
    }
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});
