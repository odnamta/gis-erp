/**
 * Sales Dashboard Utility Functions
 * Provides calculations for pipeline, win rates, staleness, and customer analytics
 */

import type { ProformaJobOrder, Customer } from '@/types'

// Types
export type PeriodType = 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'custom'
export type StalenessLevel = 'normal' | 'warning' | 'alert'
export type TrendDirection = 'up' | 'down' | 'stable'
export type PipelineStatus = 'draft' | 'pending_approval' | 'approved' | 'converted' | 'rejected'

export interface PeriodFilter {
  type: PeriodType
  startDate: Date
  endDate: Date
}

export interface PipelineStage {
  status: PipelineStatus
  count: number
  value: number
  conversionRate: number | null
}

export interface PendingFollowup {
  id: string
  pjo_number: string
  customer_name: string
  value: number
  status: 'draft' | 'pending_approval'
  days_in_status: number
  staleness: StalenessLevel
  created_at: string
}

export interface TopCustomer {
  id: string
  name: string
  totalValue: number
  jobCount: number
  avgValue: number
  trend: TrendDirection
  trendPercentage: number
}

export interface WinLossCategory {
  count: number
  value: number
  percentage: number
}

export interface LossReason {
  reason: string
  count: number
}

export interface WinLossData {
  won: WinLossCategory
  lost: WinLossCategory
  pending: WinLossCategory
  lossReasons: LossReason[]
}

export interface SalesKPIs {
  pipelineValue: number
  pipelineCount: number
  winRate: number
  winRateTarget: number
  activePJOsCount: number
  newCustomersCount: number
}


// Input types for functions
export interface PJOInput {
  id: string
  status: string
  total_estimated_revenue?: number | null
  total_revenue_calculated?: number | null
  is_active?: boolean
  created_at?: string | null
  rejection_reason?: string | null
  converted_to_jo?: boolean | null
}

export interface CustomerPJOInput {
  customer_id: string
  customer_name: string
  total_estimated_revenue?: number | null
  total_revenue_calculated?: number | null
  status: string
  created_at?: string | null
}

// Pipeline Functions

/**
 * Calculate total pipeline value from active PJOs
 * Pipeline includes draft, pending_approval, and approved PJOs
 */
export function calculatePipelineValue(pjos: PJOInput[]): number {
  const pipelineStatuses = ['draft', 'pending_approval', 'approved']
  return pjos
    .filter((pjo) => pjo.is_active !== false && pipelineStatuses.includes(pjo.status))
    .reduce((sum, pjo) => sum + (pjo.total_revenue_calculated ?? pjo.total_estimated_revenue ?? 0), 0)
}

/**
 * Group PJOs by pipeline stage with count, value, and conversion rates
 * Includes all 5 statuses: draft, pending_approval, approved, converted, rejected
 */
export function groupPJOsByPipelineStage(pjos: PJOInput[]): PipelineStage[] {
  const statusOrder: PipelineStatus[] = [
    'draft',
    'pending_approval',
    'approved',
    'converted',
    'rejected',
  ]

  const groups: Record<PipelineStatus, { count: number; value: number }> = {
    draft: { count: 0, value: 0 },
    pending_approval: { count: 0, value: 0 },
    approved: { count: 0, value: 0 },
    converted: { count: 0, value: 0 },
    rejected: { count: 0, value: 0 },
  }

  // Filter to active PJOs and group by status
  const activePjos = pjos.filter((pjo) => pjo.is_active !== false)

  for (const pjo of activePjos) {
    // Map converted_to_jo to 'converted' status
    let status = pjo.status as PipelineStatus
    if (pjo.converted_to_jo === true && pjo.status === 'approved') {
      status = 'converted'
    }
    
    if (groups[status]) {
      groups[status].count += 1
      groups[status].value += pjo.total_revenue_calculated ?? pjo.total_estimated_revenue ?? 0
    }
  }

  // Calculate conversion rates
  const result: PipelineStage[] = []
  
  for (let i = 0; i < statusOrder.length; i++) {
    const status = statusOrder[i]
    let conversionRate: number | null = null

    // Calculate conversion rate to next stage (except for terminal stages)
    if (status === 'draft' && groups.draft.count > 0) {
      // Draft → Pending + Approved + Converted
      const movedForward = groups.pending_approval.count + groups.approved.count + groups.converted.count
      conversionRate = (movedForward / (movedForward + groups.draft.count)) * 100
    } else if (status === 'pending_approval' && groups.pending_approval.count > 0) {
      // Pending → Approved + Converted
      const movedForward = groups.approved.count + groups.converted.count
      conversionRate = (movedForward / (movedForward + groups.pending_approval.count)) * 100
    } else if (status === 'approved' && groups.approved.count > 0) {
      // Approved → Converted
      conversionRate = (groups.converted.count / (groups.converted.count + groups.approved.count)) * 100
    }
    // converted and rejected are terminal stages, no conversion rate

    result.push({
      status,
      count: groups[status].count,
      value: groups[status].value,
      conversionRate,
    })
  }

  return result
}


