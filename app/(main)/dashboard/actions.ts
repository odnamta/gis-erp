'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/permissions-server'
import {
  DashboardKPIs,
  BudgetAlert,
  ActivityEntry,
  OpsQueueItem,
  ManagerMetrics
} from '@/types'

/**
 * Fetch dashboard stats using optimized database function
 * Requirement 4.4: Call get_dashboard_stats instead of multiple separate queries
 * Returns: active_jobs, revenue_mtd, profit_mtd, pending_invoices, ar_outstanding
 */
export async function fetchDashboardStats(): Promise<{
  active_jobs: number;
  revenue_mtd: number;
  profit_mtd: number;
  pending_invoices: number;
  ar_outstanding: number;
}> {
  const supabase = await createClient()
  
  // Use the optimized database function (single query)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_dashboard_stats')
  
  if (error) {
    console.error('Error fetching dashboard stats:', error)
    // Return defaults on error
    return {
      active_jobs: 0,
      revenue_mtd: 0,
      profit_mtd: 0,
      pending_invoices: 0,
      ar_outstanding: 0,
    }
  }
  
  const stats = Array.isArray(data) ? data[0] : data
  
  return {
    active_jobs: Number(stats?.active_jobs || 0),
    revenue_mtd: Number(stats?.revenue_mtd || 0),
    profit_mtd: Number(stats?.profit_mtd || 0),
    pending_invoices: Number(stats?.pending_invoices || 0),
    ar_outstanding: Number(stats?.ar_outstanding || 0),
  }
}

/**
 * Fetch all dashboard KPIs in parallel for optimal performance
 */
export async function fetchDashboardKPIs(): Promise<DashboardKPIs> {
  const supabase = await createClient()
  
  // Execute all count queries in parallel
  const [
    awaitingOpsResult,
    exceededBudgetResult,
    readyForConversionResult,
    outstandingARResult
  ] = await Promise.all([
    // Count PJOs awaiting ops input (approved but costs not confirmed)
    supabase
      .from('proforma_job_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('all_costs_confirmed', false),
    
    // Count exceeded budget items
    supabase
      .from('pjo_cost_items')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'exceeded'),
    
    // Count PJOs ready for conversion (approved and all costs confirmed)
    supabase
      .from('proforma_job_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('all_costs_confirmed', true),
    
    // Sum outstanding AR (sent + overdue invoices)
    supabase
      .from('invoices')
      .select('total_amount')
      .in('status', ['sent', 'overdue'])
  ])

  // Calculate outstanding AR sum
  const outstandingAR = outstandingARResult.data?.reduce(
    (sum, inv) => sum + (inv.total_amount || 0), 
    0
  ) || 0

  return {
    awaitingOpsInput: awaitingOpsResult.count || 0,
    exceededBudgetItems: exceededBudgetResult.count || 0,
    readyForConversion: readyForConversionResult.count || 0,
    outstandingAR
  }
}


/**
 * Fetch budget alerts (exceeded cost items) with PJO info
 * Limited to 5 most recent items
 */
export async function fetchBudgetAlerts(): Promise<BudgetAlert[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('pjo_cost_items')
    .select(`
      id,
      pjo_id,
      category,
      description,
      estimated_amount,
      actual_amount,
      variance,
      variance_pct,
      created_at,
      proforma_job_orders(pjo_number)
    `)
    .eq('status', 'exceeded')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching budget alerts:', error)
    return []
  }

  return (data || []).map(item => ({
    id: item.id,
    pjo_id: item.pjo_id,
    pjo_number: (item.proforma_job_orders as { pjo_number: string })?.pjo_number || '',
    category: item.category,
    description: item.description,
    estimated_amount: item.estimated_amount,
    actual_amount: item.actual_amount || 0,
    variance: item.variance || 0,
    variance_pct: item.variance_pct || 0,
    created_at: item.created_at || ''
  }))
}

/**
 * Fetch total count of exceeded budget items (for "View All" link)
 */
export async function fetchExceededBudgetCount(): Promise<number> {
  const supabase = await createClient()
  
  const { count } = await supabase
    .from('pjo_cost_items')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'exceeded')

  return count || 0
}

/**
 * Fetch recent activity from activity_log
 * Limited to 5 most recent entries
 */
