---

## 網站搬遷的 SEO 風險

**網站搬遷（Site Migration）** 是 SEO 中風險最高的操作之一。如果處理不當，可能導致流量暴跌 50-90%，且需要數月才能恢復。

```
網站搬遷的常見場景：

  1. 域名變更（Domain Change）
     oldsite.com → newsite.hk

  2. 網站改版（Redesign）+ URL 結構改變
     /old-page.html → /new-page/

  3. 平台遷移（Platform Migration）
     WordPress → Shopify / 自訂 CMS

  4. HTTP → HTTPS 遷移
     http://site.com → https://site.com

  5. 子域合併或拆分
     blog.site.com → site.com/blog/
```

> **核心原則：** 網站搬遷的成功關鍵在於**規劃**。臨時抱佛腳的搬遷是不必要的 SEO 自殺。

---

## SEO 搬遷的黃金法則

### 法則 1：建立完整的 URL 映射表

**URL 映射表**是網站搬遷最重要的文件。它記錄了每一個舊 URL 應該導向的新 URL。

```
URL 映射表範例：

| 舊 URL                        | 新 URL                        | 轉址類型 |
|-------------------------------|------------------------------|---------|
| /about-us.html                | /about/                      | 301     |
| /products/shoes/red-sneakers  | /products/red-sneakers/      | 301     |
| /blog/2025/seo-tips           | /blog/seo-tips-2025/         | 301     |
| /contact.php                  | /contact/                    | 301     |
| /old-promotion                | /（首頁）                     | 301     |
| /deleted-product              | 沒有對應頁面                   | 410     |

建立映射表的工具：
  → Screaming Frog（爬取舊網站所有 URL）
  → Google Search Console（導出所有已索引的 URL）
  → Google Analytics（導出所有有流量的 URL）
  → Ahrefs / Semrush（導出所有有反向連結的 URL）
```

### 法則 2：使用 301 永久轉址

```
301 轉址是網站搬遷的靈魂：

  301 Moved Permanently：
    → 告知 Google：「這個頁面永久搬遷到新地址」
    → 傳遞約 90-95% 的連結權重（Link Juice）
    → 將使用者和爬蟲導向新地址

  302 Found（臨時轉址）：
    → 只在測試期間使用
    → Google 不會傳遞連結權重
    → 上線後必須改成 301

  307 Temporary Redirect：
    → 與 302 類似
    → 只在測試期間使用

搬遷上線時：
  ✅ 所有轉址必須是 301，不是 302！
  ✅ 測試所有轉址是否正確運作
  ✅ 絕對不要使用 Meta Refresh 或 JavaScript 轉址
```

### 法則 3：轉址鏈不要超過一層

```
❌ 錯誤：多重轉址鏈
  /old-page → 301 → /interim-page → 301 → /new-page
  每多一次轉址，就損失更多連結權重。

✅ 正確：直接轉址
  /old-page → 301 → /new-page
  一對一轉址，不損失權重。
```

---

## 搬遷前準備（第 1-2 週）

### Step 1：基準線測量

```
搬遷前記錄你的 SEO 基準數據：

  ☐ 每日自然流量（Google Analytics / GA4）
  ☐ 主要關鍵字排名（Ahrefs / Semrush）
  ☐ 已索引的頁面數量（Google Search Console）
  ☐ 網站的平均載入速度（PageSpeed Insights）
  ☐ 核心頁面的排名（首頁、主要服務頁面、主要產品頁面）
  ☐ 反向連結總數和主要來源（Ahrefs / Semrush）
  ☐ 網站的 Sitemap

目的：搬遷後如果出現流量下降，這些基準數據可以幫助你判斷
     是正常的短暫波動（1-2 週），還是真正的 SEO 問題。
```

### Step 2：全面爬取舊網站

```
使用 Screaming Frog 或類似工具：

  匯出：
  ☐ 所有可訪問的 URL（包含 HTTP 狀態碼）
  ☐ 所有有反向連結的 URL（從 Ahrefs / Semrush 交叉比對）
  ☐ 所有在 Search Console 中「已索引」的 URL
  ☐ 所有在 GA4 中「有流量」的 URL
  ☐ 所有頁面的 Title Tag 和 Meta Description

合併以上來源 → 建立完整的舊 URL 清單
```

### Step 3：規劃新 URL 結構

```
設計新網站的 URL 結構時：

  ✅ 保持簡短和描述性
     /products/red-sneakers/ 比 /p/12345/ 好

  ✅ 包含關鍵字（但不要關鍵字堆砌）
     /hong-kong-dental-services/ 比 /services/ 好

  ✅ 使用連字號（-）分隔詞語
     /red-sneakers/（不是 /red_sneakers/ 或 /redsneakers/）

  ✅ 保持一致性
     不要同時使用 /category/product 和 /product-category

  ✅ 如果可能，保持舊 URL 結構不變
     不改變 URL = 不需要 301 轉址 = 零 SEO 風險
```

