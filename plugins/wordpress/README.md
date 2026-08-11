# WordPress 插件

此目錄包含 MVP 第一版 WordPress 插件骨架：`rankwoven-seo`。

本地測試流程與手動測試清單見 [`TESTING.md`](./TESTING.md)。

## 安裝方式

將 `plugins/wordpress/rankwoven-seo` 複製或掛載到 WordPress 的插件目錄：

```text
wp-content/plugins/rankwoven-seo
```

然後在 WordPress 後台啟用 `RankWoven SEO`。

## 後台入口

啟用後可在 WordPress 後台側欄看到 `RankWoven SEO` 主選單，也可從 WordPress 設定頁進入：

```text
RankWoven SEO
Settings -> RankWoven SEO
```

當前後台支援：

- 以接近 AIOSEO 的方式提供 `儀表板`、`一般設定`、`搜尋外觀`、`網站地圖`、`Link Assistant`、`SEO 分析`、`圖片屬性`、`工具類` 和 `診斷` 管理入口。
- 後台 UI 使用 WordPress 原生 admin 元件加 RankWoven 輕量樣式，提供卡片化儀表板、連線狀態、快速操作與更清楚的設定分區，不額外載入前端 SPA 框架。
- 設定 RankWoven API Base URL，例如 `http://localhost:3011` 或 `https://api.rankwoven.com`。
- 手動保存 `Site ID` 和 `Site Token`。
- 輸入此 WordPress 站點的 GA4 Property ID，讓 SaaS 分析頁按站點讀取 SEO 流量資料。
- 保存 Twitter/X Username 和 Facebook App ID，用於前台 Twitter Card 與 Facebook Open Graph 標籤。
- 保存 WordPress 管理員用戶名和 Application Password，供 SaaS 後續以該管理員身份寫回已批准修改。
- 設定圖片屬性自動生成規則，使用檔案名為新上傳圖片生成標題、Alt Text、媒體說明文字和內容說明。
- 執行圖片屬性批量更新工具，先測試一張圖片，再分批更新既有圖片媒體。
- 查看只讀診斷頁，檢查 API 連接、Token、本地同步、圖片屬性和 Application Password 配置狀態。
- 在 `搜尋外觀` 頁籤為文章、頁面、Portfolio 和商品設定預設 SEO title、Meta description 與 Meta keywords 模板。
- 在 `網站地圖` 頁籤動態生成 `sitemap.xml`，並提交到 Google Search Console。
- 在文章、頁面、Portfolio 和商品編輯頁顯示 RankWoven SEO 面板，輸入 Focus keyphrase 後可用 AI 生成或優化 SEO title、Slug 和 Meta description。
- 在文章、頁面、Portfolio 和商品編輯頁保存 Keywords，並在前台頁面的 `<head>` 輸出 Meta description、Meta keywords、Google+ itemprop、Weibo、Twitter Card、LinkedIn / Facebook Open Graph 標籤。
- 一鍵建立站點連接，調用 SaaS API 的 `POST /api/v1/site-connections`。
- 一鍵建立後端同步任務，分頁批量同步 Posts、Pages、Portfolio、Products 和圖片媒體。
- 顯示最近一次同步時間、文章數、媒體數、同步頁數、同步模式、`updatedAfter` 和同步任務 ID。
- 當 SaaS 返回 `SITE_TOKEN_INVALID` 時，提示用戶重新生成 Token 並重新保存或重新連接站點。

## WordPress Application Password

RankWoven 後續應用已批准修改時，不使用 WordPress 主帳號密碼，也不使用 SaaS 主帳號密碼。用戶需要自行在 WordPress 後台建立 Application Password：

```text
Users -> Profile -> Application Passwords
```

建議操作：

1. 使用負責 SEO 修改的 WordPress 管理員登入。
2. 在個人資料頁建立一個名為 `RankWoven` 的 Application Password。
3. 複製 WordPress 顯示的一次性密碼。
4. 回到 `Settings -> RankWoven SEO`，填入管理員用戶名和 Application Password。
5. 保存設定後再點擊 `Connect This Site`。

SaaS 後端只保存加密後的 Application Password，不會在站點列表或詳情 API 返回明文。後續 WordPress REST API 寫回任務會使用該管理員身份，讓 WordPress 端能追蹤修改來源。

如果 WordPress 跑在 Docker Desktop 容器中，而 API 跑在宿主機端口 `3011`，API Base URL 通常應填：

```text
http://host.docker.internal:3011
```

## 編輯頁 SEO 面板

在文章、頁面、Portfolio 和商品的新增/編輯頁面，RankWoven SEO 會新增一個 SEO 面板。面板可輸入：

- Focus keyphrase
- SEO title
- Slug
- Meta description
- Content SEO score（只讀）

