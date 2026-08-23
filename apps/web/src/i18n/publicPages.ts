export const publicPageMessages = {
  en: {
    features: {
      eyebrow: 'Product capabilities',
      title: 'Reviewable SEO workflows for every content surface',
      body: 'RankWoven connects your CMS, finds practical opportunities, and keeps every AI-assisted change reviewable before it reaches production.',
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
      title: 'SEO tactics for sustainable content growth',
      body: 'Practical guides for site owners, agencies, and editors who want to improve existing content without losing editorial control.',
      readArticle: 'Read article',
      posts: [
        { category: 'Content audit', title: 'How to choose the next old article to update', excerpt: 'A simple prioritization model using intent, traffic, freshness, and conversion value.', readTime: '6 min read' },
        { category: 'Internal links', title: 'Build useful topic clusters before adding more content', excerpt: 'Use existing pages, clear anchors, and reviewable recommendations to strengthen site structure.', readTime: '8 min read' },
        { category: 'Image SEO', title: 'Alt Text that describes the image instead of stuffing keywords', excerpt: 'A practical checklist for accessible and search-friendly media metadata.', readTime: '5 min read' }
      ]
    },
    docs: {
      eyebrow: 'Product documentation',
      title: 'Connect a site and start an auditable optimization workflow',
      body: 'Use this quick path to connect a CMS, sync content, review suggestions, and apply approved changes safely.',
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
      title: 'Answers before you connect a site',
      body: 'Browse common questions about reviewable AI, CMS connections, permissions, and safe writeback.',
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
      title: 'Make SEO improvement understandable and reviewable',
      body: 'RankWoven helps teams improve the content they already own, with enough context for people to make the final call.',
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
      title: 'Tell us where your SEO workflow gets stuck',
      body: 'Share your site type, team workflow, or integration question. The form is ready for a backend handoff and does not send data from this prototype.',
      name: 'Name',
      email: 'Work email',
      message: 'What would you like to improve?',
      submit: 'Send enquiry',
      submitted: 'Thanks. Your message is ready for the support workflow.',
      supportNote: 'For production, connect this form to the support API and add rate limiting, spam protection, and consent logging.'
    },
    privacy: {
      eyebrow: 'Legal',
      title: 'Privacy policy',
      body: 'This page is a product-ready placeholder. Replace the sections below with the approved policy before production launch.',
      sections: [
        { title: 'Information we process', body: 'Account details, connected site metadata, content supplied for audit, usage events, and support messages may be processed to provide the service.' },
        { title: 'How we use information', body: 'We use information to authenticate users, run requested audits, show workflow history, improve reliability, and respond to support requests.' },
        { title: 'Retention and deletion', body: 'Define retention periods for account data, synced content, snapshots, logs, and deleted workspaces. Provide a documented deletion request path.' },
        { title: 'Contact and updates', body: 'Publish the legal entity, support address, effective date, and a process for notifying users about material policy changes.' }
      ]
    },
    terms: {
      eyebrow: 'Legal',
      title: 'Terms of service',
      body: 'This page is a product-ready placeholder. Replace the sections below with approved terms before accepting paid subscriptions.',
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
      title: '覆蓋每個內容表面的可審核 SEO 流程',
      body: 'RankWoven 連接你的 CMS，找出可執行的優化機會，並在變更進入正式站前保留完整人工審核。',
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
      title: '支持長期內容增長的 SEO 方法',
      body: '為站長、Agency 和編輯提供實用指南，在保留編輯控制的前提下改善既有內容。',
      readArticle: '閱讀文章',
      posts: [
        { category: '內容審計', title: '如何選擇下一篇值得更新的舊文章', excerpt: '用搜尋意圖、流量、新鮮度和轉化價值建立簡單的優先級模型。', readTime: '閱讀 6 分鐘' },
        { category: '內部連結', title: '先建立有用的主題集群，再增加內容數量', excerpt: '善用現有頁面、清晰錨文本和可審核建議強化站點結構。', readTime: '閱讀 8 分鐘' },
        { category: '圖片 SEO', title: '描述圖片，而不是堆砌關鍵詞的 Alt Text', excerpt: '一份兼顧無障礙與搜尋友善媒體資訊的實用清單。', readTime: '閱讀 5 分鐘' }
      ]
    },
    docs: {
      eyebrow: '產品文件',
      title: '連接站點，開始可審核的優化流程',
      body: '按這條快速路徑連接 CMS、同步內容、審核建議，再安全地套用已批准變更。',
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
      title: '連接站點前先找到答案',
      body: '查看可審核 AI、CMS 連接、權限和安全寫回的常見問題。',
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
      title: '讓 SEO 優化變得易懂、可審核',
      body: 'RankWoven 幫助團隊改善自己已經擁有的內容，提供足夠上下文，讓人做最後決定。',
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
      title: '告訴我們你的 SEO 流程卡在哪裡',
      body: '分享你的站點類型、團隊流程或整合問題。表單已預留後端接入，目前不會從這個原型發送資料。',
      name: '姓名',
      email: '工作電郵',
      message: '你想改善什麼？',
      submit: '發送查詢',
      submitted: '謝謝，你的訊息已準備交給支援流程。',
      supportNote: '正式環境需要把表單接到支援 API，並加入限流、垃圾訊息防護和同意記錄。'
    },
    privacy: {
      eyebrow: '法律文件',
      title: '私隱政策',
      body: '這是可直接放入產品的文件骨架。正式上線前請替換成已批准的政策內容。',
      sections: [
        { title: '我們處理的資料', body: '為提供服務，可能會處理帳戶資料、已連接站點資訊、用於審計的內容、用量事件和支援訊息。' },
        { title: '資料用途', body: '資料用於驗證用戶、執行請求的審計、展示流程歷史、改善可靠性和回覆支援請求。' },
        { title: '保留與刪除', body: '請定義帳戶資料、同步內容、快照、日誌和已刪除工作區的保留期限，並提供正式刪除申請流程。' },
        { title: '聯絡與更新', body: '請公開法律主體、支援地址、生效日期，以及重大政策變更的通知方式。' }
      ]
    },
    terms: {
      eyebrow: '法律文件',
      title: '服務條款',
      body: '這是可直接放入產品的文件骨架。接受付費訂閱前請替換成已批准的條款內容。',
      sections: [
        { title: '使用服務', body: '客戶需對自己連接的站點、授予的權限，以及批准寫回的內容負責。' },
        { title: 'AI 輔助建議', body: '建議只供審核，不保證流量、排名、轉化或特定行業的法律合規。' },
        { title: '套餐與限制', body: '請定義套餐權益、用量上限、結算週期、續期、稅項、退款、超額和停用規則。' },
        { title: '變更與終止', body: '請說明支援承諾、服務變更、終止權、資料匯出、快照保留和適用法律。' }
      ]
    }
  }
} as const;
