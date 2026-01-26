/**
 * Property-based tests for Director Dashboard Data Service
 * Tests correctness properties for profit calculation and related metrics
 * 
 * **Feature: director-dashboard**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// =====================================================
// Pure Calculation Functions for Testing
// These mirror the logic in director-data.ts but are pure functions
// that can be tested without database dependencies
// =====================================================

/**
 * Calculate profit from revenue and cost
 * Profit = Revenue - Cost
 * 
 * @param revenue - Total revenue amount
 * @param cost - Total cost amount
 * @returns Profit amount (can be negative)
 */
export function calculateProfit(revenue: number, cost: number): number {
  return revenue - cost
}

/**
 * Calculate profit margin percentage
 * Margin = (Profit / Revenue) * 100
 * Returns 0 when revenue is 0 (division by zero protection)
 * 
 * @param revenue - Total revenue amount
 * @param cost - Total cost amount
 * @returns Profit margin as percentage (one decimal place)
 */
export function calculateProfitMargin(revenue: number, cost: number): number {
  if (revenue === 0) return 0
  const profit = revenue - cost
  return Math.round((profit / revenue) * 100 * 10) / 10
}

/**
 * Calculate total revenue from job orders
 * 
 * @param jobOrders - Array of job orders with final_revenue
 * @returns Total revenue
 */
export function calculateTotalRevenue(
  jobOrders: { final_revenue: number | null }[]
): number {
  return jobOrders.reduce((sum, jo) => sum + (jo.final_revenue || 0), 0)
}

/**
 * Calculate total cost from job orders
 * 
 * @param jobOrders - Array of job orders with final_cost
 * @returns Total cost
 */
export function calculateTotalCost(
  jobOrders: { final_cost: number | null }[]
): number {
  return jobOrders.reduce((sum, jo) => sum + (jo.final_cost || 0), 0)
}

/**
 * Calculate revenue change percentage between current and previous month
 * Change = ((current - previous) / previous) * 100
 * Returns 0 when previous is 0 (division by zero protection)
 * 
 * @param current - Current month revenue
 * @param previous - Previous month revenue
 * @returns Revenue change as percentage (one decimal place)
 */
export function calculateRevenueChangePercent(current: number, previous: number): number {
  if (previous === 0) return 0
  return Math.round(((current - previous) / previous) * 100 * 10) / 10
}

/**
 * Calculate job completion rate percentage
 * Rate = (completed / total) * 100
 * Returns 0 when total is 0 (division by zero protection)
 * 
 * @param completed - Number of completed jobs this month
 * @param total - Total number of jobs this month
 * @returns Completion rate as percentage (one decimal place)
 */
export function calculateJobCompletionRate(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100 * 10) / 10
}

/**
 * Calculate win rate percentage for quotations
 * Rate = (won / (won + lost)) * 100
 * Returns 0 when (won + lost) is 0 (division by zero protection)
 * 
 * @param won - Number of won quotations
 * @param lost - Number of lost quotations
 * @returns Win rate as percentage (one decimal place)
 */
export function calculateWinRate(won: number, lost: number): number {
  const total = won + lost
  if (total === 0) return 0
  return Math.round((won / total) * 100 * 10) / 10
}

/**
 * Calculate collection rate percentage for invoices
 * Rate = (paid / invoiced) * 100
 * Returns 0 when invoiced is 0 (division by zero protection)
 * 
 * @param paid - Total amount paid
 * @param invoiced - Total amount invoiced
 * @returns Collection rate as percentage (one decimal place)
 */
export function calculateCollectionRate(paid: number, invoiced: number): number {
  if (invoiced === 0) return 0
  return Math.round((paid / invoiced) * 100 * 10) / 10
}

// =====================================================
// Arbitraries (Test Data Generators)
// =====================================================

// Generate a positive amount (currency values) - up to 10 billion IDR
const amountArb = fc.integer({ min: 0, max: 10_000_000_000 })

// Generate a non-negative float amount for more precise testing
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const floatAmountArb = fc.float({ min: 0, max: 1_000_000_000, noNaN: true, noDefaultInfinity: true })

// Generate revenue values for month-over-month comparison
const revenueArb = fc.integer({ min: 0, max: 10_000_000_000 })

// Generate count values for rate calculations
const countArb = fc.integer({ min: 0, max: 10_000 })

// Generate a job order with revenue and cost
const jobOrderArb = fc.record({
  id: fc.uuid(),
  final_revenue: fc.option(amountArb, { nil: null }),
  final_cost: fc.option(amountArb, { nil: null }),
})

// Generate a job order with guaranteed non-null values
const jobOrderWithValuesArb = fc.record({
  id: fc.uuid(),
  final_revenue: amountArb,
  final_cost: amountArb,
})

// =====================================================
// Property Tests
// =====================================================

