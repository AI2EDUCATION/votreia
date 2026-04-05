-- ============================================
-- VotrIA — Migration initiale
-- Multi-tenant RLS + schéma complet
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper function: extract tenant_id from JWT
-- ============================================
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid,
    (SELECT tenant_id FROM users WHERE id = auth.uid())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- RLS POLICIES — Tenant isolation
-- ============================================

-- tenants: users can only see their own tenant
CREATE POLICY tenant_isolation ON tenants
  FOR ALL USING (id = auth.tenant_id());

-- users: isolation by tenant_id
CREATE POLICY tenant_isolation ON users
  FOR ALL USING (tenant_id = auth.tenant_id());

-- agents: isolation by tenant_id
CREATE POLICY tenant_isolation ON agents
  FOR ALL USING (tenant_id = auth.tenant_id());

-- tasks: isolation by tenant_id
CREATE POLICY tenant_isolation ON tasks
  FOR ALL USING (tenant_id = auth.tenant_id());

-- email_accounts: isolation by tenant_id
CREATE POLICY tenant_isolation ON email_accounts
  FOR ALL USING (tenant_id = auth.tenant_id());

-- documents: isolation by tenant_id
CREATE POLICY tenant_isolation ON documents
  FOR ALL USING (tenant_id = auth.tenant_id());

-- leads: isolation by tenant_id
CREATE POLICY tenant_isolation ON leads
  FOR ALL USING (tenant_id = auth.tenant_id());

-- agent_logs: isolation by tenant_id
CREATE POLICY tenant_isolation ON agent_logs
  FOR ALL USING (tenant_id = auth.tenant_id());

-- subscriptions: isolation by tenant_id
CREATE POLICY tenant_isolation ON subscriptions
  FOR ALL USING (tenant_id = auth.tenant_id());

-- notifications: isolation by tenant_id + user can see own
CREATE POLICY tenant_isolation ON notifications
  FOR ALL USING (tenant_id = auth.tenant_id());

-- audit_logs: isolation by tenant_id (admin only via app logic)
CREATE POLICY tenant_isolation ON audit_logs
  FOR ALL USING (tenant_id = auth.tenant_id());

-- ============================================
-- Service role bypass (for agents/webhooks)
-- ============================================
-- The service_role key bypasses RLS automatically in Supabase.
-- Agent functions and webhooks use this key for cross-tenant operations.

-- ============================================
-- Indexes pour performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_created ON tasks (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_status ON tasks (agent_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON leads (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_logs_tenant_created ON agent_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, read);

-- ============================================
-- Updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
