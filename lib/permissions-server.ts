'use server'

import { createClient } from '@/lib/supabase/server'
import { UserProfile, UserPermissions, UserRole, DepartmentScope, FeatureKey } from '@/types/permissions'
import { DEFAULT_PERMISSIONS, OWNER_EMAIL, isOwnerEmail, getAssignableRoles, getInheritedRoles, canAccessFeature } from '@/lib/permissions'

/**
 * Get the current user's profile from the database
 * Note: last_login_at is updated via auth trigger, not here (for performance)
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

  // Ensure department_scope is always an array
  if (profile && !profile.department_scope) {
    profile.department_scope = []
  }

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
  let role: UserRole = 'ops'  // Default to ops for new users
  let permissions = DEFAULT_PERMISSIONS.ops

  // Owner for dioatmando
  if (email === 'dioatmando@gama-group.co') {
    role = 'owner'
    permissions = DEFAULT_PERMISSIONS.owner
  }
  // Marketing manager for hutamiarini
  else if (email === 'hutamiarini@gama-group.co') {
    role = 'marketing_manager'
    permissions = DEFAULT_PERMISSIONS.marketing_manager
  }
  // Finance manager for ferisupriono
  else if (email === 'ferisupriono@gama-group.co') {
    role = 'finance_manager'
    permissions = DEFAULT_PERMISSIONS.finance_manager
  }
  // Operations manager for rezapramana
  else if (email === 'rezapramana@gama-group.co') {
    role = 'operations_manager'
    permissions = DEFAULT_PERMISSIONS.operations_manager
  }
  // Default to marketing for other gama-group.co emails
  else if (email.endsWith('@gama-group.co')) {
    role = 'marketing'
    permissions = DEFAULT_PERMISSIONS.marketing
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: userId,
      email,
      full_name: fullName || null,
      avatar_url: avatarUrl || null,
      role,
      department_scope: [],
      custom_dashboard: role === 'owner' ? 'executive' : 'default',
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
 * Handles pre-registered users by linking auth to existing profile
 */
