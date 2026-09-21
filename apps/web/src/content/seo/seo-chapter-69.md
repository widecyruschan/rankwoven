> GA4 唔係 Universal Analytics 嘅升級版 — 佢係一個全新嘅物種。學好佢，你嘅 SEO 數據分析能力直接翻倍。對香港網站嚟講，呢點特別重要：香港市場細、流量池細，每一個有機 visit 都要計得清清楚楚。

---

## GA4 是什麼？跟舊版有什麼不同？

Google Analytics 4（GA4）是 Google 在 2023 年推出的新一代網站分析工具，全面取代舊版 Universal Analytics（UA）。

### GA4 vs Universal Analytics：核心差異

| 維度 | Universal Analytics（舊） | GA4（新） |
|------|--------------------------|-----------|
| 數據模型 | Session-based（工作階段） | Event-based（事件） |
| 跳出來 | 只看跳出率 | 改用「參與度」（Engagement Rate） |
| 跨裝置追蹤 | 需手動設定 User ID | 內建跨裝置/跨平台 |
| 機器學習 | 幾乎沒有 | 內建異常檢測、預測指標 |
| 隱私合規 | 基本 | 強化隱私保護，無 Cookie 也能運作 |
| 報表自訂 | 受限 | 高度自由（探索報表） |
| 與 GSC 整合 | 需手動 | 原生整合 |

### 對 SEO 的意義

GA4 的事件模型更精準地追蹤用戶行為，讓你能更清楚看到「SEO 流量入站之後，到底做咗啲乜」。

對香港網站有兩個額外意義：
1. **香港用手機嘅比例極高**（大部分網站 mobile 佔 70-85%），GA4 嘅跨裝置追蹤先至睇到「地鐵用手機睇 → 返到屋企用 desktop 落單」嘅完整旅程。
2. **香港用戶注重私隱**（PDPO《個人資料（私隱）條例》之下），愈嚟愈多人擋 Cookie；GA4 嘅「無 Cookie 仍能運作」＋建模數據對香港網站特別有用。

---

## GA4 設定基礎（SEO 導向）

### 第一步：建立 GA4 資源

