'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/permissions-server'
import { ActivityLogEntry, ActivityLogFilters, ActivityLogUser } from '@/types/activity-log'
import { getDateThreshold } from '@/lib/activity-log-utils'

export interface GetActivityLogsResult {
  logs: ActivityLogEntry[]
  total: number
}

/**
 * Get activity logs with filters and pagination
 * Access control is enforced by RLS policies
 */
export async function getActivityLogs(
  filters: ActivityLogFilters,
  page: number = 1,
  pageSize: number = 25
): Promise<GetActivityLogsResult> {
  const supabase = await createClient()
  const profile = await getUserProfile()

  if (!profile) {
    return { logs: [], total: 0 }
  }

  // Build query
  let query = supabase
    .from('activity_log')
    .select('*', { count: 'exact' })

  // Apply action type filter
  if (filters.actionType && filters.actionType !== 'all') {
    // Handle grouped action types (approved includes pjo_approved)
    if (filters.actionType === 'approved') {
      query = query.or('action_type.eq.approved,action_type.eq.pjo_approved')
    } else if (filters.actionType === 'rejected') {
      query = query.or('action_type.eq.rejected,action_type.eq.pjo_rejected')
    } else {
      query = query.eq('action_type', filters.actionType)
    }
  }

  // Apply entity type filter
  if (filters.entityType && filters.entityType !== 'all') {
    query = query.eq('document_type', filters.entityType)
  }

  // Apply user filter (only for owner/admin)
  if (filters.userId && filters.userId !== 'all') {
    if (profile.role === 'owner' || profile.role === 'admin') {
      query = query.eq('user_id', filters.userId)
    }
  }

  // Apply date range filter
  const dateThreshold = getDateThreshold(filters.dateRange)
  if (dateThreshold) {
    query = query.gte('created_at', dateThreshold.toISOString())
  }

  // Apply pagination and ordering
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query = query
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching activity logs:', error)
    return { logs: [], total: 0 }
  }

  return {
    logs: (data as ActivityLogEntry[]) || [],
    total: count || 0,
  }
}

/**
 * Get list of users for filter dropdown
 * Only available to owner/admin
 */
export async function getActivityLogUsers(): Promise<ActivityLogUser[]> {
  const supabase = await createClient()
  const profile = await getUserProfile()

  // Only owner/admin can see user filter
  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
    return []
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, email')
    .not('user_id', 'is', null)
    .order('full_name')

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return (data || []).map(user => ({
    id: user.user_id as string,
    name: user.full_name || user.email || 'Unknown User',
  }))
}

/**
 * Get all activity logs for CSV export (with current filters)
 * Only available to owner/admin
 */
export async function getActivityLogsForExport(
  filters: ActivityLogFilters
): Promise<ActivityLogEntry[]> {
  const supabase = await createClient()
  const profile = await getUserProfile()

  // Only owner/admin can export
  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
    return []
  }

  // Build query without pagination
  let query = supabase
    .from('activity_log')
    .select('*')

  // Apply action type filter
  if (filters.actionType && filters.actionType !== 'all') {
    if (filters.actionType === 'approved') {
      query = query.or('action_type.eq.approved,action_type.eq.pjo_approved')
    } else if (filters.actionType === 'rejected') {
      query = query.or('action_type.eq.rejected,action_type.eq.pjo_rejected')
    } else {
      query = query.eq('action_type', filters.actionType)
    }
  }

  // Apply entity type filter
  if (filters.entityType && filters.entityType !== 'all') {
    query = query.eq('document_type', filters.entityType)
  }

  // Apply user filter
  if (filters.userId && filters.userId !== 'all') {
    query = query.eq('user_id', filters.userId)
  }

  // Apply date range filter
  const dateThreshold = getDateThreshold(filters.dateRange)
  if (dateThreshold) {
    query = query.gte('created_at', dateThreshold.toISOString())
  }

  // Limit to 10000 records for export
  query = query
    .order('created_at', { ascending: false })
    .limit(10000)

  const { data, error } = await query

  if (error) {
    console.error('Error fetching activity logs for export:', error)
    return []
  }

  return (data as ActivityLogEntry[]) || []
}
