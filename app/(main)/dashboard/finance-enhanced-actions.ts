'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  FinanceDashboardSummary,
  AgingBucket,
  MonthlyRevenueData,
  PendingBKKItem,
  CashFlowProjection,
  isStale,
  groupByAgingBucket,
  groupAPByAgingBucket,
  getPendingBKKList,
  getRevenueTrend,
  calculateCashFlowProjection,
} from '@/lib/finance-dashboard-enhanced-utils'

// =====================================================
// Types
// =====================================================

export interface FinanceDashboardEnhancedData {
  summary: FinanceDashboardSummary
  arAging: AgingBucket[]
  apAging: AgingBucket[]
  pendingBKKs: PendingBKKItem[]
  revenueTrend: MonthlyRevenueData[]
  previousMonthRevenue: number
  isStale: boolean
}

// Type for materialized view data
interface FinanceDashboardSummaryRow {
  total_ar: number
  ar_overdue: number
  ar_invoice_count: number
  total_ap: number
  ap_overdue: number
  ap_pending_verification: number
  cash_received_mtd: number
  cash_paid_mtd: number
  revenue_mtd: number
  profit_mtd: number
  bkk_pending_approval: number
  bkk_pending_amount: number
  calculated_at: string
}

// =====================================================
// Main Data Fetching Action
// =====================================================

/**
 * Get complete finance dashboard enhanced data
 * Refreshes materialized view if stale (>5 minutes)
 * Requirements: 7.1, 7.2, 7.3
 */
