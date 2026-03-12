'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sanitizeSearchInput } from '@/lib/utils/sanitize'
import {
  EnhancedNotification,
  NotificationCenterFilters,
} from '@/types/notification-center'
import { getCategoryFromType } from './notification-center-utils'

/**
 * Archive a single notification
 * Sets is_archived=true and archived_at timestamp
 */
export async function archiveNotification(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('notifications')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
      })
      .eq('id', notificationId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/notifications')
    return { success: true }
  } catch (_err) {
    return { success: false, error: 'Failed to archive notification' }
  }
}

/**
 * Archive all notifications for a user
 * Optionally filter by read status
 */
export async function archiveAllNotifications(
  userId: string,
  options?: { readOnly?: boolean }
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('notifications')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_archived', false)
      .is('deleted_at', null)

    if (options?.readOnly) {
      query = query.eq('is_read', true)
    }

    const { data, error } = await query.select('id')

    if (error) {
      return { success: false, count: 0, error: error.message }
    }

    revalidatePath('/notifications')
    return { success: true, count: data?.length || 0 }
  } catch (_err) {
    return { success: false, count: 0, error: 'Failed to archive notifications' }
  }
}


/**
 * Get notifications with enhanced filters and pagination
 */
export async function getNotificationsWithFilters(
  userId: string,
  filters: NotificationCenterFilters,
  options?: { limit?: number; offset?: number; includeArchived?: boolean }
): Promise<{ notifications: EnhancedNotification[]; total: number; error?: string }> {
  try {
    const supabase = await createClient()
    const limit = options?.limit || 25
    const offset = options?.offset || 0

    // Build base query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null)

    // Exclude archived unless explicitly requested
    if (!options?.includeArchived) {
      query = query.eq('is_archived', false)
    }

    // Apply status filter
    if (filters.status === 'unread') {
      query = query.eq('is_read', false)
    } else if (filters.status === 'read') {
      query = query.eq('is_read', true)
    }

    // Apply category filter
    if (filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    // Apply priority filter
    if (filters.priority !== 'all') {
      query = query.eq('priority', filters.priority)
    }

    // Apply search filter (title or message contains search query)
    if (filters.searchQuery.trim()) {
      const searchTerm = `%${sanitizeSearchInput(filters.searchQuery.trim())}%`
      query = query.or(`title.ilike.${searchTerm},message.ilike.${searchTerm}`)
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      return { notifications: [], total: 0, error: error.message }
    }

    return {
      notifications: (data || []) as EnhancedNotification[],
      total: count || 0,
    }
  } catch (_err) {
    return { notifications: [], total: 0, error: 'Failed to fetch notifications' }
  }
}

/**
 * Execute a quick action on a notification
 * Handles approve/reject type actions for approvals
 */
export async function executeQuickAction(
  notificationId: string,
  action: 'approve' | 'reject' | 'view' | 'dismiss'
): Promise<{ success: boolean; redirectUrl?: string; error?: string }> {
  try {
    const supabase = await createClient()

    // Get the notification to check its type and metadata
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .single()

    if (fetchError || !notification) {
      return { success: false, error: 'Notification not found' }
    }

    // Mark as read
    await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)

    // Handle different actions
    switch (action) {
      case 'view':
        // Just return the action URL for navigation
        return {
          success: true,
          redirectUrl: notification.action_url || undefined,
        }

      case 'dismiss':
        // Archive the notification
        await supabase
          .from('notifications')
          .update({
            is_archived: true,
            archived_at: new Date().toISOString(),
          })
          .eq('id', notificationId)
        return { success: true }

      case 'approve':
      case 'reject':
        // For approval actions, we need to handle based on entity type
        if (notification.entity_type === 'pjo' && notification.entity_id) {
          // Redirect to PJO approval page
          return {
            success: true,
            redirectUrl: `/proforma-jo/${notification.entity_id}?action=${action}`,
          }
        }
        if (notification.entity_type === 'leave_request' && notification.entity_id) {
          return {
            success: true,
            redirectUrl: `/hr/leave/${notification.entity_id}?action=${action}`,
          }
        }
        // Default: just return the action URL
        return {
          success: true,
          redirectUrl: notification.action_url || undefined,
        }

      default:
        return { success: false, error: 'Unknown action' }
    }
  } catch (_err) {
    return { success: false, error: 'Failed to execute action' }
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (_err) {
    return { success: false, error: 'Failed to mark notification as read' }
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false)
      .is('deleted_at', null)
      .select('id')

    if (error) {
      return { success: false, count: 0, error: error.message }
    }

    revalidatePath('/notifications')
    return { success: true, count: data?.length || 0 }
  } catch (_err) {
    return { success: false, count: 0, error: 'Failed to mark all as read' }
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(
  userId: string
): Promise<{ count: number; error?: string }> {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .eq('is_archived', false)
      .is('deleted_at', null)

    if (error) {
      return { count: 0, error: error.message }
    }

    return { count: count || 0 }
  } catch (_err) {
    return { count: 0, error: 'Failed to get unread count' }
  }
}

/**
 * Update notification category based on type
 * Used for migrating existing notifications
 */
export async function updateNotificationCategory(
  notificationId: string,
  type: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const category = getCategoryFromType(type)

    const { error } = await supabase
      .from('notifications')
      .update({ category })
      .eq('id', notificationId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (_err) {
    return { success: false, error: 'Failed to update category' }
  }
}
