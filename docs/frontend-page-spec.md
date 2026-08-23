# RankWoven 前端頁面規格

更新日期：2026-08-23

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

路由 meta 由 `apps/web/src/router/index.ts` 維護 `indexable` 與 `canonicalPath`；router `afterEach` 會同步頁面 title、robots meta 和 canonical link。公開頁面 URL 同步到 `apps/web/public/sitemap.xml`，`/app` 與 `/admin` 同步由 `robots.txt` 禁止索引。

目前仍是 Vite + Vue SPA，公開頁面的真實文案在瀏覽器載入後由 Vue 渲染；router head 管理不能取代 PRD 要求的「首頁初始 HTML 含真實 H1」。正式 SEO 上線前需將營銷與內容層遷移到 SSG 或 SSR（例如靜態構建到 Cloudflare Pages，或獨立 Nuxt 前台），後台維持 SPA。

## 2. 後台模塊對照

| PRD 模塊 | 路由 | 主要交互 |
|---|---|---|
| 站點概覽 | `/app` | 健康分、審計進度、待審核建議、近期活動 |
| 站點管理 | `/app/sites` | 新增、查看、刷新、重新生成或吊銷站點連接 |
| 流量分析 | `/app/analytics` | 日期範圍、流量趨勢、查詢與熱門頁面 |
| 關鍵詞建議 | `/app/keywords` | 生成、篩選、查看與匯出建議 |
| 媒體處理 | `/app/media` | 批量掃描、編輯、批准和套用圖片 SEO 建議 |
| 內部連結 | `/app/links` | 審核來源、目標、錨文本、理由與信心度 |
| 任務隊列 | `/app/tasks` | 查看進度、失敗、重試、死信與匯出 |
| CMS 適配器 | `/app/cms-adapters` | 查看 WordPress、Joomla、OpenCart 能力狀態 |
| Lighthouse 審計 | `/app/lighthouse`、`/app/site-audit` | 查看性能、無障礙、最佳實踐與 SEO 分數 |
| 設定 | `/app/settings` | API、AI Provider、媒體存儲與團隊設定 |

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
- 文章封面輸出至 `apps/web/public/blog/seo/images/*.webp`；文章 URL 和公開頁面 URL 一起由 `scripts/generate-sitemap.mjs` 生成到 `apps/web/public/sitemap.xml`。
- 正式 SEO 上線前仍需將公開 Blog 由目前 Vite SPA 遷移至 SSG/SSR，讓文章正文和 H1 出現在初始 HTML。

## 5. 驗收清單

- [x] 首頁與公開內容頁使用 Vue 路由，可由 sitemap 直接發現。
- [x] `/privacy`、`/terms` 有固定路由並由 footer 可達。
- [x] 登入、客戶後台和管理後台標記 `noindex, nofollow`。
- [x] 公開頁面設置自指 canonical；路由切換會同步 document head。
- [x] 多語言切換使用 Vue I18n，繁中與英文文案完整覆蓋新增頁面。
- [x] 聯絡表單有必填與 email 型別校驗，提交只展示原型成功狀態，不偽造後端落庫。
- [x] `/blog` 可搜尋、按 16 個主題分類、分頁瀏覽 86 篇文章；`/blog/:slug` 支援正文、目錄、前後篇、JSON-LD 和 404 狀態。
- [x] Blog 文章 Markdown 經消毒後渲染，包含表格與 code block 的文章在桌面和手機無頁面橫向溢出。
- [x] Blog 文章封面已壓縮為 WebP，sitemap 包含 86 個文章 URL；正文內部連結已驗證無失效路徑。
- [ ] 公開頁面目前尚未達成初始 HTML SSR/SSG；需在正式 SEO 上線前完成前台渲染架構遷移。
- [ ] 正式上線前替換法律文件骨架，並接入 FAQPage / BlogPosting / Organization schema。
- [ ] 正式上線前把聯絡表單接到 API，加入限流、垃圾訊息防護與同意記錄。
- [ ] 若需要全球市場，補齊其餘 locale 的人工翻譯與 hreflang。
