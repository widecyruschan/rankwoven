# PH2-06 Keyword Intelligence 核檢

> 文件狀態：`APPROVED / IMPLEMENTATION_COMPLETE v1.0`
> 建立日期：2026-09-14
> 批准日期：2026-09-14
> 批准人：Product Owner（使用者）
> 前置批准：`APPROVE PH2-05`
> 依據：`docs/rankwoven-phase-2-prd.md` 第 9.1、10、12 節、`docs/rankwoven-phase-2-development-workflow.md`、`docs/approvals/phase-2/PH2-02-provider-selection.md`、`docs/approvals/phase-2/PH2-05-data-usage-task-governance.md`
> 本步不啟用：production DataForSEO／Ahrefs／Semrush 出站、公開工具結果頁、AI 內容生成、CMS 寫回或自動外鏈。

## 1. 範圍與成功標準

PH2-06 將現有一次性關鍵詞建議入口，升級為可持久化、可重跑、可追溯的 Keyword Intelligence 研究流程：

```text
種子詞／站點／競品
  → 輸入驗證與去重
  → Provider 搜尋量／排名資料
  → AI 語義、問題、實體與修飾詞擴展
  → 意圖與主題聚類
  → 自有站 GSC 對照
  → 競品 Top 100 與 Gap
  → Opportunity Score／來源標籤
  → 保存快照／內容 brief
```

完成標準：

1. 研究專案和每次 run 可在重新登入後查看，重跑形成新快照，不覆蓋歷史。
2. 每個數值型欄位都有 provider、sourceType、location、language、device、collectedAt、methodology／snapshot 參照；缺資料顯示 unavailable，不用 AI 補數字。
3. 同一輸入、同一 provider snapshot 和同一模型版本命中快取時，不建立第二個外部請求或第二筆用量 reserve。
4. 競品 Top 100、Missing／Weak／Strong／Shared gap 可分頁、篩選、匯出和轉成 content brief。
5. AI 輸出只產生候選詞、intent、cluster、內容角度和 confidence；所有搜尋量、CPC、difficulty、排名、ETV 只接受授權 Provider／GSC 資料。
6. Provider timeout、429、partial、schema refusal、價格快照缺失和 workspace quota 均按 PH2-05 任務治理處理，重試不重複計費。

## 2. 現況盤點

| 範圍 | 現有能力 | PH2-06 缺口 |
| --- | --- | --- |
| 即時建議 | `apps/api/src/keywordSuggestions.ts` 已有 AI outline／模板候選、DataForSEO keywords-for-keywords、Ahrefs、Semrush、generic metric enrichment 和 GSC map 合併。 | 只有單次回應；沒有 project／run／snapshot／competitor gap 保存，也沒有統一的 provider metadata。 |
| Provider 設定 | `KEYWORD_VOLUME_PROVIDER` 保持既有 generic／DataForSEO 系列；Ahrefs 使用獨立的 `AHREFS_*` 變數，Semrush 使用 `SEMRUSH_*`。 | 需要 capability adapter、請求輸入標準化、retry／rate policy、raw response hash 及 sourceType 一致化。 |
| 研究資料 | `0010`–`0014` 已有 `keyword_research_projects`、`keyword_research_runs`、`keyword_candidates`、`keyword_clusters`、`competitor_domains`、`competitor_keyword_snapshots` 和 `content_briefs`。 | 現有 run、candidate、competitor snapshot 不足以保存自有站 observation、指標維度、gap classification 與 Opportunity Score。 |
| API | project 建立／列表／詳情已存在；run、keywords、gaps、brief route 仍是 skeleton 或 `PROVIDER_UNAVAILABLE`。 | run 必須走 PH2-05 atomic enqueue；列表和 gap 必須真的讀 snapshot，不能返回空陣列假裝完成。 |
| 前端 | `/app/keywords` 是相容入口，planned `/app/research` 與 `/app/sites/:siteId/research` 尚未啟用。 | UI 留待 PH2-08；本步只提供穩定 API／資料契約，避免新頁面先於資料真相落地。 |

