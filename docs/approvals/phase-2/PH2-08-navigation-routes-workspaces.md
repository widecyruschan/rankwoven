# PH2-08 前台、客戶後台與管理後台核檢

> 文件狀態：`APPROVED / CORE IMPLEMENTATION COMPLETE v1.0`
> 建立日期：2026-09-14
> 批准日期：2026-09-14
> 批准人：Product Owner（使用者）
> 前置批准：`APPROVE PH2-01`、`APPROVE PH2-05`、`APPROVE PH2-06`、`APPROVE PH2-07`
> 依據：`docs/rankwoven-phase-2-prd.md` 第 11.3.6、11.4、11.5 節、`docs/frontend-page-spec.md` 第 7 節、`docs/rankwoven-phase-2-development-workflow.md`
> 本步不啟用：公開 Site Audit 執行、CMS 寫入／發布、Billing／API Key／Backlink／Monitor 的未完成 runtime、未核驗 locale 的 indexable URL。

## 1. 目標與完成定義

PH2-08 將目前的 flat `/app/*` 側欄與手寫導航，重整為由同一份 route manifest 驅動的三層資訊架構：公開前台、客戶工作台、管理後台。此步的主要成果是可達的頁面與狀態，而不是預先顯示尚未可用的產品入口。

```text
route manifest
  ├─ Vue Router / auth / role / feature gate
  ├─ 公開 header / footer / sitemap / SEO HTML / link graph
  ├─ 客戶 sidebar / site switcher / breadcrumb / legacy resolver
  └─ 管理 sidebar / role isolation / noindex metadata
```

完成標準：

1. 每個 enabled public route 同時存在於 Router、初始 SEO HTML、sitemap 與 link graph；公開孤島數為 0。
2. 每個 enabled private route 都有 menu、breadcrumb、父頁或 task result 的可達路徑；深層 route 僅在已驗證 `siteId` 屬於目前 workspace 後才載入。
3. `marketing`、`app`、`admin` 三個 layout 不混用側欄、權限、SEO metadata 或資料來源；`/app/*`、`/admin/*` 一律 noindex。
4. 未完成 API、沒有 entitlement、權限不足或 feature 未開啟的 route 不顯示在選單、sitemap 或公開 HTML，也不建立空白 placeholder 頁。
5. 介面文案以 `en`、`zh-Hant` 同步 i18n key 實作；UI locale 與 PH2-07 content locale 分開保存與展示。

## 2. 現況盤點與缺口

| 範圍 | 現有能力 | PH2-08 缺口 |
| --- | --- | --- |
| Route registry | `routeRegistry.json` 已集中 public、auth、customer、admin route，並有 `enabled`、`planned`、`parentId`、SEO key。 | 缺少 navigation surface、group、order、availability phase、feature key、site scope、breadcrumb 與 legacy resolver metadata；App.vue 仍手寫三組導航。 |
| 公開 SEO | 靜態 generator、sitemap generator、public SEO pages 與 Blog inlink graph 已使用 registry；目前 96 個 canonical URL／零孤島通過 build。 | `/tools`、八個工具、Extension、category、404 仍 planned；只可在內容、H1、parent／related links 與 API gate 完備後啟用。 |
| 客戶後台 | `/app`、`/app/sites`、Analytics、Keywords、Media、Links、Tasks、Settings 及既有 views 可復用。 | 目前大多是 flat route；沒有 site-scoped shell、site switcher、private breadcrumb 或安全 legacy resolver。 |
| PH2-06／07 | Keyword Research 與 Content Optimizer API／task contract 已完成。 | 沒有 `/app/research`、`/app/sites/:siteId/research`、`/app/sites/:siteId/content/optimizer` 的可操作 UI、quota／partial／provider state。 |
| 管理後台 | `/admin`、customers、usage、operations、settings 已有頁面與 admin role guard。 | 沒有 manifest group、workspaces／sites／providers／tasks／content policies 入口；客戶與管理 sidebar 尚未完全隔離。 |
| 工作區 | auth session 有 current workspace，站點 API 已按 workspace 篩選。 | 前端沒有安全的 workspace switch API 或 store；PH2-08 不能自行把任意 workspace ID 寫入 URL／localStorage 當作切換。 |

