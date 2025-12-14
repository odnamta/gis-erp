import { PJORevenueItem, PJOCostItem } from '@/types'

/**
 * JO Status type
 */
export type JOStatus = 'active' | 'completed' | 'submitted_to_finance' | 'invoiced' | 'closed'

/**
 * JO Action type
 */
export type JOAction = 'mark_completed' | 'submit_to_finance' | 'create_invoice'

/**
 * User role type for JO permission checks
 */
export type JOUserRole = 'ops' | 'admin' | 'sales' | 'engineer' | 'manager' | 'super_admin'

/**
 * JO Financials interface
 */
export interface JOFinancials {
  finalRevenue: number
  finalCost: number
  finalProfit: number
  finalMargin: number
}

/**
 * PJO data for conversion check
 */
export interface PJOForConversion {
  status: string
  all_costs_confirmed: boolean | null
  converted_to_jo: boolean | null
}

/**
 * Check if a PJO can be converted to a Job Order
 * Returns true only when:
 * - status is "approved"
 * - all_costs_confirmed is true
 * - converted_to_jo is false or null
 * 
 * @param pjo - PJO data with status, all_costs_confirmed, and converted_to_jo fields
 * @returns true if the PJO can be converted to a JO
 * 
 * **Feature: v0.6-jo-creation, Property 1: JO Creation Readiness**
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 */
export function canCreateJobOrder(pjo: PJOForConversion): boolean {
  const isApproved = pjo.status === 'approved'
  const allCostsConfirmed = pjo.all_costs_confirmed === true
  const notConverted = pjo.converted_to_jo !== true
  
  return isApproved && allCostsConfirmed && notConverted
}

/**
 * Calculate JO financials from revenue and cost items
 * 
 * @param revenueItems - Array of PJO revenue items
 * @param costItems - Array of PJO cost items with actual amounts
 * @returns JOFinancials object with finalRevenue, finalCost, finalProfit, finalMargin
 * 
 * **Feature: v0.6-jo-creation, Property 2, 3, 4: Financial Calculations**
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 */
export function calculateJOFinancials(
  revenueItems: Pick<PJORevenueItem, 'subtotal'>[],
  costItems: Pick<PJOCostItem, 'actual_amount'>[]
): JOFinancials {
  const finalRevenue = revenueItems.reduce((sum, item) => sum + (item.subtotal || 0), 0)
  const finalCost = costItems.reduce((sum, item) => sum + (item.actual_amount ?? 0), 0)
  const finalProfit = finalRevenue - finalCost
  const finalMargin = finalRevenue > 0 ? (finalProfit / finalRevenue) * 100 : 0
  
  return {
    finalRevenue,
    finalCost,
    finalProfit,
    finalMargin,
  }
}

/**
 * Get available actions for a JO based on its current status
 * 
 * @param status - Current JO status
 * @returns Array of available actions
 * 
 * **Feature: v0.6-jo-creation, Property 7: JO Status Actions**
 * **Validates: Requirements 6.2, 6.4, 6.5, 6.6**
 */
export function getAvailableJOActions(status: JOStatus): JOAction[] {
  switch (status) {
    case 'active':
      return ['mark_completed']
    case 'completed':
      return ['submit_to_finance']
    case 'submitted_to_finance':
      return ['create_invoice']
    default:
      return []
  }
}

/**
 * Check if a JO status transition is valid
 * 
 * Valid transitions:
 * - active → completed
 * - completed → submitted_to_finance
 * - submitted_to_finance → invoiced
 * - invoiced → closed
 * 
 * Invalid transitions (cannot go backwards):
 * - submitted_to_finance → completed or active
 * - completed → active
 * 
 * @param currentStatus - Current JO status
 * @param newStatus - Target JO status
 * @returns true if the transition is valid
 * 
 * **Feature: v0.6-jo-creation, Property 8: Status Transition Validation**
 * **Validates: Requirements 7.6**
 */
export function canTransitionJOStatus(currentStatus: JOStatus, newStatus: JOStatus): boolean {
  const validTransitions: Record<JOStatus, JOStatus[]> = {
    active: ['completed'],
    completed: ['submitted_to_finance'],
    submitted_to_finance: ['invoiced'],
    invoiced: ['closed'],
    closed: [],
  }
  
  return validTransitions[currentStatus]?.includes(newStatus) ?? false
}

/**
 * Format margin as percentage with one decimal place
 * 
 * @param margin - Margin value (e.g., 15.567)
 * @returns Formatted string (e.g., "15.6%")
 * 
 * **Feature: v0.6-jo-creation, Property 9: Margin Formatting**
 * **Validates: Requirements 4.4**
 */
export function formatMargin(margin: number): string {
  return `${margin.toFixed(1)}%`
}

/**
 * Check if a user can edit a JO (status transitions)
 * Only admin and manager roles can edit JOs
 * 
 * @param userRole - User's role
 * @returns true if the user can edit JOs
 * 
 * **Feature: v0.6-jo-creation, Property 10: JO Access Control**
 * **Validates: Requirements 8.2, 8.4**
 */
export function canEditJO(userRole: JOUserRole | string): boolean {
  const editableRoles: string[] = ['admin', 'manager']
  return editableRoles.includes(userRole)
}
