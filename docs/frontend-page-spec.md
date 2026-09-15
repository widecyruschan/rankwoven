# RankWoven 前端頁面規格

更新日期：2026-08-24

本文件把 `rankwoven-prd.md` 的前端頁面矩陣、Route Contract、後台模塊和多語言要求落到目前 Vue 3 應用。頁面顯示文案集中在 `apps/web/src/i18n.ts` 與 `apps/web/src/i18n/publicPages.ts`，不要在模板直接新增面向用戶的硬編碼文字。

## 1. 頁面分層

| 層級 | 路由 | 索引策略 | 實作 | 主要任務 |
|---|---|---|---|---|
| 營銷 | `/` | `index, follow` | `MarketingHomeView.vue` | 解釋可審核 AI SEO 價值，提供登入與定價入口 |
| 營銷 | `/features` | `index, follow` | `PublicContentView.vue` | 展示 10 個核心後台模塊與產品截圖預留位 |
| 營銷 | `/pricing` | `index, follow` | `PricingView.vue` | 展示 Starter、Growth、Agency、Enterprise 套餐 |
| 內容 | `/blog`、`/blog/:slug` | `index, follow` | `BlogView.vue`、`BlogArticleView.vue` | 86 篇 SEO 方法文章列表與詳情；支援搜尋、分類、分頁、目錄、前後篇和 BlogPosting schema |
| 內容 | `/docs` | `index, follow` | `PublicContentView.vue` | 快速開始、CMS 連接、審核、套用與回滾說明 |
| 內容 | `/help` | `index, follow` | `PublicContentView.vue` | FAQ 折疊內容，保留 FAQPage schema 接入位置 |
| 品牌 | `/about` | `index, follow` | `PublicContentView.vue` | 品牌原則、產品使命與團隊價值 |
| 轉化 | `/contact` | `index, follow` | `PublicContentView.vue` | 支援查詢表單；正式環境交由後端處理 |
| 法律 | `/privacy`、`/terms` | `index, follow` | `PublicContentView.vue` | Footer 必達的私隱政策與服務條款頁，不可 404 |
| 認證 | `/login`、`/register`、密碼頁 | `noindex, nofollow` | 現有 auth views | 登入、註冊、忘記及重設密碼 |
| 客戶產品 | `/app/*` | `noindex, nofollow` | 現有 app views | 站點、分析、關鍵詞、媒體、內鏈、任務、CMS、Lighthouse、設定 |
| 內部管理 | `/admin/*` | `noindex, nofollow` | 現有 admin views | 平台、客戶、用量、運營和管理設定 |

路由 meta 由 `apps/web/src/constants/routeRegistry.json` 作為唯一來源，再由 `apps/web/src/router/index.ts` 生成；`apps/web/src/utils/seoHead.ts` 統一同步頁面 title、description、keywords、robots、canonical、Open Graph 和 Twitter card。公開頁面 URL 由同一 registry 驅動 `apps/web/public/sitemap.xml` 及 `sitemap-pages.xml`／`sitemap-blog.xml` 分組，`/app`、`/admin` 和登入／註冊流程同時由 Nginx `X-Robots-Tag` 與前端 meta 禁止索引。

目前仍是 Vite + Vue SPA，營銷與 Blog 的真實文案在瀏覽器載入後由 Vue 渲染。每次 build 會由 `apps/web/scripts/generate-seo-pages.mjs` 根據公開頁面與文章 manifest 產生 96 個路由專屬的 `dist/**/index.html`，讓不執行 JavaScript 的爬蟲仍能取得正確 title、description、keywords、canonical、Open Graph 和文章 BlogPosting metadata；但 H1 與正文仍未進入初始 HTML。正式 SEO 上線前如需完整內容索引，仍需將營銷與內容層遷移到 SSG 或 SSR，後台維持 SPA。

## 2. 後台模塊對照

| PRD 模塊 | 路由 | 主要交互 |
|---|---|---|
| 站點概覽 | `/app` | 健康分、審計進度、待審核建議、近期活動 |
| 站點管理 | `/app/sites` | 新增、查看、刷新、重新生成或吊銷站點連接 |
| 流量分析 | `/app/analytics`、`/app/sites/:siteId/analytics` | 日期範圍、流量趨勢、查詢與熱門頁面；手動網站可輸入 GA4 Property ID 連接唯讀數據 |
| 關鍵詞建議 | `/app/keywords` | 生成、篩選、查看與匯出建議 |
| 媒體處理 | `/app/media` | 批量掃描、編輯、批准和套用圖片 SEO 建議 |
| 內部連結 | `/app/links` | 審核來源、目標、錨文本、理由與信心度 |
| 任務隊列 | `/app/tasks` | 查看進度、失敗、重試、死信與匯出 |
| CMS 適配器 | `/app/cms-adapters` | 查看 WordPress、Joomla、OpenCart 能力狀態 |
| Lighthouse 審計 | `/app/lighthouse`、`/app/site-audit` | 查看性能、無障礙、最佳實踐與 SEO 分數 |
| 設定 | `/app/settings` | API、AI Provider、媒體存儲與團隊設定 |

