# AIEO

AIEO 是 RankWoven 的 AI SEO 自動優化平台工程倉庫。RankWoven 主域名為 `rankwoven.com`，目標是通過 SaaS 雲端後台和網站插件連接客戶站點，幫助用戶對現有文章、圖片、標題、Meta 資訊和內部連結進行可審核、可回滾的 SEO 優化。

## 專案介紹

本專案當前處於產品需求和開發規劃階段。第一階段建議聚焦：

- SaaS 雲端管理平台
- WordPress 後台插件
- SEO 分析、內容生成、圖片優化和內部連結推薦 API
- 統一 CMS 適配器層，為後續 Joomla、OpenCart 等常用系統擴展預留介面

核心目標不是批量製造低價值文章，而是幫助網站管理者更安全地提升內容品質、搜尋可見性和站內連結結構。

## 品牌與域名

- 主品牌：RankWoven
- 主域名：`rankwoven.com`
- 域名狀態：已購買
- 中文品牌方向：排名織引
- Hostinger 網站狀態：已創建

## 技術棧建議

- 前端：Vue 3、TypeScript、Vite、Vue Router、Pinia、Tailwind CSS、Element Plus
- 後端：Node.js、TypeScript、NestJS 或 Fastify
- 資料庫：PostgreSQL
- 緩存與隊列：Redis、BullMQ
- 對象存儲：S3 兼容存儲
- 搜尋與內容索引：PostgreSQL pgvector 或 OpenSearch
- AI 能力：大語言模型 API、圖片生成 API、Embedding API
- 插件端：WordPress PHP 插件、Joomla Extension、OpenCart Extension、REST API、Application Passwords、API Token 或 OAuth
- 監控：OpenTelemetry、Sentry、結構化日誌

## 功能模塊

- 網站接入與授權
- 文章同步與內容庫存
- SEO 審計
- 標題和 Meta Description 優化
- 文章生成與改寫
- 圖片生成、壓縮、命名和 Alt Text 優化
- 內部連結推薦與插入
- 人工審核、差異對比與回滾
- 任務隊列與批量執行
- Search Console 資料接入
- 用量、套餐和帳單
- 團隊與客戶站點管理
- Joomla、OpenCart 等 CMS 擴展接入

## 目錄結構

```text
.
├── apps/
│   ├── api/
│   ├── web/
│   └── worker/
├── packages/
│   ├── ai-providers/
│   └── cms-adapters/
├── plugins/
│   ├── joomla/
│   ├── opencart/
│   └── wordpress/
├── README.md
├── docs/
│   ├── brand-guidelines.md
│   ├── domain-setup.md
│   ├── saas-dashboard-prototype.md
│   └── seo-ai-platform-prd.md
├── docker-compose.yml
├── Dockerfile
├── package.json
└── tsconfig.base.json
```

## 啟動方式

本地安裝依賴：

```bash
npm install
```

本地開發啟動：

```bash
npm run dev
```

Docker Desktop 啟動：

```bash
npm run docker:up
```

啟動後可訪問：

- Web：<http://localhost:5173>
- API Health：<http://localhost:3011/health>

如需同時啟動 PostgreSQL 和 Redis，可使用：

```bash
docker compose --profile data up -d --build
```

## 建置方式

執行完整建置：

```bash
npm run build
```

執行 Lint：

```bash
npm run lint
```

執行測試：

```bash
npm run test
```

執行 high 以上依賴安全掃描：

```bash
npm run security:audit
```

後續擴展 Joomla、OpenCart 時，建議將各 CMS 插件作為獨立構建單元，並共用 SaaS API 的站點連接、文章同步、審計、建議、任務和回滾流程。

## 環境變量說明

已提供 `.env.example`。目前至少包含：

```text
NODE_ENV=development
APP_BASE_URL=http://localhost:5173
API_BASE_URL=http://localhost:3011
PUBLIC_SITE_URL=https://rankwoven.com
APP_DASHBOARD_URL=https://app.rankwoven.com
PUBLIC_ASSETS_URL=https://assets.rankwoven.com
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
WORDPRESS_CREDENTIAL_ENCRYPTION_KEY=
AI_TEXT_PROVIDER=wenwen
AI_FALLBACK_TEXT_PROVIDER=wenwen
AI_EMBEDDING_PROVIDER=wenwen
AI_IMAGE_PROVIDER=wenwen
AI_IMAGE_FALLBACK_PROVIDER=wenwen
MEDIA_STORAGE_PROVIDER=qiniu-kodo
IMAGE_OPTIMIZATION_PROVIDER=cloudinary
WENWEN_API_BASE_URL=https://breakout.wenwen-ai.com
WENWEN_API_KEY=
WENWEN_TEXT_MODEL=gpt-4.1-mini
WENWEN_EMBEDDING_MODEL=text-embedding-3-small
WENWEN_IMAGE_MODEL=gemini-2.5-flash-image
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
QINIU_ACCESS_KEY=
QINIU_SECRET_KEY=
QINIU_BUCKET=
QINIU_REGION=
QINIU_PUBLIC_DOMAIN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
MAIL_FROM_NAME=RankWoven
MAIL_FROM_ADDRESS=no-reply@rankwoven.com
SUPPORT_EMAIL=support@rankwoven.com
```

敏感資訊必須放在環境變量或密鑰管理系統中，不得提交 `.env`。

## 路由說明

當前前端原型已拆分為前台展示頁、客戶後台和管理後台三層：

- `/`：前台功能簡介首頁
- `/pricing`：定價頁
- `/login`：用戶登入頁原型
- `/app`：客戶後台站點概覽
- `/app/sites`：客戶後台站點管理
- `/app/articles`：客戶後台文章審計
- `/app/article-sync`：客戶後台文章同步
- `/app/suggestions`：客戶後台處理建議
- `/app/media`：客戶後台媒體處理，包含圖片標題、圖片 Meta、Alt Text 與檔案名稱建議
- `/app/apply`：客戶後台一鍵套用建議
- `/app/article-suggestions`：客戶後台單篇文章修改建議
- `/app/review`：客戶後台內容審核
- `/app/links`：客戶後台內部連結
- `/app/tasks`：客戶後台任務隊列
- `/app/cms-adapters`：客戶後台 CMS 適配器
- `/app/settings`：客戶後台設定
- `/admin`：管理後台平台概覽
- `/admin/customers`：管理後台客戶管理
- `/admin/usage`：管理後台用量與成本
- `/admin/operations`：管理後台運營中心
- `/admin/settings`：管理後台設定

## 狀態管理說明

當前已建立 Pinia，部分客戶後台頁面已開始直接接入 API；後續資料共享增加後再拆分 Store。建議拆分：

- `useAuthStore`：登入狀態和用戶資料
- `useSiteStore`：當前站點、站點列表
- `useTaskStore`：任務隊列和進度
- `useUsageStore`：套餐用量

## API 使用說明

目前已建立 API 服務骨架：

- `GET /health`：服務健康檢查。
- `GET /api/v1/cms-adapters`：查看 CMS 適配器狀態。
- `GET /api/v1/ai-providers`：查看當前 AI、Embedding、圖片、媒體存儲與圖片優化 Provider 配置。
- `POST /api/v1/site-connections`：建立 WordPress、Joomla 或 OpenCart 站點連接，MVP 先由 WordPress 插件使用。
- `GET /api/v1/site-connections`：查看已連接站點列表，不返回完整 Token。
- `GET /api/v1/site-connections/:siteId`：查看單個站點連接詳情。
- `PUT /api/v1/site-connections/:siteId/wordpress-credentials`：保存 WordPress 管理員用戶名和應用程式密碼，用於後續以該管理員身份調用 WordPress REST API 寫回已批准修改。
- `POST /api/v1/site-connections/:siteId/token/regenerate`：重新生成站點 API Token，只在回應中返回一次完整 Token，舊 Token 立即失效。
- `POST /api/v1/site-connections/:siteId/token/revoke`：吊銷站點 API Token，站點狀態改為 `revoked`，插件同步接口不再接受該站點 Token。
- `POST /api/v1/site-connections/:siteId/sync`：兼容舊版插件的單次同步接口，由插件帶 Bearer Token 推送文章與媒體同步資料。
- `POST /api/v1/site-connections/:siteId/sync-tasks`：建立同步任務，可帶 `updatedAfter` 進行增量同步。
- `GET /api/v1/sync-tasks`：查看最近同步任務列表，包含任務範圍、目標 CMS ID、批次數、文章數和媒體數。
- `GET /api/v1/site-connections/:siteId/sync-tasks`：查看單個站點的同步任務列表與批次進度。
- `POST /api/v1/site-connections/:siteId/manual-refresh`：為單篇文章或單個媒體建立手動刷新任務，請求體為 `{ "type": "article" | "media", "cmsId": "123" }`。
- `POST /api/v1/site-connections/:siteId/sync-tasks/:syncTaskId/batches`：接收插件分頁推送的同步批次，最後一批完成後更新站點最近同步統計。
- `GET /api/v1/site-connections/:siteId/articles`：帶 Bearer Token 查看已同步文章列表。