## 3. 產品輸入與邊界

### 3.1 研究專案

建立 project 需要：

- `siteId`：目前 workspace 已連接站點，伺服器驗證歸屬。
- `name`：1–160 字元。
- `market`：國家／地區或 Provider 支援的 location code。
- `language`：BCP 47 或 Provider 對應語言代碼。
- `device`：`desktop` 或 `mobile`。
- `engine`：PH2-06 只允許 `google`。

每個 run 需要：

- `seedKeywords`：1–20 個，正規化後不可重複；單詞長度上限 300。
- `ownDomain`：可選；若提供，必須是公開 canonical domain 並屬於已連接 site。
- `competitorDomains`：0–5 個；只保存正規化 hostname，不接受 path、userinfo、localhost、private IP 或非 HTTP(S) origin。
- `productContext`、`audience`、`conversionGoal`：可選，合計大小受限；只作 AI 語義上下文，不作數值指標來源。
- `locale`：內容輸出／AI intent 語言；研究的 market、language、device 仍是獨立欄位。

客戶端不得指定 provider、model、price snapshot、location code 或任意 API endpoint；由 project／workspace policy 和管理端 profile 決定。

### 3.2 與現有即時入口的相容

`POST /api/v1/keyword-suggestions` 保留作舊插件／頁面的即時候選入口，但必須：

- 只返回有明確 `sourceTrace` 的候選；沒有第三方指標時標記 estimated，不能稱作真實搜尋量。
- 不寫入研究 project 或 snapshot，不繞過 PH2-05 quota；若日後改為持久化，必須經新 run route。
- DataForSEO、Ahrefs、Semrush 不在同一個 response 中混合成一條不可比的時間序列；回應只顯示一個 canonical metric provider。
- Provider API key 永遠 server-side；Semrush 等 query-key 請求不得進一般 URL 日誌、referrer 或 error message。

## 4. Provider 與 AI 工作流

### 4.1 Provider adapter

新增 `KeywordResearchProvider` capability-oriented interface（放入既有 `@aieo/ai-providers` contract）：

```ts
interface KeywordResearchProvider {
  readonly id: 'dataforseo' | 'ahrefs' | 'semrush';
  getCapabilities(): Promise<KeywordResearchCapabilities>;
  discoverKeywordMetrics(input: KeywordMetricsInput): Promise<KeywordMetricsResult>;
  getCompetitorRankedKeywords(input: CompetitorRankedKeywordsInput): Promise<RankedKeywordResult>;
}
```

Provider 結果必須包含：`provider`、`providerSnapshotId`、`methodologyVersion`、`location`、`language`、`device`、`collectedAt`、`providerUpdatedAt`、`sourceType='provider_estimated'`、row count、cost units 及 raw response hash／加密 object reference。原始回應只作短期受控除錯，不放入 task payload 或普通日誌。

選型遵循 PH2-02：

1. DataForSEO 是平台主 Provider，負責 keyword metrics、SERP／競品 ranked keywords 與後續 gap 所需的市場資料。
2. Ahrefs／Semrush 只作 Enterprise／Agency BYOK adapter；其 units、database、原生 authority 指標與 DataForSEO 完全分開。
3. Provider 不可用時返回 `PROVIDER_UNAVAILABLE` 或 `partial`；不可由 AI 估算 volume、CPC、difficulty、rank、ETV 或 traffic。
4. DataForSEO／BYOK adapter 都要使用 PH2-05 provider limiter、circuit 和 timeout；API key 變數不得由客戶端 override。

### 4.2 AI 擴展與聚類

AI 只經既有 Breakout gateway，使用已批准的 model profile；不得建立 OpenAI／Anthropic／Google 直連。輸入到模型的 Provider／GSC／競品內容放在 user data 區，不可成為 system instruction。

Structured output 只允許以下欄位：

```json
{
  "keyword": "eco-friendly yoga mat",
  "intent": "commercial",
  "parentTopic": "yoga mat",
  "contentAngle": "材料、認證與耐用性比較",
  "language": "en-US",
  "confidence": 0.82
}
```

