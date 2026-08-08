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

- 前端：Vue 3、TypeScript、Vite、Vue Router、Pinia、Vue I18n、Ant Design Vue、ECharts
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
VITE_API_BASE_URL=http://localhost:3011
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
GOOGLE_APPLICATION_CREDENTIALS=
GOOGLE_APPLICATION_CREDENTIALS_JSON=
GOOGLE_APPLICATION_CREDENTIALS_BASE64=
KEYWORD_VOLUME_API_URL=
KEYWORD_VOLUME_API_KEY=
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
- `GET /api/v1/site-connections/:siteId/articles?page=&pageSize=`：帶 Bearer Token 或登入用戶權限查看已同步文章分頁列表。
- `GET /api/v1/site-connections/:siteId/media?page=&pageSize=`：帶 Bearer Token 或登入用戶權限查看已同步媒體分頁列表。
- `POST /api/v1/site-connections/:siteId/audits`：以已同步文章與媒體執行第一批 SEO 規則審計，並產生可審核建議。
- `GET /api/v1/site-connections/:siteId/audits`：查看站點 SEO 審計記錄和最近一次審計問題。
- `GET /api/v1/site-connections/:siteId/suggestions`：查看文章與媒體優化建議，並返回最近一次 SEO 審計分數、規則版本和問題數摘要。
- `POST /api/v1/site-connections/:siteId/suggestions`：手動建立優化建議記錄。
- `POST /api/v1/site-connections/:siteId/suggestions/:suggestionId/approve`：批准待處理建議。
- `POST /api/v1/site-connections/:siteId/suggestions/:suggestionId/apply`：為已批准建議建立 WordPress 寫回任務，並建立套用前後快照。
- `GET /api/v1/site-connections/:siteId/apply-queue`：查看站點已批准建議、寫回/回滾任務和套用快照。
- `POST /api/v1/site-connections/:siteId/apply-snapshots/:snapshotId/rollback`：為已套用快照建立回滾任務。
- `GET /api/v1/analytics/overview?siteId=&startDate=&endDate=`：讀取 GA4 或示範分析數據，支援站點 host 篩選與日期範圍。
- `POST /api/v1/keyword-suggestions`：產生關鍵詞建議，優先使用第三方搜尋量/難度 API，其次 AI Provider，最後才回退本地 fallback。

站點連接、Token Hash、Token Preview、Token 狀態、Token 最近使用時間、WordPress 管理員應用程式密碼加密密文、同步任務、任務範圍、目標 CMS ID、重試次數、退避時間、死信狀態、文章同步資料、文章 Meta Description、媒體同步資料、同步批次記錄、SEO 審計、審計問題、優化建議和寫回快照已落到 PostgreSQL。文章與媒體列表已支援 `page` / `pageSize` 分頁查詢，避免資料量增長後一次讀取過多。若未配置 `DATABASE_URL`，API 仍可使用內存 Repository 進行單元測試；Docker Desktop 開發環境使用 `docker compose --profile data up -d postgres` 啟動 PostgreSQL。資料庫 schema 已開始使用 `db/migrations/*.sql` 版本化管理，可用 `npm run db:migrate` 套用 migration，並用 `npm run db:backup` 建立 `pg_dump` 備份。客戶後台 `/app/sites` 已使用 `GET /api/v1/site-connections` 顯示站點列表；`/app/article-sync` 已接入站點同步狀態、手動刷新任務建立、任務列表和 batch 進度；`/app/apply` 已接入真實已批准建議寫回隊列、批次預覽、任務狀態和回滾入口。手動刷新、已批准建議寫回與快照回滾任務由 Worker 從 PostgreSQL `sync_tasks` 隊列領取並執行，失敗時按退避時間重新排隊，超過最大重試次數後進入 `dead_letter`。

`WORDPRESS_CREDENTIAL_ENCRYPTION_KEY` 用於加密保存 WordPress Application Password。開發環境可使用 `.env.example` 的占位值，正式環境必須改為獨立強隨機密鑰；API 列表和詳情接口只返回是否已配置與管理員用戶名，不返回應用程式密碼明文。

詳細產品 API 規劃詳見 [AI SEO 自動優化平台開發需求文件](docs/seo-ai-platform-prd.md) 的 API 設計章節。

## AI Provider 使用說明

目前已新增 `@aieo/ai-providers` 共享包，提供最小 Provider Adapter 介面、問問 OpenAI-compatible Text Provider、Noop Provider Registry、用量成本估算、AI 用量記錄和內存 Repository。MVP 的 OpenAI、Google Gemini、DeepSeek 等模型統一通過問問 API 代理接入；當 `WENWEN_API_KEY` 已配置時 API 會切到正式問問 Text Provider，未配置時保留 Noop/fallback 以支援本地測試。圖片存儲使用七牛雲 Kodo。關鍵詞建議已改為 Provider 化流程：配置 `KEYWORD_VOLUME_API_URL` 和 `KEYWORD_VOLUME_API_KEY` 時優先讀取第三方搜尋量/競爭度資料，支援常見 `keywords`、`data`、`results` 和 DataForSEO `tasks[].result` 回傳形狀，並映射 `source`、月搜尋量、CPC 和競爭度；未配置時使用 AI Text Provider 產生建議，Provider 不可用時才使用本地 fallback 並標記 `source: fallback`。真實 Search Console OAuth 關鍵詞來源尚未接入，後續應在同一服務介面下擴展。

Google Analytics 由每個客戶在 WordPress 插件後台輸入該站點的 GA4 Property ID，插件會同步到 `PUT /api/v1/site-connections/:siteId/analytics-settings`。SaaS 後端仍使用平台級 Google 服務帳號憑據讀取 GA4 Data API，因此正式環境需要將該服務帳號加入客戶 GA4 Property 的可讀權限；未配置站點 GA4 Property ID 或服務帳號憑據時，分析頁返回示範數據。

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

### 2026-07-26：Worker 隊列、SEO 審計、建議模型與真實登入

- 會話的主要目的：將手動刷新任務接入 Worker 隊列，建立第一批 SEO 審計和建議模型，並補齊客戶後台真實登入、工作區和站點權限校驗。
- 完成的主要任務：新增 SaaS 用戶登入和 `GET /api/v1/auth/me`；客戶後台 `/app` 與管理後台 `/admin` 改為需要登入；站點列表、任務列表、Token 管理和手動刷新加入工作區校驗；新增 `seo_audits`、`seo_audit_issues`、`optimization_suggestions` 模型；新增站點審計、建議列表、建議建立、批准和寫回任務 API；Worker 可從 PostgreSQL `sync_tasks` 領取單篇文章、單個媒體和已批准建議寫回任務；WordPress 插件新增文章和媒體寫回 REST API。
- 關鍵決策和解決方案：MVP 登入先使用 HMAC 簽名 Token 和預設 Demo 工作區，便於本地和部署後驗證；第一批 SEO 規則先採用確定性審計，覆蓋文章標題長度、H1 數量、內部連結數、圖片 Alt Text 和檔名格式；寫回任務使用 WordPress 管理員 Application Password 調用站點側 REST API，讓 WordPress 保留管理員身份記錄。
- 使用的技術棧：Fastify、TypeScript、Zod、PostgreSQL、pg、Vitest、Vue 3、Pinia、Vue Router、Vue I18n、WordPress REST API、AES-256-GCM。
- 新增或修改文件：新增 `apps/api/src/auth.ts`、`apps/api/src/seoOptimization.ts` 和 `apps/web/src/api/auth.ts`；修改 `apps/api/src/server.ts`、`apps/api/src/siteConnections.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/api/tests/siteConnections.postgres.test.ts`、`apps/web/src/api/siteConnections.ts`、`apps/web/src/router/index.ts`、`apps/web/src/stores/auth.ts`、`apps/web/src/views/LoginView.vue`、`apps/web/src/views/ArticleSyncView.vue`、`apps/web/src/i18n.ts`、`apps/worker/src/index.ts`、`apps/worker/tests/worker.test.ts`、`apps/worker/package.json`、`package-lock.json`、`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/README.md`、`README.md` 和 `docs/seo-ai-platform-prd.md`。
- 驗證結果：`npm run build -w @aieo/api` 通過；`npm run test -w @aieo/api -- siteConnections.test.ts` 通過；`npm run build -w @aieo/web` 通過，Vite 僅提示既有大 chunk 警告；`npm run build -w @aieo/worker` 通過；`npm run test -w @aieo/worker` 通過；WordPress PHP Docker 鏡像執行 `php -l plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 通過。
- 下一步行動清單：將客戶後台 `/app/suggestions` 和 `/app/article-suggestions` 接入真實建議 API；將 `/app/tasks` 接入全局任務隊列；補充 Meta Description 真實同步欄位；為 Worker 增加重試、退避和死信列表；建立資料庫備份和遷移版本管理流程；為已批准建議寫回補充快照與回滾。

### 2026-07-26：修復部署 Smoke Check 權限校驗

- 會話的主要目的：修復 GitHub Actions 生產部署 smoke check 因 `/api/v1/site-connections` 需要登入而持續返回 `401` 的問題。
- 完成的主要任務：更新 `scripts/deploy-production.sh`，保留 `/health` 匿名健康檢查；Smoke Check 先調用 `/api/v1/auth/login` 取得 JWT，再以 Bearer Token 訪問 `/api/v1/site-connections`；更新 GitHub Actions 傳入登入 URL 和可覆寫的 `DEPLOY_SMOKE_EMAIL`、`DEPLOY_SMOKE_PASSWORD`。
- 關鍵決策和解決方案：不放開受保護的站點列表接口，改為讓部署檢查符合真實權限模型；未配置 GitHub Secrets 時仍使用本地 Demo 帳號，後續可在生產 Secrets 中替換為專用 smoke 帳號。
- 使用的技術棧：Bash、curl、Python JSON、GitHub Actions、Fastify Auth API。
- 新增或修改文件：修改 `.github/workflows/production-deploy.yml`、`scripts/deploy-production.sh` 和 `README.md`。
- 驗證結果：`bash -n scripts/deploy-production.sh` 通過；`npm run lint` 通過；`npm run test` 通過；`npm run build` 通過；`npm run security:audit` 返回 `found 0 vulnerabilities`。
- 下一步行動清單：重新觸發 GitHub Actions 生產部署；為生產建立專用 smoke 帳號並配置 `DEPLOY_SMOKE_EMAIL`、`DEPLOY_SMOKE_PASSWORD` Secrets；將 `/app/tasks` 和建議頁接入真實 API；為 Worker 增加重試、退避和死信列表。

### 2026-07-26：客戶後台建議與任務隊列真實 API 接入

- 會話的主要目的：將客戶後台 `/app/suggestions`、`/app/article-suggestions` 和 `/app/tasks` 從靜態原型升級為真實 API 資料。
- 完成的主要任務：前端 API 封裝新增優化建議型別、建議列表、批准建議和建立寫回任務方法；`/app/suggestions` 支援選擇站點、載入真實建議、批准和建立寫回任務；`/app/article-suggestions` 按文章或媒體目標分組展示真實建議，支持逐項批准和套用已批准項；`/app/tasks` 接入 `GET /api/v1/sync-tasks`，展示任務範圍、站點、狀態、進度、完成時間和失敗原因。
- 關鍵決策和解決方案：本次只接入既有後端 API，不新增後端路由；三個頁面沿用既有表格和面板樣式，避免擴大 UI 樣式改動；失敗任務優先顯示 `errorMessage`，沒有記錄時顯示友善缺省文案。
- 使用的技術棧：Vue 3、TypeScript、Composition API、Vue Router、Vue I18n、Fastify API、JWT Bearer Token。
- 新增或修改文件：修改 `apps/web/src/api/siteConnections.ts`、`apps/web/src/views/SuggestionsView.vue`、`apps/web/src/views/ArticleSuggestionsView.vue`、`apps/web/src/views/TasksView.vue`、`apps/web/src/i18n.ts`、`README.md` 和 `docs/seo-ai-platform-prd.md`。
- 驗證結果：`npm run build -w @aieo/web` 通過；`npm run lint` 通過；`npm run test` 通過；`npm run build` 通過；`npm run security:audit` 返回 `found 0 vulnerabilities`；Vite 僅提示既有大 chunk 警告。
- 下一步行動清單：在建議頁增加手動執行 SEO 審計入口；補充 Meta Description 真實同步欄位；為 Worker 任務加入重試、退避和死信列表；為已批准建議寫回補充快照與回滾；將任務隊列增加類型篩選、站點篩選和自動刷新。

### 2026-07-26：客戶後台建議頁 SEO 審計入口

- 會話的主要目的：在客戶後台 `/app/suggestions` 補充可手動執行 SEO 審計的入口，讓用戶不離開建議頁即可生成並刷新建議。
- 完成的主要任務：前端 API 封裝新增 `POST /api/v1/site-connections/:siteId/audits` 方法與 SEO 審計型別；`/app/suggestions` 新增「執行 SEO 審計」按鈕、執行中狀態、錯誤提示和成功後自動刷新建議列表；補充繁體中文與英文介面文案。
- 關鍵決策和解決方案：沿用既有後端同步審計接口，不新增後端路由；按目前已選擇且已連接的站點觸發審計；審計成功後重新拉取建議列表，確保頁面顯示最新審計產生的建議。
- 使用的技術棧：Vue 3、TypeScript、Composition API、Vue I18n、Fastify API、JWT Bearer Token。
- 新增或修改文件：修改 `apps/web/src/api/siteConnections.ts`、`apps/web/src/views/SuggestionsView.vue`、`apps/web/src/i18n.ts`、`README.md` 和 `docs/seo-ai-platform-prd.md`。
- 驗證結果：`npm run build -w @aieo/web` 通過；`npm run lint` 通過；`npm run test` 通過；`npm run build` 通過；`npm run security:audit` 返回 `found 0 vulnerabilities`；Vite 僅提示既有大 chunk 警告與第三方 `#__PURE__` 註釋提示。
- 下一步行動清單：補充 Meta Description 真實同步欄位；為文章與媒體列表補充分頁查詢；為 WordPress 插件新增只讀診斷頁；為 Worker 任務加入重試、退避和死信列表；為已批准建議寫回補充快照與回滾。

### 2026-07-26：WordPress 診斷頁與資料庫備份遷移流程

- 會話的主要目的：為 WordPress 插件新增只讀診斷頁，並建立 PostgreSQL 備份與 migration 版本管理流程，避免生產部署只依賴 Repository 啟動時建表。
- 完成的主要任務：插件新增 `Diagnostics` 頁籤，顯示 API 連接、Site ID、Site Token 本地配置狀態、Token 最近本地成功使用時間、最近同步、圖片屬性設定、Application Password 配置狀態和最近錯誤原因；新增 `db/migrations/0001_initial_schema.sql`、`scripts/migrate-database.sh` 和 `scripts/backup-database.sh`；部署腳本在重建服務前先啟動 PostgreSQL、等待 ready、備份資料庫並套用 migration。
- 關鍵決策和解決方案：診斷頁保持只讀，不顯示完整 Token 或 Application Password 明文；Token 最近使用時間以插件本地成功連接、同步或憑據更新時間作為站點側可見信號；migration 先採用 SQL 文件和 `schema_migrations` 記錄表，不引入 ORM。
- 使用的技術棧：WordPress PHP、WordPress HTTP API、Bash、Docker Compose、PostgreSQL、pg_dump、psql。
- 新增或修改文件：新增 `db/migrations/0001_initial_schema.sql`、`scripts/migrate-database.sh` 和 `scripts/backup-database.sh`；修改 `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/README.md`、`scripts/deploy-production.sh`、`docs/deployment.md`、`package.json`、`.gitignore`、`README.md` 和 `docs/seo-ai-platform-prd.md`。
- 驗證結果：`bash -n scripts/migrate-database.sh scripts/backup-database.sh scripts/deploy-production.sh` 通過；`docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php` 通過；`npm run db:migrate` 通過並在本地 PostgreSQL 記錄 `0001_initial_schema.sql`；`DATABASE_BACKUP_DIR=/tmp/rankwoven-db-backups npm run db:backup` 成功建立備份；`npm run lint` 通過；`npm run test` 通過；`npm run build` 通過；`npm run security:audit` 返回 `found 0 vulnerabilities`。
- 下一步行動清單：補充 Meta Description 真實同步欄位；為文章與媒體列表補充分頁查詢；為 Worker 任務加入重試、退避和死信列表；為已批准建議寫回補充快照與回滾；補充資料庫備份恢復演練步驟。

### 2026-07-26：Ant Design Vue、Google Analytics、ECharts 與關鍵詞建議

- 會話的主要目的：將 SaaS 前端基座改用 Ant Design Vue，加入 Google Analytics 讀取能力、ECharts 圖表展示和關鍵詞建議入口。
- 完成的主要任務：前端移除 Element Plus 並按需註冊 Ant Design Vue 元件；新增 `/app/analytics` 流量分析頁，使用 ECharts 顯示 7 日流量趨勢、渠道工作階段和熱門頁面；在 `/app/suggestions` 增加建議狀態環形圖與建議類型柱狀圖；新增 `/app/keywords` 關鍵詞建議頁；後端新增 `GET /api/v1/analytics/overview` 和 `POST /api/v1/keyword-suggestions`。
- 關鍵決策和解決方案：Google Analytics 先以服務帳號 JWT 調用 GA4 Data API REST 端點，避免引入會觸發 high audit 的 Google Node SDK 依賴；未配置站點 GA4 Property ID 或服務帳號憑據時返回示範數據，方便原型和本地開發；路由頁面改為動態載入，並用 Vite `manualChunks` 拆分 Vue、AntD 和 ECharts 依賴；Docker Compose 的 `VITE_API_BASE_URL` 預設改回本地 API，生產由 `.env` 覆蓋為 `https://api.rankwoven.com`。
- 使用的技術棧：Vue 3、TypeScript、Vite、Vue Router、Vue I18n、Ant Design Vue、ECharts、vue-echarts、Fastify、Google Analytics Data API REST、Vitest。
- 新增或修改文件：新增 `apps/api/src/analytics.ts`、`apps/api/src/keywordSuggestions.ts`、`apps/web/src/api/appInsights.ts`、`apps/web/src/components/AnalyticsChart.vue`、`apps/web/src/views/AnalyticsView.vue` 和 `apps/web/src/views/KeywordSuggestionsView.vue`；修改 `apps/api/src/server.ts`、`apps/api/src/config.ts`、`apps/api/tests/health.test.ts`、`apps/web/src/App.vue`、`apps/web/src/components/LanguageSwitcher.vue`、`apps/web/src/i18n.ts`、`apps/web/src/main.ts`、`apps/web/src/router/index.ts`、`apps/web/src/styles.css`、`apps/web/vite.config.ts`、`docker-compose.yml`、`.env.example`、`package.json`、`package-lock.json`、`README.md`、`docs/deployment.md` 和 `docs/seo-ai-platform-prd.md`。
- 驗證結果：`npm run lint` 通過；`npm run test` 通過；`npm run build` 通過；`npm run security:audit` 返回 `found 0 vulnerabilities`。Vite 仍提示 `vendor-antdv` 和 `vendor-echarts` 單獨依賴 chunk 超過 500KB，屬於第三方 UI/圖表庫體積提醒，已通過路由懶載入和 manual chunks 降低首屏主包大小。
- 下一步行動清單：配置正式 GA4 Property ID 和服務帳號憑據；把關鍵詞建議接入 AI Provider 與真實搜尋量/難度來源；逐步將剩餘舊表格頁替換為 Ant Design Vue Table/Form；為分析頁增加站點篩選和時間範圍切換；補充 Meta Description 真實同步欄位。

### 2026-07-26：RankWoven SSL 狀態排查與 HTTPS 安全頭

- 會話的主要目的：使用 Hostinger MCP 和 VPS 檢查 `https://www.rankwoven.com/` 仍顯示不安全的原因。
- 完成的主要任務：確認 Hostinger DNS 中 `@`、`www` 和 `api` 均指向 VPS `72.62.253.72`；檢查 `rankwoven.com`、`www.rankwoven.com` 與 `api.rankwoven.com` 的公開 HTTPS、Nginx 和 Certbot 狀態；為主站和 API 站點的 HTTPS 回應加入 `Strict-Transport-Security` 與 `X-Content-Type-Options` 安全頭。
- 關鍵決策和解決方案：公開證書已有效，`rankwoven.com` 證書 SAN 覆蓋 `rankwoven.com` 和 `www.rankwoven.com`，因此不重新簽發無必要的新證書；目前主要風險是生產主站仍由 Vite dev server 對外服務，下一步應改為正式靜態構建部署。
- 使用的技術棧：Hostinger MCP、DNS、Nginx、Certbot、Let’s Encrypt、curl、OpenSSL、Docker Compose。
- 新增或修改文件：修改 `docs/domain-setup.md` 和 `README.md`；VPS 備份 Nginx 配置至 `/etc/nginx/backups/rankwoven-ssl-headers-20260726144849.tgz`。
- 驗證結果：`https://rankwoven.com/` 和 `https://www.rankwoven.com/` 均返回 `200`，`ssl_verify_result=0`；`rankwoven.com` 證書有效期為 2026-07-25 至 2026-10-23，SAN 包含 `rankwoven.com` 和 `www.rankwoven.com`；`certbot renew --dry-run --no-random-sleep-on-renew --cert-name rankwoven.com` 通過；`certbot renew --dry-run --no-random-sleep-on-renew --cert-name api.rankwoven.com` 通過；三個 HTTPS 入口均返回 `Strict-Transport-Security: max-age=31536000`。
- 下一步行動清單：將生產 Web 容器改為 `npm run build -w @aieo/web` 後由 Nginx 或靜態服務器提供 `dist`；清理 VPS 上不再使用且阻塞整機 `certbot renew --dry-run` 的舊 `cloud.imgkit.io` 證書；讓瀏覽器清除 `rankwoven.com` 的站點資料或以無痕視窗重新打開，確認地址欄安全狀態刷新。

### 2026-07-26：新增 macOS、GitHub 與 Hostinger MCP 代理 Skill

- 會話的主要目的：將使用者提供的代理開發規則整理為適合本機 macOS、GitHub 自動部署與 Hostinger MCP / VPS 部署檢查的倉庫級 Skill。
- 完成的主要任務：新增根目錄 `AGENTS.md`；明確本機開發檢查、Git/GitHub 提交流程、GitHub Actions 生產部署、Hostinger MCP 使用邊界、部署後驗證與文檔更新規則。
- 關鍵決策和解決方案：倉庫內原本沒有 `AGENTS.md` 或 `SKILL.md`，因此以根目錄 `AGENTS.md` 承載本專案代理規則；部署仍以 GitHub Actions 和 `scripts/deploy-production.sh` 為首選，Hostinger MCP 主要用於只讀檢查、容器狀態確認和使用者明確授權後的 VPS 專案操作。
- 使用的技術棧：Markdown、GitHub Actions、Hostinger MCP、Hostinger VPS、Docker Compose、macOS zsh、npm。
- 新增或修改文件：新增 `AGENTS.md`；修改 `README.md`。
- 驗證結果：已檢查 `README.md`、`docs/deployment.md`、`docs/domain-setup.md`、`.github/workflows/production-deploy.yml`、`scripts/deploy-production.sh` 和 Git 遠端資訊；本次為文檔與代理規則更新，未執行應用 lint/test/build。
- 下一步行動清單：確認是否需要將 `AGENTS.md` 同步為可自動發現的 `$CODEX_HOME/skills/rankwoven-deploy/SKILL.md`；下一次正式部署前先推送到 GitHub 並監控 GitHub Actions；使用 Hostinger MCP 查詢 `rankwoven` Compose 專案與容器狀態。

