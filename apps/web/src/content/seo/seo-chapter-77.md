> 網站上線後先發現 SEO 問題，就好似樓起到頂先發覺冇鋪水喉 — 改得切，但代價大多了。
>
> 香港網站仲有幾樣嘢要額外留意：`.hk` 域名、中英雙語 hreflang、Bing Webmaster Tools（Yahoo 香港用 Bing 索引）、Google 商家檔案、本地引用平台（OpenRice、HKTDC）同 PDPO 私隱合規。呢啲一漏咗，返手尾會好煩。

---

## 為什麼上線前檢查這麼重要？

一個新網站在上線前做好 SEO 設定，可以避免：
- 上線後被 Google 索引了錯誤的 URL（例如索引咗 test.example.hk）
- 整個網站被 noindex 封鎖好幾天才發現
- 重複內容問題從第一天就存在（繁中／英文／簡中互相打架）
- 上線第一週流量就是 404
- 網站速度慢到 Google 不願爬取
- 香港用戶用手機開你個網站，結果 3 秒都未出畫面就走咗

**核心原則：SEO 不是上線後才做的事，而是開發階段就要內建的。**

---

## 檢查清單總覽（六大類別）

```
📋 新網站上線前 SEO 檢查清單（香港版）

1. 技術基礎設定（10 項）
2. 索引與爬取（7 項）
3. On-Page SEO 設定（8 項）
4. 內容與結構（6 項）
5. 效能與體驗（5 項）
6. 追蹤與分析（5 項）
────────────────────
共計 41 項檢查
＋ 香港專屬加檢項目 8 項（見文末）
```

---

## 類別一：技術基礎設定（10 項）

```
☐ 1.1 SSL 憑證已正確安裝
   檢查：https:// 可以正常訪問，無 Mixed Content 警告
   工具：Why No Padlock (whynopadlock.com)
   🇭🇰 香港用戶對「網站唔安全」警告特別敏感，
      一見紅色警告即刻走人

☐ 1.2 強制 HTTPS 轉址
   檢查：http:// 自動 301 轉到 https://
   確認：不是 302！301 才能傳遞 SEO 權重

☐ 1.3 WWW vs non-WWW 已決定並統一
   選擇一個（建議 non-WWW），另一個 301 轉址
   例：www.example.hk → 301 → example.hk

☐ 1.4 網址尾部斜線（Trailing Slash）統一
   決定：/about 或 /about/，另一個 301 轉址
   整個網站保持一致

☐ 1.5 自訂 404 頁面存在且有效
   檢查：訪問不存在的 URL（如 /test-404-page）
   確認：返回 404 HTTP 狀態碼（不是 200 或軟 404）
   確認：404 頁面有導航連結，幫助使用者回到正常頁面
   🇭🇰 建議 404 頁提供繁中 + 英文提示，並放 WhatsApp
      聯絡／搜尋框

☐ 1.6 無測試/開發環境外洩
   檢查：staging.example.hk 沒有被 Google 索引
   確認：開發環境有密碼保護或 IP 限制
   確認：robots.txt 沒有在正式環境誤用了開發環境的設定

☐ 1.7 URL 結構符合 SEO 規範
   ❌ example.hk/?p=123
   ✅ example.hk/blog/seo-guide
   使用連字號（-）而非底線（_）分隔單字
   多語言建議：example.hk/zh-hk/、/en-hk/、/zh-cn/
   或 en.example.hk 子網域

☐ 1.8 HTML 語意標籤正確使用
   每個頁面只有一個 <h1>
   正確使用 <header> <main> <footer> <article> <nav>
   圖片有正確的 alt 屬性
   確認 <html lang="zh-HK">（唔好寫 zh-TW 或 zh-CN）

☐ 1.9 結構化資料（Schema Markup）已實作
   至少包含：Organization / WebSite / BreadcrumbList
   本地商家加：LocalBusiness（含香港地址、電話）
   使用 Google 結構化資料測試工具驗證無錯誤
   https://search.google.com/test/rich-results

☐ 1.10 XML Sitemap 自動生成並正確
   包含所有重要頁面
   不包含 noindex 頁面、404 頁面、重定向頁面
   每個 URL 的 <lastmod> 日期正確
   多語言網站：為每個語言版本建立獨立 Sitemap
   或用 Sitemap Index 串連
```

---

## 類別二：索引與爬取設定（7 項）

