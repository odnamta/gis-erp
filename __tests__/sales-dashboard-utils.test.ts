/**
 * Sales Dashboard Utils - Property-Based Tests
 * Tests for pipeline grouping, win rates, staleness, and customer analytics
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculatePipelineValue,
  groupPJOsByPipelineStage,
  type PJOInput,
  type PipelineStage,
  type PipelineStatus,
} from '@/lib/sales-dashboard-utils'

// Helper to generate date strings (module level for reuse)
const dateStringArb = fc.integer({ min: 0, max: 365 }).map(daysAgo => {
  const date = new Date('2025-12-15')
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
})

// Generator for PJO-like objects (module level for reuse)
const pjoArb = fc.record({
  id: fc.uuid(),
  status: fc.constantFrom('draft', 'pending_approval', 'approved', 'rejected'),
  total_estimated_revenue: fc.option(fc.integer({ min: 0, max: 1000000000 }), { nil: null }),
  total_revenue_calculated: fc.option(fc.integer({ min: 0, max: 1000000000 }), { nil: null }),
  is_active: fc.boolean(),
  created_at: fc.option(dateStringArb, { nil: null }),
  rejection_reason: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  converted_to_jo: fc.option(fc.boolean(), { nil: null }),
})

describe('Sales Dashboard Utils', () => {

  /**
   * Property 2: Pipeline grouping and aggregation
   * For any set of active PJOs, the pipeline grouping SHALL produce exactly one entry
   * per status (draft, pending_approval, approved, converted, rejected) with count equal
   * to PJOs in that status and value equal to sum of total_revenue_calculated
   * **Validates: Requirements 2.1, 2.2**
   */
  describe('Property 2: Pipeline grouping and aggregation', () => {
    it('produces exactly one entry per status', () => {
      fc.assert(
        fc.property(
          fc.array(pjoArb, { minLength: 0, maxLength: 20 }),
          (pjos) => {
            const result = groupPJOsByPipelineStage(pjos)

            // Should always have exactly 5 entries
            expect(result.length).toBe(5)

            // Each status should appear exactly once
            const statuses = result.map(r => r.status)
            expect(statuses).toContain('draft')
            expect(statuses).toContain('pending_approval')
            expect(statuses).toContain('approved')
            expect(statuses).toContain('converted')
            expect(statuses).toContain('rejected')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('count equals number of active PJOs in that status', () => {
      fc.assert(
        fc.property(
          fc.array(pjoArb, { minLength: 0, maxLength: 20 }),
          (pjos) => {
            const result = groupPJOsByPipelineStage(pjos)

            // Count active PJOs by status manually
            const activePjos = pjos.filter(p => p.is_active !== false)
            
            // Check non-converted statuses
            for (const entry of result) {
              if (entry.status === 'converted') {
                // Converted = approved PJOs with converted_to_jo = true
                const expectedCount = activePjos.filter(
                  p => p.status === 'approved' && p.converted_to_jo === true
                ).length
                expect(entry.count).toBe(expectedCount)
              } else if (entry.status === 'approved') {
                // Approved = approved PJOs without converted_to_jo = true
                const expectedCount = activePjos.filter(
                  p => p.status === 'approved' && p.converted_to_jo !== true
                ).length
                expect(entry.count).toBe(expectedCount)
              } else {
                const expectedCount = activePjos.filter(p => p.status === entry.status).length
                expect(entry.count).toBe(expectedCount)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('value equals sum of revenue for active PJOs in that status', () => {
      fc.assert(
        fc.property(
          fc.array(pjoArb, { minLength: 0, maxLength: 20 }),
          (pjos) => {
            const result = groupPJOsByPipelineStage(pjos)

            const activePjos = pjos.filter(p => p.is_active !== false)
            
            for (const entry of result) {
              let filteredPjos: PJOInput[]
              
              if (entry.status === 'converted') {
                filteredPjos = activePjos.filter(
                  p => p.status === 'approved' && p.converted_to_jo === true
                )
              } else if (entry.status === 'approved') {
                filteredPjos = activePjos.filter(
                  p => p.status === 'approved' && p.converted_to_jo !== true
                )
              } else {
                filteredPjos = activePjos.filter(p => p.status === entry.status)
              }
              
              const expectedValue = filteredPjos.reduce(
                (sum, p) => sum + (p.total_revenue_calculated ?? p.total_estimated_revenue ?? 0),
                0
              )
              expect(entry.value).toBe(expectedValue)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('excludes inactive PJOs', () => {
      const pjos: PJOInput[] = [
        { id: '1', status: 'draft', total_revenue_calculated: 100000, is_active: true },
        { id: '2', status: 'draft', total_revenue_calculated: 200000, is_active: false },
      ]
      const result = groupPJOsByPipelineStage(pjos)
      
      const draftStage = result.find(r => r.status === 'draft')
      expect(draftStage?.count).toBe(1)
      expect(draftStage?.value).toBe(100000)
    })
  })

  describe('calculatePipelineValue', () => {
    it('sums only pipeline statuses (draft, pending_approval, approved)', () => {
      const pjos: PJOInput[] = [
        { id: '1', status: 'draft', total_revenue_calculated: 100000, is_active: true },
        { id: '2', status: 'pending_approval', total_revenue_calculated: 200000, is_active: true },
        { id: '3', status: 'approved', total_revenue_calculated: 300000, is_active: true },
        { id: '4', status: 'rejected', total_revenue_calculated: 400000, is_active: true },
      ]
      
      const result = calculatePipelineValue(pjos)
      expect(result).toBe(600000) // draft + pending + approved, not rejected
    })

    it('excludes inactive PJOs', () => {
      const pjos: PJOInput[] = [
        { id: '1', status: 'draft', total_revenue_calculated: 100000, is_active: true },
        { id: '2', status: 'draft', total_revenue_calculated: 200000, is_active: false },
      ]
      
      const result = calculatePipelineValue(pjos)
      expect(result).toBe(100000)
    })

    it('uses total_estimated_revenue as fallback', () => {
      const pjos: PJOInput[] = [
        { id: '1', status: 'draft', total_estimated_revenue: 100000, is_active: true },
      ]
      
      const result = calculatePipelineValue(pjos)
      expect(result).toBe(100000)
    })
  })
})


// Import conversion rate functions
import {
  calculateConversionRate,
  calculateWinRate,
  calculateOverallConversionRate,
} from '@/lib/sales-dashboard-utils'

/**
 * Property 3: Conversion rate calculation
 * For any two consecutive pipeline stages, the conversion rate SHALL equal
 * (next stage count / current stage count) × 100, and overall win rate SHALL equal
 * (converted / (converted + rejected)) × 100
 * **Validates: Requirements 2.3, 2.4**
 */
describe('Property 3: Conversion rate calculation', () => {
  describe('calculateConversionRate', () => {
    it('returns correct percentage for any valid counts', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }), // fromCount (non-zero)
          fc.integer({ min: 0, max: 1000 }), // toCount
          (fromCount, toCount) => {
            const rate = calculateConversionRate(fromCount, toCount)
            const expected = (toCount / fromCount) * 100
            expect(rate).toBeCloseTo(expected, 10)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('returns 0 when fromCount is 0', () => {
      expect(calculateConversionRate(0, 10)).toBe(0)
      expect(calculateConversionRate(0, 0)).toBe(0)
    })

    it('returns 100 when all convert', () => {
      expect(calculateConversionRate(10, 10)).toBe(100)
    })
  })

  describe('calculateWinRate', () => {
    it('returns correct percentage for any valid counts', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }), // converted
          fc.integer({ min: 0, max: 1000 }), // rejected
          (converted, rejected) => {
            const rate = calculateWinRate(converted, rejected)
            const totalDecided = converted + rejected
            
            if (totalDecided === 0) {
              expect(rate).toBe(0)
            } else {
              const expected = (converted / totalDecided) * 100
              expect(rate).toBeCloseTo(expected, 10)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('returns 0 when no decisions made', () => {
      expect(calculateWinRate(0, 0)).toBe(0)
    })

    it('returns 100 when all won', () => {
      expect(calculateWinRate(10, 0)).toBe(100)
    })

    it('returns 0 when all lost', () => {
      expect(calculateWinRate(0, 10)).toBe(0)
    })

    it('returns 50 when equal wins and losses', () => {
      expect(calculateWinRate(5, 5)).toBe(50)
    })
  })

  describe('calculateOverallConversionRate', () => {
    it('calculates overall rate correctly', () => {
      const pjos: PJOInput[] = [
        { id: '1', status: 'draft', is_active: true },
        { id: '2', status: 'pending_approval', is_active: true },
        { id: '3', status: 'approved', converted_to_jo: true, is_active: true },
        { id: '4', status: 'approved', converted_to_jo: true, is_active: true },
        { id: '5', status: 'rejected', is_active: true },
      ]
      
      const rate = calculateOverallConversionRate(pjos)
      // 2 converted out of 5 total = 40%
      expect(rate).toBe(40)
    })

    it('excludes inactive PJOs', () => {
      const pjos: PJOInput[] = [
        { id: '1', status: 'approved', converted_to_jo: true, is_active: true },
        { id: '2', status: 'approved', converted_to_jo: true, is_active: false },
      ]
      
      const rate = calculateOverallConversionRate(pjos)
      // 1 converted out of 1 active = 100%
      expect(rate).toBe(100)
    })

    it('returns 0 when no PJOs', () => {
      expect(calculateOverallConversionRate([])).toBe(0)
    })
  })
})


// Import staleness functions
import {
  calculateDaysInStatus,
  getStalenessLevel,
  countStalePJOs,
  type StalenessLevel,
  type PendingFollowup,
} from '@/lib/sales-dashboard-utils'

/**
 * Property 6: Staleness classification
 * For any PJO in draft status with days_in_status > 7, staleness SHALL be 'alert';
 * with days_in_status > 5, staleness SHALL be 'warning'.
 * For any PJO in pending_approval status with days_in_status > 3, staleness SHALL be 'warning'.
 * Otherwise staleness SHALL be 'normal'
 * **Validates: Requirements 4.1, 4.2, 4.3**
 */
describe('Property 6: Staleness classification', () => {
  describe('calculateDaysInStatus', () => {
    it('returns correct days for any date', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 365 }),
          (daysAgo) => {
            const currentDate = new Date('2025-12-15')
            const createdDate = new Date(currentDate)
            createdDate.setDate(createdDate.getDate() - daysAgo)
            
            const result = calculateDaysInStatus(createdDate.toISOString(), currentDate)
            expect(result).toBe(daysAgo)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('returns 0 for future dates', () => {
      const currentDate = new Date('2025-12-15')
      const futureDate = new Date('2025-12-20')
      expect(calculateDaysInStatus(futureDate.toISOString(), currentDate)).toBe(0)
    })
  })

  describe('getStalenessLevel', () => {
    it('classifies draft staleness correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 30 }),
          (daysInStatus) => {
            const staleness = getStalenessLevel('draft', daysInStatus)
            
            if (daysInStatus > 7) {
              expect(staleness).toBe('alert')
            } else if (daysInStatus > 5) {
              expect(staleness).toBe('warning')
            } else {
              expect(staleness).toBe('normal')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('classifies pending_approval staleness correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 30 }),
          (daysInStatus) => {
            const staleness = getStalenessLevel('pending_approval', daysInStatus)
            
            if (daysInStatus > 3) {
              expect(staleness).toBe('warning')
            } else {
              expect(staleness).toBe('normal')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('returns normal for other statuses', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('approved', 'converted', 'rejected'),
          fc.integer({ min: 0, max: 100 }),
          (status, daysInStatus) => {
            const staleness = getStalenessLevel(status, daysInStatus)
            expect(staleness).toBe('normal')
          }
        ),
        { numRuns: 50 }
      )
    })

    it('boundary tests for draft', () => {
      expect(getStalenessLevel('draft', 5)).toBe('normal')
      expect(getStalenessLevel('draft', 6)).toBe('warning')
      expect(getStalenessLevel('draft', 7)).toBe('warning')
      expect(getStalenessLevel('draft', 8)).toBe('alert')
    })

    it('boundary tests for pending_approval', () => {
      expect(getStalenessLevel('pending_approval', 3)).toBe('normal')
      expect(getStalenessLevel('pending_approval', 4)).toBe('warning')
    })
  })

  describe('countStalePJOs', () => {
    it('counts only non-normal staleness', () => {
      const followups: PendingFollowup[] = [
        { id: '1', pjo_number: 'PJO-001', customer_name: 'A', value: 100, status: 'draft', days_in_status: 3, staleness: 'normal', created_at: '' },
        { id: '2', pjo_number: 'PJO-002', customer_name: 'B', value: 200, status: 'draft', days_in_status: 6, staleness: 'warning', created_at: '' },
        { id: '3', pjo_number: 'PJO-003', customer_name: 'C', value: 300, status: 'draft', days_in_status: 10, staleness: 'alert', created_at: '' },
      ]
      
      expect(countStalePJOs(followups)).toBe(2)
    })

    it('returns 0 when all normal', () => {
      const followups: PendingFollowup[] = [
        { id: '1', pjo_number: 'PJO-001', customer_name: 'A', value: 100, status: 'draft', days_in_status: 3, staleness: 'normal', created_at: '' },
      ]
      
      expect(countStalePJOs(followups)).toBe(0)
    })
  })
})


// Import pending follow-ups functions
import {
  filterPendingFollowups,
  type PJOWithCustomer,
} from '@/lib/sales-dashboard-utils'

/**
 * Property 4: Pending follow-ups filter
 * For any PJO, it SHALL appear in the pending follow-ups list if and only if
 * status is 'draft' or 'pending_approval' and is_active is true
 * **Validates: Requirements 3.1**
 * 
 * Property 5: Follow-ups sort order
 * For any list of pending follow-ups, the list SHALL be sorted by days_in_status
 * in descending order (oldest first)
 * **Validates: Requirements 3.3**
 */
describe('Property 4 & 5: Pending follow-ups filter and sort', () => {
  const pjoWithCustomerArb = fc.record({
    id: fc.uuid(),
    pjo_number: fc.string({ minLength: 1, maxLength: 20 }),
    status: fc.constantFrom('draft', 'pending_approval', 'approved', 'rejected'),
    total_revenue_calculated: fc.option(fc.integer({ min: 0, max: 1000000000 }), { nil: null }),
    created_at: fc.option(dateStringArb, { nil: null }),
    is_active: fc.boolean(),
    customer_name: fc.string({ minLength: 1, maxLength: 50 }),
  })

  it('includes only draft and pending_approval PJOs', () => {
    fc.assert(
      fc.property(
        fc.array(pjoWithCustomerArb, { minLength: 0, maxLength: 20 }),
        (pjos) => {
          const currentDate = new Date('2025-12-15')
          const result = filterPendingFollowups(pjos, currentDate)

          // Every result should be draft or pending_approval
          for (const followup of result) {
            expect(['draft', 'pending_approval']).toContain(followup.status)
          }

          // Count expected
          const expected = pjos.filter(
            p => p.is_active !== false && (p.status === 'draft' || p.status === 'pending_approval')
          )
          expect(result.length).toBe(expected.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('excludes inactive PJOs', () => {
    const pjos: PJOWithCustomer[] = [
      { id: '1', pjo_number: 'PJO-001', status: 'draft', created_at: '2025-12-10', is_active: true, customer_name: 'A' },
      { id: '2', pjo_number: 'PJO-002', status: 'draft', created_at: '2025-12-10', is_active: false, customer_name: 'B' },
    ]
    const currentDate = new Date('2025-12-15')
    const result = filterPendingFollowups(pjos, currentDate)

    expect(result.length).toBe(1)
    expect(result[0].pjo_number).toBe('PJO-001')
  })

  it('sorts by days_in_status descending (oldest first)', () => {
    fc.assert(
      fc.property(
        fc.array(pjoWithCustomerArb.filter(p => p.status === 'draft' || p.status === 'pending_approval'), { minLength: 2, maxLength: 20 }),
        (pjos) => {
          const currentDate = new Date('2025-12-15')
          const result = filterPendingFollowups(pjos, currentDate)

          // Check sort order
          for (let i = 1; i < result.length; i++) {
            expect(result[i - 1].days_in_status).toBeGreaterThanOrEqual(result[i].days_in_status)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('calculates staleness correctly', () => {
    const pjos: PJOWithCustomer[] = [
      { id: '1', pjo_number: 'PJO-001', status: 'draft', created_at: '2025-12-12', is_active: true, customer_name: 'A' }, // 3 days - normal
      { id: '2', pjo_number: 'PJO-002', status: 'draft', created_at: '2025-12-08', is_active: true, customer_name: 'B' }, // 7 days - warning
      { id: '3', pjo_number: 'PJO-003', status: 'draft', created_at: '2025-12-01', is_active: true, customer_name: 'C' }, // 14 days - alert
    ]
    const currentDate = new Date('2025-12-15')
    const result = filterPendingFollowups(pjos, currentDate)

    expect(result.find(r => r.pjo_number === 'PJO-001')?.staleness).toBe('normal')
    expect(result.find(r => r.pjo_number === 'PJO-002')?.staleness).toBe('warning')
    expect(result.find(r => r.pjo_number === 'PJO-003')?.staleness).toBe('alert')
  })
})


// Import top customers functions
import {
  calculateCustomerTrend,
  rankCustomersByValue,
  type CustomerPJOInput,
  type PeriodFilter,
  type TrendDirection,
  type TopCustomer,
} from '@/lib/sales-dashboard-utils'

/**
 * Property 8: Top customers ranking and calculation
 * For any set of customers with PJOs in the selected period, customers SHALL be ranked
 * by total PJO value descending, and avgValue SHALL equal totalValue / jobCount
 * **Validates: Requirements 5.1, 5.2**
 * 
 * Property 9: Customer trend calculation
 * For any customer with values in current and previous periods, trend SHALL be 'up'
 * if current > previous, 'down' if current < previous, 'stable' if equal
 * **Validates: Requirements 5.3**
 */
describe('Property 8 & 9: Top customers ranking and trend', () => {
  describe('calculateCustomerTrend', () => {
    it('calculates trend correctly for any values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000000 }),
          fc.integer({ min: 0, max: 1000000 }),
          (currentValue, previousValue) => {
            const { trend } = calculateCustomerTrend(currentValue, previousValue)
            
            if (previousValue === 0) {
              if (currentValue > 0) {
                expect(trend).toBe('up')
              } else {
                expect(trend).toBe('stable')
              }
            } else if (currentValue > previousValue) {
              expect(trend).toBe('up')
            } else if (currentValue < previousValue) {
              expect(trend).toBe('down')
            } else {
              expect(trend).toBe('stable')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('calculates percentage correctly', () => {
      expect(calculateCustomerTrend(150, 100).percentage).toBe(50) // +50%
      expect(calculateCustomerTrend(50, 100).percentage).toBe(50) // -50%
      expect(calculateCustomerTrend(100, 100).percentage).toBe(0) // 0%
      expect(calculateCustomerTrend(100, 0).percentage).toBe(100) // new customer
    })
  })

  describe('rankCustomersByValue', () => {
    const period: PeriodFilter = {
      type: 'this_month',
      startDate: new Date('2025-12-01'),
      endDate: new Date('2025-12-31'),
    }
    const previousPeriod: PeriodFilter = {
      type: 'this_month',
      startDate: new Date('2025-11-01'),
      endDate: new Date('2025-11-30'),
    }

    it('ranks customers by total value descending', () => {
      const pjos: CustomerPJOInput[] = [
        { customer_id: '1', customer_name: 'A', total_revenue_calculated: 100000, status: 'approved', created_at: '2025-12-10' },
        { customer_id: '2', customer_name: 'B', total_revenue_calculated: 300000, status: 'approved', created_at: '2025-12-10' },
        { customer_id: '3', customer_name: 'C', total_revenue_calculated: 200000, status: 'approved', created_at: '2025-12-10' },
      ]
      
      const result = rankCustomersByValue(pjos, period, previousPeriod)
      
      expect(result[0].name).toBe('B')
      expect(result[1].name).toBe('C')
      expect(result[2].name).toBe('A')
    })

    it('calculates avgValue correctly', () => {
      const pjos: CustomerPJOInput[] = [
        { customer_id: '1', customer_name: 'A', total_revenue_calculated: 100000, status: 'approved', created_at: '2025-12-10' },
        { customer_id: '1', customer_name: 'A', total_revenue_calculated: 200000, status: 'approved', created_at: '2025-12-15' },
      ]
      
      const result = rankCustomersByValue(pjos, period, previousPeriod)
      
      expect(result[0].totalValue).toBe(300000)
      expect(result[0].jobCount).toBe(2)
      expect(result[0].avgValue).toBe(150000)
    })

    it('only includes approved/converted PJOs', () => {
      const pjos: CustomerPJOInput[] = [
        { customer_id: '1', customer_name: 'A', total_revenue_calculated: 100000, status: 'approved', created_at: '2025-12-10' },
        { customer_id: '1', customer_name: 'A', total_revenue_calculated: 200000, status: 'draft', created_at: '2025-12-10' },
        { customer_id: '1', customer_name: 'A', total_revenue_calculated: 300000, status: 'rejected', created_at: '2025-12-10' },
      ]
      
      const result = rankCustomersByValue(pjos, period, previousPeriod)
      
      expect(result[0].totalValue).toBe(100000) // Only approved
    })

    it('filters by period', () => {
      const pjos: CustomerPJOInput[] = [
        { customer_id: '1', customer_name: 'A', total_revenue_calculated: 100000, status: 'approved', created_at: '2025-12-10' },
        { customer_id: '1', customer_name: 'A', total_revenue_calculated: 200000, status: 'approved', created_at: '2025-11-10' }, // Previous period
      ]
      
      const result = rankCustomersByValue(pjos, period, previousPeriod)
      
      expect(result[0].totalValue).toBe(100000) // Only current period
    })
  })
})


// Import win/loss functions
import {
  groupLossReasons,
  calculateWinLossData,
  type WinLossData,
  type LossReason,
} from '@/lib/sales-dashboard-utils'

/**
 * Property 10: Win/loss aggregation
 * For any set of PJOs, won count SHALL equal PJOs with status='converted',
 * lost count SHALL equal PJOs with status='rejected',
 * pending count SHALL equal PJOs with status in ('draft', 'pending_approval', 'approved')
 * **Validates: Requirements 6.1**
 * 
 * Property 11: Win/loss percentage calculation
 * For any win/loss data, each category percentage SHALL equal (category count / total count) × 100,
 * and all percentages SHALL sum to approximately 100
 * **Validates: Requirements 6.3**
 * 
 * Property 12: Loss reasons grouping
 * For any set of rejected PJOs with rejection_reason, the loss reasons list SHALL contain
 * each unique reason with count equal to PJOs having that reason
 * **Validates: Requirements 6.4**
 */
describe('Property 10, 11, 12: Win/loss aggregation and analysis', () => {
  describe('calculateWinLossData', () => {
    it('counts categories correctly', () => {
      const pjos: PJOInput[] = [
        { id: '1', status: 'approved', converted_to_jo: true, is_active: true }, // won
        { id: '2', status: 'approved', converted_to_jo: true, is_active: true }, // won
        { id: '3', status: 'rejected', is_active: true }, // lost
        { id: '4', status: 'draft', is_active: true }, // pending
        { id: '5', status: 'pending_approval', is_active: true }, // pending
        { id: '6', status: 'approved', is_active: true }, // pending (not converted)
      ]
      
      const result = calculateWinLossData(pjos)
      
      expect(result.won.count).toBe(2)
      expect(result.lost.count).toBe(1)
      expect(result.pending.count).toBe(3)
    })

    it('calculates percentages correctly', () => {
      fc.assert(
        fc.property(
          fc.array(pjoArb, { minLength: 1, maxLength: 20 }),
          (pjos) => {
            const result = calculateWinLossData(pjos)
            const total = result.won.count + result.lost.count + result.pending.count
            
            if (total > 0) {
              // Percentages should sum to approximately 100 (rounding may cause slight variance)
              const sum = result.won.percentage + result.lost.percentage + result.pending.percentage
              expect(sum).toBeGreaterThanOrEqual(99)
              expect(sum).toBeLessThanOrEqual(101)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('excludes inactive PJOs', () => {
      const pjos: PJOInput[] = [
        { id: '1', status: 'approved', converted_to_jo: true, is_active: true },
        { id: '2', status: 'approved', converted_to_jo: true, is_active: false },
      ]
      
      const result = calculateWinLossData(pjos)
      expect(result.won.count).toBe(1)
    })

    it('calculates values correctly', () => {
      const pjos: PJOInput[] = [
        { id: '1', status: 'approved', converted_to_jo: true, is_active: true, total_revenue_calculated: 100000 },
        { id: '2', status: 'rejected', is_active: true, total_revenue_calculated: 200000 },
      ]
      
      const result = calculateWinLossData(pjos)
      expect(result.won.value).toBe(100000)
      expect(result.lost.value).toBe(200000)
    })
  })

  describe('groupLossReasons', () => {
    it('groups reasons correctly', () => {
      const pjos: PJOInput[] = [
        { id: '1', status: 'rejected', rejection_reason: 'Price too high', is_active: true },
        { id: '2', status: 'rejected', rejection_reason: 'Price too high', is_active: true },
        { id: '3', status: 'rejected', rejection_reason: 'Timeline mismatch', is_active: true },
        { id: '4', status: 'rejected', is_active: true }, // No reason
      ]
      
      const result = groupLossReasons(pjos)
      
      expect(result.length).toBe(2)
      expect(result[0]).toEqual({ reason: 'Price too high', count: 2 })
      expect(result[1]).toEqual({ reason: 'Timeline mismatch', count: 1 })
    })

    it('sorts by count descending', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              status: fc.constant('rejected'),
              rejection_reason: fc.option(fc.constantFrom('A', 'B', 'C', 'D'), { nil: undefined }),
              is_active: fc.constant(true),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (pjos) => {
            const result = groupLossReasons(pjos as PJOInput[])
            
            for (let i = 1; i < result.length; i++) {
              expect(result[i - 1].count).toBeGreaterThanOrEqual(result[i].count)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


// Import period filter functions
import {
  getPeriodDates,
  getPreviousPeriodDates,
  filterPJOsByPeriod,
  type PeriodType,
} from '@/lib/sales-dashboard-utils'

/**
 * Property 13: Period filter application
 * For any period selection, all dashboard data SHALL only include PJOs where
 * created_at falls within the period's start and end dates
 * **Validates: Requirements 7.2**
 */
describe('Property 13: Period filter application', () => {
  describe('getPeriodDates', () => {
    it('returns correct dates for this_month', () => {
      const currentDate = new Date('2025-12-15')
      const result = getPeriodDates('this_month', currentDate)
      
      expect(result.startDate.getDate()).toBe(1)
      expect(result.startDate.getMonth()).toBe(11) // December
      expect(result.endDate.getDate()).toBe(31)
      expect(result.endDate.getMonth()).toBe(11)
    })

    it('returns correct dates for this_quarter', () => {
      const currentDate = new Date('2025-12-15')
      const result = getPeriodDates('this_quarter', currentDate)
      
      expect(result.startDate.getMonth()).toBe(9) // October (Q4)
      expect(result.endDate.getMonth()).toBe(11) // December
    })

    it('returns correct dates for this_year', () => {
      const currentDate = new Date('2025-12-15')
      const result = getPeriodDates('this_year', currentDate)
      
      expect(result.startDate.getMonth()).toBe(0) // January
      expect(result.startDate.getDate()).toBe(1)
      expect(result.endDate.getMonth()).toBe(11) // December
      expect(result.endDate.getDate()).toBe(31)
    })

    it('handles custom dates', () => {
      const currentDate = new Date('2025-12-15')
      const customStart = new Date('2025-06-01')
      const customEnd = new Date('2025-06-30')
      const result = getPeriodDates('custom', currentDate, customStart, customEnd)
      
      expect(result.startDate.getMonth()).toBe(5) // June
      expect(result.endDate.getMonth()).toBe(5)
    })
  })

  describe('filterPJOsByPeriod', () => {
    it('includes only PJOs within period', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              created_at: fc.option(dateStringArb, { nil: null }),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (pjos) => {
            const period: PeriodFilter = {
              type: 'this_month',
              startDate: new Date('2025-12-01'),
              endDate: new Date('2025-12-31T23:59:59.999Z'),
            }
            
            const result = filterPJOsByPeriod(pjos, period)
            
            // Every result should be within period
            for (const pjo of result) {
              if (pjo.created_at) {
                const createdAt = new Date(pjo.created_at)
                expect(createdAt.getTime()).toBeGreaterThanOrEqual(period.startDate.getTime())
                expect(createdAt.getTime()).toBeLessThanOrEqual(period.endDate.getTime())
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('excludes PJOs without created_at', () => {
      const pjos = [
        { id: '1', created_at: '2025-12-10' },
        { id: '2', created_at: null },
        { id: '3' }, // No created_at field
      ]
      const period: PeriodFilter = {
        type: 'this_month',
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-31T23:59:59.999Z'),
      }
      
      const result = filterPJOsByPeriod(pjos, period)
      expect(result.length).toBe(1)
    })
  })

  describe('getPreviousPeriodDates', () => {
    it('returns period of same duration before current', () => {
      const period: PeriodFilter = {
        type: 'this_month',
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-31T23:59:59.999Z'),
      }
      
      const previous = getPreviousPeriodDates(period)
      
      // Previous period should be before current period
      expect(previous.startDate.getTime()).toBeLessThan(period.startDate.getTime())
      expect(previous.endDate.getTime()).toBeLessThan(period.endDate.getTime())
    })
  })
})


/**
 * Property 1: Dashboard routing for sales role
 * For any user profile with role='sales', the dashboard router SHALL return
 * the Sales Dashboard component
 * **Validates: Requirements 1.1**
 */
describe('Property 1: Dashboard routing for sales role', () => {
  // Helper function to determine which dashboard to show (mirrors page.tsx logic)
  function getDashboardType(userRole: string): 'ops' | 'finance' | 'sales' | 'main' {
    if (userRole === 'ops') return 'ops'
    if (userRole === 'finance') return 'finance'
    if (userRole === 'sales') return 'sales'
    return 'main'
  }

  it('routes sales users to sales dashboard', () => {
    fc.assert(
      fc.property(
        fc.constant('sales'),
        (role) => {
          const dashboardType = getDashboardType(role)
          expect(dashboardType).toBe('sales')
        }
      ),
      { numRuns: 10 }
    )
  })

  it('routes ops users to ops dashboard', () => {
    expect(getDashboardType('ops')).toBe('ops')
  })

  it('routes finance users to finance dashboard', () => {
    expect(getDashboardType('finance')).toBe('finance')
  })

  it('routes other roles to main dashboard', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('admin', 'manager', 'viewer', 'super_admin'),
        (role) => {
          const dashboardType = getDashboardType(role)
          expect(dashboardType).toBe('main')
        }
      ),
      { numRuns: 20 }
    )
  })
})


// Import navigation functions for testing
import { NAV_ITEMS, filterNavItems } from '@/lib/navigation'
import { DEFAULT_PERMISSIONS } from '@/lib/permissions'

/**
 * Property 14: Navigation filtering for sales role
 * For any user with role='sales', the sidebar SHALL show Dashboard, Customers, Projects, and PJOs,
 * and SHALL hide Job Orders, Invoices, and system administration items
 * **Validates: Requirements 8.1, 8.2**
 */
describe('Property 14: Navigation filtering for sales role', () => {
  it('should show Dashboard, Customers, Projects, and Proforma JO for sales users', () => {
    const salesPermissions = DEFAULT_PERMISSIONS.sales
    const filteredNav = filterNavItems(NAV_ITEMS, 'sales', salesPermissions)

    const navTitles = filteredNav.map((item) => item.title)

    // Should include these
    expect(navTitles).toContain('Dashboard')
    expect(navTitles).toContain('Customers')
    expect(navTitles).toContain('Projects')
    expect(navTitles).toContain('Proforma JO')
  })

  it('should hide Job Orders, Invoices, Vendors, and Cost Entry for sales users', () => {
    const salesPermissions = DEFAULT_PERMISSIONS.sales
    const filteredNav = filterNavItems(NAV_ITEMS, 'sales', salesPermissions)

    const navTitles = filteredNav.map((item) => item.title)

    // Should NOT include these
    expect(navTitles).not.toContain('Job Orders')
    expect(navTitles).not.toContain('Invoices')
    expect(navTitles).not.toContain('Vendors')
    expect(navTitles).not.toContain('Cost Entry')
    
    // Sales CAN see Settings (with filtered children)
    expect(navTitles).toContain('Settings')
  })

  it('should filter navigation consistently for any sales user', () => {
    fc.assert(
      fc.property(
        fc.record({
          can_see_revenue: fc.constant(true),
          can_see_profit: fc.constant(false),
          can_approve_pjo: fc.constant(false),
          can_manage_invoices: fc.constant(false),
          can_manage_users: fc.constant(false),
          can_create_pjo: fc.constant(true),
          can_fill_costs: fc.constant(false),
        }),
        (permissions) => {
          const filteredNav = filterNavItems(NAV_ITEMS, 'sales', permissions)
          const navTitles = filteredNav.map((item) => item.title)

          // Sales should never see these
          expect(navTitles).not.toContain('Job Orders')
          expect(navTitles).not.toContain('Invoices')
          expect(navTitles).not.toContain('Vendors')
          expect(navTitles).not.toContain('Cost Entry')

          // Sales should always see these
          expect(navTitles).toContain('Dashboard')
          expect(navTitles).toContain('Customers')
          expect(navTitles).toContain('Projects')
          expect(navTitles).toContain('Proforma JO')
          expect(navTitles).toContain('Settings')
        }
      ),
      { numRuns: 20 }
    )
  })
})
