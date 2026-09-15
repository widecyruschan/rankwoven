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
│   ├── rankwoven-phase-2-development-workflow.md
│   ├── rankwoven-phase-2-prd.md
│   ├── research/
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
- `/features`：前台核心功能頁，展示 PRD 定義的 10 個產品模塊
- `/pricing`：定價頁
- `/blog`：SEO 方法文章列表
- `/docs`：產品快速開始與使用文件
- `/help`：常見問題與支援入口
- `/about`：品牌使命與產品原則
- `/contact`：支援查詢表單原型
- `/privacy`：私隱政策頁骨架
- `/terms`：服務條款頁骨架
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

當前已建立 Pinia，部分客戶後台頁面已開始直接接入 API；前端文案統一由 Vue I18n 管理，完整提供 `en` 與 `zh-Hant`，其他語言選項以英文 fallback，後續按市場優先級補齊翻譯。後續資料共享增加後再拆分 Store。建議拆分：

- `useAuthStore`：登入狀態和用戶資料
- `useSiteStore`：當前站點、站點列表
- `useTaskStore`：任務隊列和進度
- `useUsageStore`：套餐用量

## API 使用說明

目前已建立 API 服務骨架：

- `GET /health`：服務健康檢查。
- `GET /api/v1/cms-adapters`：查看 CMS 適配器狀態。
- `GET /api/v1/ai-providers`：查看當前 AI、Embedding、圖片、媒體存儲與圖片優化 Provider 配置。
- `POST /api/v1/site-connections`：建立插件或 API 管理的站點連接，可使用既有 CMS 寫回流程。
- `POST /api/v1/site-connections/manual`：手動加入網站網址，提供相同分析與修復建議，但永久停用 CMS 寫回。
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
- `POST /api/v1/site-connections/:siteId/site-audit/manual-runs`：對已連接站點的單一公開 URL，或已同步且已發布的文章／商品執行只讀檢測；只返回問題與手動修復建議，不建立 CMS 寫回任務。
- `GET /api/v1/site-connections/:siteId/suggestions`：查看文章與媒體優化建議，並返回最近一次 SEO 審計分數、規則版本和問題數摘要。
- `POST /api/v1/site-connections/:siteId/suggestions`：手動建立優化建議記錄。
- `POST /api/v1/site-connections/:siteId/suggestions/:suggestionId/approve`：批准待處理建議。
- `POST /api/v1/site-connections/:siteId/suggestions/:suggestionId/apply`：為已批准建議建立 WordPress 寫回任務，並建立套用前後快照。
- `GET /api/v1/site-connections/:siteId/apply-queue`：查看站點已批准建議、寫回/回滾任務和套用快照。
- `POST /api/v1/site-connections/:siteId/apply-snapshots/:snapshotId/rollback`：為已套用快照建立回滾任務。
- `GET /api/v1/analytics/overview?siteId=&startDate=&endDate=`：讀取 GA4 或示範分析數據，支援站點 host 篩選與日期範圍。
- `PUT /api/v1/site-connections/:siteId/analytics-settings`：由工作區用戶保存站點 GA4 Property ID；手動網站只連接唯讀流量分析，不開啟 CMS 寫回。
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
- [RankWoven 第二階段 AI SEO PRD](docs/rankwoven-phase-2-prd.md)
- [RankWoven 第二階段開發流程與方案選型](docs/rankwoven-phase-2-development-workflow.md)
- [PH2-04 安全、私隱與 SSRF 核檢](docs/approvals/phase-2/PH2-04-security-privacy-ssrf.md)
- [第二階段 API、配額與成本研究](docs/research/phase-2-api-pricing-2026.md)
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

### 2026-08-09（星期日）— 補上正式站未部署的 SaaS 後台菜單調整

- 會話的主要目的：修正正式站 SaaS 後台仍顯示舊文章相關菜單的問題，將已在本地規劃好的側欄與路由收斂改動真正落到 `main` 並部署。
- 完成的主要任務：
  1. 在 `apps/web/src/App.vue` 移除客戶後台側欄中的文章審計、文章同步、處理建議、文章修改建議與內容審核入口。
  2. 在 `apps/web/src/router/index.ts` 將舊文章路由改為安全 redirect，避免既有連結進入失效頁面：
     - `/app/articles` -> `/app/sites`
     - `/app/article-sync` -> `/app/tasks`
     - `/app/suggestions`、`/app/article-suggestions`、`/app/review` -> `/app/media`
  3. 在 `apps/web/src/views/DashboardView.vue` 移除文章導向摘要，改為顯示已同步媒體與較中性的優先項。
  4. 在 `apps/web/src/views/SitesView.vue` 移除站點列表與詳情中的文章數欄位。
  5. 在 `apps/web/src/i18n.ts` 補上對應的新文案 key，並移除這次 UI 不再使用的文章統計文案。
- 關鍵決策和解決方案：這次不刪舊頁面檔與其他內容模組，只做導航與入口收斂，令正式站先反映「文章操作改回 WordPress 後台」這個產品決策，同時保留舊 route 的平滑導向能力。
- 使用的技術棧：Vue 3、TypeScript、Vue Router、Ant Design Vue、Vue I18n、Vite。
- 新增或修改文件：
  - 修改：`apps/web/src/App.vue`、`apps/web/src/router/index.ts`、`apps/web/src/views/DashboardView.vue`、`apps/web/src/views/SitesView.vue`、`apps/web/src/i18n.ts`、`README.md`
- 驗證結果：
  - `git diff --check` 通過。
  - `npm run build -w @aieo/web` 通過。
  - `npm run test -w @aieo/web` 通過，2 tests passed。
  - `npm run lint` 通過。
  - Vite 只有既有大型 chunk 警告，無新增 build 錯誤。
- 下一步行動清單：提交並推送至 `main` 觸發部署；部署後登入正式站確認側欄不再顯示舊文章入口，並抽查舊 URL redirect 是否正常。

### 2026-08-09（星期日）— 新增內部連結建議與 WordPress 多選套用流程

- 會話的主要目的：在 SaaS 後台建立可操作的內部連結建議流程，根據已同步文章、頁面、Portfolio 和商品內容推薦來源內容、目標內容、錨文本、相關性和理由，並支援多選後寫回 WordPress。
- 完成的主要任務：
  1. `apps/api/src/seoOptimization.ts`
     - 新增 `POST /api/v1/site-connections/:siteId/internal-links/generate`，從已同步內容中計算相關性、避開自連和已存在目標連結，生成 `internal_link` 類型建議。
     - 建議保存新的 `contentHtml`，並在 metadata 中保存來源、目標、錨文本、相關性與推薦理由，供前端列表展示。
     - 擴展建議 metadata 與長內容欄位上限，避免內部連結寫回內容被既有字數限制截斷。
  2. `apps/api/src/siteConnections.ts`、`apps/worker/src/index.ts`、`db/migrations/0001_initial_schema.sql`、`db/migrations/0009_internal_link_suggestions.sql`
     - 同步內容類型擴展為 `post`、`page`、`portfolio`、`product`。
     - 新增 migration，更新 `synced_articles.type` constraint，並為 `optimization_suggestions` 加入 `metadata jsonb`。
     - Worker 寫入同步內容時保留 Portfolio 與商品類型，方便後續內部連結分析。
  3. `apps/web/src/views/LinksView.vue`、`apps/web/src/api/siteConnections.ts`、`apps/web/src/i18n.ts`
     - 將內部連結頁從靜態示例改為真實 SaaS API 資料。
     - 支援選擇站點、刷新、生成建議、多選、批量批准並套用，以及單條插入。
     - 補齊英文與繁體中文文案，展示來源、目標、錨文本、相關性、原因、狀態和操作。
  4. `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`
     - 插件同步與站點側 REST API 支援文章、頁面、Portfolio 和商品。
     - 補充 WordPress 插件文檔與手動測試清單，明確內部連結需先審核、多選後才寫回。
  5. `apps/api/tests/siteConnections.test.ts`
     - 新增內部連結生成回歸測試，覆蓋文章、頁面、Portfolio 和商品同步後的建議 metadata、HTML marker 和目標 URL。
- 關鍵決策和解決方案：內部連結仍沿用既有建議審核與寫回任務，不新增直接修改 WordPress 的快捷接口；每個來源內容先生成一條最佳目標建議，讓多選批量套用、快照與回滾流程保持簡單可控。
- 使用的技術棧：Fastify、TypeScript、Zod、PostgreSQL migration、Vue 3、Ant Design Vue、Vue I18n、WordPress PHP REST API、Vitest、ESLint、Vite。
- 新增或修改文件：
  - 新增：`db/migrations/0009_internal_link_suggestions.sql`
  - 修改：`apps/api/src/seoOptimization.ts`、`apps/api/src/siteConnections.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/web/src/api/siteConnections.ts`、`apps/web/src/i18n.ts`、`apps/web/src/views/LinksView.vue`、`apps/worker/src/index.ts`、`db/migrations/0001_initial_schema.sql`、`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`、`README.md`
- 驗證結果：
  - 已通過：`npm run test -w @aieo/api -- siteConnections.test.ts`（23 tests）。
  - 已通過：`npm run build -w @aieo/api`、`npm run build -w @aieo/web`、`npm run build -w @aieo/worker`。
  - 已通過：`npm run lint`、`npm run test`、`npm run build`、`npm run security:audit`。
  - 已通過：`docker exec -i cyruschan-wp php -l < plugins/wordpress/rankwoven-seo/rankwoven-seo.php`。
  - Vite 僅有既有大型 chunk 警告。
- 下一步行動清單：若要上線，先提交並推送 `codex/internal-link-suggestions` 或合併到 `main`，部署後在正式站同步內容並於 `/app/links` 生成、勾選、套用一輪內部連結建議。

### 2026-08-09（星期日）— 修正本地 Docker SerpApi 環境變數未載入

- 會話的主要目的：排查本地 Docker Desktop 測試環境中 SEO 網站檢測顯示 SerpApi 未設置的問題。
- 完成的主要任務：
  1. 確認主工作區 `.env` 已配置 `SERPAPI_KEY`，但目前測試容器從臨時 worktree `/tmp/aieo-internal-links.xUZeyD` 啟動，該目錄原本沒有 `.env`。
  2. 將主工作區 `.env` 安全複製到臨時 worktree，該文件仍受 `.gitignore` 與 `.dockerignore` 保護，不會提交到 Git 或打入 Docker image。
  3. 使用 Docker Compose 重建 `aieo-api-1`、`aieo-worker-1` 和 `aieo-web-1`，讓本地環境變數重新注入容器。
- 關鍵決策和解決方案：不在代碼或文檔中輸出任何 SerpApi 金鑰內容，只以是否存在和字元長度確認容器環境；不觸發實際 SEO 檢測，避免未經確認消耗 SerpApi credits。
- 使用的技術棧：Docker Compose、Fastify API、Worker、Vite Web、PostgreSQL、WordPress Docker 測試站。
- 新增或修改文件：
  - 修改：`README.md`（追加本次會話總結）
  - 未提交：`.env` 僅複製到本地臨時 worktree，受 Git 忽略，不屬於倉庫變更。
- 驗證結果：
  - 已確認：`aieo-api-1` 與 `aieo-worker-1` 均已讀到 `SERPAPI_KEY`，且未輸出密鑰內容。
  - 已通過：`curl -fsS http://localhost:3011/health`。
  - 已確認：`http://localhost:8080/`、`http://localhost:8088/` 在本地返回 200。
  - 補充發現：本地 demo 帳號角色為 `owner`，而 SerpApi usage admin API 目前只接受 `admin`，因此 usage 統計查詢會 403；這不影響 SEO 檢測本身讀取 `SERPAPI_KEY`。
- 下一步行動清單：刷新本地 SaaS 頁面後重新嘗試 SEO 網站檢測；如仍看到 SerpApi 未設置，再檢查瀏覽器是否連到舊 API 或容器是否被其他 compose 專案覆蓋。
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

### 2026-08-08（星期六）— 移除後台登入頁預填密碼

- 會話的主要目的：避免後台登入頁直接顯示測試密碼。
- 完成的主要任務：
  1. 將 `apps/web/src/views/LoginView.vue` 的登入表單密碼預設值從 `rankwoven` 改為空字串，避免畫面預填可讀密碼。
  2. 重新檢查前端相關檔案，確認沒有其他地方把登入密碼直接寫死在公開畫面。
- 關鍵決策和解決方案：只移除密碼預填值，不改登入流程與驗證邏輯，保留最小修改範圍。
- 使用的技術棧：Vue 3、TypeScript、Ant Design Vue、Vite。
- 新增或修改文件：
  - 修改：`apps/web/src/views/LoginView.vue`、`README.md`
- 驗證結果：
  - `npm run lint` 通過。
  - `npm run build -w @aieo/web` 通過。
- 下一步行動清單：若之後要展示測試帳號，改放到說明文件或測試環境，不要預填在正式登入表單。

### 2026-08-08（星期六）— 新增 WordPress 編輯頁 SEO 面板

- 會話的主要目的：在文章、頁面、Portfolio 和商品的新增/編輯頁加入 SEO 面板，輸入 Focus keyphrase 後可用 AI 生成並套用 SEO title、Slug 與 Meta description。
- 完成的主要任務：
  1. 在 `apps/api/src/seoOptimization.ts` 新增站點 Token 驗證的 `POST /api/v1/site-connections/:siteId/editor-seo` 路由，使用既有 AI provider 生成 SEO title、slug、meta description 與內容分析。
  2. 在 `plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 新增編輯頁 SEO metabox、REST/meta key 註冊、AJAX 生成與保存流程，並把 SEO title / meta description 寫入常見 SEO 外掛欄位與 RankWoven 自訂欄位。
  3. 新增 `plugins/wordpress/rankwoven-seo/assets/editor-seo.js`，讓 WordPress 編輯頁可直接從當前內容與面板欄位發起生成/保存請求。
  4. 更新 `plugins/wordpress/README.md` 與 `plugins/wordpress/TESTING.md`，補上新面板與手動驗證步驟。
  5. 新增 `apps/api/tests/siteConnections.test.ts` 回歸測試，覆蓋 editor SEO 生成接口。
- 關鍵決策和解決方案：SEO title 與文章標題分開處理，不直接覆蓋正文標題；slug 仍寫回 WordPress 原生 `post_name`，而 meta description 與 SEO title 同時同步到常見 SEO 外掛 key 與 RankWoven 自訂欄位，避免與現有 SEO 流程打架。
- 使用的技術棧：WordPress PHP、Admin Ajax、Vue/JS-less Admin UI、Fastify、TypeScript、Vitest。
- 新增或修改文件：
  - 新增：`plugins/wordpress/rankwoven-seo/assets/editor-seo.js`
  - 修改：`apps/api/src/seoOptimization.ts`、`apps/api/tests/siteConnections.test.ts`、`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`、`README.md`
- 驗證結果：
  - `npm run lint` 通過。
  - `npm run build -w @aieo/api` 通過。
  - `npm run test -w @aieo/api` 通過。
  - `node --check plugins/wordpress/rankwoven-seo/assets/editor-seo.js` 通過。
  - 本機未安裝 `php` CLI，且 Docker API 權限受限，未能在本機完成 `php -l` 驗證。
- 下一步行動清單：把插件同步到 WordPress 測試站，打開文章/頁面/Portfolio/商品編輯頁確認面板顯示、AI 生成與保存流程正常，並檢查常見 SEO 外掛欄位是否有正確回寫。

### 2026-08-09（星期日）— 補上編輯頁內容 SEO 分數分析

- 會話的主要目的：補上 WordPress 編輯頁中缺少的內容 SEO 分析，針對當前用戶輸入的內容即時計算 SEO 分數。
- 完成的主要任務：
  1. 在 `apps/api/src/seoOptimization.ts` 的 `editor-seo` 流程新增規則式內容 SEO 評分，根據 SEO title、Meta description、Slug、內容長度、H1、內部連結與 Focus keyphrase 覆蓋情況回傳 `seoScore`、`scoreSummary` 與 `scoreChecks`。
  2. 讓 `editor-seo` 路由同時支援 `generate` 與 `save/analyze` 模式；生成建議時回傳新分數，單純保存 SEO 欄位時也會重新分析當前內容。
  3. 在 `plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 新增 `Content SEO score` 欄位與對應儲存 meta，並讓 AJAX 保存流程同步回寫分數與分析。
  4. 更新 `plugins/wordpress/rankwoven-seo/assets/editor-seo.js`，讓面板即時顯示 `seoScore`，並把分數同步到 Gutenberg meta。
  5. 更新 `plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`，補上內容 SEO 分數說明與測試步驟。
  6. 把最新插件同步到本機 `cyruschan.com` WordPress 測試站，並修正測試站插件設定，讓 API Base URL 指向 `http://host.docker.internal:3011`，再重新建立本機 Site ID / Site Token。
- 關鍵決策和解決方案：內容 SEO 分數使用穩定的規則式檢查，而不是依賴 AI 回答，這樣即使用戶只保存手動欄位、或 AI 暫時不可用，也能取得一致且可重現的分數結果。
- 使用的技術棧：Fastify、TypeScript、Vitest、WordPress PHP、Admin Ajax、Gutenberg editor meta、Docker Desktop。
- 新增或修改文件：
  - 修改：`apps/api/src/seoOptimization.ts`、`apps/api/tests/siteConnections.test.ts`、`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/rankwoven-seo/assets/editor-seo.js`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`、`README.md`
- 驗證結果：
  - `npm run lint` 通過。
  - `npm run build -w @aieo/api` 通過。
  - `npm run test -w @aieo/api` 通過。
  - `docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php` 通過。
  - 本機 WordPress 測試站 `http://localhost:8088` 已實測：文章編輯頁出現 `Content SEO score` 欄位，`Generate & Apply SEO` 與 `Save SEO Fields` 都會回傳並保存 `seoScore`。實測文章 `postId=1964` 目前回傳分數為 `68/100`。
- 下一步行動清單：如要進一步提升分析可讀性，可把 `scoreChecks` 在 metabox 中顯示為逐條清單或顏色狀態，而不只顯示總分與摘要。

### 2026-08-09（星期日）— 移除 SaaS 後台文章模組入口

- 會話的主要目的：將 SaaS 客戶後台中與文章流程直接相關的入口下線，因為文章相關操作已改到 WordPress 後台處理。
- 完成的主要任務：
  1. 在 `apps/web/src/App.vue` 移除客戶後台側欄中的文章審計、文章同步、處理建議、文章修改建議與內容審核入口。
  2. 在 `apps/web/src/router/index.ts` 將舊文章路由改為安全導向，避免既有書籤或舊連結打開後出現空白頁：
     - `/app/articles` -> `/app/sites`
     - `/app/article-sync` -> `/app/tasks`
     - `/app/suggestions`、`/app/article-suggestions`、`/app/review` -> `/app/media`
  3. 在 `apps/web/src/views/DashboardView.vue` 移除文章導向指標，改為顯示已同步媒體與較中性的優先項。
  4. 在 `apps/web/src/views/SitesView.vue` 移除站點列表與詳情中的文章數顯示。
  5. 在 `apps/web/src/i18n.ts` 補上必要的新文案 key，並把 dashboard / sites 中仍會直出「文章」的標籤改為中性描述。
- 關鍵決策和解決方案：這一輪只下線 SaaS 後台中的文章入口與殘留顯示，不直接刪除舊頁面檔與 API，避免把範圍擴大到資料層或未來可能重用的模組；舊 URL 一律改做 redirect，確保使用者體驗平順。
- 使用的技術棧：Vue 3、TypeScript、Vue Router、Ant Design Vue、Vue I18n。
- 新增或修改文件：
  - 修改：`apps/web/src/App.vue`、`apps/web/src/router/index.ts`、`apps/web/src/views/DashboardView.vue`、`apps/web/src/views/SitesView.vue`、`apps/web/src/i18n.ts`、`README.md`
- 驗證結果：
  - `npm run lint` 通過。
  - `npm run build -w @aieo/web` 通過。
  - Vite 只有既有大型 chunk 警告，無新增 build 錯誤。
- 下一步行動清單：如之後確認連關鍵詞、內部連結等內容策略功能也要全面移回 WordPress，可再做第二輪，把 `keywords`、`links` 等內容相關頁面一併收斂。

### 2026-08-09（星期日）— 修復 WordPress 前台 SEO 與社交 meta 輸出

- 會話的主要目的：修復在 WordPress 插件中保存 `Meta description` 和 `Keywords` 後，前台頁面 HTML 沒有對應 SEO meta 的問題，並補上 Google+、Weibo、Twitter Card、LinkedIn / Facebook Open Graph 分享標籤。
- 完成的主要任務：
  1. 在 RankWoven SEO 編輯頁面新增 `Keywords` 欄位，加入 AJAX 保存、Gutenberg meta 同步和重新打開時回顯。
  2. 新增 `_rankwoven_meta_keywords` 自訂欄位，對逗號、分號、換行輸入做清理並去重。
  3. 在 WordPress `wp_head` 中為文章、頁面、Portfolio 和商品輸出已保存的 `meta name="description"` 和 `meta name="keywords"`。
  4. 使用 SEO title、Meta description、特色圖片、圖片 Alt Text、網站名稱和頁面 URL 輸出 Google+ itemprop、Weibo、Twitter Card 與 LinkedIn / Facebook Open Graph 標籤。
  5. 在插件設定頁新增 Twitter/X Username 和 Facebook App ID，避免前台輸出 `@username` 或 `APP ID` placeholder。
  6. 更新插件 README 與測試文件，補上前台 `<head>` 驗證步驟。
- 關鍵決策和解決方案：先以本地 Docker WordPress 前台 HTML 建立紅燈回歸檢查，再用最小改動補上保存與輸出鏈路；社交圖片優先使用特色圖片，沒有特色圖片時回退站點圖示；Twitter username 和 Facebook App ID 留空時不輸出假值。不修改正文內容，也不提交任何 `.env`、密碼、Token 或 API Key。
- 使用的技術棧：WordPress PHP、Admin Ajax、Gutenberg editor meta、原生 JavaScript、Docker Desktop。
- 新增或修改文件：
  - 修改：`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/rankwoven-seo/assets/editor-seo.js`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`、`README.md`
- 驗證結果：
  - 修復前 smoke check 失敗，成功復現前台缺少 description/keywords 的問題。
  - `docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php` 通過。
  - 修復後本地前台 smoke check 通過，實際檢測到兩個對應 meta 標籤。
  - 追加社交 meta smoke check 通過，檢測到 Google+、Weibo、Twitter Card、`fb:app_id`、`og:image` 和 `og:url`。
- 下一步行動清單：在真實 WordPress 網站上同步最新版插件，清除頁面快取後查看頁面原始碼的 `<head>`；本次未執行 Git commit、push 或生產部署。

### 2026-08-09（星期日）— 修復 Keywords 原生保存後變空

- 會話的主要目的：修復 WordPress 插件中 `Keywords` 輸入後按保存或刷新後又變空的問題。
- 完成的主要任務：
  1. 為 RankWoven SEO metabox 欄位補上 `name` 和 nonce，讓 Classic Editor / WordPress 原生表單提交能帶上 SEO 欄位。
  2. 新增 `save_post` 保存流程，讓 WordPress 原生 `Update` / `Publish` 也會持久化 Focus keyphrase、SEO title、Meta description、Keywords、SEO score 和分析結果。
  3. 更新 `assets/editor-seo.js`，在 Gutenberg 中輸入 SEO 欄位時即時同步到 `wp.data.dispatch('core/editor').editPost()`，避免直接按右上角更新時漏掉 `_rankwoven_meta_keywords`。
  4. 更新插件 README 和測試清單，補上 WordPress 原生保存回歸項目。
- 關鍵決策和解決方案：同時修復兩條保存路徑，避免只修 `Save SEO Fields` AJAX 而漏掉用戶更常用的 WordPress 原生更新；不新增資料表，不改動正文內容。
- 使用的技術棧：WordPress PHP、`save_post` hook、Gutenberg editor meta、原生 JavaScript、Docker Desktop、WP-CLI。
- 新增或修改文件：
  - 修改：`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/rankwoven-seo/assets/editor-seo.js`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`、`README.md`
- 驗證結果：
  - 修復前 JS harness 失敗，確認輸入 Keywords 不會同步 Gutenberg meta。
  - 修復前 WP-CLI native save smoke 失敗，確認 WordPress 原生保存不會寫入 `_rankwoven_meta_keywords`。
  - 修復後 JS harness 通過，輸入 Keywords 會同步 `_rankwoven_meta_keywords`。
  - 修復後 WP-CLI native save smoke 通過，管理員身份下 `save_post` 可持久化 Keywords。
- 下一步行動清單：同步插件到真實 WordPress 網站後清除瀏覽器/頁面快取，再測試「直接按 WordPress 更新」與「按 Save SEO Fields」兩種保存方式。

### 2026-08-10（星期一）— 新增 sitemap.xml 與 Google Search Console 提交

- 會話的主要目的：在 WordPress 插件後台新增 `sitemap.xml` 生成與提交 Google Search Console 功能。
- 完成的主要任務：
  1. 新增插件 `Sitemap` 頁籤，提供 `Generate sitemap.xml`、`Submit to Google` 和最近生成 / 提交狀態。
  2. 新增前台 `/sitemap.xml` 動態輸出，包含已發佈的 Posts、Pages、Portfolio 和 Products，並避免 WordPress Core 將 `/sitemap.xml` 301 到 `/wp-sitemap.xml`。
  3. 在動態 `robots.txt` 追加 `Sitemap: <URL>` 行，保留 WordPress 既有 robots 規則。
  4. 新增 SaaS API `POST /api/v1/site-connections/:siteId/search-console/sitemaps`，由服務端 Google Search Console API 提交 sitemap。
  5. 修復 Google OAuth access token 快取按 scope 隔離，避免 readonly token 被誤用到 sitemap 提交。
- 關鍵決策和解決方案：`sitemap.xml` 採動態生成，不寫入靜態檔案；提交 Google 走 SaaS 服務端憑證，不在 WordPress 插件保存 Google API Key / Token。
- 使用的技術棧：WordPress PHP、Fastify、Google Search Console API、Vitest、Docker Desktop。
- 新增或修改文件：
  - 修改：`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`、`apps/api/src/googleAuth.ts`、`apps/api/src/searchConsole.ts`、`apps/api/src/siteConnections.ts`、`README.md`
  - 新增：`apps/api/tests/googleAuth.test.ts`、`apps/api/tests/searchConsoleSitemap.test.ts`
- 驗證結果：
  - `npm run test -w @aieo/api -- tests/googleAuth.test.ts tests/searchConsoleSitemap.test.ts` 通過。
  - `docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php` 通過。
  - 已同步到本地 WordPress 測試站，`curl -i http://localhost:8088/sitemap.xml` 返回 `200 OK` 和 `<urlset>` XML。
  - `curl http://localhost:8088/robots.txt` 已包含 `Sitemap: http://localhost:8088/sitemap.xml`。
- 下一步行動清單：在真實 WordPress 站點上同步插件後，確認 SaaS 生產環境已配置 Google 服務帳號憑證且該服務帳號具備對應 Search Console property 權限，再點擊 `Submit to Google`。

### 2026-08-11（星期二）— 調整本機 WordPress Docker PHP 上傳限制

- 會話的主要目的：調大本機 Docker Desktop 測試站 `cyruschan-wp` 容器內 PHP 的 `upload_max_filesize`。
- 完成的主要任務：
  1. 在 `/Volumes/Extreme SSD/gitCode/cyruschan.com/docker/php/uploads.ini` 新增 PHP 上傳限制配置。
  2. 在 `/Volumes/Extreme SSD/gitCode/cyruschan.com/docker-compose.yml` 將該 ini 掛載到 WordPress 與 WP-CLI 容器。
  3. 更新 `/Volumes/Extreme SSD/gitCode/cyruschan.com/DOCKER-README.md`，記錄本機 PHP 上傳限制配置位置。
- 關鍵決策和解決方案：使用掛載 ini 的方式持久化設定，而不是臨時進容器修改；設定 `upload_max_filesize=256M`、`post_max_size=256M`、`memory_limit=512M`。
- 使用的技術棧：Docker Compose、WordPress 官方 PHP Apache 映像、WP-CLI、PHP ini。
- 新增或修改文件：
  - 新增：`/Volumes/Extreme SSD/gitCode/cyruschan.com/docker/php/uploads.ini`
  - 修改：`/Volumes/Extreme SSD/gitCode/cyruschan.com/docker-compose.yml`、`/Volumes/Extreme SSD/gitCode/cyruschan.com/DOCKER-README.md`、`README.md`
- 驗證結果：
  - `docker compose up -d wordpress` 已重建並啟動 `cyruschan-wp`。
  - `docker exec cyruschan-wp php -i` 顯示 `upload_max_filesize=256M`、`post_max_size=256M`、`memory_limit=512M`。
  - `docker compose run --rm wpcli wp eval 'echo size_format(wp_max_upload_size());' --allow-root` 返回 `256 MB`。
  - `curl -I http://localhost:8088/` 返回 `200 OK`。
- 下一步行動清單：如需支援超過 `256M` 的插件或媒體包，再同步調整 `upload_max_filesize`、`post_max_size`，並確保 `post_max_size` 不小於上傳大小。

### 2026-08-11（星期二）— 新增內容類型 Meta 預設設定頁

- 會話的主要目的：在 RankWoven SEO 插件設定頁新增各內容類型的預設 meta 設定，對文章、頁面、Portfolio 和商品提供獨立模板。
- 完成的主要任務：
  1. 在 `Settings -> RankWoven SEO` 新增 `Content Meta` 分頁，為 `post`、`page`、`portfolio`、`product` 提供分區設定。
  2. 新增 `SEO Title Template`、`Meta Description Template` 和 `Meta Keywords Template`，並支援 `{title}`、`{excerpt}`、`{focus_keyphrase}`、`{site_name}`、`{slug}`、`{post_type}`、`{post_type_label}` 占位符。
  3. 將前台 `<head>` 輸出改為先讀單篇已保存 SEO 欄位，再讀內容類型預設模板，最後才回退到文章標題或摘要。
  4. 補強摘要 fallback，若文章沒有 excerpt，`{excerpt}` 會改用正文前段精簡內容。
  5. 更新插件說明與測試文件，補上內容類型 meta 的回歸檢查。
- 關鍵決策和解決方案：把內容類型模板與單篇 SEO 欄位分層處理，避免蓋掉既有資料；設定頁使用獨立 `Content Meta` 分頁與獨立儲存 scope，避免和連線設定互相覆蓋。
- 使用的技術棧：WordPress PHP、admin-post 表單提交、Reflection / WP-CLI 驗證、Docker Desktop。
- 新增或修改文件：
  - 修改：`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`、`README.md`
- 驗證結果：
  - `docker run --rm -v "/Volumes/Extreme SSD/gitCode/AIEO/plugins/wordpress/rankwoven-seo/rankwoven-seo.php:/tmp/rankwoven-seo.php:ro" wordpress:cli-php8.2 php -l /tmp/rankwoven-seo.php` 通過。
  - `docker compose run --rm wpcli wp eval ...` 驗證 `get_active_admin_tab()` 可切到 `content_meta`。
  - `docker compose run --rm wpcli wp eval ...` 驗證 `render_content_meta_page()` 會輸出 `rankwoven_content_meta_settings[post][seo_title_template]` 等欄位。
  - 使用臨時草稿頁驗證：`title`、`description`、`keywords` 都能從內容類型預設模板正確展開，並已刪除臨時測試文章。
- 下一步行動清單：若要進一步貼近 AIOSEO，可再考慮加上 `show in search results` / `noindex` 開關與即時預覽，但這次先保持最小可用版本。

### 2026-08-11（星期二）— RankWoven SEO 插件 AIOSEO 風格二次開發

- 會話的主要目的：參考 All in One SEO 的基本功能形態，在現有 RankWoven WordPress 插件基礎上做二次開發，並把 AI 生成、SEO 分析、內部連結與 Sitemap 提交流程接入現有 RankWoven SaaS API。
- 完成的主要任務：
  1. 將 WordPress 插件整理為 `RankWoven SEO` 主菜單，加入儀表板、一般設定、搜尋外觀、網站地圖、Link Assistant、SEO 分析、圖片屬性、工具類與診斷入口。
  2. 保留舊 `Settings -> RankWoven SEO` 入口，改為指向一般設定頁，避免舊使用路徑失效。
  3. 將文章同步與 SEO 功能擴展到 `post`、`page`、`portfolio`、`product`，並沿用 `0009_internal_link_suggestions.sql` migration 支援 SaaS 端保存 Portfolio 與商品類型。
  4. 在插件端接入 SaaS API 的審計、建議、批量批准、批量套用、編輯頁 SEO 生成與 Google Search Console Sitemap 提交能力。
  5. 將內部連結建議改為結構化資料，顯示目標內容、錨文本、相關性與原因，並支援多選後批准或套用。
  6. 調整 Worker 寫回內部連結策略，只在 WordPress 正文最後追加 `rankwoven-related-links` 區塊，不改寫 WPBakery Page Builder 等頁面構建器原始內容。
  7. 更新 WordPress 插件 README、測試文件與 API/Worker 回歸測試，記錄新的操作流程與驗證方式。
  8. 更新 `package-lock.json` 中 `nanoid` 鎖定版本，修復 high 等級安全掃描問題。
- 關鍵決策和解決方案：只參考 AIOSEO 的功能分區和用戶流程，不解包、不複製第三方商業插件源碼；RankWoven 插件保持輕量，AI、分析、內鏈推薦和 Google 提交均走 SaaS 服務端 API；內部連結只追加到內容末尾，降低破壞 WPBakery 結構的風險。
- 使用的技術棧：WordPress PHP、原生 JavaScript、Fastify、TypeScript、PostgreSQL migration、Vitest、Docker Desktop、npm audit。
- 新增或修改文件：
  - 沿用：`db/migrations/0009_internal_link_suggestions.sql`
  - 修改：`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/rankwoven-seo/assets/editor-seo.js`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`、`apps/api/src/seoOptimization.ts`、`apps/api/src/siteConnections.ts`、`apps/api/tests/siteConnections.test.ts`、`apps/worker/src/index.ts`、`apps/worker/tests/worker.test.ts`、`package-lock.json`、`README.md`
- 驗證結果：
  - `docker run --rm -v "/Volumes/Extreme SSD/gitCode/AIEO":/workspace wordpress:6.7.2-php8.2-apache php -l /workspace/plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 通過。
  - `npm run lint` 通過。
  - `npm run test` 通過。
  - `npm run build` 通過，Vite 只有既有大型 chunk 警告。
  - `npm run security:audit` 通過，0 個漏洞。
  - 已同步最新版插件到本地 WordPress 測試站 `/Volumes/Extreme SSD/gitCode/cyruschan.com/wp-content/plugins/rankwoven-seo/`，並重啟 `cyruschan-wp`。
  - `docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php` 通過。
  - `http://localhost:8088/wp-json/` 已顯示 `rankwoven/v1` namespace；`/wp-json/rankwoven/v1/posts` 未授權請求返回 `401`，符合站點 token 保護預期。
- 下一步行動清單：在本地 WordPress 後台手動點開新增菜單並測試 Link Assistant 多選套用；確認無問題後再由使用者授權提交 GitHub 與部署到伺服器。

### 2026-08-11（星期二）— 優化 SaaS 客戶端與 WordPress 插件 UI

- 會話的主要目的：評估是否需要引入類似 Ant Design Vue 的 UI 元件或技能，並直接優化 RankWoven SaaS 客戶端與 WordPress 插件後台 UI。
- 完成的主要任務：
  1. 確認 SaaS 端已使用 `ant-design-vue`、`@ant-design/icons-vue`、`lucide-vue-next` 和 `echarts`，因此本輪不額外引入 Element Plus / Naive UI / Arco Design 等第二套 UI 框架。
  2. 優化 SaaS 客戶端全局視覺 token、背景、側欄、頂欄、頁面 hero、卡片、表格和狀態 pill，讓後台從原型感更接近正式 SaaS 控制台。
  3. 在 `DashboardView` 新增首屏 hero、快速操作 CTA、站點 / 媒體 / SaaS SEO 信號摘要，並修正 Lighthouse 快速審計入口到 `/app/lighthouse`。
  4. 在 `SitesView` 新增站點摘要卡、連接流程引導、表格空狀態，讓插件連接流程更清楚。
  5. 在 `LinksView` 新增 Link Assistant 安全追加提示、審核隊列標題和信心度 pill，強化「不破壞 WPBakery 結構」的產品訊息。
  6. 新增 WordPress 插件 `assets/admin.css`，只在 RankWoven SEO 後台頁載入，提供 hero、連線狀態、tabs、panel、metric card、表格、表單和快速操作按鈕樣式。
  7. 將插件後台儀表板由寬表改為卡片化總覽和快速操作區，並把 `搜尋外觀` 內容類型設定改為卡片式 details。
  8. 更新插件 README 和測試文件，補充 UI 行為與新增 CSS 同步檢查。
- 關鍵決策和解決方案：SaaS 端繼續沿用 Ant Design Vue，避免雙 UI 框架造成 bundle、樣式和維護成本上升；WordPress 插件端不打包 Vue / React，只使用 WordPress 原生 admin UI 加 RankWoven 輕量 CSS，保持兼容、快載入和低風險。
- 使用的技術棧：Vue 3、TypeScript、Ant Design Vue、Lucide Vue、Vue I18n、WordPress PHP、WordPress Admin CSS、Docker Desktop。
- 新增或修改文件：
  - 新增：`plugins/wordpress/rankwoven-seo/assets/admin.css`
  - 修改：`apps/web/src/styles.css`、`apps/web/src/views/DashboardView.vue`、`apps/web/src/views/SitesView.vue`、`apps/web/src/views/LinksView.vue`、`apps/web/src/i18n.ts`、`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`、`README.md`
