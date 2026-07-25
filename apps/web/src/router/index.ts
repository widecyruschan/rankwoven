import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import SitesView from '../views/SitesView.vue';
import ArticlesView from '../views/ArticlesView.vue';
import ReviewView from '../views/ReviewView.vue';
import LinksView from '../views/LinksView.vue';
import TasksView from '../views/TasksView.vue';
import CmsAdaptersView from '../views/CmsAdaptersView.vue';
import SettingsView from '../views/SettingsView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
    meta: {
      titleKey: 'nav.dashboard',
      requiresAuth: false
    }
  },
  {
    path: '/sites',
    name: 'Sites',
    component: SitesView,
    meta: {
      titleKey: 'nav.sites',
      requiresAuth: false
    }
  },
  {
    path: '/articles',
    name: 'Articles',
    component: ArticlesView,
    meta: {
      titleKey: 'nav.articles',
      requiresAuth: false
    }
  },
  {
    path: '/review',
    name: 'Review',
    component: ReviewView,
    meta: {
      titleKey: 'nav.review',
      requiresAuth: false
    }
  },
  {
    path: '/links',
    name: 'Links',
    component: LinksView,
    meta: {
      titleKey: 'nav.links',
      requiresAuth: false
    }
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: TasksView,
    meta: {
      titleKey: 'nav.tasks',
      requiresAuth: false
    }
  },
  {
    path: '/cms-adapters',
    name: 'CmsAdapters',
    component: CmsAdaptersView,
    meta: {
      titleKey: 'nav.cmsAdapters',
      requiresAuth: false
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
    meta: {
      titleKey: 'nav.settings',
      requiresAuth: false
    }
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});
