# RankWoven 第二階段 AI SEO 官方能力研究（2026）

- 文件性質：第二階段 PRD 的技術與產品研究底稿
- 查閱日期：2026-09-12
- 來源範圍：只採用官方產品文件、官方 API 規格、官方政策及監管機構指引
- 注意：供應商能力、價格、配額及法規會變更，實作前仍須再次核對；本文件不是法律意見

## 一、結論摘要

### 1. 第二階段不應把 AI 當成 SEO 數據來源

AI 可以生成長尾詞、分類搜尋意圖、聚類、解釋數據及產生內容草稿，但不能可靠證明競品的實際排名、流量或外鏈權重。競品 Top 100 關鍵詞、SERP、流量估算及外鏈必須來自 DataForSEO、Ahrefs、Semrush 等有明確方法與時間戳的資料源；Google Search Console 只用於已授權的自有站點。

每個指標必須帶以下真實性標籤：

| 標籤                   | 定義                                      | 例子                                              |
| ---------------------- | ----------------------------------------- | ------------------------------------------------- |
| `first_party_observed` | 站點擁有人授權後取得的第一方觀測資料      | GSC clicks、impressions、CTR、average position    |
| `provider_estimated`   | 第三方供應商依其資料庫與模型估算          | 競品 estimated traffic、traffic cost、domain rank |
| `ai_inferred`          | AI 由內容或既有數據推導，不能當成觀測事實 | 搜尋意圖解釋、內容缺口摘要、優先級建議            |

PRD 應禁止以下降級行為：當外部資料供應商缺資料時，不得用 AI 生成一個看似精確的排名、流量、搜尋量或權重數字代替。

### 2. 建議的第二階段範圍

| 優先級 | 建議能力                                                                                | 原因                                                           |
| ------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| P0     | Keyword Intelligence、競品 keyword gap、Content Optimizer、資料來源標籤、成本／配額帳本 | 可直接延伸現有 RankWoven 能力，也是使用者願意付費的核心工作流  |
| P1     | 定期競品監控、Site Audit remediation、AI／搜尋可見度監控、Shopify 連接器                | 需要排程、快照、差異比較、更多授權與配額治理                   |
| P2     | 公共 API、完整用量計費、外鏈機會管理與 outreach 草稿                                    | 涉及多租戶安全、法規、濫用防護及商業模式，風險高於單純生成內容 |

「完整第二階段在 2 至 3 週上線」不切實際。2 至 3 週只適合一個 thin slice，例如：輸入 seed keyword／競品域名，取得有來源標籤的候選詞，完成 AI 聚類並儲存為 keyword set。完整 P0 建議以約 6 週規劃，P1、P2 分開驗收。

### 3. 2026 年 GEO 的產品定位需要修正

