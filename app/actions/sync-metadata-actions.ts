'use server'

/**
 * Server Actions for Syncing User Metadata
 * 
 * These actions allow admins to sync user metadata to JWT claims.
 * Useful for:
 * - Migrating existing users to the new JWT-based middleware
 * - Fixing metadata sync issues
 * - Bulk updating metadata after profile changes
 */

import { createClient } from '@/lib/supabase/server'
import { syncUserMetadataToAuth } from '@/lib/supabase/sync-user-metadata'
import { requirePermission } from '@/lib/permissions-server'

interface SyncResult {
  success: boolean
  error?: string
  synced?: number
  failed?: number
}

/**
 * Sync metadata for a single user (admin only)
 */
export async function syncSingleUserMetadata(userId: string): Promise<SyncResult> {
  try {
    await requirePermission('can_manage_users')
    
    const supabase = await createClient()
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role, is_active, custom_homepage')
      .eq('user_id', userId)
      .single()
    
    if (error || !profile) {
      return { success: false, error: 'User profile not found' }
    }
    
    const result = await syncUserMetadataToAuth(userId, {
      role: profile.role,
      is_active: profile.is_active,
      custom_homepage: profile.custom_homepage,
    })
    
    return result
  } catch (error) {
    console.error('Error syncing user metadata:', error)
    return { success: false, error: 'Failed to sync metadata' }
  }
}

/**
 * Sync metadata for all users with linked auth accounts (admin only)
 * Useful for migrating existing users to JWT-based middleware
 */
export async function syncAllUsersMetadata(): Promise<SyncResult> {
  try {
    await requirePermission('can_manage_users')
    
    const supabase = await createClient()
    
    // Get all users with linked auth accounts
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('user_id, role, is_active, custom_homepage')
      .not('user_id', 'is', null)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    if (!profiles || profiles.length === 0) {
      return { success: true, synced: 0, failed: 0 }
    }
    
    let synced = 0
    let failed = 0
    
    for (const profile of profiles) {
      const result = await syncUserMetadataToAuth(profile.user_id!, {
        role: profile.role,
        is_active: profile.is_active,
        custom_homepage: profile.custom_homepage,
      })
      
      if (result.success) {
        synced++
      } else {
        failed++
        console.error(`Failed to sync metadata for user ${profile.user_id}:`, result.error)
      }
    }
    
    return { success: true, synced, failed }
  } catch (error) {
    console.error('Error syncing all users metadata:', error)
    return { success: false, error: 'Failed to sync metadata' }
  }
}
