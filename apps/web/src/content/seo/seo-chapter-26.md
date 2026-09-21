---

## 什麼是 Core Web Vitals？

**Core Web Vitals（核心網頁體驗指標）** 是 Google 定義的一組用於衡量網頁使用者體驗的關鍵指標。自 2021 年 6 月起，Core Web Vitals 正式成為 Google 排名信號的一部分。

> Core Web Vitals 不只是 SEO 的「加分項」——它是你能不能留在第一頁的**硬標準**。

### 香港市場嘅實際影響

香港係**手機主導、網絡基建好但使用環境複雜**（港鐵、商場、街上、辦公室 Wi-Fi）嘅市場，所以：

| 香港實況 | 對 Core Web Vitals 嘅影響 |
|----------|---------------------------|
| 手機流量佔七成以上 | Google 用**行動版**數據評估，行動版唔達標就係唔達標 |
| 用家預期極高（習慣快） | LCP 超過 2.5 秒，香港用家已經轉去第二個結果 |
| 電商、餐飲、地產競爭激烈 | 同樣內容、同樣價錢（HK$），體驗好嗰個排名高一級就係贏 |
| iOS 滲透率高 | Safari 與 Chrome 渲染差異要兩種都測 |

> **香港典型失敗案例**：一間補習社嘅網站喺辦公室 Wi-Fi 測好好（LCP 1.8 秒），但真實家長係喺接送仔女途中用手機開（4G、訊號弱）——GSC 現場數據顯示 LCP 4.2 秒「不佳」。呢個就係**只睇實驗室數據嘅代價**。

---

## 三大核心指標

```
┌────────────────────────────────────────────────────────┐
│                   Core Web Vitals                       │
├──────────────┬──────────────────┬──────────────────────┤
│     LCP      │       INP        │         CLS          │
│ (最大內容繪製) │  (互動至下次繪製)  │    (累計版面位移)      │
│              │                  │                      │
│ 衡量載入速度   │ 衡量互動反應速度   │  衡量視覺穩定性        │
├──────────────┼──────────────────┼──────────────────────┤
│ ≤ 2.5 秒 ✅  │ ≤ 200 毫秒 ✅    │ ≤ 0.1 ✅             │
│ 2.5-4.0 秒 ⚠│ 200-500 毫秒 ⚠  │ 0.1-0.25 ⚠          │
│ > 4.0 秒 ❌  │ > 500 毫秒 ❌    │ > 0.25 ❌            │
└──────────────┴──────────────────┴──────────────────────┘
```

---

## LCP（Largest Contentful Paint）——最大內容繪製

### LCP 衡量什麼？

LCP 衡量的是**頁面上最大內容元素（通常是主圖或主要文字區塊）完全顯示所需的時間**。它反映了使用者感受到的「頁面載入完成」的時刻。

**香港常見嘅 LCP 元素**：
- 網店首頁 Hero Banner（例如「夏季減價低至 5 折」大圖）
- 餐廳網站嘅招牌菜大圖
- 樓盤頁嘅單位客廳相
- 文章頁嘅首段大標題（繁中標題字數多，都可能係 LCP 元素）

### LCP 的常見拖慢因素

| 因素 | 影響 | 解決方案 |
|------|------|----------|
| **未壓縮的大圖片** | 最大元兇 | WebP 格式 + 壓縮 |
| **渲染阻塞的 CSS/JS** | 瀏覽器等待資源 | 內聯關鍵 CSS、延遲非關鍵 JS |
| **伺服器回應慢** | TTFB（首字節時間）過長 | CDN（揀香港節點）、快取、升級主機 |
| **客戶端渲染** | JS 執行完才有內容 | SSR / 預渲染 |
| **中文字體檔過大** | 文字等字體 load 完先出 | 系統字體 / 字體子集化 + `font-display: swap` |
| **第三方 script 搶頻寬** | 追蹤碼、WhatsApp 浮標、IG Feed 搶資源 | 延遲載入，首屏唔好載咁多 |

### LCP 優化實戰

**1. 優化最大內容元素**：
- 為 LCP 圖片使用 `<link rel="preload">` 預載入
- 壓縮並設定明確的尺寸（避免圖片尺寸未知導致重新繪製）

