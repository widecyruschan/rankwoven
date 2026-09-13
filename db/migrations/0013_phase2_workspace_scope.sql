-- Enforce tenant boundaries for Phase 2A parent-child relationships.
CREATE OR REPLACE FUNCTION validate_phase2_workspace_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  payload jsonb := to_jsonb(NEW);
  child_workspace_id uuid := (payload ->> 'workspace_id')::uuid;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'keyword_research_projects' THEN
      IF NOT EXISTS (
        SELECT 1 FROM site_connections
        WHERE id = (payload ->> 'site_id')::uuid AND workspace_id = child_workspace_id
      ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
    WHEN 'keyword_research_runs', 'keyword_clusters', 'competitor_domains', 'content_briefs' THEN
      IF NOT EXISTS (
        SELECT 1 FROM keyword_research_projects
        WHERE id = (payload ->> 'project_id')::uuid AND workspace_id = child_workspace_id
      ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
    WHEN 'keyword_candidates' THEN
      IF NOT EXISTS (
        SELECT 1 FROM keyword_research_projects
        WHERE id = (payload ->> 'project_id')::uuid AND workspace_id = child_workspace_id
      ) OR (
        payload ->> 'cluster_id' IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM keyword_clusters
          WHERE id = (payload ->> 'cluster_id')::uuid
            AND workspace_id = child_workspace_id
            AND project_id = (payload ->> 'project_id')::uuid
        )
      ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
    WHEN 'competitor_keyword_snapshots' THEN
      IF NOT EXISTS (
        SELECT 1 FROM keyword_research_runs
        WHERE id = (payload ->> 'run_id')::uuid AND workspace_id = child_workspace_id
      ) OR NOT EXISTS (
        SELECT 1 FROM competitor_domains
        WHERE id = (payload ->> 'competitor_id')::uuid AND workspace_id = child_workspace_id
      ) OR (
        payload ->> 'candidate_id' IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM keyword_candidates
          WHERE id = (payload ->> 'candidate_id')::uuid AND workspace_id = child_workspace_id
        )
      ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
    WHEN 'content_score_checks', 'content_claims' THEN
      IF NOT EXISTS (
        SELECT 1 FROM content_optimization_runs
        WHERE id = (payload ->> 'run_id')::uuid AND workspace_id = child_workspace_id
      ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
    WHEN 'content_optimization_runs' THEN
      IF NOT EXISTS (
        SELECT 1 FROM site_connections
        WHERE id = (payload ->> 'site_id')::uuid AND workspace_id = child_workspace_id
      ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
  END CASE;
  RETURN NEW;
END;
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'keyword_research_projects', 'keyword_research_runs', 'keyword_clusters',
    'keyword_candidates', 'competitor_domains', 'competitor_keyword_snapshots',
    'content_briefs', 'content_optimization_runs', 'content_score_checks', 'content_claims'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', table_name || '_workspace_scope', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION validate_phase2_workspace_scope()',
      table_name || '_workspace_scope',
      table_name
    );
  END LOOP;
END
$$;

ALTER TABLE keyword_research_runs
  DROP CONSTRAINT IF EXISTS keyword_research_runs_project_id_input_hash_provider_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_keyword_research_runs_provider_snapshot
  ON keyword_research_runs(project_id, input_hash, provider, COALESCE(provider_snapshot_id, ''));