// Conversion and Win Rate Functions

/**
 * Calculate conversion rate between two stages
 * Returns percentage (0-100)
 */
export function calculateConversionRate(fromCount: number, toCount: number): number {
  if (fromCount === 0) return 0
  return (toCount / fromCount) * 100
}

/**
 * Calculate win rate from converted and rejected counts
 * Win rate = converted / (converted + rejected) * 100
 */
export function calculateWinRate(converted: number, rejected: number): number {
  const totalDecided = converted + rejected
  if (totalDecided === 0) return 0
  return (converted / totalDecided) * 100
}

/**
 * Calculate overall conversion rate from draft to converted
 * Overall = converted / total PJOs that entered pipeline
 */
export function calculateOverallConversionRate(pjos: PJOInput[]): number {
  const activePjos = pjos.filter(p => p.is_active !== false)
  const totalEntered = activePjos.length
  const converted = activePjos.filter(
    p => p.status === 'approved' && p.converted_to_jo === true
  ).length
  
  if (totalEntered === 0) return 0
  return (converted / totalEntered) * 100
}


// Staleness Classification Functions

/**
 * Calculate days since a date (days in current status)
 */
export function calculateDaysInStatus(createdAt: string, currentDate: Date): number {
  const created = new Date(createdAt)
  created.setHours(0, 0, 0, 0)
  const current = new Date(currentDate)
  current.setHours(0, 0, 0, 0)
  
  const diffTime = current.getTime() - created.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}

/**
 * Get staleness level based on status and days in status
 * - draft > 7 days: 'alert'
 * - draft > 5 days: 'warning'
 * - pending_approval > 3 days: 'warning'
 * - otherwise: 'normal'
 */
export function getStalenessLevel(status: string, daysInStatus: number): StalenessLevel {
  if (status === 'draft') {
    if (daysInStatus > 7) return 'alert'
    if (daysInStatus > 5) return 'warning'
  }
  if (status === 'pending_approval') {
    if (daysInStatus > 3) return 'warning'
  }
  return 'normal'
}

/**
 * Count stale PJOs (those with staleness != 'normal')
 */
export function countStalePJOs(followups: PendingFollowup[]): number {
  return followups.filter(f => f.staleness !== 'normal').length
}


// Pending Follow-ups Functions

export interface PJOWithCustomer {
  id: string
  pjo_number: string
  status: string
  total_estimated_revenue?: number | null
  total_revenue_calculated?: number | null
  created_at: string | null
  is_active?: boolean
  customer_name?: string
  projects?: {
    name: string
    customers: {
      name: string
    } | null
  } | null
}

/**
 * Filter and transform PJOs into pending follow-ups
 * Returns PJOs in draft or pending_approval status, sorted by days_in_status descending
 */
export function filterPendingFollowups(
  pjos: PJOWithCustomer[],
  currentDate: Date
): PendingFollowup[] {
  return pjos
    .filter((pjo) => {
      if (pjo.is_active === false) return false
      return pjo.status === 'draft' || pjo.status === 'pending_approval'
    })
    .map((pjo) => {
      const daysInStatus = pjo.created_at 
        ? calculateDaysInStatus(pjo.created_at, currentDate)
        : 0
      const customerName = pjo.customer_name ?? pjo.projects?.customers?.name ?? 'Unknown'
      
      return {
        id: pjo.id,
        pjo_number: pjo.pjo_number,
        customer_name: customerName,
        value: pjo.total_revenue_calculated ?? pjo.total_estimated_revenue ?? 0,
        status: pjo.status as 'draft' | 'pending_approval',
        days_in_status: daysInStatus,
        staleness: getStalenessLevel(pjo.status, daysInStatus),
        created_at: pjo.created_at ?? '',
      }
    })
    .sort((a, b) => b.days_in_status - a.days_in_status) // Oldest first (highest days)
}


