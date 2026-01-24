-- Migration: Create RLS policies for role_requests table
-- Version: v0.84 - Role Request System
-- Task: 1.2 Create RLS policies for role_requests
-- Requirements: 5.3, 5.4

-- Note: RLS is already enabled on role_requests table (from migration 20260125000001)

-- Policy 1: Users can view their own requests
-- Allows any authenticated user to SELECT their own role request records
-- Requirements: 5.3
CREATE POLICY "Users can view own requests" ON role_requests
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Users can create requests for themselves
-- Allows any authenticated user to INSERT a role request for themselves only
-- Requirements: 5.3
CREATE POLICY "Users can create own requests" ON role_requests
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Admins can view all requests
-- Allows users with admin roles (owner, director, sysadmin) to SELECT all role requests
-- Requirements: 5.4
CREATE POLICY "Admins can view all requests" ON role_requests
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('owner', 'director', 'sysadmin')
    )
  );

-- Policy 4: Admins can update requests
-- Allows users with admin roles (owner, director, sysadmin) to UPDATE role requests
-- This is used for approving/rejecting requests
-- Requirements: 5.4
CREATE POLICY "Admins can update requests" ON role_requests
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('owner', 'director', 'sysadmin')
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Users can view own requests" ON role_requests IS 
  'Allows users to view their own role request records';
COMMENT ON POLICY "Users can create own requests" ON role_requests IS 
  'Allows users to create role requests for themselves only';
COMMENT ON POLICY "Admins can view all requests" ON role_requests IS 
  'Allows admin users (owner, director, sysadmin) to view all role requests';
COMMENT ON POLICY "Admins can update requests" ON role_requests IS 
  'Allows admin users (owner, director, sysadmin) to approve/reject role requests';
