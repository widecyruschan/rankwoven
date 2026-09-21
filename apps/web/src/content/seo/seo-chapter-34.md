---

## 技術 SEO 的全景圖

技術 SEO 是 SEO 三大支柱（技術、內容、連結）中最基礎的一環。沒有良好的技術基礎，再好的內容也可能無法被搜尋引擎發現、爬取和索引。

本章將 Part 5 的 10 個章節整合為一套可操作的總覽與檢查清單，幫助你用系統化的方式確保網站的技術 SEO 健康度。

---

## 香港市場：技術 SEO 的地區前提

喺開始做檢查之前，先搞清楚香港網站嘅技術 SEO 有咩唔同：

### 香港搜尋引擎份額（2026 估算）

```
Google        ████████████████████████  ~92-95%   ← 絕對主導（mobile + desktop）
Bing          ██                         ~3-5%     ← Edge/Windows 預設；AI 時代因 Copilot 重要
Yahoo 香港     ███                        ~3-6%     ← 仍有一定份額，尤其 35+ 用家
小紅書 RED     █                         新興      ← 香港年輕人重要「發現/搜尋」入口
其他           █                         1-2%     ← 百度/微信（只對做內地客重要）
```

**對技術 SEO 嘅直接影響：**

| 結論 | 行動 |
|------|------|
| **Google 為主** | GSC 係核心工具，所有技術設定以 Googlebot 為準 |
| **Bing 為輔但必做** | 一定要去 **Bing Webmaster Tools** 提交 Sitemap 同驗證網站——Yahoo 香港（hk.yahoo.com）用 Bing 索引，ChatGPT 搜尋同 Microsoft Copilot 亦用 Bing |
| **AI 爬蟲要放行** | robots.txt 要容許 `OAI-SearchBot`、`Claude-SearchBot`、`PerplexityBot`，否則 AI 搜尋唔會引用你（第 29 章） |
| **香港雙語** | 繁中 + 英文網站要用 **hreflang zh-HK / en-HK**；唔好用 canonical 將英文版指去中文版（第 30 章） |
| **本地伺服器 / CDN** | 香港或亞洲節點 + Cloudflare，壓低 TTFB，直接影響 Crawl Budget 同 Core Web Vitals |
| **百度唔係主場** | 除非你做內地 / 大灣區生意，否則唔使為 Baiduspider 做特別優化 |

---

## 技術 SEO 的五大核心目標

```
1. 可發現（Discoverability）→ 搜尋引擎知道你的頁面存在
   ├─ Sitemap（第 28 章）
   └─ 內部連結（第 23 章）

2. 可爬取（Crawlability）→ 搜尋引擎能順利爬取你的頁面
   ├─ robots.txt（第 29 章）
   ├─ Crawl Budget 優化（第 33 章）
   └─ 網站速度（第 25 章）

3. 可索引（Indexability）→ 搜尋引擎將你的頁面納入索引
   ├─ Meta Robots noindex（第 29 章）
   ├─ Canonical 標記（第 30 章）
   ├─ HTTP 狀態碼（第 32 章）
   └─ 行動優先索引（第 27 章）

4. 可渲染（Renderability）→ 內容被正確渲染和呈現
   ├─ JavaScript SEO（第 33 章）
   ├─ Core Web Vitals（第 26 章）
   └─ RWD 響應式設計（第 27 章）

5. 安全性（Security）→ 網站安全影響排名和信任
   ├─ HTTPS / SSL（第 31 章）
   └─ HSTS 設定（第 31 章）
```

---

## 技術 SEO 優先級矩陣

並非所有技術 SEO 任務都有同等級的重要性。以下按影響力與修復難度排列優先級：

### 🔴 P0 — 嚴重問題，立即修復（排名直接受影響）

