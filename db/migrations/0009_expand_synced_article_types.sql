ALTER TABLE synced_articles
  DROP CONSTRAINT IF EXISTS synced_articles_type_check;

ALTER TABLE synced_articles
  ADD CONSTRAINT synced_articles_type_check
  CHECK (type IN ('post', 'page', 'portfolio', 'product'));
