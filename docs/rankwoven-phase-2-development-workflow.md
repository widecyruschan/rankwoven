# RankWoven 第二階段開發流程與方案選型

> 文件狀態：執行草案 v1.1（PH2-01 已批准；PH2-02 待批准）
> 建立日期：2026-09-12
> 依據：`docs/rankwoven-phase-2-prd.md`
> 研究底稿：`docs/research/phase-2-ai-seo-2026.md`、`docs/research/phase-2-api-pricing-2026.md`
> PH2-02 核檢：`docs/approvals/phase-2/PH2-02-provider-selection.md`
> 原則：每一步必須完成核檢並得到明確批准，才可開始下一步。

## 1. 文件目的

本文件將第二階段 PRD 轉成可執行的工程流程，包含：

- 每個階段的輸入、工作項目、產物、核檢清單及批准門檻。
- Keyword Intelligence、Content Optimizer、Site Audit、競品／AI 可見度、Backlink、CMS、計費及多語言的依賴順序。
- AI、SEO 數據、效能、CMS、支付及 Email API 的候選方案與成本模型。
- 開發、測試、部署、回滾及每一步的停止條件。

本文件不是「批准已完成」的紀錄。只有在產品 Owner、技術負責人或指定 Reviewer 明確回覆 `APPROVE PH2-XX` 後，該階段才可進入下一階段。

## 2. 成功定義

第二階段首批上線必須能完成：

`研究專案 → 有來源關鍵詞／競品 gap → 內容 brief → 內容分析 → 可審核改寫 → WordPress 草稿 → Audit／GSC 追蹤`

並同時滿足：

- 公開頁 route registry、SEO head、靜態 HTML、sitemap、hreflang 與 link graph 完全一致。
- 所有數值資料有來源、時間、地區、語言、裝置與估算標籤。
- AI 不產生未驗證的搜尋量、排名、流量、案例、資格或引用。
- 每次 CMS 寫回前有最新值校驗、快照、權限檢查及可回滾路徑。
- 變動成本由內部 usage ledger 即時控制，沒有「無限使用」路徑。
- 公開部署只來自已批准、已測試及可回滾的 Git commit。

## 3. 核檢與批准制度

### 3.1 角色

| 角色                       | 必須核對                                               |
| -------------------------- | ------------------------------------------------------ |
| Product Owner              | 需求、優先級、用戶價值、範圍與商業取捨                 |
| Tech Lead                  | 架構、資料模型、API、效能、可維護性                    |
| Security／Privacy Reviewer | SSRF、Prompt Injection、密鑰、租戶隔離、資料保留、合規 |
| Design／Content Reviewer   | 路由、i18n、可讀性、可訪問性、SEO 文案與引用           |
| QA Lead                    | Unit、Integration、E2E、回歸、視覺、壓測與失敗路徑     |
| Finance／Operations        | Provider 成本、配額、Entitlement、帳單與告警           |
| Release Owner              | CI、migration、canary、健康檢查、回滾與部署記錄        |

### 3.2 每步固定格式

每個 `PH2` 步驟必須建立一份核檢紀錄，放在 `docs/approvals/phase-2/` 或 Issue／PR 描述中：

```text
Step: PH2-XX
Scope: <本步範圍>
Evidence: <PR、測試、截圖、成本表、migration、報告連結>
Checks: PASS / FAIL / N/A（附原因）
Open risks: <未關閉風險>
Decision: APPROVED / REWORK / BLOCKED
Approved by: <姓名／角色>
Approved at: <ISO 8601>
```

批准規則：

- `PASS` 不等於批准；仍需要明確的 `APPROVED`。
- 沒有回覆、口頭同意、已讀或 CI 綠燈都不算批准。
- `REWORK` 只可回到同一步修正；不能跳到下一步再補文件。
- `BLOCKED` 必須記錄阻塞原因、替代方案與重新核檢日期。
- 任何改變資料權限、外部成本、公開路由、寫回能力或付款狀態的變更，都要重新核檢受影響步驟。

## 4. 依賴與總排期

