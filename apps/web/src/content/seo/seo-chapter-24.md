---

## 什麼是結構化資料？

**結構化資料（Structured Data）** 是一種標準化的資料格式，用來明確告訴搜尋引擎「這個頁面上的內容是什麼」。它是搜尋引擎的「翻譯官」，將人類閱讀的內容轉換為機器可以精確理解的格式。

```html
<!-- Google 看到的普通 HTML -->
<h1>皇家 S 系列小型犬狗糧</h1>
<p>價格：HK$298</p>
<p>評分：4.5 / 5</p>

<!-- 加上 Schema Markup 後 -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "皇家 S 系列小型犬狗糧",
  "offers": {
    "@type": "Offer",
    "price": "298",
    "priceCurrency": "HKD"
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

> **香港必改位**：`priceCurrency` 一定要用 **`HKD`**（ISO 4217 貨幣代碼），唔好用 `TWD`、`CNY` 或 `USD`——否則 Google 可能顯示錯貨幣，甚至判為資料不一致。

---

## 香港市場嘅 Schema 重點

| 重點 | 說明 |
|------|------|
| **貨幣用 HKD** | 所有 `priceCurrency` 一律 `"HKD"`；配合消委會指引，價錢要列明係咪已包其他費用 |
| **地址用香港格式** | `streetAddress`（街道 + 大廈 + 室號）、`addressLocality`（香港／九龍／新界 + 地區）、`addressCountry: "HK"`，香港無郵政編碼可省略 `postalCode` |
| **電話用 +852** | `telephone: "+852-2111-2222"`；WhatsApp 號碼可用 `ContactPoint` 嘅 `contactOption` |
| **雙語站要配 hreflang** | 繁中 `/zh-hk/`、英文 `/en-hk/`、簡中 `/zh-cn/`，Schema 入面嘅 `url` 要指向對應語言版本 |
| **本地生意必用 LocalBusiness** | 香港實體店（餐廳、診所、補習社、地產代理）一定要做，配合 Google 商家檔案（GBP） |

---

## 為什麼 Schema Markup 對 SEO 至關重要？

### 直接好處：Rich Results 提升點擊率

| 頁面類型 | 無 Schema | 有 Schema（Rich Result） | CTR 提升 |
|----------|-----------|-------------------------|----------|
| 產品頁 | 藍色連結 + 描述 | + 星級評分、價格（HK$）、庫存 | +15-30% |
| 食譜 | 藍色連結 + 描述 | + 圖片、評分、烹飪時間 | +20-35% |
| FAQ 頁面 | 藍色連結 + 描述 | + 展開式問答 | +10-25% |
| 文章 | 藍色連結 + 描述 | + 輪播圖、大圖 | +10-20% |
| 本地商家 | 藍色連結 + 描述 | + 地址、營業時間、評分 | 香港本地搜尋特別有效 |

### 間接好處：Google 更準確地理解你的內容

即使不顯示 Rich Results，Schema Markup 也能幫助 Google：
- 確認內容類型（文章、產品、食譜、活動...）
- 理解內容實體之間的關係
- 為 AI Overview 和語音搜尋提供結構化的答案來源

> **AI 搜尋補充**：香港用家用緊 ChatGPT、Gemini、Perplexity、Copilot 同 Google AI Overviews。Schema 提供嘅結構化事實（價錢、營業時間、評分、地址）係 AI 最容易安全引用嘅內容——**唔使 AI 自己由長文度估**。

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
  "name": "PetHK 毛孩百貨",
  "url": "https://www.pethk.hk",
  "logo": "https://www.pethk.hk/logo.png",
  "description": "香港寵物用品專門店，狗糧貓糧零食玩具一站買齊",
  "sameAs": [
    "https://www.facebook.com/pethk",
    "https://www.instagram.com/pethk",
    "https://www.openrice.com/..."
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+852-2111-2222",
    "contactType": "customer service",
    "areaServed": "HK",
    "availableLanguage": ["zh-HK", "en"]
  }
}
```

> **香港 E-E-A-T 貼士**：`sameAs` 可以加入香港本地權威檔案（Facebook 專頁、Instagram、LinkedIn、HKTDC 目錄、商會頁面、OpenRice），幫 Google 確認你係一間真實存在嘅香港公司。想再強化，可以對照公司註冊處（ICRIS）資料保持一致。

### 2. Article / BlogPosting（文章）