1. 前往 [analytics.google.com](https://analytics.google.com)
2. 管理員 → 建立資源 → 輸入網站名稱
3. 設定時區（**亞洲/香港 UTC+8**）和貨幣（**HKD 港元**）
   > ⚠️ 時區一定要揀「亞洲/香港」，唔好揀台北或上海，否則每日流量切分會錯開，對照 GSC 數據會對唔上。
4. 取得「評估 ID」（格式：G-XXXXXXXXXX）

### 第二步：安裝追蹤代碼

**方法一：Google Tag Manager（推薦）**
```
GTM → 新增代碼 → GA4 設定 → 輸入評估 ID → 觸發條件選 All Pages
```

**方法二：直接嵌入網站**
```html
<!-- 放在 <head> 區塊 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**方法三：CMS 外掛**
- WordPress：Site Kit by Google（官方外掛）
- Shopify：偏好設定 → Google Analytics
- SHOPLINE / SHOPEE X / WordPress + WooCommerce（香港電商常用）：後台通常有「第三方追蹤碼」欄位，直接貼 G-XXXXXXXXXX

> 💡 **香港合規提示：** 如果網站收香港用戶資料（表單、會員、評論），記得喺 Cookie Banner / 私隱政策講清楚 GA4 嘅用途，符合 PDPO 嘅「收集個人資料須知會」原則。用 Google Consent Mode v2 可以喺用戶拒絕 Cookie 時仍然保留匿名建模數據。

### 第三步：連結 Google Search Console

這是 SEO 分析最關鍵的一步：

```
GA4 → 管理員 → 產品連結 → Search Console 連結 → 新增連結
```

完成後，GA4 中會出現兩個專屬報表：
- **Google 有機搜尋查詢** — 看每個關鍵字的流量、參與度、轉換
- **Google 有機搜尋流量** — 看每個著陸頁的有機表現

---

## GA4 對 SEO 最重要的五個報表

### 報表一：流量開發 → Google 有機搜尋查詢

```
GA4 → 報表 → 生命週期 → 獲客 → 流量開發
→ 在表格中篩選「工作階段媒體 = organic」
```

**SEO 分析重點：**
- 有機流量佔總流量比例（應 >50% 為佳）
- 有機流量的參與率（Engagement Rate）
- 有機用戶 vs 付費用戶的行為差異

> 🇭🇰 **香港基準參考：** 香港網站常見嘅來源分佈係 Google 有機 40-55%、直接流量 15-25%、社交（Facebook / IG / 小紅書）10-20%、付費廣告 10-20%。如果你嘅有機佔比低過 30%，即係 SEO 仲未做起來，或者過度依賴廣告。

### 報表二：有機搜尋查詢（需連結 GSC）

```
GA4 → 報表 → 生命週期 → 獲客 → Google 有機搜尋查詢
```

這個報表結合了 GSC 的搜尋數據和 GA4 的用戶行為數據：

| 指標 | 來源 | 意義 |
|------|------|------|
| 有機點擊 | GSC | 搜尋流量進站 |
| 參與工作階段 | GA4 | 進站後有互動 |
| 關鍵事件（轉換） | GA4 | 完成目標動作 |
| 每位使用者平均參與時間 | GA4 | 內容深度 |

**實戰用法：**
找出「高點擊、低參與」的關鍵字 → 內容與搜尋意圖不匹配，需重寫著陸頁。

**香港常見例子：**
- 搜「旺角 補習社」嘅人，落到一個淨係得公司簡介嘅首頁 → 佢要嘅係收費表、時間表、地區分店，結果 3 秒就走。
- 搜「香港 寬頻 比較 2026」嘅人，落到一個硬銷申請頁 → 佢要嘅係比較表。

### 報表三：著陸頁報表

```
GA4 → 報表 → 生命週期 → 參與 → 著陸頁
→ 加上篩選器：「工作階段媒體 = organic」
```

**SEO 分析重點：**
| 指標 | SEO 意義 |
|------|----------|
| 工作階段 | 該頁面吸引的有機流量 |
| 參與率 | 內容品質指標 |
| 平均參與時間 | 內容深度/匹配度 |
| 關鍵事件（轉換） | 商業價值 |
| 回訪率 | 內容忠誠度 |

### 報表四：轉換路徑（探索報表）

```
GA4 → 探索 → 路徑探索
→ 起始接觸點設為「有機搜尋」
```

**這個報表回答：**
- SEO 流量進來後，去了哪些頁面？
- 中間經過哪些步驟才轉換？
- 哪些頁面是轉換旅程的關鍵節點？

### 報表五：預測目標對象（機器學習功能）

```
GA4 → 探索 → 目標對象探索
```

GA4 的機器學習功能可以自動識別：
- **潛在購買者** — 未來 7 天內可能購買的用戶
- **流失機率** — 未來 7 天內可能不再回訪的用戶

**SEO 用途：** 設定這些群體後，分析他們的有機搜尋行為 — 高價值用戶都搜什麼關鍵字？

> ⚠️ 預測目標對象需要足夠數據量（通常要每月有一定 session 數）。香港市場細、B2B 或小眾行業嘅網站可能湊唔夠數據，呢個報表會灰色顯示 — 唔使灰心，改用「自訂目標對象」手動圈選就得。

---

## 自訂事件追蹤（SEO 關鍵行為）

### 追蹤 SEO 相關的微轉換

光追蹤購買是不夠的。你需要知道 SEO 流量做了哪些「中間行為」：

```javascript
// 追蹤內容頁面的閱讀深度（閱讀超過 75%）
gtag('event', 'scroll_depth', {
  'percent': 75,
  'page_title': document.title
});

// 追蹤內部連結點擊（用戶在探索你的主題群集）
document.querySelectorAll('.article-content a[href^="/"]').forEach(link => {
  link.addEventListener('click', () => {
    gtag('event', 'internal_link_click', {
      'link_url': link.href,
      'link_text': link.textContent
    });
  });
});

// 追蹤 FAQ Schema 互動（點擊展開問題）
gtag('event', 'faq_interaction', {
  'question': '如何XXX？'
});

// 追蹤文件下載（SEO 內容的核心轉換之一）
gtag('event', 'file_download', {
  'file_name': 'seo-checklist-2026.pdf',
  'file_type': 'pdf'
});
```

**香港網站常見的「微轉換」事件（建議至少設這幾個）：**

| 事件 | 香港場景例子 | 為什麼重要 |
|------|-------------|-----------|
| `whatsapp_click` | 點擊 WhatsApp 聯絡按鈕 | 香港人極常用 WhatsApp 查詢，係本地最重要嘅轉換訊號之一 |
| `phone_call_click` | 點擊 tel: 撥打電話 | 本地服務（裝修、搬屋、醫療）主要靠打電話 |
| `map_direction_click` | 點擊 Google Maps 導航 | 實體店（餐廳、診所、門市）嘅到店前奏 |
| `openrice_referral` | 跳去 OpenRice 頁面 | 餐飲網站嘅重要行為指標 |
| `quote_form_submit` | 報價表單提交 | B2B、裝修、保險常見 |
| `file_download` | 下載價目表 PDF / 課程單張 | 香港用戶鍾意下載「單張」慢慢睇 |

```javascript
// 追蹤 WhatsApp 點擊（香港幾乎必備）
document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]').forEach(el => {
  el.addEventListener('click', () => {
    gtag('event', 'whatsapp_click', {
      'page_path': location.pathname,
      'link_text': el.textContent.trim()
    });
  });
});
```

### 設定為 GA4 關鍵事件（轉換）

在 GA4 中將這些事件標記為關鍵事件：
```
GA4 → 管理員 → 事件 → 找到事件 → 標示為關鍵事件
```

---

## SEO 數據整合實戰：GSC + GA4

### 整合一：著陸頁 SEO 表現儀表板

在 GA4 中建立自訂報表（或匯出到 Looker Studio），合併以下數據：

```
┌─────────────────────────────────────────────┐
│              著陸頁 SEO 分析                  │
├──────┬──────────┬────────┬─────────┬────────┤
│ 頁面  │ 有機流量  │ 參與率  │ 轉換率   │ 平均排名 │
│      │ (GA4)    │ (GA4)  │ (GA4)   │ (GSC)  │
├──────┼──────────┼────────┼─────────┼────────┤
│ /blog/a│ 2,340  │ 72%    │ 3.2%    │ 2.1    │
│ /blog/b│ 1,890  │ 68%    │ 2.8%    │ 4.3    │
│ /blog/c│ 1,540  │ 45%    │ 1.1%    │ 1.8    │  ⚠️ 高排名低參與
│ /blog/d│ 1,200  │ 81%    │ 5.3%    │ 8.7    │  💡 高轉換潛力
└──────┴──────────┴────────┴─────────┴────────┘
```

**立即行動：**
- `blog/c`：排名第一但參與率低 → 內容與意圖不匹配，重寫
- `blog/d`：排名第八但轉換高 → 優化關鍵字和內部連結，推上首頁

### 整合二：關鍵字 ROI 計算

```sql
-- 概念 SQL：結合 GSC 點擊 + GA4 轉換
SELECT
  gsc.query,
  gsc.clicks,
  gsc.impressions,
  gsc.avg_position,
  ga4.conversions,
  ga4.revenue,
  ga4.revenue / gsc.clicks AS revenue_per_click