| 問題 | 影響 | 解決方案 |
|------|------|----------|
| 網站無法被 Google 索引 | 整個網站從搜尋結果消失 | 檢查 robots.txt 是否有 `Disallow: /`；檢查 noindex 標籤 |
| HTTPS 憑證過期 | 瀏覽器顯示「不安全」警告，訪客大量流失 | 立即續期 SSL 憑證，設定自動續期 |
| 全站 5xx 伺服器錯誤 | Googlebot 無法訪問，排名急降 | 檢查伺服器狀態，優先恢復 |
| 重要頁面 404 | 失去排名和流量 | 301 重定向或恢復頁面 |
| Canonical 標記全部指向首頁 | 所有內容頁面無法索引 | 修復 canonical 標籤設定 |
| 香港分店頁 / 服務頁全部 canonical 去首頁 | 本地搜尋流量全失 | 改為 self-referencing canonical |

### 🟠 P1 — 重要問題，排程修復（間接影響排名）

| 問題 | 影響 | 解決方案 |
|------|------|----------|
| 網站速度慢（LCP > 4s） | 排名和轉換率下降 | 圖片壓縮、快取、CDN、程式碼優化 |
| CLS > 0.25（視覺不穩定） | 使用者體驗差，可能影響排名 | 設定圖片/廣告尺寸預留空間 |
| 孤立頁面（無內部連結） | 無法被 Google 發現 | 加入內部連結網路 |
| 重複內容未處理 | PageRank 分散 | 設定 canonical 或 301 |
| 行動版體驗差 | 行動搜尋排名下降（Mobile-First Index） | 改用 RWD 設計 |
| Sitemap 未提交或過時 | 新內容發現延遲 | 更新並提交 GSC |
| **未向 Bing Webmaster Tools 提交 Sitemap** | 錯過 Yahoo 香港 + ChatGPT/Copilot 流量 | 立即驗證並提交 |
| 雙語網站缺 hreflang | 英文版唔會喺英文搜尋出現 | 加 zh-HK / en-HK hreflang |

### 🟡 P2 — 建議優化（提升效率，長期競爭力）

| 問題 | 影響 | 解決方案 |
|------|------|----------|
| Crawl Budget 浪費在低價值頁面 | 重要頁面爬取頻率降低 | robots.txt 阻止無效 URL |
| 圖片未壓縮 | 頁面載入較慢 | WebP 格式、懶載入 |
| 結構化資料未設定 | 錯過 Rich Results 機會 | 加入 Schema Markup（第 24 章） |
| HTTP/2 未啟用 | 多資源載入效率低 | 啟用 HTTP/2（需 HTTPS） |
| 無 HSTS Header | 安全性略低 | 設定 HSTS |
| Log File 未分析 | 不了解 Googlebot 行為 | 定期 Log 分析 |
| AI 搜尋爬蟲被擋 | AI Overviews / ChatGPT 唔會引用你 | 放行 OAI-SearchBot、PerplexityBot |

---

## 技術 SEO 月度檢查清單

### 每週檢查（5 分鐘）

| 任務 | 工具 | 說明 |
|------|------|------|
| ☐ 查看 Search Console 錯誤報告 | GSC | 是否有新的 404、500、重定向錯誤 |
| ☐ 檢查 SSL 憑證到期日 | 瀏覽器 | 距離到期少於 30 天需續期 |
| ☐ 確認網站正常載入 | 手動測試 | 首頁和重要頁面能正常打開 |

### 每月檢查（30 分鐘）

| 任務 | 工具 | 說明 |
|------|------|------|
| ☐ 全站爬取 | Screaming Frog | 檢查所有頁面的 HTTP 狀態碼 |
| ☐ Core Web Vitals 報告 | PageSpeed Insights / GSC | 檢查 LCP、INP、CLS 指標 |
| ☐ Sitemap 狀態 | GSC | 確認提交成功，已索引比例 |
| ☐ Bing Webmaster Tools 狀態 | BWT | 確認 sitemap 已提交、無爬取錯誤 |
| ☐ robots.txt 檢查 | GSC robots.txt 測試器 | 確認規則正確，無意外阻擋 |
| ☐ Canonical 檢查 | Screaming Frog | 確認 canonical 標籤存在且正確 |
| ☐ 檢查新內容是否被索引 | GSC URL 檢查 | 輸入新發布的 URL 測試 |
| ☐ 行動可用性報告 | GSC | 檢查是否有行動版問題 |

