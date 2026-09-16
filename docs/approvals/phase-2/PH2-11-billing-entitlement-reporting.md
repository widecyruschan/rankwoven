# PH2-11 Billing、Entitlement 與報告核檢

> 文件狀態：`APPROVED / IMPLEMENTATION IN PROGRESS`
> 建立日期：2026-09-16
> 批准日期：2026-09-16
> 批准人：Product Owner（使用者）
> 前置批准：`APPROVE PH2-04`、`APPROVE PH2-05`、`APPROVE PH2-08`、`APPROVE PH2-10`
> 依據：`docs/rankwoven-phase-2-prd.md` 第 7、9.6、11.3.6、12.2、13.5、14.5、15–18 節、`docs/rankwoven-phase-2-development-workflow.md`
> 本步不啟用：未配置 Stripe secret 的真實扣款、PayPal、未設 spending cap 的按量超額、自動退款、前端直接修改 Entitlement、未完成脫敏檢查的白標 PDF。

## 1. 目標與完成定義

PH2-11 建立「套餐目錄 → 訂閱 → Entitlement → 用量 → 報告」閉環。工作區 Owner 可以查看目前套餐、比較可升級套餐、前往 Stripe 完成付款、取消或恢復自動續費；取消續費不會立即終止當期已付款權益。

```text
server-side plan catalog
  → owner selects an upgrade
  → price / proration preview
  → Stripe-hosted checkout or subscription update
  → signed, deduplicated webhook
  → local subscription projection
  → atomic entitlement assignment
  → usage ledger / remaining quota
  → CSV / PDF report export
```

完成標準：

1. `/app/billing` 顯示目前套餐、訂閱狀態、當期結束日、自動續費狀態、用量及可升級套餐；只有工作區 Owner 可執行付款、升級及續費設定變更。
2. Free／未訂閱工作區升級時建立 Stripe Checkout session；已有付費訂閱升級時先展示即時價格／按比例計費預覽，再由 Stripe 託管流程確認付款。
3. 升級請求、Checkout 成功頁或 API response 都不直接提升 Entitlement；只有已驗簽並完成對帳的 Stripe 訂閱／發票狀態才可原子更新本地訂閱投影與 Entitlement。
4. 「取消自動續費」只把 `cancel_at_period_end` 設為 true。訂閱在 `current_period_end` 前維持 active，既有 Entitlement 不提早失效；到期前可恢復自動續費。
5. Webhook 重放、亂序、延遲或重試不會重複開通、重複扣用量或回退到舊狀態；本地投影可與 Stripe 主動對帳。
6. `usage_ledger` 繼續作即時配額事實來源。Stripe 不參與 request-time quota 判斷，亦不接收客戶文章、prompt、CMS credential 或 Provider secret。

## 2. 現況與缺口

| 範圍 | 已有能力 | PH2-11 缺口 |
| --- | --- | --- |
| Pricing | 公開 `/pricing` 已顯示 Starter／Growth／Agency／Enterprise 暫定價格。 | 公開名稱與 PRD 的 Free／Pro／Agency／Enterprise 不一致；沒有服務端套餐目錄、Stripe Price mapping 或登入後升級入口。 |
| 用量／Entitlement | PH2-05 已有 append-only `usage_ledger`、`entitlement_assignments`、reserve → finalize／release 與 `GET /api/v1/usage`。 | 沒有套餐來源、訂閱週期、當期剩餘額度、套餐變更事件與付款狀態投影。 |
| 訂閱 | PRD 已預留 `subscriptions`、`billing_webhook_events` 與 Stripe Checkout／Portal API。 | 尚無 migration、repository、provider adapter、webhook 驗簽／去重／亂序處理、升級及取消續費。 |
| 客戶後台 | Route registry 已預留 `/app/billing`，目前 `enabled=false`。 | 缺 Billing view、Owner gate、套餐比較、取消／恢復續費、付款失敗與空狀態。 |
| 報告 | Audit、Keyword、Content、Usage 已有結構化資料。 | 缺可追蹤 export job、CSV／PDF 產物、來源／時間／地區／裝置／估算標籤與到期清理。 |

## 3. 套餐與訂閱規則

### 3.1 套餐目錄

套餐目錄由 API server 返回，前端不得寫死 Stripe Price ID、貨幣最終金額或 Entitlement。每一個版本化套餐至少包含：

```text
planKey, version, displayName, billingInterval, currency, unitAmount,
providerPriceRef, status, features, limits, effectiveAt
```

初始產品能力沿用 PRD 的站點數、已驗證關鍵詞列、內容分析、Audit URL、競品、AI visibility 與 API 權限。正式實作前需由 Product／Finance 確認以下命名差異：

