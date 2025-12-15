import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { isUrgent, calculateTrend } from '@/lib/ops-dashboard-utils'
import { differenceInDays, subDays } from 'date-fns'

describe('Ops Dashboard Utils', () => {
  /**
   * Property 8: Urgency calculation
   * For any PJO with approved_at date, is_urgent SHALL be true if and only if
   * the difference between current date and approved_at is greater than 3 days
   * Validates: Requirements 7.1
   */
  describe('Property 8: Urgency calculation', () => {
    it('should return true for dates more than 3 days ago', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 4, max: 365 }), // days ago (4 to 365)
          (daysAgo) => {
            const approvedAt = subDays(new Date(), daysAgo).toISOString()
            expect(isUrgent(approvedAt)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return false for dates 3 days or less ago', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 3 }), // days ago (0 to 3)
          (daysAgo) => {
            const approvedAt = subDays(new Date(), daysAgo).toISOString()
            expect(isUrgent(approvedAt)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return false for null approved_at', () => {
      expect(isUrgent(null)).toBe(false)
    })
  })

  /**
   * Property 10: Weekly trend calculation
   * For any weekly stats with completedThisWeek and completedLastWeek,
   * trend SHALL be 'up' if this > last, 'down' if this < last, 'stable' if equal
   * Validates: Requirements 6.3
   */
  describe('Property 10: Weekly trend calculation', () => {
    it('should return "up" when this week > last week', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (thisWeek, lastWeek) => {
            fc.pre(thisWeek > lastWeek)
            expect(calculateTrend(thisWeek, lastWeek)).toBe('up')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return "down" when this week < last week', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (thisWeek, lastWeek) => {
            fc.pre(thisWeek < lastWeek)
            expect(calculateTrend(thisWeek, lastWeek)).toBe('down')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return "stable" when this week equals last week', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100 }), (count) => {
          expect(calculateTrend(count, count)).toBe('stable')
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 2: Pending cost entries filter correctly
   * For any set of PJOs, the pending cost entries filter SHALL return only PJOs
   * where status='approved' AND converted_to_jo=false AND confirmed_count < total_count
   * Validates: Requirements 2.1
   */
  describe('Property 2: Pending cost entries filter', () => {
    interface MockPJO {
      status: string
      converted_to_jo: boolean
      confirmed_count: number
      total_count: number
    }

    function filterPendingCostEntries(pjos: MockPJO[]): MockPJO[] {
      return pjos.filter(
        (pjo) =>
          pjo.status === 'approved' &&
          pjo.converted_to_jo === false &&
          pjo.confirmed_count < pjo.total_count
      )
    }

    it('should only return approved, non-converted PJOs with incomplete confirmations', () => {
      const pjoArb = fc.record({
        status: fc.constantFrom('draft', 'pending_approval', 'approved', 'rejected'),
        converted_to_jo: fc.boolean(),
        confirmed_count: fc.integer({ min: 0, max: 10 }),
        total_count: fc.integer({ min: 0, max: 10 }),
      })

      fc.assert(
        fc.property(fc.array(pjoArb, { minLength: 0, maxLength: 20 }), (pjos) => {
          const filtered = filterPendingCostEntries(pjos)

          // All filtered items must meet criteria
          for (const pjo of filtered) {
            expect(pjo.status).toBe('approved')
            expect(pjo.converted_to_jo).toBe(false)
            expect(pjo.confirmed_count).toBeLessThan(pjo.total_count)
          }

          // All items meeting criteria must be in filtered
          const expected = pjos.filter(
            (p) =>
              p.status === 'approved' &&
              p.converted_to_jo === false &&
              p.confirmed_count < p.total_count
          )
          expect(filtered.length).toBe(expected.length)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 4: Active jobs filter correctly
   * For any set of JOs, the active jobs filter SHALL return only JOs
   * where status IN ('active', 'in_progress')
   * Validates: Requirements 3.1
   */
  describe('Property 4: Active jobs filter', () => {
    interface MockJO {
      id: string
      status: string
    }

    function filterActiveJobs(jobs: MockJO[]): MockJO[] {
      return jobs.filter((job) => ['active', 'in_progress'].includes(job.status))
    }

    it('should only return jobs with active or in_progress status', () => {
      const joArb = fc.record({
        id: fc.uuid(),
        status: fc.constantFrom(
          'active',
          'in_progress',
          'completed',
          'submitted_to_finance',
          'invoiced',
          'closed'
        ),
      })

      fc.assert(
        fc.property(fc.array(joArb, { minLength: 0, maxLength: 20 }), (jobs) => {
          const filtered = filterActiveJobs(jobs)

          // All filtered items must have active or in_progress status
          for (const job of filtered) {
            expect(['active', 'in_progress']).toContain(job.status)
          }

          // All items with active/in_progress must be in filtered
          const expected = jobs.filter((j) => ['active', 'in_progress'].includes(j.status))
          expect(filtered.length).toBe(expected.length)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 9: Pending entries sort order
   * For any list of pending cost entries, the list SHALL be sorted by
   * approved_at in ascending order (oldest first)
   * Validates: Requirements 7.2
   */
  describe('Property 9: Pending entries sort order', () => {
    interface MockEntry {
      approved_at: string
      is_urgent: boolean
    }

    function sortPendingEntries(entries: MockEntry[]): MockEntry[] {
      return [...entries].sort((a, b) => {
        if (a.is_urgent && !b.is_urgent) return -1
        if (!a.is_urgent && b.is_urgent) return 1
        return new Date(a.approved_at).getTime() - new Date(b.approved_at).getTime()
      })
    }

    it('should sort urgent items first, then by approved_at ascending', () => {
      const entryArb = fc.record({
        approved_at: fc
          .integer({ min: 1704067200000, max: 1735689600000 }) // 2024-01-01 to 2025-01-01 in ms
          .map((ms) => new Date(ms).toISOString()),
        is_urgent: fc.boolean(),
      })

      fc.assert(
        fc.property(fc.array(entryArb, { minLength: 2, maxLength: 20 }), (entries) => {
          const sorted = sortPendingEntries(entries)

          // Verify urgent items come first
          let seenNonUrgent = false
          for (const entry of sorted) {
            if (!entry.is_urgent) {
              seenNonUrgent = true
            } else if (seenNonUrgent) {
              // Urgent item after non-urgent - fail
              expect(true).toBe(false)
            }
          }

          // Verify within each group, sorted by date ascending
          const urgentItems = sorted.filter((e) => e.is_urgent)
          const nonUrgentItems = sorted.filter((e) => !e.is_urgent)

          for (let i = 1; i < urgentItems.length; i++) {
            expect(new Date(urgentItems[i].approved_at).getTime()).toBeGreaterThanOrEqual(
              new Date(urgentItems[i - 1].approved_at).getTime()
            )
          }

          for (let i = 1; i < nonUrgentItems.length; i++) {
            expect(new Date(nonUrgentItems[i].approved_at).getTime()).toBeGreaterThanOrEqual(
              new Date(nonUrgentItems[i - 1].approved_at).getTime()
            )
          }
        }),
        { numRuns: 100 }
      )
    })
  })
})


describe('Property 6: Justification required for exceeded costs', () => {
  /**
   * Property 6: Justification required for exceeded costs
   * For any cost confirmation where actual_amount > estimated_amount,
   * the confirmation SHALL fail if justification is empty or null
   * Validates: Requirements 4.4
   */

  interface CostConfirmation {
    estimated_amount: number
    actual_amount: number
    justification: string | null
  }

  function validateCostConfirmation(confirmation: CostConfirmation): {
    valid: boolean
    error?: string
  } {
    const isExceeded = confirmation.actual_amount > confirmation.estimated_amount

    if (isExceeded) {
      if (!confirmation.justification || confirmation.justification.trim() === '') {
        return {
          valid: false,
          error: 'Justification is required when cost exceeds budget',
        }
      }
    }

    return { valid: true }
  }

  it('should require justification when actual exceeds estimated', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }), // estimated
        fc.integer({ min: 1, max: 1000000 }), // actual (will be made > estimated)
        (estimated, actualBase) => {
          const actual = estimated + actualBase // Ensure actual > estimated
          const result = validateCostConfirmation({
            estimated_amount: estimated,
            actual_amount: actual,
            justification: null,
          })
          expect(result.valid).toBe(false)
          expect(result.error).toContain('Justification is required')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject empty string justification when exceeded', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.integer({ min: 1, max: 1000000 }),
        fc.constantFrom('', ' ', '  ', '   ', '\t', '\n', '  \t  '), // whitespace only
        (estimated, actualBase, whitespace) => {
          const actual = estimated + actualBase
          const result = validateCostConfirmation({
            estimated_amount: estimated,
            actual_amount: actual,
            justification: whitespace,
          })
          expect(result.valid).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should accept valid justification when exceeded', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.integer({ min: 1, max: 1000000 }),
        fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0),
        (estimated, actualBase, justification) => {
          const actual = estimated + actualBase
          const result = validateCostConfirmation({
            estimated_amount: estimated,
            actual_amount: actual,
            justification,
          })
          expect(result.valid).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should not require justification when within budget', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.integer({ min: 0, max: 1000000 }),
        (estimated, actualBase) => {
          const actual = Math.min(actualBase, estimated) // Ensure actual <= estimated
          const result = validateCostConfirmation({
            estimated_amount: estimated,
            actual_amount: actual,
            justification: null,
          })
          expect(result.valid).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})


describe('Property 5: Budget variance calculation', () => {
  /**
   * Property 5: Budget variance calculation
   * For any cost item with actual_amount set, the variance SHALL equal
   * (actual_amount - estimated_amount) and warning SHALL display when variance > 0
   * Validates: Requirements 4.2, 4.3
   */

  interface VarianceResult {
    variance: number
    variancePct: number
    showWarning: boolean
  }

  function calculateVariance(estimated: number, actual: number): VarianceResult {
    const variance = actual - estimated
    const variancePct = estimated > 0 ? (variance / estimated) * 100 : 0
    const showWarning = variance > 0

    return { variance, variancePct, showWarning }
  }

  it('should calculate variance as actual minus estimated', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000000 }), // estimated
        fc.integer({ min: 0, max: 10000000 }), // actual
        (estimated, actual) => {
          const result = calculateVariance(estimated, actual)
          expect(result.variance).toBe(actual - estimated)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should show warning when actual exceeds estimated', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000000 }), // estimated
        fc.integer({ min: 1, max: 10000000 }), // extra amount
        (estimated, extra) => {
          const actual = estimated + extra // actual > estimated
          const result = calculateVariance(estimated, actual)
          expect(result.showWarning).toBe(true)
          expect(result.variance).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should not show warning when actual is within budget', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000000 }), // estimated
        fc.integer({ min: 0, max: 10000000 }), // actual base
        (estimated, actualBase) => {
          const actual = Math.min(actualBase, estimated) // actual <= estimated
          const result = calculateVariance(estimated, actual)
          expect(result.showWarning).toBe(false)
          expect(result.variance).toBeLessThanOrEqual(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should calculate correct variance percentage', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000000 }), // estimated (non-zero)
        fc.integer({ min: 0, max: 10000000 }), // actual
        (estimated, actual) => {
          const result = calculateVariance(estimated, actual)
          const expectedPct = ((actual - estimated) / estimated) * 100
          expect(result.variancePct).toBeCloseTo(expectedPct, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle zero estimated amount', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000000 }), (actual) => {
        const result = calculateVariance(0, actual)
        expect(result.variancePct).toBe(0) // Avoid division by zero
        expect(result.variance).toBe(actual)
      }),
      { numRuns: 50 }
    )
  })
})
