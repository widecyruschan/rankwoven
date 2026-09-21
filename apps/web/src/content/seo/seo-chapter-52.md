---

## 什麼是結構化資料（Schema）？

**結構化資料（Structured Data）** 是一種標準化的資料格式，用來「標記」網頁內容，讓搜尋引擎更容易理解你的網頁在說什麼。

```
沒有 Schema：
  Google 看到：一串文字「陳大明牙醫診所 中環皇后大道中 100 號 2345 6789」
  Google 理解：🤔 呢個係公司名？人名？定係乜？

有 Schema：
  Google 看到：{
    type: "Dentist",
    name: "陳大明牙醫診所",
    address: "香港中環皇后大道中 100 號",
    telephone: "+852 2345 6789"
  }
  Google 理解：✅ 呢間係牙醫診所，喺中環，電話 2345 6789！
```

> **一句話總結：** Schema = 給搜尋引擎的「翻譯器」，把網頁內容轉換成機器能精確理解的格式。
>
> **香港重要性：** 香港地址格式（大廈 + 樓層 + 室號）、+852 電話、HK$ 價錢、中英雙語——全部都可以透過 Schema 明確話畀 Google 知，避免佢自己估錯。

---

## Schema 語法格式：JSON-LD

結構化資料有三種語法格式，但 Google 強烈推薦使用 **JSON-LD**：

| 格式 | 寫法 | Google 推薦？ |
|------|------|-------------|
| **JSON-LD** | 獨立的 `<script>` 區塊，不干擾 HTML | ✅ 強烈推薦 |
| Microdata | 嵌入在 HTML 標籤中（itemprop） | ⚠️ 仍支援，但不推薦 |
| RDFa | 嵌入在 HTML 屬性中 | ⚠️ 使用率極低 |

```html
<!-- JSON-LD 範例：最乾淨、最容易維護的寫法 -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "陳大明牙醫診所"
}
</script>
```

---

## 核心 Schema 類型介紹

### Schema.org 的類型層級

```
Thing（萬物）
  └── Organization（組織）
        └── LocalBusiness（本地商家）
              ├── Dentist（牙醫）
              ├── Restaurant（餐廳）/ FoodEstablishment
              ├── Hotel（酒店）
              ├── Store（商店）
              ├── MedicalClinic（診所）
              ├── ProfessionalService（專業服務）
              ├── HomeAndConstructionBusiness（居家建築）
              └── ... （還有數十個子類型）
```

### 如何選擇正確的 Schema 類型

```
規則：
  → 選擇最具體的類型。可以用 Dentist 就唔好用 LocalBusiness！
  → Google 支援的類型可以在官方文件找到：
    https://developers.google.com/search/docs/appearance/structured-data/search-gallery

香港常見行業對應的 Schema 類型：

  牙醫診所 → Dentist
  私家診所 / 中醫 → MedicalClinic
  茶餐廳 / 酒樓 / Cafe → Restaurant 或 FoodEstablishment
  酒店 / 賓館 → Hotel
  零售店 / 藥房 / 眼鏡店 → Store 或 LocalBusiness
  律師事務所 → Attorney 或 LegalService
  會計師樓 → AccountingService
  補習社 / 琴行 → EducationalOrganization（有實體地點時配合 LocalBusiness）
  髮廊 → HairSalon
  美容院 → BeautySalon
  Gym / Fitness → HealthClub
  水電 / 裝修 / 通渠 → HomeAndConstructionBusiness（配 areaServed）
  地產代理 → RealEstateAgent
```

---

## LocalBusiness Schema 完整範例（香港）

