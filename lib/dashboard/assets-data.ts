'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrFetch, generateCacheKey } from '@/lib/dashboard-cache'

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface AssetSummary {
  total: number
  active: number        // status = 'available' or 'in_use'
  maintenance: number   // status = 'maintenance' or 'repair'
  idle: number          // status = 'available' AND assigned_to_job_id IS NULL
  disposed: number      // status = 'retired' or 'sold'
}

export interface CategoryCount {
  categoryId: string
  categoryName: string
  categoryCode: string
  count: number
}

export interface MaintenanceAlert {
  id: string
  assetId: string
  assetName: string
  assetCode: string
  maintenanceType: string
  dueDate: string
  status: 'overdue' | 'due_soon'
  overdueDays?: number
}

export interface RecentMaintenance {
  id: string
  recordNumber: string
  assetName: string
  assetCode: string
  maintenanceType: string
  maintenanceDate: string
  totalCost: number
}

export interface RecentAssignment {
  id: string
  assetName: string
  assetCode: string
  jobNumber: string | null
  assignedFrom: string
  assignedTo: string | null
}

export interface RecentStatusChange {
  id: string
  assetName: string
  assetCode: string
  previousStatus: string | null
  newStatus: string
  changedAt: string
  reason: string | null
}

export interface UtilizationMetrics {
  assignedToJobs: number
  idleAvailable: number
  utilizationRate: number  // percentage
}

export interface MaintenanceStats {
  overdueCount: number
  dueSoonCount: number
  completedLast7Days: number
}

export interface AssetsDashboardMetrics {
  summary: AssetSummary
  categories: CategoryCount[]
  maintenanceAlerts: MaintenanceAlert[]
  recentMaintenance: RecentMaintenance[]
  recentAssignments: RecentAssignment[]
  recentStatusChanges: RecentStatusChange[]
  utilization: UtilizationMetrics
  maintenanceStats: MaintenanceStats
}

// ============================================================================
// Constants
// ============================================================================

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// ============================================================================
// Main Data Fetcher
// ============================================================================

