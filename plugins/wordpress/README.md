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
- 一鍵建立站點連接，調用 SaaS API 的 `POST /api/v1/site-connections`。
- 一鍵同步 Posts、Pages 和圖片媒體，調用 SaaS API 的 `POST /api/v1/site-connections/:siteId/sync`。
- 顯示最近一次同步時間、文章數和媒體數。

如果 WordPress 跑在 Docker Desktop 容器中，而 API 跑在宿主機端口 `3011`，API Base URL 通常應填：

```text
http://host.docker.internal:3011
```

## SaaS API 對接

插件向 SaaS 後端發起請求：

| Method | URL | 用途 |
|---|---|---|
| `POST` | `/api/v1/site-connections` | 建立站點連接並取得 `siteId` 和 `apiToken` |
| `POST` | `/api/v1/site-connections/:siteId/sync` | 推送文章與媒體同步資料 |

同步請求使用：

```text
Authorization: Bearer <Site Token>
Content-Type: application/json
```

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
- 不直接無審核批量發布內容。
- 不提交任何 `.env` 或真實 API Key。
- MVP 先使用手動同步，每次最多推送 100 篇文章和 100 個圖片媒體。
- 站點連接資料目前由 API 內存 Repository 保存，後續需落到 PostgreSQL。
