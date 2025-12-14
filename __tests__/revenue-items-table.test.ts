import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateItemSubtotal,
  calculateTotalRevenue,
  getSequentialLineNumbers,
  RevenueItemRow,
} from '@/components/pjo/revenue-items-table'

describe('RevenueItemsTable - Property Tests', () => {
  /**
   * Property 1: Subtotal Calculation Consistency
   * Validates: Requirements 3.5
   * For any quantity and unit_price, subtotal = quantity × unit_price
   */
  describe('Property 1: Subtotal Calculation Consistency', () => {
    it('subtotal equals quantity × unit_price for any positive values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 0, max: 100000000 }),
          (quantity, unitPrice) => {
            const subtotal = calculateItemSubtotal(quantity, unitPrice)
            const expected = quantity * unitPrice
            expect(subtotal).toBe(expected)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('subtotal is zero when quantity is zero', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100000000 }),
          (unitPrice) => {
            const subtotal = calculateItemSubtotal(0, unitPrice)
            expect(subtotal).toBe(0)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('subtotal is zero when unit_price is zero', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10000 }),
          (quantity) => {
            const subtotal = calculateItemSubtotal(quantity, 0)
            expect(subtotal).toBe(0)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * Property 2: Total Revenue Sum Consistency
   * Validates: Requirements 4.2, 5.1
   * Total revenue equals sum of all item subtotals
   */
  describe('Property 2: Total Revenue Sum Consistency', () => {
    const revenueItemArb = fc.record({
      description: fc.string({ minLength: 1, maxLength: 100 }),
      quantity: fc.integer({ min: 1, max: 1000 }),
      unit: fc.constantFrom('TRIP', 'LOT', 'UNIT', 'KG'),
      unit_price: fc.integer({ min: 0, max: 10000000 }),
      subtotal: fc.constant(0), // Will be calculated
      source_type: fc.constantFrom('manual', 'quotation', 'contract') as fc.Arbitrary<'manual' | 'quotation' | 'contract'>,
    }).map((item) => ({
      ...item,
      subtotal: item.quantity * item.unit_price,
    }))

    it('total revenue equals sum of all subtotals', () => {
      fc.assert(
        fc.property(
          fc.array(revenueItemArb, { minLength: 0, maxLength: 20 }),
          (items) => {
            const total = calculateTotalRevenue(items)
            const expectedTotal = items.reduce((sum, item) => sum + item.subtotal, 0)
            expect(total).toBe(expectedTotal)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('total revenue is zero for empty items array', () => {
      const total = calculateTotalRevenue([])
      expect(total).toBe(0)
    })

    it('total revenue equals single item subtotal for single item', () => {
      fc.assert(
        fc.property(revenueItemArb, (item) => {
          const total = calculateTotalRevenue([item])
          expect(total).toBe(item.subtotal)
        }),
        { numRuns: 50 }
      )
    })

    it('total revenue is non-negative when all subtotals are non-negative', () => {
      fc.assert(
        fc.property(
          fc.array(revenueItemArb, { minLength: 0, maxLength: 20 }),
          (items) => {
            const total = calculateTotalRevenue(items)
            expect(total).toBeGreaterThanOrEqual(0)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 3: Sequential Line Numbering After Deletion
   * Validates: Requirements 4.3
   * After any deletion, remaining items should be numbered 1, 2, 3, ...
   */
  describe('Property 3: Sequential Line Numbering After Deletion', () => {
    const createMockItems = (count: number): RevenueItemRow[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `item-${i}`,
        description: `Item ${i + 1}`,
        quantity: 1,
        unit: 'TRIP',
        unit_price: 1000,
        subtotal: 1000,
        source_type: 'manual' as const,
      }))
    }

    it('line numbers are always sequential starting from 1', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 50 }),
          (itemCount) => {
            const items = createMockItems(itemCount)
            const lineNumbers = getSequentialLineNumbers(items)
            
            // Should have same length as items
            expect(lineNumbers.length).toBe(itemCount)
            
            // Each line number should be index + 1
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
            // Ensure deleteIndex is valid
            const validDeleteIndex = deleteIndex % itemCount
            
            const items = createMockItems(itemCount)
            // Simulate deletion
            const remainingItems = items.filter((_, i) => i !== validDeleteIndex)
            const lineNumbers = getSequentialLineNumbers(remainingItems)
            
            // Should have one less item
            expect(lineNumbers.length).toBe(itemCount - 1)
            
            // Line numbers should still be sequential
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
})


/**
 * Property 4: Validation Prevents Invalid Submission
 * Validates: Requirements 6.1, 6.2, 6.3, 6.5
 * Form validation should reject invalid revenue items
 */
describe('Property 4: Validation Prevents Invalid Submission', () => {
  interface ValidationResult {
    valid: boolean
    errors: Record<number, { description?: string; unit_price?: string }>
  }

  function validateRevenueItems(items: RevenueItemRow[]): ValidationResult {
    const errors: Record<number, { description?: string; unit_price?: string }> = {}
    let valid = true

    if (items.length === 0) {
      return { valid: false, errors: {} }
    }

    items.forEach((item, index) => {
      const itemErrors: { description?: string; unit_price?: string } = {}
      if (!item.description || !item.description.trim()) {
        itemErrors.description = 'Description is required'
        valid = false
      }
      if (item.unit_price <= 0) {
        itemErrors.unit_price = 'Unit price must be greater than 0'
        valid = false
      }
      if (Object.keys(itemErrors).length > 0) {
        errors[index] = itemErrors
      }
    })

    return { valid, errors }
  }

  it('rejects empty items array', () => {
    const result = validateRevenueItems([])
    expect(result.valid).toBe(false)
  })

  it('rejects items with empty description', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (count) => {
          const items: RevenueItemRow[] = Array.from({ length: count }, () => ({
            description: '',
            quantity: 1,
            unit: 'TRIP',
            unit_price: 1000,
            subtotal: 1000,
          }))
          const result = validateRevenueItems(items)
          expect(result.valid).toBe(false)
          // Each item should have description error
          items.forEach((_, index) => {
            expect(result.errors[index]?.description).toBeDefined()
          })
        }
      ),
      { numRuns: 20 }
    )
  })

  it('rejects items with zero or negative unit_price', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 0 }),
        (unitPrice) => {
          const items: RevenueItemRow[] = [{
            description: 'Valid description',
            quantity: 1,
            unit: 'TRIP',
            unit_price: unitPrice,
            subtotal: unitPrice,
          }]
          const result = validateRevenueItems(items)
          expect(result.valid).toBe(false)
          expect(result.errors[0]?.unit_price).toBeDefined()
        }
      ),
      { numRuns: 20 }
    )
  })

  it('accepts valid items with description and positive unit_price', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 1, max: 10000000 }),
        (description, unitPrice) => {
          const items: RevenueItemRow[] = [{
            description,
            quantity: 1,
            unit: 'TRIP',
            unit_price: unitPrice,
            subtotal: unitPrice,
          }]
          const result = validateRevenueItems(items)
          expect(result.valid).toBe(true)
          expect(Object.keys(result.errors).length).toBe(0)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('validates each item independently', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 0, max: 9 }),
        (count, invalidIndex) => {
          const validIdx = invalidIndex % count
          const items: RevenueItemRow[] = Array.from({ length: count }, (_, i) => ({
            description: i === validIdx ? '' : `Item ${i}`,
            quantity: 1,
            unit: 'TRIP',
            unit_price: 1000,
            subtotal: 1000,
          }))
          const result = validateRevenueItems(items)
          expect(result.valid).toBe(false)
          // Only the invalid item should have error
          expect(result.errors[validIdx]?.description).toBeDefined()
        }
      ),
      { numRuns: 30 }
    )
  })
})

/**
 * Property 5: Data Persistence Round-Trip
 * Validates: Requirements 7.2, 7.4
 * Data should be preserved through save/load cycle
 */
describe('Property 5: Data Persistence Round-Trip', () => {
  interface RevenueItemData {
    id?: string
    description: string
    quantity: number
    unit: string
    unit_price: number
    source_type?: string
  }

  // Simulate save operation (what gets sent to server)
  function prepareForSave(items: RevenueItemRow[]): RevenueItemData[] {
    return items.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      source_type: item.source_type || 'manual',
    }))
  }

  // Simulate load operation (what comes back from server)
  function loadFromServer(data: RevenueItemData[]): RevenueItemRow[] {
    return data.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      subtotal: item.quantity * item.unit_price,
      source_type: item.source_type as 'manual' | 'quotation' | 'contract',
    }))
  }

  const revenueItemArb = fc.record({
    id: fc.uuid(),
    description: fc.string({ minLength: 1, maxLength: 100 }),
    quantity: fc.integer({ min: 1, max: 1000 }),
    unit: fc.constantFrom('TRIP', 'LOT', 'UNIT', 'KG', 'CBM'),
    unit_price: fc.integer({ min: 1, max: 10000000 }),
    subtotal: fc.constant(0),
    source_type: fc.constantFrom('manual', 'quotation', 'contract') as fc.Arbitrary<'manual' | 'quotation' | 'contract'>,
  }).map(item => ({
    ...item,
    subtotal: item.quantity * item.unit_price,
  }))

  it('preserves all fields through save/load cycle', () => {
    fc.assert(
      fc.property(
        fc.array(revenueItemArb, { minLength: 1, maxLength: 10 }),
        (items) => {
          const saved = prepareForSave(items)
          const loaded = loadFromServer(saved)

          expect(loaded.length).toBe(items.length)
          loaded.forEach((loadedItem, index) => {
            const original = items[index]
            expect(loadedItem.id).toBe(original.id)
            expect(loadedItem.description).toBe(original.description)
            expect(loadedItem.quantity).toBe(original.quantity)
            expect(loadedItem.unit).toBe(original.unit)
            expect(loadedItem.unit_price).toBe(original.unit_price)
            expect(loadedItem.source_type).toBe(original.source_type)
          })
        }
      ),
      { numRuns: 50 }
    )
  })

  it('recalculates subtotal correctly on load', () => {
    fc.assert(
      fc.property(
        fc.array(revenueItemArb, { minLength: 1, maxLength: 10 }),
        (items) => {
          const saved = prepareForSave(items)
          const loaded = loadFromServer(saved)

          loaded.forEach((item) => {
            expect(item.subtotal).toBe(item.quantity * item.unit_price)
          })
        }
      ),
      { numRuns: 50 }
    )
  })

  it('handles items without id (new items)', () => {
    const newItems: RevenueItemRow[] = [
      { description: 'New Item', quantity: 5, unit: 'TRIP', unit_price: 1000, subtotal: 5000 }
    ]
    const saved = prepareForSave(newItems)
    expect(saved[0].id).toBeUndefined()
  })
})

