-- Preserve every URL affected by a site audit finding instead of only one sample URL.
ALTER TABLE site_audit_issues
  ADD COLUMN IF NOT EXISTS affected_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
