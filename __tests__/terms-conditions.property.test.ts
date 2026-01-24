/**
 * Feature: v0.85-terms-conditions
 * Property 1: Version comparison consistency
 * 
 * Property-based tests for hasAcceptedCurrentTerms function
 * using fast-check library.
 * 
 * **Validates: Requirements 2.4, 5.2, 5.3, 5.4**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { hasAcceptedCurrentTerms, TERMS_VERSION, TERMS_CONTENT } from '@/lib/terms-conditions'

// =====================================================
// Arbitraries for Property Tests
// =====================================================

/**
 * Generate valid ISO timestamp strings
 * Using integer-based approach to avoid Invalid Date issues
 */
const validTimestampArbitrary = fc.integer({
  min: new Date('2020-01-01T00:00:00.000Z').getTime(),
  max: new Date('2030-12-31T23:59:59.999Z').getTime(),
}).map(timestamp => new Date(timestamp).toISOString())

/**
 * Generate random version strings (semver-like)
 */
const versionArbitrary = fc.tuple(
  fc.integer({ min: 0, max: 99 }),
  fc.integer({ min: 0, max: 99 }),
  fc.integer({ min: 0, max: 99 })
).map(([major, minor, patch]) => `${major}.${minor}.${patch}`)

/**
 * Generate version strings that are NOT equal to TERMS_VERSION
 */
const nonMatchingVersionArbitrary = versionArbitrary.filter(
  version => version !== TERMS_VERSION
)

/**
 * Generate random non-empty strings for version
 */
const randomStringVersionArbitrary = fc.string({ minLength: 1, maxLength: 20 }).filter(
  s => s !== TERMS_VERSION && s.trim().length > 0
)

