---

## HTTPS 是什麼？

**HTTPS（HyperText Transfer Protocol Secure）** 是 HTTP 的加密版本，透過 **SSL/TLS 憑證** 在瀏覽器和伺服器之間建立加密連線。它確保使用者與網站之間傳輸的資料不會被第三方攔截、竄改或偽造。

```
HTTP  → http://example.com   （明文傳輸，不安全）
HTTPS → https://example.com  （加密傳輸，安全）
```

> **關鍵數據：** 截至 2026 年，Google Chrome 中超過 95% 的網頁載入都是透過 HTTPS 進行的。非 HTTPS 網站會在瀏覽器中顯示「不安全」警告。

---

## HTTPS 對 SEO 的影響

### Google 的排名信號
自 2014 年起，HTTPS 被 Google 正式確認為**排名因素**。雖然權重不高（Google 比喻為「tiebreaker」級別），但在 AI 搜尋時代其重要性持續上升：

| 面向 | 影響 |
|------|------|
| **直接排名** | 同等條件下，HTTPS 網站排名優於 HTTP |
| **使用者信任** | 瀏覽器「安全鎖頭」圖標提高點擊率（CTR） |
| **數據完整性** | 確保 Google Analytics、廣告追蹤數據準確 |
| **HTTP/2 支援** | 大部分瀏覽器僅在 HTTPS 上啟用 HTTP/2，大幅提升載入速度 |
| **AMP / PWA** | 許多現代網頁技術要求 HTTPS 才能運作 |

### 安全鎖頭的 CTR 影響

研究顯示：瀏覽器地址欄的 🔒 安全鎖頭能顯著影響點擊行為。顯示「不安全」警告的網站有 **40-60% 的訪客會立即離開**。

---

## SSL / TLS 憑證的運作原理

```
使用者瀏覽器                   網站伺服器
     │                            │
     │── (1) 請求建立安全連線 ────→│
     │←─ (2) 傳送 SSL 憑證 ───────│
     │── (3) 驗證憑證有效性 ────→│
     │←─ (4) 協商加密金鑰 ────→│
     │── (5) 加密資料傳輸 ────→│
```

1. 瀏覽器請求安全連線
2. 伺服器發送 SSL 憑證（含公鑰、域名、發證機構資訊）
3. 瀏覽器驗證憑證是否有效（未過期、由信任機構簽發、域名匹配）
4. 雙方協商對稱加密金鑰
5. 此後所有資料均以加密傳輸

---

## SSL 憑證的三種類型

### 1. DV（Domain Validation，域名驗證）
- **驗證範圍：** 僅驗證域名控制權
- **發證時間：** 數分鐘至數小時
- **適用場景：** 個人部落格、小型網站、測試環境
- **費用：** 免費（Let's Encrypt）至 $10/年
- **瀏覽器顯示：** 🔒 安全鎖頭

### 2. OV（Organization Validation，組織驗證）
- **驗證範圍：** 域名 + 組織合法性
- **發證時間：** 1-3 個工作天
- **適用場景：** 企業官網、中型商業網站
- **費用：** $50-200/年
- **瀏覽器顯示：** 🔒 + 組織名稱

### 3. EV（Extended Validation，擴展驗證）
- **驗證範圍：** 域名 + 嚴格組織審查
- **發證時間：** 3-10 個工作天
- **適用場景：** 銀行、金融機構、大型電商
- **費用：** $200-1000/年
- **瀏覽器顯示：** 🏦 公司名稱（部分瀏覽器已淡化）

> **2026 年趨勢：** EV 憑證的視覺優勢已被大幅削弱，多數瀏覽器已不再特別展示公司名稱。除非行業合規要求，DV 憑證已足夠滿足 SEO 和安全性需求。

---

## Let's Encrypt：免費 SSL 憑證方案

**Let's Encrypt** 是全球最大的免費 SSL 憑證發行機構，由非營利組織 ISRG 營運。截至 2026 年，已發行超過 3 億個憑證。

### 優點
- ✅ 完全免費
- ✅ 自動化部署與續期
- ✅ 全球瀏覽器信任
- ✅ DV 級別驗證

### 限制
- 憑證有效期僅 90 天（需自動續期）
- 僅提供 DV 驗證（無 OV/EV）
- 不支援 Wildcard 以外的多域名（有速率限制）

### 常用部署工具
- **Certbot** — EFF 官方工具，支援 Apache、Nginx、各種 Linux 發行版
- **acme.sh** — 純 Shell 腳本，輕量高效
- **Caddy** — 內建自動 HTTPS，零配置
- **主機面板** — cPanel、Plesk 多已內建 Let's Encrypt 支援

---

## 從 HTTP 遷移到 HTTPS 的完整步驟

### 第一步：獲取並安裝 SSL 憑證
選擇憑證類型後，在你的網頁伺服器（Apache / Nginx / IIS）上安裝憑證。

### 第二步：強制 HTTPS 重定向
```apache
# Apache .htaccess
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
```

```nginx
# Nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri;
}
```