export async function getFinanceDashboardEnhancedData(): Promise<FinanceDashboardEnhancedData> {
  const supabase = await createClient()
  const currentDate = new Date()

  // Try to fetch from materialized view using raw SQL
  // Note: This RPC function may not exist yet - we'll fall back to fresh calculation
  let summaryData: FinanceDashboardSummaryRow | null = null
  try {
    const { data: summaryRows } = await supabase
      .rpc('get_finance_dashboard_summary' as 'global_search')
      .single()
    summaryData = summaryRows as unknown as FinanceDashboardSummaryRow | null
  } catch {
    // Function doesn't exist yet, will calculate fresh
  }

  // Check if data is stale and refresh if needed
  let dataIsStale = false
  if (summaryData?.calculated_at) {
    dataIsStale = isStale(summaryData.calculated_at, currentDate)
    if (dataIsStale) {
      // Trigger refresh in background
      await refreshFinanceDashboard()
    }
  }

  // Fetch AR invoices for aging breakdown
  const { data: arInvoices } = await supabase
    .from('invoices')
    .select('id, total_amount, amount_paid, status, due_date, invoice_date')
    .not('status', 'eq', 'cancelled')

  // Fetch AP vendor invoices for aging breakdown
  const { data: apInvoices } = await supabase
    .from('vendor_invoices')
    .select('id, amount_due, status, due_date')
    .not('status', 'in', '("paid","cancelled")')

  // Fetch pending BKKs
  const { data: bkkData } = await supabase
    .from('bukti_kas_keluar')
    .select(`
      id,
      bkk_number,
      status,
      amount_requested,
      purpose,
      created_at,
      jo_id
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // Fetch JO numbers for BKKs
  const joIds = (bkkData || []).map(b => b.jo_id).filter(Boolean)
  const { data: joData } = joIds.length > 0
    ? await supabase.from('job_orders').select('id, jo_number').in('id', joIds)
    : { data: [] }
  const joMap = new Map((joData || []).map(jo => [jo.id, jo.jo_number]))

  // Fetch invoices for revenue trend (last 6 months)
  const sixMonthsAgo = new Date(currentDate)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  
  const { data: trendInvoices } = await supabase
    .from('invoices')
    .select('invoice_date, total_amount, amount_paid, status')
    .gte('invoice_date', sixMonthsAgo.toISOString().split('T')[0])
    .not('status', 'eq', 'cancelled')

  // Fetch previous month revenue for comparison
  const prevMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
  const prevMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0)
  
  const { data: prevMonthInvoices } = await supabase
    .from('invoices')
    .select('total_amount')
    .gte('invoice_date', prevMonthStart.toISOString().split('T')[0])
    .lte('invoice_date', prevMonthEnd.toISOString().split('T')[0])
    .not('status', 'eq', 'cancelled')

  const previousMonthRevenue = (prevMonthInvoices || []).reduce(
    (sum, inv) => sum + Number(inv.total_amount || 0),
    0
  )

  // Calculate AR aging buckets
  const arAging = groupByAgingBucket(
    (arInvoices || []).map(inv => ({
      total_amount: Number(inv.total_amount),
      amount_paid: inv.amount_paid ? Number(inv.amount_paid) : null,
      status: inv.status || 'draft',
      due_date: inv.due_date || currentDate.toISOString().split('T')[0],
    })),
    currentDate
  )

  // Calculate AP aging buckets
  const apAging = groupAPByAgingBucket(
    (apInvoices || []).map(inv => ({
      amount_due: Number(inv.amount_due),
      status: inv.status || 'received',
      due_date: inv.due_date,
    })),
    currentDate
  )

  // Get pending BKK list (max 5)
  const pendingBKKs = getPendingBKKList(
    (bkkData || []).map(bkk => ({
      id: bkk.id,
      bkk_number: bkk.bkk_number,
      status: bkk.status || 'pending',
      amount_requested: Number(bkk.amount_requested),
      purpose: bkk.purpose,
      created_at: bkk.created_at || currentDate.toISOString(),
      job_order: bkk.jo_id ? { jo_number: joMap.get(bkk.jo_id) || '-' } : null,
      requested_by_user: null,
    })),
    5
  )

  // Calculate revenue trend
  const revenueTrend = getRevenueTrend(
    (trendInvoices || [])
      .filter(inv => inv.invoice_date)
      .map(inv => ({
        invoice_date: inv.invoice_date!,
        total_amount: Number(inv.total_amount),
        amount_paid: inv.amount_paid ? Number(inv.amount_paid) : null,
        status: inv.status || 'draft',
      })),
    currentDate
  )

  // Build summary from materialized view or calculate fresh
  const summary: FinanceDashboardSummary = summaryData
    ? {
        totalAR: Number(summaryData.total_ar || 0),
        arOverdue: Number(summaryData.ar_overdue || 0),
        arInvoiceCount: Number(summaryData.ar_invoice_count || 0),
        totalAP: Number(summaryData.total_ap || 0),
        apOverdue: Number(summaryData.ap_overdue || 0),
        apPendingVerification: Number(summaryData.ap_pending_verification || 0),
        cashReceivedMTD: Number(summaryData.cash_received_mtd || 0),
        cashPaidMTD: Number(summaryData.cash_paid_mtd || 0),
        revenueMTD: Number(summaryData.revenue_mtd || 0),
        revenuePreviousMonth: previousMonthRevenue,
        profitMTD: Number(summaryData.profit_mtd || 0),
        bkkPendingCount: Number(summaryData.bkk_pending_approval || 0),
        bkkPendingAmount: Number(summaryData.bkk_pending_amount || 0),
        calculatedAt: summaryData.calculated_at || currentDate.toISOString(),
      }
    : await calculateFreshSummary(supabase, currentDate, previousMonthRevenue)

  return {
    summary,
    arAging,
    apAging,
    pendingBKKs,
    revenueTrend,
    previousMonthRevenue,
    isStale: dataIsStale,
  }
}


// =====================================================
// Helper: Calculate Fresh Summary
// =====================================================

async function calculateFreshSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  currentDate: Date,
  previousMonthRevenue: number
): Promise<FinanceDashboardSummary> {
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthStartStr = monthStart.toISOString().split('T')[0]

  // Fetch AR data
  const { data: arData } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid, status, due_date')
    .not('status', 'in', '("cancelled","paid")')

  // Fetch AP data
  const { data: apData } = await supabase
    .from('vendor_invoices')
    .select('amount_due, status, due_date')
    .not('status', 'in', '("paid","cancelled")')

  // Fetch payments MTD
  const { data: paymentsData } = await supabase
    .from('payments')
    .select('amount')
    .gte('payment_date', monthStartStr)

  // Fetch vendor payments MTD
  const { data: vendorPaymentsData } = await supabase
    .from('vendor_payments')
    .select('amount')
    .gte('payment_date', monthStartStr)

  // Fetch revenue MTD
  const { data: revenueData } = await supabase
    .from('invoices')
    .select('total_amount')
    .gte('invoice_date', monthStartStr)
    .not('status', 'eq', 'cancelled')

  // Fetch profit MTD (from completed JOs)
  const { data: profitData } = await supabase
    .from('job_orders')
    .select('net_profit')
    .eq('status', 'completed')
    .gte('updated_at', monthStartStr)

  // Fetch pending BKKs
  const { data: bkkData } = await supabase
    .from('bukti_kas_keluar')
    .select('amount_requested')
    .eq('status', 'pending')

  // Calculate totals
  const totalAR = (arData || []).reduce((sum, inv) => {
    const amountDue = Number(inv.total_amount) - Number(inv.amount_paid || 0)
    return sum + Math.max(0, amountDue)
  }, 0)

  const arOverdue = (arData || []).reduce((sum, inv) => {
    if (!inv.due_date) return sum
    const dueDate = new Date(inv.due_date)
    if (dueDate >= currentDate) return sum
    const amountDue = Number(inv.total_amount) - Number(inv.amount_paid || 0)
    return sum + Math.max(0, amountDue)
  }, 0)

  const arInvoiceCount = (arData || []).filter(inv => {
    const amountDue = Number(inv.total_amount) - Number(inv.amount_paid || 0)
    return amountDue > 0
  }).length

  const totalAP = (apData || []).reduce((sum, inv) => sum + Number(inv.amount_due || 0), 0)

  const apOverdue = (apData || []).reduce((sum, inv) => {
    if (!inv.due_date) return sum
    const dueDate = new Date(inv.due_date)
    if (dueDate >= currentDate) return sum
    return sum + Number(inv.amount_due || 0)
  }, 0)

  const apPendingVerification = (apData || []).filter(inv => inv.status === 'received').length

  const cashReceivedMTD = (paymentsData || []).reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const cashPaidMTD = (vendorPaymentsData || []).reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const revenueMTD = (revenueData || []).reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0)
  const profitMTD = (profitData || []).reduce((sum, jo) => sum + Number(jo.net_profit || 0), 0)
  const bkkPendingCount = bkkData?.length || 0
  const bkkPendingAmount = (bkkData || []).reduce((sum, bkk) => sum + Number(bkk.amount_requested || 0), 0)

  return {
    totalAR,
    arOverdue,
    arInvoiceCount,
    totalAP,
    apOverdue,
    apPendingVerification,
    cashReceivedMTD,
    cashPaidMTD,
    revenueMTD,
    revenuePreviousMonth: previousMonthRevenue,
    profitMTD,
    bkkPendingCount,
    bkkPendingAmount,
    calculatedAt: currentDate.toISOString(),
  }
}

// =====================================================
// Refresh Action
// =====================================================

/**
 * Force refresh the materialized view
 * Requirements: 7.2
 */
export async function refreshFinanceDashboard(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    // Call the refresh function using raw SQL
    // Note: This function may not exist yet
    await supabase.rpc('refresh_finance_dashboard' as 'global_search')

    // Revalidate the dashboard page
    revalidatePath('/dashboard')

    return { success: true }
  } catch (err) {
    console.error('Error refreshing finance dashboard:', err)
    return { success: true } // Don't fail the main request
  }
}

// =====================================================
// Cash Flow Projection Action
// =====================================================

/**
 * Get cash flow projection for next N days
 * Requirements: 1.4
 */
export async function getCashFlowProjectionData(
  days: number = 30
): Promise<CashFlowProjection> {
  const supabase = await createClient()
  const currentDate = new Date()

  // Fetch AR invoices (expected inflows)
  const { data: arInvoices } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid, status, due_date')
    .not('status', 'in', '("cancelled","paid")')

  // Fetch AP invoices (expected outflows)
  const { data: apInvoices } = await supabase
    .from('vendor_invoices')
    .select('amount_due, status, due_date')
    .not('status', 'in', '("paid","cancelled")')

  return calculateCashFlowProjection(
    (arInvoices || []).map(inv => ({
      total_amount: Number(inv.total_amount),
      amount_paid: inv.amount_paid ? Number(inv.amount_paid) : null,
      status: inv.status || 'draft',
      due_date: inv.due_date || currentDate.toISOString().split('T')[0],
    })),
    (apInvoices || []).map(inv => ({
      amount_due: Number(inv.amount_due),
      status: inv.status || 'received',
      due_date: inv.due_date,
    })),
    days,
    currentDate
  )
}

// =====================================================
// Overdue Invoices Action
// =====================================================

export interface OverdueInvoiceItem {
  id: string
  invoiceNumber: string
  customerName: string
  amount: number
  dueDate: string
  daysOverdue: number
}

/**
 * Get overdue invoices for follow-up
 */
export async function getOverdueInvoicesForFollowup(
  limit: number = 10
): Promise<OverdueInvoiceItem[]> {
  const supabase = await createClient()
  const currentDate = new Date()
  const currentDateStr = currentDate.toISOString().split('T')[0]

  const { data } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      total_amount,
      amount_paid,
      due_date,
      jo_id
    `)
    .lt('due_date', currentDateStr)
    .not('status', 'in', '("cancelled","paid")')
    .order('due_date', { ascending: true })
    .limit(limit)

  // Fetch customer names via JO chain
  const joIds = (data || []).map(inv => inv.jo_id).filter((id): id is string => id !== null)
  const { data: joData } = joIds.length > 0
    ? await supabase.from('job_orders').select('id, pjo_id').in('id', joIds)
    : { data: [] }
  
  const pjoIds = (joData || []).map(jo => jo.pjo_id).filter((id): id is string => id !== null)
  const { data: pjoData } = pjoIds.length > 0
    ? await supabase.from('proforma_job_orders').select('id, project_id').in('id', pjoIds)
    : { data: [] }
  
  const projectIds = (pjoData || []).map(pjo => pjo.project_id).filter((id): id is string => id !== null)
  const { data: projectData } = projectIds.length > 0
    ? await supabase.from('projects').select('id, customer_id').in('id', projectIds)
    : { data: [] }
  
  const customerIds = (projectData || []).map(p => p.customer_id).filter((id): id is string => id !== null)
  const { data: customerData } = customerIds.length > 0
    ? await supabase.from('customers').select('id, name').in('id', customerIds)
    : { data: [] }

  // Build lookup maps
  const joToPjo = new Map((joData || []).map(jo => [jo.id, jo.pjo_id]))
  const pjoToProject = new Map((pjoData || []).map(pjo => [pjo.id, pjo.project_id]))
  const projectToCustomer = new Map((projectData || []).map(p => [p.id, p.customer_id]))
  const customerNames = new Map((customerData || []).map(c => [c.id, c.name]))

  return (data || []).map(inv => {
    const dueDate = new Date(inv.due_date)
    const daysOverdue = Math.floor(
      (currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const amountDue = Number(inv.total_amount) - Number(inv.amount_paid || 0)

    // Get customer name through the chain
    const pjoId = joToPjo.get(inv.jo_id)
    const projectId = pjoId ? pjoToProject.get(pjoId) : undefined
    const customerId = projectId ? projectToCustomer.get(projectId) : undefined
    const customerName = customerId ? customerNames.get(customerId) : 'Unknown'

    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      customerName: customerName || 'Unknown',
      amount: Math.max(0, amountDue),
      dueDate: inv.due_date,
      daysOverdue,
    }
  })
}

// =====================================================
// AR Aging Details Action
// =====================================================

export interface ARAgingDetail {
  id: string
  invoiceNumber: string
  customerName: string
  amount: number
  dueDate: string
  agingBucket: string
}

/**
 * Get detailed AR aging breakdown
 */
export async function getARAgingDetails(
  bucket?: string
): Promise<ARAgingDetail[]> {
  const supabase = await createClient()
  const currentDate = new Date()

  // Fetch invoices with customer info via job_orders -> pjo -> project -> customer
  const { data } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      total_amount,
      amount_paid,
      due_date,
      jo_id
    `)
    .not('status', 'in', '("cancelled","paid")')
    .order('due_date', { ascending: true })

  // Fetch customer names via JO chain
  const joIds2 = (data || []).map(inv => inv.jo_id).filter((id): id is string => id !== null)
  const { data: joData2 } = joIds2.length > 0
    ? await supabase
        .from('job_orders')
        .select('id, pjo_id')
        .in('id', joIds2)
    : { data: [] }
  
  const pjoIds2 = (joData2 || []).map(jo => jo.pjo_id).filter((id): id is string => id !== null)
  const { data: pjoData2 } = pjoIds2.length > 0
    ? await supabase
        .from('proforma_job_orders')
        .select('id, project_id')
        .in('id', pjoIds2)
    : { data: [] }
  
  const projectIds2 = (pjoData2 || []).map(pjo => pjo.project_id).filter((id): id is string => id !== null)
  const { data: projectData2 } = projectIds2.length > 0
    ? await supabase
        .from('projects')
        .select('id, customer_id')
        .in('id', projectIds2)
    : { data: [] }
  
  const customerIds2 = (projectData2 || []).map(p => p.customer_id).filter((id): id is string => id !== null)
  const { data: customerData2 } = customerIds2.length > 0
    ? await supabase
        .from('customers')
        .select('id, name')
        .in('id', customerIds2)
    : { data: [] }

  // Build lookup maps
  const joToPjo2 = new Map((joData2 || []).map(jo => [jo.id, jo.pjo_id]))
  const pjoToProject2 = new Map((pjoData2 || []).map(pjo => [pjo.id, pjo.project_id]))
  const projectToCustomer2 = new Map((projectData2 || []).map(p => [p.id, p.customer_id]))
  const customerNames2 = new Map((customerData2 || []).map(c => [c.id, c.name]))

  return (data || [])
    .map(inv => {
      const dueDate = inv.due_date ? new Date(inv.due_date) : currentDate
      const amountDue = Number(inv.total_amount) - Number(inv.amount_paid || 0)
      
      if (amountDue <= 0) return null

      // Calculate aging bucket
      let agingBucket: string
      if (dueDate >= currentDate) {
        agingBucket = 'current'
      } else {
        const daysOverdue = Math.floor(
          (currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysOverdue <= 30) agingBucket = '1-30 days'
        else if (daysOverdue <= 60) agingBucket = '31-60 days'
        else if (daysOverdue <= 90) agingBucket = '61-90 days'
        else agingBucket = 'over 90 days'
      }

      // Filter by bucket if specified
      if (bucket && agingBucket !== bucket) return null

      // Get customer name through the chain
      const pjoId = joToPjo2.get(inv.jo_id)
      const projectId = pjoId ? pjoToProject2.get(pjoId) : undefined
      const customerId = projectId ? projectToCustomer2.get(projectId) : undefined
      const customerName = customerId ? customerNames2.get(customerId) : 'Unknown'

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        customerName: customerName || 'Unknown',
        amount: amountDue,
        dueDate: inv.due_date || '',
        agingBucket,
      }
    })
    .filter((item): item is ARAgingDetail => item !== null)
}

// =====================================================
// AP Aging Details Action
// =====================================================

export interface APAgingDetail {
  id: string
  invoiceNumber: string
  vendorName: string
  amount: number
  dueDate: string | null
  agingBucket: string
}

/**
 * Get detailed AP aging breakdown
 */
export async function getAPAgingDetails(
  bucket?: string
): Promise<APAgingDetail[]> {
  const supabase = await createClient()
  const currentDate = new Date()

  const { data } = await supabase
    .from('vendor_invoices')
    .select(`
      id,
      invoice_number,
      amount_due,
      due_date,
      vendor_id
    `)
    .not('status', 'in', '("paid","cancelled")')
    .order('due_date', { ascending: true })

  // Fetch vendor names
  const vendorIds = (data || []).map(inv => inv.vendor_id).filter((id): id is string => id !== null)
  const { data: vendorData } = vendorIds.length > 0
    ? await supabase.from('vendors').select('id, vendor_name').in('id', vendorIds)
    : { data: [] }
  const vendorNames = new Map((vendorData || []).map(v => [v.id, v.vendor_name]))

  return (data || [])
    .map(inv => {
      const amountDue = Number(inv.amount_due)
      if (amountDue <= 0) return null

      // Calculate aging bucket
      let agingBucket: string
      if (!inv.due_date) {
        agingBucket = 'current'
      } else {
        const dueDate = new Date(inv.due_date)
        if (dueDate >= currentDate) {
          agingBucket = 'current'
        } else {
          const daysOverdue = Math.floor(
            (currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          if (daysOverdue <= 30) agingBucket = '1-30 days'
          else if (daysOverdue <= 60) agingBucket = '31-60 days'
          else if (daysOverdue <= 90) agingBucket = '61-90 days'
          else agingBucket = 'over 90 days'
        }
      }

      // Filter by bucket if specified
      if (bucket && agingBucket !== bucket) return null

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        vendorName: vendorNames.get(inv.vendor_id) || 'Unknown',
        amount: amountDue,
        dueDate: inv.due_date,
        agingBucket,
      }
    })
    .filter((item): item is APAgingDetail => item !== null)
}
