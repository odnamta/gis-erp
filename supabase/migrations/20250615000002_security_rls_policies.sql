-- =====================================================
-- Security Hardening: Role-Based RLS Policies
-- Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
-- =====================================================

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to check if user is admin/owner
CREATE OR REPLACE FUNCTION is_admin_or_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin', 'super_admin')
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to check if user is finance
CREATE OR REPLACE FUNCTION is_finance_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('finance', 'owner', 'admin', 'super_admin')
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to check if user is manager
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('manager', 'owner', 'admin', 'super_admin')
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to check if user is ops
CREATE OR REPLACE FUNCTION is_ops_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('ops', 'manager', 'owner', 'admin', 'super_admin')
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =====================================================
-- JOB_ORDERS RLS POLICIES
-- =====================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON job_orders;
DROP POLICY IF EXISTS "Allow read for anon" ON job_orders;
DROP POLICY IF EXISTS "Users can insert job orders" ON job_orders;
DROP POLICY IF EXISTS "Users can update job orders" ON job_orders;
DROP POLICY IF EXISTS "Users can view job orders" ON job_orders;

-- SELECT: Role-based access
-- Admin/Owner/Manager: All records
-- Finance: All records (financial data)
-- Ops: Records they submitted or are assigned to via PJO
-- Others: Records linked to PJOs they created
CREATE POLICY "job_orders_select_policy" ON job_orders
FOR SELECT TO authenticated
USING (
  -- Admin, Owner, Super Admin, Manager can see all
  is_admin_or_owner() OR is_manager()
  -- Finance can see all (financial records)
  OR is_finance_user()
  -- Ops can see JOs they submitted
  OR submitted_by = auth.uid()
  -- Users can see JOs linked to PJOs they created
  OR EXISTS (
    SELECT 1 FROM proforma_job_orders pjo
    WHERE pjo.id = job_orders.pjo_id
    AND pjo.created_by = auth.uid()
  )
);

-- INSERT: Admin, Owner, Manager, Ops can create
CREATE POLICY "job_orders_insert_policy" ON job_orders
FOR INSERT TO authenticated
WITH CHECK (
  is_admin_or_owner() OR is_manager() OR is_ops_user()
);

-- UPDATE: Admin, Owner, Manager can update all; Ops can update their own
CREATE POLICY "job_orders_update_policy" ON job_orders
FOR UPDATE TO authenticated
USING (
  is_admin_or_owner() OR is_manager()
  OR submitted_by = auth.uid()
)
WITH CHECK (
  is_admin_or_owner() OR is_manager()
  OR submitted_by = auth.uid()
);

-- DELETE: Only Admin/Owner can delete
CREATE POLICY "job_orders_delete_policy" ON job_orders
FOR DELETE TO authenticated
USING (
  is_admin_or_owner()
);

-- =====================================================
-- INVOICES RLS POLICIES
-- =====================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON invoices;
DROP POLICY IF EXISTS "Allow read for anon" ON invoices;

-- SELECT: Role-based access
-- Admin/Owner/Manager: All records
-- Finance: All records (financial data)
-- Others: Invoices linked to JOs they have access to
CREATE POLICY "invoices_select_policy" ON invoices
FOR SELECT TO authenticated
USING (
  -- Admin, Owner, Super Admin, Manager can see all
  is_admin_or_owner() OR is_manager()
  -- Finance can see all (financial records)
  OR is_finance_user()
  -- Users can see invoices linked to JOs they submitted
  OR EXISTS (
    SELECT 1 FROM job_orders jo
    WHERE jo.id = invoices.jo_id
    AND jo.submitted_by = auth.uid()
  )
  -- Users can see invoices linked to PJOs they created
  OR EXISTS (
    SELECT 1 FROM job_orders jo
    JOIN proforma_job_orders pjo ON pjo.id = jo.pjo_id
    WHERE jo.id = invoices.jo_id
    AND pjo.created_by = auth.uid()
  )
);

