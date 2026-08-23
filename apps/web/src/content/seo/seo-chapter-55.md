---

## 分頁 SEO 的核心問題

**分頁（Pagination）** 是將大量內容拆分成多個頁面的技術。如果你的網站有 500 件商品、200 篇部落格文章、或任何需要多頁展示的內容，你就必須處理分頁 SEO。

```
分頁不當的 SEO 風險：

  電商網站 / 分類頁面 / 部落格存檔
  ┌─────────────────────────────────────┐
  │  /category/shoes                     │  ← 第 1 頁
  │  /category/shoes/page/2              │  ← 第 2 頁
  │  /category/shoes/page/3              │  ← 第 3 頁
  │  /category/shoes/page/4              │  ← 第 4 頁
  │  ...                                 │
  │  /category/shoes/page/50             │  ← 第 50 頁
  └─────────────────────────────────────┘

如果 SEO 處理不當：
  ❌ Google 爬取大量低品質分頁，浪費 Crawl Budget
  ❌ 分頁頁面互相競爭關鍵字（蠶食效應）
  ❌ 重複或薄弱的內容被索引
  ❌ 使用者體驗差，SEO 訊號下降
```

> **核心原則：** 分頁 SEO 的目標是確保 Google 能正確理解分頁結構，爬取最重要的頁面，並將排名權重集中在主要頁面。

---

## 2026 年分頁 SEO 的正確做法

### Google 的立場演變

```
2011-2019：rel=prev / rel=next
  Google 建議使用 <link rel="prev"> <link rel="next">
  但實際效果有限。

2019 年 3 月：
  Google 宣布不再使用 rel=prev/next 作為排名訊號。
  Google 將分頁頁面視為獨立頁面進行索引。

2026 年當前：
  rel=prev/next 仍然可以幫助 Google 爬取和理解分頁結構
  （用於爬取發現），但不會直接影響排名。
  最佳的 SEO 策略是確保每個分頁頁面本身有價值。
```

### 2026 年推薦的核心策略

```
策略 1：確保每個分頁頁面有足夠的獨特內容

  ❌ 差：分頁頁面只有商品列表（標題、價格、圖片）
      → 薄弱內容，可能被 Google 視為低品質

  ✅ 好：每個分頁頁面有獨特的內容
      → 加入該頁面的篩選描述、推薦理由、SEO 文字

策略 2：讓每個分頁頁面可以獨立存在

  ✅ 每個分頁應該有自己的 Title Tag
     例如：「女裝運動鞋 — 第 3 頁 | 你的品牌名稱」
     而不是所有分頁共用同一個 Title Tag

  ✅ 每個分頁應該有自己的 Meta Description
     不是 "第 2 頁" 這樣簡單的描述

  ✅ 每個分頁應該有自己的 Canonical
     指向自己（self-canonical），不是指向第 1 頁！
     <link rel="canonical" href="https://site.com/category/page/3/" />
```

---

## 分頁的三種 URL 模式

### 模式 1：路徑式（推薦 ⭐）

```
/category/shoes/           ← 第 1 頁
/category/shoes/page/2/    ← 第 2 頁
/category/shoes/page/3/    ← 第 3 頁
```

### 模式 2：查詢參數式

```
/category/shoes/           ← 第 1 頁
/category/shoes/?page=2    ← 第 2 頁
/category/shoes/?page=3    ← 第 3 頁
```

### 模式 3：片段式（#）

```
/category/shoes/           ← 第 1 頁
/category/shoes/#page=2    ← 第 2 頁（Google 通常不會爬取！）
/category/shoes/#page=3    ← 第 3 頁
```

> **⚠️ 重要：** 模式 3 使用 `#` 的頁面 Googlebot 通常不會爬取——因為 `#` 後的內容不發送到伺服器。如果你的網站使用 JavaScript 動態載入分頁，確保使用 History API（pushState）來更新 URL。

---

## Canonical 的關鍵決策

### Self-Canonical（指向自己）vs 指向第 1 頁

