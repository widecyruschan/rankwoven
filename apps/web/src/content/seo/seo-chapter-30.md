---

## Canonical 是什麼？

**Canonical（標準網址標記）** 是告訴搜尋引擎「這幾個 URL 雖然不同，但內容本質上是一樣的，請把 SEO 權重集中到這個**標準版本**」的機制。它是解決重複內容問題最核心、最重要的技術 SEO 工具。

```html
<link rel="canonical" href="https://www.hkseostore.com.hk/blog/seo-guide" />
```

這行代碼放在網頁的 `<head>` 區域，宣告這個頁面的「權威版本」是什麼。

> **直白比喻：** 如果你的文章有兩個入口——正門（canonical URL）和側門（重複 URL），Canonical 標記就是在側門貼上「入口在正門」的告示，讓 Google 知道該把排名權重給哪一個。
>
> 用香港嘅講法：就好像一間餐廳喺 OpenRice 有幾十個重複商戶頁，你要同 Google 講清楚「呢個先係正舖」。

---

## 重複內容的六大常見來源

在深入 Canonical 之前，先了解重複內容從哪裡來：

### 1. URL 參數（最常見）
```
https://www.hkseostore.com.hk/product?color=red
https://www.hkseostore.com.hk/product?color=blue
https://www.hkseostore.com.hk/product?utm_source=facebook
https://www.hkseostore.com.hk/product?session_id=abc123
```
同一個頁面因追蹤參數、篩選參數而產生多個 URL。香港網店常見嘅 `?utm_source=ig`（Instagram 廣告）、`?utm_source=lihkg`（連登帖）就係典型例子。

### 2. WWW / 非 WWW 版本
```
https://www.hkseostore.com.hk/
https://hkseostore.com.hk/
```
兩個版本都可能被索引為不同頁面。

### 3. HTTP / HTTPS
```
http://www.hkseostore.com.hk/
https://www.hkseostore.com.hk/
```
如果沒有正確的 301 重定向，兩個協定版本會同時存在。

### 4. 結尾斜線
```
https://www.hkseostore.com.hk/blog
https://www.hkseostore.com.hk/blog/
```
部分伺服器設定會讓這兩者被視為不同頁面。

### 5. 分頁與排序
```
https://www.hkseostore.com.hk/category?page=1
https://www.hkseostore.com.hk/category?page=2
https://www.hkseostore.com.hk/category?sort=price
```
電商網站分類頁的各種篩選組合（例如香港家具網嘅「按價錢排」「按地區排」）。

### 6. 行動版與桌面版
```
https://www.hkseostore.com.hk/
https://m.hkseostore.com.hk/
```
如果使用獨立行動版網站（非 RWD），兩個版本的內容可能高度相似。

### 7. 香港常見：分店頁內容高度相似

連鎖補習社、健身中心、診所、餐廳成日會為每間分店開一頁（尖沙咀、旺角、銅鑼灣、沙田、元朗……），但內容九成相同，只係改咗地址電話。呢啲頁面對 Google 嚟講就係近乎重複內容。

```
https://www.hktutorial.com.hk/branch/tsim-sha-tsui
https://www.hktutorial.com.hk/branch/mong-kok
https://www.hktutorial.com.hk/branch/causeway-bay
```

**處理方向：** 如果每間分店真係有獨特內容（導師名單、上課時間表、街景相、該區家長評價），就各自保留 + self-referencing canonical；如果純粹係「複製貼上 + 改地址」，應該合併為一頁「分店總覽」，其餘 301 過去（見第 38 章 Content Pruning）。

---

## Canonical 的運作原理

當 Google 發現多個 URL 包含相同或高度相似的內容時：

1. Google 會選擇一個作為 **Canonical URL**（標準版本）
2. 所有其他變體的排名訊號（PageRank、連結權重等）會**合併**到 Canonical URL
3. Canonical URL 出現在搜尋結果中，其他版本通常不會顯示

如果頁面明確設定了 `<link rel="canonical">` 標籤，Google **通常會尊重**（但不是絕對）。Google 仍會根據自己的判斷來決定是否採用你宣告的 Canonical。

