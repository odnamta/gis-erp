import { createClient } from '@/lib/supabase/server'
import { getOrFetch, generateCacheKey } from '@/lib/dashboard-cache'

// =====================================================
// INTERFACES
// =====================================================

export interface RoleDistribution {
  role: string
  count: number
}

export interface RecentActivity {
  id: string
  userEmail: string | null
  actionType: string
  pagePath: string | null
  resourceType: string | null
  createdAt: string
}

export interface RecentDocumentChange {
  id: string
  userName: string
  actionType: string
  documentType: string
  documentNumber: string
  createdAt: string
}

export interface SysadminDashboardMetrics {
  // User Statistics
  totalUsers: number
  activeUsers: number
  activeToday: number
  activeThisWeek: number
  newUsersThisMonth: number
  
  // Role Distribution
  roleDistribution: RoleDistribution[]
  
  // System Activity
  loginsToday: number
  pageViewsToday: number
  totalActionsToday: number
  actionsPerHour: number
  
  // Recent Activity
  recentActivities: RecentActivity[]
  recentDocumentChanges: RecentDocumentChange[]
}

// =====================================================
// CONSTANTS
// =====================================================

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get start of current day (midnight)
 */
function getStartOfDay(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * Get start of current month
 */
function getStartOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

/**
 * Get date 7 days ago
 */
function getSevenDaysAgo(): Date {
  const now = new Date()
  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
}

/**
 * Calculate hours elapsed since start of day
 * Returns at least 1 to avoid division by zero
 */
export function calculateHoursElapsed(startOfDay: Date, now: Date): number {
  const diffMs = now.getTime() - startOfDay.getTime()
  const hours = diffMs / (1000 * 60 * 60)
  // Return at least 1 to avoid division by zero
  return Math.max(1, hours)
}

/**
 * Calculate actions per hour with division by zero handling
 */
export function calculateActionsPerHour(totalActions: number, hoursElapsed: number): number {
  if (hoursElapsed <= 0) {
    return 0
  }
  // Round to one decimal place
  return Math.round((totalActions / hoursElapsed) * 10) / 10
}

// =====================================================
// MAIN DATA FETCHER
// =====================================================

export async function getSysadminDashboardMetrics(
  role: string = 'sysadmin'
): Promise<SysadminDashboardMetrics> {
  const cacheKey = await generateCacheKey('sysadmin-dashboard-metrics', role)
  
  return getOrFetch(cacheKey, async () => {
    const supabase = await createClient()
    const now = new Date()
    const today = getStartOfDay().toISOString()
    const sevenDaysAgo = getSevenDaysAgo().toISOString()
    const startOfMonth = getStartOfMonth().toISOString()
    
    // Run all queries in parallel for performance
    const [
      // User statistics
      totalUsersResult,
      activeUsersResult,
      activeTodayResult,
      activeThisWeekResult,
      newUsersThisMonthResult,
      
      // Role distribution (active users only)
      roleDistributionResult,
      
      // System activity
      loginsTodayResult,
      pageViewsTodayResult,
      totalActionsTodayResult,
      
      // Recent activities
      recentActivitiesResult,
      
      // Recent document changes
      recentDocumentChangesResult,
    ] = await Promise.all([
      // Total users count
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true }),
      
      // Active users count (is_active = true)
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      
      // Active today (last_login_at >= today)
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('last_login_at', today),
      
      // Active this week (last_login_at >= 7 days ago)
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('last_login_at', sevenDaysAgo),
      
      // New users this month (created_at >= start of month)
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth),
      
      // Role distribution (active users only, grouped by role)
      supabase
        .from('user_profiles')
        .select('role')
        .eq('is_active', true),
      
      // Logins today (action_type = 'login' AND created_at >= today)
      supabase
        .from('user_activity_log')
        .select('id', { count: 'exact', head: true })
        .eq('action_type', 'login')
        .gte('created_at', today),
      
      // Page views today (action_type = 'page_view' AND created_at >= today)
      supabase
        .from('user_activity_log')
        .select('id', { count: 'exact', head: true })
        .eq('action_type', 'page_view')
        .gte('created_at', today),
      
      // Total actions today
      supabase
        .from('user_activity_log')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today),
      
      // Recent activities (last 20, ordered by created_at desc)
      supabase
        .from('user_activity_log')
        .select('id, user_email, action_type, page_path, resource_type, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
      
      // Recent document changes (last 10, ordered by created_at desc)
      supabase
        .from('activity_log')
        .select('id, user_name, action_type, document_type, document_number, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
    ])
    
    // Calculate role distribution
    const roleCountMap = new Map<string, number>()
    if (roleDistributionResult.data) {
      for (const user of roleDistributionResult.data) {
        const role = user.role || 'unknown'
        roleCountMap.set(role, (roleCountMap.get(role) || 0) + 1)
      }
    }
    
    // Convert to array and sort by count descending
    const roleDistribution: RoleDistribution[] = Array.from(roleCountMap.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count)
    
    // Calculate actions per hour
    const totalActionsToday = totalActionsTodayResult.count || 0
    const hoursElapsed = calculateHoursElapsed(getStartOfDay(), now)
    const actionsPerHour = calculateActionsPerHour(totalActionsToday, hoursElapsed)
    
    // Transform recent activities
    const recentActivities: RecentActivity[] = (recentActivitiesResult.data || []).map(activity => ({
      id: activity.id,
      userEmail: activity.user_email || null,
      actionType: activity.action_type || '',
      pagePath: activity.page_path || null,
      resourceType: activity.resource_type || null,
      createdAt: activity.created_at || '',
    }))
    
    // Transform recent document changes
    const recentDocumentChanges: RecentDocumentChange[] = (recentDocumentChangesResult.data || []).map(change => ({
      id: change.id,
      userName: change.user_name || '',
      actionType: change.action_type || '',
      documentType: change.document_type || '',
      documentNumber: change.document_number || '',
      createdAt: change.created_at || '',
    }))
    
    return {
      // User Statistics
      totalUsers: totalUsersResult.count || 0,
      activeUsers: activeUsersResult.count || 0,
      activeToday: activeTodayResult.count || 0,
      activeThisWeek: activeThisWeekResult.count || 0,
      newUsersThisMonth: newUsersThisMonthResult.count || 0,
      
      // Role Distribution
      roleDistribution,
      
      // System Activity
      loginsToday: loginsTodayResult.count || 0,
      pageViewsToday: pageViewsTodayResult.count || 0,
      totalActionsToday,
      actionsPerHour,
      
      // Recent Activity
      recentActivities,
      recentDocumentChanges,
    }
  }, CACHE_TTL)
}