### 每季檢查（2 小時）

| 任務 | 工具 | 說明 |
|------|------|------|
| ☐ Log File 分析 | Screaming Frog Log Analyser | 分析 Googlebot / Bingbot / AI 爬蟲行為 |
| ☐ 網站速度全面審計 | PageSpeed Insights + GTmetrix | 針對所有重要頁面做速度測試（用香港 / 新加坡節點測） |
| ☐ 結構化資料驗證 | Rich Results Test | 確認 Schema Markup 有效 |
| ☐ HTTPS 安全標頭檢查 | Security Headers | 檢查 HSTS、CSP 等安全標頭 |
| ☐ hreflang 檢查 | Screaming Frog / GSC 國際目標設定 | 繁中 zh-HK 與英文 en-HK 對應正確 |
| ☐ 競爭對手技術 SEO 對比 | 手動分析 | 對手（同類香港網站）是否在某方面明顯優於自己 |

---

## 技術 SEO 工具工具箱

### 必備免費工具

| 工具 | 用途 | 使用頻率 |
|------|------|----------|
| **Google Search Console** | 索引狀態、Core Web Vitals、錯誤監控 | 每週 |
| **Bing Webmaster Tools** | Bing / Yahoo 香港索引、SEO 報告、AI 搜尋可見度 | 每月 |
| **PageSpeed Insights** | 頁面速度分析 | 每月 |
| **Chrome DevTools** | 即時檢查 HTTP 狀態、Network、Lighthouse | 隨時 |
| **Rich Results Test** | 結構化資料驗證 | 新增 Schema 時 |
| **robots.txt Tester（GSC 內建）** | robots.txt 驗證 | 修改規則時 |
| **XML Sitemap Validator** | Sitemap 語法檢查 | 更新 Sitemap 時 |

### 推薦付費工具

| 工具 | 獨特優勢 | 適合 | 香港參考價格 |
|------|----------|------|--------------|
| **Screaming Frog SEO Spider** | 最全面的技術 SEO 爬取工具 | 所有網站 | ~HK$1,500/年 |
| **Ahrefs Site Audit** | 自動化定期審計 + 問題優先級排序 | 中大型網站 | ~HK$1,000+/月 |
| **Semrush Site Audit** | 類似 Ahrefs，介面友善 | 中大型網站 | ~HK$1,050+/月 |
| **Botify** | 企業級 Log 分析 + Crawl Budget 優化 | 大型內容/電商網站 | 企業報價 |
| **DeepCrawl / Lumar** | 雲端全站爬取 + 歷史趨勢分析 | 企業級網站 | 企業報價 |

---

## 常見技術 SEO 錯誤模式

### 模式 1：新網站忘了改 robots.txt
開發或測試環境設定 `Disallow: /` 阻止所有爬蟲，但上線時忘了移除。
→ **後果：整個網站無法被索引。**
→ **確認：** 上線後立即檢查 `robots.txt`。

> **香港常見：** 網站喺香港嘅設計公司手上完成，staging 放喺 `staging.clientname.com.hk`，上線時淨係改 DNS，忘記改 robots.txt。結果網站開咗三個月，Google 一頁都冇收。

### 模式 2：HTTP → HTTPS 遷移不完整
設定了 301 但內部連結、Sitemap、Canonical 仍然指向 HTTP。
→ **後果：** 部分頁面出現 Mixed Content 警告，排名訊號混亂。
→ **確認：** 全站爬取檢查是否仍有 HTTP 版本 URL。

### 模式 3：Staging 環境被索引
測試環境被 Google 索引，與正式站產生重複內容競爭。
→ **後果：** 重複內容問題，混亂的搜尋結果。
→ **解決：** Staging 環境加入密碼保護 + `Disallow: /` + `noindex`。