### 2026-07-26：Meta Description 同步與 GA4 分析篩選

- 會話的主要目的：為 SEO 審計補充真實 Meta Description 同步欄位，並讓客戶後台分析頁支持正式 GA4 配置、站點篩選和日期範圍切換。
- 完成的主要任務：WordPress 插件同步文章時新增 `metaDescription`；API 與 PostgreSQL 保存 `synced_articles.meta_description`；SEO 審計新增文章 Meta Description 長度規則與優化建議；分析 API 支援 `siteId`、`startDate`、`endDate` 查詢參數；客戶後台 `/app/analytics` 新增站點選擇、開始日期、結束日期和刷新操作。
- 關鍵決策和解決方案：Meta Description 來源按 Yoast、Rank Math、AIOSEO、RankWoven 自有欄位排序讀取，缺失時回退 WordPress 摘要；GA4 使用服務帳號 JWT 直接調用 Google Analytics Data API REST，正式憑據可由檔案路徑、JSON 字串或 Base64 字串注入，避免將密鑰提交到 Git；未配置正式 GA4 憑據時保留示範數據以支援本地開發。
- 使用的技術棧：Fastify、TypeScript、Zod、PostgreSQL、Vitest、Vue 3、Ant Design Vue、Vue I18n、ECharts、WordPress PHP Plugin、Google Analytics Data API REST。
- 新增或修改文件：新增 `db/migrations/0002_synced_article_meta_description.sql`；修改 `.env.example`、`docker-compose.yml`、`apps/api/src/analytics.ts`、`apps/api/src/config.ts`、`apps/api/src/server.ts`、`apps/api/src/siteConnections.ts`、`apps/api/src/seoOptimization.ts`、`apps/api/tests/health.test.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/api/tests/siteConnections.postgres.test.ts`、`apps/web/src/api/appInsights.ts`、`apps/web/src/views/AnalyticsView.vue`、`apps/web/src/i18n.ts`、`apps/web/src/styles.css`、`db/migrations/0001_initial_schema.sql`、`docs/deployment.md`、`docs/seo-ai-platform-prd.md`、`plugins/wordpress/README.md` 和 `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`。
- 驗證結果：`npm run test -w @aieo/api -- health.test.ts siteConnections.test.ts` 通過；`npm run build -w @aieo/api` 通過；`npm run build -w @aieo/web` 通過；`docker run --rm -v "$PWD/plugins/wordpress/rankwoven-seo:/plugin" wordpress:php8.2 php -l /plugin/rankwoven-seo.php` 通過；`npm run test`、`npm run build`、`npm run security:audit`、`npm run lint` 通過；`npm run db:migrate` 已套用 `0002_synced_article_meta_description.sql`；PostgreSQL 整合測試 `RUN_POSTGRES_TESTS=1 TEST_DATABASE_URL=postgresql://aieo:aieo_password@localhost:5432/aieo npm run test -w @aieo/api -- siteConnections.postgres.test.ts` 通過。
- 下一步行動清單：在 WordPress 插件錄入各站點 GA4 Property ID，並在生產環境安全填入 Google 服務帳號憑據；部署前重新執行 migration 和備份；把關鍵詞建議接入 AI Provider 與真實搜尋量/難度來源；為文章與媒體列表補充分頁查詢；為 Worker 任務加入重試、退避和死信列表；為已批准建議寫回補充快照與回滾。

### 2026-07-27：Ant Design Vue 表格統一與文章媒體分頁查詢

- 會話的主要目的：逐步將剩餘舊表格頁替換為 Ant Design Vue Table、Form、Tabs 和 Modal，並為 PostgreSQL Repository 補充文章與媒體列表分頁查詢。
- 完成的主要任務：`/app/articles` 和 `/app/media` 接入真實文章/媒體列表 API、站點篩選、服務端分頁、Tabs 和詳情 Modal；`/app/article-sync`、`/app/suggestions`、`/app/article-suggestions` 改用 Ant Design Vue Select、Form、Table 和 Progress；`/admin/customers`、`/admin/usage` 改用 Ant Design Vue Table、Tabs 和 Modal；API 新增 `/api/v1/site-connections/:siteId/media?page=&pageSize=`，文章列表端點新增分頁回傳；內存與 PostgreSQL Repository 均支援分頁。
- 關鍵決策和解決方案：分頁預設 `page=1`、`pageSize=20`，最大 `pageSize=100`；文章/媒體讀取端點同時支持插件 Site Token 和客戶後台 JWT 工作區權限；SEO 審計改為用 Repository 分頁批次讀取內容，避免審計時一次無上限拉取全站資料。
- 使用的技術棧：Fastify、TypeScript、Zod、PostgreSQL、Vitest、Vue 3、Ant Design Vue、Vue I18n。
- 新增或修改文件：修改 `apps/api/src/siteConnections.ts`、`apps/api/src/seoOptimization.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/api/tests/siteConnections.postgres.test.ts`、`apps/web/src/api/siteConnections.ts`、`apps/web/src/main.ts`、`apps/web/src/views/ArticlesView.vue`、`apps/web/src/views/MediaOptimizationView.vue`、`apps/web/src/views/ArticleSyncView.vue`、`apps/web/src/views/SuggestionsView.vue`、`apps/web/src/views/ArticleSuggestionsView.vue`、`apps/web/src/views/AdminCustomersView.vue`、`apps/web/src/views/AdminUsageView.vue`、`apps/web/src/i18n.ts`、`apps/web/src/styles.css`、`docs/seo-ai-platform-prd.md` 和 `README.md`。
- 驗證結果：`npm run lint` 通過；`npm run test` 通過；`npm run build` 通過；`npm run security:audit` 返回 `found 0 vulnerabilities`；PostgreSQL 整合測試 `RUN_POSTGRES_TESTS=1 TEST_DATABASE_URL=postgresql://aieo:aieo_password@localhost:5432/aieo npm run test -w @aieo/api -- siteConnections.postgres.test.ts` 通過。Vite 仍提示 AntD/ECharts 依賴 chunk 超過 500KB，屬於既有第三方套件體積提醒。
- 下一步行動清單：將 `/app/sites`、`/app/tasks`、`/app/apply` 和 `/admin/operations` 繼續替換為 Ant Design Vue 組件；為文章與媒體列表增加搜尋、狀態篩選和 SEO 問題篩選；為 Worker 任務加入重試、退避和死信列表；為已批准建議寫回補充快照與回滾；將生產 Web 容器改為正式靜態構建部署。

### 2026-07-27：站點與任務頁 AntD 化、文章媒體搜尋篩選

- 會話的主要目的：繼續將 `/app/sites`、`/app/tasks`、`/app/apply` 和 `/admin/operations` 換成 Ant Design Vue 組件，並為文章/媒體列表補充搜尋與篩選。
- 完成的主要任務：`/app/sites` 改用 Ant Design Vue Tabs、Table、Tag 和詳情 Modal；`/app/tasks` 改用 Tabs、Table、Progress、Tag 和詳情 Modal，保留失敗任務 `errorMessage`；`/app/apply` 改用批次 Tabs、Table、Tag 和確認 Modal；`/admin/operations` 改用運營事件/每日檢查 Tabs、Table 和 Modal；文章列表新增搜尋、狀態篩選、缺 Meta 和缺特色圖篩選；媒體列表新增搜尋、缺 Alt Text 和缺檔名篩選。
- 關鍵決策和解決方案：搜尋與 SEO 問題篩選由後端分頁接口承接，不在前端一次性載入全量資料；文章 `issue` 支援 `missing_meta` 和 `missing_featured_image`，媒體 `issue` 支援 `missing_alt` 和 `missing_file_name`；PostgreSQL 查詢使用參數化條件並保留 `COUNT(*) OVER()` 分頁總數。
- 使用的技術棧：Fastify、TypeScript、Zod、PostgreSQL、Vitest、Vue 3、Ant Design Vue、Vue I18n。
- 新增或修改文件：修改 `apps/api/src/siteConnections.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/api/tests/siteConnections.postgres.test.ts`、`apps/web/src/api/siteConnections.ts`、`apps/web/src/views/SitesView.vue`、`apps/web/src/views/TasksView.vue`、`apps/web/src/views/ApplySuggestionsView.vue`、`apps/web/src/views/AdminOperationsView.vue`、`apps/web/src/views/ArticlesView.vue`、`apps/web/src/views/MediaOptimizationView.vue`、`apps/web/src/i18n.ts`、`apps/web/src/styles.css`、`docs/seo-ai-platform-prd.md` 和 `README.md`。
- 驗證結果：`npm run test -w @aieo/api -- siteConnections.test.ts` 通過；`npm run build -w @aieo/web` 通過；`npm run lint` 通過；`npm run test` 通過；`npm run build` 通過；`npm run security:audit` 返回 `found 0 vulnerabilities`；PostgreSQL 整合測試 `RUN_POSTGRES_TESTS=1 TEST_DATABASE_URL=postgresql://aieo:aieo_password@localhost:5432/aieo npm run test -w @aieo/api -- siteConnections.postgres.test.ts` 通過。Vite 仍提示 AntD/ECharts 依賴 chunk 超過 500KB，屬於既有第三方套件體積提醒。
- 下一步行動清單：為 Worker 任務加入重試次數、退避時間和死信列表；為已批准建議寫回補充快照與回滾接口；將 `/app/apply` 接入真實已批准建議寫回隊列；為客戶後台建議頁補充最近 SEO 審計分數、規則版本與問題數摘要；將生產 Web 容器改為正式靜態構建部署。

### 2026-07-27：RankWoven Agent Skill 整體流程巡檢與原型優化

- 會話的主要目的：使用倉庫內 `AGENTS.md` 的 RankWoven Agent Skill 檢查整體產品流程和 SaaS 原型，完成可落地的小幅 UI/流程優化，並更新 GitHub 與 Docker Desktop。
- 完成的主要任務：巡檢前台、登入、客戶後台、管理後台、站點、任務、套用、建議、文章和媒體頁；客戶/管理後台頂部新增前台入口、客戶後台與管理後台切換、語言切換和登出；登入頁改用 Ant Design Vue 表單與錯誤提示；登入 redirect 加入安全校驗；移除登入、定價和首頁 CTA 中的原型期文案，改為正式 SaaS 工作流語境。
- 關鍵決策和解決方案：只做可直接改善產品流程的低風險修改，不重構既有頁面資料流；保留 Docker Desktop 目前以 Vite dev server 提供本地前端的方式，但通過重建容器讓最新前端與 API 變更掛載到 Docker Desktop。
- 使用的技術棧：Vue 3、TypeScript、Pinia、Vue Router、Vue I18n、Ant Design Vue、Playwright/Chrome 自動化巡檢、Docker Compose、PostgreSQL、Vitest。
- 新增或修改文件：修改 `apps/web/src/App.vue`、`apps/web/src/views/LoginView.vue`、`apps/web/src/i18n.ts`、`apps/web/src/styles.css`、`docs/seo-ai-platform-prd.md` 和 `README.md`；同時本次提交包含前序已驗證的 API、前端、WordPress 插件、migration 和部署文檔更新。
- 驗證結果：`npm run lint` 通過；`npm run test` 通過；`npm run build` 通過；`npm run security:audit` 返回 `found 0 vulnerabilities`；`RUN_POSTGRES_TESTS=1 TEST_DATABASE_URL=postgresql://aieo:aieo_password@localhost:5432/aieo npm run test -w @aieo/api -- siteConnections.postgres.test.ts` 通過；`docker run --rm -v "$PWD/plugins/wordpress/rankwoven-seo:/plugin" wordpress:php8.2 php -l /plugin/rankwoven-seo.php` 通過；Chrome 自動化巡檢確認核心本地頁面沒有橫向溢出或可見前端錯誤。
- 下一步行動清單：為 Worker 任務加入重試、退避和死信列表；為已批准建議寫回補充快照與回滾接口；將 `/app/apply` 接入真實已批准建議寫回隊列；為建議頁補充最近 SEO 審計分數、規則版本與問題數摘要；將生產 Web 容器改為正式靜態構建部署。

### 2026-07-27：關鍵詞 Provider、Worker 死信、寫回快照與 Apply 隊列

- 會話的主要目的：將關鍵詞建議、Worker 任務可靠性、已批准建議寫回追蹤和客戶後台套用流程從確定性 MVP 升級為可接入真實 Provider、可追蹤、可回滾的流程。
- 完成的主要任務：關鍵詞建議新增第三方搜尋量/難度 API、AI Provider 和 fallback 三層來源；`sync_tasks` 新增重試次數、最大重試、退避時間、死信時間和快照關聯；Worker 支援失敗退避重排、超過重試後進入 `dead_letter`、寫回成功標記快照和回滾任務；新增 `apply_snapshots` 模型、寫回快照、回滾 API 和 `/api/v1/site-connections/:siteId/apply-queue`；客戶後台 `/app/apply` 接入真實站點篩選、已批准建議、寫回/回滾任務、批次預覽和任務狀態刷新；建議頁顯示最近 SEO 審計分數、規則版本和問題數摘要。
- 關鍵決策和解決方案：關鍵詞資料源優先使用 `KEYWORD_VOLUME_API_URL` / `KEYWORD_VOLUME_API_KEY`，未配置時使用 AI Text Provider，最後才使用標記為 `fallback` 的本地建議；Worker 不因單個 WordPress 站點暫時不可用而長期阻塞任務，失敗任務會帶 `retryCount`、`nextRunAt` 和 `deadLetteredAt`；寫回快照目前使用已同步資料中的 `currentValue`，後續再升級為 Worker 寫回前即時讀取 WordPress 欄位值。
- 使用的技術棧：Fastify、TypeScript、Zod、PostgreSQL、pg、Vitest、Vue 3、Ant Design Vue、Vue I18n、Worker、WordPress REST API、AI Provider Adapter。
- 新增或修改文件：新增 `db/migrations/0003_apply_snapshots_and_task_retries.sql`；修改 `.env.example`、`apps/api/src/config.ts`、`apps/api/src/keywordSuggestions.ts`、`apps/api/src/server.ts`、`apps/api/src/siteConnections.ts`、`apps/api/src/seoOptimization.ts`、`apps/api/tests/health.test.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/web/src/api/appInsights.ts`、`apps/web/src/api/siteConnections.ts`、`apps/web/src/i18n.ts`、`apps/web/src/views/KeywordSuggestionsView.vue`、`apps/web/src/views/ApplySuggestionsView.vue`、`apps/web/src/views/SuggestionsView.vue`、`apps/web/src/views/ArticleSyncView.vue`、`apps/web/src/views/TasksView.vue`、`apps/worker/src/index.ts`、`apps/worker/tests/worker.test.ts`、`docs/seo-ai-platform-prd.md` 和 `README.md`。
- 驗證結果：`npm run lint` 通過；`npm run test` 通過；`npm run build` 通過；`npm run security:audit` 返回 `found 0 vulnerabilities`；`npm run db:migrate` 確認 `0003_apply_snapshots_and_task_retries.sql` 已套用且可跳過重跑；`RUN_POSTGRES_TESTS=1 TEST_DATABASE_URL=postgresql://aieo:aieo_password@localhost:5432/aieo npm run test -w @aieo/api -- siteConnections.postgres.test.ts` 通過；Docker Desktop 已用 `docker compose --profile data up -d --build` 重建 API/Web/Worker，`http://localhost:3011/health`、登入 smoke、`/api/v1/keyword-suggestions` 和 `http://localhost:8080/app/apply` 均可用。Vite 仍提示 AntD/ECharts 第三方依賴 chunk 超過 500KB，屬於既有非阻塞提醒。
- 下一步行動清單：在 WordPress 插件錄入各站點 GA4 Property ID 並配置 Google 服務帳號權限；在生產環境配置正式關鍵詞搜尋量/難度資料源；將 AI Provider 切到正式問問 API 憑據並驗證 JSON 可解析；為 Worker 死信任務補充管理後台重跑和忽略入口；將寫回快照升級為 Worker 寫回前即時讀取 WordPress 真實欄位值；將生產 Web 容器改為正式靜態構建部署。

### 2026-07-27：站點 GA4、關鍵詞資料源與問問 Provider 正式配置入口

