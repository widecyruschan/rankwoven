# RankWoven SEO

WordPress 外掛：連接 RankWoven SaaS，同步文章／頁面／作品／商品與圖片媒體，並在後台管理搜尋外觀、Sitemap、SEO 分析與圖片屬性。

目前版本為 **0.7.0**。自 **0.2.0** 起，原 `webp-image-optimizer` 的功能已合併進來。

## SEO 評分與 GEO 優化

文章、頁面、Portfolio 與 WooCommerce 商品編輯器會顯示 19 項 SEO 檢查，按 100 分權重計算，並分為 Problems、Warnings、Success 三組。評分會檢查關鍵詞、標題與描述長度、Slug、正文長度與密度、首段、連結、圖片 Alt Text、段落與句子可讀性、子標題分佈，以及關鍵詞重複使用；商品特色圖與圖片庫亦會納入分析。

「GEO 優化」分頁提供 AI 爬蟲存取、索引與摘要控制，以及 BCP 47 語言聲明、替代語言和 `x-default` hreflang 設定。啟用後會同步輸出 GEO robots 規則與前台 robots meta，協助搜尋引擎及生成式 AI 正確抓取和引用內容。

GEO 設定亦包含可獨立關閉的 JSON-LD、Entity Schema、Content Schema 及 Author & Date Markup。前台會按頁面類型輸出 Organization、WebSite、Person、Article、WebPage、Product 和 BreadcrumbList；Organization 名稱、描述、Logo 與 `sameAs` 社交連結可在後台調整。GEO readiness 現以 AI Crawler Access、Machine Readability、Structured Data、Content & Citability 和 Trust & E-E-A-T 五組評分，並檢查標題層級、首段答案、引用、內容深度、作者日期、法律頁面和 HTTPS 等訊號。`x-default` 留空時會自動回退到網站首頁。

## 圖片優化（合併自 WebP Image Optimizer）

後台路徑：**RankWoven SEO → 圖片優化**、**批量轉圖**。

| 功能 | 說明 |
| --- | --- |
| 上傳轉換 | 上傳 JPG／PNG／GIF 時自動轉成 WebP 或 AVIF，並可縮放寬度 |
| 水印 | 依背景深淺套用深色／淺色 Logo（文章與 Portfolio） |
| 產品圖 | WooCommerce 產品圖尺寸限制與批量縮放 |
| 從網址上傳 | 媒體「上傳檔案」分頁可貼網址，下載後寫入媒體庫 |
| 批量轉換 | 掃描媒體庫未轉換圖片並分批處理 |

設定仍使用 option `webp_optimizer_settings`，合併後既有設定會沿用。請停用舊的 **WebP & AVIF Image Optimizer** 外掛，避免重複轉換。

## Sitemap、LLMs.txt 與 RSS Sitemap

後台路徑：**RankWoven SEO -> 網站地圖**。

可選擇啟用 `/llms.txt`、`/llms-full.txt` 和文章 `.md` Markdown 地址。設定支援公開文章類型／分類法、每種 URL 上限、排除文章 ID、排除分類項 ID，以及 `{{site_title}}`、`{{site_name}}`、`{{site_description}}`、`{{site_url}}` 模板。所有開關預設關閉；輸出只包含已發佈且可公開訪問的內容，附件、草稿和回收站內容會被排除。

如果網站根目錄已有實體 `llms.txt` 或 `llms-full.txt`，Web 伺服器可能優先返回實體文件。後台會顯示提醒，插件不會自動覆蓋該文件。

同一頁的 `RSS Sitemap` 區塊可啟用 `/sitemap.rss`，設定最新文章數量和 Post Types。輸出為 RSS 2.0 文件，包含最新已發布內容的標題、連結、發佈時間、摘要、純文字正文和特色圖片／站點圖標；瀏覽器會透過 `assets/rss-sitemap.xsl` 顯示可讀的文章列表。文章按 `modified DESC` 輸出，與現有文章排序一致；預設關閉，並不取代完整 `sitemap.xml`。啟用後，動態 `robots.txt` 會同步加入 RSS Sitemap URL。

`llms.txt`、`llms-full.txt`、文章 `.md` 和 RSS 文章內容會在輸出前移除 HTML、Script／Style、WordPress／Visual Composer shortcode 及其樣式屬性，只保留可讀文字，避免公開文件出現 `[vc_row]`、`font_container` 等編輯器代碼。

---

## 會話紀錄（累積）