FROM gsc_data gsc
JOIN ga4_landing_page_data ga4
  ON gsc.page = ga4.page
WHERE gsc.clicks > 100  -- 過濾數據太少的關鍵字
ORDER BY revenue_per_click DESC
```

> 🇭🇰 香港市場嘅數據量通常細過台灣 / 美國，建議將門檻由 `clicks > 100` 降做 `clicks > 30`，否則會 filter 走太多關鍵字，睇唔到嘢。

### 整合三：內容投資回報追蹤

為每篇 SEO 文章建立追蹤表：

| 文章 | 創作時間 (h) | 月均流量 | 月均轉換 | 營收貢獻 | ROI |
|------|-------------|----------|----------|----------|-----|
| 文章 A | 8 | 2,100 | 21 | HK$4,200 | 極佳 |
| 文章 B | 12 | 340 | 2 | HK$400 | 待改善 |
| 文章 C | 4 | 890 | 15 | HK$3,000 | 極佳 |

> 💡 文章 C 最驚豔 — 只花 4 小時創作，卻帶來 15 次轉換。這就是應該複製的內容模式。

---

## GA4 探索報表：SEO 進階分析

### 探索一：有機用戶的內容旅程

```
GA4 → 探索 → 空白 → 路徑探索
起始接觸點：event_name = session_start
                 first_user_medium = organic
