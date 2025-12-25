'use server'

/**
 * API Key Server Actions
 * 
 * v0.79: Security Hardening Module
 * Requirements: 4.1, 4.2
 * 
 * Provides server actions for:
 * - Creating new API keys
 * - Revoking API keys
 * - Listing API keys for a user
 * - Updating API key permissions
 */

import { createClient } from '@/lib/supabase/server'
import {
  generateKey,
  revokeKey as revokeKeyUtil,
  listUserKeys,
  getAllKeys,
  updateKeyPermissions as updateKeyPermissionsUtil,
  updateKeyRateLimit,
  getKeyById,
  getKeyStatistics,
} from '@/lib/security/api-key-manager'
import type { APIKey } from '@/lib/security/types'

/**
 * Create a new API key
 * Requirements: 4.1 - Generate secure random key and store only its hash
 */
export async function createAPIKey(
  name: string,
  permissions: string[],
  options?: {
    description?: string
    rateLimitPerMinute?: number
    expiresInDays?: number
  }
): Promise<{ success: boolean; key?: string; keyData?: APIKey; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Get user profile for authorization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    // Calculate expiration date if specified
    let expiresAt: Date | undefined
    if (options?.expiresInDays) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + options.expiresInDays)
    }
    
    const result = await generateKey({
      name,
      description: options?.description,
      userId: profile.id,
      permissions,
      rateLimitPerMinute: options?.rateLimitPerMinute,
      expiresAt,
    })
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return {
      success: true,
      key: result.data?.key,
      keyData: result.data?.keyData,
    }
  } catch (error) {
    console.error('Error creating API key:', error)
    return { success: false, error: 'Failed to create API key' }
  }
}

/**
 * Revoke an API key
 * Requirements: 4.2 - Revoke API keys
 */
export async function revokeAPIKey(
  keyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Get user profile for authorization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    // Verify the key exists and belongs to this user (or user is admin)
    const keyResult = await getKeyById(keyId)
    if (keyResult.error || !keyResult.data) {
      return { success: false, error: 'API key not found' }
    }
    
    // Only allow revoking own keys unless admin/owner
    if (keyResult.data.user_id !== profile.id && !['admin', 'owner'].includes(profile.role)) {
      return { success: false, error: 'Cannot revoke another user\'s API key' }
    }
    
    const result = await revokeKeyUtil(keyId)
    
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to revoke key' }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error revoking API key:', error)
    return { success: false, error: 'Failed to revoke API key' }
  }
}

/**
 * Get API keys for the current user
 */
export async function getMyAPIKeys(
  includeRevoked: boolean = false
): Promise<{ success: boolean; data?: APIKey[]; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }
    
    const result = await listUserKeys(profile.id, includeRevoked)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return { success: false, error: 'Failed to fetch API keys' }
  }
}

/**
 * Get all API keys (admin only)
 */
export async function getAPIKeys(
  filters?: {
    isActive?: boolean
    userId?: string
    hasPermission?: string
  }
): Promise<{ success: boolean; data?: APIKey[]; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Get user profile for authorization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    const result = await getAllKeys(filters)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return { success: false, error: 'Failed to fetch API keys' }
  }
}

/**
 * Update API key permissions
 */
export async function updateAPIKeyPermissions(
  keyId: string,
  permissions: string[]
): Promise<{ success: boolean; data?: APIKey; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Get user profile for authorization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    const result = await updateKeyPermissionsUtil(keyId, permissions)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true, data: result.data || undefined }
  } catch (error) {
    console.error('Error updating API key permissions:', error)
    return { success: false, error: 'Failed to update permissions' }
  }
}

/**
 * Update API key rate limit
 */
export async function updateAPIKeyRateLimit(
  keyId: string,
  rateLimitPerMinute: number
): Promise<{ success: boolean; data?: APIKey; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Get user profile for authorization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    const result = await updateKeyRateLimit(keyId, rateLimitPerMinute)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true, data: result.data || undefined }
  } catch (error) {
    console.error('Error updating API key rate limit:', error)
    return { success: false, error: 'Failed to update rate limit' }
  }
}

/**
 * Get API key statistics
 */
export async function getAPIKeyStats(
  keyId: string
): Promise<{
  success: boolean
  data?: {
    usageCount: number
    lastUsedAt: string | null
    createdAt: string
    isActive: boolean
    daysUntilExpiry: number | null
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
    
    // Get user profile for authorization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }
    
    // Verify the key exists and user has access
    const keyResult = await getKeyById(keyId)
    if (keyResult.error || !keyResult.data) {
      return { success: false, error: 'API key not found' }
    }
    
    // Only allow viewing own keys unless admin/owner
    if (keyResult.data.user_id !== profile.id && !['admin', 'owner'].includes(profile.role)) {
      return { success: false, error: 'Cannot view another user\'s API key' }
    }
    
    const result = await getKeyStatistics(keyId)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true, data: result.data || undefined }
  } catch (error) {
    console.error('Error fetching API key statistics:', error)
    return { success: false, error: 'Failed to fetch statistics' }
  }
}
