---

## 什麼是結構化資料？

**結構化資料（Structured Data）** 是一種標準化的資料格式，用來明確告訴搜尋引擎「這個頁面上的內容是什麼」。它是搜尋引擎的「翻譯官」，將人類閱讀的內容轉換為機器可以精確理解的格式。

```html
<!-- Google 看到的普通 HTML -->
<h1>皇家 S 系列小型犬飼料</h1>
<p>價格：$890</p>
<p>評分：4.5 / 5</p>

<!-- 加上 Schema Markup 後 -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "皇家 S 系列小型犬飼料",
  "offers": {
    "@type": "Offer",
    "price": "890",
    "priceCurrency": "TWD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "128"
  }
}
</script>
```

加上 Schema Markup 後，這個頁面就有資格在 SERP 中顯示**豐富結果（Rich Results）**——包含星級評分、價格、庫存狀態等額外資訊。

---

## 為什麼 Schema Markup 對 SEO 至關重要？

### 直接好處：Rich Results 提升點擊率

| 頁面類型 | 無 Schema | 有 Schema（Rich Result） | CTR 提升 |
|----------|-----------|-------------------------|----------|
| 產品頁 | 藍色連結 + 描述 | + 星級評分、價格、庫存 | +15-30% |
| 食譜 | 藍色連結 + 描述 | + 圖片、評分、烹飪時間 | +20-35% |
| FAQ 頁面 | 藍色連結 + 描述 | + 展開式問答 | +10-25% |
| 文章 | 藍色連結 + 描述 | + 輪播圖、大圖 | +10-20% |

### 間接好處：Google 更準確地理解你的內容

即使不顯示 Rich Results，Schema Markup 也能幫助 Google：
- 確認內容類型（文章、產品、食譜、活動...）
- 理解內容實體之間的關係
- 為 AI Overview 和語音搜尋提供結構化的答案來源

---

## Schema Markup 的三種格式

| 格式 | 範例 | 推薦度 |
|------|------|--------|
| **JSON-LD** | `<script type="application/ld+json">` | ⭐⭐⭐⭐⭐ Google 官方推薦 |
| **Microdata** | 在 HTML 標籤中嵌入 | ⭐⭐ 較混亂，不推薦 |
| **RDFa** | HTML 屬性擴展 | ⭐ 過時，不推薦 |

> **只使用 JSON-LD**。它是 Google 官方推薦的格式，與 HTML 分離、易於維護、不易出錯。

---

## 最常用的 Schema 類型全攻略

### 1. Organization（組織）

用於首頁或關於頁面，告訴 Google 你的品牌資訊：

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "PetHome",
  "url": "https://www.pethome.com",
  "logo": "https://www.pethome.com/logo.png",
  "description": "全台最專業寵物用品平台",
  "sameAs": [
    "https://www.facebook.com/pethome",
    "https://www.instagram.com/pethome"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+886-2-1234-5678",
    "contactType": "customer service"
  }
}
```

### 2. Article / BlogPosting（文章）

用於部落格文章和新聞內容：

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "2024 年 SEO 完整教學：從入門到第一頁排名",
  "author": {
    "@type": "Person",
    "name": "Cyrus Chan",
    "url": "https://www.pethome.com/about/cyrus"
  },
  "datePublished": "2024-03-15",
  "dateModified": "2024-06-20",
  "image": "https://www.pethome.com/images/seo-guide.jpg",
  "description": "從關鍵字研究到技術 SEO 的完整教學"
}
```

### 3. FAQ（常見問題）

最值得立即實施的 Schema——Google 會在 SERP 中顯示展開式的 Q&A：

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "狗飼料應該多久換一次？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "一般建議每 3-6 個月逐步調整一次。過於頻繁的更換（少於 1 個月）可能導致腸胃不適。"
      }
    },
    {
      "@type": "Question",
      "name": "如何判斷狗飼料的品質？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "查看成分表的前 5 項：優質飼料的第一成分應為具體的肉類（如雞肉、牛肉），而非模糊的肉粉或穀物填充物。"
      }
    }
  ]
}
```

> **FAQ Schema 的強制要求**：頁面上必須**實際存在**這些問答內容。不能為了 Schema 而虛構 FAQ。

### 4. Product（產品）

電商網站最重要的 Schema：

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "皇家 S 系列小型犬飼料 2kg",
  "image": "https://www.pethome.com/images/royal-s.jpg",
  "description": "專為小型犬設計的均衡營養配方",
  "brand": { "@type": "Brand", "name": "Royal Canin" },
  "sku": "RC-S-2KG",
  "offers": {
    "@type": "Offer",
    "price": "890",
    "priceCurrency": "TWD",
    "availability": "https://schema.org/InStock",
    "url": "https://www.pethome.com/products/royal-s-2kg"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "128"
  }
}
```

