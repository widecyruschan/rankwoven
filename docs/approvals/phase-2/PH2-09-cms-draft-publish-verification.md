# PH2-09 CMS 寫回與發布後驗證核檢

> 文件狀態：`APPROVED / IMPLEMENTATION IN PROGRESS`
> 建立日期：2026-09-14
> 批准日期：2026-09-14
> 批准人：Product Owner（使用者）
> 前置批准：`APPROVE PH2-04`、`APPROVE PH2-05`、`APPROVE PH2-07`、`APPROVE PH2-08`
> 依據：`docs/rankwoven-phase-2-prd.md` 第 9.2、9.5.1、13.2、13.3、15、16 節、`docs/rankwoven-phase-2-development-workflow.md`、`plugins/wordpress/TESTING.md`
> 本步不啟用：未授權第三方 CMS、預設 publish／schedule、Email outreach、Shopify／Ghost 寫入、任何繞過人工批准的自動發布。

## 1. 目標與完成定義

PH2-09 將 PH2-07 已批准的內容改寫，安全寫入已連接 WordPress 的 **draft**，並保存完整的「來源快照 → 批准 → 寫入 → CMS 回應 → 重新抓取驗證」事件鏈。

```text
approved content suggestion
  → 重新讀取 CMS 最新內容
  → 比對 source hash / scope / role / entitlement
  → 建立不可變 publish snapshot
  → idempotent WordPress draft task
  → 保存 CMS post ID / response hash
  → 重新抓取 canonical / HTTP / content hash
  → verified / changed / blocked / failed
```

完成標準：

1. PH2-07 `/content-optimizations/:runId/apply` 只有在 source snapshot 仍一致、所有 claim 可批准、內容建議已批准、使用者具 `editor+` 且 CMS connection 為 `connected` 時才建立 `202` draft task。
2. 預設永遠建立或更新 WordPress `draft`；`publish`／`schedule` 在本階段一律 API 拒絕，不以 UI 隱藏取代伺服器 gate。
3. 每次寫入有 `Idempotency-Key`、內容 hash、CMS target、operator、task、snapshot 與 response hash；重試不得建立重複文章或重複扣用量。
4. Worker 在帶 Application Password request 前重驗 URL／DNS／redirect，並在寫入前 GET 最新 CMS 值；hash 不同返回 `STALE_CONTENT_SNAPSHOT`。
5. 成功後重新抓取草稿／公開 URL，檢查 HTTP、canonical、內容 hash、索引提示與預期錨文本；結果只描述可觀測狀態，不承諾索引或排名。

## 2. 現況與缺口

| 範圍 | 已有能力 | PH2-09 缺口 |
| --- | --- | --- |
| WordPress connection | Application Password 以 AES-GCM 加密；Worker 使用 SSRF policy、Basic Auth、timeout、MIME／size guard。 | 需把 PH2-07 content run／suggestion 與 WordPress draft target 連結，不可混用既有 SEO field apply snapshot。 |
| 寫回與回滾 | `optimization_suggestions`、`apply_snapshots`、`suggestion_apply`／`suggestion_rollback` 已可處理安全欄位與內部連結。 | 內容重寫需要不可變 content publish snapshot、CMS post ID、draft lifecycle、idempotency 與內容 hash 比對。 |
| PH2-07 | content run、claim、rewrite suggestion、`STALE_CONTENT_SNAPSHOT` preflight 與 `CMS_WRITE_DISABLED` 已存在。 | apply route 仍固定拒絕；缺少真正 draft task、publish record、重新抓取驗證和 content-specific rollback。 |
| 權限與審計 | API workspace scope、role、task attempt、usage ledger、audit event 已具備。 | publish／schedule policy、approved claim gate、CMS response 脫敏、draft event audit 與 retention 要補齊。 |
| 本機測試 | WordPress Docker、插件 REST API、套用／回滾 checklist 已可用。 | 需新增 content draft E2E：approved suggestion → WordPress draft → stale conflict → idempotent retry → verification。 |

## 3. 資料、API 與 Worker 契約

### 3.1 Migration `0018_phase2_cms_content_publications.sql`

新增以下 workspace-scoped、不可越權引用的資料結構：

| 表 | 用途 | 關鍵約束 |
| --- | --- | --- |
| `content_publish_snapshots` | 寫入前已批准內容、source hash、CMS 最新值、operator、目標與 task。 | run／suggestion／site 必須同 workspace；snapshot 不覆寫。 |
| `content_publications` | CMS draft lifecycle、CMS post ID、response hash、verification 狀態與錯誤碼。 | `site_id + idempotency_key` 唯一；同 snapshot 只可有一筆 active publication。 |
| `content_publication_verifications` | 每次重抓取的 HTTP、canonical、content hash、index hint、verifiedAt。 | publication + verification time；不保存 CMS credential 或 raw body。 |

所有新表包含 `workspace_id`、`created_at`、`updated_at`、FK／composite scope constraint，且 migration 可重放。原有 `apply_snapshots` 保留給既有 SEO field apply，不移植或破壞歷史資料。

### 3.2 API

