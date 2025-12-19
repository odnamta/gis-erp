import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  validateTermsTotal,
  getPresetTerms,
  getTermStatus,
  calculateTermAmount,
  calculateVAT,
  calculateTermInvoiceTotals,
  calculateTermsPercentageTotal,
  calculateTotalInvoicedFromTerms,
  calculateTotalInvoiceableAmount,
  hasAnyInvoicedTerm,
  INVOICE_TERM_PRESETS,
  VAT_RATE,
  InvoiceTerm,
  TriggerType,
  PresetType,
} from '@/lib/invoice-terms-utils'

/**
 * **Feature: invoice-splitting, Property 1: Percentage Validation**
 * *For any* set of invoice terms, the validation function SHALL return true
 * if and only if the sum of all term percentages equals exactly 100.
 * **Validates: Requirements 1.4, 1.5**
 */
describe('Property 1: Percentage Validation', () => {
  it('should return true when percentages sum to exactly 100', () => {
    fc.assert(
      fc.property(
        // Generate array of positive numbers that sum to 100
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 5 })
          .filter(arr => arr.reduce((a, b) => a + b, 0) <= 100)
          .map(arr => {
            const sum = arr.reduce((a, b) => a + b, 0)
            if (sum < 100) {
              arr.push(100 - sum)
            }
            return arr
          }),
        (percentages) => {
          const terms: InvoiceTerm[] = percentages.map((p, i) => ({
            term: `term_${i}`,
            percentage: p,
            description: `Term ${i}`,
            trigger: 'jo_created' as TriggerType,
            invoiced: false,
          }))
          
          const total = terms.reduce((sum, t) => sum + t.percentage, 0)
          if (Math.abs(total - 100) < 0.01) {
            expect(validateTermsTotal(terms)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })


  it('should return false when percentages do not sum to 100', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 50 }), { minLength: 1, maxLength: 5 }),
        (percentages) => {
          const total = percentages.reduce((a, b) => a + b, 0)
          // Skip if accidentally equals 100
          if (Math.abs(total - 100) < 0.01) return true
          
          const terms: InvoiceTerm[] = percentages.map((p, i) => ({
            term: `term_${i}`,
            percentage: p,
            description: `Term ${i}`,
            trigger: 'jo_created' as TriggerType,
            invoiced: false,
          }))
          
          expect(validateTermsTotal(terms)).toBe(false)
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return false for empty terms array', () => {
    expect(validateTermsTotal([])).toBe(false)
  })
})

/**
 * **Feature: invoice-splitting, Property 2: Preset Terms Generation**
 * *For any* preset type selection, the generated terms SHALL have percentages
 * that sum to exactly 100 and match the predefined template structure.
 * **Validates: Requirements 1.2, 2.2, 2.3, 2.4**
 */