工作順序：

1. 由 deterministic normalizer 對大小寫、Unicode 空白、標點、語言變體和重複詞做 canonical hash。
2. AI 以 seed、產品／受眾上下文生成語義相關詞、問題詞、實體詞、修飾詞及內容角度；最多 200 個候選，超出截斷並記錄 partial。
3. runtime schema validation、locale validation 和 safety policy 通過後才寫入 `keyword_candidates`；欄位缺失不自動補數值。
4. 優先使用 Breakout embedding model 產生 embedding hash，再用 deterministic clustering（相似度閾值、最小群組大小和版本化規則）建立 `keyword_clusters`；embedding 不可用時使用 deterministic token／parent topic fallback，明確標記 `ai_inferred` 或 `deterministic_check`。
5. 意圖分類與聚類結果均保存 model id、prompt／schema／rules version、confidence 和生成時間；模型變更會建立新 run／cluster version，不覆蓋舊結果。

## 5. 指標、GSC 與 Gap 定義

### 5.1 指標與來源分離

建議以 `0016_phase2_keyword_intelligence.sql` 新增 `keyword_metrics`：每行只描述一個 candidate、run、metric、source 和維度，包含：

```text
workspace_id, run_id, candidate_id, metric_name, numeric_value,
provider, source_type, provider_snapshot_id, location, language,
device, collected_at, provider_updated_at, methodology_version,
confidence, raw_response_ref
```

`metric_name` 允許 `volume`、`cpc_usd`、`competition`、`difficulty`、`trend`、`gsc_clicks`、`gsc_impressions`、`gsc_ctr`、`gsc_position`；GSC 指標必須是 `first_party_observed`，第三方值必須是 `provider_estimated`，AI 不可寫入上述數值 metric。

### 5.2 自有站 observation

新增 `keyword_observations` 保存指定 run 對自有站／競品的排名觀測：`domain_type`（`own`／`competitor`）、`domain_id`、`candidate_id`、`rank`、`url`、`etv`、`serp_features`、`source_type`、`collected_at`。GSC 的曝光／點擊不當成競品排名；兩者在 UI／API 分開顯示。

### 5.3 Gap classification

新增 `keyword_gap_snapshots` 保存每個 run 的可重現 classification：

| 分類 | 判定（按指定 market／language／device／provider） |
| --- | --- |
| `missing` | 至少一個競品自然排名 1–100，自有站沒有 observation。 |
| `weak` | 自有站與競品均有 1–100 observation，但自有站排名低於競品最佳排名，或自有站排名大於 20。 |
| `strong` | 自有站排名 1–10，且不低於所有已觀測競品最佳排名；保留比較證據。 |
| `shared` | 自有站與競品均在 1–100，但不符合 strong／weak；保留自有與競品排名。 |

classification 有固定優先順序 `missing → strong → weak → shared`，同一 candidate／run 只保存一個結果，避免 UI 同時出現互相矛盾的 gap 標籤。缺少自有站 observation 時不可推斷為 0 名。

### 5.4 Opportunity Score v1

沿用 PRD 的可解釋權重，score 與 confidence 分開保存：

| 維度 | 權重 | 可用來源 |
| --- | ---: | --- |
| Demand | 30 | Provider volume／trend 或 GSC impressions；來源缺失時維度 unavailable。 |
| Attainability | 25 | Provider difficulty、SERP competition、自有／競品 rank。 |
| Business fit | 20 | 用戶 product／conversion context 加人工優先級；不是 Provider 事實。 |
| Existing traction | 15 | 自有 GSC clicks、impressions、CTR、position。 |
| Freshness／momentum | 10 | trend、競品新／失排名與 collectedAt。 |

缺少維度時採「可用維度重新歸一化 + confidence 降低」的明示公式，不用中位數靜默填充；不同 Provider 不能共用同一 score snapshot。

## 6. 資料模型與 migration

`0016` 必須可在空庫及已套用 `0015` 的資料庫執行，禁止刪除或重寫歷史 ledger。新增／變更：