### Step 4：建立 301 轉址映射表

```
映射表的優先級：

  優先級 1（必須映射）：
    → 有大量自然流量的頁面
    → 有反向連結的頁面
    → 在 Search Console 中排名前 10 的頁面

  優先級 2（應該映射）：
    → 所有其他有內容的頁面
    → 被 Google 索引的頁面

  優先級 3（可選）：
    → 從來沒有流量、沒有反向連結的頁面
    → 可以選擇不映射（讓它們回傳 404 或 410）
```

---

## 搬遷中執行（第 3 週）

### Step 5：在測試環境中驗證

```
上線前在 Staging / 測試環境中檢查：

  ☐ 所有頁面都能正常載入？
  ☐ 所有 301 轉址都正確運作？（使用 Screaming Frog 爬取舊 URL，確認得到 301 和正確的新 URL）
  ☐ 沒有轉址鏈（舊 URL → 301 → 新 URL，不是舊 → 舊 → 新）
  ☐ Canonical 標籤正確？（新頁面的 Canonical 指向自己）
  ☐ hreflang 標籤正確？（如果有多語言版本）
  ☐ Schema 結構化資料正確？
  ☐ robots.txt 和 Sitemap 指向新 URL？
  ☐ 內部連結都更新到新 URL？
```

### Step 6：封鎖測試環境

```
在測試期間，確保 Google 不會索引測試網站：

  Staging / 測試環境的 robots.txt：
    User-agent: *
    Disallow: /

  或在測試環境的所有頁面加入：
    <meta name="robots" content="noindex, nofollow" />

  或對測試環境設置密碼保護（HTTP Basic Auth）。
```

### Step 7：設定 Sitemap 和 robots.txt（新網站）

```
新網站的 robots.txt：
  User-agent: *
  Allow: /
  Sitemap: https://newsite.com/sitemap_index.xml

新網站的 Sitemap：
  → 包含所有新 URL
  → 不要包含任何舊 URL
  → 確認 <lastmod> 標記為搬遷日期
```

### Step 8：切換上線

```
上線日的工作序列：

  1. 將新網站部署到正式環境
  2. 確認新網站在正式環境正常運作
  3. 實施所有 301 轉址（一次性全部上線）
  4. 在 Search Console 中提交新網站的 Sitemap
  5. 如果需要域名變更，在 Search Console 使用「地址變更」工具
  6. 驗證：使用 Screaming Frog 爬取舊 URL → 確認得到 301 + 正確的新 URL
```

---

## 搬遷後監控與修復（第 4-8 週）

### 第一週：密集監控

```
每日檢查：
  ☐ Search Console → 索引涵蓋範圍（有沒有錯誤急升？）
  ☐ Search Console → Sitemap 處理狀態（新 URL 是否被發現？）
  ☐ Google Analytics → 自然流量（有沒有暴跌？）
  ☐ 排名追蹤工具 → 主要關鍵字排名（有沒有急降？）
  ☐ 搜尋你的品牌名稱 → 確保新網站出現在第一頁

預期波動：
  → 搬遷後 1-2 週內，排名和流量會有一些波動，這是正常的
  → 如果 3-4 週後仍然沒有恢復，可能有問題需要排查
```

### 第 2-4 週：修正問題

```
常見的搬遷後問題和修復：

問題：大量 404 錯誤
  → 檢查轉址映射表是否有遺漏
  → 使用 Search Console 的 404 報告找出被遺漏的 URL
  → 補充缺失的 301 轉址

問題：流量明顯下降（> 30%）
  → 檢查是否所有轉址都是 301（不是 302）
  → 檢查轉址鏈（不要有超過 1 層的轉址）
  → 確認新網站沒有被 robots.txt 意外封鎖
  → 確認沒有意外的 noindex 標籤
  → 檢查 Sitemap 是否正確提交

問題：新頁面未被索引
  → 確認頁面在 Sitemap 中
  → 使用 Search Console 的 URL 檢查工具手動請求索引
  → 確保內部連結結構清晰，沒有孤兒頁面
```

### 第 4-8 週：持續監控和優化

```
☐ 監控流量恢復情況
☐ 檢查排名是否回到搬遷前水平
☐ 審查內部連結（確保沒有指向舊 URL 的內部連結）
☐ 更新外部反向連結（聯繫對方更新連結到新 URL）
☐ 檢查 Sitemap 處理狀態
☐ 確認舊 URL 的索引已經被轉移到新 URL
```

---

## Search Console 的「地址變更」工具

### 如果同樣域名（例如 .com → .hk）

