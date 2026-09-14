# PH2-10 Site Audit Remediation 與監控核檢

> 文件狀態：`APPROVED / IMPLEMENTATION IN PROGRESS`
> 建立日期：2026-09-14
> 前置批准：`APPROVE PH2-04`、`APPROVE PH2-05`、`APPROVE PH2-08`
> 依據：`docs/rankwoven-phase-2-prd.md` 第 9.3、9.4、13.5、14、16、17 節、`docs/rankwoven-phase-2-development-workflow.md`
> 本步不啟用：未經 rate limit／challenge 的公開全站掃描、侵入式漏洞掃描、未授權第三方抓取、自动 CMS 修復、Email 告警發送及未批准的競品／AI visibility Provider 出站。

## 1. 目標與完成定義

PH2-10 將現有 Site Audit、Lighthouse 與 GSC 能力整理為可追蹤的「問題 → 任務 → 修復／忽略 → 重新檢查」閉環，並建立基於 fingerprint 的競品／AI visibility／技術告警監控。

```text
connected site / public capped URL
  → SSRF-safe crawl + sitemap/robots discovery
  → deterministic findings + Lighthouse lab + CrUX field data
  → issue fingerprint / evidence / severity
  → task create, fix, ignore or retry
  → recheck
  → fixed / persisting / regressed / partial
  → deduplicated alert and digest
```

完成標準：

1. 單一 URL、Lighthouse 或 CrUX 請求失敗不丟失整站結果；run 支援 `queued`、`running`、`partial`、`completed`、`failed`、`cancelled`，並展示成功／失敗數與 partial reason。
2. 所有 URL 抓取都使用 PH2-04 `PublicUrlPolicy`，每次 redirect 重新解析 DNS／IP，限制 scheme、port、MIME、大小、timeout、並發與 page cap；不進行侵入式漏洞掃描。
3. Lighthouse lab data 與 CrUX 28 日 rolling field data 分區保存；CrUX 無樣本顯示 unavailable，不計作 Audit failure，也不與 lab data 合成假精準分數。
4. 每一個 issue 有穩定 fingerprint、category、severity、affected URL、偵測證據、規則版本、來源類型與可執行建議；同一問題跨 run 能判斷 fixed、persisting 或 regressed。
5. 修復任務只可套用已批准且欄位白名單允許的 WordPress SEO 建議；伺服器、DNS、模板、robots 或程式碼問題只提供建議與 snippet，不自動改動。
6. 監控依套餐使用每日／每週固定條件採樣，保存 provider、模型／prompt（如適用）、location、language、device、sampledAt 與 estimated 標籤；重送相同 fingerprint 不產生重複告警。

## 2. 現況與缺口

| 範圍 | 已有能力 | PH2-10 缺口 |
| --- | --- | --- |
| Site Audit | `apps/api/src/siteAudit.ts` 已有 SerpApi `site:` 索引查詢、Title／Meta／索引／URL／HTTPS checks、結果／問題 repository、weekly／monthly 排程與配額統計。 | 缺 crawl graph、robots／sitemap／canonical／死鏈／schema／孤島、issue fingerprint、recheck 狀態與 issue task 關聯。 |
| Lighthouse | `apps/api/src/lighthouse.ts` 已有受保護 URL audit、SSRF policy 與 lab score。 | 需納入 audit run、device／lab source metadata、partial aggregation、P95／cost telemetry；不得與 CrUX 合併。 |
| CrUX／GSC | GSC Search Analytics 與 sitemap submission 已存在；CrUX 仍只有 PRD／方案記錄。 | 需正式 CrUX adapter、28 日 field snapshot、無樣本狀態、quota／cache、來源標籤與前端分區展示。 |
| 修復工作流 | Sync task、optimization suggestion、Apply Snapshot、WordPress rollback 與 PH2-05 dead-letter 已存在。 | 需 issue → remediation task、ignore reason、recheck、fingerprint disposition 與 regression history。 |
| 監控／告警 | 有 dead-letter alert threshold，沒有競品／AI visibility／技術事件資料模型。 | 需 monitor config／run／event／alert、基線、閾值、靜默期、digest 與去重。 |
| 公開入口 | `/app/sites/:siteId/site-audit` 已可由站點列表進入；公開 `/tools/site-audit` 仍 disabled。 | 公開掃描需 challenge、匿名 rate limit、page cap、成本 hard stop 與不保存敏感正文；待本步 gate 後才可開啟。 |

## 3. 資料與 API 契約

### 3.1 Migration `0019_phase2_site_audit_monitoring.sql`

新增 workspace／site-scoped 表：