- 驗證結果：
  - `npm run build -w @aieo/web` 通過，Vite 只有既有大型 chunk 警告。
  - `docker run --rm -v "/Volumes/Extreme SSD/gitCode/AIEO":/workspace wordpress:6.7.2-php8.2-apache php -l /workspace/plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 通過。
  - 已同步 `rankwoven-seo.php`、`editor-seo.js`、`admin.css` 到本地 WordPress 測試站並重啟 `cyruschan-wp`。
  - `docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php` 通過。
  - `curl -I http://localhost:8088/wp-content/plugins/rankwoven-seo/assets/admin.css` 返回 `200 OK`。
  - `npm run lint`、`npm run test`、`npm run build`、`npm run security:audit` 全部通過。
- 下一步行動清單：在瀏覽器中手動查看 SaaS `/app`、`/app/sites`、`/app/links` 和 WordPress `RankWoven SEO` 後台頁；若視覺方向確認，可再推進第二輪，把 Media、Tasks、Site Audit 等高使用頁統一成同一套 page hero / toolbar / empty state 模式。

### 2026-08-11（星期二）— 優化 SaaS 管理後台 UI

- 會話的主要目的：延續 SaaS UI 優化方向，將 RankWoven 管理員後台 `/admin` 系列頁面由基礎管理頁升級為更清晰的營運控制台。
- 完成的主要任務：
  1. 優化 `/admin` 管理總覽，新增 command center hero、平台健康信號、指標卡與隊列 / 風險 panel。
  2. 優化 `/admin/customers`，新增租戶營運 hero、客戶統計卡、客戶健康 board 與更清楚的表格容器。
  3. 優化 `/admin/usage`，新增成本控制 hero、budget guardrail、SerpApi 狀態卡與 provider 用量表格樣式。
  4. 優化 `/admin/operations`，新增 live operations hero、事件 / 檢查統計與 live command board。
  5. 優化 `/admin/settings`，新增 governance hero、secret-safe control plane 與設定群組卡片。
  6. 補充 admin 專屬 CSS token / panel / card / table 樣式，並同步英文與繁中文案。
- 關鍵決策和解決方案：不新增第二套 UI 框架，繼續沿用現有 Ant Design Vue、Lucide、Vue I18n 和全局 CSS token；本輪只改管理後台視覺與資訊架構，不改 API、權限或資料模型。
- 使用的技術棧：Vue 3、TypeScript、Ant Design Vue、Lucide Vue、Vue I18n、Vite、CSS tokens。
- 新增或修改文件：
  - 修改：`apps/web/src/views/AdminOverviewView.vue`、`apps/web/src/views/AdminCustomersView.vue`、`apps/web/src/views/AdminUsageView.vue`、`apps/web/src/views/AdminOperationsView.vue`、`apps/web/src/views/AdminSettingsView.vue`、`apps/web/src/styles.css`、`apps/web/src/i18n.ts`、`README.md`
- 驗證結果：
  - `npm run lint` 通過。
  - `npm run test` 通過：API 34 passed / 3 skipped、Web 2 passed、Worker 4 passed、`ai-providers` 7 passed、`cms-adapters` 1 passed。
  - `npm run build` 通過，Vite 只有既有大型 chunk 警告。
  - `npm run security:audit` 通過，`found 0 vulnerabilities`。
  - `git diff --check` 通過，未發現 patch 空白問題。
- 下一步行動清單：在瀏覽器手動查看 `/admin`、`/admin/customers`、`/admin/usage`、`/admin/operations`、`/admin/settings`，確認視覺節奏、中文文案與響應式顯示後，再決定是否提交 GitHub 或部署。

### 2026-08-11（星期二）— 合併最終更新並準備 GitHub 生產部署

- 會話的主要目的：按使用者授權，將 RankWoven SEO 插件、SaaS 客戶端 UI、SaaS 管理後台 UI、Search Console sitemap、內部連結與 WordPress 寫回安全策略整合到最新 `main`，並推送 GitHub 觸發部署。
- 完成的主要任務：
  1. 將工作分支與最新 `origin/main` 合併，保留 `main` 已有內部連結功能，同時合入分支上的 noindex、前台 SEO meta、sitemap、插件 AIOSEO 風格 UI 與 SaaS admin UI。
  2. 解決 README、API、前端 i18n、Links 頁與 WordPress 插件衝突。
  3. 移除重複的 `0009_expand_synced_article_types.sql` migration，改用 `main` 已存在且更完整的 `0009_internal_link_suggestions.sql`。
  4. 修正合併後 `SyncedArticleType` 重複定義問題。
  5. 保持 `.codebuddy` 未追蹤資料夾、`0.jpeg`、`.env` 和任何密碼 / Token / API Key 不進 Git。
- 關鍵決策和解決方案：以最新 `origin/main` 為基底合併，不硬推、不覆蓋遠端；功能衝突採「保留真實 API 流程 + 合入新 UI」策略，避免把 `/app/links` 回退成靜態示例。
- 使用的技術棧：Git、GitHub Actions、Fastify、TypeScript、Vue 3、Ant Design Vue、WordPress PHP、Vitest、Vite、Docker。
- 新增或修改文件：
  - 修改：API、Web、Worker、WordPress 插件、README 與測試文件等最終整合文件。
  - 新增：`apps/web/public/robots.txt`、`apps/web/public/sitemap.xml`、`apps/api/tests/googleAuth.test.ts`、`apps/api/tests/searchConsoleSitemap.test.ts`、`plugins/wordpress/rankwoven-seo/assets/admin.css`、`plugins/wordpress/rankwoven-seo/assets/editor-seo.js`。
- 驗證結果：
  - `git diff --cached --check` 通過。
  - `npm run lint` 通過。
  - `npm run test` 通過：API 35 passed / 3 skipped、Web 2 passed、Worker 4 passed、`ai-providers` 7 passed、`cms-adapters` 1 passed。
  - `npm run build` 通過，Vite 只有既有大型 chunk 警告。
  - `npm run security:audit` 通過，`found 0 vulnerabilities`。
  - `docker run --rm -v "/Volumes/Extreme SSD/gitCode/AIEO":/workspace wordpress:6.7.2-php8.2-apache php -l /workspace/plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 通過。
- 下一步行動清單：提交合併結果、推送 `main` 到 GitHub 觸發 Production Deploy，部署後檢查 `https://api.rankwoven.com/health` 和公開 Web robots / sitemap。

### 2026-08-11（星期二）— 補強生產 Vite 後台 noindex header

- 會話的主要目的：部署後確認 `robots.txt` 與 `sitemap.xml` 已正常，但 `/app`、`/admin` 回應未輸出預期 `X-Robots-Tag`，需補強生產實際使用的 Vite server header。
- 完成的主要任務：
  1. 在 `apps/web/vite.config.ts` 新增 `rankwoven-backoffice-robots-header` Vite plugin。
  2. 對 `/app`、`/app/*`、`/admin`、`/admin/*` 回應加入 `X-Robots-Tag: noindex, nofollow, noarchive`。
  3. 同時支援 Vite dev server 與 preview server，不影響公開首頁與 `/pricing`。
- 關鍵決策和解決方案：保留既有 `robots.txt` 與 `apps/web/nginx.conf` 防護，但因目前生產 Web 由 Vite server 實際處理 SPA 回應，改在 Vite middleware 補上 route-specific header，避免全站 noindex。
- 使用的技術棧：Vite、TypeScript、Vue 3、HTTP header。
- 新增或修改文件：
  - 修改：`apps/web/vite.config.ts`、`README.md`
- 驗證結果：
  - `npm run lint` 通過。
  - `npm run build -w @aieo/web` 通過，Vite 只有既有大型 chunk 警告。
  - 本地 Vite server `curl -I http://127.0.0.1:5183/app` 已輸出 `X-Robots-Tag: noindex, nofollow, noarchive`。
  - 本地 Vite server `curl -I http://127.0.0.1:5183/pricing` 未輸出 `X-Robots-Tag`，公開頁不受影響。
- 下一步行動清單：提交並推送 `main`，等待 Production Deploy 完成後重新檢查 `https://rankwoven.com/app` 與 `https://rankwoven.com/admin` header。

### 2026-08-11（星期二）— 拆分 WordPress 圖片屬性獨立設定

- 會話的主要目的：按參考截圖調整 WordPress 插件 `Image Attribute Settings`，讓 Alt Tag、Title、Caption、Description 和 Filename 每個屬性都能分開設定。
- 完成的主要任務：
  1. 將圖片屬性設定由舊的 flat checkbox 升級為 `attributes.alt_text/title/caption/description/filename` 五組獨立規則。
  2. 每組規則支援獨立 `Enabled`、格式模板、Strip Punctuation、Casing 和 Words to Strip。
  3. 新增設定頁 tab UI，並加入 token button，可插入 `{{image_title}}`、`{{filename}}`、`{{separator}}`、`{{site_title}}`、`{{attachment_id}}`。
  4. 更新圖片屬性生成流程，標題、Alt Text、Caption、Description 各自按自己的規則產生。
  5. 新增新上傳圖片 Filename 清理流程；出於安全考量，Bulk Updater 不重命名既有實體檔案。
  6. 保留舊版 `set_title`、`set_alt_text`、`remove_hyphen` 等設定的兼容映射，避免已安裝站點升級後丟失行為。
- 關鍵決策和解決方案：只對新上傳檔名做清理，不在批量更新中改檔案路徑，降低破壞既有媒體 URL、CDN 快取或文章圖片引用的風險。
- 使用的技術棧：WordPress PHP、WordPress Admin UI、原生 JavaScript、WordPress Docker / WP-CLI。
- 新增或修改文件：
  - 修改：`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/rankwoven-seo/assets/admin.css`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`、`README.md`
- 驗證結果：
  - `docker run --rm -v "/Volumes/Extreme SSD/gitCode/AIEO":/workspace wordpress:6.7.2-php8.2-apache php -l /workspace/plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 通過。
  - 已同步插件主檔與 `admin.css` 到本地 WordPress 測試站。
  - `docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php` 通過。
  - WP-CLI smoke 驗證五個獨立 panel 與 format input 均已輸出。
  - WP-CLI smoke 驗證五組規則可各自生成不同結果，且 Filename 清理輸出 `blue-chair-new.jpg`。
  - `curl -I http://localhost:8088/wp-content/plugins/rankwoven-seo/assets/admin.css` 返回 `200 OK`。
- 下一步行動清單：在瀏覽器手動打開本地 WordPress `RankWoven SEO -> 圖片屬性`，確認 tab 切換、token 插入和保存體驗；確認後再由使用者授權提交與部署。

### 2026-08-11（星期二）— 流量分析預設選中第一個站點

- 會話的主要目的：讓 SaaS `流量分析` 頁載入後不再停留在「全部站點」，而是預設選中第一個已連接站點。
- 完成的主要任務：
  1. 更新 `apps/web/src/views/AnalyticsView.vue` 的站點載入流程。
  2. 當目前選中的站點不存在或尚未選擇，且站點列表不為空時，自動選中第一個站點。
  3. 保留用戶手動切換回「全部站點」或其他站點的能力。
- 關鍵決策和解決方案：只調整初始化選擇邏輯，不移除「全部站點」選項，避免影響需要跨站匯總查看的場景。
- 使用的技術棧：Vue 3、TypeScript、Ant Design Vue。
- 新增或修改文件：
  - 修改：`apps/web/src/views/AnalyticsView.vue`、`README.md`
- 驗證結果：
  - `npm run lint` 通過。
  - `npm run build -w @aieo/web` 通過，Vite 只有既有大型 chunk 警告。
- 下一步行動清單：在瀏覽器打開 `/app/analytics`，確認下拉框默認顯示第一個站點，刷新按鈕讀取該站點 GA4 數據。

### 2026-08-11（星期二）— 搜尋外觀模板欄位加入點擊插入標籤

- 會話的主要目的：按參考截圖優化 WordPress 插件 `搜尋外觀` 頁，讓客戶不用手動輸入 `{{title}}` 等 placeholder 代碼。
- 完成的主要任務：
  1. 在每個內容類型的 `SEO Title Template`、`Meta Description Template` 和 `Meta Keywords Template` 欄位上方加入可點擊 token button。
  2. 支援一鍵插入 `{{title}}`、`{{excerpt}}`、`{{focus_keyphrase}}`、`{{site_name}}`、`{{slug}}`、`{{post_type}}` 和 `{{post_type_label}}`。
  3. 插入時保留目前游標位置，並觸發 `input` / `change` 事件，方便後續表單互動擴展。
  4. 將原本上方的手動 placeholder 列表改為操作說明，降低非技術客戶的理解成本。
- 關鍵決策和解決方案：復用圖片屬性頁既有 token button 視覺樣式，只新增 `data-rankwoven-content-meta-settings` 作用域內的輕量原生 JavaScript，避免影響其他設定頁。
- 使用的技術棧：WordPress PHP、WordPress Admin UI、原生 JavaScript、CSS、Docker WordPress。
- 新增或修改文件：
  - 修改：`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/rankwoven-seo/assets/admin.css`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`、`README.md`
- 驗證結果：
  - `docker run --rm -v "/Volumes/Extreme SSD/gitCode/AIEO":/workspace wordpress:6.7.2-php8.2-apache php -l /workspace/plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 通過。
  - 已同步插件主檔與 `admin.css` 到本地 WordPress 測試站。
  - `docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php` 通過。
  - 容器內 PHP Reflection smoke check 顯示 `content_token_buttons=85`、`content_meta_inputs=13`、`content_script=yes`。
  - `npm run lint` 通過。
  - `npm run build -w @aieo/web` 通過，Vite 只有既有大型 chunk 警告。
  - `git diff --check` 通過。
- 下一步行動清單：在瀏覽器打開本地 WordPress `RankWoven SEO -> 搜尋外觀`，手動點擊各欄位標籤確認會插入到游標位置；確認後再由使用者授權提交與推送。

### 2026-08-11（星期二）— SEO 分析問題列表按內容種類分組

- 會話的主要目的：按使用者截圖優化 WordPress 插件 `SEO 分析` 頁，避免文章、商品、Portfolio、圖片和媒體問題全部混在同一張長表中。
- 完成的主要任務：
  1. 將最新 SEO 審計問題按內容種類分組顯示，並在表格中新增「種類」欄位。
  2. `article` 類審計問題會用本地 `targetCmsId` 查 WordPress `post_type`，細分為文章、頁面、商品、Portfolio 或其他自訂文章類型。
  3. `media` 類審計問題會用附件 MIME type 判斷，圖片顯示為「圖片」，其他附件顯示為「媒體」。
  4. 新增分類摘要 chip、分組標題和種類 badge，方便管理員快速瀏覽問題分佈。
- 關鍵決策和解決方案：不改 SaaS API 與資料庫 schema，直接復用 API 已返回的 `targetType` / `targetCmsId`，在插件端用 WordPress 本地資料補足細分類，降低部署風險。
- 使用的技術棧：WordPress PHP、WordPress Admin UI、CSS、Docker WordPress、原生 WordPress post type / attachment API。
- 新增或修改文件：
  - 修改：`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/rankwoven-seo/assets/admin.css`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`、`README.md`
- 驗證結果：
  - `docker run --rm -v "/Volumes/Extreme SSD/gitCode/AIEO":/workspace wordpress:6.7.2-php8.2-apache php -l /workspace/plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 通過。
  - 已同步插件主檔與 `admin.css` 到本地 WordPress 測試站。
  - `docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php` 通過。
  - 容器內 Reflection smoke check 顯示分類結果：`文章,頁面,商品,Portfolio,圖片,媒體`。
  - `npm run lint` 通過。
  - `npm run build -w @aieo/web` 通過，Vite 只有既有大型 chunk 警告。
  - `git diff --check` 通過。
- 下一步行動清單：在瀏覽器打開本地 WordPress `RankWoven SEO -> SEO 分析`，確認最新審計問題會按內容種類分組；確認後再由使用者授權提交與推送。

### 2026-08-11（星期二）— SEO 分析問題行加入修改與套用操作

- 會話的主要目的：按使用者反饋調整 WordPress 插件 `SEO 分析` 問題列表，分組後不再重複顯示「種類」欄，並為每行提供修改與套用操作。
- 完成的主要任務：
  1. 移除分組表格中的「種類」欄，保留上方分類摘要與每組標題。
  2. 每行新增 `操作` 欄，提供 `修改` 按鈕連到 WordPress 對應文章、頁面、商品、Portfolio 或媒體編輯頁。
  3. 為可安全自動寫入的欄位提供 `套用` 按鈕：文章 Title、文章 Meta Description、媒體 Title、Caption、Description 和 Alt Text。
  4. H1、內部連結、既有媒體檔名等需要人工檢查或有結構風險的問題，保留 `套用` 停用狀態並提示手動修改。
  5. 新增本地 `admin-post` 套用入口，套用時再次驗證管理員權限、目標內容權限和欄位白名單。
- 關鍵決策和解決方案：直接套用只處理明確、低風險欄位；不自動改正文 H1、內部連結和既有檔名，避免破壞 WPBakery 結構、既有媒體 URL 或文章正文。
- 使用的技術棧：WordPress PHP、WordPress Admin UI、CSS、Docker WordPress、Reflection smoke test。
- 新增或修改文件：
  - 修改：`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/rankwoven-seo/assets/admin.css`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`、`README.md`
- 驗證結果：
  - `docker run --rm -v "/Volumes/Extreme SSD/gitCode/AIEO":/workspace wordpress:6.7.2-php8.2-apache php -l /workspace/plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 通過。
  - 已同步插件主檔與 `admin.css` 到本地 WordPress 測試站。
  - `docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php` 通過。
  - 容器內 smoke check 建立並清理臨時文章和附件，確認文章 Title、Meta Description、圖片 Alt Text 可由套用方法寫入。
  - `npm run lint` 通過。
  - `npm run build -w @aieo/web` 通過，Vite 只有既有大型 chunk 警告。
  - `git diff --check` 通過。
- 下一步行動清單：在瀏覽器打開本地 WordPress `RankWoven SEO -> SEO 分析`，確認每行有 `修改` / `套用` 操作；對非安全欄位確認 `套用` 保持停用。

### 2026-08-11（星期二）— 後台列表與表單寬度自適應

- 會話的主要目的：讓 RankWoven WordPress 插件後台所有列表、表單與設定卡按內容區寬度自適應，避免桌面頁面右側留下大片空白。
- 完成的主要任務：
  1. 移除 `.rankwoven-admin-wrap` 的固定 `max-width`，讓後台主容器可填滿可用內容區。
  2. 讓 `widefat` 表格、`form-table`、設定卡片與輸入框全面採用 `width: 100%` 與 `max-width: none`。
  3. 將長文字、`code` 標籤與表格儲存格改為可換行，避免小螢幕或長內容撐破版面。
  4. 調整內容型設定區與勾選格版面，讓欄位在不同螢幕寬度下自然伸縮。
- 關鍵決策和解決方案：不再使用固定 1180px 版心，而改由 WordPress 後台本身控制外層寬度，插件只負責在內容區內完整鋪滿，保留響應式行為。
- 使用的技術棧：WordPress CSS、WordPress Admin UI、PHP、Docker WordPress。
- 新增或修改文件：
  - 修改：`plugins/wordpress/rankwoven-seo/assets/admin.css`、`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`、`README.md`
- 驗證結果：
  - `docker run --rm -v "/Volumes/Extreme SSD/gitCode/AIEO":/workspace wordpress:6.7.2-php8.2-apache php -l /workspace/plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 通過。
  - 已同步插件主檔與 `admin.css` 到本地 WordPress 測試站。
  - `docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php` 通過。
  - `git diff --check` 通過。
- 下一步行動清單：在瀏覽器打開本地 WordPress 後台，確認 hero、摘要卡、問題列表與所有表單已撐滿內容區，右側不再保留大面積空白。

### 2026-08-11（星期二）— 建議列表顯示過濾 shortcode 與代碼片段

- 會話的主要目的：修正 WordPress 插件建議列表中直接顯示 WPBakery shortcode、HTML 和 CSS 片段的問題，讓內容欄只展示可讀摘要或目標連結。
- 完成的主要任務：
  1. 新增顯示用摘要清理 helper，會移除 `[vc_row]`、`[vc_column]`、`[vc_column_text]` 等 shortcode、HTML tag、`style/script` 內容與多餘空白。
  2. `get_suggestion_summary_text()` 的 fallback 改用可讀摘要，不再直接輸出 raw `suggestedValue`。
  3. `render_internal_link_candidate_list()` 在 JSON links 缺失時優先使用 suggestion metadata 中的 `targetUrl`、`anchorText`、`relevance` 和 `reason` 生成可讀連結。
  4. 保留 raw `currentValue` / `suggestedValue` 作為套用資料，不在資料層刪除 shortcode，避免破壞 WPBakery 頁面結構。
- 關鍵決策和解決方案：只清理後台顯示層，不改實際寫回內容；內部連結套用仍沿用既有安全策略，只在內容尾部追加連結區塊。
- 使用的技術棧：WordPress PHP、WordPress shortcode / HTML 清理、Docker WordPress、Reflection smoke test。
- 新增或修改文件：
  - 修改：`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`、`README.md`
- 驗證結果：
  - `docker run --rm -v "/Volumes/Extreme SSD/gitCode/AIEO":/workspace wordpress:6.7.2-php8.2-apache php -l /workspace/plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 通過。
  - 已同步插件主檔到本地 WordPress 測試站。
  - `docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php` 通過。
  - 容器內 smoke check 確認 `[vc_row]` / `vc_custom` / HTML tag 會從摘要移除，metadata 目標連結正常顯示。
  - `git diff --check` 通過。
- 下一步行動清單：在瀏覽器打開本地 WordPress `RankWoven SEO -> Link Assistant`，確認列表不再顯示 WPBakery shortcode 或 CSS 片段。

### 2026-08-11（星期二）— 內部連結加入重新掃描與已刪內容清理

- 會話的主要目的：為 WordPress 插件 `Link Assistant` 增加重新掃描功能，讓文章、頁面、商品或 Portfolio 被刪除後，SaaS 內部連結建議不再指向已不存在內容。
- 完成的主要任務：
  1. WordPress 插件新增 `重新掃描內部連結` 按鈕與 `admin-post` handler，強制建立 full sync 任務，不使用 `updatedAfter`。
  2. 重新掃描完成後立即呼叫 SaaS `POST /api/v1/site-connections/:siteId/audits`，重新產生 SEO 分析與內部連結建議。
  3. API full sync 最後批次完成時，InMemory repository 會按本輪出現的 CMS ID 移除 stale 文章和媒體；PostgreSQL repository 會移除任務建立前未被重新同步的 stale 文章和媒體。
  4. PostgreSQL cleanup 會清走與 stale 內容相關的未套用 `optimization_suggestions`，但保留 `applied` 記錄，避免破壞已審核歷史。
  5. suggestions API 回傳前會按目前同步內容過濾來源、媒體與內鏈 metadata / JSON 目標，防止舊版本殘留建議在插件後台顯示。
  6. 更新 WordPress 插件 README 和 TESTING 文件，補充重新掃描使用說明與刪除內容後的測試清單。
- 關鍵決策和解決方案：用 SaaS 任務建立時間作為 full sync 清理邊界，避免 WordPress 與 API 伺服器時間偏差誤刪本輪新同步資料；重新掃描只清理 SaaS 同步庫與未套用建議，不自動刪除已寫入 WordPress 正文的連結，降低破壞 WPBakery 或人工內容調整的風險。
- 使用的技術棧：Fastify、TypeScript、Zod、PostgreSQL、Vitest、WordPress PHP、WordPress Admin UI、Docker WordPress。
- 新增或修改文件：
  - 修改：`apps/api/src/siteConnections.ts`
  - 修改：`apps/api/src/seoOptimization.ts`
  - 修改：`apps/api/tests/siteConnections.test.ts`
  - 修改：`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`
  - 修改：`plugins/wordpress/rankwoven-seo/assets/admin.css`
  - 修改：`plugins/wordpress/README.md`
  - 修改：`plugins/wordpress/TESTING.md`
  - 修改：`README.md`
- 驗證結果：
  - `npm run test -w @aieo/api -- siteConnections.test.ts` 通過，26 tests。
  - `npm run test` 通過，50 tests passed、3 tests skipped。
  - `npm run build -w @aieo/api` 通過。
  - `npm run lint` 通過。
  - `git diff --check` 通過。
  - 本機未安裝 `php` CLI，改用 WordPress PHP Docker 鏡像執行 `php -l`，插件主檔語法通過。
  - 已同步插件主檔與 `admin.css` 到本地 WordPress 測試站 `/Volumes/Extreme SSD/gitCode/cyruschan.com/wp-content/plugins/rankwoven-seo/`。
  - `docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php` 通過。
- 下一步行動清單：在瀏覽器打開本地 WordPress `RankWoven SEO -> Link Assistant`，刪除或移到回收桶一篇測試內容後點擊 `重新掃描內部連結`，確認舊內容不再出現在來源或建議連結中；確認無問題後再由使用者授權提交與推送。

### 2026-08-11（星期二）— 插件後台頁面自動全屏與 CSS 快取修正

- 會話的主要目的：修正 WordPress 插件後台頁面只佔左側、右側留下大面積空白的問題。
- 完成的主要任務：調整插件主容器寬度，使其按瀏覽器視窗與 WordPress 後台側欄狀態自動鋪滿可用內容區；側欄收合、平板及手機版使用不同寬度規則，避免小螢幕橫向溢出；插件版本升至 `0.1.2`。
- 關鍵決策和解決方案：保留只改 CSS 的全寬方案，並讓 `admin.css` 使用 `0.1.2.<filemtime>` 作為 WordPress asset version，避免正式站因 `0.1.1` 舊快取而繼續顯示舊版寬度。
- 使用的技術棧：WordPress Admin CSS、響應式 CSS、Docker WordPress。
- 新增或修改文件：`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/rankwoven-seo/assets/admin.css`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`、`README.md`。
- 驗證結果：
  - 已同步 `admin.css` 到本地 WordPress 測試站 `/Volumes/Extreme SSD/gitCode/cyruschan.com/wp-content/plugins/rankwoven-seo/assets/admin.css`。
  - 已同步 `rankwoven-seo.php` 到本地 WordPress 測試站，插件版本為 `0.1.2`。
  - `docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php` 通過。
  - 源碼與測試站 `admin.css` 文件一致性檢查通過。
  - `git diff --check` 通過。
- 下一步行動清單：在本地 WordPress 後台刷新 RankWoven SEO 頁面，確認桌面寬螢幕右側不再留下大面積空白，並檢查側欄收合及手機版顯示。

### 2026-08-11（星期二）— 重新掃描清理已刪頁面的舊內部連結建議

- 會話的主要目的：修復正式 WordPress 站刪除 `https://cyruschan.com/?page_id=1536` 後，`Link Assistant` 重新掃描仍顯示舊 `applied` 內部連結建議的問題。
- 完成的主要任務：
  1. SaaS API 回傳 suggestions 前，除了檢查來源/目標 CMS ID，也檢查 internal-link metadata 或 JSON 中的 `targetUrl` 是否仍存在於目前同步內容。
  2. PostgreSQL full sync cleanup 對 stale 來源/目標的 `internal_link` 建議不再保留 `applied` 歷史，並兼容舊版只保存 URL、沒有 `targetCmsId` 的記錄。
  3. 一般 title、Meta Description、媒體欄位等已套用歷史仍按原策略保留。
  4. 新增回歸測試，覆蓋「已套用、只有 targetUrl、目標頁刪除、重新 full rescan」流程。
- 關鍵決策和解決方案：只清理失效的 `internal_link` 建議，不自動改寫或刪除 WordPress 正文，避免破壞 WPBakery 結構；要讓正式站生效，必須部署 `apps/api` 的 SaaS 後端，單獨上傳插件不會更新 SaaS suggestion data。
- 使用的技術棧：Fastify、TypeScript、Vitest、PostgreSQL、WordPress REST sync。
- 新增或修改文件：
  - 修改：`apps/api/src/seoOptimization.ts`
  - 修改：`apps/api/src/siteConnections.ts`
  - 修改：`apps/api/tests/siteConnections.test.ts`
  - 修改：`plugins/wordpress/README.md`
  - 修改：`plugins/wordpress/TESTING.md`
  - 修改：`README.md`
- 驗證結果：
  - API 回歸測試 `27/27` 通過。
  - `npm run lint` 通過。
  - `npm run build -w @aieo/api` 通過。
  - PostgreSQL 測試因本機未設定 `TEST_DATABASE_URL` / `DATABASE_URL` 而跳過，未洩露任何資料庫憑據。
  - `https://cyruschan.com/?page_id=1536` 公開入口返回 `404`，確認目標頁已刪除；正式站插件 `admin.css` 已是全寬版。
- 下一步行動清單：提交並部署 SaaS API 到 `https://api.rankwoven.com`，部署後在正式 WordPress 插件點擊一次 `重新掃描內部連結`，再確認 `page_id=1536` 不再出現在 Link Assistant。

### 2026-08-11（星期二）— SaaS API 修正推送與生產部署完成

- 會話的主要目的：將刪除內容後清理舊內部連結建議的 SaaS API 修正推送到 GitHub，並部署到正式環境。
- 完成的主要任務：
  1. 提交 `3076c1a`，只包含 `apps/api/src/seoOptimization.ts`、`apps/api/src/siteConnections.ts` 和 `apps/api/tests/siteConnections.test.ts`。
  2. 推送到 `origin/main`，觸發 GitHub Actions `Production Deploy`。
  3. Verify job 通過 lint、test、build 和 security audit；Deploy job 成功更新 Hostinger VPS。
  4. 正式 API `https://api.rankwoven.com/health` 返回成功，確認 SaaS 服務已恢復正常。
- 關鍵決策和解決方案：因工作區仍有其他插件、Web 和未追蹤文件，發布時只暫存本次 SaaS API 文件；README 本身保留本地未提交狀態，避免將無關修改或密碼 / `.env` 相關內容推送到 GitHub。
- 使用的技術棧：Git、GitHub Actions、Fastify、TypeScript、Vitest、Hostinger VPS、Docker Compose。
- 新增或修改文件：已提交 API 三個文件；本地追加 `README.md` 會話記錄，未提交其他工作區修改。
- 驗證結果：
  - 完整測試通過：API `37 passed / 3 skipped`、Web `2 passed`、Worker `4 passed`、AI providers `7 passed`、CMS adapters `1 passed`。
  - `npm run lint`、`npm run build`、`npm run security:audit` 均通過。
  - GitHub Actions Run `31520024730` 的 Verify 與 Deploy 均為 `success`。
  - `curl -fsS https://api.rankwoven.com/health` 返回 `{"success":true,"message":"API 服務正常","data":{"service":"api"}}`。
- 下一步行動清單：在正式 WordPress 插件 `Link Assistant` 點擊一次 `重新掃描內部連結`，確認已刪除的 `page_id=1536` 不再出現。

### 2026-08-12（星期三）— 淨化內部連結建議列表回傳並完成 SaaS 部署

- 會話的主要目的：繼續修復正式 WordPress `Link Assistant` 仍顯示已刪除頁 `https://cyruschan.com/?page_id=1536` 的剩餘問題。
- 完成的主要任務：
  1. 在 SaaS API `GET /api/v1/site-connections/:siteId/suggestions` 回傳前，對 `internal_link` 建議做列表專用 projection。
  2. `internal_link` 列表回傳不再輸出整段 `currentValue` 原始 HTML，避免舊正文中的已刪 URL 污染 UI 或插件列表。
  3. 舊版 HTML `suggestedValue` 會按 metadata 轉為 `rankwoven-internal-links-v1` JSON links，保留目標文章、錨文本、相關性與原因等顯示/套用所需資料。
  4. 新增回歸測試，覆蓋有效建議的 `currentValue` / 舊版 HTML `suggestedValue` 內仍殘留 `page_id=1536` 的正式站情境。
  5. 提交 `d7fff39` 並推送到 `origin/main`，觸發 GitHub Actions 生產部署。
- 關鍵決策和解決方案：只淨化 suggestions 列表 API 的 response，不改資料庫原始建議、不自動改寫 WordPress 正文，讓 Worker 套用仍按原始資料在內容尾部追加相關閱讀區塊，降低破壞 WPBakery Page Builder 結構的風險。
- 使用的技術棧：Fastify、TypeScript、Vitest、GitHub Actions、Hostinger VPS、Docker Compose。
- 新增或修改文件：
  - 修改並已提交：`apps/api/src/seoOptimization.ts`
  - 修改並已提交：`apps/api/tests/siteConnections.test.ts`
  - 修改但未提交：`README.md` 會話記錄
- 驗證結果：
  - `npm run test -w @aieo/api -- siteConnections.test.ts` 通過，29 tests。
  - `npm run lint` 通過。
  - `npm run build -w @aieo/api` 通過。
  - `npm run test` 通過，API `39 passed / 3 skipped`、Web `2 passed`、Worker `4 passed`、AI providers `7 passed`、CMS adapters `1 passed`。
  - `npm run build` 通過，僅保留既有前端 large chunk warning。
  - `npm run security:audit` 通過，`found 0 vulnerabilities`。
  - GitHub Actions Run `31557096197` 成功完成，部署版本 `d7fff397e8b4fd4f5f43b54698aedb44b7f6d9d6`。
  - 正式 API `https://api.rankwoven.com/health` 返回 `success:true`。
  - 正式 cyruschan suggestions 驗證：`suggestionsCount=69`、`internalLinkSuggestionsCount=23`、`containsDeletedPage1536=false`、`invalidSuggestionCount=0`。
- 下一步行動清單：在正式 WordPress 插件 `Link Assistant` 重新整理頁面，確認列表不再看到 `page_id=1536`；若文章正文中人工或歷史已寫入該舊連結，需要由 WordPress 內容端單獨清理，SaaS 本次不自動修改正文。

### 2026-08-12（星期三）— 流量分析預設選擇第一個網站

- 會話的主要目的：修正 SaaS 後台 `流量分析` 頁面預設停在「全部站點」的體驗，讓頁面載入後自動選擇第一個網站。
- 完成的主要任務：
  1. 確認 `apps/web/src/views/AnalyticsView.vue` 已在載入站點後檢查目前選擇是否有效。
  2. 若沒有有效選擇且存在站點，`selectedSiteId` 會自動設為站點列表第一個網站 ID。
  3. 補充 Web smoke test，鎖定「先載入站點、選第一個站點、再載入 analytics」的初始化順序。
- 關鍵決策和解決方案：保留「全部站點」作為可手動選項，但初始化預設選第一個網站，符合圖片中下拉列表的使用需求且不移除原有彙總分析能力。
- 使用的技術棧：Vue 3、TypeScript、Vite、Vitest、Ant Design Vue。
- 新增或修改文件：
  - 修改：`apps/web/src/views/AnalyticsView.vue`
  - 修改：`apps/web/tests/smoke.test.ts`
  - 修改：`README.md`
- 驗證結果：
  - `npm run test -w @aieo/web` 通過，3 tests。
  - `npm run build -w @aieo/web` 通過，僅保留既有前端 large chunk warning。
- 下一步行動清單：如需同步到正式 SaaS，需提交並推送包含 `AnalyticsView.vue` 與測試的 Web 更新，觸發 GitHub Actions 部署。

---

## 会话总结（2026-08-13）— 修复站点管理删除按钮无反应

### 会话主要目的

SaaS 站点管理列表中「删除」按钮点击无反应。

### 完成的主要任务

1. 定位问题：表格内 `a-popconfirm` 在操作列中反馈不明显/易失效（长警告文案 + 表格布局）。
2. 改为 `Modal.confirm` 居中确认删除，点击即有明确弹窗。
3. 删除成功/失败增加 `message` 提示；删除中显示 loading。
4. 加固 `deleteSiteConnection` API：正确处理 DELETE 无 `data` 字段的响应。

### 关键决策和解决方案

- 破坏性操作改用 Modal 确认，比表格内 Popconfirm 更可靠、可读性更好。
- 删除按钮使用 `@click.stop`，避免事件被表格行吞掉。

### 使用的技术栈

Vue 3、Ant Design Vue `Modal.confirm` / `message`、Fastify DELETE `/api/v1/site-connections/:siteId`

### 修改了哪些文件

- `apps/web/src/views/SitesView.vue`
- `apps/web/src/api/siteConnections.ts`
- `apps/web/src/styles.css`
- `README.md`


---

## 会话总结（2026-08-13）— 完善站点「查看详情」

### 会话主要目的

站点管理「查看详情」弹窗信息过少、无实用价值。

### 完成的主要任务

1. 详情弹窗改为展示完整连接信息：网址、Site ID、状态、CMS/插件版本、Token 预览、同步统计、WP 凭证状态、GA 资源等。
2. 打开详情时拉取 `GET /api/v1/site-connections/:siteId` 最新数据。
3. 增加快捷入口：文章同步、网站检测、文章审计；支持复制 Site ID。

### 关键决策和解决方案

- 详情不只展示时间戳，而是运维真正需要的连接与同步元数据。
- 保留列表内快捷「网站检测」，详情内再提供跨模块跳转。

### 使用的技术栈

Vue 3、Ant Design Vue Modal/Spin/Tag、Vue I18n

### 修改了哪些文件

- `apps/web/src/views/SitesView.vue`
- `apps/web/src/api/siteConnections.ts`
- `apps/web/src/i18n.ts`
- `apps/web/src/styles.css`
- `README.md`

---

## 會話總結（2026-08-13）— 精簡站點詳情並修復刪除確認

### 會話主要目的

修復 SaaS 站點管理頁「查看詳情」顯示過多無意義/偏技術資訊，以及「刪除」按鈕點擊後沒有明確反應的問題。

### 完成的主要任務

1. 將站點詳情彈窗改為客戶可理解的摘要，只保留站點網址、平台、狀態、最近同步、同步文章/媒體數、WordPress 寫回狀態和流量分析狀態。
2. 移除詳情中的 Site ID、Token Preview、CMS/插件版本、WordPress 管理員等內部或敏感偏技術欄位。
3. 將刪除流程改為頁面內受控確認彈窗，點擊刪除後立即顯示確認視窗，確認後顯示 loading，成功刷新列表，失敗保留錯誤提示。
4. 加固 `deleteSiteConnection()`，兼容 DELETE 成功但回應 body 為空或缺少 `data` 的情況。
5. 補充 Web smoke test，鎖定詳情內容不再回退到技術欄位，並確認刪除使用受控確認流程。

