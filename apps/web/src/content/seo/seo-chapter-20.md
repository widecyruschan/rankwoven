---

## 為什麼 URL 結構對 SEO 重要？

URL（網址）是使用者和搜尋引擎接觸你網站的第一個技術層面。一個好的 URL 結構不僅幫助 Google 理解頁面主題，更能提升使用者點擊意願和信任度。

> Google 的官方指南：「URL 應該簡單、易於理解，讓使用者和搜尋引擎都能從中獲得有意義的資訊。」

**香港用家嘅額外考量**：香港人好常用 WhatsApp、Facebook 轉發連結，一個又長又亂嘅 URL（例如 `?p=123&utm=xxx`）喺手機訊息入面望落好「唔可靠」，點擊率會低一截。乾淨網址喺香港特別值錢。

---

## 好 URL vs 壞 URL：一圖看懂

| 好 URL | 壞 URL |
|--------|--------|
| `pethk.hk/dog-food-guide` | `pethk.hk/?p=123` |
| `pethk.hk/products/royal-small-breed` | `pethk.hk/index.php?category_id=45&product=789&session=abc123` |
| `pethk.hk/blog/seo-tutorial-2026` | `pethk.hk/2026/03/15/category/seo/article-about-seo.html` |

---

## 香港網域選擇：.hk / .com.hk / .com

喺郁手規劃 URL 結構之前，先決定網域——呢個決定好難回頭。

| 選項 | 例子 | 適合 | 優點 | 缺點 |
|------|------|------|------|------|
| **.hk / .com.hk** | `pethk.hk` | 純香港本地生意 | 強烈地區信號、香港人信任度高、Google 地區相關性高 | 做跨境生意時國際感弱 |
| **.com** | `pethk.com` | 香港為主但想保留國際彈性 | 國際通用、轉售/搬遷彈性大 | 地區信號要靠 GSC 地區設定同內容補足 |
| **.com.hk** | `pethk.com.hk` | 香港公司（需公司註冊證明） | 商業信號最強 | 申請要文件 |

> **決策建議**：
> - **本地服務業**（餐廳、補習社、裝修、醫療、律師）→ 用 `.hk` 或 `.com.hk`，地區信號最強。
> - **網店 / SaaS / 內容站**想做埋海外 → 用 `.com`，再以子目錄或子網域處理語言。
> - **想做埋內地客** → 唔好用 `.hk` 直接做百度（`.hk` 喺內地收錄同速度都可能受限），應另設 `.cn` 或內地備案站。

### 語言與地區嘅 URL 策略（香港雙語社會必讀）

| 做法 | 例子 | Google 態度 | 建議 |
|------|------|-------------|------|
| **ccTLD** | `pethk.hk`（繁中）、`pethk.tw` | 地區信號最強 | 適合純本地、唔想共用權重 |
| **子目錄** | `pethk.hk/zh-hk/`、`pethk.hk/en-hk/`、`pethk.hk/zh-cn/` | ⭐ Google 最推薦 | **香港多語站首選**——權重集中、易管理 |
| **子網域** | `en.pethk.hk` | 可以，但權重較分散 | 只在技術限制時用 |
| **URL 參數** | `pethk.hk/?lang=zh` | ❌ 不推薦 | 難以本地化、易出重複內容 |

> **香港典型配置**：
> ```
> pethk.hk/zh-hk/          ← 繁體中文（香港）主站
> pethk.hk/en-hk/          ← 英文（香港）
> pethk.hk/zh-cn/          ← 簡體中文（做內地客時）
> ```
> 記得配合 `hreflang`（`zh-HK` / `en-HK` / `zh-CN`）同 `x-default`。

---

## URL 結構優化八大金律

### 金律 1：簡短且具描述性

| 原則 | 說明 |
|------|------|
| 越短越好 | 短 URL 在 SERP 中更美觀、更容易被完整顯示 |
| 有描述性 | 使用者看到 URL 就能猜出頁面內容 |
| 避免無意義參數 | `?p=123&ref=abc` 對使用者和 Google 都無用 |

**實戰建議**：URL 長度控制在 **50-75 字元**以內（不含網域）。

### 金律 2：使用連字號（-）分隔單詞

| ⭕ 正確 | ❌ 錯誤 |
|--------|--------|
| `seo-tutorial-2026` | `seotutorial2026` |
| `dog-food-guide` | `dog_food_guide`（底線不被 Google 視為分隔符） |
| `best-laptops-2026` | `best+laptops+2026` |

> Google 將連字號（hyphen）視為空格分隔符，但將底線（underscore）視為單詞的一部分。

### 金律 3：全部使用小寫字母

| ⭕ 正確 | ❌ 錯誤 |
|--------|--------|
| `pethk.hk/seo-guide` | `pethk.hk/SEO-Guide` |
| `pethk.hk/about-us` | `pethk.hk/About-Us` |

