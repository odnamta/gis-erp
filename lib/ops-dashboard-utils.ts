import { createClient } from '@/lib/supabase/server'
import { differenceInDays, startOfWeek, endOfWeek, subWeeks } from 'date-fns'

// Types for Ops Dashboard
export interface OpsKPIs {
  pendingCostEntries: number
  inProgressJobs: number
  completedThisWeek: number
  overBudgetItems: number
  urgentCount: number
}

export interface PendingCostEntry {
  id: string
  pjo_number: string
  project_name: string
  customer_name: string
  confirmed_count: number
  total_count: number
  approved_at: string
  is_urgent: boolean
}

export interface ActiveJob {
  id: string
  jo_number: string
  commodity: string | null
  pol: string | null
  pod: string | null
  status: string
  project_name: string
}

export interface WeeklyStats {
  completedThisWeek: number
  completedLastWeek: number
  avgCompletionDays: number
  trend: 'up' | 'down' | 'stable'
}

export interface OpsDashboardData {
  kpis: OpsKPIs
  pendingCosts: PendingCostEntry[]
  activeJobs: ActiveJob[]
  weeklyStats: WeeklyStats
}

/**
 * Check if a PJO is urgent (> 3 days since approval)
 */
export function isUrgent(approvedAt: string | null): boolean {
  if (!approvedAt) return false
  const daysSinceApproval = differenceInDays(new Date(), new Date(approvedAt))
  return daysSinceApproval > 3
}


/**
 * Calculate trend based on this week vs last week
 */
export function calculateTrend(
  thisWeek: number,
  lastWeek: number
): 'up' | 'down' | 'stable' {
  if (thisWeek > lastWeek) return 'up'
  if (thisWeek < lastWeek) return 'down'
  return 'stable'
}

/**
 * Get KPIs for ops dashboard
 */
export async function getOpsKPIs(): Promise<OpsKPIs> {
  const supabase = await createClient()

  // Get pending cost entries count
  const { data: pendingPJOs } = await supabase
    .from('proforma_job_orders')
    .select('id, approved_at, pjo_cost_items(id, confirmed_at)')
    .eq('status', 'approved')
    .eq('converted_to_jo', false)

  let pendingCostEntries = 0
  let urgentCount = 0

  pendingPJOs?.forEach((pjo) => {
    const costItems = pjo.pjo_cost_items || []
    const confirmedCount = costItems.filter((item: { confirmed_at: string | null }) => item.confirmed_at !== null).length
    if (confirmedCount < costItems.length) {
      pendingCostEntries++
      if (isUrgent(pjo.approved_at)) {
        urgentCount++
      }
    }
  })

  // Get in-progress jobs count
  const { count: inProgressJobs } = await supabase
    .from('job_orders')
    .select('*', { count: 'exact', head: true })
    .in('status', ['active', 'in_progress'])

  // Get completed this week
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

  const { data: completedPJOs } = await supabase
    .from('proforma_job_orders')
    .select('id, pjo_cost_items(id, confirmed_at)')
    .eq('status', 'approved')

  let completedThisWeek = 0
  completedPJOs?.forEach((pjo) => {
    const costItems = pjo.pjo_cost_items || []
    if (costItems.length === 0) return
    const allConfirmed = costItems.every((item: { confirmed_at: string | null }) => item.confirmed_at !== null)
    if (allConfirmed) {
      const lastConfirmed = costItems
        .map((item: { confirmed_at: string | null }) => item.confirmed_at)
        .filter(Boolean)
        .sort()
        .pop()
      if (lastConfirmed) {
        const confirmedDate = new Date(lastConfirmed)
        if (confirmedDate >= weekStart && confirmedDate <= weekEnd) {
          completedThisWeek++
        }
      }
    }
  })

  // Get over budget items count
  const { count: overBudgetItems } = await supabase
    .from('pjo_cost_items')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'exceeded')

  return {
    pendingCostEntries,
    inProgressJobs: inProgressJobs || 0,
    completedThisWeek,
    overBudgetItems: overBudgetItems || 0,
    urgentCount,
  }
}


/**
 * Get pending cost entries for ops dashboard
 * Returns approved PJOs with incomplete cost confirmations, sorted by urgency
 */