### SEO 網站檢測的 Ahrefs 全站模式

`/app/site-audit` 仍以所選網站為作用域。當站點配置啟用 Ahrefs Site Audit 並填入專案 ID 後，「立即執行檢測」會調用 Ahrefs 的全站問題與健康度資料，而不再使用 25 頁的備援爬蟲。問題列表顯示每條規則的嚴重度、受影響頁數、變化和修復建議；展開單條問題時才按 `issue_id` 分頁載入實際受影響 URL。

相關 API：

- `GET /api/v1/site-connections/:siteId/ahrefs-site-audit/config`
- `PUT /api/v1/site-connections/:siteId/ahrefs-site-audit/config`
- `GET /api/v1/site-connections/:siteId/ahrefs-site-audit/issues/:issueId/pages?offset=0&limit=100`

日期字段使用 Ahrefs 要求的 UTC ISO 8601 格式，例如 `2026-09-12T02:21:42Z`。Ahrefs API 金鑰只在 API server-side 環境變數中配置，不會返回前端。

文章審計、文章同步、建議處理、單篇修改和內容審核仍保留兼容路由；如產品要重新公開入口，應在不改變 API 合約前提下補回獨立導航。

## 3. 多語言策略

- 使用 Vue I18n，所有頁面文案通過 `t()` / `tm()` 讀取。
- `en` 和 `zh-Hant` 是目前完整翻譯語言，預設語言為 `zh-Hant`，fallback 為 `en`。
- 語言選擇保存於 `localStorage` 的 `aieo-locale`，刷新後恢復。
- 語言切換會同步 `<html lang>`，日期和關鍵詞建議請求也使用當前 locale。
- 選單保留英文、德文、法文、意大利文、簡體中文、繁中、日文、韓文、葡萄牙文、西班牙文和俄文；新增翻譯時需同時補上 `en`、`zh-Hant`，再按市場優先級擴展其他 locale。
- 新增 locale 前先確認文案覆蓋率，不允許顯示未翻譯的 i18n key。

## 4. Blog 內容契約

- 文章索引資料集中在 `apps/web/src/content/seo/articles.json`，正文以按需載入的 Markdown 放在 `apps/web/src/content/seo/`。
- `/blog` 每頁顯示 12 篇文章，搜尋同時比對標題和摘要，分類選單由 16 個 `BlogCategoryId` 驅動。
- `/blog/:slug` 由 `BlogArticleView.vue` 載入正文，使用 `marked` 轉換 Markdown，再由 `DOMPurify` 消毒後插入 DOM；外部連結會加上 `target="_blank"` 與 `rel="noopener noreferrer"`。
- 文章正文維持繁體中文；頁面導覽、篩選器、metadata、錯誤狀態和 footer 走 Vue I18n。切換至英文等 locale 時，不對正文做未經人工審校的假翻譯。
- 文章封面輸出至 `apps/web/public/blog/seo/images/*.webp`；文章 URL 和公開頁面 URL 由 `routeRegistry.json` 及文章 manifest 經 `scripts/generate-sitemap.mjs` 生成到 Sitemap index 及分組檔案。
- build 後的靜態 SEO fallback 會為公開入口與 86 篇文章輸出路由專屬 HTML metadata；文章正文和 H1 仍在瀏覽器載入後由 Vue 渲染。
- 正式 SEO 上線前如需完整內容索引，仍需將公開 Blog 由目前 Vite SPA 遷移至 SSG/SSR，讓文章正文和 H1 出現在初始 HTML。

## 5. 核心 SEO 關鍵詞策略

- 網站主題為「SEO 教學｜網站 SEO 整合 AI 優化教程」，首頁 focus keyword 固定為 `SEO 教學`。
- 每個可索引公開入口只分配一個主要關鍵詞；關鍵詞自然出現在 H1／title 與 description，避免頁面互相競爭或堆砌同一主詞。
- `meta[name="keywords"]` 只作其他搜尋引擎與內部稽核用途，不能取代可見內容、title、description、內部連結與正文品質。
- Blog 文章以每篇文章標題作獨立長尾詞，並同步到 `meta keywords` 與 BlogPosting `keywords`；文章頁仍按摘要生成 description、canonical 與 OG image。
- 英文 locale 使用對應的 `SEO tutorials` 與 `website SEO and AI optimization` 文案；正文仍以人工審校的繁體中文為主，不對文章做自動假翻譯。
- 登入、客戶後台和管理後台維持 `noindex, nofollow`，不把產品操作頁與公開 SEO 教學內容混在索引池中。

