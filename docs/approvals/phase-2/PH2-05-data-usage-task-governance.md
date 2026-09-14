# PH2-05 基礎資料、用量與任務治理核檢

> 文件狀態：`APPROVED / IMPLEMENTATION_COMPLETE v1.0`
> 建立日期：2026-09-14
> 批准日期：2026-09-14
> 批准人：Product Owner（使用者）
> 前置批准：`APPROVE PH2-00`、`APPROVE PH2-01`、`APPROVE PH2-02`、`APPROVE PH2-03`、`APPROVE PH2-04`
> 依據：`docs/rankwoven-phase-2-prd.md`、`docs/rankwoven-phase-2-development-workflow.md`、`docs/approvals/phase-2/PH2-02-provider-selection.md`、`docs/approvals/phase-2/PH2-04-security-privacy-ssrf.md`
> 本步不啟用：真實 DataForSEO／Ahrefs／Semrush 請求、Breakout 內容生成、公開站點體檢路由、CMS 寫回、Stripe webhook、任何外部發佈或收費。

## 1. 範圍與成功標準

PH2-05 要把 PH2-03 已建立的資料契約，補足為可在多個 Worker 下安全運行的治理底座。目標是讓後續 PH2-06 至 PH2-11 的成本型工作都遵守同一套租戶隔離、配額、重試、死信與可觀測性規則。

本步完成後必須滿足：

1. `keyword_research_*`、`content_optimization_*`、`usage_ledger`、`entitlement_assignments`、`phase2_tasks` 與 `task_attempts` 的資料關係可追溯、可做 workspace 隔離驗證。
2. 每個成本型任務以單一交易完成「同一 idempotency key 重播判定 → entitlement／配額核驗 → reserve → 建立 task → audit event」；重播不得重複保留額度或建立第二個任務。
3. Worker 以 PostgreSQL durable queue 取件，具 workspace 公平性、租約、逾時回收、取消確認、指數退避、供應商限流、熔斷與 dead-letter 操作紀錄。
4. 用量只追加 `reserve`、`finalize`、`release` 事件；Stripe 僅在 PH2-11 改變 entitlement，絕不作 request-time quota 的真相來源。
5. 公開／成本型 API 與 Worker provider 呼叫均有共享限流和 abuse 防護；Redis 無法使用時，成本型新任務安全拒絕，不退化為無限制呼叫。
6. 所有任務嘗試均能以 `requestId`、`taskId`、provider、model、價格快照、cache、retry、fallback、錯誤碼與成本串連；不保存 prompt、正文、憑據或原始 provider payload 到一般日誌。

## 2. 現況盤點與缺口

| 範圍 | 已有基礎 | PH2-05 缺口與處置 |
| --- | --- | --- |
| 基礎資料 | `0010`–`0014` 已建立研究、內容、任務、用量、entitlement、attempt、workspace trigger 與 idempotency 契約。 | 新增 task queue governance 欄位、attempt telemetry 與 dead-letter disposition，維持既有資料可讀。 |
| 帳本 | `usage_ledger` 有 `reserve/finalize/release`、reservation 唯一 terminal event 與 append-only trigger。 | 現有週期用量只加總 reserve，release 後仍佔額度；reserve、task、idempotency 不是同一交易，併發時可超額。 |
| 任務 | `phase2_tasks` 可 workspace scoped，`task_attempts` 有 workspace FK；Worker 使用 `FOR UPDATE SKIP LOCKED`。 | Phase 2 Worker 只處理 `gateway_model_sync`，沒有 `available_at`、lease、timeout、cancellation requested、provider queue key 或跨 workspace 公平排程。 |
| 重試 | `getPhase2RetryDelayMs` 已有上限的指數退避，失敗可進 dead-letter。 | Phase 2 failure 沒寫下一次可執行時間，會立即重試；沒有 jitter、retry 分類、provider idempotency／未知結果的 reconciliation 策略。 |
| 取消與死信 | API 可取消 queued／running task；既有同步任務有死信流程。 | running task 被直接標成 cancelled，Worker 未確認是否已停止；Phase 2 dead-letter 尚無 replay／ignore 審計，亦無 reservation 結算規則。 |
| 限流 | Fastify 以 `request.ip` 提供全域 `RATE_LIMIT_MAX`／window；PH2-04 已收斂 trusted proxy。 | 沒有按 workspace、actor、URL fingerprint、成本型 route、provider 或並發數的 shared policy；多實例下不能依賴 process-local counter。 |
| 可觀測性 | Fastify request id、audit event、task attempt、provider/model 契約已有。 | attempt 未完整保存 provider、model、cache、latency、retry after、fallback、request context；worker log 未形成統一事件結構。 |