| ID     | 階段                          | 估計時間 | 前置批准       | 主要輸出                                  |
| ------ | ----------------------------- | -------: | -------------- | ----------------------------------------- |
| PH2-00 | 現況盤點與範圍鎖定            |   2–3 日 | 無             | baseline、風險、非目標                    |
| PH2-01 | 路由、SEO 與資訊架構          |   3–5 日 | PH2-00         | route registry、link graph、redirect plan |
| PH2-02 | Provider、模型與成本選型      |   3–5 日 | PH2-00         | capability matrix、價格模型、採購決策     |
| PH2-03 | 架構、資料與 API 契約         |   4–6 日 | PH2-01、02     | ADR、migration 草案、OpenAPI／schema      |
| PH2-04 | 安全、私隱與合規設計          |   3–5 日 | PH2-03         | threat model、資料流、政策 gate           |
| PH2-05 | 基礎資料、用量與任務治理      |     1 週 | PH2-04         | migration、ledger、queue、rate limit      |
| PH2-06 | Keyword Intelligence          |   1–2 週 | PH2-05         | 研究專案、聚類、競品 gap                  |
| PH2-07 | Content Optimizer 與 AI 評測  |   1–2 週 | PH2-06         | score、diff、claim、draft                 |
| PH2-08 | 前台、客戶後台、管理後台      |   1–2 週 | PH2-01、06、07 | 三層路由與工作台                          |
| PH2-09 | CMS 寫回與驗證                |     1 週 | PH2-07、08     | WordPress draft、Ghost／Shopify adapter   |
| PH2-10 | Site Audit remediation 與監控 |   1–2 週 | PH2-05、08     | recheck、競品／AI visibility              |
| PH2-11 | Billing、Entitlement 與報告   |     1 週 | PH2-05、10     | Stripe、用量、匯出                        |
| PH2-12 | 全量 QA、安全與成本驗證       |   1–2 週 | PH2-06 至 11   | release candidate                         |
| PH2-13 | Staging、Canary、生產部署     |   2–3 日 | PH2-12         | production release                        |
| PH2-14 | 部署後觀察與 GA 決策          |   1–2 週 | PH2-13         | canary 報告、回滾／放量決策               |

PH2-06、PH2-07、PH2-08 可在契約批准後並行，但每個分支仍要獨立完成自身批准；PH2-09 之前不可開啟 CMS 寫入；PH2-13 之前不可將新功能對外開啟。

## 5. 逐步開發流程

### PH2-00：現況盤點與範圍鎖定

**輸入**：第二階段 PRD、第一版程式碼、部署狀態、第一版未完成功能清單。

**工作**：

1. 確認現有 `apps/web`、`apps/api`、`apps/worker`、`packages/*`、WordPress 插件及 migration 狀態。
2. 列出可復用的 API、Provider、CMS Adapter、SEO rules、Auth、queue、快照及測試。
3. 將第一版未完成功能映射到 Phase 2A／2B／2C／2D，不新增未批准範圍。
4. 記錄現有未提交工作區內容，建立本次變更邊界。

**證據**：模組矩陣、route inventory、API inventory、migration inventory、初始成本假設、非目標清單。

**本次盤點產物**：`docs/approvals/phase-2/PH2-00-current-state.md`。該報告是後續 PH2-01 路由與 SEO 實作的基線，未獲 `APPROVE PH2-00` 前不得進入 runtime code。

**核檢**：

- [ ] 所有第一版未完成項目都有目標階段。
- [ ] 沒有把已部署功能重複排期。
- [ ] 沒有 `.env`、密鑰、Token 或正式資料進入研究輸出。
- [ ] P0／P1／P2 依賴與阻塞關係已列出。

**批准門檻**：Product Owner 確認範圍；Tech Lead 確認可復用底座；Security Reviewer 確認資料邊界。

**批准後**：建立 PH2-01～PH2-04 的設計工作項。

### PH2-01：路由、SEO 與資訊架構

**輸入**：現有 Vue Router、`docs/frontend-page-spec.md`、最新 PRD 的 Canonical Route Plan。

**工作**：

1. 建立 route registry 作為唯一來源，欄位包括 `path`、`name`、`layout`、`parentRoute`、`requiresAuth`、`requiresRole`、`indexable`、`canonicalPath`、`sitemapGroup`、`titleKey`、`descriptionKey`、`keywordKey`。
2. 定義公開前台、認證、客戶後台、管理後台四個 route namespace。
3. 將 `/app/keywords`、`/app/analytics`、`/app/lighthouse` 等舊 route 納入兼容 redirect，保留 `siteId` 與合法 query。
4. 建立 `route registry → Vue Router → SEO head → 靜態 HTML → sitemap → link graph` 的單向生成關係。
5. 為每個公開頁定義父頁、相關頁、Blog 上一篇／下一篇、footer 及 breadcrumb 導入來源。

**核檢**：

- [ ] 每個公開 indexable route 有唯一 canonical、H1、正文、description、keyword、JSON-LD。
- [ ] 每個公開 indexable route 至少有一條來自其他 indexable route 的導入連結。
- [ ] `/app/*`、`/admin/*`、認證頁不進 sitemap，並同時輸出 meta robots 與 `X-Robots-Tag`。
- [ ] Blog 分類頁有文章數與獨有內容門檻；不合格只作 noindex filter state。
- [ ] 多語言 route 只對已完成翻譯生成 URL，含 `x-default`。
- [ ] route graph 可輸出孤島數、失效 href、重複 canonical、redirect chain。

**證據**：registry schema、路由圖、SEO HTML 样本、sitemap 樣本、孤島檢查報告、redirect table。

**批准門檻**：Design／Content Reviewer 確認導航與文案；SEO Reviewer 確認索引策略；Tech Lead 確認可生成及可測試。

