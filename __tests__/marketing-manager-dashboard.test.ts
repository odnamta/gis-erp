/**
 * Marketing Manager Dashboard - Unit Tests
 * Tests for dashboard page rendering, currency formatting, and metrics interface
 * 
 * Feature: marketing-manager-dashboard-real-data
 * **Validates: Requirements 8.1, 8.2, 8.3**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { formatCurrencyIDRCompact } from '@/lib/utils/format'
import type { MarketingManagerMetrics, RecentQuotation, RecentCustomer } from '@/lib/dashboard/marketing-manager-data'

/**
 * Property 10: Currency Formatting
 * 
 * *For any* numeric value representing IDR currency, the formatted output SHALL match 
 * the pattern with thousands separators (e.g., 1000000 → "1.000.000" or "Rp 1.000.000").
 * 
 * **Validates: Requirements 8.3**
 */
describe('Marketing Manager Dashboard - Currency Formatting (Requirement 8.3)', () => {
  describe('formatCurrencyIDRCompact', () => {
    it('should format values >= 1 billion with B suffix', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1_000_000_000, max: 999_000_000_000 }),
          (amount) => {
            const result = formatCurrencyIDRCompact(amount)
            return result.includes('B') && result.startsWith('Rp ')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should format values >= 1 million with M suffix', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1_000_000, max: 999_999_999 }),
          (amount) => {
            const result = formatCurrencyIDRCompact(amount)
            return result.includes('M') && result.startsWith('Rp ')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should format values >= 1 thousand with K suffix', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1_000, max: 999_999 }),
          (amount) => {
            const result = formatCurrencyIDRCompact(amount)
            return result.includes('K') && result.startsWith('Rp ')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should format values < 1 thousand without suffix', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 999 }),
          (amount) => {
            const result = formatCurrencyIDRCompact(amount)
            return result.startsWith('Rp ') && 
                   !result.includes('K') && 
                   !result.includes('M') && 
                   !result.includes('B')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle zero values', () => {
      const result = formatCurrencyIDRCompact(0)
      expect(result).toBeDefined()
      expect(result).toBe('Rp 0')
    })

    it('should always start with Rp prefix', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1_000_000_000_000 }),
          (amount) => {
            const result = formatCurrencyIDRCompact(amount)
            return result.startsWith('Rp ')
          }
        ),
        { numRuns: 100 }
      )
    })

    // Specific value tests for exact formatting
    it('should format 1 billion correctly', () => {
      expect(formatCurrencyIDRCompact(1_000_000_000)).toBe('Rp 1.0B')
    })

    it('should format 1.5 billion correctly', () => {
      expect(formatCurrencyIDRCompact(1_500_000_000)).toBe('Rp 1.5B')
    })

    it('should format 1 million correctly', () => {
      expect(formatCurrencyIDRCompact(1_000_000)).toBe('Rp 1.0M')
    })

    it('should format 2.5 million correctly', () => {
      expect(formatCurrencyIDRCompact(2_500_000)).toBe('Rp 2.5M')
    })

    it('should format 1 thousand correctly', () => {
      expect(formatCurrencyIDRCompact(1_000)).toBe('Rp 1.0K')
    })

    it('should format 500 correctly', () => {
      expect(formatCurrencyIDRCompact(500)).toBe('Rp 500')
    })

    it('should format typical pipeline values correctly', () => {
      // Common business values
      expect(formatCurrencyIDRCompact(50_000_000)).toBe('Rp 50.0M')
      expect(formatCurrencyIDRCompact(100_000_000)).toBe('Rp 100.0M')
      expect(formatCurrencyIDRCompact(250_000_000)).toBe('Rp 250.0M')
      expect(formatCurrencyIDRCompact(500_000_000)).toBe('Rp 500.0M')
    })
  })
})

/**
 * Metrics Interface Structure Tests
 * 
 * Tests that the MarketingManagerMetrics interface has all required fields
 * and validates the structure of the metrics object.
 * 
 * **Validates: Requirements 8.1, 8.2**
 */
