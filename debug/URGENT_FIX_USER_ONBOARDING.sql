-- =====================================================
-- URGENT FIX FOR USER ONBOARDING ISSUE
-- Date: 2026-01-12
--
-- PROBLEM: Users can login but don't get a user_profiles record
-- CAUSE: RLS policy blocks self-registration (chicken-and-egg)
--
-- SOLUTION: Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 0: Update role constraint to include all 15 roles
-- =====================================================

-- Drop old constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Add new constraint with ALL 15 roles
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
CHECK (role IN (
  'owner',
  'director',
  'marketing_manager',
  'finance_manager',
  'operations_manager',
  'sysadmin',
  'administration',
  'finance',
  'marketing',
  'ops',
  'engineer',
  'hr',
  'hse',
  'agency',
  'customs'
));

-- =====================================================
-- STEP 1: Fix the RLS Policy (Permanent Solution)
-- =====================================================

-- Drop existing INSERT policy that's causing the issue
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;

-- Create new INSERT policy that allows self-registration
CREATE POLICY "user_profiles_insert_policy" ON user_profiles
FOR INSERT TO authenticated
WITH CHECK (
  -- CASE 1: User is creating their OWN profile (self-registration on first login)
  (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
    )
  )

  -- CASE 2: Users with can_manage_users permission can create profiles for others
  OR EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid()
    AND up.can_manage_users = true
    AND up.is_active = true
  )

  -- CASE 3: Owner, director, sysadmin roles can create profiles for others
  OR EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid()
    AND up.role IN ('owner', 'director', 'sysadmin')
    AND up.is_active = true
  )
);

-- =====================================================
-- STEP 2: Fix Orphaned Accounts (Feri, Hutami, etc.)
-- =====================================================

DO $$
DECLARE
  orphan_record RECORD;
  assigned_role TEXT;
  profiles_created INT := 0;
BEGIN
  -- Loop through all auth users without profiles
  FOR orphan_record IN
    SELECT u.id, u.email, u.raw_user_meta_data->>'full_name' as full_name, u.created_at
    FROM auth.users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE up.id IS NULL
    AND u.email IS NOT NULL
    ORDER BY u.created_at
  LOOP
    -- Determine role based on email
    IF orphan_record.email = 'dioatmando@gama-group.co' THEN
      assigned_role := 'owner';
    ELSIF orphan_record.email = 'ferisupriono@gama-group.co' THEN
      assigned_role := 'finance_manager';
    ELSIF orphan_record.email = 'hutamiarini@gama-group.co' THEN
      assigned_role := 'marketing_manager';
    ELSIF orphan_record.email = 'rezapramana@gama-group.co' THEN
      assigned_role := 'operations_manager';
    ELSIF orphan_record.email LIKE '%@gama-group.co' THEN
      assigned_role := 'marketing';
    ELSE
      assigned_role := 'ops';
    END IF;

    -- Create profile
    INSERT INTO user_profiles (
      user_id,
      email,
      full_name,
      role,
      department_scope,
      custom_dashboard,
      can_see_revenue,
      can_see_profit,
      can_approve_pjo,
      can_manage_invoices,
      can_manage_users,
      can_create_pjo,
      can_fill_costs,
      is_active,
      last_login_at
    ) VALUES (
      orphan_record.id,
      orphan_record.email,
      orphan_record.full_name,
      assigned_role,
      '{}',
      CASE
        WHEN assigned_role = 'owner' THEN 'executive'
        WHEN assigned_role IN ('marketing_manager', 'finance_manager', 'operations_manager') THEN 'manager'
        ELSE 'default'
      END,
      -- can_see_revenue
      CASE WHEN assigned_role IN ('owner', 'director', 'finance_manager', 'marketing_manager') THEN true ELSE false END,
      -- can_see_profit
      CASE WHEN assigned_role IN ('owner', 'director', 'finance_manager') THEN true ELSE false END,
      -- can_approve_pjo
      CASE WHEN assigned_role IN ('owner', 'director', 'marketing_manager', 'finance_manager') THEN true ELSE false END,
      -- can_manage_invoices
      CASE WHEN assigned_role IN ('owner', 'director', 'finance_manager', 'administration') THEN true ELSE false END,
      -- can_manage_users
      CASE WHEN assigned_role IN ('owner', 'director', 'sysadmin', 'finance_manager') THEN true ELSE false END,
      -- can_create_pjo
      CASE WHEN assigned_role IN ('owner', 'director', 'marketing_manager', 'marketing', 'administration') THEN true ELSE false END,
      -- can_fill_costs
      true,
      -- is_active
      true,
      -- last_login_at
      NOW()
    );

    profiles_created := profiles_created + 1;
    RAISE NOTICE 'Created profile for % (%)', orphan_record.email, assigned_role;
  END LOOP;

  IF profiles_created = 0 THEN
    RAISE NOTICE 'No orphaned accounts found - all users already have profiles';
  ELSE
    RAISE NOTICE 'Total profiles created: %', profiles_created;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'USER ONBOARDING FIX COMPLETE';
  RAISE NOTICE '========================================';
END $$;
