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
7. 通過後 SSH 到 VPS，備份現有配置，部署 `git archive HEAD` 打包出的乾淨代碼。
8. 執行 `docker compose --profile data up -d --build`。
9. 驗證 `https://api.rankwoven.com/health` 和 `https://api.rankwoven.com/api/v1/site-connections`。

需要的 GitHub Secrets：

| Secret | 用途 |
|---|---|
| `HOSTINGER_VPS_HOST` | Hostinger VPS IP 或主機名 |
| `HOSTINGER_VPS_USER` | SSH 用戶，目前為 `root` |
| `HOSTINGER_VPS_SSH_KEY` | 專用部署私鑰 |
| `HOSTINGER_DEPLOY_PATH` | 部署目錄，預設 `/docker/rankwoven` |

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

## 回滾方式

每次部署會在 VPS 建立：

- 配置備份：`/docker/backups/rankwoven-config-YYYYMMDDHHMMSS.tgz`
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
