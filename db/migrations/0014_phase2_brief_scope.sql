-- Keep a content brief's primary keyword inside its research project.
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
    WHEN 'keyword_research_runs', 'keyword_clusters', 'competitor_domains' THEN
      IF NOT EXISTS (
        SELECT 1 FROM keyword_research_projects
        WHERE id = (payload ->> 'project_id')::uuid AND workspace_id = child_workspace_id
      ) THEN RAISE EXCEPTION 'PHASE2_WORKSPACE_SCOPE_INVALID'; END IF;
    WHEN 'content_briefs' THEN
      IF NOT EXISTS (
        SELECT 1
        FROM keyword_research_projects project
        JOIN keyword_candidates candidate ON candidate.id = (payload ->> 'primary_keyword_id')::uuid
        WHERE project.id = (payload ->> 'project_id')::uuid
          AND project.workspace_id = child_workspace_id
          AND candidate.workspace_id = child_workspace_id
          AND candidate.project_id = project.id
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
