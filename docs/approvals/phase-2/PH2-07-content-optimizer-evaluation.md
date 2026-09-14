# PH2-07 Content Optimizer 與 AI 評測核檢

> 文件狀態：`APPROVED / CORE IMPLEMENTATION COMPLETE v1.0`
> 建立日期：2026-09-14
> 批准日期：2026-09-14
> 批准人：Product Owner（使用者）
> 前置批准：`APPROVE PH2-05`、`APPROVE PH2-06`
> 依據：`docs/rankwoven-phase-2-prd.md` 第 9.2、10.4、12.1、13.2、20.1 節、`docs/rankwoven-phase-2-development-workflow.md`、`docs/approvals/phase-2/PH2-02-provider-selection.md`、`docs/approvals/phase-2/PH2-04-security-privacy-ssrf.md`
> 本步不啟用：公開 Content Optimizer 工具、PH2-08 頁面與選單、CMS 寫入／發布、圖片生成、外鏈草稿、Email、真實 Provider 的任意寫入副作用。

## 1. 目標與完成定義

PH2-07 將已預留但未實作的 `content_optimization_runs`、`content_score_checks`、`content_claims` API contract，完成為可重跑、可解釋、可審核的內容優化後端工作流：

```text
已同步文章／貼上內容／公開 URL
  → 安全讀取、清理與不可變快照
  → 規則式五維檢查與可解釋分數
  → AI 結構化分析或指定範圍改寫
  → Claim Ledger、來源與 SOURCE_REQUIRED gate
  → side-by-side diff、人工決定與本地草稿版本
  → 重新分析與分數比較
```

本次核心實作讓授權使用者可在 API 層建立分析與改寫任務、查看每一分的證據、檢閱 diff、批准／拒絕建議與重新分析。批量計劃的資料模型已建立，但管理／排程 API 與工作台會隨 PH2-08 導覽及介面一併完成。任何完成不代表可寫回 WordPress，也不代表內容分數或改寫會提高搜尋排名。

成功標準：

1. 同一內容快照、規則版本、prompt 版本、內容 locale 與模型 profile 的規則分可重現；快取命中不得重複建立任務、呼叫模型或扣用量。
2. 總分拆分為 On-page、Query alignment、Topical coverage、Readability、Trust & citability 五個維度；每項均有 `pass`、`warning`、`fail` 或 `not_applicable`、來源類型、權重、證據與建議。
3. 缺少可評估維度時回傳 `confidence` 與可用權重，不以中位數或 AI 推測靜默補分；AI 判斷永不覆蓋規則分。
4. 七種改寫範圍均先保存原文雜湊、差異、預期改善、風險及字數變化；生成內容必須通過 schema、claim 與政策 gate 才可進入人工審核。
5. 無來源的具體數字、案例、專業資格、作者經驗、客戶成果或外部事實必須以 `SOURCE_REQUIRED` 標示；不得生成可批准的虛構事實。
6. 批量計劃可取消、可查看 partial／failed 項目及依 PH2-05 任務治理重試；同一文章的快照變更會阻止後續寫回。

## 2. 現況與缺口

| 範圍 | 可重用能力 | PH2-07 缺口 |
| --- | --- | --- |
| 內容分數 | `apps/api/src/seoOptimization.ts` 已有 WordPress 編輯器的規則式標題、Meta、關鍵詞、連結、圖片及可讀性 score checks。 | 現有分數是單一編輯器回應，未保存為五維內容優化 run，亦沒有規則版本、confidence、Claim Ledger 或重新分析比較。 |
| API contract | `phase2FeatureRoutes.ts` 已有 `/api/v1/content-optimizations`、read、rewrite、apply、recheck 路徑與認證／idempotency 骨架。 | 寫入 route 目前只做 entitlement／價格預檢後回傳 `PROVIDER_UNAVAILABLE`；read 永遠回空 checks、claims、suggestions。 |
| 資料層 | `0010` 已建立 run、score check、claim 表；`0013`／`0014` 有 workspace scope trigger；PH2-05 有 task、ledger、dead-letter 與 rate-limit。 | 缺少內容快照、rewrite diff／版本、批量計劃、可審核決定、`not_applicable` check、claim 支持片段與 run 比較資料。 |
| AI gateway | PH2-02 已固定所有 AI 走 Breakout gateway；`AiGatewayAdapter` 支援 JSON object、refusal、truncated 與 gateway model 資料。 | 缺少 operation-specific Zod output schema、一次 schema repair、prompt injection 隔離、模型 profile／價格快照使用規則與評測執行器。 |
| Worker | Worker 已有 workspace-scoped claim、lease、retry、cost finalize／release、keyword research task 流程。 | `content_optimization` 與 `content_rewrite` task 尚未被 claim／處理，沒有 deterministic score、claim gate 或 suggestion materialization。 |
| 前端／CMS | 現有文章、SEO 建議、Apply Snapshot 與 WordPress stale check 可作相容參考。 | Content Optimizer workspace、diff 視圖、選單與批量 UI 屬 PH2-08；WordPress draft 寫入與重新讀取最新 CMS 值屬 PH2-09。 |

