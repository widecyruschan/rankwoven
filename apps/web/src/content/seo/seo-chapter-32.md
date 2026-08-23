---

## HTTP 狀態碼概述

每當瀏覽器向伺服器發出請求時，伺服器會返回一個三位數的 **HTTP 狀態碼** 來說明請求的結果。對 SEO 來說，理解這些狀態碼至關重要，因為它們直接影響搜尋引擎如何索引和排名你的頁面。

### 五大分類

| 類別 | 範圍 | 含義 | SEO 影響 |
|------|------|------|----------|
| **1xx** | 100-199 | 資訊回應 | 無直接影響 |
| **2xx** | 200-299 | 成功 | ✅ 正常，可索引 |
| **3xx** | 300-399 | 重新導向 | ⚠️ 需正確設定 |
| **4xx** | 400-499 | 用戶端錯誤 | ❌ 需修復 |
| **5xx** | 500-599 | 伺服器錯誤 | 🔴 緊急修復 |

---

## SEO 相關重點狀態碼

### 200 OK — 一切正常
頁面成功載入，可以正常被索引。這是所有重要頁面應該返回的狀態碼。

### 301 Moved Permanently — 永久重定向
告訴搜尋引擎：「這個頁面**永遠**搬到新地址了，以後請直接去新地址，把排名權重也帶過去。」

```nginx
# Nginx 301 重定向
rewrite ^/old-page$ /new-page permanent;
```

```apache
# Apache .htaccess 301 重定向
Redirect 301 /old-page https://example.com/new-page
```

**301 對 SEO 的影響：**
- ✅ 將 90-99% 的 PageRank 傳遞給目標 URL
- ✅ Google 會在索引中替換舊 URL 為新 URL
- ✅ 適用於：網址結構改版、HTTP→HTTPS 遷移、域名更換

### 302 Found — 暫時重定向
告訴搜尋引擎：「這個頁面**暫時**搬到新地址，舊地址還是主人，排名權重請保留在舊地址。」

```
# Nginx 302 重定向
rewrite ^/promo$ /special-offer redirect;
```

**302 對 SEO 的影響：**
- ⚠️ 排名權重**不會**傳遞給目標 URL，保留在原始 URL
- ⚠️ Google 可能繼續索引原始 URL
- 適用於：暫時的促銷頁面、A/B 測試、維護中的頁面臨時替換

> **⚠️ 常見錯誤：** 將永久性的 URL 變更誤用 302。如果 SEO 想長期改網址，用 301；如果只是暫時性的改動，用 302。

### 307 Temporary Redirect / 308 Permanent Redirect
- **307**：與 302 類似（暫時），但保證請求方法不變（POST 仍為 POST）
- **308**：與 301 類似（永久），但保證請求方法不變

對 SEO 來說，307 等同 302，308 等同 301。

### 404 Not Found — 頁面不存在
請求的頁面不存在於伺服器上。這是最常見的用戶端錯誤。

**404 對 SEO 的影響：**
- ⚠️ 一定數量的 404 是正常的（Google 不會因此懲罰網站）
- ❌ 大量 404 會浪費 crawl budget
- ❌ 如果外部連結指向 404 頁面，失去了這些連結的 SEO 價值

**處理 404 的策略：**

| 情境 | 做法 |
|------|------|
| 有替代頁面 | 301 重定向到最相關的頁面 |
| 產品永久下架 | 301 到上層分類頁；或在 404 頁面顯示推薦商品 |
| 內容真的不存在 | 返回真實的 404（不要軟 404） |
| 大量 404 的舊網站 | 優先修復有外部連結指向的 404 |

### 軟 404（Soft 404）
伺服器返回 200 OK，但頁面內容顯示「找不到」、「無結果」等訊息。Google 會將其歸類為軟 404，並停止索引。

**解決方式：** 讓真正的「無內容頁」返回 404 或 410 狀態碼，而非 200。

### 410 Gone — 頁面已永久刪除
比 404 更強烈的信號：「這個頁面曾經存在，但已經被**永久刪除**」。

- Google 會比 404 更快地從索引中移除 410 頁面
- 適用於：明確不再需要的內容、依法需刪除的內容

### 500 Internal Server Error — 伺服器錯誤
伺服器遇到未預期的錯誤，無法完成請求。

**SEO 影響：**
- 🔴 如果 Googlebot 造訪時返回 500，該頁面可能從索引中移除
- 🔴 大量或長時間的 500 錯誤會導致排名下降
- 🔴 若持續超過 1-2 天未修復，Google 可能認為網站不可靠

### 503 Service Unavailable — 服務暫時不可用
伺服器暫時無法處理請求（通常因為維護或過載）。

- ⚠️ 503 表示「暫時」問題，Google 會稍後再試
- ⚠️ 如果 503 狀態持續數天，Google 會開始將其視為永久性問題

---

## 301 重定向的 SEO 最佳實踐

### 1. 直接重定向，避免鏈條
```bash
# ❌ 錯誤 — 重定向鏈
http://example.com → https://example.com → https://www.example.com → https://newdomain.com

# ✅ 正確 — 直接跳到最終目的地
http://example.com → https://newdomain.com
```
每多一跳，PageRank 就會額外衰減，也會增加載入時間。