### 5. BreadcrumbList（麵包屑導航）

讓 Google 在 SERP 中顯示層級路徑：

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "首頁",
      "item": "https://www.pethome.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "狗飼料",
      "item": "https://www.pethome.com/dog-food"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "小型犬專用",
      "item": "https://www.pethome.com/dog-food/small-breed"
    }
  ]
}
```

### 6. HowTo（教學步驟）

適合步驟教學型內容，可能在 SERP 中顯示逐步指引：

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "如何逐步更換狗飼料",
  "step": [
    {
      "@type": "HowToStep",
      "name": "第 1-3 天",
      "text": "混合 25% 新飼料 + 75% 舊飼料"
    },
    {
      "@type": "HowToStep",
      "name": "第 4-6 天",
      "text": "混合 50% 新飼料 + 50% 舊飼料"
    }
  ]
}
```

### 7. LocalBusiness（本地商家）

實體店家的必備 Schema：

```json
{
  "@context": "https://schema.org",
  "@type": "PetStore",
  "name": "PetHome 台北旗艦店",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "忠孝東路四段 100 號",
    "addressLocality": "台北市",
    "postalCode": "106",
    "addressCountry": "TW"
  },
  "telephone": "+886-2-1234-5678",
  "openingHours": "Mo-Su 10:00-22:00",
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "25.0418",
    "longitude": "121.5432"
  }
}
```

---

## Schema Markup 實戰流程

### 步驟 1：確定你的頁面需要哪些 Schema

| 頁面類型 | 優先實施的 Schema |
|----------|------------------|
| 首頁 | Organization, WebSite, SearchAction |
| 文章 | Article/BlogPosting, FAQ (if applicable), BreadcrumbList |
| 產品頁 | Product, Offer, AggregateRating, BreadcrumbList |
| 聯絡頁面 | Organization, ContactPoint |
| 活動頁面 | Event |
| 教學頁面 | HowTo |

### 步驟 2：生成 Schema 代碼

| 方法 | 適合 |
|------|------|
| **Google 結構化資料標記助手** | 新手，可視化標記 |
| **技術 SEO 外掛（Yoast、Rank Math）** | WordPress 使用者 |
| **手寫 JSON-LD** | 需要精確控制的進階使用者 |
| **Merkle Schema Markup Generator** | 快速生成常見類型 |

### 步驟 3：驗證 Schema 代碼

**使用 Google 的 Rich Results Test**（[search.google.com/test/rich-results](https://search.google.com/test/rich-results)）：
1. 貼上 URL 或代碼片段
2. 檢查是否有錯誤或警告
3. 預覽 Rich Result 的顯示效果

**使用 Schema Markup Validator**（[validator.schema.org](https://validator.schema.org)）：
- 更全面的 Schema 語法驗證
- 檢查所有 Schema.org 類型，不限於 Google 支援的 Rich Results

### 步驟 4：部署並監控

1. 將 JSON-LD 代碼放在 `<head>` 區塊中（或 `<body>` 底部）
2. 在 GSC 中查看「強化項目」報告
3. 監控 Rich Results 的顯示情況和點擊率變化

---

## Schema 常見錯誤與解決方案

| 錯誤 | 影響 | 解決方案 |
|------|------|----------|
| **必填屬性缺失** | Schema 無效，失去 Rich Result 資格 | 檢查 Google 文檔中的必填屬性清單 |
| **屬性值格式錯誤** | Rich Result 顯示異常 | 使用驗證工具檢查 |
| **Schema 與頁面內容不一致** | 可能被 Google 視為垃圾內容 | 確保 Schema 完全對應頁面實際內容 |
| **重複的 Schema 類型** | 混淆 Google 的判斷 | 一個頁面只需一組核心 Schema |
| **價格/庫存不即時更新** | 使用者體驗差、可能被處罰 | 使用動態生成 JSON-LD |

---

## 重點回顧

1. **Schema Markup = 搜尋引擎的翻譯官**——將人類內容翻譯為機器可讀的格式
2. **只使用 JSON-LD 格式**——Google 官方推薦
3. **FAQ Schema 是最容易見效的**——立即實施、效果明顯
4. **Rich Result = CTR 提升 10-35%**——直接影響點擊率
5. **部署前一定要驗證**——使用 Rich Results Test 和 Schema Validator
6. **Schema 不能虛構**——必須與頁面上實際存在的內容一致

---

| ← [第 23 章：內部連結 SEO 戰術](/blog/internal-linking) | [回索引](/blog) | [第 25 章：網站速度優化 →](/blog/site-speed) |
