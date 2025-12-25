/**
 * Rate Limiter
 *
 * Provides rate limiting functionality to protect against abuse and
 * denial-of-service attacks. Supports configurable limits per identifier
 * and endpoint with automatic blocking for repeated violations.
 *
 * @module lib/security/rate-limiter
 */

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  RateLimitConfig,
  RateLimitResult,
  RateLimitLog,
} from './types';
import { DEFAULT_RATE_LIMITS } from './types';
import { logEvent } from './event-logger';

// Helper type for untyped Supabase queries (security tables not yet in generated types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// =============================================================================
// Rate Limit Check Functions
// =============================================================================

/**
 * Checks if a request is allowed based on rate limiting rules
 *
 * @param identifier - Unique identifier for the requester (e.g., IP address, user ID)
 * @param endpoint - The endpoint being accessed
 * @param config - Rate limit configuration (optional, uses defaults)
 * @returns RateLimitResult indicating if request is allowed
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  // Use default config if not provided
  const effectiveConfig = config || getConfigForEndpoint(endpoint);
  const now = new Date();
  
  // Calculate window start time
  const windowStart = getWindowStart(now, effectiveConfig.windowSeconds);
  const resetAt = new Date(windowStart.getTime() + effectiveConfig.windowSeconds * 1000);

  const supabase = await createClient() as unknown as AnySupabaseClient;

  // First, check if the identifier is currently blocked
  const blockCheck = await checkIfBlocked(supabase, identifier, endpoint, now);
  if (blockCheck.blocked) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: blockCheck.blockedUntil!,
      blocked: true,
    };
  }

  // Get or create rate limit entry for this window
  const { data: existingEntry, error: fetchError } = await supabase
    .from('rate_limit_log')
    .select('*')
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString())
    .lt('window_start', resetAt.toISOString())
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is expected for new entries
    console.error('Error fetching rate limit entry:', fetchError);
    // Fail open - allow request if we can't check rate limit
    return {
      allowed: true,
      remaining: effectiveConfig.limit,
      resetAt,
      blocked: false,
    };
  }

  const entry = existingEntry as RateLimitLog | null;

  if (!entry) {
    // First request in this window - create new entry
    const { error: insertError } = await supabase
      .from('rate_limit_log')
      .insert({
        identifier,
        endpoint,
        request_count: 1,
        window_start: windowStart.toISOString(),
      });

    if (insertError) {
      console.error('Error creating rate limit entry:', insertError);
      // Fail open
      return {
        allowed: true,
        remaining: effectiveConfig.limit - 1,
        resetAt,
        blocked: false,
      };
    }

    return {
      allowed: true,
      remaining: effectiveConfig.limit - 1,
      resetAt,
      blocked: false,
    };
  }

  // Check if limit exceeded
  if (entry.request_count >= effectiveConfig.limit) {
    // Log rate limit exceeded event
    await logRateLimitExceeded(identifier, endpoint, entry.request_count, effectiveConfig.limit);

    // Block the identifier if configured
    if (effectiveConfig.blockDurationSeconds > 0) {
      const blockedUntil = new Date(now.getTime() + effectiveConfig.blockDurationSeconds * 1000);
      await blockIdentifier(supabase, identifier, endpoint, blockedUntil);
      
      return {
        allowed: false,
        remaining: 0,
        resetAt: blockedUntil,
        blocked: true,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      blocked: false,
    };
  }

  // Increment request count
  const newCount = entry.request_count + 1;
  const { error: updateError } = await supabase
    .from('rate_limit_log')
    .update({ request_count: newCount })
    .eq('id', entry.id);

  if (updateError) {
    console.error('Error updating rate limit entry:', updateError);
  }

  return {
    allowed: true,
    remaining: effectiveConfig.limit - newCount,
    resetAt,
    blocked: false,
  };
}

/**
 * Checks rate limit without database access (for testing/utility purposes)
 * Uses in-memory tracking - NOT suitable for production distributed systems
 *
 * @param identifier - Unique identifier for the requester
 * @param endpoint - The endpoint being accessed
 * @param currentCount - Current request count in window
 * @param config - Rate limit configuration
 * @returns RateLimitResult
 */
export function checkRateLimitSync(
  identifier: string,
  endpoint: string,
  currentCount: number,
  config?: RateLimitConfig
): RateLimitResult {
  const effectiveConfig = config || getConfigForEndpoint(endpoint);
  const now = new Date();
  const windowStart = getWindowStart(now, effectiveConfig.windowSeconds);
  const resetAt = new Date(windowStart.getTime() + effectiveConfig.windowSeconds * 1000);

  // Suppress unused variable warning - identifier is part of the API signature
  void identifier;

  if (currentCount >= effectiveConfig.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      blocked: false,
    };
  }

  return {
    allowed: true,
    remaining: effectiveConfig.limit - currentCount - 1,
    resetAt,
    blocked: false,
  };
}