-- INSERT: Admin, Owner, Finance can create invoices
CREATE POLICY "invoices_insert_policy" ON invoices
FOR INSERT TO authenticated
WITH CHECK (
  is_admin_or_owner() OR is_finance_user()
);

-- UPDATE: Admin, Owner, Finance can update
CREATE POLICY "invoices_update_policy" ON invoices
FOR UPDATE TO authenticated
USING (
  is_admin_or_owner() OR is_finance_user()
)
WITH CHECK (
  is_admin_or_owner() OR is_finance_user()
);

-- DELETE: Only Admin/Owner can delete
CREATE POLICY "invoices_delete_policy" ON invoices
FOR DELETE TO authenticated
USING (
  is_admin_or_owner()
);

-- =====================================================
-- EMPLOYEES RLS POLICIES (enhance existing)
-- =====================================================

-- Add policy for ops to see employees on their jobs via asset_assignments
DROP POLICY IF EXISTS "employees_ops_view_policy" ON employees;
CREATE POLICY "employees_ops_view_policy" ON employees
FOR SELECT TO authenticated
USING (
  -- Ops can see employees assigned to jobs they're working on
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'ops'
  )
  AND EXISTS (
    SELECT 1 FROM asset_assignments aa
    JOIN job_orders jo ON jo.id = aa.job_order_id
    WHERE aa.employee_id = employees.id
    AND jo.submitted_by = auth.uid()
  )
);

-- =====================================================
-- Add RLS to security tables
-- =====================================================

-- Enable RLS on security tables
ALTER TABLE IF EXISTS rate_limit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_sessions ENABLE ROW LEVEL SECURITY;

-- Security tables policies: Only admin/owner can access
DROP POLICY IF EXISTS "security_events_admin_policy" ON security_events;
CREATE POLICY "security_events_admin_policy" ON security_events
FOR ALL TO authenticated
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "blocked_ips_admin_policy" ON blocked_ips;
CREATE POLICY "blocked_ips_admin_policy" ON blocked_ips
FOR ALL TO authenticated
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "rate_limit_log_admin_policy" ON rate_limit_log;
CREATE POLICY "rate_limit_log_admin_policy" ON rate_limit_log
FOR ALL TO authenticated
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());

-- API keys: Users can see their own, admin can see all
DROP POLICY IF EXISTS "api_keys_user_policy" ON api_keys;
DROP POLICY IF EXISTS "api_keys_insert_policy" ON api_keys;
DROP POLICY IF EXISTS "api_keys_update_policy" ON api_keys;
DROP POLICY IF EXISTS "api_keys_delete_policy" ON api_keys;
DROP POLICY IF EXISTS "api_keys_select_policy" ON api_keys;

CREATE POLICY "api_keys_select_policy" ON api_keys
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR is_admin_or_owner()
);

CREATE POLICY "api_keys_insert_policy" ON api_keys
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() OR is_admin_or_owner()
);

CREATE POLICY "api_keys_update_policy" ON api_keys
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() OR is_admin_or_owner()
)
WITH CHECK (
  user_id = auth.uid() OR is_admin_or_owner()
);

CREATE POLICY "api_keys_delete_policy" ON api_keys
FOR DELETE TO authenticated
USING (
  user_id = auth.uid() OR is_admin_or_owner()
);

-- User sessions: Users can see their own, admin can see all
DROP POLICY IF EXISTS "user_sessions_user_policy" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_insert_policy" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_update_policy" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_delete_policy" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_select_policy" ON user_sessions;

CREATE POLICY "user_sessions_select_policy" ON user_sessions
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR is_admin_or_owner()
);

CREATE POLICY "user_sessions_insert_policy" ON user_sessions
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "user_sessions_update_policy" ON user_sessions
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() OR is_admin_or_owner()
)
WITH CHECK (
  user_id = auth.uid() OR is_admin_or_owner()
);

CREATE POLICY "user_sessions_delete_policy" ON user_sessions
FOR DELETE TO authenticated
USING (
  user_id = auth.uid() OR is_admin_or_owner()
);