說明：以下內容隨開發會話追加，不會覆蓋既有說明。

### 2026-08-29：合併 webp-image-optimizer

- **會話目的**：將 `webp-image-optimizer` 的功能合併進 `rankwoven-seo`，單一外掛管理 SEO 與圖片優化。
- **完成任務**：
  - 以 `includes/class-image-optimizer.php` 承載轉換、水印、批量轉圖、從網址上傳。
  - 在 RankWoven 後台新增「圖片優化」「批量轉圖」分頁。
  - 舊外掛改為相容層：偵測到 RankWoven SEO 已啟用時自動停用，並提示設定已沿用。
- **關鍵決策**：保留 `webp_optimizer_settings` 與既有 AJAX action 名稱，降低遷移成本；後台選單併入 RankWoven，不再單獨出現「設定 → 圖片優化」。
- **技術棧**：WordPress 外掛（PHP 8）、jQuery、wp.media、admin-ajax
- **修改檔案**：
  - `rankwoven-seo/rankwoven-seo.php`
  - `rankwoven-seo/includes/class-image-optimizer.php`（新增）
  - `rankwoven-seo/assets/js/admin-script.js`（新增）
  - `rankwoven-seo/assets/js/media-url-upload.js`（新增）
  - `rankwoven-seo/assets/css/admin-style.css`（新增）
  - `rankwoven-seo/assets/admin.css`
  - `rankwoven-seo/README.md`
  - `webp-image-optimizer/webp-image-optimizer.php`（改為相容 stub）

### 2026-08-29：加入 LLMs.txt 設定

- **會話目的**：為插件提供可控的 `llms.txt`、`llms-full.txt` 和文章 Markdown 輸出。
- **完成任務**：新增後台 `LLMs.txt` 分頁、開關、內容範圍、URL 上限、排除 ID 和模板設定；新增動態純文字路由與 `.md` 文章路由。
- **關鍵決策**：所有開關預設關閉，只讀取已發佈且可公開訪問的內容；若站點已有實體 LLMs 文件，後台顯示覆蓋提醒而不自動刪除。
- **技術棧**：WordPress Hooks、PHP 8、`get_posts`／`get_terms`、基本 HTML-to-Markdown 轉換。
- **驗證**：Docker PHP 8.2 語法檢查通過；測試站已驗證三個輸出地址，並清理未註冊的 shortcode。

### 2026-08-31：更新 SEO 評分與 GEO

- **會話目的**：將插件同步至 `0.6.0` SEO 評分與 GEO 優化版本，同時保留圖片優化及公開文件純文字輸出。
- **完成任務**：恢復 19 項 SEO 檢查與 100 分權重清單、GEO 爬蟲與 hreflang 設定、搜尋引擎 Sitemap 提交入口；合併 WebP／AVIF 圖片優化模組及編輯器評分樣式。
- **驗證**：PHP parser、JavaScript 語法、`npm run lint`、`npm run test` 和 `npm run build` 均通過；本機沒有 PHP CLI，未執行原生 `php -l`。

### 2026-08-31：完善 GEO 結構化資料與審計

- **會話目的**：根據 GEO 審計缺口，補齊結構化資料、可引用內容和 E-E-A-T 設定。
- **完成任務**：新增 JSON-LD 圖譜輸出（Organization、WebSite、Person、Article、WebPage、Product、BreadcrumbList）；新增 Organization 名稱、描述、Logo、`sameAs` 及四項結構化資料開關；`x-default` 空值回退首頁；GEO 評分擴展為五組並加入標題層級、首段答案、問題式標題、清單／表格、統計數據、引用、內容深度、作者、日期、品牌一致性、法律頁面和 HTTPS 檢查。
- **關鍵決策**：保留所有設定可獨立停用；商品 Schema 只在存在 `_price`／`_sku` 時輸出對應欄位；內容評估取最近更新的公開內容作為站點代表樣本，避免載入全部文章。
- **技術棧**：WordPress Hooks、PHP 8、Schema.org JSON-LD、`get_posts`／`get_page_by_path`。
- **修改文件**：`rankwoven-seo/rankwoven-seo.php`、本 README。
- **驗證結果**：測試站 Docker WordPress PHP 8.2 parser 通過；JavaScript 語法與 `git diff --check` 通過。尚未執行完整 npm lint／test／build。
- **下一步行動**：在測試站後台保存 GEO 設定，逐頁檢查 JSON-LD，並用 Rich Results Test／Search Console 驗證 Schema。