// =============================================================================
// Rate Limit Headers
// =============================================================================

/**
 * Generates rate limit headers for HTTP response
 *
 * @param result - The rate limit check result
 * @param config - Rate limit configuration (optional)
 * @returns Record of header name to value
 */
export function getRateLimitHeaders(
  result: RateLimitResult,
  config?: RateLimitConfig
): Record<string, string> {
  const effectiveConfig = config || DEFAULT_RATE_LIMITS.default;
  
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': effectiveConfig.limit.toString(),
    'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
    'X-RateLimit-Reset': Math.floor(result.resetAt.getTime() / 1000).toString(),
  };

  if (!result.allowed) {
    // Add Retry-After header when rate limited
    const retryAfterSeconds = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
    headers['Retry-After'] = Math.max(0, retryAfterSeconds).toString();
  }

  return headers;
}

/**
 * Validates that rate limit headers are consistent with the result
 *
 * @param headers - The headers to validate
 * @param result - The rate limit result
 * @param config - Rate limit configuration
 * @returns true if headers are consistent
 */
export function validateRateLimitHeaders(
  headers: Record<string, string>,
  result: RateLimitResult,
  config: RateLimitConfig
): boolean {
  const limit = parseInt(headers['X-RateLimit-Limit'], 10);
  const remaining = parseInt(headers['X-RateLimit-Remaining'], 10);
  const reset = parseInt(headers['X-RateLimit-Reset'], 10);

  // Validate limit matches config
  if (limit !== config.limit) {
    return false;
  }

  // Validate remaining matches result
  if (remaining !== Math.max(0, result.remaining)) {
    return false;
  }

  // Validate reset time is approximately correct (within 1 second tolerance)
  const expectedReset = Math.floor(result.resetAt.getTime() / 1000);
  if (Math.abs(reset - expectedReset) > 1) {
    return false;
  }

  // If not allowed, Retry-After should be present
  if (!result.allowed && headers['Retry-After']) {
    const retryAfter = parseInt(headers['Retry-After'], 10);
    const expectedRetryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
    // Allow some tolerance for timing
    if (Math.abs(retryAfter - expectedRetryAfter) > 2) {
      return false;
    }
  }

  return true;
}

// =============================================================================
// Cleanup Functions
// =============================================================================

/**
 * Cleans up old rate limit entries from the database
 *
 * @param maxAgeHours - Maximum age of entries to keep (default: 1 hour)
 * @returns Number of deleted entries
 */
export async function cleanupOldEntries(
  maxAgeHours: number = 1
): Promise<{ deletedCount: number; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours);

  const { data, error } = await supabase
    .from('rate_limit_log')
    .delete()
    .lt('window_start', cutoffDate.toISOString())
    .select('id');

  if (error) {
    return { deletedCount: 0, error: error.message };
  }

  return { deletedCount: data?.length || 0, error: null };
}

/**
 * Cleans up expired blocks from rate limit entries
 *
 * @returns Number of cleared blocks
 */
export async function cleanupExpiredBlocks(): Promise<{ clearedCount: number; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('rate_limit_log')
    .update({ blocked_until: null })
    .lt('blocked_until', now)
    .not('blocked_until', 'is', null)
    .select('id');

  if (error) {
    return { clearedCount: 0, error: error.message };
  }

  return { clearedCount: data?.length || 0, error: null };
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Gets the current rate limit status for an identifier and endpoint
 *
 * @param identifier - The identifier to check
 * @param endpoint - The endpoint to check
 * @returns Current rate limit entry or null
 */
export async function getRateLimitStatus(
  identifier: string,
  endpoint: string
): Promise<{ data: RateLimitLog | null; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const config = getConfigForEndpoint(endpoint);
  const now = new Date();
  const windowStart = getWindowStart(now, config.windowSeconds);

  const { data, error } = await supabase
    .from('rate_limit_log')
    .select('*')
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { data: null, error: error.message };
  }

  return { data: data as RateLimitLog | null, error: null };
}

/**
 * Gets all rate limit entries for an identifier
 *
 * @param identifier - The identifier to query
 * @param limit - Maximum entries to return
 * @returns Array of rate limit entries
 */
export async function getRateLimitHistory(
  identifier: string,
  limit: number = 100
): Promise<{ data: RateLimitLog[]; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase
    .from('rate_limit_log')
    .select('*')
    .eq('identifier', identifier)
    .order('window_start', { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data || []) as RateLimitLog[], error: null };
}

/**
 * Gets currently blocked identifiers
 *
 * @returns Array of blocked rate limit entries
 */
export async function getBlockedIdentifiers(): Promise<{ data: RateLimitLog[]; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('rate_limit_log')
    .select('*')
    .gt('blocked_until', now)
    .order('blocked_until', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data || []) as RateLimitLog[], error: null };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the rate limit configuration for a specific endpoint
 *
 * @param endpoint - The endpoint to get config for
 * @returns Rate limit configuration
 */
