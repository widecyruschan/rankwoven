import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import SitesView from '../views/SitesView.vue';
import CmsAdaptersView from '../views/CmsAdaptersView.vue';
import SettingsView from '../views/SettingsView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
    meta: {
      title: '站點概覽',
      requiresAuth: false
    }
  },
  {
    path: '/sites',
    name: 'Sites',
    component: SitesView,
    meta: {
      title: '站點管理',
      requiresAuth: false
    }
  },
  {
    path: '/cms-adapters',
    name: 'CmsAdapters',
    component: CmsAdaptersView,
    meta: {
      title: 'CMS 適配器',
      requiresAuth: false
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
    meta: {
      title: '設定',
      requiresAuth: false
    }
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});
