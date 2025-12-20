// Quotation Module Utility Functions

import {
  QuotationStatus,
  QuotationFinancials,
  Quotation,
  QuotationRevenueItem,
  QuotationCostItem,
  PursuitCost,
  VALID_STATUS_TRANSITIONS,
} from '@/types/quotation'
import { MarketClassification } from '@/types/market-classification'

/**
 * Generate a unique quotation number in format QUO-YYYY-NNNN
 * @param existingCount - Number of existing quotations this year
 * @param date - Date to use for year (defaults to now)
 * @returns Formatted quotation number
 */
export function generateQuotationNumber(existingCount: number, date: Date = new Date()): string {
  const year = date.getFullYear()
  const sequence = (existingCount + 1).toString().padStart(4, '0')
  return `QUO-${year}-${sequence}`
}

/**
 * Check if a status transition is valid
 * @param currentStatus - Current quotation status
 * @param targetStatus - Target status to transition to
 * @returns true if transition is valid
 */
export function canTransitionStatus(
  currentStatus: QuotationStatus,
  targetStatus: QuotationStatus
): boolean {
  const validTargets = VALID_STATUS_TRANSITIONS[currentStatus]
  return validTargets.includes(targetStatus)
}

/**
 * Get valid next statuses for a quotation
 * @param currentStatus - Current quotation status
 * @param requiresEngineering - Whether quotation requires engineering review
 * @param engineeringStatus - Current engineering status
 * @returns Array of valid next statuses
 */
export function getValidNextStatuses(
  currentStatus: QuotationStatus,
  requiresEngineering: boolean,
  engineeringStatus: string | null
): QuotationStatus[] {
  const validTargets = [...VALID_STATUS_TRANSITIONS[currentStatus]]
  
  // If in draft and requires engineering, can only go to engineering_review
  if (currentStatus === 'draft' && requiresEngineering) {
    return validTargets.filter(s => s === 'engineering_review' || s === 'cancelled')
  }
  
  // If in draft and doesn't require engineering, skip engineering_review
  if (currentStatus === 'draft' && !requiresEngineering) {
    return validTargets.filter(s => s !== 'engineering_review')
  }
  
  // If in engineering_review, can only go to ready if engineering is complete
  if (currentStatus === 'engineering_review') {
    if (engineeringStatus !== 'completed' && engineeringStatus !== 'waived') {
      return validTargets.filter(s => s === 'cancelled')
    }
  }
  
  return validTargets
}

/**
 * Check if quotation can be submitted to client
 * @param quotation - Quotation to check
 * @returns Object with canSubmit flag and reason if blocked
 */
export function canSubmitQuotation(quotation: {
  status: string | null
  requires_engineering: boolean | null
  engineering_status: string | null
}): { canSubmit: boolean; reason?: string } {
  // Must be in 'ready' status
  if (quotation.status !== 'ready') {
    return {
      canSubmit: false,
      reason: `Quotation must be in 'ready' status to submit. Current status: ${quotation.status}`,
    }
  }
  
  // If requires engineering, must be completed or waived
  if (quotation.requires_engineering) {
    if (quotation.engineering_status !== 'completed' && quotation.engineering_status !== 'waived') {
      return {
        canSubmit: false,
        reason: `Engineering review must be completed or waived before submission. Current status: ${quotation.engineering_status}`,
      }
    }
  }
  
  return { canSubmit: true }
}

/**
 * Calculate quotation financial totals
 * @param revenueItems - Array of revenue items
 * @param costItems - Array of cost items
 * @param pursuitCosts - Array of pursuit costs
 * @param estimatedShipments - Number of estimated shipments
 * @returns QuotationFinancials object
 */
