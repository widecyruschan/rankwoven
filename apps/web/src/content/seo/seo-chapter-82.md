> 跨境電商的 SEO 不只是「把網站翻譯成英文」這麼簡單。每個市場都有自己的搜尋習慣、文化偏好和搜尋引擎生態。

---

## 跨境 SEO 的三大策略選擇

### 策略一：全球化統一網站（.com）

```
適合：產品全球通用、品牌一致性要求高

範例：
  apple.com/（全球首頁）
  apple.com/tw/（台灣）
  apple.com/jp/（日本）
  apple.com/kr/（韓國）

優點：
  ✅ 品牌統一
  ✅ 權重集中（所有連結指向同一個域名）
  ✅ 管理簡單

缺點：
  ❌ 本地化程度有限
  ❌ 對本地搜尋引擎（如百度）的 SEO 效果較差
```

### 策略二：各國獨立域名（ccTLD）

```
適合：市場差異大、需要深度本地化、快速建立本地信任

範例：
  brand.tw（台灣）
  brand.jp（日本）
  brand.co.kr（韓國）
  brand.de（德國）

優點：
  ✅ 最強的本地 SEO 訊號
  ✅ 用戶信任度最高
  ✅ 各國獨立運作，互不干擾

缺點：
  ❌ 成本高（每個域名單獨管理）
  ❌ 權重分散（需要對每個域名做 SEO）
  ❌ 品牌管理複雜
```

### 策略三：混合模式（推薦）

```
適合：有限資源下最大化跨境 SEO 效果

範例：
  brand.com/（主力市場 — 使用統一站）
  brand.jp（日本 — 使用獨立域名，日本市場特殊）
  brand.kr（韓國 — 使用獨立域名，Naver SEO 需求）

選擇標準：
  → 搜尋引擎生態差異大 → 獨立域名
  → 搜尋引擎相同（都是用 Google）→ 子目錄
```

---

## 跨境 SEO 四大核心工作

### 工作一：hreflang 標籤（最關鍵的技術設定）

hreflang 告訴 Google 每個頁面是給哪個語言/市場的用戶看的。

**實作方式（選擇一種即可）：**

```html
<!-- 方法一：HTML head 標籤（推薦） -->
<link rel="alternate" hreflang="zh-TW" href="https://brand.com/tw/" />
<link rel="alternate" hreflang="zh-CN" href="https://brand.com/cn/" />
<link rel="alternate" hreflang="en-US" href="https://brand.com/us/" />
<link rel="alternate" hreflang="ja-JP" href="https://brand.com/jp/" />
<link rel="alternate" hreflang="x-default" href="https://brand.com/" />

<!-- 方法二：XML Sitemap -->
<!-- 方法三：HTTP Header -->
```

**hreflang 常見錯誤：**
```
❌ 語言代碼錯誤：zh-TW 寫成 zh-tw（大小寫須正確）
❌ 缺少 x-default（沒有指定預設語言/地區）
❌ 只有單向宣告（A 宣告 B，但 B 沒有宣告 A）
❌ hreflang 指向的 URL 返回 404 或 301
❌ 忘記包含自己（每個頁面也要宣告自己的 hreflang）
```

### 工作二：多語言內容策略

**翻譯 vs 在地化：**

| 層級 | 做法 | 成本 | 效果 |
|------|------|------|------|
| 機器翻譯 | Google / DeepL 直接翻譯 | 極低 | 差，Google 可識別 |
| 人工翻譯 | 逐字翻譯 | 中 | 中，語言通但文化不通 |
| 在地化翻譯 | 翻譯 + 調整為本地用語 | 高 | 好 |
| 原創本地內容 | 各市場獨立創作 | 最高 | 最佳 |

**關鍵字研究的在地化：**
```
不要直接翻譯你的中文關鍵字！

例子：台灣人搜「行李箱」
   → 英文直接翻 → "luggage"（對但不夠好）
   → 實際英文常用 → "suitcase" / "carry-on luggage"
   → 美國人更常搜 → "best luggage for international travel"

每個市場獨立做關鍵字研究。
```

### 工作三：本地化 SEO 訊號

```
增加本地 SEO 訊號的方法：

1. 本地地址與聯絡資訊（在目標市場有實體辦公室最佳）
2. 本地電話號碼格式
3. 本地貨幣與價格顯示
4. 本地付款方式
5. 本地社群媒體連結（美國用 IG/Twitter，日本用 LINE，韓國用 KakaoTalk）
6. 本地主機/CDN（網站速度對該市場的用戶更快）
7. 本地 Schema（LocalBusiness Schema 指向該國地址）
8. 本地反向連結（獲得目標市場網站的連結）
```

### 工作四：CDN 與伺服器位置

```
網站速度對跨境 SEO 的影響：

使用 CDN（如 Cloudflare）讓網站內容從接近用戶的節點提供

範例：
- 台灣用戶 → 亞洲 CDN 節點（台北/東京/新加坡）
- 美國用戶 → 北美 CDN 節點
- 歐洲用戶 → 歐洲 CDN 節點

好處：
✅ 各市場的載入速度都快
✅ Core Web Vitals 分數在各地區都達標
✅ Google 會根據速度來判斷用戶體驗
```

