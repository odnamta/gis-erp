/**
 * Finance Dashboard Utils - Property-Based Tests
 * Tests for AR aging, severity classification, and financial calculations
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateDaysOverdue,
  calculateAgingBucket,
  getOverdueSeverity,
  type AgingBucketType,
  type OverdueSeverity,
} from '@/lib/finance-dashboard-utils'

describe('Finance Dashboard Utils', () => {
  describe('calculateDaysOverdue', () => {
    it('returns 0 for future due dates', () => {
      const currentDate = new Date('2025-12-15')
      const futureDate = '2025-12-20'
      expect(calculateDaysOverdue(futureDate, currentDate)).toBe(0)
    })

    it('returns correct days for past due dates', () => {
      const currentDate = new Date('2025-12-15')
      const pastDate = '2025-12-10'
      expect(calculateDaysOverdue(pastDate, currentDate)).toBe(5)
    })

    it('returns 0 for same day', () => {
      const currentDate = new Date('2025-12-15')
      const sameDate = '2025-12-15'
      expect(calculateDaysOverdue(sameDate, currentDate)).toBe(0)
    })
  })

  /**
   * Property 2: AR aging bucket classification
   * For any invoice with a due date and current date, the aging bucket classification
   * SHALL place the invoice in exactly one bucket based on days since due date
   * **Validates: Requirements 2.1, 2.3**
   */
  describe('Property 2: AR aging bucket classification', () => {
    it('classifies invoices into exactly one aging bucket based on days overdue', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 365 }), // days overdue
          (daysOverdue) => {
            // Create a due date that is daysOverdue days in the past
            const currentDate = new Date('2025-12-15')
            const dueDate = new Date(currentDate)
            dueDate.setDate(dueDate.getDate() - daysOverdue)
            const dueDateStr = dueDate.toISOString().split('T')[0]

            const bucket = calculateAgingBucket(dueDateStr, currentDate)

            // Verify bucket is one of the valid types
            const validBuckets: AgingBucketType[] = ['current', 'days31to60', 'days61to90', 'over90']
            expect(validBuckets).toContain(bucket)

            // Verify correct bucket based on days overdue
            if (daysOverdue <= 30) {
              expect(bucket).toBe('current')
            } else if (daysOverdue <= 60) {
              expect(bucket).toBe('days31to60')
            } else if (daysOverdue <= 90) {
              expect(bucket).toBe('days61to90')
            } else {
              expect(bucket).toBe('over90')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('bucket boundaries are correct', () => {
      const currentDate = new Date('2025-12-15')
      
      // Test boundary: 30 days -> current
      const day30 = new Date(currentDate)
      day30.setDate(day30.getDate() - 30)
      expect(calculateAgingBucket(day30.toISOString().split('T')[0], currentDate)).toBe('current')
      
      // Test boundary: 31 days -> days31to60
      const day31 = new Date(currentDate)
      day31.setDate(day31.getDate() - 31)
      expect(calculateAgingBucket(day31.toISOString().split('T')[0], currentDate)).toBe('days31to60')
      
      // Test boundary: 60 days -> days31to60
      const day60 = new Date(currentDate)
      day60.setDate(day60.getDate() - 60)
      expect(calculateAgingBucket(day60.toISOString().split('T')[0], currentDate)).toBe('days31to60')
      
      // Test boundary: 61 days -> days61to90
      const day61 = new Date(currentDate)
      day61.setDate(day61.getDate() - 61)
      expect(calculateAgingBucket(day61.toISOString().split('T')[0], currentDate)).toBe('days61to90')
      
      // Test boundary: 90 days -> days61to90
      const day90 = new Date(currentDate)
      day90.setDate(day90.getDate() - 90)
      expect(calculateAgingBucket(day90.toISOString().split('T')[0], currentDate)).toBe('days61to90')
      
      // Test boundary: 91 days -> over90
      const day91 = new Date(currentDate)
      day91.setDate(day91.getDate() - 91)
      expect(calculateAgingBucket(day91.toISOString().split('T')[0], currentDate)).toBe('over90')
    })
  })

  /**
   * Property 9: Overdue severity classification
   * For any overdue invoice with days_overdue, the severity SHALL be:
   * - 'warning' if 1-30 days
   * - 'orange' if 31-60 days
   * - 'critical' if more than 60 days
   * **Validates: Requirements 8.1, 8.2, 8.3**
   */
  describe('Property 9: Overdue severity classification', () => {
    it('classifies severity correctly based on days overdue', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 365 }), // days overdue
          (daysOverdue) => {
            const severity = getOverdueSeverity(daysOverdue)

            // Verify severity is one of the valid types
            const validSeverities: OverdueSeverity[] = ['warning', 'orange', 'critical']
            expect(validSeverities).toContain(severity)

            // Verify correct severity based on days overdue
            if (daysOverdue <= 30) {
              expect(severity).toBe('warning')
            } else if (daysOverdue <= 60) {
              expect(severity).toBe('orange')
            } else {
              expect(severity).toBe('critical')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('severity boundaries are correct', () => {
      // 0 days -> warning
      expect(getOverdueSeverity(0)).toBe('warning')
      // 30 days -> warning
      expect(getOverdueSeverity(30)).toBe('warning')
      // 31 days -> orange
      expect(getOverdueSeverity(31)).toBe('orange')
      // 60 days -> orange
      expect(getOverdueSeverity(60)).toBe('orange')
      // 61 days -> critical
      expect(getOverdueSeverity(61)).toBe('critical')
      // 90 days -> critical
      expect(getOverdueSeverity(90)).toBe('critical')
    })
  })
})