// Top Customers Functions

/**
 * Calculate trend direction and percentage
 */
export function calculateCustomerTrend(
  currentValue: number,
  previousValue: number
): { trend: TrendDirection; percentage: number } {
  if (previousValue === 0) {
    if (currentValue > 0) return { trend: 'up', percentage: 100 }
    return { trend: 'stable', percentage: 0 }
  }
  
  const change = ((currentValue - previousValue) / previousValue) * 100
  
  if (change > 0) return { trend: 'up', percentage: Math.round(change) }
  if (change < 0) return { trend: 'down', percentage: Math.round(Math.abs(change)) }
  return { trend: 'stable', percentage: 0 }
}

/**
 * Rank customers by total PJO value
 */
export function rankCustomersByValue(
  pjos: CustomerPJOInput[],
  period: PeriodFilter,
  previousPeriod: PeriodFilter
): TopCustomer[] {
  // Filter PJOs by period (approved or converted only)
  const currentPeriodPjos = pjos.filter(pjo => {
    if (pjo.status !== 'approved' && pjo.status !== 'converted') return false
    if (!pjo.created_at) return false
    const createdAt = new Date(pjo.created_at)
    return createdAt >= period.startDate && createdAt <= period.endDate
  })

  const previousPeriodPjos = pjos.filter(pjo => {
    if (pjo.status !== 'approved' && pjo.status !== 'converted') return false
    if (!pjo.created_at) return false
    const createdAt = new Date(pjo.created_at)
    return createdAt >= previousPeriod.startDate && createdAt <= previousPeriod.endDate
  })

  // Aggregate by customer for current period
  const customerMap = new Map<string, { name: string; totalValue: number; jobCount: number }>()
  
  for (const pjo of currentPeriodPjos) {
    const existing = customerMap.get(pjo.customer_id) || { name: pjo.customer_name, totalValue: 0, jobCount: 0 }
    existing.totalValue += pjo.total_revenue_calculated ?? pjo.total_estimated_revenue ?? 0
    existing.jobCount += 1
    customerMap.set(pjo.customer_id, existing)
  }

  // Aggregate by customer for previous period
  const previousMap = new Map<string, number>()
  for (const pjo of previousPeriodPjos) {
    const existing = previousMap.get(pjo.customer_id) || 0
    previousMap.set(pjo.customer_id, existing + (pjo.total_revenue_calculated ?? pjo.total_estimated_revenue ?? 0))
  }

  // Convert to array and sort by value
  const customers: TopCustomer[] = Array.from(customerMap.entries())
    .map(([id, data]) => {
      const previousValue = previousMap.get(id) || 0
      const { trend, percentage } = calculateCustomerTrend(data.totalValue, previousValue)
      
      return {
        id,
        name: data.name,
        totalValue: data.totalValue,
        jobCount: data.jobCount,
        avgValue: data.jobCount > 0 ? Math.round(data.totalValue / data.jobCount) : 0,
        trend,
        trendPercentage: percentage,
      }
    })
    .sort((a, b) => b.totalValue - a.totalValue)

  return customers
}


// Win/Loss Analysis Functions

/**
 * Group rejection reasons with counts
 */
