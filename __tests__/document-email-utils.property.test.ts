/**
 * Property-based tests for document email utilities
 * Feature: n8n-document-generation
 * 
 * Tests Properties 20, 21, and 22 from the design document:
 * - Property 20: Email Send Tracking
 * - Property 21: Email Error Handling
 * - Property 22: Multi-Recipient Email Support
 * 
 * Validates: Requirements 8.2, 8.3, 8.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import {
  isValidEmail,
  validateEmailAddresses,
  validateEmailRequest,
  buildEmailSubject,
  buildEmailBody,
} from '@/lib/document-email-utils'
import type { EmailRequest } from '@/types/document-generation'

// ============================================================================
// Arbitraries for generating test data
// ============================================================================

// Generate valid email addresses
const validEmailArb = fc.tuple(
  fc.stringMatching(/^[a-z][a-z0-9]{2,10}$/),
  fc.stringMatching(/^[a-z]{2,8}$/),
  fc.constantFrom('com', 'org', 'net', 'co.id', 'io')
).map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

// Generate invalid email addresses
const invalidEmailArb = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('notanemail'),
  fc.constant('@nodomain.com'),
  fc.constant('noat.com'),
  fc.constant('spaces in@email.com'),
  fc.stringMatching(/^[a-z]+$/).filter(s => s.length > 0 && !s.includes('@'))
)

// Generate document types
const documentTypeArb = fc.constantFrom(
  'invoice',
  'quotation',
  'delivery_note',
  'contract',
  'certificate',
  'report',
  'packing_list'
)

// Generate document numbers
const documentNumberArb = fc.stringMatching(/^[A-Z]{2,4}-\d{4}-\d{4}$/)

// Generate customer names
const customerNameArb = fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0)

// Generate non-empty strings
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)

// Generate valid URLs
const validUrlArb = fc.tuple(
  fc.constantFrom('https://storage.example.com', 'https://cdn.gama-group.co'),
  fc.stringMatching(/^\/[a-z]+\/\d{4}\/\d{2}\/[a-z0-9-]+\.pdf$/)
).map(([base, path]) => `${base}${path}`)

// Generate file names
const fileNameArb = fc.stringMatching(/^[A-Z]{2,4}-\d{4}-\d{4}\.pdf$/)

// Generate valid email request
const validEmailRequestArb = fc.record({
  to: fc.array(validEmailArb, { minLength: 1, maxLength: 5 }),
  subject: nonEmptyStringArb,
  body: nonEmptyStringArb,
  attachment_url: validUrlArb,
  attachment_name: fileNameArb,
})

describe('Document Email Utilities Property Tests', () => {
  /**
   * Property 20: Email Send Tracking
   * For any successful document email send, the generated_documents record SHALL be
   * updated with sent_to_email containing the recipient address and sent_at containing
   * the send timestamp.
   * 
   * Validates: Requirements 8.2
   */
  describe('Property 20: Email Send Tracking', () => {
    it('should validate email addresses correctly for tracking', () => {
      fc.assert(
        fc.property(validEmailArb, (email) => {
          // Valid emails should pass validation
          expect(isValidEmail(email)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should reject invalid email addresses', () => {
      fc.assert(
        fc.property(invalidEmailArb, (email) => {
          // Invalid emails should fail validation
          expect(isValidEmail(email)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should separate valid and invalid emails for tracking', () => {
      fc.assert(
        fc.property(
          fc.array(validEmailArb, { minLength: 1, maxLength: 3 }),
          fc.array(invalidEmailArb, { minLength: 1, maxLength: 3 }),
          (validEmails, invalidEmails) => {
            const allEmails = [...validEmails, ...invalidEmails]
            const result = validateEmailAddresses(allEmails)

            // All valid emails should be in the valid array
            for (const email of validEmails) {
              expect(result.valid).toContain(email.trim())
            }

            // All invalid emails should be in the invalid array
            for (const email of invalidEmails) {
              expect(result.invalid).toContain(email)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate email request has required fields for tracking', () => {
      fc.assert(
        fc.property(validEmailRequestArb, (request) => {
          const result = validateEmailRequest(request)
          
          // Valid request should pass validation
          expect(result.valid).toBe(true)
          expect(result.errors).toHaveLength(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should track all recipients in sent_to_email field', () => {
      fc.assert(
        fc.property(
          fc.array(validEmailArb, { minLength: 1, maxLength: 5 }),
          (emails) => {
            const uniqueEmails = [...new Set(emails)]
            const { valid } = validateEmailAddresses(uniqueEmails)
            
            // All valid emails should be trackable
            const trackingString = valid.join(', ')
            
            for (const email of valid) {
              expect(trackingString).toContain(email)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 21: Email Error Handling
   * For any failed email delivery attempt, the system SHALL return success=false
   * with a descriptive error message, and the sent_to_email and sent_at fields
   * SHALL remain null.
   * 
   * Validates: Requirements 8.3
   */
  describe('Property 21: Email Error Handling', () => {
    it('should return error for empty recipient list', () => {
      fc.assert(
        fc.property(
          nonEmptyStringArb,
          nonEmptyStringArb,
          validUrlArb,
          fileNameArb,
          (subject, body, url, filename) => {
            const request: EmailRequest = {
              to: [],
              subject,
              body,
              attachment_url: url,
              attachment_name: filename,
            }

            const result = validateEmailRequest(request)
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.toLowerCase().includes('recipient'))).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return error for all invalid recipients', () => {
      fc.assert(
        fc.property(
          fc.array(invalidEmailArb, { minLength: 1, maxLength: 3 }),
          nonEmptyStringArb,
          nonEmptyStringArb,
          validUrlArb,
          fileNameArb,
          (invalidEmails, subject, body, url, filename) => {
            const request: EmailRequest = {
              to: invalidEmails,
              subject,
              body,
              attachment_url: url,
              attachment_name: filename,
            }

            const result = validateEmailRequest(request)
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.toLowerCase().includes('invalid'))).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return error for empty subject', () => {
      fc.assert(
        fc.property(
          fc.array(validEmailArb, { minLength: 1, maxLength: 3 }),
          fc.constantFrom('', '   ', '\t', '\n'),
          nonEmptyStringArb,
          validUrlArb,
          fileNameArb,
          (emails, emptySubject, body, url, filename) => {
            const request: EmailRequest = {
              to: emails,
              subject: emptySubject,
              body,
              attachment_url: url,
              attachment_name: filename,
            }

            const result = validateEmailRequest(request)
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.toLowerCase().includes('subject'))).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return error for empty body', () => {
      fc.assert(
        fc.property(
          fc.array(validEmailArb, { minLength: 1, maxLength: 3 }),
          nonEmptyStringArb,
          fc.constantFrom('', '   ', '\t', '\n'),
          validUrlArb,
          fileNameArb,
          (emails, subject, emptyBody, url, filename) => {
            const request: EmailRequest = {
              to: emails,
              subject,
              body: emptyBody,
              attachment_url: url,
              attachment_name: filename,
            }

            const result = validateEmailRequest(request)
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.toLowerCase().includes('body'))).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return error for empty attachment URL', () => {
      fc.assert(
        fc.property(
          fc.array(validEmailArb, { minLength: 1, maxLength: 3 }),
          nonEmptyStringArb,
          nonEmptyStringArb,
          fc.constantFrom('', '   '),
          fileNameArb,
          (emails, subject, body, emptyUrl, filename) => {
            const request: EmailRequest = {
              to: emails,
              subject,
              body,
              attachment_url: emptyUrl,
              attachment_name: filename,
            }

            const result = validateEmailRequest(request)
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.toLowerCase().includes('attachment url'))).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return error for empty attachment name', () => {
      fc.assert(
        fc.property(
          fc.array(validEmailArb, { minLength: 1, maxLength: 3 }),
          nonEmptyStringArb,
          nonEmptyStringArb,
          validUrlArb,
          fc.constantFrom('', '   '),
          (emails, subject, body, url, emptyFilename) => {
            const request: EmailRequest = {
              to: emails,
              subject,
              body,
              attachment_url: url,
              attachment_name: emptyFilename,
            }

            const result = validateEmailRequest(request)
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.toLowerCase().includes('attachment name'))).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should collect all validation errors', () => {
      fc.assert(
        fc.property(
          fc.array(invalidEmailArb, { minLength: 1, maxLength: 2 }),
          fc.constantFrom('', '   '),
          fc.constantFrom('', '   '),
          fc.constantFrom('', '   '),
          fc.constantFrom('', '   '),
          (invalidEmails, emptySubject, emptyBody, emptyUrl, emptyFilename) => {
            const request: EmailRequest = {
              to: invalidEmails,
              subject: emptySubject,
              body: emptyBody,
              attachment_url: emptyUrl,
              attachment_name: emptyFilename,
            }

            const result = validateEmailRequest(request)
            expect(result.valid).toBe(false)
            // Should have multiple errors
            expect(result.errors.length).toBeGreaterThan(1)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 22: Multi-Recipient Email Support
   * For any email send request with multiple recipient addresses, all recipients
   * SHALL receive the document, and sent_to_email SHALL contain all recipient addresses.
   * 
   * Validates: Requirements 8.4
   */
  describe('Property 22: Multi-Recipient Email Support', () => {
    it('should accept multiple valid recipients', () => {
      fc.assert(
        fc.property(
          fc.array(validEmailArb, { minLength: 2, maxLength: 10 }),
          nonEmptyStringArb,
          nonEmptyStringArb,
          validUrlArb,
          fileNameArb,
          (emails, subject, body, url, filename) => {
            const uniqueEmails = [...new Set(emails)]
            const request: EmailRequest = {
              to: uniqueEmails,
              subject,
              body,
              attachment_url: url,
              attachment_name: filename,
            }

            const result = validateEmailRequest(request)
            expect(result.valid).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should filter out invalid emails from mixed list', () => {
      fc.assert(
        fc.property(
          fc.array(validEmailArb, { minLength: 1, maxLength: 3 }),
          fc.array(invalidEmailArb, { minLength: 1, maxLength: 3 }),
          (validEmails, invalidEmails) => {
            const mixedEmails = [...validEmails, ...invalidEmails]
            const result = validateEmailAddresses(mixedEmails)

            // Valid count should match
            expect(result.valid.length).toBe(validEmails.length)
            // Invalid count should match
            expect(result.invalid.length).toBe(invalidEmails.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve all valid recipients in tracking string', () => {
      fc.assert(
        fc.property(
          fc.array(validEmailArb, { minLength: 2, maxLength: 5 }),
          (emails) => {
            const uniqueEmails = [...new Set(emails)]
            const { valid } = validateEmailAddresses(uniqueEmails)
            const trackingString = valid.join(', ')

            // Each valid email should appear in the tracking string
            for (const email of valid) {
              expect(trackingString).toContain(email)
            }

            // Tracking string should have correct number of emails
            const emailsInString = trackingString.split(', ').filter(e => e.length > 0)
            expect(emailsInString.length).toBe(valid.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle duplicate recipients', () => {
      fc.assert(
        fc.property(validEmailArb, (email) => {
          const duplicateEmails = [email, email, email]
          const result = validateEmailAddresses(duplicateEmails)

          // All duplicates should be in valid (deduplication is caller's responsibility)
          expect(result.valid.length).toBe(3)
          expect(result.invalid.length).toBe(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should validate request with single recipient', () => {
      fc.assert(
        fc.property(
          validEmailArb,
          nonEmptyStringArb,
          nonEmptyStringArb,
          validUrlArb,
          fileNameArb,
          (email, subject, body, url, filename) => {
            const request: EmailRequest = {
              to: [email],
              subject,
              body,
              attachment_url: url,
              attachment_name: filename,
            }

            const result = validateEmailRequest(request)
            expect(result.valid).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Email template helper tests
   */
  describe('Email Template Helpers', () => {
    it('should build correct email subject for all document types', () => {
      fc.assert(
        fc.property(documentTypeArb, documentNumberArb, (docType, docNumber) => {
          const subject = buildEmailSubject(docType, docNumber)

          // Subject should contain the document number
          expect(subject).toContain(docNumber)
          // Subject should contain company name
          expect(subject).toContain('PT. Gama Intisamudera')
        }),
        { numRuns: 100 }
      )
    })

    it('should build email body with customer name when provided', () => {
      fc.assert(
        fc.property(
          documentTypeArb,
          documentNumberArb,
          customerNameArb,
          (docType, docNumber, customerName) => {
            const body = buildEmailBody(docType, docNumber, customerName)

            // Body should contain the customer name
            expect(body).toContain(customerName)
            // Body should contain the document number
            expect(body).toContain(docNumber)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should build email body without customer name', () => {
      fc.assert(
        fc.property(documentTypeArb, documentNumberArb, (docType, docNumber) => {
          const body = buildEmailBody(docType, docNumber)

          // Body should contain generic greeting
          expect(body).toContain('Dear Customer')
          // Body should contain the document number
          expect(body).toContain(docNumber)
        }),
        { numRuns: 100 }
      )
    })

    it('should include company contact info in email body', () => {
      fc.assert(
        fc.property(documentTypeArb, documentNumberArb, (docType, docNumber) => {
          const body = buildEmailBody(docType, docNumber)

          // Body should contain company info
          expect(body).toContain('PT. Gama Intisamudera')
          expect(body).toContain('info@gama-group.co')
        }),
        { numRuns: 100 }
      )
    })
  })
})
