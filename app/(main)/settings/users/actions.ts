'use server'

import { createClient } from '@/lib/supabase/server'
import { updateUserRole, createPreregisteredUser, toggleUserActive, getUserProfile } from '@/lib/permissions-server'
import { UserRole, UserPermissions } from '@/types/permissions'
import { RoleRequestWithUser } from '@/types/role-request'
import { revalidatePath } from 'next/cache'

/**
 * Get all pending role requests for admin review
 * Queries role_requests table with status='pending'
 * Orders by created_at descending (newest first)
 * 
 * Requirements: 3.1, 3.2
 */
export async function getPendingRoleRequests(): Promise<RoleRequestWithUser[]> {
  try {
    // Check admin role
    const adminProfile = await getUserProfile()
    if (!adminProfile) {
      return []
    }
    if (!adminProfile.can_manage_users) {
      return []
    }

    const supabase = await createClient()

    // Using type cast because role_requests table is not yet in generated types
    const { data, error } = await supabase
      .from('role_requests' as 'activity_log')
      .select('id, user_id, user_email, user_name, requested_role, requested_department, reason, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching pending role requests:', error)
      return []
    }
    
    // Cast to RoleRequestWithUser[] - the query returns the exact fields we need
    return (data || []) as unknown as RoleRequestWithUser[]
  } catch (error) {
    console.error('Error in getPendingRoleRequests:', error)
    return []
  }
}

/**
 * Approve a role request
 * Updates request status to 'approved', sets reviewed_by and reviewed_at
 * Updates user_profiles.role to the requested_role (or assignedRole if provided)
 * Syncs user metadata for middleware
 * 
 * Requirements: 3.3, 3.5
 * Validates: Property 7 - Approval State Transition
 */
