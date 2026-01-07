/**
 * BKK Utils Tests
 * 
 * Property-based and unit tests for BKK utility functions.
 * Feature: bukti-kas-keluar
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  generateBKKNumber,
  parseBKKNumber,
  isValidBKKNumber,
  calculateAvailableBudget,
  calculateSettlementDifference,
  isValidStatusTransition,
  calculateBKKSummary,
  getAvailableActions,
  validateCreateBKKInput,
  validateRejectBKKInput,
  validateReleaseBKKInput,
  validateSettleBKKInput,
  VALID_TRANSITIONS,
  BKK_STATUS_COLORS
} from '@/lib/bkk-utils'
import type { BKK, BKKStatus } from '@/types'

// Helper to create a mock BKK
function createMockBKK(overrides: Partial<BKK> = {}): BKK {
  return {
    id: 'test-id',
    bkk_number: 'BKK-2025-0001',
    jo_id: 'jo-id',
    pjo_cost_item_id: null,
    purpose: 'Test purpose',
    amount_requested: 1000000,
    budget_category: null,
    budget_amount: null,
    status: 'pending',
    requested_by: null,
    requested_at: new Date().toISOString(),
    approved_by: null,
    approved_at: null,
    rejection_reason: null,
    released_by: null,
    released_at: null,
    release_method: null,
    release_reference: null,
    amount_spent: null,
    amount_returned: null,
    settled_at: null,
    settled_by: null,
    receipt_urls: [],
    notes: null,
    vendor_id: null,
    vendor_invoice_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

describe('BKK Utils', () => {
  /**
   * Property 1: BKK Number Format Validity
   * For any year and sequence number, the generated BKK number SHALL match
   * the format "BKK-YYYY-NNNN" where YYYY is the 4-digit year and NNNN is
   * a zero-padded 4-digit sequence.
   * 
   * Validates: Requirements 1.2
   */
  describe('Property 1: BKK Number Format Validity', () => {
    it('should generate valid BKK numbers for any year and sequence', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1900, max: 2100 }), // year
          fc.integer({ min: 1, max: 9999 }), // sequence
          (year, sequence) => {
            const bkkNumber = generateBKKNumber(year, sequence)
            
            // Must match format BKK-YYYY-NNNN
            expect(bkkNumber).toMatch(/^BKK-\d{4}-\d{4}$/)
            
            // Must be valid according to our validator
            expect(isValidBKKNumber(bkkNumber)).toBe(true)
            
            // Must be parseable back to original values
            const parsed = parseBKKNumber(bkkNumber)
            expect(parsed).not.toBeNull()
            expect(parsed?.year).toBe(year)
            expect(parsed?.sequence).toBe(sequence)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should pad sequence numbers correctly', () => {
      expect(generateBKKNumber(2025, 1)).toBe('BKK-2025-0001')
      expect(generateBKKNumber(2025, 12)).toBe('BKK-2025-0012')
      expect(generateBKKNumber(2025, 123)).toBe('BKK-2025-0123')
      expect(generateBKKNumber(2025, 1234)).toBe('BKK-2025-1234')
    })

    it('should reject invalid BKK number formats', () => {
      expect(isValidBKKNumber('BKK-2025-001')).toBe(false) // 3 digits
      expect(isValidBKKNumber('BKK-25-0001')).toBe(false) // 2 digit year
      expect(isValidBKKNumber('bkk-2025-0001')).toBe(false) // lowercase
      expect(isValidBKKNumber('BKK2025-0001')).toBe(false) // missing dash
      expect(isValidBKKNumber('')).toBe(false)
    })
  })


  /**
   * Property 2: Status Transition Validity
   * For any BKK with a given status, only the defined valid transitions
   * SHALL be allowed.
   * 
   * Validates: Requirements 2.1, 2.5, 3.1, 4.1
   */
  describe('Property 2: Status Transition Validity', () => {
    const allStatuses: BKKStatus[] = ['pending', 'approved', 'rejected', 'released', 'settled', 'cancelled']

    it('should only allow valid status transitions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...allStatuses), // current status
          fc.constantFrom(...allStatuses), // target status
          (currentStatus, targetStatus) => {
            const isValid = isValidStatusTransition(currentStatus, targetStatus)
            const expectedValid = VALID_TRANSITIONS[currentStatus].includes(targetStatus)
            
            expect(isValid).toBe(expectedValid)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow pending -> approved, rejected, cancelled', () => {
      expect(isValidStatusTransition('pending', 'approved')).toBe(true)
      expect(isValidStatusTransition('pending', 'rejected')).toBe(true)
      expect(isValidStatusTransition('pending', 'cancelled')).toBe(true)
      expect(isValidStatusTransition('pending', 'released')).toBe(false)
      expect(isValidStatusTransition('pending', 'settled')).toBe(false)
    })

    it('should allow approved -> released, cancelled', () => {
      expect(isValidStatusTransition('approved', 'released')).toBe(true)
      expect(isValidStatusTransition('approved', 'cancelled')).toBe(true)
      expect(isValidStatusTransition('approved', 'settled')).toBe(false)
    })

    it('should allow released -> settled only', () => {
      expect(isValidStatusTransition('released', 'settled')).toBe(true)
      expect(isValidStatusTransition('released', 'cancelled')).toBe(false)
      expect(isValidStatusTransition('released', 'approved')).toBe(false)
    })

    it('should not allow transitions from terminal states', () => {
      for (const target of allStatuses) {
        expect(isValidStatusTransition('settled', target)).toBe(false)
        expect(isValidStatusTransition('rejected', target)).toBe(false)
        expect(isValidStatusTransition('cancelled', target)).toBe(false)
      }
    })
  })

  /**
   * Property 5: Budget Calculation Correctness
   * For any cost item with a budget amount and a set of BKKs:
   * - available_budget = budget_amount - sum(amount_requested for all non-rejected, non-cancelled BKKs)
   * 
   * Validates: Requirements 1.3, 1.4, 7.1, 7.2
   */
  describe('Property 5: Budget Calculation Correctness', () => {
    it('should correctly calculate available budget', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100000000 }), // budget amount
          fc.array(
            fc.record({
              amount: fc.integer({ min: 1, max: 10000000 }),
              status: fc.constantFrom('pending', 'approved', 'released', 'settled', 'rejected', 'cancelled') as fc.Arbitrary<BKKStatus>
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (budgetAmount, bkkData) => {
            const bkks = bkkData.map((data, i) => 
              createMockBKK({
                id: `bkk-${i}`,
                amount_requested: data.amount,
                status: data.status
              })
            )
            
            const result = calculateAvailableBudget(budgetAmount, bkks)
            
            // Calculate expected values manually
            const activeBKKs = bkks.filter(b => b.status !== 'rejected' && b.status !== 'cancelled')
            const expectedDisbursed = activeBKKs
              .filter(b => b.status === 'released' || b.status === 'settled')
              .reduce((sum, b) => sum + b.amount_requested, 0)
            const expectedPending = activeBKKs
              .filter(b => b.status === 'pending' || b.status === 'approved')
              .reduce((sum, b) => sum + b.amount_requested, 0)
            const expectedAvailable = budgetAmount - expectedDisbursed - expectedPending
            
            expect(result.budgetAmount).toBe(budgetAmount)
            expect(result.alreadyDisbursed).toBe(expectedDisbursed)
            expect(result.pendingRequests).toBe(expectedPending)
            expect(result.available).toBe(expectedAvailable)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should exclude rejected and cancelled BKKs from calculations', () => {
      const bkks = [
        createMockBKK({ amount_requested: 1000000, status: 'released' }),
        createMockBKK({ amount_requested: 500000, status: 'rejected' }),
        createMockBKK({ amount_requested: 300000, status: 'cancelled' })
      ]
      
      const result = calculateAvailableBudget(5000000, bkks)
      
      expect(result.alreadyDisbursed).toBe(1000000) // Only released
      expect(result.available).toBe(4000000) // 5M - 1M
    })
  })


  /**
   * Property 6: Settlement Difference Calculation
   * For any BKK settlement with released amount R and spent amount S:
   * - If S < R: amount_returned = R - S, type = "return"
   * - If S > R: difference = S - R, type = "additional"
   * - If S = R: difference = 0, type = "exact"
   * 
   * Validates: Requirements 4.3, 4.4
   */
  describe('Property 6: Settlement Difference Calculation', () => {
    it('should correctly calculate settlement differences', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100000000 }), // released amount
          fc.integer({ min: 0, max: 100000000 }), // spent amount
          (releasedAmount, spentAmount) => {
            const result = calculateSettlementDifference(releasedAmount, spentAmount)
            
            expect(result.releasedAmount).toBe(releasedAmount)
            expect(result.spentAmount).toBe(spentAmount)
            expect(result.difference).toBe(Math.abs(releasedAmount - spentAmount))
            
            if (spentAmount < releasedAmount) {
              expect(result.type).toBe('return')
            } else if (spentAmount > releasedAmount) {
              expect(result.type).toBe('additional')
            } else {
              expect(result.type).toBe('exact')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle exact match', () => {
      const result = calculateSettlementDifference(1000000, 1000000)
      expect(result.type).toBe('exact')
      expect(result.difference).toBe(0)
    })

    it('should handle return case', () => {
      const result = calculateSettlementDifference(1000000, 800000)
      expect(result.type).toBe('return')
      expect(result.difference).toBe(200000)
    })

    it('should handle additional case', () => {
      const result = calculateSettlementDifference(1000000, 1200000)
      expect(result.type).toBe('additional')
      expect(result.difference).toBe(200000)
    })
  })

  /**
   * Property 8: BKK Summary Calculation
   * For any set of BKKs for a job order, the summary totals should be
   * correctly calculated.
   * 
   * Validates: Requirements 5.3
   */
  describe('Property 8: BKK Summary Calculation', () => {
    it('should correctly calculate summary totals', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              amount_requested: fc.integer({ min: 1, max: 10000000 }),
              amount_spent: fc.option(fc.integer({ min: 0, max: 10000000 }), { nil: undefined }),
              status: fc.constantFrom('pending', 'approved', 'released', 'settled', 'rejected', 'cancelled') as fc.Arbitrary<BKKStatus>
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (bkkData) => {
            const bkks = bkkData.map((data, i) => 
              createMockBKK({
                id: `bkk-${i}`,
                amount_requested: data.amount_requested,
                amount_spent: data.status === 'settled' ? (data.amount_spent ?? data.amount_requested) : null,
                status: data.status
              })
            )
            
            const result = calculateBKKSummary(bkks)
            
            // Verify counts
            for (const status of ['pending', 'approved', 'released', 'settled', 'rejected', 'cancelled'] as BKKStatus[]) {
              const expectedCount = bkks.filter(b => b.status === status).length
              expect(result.count[status]).toBe(expectedCount)
            }
            
            // Verify total requested (excludes rejected and cancelled)
            const expectedRequested = bkks
              .filter(b => b.status !== 'rejected' && b.status !== 'cancelled')
              .reduce((sum, b) => sum + b.amount_requested, 0)
            expect(result.totalRequested).toBe(expectedRequested)
            
            // Verify total released (released + settled)
            const expectedReleased = bkks
              .filter(b => b.status === 'released' || b.status === 'settled')
              .reduce((sum, b) => sum + b.amount_requested, 0)
            expect(result.totalReleased).toBe(expectedReleased)
            
            // Verify total settled
            const expectedSettled = bkks
              .filter(b => b.status === 'settled' && b.amount_spent !== null)
              .reduce((sum, b) => sum + (b.amount_spent ?? 0), 0)
            expect(result.totalSettled).toBe(expectedSettled)
            
            // Verify pending return
            expect(result.pendingReturn).toBe(expectedReleased - expectedSettled)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty BKK list', () => {
      const result = calculateBKKSummary([])
      
      expect(result.totalRequested).toBe(0)
      expect(result.totalReleased).toBe(0)
      expect(result.totalSettled).toBe(0)
      expect(result.pendingReturn).toBe(0)
      expect(result.count.pending).toBe(0)
    })
  })


  /**
   * Property 4: Input Validation Completeness
   * For any BKK operation, required fields must be validated.
   * 
   * Validates: Requirements 1.5, 2.3, 3.2, 4.2
   */
  describe('Property 4: Input Validation Completeness', () => {
    describe('Create BKK validation', () => {
      it('should reject empty or whitespace purpose', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('', ' ', '  ', '\t', '\n'),
            (purpose) => {
              const result = validateCreateBKKInput({ purpose, amount_requested: 1000 })
              expect(result.isValid).toBe(false)
              expect(result.errors).toContain('Purpose is required')
            }
          ),
          { numRuns: 10 }
        )
      })

      it('should reject zero or negative amounts', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: -1000000, max: 0 }),
            (amount) => {
              const result = validateCreateBKKInput({ purpose: 'Test', amount_requested: amount })
              expect(result.isValid).toBe(false)
              expect(result.errors).toContain('Amount must be greater than zero')
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should accept valid inputs', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            fc.integer({ min: 1, max: 100000000 }),
            (purpose, amount) => {
              const result = validateCreateBKKInput({ purpose, amount_requested: amount })
              expect(result.isValid).toBe(true)
              expect(result.errors).toHaveLength(0)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('Reject BKK validation', () => {
      it('should reject empty rejection reason', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('', ' ', '  ', '\t', '\n', undefined),
            (reason) => {
              const result = validateRejectBKKInput(reason as string | undefined)
              expect(result.isValid).toBe(false)
              expect(result.errors).toContain('Rejection reason is required')
            }
          ),
          { numRuns: 10 }
        )
      })

      it('should accept non-empty rejection reason', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            (reason) => {
              const result = validateRejectBKKInput(reason)
              expect(result.isValid).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('Release BKK validation', () => {
      it('should only accept cash or transfer', () => {
        fc.assert(
          fc.property(
            fc.string().filter(s => s !== 'cash' && s !== 'transfer'),
            (method) => {
              const result = validateReleaseBKKInput({ release_method: method })
              expect(result.isValid).toBe(false)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should accept cash and transfer', () => {
        expect(validateReleaseBKKInput({ release_method: 'cash' }).isValid).toBe(true)
        expect(validateReleaseBKKInput({ release_method: 'transfer' }).isValid).toBe(true)
      })
    })

    describe('Settle BKK validation', () => {
      it('should reject negative amounts', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: -1000000, max: -1 }),
            (amount) => {
              const result = validateSettleBKKInput({ amount_spent: amount })
              expect(result.isValid).toBe(false)
              expect(result.errors).toContain('Amount spent cannot be negative')
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should accept zero and positive amounts', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 100000000 }),
            (amount) => {
              const result = validateSettleBKKInput({ amount_spent: amount })
              expect(result.isValid).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })
    })
  })

  /**
   * Property 9: Action Availability Based on Status
   * For any BKK with a given status, the available actions SHALL be
   * determined by status and user role.
   * 
   * Validates: Requirements 5.4, 5.5, 5.6
   */
  describe('Property 9: Action Availability Based on Status', () => {
    it('should always include view action', () => {
      const allStatuses: BKKStatus[] = ['pending', 'approved', 'rejected', 'released', 'settled', 'cancelled']
      const roles = ['ops', 'admin', 'finance', 'manager', 'super_admin', 'sales']
      
      fc.assert(
        fc.property(
          fc.constantFrom(...allStatuses),
          fc.constantFrom(...roles),
          fc.boolean(),
          (status, role, isRequester) => {
            const actions = getAvailableActions(status, role, isRequester)
            expect(actions).toContain('view')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should show cancel for pending BKKs to requester', () => {
      const actions = getAvailableActions('pending', 'ops', true)
      expect(actions).toContain('cancel')
    })

    it('should show approve/reject for pending BKKs to admin/finance', () => {
      for (const role of ['admin', 'finance', 'manager', 'super_admin']) {
        const actions = getAvailableActions('pending', role, false)
        expect(actions).toContain('approve')
        expect(actions).toContain('reject')
      }
    })

    it('should show release for approved BKKs to admin/finance', () => {
      for (const role of ['admin', 'finance', 'super_admin']) {
        const actions = getAvailableActions('approved', role, false)
        expect(actions).toContain('release')
      }
    })

    it('should show settle for released BKKs', () => {
      const actions = getAvailableActions('released', 'ops', true)
      expect(actions).toContain('settle')
    })

    it('should only show view for terminal states', () => {
      for (const status of ['settled', 'rejected', 'cancelled'] as BKKStatus[]) {
        const actions = getAvailableActions(status, 'admin', false)
        expect(actions).toEqual(['view'])
      }
    })
  })
})
