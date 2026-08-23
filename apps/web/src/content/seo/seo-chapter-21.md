---

## 為什麼圖片 SEO 值得你花時間？

圖片搜尋佔 Google 總搜尋量約 **20-25%**，是一個常被忽視的龐大流量來源。更重要的的是，優化圖片不僅能帶來圖片搜尋流量，還能通過以下方式幫助你的網頁排名：

- 提升頁面加載速度（影響 Core Web Vitals）
- 增加內容可讀性和使用者停留時間
- 提供額外的排名信號（Alt Text、檔案名稱）
- 讓你的頁面有資格出現在 Google 圖片搜尋和 Google Lens 結果中

---

## 圖片 SEO 五大支柱

```
┌─────────────────────────────────────────────┐
│              圖片 SEO 五大支柱               │
├──────────┬──────────┬────────┬──────┬───────┤
│ 檔案名稱  │ Alt Text │ 檔案格式 │ 圖片 │ 結構化 │
│          │          │ 與壓縮   │ 尺寸 │  資料  │
└──────────┴──────────┴────────┴──────┴───────┘
```

---

## 支柱一：檔案名稱優化

圖片檔名是 Google 理解圖片內容的**第一個信號**。

### 命名規則

| 規則 | ⭕ 好 | ❌ 差 |
|------|------|------|
| 描述性 | `golden-retriever-puppy-food.jpg` | `IMG_4582.jpg` |
| 使用連字號 | `dog-food-comparison-chart.png` | `dog_food_comparison_chart.png` |
| 包含關鍵字 | `seo-checklist-2024.jpg` | `image1.jpg` |
| 避免關鍵字堆砌 | `dog-food-guide.jpg` | `best-dog-food-cheap-dog-food-top-dog-food.jpg` |
| 小寫英文 | `royal-canin-small-breed.jpg` | `Royal_Canin_Small_Breed.JPG` |

> 與 URL 相同，Google 將連字號視為分隔符，底線不被視為分隔符。

---

## 支柱二：Alt Text（替代文字）

### 什麼是 Alt Text？

Alt Text 是當圖片無法顯示時替代顯示的文字，也是螢幕閱讀器描述圖片的依據。對 SEO 而言，它是 Google 理解圖片內容的**最強信號**。

```html
<img src="dog-food-comparison.jpg" alt="2024 年 5 款熱門狗飼料營養成分比較表">
```

### Alt Text 四大原則

| 原則 | 說明 |
|------|------|
| **描述性** | 準確描述圖片內容，想像你在向看不見的人描述這張圖 |
| **簡潔** | 控制在 125 字元以內（螢幕閱讀器通常在此截斷） |
| **自然融入關鍵字** | 如果合理，將相關關鍵字自然融入 |
| **避免關鍵字堆砌** | `alt="狗飼料推薦狗飼料品牌狗飼料評價"` 會被視為垃圾 |

### Alt Text 範例對比

| 圖片內容 | ⭕ 好的 Alt Text | ❌ 差的 Alt Text |
|----------|-----------------|-----------------|
| 狗飼料成分表 | `小型犬幼犬飼料主要營養成分對照表` | `表格` |
| SEO 流程圖 | `SEO 優化四步驟流程圖：研究→創作→優化→追蹤` | `SEO 流程圖 SEO 策略 SEO 優化` |
| 產品照片 | `皇家 S 系列小型犬飼料 2kg 包裝正面` | `產品圖片` |

### 何時 Alt Text 可以留空？

對於純裝飾性圖片（如背景圖案、分隔線），可以將 Alt 設為空字串：

```html
<img src="decorative-line.png" alt="">
```

設為空字串（不是不寫）告訴螢幕閱讀器這張圖可以略過。

---

## 支柱三：檔案格式選擇與壓縮

### 主流圖片格式選擇指南

| 格式 | 最適合 | 優點 | 缺點 |
|------|--------|------|------|
| **WebP** | 網頁圖片首選 | 壓縮率高、品質好、Google 推薦 | 舊瀏覽器兼容性（已非常少） |
| **AVIF** | 次世代格式 | 比 WebP 更小、品質更高 | 瀏覽器支援仍在普及中 |
| **JPEG** | 照片類圖片 | 兼容性最佳、色彩豐富 | 無透明度、壓縮有損 |
| **PNG** | 圖標、Logo、截圖 | 支援透明度、無損壓縮 | 檔案較大 |
| **SVG** | 圖標、Logo、插圖 | 無限縮放、極小檔案 | 複雜圖片不合適 |

### 圖片壓縮的目標

| 頁面類型 | 圖片最大檔案大小 | 建議 |
|----------|-----------------|------|
| 內容圖片（部落格） | 100-200KB | WebP 格式壓縮質量 80-85% |
| 縮圖 | 20-50KB | 適當降低解析度 |
| Hero 大圖 | 300-500KB | 使用懶加載（Lazy Loading） |
| Logo / 圖標 | 5-20KB | SVG 優先 |

### 壓縮工具推薦

| 工具 | 類型 | 費用 |
|------|------|------|
| **Squoosh** | 網頁端、Google 出品 | 免費 |
| **TinyPNG / TinyJPG** | 網頁端、API | 有限免費 |
| **ImageOptim** | Mac 桌面應用 | 免費 |
| **ShortPixel** | WordPress 外掛 | 有限免費 |
| **Cloudinary** | CDN + 自動優化 | 有限免費 |

---

## 支柱四：圖片尺寸與響應式圖片

### 響應式圖片的三種實現方式

#### 方式 1：srcset + sizes（推薦）