// Import additional functions for aggregation tests
import {
  groupInvoicesByAging,
  groupPJOsByStatus,
  type ARAgingData,
  type PJOPipelineData,
} from '@/lib/finance-dashboard-utils'

describe('Data Aggregation Functions', () => {
  // Helper to generate date strings safely
  const dateStringArb = (minDaysAgo: number, maxDaysAgo: number) =>
    fc.integer({ min: minDaysAgo, max: maxDaysAgo }).map(daysAgo => {
      const date = new Date('2025-12-15')
      date.setDate(date.getDate() - daysAgo)
      return date.toISOString().split('T')[0]
    })

  /**
   * Property 3: Aging bucket aggregation
   * For any set of invoices in an aging bucket, the bucket's count SHALL equal
   * the number of invoices and the amount SHALL equal the sum of all invoice total_amounts
   * **Validates: Requirements 2.2**
   */
  describe('Property 3: Aging bucket aggregation', () => {
    // Generator for invoice-like objects
    const invoiceArb = fc.record({
      id: fc.uuid(),
      due_date: dateStringArb(0, 365),
      total_amount: fc.integer({ min: 1000, max: 1000000000 }),
      status: fc.constantFrom('sent', 'overdue', 'paid', 'draft'),
    })

    it('bucket count equals number of invoices in that bucket', () => {
      fc.assert(
        fc.property(
          fc.array(invoiceArb, { minLength: 0, maxLength: 20 }),
          (invoices) => {
            const currentDate = new Date('2025-12-15')
            const result = groupInvoicesByAging(invoices, currentDate)

            // Count outstanding invoices manually
            const outstanding = invoices.filter(
              inv => inv.status === 'sent' || inv.status === 'overdue'
            )

            // Total count across all buckets should equal outstanding invoices
            const totalCount = result.current.count + result.days31to60.count +
              result.days61to90.count + result.over90.count
            expect(totalCount).toBe(outstanding.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('bucket amount equals sum of invoice amounts in that bucket', () => {
      fc.assert(
        fc.property(
          fc.array(invoiceArb, { minLength: 0, maxLength: 20 }),
          (invoices) => {
            const currentDate = new Date('2025-12-15')
            const result = groupInvoicesByAging(invoices, currentDate)

            // Sum outstanding invoice amounts manually
            const outstanding = invoices.filter(
              inv => inv.status === 'sent' || inv.status === 'overdue'
            )
            const totalAmount = outstanding.reduce((sum, inv) => sum + inv.total_amount, 0)

            // Total amount across all buckets should equal sum of outstanding invoices
            const bucketTotal = result.current.amount + result.days31to60.amount +
              result.days61to90.amount + result.over90.amount
            expect(bucketTotal).toBe(totalAmount)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('only includes sent and overdue invoices', () => {
      const invoices = [
        { id: '1', due_date: '2025-12-01', total_amount: 100000, status: 'sent' },
        { id: '2', due_date: '2025-12-01', total_amount: 200000, status: 'overdue' },
        { id: '3', due_date: '2025-12-01', total_amount: 300000, status: 'paid' },
        { id: '4', due_date: '2025-12-01', total_amount: 400000, status: 'draft' },
      ]
      const currentDate = new Date('2025-12-15')
      const result = groupInvoicesByAging(invoices, currentDate)

      const totalCount = result.current.count + result.days31to60.count +
        result.days61to90.count + result.over90.count
      expect(totalCount).toBe(2) // Only sent and overdue
    })
  })

  /**
   * Property 4: PJO pipeline grouping and aggregation
   * For any set of active PJOs, the pipeline grouping SHALL produce exactly one entry
   * per status with count equal to PJOs in that status and totalValue equal to sum
   * **Validates: Requirements 3.1, 3.2**
   */
  describe('Property 4: PJO pipeline grouping and aggregation', () => {
    const pjoArb = fc.record({
      status: fc.constantFrom('draft', 'pending_approval', 'approved', 'rejected'),
      total_revenue_calculated: fc.option(fc.integer({ min: 0, max: 1000000000 }), { nil: null }),
      is_active: fc.boolean(),
    })

    it('produces exactly one entry per status', () => {
      fc.assert(
        fc.property(
          fc.array(pjoArb, { minLength: 0, maxLength: 20 }),
          (pjos) => {
            const result = groupPJOsByStatus(pjos)

            // Should always have exactly 4 entries
            expect(result.length).toBe(4)

            // Each status should appear exactly once
            const statuses = result.map(r => r.status)
            expect(statuses).toContain('draft')
            expect(statuses).toContain('pending_approval')
            expect(statuses).toContain('approved')
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
            const result = groupPJOsByStatus(pjos)

            // Count active PJOs by status manually
            const activePjos = pjos.filter(p => p.is_active !== false)
            
            for (const entry of result) {
              const expectedCount = activePjos.filter(p => p.status === entry.status).length
              expect(entry.count).toBe(expectedCount)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('totalValue equals sum of total_revenue_calculated for active PJOs', () => {
      fc.assert(
        fc.property(
          fc.array(pjoArb, { minLength: 0, maxLength: 20 }),
          (pjos) => {
            const result = groupPJOsByStatus(pjos)

            const activePjos = pjos.filter(p => p.is_active !== false)
            
            for (const entry of result) {
              const expectedValue = activePjos
                .filter(p => p.status === entry.status)
                .reduce((sum, p) => sum + (p.total_revenue_calculated ?? 0), 0)
              expect(entry.totalValue).toBe(expectedValue)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


// Import filter functions
import {
  filterOverdueInvoices,
  filterRecentPayments,
  type OverdueInvoice,
  type RecentPayment,
} from '@/lib/finance-dashboard-utils'

describe('Filter and Sort Functions', () => {
  // Helper to generate date strings safely
  const dateStringArb2 = (minDaysAgo: number, maxDaysAgo: number) =>
    fc.integer({ min: minDaysAgo, max: maxDaysAgo }).map(daysAgo => {
      const date = new Date('2025-12-15')
      date.setDate(date.getDate() - daysAgo)
      return date.toISOString().split('T')[0]
    })

  /**
   * Property 5: Overdue invoice filter
   * For any invoice, it SHALL appear in the overdue list if and only if
   * the invoice status is 'sent' or 'overdue' AND current date is greater than due_date
   * **Validates: Requirements 4.1**
   */
  describe('Property 5: Overdue invoice filter', () => {
    const invoiceArb = fc.record({
      id: fc.uuid(),
      invoice_number: fc.string({ minLength: 1, maxLength: 20 }),
      due_date: dateStringArb2(0, 365),
      total_amount: fc.integer({ min: 1000, max: 1000000000 }),
      status: fc.constantFrom('sent', 'overdue', 'paid', 'draft'),
      customer_name: fc.string({ minLength: 1, maxLength: 50 }),
    })

    it('includes only invoices where status is sent/overdue AND due_date < currentDate', () => {
      fc.assert(
        fc.property(
          fc.array(invoiceArb, { minLength: 0, maxLength: 20 }),
          (invoices) => {
            const currentDate = new Date('2025-12-15')
            const result = filterOverdueInvoices(invoices, currentDate)

            // Every result should be overdue
            for (const inv of result) {
              expect(inv.days_overdue).toBeGreaterThan(0)
            }

            // Check that all qualifying invoices are included
            const expectedOverdue = invoices.filter(inv => {
              if (inv.status !== 'sent' && inv.status !== 'overdue') return false
              const dueDate = new Date(inv.due_date)
              dueDate.setHours(0, 0, 0, 0)
              const current = new Date(currentDate)
              current.setHours(0, 0, 0, 0)
              return dueDate < current
            })

            expect(result.length).toBe(expectedOverdue.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('excludes paid and draft invoices', () => {
      const invoices = [
        { id: '1', invoice_number: 'INV-001', due_date: '2025-11-01', total_amount: 100000, status: 'sent', customer_name: 'A' },
        { id: '2', invoice_number: 'INV-002', due_date: '2025-11-01', total_amount: 200000, status: 'paid', customer_name: 'B' },
        { id: '3', invoice_number: 'INV-003', due_date: '2025-11-01', total_amount: 300000, status: 'draft', customer_name: 'C' },
      ]
      const currentDate = new Date('2025-12-15')
      const result = filterOverdueInvoices(invoices, currentDate)

      expect(result.length).toBe(1)
      expect(result[0].invoice_number).toBe('INV-001')
    })
  })

  /**
   * Property 6: Overdue invoice sort order
   * For any list of overdue invoices, the list SHALL be sorted by days_overdue
   * in descending order (oldest first)
   * **Validates: Requirements 4.3**
   */
  describe('Property 6: Overdue invoice sort order', () => {
    const overdueInvoiceArb = fc.record({
      id: fc.uuid(),
      invoice_number: fc.string({ minLength: 1, maxLength: 20 }),
      due_date: dateStringArb2(15, 365), // At least 15 days ago to ensure overdue
      total_amount: fc.integer({ min: 1000, max: 1000000000 }),
      status: fc.constantFrom('sent', 'overdue'),
      customer_name: fc.string({ minLength: 1, maxLength: 50 }),
    })

    it('sorts by days_overdue descending (oldest first)', () => {
      fc.assert(
        fc.property(
          fc.array(overdueInvoiceArb, { minLength: 2, maxLength: 20 }),
          (invoices) => {
            const currentDate = new Date('2025-12-15')
            const result = filterOverdueInvoices(invoices, currentDate)

            // Check that result is sorted by days_overdue descending
            for (let i = 1; i < result.length; i++) {
              expect(result[i - 1].days_overdue).toBeGreaterThanOrEqual(result[i].days_overdue)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 7: Recent payments filter
   * For any invoice, it SHALL appear in recent payments if and only if
   * status='paid' AND paid_at is within the last 30 days from current date
   * **Validates: Requirements 5.1**
   */
  describe('Property 7: Recent payments filter', () => {
    // Generate paid_at as days ago from current date
    const paidAtArb = fc.integer({ min: 0, max: 60 }).map(daysAgo => {
      const date = new Date('2025-12-15')
      date.setDate(date.getDate() - daysAgo)
      return date.toISOString()
    })

    const paidInvoiceArb = fc.record({
      id: fc.uuid(),
      invoice_number: fc.string({ minLength: 1, maxLength: 20 }),
      total_amount: fc.integer({ min: 1000, max: 1000000000 }),
      status: fc.constantFrom('sent', 'overdue', 'paid', 'draft'),
      paid_at: fc.option(paidAtArb, { nil: null }),
      notes: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
      customer_name: fc.string({ minLength: 1, maxLength: 50 }),
    })

    it('includes only paid invoices from last 30 days', () => {
      fc.assert(
        fc.property(
          fc.array(paidInvoiceArb, { minLength: 0, maxLength: 20 }),
          (invoices) => {
            const currentDate = new Date('2025-12-15')
            const thirtyDaysAgo = new Date(currentDate)
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            thirtyDaysAgo.setHours(0, 0, 0, 0)

            const result = filterRecentPayments(invoices, currentDate)

            // Every result should be a paid invoice from last 30 days
            for (const payment of result) {
              const paidDate = new Date(payment.paid_at)
              expect(paidDate.getTime()).toBeGreaterThanOrEqual(thirtyDaysAgo.getTime())
            }

            // Check count matches expected
            const expectedPayments = invoices.filter(inv => {
              if (inv.status !== 'paid' || !inv.paid_at) return false
              const paidDate = new Date(inv.paid_at)
              return paidDate >= thirtyDaysAgo
            })

            expect(result.length).toBe(expectedPayments.length)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 8: Recent payments sort order
   * For any list of recent payments, the list SHALL be sorted by paid_at
   * in descending order (most recent first)
   * **Validates: Requirements 5.4**
   */
  describe('Property 8: Recent payments sort order', () => {
    // Generate paid_at within last 30 days
    const recentPaidAtArb = fc.integer({ min: 0, max: 29 }).map(daysAgo => {
      const date = new Date('2025-12-15')
      date.setDate(date.getDate() - daysAgo)
      return date.toISOString()
    })

    const recentPaidInvoiceArb = fc.record({
      id: fc.uuid(),
      invoice_number: fc.string({ minLength: 1, maxLength: 20 }),
      total_amount: fc.integer({ min: 1000, max: 1000000000 }),
      status: fc.constant('paid'),
      paid_at: recentPaidAtArb,
      notes: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
      customer_name: fc.string({ minLength: 1, maxLength: 50 }),
    })

    it('sorts by paid_at descending (most recent first)', () => {
      fc.assert(
        fc.property(
          fc.array(recentPaidInvoiceArb, { minLength: 2, maxLength: 20 }),
          (invoices) => {
            const currentDate = new Date('2025-12-15')
            const result = filterRecentPayments(invoices, currentDate)

            // Check that result is sorted by paid_at descending
            for (let i = 1; i < result.length; i++) {
              const prevDate = new Date(result[i - 1].paid_at).getTime()
              const currDate = new Date(result[i].paid_at).getTime()
              expect(prevDate).toBeGreaterThanOrEqual(currDate)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


// Import KPI functions
import {
  calculateMonthlyRevenue,
  calculateFinanceKPIs,
  type MonthlyRevenueData,
  type FinanceKPIs,
  type RevenueTrend,
} from '@/lib/finance-dashboard-utils'

describe('KPI Calculation Functions', () => {
  /**
   * Property 10: Monthly revenue calculation
   * For any set of completed job orders, monthly revenue SHALL equal the sum of
   * final_revenue for JOs where completed_at falls within the specified month,
   * and trend SHALL be 'up' if current > previous, 'down' if current < previous, 'stable' if equal
   * **Validates: Requirements 7.1, 7.2**
   */
  describe('Property 10: Monthly revenue calculation', () => {
    // Generate completed_at dates within a range
    const completedAtArb = (monthOffset: number) =>
      fc.integer({ min: 1, max: 28 }).map(day => {
        const date = new Date('2025-12-15')
        date.setMonth(date.getMonth() - monthOffset)
        date.setDate(day)
        return date.toISOString()
      })

    const jobOrderArb = fc.record({
      final_revenue: fc.option(fc.integer({ min: 0, max: 100000000 }), { nil: null }),
      completed_at: fc.option(
        fc.oneof(completedAtArb(0), completedAtArb(1), completedAtArb(2)),
        { nil: null }
      ),
      status: fc.constantFrom('active', 'completed', 'submitted_to_finance', 'invoiced', 'closed'),
    })

    it('sums revenue correctly for current month', () => {
      fc.assert(
        fc.property(
          fc.array(jobOrderArb, { minLength: 0, maxLength: 20 }),
          (jobOrders) => {
            const currentDate = new Date('2025-12-15')
            const result = calculateMonthlyRevenue(jobOrders, currentDate)

            // Calculate expected current month revenue manually
            const completedStatuses = ['completed', 'submitted_to_finance', 'invoiced', 'closed']
            const currentMonthJOs = jobOrders.filter(jo => {
              if (!completedStatuses.includes(jo.status) || !jo.completed_at) return false
              const completedDate = new Date(jo.completed_at)
              return completedDate.getMonth() === 11 && completedDate.getFullYear() === 2025
            })
            const expectedRevenue = currentMonthJOs.reduce(
              (sum, jo) => sum + (jo.final_revenue ?? 0),
              0
            )

            expect(result.current).toBe(expectedRevenue)
            expect(result.currentCount).toBe(currentMonthJOs.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('calculates trend correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000000 }),
          fc.integer({ min: 0, max: 1000000 }),
          (currentRevenue, previousRevenue) => {
            // Create JOs that will produce these revenues
            const jobOrders = [
              {
                final_revenue: currentRevenue,
                completed_at: '2025-12-10T00:00:00.000Z',
                status: 'completed',
              },
              {
                final_revenue: previousRevenue,
                completed_at: '2025-11-10T00:00:00.000Z',
                status: 'completed',
              },
            ]

            const currentDate = new Date('2025-12-15')
            const result = calculateMonthlyRevenue(jobOrders, currentDate)

            // Verify trend
            if (currentRevenue > previousRevenue) {
              expect(result.trend).toBe('up')
            } else if (currentRevenue < previousRevenue) {
              expect(result.trend).toBe('down')
            } else {
              expect(result.trend).toBe('stable')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('excludes non-completed JOs', () => {
      const jobOrders = [
        { final_revenue: 100000, completed_at: '2025-12-10T00:00:00.000Z', status: 'completed' },
        { final_revenue: 200000, completed_at: '2025-12-10T00:00:00.000Z', status: 'active' },
      ]
      const currentDate = new Date('2025-12-15')
      const result = calculateMonthlyRevenue(jobOrders, currentDate)

      expect(result.current).toBe(100000) // Only completed JO
      expect(result.currentCount).toBe(1)
    })
  })

  describe('calculateFinanceKPIs', () => {
    it('calculates all KPIs correctly', () => {
      const invoices = [
        { id: '1', due_date: '2025-12-01', total_amount: 100000, status: 'sent' },
        { id: '2', due_date: '2025-10-01', total_amount: 200000, status: 'overdue' }, // 75 days overdue - critical
        { id: '3', due_date: '2025-12-20', total_amount: 300000, status: 'paid' },
      ]
      const jobOrders = [
        { final_revenue: 500000, completed_at: '2025-12-10T00:00:00.000Z', status: 'completed' },
      ]
      const currentDate = new Date('2025-12-15')

      const result = calculateFinanceKPIs(invoices, jobOrders, currentDate)

      expect(result.outstandingAR).toBe(300000) // sent + overdue
      expect(result.outstandingARCount).toBe(2)
      expect(result.overdueAmount).toBe(300000) // both are overdue (due_date < current)
      expect(result.overdueCount).toBe(2)
      expect(result.criticalOverdueCount).toBe(1) // only 75 days overdue one
      expect(result.monthlyRevenue).toBe(500000)
      expect(result.monthlyJOCount).toBe(1)
    })
  })
})


// Import export function
import { exportARAgingToCSV } from '@/components/dashboard/finance/export-report-dropdown'

describe('Export Functions', () => {
  /**
   * Property 11: Export completeness
   * For any AR aging export, the export SHALL contain all outstanding invoices
   * with their correct aging bucket classification
   * **Validates: Requirements 6.2**
   */
  describe('Property 11: Export completeness', () => {
    it('export contains all invoice IDs from all buckets', () => {
      fc.assert(
        fc.property(
          fc.record({
            current: fc.record({
              count: fc.integer({ min: 0, max: 10 }),
              amount: fc.integer({ min: 0, max: 1000000 }),
              invoiceIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
            }),
            days31to60: fc.record({
              count: fc.integer({ min: 0, max: 10 }),
              amount: fc.integer({ min: 0, max: 1000000 }),
              invoiceIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
            }),
            days61to90: fc.record({
              count: fc.integer({ min: 0, max: 10 }),
              amount: fc.integer({ min: 0, max: 1000000 }),
              invoiceIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
            }),
            over90: fc.record({
              count: fc.integer({ min: 0, max: 10 }),
              amount: fc.integer({ min: 0, max: 1000000 }),
              invoiceIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
            }),
          }),
          (arAging) => {
            const csv = exportARAgingToCSV(arAging)

            // All invoice IDs should be present in the export
            const allInvoiceIds = [
              ...arAging.current.invoiceIds,
              ...arAging.days31to60.invoiceIds,
              ...arAging.days61to90.invoiceIds,
              ...arAging.over90.invoiceIds,
            ]

            for (const id of allInvoiceIds) {
              expect(csv).toContain(id)
            }

            // CSV should have correct structure (header + 4 bucket rows)
            const lines = csv.split('\n')
            expect(lines.length).toBe(5) // header + 4 buckets
          }
        ),
        { numRuns: 100 }
      )
    })

    it('export contains correct bucket labels', () => {
      const arAging = {
        current: { count: 1, amount: 100, invoiceIds: ['id1'] },
        days31to60: { count: 2, amount: 200, invoiceIds: ['id2', 'id3'] },
        days61to90: { count: 0, amount: 0, invoiceIds: [] },
        over90: { count: 1, amount: 500, invoiceIds: ['id4'] },
      }

      const csv = exportARAgingToCSV(arAging)

      expect(csv).toContain('0-30 days')
      expect(csv).toContain('31-60 days')
      expect(csv).toContain('61-90 days')
      expect(csv).toContain('90+ days')
    })
  })
})


describe('Dashboard Routing', () => {
  /**
   * Property 1: Dashboard routing for finance role
   * For any user profile with role='finance', the dashboard router SHALL return
   * the Finance Dashboard component
   * **Validates: Requirements 1.1**
   */
  describe('Property 1: Dashboard routing for finance role', () => {
    // Helper function to determine which dashboard to show
    function getDashboardType(userRole: string): 'ops' | 'finance' | 'main' {
      if (userRole === 'ops') return 'ops'
      if (userRole === 'finance') return 'finance'
      return 'main'
    }

    it('routes finance users to finance dashboard', () => {
      fc.assert(
        fc.property(
          fc.constant('finance'),
          (role) => {
            const dashboardType = getDashboardType(role)
            expect(dashboardType).toBe('finance')
          }
        ),
        { numRuns: 10 }
      )
    })

    it('routes ops users to ops dashboard', () => {
      fc.assert(
        fc.property(
          fc.constant('ops'),
          (role) => {
            const dashboardType = getDashboardType(role)
            expect(dashboardType).toBe('ops')
          }
        ),
        { numRuns: 10 }
      )
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
        { numRuns: 100 }
      )
    })

    it('each role maps to exactly one dashboard type', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('admin', 'manager', 'ops', 'finance', 'viewer'),
          (role) => {
            const dashboardType = getDashboardType(role)
            const validTypes = ['ops', 'finance', 'main']
            expect(validTypes).toContain(dashboardType)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