以下是一個完整的香港本地商家 LocalBusiness Schema，包含所有推薦填寫的屬性：

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Dentist",

  // === 基本資訊 ===
  "name": "陳大明牙醫診所",
  "description": "位於中環的專業牙科診所，提供植牙、隱形牙套矯正、牙齒美白等全面牙科服務。由超過 15 年經驗的陳大明醫生主理。",
  "url": "https://www.chendaming-dental.com.hk",
  "telephone": "+85223456789",
  "email": "info@chendaming-dental.com.hk",

  // === 香港地址（PostalAddress 嵌套） ===
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "皇后大道中 100 號 新鴻基大廈 12 樓 A 室",
    "addressLocality": "中環",
    "addressRegion": "香港島",
    "addressCountry": {
      "@type": "Country",
      "name": "HK"
    }
    // ⚠️ 香港沒有正式郵遞區號，postalCode 建議省略
    //    如平台強制要求，可使用佔位值 "999077"
  },

  // === 地理座標（香港常用範圍：緯度 22.15-22.58、經度 113.8-114.5） ===
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 22.2810,
    "longitude": 114.1577
  },

  // === 營業時間（使用標準 OpeningHoursSpecification） ===
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "18:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Saturday",
      "opens": "09:00",
      "closes": "13:00"
    }
  ],

  // === 價格範圍（港幣） ===
  "priceRange": "$$",
  "currenciesAccepted": "HKD",

  // === 付款方式（香港常用） ===
  "paymentAccepted": "現金、信用卡（Visa/Master）、EPS、八達通、PayMe、FPS 轉數快、支付寶香港、WeChat Pay HK",

  // === 服務語言（香港雙語社會必填） ===
  "knowsLanguage": ["zh-HK", "zh-CN", "en"],

  // === 社群媒體與香港目錄（SameAs） ===
  "sameAs": [
    "https://www.facebook.com/chendamingdental",
    "https://www.instagram.com/chendamingdental",
    "https://www.openrice.com/zh/hongkong/...",
    "https://www.tripadvisor.com/...",
    "https://www.yellowpages.com.hk/..."
  ],

  // === 圖片 ===
  "image": "https://www.chendaming-dental.com.hk/images/clinic-front.jpg",

  // === 商家標誌 ===
  "logo": "https://www.chendaming-dental.com.hk/images/logo.png",

  // === 創辦日期（可選） ===
  "foundingDate": "2010",

  // === 評論（可選，但強烈推薦！必須反映真實數據） ===
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "320",
    "bestRating": "5"
  },

  // === 地圖連結 ===
  "hasMap": "https://maps.google.com/?q=...",

  // === 服務區域（服務區域商家 SAB 用） ===
  "areaServed": [
    { "@type": "AdministrativeArea", "name": "中西區" },
    { "@type": "AdministrativeArea", "name": "灣仔區" },
    { "@type": "AdministrativeArea", "name": "油尖旺區" }
  ]

}
</script>
```

---

## 多分店商家的 Schema 策略（香港）

### 方法 1：每個分店頁面使用獨立的 LocalBusiness Schema

最推薦的做法。每個分店的頁面有自己獨立、完整的 Schema。

```
網站架構（香港雙語）：
  /zh-hk/locations/central/        → Dentist, address: 中環
  /zh-hk/locations/causeway-bay/   → Dentist, address: 銅鑼灣
  /zh-hk/locations/tsim-sha-tsui/  → Dentist, address: 尖沙咀

英文版各自對應：
  /en/locations/central/           → 同一間分店的英文版（配合 hreflang）
```

### 方法 2：首頁使用 Organization Schema + 分店資訊

如果你的首頁（或 Store Locator 頁面）需要標記多個分店，可以使用 Organization Schema 的方式：

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Dentist",
  "name": "陳大明牙科集團",
  "url": "https://www.chendaming-dental.com.hk",
  "department": [
    {
      "@type": "Dentist",
      "name": "陳大明牙科集團 — 中環分店",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "皇后大道中 100 號 新鴻基大廈 12 樓 A 室",
        "addressLocality": "中環",
        "addressRegion": "香港島",
        "addressCountry": "HK"
      },
      "telephone": "+85223456789",
      "url": "https://www.chendaming-dental.com.hk/zh-hk/locations/central/"
    },
    {
      "@type": "Dentist",
      "name": "陳大明牙科集團 — 銅鑼灣分店",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "記利佐治街 1 號 金百利中心 5 樓 B 室",
        "addressLocality": "銅鑼灣",
        "addressRegion": "香港島",
        "addressCountry": "HK"
      },
      "telephone": "+85223456790",
      "url": "https://www.chendaming-dental.com.hk/zh-hk/locations/causeway-bay/"
    },
    {
      "@type": "Dentist",
      "name": "陳大明牙科集團 — 沙田分店",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "沙田正街 1 號 新城市廣場 3 樓 305 號舖",
        "addressLocality": "沙田",
        "addressRegion": "新界",
        "addressCountry": "HK"
      },
      "telephone": "+85223456791",
      "url": "https://www.chendaming-dental.com.hk/zh-hk/locations/sha-tin/"
    }
  ]
}
</script>
```

> **注意：** `department` 屬性是 Google 官方推薦的多分店 Schema 標記方式。

---

## Schema 測試與驗證

### 工具 1：Google Rich Results Test（推薦首選）

```
用途：測試你的 Schema 是否支援 Rich Results（豐富結果）
網址：https://search.google.com/test/rich-results

操作：
  1. 貼上你的網頁 URL 或 Schema 代碼
  2. 查看哪些 Rich Results 適用於你的頁面
  3. 檢查有沒有錯誤或警告

注意：
  LocalBusiness Schema 不一定會觸發 Rich Results，
  但它對本地 SEO 的排名訊號仍然非常重要。
```

### 工具 2：Schema Markup Validator（官方）