**原因**：某些伺服器（特別是 Linux/Apache）對大小寫敏感，`/SEO-Guide` 和 `/seo-guide` 可能被視為不同頁面，造成重複內容問題。

### 金律 4：包含目標關鍵字

URL 是 Google 理解頁面主題的信號之一。在 URL 中包含主要關鍵字有助於：
- Google 快速理解頁面主題
- 使用者在 SERP 中看到關鍵字被粗體顯示
- 其他網站引用時，URL 中的關鍵字成為自然的錨點文字（對香港本地媒體同連登引用亦有幫助）

| 頁面主題 | 建議 URL |
|----------|----------|
| SEO 教學（香港篇） | `pethk.hk/seo-tutorial-hong-kong` |
| 狗糧推介 | `pethk.hk/dog-food-guide` |
| laptop 比較文 | `pethk.hk/laptop-comparison-2026` |
| 觀塘搬屋服務 | `pethk.hk/moving-service/kwun-tong` |

### 金律 5：使用靜態 URL，避免動態參數

| URL 類型 | 範例 | SEO 友好度 |
|----------|------|-----------|
| **靜態 URL** | `pethk.hk/products/dog-food` | ⭐⭐⭐⭐⭐ |
| **含少量參數** | `pethk.hk/products?category=dog` | ⭐⭐⭐ |
| **多參數混亂** | `pethk.hk/?cat=45&id=789&session=abc` | ⭐ |

**解決方案**：使用 URL Rewrite（重寫規則）將動態 URL 轉換為靜態格式。

### 金律 6：反映網站結構層級

URL 應該反映網站的分類結構，形成清晰的「麵包屑」路徑：

```
pethk.hk/                              ← 首頁
pethk.hk/blog/                         ← 部落格首頁
pethk.hk/blog/seo/                     ← SEO 分類
pethk.hk/blog/seo/keyword-research/    ← 具體文章

pethk.hk/districts/                    ← 香港 18 區服務總覽
pethk.hk/moving-service/kwun-tong/     ← 觀塘搬屋
pethk.hk/moving-service/sha-tin/       ← 沙田搬屋
```

**原則**：不要巢狀過深。建議 URL 層級最多不超過 **3-4 層**。

> **香港地區頁提醒**：18 區頁大規模生成時，最容易犯嘅錯係「淨係換地區名、內容完全一樣」，Google 會當做門頁（doorway pages）。每區頁要有獨特內容（該區案例、實際收費、就近團隊、交通資訊）。

### 金律 7：避免在 URL 中使用停用詞（Stop Words）

停用詞是那些對 URL 含義貢獻不大的詞：

| 建議避免 | 因為 |
|----------|------|
| `the`, `a`, `an`, `and`, `or`, `but`, `in`, `on`, `of`, `to` | 增加 URL 長度而不增加資訊量 |

| ⭕ 精簡 | ❌ 冗長 |
|--------|--------|
| `pethk.hk/best-seo-tools` | `pethk.hk/the-best-seo-tools-of-the-year` |
| `pethk.hk/dog-food-guide` | `pethk.hk/a-complete-guide-to-dog-food` |

### 金律 8：URL 只改一次，改了就要做 301

一旦確定了 URL 結構，盡量不要更改。如果確實需要改（例如由 `.com` 轉 `.hk`，或者加 `/zh-hk/` 子目錄）：

1. **設置 301 永久重定向**：從舊 URL 指向新 URL（**要逐頁對應**，唔好全部 redirect 去首頁）
2. **更新內部連結**：將網站內所有指向舊 URL 的連結改為新 URL
3. **在 GSC 中提交變更**：使用 Google Search Console 的「地址變更」工具
4. **更新 Sitemap**：生成並提交新的 XML Sitemap
5. **同步更新 hreflang**：多語站改結構時，hreflang 一定要一齊改，否則會互相「打架」
6. **通知引用方**：香港媒體、商會目錄、OpenRice / TripAdvisor 等平台嘅舊連結要一併更新

---

## 各類型頁面的 URL 範本

| 頁面類型 | URL 範本 |
|----------|----------|
| **首頁** | `pethk.hk/` |
| **關於我們** | `pethk.hk/about` |
| **聯絡頁面** | `pethk.hk/contact` |
| **部落格首頁** | `pethk.hk/blog/` |
| **分類頁** | `pethk.hk/category/[分類名稱]/` |
| **文章頁** | `pethk.hk/blog/[文章關鍵字]/` |
| **產品分類** | `pethk.hk/products/[分類名稱]/` |
| **產品頁** | `pethk.hk/products/[分類]/[產品名稱]/` |
| **地區服務頁** | `pethk.hk/[服務]/[地區英文]/` |
| **英文版** | `pethk.hk/en-hk/[同上結構]/` |

---

## 中文 URL 的處理策略

當網站使用中文（香港係繁體中文）時，URL 有兩種策略：

### 策略 A：使用英文翻譯（推薦）