export async function ensureUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log('[ensureUserProfile] No authenticated user')
    return null
  }

  const email = user.email!
  console.log('[ensureUserProfile] Processing user:', email)

  // First, try to get existing profile by user_id
  const { data: existingProfile, error: existingError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('[ensureUserProfile] Error fetching existing profile:', existingError)
  }

  // If profile exists with user_id, update last_login and return
  if (existingProfile) {
    console.log('[ensureUserProfile] Found existing profile for:', email)

    // Check if owner email and ensure owner role
    if (isOwnerEmail(email) && existingProfile.role !== 'owner') {
      await supabase
        .from('user_profiles')
        .update({
          role: 'owner',
          ...DEFAULT_PERMISSIONS.owner,
          last_login_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      return { ...existingProfile, role: 'owner', ...DEFAULT_PERMISSIONS.owner } as UserProfile
    }

    await supabase
      .from('user_profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('user_id', user.id)

    return existingProfile as UserProfile
  }

  console.log('[ensureUserProfile] No existing profile, checking for pre-registered:', email)

  // Check for pre-registered profile by email (user_id is null)
  const { data: preregisteredProfile, error: preregError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .is('user_id', null)
    .single()

  if (preregError && preregError.code !== 'PGRST116') {
    console.error('[ensureUserProfile] Error fetching pre-registered profile:', preregError)
  }

  if (preregisteredProfile) {
    console.log('[ensureUserProfile] Found pre-registered profile, linking to auth:', email)

    // Link auth user to pre-registered profile
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || preregisteredProfile.full_name
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || preregisteredProfile.avatar_url

    const { data: linkedProfile, error } = await supabase
      .from('user_profiles')
      .update({
        user_id: user.id,
        full_name: fullName,
        avatar_url: avatarUrl,
        last_login_at: new Date().toISOString(),
      })
      .eq('id', preregisteredProfile.id)
      .select()
      .single()

    if (error) {
      console.error('[ensureUserProfile] Error linking pre-registered profile:', error)
      return null
    }

    console.log('[ensureUserProfile] Successfully linked profile, initializing onboarding')

    // Initialize onboarding for newly linked pre-registered user
    try {
      const { initializeOnboardingForUser } = await import('@/lib/onboarding-actions')
      const onboardingResult = await initializeOnboardingForUser(user.id, linkedProfile.role)
      console.log('[ensureUserProfile] Onboarding initialization result:', onboardingResult)
    } catch (e) {
      console.error('[ensureUserProfile] Failed to initialize onboarding for linked user:', e)
      // Don't fail the profile linking if onboarding initialization fails
    }

    return linkedProfile as UserProfile
  }

  // Profile doesn't exist, create new one
  console.log('[ensureUserProfile] No pre-registered profile, creating new profile for:', email)

  let role: UserRole = 'ops'  // Default to ops for new users
  let permissions = DEFAULT_PERMISSIONS.ops

  // Owner email gets owner role
  if (isOwnerEmail(email)) {
    role = 'owner'
    permissions = DEFAULT_PERMISSIONS.owner
  }
  // Marketing manager for hutamiarini
  else if (email === 'hutamiarini@gama-group.co') {
    role = 'marketing_manager'
    permissions = DEFAULT_PERMISSIONS.marketing_manager
  }
  // Finance manager for ferisupriono
  else if (email === 'ferisupriono@gama-group.co') {
    role = 'finance_manager'
    permissions = DEFAULT_PERMISSIONS.finance_manager
  }
  // Operations manager for rezapramana
  else if (email === 'rezapramana@gama-group.co') {
    role = 'operations_manager'
    permissions = DEFAULT_PERMISSIONS.operations_manager
  }
  // Default to marketing for other gama-group.co emails
  else if (email.endsWith('@gama-group.co')) {
    role = 'marketing'
    permissions = DEFAULT_PERMISSIONS.marketing
  }

  console.log('[ensureUserProfile] Assigned role:', role)

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
      department_scope: [],
      custom_dashboard: role === 'owner' ? 'executive' : (['marketing_manager', 'finance_manager', 'operations_manager'].includes(role) ? 'manager' : 'default'),
      last_login_at: new Date().toISOString(),
      ...permissions,
    })
    .select()
    .single()

  if (error) {
    console.error('[ensureUserProfile] Error creating user profile:', error)
    return null
  }

  console.log('[ensureUserProfile] Successfully created new profile for:', email)
  return data as UserProfile
}

/**
 * Update a user's role and permissions (admin/owner only)
 * Owner role cannot be assigned or modified
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole,
  customPermissions?: Partial<UserPermissions>
): Promise<{ success: boolean; error?: string }> {
  // Verify caller has permission to manage users
  const callerProfile = await requirePermission('can_manage_users')

  const supabase = await createClient()

  // Prevent assigning owner role
  if (newRole === 'owner') {
    return {
      success: false,
      error: 'Owner role cannot be assigned',
    }
  }

  // Check if target is owner - cannot modify owner
  const { data: targetProfile } = await supabase
    .from('user_profiles')
    .select('role, can_manage_users')
    .eq('user_id', targetUserId)
    .single()

  if (targetProfile?.role === 'owner') {
    return {
      success: false,
      error: 'Cannot modify owner account',
    }
  }

  // Get default permissions for the new role
  const defaultPerms = DEFAULT_PERMISSIONS[newRole]
  const permissions = { ...defaultPerms, ...customPermissions }

  // Prevent removing last admin (excluding owner from count)
  if (newRole !== 'sysadmin' || !permissions.can_manage_users) {
    const { count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('can_manage_users', true)
      .neq('role', 'owner')

    if (count === 1) {
      if (targetProfile?.can_manage_users) {
        return {
          success: false,
          error: 'Cannot remove admin permissions from the last admin user',
        }
      }
    }
  }

  // Get previous role for notification
  const previousRole = targetProfile?.role

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

  // Sync updated role to JWT metadata for middleware performance
  try {
    const { syncUserMetadataFromProfile } = await import('@/lib/supabase/sync-user-metadata')
    await syncUserMetadataFromProfile(targetUserId)
  } catch (e) {
    console.error('Failed to sync user metadata after role change:', e)
    // Don't fail the operation if metadata sync fails
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

  // Invalidate owner dashboard cache (user data changed)
  try {
    const { invalidateOwnerDashboardCache } = await import('@/lib/dashboard-cache-actions')
    await invalidateOwnerDashboardCache()
  } catch (e) {
    console.error('Failed to invalidate dashboard cache:', e)
  }

  // Send notification for role change
  try {
    const { data: updatedProfile } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('user_id', targetUserId)
      .single()

    if (updatedProfile) {
      const { notifyUserActivity } = await import('@/lib/notifications/notification-triggers')
      await notifyUserActivity(
        {
          id: updatedProfile.id,
          email: updatedProfile.email,
          full_name: updatedProfile.full_name || undefined,
          role: newRole,
          previousRole: previousRole || undefined,
        },
        'role_changed'
      )
    }
  } catch (e) {
    console.error('Failed to send role change notification:', e)
  }

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

  console.log(`getAllUsers: Fetched ${data?.length || 0} users`)

  return data as UserProfile[]
}


/**
 * Create a pre-registered user (owner/admin only)
 * Creates a profile with user_id=null that will be linked on first login
 */
export async function createPreregisteredUser(
  email: string,
  fullName: string,
  role: UserRole,
  customPermissions?: Partial<UserPermissions>
): Promise<{ success: boolean; error?: string; profile?: UserProfile }> {
  // Verify caller has permission to manage users
  await requirePermission('can_manage_users')

  const supabase = await createClient()

  // Prevent creating owner role
  if (role === 'owner') {
    return {
      success: false,
      error: 'Owner role cannot be assigned',
    }
  }

  // Check if email already exists
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()

  if (existingProfile) {
    return {
      success: false,
      error: 'User with this email already exists',
    }
  }

  // Get default permissions for the role
  const defaultPerms = DEFAULT_PERMISSIONS[role]
  const permissions = { ...defaultPerms, ...customPermissions }

  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: null, // Pre-registered, will be linked on first login
      email: email.toLowerCase(),
      full_name: fullName || null,
      avatar_url: null,
      role,
      custom_dashboard: 'default',
      is_active: true,
      ...permissions,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating pre-registered user:', error)
    return { success: false, error: error.message }
  }

  // Invalidate owner dashboard cache (new user added)
  try {
    const { invalidateOwnerDashboardCache } = await import('@/lib/dashboard-cache-actions')
    await invalidateOwnerDashboardCache()
  } catch (e) {
    console.error('Failed to invalidate dashboard cache:', e)
  }

  return { success: true, profile: data as UserProfile }
}

