ALTER TABLE synced_articles
  ADD COLUMN IF NOT EXISTS meta_description varchar(500);
