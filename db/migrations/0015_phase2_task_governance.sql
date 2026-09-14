-- PH2-05 task, usage, retry and dead-letter governance.
-- This migration extends the Phase 2 contract without changing historical ledger events.

ALTER TABLE phase2_tasks
  ADD COLUMN IF NOT EXISTS provider_key varchar(80),
  ADD COLUMN IF NOT EXISTS available_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS lease_owner varchar(120),
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS request_id varchar(120),
  ADD COLUMN IF NOT EXISTS replay_of_task_id uuid,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 50;

ALTER TABLE phase2_tasks
  DROP CONSTRAINT IF EXISTS phase2_tasks_priority_check;
ALTER TABLE phase2_tasks
  ADD CONSTRAINT phase2_tasks_priority_check CHECK (priority BETWEEN 0 AND 100);

ALTER TABLE phase2_tasks
  DROP CONSTRAINT IF EXISTS phase2_tasks_status_check;
ALTER TABLE phase2_tasks
  ADD CONSTRAINT phase2_tasks_status_check CHECK (status IN (
    'queued', 'running', 'partial', 'completed', 'failed',
    'cancelled', 'cancellation_requested', 'expired', 'dead_letter'
  ));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'phase2_tasks_replay_workspace_fk'
      AND conrelid = 'phase2_tasks'::regclass
  ) THEN
    ALTER TABLE phase2_tasks
      ADD CONSTRAINT phase2_tasks_replay_workspace_fk
      FOREIGN KEY (replay_of_task_id, workspace_id)
      REFERENCES phase2_tasks(id, workspace_id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_phase2_tasks_due_workspace
  ON phase2_tasks(status, available_at, workspace_id, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_phase2_tasks_lease_expiry
  ON phase2_tasks(lease_expires_at)
  WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_phase2_tasks_workspace_dead_letter
  ON phase2_tasks(workspace_id, completed_at DESC)
  WHERE status = 'dead_letter';

ALTER TABLE usage_ledger
  ADD COLUMN IF NOT EXISTS task_id uuid,
  ADD COLUMN IF NOT EXISTS request_id varchar(120);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_workspace_operation_created
  ON usage_ledger(workspace_id, operation, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_task
  ON usage_ledger(task_id)
  WHERE task_id IS NOT NULL;

ALTER TABLE task_attempts
  ADD COLUMN IF NOT EXISTS request_id varchar(120),
  ADD COLUMN IF NOT EXISTS provider_key varchar(80),
  ADD COLUMN IF NOT EXISTS gateway_model varchar(160),
  ADD COLUMN IF NOT EXISTS cache_state varchar(20),
  ADD COLUMN IF NOT EXISTS fallback_from varchar(160),
  ADD COLUMN IF NOT EXISTS retry_after_ms integer,
  ADD COLUMN IF NOT EXISTS latency_ms integer,
  ADD COLUMN IF NOT EXISTS estimated_cost numeric(18, 8);

ALTER TABLE task_attempts
  DROP CONSTRAINT IF EXISTS task_attempts_status_check;
ALTER TABLE task_attempts
  ADD CONSTRAINT task_attempts_status_check CHECK (status IN (
    'queued', 'running', 'partial', 'completed', 'failed',
    'cancelled', 'cancellation_requested', 'expired', 'dead_letter'
  ));
ALTER TABLE task_attempts
  DROP CONSTRAINT IF EXISTS task_attempts_cache_state_check;
ALTER TABLE task_attempts
  ADD CONSTRAINT task_attempts_cache_state_check CHECK (
    cache_state IS NULL OR cache_state IN ('hit', 'miss', 'bypass')
  );
ALTER TABLE task_attempts
  DROP CONSTRAINT IF EXISTS task_attempts_retry_after_ms_check;
ALTER TABLE task_attempts
  ADD CONSTRAINT task_attempts_retry_after_ms_check CHECK (
    retry_after_ms IS NULL OR retry_after_ms >= 0
  );
ALTER TABLE task_attempts
  DROP CONSTRAINT IF EXISTS task_attempts_latency_ms_check;
ALTER TABLE task_attempts
  ADD CONSTRAINT task_attempts_latency_ms_check CHECK (
    latency_ms IS NULL OR latency_ms >= 0
  );
ALTER TABLE task_attempts
  DROP CONSTRAINT IF EXISTS task_attempts_estimated_cost_check;
ALTER TABLE task_attempts
  ADD CONSTRAINT task_attempts_estimated_cost_check CHECK (
    estimated_cost IS NULL OR estimated_cost >= 0
  );

CREATE INDEX IF NOT EXISTS idx_task_attempts_workspace_created
  ON task_attempts(workspace_id, started_at DESC);

CREATE TABLE IF NOT EXISTS phase2_task_dead_letter_actions (
  id uuid PRIMARY KEY,
  task_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  action varchar(20) NOT NULL CHECK (action IN ('replay', 'ignore')),
  actor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  replacement_task_id uuid,
  reason varchar(500) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (task_id, workspace_id)
    REFERENCES phase2_tasks(id, workspace_id)
    ON DELETE CASCADE,
  FOREIGN KEY (replacement_task_id, workspace_id)
    REFERENCES phase2_tasks(id, workspace_id)
    ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_phase2_dead_letter_replay_once
  ON phase2_task_dead_letter_actions(task_id)
  WHERE action = 'replay';
CREATE INDEX IF NOT EXISTS idx_phase2_dead_letter_actions_workspace_created
  ON phase2_task_dead_letter_actions(workspace_id, created_at DESC);
