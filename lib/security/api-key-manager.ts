/**
 * API Key Manager
 *
 * Provides API key management functionality for secure authentication
 * of external integrations. Supports key generation, validation,
 * revocation, and usage tracking.
 *
 * @module lib/security/api-key-manager
 */

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  APIKey,
  GenerateAPIKeyParams,
  GenerateAPIKeyResult,
  APIKeyValidationResult,
  APIKeyInsert,
} from './types';
import { logEvent } from './event-logger';

// Helper type for untyped Supabase queries (security tables not yet in generated types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// =============================================================================
// Constants
// =============================================================================

/** Length of the random portion of the API key */
const KEY_RANDOM_LENGTH = 32;

/** Prefix for all API keys */
const KEY_PREFIX = 'gama_';

/** Default rate limit per minute for new keys */
const DEFAULT_RATE_LIMIT = 60;

// =============================================================================
// Key Generation Functions
// =============================================================================

/**
 * Generates a new API key with secure random bytes
 *
 * @param params - Key generation parameters
 * @returns The generated key (shown once) and stored key data
 */
export async function generateKey(
  params: GenerateAPIKeyParams
): Promise<{ data: GenerateAPIKeyResult | null; error: string | null }> {
  // Validate required fields
  if (!params.name || !params.userId) {
    return {
      data: null,
      error: 'Name and userId are required',
    };
  }

  // Generate secure random key
  const randomBytes = generateSecureRandomBytes(KEY_RANDOM_LENGTH);
  const keyString = `${KEY_PREFIX}${randomBytes}`;
  
  // Hash the key for storage
  const keyHash = await hashKey(keyString);
  
  // Extract prefix for display (first 8 chars after gama_)
  const keyPrefix = keyString.substring(0, KEY_PREFIX.length + 8);

  const supabase = await createClient() as unknown as AnySupabaseClient;

  const keyData: APIKeyInsert = {
    key_hash: keyHash,
    key_prefix: keyPrefix,
    name: params.name,
    description: params.description || null,
    user_id: params.userId,
    permissions: params.permissions || [],
    rate_limit_per_minute: params.rateLimitPerMinute || DEFAULT_RATE_LIMIT,
    expires_at: params.expiresAt ? params.expiresAt.toISOString() : null,
  };

  const { data, error } = await supabase
    .from('api_keys')
    .insert(keyData)
    .select()
    .single();

  if (error) {
    console.error('Failed to create API key:', error);
    return { data: null, error: error.message };
  }

  const storedKey = data as APIKey;

  return {
    data: {
      key: keyString,
      keyData: storedKey,
    },
    error: null,
  };
}

/**
 * Generates a key without database access (for testing purposes)
 *
 * @param params - Key generation parameters
 * @returns The generated key and mock key data
 */
export async function generateKeySync(
  params: GenerateAPIKeyParams
): Promise<GenerateAPIKeyResult> {
  const randomBytes = generateSecureRandomBytes(KEY_RANDOM_LENGTH);
  const keyString = `${KEY_PREFIX}${randomBytes}`;
  const keyHash = await hashKey(keyString);
  const keyPrefix = keyString.substring(0, KEY_PREFIX.length + 8);

  const keyData: APIKey = {
    id: crypto.randomUUID(),
    key_hash: keyHash,
    key_prefix: keyPrefix,
    name: params.name,
    description: params.description || null,
    user_id: params.userId,
    permissions: params.permissions || [],
    rate_limit_per_minute: params.rateLimitPerMinute || DEFAULT_RATE_LIMIT,
    expires_at: params.expiresAt ? params.expiresAt.toISOString() : null,
    last_used_at: null,
    usage_count: 0,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  return {
    key: keyString,
    keyData,
  };
}

// =============================================================================
// Key Validation Functions
// =============================================================================

/**
 * Validates an API key and returns associated permissions
 *
 * @param keyString - The API key to validate
 * @returns Validation result with user info and permissions
 */
export async function validateKey(
  keyString: string
): Promise<APIKeyValidationResult> {
  // Check key format
  if (!keyString || !keyString.startsWith(KEY_PREFIX)) {
    return {
      valid: false,
      invalidReason: 'invalid_format',
    };
  }

  // Hash the provided key
  const keyHash = await hashKey(keyString);

  const supabase = await createClient() as unknown as AnySupabaseClient;

  // Find key by hash
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .single();

  if (error || !data) {
    // Log invalid key attempt
    await logEvent({
      eventType: 'invalid_api_key',
      severity: 'medium',
      description: `Invalid API key attempt: ${keyString.substring(0, 12)}...`,
      actionTaken: 'request_rejected',
    });

    return {
      valid: false,
      invalidReason: 'not_found',
    };
  }

  const apiKey = data as APIKey;

  // Check if key is active
  if (!apiKey.is_active) {
    return {
      valid: false,
      invalidReason: 'revoked',
    };
  }

  // Check expiration
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return {
      valid: false,
      invalidReason: 'expired',
    };
  }

  // Update usage statistics
  await updateKeyUsage(supabase, apiKey.id);

  return {
    valid: true,
    userId: apiKey.user_id || undefined,
    permissions: apiKey.permissions,
    rateLimitPerMinute: apiKey.rate_limit_per_minute,
  };
}