## 3. 核心設計決策

### 3.1 事實來源與資料庫變更

任務的持久狀態一律留在 PostgreSQL；Redis 不承載唯一任務資料，也不決定最終用量。理由是 task、reservation、attempt、audit 與 workspace scope 必須可在資料庫交易內一起驗證與復原。

批准後建立 `0015_phase2_task_governance.sql`。它只新增欄位、索引、constraint 與表，不重寫既有用量事件：

| 對象 | 新增內容 | 用途 |
| --- | --- | --- |
| `phase2_tasks` | `provider_key`、`available_at`、`lease_owner`、`lease_expires_at`、`started_at`、`deadline_at`、`cancellation_requested_at`、`request_id`、`replay_of_task_id`、`priority` | 找到可執行工作、原子 claim、回收故障 worker、同一供應商治理、取消確認與 replay 可追溯。 |
| `usage_ledger` | `task_id`、`request_id` 的 nullable 追蹤欄位及 task／reservation 查詢索引 | 讓帳本事件可回到建立它的任務與請求；既有事件不強制回填不可確定資料。 |
| `task_attempts` | `request_id`、`provider_key`、`gateway_model`、`cache_state`、`fallback_from`、`retry_after_ms`、`latency_ms`、`estimated_cost` | 記錄嘗試而非原始輸入；保留既有 `provider_request_id`、`error_code`、`cost`。 |
| `phase2_task_dead_letter_actions` | task、workspace、action（`replay`／`ignore`）、actor、replacement task、reason、created time | 原始 dead-letter 不可被覆寫；每次人工處置有 audit trail。 |

`phase2_tasks.status` 會新增 `cancellation_requested`，並只放寬以下合法轉換：

```text
queued -> running | cancelled | expired
running -> queued | partial | completed | failed | cancellation_requested | expired
cancellation_requested -> cancelled | partial | failed | expired
failed -> queued | dead_letter
```

其中 `running -> queued` 只表示可重試的排程回退，必須同時設定未來的 `available_at`。`dead_letter`、`completed`、`cancelled` 與 `expired` 仍是不可覆寫的終態；重跑會建立新的 task 並以 `replay_of_task_id` 相連。

### 3.2 原子配額與 append-only 帳本

使用者可用額度按 feature／operation 的 period 計算：

```text
available_units = entitlement.limit_value
                - finalized_units_in_period
                - active_reserved_units_in_period
```

- `active_reserved_units` 是有 `reserve` 但尚無相同 `reservation_id` 的 `finalize` 或 `release` 事件。
- `finalized_units` 只計已成功或已確認 partial 成本的 finalization；`release` 永不扣除配額。
- 同一 reservation 僅可有一個 terminal event，現有唯一索引繼續強制此不變量。
- 額度以 operation 的計費單位保留。`actual_cost` 用於成本與毛利，而非把不同 provider 的金額混成同一 credit 真相。

新增 Repository service `enqueueCostedTask`，在單一 PostgreSQL transaction 中執行：

1. 以 workspace、method、route、idempotency key advisory lock 取得重播互斥。
2. 已有相同 request hash 時直接回傳既有 response；不同 hash 回傳 `IDEMPOTENCY_KEY_REUSED`。
3. 以 workspace、feature、period 起點的 advisory lock 讀取 active entitlement，計算 finalized + active hold。
4. 額度不足回傳 `429 QUOTA_EXCEEDED`，不寫 task、reserve 或 provider request。
5. 寫入 reserve、task、idempotency response 與最小 audit metadata，然後回傳 `202`。

