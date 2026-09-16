-- Ensure every workspace has default monthly entitlements for Phase 2 features.

INSERT INTO entitlement_assignments (
  id,
  workspace_id,
  feature_key,
  limit_value,
  period,
  source,
  effective_at
)
SELECT
  gen_random_uuid(),
  w.id,
  f.feature_key,
  f.limit_value,
  'monthly',
  'platform_default',
  now()
FROM workspaces w
CROSS JOIN (
  VALUES
    ('keyword_research', 200::numeric),
    ('content_optimization', 200::numeric)
) AS f(feature_key, limit_value)
WHERE NOT EXISTS (
  SELECT 1
  FROM entitlement_assignments e
  WHERE e.workspace_id = w.id
    AND e.feature_key = f.feature_key
    AND e.period = 'monthly'
);
