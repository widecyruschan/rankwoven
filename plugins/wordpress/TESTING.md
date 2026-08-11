# RankWoven SEO WordPress 插件本地測試文件

此文件說明如何在本機 Docker Desktop 環境測試 `rankwoven-seo` 插件。測試站點使用 `cyruschan.com` 本地 Docker WordPress，SaaS 後端使用 AIEO 倉庫的 Docker Compose 服務。

## 環境總覽

| 項目 | 值 |
|---|---|
| 插件源碼（source of truth） | `/Volumes/Extreme SSD/gitCode/AIEO/plugins/wordpress/rankwoven-seo/rankwoven-seo.php` |
| 測試站插件目錄 | `/Volumes/Extreme SSD/gitCode/cyruschan.com/wp-content/plugins/rankwoven-seo/` |
| WordPress 前台 | `http://localhost:8088` |
| WordPress 登入入口 | `http://localhost:8088/cyrus/`（啟用了 WPS Hide Login，`wp-login.php` 返回 404） |
| WordPress 後台 | 登入後進入 `http://localhost:8088/wp-admin/` |
| WordPress 容器 | `cyruschan-wp`（`wordpress:6.7.2-php8.2-apache`） |
| WordPress 資料庫 | MariaDB，`127.0.0.1:3308`，容器 `cyruschan-wp-db` |
| RankWoven API（宿主機） | `http://localhost:3011` |
| RankWoven API（WordPress 容器內訪問） | `http://host.docker.internal:3011` |
| RankWoven Web | `http://localhost:8080` |

本機測試帳號請參考 `cyruschan.com/DOCKER-README.md`，不要把任何帳號密碼寫入本倉庫其他文件或提交記錄。

## 前置條件

1. 啟動 RankWoven 後端（含 PostgreSQL 和 Redis）：

   ```bash
   cd "/Volumes/Extreme SSD/gitCode/AIEO"
   docker compose --profile data up -d --build
   curl -fsS http://localhost:3011/health
   ```

2. 啟動測試站 WordPress：

   ```bash
   cd "/Volumes/Extreme SSD/gitCode/cyruschan.com"
   docker compose up -d db wordpress
   docker compose ps
   ```

3. 確認插件已啟用：

   ```bash
   docker compose run --rm wpcli wp plugin list --allow-root
   ```

## 插件同步流程

測試站插件目錄不是 bind mount 到 AIEO 倉庫，每次修改插件源碼後必須手動同步：

```bash
cp "/Volumes/Extreme SSD/gitCode/AIEO/plugins/wordpress/rankwoven-seo/rankwoven-seo.php" \
   "/Volumes/Extreme SSD/gitCode/cyruschan.com/wp-content/plugins/rankwoven-seo/rankwoven-seo.php"

cp "/Volumes/Extreme SSD/gitCode/AIEO/plugins/wordpress/rankwoven-seo/assets/editor-seo.js" \
   "/Volumes/Extreme SSD/gitCode/cyruschan.com/wp-content/plugins/rankwoven-seo/assets/editor-seo.js"

cp "/Volumes/Extreme SSD/gitCode/AIEO/plugins/wordpress/rankwoven-seo/assets/admin.css" \
   "/Volumes/Extreme SSD/gitCode/cyruschan.com/wp-content/plugins/rankwoven-seo/assets/admin.css"
```

同步後執行 PHP 語法檢查並重啟容器：

```bash
docker exec cyruschan-wp php -l /var/www/html/wp-content/plugins/rankwoven-seo/rankwoven-seo.php
docker restart cyruschan-wp
```

驗證兩邊文件一致：

```bash
diff "/Volumes/Extreme SSD/gitCode/AIEO/plugins/wordpress/rankwoven-seo/rankwoven-seo.php" \
     "/Volumes/Extreme SSD/gitCode/cyruschan.com/wp-content/plugins/rankwoven-seo/rankwoven-seo.php" \
  && echo SAME || echo DIFF

diff "/Volumes/Extreme SSD/gitCode/AIEO/plugins/wordpress/rankwoven-seo/assets/admin.css" \
     "/Volumes/Extreme SSD/gitCode/cyruschan.com/wp-content/plugins/rankwoven-seo/assets/admin.css" \
  && echo SAME || echo DIFF
```

若後台看不到最新改動，先確認上述 `diff` 為 `SAME`，再清除瀏覽器快取或重新登入 WordPress。

## 手動測試清單

每次修改插件後，按改動範圍抽取以下項目測試。發版前建議全量走一遍。

### 1. 啟用與基礎設定