用於部落格文章和新聞內容：

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "2026 年 SEO 完整教學（香港篇）：由入門到第一頁排名",
  "author": {
    "@type": "Person",
    "name": "Cyrus Chan",
    "url": "https://www.pethk.hk/about/cyrus"
  },
  "datePublished": "2026-03-15",
  "dateModified": "2026-06-20",
  "image": "https://www.pethk.hk/images/seo-guide.jpg",
  "description": "由關鍵字研究到技術 SEO 嘅完整教學，附香港市場實例",
  "inLanguage": "zh-HK"
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
      "name": "狗糧應該幾時換一次？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "一般建議每 3-6 個月逐步調整一次。轉得太密（少過 1 個月）可能令狗狗腸胃唔舒服。"
      }
    },
    {
      "@type": "Question",
      "name": "點樣判斷狗糧嘅質素？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "睇成分表頭 5 項：優質狗糧第一成分應該係具體嘅肉類（例如雞肉、牛肉），而唔係含糊嘅肉粉或穀物填充物。"
      }
    }
  ]
}
```

> **FAQ Schema 的強制要求**：頁面上必須**實際存在**這些問答內容。不能為了 Schema 而虛構 FAQ。
>
> **香港注意**：Google 2023 年起已將 FAQ Rich Result 收窄到只對政府同醫療權威網站顯示。不過 FAQ Schema 仍然有價值——佢幫 Google 同 AI 理解你嘅問答結構，**對 GEO / AI 搜尋摘錄仍然有用**。

### 4. Product（產品）

電商網站最重要的 Schema（價錢記得用 HKD）：

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "皇家 S 系列小型犬狗糧 2kg",
  "image": "https://www.pethk.hk/images/royal-s.jpg",
  "description": "專為小型犬設計嘅均衡營養配方",
  "brand": { "@type": "Brand", "name": "Royal Canin" },
  "sku": "RC-S-2KG",
  "offers": {
    "@type": "Offer",
    "price": "298",
    "priceCurrency": "HKD",
    "availability": "https://schema.org/InStock",
    "url": "https://www.pethk.hk/products/royal-s-2kg",
    "priceValidUntil": "2026-12-31",
    "shippingDetails": {
      "@type": "OfferShippingDetails",
      "shippingRate": {
        "@type": "MonetaryAmount",
        "value": "0",
        "currency": "HKD"
      },
      "shippingDestination": {
        "@type": "DefinedRegion",
        "addressCountry": "HK"
      }
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "128"
  }
}
```

> **合規提醒**：`aggregateRating` 一定要來自**真實用戶評價**，虛構評分係違規。香港商戶亦要留意消委會指引——標價要列明係咪「已包其他費用」，Schema 入面嘅價錢要同頁面顯示一致。

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
      "item": "https://www.pethk.hk"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "狗糧",
      "item": "https://www.pethk.hk/dog-food"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "小型犬專用",
      "item": "https://www.pethk.hk/dog-food/small-breed"
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
  "name": "點樣逐步幫狗狗轉狗糧",
  "step": [
    {
      "@type": "HowToStep",
      "name": "第 1-3 日",
      "text": "混合 25% 新糧 + 75% 舊糧"
    },
    {
      "@type": "HowToStep",
      "name": "第 4-6 日",
      "text": "混合 50% 新糧 + 50% 舊糧"
    }
  ]
}
```

### 7. LocalBusiness（本地商家）

實體店家的必備 Schema（香港地址格式示範）：

```json
{
  "@context": "https://schema.org",
  "@type": "PetStore",
  "name": "PetHK 旺角旗艦店",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "彌敦道 688 號旺角中心一期 8 樓 802 室",
    "addressLocality": "旺角, 九龍",
    "addressRegion": "Kowloon",
    "addressCountry": "HK"
  },
  "telephone": "+852-2111-2222",
  "openingHours": "Mo-Su 11:00-21:00",
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "22.3193",
    "longitude": "114.1694"
  },
  "priceRange": "HK$50 - HK$1,500",
  "currenciesAccepted": "HKD"
}
```

**香港地址填寫要點**：

| 欄位 | 香港做法 | 例子 |
|------|----------|------|
| `streetAddress` | 街道 + 門牌 + 大廈 + 樓層 + 室號 | `彌敦道 688 號旺角中心一期 8 樓 802 室` |
| `addressLocality` | 地區 + 香港／九龍／新界 | `旺角, 九龍` |
| `addressRegion` | Hong Kong Island / Kowloon / New Territories | `Kowloon` |
| `addressCountry` | **HK** | `HK` |
| `postalCode` | 香港唔用郵政編碼，**可省略** | — |
| `telephone` | `+852` 開頭 | `+852-2111-2222` |
| `openingHours` | 格式 `Mo-Su 11:00-21:00` | 要同 Google 商家檔案一致 |

> **NAP 一致性**：Schema 入面嘅名稱、地址、電話一定要同 **Google 商家檔案（GBP）**、OpenRice、Facebook、TripAdvisor 嘅資料完全一致，否則會削弱本地 SEO 信號。

### 8. Restaurant（香港餐飲常用）

```json
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "XX 日本料理",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "軒尼詩道 500 號 3 樓",
    "addressLocality": "銅鑼灣, 香港島",
    "addressCountry": "HK"
  },
  "telephone": "+852-2888-3333",
  "servesCuisine": "日本菜",
  "priceRange": "HK$100 - HK$400",
  "currenciesAccepted": "HKD",
  "openingHours": "Mo-Su 12:00-22:30"
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
| **香港地區服務頁** | LocalBusiness 或 Service + BreadcrumbList |
| **餐廳 / 門市** | Restaurant / LocalBusiness + openingHours |