/**
 * Validates an API key without database access (for testing)
 *
 * @param keyString - The API key to validate
 * @param storedKeyHash - The stored hash to compare against
 * @param keyData - The stored key data
 * @returns Validation result
 */
export async function validateKeySync(
  keyString: string,
  storedKeyHash: string,
  keyData: APIKey
): Promise<APIKeyValidationResult> {
  // Check key format
  if (!keyString || !keyString.startsWith(KEY_PREFIX)) {
    return {
      valid: false,
      invalidReason: 'invalid_format',
    };
  }

  // Hash and compare
  const keyHash = await hashKey(keyString);
  
  if (keyHash !== storedKeyHash) {
    return {
      valid: false,
      invalidReason: 'not_found',
    };
  }

  // Check if key is active
  if (!keyData.is_active) {
    return {
      valid: false,
      invalidReason: 'revoked',
    };
  }

  // Check expiration
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return {
      valid: false,
      invalidReason: 'expired',
    };
  }

  return {
    valid: true,
    userId: keyData.user_id || undefined,
    permissions: keyData.permissions,
    rateLimitPerMinute: keyData.rate_limit_per_minute,
  };
}

// =============================================================================
// Key Management Functions
// =============================================================================

/**
 * Revokes an API key
 *
 * @param keyId - The key ID to revoke
 * @returns Success status
 */
export async function revokeKey(
  keyId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!keyId) {
    return { success: false, error: 'Key ID is required' };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', keyId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log the revocation
  await logEvent({
    eventType: 'suspicious_activity',
    severity: 'low',
    description: `API key revoked: ${keyId}`,
    actionTaken: 'key_revoked',
  });

  return { success: true, error: null };
}

/**
 * Lists all API keys for a user
 *
 * @param userId - The user ID to list keys for
 * @param includeRevoked - Whether to include revoked keys
 * @returns Array of API keys (without hashes)
 */
export async function listUserKeys(
  userId: string,
  includeRevoked: boolean = false
): Promise<{ data: APIKey[]; error: string | null }> {
  if (!userId) {
    return { data: [], error: 'User ID is required' };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  let query = supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!includeRevoked) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data || []) as APIKey[], error: null };
}

/**
 * Updates permissions for an API key
 *
 * @param keyId - The key ID to update
 * @param permissions - New permissions array
 * @returns The updated key
 */
export async function updateKeyPermissions(
  keyId: string,
  permissions: string[]
): Promise<{ data: APIKey | null; error: string | null }> {
  if (!keyId) {
    return { data: null, error: 'Key ID is required' };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase
    .from('api_keys')
    .update({ permissions })
    .eq('id', keyId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as APIKey, error: null };
}

/**
 * Updates rate limit for an API key
 *
 * @param keyId - The key ID to update
 * @param rateLimitPerMinute - New rate limit
 * @returns The updated key
 */
export async function updateKeyRateLimit(
  keyId: string,
  rateLimitPerMinute: number
): Promise<{ data: APIKey | null; error: string | null }> {
  if (!keyId) {
    return { data: null, error: 'Key ID is required' };
  }

  if (rateLimitPerMinute < 1) {
    return { data: null, error: 'Rate limit must be at least 1' };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase
    .from('api_keys')
    .update({ rate_limit_per_minute: rateLimitPerMinute })
    .eq('id', keyId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as APIKey, error: null };
}

/**
 * Gets a single API key by ID
 *
 * @param keyId - The key ID to retrieve
 * @returns The API key or null
 */
export async function getKeyById(
  keyId: string
): Promise<{ data: APIKey | null; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('id', keyId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as APIKey, error: null };
}

// =============================================================================
// Statistics Functions
// =============================================================================

/**
 * Gets usage statistics for an API key
 *
 * @param keyId - The key ID to get stats for
 * @returns Usage statistics
 */
export async function getKeyStatistics(
  keyId: string
): Promise<{
  data: {
    usageCount: number;
    lastUsedAt: string | null;
    createdAt: string;
    isActive: boolean;
    daysUntilExpiry: number | null;
  } | null;
  error: string | null;
}> {
  const { data: key, error } = await getKeyById(keyId);

  if (error || !key) {
    return { data: null, error: error || 'Key not found' };
  }

  let daysUntilExpiry: number | null = null;
  if (key.expires_at) {
    const expiryDate = new Date(key.expires_at);
    const now = new Date();
    daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  return {
    data: {
      usageCount: key.usage_count,
      lastUsedAt: key.last_used_at,
      createdAt: key.created_at,
      isActive: key.is_active,
      daysUntilExpiry,
    },
    error: null,
  };
}

/**
 * Gets all API keys with optional filtering
 *
 * @param filters - Optional filters
 * @param limit - Maximum keys to return
 * @returns Array of API keys
 */
export async function getAllKeys(
  filters?: {
    isActive?: boolean;
    userId?: string;
    hasPermission?: string;
  },
  limit: number = 100
): Promise<{ data: APIKey[]; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  let query = supabase
    .from('api_keys')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }
  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters?.hasPermission) {
    query = query.contains('permissions', [filters.hasPermission]);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data || []) as APIKey[], error: null };
}