## 3. Route Manifest 契約

在既有 registry entry 增加下列欄位，並從同一 manifest 產生 Router、navigation、breadcrumb、legacy resolver 與 SEO 輸入：

| 欄位 | 用途 |
| --- | --- |
| `navigationSurface` | `marketing_header`、`marketing_footer`、`customer_sidebar`、`customer_workspace`、`admin_sidebar` 或 `none`。 |
| `navigationGroup`／`navigationOrder` | 分組與穩定排序，禁止 App.vue 硬寫 route list。 |
| `parentId`／`breadcrumbKey` | 私有 route 的父頁與 breadcrumb；深層頁永遠可返回有效 parent。 |
| `availabilityPhase`／`featureKey` | 依 PH2 phase、entitlement 與 server capability 決定 enabled；未開啟 route 不被註冊或顯示。 |
| `siteScope` | `none`、`required`、`optional`；required route 必須驗證 path 的 `siteId`。 |
| `legacyTargetId` | 舊 `/app/*` route 先解析合法 site context，再 `replace` 到新 route；不以固定字串跨站跳轉。 |
| `robotsPolicy` | public canonical 或 private／admin `noindex,nofollow,noarchive`，供 SEO head 與 Nginx policy assertion 使用。 |

manifest 驗證器必須拒絕：enabled route 缺 component、parent 不存在、site-scoped route 缺 `:siteId`、public indexable route 缺 SEO metadata、private route 進 sitemap、feature gate route 仍有 menu entry、redirect chain 及不同 area 共用 sidebar group。

## 4. 頁面與導航規劃

### 4.1 公開前台

公開主選單固定為產品、工具、資源、定價與帳戶；footer 提供公司、支援與法律入口。啟用次序以 SEO 規則為 gate，而不是一次打開所有 planned route：

| Group | Route | PH2-08 行為 | SEO／功能 gate |
| --- | --- | --- | --- |
| 產品 | `/features`、`/extension` | 產品與 CMS 整合說明。 | 必有 parent／related links、唯一 keyword、HTML fallback。 |
| 工具 | `/tools` 與八個 `/tools/*` | Tools hub 導入每個工具；未登入只展示受限入口與登入轉換。 | 未完成 runtime 只可展示說明，不能產生可索引 query 結果頁；Site Audit 執行留待 PH2-10。 |
| 資源 | `/blog`、category、article、`/docs`、`/help` | Blog／文件／支援互鏈。 | category 只有文章數、介紹、breadcrumb 與 related links 達標才 index。 |
| 公司／法律 | `/about`、`/contact`、`/privacy`、`/terms` | footer canonical pages。 | 必有初始正文與 footer／parent 導入。 |
| 帳戶 | `/pricing`、`/login`、`/register` 等 | Pricing CTA 指向帳戶流程。 | auth 路由永遠 noindex，不能進 sitemap。 |

公開工具不保存 query string、filter state 或結果為 canonical URL；需要儲存的工作一律轉到登入後工作台。未完成人工翻譯的 locale 不產生 locale indexable URL 或 hreflang。

### 4.2 客戶後台

App shell 分為四個 groups，所有站點內容操作使用 `/app/sites/:siteId/*`：

| Group | Canonical routes | 初始 PH2-08 實作 |
| --- | --- | --- |
| 工作區 | `/app`、`/app/sites`、`/app/research`、`/app/tasks` | Workspace overview、site list／switcher、research hub、跨站 task center。 |
| 目前站點 | `/app/sites/:siteId`、`research`、`content`、`content/optimizer`、`content/review`、`media`、`links`、`site-audit`、`analytics`、`tasks`、`integrations` | 先使用現有 views 的 site-scoped wrapper；PH2-06／07 有 API 的頁面顯示 task、quota、provider unavailable、partial、retry／cancel 與 diff state。 |
| 監控與外鏈 | `/app/monitors`、`/app/visibility`、`/app/alerts`、`/app/backlinks` | 只在對應 feature runtime 通過 gate 後顯示；否則完全隱藏。 |
| 工作區操作 | `/app/billing`、`/app/developers`、`/app/integrations`、`/app/settings` | Billing／Developers 保持 hidden 至 PH2-11／2C；Settings 依 tab 作 owner gate。 |

