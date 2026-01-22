-- =====================================================
-- FIX ALL HR-RELATED TABLES RLS
-- The employee query joins: departments, positions, employees (self-join)
-- ALL of these need proper RLS policies
-- =====================================================

-- =====================================================
-- STEP 1: FIX EMPLOYEES TABLE
-- =====================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "employees_select_policy" ON employees;
DROP POLICY IF EXISTS "employees_insert_policy" ON employees;
DROP POLICY IF EXISTS "employees_update_policy" ON employees;
DROP POLICY IF EXISTS "employees_delete_policy" ON employees;
DROP POLICY IF EXISTS "employees_ops_view_policy" ON employees;
DROP POLICY IF EXISTS "employees_select_all" ON employees;
DROP POLICY IF EXISTS "employees_insert_hr" ON employees;
DROP POLICY IF EXISTS "employees_update_hr" ON employees;
DROP POLICY IF EXISTS "employees_delete_admin" ON employees;
DROP POLICY IF EXISTS "Enable read access for all users" ON employees;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON employees;

-- Simple permissive policies
CREATE POLICY "employees_select" ON employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "employees_insert" ON employees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "employees_update" ON employees FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "employees_delete" ON employees FOR DELETE TO authenticated USING (true);

-- =====================================================
-- STEP 2: FIX DEPARTMENTS TABLE
-- =====================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "departments_select_policy" ON departments;
DROP POLICY IF EXISTS "departments_insert_policy" ON departments;
DROP POLICY IF EXISTS "departments_update_policy" ON departments;
DROP POLICY IF EXISTS "departments_delete_policy" ON departments;
DROP POLICY IF EXISTS "Enable read access for all users" ON departments;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON departments;

-- Simple permissive policies
CREATE POLICY "departments_select" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_insert" ON departments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "departments_update" ON departments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "departments_delete" ON departments FOR DELETE TO authenticated USING (true);

-- =====================================================
-- STEP 3: FIX POSITIONS TABLE
-- =====================================================

ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "positions_select_policy" ON positions;
DROP POLICY IF EXISTS "positions_insert_policy" ON positions;
DROP POLICY IF EXISTS "positions_update_policy" ON positions;
DROP POLICY IF EXISTS "positions_delete_policy" ON positions;
DROP POLICY IF EXISTS "Enable read access for all users" ON positions;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON positions;

-- Simple permissive policies
CREATE POLICY "positions_select" ON positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "positions_insert" ON positions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "positions_update" ON positions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "positions_delete" ON positions FOR DELETE TO authenticated USING (true);

-- =====================================================
-- STEP 4: FIX ATTENDANCE_RECORDS TABLE
-- =====================================================

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "attendance_records_select_policy" ON attendance_records;
DROP POLICY IF EXISTS "attendance_records_insert_policy" ON attendance_records;
DROP POLICY IF EXISTS "attendance_records_update_policy" ON attendance_records;
DROP POLICY IF EXISTS "attendance_records_delete_policy" ON attendance_records;
DROP POLICY IF EXISTS "Enable read access for all users" ON attendance_records;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON attendance_records;

-- Simple permissive policies
CREATE POLICY "attendance_select" ON attendance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "attendance_insert" ON attendance_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "attendance_update" ON attendance_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "attendance_delete" ON attendance_records FOR DELETE TO authenticated USING (true);

-- =====================================================
-- STEP 5: VERIFY DATA EXISTS
-- =====================================================

SELECT 'employees' as table_name, COUNT(*) as count FROM employees
UNION ALL
SELECT 'departments', COUNT(*) FROM departments
UNION ALL
SELECT 'positions', COUNT(*) FROM positions
UNION ALL
SELECT 'attendance_records', COUNT(*) FROM attendance_records;

-- =====================================================
-- STEP 6: VERIFY POLICIES CREATED
-- =====================================================

SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE tablename IN ('employees', 'departments', 'positions', 'attendance_records')
ORDER BY tablename, policyname;

-- =====================================================
-- STEP 7: TEST QUERY (similar to what the app does)
-- =====================================================

SELECT
  e.id,
  e.employee_code,
  e.full_name,
  d.department_name,
  p.position_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN positions p ON e.position_id = p.id
LIMIT 5;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ALL HR TABLES RLS FIXED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed tables:';
  RAISE NOTICE '  - employees';
  RAISE NOTICE '  - departments';
  RAISE NOTICE '  - positions';
  RAISE NOTICE '  - attendance_records';
  RAISE NOTICE '';
  RAISE NOTICE 'All policies are now PERMISSIVE';
  RAISE NOTICE 'Any authenticated user can access these tables';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Hard refresh browser (Cmd+Shift+R)';
  RAISE NOTICE '========================================';
END $$;