```
☐ 2.1 robots.txt 設定正確
   最常見的錯誤：上線時 robots.txt 還是 Disallow: /
   （開發環境用來防止被索引的設定忘了改回來！）

   檢查：
   - 沒有誤封重要頁面
   - Sitemap 路徑在 robots.txt 中有宣告
   - 測試：Google robots.txt 測試工具
   - 容許 AI 搜尋爬蟲（GPTBot / OAI-SearchBot /
     ClaudeBot / PerplexityBot / Google-Extended）

☐ 2.2 無 noindex 標籤殘留
   搜尋整個網站代碼中的 "noindex"
   確認只在該 noindex 的頁面出現（如後台、感謝頁）
   常見失誤：開發時全站 noindex，上線忘了移除

☐ 2.3 Canonical 標籤正確
   每個頁面有 self-referencing canonical
   分頁/篩選頁面的 canonical 指向主頁面
   無跨域 canonical 錯誤

☐ 2.4 無意外的 nofollow 連結
   檢查導航選單中的內部連結不是 nofollow
   內部連結應該是 dofollow（讓權重流通）
   外鏈（如廣告、付費合作）才用 sponsored / nofollow

☐ 2.5 GSC 資源已建立並驗證
   建立「網域資源」（涵蓋所有子網域）
   完成 DNS 驗證
   ⚠️ 帳號要用你公司名義開，唔好用代理／設計公司名義

☐ 2.6 Sitemap 已提交到 GSC
   GSC → 索引 → Sitemap → 提交 Sitemap URL
   確認狀態為「成功」

☐ 2.7 重要頁面手動請求索引
   首頁、主要分類頁、重要內容頁
   GSC → 網址檢查 → 輸入 URL → 請求建立索引
```

---

## 類別三：On-Page SEO 設定（8 項）

```
☐ 3.1 每個頁面有獨特的 Title Tag
   格式：[主要關鍵字] — [次要關鍵字] | [品牌名稱]
   長度：50-60 字元（中文約 25-30 字）
   檢查：無重複 Title
   🇭🇰 香港用戶搜尋常用粵語口語（「邊間好」「推介」
      「點揀」「平唔平」），Title 可適度加入

☐ 3.2 每個頁面有獨特的 Meta Description
   長度：150-160 字元（行動版約 120 字元）
   包含 CTA 或價值主張
   不是「歡迎來到我們的網站」這種無意義描述
   建議加入 HK$ 價錢或地區名提升點擊

☐ 3.3 圖片 SEO 基礎
   所有圖片有描述性的檔案名稱（seo-checklist-2026.png
   而非 IMG_001.png）
   所有內容圖片有 alt 屬性（繁中描述）
   純裝飾性圖片 alt=""（空字串）
   圖片有壓縮（WebP 格式優先）

☐ 3.4 行動版 Meta Viewport 已設定
   <meta name="viewport" content="width=device-width, initial-scale=1.0">

☐ 3.5 Open Graph 標籤（社交分享用）
   og:title, og:description, og:image, og:url
   og:locale 設為 zh_HK
   使用 Facebook Sharing Debugger 測試
   （香港 Facebook 滲透率極高，分享預覽一定要靚）

☐ 3.6 Twitter Card 標籤（同時影響 Threads / X 分享）
   twitter:card, twitter:title, twitter:description, twitter:image

☐ 3.7 Favicon 和 Apple Touch Icon 已設定
   Favicon 影響品牌辨識
   Apple Touch Icon 影響 iOS 主畫面書籤體驗
   🇭🇰 香港 iPhone 滲透率極高，Apple Touch Icon 唔可以漏

☐ 3.8 麵包屑導航（Breadcrumb）已實作
   加上 BreadcrumbList Schema
   格式：首頁 > 分類 > 子分類 > 當前頁面
```

---

## 類別四：內容與結構（6 項）

