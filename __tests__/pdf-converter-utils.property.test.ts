/**
 * Property-based tests for PDF converter utilities
 * Feature: n8n-document-generation
 * 
 * Tests Property 10 from the design document:
 * - Property 10: PDF Conversion Error Handling
 * 
 * Validates: Requirements 3.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import {
  validatePDFOptions,
  convertToPDF,
  buildCompleteHTML,
  createPDFOptions,
  estimatePDFSize,
} from '@/lib/pdf-converter-utils'
import {
  PDFOptions,
  PageSize,
  PageOrientation,
  MarginSettings,
  VALID_PAGE_SIZES,
  VALID_ORIENTATIONS,
} from '@/types/document-generation'

// Arbitraries for generating test data
const pageSizeArb: fc.Arbitrary<PageSize> = fc.constantFrom(...VALID_PAGE_SIZES)
const orientationArb: fc.Arbitrary<PageOrientation> = fc.constantFrom(...VALID_ORIENTATIONS)

const validMarginsArb: fc.Arbitrary<MarginSettings> = fc.record({
  top: fc.integer({ min: 0, max: 100 }),
  right: fc.integer({ min: 0, max: 100 }),
  bottom: fc.integer({ min: 0, max: 100 }),
  left: fc.integer({ min: 0, max: 100 }),
})

const invalidMarginsArb: fc.Arbitrary<MarginSettings> = fc.oneof(
  fc.record({
    top: fc.integer({ min: -100, max: -1 }),
    right: fc.integer({ min: 0, max: 100 }),
    bottom: fc.integer({ min: 0, max: 100 }),
    left: fc.integer({ min: 0, max: 100 }),
  }),
  fc.record({
    top: fc.integer({ min: 0, max: 100 }),
    right: fc.integer({ min: -100, max: -1 }),
    bottom: fc.integer({ min: 0, max: 100 }),
    left: fc.integer({ min: 0, max: 100 }),
  }),
  fc.record({
    top: fc.integer({ min: 0, max: 100 }),
    right: fc.integer({ min: 0, max: 100 }),
    bottom: fc.integer({ min: -100, max: -1 }),
    left: fc.integer({ min: 0, max: 100 }),
  }),
  fc.record({
    top: fc.integer({ min: 0, max: 100 }),
    right: fc.integer({ min: 0, max: 100 }),
    bottom: fc.integer({ min: 0, max: 100 }),
    left: fc.integer({ min: -100, max: -1 }),
  })
)

const validPDFOptionsArb: fc.Arbitrary<PDFOptions> = fc.record({
  page_size: pageSizeArb,
  orientation: orientationArb,
  margins: validMarginsArb,
  header_html: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  footer_html: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
})

const validHtmlArb = fc.string({ minLength: 10, maxLength: 500 }).map(
  content => `<html><body>${content}</body></html>`
)

const emptyOrWhitespaceArb = fc.constantFrom('', ' ', '  ', '\t', '\n', '   \t\n  ')

describe('PDF Converter Utilities Property Tests', () => {
  /**
   * Property 10: PDF Conversion Error Handling
   * For any PDF conversion that fails (invalid HTML, service unavailable, etc.),
   * the converter SHALL return a result with success=false and a non-empty error
   * message describing the failure.
   * 
   * Validates: Requirements 3.6
   */
  describe('Property 10: PDF Conversion Error Handling', () => {
    beforeEach(() => {
      // Clear any mocked fetch
      vi.restoreAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should return error for empty HTML content', async () => {
      await fc.assert(
        fc.asyncProperty(
          emptyOrWhitespaceArb,
          validPDFOptionsArb,
          async (emptyHtml, options) => {
            const result = await convertToPDF(emptyHtml, options)
            
            // Must return success=false
            expect(result.success).toBe(false)
            // Must have non-empty error message
            expect(result.error).toBeDefined()
            expect(typeof result.error).toBe('string')
            expect(result.error!.length).toBeGreaterThan(0)
            // Should not have pdf_buffer
            expect(result.pdf_buffer).toBeUndefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return error for invalid page_size', async () => {
      await fc.assert(
        fc.asyncProperty(
          validHtmlArb,
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            s => !VALID_PAGE_SIZES.includes(s as PageSize)
          ),
          orientationArb,
          validMarginsArb,
          async (html, invalidPageSize, orientation, margins) => {
            const options = {
              page_size: invalidPageSize as PageSize,
              orientation,
              margins,
            }
            
            const result = await convertToPDF(html, options)
            
            // Must return success=false
            expect(result.success).toBe(false)
            // Must have non-empty error message
            expect(result.error).toBeDefined()
            expect(typeof result.error).toBe('string')
            expect(result.error!.length).toBeGreaterThan(0)
            // Error should mention page_size
            expect(result.error!.toLowerCase()).toContain('page_size')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return error for invalid orientation', async () => {
      await fc.assert(
        fc.asyncProperty(
          validHtmlArb,
          pageSizeArb,
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            s => !VALID_ORIENTATIONS.includes(s as PageOrientation)
          ),
          validMarginsArb,
          async (html, pageSize, invalidOrientation, margins) => {
            const options = {
              page_size: pageSize,
              orientation: invalidOrientation as PageOrientation,
              margins,
            }
            
            const result = await convertToPDF(html, options)
            
            // Must return success=false
            expect(result.success).toBe(false)
            // Must have non-empty error message
            expect(result.error).toBeDefined()
            expect(typeof result.error).toBe('string')
            expect(result.error!.length).toBeGreaterThan(0)
            // Error should mention orientation
            expect(result.error!.toLowerCase()).toContain('orientation')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return error for negative margin values', async () => {
      await fc.assert(
        fc.asyncProperty(
          validHtmlArb,
          pageSizeArb,
          orientationArb,
          invalidMarginsArb,
          async (html, pageSize, orientation, invalidMargins) => {
            const options = {
              page_size: pageSize,
              orientation,
              margins: invalidMargins,
            }
            
            const result = await convertToPDF(html, options)
            
            // Must return success=false
            expect(result.success).toBe(false)
            // Must have non-empty error message
            expect(result.error).toBeDefined()
            expect(typeof result.error).toBe('string')
            expect(result.error!.length).toBeGreaterThan(0)
            // Error should mention margins
            expect(result.error!.toLowerCase()).toContain('margin')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return error when API URL is not configured', async () => {
      // Ensure HTML2PDF_API_URL is not set
      const originalUrl = process.env.HTML2PDF_API_URL
      delete process.env.HTML2PDF_API_URL

      try {
        await fc.assert(
          fc.asyncProperty(
            validHtmlArb,
            validPDFOptionsArb,
            async (html, options) => {
              const result = await convertToPDF(html, options)
              
              // Must return success=false
              expect(result.success).toBe(false)
              // Must have non-empty error message
              expect(result.error).toBeDefined()
              expect(typeof result.error).toBe('string')
              expect(result.error!.length).toBeGreaterThan(0)
              // Error should mention configuration
              expect(result.error!.toLowerCase()).toContain('html2pdf_api_url')
            }
          ),
          { numRuns: 100 }
        )
      } finally {
        // Restore original value
        if (originalUrl) {
          process.env.HTML2PDF_API_URL = originalUrl
        }
      }
    })

    it('should return error when API returns error status', async () => {
      // Mock fetch to return error
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      })
      vi.stubGlobal('fetch', mockFetch)
      process.env.HTML2PDF_API_URL = 'https://api.example.com/pdf'

      try {
        await fc.assert(
          fc.asyncProperty(
            validHtmlArb,
            validPDFOptionsArb,
            async (html, options) => {
              const result = await convertToPDF(html, options)
              
              // Must return success=false
              expect(result.success).toBe(false)
              // Must have non-empty error message
              expect(result.error).toBeDefined()
              expect(typeof result.error).toBe('string')
              expect(result.error!.length).toBeGreaterThan(0)
              // Error should mention API error
              expect(result.error!.toLowerCase()).toContain('api')
            }
          ),
          { numRuns: 100 }
        )
      } finally {
        vi.unstubAllGlobals()
        delete process.env.HTML2PDF_API_URL
      }
    })

    it('should return error when API returns JSON error response', async () => {
      // Mock fetch to return JSON error
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        json: () => Promise.resolve({ error: 'PDF generation failed' }),
      })
      vi.stubGlobal('fetch', mockFetch)
      process.env.HTML2PDF_API_URL = 'https://api.example.com/pdf'

      try {
        await fc.assert(
          fc.asyncProperty(
            validHtmlArb,
            validPDFOptionsArb,
            async (html, options) => {
              const result = await convertToPDF(html, options)
              
              // Must return success=false
              expect(result.success).toBe(false)
              // Must have non-empty error message
              expect(result.error).toBeDefined()
              expect(typeof result.error).toBe('string')
              expect(result.error!.length).toBeGreaterThan(0)
            }
          ),
          { numRuns: 100 }
        )
      } finally {
        vi.unstubAllGlobals()
        delete process.env.HTML2PDF_API_URL
      }
    })

    it('should return error when network request fails', async () => {
      // Mock fetch to throw network error
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
      vi.stubGlobal('fetch', mockFetch)
      process.env.HTML2PDF_API_URL = 'https://api.example.com/pdf'

      try {
        await fc.assert(
          fc.asyncProperty(
            validHtmlArb,
            validPDFOptionsArb,
            async (html, options) => {
              const result = await convertToPDF(html, options)
              
              // Must return success=false
              expect(result.success).toBe(false)
              // Must have non-empty error message
              expect(result.error).toBeDefined()
              expect(typeof result.error).toBe('string')
              expect(result.error!.length).toBeGreaterThan(0)
              // Error should contain the network error message
              expect(result.error!.toLowerCase()).toContain('network')
            }
          ),
          { numRuns: 100 }
        )
      } finally {
        vi.unstubAllGlobals()
        delete process.env.HTML2PDF_API_URL
      }
    })
  })

  /**
   * PDF Options Validation Tests
   */
  describe('PDF Options Validation', () => {
    it('should accept valid PDF options', () => {
      fc.assert(
        fc.property(validPDFOptionsArb, (options) => {
          const result = validatePDFOptions(options)
          expect(result.valid).toBe(true)
          expect(result.errors).toHaveLength(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should reject options with invalid page_size', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            s => !VALID_PAGE_SIZES.includes(s as PageSize)
          ),
          orientationArb,
          validMarginsArb,
          (invalidPageSize, orientation, margins) => {
            const options = {
              page_size: invalidPageSize as PageSize,
              orientation,
              margins,
            }
            
            const result = validatePDFOptions(options)
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.toLowerCase().includes('page_size'))).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject options with invalid orientation', () => {
      fc.assert(
        fc.property(
          pageSizeArb,
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            s => !VALID_ORIENTATIONS.includes(s as PageOrientation)
          ),
          validMarginsArb,
          (pageSize, invalidOrientation, margins) => {
            const options = {
              page_size: pageSize,
              orientation: invalidOrientation as PageOrientation,
              margins,
            }
            
            const result = validatePDFOptions(options)
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.toLowerCase().includes('orientation'))).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject options with negative margins', () => {
      fc.assert(
        fc.property(
          pageSizeArb,
          orientationArb,
          invalidMarginsArb,
          (pageSize, orientation, invalidMargins) => {
            const options = {
              page_size: pageSize,
              orientation,
              margins: invalidMargins,
            }
            
            const result = validatePDFOptions(options)
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.toLowerCase().includes('margin'))).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * HTML Building Tests
   */
  describe('Build Complete HTML', () => {
    it('should preserve HTML without header/footer when none provided', () => {
      fc.assert(
        fc.property(
          validHtmlArb,
          pageSizeArb,
          orientationArb,
          validMarginsArb,
          (html, pageSize, orientation, margins) => {
            const options: PDFOptions = {
              page_size: pageSize,
              orientation,
              margins,
            }
            
            const result = buildCompleteHTML(html, options)
            // Should return original HTML unchanged
            expect(result).toBe(html)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include header when provided', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.string({ minLength: 5, maxLength: 50 }),
          pageSizeArb,
          orientationArb,
          validMarginsArb,
          (content, headerContent, pageSize, orientation, margins) => {
            const options: PDFOptions = {
              page_size: pageSize,
              orientation,
              margins,
              header_html: `<div>${headerContent}</div>`,
            }
            
            const result = buildCompleteHTML(content, options)
            // Should contain header content
            expect(result).toContain(headerContent)
            expect(result).toContain('pdf-header')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include footer when provided', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.string({ minLength: 5, maxLength: 50 }),
          pageSizeArb,
          orientationArb,
          validMarginsArb,
          (content, footerContent, pageSize, orientation, margins) => {
            const options: PDFOptions = {
              page_size: pageSize,
              orientation,
              margins,
              footer_html: `<div>${footerContent}</div>`,
            }
            
            const result = buildCompleteHTML(content, options)
            // Should contain footer content
            expect(result).toContain(footerContent)
            expect(result).toContain('pdf-footer')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Helper Function Tests
   */
  describe('Create PDF Options', () => {
    it('should create valid options with defaults', () => {
      const options = createPDFOptions()
      
      const result = validatePDFOptions(options)
      expect(result.valid).toBe(true)
      expect(options.page_size).toBe('A4')
      expect(options.orientation).toBe('portrait')
      expect(options.margins).toEqual({ top: 20, right: 20, bottom: 20, left: 20 })
    })

    it('should create valid options with custom values', () => {
      fc.assert(
        fc.property(
          pageSizeArb,
          orientationArb,
          validMarginsArb,
          fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          (pageSize, orientation, margins, header, footer) => {
            const options = createPDFOptions(pageSize, orientation, margins, header, footer)
            
            const result = validatePDFOptions(options)
            expect(result.valid).toBe(true)
            expect(options.page_size).toBe(pageSize)
            expect(options.orientation).toBe(orientation)
            expect(options.margins).toEqual(margins)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Estimate PDF Size', () => {
    it('should return positive estimate for non-empty HTML', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10000 }),
          (html) => {
            const estimate = estimatePDFSize(html)
            expect(estimate).toBeGreaterThan(0)
            expect(Number.isInteger(estimate)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return larger estimate for larger HTML', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 100, maxLength: 500 }),
          fc.string({ minLength: 1000, maxLength: 5000 }),
          (smallHtml, largeHtml) => {
            const smallEstimate = estimatePDFSize(smallHtml)
            const largeEstimate = estimatePDFSize(largeHtml)
            expect(largeEstimate).toBeGreaterThan(smallEstimate)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
