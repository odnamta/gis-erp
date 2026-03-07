'use server'

/**
 * Dashboard Role-Specific Data Actions
 * Split from actions.ts
 */

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/permissions-server'
import { getOrFetch, generateCacheKey } from '@/lib/dashboard-cache'
import {
  OpsQueueItem,
} from '@/types'
import {
  groupPJOsByPipelineStage,
  filterPendingFollowups,
  rankCustomersByValue,
  calculateWinLossData,
  calculateSalesKPIs,
  getPeriodDates,
  getPreviousPeriodDates as getSalesPreviousPeriodDates,
  filterPJOsByPeriod,
  type PeriodType,
  type PipelineStage,
  type PendingFollowup,
  type TopCustomer,
  type WinLossData,
  type SalesKPIs,
  type PJOInput,
  type CustomerPJOInput,
  type PJOWithCustomer,
} from '@/lib/sales-dashboard-utils'
import {
  getManagerPeriodDates,
  getPreviousPeriodDates,
  getYTDPeriodDates,
  calculateManagerKPIs,
  getPendingApprovals,
  getBudgetAlerts,
  calculateTeamMetrics,
  buildPLSummaryRows,
  groupCostsByCategory,
  filterByPeriod,
  type ManagerPeriodType,
  type ManagerKPIs as ManagerKPIsType,
  type PLSummaryRow,
  type PendingApproval,
  type BudgetAlertItem,
  type TeamMemberMetrics,
  type JOInput,
  type CostItemInput,
  type PJOApprovalInput,
  type UserMetricsInput,
} from '@/lib/manager-dashboard-utils'
import {
  getAdminPeriodDates,
  calculateAdminKPIs,
  calculatePipelineStages,
  getPendingWorkItems,
  calculateAgingBuckets,
  getRecentDocuments,
  type AdminPeriodType,
  type AdminKPIs as AdminKPIsType,
  type PipelineStage as AdminPipelineStage,
  type PendingWorkItem,
  type AgingBucket,
  type RecentDocument,
  type PJOInput as AdminPJOInput,
  type JOInput as AdminJOInput,
  type InvoiceInput as AdminInvoiceInput,
} from '@/lib/admin-dashboard-utils'

/**
 * Fetch operations queue - PJOs needing cost entry
 */
export async function fetchOperationsQueue(): Promise<OpsQueueItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('proforma_job_orders')
    .select(`
      id,
      pjo_number,
      commodity,
      created_at,
      projects(
        name,
        customers(name)
      ),
      pjo_cost_items(actual_amount)
    `)
    .eq('status', 'approved')
    .eq('all_costs_confirmed', false)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return []
  }

  return (data || []).map((pjo) => {
    const costItems = pjo.pjo_cost_items || []
    const costsTotal = costItems.length
    const costsConfirmed = costItems.filter(
      (item: { actual_amount: number | null }) => item.actual_amount !== null
    ).length

    const project = pjo.projects as { name: string; customers: { name: string } } | null

    return {
      id: pjo.id,
      pjo_number: pjo.pjo_number,
      customer_name: project?.customers?.name || 'Unknown',
      project_name: project?.name || null,
      commodity: pjo.commodity,
      costs_confirmed: costsConfirmed,
      costs_total: costsTotal,
      created_at: pjo.created_at || ''
    }
  })
}

/**
 * Fetch sales dashboard data
 */

export interface SalesDashboardData {
  kpis: SalesKPIs
  pipeline: PipelineStage[]
  pendingFollowups: PendingFollowup[]
  topCustomers: TopCustomer[]
  winLossData: WinLossData
}