export async function getAssetsDashboardMetrics(): Promise<AssetsDashboardMetrics> {
  const cacheKey = await generateCacheKey('assets-dashboard-metrics', 'assets')
  
  return getOrFetch(cacheKey, async () => {
    const supabase = await createClient()
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Run all queries in parallel
    const [
      // Asset Summary Queries
      totalResult,
      activeResult,
      maintenanceResult,
      idleResult,
      disposedResult,
      // Category Counts
      categoriesResult,
      // Maintenance Alerts (from upcoming_maintenance view)
      alertsResult,
      // Recent Maintenance
      recentMaintenanceResult,
      // Recent Assignments
      recentAssignmentsResult,
      // Recent Status Changes
      recentStatusChangesResult,
      // Utilization Metrics
      assignedToJobsResult,
      totalActiveResult,
      // Maintenance Stats
      completedLast7DaysResult,
    ] = await Promise.all([
      // Total count
      supabase
        .from('assets')
        .select('id', { count: 'exact', head: true }),
      
      // Active count (available + in_use)
      supabase
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .in('status', ['available', 'in_use']),
      
      // Maintenance count (maintenance + repair)
      supabase
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .in('status', ['maintenance', 'repair']),
      
      // Idle count (available but not assigned to job)
      supabase
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'available')
        .is('assigned_to_job_id', null),
      
      // Disposed count (retired + sold)
      supabase
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .in('status', ['retired', 'sold']),
      
      // Category counts with asset count
      supabase
        .from('asset_categories')
        .select(`
          id,
          category_name,
          category_code,
          assets:assets(count)
        `)
        .eq('is_active', true)
        .order('display_order'),
      
      // Maintenance alerts from upcoming_maintenance view
      supabase
        .from('upcoming_maintenance')
        .select('*')
        .in('status', ['overdue', 'due_soon'])
        .order('next_due_date', { ascending: true })
        .limit(10),
      
      // Recent maintenance (last 7 days)
      supabase
        .from('maintenance_records')
        .select(`
          id,
          record_number,
          maintenance_date,
          total_cost,
          assets:asset_id(asset_name, asset_code),
          maintenance_types:maintenance_type_id(type_name)
        `)
        .gte('maintenance_date', sevenDaysAgo.toISOString())
        .order('maintenance_date', { ascending: false })
        .limit(5),
      
      // Recent assignments
      supabase
        .from('asset_assignments')
        .select(`
          id,
          assigned_from,
          assigned_to,
          assets:asset_id(asset_name, asset_code),
          job_orders:job_order_id(jo_number)
        `)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Recent status changes
      supabase
        .from('asset_status_history')
        .select(`
          id,
          previous_status,
          new_status,
          changed_at,
          reason,
          assets:asset_id(asset_name, asset_code)
        `)
        .order('changed_at', { ascending: false })
        .limit(5),
      
      // Assigned to jobs count (for utilization)
      supabase
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .not('assigned_to_job_id', 'is', null)
        .in('status', ['available', 'in_use']),
      
      // Total active for utilization rate
      supabase
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .in('status', ['available', 'in_use']),
      
      // Completed maintenance in last 7 days
      supabase
        .from('maintenance_records')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('maintenance_date', sevenDaysAgo.toISOString()),
    ])


    // ========================================================================
    // Transform Asset Summary
    // ========================================================================
    const summary: AssetSummary = {
      total: totalResult.count || 0,
      active: activeResult.count || 0,
      maintenance: maintenanceResult.count || 0,
      idle: idleResult.count || 0,
      disposed: disposedResult.count || 0,
    }

    // ========================================================================
    // Transform Category Counts (exclude empty categories)
    // ========================================================================
    const categories: CategoryCount[] = (categoriesResult.data || [])
      .map(cat => {
        const assetCount = Array.isArray(cat.assets) 
          ? cat.assets.length 
          : (cat.assets as { count: number } | null)?.count || 0
        return {
          categoryId: cat.id,
          categoryName: cat.category_name || '',
          categoryCode: cat.category_code || '',
          count: assetCount,
        }
      })
      .filter(cat => cat.count > 0)

    // ========================================================================
    // Transform Maintenance Alerts
    // ========================================================================
    const maintenanceAlerts: MaintenanceAlert[] = (alertsResult.data || []).map((alert, index) => {
      const dueDate = new Date(alert.next_due_date || '')
      const overdueDays = alert.status === 'overdue' 
        ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : undefined
      
      return {
        id: `${alert.asset_id || 'unknown'}-${alert.maintenance_type_id || index}`,
        assetId: alert.asset_id || '',
        assetName: alert.asset_name || '',
        assetCode: alert.asset_code || '',
        maintenanceType: alert.maintenance_type || '',
        dueDate: alert.next_due_date || '',
        status: alert.status as 'overdue' | 'due_soon',
        overdueDays,
      }
    })

    // Count overdue and due_soon for stats
    const overdueCount = maintenanceAlerts.filter(a => a.status === 'overdue').length
    const dueSoonCount = maintenanceAlerts.filter(a => a.status === 'due_soon').length

    // ========================================================================
    // Transform Recent Maintenance
    // ========================================================================
    const recentMaintenance: RecentMaintenance[] = (recentMaintenanceResult.data || []).map(record => {
      const asset = record.assets as { asset_name: string; asset_code: string } | null
      const maintenanceType = record.maintenance_types as { type_name: string } | null
      
      return {
        id: record.id,
        recordNumber: record.record_number || '',
        assetName: asset?.asset_name || '',
        assetCode: asset?.asset_code || '',
        maintenanceType: maintenanceType?.type_name || '',
        maintenanceDate: record.maintenance_date || '',
        totalCost: record.total_cost || 0,
      }
    })

    // ========================================================================
    // Transform Recent Assignments
    // ========================================================================
    const recentAssignments: RecentAssignment[] = (recentAssignmentsResult.data || []).map(assignment => {
      const asset = assignment.assets as { asset_name: string; asset_code: string } | null
      const jobOrder = assignment.job_orders as { jo_number: string } | null
      
      return {
        id: assignment.id,
        assetName: asset?.asset_name || '',
        assetCode: asset?.asset_code || '',
        jobNumber: jobOrder?.jo_number || null,
        assignedFrom: assignment.assigned_from || '',
        assignedTo: assignment.assigned_to || null,
      }
    })

    // ========================================================================
    // Transform Recent Status Changes
    // ========================================================================
    const recentStatusChanges: RecentStatusChange[] = (recentStatusChangesResult.data || []).map(change => {
      const asset = change.assets as { asset_name: string; asset_code: string } | null
      
      return {
        id: change.id,
        assetName: asset?.asset_name || '',
        assetCode: asset?.asset_code || '',
        previousStatus: change.previous_status || null,
        newStatus: change.new_status || '',
        changedAt: change.changed_at || '',
        reason: change.reason || null,
      }
    })

    // ========================================================================
    // Calculate Utilization Metrics
    // ========================================================================
    const assignedToJobs = assignedToJobsResult.count || 0
    const totalActive = totalActiveResult.count || 0
    const utilizationRate = totalActive > 0 
      ? Math.round((assignedToJobs / totalActive) * 100)
      : 0

    const utilization: UtilizationMetrics = {
      assignedToJobs,
      idleAvailable: summary.idle,
      utilizationRate,
    }

    // ========================================================================
    // Maintenance Stats
    // ========================================================================
    const maintenanceStats: MaintenanceStats = {
      overdueCount,
      dueSoonCount,
      completedLast7Days: completedLast7DaysResult.count || 0,
    }

    return {
      summary,
      categories,
      maintenanceAlerts,
      recentMaintenance,
      recentAssignments,
      recentStatusChanges,
      utilization,
      maintenanceStats,
    }
  }, CACHE_TTL)
}