/**
 * Toggle user active status (owner/admin only)
 * Cannot deactivate self or owner
 */
export async function toggleUserActive(
  targetProfileId: string,
  newActiveStatus: boolean
): Promise<{ success: boolean; error?: string }> {
  // Verify caller has permission to manage users
  const callerProfile = await requirePermission('can_manage_users')

  const supabase = await createClient()

  // Get target profile
  const { data: targetProfile } = await supabase
    .from('user_profiles')
    .select('id, user_id, role, email')
    .eq('id', targetProfileId)
    .single()

  if (!targetProfile) {
    return { success: false, error: 'User not found' }
  }

  // Prevent deactivating owner
  if (targetProfile.role === 'owner') {
    return {
      success: false,
      error: 'Cannot deactivate owner account',
    }
  }

  // Prevent self-deactivation
  if (targetProfile.user_id === callerProfile.user_id && !newActiveStatus) {
    return {
      success: false,
      error: 'Cannot deactivate your own account',
    }
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      is_active: newActiveStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetProfileId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Sync updated active status to JWT metadata for middleware performance
  // Only sync if user has a linked auth account
  if (targetProfile.user_id) {
    try {
      const { syncUserMetadataFromProfile } = await import('@/lib/supabase/sync-user-metadata')
      await syncUserMetadataFromProfile(targetProfile.user_id)
    } catch (e) {
      console.error('Failed to sync user metadata after active status change:', e)
      // Don't fail the operation if metadata sync fails
    }
  }

  // Log the activity
  await supabase.from('activity_log').insert({
    action_type: newActiveStatus ? 'user_activated' : 'user_deactivated',
    document_type: 'user',
    document_id: targetProfileId,
    document_number: targetProfile.email,
    user_id: callerProfile.user_id,
    user_name: callerProfile.full_name || callerProfile.email,
  })

  // Invalidate owner dashboard cache (user data changed)
  try {
    const { invalidateOwnerDashboardCache } = await import('@/lib/dashboard-cache-actions')
    await invalidateOwnerDashboardCache()
  } catch (e) {
    console.error('Failed to invalidate dashboard cache:', e)
  }

  // Send notification for deactivation
  if (!newActiveStatus) {
    try {
      const { notifyUserActivity } = await import('@/lib/notifications/notification-triggers')
      await notifyUserActivity(
        {
          id: targetProfileId,
          email: targetProfile.email,
          role: targetProfile.role,
        },
        'deactivated'
      )
    } catch (e) {
      console.error('Failed to send deactivation notification:', e)
    }
  }

  return { success: true }
}

/**
 * Get owner dashboard data
 */
export async function getOwnerDashboardData() {
  await requireRole(['owner', 'director'])

  const supabase = await createClient()

  // Get user metrics
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, role, is_active, user_id, last_login_at, email, full_name, department_scope')

  const userMetrics = {
    totalUsers: users?.length || 0,
    activeUsers: users?.filter(u => u.is_active).length || 0,
    inactiveUsers: users?.filter(u => !u.is_active).length || 0,
    pendingUsers: users?.filter(u => u.user_id === null).length || 0,
    usersByRole: {
      owner: users?.filter(u => u.role === 'owner').length || 0,
      director: users?.filter(u => u.role === 'director').length || 0,
      manager: users?.filter(u => u.role === 'manager').length || 0,
      sysadmin: users?.filter(u => u.role === 'sysadmin').length || 0,
      administration: users?.filter(u => u.role === 'administration').length || 0,
      finance: users?.filter(u => u.role === 'finance').length || 0,
      marketing: users?.filter(u => u.role === 'marketing').length || 0,
      ops: users?.filter(u => u.role === 'ops').length || 0,
      engineer: users?.filter(u => u.role === 'engineer').length || 0,
      hr: users?.filter(u => u.role === 'hr').length || 0,
      hse: users?.filter(u => u.role === 'hse').length || 0,
    },
  }

  // Get recent logins (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentLogins = users
    ?.filter(u => u.last_login_at && new Date(u.last_login_at) > sevenDaysAgo)
    .sort((a, b) => new Date(b.last_login_at!).getTime() - new Date(a.last_login_at!).getTime())
    .slice(0, 10)
    .map(u => ({
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      lastLoginAt: u.last_login_at,
    })) || []

  // Get system KPIs
  const [pjoCount, joCount, invoiceCount, revenueData] = await Promise.all([
    supabase.from('proforma_job_orders').select('id', { count: 'exact', head: true }),
    supabase.from('job_orders').select('id', { count: 'exact', head: true }),
    supabase.from('invoices').select('id', { count: 'exact', head: true }),
    supabase.from('job_orders').select('final_revenue, final_cost'),
  ])

  const totalRevenue = revenueData.data?.reduce((sum, jo) => sum + (jo.final_revenue || 0), 0) || 0
  const totalCost = revenueData.data?.reduce((sum, jo) => sum + (jo.final_cost || 0), 0) || 0

  const systemKPIs = {
    totalPJOs: pjoCount.count || 0,
    totalJOs: joCount.count || 0,
    totalInvoices: invoiceCount.count || 0,
    totalRevenue,
    totalProfit: totalRevenue - totalCost,
  }

  return {
    userMetrics,
    recentLogins,
    systemKPIs,
  }
}

/**
 * Update a user's department scope (for managers)
 */
export async function updateUserDepartmentScope(
  targetUserId: string,
  departmentScope: DepartmentScope[]
): Promise<{ success: boolean; error?: string }> {
  // Verify caller has permission to manage users
  const callerProfile = await requirePermission('can_manage_users')

  const supabase = await createClient()

  // Check if target is a manager
  const { data: targetProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', targetUserId)
    .single()

  if (!targetProfile) {
    return { success: false, error: 'User not found' }
  }

  if (targetProfile.role !== 'manager') {
    return { success: false, error: 'Department scope can only be set for managers' }
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      department_scope: departmentScope,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', targetUserId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Log the activity
  await supabase.from('activity_log').insert({
    action_type: 'user_department_scope_changed',
    document_type: 'user',
    document_id: targetUserId,
    document_number: departmentScope.join(', '),
    user_id: callerProfile.user_id,
    user_name: callerProfile.full_name || callerProfile.email,
  })

  return { success: true }
}

/**
 * Check if user can access a feature (server-side)
 */
export async function checkFeatureAccess(feature: FeatureKey): Promise<boolean> {
  const profile = await getUserProfile()
  return canAccessFeature(profile, feature)
}

/**
 * Require feature access - throws error if not authorized
 */
export async function requireFeatureAccess(feature: FeatureKey): Promise<UserProfile> {
  const profile = await getUserProfile()

  if (!profile) {
    throw new Error('Unauthorized: Not logged in')
  }

  if (!canAccessFeature(profile, feature)) {
    throw new Error(`Forbidden: No access to feature ${feature}`)
  }

  return profile
}
