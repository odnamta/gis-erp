/**
 * Marketing Manager Dashboard Utility Functions
 * Pure utility functions for metric calculations (no server actions)
 * 
 * These functions are extracted from marketing-manager-data.ts to avoid
 * Next.js 15 "Server Actions must be async" errors.
 */

/**
 * Calculates win rate percentage from won and lost quotation counts
 * 
 * Requirements: 1.5, 1.6
 * - Win rate = (won / (won + lost)) * 100
 * - Returns 0 when no closed quotations exist (won + lost = 0)
 * 
 * @param won - Number of won quotations
 * @param lost - Number of lost quotations
 * @returns Win rate as a percentage (0-100), rounded to nearest integer
 */
export function calculateWinRate(won: number, lost: number): number {
  const total = won + lost
  return total > 0 ? Math.round((won / total) * 100) : 0
}

/**
 * Filters quotations by MTD (Month-to-Date) criteria
 * 
 * Requirements: 1.1
 * - Returns quotations where created_at >= startOfMonth AND is_active = true
 * 
 * @param quotations - Array of quotations with created_at and is_active fields
 * @param startOfMonth - The start of the current month
 * @returns Filtered array of quotations matching MTD criteria
 */
export function filterQuotationsMTD<T extends { created_at: string; is_active: boolean }>(
  quotations: T[],
  startOfMonth: Date
): T[] {
  return quotations.filter(q => 
    q.is_active && new Date(q.created_at) >= startOfMonth
  )
}

/**
 * Calculates total quotation value from an array of quotations
 * 
 * Requirements: 1.2
 * - Sums total_revenue for all quotations
 * - Treats null values as 0
 * 
 * @param quotations - Array of quotations with total_revenue field
 * @returns Sum of total_revenue values
 */
export function calculateQuotationValue(
  quotations: { total_revenue: number | null }[]
): number {
  return quotations.reduce((sum, q) => sum + (q.total_revenue || 0), 0)
}

/**
 * Checks if an array of items is ordered by created_at descending (most recent first)
 * 
 * Requirements: 6.1, 6.2
 * - Recent items should be ordered by created_at descending
 * 
 * @param items - Array of items with created_at field
 * @returns true if items are ordered by created_at descending, false otherwise
 */
export function isOrderedByCreatedAtDescending<T extends { created_at: string }>(items: T[]): boolean {
  for (let i = 1; i < items.length; i++) {
    if (new Date(items[i].created_at) > new Date(items[i - 1].created_at)) {
      return false
    }
  }
  return true
}

/**
 * Gets the most recent items from an array, ordered by created_at descending
 * 
 * Requirements: 6.1, 6.2
 * - Returns at most `limit` items
 * - Items are ordered by created_at descending (most recent first)
 * 
 * @param items - Array of items with created_at field
 * @param limit - Maximum number of items to return (default: 5)
 * @returns Array of at most `limit` items ordered by created_at descending
 */
export function getRecentItems<T extends { created_at: string }>(
  items: T[],
  limit: number = 5
): T[] {
  return [...items]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
}