站點連接、Token Hash、Token Preview、Token 狀態、Token 最近使用時間、WordPress 管理員應用程式密碼加密密文、同步任務、任務範圍、目標 CMS ID、文章同步資料、媒體同步資料和同步批次記錄已落到 PostgreSQL。若未配置 `DATABASE_URL`，API 仍可使用內存 Repository 進行單元測試；Docker Desktop 開發環境使用 `docker compose --profile data up -d postgres` 啟動 PostgreSQL。客戶後台 `/app/sites` 已使用 `GET /api/v1/site-connections` 顯示站點列表；`/app/article-sync` 已接入站點同步狀態、手動刷新任務建立、任務列表和 batch 進度。

`WORDPRESS_CREDENTIAL_ENCRYPTION_KEY` 用於加密保存 WordPress Application Password。開發環境可使用 `.env.example` 的占位值，正式環境必須改為獨立強隨機密鑰；API 列表和詳情接口只返回是否已配置與管理員用戶名，不返回應用程式密碼明文。

詳細產品 API 規劃詳見 [AI SEO 自動優化平台開發需求文件](docs/seo-ai-platform-prd.md) 的 API 設計章節。

## AI Provider 使用說明

目前已新增 `@aieo/ai-providers` 共享包，先提供最小 Provider Adapter 介面、Noop Provider Registry、用量成本估算、AI 用量記錄和內存 Repository。MVP 的 OpenAI、Google Gemini、DeepSeek 等模型統一通過問問 API 代理接入；圖片存儲使用七牛雲 Kodo。真實請求 Adapter 尚未接入，後續應在此介面下逐步增加具體 Adapter。

## 元件使用說明

當前尚未實現前端組件。建議優先沉澱：

- `SiteSwitcher`
- `SeoScoreBadge`
- `ArticleAuditTable`
- `OptimizationDiffViewer`
- `TaskProgressDrawer`
- `KeywordInputPanel`
- `InternalLinkSuggestionList`

## 開發規範

- 使用 Vue 3、Composition API、`<script setup lang="ts">`
- Props、Emit、API Response 和 Store State 必須定義 TypeScript 類型
- API 請求集中放在 `src/api/`
- 路由集中放在 `src/router/index.ts`
- 狀態管理集中放在 `src/stores/`
- 後端按 Controller、Service、Repository、Model、Middleware 分層
- 所有外部輸入必須驗證
- 所有批量修改必須支援預覽、審批、日誌和回滾
- CMS 相關邏輯必須通過適配器層接入，不把 WordPress、Joomla、OpenCart 的特殊邏輯散落在業務服務中
- 不承諾搜尋排名結果，只承諾流程、品質檢查和可觀測指標
- 每次完成開發、測試、部署或文件更新後，必須在相關文件末尾追加本次會話總結，並提供「下一步行動清單」。
- 「下一步行動清單」必須使用可執行、可驗證的短句，例如「建立 PostgreSQL migration」而不是「完善後端」。

## 後續優化建議

- 先完成 MVP 需求評審，再初始化程式碼倉庫
- 先做 WordPress 插件，穩定後按適配器層擴展 Joomla、OpenCart 等常用系統
- 優先實現“審核後應用”，不要第一版預設全自動改站
- 儘早接入 Google Search Console，建立優化前後的成效追蹤
- 將內容品質、重複內容、過度關鍵詞和連結濫用檢查作為產品底線

## 文件

- [AI SEO 自動優化平台開發需求文件](docs/seo-ai-platform-prd.md)
- [RankWoven 域名與 DNS 接入方案](docs/domain-setup.md)
- [RankWoven 品牌與基礎 UI 視覺規範](docs/brand-guidelines.md)
- [RankWoven SaaS 後台核心頁面原型](docs/saas-dashboard-prototype.md)
- [RankWoven 生產部署流程](docs/deployment.md)

## 會話總結記錄

### 2026-07-25：AI SEO 自動優化網站需求規劃

- 會話的主要目的：為自動 SEO 優化網站推薦易記域名，並編寫開發需求文件和詳細開發步驟。
- 完成的主要任務：檢查專案根目錄，確認當前為空專案；讀取用戶提供的域名候選附件；通過 RDAP 對候選域名做快速可用性篩查；創建專案 README；創建 PRD 文件。
- 關鍵決策和解決方案：第一階段按“SaaS 雲端平台 + WordPress 插件 + SEO API”規劃；自動優化預設走人工審核、差異對比和回滾；避免把產品定位成批量低品質內容生成器。
- 使用的技術棧：Vue 3、TypeScript、Vite、Pinia、Tailwind CSS、Element Plus、Node.js、PostgreSQL、Redis、WordPress REST API。
- 新增或修改文件：新增 `README.md`；新增 `docs/seo-ai-platform-prd.md`。
- 後續建議：確認品牌域名後進行商標檢索；確認 MVP 範圍後初始化前端、後端和插件程式碼工程。

### 2026-07-25：文件繁體化與 CMS 擴展規劃

- 會話的主要目的：按要求將專案文件改為繁體中文，並補充 Joomla、OpenCart 等常用系統的後續擴展規劃。
- 完成的主要任務：將 `README.md` 和 `docs/seo-ai-platform-prd.md` 轉為繁體中文；新增統一 CMS 適配器層思路；補充 Joomla Extension、OpenCart Extension 和後續擴展里程碑。
- 關鍵決策和解決方案：MVP 仍先做 WordPress，以降低首版複雜度；後續通過 CMS Adapter Interface 擴展 Joomla、OpenCart，不將各系統差異寫死在核心業務流程中。
- 使用的技術棧：Vue 3、TypeScript、Node.js、WordPress REST API、Joomla Web Services API、OpenCart API/Extension。
- 新增或修改文件：修改 `README.md`；修改 `docs/seo-ai-platform-prd.md`。
- 後續建議：開工前定義 `CmsAdapter` 介面，並為 WordPress 先做一個參考實現。

### 2026-07-25：建立 Git 倉庫並提交

- 會話的主要目的：建立本地 Git 倉庫，並將現有專案文件提交到 Git。
- 完成的主要任務：初始化 Git 倉庫；將預設分支設為 `main`；新增 `.gitignore` 忽略 `.DS_Store`、依賴目錄、構建目錄和本地環境變數文件；準備初始提交。
- 關鍵決策和解決方案：只提交 `.gitignore`、`README.md` 和 `docs/seo-ai-platform-prd.md`，避免提交 macOS 系統文件與敏感環境配置。
- 使用的技術棧：Git、Markdown。
- 新增或修改文件：新增 `.gitignore`；修改 `README.md`。
- 後續建議：如需遠端備份，可建立 GitHub、GitLab 或私有 Git 遠端倉庫後再設定 `origin` 並推送。

### 2026-07-25：第 1 階段專案初始化與 Docker Desktop 掛載