Worker 的結算規則如下：

| 結果 | task 狀態 | reservation 動作 |
| --- | --- | --- |
| 外部請求前驗證失敗、queued 取消 | `failed`／`cancelled` | `release` |
| 完整成功 | `completed` | `finalize` 實際成本 |
| 有可確認成本的部分結果 | `partial` | `finalize` 實際成本，結果標示不完整原因 |
| 可重試 timeout／429／5xx | `queued` + 未來 `available_at` | 保持 active reserve，不重複 reserve |
| 外部結果未知 | `failed` 或受控重試 | 先用 provider request id／外部 idempotency key reconciliation；未確認前不 release，也不建立第二筆 charge |
| dead-letter ignore | `dead_letter` 不變 | 尚未結算的 reserve 依「無外部成本」證據 release；已知成本維持既有 finalize |

重跑 dead-letter 時，若原 reservation 仍是 active hold，replacement task 沿用該 reservation，避免平台與使用者雙重計費；若原 reservation 已 finalize 或 release，則依新請求、現行 entitlement 與 idempotency 規則決定是否建立新 reservation。

### 3.3 Tenant-aware queue、租約與超時

Worker 不在資料庫 transaction 內等待外部 provider。claim 使用 `FOR UPDATE SKIP LOCKED`，在一個短交易中：

1. 將過期 lease 的 running task 記為一次 `LEASE_EXPIRED` attempt，按 retry policy 放回 queued 或送入 dead-letter。
2. 只選 `status = queued AND available_at <= now()` 的 task；每個 workspace 先選一筆最早到期／最高 priority 的候選，再在 workspace 候選間按 `available_at`、priority、created time 排序。這可避免一個高流量 workspace 壟斷 worker。
3. 原子寫入 `running`、`lease_owner`、`lease_expires_at`、`started_at`，並建立 attempt。Worker 每 15 秒延長 lease；任何完成或失敗寫入均要求相同 `lease_owner`。
4. 外部呼叫使用 `AbortController` timeout。初始預設：gateway catalog 30 秒、AI text／SEO provider 120 秒；具 CMS 副作用的 handler 留待 PH2-09 定義，不能套用本步預設。

任務 payload 的敏感資料不放在 queue 欄位或 Redis。後續 handler 以 task id 回讀 workspace scoped domain record；CMS／BYOK credential 仍只由 server-side encrypted store 取得。

### 3.4 重試、限流與熔斷

重試只適用於明確 retryable 的 transport timeout、DNS／connection transient error、provider 429、provider 5xx 與 lease expiry。驗證錯誤、權限錯誤、配額不足、schema 不相容、未授權 target 與 provider 明確 4xx 一律不重試。

```text
delay = min(maxDelay, baseDelay * 2^retryCount) + 0% 至 20% jitter
```

- 預設 `baseDelay=5s`、`maxDelay=10m`；429 優先採 provider `Retry-After`，但不得超過 task deadline。
- AI transport retry 最多一次；PH2-07 才可另加一次 schema repair，不把 schema refusal 當 transport retry。
- 每個 provider handler 需宣告 `externalIdempotency` 或 `reconcileBeforeRetry` 能力；未知結果不得盲目再次發出可能計費或有副作用的請求。

Redis 使用原子 Lua token bucket 實作跨 API／Worker 實例的 provider limiter 與 circuit breaker：

| 範圍 | key 維度 | 初始政策 | 行為 |
| --- | --- | --- | --- |
| 全域 API | trusted client IP | 維持現有 100 requests／分鐘 | 提早擋掉一般 flood，保留統一 `RATE_LIMIT_EXCEEDED` response。 |
| 登入／重設密碼 | IP + 正規化帳號 hash | 5／分鐘、20／小時 | 防止 credential stuffing；不記錄明文 email。 |
| 未來公開 audit | IP + URL hash | 5／小時、同 URL 3／日、每 IP 1 個 running | PH2-05 只提供 policy；公開 route 由 PH2-10 批准後才啟用。 |
| 成本型建立任務 | workspace + actor + operation | actor 5／分鐘、workspace 20／分鐘、workspace 最多 3 個 running | idempotency replay 不消耗第二個 provider token。 |
| provider 呼叫 | provider + operation | 保守預設由設定檔注入，未取得正式 provider quota 前不提高 | limiter 在真正出站前取得 token，並記錄等待時間。 |

