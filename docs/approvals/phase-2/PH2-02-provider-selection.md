# PH2-02 Provider、模型與成本選型核檢

> 文件狀態：已批准 v1.2（統一 Breakout API 代理）
> 核檢日期：2026-09-13
> 前置批准：`APPROVE PH2-00`、`APPROVE PH2-01`
> 依據：`docs/rankwoven-phase-2-prd.md`、`docs/rankwoven-phase-2-development-workflow.md`、`docs/research/phase-2-api-pricing-2026.md`
> AI 接口：`docs/breakout-api-integration.md`
> 貨幣：USD，未計稅、區域折扣、合約折扣及主機固定成本

## 1. 範圍與決策原則

本步只決定第二階段可使用的 Provider、模型路由、成本公式、配額治理、BYOK 邊界及降級行為；不建立 runtime adapter、migration 或對外 API。所有外部資料必須保留 `provider`、endpoint、model、methodology、collectedAt、region、language、device、units/tokens、estimatedCost 及原始回應參照。

**設計修訂（2026-09-13）**：所有 AI 請求只使用既有 Breakout API gateway。上游模型名稱只作 model metadata；RankWoven 不再為 OpenAI、Anthropic、Google 或其他模型供應商建立獨立 API 連線或切換 provider。

價格是供應商官方頁面的時間點快照，不是固定報價。實作時必須由版本化 pricing snapshot 驅動預估和扣帳；價格變動只影響新任務，不改寫歷史 usage ledger。

## 2. 能力矩陣

| 能力                                        | 平台主 Provider                                                   | 備用／企業方案                   | 成本單位                     | Phase 2 決策                                                                   |
| ------------------------------------------- | ----------------------------------------------------------------- | -------------------------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| Keyword、SERP、競品、Backlink、LLM mentions | DataForSEO                                                        | Ahrefs／Semrush BYOK             | request、row、item           | 平台代付 DataForSEO；同一 run 只選一個 canonical Provider                      |
| 即時內容評分、結構化輸出、工具編排          | Breakout API `POST /v1/chat/completions`                          | 同一 gateway 的 approved model   | gateway token usage          | 只切換 model ID；schema、refusal、截斷由單一 adapter 處理                      |
| Embedding、聚類、相似度                     | Breakout API `POST /v1/embeddings`                                | 同一 gateway 的 approved model   | gateway token usage          | 先完成 endpoint smoke；以內容 hash + model version 快取                        |
| 低成本非同步批量                            | Breakout gateway 的 `text.batch` profile                          | 同一 gateway 的 approved model   | gateway token usage          | 僅用於可延遲任務，不用於即時 UI 回應                                           |
| 長文引用對齊、高價值改寫                    | Breakout gateway 的 `text.high_quality` profile                   | 同一 gateway 的 approved model   | gateway token usage          | 只改 model ID，不靜默切換 base URL                                            |
| 搜尋 grounding                              | 未批准                                                           | DataForSEO LLM Mentions           | provider request + row       | P0 不開啟；不可使用直連模型 web search                                         |
| 自有站點表現                                | GSC、CrUX、Lighthouse                                             | PageSpeed Insights 過渡 fallback | 免費配額／Worker 計算        | GSC／CrUX 只作第一方或 field data；Lighthouse 保存 lab 版本及裝置              |
| CMS 寫回                                    | WordPress REST                                                    | Shopify GraphQL、Ghost Admin API | API／query cost；主機另計    | WordPress first；所有發布先 draft，人工批准後才可 publish                      |
| 付款與 Entitlement                          | Stripe Billing + 本地 `usage_ledger`                              | PayPal Subscriptions             | 交易費、webhook              | Stripe 只作付款及 entitlement webhook；request-time quota 以本地 ledger 為準   |
| Email                                       | 現有 provider adapter，Phase 2 只產生草稿                         | SES／Postmark／SendGrid          | 按量或套餐                   | 不自動寄 outreach，待合規步驟另行批准                                          |

