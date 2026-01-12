-- =====================================================
-- FIX: Allow self-registration for user_profiles
-- Problem: New users can't create their own profile due to RLS
-- Solution: Allow users to create profile for THEMSELVES on first login
-- Date: 2026-01-12
-- =====================================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;

-- =====================================================
-- NEW INSERT Policy: Allow self-registration + admin creation
-- =====================================================
CREATE POLICY "user_profiles_insert_policy" ON user_profiles
FOR INSERT TO authenticated
WITH CHECK (
  -- CASE 1: User is creating their OWN profile (self-registration on first login)
  -- Allow if the user_id being inserted matches the authenticated user
  -- AND they don't already have a profile
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

  -- CASE 4: Pre-registered users (user_id is null) can be created by admins
  -- This is handled by CASE 2 and CASE 3 above
);

-- =====================================================
-- Verification
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'user_profiles INSERT policy fixed successfully:';
  RAISE NOTICE '  - CASE 1: Users can create their OWN profile on first login';
  RAISE NOTICE '  - CASE 2: can_manage_users permission holders can create any profile';
  RAISE NOTICE '  - CASE 3: owner/director/sysadmin roles can create any profile';
  RAISE NOTICE '  - Chicken-and-egg problem RESOLVED';
END $$;

-- Add helpful comment
COMMENT ON POLICY "user_profiles_insert_policy" ON user_profiles IS
'Allows: (1) Self-registration on first login, (2) Admins creating profiles for others, (3) Pre-registration by admins';
