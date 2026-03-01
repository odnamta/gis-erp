'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrFetch, generateCacheKey } from '@/lib/dashboard-cache'
import { groupInvoicesByAging, type ARAgingData } from '@/lib/finance-dashboard-utils'

// Supporting interfaces for approval queue items
export interface ApprovalQueueItem {
  count: number
  totalValue: number
}

// Supporting interface for admin pipeline data
export interface AdminPipelineData {
  draftPJOs: number
  pendingApprovalPJOs: number
  activeJOs: number
  completedJOs: number
}

// Supporting interface for recent invoices
export interface RecentInvoice {
  id: string
  invoice_number: string
  customer_name: string
  total_amount: number
  status: string
  created_at: string
}

// Supporting interface for recent payments
export interface RecentPayment {
  id: string
  invoice_number: string
  customer_name: string
  total_amount: number
  paid_at: string
}

// Supporting interface for recent PJO approvals
export interface RecentPJOApproval {
  id: string
  pjo_number: string
  description: string
  estimated_amount: number
  status: 'approved' | 'rejected'
  decision_at: string
}

export interface FinanceManagerMetrics {
  // Administration
  pendingPJOs: number
  draftInvoices: number
  documentQueue: number
  
  // Finance
  pendingBKK: number
  arOutstanding: number
  cashPosition: number
  
  // KPIs
  revenueMTD: number
  revenueMTDChange: number
  grossMargin: number
  grossMarginVsTarget: number
  collectionRate: number
  costControl: number
  
  // Cross-department
  quotationsWonPendingPJO: number
  budgetExceededCount: number
  
  // NEW: Financial Overview
  revenueYTD: number
  expensesMTD: number
  grossProfit: number
  
  // NEW: AR Enhancement
  arOverdue: number
  arAging: ARAgingData
  overdueInvoicesCount: number
  overdueInvoicesAmount: number
  
  // NEW: Accounts Payable
  apOutstanding: number
  apDueThisWeek: number
  
  // NEW: Approval Queue
  pendingPJOApprovals: ApprovalQueueItem
  pendingDisbursementApprovals: ApprovalQueueItem
  
  // NEW: Administration Enhancement
  pjosReadyForJO: number
  josPendingInvoice: number
  adminPipeline: AdminPipelineData
  