- [ ] 後台 `Plugins` 頁能看到並啟用 `RankWoven SEO`，無 PHP 警告或白屏。
- [ ] WordPress 後台側欄出現 `RankWoven SEO` 主選單，`儀表板`、`一般設定`、`搜尋外觀`、`網站地圖`、`Link Assistant`、`SEO 分析`、`工具類` 和 `診斷` 子選單可正常切換。
- [ ] `RankWoven SEO` 後台頁載入卡片化 UI：頂部 hero、連線狀態 pill、圓角 tabs、儀表板指標卡與快速操作按鈕樣式正常。
- [ ] `Settings -> RankWoven SEO` 舊入口仍可打開並導向一般設定頁。
- [ ] API Base URL 填 `http://host.docker.internal:3011` 並保存成功。
- [ ] 保存 GA4 Property ID、WordPress 管理員用戶名和 Application Password 後重新打開頁面，值正確回顯（Application Password 不得明文回顯）。

### 2. 站點連接

- [ ] 點擊 `Connect This Site`，成功取得 `Site ID` 和 `Site Token`。
- [ ] 在 RankWoven Web（`http://localhost:8080`）站點列表能看到新連接的站點。
- [ ] Token 錯誤時（手動改壞 Site Token 再同步），插件提示 `SITE_TOKEN_INVALID` 並引導重新連接。

### 3. 同步任務

- [ ] 點擊手動同步，插件建立同步任務並分頁推送文章、頁面、Portfolio、商品和媒體批次。
- [ ] 同步完成後顯示最近同步時間、文章數、媒體數、頁數、同步模式和任務 ID。
- [ ] 再次同步時使用 `updatedAfter` 增量模式（首次為全量）。
- [ ] RankWoven Web `/app/tasks` 任務列表能看到對應任務且狀態為完成。
- [ ] RankWoven Web 的同步內容中能保留 `post`、`page`、`portfolio`、`product` 類型，未啟用的 post type 不應造成同步失敗。

### 4. 圖片屬性與批量更新

- [ ] `Image Attributes` 頁籤保存規則後，上傳新圖片自動生成標題、Alt Text、Caption、Description（例如 `a-lot_like_love.jpg -> A Lot Like Love`）。
- [ ] `Bulk Updater` 先執行 `Test Bulk Updater` 只更新一張並檢查結果。
- [ ] `Run Bulk Updater` 每批最多 50 張，`Reset Counter` 後可從頭再跑。

### 5. 只讀診斷頁

- [ ] `Diagnostics` 頁籤顯示 API 連通性、Site ID / Token 配置狀態、GA4、最近同步統計和 Application Password 配置狀態。
- [ ] 頁面不顯示完整 Site Token 和 Application Password 明文。

### 6. 站點側 REST API

先在插件後台取得 `Site Token`，然後在宿主機測試（將 `<SITE_TOKEN>` 換成實際值，勿寫入任何倉庫文件）：

```bash
curl -fsS -H "Authorization: Bearer <SITE_TOKEN>" \
  "http://localhost:8088/wp-json/rankwoven/v1/site"

curl -fsS -H "Authorization: Bearer <SITE_TOKEN>" \
  "http://localhost:8088/wp-json/rankwoven/v1/posts?page=1&perPage=5"

curl -fsS -H "Authorization: Bearer <SITE_TOKEN>" \
  "http://localhost:8088/wp-json/rankwoven/v1/media?page=1&perPage=5"
```

- [ ] 無 Token 或錯誤 Token 時返回 401 / 403。
- [ ] `updatedAfter` 過濾生效（帶未來時間應返回空列表）。
- [ ] `/wp-json/rankwoven/v1/posts` 回傳資料包含存在於測試站的 `post`、`page`、`portfolio` 和 `product` 類型；商品與 Portfolio 的公開分類 / 標籤會同步到 `categories` / `tags`，供內部連結建議使用。

### 7. 建議寫回（apply）

- [ ] 在 RankWoven Web 批准一條建議並在 `/app/apply` 套用，Worker 通過 Application Password 寫回 WordPress。
- [ ] WordPress 端修改記錄的作者為配置的管理員帳號。
- [ ] 寫回前快照 `before_value` 為 WordPress 當前真實值（可用回滾驗證）。

### 8. 內部連結建議

- [ ] 在插件端完成文章、頁面、Portfolio、商品同步後，進入 RankWoven Web `/app/links`。
- [ ] 選擇目標站點並點擊「生成內部連結建議」，列表顯示來源內容、目標內容、錨文本、相關性和推薦理由。
- [ ] 勾選多條待處理建議後批量套用，來源內容應插入 `data-rankwoven-internal-link="true"` 的延伸閱讀段落。
- [ ] 已經連到同一目標 URL 的來源內容不應重複產生相同內部連結建議。
- [ ] 寫回後在 WordPress 編輯頁或前台檢查連結指向正確目標，並確認可通過既有快照流程回滾。

### 9. 編輯頁 SEO 面板

