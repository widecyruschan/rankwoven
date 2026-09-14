-- Preserve provider-observed Site Audit fields separately from content-level checks.

ALTER TABLE seo_audits
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE seo_audit_issues
  ADD COLUMN IF NOT EXISTS source varchar(40) NOT NULL DEFAULT 'rankwoven';

ALTER TABLE seo_audit_issues
  ADD COLUMN IF NOT EXISTS category varchar(80);

ALTER TABLE seo_audit_issues
  ADD COLUMN IF NOT EXISTS affected_pages integer;

ALTER TABLE seo_audit_issues
  ADD COLUMN IF NOT EXISTS change_count integer;

ALTER TABLE seo_audit_issues
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_seo_audit_issues_audit_category
  ON seo_audit_issues(audit_id, category, severity);

CREATE TABLE IF NOT EXISTS ahrefs_site_audit_configs (
  site_id uuid PRIMARY KEY REFERENCES site_connections(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  project_id varchar(80) NOT NULL,
  crawl_date timestamptz,
  comparison_date timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