**PH2-01 本次實作結果（2026-09-12）**：

- 已完成：`routeRegistry.json`／TypeScript accessor、現有 Router 由 registry 生成、公開／認證／客戶／管理邊界 metadata、現有導航引用、公開頁預設 WebPage／Organization／WebSite JSON-LD、SPA `x-default`、Sitemap index + pages/blog 分組、Nginx Sitemap 靜態路由、route registry 回歸測試。
- 已完成驗證：Web 13 項測試、全倉測試、lint、Web `vue-tsc` build、SEO fallback（96 URLs）、Sitemap（96 URLs）、security audit；公開 Sitemap 不含 private／planned route。
- 已修正：註冊成功跳轉至不存在 `/app/dashboard` 的死鏈；現有公開／認證／後台高頻導航改為 registry accessor；`verify-email` 加入 noindex header。
- 延後至後續步驟：planned `/tools/*`、`/extension`、Blog 分類頁的實際頁面元件與 SEO 文案；`/app/sites/:siteId/*` site-scoped route 遷移；完整 hreflang locale matrix；容器級 Nginx 語法驗證（本機缺少可用 Nginx image）。

本次狀態：`PH2-01 APPROVED`。PH2-01 的批准只涵蓋已完成範圍及明確列出的延後項目，不代表 planned route 已啟用；Provider、模型與成本另由 PH2-02 核檢。

### PH2-02：Provider、模型與成本選型

**輸入**：官方研究筆記、API 能力、目標市場、預計工作量、資料保留要求。

**工作**：

1. 對每個 Provider 記錄能力、單位、配額、延遲、資料保留、地區限制、fallback 與退訂方式。
2. 為 Keyword／SERP／Backlink／LLM Mention 選主 Provider；為 AI 文字、Embedding、Grounding、圖片、Email、支付選主／備方案。
3. 建立每項任務的成本公式、月度上限、單租戶上限及 hard stop。
4. 用 fixture 模擬 provider success、timeout、429、partial、schema refusal、價格漂移及不可用地區。
5. 確定 BYOK 是否開放，並把金鑰責任與用量顯示寫入方案。

**核檢**：

- [ ] 不同 Provider 的指標沒有混入同一時間序列。
- [ ] 價格是固定公開、按量或需報價均有標籤。
- [ ] 所有外部任務都有 fallback 或明確 unavailable 行為。
- [ ] Provider 更新不會改變請求端的真實來源標籤。
- [ ] 月度預算、每工作區 cap、每日 cap 及告警門檻已算出。

**證據**：capability matrix、價格快照、月度成本模型、BYOK policy、fixture、採購／合約待辦。

**本次核檢產物**：`docs/approvals/phase-2/PH2-02-provider-selection.md`。文件以 2026-09-13 官方頁面為價格快照，並把動態價格、配額及正式商務報價列為實作前必須刷新或完成的事項。

**批准門檻**：Finance／Operations 批准預算；Security／Privacy 批准資料處理；Tech Lead 批准 adapter 能力。

**本次選型結論**：DataForSEO 作平台 SEO 主 Provider；OpenAI `gpt-5.6-luna` 作互動／embedding 主路由；Gemini Flash Batch 作低成本非同步批量；Claude Sonnet 5 作長文與引用 fallback；Ahrefs／Semrush 只作 BYOK；WordPress first；Stripe + 本地 `usage_ledger`；Email 只生成草稿。

### PH2-03：架構、資料與 API 契約

**輸入**：PH2-01 route registry、PH2-02 Provider matrix、最新 PRD 資料模型。

**工作**：

1. 建立 capability-oriented Provider Adapter：`SeoMetricsProvider`、`TextGenerationProvider`、`EmbeddingProvider`、`PageFetchService`、`PublishingTargetAdapter`、`BillingProvider`。
2. 定義 PostgreSQL migration、workspace foreign key、unique constraint、資料保留及加密參照。
3. 定義 `sourceType`：`first_party_observed`、`provider_estimated`、`deterministic_check`、`ai_inferred`、`user_asserted`。
4. 所有長任務使用 `202 + taskId + progress`；所有寫入使用 `Idempotency-Key`。
5. 定義 OpenAPI／Zod schema、錯誤碼、pagination、webhook、audit log 及版本策略。

**核檢**：

- [ ] 沒有 route 直接建立資料表。
- [ ] 所有 workspace／site／project 查詢都有伺服器端歸屬校驗。
- [ ] 所有新資料可追溯 provider、model、prompt、schema、rules、時間、地區及成本。
- [ ] API 不返回秘密、完整 token、原始私密 payload 或未消毒 HTML。
- [ ] 失敗、取消、partial、expired 與重試狀態已定義。

**證據**：ADR、migration draft、OpenAPI、Zod schema、state machine、data flow diagram。

**批准門檻**：Tech Lead、Security Reviewer、QA Lead 聯合批准；未批准不可寫 runtime code。

