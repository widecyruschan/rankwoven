> Google 唔係唯一嘅搜尋引擎。喺香港，Yahoo 香港（hk.yahoo.com）仍然有一班 35+ 嘅忠實用家；而 Bing 就因為 AI 整合（Microsoft Copilot）喺全球快速崛起。雖然兩者加埋唔夠 Google 一成，但用極低成本就可以攞到呢批流量 — 尤其係唔做就白白送俾競爭對手嘅嗰批。

---

## 香港搜尋引擎市佔現況

```
香港搜尋引擎市佔率（2026 年估算）：

Google        ████████████████████████  ~92-95%
Yahoo 香港     ███                       ~3-6%
Bing          ██                        ~3-5%
其他           █                         1-2%
（其他主要指百度／微信搜一搜，只對做內地客生意嘅港商重要）
```

**重點：** Yahoo 香港仍有 ~3-6% 市佔，特別集中喺 **35 歲以上、習慣用 Yahoo 電郵／新聞入口** 嘅族群；Bing 就靠 Windows + Edge 預設，喺企業電腦同文職用戶入面有穩定份額。兩者加埋大約係一成以下，但：

```
點解仍然值得做？

1. 成本極低
   → 交一次 Bing Webmaster Tools + Sitemap，就可以同時覆蓋 Bing 同 Yahoo 香港
   → 因為 Yahoo 香港用嘅就係 Bing 嘅技術（下面詳講）

2. 呢批用家嘅商業價值唔低
   → Yahoo 香港 35+ 族群，消費力、置業、保險、醫療、教育需求強
   → Bing 用家多係企業／文職／專業人士（B2B 同專業服務特別有用）

3. AI 時代嘅槓桿效應
   → Microsoft Copilot 嘅引用來源 = Bing 搜尋結果
   → ChatGPT 嘅瀏覽功能亦用 Bing 索引
   → 喺 Bing 排得好 = 有機會被 AI 引用，呢個價值遠大於 3-5% 嘅流量本身
```

---

## Part 1：Yahoo 香港 SEO

### Yahoo 香港的搜尋機制（重要！）

```
Yahoo 香港搜尋的技術背景：

香港 Yahoo 搜尋（hk.yahoo.com）→ 使用 Bing 的搜尋引擎技術
（Yahoo 與 Microsoft 自 2009 年起的搜尋合作，全球 Yahoo 搜尋都由 Bing 供結果）

但！Yahoo 香港有自己的：
- 搜尋結果頁面（SERP）排版（Yahoo 風格，同 Bing 唔同）
- Yahoo 香港新聞、Yahoo 香港財經嘅內容整合
- 知識+ 舊內容（已停止新內容，但舊帖仍可能被索引）
- 本地化調整（香港用戶行為、繁中語料唔同）

實務意義：
→ 喺 Bing 排得好嘅網站，喺 Yahoo 香港通常都會排得好
→ 所以你嘅操作重點係「做好 Bing SEO」，Yahoo 香港會自動跟住受惠
→ 但 SERP 外觀同用戶行為唔同，CTR 優化策略都要分開睇
```

### Yahoo 香港 SEO 策略

#### 策略一：Bing Webmaster Tools（優先，必做）

```
因為 Yahoo 香港用 Bing 嘅技術，第一件事就係：

1. 註冊 Bing Webmaster Tools
   https://www.bing.com/webmasters

2. 驗證網站擁有權
   可以直接由 Google Search Console 匯入（Bing 支援從 GSC 導入）
   → 對香港中小企嚟講，呢個係最慳時間嘅做法：5 分鐘搞掂

3. 提交 Sitemap
   → 確保 sitemap.xml 入面係香港版 URL（.hk / /zh-hk/）
   → 如果有 hreflang，Bing 都支援

4. 使用 URL Submission API
   → 比 GSC 更積極通知 Bing 新內容
   → 新聞站、經常更新嘅網店特別有用

⭐ 記住：做完呢 4 步，你已經同時優化咗 Bing 同 Yahoo 香港兩個平台
```

#### 策略二：Yahoo 香港的獨特 SEO 因素

