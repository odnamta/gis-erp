-- Migration: Create role_requests table for self-service role request system
-- Version: v0.84 - Role Request System
-- Requirements: 5.1, 5.2

-- Create the role_requests table
CREATE TABLE IF NOT EXISTS role_requests (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User information
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  
  -- Request details
  requested_role TEXT NOT NULL,
  requested_department TEXT,
  reason TEXT,
  
  -- Status with CHECK constraint (Requirements 5.2)
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Review information
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE role_requests IS 'Stores role access requests from new users for admin approval';
COMMENT ON COLUMN role_requests.status IS 'Request status: pending, approved, or rejected';
COMMENT ON COLUMN role_requests.reviewed_by IS 'Admin user who processed the request';
COMMENT ON COLUMN role_requests.admin_notes IS 'Notes from admin, typically rejection reason';

-- Create indexes for quick lookups (Requirements 5.1)
CREATE INDEX IF NOT EXISTS idx_role_requests_user_id ON role_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_role_requests_status ON role_requests(status);

-- Create composite index for common query pattern (pending requests)
CREATE INDEX IF NOT EXISTS idx_role_requests_status_created ON role_requests(status, created_at DESC);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_role_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_role_requests_updated_at
  BEFORE UPDATE ON role_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_role_requests_updated_at();

-- Enable Row Level Security
ALTER TABLE role_requests ENABLE ROW LEVEL SECURITY;
