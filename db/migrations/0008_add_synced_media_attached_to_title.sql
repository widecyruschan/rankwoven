ALTER TABLE synced_media
  ADD COLUMN IF NOT EXISTS attached_to_title varchar(300);
