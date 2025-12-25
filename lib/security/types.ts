/**
 * Security Module Types
 * 
 * TypeScript type definitions for the security hardening features
 * including rate limiting, input validation, session management,
 * API key management, security event logging, and IP blocking.
 */

// =============================================================================
// Database Entity Types (matching Supabase schema)
// =============================================================================

/**
 * Rate limit log entry from database
 */
export interface RateLimitLog {
  id: string;
  identifier: string;
  endpoint: string;
  request_count: number;
  window_start: string;
  blocked_until: string | null;
}

/**
 * Security event severity levels
 */
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Security event types
 */
export type SecurityEventType =
  | 'brute_force'
  | 'sql_injection_attempt'
  | 'xss_attempt'
  | 'unauthorized_access'
  | 'suspicious_activity'
  | 'account_lockout'
  | 'rate_limit_exceeded'
  | 'invalid_api_key'
  | 'session_hijack_attempt'
  | 'path_traversal_attempt'
  | 'command_injection_attempt'
  | 'invalid_file_upload';

/**
 * Security event record from database
 */
export interface SecurityEvent {
  id: string;
  timestamp: string;
  event_type: SecurityEventType;
  severity: SecuritySeverity;
  description: string;
  ip_address: string | null;
  user_agent: string | null;
  user_id: string | null;
  request_path: string | null;
  request_method: string | null;
  payload_sample: string | null;
  action_taken: string | null;
  investigated: boolean;
  investigated_by: string | null;
  investigation_notes: string | null;
}

/**
 * API key record from database
 */
export interface APIKey {
  id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  description: string | null;
  user_id: string | null;
  permissions: string[];
  rate_limit_per_minute: number;
  expires_at: string | null;
  last_used_at: string | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
}

/**
 * Blocked IP record from database
 */
export interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string;
  blocked_at: string;
  blocked_by: string | null;
  expires_at: string | null;
  is_active: boolean;
}

/**
 * User session record from database
 */
export interface UserSession {
  id: string;
  user_id: string;
  session_token_hash: string;
  created_at: string;
  expires_at: string;
  last_activity: string;
  ip_address: string | null;
  user_agent: string | null;
  device_fingerprint: string | null;
  is_active: boolean;
  terminated_at: string | null;
  terminated_reason: string | null;
}

// =============================================================================
// Rate Limiter Types
// =============================================================================

/**
 * Configuration for rate limiting
 */
export interface RateLimitConfig {
  /** Maximum requests allowed per window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Duration to block after exceeding limit (in seconds) */
  blockDurationSeconds: number;
}

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** When the rate limit window resets */
  resetAt: Date;
  /** Whether the identifier is currently blocked */
  blocked: boolean;
}

/**
 * Default rate limit configurations for different endpoints
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  default: { limit: 100, windowSeconds: 60, blockDurationSeconds: 300 },
  auth: { limit: 5, windowSeconds: 60, blockDurationSeconds: 900 },
  api: { limit: 60, windowSeconds: 60, blockDurationSeconds: 300 },
  upload: { limit: 10, windowSeconds: 60, blockDurationSeconds: 600 },
};

// =============================================================================
// Input Validator Types
// =============================================================================

/**
 * Types of threats that can be detected
 */
export type ThreatType =
  | 'sql_injection'
  | 'xss'
  | 'path_traversal'
  | 'command_injection';

/**
 * Detected threat information
 */
export interface ThreatDetection {
  /** Type of threat detected */
  type: ThreatType;
  /** Pattern that matched */
  pattern: string;
  /** Severity of the threat */
  severity: SecuritySeverity;
}

/**
 * Result of input validation
 */
export interface ValidationResult {
  /** Whether the input is valid (no threats detected) */
  valid: boolean;
  /** Sanitized version of the input */
  sanitizedValue?: string;
  /** List of detected threats */
  threats: ThreatDetection[];
}

/**
 * Configuration for file upload validation
 */
export interface FileValidationConfig {
  /** Allowed MIME types */
  allowedTypes: string[];
  /** Maximum file size in bytes */
  maxSizeBytes: number;
  /** Whether to scan for malware (future feature) */
  scanForMalware: boolean;
}

/**
 * Default file validation configuration
 */
export const DEFAULT_FILE_VALIDATION: FileValidationConfig = {
  allowedTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  scanForMalware: false,
};

// =============================================================================
// Security Event Logger Types
// =============================================================================

/**
 * Parameters for logging a security event
 */
export interface LogSecurityEventParams {
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  requestPath?: string;
  requestMethod?: string;
  payloadSample?: string;
  actionTaken?: string;
}

/**
 * Parameters for marking an event as investigated
 */
export interface InvestigateEventParams {
  eventId: string;
  investigatedBy: string;
  notes: string;
}

// =============================================================================
// API Key Manager Types
// =============================================================================

/**
 * Parameters for generating a new API key
 */