可用操作：

- `Generate & Apply SEO`：把當前內容、摘要、SEO title 與 Focus keyphrase 一起送到 RankWoven API，生成並套用新的 SEO 建議。
- `Save SEO Fields`：保存手動編輯的 SEO title、Slug、Meta description 和 Keywords，並重新分析當前內容的 SEO 分數。
- WordPress 原生 `Update` / `Publish`：也會保存 RankWoven 面板中的 SEO title、Meta description 和 Keywords，避免刷新後欄位變空。

RankWoven 會把生成結果寫入 WordPress 的自訂欄位，並同步常見 SEO 外掛的 title / meta description 欄位，方便與現有 SEO 流程共存。保存的 Meta description 和 Keywords 會在支援的文章、頁面、Portfolio 和商品前台頁面 `<head>` 輸出，同時會使用 SEO title、描述、特色圖片、圖片 Alt Text、網站名稱和頁面 URL 生成 Google+、Weibo、Twitter Card、LinkedIn / Facebook Open Graph 標籤。內容分數會根據當前標題、Meta description、Slug、正文長度、H1、內部連結與 Focus keyphrase 覆蓋情況即時計算。

`搜尋外觀` 頁籤可為不同內容類型設定預設模板，支援的占位符包括 `{{title}}`、`{{excerpt}}`、`{{focus_keyphrase}}`、`{{site_name}}`、`{{slug}}`、`{{post_type}}` 和 `{{post_type_label}}`；早期單括號格式也會兼容。單篇文章若已保存自訂 SEO 欄位，仍會優先使用單篇值。

`網站地圖` 頁籤會動態輸出 `sitemap.xml`，包含已發佈的文章、頁面、Portfolio 和商品，並在 `robots.txt` 動態補上 `Sitemap:` 行。`Submit to Google` 會透過 SaaS 後端的 Google Search Console API 將 `sitemap.xml` 提交給 Google。

Twitter/X Username 與 Facebook App ID 可在 `Settings -> RankWoven SEO` 保存；留空時不輸出 `@username` 或 `APP ID` 這類 placeholder。需要由主題或自訂代碼覆寫時，也可使用 `rankwoven_seo_twitter_username` 和 `rankwoven_seo_facebook_app_id` filter 返回正式值。

## 圖片屬性設定

後台頁籤：

```text
Settings -> RankWoven SEO -> Image Attributes
```

可設定項：

- 為新上傳圖片自動設定圖片標題。
- 為新上傳圖片自動設定 Alt Text。
- 為新上傳圖片自動設定媒體說明文字，也就是 Caption。
- 為新上傳圖片自動設定內容說明，也就是 Description。
- 從檔案名中移除連字號、底線、句號、逗號或數字。
- 在前台內容輸出時，為缺少 `title` 屬性的圖片標籤補上圖片標題。

範例：

```text
a-lot_like_love.jpg -> A Lot Like Love
```

## 圖片批量更新工具

後台頁籤：

```text
Settings -> RankWoven SEO -> Bulk Updater
```

可用操作：

- `Test Bulk Updater`：先更新一張圖片，方便管理員檢查結果。
- `Run Bulk Updater`：每次處理下一批既有圖片，預設 50 張，避免大站一次請求超時。
- `Reset Counter`：重新從第一張圖片開始處理。

批量更新會按照目前 `Image Attributes` 的設定，更新既有圖片的標題、Alt Text、Caption 和 Description。正式執行前應先備份 WordPress 資料庫。

## 只讀診斷頁

後台頁籤：

```text
Settings -> RankWoven SEO -> Diagnostics
```

診斷頁只讀展示：

- API Base URL。
- API `/health` 是否可連通。
- Site ID 是否已配置。
- Site Token 是否已在本地配置。
- GA4 Property ID 是否已配置。
- Token 最近一次本地成功使用時間。
- 最近一次同步時間、文章數、媒體數和同步模式。
- 圖片屬性設定中已啟用的欄位。
- WordPress 管理員 Application Password 是否已配置。
- 最近一次插件操作錯誤原因。

診斷頁不顯示完整 Site Token，也不顯示 Application Password 明文。

## SaaS API 對接

插件向 SaaS 後端發起請求：

