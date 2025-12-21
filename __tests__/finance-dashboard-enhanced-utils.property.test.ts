// =====================================================
// v0.9.8: Finance Dashboard Enhanced - Property-Based Tests
// =====================================================
// Feature: finance-dashboard-enhanced

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  // Cash flow calculations
  calculateNetCash,
  calculateRevenueMTD,
  calculateProfitMargin,
  calculatePercentageChange,
  // Staleness detection
  isStale,
  STALENESS_THRESHOLD_MS,
  // AR aggregation
  calculateTotalAR,
  calculateOverdueAR,
  countOutstandingARInvoices,
  classifyAgingBucket,
  groupByAgingBucket,
  // AP aggregation
  calculateTotalAP,
  calculateOverdueAP,
  countPendingVerification,
  groupAPByAgingBucket,
  // BKK aggregation
  countPendingBKK,
  calculatePendingBKKAmount,
  getPendingBKKList,
  // Revenue trend
  groupRevenueByMonth,
  filterLastNMonths,
  getRevenueTrend,
  // Types
  AgingBucketLabel,
  AGING_BUCKET_ORDER,
} from '@/lib/finance-dashboard-enhanced-utils'
import { format, addDays, subDays, subMonths } from 'date-fns'

// =====================================================
// Arbitraries (Test Data Generators)
// =====================================================

// Generate positive amounts (currency values) - using integer for precision
const amountArb = fc.integer({ min: 0, max: 1_000_000_000 })
const positiveAmountArb = fc.integer({ min: 1, max: 1_000_000_000 })

// Generate invoice statuses
const invoiceStatusArb = fc.constantFrom('draft', 'sent', 'paid', 'overdue', 'cancelled')
const vendorInvoiceStatusArb = fc.constantFrom('received', 'verified', 'approved', 'paid', 'cancelled')
const bkkStatusArb = fc.constantFrom('pending', 'approved', 'rejected', 'paid')

// Generate date strings
const dateArb = fc.integer({ min: -365, max: 365 }).map(days => {
  const date = addDays(new Date(), days)
  return format(date, 'yyyy-MM-dd')
})

// Generate date in the past (for due dates that are overdue)
const pastDateArb = fc.integer({ min: 1, max: 365 }).map(days => {
  const date = subDays(new Date(), days)
  return format(date, 'yyyy-MM-dd')
})

// Generate date in the future (for due dates that are current)
const futureDateArb = fc.integer({ min: 0, max: 365 }).map(days => {
  const date = addDays(new Date(), days)
  return format(date, 'yyyy-MM-dd')
})

// Generate invoice date within current month
const currentMonthDateArb = fc.integer({ min: 1, max: 28 }).map(day => {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth(), day)
  return format(date, 'yyyy-MM-dd')
})

// Generate invoice date in previous month
const previousMonthDateArb = fc.integer({ min: 1, max: 28 }).map(day => {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth() - 1, day)
  return format(date, 'yyyy-MM-dd')
})

// Generate AR invoice
const arInvoiceArb = fc.record({
  total_amount: positiveAmountArb,
  amount_paid: fc.option(amountArb, { nil: null }),
  status: invoiceStatusArb,
  due_date: dateArb,
  invoice_date: dateArb,
})

// Generate vendor invoice
const vendorInvoiceArb = fc.record({
  amount_due: positiveAmountArb,
  status: vendorInvoiceStatusArb,
  due_date: fc.option(dateArb, { nil: null }),
})

// Generate BKK record - use integer offset for date generation to avoid invalid date issues
const bkkArb = fc.record({
  id: fc.uuid(),
  bkk_number: fc.string({ minLength: 5, maxLength: 20 }),
  status: bkkStatusArb,
  amount_requested: positiveAmountArb,
  purpose: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  created_at: fc.integer({ min: 0, max: 365 }).map(daysAgo => {
    const date = subDays(new Date(), daysAgo)
    return date.toISOString()
  }),
  job_order: fc.option(fc.record({ jo_number: fc.string({ minLength: 5, maxLength: 20 }) }), { nil: null }),
  requested_by_user: fc.option(fc.record({ full_name: fc.string({ minLength: 2, maxLength: 50 }) }), { nil: null }),
})

// =====================================================
// Property 1: Net Cash Calculation
// =====================================================

