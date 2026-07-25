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
    marketing: {
      homeTitle: 'AI SEO Platform',
      pricingTitle: 'Pricing',
      eyebrow: 'RankWoven AI SEO',
      headline: 'Optimize existing content, images, and internal links with reviewable AI workflows',
      subheadline:
        'Connect WordPress first, then expand to Joomla, OpenCart, and more. RankWoven helps teams audit pages, generate SEO suggestions, enrich images, and keep every change human-approved.',
      primaryAction: 'Start prototype',
      secondaryAction: 'View pricing',
      previewLabel: 'Product preview',
      previewSite: 'rankwoven.com',
      previewAudit: 'Optimization readiness',
      featuresTitle: 'Core features',
      featuresBody: 'The front office introduces what RankWoven does before users enter the SaaS dashboard.',
      nav: {
        features: 'Features',
        pricing: 'Pricing',
        login: 'Login',
        dashboard: 'Dashboard'
      },
      features: {
        auditTitle: 'SEO audit',
        auditBody: 'Find weak titles, missing meta descriptions, stale content, and technical content issues.',
        contentTitle: 'AI content optimization',
        contentBody: 'Generate titles, descriptions, outlines, rewrites, and new SEO articles from target keywords.',
        imageTitle: 'Image SEO',
        imageBody: 'Create image briefs, alt text, filenames, and storage-ready media assets.',
        linksTitle: 'Internal link suggestions',
        linksBody: 'Recommend source pages, targets, anchor text, and confidence before insertion.',
        cmsTitle: 'CMS plugin ecosystem',
        cmsBody: 'Start with WordPress and reserve adapter flows for Joomla, OpenCart, and other systems.',
        i18nTitle: 'Multilingual frontend',
        i18nBody: 'Use i18n from day one so the product can serve Traditional Chinese, English, and more locales.'
      },
      workflowTitle: 'Review-first workflow',
      workflowBody: 'The MVP keeps automated SEO safe by separating generation from publishing.',
      workflow: {
        connect: 'Connect a website through the CMS extension and sync content inventory.',
        audit: 'Run SEO, image, and internal link analysis on existing pages.',
        review: 'Let users compare current content with AI suggestions before approval.',
        publish: 'Apply approved changes with task logs, snapshots, and rollback paths.'
      }
    },
    pricing: {
      eyebrow: 'Simple prototype pricing',
      title: 'Plans for sites, teams, and agencies',
      body: 'Static pricing cards help validate packaging before billing logic is connected.',
      action: 'Choose plan',
      starter: {
        name: 'Starter',
        price: '$29/mo',
        summary: 'For one owner validating SEO optimization on a small site.'
      },
      growth: {
        name: 'Growth',
        price: '$79/mo',
        summary: 'For growing content teams that need more audits and image workflows.'
      },
      agency: {
        name: 'Agency',
        price: '$199/mo',
        summary: 'For agencies managing multiple client websites and review queues.'
      },
      enterprise: {
        name: 'Enterprise',
        price: 'Custom',
        summary: 'For larger teams with provider controls, security, and service commitments.'
      },
      features: {
        siteOne: '1 connected site',
        siteFive: '5 connected sites',
        siteTwenty: '20 connected sites',
        articlesSmall: '500 article audits',
        articlesMedium: '3,000 article audits',
        articlesLarge: '20,000 article audits',
        review: 'Human review workflow',
        images: 'Image alt text and media tasks',
        team: 'Team roles and client spaces',
        custom: 'Custom limits and integrations',
        sla: 'SLA and priority support',
        provider: 'Dedicated provider routing'
      }
    },
    login: {
      eyebrow: 'Prototype login',
      title: 'Log in to RankWoven',
      body: 'This page only validates the SaaS entry structure. Buttons link directly to static customer and admin prototypes.',
      email: 'Email',
      password: 'Password',
      submit: 'Log in',
      customerEntry: 'Open customer dashboard prototype',
      adminEntry: 'Open admin dashboard prototype'
    },
    admin: {
      subtitle: 'Platform Admin',
      phase: 'Admin prototype',
      nav: {
        overview: 'Platform Overview',
        customers: 'Customers',
        usage: 'Usage & Cost',
        operations: 'Operations',
        settings: 'Admin Settings'
      },
      status: {
        active: 'Active',
        watch: 'Watch'
      },
      overview: {
        mrr: 'MRR',
        customers: 'Customers',
        activeSites: 'Active sites',
        aiCost: 'AI cost',
        successRate: 'Task success rate',
        openReviews: 'Open reviews',
        queueTitle: 'Queue load',
        lastHour: 'Last hour',
        syncQueue: 'Content sync',
        auditQueue: 'SEO audit',
        imageQueue: 'Image tasks',
        riskTitle: 'Platform risks',
        riskProvider: 'Provider fallback budget is close to monthly guardrail.',
        riskStorage: 'Qiniu storage domain needs final production CDN rules.',
        riskBilling: 'Two agency accounts are near usage limits.'
      },
      customers: {
        title: 'Customer Management',
        body: 'Review tenants, plans, connected sites, usage, and support status.',
        invite: 'Invite customer',
        customer: 'Customer',
        plan: 'Plan',
        sites: 'Sites',
        usage: 'Usage',
        open: 'Open'
      },
      usage: {
        title: 'Usage & Cost',
        body: 'Track AI providers, proxy API calls, image storage, and cost controls.',
        provider: 'Provider',
        calls: 'Calls',
        cost: 'Cost',
        route: 'Route',
        autoRoute: 'Auto',
        inspect: 'Inspect',
        wenwen: 'Wenwen proxy API',
        qiniu: 'Qiniu Kodo'
      },
      operations: {
        title: 'Operations Center',
        body: 'Monitor failed jobs, review backlogs, provider delays, and system checks.',
        incidentTitle: 'Attention queue',
        live: 'Live',
        failedPublish: 'Failed CMS publish task',
        providerDelay: 'Provider latency spike',
        reviewBacklog: 'Review backlog rising',
        checklistTitle: 'Daily checks',
        checkCert: 'SSL certificate renewal dry-run status',
        checkQueue: 'Worker queue retry and dead-letter volume',
        checkWebhook: 'CMS webhook delivery health'
      },
      settings: {
        title: 'Admin Settings',
        body: 'Configure plans, provider routing, CMS extension switches, and team controls.',
        plansTitle: 'Plans and limits',
        providersTitle: 'Provider routing',
        cmsTitle: 'CMS extension switches',
        teamTitle: 'Team permissions',
        planLimits: 'Plan quotas and site limits',
        overageRules: 'Overage and alert thresholds',
        trialControls: 'Trial and onboarding controls',
        providerFallback: 'Fallback order for OpenAI, Gemini, DeepSeek, and Wenwen',
        providerBudgets: 'Provider budget guardrails',
        providerKeys: 'Secret-safe key status',
        wordpress: 'WordPress enabled',
        joomla: 'Joomla reserved',
        opencart: 'OpenCart reserved',
        roles: 'Owner, admin, support roles',
        auditLog: 'Admin audit log',
        security: 'Security and access policy'
      }
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
    marketing: {
      homeTitle: 'AI SEO 平台',
      pricingTitle: '定價',
      eyebrow: 'RankWoven AI SEO',
      headline: '用可審核的 AI 流程優化現有文章、圖片與內部連結',
      subheadline:
        '先接入 WordPress，再擴展 Joomla、OpenCart 等常用系統。RankWoven 協助團隊審計頁面、生成 SEO 建議、補強圖片資訊，並保留人工批准流程。',
      primaryAction: '開始查看原型',
      secondaryAction: '查看定價',
      previewLabel: '產品預覽',
      previewSite: 'rankwoven.com',
      previewAudit: '優化準備度',
      featuresTitle: '核心功能',
      featuresBody: '前台頁面用於讓用戶在進入 SaaS 後台前，快速理解 RankWoven 可解決的問題。',
      nav: {
        features: '功能',
        pricing: '定價',
        login: '登入',
        dashboard: '後台'
      },
      features: {
        auditTitle: 'SEO 審計',
        auditBody: '找出標題薄弱、Meta 缺失、內容過時與內容型技術問題。',
        contentTitle: 'AI 內容優化',
        contentBody: '根據目標關鍵詞生成標題、描述、大綱、改寫稿與新 SEO 文章。',
        imageTitle: '圖片 SEO',
        imageBody: '生成圖片簡報、Alt Text、檔名與可存儲的媒體素材。',
        linksTitle: '內部連結建議',
        linksBody: '在插入前推薦來源頁、目標頁、錨文本、理由與信心度。',
        cmsTitle: 'CMS 插件生態',
        cmsBody: '先做 WordPress，並為 Joomla、OpenCart 與其他系統預留適配流程。',
        i18nTitle: '多語言前端',
        i18nBody: '從第一版開始使用 i18n，支援繁體中文、英文與後續更多語言。'
      },
      workflowTitle: '先審核後套用',
      workflowBody: 'MVP 將生成與發佈分離，讓自動 SEO 優化更可控。',
      workflow: {
        connect: '通過 CMS 擴展連接網站，並同步內容庫存。',
        audit: '對現有頁面執行 SEO、圖片與內部連結分析。',
        review: '讓用戶在批准前對比目前內容與 AI 建議。',
        publish: '套用已批准變更，保留任務日誌、快照與回滾路徑。'
      }
    },
    pricing: {
      eyebrow: '原型定價',
      title: '面向網站、團隊與代理商的套餐',
      body: '靜態定價卡用於先驗證套餐包裝，後續再接入帳單邏輯。',
      action: '選擇套餐',
      starter: {
        name: 'Starter',
        price: '$29/月',
        summary: '適合單一網站先驗證 SEO 優化流程。'
      },
      growth: {
        name: 'Growth',
        price: '$79/月',
        summary: '適合需要更多審計與圖片流程的成長型內容團隊。'
      },
      agency: {
        name: 'Agency',
        price: '$199/月',
        summary: '適合管理多個客戶網站與審核隊列的代理商。'
      },
      enterprise: {
        name: 'Enterprise',
        price: '客製',
        summary: '適合需要 Provider 控制、安全策略與服務承諾的大型團隊。'
      },
      features: {
        siteOne: '1 個連接站點',
        siteFive: '5 個連接站點',
        siteTwenty: '20 個連接站點',
        articlesSmall: '500 次文章審計',
        articlesMedium: '3,000 次文章審計',
        articlesLarge: '20,000 次文章審計',
        review: '人工審核流程',
        images: '圖片 Alt Text 與媒體任務',
        team: '團隊角色與客戶空間',
        custom: '客製限制與整合',
        sla: 'SLA 與優先支援',
        provider: '專屬 Provider 路由'
      }
    },
    login: {
      eyebrow: '登入原型',
      title: '登入 RankWoven',
      body: '此頁只驗證 SaaS 入口結構，按鈕會直接進入靜態客戶後台與管理後台原型。',
      email: '電郵',
      password: '密碼',
      submit: '登入',
      customerEntry: '打開客戶後台原型',
      adminEntry: '打開管理後台原型'
    },
    admin: {
      subtitle: '平台管理後台',
      phase: '管理後台原型',
      nav: {
        overview: '平台概覽',
        customers: '客戶管理',
        usage: '用量與成本',
        operations: '運營中心',
        settings: '管理設定'
      },
      status: {
        active: '正常',
        watch: '需關注'
      },
      overview: {
        mrr: 'MRR',
        customers: '客戶數',
        activeSites: '活躍站點',
        aiCost: 'AI 成本',
        successRate: '任務成功率',
        openReviews: '待審核',
        queueTitle: '隊列負載',
        lastHour: '最近 1 小時',
        syncQueue: '內容同步',
        auditQueue: 'SEO 審計',
        imageQueue: '圖片任務',
        riskTitle: '平台風險',
        riskProvider: 'Provider 備援預算接近月度護欄。',
        riskStorage: '七牛雲存儲域名仍需最終 CDN 規則。',
        riskBilling: '兩個 Agency 帳戶接近用量上限。'
      },
      customers: {
        title: '客戶管理',
        body: '查看租戶、套餐、連接站點、用量與支援狀態。',
        invite: '邀請客戶',
        customer: '客戶',
        plan: '套餐',
        sites: '站點',
        usage: '用量',
        open: '打開'
      },
      usage: {
        title: '用量與成本',
        body: '追蹤 AI Provider、代理 API 調用、圖片存儲與成本控制。',
        provider: 'Provider',
        calls: '調用',
        cost: '成本',
        route: '路由',
        autoRoute: '自動',
        inspect: '查看',
        wenwen: '問問代理 API',
        qiniu: '七牛雲 Kodo'
      },
      operations: {
        title: '運營中心',
        body: '監控失敗任務、審核積壓、Provider 延遲與系統檢查。',
        incidentTitle: '待處理隊列',
        live: '即時',
        failedPublish: 'CMS 發佈任務失敗',
        providerDelay: 'Provider 延遲升高',
        reviewBacklog: '審核積壓上升',
        checklistTitle: '每日檢查',
        checkCert: 'SSL 證書自動續期 dry-run 狀態',
        checkQueue: 'Worker 隊列重試與死信數量',
        checkWebhook: 'CMS Webhook 投遞健康度'
      },
      settings: {
        title: '管理設定',
        body: '配置套餐、Provider 路由、CMS 擴展開關與團隊權限。',
        plansTitle: '套餐與限制',
        providersTitle: 'Provider 路由',
        cmsTitle: 'CMS 擴展開關',
        teamTitle: '團隊權限',
        planLimits: '套餐配額與站點限制',
        overageRules: '超額與提醒門檻',
        trialControls: '試用與引導控制',
        providerFallback: 'OpenAI、Gemini、DeepSeek 與問問的備援順序',
        providerBudgets: 'Provider 成本護欄',
        providerKeys: '密鑰安全狀態',
        wordpress: 'WordPress 已啟用',
        joomla: 'Joomla 已預留',
        opencart: 'OpenCart 已預留',
        roles: 'Owner、Admin、Support 角色',
        auditLog: '管理操作日誌',
        security: '安全與存取策略'
      }
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
