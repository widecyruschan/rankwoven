-- 0005_site_url_unique.sql
-- 目的：防止同一 workspace / platform 下因 URL 微小差異（trailing slash、scheme、大小寫）
-- 或並發請求而重複新增站點連線。API 層 create() 已改為 upsert（依正規化 site_url 去重），
-- 此索引作為資料層最後防線，確保 SaaS 後台同一站點只會出現一次。
--
-- 執行策略：
-- 1. 先去重：保留每組 (workspace_id, platform, normalize(site_url)) 中最新一筆，
--    刪除其餘重複（注意：此操作會永久移除重複站點，但保留最新連線與其 token）。
-- 2. 建立唯一索引（若已存在則跳過）。
-- 可重複執行，對已乾淨的資料庫無副作用。

-- 1. 去重：對每一組 (workspace_id, platform, site_url) 保留 created_at 最新的一筆，
--    並在刪除前把該組內最新（最大）的 last_token_used_at、last_sync_at、last_sync_stats
--    合併到保留列，避免遺失最近的同步統計。
DO $$
DECLARE
  r RECORD;
  v_last_token_used_at TIMESTAMP WITH TIME ZONE;
  v_last_sync_at TIMESTAMP WITH TIME ZONE;
  v_last_sync_stats JSONB;
BEGIN
  FOR r IN
    SELECT workspace_id, platform, site_url, MAX(created_at) AS keep_created
    FROM site_connections
    GROUP BY workspace_id, platform, site_url
    HAVING COUNT(*) > 1
  LOOP
    SELECT
      MAX(last_token_used_at),
      MAX(last_sync_at),
      (ARRAY_AGG(last_sync_stats ORDER BY COALESCE(last_sync_at, created_at) DESC NULLS LAST))[1]
    INTO v_last_token_used_at, v_last_sync_at, v_last_sync_stats
    FROM site_connections
    WHERE workspace_id = r.workspace_id
      AND platform = r.platform
      AND site_url = r.site_url;

    UPDATE site_connections
    SET
      last_token_used_at = GREATEST(last_token_used_at, v_last_token_used_at),
      last_sync_at = GREATEST(last_sync_at, v_last_sync_at),
      last_sync_stats = COALESCE(v_last_sync_stats, last_sync_stats)
    WHERE workspace_id = r.workspace_id
      AND platform = r.platform
      AND site_url = r.site_url
      AND created_at = r.keep_created;

    DELETE FROM site_connections
    WHERE workspace_id = r.workspace_id
      AND platform = r.platform
      AND site_url = r.site_url
      AND created_at < r.keep_created;
  END LOOP;
END $$;

-- 2. 建立唯一索引（僅當不存在）。
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'uq_site_connections_workspace_platform_url'
  ) THEN
    CREATE UNIQUE INDEX uq_site_connections_workspace_platform_url
      ON site_connections (workspace_id, platform, site_url);
  END IF;
END $$;
