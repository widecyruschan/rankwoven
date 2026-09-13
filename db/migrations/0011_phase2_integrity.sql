-- Strengthen tenant ownership and preserve append-only usage history.
-- Re-running through the migration runner is skipped by version. The guard also
-- keeps direct replay safe for operators validating a migration in isolation.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'phase2_tasks_id_workspace_unique'
      AND conrelid = 'phase2_tasks'::regclass
  ) THEN
    ALTER TABLE phase2_tasks
      ADD CONSTRAINT phase2_tasks_id_workspace_unique UNIQUE (id, workspace_id);
  END IF;
END
$$;

ALTER TABLE task_attempts
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

UPDATE task_attempts ta
SET workspace_id = pt.workspace_id
FROM phase2_tasks pt
WHERE pt.id = ta.task_id
  AND ta.workspace_id IS NULL;

ALTER TABLE task_attempts
  ALTER COLUMN workspace_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_attempts_task_workspace_fk'
      AND conrelid = 'task_attempts'::regclass
  ) THEN
    ALTER TABLE task_attempts
      ADD CONSTRAINT task_attempts_task_workspace_fk
      FOREIGN KEY (task_id, workspace_id)
      REFERENCES phase2_tasks(id, workspace_id)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION prevent_phase2_usage_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'USAGE_LEDGER_APPEND_ONLY';
END;
$$;

DROP TRIGGER IF EXISTS usage_ledger_append_only ON usage_ledger;
CREATE TRIGGER usage_ledger_append_only
BEFORE UPDATE OR DELETE ON usage_ledger
FOR EACH ROW EXECUTE FUNCTION prevent_phase2_usage_mutation();

CREATE OR REPLACE FUNCTION validate_phase2_task_site_workspace()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.site_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM site_connections sc
    WHERE sc.id = NEW.site_id AND sc.workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS phase2_tasks_workspace_scope ON phase2_tasks;
CREATE TRIGGER phase2_tasks_workspace_scope
BEFORE INSERT OR UPDATE OF workspace_id, site_id ON phase2_tasks
FOR EACH ROW EXECUTE FUNCTION validate_phase2_task_site_workspace();
