# RankWoven 域名與 DNS 接入方案

更新日期：2026-07-25

## 1. 目標

`rankwoven.com` 已購買，下一步需要把域名接入 Web 前台、SaaS API、郵件發信和後續插件下載頁。由於目前尚未確定最終部署平台、正式服務器 IP 和郵件服務商，本文件先記錄現狀、建議 DNS 規劃和上線檢查清單，避免在未確認目標服務前誤改 DNS。

## 2. 當前 DNS 狀態

通過 Hostinger DNS 查詢到的當前記錄：

| Name | Type | Value | TTL | 說明 |
|---|---|---|---:|---|
| `@` | A | `72.62.253.72` | 300 | 根域名指向 Hostinger VPS |
| `www` | CNAME | `rankwoven.com.` | 300 | `www.rankwoven.com` 指向根域名 |

目前未檢測到 `api`、`app`、`cdn`、`mail`、SPF、DKIM、DMARC 等記錄。

Hostinger Cloud/Hosting 曾創建 `rankwoven.com` 網站：

- Website 類型：addon website
- Hostinger 用戶名：`u963014207`
- 網站根目錄：`/home/u963014207/domains/rankwoven.com/public_html`
- 關聯訂單：`52632730`
- 刪除狀態：Hostinger MCP 刪除接口要求 `confirm`，但當前工具 schema 未成功傳遞該字段；DNS 已先改為指向 VPS。

Hostinger VPS 目標：

- VPS ID：`1307693`
- IPv4：`72.62.253.72`
- Docker Compose 專案名：`rankwoven`

## 3. 建議子域名規劃

| 子域名 | 用途 | 建議記錄類型 | 目標 |
|---|---|---|---|
| `rankwoven.com` | SaaS 前台與主站 | A 或 ALIAS | 正式 Web 部署平台 |
| `www.rankwoven.com` | 主站別名 | CNAME | `rankwoven.com` |
| `app.rankwoven.com` | 登入後 SaaS 工作台 | CNAME 或 A | Web App 部署平台 |
| `api.rankwoven.com` | SaaS API | A 或 CNAME | API 服務 / 反向代理 |
| `assets.rankwoven.com` | 圖片與靜態資源域名 | CNAME | 七牛雲 Kodo 綁定域名 |
| `status.rankwoven.com` | 狀態頁 | CNAME | 狀態頁服務商 |

MVP 可以先使用 `rankwoven.com` 作為前台入口，`api.rankwoven.com` 作為 API 入口。`app.rankwoven.com` 可在登入後工作台獨立部署時再啟用。

## 4. 郵件 DNS 規劃

正式發信前需先選定郵件服務商，例如 Resend、Postmark、Amazon SES、Mailgun 或企業郵箱。確定服務商後再配置：

- MX：收信服務記錄。
- SPF：限制允許發信的服務器。
- DKIM：郵件簽名公鑰。
- DMARC：郵件身份驗證策略。
- Return-Path / Bounce：退信處理域名。

建議發信地址：

- `hello@rankwoven.com`：通用聯絡。
- `support@rankwoven.com`：客戶支援。
- `no-reply@rankwoven.com`：系統通知。
- `billing@rankwoven.com`：帳單通知。

## 5. 環境變量

```text
APP_BASE_URL=https://rankwoven.com
API_BASE_URL=https://api.rankwoven.com
PUBLIC_SITE_URL=https://rankwoven.com
APP_DASHBOARD_URL=https://app.rankwoven.com
PUBLIC_ASSETS_URL=https://assets.rankwoven.com

MAIL_FROM_NAME=RankWoven
MAIL_FROM_ADDRESS=no-reply@rankwoven.com
SUPPORT_EMAIL=support@rankwoven.com
```

## 6. 上線前檢查清單

1. 確認正式 Web 部署目標和入口地址。
2. 確認正式 API 部署目標、反向代理和 HTTPS 憑證。
3. 確認七牛雲 Kodo Bucket、區域和自定義資源域名。
4. 確認郵件服務商，取得 MX、SPF、DKIM、DMARC 記錄。
5. 先使用 DNS validate 工具檢查記錄合法性，再更新 DNS。
6. DNS 更新後檢查 `rankwoven.com`、`www.rankwoven.com`、`api.rankwoven.com` 的解析。
7. 檢查 HTTPS 憑證、CORS、API Health、前端 API Base URL。
8. 檢查郵件發信、退信、垃圾郵件評分和 DMARC 報告。

## 7. 暫不執行的操作

- 暫不新增 `api.rankwoven.com`，因為尚未確認 API 對外入口 IP 或 CNAME。
- 暫不配置郵件 DNS，因為尚未選定郵件服務商。
