---

## 為什麼 URL 結構對 SEO 重要？

URL（網址）是使用者和搜尋引擎接觸你網站的第一個技術層面。一個好的 URL 結構不僅幫助 Google 理解頁面主題，更能提升使用者點擊意願和信任度。

> Google 的官方指南：「URL 應該簡單、易於理解，讓使用者和搜尋引擎都能從中獲得有意義的資訊。」

---

## 好 URL vs 壞 URL：一圖看懂

| 好 URL | 壞 URL |
|--------|--------|
| `example.com/dog-food-guide` | `example.com/?p=123` |
| `example.com/products/royal-small-breed` | `example.com/index.php?category_id=45&product=789&session=abc123` |
| `example.com/blog/seo-tutorial-2024` | `example.com/2024/03/15/category/seo/article-about-seo.html` |

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
| `seo-tutorial-2024` | `seotutorial2024` |
| `dog-food-guide` | `dog_food_guide`（底線不被 Google 視為分隔符） |
| `best-laptops-2024` | `best+laptops+2024` |

> Google 將連字號（hyphen）視為空格分隔符，但將底線（underscore）視為單詞的一部分。

### 金律 3：全部使用小寫字母

| ⭕ 正確 | ❌ 錯誤 |
|--------|--------|
| `example.com/seo-guide` | `example.com/SEO-Guide` |
| `example.com/about-us` | `example.com/About-Us` |

**原因**：某些伺服器（特別是 Linux/Apache）對大小寫敏感，`/SEO-Guide` 和 `/seo-guide` 可能被視為不同頁面，造成重複內容問題。

### 金律 4：包含目標關鍵字

URL 是 Google 理解頁面主題的信號之一。在 URL 中包含主要關鍵字有助於：
- Google 快速理解頁面主題
- 使用者在 SERP 中看到關鍵字被粗體顯示
- 其他網站引用時，URL 中的關鍵字成為自然的錨點文字

| 頁面主題 | 建議 URL |
|----------|----------|
| SEO 教學 | `example.com/seo-tutorial` |
| 狗飼料推薦 | `example.com/dog-food-recommendations` |
| 筆電比較文 | `example.com/laptop-comparison-2024` |

### 金律 5：使用靜態 URL，避免動態參數

| URL 類型 | 範例 | SEO 友好度 |
|----------|------|-----------|
| **靜態 URL** | `example.com/products/dog-food` | ⭐⭐⭐⭐⭐ |
| **含少量參數** | `example.com/products?category=dog` | ⭐⭐⭐ |
| **多參數混亂** | `example.com/?cat=45&id=789&session=abc` | ⭐ |

**解決方案**：使用 URL Rewrite（重寫規則）將動態 URL 轉換為靜態格式。

### 金律 6：反映網站結構層級

URL 應該反映網站的分類結構，形成清晰的「麵包屑」路徑：

```
example.com/                    ← 首頁
example.com/blog/               ← 部落格首頁
example.com/blog/seo/           ← SEO 分類
example.com/blog/seo/keyword-research/  ← 具體文章
```

**原則**：不要巢狀過深。建議 URL 層級最多不超過 **3-4 層**。

### 金律 7：避免在 URL 中使用停用詞（Stop Words）

停用詞是那些對 URL 含義貢獻不大的詞：

| 建議避免 | 因為 |
|----------|------|
| `the`, `a`, `an`, `and`, `or`, `but`, `in`, `on`, `of`, `to` | 增加 URL 長度而不增加資訊量 |

| ⭕ 精簡 | ❌ 冗長 |
|--------|--------|
| `example.com/best-seo-tools` | `example.com/the-best-seo-tools-of-the-year` |
| `example.com/dog-food-guide` | `example.com/a-complete-guide-to-dog-food` |

### 金律 8：URL 只改一次，改了就要做 301

一旦確定了 URL 結構，盡量不要更改。如果確實需要改：