### 第三步：更新內部資源
將所有內部連結、圖片、CSS、JS 的路徑從 `http://` 改為 `https://` 或使用協議相對 URL：

```html
<!-- 改前 -->
<img src="http://example.com/logo.png">

<!-- 改後（推薦） -->
<img src="https://example.com/logo.png">

<!-- 改後（次選 — 協議相對） -->
<img src="//example.com/logo.png">
```

### 第四步：更新 Canonical 標籤
```html
<link rel="canonical" href="https://example.com/page" />
```

### 第五步：更新 Sitemap
確保 Sitemap 中的所有 URL 都是 HTTPS 版本。

### 第六步：設定 HSTS（HTTP Strict Transport Security）
HSTS 是一項安全政策機制，告訴瀏覽器「以後必須用 HTTPS 來訪問這個網站」：

```apache
# Apache
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
```

```nginx
# Nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

| 參數 | 說明 |
|------|------|
| `max-age=31536000` | 有效時間（秒），此例為一年 |
| `includeSubDomains` | 也適用於所有子域名 |
| `preload` | 申請加入瀏覽器的 HSTS Preload 清單 |

### 第七步：更新 Google Search Console
- 新增 HTTPS 版本的網站資源
- 提交新的 HTTPS Sitemap
- 使用「地址變更」工具通知 Google

### 第八步：更新第三方服務
- Google Analytics 網址設定
- 社群媒體分享連結
- 廣告著陸頁 URL
- CDN 設定
- email 簽名檔中的連結

---

## 常見 HTTPS 遷移問題與解決

### 問題 1：混合內容（Mixed Content）警告

這是最常見的遷移問題——HTTPS 頁面中載入了 HTTP 資源（圖片、CSS、JS、iframe）：

```
⚠️ Mixed Content: The page at 'https://example.com' was loaded over HTTPS,
but requested an insecure image 'http://cdn.example.com/photo.jpg'.
```

**解決方式：**
- 更新所有資源 URL 為 HTTPS
- 使用瀏覽器開發者工具的 Security 面板檢查 Mixed Content
- 加入 CSP（Content Security Policy）Header：`upgrade-insecure-requests`

### 問題 2：SSL 憑證鏈不完整
部分瀏覽器報錯「憑證不受信任」，通常是因為中繼憑證未正確安裝。

**解決方式：** 確保伺服器設定中包含完整的憑證鏈（伺服器憑證 + 中繼憑證 + 根憑證）

### 問題 3：301 重定向鏈
```
http://example.com → https://example.com（正確）
http://www.example.com → https://www.example.com → https://example.com（多一跳）
```

**解決方式：** 將所有版本直接 301 重定向到最終的 HTTPS canonical URL，不要經過中間跳轉。

### 問題 4：CDN 與 HTTPS 不相容
部分舊版 CDN 不支援客製化憑證或需要額外設定。

**解決方式：** 選用支援免費 SSL 的 CDN（Cloudflare、CloudFront 等），確認 CDN 層和源站都正確配置 HTTPS。

---

## SSL 憑證健康檢查清單

| 檢查項目 | 工具 / 方法 |
|----------|-------------|
| 憑證是否有效、未過期 | SSL Labs、瀏覽器點擊鎖頭圖標 |
| 憑證是否涵蓋所有域名 | 檢查 www / 裸域 / 子域名 |
| 是否有 Mixed Content | Chrome DevTools → Security 面板 |
| HSTS 是否設定 | Security Headers 檢測工具 |
| 301 重定向是否正確 | 瀏覽器開發者工具 Network 面板 |
| Sitemap URL 是否全為 HTTPS | 手動檢查 Sitemap 檔案 |
| Search Console 是否包含 HTTPS 資源 | GSC 後台確認 |
| 憑證自動續期是否正常 | 檢查 Cron job / Certbot timer |

---

## 總結檢查清單

| 任務 | 說明 |
|------|------|
| ☐ 取得並安裝 SSL 憑證 | Let's Encrypt 免費方案為首選 |
| ☐ 設定 301 重定向 | HTTP → HTTPS（所有版本） |
| ☐ 更新全站資源 URL | 圖片、CSS、JS、iframe 全部 HTTPS |
| ☐ 更新 canonical 標籤 | 指向 HTTPS 版本 |
| ☐ 更新 Sitemap | 所有 URL 為 HTTPS |
| ☐ 設定 HSTS | 加入 `Strict-Transport-Security` Header |
| ☐ 更新 Search Console | 新增 HTTPS 資源，提交新 Sitemap |
| ☐ 更新第三方服務 | GA、廣告、社群媒體、CDN |
| ☐ 設定憑證自動續期 | Cron job 或 Certbot auto-renewal |
| ☐ 監控憑證到期時間 | 設定過期提醒（最佳是到期前 30 天） |

---

| ← [第 30 章：Canonical 標記與重複內容處理](/blog/canonical-duplicate-content) | [回索引](/blog) | [第 32 章：301/302 轉址與 HTTP 狀態碼 →](/blog/redirects-http-status) |