- 現有公開頁：Starter／Growth／Agency／Enterprise，暫定 `$29／$79／$199／Custom`。
- 第二階段 PRD：Free／Pro／Agency／Enterprise，限制表仍屬 Beta 假設。
- 建議：資料庫使用穩定 `plan_key`，顯示名稱與價格以 versioned catalog 管理；未確認前不刪除公開套餐、不建立真實 Stripe Price。

### 3.2 升級

- 只允許升到 `catalog.rank` 更高且 active 的套餐；Enterprise 走聯絡銷售，不建立自助 Checkout。
- 無付費訂閱：建立 Stripe Checkout session，success／cancel URL 必須是 allowlist 內的 RankWoven HTTPS URL。
- 已有付費訂閱：先取得 Stripe 價格／proration preview，再建立一次性的 upgrade request；Provider adapter 選擇 Stripe 支援的 subscription update 或託管確認頁。
- 客戶看到的預覽需包含目前套餐、目標套餐、幣別、立即應付／下期金額、當期結束日與適用稅項提示。
- Checkout redirect、success page 或同步 API 成功都不能直接開通。只有 Stripe 已驗簽事件及主動 subscription retrieve 對帳完成後，才更新本地 projection 與 Entitlement。
- 降級不在首個切片提供；後續若加入，只能排程到 period end，避免已付款週期內突然降低額度。

### 3.3 取消與恢復自動續費

- `POST /api/v1/billing/subscription/cancel-renewal` 將 Stripe subscription 設為 `cancel_at_period_end=true`。
- 本地狀態顯示「將於 YYYY-MM-DD 到期」，但 `status` 仍保持 active／trialing，當期 Entitlement 不變。
- `POST /api/v1/billing/subscription/resume-renewal` 可在 `current_period_end` 前恢復 `cancel_at_period_end=false`。
- 已真正 canceled／unpaid 的訂閱不能以 resume API 復活，需重新 Checkout。
- 取消自動續費不等於退款；退款、爭議、信用額及例外延長由管理流程另行批准，不由此按鈕觸發。

### 3.4 付款失敗與寬限

- `past_due` 顯示付款失敗提示並提供 Customer Portal；預設保留可配置寬限期，不立即刪除內容或歷史報告。
- `unpaid`／`canceled`／寬限期結束後，套餐 Entitlement 在下一個有效時間點降為 Free；進行中的 provider task 依 PH2-05 安全結算，不強制中斷已出站請求。
- 任何寬限、手動補發 Entitlement 或退款必須有 operator、reason、audit event 與 expiresAt。

## 4. 資料模型

新增 migration `0026_phase2_billing_entitlement_reporting.sql`：

| 表 | 用途 | 主要欄位／約束 |
| --- | --- | --- |
| `billing_plan_catalog` | 版本化套餐與 Stripe Price mapping。 | `plan_key + version + interval` 唯一；Price ID server-side；inactive 只供歷史查詢。 |
| `subscriptions` | 每個 workspace 的本地訂閱投影。 | workspace、provider、customer／subscription ref、plan key／version、status、period、`cancel_at_period_end`、provider updated time；external ID 唯一。 |
| `subscription_change_requests` | Checkout、升級、取消／恢復續費的 idempotent 請求。 | workspace、type、from／to plan、idempotency key、provider session／request ref、preview amount、status、actor。 |
| `billing_webhook_events` | Stripe webhook 去重與處理證據。 | provider + external event ID 唯一；event type、payload hash、provider created time、processing status、error code；不保存完整 payload。 |
| `report_exports` | CSV／PDF／白標報告任務與產物。 | workspace、report type、filters、status、storage ref、expiresAt、createdBy；不保存 secret。 |

規則：

- 所有表包含 `created_at`、`updated_at`；workspace 資源使用 composite scope 約束或同等 transaction 驗證。
- `subscriptions` 是 Stripe 的本地投影，不取代 Stripe；`usage_ledger` 是用量真相，不被 subscription row 覆寫。
- 套餐更新在同一 transaction 中：鎖定 subscription → 比較 provider updated time → 更新 projection → 終止舊 plan-sourced Entitlement → 插入新 plan-sourced Entitlement → audit event。
- 取消自動續費只更新 projection 的 `cancel_at_period_end` 與 `cancel_at`，不提前設定 Entitlement `expires_at`；真正 period end／deleted 對帳後才切換下期 Entitlement。

## 5. API 契約

