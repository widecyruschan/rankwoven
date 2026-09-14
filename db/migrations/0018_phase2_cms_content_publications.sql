-- PH2-09 content draft publication lifecycle. Publish and schedule remain disabled.

CREATE TABLE IF NOT EXISTS content_publish_snapshots (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES content_optimization_runs(id) ON DELETE CASCADE,
  suggestion_id uuid NOT NULL REFERENCES content_rewrite_suggestions(id) ON DELETE CASCADE,
  source_hash varchar(64) NOT NULL,
  approved_content text NOT NULL,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (suggestion_id, source_hash)
);

CREATE TABLE IF NOT EXISTS content_publications (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  snapshot_id uuid NOT NULL REFERENCES content_publish_snapshots(id) ON DELETE CASCADE,
  task_id uuid REFERENCES sync_tasks(id) ON DELETE SET NULL,
  idempotency_key varchar(200) NOT NULL,
  cms_post_id varchar(80),
  status varchar(30) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'draft_created', 'verifying', 'verified', 'changed', 'blocked', 'failed', 'rolled_back')),
  response_hash varchar(64),
  error_code varchar(100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS content_publication_verifications (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  publication_id uuid NOT NULL REFERENCES content_publications(id) ON DELETE CASCADE,
  http_status integer,
  canonical_url text,
  content_hash varchar(64),
  status varchar(30) NOT NULL CHECK (status IN ('verified', 'changed', 'blocked', 'failed')),
  verified_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_publications_workspace_created ON content_publications(workspace_id, created_at DESC);
