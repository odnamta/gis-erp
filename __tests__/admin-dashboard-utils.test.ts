/**
 * Property-based tests for Administration Dashboard utilities
 * For Administration Division (role: 'admin') - handles PJO/JO/Invoice workflow
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  // Period functions
  getAdminPeriodDates,
  getAdminPreviousPeriodDates,
  // KPI functions
  countPJOsPendingApproval,
  countPJOsReadyForJO,
  countJOsInProgress,
  countInvoicesUnpaid,
  calculatePeriodRevenue,
  countDocumentsCreated,
  calculateAdminKPIs,
  // Pipeline functions
  calculatePipelineStages,
  // Pending work functions
  calculateDaysPending,
  getPendingWorkItems,
  sortByDaysPendingDesc,
  // Aging functions
  calculateAgingBuckets,
  calculateDaysPastDue,
  getAgingBucketIndex,
  // Document functions
  getRecentDocuments,
  filterDocumentsByType,
  // Types
  type AdminPeriodType,
  type PJOInput,
  type JOInput,
  type InvoiceInput,
  type PendingWorkItem,
} from '@/lib/admin-dashboard-utils'

// Arbitraries
const adminPeriodTypeArb = fc.constantFrom<AdminPeriodType>('this_week', 'this_month', 'this_quarter')

const pjoStatusArb = fc.constantFrom('draft', 'pending_approval', 'approved', 'rejected')

const joStatusArb = fc.constantFrom('active', 'completed', 'submitted_to_finance', 'invoiced', 'closed')

const invoiceStatusArb = fc.constantFrom('draft', 'sent', 'paid', 'overdue', 'cancelled')

// Use integer-based date generation to avoid NaN issues
const dateStringArb = fc.integer({ min: 1704067200000, max: 1735689600000 }) // 2024-01-01 to 2025-01-01
  .map(ts => new Date(ts).toISOString())

const currentDateArb = fc.integer({ min: 1735689600000, max: 1767225600000 }) // 2025-01-01 to 2026-01-01
  .map(ts => new Date(ts))

const pjoArb: fc.Arbitrary<PJOInput> = fc.record({
  id: fc.uuid(),
  pjo_number: fc.string({ minLength: 5, maxLength: 20 }),
  status: pjoStatusArb,
  converted_to_jo: fc.boolean(),
  all_costs_confirmed: fc.boolean(),
  created_at: fc.option(dateStringArb, { nil: undefined }),
  updated_at: fc.option(dateStringArb, { nil: undefined }),
  customer_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
})

const joArb: fc.Arbitrary<JOInput> = fc.record({
  id: fc.uuid(),
  jo_number: fc.string({ minLength: 5, maxLength: 20 }),
  status: joStatusArb,
  created_at: fc.option(dateStringArb, { nil: undefined }),
  updated_at: fc.option(dateStringArb, { nil: undefined }),
  customer_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
})

const invoiceArb: fc.Arbitrary<InvoiceInput> = fc.record({
  id: fc.uuid(),
  invoice_number: fc.string({ minLength: 5, maxLength: 20 }),
  status: invoiceStatusArb,
  amount: fc.option(fc.float({ min: 0, max: 1000000000, noNaN: true }).map(Math.fround), { nil: undefined }),
  due_date: fc.option(dateStringArb, { nil: undefined }),
  paid_at: fc.option(dateStringArb, { nil: undefined }),
  created_at: fc.option(dateStringArb, { nil: undefined }),
  updated_at: fc.option(dateStringArb, { nil: undefined }),
  customer_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
})


describe('Admin Dashboard Utils', () => {
  // Property 1: Period dates are valid ranges
  describe('Property 1: Period dates are valid ranges', () => {
    it('start date is before or equal to end date', () => {
      fc.assert(
        fc.property(adminPeriodTypeArb, currentDateArb, (periodType, currentDate) => {
          const period = getAdminPeriodDates(periodType, currentDate)
          expect(period.startDate.getTime()).toBeLessThanOrEqual(period.endDate.getTime())
        })
      )
    })

    it('period type is preserved', () => {
      fc.assert(
        fc.property(adminPeriodTypeArb, currentDateArb, (periodType, currentDate) => {
          const period = getAdminPeriodDates(periodType, currentDate)
          expect(period.type).toBe(periodType)
        })
      )
    })

    it('previous period ends before current period starts', () => {
      fc.assert(
        fc.property(adminPeriodTypeArb, currentDateArb, (periodType, currentDate) => {
          const current = getAdminPeriodDates(periodType, currentDate)
          const previous = getAdminPreviousPeriodDates(current)
          expect(previous.endDate.getTime()).toBeLessThan(current.startDate.getTime())
        })
      )
    })
  })

  // Property 2: KPI values are non-negative
  describe('Property 2: KPI values are non-negative', () => {
    it('all KPI counts are non-negative', () => {
      fc.assert(
        fc.property(
          fc.array(pjoArb, { maxLength: 50 }),
          fc.array(joArb, { maxLength: 50 }),
          fc.array(invoiceArb, { maxLength: 50 }),
          adminPeriodTypeArb,
          currentDateArb,
          (pjos, jos, invoices, periodType, currentDate) => {
            const period = getAdminPeriodDates(periodType, currentDate)
            const kpis = calculateAdminKPIs(pjos, jos, invoices, period)

            expect(kpis.pjosPendingApproval).toBeGreaterThanOrEqual(0)
            expect(kpis.pjosReadyForJO).toBeGreaterThanOrEqual(0)
            expect(kpis.josInProgress).toBeGreaterThanOrEqual(0)
            expect(kpis.invoicesUnpaid).toBeGreaterThanOrEqual(0)
            expect(kpis.revenueThisPeriod).toBeGreaterThanOrEqual(0)
            expect(kpis.documentsCreated).toBeGreaterThanOrEqual(0)
          }
        )
      )
    })

    it('pending approval count matches filter', () => {
      fc.assert(
        fc.property(fc.array(pjoArb, { maxLength: 50 }), (pjos) => {
          const count = countPJOsPendingApproval(pjos)
          const expected = pjos.filter(p => p.status === 'pending_approval').length
          expect(count).toBe(expected)
        })
      )
    })

    it('ready for JO count matches filter criteria', () => {
      fc.assert(
        fc.property(fc.array(pjoArb, { maxLength: 50 }), (pjos) => {
          const count = countPJOsReadyForJO(pjos)
          const expected = pjos.filter(p => 
            p.status === 'approved' && 
            p.all_costs_confirmed === true && 
            p.converted_to_jo !== true
          ).length
          expect(count).toBe(expected)
        })
      )
    })

    it('JOs in progress count matches filter', () => {
      fc.assert(
        fc.property(fc.array(joArb, { maxLength: 50 }), (jos) => {
          const count = countJOsInProgress(jos)
          const expected = jos.filter(j => j.status === 'active').length
          expect(count).toBe(expected)
        })
      )
    })

    it('unpaid invoices count matches filter', () => {
      fc.assert(
        fc.property(fc.array(invoiceArb, { maxLength: 50 }), (invoices) => {
          const count = countInvoicesUnpaid(invoices)
          const expected = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length
          expect(count).toBe(expected)
        })
      )
    })
  })

  // Property 3: Document count equals sum of individual counts
  describe('Property 3: Document count equals sum of individual counts', () => {
    it('documents created is sum of PJOs, JOs, and Invoices in period', () => {
      fc.assert(
        fc.property(
          fc.array(pjoArb, { maxLength: 20 }),
          fc.array(joArb, { maxLength: 20 }),
          fc.array(invoiceArb, { maxLength: 20 }),
          adminPeriodTypeArb,
          currentDateArb,
          (pjos, jos, invoices, periodType, currentDate) => {
            const period = getAdminPeriodDates(periodType, currentDate)
            const total = countDocumentsCreated(pjos, jos, invoices, period)

            const inPeriod = (dateStr: string | null | undefined): boolean => {
              if (!dateStr) return false
              const date = new Date(dateStr)
              return date >= period.startDate && date <= period.endDate
            }

            const pjoCount = pjos.filter(p => inPeriod(p.created_at)).length
            const joCount = jos.filter(j => inPeriod(j.created_at)).length
            const invCount = invoices.filter(i => inPeriod(i.created_at)).length

            expect(total).toBe(pjoCount + joCount + invCount)
          }
        )
      )
    })
  })

  // Property 4: Pipeline percentages sum correctly
  describe('Property 4: Pipeline percentages sum correctly', () => {
    it('pipeline percentages are calculated correctly', () => {
      fc.assert(
        fc.property(fc.array(pjoArb, { minLength: 1, maxLength: 50 }), (pjos) => {
          const stages = calculatePipelineStages(pjos)
          
          // Each stage percentage should be (count / total) * 100
          for (const stage of stages) {
            const expectedPercentage = pjos.length > 0 ? (stage.count / pjos.length) * 100 : 0
            expect(stage.percentage).toBeCloseTo(expectedPercentage, 5)
          }
        })
      )
    })

    it('pipeline percentages are all 0 when no PJOs', () => {
      const stages = calculatePipelineStages([])
      const totalPercentage = stages.reduce((sum, s) => sum + s.percentage, 0)
      expect(totalPercentage).toBe(0)
    })
  })

  // Property 5: Pipeline counts are consistent
  describe('Property 5: Pipeline counts are consistent', () => {
    it('pipeline counts PJOs correctly by status and conversion', () => {
      fc.assert(
        fc.property(fc.array(pjoArb, { maxLength: 50 }), (pjos) => {
          const stages = calculatePipelineStages(pjos)
          
          // Converted stage counts all converted_to_jo === true
          const convertedStage = stages.find(s => s.status === 'converted')
          const expectedConverted = pjos.filter(p => p.converted_to_jo === true).length
          expect(convertedStage?.count).toBe(expectedConverted)
          
          // Other stages count by status where converted_to_jo !== true
          for (const stage of stages) {
            if (stage.status !== 'converted') {
              const expected = pjos.filter(p => p.status === stage.status && p.converted_to_jo !== true).length
              expect(stage.count).toBe(expected)
            }
          }
        })
      )
    })
  })

  // Property 6: Pending work sorted by days descending
  describe('Property 6: Pending work sorted by days descending', () => {
    it('items are sorted by daysPending in descending order', () => {
      fc.assert(
        fc.property(
          fc.array(pjoArb, { maxLength: 20 }),
          fc.array(joArb, { maxLength: 20 }),
          fc.array(invoiceArb, { maxLength: 20 }),
          currentDateArb,
          (pjos, jos, invoices, currentDate) => {
            const items = getPendingWorkItems(pjos, jos, invoices, currentDate)
            
            for (let i = 1; i < items.length; i++) {
              expect(items[i - 1].daysPending).toBeGreaterThanOrEqual(items[i].daysPending)
            }
          }
        )
      )
    })

    it('sortByDaysPendingDesc maintains descending order', () => {
      const pendingItemArb: fc.Arbitrary<PendingWorkItem> = fc.record({
        id: fc.uuid(),
        type: fc.constantFrom<'pjo' | 'jo' | 'invoice'>('pjo', 'jo', 'invoice'),
        number: fc.string(),
        customerName: fc.string(),
        actionNeeded: fc.constantFrom<'create_jo' | 'create_invoice' | 'send_invoice' | 'follow_up_payment'>('create_jo', 'create_invoice', 'send_invoice', 'follow_up_payment'),
        actionLabel: fc.string(),
        daysPending: fc.integer({ min: 0, max: 365 }),
        linkUrl: fc.string(),
      })

      fc.assert(
        fc.property(fc.array(pendingItemArb, { maxLength: 50 }), (items) => {
          const sorted = sortByDaysPendingDesc(items)
          
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i - 1].daysPending).toBeGreaterThanOrEqual(sorted[i].daysPending)
          }
        })
      )
    })
  })

  // Property 7: All items have valid action types
  describe('Property 7: All items have valid action types', () => {
    it('all pending work items have valid action types', () => {
      const validActions = ['create_jo', 'create_invoice', 'send_invoice', 'follow_up_payment']

      fc.assert(
        fc.property(
          fc.array(pjoArb, { maxLength: 20 }),
          fc.array(joArb, { maxLength: 20 }),
          fc.array(invoiceArb, { maxLength: 20 }),
          currentDateArb,
          (pjos, jos, invoices, currentDate) => {
            const items = getPendingWorkItems(pjos, jos, invoices, currentDate)
            
            for (const item of items) {
              expect(validActions).toContain(item.actionNeeded)
              expect(item.actionLabel).toBeTruthy()
            }
          }
        )
      )
    })
  })

  // Property 8: Aging buckets are mutually exclusive
  describe('Property 8: Aging buckets are mutually exclusive', () => {
    it('days past due maps to exactly one bucket', () => {
      fc.assert(
        fc.property(fc.integer({ min: -100, max: 500 }), (daysPastDue) => {
          const bucketIndex = getAgingBucketIndex(daysPastDue)
          expect(bucketIndex).toBeGreaterThanOrEqual(0)
          expect(bucketIndex).toBeLessThanOrEqual(4)
        })
      )
    })

    it('bucket boundaries are correct', () => {
      expect(getAgingBucketIndex(-10)).toBe(0) // Current
      expect(getAgingBucketIndex(0)).toBe(0)   // Current
      expect(getAgingBucketIndex(1)).toBe(1)   // 1-30
      expect(getAgingBucketIndex(30)).toBe(1)  // 1-30
      expect(getAgingBucketIndex(31)).toBe(2)  // 31-60
      expect(getAgingBucketIndex(60)).toBe(2)  // 31-60
      expect(getAgingBucketIndex(61)).toBe(3)  // 61-90
      expect(getAgingBucketIndex(90)).toBe(3)  // 61-90
      expect(getAgingBucketIndex(91)).toBe(4)  // 90+
      expect(getAgingBucketIndex(365)).toBe(4) // 90+
    })
  })

  // Property 9: All unpaid invoices assigned to exactly one bucket
  describe('Property 9: All unpaid invoices assigned to exactly one bucket', () => {
    it('bucket counts sum to unpaid invoice count', () => {
      fc.assert(
        fc.property(fc.array(invoiceArb, { maxLength: 50 }), currentDateArb, (invoices, currentDate) => {
          // Only invoices with due_date can be bucketed
          const unpaidWithDueDate = invoices.filter(i => 
            (i.status === 'sent' || i.status === 'overdue') && i.due_date
          )
          
          const buckets = calculateAgingBuckets(invoices, currentDate)
          const totalBucketCount = buckets.reduce((sum, b) => sum + b.count, 0)
          
          expect(totalBucketCount).toBe(unpaidWithDueDate.length)
        })
      )
    })
  })

  // Property 10: Bucket amounts sum to total unpaid
  describe('Property 10: Bucket amounts sum to total unpaid', () => {
    it('bucket amounts sum to total unpaid amount', () => {
      fc.assert(
        fc.property(fc.array(invoiceArb, { maxLength: 50 }), currentDateArb, (invoices, currentDate) => {
          const unpaidWithDueDate = invoices.filter(i => 
            (i.status === 'sent' || i.status === 'overdue') && i.due_date
          )
          const expectedTotal = unpaidWithDueDate.reduce((sum, i) => sum + (i.amount ?? 0), 0)
          
          const buckets = calculateAgingBuckets(invoices, currentDate)
          const bucketTotal = buckets.reduce((sum, b) => sum + b.totalAmount, 0)
          
          expect(bucketTotal).toBeCloseTo(expectedTotal, 2)
        })
      )
    })
  })

  // Property 11: Recent documents sorted by date descending
  describe('Property 11: Recent documents sorted by date descending', () => {
    it('documents are sorted by updated date descending', () => {
      fc.assert(
        fc.property(
          fc.array(pjoArb, { maxLength: 20 }),
          fc.array(joArb, { maxLength: 20 }),
          fc.array(invoiceArb, { maxLength: 20 }),
          (pjos, jos, invoices) => {
            const docs = getRecentDocuments(pjos, jos, invoices, 100)
            
            for (let i = 1; i < docs.length; i++) {
              const prevDateStr = docs[i - 1].updatedAt || docs[i - 1].createdAt
              const currDateStr = docs[i].updatedAt || docs[i].createdAt
              
              // Skip comparison if either date is empty/invalid
              if (!prevDateStr || !currDateStr) continue
              
              const prevDate = new Date(prevDateStr).getTime()
              const currDate = new Date(currDateStr).getTime()
              
              // Skip if dates are NaN
              if (isNaN(prevDate) || isNaN(currDate)) continue
              
              expect(prevDate).toBeGreaterThanOrEqual(currDate)
            }
          }
        )
      )
    })

    it('respects limit parameter', () => {
      fc.assert(
        fc.property(
          fc.array(pjoArb, { minLength: 5, maxLength: 30 }),
          fc.array(joArb, { minLength: 5, maxLength: 30 }),
          fc.array(invoiceArb, { minLength: 5, maxLength: 30 }),
          fc.integer({ min: 1, max: 20 }),
          (pjos, jos, invoices, limit) => {
            const docs = getRecentDocuments(pjos, jos, invoices, limit)
            expect(docs.length).toBeLessThanOrEqual(limit)
          }
        )
      )
    })
  })

  // Property 12: Filter returns only matching types
  describe('Property 12: Filter returns only matching types', () => {
    it('filter by type returns only that type', () => {
      fc.assert(
        fc.property(
          fc.array(pjoArb, { maxLength: 20 }),
          fc.array(joArb, { maxLength: 20 }),
          fc.array(invoiceArb, { maxLength: 20 }),
          fc.constantFrom<'pjo' | 'jo' | 'invoice'>('pjo', 'jo', 'invoice'),
          (pjos, jos, invoices, filterType) => {
            const docs = getRecentDocuments(pjos, jos, invoices, 100)
            const filtered = filterDocumentsByType(docs, filterType)
            
            for (const doc of filtered) {
              expect(doc.type).toBe(filterType)
            }
          }
        )
      )
    })

    it('filter by all returns all documents', () => {
      fc.assert(
        fc.property(
          fc.array(pjoArb, { maxLength: 20 }),
          fc.array(joArb, { maxLength: 20 }),
          fc.array(invoiceArb, { maxLength: 20 }),
          (pjos, jos, invoices) => {
            const docs = getRecentDocuments(pjos, jos, invoices, 100)
            const filtered = filterDocumentsByType(docs, 'all')
            
            expect(filtered.length).toBe(docs.length)
          }
        )
      )
    })
  })

  // Property 13: Days pending calculation
  describe('Property 13: Days pending calculation', () => {
    it('days pending is non-negative', () => {
      fc.assert(
        fc.property(dateStringArb, currentDateArb, (dateStr, currentDate) => {
          const days = calculateDaysPending(dateStr, currentDate)
          expect(days).toBeGreaterThanOrEqual(0)
        })
      )
    })

    it('days past due can be negative (not yet due)', () => {
      fc.assert(
        fc.property(dateStringArb, currentDateArb, (dateStr, currentDate) => {
          const days = calculateDaysPastDue(dateStr, currentDate)
          // Can be negative, zero, or positive
          expect(typeof days).toBe('number')
          expect(Number.isFinite(days)).toBe(true)
        })
      )
    })
  })
})
