---

## 什麼是 Sitemap？

**Sitemap（網站地圖）** 是一份列出網站所有重要頁面的檔案，作用是告訴搜尋引擎「我網站上有這些頁面、它們的優先級如何、多久更新一次」。對於大型網站、新網站、或含有大量孤立頁面的網站來說，Sitemap 是確保搜尋引擎能完整索引的關鍵工具。

Google 支援兩種主要格式：

| 格式 | 用途 | 限制 |
|------|------|------|
| **XML Sitemap** | 標準搜尋引擎提交格式，最常用 | 最多 50,000 個 URL / 50MB 未壓縮 |
| **RSS / Atom Feed** | 適合新聞網站、部落格等頻繁更新內容 | 僅含最新內容 |
| **Text Sitemap** | 簡單的 URL 清單（每行一個） | 功能最少，僅基礎 URL 列表 |

> **關鍵認知：** Sitemap 是「建議」而非「命令」。提交 Sitemap 不代表 Google 一定會索引所有頁面，但能大幅提升被發現的效率。

---

## 為什麼 Sitemap 至關重要？

### 1. 加速新頁面被發現
新網站沒有大量外部連結時，Google 很難主動發現所有頁面。Sitemap 直接告訴 Google 該爬取哪些 URL，省去等待自然發現的時間。

### 2. 幫助孤立頁面被索引
某些頁面可能因為內部連結不足而變成「孤兒頁面」——沒有其他頁面連結到它們，搜尋引擎爬蟲也無法到達。Sitemap 可以補救這個問題。

### 3. 傳達頁面優先級與更新頻率
XML Sitemap 支援 `<priority>` 和 `<changefreq>` 標籤，雖然 Google 不完全依賴這些值，但仍有輔助參考價值。

### 4. 支援多媒體內容索引
圖片 Sitemap、影片 Sitemap、新聞 Sitemap 可以幫助搜尋引擎發現和索引這些特殊內容類型，進而出現在 Google 圖片搜尋、影片搜尋等垂直搜尋結果中。

---

## XML Sitemap 結構詳解

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-07-20</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/blog/seo-guide</loc>
    <lastmod>2026-07-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### 各標籤說明

| 標籤 | 必填 | 說明 |
|------|------|------|
| `<loc>` | ✅ 必填 | 頁面的完整 URL，必須是絕對路徑 |
| `<lastmod>` | 選填 | 最後修改日期（YYYY-MM-DD 格式）。Google 會用它判斷是否需要重新爬取 |
| `<changefreq>` | 選填 | 更新頻率：always / hourly / daily / weekly / monthly / yearly / never |
| `<priority>` | 選填 | 相對優先級（0.0 - 1.0），僅相對於同一 Sitemap 內的其他頁面 |

> **實務建議：** Google 主要關注 `<loc>` 和 `<lastmod>`，`<changefreq>` 和 `<priority>` 的權重極低，不需要花太多時間精細調整。

---

## Sitemap Index 與多檔案管理

當網站超過 50,000 個 URL 時，需要使用 **Sitemap Index** 將多個 Sitemap 檔案組織在一起：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-pages.xml</loc>
    <lastmod>2026-07-20</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-posts.xml</loc>
    <lastmod>2026-07-20</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-products.xml</loc>
    <lastmod>2026-07-20</lastmod>
  </sitemap>
</sitemapindex>
```

### 常見的分類方式

| 拆分策略 | 適用場景 |
|----------|----------|
| 按內容類型 | 頁面 / 文章 / 產品 / 分類 |
| 按日期 | 電商大量 SKU，每月一個 Sitemap |
| 按語言 | 多語系網站，每個語言一個 Sitemap |
| 按目錄結構 | 大型網站按 section 拆分 |

---

## 特殊類型 Sitemap

### 圖片 Sitemap
幫助圖片出現在 Google 圖片搜尋中：

```xml
<url>
  <loc>https://example.com/blog/my-post</loc>
  <image:image>
    <image:loc>https://example.com/images/hero.jpg</image:loc>
    <image:title>SEO 優化指南封面圖</image:title>
    <image:caption>2026 年最新 SEO 優化策略總覽</image:caption>
  </image:image>
</url>
```

### 影片 Sitemap
讓影片內容出現在 Google 影片搜尋：

```xml
<url>
  <loc>https://example.com/videos/seo-tutorial</loc>
  <video:video>
    <video:title>SEO 入門教學</video:title>
    <video:description>從零開始學習 SEO</video:description>
    <video:thumbnail_loc>https://example.com/thumbs/seo.jpg</video:thumbnail_loc>
    <video:content_loc>https://example.com/videos/seo-tutorial.mp4</video:content_loc>
  </video:video>