1. **設置 301 永久重定向**：從舊 URL 指向新 URL
2. **更新內部連結**：將網站內所有指向舊 URL 的連結改為新 URL
3. **在 GSC 中提交變更**：使用 Google Search Console 的「地址變更」工具
4. **更新 Sitemap**：生成並提交新的 XML Sitemap

---

## 各類型頁面的 URL 範本

| 頁面類型 | URL 範本 |
|----------|----------|
| **首頁** | `example.com/` |
| **關於我們** | `example.com/about` |
| **聯絡頁面** | `example.com/contact` |
| **部落格首頁** | `example.com/blog/` |
| **分類頁** | `example.com/category/[分類名稱]/` |
| **文章頁** | `example.com/blog/[文章關鍵字]/` |
| **產品分類** | `example.com/products/[分類名稱]/` |
| **產品頁** | `example.com/products/[分類]/[產品名稱]/` |

---

## 中文 URL 的處理策略

當網站使用中文時，URL 有兩種策略：

### 策略 A：使用英文拼音或翻譯（推薦）

| ⭕ 好 | ❌ 差 |
|------|------|
| `example.com/xinwen/keji/` | `example.com/新聞/科技/` |
| `example.com/seo-jiaoxue/` | `example.com/SEO教學/` |

**原因**：
- 中文 URL 在分享時會被編碼成 `%E6%96%B0%E8%81%9E`，極長且難讀
- 英文 URL 在不同平台上的兼容性更好
- 英文 URL 在反向連結中更容易處理

### 策略 B：使用英文翻譯

| 頁面主題 | 建議 URL |
|----------|----------|
| SEO 教學 | `example.com/seo-tutorial` |
| 狗飼料推薦 | `example.com/dog-food-guide` |
| 關於我們 | `example.com/about` |

> **最佳實踐**：如果品牌是中文，可以用拼音；如果是國際化網站，用英文。

---

## 特殊情況處理

### WWW vs 非 WWW：選擇一個並保持一致

| 選項 | 範例 |
|------|------|
| 使用 www | `https://www.example.com` |
| 不使用 www | `https://example.com` |

**二選一**，然後：
1. 設定 Canonical URL 指向你選擇的版本
2. 將另一個版本 301 重定向到主力版本
3. 在 GSC 中將兩個版本都加入為資源，並設定首選網域

### HTTPS vs HTTP：必須使用 HTTPS

HTTPS 已經是 Google 的**排名信號**之一。如果你的網站還在用 HTTP：
1. 購買並安裝 SSL 憑證
2. 將所有 HTTP URL 301 重定向到 HTTPS
3. 更新 Canonical URL、Sitemap、內部連結
4. 在 GSC 中加入 HTTPS 版本

### 尾綴斜線（Trailing Slash）：保持一致

| 選項 | 範例 |
|------|------|
| 有尾綴斜線 | `example.com/blog/` |
| 無尾綴斜線 | `example.com/blog` |

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
- [ ] 選擇 WWW 或非 WWW，並做好重定向
- [ ] 全站使用 HTTPS
- [ ] 尾綴斜線策略一致
- [ ] 中文內容使用英文/拼音 URL
- [ ] 舊 URL 改動時設置 301 重定向

---

## 重點回顧

1. **URL = 使用者和搜尋引擎的第一印象**——簡短、乾淨、有意義
2. **八大金律**構成 URL 優化的核心：短、連字號、小寫、關鍵字、靜態、層級、精簡、穩定
3. **連字號（-）是單詞分隔符**，底線（_）不是
4. **中文 URL 使用英文翻譯或拼音**，避免中文編碼帶來的兼容性問題
5. **URL 改動 = 必須 301**，否則會損失累積的 SEO 價值
6. 一致性是王道：WWW、HTTPS、尾綴斜線都要全站統一

---

| ← [第 19 章：Header 標籤優化策略](/blog/heading-tags) | [回索引](/blog) | [第 21 章：圖片 SEO 完整指南 →](/blog/image-seo) |