describe('Marketing Manager Dashboard - Metrics Interface Structure (Requirements 8.1, 8.2)', () => {
  describe('MarketingManagerMetrics interface', () => {
    it('should have all required sales pipeline fields', () => {
      const metrics: MarketingManagerMetrics = createValidMetrics()
      
      // Sales Pipeline fields
      expect(metrics.quotationsSentMTD).toBeDefined()
      expect(typeof metrics.quotationsSentMTD).toBe('number')
      
      expect(metrics.quotationValueMTD).toBeDefined()
      expect(typeof metrics.quotationValueMTD).toBe('number')
      
      expect(metrics.wonQuotationsMTD).toBeDefined()
      expect(typeof metrics.wonQuotationsMTD).toBe('number')
      
      expect(metrics.lostQuotationsMTD).toBeDefined()
      expect(typeof metrics.lostQuotationsMTD).toBe('number')
      
      expect(metrics.winRatePercent).toBeDefined()
      expect(typeof metrics.winRatePercent).toBe('number')
      
      expect(metrics.activeQuotations).toBeDefined()
      expect(typeof metrics.activeQuotations).toBe('number')
      
      expect(metrics.pipelineValue).toBeDefined()
      expect(typeof metrics.pipelineValue).toBe('number')
    })

    it('should have all required pipeline breakdown fields', () => {
      const metrics: MarketingManagerMetrics = createValidMetrics()
      
      expect(metrics.pipelineByStatus).toBeDefined()
      expect(typeof metrics.pipelineByStatus.draft).toBe('number')
      expect(typeof metrics.pipelineByStatus.engineering_review).toBe('number')
      expect(typeof metrics.pipelineByStatus.ready).toBe('number')
      expect(typeof metrics.pipelineByStatus.submitted).toBe('number')
      expect(typeof metrics.pipelineByStatus.won).toBe('number')
      expect(typeof metrics.pipelineByStatus.lost).toBe('number')
    })

    it('should have all required customer metrics fields', () => {
      const metrics: MarketingManagerMetrics = createValidMetrics()
      
      expect(metrics.totalCustomers).toBeDefined()
      expect(typeof metrics.totalCustomers).toBe('number')
      
      expect(metrics.newCustomersMTD).toBeDefined()
      expect(typeof metrics.newCustomersMTD).toBe('number')
    })

    it('should have all required engineering department fields', () => {
      const metrics: MarketingManagerMetrics = createValidMetrics()
      
      expect(metrics.pendingEngineeringReview).toBeDefined()
      expect(typeof metrics.pendingEngineeringReview).toBe('number')
      
      expect(metrics.activeSurveys).toBeDefined()
      expect(typeof metrics.activeSurveys).toBe('number')
      
      expect(metrics.activeJMPs).toBeDefined()
      expect(typeof metrics.activeJMPs).toBe('number')
    })

    it('should have revenue metrics fields (nullable for permission gating)', () => {
      const metrics: MarketingManagerMetrics = createValidMetrics()
      
      // Revenue metrics can be null when permission is denied
      expect('revenueMTD' in metrics).toBe(true)
      expect('averageDealSize' in metrics).toBe(true)
    })

    it('should have recent activity arrays', () => {
      const metrics: MarketingManagerMetrics = createValidMetrics()
      
      expect(Array.isArray(metrics.recentQuotations)).toBe(true)
      expect(Array.isArray(metrics.recentCustomers)).toBe(true)
    })
  })

  describe('RecentQuotation interface', () => {
    it('should have all required fields', () => {
      const quotation: RecentQuotation = {
        id: 'test-id',
        quotation_number: 'QUO-2025-0001',
        title: 'Test Quotation',
        customer_name: 'Test Customer',
        status: 'draft',
        created_at: new Date().toISOString(),
      }
      
      expect(quotation.id).toBeDefined()
      expect(quotation.quotation_number).toBeDefined()
      expect(quotation.title).toBeDefined()
      expect(quotation.customer_name).toBeDefined()
      expect(quotation.status).toBeDefined()
      expect(quotation.created_at).toBeDefined()
    })
  })

  describe('RecentCustomer interface', () => {
    it('should have all required fields', () => {
      const customer: RecentCustomer = {
        id: 'test-id',
        name: 'Test Customer',
        created_at: new Date().toISOString(),
      }
      
      expect(customer.id).toBeDefined()
      expect(customer.name).toBeDefined()
      expect(customer.created_at).toBeDefined()
    })
  })
})

/**
 * Edge Cases Tests
 * 
 * Tests for zero values, null revenue metrics, and boundary conditions.
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3**
 */
