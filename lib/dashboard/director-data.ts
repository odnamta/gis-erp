'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrFetch, generateCacheKey } from '@/lib/dashboard-cache'

/**
 * Director Dashboard Data Service
 * 
 * Provides business-focused metrics and operational oversight for director role users.
 * Emphasizes business performance, operational KPIs, pipeline visibility, and financial health.
 * 
 * Requirements covered:
 * - 1.1-1.4: Business Performance (revenue, profit, margin, MoM change)
 * - 2.1-2.5: Operational KPIs (active jobs, completed jobs, completion rate, pending approvals)
 * - 3.1-3.5: Pipeline Overview (quotations, PJOs, win rate)
 * - 4.1-4.3: Financial Health (AR outstanding, AR overdue, collection rate)
 * - 6.1-6.2: Recent Activity (completed jobs, won quotations)
 * - 7.1-7.4: Data Caching (5-minute TTL)
 */

// Supporting interface for recent completed jobs
export interface RecentCompletedJob {
  id: string
  joNumber: string
  customerName: string
  finalRevenue: number
  completedAt: string
}

// Supporting interface for recent won quotations
export interface RecentWonQuotation {
  id: string
  quotationNumber: string
  customerName: string
  totalRevenue: number
  outcomeDate: string
}

// Supporting interface for pipeline summary
export interface PipelineSummary {
  quotationsDraft: number
  quotationsSubmitted: number
  quotationsWon: number
  quotationsLost: number
  pjosDraft: number
  pjosPendingApproval: number
  pjosApproved: number
  winRate: number
  wonValueThisMonth: number
}

// Main metrics interface for Director Dashboard
export interface DirectorDashboardMetrics {
  // Business Performance (Requirement 1)
  totalRevenue: number
  totalProfit: number
  profitMargin: number
  revenueMTD: number
  revenueLastMonth: number
  revenueChangePercent: number
  
  // Operational KPIs (Requirement 2)
  activeJobs: number
  completedJobsThisMonth: number
  jobCompletionRate: number
  pendingPJOApprovals: number
  pendingBKKApprovals: number
  
  // Pipeline Overview (Requirement 3)
  pipeline: PipelineSummary
  
  // Financial Health (Requirement 4)
  arOutstanding: number
  arOverdue: number
  collectionRate: number
  
