'use server'

/**
 * IP Blocking Server Actions
 * 
 * v0.79: Security Hardening Module
 * Requirements: 6.1, 6.2
 * 
 * Provides server actions for:
 * - Blocking/unblocking IP addresses
 * - Listing blocked IPs
 * - Getting block statistics
 */

import { createClient } from '@/lib/supabase/server'
import {
  blockIP as blockIPUtil,
  unblockIP as unblockIPUtil,
  unblockIPById,
  listBlockedIPs as listBlockedIPsUtil,
  getBlockStatistics,
  getBlockByIP,
} from '@/lib/security/ip-blocker'
import type { BlockedIP } from '@/lib/security/types'

/**
 * Block an IP address
 */
export async function blockIP(
  ipAddress: string,
  reason: string,
  durationSeconds?: number
): Promise<{ success: boolean; data?: BlockedIP; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Get user profile for authorization and blockedBy
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    const result = await blockIPUtil({
      ipAddress,
      reason,
      blockedBy: profile.id,
      durationSeconds,
    })
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true, data: result.data || undefined }
  } catch (error) {
    console.error('Error blocking IP:', error)
    return { success: false, error: 'Failed to block IP address' }
  }
}

/**
 * Unblock an IP address
 */
export async function unblockIP(
  ipAddress: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Check authorization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    const result = await unblockIPUtil(ipAddress)
    
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to unblock IP' }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error unblocking IP:', error)
    return { success: false, error: 'Failed to unblock IP address' }
  }
}

/**
 * Unblock an IP by block ID
 */
export async function unblockIPByBlockId(
  blockId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Check authorization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    const result = await unblockIPById(blockId)
    
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to unblock IP' }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error unblocking IP:', error)
    return { success: false, error: 'Failed to unblock IP address' }
  }
}

/**
 * Get list of blocked IPs
 */
export async function getBlockedIPs(
  includeExpired: boolean = false,
  includeInactive: boolean = false
): Promise<{ success: boolean; data?: BlockedIP[]; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Check authorization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || !['admin', 'owner', 'manager'].includes(profile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    const result = await listBlockedIPsUtil(includeExpired, includeInactive)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error fetching blocked IPs:', error)
    return { success: false, error: 'Failed to fetch blocked IPs' }
  }
}

/**
 * Get block statistics
 */
export async function getIPBlockStats(): Promise<{
  success: boolean
  data?: {
    totalActive: number
    totalInactive: number
    permanentBlocks: number
    temporaryBlocks: number
    expiringWithin24h: number
  }
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Check authorization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || !['admin', 'owner', 'manager'].includes(profile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    const result = await getBlockStatistics()
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true, data: result.data || undefined }
  } catch (error) {
    console.error('Error fetching block statistics:', error)
    return { success: false, error: 'Failed to fetch statistics' }
  }
}

/**
 * Check if an IP is blocked
 */
export async function checkIPBlocked(
  ipAddress: string
): Promise<{ success: boolean; blocked?: boolean; blockInfo?: BlockedIP; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    const result = await getBlockByIP(ipAddress)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return {
      success: true,
      blocked: !!result.data,
      blockInfo: result.data || undefined,
    }
  } catch (error) {
    console.error('Error checking IP block status:', error)
    return { success: false, error: 'Failed to check IP status' }
  }
}