export function calculateQuotationTotals(
  revenueItems: Pick<QuotationRevenueItem, 'subtotal'>[],
  costItems: Pick<QuotationCostItem, 'estimated_amount'>[],
  pursuitCosts: Pick<PursuitCost, 'amount'>[],
  estimatedShipments: number = 1
): QuotationFinancials {
  const total_revenue = revenueItems.reduce((sum, item) => sum + (item.subtotal || 0), 0)
  const total_cost = costItems.reduce((sum, item) => sum + (item.estimated_amount || 0), 0)
  const total_pursuit_cost = pursuitCosts.reduce((sum, item) => sum + (item.amount || 0), 0)
  const gross_profit = total_revenue - total_cost
  const profit_margin = total_revenue > 0 ? (gross_profit / total_revenue) * 100 : 0
  const pursuit_cost_per_shipment = estimatedShipments > 0 
    ? total_pursuit_cost / estimatedShipments 
    : total_pursuit_cost
  
  return {
    total_revenue,
    total_cost,
    total_pursuit_cost,
    gross_profit,
    profit_margin: Math.round(profit_margin * 100) / 100,
    pursuit_cost_per_shipment: Math.round(pursuit_cost_per_shipment * 100) / 100,
  }
}

/**
 * Calculate pursuit cost per shipment
 * @param totalPursuitCost - Total pursuit cost
 * @param shipments - Number of shipments
 * @returns Cost per shipment
 */
export function calculatePursuitCostPerShipment(
  totalPursuitCost: number,
  shipments: number
): number {
  if (shipments <= 0) return totalPursuitCost
  return Math.round((totalPursuitCost / shipments) * 100) / 100
}

/**
 * Prepare quotation data for PJO creation
 * @param quotation - Source quotation
 * @returns Object with PJO fields
 */
export function prepareQuotationForPJO(quotation: Quotation): {
  customer_id: string
  project_id: string | null
  commodity: string | null
  pol: string
  pod: string
  pol_lat: number | null
  pol_lng: number | null
  pol_place_id: string | null
  pod_lat: number | null
  pod_lng: number | null
  pod_place_id: string | null
  cargo_weight_kg: number | null
  cargo_length_m: number | null
  cargo_width_m: number | null
  cargo_height_m: number | null
  cargo_value: number | null
  is_new_route: boolean | null
  terrain_type: string | null
  requires_special_permit: boolean | null
  is_hazardous: boolean | null
  duration_days: number | null
  market_type: string | null
  complexity_score: number | null
  complexity_factors: unknown
  requires_engineering: boolean
  engineering_status: string
  quotation_id: string
} {
  return {
    customer_id: quotation.customer_id,
    project_id: quotation.project_id,
    commodity: quotation.commodity,
    pol: quotation.origin,
    pod: quotation.destination,
    pol_lat: quotation.origin_lat,
    pol_lng: quotation.origin_lng,
    pol_place_id: quotation.origin_place_id,
    pod_lat: quotation.destination_lat,
    pod_lng: quotation.destination_lng,
    pod_place_id: quotation.destination_place_id,
    cargo_weight_kg: quotation.cargo_weight_kg,
    cargo_length_m: quotation.cargo_length_m,
    cargo_width_m: quotation.cargo_width_m,
    cargo_height_m: quotation.cargo_height_m,
    cargo_value: quotation.cargo_value,
    is_new_route: quotation.is_new_route,
    terrain_type: quotation.terrain_type,
    requires_special_permit: quotation.requires_special_permit,
    is_hazardous: quotation.is_hazardous,
    duration_days: quotation.duration_days,
    market_type: quotation.market_type,
    complexity_score: quotation.complexity_score,
    complexity_factors: quotation.complexity_factors,
    // Engineering already done at quotation level
    requires_engineering: false,
    engineering_status: 'not_required',
    quotation_id: quotation.id,
  }
}

/**
 * Split quotation into multiple PJO inputs based on shipment count
 * @param quotation - Source quotation
 * @param revenueItems - Revenue items to split
 * @param costItems - Cost items to split
 * @param pursuitCostPerShipment - Pursuit cost per shipment
 * @param shipmentCount - Number of shipments to create
 * @returns Array of PJO input objects
 */