export async function fetchSalesDashboardData(
  periodType: PeriodType = 'this_month',
  customStart?: Date,
  customEnd?: Date
): Promise<SalesDashboardData> {
  const cacheKey = await generateCacheKey('sales-dashboard', periodType)

  return getOrFetch(cacheKey, async () => {
  const supabase = await createClient()
  const currentDate = new Date()

  const period = getPeriodDates(periodType, currentDate, customStart, customEnd)
  const previousPeriod = getSalesPreviousPeriodDates(period)

  // Try RPC first (1 call, DB-side aggregation, ~150ms vs ~400ms)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
    'get_sales_dashboard_metrics',
    {
      p_period_start: period.startDate.toISOString(),
      p_period_end: period.endDate.toISOString(),
      p_prev_start: previousPeriod.startDate.toISOString(),
      p_prev_end: previousPeriod.endDate.toISOString(),
    }
  )

  if (!rpcError && rpcData) {
    return rpcData as SalesDashboardData
  }

  // Fallback: client-side processing (used until RPC is deployed)
  const pjoSelect = `
    id,
    pjo_number,
    status,
    estimated_amount,
    total_revenue_calculated,
    is_active,
    created_at,
    rejection_reason,
    converted_to_jo,
    projects(
      name,
      customers(id, name)
    )
  `

  const [{ data: periodPjosData }, { data: pendingPjosData }, { count: newCustomersCount }] = await Promise.all([
    supabase
      .from('proforma_job_orders')
      .select(pjoSelect)
      .eq('is_active', true)
      .gte('created_at', previousPeriod.startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(500),

    supabase
      .from('proforma_job_orders')
      .select(pjoSelect)
      .eq('is_active', true)
      .in('status', ['draft', 'pending_approval'])
      .order('created_at', { ascending: false })
      .limit(200),

    supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', period.startDate.toISOString())
      .lte('created_at', period.endDate.toISOString()),
  ])

  const pjos: PJOInput[] = (periodPjosData || []).map(pjo => ({
    id: pjo.id,
    status: pjo.status,
    total_estimated_revenue: pjo.estimated_amount,
    total_revenue_calculated: pjo.total_revenue_calculated,
    is_active: pjo.is_active ?? true,
    created_at: pjo.created_at,
    rejection_reason: pjo.rejection_reason,
    converted_to_jo: pjo.converted_to_jo,
  }))

  const customerPjos: CustomerPJOInput[] = (periodPjosData || []).map(pjo => {
    const project = pjo.projects as { name: string; customers: { id: string; name: string } | null } | null
    return {
      customer_id: project?.customers?.id || '',
      customer_name: project?.customers?.name || 'Unknown',
      total_estimated_revenue: pjo.estimated_amount,
      total_revenue_calculated: pjo.total_revenue_calculated,
      status: pjo.status,
      created_at: pjo.created_at,
    }
  }).filter(pjo => pjo.customer_id)

  const pjosWithCustomer: PJOWithCustomer[] = (pendingPjosData || []).map(pjo => {
    const project = pjo.projects as { name: string; customers: { id: string; name: string } | null } | null
    return {
      id: pjo.id,
      pjo_number: pjo.pjo_number,
      status: pjo.status,
      total_estimated_revenue: pjo.estimated_amount,
      total_revenue_calculated: pjo.total_revenue_calculated,
      is_active: pjo.is_active ?? true,
      created_at: pjo.created_at,
      customer_name: project?.customers?.name,
      projects: project,
    }
  })

  const periodPjos = filterPJOsByPeriod(pjos, period)

  const pipeline = groupPJOsByPipelineStage(periodPjos)
  const pendingFollowups = filterPendingFollowups(pjosWithCustomer, currentDate)
  const topCustomers = rankCustomersByValue(customerPjos, period, previousPeriod)
  const winLossData = calculateWinLossData(periodPjos)
  const kpis = calculateSalesKPIs(periodPjos, newCustomersCount || 0, period)

  return {
    kpis,
    pipeline,
    pendingFollowups,
    topCustomers,
    winLossData,
  }
  }) // end getOrFetch
}

/**
 * Refresh sales dashboard data with new period
 */
export async function refreshSalesDashboardData(
  periodType: PeriodType,
  customStart?: Date,
  customEnd?: Date
): Promise<SalesDashboardData> {
  'use server'
  return fetchSalesDashboardData(periodType, customStart, customEnd)
}


/**
 * Fetch manager dashboard data
 */

export interface ManagerDashboardData {
  kpis: ManagerKPIsType
  plSummary: PLSummaryRow[]
  pendingApprovals: PendingApproval[]
  budgetAlerts: BudgetAlertItem[]
  teamMetrics: TeamMemberMetrics[]
}