同一 `provider_key` 在 60 秒內出現 5 次 retryable provider failure 時，circuit 進入 open 60 秒；其後只允許一個 half-open probe。驗證錯誤、workspace quota 和使用者取消不計入 circuit。open 時，未開始的 task 保留 reserve 並延後，API 對新成本型任務返回明確 `PROVIDER_UNAVAILABLE`，不靜默切換資料來源。

Redis 不可用時：純讀取 API 不受影響；公開 audit 與成本型 task 建立返回 `503 RATE_LIMIT_UNAVAILABLE`，worker 不出站呼叫 provider。這是為了避免失去全域限制後放大成本。

### 3.5 取消、dead-letter 與人工處置

- queued task：API 原子改為 `cancelled`、release 尚未使用的 reservation、記錄 audit event。
- running task：API 改為 `cancellation_requested` 並回傳 `202`；worker 在安全檢查點中止、確認後才寫 `cancelled` 和 release／finalize。不能保證 provider 已開始時立即停止。
- max retry 或不可恢復的 worker failure：寫 terminal `dead_letter`、attempt、error code、最後 lease owner 與 reservation 結算證據。
- `editor+` 可讀取 workspace 的 dead-letter；`admin+` 才可 replay 或 ignore。兩者都必須有 Idempotency-Key、理由與 audit event。replay 不變更原 task；ignore 不刪除歷史。

### 3.6 可觀測性與資料最小化

每個 API／Worker 結構化事件至少包含：

```text
timestamp, service, requestId, taskId, workspaceId, operation,
provider, gatewayModel, priceSnapshotId, attemptNo, queueWaitMs,
latencyMs, cacheState, retryCount, fallbackFrom, errorCode,
estimatedCost, actualCost
```

`workspaceId` 僅在受控後端 telemetry 中使用；一般公開 response 不顯示。日志、attempt 與 audit metadata 不得記錄完整 prompt、正文、HTML、CMS credential、Authorization、API key、webhook body、provider raw response 或 user email。內容只以 input hash、size、版本與安全分類表示。

PH2-05 不引入新監控廠商。先輸出可聚合 JSON log 與 PostgreSQL attempt／ledger 查詢；PH2-08 管理後台才讀取已消毒的聚合數據。

## 4. API 契約變更

| Endpoint | PH2-05 行為 |
| --- | --- |
| 現有成本型 `POST` | 通過 `enqueueCostedTask` 後返回 `202 { taskId, status, estimatedCredits }`；quota 不足固定為 `429 QUOTA_EXCEEDED`。未經後續功能 gate 的 route 仍返回 `PROVIDER_UNAVAILABLE`，不建立任務。 |
| `GET /api/v1/tasks/:taskId` | 加入已消毒的 `availableAt`、`cancellationRequestedAt`、replay relation 及可見 retry metadata；維持 workspace 404 邊界。 |
| `POST /api/v1/tasks/:taskId/cancel` | queued 立即取消；running 改為取消請求。所有分支均 idempotent，且 reservation 結算在 service transaction 或 worker 確認後完成。 |
| `GET /api/v1/tasks/dead-letter` | `admin+`，workspace scoped、分頁、只返回可操作 metadata；不返回 raw request／response。 |
| `POST /api/v1/tasks/:taskId/replays` | `admin+`，建立 replacement task，不覆寫原 task；需 Idempotency-Key 與理由。 |
| `POST /api/v1/tasks/:taskId/dead-letter/ignore` | `admin+`，寫 disposition 和 audit；只可處置該 workspace dead-letter。 |
| `GET /api/v1/usage` | 保留既有 summary，新增 finalized、released 與 active reserved 用量；feature-specific remaining units 由成本型 task enqueue 以 entitlement 原子核驗，PH2-08 再呈現在工作台。 |

