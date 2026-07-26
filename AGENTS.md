# RankWoven Agent Skill

此文件是 RankWoven / AIEO 倉庫的代理開發與部署 Skill。所有對話、說明與倉庫文檔除程式碼、命令、API 名稱、錯誤訊息等必要部分外，預設使用繁體中文。

## 目標

協助代理在這台 macOS 上穩定開發 RankWoven，完成本地驗證、GitHub 推送，並在使用者明確要求部署時，通過既有 GitHub Actions 或 Hostinger MCP / Hostinger VPS 流程部署到生產環境。

成功標準：

1. 每次修改都能直接追溯到使用者需求。
2. 本地至少完成與修改風險相稱的 lint、test、build 或 smoke check。
3. 只提交已驗證且使用者授權提交的文件，不夾帶無關 dirty worktree。
4. 生產部署只使用 Git 已提交版本或明確打包的乾淨來源。
5. 部署後驗證公開入口與 Hostinger VPS 專案狀態。
6. 每次任務完成後追加更新 `README.md` 會話總結。

## 專案上下文

- 倉庫路徑：`/Volumes/Extreme SSD/gitCode/AIEO`
- GitHub 遠端：`https://github.com/widecyruschan/rankwoven.git`
- 預設分支：`main`
- 品牌與主域名：RankWoven，`rankwoven.com`
- API 域名：`https://api.rankwoven.com`
- Hostinger VPS ID：`1307693`
- Hostinger VPS IPv4：`72.62.253.72`
- Docker Compose 專案名：`rankwoven`
- 生產部署目錄：`/docker/rankwoven`
- 生產入口由 VPS Nginx 代理：Web `127.0.0.1:8080`，API `127.0.0.1:3011`

以上部署資訊可能隨時間變動。涉及生產操作前，必須先用文件、Git、Hostinger MCP 或只讀 SSH 檢查重新確認。

## 工作前檢查

開始任何非簡單任務前先閱讀或抽查：

- `README.md`
- `docs/deployment.md`
- `docs/domain-setup.md`
- `docs/seo-ai-platform-prd.md`
- `package.json`
- `docker-compose.yml`
- `.github/workflows/production-deploy.yml`
- `scripts/deploy-production.sh`
- 與本次需求直接相關的 `apps/`、`packages/`、`plugins/` 文件

若使用者要求修改前端，還需檢查 `apps/web/package.json`、`apps/web/vite.config.ts`、`apps/web/tsconfig.json`、`apps/web/src/`。若要求修改 API 或 Worker，還需檢查對應 workspace 的 `package.json`、`tsconfig.json`、`src/` 和 tests。

## macOS 本地開發流程

本機預設使用 zsh、Node.js / npm、Docker Desktop 和 Git。不要依賴 Linux-only 指令選項；需要跨平台時優先使用 npm scripts、Node.js 或 POSIX shell。

常用命令：

```bash
npm install
npm run lint
npm run test
npm run build
npm run security:audit
npm run docker:up
npm run docker:down
docker compose --profile data up -d --build
```

資料庫命令：

```bash
npm run db:migrate
npm run db:backup
```

WordPress 插件 PHP 語法檢查優先使用既有 Docker WordPress 容器；若不可用，可用 PHP CLI 或 WordPress PHP Docker 鏡像，但不要把此類臨時環境提交到倉庫。

## 編碼規則

先明確假設與成功標準，再實作。若需求存在多種理解，先指出差異並選擇最小可落地方案；關鍵資訊不足且會影響資料、安全或部署時，先提問。

保持簡單：

- 不做猜測性擴展。
- 不為只用一次的邏輯新增抽象。
- 不順手重構無關程式碼。
- 不刪除使用者或既有任務留下的無關 dirty worktree。
- 修改造成的未使用 import、變數或函式要清理。

Vue 前端：

- 使用 Vue 3、Composition API、`<script setup lang="ts">`。
- Props、Emit、API Response 和 Store State 必須有明確型別。
- API helper 放在 `apps/web/src/api/`。
- 路由集中在 `apps/web/src/router/index.ts`，頁面級元件使用動態 import。
- 狀態管理使用 Pinia，只保存跨頁共享狀態。
- 使用既有 UI 風格與 Ant Design Vue，不新增無關 UI 框架。
- 介面文案走 `apps/web/src/i18n.ts`，不要直接寫死在模板中。

後端：

- API 使用 RESTful 名詞路徑與正確 HTTP 狀態碼。
- Controller / route 不寫大量業務邏輯；服務、Repository、驗證與錯誤處理分層清楚。
- 外部輸入必須驗證，資料庫查詢必須使用參數化查詢或既有封裝。
- 不在程式碼、測試輸出或文檔中洩露密碼、Token、API Key、完整 JWT、Application Password 或 `.env`。
- 生產 Debug Mode 不得開啟。

資料庫：

- schema 變更寫入 `db/migrations/*.sql`。
- migration 必須可重複執行或由 `schema_migrations` 控制只執行一次。
- 涉及資料破壞、回填或大量資料操作時，先提出風險與備份策略。

## Git 與 GitHub 流程

提交前必須檢查：