```

分析 SEO 用戶的路徑模式：
- **最常見路徑：** Blog Post → Service Page → Contact → Conversion
- **卡住點：** 大量用戶在 Blog Post → 離開
- **行動：** 在卡住點增加 CTA 或相關內容推薦

### 探索二：按照裝置區分 SEO 表現

```
GA4 → 探索 → 自由形式
列：裝置類別
值：工作階段、參與率、平均參與時間、關鍵事件
篩選：工作階段媒體 = organic
```

如果手機參與率明顯低於電腦 → 行動版內容體驗需要改善。

> 🇭🇰 **香港特別注意：** 香港手機上網滲透率極高，加上唔少人喺通勤途中（地鐵、巴士）用手機搵資料，手機體驗基本上就等於你嘅 SEO 成敗。如果 mobile 參與率比 desktop 低超過 15 個百分點，優先處理行動版速度同可讀性（參考 Core Web Vitals 章節）。

### 探索三：按國家/語言的 SEO 成效

多語系或多市場網站必須追蹤這個維度：
```
維度：國家 + 語言
指標：工作階段、轉換率、每位使用者收益
```

**香港網站的典型分佈：**
- 香港（zh-HK / en-HK）：主力市場，佔 60-90%
- 台灣、馬來西亞、新加坡（繁中）：順帶吃到，視乎內容有冇本地化
- 中國內地（zh-CN）：如果做內地客生意，要注意呢批流量嘅行為完全唔同（百度 / 微信 / 小紅書為主，Google 唔係主戰場）
- 英美澳加（英文 / 繁中）：移民、海外港人、國際 B2B 查詢

> 💡 如果發現「香港」以外嘅流量佔比異常高，檢查吓 hreflang 同 ccTLD 設定（.hk / .com.hk / /zh-hk/ /en-hk/），可能錯導咗流量。

---

## Looker Studio 儀表板製作（免費的 SEO Dashboard）

### 快速建立 SEO Dashboard 的步驟

1. **前往** [lookerstudio.google.com](https://lookerstudio.google.com)
2. **建立報表** → 新增數據來源
3. **連接 GA4** + **連接 GSC**
4. **拖曳圖表**：

```
建議儀表板佈局：