```
用途：完整驗證你的 Schema 語法是否正確
網址：https://validator.schema.org/

操作：
  1. 貼上你的網頁 URL 或 Schema 代碼
  2. 查看所有偵測到的 Schema 類型
  3. 檢查每個屬性的值是否有效
```

### 工具 3：Google Search Console

```
用途：監控你的 Schema 在 Google 中的表現
位置：Search Console → 增強項目

可以查看：
  → Google 偵測到哪些 Schema 類型
  → 有沒有錯誤或警告
  → 受影響的頁面數量和趨勢

香港雙語站建議：
  → 為 /zh-hk/ 同 /en/ 分別建立 Search Console 屬性（URL Prefix）
  → 分別監控兩個版本嘅 Schema 錯誤
```

---

## 常見 Schema 錯誤（香港版）

| 錯誤 | 嚴重性 | 修復方法 |
|------|--------|---------|
| 電話號碼格式錯誤 | 🔴 嚴重 | 使用國際格式：`+85223456789`（唔好寫 `2345 6789` 或 `852-2345-6789`） |
| 地址不完整（缺樓層/室號） | 🔴 嚴重 | 包含 streetAddress、addressLocality、addressRegion、addressCountry |
| 填了錯誤的 postalCode | 🟡 警告 | 香港冇郵遞區號，建議省略；要用就用 999077 |
| `addressCountry` 用「Hong Kong」而非「HK」 | 🟡 警告 | 建議用 ISO 3166-1 alpha-2：`"HK"` |
| URL 使用相對路徑 | 🔴 嚴重 | 使用完整 URL：`https://...` |
| 嘗試在非分店頁面堆砌多個 Schema | 🟡 警告 | 每個頁面只標記與該頁面相關的 Schema |
| 營業時間格式不正確 | 🟡 警告 | 使用 ISO 8601 或標準時間格式（HH:MM） |
| 評論數據與實際不符 | 🔴 嚴重 | aggregateRating 必須反映真實的評論數據（唔好搬 OpenRice 分數當 Google 分數） |
| Schema 與頁面內容不一致 | 🔴 嚴重 | Schema 的內容必須能在頁面上找到 |
| 缺少 `@type` | 🔴 嚴重 | 每個 Schema 必須有 `@type` |
| 使用不支援的類型 | 🟡 警告 | 確認類型在 Schema.org 和 Google 文件中存在 |
| 中英文版 Schema 內容不一致 | 🟡 警告 | /zh-hk/ 同 /en/ 嘅 NAP 要一致（語言可不同） |

---

## Schema 與本地 SEO 排名的關係

```
Schema 如何影響本地 SEO？

  直接影響：
    ✅ 幫助 Google 準確理解你的香港 NAP 資訊（地址 + +852 電話）
    ✅ 提供地理座標（GeoCoordinates）提升地圖相關性
    ✅ 營業時間和服務資訊 → 提升相關性
    ✅ knowsLanguage 幫 Google 判斷你係繁中/英文/簡中服務

  間接影響：
    ✅ 可能觸發 Rich Results（雖然 LocalBusiness 的 Rich Results 較少）
    ✅ 提升 Google Knowledge Graph 的完整性（香港實體辨識）
    ✅ 增加點擊率（如有 Rich Results 顯示）

  不會的：
    ❌ Schema 不是直接排名因素
    ❌ 加入 Schema 不會立即提升排名
    ❌ 錯誤的 Schema 不會被「處罰」（但會浪費機會）
```

> **關鍵心態：** Schema 是給 Google 的「清晰說明書」，不是「排名加速器」。它幫助 Google 更好地理解你，從而作出更準確的排名判斷。

---

## 進階 Schema：服務與產品標記（HK$）

### 服務（Service）Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Dentist",
  "name": "陳大明牙醫診所",
  "makesOffer": [
    {
      "@type": "Offer",
      "itemOffered": {
        "@type": "Service",
        "name": "專業植牙服務",
        "description": "使用瑞士 Straumann 植體，由具備 10 年植牙經驗的陳醫生主理"
      },
      "price": "20000",
      "priceCurrency": "HKD"
    },
    {
      "@type": "Offer",
      "itemOffered": {
        "@type": "Service",
        "name": "隱形牙套矯正",
        "description": "使用 Invisalign 隱形牙套，免費 3D 掃描諮詢"
      },
      "price": "0",
      "priceCurrency": "HKD"
    }
  ]
}
</script>
```

### FAQ Schema（對點擊率極有幫助）

FAQ Schema 可以讓你的搜尋結果在 SERP 中展開顯示問答，佔據更大的視覺空間，提高點擊率。

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "陳大明牙醫診所接受哪些付款方式？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "我們接受現金、信用卡（Visa/Master）、EPS、八達通、PayMe、FPS 轉數快、支付寶香港及 WeChat Pay HK。"
      }
    },
    {
      "@type": "Question",
      "name": "植牙手術需要多長時間？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "單顆植牙手術本身約需 1-2 小時，但整個治療週期（包括骨整合）約需 3-6 個月。費用由 HK$20,000 起。"
      }
    },
    {
      "@type": "Question",
      "name": "診所位於中環邊度？點樣去？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "診所位於香港中環皇后大道中 100 號新鴻基大廈 12 樓 A 室，港鐵中環站 D2 出口步行約 3 分鐘。"
      }
    }
  ]
}
</script>
```