</url>
```

### 新聞 Sitemap
僅適用於 Google News 收錄的新聞網站，需符合 Google News 內容政策。只包含過去 48 小時內發布的新聞。

---

## 不同平台生成 Sitemap 的方法

### WordPress
- 使用 **Yoast SEO** 或 **Rank Math** 外掛，自動生成 XML Sitemap
- 路徑通常為 `/sitemap_index.xml`
- 可在後台設定要包含 / 排除的內容類型

### 靜態網站 / 自訂開發
- **線上生成器：** XML-Sitemaps.com（免費版上限 500 URL）
- **CLI 工具：** `sitemap-generator` npm 套件
- **爬蟲生成：** Screaming Frog SEO Spider 可爬取網站後導出 Sitemap

### Shopify / 電商平台
- 多數電商平台自動生成 Sitemap
- Shopify：`/sitemap.xml`
- 通常自動包含產品頁、分類頁、部落格文章

---

## 向 Google 提交 Sitemap

### 方法一：Google Search Console（推薦）
1. 前往 **Google Search Console** → 選擇網站資源
2. 左側選單 → **Sitemaps**
3. 在「新增 Sitemap」欄位輸入 Sitemap URL（如 `sitemap.xml`）
4. 點擊「提交」
5. 確認狀態顯示為「成功」

### 方法二：robots.txt 內指定
在 `robots.txt` 檔案的任意位置加入：

```
Sitemap: https://example.com/sitemap.xml
```

這樣即使沒有手動提交到 Search Console，搜尋引擎爬蟲在讀取 robots.txt 時也會自動發現 Sitemap 位置。

### 方法三：Ping 工具
直接用 HTTP 請求通知 Google：

```
https://www.google.com/ping?sitemap=https://example.com/sitemap.xml
```

---

## Sitemap 最佳實踐

### ✅ 應該做

1. **只包含可索引的頁面：** 確保 Sitemap 內所有 URL 都返回 200 狀態碼，不包含被 `noindex` 的頁面
2. **使用 Canonical URL：** Sitemap 中的 URL 應與 canonical 指向一致
3. **動態生成：** 對於內容頻繁更新的網站，Sitemap 應自動更新而非手動維護
4. **壓縮大型 Sitemap：** 超過 50MB 時使用 gzip 壓縮（`sitemap.xml.gz`）
5. **保持 lastmod 準確：** 只對實際有內容變更的頁面更新 lastmod
6. **分層管理：** 大型網站使用 Sitemap Index 架構

### ❌ 不要做

1. **不要包含被 noindex 的頁面：** 矛盾訊號會讓 Google 困惑
2. **不要包含 404 或重新導向的 URL**
3. **不要包含重複內容的不同 URL 版本**（使用 canonical 解決）
4. **不要依賴 Sitemap 來修正網站結構問題：** Sitemap 是輔助工具，不是萬能藥
5. **不要在多個 Sitemap 中包含相同 URL**
6. **不要設定所有頁面 priority=1.0：** 這樣等於沒設定

---

## Sitemap 常見問題排查

| 問題 | 可能原因 | 解決方案 |
|------|----------|----------|
| Sitemap 提交後 URL 未被索引 | 頁面品質不足、重複內容、crawl budget 不足 | 提升內容品質，確保內部連結完善 |
| Search Console 顯示錯誤 | XML 格式錯誤、URL 無效 | 使用 XML 驗證工具檢查 |
| 已索引頁面數遠少於 Sitemap URL 數 | Noindex 標籤、canonical 指向不同 URL | 檢查實際被排除的頁面 |
| Sitemap 檔案過大 | URL 數量超過 50,000 | 拆分為多個 Sitemap，使用 Sitemap Index |

---

## HTML Sitemap：給使用者看的網站地圖

除了 XML Sitemap（給搜尋引擎看），**HTML Sitemap** 是放在網站上給訪客瀏覽的頁面，列出所有重要分類和頁面的連結。雖然對 SEO 的直接排名影響有限，但有以下好處：

- **改善使用者體驗：** 幫助訪客快速找到所需內容
- **輔助爬蟲發現：** 提供額外的內部連結路徑
- **分發 PageRank：** HTML Sitemap 也是內部連結的一種

> **2026 年觀點：** 對於大型內容網站，HTML Sitemap 仍有價值；對於小型網站，做好主導覽列和麵包屑導航就足夠了。

---

## 總結檢查清單

| 任務 | 說明 |
|------|------|
| ☐ 生成 XML Sitemap | 確保格式正確，只包含 200 狀態碼頁面 |
| ☐ 排除不可索引頁面 | noindex、404、重定向頁面不放入 Sitemap |
| ☐ 提交到 Google Search Console | 驗證提交狀態 |
| ☐ 在 robots.txt 中加入 Sitemap 路徑 | 雙重保障 |
| ☐ 設定動態更新 | 新內容發布時自動更新 Sitemap |
| ☐ 檢查 Sitemap Index | 大型網站確保使用 Sitemap Index 管理 |
| ☐ 監控索引狀態 | 定期檢查 Search Console 中「已索引」vs「Sitemap 中的網頁」比例 |

---

| ← [第 27 章：行動優先索引與 RWD 響應式設計](/blog/mobile-first-seo) | [回索引](/blog) | [第 29 章：robots.txt 與 Meta Robots 完整教學 →](/blog/robots-meta-robots) |