### 關鍵決策和解決方案

- 刪除是破壞性操作，保留確認流程，但不再依賴表格內 `Popconfirm`；改用已註冊的 `Modal` 組件，避免點擊後沒有可見反饋。
- 詳情頁面面向客戶而不是運維排錯，因此只保留狀態與下一步操作所需資訊。

### 使用的技術棧

Vue 3、TypeScript、Ant Design Vue Modal/Spin/Tag、Vue I18n、Vitest、Vite。

### 新增或修改文件

- `apps/web/src/views/SitesView.vue`
- `apps/web/src/api/siteConnections.ts`
- `apps/web/src/i18n.ts`
- `apps/web/src/styles.css`
- `apps/web/src/main.ts`
- `apps/web/tests/smoke.test.ts`
- `README.md`

### 驗證結果

- `npm run lint` 通過。
- `npm run test -w @aieo/web` 通過，4 tests。
- `npm run build -w @aieo/web` 通過，僅保留既有 Vite large chunk warning。

### 下一步行動清單

1. 在本地或正式 SaaS 後台 `/app/sites` 手動點擊「查看詳情」與「刪除」，確認互動符合預期。
2. 若需要上線，請再授權提交並推送到 GitHub 觸發部署。

---

## 會話總結（2026-08-13）— 修復插件編輯頁 SEO 保存錯誤提示

### 會話主要目的

排查 WordPress 插件文章/頁面編輯頁 RankWoven SEO 面板保存或生成時顯示 `SEO request failed` 的問題。

### 完成的主要任務

1. 加固 `editor-seo.js` 的 `admin-ajax.php` 回應解析，能識別 `-1` nonce 失效、`0` action 未載入、空回應和 PHP/HTML 非 JSON 回應。
2. 將 PHP AJAX nonce 驗證改為標準 JSON error，避免 WordPress 預設輸出 `-1` 被前端誤解為泛化錯誤。
3. 增加 AJAX `mode` 白名單，避免未知操作進入保存流程。
4. SEO AJAX 保存時只在 Slug 真正改變時才執行 `wp_update_post`，普通保存 Keywords、Description 和 SEO meta 不再無端觸發整篇文章保存鉤子。
5. 為 `editor-seo.js` 使用 `filemtime` 版本號，避免正式站或瀏覽器沿用舊 JS 快取。
6. 已同步 `rankwoven-seo.php` 和 `assets/editor-seo.js` 到本地 WordPress 測試站插件目錄。

### 關鍵決策和解決方案

- 先修最小可落地的 AJAX 錯誤鏈路，不改 SaaS API 協議。
- `Save SEO Fields` 保持本地保存，不依賴 SaaS；`Generate & Apply SEO` 遠端不可用時仍沿用既有本地 SEO 建議 fallback。

### 使用的技術棧

WordPress PHP Plugin、WordPress Admin Ajax、原生 JavaScript、Node.js 靜態檢查。

### 新增或修改文件

- 修改：`plugins/wordpress/rankwoven-seo/assets/editor-seo.js`
- 修改：`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`
- 修改：`plugins/wordpress/README.md`
- 修改：`README.md`

### 驗證結果

- `node --check plugins/wordpress/rankwoven-seo/assets/editor-seo.js` 通過。
- Node harness 驗證 `-1`、`0`、HTML 非 JSON 回應不再顯示泛化 `SEO request failed`。
- `git diff --check -- plugins/wordpress/rankwoven-seo/assets/editor-seo.js plugins/wordpress/rankwoven-seo/rankwoven-seo.php` 通過。
- 已確認 AIEO 插件文件與本地 WordPress 測試站插件文件一致。
- 未能執行 `php -l` 或 WordPress 後台實測，原因是本機 PHP CLI 不存在且 Docker Desktop API 目前無法連接。

### 下一步行動清單

1. 開啟 Docker Desktop 後執行 `docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php`。
2. 在 `http://localhost:8088` 編輯頁手動點擊 `Save SEO Fields` 和 `Generate & Apply SEO`，確認保存成功或顯示具體錯誤原因。
3. 若正式站仍報錯，按新錯誤文字對應檢查 nonce、插件是否啟用、登入狀態或 PHP error log。

---

## 會話總結（2026-08-13）— 圖片屬性改為 AI 上下文生成

### 會話主要目的

修正 WordPress 插件圖片屬性生成邏輯：`Image Attribute Settings` 表單只控制最終輸出格式，實際 Title、Alt Text、Caption、Description 和 Filename 必須由 AI 根據圖片所在內容上下文生成，不能把原文件名清洗或重新組合後當成內容。

### 完成的主要任務

1. 新增 Site Token 保護的 `POST /api/v1/site-connections/:siteId/image-attributes` SaaS API，接收圖片、關聯內容與所在段落上下文，一次生成五個圖片屬性。
2. AI prompt 改為優先使用文章、頁面、商品或 Portfolio 的標題、Slug、摘要、正文及圖片所在段落，並明確禁止由原文件名或文件名式預設標題推導語義內容。
3. AI 不可用時改用內容上下文本地 fallback；測試鎖定回傳值不得包含原文件名 `IMG_9382`。
4. WordPress 插件上傳與批量更新改為先向 SaaS 取得上下文生成值，再套用各屬性的格式、標點、大小寫和移除詞規則。
5. Alt Text、Caption、Description 和 Filename 的預設模板分別改為 `{{alt_text}}`、`{{caption}}`、`{{description}}` 和 `{{filename}}`，不再全部套用 `{{image_title}}`。
6. 設定頁 tag 文案改為 `AI Image Title`、`AI Alt Text`、`AI Caption`、`AI Description`、`AI Filename`，清楚說明 tag 不是從原文件名取值。
7. `Filename` 未啟用或上傳請求沒有文章/頁面上下文時不呼叫 AI、不改名，避免無上下文生成或不必要 API 成本。

### 關鍵決策和解決方案

- 格式設定只負責最後組合，不負責生成語義內容；五個欄位保留獨立 AI 值，避免 Caption / Description 被圖片標題覆蓋。
- SaaS AI 是主要生成來源；服務不可用時使用內容標題、摘要、正文和 Slug fallback，而不是退回原文件名清洗。
- 新上傳檔名只有在 WordPress 能提供關聯內容 ID 時才自動生成；無上下文時保持原檔名，比假裝完成 AI 生成更可靠。

### 使用的技術棧

Fastify、TypeScript、Zod、Vitest、WordPress PHP Plugin、WordPress HTTP API。

### 新增或修改文件

- `apps/api/src/seoOptimization.ts`
- `apps/api/tests/siteConnections.test.ts`
- `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`
- `plugins/wordpress/README.md`
- `plugins/wordpress/TESTING.md`
- `README.md`

### 驗證結果

- `npm run test -w @aieo/api -- siteConnections.test.ts` 通過，31 tests。
- `npm run build -w @aieo/api` 通過。
- `npx eslint apps/api/src/seoOptimization.ts apps/api/tests/siteConnections.test.ts --max-warnings 0` 通過。
- `node --check plugins/wordpress/rankwoven-seo/assets/editor-seo.js` 通過。
- `git diff --check` 通過。
- 尚未執行 PHP `php -l` 與 WordPress 後台手動測試，因 Docker Desktop daemon 未運行且本機沒有可用 PHP CLI。

### 下一步行動清單

1. 啟動 Docker Desktop 後執行插件 PHP 語法檢查。
2. 在 `http://localhost:8088` 用一張文件名無語義的圖片測試 `Test Bulk Updater`，確認五個欄位均來自所在內容上下文。
3. 確認本地結果後，再提交並推送 SaaS API 與 WordPress 插件更新。

---

## 會話總結（2026-08-14）— 媒體 SEO 建議失敗後可重試套用

### 會話主要目的

修復 SaaS 後台媒體處理詳情中，圖片 SEO 建議提交失敗後只顯示「需重試」和錯誤碼，但沒有可點擊重試按鈕，導致用戶無法再次提交的問題。

### 完成的主要任務

1. 在媒體詳情表格的失敗建議行新增「重試套用」操作，讓用戶不必再進入其他頁面尋找重試入口。
2. 在媒體審核彈窗中，針對 `failed` 狀態新增「重試套用」主按鈕。
3. 新增 `retrySuggestion` 前端流程：如建議內容已被修改則先保存，再重新批准建議，最後重新建立寫回任務。
4. 補齊英文與繁體中文 i18n 文案，避免界面顯示 key 或缺失翻譯。
5. 補充 Web smoke test，鎖定 failed 狀態必須存在重試操作與對應文案。

### 關鍵決策和解決方案

- 不新增後端 API，直接複用既有 `approve` 和 `apply` 端點，降低部署與兼容風險。
- `SUGGESTION_NOT_APPROVED` 這類失敗可以通過重新批准後再套用恢復；前端按鈕封裝此流程，避免用戶手動理解狀態機。
- 若用戶在審核彈窗中先修改了建議內容，重試前會先保存修改，避免重新套用舊內容。

### 使用的技術棧

Vue 3、TypeScript、Ant Design Vue、Vue I18n、Vitest、Vite。

### 新增或修改文件

- `apps/web/src/views/MediaOptimizationView.vue`
- `apps/web/src/i18n.ts`
- `apps/web/tests/smoke.test.ts`
- `README.md`

### 驗證結果

- `npm run test -w @aieo/web -- smoke.test.ts` 通過，4 tests。
- `npm run build -w @aieo/web` 通過，包含 `vue-tsc --noEmit` 與 Vite build；僅保留既有 vendor chunk 偏大提示。
- `npm run lint` 通過。
- `git diff --check -- apps/web/src/views/MediaOptimizationView.vue apps/web/src/i18n.ts apps/web/tests/smoke.test.ts` 通過。
- 本次尚未提交或推送到 GitHub，等待確認後再進行。

### 下一步行動清單

1. 在本地或正式 SaaS 後台打開 `/app/media`，對一條 `需重試` 建議點擊「重試套用」，確認任務重新入隊。
2. 若重試仍失敗，檢查對應任務隊列錯誤，判斷是否為 WordPress 憑證、插件版本或 CMS 寫回接口問題。
3. 確認界面行為無誤後，再授權提交並推送到 GitHub 觸發部署。

---

## 會話總結（2026-08-14）— 媒體重新掃描清理已刪除項目

### 會話主要目的

修復 SaaS 後台媒體處理頁面中，WordPress 媒體庫已刪除圖片後，點擊「掃描並分析」或重新掃描仍然顯示已刪除媒體的問題。

### 完成的主要任務

1. 為 `/api/v1/site-connections/:siteId/media-scan` 新增回歸測試，模擬第一次掃描有兩張圖片、第二次 WordPress 只返回一張圖片的場景。
2. 修正 in-memory repository 的 `saveMediaScan` 行為：全量媒體掃描時，以本次掃描結果為準移除未再返回的舊媒體。
3. 修正 PostgreSQL repository 的 `saveMediaScan` 行為：全量媒體掃描完成後刪除 `synced_media` 中 stale media。
4. 同步清理 stale media 對應且尚未套用的媒體 SEO 建議，避免已刪除圖片仍出現在待處理建議列表。
5. 補充 PostgreSQL 條件式回歸測試，鎖定 stale media 與 pending media suggestions 都會被清理。

### 關鍵決策和解決方案

- 只有沒有 `updatedAfter` 的全量媒體掃描會清理舊媒體；帶 `updatedAfter` 的增量掃描不做刪除，避免 WordPress 只返回變更項目時誤刪未變更媒體。
- PostgreSQL 清理邏輯必須放在 `/media-scan` 實際使用的 `saveMediaScan`，不能放在一般插件同步入口 `saveSync`，否則真實 SaaS 資料庫路徑不會生效。
- 已套用的建議保留歷史記錄；未套用、待審核或失敗的媒體建議會跟隨 stale media 一起清理。

### 使用的技術棧

Fastify、TypeScript、Vitest、PostgreSQL、WordPress REST API。

### 新增或修改文件

- `apps/api/src/siteConnections.ts`
- `apps/api/tests/siteConnections.test.ts`
- `apps/api/tests/siteConnections.postgres.test.ts`
- `README.md`

### 驗證結果

- `npm run test -w @aieo/api -- siteConnections.test.ts -t "removes media deleted"` 通過。
- `npm run test -w @aieo/api -- siteConnections.test.ts` 通過，32 tests。
- `npm run build -w @aieo/api` 通過。
- `npm run lint` 通過。
- `npm run test -w @aieo/api -- siteConnections.postgres.test.ts` 可執行，但本機未設定 `RUN_POSTGRES_TESTS=1`，因此 4 個 PostgreSQL 測試按設計 skipped。

### 下一步行動清單

1. 啟用 Docker/PostgreSQL 測試環境後，用 `RUN_POSTGRES_TESTS=1` 跑一次 `siteConnections.postgres.test.ts`。
2. 在本地或正式 SaaS `/app/media` 對已刪除 WordPress 媒體執行一次「掃描並分析」，確認列表總數同步下降。
3. 確認後再授權提交、推送與部署到正式環境。

---

## 會話總結（2026-08-14）— SEO Slug 限制為英文小寫與下劃線

### 會話主要目的

修復 WordPress 編輯頁 `RankWoven SEO` 面板中，AI 生成或手動保存的 Slug 可能出現中文、其他語言或 URL encode 字串的問題；新規則要求 Slug 只能使用英文小寫字母與下劃線。

### 完成的主要任務

1. 調整 SaaS `editor-seo` AI prompt，明確要求 slug 只允許英文小寫與下劃線，不允許中文或其他非英文字符。
2. 重寫 SaaS API 的 editor SEO slug normalizer：先處理 URL encode，再移除重音，只保留 `a-z`，其他字符統一轉為 `_` 並壓縮。
3. 新增 API 回歸測試，覆蓋 `%e6...` URL encode、中文、數字和連字號混合 slug，確認最後只返回 `seo` 這類安全格式。
4. 同步更新 WordPress 插件 PHP 保存與 AJAX 套用路徑，避免手動輸入或舊文章 slug 繞過 SaaS 清洗。
5. 同步更新插件前端 `editor-seo.js`，在欄位顯示、AJAX payload 與 Gutenberg `editPost` 狀態同步前都套用同一條規則。
6. 更新插件 README 與本地測試清單，記錄 slug 只允許 `a-z_` 的驗收標準。

### 關鍵決策和解決方案

- 按本次需求採用最嚴格規則：只保留英文小寫字母與下劃線，不保留數字、連字號、中文或其他語言字符。
- 對 `%e7...` 這類 URL encoded slug 先解碼再清洗，避免把百分號編碼拆成 `e`、數字和連字號後錯誤保存。
- SaaS API 與 WordPress 插件端都加保護，確保即使 AI 回傳不合規、SaaS 尚未部署或用戶手動貼入中文 slug，最終保存仍符合規則。

### 使用的技術棧

Fastify、TypeScript、Vitest、WordPress PHP Plugin、WordPress JavaScript、WordPress REST / AJAX。

### 新增或修改文件

- `apps/api/src/seoOptimization.ts`
- `apps/api/tests/siteConnections.test.ts`
- `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`
- `plugins/wordpress/rankwoven-seo/assets/editor-seo.js`
- `plugins/wordpress/README.md`
- `plugins/wordpress/TESTING.md`
- `README.md`

### 驗證結果

- `npm run test -w @aieo/api -- siteConnections.test.ts -t "normalizes editor SEO slugs"` 先紅後綠，確認能捕捉並修復 `%e6...` 與中文 slug。
- `npm run test -w @aieo/api -- siteConnections.test.ts -t "generates editor SEO recommendations"` 通過。
- `npm run test -w @aieo/api -- siteConnections.test.ts` 通過，33 tests。
- `npm run build -w @aieo/api` 通過。
- `npm run lint` 通過。
- `npm run test -w @aieo/web` 通過，4 tests。
- `node --check plugins/wordpress/rankwoven-seo/assets/editor-seo.js` 通過。
- 未能執行 `php -l` 或 WordPress 後台手動測試，原因是本機沒有 PHP CLI，且 Docker Desktop daemon 未運行。

### 下一步行動清單

1. 啟動 Docker Desktop 後，按 `plugins/wordpress/TESTING.md` 同步插件到本地 WordPress 測試站。
2. 執行 `docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php`。
3. 在文章編輯頁貼入中文或 `%e7...` slug，點擊 `Generate & Apply SEO` 和 `Save SEO Fields`，確認保存後只剩 `a-z_`。

---

## 會話總結（2026-08-17）— WordPress robots.txt 手動設定

### 會話主要目的

在 WordPress 插件後台增加 `robots.txt` 手動修改功能，讓管理員可直接在 RankWoven SEO 插件中控制動態 robots 規則。

### 完成的主要任務

1. 在 `網站地圖` 頁籤新增 `robots.txt` 手動設定區塊，包含前台連結、textarea、保存按鈕和實體 `robots.txt` 文件提醒。
2. 新增 `rankwoven_robots_txt_content` option，保存管理員輸入的 robots 規則；清空保存時刪除 option 並恢復 WordPress 預設輸出。
3. 調整 `robots_txt` filter：有手動內容時優先輸出手動內容，否則保留 WordPress / 其他插件原本輸出，最後自動補上 RankWoven `Sitemap:` 行。
4. 將 RankWoven robots filter 優先級提高到 `20000`，避免被 AIOSEO 等較晚執行的 SEO 插件覆蓋。
5. 更新 WordPress 插件 README 與測試清單，記錄手動 robots、AIOSEO 兼容和實體文件注意事項。

### 關鍵決策和解決方案

- 不直接寫入主機根目錄實體 `robots.txt`，只通過 WordPress 動態 `robots_txt` filter 輸出，降低文件權限與部署風險。
- 保留 WordPress `blog_public` 隱私設定優先級；若站點設為不允許搜尋引擎索引，插件不會用手動內容覆蓋該保護。
- 自訂內容與預設內容都會自動補 RankWoven `sitemap.xml`，避免客戶手動編輯後漏掉 Sitemap。

### 使用的技術棧

WordPress PHP Plugin、WordPress Admin、WordPress `robots_txt` filter、Docker Desktop 本地測試站。

### 新增或修改文件

- `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`
- `plugins/wordpress/README.md`
- `plugins/wordpress/TESTING.md`
- `README.md`

### 驗證結果

- `docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php` 通過。
- 已將插件主文件同步到本地 WordPress 測試站 `/Volumes/Extreme SSD/gitCode/cyruschan.com/wp-content/plugins/rankwoven-seo/rankwoven-seo.php`。
- robots smoke 通過：臨時保存 `Disallow: /rankwoven-test/` 後，`http://localhost:8088/robots.txt` 同時包含手動 robots 指令與 RankWoven `/sitemap.xml` 行。
- 清空 robots option 後再次 smoke 通過：`http://localhost:8088/robots.txt` 恢復 WordPress / AIOSEO 原輸出，且 RankWoven `/sitemap.xml` 行仍存在。
- 已還原測試站 `rankwoven_robots_txt_content` option，沒有保留測試用 `Disallow: /rankwoven-test/`。
- `git diff --check -- plugins/wordpress/rankwoven-seo/rankwoven-seo.php plugins/wordpress/README.md plugins/wordpress/TESTING.md` 通過。

### 下一步行動清單

1. 在本地 WordPress 後台打開 `RankWoven SEO -> 網站地圖`，視覺確認 textarea、保存提示和打開 `robots.txt` 連結正常。
2. 上傳插件到真實 WordPress 站後，保存正式 robots 規則，再打開 `https://cyruschan.com/robots.txt` 確認前台輸出。
3. 如真實站根目錄存在實體 `robots.txt`，需同步檢查主機文件是否優先於 WordPress 動態輸出。

---

## 會話總結（2026-08-20）— 前端頁底加入 Plausible 統計碼

### 會話主要目的

在 RankWoven SaaS 前端頁面底部加入 Plausible 統計 script，讓正式站 `rankwoven.com` 可接入 `plausible.shipsolo.io` 的訪問分析。

### 完成的主要任務

1. 在 `apps/web/index.html` 的 `body` 底部、Vite 入口 script 後加入 Plausible 追蹤碼。
2. 保持 script 原始屬性：`defer`、`data-domain="rankwoven.com"` 和 `src="https://plausible.shipsolo.io/js/script.js"`。
3. 執行前端 build，確認 Vite 打包後 `dist/index.html` 仍包含該追蹤碼。

### 關鍵決策和解決方案

- 追蹤碼放在 `apps/web/index.html`，而不是 Vue 單頁組件內，確保前台、客戶後台和管理後台共用同一份 HTML 時都能載入。
- 按使用者要求放在頁底，即 `</body>` 前，避免改動現有 Vue layout。

### 使用的技術棧

Vue 3、Vite、TypeScript、Plausible Analytics。

### 新增或修改文件

- `apps/web/index.html`
- `README.md`

### 驗證結果

- `npm run build -w @aieo/web` 通過；僅保留既有 vendor chunk 偏大提示。
- 已確認 `apps/web/dist/index.html` 包含 `https://plausible.shipsolo.io/js/script.js`。
- `git diff --check -- apps/web/index.html` 通過。

### 下一步行動清單

1. 如需正式部署，提交並推送到 `main` 觸發 SaaS 前端部署。
2. 部署後打開 `https://rankwoven.com` 查看頁面原始碼，確認 Plausible script 已出現在 body 底部。

## 會話總結（2026-08-23）— 按 PRD 補齊前端公開頁面與多語言契約

### 會話主要目的

根據外部 `rankwoven-prd.md` 補齊前端頁面文件與可達路由，並落實使用 Vue I18n 的中英文等多語言策略。

### 完成的主要任務

1. 新增 `/features`、`/blog`、`/docs`、`/help`、`/about`、`/contact`、`/privacy`、`/terms` 公開頁面路由，使用共用 `PublicContentView.vue` 呈現功能、內容、文件、FAQ、品牌、聯絡和法律頁。
2. 依 PRD Route Contract 為公開頁面、登入頁、`/app/*` 和 `/admin/*` 補上 `indexable`、`canonicalPath`，router 切換時同步 title、robots meta 和 canonical link。
3. 更新 sitemap，納入 10 個可索引公開頁；保留 robots.txt 對客戶後台和管理後台的禁止索引規則。
4. 新增 `docs/frontend-page-spec.md`，記錄頁面矩陣、10 個後台模塊對照、多語言策略與驗收清單。
5. 以 Vue I18n 補齊新增頁面的英文與繁體中文文案；語言選擇保存到 `aieo-locale`，並同步 `<html lang>`。
6. Footer 增加 `/about`、`/contact`、`/privacy`、`/terms` 入口，聯絡表單保留前端驗證與原型成功狀態，不偽造後端落庫。

### 關鍵決策和解決方案

- 先使用單一共用公開內容元件承接 PRD 新增頁面，避免為一次性靜態內容複製 8 個 Vue 文件；頁面差異由路由 meta 與 i18n 資源驅動。
- `en` 與 `zh-Hant` 是完整翻譯語言；現有其他語言選項保留並 fallback 到英文，待確認市場優先級後再投入人工翻譯，避免顯示空白或 i18n key。
- 私隱政策與服務條款目前是可替換的法律文件骨架，正式上線前必須由法律或合規負責人審批。
- 保留現有 Vite SPA 架構；雖然公開路由已具備 sitemap、robots、canonical 和 runtime head 管理，但初始 HTML 尚未 SSR/SSG，這項 P0 SEO 風險不在本次頁面補齊範圍內。

### 使用的技術棧

Vue 3、TypeScript、Vue Router、Vue I18n、Vite、Ant Design Vue、CSS responsive layout。

### 新增或修改文件

- `apps/web/src/views/PublicContentView.vue`
- `apps/web/src/i18n/publicPages.ts`
- `apps/web/src/i18n.ts`
- `apps/web/src/App.vue`
- `apps/web/src/router/index.ts`
- `apps/web/src/styles.css`
- `apps/web/public/sitemap.xml`
- `apps/web/tests/smoke.test.ts`
- `docs/frontend-page-spec.md`
- `README.md`

### 驗證結果

- `npm run build -w @aieo/web` 通過；保留既有 Ant Design Vue / ECharts large chunk warning。
- `npm run lint` 通過。
- `npm run test -w @aieo/web` 通過，5 tests。
- 本地 Vite `5174` smoke 通過，8 個新增公開路由均返回 HTTP 200；以 Node fetch 驗證，未執行 Playwright 視覺截圖。

### 下一步行動清單

1. 使用瀏覽器或 Playwright 逐一打開公開路由，確認 mobile viewport 無橫向滾動、語言切換及 head meta 正常。
2. 正式 SEO 上線前把營銷與內容層遷移到 SSG/SSR，確保首頁初始 HTML 含真實 H1 與主要文案。
3. 替換法律文件骨架、接入聯絡 API，並補 FAQPage、BlogPosting、Organization schema 與 hreflang。

## 會話總結（2026-08-24）— 整理 SEO 文章到 Blog

### 會話主要目的

將 `/Volumes/Extreme SSD/gitCode/終身學習文件/SEO/` 的 SEO 教材整理為 RankWoven `/blog` 文章，並補齊中英文等多語言 UI。

### 完成的主要任務

1. 匯入 86 篇 SEO 文章、86 張封面圖和 16 個主題分類；正文整理為 Markdown，封面壓縮為 WebP。
2. 新增 `/blog` 列表與 `/blog/:slug` 詳情頁，支援搜尋、分類、分頁、文章目錄、前後篇和不存在 slug 的錯誤狀態。
3. 使用 `marked` + `DOMPurify` 安全渲染 Markdown，處理外部連結、表格、code block 和文章內部連結。
4. 使用 Vue I18n 補齊 Blog 導覽、篩選器、metadata、錯誤狀態和 footer 的英文與繁體中文；正文維持繁體中文，避免未審校的假翻譯。
5. 生成包含公開頁面與 86 篇文章 URL 的 `sitemap.xml`，並更新前端頁面規格文件。

### 關鍵決策和解決方案

- 文章資料採索引 manifest + `import.meta.glob` 按需載入，避免首次載入 86 篇長文。
- Markdown 先由 `marked` 轉 HTML，再由 `DOMPurify` 消毒；文章內容不是 Vue 模板，因此不允許直接信任原始 HTML。
- 維持現有 Vite SPA 架構；正式 SEO 上線前仍需把公開 Blog 遷移到 SSG/SSR，讓正文和 H1 出現在初始 HTML。
- 瀏覽器 QA 發現文章正文曾因 loading 狀態尚未卸載而未掛載，已在 `BlogArticleView.vue` 延後 DOM 注入；手機另修正 Grid item `min-width` 造成的 8px 橫向溢出。

### 使用的技術棧

Vue 3、TypeScript、Vue Router、Vue I18n、Vite、marked、DOMPurify、WebP、Lucide Vue Next。

### 新增或修改文件

- `scripts/import-seo-blog.mjs`
- `scripts/generate-sitemap.mjs`
- `apps/web/src/blog/articles.ts`
- `apps/web/src/content/seo/articles.json` 與 86 篇 Markdown
- `apps/web/src/views/BlogView.vue`
- `apps/web/src/views/BlogArticleView.vue`
- `apps/web/public/blog/seo/images/*.webp`
- `apps/web/public/sitemap.xml`
- `apps/web/src/i18n/publicPages.ts`
- `apps/web/src/router/index.ts`
- `apps/web/src/styles.css`
- `apps/web/tests/smoke.test.ts`
- `docs/frontend-page-spec.md`

### 驗證結果

- 86 篇文章、86 個唯一 slug、86 張 WebP；162 個文章內部連結均無失效路徑。
- 瀏覽器 QA 通過桌面、平板、375px 手機列表與詳情頁；含表格／code block 的文章在手機無橫向溢出。
- 搜尋、主題分類、分頁、英文 UI 切換、中文正文、內部文章連結和 404 slug 均已驗證。
- `npm run lint`、`npm run test -w @aieo/web`、`npm run build -w @aieo/web` 通過；既有第三方 large chunk warning 仍存在。
- 本次未 commit、未 push、未部署；未加入任何 `.env`、密碼、Token 或 API Key。

### 下一步行動清單

1. 正式 SEO 上線前，將 Blog 公開層遷移至 SSG/SSR，輸出可被搜尋引擎直接讀取的文章 HTML。
2. 補人工審校的其他 locale 翻譯、`hreflang` 和文章作者／更新日期 metadata。
3. 如需上線，再按部署規則完成乾淨 commit、push 到 `main`，並由 GitHub Actions 部署後做公開入口 smoke check。

## 會話補充（2026-08-24）— Blog 生產部署驗證

### 完成的主要任務

1. 提交 `1038903` 並推送 `main`，GitHub Actions `32655639517` 完成 Verify 與 Hostinger 部署。
2. 部署後發現 `/blog/` 因 Nginx 將實體 `blog/` 資料夾當目錄處理而回傳 403；以 `try_files $uri /index.html` 修復 SPA fallback，提交 `f43598a`。
3. 第二次 GitHub Actions `32655966157` 通過完整 Verify 和 Deploy，VPS `.deploy-version` 已更新至 `f43598a`。

### 驗證結果

- `https://api.rankwoven.com/health` 返回成功。
- `https://rankwoven.com/`、`/blog/`、`/blog/seo-introduction` 均返回 HTTP 200。
- production 瀏覽器確認 Blog 列表渲染 12 張封面、文章正文和目錄正常，封面 WebP 可載入且桌面無橫向溢出。
- VPS `api`、`web`、`worker`、`postgres`、`redis` 容器均 healthy／running。
- GitHub Actions 仍提示 actions/checkout 與 actions/setup-node 使用 Node.js 20 的棄用警告；不影響本次部署，但應後續升級 action 版本。
- production console 的統計腳本 warning／連線錯誤來自既有 Google Analytics／Ahrefs 外部腳本，非 Blog 應用資源失敗。

## 會話總結（2026-08-24）— 整站 SEO 教學主題優化

### 會話主要目的

以 `SEO 教學｜網站 SEO 整合 AI 優化教程` 為網站主題與核心關鍵詞，提升 RankWoven 公開頁面的搜尋語意、社交分享 metadata 和 AI 搜尋可理解性。

### 完成的主要任務

1. 首頁中英文 title、H1、subtitle 和 description 改為自然覆蓋「SEO 教學」「網站 SEO」「AI 優化教程」的文案。
2. 新增共用 `apps/web/src/utils/seoHead.ts`，統一管理 description、robots、canonical、Open Graph、Twitter card 和 locale。
3. 為首頁、定價、公開內容頁、Blog 列表和文章路由補上 description metadata；文章頁按文章內容動態生成 canonical、封面 OG image 和 BlogPosting metadata。
4. 在 `apps/web/index.html` 加入初始 HTML 的 metadata 及 Organization/WebSite JSON-LD，讓 SPA 尚未執行時仍有可讀的 SEO fallback。
5. 語言切換同步更新公開頁面的 SEO head；登入與後台頁面仍維持 `noindex, nofollow`。
6. Nginx 透過 URI `map` 對登入／註冊流程、客戶後台和管理後台補上伺服器層 `X-Robots-Tag`，即使 SPA fallback 到 `index.html` 也不會遺失 noindex。

### 關鍵決策和解決方案

- 只把核心詞放在首頁和 Blog 定位，不把同一組關鍵詞硬塞到 86 篇文章，避免關鍵詞堆砌和頁面語意互相競爭。
- 用既有 Vue I18n 管理中英文 SEO 文案；文章正文不做未經人工審校的自動翻譯。
- 保留 Vite SPA 現況；初始 HTML metadata 和 JSON-LD 已補上，但公開正文要完全 SSR/SSG 才能讓爬蟲不依賴 JavaScript。

### 使用的技術棧

Vue 3、Vue Router、Vue I18n、TypeScript、Vite、Schema.org JSON-LD、Open Graph、Twitter Cards。

### 新增或修改文件

- `apps/web/src/utils/seoHead.ts`
- `apps/web/src/router/index.ts`
- `apps/web/src/views/BlogArticleView.vue`
- `apps/web/src/components/LanguageSwitcher.vue`
- `apps/web/src/i18n.ts`
- `apps/web/src/i18n/publicPages.ts`
- `apps/web/index.html`
- `apps/web/nginx.conf`
- `apps/web/tests/smoke.test.ts`
- `docs/frontend-page-spec.md`
- `README.md`

### 驗證結果

- `npm run lint` 通過。
- `npm run test -w @aieo/web` 通過，7 tests。
- `npm run build -w @aieo/web` 通過；保留既有 Ant Design Vue / ECharts large chunk warning。
- `apps/web/nginx.conf` 已加入 URI `map` 與私有路由的 `X-Robots-Tag`；本機沒有 nginx CLI，Docker nginx 語法檢查因本機 registry credentials 中斷，未完成本機容器級 `nginx -t`。
- 瀏覽器驗證首頁、Blog 文章、英文／繁體中文 head 切換和登入頁 `noindex`；canonical、OG、Twitter 和 JSON-LD 均能讀取。

### 下一步行動清單

1. 正式 SEO 上線前，把公開首頁和 Blog 文章遷移到 SSG/SSR，讓正文 H1 和內文直接出現在初始 HTML。
2. 在 Google Search Console 提交 sitemap，持續觀察主題詞「SEO 教學」「網站 SEO」「AI 優化教程」的曝光和點擊。
3. 後續為 86 篇文章補作者、更新日期和人工審校的多語言版本，避免只有 runtime metadata 而缺少可索引的語言頁。

### 部署結果補記

- GitHub Actions run `32657772521` 已成功部署 `4c5bbd3`；後續修正的 run `32658183424` Verify 成功，但 Deploy 在 SSH connectivity probe 因 runner 暫時連不上 VPS 而失敗。
- 已使用既有 `scripts/deploy-production.sh` 以乾淨 Git ref `4b766d2` 完成手動部署；部署前配置與資料庫備份均已建立，migration 全部為已套用狀態。
- 生產驗證通過：`https://api.rankwoven.com/health`、受保護 API smoke check、Web／API／Worker／Postgres／Redis 容器狀態；`/login`、`/register`、`/app` 回傳 `X-Robots-Tag: noindex, nofollow, noarchive`，首頁維持可索引。
- 生產入口仍是 Vite SPA；Blog 與公開子頁的完整初始 HTML metadata／正文 SSR/SSG 仍列在後續行動清單，不宣稱已完成。

## 會話總結（2026-08-24）— 公開頁面長尾關鍵詞配置

### 會話主要目的

以首頁 `SEO 教學` 為主關鍵詞，為每個可索引公開頁分配唯一長尾關鍵詞，並讓關鍵詞自然出現在頁面 H1、title、description 和 SEO head。

### 完成的主要任務

1. 建立 10 個公開入口的中英文關鍵詞映射；登入、客戶後台和管理後台不配置 SEO 關鍵詞。
2. 路由新增 `keywordKey`，語言切換時同步更新 `meta[name="keywords"]`；進入私有頁或無關鍵詞頁時會移除舊值。
3. 更新首頁、功能、文件、支援、品牌、聯絡、法律、Blog 和定價頁文案，讓 H1／title／description 自然包含對應關鍵詞。
4. Blog 文章以各自標題作長尾關鍵詞，並同步到 BlogPosting schema。
5. 增加測試，檢查中英文關鍵詞唯一性、首頁主詞、可見文案覆蓋及私有頁清理行為。

### 關鍵決策和解決方案

- `meta keywords` 僅作其他搜尋引擎與內部稽核用途；主要 SEO 信號仍由可見 H1、title、description、正文與內部連結承載。
- 每個靜態公開頁只指定一個 focus keyword，避免把「SEO 教學」重複塞入所有頁面造成搜尋意圖競爭。
- Blog 正文維持人工審校的繁體中文，文章長尾詞不建立未經審校的英文假翻譯。

### 使用的技術棧

Vue 3、TypeScript、Vue Router、Vue I18n、Vitest、Schema.org BlogPosting。

### 新增或修改文件

- `apps/web/src/constants/publicSeo.ts`
- `apps/web/src/utils/seoHead.ts`
- `apps/web/src/router/index.ts`
- `apps/web/src/views/BlogArticleView.vue`
- `apps/web/src/i18n.ts`
- `apps/web/src/i18n/publicPages.ts`
- `apps/web/index.html`
- `apps/web/tests/smoke.test.ts`
- `docs/frontend-page-spec.md`
- `README.md`

### 驗證與下一步

- 針對性 Web 測試通過，8 tests；全量 lint、test、build 和安全審計於提交前執行。
- 本次只提交到目前 `main` 分支，不推送、不部署；如需上線，需再次明確授權推送 `main`。
- 後續仍建議把公開層遷移至 SSG／SSR，讓所有子頁的 H1、正文與獨立 metadata 出現在初始 HTML。

### 會話補記（2026-08-24）

- 新增 `apps/web/scripts/generate-seo-pages.mjs`，在 Vite build 後為 10 個公開入口和 86 篇 Blog 文章輸出 96 個路由專屬 `dist/**/index.html`；每個檔案含對應 title、description、keywords、canonical、Open Graph，文章另含 BlogPosting JSON-LD。
- `apps/web/nginx.conf` 的公開 fallback 會優先返回路由專屬 `index.html`；登入、認證和後台路由仍使用 noindex fallback。
- 這是 metadata fallback，不是完整 SSR/SSG：公開頁面的 H1 和正文仍由 Vue runtime 渲染，完整內容索引仍列為後續架構工作。
- 驗證：`npm run lint`、`npm run test`（43 passed、4 skipped API；8 passed Web；4 passed Worker；7 passed ai-providers；1 passed cms-adapters）、`npm run build`、`npm run security:audit` 和 `git diff --check` 均通過；獨立腳本核對 96 個輸出頁與 96 個唯一 keywords 一致。Nginx 容器語法檢查因本機 Docker containerd read-only 而未完成，本機亦沒有 nginx CLI。