> **香港提示：** FAQ 問題用廣東話口語寫（「幾錢」「點去」「收唔收八達通」）更容易 match 香港人嘅實際搜尋語句，對 AI Overviews 引用都有幫助。

---

## Schema 實施檢查清單

### 基礎級（所有香港商家必須做）

| 任務 | 說明 |
|------|------|
| ☐ 選擇正確的 Schema 類型 | 使用最具體的類型（例如 Dentist 而非 LocalBusiness） |
| ☐ 加入 NAP 資訊 | name、address、telephone 三個屬性必須存在 |
| ☐ 香港地址寫完整 | streetAddress 含大廈 + 樓層 + 室號；addressRegion 用香港島/九龍/新界 |
| ☐ 電話用 +852 國際格式 | `+85223456789` |
| ☐ 加入 URL | 確保是完整 URL、指向正確的語言版本頁面 |
| ☐ 加入營業時間 | 使用 openingHoursSpecification（不是簡單文字） |
| ☐ 加入地理座標 | 經緯度（GeoCoordinates） |
| ☐ 使用 Google Rich Results Test 驗證 | 確保沒有錯誤 |

### 進階級（推薦）

| 任務 | 說明 |
|------|------|
| ☐ 加入 description | 自然描述的商家簡介 |
| ☐ 加入 image 和 logo | 使用完整 URL |
| ☐ 加入 sameAs | Facebook、IG、OpenRice、TripAdvisor、黃頁 HK |
| ☐ 加入 aggregateRating | 只在你有真實的評論數據時加入 |
| ☐ 加入 knowsLanguage | 香港建議：["zh-HK", "zh-CN", "en"] |
| ☐ 加入 paymentAccepted | 八達通、PayMe、FPS 轉數快等香港常用方式 |
| ☐ 加入 priceRange / currenciesAccepted | HKD |
| ☐ 加入 FAQPage Schema | 在有關聯問答的頁面加入 |

### 多分店級

| 任務 | 說明 |
|------|------|
| ☐ 每個分店頁面有獨立 Schema | 獨立 NAP + GeoCoordinates |
| ☐ 首頁/Store Locator 使用 department | 巢狀標記所有分店 |
| ☐ 所有分店的 Schema 通過驗證 | 一一測試 |
| ☐ 中英文版本 Schema 一致（NAP 部分） | 語言可不同，NAP 必須一致 |

---

## 工具與資源

| 工具 | 用途 |
|------|------|
| [Google Rich Results Test](https://search.google.com/test/rich-results) | 測試 Rich Results 合規性 |
| [Schema Markup Validator](https://validator.schema.org/) | 官方 Schema 語法驗證 |
| [Schema.org/LocalBusiness](https://schema.org/LocalBusiness) | LocalBusiness 的完整屬性文件 |
| [Google 結構化資料搜尋庫](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) | Google 支援的所有 Schema 類型 |
| [Merkle Schema Markup Generator](https://technicalseo.com/tools/schema-markup-generator/) | 免費的 Schema 代碼生成器 |
| Google Search Console | 監控 Schema 表現（建議 /zh-hk/ 與 /en/ 分開監控） |

---

## 總結檢查清單

| 任務 | 說明 |
|------|------|
| ☐ 選擇正確的 Schema 類型 | 使用最具體的子類型 |
| ☐ 填寫所有基礎屬性 | name、address、telephone、url、openingHours、geo |
| ☐ 香港地址與電話格式正確 | 大廈 + 樓層 + 室號；+852 國際格式 |
| ☐ 通過 Rich Results Test 驗證 | 確保沒有錯誤 |
| ☐ 在 Search Console 監控 | 定期查看 Schema 錯誤報告 |
| ☐ 加入進階屬性（如適用） | description、image、sameAs、aggregateRating、knowsLanguage |
| ☐ 多分店正確設置 | 每個分店頁面獨立 Schema + 總頁 department |
| ☐ 考慮 FAQ Schema | 在有 Q&A 的頁面加入，廣東話問題更有效 |

---

| ← [第 51 章：多分店與服務區域商家 SEO](/blog/multi-location-seo) | [回索引](/blog) | [第 53 章：多語言 SEO 策略 →](/blog/multilingual-seo) |
