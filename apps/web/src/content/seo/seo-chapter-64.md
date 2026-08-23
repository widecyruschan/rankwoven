---

## llms.txt 是什麼？

**llms.txt** 是 2025 年由知名開發者 Jeremy Howard 提出的新標準，專為大型語言模型（LLM）和 AI 爬蟲設計。它類似於 robots.txt，但用途完全不同。

```
robots.txt vs llms.txt：

  robots.txt：
    對象：搜尋引擎爬蟲（Googlebot、Bingbot 等）
    用途：控制哪些頁面可以被爬取
    語言：簡單的 Allow/Disallow 指令
    歷史：自 1994 年起存在

  llms.txt：
    對象：AI 語言模型和 AI 搜尋引擎
    用途：告訴 AI 你的網站有什麼內容、如何最有效地理解它
    語言：Markdown 格式，人類和 AI 都可讀
    歷史：2025 年提出，正在快速被行業採用

一句話：
  robots.txt = 告訴爬蟲「可以去哪裡」
  llms.txt   = 告訴 AI「這裡有什麼、重點是什麼」
```

---

## 為什麼需要 llms.txt？

### 問題：AI 對網站的「理解效率」很差

```
現狀：
  當 ChatGPT、Perplexity 或其他 AI 需要理解你的網站時，
  它們通常會：

  1. 爬取你的首頁
  2. 跟隨連結爬取子頁面
  3. 嘗試理解每個頁面的內容
  4. 沒有「網站地圖」來引導它們

  結果：
  → AI 可能錯過你最重要的內容
  → AI 花費大量資源爬取次要頁面
  → AI 對你的網站整體結構缺乏理解
  → 你的核心資訊沒有被有效傳遞
```

### 解決方案：給 AI 一份「閱讀指南」

```
llms.txt 就像一本書的目錄 + 摘要：

  沒有 llms.txt = AI 需要讀完整本書才知道重點在哪裡
  有 llms.txt   = AI 先看目錄，直接跳到最相關的章節

  效果：
  ✅ AI 更快找到你的核心內容
  ✅ AI 對你的網站有結構化的理解
  ✅ 你的關鍵資訊更有機會被引用
  ✅ 減少 AI 浪費資源爬取次要頁面
```

---

## llms.txt 的格式規範

### 基本格式

```markdown
# 網站標題（H1）

> 簡短的網站描述（1-2 句，使用 blockquote）

## 章節標題（H2）

- [連結文字](完整的 URL)：簡短描述（可選）
- [另一個連結](URL)：描述

## 另一個章節

- [更多連結](URL)
- ...

---

## 可選部分（H2，在分隔線後）

### 更多資訊

任何你希望 AI 了解的額外 Markdown 內容。
可以包含結構化的資訊、核心數據、品牌描述等。
```

### 完整範例

```markdown
# 陳大明牙醫診所

> 位於香港中環的專業牙科診所，由陳大明醫生主理，提供植牙、
> 隱形牙套矯正、牙齒美白等全面牙科服務。自 2010 年服務香港。

## 核心服務頁面

- [植牙服務](https://www.chendaming-dental.com.hk/services/implant/)：瑞士 Straumann 植體，15 年經驗，單顆 HK$20,000 起
- [隱形牙套矯正](https://www.chendaming-dental.com.hk/services/invisalign/)：Invisalign 認證醫師，免費 3D 掃描諮詢
- [牙齒美白](https://www.chendaming-dental.com.hk/services/whitening/)：雷射美白即日見效，家居美白套裝
- [緊急牙科護理](https://www.chendaming-dental.com.hk/emergency/)：即日預約，中環核心地段

## 關於我們

- [醫生團隊](https://www.chendaming-dental.com.hk/about/team/)：陳大明醫生經歷、專業資格、團隊介紹
- [診所設施](https://www.chendaming-dental.com.hk/about/facilities/)：3D 掃描、數位 X 光、無菌手術室
- [患者評價](https://www.chendaming-dental.com.hk/reviews/)：Google 4.8 星，超過 320 則真實評價

## 實用資源

- [植牙常見問題](https://www.chendaming-dental.com.hk/faq/implant/)：21 個植牙相關問答，含費用、過程、風險
- [收費標準](https://www.chendaming-dental.com.hk/pricing/)：各項服務收費範圍，公開透明
- [初次就診指南](https://www.chendaming-dental.com.hk/new-patients/)：預約流程、所需文件、交通指引
- [部落格](https://www.chendaming-dental.com.hk/blog/)：牙科知識、口腔保健、行業趨勢

## 聯絡資訊

- [聯絡我們](https://www.chendaming-dental.com.hk/contact/)：地址、電話、營業時間、線上預約

---

## 更多資訊

### 關於診所

陳大明牙醫診所自 2010 年起服務香港社區。我們的核心價值是提供
專業、個人化、以患者為中心的牙科護理。診所使用最新的牙科技術，
包括 3D 掃描、數位規劃和微創手術技術。

### 核心數據

- 15 年臨床經驗
- 超過 3,000 例成功植牙
- Google 評分 4.8（320+ 則評論）
- 位於中環核心地段（地鐵站步行 3 分鐘）

### 營業時間

- 星期一至五：09:00 - 18:00
- 星期六：09:00 - 13:00
- 星期日及公眾假期：休息

### 付款方式

接受現金、信用卡（Visa/Master）、EPS、八達通、支付寶、微信支付。
部分治療可申請醫療保險索償。
```

