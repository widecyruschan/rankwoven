# Design System — RankWoven

## Product Context

- **What this is:** RankWoven 是 AI SEO 自動優化 SaaS，協助網站團隊審計文章、圖片、Meta、內部連結與 CMS 發佈流程。
- **Who it's for:** 網站經營者、SEO 團隊、內容團隊、代理商與 RankWoven 內部營運管理人員。
- **Space/industry:** SEO SaaS、CMS 插件、自動化內容營運、AI Provider 成本管理。
- **Project type:** 前台展示頁 + 客戶後台 + 平台管理後台。

## Aesthetic Direction

- **Direction:** Industrial/Utilitarian with editorial marketing moments。
- **Decoration level:** intentional，裝飾只用於表達「內容與連結被編織成可審核網絡」。
- **Mood:** 穩定、可信、可操作。前台要有一個清楚的編織視覺記憶點；後台要像真正可長時間使用的營運工作台。
- **Memorable thing:** 可審核的 SEO 增長操作台，而不是普通 AI 內容生成器。

## Typography

- **Display/Hero:** Noto Sans TC 900 for Chinese-heavy hero text; Instrument Sans 800 for Latin UI.
- **Body:** Instrument Sans + Noto Sans TC，保持中文可讀性與 SaaS 工具感。
- **UI/Labels:** Instrument Sans 600/700，按鈕和導覽需要短、硬朗、可掃描。
- **Data/Tables:** JetBrains Mono，所有 KPI、成本、百分比和進度數字使用等寬數字。
- **Code:** JetBrains Mono。
- **Loading:** Google Fonts with `display=swap`；後續正式化可改為自托管字體。
- **Scale:** Hero 40-76px；page h1 30-36px；panel h2 22-26px；body 16-18px；labels 13-14px。

## Color

- **Approach:** restrained with one warm accent。
- **Primary:** `#0B6F63`，用於主操作、導覽選中、進度與正向狀態。
- **Primary dark:** `#084C45`，用於強調文字與 hover。
- **Primary soft:** `#DDF3EE`，用於選中背景與低壓提示。
- **Primary mist:** `#EFF9F6`，用於頁面層次和 hover。
- **Accent:** `#F6D365`，只用於增長、高亮和需關注狀態，不做大面積底色。
- **Neutrals:** ink `#14231F`，muted `#667A75`，border `#D9E3DF`，canvas `#F5F8F7`，surface `#FFFFFF`。
- **Semantic:** success uses primary；warning uses accent；error should use muted red `#B74E4E` when needed；info uses primary soft。
- **Dark mode:** 暫不實作；若加入，需要重新設計 surface 與 border，不直接反相。

## Spacing

- **Base unit:** 8px。
- **Density:** 客戶與管理後台使用 compact；前台使用 comfortable。
- **Scale:** 2xs 2px、xs 4px、sm 8px、md 16px、lg 24px、xl 32px、2xl 48px、3xl 64px。

## Layout

- **Approach:** hybrid。前台可有 editorial composition；後台必須 grid-disciplined。
- **Grid:** 前台 desktop 2-column hero + 2-column feature lanes；後台 272px sidebar + main workspace；mobile single column。
- **Max content width:** 後台填滿可用工作區；前台使用 viewport composition，不把 hero 包成卡片。
- **Border radius:** sm 4px、md 8px、full 9999px；避免所有元素同一種大圓角。
- **Cards:** 卡片只用於 KPI、面板、套餐、表格容器和登入表單。不要用卡片堆砌整個頁面結構。

## Motion

- **Approach:** minimal-functional。
- **Easing:** enter ease-out、exit ease-in、move ease-in-out。
- **Duration:** micro 80ms、short 180ms、medium 280ms。
- **Current state:** 原型暫不加入動畫；後續只加入 hover、route transition 或任務狀態變化。

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-07-25 | 建立 RankWoven 設計系統 | 基於前台、客戶後台、管理後台三層原型的 /design-review、/design-consultation、/design-shotgun 流程沉澱 |
| 2026-07-25 | 採用「可審核的增長操作台」方向 | 讓產品避開普通 AI 內容工具感，突出審核、成本、任務與 CMS 發佈控制 |
| 2026-07-25 | 前台加入編織網絡視覺錨點 | 將 RankWoven 的品牌名與內部連結、內容集群、媒體素材關係視覺化 |