---

## Canonical 的六種實現方式

### 方法一：HTML `<link>` 標籤（最推薦）

```html
<head>
  <link rel="canonical" href="https://www.hkseostore.com.hk/original-page" />
</head>
```

**✅ 優點：** 靈活、易於維護、Google 最推薦的方式

### 方法二：HTTP Header

對於非 HTML 檔案（PDF、文件等），在 HTTP Response Header 中設定：

```
Link: <https://www.hkseostore.com.hk/original-page>; rel="canonical"
```

### 方法三：Sitemap 中的 URL

Sitemap 中列出的 URL 被 Google 視為 Canonical 的強烈信號。確保 Sitemap 中只包含 Canonical URL。

### 方法四：301 重定向

將重複的 URL 永久重定向到 Canonical URL：

```
HTTP/1.1 301 Moved Permanently
Location: https://www.hkseostore.com.hk/canonical-page
```

**適用場景：** 永久不再使用的重複 URL

### 方法五：內部連結一致性

所有的內部連結都指向 Canonical URL 版本，而非重複版本。這是對 Google 最強的信號。

### 方法六：Google Search Console 網址參數工具（舊版）／網址檢查

在 Search Console 中可以告訴 Google 如何處理特定 URL 參數（如 `utm_source`、`sort` 等），讓 Google 知道這些參數不影響頁面內容，無需單獨爬取。

> **備註：** 新版 Search Console 已逐步移除「網址參數」工具介面，實務上改為依靠 **self-referencing canonical + robots.txt 擋參數 + Sitemap 只放標準 URL** 三件套處理（做法見第 29 章）。

---

## Canonical 實戰範例

### 範例一：香港網店產品頁（參數問題）

```
# 產品頁有以下 URL 變體：
https://www.hkseostore.com.hk/product/shirt?color=red&size=m
https://www.hkseostore.com.hk/product/shirt?color=blue&size=l
https://www.hkseostore.com.hk/product/shirt?utm_campaign=summer

# 在每個變體的 <head> 中設定：
<link rel="canonical" href="https://www.hkseostore.com.hk/product/shirt" />
```

這樣 Google 會把所有變體的排名權重集中到標準產品頁。

### 範例二：HTTP/HTTPS 與 WWW 問題

```
# 在 http://hkseostore.com.hk 的所有頁面加入 canonical 指向 HTTPS 版本：
<link rel="canonical" href="https://www.hkseostore.com.hk/page" />

# 在 https://www.hkseostore.com.hk 的所有頁面加入 canonical 指向選定版本：
<link rel="canonical" href="https://www.hkseostore.com.hk/page" />
```

> **更推薦的做法：** 使用 301 重定向一次解決，而非僅靠 canonical。

### 範例三：跨網域內容授權（Syndication）

如果你將文章授權給其他網站轉載（例如你寫咗篇《2026 香港按揭攻略》，畀香港01 或經濟日報轉載），可以在轉載頁面加上 canonical 指向你的原始頁面：

```html
<!-- 在轉載網站上 -->
<link rel="canonical" href="https://www.hkseostore.com.hk/original-article" />
```

這樣 Google 就知道原始版本在哪裡，排名權重歸屬於你。

> **實務提醒：** 香港主流媒體（香港01、明報、星島、東方、頭條日報、am730）通常唔會幫你加 cross-domain canonical。所以更實際嘅做法係：畀佢哋轉載時要求**內文附上原文出處連結**（dofollow 就更好），靠「原發 + 引用連結」建立權威。

### 範例四：分頁處理

```
# 第 2 頁的 canonical 指向自己（非指向第 1 頁）：
<!-- 在 /category?page=2 上 -->
<link rel="canonical" href="https://www.hkseostore.com.hk/category?page=2" />

# 同時使用 rel="prev" 和 rel="next" 輔助：
<link rel="prev" href="https://www.hkseostore.com.hk/category?page=1" />
<link rel="next" href="https://www.hkseostore.com.hk/category?page=3" />
```