```
☐ 4.1 無 Lorem Ipsum 或測試內容殘留
   搜尋整個網站：lorem ipsum、測試、test、placeholder
   這是最基本但最常被忘記的！
   同時搜尋有冇殘留嘅中國大陸／台灣用語（視目標市場）

☐ 4.2 所有連結正常運作
   使用 Screaming Frog 爬取整個網站
   確認無 Broken Link（內部 404）
   確認所有外部連結可以正常打開

☐ 4.3 導航結構清晰
   主要導航：不超過 7 個項目
   深度：重要頁面不超過 3 次點擊
   手機版導航體驗良好

☐ 4.4 首頁有明確的價值主張
   使用者 3 秒內知道你的網站是做什麼的
   H1 清楚描述網站主題
   香港用戶偏好：清楚嘅 HK$ 價錢、服務地區、聯絡方式

☐ 4.5 聯絡資訊完整（特別是商業網站）
   關於我們頁面存在
   聯絡方式清晰（香港格式：地址、電話 +852、WhatsApp）
   隱私權政策頁面存在（符合 PDPO《個人資料（私隱）條例》）
   服務條款頁面存在
   香港地址格式：室號/樓層、大廈名、街道、地區
   + 香港/九龍/新界（例：香港中環德輔道中 100 號 10 樓）

☐ 4.6 無空白頁面
   檢查所有頁面都有實際內容
   無「敬請期待」或「施工中」頁面
   繁中／英文／簡中版本不能只翻一半就上線
```

---

## 類別五：效能與體驗（5 項）

```
☐ 5.1 Core Web Vitals 達標
   桌面版和行動版都測試
   工具：PageSpeed Insights
   目標：
   - LCP（最大內容繪製）< 2.5 秒
   - INP（互動至下一次繪製）< 200 毫秒
   - CLS（累計版面配置轉移）< 0.1
   🇭🇰 以香港流動網絡（4G/5G）實測為準，
      唔好淨係用公司 Wi-Fi 測

☐ 5.2 行動版體驗通過測試
   工具：Google 行動裝置相容性測試
   確認：文字可讀、按鈕可點、無橫向捲動
   🇭🇰 香港手機流量普遍佔 70-85%，行動版係主戰場

☐ 5.3 圖片使用現代格式與延遲載入
   WebP 格式優先（支援率高且有後備方案）
   非首屏圖片使用 loading="lazy"
   有正確的 width/height 屬性（避免 CLS）

☐ 5.4 快取策略已設定
   靜態資源（CSS/JS/圖片）有合理的快取時間
   使用 CDN（強烈建議）
   🇭🇰 選有香港／亞太節點嘅 CDN（Cloudflare、
      AWS CloudFront 東京/新加坡、阿里雲香港）

☐ 5.5 伺服器回應時間正常
   TTFB（Time to First Byte）< 800ms
   工具：WebPageTest 或 KeyCDN Tools
   建議：主機選香港或亞洲機房（延遲明顯較低）
```

---

## 類別六：追蹤與分析（5 項）

```
☐ 6.1 GA4 追蹤代碼正確安裝
   確認所有頁面都有 GA4 代碼
   確認即時報表中看到自己的訪問
   GA4 中設定排除內部流量（公司 IP）
   資源設定：時區 = 亞洲/香港，貨幣 = HKD

☐ 6.2 GA4 轉換事件已設定
   確認重要動作已設為轉換事件：
   - 表單提交
   - 購買完成
   - 註冊完成
   - 重要按鈕點擊
   🇭🇰 香港必設：WhatsApp 點擊、電話點擊（tel:）、
      Google Maps 導航點擊

☐ 6.3 GSC 與 GA4 已連結
   GA4 → 管理員 → 產品連結 → Search Console 連結
   確認數據開始出現在 GA4 的有機搜尋報表中

☐ 6.4 搜尋引擎以外的流量來源追蹤
   社群媒體連結加上 UTM 參數
   建立 UTM 命名規範文件
   （香港渠道：facebook / instagram / xiaohongshu /
     lihkg / threads / edm）

☐ 6.5 網站監控已設定
   確認網站正常運作（uptime 監控）
   設定異常通知（Email / Slack）
   建議監控點包含香港節點
```

---

## 香港專屬加檢項目（8 項）

