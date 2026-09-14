-- PH2-06 Keyword Intelligence facts and snapshots.
-- Historical Phase 2 rows remain readable; this migration only adds fields/tables.

ALTER TABLE keyword_research_runs
  ADD COLUMN IF NOT EXISTS request_context_hash varchar(64),
  ADD COLUMN IF NOT EXISTS provider_methodology_version varchar(120),
  ADD COLUMN IF NOT EXISTS collected_at timestamptz,
  ADD COLUMN IF NOT EXISTS partial_reason varchar(500),
  ADD COLUMN IF NOT EXISTS seed_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS own_domain varchar(253),
  ADD COLUMN IF NOT EXISTS competitor_domains jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS locale varchar(40) NOT NULL DEFAULT 'zh-Hant',
  ADD COLUMN IF NOT EXISTS product_context text,
  ADD COLUMN IF NOT EXISTS audience text,
  ADD COLUMN IF NOT EXISTS conversion_goal text;

ALTER TABLE keyword_candidates
  ADD COLUMN IF NOT EXISTS opportunity_score numeric(6, 3),
  ADD COLUMN IF NOT EXISTS score_confidence numeric(6, 3),
  ADD COLUMN IF NOT EXISTS model_version varchar(120);

ALTER TABLE keyword_candidates
  DROP CONSTRAINT IF EXISTS keyword_candidates_opportunity_score_check;
ALTER TABLE keyword_candidates
  ADD CONSTRAINT keyword_candidates_opportunity_score_check
  CHECK (opportunity_score IS NULL OR opportunity_score BETWEEN 0 AND 100);
ALTER TABLE keyword_candidates
  DROP CONSTRAINT IF EXISTS keyword_candidates_score_confidence_check;
