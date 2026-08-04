# RankWoven 生產部署流程

本文記錄 RankWoven 部署到 Hostinger VPS 的可重複流程，目標是確保 `main` 分支合併後，生產環境不會停留在舊構建。

## 部署方式

目前提供兩種部署方式，兩者都只部署 Git 已提交版本，不包含本機未提交文件。

### GitHub Actions 自動部署

Workflow：`.github/workflows/production-deploy.yml`

觸發方式：

- `main` 分支 push 後自動執行。
- GitHub Actions 頁面手動執行 `workflow_dispatch`。

流程：

1. Checkout 指定 Git ref。
2. 使用 Node.js 22 執行 `npm ci`。
3. 執行 `npm run lint`。
4. 執行 `npm run test`。
5. 執行 `npm run build`。
6. 執行 `npm run security:audit`，使用官方 npm registry 檢查 high 以上漏洞。
7. 通過後先以 IPv4 做 TCP 連通性檢查，再用真實 SSH 登入探測驗證 GitHub Actions runner 可連上 VPS，之後才進入部署。
8. 先啟動 PostgreSQL，等待 `pg_isready` 通過。
9. 執行 `scripts/backup-database.sh` 建立部署前資料庫備份。
10. 執行 `scripts/migrate-database.sh` 套用尚未執行的 SQL migration。
11. 執行 `docker compose --profile data up -d --build` 重建並啟動服務。
12. 驗證 `https://api.rankwoven.com/health` 和 `https://api.rankwoven.com/api/v1/site-connections`。

需要的 GitHub Secrets：

| Secret | 用途 |
|---|---|
| `HOSTINGER_VPS_HOST` | Hostinger VPS IPv4，建議直接填 `72.62.253.72`，避免 GitHub Actions 在 SSH 連通性探測階段遇到主機名解析或 IPv6 問題 |
| `HOSTINGER_VPS_PORT` | 可選，SSH 端口，預設 `22` |
| `HOSTINGER_VPS_USER` | SSH 用戶，目前為 `root` |
| `HOSTINGER_VPS_SSH_KEY` | 專用部署私鑰 |
| `HOSTINGER_DEPLOY_PATH` | 部署目錄，預設 `/docker/rankwoven` |

`Configure SSH` 步驟目前不再依賴 `ssh-keyscan` 取得 host key，而是先做 `nc` 端口檢查，再直接用部署私鑰執行一次 `ssh ... "echo SSH ready"` 探測，並配合 `StrictHostKeyChecking=accept-new` 寫入 `known_hosts`。如果這一步仍失敗，通常代表：

1. `HOSTINGER_VPS_HOST` 不是目前可達的公網 IPv4。
2. GitHub Actions runner 無法連入 VPS 的 `22` 端口。
3. `HOSTINGER_VPS_SSH_KEY` 與 VPS `authorized_keys` 不匹配。

生產 `.env` 需要設定 `VITE_API_BASE_URL=https://api.rankwoven.com`，避免前端容器使用本地開發預設 API 地址。

GA4 分析頁正式讀取 Google Analytics Data API 時，需要在生產 `.env` 或 GitHub Secrets 配置：

```text
GOOGLE_ANALYTICS_PROPERTY_ID=123456789
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/google-service-account.json
```

如部署平台不方便掛載 JSON 文件，可改用其中一種內聯格式：

```text
GOOGLE_APPLICATION_CREDENTIALS_JSON={"client_email":"...","private_key":"..."}
GOOGLE_APPLICATION_CREDENTIALS_BASE64=base64-encoded-service-account-json
```

只需配置其中一種服務帳號來源。服務帳號需要加入 GA4 Property 的 Viewer 或 Analyst 權限；JSON 憑據不得提交到 Git。

### 本機手動部署

手動部署使用同一支腳本：

```bash
DEPLOY_HOST=72.62.253.72 \
DEPLOY_USER=root \
DEPLOY_PATH=/docker/rankwoven \
bash scripts/deploy-production.sh
```

可選環境變量：

| 變量 | 預設值 | 用途 |
|---|---|---|
| `DEPLOY_REF` | `HEAD` | 要部署的 Git ref |
| `DEPLOY_PROFILE` | `data` | Docker Compose profile |
| `DEPLOY_HEALTH_URL` | `https://api.rankwoven.com/health` | 健康檢查 URL |
| `DEPLOY_SMOKE_URL` | `https://api.rankwoven.com/api/v1/site-connections` | 冒煙測試 URL |
| `DEPLOY_BACKUP_DIR` | `/docker/backups` | 生產配置備份目錄 |
| `DEPLOY_DATABASE_BACKUP_DIR` | `/docker/backups/database` | 生產資料庫備份目錄 |

## 資料庫備份與遷移

資料庫 schema 變更使用版本化 SQL 文件管理：

```text
db/migrations/*.sql
```

本地或生產可執行：

```bash
npm run db:backup
npm run db:migrate
```

若環境中提供 `DATABASE_URL`，腳本會使用本機 `pg_dump` 和 `psql`；若未提供，腳本會通過 `docker compose exec postgres` 使用 Compose 內的 PostgreSQL 容器。每個 migration 成功後會寫入 `schema_migrations`，避免重複套用。

生產部署腳本會在服務重建前自動：

1. 啟動 PostgreSQL。
2. 等待資料庫 ready。
3. 建立部署前資料庫備份。
4. 套用未執行的 migration。

## 資料庫備份恢復演練

為確保生產環境資料可恢復，建議定期執行備份恢復演練。以下為標準演練步驟：

### 演練前檢查