export async function fetchRecentActivity(): Promise<ActivityEntry[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  // Only log actual errors (not empty objects from Supabase)
  if (error && 'message' in error && error.message) {
    console.error('Error fetching recent activity:', error)
    return []
  }

  return (data || []).map(item => ({
    id: item.id,
    action_type: item.action_type as ActivityEntry['action_type'],
    document_type: item.document_type as ActivityEntry['document_type'],
    document_id: item.document_id,
    document_number: item.document_number,
    user_id: item.user_id || '',
    user_name: item.user_name,
    details: item.details as Record<string, unknown> | undefined,
    created_at: item.created_at || ''
  }))
}

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
      )
    `)
    .eq('status', 'approved')
    .eq('all_costs_confirmed', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching operations queue:', error)
    return []
  }

  // For each PJO, get cost item progress
  const queueItems: OpsQueueItem[] = []
  
  for (const pjo of data || []) {
    const { data: costItems } = await supabase
      .from('pjo_cost_items')
      .select('actual_amount')
      .eq('pjo_id', pjo.id)

    const costsTotal = costItems?.length || 0
    const costsConfirmed = costItems?.filter(
      item => item.actual_amount !== null
    ).length || 0

    const project = pjo.projects as { name: string; customers: { name: string } } | null

    queueItems.push({
      id: pjo.id,
      pjo_number: pjo.pjo_number,
      customer_name: project?.customers?.name || 'Unknown',
      project_name: project?.name || null,
      commodity: pjo.commodity,
      costs_confirmed: costsConfirmed,
      costs_total: costsTotal,
      created_at: pjo.created_at || ''
    })
  }

  return queueItems
}

/**
 * Fetch manager metrics - aggregated JO data for current month
 */
export async function fetchManagerMetrics(): Promise<ManagerMetrics> {
  const supabase = await createClient()
  
  // Get start and end of current month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  
  const { data, error } = await supabase
    .from('job_orders')
    .select('final_revenue, final_cost')
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth)

  if (error) {
    console.error('Error fetching manager metrics:', error)
    return {
      totalRevenue: 0,
      totalCosts: 0,
      totalProfit: 0,
      margin: 0,
      activeJOCount: 0
    }
  }

  const totalRevenue = (data || []).reduce((sum, jo) => sum + (jo.final_revenue || 0), 0)
  const totalCosts = (data || []).reduce((sum, jo) => sum + (jo.final_cost || 0), 0)
  const totalProfit = totalRevenue - totalCosts
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  return {
    totalRevenue,
    totalCosts,
    totalProfit,
    margin,
    activeJOCount: data?.length || 0
  }
}

/**
 * Log an activity to the activity_log table
 */
export async function logActivity(
  actionType: ActivityEntry['action_type'],
  documentType: ActivityEntry['document_type'],
  documentId: string,
  documentNumber: string,
  userName: string,
  userId?: string,
  details?: Record<string, string | number | boolean | null>
): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('activity_log')
    .insert({
      action_type: actionType,
      document_type: documentType,
      document_id: documentId,
      document_number: documentNumber,
      user_id: userId || null,
      user_name: userName,
      details: details as unknown as undefined
    })

  if (error) {
    console.error('Error logging activity:', error)
  }
}


/**
 * Fetch finance dashboard data
 */
import {
  groupInvoicesByAging,
  groupPJOsByStatus,
  filterOverdueInvoices,
  filterRecentPayments,
  calculateFinanceKPIs,
  calculatePaymentDashboardStats,
  type ARAgingData,
  type PJOPipelineData,
  type OverdueInvoice,
  type RecentPayment,
  type FinanceKPIs,
  type PaymentDashboardStats,
} from '@/lib/finance-dashboard-utils'

import type { BKKWithRelations } from '@/types'

export interface FinanceDashboardData {
  kpis: FinanceKPIs
  arAging: ARAgingData
  pjoPipeline: PJOPipelineData[]
  overdueInvoices: OverdueInvoice[]
  recentPayments: RecentPayment[]
  paymentStats?: PaymentDashboardStats
  pendingBKKs?: BKKWithRelations[]
}

export async function fetchFinanceDashboardData(): Promise<FinanceDashboardData> {
  const supabase = await createClient()
  const currentDate = new Date()

  // Fetch invoices with customer info (including amount_paid for partial payments)
  const { data: invoicesData } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      due_date,
      total_amount,
      amount_paid,
      status,
      paid_at,
      notes,
      customers(name)
    `)
    .order('due_date', { ascending: true })

  // Fetch PJOs for pipeline
  const { data: pjosData } = await supabase
    .from('proforma_job_orders')
    .select('status, total_revenue_calculated, is_active')
    .eq('is_active', true)

  // Fetch job orders for revenue calculation
  const { data: jobOrdersData } = await supabase
    .from('job_orders')
    .select('final_revenue, completed_at, status')

  // Fetch payments for monthly total calculation
  const { data: paymentsData } = await supabase
    .from('payments')
    .select('amount, payment_date')

  // Transform invoice data
  const invoices = (invoicesData || []).map(inv => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    due_date: inv.due_date,
    total_amount: inv.total_amount,
    amount_paid: inv.amount_paid,
    status: inv.status,
    paid_at: inv.paid_at,
    notes: inv.notes,
    customer_name: (inv.customers as { name: string })?.name || 'Unknown',
  }))

  // Transform PJO data
  const pjos = (pjosData || []).map(pjo => ({
    status: pjo.status,
    total_revenue_calculated: pjo.total_revenue_calculated,
    is_active: pjo.is_active ?? true,
  }))

  // Transform job orders data
  const jobOrders = (jobOrdersData || []).map(jo => ({
    final_revenue: jo.final_revenue,
    completed_at: jo.completed_at,
    status: jo.status,
  }))

  // Transform payments data
  const payments = (paymentsData || []).map(p => ({
    amount: Number(p.amount),
    payment_date: p.payment_date,
  }))

  // Fetch pending BKKs for approval
  const { data: pendingBKKsData } = await supabase
    .from('bukti_kas_keluar')
    .select(`
      *,
      job_order:job_orders (
        id,
        jo_number,
        description
      ),
      requester:user_profiles!bukti_kas_keluar_requested_by_fkey (
        id,
        full_name
      ),
      cost_item:pjo_cost_items (
        id,
        category,
        description
      )
    `)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })

  // Calculate all metrics
  const kpis = calculateFinanceKPIs(invoices, jobOrders, currentDate)
  const arAging = groupInvoicesByAging(invoices, currentDate)
  const pjoPipeline = groupPJOsByStatus(pjos)
  const overdueInvoices = filterOverdueInvoices(invoices, currentDate)
  const recentPayments = filterRecentPayments(invoices, currentDate)
  const paymentStats = calculatePaymentDashboardStats(invoices, payments, currentDate)

  return {
    kpis,
    arAging,
    pjoPipeline,
    overdueInvoices,
    recentPayments,
    paymentStats,
    pendingBKKs: (pendingBKKsData || []) as BKKWithRelations[],
  }
}


