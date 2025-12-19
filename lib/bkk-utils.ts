/**
 * BKK (Bukti Kas Keluar) Utility Functions
 * 
 * Core utility functions for cash disbursement voucher operations.
 */

import type { 
  BKK, 
  BKKStatus, 
  AvailableBudget, 
  SettlementDifference, 
  BKKSummaryTotals 
} from '@/types/database'

// Valid status transitions
export const VALID_TRANSITIONS: Record<BKKStatus, BKKStatus[]> = {
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['released', 'cancelled'],
  rejected: [],
  released: ['settled'],
  settled: [],
  cancelled: []
}

// Status colors for UI
export const BKK_STATUS_COLORS: Record<BKKStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
  released: { bg: 'bg-green-100', text: 'text-green-800', label: 'Released' },
  settled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Settled' },
  cancelled: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Cancelled' }
}

/**
 * Generate BKK number in format "BKK-YYYY-NNNN"
 * @param year - The year (4 digits)
 * @param sequence - The sequence number
 * @returns Formatted BKK number
 */
export function generateBKKNumber(year: number, sequence: number): string {
  const paddedSequence = String(sequence).padStart(4, '0')
  return `BKK-${year}-${paddedSequence}`
}

/**
 * Parse BKK number to extract year and sequence
 * @param bkkNumber - The BKK number string
 * @returns Object with year and sequence, or null if invalid
 */
export function parseBKKNumber(bkkNumber: string): { year: number; sequence: number } | null {
  const match = bkkNumber.match(/^BKK-(\d{4})-(\d{4})$/)
  if (!match) return null
  return {
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10)
  }
}

/**
 * Validate BKK number format
 * @param bkkNumber - The BKK number to validate
 * @returns True if valid format
 */
export function isValidBKKNumber(bkkNumber: string): boolean {
  return /^BKK-\d{4}-\d{4}$/.test(bkkNumber)
}


/**
 * Calculate available budget for a cost item based on existing BKKs
 * @param budgetAmount - The original budget amount
 * @param existingBKKs - Array of existing BKKs for this cost item
 * @returns Available budget calculation
 */
export function calculateAvailableBudget(
  budgetAmount: number,
  existingBKKs: BKK[]
): AvailableBudget {
  // Filter out rejected and cancelled BKKs
  const activeBKKs = existingBKKs.filter(
    bkk => bkk.status !== 'rejected' && bkk.status !== 'cancelled'
  )
  
  // Calculate already disbursed (released or settled)
  const alreadyDisbursed = activeBKKs
    .filter(bkk => bkk.status === 'released' || bkk.status === 'settled')
    .reduce((sum, bkk) => sum + bkk.amount_requested, 0)
  
  // Calculate pending requests (pending or approved but not yet released)
  const pendingRequests = activeBKKs
    .filter(bkk => bkk.status === 'pending' || bkk.status === 'approved')
    .reduce((sum, bkk) => sum + bkk.amount_requested, 0)
  
  // Available = budget - disbursed - pending
  const available = budgetAmount - alreadyDisbursed - pendingRequests
  
  return {
    budgetAmount,
    alreadyDisbursed,
    available,
    pendingRequests
  }
}

/**
 * Calculate settlement difference between released and spent amounts
 * @param releasedAmount - The amount that was released
 * @param spentAmount - The actual amount spent
 * @returns Settlement difference calculation
 */
export function calculateSettlementDifference(
  releasedAmount: number,
  spentAmount: number
): SettlementDifference {
  const difference = Math.abs(releasedAmount - spentAmount)
  
  let type: 'return' | 'additional' | 'exact'
  if (spentAmount < releasedAmount) {
    type = 'return'
  } else if (spentAmount > releasedAmount) {
    type = 'additional'
  } else {
    type = 'exact'
  }
  
  return {
    releasedAmount,
    spentAmount,
    difference,
    type
  }
}

/**
 * Check if a status transition is valid
 * @param currentStatus - Current BKK status
 * @param newStatus - Target status
 * @returns True if transition is valid
 */
export function isValidStatusTransition(
  currentStatus: BKKStatus,
  newStatus: BKKStatus
): boolean {
  const validTargets = VALID_TRANSITIONS[currentStatus]
  return validTargets.includes(newStatus)
}

/**
 * Calculate BKK summary totals for a job order
 * @param bkks - Array of BKKs
 * @returns Summary totals
 */
