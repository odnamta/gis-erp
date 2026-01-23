'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrFetch, generateCacheKey } from '@/lib/dashboard-cache'
import { DEFAULT_PERMISSIONS } from '@/lib/permissions'
import { calculateWinRate } from '@/lib/dashboard/marketing-manager-utils'

/**
 * Marketing Manager Dashboard Metrics Interface
 * Contains all metrics displayed on the Marketing Manager dashboard
 * 
 * Requirements: 1.1-1.6, 2.1-2.2, 3.1-3.4, 4.1, 5.1-5.3, 6.1-6.2
 */
export interface MarketingManagerMetrics {
  // Sales Pipeline
  quotationsSentMTD: number
  quotationValueMTD: number
  wonQuotationsMTD: number
  lostQuotationsMTD: number
  winRatePercent: number
  activeQuotations: number
  pipelineValue: number
  
  // Pipeline Breakdown
  pipelineByStatus: {
    draft: number
    engineering_review: number
    ready: number
    submitted: number
    won: number
    lost: number
  }
  
  // Customer Metrics
  totalCustomers: number
  newCustomersMTD: number
  
  // Revenue Metrics (permission-gated)
  revenueMTD: number | null
  averageDealSize: number | null
  
  // Engineering Department
  pendingEngineeringReview: number
  activeSurveys: number
  activeJMPs: number
  
  // Recent Activity
  recentQuotations: RecentQuotation[]
  recentCustomers: RecentCustomer[]
}

/**
 * Recent Quotation interface for activity list
 * Requirements: 6.1
 */
export interface RecentQuotation {
  id: string
  quotation_number: string
  title: string
  customer_name: string
  status: string
  created_at: string
}

/**
 * Recent Customer interface for activity list
 * Requirements: 6.2
 */