```
☐ HK-1 域名與 ccTLD 已確定
   選擇 .hk / .com.hk（本地信任度高）或 .com
   （做國際生意）
   確認 HKIRC 註冊資料正確、開啟轉移鎖、到期日已記低
   如果同時有 .com 同 .hk，要決定邊個係主域，
   另一個 301 轉過去

☐ HK-2 hreflang 已正確設定（多語言網站必檢）
   zh-HK（繁中香港）/ en-HK（英文香港）/
   zh-CN（簡中，做內地客）
   每個版本要互相指向（含自我指向），並加 x-default
   檢查工具：GSC 國際目標設定 / hreflang 檢查工具

☐ HK-3 Bing Webmaster Tools 已設定
   提交 Sitemap（Yahoo 香港 ~3-6% 份額用 Bing 索引）
   亦係 Microsoft Copilot / ChatGPT 搜尋嘅索引來源
   Bing WMT 可以免費匯入 GSC 資料，幾分鐘搞掂

☐ HK-4 Google 商家檔案（GBP）已建立/認領
   本地商家必做：地址、電話（+852）、營業時間、
   分類、相片
   NAP（名稱/地址/電話）要與網站完全一致
   確認未被人搶先建立重複資料

☐ HK-5 本地引用平台已檢查（視行業）
   餐飲 → OpenRice（香港餐飲龍頭，必爭）
   旅遊/酒店 → TripAdvisor
   本地服務 → HKTDC、香港中華總商會、商會目錄、黃頁
   確認商戶資料（尤其地址電話）與網站一致

☐ HK-6 PDPO 私隱合規已就位
   若有收集個人資料（表單、會員、評論、Cookie）：
   - 私隱政策頁清楚列明收集目的、資料類別、保留期
   - Cookie Banner / Consent Mode 已設定
   - 提供查閱及更正資料嘅途徑
   參考：個人資料私隱專員公署（PCPD）指引

☐ HK-7 香港常用聯絡與付款方式已標示
   WhatsApp Business 連結、+852 電話、香港地址
   付款方式：PayMe / FPS 轉數快 / 支付寶HK /
   WeChat Pay HK / 信用卡 / 八達通（視業務）
   價錢一律標 HK$，並列明是否已包其他費用
   （消委會指引）

☐ HK-8 內容用語與地區元素已確認
   繁體中文（香港用法），避免台式／大陸用語
   專業／金融／科技內容可中英夾雜（自然即可）
   內容已加入香港元素：HK$ 價錢、18 區地區名、
   本地例子、本地法規
   Open Graph 分享圖唔好淨係簡中字
```

---

## 上線日（Launch Day）最終確認

```
上線前 1 小時：
☐ 1. 再次檢查 robots.txt 不是 Disallow: /
☐ 2. 再次檢查首頁和主要頁面沒有 noindex
☐ 3. 快速瀏覽網站 5 分鐘（用手機和電腦）
☐ 3b. 用手機實測 WhatsApp / 電話按鈕（香港主要 CTA）

上線後立即：
☐ 4. 提交 Sitemap 到 GSC
☐ 4b. 提交 Sitemap 到 Bing Webmaster Tools
☐ 5. 手動請求首頁和主要頁面建立索引
☐ 6. 測試 GA4 即時報表（確認看得見自己的訪問）

上線後 24 小時：
☐ 7. 檢查 GSC 索引狀態（是否開始有頁面被索引）
☐ 8. 搜尋 site:example.hk 看 Google 索引了哪些頁面
☐ 9. 檢查伺服器 Log（有沒有異常的錯誤）

上線後 7 天：
☐ 10. 檢查 Google 索引了哪些頁面，有沒有遺漏或錯誤
☐ 10b. 到 Yahoo 香港（hk.yahoo.com）搜尋 site: 確認
       Bing 索引情況
☐ 11. 第一次完整成效報表（GSC 曝光/點擊）
☐ 12. 檢查 GA4 數據是否正常（無異常跳動）
☐ 13. 確認 GBP 網站連結已更新、本地平台資料一致
```

---

## 本章重點回顧

| 類別 | 檢查數 | 最常見的遺漏 |
|------|--------|-------------|
| 技術基礎 | 10 項 | SSL/HTTPS 設定不完整 |
| 索引爬取 | 7 項 | robots.txt 封鎖全站忘記改 |
| On-Page SEO | 8 項 | Title/Meta Description 重複或空白 |
| 內容結構 | 6 項 | Lorem Ipsum 殘留 |
| 效能體驗 | 5 項 | 行動版未優化 |
| 追蹤分析 | 5 項 | GA4 轉換事件未設定 |
| 香港專屬 | 8 項 | hreflang 未設、Bing WMT 未提交、GBP 未認領 |

> 💡 **把這份清單印出來。每次新網站上線前，逐項打勾。不跳過任何一項。**
>
> 香港網站記得打埋最尾嗰 8 項 — 呢啲通常就係「上線三個月後先發現唔對路」嘅元兇。

---

> ⬅️ [上一章：第 76 章 SEO 團隊角色與技能配置](/blog/seo-team) | [回索引](/blog) | [下一章：第 78 章 網站改版搬家 SEO 完整 SOP](/blog/website-redesign-migration) ➡️