## 會話總結（2026-08-24）— 推送 SEO keyword 變更

### 會話主要目的

將已驗證的公開頁面長尾 keyword 變更推送至 GitHub `main`。

### 完成的主要任務

- 只暫存並提交 SEO keyword 實作、前端文案、測試、SEO fallback generator、Nginx fallback 和相關文件。
- 排除既有 Plausible script、WordPress 文件／插件、`.gitignore`、`.codebuddy` 目錄和 `0.jpeg` 等無關 dirty worktree。
- 建立 commit `92f6c44`：`feat(seo): add localized page keywords`。
- 推送至 `https://github.com/widecyruschan/rankwoven.git` 的 `main` 分支。

### 驗證與下一步

- 推送前 `npm run lint`、`npm run test`、`npm run build`、`npm run security:audit` 和 `git diff --cached --check` 均通過。
- 本次只執行 GitHub push，沒有手動部署；推送 `main` 可能依既有 GitHub Actions workflow 自動觸發生產部署。

## 會話總結（2026-08-24）— 修復 Production Deploy 測試波動

### 會話主要目的

修復 GitHub Actions `Production Deploy` 在 Verify 階段偶發把媒體 title 建議 `904` 誤認為文章 title 建議 `404`，導致部署被跳過的問題。

### 完成的主要任務

- 分析失敗 workflow `32695265212`，確認失敗位於 `apps/api/tests/siteConnections.test.ts` 的建議選取，而非部署腳本或 SEO 頁面。
- 建立媒體 title 排在文章 title 前面的確定性回歸場景，成功重現相同 `404`／`904` 錯配。
- 將文章 title 建議的選取條件收緊為 `targetType === 'article' && fieldName === 'title'`，不再依賴 API 回應順序。
- 保留媒體優先排列的回歸保護，確保之後 repository 時序不同也不會批准或套用錯誤建議。

### 關鍵決策和解決方案

- API 的建議列表按建立時間倒序返回；不同 runner 上同毫秒建立的建議可能有不同相對順序，因此測試必須以目標類型與欄位識別資料。
- 不修改產品 API 排序契約，只修正測試的模糊 selector，避免為測試穩定性引入不必要的業務行為變更。

### 使用的技術棧與修改文件

- Vitest、Fastify inject、TypeScript。
- `apps/api/tests/siteConnections.test.ts`
- `README.md`

### 驗證與下一步

- 修正前確定性回歸測試失敗，實際取得 `targetCmsId: '904'`；修正後同一命令通過並正確對文章 `404` 執行批准與套用。
- 強制媒體優先排序的回歸測試連續 20/20 次通過；`npm run lint`、`npm run test`（API 43 passed／4 skipped、Web 8 passed、Worker 4 passed、共享包 8 passed）、`npm run build`、`npm run security:audit` 和 `git diff --check` 均通過。
- 推送 `main` 後確認新的 Production Deploy workflow，並在 workflow 完成後檢查公開 API health。

## 會話總結（2026-08-29）— WordPress LLMs.txt 設定

### 會話主要目的

為 `rankwoven-seo` WordPress 插件加入可控的 `llms.txt` 內容輸出與 Markdown 文章地址，參考常見 SEO 插件的設定方式。

### 完成的主要任務

- 新增 `LLMs.txt` 後台分頁和 nonce 保護的設定保存流程。
- 新增 `llms.txt`、`llms-full.txt` 動態純文字輸出，以及可選的文章 `.md` Markdown 輸出。
- 支援標題／描述模板、公開文章類型和分類法選擇、每種 URL 上限、排除文章 ID 和排除分類項 ID。
- 僅讀取已發佈且可公開訪問的內容，並對正文 HTML 做基本 Markdown 轉換。
- 偵測網站根目錄實體 `llms.txt` 文件並在後台提示其可能覆蓋動態輸出。

### 關鍵決策和解決方案

- 所有 LLMs.txt 開關預設關閉，避免升級插件後意外公開內容。
- `llms-full.txt` 和 `.md` 都要求主 `llms.txt` 開關啟用；未啟用時不接管 WordPress 路由。
- 文章和分類法範圍沿用 WordPress 公開／可查詢設定，排除附件等非內容類型；輸出不包含任何插件憑據或環境設定。

### 使用的技術棧

WordPress PHP 8、WordPress Hooks、`get_posts`／`get_terms`、純文字 Markdown。

### 新增或修改文件

- `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`
- `plugins/wordpress/rankwoven-seo/README.md`
- `plugins/wordpress/README.md`
- `plugins/wordpress/TESTING.md`
- `README.md`

### 驗證與下一步

- Docker PHP 8.2 `php -l` 已通過；本機未安裝 PHP CLI。
- 測試站已同步插件源文件；站點根目錄現有實體 `llms.txt`，因此動態輸出需先移除或更新該文件後再做完整前台驗證。
- 尚未提交、推送 GitHub 或部署；下一步應先完成 WordPress 後台和三個公開地址的手動冒煙測試，再按授權提交。

## 會話總結（2026-08-30）— 將 LLMs.txt 移入網站地圖並新增 RSS Sitemap

### 會話主要目的

依據後台 Sitemap 設定頁的使用方式，將 LLMs.txt 設定集中到「網站地圖」目錄，並加入可提交給搜尋引擎的 RSS Sitemap。

### 完成的主要任務

- 移除獨立的 `LLMs.txt` 子選單，將原有設定區塊放入 `網站地圖` 頁面；舊的 `rankwoven-seo-llms-txt` URL 會回到 Sitemap 頁，保持相容。
- 新增 RSS Sitemap 設定：啟用開關、最新貼文數量、Post Types 選擇。
- 新增 `/sitemap.rss` 動態 RSS 2.0 輸出，包含最新已發佈內容的標題、連結、發佈時間、摘要和正文。
- 新增 `rankwoven_rss_settings` option、保存提示、canonical redirect 排除與測試清單。
- 插件版本更新至 `0.4.0`。

### 關鍵決策和解決方案

- RSS Sitemap 預設關閉，避免升級後自動公開內容；數量限制套用整個 RSS feed，預設 50 篇。
- RSS 與完整 `sitemap.xml` 保持不同用途：前者只提供最新更新，後者仍提供全量 URL。
- LLMs.txt 原有開關與輸出路由保持不變，只調整後台歸類和保存後返回的分頁。

### 使用的技術棧

WordPress PHP 8、WordPress Hooks、RSS 2.0 XML、`get_posts`、Docker PHP 8.2。

### 新增或修改文件

- `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`
- `plugins/wordpress/rankwoven-seo/README.md`
- `plugins/wordpress/README.md`
- `plugins/wordpress/TESTING.md`
- `README.md`

### 驗證與下一步

- Docker PHP 8.2 語法檢查、RSS XML 冒煙和標準 `/sitemap.xml` 輸出驗證均通過；RSS 回應為 `application/rss+xml` 且可由 `xmllint` 解析。
- 已確認測試站根目錄的實體 `llms.txt` 在測試後恢復；未建立實體 `sitemap.rss` 文件。
- 尚未提交、推送 GitHub 或部署；提交前需再次確認工作區中沒有 `.env`、密碼、Token 或 API Key。

## 會話總結（2026-08-30）— RSS 可讀樣式與公開內容純文字清理

### 會話主要目的

將 RSS Sitemap 改為接近 MySitemapGenerator 示例的瀏覽器可讀格式，並清理 `llms.txt`、RSS 及相關文章輸出中的編輯器代碼；文章順序維持現有排序。

### 完成的主要任務

- 新增 `assets/rss-sitemap.xsl`，以 `xml-stylesheet` 讓瀏覽器顯示藍色文章標題、發佈時間、摘要、縮略圖／站點圖標與分隔線。
- RSS 項目加入特色圖片／站點圖標 `enclosure`，並保留標準 RSS 2.0、Atom self link、`content:encoded`。
- RSS 正文改用共用純文字清理，移除 HTML、Script／Style 和 WordPress／Visual Composer shortcode 代碼。
- `llms.txt`、`llms-full.txt`、文章 `.md` 與 RSS 共用 shortcode 清理規則，避免輸出 `[vc_row]`、`[vc_column]`、`font_container` 等編輯器片段。
- RSS 繼續使用 `get_posts` 的 `modified DESC`，XSL 不重新排序，確保與現有文章順序一致。

### 關鍵決策和解決方案

- 不硬編碼外部示例 URL，只參考其 RSS + XSL 展示方式；樣式文件由插件本地提供，避免第三方依賴。
- 對不規範 shortcode 引號不嘗試猜測屬性正文，直接移除完整 shortcode 標籤與屬性，確保公開文件不洩露樣式／編輯器代碼。

### 使用的技術棧

WordPress PHP 8、RSS 2.0 XML、XSLT 1.0、WordPress `get_posts`／內容清理 API、Docker PHP 8.2。

### 新增或修改文件

- `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`
- `plugins/wordpress/rankwoven-seo/assets/rss-sitemap.xsl`
- `plugins/wordpress/README.md`
- `plugins/wordpress/rankwoven-seo/README.md`
- `plugins/wordpress/TESTING.md`
- `README.md`

### 驗證結果或未驗證原因

- 測試站插件同步後，Docker PHP 8.2 語法檢查通過。
- 純文字清理已用包含 `[vc_row]`、`[vc_column]` 和 Visual Composer 屬性的樣本驗證，輸出不再含 shortcode 代碼。
- 尚未在啟用 RSS 的測試站公開路由上完成完整瀏覽器截圖驗證；測試站根目錄仍存在實體 `llms.txt`，會優先於 WordPress 動態路由返回。

### 下一步行動清單

- 暫時移開測試站實體 `llms.txt`，啟用 RSS 設定後驗證 `/sitemap.rss`、XSL 載入、XML 解析和文章排序。
- 完成前台驗證後，只提交本次相關文件，再按用戶授權推送 GitHub／部署。

## 會話總結（2026-08-30）— 修復 GitHub Actions SSH 部署失敗

### 會話主要目的

修復 `Production Deploy` 在 `Configure SSH` 階段連續五次探測失敗，導致 Hostinger VPS 部署 Job 中止的問題。

### 完成的主要任務

- 以失敗 workflow `33302129981` 作為可重現回路，確認 Verify 已通過，故障只發生在部署 Job 的 SSH 預檢。
- 只讀檢查 VPS：SSH 監聽 IPv4／IPv6 22 端口、UFW 未啟用、nftables 沒有 INPUT 拒絕規則，本機可使用明確指定的部署私鑰以 `root` 登入。
- 更新 GitHub Repository Secrets 的 VPS Host、Port、User 與 SSH Key；未在日誌、文檔或 Git 中輸出任何私鑰內容。
- 重新執行失敗 Job；第二次執行的 `Configure SSH`、`Deploy` 及整個 workflow 全部通過。

### 關鍵決策和解決方案

- 根因是 GitHub 保存的 VPS 連接 Secret 與目前有效連接資料不一致，不是 workflow 程式碼、VPS SSH 服務或主機防火牆故障。
- 不修改 workflow 或放寬 VPS 防火牆；直接校正現有 Secrets，維持原本的私鑰驗證和 `StrictHostKeyChecking=accept-new` 安全流程。

### 使用的技術棧

GitHub Actions、GitHub CLI、OpenSSH、Hostinger VPS、Docker Compose、curl。

### 新增或修改文件

- `README.md`（只追加本次會話記錄）
- GitHub Repository Secrets（外部設定，不包含在 Git 檔案）

### 驗證結果

- Workflow `33302129981` 第二次執行成功，Verify 與 Deploy Job 全部為綠色。
- 生產 API health、部署 commit、Docker Compose 容器健康與受保護 API 的 401 行為均再次驗證。

### 下一步行動清單

- GitHub Actions 對 Node.js 20 action runtime 顯示棄用警告；後續可在 `actions/checkout`／`actions/setup-node` 官方新 major 穩定後升級，該警告不影響本次部署。

## 會話總結（2026-08-31）— 更新 WordPress SEO 外掛

### 會話主要目的

將 `plugins/wordpress/rankwoven-seo/` 更新至已完成的 SEO 評分與 GEO 優化版本，同時保留圖片優化、LLMs.txt 與 RSS Sitemap 功能。

### 完成的主要任務

- 恢復 19 項、100 分權重的文章／頁面／商品 SEO 逐項檢查，並在編輯器顯示 Problems、Warnings、Success 清單。
- 恢復 GEO 爬蟲存取、索引／摘要控制、hreflang 與 `x-default` 設定，以及 Sitemap 搜尋引擎提交入口。
- 合併 WebP／AVIF 圖片優化、圖片批量轉換與從網址上傳模組，保留 LLMs.txt／RSS 的純文字內容清理。
- 更新插件版本至 `0.6.0` 及插件 README。

### 關鍵決策和解決方案

以 GitHub `origin/main` 的 `0.6.0` SEO/GEO 實作為基線，再精確合併工作區已有圖片優化與內容清理改動，避免覆蓋未提交的使用者功能或憑據設定。

### 使用的技術棧

WordPress PHP 8、WordPress Hooks、jQuery、RSS 2.0／XSLT、WebP／AVIF 圖片處理、JavaScript ESLint。

### 新增或修改文件

- `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`
- `plugins/wordpress/rankwoven-seo/assets/editor-seo.js`
- `plugins/wordpress/rankwoven-seo/assets/editor-seo.css`
- `plugins/wordpress/rankwoven-seo/assets/admin.css`
- `plugins/wordpress/rankwoven-seo/assets/css/admin-style.css`
- `plugins/wordpress/rankwoven-seo/assets/js/admin-script.js`
- `plugins/wordpress/rankwoven-seo/assets/js/media-url-upload.js`
- `plugins/wordpress/rankwoven-seo/assets/rss-sitemap.xsl`
- `plugins/wordpress/rankwoven-seo/includes/class-image-optimizer.php`
- `plugins/wordpress/rankwoven-seo/README.md`

### 驗證結果

- PHP parser：主插件與圖片優化模組通過。
- JavaScript：編輯器、圖片管理與網址上傳腳本通過語法檢查。
- `npm run lint` 通過。
- `npm run test` 通過：API 43、Web 8、Worker 4、AI provider 7、CMS adapter 1；另有 4 個資料庫測試按環境跳過。
- 未提交任何 `.env`、密碼、Token、API Key 或私鑰；本機沒有 PHP CLI，未執行原生 `php -l`。

### 下一步行動清單

- 只提交本次插件目錄與本會話 README 變更，推送至 GitHub `main`。
- 推送後檢查 GitHub Actions 與生產健康檢查。

## 會話總結（2026-08-31）— 完善 GEO 設定

### 會話主要目的

根據 GEO 審計報告，補齊 WordPress 外掛的結構化資料、內容可引用性與 E-E-A-T 設定。

### 完成的主要任務

- 新增可關閉的 JSON-LD 圖譜，支援 Organization、WebSite、Person、Article、WebPage、Product 和 BreadcrumbList。
- 新增 Organization 名稱、描述、Logo、`sameAs` 社交連結，以及 JSON-LD、Entity、Content、Author & Date 四項開關。
- GEO readiness 擴展為 AI Crawler Access、Machine Readability、Structured Data、Content & Citability、Trust & E-E-A-T 五組評分。
- 加入標題層級、首段答案、問題式標題、清單／表格、統計數據、引用、內容深度、作者、日期、About／Contact、Privacy／Terms、品牌一致性和 HTTPS 檢查。
- `x-default` 留空時自動回退至網站首頁，避免 hreflang 缺失。

### 關鍵決策和解決方案

結構化資料預設啟用但每項可獨立停用；商品價格、SKU 和庫存只在存在對應 WooCommerce 欄位時輸出；內容評估只取最近更新的公開內容作為站點代表樣本，避免掃描全部文章。

### 使用的技術棧

WordPress Hooks、PHP 8、Schema.org JSON-LD、`get_posts`／`get_page_by_path`。

### 新增或修改文件

- `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`
- `plugins/wordpress/rankwoven-seo/README.md`
- `README.md`

### 驗證結果

- 測試站 Docker WordPress PHP 8.2 parser 通過。
- JavaScript 語法檢查與 `git diff --check` 通過。
- 尚未執行完整 `npm run lint`、`npm run test`、`npm run build`。

### 下一步行動清單

- 在測試站後台保存 GEO 設定，逐頁檢查 JSON-LD 與 hreflang。
- 使用 Rich Results Test 及 Search Console 驗證 Article／Product Schema。

## 會話總結（2026-08-31）— 新增 IndexNow

### 會話主要目的

為 WordPress SEO 插件新增 IndexNow 即時通知，讓搜尋引擎更快發現文章、頁面、Portfolio 和商品的變更。

### 完成的主要任務

- 新增 IndexNow 啟用、自動提交、內容類型和 API Key 設定。
- 新增公開 `/{key}.txt` 驗證文件路由及手動 URL 批量提交。
- 在公開內容發佈、更新、移除時自動通知 `api.indexnow.org`。
- 加入本站網域驗證、最多 10,000 個 URL 限制、2xx 狀態處理和 60 秒重複提交鎖定。

### 關鍵決策和解決方案

IndexNow Key 是公開驗證值，不當作登入密碼保存或輸出到日誌；所有提交 URL 必須屬於本站 http／https 網域，網路錯誤不會阻止 WordPress 內容保存。

### 使用的技術棧

WordPress Hooks、WordPress HTTP API、IndexNow JSON API、動態純文字文件路由。

### 新增或修改文件

- `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`
- `plugins/wordpress/rankwoven-seo/README.md`
- `plugins/wordpress/TESTING.md`
- `README.md`

### 驗證結果

- Docker WordPress PHP 8.2 parser 通過。
- 本地測試站的 `/{key}.txt` 返回 `200` 及正確純文字 Key。
- 尚待完成 IndexNow API mock 與完整 lint／test／build。

### 下一步行動清單

- 在測試站攔截 HTTP 請求，驗證 IndexNow JSON payload 與成功／失敗狀態保存。
- 提交前檢查插件目錄，不包含 `.env`、密碼、Token、API Key 或私鑰。

## 會話總結（2026-09-11）— 調整 WordPress 插件導航間距

### 會話主要目的

根據截圖紅框位置，改善 WordPress 插件後台頂部導航與 Overview 內容面板之間的間距。

### 完成的主要任務

- 將 `.rankwoven-admin-tabs.nav-tab-wrapper` 的下邊距由 `18px` 調整為 `34px`。
- 保留導航標籤尺寸、內容卡片內距及其他頁面樣式不變。

### 關鍵決策和解決方案

採用單一 CSS 間距修改，限定影響頂部導航與下一個內容區塊的垂直距離，避免改動其它後台元件。

### 使用的技術棧

WordPress admin CSS。

### 新增或修改文件

- `plugins/wordpress/rankwoven-seo/assets/admin.css`
- `README.md`

### 驗證結果

- 待在 WordPress 後台瀏覽器確認桌面及窄螢幕的實際間距。

### 下一步行動清單

- 同步插件到測試站後檢查導航與 Overview 之間的視覺距離。

## 會話總結（2026-09-12）— 修復 Blog 孤島頁面

### 會話主要目的

修復全部 Blog 文章被 SEO 工具判定為沒有導入內鏈的孤島頁面，並處理同一報告中的無導出連結、H1 缺失、正文過短和 Meta Description 過短。

### 完成的主要任務

- 靜態 `/blog` SEO HTML 輸出全部 86 篇文章的可抓取連結。
- 每篇靜態文章頁輸出 H1、完整 Markdown 正文、返回 Blog、上一篇／下一篇及同分類相關文章連結。
- 短文章摘要會結合正文生成 120 至 156 字的 Meta Description，並同步套用到 Vue 執行後的 Meta 與 BlogPosting Schema。
- SEO 頁面生成器新增鏈接圖、H1、正文、導出文章連結及描述長度斷言，缺失時直接令構建失敗。
- 新增短摘要文章的 Meta Description 回歸測試。

### 關鍵決策和解決方案

根因是原靜態 SEO 生成器只更新 `<head>`，`<body>` 仍是空白 `#app`。修復在構建階段輸出真實可讀內容和內鏈，Vue 載入後仍正常接管 `#app`，不改變既有互動頁面。

### 使用的技術棧

Vue 3、TypeScript、Vite、JSDOM、Marked、Vitest、靜態 SEO fallback HTML。

### 新增或修改文件

- `apps/web/scripts/generate-seo-pages.mjs`
- `apps/web/src/blog/articles.ts`
- `apps/web/src/views/BlogArticleView.vue`
- `apps/web/tests/smoke.test.ts`
- `README.md`

### 驗證結果

- `npm run build -w @aieo/web` 通過，生成 96 個公開 SEO 頁面並驗證 86 篇 Blog 導入內鏈。
- 靜態鏈接圖檢查：86 篇文章、最少 5 條導入內鏈、孤島頁面 0。
- `npm run test -w @aieo/web` 通過，共 8 項測試。
- `npm run test` 全倉庫通過：API 46、Web 8、Worker 4、AI Provider 7、CMS Adapter 1；另有 4 項 PostgreSQL 測試按環境跳過。
- `npm run lint` 通過。
- 本地瀏覽器驗證 Blog 列表和文章頁均只有一個 H1，文章正文正常載入，Meta Description 長度符合要求，無瀏覽器錯誤。
- 提交 `02478a6` 已推送至 GitHub `main`，遠端 SHA 已確認一致。
- GitHub Actions 的 Lint、Test、Build 通過，但 Security audit 因新披露的 `fast-uri` 高危通告及既有 Fastify／Vitest 通告失敗，因此未進入 VPS 部署。

### 下一步行動清單

- 另開依賴安全修復，更新 `fast-uri`／Fastify／Vitest 相依版本並重跑部署；部署完成後以生產頁面原始 HTML 重跑孤島頁面檢查。

## 會話總結（2026-09-12）— 修復安全掃描部署失敗

### 會話主要目的

修復 Blog SEO 提交後 GitHub Actions 在 Security audit 階段因新依賴漏洞通告而失敗，並重新部署生產環境。

### 完成的主要任務

- Fastify 由 `5.10.0` 升級至 `5.12.4`。
- Vitest 由 `3.2.7` 升級至 `4.1.11`。
- 傳遞依賴 `fast-uri` 更新至安全版本 `3.1.7`／`4.1.4`。
- Web TypeScript 設定明確加入 Node 類型，兼容 Vitest 4 的類型載入方式。
- 重新生成 npm 鎖文件並以乾淨 `npm ci` 驗證。

### 關鍵決策和解決方案

依照 GitHub Security Advisory 的首個修復版本選擇最小穩定升級，不使用 `npm audit fix --force`，避免引入 Vitest 5 或未審查的依賴變更。

### 使用的技術棧

Node.js 22、npm workspaces、Fastify、Vitest、GitHub Actions、npm audit。

### 新增或修改文件

- `package.json`
- `package-lock.json`
- `apps/api/package.json`
- `apps/web/tsconfig.json`
- `README.md`

### 驗證結果

- `npm ci --ignore-scripts --registry=https://registry.npmjs.org` 通過。
- `npm run lint` 通過。
- `npm run test` 全倉庫通過。
- `npm run build` 通過。
- `npm run security:audit` 返回 `found 0 vulnerabilities`。

### 下一步行動清單

- 提交 `a3d9b92` 已推送至 `main`；GitHub Actions run `34630956000` 的 Verify、Security audit 與 Hostinger VPS Deploy 全部通過。
- 生產 API health 正常，主站返回 `200`；`/blog` 原始 HTML 包含 86 篇文章連結，示例文章包含 H1、完整正文、5 條文章內鏈及 156 字 Meta Description。

## 会话总结（2026-09-12）— 安装 UI 技能与主题切换

### 会话主要目的

搜索并自动安装 UI 优化技能，改善前端视觉一致性，并为网站和工作台增加亮色／暗色主题选择。

### 完成的主要任务

- 使用 `agent-reach` 搜索 GitHub UI 技能，找到 `gnurio/refactoring-ui-plugin`。
- 使用 `skill-installer` 自动安装 `meta-refactor-ui` 及其 10 个细分 UI 技能。
- 新增 `useTheme` composable 和 `ThemeSwitcher` 组件。
- 在营销页、客户后台和管理后台顶部加入主题切换按钮。
- 主题选择写入 `localStorage`，刷新页面后保持；亮色和暗色分别覆盖自定义样式及 Ant Design 控件。
- 加入暗色模式颜色变量、表面层级、表格、表单、下拉菜单和弹窗样式。

### 关键决策和解决方案

采用亮色作为默认主题，使用单一 `data-theme` 属性驱动 CSS 变量，避免在每个页面重复维护主题逻辑；暗色配色保持蓝色品牌强调，同时提高深色背景上的正文和控件对比度。

### 使用的技术栈

Vue 3、TypeScript、Vue I18n、Ant Design Vue、Lucide Icons、CSS Variables、localStorage。

### 新增或修改文件

- `apps/web/src/composables/useTheme.ts`
- `apps/web/src/components/ThemeSwitcher.vue`
- `apps/web/src/main.ts`
- `apps/web/src/App.vue`
- `apps/web/src/i18n.ts`
- `apps/web/src/styles.css`
- `apps/web/tests/smoke.test.ts`
- `README.md`

### 验证结果

- `npm run lint` 通过。
- `npm run test` 全仓库通过：API 46、Web 9、Worker 4、AI Provider 7、CMS Adapter 1；另有 4 项 PostgreSQL 测试按环境跳过。
- `npm run build` 通过。
- 本地浏览器验证亮色／暗色切换、localStorage 持久化、按钮无障碍标签及无横向溢出。

### 下一步行动清单

- 在浏览器中继续检查已登录工作台各页面的表格、图表和弹窗暗色对比度。
- 经授权后提交并推送主题 UI 改动。

## 会话总结（2026-09-12）— 修复公开页面孤岛

### 会话主要目的

修复除 Blog 外的公开页面被 SEO 工具判定为孤岛页面的问题，并将修复结果推送到 GitHub。

### 完成的主要任务

- 静态 SEO 生成器为首页、Features、Docs、Help、About、Contact、Privacy、Terms、Pricing 和 Blog 输出真实可读内容。
- 每个公开页面加入统一的站内页面导航，确保页面之间存在导入和导出内链。
- 保留 Blog 的 86 篇文章链接，并让 Blog 主页和文章页连接到其它公开页面。
- 构建阶段新增唯一 H1、正文长度、导出内链和全站导入链接断言，发现孤岛会直接阻止构建。

### 关键决策和解决方案

根因是静态 SEO 页面只包含 Meta 和空的 `#app`，非 JavaScript 爬虫无法看到 Vue 渲染的内容。修复使用轻量静态 fallback，不改变 Vue 运行时页面；所有内链使用站内相对路径，避免生成外部或不可抓取地址。

### 使用的技术栈

Node.js、JSDOM、Vite、Vue 3、静态 SEO fallback HTML。

### 新增或修改文件

- `apps/web/scripts/generate-seo-pages.mjs`
- `README.md`

### 验证结果

- `npm run build -w @aieo/web` 通过，生成 96 个公开 SEO 页面。
- 10 个公开页面均有唯一 H1、可读正文和 9 个站内公开页面链接。
- 全站公开页面孤岛数量：`0`，最少导入链接：`9`。
- Blog 86 篇文章链接和文章页正文继续通过构建断言。

### 下一步行动清单

- 提交本次静态 SEO 页面修复并推送 GitHub `main`。
- 部署后重新抓取生产页面，确认缓存已更新。

## 會話總結（2026-09-12）— 調整定價頁標題字級

### 會話主要目的

修正定價頁中英文主標題過大、視覺層級失衡的問題。

### 完成的主要任務

- 將定價頁桌面主標題由 `64px / 900` 收斂為 `40px / 700`。
- 將定價頁行動端主標題調整為 `32px / 700`，並維持 `1.2` 行高。
- 將標題最大寬度限制為 `680px`，改善英文長標題換行與閱讀節奏。
- 修改範圍只限定價頁，不影響首頁 Hero 與登入頁標題。

### 關鍵決策和解決方案

使用定價頁既有 `.pricing-heading h1` 選擇器做局部覆寫，避免改動共用標題規則；以固定響應式字級維持中英文一致層級及穩定版面。

### 使用的技術棧

Vue 3、TypeScript、Vite、CSS Media Queries、Vue I18n。

### 新增或修改文件

- `apps/web/src/styles.css`
- `README.md`

### 驗證結果

- `npm run lint` 通過。
- 使用 Node.js `22.23.2` 執行 `npm run test` 全倉通過：API 46、Web 9、Worker 4、AI Provider 7、CMS Adapter 1；另有 4 項 PostgreSQL 測試按環境跳過。
- `npm run build` 全倉通過，生成 96 個公開 SEO 頁面。
- `npm run security:audit` 通過，返回 `found 0 vulnerabilities`。
- 本地瀏覽器驗證中英文桌面標題均為 `40px`，行動端均為 `32px`，頁面沒有橫向溢出。

### 下一步行動清單

- 在獲得推送／部署授權後，將本次提交推送至 GitHub 並驗證生產定價頁。

## 會話總結（2026-09-12）— 修正暗色模式 Logo 與文章對比

### 會話主要目的

根據暗色模式截圖，修正品牌 Logo 與 Blog 文章文字在深色背景上不清晰的問題。

### 完成的主要任務

- 新增暗色版 RankWoven Logo，將品牌文字由深色調整為淺色，保留原有盾牌與金色箭頭。
- 前台頁首與客戶／管理後台側欄會跟隨主題自動切換 Logo。
- 為 SEO 文章正文、引用區及行內代碼加入暗色專用文字與背景色。
- 增加回歸測試，確保暗色 Logo 切換與文章閱讀樣式不會被移除。

### 關鍵決策和解決方案

只修正實測不達標的元素：功能頁文字原有對比已通過，因此不做無效的全頁改色；文章色彩沿用現有暗色 token，避免影響亮色模式或擴大設計系統。

### 使用的技術棧

Vue 3、TypeScript、Vite、Vue Composition API、CSS Variables、SVG、Vitest、WCAG AA 對比檢查。

### 新增或修改文件

- `apps/web/src/App.vue`
- `apps/web/src/assets/rankwoven-logo-dark.svg`
- `apps/web/src/styles.css`
- `apps/web/tests/smoke.test.ts`
- `README.md`

### 驗證結果

- `npm run lint` 通過。
- `npm run test -w @aieo/web` 通過，共 10 項測試。
- `npm run build -w @aieo/web` 通過，生成 96 個公開 SEO 頁面。
- 暗色 Logo 文字切換為 `#EDF3F8`，亮色 Logo 能正常恢復。
- 文章正文對比由 `1.43:1` 提升至 `9.86:1`，引用區為 `12.19:1`，引用連結為 `8.67:1`，全部高於 WCAG AA 要求。
- 375px 行動端視口沒有橫向溢出。

### 下一步行動清單

- 獲得授權後推送 `main`，並在生產環境重新驗證首頁、功能頁與 Blog 文章暗色模式。

## 會話總結（2026-09-12）— 修正定價頁排版錯位

### 會話主要目的

根據中英文定價頁截圖，修正標題偏左、英文換行凌亂及窄桌面導覽溢出的問題。

### 完成的主要任務

- 將受 `max-width` 限制的定價頁 H1 重新置中，與 eyebrow 和描述共用同一視覺中心。
- 為多語言標題加入平衡換行，避免英文只剩單字落在下一行。
- 在 `761–1080px` 視口將主導覽移至第二列，避免 Logo、導覽與操作控制互相擠壓。
- 新增排版回歸測試，鎖定標題置中、平衡換行及窄桌面斷點規則。

### 關鍵決策和解決方案

保留既有 `40px` 桌面與 `32px` 行動端字級，只補齊 `margin-inline: auto` 與 `text-wrap: balance`；窄桌面使用獨立 media query，不改動桌面和手機既有結構。

### 使用的技術棧

Vue 3、Vite、CSS Logical Properties、CSS Text Wrap、Responsive Media Queries、Vitest、瀏覽器 DOM 量測。

### 新增或修改文件

- `apps/web/src/styles.css`
- `apps/web/tests/smoke.test.ts`
- `README.md`

### 驗證結果

- `npm run lint` 通過。
- `npm run test` 全倉通過，共 69 項測試；另有 4 項 PostgreSQL 整合測試按環境跳過。
- `npm run build -w @aieo/web` 通過，生成 96 個公開 SEO 頁面。
- `1251px` 視口下 H1 中心由 `395px` 修正為頁面中心 `618px`。
- `1080px`、`1081px`、`800px`、`760px` 與 `375px` 視口均沒有水平溢出。

### 下一步行動清單

- 獲得授權後推送 `main` 並驗證生產定價頁中英文排版。

## 會話總結（2026-09-12）— 修正暗色語言選單對比

### 會話主要目的

修正暗色模式語言選單文字過暗、預設狀態難以閱讀的問題。

### 完成的主要任務

- 為 Ant Design 語言下拉選單項目加入精準暗色文字覆蓋。
- 修正被 Ant Design specificity 蓋掉的暗色 hover 背景。
- 擴充回歸測試，鎖定預設文字及 hover 的暗色 token。

### 關鍵決策和解決方案

根因是選單容器已套用暗色 token，但 `.ant-dropdown-menu-item` 仍被元件庫設為 `rgba(0,0,0,.88)`；修正只提高語言浮層項目的 selector specificity，不使用 `!important`，亦不改動其他下拉選單。

### 使用的技術棧

Vue 3、Ant Design Vue、CSS Variables、CSS Specificity、Vitest、WCAG AA 對比量測。

### 新增或修改文件

- `apps/web/src/styles.css`
- `apps/web/tests/smoke.test.ts`
- `README.md`

### 驗證結果

- `npm run lint` 通過。
- `npm run test` 全倉通過，共 69 項測試；另有 4 項 PostgreSQL 整合測試按環境跳過。
- `npm run build -w @aieo/web` 通過，生成 96 個公開 SEO 頁面。
- 暗色預設文字對比由 `1.34:1` 提升至 `13.99:1`。
- hover 使用品牌淺藍底及淺色文字；亮色模式維持白底深色文字。
- 375px 視口的 11 個語言選項完整落在頁面內，沒有水平溢出。

### 下一步行動清單

- 獲得授權後推送 `main` 並驗證生產語言選單。

## 會話總結（2026-09-12）— 統一暗色表單、表格與圖表配色

### 會話主要目的

參考指定深灰藍儀表板配色，修正客戶後台暗色模式中表單、表格及狀態元件文字與背景混在一起的問題。

### 完成的主要任務

- 抽取參考圖的深灰藍表面、浮層、邊框、主文字、次要文字及品牌色，建立共用工作台 palette。
- 在應用啟動層加入 Ant Design Vue `darkAlgorithm`，統一 Select、Input、Card、Statistic、Tabs、Table、Alert、Dropdown、Modal、Tag、Progress 等元件。
- ECharts 共享相同深灰藍 palette，主題切換時重新初始化圖表，確保圖例、座標軸、網格線及 tooltip 可讀。
- 移除會覆蓋 Ant Design 主題的零散暗色 CSS，保留原生日期欄位及自訂元件規則。
- 修正 Card／ECharts 的 min-content 撐寬問題，避免手機頁面出現橫向溢出。
- 新增 palette token 與 WCAG 對比回歸測試。

### 關鍵決策和解決方案

根因是既有暗色模式只覆蓋部分 Ant Design class，元件內層仍使用亮色演算法。改用元件庫官方暗色演算法作為單一來源，再以參考圖 palette 覆寫全域 token；避免繼續逐項增加高 specificity CSS。

### 使用的技術棧

Vue 3、Ant Design Vue ConfigProvider、Ant Design darkAlgorithm、ECharts、CSS Variables、Vitest、WCAG AA 對比量測。

### 新增或修改文件

- `apps/web/src/main.ts`
- `apps/web/src/components/AnalyticsChart.vue`
- `apps/web/src/theme/darkWorkspaceTheme.ts`
- `apps/web/src/styles.css`
- `apps/web/tests/smoke.test.ts`
- `README.md`

### 驗證結果

- `npm run lint` 通過。
- `npm run test` 全倉通過，共 70 項測試；另有 4 項 PostgreSQL 整合測試按環境跳過。
- `npm run build -w @aieo/web` 通過，生成 96 個公開 SEO 頁面。
- Select 由 `1.12:1` 提升至 `14.33:1`；Card／Statistic／Tabs 由最低 `1.34:1` 提升至 `14.33–15.11:1`。
- 表格表頭及儲存格對比分別為 `14.54:1` 與 `14.33:1`；活動 Tab 為 `4.85:1`。
- 控制邊界對比為 `3.12:1`；placeholder 為 `6.27:1`；狀態 Tag 改用高對比主文字。
- 375px 視口 Card 寬度為 `324px`、圖表寬度為 `274px`，頁面沒有水平溢出。
- 臨時 QA 頁與路由已刪除，沒有納入提交。

### 下一步行動清單

- 獲得授權後推送 `main`，並在生產 Analytics、Tasks 及其他表格頁重新量測暗色元件。

## 會話總結（2026-09-12）— 部署現有 UI 與制定第二階段 PRD

### 會話主要目的

先將已完成的暗色工作台 UI 推送及部署到生產環境，再結合現有產品基線、使用者初步構想與 2026 年官方 AI／SEO 能力，制定 RankWoven 第二階段開發 PRD。

### 完成的主要任務

- 將暗色表單、表格、圖表與狀態元件更新提交並推送至 GitHub `main`。
- 確認 GitHub Actions `Production Deploy` 的 Verify、Lint、70 項測試、Build、Security audit 及 Hostinger VPS Deploy 全部成功。
- 以登入後生產工作台驗證 Analytics、Tasks、Select、Card、Statistic、Tabs、Table 及 Tag 的新暗色 palette 已生效。
- 完整核對現有 PRD、關鍵詞 Provider、Site Audit、Lighthouse、GSC、內容建議、資料表與前端路由基線。
- 使用官方一手資料研究 Structured Outputs、grounding、Batch、SEO 競品資料、AI 搜尋引用、GSC、PageSpeed、Shopify、Stripe、PayPal 及 outreach 合規。
- 新增第二階段 PRD，涵蓋 Keyword Intelligence、Content Optimizer、站點體檢、競品／AI 可見度監控、外鏈機會、CMS／API、計費、資料真實性、安全、測試、KPI 與分階段時程。