## 3. 範圍決策與邊界

### 3.1 輸入與內容快照

首批 API 僅接受已登入且具 `editor` 以上角色的工作區內容：

- `articleId`：已同步、屬於目標 `siteId` 的文章；由伺服器讀取現有快照。
- `content`：純文字或 HTML；只保留正文，移除 script、style、表單、導覽與可執行內容。
- `sourceUrl`：公開 `http`／`https` URL；只可由 PH2-04 的 `PublicUrlPolicy` 抓取，對 redirect、DNS、IP、MIME、大小及 timeout 重複驗證。

三者必須且只能選擇一種來源。請求另包含 `focusKeyword`、最多 20 個 `secondaryKeywords`、`contentLocale`、`targetMarket`、`dialect`、`audience`、`funnelStage`、可選 `briefId` 與不可翻譯品牌詞。API 會驗證 `briefId`、文章、站點與 workspace 關係，客戶端不可傳入 model ID、gateway endpoint、價格、規則權重或任意工具設定。

內容快照保存 source kind、canonical source URL、清理後正文、正文 hash、抓取時間、規則／prompt／schema 版本及來源 metadata。正文、prompt、模型原始回應、CMS credential 與外部原始 HTML 不得寫入一般 log、task result、audit metadata 或錯誤訊息；保存與刪除沿用 PH2-04 的正文 90 日預設保留期與 workspace／site 刪除規則。

### 3.2 五維評分與 confidence

固定 v1 權重由程式與 `rulesVersion` 管理，不能由每位使用者自由設定：

| 維度 | 權重 | 規則式證據 | AI 可補充內容 |
| --- | ---: | --- | --- |
| On-page 結構 | 25 | Title、Meta、H1–H6、Alt、內外鏈、canonical、schema 可用性 | 只可說明結構改善，不改寫規則結果。 |
| Query alignment | 25 | focus／secondary keyword 在 title、開場、heading、正文的自然出現與意圖輸入完整性 | 意圖與措辭自然度，標記 `ai_inferred`。 |
| Topical coverage | 20 | brief 中已知子題、問題、實體及競品 gap 的明確覆蓋 | 未覆蓋子題建議，不把 AI 推測當作缺失事實。 |
| Readability | 15 | 句長、段長、heading 節奏、重複開頭、語言／locale 一致性 | 可讀性說明，標記 `ai_inferred`。 |
| Trust & citability | 15 | 作者、日期、來源鏈、answer-first、可驗證 claim、結構化資料 | 只識別需要證據的位置，不驗證不存在的來源。 |

既有 `buildEditorSeoScore` 的純規則檢查會抽成可重用 adapter，保持既有 WordPress 編輯器 route 的結果與文案相容；PH2-07 在其上新增五維分類，不建立第二套互相矛盾的 On-page／Readability 分數。`not_applicable` 不計入可用權重，回應必須同時提供 `score`、`earnedWeight`、`availableWeight`、`totalWeight` 與 `confidence = availableWeight / totalWeight`。

### 3.3 改寫、Claim Ledger 與人工審核

改寫 scope 僅限以下七種：`title`、`meta`、`opening`、`paragraph`、`section`、`outline`、`full_document`。每個 scope 都要有穩定 selector／range、原文 hash、建議正文、統一 diff、變更字數、預期改善 check code、風險標籤與建議版本。

Claim Ledger 規則：

