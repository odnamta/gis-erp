-- =====================================================
-- TEST: Run the exact query the app uses
-- If this returns data, the RLS is working and it's a cache issue
-- =====================================================

-- Test 1: Simple count
SELECT COUNT(*) as employee_count FROM employees;

-- Test 2: The exact query the employee list uses
SELECT
  e.*,
  d.id as dept_id, d.department_code, d.department_name,
  p.id as pos_id, p.position_code, p.position_name, p.level,
  rm.full_name as manager_name, rm.employee_code as manager_code
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN positions p ON e.position_id = p.id
LEFT JOIN employees rm ON e.reporting_to = rm.id
ORDER BY e.employee_code;

-- Test 3: Check current policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('employees', 'departments', 'positions')
ORDER BY tablename, policyname;