```
❌ 錯誤做法：所有分頁頁面 canonical 指向第 1 頁

  /page/2/ → canonical = /page/1/
  /page/3/ → canonical = /page/1/

  問題：
  → Google 不會索引分頁頁面的內容
  → 分頁內的個別商品/文章可能失去被索引的機會
  → 但！如果你希望 Google 只索引第 1 頁，這可以是一種策略

✅ 推薦做法：Self-Canonical + View-All 頁面

  /page/1/ → canonical = /page/1/
  /page/2/ → canonical = /page/2/
  /page/3/ → canonical = /page/3/

  同時提供一個 View-All 頁面（顯示所有商品）：
  /view-all/ → canonical = /view-all/
```

### 何時使用 View-All 頁面

```
View-All 頁面適合：
  ✅ 產品總數不多（例如 50-100 個商品）
  ✅ 使用 load speed 優化的（例如懶加載圖片）
  ✅ 使用者需要一次瀏覽所有選項

不適合：
  ❌ 商品超過 200 個（頁面載入太慢）
  ❌ 使用者不會想要一次查看所有內容
```

---

## 無限滾動（Infinite Scroll）的 SEO

### 問題：Googlebot 不會滾動

```
無限滾動 + SEO 的衝突：

  使用者在頁面上：
    往下滾動 → 載入更多內容 → 繼續滾動 → 載入更多內容
    這很棒！使用者體驗流暢。

  Googlebot 在頁面上：
    載入頁面 → 讀取 HTML → 完成
    ❌ 不會「往下滾動」
    ❌ 不會觸發你的 JavaScript 載入更多內容
    ❌ 第二頁及之後的內容從不被爬取！

  結果：
    50% 的內容對 Google 是不可見的。
```

### 解決方案：分頁作為後備

```
正確的無限滾動 + SEO 架構：

1. 使用 History API 更新 URL
   當使用者滾動到第 2 頁內容時：
   URL 從 /category/shoes/ 變為 /category/shoes/page/2/

2. 每個分頁頁面可以獨立訪問
   /category/shoes/page/2/ 應該能直接載入並顯示第 2 頁的內容
   （不是只有滾動到才能看到）

3. 加入分頁導航作為後備
   在頁面底部加入「第 1 頁 | 第 2 頁 | 第 3 頁 | ...」的連結
   這確保了 Googlebot 可以通過點擊連結爬取所有頁面

4. 為 Google 提供標準連結
   即使用無限滾動，也要有標準的 <a href="/page/2/"> 分頁連結
```

---

## JavaScript 分頁 / Load More 的 SEO

### Load More 按鈕模式

```
「載入更多」按鈕的 SEO 陷阱：

  <button onclick="loadMore()">載入更多</button>

  Googlebot 不會點擊按鈕！

修復方案：

方案 A：每個 Load More 同時提供標準分頁連結

  <button onclick="loadMore()">載入更多</button>

  <nav class="pagination">
    <a href="/page/1/">1</a>
    <a href="/page/2/">2</a>
    <a href="/page/3/">3</a>
    <!-- Googlebot 可以通過這些標準連結爬取 -->
  </nav>

方案 B：使用 SSR 或 Pre-rendering
  確保所有內容在初始 HTML 中可用
  或使用服務端渲染（SSR）讓 Googlebot 看到完整內容
```

---

## 分頁的 Title Tag 與 Meta Description

```

每個分頁應該有獨特且有價值的 SEO 標籤：

Title Tag：
  ✅ 「女裝運動鞋 (第 3 頁) — 品牌名稱」
  ✅ 「女裝運動鞋 — 第 3 頁共 20 頁 — 品牌名稱」

  ❌ 所有分頁使用相同 Title Tag
  ❌ 「第 2 頁」（沒有關鍵字）

Meta Description：
  ✅ 「瀏覽我們的第 3 頁女裝運動鞋系列。發現最新款式，
     包括 Nike、Adidas 等人氣品牌。全場免運費。」

  ❌ 使用預設的 Meta Description
  ❌ 所有頁面使用相同的 Description
```

---

## Google Search Console 中的分頁管理

### 參數處理

```
如果使用查詢參數式分頁（?page=）：

在 Search Console → 設定 → 爬取 → 參數設定中，
告訴 Google page 參數是「分頁」而非「篩選」。

⚠️ 注意：
  → 這個設定在新版 Search Console 中已被移除
  → Google 現在會自動嘗試理解參數的用途
  → 保持一致的 URL 結構是最好的訊號
```

### 索引狀態監控