Google 的官方 Generative AI Search 指引明確表示，傳統 SEO 基礎仍然適用，Google Search 不需要特殊的 AI 文字檔、`llms.txt`、內容「切塊」或為每個長尾變體重寫頁面；Google 也建議優先建立獨特、非商品化、由專業或第一手經驗支撐的內容，而不是追逐「AEO/GEO hacks」。因此 RankWoven 可以保留 `llms.txt` 作為其他生態系統的輔助能力，但不得宣稱它會提升 Google AI Overviews／AI Mode 排名。[Google：Optimizing for generative AI search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

產品應把 GEO 定義為：可抓取與可索引、明確實體與來源、可信作者資訊、原創證據、良好頁面體驗，以及跨 AI 平台的可見度測量，而不是新增一個不透明的「GEO 神奇分數」。

## 二、AI 模型與工作流能力

### 1. OpenAI

#### 官方能力

- Responses API 是統一的 agentic API，可在一次請求內使用 Web Search、File Search、Code Interpreter、Remote MCP 及自訂函式；也可用 `previous_response_id` 或 Conversations 管理多輪狀態。[OpenAI：Responses API](https://platform.openai.com/api/docs/guides/migrate-to-responses)
- Responses 預設會儲存；若 RankWoven 不希望供應商保留工作流狀態，必須明確使用 `store: false`，並由自己的資料層管理內容版本與審計記錄。[OpenAI：Responses API](https://platform.openai.com/api/docs/guides/migrate-to-responses)
- Structured Outputs 可讓輸出遵從指定 JSON Schema，且能程式化識別 refusal；官方仍要求處理拒答、輸出截斷及支援的 JSON Schema 子集。[OpenAI：Structured Outputs](https://platform.openai.com/api/docs/guides/structured-outputs)
- Tools 支援內建工具、自訂 function calling、Remote MCP 等，並可用 `tool_choice` 控制工具選擇。[OpenAI：Tools](https://platform.openai.com/api/docs/guides/tools)
- Batch API 適合非即時工作：相較同步 API 成本低 50%，完成窗口為 24 小時；單一 batch 最多 50,000 個請求、輸入檔最多 200 MB，輸出順序不保證與輸入一致，必須用 `custom_id` 對應。[OpenAI：Batch API](https://platform.openai.com/api/docs/guides/batch)
- `text-embedding-3-small`／`text-embedding-3-large` 支援語義搜尋、聚類、推薦與分類，預設維度分別為 1,536／3,072，可用 `dimensions` 降維；兩者最大輸入為 8,192 tokens。[OpenAI：Embeddings](https://platform.openai.com/api/docs/guides/embeddings)

#### 對 RankWoven PRD 的含義

- 即時內容評分、編輯建議與重寫使用同步 Responses；全站離線分類、重新 embedding、批量內容審核才使用 Batch。
- SEO 數據 API 應包成嚴格 function tools；模型只決定查詢與解釋結果，不能把 Web Search 當成排名資料庫。
- 所有 AI 分析以版本化 JSON Schema 輸出，至少包含 `schema_version`、`provider`、`model`、`evidence_refs`、`confidence`、`warnings`。
- Embeddings 用於關鍵詞語義聚類、內容相似度、搜尋意圖群組及 cannibalization 候選偵測，不應直接產生搜尋量或排名。
- 批次工作必須有 `queued / running / partial / completed / failed / expired` 狀態、逐項 correlation ID、可重試策略及部分成功處理。

### 2. Anthropic Claude

#### 官方能力

- Claude tool use 分為 client tools 與 server tools。Client tool 會返回 `tool_use`，由應用執行後再送回 `tool_result`；Web Search、Web Fetch、Code Execution 等 server tools 由 Anthropic 執行。[Anthropic：Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- `strict: true` 透過 constrained sampling 保證 tool name 及 tool input 符合支援的 JSON Schema，但 computer／browser toolset 不接受 `strict: true`。[Anthropic：Strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use)
- Structured Outputs 支援 JSON schema response 與 strict tool use，但只支援 JSON Schema 子集。官方列出每次請求最多 20 個 strict tools、24 個 optional parameters、16 個 union parameters；安全拒答、`max_tokens` 截斷等情況仍可能不符合 schema，字串 enum／const 的大小寫亦有例外。[Anthropic：Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- Citations 支援所有 active models，可引用 plain text、PDF 及 custom content；目前只支援文字 citation，掃描 PDF 若沒有可提取文字便無法引用圖片內容。[Anthropic：Citations](https://platform.claude.com/docs/en/build-with-claude/citations)
- Message Batches API 成本低 50%，單一 batch 上限是 100,000 個請求或 256 MB；多數 batch 在一小時內完成，但最長窗口為 24 小時，結果順序不保證，必須以 `custom_id` 對應。[Anthropic：Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)

#### 對 RankWoven PRD 的含義

- Claude 適合長內容審閱、來源文件引用及內容差距解釋；但 citations 只證明模型引用了所提供的文件片段，不等於外部事實已獨立查證。
- Schema 要保持淺而穩定。大型 audit 結果應拆成多個明確任務，避免把數十種 issue 全塞入一個複雜 schema。
- 應用仍須做 runtime schema validation、拒答／截斷處理及 enum 正規化，不能把 constrained output 理解為業務規則已驗證。

### 3. Google Gemini

#### 官方能力

- Gemini Structured Outputs 可依 JSON Schema 產生可解析結果，但只支援 JSON Schema 子集；Structured Outputs 用於格式化最終答案，Function Calling 用於採取動作，兩者職責不同。[Google AI：Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- Gemini 3 可把 Structured Outputs 與 Google Search grounding、URL Context、Code Execution、File Search 及 Function Calling 組合使用。[Google AI：Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- Grounding with Google Search 支援所有可用語言，返回帶 inline citation 的答案、搜尋查詢及 search suggestions；Gemini 3 按模型實際執行的每次搜尋查詢計費，UI 使用亦須遵守相關顯示條款。[Google AI：Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search)
- Gemini 2.5 及更新模型預設使用 implicit caching；`generateContent` 亦支援 explicit caching，預設 TTL 為一小時，儲存時間及 cached tokens 均影響成本。Interactions API 只支援 implicit caching。[Google AI：Context caching](https://ai.google.dev/gemini-api/docs/caching)、[Google AI：Explicit caching](https://ai.google.dev/gemini-api/docs/generate-content/caching)
- Batch API 成本為標準成本的 50%，目標完成時間為 24 小時；inline request 適用於總請求小於 20 MB，JSONL input file 上限為 2 GB。[Google AI：Batch API](https://ai.google.dev/gemini-api/docs/batch-api)

#### 對 RankWoven PRD 的含義

- Google Search grounding 可用於研究型內容的候選來源發現與引用 UI，但不能取代 GSC 或專業 SEO provider 的排名、曝光及流量資料。
- 重複分析相同品牌指南、內容政策或大型站點語料時可評估 explicit cache；內容變更後必須使 cache key／版本失效。
- Grounding 的搜尋次數與 citation 顯示條款需要納入 `research unit` 成本，不宜包裝成無限制功能。

### 4. 多模型路由建議

不要把第二階段綁死於單一模型 ID。建立 provider capability registry，記錄：

- `supports_structured_output`
- `supports_strict_tools`
- `supports_citations`
- `supports_grounding`
- `supports_batch`
- `supports_prompt_cache`
- `max_context_tokens`
- `data_retention_mode`
- `unit_cost_snapshot`
- `last_verified_at`

建議路由：

| 工作           | 執行模式                              | 最低要求                                      |
| -------------- | ------------------------------------- | --------------------------------------------- |
| 即時內容評分   | 同步、可串流                          | Structured Outputs、低延遲、schema validation |
| 一鍵重寫       | 同步草稿                              | 內容版本、diff、引用檢查、人類批准            |
| 關鍵詞聚類     | embeddings + deterministic clustering | 語言／地區隔離、可重算、模型版本記錄          |
| 全站內容盤點   | queue + Batch                         | correlation ID、部分成功、24 小時 SLA 說明    |
| 研究與來源建議 | grounding／citations                  | 可點擊來源、查閱時間、禁止虛構引用            |
| SEO 修復代碼   | 同步草稿                              | stack detection、sandbox、人工批准、回滾      |

## 三、SEO 與競品資料供應商

### 1. DataForSEO

#### 官方能力與限制

- Google Keyword Ideas 可輸入最多 200 個 seed keywords；單頁預設 700、上限 1,000 個結果，返回搜尋量、最近 12 個月趨勢、CPC、competition、分類及 informational／navigational／commercial／transactional 搜尋意圖。啟用 clickstream metrics 會收取雙倍費用。[DataForSEO：Keyword Ideas Live](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live/)
- Google Ranked Keywords Live 可返回域名／頁面排名與 estimated traffic volume 等資料，單頁上限 1,000；Live API 官方上限為每分鐘 2,000 calls、最多 30 個同步 calls。[DataForSEO：Ranked Keywords Live](https://docs.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live/)
- Competitors Domain 以關鍵詞交集找競品，並提供各排名區段、estimated traffic 及變化數據。其 average position 只針對交集關鍵詞，不能與全域平均位置混用。[DataForSEO：Competitors Domain Live](https://docs.dataforseo.com/v3/dataforseo_labs/google/competitors_domain/live/)
- Google Organic SERP Live 可指定 keyword、location、language、device 並返回 organic、featured snippet、people also ask、AI Overview 等 SERP 元素；depth 超過 10 可能增加費用。[DataForSEO：Google Organic SERP Live Advanced](https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/)
- Backlinks API 提供 summary、competitors、referring domains 等能力；competitor rank 是 DataForSEO 依 link graph 計算的供應商指標，不是 Google PageRank。[DataForSEO：Backlinks Competitors Live](https://docs.dataforseo.com/v3/backlinks/competitors/live/)
- 2026 年官方亦提供 LLM Mentions API，涵蓋品牌／網站 mentions、引用來源、AI search volume 及歷史變化；API 以 Live 方法取回供應商資料。[DataForSEO：LLM Mentions API](https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/overview/)

#### 對 RankWoven PRD 的含義

- 可作 P0 預設的 pay-per-use keyword／SERP provider，因為能在一個供應商內覆蓋 keyword ideas、ranked keywords、SERP 與 backlinks。
- 每次查詢都要保存 `provider_cost`、`location_code`、`language_code`、`device`、`requested_at`、`provider_updated_at`、`is_estimated` 及原始 response reference。
- 競品「Top 100」應定義為指定搜尋引擎、資料庫、地區、語言、裝置及觀測日期下的 Top 100，不能顯示成永久或全球排名。
- LLM Mentions 可列為 P1 實驗性 provider。AI visibility／AI search volume 的方法比傳統 GSC 更不透明，UI 必須顯示來源及估算性質。

### 2. Ahrefs API v3

#### 官方能力與限制

- API v3 可取得 Site Explorer、Keywords Explorer、SERP Overview、Rank Tracker、Site Audit、Brand Radar、Content Helper 等資料；SERP Overview 可提供 Top 100 SERP，Brand Radar 可提供多個 AI surface 的真實 prompts、responses 及 citations。[Ahrefs：API v3 Introduction](https://docs.ahrefs.com/docs/api/reference/introduction)
- API 只向符合資格的付費方案提供；大部分請求消耗 API units，任何付費請求最低 50 units，成本取決於返回列數與選取欄位。預設 rate limit 是每分鐘 60 requests，亦可能因系統負載動態 throttling。[Ahrefs：API v3 Introduction](https://docs.ahrefs.com/docs/api/reference/introduction)
- SERP Overview 的 search volume、traffic、traffic value 均明確標示為 estimation，並提供 SERP 實際檢查日期。[Ahrefs：SERP Overview OpenAPI](https://docs.ahrefs.com/reference/serp-overview.json)
- Content Helper 會分析既有 SERP 中排名頁面的核心 topics 與 coverage，基礎請求 1,000 units，加入 target URL scoring 再收 500 units；它只使用 Ahrefs 已收集的 SERP。[Ahrefs：Content Helper OpenAPI](https://docs.ahrefs.com/reference/content-helper.json)
- Brand Radar 可按品牌、競品、模型、日期及 citations 分析 AI visibility；官方已在 2026 年把 volume 逐步改成依各 AI 平台使用量調整的估算值，因此仍須標示為 provider estimate。[Ahrefs：Brand Radar OpenAPI](https://docs.ahrefs.com/reference/brand-radar.json)

#### 對 RankWoven PRD 的含義

- Ahrefs 適合做使用者自帶 API key（BYOK）或高階方案 provider，不適合在免費方案無上限代理查詢。
- Query builder 應只選必要欄位、設定 row limit、先估算 units；開發與測試使用官方 free test queries。
- RankWoven 的 AI visibility 資料模型需能容納 `model_surface`、`prompt`、`response`、`citation_url`、`observed_at` 與供應商 volume methodology version。

### 3. Semrush API

#### 官方能力與限制

- Semrush SEO API 提供 Domain Organic Search Keywords、organic competitors、domain-vs-domain、keyword overview、related keywords、keyword difficulty、backlinks 等報告；Trends API 另提供 traffic sources、daily／weekly traffic、top pages 等市場估算資料。[Semrush：API Overview](https://developer.semrush.com/api/v3/analytics/basic-docs/)
- Domain Organic Search Keywords 返回進入 Google Top 100 的關鍵詞、position、search volume、URL、traffic percentage／cost 等欄位。標準資料每列 10 API units、歷史資料每列 50 units；可查最近 31 日 daily rankings，`display_limit` 上限為 4,000,000。[Semrush：Domain Reports](https://developer.semrush.com/api/v3/analytics/domain-reports/)
- Site Audit API 能啟用與執行 audit、取得 campaign summary、issue 清單及詳細報告；一般操作常見為每 request 100 units，而完整 snapshot 官方列為 10,000 units。[Semrush：Site Audit API](https://developer.semrush.com/api/v3/projects/site-audit/)

#### 對 RankWoven PRD 的含義

- 「競品流量來源」若採 Semrush，必須確認 Trends API 的獨立訂閱與使用權；不能只憑 SEO Domain report 聲稱已取得全部流量來源。
- 大結果集按列計費，預設只能取得產品畫面需要的 Top 100，完整匯出應是明確的高成本操作。
- Site Audit 已有可用 provider，但 RankWoven 自有 crawler／Lighthouse 結果與 Semrush issue ID 不應混成同一分數；需保留 provider namespace。

### 4. Provider 策略

建議沿用多 provider adapter，並加入 provider selection policy：

1. 使用者明確選擇或 BYOK 時，優先使用其指定 provider。
2. 平台代付模式根據資料覆蓋、成本上限及區域選擇 provider。
3. Provider timeout／quota error 可切換 provider，但 UI 必須顯示資料源已改變；不同供應商的 authority／traffic 指標不得直接做時間序列比較。
4. 所有 response 先正規化，再保存原始 payload 的加密 object reference；不要把 API key 或完整授權憑據寫入 job payload、log 或前端。

## 四、Google Search Console

### 官方能力與限制

- Search Analytics Query API 返回已驗證資源的 clicks、impressions、CTR、average position，可按 query、page、country、device、date、hour、search appearance 等維度分組／過濾。[Google：Search Analytics Query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
- 單次 `rowLimit` 為 1 至 25,000，可用 `startRow` 分頁；但 API 每個 property、每個 search type、每日最多暴露 50,000 rows，並按 clicks 排序，query／page 維度仍可能丟失部分資料。[Google：Query all your Search Analytics data](https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data)
- Final data 通常在 2 至 3 日後可用；`dataState=all`／`hourly_all` 可取較新但未完成的資料，response metadata 會指出 `first_incomplete_date`／`first_incomplete_hour`，之後數值仍可能明顯改變。[Google：Search Analytics Query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
- Search Analytics 有 10 分鐘及每日 load quota；page／query 分組或過濾、較長日期範圍會增加負載。每站及每使用者為 1,200 QPM，每專案為 40,000 QPM。[Google：Search Console API usage limits](https://developers.google.com/webmaster-tools/limits)
- Google 2026 年的生成式搜尋指引另提到 Search Console 介面中的 Generative AI performance report，但現有 Search Analytics API 文件沒有承諾對應的 generative-AI dimension／endpoint；因此不能在 PRD 中直接承諾自動匯入該報告。[Google：Optimizing for generative AI search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)、[Google：Search Analytics Query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)

### 對 RankWoven PRD 的含義

- GSC 是自有站點成效的第一方來源，但不是完整 search log。UI 應顯示資料延遲、是否 incomplete、aggregation type 及取樣／缺失提示。
- 每日 incremental sync 採一日窗口並分 search type 抓取；歷史 backfill 分段排程，避免大日期範圍與 query+page 組合耗盡 load quota。
- Keyword Intelligence 需要同時保留 GSC 自有站表現與第三方市場估算，不能以同一欄位覆蓋。
- Google Generative AI report 的 API 支援列為 discovery open question；若沒有正式 endpoint，只能引導使用者在 Search Console 查看，不應以網頁抓取繞過限制。

## 五、AI 站點體檢：PageSpeed Insights、CrUX、Lighthouse

### 官方能力與限制

- PageSpeed Insights API 提供 Lighthouse lab data 及改善建議，並曾同時返回 CrUX real-world data；官方文件已標示 PSI 內的 real-world data 將停止提供，頻繁自動查詢建議使用 API key。[Google：PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started)
- CrUX API 是 aggregated real-user field data，可按 URL 或 origin、form factor 查詢；數據為過去 28 日的 rolling aggregation，低流量或不符合資格的 URL 可能沒有資料。[Chrome：CrUX API](https://developer.chrome.com/docs/crux/api)
- CrUX API 每個 Google Cloud project 免費 150 queries/minute，不能付費提高。History API 每週更新，最多返回 40 個互相重疊的 28 日 collection periods；沒有合資格資料時會出現 `NaN`／`null`。[Chrome：CrUX API](https://developer.chrome.com/docs/crux/api)、[Chrome：CrUX History API](https://developer.chrome.com/docs/crux/history-api)
- Lighthouse 是開源自動化 lab audit，可測 performance、accessibility、SEO 等，支援 CLI、Node module 及 Lighthouse CI；單次結果會受環境影響，應保存執行設定與版本。[Chrome：Lighthouse Overview](https://developer.chrome.com/docs/lighthouse/overview)

### 對 RankWoven PRD 的含義

- 架構分層：自有 crawler 檢查 robots、sitemap、canonical、dead links、HTML／schema；Lighthouse 做 lab audit；CrUX API 做 field performance。不要長期依賴 PSI response 中的 CrUX 區塊。
- UI 必須把「實際使用者 28 日 field data」與「單次模擬 lab data」分開，CrUX 無資料不是 audit failure。
- Site Audit 要提供 deterministic issue evidence、受影響 URL、嚴重度、修復步驟及重新驗證；AI 只負責解釋和生成候選 patch。
- 代碼修復預設只產生草稿／diff，不直接寫入第三方正式站點。需要使用者批准、權限檢查、備份與回滾。

## 六、Shopify 整合

### 官方能力與限制

- GraphQL Admin API 可讀寫 products、collections、inventory、orders 等商店資料，每個 request 使用 `X-Shopify-Access-Token`。[Shopify：GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql)
- Shopify API 每季發佈版本，stable version 最少支援 12 個月；請求必須指定版本，不能依賴 fall-forward。[Shopify：API Versioning](https://shopify.dev/docs/api/usage/versioning)
- GraphQL Admin API 使用 calculated query cost；標準方案 restore rate 為 100 points／second，Plus 為 1,000 points／second，單一 query 不得超過 1,000 points，array input 上限 250。限流以 app+store 組合計算。[Shopify：API Rate Limits](https://shopify.dev/docs/api/usage/rate-limits)
- Standalone／API-only app 使用 OAuth authorization code grant；必須驗證 `state`、HMAC、redirect URI 及實際授予 scopes。新 public apps 要使用 expiring offline access tokens，並安全輪換 refresh token。[Shopify：Authorization code grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant)
- Webhooks 適合近即時同步，但不保證順序或必達；必須驗證 HMAC、以 `X-Shopify-Webhook-Id` 去重，並用週期性 reconciliation job 補漏。[Shopify：Webhooks](https://shopify.dev/docs/apps/build/webhooks)

### 對 RankWoven PRD 的含義

- Shopify connector 先做 products、collections、pages、blogs／articles 的讀取、SEO 欄位草稿與明確批准後寫回，不一開始做全商店自動重寫。
- Access token 必須加密保存並按 shop 隔離；job 只保存 connection ID，不保存 token。
- Webhook handler 要先快速驗證、入 queue、回 2xx，再非同步處理；以 webhook ID 做 idempotency，按 resource `updated_at` 防止舊事件覆蓋新狀態。
- 每日 reconciliation 是必要驗收條件，不是日後優化。

## 七、Stripe 與 PayPal 計費

### 1. Stripe

#### 官方能力與限制

- Stripe Entitlements 可把產品映射到內部功能，並在訂閱狀態變更時通知應用 provision／de-provision access；feature 以唯一 lookup key 識別。[Stripe：Entitlements](https://docs.stripe.com/billing/entitlements)
- Billing Meters 可用 `sum` 或 `count` 聚合 meter events；事件會非同步處理，因此 usage summary／upcoming invoice 不會立即反映最新事件。Stripe 目前建議新 usage-based integrations 先評估 Metronome。[Stripe：Record usage](https://docs.stripe.com/billing/subscriptions/usage-based/recording-usage)、[Stripe：Usage-based implementation](https://docs.stripe.com/billing/subscriptions/usage-based/implementation-guide)
- Customer Portal 可讓使用者管理訂閱、付款方式及發票；每次 portal session 返回臨時 URL，應用在建立前必須自行驗證使用者。升降級、取消及付款資料變更仍要透過 webhooks 同步。[Stripe：Customer Portal](https://docs.stripe.com/customer-management/integrate-customer-portal)

#### 對 RankWoven PRD 的含義

- 不建議以「付費版無限使用」承擔不封頂的模型／SEO API 成本。套餐應由 entitlement + monthly included credits／research units + overage policy 組成。
- RankWoven 必須保存自己的 immutable usage ledger 作為即時配額來源，再非同步上報 Stripe；不能用 Stripe meter summary 做 request-time authorization。
- Webhook 要驗證簽名、去重、可重播，並以 subscription／entitlement state machine 處理延遲與亂序。
- 在 PRD 確定 usage billing 架構前，需做 Billing Meters 與 Metronome 的成本／可用地區／遷移評估；不要同時實作兩套。

### 2. PayPal

#### 官方能力與限制

- PayPal Subscriptions 以 product、plan、subscription 組成，支援固定金額、按用戶數、volume／tier、trial 及升降級。[PayPal：Subscriptions](https://developer.paypal.com/docs/subscriptions/)
- Subscriptions v1 API 支援 create／update plan、create／revise／suspend／cancel／activate subscription 及交易查詢。[PayPal：Subscriptions API v1](https://developer.paypal.com/docs/api/subscriptions/v1/)
- PayPal webhooks 需在 HTTPS endpoint 驗證來源；非 2xx 會在三日內最多重試 25 次，應用可本地驗證簽名或呼叫 PayPal verify signature endpoint。[PayPal：Webhooks](https://developer.paypal.com/api/rest/webhooks/)

#### 對 RankWoven PRD 的含義

- PayPal 可作替代付款通道，但 entitlement 與 usage ledger 必須留在 RankWoven，不可讓兩個 PSP 各自成為功能權限真相。
- MVP 應先支援與 Stripe 對齊的固定月／年 plan；真正按量 overage 若 PayPal 產品能力不能一一對應，應先採 prepaid credit top-up 或只在 Stripe 提供，並在價格頁清楚說明。

## 八、Google AI 內容與 Spam 政策

### 官方要求

- Google 認為生成式 AI 可用於研究與整理原創內容，但大量生成沒有新增價值的頁面可能違反 scaled content abuse；自動產生的 title、description、structured data、alt text 同樣要準確、相關及符合政策。[Google：Guidance on generative AI content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content)
- Google 建議在讀者合理期待時說明內容如何使用 AI／自動化產生；AI-generated product data 另受 Merchant Center 標示規則約束。[Google：Guidance on generative AI content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content)
- Scaled content abuse 不取決於內容是人工或 AI 生成，而是是否大量產生低原創、低價值內容以操縱排名；自動查詢／抓取 Google Search 作 rank checking 而未獲明確許可亦屬 machine-generated traffic 違規。[Google：Spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
- E-E-A-T 本身不是單一 ranking factor；Google 強調 trust 最重要，並建議清楚交代內容的 Who、How、Why 及真實第一手經驗。[Google：Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- Google 2026 年官方生成式搜尋指引指出：不需要為 Google 建立 `llms.txt` 或特殊 AI markup、不需要刻意切成細小 chunks、不需要為所有長尾變體改寫內容，也不應追求虛假 mentions；基礎 SEO、獨特內容、可抓取性、索引資格及良好頁面體驗仍是核心。[Google：Optimizing for generative AI search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

### 對 RankWoven PRD 的含義

- 「一鍵 E-E-A-T 優化」不能自動捏造作者經驗、測試、數據、案例或引用。產品名稱應改成「E-E-A-T 證據缺口檢查」或「可信度優化建議」。
- 若草稿需要新增數字或案例，只能：引用使用者提供的來源、使用有 citation 的 research 結果，或插入明確 `SOURCE_REQUIRED` placeholder。
- 發佈前 gate 至少檢查：原創價值、來源可訪問、引用與正文一致、作者／審閱者、AI assistance disclosure、重複／近重複內容、sitewide topic fit。
- 不提供直接抓取 Google 結果頁的功能；SERP 只經授權 provider 或合規官方 API 取得。
- GEO 分數需拆成可解釋項目，不應暗示 Google 使用 `llms.txt`、任意 keyword density、字數或特定「AI chunk size」作排名訊號。

## 九、外鏈機會與 Outreach 合規

### 1. 美國 CAN-SPAM

- CAN-SPAM 適用於所有商業 email，包括 B2B。寄件資訊與主旨不得誤導；郵件要清楚識別廣告、提供有效實體郵寄地址與明確 opt-out。[FTC：CAN-SPAM compliance guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
- Opt-out 機制在寄出後至少 30 日可用，請求須在 10 個工作日內執行；委託第三方寄送不能轉移法律責任。[FTC：CAN-SPAM compliance guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)

### 2. GDPR 與英國 PECR

- GDPR 要求 lawful、fair、transparent、purpose limitation、data minimisation、storage limitation、accuracy、security 及 accountability；若聯絡資料不是直接向本人取得，還要告知資料來源與處理資訊。[European Commission：GDPR principles](https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/principles-gdpr_en)
- Legitimate interests 只有在完成必要性與權益平衡、且不嚴重影響個人權利時才可使用；購買聯絡名單前，取得方必須能證明資料收集及廣告用途符合 GDPR。個人對 direct marketing 有隨時反對的權利。[European Commission：Legal grounds for processing](https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/legal-grounds-processing-data_en)
- 英國 PECR 一般禁止在沒有特定 consent 時向 individuals 發送行銷 email／text；soft opt-in 只限自己的既有客戶、相似產品，且收集時及每封訊息都給予 opt-out。它不適用於 prospective contacts 或買入名單。[ICO：Electronic mail marketing](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/)
- Corporate bodies 的 B2B 電郵在 PECR 下可有不同規則，但 sole traders／部分 partnerships 當作 individuals；使用員工的個人化公司 email 仍可能涉及個人資料。所有反對／退訂都應進 suppression list。[ICO：Electronic mail marketing](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/)
- ICO 強調個人有反對 direct marketing 的絕對權利，必須從設計階段尊重偏好。[ICO：Direct marketing guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/)

### 3. 對 RankWoven PRD 的含義

- P2 只做外鏈機會發現、聯絡資料來源記錄與 outreach 草稿；不預設自動大量寄信。
- 若日後加入寄送，必須先做 jurisdiction policy engine、lawful-basis／consent evidence、sender identity、postal address、suppression list、單擊退訂、頻率限制、complaint handling 及稽核紀錄。
- 每個 contact 至少保存 `source_url`、`collected_at`、`country_assumption`、`contact_type`、`lawful_basis`、`consent_evidence`、`last_contacted_at`、`suppressed_at`；資料保留期要可配置並定期刪除。
- 外鏈推薦不可鼓勵買賣傳遞排名權重的 links。付費／贊助 links 應提示使用 `rel="sponsored"` 或 `nofollow`；Google 把為操縱排名而買賣、交換或自動建立 links 列為 link spam。[Google：Spam policies](https://developers.google.com/search/docs/essentials/spam-policies#link-spam)

## 十、可直接寫入 PRD 的跨功能要求

### 1. 數據與可追溯性

每筆分析結果至少保存：

```text
tenant_id
site_id
source_type
provider
provider_metric_name
provider_methodology_version
location
language
device
observed_at
provider_updated_at
is_estimated
raw_response_ref
ai_provider
ai_model
prompt_version
schema_version
evidence_refs
cost_units
```

驗收條件：使用者能在 UI 看見資料來源、日期、地區、裝置及「實測／估算／AI 推導」；CSV／API export 亦保留相同欄位。

### 2. 成本、配額與套餐

- 所有昂貴操作在執行前估算 `research units`，完成後記錄實際 provider cost 與 token usage。
- 免費版以每日／每月 research units、站點數、競品數及 audit page cap 限制，不用模糊的「限制次數」。
- 付費版增加 included units、排程頻率、歷史保留及 provider 選項；企業版增加 BYOK、SSO、audit log、公共 API 與 SLA。
- 配額扣減採 reservation -> finalize／release，使用 idempotency key 防止重試重複扣費。

### 3. AI 品質與 Evals

建立固定 multilingual eval set，至少涵蓋繁體中文、簡體中文、英文（美／英）、西班牙文：

- keyword intent classification 準確率
- cluster purity／重複率
- JSON schema pass rate
- citation existence 與 citation entailment
- 事實／數字無來源率
- rewrite meaning preservation
- locale style adherence
- unsafe／spam recommendation rate
- provider timeout／refusal／partial output recovery

模型或 prompt 版本升級前必須跑 eval；線上保留抽樣人工審閱及 rollback。模型輸出分數不能取代 deterministic SEO checks。

### 4. 工作隊列與韌性

- 外部 API 與 AI 請求統一使用 queue、timeout、exponential backoff、circuit breaker 及 provider-specific rate limiter。
- Job 以 tenant-aware idempotency key 去重；Webhook 先驗證及入列，再非同步處理。
- 長任務要顯示進度、估算完成時間、已完成／失敗項目及可重試範圍。
- Cache key 必須包含 provider、endpoint、location、language、device、日期、輸入 hash、模型／prompt version；不得跨租戶洩漏結果。

### 5. 安全與私隱

- OAuth refresh token、SEO provider key、AI provider key、Stripe／PayPal secret 必須以 server-side encryption 保存，永不返回前端或寫入 log。
- SSRF 防護適用於競品 URL、內容 URL、crawler、webhook callback：只允許 `http/https`、阻擋 private／link-local／metadata IP、限制 redirect、DNS rebinding 與 response size。
- 抓取遵守 robots、provider terms、速率限制與版權要求；內容重寫保存來源、授權與版本。
- 支援 tenant data export／delete、資料保留期、subprocessor 記錄及管理員 audit log。

## 十一、建議的架構決策

1. **延伸現有 provider abstraction，而非重寫。** 將 keyword、SERP、backlink、AI visibility、site performance 分成不同 capability，避免一個 `seoScoreProvider` 同時承擔互不相容的指標。
2. **建立 canonical evidence layer。** AI 只能引用 evidence ID；所有外部數字先進 evidence store，再由 AI 解釋。
3. **內容工作台採版本／diff／approve／publish。** 任何一鍵重寫、修復代碼或 CMS 寫回都不能略過人工批准與回滾。
4. **建立內部 entitlement 與 usage ledger。** Stripe／PayPal 是付款事件來源，不是 request authorization 的唯一即時依賴。
5. **把即時與批次分開。** 互動功能設定數十秒內 SLA；batch 只處理可等待 24 小時的全站分析、eval 或重新 embedding。
6. **先做結果可信度，再做功能數量。** P0 必須先完成來源標籤、時間戳、成本與 eval，否則競品與 AI 分數很容易造成錯誤商業決策。

## 十二、官方來源索引

### AI 平台

- [OpenAI Responses API](https://platform.openai.com/api/docs/guides/migrate-to-responses)
- [OpenAI Structured Outputs](https://platform.openai.com/api/docs/guides/structured-outputs)
- [OpenAI Tools](https://platform.openai.com/api/docs/guides/tools)
- [OpenAI Batch API](https://platform.openai.com/api/docs/guides/batch)
- [OpenAI Embeddings](https://platform.openai.com/api/docs/guides/embeddings)
- [Anthropic Tool Use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [Anthropic Strict Tool Use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use)
- [Anthropic Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Anthropic Citations](https://platform.claude.com/docs/en/build-with-claude/citations)
- [Anthropic Batch Processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- [Gemini Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search)
- [Gemini Context Caching](https://ai.google.dev/gemini-api/docs/caching)
- [Gemini Explicit Caching](https://ai.google.dev/gemini-api/docs/generate-content/caching)
- [Gemini Batch API](https://ai.google.dev/gemini-api/docs/batch-api)

### SEO、搜尋與網站品質

- [DataForSEO Keyword Ideas](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live/)
- [DataForSEO Ranked Keywords](https://docs.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live/)
- [DataForSEO Competitors Domain](https://docs.dataforseo.com/v3/dataforseo_labs/google/competitors_domain/live/)
- [DataForSEO Google SERP](https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/)
- [DataForSEO Backlinks Competitors](https://docs.dataforseo.com/v3/backlinks/competitors/live/)
- [DataForSEO LLM Mentions](https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/overview/)
- [Ahrefs API v3 Introduction](https://docs.ahrefs.com/docs/api/reference/introduction)
- [Ahrefs SERP Overview OpenAPI](https://docs.ahrefs.com/reference/serp-overview.json)
- [Ahrefs Brand Radar OpenAPI](https://docs.ahrefs.com/reference/brand-radar.json)
- [Ahrefs Content Helper OpenAPI](https://docs.ahrefs.com/reference/content-helper.json)
- [Semrush API Overview](https://developer.semrush.com/api/v3/analytics/basic-docs/)
- [Semrush Domain Reports](https://developer.semrush.com/api/v3/analytics/domain-reports/)
- [Semrush Site Audit](https://developer.semrush.com/api/v3/projects/site-audit/)
- [Google Search Analytics Query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
- [Google Search Analytics complete data guide](https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data)
- [Google Search Console API limits](https://developers.google.com/webmaster-tools/limits)
- [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started)
- [CrUX API](https://developer.chrome.com/docs/crux/api)
- [CrUX History API](https://developer.chrome.com/docs/crux/history-api)
- [Lighthouse Overview](https://developer.chrome.com/docs/lighthouse/overview)

### CMS、計費、政策與合規

- [Shopify GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql)
- [Shopify API Versioning](https://shopify.dev/docs/api/usage/versioning)
- [Shopify Rate Limits](https://shopify.dev/docs/api/usage/rate-limits)
- [Shopify Authorization Code Grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant)
- [Shopify Webhooks](https://shopify.dev/docs/apps/build/webhooks)
- [Stripe Entitlements](https://docs.stripe.com/billing/entitlements)
- [Stripe Record Usage](https://docs.stripe.com/billing/subscriptions/usage-based/recording-usage)
- [Stripe Usage-based Billing](https://docs.stripe.com/billing/subscriptions/usage-based/implementation-guide)
- [Stripe Customer Portal](https://docs.stripe.com/customer-management/integrate-customer-portal)
- [PayPal Subscriptions](https://developer.paypal.com/docs/subscriptions/)
- [PayPal Subscriptions API v1](https://developer.paypal.com/docs/api/subscriptions/v1/)
- [PayPal Webhooks](https://developer.paypal.com/api/rest/webhooks/)
- [Google Guidance on Generative AI Content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content)
- [Google Search Spam Policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [Google People-first Content and E-E-A-T](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Generative AI Search Optimization Guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [FTC CAN-SPAM Compliance Guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
- [European Commission GDPR Principles](https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/principles-gdpr_en)
- [European Commission Legal Grounds for Processing](https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/legal-grounds-processing-data_en)
- [ICO Direct Marketing Guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/)
- [ICO Electronic Mail Marketing under PECR](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/)