```bash
git status --short
git diff --stat
git diff -- <changed-files>
```

只 stage 本次任務相關文件。不要使用 `git add .`，除非已確認工作區只有本次任務修改。

建議提交格式：

```text
type(scope): description
```

常用 type：`feat`、`fix`、`refactor`、`docs`、`style`、`test`、`chore`、`perf`。

推送規則：

1. 使用者明確要求或授權時才 commit / push。
2. 推送前跑完必要驗證。
3. 推送到 `main` 會觸發 `.github/workflows/production-deploy.yml` 生產部署，除非 workflow 或 GitHub 狀態另有變更。
4. 若不確定是否要部署，不要推送 `main`；可先提交到 `codex/` 前綴分支。

## 生產部署流程

首選部署方式是 GitHub Actions：

1. 本地完成 lint、test、build、security audit。
2. commit 並 push 到 `main`。
3. GitHub Actions 執行 `Production Deploy`。
4. Workflow 通過 SSH 執行 `scripts/deploy-production.sh`。
5. 腳本備份 VPS 配置與資料庫、套用 migration、重建 Docker Compose `data` profile。
6. 腳本驗證 `https://api.rankwoven.com/health` 與帶登入的 `https://api.rankwoven.com/api/v1/site-connections` smoke check。

手動部署只在使用者明確要求或 GitHub Actions 不可用時執行：

```bash
DEPLOY_HOST=72.62.253.72 \
DEPLOY_USER=root \
DEPLOY_PATH=/docker/rankwoven \
bash scripts/deploy-production.sh
```

手動部署仍只部署 Git ref，不包含未提交文件。需要覆寫時使用 `DEPLOY_REF`，並在執行前說明部署的 commit。

## Hostinger MCP 使用規則

Hostinger MCP 主要用於部署前後檢查、VPS Compose 專案管理和必要時觸發 Hostinger 管理面部署。優先使用只讀工具確認狀態，再使用會改變生產狀態的工具。

VPS 部署檢查順序：

1. 使用 Hostinger VPS 專案列表確認 `virtualMachineId=1307693` 上存在 `rankwoven`。
2. 使用專案內容工具檢查 Compose 專案狀態和部署配置。
3. 使用容器列表工具確認 `rankwoven-api`、`rankwoven-web`、`rankwoven-worker`、`rankwoven-postgres`、`rankwoven-redis` 狀態。
4. 必要時使用 VPS metrics 檢查 CPU、記憶體、磁碟和網路。
5. 只有在使用者明確要求「用 Hostinger MCP 部署 / 重啟 / 更新」時，才使用 `VPS_updateProjectV1`、`VPS_restartProjectV1`、`VPS_startProjectV1` 或 `VPS_createNewProjectV1`。

`VPS_createNewProjectV1` 會替換同名專案，屬於高風險操作。除非使用者明確要求重新建立專案，否則不要使用它。既有 `rankwoven` 專案一般使用 GitHub Actions 或 `scripts/deploy-production.sh` 更新。

Hostinger Hosting 工具只適用於對應場景：

- 靜態站：先本地 build 並打包純靜態輸出，再用 `hosting_deployStaticWebsite`。
- JavaScript hosting：只在目標是 Hostinger Hosting Node.js 應用而不是 VPS Docker Compose 時使用 `hosting_deployJsApplication`。
- WordPress 插件：部署 `plugins/wordpress/rankwoven-seo/` 時可用 `hosting_deployWordpressPlugin`，但需先確認目標 WordPress domain、slug 和是否會覆蓋生產插件。

## 部署後驗證

部署完成後至少檢查：

```bash
curl -fsS https://api.rankwoven.com/health
```

若檢查受保護 API，必須先登入取得 token，不要為了 smoke check 放開權限。可復用 `scripts/deploy-production.sh` 中的登入 smoke check 流程。

若使用 Hostinger MCP，部署後再查：

- VPS 專案狀態
- 容器狀態與健康狀態
- 最近部署日誌或容器錯誤
- 必要時查 VPS metrics

若公開 route 報 404 或 502，先比較本地和生產行為，再改代碼。已知風險是生產可能仍在跑舊構建，或服務重建後 API 尚未完成 install / build / start。等待服務啟動日誌和 health check，不要過早判定應用邏輯錯誤。

## 文檔更新

每次完成開發、測試、部署或純方案任務後，必須在 `README.md` 的「會話總結記錄」末尾追加：

- 會話的主要目的
- 完成的主要任務
- 關鍵決策和解決方案
- 使用的技術棧
- 新增或修改文件
- 驗證結果或未驗證原因
- 下一步行動清單

若本次沒有修改文件，也要記錄「未修改文件，只提供方案或說明」。

## 禁止事項

- 禁止提交 `.env`、密碼、Token、API Key、私鑰或完整憑據。
- 禁止直接拼接 SQL。
- 禁止只在前端做權限控制。
- 禁止忽略空 catch 或吞掉錯誤。
- 禁止把系統錯誤堆疊直接返回前端。
- 禁止在未確認 dirty worktree 的情況下 `git add .`。
- 禁止為了部署方便提交未驗證或無關修改。
- 禁止在未明確授權時重啟、替換或刪除生產資源。