| Method | URL | 用途 |
|---|---|---|
| `POST` | `/api/v1/site-connections` | 建立站點連接並取得 `siteId` 和 `apiToken` |
| `PUT` | `/api/v1/site-connections/:siteId/analytics-settings` | 更新此站點 GA4 Property ID |
| `PUT` | `/api/v1/site-connections/:siteId/wordpress-credentials` | 更新 WordPress 管理員用戶名和 Application Password |
| `POST` | `/api/v1/site-connections/:siteId/editor-seo` | 依據當前內容和 Focus keyphrase 生成 SEO title、Slug 和 Meta description |
| `POST` | `/api/v1/site-connections/:siteId/search-console/sitemaps` | 將 WordPress 的 `sitemap.xml` 提交到 Google Search Console |
| `POST` | `/api/v1/site-connections/:siteId/sync-tasks` | 建立同步任務，可帶 `updatedAfter` |
| `POST` | `/api/v1/site-connections/:siteId/sync-tasks/:syncTaskId/batches` | 分頁推送文章與媒體同步批次 |
| `POST` | `/api/v1/site-connections/:siteId/sync` | 舊版單次同步兼容接口 |

同步請求使用：

```text
Authorization: Bearer <Site Token>
Content-Type: application/json
```

手動同步會先在 SaaS 後端建立同步任務，再以每頁 100 筆分頁讀取 WordPress Posts、Pages、Portfolio、Products 和圖片媒體，逐批推送到同步任務。插件會使用上一次成功同步的 `syncStartedAt` 作為下一次同步的 `updatedAfter`，首次同步沒有記錄時自動全量同步。最後一批完成後，後端會累計任務批次、文章數和媒體數，並更新站點最近同步統計。

GA4 Property ID 由客戶在 WordPress 插件後台錄入並同步到 SaaS。RankWoven 平台仍需要配置 Google 服務帳號憑據，且該服務帳號必須被加入客戶 GA4 Property 的可讀權限，否則客戶後台分析頁會返回示範數據。

## 站點側 REST API

插件同時預留站點側 REST API，供後續 SaaS Worker 拉取分頁資料或診斷連接狀態。

| Method | URL | 用途 |
|---|---|---|
| `GET` | `/wp-json/rankwoven/v1/site` | 獲取站點基礎資訊 |
| `GET` | `/wp-json/rankwoven/v1/posts?page=1&perPage=100&updatedAfter=2026-07-26T00:00:00Z` | 分頁讀取 Posts、Pages、Portfolio 和 Products，可按修改時間增量過濾 |
| `GET` | `/wp-json/rankwoven/v1/posts/:id` | 讀取單篇 Post、Page、Portfolio 或 Product |
| `POST` | `/wp-json/rankwoven/v1/posts/:id/apply` | 使用 WordPress Application Password 身份寫回已批准文章建議 |
| `GET` | `/wp-json/rankwoven/v1/media?page=1&perPage=100&updatedAfter=2026-07-26T00:00:00Z` | 分頁讀取圖片媒體，可按修改時間增量過濾 |
| `GET` | `/wp-json/rankwoven/v1/media/:id` | 讀取單個圖片媒體 |
| `POST` | `/wp-json/rankwoven/v1/media/:id/apply` | 使用 WordPress Application Password 身份寫回已批准媒體建議 |

站點側讀取 REST API 可使用 Bearer Token，Token 與插件保存的 `Site Token` 一致。寫回 REST API 只接受 WordPress 已認證且有目標內容編輯權限的用戶，SaaS Worker 會使用後台保存的管理員用戶名和 Application Password，以便修改在 WordPress 端留下對應管理員身份記錄。

## 同步欄位

文章同步欄位，`type` 支援 `post`、`page`、`portfolio` 和 `product`：

- `cmsId`
- `type`
- `title`
- `slug`
- `status`
- `url`
- `excerpt`
- `metaDescription`
- `contentHtml`
- `author`
- `categories`
- `tags`
- `featuredImageId`
- `publishedAt`
- `updatedAt`

`categories` 和 `tags` 會按內容類型讀取公開 taxonomy，例如文章分類 / 標籤、商品分類 / 標籤與 Portfolio 自訂分類，供 SaaS 內部連結推薦計算相關性。

`metaDescription` 會優先讀取 Yoast `_yoast_wpseo_metadesc`、Rank Math `rank_math_description`、AIOSEO `_aioseo_description` / `_aioseop_description`，沒有 SEO 插件欄位時回退 WordPress 摘要。

媒體同步欄位：

- `cmsId`
- `title`
- `url`
- `mimeType`
- `fileName`
- `caption`
- `description`
- `altText`
- `attachedToCmsId`
- `updatedAt`

## 限制

- 不保存 SaaS 主帳號密碼。
- 不保存 WordPress 主登入密碼，只錄入用戶自行建立的 Application Password。
- 不直接無審核批量發布內容。
- 不提交任何 `.env` 或真實 API Key。
- MVP 先使用插件端手動觸發同步任務，由插件分頁推送批次；圖片屬性批量更新每次最多處理 50 張既有圖片。
- 站點連接、Token Hash、同步資料和加密後 WordPress Application Password 已由 API 保存到 PostgreSQL；未配置資料庫時仍可使用內存 Repository 測試。