### 2. 重定向到相關頁面，非首頁
```bash
# ❌ 錯誤
/old-product-page → / （全部導向首頁）

# ✅ 正確
/old-product-page → /similar-new-product
/old-category/old-product → /new-category/new-product
```

把所有死連結全部導向首頁（blob redirect）會讓 Google 將它們視為 soft 404，失去 SEO 價值。

### 3. 大規模重定向的規劃
網站改版、遷移時，使用以下工具規劃：
- **Screaming Frog** 爬取舊站所有 URL
- 建立「舊 URL → 新 URL」的 mapping 對照表
- 逐條驗證重定向設定正確
- 在 Search Console 監控「找不到（404）」報告

### 4. 域名更換的遷移流程
1. 新域名設置並安裝 SSL
2. 從舊域名 301 redirect 到新域名（頁面對頁面）
3. 在 Google Search Console 使用「地址變更」工具
4. 保留舊域名和 redirect 至少 **一年**（建議永久保留）
5. 更新所有外部平台的連結（社群媒體、目錄網站、合作夥伴）

---

## 重定向的常見方法

### 伺服器層級（最推薦）

```apache
# Apache .htaccess
Redirect 301 /old-page.html https://example.com/new-page
RedirectMatch 301 ^/blog/(.*)$ https://example.com/articles/$1

# 正則表達式批量重定向
RewriteEngine On
RewriteRule ^category-(.*)$ /new-category-$1 [R=301,L]
```

```nginx
# Nginx
rewrite ^/old-page$ /new-page permanent;
rewrite ^/blog/(.*)$ /articles/$1 permanent;
```

### PHP 層級（不得已才用）
```php
<?php
header("HTTP/1.1 301 Moved Permanently");
header("Location: https://example.com/new-page");
exit();
?>
```
SEO 角度不推薦：較慢，且必須確保伺服器層級優先。

### JavaScript 層級（最不推薦）
```javascript
window.location.href = "https://example.com/new-page";
```
Google 可以追蹤 JS 重定向，但比伺服器層級 301 效率差很多。**僅在前端 SPA 中無法用伺服器處理時才考慮。**

### HTML Meta Refresh（過時，不推薦）
```html
<meta http-equiv="refresh" content="0; url=https://example.com/new-page">
```
Google 會將其解釋為重定向，但不傳遞 PageRank，且有延遲。**不建議用於 SEO。**

---

## 重定向策略對比表

| 策略 | PageRank 傳遞 | 索引影響 | 適用場景 |
|------|--------------|----------|----------|
| **301** | 90-99% | 搜尋引擎替換 URL | 永久改版、HTTPS 遷移、域名更換 |
| **302** | 0%（保留在原 URL） | 原始 URL 繼續被索引 | 暫時促銷頁、A/B 測試 |
| **JS 重定向** | 部分傳遞，不穩定 | 可能延遲或失敗 | 僅 SPA 無法伺服器端處理時 |
| **Meta Refresh** | 幾乎不傳遞 | 不推薦用於 SEO | 不建議使用 |
| **Canonical** | 信號而非強制 | 原始 URL 保留在索引 | 多版本頁面共存時 |

---

## 監控與診斷工具

| 工具 | 用途 |
|------|------|
| **Google Search Console** | 查看「找不到（404）」報告、索引涵蓋範圍 |
| **Screaming Frog** | 爬取全站，檢查所有重定向鏈和狀態碼 |
| **Ahrefs Site Audit** | 監控 3xx/4xx/5xx 錯誤、重定向鏈 |
| **curl -I** | 命令列檢查 HTTP 回應頭 |
| **瀏覽器開發者工具** | Network 面板查看實際狀態碼和重定向鏈 |
| **Redirect Path 擴充** | Chrome 擴充，即時顯示重定向路徑 |

### curl 檢測指令
```bash
curl -I https://example.com/old-page
# 檢查回應的 HTTP Status Code 和 Location Header

curl -L -o /dev/null -s -w '%{url_effective}\n' https://example.com
# 追蹤完整的重定向鏈，顯示最終的 URL
```

---

## 總結檢查清單

| 任務 | 說明 |
|------|------|
| ☐ 所有重要頁面返回 200 | 確保沒有主要 URL 返回錯誤狀態碼 |
| ☐ 永久變更使用 301 | 不要誤用 302 處理永久性改動 |
| ☐ 刪除頁面返回 410 或 404 | 不要返回 200 然後顯示「找不到」 |
| ☐ 重定向直接跳最終 URL | 避免重定向鏈（多於一跳） |
| ☐ 404 導向相關頁面 | 不要全部導向首頁 |
| ☐ 監控 Search Console 404 報告 | 每月檢查一次 |
| ☐ 500 錯誤立即修復 | 關鍵頁面 500 影響排名 |
| ☐ 保留舊域名重定向至少一年 | 域名遷移後不要急著關閉舊域名 |
| ☐ 定期爬取全站檢查 | Screaming Frog / Site Audit 每月一次 |
| ☐ 使用伺服器層級重定向 | 不要依賴 JS 或 meta refresh |

---

| ← [第 31 章：SSL 憑證與 HTTPS](/blog/ssl-https-seo) | [回索引](/blog) | [第 33 章：JavaScript SEO 與 Log File 分析 →](/blog/javascript-seo-log-analysis) |
