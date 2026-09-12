# Breakout API 統一模型代理接口

> 文件狀態：PH2-02 設計更新 v1.0
> 核驗日期：2026-09-13
> 官方文件：[Breakout API 使用說明](https://breakoutapi.apifox.cn/)

## 1. 決策

RankWoven 所有 AI 文字、embedding 與圖片模型請求只可經既有 Breakout API 代理接口發送。系統只保存一組 server-side gateway 連線設定：

```text
WENWEN_API_BASE_URL
WENWEN_API_KEY
```

不可為 OpenAI、Anthropic、Google、DeepSeek 或其他模型供應商另外建立 base URL、API key、BYOK UI 或 runtime fallback。模型供應商名稱只作 catalogue metadata 與審計標示；切換能力只改變 model ID，絕不改變 gateway。

SEO 市場數據（DataForSEO、GSC、CrUX、Ahrefs／Semrush BYOK）不屬於文字模型請求，仍按各自授權接口處理，不能由模型代理假造。

## 2. 已核驗接口

以既有 server-side `WENWEN_API_KEY` 查詢，以下接口在 2026-09-13 返回 `200 OK`；本文件不記錄或輸出 token。

### `GET /v1/models`

```http
GET {WENWEN_API_BASE_URL}/v1/models
Authorization: Bearer {WENWEN_API_KEY}
```

回應包含 `data[]`、`object`、`success`。每個 model 至少提供：

```json
{
  "id": "gpt-5.6-terra",
  "object": "model",
  "owned_by": "openai",
  "supported_endpoint_types": ["openai"]
}
```

本次取得 48 個 model ID。模型清單為動態資料，不可硬編碼為永久 allowlist：

```text
claude-fable-5
claude-haiku-4-5-20251001
claude-opus-4-5-20251101
claude-opus-4-5-20251101-thinking
claude-opus-4-6
claude-opus-4-6-20260205
claude-opus-4-7
claude-opus-4-8
claude-opus-5
claude-sonnet-4-5
claude-sonnet-4-5-20250929
claude-sonnet-4-6
claude-sonnet-4-6-20260218
claude-sonnet-5
deepseek-v3.2
deepseek-v4-flash
deepseek-v4-flash-0731
deepseek-v4-pro
deepseek-v4-pro-0813
gemini-2.5-flash
gemini-2.5-flash-lite
gemini-2.5-pro
gemini-3-flash-preview
gemini-3-pro-image-preview
gemini-3.1-flash-image-preview
gemini-3.1-pro-preview
gemini-3.5-flash
gemini-embedding-2
glm-5
glm-5.1
gpt-4o-mini
gpt-5.4
gpt-5.5
gpt-5.6-sol
gpt-5.6-terra
gpt-6-astra
gpt-image-2
gpt-image-2-pro
grok-4.3
grok-4.5
grok-4.6
kimi-k2.5
kimi-k2.6
kimi-k3
minimax-m2.5
qwen3.6-flash
qwen3.6-plus
text-embedding-3-small
```

### 已有 OpenAI 相容路徑

現有程式已使用以下路徑；實際 model 必須先存在於 `/v1/models`，並且適合請求類型：

| 操作         | 路徑                          | 現況                                                          |
| ------------ | ----------------------------- | ------------------------------------------------------------- |
| 取得模型目錄 | `GET /v1/models`              | 已以既有 gateway 連線核驗                                     |
| 文字生成     | `POST /v1/chat/completions`   | 已在 `@aieo/ai-providers` 實作 OpenAI 相容 adapter            |
| Embedding    | `POST /v1/embeddings`         | 現有 API 對外宣告；PH2-03 必須以獨立小額 smoke 驗證可用 model |
| 圖片生成     | `POST /v1/images/generations` | 現有 API 對外宣告；PH2-03 必須以獨立小額 smoke 驗證可用 model |

`supported_endpoint_types` 表示協議相容性，不等同內容、embedding 或圖片能力。模型入庫前仍要經 capability fixture 與小額人工批准測試。

## 3. 既有設定與模型切換

目前環境設定已符合單一代理模式：

```text
AI_TEXT_PROVIDER=wenwen
AI_FALLBACK_TEXT_PROVIDER=wenwen
AI_EMBEDDING_PROVIDER=wenwen
AI_IMAGE_PROVIDER=wenwen
AI_IMAGE_FALLBACK_PROVIDER=wenwen

WENWEN_TEXT_MODEL=<文字 model ID>
WENWEN_EMBEDDING_MODEL=<embedding model ID>
WENWEN_IMAGE_MODEL=<圖片 model ID>
```

切換模型只可修改對應 `WENWEN_*_MODEL` 值或 PH2-03 建立的 server-side model profile。不得將 `AI_*_PROVIDER` 改成上游供應商名稱，亦不得在瀏覽器、WordPress 插件、job payload 或 Git 暴露 gateway key。

初始預設保留目前已部署設定，避免未經批准直接切換生產模型。PH2-03 才可新增下列 model profile；每個 profile 只能引用 gateway catalog 中已核驗 model ID：

| Profile             | 操作                         | 選擇方式                                       |
| ------------------- | ---------------------------- | ---------------------------------------------- |
| `text.default`      | 標題、描述、SEO 評分、短改寫 | 由管理員選定一個已核驗文字 model               |
| `text.high_quality` | 長文改寫、引用對齊           | 同一 gateway 的高品質文字 model                |
| `text.batch`        | 非即時分類、摘要、標籤       | 同一 gateway 的低成本／可延遲文字 model        |
| `embedding.default` | 關鍵詞與內容聚類             | 已通過 `/v1/embeddings` smoke 的 model         |
| `image.default`     | 特色圖、社交圖               | 已通過 `/v1/images/generations` smoke 的 model |

## 4. 模型目錄與成本治理

`/v1/models` 不返回模型價格，故官方上游公開價、截圖中的模型廣場價格與實際代理扣費均不可直接互換。RankWoven 必須以 Breakout 控制台／使用日誌提供的價格為唯一產品成本來源。

PH2-03 的 `gateway_model_catalog` 或等效 pricing snapshot 至少保存：

```text
gateway = wenwen
model_id
owned_by
supported_endpoint_types
capability_status
price_snapshot_id
input_price
output_price
image_price
currency
effective_at
verified_at
```

每個 AI 任務需保存 gateway、model ID、catalog snapshot、input/output tokens、圖片數、request ID（如有）、實際成本與重試次數。成本預估與結算公式如下：

```text
estimated_cost = gateway_model_price_snapshot × expected_usage × 1.25 safety multiplier
actual_cost = gateway_usage_log 或 gateway price snapshot × response usage
```

若無有效 price snapshot，昂貴任務必須返回 `PRICE_SNAPSHOT_UNAVAILABLE`，而不是套用 OpenAI／Anthropic／Gemini 的官方直連價格。使用者可在 Breakout 控制台為 token 設置額度，平台的 usage ledger 仍須維持更嚴格的 workspace、每日及全平台 hard cap。

## 5. PH2-03 實作契約

1. `AiGatewayAdapter` 固定呼叫 `WENWEN_API_BASE_URL`，所有 AI 操作只傳 model ID。
2. 以受保護的管理 API 或排程同步 `/v1/models`；前端不能直接呼叫 gateway。
3. 管理員只能從 gateway catalog 與經 capability 驗證的 model profile 中選擇模型。
4. profile 變更建立新版本；執行中的任務保持原 model ID 與 pricing snapshot，不追溯改寫。
5. gateway 429、timeout、模型下架或協議不支援時，先選同 gateway、同 capability 的 approved model；沒有時回傳 `PROVIDER_UNAVAILABLE`／`partial`。
6. fixture 必須覆蓋空 catalogue、model removed、unsupported endpoint、429、timeout、空 usage、價格快照缺失與 schema refusal。

## 6. 安全與非目標

- `WENWEN_API_KEY` 僅存在 API／Worker 的 server-side secret store；不得出現在 API 回應、log、測試輸出、截圖、README 或 Git。
- 代理本身提供多個上游模型不代表可跳過內容來源、人工批准、CMS snapshot 或外鏈發布限制。
- 本文件不批准直接上游 API、模型自動切換、前端自帶 token、全自動發布或自動發送 outreach。
