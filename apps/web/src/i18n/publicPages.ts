export const publicPageMessages = {
  en: {
    features: {
      eyebrow: 'Product capabilities',
      keyword: 'AI SEO website optimization tools',
      title: 'Reviewable AI SEO Website Optimization Tools',
      body: 'Explore AI SEO website optimization tools that connect your CMS, find practical opportunities, and keep every assisted change reviewable before production.',
      screenshotLabel: 'Product screenshot placeholder',
      cta: 'Open the workspace',
      items: [
        { title: 'Site overview', body: 'See site health, audit progress, open reviews, and recent optimization activity in one place.' },
        { title: 'Site management', body: 'Connect WordPress now and keep Joomla, OpenCart, and future adapters in the same workspace.' },
        { title: 'Traffic analytics', body: 'Compare traffic, queries, clicks, and ranking movement across a selected date range.' },
        { title: 'Keyword suggestions', body: 'Turn target topics into prioritized opportunities with filters and exportable results.' },
        { title: 'Media processing', body: 'Generate editable title, description, filename, and Alt Text suggestions for images.' },
        { title: 'Internal links', body: 'Review source, target, anchor text, relevance, and confidence before inserting a link.' },
        { title: 'Review queue', body: 'Approve, reject, or edit AI suggestions with a clear audit trail and role-aware workflow.' },
        { title: 'Task queue', body: 'Track sync, audit, generation, and writeback jobs with retry and dead-letter visibility.' },
        { title: 'CMS adapters', body: 'Inspect platform capability and connection status without hiding implementation limits.' },
        { title: 'Lighthouse audit', body: 'Bring performance, accessibility, best-practice, and SEO signals into the same dashboard.' }
      ]
    },
    blog: {
      eyebrow: 'RankWoven journal',
      keyword: 'website SEO and AI optimization tutorials',
      title: 'Website SEO and AI Optimization Tutorials',
      body: 'Website SEO and AI optimization tutorials covering technical SEO, content, local search, analytics, and practical optimization workflows.',
      readArticle: 'Read article',
      articleCount: '{count} articles',
      languageNote: 'Articles are written in Traditional Chinese',
      filtersLabel: 'Article filters',
      searchLabel: 'Search articles',
      searchPlaceholder: 'Search titles and summaries',
      categoryLabel: 'Topic',
      allCategories: 'All topics',
      chapter: 'Chapter {chapter}',
      readingMinutes: '{minutes} min read',
      noResultsTitle: 'No matching articles',
      noResultsBody: 'Try a different keyword or topic.',
      clearFilters: 'Clear filters',
      paginationLabel: 'Article pagination',
      previousPage: 'Previous',
      nextPage: 'Next',
      pageStatus: 'Page {current} of {total}',
      loading: 'Loading article…',
      notFoundTitle: 'Article not found',
      notFoundBody: 'The article may have moved or the address is incorrect.',
      browseArticles: 'Browse all articles',
      breadcrumbLabel: 'Breadcrumb',
      backToBlog: 'Back to SEO articles',
      tableOfContents: 'On this page',
      editorialNote: 'Editorial note: this article is part of the RankWoven SEO learning handbook. Search platforms and product interfaces change over time; verify time-sensitive details against current official documentation.',
      articleNavigationLabel: 'Article navigation',
      previousArticle: 'Previous article',
      nextArticle: 'Next article',
      categories: {
        fundamentals: 'SEO fundamentals',
        'search-engines': 'Search engines',
        algorithms: 'Algorithms and ranking',
        'on-page': 'Keywords and on-page SEO',
        technical: 'Technical SEO',
        content: 'Content SEO',
        'off-page': 'Off-page SEO',
        local: 'Local SEO',
        advanced: 'Advanced technical SEO',
        'ai-search': 'AI search, AEO and GEO',
        analytics: 'Analytics and measurement',
        risk: 'SEO risk management',
        management: 'Teams, budgets and projects',
        operations: 'Operations and checklists',
        specialized: 'Specialized SEO',
        faq: 'FAQ and myths'
      }
    },
    docs: {
      eyebrow: 'Product documentation',
      keyword: 'WordPress AI SEO optimization tutorial',
      title: 'WordPress AI SEO Optimization Tutorial',
      body: 'Follow this WordPress AI SEO optimization tutorial to connect your CMS, sync content, review suggestions, and apply approved changes safely.',
      navigation: ['Quick start', 'Connect WordPress', 'Review suggestions', 'Apply and roll back'],
      steps: [
        { title: 'Connect your site', body: 'Create a site connection, select the CMS adapter, and keep the generated token in your plugin configuration.' },
        { title: 'Sync content', body: 'Run a full sync for the first import, then use incremental syncs or manual refresh for individual items.' },
        { title: 'Review changes', body: 'Open the review queue, edit suggestions when needed, and approve only the changes that meet your editorial standard.' },
        { title: 'Apply with a snapshot', body: 'Approved items become writeback tasks. RankWoven stores a before-state snapshot so a rollback remains available.' }
      ],
      codeLabel: 'Example connection payload',
      code: '{\n  "platform": "wordpress",\n  "siteUrl": "https://example.com"\n}',
      cta: 'Go to pricing'
    },
    help: {
      eyebrow: 'Help centre',
      keyword: 'AI SEO website optimization FAQ',
      title: 'AI SEO Website Optimization FAQ',
      body: 'Browse this AI SEO website optimization FAQ for answers about reviewable AI, CMS connections, permissions, and safe writeback.',
      contactCta: 'Contact support',
      faqs: [
        { question: 'Does RankWoven publish AI content automatically?', answer: 'No. Suggestions remain editable and require approval before a writeback task can be created.' },
        { question: 'Which CMS can I connect?', answer: 'WordPress is the first supported adapter. The workspace also exposes capability status for Joomla, OpenCart, and future adapters.' },
        { question: 'Can I roll back a change?', answer: 'Yes. Every approved writeback creates a snapshot before the CMS is updated, subject to the adapter retaining the original value.' },
        { question: 'What permissions does a team member need?', answer: 'Owners and admins manage connections and billing. Editors can review and edit suggestions. Viewers can read reports without applying changes.' },
        { question: 'Does RankWoven guarantee rankings?', answer: 'No. The product reports measurable workflow and content signals, but search rankings depend on many external factors.' }
      ]
    },
    about: {
      eyebrow: 'About RankWoven',
      keyword: 'reviewable AI SEO optimization platform',
      title: 'A Reviewable AI SEO Optimization Platform',
      body: 'RankWoven is a reviewable AI SEO optimization platform that helps teams improve existing content while people retain the final decision.',
      missionTitle: 'Our working principle',
      missionBody: 'AI should surface useful options, explain why they matter, and leave a reliable record of what changed. It should not turn publishing into a black box.',
      valuesTitle: 'What we value',
      values: [
        { title: 'Useful over prolific', body: 'Improve content that serves a real reader and a clear search intent.' },
        { title: 'Human approval', body: 'Keep editorial ownership with the people who know the audience and the business.' },
        { title: 'Reversible by design', body: 'Preserve before-and-after context so teams can inspect and roll back changes.' }
      ],
      cta: 'See the product'
    },
    contact: {
      eyebrow: 'Contact RankWoven',
      keyword: 'website SEO optimization support',
      title: 'Website SEO Optimization Support',
      body: 'Contact website SEO optimization support about your site type, team workflow, or integration question. This prototype form does not send data.',
      name: 'Name',
      email: 'Work email',
      message: 'What would you like to improve?',
      submit: 'Send enquiry',
      submitted: 'Thanks. Your message is ready for the support workflow.',
      supportNote: 'For production, connect this form to the support API and add rate limiting, spam protection, and consent logging.'
    },
    privacy: {
      eyebrow: 'Legal',
      keyword: 'AI SEO tool privacy policy',
      title: 'AI SEO Tool Privacy Policy',
      body: 'Read the AI SEO tool privacy policy framework covering account data, connected sites, audits, usage events, retention, and deletion.',
      sections: [
        { title: 'Information we process', body: 'Account details, connected site metadata, content supplied for audit, usage events, and support messages may be processed to provide the service.' },
        { title: 'How we use information', body: 'We use information to authenticate users, run requested audits, show workflow history, improve reliability, and respond to support requests.' },
        { title: 'Retention and deletion', body: 'Define retention periods for account data, synced content, snapshots, logs, and deleted workspaces. Provide a documented deletion request path.' },
        { title: 'Contact and updates', body: 'Publish the legal entity, support address, effective date, and a process for notifying users about material policy changes.' }
      ]
    },
    terms: {
      eyebrow: 'Legal',
      keyword: 'AI SEO tool terms of service',
      title: 'AI SEO Tool Terms of Service',
      body: 'Read the AI SEO tool terms of service framework for connected sites, AI-assisted suggestions, plans, limits, and termination.',
      sections: [
        { title: 'Using the service', body: 'Customers are responsible for the sites they connect, the permissions they grant, and the content they approve for writeback.' },
        { title: 'AI-assisted suggestions', body: 'Suggestions are provided for review and do not guarantee traffic, rankings, conversions, or legal compliance for a specific industry.' },
        { title: 'Plans and limits', body: 'Define plan entitlements, usage limits, billing cycles, renewal, taxes, refunds, overages, and account suspension rules.' },
        { title: 'Changes and termination', body: 'Document support commitments, service changes, termination rights, data export, snapshot availability, and governing law.' }
      ]
    }
  },
  'zh-Hant': {
    features: {
      eyebrow: '產品能力',
      keyword: 'AI SEO 網站優化工具功能',
      title: '可審核 AI SEO 網站優化工具功能',
      body: '了解 RankWoven 的 AI SEO 網站優化工具功能：連接 CMS、找出優化機會，並在變更進入正式站前保留人工審核。',
      screenshotLabel: '產品截圖預留位置',
      cta: '進入工作台',
      items: [
        { title: '站點概覽', body: '在同一個頁面查看站點健康度、審計進度、待審核項目和近期優化活動。' },
        { title: '站點管理', body: '先連接 WordPress，並在同一個工作區查看 Joomla、OpenCart 和後續適配器。' },
        { title: '流量分析', body: '按日期範圍比較流量、查詢、點擊和排名變化。' },
        { title: '關鍵詞建議', body: '把目標主題轉成可篩選、可匯出的優先機會。' },
        { title: '媒體處理', body: '為圖片生成可編輯的標題、說明、檔案名稱和 Alt Text 建議。' },
        { title: '內部連結', body: '在插入前審核來源、目標、錨文本、相關性和信心度。' },
        { title: '審核隊列', body: '按角色批准、拒絕或編輯 AI 建議，並保留清楚的操作留痕。' },
        { title: '任務隊列', body: '追蹤同步、審計、生成和寫回任務，包含重試與死信狀態。' },
        { title: 'CMS 適配器', body: '查看各平台能力與連接狀態，不隱藏仍有限制的實作範圍。' },
        { title: 'Lighthouse 審計', body: '把效能、無障礙、最佳實踐和 SEO 信號放進同一個儀表板。' }
      ]
    },
    blog: {
      eyebrow: 'RankWoven 專欄',
      keyword: '網站 SEO 整合 AI 優化教程',
      title: '網站 SEO 整合 AI 優化教程',
      body: '網站 SEO 整合 AI 優化教程，涵蓋 SEO 基礎、技術 SEO、內容、在地搜尋、數據分析與可執行的 AI 優化流程。',
      readArticle: '閱讀文章',
      articleCount: '共 {count} 篇文章',
      languageNote: '文章正文以繁體中文撰寫',
      filtersLabel: '文章篩選',
      searchLabel: '搜尋文章',
      searchPlaceholder: '搜尋標題與摘要',
      categoryLabel: '主題分類',
      allCategories: '全部主題',
      chapter: '第 {chapter} 章',
      readingMinutes: '閱讀 {minutes} 分鐘',
      noResultsTitle: '找不到符合條件的文章',
      noResultsBody: '請嘗試其他關鍵詞或主題分類。',
      clearFilters: '清除篩選',
      paginationLabel: '文章分頁',
      previousPage: '上一頁',
      nextPage: '下一頁',
      pageStatus: '第 {current} / {total} 頁',
      loading: '正在載入文章…',
      notFoundTitle: '找不到文章',
      notFoundBody: '文章可能已移動，或網址不正確。',
      browseArticles: '瀏覽全部文章',
      breadcrumbLabel: '麵包屑導覽',
      backToBlog: '返回 SEO 文章',
      tableOfContents: '本頁目錄',
      editorialNote: '編輯說明：本文屬於 RankWoven SEO 學習手冊。搜尋平台、產品介面與數據會隨時間更新，涉及時效性的內容請以最新官方文件再次核實。',
      articleNavigationLabel: '文章導覽',
      previousArticle: '上一篇',
      nextArticle: '下一篇',
      categories: {
        fundamentals: 'SEO 基礎入門',
        'search-engines': '搜尋引擎原理',
        algorithms: '演算法與排名因素',
        'on-page': '關鍵字與頁面 SEO',
        technical: '技術 SEO',
        content: '內容 SEO',
        'off-page': '站外 SEO',
        local: '在地 SEO',
        advanced: '進階技術 SEO',
        'ai-search': 'AI 搜尋、AEO 與 GEO',
        analytics: '數據分析與監控',
        risk: 'SEO 風險管理',
        management: '團隊、預算與專案',
        operations: '維運與檢查清單',
        specialized: '特殊領域 SEO',
        faq: '常見問題與迷思'
      }
    },
    docs: {
      eyebrow: '產品文件',
      keyword: 'WordPress AI SEO 優化教學',
      title: 'WordPress AI SEO 優化教學',
      body: '按照 WordPress AI SEO 優化教學連接 CMS、同步內容、審核建議，再安全套用已批准的變更。',
      navigation: ['快速開始', '連接 WordPress', '審核建議', '套用與回滾'],
      steps: [
        { title: '連接站點', body: '建立站點連接、選擇 CMS 適配器，並把生成的 Token 保存到插件設定。' },
        { title: '同步內容', body: '首次導入使用完整同步，之後可用增量同步或單篇手動刷新。' },
        { title: '審核變更', body: '打開審核隊列，按需要編輯建議，只批准符合編輯標準的修改。' },
        { title: '帶快照套用', body: '已批准項目會變成寫回任務。RankWoven 在更新 CMS 前保存修改前快照，保留回滾入口。' }
      ],
      codeLabel: '連接請求範例',
      code: '{\n  "platform": "wordpress",\n  "siteUrl": "https://example.com"\n}',
      cta: '查看定價'
    },
    help: {
      eyebrow: '支援中心',
      keyword: 'AI SEO 網站優化常見問題',
      title: 'AI SEO 網站優化常見問題',
      body: '查看 AI SEO 網站優化常見問題，了解人工審核、CMS 連接、團隊權限和安全寫回流程。',
      contactCta: '聯絡支援',
      faqs: [
        { question: 'RankWoven 會自動發布 AI 內容嗎？', answer: '不會。所有建議都可以編輯，並且必須批准後才會建立寫回任務。' },
        { question: '可以連接哪些 CMS？', answer: '第一階段支援 WordPress，工作區也會展示 Joomla、OpenCart 和後續適配器的能力狀態。' },
        { question: '可以回滾變更嗎？', answer: '可以。每次批准寫回前都會建立快照，前提是適配器仍能保留原始值。' },
        { question: '團隊成員需要什麼權限？', answer: 'Owner 和 Admin 管理連接與帳單；Editor 可審核和編輯建議；Viewer 只能查看報告，不能套用變更。' },
        { question: 'RankWoven 會保證排名嗎？', answer: '不會。產品展示的是流程和內容信號，搜尋排名仍受很多外部因素影響。' }
      ]
    },
    about: {
      eyebrow: '關於 RankWoven',
      keyword: '可審核 AI SEO 優化平台',
      title: '可審核 AI SEO 優化平台',
      body: 'RankWoven 是可審核 AI SEO 優化平台，協助團隊改善現有內容，同時保留足夠上下文與人工最終決定。',
      missionTitle: '我們的工作原則',
      missionBody: 'AI 應該提出有用選項、解釋它們為什麼重要，並留下可靠的變更記錄；發布不應變成黑盒。',
      valuesTitle: '我們重視的事',
      values: [
        { title: '有用勝過堆量', body: '優化真正服務讀者、對應清晰搜尋意圖的內容。' },
        { title: '人工批准', body: '把編輯主導權交給最了解受眾與業務的人。' },
        { title: '天生可逆', body: '保留修改前後上下文，方便團隊檢查和回滾。' }
      ],
      cta: '查看產品'
    },
    contact: {
      eyebrow: '聯絡 RankWoven',
      keyword: '網站 SEO 優化技術支援',
      title: '網站 SEO 優化技術支援',
      body: '聯絡網站 SEO 優化技術支援，說明你的站點類型、團隊流程或整合問題；目前此原型表單不會發送資料。',
      name: '姓名',
      email: '工作電郵',
      message: '你想改善什麼？',
      submit: '發送查詢',
      submitted: '謝謝，你的訊息已準備交給支援流程。',
      supportNote: '正式環境需要把表單接到支援 API，並加入限流、垃圾訊息防護和同意記錄。'
    },
    privacy: {
      eyebrow: '法律文件',
      keyword: 'AI SEO 工具私隱政策',
      title: 'AI SEO 工具私隱政策',
      body: 'AI SEO 工具私隱政策框架，說明帳戶資料、已連接站點、審計內容、使用事件、資料保留與刪除。',
      sections: [
        { title: '我們處理的資料', body: '為提供服務，可能會處理帳戶資料、已連接站點資訊、用於審計的內容、用量事件和支援訊息。' },
        { title: '資料用途', body: '資料用於驗證用戶、執行請求的審計、展示流程歷史、改善可靠性和回覆支援請求。' },
        { title: '保留與刪除', body: '請定義帳戶資料、同步內容、快照、日誌和已刪除工作區的保留期限，並提供正式刪除申請流程。' },
        { title: '聯絡與更新', body: '請公開法律主體、支援地址、生效日期，以及重大政策變更的通知方式。' }
      ]
    },
    terms: {
      eyebrow: '法律文件',
      keyword: 'AI SEO 工具服務條款',
      title: 'AI SEO 工具服務條款',
      body: 'AI SEO 工具服務條款框架，說明連接站點、AI 輔助建議、套餐限制、服務變更與終止安排。',
      sections: [
        { title: '使用服務', body: '客戶需對自己連接的站點、授予的權限，以及批准寫回的內容負責。' },
        { title: 'AI 輔助建議', body: '建議只供審核，不保證流量、排名、轉化或特定行業的法律合規。' },
        { title: '套餐與限制', body: '請定義套餐權益、用量上限、結算週期、續期、稅項、退款、超額和停用規則。' },
        { title: '變更與終止', body: '請說明支援承諾、服務變更、終止權、資料匯出、快照保留和適用法律。' }
      ]
    }
  }
} as const;