site switcher 的資料僅來自既有 workspace-scoped sites API；點選時以 `router.push` 更換合法 `:siteId` path parameter，並將目前站點保存於本機 session，讓網站檢測、關鍵詞研究、內容優化、媒體、內部連結、流量與任務頁共享同一 context。手動加入網站使用 `manual` connection mode，只提供分析與人工修復建議；插件或 API 連接使用 `plugin`／`api` mode，可在既有 CMS 寫回 gate 下使用一鍵優化。工作區 switcher 在 server 提供受權 workspace list／switch contract 前只顯示 current workspace，不能虛構切換功能。所有 direct deep link 先完成 auth restore、site ownership 驗證，再顯示 loading 或 workspace-safe `not found`。

### 4.3 管理後台

管理 route 使用獨立 `admin_sidebar`，不可由一般 customer menu 顯示：

| Group | Routes | Gate |
| --- | --- | --- |
| 平台總覽 | `/admin` | `admin`。 |
| 客戶與資源 | `/admin/workspaces`、`/admin/customers`、`/admin/sites` | API ready 且 `admin`。 |
| 執行與成本 | `/admin/tasks`、`/admin/usage`、`/admin/providers` | `admin`；provider secret mutation 額外要求 `owner`。 |
| 治理 | `/admin/content-policies`、`/admin/operations` | `admin`；policy publish／feature flag mutation 要求 `owner`。 |
| 系統 | `/admin/settings` | `owner` gate。 |

管理頁只顯示已脫敏的 workspace／task／cost metadata；不得輸出客戶正文、AI prompt／completion、CMS credential、token 或 provider raw payload。所有 `/admin/*` 都加入 `noindex,nofollow,noarchive`。

## 5. Legacy Resolver 與 Site Context

`LegacyRouteResolver` 在 router guard 內執行，不在 page component 靜默猜測：

1. 從 path／query 讀取候選 siteId；只接受 UUID，並用 workspace-scoped sites list 驗證歸屬。
2. 合法 siteId 以 `router.replace` 導向 manifest 的 `legacyTargetId`；保留安全的 tab／filter query。
3. 無合法 context 時到 `/app/sites` 或對應 cross-site hub；不保留不可信 siteId。
4. `/app/tasks` 永遠保留跨站 canonical；只有 `/app/sites/:siteId/tasks` 才是單站 task view。
5. 舊 private route 不建立 HTTP redirect、canonical 或 sitemap entry；公開 redirect 另受 SEO single-hop test 約束。

## 6. UI、i18n 與可及性

- 新 shell 使用現有 Vue 3、Ant Design Vue、Pinia、Lucide 與 light／dark tokens；不引入新的 UI framework。
- Route、group、breadcrumb、empty／error／permission／quota／provider state 全部使用 i18n key，`en` 與 `zh-Hant` 同步；現有其餘 locale 未完整翻譯時使用 fallback，不宣稱完整 content locale 支援。
- 桌面 Content Optimizer 使用原文／建議並排 diff；窄螢幕使用 tab 切換。表格、source badge、task progress、modal、focus ring、顏色對比均以 WCAG AA 驗證。
- 固定尺寸 sidebar、toolbar、icon button、table column 與 diff panel，避免 loading、最長翻譯或 task status 導致 layout shift。
- 公開、customer、admin 分別測 desktop／mobile、light／dark、loading、empty、error、partial、quota、forbidden 與 retry；不可只測 happy path。

## 7. 實作順序與驗收

