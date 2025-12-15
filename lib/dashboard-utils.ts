import { 
  ProformaJobOrder, 
  PJOCostItem, 
  Invoice, 
  JobOrder,
  DashboardKPIs,
  CostProgress,
  ManagerMetrics,
  ActivityEntry,
  ActivityType
} from '@/types'
import { formatDistanceToNow } from 'date-fns'

/**
 * Calculate count of PJOs awaiting operations input
 * PJOs where status = 'approved' AND all_costs_confirmed = false
 */
export function calculateAwaitingOpsCount(pjos: Pick<ProformaJobOrder, 'status' | 'all_costs_confirmed'>[]): number {
  return pjos.filter(
    pjo => pjo.status === 'approved' && pjo.all_costs_confirmed === false
  ).length
}

/**
 * Calculate count of cost items that have exceeded budget
 * Cost items where status = 'exceeded'
 */
export function calculateExceededBudgetCount(costItems: Pick<PJOCostItem, 'status'>[]): number {
  return costItems.filter(item => item.status === 'exceeded').length
}

/**
 * Calculate count of PJOs ready for JO conversion
 * PJOs where status = 'approved' AND all_costs_confirmed = true
 */
export function calculateReadyForConversionCount(pjos: Pick<ProformaJobOrder, 'status' | 'all_costs_confirmed'>[]): number {
  return pjos.filter(
    pjo => pjo.status === 'approved' && pjo.all_costs_confirmed === true
  ).length
}

/**
 * Calculate total outstanding accounts receivable
 * Sum of total_amount from invoices where status is 'sent' or 'overdue'
 */
export function calculateOutstandingAR(invoices: Pick<Invoice, 'status' | 'total_amount'>[]): number {
  return invoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.total_amount, 0)
}

/**
 * Calculate all dashboard KPIs from raw data
 */
export function calculateDashboardKPIs(
  pjos: Pick<ProformaJobOrder, 'status' | 'all_costs_confirmed'>[],
  costItems: Pick<PJOCostItem, 'status'>[],
  invoices: Pick<Invoice, 'status' | 'total_amount'>[]
): DashboardKPIs {
  return {
    awaitingOpsInput: calculateAwaitingOpsCount(pjos),
    exceededBudgetItems: calculateExceededBudgetCount(costItems),
    readyForConversion: calculateReadyForConversionCount(pjos),
    outstandingAR: calculateOutstandingAR(invoices)
  }
}


/**
 * Calculate variance percentage between actual and estimated amounts
 * Formula: ((actual - estimated) / estimated) * 100
 */
export function calculateVariancePercent(estimated: number, actual: number): number {
  if (estimated === 0) return 0
  return ((actual - estimated) / estimated) * 100
}

/**
 * Calculate cost entry progress for a PJO
 * Returns count of confirmed items (actual_amount not null) and total count
 */
export function calculateCostProgress(costItems: Pick<PJOCostItem, 'actual_amount'>[]): CostProgress {
  const confirmed = costItems.filter(item => item.actual_amount !== null && item.actual_amount !== undefined).length
  return {
    confirmed,
    total: costItems.length
  }
}

/**
 * Format cost progress as "X of Y costs filled"
 */
export function formatCostProgress(progress: CostProgress): string {
  return `${progress.confirmed} of ${progress.total} costs filled`
}

/**
 * Format activity message based on action type
 */
export function formatActivityMessage(activity: Pick<ActivityEntry, 'action_type' | 'document_number' | 'user_name' | 'details'>): string {
  switch (activity.action_type) {
    case 'pjo_approved':
      return `${activity.document_number} approved by ${activity.user_name}`
    case 'pjo_rejected':
      return `${activity.document_number} rejected by ${activity.user_name}`
    case 'jo_created':
      const sourcePjo = activity.details?.source_pjo_number as string || activity.document_number
      return `JO created from ${sourcePjo}`
    case 'jo_completed':
      return `${activity.document_number} marked as completed`
    case 'jo_submitted_to_finance':
      return `${activity.document_number} submitted to finance`
    case 'invoice_created':
      return `Invoice ${activity.document_number} created`
    case 'invoice_sent':
      return `Invoice ${activity.document_number} sent`
    case 'invoice_paid':
      return `Invoice ${activity.document_number} paid`
    case 'cost_confirmed':
      return `Cost confirmed for ${activity.document_number}`
    default:
      return `${activity.document_number} - ${activity.action_type}`
  }
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: string | Date): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
}

/**
 * Calculate manager metrics from job orders
 * Aggregates revenue, costs, profit, and margin from active JOs
 */
export function calculateManagerMetrics(jobOrders: Pick<JobOrder, 'final_revenue' | 'final_cost'>[]): ManagerMetrics {
  const totalRevenue = jobOrders.reduce((sum, jo) => sum + (jo.final_revenue || 0), 0)
  const totalCosts = jobOrders.reduce((sum, jo) => sum + (jo.final_cost || 0), 0)
  const totalProfit = totalRevenue - totalCosts
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
  
  return {
    totalRevenue,
    totalCosts,
    totalProfit,
    margin,
    activeJOCount: jobOrders.length
  }
}

/**
 * Limit array to specified count (for query result limits)
 */
export function limitResults<T>(items: T[], limit: number = 5): T[] {
  return items.slice(0, limit)
}

/**
 * Get activity icon name based on action type
 */
export function getActivityIcon(actionType: ActivityType): string {
  switch (actionType) {
    case 'pjo_approved':
      return 'CheckCircle'
    case 'pjo_rejected':
      return 'XCircle'
    case 'jo_created':
      return 'FileText'
    case 'jo_completed':
      return 'CheckSquare'
    case 'jo_submitted_to_finance':
      return 'Send'
    case 'invoice_created':
      return 'Receipt'
    case 'invoice_sent':
      return 'Mail'
    case 'invoice_paid':
      return 'DollarSign'
    case 'cost_confirmed':
      return 'Calculator'
    default:
      return 'Activity'
  }
}