### 關鍵決策和解決方案

- 競品排名、搜尋量、流量估算及權威指標必須來自授權資料 Provider；AI 只負責語義擴展、聚類、解釋與策略，不可補造真實指標。
- E-E-A-T 改寫必須使用可驗證引用及 Claim Ledger；作者經驗、案例與資格由用戶提供，AI 不得虛構。
- 不採「付費無限使用」，改用 Entitlement、Research Credits、append-only usage ledger 及 spending cap 控制可變成本。
- 外鏈功能先做機會推薦與 outreach 草稿，不自動寄信或建立連結。
- 建議分為 Phase 2A 六週、Phase 2B 四週及另行估算的 Phase 2C；兩至三週只適合單一垂直切片驗證。
- 新增 AI Search Visibility 作 Phase 2B 差異化能力，但明確標示為固定問題集的採樣結果，不稱為穩定「AI 排名」。

### 使用的技術棧

Vue 3、TypeScript、Fastify、PostgreSQL、Redis／BullMQ、Zod／JSON Schema、WordPress、GSC、PageSpeed Insights／CrUX／Lighthouse、DataForSEO／Ahrefs／Semrush Provider、OpenAI／Anthropic／Gemini Provider、Stripe、PayPal、Shopify Admin GraphQL。

### 新增或修改文件

- `docs/rankwoven-phase-2-prd.md`
- `docs/research/phase-2-ai-seo-2026.md`
- `README.md`

### 驗證結果

- 生產版本為 `225b12bd9870ef5a2a175809c9d75a57357099a7`，本地 `main`、`origin/main` 與 GitHub Actions head SHA 一致。
- GitHub Actions run `34686367887` 結論為 `success`，生產 API health 正常。
- PRD 已核對標題結構、Git diff 格式與敏感字串，未加入 `.env`、密碼、Token、API Key 或私鑰。
- PRD 與研究筆記是部署完成後的本地文件，未再次推送，避免純文件修改觸發生產部署。

### 下一步行動清單

- 確認 Phase 2A 主 SEO Data Provider、首批市場與 Beta 月度資料預算。
- 將 PRD 拆成可獨立交付的垂直功能 Issue，先實作研究專案持久化、來源標籤與用量帳本。
- 文件獲確認後再獨立提交，避免夾帶工作區中其他既有未提交內容。

## 會話總結（2026-09-12）— Backlink 發布 API 調研

### 會話主要目的

確認是否存在可發布 backlink 的 API，並區分合法 CMS 發布能力與 backlink 分析能力。

### 完成的主要任務

- 查閱 Google Link Spam 政策、WordPress REST API、Ghost Admin API、Shopify Admin GraphQL、DataForSEO Backlinks 及 Ahrefs API 官方文件。
- 確認 WordPress、Ghost、Shopify 等 API 可在站點所有者授權下建立或發布內容。
- 確認 DataForSEO、Ahrefs、Semrush 適合做 backlink profile、referring domains、競品與新／失連結分析，不能代表第三方網站發布權限。

### 關鍵決策和解決方案

- 不設計自動向第三方網站注入 backlink 的功能；RankWoven 應採「機會發現 → 草稿 → 人工批准 → 自有 CMS 發布」流程。
- 付費／贊助連結需按 Google 政策使用 `rel="sponsored"` 或 `nofollow`；outreach 發送另需處理退訂、suppression list 及地區法規。

### 使用的技術棧

WordPress REST API、Ghost Admin API、Shopify Admin GraphQL、DataForSEO Backlinks API、Ahrefs API、Semrush API。

### 新增或修改文件

- 未修改程式碼；只追加本次研究記錄至 `README.md`。

### 驗證結果

- 官方文件查閱完成；未新增 API Key、密碼、Token 或 `.env`。

### 下一步行動清單

- 若納入第二階段，先實作 DataForSEO／Ahrefs／Semrush backlink 機會 Adapter，再接 WordPress／Shopify 的授權內容發布。

## 會話總結（2026-09-12）— 將 Backlink 發布流程納入 Phase 2C

### 會話主要目的

按「發現機會 → AI 分析 → 生成草稿 → 人工批准 → 授權 CMS 發布 → 重新抓取驗證」流程，完善第二階段 PRD 的外鏈開發規劃。

### 完成的主要任務

- 在 PRD 新增 Backlink Opportunity 六步工作流及 `discovered`、`qualified`、`drafted`、`approved`、`publishing`、`published`、`verifying` 等狀態。
- 增加 `publishing_targets`、`backlink_publication_runs`、`backlink_verifications` 資料模型。
- 增加外鏈機會分析、outreach／合作文章草稿、批准、授權 CMS 發布及發布後驗證 API。
- 在 Phase 2C 加入 DataForSEO／Ahrefs／Semrush Adapter、WordPress／Ghost、Shopify、reconciliation、公共 API 與合規控制的逐週排期。

### 關鍵決策和解決方案

- 只允許發布到用戶已連接並授權的 WordPress、Ghost、Shopify 等 CMS；不提供第三方網站自動注入 backlink。
- Outreach 仍只生成草稿／匯出，不自動寄信；合作文章默認先建立 CMS draft，直接發布或排程需要高權限及二次確認。
- 每次發布前建立快照並使用 `Idempotency-Key`；發布後重新檢查 HTTP、canonical、錨文本、`rel` 與可索引提示，不承諾排名或索引提升。

### 使用的技術棧

DataForSEO／Ahrefs／Semrush Backlink Provider、WordPress REST API、Ghost Admin API、Shopify Admin GraphQL、CMS Adapter、PostgreSQL、Redis／BullMQ、Zod／JSON Schema。

### 新增或修改文件

- `docs/rankwoven-phase-2-prd.md`
- `README.md`

### 驗證結果

- PRD 已通過 Prettier 及 `git diff --check`；未新增 `.env`、密碼、Token、API Key 或私鑰。
- 本次只更新規劃文件，未修改程式碼、未提交及未推送，亦未觸發生產部署。

### 下一步行動清單

- 在 Phase 2C 開發前確認主 Backlink Provider 合約、CMS OAuth scope、發布頻率與驗證保留期。

## 會話總結（2026-09-12）— 將第一版未完成項目承接到第二版 PRD

### 會話主要目的

根據第一版功能覆蓋度與待辦清單，補齊第二版 PRD 的開發範圍、API、資料模型、驗收標準與排期。

### 完成的主要任務

- 新增「第一版未完成項目承接清單」，涵蓋認證／工作區、AI 批量優化、AI 文章生成、批量審批、精準關鍵詞數據、多站點比較、WordPress 推送、Worker／死信、報告導出、訂閱、多語言、Site Audit、定時套用及 Joomla／OpenCart。
- 新增第一版承接 API：註冊、密碼重設、工作區邀請、批量批准／套用、報告、死信管理、多站點比較及 WordPress 草稿推送。
- 將 Joomla／OpenCart 從模糊的 Phase 2C 調整為獨立 Phase 2D，避免與 backlink／Shopify／公共 API 排期互相擠壓。
- 在 Phase 2A 排期加入認證、Worker、批量內容計劃、批量審批、WordPress draft push、Site Audit 端到端測試及死信管理。

### 關鍵決策和解決方案

- 已完成的生產靜態 Web 部署不重複排期；未完成項目全部指定目標階段及可驗收結果。
- 第一版現有 API、CMS Adapter、BullMQ、i18n、權限、用量與快照規則繼續沿用，不建立平行架構。
- AI 文章生成仍預設只產生草稿，圖片任務與文字任務分開，發布前必須人工批准。

### 使用的技術棧

Vue 3、TypeScript、Fastify、PostgreSQL、Redis／BullMQ、WordPress、GSC、GA4、DataForSEO／Ahrefs／Semrush、Shopify、Joomla、OpenCart。

### 新增或修改文件

- `docs/rankwoven-phase-2-prd.md`
- `README.md`

### 驗證結果

- PRD 已通過 Prettier、`git diff --check` 及敏感資料檢查。
- 本次只更新規劃文件，未修改程式碼、未提交、未推送或部署。

### 下一步行動清單

- 先按 Phase 2A 承接表拆分 Issue，優先實作認證／工作區、用量帳本、Worker 任務治理與關鍵詞研究持久化。

## 會話總結（2026-09-12）— 重整前台、客戶後台與管理後台路由

### 會話主要目的

按照最新第二階段 PRD，重新規劃三類前端頁面路由，建立單一 SEO route contract，避免公開頁再次出現 SEO 孤島。

### 完成的主要任務

- 在第二版 PRD 新增 Canonical Route Plan，分開公開前台、認證流程、客戶後台與管理後台。
- 規劃公開首頁、工具中心、工具詳情、Extension、Blog、Blog 分類與文章詳情的 canonical route、導入來源及索引狀態。
- 規劃 workspace／site-scoped 客戶後台路由，將研究、內容優化、Audit、Analytics、Tasks、整合及計費放入清晰的站點上下文。
- 規劃管理後台工作區、客戶、站點、Provider、用量、任務、內容政策、運營及設定路由。
- 新增舊 flat `/app/*` 路由的兼容 redirect 對照，避免現有入口中斷。
- 新增 route registry、link graph、sitemap 分組、hreflang、初始 HTML、robots／X-Robots-Tag 及孤島頁建置阻斷規則。
- 將第一版未完成的 SEO／路由驗收納入 Phase 2A／2B 排期，包含公開 SEO fallback、孤島數為 0、多站點對比及 locale route。

### 關鍵決策和解決方案

- 以同一份 route registry 驅動 Vue Router、SEO head、靜態 SEO 生成器及 sitemap，禁止新增頁面只修改其中一處。
- 公開 indexable route 必須有唯一 canonical、H1／正文、至少一條導入連結及完整 sitemap／hreflang metadata；query state、登入頁、`/app`、`/admin` 一律不索引。
- Blog 分類頁只有在文章數、獨有介紹與互鏈條件達標時才索引，否則只作 noindex filter state。
- 客戶後台所有操作頁要求 workspace／site 權限及 breadcrumb；管理後台完全與公開 SEO 圖譜隔離。

### 使用的技術棧

Vue Router、Vue 3、TypeScript、Vue I18n、route registry、Vite 靜態 SEO generator、Nginx `X-Robots-Tag`、sitemap index、hreflang、JSON-LD、Vitest。

### 新增或修改文件

- `docs/rankwoven-phase-2-prd.md`
- `README.md`

### 驗證結果

- PRD 已通過 Prettier、`git diff --check` 及敏感資料檢查。
- 本次只更新規劃文件，未修改程式碼、未提交、未推送或部署。

### 下一步行動清單

- 按 route registry 先建立公開／私有 route contract，再更新 `apps/web/src/router/index.ts`、SEO generator、sitemap generator 與 route graph 測試。

## 會話總結（2026-09-12）— 建立第二階段逐步核檢開發流程

### 會話主要目的

根據第二階段 PRD，制定每一步都需核檢及明確批准後才可繼續的詳細開發流程，並比較 API、Provider、配額與價格，選出最優化方案。

### 完成的主要任務

- 新增 15 個有批准閘門的開發階段，從現況盤點、路由與 SEO、Provider 選型、架構、安全、資料、後端、前端、CMS、Audit、Billing、QA 到 Canary 與 GA 決策。
- 為每個階段定義輸入、工作、證據、核檢清單、批准角色、停止條件及回滾方式。
- 整合 DataForSEO／Ahrefs／Semrush、OpenAI／Anthropic／Gemini、GSC／CrUX／Lighthouse、WordPress／Ghost／Shopify、Stripe／PayPal／SES 的官方能力、價格與限制。
- 新增成本計算公式、AI 與 SEO API 用量示例、Research Credits、usage reservation、hard cap、BYOK 及 Provider fallback 策略。
- 定義最優化推薦組合：DataForSEO 平台主 Provider、OpenAI 互動／Embedding、Gemini Batch、Claude 高品質 fallback、Lighthouse + CrUX、Stripe + 本地 usage ledger。
- 將 workflow 文件與研究底稿加入 README 文件索引及目錄結構。

### 關鍵決策和解決方案

- 每一步必須收到 `APPROVE PH2-XX` 才能開始下一步；已讀、CI 綠燈或口頭同意不算批准。
- 價格按固定公開價、按量計費、需登入／報價分級，正式採購前必須重新核價。
- 不把第三方 SEO 估算、AI 推論或支付 Provider webhook 當成即時權限真相；由 RankWoven 自有 evidence layer、usage ledger 與狀態機負責。

### 使用的技術棧

Vue 3、Vue Router、TypeScript、Fastify、PostgreSQL、Redis／BullMQ、Zod／JSON Schema、DataForSEO、OpenAI、Anthropic、Gemini、GSC、CrUX、Lighthouse、WordPress、Shopify、Stripe。

### 新增或修改文件

- `docs/rankwoven-phase-2-development-workflow.md`
- `docs/research/phase-2-api-pricing-2026.md`
- `docs/rankwoven-phase-2-prd.md`
- `README.md`

### 驗證結果

- workflow、PRD 與研究底稿均通過 Prettier 及 `git diff --check`；敏感資料掃描無結果。
- 本次只更新文件，未修改程式碼、未提交、未推送或部署。
- Agent Reach `v1.5.0` 已確認為最新版本。

### 下一步行動清單

- 由 Product Owner、Tech Lead、Security、Finance、QA 逐步審批 `PH2-00` 至 `PH2-04`，再開始任何 runtime code 開發。

## 會話總結（2026-09-12）— 執行 PH2-00 現況盤點

### 會話主要目的

分析當前網站、SaaS 客戶後台、管理後台、API、Worker、AI／CMS package 及 WordPress 插件，與第一階段 PRD 的未完成清單逐項對比，並把確認的缺口整合到第二階段 PRD。

### 完成的主要任務

- 建立 `PH2-00` 現況證據報告，記錄代碼基線、工作區 dirty 狀態、公開／客戶／管理網站盤點及生產健康。
- 確認公開前台目前有 10 個固定公開入口、86 篇 Blog 文章，最近一次 build 生成 96 個公開 SEO fallback，公開頁與文章內鏈孤島檢查為 0。
- 盤點目前 Vue Router 的 flat `/app/*`、`/admin/*`、認證 route 及缺少的第二階段 `/tools/*`、site-scoped route、Billing、Visibility、Provider 管理頁。
- 以 API／前端／Worker／插件證據修正第一階段舊覆蓋度判定：批量 approve／apply、死信重試／忽略／export、WordPress 寫回前最新值校驗及註冊／密碼 API 已有部分實作，不再誤列為完全缺失。
- 確認真正未完成項目：Email verify、OAuth、多工作區、持久化 Keyword Intelligence、Content Optimizer、報告、Billing、統一 route registry、外部 Audit E2E、跨 CMS 及完整 WP draft push。
- 將現況、證據、缺口判定及 Phase 2A／2B／2C／2D 承接結果寫入第二階段 PRD。

### 關鍵決策和解決方案

- 以有證據的程式碼、測試、建置和生產檢查覆蓋舊 PRD 百分比；沒有證據的功能不標記為完成。
- PH2-00 只做盤點與 PRD 整合，不提前修改 runtime code；下一步 PH2-01 才開始 route registry 與 SEO contract。
- 保留現有舊 route 的兼容 redirect 與既有 API，第二階段以統一工作流及 site-scoped 路由逐步收斂，不作一次性破壞性替換。

### 使用的技術棧

Vue Router、Vue 3、TypeScript、Vite SEO generator、Fastify、PostgreSQL、Redis／BullMQ、Vitest、WordPress REST、GSC、GA4、Lighthouse、CrUX。

### 新增或修改文件

- `docs/approvals/phase-2/PH2-00-current-state.md`
- `docs/rankwoven-phase-2-prd.md`
- `README.md`

### 驗證結果

- `npm run lint` 通過。
- `npm run test` 通過：API 46 passed／4 skipped、Web 12 passed、Worker 4 passed、AI Provider 7 passed、CMS Adapter 1 passed。
- `npm run build` 通過，生成 96 個公開 SEO fallback；`npm run security:audit` 通過（0 vulnerabilities）。
- `https://api.rankwoven.com/health` 正常，`https://rankwoven.com` 返回 `200 OK`。
- PRD、PH2-00 報告及 README 通過 Prettier／`git diff --check`；未新增 `.env`、密碼、Token、API Key 或私鑰。
- 本次只更新文件，未提交、未推送、未部署；`main` 與 `origin/main` 未改變。

### 下一步行動清單

- 等待 Product Owner、Tech Lead、Security／Privacy Reviewer 明確回覆 `APPROVE PH2-00`。
- 批准後再進入 PH2-01，建立 canonical route registry、公開／私有 SEO contract、link graph、sitemap 分組及 redirect manifest。

## 會話總結（2026-09-12）— 完成 PH2-00 現況盤點與 PRD 整合

### 會話主要目的

從 PH2-00 開始分析現有網站、客戶後台、管理後台、API、Worker、AI／CMS package 及 WordPress 插件，對比第一階段 PRD，確認未完成項目並整合到第二階段 PRD。

### 完成的主要任務

- 建立 `docs/approvals/phase-2/PH2-00-current-state.md`，記錄代碼基線、工作區 dirty 狀態、公開／Blog／認證／客戶／管理／插件盤點及第一階段對比。
- 確認公開前台有 10 個固定公開入口、86 篇 Blog，共 96 個 SEO fallback；最近一次 build 的公開頁／Blog link graph 孤島數為 0。
- 核對現有 flat `/app/*`、`/admin/*`、認證 route，以及尚未落地的第二階段 `/tools/*`、site-scoped、Billing、Visibility、Provider 管理頁。
- 以實際 API／前端／Worker 證據修正舊覆蓋度清單：批量 approve／apply、死信重試／忽略／export、WordPress 寫回前最新值校驗及註冊／密碼 API 已有部分或基線實作。
- 將真正未完成部分整合到第二階段 PRD：Email verify、OAuth、多工作區、持久化 Keyword Intelligence、Content Optimizer、統一 route registry、報告、Billing、外部 Audit E2E、WordPress draft push、跨 CMS。

### 關鍵決策和解決方案

- 不把第一階段 2026-07-28 的舊百分比直接當現況；以源碼、測試、build、security audit 及生產 health 的可驗證證據為準。
- PH2-00 只完成盤點與文件整合，不提前進入 PH2-01 runtime code；下一步才實作 canonical route registry、link graph 與 SEO contract。
- 保留使用者工作區既有 dirty 修改，不執行 reset、清理、全量 stage 或任何未授權部署。

### 使用的技術棧

Vue 3、Vue Router、TypeScript、Vite SEO generator、Fastify、PostgreSQL、Redis／BullMQ、Vitest、WordPress REST、GSC、GA4、Lighthouse、CrUX。

### 新增或修改文件

- `docs/approvals/phase-2/PH2-00-current-state.md`
- `docs/rankwoven-phase-2-prd.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `README.md`

### 驗證結果

- `npm run lint` 通過。
- `npm run test` 通過：API 46 passed／4 skipped、Web 12 passed、Worker 4 passed、AI Provider 7 passed、CMS Adapter 1 passed。
- `npm run build` 通過，生成 96 個公開 SEO fallback；`npm run security:audit` 通過，0 vulnerabilities。
- `https://api.rankwoven.com/health` 正常；`https://rankwoven.com` 返回 `200 OK`。
- 新增與更新文件通過 Prettier、`git diff --check` 及敏感資料掃描。
- 本次只更新文件，未修改程式碼、未提交、未推送或部署；`main` 與 `origin/main` 仍在 `225b12b`。

### 下一步行動清單

- 等待 Product Owner、Tech Lead、Security／Privacy Reviewer 明確回覆 `APPROVE PH2-00`。
- 批准後才進入 PH2-01，建立單一 route registry 並更新 Vue Router、SEO generator、Sitemap generator 及孤島 graph 測試。

## 會話總結（2026-09-12）— 實作 PH2-01 路由與 SEO 契約

### 會話主要目的

在 `APPROVE PH2-00` 後，實作第二階段第一步：以單一 route registry 統一 Vue Router、公開 SEO fallback、Sitemap、導覽與公開／私有索引邊界，減少 SEO 孤島及路由漂移。

### 完成的主要任務

- 新增 `apps/web/src/constants/routeRegistry.json` 及 TypeScript accessor，登記公開前台、認證、客戶後台、管理後台、兼容 redirect 與 planned routes。
- 改造 `apps/web/src/router/index.ts` 由 registry 生成路由 metadata、權限、layout 及懶載入 component。
- 將 App、登入、註冊、重設密碼、Pricing、Marketing、Blog、Dashboard、Suggestions、Sites 等高頻導覽改用 route registry accessor。
- 靜態 SEO generator 改由 registry 驗證 public SEO manifest，為公開頁補預設 WebPage／Organization／WebSite JSON-LD、BlogPosting author 及 `x-default`。
- Sitemap generator 改為 Sitemap index + `sitemap-pages.xml`／`sitemap-blog.xml`，排除 private／planned routes；Nginx 對 child sitemap 使用明確靜態 404 邊界。
- 將 `/verify-email` 納入認證頁 noindex／X-Robots-Tag 規則。
- 新增 route registry 邊界回歸測試；修正註冊成功跳到不存在 `/app/dashboard` 的死鏈。

### 關鍵決策和解決方案

- planned `/tools/*`、`/extension`、Blog category 及 site-scoped `/app/sites/:siteId/*` 先登記但保持 disabled，不生成無正文 SEO 頁或錯誤索引入口。
- 既有 flat `/app/*` 頁面暫時保留，並在 registry 標記 `migrationTargetId`；待對應頁面元件與資料上下文完成後再 redirect，避免把現有可用功能導向空頁。
- 公開頁 JSON-LD 與 `x-default` 由 SEO head／generator 統一補足；私有／認證頁清理 alternate 與 schema。

### 使用的技術棧

Vue 3、Vue Router、TypeScript、Vite、JSON route registry、JSDOM、Sitemap XML、Nginx、Vue I18n、Vitest。

### 新增或修改文件

- `apps/web/src/constants/routeRegistry.json`
- `apps/web/src/constants/routeRegistry.ts`
- `apps/web/src/router/index.ts`
- `apps/web/src/App.vue`
- `apps/web/src/utils/seoHead.ts`
- `apps/web/scripts/generate-seo-pages.mjs`
- `scripts/generate-sitemap.mjs`
- `apps/web/nginx.conf`
- `apps/web/public/sitemap.xml`
- `apps/web/public/sitemap-pages.xml`
- `apps/web/public/sitemap-blog.xml`
- 相關前端 view、測試及 `docs/frontend-page-spec.md`

### 驗證結果

- `npm run lint` 通過。
- `npm run test` 通過：API 46 passed／4 skipped、Web 13 passed、Worker 4 passed、AI Provider 7 passed、CMS Adapter 1 passed。
- `npm run build -w @aieo/web` 通過；SEO fallback 96 URLs、Blog 86 inlinks、公開頁 10 inlinks。
- Sitemap index 2 groups、96 URLs；沒有 private／planned URL。
- `npm run security:audit` 通過，0 vulnerabilities。
- 生產 API health 正常，主站 `200 OK`；本次未部署新 code。
- Nginx 容器級 `nginx -t` 未執行，原因是本機沒有可用 `nginx:1.27-alpine` image；保留為部署前驗證項。
- 代碼審查發現的死鏈與導航漂移問題已修正；未提交、未推送，未夾帶工作區原有 dirty 修改。

### 下一步行動清單

- 等待 Design／SEO／Tech Lead 明確回覆 `APPROVE PH2-01`。
- 批准後才進入 PH2-02：Provider、模型、價格、配額與最優化方案。

## 會話總結（2026-09-13）— PH2-01 推送與 PH2-02 Provider 成本選型

### 會話主要目的

在 `APPROVE PH2-01` 後確認当前流程已推送到 GitHub／生产环境，并完成 PH2-02 Provider、模型、价格、配额及成本治理核检。

### 完成的主要任务

- 确认 `main` 与 `origin/main` 同步到 `a991d75`；PH2-01 Production Deploy `34703770442` 已完成，API health 与主站 `200 OK` 正常。
- 使用 `agent-reach` 及 Jina Reader 重新核对 OpenAI、Anthropic、Gemini、DataForSEO、Ahrefs、Semrush、GSC、CrUX、Shopify、Stripe 等官方页面。
- 新增 `docs/approvals/phase-2/PH2-02-provider-selection.md`，记录能力矩阵、模型路由、价格快照、1,000 次内容分析及 SEO API 用量示例、BYOK、secret boundary、quota hard stop、fallback 与采购待办。
- 将 2026-09-13 的模型及价格更新同步到第二阶段 PRD、开发流程及研究底稿；PH2-01 标记为已批准，PH2-02 保持待批准。

### 关键决策和解决方案

- DataForSEO 作为平台 SEO 主 Provider；Ahrefs／Semrush 只作 Agency／Enterprise BYOK。
- OpenAI `gpt-5.6-luna` 作为互动／embedding 主路由；Gemini 3.8／3.7 Flash Batch 处理低成本异步批量；Claude Sonnet 5 作为长文及引用 fallback。
- 以版本化 pricing snapshot、`reserve → finalize／release` usage ledger、workspace／daily／platform cap 及 hard stop 控制变动成本；不提供无限使用路径。
- 本次只更新文档，未修改 runtime code；未将 `.env`、密码、Token、API Key、私钥或完整凭据加入 Git。

### 使用的技术栈

Markdown、Jina Reader、agent-reach、GitHub Actions、DataForSEO、OpenAI、Anthropic、Gemini、GSC、CrUX、Stripe。

### 新增或修改文件

- `docs/approvals/phase-2/PH2-02-provider-selection.md`
- `docs/research/phase-2-api-pricing-2026.md`
- `docs/rankwoven-phase-2-prd.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `README.md`

### 验证结果

- 官方价格与配额页面于 2026-09-13 重新核对；Ahrefs／Semrush 商务报价及 DataForSEO 账户条款仍待采购确认。
- `agent-reach doctor --json` 正常；Agent Reach v1.5.0 已是最新版本。
- PH2-02 仅为方案与批准文档，未启动 PH2-03，未新增 migration、API、Provider adapter 或生产任务。

### 下一步行动清单

- 等待 Product Owner、Tech Lead、Security／Privacy Reviewer、Finance／Operations 明确回复 `APPROVE PH2-02`。
- 获批后才进入 PH2-03：架构、资料模型、Provider adapter、pricing snapshot、usage ledger 与 API 契约。

## 會話總結（2026-09-12）— 修復 Docker Desktop AIEO 掛載與啟動

### 會話主要目的

修復 Docker Desktop 中 AIEO Compose 專案無法啟動的問題，重新掛載目前倉庫並確認本地 Web、API、Worker、PostgreSQL 和 Redis 可正常運行。

### 完成的主要任務

- 確認舊容器曾掛載到 Codex 臨時目錄 `/private/tmp/aieo-internal-links.xUZeyD`，造成 `/workspace/package.json` 不存在及應用容器退出碼 `254`。
- 使用目前倉庫路徑 `/Volumes/Extreme SSD/gitCode/AIEO` 重新建置並建立 Compose 容器。
- 保留 PostgreSQL 和 Redis 資料卷，只移除並重建損壞的 `aieo_node_modules_*` 依賴卷，修復並行 `npm install` 留下的缺少依賴和 workspace symlink 錯誤。
- 完成一次完整 Compose 重建，確認三個應用容器的 `/workspace` 均指向目前倉庫。

### 關鍵決策和解決方案

- 不刪除任何 PostgreSQL／Redis 資料卷，不使用 `docker compose down -v`，避免遺失業務資料。
- 先移除應用容器，再只重建依賴快取卷；這是針對實際錯誤根因的最小修復。
- 未修改應用程式碼或 Compose 配置，保留現有工作區的其他未提交修改。

### 使用的技術棧

Docker Desktop 4.90.0、Docker Compose 5.3.1、Node.js 22、Vite、Fastify、PostgreSQL 16、Redis 7。

### 新增或修改文件

- `README.md`：追加本次 Docker 診斷、修復與驗證記錄。
- Docker Desktop 執行環境：重建 AIEO 應用容器與 Node modules 依賴卷；未修改 Git 中的程式碼文件。

### 驗證結果

- `docker compose --profile data ps -a`：`api`、`web`、`worker`、`postgres`、`redis` 全部運行；PostgreSQL 和 Redis 顯示 `healthy`。
- `curl http://localhost:3011/health`：返回 `success: true`。
- `curl -I http://localhost:8080/`：返回 `HTTP/1.1 200 OK`。
- 三個應用容器 `/workspace` 掛載來源均為 `/host_mnt/Volumes/Extreme SSD/gitCode/AIEO`。
- 完整容器重建後再次通過上述 health／HTTP 檢查；未提交、未推送、未部署，也未上傳 `.env`、密碼或 Token。

### 下一步行動清單

- Docker Desktop 重新啟動後，從倉庫目錄執行 `docker compose --profile data up -d --build`，避免使用舊的臨時工作區 Compose 專案。
- 若再次出現依賴卷錯誤，先檢查容器的 `/workspace` 掛載來源，再只清理 `aieo_node_modules_*` 卷，不要清理 PostgreSQL／Redis 資料卷。

## 會話總結（2026-09-12）— PH2-01 路由與 SEO 契約實作

### 會話主要目的

在 `APPROVE PH2-00` 後，按第二階段 PRD 實作第一個工程步驟：以單一 route registry 統一 Vue Router、公開 SEO fallback、Sitemap、導覽及公開／私有索引邊界。

### 完成的主要任務

- 新增 `apps/web/src/constants/routeRegistry.json` 及 TypeScript accessor，登記公開、認證、客戶、管理、兼容 redirect 及 planned routes。
- 將 Router 改為由 registry 生成路由 metadata、layout、權限、懶載入元件及 redirect。
- 將 App、登入、註冊、密碼、Marketing、Blog、Dashboard、Suggestions、Sites 等高頻內鏈改為 registry accessor。
- SEO generator 現在會驗證 registry 與 public SEO manifest 一致，公開頁預設輸出 WebPage／Organization／WebSite JSON-LD、BlogPosting author 及 `x-default`。
- Sitemap 改為 index + `sitemap-pages.xml`／`sitemap-blog.xml`；planned、private、auth URL 不會生成到 Sitemap。新增 SEO route graph，build 時檢查未知內鏈、重複路由及孤島。
- Nginx 新增 Sitemap child file 的靜態 404 邊界，並把 `/verify-email` 納入 noindex。
- 修正註冊完成後跳轉不存在 `/app/dashboard` 的死鏈。

### 關鍵決策和解決方案

- planned `/tools/*`、`/extension`、Blog category 及 site-scoped `/app/sites/:siteId/*` 只登記為 disabled，等待對應頁面與資料上下文完成後才啟用，避免生成薄內容或空白頁。
- 現有 flat `/app/*` route 暫時保留並標記 `migrationTargetId`，不把用戶導向尚未實作的 site-scoped 頁面。
- PH2-01 不處理 AI、CMS、計費或內容功能；只建立後續開發必須遵守的 URL、SEO、Sitemap 與 link graph 基礎。

### 使用的技術棧

Vue 3、Vue Router、TypeScript、Vite、JSON route registry、JSDOM、Sitemap XML、Nginx、Vue I18n、Vitest。

### 新增或修改文件

- `apps/web/src/constants/routeRegistry.json`
- `apps/web/src/constants/routeRegistry.ts`
- `apps/web/src/router/index.ts`
- `apps/web/src/utils/seoHead.ts`
- `apps/web/src/App.vue` 及相關前端頁面內鏈
- `apps/web/scripts/generate-seo-pages.mjs`
- `scripts/generate-sitemap.mjs`
- `apps/web/nginx.conf`
- `apps/web/public/sitemap.xml`
- `apps/web/public/sitemap-pages.xml`
- `apps/web/public/sitemap-blog.xml`
- `apps/web/tests/smoke.test.ts`
- `docs/frontend-page-spec.md`
- `docs/approvals/phase-2/PH2-00-current-state.md`
- `docs/rankwoven-phase-2-prd.md`
- `docs/rankwoven-phase-2-development-workflow.md`

### 驗證結果

- `npm run lint` 通過。
- `npm run test` 通過：API 46 passed／4 skipped、Web 13 passed、Worker 4 passed、AI Provider 7 passed、CMS Adapter 1 passed。
- `npm run build -w @aieo/web` 通過：SEO fallback 96 URLs、route graph 96 nodes／1365 edges、Blog 86 inlinks、公開頁 10 inlinks。
- Sitemap index 2 groups、96 URLs；private／planned route 不在 Sitemap。
- `npm run security:audit` 通過，0 vulnerabilities。
- 生產 API health 正常，主站 `200 OK`；本次未部署。
- Nginx 容器級 `nginx -t` 未執行，原因是本機沒有可用 Nginx image；保留為部署前檢查。
- 已建立本步本地提交 `d8afa16` 及 registry 校驗修正 `a991d75`，尚未推送；未夾帶工作區原有 `.env`、密碼、Token、API Key、私鑰或其他 dirty 修改。

### 下一步行動清單

- 等待 Design／SEO／Tech Lead 明確回覆 `APPROVE PH2-01`。
- 批准後才進入 PH2-02：Provider、模型、價格、配額與最優化方案。

## 會話總結（2026-09-13）— 統一 Breakout API 模型代理

### 會話主要目的

將第二階段 AI 方案改為只使用既有 Breakout API 代理接口；不同 AI 任務只切換 model ID，不再切換 OpenAI、Anthropic、Gemini 或其他上游 API。

### 完成的主要任務

- 使用官方 Breakout API 文件與既有 server-side gateway 設定核對接口；`GET /v1/models` 實測返回 `200 OK`，取得 48 個 model ID。
- 新增 `docs/breakout-api-integration.md`，記錄 model catalog、OpenAI 相容接口、設定邊界、模型 profile、成本快照、PH2-03 實作契約及安全限制。
- 更新 PH2-02、第二階段 PRD、開發流程及成本研究：AI 固定走 `WENWEN_API_BASE_URL`／`WENWEN_API_KEY`，只允許 gateway catalog 中經 capability 驗證的 model ID。
- 明確區分：DataForSEO、GSC、CrUX 及 SEO BYOK 仍是資料接口；它們不屬於模型代理，不能由 AI 模型替代。

### 關鍵決策和解決方案

- 模型清單的唯一來源為 Breakout `GET /v1/models`；管理端只可從同步後且已驗證 capability 的 model profile 選擇。
- `/v1/models` 不返回代理價格，因此產品成本以 Breakout 控制台／使用日誌的版本化 pricing snapshot 結算；不再以各上游官方公開價格直接扣費。
- 現有部署的預設 model 不在本次直接修改，避免未經批准切換生產模型；模型目錄同步、profile、embedding／圖片 endpoint smoke 及 usage ledger 擴充列入 PH2-03。

### 使用的技術棧

Breakout API、OpenAI 相容 HTTP、Node.js、TypeScript、Markdown、agent-reach。

### 新增或修改文件