> **注意：** Google 在 2019 年後不再使用 `rel="prev/next"` 作為排名信號，但仍有助於爬蟲理解頁面關係。

### 範例五：香港雙語網站（繁中 / 英文）

香港係雙語社會，好多網站會有繁中版同英文版。呢個情況**唔可以用 canonical 將英文版指向繁中版**（會令英文版永遠唔出現）。正確做法係用 **hreflang**：

```html
<!-- 繁中版（香港） -->
<link rel="alternate" hreflang="zh-HK" href="https://www.hkseostore.com.hk/blog/seo-guide" />
<link rel="alternate" hreflang="en-HK" href="https://www.hkseostore.com.hk/en/blog/seo-guide" />
<link rel="alternate" hreflang="x-default" href="https://www.hkseostore.com.hk/blog/seo-guide" />

<!-- 兩個版本各自有 self-referencing canonical -->
<link rel="canonical" href="https://www.hkseostore.com.hk/blog/seo-guide" />
```

> **常見錯誤：** 香港公司成日以為「英文版係同一篇嘢，用 canonical 指去中文版就可以」。咁做會令你喺英文 search（例如 "SEO agency Hong Kong"）完全冇曝光。語言版本之間請用 hreflang，唔係 canonical。

---

## Self-Referencing Canonical：自我引用

**每個頁面都應該有 canonical 標籤，即使它指向自己：**

```html
<!-- 在 https://www.hkseostore.com.hk/blog/seo-guide 頁面上 -->
<link rel="canonical" href="https://www.hkseostore.com.hk/blog/seo-guide" />
```

### 為什麼要自我引用？

1. **防禦性設置：** 如果有人複製你的內容（scraping），複製的頁面上可能保留了你的 canonical，讓 Google 知道你才是原作者
2. **參數問題保護：** 即使有人用帶參數的 URL 連結到你（例如連登 LIHKG 有人貼咗條帶 `?fbclid=` 嘅 link），自我引用的 canonical 仍然確保標準版本被確認
3. **一致性：** 讓所有頁面都有明確的信號，減少 Google 自行判斷的不確定性

---

## Canonical 常見錯誤與陷阱

### 錯誤 1：所有分頁 Canonical 指向第一頁
```html
<!-- 錯誤！ -->
<!-- 在 /blog/page/3/ 上 -->
<link rel="canonical" href="https://www.hkseostore.com.hk/blog/" />
```

這會導致第 2 頁以後的所有文章永遠不會被索引。

**正確做法：** 每個分頁 canonical 指向自己，或用「檢視全部」頁面作為 canonical。

### 錯誤 2：Canonical 鏈
```
Page A → canonical → Page B → canonical → Page C
```
Google 可能只追蹤一個跳躍，造成混亂。Canonical 應該直接指向最終標準版本。

### 錯誤 3：Canonical 與 Noindex 混用
```html
<meta name="robots" content="noindex">
<link rel="canonical" href="https://www.hkseostore.com.hk/canonical-page" />
```
同時告訴 Google「不要索引這個頁面」和「這個頁面的標準版本是 X」，發送矛盾信號。**不要混用。**

### 錯誤 4：相對路徑 Canonical
```html
<!-- 錯誤！ -->
<link rel="canonical" href="/blog/seo-guide" />

<!-- 正確！絕對 URL -->
<link rel="canonical" href="https://www.hkseostore.com.hk/blog/seo-guide" />
```
Google 明確要求使用**絕對 URL**。

### 錯誤 5：Canonical 指向不相關頁面
```html
<!-- 產品 A 的頁面，canonical 指向產品 B -->
<!-- 這是誤導，會被 Google 忽略甚至處罰 -->
```

### 錯誤 6：香港常見 — 將所有分店頁 canonical 去總店頁

```
# 錯誤：旺角分店頁 canonical 去公司首頁
<link rel="canonical" href="https://www.hktutorial.com.hk/" />
```

如果旺角分店頁真係有人搜「旺角 補習社」，你咁做即係自己放棄咗呢個本地搜尋流量。分店頁應該 **self-referencing canonical**，或者合併後 301，唔好 canonical 去首頁。

