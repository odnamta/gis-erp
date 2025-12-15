'use server'

import { createClient } from '@/lib/supabase/server'
import { UserProfile, UserPermissions, UserRole } from '@/types/permissions'
import { DEFAULT_PERMISSIONS } from '@/lib/permissions'

/**
 * Get the current user's profile from the database
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return profile as UserProfile | null
}

/**
 * Require a specific permission - throws error if not authorized
 * Use this in server actions to enforce permissions
 */
export async function requirePermission(
  permission: keyof UserPermissions
): Promise<UserProfile> {
  const profile = await getUserProfile()

  if (!profile) {
    throw new Error('Unauthorized: Not logged in')
  }

  if (!profile[permission]) {
    throw new Error(`Forbidden: Missing permission ${permission}`)
  }

  return profile
}

/**
 * Check if user has a specific permission - returns boolean
 * Use this when you need to conditionally execute logic
 */
export async function checkPermission(
  permission: keyof UserPermissions
): Promise<boolean> {
  const profile = await getUserProfile()
  return profile?.[permission] ?? false
}

/**
 * Require one of the specified roles - throws error if not authorized
 */
export async function requireRole(
  roles: UserRole | UserRole[]
): Promise<UserProfile> {
  const profile = await getUserProfile()

  if (!profile) {
    throw new Error('Unauthorized: Not logged in')
  }

  const allowedRoles = Array.isArray(roles) ? roles : [roles]
  if (!allowedRoles.includes(profile.role as UserRole)) {
    throw new Error(`Forbidden: Required role ${allowedRoles.join(' or ')}`)
  }

  return profile
}

/**
 * Create a user profile for a new user
 * Called after OAuth login if profile doesn't exist
 */
export async function createUserProfile(
  userId: string,
  email: string,
  fullName?: string,
  avatarUrl?: string
): Promise<UserProfile | null> {
  const supabase = await createClient()

  // Determine role based on email domain
  let role: UserRole = 'viewer'
  let permissions = DEFAULT_PERMISSIONS.viewer

  // Admin for dioatmando
  if (email === 'dioatmando@gama-group.co') {
    role = 'admin'
    permissions = DEFAULT_PERMISSIONS.admin
  }
  // Manager for other gama-group.co emails
  else if (email.endsWith('@gama-group.co')) {
    role = 'manager'
    permissions = DEFAULT_PERMISSIONS.manager
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: userId,
      email,
      full_name: fullName || null,
      avatar_url: avatarUrl || null,
      role,
      custom_dashboard: role === 'admin' ? 'admin' : 'default',
      ...permissions,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating user profile:', error)
    return null
  }

  return data as UserProfile
}

/**
 * Ensure user profile exists, create if not
 * Call this after successful OAuth login
 */
export async function ensureUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // First, try to get existing profile
  const { data: existingProfile, error: selectError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // If profile exists, return it (don't overwrite!)
  if (existingProfile) {
    return existingProfile as UserProfile
  }

  // Profile doesn't exist, create new one
  const email = user.email!
  let role: UserRole = 'viewer'
  let permissions = DEFAULT_PERMISSIONS.viewer

  if (email === 'dioatmando@gama-group.co') {
    role = 'admin'
    permissions = DEFAULT_PERMISSIONS.admin
  } else if (email.endsWith('@gama-group.co')) {
    role = 'manager'
    permissions = DEFAULT_PERMISSIONS.manager
  }

  const fullName = user.user_metadata?.full_name || user.user_metadata?.name
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture

  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: user.id,
      email,
      full_name: fullName || null,
      avatar_url: avatarUrl || null,
      role,
      custom_dashboard: role === 'admin' ? 'admin' : 'default',
      ...permissions,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating user profile:', error)
    return null
  }

  return data as UserProfile
}

/**
 * Update a user's role and permissions (admin only)
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole,
  customPermissions?: Partial<UserPermissions>
): Promise<{ success: boolean; error?: string }> {
  // Verify caller is admin
  const callerProfile = await requirePermission('can_manage_users')

  const supabase = await createClient()

  // Get default permissions for the new role
  const defaultPerms = DEFAULT_PERMISSIONS[newRole]
  const permissions = { ...defaultPerms, ...customPermissions }

  // Prevent removing last admin
  if (newRole !== 'admin' || !permissions.can_manage_users) {
    const { count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('can_manage_users', true)

    if (count === 1) {
      // Check if we're modifying the only admin
      const { data: targetProfile } = await supabase
        .from('user_profiles')
        .select('can_manage_users')
        .eq('user_id', targetUserId)
        .single()

      if (targetProfile?.can_manage_users) {
        return {
          success: false,
          error: 'Cannot remove admin permissions from the last admin user',
        }
      }
    }
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      role: newRole,
      custom_dashboard: newRole,
      ...permissions,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', targetUserId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Log the activity
  await supabase.from('activity_log').insert({
    action_type: 'user_role_changed',
    document_type: 'user',
    document_id: targetUserId,
    document_number: newRole,
    user_id: callerProfile.user_id,
    user_name: callerProfile.full_name || callerProfile.email,
  })

  return { success: true }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  await requirePermission('can_manage_users')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return data as UserProfile[]
}
