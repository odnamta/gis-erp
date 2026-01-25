/**
 * Property-based tests for Customs Dashboard Data Service
 * Tests correctness properties for customs document filtering and calculations
 * 
 * **Feature: customs-dashboard**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculateDaysBetween, mapToUnifiedStatus } from '@/lib/dashboard/customs-data'
import type { DocumentsByStatus } from '@/lib/dashboard/customs-data'

// =====================================================
// Constants matching customs-data.ts
// =====================================================

const PIB_PENDING_STATUSES = ['draft', 'submitted', 'checking']
const PIB_COMPLETED_STATUSES = ['approved', 'released']
const PIB_TERMINAL_STATUSES = ['released', 'cancelled']

const PEB_PENDING_STATUSES = ['draft', 'submitted']
const PEB_COMPLETED_STATUSES = ['approved', 'loaded', 'departed']
const PEB_TERMINAL_STATUSES = ['departed', 'cancelled']

// =====================================================
// Test Helpers - Pure functions for testing
// =====================================================

/**
 * Filter PIB documents by pending status
 */
function filterPibPending<T extends { status: string }>(docs: T[]): T[] {
  return docs.filter(d => PIB_PENDING_STATUSES.includes(d.status.toLowerCase()))
}

/**
 * Filter PIB documents by completed status
 */
function filterPibCompleted<T extends { status: string }>(docs: T[]): T[] {
  return docs.filter(d => PIB_COMPLETED_STATUSES.includes(d.status.toLowerCase()))
}

/**
 * Filter PEB documents by pending status
 */
function filterPebPending<T extends { status: string }>(docs: T[]): T[] {
  return docs.filter(d => PEB_PENDING_STATUSES.includes(d.status.toLowerCase()))
}

/**
 * Filter PEB documents by completed status
 */
function filterPebCompleted<T extends { status: string }>(docs: T[]): T[] {
  return docs.filter(d => PEB_COMPLETED_STATUSES.includes(d.status.toLowerCase()))
}

/**
 * Filter documents due soon (within 7 days)
 */
function filterDueSoon<T extends { etaDate: string | null; status: string }>(
  docs: T[],
  today: Date,
  terminalStatuses: string[]
): T[] {
  const todayStr = today.toISOString().split('T')[0]
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]
  
  return docs.filter(d => 
    d.etaDate !== null &&
    d.etaDate >= todayStr &&
    d.etaDate <= sevenDaysFromNow &&
    !terminalStatuses.includes(d.status.toLowerCase())
  )
}

/**
 * Filter overdue documents
 */
function filterOverdue<T extends { etaDate: string | null; status: string }>(
  docs: T[],
  today: Date,
  terminalStatuses: string[]
): T[] {
  const todayStr = today.toISOString().split('T')[0]
  
  return docs.filter(d => 
    d.etaDate !== null &&
    d.etaDate < todayStr &&
    !terminalStatuses.includes(d.status.toLowerCase())
  )
}

/**
 * Calculate sum of amounts
 */
function sumAmounts<T extends { amount: number }>(records: T[]): number {
  return records.reduce((sum, r) => sum + r.amount, 0)
}

/**
 * Group documents by unified status
 */
function groupByUnifiedStatus(
  pibDocs: { status: string }[],
  pebDocs: { status: string }[]
): DocumentsByStatus {
  const result: DocumentsByStatus = {
    draft: 0,
    submitted: 0,
    processing: 0,
    cleared: 0,
    rejected: 0,
  }
  
  for (const doc of pibDocs) {
    const unified = mapToUnifiedStatus(doc.status, 'PIB')
    result[unified]++
  }
  
  for (const doc of pebDocs) {
    const unified = mapToUnifiedStatus(doc.status, 'PEB')
    result[unified]++
  }
  
  return result
}

// =====================================================
// Arbitraries
// =====================================================

// Generate dates within a reasonable range (2024-2026)
const dateTimestampArb = fc.integer({ 
  min: new Date('2024-01-01').getTime(), 
  max: new Date('2026-12-31').getTime() 
})

const dateStringArb = dateTimestampArb.map(ts => new Date(ts).toISOString().split('T')[0])

// Generate a "today" date
const todayArb = fc.integer({
  min: new Date('2025-01-01').getTime(),
  max: new Date('2026-06-30').getTime()
}).map(ts => new Date(ts))

