-- =====================================================
-- v0.84: Allow NULL role for new users (Role Request System)
-- Date: 2026-01-25
--
-- PURPOSE: Enable self-service role request flow
-- New users will have NULL role until admin approves their request
-- Middleware redirects NULL-role users to /request-access
-- =====================================================

-- Drop existing role constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Add new constraint that allows NULL OR valid role values
-- NULL = new user pending role request approval
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
CHECK (
  role IS NULL 
  OR role IN (
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
  )
);

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.role IS 'User role for RBAC. NULL indicates new user pending role request approval.';