| 表 | 用途 | 關鍵欄位／約束 |
| --- | --- | --- |
| `site_audit_pages` | 單次 run 的 URL、HTTP、title、canonical、robots、schema、links 與來源。 | run + normalized URL 唯一；不保存超過保留期的完整正文。 |
| `site_audit_findings` | 可追蹤問題與 fingerprint。 | run、page、fingerprint、severity、evidence、recommendation、status；同 fingerprint 保存 disposition。 |
| `site_audit_rechecks` | 修復後重新檢查結果。 | finding + recheck time；`fixed`／`persisting`／`regressed`／`partial`。 |
| `site_audit_metrics` | Lighthouse lab／CrUX field 分區指標。 | source type、provider、device、window、value／status、collectedAt；CrUX no sample 可為 null。 |
| `monitor_configs` | 競品、AI visibility、技術監控排程與閾值。 | workspace、site、frequency、timezone、event types、status、entitlement。 |
| `monitor_runs`／`monitor_events` | 固定採樣與差異事件。 | config + scheduledAt 唯一；event fingerprint 去重；保存來源與估算標籤。 |
| `alerts` | 通知狀態與靜默設定。 | event + channel 唯一；status、mutedUntil、sentAt、readAt。 |

所有新表須有 `workspace_id`、`created_at`、`updated_at`、composite FK／scope trigger；migration 可重放，禁止 runtime 建表。

### 3.2 API

| Method | Endpoint | 行為 |
| --- | --- | --- |
| `POST` | `/api/v1/site-connections/:siteId/site-audit/runs` | 建立完整 audit task；受 page limit、rate limit、quota 與 SSRF policy 約束。 |
| `POST` | `/api/v1/site-connections/:siteId/site-audit/manual-runs` | 對同一已連接站點的單一公開 URL，或已同步且已發布的文章／商品執行只讀檢測；不建立 CMS 寫回或發布任務。 |
| `GET` | `/api/v1/site-audit/runs/:runId` | 取得 run、pages、findings、Lighthouse／CrUX metrics、partial 與成本來源。 |
| `POST` | `/api/v1/site-audit/findings/:findingId/tasks` | 建立 remediation task；只允許 workspace／site matching finding。 |
| `POST` | `/api/v1/site-audit/findings/:findingId/ignore` | 保存人工忽略原因、操作者與期限。 |
| `POST` | `/api/v1/site-audit/findings/:findingId/recheck` | 建立 recheck task，完成後標記 fixed／persisting／regressed。 |
| `POST` | `/api/v1/public/site-audits` | 未登入受限掃描首頁／最多 10 URL；需 challenge、匿名 rate limit、page cap，不保存敏感正文。 |
| `POST` | `/api/v1/monitors` | 建立競品／AI visibility／技術監控；需 feature entitlement。 |
| `GET` | `/api/v1/monitor-events` | 分頁讀取事件、基線、當前值、變化量、來源與建議。 |
| `POST` | `/api/v1/alerts/:alertId/mute` | 設定單事件或事件類型靜默期。 |

所有寫入要求 Bearer JWT、workspace／site scope、角色、Idempotency-Key、quota reserve 與 audit event。API 不接受任意 crawler endpoint、Provider key、模型 ID 或 raw payload。

## 4. Worker、來源與告警規則

- `site_audit_crawl`：依 robots／sitemap／page cap 抓取公開 HTML，先驗證 URL；單頁錯誤寫入 partial page，不中止整個 run。
- `site_audit_lighthouse`：固定 device／版本與 timeout，保存 lab source；失敗只令 metric unavailable。
- `site_audit_crux`：只查官方 CrUX API；保存 28 日 window、合資格 URL／origin 與 no-sample 狀態；不使用 PageSpeed real-world 欄位作長期真相。
- `site_audit_recheck`：沿用 fingerprint 與規則版本，將 finding 轉為 fixed／persisting／regressed；不覆蓋舊 run。
- `monitor_sample`：按 config 固定 query／model／locale／device 採樣，競品正文只保存 URL、標題、結構、hash、摘要，不保存長期全文。
- `alert_dispatch`：先以 `event fingerprint + channel` 去重，再按 threshold、quiet period、digest frequency 產生通知；PH2-10 只保存 queue／in-app 狀態，Email 發送留待合規與 PH2-11。

## 5. 安全、成本與私隱 gate

