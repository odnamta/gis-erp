-- =====================================================
-- DIAGNOSE: Why is owner not counted as admin?
-- =====================================================

-- Step 1: See ALL users and their can_manage_users status
SELECT
  email,
  role,
  can_manage_users,
  is_active,
  CASE WHEN can_manage_users = true AND is_active = true THEN 'YES - ADMIN' ELSE 'NO' END as is_admin
FROM user_profiles
ORDER BY role, email;

-- Step 2: Count current admins (this is what the code does)
SELECT COUNT(*) as admin_count
FROM user_profiles
WHERE can_manage_users = true AND is_active = true;

-- =====================================================
-- FIX: Force owner to have can_manage_users = true
-- =====================================================

-- Update owner by email (more reliable)
UPDATE user_profiles
SET
  can_manage_users = true,
  is_active = true
WHERE email = 'dioatmando@gama-group.co';

-- Also update by role as backup
UPDATE user_profiles
SET
  can_manage_users = true,
  is_active = true
WHERE role = 'owner';

-- =====================================================
-- VERIFY: Check the fix worked
-- =====================================================

SELECT
  email,
  role,
  can_manage_users,
  is_active,
  CASE WHEN can_manage_users = true AND is_active = true THEN 'YES - ADMIN' ELSE 'NO' END as is_admin
FROM user_profiles
WHERE role = 'owner' OR can_manage_users = true
ORDER BY role;

-- Now you should see:
-- dioatmando@gama-group.co | owner | true | true | YES - ADMIN
-- hutamiarini@gama-group.co | marketing_manager | true | true | YES - ADMIN (if still on)

-- After this, you can turn off Hutami's can_manage_users from the UI
