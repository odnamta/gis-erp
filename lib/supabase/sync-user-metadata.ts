/**
 * Sync User Metadata to JWT Claims
 * 
 * This module handles syncing user profile data (role, is_active, custom_homepage)
 * to Supabase Auth app_metadata. This allows the middleware to read these values
 * from the JWT session instead of making a database query on every request.
 * 
 * Performance Impact: Eliminates 50-200ms database query latency on every page navigation.
 * 
 * Usage:
 * - Called on successful login to set initial metadata
 * - Called when user profile is updated (role change, deactivation, homepage change)
 */

import { createClient } from '@/lib/supabase/server'
export interface UserMetadataForJWT {
  role: string
  roles: string[]
  is_active: boolean
  custom_homepage: string | null
}

/**
 * Syncs user profile data to Supabase Auth app_metadata.
 * This data will be available in the JWT session without database queries.
 * 
 * Note: This uses the admin API via service role key to update app_metadata.
 * For client-side updates, use updateUserMetadataFromProfile instead.
 */
export async function syncUserMetadataToAuth(
  userId: string,
  metadata: UserMetadataForJWT
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use service role client for admin operations
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: {
        role: metadata.role,
        roles: metadata.roles,
        is_active: metadata.is_active,
        custom_homepage: metadata.custom_homepage,
      },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to sync metadata' }
  }
}

/**
 * Fetches user profile and syncs metadata to auth.
 * Call this after profile updates to keep JWT claims in sync.
 */
export async function syncUserMetadataFromProfile(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { data: rawProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    const profile = rawProfile as { role: string; roles?: string[]; is_active: boolean; custom_homepage: string | null } | null
    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' }
    }

    // Build roles array: use DB roles if populated, otherwise fallback to [role]
    const roles = Array.isArray(profile.roles) && profile.roles.length > 0
      ? profile.roles
      : profile.role ? [profile.role] : []

    return syncUserMetadataToAuth(userId, {
      role: profile.role,
      roles,
      is_active: profile.is_active,
      custom_homepage: profile.custom_homepage,
    })
  } catch (error) {
    return { success: false, error: 'Failed to sync metadata from profile' }
  }
}

/**
 * Gets user metadata from JWT session.
 * Returns null if metadata is not set (fallback to database query needed).
 */
export function getUserMetadataFromSession(user: { app_metadata?: Record<string, unknown> }): UserMetadataForJWT | null {
  const appMetadata = user.app_metadata
  
  if (!appMetadata || typeof appMetadata.role !== 'string') {
    return null
  }

  // Read roles array from JWT, fallback to [role]
  const roles = Array.isArray(appMetadata.roles) && appMetadata.roles.length > 0
    ? appMetadata.roles as string[]
    : [appMetadata.role as string]

  return {
    role: appMetadata.role as string,
    roles,
    is_active: appMetadata.is_active !== false, // Default to true if not set
    custom_homepage: (appMetadata.custom_homepage as string | null) || null,
  }
}