```
使用 Search Console 的地址變更工具：

  前提條件：
  ✅ 你必須擁有新舊兩個域名的 Search Console 權限
  ✅ 所有頁面使用 301 轉址從舊域名導向新域名
  ✅ 新網站的內容應與舊網站對應

操作步驟：
  1. 進入舊域名的 Search Console
  2. 設定 → 地址變更
  3. 選擇新域名
  4. 提交變更

Google 會：
  → 加速將索引從舊域名轉移到新域名
  → 傳遞排名訊號
  → 這通常需要數週到數月的時間
```

### 如果是同一域名但 URL 結構改變

```
不需要使用「地址變更」工具。
只需：
  ✅ 實施 301 轉址（舊 URL → 新 URL）
  ✅ 提交新 Sitemap
  ✅ 讓 Google 自然爬取和更新索引
```

---

## HTTPS 遷移的特別注意事項

```
HTTP → HTTPS 遷移是常見的搬遷類型，有特別的注意事項：

  ✅ 確保 SSL 憑證正確安裝（沒有混合內容警告）
  ✅ 網站上所有資源（圖片、CSS、JS）都使用 HTTPS
  ✅ 內部連結更新為 HTTPS（不要依賴 301 轉址處理內部連結）
  ✅ Canonical URL 從 http:// 改為 https://
  ✅ Sitemap 中的 URL 改為 https://
  ✅ hreflang 標籤中的 URL 改為 https://
  ✅ 在 Search Console 中將新 HTTPS 屬性設為主要屬性

  ❌ 不要同時變更 URL 結構和進行 HTTPS 遷移！
     → 一次只做一個重大變更
     → 兩個變更一起做 = 排查問題時極難定位原因
```

---

## 常見搬遷錯誤

| 錯誤 | 後果 | 防範方法 |
|------|------|---------|
| 沒有建立 URL 映射表 | 大量 404，流量暴跌 | 搬遷前完成映射表 |
| 轉址用了 302 而不是 301 | 連結權重無法傳遞 | 上線前測試所有轉址的 HTTP 狀態碼 |
| 轉址鏈太長 | 權重層層損失 | 確保所有轉址是直接的一對一映射 |
| 忘記加入 Canonical | 重複內容問題 | 上線前檢查每個頁面的 Canonical |
| robots.txt 封鎖了新網站 | 整個網站不被爬取 | 確認 robots.txt 沒有 Disallow: / |
| Sitemap 包含舊 URL | 混亂的索引訊號 | 提交只包含新 URL 的 Sitemap |
| 內部連結指向舊 URL | 爬取混亂、使用者 404 | 搬遷後爬取網站，檢查內部連結 |
| 測試環境沒有封鎖 | Google 索引了測試網站 | 使用 noindex 或 robots.txt 封鎖 |
| 外鏈沒有更新 | 反向連結價值流失 | 聯繫重要的外鏈來源更新連結 |
| HTTPS 混合內容 | 瀏覽器警告、信任度下降 | 確保所有資源使用 HTTPS |

---

## 網站搬遷 SEO 檢查清單

### 搬遷前

| 任務 | 說明 |
|------|------|
| ☐ 記錄 SEO 基準數據 | 流量、排名、索引數量、反向連結 |
| ☐ 爬取舊網站所有 URL | Screaming Frog / Search Console / Analytics |
| ☐ 建立 URL 映射表 | 每個舊 URL 對應新 URL |
| ☐ 設計新 URL 結構 | 保持簡短、描述性、一致性 |
| ☐ 準備 301 轉址規則 | Regex 規則或逐一映射 |
| ☐ 封鎖測試環境 | robots.txt Disallow 或 noindex |

### 搬遷中（上線日）

| 任務 | 說明 |
|------|------|
| ☐ 部署新網站 | 確認正式環境正常運作 |
| ☐ 實施所有 301 轉址 | 一次性全部上線，確認都是 301 |
| ☐ 提交新 Sitemap | Search Console 中提交 |
| ☐ 使用地址變更工具（如適用） | 僅在域名變更時使用 |
| ☐ 快速驗證 | 爬取舊 URL，確認得到正確的 301 |
| ☐ 檢查 robots.txt | 確保沒有意外封鎖 |

### 搬遷後（第 1-8 週）

| 任務 | 說明 |
|------|------|
| ☐ 每日監控 Search Console | 索引錯誤、爬取錯誤 |
| ☐ 監控流量和排名 | 與搬遷前基準數據對比 |
| ☐ 修復 404 錯誤 | 根據 Search Console 報告補充轉址 |
| ☐ 更新內部連結 | 確認沒有指向舊 URL |
| ☐ 聯繫重要外鏈來源 | 請求更新連結到新 URL |
| ☐ 持續監控 4-8 週 | 確保流量恢復到搬遷前水平 |

---

| ← [第 56 章：Crawl Budget 爬取預算優化](/blog/crawl-budget) | [回索引](/blog) | [第 58 章：AI 時代 SEO 全景 →](/blog/ai-search-seo) |