export interface RecentCustomer {
  id: string
  name: string
  created_at: string
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Fetches all Marketing Manager dashboard metrics from Supabase
 * Uses caching with 5-minute TTL for performance optimization
 * 
 * Requirements: 1.1-1.6, 2.1-2.2, 4.1, 5.1-5.3, 6.1-6.2, 7.1, 7.2, 7.3
 * 
 * @returns Promise<MarketingManagerMetrics> - All dashboard metrics
 */
export async function getMarketingManagerMetrics(): Promise<MarketingManagerMetrics> {
  const cacheKey = await generateCacheKey('marketing-manager-metrics', 'marketing_manager')
  
  return getOrFetch(cacheKey, async () => {
    const supabase = await createClient()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Run all queries in parallel using Promise.all
    const [
      quotationsMTDResult,
      activeQuotationsResult,
      allQuotationsResult,
      totalCustomersResult,
      newCustomersResult,
      activeSurveysResult,
      activeJMPsResult,
      recentQuotationsResult,
      recentCustomersResult,
      wonQuotationsRevenueMTDResult,
    ] = await Promise.all([
      // Quotations created this month (for MTD counts)
      // Requirements: 1.1, 1.2, 1.3, 1.4
      supabase
        .from('quotations')
        .select('id, status, total_revenue, outcome_date')
        .gte('created_at', startOfMonth.toISOString())
        .eq('is_active', true),
      
      // Active quotations (pipeline - status in draft, engineering_review, ready, submitted)
      // Requirements: 4.1
      supabase
        .from('quotations')
        .select('id, total_revenue')
        .in('status', ['draft', 'engineering_review', 'ready', 'submitted'])
        .eq('is_active', true),
      
      // All quotations by status (for pipeline breakdown)
      // Requirements: 4.1, 5.1
      supabase
        .from('quotations')
        .select('status')
        .eq('is_active', true),
      
      // Total customers count
      // Requirements: 2.1
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      
      // New customers this month count
      // Requirements: 2.2
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())
        .eq('is_active', true),
      
      // Active surveys (status in pending, in_progress)
      // Requirements: 5.2
      supabase
        .from('route_surveys')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress']),
      
      // Active JMPs (status in draft, pending_review, approved, active)
      // Requirements: 5.3
      supabase
        .from('journey_management_plans')
        .select('id', { count: 'exact', head: true })
        .in('status', ['draft', 'pending_review', 'approved', 'active']),
      
      // Recent quotations (last 5, with customer name join)
      // Requirements: 6.1
      supabase
        .from('quotations')
        .select('id, quotation_number, title, status, created_at, customer:customers(name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Recent customers (last 5)
      // Requirements: 6.2
      supabase
        .from('customers')
        .select('id, name, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Won quotations with outcome_date in current month (for revenue MTD)
      // Requirements: 3.2, 3.3, 3.4
      supabase
        .from('quotations')
        .select('id, total_revenue')
        .eq('status', 'won')
        .gte('outcome_date', startOfMonth.toISOString())
        .eq('is_active', true),
    ])
    
    // Type cast results to avoid "type instantiation too deep" errors
    const quotationsMTD = quotationsMTDResult.data as { id: string; status: string; total_revenue: number | null; outcome_date: string | null }[] | null
    const activeQuotations = activeQuotationsResult.data as { id: string; total_revenue: number | null }[] | null
    const allQuotations = allQuotationsResult.data as { status: string }[] | null
    const recentQuotationsData = recentQuotationsResult.data as { id: string; quotation_number: string; title: string; status: string; created_at: string; customer: { name: string } | null }[] | null
    const recentCustomersData = recentCustomersResult.data as { id: string; name: string; created_at: string }[] | null
    const wonQuotationsRevenueMTD = wonQuotationsRevenueMTDResult.data as { id: string; total_revenue: number | null }[] | null
    
    // Calculate MTD quotation counts
    const quotationsSentMTD = (quotationsMTD || []).length
    const quotationValueMTD = (quotationsMTD || []).reduce((sum, q) => sum + (q.total_revenue || 0), 0)
    const wonQuotationsMTD = (quotationsMTD || []).filter(q => q.status === 'won').length
    const lostQuotationsMTD = (quotationsMTD || []).filter(q => q.status === 'lost').length
    
    // Calculate win rate using the exported function
    // Requirements: 1.5, 1.6
    const winRatePercent = calculateWinRate(wonQuotationsMTD, lostQuotationsMTD)
    
    // Calculate active quotations count and pipeline value
    const activeQuotationsCount = (activeQuotations || []).length
    const pipelineValue = (activeQuotations || []).reduce((sum, q) => sum + (q.total_revenue || 0), 0)
    
    // Calculate pipeline breakdown by status
    const pipelineByStatus = {
      draft: 0,
      engineering_review: 0,
      ready: 0,
      submitted: 0,
      won: 0,
      lost: 0,
    }
    
    for (const q of (allQuotations || [])) {
      if (q.status in pipelineByStatus) {
        pipelineByStatus[q.status as keyof typeof pipelineByStatus]++
      }
    }
    
    // Process recent quotations
    const recentQuotations: RecentQuotation[] = (recentQuotationsData || []).map(q => ({
      id: q.id,
      quotation_number: q.quotation_number,
      title: q.title,
      customer_name: q.customer?.name || 'Unknown Customer',
      status: q.status,
      created_at: q.created_at,
    }))
    
    // Process recent customers
    const recentCustomers: RecentCustomer[] = (recentCustomersData || []).map(c => ({
      id: c.id,
      name: c.name,
      created_at: c.created_at,
    }))
    
    // Calculate revenue metrics (permission-gated)
    // Requirements: 3.1, 3.2, 3.3, 3.4
    // Check if marketing_manager role has can_see_revenue permission
    const canSeeRevenue = DEFAULT_PERMISSIONS.marketing_manager.can_see_revenue
    
    let revenueMTD: number | null = null
    let averageDealSize: number | null = null
    
    if (canSeeRevenue) {
      // Calculate revenue MTD from won quotations with outcome_date in current month
      // Requirements: 3.2
      const wonQuotationsData = wonQuotationsRevenueMTD || []
      revenueMTD = wonQuotationsData.reduce((sum, q) => sum + (q.total_revenue || 0), 0)
      
      // Calculate average deal size
      // Requirements: 3.3, 3.4
      const wonCount = wonQuotationsData.length
      averageDealSize = wonCount > 0 ? Math.round(revenueMTD / wonCount) : 0
    }
    
    return {
      // Sales Pipeline
      quotationsSentMTD,
      quotationValueMTD,
      wonQuotationsMTD,
      lostQuotationsMTD,
      winRatePercent,
      activeQuotations: activeQuotationsCount,
      pipelineValue,
      
      // Pipeline Breakdown
      pipelineByStatus,
      
      // Customer Metrics
      totalCustomers: totalCustomersResult.count || 0,
      newCustomersMTD: newCustomersResult.count || 0,
      
      // Revenue Metrics (permission-gated)
      // Requirements: 3.1, 3.2, 3.3, 3.4
      revenueMTD,
      averageDealSize,
      
      // Engineering Department
      pendingEngineeringReview: pipelineByStatus.engineering_review,
      activeSurveys: activeSurveysResult.count || 0,
      activeJMPs: activeJMPsResult.count || 0,
      
      // Recent Activity
      recentQuotations,
      recentCustomers,
    }
  }, CACHE_TTL)
}