describe('Property 1: Net Cash Calculation', () => {
  /**
   * For any set of payments (received) and vendor payments (paid) within the current month,
   * the net cash value SHALL equal the sum of received amounts minus the sum of paid amounts.
   * Validates: Requirements 1.4
   */
  it('should calculate net cash as received minus paid', () => {
    fc.assert(
      fc.property(amountArb, amountArb, (received, paid) => {
        const netCash = calculateNetCash(received, paid)
        expect(netCash).toBeCloseTo(received - paid, 5)
      }),
      { numRuns: 100 }
    )
  })

  it('should return positive when received > paid', () => {
    fc.assert(
      fc.property(positiveAmountArb, positiveAmountArb, (base, extra) => {
        const received = base + extra
        const paid = base
        const netCash = calculateNetCash(received, paid)
        expect(netCash).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })

  it('should return negative when paid > received', () => {
    fc.assert(
      fc.property(positiveAmountArb, positiveAmountArb, (base, extra) => {
        const received = base
        const paid = base + extra
        const netCash = calculateNetCash(received, paid)
        expect(netCash).toBeLessThan(0)
      }),
      { numRuns: 100 }
    )
  })

  it('should return zero when received equals paid', () => {
    fc.assert(
      fc.property(amountArb, (amount) => {
        const netCash = calculateNetCash(amount, amount)
        expect(netCash).toBeCloseTo(0, 5)
      }),
      { numRuns: 100 }
    )
  })
})

// =====================================================
// Property 2: Revenue MTD Calculation
// =====================================================

describe('Property 2: Revenue MTD Calculation', () => {
  /**
   * For any set of invoices with various invoice dates and statuses,
   * the Revenue MTD SHALL equal the sum of total_amount for all non-cancelled invoices
   * where invoice_date falls within the current month.
   * Validates: Requirements 1.2
   */
  it('should sum only current month non-cancelled invoices', () => {
    fc.assert(
      fc.property(
        fc.array(arInvoiceArb, { minLength: 0, maxLength: 20 }),
        (invoices) => {
          const currentDate = new Date()
          const currentMonth = currentDate.getMonth()
          const currentYear = currentDate.getFullYear()
          
          const revenueMTD = calculateRevenueMTD(invoices, currentDate)
          
          // Manual calculation
          const expectedRevenue = invoices
            .filter(inv => {
              if (inv.status === 'cancelled') return false
              const invoiceDate = new Date(inv.invoice_date)
              return invoiceDate.getMonth() === currentMonth && 
                     invoiceDate.getFullYear() === currentYear
            })
            .reduce((sum, inv) => sum + inv.total_amount, 0)
          
          expect(revenueMTD).toBeCloseTo(expectedRevenue, 2)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should exclude cancelled invoices', () => {
    fc.assert(
      fc.property(positiveAmountArb, currentMonthDateArb, (amount, invoiceDate) => {
        const currentDate = new Date()
        const invoices = [
          { invoice_date: invoiceDate, total_amount: amount, status: 'cancelled' },
        ]
        
        const revenueMTD = calculateRevenueMTD(invoices, currentDate)
        expect(revenueMTD).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  it('should exclude invoices from other months', () => {
    fc.assert(
      fc.property(positiveAmountArb, previousMonthDateArb, (amount, invoiceDate) => {
        const currentDate = new Date()
        const invoices = [
          { invoice_date: invoiceDate, total_amount: amount, status: 'sent' },
        ]
        
        const revenueMTD = calculateRevenueMTD(invoices, currentDate)
        expect(revenueMTD).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  it('should return 0 for empty invoice list', () => {
    const currentDate = new Date()
    const revenueMTD = calculateRevenueMTD([], currentDate)
    expect(revenueMTD).toBe(0)
  })
})

// =====================================================
// Property 3: Profit Margin Calculation
// =====================================================

describe('Property 3: Profit Margin Calculation', () => {
  /**
   * For any revenue value greater than zero and profit value,
   * the profit margin percentage SHALL equal (profit / revenue) * 100.
   * For any current and previous month revenue values where previous > 0,
   * the percentage change SHALL equal ((current - previous) / previous) * 100.
   * Validates: Requirements 1.3, 1.5
   */
  it('should calculate profit margin as (profit / revenue) * 100', () => {
    fc.assert(
      fc.property(amountArb, positiveAmountArb, (profit, revenue) => {
        const margin = calculateProfitMargin(profit, revenue)
        const expected = (profit / revenue) * 100
        expect(margin).toBeCloseTo(expected, 5)
      }),
      { numRuns: 100 }
    )
  })

  it('should return 0 when revenue is 0', () => {
    fc.assert(
      fc.property(amountArb, (profit) => {
        const margin = calculateProfitMargin(profit, 0)
        expect(margin).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  it('should calculate percentage change correctly', () => {
    fc.assert(
      fc.property(amountArb, positiveAmountArb, (current, previous) => {
        const change = calculatePercentageChange(current, previous)
        const expected = ((current - previous) / previous) * 100
        expect(change).toBeCloseTo(expected, 5)
      }),
      { numRuns: 100 }
    )
  })

  it('should return 100 when previous is 0 and current > 0', () => {
    fc.assert(
      fc.property(positiveAmountArb, (current) => {
        const change = calculatePercentageChange(current, 0)
        expect(change).toBe(100)
      }),
      { numRuns: 100 }
    )
  })

  it('should return 0 when both current and previous are 0', () => {
    const change = calculatePercentageChange(0, 0)
    expect(change).toBe(0)
  })

  it('should return positive change when current > previous', () => {
    fc.assert(
      fc.property(positiveAmountArb, positiveAmountArb, (base, extra) => {
        const current = base + extra
        const previous = base
        const change = calculatePercentageChange(current, previous)
        expect(change).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })

  it('should return negative change when current < previous', () => {
    fc.assert(
      fc.property(positiveAmountArb, positiveAmountArb, (base, extra) => {
        const current = base
        const previous = base + extra
        const change = calculatePercentageChange(current, previous)
        expect(change).toBeLessThan(0)
      }),
      { numRuns: 100 }
    )
  })
})


// =====================================================
// Property 4: AR Aggregation and Aging Classification
// =====================================================

describe('Property 4: AR Aggregation and Aging Classification', () => {
  /**
   * For any set of invoices with various statuses, due dates, and amounts:
   * - Total AR SHALL equal the sum of amount_due for all invoices where status != 'cancelled' AND amount_due > 0
   * - Overdue AR SHALL equal the sum of amount_due for invoices where due_date < current_date
   * - Invoice count SHALL equal the count of invoices where status != 'cancelled' AND amount_due > 0
   * - Each invoice SHALL be classified into exactly one aging bucket
   * - The sum of all bucket amounts SHALL equal total AR
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6
   */
  it('should calculate total AR correctly', () => {
    fc.assert(
      fc.property(fc.array(arInvoiceArb, { minLength: 0, maxLength: 20 }), (invoices) => {
        const totalAR = calculateTotalAR(invoices)
        
        // Manual calculation
        const expected = invoices
          .filter(inv => inv.status !== 'cancelled' && inv.status !== 'paid')
          .reduce((sum, inv) => {
            const amountDue = inv.total_amount - (inv.amount_paid || 0)
            return sum + Math.max(0, amountDue)
          }, 0)
        
        expect(totalAR).toBeCloseTo(expected, 2)
      }),
      { numRuns: 100 }
    )
  })

  it('should calculate overdue AR correctly', () => {
    fc.assert(
      fc.property(fc.array(arInvoiceArb, { minLength: 0, maxLength: 20 }), (invoices) => {
        const currentDate = new Date()
        const overdueAR = calculateOverdueAR(invoices, currentDate)
        
        // Manual calculation
        const current = new Date(currentDate)
        current.setHours(0, 0, 0, 0)
        
        const expected = invoices
          .filter(inv => {
            if (inv.status === 'cancelled' || inv.status === 'paid') return false
            const dueDate = new Date(inv.due_date)
            dueDate.setHours(0, 0, 0, 0)
            return dueDate < current
          })
          .reduce((sum, inv) => {
            const amountDue = inv.total_amount - (inv.amount_paid || 0)
            return sum + Math.max(0, amountDue)
          }, 0)
        
        expect(overdueAR).toBeCloseTo(expected, 2)
      }),
      { numRuns: 100 }
    )
  })

  it('should count outstanding invoices correctly', () => {
    fc.assert(
      fc.property(fc.array(arInvoiceArb, { minLength: 0, maxLength: 20 }), (invoices) => {
        const count = countOutstandingARInvoices(invoices)
        
        // Manual calculation
        const expected = invoices.filter(inv => {
          if (inv.status === 'cancelled' || inv.status === 'paid') return false
          const amountDue = inv.total_amount - (inv.amount_paid || 0)
          return amountDue > 0
        }).length
        
        expect(count).toBe(expected)
      }),
      { numRuns: 100 }
    )
  })

  it('should classify each invoice into exactly one aging bucket', () => {
    fc.assert(
      fc.property(dateArb, (dueDate) => {
        const currentDate = new Date()
        const bucket = classifyAgingBucket(dueDate, currentDate)
        
        // Should be one of the valid buckets
        expect(AGING_BUCKET_ORDER).toContain(bucket)
      }),
      { numRuns: 100 }
    )
  })

  it('should classify current invoices correctly', () => {
    fc.assert(
      fc.property(futureDateArb, (dueDate) => {
        const currentDate = new Date()
        const bucket = classifyAgingBucket(dueDate, currentDate)
        expect(bucket).toBe('current')
      }),
      { numRuns: 100 }
    )
  })

  it('should classify overdue invoices by days overdue', () => {
    const currentDate = new Date()
    
    // 1-30 days overdue
    const date15DaysAgo = format(subDays(currentDate, 15), 'yyyy-MM-dd')
    expect(classifyAgingBucket(date15DaysAgo, currentDate)).toBe('1-30 days')
    
    // 31-60 days overdue
    const date45DaysAgo = format(subDays(currentDate, 45), 'yyyy-MM-dd')
    expect(classifyAgingBucket(date45DaysAgo, currentDate)).toBe('31-60 days')
    
    // 61-90 days overdue
    const date75DaysAgo = format(subDays(currentDate, 75), 'yyyy-MM-dd')
    expect(classifyAgingBucket(date75DaysAgo, currentDate)).toBe('61-90 days')
    
    // Over 90 days overdue
    const date100DaysAgo = format(subDays(currentDate, 100), 'yyyy-MM-dd')
    expect(classifyAgingBucket(date100DaysAgo, currentDate)).toBe('over 90 days')
  })

  it('should ensure bucket totals sum to total AR', () => {
    fc.assert(
      fc.property(fc.array(arInvoiceArb, { minLength: 0, maxLength: 20 }), (invoices) => {
        const currentDate = new Date()
        const totalAR = calculateTotalAR(invoices)
        const buckets = groupByAgingBucket(invoices, currentDate)
        
        const bucketSum = buckets.reduce((sum, b) => sum + b.totalAmount, 0)
        expect(bucketSum).toBeCloseTo(totalAR, 2)
      }),
      { numRuns: 100 }
    )
  })

  it('should return all 5 aging buckets in order', () => {
    fc.assert(
      fc.property(fc.array(arInvoiceArb, { minLength: 0, maxLength: 10 }), (invoices) => {
        const currentDate = new Date()
        const buckets = groupByAgingBucket(invoices, currentDate)
        
        expect(buckets.length).toBe(5)
        expect(buckets.map(b => b.bucket)).toEqual(AGING_BUCKET_ORDER)
      }),
      { numRuns: 100 }
    )
  })
})

// =====================================================
// Property 5: AP Aggregation and Aging Classification
// =====================================================

describe('Property 5: AP Aggregation and Aging Classification', () => {
  /**
   * For any set of vendor invoices with various statuses, due dates, and amounts:
   * - Total AP SHALL equal the sum of amount_due for all vendor invoices where status NOT IN ('paid', 'cancelled')
   * - Overdue AP SHALL equal the sum of amount_due for vendor invoices where due_date < current_date
   * - Pending verification count SHALL equal the count of vendor invoices where status = 'received'
   * - Each vendor invoice SHALL be classified into exactly one aging bucket using the same rules as AR
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4
   */
  it('should calculate total AP correctly', () => {
    fc.assert(
      fc.property(fc.array(vendorInvoiceArb, { minLength: 0, maxLength: 20 }), (invoices) => {
        const totalAP = calculateTotalAP(invoices)
        
        // Manual calculation
        const expected = invoices
          .filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
          .reduce((sum, inv) => sum + Math.max(0, inv.amount_due), 0)
        
        expect(totalAP).toBeCloseTo(expected, 2)
      }),
      { numRuns: 100 }
    )
  })

  it('should calculate overdue AP correctly', () => {
    fc.assert(
      fc.property(fc.array(vendorInvoiceArb, { minLength: 0, maxLength: 20 }), (invoices) => {
        const currentDate = new Date()
        const overdueAP = calculateOverdueAP(invoices, currentDate)
        
        // Manual calculation
        const current = new Date(currentDate)
        current.setHours(0, 0, 0, 0)
        
        const expected = invoices
          .filter(inv => {
            if (inv.status === 'paid' || inv.status === 'cancelled') return false
            if (!inv.due_date) return false
            const dueDate = new Date(inv.due_date)
            dueDate.setHours(0, 0, 0, 0)
            return dueDate < current
          })
          .reduce((sum, inv) => sum + Math.max(0, inv.amount_due), 0)
        
        expect(overdueAP).toBeCloseTo(expected, 2)
      }),
      { numRuns: 100 }
    )
  })

  it('should count pending verification correctly', () => {
    fc.assert(
      fc.property(fc.array(vendorInvoiceArb, { minLength: 0, maxLength: 20 }), (invoices) => {
        const count = countPendingVerification(invoices)
        
        // Manual calculation
        const expected = invoices.filter(inv => inv.status === 'received').length
        
        expect(count).toBe(expected)
      }),
      { numRuns: 100 }
    )
  })

  it('should ensure AP bucket totals sum to total AP', () => {
    fc.assert(
      fc.property(fc.array(vendorInvoiceArb, { minLength: 0, maxLength: 20 }), (invoices) => {
        const currentDate = new Date()
        const totalAP = calculateTotalAP(invoices)
        const buckets = groupAPByAgingBucket(invoices, currentDate)
        
        const bucketSum = buckets.reduce((sum, b) => sum + b.totalAmount, 0)
        expect(bucketSum).toBeCloseTo(totalAP, 2)
      }),
      { numRuns: 100 }
    )
  })

  it('should return all 5 aging buckets for AP', () => {
    fc.assert(
      fc.property(fc.array(vendorInvoiceArb, { minLength: 0, maxLength: 10 }), (invoices) => {
        const currentDate = new Date()
        const buckets = groupAPByAgingBucket(invoices, currentDate)
        
        expect(buckets.length).toBe(5)
        expect(buckets.map(b => b.bucket)).toEqual(AGING_BUCKET_ORDER)
      }),
      { numRuns: 100 }
    )
  })

  it('should classify invoices without due date as current', () => {
    fc.assert(
      fc.property(positiveAmountArb, (amount) => {
        const currentDate = new Date()
        const invoices = [{ amount_due: amount, status: 'received', due_date: null }]
        const buckets = groupAPByAgingBucket(invoices, currentDate)
        
        const currentBucket = buckets.find(b => b.bucket === 'current')
        expect(currentBucket?.totalAmount).toBeCloseTo(amount, 2)
      }),
      { numRuns: 100 }
    )
  })
})


// =====================================================
// Property 6: BKK Aggregation
// =====================================================

describe('Property 6: BKK Aggregation', () => {
  /**
   * For any set of BKK records with various statuses and amounts:
   * - Pending BKK count SHALL equal the count of BKKs where status = 'pending'
   * - Pending BKK amount SHALL equal the sum of amount_requested for BKKs where status = 'pending'
   * Validates: Requirements 4.1, 4.2
   */
  it('should count pending BKKs correctly', () => {
    fc.assert(
      fc.property(fc.array(bkkArb, { minLength: 0, maxLength: 20 }), (bkks) => {
        const count = countPendingBKK(bkks)
        
        // Manual calculation
        const expected = bkks.filter(bkk => bkk.status === 'pending').length
        
        expect(count).toBe(expected)
      }),
      { numRuns: 100 }
    )
  })

  it('should calculate pending BKK amount correctly', () => {
    fc.assert(
      fc.property(fc.array(bkkArb, { minLength: 0, maxLength: 20 }), (bkks) => {
        const amount = calculatePendingBKKAmount(bkks)
        
        // Manual calculation
        const expected = bkks
          .filter(bkk => bkk.status === 'pending')
          .reduce((sum, bkk) => sum + bkk.amount_requested, 0)
        
        expect(amount).toBeCloseTo(expected, 2)
      }),
      { numRuns: 100 }
    )
  })

  it('should return 0 count when no pending BKKs', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            ...bkkArb.model,
            status: fc.constantFrom('approved', 'rejected', 'paid'),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (bkks) => {
          const count = countPendingBKK(bkks as any)
          expect(count).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 amount when no pending BKKs', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            status: fc.constantFrom('approved', 'rejected', 'paid'),
            amount_requested: positiveAmountArb,
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (bkks) => {
          const amount = calculatePendingBKKAmount(bkks)
          expect(amount).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// =====================================================
// Property 7: BKK List Limiting and Sorting
// =====================================================

describe('Property 7: BKK List Limiting and Sorting', () => {
  /**
   * For any set of pending BKK records, the returned list SHALL:
   * - Contain at most 5 items
   * - Be sorted by created_at in descending order (most recent first)
   * - Include only BKKs with status = 'pending'
   * Validates: Requirements 4.3
   */
  it('should limit results to specified limit', () => {
    fc.assert(
      fc.property(
        fc.array(bkkArb, { minLength: 0, maxLength: 30 }),
        fc.integer({ min: 1, max: 10 }),
        (bkks, limit) => {
          const list = getPendingBKKList(bkks, limit)
          expect(list.length).toBeLessThanOrEqual(limit)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should default to limit of 5', () => {
    fc.assert(
      fc.property(fc.array(bkkArb, { minLength: 10, maxLength: 30 }), (bkks) => {
        // Ensure we have enough pending BKKs
        const pendingBkks = bkks.map(bkk => ({ ...bkk, status: 'pending' as const }))
        const list = getPendingBKKList(pendingBkks)
        expect(list.length).toBeLessThanOrEqual(5)
      }),
      { numRuns: 100 }
    )
  })

  it('should only include pending BKKs', () => {
    fc.assert(
      fc.property(fc.array(bkkArb, { minLength: 0, maxLength: 20 }), (bkks) => {
        const list = getPendingBKKList(bkks)
        const pendingCount = bkks.filter(bkk => bkk.status === 'pending').length
        
        // List should have at most min(pendingCount, 5) items
        expect(list.length).toBeLessThanOrEqual(Math.min(pendingCount, 5))
      }),
      { numRuns: 100 }
    )
  })

  it('should sort by created_at descending (most recent first)', () => {
    fc.assert(
      fc.property(fc.array(bkkArb, { minLength: 2, maxLength: 20 }), (bkks) => {
        // Make all pending to ensure we get results
        const pendingBkks = bkks.map(bkk => ({ ...bkk, status: 'pending' as const }))
        const list = getPendingBKKList(pendingBkks, 20)
        
        // Check sorting
        for (let i = 1; i < list.length; i++) {
          const prevDate = new Date(list[i - 1].createdAt).getTime()
          const currDate = new Date(list[i].createdAt).getTime()
          expect(prevDate).toBeGreaterThanOrEqual(currDate)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('should transform BKK data correctly', () => {
    fc.assert(
      fc.property(bkkArb, (bkk) => {
        const pendingBkk = { ...bkk, status: 'pending' as const }
        const list = getPendingBKKList([pendingBkk], 1)
        
        if (list.length > 0) {
          const item = list[0]
          expect(item.id).toBe(bkk.id)
          expect(item.bkkNumber).toBe(bkk.bkk_number)
          expect(item.amount).toBeCloseTo(bkk.amount_requested, 2)
          expect(item.createdAt).toBe(bkk.created_at)
        }
      }),
      { numRuns: 100 }
    )
  })
})

// =====================================================
// Property 8: Revenue Trend Aggregation
// =====================================================

describe('Property 8: Revenue Trend Aggregation', () => {
  /**
   * For any set of invoices spanning multiple months, the revenue trend data SHALL:
   * - Include only invoices from the last 6 months
   * - Group invoices by month (using DATE_TRUNC)
   * - Calculate revenue as sum of total_amount per month
   * - Calculate collected as sum of amount_paid per month
   * - Exclude cancelled invoices
   * Validates: Requirements 5.1, 5.2
   */
  
  // Generate invoice with date in last 6 months
  const recentInvoiceArb = fc.record({
    invoice_date: fc.integer({ min: 0, max: 180 }).map(days => {
      const date = subDays(new Date(), days)
      return format(date, 'yyyy-MM-dd')
    }),
    total_amount: positiveAmountArb,
    amount_paid: fc.option(amountArb, { nil: null }),
    status: invoiceStatusArb,
  })

  it('should exclude cancelled invoices from revenue trend', () => {
    fc.assert(
      fc.property(fc.array(recentInvoiceArb, { minLength: 0, maxLength: 20 }), (invoices) => {
        const trend = groupRevenueByMonth(invoices)
        
        // Calculate expected revenue (excluding cancelled)
        const expectedRevenue = invoices
          .filter(inv => inv.status !== 'cancelled')
          .reduce((sum, inv) => sum + inv.total_amount, 0)
        
        const trendRevenue = trend.reduce((sum, m) => sum + m.revenue, 0)
        expect(trendRevenue).toBeCloseTo(expectedRevenue, 2)
      }),
      { numRuns: 100 }
    )
  })

  it('should group invoices by month correctly', () => {
    fc.assert(
      fc.property(fc.array(recentInvoiceArb, { minLength: 0, maxLength: 20 }), (invoices) => {
        const trend = groupRevenueByMonth(invoices)
        
        // Each month key should be first of month
        for (const monthData of trend) {
          const date = new Date(monthData.month)
          expect(date.getDate()).toBe(1)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('should calculate collected as sum of amount_paid', () => {
    fc.assert(
      fc.property(fc.array(recentInvoiceArb, { minLength: 0, maxLength: 20 }), (invoices) => {
        const trend = groupRevenueByMonth(invoices)
        
        // Calculate expected collected (excluding cancelled)
        const expectedCollected = invoices
          .filter(inv => inv.status !== 'cancelled')
          .reduce((sum, inv) => sum + (inv.amount_paid || 0), 0)
        
        const trendCollected = trend.reduce((sum, m) => sum + m.collected, 0)
        expect(trendCollected).toBeCloseTo(expectedCollected, 2)
      }),
      { numRuns: 100 }
    )
  })

  it('should filter to last N months correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        (months) => {
          const currentDate = new Date()
          
          // Create invoices spanning 12 months
          const invoices = Array.from({ length: 12 }, (_, i) => ({
            invoice_date: format(subMonths(currentDate, i), 'yyyy-MM-dd'),
          }))
          
          const filtered = filterLastNMonths(invoices, months, currentDate)
          
          // All filtered invoices should be within the last N months
          const cutoffDate = new Date(currentDate)
          cutoffDate.setMonth(cutoffDate.getMonth() - months)
          cutoffDate.setDate(1)
          cutoffDate.setHours(0, 0, 0, 0)
          
          for (const inv of filtered) {
            const invoiceDate = new Date(inv.invoice_date)
            expect(invoiceDate.getTime()).toBeGreaterThanOrEqual(cutoffDate.getTime())
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return months in chronological order', () => {
    fc.assert(
      fc.property(fc.array(recentInvoiceArb, { minLength: 2, maxLength: 20 }), (invoices) => {
        const trend = groupRevenueByMonth(invoices)
        
        // Check chronological order
        for (let i = 1; i < trend.length; i++) {
          const prevMonth = new Date(trend[i - 1].month).getTime()
          const currMonth = new Date(trend[i].month).getTime()
          expect(currMonth).toBeGreaterThan(prevMonth)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('should return empty array for empty invoice list', () => {
    const trend = groupRevenueByMonth([])
    expect(trend).toEqual([])
  })
})

// =====================================================
// Property 9: Staleness Detection
// =====================================================

describe('Property 9: Staleness Detection', () => {
  /**
   * For any calculated_at timestamp from the materialized view,
   * the system SHALL trigger a refresh if and only if the timestamp
   * is more than 5 minutes (300 seconds) older than the current time.
   * Validates: Requirements 7.3
   */
  it('should detect stale data when older than threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: STALENESS_THRESHOLD_MS + 1, max: STALENESS_THRESHOLD_MS * 10 }),
        (msOld) => {
          const currentDate = new Date()
          const calculatedAt = new Date(currentDate.getTime() - msOld)
          
          expect(isStale(calculatedAt, currentDate)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should not detect stale data when within threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: STALENESS_THRESHOLD_MS - 1 }),
        (msOld) => {
          const currentDate = new Date()
          const calculatedAt = new Date(currentDate.getTime() - msOld)
          
          expect(isStale(calculatedAt, currentDate)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle string dates correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: STALENESS_THRESHOLD_MS * 2 }),
        (msOld) => {
          const currentDate = new Date()
          const calculatedAt = new Date(currentDate.getTime() - msOld).toISOString()
          
          const result = isStale(calculatedAt, currentDate)
          const expected = msOld > STALENESS_THRESHOLD_MS
          
          expect(result).toBe(expected)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should use 5 minutes (300 seconds) as threshold', () => {
    expect(STALENESS_THRESHOLD_MS).toBe(5 * 60 * 1000)
  })

  it('should detect exactly at threshold boundary', () => {
    const currentDate = new Date()
    
    // Exactly at threshold - should NOT be stale
    const atThreshold = new Date(currentDate.getTime() - STALENESS_THRESHOLD_MS)
    expect(isStale(atThreshold, currentDate)).toBe(false)
    
    // 1ms over threshold - should be stale
    const overThreshold = new Date(currentDate.getTime() - STALENESS_THRESHOLD_MS - 1)
    expect(isStale(overThreshold, currentDate)).toBe(true)
  })
})


// =====================================================
// Property 10: Role-Based Access Control
// =====================================================

import {
  canViewFinanceDashboard,
  canViewARAPTotals,
  canViewCashPosition,
  canViewProfitMargins,
  canRefreshFinanceDashboard,
  canViewPendingBKK,
} from '@/lib/permissions'
import { UserProfile, UserRole } from '@/types/permissions'

// Helper to create a mock user profile
const createMockProfile = (role: UserRole): UserProfile => ({
  id: 'test-id',
  user_id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: null,
  role,
  custom_dashboard: 'default',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_login_at: null,
  can_see_revenue: ['owner', 'admin', 'manager', 'finance', 'sales'].includes(role),
  can_see_profit: ['owner', 'admin', 'manager', 'finance'].includes(role),
  can_approve_pjo: ['owner', 'admin', 'manager'].includes(role),
  can_manage_invoices: ['owner', 'admin', 'finance'].includes(role),
  can_manage_users: ['owner', 'admin'].includes(role),
  can_create_pjo: ['owner', 'admin', 'manager', 'finance', 'sales'].includes(role),
  can_fill_costs: ['owner', 'admin', 'manager', 'ops'].includes(role),
})

// All possible roles
const allRoles: UserRole[] = ['owner', 'admin', 'manager', 'ops', 'finance', 'sales', 'viewer']

describe('Property 10: Role-Based Access Control', () => {
  /**
   * For any user role:
   * - Finance role SHALL have access to the Finance Dashboard
   * - Roles in ['finance', 'owner', 'admin', 'manager'] SHALL have access to AR/AP totals
   * - Roles in ['finance', 'owner', 'admin'] SHALL have access to cash position details
   * - Roles in ['finance', 'owner', 'admin'] SHALL have access to profit margins
   * - All other roles SHALL be denied access to these features
   * Validates: Requirements 8.1, 8.2, 8.3, 8.4
   */

  describe('Finance Dashboard View Access', () => {
    it('should grant access to finance, owner, admin, manager roles', () => {
      const allowedRoles: UserRole[] = ['finance', 'owner', 'admin', 'manager']
      
      for (const role of allowedRoles) {
        const profile = createMockProfile(role)
        expect(canViewFinanceDashboard(profile)).toBe(true)
      }
    })

    it('should deny access to ops, sales, viewer roles', () => {
      const deniedRoles: UserRole[] = ['ops', 'sales', 'viewer']
      
      for (const role of deniedRoles) {
        const profile = createMockProfile(role)
        expect(canViewFinanceDashboard(profile)).toBe(false)
      }
    })

    it('should deny access when profile is null', () => {
      expect(canViewFinanceDashboard(null)).toBe(false)
    })
  })

  describe('AR/AP Totals Access', () => {
    it('should grant access to finance, owner, admin, manager roles', () => {
      const allowedRoles: UserRole[] = ['finance', 'owner', 'admin', 'manager']
      
      for (const role of allowedRoles) {
        const profile = createMockProfile(role)
        expect(canViewARAPTotals(profile)).toBe(true)
      }
    })

    it('should deny access to ops, sales, viewer roles', () => {
      const deniedRoles: UserRole[] = ['ops', 'sales', 'viewer']
      
      for (const role of deniedRoles) {
        const profile = createMockProfile(role)
        expect(canViewARAPTotals(profile)).toBe(false)
      }
    })
  })

  describe('Cash Position Access', () => {
    it('should grant access to finance, owner, admin roles', () => {
      const allowedRoles: UserRole[] = ['finance', 'owner', 'admin']
      
      for (const role of allowedRoles) {
        const profile = createMockProfile(role)
        expect(canViewCashPosition(profile)).toBe(true)
      }
    })

    it('should deny access to manager, ops, sales, viewer roles', () => {
      const deniedRoles: UserRole[] = ['manager', 'ops', 'sales', 'viewer']
      
      for (const role of deniedRoles) {
        const profile = createMockProfile(role)
        expect(canViewCashPosition(profile)).toBe(false)
      }
    })
  })

  describe('Profit Margins Access', () => {
    it('should grant access to finance, owner, admin roles', () => {
      const allowedRoles: UserRole[] = ['finance', 'owner', 'admin']
      
      for (const role of allowedRoles) {
        const profile = createMockProfile(role)
        expect(canViewProfitMargins(profile)).toBe(true)
      }
    })

    it('should deny access to manager, ops, sales, viewer roles', () => {
      const deniedRoles: UserRole[] = ['manager', 'ops', 'sales', 'viewer']
      
      for (const role of deniedRoles) {
        const profile = createMockProfile(role)
        expect(canViewProfitMargins(profile)).toBe(false)
      }
    })
  })

  describe('Refresh Dashboard Access', () => {
    it('should grant access to finance, owner, admin roles', () => {
      const allowedRoles: UserRole[] = ['finance', 'owner', 'admin']
      
      for (const role of allowedRoles) {
        const profile = createMockProfile(role)
        expect(canRefreshFinanceDashboard(profile)).toBe(true)
      }
    })

    it('should deny access to manager, ops, sales, viewer roles', () => {
      const deniedRoles: UserRole[] = ['manager', 'ops', 'sales', 'viewer']
      
      for (const role of deniedRoles) {
        const profile = createMockProfile(role)
        expect(canRefreshFinanceDashboard(profile)).toBe(false)
      }
    })
  })

  describe('Pending BKK Access', () => {
    it('should grant access to finance, owner, admin, manager roles', () => {
      const allowedRoles: UserRole[] = ['finance', 'owner', 'admin', 'manager']
      
      for (const role of allowedRoles) {
        const profile = createMockProfile(role)
        expect(canViewPendingBKK(profile)).toBe(true)
      }
    })

    it('should deny access to ops, sales, viewer roles', () => {
      const deniedRoles: UserRole[] = ['ops', 'sales', 'viewer']
      
      for (const role of deniedRoles) {
        const profile = createMockProfile(role)
        expect(canViewPendingBKK(profile)).toBe(false)
      }
    })
  })

  describe('Property-based role access verification', () => {
    it('should consistently apply access rules for all roles', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...allRoles),
          (role) => {
            const profile = createMockProfile(role)
            
            // Finance dashboard view: finance, owner, admin, manager
            const expectedDashboardAccess = ['finance', 'owner', 'admin', 'manager'].includes(role)
            expect(canViewFinanceDashboard(profile)).toBe(expectedDashboardAccess)
            
            // AR/AP totals: finance, owner, admin, manager
            const expectedARAPAccess = ['finance', 'owner', 'admin', 'manager'].includes(role)
            expect(canViewARAPTotals(profile)).toBe(expectedARAPAccess)
            
            // Cash position: finance, owner, admin
            const expectedCashAccess = ['finance', 'owner', 'admin'].includes(role)
            expect(canViewCashPosition(profile)).toBe(expectedCashAccess)
            
            // Profit margins: finance, owner, admin
            const expectedProfitAccess = ['finance', 'owner', 'admin'].includes(role)
            expect(canViewProfitMargins(profile)).toBe(expectedProfitAccess)
            
            // Pending BKK: finance, owner, admin, manager
            const expectedBKKAccess = ['finance', 'owner', 'admin', 'manager'].includes(role)
            expect(canViewPendingBKK(profile)).toBe(expectedBKKAccess)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
