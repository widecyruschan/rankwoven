CREATE TABLE IF NOT EXISTS schema_migrations (
  version varchar(120) PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY,
  name varchar(160) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email varchar(240) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role varchar(40) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

INSERT INTO workspaces (id, name)
VALUES ('00000000-0000-4000-8000-000000000001', 'RankWoven Demo Workspace')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS site_connections (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001',
  platform text NOT NULL CHECK (platform IN ('wordpress', 'joomla', 'opencart')),
  name varchar(160) NOT NULL,
  site_url text NOT NULL,
  cms_version varchar(40),
  plugin_version varchar(40),
  api_token_hash text NOT NULL UNIQUE,
  token_preview varchar(16) NOT NULL,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'revoked')),
  created_at timestamptz NOT NULL,
  last_token_used_at timestamptz,
  last_sync_at timestamptz,
  last_sync_stats jsonb,
  wordpress_admin_username varchar(160),
  wordpress_application_password_encrypted text
);

CREATE INDEX IF NOT EXISTS idx_site_connections_platform
  ON site_connections(platform);

ALTER TABLE site_connections
  ADD COLUMN IF NOT EXISTS workspace_id uuid NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

CREATE INDEX IF NOT EXISTS idx_site_connections_workspace
  ON site_connections(workspace_id, created_at DESC);

ALTER TABLE site_connections
  DROP CONSTRAINT IF EXISTS site_connections_status_check;

ALTER TABLE site_connections
  ADD CONSTRAINT site_connections_status_check
  CHECK (status IN ('connected', 'revoked'));

ALTER TABLE site_connections
  ADD COLUMN IF NOT EXISTS wordpress_admin_username varchar(160);

ALTER TABLE site_connections
  ADD COLUMN IF NOT EXISTS wordpress_application_password_encrypted text;

ALTER TABLE site_connections
  ADD COLUMN IF NOT EXISTS last_token_used_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_site_connections_last_token_used
  ON site_connections(last_token_used_at DESC);

CREATE TABLE IF NOT EXISTS sync_tasks (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  scope text NOT NULL DEFAULT 'full' CHECK (scope IN ('full', 'incremental', 'article', 'media', 'suggestion_apply')),
  target_cms_id varchar(80),
  suggestion_id uuid,
  sync_started_at varchar(80),
  updated_after varchar(80),
  batches_received integer NOT NULL DEFAULT 0,
  articles_received integer NOT NULL DEFAULT 0,
  media_received integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sync_tasks_site_created
  ON sync_tasks(site_id, created_at DESC);

ALTER TABLE sync_tasks
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'full';

ALTER TABLE sync_tasks
  ADD COLUMN IF NOT EXISTS target_cms_id varchar(80);

ALTER TABLE sync_tasks
  ADD COLUMN IF NOT EXISTS suggestion_id uuid;

ALTER TABLE sync_tasks
  ADD COLUMN IF NOT EXISTS error_message text;

ALTER TABLE sync_tasks
  DROP CONSTRAINT IF EXISTS sync_tasks_scope_check;

ALTER TABLE sync_tasks
  ADD CONSTRAINT sync_tasks_scope_check
  CHECK (scope IN ('full', 'incremental', 'article', 'media', 'suggestion_apply'));

CREATE TABLE IF NOT EXISTS sync_runs (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  task_id uuid REFERENCES sync_tasks(id) ON DELETE SET NULL,
  batch_index integer,
  sync_started_at varchar(80),
  updated_after varchar(80),
  completed_at timestamptz NOT NULL,
  articles_received integer NOT NULL DEFAULT 0,
  media_received integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_site_completed
  ON sync_runs(site_id, completed_at DESC);

ALTER TABLE sync_runs
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES sync_tasks(id) ON DELETE SET NULL;

ALTER TABLE sync_runs
  ADD COLUMN IF NOT EXISTS batch_index integer;

ALTER TABLE sync_runs
  ADD COLUMN IF NOT EXISTS updated_after varchar(80);

CREATE INDEX IF NOT EXISTS idx_sync_runs_task_batch
  ON sync_runs(task_id, batch_index);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_runs_unique_task_batch
  ON sync_runs(task_id, batch_index)
  WHERE task_id IS NOT NULL AND batch_index IS NOT NULL;

CREATE TABLE IF NOT EXISTS synced_articles (
  id bigserial PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  cms_id varchar(80) NOT NULL,
  type text NOT NULL CHECK (type IN ('post', 'page', 'portfolio', 'product')),
  title varchar(300) NOT NULL,
  slug varchar(240) NOT NULL,
  status varchar(40) NOT NULL,
  url text NOT NULL DEFAULT '',
  excerpt text,
  meta_description varchar(500),
  content_html text,
  author varchar(160),
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  featured_image_id varchar(80),
  published_at varchar(80),
  cms_updated_at varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_id, cms_id)
);

CREATE INDEX IF NOT EXISTS idx_synced_articles_site_updated
  ON synced_articles(site_id, cms_updated_at DESC);

CREATE TABLE IF NOT EXISTS synced_media (
  id bigserial PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  cms_id varchar(80) NOT NULL,
  title varchar(300) NOT NULL,
  url text NOT NULL DEFAULT '',
  mime_type varchar(120),
  file_name varchar(240),
  alt_text varchar(500),
  attached_to_cms_id varchar(80),
  cms_updated_at varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_id, cms_id)
);

CREATE INDEX IF NOT EXISTS idx_synced_media_site_updated
  ON synced_media(site_id, cms_updated_at DESC);

CREATE TABLE IF NOT EXISTS seo_audits (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('completed')),
  score integer NOT NULL,
  rules_version varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_audits_site_created
  ON seo_audits(site_id, created_at DESC);

CREATE TABLE IF NOT EXISTS seo_audit_issues (
  id uuid PRIMARY KEY,
  audit_id uuid NOT NULL REFERENCES seo_audits(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('article', 'media')),
  target_cms_id varchar(80) NOT NULL,
  rule_code varchar(80) NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  message text NOT NULL,
  current_value text,
  suggested_value text,
  field_name varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_audit_issues_site_target
  ON seo_audit_issues(site_id, target_type, target_cms_id);

CREATE TABLE IF NOT EXISTS optimization_suggestions (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  audit_issue_id uuid REFERENCES seo_audit_issues(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('article', 'media')),
  target_cms_id varchar(80) NOT NULL,
  suggestion_type text NOT NULL CHECK (
    suggestion_type IN ('title', 'meta_description', 'content', 'media_alt_text', 'media_file_name', 'internal_link')
  ),
  field_name varchar(80) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'applied', 'failed', 'rejected')),
  current_value text,
  suggested_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  applied_at timestamptz,
  error_message text,
  apply_task_id uuid
);

CREATE INDEX IF NOT EXISTS idx_optimization_suggestions_site_status
  ON optimization_suggestions(site_id, status, created_at DESC);
