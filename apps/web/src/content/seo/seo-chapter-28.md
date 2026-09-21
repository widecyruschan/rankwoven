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

## 香港市場：Sitemap 要交畀邊個？

香港嘅搜尋引擎市佔（2026 估算）：

```
Google        ████████████████████████  ~92-95%   ← 絕對主導
Bing          ██                         ~3-5%     ← Edge/Windows 預設
Yahoo 香港     ███                        ~3-6%     ← 35+ 族群偏高，搜尋行 Bing 技術
小紅書 RED     █                         新興      ← 年輕人 content discovery
其他           █                         1-2%     ← 百度/微信（只對做內地客重要）
```

| 平台 | 要唔交 Sitemap | 點解 |
|------|----------------|------|
| **Google Search Console** | ✅ 一定要 | 香港 ~92-95% 市佔，主戰場 |
| **Bing Webmaster Tools** | ✅ 建議要 | 一來照顧 Bing ~3-5%；二來 **Yahoo 香港搜尋行嘅係 Bing 技術**；三來 **ChatGPT 用 Bing 索引、Copilot 引用 Bing 結果**——對 AI 搜尋（GEO）有直接幫助 |
| **百度搜索資源平台** | 只限做內地生意 | 做內地／大灣區客先需要，而且要內地備案；**唔係香港本地主戰場** |
| **IndexNow**（Bing / Yandex 等） | 可選 | 內容更新即時推送，適合內容頻繁更新嘅香港網站 |

> **香港實務建議**：最少做齊 **Google + Bing** 兩個。Bing Webmaster Tools 可以由 GSC 直接匯入資料，設定成本極低，但對 Yahoo 香港同 AI 搜尋有額外收穫，性價比好高。

---

## 為什麼 Sitemap 至關重要？

### 1. 加速新頁面被發現

新網站沒有大量外部連結時，Google 很難主動發現所有頁面。Sitemap 直接告訴 Google 該爬取哪些 URL，省去等待自然發現的時間。

> **香港情境**：香港新開嘅網店、餐廳、補習社網站，本地反向連結少、品牌冇人識，靠自然發現要等好耐。交 Sitemap 係最基本、最即時嘅做法。

### 2. 幫助孤立頁面被索引

某些頁面可能因為內部連結不足而變成「孤兒頁面」——沒有其他頁面連結到它們，搜尋引擎爬蟲也無法到達。Sitemap 可以補救這個問題。

> **香港常見孤兒頁**：18 區服務頁（批量生成後只入咗 Sitemap、冇內部連結）、英文版頁（繁中導覽冇連過去）、舊活動頁。

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
    <loc>https://www.pethk.hk/</loc>
    <lastmod>2026-07-20</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.pethk.hk/blog/seo-guide</loc>
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

### 香港網域嘅 Sitemap 注意事項

| 注意點 | 說明 |
|--------|------|
| **網域版本要統一** | Sitemap 入面嘅 URL 要同 canonical 一致（例如全用 `https://www.pethk.hk`，就唔好混 `http://pethk.hk`） |
| **`.hk` 要寫足** | `https://www.pethk.hk/...`，唔好漏咗 `.hk` |
| **雙語站要全部列出** | `/zh-hk/`、`/en-hk/`（如有 `/zh-cn/` 亦要）全部放入 Sitemap，並配合 hreflang |
| **GSC 資源要各自驗證** | `www` 版同非 `www` 版、`http` 同 `https` 係唔同資源，Sitemap 要交去你主力嗰個 |
| **18 區頁數量** | 地區頁大量生成時，記得每區頁要有獨特內容，否則交咗都係「已提交但未索引」 |

---

## Sitemap Index 與多檔案管理

當網站超過 50,000 個 URL 時，需要使用 **Sitemap Index** 將多個 Sitemap 檔案組織在一起：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://www.pethk.hk/sitemap-pages.xml</loc>
    <lastmod>2026-07-20</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://www.pethk.hk/sitemap-posts.xml</loc>
    <lastmod>2026-07-20</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://www.pethk.hk/sitemap-products.xml</loc>
    <lastmod>2026-07-20</lastmod>
  </sitemap>
</sitemapindex>
```

### 常見的分類方式

| 拆分策略 | 適用場景 |
|----------|----------|
| 按內容類型 | 頁面 / 文章 / 產品 / 分類 |
| 按日期 | 電商大量 SKU，每月一個 Sitemap |
| 按語言 | **多語系網站，每個語言一個 Sitemap**（`sitemap-zh-hk.xml` / `sitemap-en-hk.xml`） |
| 按地區 | **香港 18 區頁多時，可獨立一個 `sitemap-districts.xml`** |
| 按目錄結構 | 大型網站按 section 拆分 |

---

## 特殊類型 Sitemap

### 圖片 Sitemap

幫助圖片出現在 Google 圖片搜尋中（香港餐飲、零售、裝修、旅遊特別有用）：

```xml
<url>
  <loc>https://www.pethk.hk/blog/my-post</loc>
  <image:image>
    <image:loc>https://www.pethk.hk/images/hero.jpg</image:loc>
    <image:title>SEO 優化指南封面圖</image:title>
    <image:caption>2026 年最新香港 SEO 優化策略總覽</image:caption>
  </image:image>