export async function fetchManagerDashboardData(
  periodType: ManagerPeriodType = 'this_month'
): Promise<ManagerDashboardData> {
  const cacheKey = await generateCacheKey('manager-dashboard', periodType)

  return getOrFetch(cacheKey, async () => {
  const supabase = await createClient()
  const currentDate = new Date()

  const period = getManagerPeriodDates(periodType, currentDate)
  const previousPeriod = getPreviousPeriodDates(period)
  const ytdPeriod = getYTDPeriodDates(currentDate)

  // Try RPC for aggregations (KPIs + P&L data) — 1 call replaces 3 heavy queries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
    'get_manager_dashboard_metrics',
    {
      p_period_start: period.startDate.toISOString(),
      p_period_end: period.endDate.toISOString(),
      p_prev_start: previousPeriod.startDate.toISOString(),
      p_prev_end: previousPeriod.endDate.toISOString(),
      p_ytd_start: ytdPeriod.startDate.toISOString(),
      p_ytd_end: ytdPeriod.endDate.toISOString(),
    }
  )

  // List queries still needed for actionable items (regardless of RPC success)
  const [
    { data: pjosData },
    { data: costItemsData },
    { data: profilesData },
  ] = await Promise.all([
    // PJOs: only pending_approval for approval list
    supabase
      .from('proforma_job_orders')
      .select(`
        id,
        pjo_number,
        status,
        total_revenue_calculated,
        estimated_amount,
        created_at,
        projects(
          name,
          customers(name)
        )
      `)
      .eq('is_active', true)
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false })
      .limit(100),

    // Cost items: only exceeded for budget alerts
    supabase
      .from('pjo_cost_items')
      .select(`
        id,
        pjo_id,
        category,
        estimated_amount,
        actual_amount,
        status,
        proforma_job_orders(pjo_number)
      `)
      .eq('status', 'exceeded')
      .limit(100),

    supabase
      .from('user_profiles')
      .select('id, full_name, role')
      .in('role', ['sysadmin', 'administration', 'marketing', 'ops'])
      .limit(100),
  ])

  const pjos: PJOApprovalInput[] = (pjosData || []).map(pjo => {
    const project = pjo.projects as { name: string; customers: { name: string } | null } | null
    return {
      id: pjo.id,
      pjo_number: pjo.pjo_number,
      status: pjo.status,
      total_revenue_calculated: pjo.total_revenue_calculated,
      total_cost_calculated: null,
      estimated_amount: pjo.estimated_amount,
      created_at: pjo.created_at,
      customer_name: project?.customers?.name,
      project_name: project?.name,
    }
  })

  const costItems: CostItemInput[] = (costItemsData || []).map(item => ({
    id: item.id,
    pjo_id: item.pjo_id,
    category: item.category,
    estimated_amount: item.estimated_amount,
    actual_amount: item.actual_amount,
    status: item.status,
    pjo_number: (item.proforma_job_orders as { pjo_number: string })?.pjo_number,
  }))

  const pendingApprovals = getPendingApprovals(pjos, currentDate)
  const budgetAlerts = getBudgetAlerts(costItems)

  const userMetrics: UserMetricsInput[] = (profilesData || []).map(profile => {
    return {
      userId: profile.id,
      name: profile.full_name || 'Unknown',
      role: profile.role || 'viewer',
      pjosCreated: profile.role === 'administration' || profile.role === 'marketing' ? Math.floor(Math.random() * 10) + 1 : undefined,
      josCompleted: profile.role === 'ops' ? Math.floor(Math.random() * 15) + 1 : undefined,
      josOnTime: profile.role === 'ops' ? Math.floor(Math.random() * 12) + 1 : undefined,
      josTotal: profile.role === 'ops' ? Math.floor(Math.random() * 15) + 1 : undefined,
    }
  })
  const teamMetrics = calculateTeamMetrics(userMetrics)

  // Use RPC data for KPIs + P&L if available
  if (!rpcError && rpcData) {
    const plData = rpcData.plData as {
      currentRevenue: number
      lastRevenue: number
      ytdRevenue: number
      currentCostsByCategory: Record<string, number>
      lastCostsByCategory: Record<string, number>
      ytdCostsByCategory: Record<string, number>
    }

    const plSummary = buildPLSummaryRows(
      plData.currentRevenue,
      plData.lastRevenue,
      plData.ytdRevenue,
      new Map(Object.entries(plData.currentCostsByCategory || {})),
      new Map(Object.entries(plData.lastCostsByCategory || {})),
      new Map(Object.entries(plData.ytdCostsByCategory || {}))
    )

    return {
      kpis: rpcData.kpis as ManagerKPIsType,
      plSummary,
      pendingApprovals,
      budgetAlerts,
      teamMetrics,
    }
  }

  // Fallback: full client-side processing (used until RPC is deployed)
  const ytdStartISO = ytdPeriod.startDate.toISOString()

  const [
    { data: jobOrdersData },
    { data: allPjosData },
    { data: allCostItemsData },
    { data: activeJobsData },
  ] = await Promise.all([
    supabase
      .from('job_orders')
      .select('id, final_revenue, final_cost, status, created_at, completed_at')
      .gte('created_at', ytdStartISO)
      .order('created_at', { ascending: false })
      .limit(500),

    supabase
      .from('proforma_job_orders')
      .select(`
        id,
        pjo_number,
        status,
        total_revenue_calculated,
        estimated_amount,
        created_at,
        projects(
          name,
          customers(name)
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(500),

    supabase
      .from('pjo_cost_items')
      .select(`
        id,
        pjo_id,
        category,
        estimated_amount,
        actual_amount,
        status,
        proforma_job_orders(pjo_number)
      `)
      .limit(500),

    supabase
      .from('job_orders')
      .select('id, status')
      .eq('status', 'active')
      .limit(500),
  ])

  const jobOrders: JOInput[] = (jobOrdersData || []).map(jo => ({
    id: jo.id,
    final_revenue: jo.final_revenue,
    final_cost: jo.final_cost,
    status: jo.status,
    created_at: jo.created_at,
    completed_at: jo.completed_at,
  }))

  const allPjos: PJOApprovalInput[] = (allPjosData || []).map(pjo => {
    const project = pjo.projects as { name: string; customers: { name: string } | null } | null
    return {
      id: pjo.id,
      pjo_number: pjo.pjo_number,
      status: pjo.status,
      total_revenue_calculated: pjo.total_revenue_calculated,
      total_cost_calculated: null,
      estimated_amount: pjo.estimated_amount,
      created_at: pjo.created_at,
      customer_name: project?.customers?.name,
      project_name: project?.name,
    }
  })

  const allCostItems: CostItemInput[] = (allCostItemsData || []).map(item => ({
    id: item.id,
    pjo_id: item.pjo_id,
    category: item.category,
    estimated_amount: item.estimated_amount,
    actual_amount: item.actual_amount,
    status: item.status,
    pjo_number: (item.proforma_job_orders as { pjo_number: string })?.pjo_number,
  }))

  const currentPeriodJOs = filterByPeriod(jobOrders, period)
  const lastPeriodJOs = filterByPeriod(jobOrders, previousPeriod)

  const kpis = calculateManagerKPIs(
    currentPeriodJOs,
    lastPeriodJOs,
    allPjos,
    allCostItems,
    activeJobsData || []
  )

  const currentRevenue = currentPeriodJOs.reduce((sum, jo) => sum + (jo.final_revenue ?? 0), 0)
  const lastRevenue = lastPeriodJOs.reduce((sum, jo) => sum + (jo.final_revenue ?? 0), 0)
  const ytdJOs = filterByPeriod(jobOrders, ytdPeriod)
  const ytdRevenue = ytdJOs.reduce((sum, jo) => sum + (jo.final_revenue ?? 0), 0)

  const currentCostItems = allCostItems.filter(item => {
    const pjo = allPjos.find(p => p.id === item.pjo_id)
    if (!pjo?.created_at) return false
    const createdAt = new Date(pjo.created_at)
    return createdAt >= period.startDate && createdAt <= period.endDate
  })
  const lastCostItems = allCostItems.filter(item => {
    const pjo = allPjos.find(p => p.id === item.pjo_id)
    if (!pjo?.created_at) return false
    const createdAt = new Date(pjo.created_at)
    return createdAt >= previousPeriod.startDate && createdAt <= previousPeriod.endDate
  })
  const ytdCostItems = allCostItems.filter(item => {
    const pjo = allPjos.find(p => p.id === item.pjo_id)
    if (!pjo?.created_at) return false
    const createdAt = new Date(pjo.created_at)
    return createdAt >= ytdPeriod.startDate && createdAt <= ytdPeriod.endDate
  })

  const currentCostsByCategory = groupCostsByCategory(currentCostItems)
  const lastCostsByCategory = groupCostsByCategory(lastCostItems)
  const ytdCostsByCategory = groupCostsByCategory(ytdCostItems)

  const plSummary = buildPLSummaryRows(
    currentRevenue,
    lastRevenue,
    ytdRevenue,
    currentCostsByCategory,
    lastCostsByCategory,
    ytdCostsByCategory
  )

  return {
    kpis,
    plSummary,
    pendingApprovals,
    budgetAlerts,
    teamMetrics,
  }
  }) // end getOrFetch
}

/**
 * Approve a PJO
 */
export async function approvePJO(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const profile = await getUserProfile()
  if (!profile?.can_approve_pjo) {
    return { error: 'You do not have permission to approve PJOs' }
  }

  const { error } = await supabase
    .from('proforma_job_orders')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { error: 'Failed to approve PJO' }
  }

  return {}
}

/**
 * Reject a PJO with reason
 */
export async function rejectPJO(id: string, reason: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const profile = await getUserProfile()
  if (!profile?.can_approve_pjo) {
    return { error: 'You do not have permission to reject PJOs' }
  }

  if (!reason.trim()) {
    return { error: 'Rejection reason is required' }
  }

  const { error } = await supabase
    .from('proforma_job_orders')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { error: 'Failed to reject PJO' }
  }

  return {}
}

/**
 * Approve all pending PJOs
 */
export async function approveAllPJOs(): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const profile = await getUserProfile()
  if (!profile?.can_approve_pjo) {
    return { error: 'You do not have permission to approve PJOs' }
  }

  const { error } = await supabase
    .from('proforma_job_orders')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'pending_approval')

  if (error) {
    return { error: 'Failed to approve all PJOs' }
  }

  return {}
}


/**
 * Fetch administration dashboard data
 */

export interface AdminDashboardData {
  kpis: AdminKPIsType
  pipeline: AdminPipelineStage[]
  pendingWork: PendingWorkItem[]
  agingBuckets: AgingBucket[]
  recentDocuments: RecentDocument[]
}

export async function fetchAdminDashboardData(
  periodType: AdminPeriodType = 'this_month'
): Promise<AdminDashboardData> {
  const cacheKey = await generateCacheKey('admin-dashboard', periodType)

  return getOrFetch(cacheKey, async () => {
  const supabase = await createClient()
  const currentDate = new Date()

  const period = getAdminPeriodDates(periodType, currentDate)

  // Try RPC first (1 call, DB-side aggregation + joins)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
    'get_admin_dashboard_metrics',
    {
      p_period_start: period.startDate.toISOString(),
      p_period_end: period.endDate.toISOString(),
    }
  )

  if (!rpcError && rpcData) {
    return rpcData as AdminDashboardData
  }

  // Fallback: client-side processing (used until RPC is deployed)
  const [
    { data: pjosData },
    { data: josData },
    { data: invoicesData },
  ] = await Promise.all([
    supabase
      .from('proforma_job_orders')
      .select(`
        id,
        pjo_number,
        status,
        converted_to_jo,
        all_costs_confirmed,
        created_at,
        updated_at,
        projects(
          name,
          customers(name)
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(500),

    supabase
      .from('job_orders')
      .select(`
        id,
        jo_number,
        status,
        created_at,
        updated_at,
        proforma_job_orders(
          pjo_number,
          projects(
            name,
            customers(name)
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(500),

    supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        status,
        total_amount,
        due_date,
        paid_at,
        created_at,
        updated_at,
        job_orders(
          jo_number,
          proforma_job_orders(
            projects(
              customers(name)
            )
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const pjos: AdminPJOInput[] = (pjosData || []).map(pjo => {
    const project = pjo.projects as { name: string; customers: { name: string } | null } | null
    return {
      id: pjo.id,
      pjo_number: pjo.pjo_number,
      status: pjo.status,
      converted_to_jo: pjo.converted_to_jo,
      all_costs_confirmed: pjo.all_costs_confirmed,
      created_at: pjo.created_at,
      updated_at: pjo.updated_at,
      customer_name: project?.customers?.name,
      project_name: project?.name,
    }
  })

  const jos: AdminJOInput[] = (josData || []).map(jo => {
    const pjo = jo.proforma_job_orders as {
      pjo_number: string;
      projects: { name: string; customers: { name: string } | null } | null
    } | null
    return {
      id: jo.id,
      jo_number: jo.jo_number,
      status: jo.status,
      created_at: jo.created_at,
      updated_at: jo.updated_at,
      customer_name: pjo?.projects?.customers?.name,
      pjo_number: pjo?.pjo_number,
    }
  })

  const invoices: AdminInvoiceInput[] = (invoicesData || []).map(inv => {
    const jo = inv.job_orders as {
      jo_number: string;
      proforma_job_orders: { projects: { customers: { name: string } | null } | null } | null
    } | null
    return {
      id: inv.id,
      invoice_number: inv.invoice_number,
      status: inv.status,
      amount: inv.total_amount,
      due_date: inv.due_date,
      paid_at: inv.paid_at,
      created_at: inv.created_at,
      updated_at: inv.updated_at,
      customer_name: jo?.proforma_job_orders?.projects?.customers?.name,
      jo_number: jo?.jo_number,
    }
  })

  const kpis = calculateAdminKPIs(pjos, jos, invoices, period)
  const pipeline = calculatePipelineStages(pjos)
  const pendingWork = getPendingWorkItems(pjos, jos, invoices, currentDate)
  const agingBuckets = calculateAgingBuckets(invoices, currentDate)
  const recentDocuments = getRecentDocuments(pjos, jos, invoices, 10)

  return {
    kpis,
    pipeline,
    pendingWork,
    agingBuckets,
    recentDocuments,
  }
  }) // end getOrFetch
}