export function getConfigForEndpoint(endpoint: string): RateLimitConfig {
  // Check for specific endpoint patterns
  if (endpoint.includes('/auth') || endpoint.includes('/login')) {
    return DEFAULT_RATE_LIMITS.auth;
  }
  if (endpoint.includes('/api')) {
    return DEFAULT_RATE_LIMITS.api;
  }
  if (endpoint.includes('/upload')) {
    return DEFAULT_RATE_LIMITS.upload;
  }
  return DEFAULT_RATE_LIMITS.default;
}

/**
 * Calculates the start of the current rate limit window
 *
 * @param now - Current time
 * @param windowSeconds - Window duration in seconds
 * @returns Start of the current window
 */
export function getWindowStart(now: Date, windowSeconds: number): Date {
  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(now.getTime() / windowMs) * windowMs;
  return new Date(windowStart);
}

/**
 * Checks if an identifier is currently blocked
 */
async function checkIfBlocked(
  supabase: AnySupabaseClient,
  identifier: string,
  endpoint: string,
  now: Date
): Promise<{ blocked: boolean; blockedUntil?: Date }> {
  const { data, error } = await supabase
    .from('rate_limit_log')
    .select('blocked_until')
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .gt('blocked_until', now.toISOString())
    .order('blocked_until', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return { blocked: false };
  }

  const entry = data as { blocked_until: string };
  return {
    blocked: true,
    blockedUntil: new Date(entry.blocked_until),
  };
}

/**
 * Blocks an identifier until a specified time
 */
async function blockIdentifier(
  supabase: AnySupabaseClient,
  identifier: string,
  endpoint: string,
  blockedUntil: Date
): Promise<void> {
  // Update the most recent entry with blocked_until
  const { error } = await supabase
    .from('rate_limit_log')
    .update({ blocked_until: blockedUntil.toISOString() })
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .order('window_start', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error blocking identifier:', error);
  }
}

/**
 * Logs a rate limit exceeded event
 */
async function logRateLimitExceeded(
  identifier: string,
  endpoint: string,
  currentCount: number,
  limit: number
): Promise<void> {
  await logEvent({
    eventType: 'rate_limit_exceeded',
    severity: 'medium',
    description: `Rate limit exceeded for identifier ${identifier} on endpoint ${endpoint}. Count: ${currentCount}/${limit}`,
    ipAddress: identifier.includes('.') ? identifier : undefined,
    requestPath: endpoint,
    actionTaken: 'request_blocked',
  });
}

/**
 * Manually unblocks an identifier
 *
 * @param identifier - The identifier to unblock
 * @param endpoint - The endpoint to unblock (optional, unblocks all if not specified)
 * @returns Success status
 */
export async function unblockIdentifier(
  identifier: string,
  endpoint?: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  let query = supabase
    .from('rate_limit_log')
    .update({ blocked_until: null })
    .eq('identifier', identifier);

  if (endpoint) {
    query = query.eq('endpoint', endpoint);
  }

  const { error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Resets rate limit count for an identifier
 *
 * @param identifier - The identifier to reset
 * @param endpoint - The endpoint to reset (optional)
 * @returns Success status
 */
export async function resetRateLimit(
  identifier: string,
  endpoint?: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  let query = supabase
    .from('rate_limit_log')
    .delete()
    .eq('identifier', identifier);

  if (endpoint) {
    query = query.eq('endpoint', endpoint);
  }

  const { error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// =============================================================================
// Statistics Functions
// =============================================================================

/**
 * Gets rate limiting statistics
 *
 * @param dateFrom - Start date for statistics
 * @param dateTo - End date for statistics
 * @returns Rate limiting statistics
 */
export async function getRateLimitStatistics(
  dateFrom?: string,
  dateTo?: string
): Promise<{
  data: {
    totalEntries: number;
    uniqueIdentifiers: number;
    blockedCount: number;
    byEndpoint: Record<string, number>;
  } | null;
  error: string | null;
}> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  let query = supabase.from('rate_limit_log').select('*');

  if (dateFrom) {
    query = query.gte('window_start', dateFrom);
  }
  if (dateTo) {
    query = query.lte('window_start', dateTo);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  const entries = (data || []) as RateLimitLog[];
  const now = new Date();

  // Calculate statistics
  const uniqueIdentifiers = new Set(entries.map(e => e.identifier)).size;
  const blockedCount = entries.filter(e => 
    e.blocked_until && new Date(e.blocked_until) > now
  ).length;

  const byEndpoint: Record<string, number> = {};
  for (const entry of entries) {
    byEndpoint[entry.endpoint] = (byEndpoint[entry.endpoint] || 0) + entry.request_count;
  }

  return {
    data: {
      totalEntries: entries.length,
      uniqueIdentifiers,
      blockedCount,
      byEndpoint,
    },
    error: null,
  };
}