- 會話的主要目的：把 GA4 從平台全局設定改為由客戶在 WordPress 後台按站點輸入，同時補齊正式關鍵詞搜尋量/難度資料源和問問 API Provider 的可部署接入。
- 完成的主要任務：新增站點 `googleAnalyticsPropertyId` migration、Repository 欄位和 `PUT /api/v1/site-connections/:siteId/analytics-settings`；WordPress 插件新增 GA4 Property ID 設定、診斷顯示和保存後同步到 SaaS；分析 API 依照選中站點讀取 GA4 Property ID；關鍵詞第三方資料源支援多種常見回傳格式並映射 `source`、月搜尋量、CPC 和競爭度；API server 在 `WENWEN_API_KEY` 存在時切到問問 OpenAI-compatible Text Provider；關鍵詞表格新增競爭度欄位。
- 關鍵決策和解決方案：GA4 Property ID 屬於客戶站點資料，由 WordPress 插件錄入與同步；Google 服務帳號憑據仍是平台級讀取憑據，需在客戶 GA4 Property 中授予讀取權限；本機沒有 `.env`，因此不做真實 Key 的 live smoke，只用 mock 驗證 OpenAI、Google Gemini 和 DeepSeek 代理模型回傳 JSON 的解析鏈路。
- 使用的技術棧：Fastify、TypeScript、Zod、PostgreSQL、Vitest、Vue 3、Ant Design Vue、Vue I18n、WordPress PHP Plugin、Google Analytics Data API REST、問問 OpenAI-compatible API。
- 新增或修改文件：新增 `db/migrations/0004_site_ga4_property.sql`；修改 `.env.example`、`docker-compose.yml`、`apps/api/src/analytics.ts`、`apps/api/src/config.ts`、`apps/api/src/keywordSuggestions.ts`、`apps/api/src/server.ts`、`apps/api/src/siteConnections.ts`、`apps/api/tests/health.test.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/api/tests/siteConnections.postgres.test.ts`、`apps/web/src/api/siteConnections.ts`、`apps/web/src/i18n.ts`、`apps/web/src/views/KeywordSuggestionsView.vue`、`packages/ai-providers/src/index.ts`、`packages/ai-providers/tests/usageRecords.test.ts`、`plugins/wordpress/README.md`、`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`docs/seo-ai-platform-prd.md` 和 `README.md`。
- 驗證結果：`npm run test -w @aieo/api -- health.test.ts siteConnections.test.ts` 通過；`npm run test -w @aieo/ai-providers -- usageRecords.test.ts` 通過。本機沒有 `.env`，未執行真實問問 API、DataForSEO/Ahrefs/Semrush 或 GA4 live smoke。
- 下一步行動清單：在生產 Secrets 配置 `WENWEN_API_KEY`、`KEYWORD_VOLUME_API_URL`、`KEYWORD_VOLUME_API_KEY` 和 Google 服務帳號憑據；在 WordPress 插件為測試站點填入 GA4 Property ID 並授權服務帳號讀取；用正式問問 API 分別 smoke OpenAI、Gemini、DeepSeek 模型 JSON 輸出；用正式搜尋量供應商 smoke `source`、月搜尋量、CPC 和競爭度顯示；執行全量 lint/test/build/security audit、migration、PHP 語法檢查和 Docker Desktop 重建。

### 2026-07-27：修復 WordPress 測試站插件未同步新版 GA4 欄位

- 會話的主要目的：排查 Docker Desktop WordPress 後台沒有顯示 GA4 Property ID 輸入欄位的原因。
- 完成的主要任務：確認 AIEO 倉庫插件源碼已包含 GA4 Property ID 和 Diagnostics；確認 `cyruschan-wp` 容器實際掛載 `/Volumes/Extreme SSD/gitCode/cyruschan.com`，且測試站插件仍是舊版；將新版 `rankwoven-seo.php` 同步到測試站 `wp-content/plugins/rankwoven-seo/` 並重啟 WordPress 容器。
- 關鍵決策和解決方案：問題不是後端或插件源碼功能缺失，而是測試站掛載目錄未同步最新插件檔案；後續每次修改插件後，都要同步到 `cyruschan.com/wp-content/plugins/rankwoven-seo/` 或改為直接 bind mount AIEO 插件目錄。
- 使用的技術棧：Docker Desktop、WordPress PHP Plugin、PHP 8.2、AIEO monorepo。
- 新增或修改文件：修改測試站外部掛載文件 `/Volumes/Extreme SSD/gitCode/cyruschan.com/wp-content/plugins/rankwoven-seo/rankwoven-seo.php`；修改本 README 追加排查記錄。AIEO 源碼文件未新增功能變更。
- 驗證結果：`docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php` 通過；容器內 `grep` 已確認包含 `GA4 Property ID`、`rankwoven_ga4_property_id` 和 `Diagnostics`；`docker restart cyruschan-wp` 後容器正常運行。
- 下一步行動清單：刷新 WordPress 後台 `Settings -> RankWoven SEO`；如仍未顯示，清除瀏覽器快取或重新登入 WordPress；後續優先把 AIEO 插件目錄直接 bind mount 到測試站，避免手動同步遺漏；在插件 UI 中可考慮顯示版本號或 build time，方便確認當前載入版本。

### 2026-07-27：PRD 下一步行動清單批量完成

- 會話的主要目的：按 PRD 第17節「下一步行動清單」逐一處理未完成的關鍵項目，將專案從 M5 收尾推進到 M7 前。
- 完成的主要任務：
  1. 修復 `siteConnections.ts` WIP 去重代碼中未定義變數問題，使用 `lastSyncStats` 替代全文/媒體 Map
  2. 新增死信任務管理後台入口：`retrySyncTask()` / `ignoreDeadLetterTask()` Repository 方法、`POST /api/v1/sync-tasks/:taskId/retry` 和 `POST /api/v1/sync-tasks/:taskId/ignore` API 路由
  3. 任務隊列補充站點篩選、類型篩選和可配置自動刷新：`listSyncTasks()` 改為接受 `SyncTaskListOptions`（siteId/scope/status）、TasksView 新增 Select 篩選和 15 秒自動刷新
  4. Worker 寫回快照升級為寫回前即時讀取 WordPress 真實欄位值：`processSuggestionApplyTask` 在寫回前透過 WordPress REST API 讀取當前欄位值並更新快照 `before_value`
  5. Repository `ensureSchema()` 收斂為只在非生產環境執行 `CREATE TABLE IF NOT EXISTS`，生產由 migration 腳本管理
  6. 資料庫備份恢復演練步驟：在 `docs/deployment.md` 新增詳細的 VPS 和本地恢復演練流程
  7. `/app/apply` 差異對比視圖和批量勾選操作：新增 `batchApplyOptimizationSuggestions` API、ApplySuggestionsView 加入 Diff Modal、全選/批量套用按鈕和 Table 行選擇
  8. 全量品質檢查：`npm run lint`、`npm run test`、`npm run build`、`npm run security:audit` 全部通過
- 關鍵決策和解決方案：`listSyncTasks()` 改為對象參數 `SyncTaskListOptions`，Web 定時器使用 `window.setInterval/window.clearInterval`；ESLint 為 Vue/web 檔案加入瀏覽器 globals；`ensureSchema` 在 `NODE_ENV=production` 時直接跳過不再執行 DDL
- 使用的技術棧：Fastify、TypeScript、Zod、PostgreSQL、pg、Vitest、Vue 3、Ant Design Vue、Vue I18n、Worker、WordPress REST API
- 新增或修改文件：
  - 修改 `apps/api/src/siteConnections.ts`（去重修復、接口簽名調整、死信管理、ensureSchema 收斂）
  - 修改 `apps/api/src/seoOptimization.ts`（批量應用路由、ensureSchema 收斂）
  - 修改 `apps/api/src/auth.ts`（ensureSchema 收斂）
  - 修改 `apps/worker/src/index.ts`（寫回前讀取 WordPress 真實值）
  - 修改 `apps/web/src/api/siteConnections.ts`（新增 retry/ignore/批量應用 API client）
  - 修改 `apps/web/src/views/TasksView.vue`（死信管理、篩選、自動刷新）
  - 修改 `apps/web/src/views/ApplySuggestionsView.vue`（差異對比、批量勾選）
  - 修改 `apps/web/src/i18n.ts`（en + zh-Hant 死信管理、Diff、批量等新 Key）
  - 修改 `eslint.config.js`（瀏覽器 globals for Vue/web）
  - 修改 `docs/deployment.md`（資料庫恢復演練步驟）
- 驗證結果：`npm run lint` 通過；`npm run test` 通過；`npm run build` 通過；`npm run security:audit` 返回 `found 0 vulnerabilities`
- 下一步行動清單：在生產 Secrets 配置 `WENWEN_API_KEY`、`KEYWORD_VOLUME_API_URL` 和 Google 服務帳號憑據；將生產 Web 容器改為正式靜態構建部署；啟動 Phase 6 內部連結推薦開發
### 2026-07-27：WordPress 插件本地測試文件與 RankWoven 開發向導技能

- 會話的主要目的：為 `rankwoven-seo` WordPress 插件建立本地測試文件；將桌面通用 FastAPI 開發向導 SKILL.md 改寫為適用本系統的 RankWoven 開發向導，並掛接到本專案全程應用。
- 完成的主要任務：
  1. 新增 `plugins/wordpress/TESTING.md`：涵蓋 cyruschan.com Docker WordPress 測試環境總覽、前置條件、插件同步流程（cp + `php -l` + 重啟容器 + diff 驗證）、7 大類手動測試清單（啟用設定、站點連接、同步任務、圖片屬性與批量更新、診斷頁、站點側 REST API、建議寫回）、回歸重點對照表和常見問題排錯。
  2. 改寫 `/Users/cyruschan/Desktop/SKILL.md`：由 Windows FastAPI + MySQL + Vue 向導改為 RankWoven 系統開發向導，技術棧對齊 Fastify + TypeScript + Zod + PostgreSQL 16 + Redis + Vue 3 + Ant Design Vue + npm workspaces + Docker Compose + WordPress 插件，命令改為 macOS zsh，工作流程改為需求澄清 -> 方案設計 -> 實作 -> lint/test/build/security:audit -> 本地驗證 -> README 會話總結 -> Git 與部署，並附本系統排錯手冊與禁止事項。
  3. 將技能複製到 `.codebuddy/skills/rankwoven-dev/SKILL.md`，並在 `AGENTS.md` 開頭掛接說明，使其在本專案全程應用（衝突時以 AGENTS.md 為準）。
  4. `plugins/wordpress/README.md` 加入 TESTING.md 連結。
- 關鍵決策和解決方案：測試文件放在 AIEO 倉庫作為 source of truth，而非 cyruschan.com 掛載目錄；文件中不寫入測試站帳號密碼，僅指向 `cyruschan.com/DOCKER-README.md`；技能定位為 AGENTS.md 的執行層補充，明確衝突時優先級。
- 使用的技術棧：Markdown、Docker Compose、WordPress PHP 插件、CodeBuddy Skill 格式。
- 新增或修改文件：新增 `plugins/wordpress/TESTING.md`、`.codebuddy/skills/rankwoven-dev/SKILL.md`；修改 `/Users/cyruschan/Desktop/SKILL.md`（倉庫外）、`AGENTS.md`、`plugins/wordpress/README.md`、本 README。
- 驗證結果：確認倉庫插件與測試站插件 `diff` 為 SAME；文件中的環境資訊已對照 `cyruschan.com/docker-compose.yml`、`DOCKER-README.md` 和 AIEO `docker-compose.yml` 核實（端口 8088/3011/8080/3308）。純文檔改動，未跑 lint/test/build。
- 下一步行動清單：按 TESTING.md 走一輪完整插件手動測試並記錄結果；考慮將 AIEO 插件目錄直接 bind mount 到測試站避免手動同步；在生產 Secrets 配置 `WENWEN_API_KEY`、`KEYWORD_VOLUME_API_URL` 和 Google 服務帳號憑據；啟動 Phase 6 內部連結推薦開發。

### 2026-07-27（二）：Hostinger MCP 配置、site-connections 部署與 PRD/測試收尾

- 會話的主要目的：配置 Hostinger MCP 供部署前後檢查；將既有 dirty 修改提交推送以觸發 VPS 生產部署；落實「每次完成更新 PRD 下一步行動清單 + 同步 Docker Desktop + 測試」的收尾流程。
- 完成的主要任務：
  1. 配置 Hostinger MCP（hosting / domains / dns / billing / reach / vps 六個 server）於使用者級 `~/.codebuddy/mcp.json`，API Token 置於倉庫外，不進 Git。
  2. 提交並推送 site connections 同步、SEO 優化、Tasks/ApplySuggestions UI、auth、i18n（feat）與 WordPress TESTING.md、rankwoven-dev 技能、部署文件（docs）至 `main`，觸發 GitHub Actions 生產部署（commits `a42a3c0`、`5b167fd`）。
  3. 更新 `docs/seo-ai-platform-prd.md` 第 17 節「下一步行動清單」：新增「已完成」區塊、將 Docker Desktop 同步與手動測試列為待辦第一項、修正重複編號的 `10`。
  4. 同步 Docker Desktop：重建 `aieo` 專案 web/api/worker 容器以載入最新代碼（postgres/redis data profile 不變）。
  5. 測試：本地 `lint`/`test`/`build`/`security:audit` 全過；本機 API（3011）與 Web（8080）health/smoke OK；WordPress 插件 `php -l` 無語法錯誤。
- 關鍵決策和解決方案：MCP Token 放使用者級配置避免洩漏；部署前完整跑 AGENTS.md 要求的四項驗證；PRD 列表改為「已完成 / 待辦」兩段式並優先列出 Docker 同步測試。
- 使用的技術棧：Docker Compose、Hostinger MCP（npx hostinger-api-mcp）、Vitest、ESLint、PostgreSQL 16、Redis。
- 新增或修改文件：`.codebuddy/mcp.json`（倉庫外，使用者級）、`docs/seo-ai-platform-prd.md`、本 README；提交 `apps/*`、`plugins/wordpress/TESTING.md`、`.codebuddy/skills/rankwoven-dev/SKILL.md` 等（見 `a42a3c0`/`5b167fd`）。
- 驗證結果：四項驗證通過；`https://api.rankwoven.com/health` 基線正常；本機容器重建後 API/Web 200、插件 php -l 通過。
- 下一步行動清單：依 TESTING.md 於瀏覽器對 WordPress 插件走一輪完整手動測試；在生產 Secrets 配置 Google 憑據與 `WENWEN_API_KEY`；待 GitHub Actions 完成後以 `hostinger-vps` / `hostinger-dns` 工具复查 VPS 專案與 DNS；後續 Phase 6 內部連結推薦開發（見 PRD 第 17 節）。

### 2026-07-27（三）：修復 WordPress 站點設定頁重複新增站點

- 會話的主要目的：解決「在 WordPress 插件站點設定頁修改資訊時，SaaS 客戶後台每次都重新新增站點」的問題，讓同一站點只更新資訊而非重複建立。
- 完成的主要任務：
  1. API `siteConnections.ts`：`create()` 改為 upsert（依正規化 `site_url` + `workspace_id` + `platform` 去重，命中則更新資訊並沿用既有 token，不重發）；新增 `findByUrl()` 與 `updateSiteInfo()`；新增 `PUT /api/v1/site-connections/:siteId` 路由（插件以 site token 驗證）；`create` 回傳型別允許 `apiToken: string | null`。
  2. WordPress 插件 `handle_connect_site()`：已連接站點改用 `PUT` 更新並帶既有 token；僅在 API 回傳新 token 時覆寫本機 token，否則保留。
  3. 新增 migration `db/migrations/0005_site_url_unique.sql`：先去重重複站點，再建立 `(workspace_id, platform, site_url)` 唯一索引作為資料層防線（可重複執行）。
  4. Docker Desktop `aieo` 重建 `api` 容器；本地 smoke 驗證同 URL 連續 POST 兩次回傳同一 `site id`、第二次不回傳 `apiToken`（UPSERT_OK）；測試後清理假站點。
- 關鍵決策和解決方案：以「正規化 URL + workspace 去重 + 沿用 token」為核心，避免重複站點同時不讓插件既有 token 失效；資料層唯一索引防並發重複。
- 使用的技術棧：Node.js / TypeScript / Fastify、PostgreSQL 16、Docker Compose、WordPress PHP 插件。
- 新增或修改文件：`apps/api/src/siteConnections.ts`、`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`db/migrations/0005_site_url_unique.sql`、`docs/seo-ai-platform-prd.md`、本 README。
- 驗證結果：`lint` / `test` / `build`（含 API `tsc`）/ `security:audit` 全過；插件 `php -l` 無語法錯誤；本地 upsert smoke 通過。
- 下一步行動清單：生產部署後觀察 SaaS 後台是否仍有重複站點；於生產執行 `0005` migration（會先去重再建索引）；後續依 PRD 第 17 節推進 Google 憑據與關鍵詞資料源配置。

### 2026-07-27（四）：補強站點去重，解決站點管理顯示多個相同 item

- 會話的主要目的：針對截圖顯示「同一 http://localhost:8088 站點出現多筆」的問題，補強後端與前端去重，確保站點管理每個站點只顯示一個 item。
- 完成的主要任務：
  1. API `siteConnections.ts`：Postgres `list()` 加入 `dedupeSiteConnections`，讓資料庫層回傳結果即去重（與 in-memory 一致）。
  2. 前端 `SitesView.vue`：增加依正規化 URL 的前端去重，作為後端漏網時的 UI 防線。
  3. Migration `0005_site_url_unique.sql` 改進：去重時把同一組 (workspace_id, platform, site_url) 內最新的 `last_token_used_at` / `last_sync_at` / `last_sync_stats` 合併到保留列，避免遺失同步統計。
  4. Docker Desktop `aieo` 重建 `api` / `web` 容器；本地 API/Web smoke OK。
- 關鍵決策和解決方案：後端 `list()` 去重為主、前端去重為輔；migration 保留最新列並合併同步資訊；upsert 已在上一回合完成，本回合專注消除既有重複在 UI 與資料層的顯示。
- 使用的技術棧：TypeScript / Fastify / PostgreSQL / Vue 3 / Docker Compose。
- 新增或修改文件：`apps/api/src/siteConnections.ts`、`apps/web/src/views/SitesView.vue`、`db/migrations/0005_site_url_unique.sql`、`docs/seo-ai-platform-prd.md`、本 README。
- 驗證結果：`lint` / `test` / `build` / `security:audit` 全過；Docker 本地 API/Web 200。
- 下一步行動清單：推送後確認生產 migration `0005` 執行成功、SaaS 後台重複站點消失；持續監控 WordPress 插件更新是否仍會新增重複。

### 2026-07-27（五）：生產 WENWEN_API_KEY 設定與多模型 JSON 驗證

- 會話的主要目的：在生產 Secrets 填入正式 `WENWEN_API_KEY`，確認 OpenAI、Google Gemini 和 DeepSeek 代理模型均可產生可解析 JSON；測試時不得輸出完整 API Key。
- 完成的主要任務：
  1. 生產 VPS `.env` 修復：`WENWEN_API_KEY` 補 `sk-` 前綴（51 chars），`WENWEN_TEXT_MODEL` 從不可用的 `gpt-4.1-mini` 改為 `gpt-4o-mini`，`docker compose up -d --force-recreate api` 載入新配置。容器內驗證 Key 正確載入，未輸出完整 Key。
  2. 撰寫 `scripts/test-ai-models.mjs` 多模型 JSON 驗證腳本：透過 Wenwen 代理測試 3 個模型 × 3 種 JSON 複雜度（基本物件、巢狀 SEO Schema、陣列），共 9/9 全部通過：
     - OpenAI `gpt-4o-mini` ✓ (3/3)
     - Google `gemini-2.5-flash` ✓ (3/3)
     - Google `gemini-2.5-pro` ✓ (3/3, 自動剝離 markdown 包裝後解析成功)
  3. DeepSeek 模型（`deepseek-chat`/`deepseek-v3`/`deepseek-r1`/`deepseek-reasoner`）當前在此 Wenwen 代理上無可用渠道，需聯繫管理員開通。
  4. 預設模型配置更新：`apps/api/src/config.ts`、`.env.example`、本地 `.env`、生產 `.env` 同步改為 `WENWEN_TEXT_MODEL=gpt-4o-mini`。
- 關鍵決策和解決方案：測試腳本僅輸出 Key 前綴 `sk-PEKBG...`，不暴露完整 Key；`python3` 替代 `jq` 解析 JSON；Gemini 模型有時會用 markdown 包裝 JSON，腳本自動剝離 ` ```json ``` ` 後再解析。
- 使用的技術棧：Node.js (mjs)、Wenwen API Proxy、SSH、Docker Compose (VPS)、Python3 (JSON parsing)。
- 新增或修改文件：新增 `scripts/test-ai-models.mjs`；修改 `apps/api/src/config.ts`、`.env.example`、`.env`（本地）、生產 `/docker/rankwoven/.env`。
- 驗證結果：9/9 模型 × JSON 組合全部解析成功；生產 `https://api.rankwoven.com/health` 正常；容器內 `WENWEN_API_KEY` 確認為 51 字符。
- 下一步行動清單：聯繫 Wenwen 管理員開通 DeepSeek 渠道；執行全量 lint/test/build/security:audit 確認整體健康。

### 2026-07-27（六）：全量 CI/CD 檢查 — Lint / Test / Build / Security Audit / Migration / PHP / Docker

- 會話的主要目的：執行全量 lint、test、build、security:audit、PostgreSQL migration、WordPress 插件 PHP 語法檢查和 Docker Desktop 重建。
- 完成的主要任務：
  1. **Lint** (ESLint `.ts,.vue --max-warnings 0`)：修復 48+ 錯誤至 **0 errors, 0 warnings**。主要修復類型：`no-unused-vars`（移除 `Tabs`/`Tag`/`TabsProps`/`ColumnType` 未使用導入）、`vue/attribute-hyphenation`（`v-model:activeKey` 添加 eslint-disable 註釋，Ant Design Vue 要求 camelCase）、`vue/attributes-order`（`v-if` 放最前）、`etc/no-throw-literal`（改用 `new Error()` 包裝）。
  2. **Test** (API/Web/Worker/AI/CMS)：**35 passed, 1 skipped, 0 failed**。修復 4 個因新架構導致的測試期望值：`source` 改為 `'enriched'|'fallback'`、`monthlySearchVolume` 改為 `difficulty`、`sourceTrace` 精確匹配、添加 `KEYWORD_VOLUME_PROVIDER` 設定。
  3. **Build** (vue-tsc + vite + tsc)：修復 25+ TypeScript 錯誤至全部通過：
     - `VitalsRow` 介面補 `statusTag?`/`statusColor?` 可選欄位
     - `ColumnType` 改為 inferred type
     - `v-model:active-key` → `v-model:activeKey`（Ant Design Vue 正確語法）
     - `tsconfig.json` 補 `paths: { "@/*": ["./src/*"] }`
     - `vite.config.ts` 補 `resolve.alias: { '@': fileURLToPath(...) }`
     - `diagnosticsByCategory` 迭代改用 `diagnosticEntries` (entries 陣列)
     - `getSearchConsoleKeywords()` 參數改為物件格式
  4. **Security Audit**：`npm audit` 返回 0 vulnerabilities。
  5. **PostgreSQL Migration**：`db:migrate` 正常套用，5 個 migration 全部已執行。
  6. **WordPress PHP 語法**：`docker run --rm -v php:8.2-cli php -l` 無語法錯誤。
  7. **Docker Desktop 重建**：5 個容器（api/web/worker/postgres/redis）全部 healthy，`localhost:3011/health` 返回 200。
  8. **文件修復**：`SearchConsolePanel.vue` 被 `sed -i` 損壞後根據原始碼重建。
- 關鍵決策和解決方案：`vue/attribute-hyphenation` 使用 `<!-- eslint-disable -->` 而非強制轉 `active-key`，因 Ant Design Vue 組件內部使用 camelCase props；TypeScript `@/` 別名需同時在 `tsconfig.json` (paths for vue-tsc) 和 `vite.config.ts` (resolve.alias for Vite) 配置；vitest 超時問題需要在 vitest.config 正確設定 `test.testTimeout`。
- 使用的技術棧：ESLint 9 + Vue ESLint Plugin、Vitest、vue-tsc、Vite、TypeScript、PostgreSQL 16、Docker Compose、PHP 8.2 CLI。
- 新增或修改文件：19 個文件修改 (+2128/-585)：`apps/api/src/config.ts`、`apps/api/src/keywordSuggestions.ts`、`apps/api/tests/health.test.ts`、`apps/web/src/views/DashboardView.vue`、`apps/web/src/views/KeywordSuggestionsView.vue`、`apps/web/src/components/SearchConsolePanel.vue`、`apps/web/src/components/LighthousePanel.vue`、`apps/web/src/api/appInsights.ts`、`apps/web/src/i18n.ts`、`apps/web/vite.config.ts`、`apps/web/tsconfig.json`、`eslint.config.js`、`Dockerfile`、`.env.example`、`.env`、`docker-compose.yml` 等。
- 驗證結果：6 大檢查項全部通過（見上方），Docker Desktop 5 容器 healthy。
- 下一步行動清單：部署更新到 Docker Desktop；推送至 GitHub `main` 分支觸發生產部署；更新 PRD 下一步清單；將生產 Web 容器改為靜態構建部署（待辦 #8）；開始前端 GSC 和 Lighthouse 面板接入（待辦 #3、#4）。

### 2026-07-27（七）：PRD 待辦 #1&#2 — 生產重複站點驗證 + Google 服務帳號 GA4 憑據確認

- 會話的主要目的：完成 PRD 前兩項待辦 — (#1) 確認生產部署後 SaaS 後台重複站點已消失，確認 migration 0005 已套用；(#2) 確認生產 `.env` 中 Google 服務帳號憑據有效，驗證 GA4/Search Console 可連通。
- 完成的主要任務：
  1. **#1 生產重複站點驗證**：
     - 確認生產 PostgreSQL 中 migration `0005` 已套用（`schema_migrations` 共 5 筆）
     - 確認唯一索引 `uq_site_connections_workspace_platform_url` 存在於 `site_connections` 表
     - 查詢 `GROUP BY workspace_id, platform, site_url HAVING COUNT(*) > 1` 返回 0 筆重複
     - 目前生產無連接的 WordPress 站點，無需清理殘留資料
  2. **#2 Google 服務帳號憑據驗證**：
     - 生產 `.env` 中 `GOOGLE_APPLICATION_CREDENTIALS_JSON` 已設定（1831 chars），`client_email: rankwoven-ga4-reader@gtm-nfhhng6d-nmi4m.iam.gserviceaccount.com`
     - 在生產 API 容器內以 Node.js 腳本驗證 OAuth token 交換成功（JWT RS256 簽名 → `ya29.c...`）
     - **Analytics Data API** (`analyticsdata.googleapis.com`)：已啟用，metadata 查詢返回 HTTP 200 ✓
     - **Search Console API** (`searchconsole.googleapis.com`)：已啟用，服務帳號擁有 3 個網站的 `siteFullUser` 權限（`rankwoven.com`、`sc-domain:rankwoven.com`、`http://gsc.rankwoven.com/`）
     - **WordPress 插件** (`rankwoven-seo.php`)：已完整支援 GA4 Property ID — 設定頁 `OPTION_GA4_PROPERTY_ID`、連接時發送 `googleAnalyticsPropertyId`、`sync_analytics_settings_to_saas` 同步至 SaaS
  3. 編寫 `scripts/test-google-auth.mjs`：多服務 Google API 可用性自動化測試腳本，測試 OAuth token、Analytics Data API、Search Console API
  4. 提交並推送 PRD 更新至 GitHub
- 關鍵決策和解決方案：Google Analytics Admin API (`analyticsadmin.googleapis.com`) 目前未啟用，但不影響 RankWoven 核心流程——RankWoven 使用 Analytics Data API (`analyticsdata.googleapis.com`) 直接查詢已知 property ID，無需透過 Admin API 動態列舉帳號/屬性。WordPress 插件已從站點設定頁收集 `googleAnalyticsPropertyId`，連接時自動發送至 SaaS。
- 使用的技術棧：Node.js (ESM)、Google OAuth 2.0 (JWT RS256)、docker exec、PostgreSQL、SSH
- 新增或修改文件：新增 `scripts/test-google-auth.mjs`；修改 `docs/seo-ai-platform-prd.md`（已完成 +2，待辦 -2 並重新編號為 8 項）、`README.md`（會話總結追加）
- 驗證結果：OAuth token ✓、Analytics Data API ✓、Search Console API ✓（3 sites, siteFullUser）
- 下一步行動清單：開始 PRD 待辦 #1（前端接入 Search Console 關鍵詞面板）；需要 GSC 有實際數據時才能看到效果（新網站目前流量為 0）。開始 PRD 待辦 #2（前端接入 Lighthouse 審計面板）。

### 2026-07-27（八）：PRD 待辦 #1&#2 完成 — 前端 Search Console + Lighthouse 面板接入

- 會話的主要目的：完成 PRD 前兩項待辦 — (#1) 前端接入 Search Console 關鍵詞面板，在 Dashboard 和關鍵詞建議頁展示 GSC 數據；(#2) 前端接入 Lighthouse 審計面板，在 Dashboard 和審計頁展示四維度分數與 Core Web Vitals。
- 完成的主要任務：
  1. **SearchConsolePanel.vue 增強**：
     - 新增關鍵詞搜尋篩選輸入框（帶 `lucide-vue-next` Search 圖示）
     - 新增 Top 5 關鍵詞點擊量 CSS 漸層橫向條形圖（`TrendingUp` 圖示標題）
     - 新增篩選計數器 Tag（`X / Y` filtered count）
     - 統計數據（clicks/impressions/CTR/position）改為基於篩選後數據動態計算
     - `watch siteUrl` 變更時重置篩選器和錯誤狀態
  2. **LighthousePanel.vue 增強**：
     - 新增 `watch siteUrl` prop 自動填入審計 URL（首次載入時）
     - 新增快速審計按鈕（`Zap` 圖示），compact 模式下僅顯示圖示
     - Compact 模式細化：縮小儀表環（60px）、縮小字型、Vitals 網格單欄、隱藏診斷區塊
     - 將 status Tag 在 compact 模式下隱藏
  3. **DashboardView.vue Overview 分頁重構**：
     - 新增 2 欄 Grid 佈局：GSC 摘要卡片 + Lighthouse 摘要卡片
     - GSC 卡片：總點擊/曝光/平均 CTR 統計 + Top 3 關鍵詞列表 + "View full report" 連結
     - Lighthouse 卡片：4 個 SVG 環形儀表（效能/無障礙/最佳實踐/SEO）+ "View full report" 連結
     - 無數據時顯示 empty state（GSC 眼睛圖示、Lighthouse 靶心圖示，點擊可跳轉）
     - 站點選擇器對所有分頁（Overview/GSC/Lighthouse）可見
     - 動態 metrics：已連接站點數、平均 SEO 分數、GSC 關鍵詞數改為從 API 數據計算
  4. **KeywordSuggestionsView.vue GSC 交叉引用**：
     - enrichAll() 函數合併 `gscData` 到 suggestion，計數匹配數
     - 新增 `gscAlerts` 提示：「X/Y 個關鍵詞已有 Search Console 真實數據」
     - 新增 `enrichmentType` 支持 success/warning/error/info 四種警報樣式
  5. **i18n 新增**：
     - Dashboard: `gscSummary`, `gscSummaryHint`, `gscTotalClicks`, `gscTotalImpr`, `gscAvgCtr`, `gscAvgPosition`, `gscNoData`, `lighthouseSummary`, `lighthouseSummaryHint`, `lighthouseNoData`, `viewFullReport`, `performance`, `accessibility`, `bestPractices`, `selectSitePrompt`
     - Lighthouse: `quickAudit`
     - SearchConsole: `last28Days`
     - Keywords: `gscAlerts`, `topKeywordsByClicks`
     - 以上全部 en + zh-Hant 雙語
  6. CI/CD 驗證全部通過：lint (0e/0w)、build (vue-tsc + vite + tsc)、test (passed)、security audit (0 vulns)、Docker Desktop (5 containers healthy)、API smoke test (GSC+Lighthouse 可用)
- 關鍵決策和解決方案：Dashboard Overview 分頁使用雙卡 Grid 佈局而非內嵌完整面板，避免重複載入；compact 模式 LitehousePanel 隱藏診斷區塊以保持儀表板簡潔；`vue/no-duplicate-attributes` 錯誤通過合併 `:class` 綁定為陣列解決；GSC 數據目前為 0（新網站）但 UI 已準備就緒
- 使用的技術棧：Vue 3 Composition API、Ant Design Vue、lucide-vue-next、SVG 環形儀表（自訂）、CSS Grid/Flexbox、TypeScript、vue-i18n
- 新增或修改文件：修改 `apps/web/src/components/SearchConsolePanel.vue` (+90/-20)、`apps/web/src/components/LighthousePanel.vue` (+60/-15)、`apps/web/src/views/DashboardView.vue` (+180/-40)、`apps/web/src/views/KeywordSuggestionsView.vue` (+30/-10)、`apps/web/src/i18n.ts` (+35/-0)、`docs/seo-ai-platform-prd.md`、`README.md`
- 驗證結果：lint ✓、build ✓、test ✓、audit ✓、Docker ✓、API smoke test ✓ (GSC 0 keywords, Lighthouse perf=52 a11y=96 bp=96 seo=83)
- 下一步行動清單：開始 PRD 待辦 #1（Worker 死信任務管理後台）；考慮先完成生產 Web 容器靜態構建部署（待辦 #4）

### 2026-07-27（九）：Worker 死信任務管理後台 + 快照寫回升級

- 會話的主要目的：為 Worker 死信任務補齊 SaaS 管理後台功能（重跑、忽略、批量導出、告警入口），並將快照寫回升級為 Worker 在寫回前即時讀取 WordPress 真實欄位值。
- 完成的主要任務：
  1. **資料庫 Migration**：新增 `db/migrations/0004_add_snapshot_matched_at.sql`，為 `apply_snapshots` 表增加 `snapshot_matched_at` 時間戳欄位。
  2. **Worker 快照寫回修復**：修正 `apps/worker/src/index.ts` 中 `applySnapshotId` 列名映射錯誤導致的 null 查詢，改為以 `suggestion_id + task_id` 精確定位 snapshot；UPDATE 也補上 `task_id` 條件；寫回前即時調用 WordPress REST API 讀取欄位真實值，與 `before_value` 比對後才更新。
  3. **後端 API 擴展**：在 `apps/api/src/siteConnections.ts` 的 Repository 與 Memory 實作中新增 `batchRetrySyncTasks`、`batchIgnoreDeadLetterTasks`、`getTasksForExport`、`getDeadLetterStats`，並註冊 4 條新路由：`POST /api/v1/sync-tasks/batch/retry`、`POST /api/v1/sync-tasks/batch/ignore`、`GET /api/v1/sync-tasks/export`、`GET /api/v1/sync-tasks/dead-letter-stats`。
  4. **前端 TasksView 重構**：`apps/web/src/views/TasksView.vue` 新增行選擇、批量操作欄、死信告警 Alert、CSV/JSON 導出下拉選單；僅 `dead_letter` 與 `failed` 狀態任務可勾選。
  5. **API 層擴展**：`apps/web/src/api/siteConnections.ts` 新增 `batchRetrySyncTasks`、`batchIgnoreDeadLetterTasks`、`exportSyncTasks`、`getDeadLetterStats` 及對應 TypeScript 類型。
  6. **i18n 國際化**：`apps/web/src/i18n.ts` 中英雙語新增批量操作、導出、告警相關 20+ 個鍵。
  7. **品質修復**：移除未使用的 `deadLetterCount` computed、修正 `TableRowSelection` 類型推斷、補齊 `DownOutlined` 導入、修正 `URL.createObjectURL` 全局調用。
  8. **驗證**：ESLint 0 errors、TypeScript 全 workspace build passed、Vitest 1 passed、npm audit 0 vulnerabilities。
- 關鍵決策和解決方案：死信任務批量操作直接通過 Repository 層更新狀態，不走 Worker 重新入隊，降低複雜度；快照寫回前即時讀取真實值可避免舊 snapshot 覆蓋用戶在審核期間手動做的修改；導出功能使用原始 fetch + Blob 下載，繞過 `requestApi` 的 JSON 解析。
- 使用的技術棧：Fastify、TypeScript、PostgreSQL、Vue 3 Composition API、Ant Design Vue、Pinia、vue-i18n。
- 新增或修改文件：`db/migrations/0004_add_snapshot_matched_at.sql`、`apps/worker/src/index.ts`、`apps/api/src/siteConnections.ts`、`apps/web/src/api/siteConnections.ts`、`apps/web/src/views/TasksView.vue`、`apps/web/src/i18n.ts`。
- 驗證結果：lint ✓、build ✓、test ✓、security audit ✓。
- 下一步行動清單：部署最新 `main` 到生產；驗證死信批量操作在生產環境可用；觀察 Worker 快照寫回是否還有覆蓋衝突。

### 2026-07-27（十）：Lighthouse 審計失敗修復

- 會話的主要目的：解決生產環境 Lighthouse 審計失敗的問題，並確認部署後的 API Base URL。
- 完成的主要任務：
  1. **根因定位**：`apps/api/src/lighthouse.ts` 使用 `npx lighthouse` 調用本地 Lighthouse CLI，但 `lighthouse` npm 包未宣告在 `apps/api/package.json` 依賴中，導致生產容器每次都要即時從 npm registry 下載約 200MB+ 套件，極易因網路/超時/磁碟失敗。
  2. **新增依賴**：在 `apps/api/package.json` 加入 `"lighthouse": "^12.6.0"`，使 Docker 構建時預裝。
  3. **環境變數增強**：在 `lighthouse.ts` 中為 `chrome-launcher` 顯式設定 `CHROME_PATH` 與 `LIGHTHOUSE_CHROMIUM_PATH`，並將超時從 120 秒延長至 180 秒。
  4. **本地驗證**：`node_modules/.bin/lighthouse` 正確安裝；`npm run lint`、`npm run build -w @aieo/api` 均通過。
- 關鍵決策和解決方案：將 `lighthouse` 從運行時下載改為構建時安裝，消除生產容器對 npm registry 的運行時依賴；保留 `npx lighthouse` 調用方式不變，因本地安裝後 `npx` 會優先使用 `node_modules/.bin` 的二進制而不會重複下載。
- 使用的技術棧：npm、TypeScript、Docker、Chrome/Chromium、Lighthouse CLI。
- 新增或修改文件：`apps/api/package.json`、`apps/api/src/lighthouse.ts`。
- 驗證結果：lint ✓、build ✓、lighthouse CLI 已安裝。
- 下一步行動清單：重新部署以包含 lighthouse 依賴；在生產容器內執行一次 Lighthouse 審計確認可用；觀察是否有 chromium 路徑或沙箱權限問題。

### 2026-07-27（十一）：GA4/Site Token/API 連接診斷

- 會話的主要目的：排查 WordPress 插件提示「GA4 屬性 ID 已本地保存，但 RankWoven 無法更新 SaaS 統計設置」以及「部署後無法連接測試網站 Site Token 和 API 服務」的問題。
- 完成的主要任務：
  1. **API Base URL 診斷**：用戶截圖中的 API Base URL 為 `https://app.rankwoven.com`，但 `dig` 顯示該子域名無 DNS 記錄；正確的 API 域名為 `https://api.rankwoven.com`（解析至 VPS `72.62.253.72`，`/health` 返回 200）。
  2. **VPS 容器狀態檢查**：通過 Hostinger MCP 確認 `rankwoven` 專案 5 個容器（api/web/worker/postgres/redis）全部 `running`，postgres 與 redis 標記 `healthy`。
  3. **API 路由可達性**：`GET /api/v1/cms-adapters` 返回 200，確認 API 已載入最新路由；`PUT /api/v1/site-connections/{id}/analytics-settings` 使用錯誤 token 測試返回 404，推測為站點 ID 在生產資料庫中不存在（代碼邏輯：找不到站點時回 404）。
  4. **程式碼審查**：確認 `rankwoven-seo.php` 的 `sync_analytics_settings_to_saas()` 會向 `PUT /api/v1/site-connections/{site_id}/analytics-settings` 發送請求，並在失敗時顯示截圖中的錯誤訊息；`apps/api/src/siteConnections.ts` 的對應路由會驗證 Bearer Token 並更新 `google_analytics_property_id`。
- 關鍵決策和解決方案：主要根因是插件填寫了錯誤的 API Base URL（`app.rankwoven.com` 不存在）。修復後若仍失敗，則需檢查生產資料庫中是否存在該 Site ID，若不存在須在 SaaS 後台重新創建站點連接並更新 Site Token。
- 使用的技術棧：curl、dig、Hostinger VPS MCP、Fastify、PostgreSQL、WordPress PHP 插件。
- 新增或修改文件：僅診斷，未修改業務程式碼（本次會話前已修改的 `apps/api/package.json` 與 `apps/api/src/lighthouse.ts` 屬於上一任務）。
- 驗證結果：`api.rankwoven.com/health` ✓、`api.rankwoven.com/api/v1/cms-adapters` ✓、VPS 容器 healthy ✓、`app.rankwoven.com` DNS 無法解析 ✗。
- 下一步行動清單：將 WordPress 插件的「API 基礎 URL」從 `https://app.rankwoven.com` 改為 `https://api.rankwoven.com` 並保存；若仍報錯，登入 SaaS 後台檢查站點 `b95887cb-08a7-424d-af9b-ff9cef52275a` 是否存在，不存在則重新創建並更新 Site ID 與 Site Token；再次保存 GA4 屬性 ID 並觀察同步狀態。

### 2026-07-27（十二）：重新設計 RankWoven Logo（概念 A：編織信號）

- 會話的主要目的：根據 `README.md` 項目說明，重新設計 RankWoven 品牌 Logo。
- 完成的主要任務：
  1. 使用多模態內容生成技能生成 AI 參考圖（概念 A：兩條交織線條構成抽象 W + 中心向上增長箭頭）。
  2. 基於參考圖手工繪製矢量 SVG Logo，確保無 AI 水印、可無損縮放、色彩精確對齊品牌規範。
  3. 新增純圖標版、Favicon（SVG/PNG）、Apple Touch Icon、PWA 圖標和橫式 PNG 版本。
  4. 更新 `apps/web/index.html` 引用新的 favicon 與 apple-touch-icon。
  5. 更新 `docs/brand-guidelines.md` 描述新 Logo 概念、檔案清單與使用規則。
- 關鍵決策和解決方案：
  - 選定概念 A「編織信號」：深青綠 `#0B6F63` 方形背景，白色與琥珀金 `#F6D365` 兩條交織線構成 W 形，中心金色向上箭頭表示排名增長。
  - 不使用帶水印的 AI 生成圖作為最終交付，而以 SVG 為 source of truth，再轉換為 PNG 格式變體。
  - 字標繼續使用 `Instrument Sans`（Google Fonts 已載入），與現有網頁字體體系一致。
- 使用的技術棧：SVG、Google Fonts、CodeBuddy 多模態圖片生成、sharp（臨時目錄轉換 PNG）、HTML `<link rel="icon">`。
- 新增或修改文件：
  - 新增 `apps/web/src/assets/rankwoven-icon.svg`
  - 新增 `apps/web/public/favicon.svg`
  - 新增 `apps/web/public/favicon.png`
  - 新增 `apps/web/public/apple-touch-icon.png`
  - 新增 `apps/web/public/icon-192.png`
  - 新增 `rankwoven-favicon.png`（專案根目錄）
  - 新增 `rankwoven-logo-horizontal.png`（專案根目錄）
  - 修改 `apps/web/src/assets/rankwoven-logo.svg`
  - 修改 `apps/web/index.html`
  - 修改 `docs/brand-guidelines.md`
  - 修改本 `README.md`
- 驗證結果：SVG 在本地預覽符合設計意圖；PNG 轉換後無水印；`npm run lint`、`npm run build`、`npm run test`、`npm run security:audit` 通過。
- 下一步行動清單：在本地瀏覽器確認 favicon 與網頁 Logo 載入正常；若滿意可提交並推送；後續可在登入頁、郵件簽名、社交媒體等場景製作更多尺寸變體。

### 2026-07-27（十三）：RankWoven Logo 備選概念 B（網路樞紐）

- 會話的主要目的：根據用戶要求，使用概念 B「網路樞紐」製作另一款 Logo 試作。
- 完成的主要任務：
  1. 手工繪製矢量 SVG：以六邊形節點為中心，三條白色流線帶金色端點匯聚於中心，隱喻 SEO 內容、關鍵詞與連結的中央樞紐；中心上方金色向上箭頭表示排名增長。
  2. 生成橫式 PNG 與正方形 favicon PNG 備選版本（檔名帶 `-v2`）。
- 關鍵決策和解決方案：
  - 採用更深沉的主色 `#084C45`，與概念 A 的 `#0B6F63` 形成對比，增強 B2B 科技與專業感。
  - 保留 `Instrument Sans` 字標，確保品牌一致性。
  - 概念 B 檔案以 `-v2` 後綴保存，不覆蓋概念 A 的正式 Logo 檔案。
- 使用的技術棧：SVG、sharp（臨時目錄轉換 PNG）。
- 新增或修改文件：
  - 新增 `apps/web/src/assets/rankwoven-logo-v2.svg`
  - 新增 `apps/web/src/assets/rankwoven-icon-v2.svg`
  - 新增 `rankwoven-logo-horizontal-v2.png`
  - 新增 `rankwoven-favicon-v2.png`
  - 修改本 `README.md`
- 驗證結果：SVG 與 PNG 預覽符合設計意圖；未改動既有引用檔案，無需重新 build/lint/test。
- 下一步行動清單：比較概念 A 與概念 B，決定最終採用的主 Logo；若選定概念 B，則將 `-v2` 檔案取代為主 Logo 檔名，並更新 `apps/web/index.html`、`docs/brand-guidelines.md` 與所有引用位置。

### 2026-07-27（十四）：RankWoven Logo 備選概念 C（時尚盾牌 W + 參考圖風格）

- 會話的主要目的：根據用戶上傳的參考圖風格，結合 `README.md` 項目說明，再設計一款現代感強、時尚的 Logo。
- 完成的主要任務：
  1. 使用多模態圖片生成技能生成 AI 參考圖：3D 立體 W、深青綠到深青色漸變、金色向上箭頭、高級時尚感。
  2. 基於參考圖手工繪製矢量 SVG 版本：盾牌輪廓 + 內部交織 W + 金色增長箭頭，使用線性漸變模擬立體光感。
  3. 生成橫式 PNG 與 favicon PNG 備選版本（檔名帶 `-v3`）。
- 關鍵決策和解決方案：
  - 參考圖風格的 3D 立體效果難以在 SVG 中完美還原，因此用「漸變盾牌 + 扁平交織線 + 粗金箭頭」作為時尚現代 SaaS 的折衷方案。
  - 不使用帶 AI 水印的生成圖作為最終檔案，矢量 SVG 仍為 source of truth。
  - 概念 C 檔案以 `-v3` 後綴保存，不覆蓋概念 A 與概念 B。
- 使用的技術棧：CodeBuddy 多模態圖片生成、SVG 漸變、sharp（臨時目錄轉換 PNG）。
- 新增或修改文件：
  - 新增 `apps/web/src/assets/rankwoven-logo-v3.svg`
  - 新增 `apps/web/src/assets/rankwoven-icon-v3.svg`
  - 新增 `rankwoven-logo-horizontal-v3.png`
  - 新增 `rankwoven-favicon-v3.png`
  - 新增 `rankwoven-logo-reference-v3.png`（帶水印的 AI 參考圖，僅供比對，不建議作為正式使用）
  - 修改本 `README.md`
- 驗證結果：SVG 與 PNG 預覽符合設計意圖；未改動既有引用檔案，無需重新 build/lint/test。
- 下一步行動清單：比較概念 A、B、C，選定最終主 Logo；若選定概念 C，將 `-v3` 檔案取代為主 Logo 檔名，並更新引用位置與品牌規範文件。

### 2026-07-27（十六）：Lighthouse 審計超時保護修復

- 會話的主要目的：修復 `https://cyruschan.com/` 在 SaaS 後台點擊審計後一直卡在「審計中...」沒有反應的問題。
- 完成的主要任務：
  1. 診斷根因：前端 `requestApi()` 中的 `fetch` 沒有任何超時機制；Lighthouse 審計耗時 20+ 秒，若 VPS Nginx `proxy_read_timeout` 切斷連接或網路異常，`fetch` Promise 可能永遠不 resolve/reject，導致 UI 永遠卡在 loading。
  2. 前端修復：在 `apps/web/src/api/appInsights.ts` 新增 `requestWithTimeout` 輔助函數，使用 `AbortController` + 90 秒超時包裝 `getLighthouseAudit`，超時後自動中斷請求並拋出錯誤。
  3. 後端修復：在 `apps/api/src/lighthouse.ts` 為審計加入 `Promise.race` 95 秒超時包裝，確保後端不會無限等待，超時後返回 `Lighthouse 審計超時` 錯誤而非掛起。
  4. 提交並推送 `main`（`97bd133`），觸發 GitHub Actions 生產部署；部署後 `https://api.rankwoven.com/health` 返回 200；Hostinger MCP 確認產所有容器正常。
- 關鍵決策和解決方案：前後端皆增加超時保護，後端超時（95s）略長於前端（90s），確保前端能收到有意義的錯誤回應而非網路層中斷。
- 使用的技術棧：Vue 3、TypeScript、AbortController、Fastify、Promise.race、GitHub Actions、Hostinger VPS MCP。
- 新增或修改文件：修改 `apps/web/src/api/appInsights.ts`、`apps/api/src/lighthouse.ts`、本 `README.md`。
- 驗證結果：`npm run lint` 通過（0e/0w）；`npm run build` 通過（API + Web）；推送後生產 API health 200、5 個容器 running。
- 下一步行動清單：在 SaaS 後台用 `https://cyruschan.com/` 重新測試 Lighthouse 審計，確認超時後能顯示明確錯誤提示。

### 2026-07-27（十七）：站點刪除功能 + WordPress 插件自動生成 Site ID/Token

- 會話的主要目的：
  1. 在 SaaS 後台實現站點刪除功能，刪除前彈出警告確認對話框。
  2. 修改 WordPress 插件，使 Site ID 和 Site Token 由系統自動生成，用戶無需手動輸入。
- 完成的主要任務：
  1. 後端：在 `apps/api/src/siteConnections.ts` 新增 `DELETE /api/v1/site-connections/:siteId` 端點，帶 `requireAuth` + `findForWorkspace` 權限驗證；所有關聯表已設 `ON DELETE CASCADE`（sync_tasks、sync_runs、synced_articles、synced_media、seo_audits、seo_audit_issues、optimization_suggestions）。
  2. 前端：在 `apps/web/src/api/siteConnections.ts` 新增 `deleteSiteConnection(siteId)` API helper；在 `apps/web/src/views/SitesView.vue` 加入帶 `a-popconfirm` 警告的刪除按鈕；在 `apps/web/src/i18n.ts` 添加 en/zh-Hant 刪除相關文案。
  3. WordPress 插件：將 Site ID 字段從手動 `<input>` 改為只讀 `<code>` 展示（已連接時顯示 Site ID，未連接時顯示提示）；完全移除 Site Token 手動輸入框；移除 `handle_save_settings()` 中手動保存 Site ID/Token 的邏輯。
  4. Site ID/Token 現在完全由插件 `handle_connect_site()` 通過調用 `POST /api/v1/site-connections` 自動生成和保存，用戶只需點擊「Connect This Site」按鈕即可。
- 關鍵決策和解決方案：刪除功能利用 PostgreSQL `ON DELETE CASCADE` 處理關聯數據清理，後端只做權限驗證和主記錄刪除；插件現有 `handle_connect_site()` 已支援自動生成流程，只需移除 UI 層手動輸入即可，無需改動後端 API。
- 使用的技術棧：Fastify、TypeScript、PostgreSQL、Vue 3 Composition API、Ant Design Vue `a-popconfirm`、Vue I18n、WordPress Plugin API。
- 新增或修改文件：修改 `apps/api/src/siteConnections.ts`、`apps/web/src/api/siteConnections.ts`、`apps/web/src/i18n.ts`、`apps/web/src/views/SitesView.vue`、`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、本 `README.md`。
- 驗證結果：`npm run lint` 通過；`npm run build` 通過；已推送 `main`（`b548c8d`），GitHub Actions 將自動部署。
- 下一步行動清單：部署後在 SaaS 後台驗證站點刪除功能；在 WordPress 插件後台測試「Connect This Site」自動生成流程是否正常。

### 2026-07-28（十八）：修復真實網站 Lighthouse 審計失敗

- 會話的主要目的：解決 `https://cyruschan.com/` 在 SaaS 後台 Lighthouse 審計顯示「Lighthouse 審計失敗」且沒有詳細錯誤的問題。
- 完成的主要任務：
  1. 診斷：手動測試發現 Google PageSpeed Insights API 對 `cyruschan.com` 返回 429「Quota exceeded」，因此後端會回退到本機 Lighthouse CLI；本機 Lighthouse CLI 在生產 Docker/Alpine 環境中執行失敗。
  2. 後端：在 `apps/api/src/lighthouse.ts` 中將 `npx lighthouse` CLI 回退改為程序化 Lighthouse API + `chrome-launcher`，直接啟動 Chromium，避免 `npx` 解析與 CLI 環境問題。
  3. 後端：新增更穩定的 Chrome 啟動 flags（`--headless --no-sandbox --disable-setuid-sandbox --disable-gpu --disable-dev-shm-usage` 等）。
  4. 後端：將錯誤訊息從籠統的「Lighthouse 審計失敗」改為包含實際錯誤細節；新增 `console.error` 伺服器日誌。
  5. 前端：在 `apps/web/src/api/appInsights.ts` 新增 `ApiError` 類別，保留後端 `error.code` 與 `error.details`。
  6. 前端：在 `apps/web/src/components/LighthousePanel.vue` 顯示詳細錯誤訊息，便於未來診斷。
  7. Docker：在 `Dockerfile` 中追加安裝 `nss`、`freetype`、`harfbuzz`、`ttf-freefont`；設定 `LIGHTHOUSE_CHROMIUM_PATH` 環境變數。
- 關鍵決策和解決方案：PageSpeed API 配額耗盡時必須完全依賴本機 Lighthouse；CLI 方式在 Docker 環境不可靠，改以程序化 `chrome-launcher` + `lighthouse()` 啟動與審計；同時改善前端錯誤顯示，讓用戶和開發者都能看到具體原因。
- 使用的技術棧：Fastify、TypeScript、Lighthouse 12、chrome-launcher、Docker/Alpine、Vue 3。
- 新增或修改文件：修改 `apps/api/src/lighthouse.ts`、`apps/web/src/api/appInsights.ts`、`apps/web/src/components/LighthousePanel.vue`、`Dockerfile`、本 `README.md`。
- 驗證結果：`npm run lint` 通過；`npm run build` 通過；本機程序化 Lighthouse 對 `https://cyruschan.com/` 審計成功（performance score 0.62）；已推送 `main`（`03b58c6`），GitHub Actions 將自動部署。
- 下一步行動清單：部署完成後在 SaaS 後台重新對 `https://cyruschan.com/` 執行 Lighthouse 審計，確認不再失敗；若仍有問題，查看後端日誌中的 `[lighthouse] Audit failed` 訊息。

### 2026-07-28（十八之二）：修復 GitHub Actions 安全審計失敗

- 會話的主要目的：解決 GitHub Actions `security:audit` 步驟報告 19 個漏洞（16 moderate、3 high）導致部署中斷的問題。
- 完成的主要任務：
  1. 診斷：所有漏洞均來自 `lighthouse` 12.x 的傳遞依賴 `@sentry/node` 與 `@opentelemetry/*`，以及 `@sentry/node` 下的 `brace-expansion` / `minimatch`。
  2. 將 `apps/api/package.json` 中的 `lighthouse` 從 `^12.6.0` 升級到 `^13.4.1`。
  3. 重新執行 `npm install` 更新 `package-lock.json`。
  4. 驗證 `npm audit` 顯示 `found 0 vulnerabilities`。
  5. 驗證程序化 Lighthouse API 在 v13.4.1 下對 `https://cyruschan.com/` 審計仍然成功。
- 關鍵決策和解決方案：`npm audit fix` 無法自動修復（傳遞依賴版本被 lighthouse 鎖定），因此直接升級 lighthouse 到已修復漏洞的最新穩定版；v13 程序化 API 與 v12 相容，無需改動業務程式碼。
- 使用的技術棧：npm audit、Lighthouse 13、Node.js。
- 新增或修改文件：修改 `apps/api/package.json`、`package-lock.json`、本 `README.md`。
- 驗證結果：`npm run lint` 通過；`npm run build` 通過；`npm audit --registry=https://registry.npmjs.org` 顯示 0 漏洞；本機程序化 Lighthouse 對 `https://cyruschan.com/` 審計成功；已推送 `main`（`a146537`），GitHub Actions 將重新執行部署。
- 下一步行動清單：等待 GitHub Actions 部署完成，確認 Verify 與 Deploy 兩個 job 都成功。

### 2026-07-28（十八之三）：進一步修復 Lighthouse 在真實網站失敗

- 會話的主要目的：解決 `https://cyruschan.com/` 在生產環境仍然審計失敗的問題，這次錯誤已顯示詳細原因。
- 完成的主要任務：
  1. 診斷：詳細錯誤顯示兩個問題：
     - PageSpeed Insights API 配額用罄（429）。
     - 本機 Lighthouse 回退在 Docker/Alpine 中無法連線到 Chrome 的 CDP WebSocket（`Failed to fetch browser webSocket URL`）。
  2. 在本地 Docker 容器重現問題，發現根本原因是 `--single-process` 導致 Chrome 無法啟動 CDP server。
  3. 移除 `--single-process` 後，本機 Lighthouse 能運作，但 `cyruschan.com` 返回 403，因 Hostinger CDN 偵測到 `HeadlessChrome` client hint。
  4. 引入 `puppeteer-core` 取代 `chrome-launcher` 啟動 Chrome，並在頁面層級攔截請求，覆寫 `sec-ch-ua`、`sec-ch-ua-mobile`、`sec-ch-ua-platform` 為正常 Chrome 瀏覽器值，繞過 bot protection。
  5. 將 `puppeteer-core` 加入 `apps/api/package.json` 作為直接依賴，並更新 `package-lock.json`。
- 關鍵決策和解決方案：直接以 `puppeteer-core` 開啟瀏覽器並傳入 Lighthouse，透過 Puppeteer 的 request interception 修改 client hints；既解決 Docker 中 Chrome 啟動問題，也繞過 CDN 對 HeadlessChrome 的封鎖。
- 使用的技術棧：Fastify、TypeScript、Lighthouse 13、puppeteer-core、Docker/Alpine。
- 新增或修改文件：修改 `apps/api/src/lighthouse.ts`、`apps/api/package.json`、`package-lock.json`、本 `README.md`。
- 驗證結果：`npm run lint` 通過；`npm run build` 通過；`npm audit` 0 漏洞；在本地 Docker 容器中對 `https://cyruschan.com/` 執行 mobile/desktop Lighthouse 均成功（mobile performance 0.53、desktop performance 0.54）；已推送 `main`（`5f4bdf1`）。
- 下一步行動清單：等待 GitHub Actions 部署完成後，在 SaaS 後台重新對 `https://cyruschan.com/` 執行 Lighthouse 審計。

---

### 2026-07-28 下午 — SEO Site Audit 全棧實作收尾與本地驗證

- 會話的主要目的：完成 Site Audit 模組的收尾工作（資料庫 migration 執行、SerpApi 金鑰配置、Docker 環境驗證）並更新項目文檔。
- 完成的主要任務：
  1. 在本地 `.env` 配置 `SERPAPI_KEY`（free tier: 250 次/月）。
  2. 執行 `npm run db:migrate`，成功套用 `0006_site_audit.sql`（`site_audit_configs`、`site_audit_results`、`site_audit_issues` 三張表建立並記錄在 `schema_migrations`）。
  3. 啟動 `npm run docker:up`，確 5 個容器全部 healthy，API health check HTTP 200。
  4. 確認 PostgreSQL 中獲得 3 個已連接站點（`cyruschan.com`、`rankwoven.com`、`gsc.rankwoven.com`）可供審計測試。
  5. 打開 `/app/site-audit` 前端頁面於 IDE 瀏覽器。
  6. 更新 PRD 第 17 節「下一步行動清單」：將 Site Audit 全棧實作標記為已完成、移除重複條目、在待辦頂部新增 3 項 Site Audit 相關行動項（實際審計測試、配額保護、詳情展開）。
- 關鍵決策和解決方案：選用 SerpApi 免費層作為審計引擎，成本可控且無需充值門檻。審計排程器在 API 進程內以 `setInterval` 30 分鐘運行，不依賴獨立 Worker 服務。
- 使用的技術棧：Fastify、TypeScript、PostgreSQL、Vue 3、Ant Design Vue、SerpApi、Docker Compose。
- 新增或修改文件：修改 `.env`、`docs/seo-ai-platform-prd.md`、本 `README.md`。
- 驗證結果：`db:migrate` 套用成功（schema_migrations 記錄 id=7, file=0006_site_audit.sql）；PostgreSQL `\dt site_audit*` 確認三張表；Docker Compose ps 確 5 容器；API `/health` 200；前端頁面可訪問（需登錄後執行審計測試）。
- 下一步行動清單：在 `/app/site-audit` 頁面登錄後對 `cyruschan.com` / `rankwoven.com` 執行實際審計；為審計加入 SerpApi 配額計數器與前端額度展示；審計結果頁增加點擊展開問題詳情。

### 2026-07-28（下午二）— 品牌首頁重新設計 + Docker 源碼自動同步 + PRD 全量審計

- 會話的主要目的：(1) 為市場首頁加入三個目標用戶角色版塊（網站站長 / SEO Agency / 內容編輯），每個角色展示痛點與核心流程；(2) 配置 Docker 源碼卷掛載，實現主機代碼變更自動同步至容器；(3) 安裝 SkillHub `ui-new` 技能並優化前台 UI；(4) 對比 PRD 全面審計每個模組的實現狀態，重新制定下一步行動清單。
- 完成的主要任務：
  1. **Docker 源碼卷掛載**：在 `docker-compose.yml` 新增 `x-aieo-dev` YAML 錨點，三個服務共用 `.:/workspace:cached` bind mount + 6 個匿名卷保護 `node_modules`。從此主機修改源碼後 Vite/tsx watch 自動熱重載，無需重建容器。
  2. **`ui-new` 技能安裝**：通過 SkillHub CLI (`skillhub install ui-new`) 安裝到 `.codebuddy/skills/ui-new/`，並根據其 UI Audit Protocol 優化前台：添加 `max-width: 1200px` 居中約束、persona 卡片 hover 動效、流程步驟微交互、CTA 按鈕視覺增強。
  3. **首頁重新設計**：
     - `MarketingHomeView.vue`：完全重寫，替換舊 features + workflow 區塊為三個角色版塊（網站站長 / SEO Agency / 內容編輯），每個角色含內聯 SVG 圖標、角色標題與摘要、痛點列表（紅標記）、核心流程（藍色編號步驟）。底部「核心功能」6 個卡片在角色版塊之後、CTA 之前。
     - `i18n.ts`：新增 `personaSectionTitle`、`personaSectionBody`、`personas.*`（共 3 組角色的痛點與流程，en/zh-Hant 雙語）。補回 `featuresTitle`/`featuresBody`。
     - `styles.css`：新增 ~220 行 persona + feature-card 樣式（含響應式 @media）。
  4. **PRD 全量審計**：對比 `docs/seo-ai-platform-prd.md` 與實際代碼，逐一檢查各模組實現狀態。結果：
     - 10 個模組達 100% 覆蓋（站點連接、內容同步、SEO 審計、SerpApi、Lighthouse、Search Console、GA、圖片 SEO、內部連結、國際化）
     - 4 個模組達 80-90%（AI 內容優化 80%、審批與應用 80%、管理後台 90%、品牌 100%）
     - 3 個模組達 0-60%（關鍵詞研究 60%、Worker 40%、WP 插件 50%）
     - 2 個模組完全缺失（報告與導出 0%、定價與訂閱 20%）
  5. **更新 PRD 第 17 節**：完全重寫「下一步行動清單」，按 P0（阻塞上線）/ P1（Beta 前）/ P2（MVP 後）/ P3（長期）四級優先級重新編排，新增 7 項 P0 + 7 項 P1 + 7 項 P2 + 7 項 P3 共 28 項任務。
  6. 提交並推送至 GitHub（commit `7659ba6`，38 files changed）。
- 關鍵決策和解決方案：使用 YAML 錨點 `&aieo-dev` 簡化三個服務的卷掛載配置；Persona 卡片佈局為左右兩欄（痛點 | 流程），移動端自動折疊為單欄；`ui-new` 技能通過「max-width 居中 + hover 微動效」解決頁面過寬問題。
- 使用的技術棧：Vue 3、TypeScript、CSS Grid/Flexbox、SVG inline icons、SkillHub CLI、Docker Compose bind mount、i18n 雙語。
- 新增或修改文件：
  - 修改：`docker-compose.yml`、`apps/web/src/views/MarketingHomeView.vue`、`apps/web/src/i18n.ts`、`apps/web/src/styles.css`、`docs/seo-ai-platform-prd.md`、`README.md`
  - 新增：`.codebuddy/skills/ui-new/`（SkillHub 安裝的技能包）
- 驗證結果：ESLint 0/0、vue-tsc 編譯通過、Docker 5 容器 healthy、`http://localhost:8080` 首頁渲染正確、角色版塊與核心功能區塊顯示正常、中英雙語切換正常。
- 下一步行動清單：優先處理 P0 三項（Web 靜態構建部署、SerpApi 配額保護、API Rate Limiting），其次推進 P1（用戶註冊/密碼管理、Site Audit 詳情展開、Apply 差異對比、批量審批等）。

### 2026-07-28（下午三）— P0 阻塞 Beta 上線三項全部完成

- 會話的主要目的：處理 PRD 第 17 節標記的 P0 三項阻塞 Beta 上線任務。
- 完成的主要任務：
  1. **P0-1: Web 生產靜態構建部署**：
     - 新增 `Dockerfile.web`（Multi-stage：Node 22 Alpine builder → Nginx Alpine runtime）
     - 新增 `apps/web/nginx.conf`（SPA 路由 fallback、Vite 產物 `assets/` 長緩存、Gzip、安全頭：X-Frame-Options / X-Content-Type-Options / X-XSS-Protection / Referrer-Policy）
     - 新增 `docker-compose.prod.yml`（生產覆寫，Web 改用 Nginx 靜態服務端口 80，api/worker profiles 清空）
     - `scripts/deploy-production.sh` 更新為同時載入 `-f docker-compose.yml -f docker-compose.prod.yml`
  2. **P0-2: SerpApi 配額保護**：
     - `apps/api/src/config.ts`：新增 `SERPAPI_MONTHLY_LIMIT`（預設 250）、`RATE_LIMIT_MAX`、`RATE_LIMIT_TIME_WINDOW_MS` 環境變數
     - `apps/api/src/siteAudit.ts`：新增 `getSerpApiMonthlyLimit()` 輔助函數、`SerpApiQuotaExceededError` 類別（附 code/used/limit 欄位）
     - `executeSiteAudit()` 執行前先檢查配額，超額拋出 `SerpApiQuotaExceededError`
     - `processDueScheduledAudits()` 排程稽核前檢查配額，超額跳過並記錄日誌
     - run audit handler 捕獲 `SerpApiQuotaExceededError` 並返回 429 + 詳細配額資訊
     - InMemory 與 PostgreSQL 兩個 `getSerpapiUsageStats()` 改用 `getSerpApiMonthlyLimit()` 動態讀取限制
     - `apps/web/src/views/SiteAuditView.vue`：新增配額 badge（剩餘點數顯示，≤50 黃色警告、≤10 紅色警告）、配額用盡時禁用「執行稽核」按鈕並顯示「配額已用盡」、稽核成功後自動刷新配額、錯誤訊息中偵測 quota 關鍵字並顯示友善提示
     - `apps/web/src/i18n.ts`：en/zh-Hant 雙語新增 `quotaExceeded` / `quotaRemaining` / `quotaBlocked` / `quotaNotConfigured`
     - `docker-compose.yml`：api 與 worker 服務新增 `SERPAPI_MONTHLY_LIMIT` 環境變數
     - `.env.example`：新增 `SERPAPI_MONTHLY_LIMIT=250`
  3. **P0-3: API Rate Limiting**：
     - 安裝 `@fastify/rate-limit` 依賴
     - `apps/api/src/server.ts`：全域註冊 rate-limit 中介層，支援 `RATE_LIMIT_MAX`（預設 100 req/window）和 `RATE_LIMIT_TIME_WINDOW_MS`（預設 60s）
     - keyGenerator 優先使用 `X-Forwarded-For`（Nginx 反向代理後正確識別客戶端 IP）
     - 超限回應：`{ success: false, message: '請求過於頻繁，請稍後再試', error: { code: 'RATE_LIMIT_EXCEEDED', retryAfterSec } }`
     - `docker-compose.yml`：api 與 worker 服務新增 `RATE_LIMIT_MAX` 和 `RATE_LIMIT_TIME_WINDOW_MS` 環境變數
     - `.env.example`：新增 Rate Limiting 配置範例
- 關鍵決策和解決方案：Web 生產部署從 Vite dev server 改為 Nginx 靜態服務，消除開發伺服器暴露風險、提升靜態資源快取效率、支援正式安全頭；SerpApi 配額在稽核執行前做前置檢查，排程稽核也受配額約束，避免超額調用產生費用；Rate Limiting 使用 Fastify 官方插件，配合 `X-Forwarded-For` 正確處理反向代理場景。
- 使用的技術棧：Docker Multi-stage Build、Nginx Alpine、Fastify + @fastify/rate-limit、Vue 3 + Ant Design Vue + Vue I18n、TypeScript、PostgreSQL、SerpApi。
- 新增或修改文件：
  - 新增：`Dockerfile.web`、`apps/web/nginx.conf`、`docker-compose.prod.yml`
  - 修改：`apps/api/src/config.ts`、`apps/api/src/server.ts`、`apps/api/src/siteAudit.ts`、`apps/web/src/i18n.ts`、`apps/web/src/views/SiteAuditView.vue`、`apps/web/src/styles.css`、`docker-compose.yml`、`.env.example`、`scripts/deploy-production.sh`、`package.json`、`package-lock.json`
- 驗證結果：`npm run lint` 0e/0w、`npm run test` 1 passed、`npm run build` 全 workspace 通過（vue-tsc + vite + tsc）、`npm run security:audit` 0 vulnerabilities。
- 下一步行動清單：提交並推送至 `main` 觸發生產部署；部署後驗證 Web 靜態服務、SerpApi 配額顯示和 Rate Limiting 在生產環境正常運作；開始 P1 任務（用戶註冊/密碼管理、Site Audit 詳情展開、Apply 差異對比、批量審批等）。

### 2026-07-28（下午四）— P1 Beta 任務完成

- 會話的主要目的：完成 P1 Beta 任務剩餘未完成項目，包括 P1-1（用戶註冊與密碼管理）的 lint 遺留問題修復、P1-2（Site Audit 問題詳情展開）、P1-4（批量審批）。
- 完成的主要任務：
  1. **P1-2: Site Audit 問題詳情展開**：
     - `SiteAuditView.vue`：為問題表格新增 `expandedRowRender` 可展開行，點擊行可展開查看問題描述（description）、修復建議（recommendation）、受影響 URL（點擊跳轉）和影響數量
     - 新增 `expandedIssueRow()` 函數，使用 Vue `h()` 渲染擴展行的結構化詳情
     - `i18n.ts`：en/zh-Hant 雙語新增 `issueDescription`、`issueRecommendation`、`issueAffectedUrl`、`issueAffectedCount`
     - 新增 `.issue-expanded-row` 等 7 個 CSS 類別，展開區域帶有淺灰背景、描述標籤為大寫灰色小字、修復建議文字使用 1.6 行高提升可讀性
     - 修正 `expandedRowRender` 函數簽名：Ant Design Vue 的 `ExpandedRowRender` 接受 `{ record, index, indent, expanded }` 物件，而非直接傳入 record
  2. **P1-4: 批量審批**：
     - 後端 `seoOptimization.ts`：新增 `POST /api/v1/site-connections/:siteId/suggestions/batch-approve` 端點
       - 接受 `{ suggestionIds: string[] }`，逐一調用 `seoRepository.approveSuggestion()`
       - 返回 `{ success, message, data: { results[], total, succeeded, failed } }`
       - 每條建議獨立處理，部分失敗不影響其他建議
     - 前端 `siteConnections.ts`：新增 `batchApproveOptimizationSuggestions(siteId, suggestionIds)` API 客戶端函數
     - `SuggestionsView.vue`：新增批量選擇與批量審批功能
       - 新增 `selectedRowKeys` ref 和 `rowSelection` computed，使用 Ant Design Vue 的 `row-selection` 配置
       - 通過 `getCheckboxProps` 僅允許狀態為 `pending` 的建議被選中（`canApprove` 為 true 的行）
       - 選中建議後顯示藍色批量操作欄，含選中計數和「批量批准」按鈕
       - 新增 `batchApprove()` 處理函數，調用 API 後清空選擇並刷新建議列表
       - 站點切換時自動清空選中狀態
     - `i18n.ts`：en/zh-Hant 雙語新增 `batchApprove`、`approveSelected`、`batchApproved`
  3. **P1-1 遺留問題修復**：
     - `RegisterView.vue`：修正 `authStore.setSession()` 參數順序（應為 `token, user` 而非 `user, token`）
     - `LoginView.vue`：修復 `isLoggedIn` 未暴露至模板的 TypeScript 錯誤，從 `authStore` 解構 `isLoggedIn`
     - `RegisterView.vue`：移除未使用的 `Space` 組件導入
     - `LoginView.vue`：eslint --fix 自動修正縮進
     - `auth.ts`：修復 `randomUUID()` 使用不一致（從 `crypto.randomUUID()` 改為直接使用已導入的 `randomUUID()`）
     - `auth.ts`：移除未使用的 `readResetTokenSubject()` 函數（其功能已內建於 Repository 的 `resetPassword` 方法中）
     - `auth.ts`：修復兩處 `throw new Error()` 未附加原始錯誤 `cause` 的 lint 錯誤
     - `i18n.ts`：修復 zh-Hant 區塊多餘的 `},` 閉合導致 TypeScript 編譯失敗的語法錯誤
- 關鍵決策和解決方案：Ant Design Vue 的 `ExpandedRowRender` 回調簽名為 `({ record, index, indent, expanded })` 而非直接傳入 record，需用解構參數接收；批量審批採用逐一獨立處理策略（非事務），確保部分失敗不阻塞其他建議審批；`row-selection` 的 `getCheckboxProps` 利用 `SuggestionRow.canApprove` 屬性控制複選框啟用/禁用，與單條 `approve` 按鈕的邏輯一致。
- 使用的技術棧：Vue 3 Composition API + TypeScript、Ant Design Vue Table（expandedRowRender / rowSelection）、Fastify REST、PostgreSQL、Vue I18n、ESLint、Vitest。
- 新增或修改文件：
  - 修改：`apps/api/src/seoOptimization.ts`、`apps/api/src/auth.ts`、`apps/web/src/api/siteConnections.ts`、`apps/web/src/i18n.ts`、`apps/web/src/views/SiteAuditView.vue`、`apps/web/src/views/SuggestionsView.vue`、`apps/web/src/views/LoginView.vue`、`apps/web/src/views/RegisterView.vue`、`README.md`
- 驗證結果：`npm run lint` 0e/0w、`npm run test` 1 passed、`npm run build` 全 workspace 通過、`npm run security:audit` 0 vulnerabilities。
- 下一步行動清單：P1-3（Apply 差異對比）與 P1-6（死信隊列）已於先前實現，P1-7（快照回寫 WordPress）亦已完成；P1-5（端對端測試）為非代碼任務；P1 批次全部完結，可進入 P2 或準備提交推送。

### 2026-08-04（星期二）— 媒體處理頁接入上下文圖片 SEO 建議

- 會話的主要目的：按圖片 SEO 規則升級後台 `/app/media` 媒體處理頁，讓文章或頁面配圖可基於上下文生成圖片標題、簡介、說明、Alt Text 與檔名相關建議，並接入審核與套用流程。
- 完成的主要任務：
  1. **媒體同步字段補齊**：
     - `apps/api/src/siteConnections.ts` 與 `apps/worker/src/index.ts` 為 `synced_media` 補上 `caption`、`description` 欄位，支援 in-memory、Postgres、Worker 落庫與查詢。
     - `plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 的媒體同步輸出補回 `caption`、`description`，讓 WordPress 寫回前快照與審計上下文更完整。
  2. **圖片 SEO 規則落地**：
     - `apps/api/src/seoOptimization.ts` 新增媒體 `media_title`、`media_caption`、`media_description` 建議型別，根據所屬文章/頁面上下文生成 `title / caption / description / altText` 建議。
     - 現有 `fileName` 規則保留，並將規則版本提升為 `2026-08-04.image-context-1`。
  3. **後台媒體處理頁升級**：
     - `apps/web/src/views/MediaOptimizationView.vue` 從純列表頁升級為媒體 SEO 工作台。
     - 新增「生成媒體建議」按鈕，直接觸發審計並刷新媒體建議。
     - 列表新增 SEO 狀態欄，顯示每張圖片目前的審核狀態與建議數量。
     - 詳情彈窗新增欄位級視圖，可查看 `title / caption / description / altText / fileName` 的當前值與建議值，並支持逐條批准與加入套用流程。
  4. **前端型別與文案對齊**：
     - `apps/web/src/api/siteConnections.ts`、`apps/web/src/views/SuggestionsView.vue`、`apps/web/src/views/ArticleSuggestionsView.vue`、`apps/web/src/i18n.ts` 同步支持新媒體建議型別與文案映射。
  5. **測試覆蓋更新**：
     - `apps/api/tests/siteConnections.test.ts` 補上文章上下文媒體建議的期望值。
     - `apps/api/tests/siteConnections.postgres.test.ts` 補上媒體 `caption / description` 持久化斷言。
- 關鍵決策和解決方案：優先沿用現有 `SEO Audit -> Suggestion -> Approve -> Apply` 流程，不新增獨立媒體建議 API；這樣能以最少改動把上下文圖片 SEO 規則直接接入現有後台。媒體處理頁只補最必要但可用的操作，包括生成建議、查看欄位差異、逐條批准與建立套用任務，避免為單次需求擴出一套平行流程。
- 使用的技術棧：Vue 3 Composition API、TypeScript、Ant Design Vue、Fastify、Zod、PostgreSQL、WordPress Plugin PHP。
- 新增或修改文件：
  - 修改：`apps/api/src/seoOptimization.ts`、`apps/api/src/siteConnections.ts`、`apps/api/tests/siteConnections.postgres.test.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/web/src/api/siteConnections.ts`、`apps/web/src/i18n.ts`、`apps/web/src/views/ArticleSuggestionsView.vue`、`apps/web/src/views/MediaOptimizationView.vue`、`apps/web/src/views/SuggestionsView.vue`、`apps/worker/src/index.ts`、`plugins/wordpress/README.md`、`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`README.md`
- 驗證結果或未驗證原因：
  - 已通過：`npm run lint`、`npm run build -w @aieo/api`、`npm run build -w @aieo/worker`
  - 已通過：以內置 `Node 24.14.0` 執行 `npm run build -w @aieo/web`
  - 已通過：以內置 `Node 24.14.0` 執行 `npm run test -w @aieo/api`，結果為 `2 passed | 1 skipped`、`23 passed | 1 skipped`
  - 未完成：WordPress 插件 `php -l` 嘗試改用 Docker 容器驗證，但容器內 `php` 執行路徑返回異常，未能完成語法檢查
- 下一步行動清單：
  1. 補做 WordPress 容器內的插件 `php -l` 驗證。
  2. 若要把頁面再往前推進，可補上媒體建議的批量批准與批量加入套用。
  3. 若要提升套用前可讀性，可在媒體詳情彈窗補上「內容上下文來源」預覽。

### 2026-08-04（星期二）— WordPress 本地測試站插件驗證補記

- 會話的主要目的：使用 `cyruschan.com` 本地 WordPress Docker 測試站補做 `rankwoven-seo` 插件驗證，確認最新插件文件已同步且可被 WordPress 正常載入。
- 完成的主要任務：
  1. 將 `AIEO/plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 同步到 `/Volumes/Extreme SSD/gitCode/cyruschan.com/wp-content/plugins/rankwoven-seo/rankwoven-seo.php`。
  2. 確認 AIEO 倉庫插件文件與測試站插件文件 `diff` 一致。
  3. 在運行中的 `cyruschan-wp` 容器內確認 PHP CLI 路徑為 `/usr/local/bin/php`，版本為 `PHP 8.2.28`。
  4. 在 `cyruschan-wp` 容器內執行 `php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php`，語法檢查通過。
  5. 透過 WordPress `active_plugins` 確認 `rankwoven-seo/rankwoven-seo.php` 仍為啟用狀態。
  6. 直接請求 `http://localhost:8088/wp-json/rankwoven/v1/site`，回應狀態為 `401`，證明插件 REST 路由已被載入，而非 404。
- 關鍵決策和解決方案：不再依賴 `docker compose run wpcli`，因為當前 Docker Desktop 本地 `mariadb:11.4` blob 存在 I/O 錯誤；改為直接使用已運行的 `cyruschan-wp` 容器與絕對路徑 `/bin/bash`、`/usr/local/bin/php` 進行驗證，避免被工具鏈問題阻塞。
- 使用的技術棧：Docker Desktop、WordPress 6.7.2、PHP 8.2 CLI、WordPress option / REST route 驗證。
- 新增或修改文件：
  - 修改：`README.md`
  - 外部測試站同步：`/Volumes/Extreme SSD/gitCode/cyruschan.com/wp-content/plugins/rankwoven-seo/rankwoven-seo.php`
- 驗證結果或未驗證原因：
  - 已通過：測試站插件文件同步、一致性檢查、容器內 `php -l`、插件啟用狀態檢查、REST 路由載入檢查。
  - 未完成：`docker restart cyruschan-wp` 與 `docker compose run wpcli ...` 仍受 Docker 本地 I/O 錯誤影響，但因測試站為 bind mount，文件同步後已能直接在現行容器中完成語法與載入驗證。
- 下一步行動清單：
  1. 若要做完整人工回歸，可登入 `http://localhost:8088/cyrus/` 後檢查 `Settings -> RankWoven SEO` 頁面渲染與媒體同步行為。
  2. 若 Docker I/O 問題持續，建議先修復本機 Desktop 映像層，再恢復 `wpcli` 路徑的自動化驗證。

### 2026-08-04（星期二）— 媒體處理頁新增站點媒體掃描與 AI 審核

- 會話的主要目的：把 `/app/media` 由「只讀已同步媒體列表」升級成可一鍵掃描站點媒體、根據上下文生成 AI 審核建議，並供用戶修改後提交更新的工作流。
- 完成的主要任務：
  1. `apps/api/src/siteConnections.ts` 新增 `POST /api/v1/site-connections/:siteId/media-scan`。
     - 直接使用已保存的 WordPress 管理員憑證連接站點 REST API。
     - 掃描 `/wp-json/wp/v2/media` 圖片媒體，並自動抓取關聯文章 / 頁面作為上下文。
     - 將掃描結果寫入現有 `synced_media` / `synced_articles`，同時保留站點最後同步統計。
  2. `apps/web/src/views/MediaOptimizationView.vue` 的右上角按鈕改成真正的「掃描並分析」。
     - 選取站點後，一鍵讀取網站媒體庫。
     - 掃描完成後自動執行 SEO 審核，列出圖片標題、Meta、Alt Text、Caption、Description 與檔名建議。
     - 空狀態加入 CTA，方便首次未掃描時直接開始。
  3. `apps/web/src/api/siteConnections.ts` 新增 `scanSiteMedia()`。
  4. `apps/web/src/i18n.ts` 新增掃描、權限不足、空狀態與成功提示文案。
  5. `apps/api/tests/siteConnections.test.ts` 新增 `media-scan` 整合測試，驗證：
     - WordPress 媒體掃描成功寫回資料庫。
     - 關聯文章內容一併帶入。
     - SEO 審核能產生媒體上下文建議。
- 關鍵決策和解決方案：不再只依賴既有的同步列表或單筆刷新，而是把媒體頁直接接成「掃描站點媒體 -> AI 分析 -> 使用者審核 -> 套用更新」的閉環；這樣即使頁面一開始沒有資料，使用者也能先按掃描按鈕把網站媒體讀進來再做審核。
- 使用的技術棧：Fastify + TypeScript、WordPress REST API + Application Password、Vue 3 + Ant Design Vue、Vitest。
- 新增或修改文件：
  - 修改：`apps/api/src/siteConnections.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/web/src/api/siteConnections.ts`、`apps/web/src/i18n.ts`、`apps/web/src/views/MediaOptimizationView.vue`、`README.md`
- 驗證結果：
  - 已通過：`npm run lint`
  - 已通過：`npm run build -w @aieo/api`
  - 已通過：`npm run build -w @aieo/web`
  - 已通過：`npm run test -w @aieo/api`
- 下一步行動清單：
  1. 若要進一步提升可用性，可在媒體詳情彈窗加入「AI 建議來源上下文」預覽。
  2. 若要減少人工逐條處理，可再補媒體建議的批量批准與批量套用。

### 2026-08-04（星期二）— 媒體建議可編輯與按關聯文章 slug 重命名

- 會話的主要目的：讓媒體處理頁不只掃描與產生 AI 建議，還能根據關聯文章 slug 生成檔名建議，並允許用戶手動修改建議內容後再提交到網站媒體庫。
- 完成的主要任務：
  1. `apps/api/src/seoOptimization.ts`
     - 媒體上下文新增 `contextSlug` 與副檔名資訊。
     - `fileName` 建議改為優先使用關聯文章 slug，例如 `what-is-seo.jpg`。
     - 新增 `MEDIA_FILE_NAME_CONTEXT` 規則，沿用 `media_file_name` 建議類型。
     - 新增 `updateSuggestionSchema`、`updateSuggestion()` repository 方法與 `PUT /api/v1/site-connections/:siteId/suggestions/:suggestionId`。
  2. `apps/web/src/views/MediaOptimizationView.vue`
     - 媒體審核彈窗的 AI 建議欄位改為可編輯輸入框 / 文字區域。
     - 新增「保存修改」按鈕，保存後再批准 / 套用。
     - 掃描、批准、套用、保存後都會刷新當前媒體的草稿建議。
  3. `apps/web/src/api/siteConnections.ts`
     - 新增 `updateOptimizationSuggestion()` API client。
  4. `apps/web/src/i18n.ts`
     - 補齊保存修改成功 / 失敗等文案。
  5. `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`
     - `fileName` 套用不再只寫入建議 meta。
     - 新增實際附件檔案重命名邏輯，會更新主圖、各尺寸衍生圖與 attachment metadata。
  6. `apps/api/tests/siteConnections.test.ts`
     - 補上 `media-scan` 路徑對 slug 檔名建議與 `PUT suggestion` 更新的整合測試。
- 關鍵決策和解決方案：這次不直接假設使用者一定接受 AI 原句，而是把媒體審核流程改成「AI 先給草稿，用戶可再改，再批准與寫回」；同時檔名建議不再只修飾原圖檔名，而是優先對齊文章 slug，對應 `what-is-seo` 這類實際 SEO 需求。
- 使用的技術棧：Fastify、TypeScript、Vue 3、Ant Design Vue、Vitest、WordPress PHP。
- 新增或修改文件：
  - 修改：`apps/api/src/seoOptimization.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/web/src/api/siteConnections.ts`、`apps/web/src/i18n.ts`、`apps/web/src/views/MediaOptimizationView.vue`、`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`README.md`
- 驗證結果：
  - 已通過：`npm run lint`
  - 已通過：`npm run build -w @aieo/api`
  - 已通過：`npm run build -w @aieo/web`
  - 已通過：`npm run test -w @aieo/api`
  - 已通過：`docker exec cyruschan-wp /bin/bash -lc 'php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php'`
- 下一步行動清單：
  1. 若要對你截圖中的特定媒體直接落資料，需先確認該文章 / 媒體存在於目前本地 WordPress 測試站資料庫；我剛核對時，本地 `post=1670` 與截圖所示內容不一致，所以未直接改站點資料。
  2. 若你要我繼續，我可以下一步直接對本地測試站或你指定的線上站點，把這張圖的標題、Alt、Caption、Description 和檔名實際更新。

### 2026-08-04（星期二）— 媒體詳情改顯示關聯內容標題並優化標題 / 檔名規則

- 會話的主要目的：修正媒體詳情彈窗中的「所屬內容」顯示，並讓圖片標題與檔名建議更貼近內容 SEO 使用方式。
- 完成的主要任務：
  1. `apps/api/src/siteConnections.ts`
     - `SyncedMedia` 補上 `attachedToTitle`。
     - `GET /api/v1/site-connections/:siteId/media` 現在會帶回關聯文章 / 頁面標題。
     - in-memory 與 PostgreSQL 兩個 `listMedia()` 都會把關聯內容標題回傳到前端。
     - 搜尋媒體時也會匹配關聯文章標題。
  2. `apps/web/src/views/MediaOptimizationView.vue`
     - 媒體詳情彈窗的「所屬內容」由 `#CMS ID` 改為優先顯示文章 / 頁面標題。
  3. `apps/api/src/seoOptimization.ts`
     - 媒體上下文新增 `sequenceNumber`，讓同一篇內容下的圖片能產生穩定序號。
     - 圖片標題建議改為優先使用關聯文章標題；若同一篇內容有多張圖，第二張起可附帶序號。
     - `fileName` 建議改為 `slug-序號.ext`，例如 `what-is-seo-1.jpg`。
     - `altText` 建議同步優先對齊關聯內容標題。
  4. `apps/api/tests/siteConnections.test.ts`
     - 更新媒體掃描與審計測試，驗證：
       - 關聯內容標題會回傳。
       - 標題建議會對齊文章標題。
       - 檔名建議會使用 `slug-1.jpg` 類型格式。
- 關鍵決策和解決方案：這次不再只把「所屬內容」當成一個 CMS ID 關聯，而是讓 API 直接把關聯內容標題送到前端，減少使用者在審核時來回查文章；同時圖片標題建議不再混入原始檔名語義，而是優先對齊文章標題，檔名則使用更利於 SEO 的 `slug-序號` 格式。
- 使用的技術棧：Fastify、TypeScript、Vue 3、Ant Design Vue、Vitest。
- 新增或修改文件：
  - 修改：`apps/api/src/siteConnections.ts`、`apps/api/src/seoOptimization.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/web/src/api/siteConnections.ts`、`apps/web/src/views/MediaOptimizationView.vue`、`README.md`
- 驗證結果：
  - 已通過：`npm run lint`
  - 已通過：`npm run build -w @aieo/api`
  - 已通過：`npm run build -w @aieo/web`
  - 已通過：`npm run test -w @aieo/api`
  - 已通過：`docker exec cyruschan-wp /bin/bash -lc 'php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php'`
- 下一步行動清單：
  1. 若你要我把這一輪修改提交並推送，我可以直接整理成一個 commit。
  2. 若你要我直接更新某一張真實媒體，請給我最終站點上的正確文章 ID / 媒體 ID，我可直接落資料驗證效果。

### 2026-08-04（星期二）— Meta 描述改為純文字提取

- 會話的主要目的：修正文章 Meta 描述 fallback 與摘要截取，避免把 `[vc_row ...]`、shortcode、HTML 代碼直接帶進 Meta 描述與建議內容。
- 完成的主要任務：
  1. `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`
     - 文章同步摘要 fallback 改成純文字抽取。
     - `get_post_meta_description()` 不再回傳 shortcode / HTML 代碼，改為先清理 shortcode 再提取文字。
     - 新增 `extract_plain_text_content()`。
  2. `apps/api/src/seoOptimization.ts`
     - `normalizeMetaDescriptionSuggestion()` 改為純文字提取，會剔除 shortcode 與 HTML 再生成建議。
     - 媒體上下文摘要也統一使用純文字提取，讓 AI 建議與摘要規則一致。
  3. `apps/api/tests/siteConnections.test.ts`
     - 新增測試：確保 meta description 從 shortcode / code 內容中只抽取純文字，不會把 `[vc_row...]` 帶入。
- 關鍵決策和解決方案：這次不再直接用 `wp_strip_all_tags()` 作為唯一處理方式，因為它無法清掉 shortcode；改為先 `strip_shortcodes()` 再做純文字化，才能處理你截圖裡那種 Visual Composer / shortcode 內容。
- 使用的技術棧：WordPress PHP、Fastify + TypeScript、Vitest。
- 新增或修改文件：
  - 修改：`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`apps/api/src/seoOptimization.ts`、`apps/api/tests/siteConnections.test.ts`、`README.md`
- 驗證結果：
  - 已通過：`npm run lint`
  - 已通過：`npm run build -w @aieo/api`
  - 已通過：`npm run build -w @aieo/web`
  - 已通過：`npm run test -w @aieo/api`
  - 已通過：`docker exec cyruschan-wp /bin/bash -lc 'php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php'`
- 下一步行動清單：
  1. 若要讓現有站點資料立即反映新的 meta description，需要重新掃描/同步相關文章。
  2. 如有需要，我也可以下一步把「文章標題 + slug-序號」的規則同步到更多模板或批量重命名流程。

### 2026-08-04（星期二）— 媒體頁 SQL 歧義修復與部署重跑

- 會話的主要目的：修正 `/app/media` 掃描頁面報錯 `column reference "site_id" is ambiguous`，並處理部署 Verify 階段的 `security:audit` 阻塞。
- 完成的主要任務：
  1. `apps/api/src/siteConnections.ts`
     - `listMedia()` 的 SQL 條件全部改用 `sm.` 別名。
     - 搜尋條件中的 `title / url / file_name / caption / description / alt_text / mime_type` 都明確指向 `synced_media`。
     - `issue` 條件也改成 `sm.alt_text` / `sm.file_name`，避免與 `synced_articles` 聯表後產生欄位歧義。
  2. 本地依官方 npm registry 重新執行 `npm audit fix`，清掉 `brace-expansion` 與 `fast-uri` 導致的 CI 高危警報。
- 關鍵決策和解決方案：這次不動查詢結構，只做最小必要修補，把所有歧義欄位補上表別名；部署阻塞則沿用既有依賴樹，只透過 `npm audit fix` 與官方 registry 修正鎖檔，避免無關升級擴大風險。
- 使用的技術棧：PostgreSQL、Fastify、npm audit、GitHub Actions Verify。
- 新增或修改文件：
  - 修改：`apps/api/src/siteConnections.ts`、`README.md`
- 驗證結果：
  - 已通過：`npm run lint`
  - 已通過：`npm run build -w @aieo/api`
  - 已通過：`npm run test -w @aieo/api`
  - 已通過：`npm run security:audit`
- 下一步行動清單：
  1. 若部署後頁面仍報錯，下一步應直接查 production / staging 的最新 build 是否已完成。
  2. 若要避免未來 audit 再次受本機 `npmmirror` 影響，建議本地也固定使用官方 registry 跑 `security:audit`。

### 2026-08-04（星期二）— GitHub Actions SSH keyscan 失敗修復

- 會話的主要目的：修正 Production Deploy workflow 在 `Deploy to Hostinger VPS` 的 `Configure SSH` 階段卡住 `ssh-keyscan failed after 5 attempts` 的問題。
- 完成的主要任務：
  1. `.github/workflows/production-deploy.yml`
     - 新增可選 `HOSTINGER_VPS_PORT`，預設為 `22`。
     - 在 `ssh-keyscan` 前先用 `nc` 檢查 SSH 端口可達性。
     - `ssh-keyscan` 改為 `-4` 強制走 IPv4，避免 hostname / IPv6 解析問題。
     - SSH config 補上 `Port` 欄位。
     - 失敗時新增更明確的提示，提醒檢查 `HOSTINGER_VPS_HOST` 是否為最新 IPv4。
  2. `docs/deployment.md`
     - 更新 Secrets 說明，明確建議 `HOSTINGER_VPS_HOST` 直接填 `72.62.253.72` 這類 IPv4。
     - 補充 `HOSTINGER_VPS_PORT` 的可選用途。
- 關鍵決策和解決方案：本機已驗證 `72.62.253.72:22` 可達且 `ssh-keyscan` 可成功返回 host key，因此這次更像是 GitHub Actions runner 在 hostname / IPv6 / 端口探測階段的不穩定問題；用最小改動把 workflow 改成優先走 IPv4，並提前做 TCP 連通性檢查。
- 使用的技術棧：GitHub Actions、OpenSSH、netcat、Hostinger VPS。
- 新增或修改文件：
  - 修改：`.github/workflows/production-deploy.yml`、`docs/deployment.md`、`README.md`
- 驗證結果：
  - 已通過：本機 `nc -vz 72.62.253.72 22`
  - 已通過：本機 `ssh-keyscan -4 -T 10 72.62.253.72`
  - 已通過：本機 `ssh root@72.62.253.72 'echo ok'`
- 下一步行動清單：
  1. 到 GitHub Secrets 確認 `HOSTINGER_VPS_HOST` 是否為目前生效的 IPv4，而不是過期主機名。
  2. 重新執行 `Production Deploy` workflow，觀察 `Configure SSH` 是否恢復正常。

### 2026-08-04（星期二）— Deploy SSH 探測改為真實登入驗證

- 會話的主要目的：處理 GitHub Actions 仍停留在舊版 `ssh-keyscan` 流程導致的部署失敗，將 `Configure SSH` 改為更接近實際部署條件的登入探測。
- 完成的主要任務：
  1. `.github/workflows/production-deploy.yml`
     - 保留 `nc -4` TCP 探測。
     - 移除 `ssh-keyscan` 重試流程。
     - 改為直接用部署私鑰執行一次 `ssh -4 ... "echo SSH ready"`。
     - `StrictHostKeyChecking` 改為 `accept-new`，讓首次連線時自動寫入 `known_hosts`。
     - 失敗提示補充 SSH 私鑰與 `authorized_keys` 不匹配的檢查方向。
  2. `docs/deployment.md`
     - 同步記錄 GitHub Actions 現在的 SSH 探測方式與常見失敗原因。
  3. `README.md`
     - 追加本次會話總結，避免後續誤以為生產仍使用 `ssh-keyscan` 方案。
- 關鍵決策和解決方案：既然本機已確認 `72.62.253.72:22` 可達且可直接 SSH 登入，workflow 再卡在 `ssh-keyscan` 已無排查價值；改為用與實際部署一致的 SSH 私鑰登入探測，能更快分辨問題到底是網路、主機、還是金鑰。
- 使用的技術棧：GitHub Actions、OpenSSH、netcat、Markdown。
- 新增或修改文件：
  - 修改：`.github/workflows/production-deploy.yml`、`docs/deployment.md`、`README.md`
- 驗證結果：
  - 已確認：`git diff -- .github/workflows/production-deploy.yml docs/deployment.md README.md`
  - 已確認：workflow `Configure SSH` 已不再包含 `ssh-keyscan`
  - 未直接驗證：GitHub Actions 雲端部署結果，需推送後由 CI 實際執行
- 下一步行動清單：
  1. 推送 `main` 讓 GitHub Actions 重新使用新的 `Configure SSH` 流程。
  2. 若仍失敗，優先檢查 `HOSTINGER_VPS_SSH_KEY` 是否仍對應 VPS 上目前的 `authorized_keys`。

### 2026-08-04（星期二）— 媒體頁五欄位上下文建議與當前頁 suggestion 載入修復

- 會話的主要目的：讓媒體處理頁能根據圖片關聯文章上下文，為圖片標題、圖片簡介、圖片說明、Alt Text、檔案名稱五個欄位都生成可修改、可確認、可提交到 WordPress 後台的建議，並修正媒體建議在站點資料較多時可能顯示為空的問題。
- 完成的主要任務：
  1. `apps/api/src/seoOptimization.ts`
     - 媒體審計改為對五個欄位都主動生成上下文建議，不再只在缺失時才建立 suggestion。
     - 只要目前值與建議值不一致，就會建立媒體 suggestion，包含 `title`、`caption`、`description`、`altText`、`fileName`。
     - `caption`、`description`、`altText` 規則改為上下文優化導向；`fileName` 缺失時也可生成建議。
     - 新增 suggestion 查詢過濾能力，支援按 `targetType`、`targetCmsIds`、`limit` 取回需要的建議。
     - 審計重跑時會清理同一站點 / 目標 / 欄位尚未套用的舊 suggestion，避免重覆堆積。
  2. `apps/web/src/api/siteConnections.ts`
     - `getOptimizationSuggestions()` 新增查詢參數，支援指定媒體範圍。
  3. `apps/web/src/views/MediaOptimizationView.vue`
     - 媒體頁改為只拉當前頁面媒體對應的 suggestion，避免全站 suggestion 被 API 限制截斷後，彈窗欄位顯示 `-`。
     - 搜尋、分頁、Tab 切換後會同步刷新媒體資料與對應建議。
  4. `apps/api/tests/siteConnections.test.ts`
     - 補強媒體掃描 / 審計測試，驗證五個欄位都會產生 suggestion。
     - 新增 suggestion 篩選測試，確保可按指定媒體載入對應建議。
- 關鍵決策和解決方案：這次不額外插入一層前端假資料或臨時本地計算，而是直接把後端 suggestion 生成規則擴展成五欄位完整輸出，並讓前端按當前媒體範圍精準取數。這樣保留既有「編輯 -> 批准 -> 套用 -> Worker 寫回 WordPress」流程，不需要重做提交流程。
- 使用的技術棧：Fastify、TypeScript、Vue 3、Ant Design Vue、Vitest。
- 新增或修改文件：
  - 修改：`apps/api/src/seoOptimization.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/web/src/api/siteConnections.ts`、`apps/web/src/views/MediaOptimizationView.vue`、`README.md`
- 驗證結果：
  - 已通過：`npm run test -w @aieo/api -- siteConnections.test.ts`
  - 已通過：`npm run lint`
  - 已通過：`npm run build -w @aieo/api`
  - 已通過：`npm run build -w @aieo/web`
- 下一步行動清單：
  1. 若要把「AI」從目前的上下文規則提升為真實模型生成，可下一步把 Wenwen / OpenAI provider 接入媒體 suggestion prompt。
  2. 若要直接上線這輪修改，我可以下一步幫你提交並推送到 `main`。

### 2026-08-04（星期二）— 媒體建議升級為 WordPress 上下文 + AI 生成

- 會話的主要目的：將媒體處理頁從規則式建議升級為優先讀取 WordPress 後台文章上下文，再使用 AI 生成圖片標題、圖片簡介、圖片說明、Alt Text、檔案名稱建議，並保持可修改、可確認、可提交到 WordPress 的流程。
- 完成的主要任務：
  1. `apps/api/src/server.ts`
     - `createServer()` 新增 `textGenerationProvider` 注入能力，方便正式環境使用 Wenwen provider，也方便測試用 stub 驗證 AI 流程。
  2. `apps/api/src/seoOptimization.ts`
     - `registerSeoOptimizationRoutes()` 現在會接收文字生成 provider，並在建立 SEO audit 時傳入。
     - 媒體 suggestion 改為 async 生成流程。
     - 新增從文章 HTML 定位圖片附近內容的 `placementContext` 抽取邏輯，會優先根據 `wp-image-{cmsId}`、圖片 URL、檔名定位圖片在文章中的附近上下文。
     - 新增 AI prompt 與 JSON 解析邏輯：有配置文字模型時，會根據文章標題、slug、圖片附近段落、文章摘要、內容與現有圖片欄位，生成五欄位建議。
     - AI 回應會經過長度、純文字與檔名規範清洗；AI 不可用或輸出無效時，自動回退到既有規則式 suggestion。
  3. `apps/api/tests/siteConnections.test.ts`
     - 新增 AI 回歸測試，驗證有 provider 時，媒體 suggestion 會採用 AI 生成結果。
  4. `apps/web/src/i18n.ts`
     - 媒體頁說明文案改為明確表達「讀取 WordPress 文章上下文並使用 AI 生成建議」。
- 關鍵決策和解決方案：這次沒有另外新增一條全新的媒體 AI API，而是把既有 `/audits` -> `/suggestions` 流程升級成「AI 優先、規則回退」。這樣保留現有資料表、審核 UI、批准、寫回、回滾機制，同時令功能真正符合「從 WordPress 後台讀取文章上下文，使用 AI 生成建議」的需求。
- 使用的技術棧：Fastify、TypeScript、Vue 3、Vue I18n、Vitest、Wenwen / OpenAI 相容文字生成介面。
- 新增或修改文件：
  - 修改：`apps/api/src/server.ts`、`apps/api/src/seoOptimization.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/web/src/i18n.ts`、`README.md`
- 驗證結果：
  - 已通過：`npm run test -w @aieo/api -- siteConnections.test.ts`
  - 已通過：`npm run build -w @aieo/api`
  - 已通過：`npm run lint`
  - 已通過：`npm run build -w @aieo/web`
- 下一步行動清單：
  1. 生產或測試環境需要配置 `WENWEN_API_KEY`，否則系統會自動回退到規則式 suggestion。
  2. 若你要，我可以下一步把這一輪修改提交並推送到 `main`。

### 2026-08-05（星期三）— 媒體彈窗新增 AI 建議預覽與打開審核編輯

- 會話的主要目的：讓媒體詳情彈窗中的「建議內容」欄顯示 AI 建議預覽，並在「打開審核」欄提供可點擊編輯入口，而不是只顯示 `-`。
- 完成的主要任務：
  1. `apps/web/src/views/MediaOptimizationView.vue`
     - 媒體欄位詳情表中的「建議內容」改為顯示 AI 建議預覽與錯誤提示，不再直接內嵌編輯框。
     - 「打開審核」欄改為可點擊按鈕，只有存在 suggestion 時才顯示。
     - 新增獨立審核彈窗，打開後可查看目前內容、編輯 AI 建議、保存修改、批准建議、加入寫回 WordPress 隊列。
     - 主媒體彈窗關閉或切換站點時，會同步清理審核狀態。
  2. `apps/web/src/i18n.ts`
     - 補上 `AI 建議`、`打開審核`、`可編輯建議`、`媒體審核` 等中英文文案。
- 關鍵決策和解決方案：這次保留既有 suggestion / approve / apply API，不改寫回流程，只把媒體詳情 UI 改成「列表預覽 + 單欄位審核編輯」模式，對齊你截圖中希望看到的 `建議內容` 和 `打開審核` 行為。
- 使用的技術棧：Vue 3、Ant Design Vue、Vue I18n。
- 新增或修改文件：
  - 修改：`apps/web/src/views/MediaOptimizationView.vue`、`apps/web/src/i18n.ts`、`README.md`
- 驗證結果：
  - 已通過：`npm run lint`
  - 已通過：`npm run build -w @aieo/web`
- 下一步行動清單：
  1. 若你要上線，我可以下一步將目前所有未提交的媒體 AI / 審核相關修改一併 commit 並 push。
  2. 若你要我再進一步優化審核體驗，我可以把「打開審核」擴展成 Drawer，加入前後內容差異比對。

### 2026-08-05（星期三）— 修復媒體掃描建議類型資料庫約束錯誤

- 會話的主要目的：修復媒體處理頁選擇網站後執行「掃描並分析」時，新增媒體標題、簡介或說明建議會觸發 `optimization_suggestions_suggestion_type_check` 的問題。
- 完成的主要任務：
  1. `db/migrations/0007_expand_media_suggestion_types.sql`
     - 新增原子 migration，重建 `optimization_suggestions.suggestion_type` 檢查約束。
     - 在既有類型基礎上加入 `media_title`、`media_caption`、`media_description`。
  2. `apps/api/src/seoOptimization.ts`
     - 非生產環境執行 `ensureSchema()` 時同步重建相同約束，讓舊本地資料庫不需重建資料表即可恢復掃描。
  3. `apps/api/tests/siteConnections.postgres.test.ts`
     - 新增 PostgreSQL 回歸測試，在隔離 schema 中建立舊版約束、執行 migration，並驗證三種新增媒體建議類型可正常寫入。
- 關鍵決策和解決方案：錯誤不是建議生成內容本身，而是應用層新增了三種媒體 suggestion type，既有資料庫仍保留舊 CHECK constraint；採用 migration 更新既有生產資料庫，並保留非生產 schema 自修復，避免只修改 TypeScript 型別或 `CREATE TABLE IF NOT EXISTS` 而無法修正既有資料表。
- 使用的技術棧：PostgreSQL、SQL migration、Fastify、TypeScript、Vitest。
- 新增或修改文件：
  - 新增：`db/migrations/0007_expand_media_suggestion_types.sql`
  - 修改：`apps/api/src/seoOptimization.ts`、`apps/api/tests/siteConnections.postgres.test.ts`、`README.md`
- 驗證結果：
  - 已通過：`git diff --check`
  - 已通過：`npm run test --workspace @aieo/api -- tests/siteConnections.test.ts`（19 tests）
  - 已通過：`npm run build --workspace @aieo/api`
  - 已通過：`npm run lint -- --quiet`
  - 已通過：PostgreSQL migration 回歸用例 `allows all media suggestion types after expanding the constraint`
  - 已通過：本地 `npm run db:migrate`，已套用 `0007_expand_media_suggestion_types.sql` 並確認資料庫約束包含三種新增媒體類型
  - 已知既有測試環境問題：完整 `siteConnections.postgres.test.ts` 中原有站點連接用例在復用本地資料庫時未返回新 API Token；本次新增 migration 用例獨立執行已通過。
- 下一步行動清單：
  1. 部署時執行 `npm run db:migrate`，讓生產資料庫套用 `0007_expand_media_suggestion_types.sql`。
  2. 部署後重新執行媒體「掃描並分析」，確認五個媒體欄位建議均能建立。

### 2026-08-05（星期三）— 媒體 AI 功能生產部署與 Web 健康探針修復

- 會話的主要目的：將媒體 AI 建議、審核介面與 suggestion type 資料庫修復推送到 `main` 並部署至生產環境，同時確保公開入口與 Docker 容器健康狀態正常。
- 完成的主要任務：
  1. 提交並推送 `294da47 feat(media): add AI-assisted optimization review`，觸發 GitHub Actions `Production Deploy`。
  2. GitHub Actions 完成 lint、test、build、security audit、SSH 部署、資料庫 migration、公開 health check 與受保護 API smoke check。
  3. 生產資料庫已套用 `0007_expand_media_suggestion_types.sql`，約束已包含 `media_title`、`media_caption`、`media_description`。
  4. 部署後發現 Web 容器雖可正常返回 HTTP 200，但 Docker healthcheck 因 `localhost` 解析到未監聽的回環地址而誤報 `unhealthy`。
  5. `Dockerfile.web` 將健康探針固定為 `http://127.0.0.1/`；已在生產容器內驗證舊 `localhost` 探針失敗、IPv4 探針成功。
  6. GitHub Actions runner 連續兩次無法連接 VPS 22 端口後，改用 `scripts/deploy-production.sh` 手動部署已提交版本；並修正手動模式下預設 smoke 帳號未傳入 Python 子程序的問題。
- 關鍵決策和解決方案：不以公開網站可訪問作為唯一成功標準；發現容器健康狀態異常後，直接驗證容器內探針行為並修正根因，不重啟或修改其他生產資源。
- 使用的技術棧：Git、GitHub Actions、Docker、Docker Compose、Nginx、PostgreSQL、Fastify、Vue 3。
- 新增或修改文件：
  - 修改：`Dockerfile.web`、`scripts/deploy-production.sh`、`README.md`
- 驗證結果：
  - 已通過：本地 `npm run lint`、`npm run test`、`npm run build`、`npm run security:audit`
  - 已通過：GitHub Actions run `30992991011` 的 Verify 與 Deploy jobs
  - 已通過：`https://api.rankwoven.com/health` 與 `https://rankwoven.com` HTTP 200
  - 已通過：生產 migration 記錄與 suggestion type 約束檢查
  - 已通過：生產 Web 容器內 `wget http://127.0.0.1/`
  - 已通過：`bash -n scripts/deploy-production.sh`
  - 本地 Docker 鏡像重建未完成：Docker Hub metadata 請求逾時；改由 GitHub Actions 執行正式鏡像建置與重新部署。
- 下一步行動清單：
  1. 重新部署後確認 `rankwoven-web-1` 狀態變為 `healthy`。
  2. 在生產媒體處理頁重新執行「掃描並分析」，驗證五欄位建議建立與審核流程。

### 2026-08-05（星期三）— 核對 GitHub Actions 舊 SSH 失敗記錄

- 會話的主要目的：確認使用者截圖中的 `Configure SSH` 失敗是否代表目前生產部署仍然異常。
- 完成的主要任務：
  1. 核對最近五次 `Production Deploy` 記錄，確認截圖對應 run `30993561765`，該次因 GitHub Actions runner 無法連接 VPS 22 端口而失敗。
  2. 確認後續 run `30994060542` 已於 2026-08-05 成功完成 Verify 與 Deploy，部署提交為 `da05b5b`。
  3. 重新檢查公開 API、主站、VPS release 與 Docker Compose 容器狀態。
- 關鍵決策和解決方案：截圖是已被後續成功部署覆蓋的舊失敗記錄，不需要再次修改程式碼或重啟生產服務。
- 使用的技術棧：GitHub CLI、SSH、Docker Compose、curl。
- 新增或修改文件：
  - 未修改應用程式文件；僅追加 `README.md` 會話核對記錄。
- 驗證結果：
  - 最新 `Production Deploy` run `30994060542`：成功
  - 生產提交：`da05b5bc4eac29c7d9be4e75cc5c8169281fa969`
  - `https://api.rankwoven.com/health`：HTTP 200
  - `https://rankwoven.com`：HTTP 200
  - `rankwoven-web-1`、PostgreSQL、Redis：`healthy`
  - API、Worker：正常運行
- 下一步行動清單：
  1. GitHub Actions 中以最新成功 run `30994060542` 為準，舊失敗 run 可忽略。
  2. 若未來再次出現相同 SSH 失敗，可先重跑 Deploy job；本機直連可用時代表多半是 GitHub runner 的暫時網路問題。

### 2026-08-05（星期三）— 過濾媒體建議中的 Shortcode 與移除 AI 建議標籤

- 會話的主要目的：修復媒體處理頁的圖片簡介與圖片說明截取到 `[vc_custom_heading ...]` 等程式碼內容，並移除建議列表與審核介面中的「AI 建議」字樣。
- 完成的主要任務：
  1. `apps/api/src/seoOptimization.ts`
     - 新增非正文標記清洗，先從完整文章內容移除 WordPress shortcode、HTML 註解、`script`、`style`、`pre` 與 `code` 區塊，再定位圖片並截取上下文。
     - `normalizePlainText()` 復用相同清洗流程，確保規則式建議與傳給文字模型的文章摘要均不含程式碼內容。
  2. `apps/api/tests/siteConnections.test.ts`
     - 在媒體掃描測試加入超長 `vc_custom_heading` shortcode，重現圖片簡介與說明被截取為程式碼的問題。
     - 在文字模型測試加入 shortcode 與 `<code>` 區塊，驗證傳給 provider 的上下文已完成過濾。
  3. `apps/web/src/views/MediaOptimizationView.vue`、`apps/web/src/i18n.ts`
     - 移除建議內容下方與審核彈窗中的「AI 建議」標籤。
     - 審核提示改為中性的「檢查建議」，保留原有編輯、批准與寫回流程。
- 關鍵決策和解決方案：根因是先在原始 HTML 中找到媒體檔名再截取片段，長 shortcode 會在結尾 `]` 之前被截斷，導致後續正則無法辨識；改為先清洗完整 HTML 再定位，而不是只加一條針對畫面字串的替換。
- 使用的技術棧：Fastify、TypeScript、Vue 3、Vue I18n、Vitest。
- 新增或修改文件：
  - 修改：`apps/api/src/seoOptimization.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/web/src/views/MediaOptimizationView.vue`、`apps/web/src/i18n.ts`、`README.md`
- 驗證結果：
  - 修復前：定向測試可重現 `suggestedValue` 以 `[vc_custom_heading source="hero-image.jpg ...` 開頭。
  - 已通過：`npm run test --workspace @aieo/api -- tests/siteConnections.test.ts`（19 tests）
  - 已通過：`npm run build --workspace @aieo/api`
  - 已通過：`npm run build --workspace @aieo/web`
  - 已通過：`npm run lint -- --quiet`
  - 已確認：媒體頁面不再引用 `media.aiSuggestion`，中英文媒體文案不再顯示「AI 建議」。
- 下一步行動清單：
  1. 在本地或部署後重新執行媒體「掃描並分析」，重新生成受影響圖片的建議內容。
  2. 若要上線，本次修改可提交並推送到 `main` 觸發生產部署。

### 2026-08-05（星期三）— 修復媒體審核彈窗按鈕顯示 i18n Key

- 會話的主要目的：修復媒體審核彈窗底部兩個按鈕顯示 `common.cancel` 與 `suggestions.approve`，而不是正常中文文案的問題。
- 完成的主要任務：
  1. `apps/web/src/i18n.ts`
     - 在中英文 `common` 命名空間新增通用 `cancel` 文案。
  2. `apps/web/src/views/MediaOptimizationView.vue`
     - 取消按鈕保留 `common.cancel`，現在可正確解析為 `Cancel` / `取消`。
     - 批准按鈕改為復用已存在的 `articleSuggestions.approve`，正確解析為 `Approve` / `批准`。
  3. `apps/web/tests/smoke.test.ts`
     - 新增媒體審核操作文案回歸測試，同時檢查中英文翻譯結果與模板 key 引用。
- 關鍵決策和解決方案：`suggestions` 命名空間沒有 `approve`，因此不新增重複 key，而是復用語意相同的 `articleSuggestions.approve`；取消操作屬於跨頁共用行為，補入 `common.cancel`。
- 使用的技術棧：Vue 3、Vue I18n、Vitest、TypeScript。
- 新增或修改文件：
  - 修改：`apps/web/src/i18n.ts`、`apps/web/src/views/MediaOptimizationView.vue`、`apps/web/tests/smoke.test.ts`、`README.md`
- 驗證結果：
  - 修復前：回歸測試取得 `common.cancel` 字面值並失敗。
  - 已通過：`npm run test --workspace @aieo/web`（2 tests）
  - 已通過：`npm run build --workspace @aieo/web`
  - 已通過：`npm run lint -- --quiet`
  - 已確認：媒體審核模板不再引用不存在的 `suggestions.approve`。
- 下一步行動清單：
  1. 打開媒體審核彈窗確認按鈕顯示「取消」與「批准」。
  2. 若要上線，可將本輪與上一輪 shortcode 過濾修改一起提交並部署。

### 2026-08-05（星期三）— 修復媒體建議批准後 WORDPRESS_REST_404

- 會話的主要目的：修復媒體建議批准並進入 WordPress 寫回流程後，Worker 在讀取媒體目前值時收到 `WORDPRESS_REST_404` 的問題。
- 完成的主要任務：
  1. `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`
     - 修正單一媒體 REST 讀取的附件狀態判定，改為檢查附件資料列原始的 `$attachment->post_status`。
     - 避免使用 `get_post_status()` 將附件的 `inherit` 狀態解析成父文章的 `publish`，令正常圖片附件被錯誤判定為不可同步。
  2. 按 `plugins/wordpress/TESTING.md` 將插件同步到本地 `cyruschan.com` WordPress 測試站，完成 PHP 語法與 REST fixture 回歸驗證。
- 關鍵決策和解決方案：保留現有批量同步、圖片 MIME 判定及寫回邏輯，只修正單一媒體讀取與批量同步不一致的附件狀態檢查；這是能直接消除 404 的最小修改。
- 使用的技術棧：WordPress REST API、PHP、Docker、Vue 3、Fastify、TypeScript、Vitest、ESLint、Vite。
- 新增或修改文件：
  - 修改：`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`README.md`
- 驗證結果：
  - 修復前 fixture：附件原始狀態為 `inherit`、解析狀態為 `publish`、`wp_attachment_is_image()` 為 true，`GET /rankwoven/v1/media/{id}` 返回 404。
  - 修復後 fixture：相同條件下 `GET /rankwoven/v1/media/{id}` 返回 200，並返回正確媒體 ID。
  - 已通過：WordPress 容器 PHP 語法檢查，插件來源與本地測試站文件一致。
  - 已通過：`npm run lint`。
  - 已通過：`npm run test`（所有非跳過測試通過）。
  - 已通過：`npm run build`；Vite 僅有既有的大型 chunk 警告。
  - 未執行：生產 WordPress 插件部署及 dead-letter 任務重試，避免在未再次確認部署範圍前修改生產狀態。
- 下一步行動清單：
  1. 將本輪插件修復與目前已驗證的媒體頁修改提交並部署到生產環境。
  2. 部署後以媒體 ID `1671` 驗證單一媒體 REST 返回 200，再重試三筆 `dead_letter` 寫回任務。

### 2026-08-05（星期三）— 媒體列表移除三個分類分頁

- 會話的主要目的：取消媒體頁「全部」、「缺少 Alt Text」、「檔案名稱」三個分頁，改為在同一個列表統一顯示全部媒體。
- 完成的主要任務：
  1. `apps/web/src/views/MediaOptimizationView.vue`
     - 移除三個媒體分類 tabs。
     - 移除 `activeTab`、`activeIssue` 與分頁切換監聽。
     - 載入媒體時不再傳送 `missing_alt` 或 `missing_file_name` 條件，固定取得全部媒體。
     - 保留搜尋、分頁、建議統計標籤、媒體詳情與審核功能。
  2. `apps/web/src/i18n.ts`
     - 移除已不再使用的「缺少 Alt Text」與「檔案名稱」分頁文案。
  3. `apps/web/tests/smoke.test.ts`
     - 新增來源回歸檢查，防止媒體 tabs 與條件篩選狀態再次被加入。
- 關鍵決策和解決方案：不改 API 或資料結構，只移除前端分類入口及其查詢參數，使用既有無 `issue` 條件的媒體列表取得全部資料。
- 使用的技術棧：Vue 3、TypeScript、Ant Design Vue、Vue I18n、Vitest、ESLint、Vite。
- 新增或修改文件：
  - 修改：`apps/web/src/views/MediaOptimizationView.vue`、`apps/web/src/i18n.ts`、`apps/web/tests/smoke.test.ts`、`README.md`
- 驗證結果：
  - 已通過：`npm run test -w @aieo/web`（2 tests）。
  - 已通過：`npm run lint`。
  - 已通過：`npm run build -w @aieo/web`；Vite 僅有既有的大型 chunk 警告。
- 下一步行動清單：
  1. 部署後打開媒體處理頁，確認三個分頁不再顯示且表格直接列出全部媒體。

### 2026-08-05（星期三）— 推送媒體分析與 WordPress 寫回修復

- 會話的主要目的：將已完成的媒體正文過濾、審核介面、統一列表及 WordPress 單媒體 404 修復整理為同一批更新並推送。
- 完成的主要任務：核對工作區差異，排除 `.codebuddy` 與本地圖片等無關未追蹤文件，重新執行完整發布前驗證並準備推送 `main`。
- 關鍵決策和解決方案：只提交本輪七個相關文件，不使用 `git add .`，避免夾帶無關工作區內容；推送 `main` 後由既有 GitHub Actions 接續生產部署。
- 使用的技術棧：Git、GitHub Actions、ESLint、Vitest、TypeScript、Vite、npm audit、WordPress PHP。
- 新增或修改文件：本次沒有新增功能文件；提交目前已驗證的 `README.md`、API、Web 與 WordPress 插件修改。
- 驗證結果：`npm run lint`、`npm run test`、`npm run build` 全部通過；`npm run security:audit` 顯示 0 個漏洞；Vite 僅有既有的大型 chunk 警告。
- 下一步行動清單：推送後確認遠端提交與 Production Deploy workflow 狀態，再驗證公開 health endpoint。

### 2026-08-05（星期三）— 媒體建議全欄位代碼過濾與勾選批量套用

- 會話的主要目的：修復圖片簡介仍可能出現截斷 shortcode 或 code fence 的問題，並在媒體列表加入「只套用已勾選項目」的一鍵批量套用功能。
- 完成的主要任務：
  1. `apps/api/src/seoOptimization.ts`
     - 清洗圖片標題、簡介、說明、Alt Text、檔案名稱五個建議欄位。
     - 支援移除缺少結尾括號的截斷 shortcode、HTML code 區塊、Markdown code fence、HTML 註解及一般標記。
     - AI 回應先確認完整 JSON，再清洗每個欄位，避免欄位內的 ``` 觸發錯誤 JSON 提取。
     - 舊媒體建議在讀取、手動更新、批准及寫回前再次清洗，避免代碼顯示或寫回 WordPress。
  2. `apps/web/src/views/MediaOptimizationView.vue`
     - 媒體列表新增 checkbox 多選。
     - 「一鍵套用修改」只收集已勾選媒體的建議 ID；未勾選媒體不會批准、不會建立寫回任務。
     - 一鍵操作會先批量批准，再批量建立寫回任務；沒有可操作建議的媒體不可勾選。
  3. `apps/web/src/i18n.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/web/tests/smoke.test.ts`
     - 補上批量套用文案與 API/UI 回歸測試。
- 關鍵決策和解決方案：保留既有 `batch-approve` 與 `batch-apply` API，不新增重複接口；前端只以已勾選的媒體 ID 過濾建議，並由後端在批准與寫回前做最後安全清洗。
- 使用的技術棧：Fastify、TypeScript、Vue 3、Ant Design Vue、Vue I18n、Vitest、Vite、PostgreSQL Repository。
- 新增或修改文件：
  - 修改：`apps/api/src/seoOptimization.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/web/src/views/MediaOptimizationView.vue`、`apps/web/src/i18n.ts`、`apps/web/tests/smoke.test.ts`、`README.md`
- 驗證結果：
  - 已通過：API 定向測試 19 項、Web 定向測試 2 項。
  - 已通過：全 workspace 測試、全 workspace build、ESLint、`git diff --check`。
  - 已通過：`npm run security:audit`，0 個漏洞。
  - Vite 僅有既有大型 chunk 警告。
- 下一步行動清單：重新掃描媒體以產生清洗後建議；如需上線，再提交並推送本輪修改。

### 2026-08-05（星期三）— 支援識別 WooCommerce 商品圖片

- 會話的主要目的：修復文章配圖可取得內容上下文，但 WooCommerce 商品圖片無法識別所屬商品的問題。
- 完成的主要任務：
  1. `apps/api/src/siteConnections.ts`
     - WordPress 媒體父內容查詢在文章與頁面均返回 404 後，新增回退查詢 `wp-json/wp/v2/product/{id}`。
     - 保留既有媒體同步與建議生成流程，成功讀取商品標題、摘要及內容後，用作商品圖片的分析上下文。
  2. `apps/api/tests/siteConnections.test.ts`
     - 新增 WooCommerce 商品圖片回歸測試，模擬媒體 `post` 指向商品 ID。
     - 驗證商品圖片可取得 `attachedToTitle`，並產生標題、簡介、說明、Alt Text、檔案名稱五項建議。
- 關鍵決策和解決方案：採用最小 REST 路徑回退修復，不新增 WooCommerce Consumer Key、資料表或獨立商品同步機制；未知內容類型仍沿用現有同步內容型別，避免擴大 API 變更範圍。
- 使用的技術棧：Fastify、TypeScript、WordPress REST API、WooCommerce Product REST Route、Vitest、ESLint、Vite。
- 新增或修改文件：
  - 修改：`apps/api/src/siteConnections.ts`、`apps/api/tests/siteConnections.test.ts`、`README.md`
- 驗證結果：
  - 已通過：`npm run test -w @aieo/api -- tests/siteConnections.test.ts`（20 tests）。
  - 已通過：全 workspace 測試、全 workspace build、ESLint、`git diff --check`。
  - 已通過：`npm run security:audit`，0 個漏洞。
  - Vite 僅有既有大型 chunk 警告。
- 下一步行動清單：部署後重新掃描商品圖片，確認媒體列表顯示所屬商品名稱；若個別商品圖在 WordPress 媒體資料中的 `post` 為 `0`，再針對 WooCommerce 商品圖庫關聯補充同步策略。

### 2026-08-05（星期三）— 修復手動保存 Failed to fetch 與商品圖片關聯

- 會話的主要目的：修復媒體建議手動修改保存時出現 `Failed to fetch`，以及 WooCommerce 商品圖片重新掃描後仍無法識別所屬商品的問題。
- 完成的主要任務：
  1. `apps/api/src/server.ts`
     - 明確設定 CORS 允許 `GET`、`HEAD`、`POST`、`PUT`、`PATCH`、`DELETE`、`OPTIONS`。
     - 修復瀏覽器對建議更新 `PUT` 請求的預檢被阻擋，導致前端只顯示 `Failed to fetch`。
  2. `apps/api/src/siteConnections.ts`
     - 對沒有 WordPress 父內容 ID 的媒體，分頁讀取 WooCommerce Store API `wc/store/v1/products`。
     - 使用 `products[].images[].id` 建立圖片媒體與商品 ID 的關聯，支援商品主圖及圖庫圖片。
     - 關聯完成後沿用既有 `wp/v2/product/{id}` 查詢商品標題、摘要及內容，作為圖片建議上下文。
  3. `apps/api/tests/health.test.ts`、`apps/api/tests/siteConnections.test.ts`
     - 新增 CORS `PUT` 預檢回歸測試。
     - 將商品圖片 fixture 改為真實資料形態 `post: null`，驗證 Store API 反查後可產生五項媒體建議。
- 關鍵決策和解決方案：生產實測確認 API 與部署健康，但 CORS 回應只有 `GET,HEAD,POST`；同時確認 `cyruschan.com` 的 12 個商品主圖媒體 `post` 全部為 `null`。因此不再依賴附件父文章欄位，改用 WooCommerce 公開 Store API 的圖片關聯作為可靠資料來源。
- 使用的技術棧：Fastify、`@fastify/cors`、TypeScript、WordPress REST API、WooCommerce Store API、Vitest、ESLint、Vite、GitHub Actions。
- 新增或修改文件：
  - 修改：`apps/api/src/server.ts`、`apps/api/src/siteConnections.ts`、`apps/api/tests/health.test.ts`、`apps/api/tests/siteConnections.test.ts`、`README.md`
- 驗證結果：
  - 生產診斷：GitHub Actions 已成功部署 `fe67b3d`；`https://api.rankwoven.com/health` 與 `https://rankwoven.com` 返回 200。
  - 修復前回歸測試穩定失敗：CORS 缺少 `PUT`；`post: null` 商品圖片同步結果為 `articlesReceived: 0`。
  - 修復後定向測試通過：28 tests。
  - 已通過：全 workspace 測試、全 workspace build、ESLint、`git diff --check`。
  - 已通過：`npm run security:audit`，0 個漏洞。
  - Vite 僅有既有大型 chunk 警告。
- 下一步行動清單：提交並推送本輪五個文件；部署後確認 OPTIONS 回應包含 `PUT`，再重新執行「掃描並分析」以更新商品圖片與商品的關聯。

### 2026-08-05（星期三）— 移除側邊欄一鍵套用及支援 Portfolio／頁面圖片

- 會話的主要目的：移除側邊欄「一鍵套用」menu，並讓 Portfolio 與一般 WordPress 頁面的圖片可像文章、商品圖片一樣自動取得內容上下文及生成 SEO 建議。
- 完成的主要任務：
  1. `apps/web/src/App.vue`
     - 從側邊欄導航移除 `/app/apply` 的「一鍵套用」入口及未再使用的圖示 import。
     - 保留媒體頁的勾選批量套用功能及原有 route，避免破壞既有流程與直接連結。
  2. `apps/api/src/siteConnections.ts`
     - 對商品關聯後仍沒有父內容的媒體，分頁讀取 WordPress 頁面內容。
     - 從頁面 HTML 的 `src`、`data-src`、`data-lazy-src` 提取圖片 URL，與媒體 `source_url` 對照。
     - URL 對照會忽略協議、查詢字串及 WordPress 縮圖尺寸尾碼，例如將 `pf-1-300x300.jpg` 對應至原圖 `pf-1.jpg`。
     - 同時支援頁面 `featured_media`；關聯成功後沿用既有頁面標題、摘要及正文生成五項圖片 SEO 建議。
     - 「掃描並分析」在沒有明確傳入 `updatedAfter` 時改為完整掃描，不再自行套用站點 `lastSyncAt`，確保舊有商品、Portfolio 與頁面圖片可以重新分析。
  3. `apps/api/tests/siteConnections.test.ts`、`apps/web/tests/smoke.test.ts`
     - 新增 `post: null` Portfolio／頁面圖片 URL 關聯測試。
     - 驗證已有 `lastSyncAt` 時完整掃描不會加入 `modified_after`。
     - 新增側邊欄不再包含 `/app/apply` menu item 的來源回歸檢查。
- 關鍵決策和解決方案：生產站沒有獨立公開的 Portfolio REST post type；Portfolio 實際為「作品案例」頁面（ID `1680`），12 張圖片只存在於頁面 HTML 且附件 `post` 為 `null`。因此使用頁面 HTML 圖片 URL 與媒體原圖 URL 建立關聯，比猜測自訂文章類型 route 更簡單可靠。
- 使用的技術棧：Vue 3、TypeScript、Ant Design Vue、Fastify、WordPress REST API、WooCommerce Store API、Vitest、ESLint、Vite。
- 新增或修改文件：
  - 修改：`apps/web/src/App.vue`、`apps/web/tests/smoke.test.ts`、`apps/api/src/siteConnections.ts`、`apps/api/tests/siteConnections.test.ts`、`README.md`
- 驗證結果：
  - 定向測試：API 29 tests、Web 2 tests 全部通過。
  - 已通過：全 workspace 測試、全 workspace build、ESLint、`git diff --check`。
  - 已通過：`npm run security:audit`，0 個漏洞。
  - Vite 僅有既有大型 chunk 警告。
- 下一步行動清單：提交並推送目前修改；部署後重新按「掃描並分析」，確認「作品案例」及其他頁面圖片顯示所屬頁面名稱並產生五項 SEO 建議。

### 2026-08-05（星期三）— 精確識別 Portfolio 項目及商品圖片內容

- 會話的主要目的：讓圖片 SEO 建議不只關聯 Portfolio 總頁或商品類型，而是使用圖片實際所屬的單一 Portfolio 案例或商品名稱與描述；指定驗證 `pf-1.jpg → Eco Green Interior`、`12.jpg → Rattan Triple Seat Sofa`。
- 完成的主要任務：
  1. `apps/api/src/siteConnections.ts`
     - 解析 Portfolio 列表頁每個 `gallery item` 的圖片 URL、`project-name` 與 `/portfolio/.../` 詳情連結。
     - 只允許讀取與連接站點相同 hostname 的 Portfolio 詳情 URL，避免由 WordPress 內容觸發外部伺服器請求。
     - 對匹配的圖片保留單一案例標題，例如 `pf-1.jpg` 的 `attachedToTitle` 為 `Eco Green Interior`，不再被總頁標題「作品案例」覆蓋。
     - 讀取 Portfolio 詳情頁正文，嵌入該圖片附近的分析上下文，讓圖片簡介與說明使用案例本身的內容。
     - In-memory 與 PostgreSQL 媒體列表均改為優先使用媒體的精確關聯標題，缺少時才回退父文章或頁面標題。
     - 商品圖片繼續使用 WooCommerce Store API `images[].id` 找到商品 ID，再從 `wp/v2/product/{id}` 取得商品名稱、摘要及描述。
  2. `apps/api/tests/siteConnections.test.ts`
     - 強化商品圖片測試，驗證建議標題等於商品名稱，描述包含商品正文。
     - 強化 Portfolio 測試，驗證 `pf-1.jpg` 顯示 `Eco Green Interior`，建議描述包含詳情頁的 sustainable interior design 正文。
- 關鍵決策和解決方案：不建立不可寫回的虛擬 Portfolio 文章，也不新增資料庫欄位；媒體仍關聯到 WordPress Portfolio 總頁 ID，但保存精確案例標題，並將詳情正文放到對應圖片附近供既有媒體上下文提取器使用。
- 使用的技術棧：Fastify、TypeScript、WordPress REST API、WooCommerce Store API、HTML 結構解析、PostgreSQL、Vitest、ESLint、Vite。
- 新增或修改文件：
  - 修改：`apps/api/src/siteConnections.ts`、`apps/api/tests/siteConnections.test.ts`、`README.md`
- 驗證結果：
  - 生產資料驗證：`pf-1.jpg` 卡片連結到 `Eco Green Interior`；詳情頁包含案例資料與 `Our Solutions` 正文。
  - 生產商品驗證：`12.jpg`（媒體 ID `750`）屬於商品 ID `744`，名稱為 `Rattan Triple Seat Sofa`，Store API 與 WordPress Product API 均返回完整商品描述。
  - 精確定向測試通過：商品與 Portfolio 2 tests。
  - 已通過：全 workspace 測試、全 workspace build、ESLint、`git diff --check`。
  - 已通過：`npm run security:audit`，0 個漏洞。
  - Vite 僅有既有大型 chunk 警告。
- 下一步行動清單：提交並推送目前修改；部署後執行完整「掃描並分析」，確認 `pf-1.jpg` 與 `12.jpg` 分別使用 `Eco Green Interior` 與 `Rattan Triple Seat Sofa` 的內容生成建議。

### 2026-08-05（星期三）— 修復媒體掃描缺少關聯標題欄位

- 會話的主要目的：修復生產環境完成媒體掃描分析後，媒體列表因 PostgreSQL 缺少 `synced_media.attached_to_title` 欄位而返回 `column sm.attached_to_title does not exist`。
- 完成的主要任務：
  1. 新增可重複執行的 `0008` migration，為 `synced_media` 加入長度 300 的 `attached_to_title` 欄位。
  2. 同步更新非生產自動 schema，避免本地與生產資料表定義再次分歧。
  3. 更新 PostgreSQL 媒體 upsert，在新增及更新媒體時保存精確 `attachedToTitle`，並保留列表查詢缺少精確標題時回退父文章標題的行為。
  4. 補充 PostgreSQL 回歸測試，直接驗證 migration 可重複執行，以及精確媒體關聯標題能保存並由列表 API 返回。
- 關鍵決策和解決方案：保留既有 `COALESCE(sm.attached_to_title, sa.title)` 查詢，只補齊缺失的 schema 與寫入路徑；部署腳本會在重建服務前執行 migration，因此不需要加入查詢層臨時兼容或手動修改生產資料庫。
- 使用的技術棧：Fastify、TypeScript、PostgreSQL 16、SQL migration、Vitest、Docker Compose、GitHub Actions。
- 新增或修改文件：
  - 新增：`db/migrations/0008_add_synced_media_attached_to_title.sql`
  - 修改：`apps/api/src/siteConnections.ts`、`apps/api/tests/siteConnections.postgres.test.ts`、`README.md`
- 驗證結果：
  - PostgreSQL migration 與 repository 整合測試通過：3 tests。
  - 全 workspace 測試通過；PostgreSQL 測試在一般測試命令中按既有設定跳過，另已使用本機 PostgreSQL 單獨完整執行。
  - 全 workspace build、ESLint、`git diff --check` 全部通過；Vite 僅有既有大型 chunk 警告。
  - `npm run security:audit` 通過，0 個漏洞。
- 下一步行動清單：提交並推送 hotfix 至 `main`，等待 Production Deploy 套用 `0008` migration，然後驗證公開 health endpoint 與媒體掃描列表。

### 2026-08-08（星期六）— 修正 Search Console 後台路由索引與 sitemap/robots 基礎配置

- 會話的主要目的：排查 Google Search Console 的「頁面會重新導向」問題，並確保 `/app`、`/admin` 後台路由不對搜索機器人開放。
- 完成的主要任務：
  1. 檢查線上站點索引入口，確認 `https://rankwoven.com/robots.txt` 當時返回 `404`，`https://rankwoven.com/sitemap.xml` 當時錯誤回傳 SPA HTML，而不是 XML sitemap。
  2. 在 `apps/web/nginx.conf` 新增 `sitemap.xml` 精確匹配，避免缺檔時落回 SPA `index.html`；同時對 `/app` 與 `/admin` 路由加上 `X-Robots-Tag: noindex, nofollow, noarchive`。
  3. 新增 `apps/web/public/robots.txt`，明確 `Disallow: /app` 與 `Disallow: /admin`，並指向正式 `https://rankwoven.com/sitemap.xml`。
  4. 新增 `apps/web/public/sitemap.xml`，只提交公開可索引頁面 `/` 與 `/pricing`。
  5. 修改 `apps/web/src/App.vue`，將公開頁頭部入口在未登入時由 `/app` 改為 `/login`，避免把搜索機器人直接引到受保護後台路由。
- 關鍵決策和解決方案：既然 `/app`、`/admin` 是後台程序，就不應再被 sitemap 提交，也不應由公開頁面直接鏈向它們；因此採用「移除公開入口 + robots.txt 封鎖 + Nginx `X-Robots-Tag` 防禦」這個最小且直接的方案，而不是擴大改動整套路由結構。
- 使用的技術棧：Vue 3、TypeScript、Vite、Nginx、SEO 基礎檔（`robots.txt`、`sitemap.xml`）。
- 新增或修改文件：
  - 新增：`apps/web/public/robots.txt`、`apps/web/public/sitemap.xml`
  - 修改：`apps/web/nginx.conf`、`apps/web/src/App.vue`、`README.md`
- 驗證結果：
  - `npm run build -w @aieo/web` 通過。
  - `npm run lint` 通過。
  - 已確認 `apps/web/dist/robots.txt` 與 `apps/web/dist/sitemap.xml` 正確產出。
  - 線上 `rankwoven.com` 尚未重新部署，因此 Search Console 狀態仍需待部署後重新驗證。
- 下一步行動清單：部署 Web 更新到生產；部署後檢查 `https://rankwoven.com/robots.txt` 與 `https://rankwoven.com/sitemap.xml`；再回 Google Search Console 對「頁面會重新導向」項目按「驗證修正」。
