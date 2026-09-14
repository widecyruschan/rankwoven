-- PH2-10 Site Audit closed loop, CrUX metrics and monitoring.
-- Raw page bodies are intentionally not persisted here.

ALTER TABLE site_audit_results
  DROP CONSTRAINT IF EXISTS site_audit_results_status_check;
ALTER TABLE site_audit_results
  ADD CONSTRAINT site_audit_results_status_check
  CHECK (status IN ('queued', 'running', 'partial', 'completed', 'failed', 'cancelled'));

CREATE TABLE IF NOT EXISTS site_audit_pages (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  audit_id uuid NOT NULL REFERENCES site_audit_results(id) ON DELETE CASCADE,
  url text NOT NULL,
  normalized_url text NOT NULL,
  http_status integer,
  content_type varchar(120),
  title text,
  canonical_url text,
  robots_indexable boolean,
  has_schema boolean,
  internal_links_count integer NOT NULL DEFAULT 0,
  external_links_count integer NOT NULL DEFAULT 0,
  crawl_status varchar(30) NOT NULL DEFAULT 'ok' CHECK (crawl_status IN ('ok', 'timeout', 'blocked', 'failed')),
  error_code varchar(100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (audit_id, normalized_url)
);

CREATE INDEX IF NOT EXISTS idx_site_audit_pages_scope
  ON site_audit_pages(workspace_id, site_id, audit_id);

CREATE TABLE IF NOT EXISTS site_audit_findings (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  audit_id uuid NOT NULL REFERENCES site_audit_results(id) ON DELETE CASCADE,
  page_id uuid REFERENCES site_audit_pages(id) ON DELETE CASCADE,
  fingerprint varchar(128) NOT NULL,
  category varchar(40) NOT NULL,
  severity varchar(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  description text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendation text,
  rule_version varchar(40) NOT NULL DEFAULT 'ph2-10.1',
  status varchar(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'ignored', 'fixed', 'persisting', 'regressed', 'partial')),
  ignored_reason text,
  ignored_until timestamptz,
  ignored_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (audit_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_site_audit_findings_fingerprint
  ON site_audit_findings(workspace_id, site_id, fingerprint, created_at DESC);

ALTER TABLE site_audit_findings
  ADD COLUMN IF NOT EXISTS remediation_task_id uuid REFERENCES phase2_tasks(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS site_audit_rechecks (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  finding_id uuid NOT NULL REFERENCES site_audit_findings(id) ON DELETE CASCADE,
  audit_id uuid REFERENCES site_audit_results(id) ON DELETE SET NULL,
  disposition varchar(20) NOT NULL CHECK (disposition IN ('fixed', 'persisting', 'regressed', 'partial')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_audit_rechecks_finding
  ON site_audit_rechecks(workspace_id, finding_id, created_at DESC);

CREATE TABLE IF NOT EXISTS site_audit_metrics (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  audit_id uuid NOT NULL REFERENCES site_audit_results(id) ON DELETE CASCADE,
  metric_name varchar(100) NOT NULL,
  source_type varchar(40) NOT NULL CHECK (source_type IN ('lighthouse_lab', 'crux_field', 'gsc_first_party', 'deterministic_check')),
  provider varchar(80),
  device varchar(30),
  data_window varchar(80),
  value numeric,
  status varchar(30) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable', 'error')),
  estimated boolean NOT NULL DEFAULT false,
  collected_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_audit_metrics_scope
  ON site_audit_metrics(workspace_id, site_id, audit_id, source_type);

CREATE TABLE IF NOT EXISTS monitor_configs (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  kind varchar(30) NOT NULL CHECK (kind IN ('competitor', 'ai_visibility', 'technical')),
  target_url text,
  frequency varchar(20) NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  timezone varchar(80) NOT NULL DEFAULT 'UTC',
  threshold numeric NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  quiet_period_minutes integer NOT NULL DEFAULT 1440 CHECK (quiet_period_minutes >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitor_configs_scope
  ON monitor_configs(workspace_id, site_id, status);

CREATE TABLE IF NOT EXISTS monitor_runs (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  config_id uuid NOT NULL REFERENCES monitor_configs(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'partial', 'failed')),
  provider varchar(80),
  model varchar(120),
  locale varchar(40),
  device varchar(30),
  sampled_at timestamptz,
  estimated boolean NOT NULL DEFAULT false,
  error_code varchar(100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (config_id, scheduled_at)
);

CREATE TABLE IF NOT EXISTS monitor_events (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  config_id uuid NOT NULL REFERENCES monitor_configs(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES monitor_runs(id) ON DELETE CASCADE,
  fingerprint varchar(128) NOT NULL,
  event_type varchar(60) NOT NULL,
  severity varchar(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  baseline numeric,
  current_value numeric,
  delta numeric,
  source_type varchar(40) NOT NULL,
  recommendation text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_monitor_events_scope
  ON monitor_events(workspace_id, site_id, created_at DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES monitor_events(id) ON DELETE CASCADE,
  channel varchar(30) NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'queue', 'email')),
  status varchar(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'read', 'muted', 'sent')),
  muted_until timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_alerts_scope
  ON alerts(workspace_id, site_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION validate_phase2_monitoring_workspace_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  payload jsonb := to_jsonb(NEW);
BEGIN
  IF TG_TABLE_NAME = 'site_audit_pages' AND NOT EXISTS (
    SELECT 1 FROM site_audit_results r
    JOIN site_connections s ON s.id = r.site_id
    WHERE r.id = (payload ->> 'audit_id')::uuid AND r.site_id = (payload ->> 'site_id')::uuid AND s.workspace_id = (payload ->> 'workspace_id')::uuid
  ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
  IF TG_TABLE_NAME = 'site_audit_findings' AND NOT EXISTS (
    SELECT 1 FROM site_audit_results r
    JOIN site_connections s ON s.id = r.site_id
    WHERE r.id = (payload ->> 'audit_id')::uuid AND r.site_id = (payload ->> 'site_id')::uuid AND s.workspace_id = (payload ->> 'workspace_id')::uuid
  ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
  IF TG_TABLE_NAME = 'site_audit_rechecks' AND NOT EXISTS (
    SELECT 1 FROM site_audit_findings f
    WHERE f.id = (payload ->> 'finding_id')::uuid AND f.site_id = (payload ->> 'site_id')::uuid AND f.workspace_id = (payload ->> 'workspace_id')::uuid
  ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
  IF TG_TABLE_NAME = 'site_audit_metrics' AND NOT EXISTS (
    SELECT 1 FROM site_audit_results r
    JOIN site_connections s ON s.id = r.site_id
    WHERE r.id = (payload ->> 'audit_id')::uuid AND r.site_id = (payload ->> 'site_id')::uuid AND s.workspace_id = (payload ->> 'workspace_id')::uuid
  ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
  IF TG_TABLE_NAME = 'monitor_configs' AND NOT EXISTS (
    SELECT 1 FROM site_connections s
    WHERE s.id = (payload ->> 'site_id')::uuid AND s.workspace_id = (payload ->> 'workspace_id')::uuid
  ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
  IF TG_TABLE_NAME = 'monitor_runs' AND NOT EXISTS (
    SELECT 1 FROM monitor_configs c
    WHERE c.id = (payload ->> 'config_id')::uuid AND c.workspace_id = (payload ->> 'workspace_id')::uuid
  ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
  IF TG_TABLE_NAME = 'monitor_events' AND NOT EXISTS (
    SELECT 1 FROM monitor_runs r
    JOIN monitor_configs c ON c.id = r.config_id
    WHERE r.id = (payload ->> 'run_id')::uuid AND r.workspace_id = (payload ->> 'workspace_id')::uuid
      AND c.id = (payload ->> 'config_id')::uuid AND c.site_id = (payload ->> 'site_id')::uuid
  ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
  IF TG_TABLE_NAME = 'alerts' AND NOT EXISTS (
    SELECT 1 FROM monitor_events e
    WHERE e.id = (payload ->> 'event_id')::uuid AND e.workspace_id = (payload ->> 'workspace_id')::uuid AND e.site_id = (payload ->> 'site_id')::uuid
  ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'site_audit_pages', 'site_audit_findings', 'site_audit_rechecks',
    'site_audit_metrics', 'monitor_configs', 'monitor_runs', 'monitor_events', 'alerts'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', table_name || '_workspace_scope', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION validate_phase2_monitoring_workspace_scope()',
      table_name || '_workspace_scope', table_name
    );
  END LOOP;
END
$$;
