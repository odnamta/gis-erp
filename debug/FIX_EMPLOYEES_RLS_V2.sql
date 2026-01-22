-- =====================================================
-- FIX V2: Simplified RLS for employees table
-- This version uses a more direct approach
-- =====================================================

-- Step 1: Temporarily disable RLS to verify data exists
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;

-- Check data exists
SELECT COUNT(*) as total_employees FROM employees;

-- Re-enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on employees
DROP POLICY IF EXISTS "employees_select_policy" ON employees;
DROP POLICY IF EXISTS "employees_insert_policy" ON employees;
DROP POLICY IF EXISTS "employees_update_policy" ON employees;
DROP POLICY IF EXISTS "employees_delete_policy" ON employees;
DROP POLICY IF EXISTS "employees_ops_view_policy" ON employees;
DROP POLICY IF EXISTS "Enable read access for all users" ON employees;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON employees;

-- Step 3: Create a simple, permissive SELECT policy for HR module
-- This allows all authenticated users to view employees
-- (We can make it more restrictive later once it's working)
CREATE POLICY "employees_select_all" ON employees
FOR SELECT TO authenticated
USING (true);  -- Allow all authenticated users to see employees

-- Step 4: Create INSERT policy for HR users
CREATE POLICY "employees_insert_hr" ON employees
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('hr', 'owner', 'director', 'sysadmin', 'finance_manager', 'operations_manager', 'marketing_manager')
    AND is_active = true
  )
);

-- Step 5: Create UPDATE policy for HR users
CREATE POLICY "employees_update_hr" ON employees
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('hr', 'owner', 'director', 'sysadmin', 'finance_manager', 'operations_manager', 'marketing_manager')
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('hr', 'owner', 'director', 'sysadmin', 'finance_manager', 'operations_manager', 'marketing_manager')
    AND is_active = true
  )
);

-- Step 6: Create DELETE policy (only owner/director)
CREATE POLICY "employees_delete_admin" ON employees
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'director')
    AND is_active = true
  )
);

-- Verify policies were created
SELECT policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY policyname;

-- Test: Count employees (should now work for any authenticated user)
SELECT COUNT(*) as visible_employees FROM employees;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'EMPLOYEES RLS FIXED (V2)';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Created policies:';
  RAISE NOTICE '  - employees_select_all: All authenticated can view';
  RAISE NOTICE '  - employees_insert_hr: HR roles can insert';
  RAISE NOTICE '  - employees_update_hr: HR roles can update';
  RAISE NOTICE '  - employees_delete_admin: Only owner/director can delete';
  RAISE NOTICE '';
  RAISE NOTICE 'Ask Rania to hard refresh (Cmd+Shift+R) and try again';
  RAISE NOTICE '========================================';
END $$;