```
在 Search Console 中查看分頁頁面的索引狀態：

  Search Console → 網頁索引 → 查看已索引和未索引的頁面

檢查：
  ✅ 重要的分頁頁面是否已被索引？
  ✅ 是否有過多低品質分頁頁面被索引？（如果有的話，可能需要調整策略）
  ✅ 是否有分頁頁面被標記為「重複」？
```

---

## 常見分頁 SEO 問題

### 問題 1：分頁頁面內容重複度高

```
如果你的分頁頁面除了商品列表幾乎沒有其他內容，
所有頁面看起來都很相似 → Google 可能視為重複內容。

解決方案：
  → 加入獨特的 SEO 內容區塊
  → 加入該頁面的精選商品推薦
  → 加入分頁特定的篩選提示
```

### 問題 2：分頁頁面排名比第 1 頁好

```
你可能發現第 3 頁在某些關鍵字的排名比第 1 頁好。

為什麼會發生？
  → 第 3 頁的內容和該關鍵字的匹配度更高
  → 第 3 頁的反向連結比第 1 頁多

解決方案：
  → 在第 1 頁中加入排名較好的分頁的內容元素
  → 優化第 1 頁的 SEO，確保它是該類別的最強頁面
```

### 問題 3：合併內容後如何處理分頁

```
如果你決定將分頁合併為一個頁面：

  1. 建立新的單一頁面（或使用 View-All）
  2. 將所有舊分頁頁面 301 轉址到新頁面
  3. 更新內部連結
  4. 提交新的 Sitemap
```

---

## 分頁 SEO 決策流程圖

```
你的內容總數是多少？

  少於 30 個 → 不需要分頁，單一頁面 + 內部連結足夠
  30-100 個  → View-All 頁面 + 分頁作為 SEO 備用方案
  100-500 個 → 分頁（路徑式）+ Self-Canonical + 獨特內容
  500+ 個    → 分頁 + 考慮 Faceted Navigation（分面導航）管理

你的網站類型？

  內容網站（部落格）：
    → 使用清晰的 /page/2/ 結構
    → 確保每頁至少 10 篇文章
    → 提供日期存檔和分類存檔作為替代導航

  電商網站：
    → Self-Canonical 是標準做法
    → 確保每個商品有其獨立的商品頁面（這是重點！）
    → 考慮分類頁面的分面導航策略
```

---

## 進階：Faceted Navigation（分面導航）的 SEO 管理

如果你的網站允許使用者篩選（價格範圍、顏色、尺寸等），這會產生大量 URL 組合。這是分頁 SEO 的進階課題。

```
問題：

/category/shoes/?color=red&size=9&page=1
/category/shoes/?color=red&size=9&page=2
/category/shoes/?color=blue&size=10&page=1
...可能產生數萬個 URL

解決方案：

1. Canonical Tags — 每個組合頁面 canonical 到主分類頁
2. robots.txt — 禁止爬取某些參數組合
3. Noindex — 對低價值組合頁面使用 meta robots noindex
4. JS 動態載入 — 篩選結果使用 JS 動態載入（不產生獨立 URL）
```

---

## 總結檢查清單

| 任務 | 說明 |
|------|------|
| ☐ 使用路徑式 URL（/page/2/） | 最推薦的分頁 URL 模式 |
| ☐ 使用 Self-Canonical | 每個分頁頁面 canonical 指向自己 |
| ☐ 每個分頁頁面有獨特的 Title Tag | 包含頁碼 + 關鍵字 |
| ☐ 每個分頁頁面有獨特的 Meta Description | 有意義的描述，不是預設內容 |
| ☐ 提供標準分頁導航連結 | 用 `<a href>` 而不是 JS 按鈕 |
| ☐ 如果使用無限滾動，加入分頁後備 | 確保所有內容可被 Google 爬取 |
| ☐ 在 Sitemap 中包含第 1 頁 | 分頁頁面可選擇性包含 |
| ☐ 監控 Search Console 的索引狀態 | 留意是否有過多低品質分頁被索引 |
| ☐ 考慮 View-All 頁面（如果內容總數合理） | 提供一個查看所有內容的頁面 |
| ☐ 管理 Faceted Navigation URL | 使用 Canonical / robots.txt / noindex 控制 |

---

| ← [第 54 章：國際 SEO 完整指南](/blog/international-seo) | [回索引](/blog) | [第 56 章：Crawl Budget 爬取預算優化 →](/blog/crawl-budget) |