新增錯誤碼：`RATE_LIMIT_UNAVAILABLE`、`TASK_LEASE_EXPIRED`、`CANCELLATION_REQUESTED`。現有 `QUOTA_EXCEEDED`、`PROVIDER_UNAVAILABLE`、`IDEMPOTENCY_KEY_REUSED`、`WORKSPACE_RESOURCE_NOT_FOUND` 保持不變。

## 5. 實作順序與驗收

| 順序 | 工作 | 驗證 |
| --- | --- | --- |
| 1 | 建立 `0015` migration、shared types、Postgres／in-memory repository contract。 | 空庫套用 `0001`–`0015`；既有 `0014` schema 升級；重跑 migration 安全跳過。 |
| 2 | 完成原子 enqueue、period quota、reserve/finalize/release 與 cancellation accounting。 | 兩個並發相同 idempotency request 只得一 task／reserve；兩個並發接近上限請求僅一個成功；release 後額度可用。 |
| 3 | 實作 PostgreSQL claim、lease recovery、fair scheduling、timeout 與 retry state machine。 | 兩 worker 不會 claim 同 task；兩 workspace 均有 due task 時不被單一 workspace 壟斷；lease expiry 不建立第二個 provider charge。 |
| 4 | 加入 Redis limiter／circuit adapter、route policy 與 provider policy。 | 429 的 `Retry-After`、workspace concurrency、URL hash abuse、Redis outage fail-closed、open／half-open／close circuit 全部有 fixture test。 |
| 5 | 實作 dead-letter replay／ignore、telemetry 與 sanitized task read。 | 重跑／忽略均有 audit；跨 workspace 讀寫 404；無 prompt、secret、正文進 response／log fixture。 |
| 6 | 跑 migration integration、API／Worker unit and integration test、lint、全倉 test、build、security audit。 | 全部通過後才標記 `IMPLEMENTATION_COMPLETE`；是否 push／deploy 仍由使用者另行授權。 |

必測不變量：

- `retry` 永不再 reserve，同一 reservation 最多一筆 finalize 或 release。
- quota 計算只扣 finalized 與 active hold，不把已 release reservation 當作消耗。
- task、attempt、ledger、dead-letter action 任何跨 workspace ID 都不可讀寫，固定回 `WORKSPACE_RESOURCE_NOT_FOUND`。
- 任務的 external idempotency/reconciliation 未完成時，不可對可能有成本或副作用的操作盲目重試。
- `dead_letter` replay 是新 task；ignore 和 replay 均保留不可變歷史。
- API 及 worker telemetry 不含 `.env`、credential、token、原文或原始 provider payload。

## 6. 風險、非目標與後續依賴

### 已知風險

1. Breakout API 和部分 SEO Provider 尚未核實正式 rate limit／retry header；本步只採保守可配置上限，PH2-06 真實出站前需以 provider fixture 與官方契約校準。
2. Stripe entitlement webhook 尚未啟用；PH2-05 只消費本地有效 entitlement，不假設付款平台即時一致。
3. CMS 寫回具外部副作用，不能在 PH2-05 的泛用 retry handler 中自動啟用，需由 PH2-09 定義對應 idempotency 和 reconciliation。
4. 現有 `sync_tasks` 是第一階段 WordPress queue；本步只重構 `phase2_tasks` 治理。是否遷移舊 queue 必須另立相容與回歸計劃，避免影響已部署同步／回滾功能。

### 非目標

- 不在 PH2-05 開啟真實 provider、公開 audit、內容生成、CMS 發佈、付款或 email。
- 不以 Redis 取代 PostgreSQL 的 ledger、task、audit 或 entitlement 真相。
- 不提供「無限用量」、不按猜測價格扣費、不跨 provider 合併指標。
- 不在本步修改前端工作台；PH2-08 再以已核驗 API 契約呈現任務與用量。