ALTER TABLE keyword_candidates
  ADD CONSTRAINT keyword_candidates_score_confidence_check
  CHECK (score_confidence IS NULL OR score_confidence BETWEEN 0 AND 1);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'keyword_research_runs_id_workspace_unique') THEN
    ALTER TABLE keyword_research_runs ADD CONSTRAINT keyword_research_runs_id_workspace_unique UNIQUE (id, workspace_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'keyword_candidates_id_workspace_unique') THEN
    ALTER TABLE keyword_candidates ADD CONSTRAINT keyword_candidates_id_workspace_unique UNIQUE (id, workspace_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'competitor_domains_id_workspace_unique') THEN
    ALTER TABLE competitor_domains ADD CONSTRAINT competitor_domains_id_workspace_unique UNIQUE (id, workspace_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS keyword_metrics (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES keyword_research_runs(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES keyword_candidates(id) ON DELETE CASCADE,
  metric_name varchar(40) NOT NULL CHECK (metric_name IN (
    'volume', 'cpc_usd', 'competition', 'difficulty', 'trend',
    'gsc_clicks', 'gsc_impressions', 'gsc_ctr', 'gsc_position'
  )),
  numeric_value numeric(18, 8),
  provider varchar(80),
  source_type text NOT NULL CHECK (source_type IN (
    'first_party_observed', 'provider_estimated', 'deterministic_check',
    'ai_inferred', 'user_asserted'
  )),
  provider_snapshot_id varchar(160),
  location varchar(120),
  language varchar(40),
  device varchar(20),
  collected_at timestamptz NOT NULL DEFAULT now(),
  provider_updated_at timestamptz,
  methodology_version varchar(120),
  confidence numeric(6, 3) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  raw_response_ref varchar(240),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (run_id, workspace_id) REFERENCES keyword_research_runs(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id, workspace_id) REFERENCES keyword_candidates(id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_keyword_metrics_run_candidate
  ON keyword_metrics(run_id, candidate_id, metric_name, collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_metrics_workspace_created
  ON keyword_metrics(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS keyword_observations (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES keyword_research_runs(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES keyword_candidates(id) ON DELETE CASCADE,
  domain_type varchar(20) NOT NULL CHECK (domain_type IN ('own', 'competitor')),
  competitor_id uuid REFERENCES competitor_domains(id) ON DELETE CASCADE,
  domain varchar(253) NOT NULL,
  rank integer CHECK (rank IS NULL OR rank BETWEEN 1 AND 100),
  url text,
  etv numeric(18, 8) CHECK (etv IS NULL OR etv >= 0),
  serp_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_type text NOT NULL CHECK (source_type IN ('first_party_observed', 'provider_estimated')),
  provider varchar(80) NOT NULL,
  provider_snapshot_id varchar(160),
  collected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (run_id, workspace_id) REFERENCES keyword_research_runs(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id, workspace_id) REFERENCES keyword_candidates(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (competitor_id, workspace_id) REFERENCES competitor_domains(id, workspace_id) ON DELETE CASCADE,
  CHECK ((domain_type = 'competitor' AND competitor_id IS NOT NULL) OR (domain_type = 'own' AND competitor_id IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_keyword_observations_run_candidate
  ON keyword_observations(run_id, candidate_id, domain_type, rank);
CREATE INDEX IF NOT EXISTS idx_keyword_observations_workspace_created
  ON keyword_observations(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS keyword_gap_snapshots (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES keyword_research_runs(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES keyword_candidates(id) ON DELETE CASCADE,
  classification varchar(20) NOT NULL CHECK (classification IN ('missing', 'weak', 'strong', 'shared')),
  own_best_rank integer CHECK (own_best_rank IS NULL OR own_best_rank BETWEEN 1 AND 100),
  competitor_best_rank integer CHECK (competitor_best_rank IS NULL OR competitor_best_rank BETWEEN 1 AND 100),
  competitor_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  score numeric(6, 3) CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  score_confidence numeric(6, 3) CHECK (score_confidence IS NULL OR score_confidence BETWEEN 0 AND 1),
  provider varchar(80) NOT NULL,
  provider_snapshot_id varchar(160),
  collected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (run_id, workspace_id) REFERENCES keyword_research_runs(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id, workspace_id) REFERENCES keyword_candidates(id, workspace_id) ON DELETE CASCADE,
  UNIQUE (run_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_keyword_gap_snapshots_workspace_classification
  ON keyword_gap_snapshots(workspace_id, classification, collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_gap_snapshots_run_classification
  ON keyword_gap_snapshots(run_id, classification, candidate_id);

CREATE OR REPLACE FUNCTION validate_keyword_intelligence_workspace_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'keyword_metrics' THEN
    IF NOT EXISTS (
      SELECT 1 FROM keyword_research_runs r
      JOIN keyword_candidates c ON c.id = NEW.candidate_id
      WHERE r.id = NEW.run_id AND r.workspace_id = NEW.workspace_id
        AND c.workspace_id = NEW.workspace_id AND c.project_id = r.project_id
    ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
  ELSIF TG_TABLE_NAME = 'keyword_observations' THEN
    IF NOT EXISTS (
      SELECT 1 FROM keyword_research_runs r
      JOIN keyword_candidates c ON c.id = NEW.candidate_id
      WHERE r.id = NEW.run_id AND r.workspace_id = NEW.workspace_id
        AND c.workspace_id = NEW.workspace_id AND c.project_id = r.project_id
    ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
    IF NEW.competitor_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM competitor_domains d
      WHERE d.id = NEW.competitor_id AND d.workspace_id = NEW.workspace_id
    ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
  ELSIF TG_TABLE_NAME = 'keyword_gap_snapshots' THEN
    IF NOT EXISTS (
      SELECT 1 FROM keyword_research_runs r
      JOIN keyword_candidates c ON c.id = NEW.candidate_id
      WHERE r.id = NEW.run_id AND r.workspace_id = NEW.workspace_id
        AND c.workspace_id = NEW.workspace_id AND c.project_id = r.project_id
    ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS keyword_metrics_workspace_scope ON keyword_metrics;
CREATE TRIGGER keyword_metrics_workspace_scope
BEFORE INSERT OR UPDATE ON keyword_metrics
FOR EACH ROW EXECUTE FUNCTION validate_keyword_intelligence_workspace_scope();

DROP TRIGGER IF EXISTS keyword_observations_workspace_scope ON keyword_observations;
CREATE TRIGGER keyword_observations_workspace_scope
BEFORE INSERT OR UPDATE ON keyword_observations
FOR EACH ROW EXECUTE FUNCTION validate_keyword_intelligence_workspace_scope();

DROP TRIGGER IF EXISTS keyword_gap_snapshots_workspace_scope ON keyword_gap_snapshots;
CREATE TRIGGER keyword_gap_snapshots_workspace_scope
BEFORE INSERT OR UPDATE ON keyword_gap_snapshots
FOR EACH ROW EXECUTE FUNCTION validate_keyword_intelligence_workspace_scope();