1. 模型只可重述已在輸入快照或明確來源中存在的具體事實。
2. 每個具體 claim 必須標記 `first_party_observed`、`user_asserted`、`deterministic_check` 或已驗證來源；`user_asserted` 是待作者確認，不冒充第三方驗證。
3. 無可驗證來源時，模型必須輸出 `SOURCE_REQUIRED` placeholder 與需要補充的證據類型，不能以估計、虛構數據或「常見研究顯示」取代。
4. Claim 保存 source URL、標題、擷取時間、支持片段 hash、source type 及 verification status；來源 URL 需要通過相同的安全抓取規則才可標成已驗證。
5. claim、diff 或模型輸出包含未支持的數字、案例、資格、成果、引文或 URL 時，整個改寫 suggestion 標記 `blocked`，不得進入可批准狀態。

使用者可將 suggestion 標記 `approved`、`rejected` 或建立自己的修訂版本。批准不會改寫 CMS。`POST /apply` 在 PH2-07 只進行 source snapshot preflight，任何快照不同都回 `STALE_CONTENT_SNAPSHOT`；快照相同仍回 `CMS_WRITE_DISABLED`，直到 PH2-09 通過 WordPress draft 寫入與回滾 E2E gate。

### 3.4 AI gateway、Structured Output 與任務治理

- 所有 AI 請求只使用既有 Breakout gateway 的 server-side model profile。內容分析／改寫預設使用已啟用、具 JSON output capability 的 `text.high_quality` profile；未來 fallback 也必須是同 gateway、同能力、已核驗且有價格快照的 profile。
- 使用者不得選擇 provider、模型或請求 URL。每次 run 保存 gateway、model、catalog snapshot、prompt version、schema version、price snapshot 與 sanitized task telemetry。
- Structured Output 以 Zod schema 做 runtime validation。初次 invalid JSON／schema failure 只允許一次 repair；第二次失敗、refusal 或 truncated 一律以明確錯誤碼結束，不保存半截改寫內容。
- `content_optimization` 先保存 deterministic checks，再執行 AI 分析；AI 失敗可以將 run 標為 `partial`，但不能產出可批准 rewrite。`content_rewrite` 是獨立 costed task。
- 全部 task 使用 PH2-05 idempotency、quota reserve／finalize／release、workspace／actor rate-limit、lease recovery、jitter retry、cancel、dead-letter 與 attempt audit；同輸入快取命中不重複消耗 credits。
- 外部正文、文章 HTML、引用與使用者輸入全部放入 quoted user-content 區塊，不能成為 system instruction、工具呼叫、SQL、權限或 CMS 動作。

## 4. 資料與 API 實作契約

### 4.1 Migration `0017_phase2_content_optimizer.sql`

以新 migration 擴展，絕不在 runtime route 建表，也不覆蓋既有 run：

| 資料項 | 變更 | 關鍵約束 |
| --- | --- | --- |
| `content_optimization_runs` | 加入 source kind／URL、snapshot reference、content locale、market、dialect、score、confidence、parent run。 | 同 workspace／site／input hash／版本的 terminal run 可作 cache；recheck 建立新 run 並指向 parent，不覆寫歷史。 |
| `content_optimization_input_snapshots` | 新增不可變輸入／來源快照。 | workspace、run、content hash、source kind、正文、metadata、captured time；正文不得進一般 log。 |
| `content_score_checks` | 加入 dimension、`not_applicable`、machine-readable evidence／recommendation、available weight。 | `run_id + code` 唯一；deterministic 與 AI evidence 分開標記。 |
| `content_claims` | 加入 source title、excerpt hash、fetched time、placeholder／blocked reason。 | 跨 workspace 引用拒絕；未驗證或 `SOURCE_REQUIRED` claim 不得被 apply gate 接受。 |
| `content_rewrite_suggestions` | 新增 rewrite scope、selector、before hash、after text、diff、風險、狀態、revision。 | 不覆寫已審核版本；任何 edit 產生新 revision；run／workspace scope。 |
| `content_optimization_plans`／`content_optimization_plan_items` | 新增批量計劃、排序、run／article／suggestion reference、progress 與 disposition。 | plan + article 唯一；取消不刪除已完成結果；失敗 item 可個別重試。 |

所有新表包含 `workspace_id`、`created_at`、`updated_at`，加上 FK、workspace composite constraints 與 PH2-13／14 已有的 scope trigger 擴展。migration 必須 upgrade、重放與新資料庫測試通過；不做破壞性回填或刪除。

### 4.2 API contract

既有 contract 會由 skeleton 轉為下列行為；所有寫入皆須 Bearer JWT、角色、workspace scope、`Idempotency-Key` 與 entitlement：