| Method | Endpoint | 行為 |
| --- | --- | --- |
| `POST` | `/api/v1/content-optimizations/:runId/apply` | 驗證 approved suggestion／claim／site／role／snapshot，建立 content draft task，回 `202`。 |
| `GET` | `/api/v1/content-publications/:publicationId` | 查看 draft、CMS ID、snapshot、task、驗證狀態與 sanitized error。 |
| `POST` | `/api/v1/content-publications/:publicationId/verify` | 重新入隊抓取驗證；不得改變 CMS。 |
| `POST` | `/api/v1/content-publications/:publicationId/rollback` | 只允許在 content hash／snapshot 規則符合時建立回滾 draft task。 |

任何 `publish`／`schedule` 請求在 PH2-09 均回 `CMS_PUBLISH_DISABLED`；未批准建議回 `SUGGESTION_NOT_APPROVED`；claim 未通過回 `CONTENT_CLAIM_UNSUPPORTED`；CMS 最新值不同回 `STALE_CONTENT_SNAPSHOT`。

### 3.3 Worker

新增 `cms_content_draft`、`cms_content_verify`、`cms_content_rollback` task kind：

1. claim 後再次讀取 site connection、role context、content publication snapshot 與 CMS 最新文章。
2. 對 WordPress REST request 使用既有 `validatePublicUrl`、固定 IP lookup、manual redirect、15 秒 timeout 與 2 MiB limit；不記錄正文、Application Password 或 Authorization header。
3. 預設使用 WordPress REST 建立／更新 `draft`；task 失敗依 PH2-05 retry／dead-letter／usage release 處理。
4. 成功後保存 CMS ID、response hash，並建立 verify task；verify 讀取實際內容與 canonical，不假設排程／索引完成。

## 4. 安全、私隱與操作規則

- 僅允許已連接且屬於目前 workspace 的 WordPress site；不得接受任意 CMS URL 或第三方 domain。
- `editor+` 可建立 draft；`owner`／`admin` 才能執行任何日後受批准的 publish／schedule，且 PH2-09 仍保持 server-side disabled。
- 每次 apply／rollback／verify 寫 audit event；metadata 只保存 ID、hash、狀態、provider、CMS ID 與錯誤碼。
- claim 為 `source_required`、`blocked`、`rejected` 或 suggestion 未 approved 時，禁止寫入；使用者第一手主張保留 `user_asserted` 標記。
- publication、snapshot、驗證結果按 PH2-04 內容保留／刪除政策清理；解除 CMS connection 時刪除 credential 並終止待執行 CMS task。

## 5. 驗收與測試

- [ ] migration upgrade／重放、新資料庫與 workspace isolation integration test 通過。
- [ ] approved content suggestion 建立一筆 idempotent WordPress draft；同 key 重試不新增第二篇草稿或第二筆 usage reserve。
- [ ] 修改 WordPress 最新內容後 apply 必回 `STALE_CONTENT_SNAPSHOT`，不發出 PUT／POST 寫入。
- [ ] 未批准 suggestion、blocked／source-required claim、無權限角色、revoked site、失效憑據、unsafe redirect、429／timeout／partial／dead-letter 均有回歸測試。
- [ ] verify 記錄 HTTP、canonical、content hash 與可觀測結果；不宣稱排名或索引成功。
- [ ] 依 `plugins/wordpress/TESTING.md` 在本機測試站完成 draft、rollback、WordPress 作者、快照真實值與 publish-disabled E2E。
- [ ] `npm run lint`、`npm run test`、`npm run build`、`npm run security:audit`、本機 API／Worker／WordPress health 通過。

## 6. 實作順序與批准請求

1. 新增 `0018` schema、domain types、repository、workspace trigger 與 migration tests。
2. 以 PH2-07 apply route 建立 snapshot／publication／costed task；保持 publish／schedule disabled。
3. 實作 Worker draft、verify、rollback；重用既有 WordPress安全 fetch，補 task attempt／audit／usage handling。
4. 新增 API／Worker／PostgreSQL／WordPress Docker E2E 測試，完成 docs 與全倉驗證。

**批准請求**：請確認 WordPress-first、draft-only、人工批准、stale snapshot、idempotency、重新抓取驗證與 publish-disabled 邊界。收到 `APPROVE PH2-09` 後才建立 migration、修改 apply route、啟用 CMS content draft task 或同步測試站插件。

## 7. 實作進度（2026-09-14）

- 已新增 `0018_phase2_cms_content_publications.sql`，建立 content publish snapshot、publication 與 verification 的 draft-only 資料結構；本機 migration 已成功套用。
- WordPress 插件已新增受 Application Password／`edit_posts` 權限保護的 `POST /wp-json/rankwoven/v1/posts/draft`；不接受 publish 或 schedule，固定以 `post_status=draft` 建立內容。
- 已同步至本機 WordPress 測試站並通過 PHP 語法檢查。
- 待完成：apply route publication snapshot、Worker `cms_content_draft`／verify／rollback task、approved claim gate、stale CMS GET、idempotency、publication API 與 WordPress E2E；在這些完成前 PH2-07 apply 仍保持 `CMS_WRITE_DISABLED`。