### PH2-04：安全、私隱與合規設計

**工作**：

1. 對公開 URL、競品 URL、webhook、CMS credentials、AI prompt、Email contact、付款 webhook 建立 threat model。
2. 實作 URL scheme／DNS／redirect／IP／port／size／timeout allow policy，拒絕 SSRF 及 DNS rebinding。
3. 將抓取內容明確標為不可信資料，阻止 Prompt Injection 觸發工具、權限或秘密讀取。
4. 定義內容、競品、contact、billing、audit log 的保留與刪除規則。
5. 定義 outreach jurisdiction policy；Phase 2 只生成草稿，不自動寄送。

**核檢**：

- [ ] private、loopback、metadata IP、非預期 port、redirect 後私有 IP 全部阻擋。
- [ ] CMS／Provider／支付秘密只 server-side 加密保存。
- [ ] AI 不能將外部頁面的指令當系統指令。
- [ ] GDPR／PECR／CAN-SPAM 的責任、suppression list 及退訂邊界有文件。
- [ ] 每個高風險操作有人工批准、快照及回滾。

**批准門檻**：Security／Privacy Reviewer 必須 `APPROVE PH2-04`；任何 High finding 都會阻塞下一步。

### PH2-05：基礎資料、用量與任務治理

**工作**：

- 建立 `keyword_research_*`、`content_optimization_*`、`usage_ledger`、`entitlement_assignments`、`task_attempts` 等 migration。
- Worker 使用 tenant-aware queue、timeout、exponential backoff、circuit breaker、provider-specific rate limiter 及 dead-letter。
- 用量採 `reserve → finalize／release` append-only event；Stripe meter 不作 request-time quota 真相。
- 加入公開 Audit、Provider API、AI 任務的 rate limit 與 abuse protection。
- 建立可觀測性：requestId、taskId、provider、model、成本、cache、retry、fallback、errorCode。

**核檢**：migration 可在空庫及現有 schema 執行；重試不重複計費；跨 workspace 不能讀寫；dead-letter 可重跑／忽略；配額超限返回 `QUOTA_EXCEEDED`。

**批准門檻**：Tech Lead、QA Lead、Finance／Operations。

### PH2-06：Keyword Intelligence

**工作流**：種子詞 → 語義／問題／實體／修飾詞 → 指標 enrichment → intent／embedding cluster → 競品 ranked keywords／gap → 保存快照 → brief。

**核檢**：

- [ ] DataForSEO／Ahrefs／Semrush 數值都保存 Provider、location、language、device、採集時間及估算標籤。
- [ ] AI 只能生成候選、intent、cluster、內容角度，不補造搜尋量或排名。
- [ ] 競品 Top 100 以指定市場、語言、裝置及觀測日期定義。
- [ ] Missing／Weak／Shared／Strong 結果可分頁、篩選、匯出及保存。
- [ ] GSC 自有站資料與第三方市場估算分開顯示。
- [ ] 重跑形成新快照；相同輸入不重複扣費。

**批准門檻**：Product、SEO／Content、Tech、QA。

### PH2-07：Content Optimizer 與 AI 評測

**工作**：

- 重用現有 SEO checks；分成 On-page、Query alignment、Topical coverage、Readability、Trust／citability。
- 支援標題、Meta、開場、段落、大綱、全文七種重寫範圍。
- 產生 diff、Claim Ledger、來源鏈、`SOURCE_REQUIRED` placeholder 及 locale QA。
- 使用 Structured Output；處理 refusal、截斷、runtime validation、schema repair 一次後失敗。
- 建立多語言 golden set、人工評分、citation entailment、meaning preservation 及 spam eval。

**核檢**：無來源數字／案例不能通過套用；E-E-A-T 真實證據由用戶提供；內容 hash 改變會阻止 CMS 覆蓋；批量計劃可取消且部分失敗可重試；AI 分數不覆蓋 deterministic 分數。

**批准門檻**：Content Reviewer、Security、QA；引用完整率、schema pass rate 及虛構事實 gate 全部達標。

### PH2-08：前台、客戶後台、管理後台實作

**前台**：按 PH2-01 的公開 route registry 實作首頁、Tools hub、工具詳情、Extension、Pricing、Blog、Blog category／article；初始 HTML 含 H1、正文、breadcrumb、相關連結。

**客戶後台**：以 `/app/sites/:siteId/*` 為站點上下文；研究、內容、Audit、Analytics、Links、Media、Tasks、Integrations、Billing 均從 App shell、workspace switcher、site breadcrumb 可達。

**管理後台**：以 `/admin/*` 為獨立管理 namespace；工作區、客戶、站點、Provider、用量、任務、政策、運營與設定只由管理導覽互鏈。

**核檢**：