## 3. 官方價格與配額快照

### 3.1 AI Gateway

| Gateway | 接口 | 已核驗資訊 | 成本與配額邊界 |
| --- | --- | --- | --- |
| Breakout API | `GET /v1/models` | 2026-09-13 以既有 server-side key 返回 200 與 48 個 model；每筆有 `id`、`owned_by`、`supported_endpoint_types` | 不返回價格；模型清單是動態目錄 |
| Breakout API | `POST /v1/chat/completions` | 現有 `@aieo/ai-providers` 已採 OpenAI 相容 adapter | 由 gateway token usage 與價格快照估算／結算 |
| Breakout API | `/v1/embeddings`、`/v1/images/generations` | 現有 API 已宣告；PH2-03 前仍需 capability smoke | 未驗證前不可放入 production profile |

### 3.2 SEO、效能及交易 Provider

| Provider                       | 官方成本／配額                                                                                   | 決策含義                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| DataForSEO Google Organic SERP | Standard $0.0006／10 results；Priority $0.0012；Live $0.002；最低付款 $50                        | 平台主 Provider；預設 Standard，只有明確 P95 需求才用 Priority／Live            |
| DataForSEO Backlinks           | $0.024／task + $0.000036／row；1,000 rows 約 $0.06                                               | Backlink 機會可按需抓取；保存 row 數及 task 成本                                |
| DataForSEO LLM Mentions        | $0.10／request + $0.001／row；1,000 rows 約 $1.10                                                | 高成本能力，必須獨立 entitlement、cache 及每日 cap                              |
| Ahrefs API                     | 合資格付費方案；大多請求最低 50 API units；預設 60 requests/min；免費測試 query 不扣 units       | 只作 BYOK／Enterprise；平台不代付、不把 units 換算成 DataForSEO 指標            |
| Semrush API                    | 按 API units；部分 Domain report 10 units／row，歷史資料可達 50 units／row；套餐需登入／報價     | 只作 BYOK；保存原生 report、units 及 database                                   |
| GSC Search Analytics           | API 免費；每 site/user 1,200 QPM、project 40,000 QPM；load quota 另按 10 分鐘／日計算            | 使用 OAuth 只讀 scope、分頁及 incomplete metadata；不是完整 search log          |
| CrUX API                       | 免費 150 queries/min/project，不可付費提升；28 日 rolling field data                             | 無資料顯示 unavailable，不當作 0 分；field 與 Lighthouse lab 分開               |
| Shopify Admin GraphQL          | 按 calculated query cost；Standard 100 points/s、Plus 1,000 points/s；單 query 最多 1,000 points | 後置 CMS；使用 bulk operation、OAuth 最小 scope、HMAC webhook 及 reconciliation |
| Stripe                         | 美國公開標準線上卡示例 2.9% + $0.30／成功交易；地區／帳戶可不同                                  | 僅作付款投影；用量准入不可依賴非同步 Stripe meter                               |

## 4. 模型路由與 fallback 規則

| 任務 | 首選 | 可接受 fallback | 禁止行為 |
| --- | --- | --- | --- |
| 即時 SEO 分析、JSON schema、短改寫 | gateway `text.default` profile | 同 gateway、同 capability 的 approved model | 將自由文本截取成 JSON；拒答當成功；更換 API base URL |
| 高價值長文、引用對齊 | gateway `text.high_quality` profile | 同 gateway、同 capability 的 approved model | 沒有來源時自動補數字、案例或作者資格 |
| 大量意圖分類、摘要、標籤 | gateway `text.batch` profile | 同 gateway、同 capability 的 approved model | 用 batch 處理需要即時回應的互動操作 |
| 多語言 embedding／聚類 | gateway `embedding.default` profile + deterministic clustering | 同 gateway、已通過 endpoint smoke 的 model | 每次由模型自由命名 cluster，導致結果不可重現 |
| 競品排名、搜尋量、backlink         | DataForSEO                                      | Ahrefs／Semrush BYOK                                     | 用 AI 估算缺失的真實指標；混合不同 Provider 的時間序列 |
| 即時引用／GEO 監控 | DataForSEO LLM Mentions | 無 | 把模型輸出當成 Google 排名保證 |

