-- =====================================================
-- FIX: Ensure Owner has can_manage_users = true
-- This allows removing admin from other users
-- =====================================================

-- First, let's see current admin status
SELECT email, role, can_manage_users, is_active
FROM user_profiles
WHERE can_manage_users = true OR role = 'owner'
ORDER BY role;

-- Fix: Ensure owner has can_manage_users = true
UPDATE user_profiles
SET can_manage_users = true
WHERE role = 'owner';

-- Also ensure Feri has correct permissions (without can_manage_users if you want)
-- Run this AFTER the owner fix above
UPDATE user_profiles
SET can_manage_users = false
WHERE email = 'ferisupriono@gama-group.co';

-- Verify the fix
SELECT email, role, can_manage_users, is_active
FROM user_profiles
WHERE role IN ('owner', 'finance_manager', 'marketing_manager')
ORDER BY role;
