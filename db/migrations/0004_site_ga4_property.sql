ALTER TABLE site_connections
  ADD COLUMN IF NOT EXISTS google_analytics_property_id varchar(80);