```
與 Google SEO 的關鍵差異：

1. 關鍵字密度仍有一定影響
   → Bing/Yahoo 對關鍵字匹配的重視程度比 Google 稍高
   → 唔係叫你堆砌，但精確關鍵字嘅使用確實有幫助
   → 香港例子：Title 寫「抽濕機推介 2026」好過寫「2026 最值得入手嘅家居好物」

2. 社群訊號權重較高
   → Bing 官方曾表示會考慮社群媒體訊號
   → Facebook 分享、LinkedIn 連結對 Bing/Yahoo 排名有幫助
   → 香港 Facebook 滲透率極高，呢點對香港站特別有利

3. 域名年齡有一定影響
   → Bing/Yahoo 對老域名的信任度高於 Google
   → 新網站在 Bing/Yahoo 的 Sandbox 效應可能更明顯
   → 香港常見情況：老牌 .com.hk 公司網站在 Yahoo 香港排名特別好

4. 多媒體內容加分
   → Bing/Yahoo 對圖片、影片的索引和排名權重更高
   → 香港餐飲/零售/旅遊：圖片 alt 同 YouTube 嵌入特別有效

5. 確切匹配域名（EMD）仍有用（但效果在下降）
   → 精確包含關鍵字的域名在 Bing/Yahoo 還有一定的排名優勢
   → 例如 hkdehumidifier.com.hk 喺 Bing 排「抽濕機」會稍佔優
     （但唔值得為咗呢個去揀一個唔好記嘅域名）
```

#### 策略三：Yahoo 香港搜尋結果的特殊元素

```
Yahoo 香港 SERP 中的獨特元素：

1. 知識+ 舊內容
   → 舊嘅知識+ 內容仍然有機會出現在搜尋結果中
   → 檢查你嘅行業關鍵字有冇被知識+ 舊帖佔據
   → 如果有，就要用更完整、更新嘅內容去爭排名

2. Yahoo 香港新聞整合
   → Yahoo 香港新聞嘅內容會優先顯示
   → 香港主流媒體（香港01、明報、經濟日報、星島、東方、頭條日報）
     嘅報導好多時會被 Yahoo 香港新聞轉載
   → 所以做 Digital PR 上香港媒體，間接都會提升 Yahoo 香港嘅曝光 ⭐

3. Yahoo 香港財經
   → 財經類搜尋（股票、樓市、保險、投資）會整合 Yahoo 財經內容
   → 金融/保險/地產類香港公司要留意呢個版面

4. 本地商家資訊
   → Yahoo 香港有自己的本地商家/生活資訊系統（類似 GBP）
   → 如果你有實體店面（尤其係 35+ 客群嘅行業），建議同時登記
   → 香港 NAP 格式要一致（街道、大廈、室號、九龍/新界/香港島 + 地區）
```

#### Yahoo 香港 SEO 檢查清單

```
☐ 網站在 Bing Webmaster Tools 中驗證（可由 GSC 匯入）
☐ Sitemap 已提交到 Bing（確認係香港版 URL）
☐ Title Tag 包含精確關鍵字（比 Google SEO 更強調精確匹配）
☐ Meta Description 完整且有說服力（Yahoo 較少重寫）
☐ 網站速度正常（Bing/Yahoo 對速度的容忍度比 Google 高）
☐ 圖片有正確的 alt 屬性（含繁中關鍵字）
☐ 社群媒體活躍（Facebook / LinkedIn 對 Bing/Yahoo 的間接影響）
☐ 香港主流媒體曝光（經 Yahoo 香港新聞轉載有加成）
☐ 如適用，在 Yahoo 香港本地商家/生活資訊登記
☐ 價錢標示 HK$、地址用香港格式（本地信任訊號）
```

---

## Part 2：Bing SEO

### 為什麼 2026 年香港都要重視 Bing？

```
Bing 的三大成長動能：

1. Microsoft Copilot（AI 搜尋）
   → Bing 整合咗 Copilot（OpenAI 技術）
   → 係 AI 搜尋時代嘅主要玩家之一
   → Copilot 嘅引用來源 = Bing 搜尋結果嘅內容
   → 喺 Bing 排得好 = 有機會被 Copilot 引用
   → 香港用家（尤其企業／文職）用 Copilot 嘅比例持續上升
     （Windows + Microsoft 365 生態綁定）

2. Windows 預設搜尋引擎
   → 每一部 Windows 電腦嘅 Edge 瀏覽器預設搜尋 = Bing
   → 好多用戶唔會（或者唔識）改做 Google
   → 香港企業／政府／學校嘅 Windows 電腦數量龐大，呢批流量唔少

3. OpenAI 的合作關係
   → ChatGPT 嘅瀏覽功能使用 Bing 搜尋 API
   → 喺 Bing 排得好 = 有機會被 ChatGPT 引用
   → 香港用家常用 ChatGPT、Gemini、Perplexity，
     而呢啲 AI 背後嘅網頁搜尋有唔少走 Bing 索引

⭐ 對香港公司嘅意義：
   Bing 嘅實際香港市佔雖然只有 3-5%，
   但佢係「AI 引用嘅入口」— 價值唔止嗰 3-5% 流量
```