- 會話的主要目的：執行第 1 階段專案初始化，並將 Web、API、Worker 掛載到 Docker Desktop。
- 完成的主要任務：初始化 npm workspaces；建立 Vue 3 Web、Fastify API、Worker、`packages/cms-adapters`、WordPress/Joomla/OpenCart 插件目錄；配置 ESLint、Prettier、TypeScript、Vitest、Dockerfile、Docker Compose 和 `.env.example`。
- 關鍵決策和解決方案：MVP 先提供 WordPress 適配器參考實現；Joomla、OpenCart 先保留目錄與約束；PostgreSQL 和 Redis 放入 Docker Compose `data` profile，避免首次啟動被外部鏡像拉取阻塞；API 宿主機端口使用 `3011` 避免與既有 Docker 服務衝突。
- 使用的技術棧：Vue 3、Vite、Pinia、Vue Router、Element Plus、Fastify、TypeScript、Vitest、Docker Compose。
- 新增或修改文件：新增 `package.json`、`package-lock.json`、`tsconfig.base.json`、`eslint.config.js`、`prettier.config.js`、`.dockerignore`、`.env.example`、`Dockerfile`、`docker-compose.yml`、`apps/`、`packages/`、`plugins/`；修改 `.gitignore` 和 `README.md`。
- 後續建議：第 2 階段開始實作帳號、工作區與 WordPress 站點連接 Token，並在需要資料庫時啟用 `docker compose --profile data up -d --build`。

### 2026-07-25：補充 SaaS 前台設計參考

- 會話的主要目的：將 SaaS 網站前端參考方向寫入開發文件，參考 AITDK 的功能與設計排版。
- 完成的主要任務：查看 AITDK 的工具型首頁和功能入口；在 PRD 中新增 SaaS 前台與工具頁參考、前台路由建議、生成器頁面互動要求。
- 關鍵決策和解決方案：只參考資訊架構和工具型排版，不照抄對方品牌、文案、圖片、配色和細節；前台首屏必須提供可操作輸入或明確產品入口，避免做純展示 landing page。
- 使用的技術棧：Vue 3、Vite、Vue Router、Markdown。
- 新增或修改文件：修改 `docs/seo-ai-platform-prd.md`、`README.md` 和 `.env.example`。
- 後續建議：下一步可根據新增前台路由，實作首頁、工具集合頁、Pricing 和 Extension 介紹頁。

### 2026-07-25：新增前端 i18n 多語言要求

- 會話的主要目的：補充前端必須使用 i18n 製作多語言版本，並參考語言下拉選單形式。
- 完成的主要任務：在 PRD 新增多語言與 i18n 要求；在 Vue 前端接入 `vue-i18n`；新增語言切換器骨架；加入 English、Deutsch、Français、Italiano、中文、繁體中文、日本語、한국어、Português、Español、Русский 語言列表。
- 關鍵決策和解決方案：顯示文案不得寫死在模板中；MVP 先以 `zh-Hant` 為預設、`en` 為 fallback；正式 SEO 前台再支援語言路徑和 `hreflang`。
- 使用的技術棧：Vue 3、Vue I18n、Lucide Vue、TypeScript。
- 新增或修改文件：新增 `apps/web/src/i18n.ts`、`apps/web/src/components/LanguageSwitcher.vue`；修改 Web 入口、頁面和樣式；修改 `docs/seo-ai-platform-prd.md` 和 `README.md`。
- 後續建議：下一步把所有新前台工具頁文案放入 i18n key，並補齊各語言翻譯檔。

### 2026-07-25：AI 與圖片服務商推薦

- 會話的主要目的：為 AIEO 平台推薦 MVP 和後續階段需要接入的 AI 服務商、圖片生成服務商、圖片存儲與優化服務商。
- 完成的主要任務：補充 PRD 的 AI 與圖片服務商建議章節；明確 MVP 首選 OpenAI、Google 圖片生成、Cloudflare R2 和 Cloudinary 的組合；列出 Anthropic、Gemini、DeepSeek、Adobe Firefly、Replicate、Stability AI、OpenRouter 的適用階段。
- 關鍵決策和解決方案：業務邏輯不直接綁定單一供應商，後端需建立 `TextGenerationProvider`、`EmbeddingProvider`、`ImageGenerationProvider`、`MediaStorageProvider` 和 `ImageOptimizationProvider` 適配器；MVP 先保持一主一備，後續再做模型路由。
- 使用的技術棧：OpenAI API、Anthropic Claude API、Google Gemini API、DeepSeek API、Adobe Firefly Services、Cloudflare R2、Cloudinary。
- 新增或修改文件：修改 `docs/seo-ai-platform-prd.md`；修改 `README.md`。
- 後續建議：下一步在後端建立 AI Provider Adapter 的最小接口、成本記錄模型和任務調用日誌。

### 2026-07-25：後端 Provider Adapter 最小接口

- 會話的主要目的：進入後端 Provider Adapter 最小接口和成本記錄模型開發。
- 完成的主要任務：新增 `@aieo/ai-providers` 共享包；建立文字生成、Embedding、圖片生成、媒體存儲和圖片優化 Provider 介面；建立 AI 用量成本估算、用量記錄、內存 Repository 和 Noop Provider Registry；在 API 新增 `GET /api/v1/ai-providers`。
- 關鍵決策和解決方案：先定義可復用接口與審計模型，不直接接入真實供應商 SDK；API 和 Worker 共用同一個 Provider 包，後續批量任務可直接復用。
- 使用的技術棧：TypeScript、Fastify、Vitest、npm workspaces。
- 新增或修改文件：新增 `packages/ai-providers/`；修改 `apps/api/src/config.ts`、`apps/api/src/server.ts`、`apps/api/tests/health.test.ts`、`apps/api/package.json`、`apps/worker/package.json`、`package.json`、`package-lock.json`、`README.md`。
- 後續建議：下一步實作 OpenAI Text/Embedding Adapter，並把用量記錄落到 PostgreSQL 資料表。

### 2026-07-25：MVP 改用問問 API 與七牛雲 Kodo

- 會話的主要目的：按 MVP 要求將 OpenAI、Google Gemini、DeepSeek 統一改為通過問問 API 代理接入，並將圖片存儲改為七牛雲 Kodo。
- 完成的主要任務：更新 Provider 枚舉、API 配置、Provider 狀態端點和測試預期；補充問問 API Base URL、模型配置、七牛 Access Key、Bucket、Region 和公開域名環境變量。
- 關鍵決策和解決方案：MVP 默認 `AI_TEXT_PROVIDER`、`AI_EMBEDDING_PROVIDER` 和 `AI_IMAGE_PROVIDER` 均為 `wenwen`；底層模型通過 `WENWEN_TEXT_MODEL`、`WENWEN_EMBEDDING_MODEL`、`WENWEN_IMAGE_MODEL` 控制；圖片原始文件和衍生文件由七牛 Kodo 保存。
- 使用的技術棧：問問 API、OpenAI 兼容 API、七牛雲 Kodo、TypeScript、Fastify、Vitest。
- 新增或修改文件：修改 `packages/ai-providers/src/index.ts`、`packages/ai-providers/tests/usageRecords.test.ts`、`apps/api/src/config.ts`、`apps/api/src/server.ts`、`apps/api/tests/health.test.ts`、`.env.example`、`README.md` 和 `docs/seo-ai-platform-prd.md`。
- 後續建議：下一步實作 `WenwenTextGenerationProvider`、`WenwenEmbeddingProvider`、`WenwenImageGenerationProvider` 和 `QiniuKodoMediaStorageProvider`。

### 2026-07-25：確認 RankWoven 主域名

- 會話的主要目的：記錄 `rankwoven.com` 已購買，並將品牌域名從候選狀態改為定稿狀態。
- 完成的主要任務：在 PRD 中將主品牌定為 RankWoven、主域名定為 `rankwoven.com`；更新 README 的專案介紹和品牌域名說明；調整下一步行動清單。
- 關鍵決策和解決方案：技術倉庫和內部 package 名稱暫時保留 AIEO，對外產品品牌統一使用 RankWoven，避免第一階段做大規模重命名。
- 使用的技術棧：Markdown、Git。
- 新增或修改文件：修改 `docs/seo-ai-platform-prd.md` 和 `README.md`。
- 後續建議：下一步為 `rankwoven.com` 配置 DNS、Web/API 子域名和郵件發信域名。

