/**
 * IP Blocker
 *
 * Provides IP blocking functionality for protecting the system from malicious
 * IP addresses. Supports both permanent and temporary blocks with automatic
 * expiration handling.
 *
 * @module lib/security/ip-blocker
 */

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BlockedIP,
  BlockIPParams,
  IPBlockCheckResult,
  BlockedIPInsert,
} from './types';
import { logEvent } from './event-logger';

// Helper type for untyped Supabase queries (security tables not yet in generated types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// =============================================================================
// IP Block Check Functions
// =============================================================================

/**
 * Checks if an IP address is currently blocked
 *
 * @param ipAddress - The IP address to check
 * @returns Whether the IP is blocked and block details if applicable
 */
export async function isBlocked(
  ipAddress: string
): Promise<IPBlockCheckResult> {
  if (!ipAddress || !isValidIPAddress(ipAddress)) {
    return { blocked: false };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase
    .from('blocked_ips')
    .select('*')
    .eq('ip_address', ipAddress)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return { blocked: false };
  }

  const blockInfo = data as BlockedIP;

  // Check if block has expired
  if (blockInfo.expires_at && new Date(blockInfo.expires_at) < new Date()) {
    // Block has expired, deactivate it
    await deactivateExpiredBlock(supabase, blockInfo.id);
    return { blocked: false };
  }

  // Log the blocked access attempt
  await logEvent({
    eventType: 'unauthorized_access',
    severity: 'medium',
    description: `Blocked IP ${ipAddress} attempted to access the system`,
    ipAddress,
    actionTaken: 'request_blocked',
  });

  return {
    blocked: true,
    blockInfo,
  };
}

/**
 * Checks if an IP address is blocked without database access (for testing)
 *
 * @param ipAddress - The IP address to check
 * @param blockedIPs - Array of blocked IP records to check against
 * @returns Whether the IP is blocked
 */
export function isBlockedSync(
  ipAddress: string,
  blockedIPs: BlockedIP[]
): IPBlockCheckResult {
  if (!ipAddress || !isValidIPAddress(ipAddress)) {
    return { blocked: false };
  }

  const blockInfo = blockedIPs.find(
    (b) =>
      b.ip_address === ipAddress &&
      b.is_active &&
      (!b.expires_at || new Date(b.expires_at) > new Date())
  );

  if (!blockInfo) {
    return { blocked: false };
  }

  return {
    blocked: true,
    blockInfo,
  };
}

// =============================================================================
// IP Blocking Functions
// =============================================================================

/**
 * Blocks an IP address
 *
 * @param params - Block parameters including IP, reason, and optional duration
 * @returns The created block record or error
 */