| Method | Endpoint | PH2-07 行為 |
| --- | --- | --- |
| `POST` | `/api/v1/content-optimizations` | 建立快照、costed analysis task 與 run，回 `202`；支援 article／inline／public URL 三種受限輸入。 |
| `GET` | `/api/v1/content-optimizations/:runId` | 回傳 run、五維 score／confidence、checks、Claim Ledger、suggestions、task 狀態與可安全顯示的 snapshot metadata。 |
| `POST` | `/api/v1/content-optimizations/:runId/rewrites` | 驗證 scope／selector，建立獨立 rewrite task。 |
| `PATCH` | `/api/v1/content-optimizations/:runId/suggestions/:suggestionId` | 審核、拒絕或建立使用者編輯 revision；不允許跨 run／workspace 操作。 |
| `POST` | `/api/v1/content-optimizations/:runId/recheck` | 使用指定或最新可用 snapshot 建立新 run，回傳分數比較所需 parent linkage。 |
| `POST` | `/api/v1/content-optimizations/:runId/apply` | 僅 stale snapshot preflight；未通過一律阻止，通過仍以 `CMS_WRITE_DISABLED` 收束至 PH2-09。 |
| `POST/GET/PATCH` | `/api/v1/content-optimization-plans...` | 已有資料表契約；建立、讀取、排程、取消及重試 API 與工作台在 PH2-08 以同一 route manifest 實作。 |

新增錯誤碼至少包括：`CONTENT_SOURCE_INVALID`、`CONTENT_SOURCE_UNSAFE`、`CONTENT_SNAPSHOT_UNAVAILABLE`、`CONTENT_LOCALE_UNSUPPORTED`、`CONTENT_SCHEMA_INVALID`、`CONTENT_OUTPUT_REFUSED`、`CONTENT_OUTPUT_TRUNCATED`、`CONTENT_CLAIM_UNSUPPORTED`、`SOURCE_REQUIRED`、`STALE_CONTENT_SNAPSHOT`、`CMS_WRITE_DISABLED`、`PLAN_ITEM_CONFLICT`。錯誤回應不含原文、prompt、provider raw response、URL DNS 詳情、token 或 credential。

### 4.3 模組邊界

為避免擴大既有大型檔案，實作會新增明確職責模組而非把 PH2-07 邏輯堆進 route：

- `apps/api/src/contentOptimizationService.ts`：輸入正規化、正文擷取、快照、規則分、claim／apply preflight orchestration。
- `packages/ai-providers/src/contentOptimizer.ts`：結構化 output type、Zod parser、diff input／result contract、gateway request builder。
- `apps/worker/src/contentOptimizationTask.ts`：claim、heartbeat、deterministic score、gateway execution、schema repair、suggestion／claim materialization 與 usage finalization。
- `apps/api/src/phase2FeatureRoutes.ts`、`apps/api/src/phase2Repository.ts`、`packages/ai-providers/src/phase2.ts`：只加入所需 schema、repository interface 與 HTTP orchestration。

現有 `seoOptimization.ts` 的 editor routes 行為保持相容；只抽取已覆蓋的純評分 helper，並以回歸測試保證既有分數不漂移。

## 5. 評測、測試與品質 gate

### 5.1 固定評測集

新增不含真實客戶正文或憑據的 versioned golden set，覆蓋 `en-US`、`en-GB`、`zh-Hant-HK`、`zh-Hans-CN`、`es-ES`、`es-MX` 的資訊、商業、交易與本地意圖。每筆 fixture 記錄：輸入 snapshot、focus／secondary keyword、預期 deterministic checks、可接受語義建議、禁止的虛構 claim、應出現的 `SOURCE_REQUIRED` 及 locale QA 期望。

評測項目：

1. deterministic score 可重現、五維權重正確、缺維度 confidence 正確、舊 editor score 不回歸。
2. Structured Output schema pass rate 目標至少 99.5%；invalid JSON、schema repair 一次、refusal、truncated、timeout、fallback 及 partial 分支皆有 fixture。
3. 虛構數字、不存在引用、偽造作者經驗／資格／案例的漏出率為 0；這些輸出必須 blocked，不得變成 approved suggestion。
4. 明確來源 URL 的 fixture 測試 Claim Ledger hash、source type、verification status；network 依賴以可控 mock 驗證，不將不穩定外網作 CI 判定。
5. 人工雙盲評分欄位為正確性、可用性、品牌符合度、語言自然度與 meaning preservation；模型／prompt 版本更新先跑離線 eval，再由少量內部工作區 canary。
6. API、Repository、Worker、PostgreSQL migration、workspace isolation、quota／idempotency、cancel、partial、dead-letter、批量 retry、stale snapshot、URL security 與 no-log regression 都必須通過。