### 2026-07-25：RankWoven 域名接入準備

- 會話的主要目的：繼續下一步，為 `rankwoven.com` 做 DNS、Web/API 子域名和郵件發信域名接入準備。
- 完成的主要任務：讀取 Hostinger DNS 現狀；新增域名接入方案文件；補充正式域名相關環境變量；修正 Docker Compose 中 API/Worker 啟動前未構建 `@aieo/ai-providers` 的問題。
- 關鍵決策和解決方案：目前 DNS 已有根域名 A 記錄 `2.57.91.91` 和 `www` CNAME；在未確認正式部署 IP、API 入口和郵件服務商前，不直接修改 DNS。
- 使用的技術棧：Hostinger DNS、Docker Compose、Markdown。
- 新增或修改文件：新增 `docs/domain-setup.md`；修改 `.env.example`、`docker-compose.yml` 和 `README.md`。
- 後續建議：確認正式 Web/API 部署目標後，再新增或更新 `api.rankwoven.com`、`app.rankwoven.com`、`assets.rankwoven.com` 和郵件 DNS 記錄。

### 2026-07-25：創建 rankwoven.com Hostinger 網站

- 會話的主要目的：在 Hostinger Hosting 中創建 `rankwoven.com` 網站。
- 完成的主要任務：成功創建 addon website；Hostinger 用戶名為 `u963014207`；網站根目錄為 `/home/u963014207/domains/rankwoven.com/public_html`；關聯訂單為 `52632730`。
- 關鍵決策和解決方案：先創建網站資源，再進行 GitHub 代碼部署和 DNS 子域名配置；暫不修改現有根域名 A 記錄。
- 使用的技術棧：Hostinger Hosting、GitHub、Docker Compose。
- 新增或修改文件：修改 `docs/domain-setup.md` 和 `README.md`。
- 後續建議：將 GitHub 代碼部署到新建網站，確認 Web/API 部署方式後再配置 DNS。

### 2026-07-25：綁定域名到 Hostinger VPS

- 會話的主要目的：刪除 Cloud Startup 上的 `rankwoven.com` 綁定，並將域名綁定到 Hostinger VPS 的 `rankwoven` Docker Compose 專案。
- 完成的主要任務：刪除原 `easyai` VPS 專案；將 `rankwoven.com` DNS 從 Hostinger CDN ALIAS 改為 VPS A 記錄 `72.62.253.72`；將 `www` 設為 CNAME 到根域名；修正 Dockerfile workspace 依賴；將 Web 服務發布到 80 端口；移除部署環境不適用的源碼 volume 掛載。
- 關鍵決策和解決方案：Hostinger Hosting 刪除接口目前未成功接受 `confirm` 字段，暫以 DNS 切走 Cloud Startup；VPS 部署改用 GitHub 倉庫方式繼續推進。
- 使用的技術棧：Hostinger DNS、Hostinger VPS、Docker Compose、GitHub。
- 新增或修改文件：修改 `Dockerfile`、`docker-compose.yml`、`docs/domain-setup.md` 和 `README.md`。
- 後續建議：完成 VPS GitHub Compose 部署後，配置 HTTPS 反向代理與 `api.rankwoven.com`。

### 2026-07-25：處理 Cloud 刪除阻塞與 VPS 端口衝突

- 會話的主要目的：刪除 Cloud Startup 上的 `rankwoven.com`，並將域名綁定到 Hostinger VPS 的 `rankwoven` 專案。
- 完成的主要任務：確認 Hostinger DNS 已指向 VPS `72.62.253.72`；確認 Hostinger Cloud/Hosting 仍存在 `rankwoven.com` addon website；再次調用刪除接口並記錄 `confirm` 字段 schema 阻塞；將 Web 容器臨時端口改為 `8080:5173`，避免 VPS 既有 80 端口佔用導致容器無法啟動。
- 關鍵決策和解決方案：不強行覆蓋 VPS 80 端口，以免破壞未知既有服務；先讓 RankWoven 在 VPS 上以 `http://72.62.253.72:8080` 可訪問，後續再釋放 80/443 或配置 Nginx/Caddy 反向代理。
- 使用的技術棧：Hostinger Hosting、Hostinger DNS、Hostinger VPS、Docker Compose、GitHub。
- 新增或修改文件：修改 `docker-compose.yml`、`docs/domain-setup.md` 和 `README.md`。
- 後續建議：在 Hostinger hPanel 手動刪除 Cloud/Hosting 的 `rankwoven.com` addon website；檢查 VPS 80/443 端口佔用，配置正式 HTTPS 反向代理。

### 2026-07-25：配置 VPS Nginx 反向代理

- 會話的主要目的：將 `rankwoven.com` 域名入口接入 Hostinger VPS 上的 RankWoven Web 容器。
- 完成的主要任務：通過 SSH 確認 VPS 80/443 由 Nginx 佔用；新增 `/etc/nginx/sites-available/rankwoven.com` 並啟用；將 `rankwoven.com` 和 `www.rankwoven.com` 代理到 `127.0.0.1:8080`；確認 API 仍可通過 `http://72.62.253.72:3011/health` 訪問。
- 關鍵決策和解決方案：保留 Nginx 作為正式入口，不讓 Docker 直接佔用 80/443；Web 仍跑在容器端口映射 `8080:5173`，由 Nginx 負責域名轉發。
- 使用的技術棧：Nginx、Hostinger VPS、Docker Compose、Vite。
- 新增或修改文件：修改 `apps/web/vite.config.ts` 和 `README.md`。
- 後續建議：為 `rankwoven.com` 和 `www.rankwoven.com` 申請 HTTPS 憑證；新增 `api.rankwoven.com` DNS 並代理到 API 容器。

### 2026-07-25：申請 SSL 並新增 API 子域名

- 會話的主要目的：為 `rankwoven.com` 和 `www.rankwoven.com` 配置 Certbot SSL 證書，並新增 `api.rankwoven.com` 反向代理到 API 容器。
- 完成的主要任務：新增 Hostinger DNS `api` A 記錄指向 VPS `72.62.253.72`；在 VPS 新增 `/etc/nginx/sites-available/api.rankwoven.com` 並代理到 `127.0.0.1:3011`；為 `rankwoven.com` 和 `www.rankwoven.com` 成功申請 Let’s Encrypt 證書並啟用 HTTP 到 HTTPS 重定向；將前端 API Base URL 改為 `https://api.rankwoven.com`。
- 關鍵決策和解決方案：先簽發已解析生效的主域名證書；`api.rankwoven.com` 權威 DNS 生效後，單獨簽發 API 子域名證書並由 Nginx 啟用 HTTPS 重定向。
- 使用的技術棧：Hostinger DNS、Nginx、Certbot、Let’s Encrypt、Docker Compose、Vite。
- 新增或修改文件：修改 `docker-compose.yml`、`apps/web/vite.config.ts`、`docs/domain-setup.md` 和 `README.md`。
- 後續建議：檢查 Certbot 自動續期任務，並在正式生產化時將 Web 容器改為靜態構建產物或生產服務器。

### 2026-07-25：Certbot 續期檢查與品牌視覺規範

