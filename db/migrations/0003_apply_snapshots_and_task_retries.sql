ALTER TABLE sync_tasks
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;

ALTER TABLE sync_tasks
  ADD COLUMN IF NOT EXISTS max_retries integer NOT NULL DEFAULT 3;

ALTER TABLE sync_tasks
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz;

ALTER TABLE sync_tasks
  ADD COLUMN IF NOT EXISTS dead_lettered_at timestamptz;

ALTER TABLE sync_tasks
  ADD COLUMN IF NOT EXISTS apply_snapshot_id uuid;

ALTER TABLE sync_tasks
  DROP CONSTRAINT IF EXISTS sync_tasks_scope_check;

ALTER TABLE sync_tasks
  ADD CONSTRAINT sync_tasks_scope_check
  CHECK (scope IN ('full', 'incremental', 'article', 'media', 'suggestion_apply', 'suggestion_rollback'));

ALTER TABLE sync_tasks
  DROP CONSTRAINT IF EXISTS sync_tasks_status_check;

ALTER TABLE sync_tasks
  ADD CONSTRAINT sync_tasks_status_check
  CHECK (status IN ('queued', 'running', 'completed', 'failed', 'dead_letter'));

CREATE INDEX IF NOT EXISTS idx_sync_tasks_queue_next_run
  ON sync_tasks(status, next_run_at, created_at);

CREATE TABLE IF NOT EXISTS apply_snapshots (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES site_connections(id) ON DELETE CASCADE,
  suggestion_id uuid REFERENCES optimization_suggestions(id) ON DELETE SET NULL,
  task_id uuid REFERENCES sync_tasks(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('article', 'media')),
  target_cms_id varchar(80) NOT NULL,
  field_name varchar(80) NOT NULL,
  before_value text,
  after_value text NOT NULL,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'applied', 'rolled_back', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz,
  rolled_back_at timestamptz,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_apply_snapshots_site_created
  ON apply_snapshots(site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_apply_snapshots_suggestion
  ON apply_snapshots(suggestion_id);