```html
<link rel="preload" as="image" href="hero.webp"
      imagesrcset="hero-400.webp 400w, hero-800.webp 800w"
      imagesizes="100vw">
```

**2. 減少 TTFB**：
- 使用 CDN（**揀有香港節點**，TTFB 通常降至 50ms 以下，香港本地可低至 10-30ms）
- 啟用伺服器端全頁快取
- 使用快速的 DNS 服務
- 主機放喺**香港或亞洲機房**（唔好放歐美）

**3. 避免渲染阻塞**：
- 將關鍵 CSS 內聯至 `<head>` 中
- 非關鍵 CSS 使用 `media="print" onload="this.media='all'"` 延遲載入

---

## INP（Interaction to Next Paint）——互動至下次繪製

### 從 FID 到 INP 的演變

2024 年 3 月，Google 正式以 **INP** 取代了 FID（First Input Delay），成為 Core Web Vitals 的互動性指標。

| | FID（舊） | INP（新） |
|------|-----------|-----------|
| **衡量範圍** | 只衡量**第一次**互動的延遲 | 衡量整個頁面生命週期中**所有**互動的延遲 |
| **反映的體驗** | 首次互動體驗 | 整體互動體驗 |
| **好分數門檻** | ≤ 100 毫秒 | ≤ 200 毫秒 |

### INP 衡量什麼？

```
使用者點擊按鈕
  → 事件處理器開始執行 (Input Delay)
    → 事件處理器執行中 (Processing Time)
      → 瀏覽器繪製更新畫面 (Presentation Delay)
        = INP（取所有互動中最差的延遲之一）
```

**香港常見 INP 地雷**（互動多、script 多嘅網站特別易中）：
- 網店嘅「加入購物車」+ 篩選器 + 搜尋建議，全部同一個 JS bundle
- 餐廳訂位表單嘅日期選擇器 + 驗證邏輯
- 樓盤頁嘅相簿 slider + 地圖 embed
- 大量第三方追蹤碼（Facebook Pixel、Google Ads、線上客服）

### INP 優化實戰

| 行動 | 說明 |
|------|------|
| **拆分長任務** | 超過 50ms 的 JS 任務應拆分為多個小任務 |
| **使用 Web Worker** | 將重型計算移到背景執行緒 |
| **減少 JS 執行量** | 延遲載入非關鍵 JS、移除未使用的代碼 |
| **優化事件處理器** | 避免在事件處理器中執行大量 DOM 操作 |
| **使用 `requestAnimationFrame`** | 將視覺更新排入瀏覽器的渲染週期 |
| **清理第三方 script** | 每季審查一次，冇用嘅剷走（香港網站最常見問題） |

### 拆分長任務範例

```javascript
// ❌ 長任務：一次處理 5000 個項目
function processAll(items) {
  items.forEach(item => heavyProcessing(item));
}

// ✅ 拆分為多個小任務
async function processInChunks(items, chunkSize = 50) {
  for (let i = 0; i < items.length; i += chunkSize) {
    await new Promise(resolve => setTimeout(resolve, 0)); // yield to browser
    items.slice(i, i + chunkSize).forEach(item => heavyProcessing(item));
  }
}
```

---

## CLS（Cumulative Layout Shift）——累計版面位移

### CLS 衡量什麼？

CLS 衡量的是頁面載入過程中，**可見元素意外移動的程度**。這是使用者體驗中最令人沮喪的問題之一——你正要點擊一個按鈕，突然一個廣告載入，把按鈕頂走了。

**香港常見情境**：你喺港鐵入面用手機撳「加入購物車」，突然一個 WhatsApp 訂閱彈窗或者廣告 banner 彈出嚟，將個掣推走咗——結果撳錯咗「立即結帳」。呢個就係 CLS。

### CLS 的常見元兇

