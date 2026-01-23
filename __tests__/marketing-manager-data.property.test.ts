/**
 * Marketing Manager Dashboard Data - Property-Based Tests
 * Tests for win rate calculation and other marketing metrics
 * 
 * Feature: marketing-manager-dashboard-real-data
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { 
  calculateWinRate, 
  filterQuotationsMTD, 
  calculateQuotationValue,
  isOrderedByCreatedAtDescending,
  getRecentItems
} from '@/lib/dashboard/marketing-manager-utils'

/**
 * Property 3: Win Rate Calculation
 * 
 * *For any* set of quotations with `status` in ('won', 'lost'), the `winRatePercent` 
 * SHALL equal `(count of won / count of won + lost) * 100`. When no closed quotations 
 * exist (won + lost = 0), the win rate SHALL be 0.
 * 
 * **Validates: Requirements 1.5, 1.6**
 */
describe('Feature: marketing-manager-dashboard-real-data, Property 3: Win Rate Calculation', () => {
  it('should calculate win rate as won/(won+lost)*100 for any valid inputs', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }), // won count (0-100)
        fc.nat({ max: 100 }), // lost count (0-100)
        (won, lost) => {
          const total = won + lost
          const expectedRate = total === 0 ? 0 : Math.round((won / total) * 100)
          const actualRate = calculateWinRate(won, lost)
          return actualRate === expectedRate
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 when no closed quotations exist (won + lost = 0)', () => {
    expect(calculateWinRate(0, 0)).toBe(0)
  })

  it('should return 100 when all quotations are won', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // at least 1 won
        (won) => {
          const actualRate = calculateWinRate(won, 0)
          return actualRate === 100
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 when all quotations are lost', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // at least 1 lost
        (lost) => {
          const actualRate = calculateWinRate(0, lost)
          return actualRate === 0
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 50 when won equals lost (and both > 0)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // equal count
        (count) => {
          const actualRate = calculateWinRate(count, count)
          return actualRate === 50
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should always return a value between 0 and 100 inclusive', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1000 }), // won count
        fc.nat({ max: 1000 }), // lost count
        (won, lost) => {
          const actualRate = calculateWinRate(won, lost)
          return actualRate >= 0 && actualRate <= 100
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should round to nearest integer', () => {
    // Test specific cases where rounding matters
    // 1 won, 2 lost = 1/3 = 33.33... -> 33
    expect(calculateWinRate(1, 2)).toBe(33)
    
    // 2 won, 1 lost = 2/3 = 66.66... -> 67
    expect(calculateWinRate(2, 1)).toBe(67)
    
    // 1 won, 3 lost = 1/4 = 25 -> 25
    expect(calculateWinRate(1, 3)).toBe(25)
    
    // 3 won, 1 lost = 3/4 = 75 -> 75
    expect(calculateWinRate(3, 1)).toBe(75)
  })

  it('should handle large numbers correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }), // large won count
        fc.integer({ min: 0, max: 1000000 }), // large lost count
        (won, lost) => {
          const total = won + lost
          const expectedRate = total === 0 ? 0 : Math.round((won / total) * 100)
          const actualRate = calculateWinRate(won, lost)
          return actualRate === expectedRate
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * Property 1: MTD Quotation Count Accuracy
 * 
 * *For any* set of quotations in the database with various `created_at` dates, 
 * the `quotationsSentMTD` metric SHALL equal the count of quotations where 
 * `created_at >= startOfMonth` and `is_active = true`.
 * 
 * **Validates: Requirements 1.1**
 */
describe('Feature: marketing-manager-dashboard-real-data, Property 1: MTD Quotation Count Accuracy', () => {
  // Helper to generate valid ISO date strings within a range
  const dateStringArbitrary = fc.integer({ min: 0, max: 730 }).map(daysOffset => {
    const baseDate = new Date('2024-01-01')
    baseDate.setDate(baseDate.getDate() + daysOffset)
    return baseDate.toISOString()
  })

  // Generator for quotation with random date and is_active status
  const quotationArbitrary = fc.record({
    id: fc.uuid(),
    created_at: dateStringArbitrary,
    is_active: fc.boolean(),
    total_revenue: fc.option(fc.integer({ min: 0, max: 10000000 }), { nil: null }),
    status: fc.constantFrom('draft', 'engineering_review', 'ready', 'submitted', 'won', 'lost'),
  })

  // Helper to generate valid reference dates
  const referenceDateArbitrary = fc.integer({ min: 0, max: 730 }).map(daysOffset => {
    const baseDate = new Date('2024-01-01')
    baseDate.setDate(baseDate.getDate() + daysOffset)
    return baseDate
  })

  it('should count only quotations created this month with is_active = true', () => {
    fc.assert(
      fc.property(
        fc.array(quotationArbitrary, { minLength: 0, maxLength: 50 }),
        referenceDateArbitrary,
        (quotations, referenceDate) => {
          // Calculate start of month for the reference date
          const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
          
          // Use the helper function to filter
          const filteredQuotations = filterQuotationsMTD(quotations, startOfMonth)
          
          // Manually calculate expected count
          const expectedCount = quotations.filter(q => 
            q.is_active && new Date(q.created_at) >= startOfMonth
          ).length
          
          return filteredQuotations.length === expectedCount
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return empty array when no quotations match MTD criteria', () => {
    fc.assert(
      fc.property(
        fc.array(quotationArbitrary, { minLength: 0, maxLength: 20 }),
        (quotations) => {
          // Use a future date so no quotations can be in MTD
          const futureStartOfMonth = new Date('2099-01-01')
          
          const filteredQuotations = filterQuotationsMTD(quotations, futureStartOfMonth)
          
          return filteredQuotations.length === 0
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should exclude inactive quotations even if created this month', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (count) => {
          const now = new Date()
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          
          // Create quotations that are all in current month but inactive
          const inactiveQuotations = Array.from({ length: count }, (_, i) => ({
            id: `inactive-${i}`,
            created_at: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(),
            is_active: false,
            total_revenue: 1000,
            status: 'draft' as const,
          }))
          
          const filteredQuotations = filterQuotationsMTD(inactiveQuotations, startOfMonth)
          
          return filteredQuotations.length === 0
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should include all active quotations created on or after start of month', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (count) => {
          const now = new Date()
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          
          // Create quotations that are all in current month and active
          const activeQuotations = Array.from({ length: count }, (_, i) => ({
            id: `active-${i}`,
            created_at: new Date(now.getFullYear(), now.getMonth(), Math.min(i + 1, 28)).toISOString(),
            is_active: true,
            total_revenue: 1000,
            status: 'draft' as const,
          }))
          
          const filteredQuotations = filterQuotationsMTD(activeQuotations, startOfMonth)
          
          return filteredQuotations.length === count
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should correctly handle quotations created exactly at start of month', () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const quotationAtStartOfMonth = [{
      id: 'start-of-month',
      created_at: startOfMonth.toISOString(),
      is_active: true,
      total_revenue: 5000,
      status: 'draft' as const,
    }]
    
    const filteredQuotations = filterQuotationsMTD(quotationAtStartOfMonth, startOfMonth)
    
    expect(filteredQuotations.length).toBe(1)
    expect(filteredQuotations[0].id).toBe('start-of-month')
  })

  it('should exclude quotations created before start of month', () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15)
    
    const quotationBeforeMonth = [{
      id: 'last-month',
      created_at: lastMonth.toISOString(),
      is_active: true,
      total_revenue: 5000,
      status: 'draft' as const,
    }]
    
    const filteredQuotations = filterQuotationsMTD(quotationBeforeMonth, startOfMonth)
    
    expect(filteredQuotations.length).toBe(0)
  })
})

/**
 * Property 2: MTD Quotation Value Aggregation
 * 
 * *For any* set of quotations with various `total_revenue` values and `created_at` dates, 
 * the `quotationValueMTD` metric SHALL equal the sum of `total_revenue` for all quotations 
 * where `created_at >= startOfMonth` and `is_active = true`.
 * 
 * **Validates: Requirements 1.2**
 */
describe('Feature: marketing-manager-dashboard-real-data, Property 2: MTD Quotation Value Aggregation', () => {
  // Helper to generate valid ISO date strings within a range
  const dateStringArbitrary = fc.integer({ min: 0, max: 730 }).map(daysOffset => {
    const baseDate = new Date('2024-01-01')
    baseDate.setDate(baseDate.getDate() + daysOffset)
    return baseDate.toISOString()
  })

  // Generator for quotation with random date, is_active status, and total_revenue
  const quotationArbitrary = fc.record({
    id: fc.uuid(),
    created_at: dateStringArbitrary,
    is_active: fc.boolean(),
    total_revenue: fc.option(fc.integer({ min: 0, max: 10000000 }), { nil: null }),
    status: fc.constantFrom('draft', 'engineering_review', 'ready', 'submitted', 'won', 'lost'),
  })

  // Helper to generate valid reference dates
  const referenceDateArbitrary = fc.integer({ min: 0, max: 730 }).map(daysOffset => {
    const baseDate = new Date('2024-01-01')
    baseDate.setDate(baseDate.getDate() + daysOffset)
    return baseDate
  })

  it('should sum total_revenue for MTD quotations only', () => {
    fc.assert(
      fc.property(
        fc.array(quotationArbitrary, { minLength: 0, maxLength: 50 }),
        referenceDateArbitrary,
        (quotations, referenceDate) => {
          // Calculate start of month for the reference date
          const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
          
          // Filter quotations using the helper function
          const filteredQuotations = filterQuotationsMTD(quotations, startOfMonth)
          
          // Calculate value using the helper function
          const actualValue = calculateQuotationValue(filteredQuotations)
          
          // Manually calculate expected value
          const expectedValue = quotations
            .filter(q => q.is_active && new Date(q.created_at) >= startOfMonth)
            .reduce((sum, q) => sum + (q.total_revenue || 0), 0)
          
          return actualValue === expectedValue
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 when no quotations match MTD criteria', () => {
    fc.assert(
      fc.property(
        fc.array(quotationArbitrary, { minLength: 0, maxLength: 20 }),
        (quotations) => {
          // Use a future date so no quotations can be in MTD
          const futureStartOfMonth = new Date('2099-01-01')
          
          const filteredQuotations = filterQuotationsMTD(quotations, futureStartOfMonth)
          const value = calculateQuotationValue(filteredQuotations)
          
          return value === 0
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should treat null total_revenue as 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (count) => {
          const now = new Date()
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          
          // Create quotations with null total_revenue
          const quotationsWithNullRevenue = Array.from({ length: count }, (_, i) => ({
            id: `null-revenue-${i}`,
            created_at: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(),
            is_active: true,
            total_revenue: null,
            status: 'draft' as const,
          }))
          
          const filteredQuotations = filterQuotationsMTD(quotationsWithNullRevenue, startOfMonth)
          const value = calculateQuotationValue(filteredQuotations)
          
          return value === 0
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should correctly sum positive total_revenue values', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 1000000 }), { minLength: 1, maxLength: 20 }),
        (revenues) => {
          const now = new Date()
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          
          // Create quotations with specific revenues
          const quotations = revenues.map((revenue, i) => ({
            id: `revenue-${i}`,
            created_at: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(),
            is_active: true,
            total_revenue: revenue,
            status: 'draft' as const,
          }))
          
          const filteredQuotations = filterQuotationsMTD(quotations, startOfMonth)
          const actualValue = calculateQuotationValue(filteredQuotations)
          const expectedValue = revenues.reduce((sum, r) => sum + r, 0)
          
          return actualValue === expectedValue
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle mixed null and non-null total_revenue values', () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer({ min: 0, max: 1000000 }), { nil: null }), { minLength: 1, maxLength: 20 }),
        (revenues) => {
          const now = new Date()
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          
          // Create quotations with mixed revenues
          const quotations = revenues.map((revenue, i) => ({
            id: `mixed-${i}`,
            created_at: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(),
            is_active: true,
            total_revenue: revenue,
            status: 'draft' as const,
          }))
          
          const filteredQuotations = filterQuotationsMTD(quotations, startOfMonth)
          const actualValue = calculateQuotationValue(filteredQuotations)
          const expectedValue = revenues.reduce<number>((sum, r) => sum + (r || 0), 0)
          
          return actualValue === expectedValue
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 for empty quotation array', () => {
    const value = calculateQuotationValue([])
    expect(value).toBe(0)
  })

  it('should correctly aggregate value only for active MTD quotations', () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15)
    
    const mixedQuotations = [
      // Active, this month - should be included
      { id: '1', created_at: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(), is_active: true, total_revenue: 1000, status: 'draft' as const },
      // Active, this month - should be included
      { id: '2', created_at: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(), is_active: true, total_revenue: 2000, status: 'draft' as const },
      // Inactive, this month - should NOT be included
      { id: '3', created_at: new Date(now.getFullYear(), now.getMonth(), 20).toISOString(), is_active: false, total_revenue: 5000, status: 'draft' as const },
      // Active, last month - should NOT be included
      { id: '4', created_at: lastMonth.toISOString(), is_active: true, total_revenue: 3000, status: 'draft' as const },
      // Inactive, last month - should NOT be included
      { id: '5', created_at: lastMonth.toISOString(), is_active: false, total_revenue: 4000, status: 'draft' as const },
    ]
    
    const filteredQuotations = filterQuotationsMTD(mixedQuotations, startOfMonth)
    const value = calculateQuotationValue(filteredQuotations)
    
    // Only quotations 1 and 2 should be included: 1000 + 2000 = 3000
    expect(value).toBe(3000)
    expect(filteredQuotations.length).toBe(2)
  })
})


/**
 * Property 8: Recent Items Ordering
 * 
 * *For any* set of quotations and customers, `recentQuotations` SHALL contain at most 5 items 
 * ordered by `created_at` descending (most recent first), and `recentCustomers` SHALL contain 
 * at most 5 items ordered by `created_at` descending.
 * 
 * **Validates: Requirements 6.1, 6.2**
 */
describe('Feature: marketing-manager-dashboard-real-data, Property 8: Recent Items Ordering', () => {
  // Helper to generate valid ISO date strings within a range
  const dateStringArbitrary = fc.integer({ min: 0, max: 730 }).map(daysOffset => {
    const baseDate = new Date('2024-01-01')
    baseDate.setDate(baseDate.getDate() + daysOffset)
    return baseDate.toISOString()
  })

  // Generator for quotation with random date
  const quotationArbitrary = fc.record({
    id: fc.uuid(),
    quotation_number: fc.string({ minLength: 5, maxLength: 20 }),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    customer_name: fc.string({ minLength: 1, maxLength: 100 }),
    status: fc.constantFrom('draft', 'engineering_review', 'ready', 'submitted', 'won', 'lost'),
    created_at: dateStringArbitrary,
  })

  // Generator for customer with random date
  const customerArbitrary = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    created_at: dateStringArbitrary,
  })

  describe('Recent Quotations', () => {
    it('should return at most 5 quotations for any input size', () => {
      fc.assert(
        fc.property(
          fc.array(quotationArbitrary, { minLength: 0, maxLength: 50 }),
          (quotations) => {
            const recentQuotations = getRecentItems(quotations, 5)
            return recentQuotations.length <= 5
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return all quotations when input has 5 or fewer items', () => {
      fc.assert(
        fc.property(
          fc.array(quotationArbitrary, { minLength: 0, maxLength: 5 }),
          (quotations) => {
            const recentQuotations = getRecentItems(quotations, 5)
            return recentQuotations.length === quotations.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should order quotations by created_at descending (most recent first)', () => {
      fc.assert(
        fc.property(
          fc.array(quotationArbitrary, { minLength: 0, maxLength: 50 }),
          (quotations) => {
            const recentQuotations = getRecentItems(quotations, 5)
            return isOrderedByCreatedAtDescending(recentQuotations)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return the 5 most recent quotations when more than 5 exist', () => {
      fc.assert(
        fc.property(
          fc.array(quotationArbitrary, { minLength: 6, maxLength: 50 }),
          (quotations) => {
            const recentQuotations = getRecentItems(quotations, 5)
            
            // Sort all quotations by created_at descending to find expected top 5
            const sortedAll = [...quotations].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            const expectedTop5 = sortedAll.slice(0, 5)
            
            // Check that the returned items match the expected top 5
            // (order should be the same since both are sorted descending)
            return recentQuotations.length === 5 &&
              recentQuotations.every((q, i) => q.id === expectedTop5[i].id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array when no quotations exist', () => {
      const recentQuotations = getRecentItems([], 5)
      expect(recentQuotations).toEqual([])
      expect(recentQuotations.length).toBe(0)
    })

    it('should handle single quotation correctly', () => {
      fc.assert(
        fc.property(
          quotationArbitrary,
          (quotation) => {
            const recentQuotations = getRecentItems([quotation], 5)
            return recentQuotations.length === 1 &&
              recentQuotations[0].id === quotation.id
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify descending order for any valid sequence', () => {
      fc.assert(
        fc.property(
          fc.array(dateStringArbitrary, { minLength: 2, maxLength: 10 }),
          (dates) => {
            // Create items with the dates
            const items = dates.map((date, i) => ({ id: `item-${i}`, created_at: date }))
            
            // Sort descending
            const sortedItems = [...items].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            
            // Verify the helper function correctly identifies descending order
            return isOrderedByCreatedAtDescending(sortedItems)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify non-descending order', () => {
      // Create items in ascending order (oldest first)
      const ascendingItems = [
        { id: '1', created_at: '2024-01-01T00:00:00.000Z' },
        { id: '2', created_at: '2024-01-02T00:00:00.000Z' },
        { id: '3', created_at: '2024-01-03T00:00:00.000Z' },
      ]
      
      expect(isOrderedByCreatedAtDescending(ascendingItems)).toBe(false)
    })

    it('should correctly identify descending order', () => {
      // Create items in descending order (most recent first)
      const descendingItems = [
        { id: '3', created_at: '2024-01-03T00:00:00.000Z' },
        { id: '2', created_at: '2024-01-02T00:00:00.000Z' },
        { id: '1', created_at: '2024-01-01T00:00:00.000Z' },
      ]
      
      expect(isOrderedByCreatedAtDescending(descendingItems)).toBe(true)
    })

    it('should return true for empty array (vacuously true)', () => {
      expect(isOrderedByCreatedAtDescending([])).toBe(true)
    })

    it('should return true for single item array', () => {
      const singleItem = [{ id: '1', created_at: '2024-01-01T00:00:00.000Z' }]
      expect(isOrderedByCreatedAtDescending(singleItem)).toBe(true)
    })
  })

  describe('Recent Customers', () => {
    it('should return at most 5 customers for any input size', () => {
      fc.assert(
        fc.property(
          fc.array(customerArbitrary, { minLength: 0, maxLength: 50 }),
          (customers) => {
            const recentCustomers = getRecentItems(customers, 5)
            return recentCustomers.length <= 5
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return all customers when input has 5 or fewer items', () => {
      fc.assert(
        fc.property(
          fc.array(customerArbitrary, { minLength: 0, maxLength: 5 }),
          (customers) => {
            const recentCustomers = getRecentItems(customers, 5)
            return recentCustomers.length === customers.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should order customers by created_at descending (most recent first)', () => {
      fc.assert(
        fc.property(
          fc.array(customerArbitrary, { minLength: 0, maxLength: 50 }),
          (customers) => {
            const recentCustomers = getRecentItems(customers, 5)
            return isOrderedByCreatedAtDescending(recentCustomers)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return the 5 most recent customers when more than 5 exist', () => {
      fc.assert(
        fc.property(
          fc.array(customerArbitrary, { minLength: 6, maxLength: 50 }),
          (customers) => {
            const recentCustomers = getRecentItems(customers, 5)
            
            // Sort all customers by created_at descending to find expected top 5
            const sortedAll = [...customers].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            const expectedTop5 = sortedAll.slice(0, 5)
            
            // Check that the returned items match the expected top 5
            return recentCustomers.length === 5 &&
              recentCustomers.every((c, i) => c.id === expectedTop5[i].id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array when no customers exist', () => {
      const recentCustomers = getRecentItems([], 5)
      expect(recentCustomers).toEqual([])
      expect(recentCustomers.length).toBe(0)
    })

    it('should handle single customer correctly', () => {
      fc.assert(
        fc.property(
          customerArbitrary,
          (customer) => {
            const recentCustomers = getRecentItems([customer], 5)
            return recentCustomers.length === 1 &&
              recentCustomers[0].id === customer.id
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle items with identical created_at timestamps', () => {
      const sameTimestamp = '2024-06-15T12:00:00.000Z'
      const itemsWithSameTimestamp = [
        { id: '1', created_at: sameTimestamp },
        { id: '2', created_at: sameTimestamp },
        { id: '3', created_at: sameTimestamp },
        { id: '4', created_at: sameTimestamp },
        { id: '5', created_at: sameTimestamp },
        { id: '6', created_at: sameTimestamp },
      ]
      
      const recentItems = getRecentItems(itemsWithSameTimestamp, 5)
      
      // Should return exactly 5 items
      expect(recentItems.length).toBe(5)
      // Should be considered "ordered" since all timestamps are equal
      expect(isOrderedByCreatedAtDescending(recentItems)).toBe(true)
    })

    it('should handle items with millisecond precision differences', () => {
      const items = [
        { id: '1', created_at: '2024-06-15T12:00:00.001Z' },
        { id: '2', created_at: '2024-06-15T12:00:00.002Z' },
        { id: '3', created_at: '2024-06-15T12:00:00.003Z' },
      ]
      
      const recentItems = getRecentItems(items, 5)
      
      // Should be ordered with most recent (003) first
      expect(recentItems[0].id).toBe('3')
      expect(recentItems[1].id).toBe('2')
      expect(recentItems[2].id).toBe('1')
      expect(isOrderedByCreatedAtDescending(recentItems)).toBe(true)
    })

    it('should handle items spanning multiple years', () => {
      const items = [
        { id: '2022', created_at: '2022-01-01T00:00:00.000Z' },
        { id: '2024', created_at: '2024-06-15T00:00:00.000Z' },
        { id: '2023', created_at: '2023-06-15T00:00:00.000Z' },
        { id: '2021', created_at: '2021-12-31T23:59:59.999Z' },
        { id: '2025', created_at: '2025-01-01T00:00:00.000Z' },
      ]
      
      const recentItems = getRecentItems(items, 5)
      
      // Should be ordered: 2025, 2024, 2023, 2022, 2021
      expect(recentItems[0].id).toBe('2025')
      expect(recentItems[1].id).toBe('2024')
      expect(recentItems[2].id).toBe('2023')
      expect(recentItems[3].id).toBe('2022')
      expect(recentItems[4].id).toBe('2021')
      expect(isOrderedByCreatedAtDescending(recentItems)).toBe(true)
    })

    it('should not mutate the original array', () => {
      fc.assert(
        fc.property(
          fc.array(quotationArbitrary, { minLength: 1, maxLength: 20 }),
          (quotations) => {
            // Create a copy of the original array for comparison
            const originalOrder = quotations.map(q => q.id)
            
            // Call getRecentItems
            getRecentItems(quotations, 5)
            
            // Verify original array is unchanged
            const afterOrder = quotations.map(q => q.id)
            return originalOrder.every((id, i) => id === afterOrder[i])
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should work with custom limit values', () => {
      fc.assert(
        fc.property(
          fc.array(quotationArbitrary, { minLength: 0, maxLength: 50 }),
          fc.integer({ min: 1, max: 20 }),
          (quotations, limit) => {
            const recentItems = getRecentItems(quotations, limit)
            
            // Should return at most `limit` items
            const correctLength = recentItems.length <= limit
            // Should return all items if fewer than limit exist
            const correctCount = quotations.length <= limit 
              ? recentItems.length === quotations.length 
              : recentItems.length === limit
            // Should be ordered descending
            const correctOrder = isOrderedByCreatedAtDescending(recentItems)
            
            return correctLength && correctCount && correctOrder
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