- [ ] 文章、頁面、Portfolio 和商品新增/編輯頁都能看到 `RankWoven SEO` 面板。
- [ ] 輸入 `Focus keyphrase` 後，點擊 `Generate & Apply SEO` 能生成並套用 SEO title、Slug 和 Meta description。
- [ ] `Content SEO score` 會按當前內容即時計算並更新分數。
- [ ] 面板中的分析結果會更新，且 Slug 會同步到當前內容。
- [ ] 點擊 `Save SEO Fields` 會保存手動編輯的 SEO 欄位，並重新分析當前內容 SEO 分數。
- [ ] 直接點擊 WordPress 原生 `Update` / `Publish` 後重新打開編輯頁，Keywords 仍能正確回顯。
- [ ] 沒有 RankWoven 站點連接時，`Generate & Apply SEO` 會停用，但手動保存仍可正常使用。
- [ ] 重新打開編輯頁後，已保存的 SEO title / Meta description / Keywords 能正確回顯。
- [ ] 打開已保存的前台頁面原始碼，`<head>` 內包含對應的 `meta name="description"` 和 `meta name="keywords"`。
- [ ] 若內容有特色圖片，前台 `<head>` 內包含 Google+ itemprop、Weibo、Twitter Card、LinkedIn / Facebook Open Graph 圖片標籤。
- [ ] 在插件設定保存 Twitter/X Username 或 Facebook App ID 後，前台 `<head>` 內包含 `twitter:site`、`twitter:creator` 或 `fb:app_id`，且不出現 `@username` / `APP ID` placeholder。

### 10. 內容類型 Meta 預設

- [ ] `RankWoven SEO -> 搜尋外觀` 頁籤可正常顯示 `post`、`page`、`portfolio` 和 `product` 的模板區塊。
- [ ] 為不同內容類型保存 `SEO Title Template`、`Meta Description Template` 和 `Meta Keywords Template` 後重新打開頁面，值可正確回顯。
- [ ] `{{title}}`、`{{excerpt}}`、`{{focus_keyphrase}}`、`{{site_name}}`、`{{slug}}`、`{{post_type}}`、`{{post_type_label}}` 占位符可在前台單篇頁面正常展開。
- [ ] 單篇文章若已保存自己的 SEO title / Meta description / Keywords，仍優先使用單篇值，不會被內容類型預設蓋掉。
- [ ] 未保存單篇 SEO 欄位時，前台 `<head>` 會使用對應內容類型的預設模板輸出 meta。

### 11. Sitemap 與 Google 提交

- [ ] `RankWoven SEO -> 網站地圖` 頁籤可正常顯示 `sitemap.xml` URL 和最近生成 / 提交狀態。
- [ ] 點擊 `Generate sitemap.xml` 後，`/sitemap.xml` 可在前台直接開啟，且 XML 內容包含已發佈的 Posts、Pages、Portfolio 和 Products。
- [ ] 點擊 `Submit to Google` 後，插件會調用 SaaS 後端 `POST /api/v1/site-connections/:siteId/search-console/sitemaps`，並使用 Google Search Console API 提交 `sitemap.xml`。
- [ ] `robots.txt` 動態輸出包含 `Sitemap: <URL>` 行。

## 回歸重點

改動以下區域時必測對應項目：

| 改動區域 | 必測項目 |
|---|---|
| 設定頁 / 選項保存 | 清單 1、2 |
| 同步邏輯 / 批次推送 | 清單 3 |
| 圖片屬性 / Bulk Updater | 清單 4 |
| REST API 路由 | 清單 6 |
| 寫回 / Application Password | 清單 7 |
| 內部連結生成 / 多選套用 | 清單 3、7、8 |
| 前台 SEO meta 輸出 | 清單 9 |
| 內容類型 Meta 預設 | 清單 10 |
| Sitemap 與 Google 提交 | 清單 11 |
| 任何改動 | PHP 語法檢查 + 後台頁面能打開 |

## 常見問題排錯

- 後台頁面看不到新功能：測試站插件檔案是舊版，按「插件同步流程」重新同步並重啟 `cyruschan-wp`。
- `Connect This Site` 失敗：確認 API Base URL 為 `http://host.docker.internal:3011`（容器內不能用 `localhost:3011`），並確認 `curl http://localhost:3011/health` 通過。
- 同步任務一直排隊：確認 AIEO `worker` 容器在運行（`docker compose ps`），並檢查 `docker compose logs worker`。
- REST API 404：確認插件已啟用，並到 `Settings -> Permalinks` 重新保存一次固定連結刷新 rewrite rules。
- `wp-login.php` 404：正常現象，測試站啟用了 WPS Hide Login，請走 `http://localhost:8088/cyrus/`。
- 資料庫需要重置：按 `cyruschan.com/DOCKER-README.md` 的重新導入流程操作，先 `docker compose down -v`。

## 測試記錄

每輪完整測試後，在 AIEO `README.md` 的「會話總結記錄」中記錄：測試日期、插件版本或 commit、執行的清單章節、發現的問題與修復。
