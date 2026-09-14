-- PH2-07 Content Optimizer snapshots, checks, claims, rewrites and plans.

ALTER TABLE content_optimization_runs
  ADD COLUMN IF NOT EXISTS source_kind varchar(20) NOT NULL DEFAULT 'inline',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS content_locale varchar(20) NOT NULL DEFAULT 'zh-Hant',
  ADD COLUMN IF NOT EXISTS target_market varchar(80),
  ADD COLUMN IF NOT EXISTS dialect varchar(40),
  ADD COLUMN IF NOT EXISTS focus_keyword varchar(300) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS secondary_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS score numeric(6, 3),
  ADD COLUMN IF NOT EXISTS confidence numeric(6, 3),
  ADD COLUMN IF NOT EXISTS parent_run_id uuid REFERENCES content_optimization_runs(id) ON DELETE SET NULL;

ALTER TABLE content_optimization_runs
  DROP CONSTRAINT IF EXISTS content_optimization_runs_source_kind_check;
ALTER TABLE content_optimization_runs
  ADD CONSTRAINT content_optimization_runs_source_kind_check
  CHECK (source_kind IN ('article', 'inline', 'public_url'));

CREATE TABLE IF NOT EXISTS content_optimization_input_snapshots (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES content_optimization_runs(id) ON DELETE CASCADE,
  source_kind varchar(20) NOT NULL CHECK (source_kind IN ('article', 'inline', 'public_url')),
  source_url text,
  content_text text NOT NULL,
  content_hash varchar(64) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id)
);

ALTER TABLE content_score_checks
  ADD COLUMN IF NOT EXISTS dimension varchar(40) NOT NULL DEFAULT 'on_page',
  ADD COLUMN IF NOT EXISTS evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE content_score_checks
  DROP CONSTRAINT IF EXISTS content_score_checks_status_check;
ALTER TABLE content_score_checks
  ADD CONSTRAINT content_score_checks_status_check
  CHECK (status IN ('pass', 'warning', 'fail', 'not_applicable'));

ALTER TABLE content_claims
  ADD COLUMN IF NOT EXISTS source_title varchar(500),
  ADD COLUMN IF NOT EXISTS source_excerpt_hash varchar(64),
  ADD COLUMN IF NOT EXISTS source_fetched_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason varchar(120);
ALTER TABLE content_claims
  DROP CONSTRAINT IF EXISTS content_claims_verification_status_check;
ALTER TABLE content_claims
  ADD CONSTRAINT content_claims_verification_status_check
  CHECK (verification_status IN ('unverified', 'verified', 'rejected', 'source_required', 'blocked'));

CREATE TABLE IF NOT EXISTS content_rewrite_suggestions (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES content_optimization_runs(id) ON DELETE CASCADE,
  task_id uuid REFERENCES phase2_tasks(id) ON DELETE SET NULL,
  scope varchar(30) NOT NULL CHECK (scope IN ('title', 'meta', 'opening', 'paragraph', 'section', 'outline', 'full_document')),
  selector varchar(300),
  before_text text NOT NULL,
  before_hash varchar(64) NOT NULL,
  suggested_text text,
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  status varchar(30) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'draft', 'approved', 'rejected', 'blocked', 'failed')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_rewrite_suggestions_run_created
  ON content_rewrite_suggestions(run_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_rewrite_suggestions_task
  ON content_rewrite_suggestions(task_id) WHERE task_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS content_optimization_plans (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'queued', 'running', 'partial', 'completed', 'cancelled', 'failed')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  rules_version varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_optimization_plan_items (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES content_optimization_plans(id) ON DELETE CASCADE,
  article_id bigint,
  run_id uuid REFERENCES content_optimization_runs(id) ON DELETE SET NULL,
  suggestion_id uuid REFERENCES content_rewrite_suggestions(id) ON DELETE SET NULL,
  status varchar(30) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'partial', 'completed', 'failed', 'cancelled')),
  position integer NOT NULL DEFAULT 1 CHECK (position > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, article_id)
);

CREATE OR REPLACE FUNCTION validate_content_optimizer_workspace_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'content_optimization_input_snapshots' THEN
    IF NOT EXISTS (SELECT 1 FROM content_optimization_runs WHERE id = NEW.run_id AND workspace_id = NEW.workspace_id) THEN
      RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID';
    END IF;
  ELSIF TG_TABLE_NAME = 'content_rewrite_suggestions' THEN
    IF NOT EXISTS (SELECT 1 FROM content_optimization_runs WHERE id = NEW.run_id AND workspace_id = NEW.workspace_id) THEN
      RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID';
    END IF;
    IF NEW.task_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM phase2_tasks WHERE id = NEW.task_id AND workspace_id = NEW.workspace_id) THEN
      RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID';
    END IF;
  ELSIF TG_TABLE_NAME = 'content_optimization_plans' THEN
    IF NOT EXISTS (SELECT 1 FROM site_connections WHERE id = NEW.site_id AND workspace_id = NEW.workspace_id) THEN
      RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID';
    END IF;
  ELSIF TG_TABLE_NAME = 'content_optimization_plan_items' THEN
    IF NOT EXISTS (SELECT 1 FROM content_optimization_plans WHERE id = NEW.plan_id AND workspace_id = NEW.workspace_id) THEN
      RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_optimization_input_snapshots_workspace_scope ON content_optimization_input_snapshots;
CREATE TRIGGER content_optimization_input_snapshots_workspace_scope
BEFORE INSERT OR UPDATE ON content_optimization_input_snapshots
FOR EACH ROW EXECUTE FUNCTION validate_content_optimizer_workspace_scope();
DROP TRIGGER IF EXISTS content_rewrite_suggestions_workspace_scope ON content_rewrite_suggestions;
CREATE TRIGGER content_rewrite_suggestions_workspace_scope
BEFORE INSERT OR UPDATE ON content_rewrite_suggestions
FOR EACH ROW EXECUTE FUNCTION validate_content_optimizer_workspace_scope();
DROP TRIGGER IF EXISTS content_optimization_plans_workspace_scope ON content_optimization_plans;
CREATE TRIGGER content_optimization_plans_workspace_scope
BEFORE INSERT OR UPDATE ON content_optimization_plans
FOR EACH ROW EXECUTE FUNCTION validate_content_optimizer_workspace_scope();
DROP TRIGGER IF EXISTS content_optimization_plan_items_workspace_scope ON content_optimization_plan_items;
CREATE TRIGGER content_optimization_plan_items_workspace_scope
BEFORE INSERT OR UPDATE ON content_optimization_plan_items
FOR EACH ROW EXECUTE FUNCTION validate_content_optimizer_workspace_scope();
