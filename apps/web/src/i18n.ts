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
      menu: 'Menu',
      mainNavigation: 'Main navigation'
    },
    nav: {
      dashboard: 'Site Overview',
      sites: 'Site Management',
      articles: 'Article Audit',
      review: 'Content Review',
      links: 'Internal Links',
      tasks: 'Task Queue',
      cmsAdapters: 'CMS Adapters',
      settings: 'Settings'
    },
    dashboard: {
      connectedSites: 'Connected sites',
      pendingSuggestions: 'Pending suggestions',
      runningTasks: 'Running tasks',
      title: 'Initialization Status',
      body: 'The platform skeleton is ready for WordPress plugin, API service, and worker task integration.',
      averageScore: 'Average SEO score',
      indexedArticles: 'Indexed articles',
      syncProgress: 'Sync progress',
      crawlHealth: 'Crawl health',
      pipelineTitle: 'Optimization pipeline',
      pipelineScan: 'Scan',
      pipelineGenerate: 'Generate',
      pipelineReview: 'Review',
      pipelineApply: 'Apply',
      pipelineDone: 'Done',
      priorityTitle: 'Today priorities',
      priorityArticle: 'Refresh long-tail buying guide',
      priorityImage: 'Add alt text for 18 images',
      priorityLinks: 'Review 12 internal link opportunities'
    },
    sites: {
      title: 'Site Management',
      body: 'Connect WordPress, Joomla, OpenCart, and other websites, then monitor sync status.',
      primaryAction: 'Connect site',
      name: 'Site',
      platform: 'Platform',
      health: 'Health',
      articles: 'Articles',
      lastSync: 'Last sync',
      statusConnected: 'Connected',
      statusWarning: 'Needs attention',
      connectTitle: 'Connection preview',
      connectStepOne: 'Install extension',
      connectStepTwo: 'Paste API token',
      connectStepThree: 'Start content sync'
    },
    articles: {
      title: 'Article Audit',
      body: 'Audit synced articles and find SEO fixes worth reviewing.',
      filterAll: 'All',
      filterNeedsReview: 'Needs review',
      filterQuickWins: 'Quick wins',
      article: 'Article',
      score: 'Score',
      issues: 'Issues',
      opportunity: 'Opportunity',
      owner: 'Owner',
      action: 'Open review',
      issueMeta: 'Meta description',
      issueLinks: 'Internal links',
      issueImages: 'Image alt text',
      issueFreshness: 'Content freshness'
    },
    review: {
      title: 'Content Review',
      body: 'Compare AI suggestions before applying changes to the connected CMS.',
      sourceTitle: 'Current version',
      suggestionTitle: 'AI suggestion',
      titleField: 'Title',
      metaField: 'Meta description',
      outlineField: 'Outline',
      riskTitle: 'Review guardrails',
      riskKeyword: 'Keyword density within target range',
      riskClaim: 'No unsupported claim detected',
      riskRollback: 'Snapshot ready for rollback',
      approve: 'Approve draft',
      reject: 'Reject',
      save: 'Save suggestion'
    },
    links: {
      title: 'Internal Links',
      body: 'Review link opportunities by source, target, anchor text, and relevance.',
      source: 'Source article',
      target: 'Target article',
      anchor: 'Anchor',
      reason: 'Reason',
      confidence: 'Confidence',
      action: 'Insert',
      clusterTitle: 'Topic clusters',
      clusterCommerce: 'Commercial intent',
      clusterTutorial: 'Tutorials',
      clusterCompare: 'Comparisons'
    },
    tasks: {
      title: 'Task Queue',
      body: 'Monitor sync, audit, generation, image, and publishing jobs.',
      task: 'Task',
      site: 'Site',
      status: 'Status',
      progress: 'Progress',
      eta: 'ETA',
      statusRunning: 'Running',
      statusWaiting: 'Waiting review',
      statusDone: 'Done',
      statusFailed: 'Needs retry'
    },
    cmsAdapters: {
      title: 'CMS Adapters',
      platform: 'Platform',
      phase: 'Phase',
      status: 'Status',
      capabilities: 'Capabilities',
      reference: 'Reference implementation',
      reserved: 'Reserved',
      sync: 'Sync',
      audit: 'Audit',
      apply: 'Apply',
      rollback: 'Rollback'
    },
    settings: {
      title: 'Settings',
      body: 'Manage API Base URL, team settings, usage, and third-party service connections.',
      apiTitle: 'API endpoints',
      aiTitle: 'AI provider routing',
      storageTitle: 'Media storage',
      teamTitle: 'Team controls',
      enabled: 'Enabled',
      pending: 'Pending',
      configured: 'Configured',
      notConfigured: 'Not configured'
    }
  },
  'zh-Hant': {
    app: {
      phase: '第 1 階段',
      brandSubtitle: 'AI SEO 平台',
      menu: '選單',
      mainNavigation: '主導覽'
    },
    nav: {
      dashboard: '站點概覽',
      sites: '站點管理',
      articles: '文章審計',
      review: '內容審核',
      links: '內部連結',
      tasks: '任務隊列',
      cmsAdapters: 'CMS 適配器',
      settings: '設定'
    },
    dashboard: {
      connectedSites: '已連接站點',
      pendingSuggestions: '待審核建議',
      runningTasks: '執行中任務',
      title: '初始化狀態',
      body: '平台骨架已建立，可開始接入 WordPress 插件、API 服務與 Worker 任務流程。',
      averageScore: '平均 SEO 分數',
      indexedArticles: '已索引文章',
      syncProgress: '同步進度',
      crawlHealth: '抓取健康度',
      pipelineTitle: '優化流程',
      pipelineScan: '掃描',
      pipelineGenerate: '生成',
      pipelineReview: '審核',
      pipelineApply: '套用',
      pipelineDone: '完成',
      priorityTitle: '今日優先項',
      priorityArticle: '刷新長尾選購指南',
      priorityImage: '補齊 18 張圖片 Alt Text',
      priorityLinks: '審核 12 個內部連結機會'
    },
    sites: {
      title: '站點管理',
      body: '此頁將用於連接 WordPress、Joomla、OpenCart 等網站，並展示同步狀態。',
      primaryAction: '連接站點',
      name: '站點',
      platform: '平台',
      health: '健康度',
      articles: '文章',
      lastSync: '最近同步',
      statusConnected: '已連接',
      statusWarning: '需處理',
      connectTitle: '連接預覽',
      connectStepOne: '安裝擴展',
      connectStepTwo: '貼上 API Token',
      connectStepThree: '開始內容同步'
    },
    articles: {
      title: '文章審計',
      body: '檢查已同步文章，找出值得審核的 SEO 優化項。',
      filterAll: '全部',
      filterNeedsReview: '需審核',
      filterQuickWins: '快速機會',
      article: '文章',
      score: '分數',
      issues: '問題',
      opportunity: '機會',
      owner: '負責人',
      action: '打開審核',
      issueMeta: 'Meta 描述',
      issueLinks: '內部連結',
      issueImages: '圖片 Alt Text',
      issueFreshness: '內容新鮮度'
    },
    review: {
      title: '內容審核',
      body: '套用到 CMS 前，先對比 AI 建議與現有版本。',
      sourceTitle: '目前版本',
      suggestionTitle: 'AI 建議',
      titleField: '標題',
      metaField: 'Meta 描述',
      outlineField: '大綱',
      riskTitle: '審核護欄',
      riskKeyword: '關鍵詞密度在目標範圍內',
      riskClaim: '未檢出缺乏依據的宣稱',
      riskRollback: '已準備可回滾快照',
      approve: '批准草稿',
      reject: '拒絕',
      save: '保存建議'
    },
    links: {
      title: '內部連結',
      body: '按來源文章、目標文章、錨文本和相關性審核連結機會。',
      source: '來源文章',
      target: '目標文章',
      anchor: '錨文本',
      reason: '推薦理由',
      confidence: '信心度',
      action: '插入',
      clusterTitle: '主題集群',
      clusterCommerce: '商業意圖',
      clusterTutorial: '教學內容',
      clusterCompare: '比較內容'
    },
    tasks: {
      title: '任務隊列',
      body: '監控同步、審計、生成、圖片和發佈任務。',
      task: '任務',
      site: '站點',
      status: '狀態',
      progress: '進度',
      eta: '預估時間',
      statusRunning: '執行中',
      statusWaiting: '等待審核',
      statusDone: '已完成',
      statusFailed: '需重試'
    },
    cmsAdapters: {
      title: 'CMS 適配器',
      platform: '平台',
      phase: '階段',
      status: '狀態',
      capabilities: '能力',
      reference: '參考實現',
      reserved: '預留',
      sync: '同步',
      audit: '審計',
      apply: '套用',
      rollback: '回滾'
    },
    settings: {
      title: '設定',
      body: '此頁將集中管理 API Base URL、團隊、用量與第三方服務連接。',
      apiTitle: 'API 端點',
      aiTitle: 'AI Provider 路由',
      storageTitle: '媒體存儲',
      teamTitle: '團隊控制',
      enabled: '已啟用',
      pending: '待配置',
      configured: '已配置',
      notConfigured: '未配置'
    }
  }
};

function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  return supportedLocales.some((item) => item.code === value);
}

const savedLocale = globalThis.localStorage?.getItem('aieo-locale');
const initialLocale: AppLocale = isSupportedLocale(savedLocale) ? savedLocale : 'zh-Hant';

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages
});
