-- Persist up to three competitor URLs per connected site for keyword research.

ALTER TABLE site_connections
  ADD COLUMN IF NOT EXISTS competitor_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'site_connections_competitor_urls_max_check'
  ) THEN
    ALTER TABLE site_connections
      ADD CONSTRAINT site_connections_competitor_urls_max_check
      CHECK (jsonb_typeof(competitor_urls) = 'array' AND jsonb_array_length(competitor_urls) <= 3);
  END IF;
END $$;