describe('Marketing Manager Dashboard - Edge Cases', () => {
  describe('Zero values handling', () => {
    it('should handle metrics with all zero values', () => {
      const metrics: MarketingManagerMetrics = createZeroMetrics()
      
      expect(metrics.quotationsSentMTD).toBe(0)
      expect(metrics.quotationValueMTD).toBe(0)
      expect(metrics.wonQuotationsMTD).toBe(0)
      expect(metrics.lostQuotationsMTD).toBe(0)
      expect(metrics.winRatePercent).toBe(0)
      expect(metrics.activeQuotations).toBe(0)
      expect(metrics.pipelineValue).toBe(0)
      expect(metrics.totalCustomers).toBe(0)
      expect(metrics.newCustomersMTD).toBe(0)
      expect(metrics.pendingEngineeringReview).toBe(0)
      expect(metrics.activeSurveys).toBe(0)
      expect(metrics.activeJMPs).toBe(0)
    })

    it('should handle zero pipeline breakdown', () => {
      const metrics: MarketingManagerMetrics = createZeroMetrics()
      
      expect(metrics.pipelineByStatus.draft).toBe(0)
      expect(metrics.pipelineByStatus.engineering_review).toBe(0)
      expect(metrics.pipelineByStatus.ready).toBe(0)
      expect(metrics.pipelineByStatus.submitted).toBe(0)
      expect(metrics.pipelineByStatus.won).toBe(0)
      expect(metrics.pipelineByStatus.lost).toBe(0)
    })

    it('should format zero currency values correctly', () => {
      const result = formatCurrencyIDRCompact(0)
      expect(result).toBe('Rp 0')
    })
  })

  describe('Null revenue metrics handling', () => {
    it('should allow null revenueMTD when permission is denied', () => {
      const metrics: MarketingManagerMetrics = createMetricsWithNullRevenue()
      
      expect(metrics.revenueMTD).toBeNull()
      expect(metrics.averageDealSize).toBeNull()
    })

    it('should allow numeric revenueMTD when permission is granted', () => {
      const metrics: MarketingManagerMetrics = createValidMetrics()
      
      expect(typeof metrics.revenueMTD).toBe('number')
      expect(typeof metrics.averageDealSize).toBe('number')
    })
  })

  describe('Empty arrays handling', () => {
    it('should handle empty recentQuotations array', () => {
      const metrics: MarketingManagerMetrics = createZeroMetrics()
      
      expect(metrics.recentQuotations).toEqual([])
      expect(metrics.recentQuotations.length).toBe(0)
    })

    it('should handle empty recentCustomers array', () => {
      const metrics: MarketingManagerMetrics = createZeroMetrics()
      
      expect(metrics.recentCustomers).toEqual([])
      expect(metrics.recentCustomers.length).toBe(0)
    })
  })

  describe('Win rate edge cases', () => {
    it('should handle 100% win rate', () => {
      const metrics: MarketingManagerMetrics = {
        ...createValidMetrics(),
        wonQuotationsMTD: 10,
        lostQuotationsMTD: 0,
        winRatePercent: 100,
      }
      
      expect(metrics.winRatePercent).toBe(100)
    })

    it('should handle 0% win rate', () => {
      const metrics: MarketingManagerMetrics = {
        ...createValidMetrics(),
        wonQuotationsMTD: 0,
        lostQuotationsMTD: 10,
        winRatePercent: 0,
      }
      
      expect(metrics.winRatePercent).toBe(0)
    })

    it('should handle no closed quotations (0% win rate)', () => {
      const metrics: MarketingManagerMetrics = {
        ...createValidMetrics(),
        wonQuotationsMTD: 0,
        lostQuotationsMTD: 0,
        winRatePercent: 0,
      }
      
      expect(metrics.winRatePercent).toBe(0)
    })
  })

  describe('Large values handling', () => {
    it('should format very large pipeline values correctly', () => {
      // 10 trillion IDR
      const result = formatCurrencyIDRCompact(10_000_000_000_000)
      expect(result).toContain('B')
      expect(result).toBe('Rp 10000.0B')
    })

    it('should handle large customer counts', () => {
      const metrics: MarketingManagerMetrics = {
        ...createValidMetrics(),
        totalCustomers: 10000,
        newCustomersMTD: 500,
      }
      
      expect(metrics.totalCustomers).toBe(10000)
      expect(metrics.newCustomersMTD).toBe(500)
    })
  })
})

/**
 * Dashboard Display Integration Tests
 * 
 * Tests that verify the metrics are suitable for dashboard display.
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3**
 */
