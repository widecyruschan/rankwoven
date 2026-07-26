# WordPress 插件

此目錄包含 MVP 第一版 WordPress 插件骨架：`rankwoven-seo`。

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
- 保存 WordPress 管理員用戶名和 Application Password，供 SaaS 後續以該管理員身份寫回已批准修改。
- 設定圖片屬性自動生成規則，使用檔案名為新上傳圖片生成標題、Alt Text、媒體說明文字和內容說明。
- 執行圖片屬性批量更新工具，先測試一張圖片，再分批更新既有圖片媒體。
- 一鍵建立站點連接，調用 SaaS API 的 `POST /api/v1/site-connections`。
- 一鍵分頁同步 Posts、Pages 和圖片媒體，調用 SaaS API 的 `POST /api/v1/site-connections/:siteId/sync`。
- 顯示最近一次同步時間、文章數、媒體數、同步頁數和是否達到同步上限。
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

## SaaS API 對接

插件向 SaaS 後端發起請求：

| Method | URL | 用途 |
|---|---|---|
| `POST` | `/api/v1/site-connections` | 建立站點連接並取得 `siteId` 和 `apiToken` |
| `PUT` | `/api/v1/site-connections/:siteId/wordpress-credentials` | 更新 WordPress 管理員用戶名和 Application Password |
| `POST` | `/api/v1/site-connections/:siteId/sync` | 推送文章與媒體同步資料 |

同步請求使用：

```text
Authorization: Bearer <Site Token>
Content-Type: application/json
```

手動同步會以每頁 100 筆分頁讀取 WordPress Posts、Pages 和圖片媒體，不再只推送第一頁資料。為符合目前 SaaS API 單次 payload 驗證上限，單次手動同步最多推送 1,000 篇文章和 2,000 個圖片媒體；若站點內容量超過此上限，插件會在最近同步結果中顯示已達同步上限。後續增量同步和任務隊列完成後，會再拆分為多批同步。

## 站點側 REST API

插件同時預留站點側 REST API，供後續 SaaS Worker 拉取分頁資料或診斷連接狀態。

| Method | URL | 用途 |
|---|---|---|
| `GET` | `/wp-json/rankwoven/v1/site` | 獲取站點基礎資訊 |
| `GET` | `/wp-json/rankwoven/v1/posts?page=1&perPage=100` | 分頁讀取 Posts 和 Pages |
| `GET` | `/wp-json/rankwoven/v1/media?page=1&perPage=100` | 分頁讀取圖片媒體 |

站點側 REST API 也需要 Bearer Token，Token 與插件保存的 `Site Token` 一致。

## 同步欄位

文章同步欄位：

- `cmsId`
- `type`
- `title`
- `slug`
- `status`
- `url`
- `excerpt`
- `contentHtml`
- `author`
- `categories`
- `tags`
- `featuredImageId`
- `publishedAt`
- `updatedAt`

媒體同步欄位：

- `cmsId`
- `title`
- `url`
- `mimeType`
- `fileName`
- `altText`
- `attachedToCmsId`
- `updatedAt`

## 限制

- 不保存 SaaS 主帳號密碼。
- 不保存 WordPress 主登入密碼，只錄入用戶自行建立的 Application Password。
- 不直接無審核批量發布內容。
- 不提交任何 `.env` 或真實 API Key。
- MVP 先使用手動同步，會分頁推送最多 1,000 篇文章和 2,000 個圖片媒體；圖片屬性批量更新每次最多處理 50 張既有圖片。
- 站點連接、Token Hash、同步資料和加密後 WordPress Application Password 已由 API 保存到 PostgreSQL；未配置資料庫時仍可使用內存 Repository 測試。