| 問題 | 範例 | 解決方案 |
|------|------|----------|
| **無尺寸的圖片** | `<img>` 沒有 width/height | 設定明確尺寸或 `aspect-ratio` |
| **無尺寸的廣告/嵌入** | iframe 動態載入 | 預留空間（min-height / placeholder） |
| **動態注入的內容** | 彈窗、通知橫幅 | 使用變形動畫而非位移動畫 |
| **FOIT/FOUT** | 字體載入導致文字跳動 | 使用 `font-display: swap` + 預留空間 |
| **WhatsApp / 客服浮標** | 頁面 load 完先插入浮動按鈕 | 預留位置或改用 `transform` 呈現 |
| **Cookie / 年齡驗證橫幅** | 頂部插入 banner 推走內容 | 用 overlay 而唔係推內容（但注意唔好違反侵入式彈窗規則） |

### CLS 優化實戰

**1. 為所有圖片設定尺寸**：
```html
<img src="banner.jpg" width="800" height="400" alt="...">

<!-- 或使用 CSS -->
<style>
.responsive-img {
  width: 100%;
  height: auto;
  aspect-ratio: 2/1;
}
</style>
```

**2. 為動態內容預留空間**：
```css
.ad-container {
  min-height: 250px; /* 預留廣告高度 */
}
```

**3. 字體載入策略**：
```css
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
  font-display: swap; /* 先用系統字體，載入後再替換 */
}
```

**4. 動畫使用 transform**：
```css
/* ❌ 會觸發版面位移 */
.element { top: 100px; }

/* ✅ 不觸發版面位移 */
.element { transform: translateY(100px); }
```

---

## 如何監控 Core Web Vitals？

### 實驗室數據 vs 現場數據

| | 實驗室數據（Lab Data） | 現場數據（Field Data） |
|------|----------------------|----------------------|
| **來源** | Lighthouse、PageSpeed Insights | Chrome UX Report（CrUX） |
| **環境** | 模擬環境、固定網路條件 | 真實使用者裝置和網路 |
| **用途** | 開發階段除錯 | SEO 真實影響評估 |
| **查看位置** | Lighthouse 報告 | GSC →「體驗」→「Core Web Vitals」 |

> **香港重要提醒**：香港網站嘅流量可能唔夠大，令 CrUX 攞唔到足夠樣本（GSC 會顯示「資料不足」）。呢個情況：
> 1. 以**實驗室數據**（測試點揀香港 / Mobile 4G）做主要優化依據
> 2. 自行用 **web-vitals JS 函式庫**收集真實用戶數據（RUM），send 去 GA4 或自己嘅 dashboard
> 3. 覆蓋**多國家多語言站**時，注意 CrUX 唔會按語言分開，要自己分

### 在 GSC 中追蹤 Core Web Vitals

1. 進入 Google Search Console
2. 左側選單 → 「體驗」 → 「Core Web Vitals」
3. 查看桌面版和行動版的評估報告（**香港市場重點睇行動版**）
4. 系統會將 URL 分為：**良好 / 需要改善 / 不佳**
5. 點擊「需要改善」的 URL 群組，查看具體問題

---

## Core Web Vitals 優化優先級

| 優先級 | 指標 | 原因 |
|--------|------|------|
| 1 | **LCP** | 影響最明顯、最容易被診斷和修復 |
| 2 | **CLS** | 修復相對簡單（設定尺寸即可解決大部分問題） |
| 3 | **INP** | 修復較複雜，通常需要重構 JavaScript |

---

## 重點回顧

1. **Core Web Vitals = 排名必備硬標準**，2021 年起正式納入 Google 排名系統
2. **LCP ≤ 2.5 秒**：衡量載入速度，圖片、中文字體、伺服器（TTFB）是主要瓶頸
3. **INP ≤ 200 毫秒**（2024 年取代 FID）：衡量整體互動反應速度，需拆分長 JS 任務、清理第三方 script
4. **CLS ≤ 0.1**：衡量視覺穩定性，設定圖片/廣告尺寸即可解決大部分問題
5. **GSC 中查看真實使用者的 Core Web Vitals 數據**，而非只依賴 Lighthouse 模擬（香港站流量細可能「資料不足」，要自建 RUM）
6. **香港專屬地雷**：中文字體檔過大、歐美主機、第三方 script 過多、冇香港 CDN 節點
7. 優化順序：LCP → CLS → INP

---

| ← [第 25 章：網站速度優化](/blog/site-speed) | [回索引](/blog) | [第 27 章：行動優先索引與 RWD →](/blog/mobile-first-seo) |