export function splitQuotationByShipments(
  quotation: Quotation,
  revenueItems: QuotationRevenueItem[],
  costItems: QuotationCostItem[],
  pursuitCostPerShipment: number,
  shipmentCount: number
): Array<{
  pjoData: ReturnType<typeof prepareQuotationForPJO>
  revenueItems: Array<{
    description: string
    quantity: number
    unit: string
    unit_price: number
  }>
  costItems: Array<{
    category: string
    description: string
    estimated_amount: number
    vendor_id?: string
    vendor_name?: string
  }>
  pursuitCostAllocation: number
}> {
  const baseData = prepareQuotationForPJO(quotation)
  const results = []
  
  for (let i = 0; i < shipmentCount; i++) {
    // Split revenue items proportionally
    const splitRevenueItems = revenueItems.map(item => ({
      description: item.description,
      quantity: (item.quantity || 1) / shipmentCount,
      unit: item.unit || 'unit',
      unit_price: item.unit_price,
    }))
    
    // Split cost items proportionally
    const splitCostItems = costItems.map(item => ({
      category: item.category,
      description: item.description,
      estimated_amount: item.estimated_amount / shipmentCount,
      vendor_id: item.vendor_id || undefined,
      vendor_name: item.vendor_name || undefined,
    }))
    
    results.push({
      pjoData: { ...baseData },
      revenueItems: splitRevenueItems,
      costItems: splitCostItems,
      pursuitCostAllocation: pursuitCostPerShipment,
    })
  }
  
  return results
}

/**
 * Determine initial status based on classification
 * @param classification - Market classification result
 * @returns Initial quotation status
 */
export function determineInitialStatus(classification: MarketClassification): QuotationStatus {
  if (classification.requires_engineering) {
    return 'engineering_review'
  }
  return 'draft'
}

/**
 * Format quotation number for display
 * @param quotationNumber - Raw quotation number
 * @returns Formatted string
 */
export function formatQuotationNumber(quotationNumber: string): string {
  return quotationNumber
}

/**
 * Calculate win rate from quotation counts
 * @param wonCount - Number of won quotations
 * @param lostCount - Number of lost quotations
 * @returns Win rate percentage
 */
export function calculateWinRate(wonCount: number, lostCount: number): number {
  const total = wonCount + lostCount
  if (total === 0) return 0
  return Math.round((wonCount / total) * 100 * 100) / 100
}

/**
 * Calculate pipeline value from quotations
 * @param quotations - Array of quotations with total_revenue
 * @param statuses - Statuses to include in pipeline
 * @returns Total pipeline value
 */
export function calculatePipelineValue(
  quotations: Pick<Quotation, 'status' | 'total_revenue'>[],
  statuses: QuotationStatus[] = ['draft', 'engineering_review', 'ready', 'submitted']
): number {
  return quotations
    .filter(q => statuses.includes(q.status as QuotationStatus))
    .reduce((sum, q) => sum + (q.total_revenue || 0), 0)
}

/**
 * Check if quotation deadline is approaching (within days)
 * @param rfqDeadline - RFQ deadline date string
 * @param daysThreshold - Number of days to consider "approaching"
 * @returns true if deadline is within threshold
 */
export function isDeadlineApproaching(
  rfqDeadline: string | null,
  daysThreshold: number = 3
): boolean {
  if (!rfqDeadline) return false
  
  const deadline = new Date(rfqDeadline)
  const now = new Date()
  const diffTime = deadline.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays > 0 && diffDays <= daysThreshold
}

/**
 * Check if quotation is overdue
 * @param rfqDeadline - RFQ deadline date string
 * @returns true if deadline has passed
 */
export function isQuotationOverdue(rfqDeadline: string | null): boolean {
  if (!rfqDeadline) return false
  
  const deadline = new Date(rfqDeadline)
  const now = new Date()
  
  return now > deadline
}

/**
 * Get days until deadline
 * @param rfqDeadline - RFQ deadline date string
 * @returns Number of days (negative if overdue)
 */
export function getDaysUntilDeadline(rfqDeadline: string | null): number | null {
  if (!rfqDeadline) return null
  
  const deadline = new Date(rfqDeadline)
  const now = new Date()
  const diffTime = deadline.getTime() - now.getTime()
  
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}