- 會話的主要目的：檢查 RankWoven SSL 自動續期鏈路，並建立 Logo、品牌色與基礎 UI 視覺規範。
- 完成的主要任務：針對 `rankwoven.com` / `www.rankwoven.com` 和 `api.rankwoven.com` 分別執行 Certbot renewal dry-run，兩張 RankWoven 證書均通過；新增 RankWoven SVG Logo；新增品牌與基礎 UI 視覺規範文件；將前端側邊欄品牌標識切換為 RankWoven Logo；將基礎色彩抽為 CSS 變量。
- 關鍵決策和解決方案：保留簡潔工具型 SaaS 視覺，不建立過重設計系統；整機級 `certbot renew --dry-run` 會因舊的 `cloud.imgkit.io` 證書 DNS NXDOMAIN 失敗，因此以 RankWoven 證書單獨 dry-run 作為本項目的有效驗證。
- 使用的技術棧：Certbot、Let’s Encrypt、Nginx、SVG、Vue 3、Vite、CSS。
- 新增或修改文件：新增 `apps/web/src/assets/rankwoven-logo.svg`、`docs/brand-guidelines.md`；修改 `apps/web/src/App.vue`、`apps/web/src/styles.css`、`apps/web/index.html`、`docs/domain-setup.md` 和 `README.md`。
- 後續建議：後續可新增 favicon、Open Graph 圖片和登入頁品牌化；另需決定是否清理 VPS 上無效的 `cloud.imgkit.io` 舊證書。

### 2026-07-25：SaaS 後台核心頁面原型

- 會話的主要目的：繪製 RankWoven SaaS 後台核心頁面原型，用於確認資訊架構、頁面排版和主要工作流。
- 完成的主要任務：新增文章審計、內容審核、內部連結和任務隊列頁；擴展站點概覽、站點管理、CMS 適配器和設定頁；更新側邊欄導航和路由；新增原型說明文件。
- 關鍵決策和解決方案：本階段只做純頁面原型，不連接真實資料、不接 API、不新增 Store 複雜度；頁面內列表和數字均為靜態占位資料；所有新增顯示文案仍走 i18n。
- 使用的技術棧：Vue 3、Vue Router、Vue I18n、Lucide Vue、CSS。
- 新增或修改文件：新增 `apps/web/src/views/ArticlesView.vue`、`apps/web/src/views/ReviewView.vue`、`apps/web/src/views/LinksView.vue`、`apps/web/src/views/TasksView.vue` 和 `docs/saas-dashboard-prototype.md`；修改 `apps/web/src/App.vue`、`apps/web/src/router/index.ts`、`apps/web/src/i18n.ts`、`apps/web/src/styles.css`、`apps/web/src/views/DashboardView.vue`、`apps/web/src/views/SitesView.vue`、`apps/web/src/views/CmsAdaptersView.vue`、`apps/web/src/views/SettingsView.vue` 和 `README.md`。
- 後續建議：下一步可根據原型評審結果抽出共用 `PageHeading`、`DataTable`、`StatusPill`、`ProgressBar` 組件，再開始接入 API。

### 2026-07-25：補齊前台與管理後台頁面原型

- 會話的主要目的：將 RankWoven 原型拆分為前台展示頁、客戶後台與管理後台，並補齊管理後台頁面。
- 完成的主要任務：新增前台功能首頁、定價頁、登入頁；將既有客戶後台路由遷移到 `/app`；新增管理後台平台概覽、客戶管理、用量與成本、運營中心和管理設定頁。
- 關鍵決策和解決方案：使用 `route.meta.layout` 區分 `marketing`、`app`、`admin` 三種布局；頁面只使用靜態原型資料，不接 API、不做真實登入；新增顯示文案繼續走 `vue-i18n`。
- 使用的技術棧：Vue 3、TypeScript、Vite、Vue Router、Pinia、Element Plus、lucide-vue-next、vue-i18n。
- 新增或修改文件：修改 `apps/web/src/router/index.ts`、`apps/web/src/App.vue`、`apps/web/src/i18n.ts`、`apps/web/src/styles.css`、`docs/saas-dashboard-prototype.md`、`README.md`；新增前台與管理後台視圖文件。
- 後續建議：下一步可用真實認證角色切換 `/app` 與 `/admin`，再逐步把靜態表格替換為 API Response 類型和後端資料。

### 2026-07-25：全站 UI 設計審查與視覺優化

- 會話的主要目的：按 `/design-review`、`/design-consultation`、`/design-shotgun` 流程優化 RankWoven 前台、客戶後台與管理後台 UI。
- 完成的主要任務：審查本地頁面截圖；建立 `DESIGN.md`；將前台首頁從普通卡片網格升級為帶編織網絡視覺錨點的產品展示頁；提升後台表格、KPI、導航、按鈕與移動端布局質感；修復登入頁手機端橫向溢出。
- 關鍵決策和解決方案：設計方向定為「可審核的 SEO 增長操作台」；前台採用 editorial marketing + woven signal visual；後台採用 compact utilitarian workspace；字體改為 Noto Sans TC、Instrument Sans 與 JetBrains Mono。
- 使用的技術棧：Vue 3、TypeScript、CSS、Vue I18n、Google Fonts、Playwright with system Chrome。
- 新增或修改文件：新增 `DESIGN.md`；修改 `apps/web/index.html`、`apps/web/src/views/MarketingHomeView.vue`、`apps/web/src/i18n.ts`、`apps/web/src/styles.css`、`docs/brand-guidelines.md` 和 `README.md`。
- 後續建議：下一步可把通用 `MetricCard`、`DataTable`、`StatusPill` 和 `PageHeading` 抽成正式組件，並針對手機端建立更完整的抽屜式後台導航。

### 2026-07-25：補齊客戶後台 SEO 優化工作流

- 會話的主要目的：在客戶後台新增文章同步、建議處理、媒體處理、一鍵套用和單篇文章修改建議原型。
- 完成的主要任務：新增 5 個客戶後台靜態頁面；補充側邊欄導航和路由；為所有新頁面補齊 `zh-Hant` 和 `en` i18n 文案；更新原型文檔和 README 路由說明。
- 關鍵決策和解決方案：本階段仍只做頁面原型，不接 API、不寫 Store、不做真實 CMS 寫入；圖片標題與圖片 Meta 歸入媒體處理；一鍵套用頁展示批次和安全護欄；單篇文章頁逐項展示內容、媒體和內鏈建議。
- 使用的技術棧：Vue 3、TypeScript、Vue Router、Vue I18n、lucide-vue-next。
- 新增或修改文件：新增 `ArticleSyncView.vue`、`SuggestionsView.vue`、`MediaOptimizationView.vue`、`ApplySuggestionsView.vue`、`ArticleSuggestionsView.vue`；修改前端路由、App 導航、i18n、原型文檔和 README。
- 後續建議：下一步可把這些靜態頁接入後端文章同步任務、AI 建議記錄、媒體建議記錄和 CMS Adapter 發佈隊列。

### 2026-07-25：修正媒體處理資訊架構

- 會話的主要目的：按產品定義修正客戶後台資訊架構，將圖片標題與圖片 Meta 優化建議歸入媒體處理。
- 完成的主要任務：移除獨立 `/app/title-meta` 客戶後台入口；更新媒體處理頁，使其展示圖片標題、圖片 Meta、Alt Text、檔案名稱和套用操作；同步調整處理建議和一鍵套用的靜態分類。
- 關鍵決策和解決方案：文章標題與文章 Meta 的逐項審核仍保留在單篇文章修改建議中；圖片標題與圖片 Meta 作為媒體處理子項，不單獨佔用側邊欄入口。
- 使用的技術棧：Vue 3、TypeScript、Vue Router、Vue I18n、lucide-vue-next。
- 新增或修改文件：修改 `apps/web/src/router/index.ts`、`apps/web/src/App.vue`、`apps/web/src/i18n.ts`、`apps/web/src/views/SuggestionsView.vue`、`apps/web/src/views/MediaOptimizationView.vue`、`apps/web/src/views/ApplySuggestionsView.vue`、`docs/saas-dashboard-prototype.md` 和 `README.md`；刪除 `apps/web/src/views/TitleMetaView.vue`。
- 後續建議：後續接入 API 時，媒體建議模型應拆分 `imageTitle`、`imageMeta`、`altText` 和 `filename` 欄位，方便逐項批准和套用。

### 2026-07-26：WordPress 插件骨架與文章同步實測

