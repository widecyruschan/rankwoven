# RankWoven 第二階段 API、配額與成本比較（2026）

- 查閱日期：2026-09-13（USD，未計稅及區域折扣）
- 用途：為第二階段 Keyword Intelligence、Content Optimizer、Site Audit、Backlink 機會、CMS 發布及計費流程選型。
- 價格會變更；實作前須重新核對官方頁面。凡需登入、合約或帳戶上下文的項目，本文明確標示「需登入／報價」，不作硬編數字。
- **AI 連線決策更新（2026-09-13）**：本文的 OpenAI、Anthropic 與 Gemini 價格只保留為上游市場比較，不能用於 RankWoven 實際請求或扣費。所有 AI 請求統一經既有 Breakout API gateway，實際 model catalog 及價格以 `docs/breakout-api-integration.md`、gateway 控制台與使用日誌為準。

## 1. AI 模型 API

| 方案                                  | 適用工作                        | 官方成本／折扣                                                                                                                                                        | 配額與注意事項                                                                                                                                                                                                                                                                                                               |
| ------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI Responses + Structured Outputs | 即時內容評分、重寫、工具呼叫    | 官方 2026-09-13 快照：`gpt-5.6-luna` $0.20／$1.20、`gpt-5.6-terra` $2／$12、`gpt-5.6-sol` $4／$20（input／output per MTok）；Batch 約 50%                                                                 | Batch 24 小時窗口；單一 batch 最多 50,000 requests、input 檔最多 200 MB；Responses 可設定 `store:false`。來源：[Pricing](https://developers.openai.com/api/docs/pricing)、[Batch](https://developers.openai.com/api/docs/guides/batch)、[Structured Outputs](https://platform.openai.com/api/docs/guides/structured-outputs) |
| OpenAI Embeddings                     | 關鍵詞聚類、內容相似度          | `text-embedding-3-small/large` 按 token 計費，單價以官方 Pricing 為準（可能隨模型更新）                                                                               | 最大輸入 8,192 tokens；可用 Batch 降低離線成本。來源：[Embeddings](https://platform.openai.com/api/docs/guides/embeddings)                                                                                                                                                                                                   |
| Anthropic Messages／Tool use          | 長文審閱、引用、複雜重寫        | 官方公開 per MTok：Claude Opus 5 input $5、output $25；Sonnet 5 input $2、output $10；Haiku 4.5 input $1、output $5。Prompt cache read 通常為 input 10%；Batch 低 50% | Structured Outputs／strict tools 仍要 runtime validation；Message Batch 最多 100,000 requests 或 256 MB，最長 24 小時。來源：[Pricing](https://docs.anthropic.com/en/docs/about-claude/pricing)、[Batch](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing)                                              |
| Gemini Developer API                  | 低成本分類、grounding、批量分析 | Gemini 3.8／3.7 Flash 於 2026-12-31 前 Standard input $0.75、output $3.75，2027-01-01 起 $1.50／$7.50；Batch 約為 Standard 50%                | Grounding with Google Search 每月共 5,000 requests 免費，其後 $14／1,000；Batch inline <20 MB、JSONL <2 GB。來源：[Pricing](https://ai.google.dev/gemini-api/docs/pricing)、[Batch](https://ai.google.dev/gemini-api/docs/batch-api)、[Grounding](https://ai.google.dev/gemini-api/docs/google-search)                                              |

**AI 選型結論（已取代）**：不建立 OpenAI、Anthropic 或 Gemini 直連 adapter。P0 只使用 Breakout gateway 與 gateway model profile；保存 gateway、model、catalog snapshot、token、unit cost snapshot、evidence refs。模型 ID、價格及生效日期不可寫死於業務邏輯。

## 2. SEO／競品／Backlink 資料

| 方案                 | 功能                                                          | 官方成本                                                                                                                                                                                           | 限制／適用                                                                                                                                                                                                                                                                                               |
| -------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DataForSEO SERP      | Google Organic SERP、PAA、AI Overview                         | Standard $0.0006／SERP（10 results）、Priority $0.0012、Live $0.002；depth、特殊運算會加乘                                                                                                         | PAYG，最低充值 $50；Live 約 6 秒；適合平台代付及 P0。來源：[SERP pricing](https://dataforseo.com/pricing/serp/google-organic-serp-api)                                                                                                                                                                   |
| DataForSEO Backlinks | backlink summary、competitors、referring domains              | task $0.024 + $0.000036／row；1,000 rows 約 $0.06                                                                                                                                                  | 每 request 收費；競品 rank 是供應商指標，不是 Google PageRank。來源：[Backlinks pricing](https://dataforseo.com/pricing/backlinks/backlinks)、[API](https://docs.dataforseo.com/v3/backlinks/summary/live/)                                                                                              |
| DataForSEO Labs／AI  | keyword ideas、ranked keywords、LLM mentions                  | AI keyword search volume task $0.01 + $0.0001／item（約 $110／1M items）；LLM Mentions $0.10／request + $0.001／row；LLM Responses $0.0006 + 對應 LLM 成本（Standard 另有 $0.0002 + $0.01 預付款） | Labs 其他 endpoint 按官方動態表；所有數值需記錄 `cost`。來源：[Pricing](https://dataforseo.com/pricing)、[AI pricing](https://dataforseo.com/pricing/ai-optimization/llm-mentions)、[LLM responses](https://dataforseo.com/pricing/ai-optimization/llm-responses)                                        |
| Ahrefs API v3        | Site Explorer、Top 100 SERP、Backlinks、Brand Radar           | 只限 eligible paid plan；每 request 最低 50 API units，按 rows／fields 消耗；額外 units 按帳戶 plan／PAYG（實際價格需登入／報價）                                                                  | 預設 60 requests/min，可能動態 throttling。適合作為高階 BYOK，而非免費方案代付。來源：[API introduction](https://docs.ahrefs.com/docs/api/reference/introduction)、[Pricing](https://ahrefs.com/pricing)                                                                                                 |
| Semrush API v3       | Domain Organic、competitor gap、Backlinks、Trends、Site Audit | 按 API units；Domain report 標準每 row 10 units、歷史每 row 50 units；Site Audit 完整 snapshot 10,000 units；套餐／unit 價格需登入或銷售報價                                                       | display_limit 可很大但會增加成本；Trends API 可能是獨立訂閱。來源：[API overview](https://developer.semrush.com/api/v3/analytics/basic-docs/)、[Domain reports](https://developer.semrush.com/api/v3/analytics/domain-reports/)、[Site Audit](https://developer.semrush.com/api/v3/projects/site-audit/) |

**SEO 選型結論：** P0 以 DataForSEO 作預設 pay-per-use（覆蓋 SERP、Labs、Backlinks、LLM）；Ahrefs／Semrush 作 BYOK 或 Enterprise provider。不可用 AI 猜測缺失的搜尋量、排名或流量。

## 3. 自有站點與效能資料

| API                                    | 成本／配額                                                                                                                           | 實作規則                                                                                                                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Google Search Console Search Analytics | API 本身免費；Search Analytics 每 site/user 1,200 QPM、project 40,000 QPM；每日最多暴露約 50,000 rows，另有 10 分鐘及每日 load quota | OAuth 只讀 scope；保存 dataState、延遲及 incomplete metadata，不當作完整 search log。來源：[Limits](https://developers.google.com/webmaster-tools/limits)、[Query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) |
| PageSpeed Insights                     | API 無獨立按次費用；需 API key 才適合高頻使用，限額依 Google project                                                                 | PSI lab data 與 CrUX field data 分開保存；Google 正逐步停止 PSI response 內 real-world data。來源：[PSI API](https://developers.google.com/speed/docs/insights/v5/get-started)                                                             |
| CrUX API                               | 免費 150 queries/min/project，不能付費提升；28 日 rolling aggregation，History API 每週更新                                          | 沒有合資格資料時顯示 null／NaN，不判定為失敗。來源：[CrUX API](https://developer.chrome.com/docs/crux/api)                                                                                                                                 |
| Lighthouse                             | 開源，無 API 服務費（自建 runner 基礎設施成本）                                                                                      | 保存版本、裝置、設定及執行時間，避免把單次 lab 結果當使用者體驗。來源：[Lighthouse](https://developer.chrome.com/docs/lighthouse/overview)                                                                                                 |

## 4. CMS 發布 API（只限已授權站點）

| 目標      | API／成本                                                                               | 重要限制                                                                                                                                                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WordPress | REST API 隨 WordPress 提供，無平台 API 按次費；自託管主機成本另計                       | Application Password／OAuth 必須服務端保管；先建立 draft，人工批准後 publish。來源：[REST API](https://developer.wordpress.org/rest-api/)                                                                                                                      |
| Ghost     | Admin API 隨 Ghost；Self-hosted 無額外 API 費，Ghost(Pro) 套餐另計                      | Integration token 只能服務端使用；支援 posts draft/publish，需保留版本與 rollback。來源：[Admin API](https://ghost.org/docs/admin-api/)                                                                                                                        |
| Shopify   | GraphQL Admin API 按商店計算 query cost，非按金額收費；Shopify 套餐／App 費需登入或報價 | Standard restore 100 points/s、Plus 1,000 points/s；單 query <=1,000 points；OAuth、HMAC、webhook 去重及 reconciliation 必須實作。來源：[Admin API](https://shopify.dev/docs/api/admin-graphql)、[Rate limits](https://shopify.dev/docs/api/usage/rate-limits) |

## 5. 計費與訊息

| 方案                                            | 官方費用／限制                                                                                                                                                                 | 建議                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stripe Billing + Entitlements + Customer Portal | Stripe 交易費與 Billing 產品費依國家／帳戶定價頁；沒有單一全球固定價，需以帳戶 pricing 為準。Meters 非同步處理 usage；Stripe 文件建議新 usage-based integration 評估 Metronome | RankWoven 自建即時 `usage_ledger` 作配額，Stripe 僅作付款、entitlement webhook 及 invoice；來源：[Pricing](https://stripe.com/pricing)、[Entitlements](https://docs.stripe.com/billing/entitlements)、[Usage](https://docs.stripe.com/billing/subscriptions/usage-based/implementation-guide) |
| PayPal Subscriptions                            | PayPal Checkout 公開示例 3.49% + $0.49／交易；Pay Later 4.99% + $0.49（美國頁面，費用可變、地區不同）                                                                          | 作第二支付通道；訂閱狀態靠 webhook 同步。來源：[Checkout fees](https://www.paypal.com/us/business/accept-payments/checkout)、[Subscriptions](https://developer.paypal.com/docs/subscriptions/)                                                                                                |
| Email（Postmark／SendGrid／SES）                | Postmark、SendGrid 及 SES 方案／區域價格需以官方 pricing 為準；SES 通常按量，Postmark／SendGrid 有月配額方案                                                                   | P0 可沿用現有郵件 provider adapter；不把供應商價格寫死於產品套餐。                                                                                                                                                                                                                            |

## 6. 成本模型與推薦組合

### 推薦（MVP／P0）

1. DataForSEO PAYG：$50 最低充值；只查 Top 100／必要欄位，SERP、Backlinks、LLM Mentions 分開記錄 cost。
2. Breakout gateway：文字、embedding 與圖片只切換經 capability 驗證的 model ID；成本使用 gateway 價格快照與使用日誌，而非上游公開單價。
3. GSC、CrUX、Lighthouse、WordPress REST：免費 API 或自建成本，按 OAuth／主機配額治理。
4. Stripe Billing + Entitlements + 自建 credits ledger；PayPal 作可選通道，不承諾「無限使用」。

### 成本敏感替代

- 在 Breakout catalog 中為非即時分類建立 approved batch profile；DataForSEO 仍保留作可驗證 SEO 數據。
- 不購買 Ahrefs／Semrush 平台代付；讓 Enterprise 使用者 BYOK，平台只保留加密 connection metadata。

### 高精度／企業替代

- Ahrefs Brand Radar／Semrush Trends 以 Enterprise 合約接入，所有報告顯示 provider estimate 及觀測日期。
- 增加 provider fallback 不能混合不同 authority／traffic 指標的時間序列。

## 7. PRD 實作約束

- 每次外部請求保存 provider、endpoint、region、language、device、requested_at、provider_updated_at、cost、units／tokens、is_estimated。
- 建立成本預估 API，在 job 執行前顯示預計 credits；超過 workspace cap 要求確認。
- 所有 API key／OAuth token 僅存加密 secret store；job payload、log、前端及 Git 禁止出現憑據。
- Backlink 發布只允許已授權 WordPress／Ghost／Shopify；流程為 `discovered → qualified → drafted → approved → publishing → published → verifying`。
- 供應商價格及配額每月重新核對；CI 不應用真實密鑰，使用 mock／sandbox／官方免費測試查詢。