  // Recent Activity (Requirement 6)
  recentCompletedJobs: RecentCompletedJob[]
  recentWonQuotations: RecentWonQuotation[]
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Fetches all director dashboard metrics with caching
 * Uses Promise.all for parallel database queries to optimize performance
 * 
 * @returns DirectorDashboardMetrics - All metrics for the director dashboard
 */
export async function getDirectorDashboardMetrics(): Promise<DirectorDashboardMetrics> {
  const cacheKey = await generateCacheKey('director-dashboard-metrics', 'director')
  
  return getOrFetch(cacheKey, async () => {
    const supabase = await createClient()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    
    // Run all queries in parallel for performance
    const [
      // Business Performance queries
      totalRevenueResult,
      revenueMTDResult,
      revenueLastMonthResult,
      
      // Operational KPIs queries
      activeJobsResult,
      completedJobsThisMonthResult,
      totalJobsThisMonthResult,
      pendingPJOApprovalsResult,
      pendingBKKApprovalsResult,
      
      // Pipeline queries
      quotationsDraftResult,
      quotationsSubmittedResult,
      quotationsWonResult,
      quotationsLostResult,
      pjosDraftResult,
      pjosPendingApprovalResult,
      pjosApprovedResult,
      wonValueThisMonthResult,
      
      // Financial Health queries
      arOutstandingResult,
      arOverdueResult,
      totalInvoicedResult,
      totalPaidResult,
      
      // Recent Activity queries
      recentCompletedJobsResult,
      recentWonQuotationsResult,
    ] = await Promise.all([
      // Total Revenue and Cost (for profit calculation)
      supabase
        .from('job_orders')
        .select('final_revenue, final_cost')
        .not('final_revenue', 'is', null),
      
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
      
      // Active Jobs count
      supabase
        .from('job_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      
      // Completed Jobs This Month
      supabase
        .from('job_orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['completed', 'submitted_to_finance', 'invoiced', 'closed'])
        .gte('completed_at', startOfMonth.toISOString()),
      
      // Total Jobs This Month (for completion rate)
      supabase
        .from('job_orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString()),
      
      // Pending PJO Approvals
      supabase
        .from('proforma_job_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_approval')
        .eq('is_active', true),
      
      // Pending BKK Approvals
      supabase
        .from('bkk_records')
        .select('id', { count: 'exact', head: true })
        .in('workflow_status', ['pending_check', 'pending_approval'])
        .eq('is_active', true),
      
      // Quotations by status - Draft
      supabase
        .from('quotations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft')
        .eq('is_active', true),
      
      // Quotations by status - Submitted
      supabase
        .from('quotations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'submitted')
        .eq('is_active', true),
      
      // Quotations by status - Won
      supabase
        .from('quotations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'won')
        .eq('is_active', true),
      
      // Quotations by status - Lost
      supabase
        .from('quotations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'lost')
        .eq('is_active', true),
      
      // PJOs by status - Draft
      supabase
        .from('proforma_job_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft')
        .eq('is_active', true),
      
      // PJOs by status - Pending Approval
      supabase
        .from('proforma_job_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_approval')
        .eq('is_active', true),
      
      // PJOs by status - Approved
      supabase
        .from('proforma_job_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved')
        .eq('is_active', true),
      
      // Won Quotation Value This Month
      supabase
        .from('quotations')
        .select('total_revenue')
        .eq('status', 'won')
        .gte('outcome_date', startOfMonth.toISOString())
        .eq('is_active', true),
      
      // AR Outstanding (unpaid invoices)
      supabase
        .from('invoices')
        .select('total_amount, amount_paid')
        .in('status', ['sent', 'overdue', 'partial']),
      
      // AR Overdue (invoices past due date)
      supabase
        .from('invoices')
        .select('total_amount, amount_paid, due_date')
        .in('status', ['sent', 'overdue', 'partial']),
      
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
      
      // Recent Completed Jobs (last 5)
      supabase
        .from('job_orders')
        .select('id, jo_number, final_revenue, completed_at, customers(name)')
        .in('status', ['completed', 'submitted_to_finance', 'invoiced', 'closed'])
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(5),
      
      // Recent Won Quotations (last 5)
      supabase
        .from('quotations')
        .select('id, quotation_number, total_revenue, outcome_date, customers(name)')
        .eq('status', 'won')
        .not('outcome_date', 'is', null)
        .order('outcome_date', { ascending: false })
        .limit(5),
    ])
    
    // Calculate Total Revenue and Total Cost
    const totalRevenue = (totalRevenueResult.data || []).reduce((sum, jo) => {
      return sum + (jo.final_revenue || 0)
    }, 0)
    
    const totalCost = (totalRevenueResult.data || []).reduce((sum, jo) => {
      return sum + (jo.final_cost || 0)
    }, 0)
    
    // Calculate Total Profit
    const totalProfit = totalRevenue - totalCost
    
    // Calculate Profit Margin (handle division by zero)
    const profitMargin = totalRevenue > 0
      ? Math.round((totalProfit / totalRevenue) * 100 * 10) / 10 // One decimal place
      : 0
    
    // Calculate Revenue MTD
    const revenueMTD = (revenueMTDResult.data || []).reduce((sum, jo) => {
      return sum + (jo.final_revenue || 0)
    }, 0)
    
    // Calculate Revenue Last Month
    const revenueLastMonth = (revenueLastMonthResult.data || []).reduce((sum, jo) => {
      return sum + (jo.final_revenue || 0)
    }, 0)
    
    // Calculate Revenue Change % (handle division by zero)
    const revenueChangePercent = revenueLastMonth > 0
      ? Math.round(((revenueMTD - revenueLastMonth) / revenueLastMonth) * 100 * 10) / 10
      : 0
    
    // Get Operational KPIs
    const activeJobs = activeJobsResult.count || 0
    const completedJobsThisMonth = completedJobsThisMonthResult.count || 0
    const totalJobsThisMonth = totalJobsThisMonthResult.count || 0
    
    // Calculate Job Completion Rate (handle division by zero)
    const jobCompletionRate = totalJobsThisMonth > 0
      ? Math.round((completedJobsThisMonth / totalJobsThisMonth) * 100 * 10) / 10
      : 0
    
    const pendingPJOApprovals = pendingPJOApprovalsResult.count || 0
    const pendingBKKApprovals = pendingBKKApprovalsResult.count || 0
    
    // Get Pipeline counts
    const quotationsDraft = quotationsDraftResult.count || 0
    const quotationsSubmitted = quotationsSubmittedResult.count || 0
    const quotationsWon = quotationsWonResult.count || 0
    const quotationsLost = quotationsLostResult.count || 0
    const pjosDraft = pjosDraftResult.count || 0
    const pjosPendingApproval = pjosPendingApprovalResult.count || 0
    const pjosApproved = pjosApprovedResult.count || 0
    
    // Calculate Win Rate (handle division by zero)
    const totalDecidedQuotations = quotationsWon + quotationsLost
    const winRate = totalDecidedQuotations > 0
      ? Math.round((quotationsWon / totalDecidedQuotations) * 100 * 10) / 10
      : 0
    
    // Calculate Won Value This Month
    const wonValueThisMonth = (wonValueThisMonthResult.data || []).reduce((sum, q) => {
      return sum + (q.total_revenue || 0)
    }, 0)
    
    // Calculate AR Outstanding
    const arOutstanding = (arOutstandingResult.data || []).reduce((sum, inv) => {
      return sum + ((inv.total_amount || 0) - (inv.amount_paid || 0))
    }, 0)
    
    // Calculate AR Overdue (invoices past due date)
    const arOverdue = (arOverdueResult.data || []).reduce((sum, inv) => {
      if (!inv.due_date) return sum
      const dueDate = new Date(inv.due_date)
      if (dueDate < now) {
        return sum + ((inv.total_amount || 0) - (inv.amount_paid || 0))
      }
      return sum
    }, 0)
    
    // Calculate Collection Rate
    const totalInvoiced = (totalInvoicedResult.data || []).reduce((sum, inv) => {
      return sum + (inv.total_amount || 0)
    }, 0)
    const totalPaid = (totalPaidResult.data || []).reduce((sum, inv) => {
      return sum + (inv.amount_paid || 0)
    }, 0)
    const collectionRate = totalInvoiced > 0
      ? Math.round((totalPaid / totalInvoiced) * 100 * 10) / 10
      : 0
    
    // Transform Recent Completed Jobs
    const recentCompletedJobs: RecentCompletedJob[] = (recentCompletedJobsResult.data || []).map(jo => ({
      id: jo.id,
      joNumber: jo.jo_number || '',
      customerName: (jo.customers as { name: string } | null)?.name || 'Unknown Customer',
      finalRevenue: jo.final_revenue || 0,
      completedAt: jo.completed_at || '',
    }))
    
    // Transform Recent Won Quotations
    const recentWonQuotations: RecentWonQuotation[] = (recentWonQuotationsResult.data || []).map(q => ({
      id: q.id,
      quotationNumber: q.quotation_number || '',
      customerName: (q.customers as { name: string } | null)?.name || 'Unknown Customer',
      totalRevenue: q.total_revenue || 0,
      outcomeDate: q.outcome_date || '',
    }))
    
    // Build Pipeline Summary
    const pipeline: PipelineSummary = {
      quotationsDraft,
      quotationsSubmitted,
      quotationsWon,
      quotationsLost,
      pjosDraft,
      pjosPendingApproval,
      pjosApproved,
      winRate,
      wonValueThisMonth,
    }
    
    return {
      // Business Performance
      totalRevenue,
      totalProfit,
      profitMargin,
      revenueMTD,
      revenueLastMonth,
      revenueChangePercent,
      
      // Operational KPIs
      activeJobs,
      completedJobsThisMonth,
      jobCompletionRate,
      pendingPJOApprovals,
      pendingBKKApprovals,
      
      // Pipeline Overview
      pipeline,
      
      // Financial Health
      arOutstanding,
      arOverdue,
      collectionRate,
      
      // Recent Activity
      recentCompletedJobs,
      recentWonQuotations,
    }
  }, CACHE_TTL)
}
