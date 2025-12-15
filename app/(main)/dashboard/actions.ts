'use server'

import { createClient } from '@/lib/supabase/server'
import { 
  DashboardKPIs, 
  BudgetAlert, 
  ActivityEntry, 
  OpsQueueItem, 
  ManagerMetrics 
} from '@/types/database'

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

  if (error && Object.keys(error).length > 0) {
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