export function groupLossReasons(pjos: PJOInput[]): LossReason[] {
  const rejectedPjos = pjos.filter(p => p.status === 'rejected' && p.rejection_reason)
  
  const reasonMap = new Map<string, number>()
  for (const pjo of rejectedPjos) {
    const reason = pjo.rejection_reason!
    reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1)
  }
  
  return Array.from(reasonMap.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Calculate win/loss data with percentages
 */
export function calculateWinLossData(pjos: PJOInput[]): WinLossData {
  const activePjos = pjos.filter(p => p.is_active !== false)
  
  // Count by category
  const won = activePjos.filter(p => p.status === 'approved' && p.converted_to_jo === true)
  const lost = activePjos.filter(p => p.status === 'rejected')
  const pending = activePjos.filter(p => 
    p.status === 'draft' || 
    p.status === 'pending_approval' || 
    (p.status === 'approved' && p.converted_to_jo !== true)
  )
  
  const total = won.length + lost.length + pending.length
  
  const getValue = (items: PJOInput[]) => 
    items.reduce((sum, p) => sum + (p.total_revenue_calculated ?? p.total_estimated_revenue ?? 0), 0)
  
  const getPercentage = (count: number) => total > 0 ? Math.round((count / total) * 100) : 0
  
  return {
    won: {
      count: won.length,
      value: getValue(won),
      percentage: getPercentage(won.length),
    },
    lost: {
      count: lost.length,
      value: getValue(lost),
      percentage: getPercentage(lost.length),
    },
    pending: {
      count: pending.length,
      value: getValue(pending),
      percentage: getPercentage(pending.length),
    },
    lossReasons: groupLossReasons(activePjos),
  }
}


// Period Filter Functions

/**
 * Get start and end dates for a period type
 */
export function getPeriodDates(
  periodType: PeriodType,
  currentDate: Date,
  customStart?: Date,
  customEnd?: Date
): PeriodFilter {
  const current = new Date(currentDate)
  current.setHours(0, 0, 0, 0)
  
  let startDate: Date
  let endDate: Date
  
  switch (periodType) {
    case 'this_week': {
      // Start of week (Monday)
      const dayOfWeek = current.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Adjust for Monday start
      startDate = new Date(current)
      startDate.setDate(current.getDate() - diff)
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      break
    }
    case 'this_month': {
      startDate = new Date(current.getFullYear(), current.getMonth(), 1)
      endDate = new Date(current.getFullYear(), current.getMonth() + 1, 0)
      break
    }
    case 'this_quarter': {
      const quarter = Math.floor(current.getMonth() / 3)
      startDate = new Date(current.getFullYear(), quarter * 3, 1)
      endDate = new Date(current.getFullYear(), quarter * 3 + 3, 0)
      break
    }
    case 'this_year': {
      startDate = new Date(current.getFullYear(), 0, 1)
      endDate = new Date(current.getFullYear(), 11, 31)
      break
    }
    case 'custom': {
      startDate = customStart ? new Date(customStart) : current
      endDate = customEnd ? new Date(customEnd) : current
      break
    }
    default:
      startDate = new Date(current.getFullYear(), current.getMonth(), 1)
      endDate = new Date(current.getFullYear(), current.getMonth() + 1, 0)
  }
  
  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(23, 59, 59, 999)
  
  return { type: periodType, startDate, endDate }
}

/**
 * Get previous period dates for comparison
 */
export function getPreviousPeriodDates(period: PeriodFilter): PeriodFilter {
  const duration = period.endDate.getTime() - period.startDate.getTime()
  
  const previousEnd = new Date(period.startDate.getTime() - 1)
  const previousStart = new Date(previousEnd.getTime() - duration)
  
  previousStart.setHours(0, 0, 0, 0)
  previousEnd.setHours(23, 59, 59, 999)
  
  return { type: period.type, startDate: previousStart, endDate: previousEnd }
}

/**
 * Filter PJOs by period
 */
export function filterPJOsByPeriod<T extends { created_at?: string | null }>(
  pjos: T[],
  period: PeriodFilter
): T[] {
  return pjos.filter(pjo => {
    if (!pjo.created_at) return false
    const createdAt = new Date(pjo.created_at)
    return createdAt >= period.startDate && createdAt <= period.endDate
  })
}


// KPI Aggregation Function

const WIN_RATE_TARGET = 60 // Default target win rate percentage

/**
 * Calculate all sales KPIs
 */
export function calculateSalesKPIs(
  pjos: PJOInput[],
  newCustomersCount: number,
  period: PeriodFilter
): SalesKPIs {
  const activePjos = pjos.filter(p => p.is_active !== false)
  
  // Pipeline value (draft + pending + approved not converted)
  const pipelineStatuses = ['draft', 'pending_approval']
  const pipelinePjos = activePjos.filter(p => 
    pipelineStatuses.includes(p.status) || 
    (p.status === 'approved' && p.converted_to_jo !== true)
  )
  const pipelineValue = pipelinePjos.reduce(
    (sum, p) => sum + (p.total_revenue_calculated ?? p.total_estimated_revenue ?? 0),
    0
  )
  
  // Win rate
  const converted = activePjos.filter(p => p.status === 'approved' && p.converted_to_jo === true).length
  const rejected = activePjos.filter(p => p.status === 'rejected').length
  const winRate = calculateWinRate(converted, rejected)
  
  // Active PJOs (draft + pending)
  const activePJOsCount = activePjos.filter(p => 
    p.status === 'draft' || p.status === 'pending_approval'
  ).length
  
  return {
    pipelineValue,
    pipelineCount: pipelinePjos.length,
    winRate,
    winRateTarget: WIN_RATE_TARGET,
    activePJOsCount,
    newCustomersCount,
  }
}
