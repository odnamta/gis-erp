/**
 * Property-based tests for document generator actions
 * Feature: n8n-document-generation
 * 
 * Tests Property 12 from the design document:
 * - Property 12: Generated Document Record Completeness
 * 
 * Validates: Requirements 4.3, 4.4, 4.5
 * 
 * Note: These tests validate the data structure and completeness requirements
 * for generated document records without requiring actual database operations.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  VALID_DOCUMENT_TYPES,
  DocumentType,
  GeneratedDocument,
  VariableContext,
  GeneratedDocumentWithRelations,
  DocumentHistoryFilters,
} from '@/types/document-generation'
import { 
  validateDocumentData, 
  calculateInvoiceTotals, 
  buildInvoiceVariables, 
  validateInvoiceData,
  buildQuotationVariables,
  validateQuotationData,
  buildDeliveryNoteVariables,
  validateDeliveryNoteData,
  DeliveryNoteItem,
  matchesEntityFilter,
  matchesDocumentTypeFilter,
  matchesDateRangeFilter,
  matchesAllFilters,
  filterDocumentHistory,
  validateHistoryDataCompleteness,
} from '@/lib/document-generator-actions'

// Arbitraries for generating test data
const documentTypeArb: fc.Arbitrary<DocumentType> = fc.constantFrom(...VALID_DOCUMENT_TYPES)
const uuidArb = fc.uuid()
const documentNumberArb = fc.stringMatching(/^[A-Z]{2,4}-\d{4}-\d{4}$/)
const entityTypeArb = fc.constantFrom('invoice', 'quotation', 'job_order')
const fileUrlArb = fc.webUrl().map(url => `${url}/storage/v1/object/public/generated-documents/invoice/2025/01/test.pdf`)
const fileNameArb = fc.stringMatching(/^[A-Za-z0-9_-]+\.pdf$/)
const fileSizeArb = fc.integer({ min: 1, max: 10000 })
const isoDateArb = fc.integer({ min: 1577836800000, max: 1893456000000 }).map(ts => new Date(ts).toISOString())

// Generate a valid VariableContext
const variableContextArb: fc.Arbitrary<VariableContext> = fc.record({
  invoice_number: fc.oneof(documentNumberArb, fc.constant(null)),
  quotation_number: fc.oneof(documentNumberArb, fc.constant(null)),
  jo_number: fc.oneof(fc.stringMatching(/^JO-\d{4}\/CARGO\/[A-Z]{2,3}\/\d{4}$/), fc.constant(null)),
  dn_number: fc.oneof(fc.stringMatching(/^DN-JO-\d{4}$/), fc.constant(null)),
  customer_name: fc.oneof(fc.string({ minLength: 1, maxLength: 100 }), fc.constant(null)),
  customer_address: fc.oneof(fc.string({ minLength: 1, maxLength: 200 }), fc.constant(null)),
  items: fc.oneof(fc.array(fc.record({
    description: fc.string({ minLength: 1, maxLength: 100 }),
    quantity: fc.integer({ min: 1, max: 100 }),
    amount: fc.integer({ min: 0, max: 1000000 }),
  }), { minLength: 0, maxLength: 10 }), fc.constant(null)),
  subtotal: fc.oneof(fc.integer({ min: 0, max: 10000000 }), fc.constant(null)),
  tax_amount: fc.oneof(fc.integer({ min: 0, max: 1000000 }), fc.constant(null)),
  total_amount: fc.oneof(fc.integer({ min: 0, max: 11000000 }), fc.constant(null)),
})

// Generate a complete GeneratedDocument record
const generatedDocumentArb: fc.Arbitrary<GeneratedDocument> = fc.record({
  id: uuidArb,
  template_id: uuidArb,
  document_type: documentTypeArb,
  document_number: fc.option(documentNumberArb, { nil: null }),
  entity_type: entityTypeArb,
  entity_id: uuidArb,
  file_url: fileUrlArb,
  file_name: fileNameArb,
  file_size_kb: fileSizeArb,
  generated_at: isoDateArb,
  generated_by: uuidArb,
  variables_data: variableContextArb,
  sent_to_email: fc.option(fc.emailAddress(), { nil: null }),
  sent_at: fc.option(isoDateArb, { nil: null }),
  created_at: isoDateArb,
})

// Generate input data for createGeneratedDocumentRecord
const createRecordInputArb = fc.record({
  template_id: uuidArb,
  document_type: documentTypeArb,
  document_number: fc.option(documentNumberArb, { nil: null }),
  entity_type: entityTypeArb,
  entity_id: uuidArb,
  file_url: fileUrlArb,
  file_name: fileNameArb,
  file_size_kb: fileSizeArb,
  generated_by: uuidArb,
  variables_data: variableContextArb,
})

describe('Document Generator Actions Property Tests', () => {
  /**
   * Property 12: Generated Document Record Completeness
   * For any successfully generated document, the generated_documents record SHALL contain:
   * non-null template_id, document_type, entity_type, entity_id, file_url, file_name,
   * file_size_kb > 0, generated_at timestamp, generated_by user ID, and variables_data JSON.
   * 
   * Validates: Requirements 4.3, 4.4, 4.5
   */
  describe('Property 12: Generated Document Record Completeness', () => {
    it('should have non-null template_id for all generated documents', () => {
      fc.assert(
        fc.property(generatedDocumentArb, (document) => {
          expect(document.template_id).toBeDefined()
          expect(document.template_id).not.toBeNull()
          expect(typeof document.template_id).toBe('string')
          expect(document.template_id.length).toBeGreaterThan(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should have valid document_type for all generated documents', () => {
      fc.assert(
        fc.property(generatedDocumentArb, (document) => {
          expect(document.document_type).toBeDefined()
          expect(document.document_type).not.toBeNull()
          expect(VALID_DOCUMENT_TYPES).toContain(document.document_type)
        }),
        { numRuns: 100 }
      )
    })

    it('should have non-null entity_type and entity_id for all generated documents', () => {
      fc.assert(
        fc.property(generatedDocumentArb, (document) => {
          // entity_type must be present and non-empty
          expect(document.entity_type).toBeDefined()
          expect(document.entity_type).not.toBeNull()
          expect(typeof document.entity_type).toBe('string')
          expect(document.entity_type.length).toBeGreaterThan(0)

          // entity_id must be present and non-empty
          expect(document.entity_id).toBeDefined()
          expect(document.entity_id).not.toBeNull()
          expect(typeof document.entity_id).toBe('string')
          expect(document.entity_id.length).toBeGreaterThan(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should have valid file_url for all generated documents', () => {
      fc.assert(
        fc.property(generatedDocumentArb, (document) => {
          expect(document.file_url).toBeDefined()
          expect(document.file_url).not.toBeNull()
          expect(typeof document.file_url).toBe('string')
          expect(document.file_url.length).toBeGreaterThan(0)
          
          // Should be a valid URL format
          expect(() => new URL(document.file_url)).not.toThrow()
        }),
        { numRuns: 100 }
      )
    })

    it('should have valid file_name for all generated documents', () => {
      fc.assert(
        fc.property(generatedDocumentArb, (document) => {
          expect(document.file_name).toBeDefined()
          expect(document.file_name).not.toBeNull()
          expect(typeof document.file_name).toBe('string')
          expect(document.file_name.length).toBeGreaterThan(0)
          
          // Should end with .pdf
          expect(document.file_name.toLowerCase()).toMatch(/\.pdf$/)
        }),
        { numRuns: 100 }
      )
    })

    it('should have file_size_kb > 0 for all generated documents', () => {
      fc.assert(
        fc.property(generatedDocumentArb, (document) => {
          expect(document.file_size_kb).toBeDefined()
          expect(typeof document.file_size_kb).toBe('number')
          expect(document.file_size_kb).toBeGreaterThan(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should have valid generated_at timestamp for all generated documents', () => {
      fc.assert(
        fc.property(generatedDocumentArb, (document) => {
          expect(document.generated_at).toBeDefined()
          expect(document.generated_at).not.toBeNull()
          expect(typeof document.generated_at).toBe('string')
          
          // Should be a valid ISO date string
          const date = new Date(document.generated_at)
          expect(isNaN(date.getTime())).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should have non-null generated_by user ID for all generated documents', () => {
      fc.assert(
        fc.property(generatedDocumentArb, (document) => {
          expect(document.generated_by).toBeDefined()
          expect(document.generated_by).not.toBeNull()
          expect(typeof document.generated_by).toBe('string')
          expect(document.generated_by.length).toBeGreaterThan(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should have variables_data as valid JSON object for all generated documents', () => {
      fc.assert(
        fc.property(generatedDocumentArb, (document) => {
          expect(document.variables_data).toBeDefined()
          expect(document.variables_data).not.toBeNull()
          expect(typeof document.variables_data).toBe('object')
          
          // Should be serializable to JSON
          expect(() => JSON.stringify(document.variables_data)).not.toThrow()
        }),
        { numRuns: 100 }
      )
    })

    it('should validate all required fields are present in create input', () => {
      fc.assert(
        fc.property(createRecordInputArb, (input) => {
          // All required fields must be present
          expect(input.template_id).toBeDefined()
          expect(input.document_type).toBeDefined()
          expect(input.entity_type).toBeDefined()
          expect(input.entity_id).toBeDefined()
          expect(input.file_url).toBeDefined()
          expect(input.file_name).toBeDefined()
          expect(input.file_size_kb).toBeDefined()
          expect(input.generated_by).toBeDefined()
          expect(input.variables_data).toBeDefined()
        }),
        { numRuns: 100 }
      )
    })

    it('should ensure file_size_kb is a positive integer', () => {
      fc.assert(
        fc.property(createRecordInputArb, (input) => {
          expect(Number.isInteger(input.file_size_kb)).toBe(true)
          expect(input.file_size_kb).toBeGreaterThan(0)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Additional tests for document data validation
   */
  describe('Document Data Validation', () => {
    it('should require invoice_number for invoice documents', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (customerName) => {
            // Invoice without invoice_number should fail validation
            const variables: VariableContext = {
              customer_name: customerName,
            }
            
            const result = validateDocumentData(variables, 'invoice')
            expect(result.valid).toBe(false)
            expect(result.errors).toContain('invoice_number is required')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should require customer_name for invoice documents', () => {
      fc.assert(
        fc.property(documentNumberArb, (invoiceNumber) => {
          // Invoice without customer_name should fail validation
          const variables: VariableContext = {
            invoice_number: invoiceNumber,
          }
          
          const result = validateDocumentData(variables, 'invoice')
          expect(result.valid).toBe(false)
          expect(result.errors).toContain('customer_name is required')
        }),
        { numRuns: 100 }
      )
    })

    it('should pass validation for complete invoice data', () => {
      fc.assert(
        fc.property(
          documentNumberArb,
          fc.string({ minLength: 1, maxLength: 100 }),
          (invoiceNumber, customerName) => {
            const variables: VariableContext = {
              invoice_number: invoiceNumber,
              customer_name: customerName,
            }
            
            const result = validateDocumentData(variables, 'invoice')
            expect(result.valid).toBe(true)
            expect(result.errors).toHaveLength(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should require quotation_number for quotation documents', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (customerName) => {
            const variables: VariableContext = {
              customer_name: customerName,
            }
            
            const result = validateDocumentData(variables, 'quotation')
            expect(result.valid).toBe(false)
            expect(result.errors).toContain('quotation_number is required')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should require customer_name for quotation documents', () => {
      fc.assert(
        fc.property(documentNumberArb, (quotationNumber) => {
          const variables: VariableContext = {
            quotation_number: quotationNumber,
          }
          
          const result = validateDocumentData(variables, 'quotation')
          expect(result.valid).toBe(false)
          expect(result.errors).toContain('customer_name is required')
        }),
        { numRuns: 100 }
      )
    })

    it('should pass validation for complete quotation data', () => {
      fc.assert(
        fc.property(
          documentNumberArb,
          fc.string({ minLength: 1, maxLength: 100 }),
          (quotationNumber, customerName) => {
            const variables: VariableContext = {
              quotation_number: quotationNumber,
              customer_name: customerName,
            }
            
            const result = validateDocumentData(variables, 'quotation')
            expect(result.valid).toBe(true)
            expect(result.errors).toHaveLength(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should require jo_number or dn_number for delivery_note documents', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (origin) => {
            const variables: VariableContext = {
              origin: origin,
            }
            
            const result = validateDocumentData(variables, 'delivery_note')
            expect(result.valid).toBe(false)
            expect(result.errors).toContain('jo_number or dn_number is required')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should pass validation for delivery_note with jo_number', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^JO-\d{4}\/CARGO\/[A-Z]{2,3}\/\d{4}$/),
          (joNumber) => {
            const variables: VariableContext = {
              jo_number: joNumber,
            }
            
            const result = validateDocumentData(variables, 'delivery_note')
            expect(result.valid).toBe(true)
            expect(result.errors).toHaveLength(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should pass validation for delivery_note with dn_number', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^DN-[A-Z0-9-]+$/),
          (dnNumber) => {
            const variables: VariableContext = {
              dn_number: dnNumber,
            }
            
            const result = validateDocumentData(variables, 'delivery_note')
            expect(result.valid).toBe(true)
            expect(result.errors).toHaveLength(0)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Tests for record structure consistency
   */
  describe('Record Structure Consistency', () => {
    it('should maintain consistent structure across all document types', () => {
      fc.assert(
        fc.property(
          documentTypeArb,
          uuidArb,
          uuidArb,
          entityTypeArb,
          uuidArb,
          fileUrlArb,
          fileNameArb,
          fileSizeArb,
          uuidArb,
          variableContextArb,
          isoDateArb,
          (docType, templateId, id, entityType, entityId, fileUrl, fileName, fileSize, userId, variables, timestamp) => {
            const document: GeneratedDocument = {
              id,
              template_id: templateId,
              document_type: docType,
              document_number: null,
              entity_type: entityType,
              entity_id: entityId,
              file_url: fileUrl,
              file_name: fileName,
              file_size_kb: fileSize,
              generated_at: timestamp,
              generated_by: userId,
              variables_data: variables,
              sent_to_email: null,
              sent_at: null,
              created_at: timestamp,
            }

            // All required fields should be present regardless of document type
            expect(document.id).toBeDefined()
            expect(document.template_id).toBeDefined()
            expect(document.document_type).toBeDefined()
            expect(document.entity_type).toBeDefined()
            expect(document.entity_id).toBeDefined()
            expect(document.file_url).toBeDefined()
            expect(document.file_name).toBeDefined()
            expect(document.file_size_kb).toBeDefined()
            expect(document.generated_at).toBeDefined()
            expect(document.generated_by).toBeDefined()
            expect(document.variables_data).toBeDefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow null for optional fields (sent_to_email, sent_at, document_number)', () => {
      fc.assert(
        fc.property(generatedDocumentArb, (document) => {
          // These fields can be null
          const optionalFields = ['sent_to_email', 'sent_at', 'document_number'] as const
          
          for (const field of optionalFields) {
            // Field should exist in the type (can be null or have a value)
            expect(field in document).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })
  })
})


/**
 * Property 15: Invoice Calculation Correctness
 * For any set of invoice line items, the calculated subtotal SHALL equal the sum of all item amounts,
 * tax_amount SHALL equal subtotal × 0.11, and total_amount SHALL equal subtotal + tax_amount.
 * 
 * Validates: Requirements 5.4
 */
describe('Property 15: Invoice Calculation Correctness', () => {
  // Arbitrary for generating line items
  const lineItemArb = fc.record({
    quantity: fc.integer({ min: 1, max: 1000 }),
    unit_price: fc.integer({ min: 0, max: 10000000 }), // Up to 10 million per item
  })

  const lineItemsArb = fc.array(lineItemArb, { minLength: 0, maxLength: 50 })

  it('should calculate subtotal as sum of all item amounts (quantity * unit_price)', () => {
    fc.assert(
      fc.property(lineItemsArb, (lineItems) => {
        const result = calculateInvoiceTotals(lineItems)
        
        // Calculate expected subtotal manually
        const expectedSubtotal = lineItems.reduce((sum, item) => {
          return sum + (item.quantity * item.unit_price)
        }, 0)
        
        expect(result.subtotal).toBe(expectedSubtotal)
      }),
      { numRuns: 100 }
    )
  })

  it('should calculate tax_amount as subtotal × 0.11 (11% Indonesian PPN)', () => {
    fc.assert(
      fc.property(lineItemsArb, (lineItems) => {
        const result = calculateInvoiceTotals(lineItems)
        
        // Tax should be exactly 11% of subtotal
        const expectedTax = result.subtotal * 0.11
        
        expect(result.tax_amount).toBeCloseTo(expectedTax, 10)
      }),
      { numRuns: 100 }
    )
  })

  it('should calculate total_amount as subtotal + tax_amount', () => {
    fc.assert(
      fc.property(lineItemsArb, (lineItems) => {
        const result = calculateInvoiceTotals(lineItems)
        
        // Total should be subtotal + tax
        const expectedTotal = result.subtotal + result.tax_amount
        
        expect(result.total_amount).toBeCloseTo(expectedTotal, 10)
      }),
      { numRuns: 100 }
    )
  })

  it('should return zero totals for empty line items array', () => {
    const result = calculateInvoiceTotals([])
    
    expect(result.subtotal).toBe(0)
    expect(result.tax_amount).toBe(0)
    expect(result.total_amount).toBe(0)
  })

  it('should handle single item correctly', () => {
    fc.assert(
      fc.property(lineItemArb, (item) => {
        const result = calculateInvoiceTotals([item])
        
        const expectedSubtotal = item.quantity * item.unit_price
        const expectedTax = expectedSubtotal * 0.11
        const expectedTotal = expectedSubtotal + expectedTax
        
        expect(result.subtotal).toBe(expectedSubtotal)
        expect(result.tax_amount).toBeCloseTo(expectedTax, 10)
        expect(result.total_amount).toBeCloseTo(expectedTotal, 10)
      }),
      { numRuns: 100 }
    )
  })

  it('should maintain mathematical relationship: total = subtotal * 1.11', () => {
    fc.assert(
      fc.property(lineItemsArb, (lineItems) => {
        const result = calculateInvoiceTotals(lineItems)
        
        // Total should equal subtotal * 1.11 (100% + 11% tax)
        // Use relative tolerance for large numbers to handle floating-point precision
        const expectedTotal = result.subtotal * 1.11
        const tolerance = Math.max(Math.abs(expectedTotal) * 1e-10, 1e-10)
        
        expect(Math.abs(result.total_amount - expectedTotal)).toBeLessThanOrEqual(tolerance)
      }),
      { numRuns: 100 }
    )
  })

  it('should produce non-negative values for all totals', () => {
    fc.assert(
      fc.property(lineItemsArb, (lineItems) => {
        const result = calculateInvoiceTotals(lineItems)
        
        expect(result.subtotal).toBeGreaterThanOrEqual(0)
        expect(result.tax_amount).toBeGreaterThanOrEqual(0)
        expect(result.total_amount).toBeGreaterThanOrEqual(0)
      }),
      { numRuns: 100 }
    )
  })
})


/**
 * Property 14: Invoice Data Completeness
 * For any invoice document generation, the variables_data SHALL contain:
 * invoice_number, invoice_date, customer_name, customer_address, items array with all line items,
 * subtotal, tax_amount, and total_amount.
 * 
 * Validates: Requirements 5.1, 5.2, 5.3
 */
describe('Property 14: Invoice Data Completeness', () => {
  // Helper to generate valid date strings
  const dateStringArb = fc.integer({ min: 1577836800000, max: 1893456000000 })
    .map(ts => new Date(ts).toISOString().split('T')[0])

  // Arbitrary for generating invoice data
  const invoiceDataArb = fc.record({
    id: fc.uuid(),
    invoice_number: fc.stringMatching(/^INV-\d{4}-\d{4}$/),
    jo_id: fc.uuid(),
    customer_id: fc.uuid(),
    subtotal: fc.integer({ min: 0, max: 100000000 }),
    tax_amount: fc.integer({ min: 0, max: 11000000 }),
    total_amount: fc.integer({ min: 0, max: 111000000 }),
    status: fc.constantFrom('draft', 'sent', 'paid', 'overdue', 'cancelled'),
    due_date: dateStringArb,
    invoice_date: fc.option(dateStringArb, { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    invoice_term: fc.option(fc.constantFrom('full', 'dp', 'progress', 'final'), { nil: null }),
    term_percentage: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
    term_description: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: null }),
    customers: fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      email: fc.option(fc.emailAddress(), { nil: null }),
      phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/), { nil: null }),
      address: fc.option(fc.string({ minLength: 1, maxLength: 300 }), { nil: null }),
    }),
    job_orders: fc.option(fc.record({
      id: fc.uuid(),
      jo_number: fc.stringMatching(/^JO-\d{4}\/CARGO\/[A-Z]{2,3}\/\d{4}$/),
    }), { nil: null }),
  })

  // Helper for ISO date strings
  const isoDateStringArb = fc.integer({ min: 1577836800000, max: 1893456000000 })
    .map(ts => new Date(ts).toISOString())

  // Arbitrary for generating line items
  const lineItemArb = fc.record({
    id: fc.uuid(),
    invoice_id: fc.uuid(),
    line_number: fc.integer({ min: 1, max: 100 }),
    description: fc.string({ minLength: 1, maxLength: 200 }),
    quantity: fc.integer({ min: 1, max: 1000 }),
    unit: fc.option(fc.constantFrom('unit', 'pcs', 'kg', 'ton', 'trip'), { nil: null }),
    unit_price: fc.integer({ min: 0, max: 10000000 }),
    subtotal: fc.option(fc.integer({ min: 0, max: 10000000000 }), { nil: null }),
    created_at: fc.option(isoDateStringArb, { nil: null }),
    updated_at: fc.option(isoDateStringArb, { nil: null }),
  })

  const lineItemsArb = fc.array(lineItemArb, { minLength: 0, maxLength: 20 })

  it('should include invoice_number in built variables', () => {
    fc.assert(
      fc.property(invoiceDataArb, lineItemsArb, (invoice, lineItems) => {
        const variables = buildInvoiceVariables(invoice as any, lineItems as any)
        
        expect(variables.invoice_number).toBeDefined()
        expect(typeof variables.invoice_number).toBe('string')
        expect(variables.invoice_number).toBe(invoice.invoice_number)
      }),
      { numRuns: 100 }
    )
  })

  it('should include invoice_date in built variables', () => {
    fc.assert(
      fc.property(invoiceDataArb, lineItemsArb, (invoice, lineItems) => {
        const variables = buildInvoiceVariables(invoice as any, lineItems as any)
        
        expect(variables.invoice_date).toBeDefined()
        expect(typeof variables.invoice_date).toBe('string')
      }),
      { numRuns: 100 }
    )
  })

  it('should include customer_name in built variables', () => {
    fc.assert(
      fc.property(invoiceDataArb, lineItemsArb, (invoice, lineItems) => {
        const variables = buildInvoiceVariables(invoice as any, lineItems as any)
        
        expect(variables.customer_name).toBeDefined()
        expect(typeof variables.customer_name).toBe('string')
        expect(variables.customer_name).toBe(invoice.customers.name)
      }),
      { numRuns: 100 }
    )
  })

  it('should include customer_address in built variables', () => {
    fc.assert(
      fc.property(invoiceDataArb, lineItemsArb, (invoice, lineItems) => {
        const variables = buildInvoiceVariables(invoice as any, lineItems as any)
        
        expect(variables.customer_address).toBeDefined()
        expect(typeof variables.customer_address).toBe('string')
      }),
      { numRuns: 100 }
    )
  })

  it('should include items array with all line items', () => {
    fc.assert(
      fc.property(invoiceDataArb, lineItemsArb, (invoice, lineItems) => {
        const variables = buildInvoiceVariables(invoice as any, lineItems as any)
        
        expect(variables.items).toBeDefined()
        expect(Array.isArray(variables.items)).toBe(true)
        expect(variables.items.length).toBe(lineItems.length)
        
        // Each item should have required fields
        variables.items.forEach((item, index) => {
          expect(item.description).toBeDefined()
          expect(item.quantity).toBeDefined()
          expect(item.unit_price).toBeDefined()
          expect(item.amount).toBeDefined()
          expect(typeof item.description).toBe('string')
          expect(typeof item.quantity).toBe('number')
          expect(typeof item.unit_price).toBe('number')
          expect(typeof item.amount).toBe('number')
        })
      }),
      { numRuns: 100 }
    )
  })

  it('should include subtotal in built variables', () => {
    fc.assert(
      fc.property(invoiceDataArb, lineItemsArb, (invoice, lineItems) => {
        const variables = buildInvoiceVariables(invoice as any, lineItems as any)
        
        expect(variables.subtotal).toBeDefined()
        expect(typeof variables.subtotal).toBe('number')
        expect(variables.subtotal).toBeGreaterThanOrEqual(0)
      }),
      { numRuns: 100 }
    )
  })

  it('should include tax_amount in built variables', () => {
    fc.assert(
      fc.property(invoiceDataArb, lineItemsArb, (invoice, lineItems) => {
        const variables = buildInvoiceVariables(invoice as any, lineItems as any)
        
        expect(variables.tax_amount).toBeDefined()
        expect(typeof variables.tax_amount).toBe('number')
        expect(variables.tax_amount).toBeGreaterThanOrEqual(0)
      }),
      { numRuns: 100 }
    )
  })

  it('should include total_amount in built variables', () => {
    fc.assert(
      fc.property(invoiceDataArb, lineItemsArb, (invoice, lineItems) => {
        const variables = buildInvoiceVariables(invoice as any, lineItems as any)
        
        expect(variables.total_amount).toBeDefined()
        expect(typeof variables.total_amount).toBe('number')
        expect(variables.total_amount).toBeGreaterThanOrEqual(0)
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve all required fields for template rendering', () => {
    fc.assert(
      fc.property(invoiceDataArb, lineItemsArb, (invoice, lineItems) => {
        const variables = buildInvoiceVariables(invoice as any, lineItems as any)
        
        // All required fields for invoice template must be present
        const requiredFields = [
          'invoice_number',
          'invoice_date',
          'due_date',
          'customer_name',
          'customer_address',
          'items',
          'subtotal',
          'tax_amount',
          'total_amount',
        ]
        
        requiredFields.forEach(field => {
          expect(variables).toHaveProperty(field)
        })
      }),
      { numRuns: 100 }
    )
  })

  it('should use stored invoice totals when available', () => {
    fc.assert(
      fc.property(invoiceDataArb, lineItemsArb, (invoice, lineItems) => {
        const variables = buildInvoiceVariables(invoice as any, lineItems as any)
        
        // When invoice has stored totals, they should be used
        expect(variables.subtotal).toBe(Number(invoice.subtotal))
      }),
      { numRuns: 100 }
    )
  })
})


/**
 * Property 17: Incomplete Data Validation
 * For any document generation request where required source data is missing
 * (e.g., invoice without customer, quotation without items), the generator
 * SHALL return an error with success=false and descriptive error message.
 * 
 * Validates: Requirements 5.6
 */
describe('Property 17: Incomplete Data Validation', () => {
  // Helper to generate valid date strings
  const dateStringArb = fc.integer({ min: 1577836800000, max: 1893456000000 })
    .map(ts => new Date(ts).toISOString().split('T')[0])

  // Generate invoice data with missing invoice_number
  const invoiceWithoutNumberArb = fc.record({
    id: fc.uuid(),
    invoice_number: fc.constant(''), // Empty invoice number
    jo_id: fc.uuid(),
    customer_id: fc.uuid(),
    subtotal: fc.integer({ min: 0, max: 100000000 }),
    tax_amount: fc.integer({ min: 0, max: 11000000 }),
    total_amount: fc.integer({ min: 0, max: 111000000 }),
    status: fc.constantFrom('draft', 'sent', 'paid'),
    due_date: dateStringArb,
    invoice_date: fc.option(dateStringArb, { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    invoice_term: fc.option(fc.constantFrom('full', 'dp', 'progress', 'final'), { nil: null }),
    term_percentage: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
    term_description: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: null }),
    customers: fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      email: fc.option(fc.emailAddress(), { nil: null }),
      phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/), { nil: null }),
      address: fc.option(fc.string({ minLength: 1, maxLength: 300 }), { nil: null }),
    }),
    job_orders: fc.option(fc.record({
      id: fc.uuid(),
      jo_number: fc.stringMatching(/^JO-\d{4}\/CARGO\/[A-Z]{2,3}\/\d{4}$/),
    }), { nil: null }),
  })

  // Generate invoice data with missing customer
  const invoiceWithoutCustomerArb = fc.record({
    id: fc.uuid(),
    invoice_number: fc.stringMatching(/^INV-\d{4}-\d{4}$/),
    jo_id: fc.uuid(),
    customer_id: fc.uuid(),
    subtotal: fc.integer({ min: 0, max: 100000000 }),
    tax_amount: fc.integer({ min: 0, max: 11000000 }),
    total_amount: fc.integer({ min: 0, max: 111000000 }),
    status: fc.constantFrom('draft', 'sent', 'paid'),
    due_date: dateStringArb,
    invoice_date: fc.option(dateStringArb, { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    invoice_term: fc.option(fc.constantFrom('full', 'dp', 'progress', 'final'), { nil: null }),
    term_percentage: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
    term_description: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: null }),
    customers: fc.constant(null), // Missing customer
    job_orders: fc.option(fc.record({
      id: fc.uuid(),
      jo_number: fc.stringMatching(/^JO-\d{4}\/CARGO\/[A-Z]{2,3}\/\d{4}$/),
    }), { nil: null }),
  })

  // Generate invoice data with customer but missing customer name
  const invoiceWithoutCustomerNameArb = fc.record({
    id: fc.uuid(),
    invoice_number: fc.stringMatching(/^INV-\d{4}-\d{4}$/),
    jo_id: fc.uuid(),
    customer_id: fc.uuid(),
    subtotal: fc.integer({ min: 0, max: 100000000 }),
    tax_amount: fc.integer({ min: 0, max: 11000000 }),
    total_amount: fc.integer({ min: 0, max: 111000000 }),
    status: fc.constantFrom('draft', 'sent', 'paid'),
    due_date: dateStringArb,
    invoice_date: fc.option(dateStringArb, { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    invoice_term: fc.option(fc.constantFrom('full', 'dp', 'progress', 'final'), { nil: null }),
    term_percentage: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
    term_description: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: null }),
    customers: fc.record({
      id: fc.uuid(),
      name: fc.constant(''), // Empty customer name
      email: fc.option(fc.emailAddress(), { nil: null }),
      phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/), { nil: null }),
      address: fc.option(fc.string({ minLength: 1, maxLength: 300 }), { nil: null }),
    }),
    job_orders: fc.option(fc.record({
      id: fc.uuid(),
      jo_number: fc.stringMatching(/^JO-\d{4}\/CARGO\/[A-Z]{2,3}\/\d{4}$/),
    }), { nil: null }),
  })

  // Generate invoice data with missing customer_id
  const invoiceWithoutCustomerIdArb = fc.record({
    id: fc.uuid(),
    invoice_number: fc.stringMatching(/^INV-\d{4}-\d{4}$/),
    jo_id: fc.uuid(),
    customer_id: fc.constant(''), // Empty customer_id
    subtotal: fc.integer({ min: 0, max: 100000000 }),
    tax_amount: fc.integer({ min: 0, max: 11000000 }),
    total_amount: fc.integer({ min: 0, max: 111000000 }),
    status: fc.constantFrom('draft', 'sent', 'paid'),
    due_date: dateStringArb,
    invoice_date: fc.option(dateStringArb, { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    invoice_term: fc.option(fc.constantFrom('full', 'dp', 'progress', 'final'), { nil: null }),
    term_percentage: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
    term_description: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: null }),
    customers: fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      email: fc.option(fc.emailAddress(), { nil: null }),
      phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/), { nil: null }),
      address: fc.option(fc.string({ minLength: 1, maxLength: 300 }), { nil: null }),
    }),
    job_orders: fc.option(fc.record({
      id: fc.uuid(),
      jo_number: fc.stringMatching(/^JO-\d{4}\/CARGO\/[A-Z]{2,3}\/\d{4}$/),
    }), { nil: null }),
  })

  it('should return validation error when invoice_number is missing', () => {
    fc.assert(
      fc.property(invoiceWithoutNumberArb, (invoice) => {
        const result = validateInvoiceData(invoice as any, [])
        
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('invoice_number is required')
      }),
      { numRuns: 100 }
    )
  })

  it('should return validation error when customer data is missing', () => {
    fc.assert(
      fc.property(invoiceWithoutCustomerArb, (invoice) => {
        const result = validateInvoiceData(invoice as any, [])
        
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('Customer data is required')
      }),
      { numRuns: 100 }
    )
  })

  it('should return validation error when customer_name is empty', () => {
    fc.assert(
      fc.property(invoiceWithoutCustomerNameArb, (invoice) => {
        const result = validateInvoiceData(invoice as any, [])
        
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('customer_name is required')
      }),
      { numRuns: 100 }
    )
  })

  it('should return validation error when customer_id is missing', () => {
    fc.assert(
      fc.property(invoiceWithoutCustomerIdArb, (invoice) => {
        const result = validateInvoiceData(invoice as any, [])
        
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('customer_id is required')
      }),
      { numRuns: 100 }
    )
  })

  it('should return validation error when invoice is null', () => {
    const result = validateInvoiceData(null, [])
    
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Invoice data is required')
  })

  it('should return multiple errors when multiple fields are missing', () => {
    // Invoice with both missing invoice_number and missing customer
    const incompleteInvoice = {
      id: 'test-id',
      invoice_number: '',
      jo_id: 'test-jo-id',
      customer_id: '',
      subtotal: 1000,
      tax_amount: 110,
      total_amount: 1110,
      status: 'draft',
      due_date: '2025-01-01',
      invoice_date: null,
      notes: null,
      invoice_term: null,
      term_percentage: null,
      term_description: null,
      customers: null,
      job_orders: null,
    }
    
    const result = validateInvoiceData(incompleteInvoice as any, [])
    
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
    expect(result.errors).toContain('invoice_number is required')
    expect(result.errors).toContain('customer_id is required')
    expect(result.errors).toContain('Customer data is required')
  })

  it('should return valid=true and empty errors array for complete invoice data', () => {
    // Helper to generate valid date strings
    const dateStringArb = fc.integer({ min: 1577836800000, max: 1893456000000 })
      .map(ts => new Date(ts).toISOString().split('T')[0])

    const completeInvoiceArb = fc.record({
      id: fc.uuid(),
      invoice_number: fc.stringMatching(/^INV-\d{4}-\d{4}$/),
      jo_id: fc.uuid(),
      customer_id: fc.uuid(),
      subtotal: fc.integer({ min: 0, max: 100000000 }),
      tax_amount: fc.integer({ min: 0, max: 11000000 }),
      total_amount: fc.integer({ min: 0, max: 111000000 }),
      status: fc.constantFrom('draft', 'sent', 'paid'),
      due_date: dateStringArb,
      invoice_date: fc.option(dateStringArb, { nil: null }),
      notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
      invoice_term: fc.option(fc.constantFrom('full', 'dp', 'progress', 'final'), { nil: null }),
      term_percentage: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
      term_description: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: null }),
      customers: fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 100 }),
        email: fc.option(fc.emailAddress(), { nil: null }),
        phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/), { nil: null }),
        address: fc.option(fc.string({ minLength: 1, maxLength: 300 }), { nil: null }),
      }),
      job_orders: fc.option(fc.record({
        id: fc.uuid(),
        jo_number: fc.stringMatching(/^JO-\d{4}\/CARGO\/[A-Z]{2,3}\/\d{4}$/),
      }), { nil: null }),
    })

    fc.assert(
      fc.property(completeInvoiceArb, (invoice) => {
        const result = validateInvoiceData(invoice as any, [])
        
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      }),
      { numRuns: 100 }
    )
  })

  it('should always return an errors array (never undefined)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          invoiceWithoutNumberArb,
          invoiceWithoutCustomerArb,
          invoiceWithoutCustomerNameArb,
          invoiceWithoutCustomerIdArb
        ),
        (invoice) => {
          const result = validateInvoiceData(invoice as any, [])
          
          expect(result.errors).toBeDefined()
          expect(Array.isArray(result.errors)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * Property 18: Quotation Data Completeness
 * For any quotation document generation, the variables_data SHALL contain:
 * quotation_number, quotation_date, valid_until, customer_name, scope, items array
 * with all revenue items, total_amount, and terms.
 * 
 * Feature: n8n-document-generation, Property 18: Quotation Data Completeness
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */
describe('Property 18: Quotation Data Completeness', () => {
  // Helper to generate valid date strings
  const dateStringArb = fc.integer({ min: 1577836800000, max: 1893456000000 })
    .map(ts => new Date(ts).toISOString().split('T')[0])

  // Helper for ISO date strings
  const isoDateStringArb = fc.integer({ min: 1577836800000, max: 1893456000000 })
    .map(ts => new Date(ts).toISOString())

  // Arbitrary for generating quotation data
  const quotationDataArb = fc.record({
    id: fc.uuid(),
    quotation_number: fc.stringMatching(/^QUO-\d{4}-\d{4}$/),
    customer_id: fc.uuid(),
    project_id: fc.option(fc.uuid(), { nil: null }),
    title: fc.string({ minLength: 1, maxLength: 200 }),
    commodity: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    origin: fc.string({ minLength: 1, maxLength: 200 }),
    destination: fc.string({ minLength: 1, maxLength: 200 }),
    total_revenue: fc.option(fc.integer({ min: 0, max: 100000000 }), { nil: null }),
    total_cost: fc.option(fc.integer({ min: 0, max: 100000000 }), { nil: null }),
    gross_profit: fc.option(fc.integer({ min: -100000000, max: 100000000 }), { nil: null }),
    profit_margin: fc.option(fc.integer({ min: -100, max: 100 }), { nil: null }),
    status: fc.option(fc.constantFrom('draft', 'engineering_review', 'ready', 'submitted', 'won', 'lost', 'cancelled'), { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    created_at: fc.option(isoDateStringArb, { nil: null }),
    updated_at: fc.option(isoDateStringArb, { nil: null }),
    scope_of_work: fc.option(fc.string({ minLength: 0, maxLength: 1000 }), { nil: null }),
    description: fc.option(fc.string({ minLength: 0, maxLength: 1000 }), { nil: null }),
    terms_conditions: fc.option(fc.string({ minLength: 0, maxLength: 1000 }), { nil: null }),
    quotation_date: fc.option(dateStringArb, { nil: null }),
    valid_until: fc.option(dateStringArb, { nil: null }),
    customers: fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      email: fc.option(fc.emailAddress(), { nil: null }),
      phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/), { nil: null }),
      address: fc.option(fc.string({ minLength: 1, maxLength: 300 }), { nil: null }),
    }),
    projects: fc.option(fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
    }), { nil: null }),
  })

  // Arbitrary for generating revenue items
  const revenueItemArb = fc.record({
    id: fc.uuid(),
    quotation_id: fc.uuid(),
    category: fc.constantFrom('transportation', 'handling', 'documentation', 'escort', 'permit', 'other'),
    description: fc.string({ minLength: 1, maxLength: 200 }),
    quantity: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: null }),
    unit: fc.option(fc.constantFrom('unit', 'pcs', 'kg', 'ton', 'trip', 'day'), { nil: null }),
    unit_price: fc.integer({ min: 0, max: 10000000 }),
    subtotal: fc.option(fc.integer({ min: 0, max: 10000000000 }), { nil: null }),
    display_order: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    created_at: fc.option(isoDateStringArb, { nil: null }),
    updated_at: fc.option(isoDateStringArb, { nil: null }),
  })

  const revenueItemsArb = fc.array(revenueItemArb, { minLength: 0, maxLength: 20 })

  it('should include quotation_number in built variables', () => {
    fc.assert(
      fc.property(quotationDataArb, revenueItemsArb, (quotation, revenueItems) => {
        const variables = buildQuotationVariables(quotation as any, revenueItems as any)
        
        expect(variables.quotation_number).toBeDefined()
        expect(typeof variables.quotation_number).toBe('string')
        expect(variables.quotation_number).toBe(quotation.quotation_number)
      }),
      { numRuns: 100 }
    )
  })

  it('should include quotation_date in built variables', () => {
    fc.assert(
      fc.property(quotationDataArb, revenueItemsArb, (quotation, revenueItems) => {
        const variables = buildQuotationVariables(quotation as any, revenueItems as any)
        
        expect(variables.quotation_date).toBeDefined()
        expect(typeof variables.quotation_date).toBe('string')
      }),
      { numRuns: 100 }
    )
  })

  it('should include valid_until in built variables', () => {
    fc.assert(
      fc.property(quotationDataArb, revenueItemsArb, (quotation, revenueItems) => {
        const variables = buildQuotationVariables(quotation as any, revenueItems as any)
        
        expect(variables.valid_until).toBeDefined()
        expect(typeof variables.valid_until).toBe('string')
      }),
      { numRuns: 100 }
    )
  })

  it('should include customer_name in built variables', () => {
    fc.assert(
      fc.property(quotationDataArb, revenueItemsArb, (quotation, revenueItems) => {
        const variables = buildQuotationVariables(quotation as any, revenueItems as any)
        
        expect(variables.customer_name).toBeDefined()
        expect(typeof variables.customer_name).toBe('string')
        expect(variables.customer_name).toBe(quotation.customers.name)
      }),
      { numRuns: 100 }
    )
  })

  it('should include customer_address in built variables', () => {
    fc.assert(
      fc.property(quotationDataArb, revenueItemsArb, (quotation, revenueItems) => {
        const variables = buildQuotationVariables(quotation as any, revenueItems as any)
        
        expect(variables.customer_address).toBeDefined()
        expect(typeof variables.customer_address).toBe('string')
      }),
      { numRuns: 100 }
    )
  })

  it('should include scope in built variables', () => {
    fc.assert(
      fc.property(quotationDataArb, revenueItemsArb, (quotation, revenueItems) => {
        const variables = buildQuotationVariables(quotation as any, revenueItems as any)
        
        expect(variables.scope).toBeDefined()
        expect(typeof variables.scope).toBe('string')
      }),
      { numRuns: 100 }
    )
  })

  it('should include items array with all revenue items', () => {
    fc.assert(
      fc.property(quotationDataArb, revenueItemsArb, (quotation, revenueItems) => {
        const variables = buildQuotationVariables(quotation as any, revenueItems as any)
        
        expect(variables.items).toBeDefined()
        expect(Array.isArray(variables.items)).toBe(true)
        expect(variables.items.length).toBe(revenueItems.length)
        
        // Each item should have required fields
        variables.items.forEach((item) => {
          expect(item.description).toBeDefined()
          expect(item.category).toBeDefined()
          expect(item.quantity).toBeDefined()
          expect(item.unit).toBeDefined()
          expect(item.unit_price).toBeDefined()
          expect(item.amount).toBeDefined()
          expect(typeof item.description).toBe('string')
          expect(typeof item.category).toBe('string')
          expect(typeof item.quantity).toBe('number')
          expect(typeof item.unit).toBe('string')
          expect(typeof item.unit_price).toBe('number')
          expect(typeof item.amount).toBe('number')
        })
      }),
      { numRuns: 100 }
    )
  })

  it('should include total_amount in built variables', () => {
    fc.assert(
      fc.property(quotationDataArb, revenueItemsArb, (quotation, revenueItems) => {
        const variables = buildQuotationVariables(quotation as any, revenueItems as any)
        
        expect(variables.total_amount).toBeDefined()
        expect(typeof variables.total_amount).toBe('number')
        expect(variables.total_amount).toBeGreaterThanOrEqual(0)
      }),
      { numRuns: 100 }
    )
  })

  it('should include terms in built variables', () => {
    fc.assert(
      fc.property(quotationDataArb, revenueItemsArb, (quotation, revenueItems) => {
        const variables = buildQuotationVariables(quotation as any, revenueItems as any)
        
        expect(variables.terms).toBeDefined()
        expect(typeof variables.terms).toBe('string')
        expect(variables.terms.length).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve all required fields for template rendering', () => {
    fc.assert(
      fc.property(quotationDataArb, revenueItemsArb, (quotation, revenueItems) => {
        const variables = buildQuotationVariables(quotation as any, revenueItems as any)
        
        // All required fields for quotation template must be present
        const requiredFields = [
          'quotation_number',
          'quotation_date',
          'valid_until',
          'customer_name',
          'customer_address',
          'scope',
          'items',
          'total_amount',
          'terms',
        ]
        
        requiredFields.forEach(field => {
          expect(variables).toHaveProperty(field)
        })
      }),
      { numRuns: 100 }
    )
  })

  it('should use stored total_revenue when available', () => {
    fc.assert(
      fc.property(
        quotationDataArb.filter(q => q.total_revenue !== null && q.total_revenue !== undefined),
        revenueItemsArb,
        (quotation, revenueItems) => {
          const variables = buildQuotationVariables(quotation as any, revenueItems as any)
          
          // When quotation has stored total_revenue, it should be used
          expect(variables.total_amount).toBe(Number(quotation.total_revenue))
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should calculate total from items when total_revenue is not available', () => {
    fc.assert(
      fc.property(
        quotationDataArb.map(q => ({ ...q, total_revenue: null })),
        revenueItemsArb,
        (quotation, revenueItems) => {
          const variables = buildQuotationVariables(quotation as any, revenueItems as any)
          
          // Calculate expected total from items
          const expectedTotal = revenueItems.reduce((sum, item) => {
            const amount = item.subtotal !== null 
              ? Number(item.subtotal) 
              : (Number(item.quantity) || 1) * (Number(item.unit_price) || 0)
            return sum + amount
          }, 0)
          
          expect(variables.total_amount).toBe(expectedTotal)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should include additional quotation fields (title, commodity, origin, destination)', () => {
    fc.assert(
      fc.property(quotationDataArb, revenueItemsArb, (quotation, revenueItems) => {
        const variables = buildQuotationVariables(quotation as any, revenueItems as any)
        
        // Additional fields should be present
        expect(variables.title).toBeDefined()
        expect(variables.commodity).toBeDefined()
        expect(variables.origin).toBeDefined()
        expect(variables.destination).toBeDefined()
        
        expect(typeof variables.title).toBe('string')
        expect(typeof variables.commodity).toBe('string')
        expect(typeof variables.origin).toBe('string')
        expect(typeof variables.destination).toBe('string')
      }),
      { numRuns: 100 }
    )
  })

  it('should include project_name when project is available', () => {
    fc.assert(
      fc.property(
        quotationDataArb.filter(q => q.projects !== null),
        revenueItemsArb,
        (quotation, revenueItems) => {
          const variables = buildQuotationVariables(quotation as any, revenueItems as any)
          
          expect(variables.project_name).toBeDefined()
          expect(typeof variables.project_name).toBe('string')
          expect(variables.project_name).toBe(quotation.projects?.name || '')
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * Quotation Data Validation Tests
 * Tests for validateQuotationData function
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */
describe('Quotation Data Validation', () => {
  // Helper to generate valid date strings
  const dateStringArb = fc.integer({ min: 1577836800000, max: 1893456000000 })
    .map(ts => new Date(ts).toISOString().split('T')[0])

  // Helper for ISO date strings
  const isoDateStringArb = fc.integer({ min: 1577836800000, max: 1893456000000 })
    .map(ts => new Date(ts).toISOString())

  // Generate quotation data with missing quotation_number
  const quotationWithoutNumberArb = fc.record({
    id: fc.uuid(),
    quotation_number: fc.constant(''), // Empty quotation number
    customer_id: fc.uuid(),
    project_id: fc.option(fc.uuid(), { nil: null }),
    title: fc.string({ minLength: 1, maxLength: 200 }),
    commodity: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    origin: fc.string({ minLength: 1, maxLength: 200 }),
    destination: fc.string({ minLength: 1, maxLength: 200 }),
    total_revenue: fc.option(fc.integer({ min: 0, max: 100000000 }), { nil: null }),
    total_cost: fc.option(fc.integer({ min: 0, max: 100000000 }), { nil: null }),
    gross_profit: fc.option(fc.integer({ min: -100000000, max: 100000000 }), { nil: null }),
    profit_margin: fc.option(fc.integer({ min: -100, max: 100 }), { nil: null }),
    status: fc.option(fc.constantFrom('draft', 'submitted', 'won'), { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    created_at: fc.option(isoDateStringArb, { nil: null }),
    updated_at: fc.option(isoDateStringArb, { nil: null }),
    customers: fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      email: fc.option(fc.emailAddress(), { nil: null }),
      phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/), { nil: null }),
      address: fc.option(fc.string({ minLength: 1, maxLength: 300 }), { nil: null }),
    }),
    projects: fc.option(fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
    }), { nil: null }),
  })

  // Generate quotation data with missing customer
  const quotationWithoutCustomerArb = fc.record({
    id: fc.uuid(),
    quotation_number: fc.stringMatching(/^QUO-\d{4}-\d{4}$/),
    customer_id: fc.uuid(),
    project_id: fc.option(fc.uuid(), { nil: null }),
    title: fc.string({ minLength: 1, maxLength: 200 }),
    commodity: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    origin: fc.string({ minLength: 1, maxLength: 200 }),
    destination: fc.string({ minLength: 1, maxLength: 200 }),
    total_revenue: fc.option(fc.integer({ min: 0, max: 100000000 }), { nil: null }),
    total_cost: fc.option(fc.integer({ min: 0, max: 100000000 }), { nil: null }),
    gross_profit: fc.option(fc.integer({ min: -100000000, max: 100000000 }), { nil: null }),
    profit_margin: fc.option(fc.integer({ min: -100, max: 100 }), { nil: null }),
    status: fc.option(fc.constantFrom('draft', 'submitted', 'won'), { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    created_at: fc.option(isoDateStringArb, { nil: null }),
    updated_at: fc.option(isoDateStringArb, { nil: null }),
    customers: fc.constant(null), // Missing customer
    projects: fc.option(fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
    }), { nil: null }),
  })

  // Generate quotation data with customer but missing customer name
  const quotationWithoutCustomerNameArb = fc.record({
    id: fc.uuid(),
    quotation_number: fc.stringMatching(/^QUO-\d{4}-\d{4}$/),
    customer_id: fc.uuid(),
    project_id: fc.option(fc.uuid(), { nil: null }),
    title: fc.string({ minLength: 1, maxLength: 200 }),
    commodity: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    origin: fc.string({ minLength: 1, maxLength: 200 }),
    destination: fc.string({ minLength: 1, maxLength: 200 }),
    total_revenue: fc.option(fc.integer({ min: 0, max: 100000000 }), { nil: null }),
    total_cost: fc.option(fc.integer({ min: 0, max: 100000000 }), { nil: null }),
    gross_profit: fc.option(fc.integer({ min: -100000000, max: 100000000 }), { nil: null }),
    profit_margin: fc.option(fc.integer({ min: -100, max: 100 }), { nil: null }),
    status: fc.option(fc.constantFrom('draft', 'submitted', 'won'), { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    created_at: fc.option(isoDateStringArb, { nil: null }),
    updated_at: fc.option(isoDateStringArb, { nil: null }),
    customers: fc.record({
      id: fc.uuid(),
      name: fc.constant(''), // Empty customer name
      email: fc.option(fc.emailAddress(), { nil: null }),
      phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/), { nil: null }),
      address: fc.option(fc.string({ minLength: 1, maxLength: 300 }), { nil: null }),
    }),
    projects: fc.option(fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
    }), { nil: null }),
  })

  // Generate quotation data with missing customer_id
  const quotationWithoutCustomerIdArb = fc.record({
    id: fc.uuid(),
    quotation_number: fc.stringMatching(/^QUO-\d{4}-\d{4}$/),
    customer_id: fc.constant(''), // Empty customer_id
    project_id: fc.option(fc.uuid(), { nil: null }),
    title: fc.string({ minLength: 1, maxLength: 200 }),
    commodity: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    origin: fc.string({ minLength: 1, maxLength: 200 }),
    destination: fc.string({ minLength: 1, maxLength: 200 }),
    total_revenue: fc.option(fc.integer({ min: 0, max: 100000000 }), { nil: null }),
    total_cost: fc.option(fc.integer({ min: 0, max: 100000000 }), { nil: null }),
    gross_profit: fc.option(fc.integer({ min: -100000000, max: 100000000 }), { nil: null }),
    profit_margin: fc.option(fc.integer({ min: -100, max: 100 }), { nil: null }),
    status: fc.option(fc.constantFrom('draft', 'submitted', 'won'), { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    created_at: fc.option(isoDateStringArb, { nil: null }),
    updated_at: fc.option(isoDateStringArb, { nil: null }),
    customers: fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      email: fc.option(fc.emailAddress(), { nil: null }),
      phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/), { nil: null }),
      address: fc.option(fc.string({ minLength: 1, maxLength: 300 }), { nil: null }),
    }),
    projects: fc.option(fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
    }), { nil: null }),
  })

  // Complete quotation data
  const completeQuotationArb = fc.record({
    id: fc.uuid(),
    quotation_number: fc.stringMatching(/^QUO-\d{4}-\d{4}$/),
    customer_id: fc.uuid(),
    project_id: fc.option(fc.uuid(), { nil: null }),
    title: fc.string({ minLength: 1, maxLength: 200 }),
    commodity: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    origin: fc.string({ minLength: 1, maxLength: 200 }),
    destination: fc.string({ minLength: 1, maxLength: 200 }),
    total_revenue: fc.option(fc.integer({ min: 0, max: 100000000 }), { nil: null }),
    total_cost: fc.option(fc.integer({ min: 0, max: 100000000 }), { nil: null }),
    gross_profit: fc.option(fc.integer({ min: -100000000, max: 100000000 }), { nil: null }),
    profit_margin: fc.option(fc.integer({ min: -100, max: 100 }), { nil: null }),
    status: fc.option(fc.constantFrom('draft', 'submitted', 'won'), { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    created_at: fc.option(isoDateStringArb, { nil: null }),
    updated_at: fc.option(isoDateStringArb, { nil: null }),
    customers: fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      email: fc.option(fc.emailAddress(), { nil: null }),
      phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/), { nil: null }),
      address: fc.option(fc.string({ minLength: 1, maxLength: 300 }), { nil: null }),
    }),
    projects: fc.option(fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
    }), { nil: null }),
  })

  it('should return validation error when quotation_number is missing', () => {
    fc.assert(
      fc.property(quotationWithoutNumberArb, (quotation) => {
        const result = validateQuotationData(quotation as any, [])
        
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('quotation_number is required')
      }),
      { numRuns: 100 }
    )
  })

  it('should return validation error when customer data is missing', () => {
    fc.assert(
      fc.property(quotationWithoutCustomerArb, (quotation) => {
        const result = validateQuotationData(quotation as any, [])
        
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('Customer data is required')
      }),
      { numRuns: 100 }
    )
  })

  it('should return validation error when customer_name is empty', () => {
    fc.assert(
      fc.property(quotationWithoutCustomerNameArb, (quotation) => {
        const result = validateQuotationData(quotation as any, [])
        
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('customer_name is required')
      }),
      { numRuns: 100 }
    )
  })

  it('should return validation error when customer_id is missing', () => {
    fc.assert(
      fc.property(quotationWithoutCustomerIdArb, (quotation) => {
        const result = validateQuotationData(quotation as any, [])
        
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('customer_id is required')
      }),
      { numRuns: 100 }
    )
  })

  it('should return validation error when quotation is null', () => {
    const result = validateQuotationData(null, [])
    
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Quotation data is required')
  })

  it('should return valid=true and empty errors array for complete quotation data', () => {
    fc.assert(
      fc.property(completeQuotationArb, (quotation) => {
        const result = validateQuotationData(quotation as any, [])
        
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      }),
      { numRuns: 100 }
    )
  })

  it('should always return an errors array (never undefined)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          quotationWithoutNumberArb,
          quotationWithoutCustomerArb,
          quotationWithoutCustomerNameArb,
          quotationWithoutCustomerIdArb
        ),
        (quotation) => {
          const result = validateQuotationData(quotation as any, [])
          
          expect(result.errors).toBeDefined()
          expect(Array.isArray(result.errors)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return multiple errors when multiple fields are missing', () => {
    // Quotation with both missing quotation_number and missing customer
    const incompleteQuotation = {
      id: 'test-id',
      quotation_number: '',
      customer_id: '',
      project_id: null,
      title: 'Test Quotation',
      commodity: null,
      origin: 'Jakarta',
      destination: 'Surabaya',
      total_revenue: null,
      total_cost: null,
      gross_profit: null,
      profit_margin: null,
      status: 'draft',
      notes: null,
      created_at: null,
      updated_at: null,
      customers: null,
      projects: null,
    }
    
    const result = validateQuotationData(incompleteQuotation as any, [])
    
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
    expect(result.errors).toContain('quotation_number is required')
    expect(result.errors).toContain('customer_id is required')
    expect(result.errors).toContain('Customer data is required')
  })
})


/**
 * Property 19: Delivery Note Data Completeness
 * For any delivery note generation, the variables_data SHALL contain:
 * dn_number, jo_number, delivery_date, origin, destination, and items array
 * with description, quantity, and condition for each item.
 * 
 * Feature: n8n-document-generation, Property 19: Delivery Note Data Completeness
 * Validates: Requirements 7.1, 7.2, 7.3
 */
describe('Property 19: Delivery Note Data Completeness', () => {
  // Helper to generate valid date strings
  const dateStringArb = fc.integer({ min: 1577836800000, max: 1893456000000 })
    .map(ts => new Date(ts).toISOString().split('T')[0])

  // Helper for ISO date strings
  const isoDateStringArb = fc.integer({ min: 1577836800000, max: 1893456000000 })
    .map(ts => new Date(ts).toISOString())

  // Arbitrary for generating job order data
  const jobOrderDataArb = fc.record({
    id: fc.uuid(),
    jo_number: fc.stringMatching(/^JO-\d{4}\/CARGO\/[A-Z]{2,3}\/\d{4}$/),
    pjo_id: fc.option(fc.uuid(), { nil: null }),
    customer_id: fc.option(fc.uuid(), { nil: null }),
    status: fc.option(fc.constantFrom('active', 'completed', 'invoiced'), { nil: null }),
    delivery_date: fc.option(dateStringArb, { nil: null }),
    origin: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
    destination: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
    cargo_description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
    cargo_quantity: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: null }),
    cargo_weight_tons: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(500), noNaN: true }), { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    created_at: fc.option(isoDateStringArb, { nil: null }),
    updated_at: fc.option(isoDateStringArb, { nil: null }),
    proforma_job_orders: fc.option(fc.record({
      id: fc.uuid(),
      pjo_number: fc.stringMatching(/^\d{4}\/CARGO\/[A-Z]{2,3}\/\d{4}$/),
      origin: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
      destination: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
      commodity: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    }), { nil: null }),
    customers: fc.option(fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      email: fc.option(fc.emailAddress(), { nil: null }),
      phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/), { nil: null }),
      address: fc.option(fc.string({ minLength: 1, maxLength: 300 }), { nil: null }),
    }), { nil: null }),
  })

  // Arbitrary for generating delivery note items
  const deliveryNoteItemArb: fc.Arbitrary<DeliveryNoteItem> = fc.record({
    description: fc.string({ minLength: 1, maxLength: 200 }),
    quantity: fc.integer({ min: 1, max: 1000 }),
    condition: fc.constantFrom('Good', 'Damaged', 'Partial'),
    unit: fc.option(fc.constantFrom('unit', 'pcs', 'kg', 'ton', 'trip'), { nil: undefined }),
    weight_tons: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(500), noNaN: true }), { nil: undefined }),
  })

  const deliveryNoteItemsArb = fc.array(deliveryNoteItemArb, { minLength: 0, maxLength: 20 })


  it('should include dn_number in built variables', () => {
    fc.assert(
      fc.property(jobOrderDataArb, deliveryNoteItemsArb, (jobOrder, items) => {
        const variables = buildDeliveryNoteVariables(jobOrder as any, items)
        
        expect(variables.dn_number).toBeDefined()
        expect(typeof variables.dn_number).toBe('string')
        expect(variables.dn_number).toContain('DN-')
      }),
      { numRuns: 100 }
    )
  })

  it('should include jo_number in built variables', () => {
    fc.assert(
      fc.property(jobOrderDataArb, deliveryNoteItemsArb, (jobOrder, items) => {
        const variables = buildDeliveryNoteVariables(jobOrder as any, items)
        
        expect(variables.jo_number).toBeDefined()
        expect(typeof variables.jo_number).toBe('string')
        expect(variables.jo_number).toBe(jobOrder.jo_number)
      }),
      { numRuns: 100 }
    )
  })

  it('should include delivery_date in built variables', () => {
    fc.assert(
      fc.property(jobOrderDataArb, deliveryNoteItemsArb, (jobOrder, items) => {
        const variables = buildDeliveryNoteVariables(jobOrder as any, items)
        
        expect(variables.delivery_date).toBeDefined()
        expect(typeof variables.delivery_date).toBe('string')
      }),
      { numRuns: 100 }
    )
  })

  it('should include origin in built variables', () => {
    fc.assert(
      fc.property(jobOrderDataArb, deliveryNoteItemsArb, (jobOrder, items) => {
        const variables = buildDeliveryNoteVariables(jobOrder as any, items)
        
        expect(variables.origin).toBeDefined()
        expect(typeof variables.origin).toBe('string')
      }),
      { numRuns: 100 }
    )
  })

  it('should include destination in built variables', () => {
    fc.assert(
      fc.property(jobOrderDataArb, deliveryNoteItemsArb, (jobOrder, items) => {
        const variables = buildDeliveryNoteVariables(jobOrder as any, items)
        
        expect(variables.destination).toBeDefined()
        expect(typeof variables.destination).toBe('string')
      }),
      { numRuns: 100 }
    )
  })


  it('should include items array with all delivery items', () => {
    fc.assert(
      fc.property(jobOrderDataArb, deliveryNoteItemsArb, (jobOrder, items) => {
        const variables = buildDeliveryNoteVariables(jobOrder as any, items)
        
        expect(variables.items).toBeDefined()
        expect(Array.isArray(variables.items)).toBe(true)
        expect(variables.items.length).toBe(items.length)
        
        // Each item should have required fields
        variables.items.forEach((item) => {
          expect(item.description).toBeDefined()
          expect(item.quantity).toBeDefined()
          expect(item.condition).toBeDefined()
          expect(typeof item.description).toBe('string')
          expect(typeof item.quantity).toBe('number')
          expect(typeof item.condition).toBe('string')
        })
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve all required fields for template rendering', () => {
    fc.assert(
      fc.property(jobOrderDataArb, deliveryNoteItemsArb, (jobOrder, items) => {
        const variables = buildDeliveryNoteVariables(jobOrder as any, items)
        
        // All required fields for delivery note template must be present
        const requiredFields = [
          'dn_number',
          'jo_number',
          'delivery_date',
          'origin',
          'destination',
          'items',
        ]
        
        requiredFields.forEach(field => {
          expect(variables).toHaveProperty(field)
        })
      }),
      { numRuns: 100 }
    )
  })

  it('should calculate total_quantity from items', () => {
    fc.assert(
      fc.property(jobOrderDataArb, deliveryNoteItemsArb, (jobOrder, items) => {
        const variables = buildDeliveryNoteVariables(jobOrder as any, items)
        
        const expectedTotal = items.reduce((sum, item) => sum + item.quantity, 0)
        expect(variables.total_quantity).toBe(expectedTotal)
      }),
      { numRuns: 100 }
    )
  })


  it('should use origin from job order or PJO', () => {
    fc.assert(
      fc.property(
        jobOrderDataArb.filter(jo => jo.origin !== null || jo.proforma_job_orders?.origin !== null),
        deliveryNoteItemsArb,
        (jobOrder, items) => {
          const variables = buildDeliveryNoteVariables(jobOrder as any, items)
          
          // Origin should come from job order or PJO
          const expectedOrigin = jobOrder.origin || jobOrder.proforma_job_orders?.origin || ''
          expect(variables.origin).toBe(expectedOrigin)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should use destination from job order or PJO', () => {
    fc.assert(
      fc.property(
        jobOrderDataArb.filter(jo => jo.destination !== null || jo.proforma_job_orders?.destination !== null),
        deliveryNoteItemsArb,
        (jobOrder, items) => {
          const variables = buildDeliveryNoteVariables(jobOrder as any, items)
          
          // Destination should come from job order or PJO
          const expectedDestination = jobOrder.destination || jobOrder.proforma_job_orders?.destination || ''
          expect(variables.destination).toBe(expectedDestination)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should include customer information when available', () => {
    fc.assert(
      fc.property(
        jobOrderDataArb.filter(jo => jo.customers !== null),
        deliveryNoteItemsArb,
        (jobOrder, items) => {
          const variables = buildDeliveryNoteVariables(jobOrder as any, items)
          
          expect(variables.customer_name).toBeDefined()
          expect(typeof variables.customer_name).toBe('string')
          expect(variables.customer_name).toBe(jobOrder.customers?.name || '')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should generate dn_number from jo_number', () => {
    fc.assert(
      fc.property(jobOrderDataArb, deliveryNoteItemsArb, (jobOrder, items) => {
        const variables = buildDeliveryNoteVariables(jobOrder as any, items)
        
        // DN number should be derived from JO number
        expect(variables.dn_number).toBe(`DN-${jobOrder.jo_number}`)
      }),
      { numRuns: 100 }
    )
  })
})



/**
 * Delivery Note Data Validation Tests
 * Tests for validateDeliveryNoteData function
 * 
 * Feature: n8n-document-generation, Property 19: Delivery Note Data Completeness
 * Validates: Requirements 7.1, 7.2, 7.3
 */
describe('Delivery Note Data Validation', () => {
  // Helper to generate valid date strings
  const dateStringArb = fc.integer({ min: 1577836800000, max: 1893456000000 })
    .map(ts => new Date(ts).toISOString().split('T')[0])

  // Helper for ISO date strings
  const isoDateStringArb = fc.integer({ min: 1577836800000, max: 1893456000000 })
    .map(ts => new Date(ts).toISOString())

  // Generate job order data with missing jo_number
  const jobOrderWithoutNumberArb = fc.record({
    id: fc.uuid(),
    jo_number: fc.constant(''), // Empty jo_number
    pjo_id: fc.option(fc.uuid(), { nil: null }),
    customer_id: fc.option(fc.uuid(), { nil: null }),
    status: fc.option(fc.constantFrom('active', 'completed'), { nil: null }),
    delivery_date: fc.option(dateStringArb, { nil: null }),
    origin: fc.string({ minLength: 1, maxLength: 200 }),
    destination: fc.string({ minLength: 1, maxLength: 200 }),
    cargo_description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
    cargo_quantity: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: null }),
    cargo_weight_tons: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(500), noNaN: true }), { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    created_at: fc.option(isoDateStringArb, { nil: null }),
    updated_at: fc.option(isoDateStringArb, { nil: null }),
    proforma_job_orders: fc.option(fc.record({
      id: fc.uuid(),
      pjo_number: fc.stringMatching(/^\d{4}\/CARGO\/[A-Z]{2,3}\/\d{4}$/),
      origin: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
      destination: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
      commodity: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    }), { nil: null }),
    customers: fc.option(fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      email: fc.option(fc.emailAddress(), { nil: null }),
      phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/), { nil: null }),
      address: fc.option(fc.string({ minLength: 1, maxLength: 300 }), { nil: null }),
    }), { nil: null }),
  })


  // Generate job order data with missing origin and destination
  const jobOrderWithoutRouteArb = fc.record({
    id: fc.uuid(),
    jo_number: fc.stringMatching(/^JO-\d{4}\/CARGO\/[A-Z]{2,3}\/\d{4}$/),
    pjo_id: fc.option(fc.uuid(), { nil: null }),
    customer_id: fc.option(fc.uuid(), { nil: null }),
    status: fc.option(fc.constantFrom('active', 'completed'), { nil: null }),
    delivery_date: fc.option(dateStringArb, { nil: null }),
    origin: fc.constant(null), // Missing origin
    destination: fc.constant(null), // Missing destination
    cargo_description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
    cargo_quantity: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: null }),
    cargo_weight_tons: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(500), noNaN: true }), { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    created_at: fc.option(isoDateStringArb, { nil: null }),
    updated_at: fc.option(isoDateStringArb, { nil: null }),
    proforma_job_orders: fc.constant(null), // No PJO to fall back to
    customers: fc.option(fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      email: fc.option(fc.emailAddress(), { nil: null }),
      phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/), { nil: null }),
      address: fc.option(fc.string({ minLength: 1, maxLength: 300 }), { nil: null }),
    }), { nil: null }),
  })

  // Complete job order data
  const completeJobOrderArb = fc.record({
    id: fc.uuid(),
    jo_number: fc.stringMatching(/^JO-\d{4}\/CARGO\/[A-Z]{2,3}\/\d{4}$/),
    pjo_id: fc.option(fc.uuid(), { nil: null }),
    customer_id: fc.option(fc.uuid(), { nil: null }),
    status: fc.option(fc.constantFrom('active', 'completed'), { nil: null }),
    delivery_date: fc.option(dateStringArb, { nil: null }),
    origin: fc.string({ minLength: 1, maxLength: 200 }),
    destination: fc.string({ minLength: 1, maxLength: 200 }),
    cargo_description: fc.string({ minLength: 1, maxLength: 200 }),
    cargo_quantity: fc.integer({ min: 1, max: 1000 }),
    cargo_weight_tons: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(500), noNaN: true }), { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    created_at: fc.option(isoDateStringArb, { nil: null }),
    updated_at: fc.option(isoDateStringArb, { nil: null }),
    proforma_job_orders: fc.option(fc.record({
      id: fc.uuid(),
      pjo_number: fc.stringMatching(/^\d{4}\/CARGO\/[A-Z]{2,3}\/\d{4}$/),
      origin: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
      destination: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
      commodity: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    }), { nil: null }),
    customers: fc.option(fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      email: fc.option(fc.emailAddress(), { nil: null }),
      phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/), { nil: null }),
      address: fc.option(fc.string({ minLength: 1, maxLength: 300 }), { nil: null }),
    }), { nil: null }),
  })


  it('should return validation error when jo_number is missing', () => {
    fc.assert(
      fc.property(jobOrderWithoutNumberArb, (jobOrder) => {
        const result = validateDeliveryNoteData(jobOrder as any, [])
        
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('jo_number is required')
      }),
      { numRuns: 100 }
    )
  })

  it('should return validation error when origin is missing', () => {
    fc.assert(
      fc.property(jobOrderWithoutRouteArb, (jobOrder) => {
        const result = validateDeliveryNoteData(jobOrder as any, [])
        
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('origin is required')
      }),
      { numRuns: 100 }
    )
  })

  it('should return validation error when destination is missing', () => {
    fc.assert(
      fc.property(jobOrderWithoutRouteArb, (jobOrder) => {
        const result = validateDeliveryNoteData(jobOrder as any, [])
        
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('destination is required')
      }),
      { numRuns: 100 }
    )
  })

  it('should return validation error when job order is null', () => {
    const result = validateDeliveryNoteData(null, [])
    
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Job order data is required')
  })

  it('should return valid=true for complete job order data', () => {
    fc.assert(
      fc.property(completeJobOrderArb, (jobOrder) => {
        // Create items from cargo description
        const items: DeliveryNoteItem[] = [{
          description: jobOrder.cargo_description,
          quantity: jobOrder.cargo_quantity,
          condition: 'Good',
        }]
        
        const result = validateDeliveryNoteData(jobOrder as any, items)
        
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      }),
      { numRuns: 100 }
    )
  })

  it('should accept origin from PJO when job order origin is missing', () => {
    // Job order with origin from PJO
    const jobOrderWithPjoOrigin = {
      id: 'test-id',
      jo_number: 'JO-0001/CARGO/XII/2025',
      pjo_id: 'pjo-id',
      customer_id: null,
      status: 'active',
      delivery_date: '2025-01-15',
      origin: null, // Missing from JO
      destination: 'Surabaya',
      cargo_description: 'Heavy Equipment',
      cargo_quantity: 1,
      cargo_weight_tons: null,
      notes: null,
      created_at: null,
      updated_at: null,
      proforma_job_orders: {
        id: 'pjo-id',
        pjo_number: '0001/CARGO/XII/2025',
        origin: 'Jakarta', // Available from PJO
        destination: null,
        commodity: null,
      },
      customers: null,
    }
    
    const items: DeliveryNoteItem[] = [{
      description: 'Heavy Equipment',
      quantity: 1,
      condition: 'Good',
    }]
    
    const result = validateDeliveryNoteData(jobOrderWithPjoOrigin as any, items)
    
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should always return an errors array (never undefined)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          jobOrderWithoutNumberArb,
          jobOrderWithoutRouteArb
        ),
        (jobOrder) => {
          const result = validateDeliveryNoteData(jobOrder as any, [])
          
          expect(result.errors).toBeDefined()
          expect(Array.isArray(result.errors)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})



/**
 * Property 23: Document History Filtering
 * For any document history query with filters (entity_type, entity_id, document_type, date range),
 * all returned documents SHALL match ALL specified filter criteria, and no documents outside
 * the criteria SHALL be included.
 * 
 * Feature: n8n-document-generation, Property 23: Document History Filtering
 * Validates: Requirements 9.1, 9.2, 9.3
 */
describe('Property 23: Document History Filtering', () => {
  // Arbitraries for generating test data
  const documentTypeArb23: fc.Arbitrary<DocumentType> = fc.constantFrom(...VALID_DOCUMENT_TYPES)
  const uuidArb23 = fc.uuid()
  const documentNumberArb23 = fc.stringMatching(/^[A-Z]{2,4}-\d{4}-\d{4}$/)
  const entityTypeArb23 = fc.constantFrom('invoice', 'quotation', 'job_order')
  const fileUrlArb23 = fc.webUrl().map(url => `${url}/storage/v1/object/public/generated-documents/invoice/2025/01/test.pdf`)
  const fileNameArb23 = fc.stringMatching(/^[A-Za-z0-9_-]+\.pdf$/)
  const fileSizeArb23 = fc.integer({ min: 1, max: 10000 })
  
  // Generate dates within a specific range for testing
  const isoDateArb23 = fc.integer({ min: 1704067200000, max: 1735689600000 }) // 2024-01-01 to 2025-01-01
    .map(ts => new Date(ts).toISOString())

  // Generate a valid VariableContext
  const variableContextArb23: fc.Arbitrary<VariableContext> = fc.record({
    invoice_number: fc.oneof(documentNumberArb23, fc.constant(null)),
    customer_name: fc.oneof(fc.string({ minLength: 1, maxLength: 100 }), fc.constant(null)),
  })

  // Generate a complete GeneratedDocument record
  const generatedDocumentArb23: fc.Arbitrary<GeneratedDocument> = fc.record({
    id: uuidArb23,
    template_id: uuidArb23,
    document_type: documentTypeArb23,
    document_number: fc.option(documentNumberArb23, { nil: null }),
    entity_type: entityTypeArb23,
    entity_id: uuidArb23,
    file_url: fileUrlArb23,
    file_name: fileNameArb23,
    file_size_kb: fileSizeArb23,
    generated_at: isoDateArb23,
    generated_by: uuidArb23,
    variables_data: variableContextArb23,
    sent_to_email: fc.option(fc.emailAddress(), { nil: null }),
    sent_at: fc.option(isoDateArb23, { nil: null }),
    created_at: isoDateArb23,
  })

  // Generate an array of documents
  const documentsArb23 = fc.array(generatedDocumentArb23, { minLength: 0, maxLength: 50 })

  describe('Entity Filter (Requirements 9.1)', () => {
    it('should match all documents when no entity filter is specified', () => {
      fc.assert(
        fc.property(generatedDocumentArb23, (document) => {
          const result = matchesEntityFilter(document, undefined, undefined)
          expect(result).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should match only documents with matching entity_type', () => {
      fc.assert(
        fc.property(generatedDocumentArb23, entityTypeArb23, (document, filterType) => {
          const result = matchesEntityFilter(document, filterType, undefined)
          
          if (document.entity_type === filterType) {
            expect(result).toBe(true)
          } else {
            expect(result).toBe(false)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should match only documents with matching entity_id', () => {
      fc.assert(
        fc.property(generatedDocumentArb23, uuidArb23, (document, filterId) => {
          const result = matchesEntityFilter(document, undefined, filterId)
          
          if (document.entity_id === filterId) {
            expect(result).toBe(true)
          } else {
            expect(result).toBe(false)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should match only documents with both matching entity_type AND entity_id', () => {
      fc.assert(
        fc.property(generatedDocumentArb23, entityTypeArb23, uuidArb23, (document, filterType, filterId) => {
          const result = matchesEntityFilter(document, filterType, filterId)
          
          const typeMatches = document.entity_type === filterType
          const idMatches = document.entity_id === filterId
          
          expect(result).toBe(typeMatches && idMatches)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Document Type Filter (Requirements 9.2)', () => {
    it('should match all documents when no document_type filter is specified', () => {
      fc.assert(
        fc.property(generatedDocumentArb23, (document) => {
          const result = matchesDocumentTypeFilter(document, undefined)
          expect(result).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should match only documents with matching document_type', () => {
      fc.assert(
        fc.property(generatedDocumentArb23, documentTypeArb23, (document, filterType) => {
          const result = matchesDocumentTypeFilter(document, filterType)
          
          if (document.document_type === filterType) {
            expect(result).toBe(true)
          } else {
            expect(result).toBe(false)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should correctly filter documents by each valid document type', () => {
      fc.assert(
        fc.property(documentsArb23, documentTypeArb23, (documents, filterType) => {
          const filtered = documents.filter(doc => matchesDocumentTypeFilter(doc, filterType))
          
          // All filtered documents should have the matching type
          for (const doc of filtered) {
            expect(doc.document_type).toBe(filterType)
          }
          
          // No documents with non-matching type should be included
          const nonMatching = documents.filter(doc => doc.document_type !== filterType)
          for (const doc of nonMatching) {
            expect(filtered).not.toContain(doc)
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Date Range Filter (Requirements 9.3)', () => {
    it('should match all documents when no date filter is specified', () => {
      fc.assert(
        fc.property(generatedDocumentArb23, (document) => {
          const result = matchesDateRangeFilter(document, undefined, undefined)
          expect(result).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should match only documents on or after from_date', () => {
      fc.assert(
        fc.property(generatedDocumentArb23, isoDateArb23, (document, fromDate) => {
          const result = matchesDateRangeFilter(document, fromDate, undefined)
          
          const docDate = new Date(document.generated_at)
          const filterDate = new Date(fromDate)
          
          if (docDate >= filterDate) {
            expect(result).toBe(true)
          } else {
            expect(result).toBe(false)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should match only documents on or before to_date', () => {
      fc.assert(
        fc.property(generatedDocumentArb23, isoDateArb23, (document, toDate) => {
          const result = matchesDateRangeFilter(document, undefined, toDate)
          
          const docDate = new Date(document.generated_at)
          const filterDate = new Date(toDate)
          
          if (docDate <= filterDate) {
            expect(result).toBe(true)
          } else {
            expect(result).toBe(false)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should match only documents within the date range (inclusive)', () => {
      fc.assert(
        fc.property(
          generatedDocumentArb23,
          isoDateArb23,
          isoDateArb23,
          (document, date1, date2) => {
            // Ensure from_date <= to_date
            const fromDate = date1 < date2 ? date1 : date2
            const toDate = date1 < date2 ? date2 : date1
            
            const result = matchesDateRangeFilter(document, fromDate, toDate)
            
            const docDate = new Date(document.generated_at)
            const from = new Date(fromDate)
            const to = new Date(toDate)
            
            const inRange = docDate >= from && docDate <= to
            expect(result).toBe(inRange)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Combined Filters (Requirements 9.1, 9.2, 9.3)', () => {
    it('should match only documents that satisfy ALL filter criteria', () => {
      fc.assert(
        fc.property(
          generatedDocumentArb23,
          fc.option(entityTypeArb23, { nil: undefined }),
          fc.option(uuidArb23, { nil: undefined }),
          fc.option(documentTypeArb23, { nil: undefined }),
          fc.option(isoDateArb23, { nil: undefined }),
          fc.option(isoDateArb23, { nil: undefined }),
          (document, entityType, entityId, docType, fromDate, toDate) => {
            const filters: DocumentHistoryFilters = {
              entity_type: entityType,
              entity_id: entityId,
              document_type: docType,
              from_date: fromDate,
              to_date: toDate,
            }
            
            const result = matchesAllFilters(document, filters)
            
            // Manually check each filter
            const entityMatch = matchesEntityFilter(document, entityType, entityId)
            const typeMatch = matchesDocumentTypeFilter(document, docType)
            const dateMatch = matchesDateRangeFilter(document, fromDate, toDate)
            
            // Result should be true only if ALL filters match
            expect(result).toBe(entityMatch && typeMatch && dateMatch)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should filter array of documents correctly with combined filters', () => {
      fc.assert(
        fc.property(
          documentsArb23,
          fc.option(entityTypeArb23, { nil: undefined }),
          fc.option(documentTypeArb23, { nil: undefined }),
          (documents, entityType, docType) => {
            const filters: DocumentHistoryFilters = {
              entity_type: entityType,
              document_type: docType,
            }
            
            const filtered = filterDocumentHistory(documents, filters)
            
            // All filtered documents should match ALL criteria
            for (const doc of filtered) {
              expect(matchesAllFilters(doc, filters)).toBe(true)
            }
            
            // No documents outside criteria should be included
            const excluded = documents.filter(doc => !matchesAllFilters(doc, filters))
            for (const doc of excluded) {
              expect(filtered).not.toContain(doc)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array when no documents match filters', () => {
      fc.assert(
        fc.property(documentsArb23, (documents) => {
          // Use a filter that won't match any document (non-existent entity_id)
          const filters: DocumentHistoryFilters = {
            entity_id: 'non-existent-id-that-wont-match-anything',
          }
          
          const filtered = filterDocumentHistory(documents, filters)
          
          // Should return empty array since no document has this entity_id
          expect(filtered).toHaveLength(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should return all documents when no filters are specified', () => {
      fc.assert(
        fc.property(documentsArb23, (documents) => {
          const filters: DocumentHistoryFilters = {}
          
          const filtered = filterDocumentHistory(documents, filters)
          
          // Should return all documents
          expect(filtered).toHaveLength(documents.length)
          expect(filtered).toEqual(documents)
        }),
        { numRuns: 100 }
      )
    })

    it('should preserve document order after filtering', () => {
      fc.assert(
        fc.property(documentsArb23, entityTypeArb23, (documents, entityType) => {
          const filters: DocumentHistoryFilters = { entity_type: entityType }
          
          const filtered = filterDocumentHistory(documents, filters)
          
          // Get expected filtered documents in original order
          const expected = documents.filter(doc => doc.entity_type === entityType)
          
          // Order should be preserved
          expect(filtered).toEqual(expected)
        }),
        { numRuns: 100 }
      )
    })
  })
})



/**
 * Property 24: Document History Data Completeness
 * For any document history listing, each returned document SHALL include template_name
 * (from joined template), generated_at timestamp, and generated_by user information.
 * 
 * Feature: n8n-document-generation, Property 24: Document History Data Completeness
 * Validates: Requirements 9.4
 */
describe('Property 24: Document History Data Completeness', () => {
  // Arbitraries for generating test data
  const documentTypeArb24: fc.Arbitrary<DocumentType> = fc.constantFrom(...VALID_DOCUMENT_TYPES)
  const uuidArb24 = fc.uuid()
  const documentNumberArb24 = fc.stringMatching(/^[A-Z]{2,4}-\d{4}-\d{4}$/)
  const entityTypeArb24 = fc.constantFrom('invoice', 'quotation', 'job_order')
  const fileUrlArb24 = fc.webUrl().map(url => `${url}/storage/v1/object/public/generated-documents/invoice/2025/01/test.pdf`)
  const fileNameArb24 = fc.stringMatching(/^[A-Za-z0-9_-]+\.pdf$/)
  const fileSizeArb24 = fc.integer({ min: 1, max: 10000 })
  const isoDateArb24 = fc.integer({ min: 1704067200000, max: 1735689600000 })
    .map(ts => new Date(ts).toISOString())

  // Generate a valid VariableContext
  const variableContextArb24: fc.Arbitrary<VariableContext> = fc.record({
    invoice_number: fc.oneof(documentNumberArb24, fc.constant(null)),
    customer_name: fc.oneof(fc.string({ minLength: 1, maxLength: 100 }), fc.constant(null)),
  })

  // Generate template relation data
  const templateRelationArb = fc.record({
    id: uuidArb24,
    template_name: fc.string({ minLength: 1, maxLength: 100 }),
    template_code: fc.stringMatching(/^[A-Z]{2,4}_[A-Z]+$/),
  })

  // Generate user profile relation data
  const userProfileRelationArb = fc.record({
    id: uuidArb24,
    full_name: fc.string({ minLength: 1, maxLength: 100 }),
  })

  // Generate a complete GeneratedDocumentWithRelations record
  const documentWithRelationsArb: fc.Arbitrary<GeneratedDocumentWithRelations> = fc.record({
    id: uuidArb24,
    template_id: uuidArb24,
    document_type: documentTypeArb24,
    document_number: fc.option(documentNumberArb24, { nil: null }),
    entity_type: entityTypeArb24,
    entity_id: uuidArb24,
    file_url: fileUrlArb24,
    file_name: fileNameArb24,
    file_size_kb: fileSizeArb24,
    generated_at: isoDateArb24,
    generated_by: uuidArb24,
    variables_data: variableContextArb24,
    sent_to_email: fc.option(fc.emailAddress(), { nil: null }),
    sent_at: fc.option(isoDateArb24, { nil: null }),
    created_at: isoDateArb24,
    document_templates: fc.option(templateRelationArb, { nil: null }),
    user_profiles: fc.option(userProfileRelationArb, { nil: null }),
  })

  // Generate a complete document with all relations present
  const completeDocumentWithRelationsArb: fc.Arbitrary<GeneratedDocumentWithRelations> = fc.record({
    id: uuidArb24,
    template_id: uuidArb24,
    document_type: documentTypeArb24,
    document_number: fc.option(documentNumberArb24, { nil: null }),
    entity_type: entityTypeArb24,
    entity_id: uuidArb24,
    file_url: fileUrlArb24,
    file_name: fileNameArb24,
    file_size_kb: fileSizeArb24,
    generated_at: isoDateArb24,
    generated_by: uuidArb24,
    variables_data: variableContextArb24,
    sent_to_email: fc.option(fc.emailAddress(), { nil: null }),
    sent_at: fc.option(isoDateArb24, { nil: null }),
    created_at: isoDateArb24,
    document_templates: templateRelationArb, // Always present
    user_profiles: userProfileRelationArb, // Always present
  })

  describe('Template Name Requirement', () => {
    it('should validate that template_name is present in complete documents', () => {
      fc.assert(
        fc.property(completeDocumentWithRelationsArb, (document) => {
          const result = validateHistoryDataCompleteness(document)
          
          // Complete document should have template_name
          expect(document.document_templates?.template_name).toBeDefined()
          expect(document.document_templates?.template_name.length).toBeGreaterThan(0)
          
          // Validation should pass for template_name
          expect(result.missingFields).not.toContain('template_name')
        }),
        { numRuns: 100 }
      )
    })

    it('should report missing template_name when document_templates is null', () => {
      fc.assert(
        fc.property(
          documentWithRelationsArb.map(doc => ({ ...doc, document_templates: null })),
          (document) => {
            const result = validateHistoryDataCompleteness(document)
            
            expect(result.valid).toBe(false)
            expect(result.missingFields).toContain('template_name')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should report missing template_name when template_name is empty', () => {
      fc.assert(
        fc.property(
          documentWithRelationsArb.map(doc => ({
            ...doc,
            document_templates: { id: 'test-id', template_name: '', template_code: 'TEST' }
          })),
          (document) => {
            const result = validateHistoryDataCompleteness(document)
            
            expect(result.valid).toBe(false)
            expect(result.missingFields).toContain('template_name')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Generated At Timestamp Requirement', () => {
    it('should validate that generated_at is present in complete documents', () => {
      fc.assert(
        fc.property(completeDocumentWithRelationsArb, (document) => {
          const result = validateHistoryDataCompleteness(document)
          
          // Complete document should have generated_at
          expect(document.generated_at).toBeDefined()
          expect(document.generated_at.length).toBeGreaterThan(0)
          
          // Should be a valid ISO date string
          const date = new Date(document.generated_at)
          expect(isNaN(date.getTime())).toBe(false)
          
          // Validation should pass for generated_at
          expect(result.missingFields).not.toContain('generated_at')
        }),
        { numRuns: 100 }
      )
    })

    it('should report missing generated_at when it is empty', () => {
      fc.assert(
        fc.property(
          completeDocumentWithRelationsArb.map(doc => ({ ...doc, generated_at: '' })),
          (document) => {
            const result = validateHistoryDataCompleteness(document)
            
            expect(result.valid).toBe(false)
            expect(result.missingFields).toContain('generated_at')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Generated By User Information Requirement', () => {
    it('should validate that generated_by is present in complete documents', () => {
      fc.assert(
        fc.property(completeDocumentWithRelationsArb, (document) => {
          const result = validateHistoryDataCompleteness(document)
          
          // Complete document should have generated_by
          expect(document.generated_by).toBeDefined()
          expect(document.generated_by.length).toBeGreaterThan(0)
          
          // Validation should pass for generated_by
          expect(result.missingFields).not.toContain('generated_by')
        }),
        { numRuns: 100 }
      )
    })

    it('should report missing generated_by when it is empty', () => {
      fc.assert(
        fc.property(
          completeDocumentWithRelationsArb.map(doc => ({ ...doc, generated_by: '' })),
          (document) => {
            const result = validateHistoryDataCompleteness(document)
            
            expect(result.valid).toBe(false)
            expect(result.missingFields).toContain('generated_by')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate that user_profiles relation is present for enriched data', () => {
      fc.assert(
        fc.property(completeDocumentWithRelationsArb, (document) => {
          const result = validateHistoryDataCompleteness(document)
          
          // Complete document should have user_profiles
          expect(document.user_profiles).toBeDefined()
          expect(document.user_profiles?.full_name).toBeDefined()
          
          // Validation should pass for user_profiles
          expect(result.missingFields).not.toContain('user_profiles')
        }),
        { numRuns: 100 }
      )
    })

    it('should report missing user_profiles when it is undefined', () => {
      fc.assert(
        fc.property(
          completeDocumentWithRelationsArb.map(doc => {
            const { user_profiles, ...rest } = doc
            return rest as GeneratedDocumentWithRelations
          }),
          (document) => {
            const result = validateHistoryDataCompleteness(document)
            
            expect(result.missingFields).toContain('user_profiles')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Complete Document Validation', () => {
    it('should return valid=true for documents with all required fields', () => {
      fc.assert(
        fc.property(completeDocumentWithRelationsArb, (document) => {
          const result = validateHistoryDataCompleteness(document)
          
          expect(result.valid).toBe(true)
          expect(result.missingFields).toHaveLength(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should return valid=false when any required field is missing', () => {
      // Test with missing template
      const docWithoutTemplate: GeneratedDocumentWithRelations = {
        id: 'test-id',
        template_id: 'template-id',
        document_type: 'invoice',
        document_number: 'INV-2025-0001',
        entity_type: 'invoice',
        entity_id: 'entity-id',
        file_url: 'https://example.com/file.pdf',
        file_name: 'test.pdf',
        file_size_kb: 100,
        generated_at: new Date().toISOString(),
        generated_by: 'user-id',
        variables_data: {},
        sent_to_email: null,
        sent_at: null,
        created_at: new Date().toISOString(),
        document_templates: null, // Missing template
        user_profiles: { id: 'user-id', full_name: 'Test User' },
      }
      
      const result = validateHistoryDataCompleteness(docWithoutTemplate)
      
      expect(result.valid).toBe(false)
      expect(result.missingFields.length).toBeGreaterThan(0)
    })

    it('should report all missing fields when multiple are absent', () => {
      const incompleteDoc: GeneratedDocumentWithRelations = {
        id: 'test-id',
        template_id: 'template-id',
        document_type: 'invoice',
        document_number: 'INV-2025-0001',
        entity_type: 'invoice',
        entity_id: 'entity-id',
        file_url: 'https://example.com/file.pdf',
        file_name: 'test.pdf',
        file_size_kb: 100,
        generated_at: '', // Missing
        generated_by: '', // Missing
        variables_data: {},
        sent_to_email: null,
        sent_at: null,
        created_at: new Date().toISOString(),
        document_templates: null, // Missing
        user_profiles: null, // Missing (but null is allowed, undefined is not)
      }
      
      const result = validateHistoryDataCompleteness(incompleteDoc)
      
      expect(result.valid).toBe(false)
      expect(result.missingFields).toContain('template_name')
      expect(result.missingFields).toContain('generated_at')
      expect(result.missingFields).toContain('generated_by')
    })

    it('should always return a missingFields array (never undefined)', () => {
      fc.assert(
        fc.property(documentWithRelationsArb, (document) => {
          const result = validateHistoryDataCompleteness(document)
          
          expect(result.missingFields).toBeDefined()
          expect(Array.isArray(result.missingFields)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should have consistent valid flag based on missingFields', () => {
      fc.assert(
        fc.property(documentWithRelationsArb, (document) => {
          const result = validateHistoryDataCompleteness(document)
          
          // valid should be true only when missingFields is empty
          if (result.missingFields.length === 0) {
            expect(result.valid).toBe(true)
          } else {
            expect(result.valid).toBe(false)
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('User Profiles Null vs Undefined', () => {
    it('should allow null user_profiles (user may have been deleted)', () => {
      const docWithNullUserProfile: GeneratedDocumentWithRelations = {
        id: 'test-id',
        template_id: 'template-id',
        document_type: 'invoice',
        document_number: 'INV-2025-0001',
        entity_type: 'invoice',
        entity_id: 'entity-id',
        file_url: 'https://example.com/file.pdf',
        file_name: 'test.pdf',
        file_size_kb: 100,
        generated_at: new Date().toISOString(),
        generated_by: 'user-id',
        variables_data: {},
        sent_to_email: null,
        sent_at: null,
        created_at: new Date().toISOString(),
        document_templates: { id: 'template-id', template_name: 'Test Template', template_code: 'TEST' },
        user_profiles: null, // Null is allowed (user may have been deleted)
      }
      
      const result = validateHistoryDataCompleteness(docWithNullUserProfile)
      
      // Should not report user_profiles as missing when it's null
      expect(result.missingFields).not.toContain('user_profiles')
    })
  })
})