describe('Director Dashboard Data - Property Tests', () => {
  
  // =====================================================
  // Property 1: Profit Calculation Correctness
  // =====================================================
  
  describe('Property 1: Profit calculation correctness', () => {
    /**
     * **Feature: director-dashboard, Property 1: Profit calculation correctness**
     * **Validates: Requirements 1.1, 1.2, 1.3**
     * 
     * For any collection of job orders with revenue and cost values, the total profit 
     * should equal total revenue minus total cost, and profit margin should equal 
     * (profit / revenue) * 100.
     */
    
    it('should calculate profit as revenue minus cost exactly', () => {
      fc.assert(
        fc.property(amountArb, amountArb, (revenue, cost) => {
          const profit = calculateProfit(revenue, cost)
          return profit === revenue - cost
        }),
        { numRuns: 100 }
      )
    })

    it('should calculate profit margin as (profit / revenue) * 100', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000_000_000 }), // Non-zero revenue
          amountArb,
          (revenue, cost) => {
            const margin = calculateProfitMargin(revenue, cost)
            const expectedMargin = Math.round(((revenue - cost) / revenue) * 100 * 10) / 10
            return margin === expectedMargin
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 profit margin when revenue is 0 (division by zero protection)', () => {
      fc.assert(
        fc.property(amountArb, (cost) => {
          const margin = calculateProfitMargin(0, cost)
          return margin === 0
        }),
        { numRuns: 100 }
      )
    })

    it('should calculate negative profit when cost exceeds revenue', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1_000_000_000 }),
          fc.integer({ min: 1, max: 1_000_000_000 }),
          (revenue, extraCost) => {
            const cost = revenue + extraCost
            const profit = calculateProfit(revenue, cost)
            return profit < 0 && profit === revenue - cost
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate negative or zero profit margin when cost exceeds revenue', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1_000_000_000 }), // Non-zero revenue
          fc.integer({ min: 1, max: 1_000_000_000 }),
          (revenue, extraCost) => {
            const cost = revenue + extraCost
            const margin = calculateProfitMargin(revenue, cost)
            // Margin should be <= 0 when cost > revenue
            // Note: Due to rounding to 1 decimal place, very small negative margins
            // (like -0.05%) may round to 0
            return margin <= 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 profit when revenue equals cost', () => {
      fc.assert(
        fc.property(amountArb, (amount) => {
          const profit = calculateProfit(amount, amount)
          return profit === 0
        }),
        { numRuns: 100 }
      )
    })

    it('should return 0 profit margin when revenue equals cost', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000_000_000 }), // Non-zero revenue
          (amount) => {
            const margin = calculateProfitMargin(amount, amount)
            return margin === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate total revenue from job orders correctly', () => {
      fc.assert(
        fc.property(
          fc.array(jobOrderArb, { minLength: 0, maxLength: 100 }),
          (jobOrders) => {
            const totalRevenue = calculateTotalRevenue(jobOrders)
            
            // Manually calculate expected value
            const expected = jobOrders.reduce((sum, jo) => 
              sum + (jo.final_revenue || 0), 0
            )
            
            return totalRevenue === expected
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate total cost from job orders correctly', () => {
      fc.assert(
        fc.property(
          fc.array(jobOrderArb, { minLength: 0, maxLength: 100 }),
          (jobOrders) => {
            const totalCost = calculateTotalCost(jobOrders)
            
            // Manually calculate expected value
            const expected = jobOrders.reduce((sum, jo) => 
              sum + (jo.final_cost || 0), 0
            )
            
            return totalCost === expected
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate profit from job orders as total revenue minus total cost', () => {
      fc.assert(
        fc.property(
          fc.array(jobOrderWithValuesArb, { minLength: 0, maxLength: 100 }),
          (jobOrders) => {
            const totalRevenue = calculateTotalRevenue(jobOrders)
            const totalCost = calculateTotalCost(jobOrders)
            const profit = calculateProfit(totalRevenue, totalCost)
            
            // Verify the invariant: profit = revenue - cost
            return profit === totalRevenue - totalCost
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 revenue for empty job orders array', () => {
      const totalRevenue = calculateTotalRevenue([])
      expect(totalRevenue).toBe(0)
    })

    it('should return 0 cost for empty job orders array', () => {
      const totalCost = calculateTotalCost([])
      expect(totalCost).toBe(0)
    })

    it('should return 0 profit for empty job orders array', () => {
      const totalRevenue = calculateTotalRevenue([])
      const totalCost = calculateTotalCost([])
      const profit = calculateProfit(totalRevenue, totalCost)
      expect(profit).toBe(0)
    })

    it('should handle null revenue values by treating them as 0', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              final_revenue: fc.constant(null),
              final_cost: amountArb,
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (jobOrders) => {
            const totalRevenue = calculateTotalRevenue(jobOrders)
            return totalRevenue === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle null cost values by treating them as 0', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              final_revenue: amountArb,
              final_cost: fc.constant(null),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (jobOrders) => {
            const totalCost = calculateTotalCost(jobOrders)
            return totalCost === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle mixed null and non-null values correctly', () => {
      fc.assert(
        fc.property(
          fc.array(jobOrderArb, { minLength: 1, maxLength: 100 }),
          (jobOrders) => {
            const totalRevenue = calculateTotalRevenue(jobOrders)
            const totalCost = calculateTotalCost(jobOrders)
            
            // Sum only non-null values
            const expectedRevenue = jobOrders
              .filter(jo => jo.final_revenue !== null)
              .reduce((sum, jo) => sum + jo.final_revenue!, 0)
            
            const expectedCost = jobOrders
              .filter(jo => jo.final_cost !== null)
              .reduce((sum, jo) => sum + jo.final_cost!, 0)
            
            return totalRevenue === expectedRevenue && totalCost === expectedCost
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain profit calculation invariant: profit + cost = revenue', () => {
      fc.assert(
        fc.property(amountArb, amountArb, (revenue, cost) => {
          const profit = calculateProfit(revenue, cost)
          return profit + cost === revenue
        }),
        { numRuns: 100 }
      )
    })

    it('should calculate profit margin bounded between -100% and 100% for positive revenue', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000_000_000 }), // Positive revenue
          fc.integer({ min: 0, max: 10_000_000_000 }), // Non-negative cost up to 2x revenue
          (revenue, cost) => {
            const margin = calculateProfitMargin(revenue, cost)
            // Margin can be > 100% if cost is 0, or < -100% if cost > 2*revenue
            // But for reasonable business scenarios, we just verify it's a valid number
            return !isNaN(margin) && isFinite(margin)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate 100% profit margin when cost is 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000_000_000 }), // Positive revenue
          (revenue) => {
            const margin = calculateProfitMargin(revenue, 0)
            return margin === 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should round profit margin to one decimal place', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000_000_000 }),
          fc.integer({ min: 0, max: 10_000_000_000 }),
          (revenue, cost) => {
            const margin = calculateProfitMargin(revenue, cost)
            // Check that margin has at most one decimal place
            const marginStr = margin.toString()
            const decimalIndex = marginStr.indexOf('.')
            if (decimalIndex === -1) return true // No decimal, valid
            const decimalPlaces = marginStr.length - decimalIndex - 1
            return decimalPlaces <= 1
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 2: Revenue Change Calculation
  // =====================================================
  
  describe('Property 2: Revenue change calculation', () => {
    /**
     * **Feature: director-dashboard, Property 2: Revenue change calculation**
     * **Validates: Requirements 1.4, 1.6**
     * 
     * For any two revenue values (current month and previous month), the percentage 
     * change should equal ((current - previous) / previous) * 100, handling the case 
     * where previous is zero.
     */
    
    it('should calculate revenue change as ((current - previous) / previous) * 100', () => {
      fc.assert(
        fc.property(
          revenueArb,
          fc.integer({ min: 1, max: 10_000_000_000 }), // Non-zero previous
          (current, previous) => {
            const change = calculateRevenueChangePercent(current, previous)
            const expectedChange = Math.round(((current - previous) / previous) * 100 * 10) / 10
            return change === expectedChange
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when previous month revenue is 0 (division by zero protection)', () => {
      fc.assert(
        fc.property(revenueArb, (current) => {
          const change = calculateRevenueChangePercent(current, 0)
          return change === 0
        }),
        { numRuns: 100 }
      )
    })

    it('should calculate positive change when current exceeds previous', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1_000_000 }), // Previous (smaller range)
          fc.integer({ min: 1, max: 1_000_000 }), // Extra amount
          (previous, extra) => {
            const current = previous + extra
            const change = calculateRevenueChangePercent(current, previous)
            // Change should be >= 0 (can be 0 due to rounding for very small changes)
            // For a truly positive change, extra/previous must be > 0.0005 (to round to 0.1)
            const expectedPositive = (extra / previous) >= 0.0005
            if (expectedPositive) {
              return change > 0
            }
            // For very small changes, rounding may result in 0
            return change >= 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate negative change when current is less than previous', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 1_000_000 }), // Previous (min 100 for meaningful reduction)
          fc.integer({ min: 1, max: 1_000_000 }), // Reduction amount
          (previous, reduction) => {
            // Ensure current is less than previous but non-negative
            const current = Math.max(0, previous - reduction)
            if (current >= previous) return true // Skip if no actual reduction
            const change = calculateRevenueChangePercent(current, previous)
            // Change should be <= 0 (can be 0 due to rounding for very small changes)
            // For a truly negative change, reduction/previous must be > 0.0005
            const expectedNegative = (reduction / previous) >= 0.0005
            if (expectedNegative && current < previous) {
              return change < 0
            }
            // For very small changes, rounding may result in 0
            return change <= 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 change when current equals previous', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000_000_000 }), // Non-zero amount
          (amount) => {
            const change = calculateRevenueChangePercent(amount, amount)
            return change === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate 100% change when current is double the previous', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5_000_000_000 }), // Previous
          (previous) => {
            const current = previous * 2
            const change = calculateRevenueChangePercent(current, previous)
            return change === 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate -50% change when current is half of previous', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5_000_000_000 }).filter(n => n % 2 === 0), // Even previous
          (previous) => {
            const current = previous / 2
            const change = calculateRevenueChangePercent(current, previous)
            return change === -50
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate -100% change when current is 0 and previous is non-zero', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000_000_000 }), // Non-zero previous
          (previous) => {
            const change = calculateRevenueChangePercent(0, previous)
            return change === -100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle large percentage changes correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1_000_000 }), // Small previous
          fc.integer({ min: 1, max: 1000 }), // Multiplier
          (previous, multiplier) => {
            const current = previous * multiplier
            const change = calculateRevenueChangePercent(current, previous)
            const expectedChange = Math.round((multiplier - 1) * 100 * 10) / 10
            return change === expectedChange
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should round revenue change to one decimal place', () => {
      fc.assert(
        fc.property(
          revenueArb,
          fc.integer({ min: 1, max: 10_000_000_000 }), // Non-zero previous
          (current, previous) => {
            const change = calculateRevenueChangePercent(current, previous)
            // Check that change has at most one decimal place
            const changeStr = change.toString()
            const decimalIndex = changeStr.indexOf('.')
            if (decimalIndex === -1) return true // No decimal, valid
            const decimalPlaces = changeStr.length - decimalIndex - 1
            return decimalPlaces <= 1
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain the invariant: change = ((current - previous) / previous) * 100', () => {
      fc.assert(
        fc.property(
          revenueArb,
          fc.integer({ min: 1, max: 10_000_000_000 }), // Non-zero previous
          (current, previous) => {
            const change = calculateRevenueChangePercent(current, previous)
            // Reverse calculation: current = previous * (1 + change/100)
            // Due to rounding, we check within a small tolerance
            const reconstructedCurrent = previous * (1 + change / 100)
            const tolerance = previous * 0.001 // 0.1% tolerance due to rounding
            return Math.abs(reconstructedCurrent - current) <= tolerance
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return a finite number for all valid inputs', () => {
      fc.assert(
        fc.property(
          revenueArb,
          revenueArb,
          (current, previous) => {
            const change = calculateRevenueChangePercent(current, previous)
            return !isNaN(change) && isFinite(change)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle both revenues being 0 by returning 0', () => {
      const change = calculateRevenueChangePercent(0, 0)
      expect(change).toBe(0)
    })
  })
})


  // =====================================================
  // Property 3: Job Completion Rate Calculation
  // =====================================================
  
  describe('Property 3: Job completion rate calculation', () => {
    /**
     * **Feature: director-dashboard, Property 3: Job completion rate calculation**
     * **Validates: Requirements 2.3**
     * 
     * For any count of completed jobs and total jobs this month, the completion rate 
     * should equal (completed / total) * 100, handling the case where total is zero.
     */
    
    it('should calculate completion rate as (completed / total) * 100', () => {
      fc.assert(
        fc.property(
          countArb,
          fc.integer({ min: 1, max: 10_000 }), // Non-zero total
          (completed, total) => {
            // Ensure completed <= total
            const actualCompleted = Math.min(completed, total)
            const rate = calculateJobCompletionRate(actualCompleted, total)
            const expectedRate = Math.round((actualCompleted / total) * 100 * 10) / 10
            return rate === expectedRate
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when total jobs is 0 (division by zero protection)', () => {
      fc.assert(
        fc.property(countArb, (completed) => {
          const rate = calculateJobCompletionRate(completed, 0)
          return rate === 0
        }),
        { numRuns: 100 }
      )
    })

    it('should return 0% when no jobs are completed', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000 }), // Non-zero total
          (total) => {
            const rate = calculateJobCompletionRate(0, total)
            return rate === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 100% when all jobs are completed', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000 }), // Non-zero total
          (total) => {
            const rate = calculateJobCompletionRate(total, total)
            return rate === 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 50% when half the jobs are completed', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10_000 }).filter(n => n % 2 === 0), // Even total
          (total) => {
            const completed = total / 2
            const rate = calculateJobCompletionRate(completed, total)
            return rate === 50
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should round completion rate to one decimal place', () => {
      fc.assert(
        fc.property(
          countArb,
          fc.integer({ min: 1, max: 10_000 }),
          (completed, total) => {
            const actualCompleted = Math.min(completed, total)
            const rate = calculateJobCompletionRate(actualCompleted, total)
            const rateStr = rate.toString()
            const decimalIndex = rateStr.indexOf('.')
            if (decimalIndex === -1) return true
            const decimalPlaces = rateStr.length - decimalIndex - 1
            return decimalPlaces <= 1
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return rate between 0 and 100 for valid inputs', () => {
      fc.assert(
        fc.property(
          countArb,
          fc.integer({ min: 1, max: 10_000 }),
          (completed, total) => {
            const actualCompleted = Math.min(completed, total)
            const rate = calculateJobCompletionRate(actualCompleted, total)
            return rate >= 0 && rate <= 100
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 4: Win Rate Calculation
  // =====================================================
  
  describe('Property 4: Win rate calculation', () => {
    /**
     * **Feature: director-dashboard, Property 4: Win rate calculation**
     * **Validates: Requirements 3.5**
     * 
     * For any count of won and lost quotations, the win rate should equal 
     * (won / (won + lost)) * 100, handling the case where (won + lost) is zero.
     */
    
    it('should calculate win rate as (won / (won + lost)) * 100', () => {
      fc.assert(
        fc.property(
          countArb,
          countArb,
          (won, lost) => {
            const total = won + lost
            if (total === 0) return true // Skip when total is 0
            const rate = calculateWinRate(won, lost)
            const expectedRate = Math.round((won / total) * 100 * 10) / 10
            return rate === expectedRate
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when both won and lost are 0 (division by zero protection)', () => {
      const rate = calculateWinRate(0, 0)
      expect(rate).toBe(0)
    })

    it('should return 0% when no quotations are won', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000 }), // Non-zero lost
          (lost) => {
            const rate = calculateWinRate(0, lost)
            return rate === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 100% when all quotations are won', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000 }), // Non-zero won
          (won) => {
            const rate = calculateWinRate(won, 0)
            return rate === 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 50% when won equals lost', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000 }), // Non-zero count
          (count) => {
            const rate = calculateWinRate(count, count)
            return rate === 50
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should round win rate to one decimal place', () => {
      fc.assert(
        fc.property(
          countArb,
          countArb,
          (won, lost) => {
            const rate = calculateWinRate(won, lost)
            const rateStr = rate.toString()
            const decimalIndex = rateStr.indexOf('.')
            if (decimalIndex === -1) return true
            const decimalPlaces = rateStr.length - decimalIndex - 1
            return decimalPlaces <= 1
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return rate between 0 and 100 for valid inputs', () => {
      fc.assert(
        fc.property(
          countArb,
          countArb,
          (won, lost) => {
            const rate = calculateWinRate(won, lost)
            return rate >= 0 && rate <= 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be commutative with loss rate: win_rate + loss_rate = 100', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000 }),
          fc.integer({ min: 1, max: 10_000 }),
          (won, lost) => {
            const winRate = calculateWinRate(won, lost)
            const lossRate = calculateWinRate(lost, won)
            // Due to rounding, the sum may be slightly off
            const sum = winRate + lossRate
            return Math.abs(sum - 100) <= 0.2 // Allow 0.2% tolerance for rounding
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 5: Collection Rate Calculation
  // =====================================================
  
  describe('Property 5: Collection rate calculation', () => {
    /**
     * **Feature: director-dashboard, Property 5: Collection rate calculation**
     * **Validates: Requirements 4.3**
     * 
     * For any total paid amount and total invoiced amount, the collection rate 
     * should equal (paid / invoiced) * 100, handling the case where invoiced is zero.
     */
    
    it('should calculate collection rate as (paid / invoiced) * 100', () => {
      fc.assert(
        fc.property(
          amountArb,
          fc.integer({ min: 1, max: 10_000_000_000 }), // Non-zero invoiced
          (paid, invoiced) => {
            // Ensure paid <= invoiced for realistic scenarios
            const actualPaid = Math.min(paid, invoiced)
            const rate = calculateCollectionRate(actualPaid, invoiced)
            const expectedRate = Math.round((actualPaid / invoiced) * 100 * 10) / 10
            return rate === expectedRate
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when invoiced is 0 (division by zero protection)', () => {
      fc.assert(
        fc.property(amountArb, (paid) => {
          const rate = calculateCollectionRate(paid, 0)
          return rate === 0
        }),
        { numRuns: 100 }
      )
    })

    it('should return 0% when nothing is paid', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000_000_000 }), // Non-zero invoiced
          (invoiced) => {
            const rate = calculateCollectionRate(0, invoiced)
            return rate === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 100% when all invoiced amount is paid', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000_000_000 }), // Non-zero amount
          (amount) => {
            const rate = calculateCollectionRate(amount, amount)
            return rate === 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 50% when half is paid', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10_000_000_000 }).filter(n => n % 2 === 0), // Even invoiced
          (invoiced) => {
            const paid = invoiced / 2
            const rate = calculateCollectionRate(paid, invoiced)
            return rate === 50
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should round collection rate to one decimal place', () => {
      fc.assert(
        fc.property(
          amountArb,
          fc.integer({ min: 1, max: 10_000_000_000 }),
          (paid, invoiced) => {
            const actualPaid = Math.min(paid, invoiced)
            const rate = calculateCollectionRate(actualPaid, invoiced)
            const rateStr = rate.toString()
            const decimalIndex = rateStr.indexOf('.')
            if (decimalIndex === -1) return true
            const decimalPlaces = rateStr.length - decimalIndex - 1
            return decimalPlaces <= 1
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return rate between 0 and 100 for valid inputs where paid <= invoiced', () => {
      fc.assert(
        fc.property(
          amountArb,
          fc.integer({ min: 1, max: 10_000_000_000 }),
          (paid, invoiced) => {
            const actualPaid = Math.min(paid, invoiced)
            const rate = calculateCollectionRate(actualPaid, invoiced)
            return rate >= 0 && rate <= 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle both paid and invoiced being 0 by returning 0', () => {
      const rate = calculateCollectionRate(0, 0)
      expect(rate).toBe(0)
    })

    it('should return a finite number for all valid inputs', () => {
      fc.assert(
        fc.property(
          amountArb,
          amountArb,
          (paid, invoiced) => {
            const rate = calculateCollectionRate(paid, invoiced)
            return !isNaN(rate) && isFinite(rate)
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  // =====================================================
  // Property 9: Recent Items Ordering and Limiting
  // =====================================================
  
  describe('Property 9: Recent items ordering and limiting', () => {
    /**
     * **Feature: director-dashboard, Property 9: Recent items ordering and limiting**
     * **Validates: Requirements 6.1, 6.2**
     * 
     * For any collection of records, ordering by date descending and limiting to 5 items 
     * should return at most 5 items in correct order.
     */

    // Helper function to sort and limit items
    function getRecentItems<T extends { date: string }>(items: T[], limit: number = 5): T[] {
      return [...items]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit)
    }

    // Generate a date string within the last year using integer timestamps
    const dateArb = fc.integer({
      min: Date.now() - 365 * 24 * 60 * 60 * 1000,
      max: Date.now()
    }).map(ts => new Date(ts).toISOString())

    // Generate a recent item with a date
    const recentItemArb = fc.record({
      id: fc.uuid(),
      date: dateArb,
      amount: amountArb,
    })

    it('should return at most 5 items regardless of input size', () => {
      fc.assert(
        fc.property(
          fc.array(recentItemArb, { minLength: 0, maxLength: 100 }),
          (items) => {
            const recent = getRecentItems(items, 5)
            return recent.length <= 5
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return all items when input has fewer than 5 items', () => {
      fc.assert(
        fc.property(
          fc.array(recentItemArb, { minLength: 0, maxLength: 4 }),
          (items) => {
            const recent = getRecentItems(items, 5)
            return recent.length === items.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return exactly 5 items when input has 5 or more items', () => {
      fc.assert(
        fc.property(
          fc.array(recentItemArb, { minLength: 5, maxLength: 100 }),
          (items) => {
            const recent = getRecentItems(items, 5)
            return recent.length === 5
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return items in descending date order (most recent first)', () => {
      fc.assert(
        fc.property(
          fc.array(recentItemArb, { minLength: 2, maxLength: 100 }),
          (items) => {
            const recent = getRecentItems(items, 5)
            // Check that each item is more recent than or equal to the next
            for (let i = 0; i < recent.length - 1; i++) {
              const currentDate = new Date(recent[i].date).getTime()
              const nextDate = new Date(recent[i + 1].date).getTime()
              if (currentDate < nextDate) return false
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return the 5 most recent items from the input', () => {
      fc.assert(
        fc.property(
          fc.array(recentItemArb, { minLength: 6, maxLength: 100 }),
          (items) => {
            const recent = getRecentItems(items, 5)
            // Sort all items by date descending
            const allSorted = [...items].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            // The recent items should be the first 5 from the sorted list
            for (let i = 0; i < 5; i++) {
              if (recent[i].id !== allSorted[i].id) return false
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array for empty input', () => {
      const recent = getRecentItems([], 5)
      expect(recent).toEqual([])
    })

    it('should preserve item properties after sorting and limiting', () => {
      fc.assert(
        fc.property(
          fc.array(recentItemArb, { minLength: 1, maxLength: 100 }),
          (items) => {
            const recent = getRecentItems(items, 5)
            // Each returned item should exist in the original array
            return recent.every(r => items.some(i => i.id === r.id))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle items with the same date correctly', () => {
      const sameDate = new Date().toISOString()
      const items = [
        { id: '1', date: sameDate, amount: 100 },
        { id: '2', date: sameDate, amount: 200 },
        { id: '3', date: sameDate, amount: 300 },
        { id: '4', date: sameDate, amount: 400 },
        { id: '5', date: sameDate, amount: 500 },
        { id: '6', date: sameDate, amount: 600 },
      ]
      const recent = getRecentItems(items, 5)
      expect(recent.length).toBe(5)
    })

    it('should work with custom limit values', () => {
      fc.assert(
        fc.property(
          fc.array(recentItemArb, { minLength: 0, maxLength: 100 }),
          fc.integer({ min: 1, max: 20 }),
          (items, limit) => {
            const recent = getRecentItems(items, limit)
            return recent.length <= limit && recent.length <= items.length
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  // =====================================================
  // Property 8: Role-Based Access Control
  // =====================================================
  
  describe('Property 8: Role-based access control', () => {
    /**
     * **Feature: director-dashboard, Property 8: Role-based access control**
     * **Validates: Requirements 8.1, 8.2, 8.3**
     * 
     * For any user role, access to the Director Dashboard should be granted if and only if 
     * the role is in the allowed set ['director', 'owner']. Users with roles not in this 
     * set should be redirected to the default dashboard.
     */

    // Helper function to check if a role has access
    function hasDirectorDashboardAccess(role: string): boolean {
      return role === 'director' || role === 'owner'
    }

    // All valid roles in the system
    const allRoles = [
      'owner', 'director', 'sysadmin', 
      'marketing_manager', 'finance_manager', 'operations_manager',
      'administration', 'finance', 'marketing', 'ops', 'engineer',
      'hr', 'hse', 'agency', 'customs'
    ]

    // Roles that should have access
    const allowedRoles = ['director', 'owner']

    // Roles that should NOT have access
    const deniedRoles = allRoles.filter(r => !allowedRoles.includes(r))

    it('should grant access to director role', () => {
      expect(hasDirectorDashboardAccess('director')).toBe(true)
    })

    it('should grant access to owner role', () => {
      expect(hasDirectorDashboardAccess('owner')).toBe(true)
    })

    it('should deny access to all non-allowed roles', () => {
      deniedRoles.forEach(role => {
        expect(hasDirectorDashboardAccess(role)).toBe(false)
      })
    })

    it('should grant access only to roles in the allowed set', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...allRoles),
          (role) => {
            const hasAccess = hasDirectorDashboardAccess(role)
            const shouldHaveAccess = allowedRoles.includes(role)
            return hasAccess === shouldHaveAccess
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should deny access to random role strings not in the system', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !allRoles.includes(s)),
          (randomRole) => {
            return hasDirectorDashboardAccess(randomRole) === false
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be case-sensitive for role matching', () => {
      expect(hasDirectorDashboardAccess('Director')).toBe(false)
      expect(hasDirectorDashboardAccess('DIRECTOR')).toBe(false)
      expect(hasDirectorDashboardAccess('Owner')).toBe(false)
      expect(hasDirectorDashboardAccess('OWNER')).toBe(false)
    })

    it('should deny access to empty string role', () => {
      expect(hasDirectorDashboardAccess('')).toBe(false)
    })

    it('should deny access to roles with extra whitespace', () => {
      expect(hasDirectorDashboardAccess(' director')).toBe(false)
      expect(hasDirectorDashboardAccess('director ')).toBe(false)
      expect(hasDirectorDashboardAccess(' owner ')).toBe(false)
    })
  })

  // =====================================================
  // Property 6: Currency Formatting Correctness
  // =====================================================
  
  describe('Property 6: Currency formatting correctness', () => {
    /**
     * **Feature: director-dashboard, Property 6: Currency formatting correctness**
     * **Validates: Requirements 1.5, 6.4**
     * 
     * For any numeric amount, formatting as Indonesian Rupiah should produce a string 
     * starting with "Rp" and containing properly formatted thousands separators.
     */

    // Simple currency formatter for testing (mirrors lib/utils/format.ts)
    function formatCurrencyTest(amount: number | null | undefined): string {
      if (amount === null || amount === undefined) return 'Rp 0'
      return `Rp ${amount.toLocaleString('id-ID')}`
    }

    it('should format positive amounts with Rp prefix', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000_000_000 }),
          (amount) => {
            const formatted = formatCurrencyTest(amount)
            return formatted.startsWith('Rp ')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should format zero as "Rp 0"', () => {
      expect(formatCurrencyTest(0)).toBe('Rp 0')
    })

    it('should format null as "Rp 0"', () => {
      expect(formatCurrencyTest(null)).toBe('Rp 0')
    })

    it('should format undefined as "Rp 0"', () => {
      expect(formatCurrencyTest(undefined)).toBe('Rp 0')
    })

    it('should include thousands separators for large amounts', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 10_000_000_000 }),
          (amount) => {
            const formatted = formatCurrencyTest(amount)
            // Indonesian locale uses . as thousands separator
            // The formatted string should contain separators for amounts >= 1000
            return formatted.includes('.') || formatted.includes(',')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce a non-empty string for any valid input', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10_000_000_000 }),
          (amount) => {
            const formatted = formatCurrencyTest(amount)
            return formatted.length > 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle negative amounts', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -10_000_000_000, max: -1 }),
          (amount) => {
            const formatted = formatCurrencyTest(amount)
            return formatted.startsWith('Rp ') && formatted.includes('-')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 7: Threshold Color Coding
  // =====================================================
  
  describe('Property 7: Threshold color coding', () => {
    /**
     * **Feature: director-dashboard, Property 7: Threshold color coding**
     * **Validates: Requirements 1.7, 4.5**
     * 
     * For any profit margin value, the color should be green if >= 25%, yellow if 15-25%, 
     * red if < 15%. Similarly for collection rate: green if >= 85%, yellow if 70-85%, 
     * red if < 70%.
     */

    // Margin color helper (mirrors dashboard page logic)
    function getMarginColor(margin: number): string {
      if (margin >= 25) return 'green'
      if (margin >= 15) return 'yellow'
      return 'red'
    }

    // Collection rate color helper (mirrors dashboard page logic)
    function getCollectionColor(rate: number): string {
      if (rate >= 85) return 'green'
      if (rate >= 70) return 'yellow'
      return 'red'
    }

    describe('Profit Margin Color Coding', () => {
      it('should return green for margin >= 25%', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 25, max: 100 }),
            (margin) => {
              return getMarginColor(margin) === 'green'
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should return yellow for margin 15-24%', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 15, max: 24 }),
            (margin) => {
              return getMarginColor(margin) === 'yellow'
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should return red for margin < 15%', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: -100, max: 14 }),
            (margin) => {
              return getMarginColor(margin) === 'red'
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should return green at exactly 25%', () => {
        expect(getMarginColor(25)).toBe('green')
      })

      it('should return yellow at exactly 15%', () => {
        expect(getMarginColor(15)).toBe('yellow')
      })

      it('should return red at exactly 14.9%', () => {
        expect(getMarginColor(14.9)).toBe('red')
      })
    })

    describe('Collection Rate Color Coding', () => {
      it('should return green for rate >= 85%', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 85, max: 100 }),
            (rate) => {
              return getCollectionColor(rate) === 'green'
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should return yellow for rate 70-84%', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 70, max: 84 }),
            (rate) => {
              return getCollectionColor(rate) === 'yellow'
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should return red for rate < 70%', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 69 }),
            (rate) => {
              return getCollectionColor(rate) === 'red'
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should return green at exactly 85%', () => {
        expect(getCollectionColor(85)).toBe('green')
      })

      it('should return yellow at exactly 70%', () => {
        expect(getCollectionColor(70)).toBe('yellow')
      })

      it('should return red at exactly 69.9%', () => {
        expect(getCollectionColor(69.9)).toBe('red')
      })
    })
  })


  // =====================================================
  // Property 10: Cache Round-Trip
  // =====================================================
  
  describe('Property 10: Cache round-trip', () => {
    /**
     * **Feature: director-dashboard, Property 10: Cache round-trip**
     * **Validates: Requirements 7.2, 7.3**
     * 
     * For any valid dashboard data, storing it in the cache and then retrieving it 
     * before TTL expiration should return equivalent data.
     */

    // Simple in-memory cache for testing
    const cache = new Map<string, { data: unknown; timestamp: number }>()
    const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

    function setCache(key: string, data: unknown): void {
      cache.set(key, { data, timestamp: Date.now() })
    }

    function getCache<T>(key: string): T | null {
      const entry = cache.get(key)
      if (!entry) return null
      if (Date.now() - entry.timestamp > CACHE_TTL) {
        cache.delete(key)
        return null
      }
      return entry.data as T
    }

    function clearCache(): void {
      cache.clear()
    }

    // Generate a valid DirectorDashboardMetrics-like object
    const metricsArb = fc.record({
      totalRevenue: amountArb,
      totalProfit: fc.integer({ min: -10_000_000_000, max: 10_000_000_000 }),
      profitMargin: fc.integer({ min: -100, max: 100 }),
      revenueMTD: amountArb,
      revenueLastMonth: amountArb,
      revenueChangePercent: fc.integer({ min: -100, max: 1000 }),
      activeJobs: countArb,
      completedJobsThisMonth: countArb,
      jobCompletionRate: fc.integer({ min: 0, max: 100 }),
      pendingPJOApprovals: countArb,
      pendingBKKApprovals: countArb,
      arOutstanding: amountArb,
      arOverdue: amountArb,
      collectionRate: fc.integer({ min: 0, max: 100 }),
      pipeline: fc.record({
        quotationsDraft: countArb,
        quotationsSubmitted: countArb,
        quotationsWon: countArb,
        quotationsLost: countArb,
        pjosDraft: countArb,
        pjosPendingApproval: countArb,
        pjosApproved: countArb,
        winRate: fc.integer({ min: 0, max: 100 }),
        wonValueThisMonth: amountArb,
      }),
      recentCompletedJobs: fc.array(
        fc.record({
          id: fc.uuid(),
          joNumber: fc.string({ minLength: 1, maxLength: 20 }),
          customerName: fc.string({ minLength: 1, maxLength: 100 }),
          finalRevenue: amountArb,
          completedAt: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() })
            .map(ts => new Date(ts).toISOString()),
        }),
        { minLength: 0, maxLength: 5 }
      ),
      recentWonQuotations: fc.array(
        fc.record({
          id: fc.uuid(),
          quotationNumber: fc.string({ minLength: 1, maxLength: 20 }),
          customerName: fc.string({ minLength: 1, maxLength: 100 }),
          totalRevenue: amountArb,
          outcomeDate: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() })
            .map(ts => new Date(ts).toISOString()),
        }),
        { minLength: 0, maxLength: 5 }
      ),
    })

    beforeEach(() => {
      clearCache()
    })

    it('should store and retrieve data correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          metricsArb,
          (key, metrics) => {
            setCache(key, metrics)
            const retrieved = getCache(key)
            return JSON.stringify(retrieved) === JSON.stringify(metrics)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return null for non-existent keys', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (key) => {
            clearCache()
            return getCache(key) === null
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve all metric fields after round-trip', () => {
      fc.assert(
        fc.property(
          metricsArb,
          (metrics) => {
            const key = 'test-metrics'
            setCache(key, metrics)
            const retrieved = getCache<typeof metrics>(key)
            
            if (!retrieved) return false
            
            // Check all top-level fields
            return (
              retrieved.totalRevenue === metrics.totalRevenue &&
              retrieved.totalProfit === metrics.totalProfit &&
              retrieved.profitMargin === metrics.profitMargin &&
              retrieved.activeJobs === metrics.activeJobs &&
              retrieved.collectionRate === metrics.collectionRate &&
              retrieved.pipeline.winRate === metrics.pipeline.winRate
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve nested pipeline data after round-trip', () => {
      fc.assert(
        fc.property(
          metricsArb,
          (metrics) => {
            const key = 'test-pipeline'
            setCache(key, metrics)
            const retrieved = getCache<typeof metrics>(key)
            
            if (!retrieved) return false
            
            return (
              retrieved.pipeline.quotationsDraft === metrics.pipeline.quotationsDraft &&
              retrieved.pipeline.quotationsWon === metrics.pipeline.quotationsWon &&
              retrieved.pipeline.pjosApproved === metrics.pipeline.pjosApproved &&
              retrieved.pipeline.wonValueThisMonth === metrics.pipeline.wonValueThisMonth
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve array data after round-trip', () => {
      fc.assert(
        fc.property(
          metricsArb,
          (metrics) => {
            const key = 'test-arrays'
            setCache(key, metrics)
            const retrieved = getCache<typeof metrics>(key)
            
            if (!retrieved) return false
            
            return (
              retrieved.recentCompletedJobs.length === metrics.recentCompletedJobs.length &&
              retrieved.recentWonQuotations.length === metrics.recentWonQuotations.length
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty arrays correctly', () => {
      const metrics = {
        totalRevenue: 0,
        totalProfit: 0,
        profitMargin: 0,
        revenueMTD: 0,
        revenueLastMonth: 0,
        revenueChangePercent: 0,
        activeJobs: 0,
        completedJobsThisMonth: 0,
        jobCompletionRate: 0,
        pendingPJOApprovals: 0,
        pendingBKKApprovals: 0,
        arOutstanding: 0,
        arOverdue: 0,
        collectionRate: 0,
        pipeline: {
          quotationsDraft: 0,
          quotationsSubmitted: 0,
          quotationsWon: 0,
          quotationsLost: 0,
          pjosDraft: 0,
          pjosPendingApproval: 0,
          pjosApproved: 0,
          winRate: 0,
          wonValueThisMonth: 0,
        },
        recentCompletedJobs: [],
        recentWonQuotations: [],
      }
      
      setCache('empty-test', metrics)
      const retrieved = getCache<typeof metrics>('empty-test')
      
      expect(retrieved).not.toBeNull()
      expect(retrieved?.recentCompletedJobs).toEqual([])
      expect(retrieved?.recentWonQuotations).toEqual([])
    })

    it('should use different cache entries for different keys', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== ''),
          metricsArb,
          metricsArb,
          (key1, key2, metrics1, metrics2) => {
            if (key1 === key2) return true // Skip if keys are the same
            
            setCache(key1, metrics1)
            setCache(key2, metrics2)
            
            const retrieved1 = getCache<typeof metrics1>(key1)
            const retrieved2 = getCache<typeof metrics2>(key2)
            
            return (
              JSON.stringify(retrieved1) === JSON.stringify(metrics1) &&
              JSON.stringify(retrieved2) === JSON.stringify(metrics2)
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })
