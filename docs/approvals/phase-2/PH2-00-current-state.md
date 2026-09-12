# PH2-00 現況分析、網站盤點與第一階段 PRD 對比

> 狀態：待批准
> 分析日期：2026-09-12
> 代碼基線：`main@225b12bd9870ef5a2a175809c9d75a57357099a7`
> 對照文件：`docs/seo-ai-platform-prd.md`、`docs/rankwoven-phase-2-prd.md`、`docs/frontend-page-spec.md`

## 1. 目的與範圍

本次 PH2-00 只做現況盤點與 PRD 對比，不開始 PH2-01 路由實作。盤點範圍包括：

- 公開前台、Blog、認證流程、客戶後台及管理後台。
- `apps/api` 的認證、站點、同步、SEO、關鍵詞、GSC、GA4、Lighthouse 及任務 API。
- `apps/worker` 的重試、退避、死信、WordPress 最新值校驗及寫回。
- `packages/ai-providers`、`packages/cms-adapters` 及 WordPress 插件。
- 第一階段 PRD 的模組覆蓋度與待辦，及第二階段 PRD 已規劃的承接範圍。

## 2. 核檢證據

| 證據                     | 結果                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Git 基線                 | `main` 與 `origin/main` 同為 `225b12b`                                                               |
| 工作區                   | 存在使用者既有未提交修改；本次不 stage、不覆蓋、不清理                                               |
| `npm run lint`           | 通過                                                                                                 |
| `npm run test`           | API 46 passed／4 skipped；Web 12 passed；Worker 4 passed；AI Provider 7 passed；CMS Adapter 1 passed |
| `npm run build`          | 通過；生成 96 個公開 SEO fallback                                                                    |
| SEO build graph          | 86 篇 Blog inlinks、10 個公開頁 inlinks；孤島數 0                                                    |
| `npm run security:audit` | `found 0 vulnerabilities`                                                                            |
| 生產 API                 | `https://api.rankwoven.com/health` 返回 API 服務正常                                                 |
| 生產 Web                 | `https://rankwoven.com` 返回 `200 OK`                                                                |

## 3. 網站盤點

### 3.1 公開前台與 Blog

實際公開 SEO manifest 位於 `apps/web/src/constants/publicSeo.json`：

| 分類       | 已存在入口                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------- |
| 固定公開頁 | `/`、`/features`、`/docs`、`/help`、`/about`、`/contact`、`/privacy`、`/terms`、`/blog`、`/pricing` |
| Blog       | `/blog`、`/blog/:slug`，文章 manifest 86 篇                                                         |
| 靜態 SEO   | `apps/web/scripts/generate-seo-pages.mjs` 生成 H1、正文、canonical、metadata、BlogPosting 及內鏈    |
| Sitemap    | `apps/web/public/sitemap.xml`，10 個固定入口 + 86 篇文章                                            |
| 孤島狀態   | 最近一次 build 驗證公開頁及 Blog 導入連結，孤島數 0                                                 |

現況已能處理已發布的公開頁，但 `/tools/*`、`/extension`、Blog 分類頁、locale prefix route 等第二階段頁面尚未在實際 Vue Router／SEO manifest／Sitemap 中落地。現有公開頁的生成清單與 Router 也尚未由同一 route registry 驅動，這是 PH2-01 的主要工作。

### 3.2 認證流程

目前有 `/login`、`/register`、`/forgot-password`、`/reset-password`，API 有 login、register、change-password、forgot-password、reset-password。未發現 email verification、OAuth、workspace invitation 或多工作區切換 API／UI。

注意：forgot-password 的開發模式仍會在 response 提供 dev reset token，生產環境雖已排除，但正式 Beta 前需要郵件 provider、token hash、過期、單次使用及不洩漏帳戶存在性的完整流程。

### 3.3 客戶後台

實際 Router 已有 `/app`、`/app/sites`、`/app/analytics`、`/app/keywords`、`/app/media`、`/app/apply`、`/app/links`、`/app/tasks`、`/app/cms-adapters`、`/app/settings`、`/app/lighthouse`、`/app/site-audit`，以及多個舊 route redirect。

已確認功能：

- 站點連接、Token 管理、文章／媒體同步、分頁、增量同步及手動刷新。
- AI／模板關鍵詞建議、第三方 enrichment、GSC keyword merge。
- SEO Audit、內容／媒體／內鏈建議、單項與批量 approve／apply、快照與 rollback。
- Analytics、GSC、GA4、Lighthouse、Site Audit、任務、死信統計／重試／忽略／CSV／JSON export。
- 亮／暗主題及 i18n 框架。

主要未完成：

- 尚未改為第二階段要求的 `/app/sites/:siteId/*` site-scoped canonical route。
- `/app/research`、`/app/content-optimizer`、`/app/monitors`、`/app/visibility`、`/app/backlinks`、`/app/billing`、`/app/developers` 尚未實作。
- 批量 API 與部分頁面已存在，但尚無統一 Content Optimization Plan、跨頁進度、成本預估及完整 side-by-side review。

### 3.4 管理後台

實際頁面只有 `/admin`、`/admin/customers`、`/admin/usage`、`/admin/operations`、`/admin/settings`。已可查看客戶、用量、運營及設定；`/admin/workspaces`、`/admin/sites`、`/admin/providers`、`/admin/tasks`、`/admin/content-policies` 尚未落地。

### 3.5 WordPress 插件

插件已包含 Dashboard、連接、搜尋外觀、Sitemap、GEO、Link Assistant、SEO Analysis、圖片屬性／優化／轉換、Tools、Diagnostics，以及 LLMs.txt、RSS Sitemap、IndexNow、hreflang、JSON-LD、內容同步和 SEO 建議寫回。

未完成部分是從第二階段 content brief 生成文章並推送 WordPress draft 的正式 SaaS API／任務流程；Ghost、Shopify、Joomla、OpenCart 也尚未有 runtime 發布適配器。

## 4. 第一階段 PRD 對比與判定

| 第一階段模組     | 最新證據判定                                                                               | 第二階段承接                                              |
| ---------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| 認證與工作區     | 部分完成：login／register／password API 已有；email verify、OAuth、邀請、多 workspace 缺失 | Phase 2A；OAuth 可後置 Phase 2B                           |
| 站點連接管理     | 基線完成：workspace filter、Token、GA4、刪除、同步                                         | 只補 site-scoped route、connector health                  |
| 內容同步         | 基線完成：分頁、增量、batch、manual refresh、去重                                          | 作為 Research／Content 的資料來源                         |
| SEO 審計         | 基線完成但外部 E2E 待驗：規則、歷史、11 類 Site Audit 已有                                 | Phase 2A／2B 補 remediation、recheck、SSRF、CrUX          |
| Lighthouse／效能 | 基線完成：PSI + Chromium；field data 路徑需調整                                            | Phase 2A 改 direct CrUX，分離 lab／field                  |
| GSC／GA4         | 基線完成但新鮮度／缺行說明不足                                                             | 補來源標籤、資料延遲、比較與不完整 metadata               |
| AI 內容優化      | 部分完成：editor analyze／generate 及圖片生成已有                                          | Phase 2A Content Optimizer、Claim Ledger、批量 plan、eval |
| 圖片 SEO         | 基線完成：屬性生成、批量轉圖、上下文 fallback                                              | 只補成本、任務及失敗治理                                  |
| 內部連結         | 基線完成：generate、rescan、approve／apply、前端頁面                                       | 定時自動套用延至 Phase 2C，預設關閉                       |
| 審批與應用       | API 及部分 UI 已完成：batch approve／apply、快照、WP 最新值讀取                            | 統一 diff、plan、idempotency、權限與回滾驗收              |
| 關鍵詞研究       | 部分完成：AI／模板／enrich／GSC；沒有持久化研究專案                                        | Phase 2A Keyword Intelligence、cluster、gap、brief        |
| 分析儀表盤       | 部分完成：Dashboard、GSC、Lighthouse；無多站點報告                                         | Phase 2B 多站點比較、PDF／CSV／白標報告                   |
| WordPress 插件   | 基線完成 SEO／GEO／同步／寫回；內容 draft push 缺失                                        | Phase 2A WordPress draft；跨 CMS Phase 2C／2D             |
| Worker 任務      | 部分完成：retry／backoff／dead-letter／export／alert 已有                                  | Phase 2A task attempts、circuit breaker、集中監控         |
| 國際化           | 框架完成：列出 11 locale；主要訊息完整度集中於 en／zh-Hant                                 | Phase 2A 先完成已 QA 的六個 market locale                 |
| 管理後台         | 部分完成：5 個 route                                                                       | Phase 2A／2B 補 workspace、provider、tasks、policies      |
| 品牌與公開前台   | 已發布基線完成：96 個 SEO fallback、公開 link graph 孤島 0                                 | Phase 2A route registry、工具頁及 CI graph gate           |
| CI／CD           | 已發布基線完成：lint、test、build、security、部署流程                                      | 新增 route／migration／成本／孤島 gate                    |
| 報告與導出       | 未完成：只有任務 CSV／JSON                                                                 | Phase 2B `report_exports`、PDF／CSV／白標                 |
| 定價與訂閱       | 未完成：只有 PricingView，無 billing／entitlement API                                      | Phase 2B Stripe + local usage ledger；PayPal Phase 2C     |
| Joomla／OpenCart | 未完成：只有 README／能力預留                                                              | Phase 2D adapter、同步、建議、套用與回滾                  |