export async function approveRoleRequest(
  requestId: string,
  assignedRole?: string // Optional override for the role
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Get the current admin user (for reviewed_by)
    const adminProfile = await getUserProfile()
    if (!adminProfile) {
      return { success: false, error: 'Not authenticated' }
    }
    
    // Check if admin has permission to manage users
    if (!adminProfile.can_manage_users) {
      return { success: false, error: 'You do not have permission to approve role requests' }
    }
    
    // Fetch the role request by ID
    // Using type cast because role_requests table is not yet in generated types
    const { data: roleRequest, error: fetchError } = await supabase
      .from('role_requests' as 'activity_log')
      .select('id, user_id, user_email, user_name, requested_role, requested_department, status')
      .eq('id', requestId)
      .single()
    
    if (fetchError || !roleRequest) {
      console.error('Error fetching role request:', fetchError)
      return { success: false, error: 'Role request not found' }
    }
    
    // Cast to proper type
    const request = roleRequest as unknown as {
      id: string
      user_id: string
      user_email: string
      user_name: string | null
      requested_role: string
      requested_department: string | null
      status: string
    }
    
    // Check if request is still pending
    if (request.status !== 'pending') {
      return { success: false, error: 'This request has already been processed' }
    }
    
    // Determine the role to assign (use override if provided, otherwise use requested_role)
    const roleToAssign = (assignedRole || request.requested_role) as UserRole
    
    // Prevent assigning owner role
    if (roleToAssign === 'owner') {
      return { success: false, error: 'Owner role cannot be assigned' }
    }
    
    const now = new Date().toISOString()
    
    // Update role_requests: status='approved', reviewed_by, reviewed_at
    const { error: updateRequestError } = await supabase
      .from('role_requests' as 'activity_log')
      .update({
        status: 'approved',
        reviewed_by: adminProfile.user_id,
        reviewed_at: now,
      } as Record<string, unknown>)
      .eq('id', requestId)
    
    if (updateRequestError) {
      console.error('Error updating role request:', updateRequestError)
      return { success: false, error: 'Failed to update role request status' }
    }
    
    // Get default permissions for the role
    const { DEFAULT_PERMISSIONS: defaultPerms } = await import('@/lib/permissions')
    const permissions = defaultPerms[roleToAssign] || defaultPerms.ops
    
    // Map role to appropriate dashboard
    const dashboardMap: Record<UserRole, string> = {
      owner: 'executive',
      director: 'executive',
      marketing_manager: 'manager',
      finance_manager: 'manager',
      operations_manager: 'manager',
      sysadmin: 'sysadmin',
      administration: 'default',
      finance: 'default',
      marketing: 'default',
      ops: 'default',
      engineer: 'default',
      hr: 'hr',
      hse: 'hse',
      agency: 'default',
      customs: 'default',
    }
    
    // Update user_profiles.role to the requested_role
    const { error: updateProfileError } = await supabase
      .from('user_profiles')
      .update({
        role: roleToAssign,
        custom_dashboard: dashboardMap[roleToAssign] || 'default',
        ...permissions,
        updated_at: now,
      })
      .eq('user_id', request.user_id)
    
    if (updateProfileError) {
      console.error('Error updating user profile:', updateProfileError)
      // Try to revert the role request status
      await supabase
        .from('role_requests' as 'activity_log')
        .update({ status: 'pending', reviewed_by: null, reviewed_at: null } as Record<string, unknown>)
        .eq('id', requestId)
      return { success: false, error: 'Failed to assign role to user' }
    }
    
    // Sync user metadata for middleware
    try {
      const { syncUserMetadataFromProfile } = await import('@/lib/supabase/sync-user-metadata')
      await syncUserMetadataFromProfile(request.user_id)
    } catch (e) {
      console.error('Failed to sync user metadata after role approval:', e)
      // Don't fail the operation if metadata sync fails
    }
    
    // Log the activity
    await supabase.from('activity_log').insert({
      action_type: 'role_request_approved',
      document_type: 'role_request',
      document_id: requestId,
      document_number: `${request.user_email} -> ${roleToAssign}`,
      user_id: adminProfile.user_id,
      user_name: adminProfile.full_name || adminProfile.email,
    })
    
    // Invalidate dashboard cache
    try {
      const { invalidateOwnerDashboardCache } = await import('@/lib/dashboard-cache-actions')
      await invalidateOwnerDashboardCache()
    } catch (e) {
      console.error('Failed to invalidate dashboard cache:', e)
    }
    
    // Create notification for the user (Requirement 6.2)
    // Non-blocking: don't fail the operation if notification fails
    try {
      const { createNotification } = await import('@/lib/notifications/notification-service')
      await createNotification({
        userId: request.user_id,
        title: 'Role Request Approved',
        message: `Your request for the "${roleToAssign}" role has been approved. You now have access to the system.`,
        type: 'system',
        priority: 'normal',
        actionUrl: '/dashboard',
        metadata: {
          requestId,
          approvedRole: roleToAssign,
          approvedBy: adminProfile.email,
        },
      })
    } catch (notificationError) {
      console.error('Failed to create user notification for approval:', notificationError)
    }
    
    // Revalidate the page to refresh the pending requests list
    revalidatePath('/settings/users')
    
    return { success: true }
  } catch (error) {
    console.error('Error in approveRoleRequest:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Reject a role request
 * Updates request status to 'rejected', stores admin_notes with rejection reason
 * Sets reviewed_by and reviewed_at
 * 
 * Requirements: 3.4, 3.5
 * Validates: Property 8 - Rejection State Transition
 */
export async function rejectRoleRequest(
  requestId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Get the current admin user (for reviewed_by)
    const adminProfile = await getUserProfile()
    if (!adminProfile) {
      return { success: false, error: 'Not authenticated' }
    }
    
    // Check if admin has permission to manage users
    if (!adminProfile.can_manage_users) {
      return { success: false, error: 'You do not have permission to reject role requests' }
    }
    
    // Validate reason is provided
    if (!reason || reason.trim().length === 0) {
      return { success: false, error: 'Rejection reason is required' }
    }
    
    // Fetch the role request by ID
    // Using type cast because role_requests table is not yet in generated types
    const { data: roleRequest, error: fetchError } = await supabase
      .from('role_requests' as 'activity_log')
      .select('id, user_id, user_email, user_name, requested_role, requested_department, status')
      .eq('id', requestId)
      .single()
    
    if (fetchError || !roleRequest) {
      console.error('Error fetching role request:', fetchError)
      return { success: false, error: 'Role request not found' }
    }
    
    // Cast to proper type
    const request = roleRequest as unknown as {
      id: string
      user_id: string
      user_email: string
      user_name: string | null
      requested_role: string
      requested_department: string | null
      status: string
    }
    
    // Check if request is still pending
    if (request.status !== 'pending') {
      return { success: false, error: 'This request has already been processed' }
    }
    
    const now = new Date().toISOString()
    
    // Update role_requests: status='rejected', admin_notes=reason, reviewed_by, reviewed_at
    const { error: updateRequestError } = await supabase
      .from('role_requests' as 'activity_log')
      .update({
        status: 'rejected',
        admin_notes: reason.trim(),
        reviewed_by: adminProfile.user_id,
        reviewed_at: now,
      } as Record<string, unknown>)
      .eq('id', requestId)
    
    if (updateRequestError) {
      console.error('Error updating role request:', updateRequestError)
      return { success: false, error: 'Failed to update role request status' }
    }
    
    // Log the activity
    await supabase.from('activity_log').insert({
      action_type: 'role_request_rejected',
      document_type: 'role_request',
      document_id: requestId,
      document_number: `${request.user_email} - ${request.requested_role}`,
      user_id: adminProfile.user_id,
      user_name: adminProfile.full_name || adminProfile.email,
      details: { reason: reason.trim() },
    })
    
    // Create notification for the user (Requirement 6.2)
    // Non-blocking: don't fail the operation if notification fails
    try {
      const { createNotification } = await import('@/lib/notifications/notification-service')
      await createNotification({
        userId: request.user_id,
        title: 'Role Request Rejected',
        message: `Your request for the "${request.requested_role}" role has been rejected. Reason: ${reason.trim()}`,
        type: 'system',
        priority: 'normal',
        actionUrl: '/request-access',
        metadata: {
          requestId,
          requestedRole: request.requested_role,
          rejectionReason: reason.trim(),
          rejectedBy: adminProfile.email,
        },
      })
    } catch (notificationError) {
      console.error('Failed to create user notification for rejection:', notificationError)
    }
    
    // Revalidate the page to refresh the pending requests list
    revalidatePath('/settings/users')
    
    return { success: true }
  } catch (error) {
    console.error('Error in rejectRoleRequest:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function updateUserRoleAction(
  targetUserId: string,
  newRole: UserRole,
  customPermissions?: Partial<UserPermissions>
): Promise<{ success: boolean; error?: string }> {
  return updateUserRole(targetUserId, newRole, customPermissions)
}

export async function createPreregisteredUserAction(
  email: string,
  fullName: string,
  role: UserRole,
  customPermissions?: Partial<UserPermissions>
): Promise<{ success: boolean; error?: string }> {
  return createPreregisteredUser(email, fullName, role, customPermissions)
}

export async function toggleUserActiveAction(
  targetProfileId: string,
  newActiveStatus: boolean
): Promise<{ success: boolean; error?: string }> {
  return toggleUserActive(targetProfileId, newActiveStatus)
}