  // NEW: Recent Activity
  recentInvoices: RecentInvoice[]
  recentPayments: RecentPayment[]
  recentPJOApprovals: RecentPJOApproval[]
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getFinanceManagerMetrics(): Promise<FinanceManagerMetrics> {
  const cacheKey = await generateCacheKey('finance-manager-metrics', 'finance_manager')
  
  return getOrFetch(cacheKey, async () => {
    const supabase = await createClient()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    // Run all queries in parallel
    const [
      pendingPJOsResult,
      draftInvoicesResult,
      pendingBKKResult,
      arOutstandingResult,
      revenueMTDResult,
      revenueLastMonthResult,
      costsMTDResult,
      totalInvoicedResult,
      totalPaidResult,
      wonQuotationsResult,
      pjosWithQuotationResult,
      budgetExceededResult,
      revenueYTDResult,
      expensesMTDResult,
      arAgingDataResult,
      apOutstandingResult,
      apDueThisWeekResult,
      pendingPJOApprovalsResult,
      pendingDisbursementApprovalsResult,
      recentInvoicesResult,
      recentPaymentsResult,
      recentPJOApprovalsResult,
      pjosReadyForJOResult,
      josPendingInvoiceResult,
      draftPJOsResult,
      activeJOsResult,
    ] = await Promise.all([
      // Pending PJOs (awaiting approval)
      supabase
        .from('proforma_job_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_approval'),
      
      // Draft Invoices
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft'),
      
      // Pending BKK
      supabase
        .from('bukti_kas_keluar' as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft'),
      
      // AR Outstanding (unpaid invoices)
      supabase
        .from('invoices')
        .select('total_amount, amount_paid')
        .in('status', ['sent', 'overdue', 'partial']),
      
      // Revenue MTD (completed job orders this month)
      supabase
        .from('job_orders')
        .select('final_revenue')
        .gte('completed_at', startOfMonth.toISOString())
        .not('final_revenue', 'is', null),
      
      // Revenue Last Month (for comparison)
      supabase
        .from('job_orders')
        .select('final_revenue')
        .gte('completed_at', startOfLastMonth.toISOString())
        .lte('completed_at', endOfLastMonth.toISOString())
        .not('final_revenue', 'is', null),
      
      // Costs MTD (for gross margin)
      supabase
        .from('job_orders')
        .select('final_cost')
        .gte('completed_at', startOfMonth.toISOString())
        .not('final_cost', 'is', null),
      
      // Total Invoiced (for collection rate)
      supabase
        .from('invoices')
        .select('total_amount')
        .in('status', ['sent', 'paid', 'partial', 'overdue']),
      
      // Total Paid (for collection rate)
      supabase
        .from('invoices')
        .select('amount_paid')
        .in('status', ['sent', 'paid', 'partial', 'overdue']),
      
      // Won quotations
      supabase
        .from('quotations')
        .select('id')
        .eq('status', 'won'),
      
      // PJOs with quotation_id (to exclude from won quotations)
      supabase
        .from('proforma_job_orders')
        .select('quotation_id')
        .not('quotation_id', 'is', null),
      
      // Budget exceeded count (PJO cost items)
      supabase
        .from('pjo_cost_items')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'exceeded'),
      
      // Revenue YTD (paid invoices this year)
      supabase
        .from('invoices')
        .select('total_amount')
        .eq('status', 'paid')
        .gte('paid_at', startOfYear.toISOString())
        .lt('paid_at', startOfNextYear.toISOString()),
      
      // Expenses MTD (approved/paid BKK records this month)
      supabase
        .from('bukti_kas_keluar' as any)
        .select('amount_requested')
        .in('status', ['approved', 'paid'])
        .gte('approved_at', startOfMonth.toISOString()),
      
      // AR Aging data (all outstanding invoices with due_date for aging calculation)
      supabase
        .from('invoices')
        .select('id, due_date, total_amount, amount_paid, status')
        .in('status', ['sent', 'overdue']),
      
      // AP Outstanding (pending disbursements)
      supabase
        .from('bukti_kas_keluar' as any)
        .select('amount_requested')
        .in('status', ['draft', 'pending_check', 'pending_approval']),
      
      // AP Due This Week (approved BKK records created in last 7 days - proxy for urgency)
      supabase
        .from('bukti_kas_keluar' as any)
        .select('amount_requested')
        .eq('status', 'approved')
        .gte('created_at', sevenDaysAgo.toISOString()),
      
      // Pending PJO Approvals (count and value)
      supabase
        .from('proforma_job_orders')
        .select('id, estimated_amount')
        .eq('status', 'pending_approval')
        .eq('is_active', true),
      
      // Pending Disbursement Approvals (count and value)
      supabase
        .from('bukti_kas_keluar' as any)
        .select('id, amount_requested')
        .in('status', ['pending_check', 'pending_approval']),
      
      // Recent Invoices (last 5 created)
      supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, status, created_at, customers(name)')
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Recent Payments (last 5 paid invoices)
      supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, paid_at, customers(name)')
        .eq('status', 'paid')
        .not('paid_at', 'is', null)
        .order('paid_at', { ascending: false })
        .limit(5),
      
      // Recent PJO Approvals (last 5 approved/rejected)
      supabase
        .from('proforma_job_orders')
        .select('id, pjo_number, description, estimated_amount, status, approved_at, rejected_at')
        .in('status', ['approved', 'rejected'])
        .eq('is_active', true)
        .order('approved_at', { ascending: false, nullsFirst: false })
        .limit(5),
      
      // PJOs Ready for JO (approved but not converted)
      supabase
        .from('proforma_job_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved')
        .or('converted_to_jo.is.null,converted_to_jo.eq.false')
        .eq('is_active', true),
      
      // JOs Pending Invoice (completed or submitted_to_finance)
      supabase
        .from('job_orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['completed', 'submitted_to_finance']),
      
      // Admin Pipeline - Draft PJOs
      supabase
        .from('proforma_job_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft')
        .eq('is_active', true),
      
      // Admin Pipeline - Active JOs
      supabase
        .from('job_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
    ])
    
    // Calculate AR Outstanding
    const arOutstanding = (arOutstandingResult.data || []).reduce((sum, inv) => {
      return sum + ((inv.total_amount || 0) - (inv.amount_paid || 0))
    }, 0)
    
    // Calculate Revenue MTD
    const revenueMTD = (revenueMTDResult.data || []).reduce((sum, jo) => {
      return sum + (jo.final_revenue || 0)
    }, 0)
    
    // Calculate Revenue Last Month
    const revenueLastMonth = (revenueLastMonthResult.data || []).reduce((sum, jo) => {
      return sum + (jo.final_revenue || 0)
    }, 0)
    
    // Calculate Revenue Change %
    const revenueMTDChange = revenueLastMonth > 0 
      ? Math.round(((revenueMTD - revenueLastMonth) / revenueLastMonth) * 100)
      : 0
    
    // Calculate Costs MTD
    const costsMTD = (costsMTDResult.data || []).reduce((sum, jo) => {
      return sum + (jo.final_cost || 0)
    }, 0)
    
    // Calculate Gross Margin
    const grossMargin = revenueMTD > 0 
      ? Math.round(((revenueMTD - costsMTD) / revenueMTD) * 100)
      : 0
    
    // Calculate Collection Rate
    const totalInvoiced = (totalInvoicedResult.data || []).reduce((sum, inv) => {
      return sum + (inv.total_amount || 0)
    }, 0)
    const totalPaid = (totalPaidResult.data || []).reduce((sum, inv) => {
      return sum + (inv.amount_paid || 0)
    }, 0)
    const collectionRate = totalInvoiced > 0 
      ? Math.round((totalPaid / totalInvoiced) * 100)
      : 0
    
    // Calculate quotations won but not yet converted to PJO
    const wonQuotationIds = new Set((wonQuotationsResult.data || []).map(q => q.id))
    const convertedQuotationIds = new Set(
      (pjosWithQuotationResult.data || [])
        .map(p => p.quotation_id)
        .filter(Boolean)
    )
    const quotationsWonPendingPJO = [...wonQuotationIds].filter(id => !convertedQuotationIds.has(id)).length
    
    // Calculate Revenue YTD (sum of paid invoices this year)
    const revenueYTD = (revenueYTDResult.data || []).reduce((sum, inv) => {
      return sum + (inv.total_amount || 0)
    }, 0)
    
    // Calculate Expenses MTD (sum of approved/paid BKK records this month)
    const expensesMTDData = (expensesMTDResult.data || []) as { amount_requested?: number }[]
    const expensesMTD = expensesMTDData.reduce((sum, bkk) => {
      return sum + (bkk.amount_requested || 0)
    }, 0)
    
    // Calculate Gross Profit (Revenue MTD - Expenses MTD)
    const grossProfit = revenueMTD - expensesMTD
    
    // Calculate AR Overdue (invoices > 30 days past due)
    const arOverdueInvoices = (arAgingDataResult.data || []).filter(inv => {
      if (!inv.due_date) return false
      const dueDate = new Date(inv.due_date)
      return dueDate < thirtyDaysAgo
    })
    const arOverdue = arOverdueInvoices.reduce((sum, inv) => {
      return sum + ((inv.total_amount || 0) - (inv.amount_paid || 0))
    }, 0)
    
    // Calculate overdue invoices count and amount
    const overdueInvoicesCount = arOverdueInvoices.length
    const overdueInvoicesAmount = arOverdue
    
    // Calculate AR Aging using utility function
    const arAging = groupInvoicesByAging(
      (arAgingDataResult.data || []).map(inv => ({
        id: inv.id,
        due_date: inv.due_date || '',
        total_amount: (inv.total_amount || 0) - (inv.amount_paid || 0),
        status: inv.status
      })),
      now
    )
    
    // Calculate AP Outstanding (sum of pending disbursements)
    const apOutstandingData = (apOutstandingResult.data || []) as { amount_requested?: number }[]
    const apOutstanding = apOutstandingData.reduce((sum, bkk) => {
      return sum + (bkk.amount_requested || 0)
    }, 0)

    // Calculate AP Due This Week (approved BKK records from last 7 days)
    const apDueThisWeekData = (apDueThisWeekResult.data || []) as { amount_requested?: number }[]
    const apDueThisWeek = apDueThisWeekData.reduce((sum, bkk) => {
      return sum + (bkk.amount_requested || 0)
    }, 0)
    
    // Calculate Pending PJO Approvals (count and total value)
    const pendingPJOApprovalsData = pendingPJOApprovalsResult.data || []
    const pendingPJOApprovals: ApprovalQueueItem = {
      count: pendingPJOApprovalsData.length,
      totalValue: pendingPJOApprovalsData.reduce((sum, pjo) => sum + (pjo.estimated_amount || 0), 0)
    }
    
    // Calculate Pending Disbursement Approvals (count and total value)
    const pendingDisbursementApprovalsData = (pendingDisbursementApprovalsResult.data || []) as { id: string; amount_requested?: number }[]
    const pendingDisbursementApprovals: ApprovalQueueItem = {
      count: pendingDisbursementApprovalsData.length,
      totalValue: pendingDisbursementApprovalsData.reduce((sum, bkk) => sum + (bkk.amount_requested || 0), 0)
    }
    
    // Transform Recent Invoices
    const recentInvoices: RecentInvoice[] = (recentInvoicesResult.data || []).map(inv => ({
      id: inv.id,
      invoice_number: inv.invoice_number || '',
      customer_name: (inv.customers as { name: string } | null)?.name || 'Unknown Customer',
      total_amount: inv.total_amount || 0,
      status: inv.status || '',
      created_at: inv.created_at || ''
    }))
    
    // Transform Recent Payments
    const recentPayments: RecentPayment[] = (recentPaymentsResult.data || []).map(inv => ({
      id: inv.id,
      invoice_number: inv.invoice_number || '',
      customer_name: (inv.customers as { name: string } | null)?.name || 'Unknown Customer',
      total_amount: inv.total_amount || 0,
      paid_at: inv.paid_at || ''
    }))
    
    // Transform Recent PJO Approvals
    const recentPJOApprovals: RecentPJOApproval[] = (recentPJOApprovalsResult.data || [])
      .map(pjo => ({
        id: pjo.id,
        pjo_number: pjo.pjo_number || '',
        description: pjo.description || '',
        estimated_amount: pjo.estimated_amount || 0,
        status: pjo.status as 'approved' | 'rejected',
        decision_at: pjo.approved_at || pjo.rejected_at || ''
      }))
      .sort((a, b) => new Date(b.decision_at).getTime() - new Date(a.decision_at).getTime())
      .slice(0, 5)
    
    // Calculate PJOs Ready for JO (approved but not converted)
    const pjosReadyForJO = pjosReadyForJOResult.count || 0
    
    // Calculate JOs Pending Invoice (completed or submitted_to_finance)
    const josPendingInvoice = josPendingInvoiceResult.count || 0
    
    // Calculate Admin Pipeline
    const adminPipeline: AdminPipelineData = {
      draftPJOs: draftPJOsResult.count || 0,
      pendingApprovalPJOs: pendingPJOsResult.count || 0, // Reuse existing pending PJOs count
      activeJOs: activeJOsResult.count || 0,
      completedJOs: josPendingInvoice, // Same as JOs pending invoice
    }
    
    return {
      // Existing metrics
      pendingPJOs: pendingPJOsResult.count || 0,
      draftInvoices: draftInvoicesResult.count || 0,
      documentQueue: (pendingPJOsResult.count || 0) + (draftInvoicesResult.count || 0),
      pendingBKK: pendingBKKResult.count || 0,
      arOutstanding,
      cashPosition: 0, // Would need a separate cash/bank table
      revenueMTD,
      revenueMTDChange,
      grossMargin,
      grossMarginVsTarget: grossMargin - 26, // Target is 26%
      collectionRate,
      costControl: 100 - Math.min((budgetExceededResult.count || 0) * 2, 20), // Deduct 2% per exceeded item, max 20%
      quotationsWonPendingPJO,
      budgetExceededCount: budgetExceededResult.count || 0,
      
      // NEW: Financial Overview
      revenueYTD,
      expensesMTD,
      grossProfit,
      
      // NEW: AR Enhancement
      arOverdue,
      arAging,
      overdueInvoicesCount,
      overdueInvoicesAmount,
      
      // NEW: Accounts Payable
      apOutstanding,
      apDueThisWeek,
      
      // NEW: Approval Queue
      pendingPJOApprovals,
      pendingDisbursementApprovals,
      
      // NEW: Administration Enhancement
      pjosReadyForJO,
      josPendingInvoice,
      adminPipeline,
      
      // NEW: Recent Activity
      recentInvoices,
      recentPayments,
      recentPJOApprovals,
    }
  }, CACHE_TTL)
}
