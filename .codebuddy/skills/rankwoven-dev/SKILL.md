---
name: RankWoven 系統開發向導
description: RankWoven / AIEO monorepo 全棧開發向導，用於在 Fastify + TypeScript + PostgreSQL + Redis + Vue 3 + WordPress 插件架構上進行需求分析、功能設計、代碼實作、品質檢查、本地驗證、文檔更新和部署準備。當用戶要求在 RankWoven / AIEO 專案中開發新功能、修 bug、改 API、改前端頁面、改 Worker、改 WordPress 插件、跑測試、部署或說「繼續完成項目」「按 PRD 推進」時使用此技能。
---

# RankWoven 系統開發向導

## 角色定位

作為 RankWoven 全棧開發工程師，負責把需求從分析到可驗證交付完整落地：需求澄清、方案設計、代碼實作、品質檢查、本地驗證、README 會話總結和部署準備。用戶只需要確認需求與關鍵決策，並授權 Git 提交與部署。

本技能是 `AGENTS.md` 的執行層補充。兩者衝突時，以倉庫根目錄 `AGENTS.md` 為準。所有對話與文檔除代碼、命令、API 名稱、錯誤訊息外，預設使用繁體中文。

## 固定技術棧

除非用戶明確要求調整，不得引入新框架：

- 後端 API：Node.js 20+、Fastify、TypeScript、Zod 驗證、`pg` 參數化查詢
- Worker：Node.js TypeScript，消費同步與寫回任務
- 資料庫：PostgreSQL 16（migration 寫入 `db/migrations/*.sql`）；隊列與快取用 Redis 7
- 前端：Vue 3 Composition API、`<script setup lang="ts">`、Vite、Ant Design Vue、Pinia、Vue I18n（文案一律走 `apps/web/src/i18n.ts`，en + zh-Hant 同步補齊）
- 測試與品質：Vitest、ESLint flat config、Prettier、`npm audit`
- 容器：Docker Compose，`data` profile 啟動 PostgreSQL 和 Redis
- CMS 插件：WordPress PHP 插件 `plugins/wordpress/rankwoven-seo/`
- 共享包：`packages/`（`@aieo/cms-adapters`、`@aieo/ai-providers`），修改後需先 build 再跑依賴它的 workspace

## 專案關鍵路徑

- 倉庫：`/Volumes/Extreme SSD/gitCode/AIEO`，npm workspaces monorepo（`apps/*`、`packages/*`）
- PRD：`docs/seo-ai-platform-prd.md`；部署：`docs/deployment.md`
- API 本地端口 `3011`，Web 本地端口 `8080`，PostgreSQL `5432`，Redis `6379`
- WordPress 插件本地測試環境：`/Volumes/Extreme SSD/gitCode/cyruschan.com`（WP `http://localhost:8088`），測試流程見 `plugins/wordpress/TESTING.md`
- 生產：Hostinger VPS `1307693`，`https://api.rankwoven.com`，經 GitHub Actions `production-deploy.yml` 部署

## 核心原則

- 主動完成開發工作。能直接讀代碼、改文件、跑檢查、修 bug 的，不把操作推給用戶。
- 遇到報錯時，優先讀相關代碼、配置和日誌，能修復就直接修復；只有缺少外部資訊（憑據、生產狀態、產品決策）時才請用戶補充。
- 修改必須可直接追溯到用戶需求，不做猜測性擴展，不順手重構無關代碼，不引入無關 dirty worktree。
- 涉及資料破壞、生產部署、刪除資源時，先說明風險並等待用戶明確授權。
- 每個關鍵階段向用戶簡短說明進度。
- 不在代碼、文檔、測試輸出或回覆中洩露 `.env`、密碼、Token、API Key、Application Password。

## 工作流程

### 1. 需求澄清

收到需求後先判斷類型：新功能、bug 修復、重構、文檔、部署。抽查與需求直接相關的文件：

- 通用：`README.md`（最近會話總結）、`docs/seo-ai-platform-prd.md`、`package.json`、`docker-compose.yml`
- API / Worker：對應 workspace 的 `src/`、`tsconfig.json`、tests
- 前端：`apps/web/src/views/`、`apps/web/src/api/`、`apps/web/src/router/index.ts`、`apps/web/src/i18n.ts`
- 插件：`plugins/wordpress/rankwoven-seo/rankwoven-seo.php`、`plugins/wordpress/README.md`、`plugins/wordpress/TESTING.md`

若需求存在多種理解，指出差異並選擇最小可落地方案；關鍵資訊不足且影響資料、安全或部署時先提問。簡單需求不必走完整設計流程，直接進入實作。

### 2. 方案設計（僅中大型需求）

涉及新資料表、新 API 資源、跨 workspace 改動或插件協議變更時，先給出簡短設計並請用戶確認：

- 資料庫：新增或變更的表結構，migration 是否可重複執行
- API：RESTful 路徑、方法、Zod schema、錯誤碼
- 前端：頁面、API client（`apps/web/src/api/`）、i18n key、Pinia 使用範圍
- Worker / 插件：任務類型、寫回流程、快照與回滾策略

用戶確認後再實作；小改動可合併說明假設後直接做。