┌─────────────────────────────────────────────────┐
│  SEO 月度總覽（香港）           日期範圍：本月      │
├──────────┬──────────┬──────────┬────────────────┤
│ 有機流量  │ 轉換數    │ 轉換率    │ 平均排名        │
│ (數字卡)  │ (數字卡)  │ (數字卡)  │ (數字卡)        │
├──────────┴──────────┴──────────┴────────────────┤
│  每日有機流量趨勢（折線圖）                        │
├─────────────────────────────────────────────────────┤
│  關鍵字 Top 10 — 流量排名（表格）                 │
├─────────────────────────────────────────────────┤
│  著陸頁 Top 10 — 參與度排名（表格）               │
├─────────────────────────────────────────────────┤
│  流量來源佔比（圓餅圖/甜甜圈圖）                   │
├─────────────────────────────────────────────────┤
│  裝置類別分佈（直條圖）                            │
├─────────────────────────────────────────────────┤
│  地區分佈：18 區 / 香港 vs 海外（地圖或表格）      │
└─────────────────────────────────────────────────┘
```

### 值得加到 Dashboard 的進階指標

- **有機 vs 付費流量佔比趨勢**（月變化）
- **品牌 vs 非品牌流量佔比**（需要 GSC 篩選）
- **Top 進入頁面的回訪率**
- **內容發布後的流量爬坡曲線**（新文章 0 → 90 天的流量增長）
- **香港本地關鍵字（含地區名，如「中環」「沙田」「觀塘」）的流量佔比** — 本地 SEO 成效指標

---

## UTM 參數：追蹤 SEO 以外的推廣成效

雖然 SEO 流量本身不需要 UTM（GSC 已經追蹤），但當你：
- 在社群媒體分享 SEO 文章（Facebook 專頁 / IG / 小紅書 / Threads）
- 在香港討論區（LIHKG 連登、Uwants、Discuss.com.hk）分享內容
- 在電子報（EDM）中推廣內容
- 與 KOL / KOC 合作推廣

就需要用 UTM 標記來區分流量來源：

```
https://example.hk/seo-guide/?utm_source=lihkg&utm_medium=social&utm_campaign=hk_seo_series_01&utm_content=cta_button
```

**UTM 五大參數：**
| 參數 | 說明 | 香港常用範例 |
|------|------|------|
| utm_source | 來源 | facebook, instagram, xiaohongshu, lihkg, edm, hk01 |
| utm_medium | 媒介 | social, email, cpc, referral, display |
| utm_campaign | 活動名稱 | hk_seo_series_launch, cny_promo_2026 |
| utm_term | 關鍵字（可選） | seo_tools |
| utm_content | 內容版本（可選） | cta_button_a |

**命名規範（給自己一條規矩）：**
- 全部小寫
- 用底線不用空格
- 保持一致（不要有時 `facebook` 有時 `fb`）
- 繁中參數先轉英文（例如「小紅書」統一寫 `xiaohongshu`，唔好寫 `red` 又寫 `xhs`）

> ⚠️ **唔好濫用 UTM 標記自己嘅內部連結！** 內部連結一旦加咗 UTM，GA4 會開一個新 session，原本嘅有機來源會被覆蓋（變成 referral），SEO 流量會「消失」。呢個係最常見嘅 GA4 數據錯誤之一。

---

## 常見的 GA4 SEO 分析誤區

### ❌ 誤區一：把 GA4 的「工作階段」直接當成 SEO 流量
GA4 中一個工作階段可能包含多個來源。查看 SEO 效能時，務必用「工作階段媒體 = organic」篩選。

### ❌ 誤區二：忽略「未指派」流量
GA4 的「未指派」流量通常是因為 Cookie 被阻擋或用戶使用了隱私瀏覽，正常現象。但如果佔比超過 15%，檢查 GA4 設定。
> 🇭🇰 香港 iPhone 滲透率極高，Safari 嘅 ITP（Intelligent Tracking Prevention）會擋追蹤，令「未指派」比例偏高。如果發現 iOS 流量異常低，可以考慮用伺服器端追蹤（Server-side GTM）補救。

### ❌ 誤區三：直接比較 GA4 和 GSC 的點擊數
兩者的計算方式不同，數字永遠不會一模一樣。GA4 的「工作階段」≠ GSC 的「點擊」，這是正常的。

### ❌ 誤區四：只看「工作階段」而忽略「使用者」
使用者數（Users）比工作階段更能反映真實的受眾規模。一篇文章可能同一個用戶看了 5 次（5 個工作階段，但只有 1 個使用者）。

### ❌ 誤區五：不設定轉換事件就開始分析
沒有轉換事件的 GA4 只會告訴你「有人來」，但不會告訴你「來的人有沒有價值」。設定轉換是第一優先。

### ❌ 誤區六（香港常見）：把連登 / Facebook 的爆紅流量當成 SEO 成效
LIHKG 連登一篇 post 爆咗，可以一朝帶來幾萬 PV，但呢批流量來源係 referral / social，唔係 organic search。要喺報表入面用「工作階段媒體」分開，否則會誤判 SEO 成效。

---

## GA4 每月 SEO 檢查清單

```
☐ 流量開發報表：有機流量 MoM 和 YoY 變化
☐ 有機搜尋查詢報表：Top 關鍵字變化（含香港地區名關鍵字）
☐ 著陸頁報表：Top 10 頁面的參與率與轉換率
☐ 探索 → 路徑探索：SEO 用戶的典型旅程
☐ 轉換報表：有機轉換數和轉換率趨勢
☐ 裝置報表：手機 vs 桌面表現對比（香港以手機為主）
☐ 地區報表：香港 18 區 / 香港 vs 海外流量分佈
☐ 檢查轉換事件：是否有新事件需要標記？（WhatsApp / 打電話 / 地圖導航）
☐ 檢查 UTM 使用：命名是否一致？有沒有誤加到內部連結？
☐ 更新 SEO Dashboard：把新數據填入 Looker Studio
☐ 檢查 Cookie Consent 設定：是否仍符合 PDPO 要求
```

---

## 本章重點回顧

| GA4 功能 | SEO 用途 | 重要度 |
|----------|----------|--------|
| 流量開發報表 | 追蹤有機流量佔比與趨勢 | ⭐⭐⭐⭐⭐ |
| 有機搜尋查詢（需連結 GSC） | 關鍵字 + 用戶行為整合 | ⭐⭐⭐⭐⭐ |
| 著陸頁報表 | 頁面層級的 SEO 表現 | ⭐⭐⭐⭐⭐ |
| 轉換路徑 | SEO 在轉換旅程的角色 | ⭐⭐⭐⭐ |
| 探索報表 | 自訂深度分析 | ⭐⭐⭐⭐ |
| 預測目標對象 | AI 驅動的用戶分群（香港細網站可能數據不足） | ⭐⭐⭐ |
| Looker Studio 整合 | 視覺化 SEO Dashboard | ⭐⭐⭐⭐ |

---

> ⬅️ [上一章：第 68 章 Google Search Console 完整操作教學](/blog/google-search-console) | [回索引](/blog) | [下一章：第 70 章 SEO 數據分析常見診斷流程](/blog/seo-data-diagnosis) ➡️
