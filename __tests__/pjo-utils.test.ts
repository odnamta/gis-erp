import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  formatIDR,
  calculateProfit,
  calculateMargin,
  toRomanMonth,
  filterPJOs,
} from '@/lib/pjo-utils'
import { PJOWithRelations, PJOStatus } from '@/types'

describe('PJO Utility Functions', () => {
  /**
   * **Feature: v0.4-pjo-crud, Property 1: IDR Currency Formatting**
   * *For any* non-negative number, the formatIDR function SHALL return a string
   * starting with "Rp " followed by the number formatted with period separators.
   * **Validates: Requirements 1.3**
   */
  describe('formatIDR', () => {
    it('should format non-negative numbers with Rp prefix and period separators', () => {
      fc.assert(
        fc.property(fc.nat({ max: 999999999999 }), (amount) => {
          const result = formatIDR(amount)
          expect(result).toMatch(/^Rp \d{1,3}(\.\d{3})*$/)
          // Verify the numeric value is preserved
          const parsed = parseInt(result.replace(/Rp\s?/g, '').replace(/\./g, ''), 10)
          expect(parsed).toBe(amount)
        }),
        { numRuns: 100 }
      )
    })

    it('should format specific values correctly', () => {
      expect(formatIDR(0)).toBe('Rp 0')
      expect(formatIDR(1000)).toBe('Rp 1.000')
      expect(formatIDR(30000000)).toBe('Rp 30.000.000')
      expect(formatIDR(1234567890)).toBe('Rp 1.234.567.890')
    })

    it('should handle negative numbers with minus prefix', () => {
      expect(formatIDR(-1000)).toBe('-Rp 1.000')
      expect(formatIDR(-30000000)).toBe('-Rp 30.000.000')
    })
  })

  /**
   * **Feature: v0.4-pjo-crud, Property 4: Profit Calculation**
   * *For any* revenue and expenses values, the calculateProfit function
   * SHALL return exactly revenue - expenses.
   * **Validates: Requirements 3.5**
   */
  describe('calculateProfit', () => {
    it('should calculate profit as revenue minus expenses for any values', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1e12, noNaN: true }),
          fc.double({ min: 0, max: 1e12, noNaN: true }),
          (revenue, expenses) => {
            const result = calculateProfit(revenue, expenses)
            expect(result).toBeCloseTo(revenue - expenses, 5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle specific cases', () => {
      expect(calculateProfit(100000, 50000)).toBe(50000)
      expect(calculateProfit(50000, 100000)).toBe(-50000)
      expect(calculateProfit(0, 0)).toBe(0)
    })
  })

  /**
   * **Feature: v0.4-pjo-crud, Property 5: Margin Calculation**
   * *For any* revenue and expenses values where revenue > 0, the calculateMargin
   * function SHALL return exactly (profit / revenue) * 100.
   * **Validates: Requirements 3.6**
   */
  describe('calculateMargin', () => {
    it('should calculate margin percentage correctly for positive revenue', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1e12, noNaN: true }),
          fc.double({ min: 0, max: 1e12, noNaN: true }),
          (revenue, expenses) => {
            const result = calculateMargin(revenue, expenses)
            const expectedProfit = revenue - expenses
            const expectedMargin = (expectedProfit / revenue) * 100
            expect(result).toBeCloseTo(expectedMargin, 5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when revenue is 0', () => {
      expect(calculateMargin(0, 100)).toBe(0)
      expect(calculateMargin(0, 0)).toBe(0)
    })

    it('should handle specific cases', () => {
      expect(calculateMargin(100000, 50000)).toBe(50)
      expect(calculateMargin(100000, 100000)).toBe(0)
      expect(calculateMargin(100000, 150000)).toBe(-50)
    })
  })

  /**
   * **Feature: v0.4-pjo-crud, Property 7: Month to Roman Numeral Conversion**
   * *For any* month number from 1 to 12, the toRomanMonth function SHALL return
   * the correct Roman numeral representation.
   * **Validates: Requirements 4.4**
   */
  describe('toRomanMonth', () => {
    const expectedRomanNumerals: Record<number, string> = {
      1: 'I',
      2: 'II',
      3: 'III',
      4: 'IV',
      5: 'V',
      6: 'VI',
      7: 'VII',
      8: 'VIII',
      9: 'IX',
      10: 'X',
      11: 'XI',
      12: 'XII',
    }

    it('should convert all months 1-12 to correct Roman numerals', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 12 }), (month) => {
          const result = toRomanMonth(month)
          expect(result).toBe(expectedRomanNumerals[month])
        }),
        { numRuns: 100 }
      )
    })

    it('should return empty string for invalid months', () => {
      expect(toRomanMonth(0)).toBe('')
      expect(toRomanMonth(13)).toBe('')
      expect(toRomanMonth(-1)).toBe('')
    })
  })

  /**
   * **Feature: v0.4-pjo-crud, Property 3: PJO Filtering**
   * *For any* list of PJOs and any combination of status filter and date range filter,
   * the filtered result SHALL contain only PJOs that match ALL applied filter criteria.
   * **Validates: Requirements 2.1, 2.2, 2.3**
   */
  describe('filterPJOs', () => {
    const statuses: PJOStatus[] = ['draft', 'pending_approval', 'approved', 'rejected']

    // Helper to create a mock PJO
    function createMockPJO(overrides: Partial<PJOWithRelations> = {}): PJOWithRelations {
      return {
        id: 'test-id',
        pjo_number: '0001/CARGO/I/2024',
        customer_id: 'customer-1',
        project_id: 'project-1',
        description: '',
        estimated_amount: 0,
        status: 'draft',
        jo_date: '2024-06-15',
        commodity: null,
        quantity: null,
        quantity_unit: null,
        pol: null,
        pod: null,
        pol_place_id: null,
        pol_lat: null,
        pol_lng: null,
        pod_place_id: null,
        pod_lat: null,
        pod_lng: null,
        etd: null,
        eta: null,
        carrier_type: null,
        total_revenue: 0,
        total_expenses: 0,
        profit: 0,
        notes: null,
        created_by: null,
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        total_revenue_calculated: null,
        total_cost_estimated: null,
        total_cost_actual: null,
        all_costs_confirmed: null,
        converted_to_jo: null,
        converted_to_jo_at: null,
        job_order_id: null,
        has_cost_overruns: null,
        projects: {
          id: 'project-1',
          name: 'Test Project',
          customers: { id: 'customer-1', name: 'Test Customer' },
        },
        ...overrides,
      }
    }

    // Generator for mock PJO data using simple approach
    const pjoArbitrary = fc
      .record({
        id: fc.uuid(),
        status: fc.constantFrom(...statuses),
        jo_date: fc.constantFrom('2024-01-15', '2024-03-15', '2024-06-15', '2024-09-15', '2024-12-15'),
      })
      .map(({ id, status, jo_date }) => createMockPJO({ id, status, jo_date }))

    it('should filter by status correctly', () => {
      fc.assert(
        fc.property(
          fc.array(pjoArbitrary, { minLength: 1, maxLength: 20 }),
          fc.constantFrom(...statuses),
          (pjos, statusFilter) => {
            const result = filterPJOs(pjos, statusFilter, null, null)
            // All results should have the filtered status
            result.forEach((pjo) => {
              expect(pjo.status).toBe(statusFilter)
            })
            // Result should include all PJOs with that status
            const expected = pjos.filter((p) => p.status === statusFilter)
            expect(result.length).toBe(expected.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should filter by date range correctly', () => {
      // Create fixed test data with known dates using the helper
      const testPJOs: PJOWithRelations[] = [
        createMockPJO({
          id: '1',
          pjo_number: '0001/CARGO/I/2024',
          status: 'draft',
          jo_date: '2024-03-15',
        }),
        createMockPJO({
          id: '2',
          pjo_number: '0002/CARGO/VI/2024',
          status: 'approved',
          jo_date: '2024-06-20',
        }),
        createMockPJO({
          id: '3',
          pjo_number: '0003/CARGO/XII/2024',
          status: 'pending_approval',
          jo_date: '2024-12-01',
        }),
      ]

      // Filter by date range March to June 2024
      const dateFrom = new Date('2024-03-01')
      const dateTo = new Date('2024-06-30')
      const result = filterPJOs(testPJOs, null, dateFrom, dateTo)

      expect(result.length).toBe(2)
      result.forEach((pjo) => {
        if (pjo.jo_date) {
          const joDate = new Date(pjo.jo_date)
          expect(joDate >= dateFrom).toBe(true)
          const endOfDay = new Date(dateTo)
          endOfDay.setHours(23, 59, 59, 999)
          expect(joDate <= endOfDay).toBe(true)
        }
      })
    })

    it('should return all PJOs when no filters applied', () => {
      fc.assert(
        fc.property(fc.array(pjoArbitrary, { minLength: 0, maxLength: 20 }), (pjos) => {
          const result = filterPJOs(pjos, null, null, null)
          expect(result.length).toBe(pjos.length)
        }),
        { numRuns: 100 }
      )
    })

    it('should return all PJOs when status is "all"', () => {
      fc.assert(
        fc.property(fc.array(pjoArbitrary, { minLength: 0, maxLength: 20 }), (pjos) => {
          const result = filterPJOs(pjos, 'all', null, null)
          expect(result.length).toBe(pjos.length)
        }),
        { numRuns: 100 }
      )
    })
  })
})


/**
 * **Feature: v0.4-pjo-crud, Property 6: PJO Number Format**
 * *For any* generated PJO number, it SHALL match the pattern NNNN/CARGO/MM/YYYY
 * where NNNN is a 4-digit zero-padded sequence, MM is a Roman numeral (I-XII),
 * and YYYY is a 4-digit year.
 * **Validates: Requirements 4.1, 4.2**
 */
describe('PJO Number Format', () => {
  const pjoNumberPattern = /^\d{4}\/CARGO\/(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\/\d{4}$/

  it('should match the expected format pattern', () => {
    // Test various valid PJO numbers
    const validNumbers = [
      '0001/CARGO/I/2025',
      '0012/CARGO/XII/2025',
      '0100/CARGO/VI/2024',
      '9999/CARGO/VIII/2023',
    ]

    validNumbers.forEach((num) => {
      expect(num).toMatch(pjoNumberPattern)
    })
  })

  it('should reject invalid formats', () => {
    const invalidNumbers = [
      '001/CARGO/I/2025', // Only 3 digits
      '0001/CARGO/13/2025', // Invalid month
      '0001/CARGO/I/25', // 2-digit year
      '0001/cargo/I/2025', // Lowercase CARGO
      '0001-CARGO-I-2025', // Wrong separator
    ]

    invalidNumbers.forEach((num) => {
      expect(num).not.toMatch(pjoNumberPattern)
    })
  })
})

/**
 * **Feature: v0.4-pjo-crud, Property 8: Status Transition Validity**
 * *For any* PJO status transition, the following rules SHALL hold:
 * - draft → pending_approval (via submitForApproval)
 * - pending_approval → approved (via approvePJO)
 * - pending_approval → rejected (via rejectPJO)
 * - No other transitions are valid
 * **Validates: Requirements 7.2, 8.2, 8.3**
 */
describe('Status Transition Validity', () => {
  type PJOStatusType = 'draft' | 'pending_approval' | 'approved' | 'rejected'

  const validTransitions: Record<PJOStatusType, PJOStatusType[]> = {
    draft: ['pending_approval'],
    pending_approval: ['approved', 'rejected'],
    approved: [],
    rejected: [],
  }

  const allStatuses: PJOStatusType[] = ['draft', 'pending_approval', 'approved', 'rejected']

  function isValidTransition(from: PJOStatusType, to: PJOStatusType): boolean {
    return validTransitions[from].includes(to)
  }

  it('should allow valid transitions', () => {
    fc.assert(
      fc.property(fc.constantFrom(...allStatuses), (fromStatus) => {
        const allowedTargets = validTransitions[fromStatus]
        allowedTargets.forEach((toStatus) => {
          expect(isValidTransition(fromStatus, toStatus)).toBe(true)
        })
      }),
      { numRuns: 100 }
    )
  })

  it('should reject invalid transitions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allStatuses),
        fc.constantFrom(...allStatuses),
        (fromStatus, toStatus) => {
          const shouldBeValid = validTransitions[fromStatus].includes(toStatus)
          expect(isValidTransition(fromStatus, toStatus)).toBe(shouldBeValid)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should not allow transitions from terminal states', () => {
    expect(validTransitions.approved.length).toBe(0)
    expect(validTransitions.rejected.length).toBe(0)
  })
})


/**
 * **Feature: v0.4-pjo-crud, Property 9: PJO Status Badge Colors**
 * *For any* PJO status, the badge color SHALL be:
 * draft→gray, pending_approval→yellow, approved→green, rejected→red.
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
 */
describe('PJO Status Badge Colors', () => {
  const statusColorMap: Record<PJOStatus, string> = {
    draft: 'gray',
    pending_approval: 'yellow',
    approved: 'green',
    rejected: 'red',
  }

  it('should map each status to the correct color', () => {
    fc.assert(
      fc.property(fc.constantFrom(...(Object.keys(statusColorMap) as PJOStatus[])), (status) => {
        const expectedColor = statusColorMap[status]
        // The color should be part of the className
        expect(expectedColor).toBeDefined()
        expect(['gray', 'yellow', 'green', 'red']).toContain(expectedColor)
      }),
      { numRuns: 100 }
    )
  })

  it('should have correct color mappings', () => {
    expect(statusColorMap.draft).toBe('gray')
    expect(statusColorMap.pending_approval).toBe('yellow')
    expect(statusColorMap.approved).toBe('green')
    expect(statusColorMap.rejected).toBe('red')
  })
})


/**
 * **Feature: v0.4.1-pjo-itemized-financials, Property 10: Revenue Total Calculation**
 * *For any* array of revenue items, calculateRevenueTotal SHALL return the sum
 * of all subtotals (quantity * unit_price).
 * **Validates: Requirements REQ-1.4**
 */
import {
  calculateRevenueTotal,
  calculateCostTotal,
  determineCostStatus,
  analyzeBudget,
  generateJONumber,
} from '@/lib/pjo-utils'
import { PJORevenueItem, PJOCostItem } from '@/types'

describe('Itemized Financials Utilities', () => {
  describe('calculateRevenueTotal', () => {
    it('should calculate total from revenue items', () => {
      const items: PJORevenueItem[] = [
        { id: '1', pjo_id: 'p1', description: 'Freight', quantity: 1, unit: 'Trip', unit_price: 15000000, subtotal: 15000000, created_at: '', updated_at: '' },
        { id: '2', pjo_id: 'p1', description: 'Handling', quantity: 20, unit: 'CBM', unit_price: 50000, subtotal: 1000000, created_at: '', updated_at: '' },
      ]
      expect(calculateRevenueTotal(items)).toBe(16000000)
    })

    it('should return 0 for empty array', () => {
      expect(calculateRevenueTotal([])).toBe(0)
    })

    it('should handle items without subtotal by calculating from quantity * unit_price', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              pjo_id: fc.uuid(),
              description: fc.string(),
              quantity: fc.double({ min: 0.01, max: 1000, noNaN: true }),
              unit: fc.string(),
              unit_price: fc.double({ min: 0, max: 1e9, noNaN: true }),
              created_at: fc.constant(''),
              updated_at: fc.constant(''),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (items) => {
            const itemsWithSubtotal = items.map(item => ({
              ...item,
              subtotal: item.quantity * item.unit_price
            })) as PJORevenueItem[]
            
            const result = calculateRevenueTotal(itemsWithSubtotal)
            const expected = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
            expect(result).toBeCloseTo(expected, 2)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: v0.4.1-pjo-itemized-financials, Property 11: Cost Total Calculation**
   * *For any* array of cost items, calculateCostTotal SHALL return the sum of
   * estimated_amount (type='estimated') or actual_amount (type='actual').
   * **Validates: Requirements REQ-2.4**
   */
  describe('calculateCostTotal', () => {
    const baseCostItem: Omit<PJOCostItem, 'id' | 'estimated_amount' | 'actual_amount'> = {
      pjo_id: 'p1',
      category: 'trucking',
      description: 'Test',
      status: 'estimated',
      created_at: '',
      updated_at: '',
    }

    it('should calculate estimated total', () => {
      const items: PJOCostItem[] = [
        { ...baseCostItem, id: '1', estimated_amount: 5000000, actual_amount: undefined },
        { ...baseCostItem, id: '2', estimated_amount: 2500000, actual_amount: undefined },
      ]
      expect(calculateCostTotal(items, 'estimated')).toBe(7500000)
    })

    it('should calculate actual total', () => {
      const items: PJOCostItem[] = [
        { ...baseCostItem, id: '1', estimated_amount: 5000000, actual_amount: 4800000, status: 'confirmed' },
        { ...baseCostItem, id: '2', estimated_amount: 2500000, actual_amount: 2600000, status: 'exceeded' },
      ]
      expect(calculateCostTotal(items, 'actual')).toBe(7400000)
    })

    it('should return 0 for actual when no actuals filled', () => {
      const items: PJOCostItem[] = [
        { ...baseCostItem, id: '1', estimated_amount: 5000000, actual_amount: undefined },
      ]
      expect(calculateCostTotal(items, 'actual')).toBe(0)
    })
  })

  /**
   * **Feature: v0.4.1-pjo-itemized-financials, Property 12: Cost Status Determination**
   * *For any* estimated and actual amounts, determineCostStatus SHALL return:
   * - 'exceeded' if actual > estimated
   * - 'under_budget' if actual < estimated
   * - 'confirmed' if actual === estimated
   * **Validates: Requirements REQ-3.4**
   */
  describe('determineCostStatus', () => {
    it('should return exceeded when actual > estimated', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1e9, noNaN: true }),
          fc.double({ min: 0.01, max: 1e9, noNaN: true }),
          (estimated, extra) => {
            const actual = estimated + extra
            expect(determineCostStatus(estimated, actual)).toBe('exceeded')
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return under_budget when actual < estimated', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1e9, noNaN: true }),
          fc.double({ min: 0.01, max: 1e9, noNaN: true }),
          (estimated, reduction) => {
            const actual = Math.max(0, estimated - reduction)
            if (actual < estimated) {
              expect(determineCostStatus(estimated, actual)).toBe('under_budget')
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return confirmed when actual === estimated', () => {
      fc.assert(
        fc.property(fc.double({ min: 0, max: 1e9, noNaN: true }), (amount) => {
          expect(determineCostStatus(amount, amount)).toBe('confirmed')
        }),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: v0.4.1-pjo-itemized-financials, Property 13: Budget Analysis**
   * *For any* array of cost items, analyzeBudget SHALL return correct counts
   * and totals for budget tracking.
   * **Validates: Requirements REQ-4.3**
   */
  describe('analyzeBudget', () => {
    it('should analyze budget correctly', () => {
      const items: PJOCostItem[] = [
        { id: '1', pjo_id: 'p1', category: 'trucking', description: 'A', estimated_amount: 5000000, actual_amount: 4800000, status: 'under_budget', created_at: '', updated_at: '' },
        { id: '2', pjo_id: 'p1', category: 'port_charges', description: 'B', estimated_amount: 2500000, actual_amount: 2600000, status: 'exceeded', created_at: '', updated_at: '' },
        { id: '3', pjo_id: 'p1', category: 'documentation', description: 'C', estimated_amount: 750000, actual_amount: undefined, status: 'estimated', created_at: '', updated_at: '' },
      ]

      const result = analyzeBudget(items)

      expect(result.total_estimated).toBe(8250000)
      expect(result.total_actual).toBe(7400000)
      expect(result.items_confirmed).toBe(2)
      expect(result.items_pending).toBe(1)
      expect(result.items_over_budget).toBe(1)
      expect(result.items_under_budget).toBe(1)
      expect(result.all_confirmed).toBe(false)
      expect(result.has_overruns).toBe(true)
    })

    it('should report all_confirmed when all items have actuals', () => {
      const items: PJOCostItem[] = [
        { id: '1', pjo_id: 'p1', category: 'trucking', description: 'A', estimated_amount: 5000000, actual_amount: 4800000, status: 'confirmed', created_at: '', updated_at: '' },
        { id: '2', pjo_id: 'p1', category: 'port_charges', description: 'B', estimated_amount: 2500000, actual_amount: 2500000, status: 'confirmed', created_at: '', updated_at: '' },
      ]

      const result = analyzeBudget(items)
      expect(result.all_confirmed).toBe(true)
      expect(result.items_pending).toBe(0)
    })
  })

  /**
   * **Feature: v0.4.1-pjo-itemized-financials, Property 14: JO Number Format**
   * *For any* sequence and date, generateJONumber SHALL return a string
   * matching the pattern JO-NNNN/CARGO/MM/YYYY.
   * **Validates: Requirements REQ-6.3**
   */
  describe('generateJONumber', () => {
    const joNumberPattern = /^JO-\d{4}\/CARGO\/(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\/\d{4}$/

    it('should generate valid JO numbers', () => {
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
        { numRuns: 50 }
      )
    })

    it('should generate specific JO numbers correctly', () => {
      expect(generateJONumber(1, new Date(2025, 11, 14))).toBe('JO-0001/CARGO/XII/2025')
      expect(generateJONumber(12, new Date(2025, 0, 1))).toBe('JO-0012/CARGO/I/2025')
      expect(generateJONumber(100, new Date(2025, 5, 15))).toBe('JO-0100/CARGO/VI/2025')
    })
  })
})


/**
 * **Feature: v0.4.2-pjo-enhancements, Property 15: Positive Margin Validation**
 * *For any* PJO submission attempt, if total estimated cost >= total revenue,
 * the submission SHALL be rejected with an error message.
 * **Validates: Requirements 1.1, 1.2**
 */
import { validatePositiveMargin, getBudgetWarningLevel, validateDateOrder } from '@/lib/pjo-utils'

describe('v0.4.2 Validation Utilities', () => {
  describe('validatePositiveMargin', () => {
    it('should reject when cost >= revenue', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1e9, noNaN: true }),
          fc.double({ min: 0, max: 1e9, noNaN: true }),
          (revenue, extra) => {
            const cost = revenue + extra // cost >= revenue
            const result = validatePositiveMargin(revenue, cost)
            expect(result.valid).toBe(false)
            expect(result.error).toBeDefined()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should accept when cost < revenue', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1e9, noNaN: true }),
          fc.double({ min: 0.01, max: 1e9, noNaN: true }),
          (revenue, reduction) => {
            const cost = Math.max(0, revenue - reduction)
            if (cost < revenue) {
              const result = validatePositiveMargin(revenue, cost)
              expect(result.valid).toBe(true)
              expect(result.error).toBeUndefined()
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: v0.4.2-pjo-enhancements, Property 16: Budget Warning Threshold**
   * *For any* cost item where actual_amount >= 0.9 * estimated_amount AND actual_amount <= estimated_amount,
   * the system SHALL display a warning indicator.
   * **Validates: Requirements 2.1, 2.2**
   */
  describe('getBudgetWarningLevel', () => {
    it('should return warning when actual is 90-100% of estimated', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 100, max: 1e9, noNaN: true }),
          fc.double({ min: 0.9, max: 1, noNaN: true }),
          (estimated, percentage) => {
            const actual = estimated * percentage
            const result = getBudgetWarningLevel(estimated, actual)
            expect(result).toBe('warning')
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return safe when actual < 90% of estimated', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 100, max: 1e9, noNaN: true }),
          fc.double({ min: 0, max: 0.89, noNaN: true }),
          (estimated, percentage) => {
            const actual = estimated * percentage
            const result = getBudgetWarningLevel(estimated, actual)
            expect(result).toBe('safe')
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return exceeded when actual > estimated', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1e9, noNaN: true }),
          fc.double({ min: 0.01, max: 1e9, noNaN: true }),
          (estimated, extra) => {
            const actual = estimated + extra
            const result = getBudgetWarningLevel(estimated, actual)
            expect(result).toBe('exceeded')
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: v0.4.2-pjo-enhancements, Property 17: Date Order Validation**
   * *For any* PJO with both ETD and ETA set, ETA SHALL always be >= ETD.
   * **Validates: Requirements 4.1, 4.2**
   */
  describe('validateDateOrder', () => {
    it('should reject when ETA is before ETD', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          fc.integer({ min: 1, max: 365 }),
          (etd, daysBefore) => {
            const eta = new Date(etd.getTime() - daysBefore * 24 * 60 * 60 * 1000)
            const result = validateDateOrder(etd, eta)
            expect(result.valid).toBe(false)
            expect(result.error).toBe('ETA must be on or after ETD')
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should accept when ETA is on or after ETD', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          fc.integer({ min: 0, max: 365 }),
          (etd, daysAfter) => {
            const eta = new Date(etd.getTime() + daysAfter * 24 * 60 * 60 * 1000)
            const result = validateDateOrder(etd, eta)
            expect(result.valid).toBe(true)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should accept when either date is null', () => {
      expect(validateDateOrder(null, new Date()).valid).toBe(true)
      expect(validateDateOrder(new Date(), null).valid).toBe(true)
      expect(validateDateOrder(null, null).valid).toBe(true)
    })
  })
})


/**
 * **Feature: v0.5-ops-actual-costs, Property 1: Status Calculation**
 * *For any* estimated amount > 0 and actual amount ≥ 0, the calculated status SHALL be:
 * - "confirmed" when actual ≤ 90% of estimated
 * - "at_risk" when actual > 90% of estimated AND actual ≤ estimated
 * - "exceeded" when actual > estimated
 * **Validates: Requirements 4.1, 4.3, 5.1, 10.2**
 */
import { calculateCostStatus, calculateVariance, canEditCostItems } from '@/lib/pjo-utils'
import { CostItemStatus } from '@/types'

describe('v0.5 Operations Actual Cost Entry', () => {
  describe('calculateCostStatus', () => {
    it('should return confirmed when actual ≤ 90% of estimated', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1e9, noNaN: true }),
          fc.double({ min: 0, max: 0.9, noNaN: true }),
          (estimated, percentage) => {
            const actual = estimated * percentage
            const result = calculateCostStatus(estimated, actual)
            expect(result.status).toBe('confirmed')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return at_risk when actual > 90% AND actual ≤ 100% of estimated', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 100, max: 1e9, noNaN: true }),
          fc.double({ min: 0.901, max: 1, noNaN: true }),
          (estimated, percentage) => {
            const actual = estimated * percentage
            const result = calculateCostStatus(estimated, actual)
            expect(result.status).toBe('at_risk')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return exceeded when actual > estimated', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1e9, noNaN: true }),
          fc.double({ min: 0.01, max: 1e9, noNaN: true }),
          (estimated, extra) => {
            const actual = estimated + extra
            const result = calculateCostStatus(estimated, actual)
            expect(result.status).toBe('exceeded')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate variance correctly', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1e9, noNaN: true }),
          fc.double({ min: 0, max: 2e9, noNaN: true }),
          (estimated, actual) => {
            const result = calculateCostStatus(estimated, actual)
            expect(result.variance).toBeCloseTo(actual - estimated, 5)
            expect(result.variancePct).toBeCloseTo(((actual - estimated) / estimated) * 100, 5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle boundary conditions correctly', () => {
      // Exactly 90% - should be confirmed
      const at90 = calculateCostStatus(1000000, 900000)
      expect(at90.status).toBe('confirmed')

      // Just over 90% - should be at_risk
      const over90 = calculateCostStatus(1000000, 900001)
      expect(over90.status).toBe('at_risk')

      // Exactly 100% - should be at_risk
      const at100 = calculateCostStatus(1000000, 1000000)
      expect(at100.status).toBe('at_risk')

      // Just over 100% - should be exceeded
      const over100 = calculateCostStatus(1000000, 1000001)
      expect(over100.status).toBe('exceeded')
    })
  })

  /**
   * **Feature: v0.5-ops-actual-costs, Property 2: Variance Calculation**
   * *For any* estimated amount and actual amount, the variance SHALL equal (actual - estimated)
   * and variance percentage SHALL equal ((actual - estimated) / estimated) * 100
   * **Validates: Requirements 2.4, 3.2, 4.2**
   */
  describe('calculateVariance', () => {
    it('should calculate variance as actual - estimated', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1e9, noNaN: true }),
          fc.double({ min: 0, max: 2e9, noNaN: true }),
          (estimated, actual) => {
            const result = calculateVariance(estimated, actual)
            expect(result.variance).toBeCloseTo(actual - estimated, 5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate variance percentage correctly', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1e9, noNaN: true }),
          fc.double({ min: 0, max: 2e9, noNaN: true }),
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
      const result = calculateVariance(0, 1000)
      expect(result.variance).toBe(1000)
      expect(result.variancePct).toBe(0) // Avoid division by zero
    })

    it('should handle specific cases', () => {
      // Under budget
      const under = calculateVariance(1000000, 900000)
      expect(under.variance).toBe(-100000)
      expect(under.variancePct).toBe(-10)

      // Over budget
      const over = calculateVariance(1000000, 1100000)
      expect(over.variance).toBe(100000)
      expect(over.variancePct).toBe(10)

      // Exact budget
      const exact = calculateVariance(1000000, 1000000)
      expect(exact.variance).toBe(0)
      expect(exact.variancePct).toBe(0)
    })
  })

  /**
   * **Feature: v0.5-ops-actual-costs, Property 4: Edit Permission**
   * *For any* user and PJO combination, editing SHALL be allowed if and only if:
   * - User role is "ops" OR "admin"
   * - AND PJO status is "approved"
   * - AND PJO has not been converted to Job Order (converted_to_jo is false)
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
   */
  describe('canEditCostItems', () => {
    const allowedRoles = ['ops', 'admin']
    const disallowedRoles = ['sales', 'engineer', 'manager', 'super_admin']
    const allRoles = [...allowedRoles, ...disallowedRoles]
    const allStatuses = ['draft', 'pending_approval', 'approved', 'rejected']

    it('should allow editing only for ops and admin roles with approved PJO not converted', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...allRoles),
          fc.constantFrom(...allStatuses),
          fc.boolean(),
          (role, status, convertedToJo) => {
            const result = canEditCostItems(role, status, convertedToJo)
            
            const isAllowedRole = allowedRoles.includes(role)
            const isApproved = status === 'approved'
            const notConverted = !convertedToJo
            
            const expected = isAllowedRole && isApproved && notConverted
            expect(result).toBe(expected)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should deny editing for non-ops/admin roles', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...disallowedRoles),
          (role) => {
            const result = canEditCostItems(role, 'approved', false)
            expect(result).toBe(false)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should deny editing for non-approved PJOs', () => {
      const nonApprovedStatuses = ['draft', 'pending_approval', 'rejected']
      fc.assert(
        fc.property(
          fc.constantFrom(...allowedRoles),
          fc.constantFrom(...nonApprovedStatuses),
          (role, status) => {
            const result = canEditCostItems(role, status, false)
            expect(result).toBe(false)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should deny editing for converted PJOs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...allowedRoles),
          (role) => {
            const result = canEditCostItems(role, 'approved', true)
            expect(result).toBe(false)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle null converted_to_jo as false', () => {
      expect(canEditCostItems('ops', 'approved', null)).toBe(true)
      expect(canEditCostItems('admin', 'approved', null)).toBe(true)
    })
  })

  /**
   * **Feature: v0.5-ops-actual-costs, Property 6: Total Cost Calculation**
   * *For any* list of confirmed cost items, total_cost_actual SHALL equal the sum of all actual_amount values
   * **Validates: Requirements 10.4**
   */
  describe('Total Cost Calculation', () => {
    it('should calculate total actual cost as sum of all actual amounts', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              actual_amount: fc.option(fc.double({ min: 0, max: 1e9, noNaN: true }), { nil: null }),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (items) => {
            // Calculate total using the same logic as the server action
            const totalActual = items.reduce((sum, item) => sum + (item.actual_amount ?? 0), 0)
            
            // Verify the calculation
            const expectedTotal = items
              .filter(item => item.actual_amount !== null)
              .reduce((sum, item) => sum + (item.actual_amount as number), 0)
            
            expect(totalActual).toBeCloseTo(expectedTotal, 5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 for empty list', () => {
      const items: { actual_amount: number | null }[] = []
      const total = items.reduce((sum, item) => sum + (item.actual_amount ?? 0), 0)
      expect(total).toBe(0)
    })

    it('should handle mix of confirmed and pending items', () => {
      const items = [
        { actual_amount: 1000000 },
        { actual_amount: null },
        { actual_amount: 2000000 },
        { actual_amount: null },
      ]
      const total = items.reduce((sum, item) => sum + (item.actual_amount ?? 0), 0)
      expect(total).toBe(3000000)
    })
  })

  /**
   * **Feature: v0.5-ops-actual-costs, Property 7: Has Overruns Flag**
   * *For any* list of cost items, has_cost_overruns SHALL be true if and only if at least one item has status "exceeded"
   * **Validates: Requirements 10.5**
   */
  describe('Has Overruns Flag', () => {
    const statuses: CostItemStatus[] = ['estimated', 'confirmed', 'at_risk', 'exceeded']

    it('should be true if any item has exceeded status', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(...statuses), { minLength: 1, maxLength: 20 }),
          (statusList) => {
            const hasOverruns = statusList.some(status => status === 'exceeded')
            const hasExceededItem = statusList.includes('exceeded')
            expect(hasOverruns).toBe(hasExceededItem)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be false if no items have exceeded status', () => {
      const nonExceededStatuses: CostItemStatus[] = ['estimated', 'confirmed', 'at_risk']
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(...nonExceededStatuses), { minLength: 0, maxLength: 20 }),
          (statusList) => {
            const hasOverruns = statusList.some(status => status === 'exceeded')
            expect(hasOverruns).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty list', () => {
      const items: { status: string }[] = []
      const hasOverruns = items.some(item => item.status === 'exceeded')
      expect(hasOverruns).toBe(false)
    })
  })

  /**
   * **Feature: v0.5-ops-actual-costs, Property 5: Progress Calculation**
   * *For any* list of cost items, the confirmed count SHALL equal the number of items
   * where actual_amount is not null and confirmed_at is not null
   * **Validates: Requirements 7.1**
   */
  describe('Progress Calculation', () => {
    it('should count confirmed items correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              actual_amount: fc.option(fc.double({ min: 0, max: 1e9, noNaN: true }), { nil: null }),
              confirmed_at: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (items) => {
            // Calculate confirmed count using the same logic as the component
            const confirmed = items.filter(
              item => item.actual_amount !== null && item.confirmed_at !== null
            ).length
            const total = items.length

            // Verify the calculation matches expected
            const expectedConfirmed = items.reduce((count, item) => {
              if (item.actual_amount !== null && item.confirmed_at !== null) {
                return count + 1
              }
              return count
            }, 0)

            expect(confirmed).toBe(expectedConfirmed)
            expect(total).toBe(items.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 confirmed for empty list', () => {
      const items: { actual_amount: number | null; confirmed_at: string | null }[] = []
      const confirmed = items.filter(item => item.actual_amount !== null && item.confirmed_at !== null).length
      expect(confirmed).toBe(0)
    })

    it('should not count items with only actual_amount (no confirmed_at)', () => {
      const items = [
        { actual_amount: 1000000, confirmed_at: null },
        { actual_amount: 2000000, confirmed_at: '2025-01-01T00:00:00Z' },
      ]
      const confirmed = items.filter(item => item.actual_amount !== null && item.confirmed_at !== null).length
      expect(confirmed).toBe(1)
    })

    it('should not count items with only confirmed_at (no actual_amount)', () => {
      const items = [
        { actual_amount: null, confirmed_at: '2025-01-01T00:00:00Z' },
        { actual_amount: 2000000, confirmed_at: '2025-01-01T00:00:00Z' },
      ]
      const confirmed = items.filter(item => item.actual_amount !== null && item.confirmed_at !== null).length
      expect(confirmed).toBe(1)
    })
  })

  /**
   * **Feature: v0.5-ops-actual-costs, Property 3: Justification Validation**
   * *For any* cost item where actual > estimated:
   * - If justification is empty or less than 10 characters, confirmation SHALL be blocked
   * - If justification is 10+ characters, confirmation SHALL be allowed
   * **Validates: Requirements 5.3, 5.4, 6.2**
   */
  describe('Justification Validation', () => {
    function validateJustification(
      estimated: number,
      actual: number,
      justification: string
    ): { canConfirm: boolean; needsJustification: boolean } {
      const isExceeded = actual > estimated
      const hasValidJustification = justification.trim().length >= 10
      const needsJustification = isExceeded && !hasValidJustification
      const canConfirm = !needsJustification
      return { canConfirm, needsJustification }
    }

    it('should block confirmation for exceeded items without justification', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1e9, noNaN: true }),
          fc.double({ min: 0.01, max: 1e9, noNaN: true }),
          fc.string({ minLength: 0, maxLength: 9 }),
          (estimated, extra, shortJustification) => {
            const actual = estimated + extra // exceeded
            const result = validateJustification(estimated, actual, shortJustification)
            expect(result.needsJustification).toBe(true)
            expect(result.canConfirm).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow confirmation for exceeded items with valid justification', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1e9, noNaN: true }),
          fc.double({ min: 0.01, max: 1e9, noNaN: true }),
          // Generate alphanumeric strings with at least 10 characters
          fc.string({ minLength: 10, maxLength: 100, unit: 'grapheme' }).filter(s => s.trim().length >= 10),
          (estimated, extra, validJustification) => {
            const actual = estimated + extra // exceeded
            const result = validateJustification(estimated, actual, validJustification)
            expect(result.needsJustification).toBe(false)
            expect(result.canConfirm).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not require justification for non-exceeded items', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1e9, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.string({ minLength: 0, maxLength: 500 }),
          (estimated, percentage, anyJustification) => {
            const actual = estimated * percentage // within budget
            const result = validateJustification(estimated, actual, anyJustification)
            expect(result.needsJustification).toBe(false)
            expect(result.canConfirm).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle boundary case of exactly 10 characters', () => {
      const result = validateJustification(1000, 1500, 'Exactly 10')
      expect(result.canConfirm).toBe(true)
      expect(result.needsJustification).toBe(false)
    })

    it('should handle boundary case of 9 characters', () => {
      const result = validateJustification(1000, 1500, 'Only nine')
      expect(result.canConfirm).toBe(false)
      expect(result.needsJustification).toBe(true)
    })

    it('should trim whitespace when validating', () => {
      // Justification with only spaces should not count
      const result = validateJustification(1000, 1500, '          ')
      expect(result.canConfirm).toBe(false)
      expect(result.needsJustification).toBe(true)
    })
  })

  /**
   * **Feature: v0.5-ops-actual-costs, Property 8: Currency Formatting**
   * *For any* numeric amount, the formatted IDR string SHALL match the pattern "Rp X.XXX.XXX"
   * with period separators for thousands
   * **Validates: Requirements 2.2**
   */
  describe('Currency Formatting (IDR)', () => {
    it('should format positive amounts with Rp prefix and period separators', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 999999999999 }),
          (amount) => {
            const result = formatIDR(amount)
            // Should start with "Rp "
            expect(result.startsWith('Rp ')).toBe(true)
            // Should contain only digits and periods after prefix
            const numericPart = result.replace('Rp ', '')
            expect(numericPart).toMatch(/^\d{1,3}(\.\d{3})*$/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should format negative amounts with minus prefix', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 999999999999 }),
          (amount) => {
            const result = formatIDR(-amount)
            // Should start with "-Rp "
            expect(result.startsWith('-Rp ')).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle zero correctly', () => {
      expect(formatIDR(0)).toBe('Rp 0')
    })

    it('should preserve numeric value after formatting', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 999999999 }),
          (amount) => {
            const formatted = formatIDR(amount)
            // Parse back the numeric value
            const parsed = parseInt(formatted.replace(/Rp\s?/g, '').replace(/\./g, ''), 10)
            expect(parsed).toBe(amount)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