- 會話的主要目的：建立 WordPress 插件骨架、後端站點連接 API 和文章同步接口，並在 Docker Desktop 的 `cyruschancom` WordPress 環境完成實測。
- 完成的主要任務：新增 `POST /api/v1/site-connections`、站點列表、站點詳情、文章同步和文章列表 API；新增 WordPress 插件 `rankwoven-seo`，提供後台設定頁、站點連接、手動同步、站點側 REST API；在 `cyruschan-wp` 容器中啟用插件並完成連接與同步測試。
- 關鍵決策和解決方案：MVP 先使用內存 Repository 保存站點、Token、文章和媒體；同步接口使用 Bearer Token 保護；插件在 Docker Desktop 測試時使用 `http://host.docker.internal:3011` 連接 AIEO API；針對真實 WordPress 文章日期可能返回 `false` 的情況，插件統一將日期欄位轉為字符串。
- 使用的技術棧：Fastify、TypeScript、Zod、Vitest、WordPress PHP Plugin、WordPress REST API、Docker Desktop、WP-CLI。
- 新增或修改文件：新增 `apps/api/src/siteConnections.ts`、`apps/api/tests/siteConnections.test.ts`、`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`；修改 `apps/api/src/server.ts`、`plugins/wordpress/README.md`、`docs/seo-ai-platform-prd.md` 和 `README.md`。
- 驗證結果：`cyruschancom` 測試站成功連接到 AIEO API；插件同步 59 篇文章和 100 個圖片媒體；後端受保護文章列表 API 可通過站點 Token 讀取 59 篇文章。
- 後續建議：下一步將站點連接、Token 和同步文章落到 PostgreSQL，並在前端客戶後台接入站點列表與文章同步結果。

### 2026-07-26：固定文檔更新與下一步行動清單規則

- 會話的主要目的：按要求明確每次完成任務後都要更新文檔，並在文檔最後提供下一步行動清單。
- 完成的主要任務：在 README 開發規範中新增文檔更新規則；更新 PRD 的下一步行動清單，使其對齊目前已完成 WordPress 插件連接與文章同步實測後的狀態。
- 關鍵決策和解決方案：保留 README 作為會話總結主記錄；PRD 的「下一步行動清單」作為當前產品與開發優先級，不保留已完成的早期事項。
- 使用的技術棧：Markdown。
- 新增或修改文件：修改 `README.md` 和 `docs/seo-ai-platform-prd.md`。
- 下一步行動清單：建立 PostgreSQL migration；將站點連接與同步文章落庫；把客戶後台站點列表接入 API；補齊同步分頁和增量同步；開始 SEO 審計規則模型。

### 2026-07-26：PostgreSQL 持久化站點連接與同步資料

- 會話的主要目的：建立 PostgreSQL 持久化能力，替換目前 API 的內存 Repository，並保留既有測試與補充整合測試。
- 完成的主要任務：新增 PostgreSQL Repository；建立 `site_connections`、`sync_runs`、`synced_articles`、`synced_media` 表；站點 Token 改為保存 SHA-256 Hash 和 Preview；站點、文章、媒體同步資料和同步批次均寫入 PostgreSQL；保留內存 Repository 供單元測試使用。
- 關鍵決策和解決方案：不引入 ORM，先使用 `pg` 和參數化 SQL；`DATABASE_URL` 存在時 API 使用 PostgreSQL，否則使用內存 Repository；整合測試使用 `RUN_POSTGRES_TESTS=1` 顯式啟用，避免普通測試依賴外部資料庫。
- 使用的技術棧：Fastify、TypeScript、PostgreSQL、pg、Zod、Vitest、Docker Compose。
- 新增或修改文件：修改 `apps/api/src/siteConnections.ts`、`apps/api/src/server.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/api/package.json`、`package-lock.json`、`README.md` 和 `docs/seo-ai-platform-prd.md`；新增 `apps/api/tests/siteConnections.postgres.test.ts`。
- 驗證結果：`npm run lint`、`npm run test`、`npm run build` 均通過；`RUN_POSTGRES_TESTS=1 TEST_DATABASE_URL=postgresql://aieo:aieo_password@localhost:5432/aieo npm run test -w @aieo/api -- siteConnections.postgres.test.ts` 通過；Docker API smoke 測試確認 `localhost:3011` 可將站點、文章、媒體與 sync run 寫入 PostgreSQL。
- 下一步行動清單：為站點 Token 增加重新生成與吊銷 API；將客戶後台站點列表接入 API；將文章同步頁接入最近同步結果；補充分頁同步與增量同步；開始 SEO 審計規則模型。

### 2026-07-26：站點 Token 管理與客戶後台站點 API 接入

- 會話的主要目的：為站點連接增加 Token 重新生成與吊銷 API，並將客戶後台 `/app/sites` 從靜態原型改為讀取真實 API。
- 完成的主要任務：新增站點 Token 重新生成和吊銷 Repository 方法；新增 `POST /api/v1/site-connections/:siteId/token/regenerate` 和 `POST /api/v1/site-connections/:siteId/token/revoke`；讓 Token 驗證只接受 `connected` 站點；將 PostgreSQL `site_connections.status` 擴展為 `connected` / `revoked`；新增前端站點連接 API helper；更新 `/app/sites` 的載入、錯誤、空狀態和真實站點列表映射。
- 關鍵決策和解決方案：MVP 尚未接入用戶認證與租戶權限，因此 Token 管理接口暫沿用現有後台原型直接調用模式；完整 Token 只在創建或重新生成時返回一次；吊銷後同步接口維持 `SITE_TOKEN_INVALID`，避免插件繼續推送資料。
- 使用的技術棧：Fastify、TypeScript、PostgreSQL、pg、Zod、Vitest、Vue 3、Vue I18n、Vite。
- 新增或修改文件：新增 `apps/web/src/api/siteConnections.ts`；修改 `apps/api/src/siteConnections.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/api/tests/siteConnections.postgres.test.ts`、`apps/web/src/views/SitesView.vue`、`apps/web/src/i18n.ts`、`README.md` 和 `docs/seo-ai-platform-prd.md`。
- 驗證結果：`npm run lint` 通過；`npm run test` 通過；`npm run build` 通過；`RUN_POSTGRES_TESTS=1 TEST_DATABASE_URL=postgresql://aieo:aieo_password@localhost:5432/aieo npm run test -w @aieo/api -- siteConnections.postgres.test.ts` 通過；Docker Desktop 已重建 API/Web 容器，`localhost:3011` smoke 測試確認舊 Token 失效、新 Token 可同步、吊銷後同步被拒絕。
- 下一步行動清單：把客戶後台 `/app/article-sync` 接入最近同步結果；在 WordPress 插件中支援 Token 重新連接提示；補充分頁同步與增量同步；建立第一批 SEO 審計規則模型。

### 2026-07-26：客戶後台文章同步頁接入同步狀態

- 會話的主要目的：將客戶後台 `/app/article-sync` 接入真實站點同步狀態和最近同步結果。
- 完成的主要任務：把文章同步頁的靜態站點資料替換為 `GET /api/v1/site-connections`；展示每個站點的文章數、媒體數、最近同步時間和同步狀態；新增載入、錯誤和空狀態；將右側同步流程面板改為基於真實資料計算的同步摘要。
- 關鍵決策和解決方案：本次不新增後端接口，先復用站點列表中的 `lastSyncAt` 和 `lastSyncStats`；目前尚未有“發起同步任務” API，因此頁面主按鈕定義為刷新同步狀態。
- 使用的技術棧：Vue 3、TypeScript、Vue I18n、Vite。
- 新增或修改文件：修改 `apps/web/src/views/ArticleSyncView.vue`、`apps/web/src/i18n.ts`、`README.md` 和 `docs/seo-ai-platform-prd.md`。
- 驗證結果：`npm run lint` 通過；`npm run build -w @aieo/web` 通過；`npm run test` 通過；`npm run build` 通過。
- 下一步行動清單：在 WordPress 插件中支援 Token 重新連接提示；為站點 Token 增加最後使用時間記錄；補充分頁同步與增量同步；建立第一批 SEO 審計規則模型。

### 2026-07-26：WordPress 應用程式密碼與 Token 重新連接提示