### 步驟 2：生成 Schema 代碼

| 方法 | 適合 |
|------|------|
| **Google 結構化資料標記助手** | 新手，可視化標記 |
| **技術 SEO 外掛（Yoast、Rank Math）** | WordPress 使用者 |
| **手寫 JSON-LD** | 需要精確控制的進階使用者（香港地址、HKD 貨幣建議手寫） |
| **Merkle Schema Markup Generator** | 快速生成常見類型 |

### 步驟 3：驗證 Schema 代碼

**使用 Google 的 Rich Results Test**（[search.google.com/test/rich-results](https://search.google.com/test/rich-results)）：
1. 貼上 URL 或代碼片段
2. 檢查是否有錯誤或警告（特別留意 `priceCurrency` 同地址格式）
3. 預覽 Rich Result 的顯示效果

**使用 Schema Markup Validator**（[validator.schema.org](https://validator.schema.org)）：
- 更全面的 Schema 語法驗證
- 檢查所有 Schema.org 類型，不限於 Google 支援的 Rich Results

### 步驟 4：部署並監控

1. 將 JSON-LD 代碼放在 `<head>` 區塊中（或 `<body>` 底部）
2. 雙語站：每個語言版本放對應語言嘅 Schema，`url` 指向自己嗰版
3. 在 GSC 中查看「強化項目」報告
4. 監控 Rich Results 的顯示情況和點擊率變化

---

## Schema 常見錯誤與解決方案

| 錯誤 | 影響 | 解決方案 |
|------|------|----------|
| **必填屬性缺失** | Schema 無效，失去 Rich Result 資格 | 檢查 Google 文檔中的必填屬性清單 |
| **屬性值格式錯誤** | Rich Result 顯示異常 | 使用驗證工具檢查 |
| **Schema 與頁面內容不一致** | 可能被 Google 視為垃圾內容 | 確保 Schema 完全對應頁面實際內容 |
| **重複的 Schema 類型** | 混淆 Google 的判斷 | 一個頁面只需一組核心 Schema |
| **價格/庫存不即時更新** | 使用者體驗差、可能被處罰 | 使用動態生成 JSON-LD |
| **貨幣用錯（TWD / CNY / USD）** | 香港用戶見到錯價錢，跳出率升 | 一律用 `"priceCurrency": "HKD"` |
| **地址格式錯（當咗台灣／大陸）** | 地區信號錯，本地 SEO 失效 | 用香港地址格式 + `"addressCountry": "HK"` |
| **虛構評分 / 評價** | 嚴重違規，可能被人工處罰 | 只用真實用戶評價（注意 PDPO 收集評論時嘅私隱要求） |

---

## 重點回顧

1. **Schema Markup = 搜尋引擎的翻譯官**——將人類內容翻譯為機器可讀的格式
2. **只使用 JSON-LD 格式**——Google 官方推薦
3. **香港必改三件事**：貨幣用 `HKD`、地址用香港格式 + `addressCountry: "HK"`、電話用 `+852`
4. **LocalBusiness / Restaurant Schema 係香港實體店必備**，要同 GBP、OpenRice 嘅 NAP 一致
5. **FAQ Schema 對 AI 搜尋摘錄仍然有價值**（即使 Google 已收窄 FAQ Rich Result）
6. **Rich Result = CTR 提升 10-35%**——直接影響點擊率
7. **部署前一定要驗證**——使用 Rich Results Test 和 Schema Validator
8. **Schema 不能虛構**——必須與頁面上實際存在的內容一致

---

| ← [第 23 章：內部連結 SEO 戰術](/blog/internal-linking) | [回索引](/blog) | [第 25 章：網站速度優化 →](/blog/site-speed) |
