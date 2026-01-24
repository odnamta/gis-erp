-- Migration: Add Terms & Conditions tracking columns to user_profiles
-- Version: v0.85 - Terms & Conditions System
-- Requirements: 1.1, 1.2, 1.3

-- Add tc_accepted_at column to track when user accepted T&C (Requirement 1.1)
-- NULL indicates user has not accepted T&C (Requirement 1.3)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS tc_accepted_at TIMESTAMPTZ DEFAULT NULL;

-- Add tc_version column to track which version of T&C was accepted (Requirement 1.2)
-- NULL indicates user has not accepted any T&C version
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS tc_version TEXT DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.tc_accepted_at IS 'Timestamp when user accepted Terms & Conditions. NULL means not accepted.';
COMMENT ON COLUMN user_profiles.tc_version IS 'Version of Terms & Conditions accepted by user (e.g., "1.0.0"). NULL means not accepted.';

-- Create index for quick lookup of users who need to accept T&C
-- This helps with queries that check for NULL tc_accepted_at or outdated tc_version
CREATE INDEX IF NOT EXISTS idx_user_profiles_tc_version ON user_profiles(tc_version);