| URL | 繁中主要關鍵詞 | 英文主要關鍵詞 |
|---|---|---|
| `/` | `SEO 教學` | `SEO tutorials` |
| `/features` | `AI SEO 網站優化工具功能` | `AI SEO website optimization tools` |
| `/docs` | `WordPress AI SEO 優化教學` | `WordPress AI SEO optimization tutorial` |
| `/help` | `AI SEO 網站優化常見問題` | `AI SEO website optimization FAQ` |
| `/about` | `可審核 AI SEO 優化平台` | `reviewable AI SEO optimization platform` |
| `/contact` | `網站 SEO 優化技術支援` | `website SEO optimization support` |
| `/privacy` | `AI SEO 工具私隱政策` | `AI SEO tool privacy policy` |
| `/terms` | `AI SEO 工具服務條款` | `AI SEO tool terms of service` |
| `/blog` | `網站 SEO 整合 AI 優化教程` | `website SEO and AI optimization tutorials` |
| `/pricing` | `AI SEO 網站優化工具價格` | `AI SEO website optimization pricing` |
| `/blog/:slug` | 該文章繁中標題 | 該文章繁中標題；正文未提供未審校翻譯 |

## 6. 驗收清單

- [x] 首頁與公開內容頁使用 Vue 路由，可由 sitemap 直接發現。
- [x] `/privacy`、`/terms` 有固定路由並由 footer 可達。
- [x] 登入、客戶後台和管理後台標記 `noindex, nofollow`。
- [x] 公開頁面設置自指 canonical；路由切換會同步 document head。
- [x] 多語言切換使用 Vue I18n，繁中與英文文案完整覆蓋新增頁面。
- [x] 聯絡表單有必填與 email 型別校驗，提交只展示原型成功狀態，不偽造後端落庫。
- [x] `/blog` 可搜尋、按 16 個主題分類、分頁瀏覽 86 篇文章；`/blog/:slug` 支援正文、目錄、前後篇、JSON-LD 和 404 狀態。
- [x] Blog 文章 Markdown 經消毒後渲染，包含表格與 code block 的文章在桌面和手機無頁面橫向溢出。
- [x] Blog 文章封面已壓縮為 WebP，sitemap 包含 86 個文章 URL；正文內部連結已驗證無失效路徑。
- [x] 公開頁面共用 SEO head helper，含 description、canonical、robots、Open Graph、Twitter card；首頁初始 HTML 含核心詞 fallback 和 Organization/WebSite JSON-LD。
- [x] Web build 會生成 10 個公開入口與 86 篇文章的路由專屬 SEO fallback HTML；Nginx 優先返回對應 `index.html`。
- [x] 語言切換會同步公開頁面的 SEO head；文章頁保留文章 title、摘要、封面和 BlogPosting metadata。
- [x] 10 個公開入口各有唯一中英文主要關鍵詞；首頁繁中主詞為 `SEO 教學`，Blog 文章以文章標題作獨立長尾詞，私有頁不保留 keywords meta。
- [x] 手動加入的網站可在流量分析頁保存 GA4 Property ID；保存後按站點上下文讀取 GA4，內容寫回能力仍保持關閉。
- [x] Nginx 透過 URI `map` 對 `/login`、`/register`、`/forgot-password`、`/reset-password` 和所有 `/app`、`/admin` 路由輸出 `X-Robots-Tag: noindex, nofollow, noarchive`；即使 SPA fallback 到 `index.html`，header 仍會保留。
- [ ] 公開頁面目前尚未達成初始 HTML SSR/SSG；需在正式 SEO 上線前完成前台渲染架構遷移。
- [ ] 正式上線前替換法律文件骨架，並接入 FAQPage / BlogPosting / Organization schema。
- [ ] 正式上線前把聯絡表單接到 API，加入限流、垃圾訊息防護與同意記錄。
- [ ] 若需要全球市場，補齊其餘 locale 的人工翻譯與 hreflang。

## 7. 第二階段未完成選單與路由規劃

最新、可實作的三層資訊架構以 `docs/rankwoven-phase-2-prd.md` 第 11.3.6 節為準；本節只記錄目前程式碼尚未啟用的實作邊界，避免把既有 flat `/app/*` 頁面誤當成第二階段最終路由。

- 公開前台：主選單固定為產品、工具、資源、定價與帳戶；Footer 提供公司與法律入口。Tools hub 是八個工具頁的唯一父 hub，每個工具頁需有 parent、related content 與公開 link graph 導入。
- 客戶後台：App shell 分為工作區、目前站點、監控與外鏈、工作區操作四組。所有站點功能遷移至 `/app/sites/:siteId/*`，內容詳情、優化器與審核為內容庫的子頁，不列成無上下文的全域選單。
- 管理後台：獨立為平台總覽、客戶與資源、執行與成本、治理、系統五組；不可共用客戶後台側欄，也不可在公開頁輸出連結。
- Route registry 後續擴展 `navigationSurface`、group、order、parent、i18n label、feature flag、availability phase 與 site scope，並由同一 manifest 產生 Router、menu、breadcrumb、legacy resolver、SEO head 與 sitemap。
- 尚未開啟的 route 一律保留 `planned=true`、`enabled=false`，不進 sitemap、不出現在選單、不建立空白頁。實際實作須在 `PH2-08` 批准後進行，公開 route 另重跑 PH2-01 SEO／孤島 gate。