---

## llms.txt 的技術細節

### 檔案位置

```
llms.txt 必須放在網站根目錄：

  https://www.yoursite.com/llms.txt

與 robots.txt、sitemap.xml 放在同一層級。
```

### 檔案格式要求

```
✅ 純文字檔案（.txt）
✅ UTF-8 編碼
✅ Markdown 格式
✅ 使用完整 URL（https://...）
✅ 每個連結獨佔一行

❌ 不要使用相對路徑
❌ 不要使用 HTML
❌ 不要過長（理想 500-2,000 字）
```

### llms-full.txt（完整版本）

```
除了標準的 llms.txt，你還可以提供一個更詳細的版本：

  llms-full.txt

用途：
  llms.txt = 精簡版，給 AI 快速了解網站結構
  llms-full.txt = 完整版，包含更多輔助資訊和背景內容

如果你的網站內容豐富，考慮提供兩個版本。
對於大多數中小型網站，一個 llms.txt 就足夠。
```

---

## llms.txt 的 SEO 價值

### 對 AI 引用的直接影響

```
有 llms.txt 的網站 vs 沒有：

  沒有 llms.txt：
    AI 爬取首頁 → 找到一些連結 → 爬取部分子頁面 →
    可能錯過重要內容 → 不完整的理解 → 較低的引用機率

  有 llms.txt：
    AI 讀取 llms.txt → 立即了解網站結構 →
    知道哪些頁面最重要 → 優先爬取核心內容 →
    完整的理解 → 更高的引用機率

具體影響：
  ✅ 核心頁面更快被 AI 發現和理解
  ✅ AI 引用時更準確（減少了誤解）
  ✅ 品牌在 AI 中的呈現更完整
  ✅ 網站內容的 AI 可發現性（AI Discoverability）提升
```

### 對傳統 SEO 也有間接幫助

```
雖然 llms.txt 的直接影響在 AI 層面，但它對傳統 SEO 也有幫助：

  → 內部連結結構更清晰
     （建立 llms.txt 的過程 = 重新審視你的網站結構）

  → 內容優先級更明確
     （你被迫思考「哪些頁面最重要」）

  → Sitemap 的補充
     （llms.txt 比 Sitemap 提供更多上下文）
```

---

## 如何建立 llms.txt

### Step 1：識別你的核心頁面

```
問自己：如果只能用 10 個頁面來代表你的網站，你會選哪些？

  → 首頁
  → 核心服務/產品頁面（3-5 個）
  → 關於我們
  → 聯絡我們
  → 最重要的資源頁面（FAQ、定價等）
  → 最權威的部落格文章（如有）

這些就是你的 llms.txt 中要列出的頁面。
```

### Step 2：為每個頁面寫一句簡潔描述

```
描述應該是 AI 可以理解的摘要，格式：

  - [頁面標題](URL)：這個頁面提供什麼資訊／解決什麼問題

不好的描述：
  - [植牙](URL)：植牙頁面
  （太模糊，沒有告訴 AI 這個頁面的具體價值）

好的描述：
  - [植牙服務](URL)：瑞士 Straumann 植體，15 年經驗，
    含費用範圍、過程步驟、常見問題
  （明確告訴 AI 這個頁面涵蓋了什麼內容）
```

### Step 3：加入背景資訊