| Method | Endpoint | 最低角色 | 行為 |
| --- | --- | --- | --- |
| `GET` | `/api/v1/billing/plans` | viewer | 返回可購買套餐的脫敏 catalog、功能及限制，不返回 secret key。 |
| `GET` | `/api/v1/billing/subscription` | viewer | 返回目前 plan、status、period end、auto-renew、usage／remaining 與可用操作。 |
| `POST` | `/api/v1/billing/upgrade-previews` | owner | 驗證目標套餐並取得價格／proration preview，不改變訂閱。 |
| `POST` | `/api/v1/billing/checkout-sessions` | owner | 為 Free／未訂閱 workspace 建立 Stripe-hosted Checkout session。 |
| `POST` | `/api/v1/billing/subscription/upgrades` | owner | 對既有付費訂閱建立已確認的升級請求；需 `Idempotency-Key` 與 preview token。 |
| `POST` | `/api/v1/billing/subscription/cancel-renewal` | owner | 設 `cancel_at_period_end=true`；不立即移除 Entitlement。 |
| `POST` | `/api/v1/billing/subscription/resume-renewal` | owner | period end 前恢復自動續費。 |
| `POST` | `/api/v1/billing/customer-portal-sessions` | owner | 建立付款方式／發票管理 Portal session；return URL 固定 allowlist。 |
| `POST` | `/api/v1/webhooks/stripe` | Stripe signature | 原始 body 驗簽、event 去重、主動 retrieve 對帳、更新 projection／Entitlement。 |
| `POST` | `/api/v1/report-exports` | editor | 建立 CSV／PDF export task；Agency 白標需 entitlement。 |
| `GET` | `/api/v1/report-exports/:exportId` | viewer | 讀取狀態與短效下載連結；workspace scoped。 |

所有 billing mutation 使用 `Idempotency-Key`。錯誤碼至少包含：`BILLING_PROVIDER_UNAVAILABLE`、`PLAN_NOT_FOUND`、`PLAN_NOT_UPGRADE`、`SUBSCRIPTION_NOT_ACTIVE`、`PREVIEW_EXPIRED`、`PAYMENT_ACTION_REQUIRED`、`AUTO_RENEW_ALREADY_DISABLED`、`SUBSCRIPTION_ALREADY_ENDED`、`WEBHOOK_SIGNATURE_INVALID`、`WEBHOOK_EVENT_REPLAYED`。

## 6. Stripe Adapter 與 Webhook

