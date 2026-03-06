'use server'

/**
 * Server Actions for Role Request System
 * v0.84: Role Request System
 * 
 * Provides server actions for:
 * - Submitting new role requests
 * - Getting user's existing role request
 * 
 * Requirements: 1.4, 1.5, 1.6, 2.1, 2.2, 6.1
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { RoleRequest, RoleRequestActionResult, RoleRequestFormData } from '@/types/role-request'
import { ADMIN_ROLES, DEPARTMENT_ROLES } from '@/lib/permissions'
import { createBulkNotifications } from '@/lib/notifications/notification-service'

// =====================================================
// SUBMIT ROLE REQUEST
// =====================================================

/**
 * Submit a new role request
 * 
 * Requirements:
 * - 1.4: Create a new role_request record with status 'pending'
 * - 1.5: Store user_id, user_email, user_name, requested_role, requested_department, reason
 * - 1.6: Prevent submission if user has a pending request
 * 
 * @param data - The role request form data
 * @returns Result indicating success or failure with error message
 */
export async function submitRoleRequest(
  data: RoleRequestFormData
): Promise<RoleRequestActionResult> {
  const supabase = await createClient()
  
  // Get the current authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return {
      success: false,
      error: 'You must be logged in to submit a role request',
    }
  }
  
  // Validate the requested role is valid for the department
  const allowedRoles = DEPARTMENT_ROLES[data.requestedDepartment]
  if (!allowedRoles || !allowedRoles.includes(data.requestedRole as typeof allowedRoles[number])) {
    return {
      success: false,
      error: 'Invalid role for the selected department',
    }
  }
  
  // Check if user already has a pending request (Requirement 1.6)
  // Using explicit type cast to handle table not yet in generated types
  const checkResult = await supabase
    .from('role_requests' as 'activity_log')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()
  
  const existingRequest = checkResult.data as { id: string; status: string } | null
  const checkError = checkResult.error
  
  if (checkError) {
    return {
      success: false,
      error: 'Failed to check for existing requests. Please try again.',
    }
  }
  
  if (existingRequest) {
    return {
      success: false,
      error: 'You already have a pending request. Please wait for admin review.',
    }
  }
  
  // Get user metadata for name
  const userName = user.user_metadata?.full_name || 
                   user.user_metadata?.name || 
                   null
  
  // Create the role request record (Requirements 1.4, 1.5)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertResult = await supabase
    .from('role_requests' as 'activity_log')
    .insert({
      user_id: user.id,
      user_email: user.email!,
      user_name: userName,
      requested_role: data.requestedRole,
      requested_department: data.requestedDepartment,
      reason: data.reason || null,
      status: 'pending',
    } as any)
  
  if (insertResult.error) {
    return {
      success: false,
      error: 'Failed to submit role request. Please try again.',
    }
  }
  
  // Revalidate the request-access page to show the new pending status
  revalidatePath('/request-access')
  
  // Create notification for admin users (Requirement 6.1)
  // Non-blocking: don't fail the request if notification fails
  try {
    await createBulkNotifications(
      {
        title: 'New Role Request',
        message: `${user.email} has requested the "${data.requestedRole}" role in ${data.requestedDepartment} department.`,
        type: 'system',
        priority: 'normal',
        actionUrl: '/settings/users',
        metadata: {
          requestedRole: data.requestedRole,
          requestedDepartment: data.requestedDepartment,
          userEmail: user.email,
          userName: userName,
        },
      },
      {
        roles: [...ADMIN_ROLES],
      }
    )
  } catch {
    // Log but don't fail the request
  }
  
  return { success: true }
}

// =====================================================
// GET USER ROLE REQUEST
// =====================================================

/**
 * Get the current user's latest role request
 * 
 * Requirements:
 * - 2.1: Display pending request details and status
 * - 2.2: Display rejection reason for rejected requests
 * 
 * @returns The user's latest role request or null if none exists
 */
export async function getUserRoleRequest(): Promise<RoleRequest | null> {
  const supabase = await createClient()
  
  // Get the current authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return null
  }
  
  // Get the user's latest role request (most recent first)
  // Using explicit type cast to handle table not yet in generated types
  const fetchResult = await supabase
    .from('role_requests' as 'activity_log')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (fetchResult.error) {
    return null
  }
  
  return fetchResult.data as RoleRequest | null
}