- [ ] 三層 layout 不混用權限與 SEO metadata。
- [ ] 首次載入、空、錯誤、partial、quota、provider unavailable、無權限、重試及行動端狀態齊全。
- [ ] 表格、diff、圖表、來源 badge、亮／暗主題達 WCAG AA。
- [ ] 全部可見文案走 i18n；內容 locale 與 UI locale 分開。
- [ ] 任何公開頁新增都會觸發 route、sitemap、link graph、SEO HTML 測試。

**批准門檻**：Design、SEO、Accessibility、Product、QA。

### PH2-09：CMS 寫回與發布後驗證

**順序**：Provider 發現 → AI 分析 → 草稿 → 人工批准 → CMS draft →（授權後）publish／schedule → 重新抓取 → backlink／內容驗證。

**第一批**：WordPress draft push；第二批：Ghost／Shopify `PublishingTargetAdapter`。

**核檢**：

- [ ] CMS connection 狀態、OAuth／Application Password、scope、workspace、角色均驗證。
- [ ] 發布前重新 GET 最新值，比對 hash；不一致返回 `STALE_CONTENT_SNAPSHOT`。
- [ ] 預設 draft；publish／schedule 需要 Owner／Admin 或明確授權。
- [ ] 發布使用 idempotency；失敗不重複建立 CMS 文章。
- [ ] 發布後檢查 HTTP、canonical、target URL、錨文本、`rel`、可索引提示與內容 hash。
- [ ] 未授權第三方 URL 永遠拒絕；不承諾排名或索引提升。

**批准門檻**：Security、CMS Owner、QA；寫入功能必須先在測試站通過 E2E。

### PH2-10：Site Audit remediation 與監控

**工作**：

- 自有 crawler：robots、sitemap、canonical、dead links、HTML、Schema、孤島頁。
- Lighthouse：lab data；CrUX：28 日 field data；不把兩者合成假精準分數。
- 建立 issue → task → fix／ignore → recheck → fixed／persisting／regressed。
- 競品排名、內容更新、backlink、新／失及 AI visibility 以固定條件採樣。
- 告警使用 fingerprint、閾值、靜默期與摘要頻率。

**核檢**：單 URL 失敗不丟整站結果；partial 可查看；CrUX 無樣本不算 Audit failure；監控重送不重複告警；公開 Audit 有 rate limit、challenge、page cap。

**批准門檻**：SEO、Security、QA、Operations。

### PH2-11：Billing、Entitlement 與報告

**工作**：

- 先接 Stripe Subscription、Entitlements、Customer Portal；本地 usage ledger 保持即時配額。
- PayPal 放在 Stripe 對帳穩定後，以固定月／年 plan 為主。
- 生成 PDF／CSV／白標報告，所有匯出保留來源、時間、地區、裝置及估算標籤。
- 套餐 hard stop、spending cap、超額策略、退款／失敗 webhook 及對帳。

**核檢**：重放／亂序 webhook 不錯誤開通；Customer Portal session 需 Owner／Admin；超額拒絕可解釋；報告不包含秘密；帳單資料與內容刪除政策分離。

**批准門檻**：Finance、Security、Product、QA。

### PH2-12：全量 QA、安全與成本驗證

測試層：

- Unit：score、source label、locale、quota、fingerprint、SSRF、claim、idempotency。
- Contract：AI schema、SEO Provider、GSC、CrUX、CMS、Stripe／PayPal／Shopify webhook。
- Integration：migration、workspace isolation、usage reservation、queue、partial、dead-letter。
- E2E：公開頁 → 工具；研究 → brief → content → approve → draft；Audit → task → recheck；billing → entitlement。
- Visual／Accessibility：所有公開、客戶、管理頁的桌面／手機、亮／暗、表格、diff、空／錯誤狀態。
- Security：IDOR、SSRF、DNS rebinding、prompt injection、重放 webhook、憑據與資料保留。
- Cost：10／100／1,000 個研究或內容任務的 provider 成本、隊列、cache hit、上限與告警。

**核檢**：Lint、Test、Build、Security audit 全通過；所有新 migration 可重跑／可回滾；無 High security finding；成本不超過 approved cap；route graph 孤島數為 0。

**批准門檻**：QA Lead、Security、Finance、Release Owner。

### PH2-13：Staging、Canary 與生產部署

**部署前**：

1. 只從已批准 commit 建立 release branch／tag。
2. 取得資料庫備份、migration dry-run、Docker image digest、配置差異及 rollback commit。
3. Staging 完成 smoke、E2E、SEO raw HTML、sitemap、robots、route graph、登入與權限測試。
4. 以 feature flag 對內部工作區開啟，完成 canary sign-off。

**部署順序**：migration → API／Worker → Web static build → 插件／CMS adapter → feature flag → health check。

**核檢**：

- [ ] `/health`、登入、受保護 API、公開首頁、Tools、Blog、Audit 均正常。
- [ ] sitemap 只有 canonical indexable URL；`/app`／`/admin` response header 為 noindex。
- [ ] queue backlog、error rate、P95 latency、provider cost、billing webhook 正常。
- [ ] canary workspace 可完成主要流程；沒有跨租戶、重複扣費或 CMS 誤寫回。