- 公開 Audit 每 IP／workspace／site 分層 rate limit；無 challenge／quota service 時 production fail closed。
- 每次 run 限 URL 數、redirect 次數、response bytes、總耗時與並發；禁止 localhost、private／metadata IP、DNS rebinding、任意 port 與侵入式 payload。
- 手動單頁檢測只接受與已連接站點完全相同的 origin，redirect 離開該 origin 時立即停止；正文只在記憶體解析，不寫回 CMS，也不建立寫回任務。
- Provider、CrUX、Lighthouse、GSC 指標永遠顯示 `first_party_observed`、`provider_estimated`、`deterministic_check` 或 `ai_inferred`，不把缺失值轉成 0。
- Issue recommendation 可生成 code snippet，但外部抓取內容當作不可信資料；不能要求 AI 執行工具、讀 secret 或自動修復伺服器。
- 監控、告警、raw response、頁面正文與 contact 資料依 PH2-04 retention；普通 log 只記 ID、hash、狀態、耗時與錯誤碼。
- 監控建立、修改、暫停、重跑、忽略、靜默與公開掃描均寫 audit event；成本超過 cap 時 hard stop，不自動升級套餐或切換未批准 Provider。

## 6. 驗收與測試

- [ ] migration upgrade／重放、新資料庫、workspace isolation 與大結果分頁通過。
- [ ] robots／sitemap／canonical／dead links／schema／孤島、HTTP／HTTPS、Meta／heading、圖片與 internal links 有 deterministic fixture。
- [ ] 單 URL timeout／429／5xx 不丟整站結果；run 正確標記 partial 與失敗原因。
- [ ] Lighthouse lab、CrUX 28 日 field、GSC first-party data 分區展示；CrUX no sample 不算失敗。
- [ ] finding fingerprint、issue → task → fix／ignore → recheck 的 fixed／persisting／regressed 歷史可重現。
- [ ] 公開 Audit challenge、匿名／workspace rate limit、page cap、SSRF／DNS rebinding、成本 hard stop 與 no-raw-body log 測試通過。
- [ ] monitor event／alert fingerprint 去重、threshold、quiet period、digest、mute／resume 與亂序重送測試通過。
- [ ] `npm run lint`、`npm run test`、`npm run build`、`npm run security:audit`、本機 Docker／WordPress／CrUX mock smoke 通過。

## 7. 實作順序與批准請求

1. 新增 `0019` migration、Audit／Monitor domain types、repository、fingerprint 與資料隔離測試。
2. 擴展既有 Site Audit／Lighthouse，接入 page graph、CrUX adapter、partial run 與 metrics 分區。
3. 建立 remediation task、ignore／recheck 狀態機與 WordPress 安全欄位建議連結；伺服器／DNS 修復只出建議。
4. 建立 monitor config／run／event／alert、去重與 digest queue；Email 與第三方寫操作保持關閉。
5. 在 mock Provider／測試站完成 API／Worker／E2E／security／cost tests，最後才評估開啟公開 `/tools/site-audit`。

**批准記錄**：2026-09-14 收到 `APPROVE PH2-10`，按上述邊界開始實作。公開掃描與 Email 告警仍保持關閉，完成核檢後另行申請啟用。

## 8. 已實作的第一階段切片

- `0019_phase2_site_audit_monitoring.sql`：建立 page、finding、recheck、metrics、monitor、run、event、alert 表，並加入 workspace scope trigger、finding remediation task 關聯與事件唯一約束。
- `apps/api/src/siteAuditMonitoring.ts`：提供記憶體／PostgreSQL repository、穩定 fingerprint、受控 crawler、page graph 確定性檢查、CrUX 28 日 field adapter、Lighthouse lab metric、finding ignore／recheck／task、monitor scheduler／alert API。
- 連接站點 audit 不依賴 SerpApi：每頁 redirect 均重新校驗，限制協議／端口／私網、MIME、2 MB body、8 秒單頁、60 秒總耗時、3 次 redirect 與 25 頁 cap；正文只在記憶體解析，不持久化。
- `apps/api/src/siteAudit.ts`：允許 `partial`／`cancelled` audit 狀態；舊版 Site Audit route 保持兼容。
- `apps/web/src/api/siteConnections.ts` 與客戶後台：新增 Site Audit metrics、監控建立／事件、告警列表與 24 小時靜默操作；所有寫入自動附帶 Idempotency-Key。
- `apps/api/tests/siteAuditMonitoring.test.ts`：覆蓋 crawler、fingerprint、page graph、recheck 狀態、CrUX 無樣本、workspace／idempotency、監控閾值及告警去重。

未啟用：公開匿名掃描、Email 發送、未批准 Provider 的競品／AI visibility 出站採樣、自動伺服器／DNS 修復。競品／AI visibility config 會被保存，但 scheduler 僅記錄 `partial / PROVIDER_UNAVAILABLE`，不會繞過 Provider 批准邊界。
