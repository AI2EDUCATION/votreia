-- ============================================
-- VotrIA — Migration 002: Usage tracking
-- Table de suivi consommation par tenant/jour
-- ============================================

CREATE TABLE IF NOT EXISTS usage_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tasks_count INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_records_tenant ON usage_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_date ON usage_records(date);
CREATE INDEX IF NOT EXISTS idx_usage_records_tenant_date ON usage_records(tenant_id, date DESC);

-- RLS
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON usage_records
  FOR ALL USING (tenant_id = auth.tenant_id());

-- ============================================
-- Vue matérialisée pour stats mensuelles rapides
-- ============================================

CREATE OR REPLACE VIEW tenant_monthly_usage AS
SELECT
  tenant_id,
  date_trunc('month', date) AS month,
  SUM(tasks_count)::int AS total_tasks,
  SUM(tokens_used)::int AS total_tokens,
  SUM(cost_cents)::int AS total_cost_cents,
  COUNT(DISTINCT date)::int AS active_days
FROM usage_records
WHERE date >= date_trunc('month', CURRENT_DATE)
GROUP BY tenant_id, date_trunc('month', date);
