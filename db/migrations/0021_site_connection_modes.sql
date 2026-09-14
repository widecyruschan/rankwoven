-- Distinguish sites connected by a CMS plugin/API from manually tracked websites.

ALTER TABLE site_connections
  ADD COLUMN IF NOT EXISTS connection_mode varchar(20) NOT NULL DEFAULT 'plugin';

ALTER TABLE site_connections
  DROP CONSTRAINT IF EXISTS site_connections_connection_mode_check;

ALTER TABLE site_connections
  ADD CONSTRAINT site_connections_connection_mode_check
  CHECK (connection_mode IN ('plugin', 'api', 'manual'));

ALTER TABLE site_connections
  DROP CONSTRAINT IF EXISTS site_connections_platform_check;

ALTER TABLE site_connections
  ADD CONSTRAINT site_connections_platform_check
  CHECK (platform IN ('wordpress', 'joomla', 'opencart', 'manual'));