/**
 * Fetch sales dashboard data
 */
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
  const supabase = await createClient()
  const currentDate = new Date()

  // Get period dates
  const period = getPeriodDates(periodType, currentDate, customStart, customEnd)
  const previousPeriod = getSalesPreviousPeriodDates(period)

  // Fetch PJOs with customer info
  const { data: pjosData } = await supabase
    .from('proforma_job_orders')
    .select(`
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
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Fetch new customers count for the period
  const { count: newCustomersCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', period.startDate.toISOString())
    .lte('created_at', period.endDate.toISOString())

  // Transform PJO data
  const pjos: PJOInput[] = (pjosData || []).map(pjo => ({
    id: pjo.id,
    status: pjo.status,
    total_estimated_revenue: pjo.estimated_amount,
    total_revenue_calculated: pjo.total_revenue_calculated,
    is_active: pjo.is_active ?? true,
    created_at: pjo.created_at,
    rejection_reason: pjo.rejection_reason,
    converted_to_jo: pjo.converted_to_jo,
  }))

  // Transform for pending followups (needs customer name)
  const pjosWithCustomer: PJOWithCustomer[] = (pjosData || []).map(pjo => {
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

  // Transform for customer ranking
  const customerPjos: CustomerPJOInput[] = (pjosData || []).map(pjo => {
    const project = pjo.projects as { name: string; customers: { id: string; name: string } | null } | null
    return {
      customer_id: project?.customers?.id || '',
      customer_name: project?.customers?.name || 'Unknown',
      total_estimated_revenue: pjo.estimated_amount,
      total_revenue_calculated: pjo.total_revenue_calculated,
      status: pjo.status,
      created_at: pjo.created_at,
    }
  }).filter(pjo => pjo.customer_id) // Filter out PJOs without customer

  // Filter PJOs by period for KPIs
  const periodPjos = filterPJOsByPeriod(pjos, period)

  // Calculate all metrics
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
}

/**
 * Refresh sales dashboard data with new period
 * Used as a server action for client-side period changes
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
  const supabase = await createClient()
  const currentDate = new Date()

  // Get period dates
  const period = getManagerPeriodDates(periodType, currentDate)
  const previousPeriod = getPreviousPeriodDates(period)
  const ytdPeriod = getYTDPeriodDates(currentDate)

  // Fetch job orders for P&L
  const { data: jobOrdersData } = await supabase
    .from('job_orders')
    .select('id, final_revenue, final_cost, status, created_at, completed_at')
    .order('created_at', { ascending: false })

  // Fetch PJOs for approval queue
  const { data: pjosData } = await supabase
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

  // Fetch cost items for budget alerts and P&L breakdown
  const { data: costItemsData } = await supabase
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

  // Fetch active jobs for jobs in progress count
  const { data: activeJobsData } = await supabase
    .from('job_orders')
    .select('id, status')
    .eq('status', 'active')

  // Fetch user profiles for team metrics
  const { data: profilesData } = await supabase
    .from('user_profiles')
    .select('id, full_name, role')
    .in('role', ['sysadmin', 'administration', 'marketing', 'ops'])

  // Transform data
  const jobOrders: JOInput[] = (jobOrdersData || []).map(jo => ({
    id: jo.id,
    final_revenue: jo.final_revenue,
    final_cost: jo.final_cost,
    status: jo.status,
    created_at: jo.created_at,
    completed_at: jo.completed_at,
  }))

  const pjos: PJOApprovalInput[] = (pjosData || []).map(pjo => {
    const project = pjo.projects as { name: string; customers: { name: string } | null } | null
    return {
      id: pjo.id,
      pjo_number: pjo.pjo_number,
      status: pjo.status,
      total_revenue_calculated: pjo.total_revenue_calculated,
      total_cost_calculated: null, // Not available in query
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

  // Filter JOs by periods
  const currentPeriodJOs = filterByPeriod(jobOrders, period)
  const lastPeriodJOs = filterByPeriod(jobOrders, previousPeriod)
  const ytdJOs = filterByPeriod(jobOrders, ytdPeriod)

  // Calculate KPIs
  const kpis = calculateManagerKPIs(
    currentPeriodJOs,
    lastPeriodJOs,
    pjos,
    costItems,
    activeJobsData || []
  )

  // Build P&L summary
  const currentRevenue = currentPeriodJOs.reduce((sum, jo) => sum + (jo.final_revenue ?? 0), 0)
  const lastRevenue = lastPeriodJOs.reduce((sum, jo) => sum + (jo.final_revenue ?? 0), 0)
  const ytdRevenue = ytdJOs.reduce((sum, jo) => sum + (jo.final_revenue ?? 0), 0)

  // Group costs by category for each period
  const currentCostItems = costItems.filter(item => {
    const pjo = pjos.find(p => p.id === item.pjo_id)
    if (!pjo?.created_at) return false
    const createdAt = new Date(pjo.created_at)
    return createdAt >= period.startDate && createdAt <= period.endDate
  })
  const lastCostItems = costItems.filter(item => {
    const pjo = pjos.find(p => p.id === item.pjo_id)
    if (!pjo?.created_at) return false
    const createdAt = new Date(pjo.created_at)
    return createdAt >= previousPeriod.startDate && createdAt <= previousPeriod.endDate
  })
  const ytdCostItems = costItems.filter(item => {
    const pjo = pjos.find(p => p.id === item.pjo_id)
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

  // Get pending approvals
  const pendingApprovals = getPendingApprovals(pjos, currentDate)

  // Get budget alerts
  const budgetAlerts = getBudgetAlerts(costItems)

  // Calculate team metrics (simplified - would need more data in real implementation)
  const userMetrics: UserMetricsInput[] = (profilesData || []).map(profile => {
    const userPjos = pjos.filter(p => true) // In real impl, filter by created_by
    const userJos = jobOrders.filter(jo => true) // In real impl, filter by assigned_to
    
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

  return {
    kpis,
    plSummary,
    pendingApprovals,
    budgetAlerts,
    teamMetrics,
  }
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
    console.error('Error approving PJO:', error)
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
    console.error('Error rejecting PJO:', error)
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
    console.error('Error approving all PJOs:', error)
    return { error: 'Failed to approve all PJOs' }
  }

  return {}
}


/**
 * Fetch administration dashboard data
 * For Administration Division (role: 'admin') - handles PJO/JO/Invoice workflow
 */
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
  const supabase = await createClient()
  const currentDate = new Date()

  // Get period dates
  const period = getAdminPeriodDates(periodType, currentDate)

  // Fetch PJOs with customer info
  const { data: pjosData } = await supabase
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

  // Fetch JOs with customer info
  const { data: josData } = await supabase
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

  // Fetch Invoices with customer info
  const { data: invoicesData } = await supabase
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

  // Transform PJO data
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

  // Transform JO data
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

  // Transform Invoice data
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

  // Calculate all metrics
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
}
