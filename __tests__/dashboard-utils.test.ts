import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateAwaitingOpsCount,
  calculateExceededBudgetCount,
  calculateReadyForConversionCount,
  calculateOutstandingAR,
  calculateDashboardKPIs,
  calculateVariancePercent,
  calculateCostProgress,
  formatCostProgress,
  formatActivityMessage,
  formatRelativeTime,
  calculateManagerMetrics,
  limitResults,
} from '@/lib/dashboard-utils'
import { ProformaJobOrder, PJOCostItem, Invoice, JobOrder, ActivityEntry } from '@/types'

/**
 * **Feature: v0.8-dashboard-budget-monitoring, Property 1: KPI Count Calculations**
 * *For any* set of PJOs and cost items in the database, the KPI counts SHALL satisfy:
 * - `awaitingOpsInput` equals the count of PJOs where `status = 'approved'` AND `all_costs_confirmed = false`
 * - `exceededBudgetItems` equals the count of cost items where `status = 'exceeded'`
 * - `readyForConversion` equals the count of PJOs where `status = 'approved'` AND `all_costs_confirmed = true`
 * **Validates: Requirements 1.2, 1.3, 1.4**
 */
describe('Dashboard KPI Calculations', () => {
  describe('calculateAwaitingOpsCount', () => {
    it('should count PJOs where status=approved AND all_costs_confirmed=false', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              status: fc.constantFrom('draft', 'pending_approval', 'approved', 'rejected'),
              all_costs_confirmed: fc.constantFrom(true, false, null),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (pjos) => {
            const result = calculateAwaitingOpsCount(pjos)
            const expected = pjos.filter(
              p => p.status === 'approved' && p.all_costs_confirmed === false
            ).length
            expect(result).toBe(expected)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('calculateExceededBudgetCount', () => {
    it('should count cost items where status=exceeded', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              status: fc.constantFrom('estimated', 'confirmed', 'at_risk', 'exceeded', 'under_budget'),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (costItems) => {
            const result = calculateExceededBudgetCount(costItems)
            const expected = costItems.filter(item => item.status === 'exceeded').length
            expect(result).toBe(expected)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('calculateReadyForConversionCount', () => {
    it('should count PJOs where status=approved AND all_costs_confirmed=true', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              status: fc.constantFrom('draft', 'pending_approval', 'approved', 'rejected'),
              all_costs_confirmed: fc.constantFrom(true, false, null),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (pjos) => {
            const result = calculateReadyForConversionCount(pjos)
            const expected = pjos.filter(
              p => p.status === 'approved' && p.all_costs_confirmed === true
            ).length
            expect(result).toBe(expected)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


/**
 * **Feature: v0.8-dashboard-budget-monitoring, Property 2: Outstanding AR Sum Calculation**
 * *For any* set of invoices in the database, the `outstandingAR` value SHALL equal
 * the sum of `total_amount` from all invoices where `status` is either `'sent'` or `'overdue'`.
 * **Validates: Requirements 1.5**
 */
describe('Outstanding AR Calculation', () => {
  describe('calculateOutstandingAR', () => {
    it('should sum total_amount from invoices where status is sent or overdue', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              status: fc.constantFrom('draft', 'sent', 'paid', 'overdue', 'cancelled'),
              total_amount: fc.double({ min: 0, max: 1e9, noNaN: true }),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (invoices) => {
            const result = calculateOutstandingAR(invoices)
            const expected = invoices
              .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
              .reduce((sum, inv) => sum + inv.total_amount, 0)
            expect(result).toBeCloseTo(expected, 5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when no sent or overdue invoices', () => {
      const invoices = [
        { status: 'draft', total_amount: 1000000 },
        { status: 'paid', total_amount: 2000000 },
        { status: 'cancelled', total_amount: 500000 },
      ]
      expect(calculateOutstandingAR(invoices)).toBe(0)
    })

    it('should handle empty array', () => {
      expect(calculateOutstandingAR([])).toBe(0)
    })
  })
})

/**
 * **Feature: v0.8-dashboard-budget-monitoring, Property 5: Cost Entry Progress Calculation**
 * *For any* PJO with cost items, the progress display SHALL show `X of Y` where:
 * - `X` equals the count of cost items where `actual_amount IS NOT NULL`
 * - `Y` equals the total count of cost items for that PJO
 * **Validates: Requirements 4.4**
 */
describe('Cost Progress Calculation', () => {
  describe('calculateCostProgress', () => {
    it('should count confirmed items (actual_amount not null) and total items', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              actual_amount: fc.oneof(
                fc.constant(null),
                fc.constant(null),
                fc.double({ min: 0, max: 1e9, noNaN: true })
              ),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (costItems) => {
            const result = calculateCostProgress(costItems as any)
            const expectedConfirmed = costItems.filter(
              item => item.actual_amount !== null && item.actual_amount !== undefined
            ).length
            expect(result.confirmed).toBe(expectedConfirmed)
            expect(result.total).toBe(costItems.length)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('formatCostProgress', () => {
    it('should format as "X of Y costs filled"', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (confirmed, total) => {
            const result = formatCostProgress({ confirmed, total })
            expect(result).toBe(`${confirmed} of ${total} costs filled`)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

/**
 * **Feature: v0.8-dashboard-budget-monitoring, Property 4: Activity Message Formatting**
 * *For any* activity entry, the formatted message SHALL contain:
 * - For `pjo_approved`: the PJO number and approving user name
 * - For `jo_created`: the source PJO number
 * - For `invoice_paid`: the invoice number
 * **Validates: Requirements 3.4, 3.5, 3.6**
 */
describe('Activity Message Formatting', () => {
  describe('formatActivityMessage', () => {
    it('should include document_number and user_name for pjo_approved', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (documentNumber, userName) => {
            const activity = {
              action_type: 'pjo_approved' as const,
              document_number: documentNumber,
              user_name: userName,
            }
            const result = formatActivityMessage(activity)
            expect(result).toContain(documentNumber)
            expect(result).toContain(userName)
            expect(result).toContain('approved by')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include source PJO number for jo_created', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (documentNumber, sourcePjoNumber) => {
            const activity = {
              action_type: 'jo_created' as const,
              document_number: documentNumber,
              user_name: 'System',
              details: { source_pjo_number: sourcePjoNumber },
            }
            const result = formatActivityMessage(activity)
            expect(result).toContain(sourcePjoNumber)
            expect(result).toContain('JO created from')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include invoice number for invoice_paid', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (invoiceNumber) => {
            const activity = {
              action_type: 'invoice_paid' as const,
              document_number: invoiceNumber,
              user_name: 'System',
            }
            const result = formatActivityMessage(activity)
            expect(result).toContain(invoiceNumber)
            expect(result).toContain('paid')
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


/**
 * **Feature: v0.8-dashboard-budget-monitoring, Property 7: Manager Metrics Calculation**
 * *For any* set of active JOs in the current month, the manager metrics SHALL satisfy:
 * - `totalRevenue` equals the sum of `final_revenue` from all matching JOs
 * - `totalCosts` equals the sum of `final_cost` from all matching JOs
 * - `totalProfit` equals `totalRevenue - totalCosts`
 * - `margin` equals `(totalProfit / totalRevenue) * 100` when `totalRevenue > 0`, otherwise `0`
 * **Validates: Requirements 6.3**
 */
describe('Manager Metrics Calculation', () => {
  describe('calculateManagerMetrics', () => {
    it('should calculate revenue, costs, profit, and margin correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              final_revenue: fc.oneof(
                fc.constant(null),
                fc.double({ min: 0, max: 1e9, noNaN: true })
              ),
              final_cost: fc.oneof(
                fc.constant(null),
                fc.double({ min: 0, max: 1e9, noNaN: true })
              ),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (jobOrders) => {
            const result = calculateManagerMetrics(jobOrders)
            
            const expectedRevenue = jobOrders.reduce((sum, jo) => sum + (jo.final_revenue || 0), 0)
            const expectedCosts = jobOrders.reduce((sum, jo) => sum + (jo.final_cost || 0), 0)
            const expectedProfit = expectedRevenue - expectedCosts
            const expectedMargin = expectedRevenue > 0 
              ? (expectedProfit / expectedRevenue) * 100 
              : 0
            
            expect(result.totalRevenue).toBeCloseTo(expectedRevenue, 5)
            expect(result.totalCosts).toBeCloseTo(expectedCosts, 5)
            expect(result.totalProfit).toBeCloseTo(expectedProfit, 5)
            expect(result.margin).toBeCloseTo(expectedMargin, 5)
            expect(result.activeJOCount).toBe(jobOrders.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 margin when totalRevenue is 0', () => {
      const jobOrders = [
        { final_revenue: 0, final_cost: 1000000 },
        { final_revenue: null, final_cost: 500000 },
      ]
      const result = calculateManagerMetrics(jobOrders)
      expect(result.margin).toBe(0)
    })

    it('should handle empty array', () => {
      const result = calculateManagerMetrics([])
      expect(result.totalRevenue).toBe(0)
      expect(result.totalCosts).toBe(0)
      expect(result.totalProfit).toBe(0)
      expect(result.margin).toBe(0)
      expect(result.activeJOCount).toBe(0)
    })
  })
})

/**
 * **Feature: v0.8-dashboard-budget-monitoring, Property 6: Query Result Limits**
 * *For any* query for budget alerts or recent activities, the returned list
 * SHALL contain at most 5 items, ordered by `created_at` descending.
 * **Validates: Requirements 7.3, 7.4**
 */
describe('Query Result Limits', () => {
  describe('limitResults', () => {
    it('should return at most the specified limit of items', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer(), { minLength: 0, maxLength: 50 }),
          fc.integer({ min: 1, max: 20 }),
          (items, limit) => {
            const result = limitResults(items, limit)
            expect(result.length).toBeLessThanOrEqual(limit)
            expect(result.length).toBe(Math.min(items.length, limit))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should default to limit of 5', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer(), { minLength: 0, maxLength: 50 }),
          (items) => {
            const result = limitResults(items)
            expect(result.length).toBeLessThanOrEqual(5)
            expect(result.length).toBe(Math.min(items.length, 5))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve order of items', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const result = limitResults(items, 5)
      expect(result).toEqual([1, 2, 3, 4, 5])
    })
  })
})

describe('Variance Calculation', () => {
  describe('calculateVariancePercent', () => {
    it('should calculate variance percentage as ((actual - estimated) / estimated) * 100', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1e9, noNaN: true }),
          fc.double({ min: 0, max: 2e9, noNaN: true }),
          (estimated, actual) => {
            const result = calculateVariancePercent(estimated, actual)
            const expected = ((actual - estimated) / estimated) * 100
            expect(result).toBeCloseTo(expected, 5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when estimated is 0', () => {
      expect(calculateVariancePercent(0, 1000)).toBe(0)
      expect(calculateVariancePercent(0, 0)).toBe(0)
    })
  })
})
