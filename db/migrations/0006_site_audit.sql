-- 0006_site_audit.sql
-- 目的：建立基於 SerpApi 的 SEO 網站稽核功能所需的資料表。
-- 支援使用者設定每週/每月自動分析網站 SEO 狀況。

-- site_audit_configs：每個站點的稽核設定（排程、頁面上限、爬取來源、email 通知等）
CREATE TABLE IF NOT EXISTS site_audit_configs (
  site_id uuid PRIMARY KEY REFERENCES site_connections(id) ON DELETE CASCADE,
  schedule text NOT NULL DEFAULT 'disabled' CHECK (schedule IN ('weekly', 'monthly', 'disabled')),
  page_limit integer NOT NULL DEFAULT 100 CHECK (page_limit BETWEEN 10 AND 500),
  crawl_source text NOT NULL DEFAULT 'website' CHECK (crawl_source IN ('website', 'sitemap', 'robots_txt')),
  email_notification boolean NOT NULL DEFAULT false,
  last_audit_at timestamptz,
  next_audit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- site_audit_results：每次稽核的彙總結果
CREATE TABLE IF NOT EXISTS site_audit_results (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  overall_score integer CHECK (overall_score BETWEEN 0 AND 100),
  pages_crawled integer NOT NULL DEFAULT 0,
  pages_indexed integer NOT NULL DEFAULT 0,
  serpapi_credits_used integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_audit_results_site
  ON site_audit_results(site_id, created_at DESC);

-- site_audit_issues：每筆稽核發現的具體 SEO 問題
CREATE TABLE IF NOT EXISTS site_audit_issues (
  id uuid PRIMARY KEY,
  audit_id uuid NOT NULL REFERENCES site_audit_results(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN (
    'meta_tags', 'headings', 'content_quality', 'links',
    'images', 'structured_data', 'mobile', 'performance',
    'indexability', 'security', 'other'
  )),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  description text NOT NULL,
  url text,
  affected_count integer NOT NULL DEFAULT 1,
  recommendation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_audit_issues_audit
  ON site_audit_issues(audit_id, category, severity);