**批准門檻**：Release Owner、Operations、Product Owner 明確批准放量。

### PH2-14：部署後觀察與 GA 決策

觀察窗口：2 小時即時、24 小時穩定性、7 日產品與 SEO 指標。

監控：公開 200／404／5xx、JS console、route hit、孤島／失效連結、GSC sync、Provider 429／cost、queue／dead-letter、billing webhook、AI schema／citation failure。

回滾條件：

- 任一 P0 安全、資料隔離、誤寫回或重複扣費問題。
- API 5xx、Provider failure、queue backlog 或成本超過 cap 且無法在 30 分鐘內降級。
- 公開 route 生成重複 canonical、私有頁可索引或孤島數大於 0。

回滾後：保留報告與 usage ledger，停止新任務，通知工作區，建立 incident，修復後重跑 PH2-12 與 PH2-13；不得直接跳回放量。

## 6. API 與方案比較

價格均為官方公開資料在 2026-09-13 的快照；按量、地區、合約、稅項、最低消費及生效日期可能改變。正式採購前要重新核價，不能把本表當發票。完整核檢以 `docs/approvals/phase-2/PH2-02-provider-selection.md` 為準。

### 6.1 AI 文字、結構化輸出與 Embedding

| 方案             | 適合工作                                              | 價格／限制摘要                                                                                                                                          | 優點                                                        | 風險／取捨                                                      |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| OpenAI API       | Responses、Structured Outputs、工具、Embedding、Evals | 2026-09-13 快照：`gpt-5.6-luna` $0.20／$1.20、`gpt-5.6-terra` $2／$12、`gpt-5.6-sol` $4／$20 per MTok；Batch 約低 50%                                                                                   | **互動與 Embedding 主 Provider**；SDK、工具與結構化輸出完整 | 需處理 refusal、截斷、`store:false`、價格及資料區域變動             |
| Anthropic Claude | 高品質長文改寫、文件引用、審稿                        | Claude Sonnet 5：$2／MTok input、$10／MTok output；Haiku 4.5：$1／$5；Batch 低 50%                                                                      | **高品質 fallback**；引用與長文品質佳                       | schema 有子集及 strict tool 限制；價格快照需按官方頁更新        |
| Google Gemini    | 低成本批量、Grounding、Google Search 引用             | Gemini 3.8／3.7 Flash：2026-12-31 前 $0.75／$3.75 per MTok，2027-01-01 起 $1.50／$7.50；Batch 約低 50%；Google Search 每月共 5,000 requests 免費，其後 $14／1,000 queries | **離線批量與 grounding**；成本低、多語言                    | Grounding 按實際搜尋查詢計費；需保存 model ID 與生效日期 |

**推薦組合**：OpenAI Responses／Embedding 處理互動評分、結構化輸出與即時研究；Gemini Flash Batch 處理意圖、標籤、摘要及低成本批量初稿；Claude Sonnet 作高價值內容改寫、引用對齊與質量 fallback。所有請求走 `TextGenerationProvider`／`EmbeddingProvider`，不把模型 ID 寫死在業務邏輯。

### 6.2 SEO 數據與 Backlink

| 方案          | 適合工作                                                      | 價格／限制摘要                                                                                                                                                     | 評估                                                                   |
| ------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| DataForSEO    | Keyword ideas、ranked keywords、SERP、Backlinks、LLM Mentions | SERP Standard $0.0006／10 results、Priority $0.0012、Live $0.002；Backlinks $0.024／task + $0.000036／row；LLM Mentions $0.10／request + $0.001／row；最低充值 $50 | **平台預設首選**：涵蓋面最完整、適合統一 adapter；需 hard cap 與 cache |
| Ahrefs API v3 | 高階 Site Explorer、SERP、Brand Radar、Content Helper         | 只在符合資格的付費方案；大多請求最低 50 API units；預設 60 req/min；另有 pay-as-you-go／合約                                                                       | **Agency／Enterprise BYOK**：資料品質高，但不適合 Free 代付            |
| Semrush API   | Domain Organic、競品、Keyword、Backlinks、Trends、Site Audit  | 按 report／rows 使用 API units；不同報告及歷史資料單位不同，需帳戶核價                                                                                             | **BYOK／特定客戶**：報告廣，但成本與授權較複雜                         |

**推薦方案**：DataForSEO 作平台管理的主 Provider；Ahrefs／Semrush 先做 BYOK Adapter。單次 run 只用一個 canonical Provider，UI 顯示原生指標與方法，不把 DR、Authority Score、Domain Rank 混成一個分數。

### 6.3 效能與站點體檢