```html
<img src="dog-food-800w.jpg"
     srcset="dog-food-400w.jpg 400w,
             dog-food-800w.jpg 800w,
             dog-food-1200w.jpg 1200w"
     sizes="(max-width: 600px) 100vw,
            (max-width: 900px) 50vw,
            800px"
     alt="小型犬飼料包裝正面照">
```

#### 方式 2：`<picture>` 元素（格式切換）

```html
<picture>
  <source srcset="dog-food.webp" type="image/webp">
  <source srcset="dog-food.avif" type="image/avif">
  <img src="dog-food.jpg" alt="小型犬飼料包裝正面照">
</picture>
```

#### 方式 3：CSS 媒體查詢（背景圖片）

```css
.hero {
  background-image: url('hero-mobile.webp');
}
@media (min-width: 768px) {
  .hero {
    background-image: url('hero-desktop.webp');
  }
}
```

### 圖片尺寸最佳實踐

| 用途 | 建議寬度 | 說明 |
|------|----------|------|
| 內容圖片（桌面） | 800-1200px | 足夠清晰，不過大 |
| 內容圖片（行動） | 400-600px | 配合 srcset |
| 縮圖 / 列表圖 | 300-400px | Fast loading |
| Hero / Banner | 1920px | 覆蓋最大螢幕，配合壓縮 |
| Open Graph 圖片 | 1200x630px | 社群分享標準尺寸 |

---

## 支柱五：結構化資料（ImageObject Schema）

使用結構化資料幫助 Google 更深入理解你的圖片。

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ImageObject",
  "contentUrl": "https://example.com/images/dog-food-comparison.jpg",
  "name": "2024 年狗飼料營養成分比較表",
  "description": "5 款熱門小型犬飼料的蛋白質、脂肪、纖維含量比較",
  "creditText": "PetHome",
  "license": "https://example.com/license"
}
</script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "primaryImageOfPage": {
    "@type": "ImageObject",
    "url": "https://example.com/images/dog-food-comparison.jpg",
    "width": 1200,
    "height": 800
  }
}
</script>
```

---

## 進階圖片 SEO 策略

### 1. 圖片懶加載（Lazy Loading）

延遲加載不在視窗範圍內的圖片，顯著提升頁面首次加載速度（LCP）：

```html
<!-- HTML 原生 -->
<img src="image.jpg" loading="lazy" alt="...">

<!-- JavaScript 方案 -->
<img data-src="image.jpg" class="lazyload" alt="...">
```

**注意**：首屏（Above the Fold）的圖片不要使用 Lazy Loading，應使用 `loading="eager"`。

### 2. 圖片 Sitemap

為圖片建立專屬的 XML Sitemap，幫助 Google 更快發現和索引你的圖片：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://example.com/blog/dog-food-guide.html</loc>
    <image:image>
      <image:loc>https://example.com/images/dog-food-comparison.jpg</image:loc>
      <image:title>狗飼料營養成分比較表</image:title>
      <image:caption>2024 年 5 款熱門狗飼料營養對照</image:caption>
    </image:image>
  </url>
</urlset>
```

### 3. Open Graph 圖片

確保每個重要頁面有專門的 OG 圖片（1200×630px），用於社群分享：

```html
<meta property="og:image" content="https://example.com/images/og/dog-food-guide-og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
```

### 4. CDN 加速圖片傳輸

使用 CDN（如 Cloudflare、Cloudinary、Imgix）來加速全球範圍內的圖片載入。CDN 通常還會提供：
- 自動格式轉換（WebP/AVIF）
- 自動壓縮
- 自動調整尺寸
- 圖片快取

---

## Google Discover 與圖片

Google Discover（Google 探索）是一個重要的圖片驅動流量來源。要讓你的內容出現在 Discover 中：

- **使用至少 1200px 寬的圖片**（Google 建議）
- 確保圖片內容**原創且高品質**（不要用圖庫照）
- 用 `max-image-preview:large` 告訴 Google 可以使用大圖預覽：

```html
<meta name="robots" content="max-image-preview:large">
```

---

## 圖片 SEO 檢查清單

- [ ] 圖片檔名具有描述性，使用連字號分隔單詞
- [ ] 所有內容圖片都有恰當的 Alt Text（非堆砌）
- [ ] 裝飾性圖片設為 `alt=""`
- [ ] 使用 WebP 或 AVIF 格式
- [ ] 圖片檔案大小已壓縮（內容圖 < 200KB）
- [ ] 實施了響應式圖片（srcset 或 picture）
- [ ] 首屏圖片使用 `loading="eager"`
- [ ] 其他圖片使用 `loading="lazy"`
- [ ] 重要頁面有 ImageObject 結構化資料
- [ ] 已建立圖片 Sitemap（建議）
- [ ] 使用 CDN 加速圖片傳輸
- [ ] OG 圖片設置完整（1200×630px）
- [ ] 重要圖片寬度至少 1200px（Google Discover）

---

## 重點回顧

1. **圖片搜尋佔 Google 總搜尋 20-25%**——圖片 SEO 是個不該忽視的流量來源
2. **五大支柱**：檔名、Alt Text、格式壓縮、尺寸、結構化資料
3. **WebP 是網頁圖片首選格式**——檔案小、品質好、Google 推薦
4. **Alt Text 是最強的圖片理解信號**——描述性、簡潔、自然融入關鍵字
5. **響應式圖片（srcset + sizes）+ 懶加載** = 速度與體驗的最佳組合
6. **1200px 以上寬度的原創圖片**才能進入 Google Discover 流量池

---

| ← [第 20 章：URL 結構優化完整指南](/blog/seo-url-structure) | [回索引](/blog) | [第 22 章：內容結構與格式化 →](/blog/content-structure) |