- 會話的主要目的：讓 WordPress 插件提示 Token 失效後重新連接，並錄入 WordPress 管理員 Application Password，供 SaaS 後續以該管理員身份寫回已批准修改。
- 完成的主要任務：插件新增 WordPress 管理員用戶名和應用程式密碼欄位；連接站點時要求先保存應用程式密碼；已連接站點更新應用程式密碼時同步寫入 SaaS；同步遇到 `SITE_TOKEN_INVALID` 時顯示重新生成或重新填寫 Token 的提示；API 新增 WordPress 憑據更新接口；PostgreSQL 新增管理員用戶名和加密後應用程式密碼欄位。
- 關鍵決策和解決方案：應用程式密碼必須由 WordPress 管理員自行在個人資料頁建立；SaaS 僅保存加密密文，不在 API 回應中返回明文；後續 WordPress 寫回任務使用該管理員身份調用 REST API，使修改可在 WordPress 端追蹤到具體管理員。
- 使用的技術棧：WordPress PHP Plugin、WordPress Application Passwords、Fastify、TypeScript、PostgreSQL、AES-256-GCM、Vitest。
- 新增或修改文件：修改 `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/README.md`、`apps/api/src/siteConnections.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/api/tests/siteConnections.postgres.test.ts`、`apps/web/src/api/siteConnections.ts`、`.env.example`、`docker-compose.yml`、`README.md` 和 `docs/seo-ai-platform-prd.md`。
- 驗證結果：`npm run lint` 通過；`npm run test` 通過；`npm run build` 通過；`RUN_POSTGRES_TESTS=1 TEST_DATABASE_URL=postgresql://aieo:aieo_password@localhost:5432/aieo npm run test -w @aieo/api -- siteConnections.postgres.test.ts` 通過；使用 WordPress PHP Docker 鏡像執行 `php -l plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 通過；Docker Desktop 已重建 API/Worker，`localhost:3011` smoke 測試確認應用程式密碼不在 API 回應中洩露，PostgreSQL 保存值為 `v1:` 加密密文。
- 下一步行動清單：為站點 Token 增加最後使用時間記錄；補充分頁同步與增量同步；建立第一批 SEO 審計規則模型；實作已批准建議的 WordPress REST API 寫回任務。

### 2026-07-26：修復生產 API 路由版本落後

- 會話的主要目的：修復生產環境 `GET /api/v1/site-connections` 返回 `Route GET:/api/v1/site-connections not found` 的問題。
- 完成的主要任務：確認本地 API 已支持該路由但生產 API 仍為舊構建；備份 VPS 生產配置；使用 `git archive HEAD` 將已提交代碼部署到 `/docker/rankwoven`；重建並啟動 Docker Compose `data` profile，補齊 PostgreSQL 和 Redis 容器。
- 關鍵決策和解決方案：部署只使用 Git `HEAD` 打包，避免把本地未提交的 `apps/web/src/styles.css` 帶入生產；保留舊版本目錄 `/docker/rankwoven-old-20260725173214` 和配置備份 `/docker/backups/rankwoven-config-20260725173203.tgz` 以便回滾。
- 使用的技術棧：Docker Compose、Nginx Reverse Proxy、Fastify、PostgreSQL、Redis、SSH。
- 新增或修改文件：修改 `README.md` 和 `docs/seo-ai-platform-prd.md`；未修改應用代碼。
- 驗證結果：`https://api.rankwoven.com/health` 返回 `200 OK`；`https://api.rankwoven.com/api/v1/site-connections` 返回 `200 OK`，響應為 `{"success":true,"message":"操作成功","data":{"sites":[]}}`；生產 `rankwoven-api`、`rankwoven-web`、`rankwoven-worker`、`rankwoven-postgres` 和 `rankwoven-redis` 容器均已啟動。
- 下一步行動清單：補齊可重複部署流程或 GitHub Actions；為生產資料庫建立備份與遷移流程；處理 `npm audit` 提示的高危依賴；繼續開發站點 Token 最後使用時間與 WordPress 分頁同步。

### 2026-07-26：新增 GitHub Actions 生產部署與安全掃描

- 會話的主要目的：補齊可重複部署流程，避免生產環境停留在舊構建，同時處理 Docker build 中出現的 `npm audit` high 依賴問題。
- 完成的主要任務：新增 `scripts/deploy-production.sh` 生產部署腳本；新增 `.github/workflows/production-deploy.yml`，在 `main` push 或手動觸發時執行驗證與部署；新增 `docs/deployment.md`；配置 GitHub Secrets 和 VPS 專用部署 SSH key；新增 `npm run security:audit`。
- 關鍵決策和解決方案：部署腳本只使用 `git archive` 打包指定 Git ref，不包含本機未提交文件；每次部署都備份配置、保留舊版本目錄並寫入 `.deploy-version`；安全掃描固定使用官方 npm registry，避免 npm mirror 不支援 audit endpoint；ESLint 相關 devDependencies 升級到支援 ESLint 10 的版本以消除 high 漏洞。
- 使用的技術棧：GitHub Actions、SSH、Docker Compose、Node.js 22、npm audit、ESLint 10。
- 新增或修改文件：新增 `.github/workflows/production-deploy.yml`、`scripts/deploy-production.sh` 和 `docs/deployment.md`；修改 `package.json`、`package-lock.json`、`README.md` 和 `docs/seo-ai-platform-prd.md`。
- 驗證結果：`bash -n scripts/deploy-production.sh` 通過；`npm ci --registry=https://registry.npmjs.org` 通過；`npm run lint` 通過；`npm run test` 通過；`npm run build` 通過；`npm run security:audit` 返回 `found 0 vulnerabilities`；GitHub Secrets 已配置 `HOSTINGER_VPS_HOST`、`HOSTINGER_VPS_USER`、`HOSTINGER_VPS_SSH_KEY` 和 `HOSTINGER_DEPLOY_PATH`。
- 下一步行動清單：推送後監控首個 GitHub Actions 生產部署結果；為 PostgreSQL 建立定時備份和遷移版本管理；為站點 Token 增加最後使用時間記錄；補充 WordPress 分頁同步和增量同步。

### 2026-07-26：WordPress 圖片屬性設定與批量更新頁

- 會話的主要目的：按參考截圖在 WordPress 插件後台新增圖片屬性設定和批量更新兩個頁面。
- 完成的主要任務：在 `Settings -> RankWoven SEO` 新增 `Image Attributes` 和 `Bulk Updater` 頁籤；支援新上傳圖片從檔案名自動產生標題、Alt Text、Caption 和 Description；支援清理檔案名中的連字號、底線、句號、逗號和數字；支援前台內容輸出時補上圖片 `title` 屬性；新增測試更新一張圖片、分批更新既有圖片和重設批量計數功能。
- 關鍵決策和解決方案：批量更新每次處理 50 張圖片，避免大站點一次請求超時；測試和批量更新都使用目前圖片屬性設定；保留事件記錄，方便管理員確認處理結果；本次只在 WordPress 插件端處理圖片屬性，不新增 SaaS API。
- 使用的技術棧：WordPress PHP Plugin、WordPress Attachment API、WP_HTML_Tag_Processor、Docker Desktop。
- 新增或修改文件：修改 `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/README.md`、`README.md` 和 `docs/seo-ai-platform-prd.md`。
- 驗證結果：使用 WordPress PHP Docker 鏡像執行 `php -l plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 通過；已將插件更新到 Docker Desktop `cyruschan-wp` 測試環境，容器內 `php -l` 通過；`http://localhost:8088/` 返回 `200 OK`；插件狀態確認為 active。
- 下一步行動清單：補充 WordPress 插件只讀診斷頁；為圖片批量更新加入更清晰的進度提示或 AJAX 執行；補充分頁同步與增量同步；為站點 Token 增加最後使用時間記錄。

### 2026-07-26：站點 Token 最後使用時間記錄