Fallback 必須在同一 gateway、同一 capability、資料權限、保存條款及地區政策內；切換後保存 gateway、實際 model 與 catalog snapshot。若無相容 fallback，返回 `PROVIDER_UNAVAILABLE` 或 `partial`，不得靜默猜值。

## 5. 成本公式與示例

### 5.1 統一公式

```text
ai_cost = gateway_model_price_snapshot(input_tokens, output_tokens, image_count)
        + gateway_reported_usage_adjustment

seo_cost = request_count * request_price
         + returned_rows * row_price
         + returned_items * item_price

reserved_credits >= estimated_gateway_cost * safety_multiplier
```

預估時使用 1.25 safety multiplier；實際結算使用 gateway 回傳 usage 與已版本化的代理價格快照。失敗未產生成本的 reservation release；已產生部分成本則 finalize 實際值並標記 `partial`。`/v1/models` 不含價格，沒有可用快照時不可建立昂貴任務。

### 5.2 1,000 次內容分析

假設每次 4,000 input tokens + 1,000 output tokens，合計 4M input + 1M output；未計圖片、重試、cache、稅項及基礎設施。對每個選中的 gateway model：

```text
1,000 次成本
= 4 * gateway_snapshot.input_usd_per_mtok
+ 1 * gateway_snapshot.output_usd_per_mtok
```

Breakout `/v1/models` 不回傳價格，因此本文件不以 OpenAI／Anthropic／Gemini 直連價推算平台代理成本。PH2-03 必須從 Breakout 控制台或使用日誌建立 `price_snapshot_id`，才能顯示本段表格的金額並執行 credits reservation。

### 5.3 SEO 用量示例

| 用量                                          |    估算 |
| --------------------------------------------- | ------: |
| 1,000 個 Standard SERP（每個 10 results）     |   $0.60 |
| 100 個 Backlinks task（每個 1,000 rows）      |   $6.00 |
| 1,000 個 LLM Mentions request（每個 10 rows） | $110.00 |
| 10,000 個 AI keyword volume items             |   $1.01 |

LLM Mentions 的完整計算為 `1,000 * $0.10 + 10,000 rows * $0.001 = $110.00`；實作測試必須以實際 row 數結算，不能只按 request 數扣費。

## 6. 配額、預算及 hard stop

Phase 2A 建議先採內部 cap，產品套餐正式價格需用 30 日實際數據校準：

| 層級      |    全平台月度變動成本 cap |    單工作區月度 cap | 單工作區每日 cap | 告警門檻       |
| --------- | ------------------------: | ------------------: | ---------------: | -------------- |
| Beta 初始 |                      $500 |                 $25 |               $5 | 50%／80%／100% |
| 放量前    | 依 30 日 P95 + 30% buffer | 方案收入的 25% 上限 |    月 cap 的 10% | 50%／75%／90%  |

- `usage_ledger` 使用 `reserve → finalize／release` append-only 事件及唯一 `idempotency_key`。
- 預估超過 workspace cap 時，API 返回 `QUOTA_EXCEEDED`，不建立外部任務。
- Gateway 429、timeout、schema refusal、模型下架、價格漂移及地區不可用都要進入可觀測事件；重試最多一次格式修復及一次具退避的 gateway retry。
- 超過全平台 cap 時停用高成本任務，保留讀取既有結果、匯出及回滾能力。
- DataForSEO、Ahrefs、Semrush 與 AI gateway 模型用量分開時間序列；UI 顯示原生來源、gateway model 與估算標籤。

