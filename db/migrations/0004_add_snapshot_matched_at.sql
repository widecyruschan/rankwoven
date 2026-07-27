-- 0004: 為 apply_snapshots 加入 snapshot_matched_at 欄位，
-- 用於記錄 Worker 寫回前即時讀取 WordPress 真實值並比對 snapshot 的時間點。

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apply_snapshots'
      AND column_name = 'snapshot_matched_at'
  ) THEN
    ALTER TABLE apply_snapshots
      ADD COLUMN snapshot_matched_at timestamptz;
  END IF;
END $$;
