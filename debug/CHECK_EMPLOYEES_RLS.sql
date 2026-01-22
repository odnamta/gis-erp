-- =====================================================
-- CHECK: Employees table RLS status
-- =====================================================

-- Step 1: Check if RLS is enabled on employees table
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'employees';

-- Step 2: List ALL policies on employees table
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY policyname;

-- Step 3: Check what employees exist (bypass RLS as superuser)
SELECT id, employee_code, full_name, status, created_at
FROM employees;

-- Step 4: Check Rania's user_id
SELECT user_id, email, role FROM user_profiles WHERE email LIKE '%rania%';

-- Step 5: Test if is_hr_user() function works
-- First check function exists
SELECT
  proname,
  prosrc
FROM pg_proc
WHERE proname = 'is_hr_user';

-- Step 6: Direct test - what would the policy return for Rania?
-- Get Rania's user_id first, then test the policy conditions
DO $$
DECLARE
  rania_user_id UUID;
  hr_check BOOLEAN;
BEGIN
  SELECT user_id INTO rania_user_id
  FROM user_profiles
  WHERE email LIKE '%rania%';

  -- Check if Rania would pass is_hr_user()
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = rania_user_id
    AND role IN ('hr', 'owner', 'director', 'sysadmin', 'finance_manager', 'operations_manager', 'marketing_manager')
    AND is_active = true
  ) INTO hr_check;

  RAISE NOTICE 'Rania user_id: %', rania_user_id;
  RAISE NOTICE 'Would pass is_hr_user() check: %', hr_check;
END $$;

-- Step 7: Check if there are any other policies that might be blocking
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'employees'
AND permissive = 'RESTRICTIVE';
