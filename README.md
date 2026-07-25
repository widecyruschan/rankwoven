# AIEO

AIEO 是一個規劃中的 AI SEO 自動優化平台，目標是通過 SaaS 雲端後台和網站插件連接客戶站點，幫助用戶對現有文章、圖片、標題、Meta 資訊和內部連結進行可審核、可回滾的 SEO 優化。

## 專案介紹

本專案當前處於產品需求和開發規劃階段。第一階段建議聚焦：

- SaaS 雲端管理平台
- WordPress 後台插件
- SEO 分析、內容生成、圖片優化和內部連結推薦 API
- 統一 CMS 適配器層，為後續 Joomla、OpenCart 等常用系統擴展預留介面

核心目標不是批量製造低價值文章，而是幫助網站管理者更安全地提升內容品質、搜尋可見性和站內連結結構。

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

後續擴展 Joomla、OpenCart 時，建議將各 CMS 插件作為獨立構建單元，並共用 SaaS API 的站點連接、文章同步、審計、建議、任務和回滾流程。

## 環境變量說明

已提供 `.env.example`。目前至少包含：

```text
NODE_ENV=development
APP_BASE_URL=http://localhost:5173
API_BASE_URL=http://localhost:3011
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
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
```

敏感資訊必須放在環境變量或密鑰管理系統中，不得提交 `.env`。

## 路由說明

當前尚未實現前端路由。建議 MVP 路由：

- `/login`：登入
- `/sites`：站點列表
- `/sites/:siteId/dashboard`：站點概覽
- `/sites/:siteId/articles`：文章庫存
- `/sites/:siteId/audits`：SEO 審計
- `/sites/:siteId/editor/:articleId`：優化審核
- `/sites/:siteId/links`：內部連結機會
- `/settings`：帳號與 API 設置

## 狀態管理說明

當前尚未實現 Pinia Store。建議拆分：

- `useAuthStore`：登入狀態和用戶資料
- `useSiteStore`：當前站點、站點列表
- `useTaskStore`：任務隊列和進度
- `useUsageStore`：套餐用量

## API 使用說明

目前已建立 API 服務骨架：

- `GET /health`：服務健康檢查。
- `GET /api/v1/cms-adapters`：查看 CMS 適配器狀態。
- `GET /api/v1/ai-providers`：查看當前 AI、Embedding、圖片、媒體存儲與圖片優化 Provider 配置。

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

## 後續優化建議

- 先完成 MVP 需求評審，再初始化程式碼倉庫
- 先做 WordPress 插件，穩定後按適配器層擴展 Joomla、OpenCart 等常用系統
- 優先實現“審核後應用”，不要第一版預設全自動改站
- 儘早接入 Google Search Console，建立優化前後的成效追蹤
- 將內容品質、重複內容、過度關鍵詞和連結濫用檢查作為產品底線

## 文件

- [AI SEO 自動優化平台開發需求文件](docs/seo-ai-platform-prd.md)

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