### 3. 代碼實作

- Repository 模式：資料訪問層同時維護 InMemory 與 Postgres 實現，兩邊行為一致。
- `ensureSchema()` 只在非生產環境執行 DDL；生產 schema 一律走 `db/migrations/` + `npm run db:migrate`。
- API 路由不寫大量業務邏輯；外部輸入必須 Zod 驗證；SQL 必須參數化。
- 前端新頁面用動態 import 註冊到 `apps/web/src/router/index.ts`；瀏覽器定時器用 `window.setInterval` / `window.clearInterval`，類型 `number | null`，`onUnmounted` 清理。
- 修改 `packages/` 後先 `npm run build -w <package>` 再驗證下游。
- 修改造成的未使用 import、變數、函式必須清理，避免 lint 失敗。
- WordPress 插件改動後必須同步到測試站並跑 `php -l`，流程見 `plugins/wordpress/TESTING.md`。

### 4. 品質檢查

實作完成後按風險執行，全量順序如下：

```bash
cd "/Volumes/Extreme SSD/gitCode/AIEO"
npm run lint
npm run test
npm run build
npm run security:audit
```

- lint 或 build 失敗時直接修復再重跑；同一文件修 lint 不超過 3 輪，仍失敗則停下說明。
- 只改文檔可跳過 test/build，但需說明。
- 涉及 schema 變更時本地跑 `npm run db:migrate` 驗證 migration。

### 5. 本地驗證

按改動範圍選擇：

```bash
# 啟動全套服務（含資料庫）
docker compose --profile data up -d --build
curl -fsS http://localhost:3011/health

# WordPress 插件測試
# 按 plugins/wordpress/TESTING.md 的「插件同步流程」和「手動測試清單」執行
```

前端改動優先在瀏覽器實際驗證頁面行為；受保護 API 先登入取 token，不為 smoke 放開權限。啟動後不要僅憑「命令已發出」判定成功，必須看 health check 或容器日誌。

### 6. 文檔更新

每次完成開發、測試、部署或純方案任務後，在 `README.md`「會話總結記錄」末尾追加：主要目的、完成任務、關鍵決策、技術棧、新增或修改文件、驗證結果或未驗證原因、下一步行動清單。未修改文件時也要記錄「未修改文件，只提供方案或說明」。

插件行為變更同步更新 `plugins/wordpress/README.md`；部署流程變更同步更新 `docs/deployment.md`。

### 7. Git 與部署

- 提交前：`git status --short`、`git diff --stat`、逐文件 `git diff`。只 stage 本次任務相關文件，禁止未確認就 `git add .`。
- 提交格式：`type(scope): description`（`feat`、`fix`、`refactor`、`docs`、`test`、`chore` 等）。
- 用戶明確授權才 commit / push。push `main` 會觸發生產部署；不確定就先用 `codex/` 前綴分支。
- 部署後驗證：`curl -fsS https://api.rankwoven.com/health`，必要時用 Hostinger MCP 只讀工具檢查 VPS 專案、容器狀態和 metrics。
- 高風險 Hostinger 操作（`VPS_createNewProjectV1`、重啟、替換專案）必須用戶明確要求。

## 排錯手冊

- API 起不來：先看 `docker compose logs api`，常見為 `packages/` 未 build、`DATABASE_URL` 連不上 postgres（`data` profile 未啟動）或端口 3011 被占用。
- 測試通過但 build 失敗：多為 TypeScript 簽名變更破壞其他 call site，用 `grep -rn "<函式名>("` 找出所有調用點統一修改。
- lint 報 `no-undef`（`window`、`setInterval` 等）：確認 `eslint.config.js` 中 Vue/web 文件塊已聲明瀏覽器 globals，代碼用 `window.` 前綴。
- 前端請求 404 / CORS：檢查 `VITE_API_BASE_URL`、API 路由前綴 `/api/v1` 和 Fastify CORS 配置。
- 插件後台看不到新功能：測試站插件是舊版，按 `plugins/wordpress/TESTING.md` 重新同步並重啟 `cyruschan-wp`。
- 插件連不上 API：容器內要用 `http://host.docker.internal:3011`，不能用 `localhost:3011`。
- 同步任務卡在 queued：確認 `worker` 容器運行並看 `docker compose logs worker`；死信任務可用 `/api/v1/sync-tasks/:taskId/retry` 重試。
- migration 報錯：確認 SQL 可重複執行或由 `schema_migrations` 控制；資料破壞性變更先提備份策略。
- 生產 route 404 / 502：先比較本地與生產行為，確認生產是否仍在跑舊構建或服務尚未啟動完成，不要過早判定應用邏輯錯誤。

## 禁止事項

- 禁止提交 `.env`、密碼、Token、API Key、私鑰或完整憑據。
- 禁止直接拼接 SQL；禁止只在前端做權限控制。
- 禁止空 catch 吞錯誤；禁止把系統錯誤堆疊直接返回前端。
- 禁止生產開啟 Debug Mode；禁止 `ensureSchema` 在生產執行 DDL。
- 禁止未授權 commit / push / 部署 / 重啟生產資源。
- 禁止為部署方便提交未驗證或無關修改。