```bash
# 確認最新備份文件存在
ssh root@72.62.253.72 ls -la /docker/backups/database/

# 確認備份文件大小非零
ssh root@72.62.253.72 "du -sh /docker/backups/database/"
```

### 本地恢復驗證演練

```bash
# 1. 複製生產備份到本地
scp root@72.62.253.72:/docker/backups/database/rankwoven-最新日期.dump /tmp/

# 2. 啟動本地 PostgreSQL（或 Docker PostgreSQL）
docker compose --profile data up -d postgres && sleep 5

# 3. 創建臨時恢復數據庫
docker compose exec -T postgres psql -U aieo -c "DROP DATABASE IF EXISTS aieo_restore_test;"
docker compose exec -T postgres psql -U aieo -c "CREATE DATABASE aieo_restore_test;"

# 4. 恢復備份到臨時數據庫
cat /tmp/rankwoven-*.dump | docker compose exec -T postgres pg_restore -U aieo -d aieo_restore_test --clean --if-exists

# 5. 驗證數據完整性
docker compose exec -T postgres psql -U aieo -d aieo_restore_test -c "SELECT count(*) FROM site_connections;"
docker compose exec -T postgres psql -U aieo -d aieo_restore_test -c "SELECT count(*) FROM optimization_suggestions;"
docker compose exec -T postgres psql -U aieo -d aieo_restore_test -c "SELECT count(*) FROM sync_tasks;"

# 6. 執行 migration 驗證 schema 一致性
# DATABASE_URL 指向臨時數據庫後執行
DATABASE_URL="postgresql://aieo:aieo@localhost:5432/aieo_restore_test" npm run db:migrate

# 7. 清理臨時數據庫
docker compose exec -T postgres psql -U aieo -c "DROP DATABASE IF EXISTS aieo_restore_test;"
rm /tmp/rankwoven-*.dump
```

### VPS 上直接恢復演練

```bash
ssh root@72.62.253.72 <<'EOF'
  cd /docker/rankwoven

  # 1. 確認最新備份
  LATEST_BACKUP=$(ls -t /docker/backups/database/rankwoven-*.dump 2>/dev/null | head -1)
  echo "Latest backup: $LATEST_BACKUP"

  # 2. 創建恢復測試數據庫
  docker compose exec -T postgres psql -U aieo -c "DROP DATABASE IF EXISTS aieo_drill_test;"
  docker compose exec -T postgres psql -U aieo -c "CREATE DATABASE aieo_drill_test;"

  # 3. 恢復
  cat "$LATEST_BACKUP" | docker compose exec -T postgres pg_restore -U aieo -d aieo_drill_test --clean --if-exists

  # 4. 校驗
  docker compose exec -T postgres psql -U aieo -d aieo_drill_test -c "
  SELECT
    (SELECT count(*) FROM site_connections) AS sites,
    (SELECT count(*) FROM sync_tasks) AS tasks,
    (SELECT count(*) FROM optimization_suggestions) AS suggestions;
  "

  # 5. 清理
  docker compose exec -T postgres psql -U aieo -c "DROP DATABASE IF EXISTS aieo_drill_test;"
EOF
```

### 演練頻率建議

| 環境 | 頻率 | 方式 |
|------|------|------|
| 生產部署後 | 每次部署後 | 部署腳本自動備份 + 基本校驗 |
| 手動演練 | 每兩週 | 本地或 VPS 恢復演練 |
| 重大 schema 變更前 | 變更前後各一次 | VPS 上完整恢復演練 |

### 演練記錄

每次演練後應在 VPS `/docker/backups/database/drill-log.txt` 記錄：

```text
日期 時間 | 備份文件 | 恢復數據庫 | 校驗結果 | 備註
YYYY-MM-DD HH:MM | rankwoven-YYYYMMDDHHMMSS.dump | aieo_drill_test | PASS/FAIL | 校驗通過，sites=N,tasks=N,suggestions=N
```

## 回滾方式

每次部署會在 VPS 建立：

- 配置備份：`/docker/backups/rankwoven-config-YYYYMMDDHHMMSS.tgz`
- 資料庫備份：`/docker/backups/database/rankwoven-YYYYMMDDHHMMSS.dump`
- 上一版代碼目錄：`/docker/rankwoven-old-YYYYMMDDHHMMSS`
- 當前部署版本記錄：`/docker/rankwoven/.deploy-version`

如需回滾，先確認舊目錄，再在 VPS 上執行：

```bash
cd /docker
mv rankwoven rankwoven-bad-$(date +%Y%m%d%H%M%S)
mv rankwoven-old-YYYYMMDDHHMMSS rankwoven
cd /docker/rankwoven
docker compose --profile data up -d --build
```

若需要回復資料庫，先確認目標備份，再使用 PostgreSQL `pg_restore`。正式執行前應先在新資料庫或 staging 環境驗證：

```bash
docker compose exec -T postgres pg_restore -U aieo -d aieo --clean --if-exists < /docker/backups/database/rankwoven-YYYYMMDDHHMMSS.dump
```

回滾後必須重新驗證：

```bash
curl -fsS https://api.rankwoven.com/health
curl -fsS https://api.rankwoven.com/api/v1/site-connections
```

## 安全掃描

本地或 CI 均使用：

```bash
npm run security:audit
```

注意：部分 npm mirror 不支援 audit endpoint，因此此命令固定使用 `https://registry.npmjs.org`。如掃描再次出現 high 或 critical，需要先判斷是否屬於開發依賴，然後以最小升級範圍修復並跑完整驗證。