| 方案                   | 價格／限制                                                                                  | 選擇                                  |
| ---------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------- |
| Lighthouse             | 開源；自建 Node／CLI，主要是計算與 Worker 成本                                              | **必選 lab data**，版本與設定要保存   |
| CrUX API               | 官方 field data；每個 Cloud project 免費 150 queries/min，28 日 rolling；低流量頁可能無資料 | **必選 field data**，無資料不算失敗   |
| PageSpeed Insights API | 返回 Lighthouse lab，內部 real-world data 路徑將停止；需要 quota／API key 管理              | 保留過渡 fallback，不作長期 CrUX 真相 |

### 6.4 CMS 發布

| 方案                  | API 成本                                                      | 能力／限制                                                     | 排期                  |
| --------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- | --------------------- |
| WordPress REST        | API 本身無按次費；站點主機／插件另計                          | 已有 Application Password／插件基礎；可建立 draft／更新欄位    | **Phase 2A／2C 首選** |
| Ghost Admin API       | API 本身無按次費；Ghost(Pro) 或自建主機另計                   | Integration Token 只可 server-side；適合發布文章               | Phase 2C              |
| Shopify Admin GraphQL | API 本身無按次費；Shopify 套餐另計；有 query cost／rate limit | OAuth、最小 scope、articleCreate、HMAC webhook、reconciliation | Phase 2C              |
| Joomla／OpenCart      | API 本身通常無按次費；站點環境與擴展另計                      | 需版本／權限／欄位白名單；OpenCart 禁止改交易資料              | Phase 2D              |

### 6.5 計費與 Email

| 方案                        | 官方價格／限制摘要                                                                                                                | 選擇                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Stripe Billing／Checkout    | 標準線上卡交易頁列示 2.9% + $0.30／成功交易；國家、付款方式及合約可能不同；Entitlements／Meters／Customer Portal 另按產品能力使用 | **Phase 2B 首選**：訂閱與 entitlement 生態完整；request-time 仍用本地 ledger |
| PayPal Subscriptions        | Product／Plan／Subscription；交易費按地區與商戶合約                                                                               | Phase 2C 備選；先做固定月／年 plan                                           |
| Amazon SES                  | outbound email 約 $0.10／1,000；其他區域、附件、validation、dedicated IP 另計                                                     | 只在未來合法寄送功能批准後使用；先只生成草稿                                 |
| SendGrid／Mailgun／Postmark | 通常有免費額度或月費／按量；正式費率依帳戶與區域核價                                                                              | 先不選作核心，待 outreach 合規及寄送需求確定                                 |

## 7. 成本模型與最優化方案

### 7.1 預估公式

```text
monthly_cost
= seo_provider_calls * endpoint_unit_cost
+ input_tokens / 1,000,000 * input_price
+ output_tokens / 1,000,000 * output_price
+ grounding_queries * search_query_price
+ embedding_tokens / 1,000,000 * embedding_price
+ cms_hosting / storage / email / payment fees
```

每個工作區保存 `estimated_cost`、`actual_provider_cost`、`reserved_credits`、`finalized_credits` 及 `released_credits`。價格更新只改 pricing snapshot 與 routing policy，不改歷史用量。

### 7.2 例：1,000 次內容分析

假設每次 4,000 input tokens + 1,000 output tokens，共 4M input + 1M output，未計 grounding、storage、稅項及 provider minimum：

| 模型             |                          同步估算 | Batch 估算（按 50% 折扣假設） | 適合                 |
| ---------------- | --------------------------------: | ----------------------------: | -------------------- |
| Gemini 3.8／3.7 Flash | 4 × $0.75 + 1 × $3.75 = **$6.75** |                  約 **$3.38** | 批量標籤、摘要、初稿 |
| Claude Sonnet 5  |     4 × $2 + 1 × $10 = **$18.00** |                  約 **$9.00** | 高價值重寫、審稿     |
| Claude Haiku 4.5 |       4 × $1 + 1 × $5 = **$9.00** |                  約 **$4.50** | 低成本分類／改寫     |

這個例子只用於比較，不代表實際帳單；正式模型價格、上下文長度、cache、圖片、grounding、重試及輸出量都要進入計算。

### 7.3 SEO API 用量例子

以 DataForSEO 公開 PAYG 價格估算，未計最低充值、稅項、特殊 depth、clickstream 或套餐折扣：

| 用量                                          | 計算                                |    估算成本 |
| --------------------------------------------- | ----------------------------------- | ----------: |
| 1,000 個 Standard SERP（每個 10 results）     | 1,000 × $0.0006                     |   **$0.60** |
| 100 個 Backlinks task（每個 1,000 rows）      | 100 ×（$0.024 + 1,000 × $0.000036） |   **$6.00** |
| 1,000 個 LLM Mentions request（每個 10 rows） | 1,000 ×（$0.10 + 10 × $0.001）      | **$110.00** |
| 10,000 個 AI keyword volume items             | $0.01 + 10,000 × $0.0001            |   **$1.01** |

這說明 LLM visibility 及大批量 keyword enrichment 必須有 credits、cache、每日 cap 及執行前預估；不能以「無限使用」包裝。