export async function blockIP(
  params: BlockIPParams
): Promise<{ data: BlockedIP | null; error: string | null }> {
  if (!params.ipAddress) {
    return { data: null, error: 'IP address is required' };
  }

  if (!isValidIPAddress(params.ipAddress)) {
    return { data: null, error: 'Invalid IP address format' };
  }

  if (!params.reason) {
    return { data: null, error: 'Block reason is required' };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  // Check if IP is already blocked
  const { data: existing } = await supabase
    .from('blocked_ips')
    .select('*')
    .eq('ip_address', params.ipAddress)
    .eq('is_active', true)
    .single();

  if (existing) {
    // Update existing block
    const expiresAt = params.durationSeconds
      ? new Date(Date.now() + params.durationSeconds * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('blocked_ips')
      .update({
        reason: params.reason,
        blocked_by: params.blockedBy || null,
        expires_at: expiresAt,
        blocked_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as BlockedIP, error: null };
  }

  // Create new block
  const expiresAt = params.durationSeconds
    ? new Date(Date.now() + params.durationSeconds * 1000).toISOString()
    : null;

  const blockData: BlockedIPInsert = {
    ip_address: params.ipAddress,
    reason: params.reason,
    blocked_by: params.blockedBy || null,
    expires_at: expiresAt,
  };

  const { data, error } = await supabase
    .from('blocked_ips')
    .insert(blockData)
    .select()
    .single();

  if (error) {
    console.error('Failed to block IP:', error);
    return { data: null, error: error.message };
  }

  // Log the block event
  await logEvent({
    eventType: 'suspicious_activity',
    severity: 'high',
    description: `IP ${params.ipAddress} blocked: ${params.reason}`,
    ipAddress: params.ipAddress,
    userId: params.blockedBy,
    actionTaken: 'ip_blocked',
  });

  return { data: data as BlockedIP, error: null };
}

/**
 * Creates a block record without database access (for testing)
 *
 * @param params - Block parameters
 * @returns A blocked IP record (not persisted)
 */
export function createBlockRecord(params: BlockIPParams): BlockedIP {
  const expiresAt = params.durationSeconds
    ? new Date(Date.now() + params.durationSeconds * 1000).toISOString()
    : null;

  return {
    id: crypto.randomUUID(),
    ip_address: params.ipAddress,
    reason: params.reason,
    blocked_at: new Date().toISOString(),
    blocked_by: params.blockedBy || null,
    expires_at: expiresAt,
    is_active: true,
  };
}

// =============================================================================
// IP Unblocking Functions
// =============================================================================

/**
 * Unblocks an IP address
 *
 * @param ipAddress - The IP address to unblock
 * @returns Success status
 */
export async function unblockIP(
  ipAddress: string
): Promise<{ success: boolean; error: string | null }> {
  if (!ipAddress) {
    return { success: false, error: 'IP address is required' };
  }

  if (!isValidIPAddress(ipAddress)) {
    return { success: false, error: 'Invalid IP address format' };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase
    .from('blocked_ips')
    .update({ is_active: false })
    .eq('ip_address', ipAddress)
    .eq('is_active', true)
    .select('id');

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return { success: false, error: 'IP address not found in block list' };
  }

  // Log the unblock event
  await logEvent({
    eventType: 'suspicious_activity',
    severity: 'low',
    description: `IP ${ipAddress} unblocked`,
    ipAddress,
    actionTaken: 'ip_unblocked',
  });

  return { success: true, error: null };
}

/**
 * Unblocks an IP by block ID
 *
 * @param blockId - The block record ID
 * @returns Success status
 */
export async function unblockIPById(
  blockId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!blockId) {
    return { success: false, error: 'Block ID is required' };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase
    .from('blocked_ips')
    .update({ is_active: false })
    .eq('id', blockId)
    .select('ip_address')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Log the unblock event
  await logEvent({
    eventType: 'suspicious_activity',
    severity: 'low',
    description: `IP ${data.ip_address} unblocked (by ID)`,
    ipAddress: data.ip_address,
    actionTaken: 'ip_unblocked',
  });

  return { success: true, error: null };
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Lists all blocked IPs
 *
 * @param includeExpired - Whether to include expired blocks (default: false)
 * @param includeInactive - Whether to include inactive blocks (default: false)
 * @returns Array of blocked IP records
 */
export async function listBlockedIPs(
  includeExpired: boolean = false,
  includeInactive: boolean = false
): Promise<{ data: BlockedIP[]; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  let query = supabase
    .from('blocked_ips')
    .select('*')
    .order('blocked_at', { ascending: false });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  if (!includeExpired) {
    // Only include blocks that haven't expired or have no expiration
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data || []) as BlockedIP[], error: null };
}

/**
 * Gets a blocked IP record by IP address
 *
 * @param ipAddress - The IP address to look up
 * @returns The block record or null
 */
export async function getBlockByIP(
  ipAddress: string
): Promise<{ data: BlockedIP | null; error: string | null }> {
  if (!ipAddress) {
    return { data: null, error: 'IP address is required' };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase
    .from('blocked_ips')
    .select('*')
    .eq('ip_address', ipAddress)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return { data: null, error: null };
    }
    return { data: null, error: error.message };
  }

  return { data: data as BlockedIP, error: null };
}

/**
 * Gets a blocked IP record by ID
 *
 * @param blockId - The block record ID
 * @returns The block record or null
 */
export async function getBlockById(
  blockId: string
): Promise<{ data: BlockedIP | null; error: string | null }> {
  if (!blockId) {
    return { data: null, error: 'Block ID is required' };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase
    .from('blocked_ips')
    .select('*')
    .eq('id', blockId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as BlockedIP, error: null };
}

/**
 * Counts currently blocked IPs
 *
 * @returns Number of active blocks
 */
export async function countBlockedIPs(): Promise<{ count: number; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { count, error } = await supabase
    .from('blocked_ips')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count || 0, error: null };
}

// =============================================================================
// Cleanup Functions
// =============================================================================

/**
 * Cleans up expired blocks by deactivating them
 *
 * @returns Number of cleaned up blocks
 */
export async function cleanupExpiredBlocks(): Promise<{
  cleanedCount: number;
  error: string | null;
}> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('blocked_ips')
    .update({ is_active: false })
    .eq('is_active', true)
    .lt('expires_at', now)
    .not('expires_at', 'is', null)
    .select('id');

  if (error) {
    return { cleanedCount: 0, error: error.message };
  }

  return { cleanedCount: data?.length || 0, error: null };
}

/**
 * Deletes old inactive block records
 *
 * @param retentionDays - Number of days to retain inactive blocks (default: 30)
 * @returns Number of deleted records
 */
export async function deleteOldBlocks(
  retentionDays: number = 30
): Promise<{ deletedCount: number; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const { data, error } = await supabase
    .from('blocked_ips')
    .delete()
    .eq('is_active', false)
    .lt('blocked_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    return { deletedCount: 0, error: error.message };
  }

  return { deletedCount: data?.length || 0, error: null };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Deactivates an expired block
 */
async function deactivateExpiredBlock(
  supabase: AnySupabaseClient,
  blockId: string
): Promise<void> {
  await supabase
    .from('blocked_ips')
    .update({ is_active: false })
    .eq('id', blockId);
}

/**
 * Validates an IP address format (IPv4 or IPv6)
 *
 * @param ipAddress - The IP address to validate
 * @returns Whether the IP address format is valid
 */
export function isValidIPAddress(ipAddress: string): boolean {
  if (!ipAddress || typeof ipAddress !== 'string') {
    return false;
  }

  // IPv4 pattern
  const ipv4Pattern =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 pattern (simplified - accepts common formats)
  const ipv6Pattern =
    /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){0,6}::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$/;

  return ipv4Pattern.test(ipAddress) || ipv6Pattern.test(ipAddress);
}

/**
 * Normalizes an IP address to a consistent format
 *
 * @param ipAddress - The IP address to normalize
 * @returns Normalized IP address
 */
export function normalizeIPAddress(ipAddress: string): string {
  if (!ipAddress) {
    return '';
  }

  // Trim whitespace
  const trimmed = ipAddress.trim().toLowerCase();

  // For IPv4, remove leading zeros from octets
  if (trimmed.includes('.') && !trimmed.includes(':')) {
    return trimmed
      .split('.')
      .map((octet) => parseInt(octet, 10).toString())
      .join('.');
  }

  // For IPv6, return as-is (full normalization is complex)
  return trimmed;
}

/**
 * Checks if an IP is in a CIDR range (basic implementation for IPv4)
 *
 * @param ipAddress - The IP address to check
 * @param cidr - The CIDR range (e.g., "192.168.1.0/24")
 * @returns Whether the IP is in the range
 */
export function isIPInRange(ipAddress: string, cidr: string): boolean {
  if (!ipAddress || !cidr) {
    return false;
  }

  // Only support IPv4 for now
  if (!ipAddress.includes('.') || !cidr.includes('/')) {
    return false;
  }

  const [rangeIP, prefixLength] = cidr.split('/');
  const prefix = parseInt(prefixLength, 10);

  if (isNaN(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }

  // Special case: /0 matches all IPs
  if (prefix === 0) {
    return isValidIPAddress(ipAddress);
  }

  const ipNum = ipToNumber(ipAddress);
  const rangeNum = ipToNumber(rangeIP);

  if (ipNum === null || rangeNum === null) {
    return false;
  }

  const mask = ~((1 << (32 - prefix)) - 1) >>> 0; // Ensure unsigned
  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Converts an IPv4 address to a number
 */
function ipToNumber(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return null;
  }

  let num = 0;
  for (const part of parts) {
    const octet = parseInt(part, 10);
    if (isNaN(octet) || octet < 0 || octet > 255) {
      return null;
    }
    num = (num << 8) + octet;
  }

  return num >>> 0; // Convert to unsigned
}

/**
 * Gets block statistics
 *
 * @returns Statistics about blocked IPs
 */
export async function getBlockStatistics(): Promise<{
  data: {
    totalActive: number;
    totalInactive: number;
    permanentBlocks: number;
    temporaryBlocks: number;
    expiringWithin24h: number;
  } | null;
  error: string | null;
}> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase.from('blocked_ips').select('*');

  if (error) {
    return { data: null, error: error.message };
  }

  const blocks = (data || []) as BlockedIP[];
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  let totalActive = 0;
  let totalInactive = 0;
  let permanentBlocks = 0;
  let temporaryBlocks = 0;
  let expiringWithin24h = 0;

  for (const block of blocks) {
    if (block.is_active) {
      // Check if expired
      if (block.expires_at && new Date(block.expires_at) < now) {
        totalInactive++;
      } else {
        totalActive++;

        if (block.expires_at) {
          temporaryBlocks++;
          if (new Date(block.expires_at) < in24h) {
            expiringWithin24h++;
          }
        } else {
          permanentBlocks++;
        }
      }
    } else {
      totalInactive++;
    }
  }

  return {
    data: {
      totalActive,
      totalInactive,
      permanentBlocks,
      temporaryBlocks,
      expiringWithin24h,
    },
    error: null,
  };
}
