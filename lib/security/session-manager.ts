/**
 * Session Manager
 *
 * Provides secure session management functionality including session creation,
 * validation, termination, and session limit enforcement. Uses cryptographically
 * secure tokens and stores only hashes in the database.
 *
 * @module lib/security/session-manager
 */

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  UserSession,
  SessionContext,
  SessionValidationResult,
  SessionConfig,
  UserSessionInsert,
  DEFAULT_SESSION_CONFIG,
} from './types';
import { logEvent } from './event-logger';

// Helper type for untyped Supabase queries (security tables not yet in generated types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// =============================================================================
// Constants
// =============================================================================

/** Length of the session token in bytes */
const TOKEN_LENGTH = 32;

/** Prefix for session tokens */
const TOKEN_PREFIX = 'sess_';

/** Default session configuration */
const DEFAULT_CONFIG: SessionConfig = {
  sessionDurationSeconds: 24 * 60 * 60, // 24 hours
  maxSessionsPerUser: 5,
  inactivityTimeoutSeconds: 30 * 60, // 30 minutes
};

// =============================================================================
// Session Creation Functions
// =============================================================================

/**
 * Creates a new session for a user with secure token generation
 *
 * @param userId - The user ID to create session for
 * @param context - Session context (IP, user agent, fingerprint)
 * @param config - Optional session configuration
 * @returns The session token (shown once) or error
 */