```
在分隔線（---）後，加入「更多資訊」章節：

  → 品牌簡介（2-3 句）
  → 核心數據（經驗年資、案例數、評分等）
  → 營業資訊
  → 任何你希望 AI 知道的背景資訊

這些資訊不一定在你的網站上結構化地呈現，
但在 llms.txt 中可以直接告訴 AI。
```

### Step 4：上傳到網站根目錄

```
技術步驟：

1. 將 llms.txt 檔案上傳到網站根目錄
   確認可以通過 https://yoursite.com/llms.txt 訪問

2. （可選）在 robots.txt 中引用
   Sitemap: https://yoursite.com/sitemap.xml
   LLMs: https://yoursite.com/llms.txt

3. 測試：
   使用 curl 或瀏覽器訪問 llms.txt，確認內容正確顯示
```

---

## llms.txt 的最佳實踐

### 實踐 1：保持更新

```
llms.txt 不是「建立一次就忘記」的檔案。

更新時機：
  → 新增重要頁面時
  → 網站結構改變時
  → 核心數據更新時（例如：案例數量增長）
  → 至少每季審查一次

你可以在 llms.txt 頂部加入更新日期：
  > 最後更新：2026 年 7 月 23 日
```

### 實踐 2：適當的顆粒度

```
不要：
  → 列出所有頁面（這和 Sitemap 沒有區別）
  → 只列出首頁（對 AI 幫助有限）

應該：
  → 列出 10-30 個最重要的頁面
  → 用章節分類（服務、資源、關於等）
  → 每個頁面有一句有資訊量的描述
```

### 實踐 3：使用 Markdown 增強可讀性

```
AI 可以理解 Markdown 格式，利用它來增強結構：

  # H1 標題
  > blockquote 用於摘要
  ## H2 章節
  - 列表項目
  **粗體** 和 *斜體* 也有效
  --- 分隔線

  避免：
  ❌ 複雜的表格（可能降低可讀性）
  ❌ 圖片（AI 從 llms.txt 中不預期看到圖片）
  ❌ HTML 標籤
```

### 實踐 4：對標行業標準

```
查看其他網站的 llms.txt 作為參考：

目前已有不少知名網站開始採用 llms.txt：
  → https://llmstxt.org/（llms.txt 官方網站）
  → 查看你行業中的領先網站是否有 llms.txt

對標可以幫助你了解行業的「標準格式」。
```

---

## llms.txt 的未來

### 行業採用趨勢

```
2025-2026 年的發展：

  已支援或正在整合 llms.txt 的平台/工具：
  ✅ ChatGPT Search（OpenAI）
  ✅ Perplexity
  ✅ Anthropic Claude
  ✅ 多個 AI 開發框架（LangChain、LlamaIndex）

  可能很快跟進的：
  🔄 Google（尚未正式支援，但業界預期會）
  🔄 Bing Copilot
```

### llms.txt 與其他標準的關係

```
AI 時代的網站標準生態：

  robots.txt    → 控制爬蟲行為（1994-）
  sitemap.xml   → 列出可索引的 URL（2005-）
  schema.org    → 標記內容的語義（2011-）
  llms.txt      → 為 AI 提供網站導覽（2025-）

四者互補，不是替代關係：

  robots.txt    = 告訴爬蟲「邊度唔去得」
  sitemap.xml   = 告訴搜尋引擎「有乜嘢 URL」
  schema.org    = 告訴 Google 「每個頁面講緊乜」
  llms.txt      = 告訴 AI「網站重點係乜、點樣最有效率咁理解」
```

---

## 總結檢查清單

| 任務 | 說明 |
|------|------|
| ☐ 識別 10-30 個核心頁面 | 用於 llms.txt 的頁面列表 |
| ☐ 為每個頁面撰寫 AI 友好的描述 | 一句話摘要 + 關鍵資訊 |
| ☐ 加入背景資訊區塊 | 品牌簡介、核心數據、營業資訊 |
| ☐ 上傳 llms.txt 到網站根目錄 | 確認可以通過 URL 訪問 |
| ☐ 在 robots.txt 中引用 llms.txt | （可選） |
| ☐ 設定定期更新提醒 | 每季審查一次 |

---

| ← [第 63 章：AI 引用六大內容訊號](/blog/ai-citations) | [回索引](/blog) | [第 65 章：AI SEO 六個月起步路線圖 →](/blog/ai-seo-roadmap) |