- `keyword_metrics`：數值指標與來源維度；`(run_id, candidate_id, metric_name, provider, collected_at)` 有索引。
- `keyword_observations`：own／competitor rank observation；workspace、run、domain、candidate 複合外鍵防止跨 workspace。
- `keyword_gap_snapshots`：classification、own／competitor rank、evidence refs、score、confidence；`(run_id, candidate_id)` 唯一。
- `keyword_research_runs`：補 `request_context_hash`、`provider_methodology_version`、`collected_at`、`partial_reason`；輸入原文只保存最小必要內容或 hash。
- `keyword_candidates`：補 `opportunity_score`、`score_confidence`、`model_version` 或改由 score table 參照；不得把 GSC 與 Provider 數字覆寫到同一欄位。
- `competitor_keyword_snapshots`：保留作相容讀模型；新 worker 以 `keyword_observations` 作 canonical，待 PH2-06 E2E 穩定後再另立舊資料回填／退役計劃。

所有新 foreign key 必須帶 workspace scope；任意跨 workspace ID 固定返回 `WORKSPACE_RESOURCE_NOT_FOUND`，不洩露資源存在與否。

## 7. API 契約

| Method | Endpoint | Auth | PH2-06 行為 |
| --- | --- | --- | --- |
| `POST` | `/api/v1/keyword-research/projects/:projectId/runs` | `editor+` | 通過 Zod、project scope、PH2-05 rate／quota、cache／idempotency 後返回 `202 { taskId, runId, provider, estimatedCredits }`。不接受 client provider override。 |
| `GET` | `/api/v1/keyword-research/runs/:runId` | `viewer+` | 返回 status、progress、provider／snapshot、partial reason、cost、attempt summary 與 freshness；不返回 raw payload。 |
| `GET` | `/api/v1/keyword-research/projects/:projectId/keywords` | `viewer+` | 支持 `intent`、`cluster`、`sourceType`、`minVolume`、`maxDifficulty`、`sort`、`page`、`pageSize`；所有 filter 於 workspace／project scope 執行。 |
| `GET` | `/api/v1/keyword-research/projects/:projectId/gaps` | `viewer+` | 支持 `classification`、`competitorId`、`page`、`pageSize`；返回 canonical provider、觀測日期與 evidence refs。 |
| `POST` | `/api/v1/keyword-research/projects/:projectId/briefs` | `editor+` | 只接受已有 `candidateId`；把 primary／secondary keywords、cluster、intent、source refs、outline 保存成 brief。 |
| `GET` | `/api/v1/keyword-research/projects/:projectId` | `viewer+` | 返回 project、最新 run、canonical provider、資料 freshness 和可用 filter metadata。 |

錯誤行為：`QUOTA_EXCEEDED`、`PROVIDER_UNAVAILABLE`、`PRICE_SNAPSHOT_UNAVAILABLE`、`PARTIAL_RESULT`、`WORKSPACE_RESOURCE_NOT_FOUND`、`IDEMPOTENCY_KEY_REUSED` 沿用既有 contract。未配置或未批准的 Provider 不建立不可消費 task；不返回 AI 估算的數值。

## 8. Worker 與成本治理

1. API 以 `enqueueCostedTask(operation='keyword_research', featureKey='keyword_research')` 取得 PH2-05 reservation；同一 request hash／provider snapshot／model version replay 不再 reserve。
2. Worker claim 後依 `provider_key` 執行：metrics／competitor rows、AI expansion、embedding／cluster、GSC merge 和 gap materialization 可作可恢復的 stage；每 stage 更新 progress 和 partial result，不保存正文／prompt。
3. DataForSEO task、返回 row 上限與 AI token 預估均納入 `estimatedCredits`；Provider 429／timeout 使用 PH2-05 backoff，成功或已知 partial 才 finalize，無外部成本才 release。
4. Provider 無結果、region unavailable 或 GSC incomplete 不等同於 0；run 記為 `partial`／`unavailable`，UI 必須同時顯示 source 和 freshness。
5. 快取 key 至少包含 `workspaceId`、project input hash、provider、provider snapshot、market、language、device、engine、AI model／prompt／rules version；快取命中只讀既有 snapshot，不執行新的 provider request。
6. 競品最多 5 個、每個最多 Top 100 observation；大型結果必須分頁／批次，禁止一次返回全部 payload。