export interface GenerateAPIKeyParams {
  name: string;
  description?: string;
  userId: string;
  permissions: string[];
  rateLimitPerMinute?: number;
  expiresAt?: Date;
}

/**
 * Result of API key generation
 */
export interface GenerateAPIKeyResult {
  /** The raw API key (only shown once) */
  key: string;
  /** The stored key data */
  keyData: APIKey;
}

/**
 * Result of API key validation
 */
export interface APIKeyValidationResult {
  /** Whether the key is valid */
  valid: boolean;
  /** User ID associated with the key */
  userId?: string;
  /** Permissions granted to the key */
  permissions?: string[];
  /** Rate limit for this key */
  rateLimitPerMinute?: number;
  /** Reason for invalid key */
  invalidReason?: 'not_found' | 'expired' | 'revoked' | 'invalid_format';
}

/**
 * Available API key permissions
 */
export const API_KEY_PERMISSIONS = [
  'read:customers',
  'write:customers',
  'read:projects',
  'write:projects',
  'read:quotations',
  'write:quotations',
  'read:pjo',
  'write:pjo',
  'read:jo',
  'write:jo',
  'read:invoices',
  'write:invoices',
  'read:reports',
  'admin:all',
] as const;

export type APIKeyPermission = (typeof API_KEY_PERMISSIONS)[number];

// =============================================================================
// Session Manager Types
// =============================================================================

/**
 * Context information for session creation
 */
export interface SessionContext {
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
}

/**
 * Result of session validation
 */
export interface SessionValidationResult {
  /** Whether the session is valid */
  valid: boolean;
  /** Session data if valid */
  session?: UserSession;
  /** Reason for invalid session */
  invalidReason?: 'not_found' | 'expired' | 'terminated' | 'invalid_format';
}

/**
 * Session configuration
 */
export interface SessionConfig {
  /** Session duration in seconds */
  sessionDurationSeconds: number;
  /** Maximum active sessions per user */
  maxSessionsPerUser: number;
  /** Inactivity timeout in seconds */
  inactivityTimeoutSeconds: number;
}

/**
 * Default session configuration
 */
export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  sessionDurationSeconds: 24 * 60 * 60, // 24 hours
  maxSessionsPerUser: 5,
  inactivityTimeoutSeconds: 30 * 60, // 30 minutes
};

// =============================================================================
// IP Blocker Types
// =============================================================================

/**
 * Parameters for blocking an IP address
 */
export interface BlockIPParams {
  ipAddress: string;
  reason: string;
  blockedBy?: string;
  /** Duration in seconds (null for permanent) */
  durationSeconds?: number;
}

/**
 * Result of IP block check
 */
export interface IPBlockCheckResult {
  /** Whether the IP is blocked */
  blocked: boolean;
  /** Block details if blocked */
  blockInfo?: BlockedIP;
}

// =============================================================================
// Security Middleware Types
// =============================================================================

/**
 * Configuration for security middleware
 */
export interface SecurityMiddlewareConfig {
  /** Enable rate limiting */
  rateLimitEnabled: boolean;
  /** Enable input validation */
  inputValidationEnabled: boolean;
  /** Enable security headers */
  securityHeadersEnabled: boolean;
  /** Enable IP blocking check */
  ipBlockingEnabled: boolean;
}

/**
 * Default security middleware configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityMiddlewareConfig = {
  rateLimitEnabled: true,
  inputValidationEnabled: true,
  securityHeadersEnabled: true,
  ipBlockingEnabled: true,
};

/**
 * Security headers to be applied
 */
export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'Strict-Transport-Security': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
}

/**
 * Default security headers
 */
export const DEFAULT_SECURITY_HEADERS: SecurityHeaders = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// =============================================================================
// Database Insert/Update Types
// =============================================================================

/**
 * Type for inserting a new rate limit log entry
 */
export interface RateLimitLogInsert {
  identifier: string;
  endpoint: string;
  request_count?: number;
  window_start?: string;
  blocked_until?: string | null;
}

/**
 * Type for inserting a new security event
 */
export interface SecurityEventInsert {
  event_type: SecurityEventType;
  severity: SecuritySeverity;
  description: string;
  ip_address?: string | null;
  user_agent?: string | null;
  user_id?: string | null;
  request_path?: string | null;
  request_method?: string | null;
  payload_sample?: string | null;
  action_taken?: string | null;
}

/**
 * Type for inserting a new API key
 */
export interface APIKeyInsert {
  key_hash: string;
  key_prefix: string;
  name: string;
  description?: string | null;
  user_id?: string | null;
  permissions?: string[];
  rate_limit_per_minute?: number;
  expires_at?: string | null;
}

/**
 * Type for inserting a new blocked IP
 */
export interface BlockedIPInsert {
  ip_address: string;
  reason: string;
  blocked_by?: string | null;
  expires_at?: string | null;
}

/**
 * Type for inserting a new user session
 */
export interface UserSessionInsert {
  user_id: string;
  session_token_hash: string;
  expires_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  device_fingerprint?: string | null;
}
