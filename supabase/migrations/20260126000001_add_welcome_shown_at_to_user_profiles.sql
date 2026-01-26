-- Migration: Add welcome_shown_at column to user_profiles
-- Version: v0.86 - Welcome Flow
-- Requirements: 1.1, 1.2

-- Add welcome_shown_at column to track when user dismissed the welcome modal (Requirement 1.1)
-- NULL indicates user has not yet seen the welcome modal (Requirement 1.2)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS welcome_shown_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.welcome_shown_at IS 'Timestamp when user dismissed the welcome modal. NULL means not yet shown.';
