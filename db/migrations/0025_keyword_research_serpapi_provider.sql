-- Allow SerpAPI as a keyword research provider (DataForSEO fallback).

ALTER TABLE keyword_research_runs
  DROP CONSTRAINT IF EXISTS keyword_research_runs_provider_check;

ALTER TABLE keyword_research_runs
  ADD CONSTRAINT keyword_research_runs_provider_check
  CHECK (provider IN ('dataforseo', 'ahrefs', 'semrush', 'serpapi'));