### Bing SEO 與 Google SEO 的關鍵差異

| 維度 | Google SEO | Bing SEO |
|------|-----------|----------|
| 關鍵字匹配 | 語意理解為主（BERT/MUM） | 精確匹配仍有一定權重 |
| 反向連結 | 品質 > 數量 | 品質重要，但數量也重要 |
| 社群訊號 | 不是官方排名因素 | 官方認可的排名因素 |
| 新網站 Sandbox | 有，約 3-6 個月 | 有，可能更長 |
| 多媒體內容 | 重要 | 更重要（Bing 的圖片/影片搜尋更突出） |
| 結構化資料 | 支援 | 支援，且對排名影響更直接 |
| AI 整合 | Google SGE / AI Overviews | Microsoft Copilot |
| 管理工具 | GSC | Bing Webmaster Tools |
| 香港市佔 | ~92-95% | ~3-5%（Yahoo 香港共用同一索引） |

### Bing SEO 實戰策略

#### 1. Bing Webmaster Tools 完整利用

```
Bing Webmaster Tools 的獨有功能：

1. SEO 分析工具（SEO Analyzer）
   → 逐頁掃描 SEO 問題
   → 比 GSC 的建議更詳細（會直接講邊個 tag 有問題）

2. URL 提交 API
   → 比 GSC 的索引請求更積極
   → 適合新聞網站和頻繁更新的內容（香港網店上新、媒體站）

3. 關鍵字研究工具（Keyword Research）
   → Bing 自家的關鍵字數據
   → 可以看到 Bing 用戶的搜尋行為（與 Google 不同）
   → 香港用法：睇吓 Bing 用戶係咪傾向打英文／書面語關鍵字
     （Bing 香港用戶英文搜尋比例通常高過 Google）

4. 反向連結數據
   → Bing 的反向連結報告比 GSC 更完整
   → 可以用來輔助 Google SEO 的連結分析（免費嘅 backlink 工具）

5. 網站掃描（Site Scan）
   → 類似 Screaming Frog 的內建功能
   → 可以快速找到技術 SEO 問題

6. Copilot / AI 表現報表（2025 後陸續推出）
   → 追蹤你嘅內容有冇被 AI 引用
   → 香港做 GEO（生成式引擎優化）必睇
```

#### 2. Bing 的排名因素優化重點

```
標題（Title）：
- Bing 比 Google 更少重寫 Title
- 精確關鍵字放在 Title 的效果比 Google 更明顯
- 香港雙語提示：Bing 香港英文搜尋比例較高
  → 英文版 Title 都要做足（唔好淨係做繁中版）

內容：
- 內容長度和深度的權重略低於 Google
- 但關鍵字的精確使用比 Google 更重要
- 建議自然地在 H1/H2 中出現精確關鍵字
- 香港用語提示：Bing 對繁中語料嘅理解唔及 Google，
  → 標題同 H2 建議用「書面語 + 口語」並行
    （「抽濕機推介（推薦）2026：香港 300 呎單位實測」）

連結：
- 來自 .edu 和 .gov 的連結在 Bing 中權重特別高
- 連結數量仍然是一個明確的排名因素
- 香港可用嘅高權威連結：.edu.hk（大學）、.gov.hk（政府）、
  HKTDC（香港貿發局）、香港旅發局、商會目錄、香港主流媒體

社群：
- 在 Facebook/LinkedIn/Instagram 上的分享和互動
- 對 Bing 的排名有正面影響
- 香港 Facebook 滲透率極高 → 呢點係香港站嘅天然優勢 ⭐
```

#### 3. 利用 Bing 的 AI 功能獲取流量（GEO 重點）

