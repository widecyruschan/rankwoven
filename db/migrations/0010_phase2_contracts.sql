-- Phase 2A contracts. Runtime code must not create or alter these tables.

CREATE TABLE IF NOT EXISTS phase2_tasks (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id uuid REFERENCES site_connections(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN (
    'keyword_research', 'content_optimization', 'content_rewrite',
    'gateway_model_sync', 'backlink_analysis', 'cms_publish'
  )),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'running', 'partial', 'completed', 'failed',
    'cancelled', 'expired', 'dead_letter'
  )),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  estimated_credits integer NOT NULL DEFAULT 0 CHECK (estimated_credits >= 0),
  reservation_id uuid,
  idempotency_key varchar(200),
  request_hash varchar(64),
  result jsonb,
  error_code varchar(100),
  retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  max_retries integer NOT NULL DEFAULT 3 CHECK (max_retries >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_phase2_tasks_workspace_created
  ON phase2_tasks(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phase2_tasks_status_created
  ON phase2_tasks(status, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_phase2_tasks_idempotency
  ON phase2_tasks(workspace_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS idempotency_keys (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  method varchar(10) NOT NULL,
  route varchar(240) NOT NULL,
  idempotency_key varchar(200) NOT NULL,
  request_hash varchar(64) NOT NULL,
  status_code integer NOT NULL,
  response_body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, method, route, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created
  ON idempotency_keys(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS keyword_research_projects (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  market varchar(120) NOT NULL,
  language varchar(20) NOT NULL,
  device varchar(20) NOT NULL DEFAULT 'desktop',
  engine varchar(40) NOT NULL DEFAULT 'google',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_keyword_research_projects_workspace
  ON keyword_research_projects(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_research_projects_name
  ON keyword_research_projects(workspace_id, name);

CREATE TABLE IF NOT EXISTS keyword_research_runs (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES keyword_research_projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES phase2_tasks(id) ON DELETE SET NULL,
  input_hash varchar(64) NOT NULL,
  provider varchar(40) NOT NULL CHECK (provider IN ('dataforseo', 'ahrefs', 'semrush')),
  provider_snapshot_id varchar(160),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'running', 'partial', 'completed', 'failed', 'cancelled', 'expired'
  )),
  cost_estimate numeric(12, 6) NOT NULL DEFAULT 0 CHECK (cost_estimate >= 0),
  actual_cost numeric(12, 6) CHECK (actual_cost IS NULL OR actual_cost >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, input_hash, provider)
);

CREATE INDEX IF NOT EXISTS idx_keyword_research_runs_workspace_created
  ON keyword_research_runs(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS keyword_clusters (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES keyword_research_projects(id) ON DELETE CASCADE,
  label varchar(240) NOT NULL,
  parent_topic varchar(240),
  intent varchar(80),
  embedding_model varchar(160),
  model_version varchar(80),
  embedding_hash varchar(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, label)
);

CREATE INDEX IF NOT EXISTS idx_keyword_clusters_embedding
  ON keyword_clusters(project_id, embedding_hash);

CREATE TABLE IF NOT EXISTS keyword_candidates (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES keyword_research_projects(id) ON DELETE CASCADE,
  normalized_keyword varchar(300) NOT NULL,
  display_keyword varchar(300) NOT NULL,
  locale varchar(20) NOT NULL,
  intent varchar(80),
  cluster_id uuid REFERENCES keyword_clusters(id) ON DELETE SET NULL,
  source_type text NOT NULL CHECK (source_type IN (
    'first_party_observed', 'provider_estimated', 'deterministic_check',
    'ai_inferred', 'user_asserted'
  )),
  source_ref varchar(240),
  volume integer CHECK (volume IS NULL OR volume >= 0),
  cpc numeric(12, 4) CHECK (cpc IS NULL OR cpc >= 0),
  difficulty numeric(6, 3) CHECK (difficulty IS NULL OR (difficulty BETWEEN 0 AND 100)),
  confidence numeric(6, 3) CHECK (confidence IS NULL OR (confidence BETWEEN 0 AND 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, normalized_keyword)
);

CREATE INDEX IF NOT EXISTS idx_keyword_candidates_project_filters
  ON keyword_candidates(project_id, intent, cluster_id, source_type);

CREATE TABLE IF NOT EXISTS competitor_domains (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES keyword_research_projects(id) ON DELETE CASCADE,
  normalized_domain varchar(253) NOT NULL,
  label varchar(160),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, normalized_domain)
);

CREATE TABLE IF NOT EXISTS competitor_keyword_snapshots (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES keyword_research_runs(id) ON DELETE CASCADE,
  competitor_id uuid NOT NULL REFERENCES competitor_domains(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES keyword_candidates(id) ON DELETE SET NULL,
  rank integer CHECK (rank IS NULL OR rank > 0),
  url text,
  etv numeric(14, 4) CHECK (etv IS NULL OR etv >= 0),
  serp_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_type text NOT NULL CHECK (source_type IN ('first_party_observed', 'provider_estimated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, competitor_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_competitor_keyword_snapshots_rank
  ON competitor_keyword_snapshots(run_id, competitor_id, rank);

CREATE TABLE IF NOT EXISTS content_briefs (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES keyword_research_projects(id) ON DELETE CASCADE,
  primary_keyword_id uuid NOT NULL REFERENCES keyword_candidates(id) ON DELETE RESTRICT,
  secondary_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  outline jsonb NOT NULL DEFAULT '[]'::jsonb,
  audience text,
  locale varchar(20) NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'in_progress', 'completed', 'archived')),
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_optimization_runs (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  article_id bigint,
  input_hash varchar(64) NOT NULL,
  locale varchar(20) NOT NULL,
  rules_version varchar(80) NOT NULL,
  prompt_version varchar(80) NOT NULL,
  schema_version varchar(80) NOT NULL,
  gateway_model varchar(160) NOT NULL,
  task_id uuid REFERENCES phase2_tasks(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'running', 'partial', 'completed', 'failed', 'cancelled', 'expired'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, article_id, input_hash, rules_version, prompt_version, schema_version, gateway_model)
);

CREATE INDEX IF NOT EXISTS idx_content_optimization_runs_workspace_created
  ON content_optimization_runs(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS content_score_checks (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES content_optimization_runs(id) ON DELETE CASCADE,
  code varchar(100) NOT NULL,
  source_type text NOT NULL CHECK (source_type IN (
    'first_party_observed', 'provider_estimated', 'deterministic_check',
    'ai_inferred', 'user_asserted'
  )),
  status text NOT NULL CHECK (status IN ('pass', 'warning', 'fail')),
  weight numeric(8, 4) NOT NULL DEFAULT 1 CHECK (weight >= 0),
  score numeric(6, 3) CHECK (score IS NULL OR (score BETWEEN 0 AND 100)),
  evidence text,
  recommendation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, code)
);

CREATE TABLE IF NOT EXISTS content_claims (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES content_optimization_runs(id) ON DELETE CASCADE,
  claim_text text NOT NULL,
  source_url text,
  source_hash varchar(64),
  source_type text NOT NULL CHECK (source_type IN (
    'first_party_observed', 'provider_estimated', 'deterministic_check',
    'ai_inferred', 'user_asserted'
  )),
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, source_hash)
);

CREATE TABLE IF NOT EXISTS usage_ledger (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  operation varchar(120) NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('reserve', 'finalize', 'release')),
  reservation_id uuid NOT NULL,
  provider varchar(80),
  gateway_model varchar(160),
  price_snapshot_id uuid,
  units numeric(18, 6) NOT NULL DEFAULT 0 CHECK (units >= 0),
  cost_estimate numeric(18, 8) NOT NULL DEFAULT 0 CHECK (cost_estimate >= 0),
  actual_cost numeric(18, 8) CHECK (actual_cost IS NULL OR actual_cost >= 0),
  idempotency_key varchar(200),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_workspace_created
  ON usage_ledger(workspace_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_ledger_idempotency
  ON usage_ledger(workspace_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_ledger_reservation_event
  ON usage_ledger(reservation_id, event_type);

CREATE TABLE IF NOT EXISTS entitlement_assignments (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  feature_key varchar(120) NOT NULL,
  limit_value numeric(18, 6) NOT NULL CHECK (limit_value >= 0),
  period varchar(40) NOT NULL,
  source varchar(80) NOT NULL,
  effective_at timestamptz NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, feature_key, period, effective_at)
);

CREATE TABLE IF NOT EXISTS task_attempts (
  id uuid PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES phase2_tasks(id) ON DELETE CASCADE,
  attempt_no integer NOT NULL CHECK (attempt_no > 0),
  status text NOT NULL CHECK (status IN (
    'queued', 'running', 'partial', 'completed', 'failed', 'cancelled', 'expired', 'dead_letter'
  )),
  provider_request_id varchar(240),
  error_code varchar(100),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  cost numeric(18, 8) CHECK (cost IS NULL OR cost >= 0),
  UNIQUE (task_id, attempt_no)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_type text NOT NULL CHECK (actor_type IN ('user', 'system', 'worker', 'webhook')),
  actor_id uuid,
  action varchar(160) NOT NULL,
  resource_type varchar(120) NOT NULL,
  resource_id uuid,
  request_id varchar(120),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_workspace_created
  ON audit_events(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS gateway_model_catalog (
  id uuid PRIMARY KEY,
  gateway varchar(40) NOT NULL CHECK (gateway = 'wenwen'),
  model_id varchar(160) NOT NULL,
  owned_by varchar(160),
  supported_endpoint_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  capability_status text NOT NULL DEFAULT 'pending' CHECK (capability_status IN ('pending', 'verified', 'unavailable')),
  catalog_hash varchar(64) NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gateway, model_id, catalog_hash)
);

CREATE INDEX IF NOT EXISTS idx_gateway_model_catalog_current
  ON gateway_model_catalog(gateway, model_id, verified_at DESC);

CREATE TABLE IF NOT EXISTS gateway_price_snapshots (
  id uuid PRIMARY KEY,
  gateway varchar(40) NOT NULL CHECK (gateway = 'wenwen'),
  model_id varchar(160) NOT NULL,
  input_price numeric(18, 8) CHECK (input_price IS NULL OR input_price >= 0),
  output_price numeric(18, 8) CHECK (output_price IS NULL OR output_price >= 0),
  image_price numeric(18, 8) CHECK (image_price IS NULL OR image_price >= 0),
  currency varchar(12) NOT NULL DEFAULT 'USD',
  effective_at timestamptz NOT NULL,
  verified_at timestamptz NOT NULL,
  source_ref varchar(240) NOT NULL,
  UNIQUE (gateway, model_id, effective_at)
);

CREATE INDEX IF NOT EXISTS idx_gateway_price_snapshots_current
  ON gateway_price_snapshots(gateway, model_id, effective_at DESC);