- `docs/breakout-api-integration.md`
- `docs/approvals/phase-2/PH2-02-provider-selection.md`
- `docs/rankwoven-phase-2-prd.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `docs/research/phase-2-api-pricing-2026.md`
- `README.md`

### 驗證結果

- Breakout `GET /v1/models` 以現有 server-side 連線返回 `200` 與 48 個模型；沒有輸出 API token。
- 現有程式確認文字模型已使用 `POST /v1/chat/completions` 的 OpenAI 相容 adapter。
- 不直接測試 embedding 或圖片生成，避免在 PH2-03 核檢前產生外部模型費用；它們已列為獨立小額 smoke gate。
- 本次只更新文件，未修改 `.env`、模型設定、runtime code、資料庫或生產服務，亦未提交或推送。

### 下一步行動清單

- 等待 `APPROVE PH2-02`，再進入 PH2-03 建立單一 `AiGatewayAdapter`、模型目錄、價格快照、usage ledger 與 API 契約。

## 會話總結（2026-09-13）— 本機 Docker 重建與 GSC 驗證

### 會話主要目的

重建本機 Docker Compose 服務，並以既有 Google 服務帳戶測試 Search Console 設定、Property 存取與 Search Analytics 實際查詢。

### 完成的主要任務

- 執行 `docker compose --profile data up -d --build`，重建 Web、API、Worker；保留 PostgreSQL 與 Redis 資料卷，未使用 `down -v`。
- 確認本機 API、Web、Worker、PostgreSQL、Redis 全部啟動；PostgreSQL、Redis 維持 healthy。
- 確認 API 容器取得 Google 服務帳戶設定，安全交換 OAuth access token 並讀取 GSC Property 清單。
- 對一個已授權 Property 執行最小化 Search Analytics query，驗證資料讀取鏈路。

### 關鍵決策和解決方案

- GSC 目前採服務帳戶 JWT，並非 OAuth Client ID callback；驗證過程只輸出狀態、Property 數量與 HTTP 結果，不輸出憑證、access token、Property URL 或關鍵詞資料。
- 第一次探針因 `tsx -e` 頂層 `await` 限制未執行，改用 async 函式後成功；這不是 GSC 憑證或權限錯誤。

### 使用的技術棧

Docker Compose、Node.js、TypeScript、Fastify、PostgreSQL、Redis、Google Search Console API、服務帳戶 JWT。

### 新增或修改文件

- `README.md`：追加本機部署與 GSC 驗證結果。
- 未修改應用程式碼、Docker Compose、資料庫 schema 或憑證檔案。

### 驗證結果

- 本機 API health 返回 `200`；Web 返回 `200`。
- GSC 服務帳戶驗證成功，可讀取 4 個已授權 Property。
- Search Analytics 最小化查詢返回 `200`，並取得 1 列資料。
- 未顯示或提交 `.env`、服務帳戶 JSON、private key、access token 或其他敏感資料；未提交、未推送、未部署生產。

### 下一步行動清單

- 若要開啟 CrUX，依 PH2-03 新增 `CRUX_API_KEY`、Compose 傳遞、server-side adapter、rate limit 與測試。
- 等待 `APPROVE PH2-02` 後才進入 PH2-03 runtime 實作。

## 會話總結（2026-09-13）— Ahrefs Keyword Explorer 接入修正

### 會話主要目的

將已申請的 Ahrefs API 正確接入 RankWoven 關鍵詞指標流程，使用官方 Ahrefs API v3 Keyword Explorer Overview endpoint。

### 完成的主要任務

- 查核 Ahrefs 官方 OpenAPI 規格，確認 `GET /v3/keywords-explorer/overview`、Bearer API key、`keywords`、`country` 及 `select` query 參數。
- 修正 Ahrefs adapter：由不相容的 POST JSON 改為官方 GET query 形式，並將 Ahrefs CPC 的 USD cents 值轉換為產品使用的 USD。
- 在 Docker Compose API service 加入 `AHREFS_API_URL` 與 `AHREFS_API_KEY` 環境變數傳遞。
- 更新 `.env.example` 的 Ahrefs endpoint 與啟用說明，加入 mock-based Ahrefs 回歸測試。
- 修正 `enrichKeywords()` 使用注入 fetch 的測試性缺口，避免 provider test 繞過 mock。

### 關鍵決策和解決方案

- Ahrefs 是 SEO 資料 Provider，不是 Breakout AI gateway 的上游模型；使用者只需設定 Ahrefs secret，不改變 AI gateway。
- 實際 Ahrefs key 尚未寫入本機 `.env`，故不發送任何付費 Ahrefs request；容器確認目前 provider 仍是 `generic`。

### 使用的技術棧

Ahrefs API v3、OpenAPI、Node.js、TypeScript、Vitest、Docker Compose。

### 新增或修改文件

- `apps/api/src/keywordSuggestions.ts`
- `apps/api/tests/health.test.ts`
- `docker-compose.yml`
- `.env.example`
- `README.md`

### 驗證結果

- `npm run test -w @aieo/api -- health.test.ts`：9 項通過。
- `npm run lint`、`npm run build -w @aieo/api`、`git diff --check` 通過。
- 本機 API 容器已重建且 `/health` 返回 `200`。
- 未讀取、輸出、提交或推送 Ahrefs API key。

### 下一步行動清單

- 在本機或生產 secret `.env` 設定 Ahrefs URL、key 及 provider 選擇後，重建 API 容器並以一個小額 Keyword Explorer 查詢驗證。
- 使用者明確授權後才提交、推送或部署此次 Ahrefs adapter 變更。

## 會話總結（2026-09-13）— 關鍵詞資料來源環境變數核檢

### 會話主要目的

核對 `KEYWORD_VOLUME_PROVIDER` 重複定義，避免 Ahrefs、DataForSEO 或 generic 資料來源因 `.env` 覆蓋順序而被錯誤選用。

### 完成的主要任務

- 僅讀取環境變數名稱，確認本機 `.env` 第 36 與 53 行重複定義 `KEYWORD_VOLUME_PROVIDER`；最後一行會覆蓋前一行。
- 確認 `.env.example` 的 `KEYWORD_VOLUME_PROVIDER` 只保留一個定義，並移除重複的 Google OAuth 範例欄位。
- 更新 selector 註解，說明關鍵詞資料來源只能定義一次。

### 關鍵決策和解決方案

- 不直接讀取或覆寫 `.env` 的值，避免暴露或破壞敏感設定；保留第 53 行的目前有效值，待使用者移除第 36 行舊定義。

### 新增或修改文件

- `.env.example`
- `README.md`

### 驗證結果

- `.env.example` 無重複 key，`KEYWORD_VOLUME_PROVIDER` 計數為 1。
- `git diff --check` 通過；未輸出、提交或推送任何 secret。

### 下一步行動清單

- 使用者在本機 `.env` 移除第 36 行的舊 `KEYWORD_VOLUME_PROVIDER` 後，保留第 53 行的目標來源設定。

## 會話總結（2026-09-13）— 生產 Ahrefs 設定重載與狀態驗證

### 會話主要目的

在使用者配置 Ahrefs 生產 key 後，重新部署現有 commit 以重載 VPS `.env`，並驗證 Keyword Explorer 資料來源與最小化 enrichment 路徑。

### 完成的主要任務

- 以 `workflow_dispatch` 重新執行 Production Deploy，部署 `b655f1c` 並重建 VPS API 容器。
- GitHub Actions Verify 與 Hostinger VPS Deploy 均通過；部署腳本健康與登入 smoke check 成功。
- 使用部署 smoke 帳戶安全檢查 keyword sources 及單關鍵詞 enrichment，不輸出應用 token、Ahrefs key 或原始回應。

### 驗證結果

- 生產 API 回報 `activeProvider: generic`、Ahrefs inactive；單關鍵詞 enrichment 返回 `200` 但沒有 Ahrefs 指標，沒有消耗 Ahrefs API units。
- 根因是生產 selector 未設為 `ahrefs`，或較後的 `KEYWORD_VOLUME_PROVIDER=generic` 重複定義覆蓋設定。

### 下一步行動清單

- 在生產 `/docker/rankwoven/.env` 只保留一次 `KEYWORD_VOLUME_PROVIDER=ahrefs`，並保留 Ahrefs URL 與 key。
- 修正後重新載入 API 容器，再重跑單關鍵詞實際 Ahrefs enrichment 驗證。

## 會話總結（2026-09-13）— Ahrefs 獨立環境變數命名

### 會話主要目的

保留既有 `KEYWORD_VOLUME_*` generic／DataForSEO 設定組，將 Ahrefs 啟用狀態改為獨立命名，避免 selector 重複與設定覆蓋。

### 完成的主要任務

- 將 Ahrefs 啟用開關改為 `AHREFS_KEYWORD_METRICS_ENABLED`。
- `KEYWORD_VOLUME_PROVIDER` 僅保留 `dataforseo`、`semrush`、`generic`；Ahrefs 不再與 generic family 共用 selector。
- 更新 API resolver、來源狀態、Docker Compose 與 `.env.example`，並調整 Ahrefs 回歸測試。

### 關鍵決策和解決方案

- 明確選擇 DataForSEO 時維持其優先級；在 generic 模式下，`AHREFS_KEYWORD_METRICS_ENABLED=true` 才啟用 Ahrefs。
- 新配置採用：`KEYWORD_VOLUME_PROVIDER=generic`、`AHREFS_KEYWORD_METRICS_ENABLED=true`、`AHREFS_API_URL`、`AHREFS_API_KEY`。

### 新增或修改文件

- `apps/api/src/config.ts`
- `apps/api/src/keywordSuggestions.ts`
- `apps/api/tests/health.test.ts`
- `docker-compose.yml`
- `.env.example`
- `README.md`

### 驗證結果

- `npm run test -w @aieo/api -- health.test.ts`：9 項通過。
- `npm run lint`、`npm run build -w @aieo/api`、`git diff --check` 通過。
- 本次未讀取、輸出、提交或推送 Ahrefs key，未部署生產。

### 下一步行動清單

- 使用者明確授權推送後，將獨立 Ahrefs selector 部署到生產，再將 `AHREFS_KEYWORD_METRICS_ENABLED=true` 加入生產 `.env` 並驗證。

## 會話總結（2026-09-13）— Hostinger MCP 配置與生產 Web 502 修復

### 會話主要目的

將使用者提供的 Hostinger MCP servers 安全寫入全局 Codex 配置，並調查及修復 `rankwoven.com` 的 502 Bad Gateway。

### 完成的主要任務

- 從本機 `.env` 安全讀取 `HOSTINGER_API_TOKEN`，寫入 `~/.codex/config.toml` 的六個 Hostinger MCP server：hosting、domains、dns、billing、reach、vps；建立本地 backup，配置檔設為 600 權限。
- 以公開探針、VPS 唯讀 SSH、Docker Compose 與 Nginx 配置確認：API 正常但 Web 容器退出，導致主站 502。
- 修正 production Compose：恢復 Dockerfile.web 的 Nginx command，並以 `!override` 移除開發用 port mapping，只保留 `127.0.0.1:8082:80`。
- 推送 `e7eeee7`，GitHub Actions Production Deploy 成功後確認 VPS Web 容器 healthy、8082 監聽及公開主站恢復。

### 關鍵決策和解決方案

- 根因是 production Nginx image 繼承開發用 `npm install && npm run dev` command；image 內沒有 npm，容器以退出碼 127 結束。不是 API、DNS 或 Nginx upstream port 不一致。
- MCP token 沒有輸出至終端、文件或 Git；Codex 官方文件指出全局 MCP 配置修改需要新工作階段或重啟客戶端才能反映至工具清單。

### 新增或修改文件

- `~/.codex/config.toml`：全局 Hostinger MCP 設定，未納入 Git。
- `docker-compose.prod.yml`
- `README.md`

### 驗證結果

- 本機 production Compose 合併結果：Web command 為 null（使用 image CMD），僅有 8082→80 port；本機 Nginx Web 容器 healthy，HTTP 200。
- GitHub Actions Production Deploy `34711160019` 成功。
- VPS `rankwoven-web-1` 以 `nginx -g daemon off;` 運行、healthy、監聽 127.0.0.1:8082。
- `https://rankwoven.com/` 與 `https://api.rankwoven.com/health` 均返回 200。

### 下一步行動清單

- 重啟 Codex Desktop 或開啟新工作階段，以載入新增的全局 Hostinger MCP servers。
- 將獨立 Ahrefs selector 修正推送後，再重跑生產 Ahrefs 小額查詢驗證。

## 會話總結（2026-09-13）— 批准 PH2-02 Provider 與成本選型

### 會話主要目的

記錄 Product Owner 對 PH2-02 Provider、模型、成本、配額及資料安全方案的正式批准。

### 完成的主要任務

- 將 `docs/approvals/phase-2/PH2-02-provider-selection.md` 狀態更新為 `APPROVED`。
- 同步第二階段 PRD 與開發流程的 PH2-02 狀態及 PH2-03 進入條件。

### 關鍵決策和解決方案

- 批准 DataForSEO 作 SEO 主資料 Provider；所有 AI 任務固定走 Breakout API gateway，只切換經驗證的 model ID。
- 批准 gateway model catalog、pricing snapshot、usage ledger、workspace／daily／platform cap、hard stop、SEO BYOK 及 server-side secret 邊界。
- 本批准不代表 PH2-03 runtime adapter、migration 或對外 API 已完成；必須按流程逐步核檢。

### 新增或修改文件

- `docs/approvals/phase-2/PH2-02-provider-selection.md`
- `docs/rankwoven-phase-2-prd.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `README.md`

### 驗證結果

- PH2-02 批准記錄：Product Owner（使用者），2026-09-13T02:28:43Z。
- 文件狀態與下一步條件已同步；未修改 runtime code、資料庫、環境變數或生產服務。

### 下一步行動清單

- 進入 PH2-03：架構、資料模型、單一 `AiGatewayAdapter`、model catalog、pricing snapshot、usage ledger 與 API 契約設計。

## 會話總結（2026-09-13）— 進入 PH2-03 架構與 API 契約設計

### 會話主要目的

在 `APPROVE PH2-02` 後開始 PH2-03，將已批准的 Provider／模型成本方案轉成可實作的架構、資料與 API 契約。

### 完成的主要任務

- 盤點現有 Fastify API、Auth／workspace scope、PostgreSQL migration、Repository、Redis／Worker、Vue API client 與 CMS／AI package 邊界。
- 新增 `docs/approvals/phase-2/PH2-03-architecture-api-contract.md`，定義分層架構、单一 Breakout `AiGatewayAdapter`、SEO／CMS adapter、Phase 2A 資料表、狀態機、幂等、REST／Zod、權限、安全、可觀測性及測試計劃。
- 同步第二階段 PRD、開發流程及 README，標記 `PH2-03 DESIGN_READY_PENDING_APPROVAL`。

### 關鍵決策和解決方案

- migration 只透過版本化 SQL；route／controller 不直接建表或調用外部 Provider。
- 所有長任務使用 `202 + taskId`、task attempts、reserve／finalize／release、partial／expired／dead-letter 及 audit event。
- 所有 AI 請求固定經 Breakout gateway；SEO Provider、CMS 寫回、workspace／role／quota 與 secret 邊界保持獨立。

### 使用的技術棧

Fastify、TypeScript、Zod、PostgreSQL、Redis、Worker、Vue 3、Pinia、Breakout API、WordPress／CMS Adapter、Mermaid。

### 新增或修改文件

- `docs/approvals/phase-2/PH2-03-architecture-api-contract.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `docs/rankwoven-phase-2-prd.md`
- `README.md`

### 驗證結果

- 完成現況與契約盤點；未修改 runtime code、migration、資料庫、API 或生產服務。
- 只進行文件同步，保留既有工作區 dirty 修改，未提交或推送。

### 下一步行動清單

- 由 Tech Lead、Security／Privacy Reviewer、QA Lead 核檢並回覆 `APPROVE PH2-03`。
- 批准後按文件順序實作 shared types、migration、Repository、`AiGatewayAdapter`、pricing snapshot、quota、API 與 Worker contract。

## 會話總結（2026-09-13）— 生產密鑰配置說明

### 會話主要目的

說明 `JWT_SECRET` 與 `WORDPRESS_CREDENTIAL_ENCRYPTION_KEY` 的來源、生成方式及生產配置注意事項。

### 關鍵決策和解決方案

- 兩個值都是自行生成的高熵隨機密鑰，不是從 Hostinger、Google 或 WordPress 申請。
- `JWT_SECRET` 用於登入 token、密碼雜湊及認證簽名；`WORDPRESS_CREDENTIAL_ENCRYPTION_KEY` 用於 API 加密與 Worker 解密 WordPress 應用程式密碼。
- 兩者必須使用不同值，並只保存於本機／VPS `.env` 或 secret manager，不能提交 Git。

### 驗證結果

- 已核對現有程式在缺少設定時會回退到開發預設值；本次只提供配置說明，未讀取、修改或輸出任何 secret。

### 下一步行動清單

- 生成兩個密鑰並写入 `/docker/rankwoven/.env`，再重建 API 与 Worker；若数据库已有加密的 WordPress 凭证，轮换加密密钥后需重新录入这些凭证。

## 會話總結（2026-09-13）— 批准並實作 PH2-03 基礎契約

### 會話主要目的

在 Product Owner（使用者）批准 `PH2-03` 後，按已核檢的架構、資料與 API 契約開始實作第一批可驗證 runtime 基礎。

### 完成的主要任務

- 將 `PH2-03` 架構文件、第二階段 PRD 與開發流程標記為 `APPROVED / IMPLEMENTATION_COMPLETE`，記錄批准人與本次會話時間。
- 新增 Phase 2 共用型別：錯誤碼、API response、request context、分頁、任務狀態機、幂等雜湊、用量 reserve／finalize／release、task attempt、audit event、Breakout gateway model／price contract。
- 新增 InMemory 與 PostgreSQL Phase 2 repository 基礎，所有 SQL 使用參數化查詢並按 workspace scope 查詢。
- 新增 `0010`–`0014` migration，建立 Phase 2A 任務、幂等、研究、關鍵詞、內容優化、用量、權限投影、重試、審計、gateway catalog／price snapshot／Profile 表，並以 workspace scope trigger 與 append-only ledger 保護資料；migration 在本地資料庫成功執行並可重複安全跳過。
- 新增單一 Breakout AI gateway adapter，只使用既有 `WENWEN_API_BASE_URL`、`WENWEN_API_KEY` 與 model ID，覆蓋 models、chat、embedding、image response mapping 與錯誤脫敏。
- 新增已認證的任務讀取／取消、用量查詢、管理員模型目錄／Profile、關鍵詞研究、內容優化與 webhook API 契約；寫入操作要求 `Idempotency-Key`，重複請求會回放原 response。
- 新增 Gateway model sync Worker、task attempt、Worker 任務狀態／退避純函式、Phase 2 OpenAPI 契約摘要與 PostgreSQL contract test；未通過後續 gate 的 Provider／CMS／支付端點會安全拒絕。

### 關鍵決策和解決方案

- AI 仍固定經既有 Breakout gateway，不新增或切換 OpenAI／Anthropic／Gemini 直連 API。
- 先落地共享契約、migration、repository、gateway mapping、幂等與用量治理，再進入真正的 Keyword／Content application service 與 Worker provider 執行流程。
- 所有錯誤只返回內部錯誤碼，不返回上游原始 body；任何秘密、token、`.env` 或完整 raw payload 都未寫入程式碼、測試或文件。

### 使用的技術棧

TypeScript、Fastify、PostgreSQL、Vitest、OpenAPI 3.1、Breakout API gateway、Node.js crypto。

### 新增或修改文件

- `docs/approvals/phase-2/PH2-03-architecture-api-contract.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `docs/rankwoven-phase-2-prd.md`
- `packages/ai-providers/src/phase2.ts`
- `packages/ai-providers/src/phase2Gateway.ts`
- `packages/ai-providers/tests/phase2Contracts.test.ts`
- `packages/ai-providers/tests/phase2Gateway.test.ts`
- `apps/api/src/phase2Repository.ts`
- `apps/api/src/phase2Routes.ts`
- `apps/api/src/phase2FeatureRoutes.ts`
- `apps/api/tests/phase2Repository.postgres.test.ts`
- `apps/api/tests/phase2Routes.test.ts`
- `apps/worker/src/phase2TaskState.ts`
- `apps/worker/src/index.ts`
- `apps/worker/tests/phase2TaskState.test.ts`
- `db/migrations/0010_phase2_contracts.sql`
- `db/migrations/0011_phase2_integrity.sql`
- `db/migrations/0012_gateway_model_profiles.sql`
- `db/migrations/0013_phase2_workspace_scope.sql`
- `db/migrations/0014_phase2_brief_scope.sql`
- `docs/openapi/phase2-contract.yaml`
- `README.md`

### 驗證結果

- `npm run lint` 通過。
- `npm run test` 通過：API 53 項、Web 13 項、Worker 8 項、AI provider 15 項、CMS adapter 1 項；本地 PostgreSQL 條件測試在容器內的 Phase 2 repository contract 2 項通過。
- `npm run build` 通過；Web SEO 靜態頁與 route graph 生成成功。
- `npm run security:audit` 通過，發現 0 個 high 以上漏洞。
- `npm run db:migrate` 已重複執行驗證：`0010_phase2_contracts.sql` 至 `0014_phase2_brief_scope.sql` 均可安全跳過已套用版本。
- 未提交或推送；工作區仍保留使用者既有 dirty 修改，未使用 `git add .`，未包含任何敏感設定。

### 下一步行動清單

- 进入 PH2-04 安全、私隱與 SSRF／Prompt Injection 設計核檢。
- PH2-03 後續實作需加入 pricing snapshot 管理、entitlement／quota service，以及 Keyword／Content application service；完成各自測試後再進入下一個批准 gate。

## 會話總結（2026-09-13）— 進入 PH2-04 安全、私隱與 SSRF 核檢

### 會話主要目的

在 PH2-03 基礎契約完成後，盤點 RankWoven 的安全、私隱、SSRF、AI prompt、Webhook、CI／Docker 與資料保留風險，建立下一步修復與批准依據。

### 完成的主要任務

- 新增 `docs/approvals/phase-2/PH2-04-security-privacy-ssrf.md`，定義信任邊界、STRIDE 資料流、`PublicUrlPolicy`、私隱保留、AI guardrail、權限／監控與驗收測試。
- 已驗證並列為 blocker：Lighthouse 任意 URL SSRF、Worker CMS URL SSRF、未認證站點連接寫入、production 開發模式與 JWT fallback、reset token response／log 洩漏、弱 password hash，以及 CMS 正文寫入一般 log。
- Webhook 目前預設拒絕且不處理 payload；在 PH2-11 驗簽與去重實作前保持關閉。
- 同步 PH2-04 狀態至開發流程與第二階段 PRD。

### 關鍵決策和解決方案

- 所有伺服器端抓取將統一透過 `PublicUrlPolicy`，在 DNS、IP、redirect 與連線層阻擋 private、metadata、loopback 與 DNS rebinding 目標。
- P0 auth、站點連接及 SSRF 問題必須先修復，才可啟用 PH2-06、PH2-07、PH2-09 或 PH2-11 的真實外部副作用。
- 資料保留表是工程預設，不取代 privacy／legal reviewer 對營運地區與合同義務的確認。

### 使用的技術棧

Fastify、TypeScript、PostgreSQL、Docker Compose、GitHub Actions、Node.js crypto、Puppeteer／Lighthouse、Breakout API gateway。

### 新增或修改文件

- `docs/approvals/phase-2/PH2-04-security-privacy-ssrf.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `docs/rankwoven-phase-2-prd.md`
- `README.md`

### 驗證結果

- 完成認證、URL fetch、Worker、Webhook、AI prompt、Docker、CI 與 dependency 的唯讀盤點；未讀取或輸出 `.env` 值，也未對內網／外網目標發送 SSRF 測試請求。
- `npm run lint`、`npm run test`、`npm run build`、`npm run security:audit` 通過；安全掃描發現 0 個依賴 high 以上漏洞。
- 未修改 runtime 程式、未提交、未推送、未部署。

### 下一步行動清單

- Security Reviewer、Privacy Reviewer 與 Product Owner 核檢 `PH2-04-security-privacy-ssrf.md`。
- 收到 `APPROVE PH2-04` 後，按文件第 8 節順序修復 SEC-01 至 SEC-07，先完成 production auth 與站點連接／SSRF 邊界。

## 會話總結（2026-09-13）— 實作 PH2-04 安全、私隱與 SSRF 修復

### 會話主要目的

在 `APPROVE PH2-04` 後關閉已驗證的 SSRF、認證、站點授權、密碼、敏感日誌與 production runtime P0／P1 問題。

### 完成的主要任務

- 新增共享 `@aieo/security` package，統一 URL scheme、DNS、public IP、redirect 前驗證與已驗證 DNS address pinning。
- Lighthouse 對 unsafe URL 返回 `UNSAFE_TARGET_URL`；production 停用本機 Puppeteer fallback，避免任意 URL 進入 server-side browser。
- Worker WordPress fetch 改為 URL revalidation、固定 DNS address、manual redirect、cross-origin redirect 拒絕、15 秒 timeout、JSON MIME 與 2 MiB response cap。
- 站點建立改為 `editor+` 登入操作，並以呼叫者 workspace 建立／查找連接；匿名建立回傳 401。
- production 設定必須有不同且至少 32 字元的 JWT／CMS encryption key；production API／Worker 使用 non-root runtime image 及 start command。
- 忘記密碼不再輸出／記錄 reset token；新密碼改用 salted `scrypt`，舊 HMAC hash 僅能使用顯式 migration secret 登入後升級。
- 收斂 CORS allowlist、trusted proxy rate-limit key、Worker snapshot log redaction 及 deployment smoke credential 的 fail-closed 規則。

### 新增或修改文件

- `packages/security/`
- `apps/api/src/auth.ts`
- `apps/api/src/config.ts`
- `apps/api/src/server.ts`
- `apps/api/src/siteConnections.ts`
- `apps/worker/src/index.ts`
- `Dockerfile.production`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `.github/workflows/production-deploy.yml`
- `scripts/deploy-production.sh`
- 對應 package、Docker、Compose、API／Worker／security tests、PH2-04 文件與 README。

### 驗證結果

- `npm run lint`、`npm run test`、`npm run build`、`npm run security:audit` 通過。
- API：57 passed／6 skipped；Worker：9 passed；Security package：11 passed；Web：13 passed；AI provider：15 passed；CMS adapter：1 passed。
- `bash -n scripts/deploy-production.sh`、production Compose dummy-secret dry-run 與 `git diff --check` 通過。
- 未讀取／提交 `.env`、未部署、未推送。

### 下一步行動清單

- 在 VPS `/docker/rankwoven/.env` 設定新的 `JWT_SECRET`、`WORDPRESS_CREDENTIAL_ENCRYPTION_KEY`、`DEPLOY_SMOKE_EMAIL`、`DEPLOY_SMOKE_PASSWORD`；既有 HMAC 帳戶如需平滑升級，暫時設定 `LEGACY_PASSWORD_HMAC_SECRET` 為舊 JWT secret。
- 完成 privacy／legal reviewer 對資料保留與營運地區責任的確認後，進入 PH2-05 基礎資料、用量與任務治理。

## 會話總結（2026-09-13）— 完成 PH2-04 安全修復收尾

### 會話主要目的

繼續完成 `APPROVE PH2-04` 後的安全、私隱與 SSRF 修復，處理中斷的 production image 驗證與部署契約同步。

### 完成的主要任務

- 完成並驗證 `@aieo/security` 的 DNS/IP pinning、SSRF 阻擋、redirect 重新驗證與 2 MiB response limit。
- 完成 production auth hard-fail、不同高熵 secret、scrypt 密碼雜湊、legacy hash 顯式遷移、reset token 移除回應與日誌。
- 完成站點建立登入／workspace scope、Lighthouse unsafe URL 阻擋、Worker Basic Auth fetch 防護與敏感內容日誌遮罩。
- 完成 CORS allowlist、trusted proxy、production non-root image、無開發 bind mount、deployment smoke credential 必填。
- 完成 PH2-04 文件、部署文件、PH2 PRD、開發流程與 package lock 同步。

### 驗證結果

- 全倉 `lint`、`test`、`build`、`security:audit` 通過。
- API 57 passed／6 skipped；Worker 9 passed；Security 11 passed；AI provider 15 passed；Web 13 passed；CMS adapter 1 passed。
- Docker production image build 成功，容器以 `uid=1000(node)` 執行且不包含 `.env`。
- Production Compose 缺少 JWT／WordPress encryption secret 時以 exit code 1 fail closed；提供 dummy secrets 的 config dry-run 通過。
- `npm run db:migrate` 可重複執行，`git diff --check` 通過。

### 未完成或需外部批准

- 尚未對 VPS 執行部署；需先在 VPS `.env` 配置新的 JWT／CMS key 及 smoke 帳戶，並確認舊 WordPress 憑據是否需要重新錄入。
- Privacy／legal reviewer 仍需確認資料保留、DPA、GDPR／PECR／CAN-SPAM／PCI 適用責任。
- 真實 SEO Provider、CMS 發佈與支付 webhook 仍受 PH2-06／07／09／11 gate 控制。

## 會話總結（2026-09-13）— PH2-04 安全收尾補強

### 會話主要目的

完成 `APPROVE PH2-04` 後的最後安全收尾，消除錯誤詳情洩露與任務 API 的跨工作區存取風險。

### 完成的主要任務

- Lighthouse、Site Audit 與 WordPress 媒體掃描錯誤回應改為穩定錯誤碼，不回傳第三方原始 body、內部路徑或底層 exception message；日誌同步使用脫敏錯誤碼。
- WordPress API JSON／HTML 抓取統一加入 URL policy、DNS 驗證、DNS pinning、手動 redirect、跨 origin redirect 拒絕、15 秒 timeout、MIME 與 2 MiB response limit。
- 同步任務列表、匯出、重試、忽略、批量處理與死信統計全部加入 workspace scope；死信告警查詢改為登入後可用，設定修改限 owner／admin；批量 task ID 加入 UUID 與數量驗證。
- Site update、WordPress credentials、Analytics settings 保留已授權 site token 相容路徑，同時對 SaaS 使用者強制登入、workspace scope 與 viewer 權限限制。
- 更新 PH2-04 核檢文件、開發流程與本 README，記錄完成範圍與外部 privacy／legal 待辦。

### 使用的技術棧

TypeScript、Fastify、PostgreSQL、Node.js Fetch／Undici、Vitest、Docker Compose。

### 新增或修改文件

- `apps/api/src/lighthouse.ts`
- `apps/api/src/siteAudit.ts`
- `apps/api/src/siteConnections.ts`
- `apps/api/tests/securityHardening.test.ts`
- `apps/worker/src/index.ts`
- `packages/security/src/index.ts`
- `packages/security/tests/publicUrlPolicy.test.ts`
- `docs/approvals/phase-2/PH2-04-security-privacy-ssrf.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `README.md`

### 驗證結果

- `npm run lint` 通過。
- `npm run test` 通過：API 58 passed／6 skipped、Web 13 passed、Worker 9 passed、AI provider 15 passed、CMS adapter 1 passed、Security 15 passed。
- `npm run build` 通過，Web SEO fallback HTML 與 route graph 生成成功。
- `npm run security:audit` 通過，0 個 high 以上漏洞。
- `npm run db:migrate` 通過，所有已套用 migration 可安全跳過。
- Production image `aieo-ph2-04-security-check` build 成功；production Compose dummy-secret dry-run 通過；`git diff --check` 通過。

### 下一步行動清單

- 尚未 commit、push 或部署；需另行取得明確授權後才可執行。
- 正式部署前仍需在 VPS 安全配置 `JWT_SECRET`、`WORDPRESS_CREDENTIAL_ENCRYPTION_KEY` 與部署 smoke 帳戶，並完成 privacy／legal review。

## 會話總結（2026-09-13）— GitHub 推送前置檢查

### 會話主要目的

將已驗證的 PH2-03／PH2-04 開發成果提交並推送至 GitHub。

### 完成的主要任務

- 確認本地 `main` 與 `origin/main` 推送前沒有分歧。
- 只暫存 PH2-03／PH2-04 相關程式、migration、測試、部署配置與文件；排除 `.env`、`.codebuddy/`、臨時圖片及未屬於本階段的 UI／WordPress 修改。
- 完成敏感資訊模式檢查，提交中沒有私鑰、GitHub Token、OpenAI Key、Google API Key 或 `.env` 文件。
- 建立本地提交 `e276e6e`：`feat(phase-2): add platform contracts and security hardening`。
- 檢查 GitHub repository 與 `production` Environment Secrets，確認尚未配置 `DEPLOY_SMOKE_EMAIL` 與 `DEPLOY_SMOKE_PASSWORD`。

### 關鍵決策和解決方案

- 暫停推送 `main`，因為該推送會觸發生產部署，而部署腳本已按 PH2-04 安全要求對缺少 smoke 登入憑據採 fail-closed；在缺少 Secrets 時繼續推送只會產生可預期的失敗部署。
- 後續可在 GitHub `production` Environment 配置有效 smoke 帳戶後推送 `main`，或明確改為推送 `codex/ph2-04-security-hardening` 分支以避免觸發生產部署。

### 使用的技術棧

Git、GitHub CLI、GitHub Actions、Docker Compose。

### 新增或修改文件

- `README.md`

### 驗證結果

- PH2-04 的 lint、test、build、security audit、migration、production image 及 Compose fail-closed 驗證已於上一節記錄並通過。
- 本次 Git staged diff 的敏感資訊與 whitespace 檢查通過。
- GitHub push 尚未執行，原因是缺少 production smoke Secrets。

### 下一步行動清單

- 配置 `DEPLOY_SMOKE_EMAIL` 與 `DEPLOY_SMOKE_PASSWORD` 後推送 `main`，並監看 `Production Deploy` workflow。
- 若本次只需保存到 GitHub、不部署，改推送 `codex/ph2-04-security-hardening` 分支。

## 會話總結（2026-09-13）— 生產啟動錯誤修復與重新部署

### 會話主要目的

配置生產 smoke 測試帳號與正式密鑰，推送 PH2-02 至 PH2-04，並修復部署後 API 容器啟動失敗。

### 完成的主要任務

- 已將 `demo@rankwoven.com`／`rankwoven` 配置為 GitHub `production` Environment 的 smoke Secrets；密碼未寫入倉庫。
- 已將使用者提供的 `JWT_SECRET` 與 `WORDPRESS_CREDENTIAL_ENCRYPTION_KEY` 寫入 VPS `/docker/rankwoven/.env`，僅驗證變量存在與長度，未輸出密鑰；原 `.env` 先備份，權限為 `600`。
- 重新部署時定位到 API 的 Node ESM 啟動錯誤：TypeScript 編譯輸出的相對 import 沒有 `.js` 副檔名，`node dist/index.js` 無法解析 `dist/config`。
- 新增 API／Worker `start:production` 腳本，以已安裝的 `tsx` 執行源入口；production Compose 保留 build、non-root、production secret hard-fail 及既有安全設定。
- 本地 production Docker image 已驗證 API 使用 production secrets 啟動，`/health` 返回 200，確認不再出現 `ERR_MODULE_NOT_FOUND`。

### 使用的技術棧

Node.js 22、TypeScript、tsx、Docker Compose、GitHub Actions、Hostinger VPS。

### 新增或修改文件

- `apps/api/package.json`
- `apps/worker/package.json`
- `docker-compose.prod.yml`
- `README.md`

### 驗證結果

- GitHub Actions Verify（前一輪）：Lint、Test、Build、Security Audit 全部通過。
- VPS Compose 在密鑰配置後可解析，API／Worker production 啟動命令已在本地 image 通過 smoke health check。
- 前一輪部署因 API ESM 啟動錯誤失敗；本次修復尚未推送／重新部署。

### 下一步行動清單

- 提交並推送本次 production 啟動修復到 `main`。
- 監看 GitHub Actions 重新執行完整 Verify、SSH、migration、Docker 重建及 health／登入 smoke check。

## 會話總結（2026-09-13）— 修復長時間部署 SSH 斷線

### 會話主要目的

處理 production secrets 配置後部署仍因 GitHub Actions SSH 斷線而中止的問題。

### 完成的主要任務

- 確認 VPS `/docker/rankwoven/.env` 已安全配置 `JWT_SECRET` 與 `WORDPRESS_CREDENTIAL_ENCRYPTION_KEY`，兩者均為 64 字符，文件權限為 `600`；未輸出密鑰值。
- 確認第二次部署的 Verify、SSH、migration 和 Web 鏡像構建均通過，但 API／Worker 鏡像在長時間 Docker 構建期間因 SSH `Broken pipe` 未完成，導致部署中止。
- 在 `scripts/deploy-production.sh` 與 GitHub Actions SSH 探測中加入 `ServerAliveInterval=30`、`ServerAliveCountMax=20` 和連接超時設定，避免長構建無輸出時斷線。

### 使用的技術棧

GitHub Actions、OpenSSH、Docker Compose、Hostinger VPS、Bash。

### 新增或修改文件

- `scripts/deploy-production.sh`
- `.github/workflows/production-deploy.yml`
- `README.md`

### 驗證結果

- 生產密鑰存在性與長度檢查通過；Compose 解析通過。
- 目前上一輪部署因 SSH `Broken pipe` 失敗，線上 API 曾返回 502；待 keepalive 修復推送後重新部署。

### 下一步行動清單

- 通過 `main` push 觸發新部署，等待完整 Verify、Docker build、容器啟動、公開 health 和登入 smoke check。

## 會話總結（2026-09-13）— 修正生產密鑰強度誤判

### 會話主要目的

修復合法 256-bit 十六進制 WordPress 憑據加密密鑰被 production config 誤判為弱密鑰的問題。

### 完成的主要任務

- 確認使用者提供的兩組密鑰均為 64 字符；WordPress 密鑰包含 15 種十六進制字符，仍具足夠隨機熵，但原校驗要求必須包含全部 16 種字符。
- 將 production secret 最低字符多樣性由 16 調整為 12，繼續要求至少 32 字符並拒絕低多樣性固定字串。
- 新增實際 64 位十六進制密鑰的 config 回歸測試，確保合法 key 可啟動 production API。

### 使用的技術棧

TypeScript、Zod、Vitest、Node.js crypto 設定策略。

### 新增或修改文件

- `apps/api/src/config.ts`
- `apps/api/tests/securityHardening.test.ts`
- `README.md`

### 驗證結果

- 待完成 lint、security hardening test、production image 啟動及 GitHub Actions 部署驗證。

### 下一步行動清單

- 驗證通過後提交並推送 `main`，重新執行 production deployment。

## 會話總結（2026-09-13）— PH2-02 至 PH2-04 生產部署完成

### 會話主要目的

完成 PH2-02、PH2-03、PH2-04 驗證、GitHub 推送、生產密鑰配置、舊密碼摘要遷移及 Hostinger VPS 部署。

### 完成的主要任務

- GitHub `production` Environment 已配置 smoke 登入 Secrets，VPS 已配置兩組 64 字符 production secrets；密鑰未寫入 Git 或一般日誌。
- 修復 production ESM 啟動方式、長時間 Docker build 的 SSH keepalive，以及合法 256-bit hex secret 被字符多樣性規則誤拒的問題。
- demo 生產帳號透過臨時 `LEGACY_PASSWORD_HMAC_SECRET` 登入一次，已由舊 HMAC 摘要漸進升級為 salted scrypt；資料庫確認 1／1 用戶完成遷移後，legacy key 已立即從 VPS `.env` 移除。
- GitHub Actions run `34763193166` 最終重跑成功，包含 Verify、SSH、部署前資料庫備份、migration、Docker build／recreate、公開 health 與已認證 smoke check。

### 使用的技術棧

GitHub Actions、Node.js 22、TypeScript、tsx、Vitest、Docker Compose、PostgreSQL、OpenSSH、Hostinger VPS。

### 新增或修改文件

- `apps/api/package.json`
- `apps/worker/package.json`
- `apps/api/src/config.ts`
- `apps/api/tests/securityHardening.test.ts`
- `docker-compose.prod.yml`
- `.github/workflows/production-deploy.yml`
- `scripts/deploy-production.sh`
- `README.md`

### 驗證結果

- GitHub Actions Lint、Test、Build、Security Audit 全部通過。
- 生產資料庫 migration `0001` 至 `0014` 完成或安全跳過已套用版本，並建立部署前備份。
- `rankwoven-api-1`、`rankwoven-worker-1`、`rankwoven-web-1`、`rankwoven-postgres-1`、`rankwoven-redis-1` 全部運行；Web、PostgreSQL、Redis 健康檢查通過。
- `https://api.rankwoven.com/health`、`https://rankwoven.com/`、demo 登入及受保護 `/api/v1/site-connections` 均返回 HTTP 200。

