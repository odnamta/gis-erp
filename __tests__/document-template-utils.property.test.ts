/**
 * Property-based tests for document template utilities
 * Feature: n8n-document-generation
 * 
 * Tests Properties 2 and 3 from the design document:
 * - Property 2: Template HTML Validation
 * - Property 3: Document Type Validation
 * 
 * Validates: Requirements 1.2, 1.3
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  validateTemplate,
  validateTemplateForCreate,
  isValidDocumentType,
  isValidPageSize,
  isValidOrientation,
  validateMargins,
  extractAvailableVariables,
  extractLoopVariables,
  sanitizeTemplateCode,
} from '@/lib/document-template-utils'
import {
  VALID_DOCUMENT_TYPES,
  VALID_PAGE_SIZES,
  VALID_ORIENTATIONS,
  DocumentType,
  PageSize,
  PageOrientation,
  CreateTemplateInput,
} from '@/types/document-generation'

// Arbitraries for generating test data
const documentTypeArb: fc.Arbitrary<DocumentType> = fc.constantFrom(...VALID_DOCUMENT_TYPES)
const pageSizeArb: fc.Arbitrary<PageSize> = fc.constantFrom(...VALID_PAGE_SIZES)
const orientationArb: fc.Arbitrary<PageOrientation> = fc.constantFrom(...VALID_ORIENTATIONS)

const templateCodeArb = fc.stringMatching(/^[A-Z][A-Z0-9_]{2,29}$/)
const templateNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)

// Generate valid HTML template content
const validHtmlTemplateArb = fc.string({ minLength: 10, maxLength: 500 }).map(
  content => `<html><body>${content}</body></html>`
)

// Generate whitespace-only strings
const whitespaceOnlyArb = fc.constantFrom('', ' ', '  ', '\t', '\n', '   \t\n  ')

// Generate valid margin settings
const validMarginsArb = fc.record({
  top: fc.integer({ min: 0, max: 100 }),
  right: fc.integer({ min: 0, max: 100 }),
  bottom: fc.integer({ min: 0, max: 100 }),
  left: fc.integer({ min: 0, max: 100 }),
})

// Generate variable names for templates
const variableNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,19}$/)

describe('Document Template Utilities Property Tests', () => {
  /**
   * Property 2: Template HTML Validation
   * For any template creation or update attempt where html_template is empty or contains
   * only whitespace, the operation SHALL be rejected with a validation error.
   * 
   * Validates: Requirements 1.2
   */
  describe('Property 2: Template HTML Validation', () => {
    it('should reject templates with empty html_template', () => {
      fc.assert(
        fc.property(
          templateCodeArb,
          templateNameArb,
          documentTypeArb,
          (code, name, docType) => {
            const template: CreateTemplateInput = {
              template_code: code,
              template_name: name,
              document_type: docType,
              html_template: '',
            }

            const result = validateTemplate(template)
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.toLowerCase().includes('html_template'))).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject templates with whitespace-only html_template', () => {
      fc.assert(
        fc.property(
          templateCodeArb,
          templateNameArb,
          documentTypeArb,
          whitespaceOnlyArb,
          (code, name, docType, whitespace) => {
            const template: CreateTemplateInput = {
              template_code: code,
              template_name: name,
              document_type: docType,
              html_template: whitespace,
            }

            const result = validateTemplate(template)
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.toLowerCase().includes('html_template'))).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should accept templates with valid non-empty html_template', () => {
      fc.assert(
        fc.property(
          templateCodeArb,
          templateNameArb,
          documentTypeArb,
          validHtmlTemplateArb,
          (code, name, docType, html) => {
            const template: CreateTemplateInput = {
              template_code: code,
              template_name: name,
              document_type: docType,
              html_template: html,
            }

            const result = validateTemplate(template)
            // Should not have html_template errors
            expect(result.errors.filter(e => e.toLowerCase().includes('html_template'))).toHaveLength(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate html_template for create operations', () => {
      fc.assert(
        fc.property(
          templateCodeArb,
          templateNameArb,
          documentTypeArb,
          (code, name, docType) => {
            const template: CreateTemplateInput = {
              template_code: code,
              template_name: name,
              document_type: docType,
              html_template: '', // Empty
            }

            const result = validateTemplateForCreate(template)
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.toLowerCase().includes('html_template'))).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 3: Document Type Validation
   * For any template creation or update attempt, the document_type SHALL be one of the
   * valid types (invoice, quotation, contract, certificate, report, packing_list, delivery_note),
   * and invalid types SHALL be rejected.
   * 
   * Validates: Requirements 1.3
   */
  describe('Property 3: Document Type Validation', () => {
    it('should accept all valid document types', () => {
      fc.assert(
        fc.property(documentTypeArb, (docType) => {
          expect(isValidDocumentType(docType)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should reject invalid document types', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }).filter(
            s => !VALID_DOCUMENT_TYPES.includes(s as DocumentType)
          ),
          (invalidType) => {
            expect(isValidDocumentType(invalidType)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject templates with invalid document_type', () => {
      fc.assert(
        fc.property(
          templateCodeArb,
          templateNameArb,
          validHtmlTemplateArb,
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            s => !VALID_DOCUMENT_TYPES.includes(s as DocumentType)
          ),
          (code, name, html, invalidType) => {
            const template = {
              template_code: code,
              template_name: name,
              document_type: invalidType as DocumentType,
              html_template: html,
            }

            const result = validateTemplate(template)
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.toLowerCase().includes('document_type'))).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should accept templates with valid document_type', () => {
      fc.assert(
        fc.property(
          templateCodeArb,
          templateNameArb,
          validHtmlTemplateArb,
          documentTypeArb,
          (code, name, html, docType) => {
            const template: CreateTemplateInput = {
              template_code: code,
              template_name: name,
              document_type: docType,
              html_template: html,
            }

            const result = validateTemplate(template)
            // Should not have document_type errors
            expect(result.errors.filter(e => e.toLowerCase().includes('document_type'))).toHaveLength(0)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Additional validation tests for page_size, orientation, and margins
   */
  describe('Page Size Validation', () => {
    it('should accept all valid page sizes', () => {
      fc.assert(
        fc.property(pageSizeArb, (size) => {
          expect(isValidPageSize(size)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should reject invalid page sizes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            s => !VALID_PAGE_SIZES.includes(s as PageSize)
          ),
          (invalidSize) => {
            expect(isValidPageSize(invalidSize)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Orientation Validation', () => {
    it('should accept all valid orientations', () => {
      fc.assert(
        fc.property(orientationArb, (orientation) => {
          expect(isValidOrientation(orientation)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should reject invalid orientations', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            s => !VALID_ORIENTATIONS.includes(s as PageOrientation)
          ),
          (invalidOrientation) => {
            expect(isValidOrientation(invalidOrientation)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Margin Validation', () => {
    it('should accept valid margin settings', () => {
      fc.assert(
        fc.property(validMarginsArb, (margins) => {
          const result = validateMargins(margins)
          expect(result.valid).toBe(true)
          expect(result.errors).toHaveLength(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should reject negative margin values', () => {
      fc.assert(
        fc.property(
          fc.record({
            top: fc.integer({ min: -100, max: -1 }),
            right: fc.integer({ min: 0, max: 100 }),
            bottom: fc.integer({ min: 0, max: 100 }),
            left: fc.integer({ min: 0, max: 100 }),
          }),
          (margins) => {
            const result = validateMargins(margins)
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.includes('top'))).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Variable extraction tests
   */
  describe('Variable Extraction', () => {
    it('should extract all {{variable}} placeholders from template', () => {
      fc.assert(
        fc.property(
          fc.array(variableNameArb, { minLength: 1, maxLength: 5 }),
          (variables) => {
            const uniqueVars = [...new Set(variables)]
            const template = uniqueVars.map(v => `<span>{{${v}}}</span>`).join('')
            
            const extracted = extractAvailableVariables(template)
            
            // All unique variables should be extracted
            for (const v of uniqueVars) {
              expect(extracted).toContain(v)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not extract loop markers as variables', () => {
      fc.assert(
        fc.property(variableNameArb, (loopName) => {
          const template = `{{#${loopName}}}<li>{{item}}</li>{{/${loopName}}}`
          
          const extracted = extractAvailableVariables(template)
          
          // Loop markers should not be in extracted variables
          expect(extracted).not.toContain(`#${loopName}`)
          expect(extracted).not.toContain(`/${loopName}`)
          // But inner variables should be extracted
          expect(extracted).toContain('item')
        }),
        { numRuns: 100 }
      )
    })

    it('should extract loop names correctly', () => {
      fc.assert(
        fc.property(
          fc.array(variableNameArb, { minLength: 1, maxLength: 3 }),
          (loopNames) => {
            const uniqueLoops = [...new Set(loopNames)]
            const template = uniqueLoops.map(l => `{{#${l}}}content{{/${l}}}`).join('')
            
            const extracted = extractLoopVariables(template)
            
            // All unique loop names should be extracted
            for (const l of uniqueLoops) {
              expect(extracted).toContain(l)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array for empty template', () => {
      expect(extractAvailableVariables('')).toEqual([])
      expect(extractAvailableVariables(null as unknown as string)).toEqual([])
      expect(extractLoopVariables('')).toEqual([])
    })
  })

  /**
   * Template code sanitization tests
   */
  describe('Template Code Sanitization', () => {
    it('should convert to uppercase', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => /[a-zA-Z]/.test(s)),
          (code) => {
            const sanitized = sanitizeTemplateCode(code)
            expect(sanitized).toBe(sanitized.toUpperCase())
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should replace invalid characters with underscores', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          (code) => {
            const sanitized = sanitizeTemplateCode(code)
            // Result should only contain A-Z, 0-9, and _
            expect(sanitized).toMatch(/^[A-Z0-9_]*$/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty input', () => {
      expect(sanitizeTemplateCode('')).toBe('')
      expect(sanitizeTemplateCode(null as unknown as string)).toBe('')
    })
  })
})