### 模式 4：過度依賴 JavaScript
所有內容依賴 JS 渲染，但 Google 的 JS 渲染有延遲。
→ **後果：** 新內容需要數天甚至數週才被完整索引。
→ **解決：** 改用 SSR 或 SSG，至少在 `<head>` 和關鍵內容區塊預先輸出。

### 模式 5：URL 參數爆炸
電商網站每個篩選組合都產生獨立 URL，生成數萬個重複頁面。
→ **後果：** Crawl Budget 耗盡，重要產品頁無法被及時爬取。
→ **解決：** Canonical + robots.txt 禁止參數 URL + GSC 網址參數設定。

### 模式 6：香港常見 — 分店頁 / 地區頁內容複製貼上
連鎖店為 18 區每區開一頁，內容九成相同只改地區名（「尖沙咀 補習社」→「旺角 補習社」）。
→ **後果：** Google 視為近乎重複內容，全部頁面排名都弱。
→ **解決：** 每頁加入真正獨特內容（該區導師 / 分店相片 / 交通資訊 / 該區家長評價）；無獨特內容就合併做一頁分店總覽，其餘 301 過去。

### 模式 7：香港常見 — 雙語網站用錯 canonical
將英文版 canonical 指向繁中版，「等 Google 淨係收一篇」。
→ **後果：** 英文關鍵字（例如 "accounting firm Hong Kong"）完全冇曝光。
→ **解決：** 語言版本之間用 **hreflang（zh-HK / en-HK）**，兩邊各自 self-referencing canonical。

### 模式 8：香港常見 — 只照顧 Google，忽略 Bing
淨係交 GSC，冇交 Bing Webmaster Tools。
→ **後果：** 錯過 Yahoo 香港（35+ 族群）＋ ChatGPT 搜尋 / Copilot 嘅引用機會。
→ **解決：** 一次過驗證 Bing Webmaster Tools，唔使額外成本。

---

## Part 5 知識體系回顧

### 你現在掌握的技術 SEO 能力

| 能力 | 關鍵知識點 |
|------|-----------|
| **讓網站被發現** | Sitemap 製作與提交（XML / 圖片 / 影片 / 新聞）；GSC + Bing WMT 雙提交 |
| **控制爬蟲行為** | robots.txt 語法、Meta Robots、X-Robots-Tag、AI 爬蟲管理（訓練型 vs 搜尋型） |
| **解決重複內容** | Canonical（6 種方式）、301 重定向、Sitemap URL 一致性、hreflang |
| **優化網站速度** | LCP/INP/CLS 診斷、圖片壓縮、CDN、快取、TTFB、香港/亞洲節點 |
| **確保行動友好** | Mobile-First Indexing、RWD、行動版 SEO 檢查 |
| **JS 網站 SEO** | SSR/SSG/CSR 選擇、Google 兩階段索引、Crawl Budget |
| **保障網站安全** | SSL 憑證（DV/OV/EV）、HTTP→HTTPS 遷移、HSTS、Mixed Content、PDPO |
| **管理狀態碼** | 301/302 選擇、404 策略、重定向鏈、Soft 404 避免 |
| **監控與診斷** | Log File 分析、GSC、Screaming Frog、PageSpeed Insights |

---

## 從技術 SEO 到內容 SEO

技術 SEO 確保了你的網站「能被找到、能被爬取、能被索引、能被渲染」。這是地基。

下一部分（**Part 6：內容 SEO**）將在此基礎上建設真正的價值：創造搜尋引擎想要排名、使用者想要閱讀的高品質內容。沒有好的內容，再完美的技術基礎也只是空殼。

> **香港提醒：** 香港市場細（人口約 750 萬），競爭對手嘅技術水平普遍唔高——只要你認真做好呢份技術清單，就已經贏咗大半條街。但真正拉開差距嘅，始終係「香港人想睇嘅內容」。

---

| ← [第 33 章：JavaScript SEO 與 Log File 分析](/blog/javascript-seo-log-analysis) | [回索引](/blog) | [第 35 章：內容行銷與 SEO 的戰略整合 →](/blog/content-marketing-seo) |
