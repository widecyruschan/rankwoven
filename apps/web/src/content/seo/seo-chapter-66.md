---

## 什麼是 Query Fan-out？

**Query Fan-out（查詢擴散）** 描述了 AI 如何從一個簡單的查詢出發，自動擴展成一連串相關的子問題。理解這個機制，可以幫助你建立能「覆蓋整個問題網絡」的內容策略。

```
一個使用者的查詢如何擴散：

使用者提問：「植牙痛不痛？」

  AI 的內部處理：

  Query 1：植牙痛不痛？
    ├── 子問題 1：植牙過程中使用什麼麻醉？
    ├── 子問題 2：術後疼痛持續多久？
    └── 子問題 3：如何減輕植牙後的疼痛？

  Query 2：誰需要植牙？
    ├── 子問題 4：什麼情況下不適合植牙？
    └── 子問題 5：植牙有年齡限制嗎？

  Query 3：植牙的替代方案有哪些？
    ├── 子問題 6：牙橋 vs 植牙的優缺點？
    └── 子問題 7：活動假牙的費用？

這就是 Query Fan-out：
  → 一個問題擴散成一個「問題網絡」
  → AI 需要從多個來源收集回答
  → 如果你的內容能覆蓋盡可能多的子問題，
    你被引用的機會就越大
```

---

## Query Fan-out 的三個層次

### 層次 1：橫向擴散（Horizontal Fan-out）

```
同一主題的不同面向：

核心主題：植牙

橫向擴散：
  植牙 → 植牙過程
      → 植牙費用
      → 植牙風險
      → 植牙優點
      → 植牙 vs 其他方案
      → 植牙後護理
      → 植牙保險

策略：
  建立一個「主題集群」，覆蓋該主題的所有主要面向。
  （樞紐頁面 + 集群頁面，見第 61 章）
```

### 層次 2：縱向擴散（Vertical Fan-out）

```
同一面向的不同深度：

面向：植牙費用

縱向擴散：
  植牙費用（表層）
    → 香港植牙平均費用（具體數字）
    → 不同植體品牌的費用差異（深入比較）
    → 為什麼植牙費用差異這麼大？（原因分析）
    → 如何判斷植牙費用是否合理？（評估方法）
    → 植牙的長期成本效益分析（高階分析）

策略：
  不僅僅回答「多少錢」，還要回答「為什麼」和「如何評估」。
  表層內容滿足即時答案需求，深層內容建立權威度。
```

### 層次 3：關聯擴散（Associative Fan-out）

```
跨主題的關聯性擴散：

植牙 關聯擴散：
  植牙 → 牙科恐懼症（心理層面）
      → 植牙材料科學（技術層面）
      → 口腔健康與全身健康（健康層面）
      → 醫療旅遊：去外國植牙（消費者行為層面）
      → 植牙技術的歷史和未來（知識層面）

策略：
  探索與你的核心主題相關的「周邊主題」。
  這些主題可能不是直接的競爭關鍵字，
  但它們可以幫助 AI 更全面地理解你的專業領域。
```

---

## 如何利用 Query Fan-out 建立內容策略

### Step 1：繪製你的 Query Fan-out 地圖

```
以你的核心業務為中心，繪製查詢擴散地圖：

練習：
  你的核心業務是什麼？（例如：植牙服務）

繪製 3 個層次的擴散：

橫向（不同面向，5-8 個）：
  □ 植牙過程步驟
  □ 植牙費用與保險
  □ 植牙技術比較
  □ 植牙前評估
  □ 植牙後護理
  □ 植牙失敗原因
  □ 植牙常見問題

縱向（每個面向的深度，3-4 層）：
  以「植牙費用」為例：
  □ 第 1 層：香港植牙費用概覽（概述）
  □ 第 2 層：各品牌植體費用比較（具體比較）
  □ 第 3 層：影響植牙費用的 5 大因素（原因分析）
  □ 第 4 層：植牙投資回報計算指南（高階分析）

關聯（周邊相關主題，5-8 個）：
  □ 牙科恐懼症與鎮靜治療
  □ 口腔健康對全身健康的影響
  □ 老年人的牙科護理需求
  □ 數位牙科技術的發展
  □ 海外植牙醫療旅遊分析
```

