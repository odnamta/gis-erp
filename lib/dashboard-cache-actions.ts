'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/permissions-server'
import { 
  getOrFetch, 
  generateCacheKey, 
  invalidateCacheByPrefix 
} from '@/lib/dashboard-cache'
import { CACHE_KEYS, CACHE_TTL } from '@/lib/dashboard-cache-constants'

/**
 * Owner Dashboard Data Types
 */
export interface OwnerUserMetrics {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  pendingUsers: number
  usersByRole: Record<string, number>
}

export interface OwnerSystemKPIs {
  totalPJOs: number
  totalJOs: number
  totalInvoices: number
  totalRevenue: number
  totalProfit: number
}

export interface RecentLogin {
  id: string
  email: string
  fullName: string | null
  lastLoginAt: string | null
}

export interface OwnerDashboardData {
  userMetrics: OwnerUserMetrics
  recentLogins: RecentLogin[]
  systemKPIs: OwnerSystemKPIs
}

/**
 * Fetch user metrics with caching
 * TTL: 5 minutes (users don't change frequently)
 */
export async function fetchCachedUserMetrics(): Promise<OwnerUserMetrics> {
  const cacheKey = await generateCacheKey(CACHE_KEYS.OWNER_USER_METRICS, 'owner')
  
  return getOrFetch(cacheKey, async () => {
    const supabase = await createClient()
    
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, role, is_active, user_id')
    
    return {
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
  }, CACHE_TTL.DEFAULT)
}

/**
 * Fetch system KPIs with caching
 * TTL: 1 minute (financial data changes more frequently)
 */
export async function fetchCachedSystemKPIs(): Promise<OwnerSystemKPIs> {
  const cacheKey = await generateCacheKey(CACHE_KEYS.OWNER_SYSTEM_KPIS, 'owner')
  
  return getOrFetch(cacheKey, async () => {
    const supabase = await createClient()
    
    const [pjoCount, joCount, invoiceCount, revenueData] = await Promise.all([
      supabase.from('proforma_job_orders').select('id', { count: 'exact', head: true }),
      supabase.from('job_orders').select('id', { count: 'exact', head: true }),
      supabase.from('invoices').select('id', { count: 'exact', head: true }),
      supabase.from('job_orders').select('final_revenue, final_cost'),
    ])
    
    const totalRevenue = revenueData.data?.reduce((sum, jo) => sum + (jo.final_revenue || 0), 0) || 0
    const totalCost = revenueData.data?.reduce((sum, jo) => sum + (jo.final_cost || 0), 0) || 0
    
    return {
      totalPJOs: pjoCount.count || 0,
      totalJOs: joCount.count || 0,
      totalInvoices: invoiceCount.count || 0,
      totalRevenue,
      totalProfit: totalRevenue - totalCost,
    }
  }, CACHE_TTL.SHORT)
}

/**
 * Fetch recent logins with caching
 * TTL: 1 minute (login activity changes frequently)
 */
export async function fetchCachedRecentLogins(): Promise<RecentLogin[]> {
  const cacheKey = await generateCacheKey(CACHE_KEYS.OWNER_RECENT_LOGINS, 'owner')
  
  return getOrFetch(cacheKey, async () => {
    const supabase = await createClient()
    
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, last_login_at')
      .gte('last_login_at', sevenDaysAgo.toISOString())
      .order('last_login_at', { ascending: false })
      .limit(10)
    
    return (users || []).map(u => ({
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      lastLoginAt: u.last_login_at,
    }))
  }, CACHE_TTL.SHORT)
}

/**
 * Fetch complete owner dashboard data with caching
 * Uses parallel fetching for optimal performance
 */
export async function fetchCachedOwnerDashboardData(): Promise<OwnerDashboardData> {
  await requireRole(['owner', 'director'])
  
  const cacheKey = await generateCacheKey(CACHE_KEYS.OWNER_DASHBOARD, 'owner')
  
  return getOrFetch(cacheKey, async () => {
    // Fetch all sections in parallel
    const [userMetrics, systemKPIs, recentLogins] = await Promise.all([
      fetchCachedUserMetrics(),
      fetchCachedSystemKPIs(),
      fetchCachedRecentLogins(),
    ])
    
    return {
      userMetrics,
      systemKPIs,
      recentLogins,
    }
  }, CACHE_TTL.SHORT)
}

/**
 * Invalidate owner dashboard cache
 * Call this when user data changes (role updates, new users, etc.)
 */
export async function invalidateOwnerDashboardCache(): Promise<void> {
  await invalidateCacheByPrefix(CACHE_KEYS.OWNER_DASHBOARD)
  await invalidateCacheByPrefix(CACHE_KEYS.OWNER_USER_METRICS)
  await invalidateCacheByPrefix(CACHE_KEYS.OWNER_SYSTEM_KPIS)
  await invalidateCacheByPrefix(CACHE_KEYS.OWNER_RECENT_LOGINS)
}