export function calculateBKKSummary(bkks: BKK[]): BKKSummaryTotals {
  const count = {
    pending: 0,
    approved: 0,
    released: 0,
    settled: 0,
    rejected: 0,
    cancelled: 0
  }
  
  let totalRequested = 0
  let totalReleased = 0
  let totalSettled = 0
  
  for (const bkk of bkks) {
    const status = bkk.status as BKKStatus
    count[status]++
    
    // Only count non-rejected, non-cancelled for totals
    if (status !== 'rejected' && status !== 'cancelled') {
      totalRequested += bkk.amount_requested
    }
    
    // Released includes both released and settled
    if (status === 'released' || status === 'settled') {
      totalReleased += bkk.amount_requested
    }
    
    // Settled amount
    if (status === 'settled' && bkk.amount_spent !== null) {
      totalSettled += bkk.amount_spent
    }
  }
  
  // Pending return = released but not yet settled
  const pendingReturn = totalReleased - totalSettled
  
  return {
    totalRequested,
    totalReleased,
    totalSettled,
    pendingReturn,
    count
  }
}

/**
 * Get available actions for a BKK based on status and user role
 * @param status - Current BKK status
 * @param userRole - User's role
 * @param isRequester - Whether the user is the requester
 * @returns Array of available action names
 */
export function getAvailableActions(
  status: BKKStatus,
  userRole: string,
  isRequester: boolean = false
): string[] {
  const actions: string[] = ['view']
  
  switch (status) {
    case 'pending':
      // Requester can cancel
      if (isRequester) {
        actions.push('cancel')
      }
      // Admin/Finance/Manager can approve or reject
      if (['admin', 'finance', 'manager', 'super_admin'].includes(userRole)) {
        actions.push('approve', 'reject')
      }
      break
      
    case 'approved':
      // Admin/Finance can release
      if (['admin', 'finance', 'super_admin'].includes(userRole)) {
        actions.push('release')
      }
      // Can still cancel before release
      if (isRequester || ['admin', 'finance', 'manager', 'super_admin'].includes(userRole)) {
        actions.push('cancel')
      }
      break
      
    case 'released':
      // Requester or ops can settle
      if (isRequester || ['ops', 'admin', 'super_admin'].includes(userRole)) {
        actions.push('settle')
      }
      break
      
    case 'settled':
    case 'rejected':
    case 'cancelled':
      // View only
      break
  }
  
  return actions
}

/**
 * Format currency for display (Indonesian Rupiah)
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export function formatBKKCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Format BKK for display with computed fields
 * @param bkk - The BKK record
 * @returns Formatted BKK with display fields
 */
export function formatBKKDisplay(bkk: BKK) {
  const statusInfo = BKK_STATUS_COLORS[bkk.status as BKKStatus] || BKK_STATUS_COLORS.pending
  
  return {
    ...bkk,
    formattedAmount: formatBKKCurrency(bkk.amount_requested),
    formattedSpent: bkk.amount_spent !== null ? formatBKKCurrency(bkk.amount_spent) : '-',
    formattedReturned: bkk.amount_returned !== null ? formatBKKCurrency(bkk.amount_returned) : '-',
    statusLabel: statusInfo.label,
    statusBg: statusInfo.bg,
    statusText: statusInfo.text
  }
}

/**
 * Validate BKK creation input
 * @param input - The creation input
 * @returns Object with isValid and errors array
 */
export function validateCreateBKKInput(input: {
  purpose?: string
  amount_requested?: number
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!input.purpose || input.purpose.trim() === '') {
    errors.push('Purpose is required')
  }
  
  if (input.amount_requested === undefined || input.amount_requested === null) {
    errors.push('Amount is required')
  } else if (input.amount_requested <= 0) {
    errors.push('Amount must be greater than zero')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate BKK rejection input
 * @param reason - The rejection reason
 * @returns Object with isValid and errors array
 */
export function validateRejectBKKInput(reason?: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!reason || reason.trim() === '') {
    errors.push('Rejection reason is required')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate BKK release input
 * @param input - The release input
 * @returns Object with isValid and errors array
 */
export function validateReleaseBKKInput(input: {
  release_method?: string
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!input.release_method || !['cash', 'transfer'].includes(input.release_method)) {
    errors.push('Release method must be cash or transfer')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate BKK settlement input
 * @param input - The settlement input
 * @returns Object with isValid and errors array
 */
export function validateSettleBKKInput(input: {
  amount_spent?: number
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (input.amount_spent === undefined || input.amount_spent === null) {
    errors.push('Amount spent is required')
  } else if (input.amount_spent < 0) {
    errors.push('Amount spent cannot be negative')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