- 使用官方 Node Stripe SDK，版本固定在 lockfile；secret、webhook secret、Price ID 只存在 server-side 環境或 plan catalog 管理流程。
- 必要配置：`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、允許的 success／cancel／portal return URL，以及經 Finance 核准的 Price mapping。缺任一 production 必要配置時 fail closed。
- Webhook 必須使用原始 request body 驗簽；普通 JSON parser 後的 body 不可用於 signature verification。
- 至少處理 Checkout completion、subscription create／update／delete、invoice paid／payment failed；event 只作觸發訊號，關鍵狀態以 Stripe retrieve 後的最新 subscription 為準。
- `billing_webhook_events` 先以 external event ID 去重，再取得 subscription row lock；舊 `provider_created_at` event 不可覆寫新投影。
- Webhook response 快速返回；可重試處理使用無外部付款副作用的 reconciliation task，不重複建立 Checkout 或更新訂閱。
- 每日 reconciliation 比較 active local projection 與 Stripe；差異只記錄安全 metadata 並告警，不在未驗證時擅自補扣款。

## 7. Entitlement 與用量

- plan catalog 的 limit 轉為 `entitlement_assignments`，source 使用可追蹤的 `stripe:<subscription-ref>:<plan-version>`，不使用前端輸入。
- 升級成功可在 webhook 對帳後立即生效；舊 Entitlement 的 `expires_at` 與新 Entitlement 的 `effective_at` 在同一 transaction 銜接。
- 取消自動續費不改當期 Entitlement；真正到期後才建立 Free entitlement 或下一個已付款 plan entitlement。
- `GET /api/v1/billing/subscription` 組合 plan limits、`usage_ledger` finalized + active reserve 與 remaining；released usage 不計入消耗。
- 超額初期 hard stop。付費超額、spending cap 和 Stripe Meter 保持 disabled，待 30 日真實成本與 Finance 再批准。

## 8. 客戶後台與路由

- 啟用 `/app/billing`，加入「工作區操作」側欄；私有頁保持 `noindex,nofollow,noarchive`。
- Viewer／Editor／Admin 可查看套餐與用量；只有 Owner 看見並可觸發升級、Checkout、取消／恢復續費及 Customer Portal。API 仍作最終權限檢查。
- 頁面必須包含：目前套餐、狀態、續費日期／到期日期、自動續費狀態、用量進度、套餐比較、升級預覽、付款失敗、即將取消、已取消、Provider unavailable 與空狀態。
- 升級按鈕使用清晰命令；取消自動續費需二次確認，明確寫出「目前權益保留至日期」和「不自動退款」。
- 成功返回頁面只顯示「正在確認付款」，輪詢本地 subscription projection；不能根據 query string 自行顯示已升級。

## 9. 報告切片

1. 第一切片：Usage 與 Site Audit CSV，包含 source、collectedAt、locale／location／device、estimated 標記及 filters。
2. 第二切片：Keyword／Content PDF，使用固定模板與短效下載連結。
3. Agency 白標：workspace branding、客戶名稱與 Logo；需 Agency entitlement，不能移除資料來源或估算標籤。
4. 產物預設 7 日到期，過期刪除 storage object，但保留最小 audit／billing metadata。

## 10. 安全、私隱與營運 Gate

- Owner 權限、workspace scope、CSRF／same-site、Idempotency-Key、open redirect allowlist、Stripe signature 與 replay protection 均需測試。
- API／log／audit event 不返回或記錄完整卡資料、Stripe secret、webhook body、Checkout URL query、客戶正文或 CMS credential。
- Checkout／Portal URL 只在建立後回傳給當前 Owner，不持久化為公開連結。
- Billing／會計紀錄按法規與 Finance retention 保存，與內容刪除流程分離。
- Price、稅項、退款條款、取消文案與 Email 通知在 production 上線前由 Finance／Legal 審核。
- Stripe 未配置、webhook backlog、reconciliation drift 或 signature error 超過閾值時停止新 Checkout／升級，保留讀取與 Customer Portal 故障提示。

## 11. 驗收與測試

- [ ] migration 可在空庫、現有 schema 執行並安全重放；workspace isolation／external ID unique 通過。
- [ ] Free → paid Checkout 不會在 success redirect 前／後自行開通；只有驗簽 + retrieve 對帳事件可產生付費 Entitlement。
- [ ] active plan 升級 preview、確認、付款成功、付款需額外驗證、失敗與重試均不重複建立 subscription／Entitlement。
- [ ] 取消自動續費後，`current_period_end` 前功能與額度不變；period end 後降至 Free；到期前 resume 可恢復。
- [ ] duplicate／out-of-order／invalid-signature webhook 不錯誤開通、不回退狀態、不重複 audit／Entitlement。
- [ ] Owner 可變更；Admin／Editor／Viewer mutation 返回 403；跨 workspace subscription／export 固定 404。
- [ ] `GET /billing/subscription` 的 used／reserved／released／remaining 與 PH2-05 ledger 一致。
- [ ] CSV／PDF 不包含 secret、raw webhook、正文或未授權個資；短效 URL 與到期清理通過。
- [ ] `/app/billing` 桌面／375px、亮／暗、loading／empty／past_due／cancel_at_period_end／provider unavailable 狀態通過。
- [ ] `npm run lint`、`npm run test`、`npm run build`、`npm run security:audit`、Stripe fixture／CLI test webhook、Docker smoke 全通過。

## 12. 實作順序與批准請求

1. 確認套餐命名、月／年價格、幣別、稅項策略、Stripe Price mapping 與 cancel／refund 文案。
2. 新增 `0026` migration、domain types、InMemory／PostgreSQL repository 與 workspace isolation tests。
3. 實作 Stripe adapter、raw-body webhook、去重／亂序 reconciliation 與 Entitlement transaction。
4. 實作 plans／subscription／preview／Checkout／upgrade／cancel／resume／Portal API 及 Owner gate。
5. 啟用 `/app/billing`、用量與套餐 UI，接入升級、取消／恢復續費及付款失敗狀態。
6. 實作 CSV export，再按 entitlement 增加 PDF／白標切片。
7. 完成 fixture、integration、E2E、安全、成本與對帳測試；真實 Stripe 只在 test mode 完成 canary，live mode 另行批准。

## 13. 初始實作證據

- `0026_phase2_billing_entitlement_reporting.sql`：建立版本化套餐、訂閱投影、變更請求、Webhook 去重及 Usage CSV export 資料表，並預置 Starter／Growth／Agency／Enterprise 月付目錄。
- `apps/api/src/billing.ts`：實作 InMemory／PostgreSQL repository、Stripe Checkout／Portal adapter、原始 body webhook 驗簽、重放／亂序處理、Owner-only mutation、套餐 Entitlement 交易與 Usage CSV export。
- `/app/billing` 已啟用：顯示目前套餐、用量、升級 preview、取消／恢復自動續費、Customer Portal 與 CSV export；未配置 Stripe 時 fail closed。
- 初始報告切片只提供 Usage CSV。Site Audit CSV、PDF 與 Agency 白標報告仍留在本 PH2-11 的後續切片，不能標示為完成。
- 已完成 mock Stripe contract、Owner gate、webhook raw body／signature、duplicate／out-of-order、`cancel_at_period_end` 保留 Entitlement、migration 重放、lint、全倉 test、build、security audit 與本機 Docker smoke。

**Live mode gate**：Stripe test／live mode 前仍需由 Finance 提供並配置 `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、核准的 Price ID 與 Customer Portal configuration，並用 Stripe test-mode fixture／CLI 完成 canary。批准 PH2-11 不等於授權 production live mode、push 或部署；以上操作仍需另行明確授權。