## 9. 安全、私隱與資料品質

- competitor domain 只作標準化識別和 provider input；若未來需要抓取頁面，必須重新通過 PH2-04 `PublicUrlPolicy`，本步不直接 fetch 任意 competitor URL。
- Provider／GSC secret 只留在 server-side encrypted config；不進 route response、task payload、Redis、audit metadata 或普通日志。Semrush URL query key 必須在 transport／access log 層 redact。
- Provider result、GSC query、競品 title／snippet、AI 內容全部是不可信資料；只能作 user data，不能改寫 system prompt、工具權限或 SQL。
- 研究輸出刪除／匯出沿用 workspace retention；raw response 只保存 hash／短期加密參照，長期保存 normalized rows、來源與版本。
- 候選詞正規化、Provider source labels、GSC first-party labels 和 AI inferred labels 不可互換；UI 不用單一顏色掩蓋來源差異。

## 10. 驗收與評測

### Contract／integration

- 空庫與 `0015` schema 套用 `0016` 成功，重跑安全 skip；所有 FK／unique／workspace trigger 可驗證。
- 同一研究輸入並發請求只建立一個 run／task／reserve；不同 provider snapshot 建立新 snapshot，不覆蓋舊資料。
- Provider fixture 覆蓋 success、empty、partial、timeout、429、5xx、invalid schema、價格快照缺失、region unavailable；所有回應不洩露 key 或 raw body。
- Top 100、最多 5 competitor、分頁、filter、Missing／Weak／Strong／Shared classification 具固定 golden fixture。
- GSC 自有資料與 Provider 估算在 API response、score 和 export 中分開；跨 workspace project／run／candidate／snapshot 一律 404。

### AI／SEO quality

- intent／cluster 人工標註集 macro F1 目標不低於 0.85；不同 locale 至少涵蓋 `en-US`、`en-GB`、`zh-Hant-HK`、`zh-Hans-CN`、`es-ES`、`es-MX`。
- Provider numeric source completeness 100%；AI fabricated volume／rank／traffic 容許率為 0。
- normalized duplicate candidate rate、score confidence、partial reason、freshness 和 provider snapshot 在每次 run 可重現。
- 相同輸入的 cache hit 不發出 provider request、不增加 usage ledger、且仍返回歷史 source／collectedAt。

## 11. 非目標、風險與批准門檻

### 非目標

- 不在 PH2-06 開放公開 `/tools/keyword-research` runtime，不把即時工具輸入保存為公開 URL。
- 不在本步加入 backlinks、AI visibility、內容全文生成、CMS 寫回、付款或自動寄送。
- 不把 Ahrefs／Semrush units 轉成 DataForSEO 數值，也不把任何 Provider authority 指標改名成通用「SEO 權重」。

### Open risks

1. DataForSEO／Ahrefs／Semrush 的正式 ranked-keyword endpoint、rate、row cost 和 retry header 需在出站前以官方帳戶與 fixture 再核實；未核實時保持 `PROVIDER_UNAVAILABLE`。
2. 現有 DataForSEO／Ahrefs／Semrush 即時 enrichment 與新研究 adapter 會短期並存；需以 contract test 保證舊入口不改 source semantics。
3. GSC query 維度與 Provider rank 不是同一觀測，score 只能按明確 source 權重合併，不能宣稱完整 search log。
4. `keyword_observations` 與舊 `competitor_keyword_snapshots` 的相容讀模型需在 PH2-06 E2E 後另立退役時間，不在本步刪資料。

### 核檢清單

