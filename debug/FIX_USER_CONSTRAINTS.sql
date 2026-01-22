-- =====================================================
-- FIX USER CONSTRAINTS AND PERMISSIONS
-- Date: 2026-01-12
--
-- Issues:
-- 1. custom_dashboard constraint is outdated
-- 2. Admin permissions check incorrectly triggering
-- 3. Feri & Hutami need correct permissions
-- =====================================================

-- =====================================================
-- STEP 1: Fix custom_dashboard constraint
-- =====================================================

-- Drop old constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_custom_dashboard_check;

-- Add new constraint with ALL valid dashboard types
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_custom_dashboard_check
CHECK (custom_dashboard IN (
  -- New dashboard types
  'executive',
  'manager',
  'marketing',
  'admin_finance',
  'operations',
  'engineering',
  'hr',
  'hse',
  'sysadmin',
  'default',
  'agency',
  'customs',
  -- Legacy values (for backward compatibility)
  'owner',
  'admin',
  'ops',
  'finance',
  'sales',
  'viewer',
  'finance_manager',
  'marketing_manager',
  'operations_manager',
  'director'
));

-- =====================================================
-- STEP 2: Update Feri's profile (Finance Manager)
-- Should have: Administration & Finance access
-- =====================================================

UPDATE user_profiles
SET
  role = 'finance_manager',
  custom_dashboard = 'finance_manager',
  department_scope = ARRAY['finance', 'administration']::text[],
  -- Finance Manager full permissions
  can_see_revenue = true,
  can_see_profit = true,
  can_approve_pjo = true,
  can_manage_invoices = true,
  can_manage_users = true,
  can_create_pjo = true,
  can_fill_costs = true,
  is_active = true
WHERE email = 'ferisupriono@gama-group.co';

-- =====================================================
-- STEP 3: Update Hutami's profile (Marketing Manager)
-- Should have: Marketing & Engineering access
-- =====================================================

UPDATE user_profiles
SET
  role = 'marketing_manager',
  custom_dashboard = 'marketing_manager',
  department_scope = ARRAY['marketing', 'engineering']::text[],
  -- Marketing Manager permissions
  can_see_revenue = true,
  can_see_profit = true,  -- Enable profit visibility
  can_approve_pjo = true,
  can_manage_invoices = false,
  can_manage_users = false,
  can_create_pjo = true,
  can_fill_costs = true,
  is_active = true
WHERE email = 'hutamiarini@gama-group.co';

-- =====================================================
-- STEP 4: Ensure Owner has full permissions
-- (to fix "last admin" check issue)
-- =====================================================

UPDATE user_profiles
SET
  can_manage_users = true,
  can_see_revenue = true,
  can_see_profit = true,
  can_approve_pjo = true,
  can_manage_invoices = true,
  can_create_pjo = true,
  can_fill_costs = true
WHERE role = 'owner';

-- =====================================================
-- STEP 5: Verify the changes
-- =====================================================

DO $$
DECLARE
  admin_count INT;
BEGIN
  -- Count admins (users with can_manage_users = true)
  SELECT COUNT(*) INTO admin_count
  FROM user_profiles
  WHERE can_manage_users = true AND is_active = true;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIX COMPLETE - Verification:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total admin users: %', admin_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Updated profiles:';
END $$;

-- Show updated profiles
SELECT
  email,
  full_name,
  role,
  custom_dashboard,
  department_scope,
  can_see_revenue,
  can_see_profit,
  can_manage_users,
  can_create_pjo
FROM user_profiles
WHERE email IN ('ferisupriono@gama-group.co', 'hutamiarini@gama-group.co', 'dioatmando@gama-group.co')
ORDER BY role;
