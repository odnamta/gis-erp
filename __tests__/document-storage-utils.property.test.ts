/**
 * Property-based tests for document storage utilities
 * Feature: n8n-document-generation
 * 
 * Tests Properties 11 and 13 from the design document:
 * - Property 11: Storage Path Structure
 * - Property 13: Storage URL Validity
 * 
 * Validates: Requirements 4.2, 4.6
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  buildStoragePath,
  getPublicUrl,
  sanitizeFilename,
  isValidStoragePath,
  parseStoragePath,
  extractStoragePathFromUrl,
  bytesToKB,
  generateUniqueFilename,
  isValidSupabaseStorageUrl,
  GENERATED_DOCUMENTS_BUCKET,
} from '@/lib/document-storage-utils'
import {
  VALID_DOCUMENT_TYPES,
  DocumentType,
} from '@/types/document-generation'

// Arbitraries for generating test data
const documentTypeArb: fc.Arbitrary<DocumentType> = fc.constantFrom(...VALID_DOCUMENT_TYPES)

// Generate document numbers in various formats
const documentNumberArb = fc.oneof(
  // Invoice format: INV-2025-0001
  fc.tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 9999 })
  ).map(([year, num]) => `INV-${year}-${num.toString().padStart(4, '0')}`),
  // Quotation format: QUO-2025-0001
  fc.tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 9999 })
  ).map(([year, num]) => `QUO-${year}-${num.toString().padStart(4, '0')}`),
  // PJO format: 0001/CARGO/XII/2025
  fc.tuple(
    fc.integer({ min: 1, max: 9999 }),
    fc.constantFrom('I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'),
    fc.integer({ min: 2020, max: 2030 })
  ).map(([num, month, year]) => `${num.toString().padStart(4, '0')}/CARGO/${month}/${year}`),
  // JO format: JO-0001/CARGO/XII/2025
  fc.tuple(
    fc.integer({ min: 1, max: 9999 }),
    fc.constantFrom('I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'),
    fc.integer({ min: 2020, max: 2030 })
  ).map(([num, month, year]) => `JO-${num.toString().padStart(4, '0')}/CARGO/${month}/${year}`),
  // Simple alphanumeric
  fc.stringMatching(/^[A-Z]{2,4}-\d{4,8}$/)
)

// Generate valid dates (filter out invalid dates)
const dateArb = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31'),
}).filter(d => !isNaN(d.getTime()))

// Generate Supabase URLs
const supabaseUrlArb = fc.constantFrom(
  'https://ljbkjtaowrdddvjhsygj.supabase.co',
  'https://example.supabase.co',
  'https://test-project.supabase.co'
)

describe('Document Storage Utilities Property Tests', () => {
  /**
   * Property 11: Storage Path Structure
   * For any document upload, the storage path SHALL follow the pattern
   * {document_type}/{YYYY}/{MM}/{filename} where YYYY is the 4-digit year
   * and MM is the 2-digit month of generation.
   * 
   * Validates: Requirements 4.2
   */
  describe('Property 11: Storage Path Structure', () => {
    it('should construct path with correct structure: {document_type}/{year}/{month}/{filename}', () => {
      fc.assert(
        fc.property(
          documentTypeArb,
          documentNumberArb,
          dateArb,
          (docType, docNumber, date) => {
            const result = buildStoragePath(docType, docNumber, date)
            
            // Path should have 4 parts separated by /
            const parts = result.path.split('/')
            expect(parts).toHaveLength(4)
            
            // First part should be document type
            expect(parts[0]).toBe(docType)
            
            // Second part should be 4-digit year
            expect(parts[1]).toMatch(/^\d{4}$/)
            expect(parseInt(parts[1])).toBe(date.getFullYear())
            
            // Third part should be 2-digit month (01-12)
            expect(parts[2]).toMatch(/^(0[1-9]|1[0-2])$/)
            expect(parseInt(parts[2])).toBe(date.getMonth() + 1)
            
            // Fourth part should be filename ending with .pdf
            expect(parts[3]).toMatch(/\.pdf$/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should use correct bucket name', () => {
      fc.assert(
        fc.property(
          documentTypeArb,
          documentNumberArb,
          (docType, docNumber) => {
            const result = buildStoragePath(docType, docNumber)
            expect(result.bucket).toBe(GENERATED_DOCUMENTS_BUCKET)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate unique filenames with timestamp', () => {
      fc.assert(
        fc.property(
          documentTypeArb,
          documentNumberArb,
          (docType, docNumber) => {
            const result1 = buildStoragePath(docType, docNumber, new Date())
            const result2 = buildStoragePath(docType, docNumber, new Date())
            
            // Filenames should contain timestamp making them unique
            expect(result1.filename).toMatch(/_\d+\.pdf$/)
            expect(result2.filename).toMatch(/_\d+\.pdf$/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should sanitize document numbers in filename', () => {
      fc.assert(
        fc.property(
          documentTypeArb,
          fc.string({ minLength: 1, maxLength: 50 }),
          (docType, docNumber) => {
            const result = buildStoragePath(docType, docNumber)
            
            // Filename should only contain safe characters
            // (alphanumeric, underscore, dash, dot)
            expect(result.filename).toMatch(/^[a-zA-Z0-9_-]+\.pdf$/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate generated paths', () => {
      fc.assert(
        fc.property(
          documentTypeArb,
          documentNumberArb,
          dateArb,
          (docType, docNumber, date) => {
            const result = buildStoragePath(docType, docNumber, date)
            expect(isValidStoragePath(result.path)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should parse generated paths correctly', () => {
      fc.assert(
        fc.property(
          documentTypeArb,
          documentNumberArb,
          dateArb,
          (docType, docNumber, date) => {
            const result = buildStoragePath(docType, docNumber, date)
            const parsed = parseStoragePath(result.path)
            
            expect(parsed).not.toBeNull()
            expect(parsed!.document_type).toBe(docType)
            expect(parsed!.year).toBe(date.getFullYear().toString())
            expect(parsed!.month).toBe((date.getMonth() + 1).toString().padStart(2, '0'))
            expect(parsed!.filename).toBe(result.filename)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 13: Storage URL Validity
   * For any successfully uploaded document, the returned file_url SHALL be
   * a valid URL that can be used to retrieve the document.
   * 
   * Validates: Requirements 4.6
   */
  describe('Property 13: Storage URL Validity', () => {
    it('should generate valid public URLs', () => {
      fc.assert(
        fc.property(
          supabaseUrlArb,
          documentTypeArb,
          documentNumberArb,
          dateArb,
          (supabaseUrl, docType, docNumber, date) => {
            const storagePath = buildStoragePath(docType, docNumber, date)
            const url = getPublicUrl(storagePath.bucket, storagePath.path, supabaseUrl)
            
            // URL should be valid
            expect(() => new URL(url)).not.toThrow()
            
            // URL should be HTTPS
            const parsed = new URL(url)
            expect(parsed.protocol).toBe('https:')
            
            // URL should contain storage path
            expect(parsed.pathname).toContain('/storage/v1/object/public/')
            expect(parsed.pathname).toContain(storagePath.bucket)
            expect(parsed.pathname).toContain(docType)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate Supabase storage URLs correctly', () => {
      fc.assert(
        fc.property(
          supabaseUrlArb,
          documentTypeArb,
          documentNumberArb,
          dateArb,
          (supabaseUrl, docType, docNumber, date) => {
            const storagePath = buildStoragePath(docType, docNumber, date)
            const url = getPublicUrl(storagePath.bucket, storagePath.path, supabaseUrl)
            
            expect(isValidSupabaseStorageUrl(url)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should extract storage path from generated URL', () => {
      fc.assert(
        fc.property(
          supabaseUrlArb,
          documentTypeArb,
          documentNumberArb,
          dateArb,
          (supabaseUrl, docType, docNumber, date) => {
            const storagePath = buildStoragePath(docType, docNumber, date)
            const url = getPublicUrl(storagePath.bucket, storagePath.path, supabaseUrl)
            
            const extracted = extractStoragePathFromUrl(url, storagePath.bucket)
            expect(extracted).toBe(storagePath.path)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle URLs with trailing slashes in base URL', () => {
      fc.assert(
        fc.property(
          supabaseUrlArb,
          documentTypeArb,
          documentNumberArb,
          (supabaseUrl, docType, docNumber) => {
            const storagePath = buildStoragePath(docType, docNumber)
            
            // Add trailing slash to base URL
            const urlWithSlash = getPublicUrl(storagePath.bucket, storagePath.path, supabaseUrl + '/')
            const urlWithoutSlash = getPublicUrl(storagePath.bucket, storagePath.path, supabaseUrl)
            
            // Both should produce valid URLs
            expect(() => new URL(urlWithSlash)).not.toThrow()
            expect(() => new URL(urlWithoutSlash)).not.toThrow()
            
            // Should not have double slashes (except in protocol)
            expect(urlWithSlash.replace('https://', '')).not.toContain('//')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject invalid URLs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => {
            try {
              new URL(s)
              return false // Valid URL, filter out
            } catch {
              return true // Invalid URL, keep
            }
          }),
          (invalidUrl) => {
            expect(isValidSupabaseStorageUrl(invalidUrl)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject non-HTTPS URLs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'http://example.supabase.co/storage/v1/object/public/bucket/path',
            'ftp://example.supabase.co/storage/v1/object/public/bucket/path'
          ),
          (nonHttpsUrl) => {
            expect(isValidSupabaseStorageUrl(nonHttpsUrl)).toBe(false)
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  /**
   * Additional utility function tests
   */
  describe('Filename Sanitization', () => {
    it('should replace special characters with underscores', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (input) => {
            const sanitized = sanitizeFilename(input)
            // Result should only contain alphanumeric, underscore, and dash
            expect(sanitized).toMatch(/^[a-zA-Z0-9_-]*$/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty input', () => {
      expect(sanitizeFilename('')).toBe('document')
      expect(sanitizeFilename(null as unknown as string)).toBe('document')
    })

    it('should preserve alphanumeric characters', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9]+$/),
          (alphanumeric) => {
            const sanitized = sanitizeFilename(alphanumeric)
            expect(sanitized).toBe(alphanumeric)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Bytes to KB Conversion', () => {
    it('should convert bytes to KB correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 * 1024 * 1024 }), // Up to 100MB
          (bytes) => {
            const kb = bytesToKB(bytes)
            expect(kb).toBe(Math.round(bytes / 1024))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge cases', () => {
      expect(bytesToKB(0)).toBe(0)
      expect(bytesToKB(-1)).toBe(0)
      expect(bytesToKB(1024)).toBe(1)
      expect(bytesToKB(1536)).toBe(2) // Rounds up
      expect(bytesToKB(512)).toBe(1) // Rounds up
    })
  })

  describe('Unique Filename Generation', () => {
    it('should generate filenames with .pdf extension', () => {
      fc.assert(
        fc.property(
          documentNumberArb,
          (docNumber) => {
            const filename = generateUniqueFilename(docNumber)
            expect(filename).toMatch(/\.pdf$/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include timestamp in filename', () => {
      fc.assert(
        fc.property(
          documentNumberArb,
          fc.integer({ min: 1000000000000, max: 2000000000000 }),
          (docNumber, timestamp) => {
            const filename = generateUniqueFilename(docNumber, timestamp)
            expect(filename).toContain(timestamp.toString())
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Storage Path Validation', () => {
    it('should reject paths with wrong number of parts', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
          (parts) => {
            const path = parts.join('/')
            expect(isValidStoragePath(path)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject paths with invalid year', () => {
      fc.assert(
        fc.property(
          documentTypeArb,
          fc.string({ minLength: 1, maxLength: 5 }).filter(s => !/^\d{4}$/.test(s)),
          fc.constantFrom('01', '06', '12'),
          fc.string({ minLength: 5, maxLength: 20 }).map(s => s + '.pdf'),
          (docType, invalidYear, month, filename) => {
            const path = `${docType}/${invalidYear}/${month}/${filename}`
            expect(isValidStoragePath(path)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject paths with invalid month', () => {
      fc.assert(
        fc.property(
          documentTypeArb,
          fc.integer({ min: 2020, max: 2030 }).map(String),
          fc.constantFrom('00', '13', '1', '123', 'ab'),
          fc.string({ minLength: 5, maxLength: 20 }).map(s => s + '.pdf'),
          (docType, year, invalidMonth, filename) => {
            const path = `${docType}/${year}/${invalidMonth}/${filename}`
            expect(isValidStoragePath(path)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject paths without .pdf extension', () => {
      fc.assert(
        fc.property(
          documentTypeArb,
          fc.integer({ min: 2020, max: 2030 }).map(String),
          fc.constantFrom('01', '06', '12'),
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => !s.toLowerCase().endsWith('.pdf')),
          (docType, year, month, filename) => {
            const path = `${docType}/${year}/${month}/${filename}`
            expect(isValidStoragePath(path)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