## 5. 整合到第二階段 PRD 的項目

### Phase 2A

- 認證完整化、email verify、workspace invitation／switcher、資料隔離。
- `usage_ledger`、Entitlement、rate limit、Provider retry／dead-letter、成本 cap。
- 持久化 Keyword Intelligence、精準 metrics、cluster、競品 gap、brief。
- Content Optimizer、五維 score、Claim Ledger、批量 plan、diff、批准及 WordPress draft push。
- route registry、公開／私有 SEO contract、link graph、sitemap／hreflang 及孤島建置阻斷。
- Site Audit thin slice、SSRF、CrUX、修復任務及 recheck。

### Phase 2B

- Site Audit remediation、競品／AI visibility monitor、告警、多站點比較。
- PDF／CSV／白標報告與資料來源保留。
- Stripe Subscription、Entitlement、Customer Portal、webhook 對帳。
- OAuth 登入、Provider／模型／規則版本及 GSC incomplete metadata。

### Phase 2C／2D

- Backlink Provider → AI 分析 → 草稿 → 人工批准 → 已授權 CMS 發布 → 重新抓取驗證。
- Shopify、Ghost、公共 API、PayPal、合法 outreach 草稿。
- Joomla／OpenCart adapter、同步、SEO 建議、套用、回滾及交易欄位白名單。

## 6. PH2-00 結論

PH2-00 的現況基線已足夠支持下一階段設計：現有公開頁已通過目前範圍的孤島檢查，但路由來源尚未統一；客戶／管理後台已有可用底座，但未按第二階段的 namespace 與 site context 收斂；第一階段多個「未完成」項目已經有部分 API／UI，應按缺口而非從零重做。

本次只盤點與更新文件，沒有把第二階段規劃誤報為已上線功能，也沒有修改使用者既有 dirty worktree。

## 7. 批准閘門

| 檢查                                     | 狀態                                     |
| ---------------------------------------- | ---------------------------------------- |
| 工作區與代碼基線已記錄                   | PASS                                     |
| 公開前台／Blog／客戶／管理／插件已盤點   | PASS                                     |
| 第一階段 PRD 未完成項目已逐項對比        | PASS                                     |
| 未完成部分已整合至第二階段 PRD           | PASS                                     |
| lint／test／build／security／生產 health | PASS                                     |
| PH2-01 runtime code                      | 已在 PH2-00 批准後進入；本次完成首批實作 |

PH2-00 已於本次會話獲用戶明確批准：

```text
APPROVE PH2-00
```

因此已按流程進入 `PH2-01`，本次完成 route registry、公開／私有邊界、SEO fallback、Sitemap 分組、Nginx Sitemap 靜態路由及現有導覽引用。`PH2-01` 後續仍需在對應階段完成完整 planned route 頁面與實際 site-scoped 遷移，未在本次提前宣稱完成。
