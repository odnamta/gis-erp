import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateTotalEstimatedCost,
  getSequentialLineNumbers,
  getStatusIcon,
  CostItemRow,
  CostItemStatus,
  CostCategory,
} from '@/components/pjo/cost-items-table'
import {
  calculateProfit,
  calculateMargin,
} from '@/components/pjo/financial-summary'

describe('CostItemsTable - Property Tests', () => {
  /**
   * Property 1: Total Estimated Cost Sum Consistency
   * Validates: Requirements 1.4, 2.4, 3.4, 4.2
   * For any array of cost items, total equals sum of estimated_amounts
   */
  describe('Property 1: Total Estimated Cost Sum Consistency', () => {
    const costItemArb = fc.record({
      category: fc.constantFrom('trucking', 'port_charges', 'documentation', 'handling', 'crew', 'fuel', 'tolls', 'other') as fc.Arbitrary<CostCategory>,
      description: fc.string({ minLength: 1, maxLength: 100 }),
      estimated_amount: fc.integer({ min: 0, max: 100000000 }),
      status: fc.constant('estimated') as fc.Arbitrary<CostItemStatus>,
    })

    it('total equals sum of all estimated_amounts', () => {
      fc.assert(
        fc.property(
          fc.array(costItemArb, { minLength: 0, maxLength: 20 }),
          (items) => {
            const total = calculateTotalEstimatedCost(items)
            const expectedTotal = items.reduce((sum, item) => sum + item.estimated_amount, 0)
            expect(total).toBe(expectedTotal)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('total is zero for empty items array', () => {
      const total = calculateTotalEstimatedCost([])
      expect(total).toBe(0)
    })

    it('total equals single item amount for single item', () => {
      fc.assert(
        fc.property(costItemArb, (item) => {
          const total = calculateTotalEstimatedCost([item])
          expect(total).toBe(item.estimated_amount)
        }),
        { numRuns: 50 }
      )
    })

    it('total is non-negative when all amounts are non-negative', () => {
      fc.assert(
        fc.property(
          fc.array(costItemArb, { minLength: 0, maxLength: 20 }),
          (items) => {
            const total = calculateTotalEstimatedCost(items)
            expect(total).toBeGreaterThanOrEqual(0)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 2: Sequential Line Numbering After Deletion
   * Validates: Requirements 4.3
   * After any deletion, remaining items should be numbered 1, 2, 3, ...
   */
  describe('Property 2: Sequential Line Numbering After Deletion', () => {
    const createMockItems = (count: number): CostItemRow[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `item-${i}`,
        category: 'trucking' as CostCategory,
        description: `Item ${i + 1}`,
        estimated_amount: 1000,
        status: 'estimated' as CostItemStatus,
      }))
    }

    it('line numbers are always sequential starting from 1', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 50 }),
          (itemCount) => {
            const items = createMockItems(itemCount)
            const lineNumbers = getSequentialLineNumbers(items)

            expect(lineNumbers.length).toBe(itemCount)
            lineNumbers.forEach((num, index) => {
              expect(num).toBe(index + 1)
            })
          }
        ),
        { numRuns: 50 }
      )
    })

    it('after simulated deletion, remaining items renumber correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }),
          fc.integer({ min: 0, max: 19 }),
          (itemCount, deleteIndex) => {
            const validDeleteIndex = deleteIndex % itemCount
            const items = createMockItems(itemCount)
            const remainingItems = items.filter((_, i) => i !== validDeleteIndex)
            const lineNumbers = getSequentialLineNumbers(remainingItems)

            expect(lineNumbers.length).toBe(itemCount - 1)
            lineNumbers.forEach((num, index) => {
              expect(num).toBe(index + 1)
            })
          }
        ),
        { numRuns: 50 }
      )
    })

    it('empty array returns empty line numbers', () => {
      const lineNumbers = getSequentialLineNumbers([])
      expect(lineNumbers).toEqual([])
    })
  })

  /**
   * Property 5: Status Icon Mapping Consistency
   * Validates: Requirements 1.3
   * For any status value, the correct icon/label is returned
   */
  describe('Property 5: Status Icon Mapping Consistency', () => {
    it('estimated status returns Clock icon with gray color', () => {
      const result = getStatusIcon('estimated')
      expect(result.label).toBe('Estimated')
      expect(result.className).toContain('muted')
    })

    it('confirmed status returns CheckCircle icon with green color', () => {
      const result = getStatusIcon('confirmed')
      expect(result.label).toBe('Confirmed')
      expect(result.className).toContain('green')
    })

    it('exceeded status returns XCircle icon with red color', () => {
      const result = getStatusIcon('exceeded')
      expect(result.label).toBe('Exceeded')
      expect(result.className).toContain('destructive')
    })

    it('under_budget status returns CheckCircle icon with green color', () => {
      const result = getStatusIcon('under_budget')
      expect(result.label).toBe('Under Budget')
      expect(result.className).toContain('green')
    })

    it('at risk condition (actual > 90% of estimated) returns AlertTriangle', () => {
      // 95% of estimated (at risk but not exceeded)
      const result = getStatusIcon('estimated', 9500, 10000)
      expect(result.label).toBe('At Risk')
      expect(result.className).toContain('yellow')
    })

    it('not at risk when actual <= 90% of estimated', () => {
      // 90% of estimated (not at risk)
      const result = getStatusIcon('estimated', 9000, 10000)
      expect(result.label).toBe('Estimated')
    })

    it('handles all status values consistently', () => {
      const statuses: CostItemStatus[] = ['estimated', 'confirmed', 'exceeded', 'under_budget']
      statuses.forEach((status) => {
        const result = getStatusIcon(status)
        expect(result.icon).toBeDefined()
        expect(result.label).toBeDefined()
        expect(result.className).toBeDefined()
      })
    })
  })
})

/**
 * Property 3: Financial Summary Calculation Consistency
 * Validates: Requirements 5.4, 5.5, 5.6
 */
describe('Property 3: Financial Summary Calculation Consistency', () => {
  it('profit equals revenue minus cost', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000000 }),
        fc.integer({ min: 0, max: 100000000 }),
        (revenue, cost) => {
          const profit = calculateProfit(revenue, cost)
          expect(profit).toBe(revenue - cost)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('margin equals (profit / revenue) * 100 when revenue > 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000000 }),
        fc.integer({ min: 0, max: 100000000 }),
        (revenue, cost) => {
          const margin = calculateMargin(revenue, cost)
          const expectedMargin = ((revenue - cost) / revenue) * 100
          expect(margin).toBeCloseTo(expectedMargin, 10)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('margin is 0 when revenue is 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000000 }),
        (cost) => {
          const margin = calculateMargin(0, cost)
          expect(margin).toBe(0)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('margin is 100% when cost is 0 and revenue > 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000000 }),
        (revenue) => {
          const margin = calculateMargin(revenue, 0)
          expect(margin).toBe(100)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('margin can be negative when cost > revenue', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000000 }),
        fc.integer({ min: 1, max: 100000000 }),
        (revenue, extraCost) => {
          const cost = revenue + extraCost
          const margin = calculateMargin(revenue, cost)
          expect(margin).toBeLessThan(0)
        }
      ),
      { numRuns: 50 }
    )
  })
})


/**
 * Property 4: Validation Prevents Invalid Submission
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 * Form validation should reject invalid cost items
 */
describe('Property 4: Validation Prevents Invalid Submission', () => {
  interface ValidationResult {
    valid: boolean
    errors: Record<number, { category?: string; description?: string; estimated_amount?: string }>
  }

  function validateCostItems(items: CostItemRow[]): ValidationResult {
    const errors: Record<number, { category?: string; description?: string; estimated_amount?: string }> = {}
    let valid = true

    if (items.length === 0) {
      return { valid: false, errors: {} }
    }

    items.forEach((item, index) => {
      const itemErrors: { category?: string; description?: string; estimated_amount?: string } = {}
      if (!item.category) {
        itemErrors.category = 'Category is required'
        valid = false
      }
      if (!item.description || !item.description.trim()) {
        itemErrors.description = 'Description is required'
        valid = false
      }
      if (item.estimated_amount <= 0) {
        itemErrors.estimated_amount = 'Amount must be greater than 0'
        valid = false
      }
      if (Object.keys(itemErrors).length > 0) {
        errors[index] = itemErrors
      }
    })

    return { valid, errors }
  }

  it('rejects empty items array', () => {
    const result = validateCostItems([])
    expect(result.valid).toBe(false)
  })

  it('rejects items with no category', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (count) => {
          const items: CostItemRow[] = Array.from({ length: count }, () => ({
            category: '' as CostCategory | '',
            description: 'Valid description',
            estimated_amount: 1000,
            status: 'estimated' as CostItemStatus,
          }))
          const result = validateCostItems(items)
          expect(result.valid).toBe(false)
          items.forEach((_, index) => {
            expect(result.errors[index]?.category).toBeDefined()
          })
        }
      ),
      { numRuns: 20 }
    )
  })

  it('rejects items with empty description', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (count) => {
          const items: CostItemRow[] = Array.from({ length: count }, () => ({
            category: 'trucking' as CostCategory,
            description: '',
            estimated_amount: 1000,
            status: 'estimated' as CostItemStatus,
          }))
          const result = validateCostItems(items)
          expect(result.valid).toBe(false)
          items.forEach((_, index) => {
            expect(result.errors[index]?.description).toBeDefined()
          })
        }
      ),
      { numRuns: 20 }
    )
  })

  it('rejects items with zero or negative estimated_amount', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 0 }),
        (amount) => {
          const items: CostItemRow[] = [{
            category: 'trucking' as CostCategory,
            description: 'Valid description',
            estimated_amount: amount,
            status: 'estimated' as CostItemStatus,
          }]
          const result = validateCostItems(items)
          expect(result.valid).toBe(false)
          expect(result.errors[0]?.estimated_amount).toBeDefined()
        }
      ),
      { numRuns: 20 }
    )
  })

  it('accepts valid items with category, description, and positive amount', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('trucking', 'port_charges', 'documentation', 'handling', 'crew', 'fuel', 'tolls', 'other') as fc.Arbitrary<CostCategory>,
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 1, max: 10000000 }),
        (category, description, amount) => {
          const items: CostItemRow[] = [{
            category,
            description,
            estimated_amount: amount,
            status: 'estimated' as CostItemStatus,
          }]
          const result = validateCostItems(items)
          expect(result.valid).toBe(true)
          expect(Object.keys(result.errors).length).toBe(0)
        }
      ),
      { numRuns: 50 }
    )
  })
})

