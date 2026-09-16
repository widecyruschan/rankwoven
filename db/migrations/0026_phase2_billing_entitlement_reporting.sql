-- PH2-11 subscription projections, plan catalog, webhook evidence and report exports.
-- Stripe remains the payment source of truth; these tables hold only sanitized local state.

CREATE TABLE IF NOT EXISTS billing_plan_catalog (
  id uuid PRIMARY KEY,
  plan_key varchar(80) NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  billing_interval varchar(20) NOT NULL CHECK (billing_interval IN ('month', 'year')),
  sort_rank integer NOT NULL CHECK (sort_rank >= 0),
  display_name varchar(120) NOT NULL,
  description text NOT NULL DEFAULT '',
  currency varchar(3) NOT NULL,
  unit_amount integer CHECK (unit_amount IS NULL OR unit_amount >= 0),
  provider varchar(40) NOT NULL DEFAULT 'stripe',
  provider_price_ref varchar(160),
  status varchar(30) NOT NULL CHECK (status IN ('active', 'contact_only', 'archived')),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_at timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_key, version, billing_interval)
);

CREATE INDEX IF NOT EXISTS idx_billing_plan_catalog_active_rank
  ON billing_plan_catalog(status, billing_interval, sort_rank, effective_at DESC);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider varchar(40) NOT NULL,
  external_customer_id varchar(160) NOT NULL,
  external_subscription_id varchar(160) NOT NULL,
  plan_key varchar(80) NOT NULL,
  plan_version integer NOT NULL CHECK (plan_version > 0),
  status varchar(40) NOT NULL CHECK (status IN (
    'active', 'trialing', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired'
  )),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancel_at timestamptz,
  provider_updated_at timestamptz NOT NULL,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_subscription_id),
  UNIQUE (workspace_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_status
  ON subscriptions(workspace_id, status, current_period_end DESC);

CREATE TABLE IF NOT EXISTS subscription_change_requests (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  actor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  change_type varchar(40) NOT NULL CHECK (change_type IN (
    'checkout', 'upgrade_preview', 'upgrade', 'cancel_renewal', 'resume_renewal', 'portal'
  )),
  from_plan_key varchar(80),
  to_plan_key varchar(80),
  idempotency_key varchar(200) NOT NULL,
  provider_ref varchar(240),
  preview_token_hash varchar(64),
  preview_amount integer,
  currency varchar(3),
  status varchar(30) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_subscription_change_requests_workspace_created
  ON subscription_change_requests(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id uuid PRIMARY KEY,
  provider varchar(40) NOT NULL,
  external_event_id varchar(160) NOT NULL,
  event_type varchar(120) NOT NULL,
  payload_hash varchar(64) NOT NULL,
  provider_created_at timestamptz NOT NULL,
  status varchar(30) NOT NULL CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
  error_code varchar(120),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_event_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_status_created
  ON billing_webhook_events(status, created_at DESC);

CREATE TABLE IF NOT EXISTS report_exports (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  report_type varchar(60) NOT NULL CHECK (report_type IN ('usage_csv', 'site_audit_csv', 'keyword_pdf', 'content_pdf')),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(30) NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'expired')),
  storage_ref varchar(320),
  expires_at timestamptz,
  error_code varchar(120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_exports_workspace_created
  ON report_exports(workspace_id, created_at DESC);

INSERT INTO billing_plan_catalog (
  id, plan_key, version, billing_interval, sort_rank, display_name, description,
  currency, unit_amount, provider, status, features, limits, effective_at
)
VALUES
  (
    gen_random_uuid(), 'starter', 1, 'month', 1, 'Starter',
    'For one owner validating SEO optimization on a small site.',
    'usd', 2900, 'stripe', 'active',
    '["human_review","site_audit"]'::jsonb,
    '{"sites":1,"keyword_research":200,"content_optimization":200}'::jsonb,
    now()
  ),
  (
    gen_random_uuid(), 'growth', 1, 'month', 2, 'Growth',
    'For growing content teams that need more audits and image workflows.',
    'usd', 7900, 'stripe', 'active',
    '["human_review","site_audit","media_optimization"]'::jsonb,
    '{"sites":5,"keyword_research":2000,"content_optimization":50}'::jsonb,
    now()
  ),
  (
    gen_random_uuid(), 'agency', 1, 'month', 3, 'Agency',
    'For agencies managing multiple client websites and review queues.',
    'usd', 19900, 'stripe', 'active',
    '["human_review","site_audit","media_optimization","team_access","report_exports"]'::jsonb,
    '{"sites":20,"keyword_research":20000,"content_optimization":500}'::jsonb,
    now()
  ),
  (
    gen_random_uuid(), 'enterprise', 1, 'month', 4, 'Enterprise',
    'For larger teams with provider controls, security, and service commitments.',
    'usd', NULL, 'stripe', 'contact_only',
    '["custom_limits","priority_support","provider_controls"]'::jsonb,
    '{}'::jsonb,
    now()
  )
ON CONFLICT (plan_key, version, billing_interval) DO NOTHING;
