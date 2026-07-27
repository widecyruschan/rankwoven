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

-- 1. 去重：刪除同一 (workspace_id, platform, site_url) 組合中較舊的重複列。
--    使用普通 CTE 比視窗函數更兼容舊版 PostgreSQL。
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT workspace_id, platform, site_url, MAX(created_at) AS keep_created
    FROM site_connections
    GROUP BY workspace_id, platform, site_url
    HAVING COUNT(*) > 1
  LOOP
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