---

## 多重複內容處理方案對比

| 方案 | 適用場景 | 優點 | 缺點 |
|------|----------|------|------|
| **Canonical** | 多版本共存，都需要可訪問 | 靈活，維護簡單 | Google 可能不採用 |
| **301 重定向** | 舊版已廢棄、永久遷移 | 信號最強，Google 必定採用 | 原始 URL 無法再訪問 |
| **Noindex** | 不想被索引的變體頁面 | 明確禁止索引 | 浪費 crawl budget |
| **robots.txt 阻止** | 不想爬蟲浪費資源 | 節省 crawl budget | 不阻止索引 |
| **URL 參數工具** | 追蹤參數、篩選參數 | Search Console 設定簡單 | 僅建議性質 |
| **hreflang** | 繁中 / 英文語言版本 | 各語言版本都能排名 | 唔係用嚟解決重複內容 |

**選擇策略：**
1. 如果重複版本**不需要獨立存在** → 用 **301 重定向**
2. 如果重複版本**需要存在但不想分散權重** → 用 **Canonical**
3. 如果重複版本**需要存在但不需要索引** → 用 **Canonical + 確保不被索引**
4. 如果是**不同語言版本** → 用 **hreflang**，千萬唔好用 canonical

---

## 排查與診斷工具

| 工具 | 用途 |
|------|------|
| **Google Search Console** | 查看「重複內容」報告，哪些頁面被 Google 選為 Canonical 但與你的設定不同 |
| **Bing Webmaster Tools** | 香港 Bing / Yahoo 香港嘅索引視角，順便檢查 SEO 報告 |
| **Screaming Frog** | 爬取全站，檢查每個頁面的 canonical 標籤和重複內容問題 |
| **Site: 搜尋** | `site:hkseostore.com.hk "特定句子"` 手動檢查是否有重複內容被索引 |
| **Ahrefs / Semrush** | 網站審計功能會標示 canonical 錯誤 |
| **瀏覽器開發者工具** | 檢查 HTTP Header 中的 canonical 和 X-Robots-Tag |

### Search Console 診斷重點

1. 前往「頁面」報告 → 查看「重複內容」分類
2. 檢查「Google 選擇的標準網頁與使用者聲明的標準網頁不同」警告
3. 確認排除的 URL 和原因

---

## 總結檢查清單

| 任務 | 說明 |
|------|------|
| ☐ 每個頁面都有 self-referencing canonical | 使用絕對 URL |
| ☐ HTTP 和 HTTPS 統一 | 確保只有一個版本存活（優先用 301） |
| ☐ WWW 和裸域統一 | 選擇其一，另一個 301 重定向 |
| ☐ 結尾斜線一致 | 統一使用 `/` 或不使用，不要兩版本並存 |
| ☐ URL 參數管理 | 追蹤參數（utm_*、fbclid）不應生成獨立索引 URL |
| ☐ 分頁使用正確 canonical | 每個分頁指向自己 |
| ☐ Sitemap 中只有 canonical URL | 不包含任何重複版本的 URL |
| ☐ 內部連結指向一致 | 所有內部連結使用 canonical URL |
| ☐ 跨域內容設定跨域 canonical | 如果授權轉載，確保轉載網站有你原站 canonical（或至少附原文連結） |
| ☐ 語言版本用 hreflang 而非 canonical | 繁中 zh-HK / 英文 en-HK 各自獨立 |
| ☐ 分店頁唔好 canonical 去首頁 | 有獨特內容就 self-referencing，冇就合併 301 |
| ☐ 不要混用 canonical 和 noindex | 發送矛盾信號 |
| ☐ 定期檢查 Search Console | 查看「重複內容」和標準網頁報告 |

---

| ← [第 29 章：robots.txt 與 Meta Robots 完整教學](/blog/robots-meta-robots) | [回索引](/blog) | [第 31 章：SSL 憑證與 HTTPS 完整指南 →](/blog/ssl-https-seo) |