// =====================================================
// Property 1: Version Comparison Consistency
// **Validates: Requirements 2.4, 5.2, 5.3, 5.4**
// =====================================================
describe('Feature: v0.85-terms-conditions, Property 1: Version comparison consistency', () => {
  /**
   * For any user profile with tc_version and tc_accepted_at values, 
   * the hasAcceptedCurrentTerms function SHALL return true if and only if 
   * tc_version equals the current TERMS_VERSION and tc_accepted_at is not null.
   */

  /**
   * Property: Returns true ONLY when tc_version === TERMS_VERSION AND tc_accepted_at is not null
   * 
   * **Validates: Requirements 5.2**
   * IF the user's tc_version matches the current TERMS_VERSION, THEN the T&C_Modal SHALL NOT be displayed
   */
  it('returns true when tc_version equals TERMS_VERSION and tc_accepted_at is not null', () => {
    fc.assert(
      fc.property(
        validTimestampArbitrary,
        (timestamp) => {
          const result = hasAcceptedCurrentTerms(timestamp, TERMS_VERSION)
          return result === true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Returns false when tc_accepted_at is null (regardless of version)
   * 
   * **Validates: Requirements 5.4**
   * IF the user's tc_accepted_at is NULL, THEN the T&C_Modal SHALL be displayed
   */
  it('returns false when tc_accepted_at is null regardless of version', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(TERMS_VERSION),
          versionArbitrary,
          randomStringVersionArbitrary,
          fc.constant(null)
        ),
        (version) => {
          const result = hasAcceptedCurrentTerms(null, version)
          return result === false
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Returns false when tc_version is null (regardless of timestamp)
   * 
   * **Validates: Requirements 5.4**
   * IF the user's tc_accepted_at is NULL, THEN the T&C_Modal SHALL be displayed
   * (This also applies when tc_version is null - user hasn't accepted any version)
   */
  it('returns false when tc_version is null regardless of timestamp', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          validTimestampArbitrary,
          fc.constant(null)
        ),
        (timestamp) => {
          const result = hasAcceptedCurrentTerms(timestamp, null)
          return result === false
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Returns false when tc_version !== TERMS_VERSION (even with valid timestamp)
   * 
   * **Validates: Requirements 2.4, 5.3**
   * WHEN TERMS_VERSION is updated, THEN all users SHALL be required to re-accept the new terms
   * IF the user's tc_version does not match the current TERMS_VERSION, THEN the T&C_Modal SHALL be displayed
   */
  it('returns false when tc_version does not match TERMS_VERSION even with valid timestamp', () => {
    fc.assert(
      fc.property(
        validTimestampArbitrary,
        nonMatchingVersionArbitrary,
        (timestamp, version) => {
          const result = hasAcceptedCurrentTerms(timestamp, version)
          return result === false
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Returns false when both tc_accepted_at and tc_version are null
   * 
   * **Validates: Requirements 5.4**
   * New users with no acceptance record should see the modal
   */
  it('returns false when both tc_accepted_at and tc_version are null', () => {
    const result = hasAcceptedCurrentTerms(null, null)
    expect(result).toBe(false)
  })

  /**
   * Property: The function is deterministic - same inputs always produce same output
   */
  it('is deterministic - same inputs always produce same output', () => {
    fc.assert(
      fc.property(
        fc.oneof(validTimestampArbitrary, fc.constant(null)),
        fc.oneof(versionArbitrary, fc.constant(null)),
        (timestamp, version) => {
          const result1 = hasAcceptedCurrentTerms(timestamp, version)
          const result2 = hasAcceptedCurrentTerms(timestamp, version)
          return result1 === result2
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Version comparison is exact (case-sensitive, no trimming)
   * 
   * **Validates: Requirements 2.4**
   * Version must match exactly for acceptance to be valid
   */
  it('version comparison is exact - no case insensitivity or trimming', () => {
    fc.assert(
      fc.property(
        validTimestampArbitrary,
        (timestamp) => {
          // Test variations of TERMS_VERSION that should NOT match
          const variations = [
            TERMS_VERSION.toUpperCase(),
            TERMS_VERSION.toLowerCase(),
            ` ${TERMS_VERSION}`,
            `${TERMS_VERSION} `,
            ` ${TERMS_VERSION} `,
            `v${TERMS_VERSION}`,
            TERMS_VERSION.replace('.', ','),
          ].filter(v => v !== TERMS_VERSION) // Only test if actually different
          
          for (const variation of variations) {
            if (hasAcceptedCurrentTerms(timestamp, variation)) {
              return false // Should not match variations
            }
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Empty string timestamp is treated as falsy (returns false)
   */
  it('returns false when tc_accepted_at is empty string', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(TERMS_VERSION),
          versionArbitrary
        ),
        (version) => {
          const result = hasAcceptedCurrentTerms('', version)
          return result === false
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Empty string version is treated as falsy (returns false)
   */
  it('returns false when tc_version is empty string', () => {
    fc.assert(
      fc.property(
        validTimestampArbitrary,
        (timestamp) => {
          const result = hasAcceptedCurrentTerms(timestamp, '')
          return result === false
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Function returns boolean type for any input combination
   */
  it('always returns a boolean value', () => {
    fc.assert(
      fc.property(
        fc.oneof(validTimestampArbitrary, fc.constant(null), fc.constant('')),
        fc.oneof(versionArbitrary, fc.constant(null), fc.constant(''), fc.constant(TERMS_VERSION)),
        (timestamp, version) => {
          const result = hasAcceptedCurrentTerms(timestamp, version)
          return typeof result === 'boolean'
        }
      ),
      { numRuns: 100 }
    )
  })
})

// =====================================================
// Unit Tests for hasAcceptedCurrentTerms
// =====================================================
describe('Feature: v0.85-terms-conditions, hasAcceptedCurrentTerms Unit Tests', () => {
  /**
   * Verify specific examples that demonstrate correct behavior
   */

  it('returns true for valid acceptance with current version', () => {
    const result = hasAcceptedCurrentTerms('2026-01-25T10:00:00.000Z', TERMS_VERSION)
    expect(result).toBe(true)
  })

  it('returns false for null timestamp with current version', () => {
    const result = hasAcceptedCurrentTerms(null, TERMS_VERSION)
    expect(result).toBe(false)
  })

  it('returns false for valid timestamp with null version', () => {
    const result = hasAcceptedCurrentTerms('2026-01-25T10:00:00.000Z', null)
    expect(result).toBe(false)
  })

  it('returns false for null timestamp and null version', () => {
    const result = hasAcceptedCurrentTerms(null, null)
    expect(result).toBe(false)
  })

  it('returns false for outdated version with valid timestamp', () => {
    const result = hasAcceptedCurrentTerms('2026-01-25T10:00:00.000Z', '0.9.0')
    expect(result).toBe(false)
  })

  it('returns false for future version with valid timestamp', () => {
    const result = hasAcceptedCurrentTerms('2026-01-25T10:00:00.000Z', '2.0.0')
    expect(result).toBe(false)
  })

  it('returns false for empty string timestamp', () => {
    const result = hasAcceptedCurrentTerms('', TERMS_VERSION)
    expect(result).toBe(false)
  })

  it('returns false for empty string version', () => {
    const result = hasAcceptedCurrentTerms('2026-01-25T10:00:00.000Z', '')
    expect(result).toBe(false)
  })

  it('returns false for both empty strings', () => {
    const result = hasAcceptedCurrentTerms('', '')
    expect(result).toBe(false)
  })

  it('TERMS_VERSION is defined and is a valid semver string', () => {
    expect(TERMS_VERSION).toBeDefined()
    expect(typeof TERMS_VERSION).toBe('string')
    expect(TERMS_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('current TERMS_VERSION is 1.0.0', () => {
    expect(TERMS_VERSION).toBe('1.0.0')
  })
})


// =====================================================
// Property 3: Terms Content Contains All Required Sections
// **Validates: Requirements 2.2, 2.3**
// =====================================================
describe('Feature: v0.85-terms-conditions, Property 3: Terms content contains all required sections', () => {
  /**
   * For any version of TERMS_CONTENT, the content SHALL contain all 10 required 
   * section headers: Acceptance of Terms, Authorized Use, User Responsibilities, 
   * Data Handling, Prohibited Actions, System Availability, Monitoring, 
   * Termination, Updates to Terms, and Contact.
   * 
   * **Validates: Requirements 2.2, 2.3**
   */

  /**
   * Required sections in Indonesian (as defined in requirements)
   * Each section maps to the English requirement name
   */
  const REQUIRED_SECTIONS = [
    { indonesian: 'Penerimaan Syarat dan Ketentuan', english: 'Acceptance of Terms' },
    { indonesian: 'Penggunaan yang Diizinkan', english: 'Authorized Use' },
    { indonesian: 'Tanggung Jawab Pengguna', english: 'User Responsibilities' },
    { indonesian: 'Penanganan Data', english: 'Data Handling' },
    { indonesian: 'Tindakan yang Dilarang', english: 'Prohibited Actions' },
    { indonesian: 'Ketersediaan Sistem', english: 'System Availability' },
    { indonesian: 'Pemantauan dan Keamanan', english: 'Monitoring' },
    { indonesian: 'Penghentian Akses', english: 'Termination' },
    { indonesian: 'Pembaruan Syarat dan Ketentuan', english: 'Updates to Terms' },
    { indonesian: 'Kontak', english: 'Contact' },
  ] as const

  /**
   * Test: TERMS_CONTENT is defined and is a non-empty string
   * 
   * **Validates: Requirements 2.2**
   * THE T&C_System SHALL define TERMS_CONTENT as markdown text containing all required sections
   */
  it('TERMS_CONTENT is defined and is a non-empty string', () => {
    expect(TERMS_CONTENT).toBeDefined()
    expect(typeof TERMS_CONTENT).toBe('string')
    expect(TERMS_CONTENT.length).toBeGreaterThan(0)
  })

  /**
   * Test: TERMS_CONTENT contains exactly 10 required sections
   * 
   * **Validates: Requirements 2.3**
   * THE TERMS_CONTENT SHALL include sections for all 10 required topics
   */
  it('contains exactly 10 required sections', () => {
    expect(REQUIRED_SECTIONS).toHaveLength(10)
    
    // Verify each section exists in the content
    const missingSections: string[] = []
    for (const section of REQUIRED_SECTIONS) {
      if (!TERMS_CONTENT.includes(section.indonesian)) {
        missingSections.push(`${section.english} (${section.indonesian})`)
      }
    }
    
    expect(missingSections).toEqual([])
  })

  /**
   * Test: Section 1 - Acceptance of Terms (Penerimaan Syarat dan Ketentuan)
   * 
   * **Validates: Requirements 2.3**
   */
  it('contains section: Acceptance of Terms (Penerimaan Syarat dan Ketentuan)', () => {
    expect(TERMS_CONTENT).toContain('Penerimaan Syarat dan Ketentuan')
  })

  /**
   * Test: Section 2 - Authorized Use (Penggunaan yang Diizinkan)
   * 
   * **Validates: Requirements 2.3**
   */
  it('contains section: Authorized Use (Penggunaan yang Diizinkan)', () => {
    expect(TERMS_CONTENT).toContain('Penggunaan yang Diizinkan')
  })

  /**
   * Test: Section 3 - User Responsibilities (Tanggung Jawab Pengguna)
   * 
   * **Validates: Requirements 2.3**
   */
  it('contains section: User Responsibilities (Tanggung Jawab Pengguna)', () => {
    expect(TERMS_CONTENT).toContain('Tanggung Jawab Pengguna')
  })

  /**
   * Test: Section 4 - Data Handling (Penanganan Data)
   * 
   * **Validates: Requirements 2.3**
   */
  it('contains section: Data Handling (Penanganan Data)', () => {
    expect(TERMS_CONTENT).toContain('Penanganan Data')
  })

  /**
   * Test: Section 5 - Prohibited Actions (Tindakan yang Dilarang)
   * 
   * **Validates: Requirements 2.3**
   */
  it('contains section: Prohibited Actions (Tindakan yang Dilarang)', () => {
    expect(TERMS_CONTENT).toContain('Tindakan yang Dilarang')
  })

  /**
   * Test: Section 6 - System Availability (Ketersediaan Sistem)
   * 
   * **Validates: Requirements 2.3**
   */
  it('contains section: System Availability (Ketersediaan Sistem)', () => {
    expect(TERMS_CONTENT).toContain('Ketersediaan Sistem')
  })

  /**
   * Test: Section 7 - Monitoring (Pemantauan dan Keamanan)
   * 
   * **Validates: Requirements 2.3**
   */
  it('contains section: Monitoring (Pemantauan dan Keamanan)', () => {
    expect(TERMS_CONTENT).toContain('Pemantauan dan Keamanan')
  })

  /**
   * Test: Section 8 - Termination (Penghentian Akses)
   * 
   * **Validates: Requirements 2.3**
   */
  it('contains section: Termination (Penghentian Akses)', () => {
    expect(TERMS_CONTENT).toContain('Penghentian Akses')
  })

  /**
   * Test: Section 9 - Updates to Terms (Pembaruan Syarat dan Ketentuan)
   * 
   * **Validates: Requirements 2.3**
   */
  it('contains section: Updates to Terms (Pembaruan Syarat dan Ketentuan)', () => {
    expect(TERMS_CONTENT).toContain('Pembaruan Syarat dan Ketentuan')
  })

  /**
   * Test: Section 10 - Contact (Kontak)
   * 
   * **Validates: Requirements 2.3**
   */
  it('contains section: Contact (Kontak)', () => {
    expect(TERMS_CONTENT).toContain('Kontak')
  })

  /**
   * Test: Sections are formatted as markdown headers
   * 
   * **Validates: Requirements 2.2**
   * THE T&C_System SHALL define TERMS_CONTENT as markdown text
   */
  it('sections are formatted as markdown headers (## prefix)', () => {
    // Each section should be a level 2 header (## )
    const sectionHeaders = [
      '## 1. Penerimaan Syarat dan Ketentuan',
      '## 2. Penggunaan yang Diizinkan',
      '## 3. Tanggung Jawab Pengguna',
      '## 4. Penanganan Data',
      '## 5. Tindakan yang Dilarang',
      '## 6. Ketersediaan Sistem',
      '## 7. Pemantauan dan Keamanan',
      '## 8. Penghentian Akses',
      '## 9. Pembaruan Syarat dan Ketentuan',
      '## 10. Kontak',
    ]

    for (const header of sectionHeaders) {
      expect(TERMS_CONTENT).toContain(header)
    }
  })

  /**
   * Test: TERMS_CONTENT includes version information
   * 
   * **Validates: Requirements 2.2**
   */
  it('includes version information in the content', () => {
    // The content should reference the version
    expect(TERMS_CONTENT).toMatch(/Versi \d+\.\d+\.\d+/)
  })

  /**
   * Test: TERMS_CONTENT is valid markdown (has title header)
   * 
   * **Validates: Requirements 2.2**
   */
  it('is valid markdown with a title header', () => {
    // Should start with a level 1 header
    expect(TERMS_CONTENT).toMatch(/^# .+/)
  })

  /**
   * Test: TERMS_CONTENT includes company name
   * 
   * **Validates: Requirements 2.2**
   */
  it('includes company name (PT. Gama Intisamudera)', () => {
    expect(TERMS_CONTENT).toContain('PT. Gama Intisamudera')
  })

  /**
   * Test: Sections appear in correct order (1-10)
   * 
   * **Validates: Requirements 2.3**
   */
  it('sections appear in correct numerical order (1-10)', () => {
    const sectionPositions = REQUIRED_SECTIONS.map((section, index) => {
      const position = TERMS_CONTENT.indexOf(section.indonesian)
      return { section: section.indonesian, index: index + 1, position }
    })

    // Verify all sections are found
    for (const sp of sectionPositions) {
      expect(sp.position).toBeGreaterThan(-1)
    }

    // Verify sections appear in order
    for (let i = 0; i < sectionPositions.length - 1; i++) {
      expect(sectionPositions[i].position).toBeLessThan(sectionPositions[i + 1].position)
    }
  })
})
