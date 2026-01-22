-- =====================================================
-- CHECK: Are there RESTRICTIVE policies blocking access?
-- =====================================================

-- Check for RESTRICTIVE policies (these override PERMISSIVE ones)
SELECT
  tablename,
  policyname,
  permissive,
  cmd,
  qual::text as using_clause
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY permissive DESC, policyname;

-- The "permissive" column will show:
-- 'PERMISSIVE' = allows access (ORed with other permissive policies)
-- 'RESTRICTIVE' = restricts access (ANDed, must pass ALL restrictive policies)

-- If you see any RESTRICTIVE policy, that might be the problem!
