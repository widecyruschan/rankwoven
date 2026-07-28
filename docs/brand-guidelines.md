# RankWoven 品牌與基礎 UI 視覺規範

更新日期：2026-07-25

## 1. 品牌定位

RankWoven 是面向網站經營者、SEO 團隊與代理商的 AI SEO 自動優化平台。品牌需要傳達三個核心感受：

- 精準：內容、關鍵字、站內連結和圖片優化需要可審核、可追蹤。
- 編織：將文章、主題集群、內部連結與媒體素材編織成更清晰的搜尋結構。
- 增長：用穩定、可信的流程提升網站搜尋可見性，而不是製造低品質內容。

## 2. Logo 規範

主要 Logo 檔案：

- 完整橫式 Logo：`apps/web/src/assets/rankwoven-logo.svg`
- 純圖標標誌：`apps/web/src/assets/rankwoven-icon.svg`
- Favicon：`apps/web/public/favicon.svg`、`apps/web/public/favicon.png`
- Apple Touch Icon：`apps/web/public/apple-touch-icon.png`
- PWA 圖標：`apps/web/public/icon-192.png`
- 橫式 PNG 版本：`rankwoven-logo-horizontal.png`
- 正方形圖標 PNG 版本：`rankwoven-favicon.png`

新 Logo 採用「盾牌編織」概念：以深青綠 `#0B6F63` → `#084C45` 漸變的盾牌/皇冠輪廓為標誌外形，內部由雙層交織 W 線條（白色主線 + 淺青副線）隱喻內容與連結的編織網絡；右下角金色漸變增長箭頭代表 SEO 排名持續上升。整體風格為時尚立體、現代科技、高端 SaaS 感。

使用規則：

- 優先使用完整橫式 Logo。
- 在側邊欄、登入頁、文件頁眉中使用完整 Logo。
- 在 favicon、窄版導覽或小尺寸按鈕中可只使用盾牌圖標標誌。
- Logo 周圍至少保留一個標誌寬度 25% 的留白。
- 不要拉伸、旋轉、加陰影或改變標誌內部比例。
- 深色背景時文字改為 `#FFFFFF`，圖標本身保持原色（漸變盾牌在深色背景上也清晰可見）。

## 3. 品牌色

| Token | 色值 | 用途 |
|---|---|---|
| `--color-brand-primary` | `#0B6F63` | 主按鈕、主導覽選中、品牌標誌底色 |
| `--color-brand-primary-dark` | `#084C45` | 深色 hover、重點文字 |
| `--color-brand-primary-soft` | `#DDF3EE` | 選中底色、輕量提示背景 |
| `--color-brand-accent` | `#F6D365` | 增長線條、提示重點、圖表高亮 |
| `--color-ink` | `#14231F` | 主文字 |
| `--color-muted` | `#667A75` | 次要文字 |
| `--color-border` | `#D9E3DF` | 分隔線、表格邊框 |
| `--color-surface` | `#FFFFFF` | 主要內容面 |
| `--color-canvas` | `#F5F8F7` | 頁面背景 |

## 4. 字體與文字

- 英文 UI 字體：Instrument Sans。
- 中文 UI 與大標題字體：Noto Sans TC。
- 數據、百分比、成本與進度數字：JetBrains Mono。
- 導覽與按鈕文字要短，避免把功能說明塞進按鈕。
- 後台頁面標題應清楚描述當前任務，例如「站點概覽」「內容審核」「內部連結」。

## 5. 基礎 UI 規範

- 後台布局以左側導覽、頂部工具列、主內容區為主。
- 卡片圓角使用 `8px`，不要使用過大的裝飾圓角。
- 表格、列表、任務隊列要保留清晰分隔線和空狀態。
- 主操作使用品牌青綠色；警示、增長提示和圖表高亮可使用琥珀色。
- 儀表板不做厚重漸層背景，保持可掃描、可重複操作的 SaaS 工具感。
- 所有前端顯示文案需走 i18n key，不在模板中硬編碼大段文案。

## 6. 可訪問性

- 主要文字與背景對比度需滿足 WCAG AA。
- 圖標按鈕需要可讀的 `aria-label` 或清楚的鄰近文字。
- 語言切換、導覽、表單和彈窗需要支持鍵盤操作。
- 不僅依靠顏色表達狀態，重要狀態需要搭配文字或圖標。
