import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  canCreateJobOrder,
  calculateJOFinancials,
  getAvailableJOActions,
  canTransitionJOStatus,
  formatMargin,
  canEditJO,
  JOStatus,
  JOUserRole,
  PJOForConversion,
} from '@/lib/jo-utils'
import { generateJONumber } from '@/lib/pjo-utils'

describe('JO Utility Functions', () => {
  /**
   * **Feature: v0.6-jo-creation, Property 1: JO Creation Readiness**
   * *For any* PJO, the "Create Job Order" button should be visible if and only if
   * status is "approved" AND all_costs_confirmed is true AND converted_to_jo is false.
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
   */
  describe('canCreateJobOrder', () => {
    it('should return true only when status is approved, all costs confirmed, and not converted', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('draft', 'pending_approval', 'approved', 'rejected'),
          fc.boolean(),
          fc.boolean(),
          (status, allCostsConfirmed, convertedToJo) => {
            const pjo: PJOForConversion = {
              status,
              all_costs_confirmed: allCostsConfirmed,
              converted_to_jo: convertedToJo,
            }
            const result = canCreateJobOrder(pjo)
            const expected = status === 'approved' && allCostsConfirmed === true && convertedToJo !== true
            expect(result).toBe(expected)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return false when status is not approved', () => {
      const nonApprovedStatuses = ['draft', 'pending_approval', 'rejected']
      nonApprovedStatuses.forEach((status) => {
        const pjo: PJOForConversion = {
          status,
          all_costs_confirmed: true,
          converted_to_jo: false,
        }
        expect(canCreateJobOrder(pjo)).toBe(false)
      })
    })

    it('should return false when all_costs_confirmed is false', () => {
      const pjo: PJOForConversion = {
        status: 'approved',
        all_costs_confirmed: false,
        converted_to_jo: false,
      }
      expect(canCreateJobOrder(pjo)).toBe(false)
    })

    it('should return false when already converted', () => {
      const pjo: PJOForConversion = {
        status: 'approved',
        all_costs_confirmed: true,
        converted_to_jo: true,
      }
      expect(canCreateJobOrder(pjo)).toBe(false)
    })

    it('should return true for the happy path', () => {
      const pjo: PJOForConversion = {
        status: 'approved',
        all_costs_confirmed: true,
        converted_to_jo: false,
      }
      expect(canCreateJobOrder(pjo)).toBe(true)
    })

    it('should handle null values for all_costs_confirmed and converted_to_jo', () => {
      const pjo: PJOForConversion = {
        status: 'approved',
        all_costs_confirmed: null,
        converted_to_jo: null,
      }
      expect(canCreateJobOrder(pjo)).toBe(false) // null all_costs_confirmed should be false
    })
  })

  /**
   * **Feature: v0.6-jo-creation, Property 2: Final Revenue Calculation**
   * *For any* set of revenue items with positive subtotals, final_revenue should
   * equal the sum of all subtotals.
   * **Validates: Requirements 2.1**
   */
  describe('calculateJOFinancials - revenue calculation', () => {
    it('should calculate final revenue as sum of all subtotals', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              subtotal: fc.double({ min: 0, max: 1e9, noNaN: true }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (revenueItems) => {
            const result = calculateJOFinancials(revenueItems, [])
            const expectedRevenue = revenueItems.reduce((sum, item) => sum + item.subtotal, 0)
            expect(result.finalRevenue).toBeCloseTo(expectedRevenue, 5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 for empty revenue items', () => {
      const result = calculateJOFinancials([], [])
      expect(result.finalRevenue).toBe(0)
    })
  })

  /**
   * **Feature: v0.6-jo-creation, Property 3: Final Cost Calculation**
   * *For any* set of cost items with actual_amount values, final_cost should
   * equal the sum of all actual_amount values.
   * **Validates: Requirements 2.2**
   */
  describe('calculateJOFinancials - cost calculation', () => {
    it('should calculate final cost as sum of all actual amounts', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              actual_amount: fc.oneof(
                fc.double({ min: 0, max: 1e9, noNaN: true }),
                fc.constant(null)
              ),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (costItems) => {
            const result = calculateJOFinancials([], costItems as any)
            const expectedCost = costItems.reduce((sum, item) => sum + (item.actual_amount ?? 0), 0)
            expect(result.finalCost).toBeCloseTo(expectedCost, 5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle undefined actual_amount as 0', () => {
      const costItems = [
        { actual_amount: null },
        { actual_amount: 1000000 },
      ]
      const result = calculateJOFinancials([], costItems as any)
      expect(result.finalCost).toBe(1000000)
    })
  })

  /**
   * **Feature: v0.6-jo-creation, Property 4: Profit and Margin Calculation**
   * *For any* final_revenue and final_cost values where final_revenue > 0,
   * final_profit should equal (final_revenue - final_cost) and final_margin
   * should equal (final_profit / final_revenue × 100).
   * When final_revenue is 0, final_margin should be 0.
   * **Validates: Requirements 2.3, 2.4, 2.5**
   */
  describe('calculateJOFinancials - profit and margin', () => {
    it('should calculate profit as revenue minus cost', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1e9, noNaN: true }),
          fc.double({ min: 0, max: 1e9, noNaN: true }),
          (revenue, cost) => {
            const revenueItems = [{ subtotal: revenue }]
            const costItems = [{ actual_amount: cost }]
            const result = calculateJOFinancials(revenueItems, costItems)
            expect(result.finalProfit).toBeCloseTo(revenue - cost, 5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate margin as (profit / revenue) * 100 when revenue > 0', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1e9, noNaN: true }),
          fc.double({ min: 0, max: 1e9, noNaN: true }),
          (revenue, cost) => {
            const revenueItems = [{ subtotal: revenue }]
            const costItems = [{ actual_amount: cost }]
            const result = calculateJOFinancials(revenueItems, costItems)
            const expectedMargin = ((revenue - cost) / revenue) * 100
            expect(result.finalMargin).toBeCloseTo(expectedMargin, 5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 margin when revenue is 0', () => {
      const result = calculateJOFinancials([], [{ actual_amount: 1000000 }])
      expect(result.finalMargin).toBe(0)
    })
  })

  /**
   * **Feature: v0.6-jo-creation, Property 5: JO Number Format**
   * *For any* sequence number and date, the generated JO number should match
   * the pattern "JO-NNNN/CARGO/MM/YYYY" where NNNN is zero-padded sequence
   * and MM is Roman numeral month.
   * **Validates: Requirements 2.6**
   */
  describe('generateJONumber format', () => {
    const joNumberPattern = /^JO-\d{4}\/CARGO\/(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\/\d{4}$/

    it('should generate JO numbers matching the required pattern', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 9999 }),
          fc.integer({ min: 0, max: 11 }),
          fc.integer({ min: 2020, max: 2030 }),
          (sequence, month, year) => {
            const date = new Date(year, month, 15)
            const result = generateJONumber(sequence, date)
            expect(result).toMatch(joNumberPattern)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should zero-pad sequence numbers', () => {
      expect(generateJONumber(1, new Date(2025, 11, 15))).toBe('JO-0001/CARGO/XII/2025')
      expect(generateJONumber(12, new Date(2025, 0, 15))).toBe('JO-0012/CARGO/I/2025')
      expect(generateJONumber(123, new Date(2025, 5, 15))).toBe('JO-0123/CARGO/VI/2025')
      expect(generateJONumber(1234, new Date(2025, 5, 15))).toBe('JO-1234/CARGO/VI/2025')
    })
  })

  /**
   * **Feature: v0.6-jo-creation, Property 7: JO Status Actions**
   * *For any* JO status, "Mark as Completed" should be available only when status
   * is "active", and "Submit to Finance" should be available only when status is "completed".
   * **Validates: Requirements 6.2, 6.4, 6.5, 6.6**
   */
  describe('getAvailableJOActions', () => {
    const allStatuses: JOStatus[] = ['active', 'completed', 'submitted_to_finance', 'invoiced', 'closed']

    it('should return mark_completed only for active status', () => {
      fc.assert(
        fc.property(fc.constantFrom(...allStatuses), (status) => {
          const actions = getAvailableJOActions(status)
          if (status === 'active') {
            expect(actions).toContain('mark_completed')
          } else {
            expect(actions).not.toContain('mark_completed')
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should return submit_to_finance only for completed status', () => {
      fc.assert(
        fc.property(fc.constantFrom(...allStatuses), (status) => {
          const actions = getAvailableJOActions(status)
          if (status === 'completed') {
            expect(actions).toContain('submit_to_finance')
          } else {
            expect(actions).not.toContain('submit_to_finance')
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should return create_invoice only for submitted_to_finance status', () => {
      fc.assert(
        fc.property(fc.constantFrom(...allStatuses), (status) => {
          const actions = getAvailableJOActions(status)
          if (status === 'submitted_to_finance') {
            expect(actions).toContain('create_invoice')
          } else {
            expect(actions).not.toContain('create_invoice')
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should return empty array for terminal statuses', () => {
      expect(getAvailableJOActions('invoiced')).toEqual([])
      expect(getAvailableJOActions('closed')).toEqual([])
    })
  })

  /**
   * **Feature: v0.6-jo-creation, Property 8: Status Transition Validation**
   * *For any* JO with status "submitted_to_finance", transitions back to
   * "completed" or "active" should be rejected.
   * **Validates: Requirements 7.6**
   */
  describe('canTransitionJOStatus', () => {
    const allStatuses: JOStatus[] = ['active', 'completed', 'submitted_to_finance', 'invoiced', 'closed']

    it('should allow only forward transitions', () => {
      // Valid transitions
      expect(canTransitionJOStatus('active', 'completed')).toBe(true)
      expect(canTransitionJOStatus('completed', 'submitted_to_finance')).toBe(true)
      expect(canTransitionJOStatus('submitted_to_finance', 'invoiced')).toBe(true)
      expect(canTransitionJOStatus('invoiced', 'closed')).toBe(true)
    })

    it('should reject backward transitions from submitted_to_finance', () => {
      expect(canTransitionJOStatus('submitted_to_finance', 'completed')).toBe(false)
      expect(canTransitionJOStatus('submitted_to_finance', 'active')).toBe(false)
    })

    it('should reject backward transitions from completed', () => {
      expect(canTransitionJOStatus('completed', 'active')).toBe(false)
    })

    it('should reject all transitions from closed status', () => {
      fc.assert(
        fc.property(fc.constantFrom(...allStatuses), (targetStatus) => {
          expect(canTransitionJOStatus('closed', targetStatus)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should reject same-status transitions', () => {
      fc.assert(
        fc.property(fc.constantFrom(...allStatuses), (status) => {
          expect(canTransitionJOStatus(status, status)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should reject skipping statuses', () => {
      expect(canTransitionJOStatus('active', 'submitted_to_finance')).toBe(false)
      expect(canTransitionJOStatus('active', 'invoiced')).toBe(false)
      expect(canTransitionJOStatus('completed', 'invoiced')).toBe(false)
    })
  })

  /**
   * **Feature: v0.6-jo-creation, Property 9: Margin Formatting**
   * *For any* margin value, the formatted output should show exactly one
   * decimal place with a percent sign.
   * **Validates: Requirements 4.4**
   */
  describe('formatMargin', () => {
    it('should format margin with one decimal place and percent sign', () => {
      fc.assert(
        fc.property(fc.double({ min: -100, max: 100, noNaN: true }), (margin) => {
          const result = formatMargin(margin)
          expect(result).toMatch(/^-?\d+\.\d%$/)
        }),
        { numRuns: 100 }
      )
    })

    it('should format specific values correctly', () => {
      expect(formatMargin(15.567)).toBe('15.6%')
      expect(formatMargin(0)).toBe('0.0%')
      expect(formatMargin(-5.123)).toBe('-5.1%')
      expect(formatMargin(100)).toBe('100.0%')
    })
  })

  /**
   * **Feature: v0.6-jo-creation, Property 10: JO Access Control**
   * *For any* user role and JO, editing actions should be allowed only for
   * users with role "admin" or "manager".
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
   */
  describe('canEditJO', () => {
    const allRoles: JOUserRole[] = ['ops', 'admin', 'sales', 'engineer', 'manager', 'super_admin']

    it('should allow editing only for admin and manager roles', () => {
      fc.assert(
        fc.property(fc.constantFrom(...allRoles), (role) => {
          const result = canEditJO(role)
          const expected = role === 'admin' || role === 'manager'
          expect(result).toBe(expected)
        }),
        { numRuns: 100 }
      )
    })

    it('should return true for admin', () => {
      expect(canEditJO('admin')).toBe(true)
    })

    it('should return true for manager', () => {
      expect(canEditJO('manager')).toBe(true)
    })

    it('should return false for ops', () => {
      expect(canEditJO('ops')).toBe(false)
    })

    it('should return false for sales', () => {
      expect(canEditJO('sales')).toBe(false)
    })

    it('should return false for engineer', () => {
      expect(canEditJO('engineer')).toBe(false)
    })

    it('should return false for super_admin (not in edit list)', () => {
      expect(canEditJO('super_admin')).toBe(false)
    })
  })
})