/**
 * Property 6: Total Revenue Sync on Save
 * Validates: Requirements 7.3, 7.5
 * PJO total_revenue should equal sum of revenue items
 */
describe('Property 6: Total Revenue Sync on Save', () => {
  interface PJOData {
    total_revenue: number
    revenue_items: { quantity: number; unit_price: number }[]
  }

  function calculatePJOTotalRevenue(items: { quantity: number; unit_price: number }[]): number {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  }

  function syncTotalRevenue(pjo: PJOData): PJOData {
    return {
      ...pjo,
      total_revenue: calculatePJOTotalRevenue(pjo.revenue_items),
    }
  }

  const revenueItemArb = fc.record({
    quantity: fc.integer({ min: 1, max: 1000 }),
    unit_price: fc.integer({ min: 1, max: 10000000 }),
  })

  it('total_revenue equals sum of all item subtotals', () => {
    fc.assert(
      fc.property(
        fc.array(revenueItemArb, { minLength: 1, maxLength: 20 }),
        (items) => {
          const pjo: PJOData = { total_revenue: 0, revenue_items: items }
          const synced = syncTotalRevenue(pjo)
          
          const expectedTotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
          expect(synced.total_revenue).toBe(expectedTotal)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('total_revenue is zero for empty items', () => {
    const pjo: PJOData = { total_revenue: 999, revenue_items: [] }
    const synced = syncTotalRevenue(pjo)
    expect(synced.total_revenue).toBe(0)
  })

  it('total_revenue updates when items change', () => {
    fc.assert(
      fc.property(
        fc.array(revenueItemArb, { minLength: 1, maxLength: 10 }),
        fc.array(revenueItemArb, { minLength: 1, maxLength: 10 }),
        (items1, items2) => {
          const pjo1 = syncTotalRevenue({ total_revenue: 0, revenue_items: items1 })
          const pjo2 = syncTotalRevenue({ total_revenue: 0, revenue_items: items2 })
          
          const expected1 = items1.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
          const expected2 = items2.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
          
          expect(pjo1.total_revenue).toBe(expected1)
          expect(pjo2.total_revenue).toBe(expected2)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('total_revenue is always non-negative', () => {
    fc.assert(
      fc.property(
        fc.array(revenueItemArb, { minLength: 0, maxLength: 20 }),
        (items) => {
          const pjo = syncTotalRevenue({ total_revenue: 0, revenue_items: items })
          expect(pjo.total_revenue).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