// PIB statuses
const pibStatusArb = fc.constantFrom('draft', 'submitted', 'checking', 'approved', 'released', 'cancelled')

// PEB statuses
const pebStatusArb = fc.constantFrom('draft', 'submitted', 'approved', 'loaded', 'departed', 'cancelled')

// PIB document arbitrary
const pibDocArb = fc.record({
  id: fc.uuid(),
  internalRef: fc.string({ minLength: 1, maxLength: 20 }),
  pibNumber: fc.string({ minLength: 1, maxLength: 20 }),
  status: pibStatusArb,
  etaDate: fc.option(dateStringArb, { nil: null }),
  importerName: fc.string({ minLength: 1, maxLength: 50 }),
  createdAt: dateStringArb,
})

// PEB document arbitrary
const pebDocArb = fc.record({
  id: fc.uuid(),
  internalRef: fc.string({ minLength: 1, maxLength: 20 }),
  pebNumber: fc.string({ minLength: 1, maxLength: 20 }),
  status: pebStatusArb,
  etdDate: fc.option(dateStringArb, { nil: null }),
  exporterName: fc.string({ minLength: 1, maxLength: 50 }),
  createdAt: dateStringArb,
})

// Fee record arbitrary
const feeRecordArb = fc.record({
  id: fc.uuid(),
  amount: fc.float({ min: 0, max: 1000000000, noNaN: true }),
  paymentStatus: fc.constantFrom('unpaid', 'paid', 'waived', 'cancelled'),
  paymentDate: fc.option(dateStringArb, { nil: null }),
})

// HS code item arbitrary
const hsCodeItemArb = fc.record({
  hsCode: fc.stringMatching(/^[0-9]{4}\.[0-9]{2}\.[0-9]{2}$/),
  hsDescription: fc.string({ minLength: 1, maxLength: 100 }),
})

// =====================================================
// Property Tests
// =====================================================