| ⭕ 好 | ❌ 差 |
|------|------|
| `pethk.hk/news/technology/` | `pethk.hk/新聞/科技/` |
| `pethk.hk/seo-tutorial/` | `pethk.hk/SEO教學/` |

**原因**：
- 中文 URL 在分享時會被編碼成 `%E6%96%B0%E8%81%9E`，極長且難讀（WhatsApp 轉發時特別難睇）
- 英文 URL 在不同平台上的兼容性更好（Facebook、IG、連登、小紅書）
- 英文 URL 在反向連結中更容易處理

### 策略 B：使用粵語拼音

| 頁面主題 | 建議 URL | 備註 |
|----------|----------|------|
| 旺角門市 | `pethk.hk/stores/mong-kok/` | 香港地名通用拼法優於普通話拼音（mong-kok 好過 wang-jiao） |
| 狗糧推介 | `pethk.hk/dog-food-guide/` | 產品類直接用英文更清晰 |
| 關於我們 | `pethk.hk/about/` | 固定頁面用通用英文 |

> **最佳實踐（香港）**：
> - **地名用香港通用拼法**：Mong Kok、Causeway Bay、Tsim Sha Tsui、Sha Tin、Tuen Mun、Tseung Kwan O（**唔好**用普通話拼音 wangjiao / tongluowan，香港人同 Google 都唔認）。
> - **通用／專業術語用英文**：`seo`、`renovation`、`tutorial`、`company-secretary`。
> - **品牌名保留原名**，唔好硬譯成拼音。
> - 如果用拼音，**全站要一致**，唔好一半拼音一半英文。

---

## 特殊情況處理

### WWW vs 非 WWW：選擇一個並保持一致

| 選項 | 範例 |
|------|------|
| 使用 www | `https://www.pethk.hk` |
| 不使用 www | `https://pethk.hk` |

**二選一**，然後：
1. 設定 Canonical URL 指向你選擇的版本
2. 將另一個版本 301 重定向到主力版本
3. 在 GSC 中將兩個版本都加入為資源，並設定首選網域

### HTTPS vs HTTP：必須使用 HTTPS

HTTPS 已經是 Google 的**排名信號**之一。如果你的網站還在用 HTTP：
1. 購買並安裝 SSL 憑證（香港主機商多數免費提供 Let's Encrypt）
2. 將所有 HTTP URL 301 重定向到 HTTPS
3. 更新 Canonical URL、Sitemap、內部連結
4. 在 GSC 中加入 HTTPS 版本

> **香港合規補充**：如果你收集用戶資料（表單、會員、評論），HTTPS 係基本；同時要遵守 **PDPO《個人資料（私隱）條例）**，私隱政策頁要有。

### 尾綴斜線（Trailing Slash）：保持一致

| 選項 | 範例 |
|------|------|
| 有尾綴斜線 | `pethk.hk/blog/` |
| 無尾綴斜線 | `pethk.hk/blog` |

**二選一**，然後：
- 將另一個版本 301 重定向到主力版本
- 在 Canonical URL 中使用你選擇的版本

---

## URL 結構優化檢查清單

- [ ] URL 簡短且具描述性（50-75 字元以內）
- [ ] 使用連字號（-）分隔單詞
- [ ] 全部使用小寫字母
- [ ] 包含目標關鍵字
- [ ] 使用靜態 URL，避免動態參數
- [ ] URL 層級不超過 3-4 層
- [ ] 避免 URL 中的停用詞
- [ ] 已決定網域策略（.hk / .com.hk / .com）
- [ ] 多語站已用子目錄（`/zh-hk/`、`/en-hk/`）並配好 hreflang
- [ ] 香港地名用通用拼法（mong-kok、causeway-bay）
- [ ] 選擇 WWW 或非 WWW，並做好重定向
- [ ] 全站使用 HTTPS
- [ ] 尾綴斜線策略一致
- [ ] 中文內容使用英文/通用拼法 URL
- [ ] 舊 URL 改動時設置 301 重定向（逐頁對應）

---

## 重點回顧

1. **URL = 使用者和搜尋引擎的第一印象**——簡短、乾淨、有意義（WhatsApp 轉發時特別重要）
2. **八大金律**構成 URL 優化的核心：短、連字號、小寫、關鍵字、靜態、層級、精簡、穩定
3. **連字號（-）是單詞分隔符**，底線（_）不是
4. **香港站要先決定網域**：`.hk` / `.com.hk` 地區信號最強；多語用 `/zh-hk/`、`/en-hk/` 子目錄
5. **中文 URL 使用英文翻譯或香港通用拼法**，避免中文編碼帶來的兼容性問題
6. **URL 改動 = 必須 301**，否則會損失累積的 SEO 價值
7. 一致性是王道：WWW、HTTPS、尾綴斜線都要全站統一

---

| ← [第 19 章：Header 標籤優化策略](/blog/heading-tags) | [回索引](/blog) | [第 21 章：圖片 SEO 完整指南 →](/blog/image-seo) |