// =============================================================================
// Cleanup Functions
// =============================================================================

/**
 * Cleans up expired API keys
 *
 * @param deleteExpired - Whether to delete expired keys (default: false, just deactivates)
 * @returns Number of affected keys
 */
export async function cleanupExpiredKeys(
  deleteExpired: boolean = false
): Promise<{ affectedCount: number; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const now = new Date().toISOString();

  if (deleteExpired) {
    const { data, error } = await supabase
      .from('api_keys')
      .delete()
      .lt('expires_at', now)
      .not('expires_at', 'is', null)
      .select('id');

    if (error) {
      return { affectedCount: 0, error: error.message };
    }

    return { affectedCount: data?.length || 0, error: null };
  }

  // Just deactivate
  const { data, error } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .lt('expires_at', now)
    .not('expires_at', 'is', null)
    .eq('is_active', true)
    .select('id');

  if (error) {
    return { affectedCount: 0, error: error.message };
  }

  return { affectedCount: data?.length || 0, error: null };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generates cryptographically secure random bytes as hex string
 *
 * @param length - Number of bytes to generate
 * @returns Hex string of random bytes
 */
export function generateSecureRandomBytes(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hashes an API key using SHA-256
 *
 * @param key - The key to hash
 * @returns The hex-encoded hash
 */
export async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Updates usage statistics for an API key
 */
async function updateKeyUsage(
  supabase: AnySupabaseClient,
  keyId: string
): Promise<void> {
  // First get current usage count
  const { data: currentKey } = await supabase
    .from('api_keys')
    .select('usage_count')
    .eq('id', keyId)
    .single();

  const currentCount = (currentKey as { usage_count: number } | null)?.usage_count || 0;

  // Update with incremented count
  await supabase
    .from('api_keys')
    .update({
      last_used_at: new Date().toISOString(),
      usage_count: currentCount + 1,
    })
    .eq('id', keyId);
}

/**
 * Checks if a key has a specific permission
 *
 * @param permissions - Array of permissions the key has
 * @param requiredPermission - The permission to check for
 * @returns Whether the key has the permission
 */
export function hasPermission(
  permissions: string[],
  requiredPermission: string
): boolean {
  // Admin has all permissions
  if (permissions.includes('admin:all')) {
    return true;
  }

  // Check for exact match
  if (permissions.includes(requiredPermission)) {
    return true;
  }

  // Check for wildcard permissions (e.g., 'read:*' matches 'read:customers')
  const [action, resource] = requiredPermission.split(':');
  if (permissions.includes(`${action}:*`)) {
    return true;
  }
  if (permissions.includes(`*:${resource}`)) {
    return true;
  }

  return false;
}

/**
 * Validates that a key format is correct
 *
 * @param keyString - The key to validate
 * @returns Whether the key format is valid
 */
export function isValidKeyFormat(keyString: string): boolean {
  if (!keyString || typeof keyString !== 'string') {
    return false;
  }

  // Must start with prefix
  if (!keyString.startsWith(KEY_PREFIX)) {
    return false;
  }

  // Must have correct length (prefix + 64 hex chars)
  const expectedLength = KEY_PREFIX.length + KEY_RANDOM_LENGTH * 2;
  if (keyString.length !== expectedLength) {
    return false;
  }

  // Random portion must be valid hex
  const randomPortion = keyString.substring(KEY_PREFIX.length);
  return /^[0-9a-f]+$/i.test(randomPortion);
}
