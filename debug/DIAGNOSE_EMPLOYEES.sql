-- =====================================================
-- DIAGNOSE: Why employees not showing in list
-- =====================================================

-- Step 1: Check what employees exist (as superuser, bypassing RLS)
SELECT id, employee_code, full_name, status, created_at
FROM employees
ORDER BY created_at DESC;

-- Step 2: Check RLS policies on employees table
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'employees';

-- Step 3: Get Rania's user_id
SELECT id, user_id, email, role, is_active
FROM user_profiles
WHERE email LIKE '%rania%';

-- Step 4: Test what Rania can see (simulate her session)
-- Replace USER_ID_HERE with Rania's user_id from step 3
-- SET LOCAL ROLE authenticated;
-- SET LOCAL "request.jwt.claim.sub" = 'USER_ID_HERE';
-- SELECT * FROM employees;

-- Step 5: Check if is_hr_user() function exists and works
SELECT is_hr_user();

-- Step 6: Check if there's any filter on employees
-- Look for is_active or status filters
SELECT
  id,
  employee_code,
  full_name,
  status,
  CASE WHEN status = 'active' THEN 'YES' ELSE 'NO' END as is_active_status
FROM employees;

-- Step 7: Verify the policy was created correctly
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'employees'
AND policyname = 'employees_select_policy';