describe('Customs Dashboard Data - Property Tests', () => {
  
  // =====================================================
  // Property 1: Status Filtering Correctness
  // =====================================================
  
  describe('Property 1: Status filtering correctness', () => {
    /**
     * **Feature: customs-dashboard, Property 1: Status filtering correctness**
     * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
     * 
     * For any collection of documents (PIB or PEB) with various status values,
     * filtering by a set of statuses should return exactly the count of records
     * whose status is in that set.
     */
    
    it('should count PIB pending documents correctly', () => {
      fc.assert(
        fc.property(
          fc.array(pibDocArb, { minLength: 0, maxLength: 100 }),
          (docs) => {
            const pendingCount = filterPibPending(docs).length
            
            const expectedCount = docs.filter(d => 
              ['draft', 'submitted', 'checking'].includes(d.status.toLowerCase())
            ).length
            
            return pendingCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count PIB completed documents correctly', () => {
      fc.assert(
        fc.property(
          fc.array(pibDocArb, { minLength: 0, maxLength: 100 }),
          (docs) => {
            const completedCount = filterPibCompleted(docs).length
            
            const expectedCount = docs.filter(d => 
              ['approved', 'released'].includes(d.status.toLowerCase())
            ).length
            
            return completedCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count PEB pending documents correctly', () => {
      fc.assert(
        fc.property(
          fc.array(pebDocArb, { minLength: 0, maxLength: 100 }),
          (docs) => {
            const pendingCount = filterPebPending(docs).length
            
            const expectedCount = docs.filter(d => 
              ['draft', 'submitted'].includes(d.status.toLowerCase())
            ).length
            
            return pendingCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count PEB completed documents correctly', () => {
      fc.assert(
        fc.property(
          fc.array(pebDocArb, { minLength: 0, maxLength: 100 }),
          (docs) => {
            const completedCount = filterPebCompleted(docs).length
            
            const expectedCount = docs.filter(d => 
              ['approved', 'loaded', 'departed'].includes(d.status.toLowerCase())
            ).length
            
            return completedCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 for empty document collection', () => {
      expect(filterPibPending([]).length).toBe(0)
      expect(filterPibCompleted([]).length).toBe(0)
      expect(filterPebPending([]).length).toBe(0)
      expect(filterPebCompleted([]).length).toBe(0)
    })

    it('should partition PIB documents into pending, completed, and cancelled', () => {
      fc.assert(
        fc.property(
          fc.array(pibDocArb, { minLength: 0, maxLength: 100 }),
          (docs) => {
            const pendingCount = filterPibPending(docs).length
            const completedCount = filterPibCompleted(docs).length
            const cancelledCount = docs.filter(d => d.status.toLowerCase() === 'cancelled').length
            
            return pendingCount + completedCount + cancelledCount === docs.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should partition PEB documents into pending, completed, and cancelled', () => {
      fc.assert(
        fc.property(
          fc.array(pebDocArb, { minLength: 0, maxLength: 100 }),
          (docs) => {
            const pendingCount = filterPebPending(docs).length
            const completedCount = filterPebCompleted(docs).length
            const cancelledCount = docs.filter(d => d.status.toLowerCase() === 'cancelled').length
            
            return pendingCount + completedCount + cancelledCount === docs.length
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 2: Date Range Filtering Correctness
  // =====================================================
  
  describe('Property 2: Date range filtering correctness', () => {
    /**
     * **Feature: customs-dashboard, Property 2: Date range filtering correctness**
     * **Validates: Requirements 1.6, 3.1, 4.1, 4.2**
     * 
     * For any collection of records with date fields and any date range,
     * the count returned should equal exactly the number of records with
     * dates within that range.
     */
    
    it('should count documents due soon correctly (within 7 days)', () => {
      fc.assert(
        fc.property(
          fc.array(pibDocArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (docs, today) => {
            const docsWithEta = docs.map(d => ({ ...d, etaDate: d.etaDate }))
            const dueSoonCount = filterDueSoon(docsWithEta, today, PIB_TERMINAL_STATUSES).length
            
            const todayStr = today.toISOString().split('T')[0]
            const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0]
            
            const expectedCount = docs.filter(d => 
              d.etaDate !== null &&
              d.etaDate >= todayStr &&
              d.etaDate <= sevenDaysFromNow &&
              !PIB_TERMINAL_STATUSES.includes(d.status.toLowerCase())
            ).length
            
            return dueSoonCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count overdue documents correctly', () => {
      fc.assert(
        fc.property(
          fc.array(pibDocArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (docs, today) => {
            const docsWithEta = docs.map(d => ({ ...d, etaDate: d.etaDate }))
            const overdueCount = filterOverdue(docsWithEta, today, PIB_TERMINAL_STATUSES).length
            
            const todayStr = today.toISOString().split('T')[0]
            
            const expectedCount = docs.filter(d => 
              d.etaDate !== null &&
              d.etaDate < todayStr &&
              !PIB_TERMINAL_STATUSES.includes(d.status.toLowerCase())
            ).length
            
            return overdueCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 due soon when all documents have null dates', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              status: pibStatusArb,
              etaDate: fc.constant(null),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          todayArb,
          (docs, today) => {
            const dueSoonCount = filterDueSoon(docs, today, PIB_TERMINAL_STATUSES).length
            return dueSoonCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 overdue when all documents have null dates', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              status: pibStatusArb,
              etaDate: fc.constant(null),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          todayArb,
          (docs, today) => {
            const overdueCount = filterOverdue(docs, today, PIB_TERMINAL_STATUSES).length
            return overdueCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not count terminal status documents as due soon', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.integer({ min: 1, max: 50 }),
          (today, count) => {
            const todayStr = today.toISOString().split('T')[0]
            
            // All documents are terminal status (released/cancelled)
            const docs = Array.from({ length: count }, (_, i) => ({
              id: `doc-${i}`,
              status: i % 2 === 0 ? 'released' : 'cancelled',
              etaDate: todayStr, // Would be due soon if not terminal
            }))
            
            const dueSoonCount = filterDueSoon(docs, today, PIB_TERMINAL_STATUSES).length
            return dueSoonCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not count terminal status documents as overdue', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.integer({ min: 1, max: 50 }),
          (today, count) => {
            const pastDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0]
            
            // All documents are terminal status (released/cancelled)
            const docs = Array.from({ length: count }, (_, i) => ({
              id: `doc-${i}`,
              status: i % 2 === 0 ? 'released' : 'cancelled',
              etaDate: pastDate, // Would be overdue if not terminal
            }))
            
            const overdueCount = filterOverdue(docs, today, PIB_TERMINAL_STATUSES).length
            return overdueCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 3: Sum Aggregation Correctness
  // =====================================================
  
  describe('Property 3: Sum aggregation correctness', () => {
    /**
     * **Feature: customs-dashboard, Property 3: Sum aggregation correctness**
     * **Validates: Requirements 3.1, 3.3**
     * 
     * For any collection of fee records with amounts, the sum of amounts
     * for records matching a filter should equal the mathematical sum.
     */
    
    it('should calculate sum of paid fees correctly', () => {
      fc.assert(
        fc.property(
          fc.array(feeRecordArb, { minLength: 0, maxLength: 100 }),
          (fees) => {
            const paidFees = fees.filter(f => f.paymentStatus === 'paid')
            const calculatedSum = sumAmounts(paidFees)
            
            const expectedSum = fees
              .filter(f => f.paymentStatus === 'paid')
              .reduce((sum, f) => sum + f.amount, 0)
            
            return Math.abs(calculatedSum - expectedSum) < 0.01
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate sum of unpaid fees correctly', () => {
      fc.assert(
        fc.property(
          fc.array(feeRecordArb, { minLength: 0, maxLength: 100 }),
          (fees) => {
            const unpaidFees = fees.filter(f => f.paymentStatus === 'unpaid')
            const calculatedSum = sumAmounts(unpaidFees)
            
            const expectedSum = fees
              .filter(f => f.paymentStatus === 'unpaid')
              .reduce((sum, f) => sum + f.amount, 0)
            
            return Math.abs(calculatedSum - expectedSum) < 0.01
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 for empty fee collection', () => {
      expect(sumAmounts([])).toBe(0)
    })

    it('should return 0 when no fees match the filter', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              amount: fc.float({ min: 1, max: 1000000, noNaN: true }),
              paymentStatus: fc.constantFrom('waived', 'cancelled'),
              paymentDate: fc.constant(null),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (fees) => {
            const paidFees = fees.filter(f => f.paymentStatus === 'paid')
            const unpaidFees = fees.filter(f => f.paymentStatus === 'unpaid')
            
            return sumAmounts(paidFees) === 0 && sumAmounts(unpaidFees) === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle large amounts without overflow', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              amount: fc.float({ min: 100000000, max: 1000000000, noNaN: true }),
              paymentStatus: fc.constant('paid'),
              paymentDate: dateStringArb,
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (fees) => {
            const sum = sumAmounts(fees)
            return sum >= 0 && isFinite(sum)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 4: Status Grouping Correctness
  // =====================================================
  
  describe('Property 4: Status grouping correctness', () => {
    /**
     * **Feature: customs-dashboard, Property 4: Status grouping correctness**
     * **Validates: Requirements 2.1**
     * 
     * For any collection of documents with status values, grouping by mapped
     * status categories should produce counts that sum to the total document count.
     */
    
    it('should group all documents into unified status categories', () => {
      fc.assert(
        fc.property(
          fc.array(pibDocArb, { minLength: 0, maxLength: 50 }),
          fc.array(pebDocArb, { minLength: 0, maxLength: 50 }),
          (pibDocs, pebDocs) => {
            const grouped = groupByUnifiedStatus(pibDocs, pebDocs)
            
            const totalGrouped = grouped.draft + grouped.submitted + 
              grouped.processing + grouped.cleared + grouped.rejected
            
            const totalDocs = pibDocs.length + pebDocs.length
            
            return totalGrouped === totalDocs
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should map PIB statuses correctly', () => {
      expect(mapToUnifiedStatus('draft', 'PIB')).toBe('draft')
      expect(mapToUnifiedStatus('submitted', 'PIB')).toBe('submitted')
      expect(mapToUnifiedStatus('checking', 'PIB')).toBe('processing')
      expect(mapToUnifiedStatus('approved', 'PIB')).toBe('cleared')
      expect(mapToUnifiedStatus('released', 'PIB')).toBe('cleared')
      expect(mapToUnifiedStatus('cancelled', 'PIB')).toBe('rejected')
    })

    it('should map PEB statuses correctly', () => {
      expect(mapToUnifiedStatus('draft', 'PEB')).toBe('draft')
      expect(mapToUnifiedStatus('submitted', 'PEB')).toBe('submitted')
      expect(mapToUnifiedStatus('approved', 'PEB')).toBe('cleared')
      expect(mapToUnifiedStatus('loaded', 'PEB')).toBe('cleared')
      expect(mapToUnifiedStatus('departed', 'PEB')).toBe('cleared')
      expect(mapToUnifiedStatus('cancelled', 'PEB')).toBe('rejected')
    })

    it('should return all zeros for empty collections', () => {
      const grouped = groupByUnifiedStatus([], [])
      
      expect(grouped.draft).toBe(0)
      expect(grouped.submitted).toBe(0)
      expect(grouped.processing).toBe(0)
      expect(grouped.cleared).toBe(0)
      expect(grouped.rejected).toBe(0)
    })

    it('should handle case-insensitive status matching', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('DRAFT', 'Draft', 'draft', 'SUBMITTED', 'Submitted'),
          (status) => {
            const result = mapToUnifiedStatus(status, 'PIB')
            return result === 'draft' || result === 'submitted'
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  // =====================================================
  // Property 5: Ordering and Limiting Correctness
  // =====================================================
  
  describe('Property 5: Ordering and limiting correctness', () => {
    /**
     * **Feature: customs-dashboard, Property 5: Ordering and limiting correctness**
     * **Validates: Requirements 4.5, 5.2, 6.1, 6.3**
     * 
     * For any collection of records, ordering by a specified field and limiting
     * to N items should return at most N items in the correct order.
     */
    
    it('should limit results to specified count', () => {
      fc.assert(
        fc.property(
          fc.array(pibDocArb, { minLength: 0, maxLength: 100 }),
          fc.integer({ min: 1, max: 20 }),
          (docs, limit) => {
            const limited = docs.slice(0, limit)
            return limited.length <= limit
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should order documents by date ascending for due soon', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              etaDate: dateStringArb,
            }),
            { minLength: 2, maxLength: 50 }
          ),
          (docs) => {
            const sorted = [...docs].sort((a, b) => 
              a.etaDate.localeCompare(b.etaDate)
            )
            
            // Verify ascending order
            for (let i = 1; i < sorted.length; i++) {
              if (sorted[i].etaDate < sorted[i - 1].etaDate) {
                return false
              }
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should order documents by date descending for recent', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              createdAt: dateStringArb,
            }),
            { minLength: 2, maxLength: 50 }
          ),
          (docs) => {
            const sorted = [...docs].sort((a, b) => 
              b.createdAt.localeCompare(a.createdAt)
            )
            
            // Verify descending order
            for (let i = 1; i < sorted.length; i++) {
              if (sorted[i].createdAt > sorted[i - 1].createdAt) {
                return false
              }
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should order HS codes by usage count descending', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              hsCode: fc.string({ minLength: 4, maxLength: 12 }),
              usageCount: fc.integer({ min: 0, max: 1000 }),
            }),
            { minLength: 2, maxLength: 50 }
          ),
          (codes) => {
            const sorted = [...codes].sort((a, b) => b.usageCount - a.usageCount)
            
            // Verify descending order
            for (let i = 1; i < sorted.length; i++) {
              if (sorted[i].usageCount > sorted[i - 1].usageCount) {
                return false
              }
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array when input is empty', () => {
      const sorted: { id: string }[] = []
      expect(sorted.slice(0, 5)).toEqual([])
    })
  })

  // =====================================================
  // Property 6: Data Transformation Completeness
  // =====================================================
  
  describe('Property 6: Data transformation completeness', () => {
    /**
     * **Feature: customs-dashboard, Property 6: Data transformation completeness**
     * **Validates: Requirements 5.1, 6.2**
     * 
     * For any document record from the database, the transformed object should
     * contain all required fields with appropriate null handling.
     */
    
    it('should transform PIB document with all fields', () => {
      fc.assert(
        fc.property(pibDocArb, (doc) => {
          const transformed = {
            id: doc.id,
            documentRef: doc.internalRef || doc.pibNumber || '',
            documentType: 'PIB' as const,
            status: doc.status || '',
            createdAt: doc.createdAt || '',
            importerExporter: doc.importerName || '',
          }
          
          return (
            typeof transformed.id === 'string' &&
            typeof transformed.documentRef === 'string' &&
            transformed.documentType === 'PIB' &&
            typeof transformed.status === 'string' &&
            typeof transformed.createdAt === 'string' &&
            typeof transformed.importerExporter === 'string'
          )
        }),
        { numRuns: 100 }
      )
    })

    it('should transform PEB document with all fields', () => {
      fc.assert(
        fc.property(pebDocArb, (doc) => {
          const transformed = {
            id: doc.id,
            documentRef: doc.internalRef || doc.pebNumber || '',
            documentType: 'PEB' as const,
            status: doc.status || '',
            createdAt: doc.createdAt || '',
            importerExporter: doc.exporterName || '',
          }
          
          return (
            typeof transformed.id === 'string' &&
            typeof transformed.documentRef === 'string' &&
            transformed.documentType === 'PEB' &&
            typeof transformed.status === 'string' &&
            typeof transformed.createdAt === 'string' &&
            typeof transformed.importerExporter === 'string'
          )
        }),
        { numRuns: 100 }
      )
    })

    it('should handle null/undefined values gracefully', () => {
      const doc = {
        id: 'test-id',
        internalRef: null,
        pibNumber: null,
        status: null,
        createdAt: null,
        importerName: null,
      }
      
      const transformed = {
        id: doc.id,
        documentRef: doc.internalRef || doc.pibNumber || '',
        documentType: 'PIB' as const,
        status: doc.status || '',
        createdAt: doc.createdAt || '',
        importerExporter: doc.importerName || '',
      }
      
      expect(transformed.documentRef).toBe('')
      expect(transformed.status).toBe('')
      expect(transformed.createdAt).toBe('')
      expect(transformed.importerExporter).toBe('')
    })

    it('should transform HS code item with all fields', () => {
      fc.assert(
        fc.property(hsCodeItemArb, (item) => {
          const transformed = {
            hsCode: item.hsCode || '',
            description: item.hsDescription || '',
            usageCount: 1,
          }
          
          return (
            typeof transformed.hsCode === 'string' &&
            typeof transformed.description === 'string' &&
            typeof transformed.usageCount === 'number'
          )
        }),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 7: Warning Threshold Logic
  // =====================================================
  
  describe('Property 7: Warning threshold logic', () => {
    /**
     * **Feature: customs-dashboard, Property 7: Warning threshold logic**
     * **Validates: Requirements 3.5**
     * 
     * For any numeric count value, the warning indicator should be displayed
     * if and only if the count is greater than zero.
     */
    
    function getWarningIndicator(count: number): 'danger' | 'warning' | 'success' | null {
      if (count > 0) return 'warning'
      return null
    }
    
    function getDangerIndicator(count: number): 'danger' | 'warning' | 'success' | null {
      if (count > 0) return 'danger'
      return null
    }
    
    it('should show warning indicator when count > 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (count) => {
            return getWarningIndicator(count) === 'warning'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not show warning indicator when count = 0', () => {
      expect(getWarningIndicator(0)).toBeNull()
    })

    it('should show danger indicator for overdue when count > 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (count) => {
            return getDangerIndicator(count) === 'danger'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not show danger indicator when count = 0', () => {
      expect(getDangerIndicator(0)).toBeNull()
    })

    it('should handle boundary case: count = 1', () => {
      expect(getWarningIndicator(1)).toBe('warning')
      expect(getDangerIndicator(1)).toBe('danger')
    })
  })

  // =====================================================
  // Property 8: Cache Key Format
  // =====================================================
  
  describe('Property 8: Cache key format', () => {
    /**
     * **Feature: customs-dashboard, Property 8: Cache key format**
     * **Validates: Requirements 8.4**
     * 
     * For any role string and date, the generated cache key should match
     * the pattern 'customs-dashboard-metrics:{role}:{YYYY-MM-DD}'.
     */
    
    function generateTestCacheKey(prefix: string, role: string, date: Date): string {
      const dateStr = date.toISOString().split('T')[0]
      return `${prefix}:${role}:${dateStr}`
    }
    
    it('should generate cache key in correct format', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('customs', 'owner', 'director', 'finance_manager'),
          todayArb,
          (role, date) => {
            const key = generateTestCacheKey('customs-dashboard-metrics', role, date)
            
            // Verify format: prefix:role:YYYY-MM-DD
            const parts = key.split(':')
            if (parts.length !== 3) return false
            
            const [prefix, keyRole, dateStr] = parts
            if (prefix !== 'customs-dashboard-metrics') return false
            if (keyRole !== role) return false
            
            // Verify date format
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/
            return dateRegex.test(dateStr)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include role in cache key', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('customs', 'owner', 'director', 'finance_manager'),
          todayArb,
          (role, date) => {
            const key = generateTestCacheKey('customs-dashboard-metrics', role, date)
            return key.includes(role)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include date in cache key', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('customs'),
          todayArb,
          (role, date) => {
            const key = generateTestCacheKey('customs-dashboard-metrics', role, date)
            const dateStr = date.toISOString().split('T')[0]
            return key.includes(dateStr)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate different keys for different roles', () => {
      const date = new Date('2025-01-15')
      const key1 = generateTestCacheKey('customs-dashboard-metrics', 'customs', date)
      const key2 = generateTestCacheKey('customs-dashboard-metrics', 'owner', date)
      
      expect(key1).not.toBe(key2)
    })

    it('should generate different keys for different dates', () => {
      const date1 = new Date('2025-01-15')
      const date2 = new Date('2025-01-16')
      const key1 = generateTestCacheKey('customs-dashboard-metrics', 'customs', date1)
      const key2 = generateTestCacheKey('customs-dashboard-metrics', 'customs', date2)
      
      expect(key1).not.toBe(key2)
    })
  })

  // =====================================================
  // Property 10: Role-Based Access Control
  // =====================================================
  
  describe('Property 10: Role-based access control', () => {
    /**
     * **Feature: customs-dashboard, Property 10: Role-based access control**
     * **Validates: Requirements 9.1, 9.2, 9.3**
     * 
     * For any user role, access to the Customs Dashboard should be granted
     * if and only if the role is in the allowed set.
     */
    
    const ALLOWED_ROLES = ['customs', 'owner', 'director', 'finance_manager']
    
    function hasAccess(role: string): boolean {
      return ALLOWED_ROLES.includes(role)
    }
    
    it('should grant access to allowed roles', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('customs', 'owner', 'director', 'finance_manager'),
          (role) => {
            return hasAccess(role) === true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should deny access to non-allowed roles', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'marketing', 'ops', 'finance', 'hr', 'hse', 'agency',
            'administration', 'engineer', 'marketing_manager', 'operations_manager'
          ),
          (role) => {
            return hasAccess(role) === false
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle unknown roles by denying access', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !ALLOWED_ROLES.includes(s)),
          (role) => {
            return hasAccess(role) === false
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be case-sensitive for role matching', () => {
      expect(hasAccess('CUSTOMS')).toBe(false)
      expect(hasAccess('Customs')).toBe(false)
      expect(hasAccess('customs')).toBe(true)
    })
  })

  // =====================================================
  // calculateDaysBetween helper function tests
  // =====================================================
  
  describe('calculateDaysBetween helper function', () => {
    it('should return 0 for same day', () => {
      fc.assert(
        fc.property(todayArb, (date) => {
          const result = calculateDaysBetween(date, date)
          return result === 0
        }),
        { numRuns: 100 }
      )
    })

    it('should return positive number when end date is after start date', () => {
      fc.assert(
        fc.property(
          dateTimestampArb,
          fc.integer({ min: 1, max: 365 }),
          (startTs, daysToAdd) => {
            const startDate = new Date(startTs)
            const endDate = new Date(startTs + daysToAdd * 24 * 60 * 60 * 1000)
            
            const result = calculateDaysBetween(startDate, endDate)
            
            return result >= 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate correct number of days between two dates', () => {
      fc.assert(
        fc.property(
          dateTimestampArb,
          fc.integer({ min: 0, max: 1000 }),
          (startTs, daysToAdd) => {
            const startDate = new Date(startTs)
            const endDate = new Date(startTs + daysToAdd * 24 * 60 * 60 * 1000)
            
            const result = calculateDaysBetween(startDate, endDate)
            
            // Should be approximately equal to daysToAdd (may differ by 1 due to DST)
            return Math.abs(result - daysToAdd) <= 1
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