export async function getPendingCostEntries(): Promise<PendingCostEntry[]> {
  const supabase = await createClient()

  const { data: pjos } = await supabase
    .from('proforma_job_orders')
    .select(`
      id,
      pjo_number,
      approved_at,
      projects(
        name,
        customers(name)
      ),
      pjo_cost_items(id, confirmed_at)
    `)
    .eq('status', 'approved')
    .eq('converted_to_jo', false)
    .order('approved_at', { ascending: true })

  if (!pjos) return []

  const pendingEntries: PendingCostEntry[] = []

  for (const pjo of pjos) {
    const costItems = pjo.pjo_cost_items || []
    const confirmedCount = costItems.filter((item: { confirmed_at: string | null }) => item.confirmed_at !== null).length
    const totalCount = costItems.length

    // Only include if not all confirmed
    if (confirmedCount < totalCount) {
      const project = pjo.projects as { name: string; customers: { name: string } | null } | null
      pendingEntries.push({
        id: pjo.id,
        pjo_number: pjo.pjo_number,
        project_name: project?.name || 'Unknown Project',
        customer_name: project?.customers?.name || 'Unknown Customer',
        confirmed_count: confirmedCount,
        total_count: totalCount,
        approved_at: pjo.approved_at || '',
        is_urgent: isUrgent(pjo.approved_at),
      })
    }
  }

  // Sort by urgency (urgent first, then by approved_at ascending)
  return pendingEntries.sort((a, b) => {
    if (a.is_urgent && !b.is_urgent) return -1
    if (!a.is_urgent && b.is_urgent) return 1
    return new Date(a.approved_at).getTime() - new Date(b.approved_at).getTime()
  })
}

/**
 * Get active jobs for ops dashboard
 */
export async function getActiveJobs(): Promise<ActiveJob[]> {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from('job_orders')
    .select(`
      id,
      jo_number,
      description,
      status,
      proforma_job_orders(
        commodity,
        pol,
        pod,
        projects(name)
      )
    `)
    .in('status', ['active', 'in_progress'])
    .order('created_at', { ascending: false })

  if (!jobs) return []

  return jobs.map((job) => {
    const pjo = job.proforma_job_orders as { 
      commodity: string | null
      pol: string | null
      pod: string | null
      projects: { name: string } | null 
    } | null
    return {
      id: job.id,
      jo_number: job.jo_number,
      commodity: pjo?.commodity || job.description,
      pol: pjo?.pol || '',
      pod: pjo?.pod || '',
      status: job.status,
      project_name: pjo?.projects?.name || 'Unknown Project',
    }
  })
}


/**
 * Get weekly stats for ops dashboard
 */
export async function getWeeklyStats(): Promise<WeeklyStats> {
  const supabase = await createClient()

  const now = new Date()
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })

  // Get all PJOs with cost items
  const { data: pjos } = await supabase
    .from('proforma_job_orders')
    .select(`
      id,
      approved_at,
      pjo_cost_items(id, confirmed_at)
    `)
    .eq('status', 'approved')

  let completedThisWeek = 0
  let completedLastWeek = 0
  const completionTimes: number[] = []

  pjos?.forEach((pjo) => {
    const costItems = pjo.pjo_cost_items || []
    if (costItems.length === 0) return

    const allConfirmed = costItems.every((item: { confirmed_at: string | null }) => item.confirmed_at !== null)
    if (!allConfirmed) return

    const confirmedDates = costItems
      .map((item: { confirmed_at: string | null }) => item.confirmed_at)
      .filter((d): d is string => d !== null)
      .map((d) => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime())

    const lastConfirmedDate = confirmedDates[0]
    if (!lastConfirmedDate) return

    // Count completions by week
    if (lastConfirmedDate >= thisWeekStart && lastConfirmedDate <= thisWeekEnd) {
      completedThisWeek++
    } else if (lastConfirmedDate >= lastWeekStart && lastConfirmedDate <= lastWeekEnd) {
      completedLastWeek++
    }

    // Calculate completion time (from approval to last confirmation)
    if (pjo.approved_at) {
      const approvalDate = new Date(pjo.approved_at)
      const days = differenceInDays(lastConfirmedDate, approvalDate)
      if (days >= 0) {
        completionTimes.push(days)
      }
    }
  })

  const avgCompletionDays =
    completionTimes.length > 0
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : 0

  return {
    completedThisWeek,
    completedLastWeek,
    avgCompletionDays,
    trend: calculateTrend(completedThisWeek, completedLastWeek),
  }
}

/**
 * Get all ops dashboard data in one call
 */
export async function getOpsDashboardData(): Promise<OpsDashboardData> {
  const [kpis, pendingCosts, activeJobs, weeklyStats] = await Promise.all([
    getOpsKPIs(),
    getPendingCostEntries(),
    getActiveJobs(),
    getWeeklyStats(),
  ])

  return {
    kpis,
    pendingCosts,
    activeJobs,
    weeklyStats,
  }
}