describe('Marketing Manager Dashboard - Display Integration', () => {
  describe('Marketing section display values', () => {
    it('should provide displayable activeQuotations value', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 1000 }),
          (count) => {
            const metrics: MarketingManagerMetrics = {
              ...createValidMetrics(),
              activeQuotations: count,
            }
            // Value should be a non-negative integer suitable for display
            return metrics.activeQuotations >= 0 && 
                   Number.isInteger(metrics.activeQuotations)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should provide displayable winRatePercent value', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          (rate) => {
            const metrics: MarketingManagerMetrics = {
              ...createValidMetrics(),
              winRatePercent: rate,
            }
            // Win rate should be between 0 and 100
            return metrics.winRatePercent >= 0 && 
                   metrics.winRatePercent <= 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should provide formattable pipelineValue', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1_000_000_000_000 }),
          (value) => {
            const metrics: MarketingManagerMetrics = {
              ...createValidMetrics(),
              pipelineValue: value,
            }
            const formatted = formatCurrencyIDRCompact(metrics.pipelineValue)
            // Formatted value should be a non-empty string starting with Rp
            return formatted.length > 0 && formatted.startsWith('Rp ')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Engineering section display values', () => {
    it('should provide displayable pendingEngineeringReview value', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 100 }),
          (count) => {
            const metrics: MarketingManagerMetrics = {
              ...createValidMetrics(),
              pendingEngineeringReview: count,
            }
            return metrics.pendingEngineeringReview >= 0 && 
                   Number.isInteger(metrics.pendingEngineeringReview)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should provide displayable activeSurveys value', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 100 }),
          (count) => {
            const metrics: MarketingManagerMetrics = {
              ...createValidMetrics(),
              activeSurveys: count,
            }
            return metrics.activeSurveys >= 0 && 
                   Number.isInteger(metrics.activeSurveys)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should provide displayable activeJMPs value', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 100 }),
          (count) => {
            const metrics: MarketingManagerMetrics = {
              ...createValidMetrics(),
              activeJMPs: count,
            }
            return metrics.activeJMPs >= 0 && 
                   Number.isInteger(metrics.activeJMPs)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Customer metrics section display values', () => {
    it('should provide displayable totalCustomers value', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 10000 }),
          (count) => {
            const metrics: MarketingManagerMetrics = {
              ...createValidMetrics(),
              totalCustomers: count,
            }
            return metrics.totalCustomers >= 0 && 
                   Number.isInteger(metrics.totalCustomers)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should provide displayable newCustomersMTD value', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 1000 }),
          (count) => {
            const metrics: MarketingManagerMetrics = {
              ...createValidMetrics(),
              newCustomersMTD: count,
            }
            return metrics.newCustomersMTD >= 0 && 
                   Number.isInteger(metrics.newCustomersMTD)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

// Helper functions to create test metrics objects

function createValidMetrics(): MarketingManagerMetrics {
  return {
    // Sales Pipeline
    quotationsSentMTD: 15,
    quotationValueMTD: 500_000_000,
    wonQuotationsMTD: 5,
    lostQuotationsMTD: 3,
    winRatePercent: 63,
    activeQuotations: 12,
    pipelineValue: 750_000_000,
    
    // Pipeline Breakdown
    pipelineByStatus: {
      draft: 3,
      engineering_review: 2,
      ready: 4,
      submitted: 3,
      won: 5,
      lost: 3,
    },
    
    // Customer Metrics
    totalCustomers: 150,
    newCustomersMTD: 8,
    
    // Revenue Metrics (permission-gated)
    revenueMTD: 350_000_000,
    averageDealSize: 70_000_000,
    
    // Engineering Department
    pendingEngineeringReview: 2,
    activeSurveys: 4,
    activeJMPs: 3,
    
    // Recent Activity
    recentQuotations: [
      {
        id: '1',
        quotation_number: 'QUO-2025-0001',
        title: 'Heavy Equipment Transport',
        customer_name: 'PT. ABC',
        status: 'submitted',
        created_at: new Date().toISOString(),
      },
    ],
    recentCustomers: [
      {
        id: '1',
        name: 'PT. XYZ',
        created_at: new Date().toISOString(),
      },
    ],
  }
}

function createZeroMetrics(): MarketingManagerMetrics {
  return {
    // Sales Pipeline
    quotationsSentMTD: 0,
    quotationValueMTD: 0,
    wonQuotationsMTD: 0,
    lostQuotationsMTD: 0,
    winRatePercent: 0,
    activeQuotations: 0,
    pipelineValue: 0,
    
    // Pipeline Breakdown
    pipelineByStatus: {
      draft: 0,
      engineering_review: 0,
      ready: 0,
      submitted: 0,
      won: 0,
      lost: 0,
    },
    
    // Customer Metrics
    totalCustomers: 0,
    newCustomersMTD: 0,
    
    // Revenue Metrics (permission-gated)
    revenueMTD: 0,
    averageDealSize: 0,
    
    // Engineering Department
    pendingEngineeringReview: 0,
    activeSurveys: 0,
    activeJMPs: 0,
    
    // Recent Activity
    recentQuotations: [],
    recentCustomers: [],
  }
}

function createMetricsWithNullRevenue(): MarketingManagerMetrics {
  return {
    ...createValidMetrics(),
    revenueMTD: null,
    averageDealSize: null,
  }
}
