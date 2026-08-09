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

啟用後可在 WordPress 後台進入：

```text
Settings -> RankWoven SEO
```

當前後台支援：

- 設定 RankWoven API Base URL，例如 `http://localhost:3011` 或 `https://api.rankwoven.com`。
- 手動保存 `Site ID` 和 `Site Token`。
- 輸入此 WordPress 站點的 GA4 Property ID，讓 SaaS 分析頁按站點讀取 SEO 流量資料。
- 保存 WordPress 管理員用戶名和 Application Password，供 SaaS 後續以該管理員身份寫回已批准修改。
- 設定圖片屬性自動生成規則，使用檔案名為新上傳圖片生成標題、Alt Text、媒體說明文字和內容說明。
- 執行圖片屬性批量更新工具，先測試一張圖片，再分批更新既有圖片媒體。
- 查看只讀診斷頁，檢查 API 連接、Token、本地同步、圖片屬性和 Application Password 配置狀態。
- 一鍵建立站點連接，調用 SaaS API 的 `POST /api/v1/site-connections`。
- 一鍵建立後端同步任務，分頁批量同步文章、頁面、Portfolio、商品和圖片媒體。
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
| `POST` | `/api/v1/site-connections/:siteId/sync-tasks` | 建立同步任務，可帶 `updatedAfter` |
| `POST` | `/api/v1/site-connections/:siteId/sync-tasks/:syncTaskId/batches` | 分頁推送文章與媒體同步批次 |
| `POST` | `/api/v1/site-connections/:siteId/sync` | 舊版單次同步兼容接口 |

同步請求使用：

```text
Authorization: Bearer <Site Token>
Content-Type: application/json
```

手動同步會先在 SaaS 後端建立同步任務，再以每頁 100 筆分頁讀取 WordPress Posts、Pages 和圖片媒體，逐批推送到同步任務。插件會使用上一次成功同步的 `syncStartedAt` 作為下一次同步的 `updatedAfter`，首次同步沒有記錄時自動全量同步。最後一批完成後，後端會累計任務批次、文章數和媒體數，並更新站點最近同步統計。

若站點存在公開的 `portfolio` 或 WooCommerce `product` post type，插件會一併同步這些內容。SaaS 後台的內部連結頁會根據已同步的文章、頁面、Portfolio 與商品內容生成內部連結建議；用戶可多選建議後批量批准並套用，Worker 會通過 Application Password 將連結段落寫回來源內容的 `contentHtml`。建議寫回仍保留審核與快照流程，不會在未批准時自動修改 WordPress 內容。

GA4 Property ID 由客戶在 WordPress 插件後台錄入並同步到 SaaS。RankWoven 平台仍需要配置 Google 服務帳號憑據，且該服務帳號必須被加入客戶 GA4 Property 的可讀權限，否則客戶後台分析頁會返回示範數據。

## 站點側 REST API

插件同時預留站點側 REST API，供後續 SaaS Worker 拉取分頁資料或診斷連接狀態。

| Method | URL | 用途 |
|---|---|---|
| `GET` | `/wp-json/rankwoven/v1/site` | 獲取站點基礎資訊 |
| `GET` | `/wp-json/rankwoven/v1/posts?page=1&perPage=100&updatedAfter=2026-07-26T00:00:00Z` | 分頁讀取文章、頁面、Portfolio 和商品，可按修改時間增量過濾 |
| `GET` | `/wp-json/rankwoven/v1/posts/:id` | 讀取單篇文章、頁面、Portfolio 或商品 |
| `POST` | `/wp-json/rankwoven/v1/posts/:id/apply` | 使用 WordPress Application Password 身份寫回已批准內容建議 |
| `GET` | `/wp-json/rankwoven/v1/media?page=1&perPage=100&updatedAfter=2026-07-26T00:00:00Z` | 分頁讀取圖片媒體，可按修改時間增量過濾 |
| `GET` | `/wp-json/rankwoven/v1/media/:id` | 讀取單個圖片媒體 |
| `POST` | `/wp-json/rankwoven/v1/media/:id/apply` | 使用 WordPress Application Password 身份寫回已批准媒體建議 |

站點側讀取 REST API 可使用 Bearer Token，Token 與插件保存的 `Site Token` 一致。寫回 REST API 只接受 WordPress 已認證且有目標內容編輯權限的用戶，SaaS Worker 會使用後台保存的管理員用戶名和 Application Password，以便修改在 WordPress 端留下對應管理員身份記錄。

## 同步欄位

文章同步欄位：

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

`type` 會保存為 `post`、`page`、`portfolio` 或 `product`。未知或站點未啟用的 post type 不會被同步。

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
- MVP 先使用插件端手動觸發同步任務，由插件分頁推送批次；圖片屬性批量更新每次最多處理 50 張既有圖片；內部連結套用前必須由用戶在 SaaS 後台多選並批准。
- 站點連接、Token Hash、同步資料和加密後 WordPress Application Password 已由 API 保存到 PostgreSQL；未配置資料庫時仍可使用內存 Repository 測試。