1. 擴展 registry type／JSON、manifest validator、Router meta 與 navigation／breadcrumb resolver；加入 route／feature／role／site scope unit tests。
2. 抽離 App.vue 手寫導航，建立 `MarketingLayout`、`CustomerAppLayout`、`AdminLayout` 與 current-site context；完成 legacy resolver。
3. 啟用有既有資料／API 支持的 customer pages：sites、research、content optimizer、content review、tasks、integrations／settings；未可用功能維持 hidden。
4. 實作 admin grouped navigation 與已支持的 overview／customers／usage／operations／settings，其他頁只在相應 API 實作後啟用。
5. 分批啟用公開 Tools／Extension／category／404，並於每批重新跑 SEO fallback、sitemap、link graph、canonical、hreflang 與孤島 gate。
6. 完成 browser E2E／responsive screenshot／accessibility assertions，執行 lint、test、build、安全掃描與本地 Docker smoke。

批准後的驗收項目：

- [ ] manifest 可阻止所有不一致 route、menu、breadcrumb、SEO metadata 與 feature gate 組合。
- [ ] 現有 flat route 透過合法 site context 單跳 replace；無 context 不越權且不出現空白頁。
- [ ] 公開 indexable pages 的 route graph 孤島數為 0；private／admin route 絕不進 sitemap。
- [ ] 每一可見功能都有 loading、empty、error、partial、quota、provider unavailable、forbidden、retry／cancel 其中適用狀態。
- [ ] 亮／暗模式、桌面／手機、鍵盤與對比測試通過；無直接硬寫可見文案。
- [ ] CI 的 lint、test、build、security audit、SEO fallback／link graph 與本地 browser smoke 通過。

**批准請求**：請確認上述 manifest-first、site context、公開 SEO gate、管理隔離，以及「未提供 workspace switch API 前不做假切換」的邊界。收到 `APPROVE PH2-08` 後才開始修改 Router、layout、views、i18n 與測試。

## 8. 核心實作結果（2026-09-14）

- route registry 已支援 navigation surface、group、order、site scope、feature key、availability phase、legacy target 與 robots policy metadata；App.vue 的公開／客戶／管理導航與 breadcrumb 改為讀取 registry，而不是手寫 route list。
- `LegacyRouteResolver` 已接管既有 `/app/articles`、`/app/article-sync`、`/app/suggestions`、`/app/article-suggestions`、`/app/review`；帶有效 site context 時導向新的 site-scoped target，沒有 context 時回到安全的跨站頁，不產生公開 redirect 或 sitemap entry。
- Content Optimizer 與 site-scoped Site Audit 成為首批 enabled site route。Router 在 auth restore 後以現有 workspace-scoped sites API 驗證 `:siteId`；無效或無權限路徑回到 `/app/sites`。
- 競品關鍵詞研究已成為 enabled site route。使用者只需輸入競品網址；API 驗證公開 hostname、推導初始 seed，並使用 PH2-06 Provider／Worker 產生競品排名詞、長尾候選與 Gap。Provider 未配置、quota、partial 或失敗狀態不會被前端偽裝成結果。
- `/app/sites` 的已連接站點新增內容優化器與站點檢測入口，形成可達的 private parent path；Content Optimizer 使用 PH2-07 API，會顯示 provider unavailable 而不繞過 gateway／entitlement gate。
- 公開 header／footer 已由 manifest 產生，公開 planned tools、Extension、category 與未完成 locale route 維持 disabled；build 仍產生 96 個 canonical URL，公開 link graph 孤島數為 0。
- 已完成 manifest regression、Web build、全倉 test、light／dark public browser snapshot，以及未登入 deep link 導向 login 的 browser 驗證。

未完成且保持關閉：工作區切換（缺安全 API contract）、其餘 site-scoped content／media／links／tasks wrapper、批量計劃 UI、public tools runtime、Billing／Backlinks／Monitors／Developers、其餘管理後台入口。它們必須隨對應 API 和 feature gate 再個別啟用，不能用空白頁補位。