export async function createSession(
  userId: string,
  context: SessionContext,
  config: SessionConfig = DEFAULT_CONFIG
): Promise<{ token: string | null; session: UserSession | null; error: string | null }> {
  if (!userId) {
    return { token: null, session: null, error: 'User ID is required' };
  }

  if (!context.ipAddress || !context.userAgent) {
    return { token: null, session: null, error: 'IP address and user agent are required' };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  // Enforce session limit - invalidate oldest sessions if needed
  await enforceSessionLimit(supabase, userId, config.maxSessionsPerUser);

  // Generate secure session token
  const tokenString = generateSessionToken();
  const tokenHash = await hashToken(tokenString);

  // Calculate expiration
  const expiresAt = new Date(Date.now() + config.sessionDurationSeconds * 1000);

  const sessionData: UserSessionInsert = {
    user_id: userId,
    session_token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
    ip_address: context.ipAddress,
    user_agent: context.userAgent,
    device_fingerprint: context.deviceFingerprint || null,
  };

  const { data, error } = await supabase
    .from('user_sessions')
    .insert(sessionData)
    .select()
    .single();

  if (error) {
    console.error('Failed to create session:', error);
    return { token: null, session: null, error: error.message };
  }

  return {
    token: tokenString,
    session: data as UserSession,
    error: null,
  };
}

/**
 * Creates a session without database access (for testing purposes)
 *
 * @param userId - The user ID
 * @param context - Session context
 * @param config - Session configuration
 * @returns The session token and mock session data
 */
export async function createSessionSync(
  userId: string,
  context: SessionContext,
  config: SessionConfig = DEFAULT_CONFIG
): Promise<{ token: string; session: UserSession; tokenHash: string }> {
  const tokenString = generateSessionToken();
  const tokenHash = await hashToken(tokenString);
  const expiresAt = new Date(Date.now() + config.sessionDurationSeconds * 1000);

  const session: UserSession = {
    id: crypto.randomUUID(),
    user_id: userId,
    session_token_hash: tokenHash,
    created_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    last_activity: new Date().toISOString(),
    ip_address: context.ipAddress,
    user_agent: context.userAgent,
    device_fingerprint: context.deviceFingerprint || null,
    is_active: true,
    terminated_at: null,
    terminated_reason: null,
  };

  return { token: tokenString, session, tokenHash };
}

// =============================================================================
// Session Validation Functions
// =============================================================================

/**
 * Validates a session token and returns session data
 *
 * @param sessionToken - The session token to validate
 * @returns Validation result with session data if valid
 */
export async function validateSession(
  sessionToken: string
): Promise<SessionValidationResult> {
  // Check token format
  if (!sessionToken || !sessionToken.startsWith(TOKEN_PREFIX)) {
    return {
      valid: false,
      invalidReason: 'invalid_format',
    };
  }

  // Hash the provided token
  const tokenHash = await hashToken(sessionToken);

  const supabase = await createClient() as unknown as AnySupabaseClient;

  // Find session by hash
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('session_token_hash', tokenHash)
    .single();

  if (error || !data) {
    await logEvent({
      eventType: 'session_hijack_attempt',
      severity: 'high',
      description: `Invalid session token attempt`,
      actionTaken: 'request_rejected',
    });

    return {
      valid: false,
      invalidReason: 'not_found',
    };
  }

  const session = data as UserSession;

  // Check if session is active
  if (!session.is_active) {
    return {
      valid: false,
      invalidReason: 'terminated',
      session,
    };
  }

  // Check expiration
  if (new Date(session.expires_at) < new Date()) {
    return {
      valid: false,
      invalidReason: 'expired',
      session,
    };
  }

  // Update last activity
  await updateSessionActivity(supabase, session.id);

  return {
    valid: true,
    session,
  };
}

/**
 * Validates a session token without database access (for testing)
 *
 * @param sessionToken - The session token to validate
 * @param storedTokenHash - The stored hash to compare against
 * @param sessionData - The stored session data
 * @returns Validation result
 */
export async function validateSessionSync(
  sessionToken: string,
  storedTokenHash: string,
  sessionData: UserSession
): Promise<SessionValidationResult> {
  // Check token format
  if (!sessionToken || !sessionToken.startsWith(TOKEN_PREFIX)) {
    return {
      valid: false,
      invalidReason: 'invalid_format',
    };
  }

  // Hash and compare
  const tokenHash = await hashToken(sessionToken);

  if (tokenHash !== storedTokenHash) {
    return {
      valid: false,
      invalidReason: 'not_found',
    };
  }

  // Check if session is active
  if (!sessionData.is_active) {
    return {
      valid: false,
      invalidReason: 'terminated',
      session: sessionData,
    };
  }

  // Check expiration
  if (new Date(sessionData.expires_at) < new Date()) {
    return {
      valid: false,
      invalidReason: 'expired',
      session: sessionData,
    };
  }

  return {
    valid: true,
    session: sessionData,
  };
}

// =============================================================================
// Session Management Functions
// =============================================================================

/**
 * Updates the last activity timestamp for a session
 *
 * @param sessionToken - The session token
 * @returns Success status
 */
export async function updateActivity(
  sessionToken: string
): Promise<{ success: boolean; error: string | null }> {
  if (!sessionToken) {
    return { success: false, error: 'Session token is required' };
  }

  const tokenHash = await hashToken(sessionToken);
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { error } = await supabase
    .from('user_sessions')
    .update({ last_activity: new Date().toISOString() })
    .eq('session_token_hash', tokenHash)
    .eq('is_active', true);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Terminates a session
 *
 * @param sessionToken - The session token to terminate
 * @param reason - Reason for termination
 * @returns Success status
 */
export async function terminateSession(
  sessionToken: string,
  reason: string
): Promise<{ success: boolean; error: string | null }> {
  if (!sessionToken) {
    return { success: false, error: 'Session token is required' };
  }

  const tokenHash = await hashToken(sessionToken);
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { error } = await supabase
    .from('user_sessions')
    .update({
      is_active: false,
      terminated_at: new Date().toISOString(),
      terminated_reason: reason,
    })
    .eq('session_token_hash', tokenHash);

  if (error) {
    return { success: false, error: error.message };
  }

  await logEvent({
    eventType: 'suspicious_activity',
    severity: 'low',
    description: `Session terminated: ${reason}`,
    actionTaken: 'session_terminated',
  });

  return { success: true, error: null };
}

/**
 * Terminates a session by ID
 *
 * @param sessionId - The session ID to terminate
 * @param reason - Reason for termination
 * @returns Success status
 */
export async function terminateSessionById(
  sessionId: string,
  reason: string
): Promise<{ success: boolean; error: string | null }> {
  if (!sessionId) {
    return { success: false, error: 'Session ID is required' };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { error } = await supabase
    .from('user_sessions')
    .update({
      is_active: false,
      terminated_at: new Date().toISOString(),
      terminated_reason: reason,
    })
    .eq('id', sessionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Terminates all sessions for a user
 *
 * @param userId - The user ID
 * @param reason - Reason for termination
 * @returns Number of terminated sessions
 */
export async function terminateAllUserSessions(
  userId: string,
  reason: string
): Promise<{ terminatedCount: number; error: string | null }> {
  if (!userId) {
    return { terminatedCount: 0, error: 'User ID is required' };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase
    .from('user_sessions')
    .update({
      is_active: false,
      terminated_at: new Date().toISOString(),
      terminated_reason: reason,
    })
    .eq('user_id', userId)
    .eq('is_active', true)
    .select('id');

  if (error) {
    return { terminatedCount: 0, error: error.message };
  }

  const count = data?.length || 0;

  if (count > 0) {
    await logEvent({
      eventType: 'suspicious_activity',
      severity: 'medium',
      description: `All sessions terminated for user ${userId}: ${reason}`,
      userId,
      actionTaken: 'all_sessions_terminated',
    });
  }

  return { terminatedCount: count, error: null };
}

// =============================================================================
// Session Query Functions
// =============================================================================

/**
 * Gets all active sessions for a user
 *
 * @param userId - The user ID
 * @returns Array of active sessions
 */
export async function getUserSessions(
  userId: string
): Promise<{ data: UserSession[]; error: string | null }> {
  if (!userId) {
    return { data: [], error: 'User ID is required' };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('last_activity', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data || []) as UserSession[], error: null };
}

/**
 * Gets a session by ID
 *
 * @param sessionId - The session ID
 * @returns The session or null
 */
export async function getSessionById(
  sessionId: string
): Promise<{ data: UserSession | null; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as UserSession, error: null };
}

/**
 * Counts active sessions for a user
 *
 * @param userId - The user ID
 * @returns Number of active sessions
 */
export async function countUserSessions(
  userId: string
): Promise<{ count: number; error: string | null }> {
  if (!userId) {
    return { count: 0, error: 'User ID is required' };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { count, error } = await supabase
    .from('user_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString());

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count || 0, error: null };
}

// =============================================================================
// Cleanup Functions
// =============================================================================

/**
 * Cleans up expired sessions
 *
 * @param deleteExpired - Whether to delete expired sessions (default: false, just deactivates)
 * @returns Number of affected sessions
 */
export async function cleanupExpiredSessions(
  deleteExpired: boolean = false
): Promise<{ affectedCount: number; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const now = new Date().toISOString();

  if (deleteExpired) {
    const { data, error } = await supabase
      .from('user_sessions')
      .delete()
      .lt('expires_at', now)
      .select('id');

    if (error) {
      return { affectedCount: 0, error: error.message };
    }

    return { affectedCount: data?.length || 0, error: null };
  }

  // Just deactivate
  const { data, error } = await supabase
    .from('user_sessions')
    .update({
      is_active: false,
      terminated_at: now,
      terminated_reason: 'expired',
    })
    .lt('expires_at', now)
    .eq('is_active', true)
    .select('id');

  if (error) {
    return { affectedCount: 0, error: error.message };
  }

  return { affectedCount: data?.length || 0, error: null };
}

/**
 * Cleans up inactive sessions (no activity within timeout period)
 *
 * @param inactivityTimeoutSeconds - Inactivity timeout in seconds
 * @returns Number of affected sessions
 */
export async function cleanupInactiveSessions(
  inactivityTimeoutSeconds: number = DEFAULT_CONFIG.inactivityTimeoutSeconds
): Promise<{ affectedCount: number; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const cutoffTime = new Date(Date.now() - inactivityTimeoutSeconds * 1000).toISOString();

  const { data, error } = await supabase
    .from('user_sessions')
    .update({
      is_active: false,
      terminated_at: new Date().toISOString(),
      terminated_reason: 'inactivity_timeout',
    })
    .lt('last_activity', cutoffTime)
    .eq('is_active', true)
    .select('id');

  if (error) {
    return { affectedCount: 0, error: error.message };
  }

  return { affectedCount: data?.length || 0, error: null };
}

// =============================================================================
// Session Limit Enforcement
// =============================================================================

/**
 * Enforces the maximum session limit for a user by invalidating oldest sessions
 *
 * @param supabase - Supabase client
 * @param userId - The user ID
 * @param maxSessions - Maximum allowed sessions
 */
async function enforceSessionLimit(
  supabase: AnySupabaseClient,
  userId: string,
  maxSessions: number
): Promise<void> {
  // Get all active sessions ordered by creation time (oldest first)
  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });

  if (!sessions || sessions.length < maxSessions) {
    return; // No need to invalidate
  }

  // Calculate how many sessions to invalidate
  // We need to make room for the new session, so invalidate enough to get to maxSessions - 1
  const sessionsToInvalidate = sessions.length - maxSessions + 1;
  const sessionIdsToInvalidate = sessions
    .slice(0, sessionsToInvalidate)
    .map((s: { id: string }) => s.id);

  if (sessionIdsToInvalidate.length > 0) {
    await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        terminated_at: new Date().toISOString(),
        terminated_reason: 'session_limit_exceeded',
      })
      .in('id', sessionIdsToInvalidate);

    await logEvent({
      eventType: 'suspicious_activity',
      severity: 'low',
      description: `Session limit enforced for user ${userId}: ${sessionIdsToInvalidate.length} oldest sessions invalidated`,
      userId,
      actionTaken: 'oldest_sessions_invalidated',
    });
  }
}

/**
 * Enforces session limit without database access (for testing)
 * Returns which sessions should be invalidated
 *
 * @param sessions - Array of existing sessions
 * @param maxSessions - Maximum allowed sessions
 * @returns Array of session IDs to invalidate
 */
export function enforceSessionLimitSync(
  sessions: UserSession[],
  maxSessions: number
): string[] {
  // Filter to only active, non-expired sessions
  const activeSessions = sessions
    .filter(s => s.is_active && new Date(s.expires_at) > new Date())
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (activeSessions.length < maxSessions) {
    return []; // No need to invalidate
  }

  // Invalidate oldest sessions to make room for new one
  const sessionsToInvalidate = activeSessions.length - maxSessions + 1;
  return activeSessions.slice(0, sessionsToInvalidate).map(s => s.id);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generates a cryptographically secure session token
 *
 * @returns Session token string
 */
export function generateSessionToken(): string {
  const array = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(array);
  const randomHex = Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${TOKEN_PREFIX}${randomHex}`;
}

/**
 * Hashes a session token using SHA-256
 *
 * @param token - The token to hash
 * @returns The hex-encoded hash
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Updates the last activity timestamp for a session
 */
async function updateSessionActivity(
  supabase: AnySupabaseClient,
  sessionId: string
): Promise<void> {
  await supabase
    .from('user_sessions')
    .update({ last_activity: new Date().toISOString() })
    .eq('id', sessionId);
}

/**
 * Validates that a session token format is correct
 *
 * @param token - The token to validate
 * @returns Whether the token format is valid
 */
export function isValidTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Must start with prefix
  if (!token.startsWith(TOKEN_PREFIX)) {
    return false;
  }

  // Must have correct length (prefix + 64 hex chars)
  const expectedLength = TOKEN_PREFIX.length + TOKEN_LENGTH * 2;
  if (token.length !== expectedLength) {
    return false;
  }

  // Random portion must be valid hex
  const randomPortion = token.substring(TOKEN_PREFIX.length);
  return /^[0-9a-f]+$/i.test(randomPortion);
}

/**
 * Gets session statistics for a user
 *
 * @param userId - The user ID
 * @returns Session statistics
 */
export async function getSessionStatistics(
  userId: string
): Promise<{
  data: {
    activeCount: number;
    totalCount: number;
    oldestActiveSession: string | null;
    newestActiveSession: string | null;
  } | null;
  error: string | null;
}> {
  if (!userId) {
    return { data: null, error: 'User ID is required' };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  // Get active sessions
  const { data: activeSessions, error: activeError } = await supabase
    .from('user_sessions')
    .select('created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });

  if (activeError) {
    return { data: null, error: activeError.message };
  }

  // Get total count
  const { count: totalCount, error: totalError } = await supabase
    .from('user_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (totalError) {
    return { data: null, error: totalError.message };
  }

  const activeList = (activeSessions || []) as { created_at: string }[];

  return {
    data: {
      activeCount: activeList.length,
      totalCount: totalCount || 0,
      oldestActiveSession: activeList.length > 0 ? activeList[0].created_at : null,
      newestActiveSession: activeList.length > 0 ? activeList[activeList.length - 1].created_at : null,
    },
    error: null,
  };
}
