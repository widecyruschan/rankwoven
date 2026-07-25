import { createI18n } from 'vue-i18n';

export const supportedLocales = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'zh-CN', label: '中文' },
  { code: 'zh-Hant', label: '繁體中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'pt', label: 'Português' },
  { code: 'es', label: 'Español' },
  { code: 'ru', label: 'Русский' }
] as const;

export type AppLocale = (typeof supportedLocales)[number]['code'];

const messages = {
  en: {
    app: {
      phase: 'Phase 1',
      brandSubtitle: 'AI SEO Platform',
      menu: 'Menu'
    },
    nav: {
      dashboard: 'Site Overview',
      sites: 'Site Management',
      cmsAdapters: 'CMS Adapters',
      settings: 'Settings'
    },
    dashboard: {
      connectedSites: 'Connected sites',
      pendingSuggestions: 'Pending suggestions',
      runningTasks: 'Running tasks',
      title: 'Initialization Status',
      body: 'The platform skeleton is ready for WordPress plugin, API service, and worker task integration.'
    },
    sites: {
      title: 'Site Management',
      body: 'Connect WordPress, Joomla, OpenCart, and other websites, then monitor sync status.'
    },
    cmsAdapters: {
      title: 'CMS Adapters',
      platform: 'Platform',
      phase: 'Phase',
      status: 'Status',
      reference: 'Reference implementation',
      reserved: 'Reserved'
    },
    settings: {
      title: 'Settings',
      body: 'Manage API Base URL, team settings, usage, and third-party service connections.'
    }
  },
  'zh-Hant': {
    app: {
      phase: '第 1 階段',
      brandSubtitle: 'AI SEO 平台',
      menu: '選單'
    },
    nav: {
      dashboard: '站點概覽',
      sites: '站點管理',
      cmsAdapters: 'CMS 適配器',
      settings: '設定'
    },
    dashboard: {
      connectedSites: '已連接站點',
      pendingSuggestions: '待審核建議',
      runningTasks: '執行中任務',
      title: '初始化狀態',
      body: '平台骨架已建立，可開始接入 WordPress 插件、API 服務與 Worker 任務流程。'
    },
    sites: {
      title: '站點管理',
      body: '此頁將用於連接 WordPress、Joomla、OpenCart 等網站，並展示同步狀態。'
    },
    cmsAdapters: {
      title: 'CMS 適配器',
      platform: '平台',
      phase: '階段',
      status: '狀態',
      reference: '參考實現',
      reserved: '預留'
    },
    settings: {
      title: '設定',
      body: '此頁將集中管理 API Base URL、團隊、用量與第三方服務連接。'
    }
  }
};

const savedLocale = globalThis.localStorage?.getItem('aieo-locale') as AppLocale | null;
const initialLocale = supportedLocales.some((item) => item.code === savedLocale)
  ? savedLocale
  : 'zh-Hant';

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages
});