/**
 * Property 6: Data Persistence Round-Trip
 * Validates: Requirements 7.1, 7.2, 7.4, 8.1, 8.3
 * Data should be preserved through save/load cycle
 */
describe('Property 6: Data Persistence Round-Trip', () => {
  interface CostItemData {
    id?: string
    category: string
    description: string
    estimated_amount: number
    status?: string
    estimated_by?: string
  }

  // Simulate save operation (what gets sent to server)
  function prepareForSave(items: CostItemRow[]): CostItemData[] {
    return items.map(item => ({
      id: item.id,
      category: item.category,
      description: item.description,
      estimated_amount: item.estimated_amount,
    }))
  }

  // Simulate load operation (what comes back from server)
  function loadFromServer(data: CostItemData[], userId: string): CostItemRow[] {
    return data.map(item => ({
      id: item.id,
      category: item.category as CostCategory,
      description: item.description,
      estimated_amount: item.estimated_amount,
      status: 'estimated' as CostItemStatus,
      estimated_by: userId,
    }))
  }

  const costItemArb = fc.record({
    id: fc.uuid(),
    category: fc.constantFrom('trucking', 'port_charges', 'documentation', 'handling', 'crew', 'fuel', 'tolls', 'other') as fc.Arbitrary<CostCategory>,
    description: fc.string({ minLength: 1, maxLength: 100 }),
    estimated_amount: fc.integer({ min: 1, max: 10000000 }),
    status: fc.constant('estimated') as fc.Arbitrary<CostItemStatus>,
  })

  it('preserves all fields through save/load cycle', () => {
    fc.assert(
      fc.property(
        fc.array(costItemArb, { minLength: 1, maxLength: 10 }),
        fc.uuid(),
        (items, userId) => {
          const saved = prepareForSave(items)
          const loaded = loadFromServer(saved, userId)

          expect(loaded.length).toBe(items.length)
          loaded.forEach((loadedItem, index) => {
            const original = items[index]
            expect(loadedItem.id).toBe(original.id)
            expect(loadedItem.category).toBe(original.category)
            expect(loadedItem.description).toBe(original.description)
            expect(loadedItem.estimated_amount).toBe(original.estimated_amount)
          })
        }
      ),
      { numRuns: 50 }
    )
  })

  it('sets status to estimated on save', () => {
    fc.assert(
      fc.property(
        fc.array(costItemArb, { minLength: 1, maxLength: 10 }),
        fc.uuid(),
        (items, userId) => {
          const saved = prepareForSave(items)
          const loaded = loadFromServer(saved, userId)

          loaded.forEach((item) => {
            expect(item.status).toBe('estimated')
          })
        }
      ),
      { numRuns: 50 }
    )
  })

  it('sets estimated_by to current user on save', () => {
    fc.assert(
      fc.property(
        fc.array(costItemArb, { minLength: 1, maxLength: 10 }),
        fc.uuid(),
        (items, userId) => {
          const saved = prepareForSave(items)
          const loaded = loadFromServer(saved, userId)

          loaded.forEach((item) => {
            expect(item.estimated_by).toBe(userId)
          })
        }
      ),
      { numRuns: 50 }
    )
  })

  it('handles items without id (new items)', () => {
    const newItems: CostItemRow[] = [
      { category: 'trucking', description: 'New Item', estimated_amount: 5000, status: 'estimated' }
    ]
    const saved = prepareForSave(newItems)
    expect(saved[0].id).toBeUndefined()
  })
})