describe('Property 2: Preset Terms Generation', () => {
  const presetTypes: Array<Exclude<PresetType, 'custom'>> = ['single', 'dp_final', 'dp_delivery_final']

  it('should generate terms that sum to exactly 100% for all presets', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...presetTypes),
        (preset) => {
          const terms = getPresetTerms(preset)
          const total = calculateTermsPercentageTotal(terms)
          expect(total).toBe(100)
          expect(validateTermsTotal(terms)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return empty array for custom preset', () => {
    const terms = getPresetTerms('custom')
    expect(terms).toEqual([])
  })

  it('should return deep copies that do not mutate original presets', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...presetTypes),
        (preset) => {
          const terms1 = getPresetTerms(preset)
          const terms2 = getPresetTerms(preset)
          
          // Modify first copy
          terms1[0].percentage = 999
          
          // Second copy should be unaffected
          expect(terms2[0].percentage).not.toBe(999)
          
          // Original preset should be unaffected
          expect(INVOICE_TERM_PRESETS[preset][0].percentage).not.toBe(999)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('single preset should have one term with 100%', () => {
    const terms = getPresetTerms('single')
    expect(terms.length).toBe(1)
    expect(terms[0].percentage).toBe(100)
    expect(terms[0].trigger).toBe('jo_created')
  })

  it('dp_final preset should have 30/70 split', () => {
    const terms = getPresetTerms('dp_final')
    expect(terms.length).toBe(2)
    expect(terms[0].percentage).toBe(30)
    expect(terms[1].percentage).toBe(70)
  })

  it('dp_delivery_final preset should have 30/50/20 split', () => {
    const terms = getPresetTerms('dp_delivery_final')
    expect(terms.length).toBe(3)
    expect(terms[0].percentage).toBe(30)
    expect(terms[1].percentage).toBe(50)
    expect(terms[2].percentage).toBe(20)
  })
})


/**
 * **Feature: invoice-splitting, Property 3: Term Status Determination**
 * *For any* invoice term, the status SHALL be:
 * - "invoiced" if term.invoiced is true
 * - "ready" if trigger condition is met and term.invoiced is false
 * - "locked" if trigger condition is not met
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */
describe('Property 3: Term Status Determination', () => {
  const triggers: TriggerType[] = ['jo_created', 'surat_jalan', 'berita_acara', 'delivery']
  const joStatuses = ['active', 'in_progress', 'completed', 'submitted_to_finance', 'invoiced', 'closed']

  it('should return "invoiced" when term.invoiced is true regardless of other conditions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...triggers),
        fc.constantFrom(...joStatuses),
        fc.boolean(),
        fc.boolean(),
        (trigger, joStatus, hasSuratJalan, hasBeritaAcara) => {
          const term: InvoiceTerm = {
            term: 'test',
            percentage: 50,
            description: 'Test',
            trigger,
            invoiced: true,
          }
          
          const status = getTermStatus(term, joStatus, hasSuratJalan, hasBeritaAcara)
          expect(status).toBe('invoiced')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return "ready" for jo_created trigger when not invoiced', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...joStatuses),
        (joStatus) => {
          const term: InvoiceTerm = {
            term: 'test',
            percentage: 50,
            description: 'Test',
            trigger: 'jo_created',
            invoiced: false,
          }
          
          const status = getTermStatus(term, joStatus)
          expect(status).toBe('ready')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return "ready" for delivery trigger when JO is completed or later', () => {
    const completedStatuses = ['completed', 'submitted_to_finance', 'invoiced', 'closed']
    
    fc.assert(
      fc.property(
        fc.constantFrom(...completedStatuses),
        (joStatus) => {
          const term: InvoiceTerm = {
            term: 'test',
            percentage: 50,
            description: 'Test',
            trigger: 'delivery',
            invoiced: false,
          }
          
          const status = getTermStatus(term, joStatus)
          expect(status).toBe('ready')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return "locked" for delivery trigger when JO is not completed', () => {
    const activeStatuses = ['active', 'in_progress']
    
    fc.assert(
      fc.property(
        fc.constantFrom(...activeStatuses),
        (joStatus) => {
          const term: InvoiceTerm = {
            term: 'test',
            percentage: 50,
            description: 'Test',
            trigger: 'delivery',
            invoiced: false,
          }
          
          const status = getTermStatus(term, joStatus)
          expect(status).toBe('locked')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return "ready" for surat_jalan trigger when document exists', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...joStatuses),
        (joStatus) => {
          const term: InvoiceTerm = {
            term: 'test',
            percentage: 50,
            description: 'Test',
            trigger: 'surat_jalan',
            invoiced: false,
          }
          
          const status = getTermStatus(term, joStatus, true, false)
          expect(status).toBe('ready')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return "locked" for surat_jalan trigger when document does not exist', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...joStatuses),
        (joStatus) => {
          const term: InvoiceTerm = {
            term: 'test',
            percentage: 50,
            description: 'Test',
            trigger: 'surat_jalan',
            invoiced: false,
          }
          
          const status = getTermStatus(term, joStatus, false, false)
          expect(status).toBe('locked')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return "ready" for berita_acara trigger when document exists', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...joStatuses),
        (joStatus) => {
          const term: InvoiceTerm = {
            term: 'test',
            percentage: 50,
            description: 'Test',
            trigger: 'berita_acara',
            invoiced: false,
          }
          
          const status = getTermStatus(term, joStatus, false, true)
          expect(status).toBe('ready')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return "locked" for berita_acara trigger when document does not exist', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...joStatuses),
        (joStatus) => {
          const term: InvoiceTerm = {
            term: 'test',
            percentage: 50,
            description: 'Test',
            trigger: 'berita_acara',
            invoiced: false,
          }
          
          const status = getTermStatus(term, joStatus, false, false)
          expect(status).toBe('locked')
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: invoice-splitting, Property 4: Invoice Amount Calculation**
 * *For any* JO revenue and term percentage, the generated invoice SHALL have:
 * - subtotal = revenue × (percentage / 100)
 * - tax_amount = subtotal × 0.11
 * - total_amount = subtotal + tax_amount
 * **Validates: Requirements 3.4, 3.5**
 */
describe('Property 4: Invoice Amount Calculation', () => {
  it('should calculate correct subtotal from revenue and percentage', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000, max: 10000000000 }), // 1M to 10B IDR
        fc.integer({ min: 1, max: 100 }),
        (revenue, percentage) => {
          const subtotal = calculateTermAmount(revenue, percentage)
          const expected = (revenue * percentage) / 100
          expect(subtotal).toBeCloseTo(expected, 2)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should calculate VAT at exactly 11%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000, max: 10000000000 }),
        (amount) => {
          const vat = calculateVAT(amount)
          const expected = amount * VAT_RATE
          expect(vat).toBeCloseTo(expected, 2)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should calculate total as subtotal + VAT', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000, max: 10000000000 }),
        fc.integer({ min: 1, max: 100 }),
        (revenue, percentage) => {
          const { subtotal, vatAmount, totalAmount } = calculateTermInvoiceTotals(revenue, percentage)
          
          // Verify subtotal calculation
          expect(subtotal).toBeCloseTo((revenue * percentage) / 100, 2)
          
          // Verify VAT calculation
          expect(vatAmount).toBeCloseTo(subtotal * VAT_RATE, 2)
          
          // Verify total calculation
          expect(totalAmount).toBeCloseTo(subtotal + vatAmount, 2)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should maintain mathematical consistency: total = subtotal * 1.11', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000, max: 10000000000 }),
        fc.integer({ min: 1, max: 100 }),
        (revenue, percentage) => {
          const { subtotal, totalAmount } = calculateTermInvoiceTotals(revenue, percentage)
          expect(totalAmount).toBeCloseTo(subtotal * (1 + VAT_RATE), 2)
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * **Feature: invoice-splitting, Property 7: Term Amount Recalculation**
 * *For any* term percentage change, the displayed term amount SHALL equal
 * (JO revenue × new percentage / 100).
 * **Validates: Requirements 5.2, 5.3, 5.4**
 */
describe('Property 7: Term Amount Recalculation', () => {
  it('should recalculate amount correctly when percentage changes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000, max: 10000000000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (revenue, oldPercentage, newPercentage) => {
          const oldAmount = calculateTermAmount(revenue, oldPercentage)
          const newAmount = calculateTermAmount(revenue, newPercentage)
          
          // Verify old amount
          expect(oldAmount).toBeCloseTo((revenue * oldPercentage) / 100, 2)
          
          // Verify new amount
          expect(newAmount).toBeCloseTo((revenue * newPercentage) / 100, 2)
          
          // Verify ratio relationship
          if (oldPercentage > 0) {
            expect(newAmount / oldAmount).toBeCloseTo(newPercentage / oldPercentage, 4)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should maintain percentage total validation after term modifications', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 50 }), { minLength: 2, maxLength: 5 }),
        (percentages) => {
          // Create terms
          const terms: InvoiceTerm[] = percentages.map((p, i) => ({
            term: `term_${i}`,
            percentage: p,
            description: `Term ${i}`,
            trigger: 'jo_created' as TriggerType,
            invoiced: false,
          }))
          
          const total = calculateTermsPercentageTotal(terms)
          
          // Validation should match whether total equals 100
          expect(validateTermsTotal(terms)).toBe(Math.abs(total - 100) < 0.01)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: invoice-splitting, Property 5: Total Invoiced Tracking**
 * *For any* sequence of invoice generations from a JO's terms, the JO's
 * total_invoiced SHALL equal the sum of all generated invoice total_amounts.
 * **Validates: Requirements 4.1, 4.2**
 */
describe('Property 5: Total Invoiced Tracking', () => {
  it('should correctly calculate cumulative total from invoiced terms', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000, max: 10000000000 }),
        fc.array(fc.integer({ min: 1, max: 50 }), { minLength: 1, maxLength: 5 })
          .filter(arr => arr.reduce((a, b) => a + b, 0) <= 100)
          .map(arr => {
            const sum = arr.reduce((a, b) => a + b, 0)
            if (sum < 100) arr.push(100 - sum)
            return arr
          }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
        (revenue, percentages, invoicedFlags) => {
          // Create terms with random invoiced states
          const terms: InvoiceTerm[] = percentages.map((p, i) => ({
            term: `term_${i}`,
            percentage: p,
            description: `Term ${i}`,
            trigger: 'jo_created' as TriggerType,
            invoiced: invoicedFlags[i] ?? false,
          }))

          // Calculate expected total from invoiced terms
          let expectedTotal = 0
          terms.forEach(term => {
            if (term.invoiced) {
              const { totalAmount } = calculateTermInvoiceTotals(revenue, term.percentage)
              expectedTotal += totalAmount
            }
          })

          // Verify using utility function
          const calculatedTotal = calculateTotalInvoicedFromTerms(terms, revenue)
          
          expect(calculatedTotal).toBeCloseTo(expectedTotal, 2)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 when no terms are invoiced', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000, max: 10000000000 }),
        fc.array(fc.integer({ min: 1, max: 50 }), { minLength: 1, maxLength: 5 }),
        (revenue, percentages) => {
          const terms: InvoiceTerm[] = percentages.map((p, i) => ({
            term: `term_${i}`,
            percentage: p,
            description: `Term ${i}`,
            trigger: 'jo_created' as TriggerType,
            invoiced: false,
          }))

          const total = calculateTotalInvoicedFromTerms(terms, revenue)
          
          expect(total).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should equal total invoiceable when all terms are invoiced and sum to 100%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000, max: 10000000000 }),
        fc.array(fc.integer({ min: 1, max: 50 }), { minLength: 1, maxLength: 5 })
          .filter(arr => arr.reduce((a, b) => a + b, 0) <= 100)
          .map(arr => {
            const sum = arr.reduce((a, b) => a + b, 0)
            if (sum < 100) arr.push(100 - sum)
            return arr
          }),
        (revenue, percentages) => {
          // All terms invoiced
          const terms: InvoiceTerm[] = percentages.map((p, i) => ({
            term: `term_${i}`,
            percentage: p,
            description: `Term ${i}`,
            trigger: 'jo_created' as TriggerType,
            invoiced: true,
          }))

          const totalInvoiced = calculateTotalInvoicedFromTerms(terms, revenue)
          const totalInvoiceable = calculateTotalInvoiceableAmount(revenue)
          
          // Should be approximately equal (within floating point tolerance)
          expect(totalInvoiced).toBeCloseTo(totalInvoiceable, 0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * **Feature: invoice-splitting, Property 6: Term Immutability After Invoicing**
 * *For any* JO with at least one generated invoice, attempts to modify
 * invoice_terms SHALL be rejected.
 * **Validates: Requirements 1.6**
 */
describe('Property 6: Term Immutability After Invoicing', () => {
  it('should detect when any term has been invoiced', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
        (invoicedFlags) => {
          const terms: InvoiceTerm[] = invoicedFlags.map((invoiced, i) => ({
            term: `term_${i}`,
            percentage: 100 / invoicedFlags.length,
            description: `Term ${i}`,
            trigger: 'jo_created' as TriggerType,
            invoiced,
          }))

          const hasInvoiced = hasAnyInvoicedTerm(terms)
          const expectedHasInvoiced = invoicedFlags.some(f => f)
          
          expect(hasInvoiced).toBe(expectedHasInvoiced)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return false when no terms are invoiced', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (numTerms) => {
          const terms: InvoiceTerm[] = Array.from({ length: numTerms }, (_, i) => ({
            term: `term_${i}`,
            percentage: 100 / numTerms,
            description: `Term ${i}`,
            trigger: 'jo_created' as TriggerType,
            invoiced: false,
          }))

          expect(hasAnyInvoicedTerm(terms)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return true when at least one term is invoiced', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 0, max: 4 }),
        (numTerms, invoicedIndex) => {
          const actualIndex = invoicedIndex % numTerms
          const terms: InvoiceTerm[] = Array.from({ length: numTerms }, (_, i) => ({
            term: `term_${i}`,
            percentage: 100 / numTerms,
            description: `Term ${i}`,
            trigger: 'jo_created' as TriggerType,
            invoiced: i === actualIndex,
          }))

          expect(hasAnyInvoicedTerm(terms)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})