- [x] 已對照現有 keyword suggestion service、Provider 設定、Phase 2 migration／Repository／API skeleton 與 GSC merge。
- [x] 已定義輸入上限、Provider／AI 邊界、sourceType、GSC 分離、Top 100、Gap classification、Opportunity Score 與 cache key。
- [x] 已定義 `0016` migration、API、Worker stage、quota、partial、security、quality eval 和 rollback 邊界。
- [x] Product Owner 已於 2026-09-14 明確批准 PH2-06。
- [x] `0016` schema、Provider adapters、研究 API、Worker materialization、cache、Gap、score、brief 與測試已完成。
- [x] 真實 DataForSEO／Ahrefs／Semrush 只有在 server-side 環境配置 key 後出站；fixture、quota、workspace isolation、invalid response 與不洩漏密鑰測試已通過。

## 12. 實作證據與驗證結果

### 已實作

- `db/migrations/0016_phase2_keyword_intelligence.sql`：新增 `keyword_metrics`、`keyword_observations`、`keyword_gap_snapshots`，補 run input context、provider metadata、score 欄位與 workspace 複合約束／trigger。
- `packages/ai-providers/src/keywordResearch.ts`：DataForSEO、Ahrefs、Semrush adapter，統一 metrics／ranked keyword 結構、snapshot hash、Top 100 cap、timeout 與錯誤碼；所有 key 只作 server-side Authorization／必要的 provider query。
- `packages/ai-providers/src/phase2.ts`、`apps/api/src/phase2Repository.ts`：新增 Keyword Intelligence shared types、candidate／metric／observation／gap／brief repository、研究 run cache lookup 與 workspace-scoped pagination。
- `apps/api/src/keywordResearchService.ts`、`apps/api/src/phase2FeatureRoutes.ts`、`apps/api/src/server.ts`：依現有 config 選 canonical provider，研究 run 執行輸入驗證、quota／idempotency、同輸入 cache hit、Gap／keyword／brief API。
- `apps/worker/src/index.ts`、`apps/worker/src/phase2TaskState.ts`：keyword research task stage，保存 Provider metrics、AI／deterministic candidate、competitor observations、missing gap、Opportunity Score、run／usage terminal state；AI 只經 Breakout gateway。
- `docker-compose.yml`、`docker-compose.prod.yml`：將既有 keyword provider 設定以環境變數傳給 Worker，不提交任何 `.env` 或 key。
- `docs/openapi/phase2-contract.yaml`：同步研究 task response 的 `runId`、`provider`、`cacheHit` 與新 status。

### 驗證

- 本機 `0016` migration 已由既有 `0015` 升級成功，重放及全新臨時資料庫 migration 均通過。
- Provider fixtures：DataForSEO／Ahrefs／Semrush metrics、Top 100、HTTP 429、invalid response 與 error-body redaction 通過。
- API／Worker／Repository：研究 run idempotency、cache hit 不重複 reserve、Provider materialization、candidate／metric／observation／gap／brief workspace isolation 通過。
- 全倉 `npm run lint`、`npm run test`、`npm run build`、`npm run security:audit` 通過；本地 API `/health` 與 Docker API／PostgreSQL／Redis／Worker 均正常。

**Open risks**：Provider 正式 ranked-keyword endpoint、rate／retry-after、row cost 與帳戶條款仍需在真實出站前重新核實；GSC own-rank materialization 將在接入正式 GSC task 時補上；舊 `competitor_keyword_snapshots` 相容退役另行排期。公開 `/tools/keyword-research`、自動內容生成、CMS 寫回、付款與 email 仍受後續 gate 控制。

**Decision**：`APPROVED / IMPLEMENTATION_COMPLETE`。

**Approved by**：Product Owner（使用者）

**Approved at**：2026-09-14

**後續 gate**：可進入 `PH2-07` Content Optimizer；啟用 production SEO provider 前需確認 server-side key、正式 API 契約、限流與成本 snapshot。

**批准後實作順序**：先 `0016` schema／shared adapter contract → DataForSEO sandbox fixture → Repository／run enqueue → Worker metrics／competitor／AI expansion／cluster／gap → API pagination／brief → integration／quality／security tests。未完成上述 gate 前，不啟用 production provider 或對外公開工具。