- 會話的主要目的：為站點 Token 增加最後使用時間記錄，方便後台判斷 WordPress 插件是否仍在同步或讀取資料。
- 完成的主要任務：新增 `lastTokenUsedAt` API 欄位；PostgreSQL 新增 `site_connections.last_token_used_at` 欄位與索引；站點 Token 驗證成功時更新最後使用時間；重新生成 Token 時清空最後使用時間；客戶後台 `/app/sites` 新增 Token 最近使用欄位。
- 關鍵決策和解決方案：`lastSyncAt` 保留為同步完成時間，`lastTokenUsedAt` 專門記錄 Token 是否仍被插件或站點側資料接口使用；吊銷 Token 不更新使用時間；重新生成 Token 後需等插件使用新 Token 才顯示新時間。
- 使用的技術棧：Fastify、TypeScript、PostgreSQL、pg、Vitest、Vue 3、Vue I18n。
- 新增或修改文件：修改 `apps/api/src/siteConnections.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/api/tests/siteConnections.postgres.test.ts`、`apps/web/src/api/siteConnections.ts`、`apps/web/src/views/SitesView.vue`、`apps/web/src/i18n.ts`、`README.md` 和 `docs/seo-ai-platform-prd.md`。
- 驗證結果：`npm run test -w @aieo/api -- siteConnections.test.ts` 通過；`RUN_POSTGRES_TESTS=1 TEST_DATABASE_URL=postgresql://aieo:aieo_password@localhost:5432/aieo npm run test -w @aieo/api -- siteConnections.postgres.test.ts` 通過；`npm run build -w @aieo/web` 通過；`npm run lint` 通過。
- 下一步行動清單：補充 WordPress 插件只讀診斷頁；補充分頁同步與增量同步；建立第一批 SEO 審計規則模型；為 PostgreSQL 建立定時備份和遷移版本管理。

### 2026-07-26：WordPress 插件分頁同步

- 會話的主要目的：為 WordPress 插件補充分頁同步，避免手動同步每次只取第一批 100 篇文章和 100 個圖片媒體。
- 完成的主要任務：將後台手動同步改為分頁讀取 Posts、Pages 和圖片媒體；新增同步頁數和同步上限狀態記錄；最近同步結果展示文章頁數、媒體頁數和是否達到單次 payload 上限。
- 關鍵決策和解決方案：暫不擴大 SaaS API 單次 payload schema，插件先按目前後端上限最多推送 1,000 篇文章和 2,000 個圖片媒體；若大站超過上限，插件顯示已達同步上限，後續再由後端同步任務和增量同步拆批處理。
- 使用的技術棧：WordPress PHP Plugin、WordPress Posts API、WordPress Attachment API、Fastify Sync API、Docker Desktop、Vitest。
- 新增或修改文件：修改 `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/README.md`、`README.md` 和 `docs/seo-ai-platform-prd.md`。
- 驗證結果：使用 WordPress PHP Docker 鏡像執行 `php -l plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 通過；已將插件更新到 Docker Desktop `cyruschan-wp` 測試環境，容器內 `php -l` 通過；反射調用插件同步方法確認測試站同步 59 篇文章、240 個圖片媒體，其中媒體分 3 頁；本地臨時站點連接同步 API 返回 `200 OK` 並接收 59 篇文章、240 個媒體；`npm run lint`、`npm run test`、`npm run build`、`npm run security:audit` 和 PostgreSQL 整合測試均通過。
- 下一步行動清單：增加增量同步參數；將手動同步升級為後端同步任務以支持大站多批同步；建立第一批 SEO 審計規則模型；新增 WordPress 插件只讀診斷頁。

### 2026-07-26：增量同步與後端同步任務

- 會話的主要目的：實作 `updatedAfter` 增量同步，並將 WordPress 插件手動同步升級為後端同步任務和多批次推送，支持大站內容分批落庫。
- 完成的主要任務：API 新增 `sync_tasks` 任務模型和分頁批次接口；PostgreSQL 新增 `sync_tasks` 表並讓 `sync_runs` 關聯任務與批次；WordPress 插件同步時先建立任務，再逐頁推送文章和媒體 batch；插件站點側 REST API 新增 `updatedAfter` 參數；最近同步結果保存同步模式、任務 ID 和增量時間；為 GitHub Actions 生產部署的 `ssh-keyscan` 加入超時和重試。
- 關鍵決策和解決方案：MVP 仍由插件主動推送批次，後端負責任務進度和批次落庫；因 SaaS 目前只保存 Site Token Hash，不保存完整 Token，暫不讓 Worker 主動拉取 WordPress REST API；下一次同步使用上一次成功同步的 `syncStartedAt` 作為 `updatedAfter`，降低漏同步風險。
- 使用的技術棧：Fastify、TypeScript、Zod、PostgreSQL、Vitest、WordPress PHP Plugin、WordPress Posts API、Docker Desktop。
- 新增或修改文件：修改 `.github/workflows/production-deploy.yml`、`apps/api/src/siteConnections.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/api/tests/siteConnections.postgres.test.ts`、`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/README.md`、`README.md` 和 `docs/seo-ai-platform-prd.md`。
- 驗證結果：`npm run test -w @aieo/api -- siteConnections.test.ts` 通過；`RUN_POSTGRES_TESTS=1 TEST_DATABASE_URL=postgresql://aieo:aieo_password@localhost:5432/aieo npm run test -w @aieo/api -- siteConnections.postgres.test.ts` 通過；使用 WordPress PHP Docker 鏡像執行 `php -l` 通過；Docker Desktop 重建 API/Worker/Web 後，`cyruschan-wp` 測試站增量同步接收 50 個更新媒體，立即二次增量同步接收 0/0；臨時全量同步任務接收 59 篇文章和 240 個媒體，媒體分 3 頁批次推送。
- 下一步行動清單：補充單篇文章和單個媒體手動刷新接口；建立第一批 SEO 審計規則模型；新增 WordPress 插件只讀診斷頁；將客戶後台同步頁接入同步任務列表和批次進度。

### 2026-07-26：單篇文章與單個媒體手動刷新任務

- 會話的主要目的：新增單篇文章和單個媒體手動刷新接口，並將客戶後台文章同步頁接入同步任務列表和 batch 進度。
- 完成的主要任務：API 為 `sync_tasks` 增加 `scope` 和 `targetCmsId`；新增全局任務列表、站點任務列表和手動刷新任務接口；WordPress 插件新增單篇 Post/Page 與單個圖片媒體的站點側 REST 讀取端點；客戶後台 `/app/article-sync` 新增手動刷新表單、同步任務表格和 batch 進度展示。
- 關鍵決策和解決方案：手動刷新先建立 `queued` 任務記錄，不在 API 直接持有明文 Site Token 主動拉 WordPress；後續由 Worker 隊列按 `scope` 和 `targetCmsId` 執行拉取、落庫和重試。
- 使用的技術棧：Fastify、TypeScript、Zod、PostgreSQL、Vitest、Vue 3、Vue I18n、WordPress REST API、Docker Desktop。
- 新增或修改文件：修改 `apps/api/src/siteConnections.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/api/tests/siteConnections.postgres.test.ts`、`apps/web/src/api/siteConnections.ts`、`apps/web/src/views/ArticleSyncView.vue`、`apps/web/src/i18n.ts`、`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/README.md`、`docs/seo-ai-platform-prd.md` 和 `README.md`。
- 驗證結果：`npm run lint` 通過；`npm run test` 通過；`npm run build` 通過；`npm run security:audit` 返回 `found 0 vulnerabilities`；`RUN_POSTGRES_TESTS=1 TEST_DATABASE_URL=postgresql://aieo:aieo_password@localhost:5432/aieo npm run test -w @aieo/api -- siteConnections.postgres.test.ts` 通過；WordPress PHP Docker 鏡像與 `cyruschan-wp` 容器內 `php -l` 通過；Docker WordPress smoke 確認 `/rankwoven/v1/posts/:id` 和 `/rankwoven/v1/media/:id` 均返回 `200`。
- 下一步行動清單：將手動刷新任務接入 Worker 隊列；建立第一批 SEO 審計規則模型；設計建議記錄模型；實作已批准建議的 WordPress REST API 寫回任務；新增 WordPress 插件只讀診斷頁；建立資料庫備份和遷移版本管理流程。