### 7.4 最優化選擇

| 層             | 選擇                                                                        | 理由                                                                     |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| SEO data       | DataForSEO 平台主 Provider；Ahrefs／Semrush BYOK                            | 一套 API 覆蓋 keyword／SERP／backlink／LLM；高階客戶承擔自有費用         |
| AI routing     | OpenAI interactive／Embedding + Gemini Flash Batch + Claude Sonnet fallback | 以成本、品質、grounding、schema 和資料政策分工，不把所有工作交給昂貴模型 |
| Performance    | Lighthouse + direct CrUX                                                    | lab／field 分離，避開 PSI field data 退場風險                            |
| CMS            | WordPress first，Shopify second，Ghost optional，Joomla／OpenCart 2D        | 符合現有基礎與市場價值，逐步增加寫入面                                   |
| Billing        | Stripe Subscription／Entitlement + local usage ledger；PayPal later         | 付款與權限分離，配額不受非同步 meter 延遲影響                            |
| Email          | Phase 2 只 draft；日後優先評估 SES                                          | 先控制合規與發送風險，不把寄信變成 MVP 阻塞                              |
| Infrastructure | 現有 PostgreSQL + Redis／BullMQ + Hostinger Docker                          | 復用部署、備份、健康檢查與現有觀測，避免新增雲服務固定費                 |

## 8. 風險、停止與回滾

### 8.1 必須停止的情況

- Provider 報價、條款、資料保留或地區能力未核實。
- 任何頁面可公開索引但沒有導入連結、canonical 或初始 HTML 正文。
- AI 輸出含未驗證數字、引用不存在、schema 失敗或拒答被當成功。
- CMS 寫回沒有最新值校驗、快照、權限或 idempotency。
- usage ledger、Entitlement、Stripe／PayPal webhook 狀態不一致。
- Security／Privacy Reviewer 有未關閉 High finding。
- 依賴 API 的任務成本可能突破 spending cap。

### 8.2 降級策略

- SEO Provider 不可用：返回 `PROVIDER_UNAVAILABLE` 或既有快取，不用 AI 填值。
- AI Provider 不可用：切換同能力 fallback；若沒有同等資料政策，返回 partial／failed。
- CrUX 無資料：保留 Lighthouse lab 結果，顯示 field data unavailable。
- CMS 不可用：保存已批准草稿與任務，不重複發布。
- Billing webhook 延遲：保留本地已驗證 entitlement，進入 reconciliation，不立即永久停權。
- 高成本任務超限：hard stop 新任務，保留既有報告、匯出與回滾能力。

## 9. 第一個可批准垂直切片

為最快取得可驗證價值，建議先只做以下切片：

`PH2-00 → PH2-01 → PH2-02 → PH2-03 → PH2-04 → PH2-05 → PH2-06（單一 DataForSEO 主 Provider）→ PH2-07（單篇內容）→ PH2-09（WordPress draft）`

切片成功標準：

- 輸入一個種子詞、一個自有站、一個競品域名。
- 產生有來源標籤的候選詞、競品 gap 及內容 brief。
- 對一篇已同步文章完成五維 SEO 分析、逐項建議與 diff。
- 用戶批准後建立 WordPress draft，保存快照、成本與任務事件。
- 重新讀取 WordPress 真實值，確認不會覆蓋外部更新。
- 全部測試與 route／SEO graph gate 通過。

不在第一個切片加入：自動寄信、PayPal、Joomla／OpenCart、完整白標報告、全站批量發布、任意第三方 URL 寫入。

## 10. 最終批准順序

工程團隊實際執行時，按以下順序逐一取得批准：

1. `APPROVE PH2-00`：範圍與基線。
2. `APPROVE PH2-01`：三層路由、SEO graph、sitemap 與孤島防護。
3. `APPROVE PH2-02`：Provider、模型、價格、配額與最優化方案。
4. `APPROVE PH2-03`：架構、資料庫、API 與狀態機。
5. `APPROVE PH2-04`：安全、私隱、合規與停止條件。
6. `APPROVE PH2-05`：migration、queue、usage ledger、rate limit。
7. `APPROVE PH2-06`：Keyword Intelligence。
8. `APPROVE PH2-07`：Content Optimizer 與 AI eval。
9. `APPROVE PH2-08`：前台、客戶後台、管理後台。
10. `APPROVE PH2-09`：CMS draft／publish／verify。
11. `APPROVE PH2-10`：Audit remediation、監控與告警。
12. `APPROVE PH2-11`：Billing、Entitlement、報告。
13. `APPROVE PH2-12`：QA、安全與成本 release gate。
14. `APPROVE PH2-13`：staging、canary、生產部署。
15. `APPROVE PH2-14`：觀察窗口與 GA／回滾決策。

任何批准都只對該步的明確 scope 有效；Provider、價格、公開路由、資料權限或寫入範圍改變時，必須重新開啟相關步驟。