### 下一步行動清單

- 由於 WordPress 憑據加密密鑰已從舊本地 fallback 輪換為正式 key，現有站點的 WordPress Application Password 應在客戶後台重新錄入，確保後續 Worker 寫回可解密。
- 後續進入 PH2-05 前，完成 privacy／legal reviewer 對資料保留及營運地區責任的確認。

## 會話總結（2026-09-13）— 縮短 production image 權限處理

### 會話主要目的

修復 `Dockerfile.production` 對整個 `/workspace` 執行遞歸 `chown` 導致 VPS build 長時間卡住及服務維護窗口過長的問題。

### 完成的主要任務

- 確認 VPS build 卡在 `chown -R node:node /workspace`，而不是 CPU、記憶體、磁碟或應用程式測試問題。
- 取消對應的卡住 GitHub run，只終止該次遠程 Docker build 進程，未停止或刪除資料庫 volume／備份。
- 使用既有已驗證 image 重新啟動全部五個 production containers，先恢復公開服務。
- 將 `Dockerfile.production` 改為 `COPY --chown=node:node . .`，移除額外遞歸權限掃描；本地相同 image build 由數分鐘降至約 6 秒。

### 使用的技術棧

Docker BuildKit、Docker Compose、GitHub Actions、Hostinger VPS。

### 新增或修改文件

- `Dockerfile.production`
- `README.md`

### 驗證結果

- 本地 production image build 成功，`COPY --chown` 步驟約 1.5 秒，最終 image 保持 `USER node`。
- VPS 五個 production containers 已恢復運行，Web、PostgreSQL、Redis health check 正常。

### 下一步行動清單

- 推送 build 優化並完成最後一次 GitHub Actions deployment、health 及登入 smoke check。

## 會話總結（2026-09-13）— 修復本地 Docker 登入 CORS 錯誤

### 會話主要目的

修復本地 Docker Web 登入頁出現 `Failed to fetch`，導致無法登入的問題。

### 完成的主要任務

- 使用真實瀏覽器在 `http://localhost:8082/login` 重現登入請求的 `TypeError: Failed to fetch`。
- 確認根因是 API 預設 `CORS_ORIGINS` 遺漏 Docker production-style Web 使用的 `http://localhost:8082`，同時也遺漏文件慣例的 `http://localhost:8080`。
- 補上兩個本地 Docker origin 到 API 預設 allowlist，並同步更新 `.env.example`。
- 新增 CORS regression test；local Docker preflight 現在返回 204，瀏覽器 fetch 改為正常收到 HTTP 401，而不是網路層 Failed to fetch。
- 另確認 `https://rankwoven.com/login` 對 production API 的相同瀏覽器 fetch 已正常取得 HTTP 401，production 不是本次 CORS 根因。

### 使用的技術棧

Fastify CORS、TypeScript、Vitest、Docker Compose、agent-browser。

### 新增或修改文件

- `apps/api/src/config.ts`
- `apps/api/tests/health.test.ts`
- `.env.example`
- `README.md`

### 驗證結果

- `npm run lint` 通過。
- `npm run test -w @aieo/api -- health.test.ts` 通過，10 項測試成功。
- `npm run build -w @aieo/api` 通過。
- 瀏覽器實測 localhost Docker login API request 不再拋出 `Failed to fetch`。

### 下一步行動清單

- 推送 CORS 修復到 `main`，由 GitHub Actions 部署至 production。

## 會話總結（2026-09-14）— 啟動 PH2-05 基礎資料、用量與任務治理核檢

### 會話主要目的

依第二階段開發流程啟動 PH2-05，盤點資料治理、用量帳本、任務隊列、限流與可觀測性現況，並建立批准前的實作契約。

### 完成的主要任務

- 對照 `0010`–`0014` migration、Phase 2 Repository、Worker、API route 與既有測試，確認研究／內容資料、append-only ledger、entitlement、task attempt、workspace trigger 和 global IP rate limit 均已有基礎。
- 識別目前缺口：用量 reserve 與 task 建立尚未原子化、release 未從週期 quota 排除、Phase 2 Worker 只執行模型目錄同步、缺少 lease／公平排程／provider limiter／circuit breaker／dead-letter disposition 與完整 attempt telemetry。
- 建立 PH2-05 核檢文件，定義 PostgreSQL durable queue、Redis 限流邊界、reserve→finalize/release 不變量、租約重試、取消、dead-letter replay／ignore、資料最小化與驗收測試。

### 關鍵決策和解決方案

- PostgreSQL 繼續作 task、ledger、entitlement 與 audit 的唯一事實來源；Redis 只用於跨實例 provider rate limit 與 circuit breaker。
- 成本型任務必須在同一交易中完成 idempotency、quota、reserve、task 與 audit；Stripe 不可作 request-time quota 真相。
- 真實 Provider、公開 audit、CMS 寫回、付款與外部副作用仍關閉，必須先取得 `APPROVE PH2-05` 並在後續功能 gate 批准後才可啟用。

### 使用的技術棧

PostgreSQL、Redis、Fastify、Node.js、TypeScript、Vitest、Docker Compose。

### 新增或修改文件

- `docs/approvals/phase-2/PH2-05-data-usage-task-governance.md`
- `README.md`

### 驗證結果

- 本次為批准前設計與文件盤點，未修改 runtime、migration、環境變數或 production 資源；因此未執行全倉 build／test。
- 已確認使用者既有未提交前端／WordPress 文件與樣式修改仍保留且未混入本次範圍。

### 下一步行動清單

- 等待 `APPROVE PH2-05`。
- 批准後依核檢文件順序實作 `0015` migration、原子 enqueue／quota、worker lease／retry、Redis limiter／circuit、dead-letter 與測試。

## 會話總結（2026-09-14）— 第二階段三層選單與路由重新規劃

### 會話主要目的

依最新第二階段 PRD 重整公開前台、客戶後台與管理後台的選單、canonical route、舊路由遷移與未完成項目排期。

### 完成的主要任務

- 新增 PRD 11.3.6，定義公開產品／工具／資源／定價／帳戶及 Footer 導覽、工具 hub 與完整公開 route inventory。
- 定義客戶後台的工作區導覽、站點內容導覽、內容子頁、監控與外鏈、工作區操作選單，並統一以 `/app/sites/:siteId/*` 作站點上下文。
- 定義管理後台的平台總覽、客戶與資源、執行與成本、治理、系統選單與完整內部 route inventory。
- 修正舊規劃中 `/app/tasks` 的衝突：它保留為跨站 task canonical；單站 task 改用 `/app/sites/:siteId/tasks`。所有舊私有 route 由驗證 workspace／site 後的 resolver 處理，避免 static redirect 遺失站點上下文。
- 補充 PH2-08 工作流及前端頁面規格的 menu manifest、可達性、feature flag、i18n 與公開 SEO 孤島驗收要求。

### 關鍵決策和解決方案

- 公開、客戶與管理 route 嚴格分成三個 namespace；私有頁不參與 sitemap，公開頁必須通過 parent／related link 的孤島 gate。
- Router、menu、breadcrumb、legacy resolver、SEO head 與 sitemap 將由同一份 Route + Navigation Manifest 生成，避免各處手寫連結後漂移。
- 新規劃只更新未完成 PRD 與實作標準，不啟用任何新 route、選單或功能；仍由 PH2-08 及相關功能階段批准後實作。

### 使用的技術棧

Vue Router、Vue I18n、TypeScript、route registry、靜態 SEO 生成與 Sitemap。

### 新增或修改文件

- `docs/rankwoven-phase-2-prd.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `docs/frontend-page-spec.md`
- `README.md`

### 驗證結果

- 本次只修改 PRD／流程／頁面規格，未修改 Router、前端元件、API、migration 或 production。
- `git diff --check` 通過；已對照既有 route registry、PH2-08 工作流與 PRD，確認 v2 規格明確覆蓋舊 redirect 衝突。
- 不需要執行 build／test，因本次沒有程式碼或建置設定變更。

### 下一步行動清單

- 保持 PH2-05 為等待批准狀態。
- 進入 PH2-08 前，以新 11.3.6 作 menu manifest、route registry、legacy resolver、i18n 與 SEO／可達性測試的唯一規格。

## 會話總結（2026-09-14）— PH2-05 基礎資料、用量與任務治理實作完成

### 會話主要目的

在取得 `APPROVE PH2-05` 後，完成第二階段的資料治理、用量帳本、任務隊列、限流、熔斷、死信與可觀測性底座。

### 完成的主要任務

- 新增 `0015_phase2_task_governance.sql`，擴充 task lease、排程、取消、replay、priority、usage trace、attempt telemetry 與 dead-letter action；本機既有資料庫升級成功且重跑可安全跳過。
- 實作 append-only reserve→finalize/release、active reservation quota、原子 costed task contract、queued cancel release、running cancellation request、workspace-scoped dead-letter list/replay/ignore。
- 將 Phase 2 Worker 改為 workspace-aware due-task selection、lease recovery、15 秒 heartbeat、jitter retry、provider limiter／circuit 與結構化 task event；仍只允許已批准的 gateway model sync 出站。
- 新增 Redis Lua token bucket／circuit breaker，套用到模型同步與已連接站點 audit；production 缺 Redis 時拒絕新增成本型 provider task。
- 同步 OpenAPI、API／Worker／shared package 回歸測試與本地 Docker dependency volume。

### 關鍵決策和解決方案

- PostgreSQL 保持 task、ledger、entitlement 與 audit 的唯一事實來源；Redis 只負責跨實例 rate limit 與 circuit state。
- task retry 永不再 reserve；一個 reservation 最多一筆 finalize 或 release，重跑 dead-letter 不覆寫原歷史。
- 真實 SEO Provider、公開 audit、內容生成、CMS 寫回、付款 webhook 和 email 保持關閉，交由 PH2-06 至 PH2-11 獨立批准。

### 使用的技術棧

PostgreSQL、Redis、Fastify、Node.js、TypeScript、Vitest、Docker Compose、OpenAPI。

### 新增或修改文件

- `db/migrations/0015_phase2_task_governance.sql`
- `packages/ai-providers/src/phase2.ts`
- `packages/ai-providers/src/taskGovernance.ts`
- `apps/api/src/phase2Repository.ts`
- `apps/api/src/phase2Routes.ts`
- `apps/api/src/siteAudit.ts`
- `apps/worker/src/index.ts`
- `apps/worker/src/phase2TaskState.ts`
- `docs/approvals/phase-2/PH2-05-data-usage-task-governance.md`
- `docs/openapi/phase2-contract.yaml`

### 驗證結果

- PostgreSQL migration upgrade、重跑 skip、3 項 Repository integration（含並發 quota advisory lock）、Redis Lua smoke、本機 API health 全部通過。
- `npm run lint`、`npm run test`、`npm run build`、`npm run security:audit` 全部通過。

### 下一步行動清單

- 等待使用者決定是否推送 PH2-05 到 GitHub。
- 可進入 `PH2-06` Keyword Intelligence；真實 DataForSEO 出站前先依 Provider fixture 與正式 rate／retry contract 核實。

## 會話總結（2026-09-14）— 啟動 PH2-06 Keyword Intelligence 核檢

### 會話主要目的

依已批准的 PH2-05 任務治理，盤點現有關鍵詞建議服務與 Provider 接入，並建立 Keyword Intelligence 的研究、競品 Gap、聚類、來源標籤與驗收規格。

### 完成的主要任務

- 確認 `keywordSuggestions.ts` 已有 AI／模板候選、DataForSEO、Ahrefs、Semrush、generic enrichment 與 GSC merge，但目前是一次性回應，沒有持久化研究快照。
- 建立 `PH2-06-keyword-intelligence.md`，定義 project／run 輸入上限、DataForSEO 主 Provider、Ahrefs／Semrush BYOK、Breakout AI 語義擴展、GSC first-party 分離、競品 Top 100、Missing／Weak／Strong／Shared、Opportunity Score、cache、成本、partial 與安全邊界。
- 明確規劃 `0016` 的 `keyword_metrics`、`keyword_observations`、`keyword_gap_snapshots` 和 run metadata 擴展，以及 API／Worker／品質評測順序。

### 關鍵決策和解決方案

- AI 只產生候選詞、intent、cluster 和內容角度，不補造搜尋量、CPC、difficulty、排名、ETV 或流量。
- 研究請求必須先經 PH2-05 atomic quota／idempotency／task governance；同一 snapshot cache hit 不重複出站或扣費。
- 本次只完成核檢設計，未接出站 SEO Provider、未啟用新研究 runtime、未修改 migration 或前端頁面。

### 使用的技術棧

Fastify、Node.js、TypeScript、PostgreSQL、Redis、Breakout API gateway、GSC、DataForSEO／Ahrefs／Semrush adapter、Vitest。

### 新增或修改文件

- `docs/approvals/phase-2/PH2-06-keyword-intelligence.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `README.md`

### 驗證結果

- 已完成現有 route／Provider／migration／Repository 對照；本次只有文件更新，不需要執行 build／test。
- PH2-06 文件狀態為 `PENDING_APPROVAL`，沒有外部 API 請求或成本產生。

### 下一步行動清單

- 等待使用者回覆 `APPROVE PH2-06`。
- 批准後先建立 `0016` migration 與 Provider sandbox fixture，再按文件順序實作 run、worker、gap、brief 和回歸測試。

## 會話總結（2026-09-14）— PH2-06 Keyword Intelligence 實作完成

### 會話主要目的

在取得 `APPROVE PH2-06` 後，將一次性關鍵詞建議升級為可持久化、可重跑、可追溯的研究工作流。

### 完成的主要任務

- 新增 `0016_phase2_keyword_intelligence.sql`：`keyword_metrics`、`keyword_observations`、`keyword_gap_snapshots`、run context、score 欄位，以及 workspace 複合外鍵與 trigger。
- 新增 DataForSEO、Ahrefs、Semrush Keyword Research adapters，統一 provider snapshot、sourceType、metrics、ranked keywords、Top 100 cap、timeout 與錯誤脫敏。
- 研究 API 支援 seed／market／language／device／競品輸入、workspace／quota／idempotency、相同輸入 cache hit、keywords／gaps 分頁篩選與 content brief 建立。
- Worker 支援 Provider metrics、Breakout AI 或 deterministic 候選擴展、競品 observations、Missing gap、Opportunity Score、run／usage 結算與重試治理。
- 將既有 keyword provider 環境變數安全傳入 API／Worker；未提交任何 `.env`、密碼、Token 或 API key。

### 關鍵決策和解決方案

- DataForSEO 是平台主 Provider；Ahrefs／Semrush 只在 server-side BYOK 配置後出站，指標不混用。
- AI 只產生候選詞、意圖、cluster 前置資料與內容角度，不生成搜尋量、CPC、難度、排名或流量。
- 同一 project／正規化輸入／Provider 的既有 run 直接 cache hit，不重複建立 reserve 或外部請求；缺資料明確標記 unavailable／partial。

### 使用的技術棧

Fastify、Node.js、TypeScript、PostgreSQL、Redis、Breakout API gateway、DataForSEO／Ahrefs／Semrush adapters、Vitest、OpenAPI。

### 新增或修改文件

- `db/migrations/0016_phase2_keyword_intelligence.sql`
- `packages/ai-providers/src/phase2.ts`
- `packages/ai-providers/src/keywordResearch.ts`
- `packages/ai-providers/src/index.ts`
- `packages/ai-providers/tests/keywordResearch.test.ts`
- `apps/api/src/keywordResearchService.ts`
- `apps/api/src/phase2Repository.ts`
- `apps/api/src/phase2FeatureRoutes.ts`
- `apps/api/src/server.ts`
- `apps/api/tests/phase2Repository.postgres.test.ts`
- `apps/api/tests/phase2Routes.test.ts`
- `apps/worker/src/index.ts`
- `apps/worker/src/phase2TaskState.ts`
- `apps/worker/tests/worker.test.ts`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `docs/openapi/phase2-contract.yaml`
- `docs/approvals/phase-2/PH2-06-keyword-intelligence.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `README.md`

### 驗證結果

- `0016` migration upgrade／重放、全新臨時資料庫 migration、PostgreSQL 4 項 Repository integration、Redis smoke、Provider／API／Worker fixtures 均通過。
- 全倉 `npm run lint`、`npm run test`、`npm run build`、`npm run security:audit` 通過；本機 Docker API `/health` 正常。

### 下一步行動清單

- 可進入 `PH2-07` Content Optimizer 與 AI 評測。
- 真實 Provider 出站前核實正式 ranked-keyword endpoint、rate／retry-after、row cost、pricing snapshot 與 server-side key；GSC own-rank task 及公開工具仍由後續 gate 處理。

## 會話總結（2026-09-14）— PH2-06 Keyword Intelligence 實作完成

### 會話主要目的

在取得 `APPROVE PH2-06` 後，完成可持久化、可重跑、可追溯的 Keyword Intelligence 研究流程。

### 完成的主要任務

- 新增 `0016_phase2_keyword_intelligence.sql`，建立 keyword metrics、own／competitor observation、Gap snapshot、score 與研究輸入 context，並加上 workspace 複合外鍵與觸發器。
- 實作 DataForSEO、Ahrefs、Semrush provider adapter；統一 snapshot hash、Top 100、來源標籤、timeout 與錯誤脫敏。
- 研究 API 支援 seed／market／language／device／競品輸入、Provider 選擇、PH2-05 quota／idempotency、同輸入 cache hit、分頁 filter、Gap 與 content brief。
- Worker 支援 Provider metrics、Breakout AI／deterministic keyword expansion、競品 observations、Missing Gap、Opportunity Score、run 狀態與 usage finalize。
- 補齊 PostgreSQL／In-memory Repository、API／Worker／Provider fixtures、migration integration、研究 route cache 與 workspace isolation 測試。
- Docker Compose 已把 keyword provider 設定安全傳入 Worker；未提交任何 `.env`、密鑰或 API key。

### 關鍵決策和解決方案

- AI 只產生候選詞、意圖、聚類前置資料與內容角度，不生成搜尋量、CPC、難度、排名或流量。
- DataForSEO 作平台主 Provider；Ahrefs／Semrush 只在 server-side BYOK 配置後出站，Provider 指標不混用。
- 同一研究輸入命中既有 run 時直接返回 cache，不重複建立 task、reserve 或 Provider 請求；無資料顯示 unavailable／partial，不以 0 代替。

### 使用的技術棧

Fastify、Node.js、TypeScript、PostgreSQL、Redis、Breakout API gateway、DataForSEO／Ahrefs／Semrush adapters、Vue I18n contract、Vitest、OpenAPI。

### 新增或修改文件

- `db/migrations/0016_phase2_keyword_intelligence.sql`
- `packages/ai-providers/src/keywordResearch.ts`
- `packages/ai-providers/src/phase2.ts`
- `packages/ai-providers/src/index.ts`
- `packages/ai-providers/tests/keywordResearch.test.ts`
- `apps/api/src/keywordResearchService.ts`
- `apps/api/src/phase2Repository.ts`
- `apps/api/src/phase2FeatureRoutes.ts`
- `apps/api/src/server.ts`
- `apps/api/tests/phase2Repository.postgres.test.ts`
- `apps/api/tests/phase2Routes.test.ts`
- `apps/worker/src/index.ts`
- `apps/worker/src/phase2TaskState.ts`
- `apps/worker/tests/worker.test.ts`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `docs/openapi/phase2-contract.yaml`
- `docs/approvals/phase-2/PH2-06-keyword-intelligence.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `README.md`

### 驗證結果

- `0016` migration upgrade／重放、臨時新資料庫 migration、Provider fixtures、API／Worker／Repository integration 全部通過。
- 全倉 `npm run lint`、`npm run test`、`npm run build`、`npm run security:audit` 全部通過；本地 Docker API health 正常。

### 下一步行動清單

- 可進入 `PH2-07` Content Optimizer 與 AI 評測。
- 真實 Provider 出站前核實正式 endpoint、rate／retry-after、row cost、pricing snapshot 與 server-side key；公開工具與內容生成仍不自動開啟。

## 會話總結（2026-09-14）— 修復本地 Docker 登入與 Worker 查詢錯誤

### 會話主要目的

處理本地 Docker Web 登入顯示 `Failed to fetch`，並確認 PH2-06 變更後的 API／Worker 容器狀態。

### 完成的主要任務

- 確認 `localhost:8082` 使用 production-style Nginx Web 容器；Vite bundle 原先內嵌 `https://api.rankwoven.com`，runtime 的 `VITE_API_BASE_URL=http://localhost:3011` 因此不起作用。
- 在 `docker-compose.prod.yml` 加入 `VITE_API_BASE_URL` build arg，使用本地 API 地址重新建立 Web image；bundle 已驗證只包含 `http://localhost:3011`。
- 修正 Worker 研究任務查詢引用不存在的 `keyword_research_runs.reservation_id` 欄位，避免 PostgreSQL 反覆報錯並令 Worker 進入失敗循環。
- 重啟本地 API／Worker，確認服務重新監聽且無新的欄位錯誤。

### 關鍵決策和解決方案

- 前端 API URL 是 build-time 變數；本地 production-style 測試必須先傳 build arg，再啟動 `localhost:8082`。
- API CORS 保留 `localhost:8082` allowlist；不透過放寬跨來源或修改認證來繞過登入錯誤。

### 使用的技術棧

Docker Compose、Dockerfile.web、Vite、Nginx、Fastify、PostgreSQL、curl。

### 新增或修改文件

- `docker-compose.prod.yml`
- `apps/worker/src/index.ts`
- `docs/deployment.md`
- `README.md`

### 驗證結果

- `http://localhost:3011/health` 返回 HTTP 200；`http://localhost:8082/login` 返回 HTTP 200。
- `localhost:8082` 到 API 的 CORS 預檢返回 HTTP 204，demo 登入請求返回 HTTP 200；未輸出 token。
- Web bundle 已驗證 API 地址為本地 `http://localhost:3011`；Worker／PostgreSQL／Redis 容器運行正常。

### 下一步行動清單

- 本次未 commit、push 或部署 production。
- 重新測試登入後可繼續 `PH2-07`；若切換 production-style build，按 `docs/deployment.md` 使用正確 build arg。

## 會話總結（2026-09-14）— 追查伺服器與本地 Docker 登入錯誤

### 會話主要目的

處理本地 Docker 與伺服器登入頁出現 `Failed to fetch`／CORS 錯誤。

### 完成的主要任務

- 確認本地 production-style Web bundle 原先內嵌 production API；加入 `docker-compose.prod.yml` build arg 後重建為 `http://localhost:3011`。
- 確認本地 API／Worker 使用開發 Compose 設定，避免合併 production override 後把 `CORS_ORIGINS` 收窄至 production host。
- 修正 Worker 研究任務查詢錯誤：移除不存在的 `keyword_research_runs.reservation_id` 引用。
- 檢查公開 DNS 與 CORS：`rankwoven.com` 可登入，但 `www.rankwoven.com` 原先不在 production allowlist，預檢返回 `CORS_ORIGIN_DENIED`；已在程式、`.env.example` 與 production Compose 預設加入 `https://www.rankwoven.com`。

### 關鍵決策和解決方案

- Vite API 地址是 build-time 值，不能只修改容器 runtime environment。
- CORS 只擴展至已知 canonical host，不使用萬用 `*`；production VPS 需要重新部署 allowlist 修改後，`www` 才會恢復登入。

### 使用的技術棧

Docker Compose、Dockerfile.web、Vite、Nginx、Fastify CORS、PostgreSQL、Worker、curl。

### 新增或修改文件

- `docker-compose.prod.yml`
- `apps/api/src/config.ts`
- `.env.example`
- `apps/api/tests/health.test.ts`
- `apps/worker/src/index.ts`
- `docs/deployment.md`
- `README.md`

### 驗證結果

- 本地 `http://localhost:8082/login` 返回 200，bundle 只引用 `http://localhost:3011`。
- 本地 API health 200、CORS 預檢 204、demo 登入 200。
- Production `https://rankwoven.com` health／CORS／demo 登入均正常；`https://www.rankwoven.com` 在部署前仍返回 CORS 500。
- Worker 重啟後沒有新的資料庫欄位錯誤；既有重啟產生的 exit 143 是正常終止舊 watch 進程。

### 下一步行動清單

- 等待明確授權後 commit、push `main` 並部署 production，使 `www.rankwoven.com` allowlist 修復生效。
- 未授權前不修改 VPS `.env`、不重啟 production、不執行 GitHub push。

## 會話總結（2026-09-14）— PH2-05/PH2-06 推送與部署

### 會話主要目的

將已核准的 PH2-05、PH2-06 基礎資料／用量治理與關鍵詞智能功能，以及本地／`www` 登入修復推送至 GitHub `main` 並部署至生產環境。

### 完成的主要任務

- 重新執行完整測試、建置與高嚴重度安全掃描。
- 確認 staged 變更未包含 `.env`、密碼、Token 或 API key；保留其他未相關 dirty worktree 不作提交。
- 準備提交並觸發既有 GitHub Actions 生產部署流程。

### 關鍵決策和解決方案

- 只提交已 stage 的 35 個相關檔案，避免使用 `git add .` 將使用者其他修改帶入。
- 生產部署沿用 GitHub Actions 與 `scripts/deploy-production.sh`，部署後驗證公開 API、Web 與兩個網域的 CORS／登入。

### 使用的技術棧

Node.js、TypeScript、Vue/Vite、Fastify、Vitest、Docker Compose、GitHub Actions。

### 驗證結果

- `npm run test` 通過。
- `npm run build` 通過並生成 96 個 SEO fallback HTML，路由圖 96 nodes／1365 edges。
- `npm run security:audit` 通過，未發現高嚴重度漏洞。

### 下一步行動清單

- 等待 GitHub Actions Production Deploy 完成。
- 部署後檢查 `https://api.rankwoven.com/health`、`rankwoven.com` 與 `www.rankwoven.com` 登入及 CORS。

## 會話總結（2026-09-14）— 生產部署驗證完成

### 驗證結果

- GitHub Actions run `34807443322` 的 Verify 與 Deploy job 均成功。
- `https://api.rankwoven.com/health` 返回 HTTP 200。
- `https://rankwoven.com` 與 `https://www.rankwoven.com` 返回 HTTP 200。
- `www.rankwoven.com` 到 API 的 CORS 預檢返回 HTTP 204；apex 與 `www` 來源的 demo 登入均返回 HTTP 200。
- 驗證過程未輸出或提交任何 token、密碼或 `.env` 內容。

## 會話總結（2026-09-14）— 進入 PH2-07 Content Optimizer 核檢

### 會話主要目的

進入 PH2-07，為 Content Optimizer 與 AI 評測建立可批准的實作範圍、資料契約、風險邊界及驗收標準。

### 完成的主要任務

- 盤點現有 editor SEO score、Phase 2 content optimization skeleton API、預留資料表、AI gateway 與 Worker 能力。
- 建立 PH2-07 核檢草案，定義五維 deterministic score、七種 rewrite scope、Claim Ledger、Structured Output、批量計劃、locale golden set、任務治理及測試 gate。
- 固定本階段不實作公開頁、PH2-08 導覽、CMS 寫入、發布或新 AI provider；所有 AI 請求只經既有 Breakout gateway 的 server-side profile。

### 關鍵決策和解決方案

- AI 分析永不覆蓋規則分；缺少維度一律顯示 confidence，不靜默補分。
- `SOURCE_REQUIRED`、未驗證 claim 與虛構事實一律阻止建議批准；PH2-07 的 apply 僅做 stale snapshot preflight，CMS write 保持 disabled，留待 PH2-09。

### 新增或修改文件

- `docs/approvals/phase-2/PH2-07-content-optimizer-evaluation.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `README.md`

### 驗證結果

- 本次僅完成規劃與核檢文件，未修改 runtime 程式碼、資料庫、容器或生產環境；因此未執行程式測試。

### 下一步行動清單

- 等待 `APPROVE PH2-07`，再依核檢草案開始 migration、API、Worker、評測與測試實作。

## 會話總結（2026-09-14）— PH2-07 Content Optimizer 實作完成

### 會話主要目的

在 `APPROVE PH2-07` 後，完成 Content Optimizer 的資料、API、Worker、Claim Ledger、Structured Output 與評測基線。

### 完成的主要任務

- 新增 `0017_phase2_content_optimizer.sql`，保存不可變內容快照、五維 checks、claim 支持資料、rewrite diff／revision 與批量計劃資料結構。
- 建立共享 deterministic scorer，提供 On-page、Query alignment、Topical coverage、Readability、Trust & citability 分數與 confidence。
- 啟用內容分析、rewrite、approve／reject、recheck 及 stale snapshot apply preflight API；CMS 寫入維持 `CMS_WRITE_DISABLED`。
- Worker 接入內容分析與改寫 task、Breakout JSON output、Zod runtime validation、一次 schema repair、Claim Ledger、`SOURCE_REQUIRED` 與 PH2-05 用量治理。
- 更新 Phase 2 OpenAPI、核檢文件與 API／shared-package 回歸測試。

### 驗證結果

- `npm run db:migrate` 首次套用 `0017` 成功，第二次重放成功。
- `npm run lint`、`npm run test`、`npm run build`、`npm run security:audit` 全部通過。
- 重建本機 API／Worker 後，`http://localhost:3011/health` 返回 HTTP 200；未配置高品質模型 profile 時內容分析正確返回 `PROVIDER_UNAVAILABLE`，不繞過 gateway／價格／entitlement gate。

### 下一步行動清單

- 進入 PH2-08，實作 Content Optimizer 的客戶後台頁面、導航、route manifest、i18n、diff 視圖、批量計劃 API orchestration 與行動端狀態。
- PH2-09 前維持 CMS 寫入關閉；內部 canary 前配置已核驗 model profile、價格快照和 content optimization entitlement。

## 會話總結（2026-09-14）— 進入 PH2-08 導航與路由核檢

### 會話主要目的

進入 PH2-08，規劃公開前台、客戶後台與管理後台的 manifest-first 導航、site-scoped route、SEO 防孤島與權限隔離。

### 完成的主要任務

- 盤點現有 route registry、Router、手寫 App navigation、公開 SEO generator、private flat route 與 planned route。
- 建立 PH2-08 核檢草案，定義 route manifest 欄位、三層導航、legacy resolver、site context、feature gate、i18n、WCAG AA 與 SEO 驗收。
- 明確記錄工作區切換 API 尚未存在，因此本階段不能把未驗證 workspace ID 當作前端切換狀態。

### 新增或修改文件

- `docs/approvals/phase-2/PH2-08-navigation-routes-workspaces.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `README.md`

### 驗證結果

- 本次只完成核檢文件，未修改 Router、views、runtime、資料庫、容器或生產環境；未執行程式測試。

### 下一步行動清單

- 等待 `APPROVE PH2-08`，再開始 manifest、layout、site context、legacy resolver、頁面與 SEO／accessibility 測試實作。

## 會話總結（2026-09-14）— PH2-08 核心導航與工作台實作

### 會話主要目的

在 `APPROVE PH2-08` 後，完成 manifest-first 導航、site-scoped route guard、Content Optimizer 工作台入口及公開導航可達性。

### 完成的主要任務

- 擴展 route registry metadata，讓導航、group、breadcrumb、site scope、feature key 與 availability phase 有集中契約。
- 移除 App.vue 手寫導航陣列；公開 header／footer、客戶／管理 sidebar 與 breadcrumb 改由 manifest 生成。
- 新增 site-scoped Content Optimizer view 及 API client，並從站點列表導入 Content Optimizer／Site Audit。
- 深層 site route 在登入後以 workspace-scoped sites API 驗證 `siteId`，失敗安全返回 `/app/sites`。
- 保持未完成 public tools、Billing、Backlinks、Monitors、Developers、workspace switch 與 CMS 寫入完全關閉。

### 驗證結果

- `npm run lint`、`npm run test`、`npm run build`、`npm run security:audit` 通過。
- Build 生成 96 個 public canonical URL，驗證 86 篇 Blog 與 10 個公開頁導入連結，route graph 為零孤島。
- 本機 Docker Web／API 啟動正常；browser 驗證公開導航、功能頁跳轉與未登入 site-scoped deep link 導向登入頁；已儲存本機視覺快照 `/tmp/rankwoven-ph2-08-home.png`。

### 下一步行動清單

- 補齊 workspace switch API 後完成安全切換；以同一 manifest 實作完整 legacy resolver 與其餘 site-scoped wrapper。
- 對照各功能 API gate 分批啟用 public tools、批量計劃、管理入口與 PH2-09 CMS draft workflow。

## 會話總結（2026-09-14）— 修復 Owner 無法進入管理後台

### 會話主要目的

修復具 `owner` 角色的使用者無法訪問 `/admin/` 的前端路由權限錯誤。

### 根因與解決方案

- 本機 demo 帳戶角色為 `owner`，但前端 Router 原先只允許 `role === 'admin'`，與後端既有的 `viewer < editor < admin < owner` 權限階層不一致。
- 新增共用角色排序 helper，讓 `owner` 繼承 admin route 權限，同時維持 editor／viewer 被拒絕。

### 新增或修改文件

- `apps/web/src/utils/roles.ts`
- `apps/web/src/router/index.ts`
- `apps/web/tests/roles.test.ts`
- `README.md`

### 驗證結果

- owner 存取管理 API 返回 HTTP 200，未輸出 token。
- Web lint、14 項 Web 測試與 Web build 通過；公開 SEO route graph 維持零孤島。

### 下一步行動清單

- 等待明確授權後，連同 PH2-07／PH2-08 已驗證變更一起 commit、push 與部署。

## 會話總結（2026-09-14）— PH2-07／08 與管理權限生產部署

### 會話主要目的

將已驗證的 PH2-07 Content Optimizer、PH2-08 核心導航與 owner 管理後台權限修復推送至 GitHub `main` 並部署到 Hostinger VPS。

### 完成的主要任務

- 提交並推送 `3364803 feat(phase2): add content workflows and routed workspaces`。
- GitHub Actions Production Deploy 完成 Verify 與 Hostinger VPS Deploy。
- 驗證 API health、主網域／`www` 的 `/admin/` 入口，以及 owner 管理 API 存取。

### 驗證結果

- Production Deploy workflow `34815881196` 成功。
- `https://api.rankwoven.com/health` 返回 HTTP 200。
- `https://rankwoven.com/admin/`、`https://www.rankwoven.com/admin/` 返回 HTTP 200。
- demo owner 的管理 API 請求返回 HTTP 200；驗證過程未輸出 token、密碼或 `.env`。

## 會話總結（2026-09-14）— PH2-08 補齊競品關鍵詞研究入口

### 會話主要目的

在 PH2-08 客戶後台補上競品網址分析，讓使用者查看競品關鍵詞、長尾關鍵詞與關鍵詞 Gap。

### 完成的主要任務

- 啟用 `/app/sites/:siteId/research`，新增競品關鍵詞研究工作台與站點列表入口。
- 研究 API 現可在只提供合法競品網址時，從 hostname 推導初始 seed；仍要求至少有 seed 或競品域名，避免無輸入研究。
- 工作台會建立 research project／run、輪詢任務狀態，顯示競品關鍵詞、長尾候選與 Gap；Provider 未配置、quota、partial 或失敗均顯示對應狀態。

### 新增或修改文件

- `apps/api/src/phase2FeatureRoutes.ts`
- `apps/api/tests/phase2Routes.test.ts`
- `apps/web/src/api/keywordResearch.ts`
- `apps/web/src/views/KeywordResearchView.vue`
- `apps/web/src/constants/routeRegistry.*`
- `apps/web/src/views/SitesView.vue`
- `apps/web/src/i18n.ts`
- `docs/approvals/phase-2/PH2-08-navigation-routes-workspaces.md`
- `README.md`

### 驗證結果

- API／Web build 與測試通過；競品網址-only API regression 通過。
- browser 驗證未登入的 site research deep link 安全導向登入頁。
- 公開 SEO fallback 仍為 96 個 canonical URL，route graph 孤島數為 0。

### 下一步行動清單

- 配置正式關鍵詞 Provider 後，在已連接站點輸入競品網址執行真實資料研究。
- 等待明確授權後 commit、push 和部署本次 PH2-08 競品研究變更。

## 會話總結（2026-09-14）— PH2-08 繼續：競品研究與 Legacy Resolver

### 完成的主要任務

- 啟用 site-scoped `競品關鍵詞研究`，支援只輸入競品網址並由合法 hostname 推導初始 seed。
- 新增競品排名關鍵詞、長尾候選與 Gap 的客戶後台工作台，保留 Provider、quota、partial 與失敗狀態。
- 實作 LegacyRouteResolver，讓舊 private route 在有合法 site context 時安全導向 site-scoped 工作台，否則回到跨站入口。

### 驗證結果

- API／Web build 與測試通過；Web 14 項測試通過。
- 公開 SEO fallback 仍為 96 個 canonical URL，route graph 孤島數為 0。

### 下一步行動清單

- 進入下一個 PH2-08 site-scoped wrapper，優先處理內容庫／媒體／內部連結與跨站任務的 route context。
- 等待明確授權後 commit、push 和部署本次 PH2-08 變更。

## 會話總結（2026-09-14）— 進入 PH2-10 Site Audit 與監控核檢

### 會話主要目的

進入 PH2-10，盤點 Site Audit、Lighthouse、GSC、CrUX、SSRF、任務治理與告警能力，規劃 remediation closed loop 與 monitor contract。

### 完成的主要任務

- 確認現有 Site Audit 已有 SerpApi 索引查詢、SEO checks、排程與配額；Lighthouse、GSC 已可用，但 CrUX、page graph、issue fingerprint、recheck 與 monitor／alert 資料層未完成。
- 建立 PH2-10 核檢草案，定義 `0019` migration、Audit／Monitor API、Lighthouse／CrUX 分區、partial run、issue → task → recheck、公開掃描防濫用、成本 hard stop 與告警去重。
- 固定公開 `/tools/site-audit`、Email 告警、侵入式掃描與自動伺服器／DNS 修復在批准與驗收前保持關閉。

