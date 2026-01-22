-- =====================================================
-- FIX: RLS Policies for HR Module
-- Problem: HR users cannot see employees they create
-- Cause: RLS policies only check for 'owner', 'admin', 'super_admin', 'ops'
--        but not 'hr', 'finance_manager', 'marketing_manager', etc.
-- =====================================================

-- =====================================================
-- STEP 1: Create helper function for HR access
-- =====================================================

-- Helper function to check if user has HR access
CREATE OR REPLACE FUNCTION is_hr_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('hr', 'owner', 'director', 'sysadmin', 'finance_manager', 'operations_manager', 'marketing_manager')
    AND is_active = true
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Update is_admin_or_owner to include all admin-level roles
CREATE OR REPLACE FUNCTION is_admin_or_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'director', 'sysadmin', 'finance_manager', 'operations_manager', 'marketing_manager')
    AND is_active = true
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 2: Fix employees table RLS policies
-- =====================================================

-- First, check if RLS is enabled on employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "employees_ops_view_policy" ON employees;
DROP POLICY IF EXISTS "employees_select_policy" ON employees;
DROP POLICY IF EXISTS "employees_insert_policy" ON employees;
DROP POLICY IF EXISTS "employees_update_policy" ON employees;
DROP POLICY IF EXISTS "employees_delete_policy" ON employees;

-- SELECT: HR, managers, and admins can see all employees
CREATE POLICY "employees_select_policy" ON employees
FOR SELECT TO authenticated
USING (
  is_admin_or_owner()
  OR is_hr_user()
  -- Ops can see employees assigned to their jobs
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'ops'
    AND EXISTS (
      SELECT 1 FROM asset_assignments aa
      JOIN job_orders jo ON jo.id = aa.job_order_id
      WHERE aa.employee_id = employees.id
      AND jo.submitted_by = auth.uid()
    )
  )
);

-- INSERT: HR and admins can create employees
CREATE POLICY "employees_insert_policy" ON employees
FOR INSERT TO authenticated
WITH CHECK (
  is_admin_or_owner()
  OR is_hr_user()
);

-- UPDATE: HR and admins can update employees
CREATE POLICY "employees_update_policy" ON employees
FOR UPDATE TO authenticated
USING (
  is_admin_or_owner()
  OR is_hr_user()
)
WITH CHECK (
  is_admin_or_owner()
  OR is_hr_user()
);

-- DELETE: Only owner/director can delete
CREATE POLICY "employees_delete_policy" ON employees
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'director')
    AND is_active = true
  )
);

-- =====================================================
-- STEP 3: Fix departments table RLS policies
-- =====================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_select_policy" ON departments;
DROP POLICY IF EXISTS "departments_insert_policy" ON departments;
DROP POLICY IF EXISTS "departments_update_policy" ON departments;

-- All authenticated users can view departments
CREATE POLICY "departments_select_policy" ON departments
FOR SELECT TO authenticated
USING (true);

-- Only admin/HR can modify departments
CREATE POLICY "departments_insert_policy" ON departments
FOR INSERT TO authenticated
WITH CHECK (is_admin_or_owner() OR is_hr_user());

CREATE POLICY "departments_update_policy" ON departments
FOR UPDATE TO authenticated
USING (is_admin_or_owner() OR is_hr_user())
WITH CHECK (is_admin_or_owner() OR is_hr_user());

-- =====================================================
-- STEP 4: Fix positions table RLS policies
-- =====================================================

ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "positions_select_policy" ON positions;
DROP POLICY IF EXISTS "positions_insert_policy" ON positions;
DROP POLICY IF EXISTS "positions_update_policy" ON positions;

-- All authenticated users can view positions
CREATE POLICY "positions_select_policy" ON positions
FOR SELECT TO authenticated
USING (true);

-- Only admin/HR can modify positions
CREATE POLICY "positions_insert_policy" ON positions
FOR INSERT TO authenticated
WITH CHECK (is_admin_or_owner() OR is_hr_user());

CREATE POLICY "positions_update_policy" ON positions
FOR UPDATE TO authenticated
USING (is_admin_or_owner() OR is_hr_user())
WITH CHECK (is_admin_or_owner() OR is_hr_user());

-- =====================================================
-- STEP 5: Verify Rania's role
-- =====================================================

-- Check Rania's current role
SELECT email, role, is_active FROM user_profiles WHERE email LIKE '%rania%';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'HR RLS POLICIES FIXED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'What was fixed:';
  RAISE NOTICE '  1. is_hr_user() function now includes hr role';
  RAISE NOTICE '  2. is_admin_or_owner() updated for new roles';
  RAISE NOTICE '  3. employees table: HR can now SELECT, INSERT, UPDATE';
  RAISE NOTICE '  4. departments table: All can view, HR can modify';
  RAISE NOTICE '  5. positions table: All can view, HR can modify';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Ask Rania to refresh and try again';
  RAISE NOTICE '========================================';
END $$;
