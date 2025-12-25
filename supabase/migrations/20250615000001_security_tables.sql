-- Security Hardening Tables Migration
-- Creates tables for rate limiting, security events, API keys, blocked IPs, and user sessions

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(200) NOT NULL,
  endpoint VARCHAR(200) NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, endpoint, window_start)
);

-- Security events
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  request_path VARCHAR(500),
  request_method VARCHAR(10),
  payload_sample TEXT,
  action_taken VARCHAR(100),
  investigated BOOLEAN DEFAULT FALSE,
  investigated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  investigation_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash VARCHAR(64) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  permissions JSONB DEFAULT '[]'::jsonb,
  rate_limit_per_minute INTEGER DEFAULT 60,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocked IPs
CREATE TABLE IF NOT EXISTS blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  blocked_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_token_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(64),
  is_active BOOLEAN DEFAULT TRUE,
  terminated_at TIMESTAMPTZ,
  terminated_reason VARCHAR(100)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Rate limit log indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit_log(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_log(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocked ON rate_limit_log(blocked_until) WHERE blocked_until IS NOT NULL;

-- Security events indexes
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address) WHERE ip_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_events_investigated ON security_events(investigated) WHERE investigated = FALSE;

-- API keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active, expires_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- Blocked IPs indexes
CREATE INDEX IF NOT EXISTS idx_blocked_ips_address ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_active ON blocked_ips(is_active, expires_at) WHERE is_active = TRUE;

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity DESC);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all security tables
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Rate limit log policies (service role only for writes, authenticated for reads)
CREATE POLICY "Service role can manage rate limits" ON rate_limit_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view rate limits" ON rate_limit_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- Security events policies (admins can view all, users can view their own)
CREATE POLICY "Admins can manage security events" ON security_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'owner')
    )
  );

CREATE POLICY "Users can view their own security events" ON security_events
  FOR SELECT USING (user_id = auth.uid());

-- API keys policies (users can manage their own keys, admins can view all)
CREATE POLICY "Users can manage their own API keys" ON api_keys
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all API keys" ON api_keys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'owner')
    )
  );

-- Blocked IPs policies (admins only)
CREATE POLICY "Admins can manage blocked IPs" ON blocked_ips
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'owner')
    )
  );

-- User sessions policies (users can view their own, admins can view all)
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can terminate their own sessions" ON user_sessions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all sessions" ON user_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'owner')
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to clean up expired rate limit entries
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limit_log
  WHERE window_start < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to clean up expired blocked IPs
CREATE OR REPLACE FUNCTION cleanup_expired_blocked_ips()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE blocked_ips
  SET is_active = FALSE
  WHERE is_active = TRUE
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE user_sessions
  SET is_active = FALSE,
      terminated_at = NOW(),
      terminated_reason = 'expired'
  WHERE is_active = TRUE
    AND expires_at < NOW();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Function to enforce session limit per user (max 5 active sessions)
CREATE OR REPLACE FUNCTION enforce_session_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_count INTEGER;
  oldest_session_id UUID;
BEGIN
  -- Count active sessions for this user
  SELECT COUNT(*) INTO session_count
  FROM user_sessions
  WHERE user_id = NEW.user_id
    AND is_active = TRUE
    AND id != NEW.id;
  
  -- If more than 4 existing sessions (plus new one = 5), terminate oldest
  WHILE session_count >= 5 LOOP
    SELECT id INTO oldest_session_id
    FROM user_sessions
    WHERE user_id = NEW.user_id
      AND is_active = TRUE
      AND id != NEW.id
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF oldest_session_id IS NOT NULL THEN
      UPDATE user_sessions
      SET is_active = FALSE,
          terminated_at = NOW(),
          terminated_reason = 'session_limit_exceeded'
      WHERE id = oldest_session_id;
      
      session_count := session_count - 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger to enforce session limit on insert
CREATE TRIGGER trigger_enforce_session_limit
  AFTER INSERT ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_session_limit();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE rate_limit_log IS 'Tracks API request rates per identifier and endpoint for rate limiting';
COMMENT ON TABLE security_events IS 'Logs security-related events for monitoring and investigation';
COMMENT ON TABLE api_keys IS 'Stores API keys for external integrations with hashed key values';
COMMENT ON TABLE blocked_ips IS 'Manages blocked IP addresses for security protection';
COMMENT ON TABLE user_sessions IS 'Tracks user sessions with secure token hashes';

COMMENT ON FUNCTION cleanup_expired_rate_limits() IS 'Removes rate limit entries older than 1 hour';
COMMENT ON FUNCTION cleanup_expired_blocked_ips() IS 'Deactivates expired IP blocks';
COMMENT ON FUNCTION cleanup_expired_sessions() IS 'Terminates expired user sessions';
COMMENT ON FUNCTION enforce_session_limit() IS 'Ensures max 5 active sessions per user';
