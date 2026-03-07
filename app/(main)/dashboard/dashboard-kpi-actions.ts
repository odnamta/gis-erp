'use server'

/**
 * Dashboard KPI + Metrics Actions
 * Split from actions.ts
 */

import { createClient } from '@/lib/supabase/server'
import { getOrFetch, generateCacheKey } from '@/lib/dashboard-cache'
import {
  DashboardKPIs,
  BudgetAlert,
  ActivityEntry,
  ManagerMetrics
} from '@/types'
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

/**
 * Fetch dashboard stats using optimized database function
 */
export async function fetchDashboardStats(): Promise<{
  active_jobs: number;
  revenue_mtd: number;
  profit_mtd: number;
  pending_invoices: number;
  ar_outstanding: number;
}> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_dashboard_stats')

  if (error) {
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

  const [
    awaitingOpsResult,
    exceededBudgetResult,
    readyForConversionResult,
    outstandingARResult
  ] = await Promise.all([
    supabase
      .from('proforma_job_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('all_costs_confirmed', false),

    supabase
      .from('pjo_cost_items')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'exceeded'),

    supabase
      .from('proforma_job_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('all_costs_confirmed', true),

    supabase
      .from('invoices')
      .select('total_amount')
      .in('status', ['sent', 'overdue'])
      .limit(500)
  ])

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
 * Fetch total count of exceeded budget items
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
 */
export async function fetchRecentActivity(): Promise<ActivityEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error && 'message' in error && error.message) {
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
 * Fetch manager metrics - aggregated JO data for current month
 */
export async function fetchManagerMetrics(): Promise<ManagerMetrics> {
  const supabase = await createClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const { data, error } = await supabase
    .from('job_orders')
    .select('final_revenue, final_cost')
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth)
    .limit(1000)

  if (error) {
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
  }
}


/**
 * Fetch finance dashboard data
 */

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
  const cacheKey = await generateCacheKey('finance-dashboard', 'finance')

  return getOrFetch(cacheKey, async () => {
  const supabase = await createClient()
  const currentDate = new Date()

  const [
    { data: invoicesData },
    { data: pjosData },
    { data: jobOrdersData },
    { data: paymentsData },
    { data: pendingBKKsData },
  ] = await Promise.all([
    // Invoices: no date filter (aging needs all unpaid)
    supabase
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
      .limit(500),

    // PJOs: lightweight query (3 columns, no joins)
    supabase
      .from('proforma_job_orders')
      .select('status, total_revenue_calculated, is_active')
      .eq('is_active', true)
      .limit(500),

    // JOs: lightweight query (3 columns, no joins)
    supabase
      .from('job_orders')
      .select('final_revenue, completed_at, status')
      .limit(500),

    supabase
      .from('payments')
      .select('amount, payment_date')
      .limit(500),

    // Pending BKKs: already status-filtered
    supabase
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
      .limit(100),
  ])

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

  const pjos = (pjosData || []).map(pjo => ({
    status: pjo.status,
    total_revenue_calculated: pjo.total_revenue_calculated,
    is_active: pjo.is_active ?? true,
  }))

  const jobOrders = (jobOrdersData || []).map(jo => ({
    final_revenue: jo.final_revenue,
    completed_at: jo.completed_at,
    status: jo.status,
  }))

  const payments = (paymentsData || []).map(p => ({
    amount: Number(p.amount),
    payment_date: p.payment_date,
  }))

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
  }) // end getOrFetch
}

// =====================================================
// Materialized View Actions
// =====================================================

/**
 * Monthly revenue trend from mv_monthly_revenue
 * Pre-computed from completed job_orders — faster than querying invoices
 */
export interface MVMonthlyRevenue {
  month: string
  totalRevenue: number
  totalCost: number
  totalProfit: number
  jobCount: number
}

export async function fetchMVMonthlyRevenueTrend(
  months: number = 6
): Promise<MVMonthlyRevenue[]> {
  const supabase = await createClient()

  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  const cutoffStr = cutoff.toISOString()

  const { data, error } = await supabase
    .from('mv_monthly_revenue')
    .select('month, total_revenue, total_cost, total_profit, job_count')
    .gte('month', cutoffStr)
    .not('month', 'is', null)

  if (error || !data) return []

  // Aggregate across all customers per month
  const byMonth = new Map<string, MVMonthlyRevenue>()

  for (const row of data) {
    if (!row.month) continue
    const monthKey = row.month
    const existing = byMonth.get(monthKey)
    if (existing) {
      existing.totalRevenue += Number(row.total_revenue || 0)
      existing.totalCost += Number(row.total_cost || 0)
      existing.totalProfit += Number(row.total_profit || 0)
      existing.jobCount += Number(row.job_count || 0)
    } else {
      byMonth.set(monthKey, {
        month: monthKey,
        totalRevenue: Number(row.total_revenue || 0),
        totalCost: Number(row.total_cost || 0),
        totalProfit: Number(row.total_profit || 0),
        jobCount: Number(row.job_count || 0),
      })
    }
  }

  return Array.from(byMonth.values()).sort(
    (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()
  )
}

/**
 * Customer summary from mv_customer_summary
 * Pre-computed: total jobs, revenue, outstanding AR per customer
 */
export interface MVCustomerSummary {
  customerId: string
  customerName: string
  totalJobs: number
  completedJobs: number
  totalRevenue: number
  totalCost: number
  totalProfit: number
  outstandingAR: number
  lastJobDate: string | null
}

export async function fetchMVCustomerSummaries(
  limit: number = 50
): Promise<MVCustomerSummary[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('mv_customer_summary')
    .select('*')
    .order('total_revenue', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map(row => ({
    customerId: row.customer_id || '',
    customerName: row.customer_name || 'Unknown',
    totalJobs: Number(row.total_jobs || 0),
    completedJobs: Number(row.completed_jobs || 0),
    totalRevenue: Number(row.total_revenue || 0),
    totalCost: Number(row.total_cost || 0),
    totalProfit: Number(row.total_profit || 0),
    outstandingAR: Number(row.outstanding_ar || 0),
    lastJobDate: row.last_job_date || null,
  }))
}

/**
 * Refresh all materialized views
 * Call after significant data changes or on a schedule
 */
export async function refreshMaterializedViews(): Promise<{ success: boolean }> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('refresh_materialized_views')

  return { success: !error }
}