## 7. 核檢清單與批准門檻

- [x] 已盤點 PH2-03／PH2-04 的 migration、repository、worker、路由、目前 global rate limit 與測試基礎。
- [x] 已定義 durable queue、Redis 邊界、原子 reserve、quota 公式、取消、dead-letter、retry、circuit 與 telemetry。
- [x] 已界定本步不開啟真實 provider、CMS 寫回、付款或公開 audit。
- [x] 已定義空庫／既有 schema、並發、workspace isolation、retry 計費、dead-letter 與 quota 驗收。
- [x] Product Owner 已於 2026-09-14 明確批准 PH2-05。
- [x] migration、append-only ledger、原子 enqueue contract、workspace scope、取消、dead-letter、lease、retry、Redis limiter／circuit 與 sanitized task response 已實作並完成本地驗證。
- [x] PostgreSQL upgrade／integration、Redis Lua smoke、lint、全倉 test、build 及 security audit 已通過。

**Open risks**：Provider rate limit 與 retry-after 契約仍待 PH2-06 真實 adapter 前核實；Stripe／套餐來源由 PH2-11 接入；現有 `sync_tasks` 相容策略不在本步範圍。

## 8. 實作證據與驗證結果

### 已實作

- `db/migrations/0015_phase2_task_governance.sql`：追加 queue lease、available time、priority、cancellation request、replay relation、ledger trace、attempt telemetry 與 immutable dead-letter disposition。
- `packages/ai-providers/src/phase2.ts`：擴充 task state machine、active reservation quota、原子 costed task contract、dead-letter 行為與用量摘要；`taskGovernance.ts` 以 Redis Lua 實作 token bucket 和 circuit breaker，並提供 deterministic in-memory test adapter。
- `apps/api/src/phase2Repository.ts`：PostgreSQL／in-memory 行為一致，quota 採 finalized + active reserve，queued cancel 會 release，running cancel 轉為 `cancellation_requested`，replay／ignore 不覆寫原 task。
- `apps/api/src/phase2Routes.ts`、`apps/api/src/siteAudit.ts`、`apps/api/src/server.ts`：模型目錄同步與已連接站點 audit 走 shared governance；production 缺少 Redis 時拒絕新增成本型 provider task；加入 dead-letter management API。
- `apps/worker/src/index.ts`、`apps/worker/src/phase2TaskState.ts`：workspace-aware due-task selection、lease recovery、15 秒 heartbeat、jitter retry、provider limiter/circuit、結構化 task event；只有已批准的 gateway model sync handler 會出站。
- `docs/openapi/phase2-contract.yaml`：同步 task cancellation、dead-letter action、usage summary 與新 task status。

### 驗證

- 本機 PostgreSQL 已由 `0014` 升級至 `0015`，重跑 migration 安全跳過已套用版本。
- PostgreSQL Phase 2 Repository integration：3 項通過（含並發 quota advisory lock 與 queued cancel release）；Redis token bucket／circuit breaker 實例 smoke 通過；本機 API `/health` 返回成功。
- `npm run lint`、`npm run test`、`npm run build`、`npm run security:audit` 全部通過。全倉測試為 69 passed、6 skipped（PostgreSQL optional tests 另已在 Docker API 容器明確啟用並通過）。

**Open risks**：Breakout 與 SEO Provider 的正式 rate／retry header 仍待 PH2-06 真實 adapter 核實；Stripe entitlement webhook 由 PH2-11 實作；`sync_tasks` 的第一階段 WordPress queue 保持不變；公開 audit route、真實 SEO Provider、內容生成、CMS 寫回、付款與 email 仍未啟用。

**Decision**：`APPROVED / IMPLEMENTATION_COMPLETE`。

**Approved by**：Product Owner（使用者）

**Approved at**：2026-09-14

**後續 gate**：可進入 `PH2-06` 的 Keyword Intelligence 實作；任何新增真實 Provider、公開 route、付款或 CMS 寫入能力仍必須依各自 PH2 gate 重新核檢。