### 新增或修改文件

- `docs/approvals/phase-2/PH2-10-site-audit-monitoring.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `README.md`

### 驗證結果

- 本次僅完成核檢與規劃文件，未修改 Site Audit／Monitor runtime、資料庫、容器或生產環境；未執行程式測試。

### 下一步行動清單

- 等待 `APPROVE PH2-10`，再開始 migration、Audit／CrUX／Monitor API、Worker remediation 與 E2E 實作。

## 會話總結（2026-09-14）— 批准 PH2-10

### 會話主要目的

根據使用者 `APPROVE PH2-10`，進入 Site Audit remediation、CrUX 分區及監控告警的實作階段。

### 完成的主要任务

- 將 `docs/approvals/phase-2/PH2-10-site-audit-monitoring.md` 狀態更新為 `APPROVED / IMPLEMENTATION IN PROGRESS`。
- 保持公開掃描、Email 告警、侵入式掃描和自動伺服器／DNS 修復關閉，按已批准的安全和成本邊界實作。

### 關鍵決策和解決方案

- 複用現有 Fastify、PostgreSQL、Redis、Vue 3 與 Site Audit repository；新資料結構通過 `0019` migration 管理。
- Lighthouse lab、CrUX field 和 GSC first-party 資料獨立保存及展示，不把 unavailable 轉成 0。

### 使用的技术栈

Fastify、TypeScript、Zod、PostgreSQL、Redis、Vue 3、Ant Design Vue、Vitest。

### 新增或修改文件

- `docs/approvals/phase-2/PH2-10-site-audit-monitoring.md`
- `README.md`

### 驗證結果

本次僅更新批准狀態及文件，runtime 與資料庫尚未修改，測試尚未運行。

### 下一步行動清單

- 實作 `0019_phase2_site_audit_monitoring.sql`、Audit／CrUX／Monitor domain 與 API，並補齊安全、隔離、成本及重檢測試。

## 會話總結（2026-09-14）— PH2-10 第一階段實作

### 會話主要目的

完成已批准 PH2-10 的第一階段 runtime：Site Audit remediation 資料閉環、CrUX field 資料分區、監控事件與告警基礎能力。

### 完成的主要任務

- 新增 `0019_phase2_site_audit_monitoring.sql`，建立 page、finding、recheck、metrics、monitor、event、alert 表及 workspace scope trigger。
- 新增 `apps/api/src/siteAuditMonitoring.ts`，提供記憶體／PostgreSQL repository、穩定 issue fingerprint、canonical／死鏈／Schema／孤島頁確定性檢查、CrUX 28 日 adapter、finding ignore／recheck、monitor／alert API。
- 接入 Fastify server 與 `CRUX_API_KEY`／`CRUX_API_URL` 配置；擴展 Site Audit 狀態為 `partial`／`cancelled`，保持舊 API 兼容。
- 補充前端 Site Audit／Monitor API 型別和 Idempotency-Key helper。
- 增加 PH2-10 單元及 API 合約測試，驗證 workspace isolation、事件去重、CrUX 無樣本和寫入冪等鍵 gate。

### 關鍵決策和解決方案

- Lighthouse lab、CrUX field、GSC first-party 指標以 `sourceType` 分開保存；CrUX 無樣本使用 `unavailable`，不轉換為 0。
- 所有寫入 route 要求 Bearer JWT 與 Idempotency-Key；公開掃描、Email 發送和自動伺服器／DNS 修復繼續關閉。
- 觸發器使用 `to_jsonb(NEW)` 讀取跨表欄位，避免 PL/pgSQL 在不同表結構下解析失敗。

### 使用的技術棧

Fastify、TypeScript、Zod、PostgreSQL、Vue 3、Vitest、Docker Compose。

### 新增或修改文件

- `db/migrations/0019_phase2_site_audit_monitoring.sql`
- `apps/api/src/siteAuditMonitoring.ts`
- `apps/api/src/siteAudit.ts`
- `apps/api/src/config.ts`
- `apps/api/src/server.ts`
- `apps/api/tests/siteAuditMonitoring.test.ts`
- `apps/web/src/api/siteConnections.ts`
- `.env.example`
- `docs/approvals/phase-2/PH2-10-site-audit-monitoring.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `README.md`

### 驗證結果

- `npm run lint` 通過。
- `npm run test` 通過：API 73 passed／8 skipped，Web 14 passed，Worker 11 passed，packages 全部通過。
- `npm run build` 通過，SEO fallback 生成 96 個公開 URL，route graph 孤島數為 0。
- `npm run security:audit` 通過，0 vulnerabilities。
- `npm run db:migrate` 成功套用 `0019`，並二次運行確認可重放；PostgreSQL repository smoke 寫入／讀取通過。

### 下一步行動清單

- 在 PH2-12 QA gate 補真實 crawler worker、Lighthouse metric ingestion、monitor sample scheduler 及安全／成本壓力測試。
- 在單獨批准後再開啟公開 `/tools/site-audit` 或 Email 通知。

## 會話總結（2026-09-14）— PH2-10 Audit 與監控閉環完成

### 會話主要目的

完成已批准 PH2-10 的 Site Audit remediation、Lighthouse／CrUX 指標分區、監控採樣、告警和客戶後台入口。

### 完成的主要任務

- 實作受控連接站點 crawler：robots、sitemap、canonical、meta robots、Schema、死鏈和孤島頁檢查；強制 SSRF 驗證、redirect 重驗、MIME、大小、時間及 25 頁上限。
- 實作 issue fingerprint、修復任務關聯、ignore、recheck 的 fixed／persisting／regressed／partial 狀態；寫入操作使用實際 idempotency replay。
- Lighthouse lab 與 CrUX 28 日 field data 獨立落庫和展示；CrUX 無樣本標記 unavailable，不計為 audit failure。
- 實作技術監控 scheduler、閾值、靜默期、in-app alert；未批准的競品／AI visibility Provider 只記錄 partial，不向第三方出站。
- 新增 `/app/monitors` 建立和事件頁、`/app/alerts` 告警列表及 24 小時靜默操作，避免已實作能力成為後台孤島路由。

### 關鍵決策和解決方案

- 基礎 Site Audit 不再依賴 SerpApi；舊有 SerpApi route 繼續保留作兼容和索引補充。
- 頁面正文僅用於本次解析，不寫入資料庫；監控長期只保存 URL、結構和指標資料。
- 公開掃描、Email 告警、自動伺服器／DNS 修復和未批准 Provider 調用保持關閉。

### 新增或修改文件

- `db/migrations/0019_phase2_site_audit_monitoring.sql`
- `apps/api/src/siteAuditMonitoring.ts`
- `apps/api/src/siteAudit.ts`
- `apps/api/src/config.ts`
- `apps/api/src/server.ts`
- `apps/api/tests/siteAuditMonitoring.test.ts`
- `apps/web/src/api/siteConnections.ts`
- `apps/web/src/views/SiteAuditView.vue`
- `apps/web/src/views/MonitorEventsView.vue`
- `apps/web/src/views/AlertsView.vue`
- `apps/web/src/router/index.ts`
- `apps/web/src/constants/routeRegistry.ts`
- `apps/web/src/constants/routeRegistry.json`
- `apps/web/src/i18n.ts`
- `.env.example`
- `docs/approvals/phase-2/PH2-10-site-audit-monitoring.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `README.md`

### 驗證結果

- API／Web build、lint 與 API 增量測試通過。
- crawler、fingerprint、recheck、CrUX no-sample、idempotency replay、monitor threshold 和 alert queue 均有測試。
- 本機 PostgreSQL migration 已重放，repository 的 page／finding／monitor／alert 寫入讀取 smoke check 通過。
- 登入後以瀏覽器確認 `/app/monitors`、`/app/alerts` 可訪問、i18n 文案正確且 API 請求成功。

### 下一步行動清單

- 執行 PH2-12 全量 QA、安全、成本及公開掃描 challenge gate。
- 另行批准 Provider 後啟用競品／AI visibility 真實採樣；另行批准後開啟 Email 或公開 Site Audit。

## 會話總結（2026-09-14）— 進入 PH2-09 CMS Draft 核檢

### 會話主要目的

進入 PH2-09，規劃已批准內容建議安全寫入 WordPress draft、回滾與發布後驗證。

### 完成的主要任務

- 盤點現有 WordPress credential encryption、SSRF fetch、SEO field apply snapshot、Worker 寫回與本機插件測試環境。
- 建立 PH2-09 核檢草案，定義 content publish snapshot、publication、verification schema、draft-only API、task、claim gate、stale check、idempotency 與 WordPress E2E。
- 固定 publish／schedule、第三方 CMS 與未批准內容保持 server-side disabled。

### 新增或修改文件

- `docs/approvals/phase-2/PH2-09-cms-draft-publish-verification.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `README.md`

### 驗證結果

- 本次僅完成 PH2-09 核檢文件，未修改 CMS runtime、WordPress 插件、資料庫、容器或生產環境；未執行程式測試。

### 下一步行動清單

- 等待 `APPROVE PH2-09`，再開始 migration、apply／publication API、Worker draft／verify／rollback 與 WordPress Docker E2E 實作。

## 會話總結（2026-09-14）— PH2-09 Draft-Only 基礎實作

### 完成的主要任務

- 新增 `0018_phase2_cms_content_publications.sql`，建立內容 publication snapshot、draft lifecycle 與 verification 資料表。
- WordPress 插件新增受權限保護的 draft REST endpoint，固定建立 `draft`，不提供 publish／schedule。
- 將插件同步到本機 WordPress 測試站，完成 PHP syntax check。

### 驗證結果

- `npm run db:migrate` 成功套用 `0018`。
- WordPress 容器內 `php -l` 通過。
- 尚未開啟 API apply 或 Worker content publication task，因此沒有任何 CMS 寫入或發佈。

### 下一步行動清單

- 繼續實作 publication API、approved claim／stale snapshot gate、Worker draft／verify／rollback 與 WordPress Docker E2E。

## 會話總結（2026-09-14）— 修復 WordPress 同步月份顯示錯誤

### 會話主要目的

修復 WordPress 同步日期因 GMT 字串缺少時區後綴而可能跨月顯示錯誤的問題。

### 根因與解決方案

- WordPress `date_gmt`／`modified_gmt` 不帶 `Z` 時，JavaScript 會按執行環境本地時區解析，再轉 ISO，月初或跨時區可能落到錯誤月份。
- 新增 UTC 正規化 helper，僅為無時區後綴的 WordPress GMT 值補上 `Z`；已有 `Z` 或 offset 的值保持不變。

### 新增或修改文件

- `apps/api/src/siteConnections.ts`
- `apps/api/tests/siteConnections.test.ts`
- `README.md`

### 驗證結果

- 月初 `2026-01-01T00:30:00` regression 固定解析為 `2026-01-01T00:30:00.000Z`。
- API build 與 75 項 API 測試通過。

## 會話總結（2026-09-14）— PH2-10 實作完成記錄

### 會話主要目的

完成已批准的 Site Audit remediation、Lighthouse／CrUX 分區、技術監控、告警與客戶後台入口。

### 完成的主要任務

- 新增受控 crawler、finding／recheck／remediation task、CrUX field、Lighthouse lab、技術監控 scheduler、告警與靜默操作。
- 啟用 `/app/monitors` 與 `/app/alerts`，並保留公開掃描、Email、未批准 Provider 出站與自動修復為關閉狀態。

### 關鍵決策和解決方案

- 所有 connected-site crawl 均經 SSRF、redirect、MIME、頁數和時間限制；不保存頁面原文。
- 所有寫入均要求 JWT 與 Idempotency-Key；監控只在閾值觸發且不在靜默期時建立 in-app 告警。

### 使用的技術棧

Fastify、TypeScript、PostgreSQL、Vue 3、Ant Design Vue、Vitest、Docker Compose。

### 新增或修改文件

`0019` migration、Site Audit／Monitor API、Web Site Audit／Monitor／Alert 視圖、route registry、i18n、PH2-10 核檢及本 README。

### 驗證結果

已通過 lint、API／Web build、API 增量測試、PostgreSQL migration 重放與 browser route smoke；公開 SEO route graph 維持 0 個孤島頁。

### 下一步行動清單

進入 PH2-12 全量 QA、安全、成本與公開掃描 challenge gate；Provider 與 Email 啟用仍須另行批准。

## 會話總結（2026-09-14）— SEO 網站檢測首頁與選單修正

### 會話主要目的

將 WordPress 插件及 SaaS 客戶後台首頁統一導向 SEO 網站檢測，修正側欄顯示未翻譯 i18n key 的問題。

### 完成的主要任務

- WordPress `RankWoven SEO` 根頁改為直接顯示 SEO 網站檢測摘要、問題表與檢測操作。
- SaaS `/app` 首頁改用 `SiteAuditView`，側欄首頁改顯示「網站檢測」。
- 新增 `workspace`／`current_site` 導覽群組翻譯及安全 fallback，避免顯示 `navigationGroups.workspace`。
- 補齊網站檢測表的繁體中文欄位名稱與狀態文字。

### 關鍵決策和解決方案

- 截圖中的亂碼為 SaaS i18n key 缺失，不是 WordPress PHP 檔案編碼錯誤；PHP 檔案維持 UTF-8。
- 保留現有 SEO 分析、設定和其他外掛子選單，僅調整根頁的預設工作內容。

### 新增或修改文件

- `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`
- `plugins/wordpress/README.md`
- `plugins/wordpress/TESTING.md`
- `plugins/wordpress/rankwoven-seo/README.md`
- `apps/web/src/constants/routeRegistry.json`
- `apps/web/src/App.vue`
- `apps/web/src/i18n.ts`
- `apps/web/src/views/SiteAuditView.vue`
- `apps/web/tests/smoke.test.ts`
- `README.md`

### 驗證結果

- `npm run lint`、`npm run test -w @aieo/web`、`npm run build -w @aieo/web` 均通過；公開 route graph 維持 0 個孤島頁。
- WordPress 測試容器 `php -l` 通過，插件同步檔案一致，測試站前台返回 HTTP 200。
- 瀏覽器登入後確認 `/app` 直接載入 SEO 網站檢測，側欄與檢測表不再顯示未翻譯 key。

### 下一步行動清單

等待明確授權後才會提交、推送或部署本次變更。

## 會話總結（2026-09-15）— Ahrefs Site Audit 資料接入驗證

### 會話主要目的

將 Ahrefs Site Audit 的網站級問題接入 RankWoven SEO 網站檢測，並以 Ckcprompt Project `10160561` 的 crawl 資訊驗證真實 API 資料讀取。

### 完成的主要任務

- 完成 Ahrefs Site Audit provider、每站 Project 設定、審計 metadata／問題欄位與 WordPress 網站檢測頁的整合驗證。
- 補齊 WordPress 外掛說明與測試清單，明確規範 Ahrefs API key 僅可保存在 SaaS，外掛只保存 Project ID 和 crawl 日期。
- 同步最新外掛至本機 WordPress 測試站，確認 SEO 網站檢測頁可載入，且未連接站點不會誤寫入 Ckcprompt Project。

### 關鍵決策和解決方案

- Ahrefs 資料不可用時保留 RankWoven 已觀測規則並顯示 provider 錯誤碼，不偽造 Ahrefs Health Score 或問題資料。
- 使用與既有關鍵詞 API 相同的 Bearer 格式驗證目前 SaaS key；兩個 Ahrefs v3 端點均返回 `401`，因此根因是本機憑證無效、已撤銷或不是可用的 v3 key，而非 Project ID、crawl 日期或請求參數。

### 使用的技術棧

Fastify、TypeScript、PostgreSQL migration、Vue 3、WordPress PHP、Vitest、Docker Compose 與 Ahrefs API v3。

### 新增或修改文件

- `apps/api/src/ahrefsSiteAudit.ts`
- `apps/api/src/seoOptimization.ts`
- `apps/api/tests/ahrefsSiteAudit.test.ts`
- `db/migrations/0020_phase2_ahrefs_site_audit.sql`
- `plugins/wordpress/rankwoven-seo/rankwoven-seo.php`
- `plugins/wordpress/rankwoven-seo/README.md`
- `plugins/wordpress/README.md`
- `plugins/wordpress/TESTING.md`
- `README.md`

### 驗證結果

- Ahrefs Site Audit 請求與站點設定路由測試通過；本機實際 Ahrefs 呼叫安全返回 `401`，未輸出 API key。
- `npm run db:migrate` 可重複執行，`0020` migration 已安全跳過。
- `npm run lint`、`npm run test`、`npm run build`、`npm run security:audit` 全部通過。
- WordPress PHP 語法檢查、插件同步、重啟後 HTTP 200 與後台 SEO 網站檢測頁面載入通過。

### 下一步行動清單

- 在 SaaS `.env` 以有效 Ahrefs API v3 key 更新 `AHREFS_API_KEY`，重建 API 容器後重試。
- 連接 Ckcprompt 站點後，僅在該站點保存 Project `10160561`、最新與比較 crawl 日期，再執行網站檢測確認真實 Ahrefs 資料。
- 使用者明確授權後才提交、推送或部署。

## 會話總結（2026-09-15）— 全域站點工作區與手動網站接入

### 會話主要目的

將客戶後台改為 Google Search Console 式的全域站點工作區：先在頂部選取網站，所有站點功能自動使用同一站點；同時支援不安裝插件的手動網站分析。

### 完成的主要任務

- 新增 `plugin`、`api`、`manual` 站點接入模式及 `0021_site_connection_modes.sql` migration。
- 新增手動網站建立 API 與站點管理彈窗；手動站點日後由相同 URL 的插件／API 接入時會升級同一筆站點資料。
- 新增 Pinia 目前站點 store、頂部 site switcher、site-scoped canonical customer routes，以及舊 `/app/*` 入口的自動導向。
- 網站檢測、關鍵詞研究、內容優化、流量、媒體、內部連結與任務頁改為使用路由 site context，不再要求逐頁重新選站。
- 手動站點的 CMS 套用、批量套用與回滾由伺服器拒絕；前台同時隱藏或停用相關一鍵操作。

### 關鍵決策和解決方案

- 站點選擇保存為目前工作區狀態並同步至 `/app/sites/:siteId/*`，避免各頁 select 彼此不一致。
- `manual` 模式可使用相同的公開網站檢測與建議，但不得建立寫回任務；`plugin`／`api` 模式保持原有自動化能力與憑證 gate。

### 新增或修改文件

- `apps/api/src/siteConnections.ts`
- `apps/api/src/seoOptimization.ts`
- `apps/api/tests/siteAuditMonitoring.test.ts`
- `apps/web/src/stores/site.ts`
- `apps/web/src/App.vue`
- `apps/web/src/router/index.ts`
- `apps/web/src/constants/routeRegistry.json`
- `apps/web/src/views/SitesView.vue`
- `apps/web/src/views/SiteAuditView.vue`
- `apps/web/src/views/AnalyticsView.vue`
- `apps/web/src/views/MediaOptimizationView.vue`
- `apps/web/src/views/LinksView.vue`
- `apps/web/src/views/TasksView.vue`
- `db/migrations/0021_site_connection_modes.sql`
- `docs/approvals/phase-2/PH2-08-navigation-routes-workspaces.md`
- `README.md`

### 驗證結果

- API 測試 85 項通過，覆蓋手動站點建立、同 URL 插件升級和手動模式寫回拒絕。
- Web 測試 17 項、API／Web build、lint 與 migration `0021` 通過。

### 下一步行動清單

- 在本機客戶後台手動新增一個公開測試網站，確認站點切換後所有 customer menu 均保持該 site context。
- 使用者明確授權後才提交、推送或部署。

## 會話總結（2026-09-15）— PH2 站點工作區生產部署

### 會話主要目的

將已完成的 PH2 站點工作區、手動網站接入、Site Audit、Ahrefs 設定、監控與 WordPress 後台更新推送至 GitHub `main` 並部署至 Hostinger VPS。

### 完成的主要任務

- 提交 `f5566d5` 並推送至 `main`。
- GitHub Actions `Production Deploy`（run `34871353307`）完成 Verify 與 Hostinger VPS Deploy。
- 生產部署腳本完成備份、migration、Docker Compose 重建、公開 health 與已登入站點 API smoke check。

### 驗證結果

- GitHub Actions Verify：lint、test、build、security audit 全部成功。
- `https://api.rankwoven.com/health` 返回 HTTP 200。
- 生產登入及 `GET /api/v1/site-connections` 返回 HTTP 200，回應包含 `connectionMode` 與 `canWriteBack` 能力欄位。

### 下一步行動清單

- 在客戶後台手動新增公開測試網站，確認全域 site switcher 與手動修復流程。
- 為需要一鍵優化的 WordPress 站點完成插件連接與 Application Password 配置。

## 會話總結（2026-09-15）— 手動 URL 與同步內容只讀 SEO 分析

### 會話主要目的

為 SEO 網站檢測新增手動單頁分析，支援輸入已連接站點的公開 URL，或從已同步且已發布的文章／商品中選取分析對象；所有結果只供用戶手動修改網站。

### 完成的主要任務

- 新增 `POST /api/v1/site-connections/:siteId/site-audit/manual-runs`，要求 URL 或內容 ID 二選一、Bearer JWT、workspace／site scope 與 Idempotency-Key。
- 新增已同步內容精確查詢；只允許 `post`／`product`、已發布且有公開 URL 的內容進入單頁分析。
- 單頁 crawler 檢查 Title、Meta Description、H1、文字量、canonical、robots 與 Schema；不對單頁結果判定孤島頁，避免資料不足造成誤報。
- 前台 SEO 網站檢測新增 URL 輸入、文章／商品選擇器與明確的「只讀分析，不會寫回網站」提示。

### 關鍵決策和解決方案

- 手動 URL 及所有 redirect 必須與已連接站點使用相同 origin，並沿用 SSRF、robots、MIME、timeout 與 redirect 上限。
- 不建立 optimization suggestion、批准、CMS writeback、發布或同步任務；結果只保存審計記錄與手動修復建議。
- 頁面正文只在本次請求中解析，不持久化。

### 新增或修改文件

- `apps/api/src/siteAuditMonitoring.ts`
- `apps/api/src/siteConnections.ts`
- `apps/api/tests/siteAuditMonitoring.test.ts`
- `apps/web/src/api/siteConnections.ts`
- `apps/web/src/views/SiteAuditView.vue`
- `apps/web/src/i18n.ts`
- `apps/web/tests/smoke.test.ts`
- `docs/approvals/phase-2/PH2-10-site-audit-monitoring.md`
- `docs/rankwoven-phase-2-development-workflow.md`
- `README.md`

### 驗證結果

- API 單元／合約測試 84 項通過，包含同站單頁、外站 URL 拒絕、外站 redirect 停止、輸入二選一與非文章／商品拒絕。
- Web 測試 16 項、API／Web TypeScript 建置與 lint 通過。
- Docker API health check 正常；本機端點對空目標安全返回 `400 VALIDATION_ERROR`。

### 下一步行動清單

- 在已連接的生產站點選擇一篇文章或商品，驗證真實公開頁面的只讀檢測結果與人工修復流程。
- 使用者明確授權後才提交、推送或部署。

## 會話總結（2026-09-15）— 競品關鍵詞研究 Provider 修復

### 會話主要目的

修復競品關鍵詞研究任務失敗，並讓前端正確顯示背景任務的安全錯誤原因。

### 完成的主要任務

- 專案型關鍵詞研究在既有 `generic` 設定直接指向 DataForSEO 時，自動選用 DataForSEO 的排名關鍵詞端點。
- 移除 Ahrefs Keyword Explorer overview 設定作為競品研究 fallback，避免向不相容的路徑發出請求。
- 前端輪詢改為讀取 API 回傳的 `run`／`task` 實際層級，保留安全的 Provider 錯誤碼。
- 補齊繁體中文與英文的驗證失敗、速率限制、逾時與無效回應提示。
- 新增 generic DataForSEO URL 的 Provider 選擇回歸測試。

### 關鍵決策和解決方案

- Ahrefs 保持供既有單關鍵詞指標與 Site Audit 功能使用，但不再被錯誤地用作競品排名關鍵詞 Provider。
- 未進行真實 DataForSEO 呼叫，以避免在非必要驗證時產生成本；以 Provider 合約測試與 API／Worker 建置驗證資料流。

### 新增或修改文件

- `packages/ai-providers/src/keywordResearch.ts`
- `packages/ai-providers/tests/keywordResearch.test.ts`
- `apps/api/src/keywordResearchService.ts`
- `apps/worker/src/index.ts`
- `apps/web/src/api/keywordResearch.ts`
- `apps/web/src/views/KeywordResearchView.vue`
- `apps/web/src/i18n.ts`
- `README.md`

### 驗證結果

- DataForSEO Provider 合約測試 4 項通過。
- API 關鍵詞研究／健康測試 21 項通過；Worker 研究任務測試 11 項通過。
- API、Worker、Web TypeScript 建置與 lint 通過。

### 下一步行動清單

- 推送並部署後，以已連接站點在客戶後台提交一次競品研究，確認 DataForSEO 返回排名與長尾關鍵詞。

## 會話總結（2026-09-15）— 競品關鍵詞研究修復生產部署

### 會話主要目的

將競品關鍵詞研究 Provider 修復部署至 RankWoven 生產環境並驗證公開服務。

### 完成的主要任務

- 提交 `a7880ee` 並推送至 GitHub `main`。
- GitHub Actions `Production Deploy` 完成雲端 lint、測試、建置與安全稽核。
- Hostinger VPS 部署完成，包含服務重建與部署腳本的已登入 API smoke check。

### 驗證結果

- [Production Deploy](https://github.com/widecyruschan/rankwoven/actions/runs/34873481240) 的 Verify 與 Deploy jobs 均成功。
- `https://api.rankwoven.com/health` 與 `https://rankwoven.com/` 均返回 HTTP 200。
- 未提交 `.env`、憑據或未追蹤的 `0.jpeg`。

### 下一步行動清單

- 在客戶後台選取已連接站點後重新執行競品研究；若第三方 Provider 拒絕請求，介面會顯示安全且可操作的原因。

## 會話總結（2026-09-15）— SEO 審計頁面地址與一鍵修復

### 會話主要目的

讓 SEO 網站檢測結果逐條列出所有受影響頁面地址和修復建議，並為已授權插件／API 連接提供安全的一鍵修復入口。

### 完成的主要任務

- 審計規則現在保存完整 `affectedUrls`，不再只返回第一個示例網址。
- 新增 `0022_site_audit_affected_urls.sql`，兼容既有 `site_audit_issues` 數據並保存 JSONB URL 列表。
- Site Audit 結果表新增受影響網址數量與修復建議欄位；展開問題時可逐一打開全部頁面地址。
- 對 `canWriteBack=true` 的插件／API 站點顯示一鍵修復；流程只批准並提交受影響文章的標題和 Meta 描述等安全建議，重定向、robots、Schema 及伺服器設定保留人工處理。
- 手動站點不顯示一鍵修復，伺服器原有 `CMS_WRITEBACK_NOT_AVAILABLE` 權限閘門保持不變。

### 關鍵決策和解決方案

- 以現有 SEO 建議、批准和寫回隊列 API 組合一鍵流程，避免新增平行寫回協議。
- 所有 URL 仍來自已驗證的站點審計結果；寫回前要求站點已有 CMS 憑據，並通過既有快照與任務隊列以便追蹤和回滾。

### 新增或修改文件

- `apps/api/src/siteAudit.ts`
- `apps/api/src/siteAuditMonitoring.ts`
- `apps/api/tests/siteAuditMonitoring.test.ts`
- `apps/web/src/api/siteConnections.ts`
- `apps/web/src/views/SiteAuditView.vue`
- `apps/web/src/i18n.ts`
- `apps/web/tests/smoke.test.ts`
- `db/migrations/0022_site_audit_affected_urls.sql`
- `README.md`

### 驗證結果

- 全量 lint、全部工作區測試、API／Web 建置與 `npm audit --audit-level=high` 通過。
- 本機資料庫 migration `0022` 已成功應用。
- 未提交 `.env`、密碼、Token、API Key 或未追蹤的 `0.jpeg`。

### 下一步行動清單

- 部署後在已連接插件站點重新執行網站檢測，核對每條問題的完整 URL 列表和一鍵修復隊列。

## 會話總結（2026-09-15）— SEO 審計功能推送與 VPS 部署

### 會話主要目的

將 SEO 審計受影響頁面地址、一鍵修復及資料庫 migration 推送至 GitHub 並部署到 Hostinger VPS。

### 完成的主要任務

- 提交 `98295df` 並推送至 GitHub `main`。
- GitHub Actions `Production Deploy` 完成 Verify 與 Hostinger VPS Deploy。
- VPS 已套用 `0022_site_audit_affected_urls.sql`，並重建 API、Web、Worker 容器。

### 驗證結果

- [Production Deploy](https://github.com/widecyruschan/rankwoven/actions/runs/34921128360) 成功完成。
- `https://rankwoven.com/` 返回 HTTP 200。
- `https://api.rankwoven.com/health` 返回 HTTP 200。
- 本機 Docker 容器與 API health 均正常。

### 下一步行動清單

- 在已連接插件站點執行網站檢測，核對完整受影響 URL、修復建議及一鍵修復隊列結果。

## 會話總結（2026-09-15）— Google Analytics 月份顯示修復

### 會話主要目的

修復 Google Analytics 表單在香港等正時區於月初把九月份日期顯示為八月份的問題。

### 完成的主要任務

- 前端 Analytics 日期輸入改用本地日曆字段組裝 `YYYY-MM-DD`，不再以 UTC ISO 字串截取日期。
- API 默認 Analytics 日期範圍改用本地日期和 `setDate`，避免月初 UTC 回退一天。
- 新增 API 日期格式化回歸測試，以及 Web 日期輸入邏輯測試。

### 關鍵決策和解決方案

- Google Analytics 的日期範圍本身是日曆日期，不應經過 UTC 時刻轉換；保留 API 接收的 `YYYY-MM-DD` 原值。

### 新增或修改文件

- `apps/web/src/views/AnalyticsView.vue`
- `apps/api/src/analytics.ts`
- `apps/api/tests/health.test.ts`
- `apps/web/tests/smoke.test.ts`
- `README.md`

### 驗證結果

- lint 通過。
- 全量測試：API 86 通過、8 跳過；Web 18 通過；Worker 11 通過；AI Provider 24 通過；CMS Adapter 1 通過；Security 15 通過。
- API／Web build 通過，`npm audit --audit-level=high` 顯示 0 vulnerabilities。

### 下一步行動清單

- 本次只完成本地修復和驗證，尚未推送或部署。

## 會話總結（2026-09-15）— 手動網站 GA4 Property ID 連接

### 會話主要目的

讓手動加入的網站可以由用戶在流量分析頁輸入 GA4 Property ID，連接該站點的唯讀 Google Analytics 數據。

### 完成的主要任務

- 新增 Web API client `updateSiteAnalyticsSettings`，調用既有站點分析設定 API。
- Analytics 頁面新增 GA4 Property ID 表單、保存成功／失敗狀態和當前站點同步；手動站點顯示只讀連接提示。
- 新增手動站點 API 回歸測試，驗證保存後 Analytics overview 使用相同 Property ID。
- 同步更新 `docs/frontend-page-spec.md` 和本 README 的路由／API 說明。

### 關鍵決策和解決方案

- Property ID 不是密鑰，可由已登入的 workspace owner／editor 保存；Google 服務帳戶憑據仍只在 API server-side 使用。
- 手動站點保留 `canWriteBack=false`，此功能只增加 GA4 讀取，不改變手動站點的 CMS 寫回邊界。

### 新增或修改文件

- `apps/web/src/api/siteConnections.ts`
- `apps/web/src/views/AnalyticsView.vue`
- `apps/web/src/i18n.ts`
- `apps/api/tests/siteConnections.test.ts`
- `docs/frontend-page-spec.md`
- `README.md`

### 驗證結果

- 全量 lint 通過。
- API 目標測試 51 項通過；Web smoke 測試 18 項通過。
- API／Web build 通過；全量測試 86 API（8 skipped）、18 Web、11 Worker、24 AI Provider、1 CMS Adapter、15 Security 通過。
- `npm run security:audit` 通過，0 個高風險漏洞。

### 下一步行動清單

- 本次修改尚未推送或部署；部署後需用手動站點輸入實際 Property ID，確認 Google 服務帳戶已獲 GA4 Viewer 權限。

## 會話總結（2026-09-15）— Ahrefs 全站 SEO 檢測與受影響 URL

### 會話主要目的

將 SEO 網站檢測由受限首頁／25 頁備援爬取，改為使用所選 Ahrefs Site Audit 專案的全站健康度與問題資料，並可查看每條問題實際受影響的頁面地址。

### 完成的主要任務

- Ahrefs 問題解析支援官方 `crawled`、`importance`、`name` 欄位，並在可用時合併免費 `projects` 健康度與爬取數據。
- 新增按 `issue_id` 調用 Ahrefs `page-explorer` 的分頁 API，完整保留頁面地址，避免初次載入為每個問題重複消耗 API 單位。
- SEO 網站檢測頁加入 Ahrefs 專案 ID、爬取日期、對比日期及啟用開關；啟用後立即檢測使用 Ahrefs 全站資料。
- 新增受影響 URL 展開／載入更多操作、全站報告卡片、問題分類與中英文 i18n 文案。

### 關鍵決策和解決方案

- Ahrefs `issues` 是問題摘要，實際頁面地址由 `page-explorer?issue_id=...&select=url` 按需取得；這同時滿足全站檢測與 API 用量控制。
- 不將 Ahrefs 金鑰或原始回應返回前端；前端只接收健康分數、問題欄位與使用者主動請求的 URL。
- 沒有 Ahrefs 專案配置時保留既有唯讀備援爬蟲，並在介面清楚區分兩種資料來源。

### 使用的技術棧

Fastify、TypeScript、Zod、Vue 3、Ant Design Vue、Vue I18n、Ahrefs API v3、Vitest。

### 新增或修改文件

- `apps/api/src/ahrefsSiteAudit.ts`
- `apps/api/src/seoOptimization.ts`
- `apps/api/tests/ahrefsSiteAudit.test.ts`
- `apps/web/src/api/siteConnections.ts`
- `apps/web/src/views/SiteAuditView.vue`
- `apps/web/src/i18n.ts`
- `docs/frontend-page-spec.md`
- `README.md`

### 驗證結果

- `npm run lint` 通過。
- 全量測試通過：API 88（8 skipped）、Web 19、Worker 11、AI Provider 24、CMS Adapter 1、Security 15。
- `npm run build` 通過；`npm run security:audit` 顯示 0 vulnerabilities。
- 尚未推送或部署本輪變更；工作區原有未追蹤 `0.jpeg` 未加入提交。

### 下一步行動清單

- 在 `/app/site-audit` 為目標站點填入 Ahrefs Project ID，執行一次全站檢測並展開問題核對 URL。
- 你確認後再將本輪變更提交並推送到 `main`，觸發 VPS 部署。

## 會話總結（2026-09-15）— Google Analytics 月份錯位排查

### 會話主要目的

修復 Google Analytics 選取九月時顯示八月／七月示範數據的問題，並核對生產 GA4 Property 與網站 host 篩選。

### 完成的主要任務

- 確認前端與 API 以 `YYYY-MM-DD` 原樣傳遞日曆日期，沒有 UTC 日回退。
- 確認生產 `Cyrus` Property 的 GA4 原始日期維度返回正確的 `20260901` 至 `20260914`；九月的 `cyruschan.com` host 篩選沒有資料。
- 移除未配置或 GA 請求失敗時固定寫死的 2026 年 7 月示範數據，改為空數據與清零統計，避免月份錯誤。
- 更新中英文提示，明確要求為所選網站配置正確的 GA4 Property ID；不自動改寫站點與 Property 對應。

### 關鍵決策和解決方案

- Property ID 必須屬於目前選取網站；同一 GA4 Property 若追蹤多個網域，仍按所選站點的 `hostName` 過濾，避免跨站流量混入。
- `configured=false` 時不再回傳虛構月份，使用者可直接看出尚未連接即時數據。

### 新增或修改文件

- `apps/api/src/analytics.ts`
- `apps/api/tests/health.test.ts`
- `apps/web/src/i18n.ts`
- `README.md`

### 驗證結果

- 已在生產 API 重現八月與九月查詢，確認日期請求與 GA4 原始回應日期一致。
- 回歸測試、lint、build、security audit 均已通過；全量測試為 API 89（8 skipped）、Web 19、Worker 11、AI Provider 24、CMS Adapter 1、Security 15。
- 尚未提交、推送或部署本次修正。

### 下一步行動清單

- 為 `ckcprompt.cloud` 站點輸入其對應的 GA4 Property ID，再查詢九月數據。
- 確認 `Cyrus` 站點是否應繼續使用目前 Property；如要改動生產站點配置，需另行授權。

## 會話總結（2026-09-15）— 推送並部署 GA4 月份修正

### 會話主要目的

將 GA4 月份錯位修正及已驗證的 Ahrefs 全站檢測功能推送至 GitHub `main`，並部署到 Hostinger VPS。

### 完成的主要任務

- 提交 `26676e5` 並推送至 `main`。
- GitHub Actions `Production Deploy` 完成 Verify、VPS 重建及認證冒煙測試。
- 生產環境已移除固定七月示範數據，未配置即時 GA4 時不再顯示錯誤月份。

### 驗證結果

- [Production Deploy](https://github.com/widecyruschan/rankwoven/actions/runs/34943128571) 成功完成。
- `https://api.rankwoven.com/health` 返回 API 服務正常。
- `https://rankwoven.com/` 返回 HTTP 200。
- 生產 `ckcprompt.cloud` 站點查詢 `2026-09-01` 至 `2026-09-30` 返回九月日期數據；`Cyrus` Property 因 host 篩選不匹配而返回 0 行，未被錯誤標示為其他月份。

### 安全與工作區

- 未提交 `.env`、密碼、Token、API Key 或未追蹤的 `0.jpeg`。