```
Microsoft Copilot / ChatGPT 瀏覽嘅引用策略：

當用戶喺 Copilot 或者 ChatGPT（開瀏覽）提問時，
兩者都會引用 Bing 搜尋結果入面嘅內容。
你的目標係令你嘅內容被 AI 引用。

被 Copilot 引用的內容特徵：
1. 結構清晰（H2/H3 分明、列表格式）
2. 權威度高（引用來源、作者背書）
3. 內容直接回答問題（唔需要用戶再點入去先知答案）
4. 資料是最新的（時效性）

香港實用範例：
  問題：「香港 2026 年買樓按揭邊間銀行好？」
  → 內容要有比較表（銀行、P按/H按、利率、現金回贈）
  → 資料寫明更新日期（「2026 年 9 月更新」）
  → 引用來源（金管局、銀行官網）
  → 加 FAQ Schema
  → 呢類內容好容易被 Copilot/AI Overviews 引用

優化策略：
→ 在文章中加入「直接答案」段落（開頭 100 字內答完）
→ 使用 FAQ Schema（Copilot 會參考結構化資料）
→ 確保內容日期是最新的
→ 喺 Bing Webmaster Tools 中積極提交新內容
→ 加 authors/expertise 資訊（E-E-A-T，AI 偏好有來源嘅內容）
```

---

## Yahoo 香港 + Bing 的 ROI 分析

### 值得花多少時間？

```
如果你的網站：
- 月有機流量 < 10,000：花 5% SEO 時間在 Bing/Yahoo
  → 主要是設定 Bing Webmaster Tools + Sitemap 提交（一次過）
  → 快速檢查 Bing 中的排名和索引狀態（每季一次）

- 月有機流量 10,000-100,000：花 10% SEO 時間
  → 定期檢查 Bing 關鍵字排名
  → 有針對性地優化對 Bing/Yahoo 重要的訊號（精確關鍵字、社群訊號）
  → 利用 Bing Webmaster Tools 的獨有數據輔助 Google SEO（免費 backlink 數據）

- 月有機流量 > 100,000：花 15% SEO 時間
  → Bing/Yahoo 的額外流量非常可觀
  → 製作 Bing 專屬的內容策略
  → 追蹤 Copilot 引用情況（GEO KPI）

- 目標用戶係 35 歲以上香港用戶（保險、醫療、地產、教育、家居裝修）：
  值得花 15-20% 時間
  → Yahoo 香港喺呢個族群嘅市佔特別高
  → 放棄 Yahoo 等於直接放棄呢班客

- B2B / 專業服務 / 金融：
  值得花 10-15% 時間
  → Bing 喺企業 Windows 環境嘅份額遠高於消費市場
  → 而且 LinkedIn 訊號對 Bing 有用（B2B 內容本身就有 LinkedIn 擴散）
```

---

## 本章重點回顧

| 平台 | 市佔（香港） | 核心工具 | 關鍵差異 |
|------|-------------|----------|----------|
| Yahoo 香港（hk.yahoo.com） | ~3-6% | Bing Webmaster Tools | 用 Bing 技術、35+ 用戶多、香港新聞/財經整合、本地商家 |
| Bing | ~3-5% | Bing Webmaster Tools | 精確關鍵字重要、社群訊號、Copilot/ChatGPT AI 引用 |

**香港三引擎 SEO 最低配置：**

```
所有人都該做的 ☐：
☐ Google Search Console 驗證（主力，~92-95% 市佔）
☐ Bing Webmaster Tools 驗證 + 從 GSC 匯入
☐ Sitemap 同時提交到兩個平台
☐ 兩個平台都檢查索引狀態
☐ 確認提交嘅係香港版 URL（.hk / /zh-hk/ / /en-hk/）
☐ 喺 Bing Webmaster Tools 開啟 URL Submission API（如內容更新頻繁）

香港額外建議 ☐：
☐ 確保 NAP 同香港地址格式一致（GBP + Yahoo 本地 + OpenRice）
☐ Facebook 專頁活躍（對 Bing/Yahoo 排名有正面影響）
☐ 爭取 .edu.hk / .gov.hk / HKTDC / 香港主流媒體連結（Bing 權重特別高）
```

> 💡 **Bing 正透過 AI 重新崛起，而 Yahoo 香港食嘅就係 Bing 嘅索引。2026 年嘅香港 SEO 唔可以淨係睇 Google — 一個好嘅策略係「Google 為主，Bing/Yahoo 為輔」嘅三引擎策略：交一次 Bing Webmaster Tools，就同時cover 埋 Yahoo 香港同 AI 引用入口，成本極低但唔做就白白送俾對手。**

---

> ⬅️ [上一章：第 83 章 香港社群 SEO（LIHKG/連登/Uwants）](/blog/taiwan-social-seo) | [回索引](/blog) | [下一章：第 85 章 SEO 常見問題 FAQ 全集](/blog/seo-faq) ➡️