### Step 2：評估內容缺口

```
依照你的 Query Fan-out 地圖，檢查你的網站：

對於每個節點，標記：
  ✅ 已有內容，且品質良好
  ⚠️ 已有內容，但品質不足（需要改進）
  ❌ 完全沒有內容（缺口）

建立內容優先級：
  Priority 1：高搜尋量 + 直接商業價值 + 當前是 ❌
  Priority 2：中搜尋量 + 間接價值 + 當前是 ⚠️
  Priority 3：低搜尋量 + 輔助內容 + 當前是 ❌
```

### Step 3：建立內容生產路線圖

```
基於缺口分析，規劃內容生產順序：

第 1 階段（填補 P1 缺口）：
  → 3-5 篇核心內容
  → 每篇聚焦一個重要的橫向節點

第 2 階段（建立深度）：
  → 為每個 P1 內容建立 2-3 篇縱向深度內容
  → 形成「樞紐頁面 + 深度內容」結構

第 3 階段（擴展廣度）：
  → 填補 P2 缺口
  → 建立關聯內容（周邊主題）

第 4 階段（維護與迭代）：
  → 定期更新所有內容
  → 根據 AI 引用數據調整策略
```

---

## Entity SEO：Query Fan-out 的基石

### 為什麼 Entity 對 Query Fan-out 如此重要？

```
當 AI 進行 Query Fan-out 時，它依賴 Entity 關係來理解：

AI 的思考過程：

  使用者問：「陳大明醫生做植牙好唔好？」

  AI 需要知道：
  → 陳大明 是 Person Entity
  → 陳大明 worksFor 陳大明牙醫診所（Organization Entity）
  → 陳大明牙醫診所 offers 植牙服務（Service Entity）
  → 陳大明牙醫診所 location 中環（Place Entity）
  → 陳大明牙醫診所 aggregateRating 4.8（Rating Entity）

  有了這些 Entity 關聯，AI 可以：
  → 確認「陳大明」確實是牙醫
  → 確認他提供植牙服務
  → 評估他的診所品質（評分）
  → 進行 Query Fan-out（植牙過程？費用？其他醫生？）

沒有清晰的 Entity 關聯：
  → AI 可能無法確定「陳大明」是誰
  → AI 無法評估他的可信度
  → Query Fan-out 可能在第一步就中斷
```

### Entity SEO 的三大支柱

```
支柱 1：內部 Entity 標記（Internal Entity Markup）

  在你的網站上清楚標記：
  ☐ 品牌 Entity（Organization Schema）
  ☐ 人物 Entity（Person Schema，與品牌關聯）
  ☐ 服務 Entity（Service Schema，在服務頁面上）
  ☐ 地點 Entity（Place / PostalAddress，在聯絡頁面上）
  ☐ Entity 之間的關係（使用 @id 和其他屬性）

支柱 2：外部 Entity 建設（External Entity Building）

  在整個網絡上建立 Entity 存在：
  ☐ Google Business Profile（最重要！）
  ☐ Wikidata / Wikipedia（如符合標準）
  ☐ 行業目錄和專業平台
  ☐ 社交媒體（sameAs 連結）
  ☐ 媒體報導和行業出版物

支柱 3：Entity 一致性（Entity Consistency）

  確保 Entity 資訊在所有平台上一致：
  ☐ NAP（名稱、地址、電話）完全一致
  ☐ 品牌名稱不變（不要有時「陳大明牙科」有時「Dr. Chan Dental」）
  ☐ 使用 sameAs 連結統一所有 Entity 表現
```

---

## 進階：多 Entity 網絡策略

對於較大的品牌或有多個核心人物的業務，可以建立多 Entity 網絡：