---

## 跨境電商 SEO 特別考量

### 商品頁面國際化

```
產品名稱在地化：
  台灣：「筆電」
  中國：「笔记本」/「笔记本电脑」
  香港：「手提電腦」
  不要全部用同一個詞，各地搜習慣不同

國際 Schema 標記：
  使用 Product Schema + Offer Schema
  標記多種幣別價格
  標記國際運送資訊（ShippingDetails Schema）

多語言顧客評論：
  保留原語言的評論，加上翻譯
  或只顯示該市場語言的評論
  評論是 SEO 內容的重要來源
```

### 處理跨市場的重複內容

```
問題：同樣的商品在 brand.com/tw/ 和 brand.com/hk/ 顯示幾乎一樣的繁體中文內容

解決方案：
1. hreflang 正確設定（Google 知道這是不同市場版本）
2. 內容差異化：
   - 用了不同的案例、本地參考資料
   - 價格用不同幣別
   - 描述加入本地化的細節
3. 使用 Canonical + hreflang 組合（如果內容真的完全一樣）
```

---

## 特定市場 SEO 速覽

### 日本市場（Google + Yahoo! Japan）

```
搜尋引擎市佔：Google ~75%，Yahoo! Japan ~25%
（Yahoo! Japan 使用 Google 的搜尋技術，SEO 策略基本一致）

日本市場特色：
- 用戶重視詳細資訊（商品頁面要極其詳細）
- 手機使用率極高（行動版體驗是基本要求）
- 信任感很重要（公司資訊、聯絡方式要完整）
- 使用 .jp 域名有明顯的本地信任優勢

日本 SEO 工具：Rakuten、価格.com（比價網站 SEO 機會）
```

### 韓國市場（Naver 為主）

```
搜尋引擎市佔：Naver ~60%，Google ~35%

Naver SEO 特色：
- Naver 有自己的搜尋生態系統（不依賴Google的規則）
- 內容品質比連結更重要
- Naver 部落格和 Naver Cafe 的內容排名優先
- 需要 Naver Webmaster Tools（不是 GSC）
- Naver 重視「 freshness」（頻繁更新的內容）

韓國 SEO 建議：
- 開設 Naver 部落格
- 在 Naver 知識問答中活躍
- 使用韓文純文字 URL（不是英文拼音）
```

### 中國市場（百度為主）

```
搜尋引擎市佔：百度 ~65%

百度 SEO 特色：
- 需要 ICP 備案（網站必須在中國註冊備案）
- 中國主機速度對排名影響很大
- 百度對原創內容的判斷方式與 Google 不同
- 行動版（Mobile）優先程度比 Google 更極端
- 百度資源平台（相當於 GSC）

百度 SEO 建議：
- .cn 域名 + ICP 備案
- 網站放在中國主機（或使用中國 CDN）
- 避免被封鎖的外部資源（Google Fonts、YouTube 嵌入等）
- 提供完整的公司資訊和聯絡方式
```

---

## 跨境 SEO 四階段路線圖

```
階段一（第 1-2 月）：基礎建設
☐ 確定目標市場和優先級
☐ 選擇域名策略（子目錄/子域名/獨立域名）
☐ 建立 hreflang 架構
☐ 每市場獨立關鍵字研究

階段二（第 3-4 月）：內容建設
☐ 建立多語言內容（先從最重要的市場開始）
☐ 翻譯 + 在地化（不只翻譯文字）
☐ 每個市場至少 10-20 篇原創內容

階段三（第 5-8 月）：市場深耕
☐ 獲取目標市場的本地反向連結
☐ 在本地平台建立存在感
☐ 優化各市場的轉換率

階段四（第 9-12 月）：規模化
☐ 根據數據決定擴大哪些市場
☐ 建立各市場的 SEO SOP
☐ 招聘本地 SEO 人才
```

---

## 本章重點回顧

| 市場 | 主力搜尋引擎 | 關鍵 SEO 策略 |
|------|-------------|--------------|
| 台灣 | Google | 標準 Google SEO |
| 日本 | Google + Yahoo! JP | .jp 域名優勢、詳細內容 |
| 韓國 | Naver | Naver 生態圈、韓文 URL |
| 中國 | 百度 | .cn + ICP 備案 + 中國主機 |
| 東南亞 | Google | 多語言內容、行動版優先 |
| 歐美 | Google | hreflang、本地連結、CDN |

> 💡 **跨境 SEO 最重要的原則：假設每個市場的用戶都只會用自己的語言搜尋。用他們的語言、他們的文化、他們的平台來規劃你的 SEO。**

---

> ⬅️ [上一章：第 81 章 YouTube SEO 完整教學](/blog/youtube-seo) | [回索引](/blog) | [下一章：第 83 章 台灣社群 SEO（PTT/Dcard）](/blog/taiwan-social-seo) ➡️
