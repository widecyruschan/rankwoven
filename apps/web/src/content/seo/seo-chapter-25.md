---

## 為什麼網站速度是 SEO 的硬門檻？

Google 自 2010 年起就將網站速度納入排名信號，2018 年更進一步推出「速度更新（Speed Update）」，明確宣布**行動版頁面的載入速度**直接影響行動搜尋排名。

> 數據顯示：頁面載入時間從 1 秒增加到 3 秒，**跳出率增加 32%**。從 1 秒增加到 5 秒，**跳出率增加 90%**。

速度既是排名因子，也是轉換率殺手。

---

## 網站速度的四大診斷工具

| 工具 | 用途 | 費用 |
|------|------|------|
| **Google PageSpeed Insights** | 頁面速度分析 + 優化建議 | 免費 |
| **Google Lighthouse** | 綜合性能審查（開發者工具內建） | 免費 |
| **GTmetrix** | 瀑布圖（Waterfall）分析 | 有限免費 |
| **WebPageTest** | 全球多點位速度測試 | 免費 |

### PageSpeed Insights 分數解讀

| 分數 | 狀態 | 行動 |
|------|------|------|
| 90-100 | 🟢 優秀 | 保持並監控 |
| 50-89 | 🟡 需要優化 | 依建議逐一改善 |
| 0-49 | 🔴 差 | 立即優先處理 |

---

## 網站速度優化六大策略

### 策略 1：圖片優化（通常能省下 40-60% 的載入時間）

這是最簡單、效果最大的優化項。

| 行動 | 效果 |
|------|------|
| **使用 WebP / AVIF 格式** | 檔案大小減少 25-35% |
| **適當壓縮圖片** | 100-200KB 為目標 |
| **設定圖片尺寸** | 避免瀏覽器重新計算佈局 |
| **使用 srcset 響應式圖片** | 行動裝置不下載桌面大圖 |
| **懶加載（Lazy Loading）** | 首屏不載入非可視區圖片 |

### 策略 2：啟用瀏覽器快取（Browser Caching）

設定伺服器告訴瀏覽器「這些資源可以暫存，不用每次都下載」。

**Apache `.htaccess` 範例**：

```apache
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

**效果**：回訪者的頁面載入速度可提升 50-80%。

### 策略 3：壓縮與最小化資源

| 資源類型 | 行動 | 工具 |
|----------|------|------|
| CSS | 最小化（移除空白和註解）+ 合併 | CSSNano、PurgeCSS |
| JavaScript | 最小化 + 延遲載入非關鍵 JS | Terser、UglifyJS |
| HTML | 最小化 | HTMLMinifier |
| 字體 | 只載入使用的字重和子集 | Google Fonts API 參數 |

### 策略 4：使用 CDN（內容傳遞網路）

**CDN 運作原理**：將網站靜態資源複製到全球多個伺服器節點，使用者從距離最近的節點獲取資源。

| CDN 服務 | 特色 |
|----------|------|
| **Cloudflare** | 免費方案、全球節點、DDoS 防護 |
| **CloudFront** | AWS 生態、S3 整合 |
| **BunnyCDN** | 性價比高、亞洲節點多 |
| **KeyCDN** | 即付即用、HTTP/3 支援 |

### 策略 5：減少 HTTP 請求

每個檔案（CSS、JS、圖片、字體）都需要一個 HTTP 請求。

| 行動 | 效果 |
|------|------|
| **合併 CSS/JS 檔案** | 減少請求數 |
| **使用 CSS Sprites** | 多個小圖標合併為一張圖 |
| **內聯關鍵 CSS** | 首屏渲染不等待外部 CSS |
| **延遲載入非關鍵 JS** | 使用 `defer` 或 `async` 屬性 |

```html
<!-- async: 下載完就執行，不保證順序 -->
<script src="analytics.js" async></script>

<!-- defer: 等 HTML 解析完再按順序執行 -->
<script src="main.js" defer></script>
```

### 策略 6：伺服器端優化

| 行動 | 效果 |
|------|------|
| **升級 HTTP/2 或 HTTP/3** | 多路復用，並行載入資源 |
| **啟用 Gzip / Brotli 壓縮** | 文字資源減少 70-80% |
| **升級主機方案** | 避免共享主機的性能瓶頸 |
| **使用伺服器端快取** | Redis、Varnish、Nginx FastCGI Cache |
| **資料庫查詢優化** | 減少不必要的查詢、使用索引 |

---

## 速度優化優先級矩陣

```
投入成本
  低 │
     │  Q2: 中優先          │  Q1: 最高優先
     │  合併 CSS/JS         │  圖片優化 (WebP + 壓縮)
     │  減少 HTTP 請求       │  啟用瀏覽器快取
     │                      │  啟用 Gzip/Brotli
     ├──────────────────────┤
     │  Q4: 有空再做        │  Q3: 值得投入
     │  CSS Sprites         │  使用 CDN
     │  字體子集化           │  升級主機方案
     │                      │  升級 HTTP/2
  高 │                      │
     └──────────────────────┴────→ 速度提升
        小幅改善            大幅改善
```

---

## 速度優化檢查清單

- [ ] 圖片使用 WebP/AVIF 格式
- [ ] 圖片壓縮至合理大小（< 200KB）
- [ ] 實施了圖片懶加載
- [ ] 啟用了瀏覽器快取
- [ ] CSS/JS 已最小化
- [ ] 啟用了 Gzip 或 Brotli 壓縮
- [ ] 非關鍵 JS 使用 defer/async
- [ ] 使用 CDN 加速靜態資源
- [ ] 主機方案足以應付流量
- [ ] PageSpeed Insights 分數 ≥ 90（桌面版）≥ 70（行動版）

---

## 重點回顧

1. **速度 = 排名因子 + 轉換率殺手**，1 秒到 3 秒跳出率增 32%
2. **圖片優化效果最大**——通常能省 40-60% 載入時間
3. **瀏覽器快取 + Gzip + CDN** 是三大基礎速度優化
4. **defer vs async**：defer 保證執行順序，async 不保證
5. **PageSpeed Insights ≥ 90（桌面）/ ≥ 70（行動）** 是合理的目標
6. 速度優化不是一次性工程——**每次發布新內容都要檢查**

---

| ← [第 24 章：結構化資料 Schema Markup](/blog/schema-markup) | [回索引](/blog) | [第 26 章：Core Web Vitals 完整解析 →](/blog/core-web-vitals) |