```
多 Entity 網絡範例：

  Organization：陳大明牙科集團
  ├── Person：陳大明（創始人、植牙專家）
  │   ├── specializesIn：微創植牙
  │   └── hasCredential：香港大學牙醫學院
  ├── Person：李小美（矯正專科醫生）
  │   ├── specializesIn：隱形牙套矯正
  │   └── hasCredential：Invisalign 認證醫師
  ├── Place：中環總店
  ├── Place：銅鑼灣分店
  ├── Service：植牙服務
  ├── Service：矯正服務
  └── Service：美學牙科

效果：
  → 每個 Entity 都有自己的「權威半徑」
  → AI 可以精確匹配查詢和相關 Entity
  → 例如：「香港微創植牙專家」→ 觸發 Person：陳大明
  → 「銅鑼灣隱形牙套」→ 觸發 Person：李小美 + Place：銅鑼灣
```

---

## 實戰：用 Entity SEO 優化一個頁面

### 改造前：一個普通的服務頁面

```html
<!-- 改造前 -->
<h1>植牙服務</h1>
<p>我們提供專業植牙服務，由經驗豐富的醫生主理。</p>
<p>請致電 1234 5678 查詢。</p>

<!-- 問題：
  → 沒有 Entity 標記
  → AI 不知道「我們」是誰
  → AI 不知道「醫生」是誰
  → AI 不確定這是否可信 -->
```

### 改造後：Entity-aware 的服務頁面

```html
<!-- 改造後 -->
<h1>微創植牙服務 — 陳大明牙醫診所</h1>

<p><strong>陳大明牙醫診所</strong>（香港中環）提供專業微創植牙服務，
由具備 <strong>15 年植牙經驗</strong>的陳大明醫生主理。</p>

<!-- Entity 清晰度：
  → Organization Entity：陳大明牙醫診所（完整名稱）
  → Place Entity：香港中環
  → Person Entity：陳大明醫生
  → Quantitative Value：15 年經驗
-->

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": "#org",
      "@type": "Dentist",
      "name": "陳大明牙醫診所",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "皇后大道中 100 號",
        "addressLocality": "中環"
      }
    },
    {
      "@id": "#service",
      "@type": "Service",
      "name": "微創植牙服務",
      "provider": {"@id": "#org"},
      "areaServed": {"@type": "City", "name": "香港"}
    },
    {
      "@id": "#person",
      "@type": "Person",
      "name": "陳大明",
      "jobTitle": "植牙專科醫生",
      "worksFor": {"@id": "#org"}
    }
  ]
}
</script>
```

---

## 監測 Entity SEO 的成效

```
如何知道你的 Entity SEO 是否有效？

1. Google Knowledge Graph 檢查
   → 搜尋你的品牌名稱
   → 是否有 Knowledge Panel？
   → Knowledge Panel 的資訊是否正確且完整？

2. Google 的 Entity 理解度測試
   → 搜尋「[品牌名] 是...」相關查詢
   → Google 是否正確理解你的業務類型？

3. AI 引用中的 Entity 準確度
   → AI 引用你時，是否使用了正確的品牌名稱？
   → AI 是否正確地描述了你的專業領域？

4. 結構化資料錯誤監控
   → Google Search Console → 增強項目
   → 查看 Schema 錯誤和警告
```

---

## 總結：Query Fan-out + Entity SEO = AI 時代的內容策略

```
傳統 SEO 思維：
  「我有一個關鍵字 → 我寫一篇文章 → 我希望能排名」

Query Fan-out + Entity SEO 思維：
  「我有一個主題領域 → 我建立一個內容集群，
   覆蓋所有相關的查詢 → 我建立清晰的 Entity 網絡 →
   AI 在進行 Query Fan-out 時，我的內容自然出現在多個節點上」

這不是短期策略，而是長期投資。
但一旦你的 Entity 和內容網絡建立起來，
你在 AI 生態中的存在感是競爭對手難以複製的。
```

---

| ← [第 65 章：AI SEO 六個月路線圖](/blog/ai-seo-roadmap) | [回索引](/blog) | [第 67 章：SEO 七大 KPI 指標體系 →](/blog/seo-kpi) |