</url>
```

### 影片 Sitemap

讓影片內容出現在 Google 影片搜尋：

```xml
<url>
  <loc>https://www.pethk.hk/videos/seo-tutorial</loc>
  <video:video>
    <video:title>SEO 入門教學（香港篇）</video:title>
    <video:description>由零開始學 SEO，附香港市場實例</video:description>
    <video:thumbnail_loc>https://www.pethk.hk/thumbs/seo.jpg</video:thumbnail_loc>
    <video:content_loc>https://www.pethk.hk/videos/seo-tutorial.mp4</video:content_loc>
  </video:video>
</url>
```

### 新聞 Sitemap

僅適用於 Google News 收錄的新聞網站，需符合 Google News 內容政策。只包含過去 48 小時內發布的新聞。

> **香港媒體**：香港01、明報、經濟日報、星島、東方、頭條日報等網站通常都有 News Sitemap。一般中小企網站唔需要。

---

## 不同平台生成 Sitemap 的方法

### WordPress
- 使用 **Yoast SEO** 或 **Rank Math** 外掛，自動生成 XML Sitemap
- 路徑通常為 `/sitemap_index.xml`
- 可在後台設定要包含 / 排除的內容類型
- 雙語站（如用 WPML / Polylang）會自動產生各語言 Sitemap

### 靜態網站 / 自訂開發
- **線上生成器：** XML-Sitemaps.com（免費版上限 500 URL）
- **CLI 工具：** `sitemap-generator` npm 套件
- **爬蟲生成：** Screaming Frog SEO Spider 可爬取網站後導出 Sitemap

### Shopify / 電商平台
- 多數電商平台自動生成 Sitemap
- Shopify：`/sitemap.xml`
- 通常自動包含產品頁、分類頁、部落格文章

> **香港常用平台**：SHOPLINE、Shoplazza（店匠）、Wix、WordPress + WooCommerce 喺香港都好常見。
> - **SHOPLINE**：自動產生 `/sitemap.xml`，可喺後台 SEO 設定查看
> - **Wix**：自動產生 `sitemap.xml`，喺「SEO 工具」提交
> - 自訂開發嘅香港企業站：唔少會漏咗 Sitemap，要人手加

---

## 向 Google 提交 Sitemap

### 方法一：Google Search Console（推薦）
1. 前往 **Google Search Console** → 選擇網站資源（記得驗證晒 `www` / 非 `www`、`https` 版本）
2. 左側選單 → **Sitemaps**
3. 在「新增 Sitemap」欄位輸入 Sitemap URL（如 `sitemap.xml`）
4. 點擊「提交」
5. 確認狀態顯示為「成功」

### 方法二：robots.txt 內指定
在 `robots.txt` 檔案的任意位置加入：

```
Sitemap: https://www.pethk.hk/sitemap.xml
```

這樣即使沒有手動提交到 Search Console，搜尋引擎爬蟲在讀取 robots.txt 時也會自動發現 Sitemap 位置。

### 方法三：Ping 工具
直接用 HTTP 請求通知 Google：

```
https://www.google.com/ping?sitemap=https://www.pethk.hk/sitemap.xml
```

### 方法四（香港建議加做）：Bing Webmaster Tools
1. 前往 **Bing Webmaster Tools**
2. 可以選擇「**Import from Google Search Console**」直接匯入（最快）
3. 左側選單 → **Sitemaps** → 提交 Sitemap URL
4. 如需即時推送更新，可啟用 **IndexNow**

> **點解香港要做 Bing**：除咗 Bing ~3-5% 市佔，**Yahoo 香港（hk.yahoo.com）搜尋行嘅係 Bing 技術**，香港仲有 ~3-6% 份額（35+ 族群偏高）。加上 ChatGPT 用 Bing 索引、Copilot 引用 Bing 結果——做 Bing 等於同時照顧 Yahoo 香港同 AI 搜尋。

---

## Sitemap 最佳實踐

### ✅ 應該做

1. **只包含可索引的頁面：** 確保 Sitemap 內所有 URL 都返回 200 狀態碼，不包含被 `noindex` 的頁面
2. **使用 Canonical URL：** Sitemap 中的 URL 應與 canonical 指向一致（網域版本、尾綴斜線要一致）
3. **動態生成：** 對於內容頻繁更新的網站，Sitemap 應自動更新而非手動維護
4. **壓縮大型 Sitemap：** 超過 50MB 時使用 gzip 壓縮（`sitemap.xml.gz`）
5. **保持 lastmod 準確：** 只對實際有內容變更的頁面更新 lastmod
6. **分層管理：** 大型網站使用 Sitemap Index 架構
7. **多語站全部列出：** `/zh-hk/`、`/en-hk/` 全部放晒入去，並配好 hreflang

### ❌ 不要做

1. **不要包含被 noindex 的頁面：** 矛盾訊號會讓 Google 困惑
2. **不要包含 404 或重新導向的 URL**
3. **不要包含重複內容的不同 URL 版本**（使用 canonical 解決）
4. **不要依賴 Sitemap 來修正網站結構問題：** Sitemap 是輔助工具，不是萬能藥
5. **不要在多個 Sitemap 中包含相同 URL**
6. **不要設定所有頁面 priority=1.0：** 這樣等於沒設定
7. **唔好淨係靠 Sitemap 去救 18 區孤兒頁：** Sitemap 只能幫 Google 發現，地區頁仲係要有內部連結同獨特內容先會被索引

---

## Sitemap 常見問題排查

| 問題 | 可能原因 | 解決方案 |
|------|----------|----------|
| Sitemap 提交後 URL 未被索引 | 頁面品質不足、重複內容、crawl budget 不足 | 提升內容品質，確保內部連結完善 |
| Search Console 顯示錯誤 | XML 格式錯誤、URL 無效 | 使用 XML 驗證工具檢查 |
| 已索引頁面數遠少於 Sitemap URL 數 | Noindex 標籤、canonical 指向不同 URL | 檢查實際被排除的頁面 |
| Sitemap 檔案過大 | URL 數量超過 50,000 | 拆分為多個 Sitemap，使用 Sitemap Index |
| **網域版本唔一致**（`www` vs 非 `www`） | canonical 同 Sitemap URL 唔夾 | 統一版本，另一個做 301 |
| **18 區頁「已提交但未索引」** | 各區內容相似，被判低質 | 每區加獨特內容（案例、收費、團隊） |
| **Bing 提交失敗** | Sitemap 格式或編碼問題 | 確認 UTF-8 編碼、URL 絕對路徑 |

---

## HTML Sitemap：給使用者看的網站地圖

除了 XML Sitemap（給搜尋引擎看），**HTML Sitemap** 是放在網站上給訪客瀏覽的頁面，列出所有重要分類和頁面的連結。雖然對 SEO 的直接排名影響有限，但有以下好處：

- **改善使用者體驗：** 幫助訪客快速找到所需內容
- **輔助爬蟲發現：** 提供額外的內部連結路徑
- **分發 PageRank：** HTML Sitemap 也是內部連結的一種

> **香港做法建議**：香港網站嘅 HTML Sitemap 可以按「服務 × 18 區」排列（例如「九龍 → 旺角 / 觀塘 / 深水埗」），一來幫訪客，二來為地區頁提供額外內部連結，一舉兩得。
>
> **2026 年觀點：** 對於大型內容網站，HTML Sitemap 仍有價值；對於小型網站，做好主導覽列和麵包屑導航就足夠了。

---

## 總結檢查清單

| 任務 | 說明 |
|------|------|
| ☐ 生成 XML Sitemap | 確保格式正確，只包含 200 狀態碼頁面 |
| ☐ 排除不可索引頁面 | noindex、404、重定向頁面不放入 Sitemap |
| ☐ 提交到 Google Search Console | 驗證提交狀態 |
| ☐ 提交到 Bing Webmaster Tools | 照顧 Yahoo 香港 + Copilot / ChatGPT（可由 GSC 匯入） |
| ☐ 在 robots.txt 中加入 Sitemap 路徑 | 雙重保障 |
| ☐ 設定動態更新 | 新內容發布時自動更新 Sitemap |
| ☐ 檢查 Sitemap Index | 大型網站確保使用 Sitemap Index 管理 |
| ☐ 多語站列出所有語言版本 | `/zh-hk/`、`/en-hk/` 全部包含 + hreflang 配好 |
| ☐ 統一網域版本 | Sitemap URL 同 canonical 一致（www / 非 www、尾綴斜線） |
| ☐ 監控索引狀態 | 定期檢查 Search Console 中「已索引」vs「Sitemap 中的網頁」比例 |

---

| ← [第 27 章：行動優先索引與 RWD 響應式設計](/blog/mobile-first-seo) | [回索引](/blog) | [第 29 章：robots.txt 與 Meta Robots 完整教學 →](/blog/robots-meta-robots) |