### 5.2 實作驗收門檻

- [ ] 所有新增 migration 可重跑，並通過新資料庫 upgrade integration test。
- [ ] 同一輸入 cache hit、不同 workspace 隔離、重跑歷史與 cost reserve／finalize／release 均有測試。
- [ ] 每個總分均能展開到五維與逐項 evidence，AI 來源不覆蓋 deterministic 結果。
- [ ] 七種 rewrite scope 的 diff、revision、approve／reject、`SOURCE_REQUIRED`、blocked claim 與 locale QA 均可測試。
- [ ] `apply` 對 stale snapshot 回 `STALE_CONTENT_SNAPSHOT`，且 PH2-07 不產生任何 CMS HTTP 寫入。
- [ ] schema pass rate、citation／claim gate 與 prompt injection fixture 達標；無 High security finding。
- [ ] `npm run lint`、`npm run test`、`npm run build`、`npm run security:audit`、本地 API／Worker health smoke 全部通過。

## 6. 非目標與風險控制

- 不新增公開工具頁、內容優化前端、menu、route registry 或 sitemap。它們只能在 PH2-08 實作並重跑 SEO／孤島 gate。
- 不呼叫新的 AI provider，亦不把 Breakout API key、model ID、原始 completion 或價格資料交給瀏覽器。
- 不把 AI 生成內容直接發佈、寄送或寫入 WordPress；CMS stale read、draft push、回滾與發布驗證由 PH2-09 處理。
- 不將未驗證 AI 敘述、估算數字、來源不存在的案例或 SEO ranking 保證展示為事實。
- 不以外網 live eval 取代 deterministic CI；真實模型與來源的成本／品質 canary 需使用核准的內部 workspace 與 spending cap。

## 7. 實作順序與批准請求

1. 建立 `0017` migration、domain types、In-memory／PostgreSQL repository 與 workspace integrity test。
2. 抽取既有 pure score helper，完成 source snapshot、五維 rules、confidence、Claim Ledger 及 read API。
3. 接入 PH2-05 costed task 與 Worker analysis，建立 Breakout Structured Output、一次 repair、failure／partial／attempt handling。
4. 實作 rewrite、diff、revision、recheck 與 apply preflight；保持 CMS write disabled。批量計劃資料契約已建立，API orchestration 與 UI 併入 PH2-08。
5. 加入 golden set、AI／安全／migration／E2E contract tests，完成 lint、test、build、安全掃描與本地 smoke。

**批准門檻**：Content Reviewer、Security Reviewer、QA Reviewer 確認本文件的 claim gate、locale、資料保留、評測集與「PH2-07 不寫 CMS」邊界後，使用者回覆 `APPROVE PH2-07`。收到批准前，不建立 migration、不接通內容 AI runtime、不修改 API 行為、不啟動 CMS 寫入。

## 8. 實作結果（2026-09-14）

- `0017_phase2_content_optimizer.sql` 已建立內容快照、可解釋 checks、Claim Ledger 延伸、rewrite suggestion revision 與 batch plan 資料結構，並在本機 PostgreSQL 完成 upgrade 與重放。
- `POST /api/v1/content-optimizations` 現在要求唯一來源、focus keyword、server-side high-quality profile、價格快照、entitlement 與 idempotency；相同輸入會返回既有 run，不會重複扣用量。
- Worker 已處理 `content_optimization` 與 `content_rewrite` task：deterministic 五維分數先保存，Breakout JSON output 由 Zod 驗證，invalid output 僅修復一次；refusal、truncated、schema failure 與 `SOURCE_REQUIRED` 會保留可追溯狀態。
- `GET` run、rewrite、approve／reject、recheck 與 CMS apply preflight 已可用；apply 固定回 `CMS_WRITE_DISABLED`，未發出任何 CMS 寫入請求。
- 新增 golden-style deterministic／rewrite contract fixture、API snapshot／CMS-disabled regression；全倉 lint、test、build、安全掃描、本機 health 和 migration 驗證已通過。

仍不對外開啟：PH2-08 的 Content Optimizer 頁面、選單、route manifest 與批量計劃 API orchestration；PH2-09 的 CMS draft 寫入；實際模型工作需先在管理端配置已核驗的 `text.high_quality` profile、價格快照與 entitlement，且先於內部 workspace canary。