## 7. BYOK、資料保留及安全邊界

- Phase 2A 平台代付 DataForSEO；Ahrefs／Semrush 僅 Enterprise／Agency BYOK，平台不代付其 units。
- BYOK secret 只 server-side 加密保存，前端僅顯示遮罩後的 provider、最後四位及連通狀態；不進 log、job payload、測試 fixture 或 Git。
- CMS credential、OAuth token、Application Password 與支付 secret 使用同一 secret store 邊界；所有寫入前必須人工批准、權限檢查、最新值 hash、快照及 rollback。
- AI 任務保存最小必要輸入；gateway 請求不傳未經代理文件核實的供應商專屬參數，RankWoven 保存版本化結果及審計參照。
- 抓取頁面、競品內容、搜尋結果和 CMS 正文都視為不可信資料，不能成為 system instruction 或工具權限。
- DataForSEO、Ahrefs、Semrush 的原始條款及資料保留以各帳戶合約為準；未核實的地區或保存條款不得開啟該路由。

## 8. 選型結論與採購待辦

### 最優化方案

1. **SEO data**：DataForSEO 平台主 Provider，Standard SERP 為預設；Ahrefs／Semrush 以 BYOK Adapter 提供企業選項。
2. **AI**：單一 Breakout API gateway；所有文字、embedding 與圖片任務只切換 gateway catalog 中的 approved model ID，不建立上游 API fallback。
3. **Performance**：Lighthouse + direct CrUX；PageSpeed Insights 只保留過渡用途。
4. **CMS**：WordPress first；Shopify／Ghost 後置；發布流程固定為 draft → 人工批准 → publish／schedule → re-fetch → verify。
5. **Billing**：Stripe + 自建 `usage_ledger`；PayPal 後置，不提供無限用量。
6. **Email**：Phase 2 只生成 outreach 草稿，不自動寄送。

### 待辦

- 重新確認 DataForSEO 商務帳戶最低付款、地域及退款條款。
- 取得 Ahrefs／Semrush Enterprise API 報價及 BYOK 條款；在未完成前不可接入平台代付。
- 從 Breakout 控制台／使用日誌取得可版本化模型價格，並以 gateway fixtures 鎖定 success、timeout、429、partial、schema refusal、價格快照缺失及 unavailable region。
- 於 PH2-03 把 `AiGatewayAdapter`、model catalog、pricing snapshot、usage ledger 及 quota API 寫成契約；本文件不授權 runtime 實作。

## 9. 核檢結果

- [x] 不同 Provider 的指標不混入同一時間序列。
- [x] AI 模型價格已改為 gateway pricing snapshot；SEO Provider 價格維持公開固定、按量、最低充值或需登入／報價標籤。
- [x] 每項外部任務有 fallback 或明確 unavailable 行為。
- [x] Provider 更新不會改變歷史請求的真實來源標籤。
- [x] 已提供月度、workspace、每日 cap、告警與 hard stop。
- [x] AI gateway secret、SEO BYOK、資料最小化及人工批准邊界已定義。
- [x] 官方頁面於 2026-09-13 重新核對；動態價格需在實作前再次刷新。

**Open risks**：Breakout model catalog 已核驗，但價格不在 `/v1/models` 回應中；正式 DataForSEO 商務條款、Ahrefs／Semrush 報價、代理價格快照、實際套餐 credits 與 30 日毛利尚未取得。這些不阻塞 PH2-03 的契約設計，但阻塞正式放量及平台代付上限提升。

**Decision**：`APPROVED`。

**Approved by**：Product Owner（使用者）
**Approved at**：2026-09-13T02:28:43Z
**批准範圍**：本文件第 1–8 節的 Provider／gateway 選型、模型 profile、成本與配額治理、BYOK、資料保留、安全邊界及 PH2-03 前置條件。此批准不代表 PH2-03 runtime adapter、migration 或對外 API 已實作。
