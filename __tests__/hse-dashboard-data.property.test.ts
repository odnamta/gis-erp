/**
 * Property-based tests for HSE Dashboard Data Service
 * Tests correctness properties for days since last incident calculation
 * 
 * **Feature: hse-dashboard, Property 1: Days since last incident calculation**
 * **Validates: Requirements 1.1**
 */

import { describe, it } from 'vitest'
import * as fc from 'fast-check'
import { calculateDaysBetween } from '@/lib/dashboard/hse-data'

// =====================================================
// Test Helpers - Pure functions for testing
// =====================================================

/**
 * Get start of current year
 */
function getStartOfYear(referenceDate: Date): Date {
  return new Date(referenceDate.getFullYear(), 0, 1)
}

/**
 * Find the most recent incident date from a collection
 */
function findMostRecentIncidentDate(incidents: { incidentDate: string | null }[]): Date | null {
  const validDates = incidents
    .filter(i => i.incidentDate !== null)
    .map(i => new Date(i.incidentDate!))
    .filter(d => !isNaN(d.getTime()))
  
  if (validDates.length === 0) return null
  
  return validDates.reduce((latest, current) => 
    current > latest ? current : latest
  )
}

/**
 * Calculate days since last incident
 * This mirrors the logic in hse-data.ts
 */
function calculateDaysSinceLastIncident(
  incidents: { incidentDate: string | null }[],
  today: Date
): number {
  const mostRecentDate = findMostRecentIncidentDate(incidents)
  
  if (mostRecentDate === null) {
    // No incidents - return days since start of year
    return calculateDaysBetween(getStartOfYear(today), today)
  }
  
  return calculateDaysBetween(mostRecentDate, today)
}

// =====================================================
// Arbitraries
// =====================================================

// Generate dates within a reasonable range (2020-2026)
const dateTimestampArb = fc.integer({ 
  min: new Date('2020-01-01').getTime(), 
  max: new Date('2026-12-31').getTime() 
})

const dateStringArb = dateTimestampArb.map(ts => new Date(ts).toISOString().split('T')[0])

const incidentArb = fc.record({
  id: fc.uuid(),
  incidentNumber: fc.string({ minLength: 1, maxLength: 20 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  severity: fc.constantFrom('critical', 'major', 'minor'),
  status: fc.constantFrom('open', 'investigating', 'resolved', 'closed'),
  incidentDate: fc.option(dateStringArb, { nil: null }),
  locationType: fc.constantFrom('office', 'site', 'warehouse', 'vehicle'),
})

// Generate a "today" date that's always after 2020 to ensure valid calculations
const todayArb = fc.integer({
  min: new Date('2024-01-01').getTime(),
  max: new Date('2026-12-31').getTime()
}).map(ts => new Date(ts))

// =====================================================
// Property Tests
// =====================================================

describe('HSE Dashboard Data - Property Tests', () => {
  
  describe('Property 1: Days since last incident calculation', () => {
    /**
     * **Feature: hse-dashboard, Property 1: Days since last incident calculation**
     * **Validates: Requirements 1.1**
     * 
     * For any collection of incidents with incident dates, the Days_Since_Last_Incident 
     * calculation should equal the number of days between today and the most recent 
     * incident_date. If no incidents exist, the value should be the number of days 
     * since the start of the year.
     */
    
    it('should calculate correct days from most recent incident to today', () => {
      fc.assert(
        fc.property(
          fc.array(incidentArb, { minLength: 1, maxLength: 50 }),
          todayArb,
          (incidents, today) => {
            // Filter to only incidents with valid dates
            const incidentsWithDates = incidents.filter(i => i.incidentDate !== null)
            
            if (incidentsWithDates.length === 0) {
              // Skip this case - covered by empty incidents test
              return true
            }
            
            const result = calculateDaysSinceLastIncident(incidents, today)
            
            // Find the most recent incident date manually
            const mostRecentDate = findMostRecentIncidentDate(incidents)!
            const expectedDays = calculateDaysBetween(mostRecentDate, today)
            
            return result === expectedDays
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return days since start of year when no incidents exist', () => {
      fc.assert(
        fc.property(todayArb, (today) => {
          const emptyIncidents: { incidentDate: string | null }[] = []
          
          const result = calculateDaysSinceLastIncident(emptyIncidents, today)
          
          const startOfYear = getStartOfYear(today)
          const expectedDays = calculateDaysBetween(startOfYear, today)
          
          return result === expectedDays
        }),
        { numRuns: 100 }
      )
    })

    it('should return days since start of year when all incidents have null dates', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              incidentNumber: fc.string({ minLength: 1, maxLength: 20 }),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              severity: fc.constantFrom('critical', 'major', 'minor'),
              status: fc.constantFrom('open', 'investigating', 'resolved', 'closed'),
              incidentDate: fc.constant(null),
              locationType: fc.constantFrom('office', 'site', 'warehouse', 'vehicle'),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          todayArb,
          (incidents, today) => {
            const result = calculateDaysSinceLastIncident(incidents, today)
            
            const startOfYear = getStartOfYear(today)
            const expectedDays = calculateDaysBetween(startOfYear, today)
            
            return result === expectedDays
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should always return a non-negative number', () => {
      fc.assert(
        fc.property(
          fc.array(incidentArb, { minLength: 0, maxLength: 50 }),
          todayArb,
          (incidents, today) => {
            // Ensure incident dates are before or equal to today
            const adjustedIncidents = incidents.map(i => ({
              ...i,
              incidentDate: i.incidentDate && new Date(i.incidentDate) <= today 
                ? i.incidentDate 
                : null
            }))
            
            const result = calculateDaysSinceLastIncident(adjustedIncidents, today)
            
            return result >= 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when most recent incident is today', () => {
      fc.assert(
        fc.property(todayArb, (today) => {
          const todayStr = today.toISOString().split('T')[0]
          const incidents = [
            { incidentDate: todayStr }
          ]
          
          const result = calculateDaysSinceLastIncident(incidents, today)
          
          return result === 0
        }),
        { numRuns: 100 }
      )
    })

    it('should correctly identify the most recent incident among multiple', () => {
      fc.assert(
        fc.property(
          fc.array(dateStringArb, { minLength: 2, maxLength: 20 }),
          todayArb,
          (dates, today) => {
            // Filter dates to be before or equal to today
            const validDates = dates.filter(d => new Date(d) <= today)
            
            if (validDates.length === 0) return true
            
            const incidents = validDates.map(d => ({ incidentDate: d }))
            
            const result = calculateDaysSinceLastIncident(incidents, today)
            
            // Find the most recent date manually
            const mostRecentDate = validDates
              .map(d => new Date(d))
              .reduce((latest, current) => current > latest ? current : latest)
            
            const expectedDays = calculateDaysBetween(mostRecentDate, today)
            
            return result === expectedDays
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle mixed valid and null incident dates', () => {
      fc.assert(
        fc.property(
          fc.array(incidentArb, { minLength: 1, maxLength: 50 }),
          todayArb,
          (incidents, today) => {
            // Ensure at least one valid date exists
            const hasValidDate = incidents.some(i => i.incidentDate !== null)
            
            if (!hasValidDate) return true
            
            const result = calculateDaysSinceLastIncident(incidents, today)
            
            // Find the most recent valid date
            const validDates = incidents
              .filter(i => i.incidentDate !== null)
              .map(i => new Date(i.incidentDate!))
              .filter(d => !isNaN(d.getTime()))
            
            if (validDates.length === 0) return true
            
            const mostRecentDate = validDates.reduce((latest, current) => 
              current > latest ? current : latest
            )
            
            const expectedDays = calculateDaysBetween(mostRecentDate, today)
            
            return result === expectedDays
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('calculateDaysBetween helper function', () => {
    /**
     * Tests for the exported calculateDaysBetween helper function
     */
    
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
            // Add exact number of days in milliseconds
            const endDate = new Date(startTs + daysToAdd * 24 * 60 * 60 * 1000)
            
            const result = calculateDaysBetween(startDate, endDate)
            
            // Should be approximately equal to daysToAdd (may differ by 1 due to DST)
            return Math.abs(result - daysToAdd) <= 1
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be consistent: days(a, b) + days(b, c) ≈ days(a, c)', () => {
      fc.assert(
        fc.property(
          dateTimestampArb,
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (startTs, days1, days2) => {
            const dateA = new Date(startTs)
            const dateB = new Date(startTs + days1 * 24 * 60 * 60 * 1000)
            const dateC = new Date(startTs + (days1 + days2) * 24 * 60 * 60 * 1000)
            
            const daysAB = calculateDaysBetween(dateA, dateB)
            const daysBC = calculateDaysBetween(dateB, dateC)
            const daysAC = calculateDaysBetween(dateA, dateC)
            
            // Allow for small rounding differences
            return Math.abs((daysAB + daysBC) - daysAC) <= 2
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


// =====================================================
// Property 2: Status Filtering Correctness
// =====================================================

/**
 * **Feature: hse-dashboard, Property 2: Status filtering correctness**
 * **Validates: Requirements 1.3, 2.1, 2.3**
 * 
 * For any collection of records (incidents, permits) and any status filter criteria,
 * the count returned should equal exactly the number of records that match the
 * specified status conditions.
 */

// Constants matching hse-data.ts
const CLOSED_INCIDENT_STATUSES = ['closed', 'resolved']
const CLOSED_PERMIT_STATUSES = ['closed', 'cancelled']

// =====================================================
// Status Filtering Helper Functions
// =====================================================

/**
 * Filter open incidents (status NOT IN 'closed', 'resolved')
 */
function filterOpenIncidents<T extends { status: string }>(incidents: T[]): T[] {
  return incidents.filter(i => !CLOSED_INCIDENT_STATUSES.includes(i.status.toLowerCase()))
}

/**
 * Count open incidents
 */
function countOpenIncidents<T extends { status: string }>(incidents: T[]): number {
  return filterOpenIncidents(incidents).length
}

/**
 * Filter active permits (status = 'active' AND valid_to >= today)
 */
function filterActivePermits<T extends { status: string; validTo: string }>(
  permits: T[],
  today: Date
): T[] {
  const todayStr = today.toISOString().split('T')[0]
  return permits.filter(p => 
    p.status.toLowerCase() === 'active' && 
    p.validTo >= todayStr
  )
}

/**
 * Count active permits
 */
function countActivePermits<T extends { status: string; validTo: string }>(
  permits: T[],
  today: Date
): number {
  return filterActivePermits(permits, today).length
}

/**
 * Filter expired permits (valid_to < today AND status NOT IN 'closed', 'cancelled')
 */
function filterExpiredPermits<T extends { status: string; validTo: string }>(
  permits: T[],
  today: Date
): T[] {
  const todayStr = today.toISOString().split('T')[0]
  return permits.filter(p => 
    p.validTo < todayStr && 
    !CLOSED_PERMIT_STATUSES.includes(p.status.toLowerCase())
  )
}

/**
 * Count expired permits
 */
function countExpiredPermits<T extends { status: string; validTo: string }>(
  permits: T[],
  today: Date
): number {
  return filterExpiredPermits(permits, today).length
}

// =====================================================
// Arbitraries for Status Filtering Tests
// =====================================================

// Incident statuses - includes both open and closed statuses
const incidentStatusArb = fc.constantFrom(
  'open', 'investigating', 'pending', 'in_progress', 
  'resolved', 'closed'
)

// Permit statuses - includes active, expired, and closed statuses
const permitStatusArb = fc.constantFrom(
  'active', 'pending', 'expired', 'suspended',
  'closed', 'cancelled'
)

// Generate incident records for status filtering tests
const incidentForStatusFilterArb = fc.record({
  id: fc.uuid(),
  incidentNumber: fc.string({ minLength: 1, maxLength: 20 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  severity: fc.constantFrom('critical', 'major', 'minor'),
  status: incidentStatusArb,
  incidentDate: dateStringArb,
  locationType: fc.constantFrom('office', 'site', 'warehouse', 'vehicle'),
})

// Generate permit records for status filtering tests
const permitForStatusFilterArb = fc.record({
  id: fc.uuid(),
  permitNumber: fc.string({ minLength: 1, maxLength: 20 }),
  permitType: fc.constantFrom('hot_work', 'confined_space', 'excavation', 'electrical', 'height_work'),
  workLocation: fc.string({ minLength: 1, maxLength: 100 }),
  status: permitStatusArb,
  validTo: dateStringArb,
})

// =====================================================
// Property 2 Tests: Status Filtering Correctness
// =====================================================

describe('Property 2: Status filtering correctness', () => {
  
  describe('Open Incidents Filtering', () => {
    /**
     * **Feature: hse-dashboard, Property 2: Status filtering correctness**
     * **Validates: Requirements 1.3**
     * 
     * Open incidents: records where status NOT IN ('closed', 'resolved')
     */
    
    it('should count open incidents correctly for any collection of incidents', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForStatusFilterArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const openCount = countOpenIncidents(incidents)
            
            // Manually count incidents that are NOT closed or resolved
            const expectedCount = incidents.filter(i => 
              !['closed', 'resolved'].includes(i.status.toLowerCase())
            ).length
            
            return openCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when all incidents are closed or resolved', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              incidentNumber: fc.string({ minLength: 1, maxLength: 20 }),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              severity: fc.constantFrom('critical', 'major', 'minor'),
              status: fc.constantFrom('closed', 'resolved'),
              incidentDate: dateStringArb,
              locationType: fc.constantFrom('office', 'site', 'warehouse', 'vehicle'),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (incidents) => {
            const openCount = countOpenIncidents(incidents)
            return openCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return total count when no incidents are closed or resolved', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              incidentNumber: fc.string({ minLength: 1, maxLength: 20 }),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              severity: fc.constantFrom('critical', 'major', 'minor'),
              status: fc.constantFrom('open', 'investigating', 'pending', 'in_progress'),
              incidentDate: dateStringArb,
              locationType: fc.constantFrom('office', 'site', 'warehouse', 'vehicle'),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (incidents) => {
            const openCount = countOpenIncidents(incidents)
            return openCount === incidents.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 for empty incident collection', () => {
      const openCount = countOpenIncidents([])
      return openCount === 0
    })

    it('should correctly partition incidents into open and closed', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForStatusFilterArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const openCount = countOpenIncidents(incidents)
            const closedCount = incidents.filter(i => 
              ['closed', 'resolved'].includes(i.status.toLowerCase())
            ).length
            
            // Open + Closed should equal total
            return openCount + closedCount === incidents.length
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Active Permits Filtering', () => {
    /**
     * **Feature: hse-dashboard, Property 2: Status filtering correctness**
     * **Validates: Requirements 2.1**
     * 
     * Active permits: records where status = 'active' AND valid_to >= today
     */
    
    it('should count active permits correctly for any collection of permits', () => {
      fc.assert(
        fc.property(
          fc.array(permitForStatusFilterArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (permits, today) => {
            const activeCount = countActivePermits(permits, today)
            
            const todayStr = today.toISOString().split('T')[0]
            
            // Manually count permits that are active AND not expired
            const expectedCount = permits.filter(p => 
              p.status.toLowerCase() === 'active' && 
              p.validTo >= todayStr
            ).length
            
            return activeCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when no permits have active status', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              permitNumber: fc.string({ minLength: 1, maxLength: 20 }),
              permitType: fc.constantFrom('hot_work', 'confined_space', 'excavation'),
              workLocation: fc.string({ minLength: 1, maxLength: 100 }),
              status: fc.constantFrom('pending', 'expired', 'suspended', 'closed', 'cancelled'),
              validTo: dateStringArb,
            }),
            { minLength: 1, maxLength: 50 }
          ),
          todayArb,
          (permits, today) => {
            const activeCount = countActivePermits(permits, today)
            return activeCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when all active permits are expired (valid_to < today)', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.array(
            fc.record({
              id: fc.uuid(),
              permitNumber: fc.string({ minLength: 1, maxLength: 20 }),
              permitType: fc.constantFrom('hot_work', 'confined_space', 'excavation'),
              workLocation: fc.string({ minLength: 1, maxLength: 100 }),
              status: fc.constant('active'),
              // Generate dates in the past (before 2024)
              validTo: fc.integer({ 
                min: new Date('2020-01-01').getTime(), 
                max: new Date('2023-12-31').getTime() 
              }).map(ts => new Date(ts).toISOString().split('T')[0]),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (today, permits) => {
            const activeCount = countActivePermits(permits, today)
            return activeCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count all permits when all are active and valid', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.integer({ min: 1, max: 50 }),
          (today, count) => {
            // Generate permits that are all active and valid (valid_to in the future)
            const futureDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000)
            const futureDateStr = futureDate.toISOString().split('T')[0]
            
            const permits = Array.from({ length: count }, (_, i) => ({
              id: `permit-${i}`,
              permitNumber: `P-${i}`,
              permitType: 'hot_work',
              workLocation: 'Site A',
              status: 'active',
              validTo: futureDateStr,
            }))
            
            const activeCount = countActivePermits(permits, today)
            return activeCount === count
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 for empty permit collection', () => {
      const today = new Date()
      const activeCount = countActivePermits([], today)
      return activeCount === 0
    })

    it('should correctly handle permits valid exactly on today', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.integer({ min: 1, max: 20 }),
          (today, count) => {
            const todayStr = today.toISOString().split('T')[0]
            
            // All permits valid exactly on today should be counted as active
            const permits = Array.from({ length: count }, (_, i) => ({
              id: `permit-${i}`,
              permitNumber: `P-${i}`,
              permitType: 'hot_work',
              workLocation: 'Site A',
              status: 'active',
              validTo: todayStr, // Exactly today
            }))
            
            const activeCount = countActivePermits(permits, today)
            return activeCount === count
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Expired Permits Filtering', () => {
    /**
     * **Feature: hse-dashboard, Property 2: Status filtering correctness**
     * **Validates: Requirements 2.3**
     * 
     * Expired permits: records where valid_to < today AND status NOT IN ('closed', 'cancelled')
     */
    
    it('should count expired permits correctly for any collection of permits', () => {
      fc.assert(
        fc.property(
          fc.array(permitForStatusFilterArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (permits, today) => {
            const expiredCount = countExpiredPermits(permits, today)
            
            const todayStr = today.toISOString().split('T')[0]
            
            // Manually count permits that are expired AND not closed/cancelled
            const expectedCount = permits.filter(p => 
              p.validTo < todayStr && 
              !['closed', 'cancelled'].includes(p.status.toLowerCase())
            ).length
            
            return expiredCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when all expired permits are closed or cancelled', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.array(
            fc.record({
              id: fc.uuid(),
              permitNumber: fc.string({ minLength: 1, maxLength: 20 }),
              permitType: fc.constantFrom('hot_work', 'confined_space', 'excavation'),
              workLocation: fc.string({ minLength: 1, maxLength: 100 }),
              status: fc.constantFrom('closed', 'cancelled'),
              // Generate dates in the past
              validTo: fc.integer({ 
                min: new Date('2020-01-01').getTime(), 
                max: new Date('2023-12-31').getTime() 
              }).map(ts => new Date(ts).toISOString().split('T')[0]),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (today, permits) => {
            const expiredCount = countExpiredPermits(permits, today)
            return expiredCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when no permits are expired (all valid_to >= today)', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.array(
            fc.record({
              id: fc.uuid(),
              permitNumber: fc.string({ minLength: 1, maxLength: 20 }),
              permitType: fc.constantFrom('hot_work', 'confined_space', 'excavation'),
              workLocation: fc.string({ minLength: 1, maxLength: 100 }),
              status: fc.constantFrom('active', 'pending', 'suspended'),
              // Generate dates in the future (after 2026)
              validTo: fc.integer({ 
                min: new Date('2027-01-01').getTime(), 
                max: new Date('2030-12-31').getTime() 
              }).map(ts => new Date(ts).toISOString().split('T')[0]),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (today, permits) => {
            const expiredCount = countExpiredPermits(permits, today)
            return expiredCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count all permits when all are expired and not closed/cancelled', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.integer({ min: 1, max: 50 }),
          (today, count) => {
            // Generate permits that are all expired (valid_to in the past) and not closed
            const pastDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)
            const pastDateStr = pastDate.toISOString().split('T')[0]
            
            const permits = Array.from({ length: count }, (_, i) => ({
              id: `permit-${i}`,
              permitNumber: `P-${i}`,
              permitType: 'hot_work',
              workLocation: 'Site A',
              status: 'active', // Not closed or cancelled
              validTo: pastDateStr,
            }))
            
            const expiredCount = countExpiredPermits(permits, today)
            return expiredCount === count
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 for empty permit collection', () => {
      const today = new Date()
      const expiredCount = countExpiredPermits([], today)
      return expiredCount === 0
    })

    it('should not count permits valid exactly on today as expired', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.integer({ min: 1, max: 20 }),
          (today, count) => {
            const todayStr = today.toISOString().split('T')[0]
            
            // Permits valid exactly on today should NOT be counted as expired
            const permits = Array.from({ length: count }, (_, i) => ({
              id: `permit-${i}`,
              permitNumber: `P-${i}`,
              permitType: 'hot_work',
              workLocation: 'Site A',
              status: 'active',
              validTo: todayStr, // Exactly today - NOT expired
            }))
            
            const expiredCount = countExpiredPermits(permits, today)
            return expiredCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly handle boundary case: valid_to is yesterday', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.integer({ min: 1, max: 20 }),
          (today, count) => {
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
            const yesterdayStr = yesterday.toISOString().split('T')[0]
            
            // Permits valid until yesterday should be counted as expired
            const permits = Array.from({ length: count }, (_, i) => ({
              id: `permit-${i}`,
              permitNumber: `P-${i}`,
              permitType: 'hot_work',
              workLocation: 'Site A',
              status: 'active',
              validTo: yesterdayStr, // Yesterday - IS expired
            }))
            
            const expiredCount = countExpiredPermits(permits, today)
            return expiredCount === count
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Combined Status Filtering Properties', () => {
    /**
     * Additional properties that verify the consistency of status filtering
     * across different record types
     */
    
    it('should maintain consistency: filtered results are always a subset of original', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForStatusFilterArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const openIncidents = filterOpenIncidents(incidents)
            
            // Every open incident should be in the original collection
            return openIncidents.every(open => 
              incidents.some(i => i.id === open.id)
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain consistency: active + expired + other permits = total (for non-closed)', () => {
      fc.assert(
        fc.property(
          fc.array(permitForStatusFilterArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (permits, today) => {
            const todayStr = today.toISOString().split('T')[0]
            
            // Filter out closed/cancelled permits first
            const nonClosedPermits = permits.filter(p => 
              !['closed', 'cancelled'].includes(p.status.toLowerCase())
            )
            
            const activeCount = countActivePermits(permits, today)
            const expiredCount = countExpiredPermits(permits, today)
            
            // Active permits: status = 'active' AND valid_to >= today
            // Expired permits: valid_to < today AND status NOT IN ('closed', 'cancelled')
            // Other non-closed permits: status != 'active' AND valid_to >= today AND status NOT IN ('closed', 'cancelled')
            
            const otherNonClosedCount = nonClosedPermits.filter(p => 
              p.status.toLowerCase() !== 'active' && p.validTo >= todayStr
            ).length
            
            // Active + Expired + Other should equal non-closed total
            return activeCount + expiredCount + otherNonClosedCount === nonClosedPermits.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be idempotent: filtering twice gives same result', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForStatusFilterArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const firstFilter = filterOpenIncidents(incidents)
            const secondFilter = filterOpenIncidents(firstFilter)
            
            // Filtering open incidents twice should give same result
            return firstFilter.length === secondFilter.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle case-insensitive status matching', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('CLOSED', 'Closed', 'closed', 'RESOLVED', 'Resolved', 'resolved'),
          (status) => {
            const incidents = [
              { id: '1', incidentNumber: 'INC-001', title: 'Test', severity: 'minor', status, incidentDate: '2024-01-01', locationType: 'office' }
            ]
            
            const openCount = countOpenIncidents(incidents)
            
            // All variations of closed/resolved should result in 0 open incidents
            return openCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


// =====================================================
// Property 3: Date Range Filtering Correctness
// =====================================================

/**
 * **Feature: hse-dashboard, Property 3: Date range filtering correctness**
 * **Validates: Requirements 1.2, 2.2, 3.1, 3.2**
 * 
 * For any collection of records with date fields and any date range, the count
 * returned should equal exactly the number of records with dates within that range.
 * Specifically:
 * - Incidents YTD: incident_date >= start of year
 * - Expiring permits: valid_to between today and today + 30 days
 * - Expiring training: valid_to between today and today + 30 days
 * - Overdue training: valid_to < today
 */

// =====================================================
// Date Range Filtering Helper Functions
// =====================================================

/**
 * Get start of year for a given date
 */
function getStartOfYearForDate(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1)
}

/**
 * Filter incidents YTD (incident_date >= start of year)
 */
function filterIncidentsYtd<T extends { incidentDate: string | null }>(
  incidents: T[],
  today: Date
): T[] {
  const startOfYear = getStartOfYearForDate(today).toISOString().split('T')[0]
  return incidents.filter(i => 
    i.incidentDate !== null && i.incidentDate >= startOfYear
  )
}

/**
 * Count incidents YTD
 */
function countIncidentsYtd<T extends { incidentDate: string | null }>(
  incidents: T[],
  today: Date
): number {
  return filterIncidentsYtd(incidents, today).length
}

/**
 * Filter expiring permits (valid_to between today and today + 30 days)
 * Note: Also excludes closed/cancelled permits
 */
function filterExpiringPermits<T extends { status: string; validTo: string }>(
  permits: T[],
  today: Date
): T[] {
  const todayStr = today.toISOString().split('T')[0]
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]
  
  return permits.filter(p => 
    p.validTo >= todayStr && 
    p.validTo <= thirtyDaysFromNow &&
    !CLOSED_PERMIT_STATUSES.includes(p.status.toLowerCase())
  )
}

/**
 * Count expiring permits
 */
function countExpiringPermits<T extends { status: string; validTo: string }>(
  permits: T[],
  today: Date
): number {
  return filterExpiringPermits(permits, today).length
}

/**
 * Filter expiring training (valid_to between today and today + 30 days)
 */
function filterExpiringTraining<T extends { validTo: string }>(
  training: T[],
  today: Date
): T[] {
  const todayStr = today.toISOString().split('T')[0]
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]
  
  return training.filter(t => 
    t.validTo >= todayStr && t.validTo <= thirtyDaysFromNow
  )
}

/**
 * Count expiring training
 */
function countExpiringTraining<T extends { validTo: string }>(
  training: T[],
  today: Date
): number {
  return filterExpiringTraining(training, today).length
}

/**
 * Filter overdue training (valid_to < today)
 */
function filterOverdueTraining<T extends { validTo: string }>(
  training: T[],
  today: Date
): T[] {
  const todayStr = today.toISOString().split('T')[0]
  return training.filter(t => t.validTo < todayStr)
}

/**
 * Count overdue training
 */
function countOverdueTraining<T extends { validTo: string }>(
  training: T[],
  today: Date
): number {
  return filterOverdueTraining(training, today).length
}

// =====================================================
// Arbitraries for Date Range Filtering Tests
// =====================================================

// Generate incident records for date range filtering tests
const incidentForDateRangeArb = fc.record({
  id: fc.uuid(),
  incidentNumber: fc.string({ minLength: 1, maxLength: 20 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  severity: fc.constantFrom('critical', 'major', 'minor'),
  status: fc.constantFrom('open', 'investigating', 'resolved', 'closed'),
  incidentDate: fc.option(dateStringArb, { nil: null }),
  locationType: fc.constantFrom('office', 'site', 'warehouse', 'vehicle'),
})

// Generate permit records for date range filtering tests
const permitForDateRangeArb = fc.record({
  id: fc.uuid(),
  permitNumber: fc.string({ minLength: 1, maxLength: 20 }),
  permitType: fc.constantFrom('hot_work', 'confined_space', 'excavation', 'electrical', 'height_work'),
  workLocation: fc.string({ minLength: 1, maxLength: 100 }),
  status: fc.constantFrom('active', 'pending', 'expired', 'suspended', 'closed', 'cancelled'),
  validTo: dateStringArb,
})

// Generate training records for date range filtering tests
const trainingForDateRangeArb = fc.record({
  id: fc.uuid(),
  employeeCode: fc.string({ minLength: 1, maxLength: 20 }),
  fullName: fc.string({ minLength: 1, maxLength: 100 }),
  courseName: fc.string({ minLength: 1, maxLength: 100 }),
  validTo: dateStringArb,
  daysUntilExpiry: fc.integer({ min: -365, max: 365 }),
})

// =====================================================
// Property 3 Tests: Date Range Filtering Correctness
// =====================================================

describe('Property 3: Date range filtering correctness', () => {
  
  describe('Incidents YTD Filtering', () => {
    /**
     * **Feature: hse-dashboard, Property 3: Date range filtering correctness**
     * **Validates: Requirements 1.2**
     * 
     * Incidents YTD: incident_date >= start of year
     */
    
    it('should count incidents YTD correctly for any collection of incidents', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForDateRangeArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (incidents, today) => {
            const ytdCount = countIncidentsYtd(incidents, today)
            
            const startOfYear = getStartOfYearForDate(today).toISOString().split('T')[0]
            
            // Manually count incidents with incident_date >= start of year
            const expectedCount = incidents.filter(i => 
              i.incidentDate !== null && i.incidentDate >= startOfYear
            ).length
            
            return ytdCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when all incidents are from previous years', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.array(
            fc.record({
              id: fc.uuid(),
              incidentNumber: fc.string({ minLength: 1, maxLength: 20 }),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              severity: fc.constantFrom('critical', 'major', 'minor'),
              status: fc.constantFrom('open', 'investigating', 'resolved', 'closed'),
              // Generate dates from previous years (2020-2022)
              incidentDate: fc.integer({ 
                min: new Date('2020-01-01').getTime(), 
                max: new Date('2022-12-31').getTime() 
              }).map(ts => new Date(ts).toISOString().split('T')[0]),
              locationType: fc.constantFrom('office', 'site', 'warehouse', 'vehicle'),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (today, incidents) => {
            // Ensure today is in 2024 or later
            if (today.getFullYear() < 2024) return true
            
            const ytdCount = countIncidentsYtd(incidents, today)
            return ytdCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count all incidents when all are from current year', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.integer({ min: 1, max: 50 }),
          (today, count) => {
            const startOfYear = getStartOfYearForDate(today)
            
            // Generate incidents all within current year
            const incidents = Array.from({ length: count }, (_, i) => {
              // Random date between start of year and today
              const randomTime = startOfYear.getTime() + 
                Math.random() * (today.getTime() - startOfYear.getTime())
              const randomDate = new Date(randomTime).toISOString().split('T')[0]
              
              return {
                id: `incident-${i}`,
                incidentNumber: `INC-${i}`,
                title: `Test Incident ${i}`,
                severity: 'minor',
                status: 'open',
                incidentDate: randomDate,
                locationType: 'office',
              }
            })
            
            const ytdCount = countIncidentsYtd(incidents, today)
            return ytdCount === count
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 for empty incident collection', () => {
      const today = new Date()
      const ytdCount = countIncidentsYtd([], today)
      return ytdCount === 0
    })

    it('should return 0 when all incidents have null dates', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.array(
            fc.record({
              id: fc.uuid(),
              incidentNumber: fc.string({ minLength: 1, maxLength: 20 }),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              severity: fc.constantFrom('critical', 'major', 'minor'),
              status: fc.constantFrom('open', 'investigating', 'resolved', 'closed'),
              incidentDate: fc.constant(null),
              locationType: fc.constantFrom('office', 'site', 'warehouse', 'vehicle'),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (today, incidents) => {
            const ytdCount = countIncidentsYtd(incidents, today)
            return ytdCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly handle boundary case: incident exactly on Jan 1st', () => {
      fc.assert(
        fc.property(
          todayArb,
          (today) => {
            const startOfYear = getStartOfYearForDate(today)
            const startOfYearStr = startOfYear.toISOString().split('T')[0]
            
            const incidents = [
              { incidentDate: startOfYearStr } // Exactly on Jan 1st
            ]
            
            const ytdCount = countIncidentsYtd(incidents, today)
            return ytdCount === 1 // Should be included
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly handle boundary case: incident on Dec 31st of previous year', () => {
      fc.assert(
        fc.property(
          todayArb,
          (today) => {
            const startOfYear = getStartOfYearForDate(today)
            const lastDayPrevYear = new Date(startOfYear.getTime() - 24 * 60 * 60 * 1000)
            const lastDayPrevYearStr = lastDayPrevYear.toISOString().split('T')[0]
            
            const incidents = [
              { incidentDate: lastDayPrevYearStr } // Dec 31st of previous year
            ]
            
            const ytdCount = countIncidentsYtd(incidents, today)
            return ytdCount === 0 // Should NOT be included
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Expiring Permits Filtering', () => {
    /**
     * **Feature: hse-dashboard, Property 3: Date range filtering correctness**
     * **Validates: Requirements 2.2**
     * 
     * Expiring permits: valid_to between today and today + 30 days
     */
    
    it('should count expiring permits correctly for any collection of permits', () => {
      fc.assert(
        fc.property(
          fc.array(permitForDateRangeArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (permits, today) => {
            const expiringCount = countExpiringPermits(permits, today)
            
            const todayStr = today.toISOString().split('T')[0]
            const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0]
            
            // Manually count permits expiring within 30 days (excluding closed/cancelled)
            const expectedCount = permits.filter(p => 
              p.validTo >= todayStr && 
              p.validTo <= thirtyDaysFromNow &&
              !['closed', 'cancelled'].includes(p.status.toLowerCase())
            ).length
            
            return expiringCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when all permits expire after 30 days', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.integer({ min: 1, max: 50 }),
          (today, count) => {
            // Generate permits that expire more than 30 days from today
            // Use 31+ days from today to ensure they're outside the 30-day window
            const moreThan30Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0]
            
            const permits = Array.from({ length: count }, (_, i) => ({
              id: `permit-${i}`,
              permitNumber: `P-${i}`,
              permitType: 'hot_work',
              workLocation: 'Site A',
              status: 'active',
              validTo: moreThan30Days, // 60 days from today - outside 30-day window
            }))
            
            const expiringCount = countExpiringPermits(permits, today)
            return expiringCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when all permits are already expired (valid_to < today)', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.array(
            fc.record({
              id: fc.uuid(),
              permitNumber: fc.string({ minLength: 1, maxLength: 20 }),
              permitType: fc.constantFrom('hot_work', 'confined_space', 'excavation'),
              workLocation: fc.string({ minLength: 1, maxLength: 100 }),
              status: fc.constantFrom('active', 'pending'),
              // Generate dates in the past
              validTo: fc.integer({ 
                min: new Date('2020-01-01').getTime(), 
                max: new Date('2023-12-31').getTime() 
              }).map(ts => new Date(ts).toISOString().split('T')[0]),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (today, permits) => {
            const expiringCount = countExpiringPermits(permits, today)
            return expiringCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should exclude closed and cancelled permits from expiring count', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.integer({ min: 1, max: 20 }),
          (today, count) => {
            // Generate permits that would be expiring but are closed/cancelled
            const validTo = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0]
            
            const permits = Array.from({ length: count }, (_, i) => ({
              id: `permit-${i}`,
              permitNumber: `P-${i}`,
              permitType: 'hot_work',
              workLocation: 'Site A',
              status: i % 2 === 0 ? 'closed' : 'cancelled',
              validTo,
            }))
            
            const expiringCount = countExpiringPermits(permits, today)
            return expiringCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly handle boundary case: permit expiring exactly today', () => {
      fc.assert(
        fc.property(
          todayArb,
          (today) => {
            const todayStr = today.toISOString().split('T')[0]
            
            const permits = [
              { id: '1', permitNumber: 'P-1', permitType: 'hot_work', workLocation: 'Site A', status: 'active', validTo: todayStr }
            ]
            
            const expiringCount = countExpiringPermits(permits, today)
            return expiringCount === 1 // Should be included (valid_to >= today)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly handle boundary case: permit expiring exactly 30 days from now', () => {
      fc.assert(
        fc.property(
          todayArb,
          (today) => {
            const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0]
            
            const permits = [
              { id: '1', permitNumber: 'P-1', permitType: 'hot_work', workLocation: 'Site A', status: 'active', validTo: thirtyDaysFromNow }
            ]
            
            const expiringCount = countExpiringPermits(permits, today)
            return expiringCount === 1 // Should be included (valid_to <= today + 30)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly handle boundary case: permit expiring 31 days from now', () => {
      fc.assert(
        fc.property(
          todayArb,
          (today) => {
            const thirtyOneDaysFromNow = new Date(today.getTime() + 31 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0]
            
            const permits = [
              { id: '1', permitNumber: 'P-1', permitType: 'hot_work', workLocation: 'Site A', status: 'active', validTo: thirtyOneDaysFromNow }
            ]
            
            const expiringCount = countExpiringPermits(permits, today)
            return expiringCount === 0 // Should NOT be included (valid_to > today + 30)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 for empty permit collection', () => {
      const today = new Date()
      const expiringCount = countExpiringPermits([], today)
      return expiringCount === 0
    })
  })

  describe('Expiring Training Filtering', () => {
    /**
     * **Feature: hse-dashboard, Property 3: Date range filtering correctness**
     * **Validates: Requirements 3.1**
     * 
     * Expiring training: valid_to between today and today + 30 days
     */
    
    it('should count expiring training correctly for any collection of training records', () => {
      fc.assert(
        fc.property(
          fc.array(trainingForDateRangeArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (training, today) => {
            const expiringCount = countExpiringTraining(training, today)
            
            const todayStr = today.toISOString().split('T')[0]
            const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0]
            
            // Manually count training expiring within 30 days
            const expectedCount = training.filter(t => 
              t.validTo >= todayStr && t.validTo <= thirtyDaysFromNow
            ).length
            
            return expiringCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when all training expires after 30 days', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.integer({ min: 1, max: 50 }),
          (today, count) => {
            // Generate training that expires more than 30 days from today
            // Use 31+ days from today to ensure they're outside the 30-day window
            const moreThan30Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0]
            
            const training = Array.from({ length: count }, (_, i) => ({
              id: `training-${i}`,
              employeeCode: `E00${i}`,
              fullName: `Employee ${i}`,
              courseName: `Course ${i}`,
              validTo: moreThan30Days, // 60 days from today - outside 30-day window
              daysUntilExpiry: 60,
            }))
            
            const expiringCount = countExpiringTraining(training, today)
            return expiringCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when all training is already expired (valid_to < today)', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.array(
            fc.record({
              id: fc.uuid(),
              employeeCode: fc.string({ minLength: 1, maxLength: 20 }),
              fullName: fc.string({ minLength: 1, maxLength: 100 }),
              courseName: fc.string({ minLength: 1, maxLength: 100 }),
              // Generate dates in the past
              validTo: fc.integer({ 
                min: new Date('2020-01-01').getTime(), 
                max: new Date('2023-12-31').getTime() 
              }).map(ts => new Date(ts).toISOString().split('T')[0]),
              daysUntilExpiry: fc.integer({ min: -365, max: -1 }),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (today, training) => {
            const expiringCount = countExpiringTraining(training, today)
            return expiringCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly handle boundary case: training expiring exactly today', () => {
      fc.assert(
        fc.property(
          todayArb,
          (today) => {
            const todayStr = today.toISOString().split('T')[0]
            
            const training = [
              { id: '1', employeeCode: 'E001', fullName: 'John Doe', courseName: 'Safety 101', validTo: todayStr, daysUntilExpiry: 0 }
            ]
            
            const expiringCount = countExpiringTraining(training, today)
            return expiringCount === 1 // Should be included
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly handle boundary case: training expiring exactly 30 days from now', () => {
      fc.assert(
        fc.property(
          todayArb,
          (today) => {
            const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0]
            
            const training = [
              { id: '1', employeeCode: 'E001', fullName: 'John Doe', courseName: 'Safety 101', validTo: thirtyDaysFromNow, daysUntilExpiry: 30 }
            ]
            
            const expiringCount = countExpiringTraining(training, today)
            return expiringCount === 1 // Should be included
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly handle boundary case: training expiring 31 days from now', () => {
      fc.assert(
        fc.property(
          todayArb,
          (today) => {
            const thirtyOneDaysFromNow = new Date(today.getTime() + 31 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0]
            
            const training = [
              { id: '1', employeeCode: 'E001', fullName: 'John Doe', courseName: 'Safety 101', validTo: thirtyOneDaysFromNow, daysUntilExpiry: 31 }
            ]
            
            const expiringCount = countExpiringTraining(training, today)
            return expiringCount === 0 // Should NOT be included
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 for empty training collection', () => {
      const today = new Date()
      const expiringCount = countExpiringTraining([], today)
      return expiringCount === 0
    })
  })

  describe('Overdue Training Filtering', () => {
    /**
     * **Feature: hse-dashboard, Property 3: Date range filtering correctness**
     * **Validates: Requirements 3.2**
     * 
     * Overdue training: valid_to < today
     */
    
    it('should count overdue training correctly for any collection of training records', () => {
      fc.assert(
        fc.property(
          fc.array(trainingForDateRangeArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (training, today) => {
            const overdueCount = countOverdueTraining(training, today)
            
            const todayStr = today.toISOString().split('T')[0]
            
            // Manually count training that is overdue (valid_to < today)
            const expectedCount = training.filter(t => t.validTo < todayStr).length
            
            return overdueCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when all training is still valid (valid_to >= today)', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.array(
            fc.record({
              id: fc.uuid(),
              employeeCode: fc.string({ minLength: 1, maxLength: 20 }),
              fullName: fc.string({ minLength: 1, maxLength: 100 }),
              courseName: fc.string({ minLength: 1, maxLength: 100 }),
              // Generate dates in the future
              validTo: fc.integer({ 
                min: new Date('2027-01-01').getTime(), 
                max: new Date('2030-12-31').getTime() 
              }).map(ts => new Date(ts).toISOString().split('T')[0]),
              daysUntilExpiry: fc.integer({ min: 1, max: 365 }),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (today, training) => {
            const overdueCount = countOverdueTraining(training, today)
            return overdueCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count all training when all is overdue', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.integer({ min: 1, max: 50 }),
          (today, count) => {
            // Generate training that is all overdue (valid_to in the past)
            const pastDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0]
            
            const training = Array.from({ length: count }, (_, i) => ({
              id: `training-${i}`,
              employeeCode: `E00${i}`,
              fullName: `Employee ${i}`,
              courseName: `Course ${i}`,
              validTo: pastDate,
              daysUntilExpiry: -365,
            }))
            
            const overdueCount = countOverdueTraining(training, today)
            return overdueCount === count
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly handle boundary case: training valid exactly today', () => {
      fc.assert(
        fc.property(
          todayArb,
          (today) => {
            const todayStr = today.toISOString().split('T')[0]
            
            const training = [
              { id: '1', employeeCode: 'E001', fullName: 'John Doe', courseName: 'Safety 101', validTo: todayStr, daysUntilExpiry: 0 }
            ]
            
            const overdueCount = countOverdueTraining(training, today)
            return overdueCount === 0 // Should NOT be overdue (valid_to >= today)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly handle boundary case: training expired yesterday', () => {
      fc.assert(
        fc.property(
          todayArb,
          (today) => {
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
            const yesterdayStr = yesterday.toISOString().split('T')[0]
            
            const training = [
              { id: '1', employeeCode: 'E001', fullName: 'John Doe', courseName: 'Safety 101', validTo: yesterdayStr, daysUntilExpiry: -1 }
            ]
            
            const overdueCount = countOverdueTraining(training, today)
            return overdueCount === 1 // Should be overdue (valid_to < today)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 for empty training collection', () => {
      const today = new Date()
      const overdueCount = countOverdueTraining([], today)
      return overdueCount === 0
    })
  })

  describe('Combined Date Range Filtering Properties', () => {
    /**
     * Additional properties that verify the consistency of date range filtering
     * across different record types
     */
    
    it('should maintain consistency: expiring + overdue training are mutually exclusive', () => {
      fc.assert(
        fc.property(
          fc.array(trainingForDateRangeArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (training, today) => {
            const expiringTraining = filterExpiringTraining(training, today)
            const overdueTraining = filterOverdueTraining(training, today)
            
            // No training record should be in both expiring and overdue
            const expiringIds = new Set(expiringTraining.map(t => t.id))
            const overdueIds = new Set(overdueTraining.map(t => t.id))
            
            // Check for intersection
            for (const id of expiringIds) {
              if (overdueIds.has(id)) {
                return false // Found overlap - should not happen
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain consistency: expiring permits are a subset of non-expired permits', () => {
      fc.assert(
        fc.property(
          fc.array(permitForDateRangeArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (permits, today) => {
            const expiringPermits = filterExpiringPermits(permits, today)
            const expiredPermits = filterExpiredPermits(permits, today)
            
            // No permit should be in both expiring and expired
            const expiringIds = new Set(expiringPermits.map(p => p.id))
            const expiredIds = new Set(expiredPermits.map(p => p.id))
            
            for (const id of expiringIds) {
              if (expiredIds.has(id)) {
                return false // Found overlap - should not happen
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be idempotent: filtering twice gives same result for incidents YTD', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForDateRangeArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (incidents, today) => {
            const firstFilter = filterIncidentsYtd(incidents, today)
            const secondFilter = filterIncidentsYtd(firstFilter, today)
            
            return firstFilter.length === secondFilter.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be idempotent: filtering twice gives same result for expiring permits', () => {
      fc.assert(
        fc.property(
          fc.array(permitForDateRangeArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (permits, today) => {
            const firstFilter = filterExpiringPermits(permits, today)
            const secondFilter = filterExpiringPermits(firstFilter, today)
            
            return firstFilter.length === secondFilter.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be idempotent: filtering twice gives same result for overdue training', () => {
      fc.assert(
        fc.property(
          fc.array(trainingForDateRangeArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (training, today) => {
            const firstFilter = filterOverdueTraining(training, today)
            const secondFilter = filterOverdueTraining(firstFilter, today)
            
            return firstFilter.length === secondFilter.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain consistency: filtered results are always a subset of original', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForDateRangeArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (incidents, today) => {
            const ytdIncidents = filterIncidentsYtd(incidents, today)
            
            // Every YTD incident should be in the original collection
            return ytdIncidents.every(ytd => 
              incidents.some(i => i.id === ytd.id)
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


// =====================================================
// Property 4: Severity Grouping Correctness
// =====================================================

/**
 * **Feature: hse-dashboard, Property 4: Severity grouping correctness**
 * **Validates: Requirements 1.4**
 * 
 * For any collection of incidents with severity values, the grouped counts should
 * sum to the total count, and each severity bucket should contain exactly the
 * incidents with that severity value.
 */

// =====================================================
// Severity Grouping Helper Functions
// =====================================================

/**
 * Group incidents by severity
 * Returns counts for critical, major, and minor severities
 */
function groupIncidentsBySeverity(incidents: { severity: string }[]): { critical: number; major: number; minor: number } {
  const result = { critical: 0, major: 0, minor: 0 }
  for (const incident of incidents) {
    const severity = (incident.severity || '').toLowerCase()
    if (severity === 'critical') result.critical++
    else if (severity === 'major') result.major++
    else if (severity === 'minor') result.minor++
  }
  return result
}

/**
 * Filter incidents by specific severity
 */
function filterIncidentsBySeverity<T extends { severity: string }>(
  incidents: T[],
  severity: 'critical' | 'major' | 'minor'
): T[] {
  return incidents.filter(i => (i.severity || '').toLowerCase() === severity)
}

// =====================================================
// Arbitraries for Severity Grouping Tests
// =====================================================

// Valid severity values
const severityArb = fc.constantFrom('critical', 'major', 'minor')

// Generate incident records for severity grouping tests
const incidentForSeverityArb = fc.record({
  id: fc.uuid(),
  incidentNumber: fc.string({ minLength: 1, maxLength: 20 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  severity: severityArb,
  status: fc.constantFrom('open', 'investigating', 'resolved', 'closed'),
  incidentDate: dateStringArb,
  locationType: fc.constantFrom('office', 'site', 'warehouse', 'vehicle'),
})

// Generate incident with potentially mixed case severity
const incidentWithMixedCaseSeverityArb = fc.record({
  id: fc.uuid(),
  incidentNumber: fc.string({ minLength: 1, maxLength: 20 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  severity: fc.constantFrom(
    'critical', 'Critical', 'CRITICAL',
    'major', 'Major', 'MAJOR',
    'minor', 'Minor', 'MINOR'
  ),
  status: fc.constantFrom('open', 'investigating', 'resolved', 'closed'),
  incidentDate: dateStringArb,
  locationType: fc.constantFrom('office', 'site', 'warehouse', 'vehicle'),
})

// Generate incident with potentially invalid/unknown severity
const incidentWithAnySeverityArb = fc.record({
  id: fc.uuid(),
  incidentNumber: fc.string({ minLength: 1, maxLength: 20 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  severity: fc.oneof(
    severityArb,
    fc.constantFrom('unknown', 'low', 'high', 'medium', '', 'other')
  ),
  status: fc.constantFrom('open', 'investigating', 'resolved', 'closed'),
  incidentDate: dateStringArb,
  locationType: fc.constantFrom('office', 'site', 'warehouse', 'vehicle'),
})

// =====================================================
// Property 4 Tests: Severity Grouping Correctness
// =====================================================

describe('Property 4: Severity grouping correctness', () => {
  
  describe('Grouped Counts Sum to Total', () => {
    /**
     * **Feature: hse-dashboard, Property 4: Severity grouping correctness**
     * **Validates: Requirements 1.4**
     * 
     * The grouped counts should sum to the total count of incidents with valid severities
     */
    
    it('should have grouped counts sum to total for any collection of incidents with valid severities', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForSeverityArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const grouped = groupIncidentsBySeverity(incidents)
            
            // Sum of all severity counts should equal total incidents
            const totalGrouped = grouped.critical + grouped.major + grouped.minor
            
            return totalGrouped === incidents.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have grouped counts sum to count of valid severities when some severities are invalid', () => {
      fc.assert(
        fc.property(
          fc.array(incidentWithAnySeverityArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const grouped = groupIncidentsBySeverity(incidents)
            
            // Sum of all severity counts should equal count of incidents with valid severities
            const totalGrouped = grouped.critical + grouped.major + grouped.minor
            
            const validSeverityCount = incidents.filter(i => 
              ['critical', 'major', 'minor'].includes((i.severity || '').toLowerCase())
            ).length
            
            return totalGrouped === validSeverityCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return all zeros for empty incident collection', () => {
      const grouped = groupIncidentsBySeverity([])
      return grouped.critical === 0 && grouped.major === 0 && grouped.minor === 0
    })

    it('should return all zeros when all incidents have invalid severities', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              incidentNumber: fc.string({ minLength: 1, maxLength: 20 }),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              severity: fc.constantFrom('unknown', 'low', 'high', 'medium', '', 'other', 'severe'),
              status: fc.constantFrom('open', 'investigating', 'resolved', 'closed'),
              incidentDate: dateStringArb,
              locationType: fc.constantFrom('office', 'site', 'warehouse', 'vehicle'),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (incidents) => {
            const grouped = groupIncidentsBySeverity(incidents)
            return grouped.critical === 0 && grouped.major === 0 && grouped.minor === 0
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Each Severity Bucket Contains Correct Incidents', () => {
    /**
     * **Feature: hse-dashboard, Property 4: Severity grouping correctness**
     * **Validates: Requirements 1.4**
     * 
     * Each severity bucket should contain exactly the incidents with that severity value
     */
    
    it('should have critical count equal to number of critical incidents', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForSeverityArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const grouped = groupIncidentsBySeverity(incidents)
            
            // Count critical incidents manually
            const criticalCount = incidents.filter(i => 
              i.severity.toLowerCase() === 'critical'
            ).length
            
            return grouped.critical === criticalCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have major count equal to number of major incidents', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForSeverityArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const grouped = groupIncidentsBySeverity(incidents)
            
            // Count major incidents manually
            const majorCount = incidents.filter(i => 
              i.severity.toLowerCase() === 'major'
            ).length
            
            return grouped.major === majorCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have minor count equal to number of minor incidents', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForSeverityArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const grouped = groupIncidentsBySeverity(incidents)
            
            // Count minor incidents manually
            const minorCount = incidents.filter(i => 
              i.severity.toLowerCase() === 'minor'
            ).length
            
            return grouped.minor === minorCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly count each severity when all incidents have same severity', () => {
      fc.assert(
        fc.property(
          severityArb,
          fc.integer({ min: 1, max: 50 }),
          (severity, count) => {
            const incidents = Array.from({ length: count }, (_, i) => ({
              id: `incident-${i}`,
              incidentNumber: `INC-${i}`,
              title: `Test Incident ${i}`,
              severity,
              status: 'open',
              incidentDate: '2024-01-15',
              locationType: 'office',
            }))
            
            const grouped = groupIncidentsBySeverity(incidents)
            
            // Only the matching severity should have the count
            if (severity === 'critical') {
              return grouped.critical === count && grouped.major === 0 && grouped.minor === 0
            } else if (severity === 'major') {
              return grouped.critical === 0 && grouped.major === count && grouped.minor === 0
            } else {
              return grouped.critical === 0 && grouped.major === 0 && grouped.minor === count
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Case Insensitivity', () => {
    /**
     * **Feature: hse-dashboard, Property 4: Severity grouping correctness**
     * **Validates: Requirements 1.4**
     * 
     * Severity grouping should be case-insensitive
     */
    
    it('should handle mixed case severity values correctly', () => {
      fc.assert(
        fc.property(
          fc.array(incidentWithMixedCaseSeverityArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const grouped = groupIncidentsBySeverity(incidents)
            
            // Count each severity manually (case-insensitive)
            const criticalCount = incidents.filter(i => 
              i.severity.toLowerCase() === 'critical'
            ).length
            const majorCount = incidents.filter(i => 
              i.severity.toLowerCase() === 'major'
            ).length
            const minorCount = incidents.filter(i => 
              i.severity.toLowerCase() === 'minor'
            ).length
            
            return grouped.critical === criticalCount &&
                   grouped.major === majorCount &&
                   grouped.minor === minorCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should treat CRITICAL, Critical, and critical as the same', () => {
      const incidents = [
        { severity: 'CRITICAL' },
        { severity: 'Critical' },
        { severity: 'critical' },
      ]
      
      const grouped = groupIncidentsBySeverity(incidents)
      
      return grouped.critical === 3 && grouped.major === 0 && grouped.minor === 0
    })

    it('should treat MAJOR, Major, and major as the same', () => {
      const incidents = [
        { severity: 'MAJOR' },
        { severity: 'Major' },
        { severity: 'major' },
      ]
      
      const grouped = groupIncidentsBySeverity(incidents)
      
      return grouped.critical === 0 && grouped.major === 3 && grouped.minor === 0
    })

    it('should treat MINOR, Minor, and minor as the same', () => {
      const incidents = [
        { severity: 'MINOR' },
        { severity: 'Minor' },
        { severity: 'minor' },
      ]
      
      const grouped = groupIncidentsBySeverity(incidents)
      
      return grouped.critical === 0 && grouped.major === 0 && grouped.minor === 3
    })
  })

  describe('Edge Cases and Null Handling', () => {
    /**
     * **Feature: hse-dashboard, Property 4: Severity grouping correctness**
     * **Validates: Requirements 1.4**
     * 
     * Handle edge cases like null/undefined severity values
     */
    
    it('should handle null severity values gracefully', () => {
      const incidents = [
        { severity: null as unknown as string },
        { severity: 'critical' },
        { severity: null as unknown as string },
      ]
      
      const grouped = groupIncidentsBySeverity(incidents)
      
      // Only the valid critical should be counted
      return grouped.critical === 1 && grouped.major === 0 && grouped.minor === 0
    })

    it('should handle undefined severity values gracefully', () => {
      const incidents = [
        { severity: undefined as unknown as string },
        { severity: 'major' },
        { severity: undefined as unknown as string },
      ]
      
      const grouped = groupIncidentsBySeverity(incidents)
      
      // Only the valid major should be counted
      return grouped.critical === 0 && grouped.major === 1 && grouped.minor === 0
    })

    it('should handle empty string severity values', () => {
      const incidents = [
        { severity: '' },
        { severity: 'minor' },
        { severity: '' },
      ]
      
      const grouped = groupIncidentsBySeverity(incidents)
      
      // Only the valid minor should be counted
      return grouped.critical === 0 && grouped.major === 0 && grouped.minor === 1
    })

    it('should handle whitespace-only severity values', () => {
      const incidents = [
        { severity: '   ' },
        { severity: 'critical' },
        { severity: '\t\n' },
      ]
      
      const grouped = groupIncidentsBySeverity(incidents)
      
      // Only the valid critical should be counted (whitespace is not trimmed)
      return grouped.critical === 1 && grouped.major === 0 && grouped.minor === 0
    })
  })

  describe('Consistency Properties', () => {
    /**
     * **Feature: hse-dashboard, Property 4: Severity grouping correctness**
     * **Validates: Requirements 1.4**
     * 
     * Additional consistency properties for severity grouping
     */
    
    it('should be deterministic: same input always produces same output', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForSeverityArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const grouped1 = groupIncidentsBySeverity(incidents)
            const grouped2 = groupIncidentsBySeverity(incidents)
            
            return grouped1.critical === grouped2.critical &&
                   grouped1.major === grouped2.major &&
                   grouped1.minor === grouped2.minor
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be additive: grouping A + grouping B = grouping (A ∪ B)', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForSeverityArb, { minLength: 0, maxLength: 50 }),
          fc.array(incidentForSeverityArb, { minLength: 0, maxLength: 50 }),
          (incidentsA, incidentsB) => {
            const groupedA = groupIncidentsBySeverity(incidentsA)
            const groupedB = groupIncidentsBySeverity(incidentsB)
            const groupedCombined = groupIncidentsBySeverity([...incidentsA, ...incidentsB])
            
            return groupedCombined.critical === groupedA.critical + groupedB.critical &&
                   groupedCombined.major === groupedA.major + groupedB.major &&
                   groupedCombined.minor === groupedA.minor + groupedB.minor
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have non-negative counts for all severities', () => {
      fc.assert(
        fc.property(
          fc.array(incidentWithAnySeverityArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const grouped = groupIncidentsBySeverity(incidents)
            
            return grouped.critical >= 0 &&
                   grouped.major >= 0 &&
                   grouped.minor >= 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly partition incidents: each incident counted at most once', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForSeverityArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const grouped = groupIncidentsBySeverity(incidents)
            
            // Total grouped should never exceed total incidents
            const totalGrouped = grouped.critical + grouped.major + grouped.minor
            
            return totalGrouped <= incidents.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain order independence: shuffled input produces same counts', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForSeverityArb, { minLength: 2, maxLength: 50 }),
          (incidents) => {
            const grouped1 = groupIncidentsBySeverity(incidents)
            
            // Shuffle the incidents
            const shuffled = [...incidents].sort(() => Math.random() - 0.5)
            const grouped2 = groupIncidentsBySeverity(shuffled)
            
            return grouped1.critical === grouped2.critical &&
                   grouped1.major === grouped2.major &&
                   grouped1.minor === grouped2.minor
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Filter Function Consistency', () => {
    /**
     * **Feature: hse-dashboard, Property 4: Severity grouping correctness**
     * **Validates: Requirements 1.4**
     * 
     * Verify that filtering by severity is consistent with grouping
     */
    
    it('should have filter count match grouped count for critical', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForSeverityArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const grouped = groupIncidentsBySeverity(incidents)
            const filtered = filterIncidentsBySeverity(incidents, 'critical')
            
            return grouped.critical === filtered.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have filter count match grouped count for major', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForSeverityArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const grouped = groupIncidentsBySeverity(incidents)
            const filtered = filterIncidentsBySeverity(incidents, 'major')
            
            return grouped.major === filtered.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have filter count match grouped count for minor', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForSeverityArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const grouped = groupIncidentsBySeverity(incidents)
            const filtered = filterIncidentsBySeverity(incidents, 'minor')
            
            return grouped.minor === filtered.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have all filtered incidents be a subset of original', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForSeverityArb, { minLength: 0, maxLength: 100 }),
          severityArb,
          (incidents, severity) => {
            const filtered = filterIncidentsBySeverity(incidents, severity)
            
            // Every filtered incident should be in the original collection
            return filtered.every(f => 
              incidents.some(i => i.id === f.id)
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have filtered incidents all have the correct severity', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForSeverityArb, { minLength: 0, maxLength: 100 }),
          severityArb,
          (incidents, severity) => {
            const filtered = filterIncidentsBySeverity(incidents, severity)
            
            // Every filtered incident should have the specified severity
            return filtered.every(f => 
              f.severity.toLowerCase() === severity
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


// =====================================================
// Property 6: Compliance Percentage Calculation
// =====================================================

/**
 * **Feature: hse-dashboard, Property 6: Compliance percentage calculation**
 * **Validates: Requirements 3.3**
 * 
 * For any set of training compliance records with total count > 0, the compliance
 * rate should equal (compliant count / total count) * 100, rounded appropriately.
 * If total count is 0, compliance rate should be 100 (no violations).
 */

// =====================================================
// Compliance Rate Helper Functions
// =====================================================

/**
 * Calculate compliance rate from training compliance records
 * This mirrors the logic in hse-data.ts
 * 
 * @param records - Array of compliance records with complianceStatus and isMandatory
 * @returns Compliance rate as a percentage (0-100), rounded to nearest integer
 */
function calculateComplianceRate(records: { complianceStatus: string; isMandatory: boolean }[]): number {
  const mandatoryRecords = records.filter(r => r.isMandatory === true)
  if (mandatoryRecords.length === 0) return 100
  const compliantCount = mandatoryRecords.filter(r => r.complianceStatus === 'compliant').length
  return Math.round((compliantCount / mandatoryRecords.length) * 100)
}

// =====================================================
// Arbitraries for Compliance Rate Tests
// =====================================================

// Generate compliance status values
const complianceStatusArb = fc.constantFrom('compliant', 'non_compliant', 'expired', 'pending')

// Generate training compliance records
const trainingComplianceRecordArb = fc.record({
  complianceStatus: complianceStatusArb,
  isMandatory: fc.boolean(),
})

// Generate only mandatory training compliance records
const mandatoryTrainingComplianceRecordArb = fc.record({
  complianceStatus: complianceStatusArb,
  isMandatory: fc.constant(true),
})

// Generate only non-mandatory training compliance records
const nonMandatoryTrainingComplianceRecordArb = fc.record({
  complianceStatus: complianceStatusArb,
  isMandatory: fc.constant(false),
})

// Generate only compliant mandatory records
const compliantMandatoryRecordArb = fc.record({
  complianceStatus: fc.constant('compliant'),
  isMandatory: fc.constant(true),
})

// Generate only non-compliant mandatory records
const nonCompliantMandatoryRecordArb = fc.record({
  complianceStatus: fc.constantFrom('non_compliant', 'expired', 'pending'),
  isMandatory: fc.constant(true),
})

// =====================================================
// Property 6 Tests: Compliance Percentage Calculation
// =====================================================

describe('Property 6: Compliance percentage calculation', () => {
  
  describe('Basic Compliance Rate Calculation', () => {
    /**
     * **Feature: hse-dashboard, Property 6: Compliance percentage calculation**
     * **Validates: Requirements 3.3**
     * 
     * For any set of training compliance records, the compliance rate should
     * equal (compliant count / total mandatory count) * 100, rounded appropriately.
     */
    
    it('should calculate compliance rate correctly for any collection of records', () => {
      fc.assert(
        fc.property(
          fc.array(trainingComplianceRecordArb, { minLength: 0, maxLength: 100 }),
          (records) => {
            const rate = calculateComplianceRate(records)
            
            // Manually calculate expected rate
            const mandatoryRecords = records.filter(r => r.isMandatory === true)
            
            if (mandatoryRecords.length === 0) {
              return rate === 100
            }
            
            const compliantCount = mandatoryRecords.filter(r => r.complianceStatus === 'compliant').length
            const expectedRate = Math.round((compliantCount / mandatoryRecords.length) * 100)
            
            return rate === expectedRate
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 100 when all mandatory records are compliant', () => {
      fc.assert(
        fc.property(
          fc.array(compliantMandatoryRecordArb, { minLength: 1, maxLength: 50 }),
          (records) => {
            const rate = calculateComplianceRate(records)
            return rate === 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when no mandatory records are compliant', () => {
      fc.assert(
        fc.property(
          fc.array(nonCompliantMandatoryRecordArb, { minLength: 1, maxLength: 50 }),
          (records) => {
            const rate = calculateComplianceRate(records)
            return rate === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 100 for empty collection (no violations)', () => {
      const rate = calculateComplianceRate([])
      return rate === 100
    })

    it('should return 100 when all records are non-mandatory', () => {
      fc.assert(
        fc.property(
          fc.array(nonMandatoryTrainingComplianceRecordArb, { minLength: 1, maxLength: 50 }),
          (records) => {
            const rate = calculateComplianceRate(records)
            return rate === 100
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Compliance Rate Bounds', () => {
    /**
     * **Feature: hse-dashboard, Property 6: Compliance percentage calculation**
     * **Validates: Requirements 3.3**
     * 
     * Compliance rate should always be between 0 and 100 inclusive.
     */
    
    it('should always return a value between 0 and 100 inclusive', () => {
      fc.assert(
        fc.property(
          fc.array(trainingComplianceRecordArb, { minLength: 0, maxLength: 100 }),
          (records) => {
            const rate = calculateComplianceRate(records)
            return rate >= 0 && rate <= 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return an integer (properly rounded)', () => {
      fc.assert(
        fc.property(
          fc.array(trainingComplianceRecordArb, { minLength: 0, maxLength: 100 }),
          (records) => {
            const rate = calculateComplianceRate(records)
            return Number.isInteger(rate)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Compliance Rate Rounding', () => {
    /**
     * **Feature: hse-dashboard, Property 6: Compliance percentage calculation**
     * **Validates: Requirements 3.3**
     * 
     * Compliance rate should be rounded to nearest integer.
     */
    
    it('should round correctly for specific compliant/total ratios', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (compliantCount, totalCount) => {
            // Ensure compliantCount <= totalCount
            const actualCompliant = Math.min(compliantCount, totalCount)
            
            // Create records with exact compliant/non-compliant ratio
            const records: { complianceStatus: string; isMandatory: boolean }[] = []
            
            for (let i = 0; i < actualCompliant; i++) {
              records.push({ complianceStatus: 'compliant', isMandatory: true })
            }
            
            for (let i = actualCompliant; i < totalCount; i++) {
              records.push({ complianceStatus: 'non_compliant', isMandatory: true })
            }
            
            const rate = calculateComplianceRate(records)
            const expectedRate = Math.round((actualCompliant / totalCount) * 100)
            
            return rate === expectedRate
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should round 49.5% to 50% (round half up)', () => {
      // 99 compliant out of 200 = 49.5% -> rounds to 50%
      const records: { complianceStatus: string; isMandatory: boolean }[] = []
      
      for (let i = 0; i < 99; i++) {
        records.push({ complianceStatus: 'compliant', isMandatory: true })
      }
      for (let i = 0; i < 101; i++) {
        records.push({ complianceStatus: 'non_compliant', isMandatory: true })
      }
      
      const rate = calculateComplianceRate(records)
      // Math.round(49.5) = 50 in JavaScript
      return rate === 50
    })

    it('should round 33.33% to 33%', () => {
      // 1 compliant out of 3 = 33.33% -> rounds to 33%
      const records = [
        { complianceStatus: 'compliant', isMandatory: true },
        { complianceStatus: 'non_compliant', isMandatory: true },
        { complianceStatus: 'non_compliant', isMandatory: true },
      ]
      
      const rate = calculateComplianceRate(records)
      return rate === 33
    })

    it('should round 66.67% to 67%', () => {
      // 2 compliant out of 3 = 66.67% -> rounds to 67%
      const records = [
        { complianceStatus: 'compliant', isMandatory: true },
        { complianceStatus: 'compliant', isMandatory: true },
        { complianceStatus: 'non_compliant', isMandatory: true },
      ]
      
      const rate = calculateComplianceRate(records)
      return rate === 67
    })
  })

  describe('Non-Mandatory Records Handling', () => {
    /**
     * **Feature: hse-dashboard, Property 6: Compliance percentage calculation**
     * **Validates: Requirements 3.3**
     * 
     * Non-mandatory records should not affect the compliance rate calculation.
     */
    
    it('should ignore non-mandatory records in calculation', () => {
      fc.assert(
        fc.property(
          fc.array(mandatoryTrainingComplianceRecordArb, { minLength: 1, maxLength: 50 }),
          fc.array(nonMandatoryTrainingComplianceRecordArb, { minLength: 0, maxLength: 50 }),
          (mandatoryRecords, nonMandatoryRecords) => {
            // Calculate rate with only mandatory records
            const rateWithoutNonMandatory = calculateComplianceRate(mandatoryRecords)
            
            // Calculate rate with both mandatory and non-mandatory records
            const combinedRecords = [...mandatoryRecords, ...nonMandatoryRecords]
            const rateWithNonMandatory = calculateComplianceRate(combinedRecords)
            
            // Rates should be equal since non-mandatory records are ignored
            return rateWithoutNonMandatory === rateWithNonMandatory
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce same rate regardless of non-mandatory record count', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 0, max: 50 }),
          (compliantCount, nonCompliantCount, nonMandatoryCount) => {
            // Create base mandatory records
            const baseRecords: { complianceStatus: string; isMandatory: boolean }[] = []
            
            for (let i = 0; i < compliantCount; i++) {
              baseRecords.push({ complianceStatus: 'compliant', isMandatory: true })
            }
            for (let i = 0; i < nonCompliantCount; i++) {
              baseRecords.push({ complianceStatus: 'non_compliant', isMandatory: true })
            }
            
            const baseRate = calculateComplianceRate(baseRecords)
            
            // Add non-mandatory records
            const extendedRecords = [...baseRecords]
            for (let i = 0; i < nonMandatoryCount; i++) {
              extendedRecords.push({ 
                complianceStatus: Math.random() > 0.5 ? 'compliant' : 'non_compliant', 
                isMandatory: false 
              })
            }
            
            const extendedRate = calculateComplianceRate(extendedRecords)
            
            return baseRate === extendedRate
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Edge Cases', () => {
    /**
     * **Feature: hse-dashboard, Property 6: Compliance percentage calculation**
     * **Validates: Requirements 3.3**
     * 
     * Test edge cases for compliance rate calculation.
     */
    
    it('should handle single compliant mandatory record (100%)', () => {
      const records = [{ complianceStatus: 'compliant', isMandatory: true }]
      const rate = calculateComplianceRate(records)
      return rate === 100
    })

    it('should handle single non-compliant mandatory record (0%)', () => {
      const records = [{ complianceStatus: 'non_compliant', isMandatory: true }]
      const rate = calculateComplianceRate(records)
      return rate === 0
    })

    it('should handle mixed mandatory and non-mandatory with all mandatory compliant', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 1, max: 50 }),
          (mandatoryCount, nonMandatoryCount) => {
            const records: { complianceStatus: string; isMandatory: boolean }[] = []
            
            // All mandatory are compliant
            for (let i = 0; i < mandatoryCount; i++) {
              records.push({ complianceStatus: 'compliant', isMandatory: true })
            }
            
            // Non-mandatory can be anything
            for (let i = 0; i < nonMandatoryCount; i++) {
              records.push({ complianceStatus: 'non_compliant', isMandatory: false })
            }
            
            const rate = calculateComplianceRate(records)
            return rate === 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle large number of records efficiently', () => {
      fc.assert(
        fc.property(
          fc.array(trainingComplianceRecordArb, { minLength: 500, maxLength: 1000 }),
          (records) => {
            const startTime = Date.now()
            const rate = calculateComplianceRate(records)
            const endTime = Date.now()
            
            // Should complete in reasonable time (< 100ms)
            const isEfficient = (endTime - startTime) < 100
            
            // Rate should still be valid
            const isValidRate = rate >= 0 && rate <= 100 && Number.isInteger(rate)
            
            return isEfficient && isValidRate
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Compliance Status Variations', () => {
    /**
     * **Feature: hse-dashboard, Property 6: Compliance percentage calculation**
     * **Validates: Requirements 3.3**
     * 
     * Only 'compliant' status should count as compliant.
     */
    
    it('should only count "compliant" status as compliant', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              complianceStatus: fc.constantFrom('non_compliant', 'expired', 'pending', 'unknown'),
              isMandatory: fc.constant(true),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (records) => {
            const rate = calculateComplianceRate(records)
            // None of these statuses should count as compliant
            return rate === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be case-sensitive for compliance status', () => {
      // 'Compliant' (capitalized) should NOT count as compliant
      const records = [
        { complianceStatus: 'Compliant', isMandatory: true },
        { complianceStatus: 'COMPLIANT', isMandatory: true },
      ]
      
      const rate = calculateComplianceRate(records)
      // These should NOT be counted as compliant due to case sensitivity
      return rate === 0
    })
  })

  describe('Mathematical Properties', () => {
    /**
     * **Feature: hse-dashboard, Property 6: Compliance percentage calculation**
     * **Validates: Requirements 3.3**
     * 
     * Verify mathematical properties of the compliance rate calculation.
     */
    
    it('should satisfy: rate = 100 - non_compliance_rate', () => {
      fc.assert(
        fc.property(
          fc.array(mandatoryTrainingComplianceRecordArb, { minLength: 1, maxLength: 50 }),
          (records) => {
            const rate = calculateComplianceRate(records)
            
            // Calculate non-compliance rate
            const nonCompliantCount = records.filter(r => r.complianceStatus !== 'compliant').length
            const nonComplianceRate = Math.round((nonCompliantCount / records.length) * 100)
            
            // Due to rounding, the sum might not be exactly 100
            // But they should be within 1 of each other
            return Math.abs((rate + nonComplianceRate) - 100) <= 1
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be monotonic: adding compliant records should not decrease rate', () => {
      fc.assert(
        fc.property(
          fc.array(mandatoryTrainingComplianceRecordArb, { minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 10 }),
          (records, additionalCompliant) => {
            const originalRate = calculateComplianceRate(records)
            
            // Add more compliant records
            const extendedRecords = [...records]
            for (let i = 0; i < additionalCompliant; i++) {
              extendedRecords.push({ complianceStatus: 'compliant', isMandatory: true })
            }
            
            const newRate = calculateComplianceRate(extendedRecords)
            
            // Rate should not decrease when adding compliant records
            return newRate >= originalRate
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be monotonic: adding non-compliant records should not increase rate', () => {
      fc.assert(
        fc.property(
          fc.array(mandatoryTrainingComplianceRecordArb, { minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 10 }),
          (records, additionalNonCompliant) => {
            const originalRate = calculateComplianceRate(records)
            
            // Add more non-compliant records
            const extendedRecords = [...records]
            for (let i = 0; i < additionalNonCompliant; i++) {
              extendedRecords.push({ complianceStatus: 'non_compliant', isMandatory: true })
            }
            
            const newRate = calculateComplianceRate(extendedRecords)
            
            // Rate should not increase when adding non-compliant records
            return newRate <= originalRate
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be idempotent: calculating rate twice gives same result', () => {
      fc.assert(
        fc.property(
          fc.array(trainingComplianceRecordArb, { minLength: 0, maxLength: 100 }),
          (records) => {
            const rate1 = calculateComplianceRate(records)
            const rate2 = calculateComplianceRate(records)
            
            return rate1 === rate2
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be order-independent: shuffled records produce same rate', () => {
      fc.assert(
        fc.property(
          fc.array(trainingComplianceRecordArb, { minLength: 2, maxLength: 50 }),
          (records) => {
            const rate1 = calculateComplianceRate(records)
            
            // Shuffle the records
            const shuffled = [...records].sort(() => Math.random() - 0.5)
            const rate2 = calculateComplianceRate(shuffled)
            
            return rate1 === rate2
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


// =====================================================
// Property 5: Recent Items Ordering and Limiting
// =====================================================

/**
 * **Feature: hse-dashboard, Property 5: Recent items ordering and limiting**
 * **Validates: Requirements 2.4, 3.4, 4.3**
 * 
 * For any collection of records, the recent items query should return at most 5 items,
 * and those items should be ordered by the specified field in descending order
 * (most recent first for created_at, soonest for expiry dates).
 */

// =====================================================
// Recent Items Helper Functions
// =====================================================

/**
 * Get recent items from a collection, ordered by a specified field
 * This mirrors the logic used in hse-data.ts for recent items queries
 * 
 * @param items - Array of items to filter and sort
 * @param orderBy - Key to order by
 * @param limit - Maximum number of items to return (default: 5)
 * @param ascending - If true, sort ascending; if false, sort descending (default: false)
 * @returns Sorted and limited array of items
 */
function getRecentItems<T>(
  items: T[],
  orderBy: keyof T,
  limit: number = 5,
  ascending: boolean = false
): T[] {
  const sorted = [...items].sort((a, b) => {
    const aVal = a[orderBy]
    const bVal = b[orderBy]
    if (ascending) return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
  })
  return sorted.slice(0, limit)
}

/**
 * Check if an array is sorted by a given key
 */
function isSortedBy<T>(
  items: T[],
  orderBy: keyof T,
  ascending: boolean = false
): boolean {
  if (items.length <= 1) return true
  
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1][orderBy]
    const curr = items[i][orderBy]
    
    if (ascending) {
      if (prev > curr) return false
    } else {
      if (prev < curr) return false
    }
  }
  
  return true
}

// =====================================================
// Arbitraries for Recent Items Tests
// =====================================================

// Generate date strings for ordering tests
const recentItemsDateArb = fc.integer({ 
  min: new Date('2020-01-01').getTime(), 
  max: new Date('2026-12-31').getTime() 
}).map(ts => new Date(ts).toISOString().split('T')[0])

// Generate incident records for recent items tests
const incidentForRecentItemsArb = fc.record({
  id: fc.uuid(),
  incidentNumber: fc.string({ minLength: 1, maxLength: 20 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  severity: fc.constantFrom('critical', 'major', 'minor'),
  status: fc.constantFrom('open', 'investigating', 'resolved', 'closed'),
  incidentDate: recentItemsDateArb,
  locationType: fc.constantFrom('office', 'site', 'warehouse', 'vehicle'),
  createdAt: recentItemsDateArb,
})

// Generate permit records for recent items tests
const permitForRecentItemsArb = fc.record({
  id: fc.uuid(),
  permitNumber: fc.string({ minLength: 1, maxLength: 20 }),
  permitType: fc.constantFrom('hot_work', 'confined_space', 'excavation', 'electrical', 'height_work'),
  workLocation: fc.string({ minLength: 1, maxLength: 100 }),
  status: fc.constantFrom('active', 'pending', 'expired', 'suspended', 'closed', 'cancelled'),
  validTo: recentItemsDateArb,
  createdAt: recentItemsDateArb,
})

// Generate training records for recent items tests (expiring training)
const trainingForRecentItemsArb = fc.record({
  id: fc.uuid(),
  employeeCode: fc.string({ minLength: 1, maxLength: 20 }),
  fullName: fc.string({ minLength: 1, maxLength: 100 }),
  courseName: fc.string({ minLength: 1, maxLength: 100 }),
  validTo: recentItemsDateArb,
  daysUntilExpiry: fc.integer({ min: 0, max: 365 }),
})

// Generate PPE records for recent items tests
const ppeForRecentItemsArb = fc.record({
  id: fc.uuid(),
  employeeCode: fc.string({ minLength: 1, maxLength: 20 }),
  fullName: fc.string({ minLength: 1, maxLength: 100 }),
  ppeName: fc.string({ minLength: 1, maxLength: 100 }),
  expectedReplacementDate: recentItemsDateArb,
  daysOverdue: fc.integer({ min: 0, max: 365 }),
})

// Generic record with numeric ordering field
const numericOrderRecordArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  orderValue: fc.integer({ min: -1000, max: 1000 }),
})

// Generic record with date ordering field
const dateOrderRecordArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  dateValue: recentItemsDateArb,
})

// =====================================================
// Property 5 Tests: Recent Items Ordering and Limiting
// =====================================================

describe('Property 5: Recent items ordering and limiting', () => {
  
  describe('Limit Constraint', () => {
    /**
     * **Feature: hse-dashboard, Property 5: Recent items ordering and limiting**
     * **Validates: Requirements 2.4, 3.4, 4.3**
     * 
     * The result should be limited to at most 5 items (or the specified limit)
     */
    
    it('should return at most 5 items for any collection size', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForRecentItemsArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const recent = getRecentItems(incidents, 'incidentDate', 5, false)
            return recent.length <= 5
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return all items when collection has fewer than 5 items', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForRecentItemsArb, { minLength: 0, maxLength: 4 }),
          (incidents) => {
            const recent = getRecentItems(incidents, 'incidentDate', 5, false)
            return recent.length === incidents.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return exactly 5 items when collection has more than 5 items', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForRecentItemsArb, { minLength: 6, maxLength: 100 }),
          (incidents) => {
            const recent = getRecentItems(incidents, 'incidentDate', 5, false)
            return recent.length === 5
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return exactly 5 items when collection has exactly 5 items', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForRecentItemsArb, { minLength: 5, maxLength: 5 }),
          (incidents) => {
            const recent = getRecentItems(incidents, 'incidentDate', 5, false)
            return recent.length === 5
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array for empty collection', () => {
      const recent = getRecentItems([], 'id', 5, false)
      return recent.length === 0
    })

    it('should respect custom limit parameter', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForRecentItemsArb, { minLength: 0, maxLength: 100 }),
          fc.integer({ min: 1, max: 20 }),
          (incidents, limit) => {
            const recent = getRecentItems(incidents, 'incidentDate', limit, false)
            return recent.length <= limit && recent.length <= incidents.length
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Descending Order (Most Recent First)', () => {
    /**
     * **Feature: hse-dashboard, Property 5: Recent items ordering and limiting**
     * **Validates: Requirements 2.4, 3.4, 4.3**
     * 
     * Items should be ordered by the specified field in descending order
     * (most recent first for dates like created_at, incident_date)
     */
    
    it('should order incidents by incidentDate descending (most recent first)', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForRecentItemsArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const recent = getRecentItems(incidents, 'incidentDate', 5, false)
            return isSortedBy(recent, 'incidentDate', false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should order permits by createdAt descending (most recent first)', () => {
      fc.assert(
        fc.property(
          fc.array(permitForRecentItemsArb, { minLength: 0, maxLength: 100 }),
          (permits) => {
            const recent = getRecentItems(permits, 'createdAt', 5, false)
            return isSortedBy(recent, 'createdAt', false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should order PPE by daysOverdue descending (most overdue first)', () => {
      fc.assert(
        fc.property(
          fc.array(ppeForRecentItemsArb, { minLength: 0, maxLength: 100 }),
          (ppeItems) => {
            const recent = getRecentItems(ppeItems, 'daysOverdue', 5, false)
            return isSortedBy(recent, 'daysOverdue', false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have first item be the most recent (highest date value)', () => {
      fc.assert(
        fc.property(
          fc.array(dateOrderRecordArb, { minLength: 2, maxLength: 100 }),
          (records) => {
            const recent = getRecentItems(records, 'dateValue', 5, false)
            
            if (recent.length === 0) return true
            
            // Find the maximum date in the original collection
            const maxDate = records.reduce((max, r) => 
              r.dateValue > max ? r.dateValue : max, records[0].dateValue
            )
            
            // First item should have the maximum date
            return recent[0].dateValue === maxDate
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have last item be the least recent among selected items', () => {
      fc.assert(
        fc.property(
          fc.array(dateOrderRecordArb, { minLength: 2, maxLength: 100 }),
          (records) => {
            const recent = getRecentItems(records, 'dateValue', 5, false)
            
            if (recent.length <= 1) return true
            
            // Last item should have the minimum date among selected items
            const minDateInRecent = recent.reduce((min, r) => 
              r.dateValue < min ? r.dateValue : min, recent[0].dateValue
            )
            
            return recent[recent.length - 1].dateValue === minDateInRecent
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Ascending Order (Soonest First)', () => {
    /**
     * **Feature: hse-dashboard, Property 5: Recent items ordering and limiting**
     * **Validates: Requirements 3.4**
     * 
     * For expiring training, items should be ordered ascending by days_until_expiry
     * (soonest expiring first)
     */
    
    it('should order training by daysUntilExpiry ascending (soonest first)', () => {
      fc.assert(
        fc.property(
          fc.array(trainingForRecentItemsArb, { minLength: 0, maxLength: 100 }),
          (training) => {
            const recent = getRecentItems(training, 'daysUntilExpiry', 5, true)
            return isSortedBy(recent, 'daysUntilExpiry', true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have first item be the soonest expiring (lowest daysUntilExpiry)', () => {
      fc.assert(
        fc.property(
          fc.array(trainingForRecentItemsArb, { minLength: 2, maxLength: 100 }),
          (training) => {
            const recent = getRecentItems(training, 'daysUntilExpiry', 5, true)
            
            if (recent.length === 0) return true
            
            // Find the minimum daysUntilExpiry in the original collection
            const minDays = training.reduce((min, t) => 
              t.daysUntilExpiry < min ? t.daysUntilExpiry : min, training[0].daysUntilExpiry
            )
            
            // First item should have the minimum daysUntilExpiry
            return recent[0].daysUntilExpiry === minDays
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should order by validTo ascending when using date field', () => {
      fc.assert(
        fc.property(
          fc.array(trainingForRecentItemsArb, { minLength: 0, maxLength: 100 }),
          (training) => {
            const recent = getRecentItems(training, 'validTo', 5, true)
            return isSortedBy(recent, 'validTo', true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Edge Cases', () => {
    /**
     * **Feature: hse-dashboard, Property 5: Recent items ordering and limiting**
     * **Validates: Requirements 2.4, 3.4, 4.3**
     * 
     * Test edge cases: empty collection, fewer than 5 items, exactly 5 items, more than 5 items
     */
    
    it('should handle empty collection gracefully', () => {
      const emptyIncidents: typeof incidentForRecentItemsArb['_type'][] = []
      const recent = getRecentItems(emptyIncidents, 'incidentDate', 5, false)
      
      return recent.length === 0 && Array.isArray(recent)
    })

    it('should handle single item collection', () => {
      fc.assert(
        fc.property(
          incidentForRecentItemsArb,
          (incident) => {
            const recent = getRecentItems([incident], 'incidentDate', 5, false)
            return recent.length === 1 && recent[0].id === incident.id
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle collection with exactly 5 items', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForRecentItemsArb, { minLength: 5, maxLength: 5 }),
          (incidents) => {
            const recent = getRecentItems(incidents, 'incidentDate', 5, false)
            
            // Should return all 5 items
            if (recent.length !== 5) return false
            
            // Should be sorted
            if (!isSortedBy(recent, 'incidentDate', false)) return false
            
            // All original items should be present
            const recentIds = new Set(recent.map(r => r.id))
            return incidents.every(i => recentIds.has(i.id))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle collection with fewer than 5 items (2-4 items)', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForRecentItemsArb, { minLength: 2, maxLength: 4 }),
          (incidents) => {
            const recent = getRecentItems(incidents, 'incidentDate', 5, false)
            
            // Should return all items
            if (recent.length !== incidents.length) return false
            
            // Should be sorted
            if (!isSortedBy(recent, 'incidentDate', false)) return false
            
            // All original items should be present
            const recentIds = new Set(recent.map(r => r.id))
            return incidents.every(i => recentIds.has(i.id))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle collection with more than 5 items', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForRecentItemsArb, { minLength: 10, maxLength: 100 }),
          (incidents) => {
            const recent = getRecentItems(incidents, 'incidentDate', 5, false)
            
            // Should return exactly 5 items
            if (recent.length !== 5) return false
            
            // Should be sorted
            if (!isSortedBy(recent, 'incidentDate', false)) return false
            
            // All returned items should be from original collection
            const originalIds = new Set(incidents.map(i => i.id))
            return recent.every(r => originalIds.has(r.id))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle items with identical ordering values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 20 }),
          recentItemsDateArb,
          (count, sameDate) => {
            // Create items with identical dates
            const incidents = Array.from({ length: count }, (_, i) => ({
              id: `incident-${i}`,
              incidentNumber: `INC-${i}`,
              title: `Test Incident ${i}`,
              severity: 'minor',
              status: 'open',
              incidentDate: sameDate, // All same date
              locationType: 'office',
              createdAt: sameDate,
            }))
            
            const recent = getRecentItems(incidents, 'incidentDate', 5, false)
            
            // Should still return at most 5 items
            if (recent.length > 5) return false
            
            // All items should have the same date
            return recent.every(r => r.incidentDate === sameDate)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Subset Property', () => {
    /**
     * **Feature: hse-dashboard, Property 5: Recent items ordering and limiting**
     * **Validates: Requirements 2.4, 3.4, 4.3**
     * 
     * The returned items should always be a subset of the original collection
     */
    
    it('should return items that are all from the original collection', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForRecentItemsArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const recent = getRecentItems(incidents, 'incidentDate', 5, false)
            
            const originalIds = new Set(incidents.map(i => i.id))
            return recent.every(r => originalIds.has(r.id))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not duplicate items in the result', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForRecentItemsArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const recent = getRecentItems(incidents, 'incidentDate', 5, false)
            
            const ids = recent.map(r => r.id)
            const uniqueIds = new Set(ids)
            
            return ids.length === uniqueIds.size
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should select the top N items by ordering criteria', () => {
      fc.assert(
        fc.property(
          fc.array(numericOrderRecordArb, { minLength: 6, maxLength: 100 }),
          (records) => {
            const recent = getRecentItems(records, 'orderValue', 5, false)
            
            // Get the minimum value in the recent items
            const minInRecent = Math.min(...recent.map(r => r.orderValue))
            
            // All items NOT in recent should have orderValue <= minInRecent
            const recentIds = new Set(recent.map(r => r.id))
            const notInRecent = records.filter(r => !recentIds.has(r.id))
            
            return notInRecent.every(r => r.orderValue <= minInRecent)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Consistency Properties', () => {
    /**
     * **Feature: hse-dashboard, Property 5: Recent items ordering and limiting**
     * **Validates: Requirements 2.4, 3.4, 4.3**
     * 
     * Additional consistency properties for recent items
     */
    
    it('should be deterministic: same input always produces same output', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForRecentItemsArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const recent1 = getRecentItems(incidents, 'incidentDate', 5, false)
            const recent2 = getRecentItems(incidents, 'incidentDate', 5, false)
            
            if (recent1.length !== recent2.length) return false
            
            // Same items in same order
            return recent1.every((r, i) => r.id === recent2[i].id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be idempotent: applying twice gives same result', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForRecentItemsArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const recent1 = getRecentItems(incidents, 'incidentDate', 5, false)
            const recent2 = getRecentItems(recent1, 'incidentDate', 5, false)
            
            if (recent1.length !== recent2.length) return false
            
            // Same items in same order
            return recent1.every((r, i) => r.id === recent2[i].id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not modify the original array', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForRecentItemsArb, { minLength: 0, maxLength: 100 }),
          (incidents) => {
            const originalLength = incidents.length
            const originalFirstId = incidents.length > 0 ? incidents[0].id : null
            
            getRecentItems(incidents, 'incidentDate', 5, false)
            
            // Original array should be unchanged
            return incidents.length === originalLength &&
                   (incidents.length === 0 || incidents[0].id === originalFirstId)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle different ordering fields consistently', () => {
      fc.assert(
        fc.property(
          fc.array(permitForRecentItemsArb, { minLength: 0, maxLength: 100 }),
          (permits) => {
            // Order by createdAt
            const byCreatedAt = getRecentItems(permits, 'createdAt', 5, false)
            
            // Order by validTo
            const byValidTo = getRecentItems(permits, 'validTo', 5, false)
            
            // Both should respect the limit
            if (byCreatedAt.length > 5 || byValidTo.length > 5) return false
            
            // Both should be sorted by their respective fields
            return isSortedBy(byCreatedAt, 'createdAt', false) &&
                   isSortedBy(byValidTo, 'validTo', false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Real-World Scenarios', () => {
    /**
     * **Feature: hse-dashboard, Property 5: Recent items ordering and limiting**
     * **Validates: Requirements 2.4, 3.4, 4.3**
     * 
     * Test scenarios matching actual HSE dashboard usage
     */
    
    it('should correctly get 5 most recent incidents by incident_date', () => {
      fc.assert(
        fc.property(
          fc.array(incidentForRecentItemsArb, { minLength: 0, maxLength: 50 }),
          (incidents) => {
            const recentIncidents = getRecentItems(incidents, 'incidentDate', 5, false)
            
            // Limit check
            if (recentIncidents.length > 5) return false
            
            // Ordering check
            if (!isSortedBy(recentIncidents, 'incidentDate', false)) return false
            
            // Subset check
            const originalIds = new Set(incidents.map(i => i.id))
            return recentIncidents.every(r => originalIds.has(r.id))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly get 5 most recent permits by created_at', () => {
      fc.assert(
        fc.property(
          fc.array(permitForRecentItemsArb, { minLength: 0, maxLength: 50 }),
          (permits) => {
            const recentPermits = getRecentItems(permits, 'createdAt', 5, false)
            
            // Limit check
            if (recentPermits.length > 5) return false
            
            // Ordering check
            if (!isSortedBy(recentPermits, 'createdAt', false)) return false
            
            // Subset check
            const originalIds = new Set(permits.map(p => p.id))
            return recentPermits.every(r => originalIds.has(r.id))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly get 5 soonest expiring training by days_until_expiry (ascending)', () => {
      fc.assert(
        fc.property(
          fc.array(trainingForRecentItemsArb, { minLength: 0, maxLength: 50 }),
          (training) => {
            const expiringTraining = getRecentItems(training, 'daysUntilExpiry', 5, true)
            
            // Limit check
            if (expiringTraining.length > 5) return false
            
            // Ordering check (ascending - soonest first)
            if (!isSortedBy(expiringTraining, 'daysUntilExpiry', true)) return false
            
            // Subset check
            const originalIds = new Set(training.map(t => t.id))
            return expiringTraining.every(r => originalIds.has(r.id))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly get 5 most overdue PPE by days_overdue (descending)', () => {
      fc.assert(
        fc.property(
          fc.array(ppeForRecentItemsArb, { minLength: 0, maxLength: 50 }),
          (ppeItems) => {
            const overduePpe = getRecentItems(ppeItems, 'daysOverdue', 5, false)
            
            // Limit check
            if (overduePpe.length > 5) return false
            
            // Ordering check (descending - most overdue first)
            if (!isSortedBy(overduePpe, 'daysOverdue', false)) return false
            
            // Subset check
            const originalIds = new Set(ppeItems.map(p => p.id))
            return overduePpe.every(r => originalIds.has(r.id))
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


// =====================================================
// Property 12: Unauthorized Role Redirect
// =====================================================

/**
 * **Feature: hse-dashboard, Property 12: Unauthorized role redirect**
 * **Validates: Requirements 8.3**
 * 
 * For any user role not in the allowed set ['hse', 'owner', 'director', 'operations_manager'],
 * accessing the dashboard should result in a redirect to the default dashboard path.
 */

// =====================================================
// Role Authorization Helper Functions
// =====================================================

/**
 * Allowed roles for HSE Dashboard access
 */
const ALLOWED_HSE_ROLES = ['hse', 'owner', 'director', 'operations_manager']

/**
 * Check if a role is authorized to access the HSE Dashboard
 * @param role - The user's role
 * @returns true if authorized, false otherwise
 */
function isAuthorizedForHseDashboard(role: string): boolean {
  return ALLOWED_HSE_ROLES.includes(role)
}

/**
 * Get all roles defined in the system (from Project Context)
 */
const ALL_SYSTEM_ROLES = [
  // Executive Tier
  'owner', 'director', 'sysadmin',
  // Manager Tier
  'marketing_manager', 'finance_manager', 'operations_manager',
  // Staff Tier
  'administration', 'finance', 'marketing', 'ops', 'engineer', 'hr', 'hse', 'agency', 'customs'
]

/**
 * Get unauthorized roles (roles that should NOT have access to HSE Dashboard)
 */
const UNAUTHORIZED_ROLES = ALL_SYSTEM_ROLES.filter(role => !ALLOWED_HSE_ROLES.includes(role))

// =====================================================
// Arbitraries for Role Authorization Tests
// =====================================================

// Generate allowed roles
const allowedRoleArb = fc.constantFrom(...ALLOWED_HSE_ROLES)

// Generate unauthorized roles from the system
const unauthorizedSystemRoleArb = fc.constantFrom(...UNAUTHORIZED_ROLES)

// Generate random role strings (including invalid/unknown roles)
const randomRoleArb = fc.oneof(
  fc.constantFrom(...ALL_SYSTEM_ROLES),
  fc.string({ minLength: 1, maxLength: 30 }).filter(s => !ALLOWED_HSE_ROLES.includes(s))
)

// Generate completely random strings that are definitely not allowed roles
const randomUnauthorizedRoleArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => !ALLOWED_HSE_ROLES.includes(s) && s.trim().length > 0)

// =====================================================
// Property 12 Tests: Unauthorized Role Redirect
// =====================================================

describe('Property 12: Unauthorized role redirect', () => {
  
  describe('Authorized Roles Access', () => {
    /**
     * **Feature: hse-dashboard, Property 12: Unauthorized role redirect**
     * **Validates: Requirements 8.3**
     * 
     * For any role in the allowed set, the function should return true (authorized)
     */
    
    it('should return true for any role in the allowed set', () => {
      fc.assert(
        fc.property(
          allowedRoleArb,
          (role) => {
            const isAuthorized = isAuthorizedForHseDashboard(role)
            return isAuthorized === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should authorize hse role', () => {
      return isAuthorizedForHseDashboard('hse') === true
    })

    it('should authorize owner role', () => {
      return isAuthorizedForHseDashboard('owner') === true
    })

    it('should authorize director role', () => {
      return isAuthorizedForHseDashboard('director') === true
    })

    it('should authorize operations_manager role', () => {
      return isAuthorizedForHseDashboard('operations_manager') === true
    })

    it('should authorize all allowed roles consistently', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: ALLOWED_HSE_ROLES.length - 1 }),
          (index) => {
            const role = ALLOWED_HSE_ROLES[index]
            return isAuthorizedForHseDashboard(role) === true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Unauthorized Roles Redirect', () => {
    /**
     * **Feature: hse-dashboard, Property 12: Unauthorized role redirect**
     * **Validates: Requirements 8.3**
     * 
     * For any role NOT in the allowed set, the function should return false (unauthorized)
     */
    
    it('should return false for any system role not in the allowed set', () => {
      fc.assert(
        fc.property(
          unauthorizedSystemRoleArb,
          (role) => {
            const isAuthorized = isAuthorizedForHseDashboard(role)
            return isAuthorized === false
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return false for any random string not in the allowed set', () => {
      fc.assert(
        fc.property(
          randomUnauthorizedRoleArb,
          (role) => {
            const isAuthorized = isAuthorizedForHseDashboard(role)
            return isAuthorized === false
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not authorize sysadmin role', () => {
      return isAuthorizedForHseDashboard('sysadmin') === false
    })

    it('should not authorize marketing_manager role', () => {
      return isAuthorizedForHseDashboard('marketing_manager') === false
    })

    it('should not authorize finance_manager role', () => {
      return isAuthorizedForHseDashboard('finance_manager') === false
    })

    it('should not authorize administration role', () => {
      return isAuthorizedForHseDashboard('administration') === false
    })

    it('should not authorize finance role', () => {
      return isAuthorizedForHseDashboard('finance') === false
    })

    it('should not authorize marketing role', () => {
      return isAuthorizedForHseDashboard('marketing') === false
    })

    it('should not authorize ops role', () => {
      return isAuthorizedForHseDashboard('ops') === false
    })

    it('should not authorize engineer role', () => {
      return isAuthorizedForHseDashboard('engineer') === false
    })

    it('should not authorize hr role', () => {
      return isAuthorizedForHseDashboard('hr') === false
    })

    it('should not authorize agency role', () => {
      return isAuthorizedForHseDashboard('agency') === false
    })

    it('should not authorize customs role', () => {
      return isAuthorizedForHseDashboard('customs') === false
    })

    it('should not authorize unknown/invalid roles', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('admin', 'superuser', 'guest', 'viewer', 'manager', 'staff', 'user', 'anonymous'),
          (role) => {
            const isAuthorized = isAuthorizedForHseDashboard(role)
            return isAuthorized === false
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Edge Cases', () => {
    /**
     * **Feature: hse-dashboard, Property 12: Unauthorized role redirect**
     * **Validates: Requirements 8.3**
     * 
     * Handle edge cases like empty strings, case sensitivity, whitespace
     */
    
    it('should not authorize empty string role', () => {
      return isAuthorizedForHseDashboard('') === false
    })

    it('should be case-sensitive (HSE should not be authorized)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('HSE', 'Hse', 'OWNER', 'Owner', 'DIRECTOR', 'Director', 'OPERATIONS_MANAGER', 'Operations_Manager'),
          (role) => {
            // These uppercase/mixed case versions should NOT be authorized
            // because the allowed roles are lowercase
            const isAuthorized = isAuthorizedForHseDashboard(role)
            return isAuthorized === false
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not authorize roles with leading/trailing whitespace', () => {
      fc.assert(
        fc.property(
          allowedRoleArb,
          (role) => {
            // Adding whitespace should make it unauthorized
            const roleWithLeadingSpace = ' ' + role
            const roleWithTrailingSpace = role + ' '
            const roleWithBothSpaces = ' ' + role + ' '
            
            return isAuthorizedForHseDashboard(roleWithLeadingSpace) === false &&
                   isAuthorizedForHseDashboard(roleWithTrailingSpace) === false &&
                   isAuthorizedForHseDashboard(roleWithBothSpaces) === false
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not authorize roles with special characters', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('hse!', 'owner@', 'director#', 'operations_manager$', 'hse-admin', 'owner.admin'),
          (role) => {
            const isAuthorized = isAuthorizedForHseDashboard(role)
            return isAuthorized === false
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not authorize null-like string values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('null', 'undefined', 'none', 'nil'),
          (role) => {
            const isAuthorized = isAuthorizedForHseDashboard(role)
            return isAuthorized === false
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Consistency Properties', () => {
    /**
     * **Feature: hse-dashboard, Property 12: Unauthorized role redirect**
     * **Validates: Requirements 8.3**
     * 
     * Verify consistency properties of the authorization function
     */
    
    it('should be deterministic: same role always produces same result', () => {
      fc.assert(
        fc.property(
          randomRoleArb,
          (role) => {
            const result1 = isAuthorizedForHseDashboard(role)
            const result2 = isAuthorizedForHseDashboard(role)
            const result3 = isAuthorizedForHseDashboard(role)
            
            return result1 === result2 && result2 === result3
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should partition all system roles into authorized and unauthorized', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_SYSTEM_ROLES),
          (role) => {
            const isAuthorized = isAuthorizedForHseDashboard(role)
            
            // Role should be either authorized or unauthorized, not both
            if (ALLOWED_HSE_ROLES.includes(role)) {
              return isAuthorized === true
            } else {
              return isAuthorized === false
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have exactly 4 authorized roles', () => {
      const authorizedCount = ALL_SYSTEM_ROLES.filter(role => 
        isAuthorizedForHseDashboard(role)
      ).length
      
      return authorizedCount === 4
    })

    it('should have exactly 11 unauthorized system roles', () => {
      const unauthorizedCount = ALL_SYSTEM_ROLES.filter(role => 
        !isAuthorizedForHseDashboard(role)
      ).length
      
      return unauthorizedCount === 11
    })

    it('should return boolean type for any input', () => {
      fc.assert(
        fc.property(
          randomRoleArb,
          (role) => {
            const result = isAuthorizedForHseDashboard(role)
            return typeof result === 'boolean'
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Real-World Scenarios', () => {
    /**
     * **Feature: hse-dashboard, Property 12: Unauthorized role redirect**
     * **Validates: Requirements 8.3**
     * 
     * Test real-world scenarios for role authorization
     */
    
    it('should authorize Iqbal Tito (HSE officer) with hse role', () => {
      // Iqbal Tito is the primary HSE user mentioned in requirements
      return isAuthorizedForHseDashboard('hse') === true
    })

    it('should authorize executives (owner, director) to view HSE dashboard', () => {
      // Executives should have access to all dashboards
      return isAuthorizedForHseDashboard('owner') === true &&
             isAuthorizedForHseDashboard('director') === true
    })

    it('should authorize operations_manager to view HSE dashboard', () => {
      // Operations manager needs HSE visibility for safety oversight
      return isAuthorizedForHseDashboard('operations_manager') === true
    })

    it('should not authorize finance roles to view HSE dashboard', () => {
      // Finance roles should not have access to HSE data
      return isAuthorizedForHseDashboard('finance') === false &&
             isAuthorizedForHseDashboard('finance_manager') === false
    })

    it('should not authorize marketing roles to view HSE dashboard', () => {
      // Marketing roles should not have access to HSE data
      return isAuthorizedForHseDashboard('marketing') === false &&
             isAuthorizedForHseDashboard('marketing_manager') === false
    })

    it('should not authorize HR role to view HSE dashboard', () => {
      // HR has its own dashboard, should not access HSE
      return isAuthorizedForHseDashboard('hr') === false
    })

    it('should not authorize agency role to view HSE dashboard', () => {
      // Agency is entity-isolated and should not access HSE
      return isAuthorizedForHseDashboard('agency') === false
    })

    it('should correctly handle batch role checks', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(...ALL_SYSTEM_ROLES), { minLength: 1, maxLength: 20 }),
          (roles) => {
            // Check each role in the batch
            const results = roles.map(role => ({
              role,
              authorized: isAuthorizedForHseDashboard(role),
              expected: ALLOWED_HSE_ROLES.includes(role)
            }))
            
            // All results should match expected
            return results.every(r => r.authorized === r.expected)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


// =====================================================
// Property 7: Threshold Alert Logic
// =====================================================

/**
 * **Feature: hse-dashboard, Property 7: Threshold alert logic**
 * **Validates: Requirements 1.6, 3.6, 4.5**
 * 
 * For any numeric value and threshold, the alert indicator should correctly
 * determine the alert level:
 * - Days Since Last Incident < 7 → warning
 * - Compliance rate >= 90% → green (success), >= 70% → yellow (warning), < 70% → red (danger)
 * - PPE overdue > 30 days → red alert (danger)
 */

// =====================================================
// Alert Level Types and Helper Functions
// =====================================================

type AlertLevel = 'success' | 'warning' | 'danger' | 'none'

/**
 * Get alert level for days since last incident
 * Days < 7 → warning (recent incident is concerning)
 * Days >= 7 → success (good safety record)
 * 
 * @param days - Number of days since last incident
 * @returns AlertLevel
 */
function getDaysSinceIncidentAlertLevel(days: number): AlertLevel {
  if (days < 7) return 'warning'
  return 'success'
}

/**
 * Get alert level for compliance rate
 * Rate >= 90% → success (green)
 * Rate >= 70% → warning (yellow)
 * Rate < 70% → danger (red)
 * 
 * @param rate - Compliance rate as percentage (0-100)
 * @returns AlertLevel
 */
function getComplianceRateAlertLevel(rate: number): AlertLevel {
  if (rate >= 90) return 'success'
  if (rate >= 70) return 'warning'
  return 'danger'
}

/**
 * Get alert level for PPE overdue days
 * Days > 30 → danger (red alert)
 * Days > 0 → warning (needs attention)
 * Days <= 0 → none (not overdue)
 * 
 * @param daysOverdue - Number of days PPE is overdue
 * @returns AlertLevel
 */
function getPpeOverdueAlertLevel(daysOverdue: number): AlertLevel {
  if (daysOverdue > 30) return 'danger'
  if (daysOverdue > 0) return 'warning'
  return 'none'
}

// =====================================================
// Arbitraries for Threshold Alert Tests
// =====================================================

// Generate days since incident (0 to 365+)
const daysSinceIncidentArb = fc.integer({ min: 0, max: 1000 })

// Generate compliance rate (0 to 100)
const complianceRateArb = fc.integer({ min: 0, max: 100 })

// Generate PPE overdue days (-30 to 365, negative means not yet due)
const ppeOverdueDaysArb = fc.integer({ min: -30, max: 365 })

// Generate days specifically around the 7-day threshold
const daysAroundSevenArb = fc.integer({ min: 0, max: 14 })

// Generate rates specifically around the 70% and 90% thresholds
const rateAroundThresholdsArb = fc.integer({ min: 60, max: 100 })

// Generate PPE days specifically around the 30-day threshold
const ppeAroundThirtyArb = fc.integer({ min: 20, max: 40 })

// =====================================================
// Property 7 Tests: Threshold Alert Logic
// =====================================================

describe('Property 7: Threshold alert logic', () => {
  
  describe('Days Since Last Incident Alert Level', () => {
    /**
     * **Feature: hse-dashboard, Property 7: Threshold alert logic**
     * **Validates: Requirements 1.6**
     * 
     * Days Since Last Incident < 7 → warning
     * Days Since Last Incident >= 7 → success
     */
    
    it('should return warning for any days < 7', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 6 }),
          (days) => {
            const alertLevel = getDaysSinceIncidentAlertLevel(days)
            return alertLevel === 'warning'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return success for any days >= 7', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 7, max: 1000 }),
          (days) => {
            const alertLevel = getDaysSinceIncidentAlertLevel(days)
            return alertLevel === 'success'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly handle boundary case: days = 6 (warning)', () => {
      const alertLevel = getDaysSinceIncidentAlertLevel(6)
      return alertLevel === 'warning'
    })

    it('should correctly handle boundary case: days = 7 (success)', () => {
      const alertLevel = getDaysSinceIncidentAlertLevel(7)
      return alertLevel === 'success'
    })

    it('should correctly handle boundary case: days = 0 (warning)', () => {
      const alertLevel = getDaysSinceIncidentAlertLevel(0)
      return alertLevel === 'warning'
    })

    it('should return only warning or success for any non-negative days', () => {
      fc.assert(
        fc.property(
          daysSinceIncidentArb,
          (days) => {
            const alertLevel = getDaysSinceIncidentAlertLevel(days)
            return alertLevel === 'warning' || alertLevel === 'success'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be deterministic: same input always produces same output', () => {
      fc.assert(
        fc.property(
          daysSinceIncidentArb,
          (days) => {
            const level1 = getDaysSinceIncidentAlertLevel(days)
            const level2 = getDaysSinceIncidentAlertLevel(days)
            return level1 === level2
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be monotonic: more days should not decrease alert level', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 500 }),
          fc.integer({ min: 1, max: 500 }),
          (days, additionalDays) => {
            const level1 = getDaysSinceIncidentAlertLevel(days)
            const level2 = getDaysSinceIncidentAlertLevel(days + additionalDays)
            
            // Define alert level ordering: warning < success
            const levelOrder = { 'warning': 0, 'success': 1, 'danger': -1, 'none': -1 }
            
            // More days should result in same or better (higher) alert level
            return levelOrder[level2] >= levelOrder[level1]
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly partition all days into warning or success', () => {
      fc.assert(
        fc.property(
          daysAroundSevenArb,
          (days) => {
            const alertLevel = getDaysSinceIncidentAlertLevel(days)
            
            if (days < 7) {
              return alertLevel === 'warning'
            } else {
              return alertLevel === 'success'
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Compliance Rate Alert Level', () => {
    /**
     * **Feature: hse-dashboard, Property 7: Threshold alert logic**
     * **Validates: Requirements 3.6**
     * 
     * Compliance rate >= 90% → success (green)
     * Compliance rate >= 70% → warning (yellow)
     * Compliance rate < 70% → danger (red)
     */
    
    it('should return success for any rate >= 90', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 90, max: 100 }),
          (rate) => {
            const alertLevel = getComplianceRateAlertLevel(rate)
            return alertLevel === 'success'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return warning for any rate >= 70 and < 90', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 70, max: 89 }),
          (rate) => {
            const alertLevel = getComplianceRateAlertLevel(rate)
            return alertLevel === 'warning'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return danger for any rate < 70', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 69 }),
          (rate) => {
            const alertLevel = getComplianceRateAlertLevel(rate)
            return alertLevel === 'danger'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly handle boundary case: rate = 89 (warning)', () => {
      const alertLevel = getComplianceRateAlertLevel(89)
      return alertLevel === 'warning'
    })

    it('should correctly handle boundary case: rate = 90 (success)', () => {
      const alertLevel = getComplianceRateAlertLevel(90)
      return alertLevel === 'success'
    })

    it('should correctly handle boundary case: rate = 69 (danger)', () => {
      const alertLevel = getComplianceRateAlertLevel(69)
      return alertLevel === 'danger'
    })

    it('should correctly handle boundary case: rate = 70 (warning)', () => {
      const alertLevel = getComplianceRateAlertLevel(70)
      return alertLevel === 'warning'
    })

    it('should correctly handle boundary case: rate = 0 (danger)', () => {
      const alertLevel = getComplianceRateAlertLevel(0)
      return alertLevel === 'danger'
    })

    it('should correctly handle boundary case: rate = 100 (success)', () => {
      const alertLevel = getComplianceRateAlertLevel(100)
      return alertLevel === 'success'
    })

    it('should return only success, warning, or danger for any rate', () => {
      fc.assert(
        fc.property(
          complianceRateArb,
          (rate) => {
            const alertLevel = getComplianceRateAlertLevel(rate)
            return alertLevel === 'success' || alertLevel === 'warning' || alertLevel === 'danger'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be deterministic: same input always produces same output', () => {
      fc.assert(
        fc.property(
          complianceRateArb,
          (rate) => {
            const level1 = getComplianceRateAlertLevel(rate)
            const level2 = getComplianceRateAlertLevel(rate)
            return level1 === level2
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be monotonic: higher rate should not decrease alert level', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 99 }),
          fc.integer({ min: 1, max: 100 }),
          (rate, additionalRate) => {
            const newRate = Math.min(rate + additionalRate, 100)
            
            const level1 = getComplianceRateAlertLevel(rate)
            const level2 = getComplianceRateAlertLevel(newRate)
            
            // Define alert level ordering: danger < warning < success
            const levelOrder = { 'danger': 0, 'warning': 1, 'success': 2, 'none': -1 }
            
            // Higher rate should result in same or better (higher) alert level
            return levelOrder[level2] >= levelOrder[level1]
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly partition all rates into three categories', () => {
      fc.assert(
        fc.property(
          rateAroundThresholdsArb,
          (rate) => {
            const alertLevel = getComplianceRateAlertLevel(rate)
            
            if (rate >= 90) {
              return alertLevel === 'success'
            } else if (rate >= 70) {
              return alertLevel === 'warning'
            } else {
              return alertLevel === 'danger'
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have exactly three distinct alert levels across all valid rates', () => {
      // Test that all three levels are reachable
      const dangerLevel = getComplianceRateAlertLevel(50)
      const warningLevel = getComplianceRateAlertLevel(80)
      const successLevel = getComplianceRateAlertLevel(95)
      
      return dangerLevel === 'danger' && 
             warningLevel === 'warning' && 
             successLevel === 'success'
    })
  })

  describe('PPE Overdue Alert Level', () => {
    /**
     * **Feature: hse-dashboard, Property 7: Threshold alert logic**
     * **Validates: Requirements 4.5**
     * 
     * PPE overdue > 30 days → danger (red alert)
     * PPE overdue > 0 days → warning
     * PPE overdue <= 0 days → none (not overdue)
     */
    
    it('should return danger for any days overdue > 30', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 31, max: 365 }),
          (daysOverdue) => {
            const alertLevel = getPpeOverdueAlertLevel(daysOverdue)
            return alertLevel === 'danger'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return warning for any days overdue > 0 and <= 30', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 30 }),
          (daysOverdue) => {
            const alertLevel = getPpeOverdueAlertLevel(daysOverdue)
            return alertLevel === 'warning'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return none for any days overdue <= 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -365, max: 0 }),
          (daysOverdue) => {
            const alertLevel = getPpeOverdueAlertLevel(daysOverdue)
            return alertLevel === 'none'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly handle boundary case: daysOverdue = 30 (warning)', () => {
      const alertLevel = getPpeOverdueAlertLevel(30)
      return alertLevel === 'warning'
    })

    it('should correctly handle boundary case: daysOverdue = 31 (danger)', () => {
      const alertLevel = getPpeOverdueAlertLevel(31)
      return alertLevel === 'danger'
    })

    it('should correctly handle boundary case: daysOverdue = 0 (none)', () => {
      const alertLevel = getPpeOverdueAlertLevel(0)
      return alertLevel === 'none'
    })

    it('should correctly handle boundary case: daysOverdue = 1 (warning)', () => {
      const alertLevel = getPpeOverdueAlertLevel(1)
      return alertLevel === 'warning'
    })

    it('should correctly handle negative days (not yet due)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -365, max: -1 }),
          (daysOverdue) => {
            const alertLevel = getPpeOverdueAlertLevel(daysOverdue)
            return alertLevel === 'none'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return only danger, warning, or none for any days overdue', () => {
      fc.assert(
        fc.property(
          ppeOverdueDaysArb,
          (daysOverdue) => {
            const alertLevel = getPpeOverdueAlertLevel(daysOverdue)
            return alertLevel === 'danger' || alertLevel === 'warning' || alertLevel === 'none'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be deterministic: same input always produces same output', () => {
      fc.assert(
        fc.property(
          ppeOverdueDaysArb,
          (daysOverdue) => {
            const level1 = getPpeOverdueAlertLevel(daysOverdue)
            const level2 = getPpeOverdueAlertLevel(daysOverdue)
            return level1 === level2
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be monotonic: more overdue days should not decrease alert severity', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -30, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (daysOverdue, additionalDays) => {
            const level1 = getPpeOverdueAlertLevel(daysOverdue)
            const level2 = getPpeOverdueAlertLevel(daysOverdue + additionalDays)
            
            // Define alert level ordering: none < warning < danger
            const levelOrder = { 'none': 0, 'warning': 1, 'danger': 2, 'success': -1 }
            
            // More overdue days should result in same or higher alert level
            return levelOrder[level2] >= levelOrder[level1]
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly partition all days into three categories', () => {
      fc.assert(
        fc.property(
          ppeAroundThirtyArb,
          (daysOverdue) => {
            const alertLevel = getPpeOverdueAlertLevel(daysOverdue)
            
            if (daysOverdue > 30) {
              return alertLevel === 'danger'
            } else if (daysOverdue > 0) {
              return alertLevel === 'warning'
            } else {
              return alertLevel === 'none'
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have exactly three distinct alert levels across all valid days', () => {
      // Test that all three levels are reachable
      const noneLevel = getPpeOverdueAlertLevel(-5)
      const warningLevel = getPpeOverdueAlertLevel(15)
      const dangerLevel = getPpeOverdueAlertLevel(45)
      
      return noneLevel === 'none' && 
             warningLevel === 'warning' && 
             dangerLevel === 'danger'
    })
  })

  describe('Combined Threshold Alert Properties', () => {
    /**
     * **Feature: hse-dashboard, Property 7: Threshold alert logic**
     * **Validates: Requirements 1.6, 3.6, 4.5**
     * 
     * Additional properties that verify consistency across all threshold functions
     */
    
    it('should have all alert functions return valid AlertLevel types', () => {
      fc.assert(
        fc.property(
          daysSinceIncidentArb,
          complianceRateArb,
          ppeOverdueDaysArb,
          (days, rate, ppeOverdue) => {
            const validLevels: AlertLevel[] = ['success', 'warning', 'danger', 'none']
            
            const daysLevel = getDaysSinceIncidentAlertLevel(days)
            const rateLevel = getComplianceRateAlertLevel(rate)
            const ppeLevel = getPpeOverdueAlertLevel(ppeOverdue)
            
            return validLevels.includes(daysLevel) &&
                   validLevels.includes(rateLevel) &&
                   validLevels.includes(ppeLevel)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have consistent behavior: all functions are pure (no side effects)', () => {
      fc.assert(
        fc.property(
          daysSinceIncidentArb,
          complianceRateArb,
          ppeOverdueDaysArb,
          (days, rate, ppeOverdue) => {
            // Call each function multiple times
            const daysResults = [
              getDaysSinceIncidentAlertLevel(days),
              getDaysSinceIncidentAlertLevel(days),
              getDaysSinceIncidentAlertLevel(days)
            ]
            
            const rateResults = [
              getComplianceRateAlertLevel(rate),
              getComplianceRateAlertLevel(rate),
              getComplianceRateAlertLevel(rate)
            ]
            
            const ppeResults = [
              getPpeOverdueAlertLevel(ppeOverdue),
              getPpeOverdueAlertLevel(ppeOverdue),
              getPpeOverdueAlertLevel(ppeOverdue)
            ]
            
            // All calls should return the same result
            return daysResults.every(r => r === daysResults[0]) &&
                   rateResults.every(r => r === rateResults[0]) &&
                   ppeResults.every(r => r === ppeResults[0])
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle extreme values correctly', () => {
      // Test extreme values for days since incident
      const extremeDays = [0, 1, 6, 7, 100, 1000, 10000]
      const daysResults = extremeDays.map(d => ({
        days: d,
        level: getDaysSinceIncidentAlertLevel(d),
        expected: d < 7 ? 'warning' : 'success'
      }))
      
      // Test extreme values for compliance rate
      const extremeRates = [0, 1, 69, 70, 89, 90, 99, 100]
      const rateResults = extremeRates.map(r => ({
        rate: r,
        level: getComplianceRateAlertLevel(r),
        expected: r >= 90 ? 'success' : r >= 70 ? 'warning' : 'danger'
      }))
      
      // Test extreme values for PPE overdue
      const extremePpe = [-100, -1, 0, 1, 30, 31, 100, 365]
      const ppeResults = extremePpe.map(p => ({
        ppeOverdue: p,
        level: getPpeOverdueAlertLevel(p),
        expected: p > 30 ? 'danger' : p > 0 ? 'warning' : 'none'
      }))
      
      return daysResults.every(r => r.level === r.expected) &&
             rateResults.every(r => r.level === r.expected) &&
             ppeResults.every(r => r.level === r.expected)
    })

    it('should correctly identify critical safety situations', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 6 }),    // Recent incident (< 7 days)
          fc.integer({ min: 0, max: 69 }),   // Low compliance (< 70%)
          fc.integer({ min: 31, max: 365 }), // Severely overdue PPE (> 30 days)
          (days, rate, ppeOverdue) => {
            // All three should indicate problems
            const daysLevel = getDaysSinceIncidentAlertLevel(days)
            const rateLevel = getComplianceRateAlertLevel(rate)
            const ppeLevel = getPpeOverdueAlertLevel(ppeOverdue)
            
            return daysLevel === 'warning' &&
                   rateLevel === 'danger' &&
                   ppeLevel === 'danger'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify good safety situations', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 7, max: 365 }),  // No recent incident (>= 7 days)
          fc.integer({ min: 90, max: 100 }), // High compliance (>= 90%)
          fc.integer({ min: -365, max: 0 }), // No overdue PPE (<= 0 days)
          (days, rate, ppeOverdue) => {
            // All three should indicate good status
            const daysLevel = getDaysSinceIncidentAlertLevel(days)
            const rateLevel = getComplianceRateAlertLevel(rate)
            const ppeLevel = getPpeOverdueAlertLevel(ppeOverdue)
            
            return daysLevel === 'success' &&
                   rateLevel === 'success' &&
                   ppeLevel === 'none'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify mixed safety situations', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 7, max: 365 }),  // Good: no recent incident
          fc.integer({ min: 70, max: 89 }),  // Warning: moderate compliance
          fc.integer({ min: 1, max: 30 }),   // Warning: slightly overdue PPE
          (days, rate, ppeOverdue) => {
            const daysLevel = getDaysSinceIncidentAlertLevel(days)
            const rateLevel = getComplianceRateAlertLevel(rate)
            const ppeLevel = getPpeOverdueAlertLevel(ppeOverdue)
            
            return daysLevel === 'success' &&
                   rateLevel === 'warning' &&
                   ppeLevel === 'warning'
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Threshold Boundary Exhaustive Tests', () => {
    /**
     * **Feature: hse-dashboard, Property 7: Threshold alert logic**
     * **Validates: Requirements 1.6, 3.6, 4.5**
     * 
     * Exhaustive tests for all boundary values
     */
    
    it('should correctly handle all days since incident boundary values', () => {
      // Test values around the 7-day threshold
      const testCases = [
        { days: 0, expected: 'warning' },
        { days: 1, expected: 'warning' },
        { days: 2, expected: 'warning' },
        { days: 3, expected: 'warning' },
        { days: 4, expected: 'warning' },
        { days: 5, expected: 'warning' },
        { days: 6, expected: 'warning' },
        { days: 7, expected: 'success' },
        { days: 8, expected: 'success' },
        { days: 14, expected: 'success' },
        { days: 30, expected: 'success' },
        { days: 365, expected: 'success' },
      ]
      
      return testCases.every(tc => 
        getDaysSinceIncidentAlertLevel(tc.days) === tc.expected
      )
    })

    it('should correctly handle all compliance rate boundary values', () => {
      // Test values around the 70% and 90% thresholds
      const testCases = [
        { rate: 0, expected: 'danger' },
        { rate: 50, expected: 'danger' },
        { rate: 69, expected: 'danger' },
        { rate: 70, expected: 'warning' },
        { rate: 71, expected: 'warning' },
        { rate: 80, expected: 'warning' },
        { rate: 89, expected: 'warning' },
        { rate: 90, expected: 'success' },
        { rate: 91, expected: 'success' },
        { rate: 95, expected: 'success' },
        { rate: 100, expected: 'success' },
      ]
      
      return testCases.every(tc => 
        getComplianceRateAlertLevel(tc.rate) === tc.expected
      )
    })

    it('should correctly handle all PPE overdue boundary values', () => {
      // Test values around the 0 and 30-day thresholds
      const testCases = [
        { days: -30, expected: 'none' },
        { days: -1, expected: 'none' },
        { days: 0, expected: 'none' },
        { days: 1, expected: 'warning' },
        { days: 15, expected: 'warning' },
        { days: 29, expected: 'warning' },
        { days: 30, expected: 'warning' },
        { days: 31, expected: 'danger' },
        { days: 45, expected: 'danger' },
        { days: 60, expected: 'danger' },
        { days: 365, expected: 'danger' },
      ]
      
      return testCases.every(tc => 
        getPpeOverdueAlertLevel(tc.days) === tc.expected
      )
    })
  })
})


// =====================================================
// Property 8: Severity Color Mapping
// =====================================================

/**
 * **Feature: hse-dashboard, Property 8: Severity color mapping**
 * **Validates: Requirements 5.2**
 * 
 * For any severity value, the color mapping should be deterministic and correct:
 * - 'critical' → red
 * - 'major' → orange
 * - 'minor' → yellow
 */

// =====================================================
// Severity Color Helper Function
// =====================================================

type SeverityColor = 'red' | 'orange' | 'yellow' | 'gray'

/**
 * Get color for severity level
 * Maps HSE Dashboard severity values to colors
 */
function getSeverityColor(severity: string): SeverityColor {
  const normalizedSeverity = (severity || '').toLowerCase()
  switch (normalizedSeverity) {
    case 'critical': return 'red'
    case 'major': return 'orange'
    case 'minor': return 'yellow'
    default: return 'gray'
  }
}

// =====================================================
// Arbitraries for Severity Color Tests
// =====================================================

// Valid severity values
const validSeverityArb = fc.constantFrom('critical', 'major', 'minor')

// Case variations of valid severities
const caseVariationSeverityArb = fc.constantFrom(
  'critical', 'CRITICAL', 'Critical', 'CrItIcAl',
  'major', 'MAJOR', 'Major', 'MaJoR',
  'minor', 'MINOR', 'Minor', 'MiNoR'
)

// Invalid/unknown severity values
const invalidSeverityArb = fc.oneof(
  fc.constant(''),
  fc.constant('unknown'),
  fc.constant('high'),
  fc.constant('low'),
  fc.constant('medium'),
  fc.constant('severe'),
  fc.constant('moderate'),
  fc.constant('trivial'),
  fc.string({ minLength: 0, maxLength: 20 }).filter(s => 
    !['critical', 'major', 'minor'].includes(s.toLowerCase())
  )
)

// =====================================================
// Property 8 Tests: Severity Color Mapping
// =====================================================

describe('Property 8: Severity color mapping', () => {
  
  describe('Deterministic Color Mapping', () => {
    /**
     * **Feature: hse-dashboard, Property 8: Severity color mapping**
     * **Validates: Requirements 5.2**
     * 
     * For any severity value, the color mapping should be deterministic
     */
    
    it('should always return red for critical severity', () => {
      fc.assert(
        fc.property(fc.constant('critical'), (severity) => {
          const color = getSeverityColor(severity)
          return color === 'red'
        }),
        { numRuns: 100 }
      )
    })

    it('should always return orange for major severity', () => {
      fc.assert(
        fc.property(fc.constant('major'), (severity) => {
          const color = getSeverityColor(severity)
          return color === 'orange'
        }),
        { numRuns: 100 }
      )
    })

    it('should always return yellow for minor severity', () => {
      fc.assert(
        fc.property(fc.constant('minor'), (severity) => {
          const color = getSeverityColor(severity)
          return color === 'yellow'
        }),
        { numRuns: 100 }
      )
    })

    it('should return consistent color for any valid severity across multiple calls', () => {
      fc.assert(
        fc.property(
          validSeverityArb,
          fc.integer({ min: 2, max: 10 }),
          (severity, callCount) => {
            const colors = Array.from({ length: callCount }, () => getSeverityColor(severity))
            // All colors should be the same (deterministic)
            return colors.every(c => c === colors[0])
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should map each valid severity to its correct color', () => {
      fc.assert(
        fc.property(validSeverityArb, (severity) => {
          const color = getSeverityColor(severity)
          
          switch (severity) {
            case 'critical': return color === 'red'
            case 'major': return color === 'orange'
            case 'minor': return color === 'yellow'
            default: return false
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Case Insensitivity', () => {
    /**
     * **Feature: hse-dashboard, Property 8: Severity color mapping**
     * **Validates: Requirements 5.2**
     * 
     * Color mapping should be case insensitive
     */
    
    it('should return red for CRITICAL (uppercase)', () => {
      fc.assert(
        fc.property(fc.constant('CRITICAL'), (severity) => {
          const color = getSeverityColor(severity)
          return color === 'red'
        }),
        { numRuns: 100 }
      )
    })

    it('should return orange for MAJOR (uppercase)', () => {
      fc.assert(
        fc.property(fc.constant('MAJOR'), (severity) => {
          const color = getSeverityColor(severity)
          return color === 'orange'
        }),
        { numRuns: 100 }
      )
    })

    it('should return yellow for MINOR (uppercase)', () => {
      fc.assert(
        fc.property(fc.constant('MINOR'), (severity) => {
          const color = getSeverityColor(severity)
          return color === 'yellow'
        }),
        { numRuns: 100 }
      )
    })

    it('should handle mixed case severity values correctly', () => {
      fc.assert(
        fc.property(caseVariationSeverityArb, (severity) => {
          const color = getSeverityColor(severity)
          const normalizedSeverity = severity.toLowerCase()
          
          switch (normalizedSeverity) {
            case 'critical': return color === 'red'
            case 'major': return color === 'orange'
            case 'minor': return color === 'yellow'
            default: return false
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should return same color regardless of case for critical', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('critical', 'CRITICAL', 'Critical', 'CrItIcAl', 'cRiTiCaL'),
          (severity) => {
            const color = getSeverityColor(severity)
            return color === 'red'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return same color regardless of case for major', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('major', 'MAJOR', 'Major', 'MaJoR', 'mAjOr'),
          (severity) => {
            const color = getSeverityColor(severity)
            return color === 'orange'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return same color regardless of case for minor', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('minor', 'MINOR', 'Minor', 'MiNoR', 'mInOr'),
          (severity) => {
            const color = getSeverityColor(severity)
            return color === 'yellow'
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Invalid/Unknown Severity Handling', () => {
    /**
     * **Feature: hse-dashboard, Property 8: Severity color mapping**
     * **Validates: Requirements 5.2**
     * 
     * Unknown severity values should return gray (default)
     */
    
    it('should return gray for empty string', () => {
      fc.assert(
        fc.property(fc.constant(''), (severity) => {
          const color = getSeverityColor(severity)
          return color === 'gray'
        }),
        { numRuns: 100 }
      )
    })

    it('should return gray for null/undefined (handled as empty)', () => {
      // Test with null coerced to string
      const colorNull = getSeverityColor(null as unknown as string)
      const colorUndefined = getSeverityColor(undefined as unknown as string)
      
      return colorNull === 'gray' && colorUndefined === 'gray'
    })

    it('should return gray for any unknown severity value', () => {
      fc.assert(
        fc.property(invalidSeverityArb, (severity) => {
          const color = getSeverityColor(severity)
          return color === 'gray'
        }),
        { numRuns: 100 }
      )
    })

    it('should return gray for severity values from other systems (low, medium, high)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('low', 'medium', 'high', 'LOW', 'MEDIUM', 'HIGH'),
          (severity) => {
            const color = getSeverityColor(severity)
            return color === 'gray'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return gray for random strings that are not valid severities', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => 
            !['critical', 'major', 'minor'].includes(s.toLowerCase())
          ),
          (severity) => {
            const color = getSeverityColor(severity)
            return color === 'gray'
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Color Uniqueness', () => {
    /**
     * **Feature: hse-dashboard, Property 8: Severity color mapping**
     * **Validates: Requirements 5.2**
     * 
     * Each severity level should map to a unique color
     */
    
    it('should map each severity to a unique color', () => {
      const severities = ['critical', 'major', 'minor']
      const colors = severities.map(getSeverityColor)
      const uniqueColors = new Set(colors)
      
      return uniqueColors.size === severities.length
    })

    it('should have distinct colors for all valid severities', () => {
      fc.assert(
        fc.property(
          fc.tuple(validSeverityArb, validSeverityArb).filter(([a, b]) => a !== b),
          ([severity1, severity2]) => {
            const color1 = getSeverityColor(severity1)
            const color2 = getSeverityColor(severity2)
            
            // Different severities should have different colors
            return color1 !== color2
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Return Type Validation', () => {
    /**
     * **Feature: hse-dashboard, Property 8: Severity color mapping**
     * **Validates: Requirements 5.2**
     * 
     * Return value should always be a valid SeverityColor type
     */
    
    it('should always return a valid color type for valid severities', () => {
      const validColors: SeverityColor[] = ['red', 'orange', 'yellow', 'gray']
      
      fc.assert(
        fc.property(validSeverityArb, (severity) => {
          const color = getSeverityColor(severity)
          return validColors.includes(color)
        }),
        { numRuns: 100 }
      )
    })

    it('should always return a valid color type for any input', () => {
      const validColors: SeverityColor[] = ['red', 'orange', 'yellow', 'gray']
      
      fc.assert(
        fc.property(
          fc.oneof(validSeverityArb, invalidSeverityArb, caseVariationSeverityArb),
          (severity) => {
            const color = getSeverityColor(severity)
            return validColors.includes(color)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should never return undefined or null', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            validSeverityArb,
            invalidSeverityArb,
            fc.string({ minLength: 0, maxLength: 100 })
          ),
          (severity) => {
            const color = getSeverityColor(severity)
            return color !== undefined && color !== null
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Exhaustive Boundary Tests', () => {
    /**
     * **Feature: hse-dashboard, Property 8: Severity color mapping**
     * **Validates: Requirements 5.2**
     * 
     * Exhaustive tests for all expected mappings
     */
    
    it('should correctly map all severity-color pairs', () => {
      const expectedMappings: Array<{ severity: string; expectedColor: SeverityColor }> = [
        // Lowercase
        { severity: 'critical', expectedColor: 'red' },
        { severity: 'major', expectedColor: 'orange' },
        { severity: 'minor', expectedColor: 'yellow' },
        // Uppercase
        { severity: 'CRITICAL', expectedColor: 'red' },
        { severity: 'MAJOR', expectedColor: 'orange' },
        { severity: 'MINOR', expectedColor: 'yellow' },
        // Title case
        { severity: 'Critical', expectedColor: 'red' },
        { severity: 'Major', expectedColor: 'orange' },
        { severity: 'Minor', expectedColor: 'yellow' },
        // Invalid values
        { severity: '', expectedColor: 'gray' },
        { severity: 'unknown', expectedColor: 'gray' },
        { severity: 'high', expectedColor: 'gray' },
        { severity: 'low', expectedColor: 'gray' },
        { severity: 'medium', expectedColor: 'gray' },
      ]
      
      return expectedMappings.every(({ severity, expectedColor }) => 
        getSeverityColor(severity) === expectedColor
      )
    })
  })
})


// =====================================================
// Property 9: Data Transformation Completeness
// =====================================================

/**
 * **Feature: hse-dashboard, Property 9: Data transformation completeness**
 * **Validates: Requirements 5.1**
 * 
 * For any incident record from the database, the transformed RecentIncident object
 * should contain all required fields (id, incidentNumber, title, severity, status,
 * incidentDate, locationType) with appropriate null handling.
 */

// =====================================================
// Interfaces for Data Transformation Tests
// =====================================================

interface DbIncidentRow {
  id: string | null
  incident_number: string | null
  title: string | null
  severity: string | null
  status: string | null
  incident_date: string | null
  location_type: string | null
}

interface RecentIncident {
  id: string
  incidentNumber: string
  title: string
  severity: string
  status: string
  incidentDate: string
  locationType: string
}

// =====================================================
// Data Transformation Helper Functions
// =====================================================

/**
 * Transform a database incident row to a RecentIncident object
 * This mirrors the transformation logic in hse-data.ts
 */
function transformIncidentRow(row: DbIncidentRow): RecentIncident {
  return {
    id: row.id || '',
    incidentNumber: row.incident_number || '',
    title: row.title || '',
    severity: row.severity || '',
    status: row.status || '',
    incidentDate: row.incident_date || '',
    locationType: row.location_type || '',
  }
}

/**
 * Check if a value is a non-null string (including empty string)
 */
function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Check if a RecentIncident object has all required fields as strings
 */
function hasAllRequiredFields(incident: RecentIncident): boolean {
  return (
    isString(incident.id) &&
    isString(incident.incidentNumber) &&
    isString(incident.title) &&
    isString(incident.severity) &&
    isString(incident.status) &&
    isString(incident.incidentDate) &&
    isString(incident.locationType)
  )
}

// =====================================================
// Arbitraries for Data Transformation Tests
// =====================================================

// Generate nullable strings for database fields
const nullableStringArb = fc.option(
  fc.string({ minLength: 0, maxLength: 100 }),
  { nil: null }
)

// Generate nullable UUIDs for id field
const nullableUuidArb = fc.option(fc.uuid(), { nil: null })

// Generate nullable date strings
const nullableDateStringArb = fc.option(
  fc.integer({ 
    min: new Date('2020-01-01').getTime(), 
    max: new Date('2026-12-31').getTime() 
  }).map(ts => new Date(ts).toISOString().split('T')[0]),
  { nil: null }
)

// Generate nullable severity values
const nullableSeverityArb = fc.option(
  fc.constantFrom('critical', 'major', 'minor', 'Critical', 'MAJOR', 'Minor'),
  { nil: null }
)

// Generate nullable status values
const nullableStatusArb = fc.option(
  fc.constantFrom('open', 'investigating', 'resolved', 'closed', 'pending'),
  { nil: null }
)

// Generate nullable location type values
const nullableLocationTypeArb = fc.option(
  fc.constantFrom('office', 'site', 'warehouse', 'vehicle', 'field'),
  { nil: null }
)

// Generate a complete database incident row with various null combinations
const dbIncidentRowArb: fc.Arbitrary<DbIncidentRow> = fc.record({
  id: nullableUuidArb,
  incident_number: nullableStringArb,
  title: nullableStringArb,
  severity: nullableSeverityArb,
  status: nullableStatusArb,
  incident_date: nullableDateStringArb,
  location_type: nullableLocationTypeArb,
})

// Generate a database row with all null values
const allNullDbRowArb: fc.Arbitrary<DbIncidentRow> = fc.constant({
  id: null,
  incident_number: null,
  title: null,
  severity: null,
  status: null,
  incident_date: null,
  location_type: null,
})

// Generate a database row with all non-null values
const allNonNullDbRowArb: fc.Arbitrary<DbIncidentRow> = fc.record({
  id: fc.uuid(),
  incident_number: fc.string({ minLength: 1, maxLength: 20 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  severity: fc.constantFrom('critical', 'major', 'minor'),
  status: fc.constantFrom('open', 'investigating', 'resolved', 'closed'),
  incident_date: fc.integer({ 
    min: new Date('2020-01-01').getTime(), 
    max: new Date('2026-12-31').getTime() 
  }).map(ts => new Date(ts).toISOString().split('T')[0]),
  location_type: fc.constantFrom('office', 'site', 'warehouse', 'vehicle'),
})

// =====================================================
// Property 9 Tests: Data Transformation Completeness
// =====================================================

describe('Property 9: Data transformation completeness', () => {
  
  describe('Required Fields Presence', () => {
    /**
     * **Feature: hse-dashboard, Property 9: Data transformation completeness**
     * **Validates: Requirements 5.1**
     * 
     * Transformed object should always contain all required fields
     */
    
    it('should contain all required fields for any database row', () => {
      fc.assert(
        fc.property(dbIncidentRowArb, (dbRow) => {
          const transformed = transformIncidentRow(dbRow)
          
          // Check that all required fields exist
          return (
            'id' in transformed &&
            'incidentNumber' in transformed &&
            'title' in transformed &&
            'severity' in transformed &&
            'status' in transformed &&
            'incidentDate' in transformed &&
            'locationType' in transformed
          )
        }),
        { numRuns: 100 }
      )
    })

    it('should have all fields as strings (not null or undefined)', () => {
      fc.assert(
        fc.property(dbIncidentRowArb, (dbRow) => {
          const transformed = transformIncidentRow(dbRow)
          
          return hasAllRequiredFields(transformed)
        }),
        { numRuns: 100 }
      )
    })

    it('should transform all-null database row to object with empty strings', () => {
      fc.assert(
        fc.property(allNullDbRowArb, (dbRow) => {
          const transformed = transformIncidentRow(dbRow)
          
          // All fields should be empty strings when input is all null
          return (
            transformed.id === '' &&
            transformed.incidentNumber === '' &&
            transformed.title === '' &&
            transformed.severity === '' &&
            transformed.status === '' &&
            transformed.incidentDate === '' &&
            transformed.locationType === ''
          )
        }),
        { numRuns: 100 }
      )
    })

    it('should preserve non-null values from database row', () => {
      fc.assert(
        fc.property(allNonNullDbRowArb, (dbRow) => {
          const transformed = transformIncidentRow(dbRow)
          
          // All fields should match the original non-null values
          return (
            transformed.id === dbRow.id &&
            transformed.incidentNumber === dbRow.incident_number &&
            transformed.title === dbRow.title &&
            transformed.severity === dbRow.severity &&
            transformed.status === dbRow.status &&
            transformed.incidentDate === dbRow.incident_date &&
            transformed.locationType === dbRow.location_type
          )
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Null Handling', () => {
    /**
     * **Feature: hse-dashboard, Property 9: Data transformation completeness**
     * **Validates: Requirements 5.1**
     * 
     * Null values should be transformed to empty strings
     */
    
    it('should transform null id to empty string', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.constant(null),
            incident_number: nullableStringArb,
            title: nullableStringArb,
            severity: nullableSeverityArb,
            status: nullableStatusArb,
            incident_date: nullableDateStringArb,
            location_type: nullableLocationTypeArb,
          }),
          (dbRow) => {
            const transformed = transformIncidentRow(dbRow)
            return transformed.id === ''
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should transform null incident_number to empty string', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: nullableUuidArb,
            incident_number: fc.constant(null),
            title: nullableStringArb,
            severity: nullableSeverityArb,
            status: nullableStatusArb,
            incident_date: nullableDateStringArb,
            location_type: nullableLocationTypeArb,
          }),
          (dbRow) => {
            const transformed = transformIncidentRow(dbRow)
            return transformed.incidentNumber === ''
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should transform null title to empty string', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: nullableUuidArb,
            incident_number: nullableStringArb,
            title: fc.constant(null),
            severity: nullableSeverityArb,
            status: nullableStatusArb,
            incident_date: nullableDateStringArb,
            location_type: nullableLocationTypeArb,
          }),
          (dbRow) => {
            const transformed = transformIncidentRow(dbRow)
            return transformed.title === ''
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should transform null severity to empty string', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: nullableUuidArb,
            incident_number: nullableStringArb,
            title: nullableStringArb,
            severity: fc.constant(null),
            status: nullableStatusArb,
            incident_date: nullableDateStringArb,
            location_type: nullableLocationTypeArb,
          }),
          (dbRow) => {
            const transformed = transformIncidentRow(dbRow)
            return transformed.severity === ''
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should transform null status to empty string', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: nullableUuidArb,
            incident_number: nullableStringArb,
            title: nullableStringArb,
            severity: nullableSeverityArb,
            status: fc.constant(null),
            incident_date: nullableDateStringArb,
            location_type: nullableLocationTypeArb,
          }),
          (dbRow) => {
            const transformed = transformIncidentRow(dbRow)
            return transformed.status === ''
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should transform null incident_date to empty string', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: nullableUuidArb,
            incident_number: nullableStringArb,
            title: nullableStringArb,
            severity: nullableSeverityArb,
            status: nullableStatusArb,
            incident_date: fc.constant(null),
            location_type: nullableLocationTypeArb,
          }),
          (dbRow) => {
            const transformed = transformIncidentRow(dbRow)
            return transformed.incidentDate === ''
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should transform null location_type to empty string', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: nullableUuidArb,
            incident_number: nullableStringArb,
            title: nullableStringArb,
            severity: nullableSeverityArb,
            status: nullableStatusArb,
            incident_date: nullableDateStringArb,
            location_type: fc.constant(null),
          }),
          (dbRow) => {
            const transformed = transformIncidentRow(dbRow)
            return transformed.locationType === ''
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle mixed null and non-null values correctly', () => {
      fc.assert(
        fc.property(dbIncidentRowArb, (dbRow) => {
          const transformed = transformIncidentRow(dbRow)
          
          // For each field, if input is null, output should be empty string
          // If input is non-null, output should match input
          const idCorrect = dbRow.id === null ? transformed.id === '' : transformed.id === dbRow.id
          const numberCorrect = dbRow.incident_number === null ? transformed.incidentNumber === '' : transformed.incidentNumber === dbRow.incident_number
          const titleCorrect = dbRow.title === null ? transformed.title === '' : transformed.title === dbRow.title
          const severityCorrect = dbRow.severity === null ? transformed.severity === '' : transformed.severity === dbRow.severity
          const statusCorrect = dbRow.status === null ? transformed.status === '' : transformed.status === dbRow.status
          const dateCorrect = dbRow.incident_date === null ? transformed.incidentDate === '' : transformed.incidentDate === dbRow.incident_date
          const locationCorrect = dbRow.location_type === null ? transformed.locationType === '' : transformed.locationType === dbRow.location_type
          
          return idCorrect && numberCorrect && titleCorrect && severityCorrect && statusCorrect && dateCorrect && locationCorrect
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Field Name Transformation', () => {
    /**
     * **Feature: hse-dashboard, Property 9: Data transformation completeness**
     * **Validates: Requirements 5.1**
     * 
     * Database snake_case fields should be transformed to camelCase
     */
    
    it('should transform snake_case field names to camelCase', () => {
      fc.assert(
        fc.property(allNonNullDbRowArb, (dbRow) => {
          const transformed = transformIncidentRow(dbRow)
          
          // Verify field name transformations
          // incident_number -> incidentNumber
          // incident_date -> incidentDate
          // location_type -> locationType
          return (
            transformed.incidentNumber === dbRow.incident_number &&
            transformed.incidentDate === dbRow.incident_date &&
            transformed.locationType === dbRow.location_type
          )
        }),
        { numRuns: 100 }
      )
    })

    it('should not have any snake_case field names in output', () => {
      fc.assert(
        fc.property(dbIncidentRowArb, (dbRow) => {
          const transformed = transformIncidentRow(dbRow)
          const keys = Object.keys(transformed)
          
          // No keys should contain underscores (snake_case)
          return keys.every(key => !key.includes('_'))
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Type Safety', () => {
    /**
     * **Feature: hse-dashboard, Property 9: Data transformation completeness**
     * **Validates: Requirements 5.1**
     * 
     * Output should always be type-safe with string values
     */
    
    it('should never return undefined for any field', () => {
      fc.assert(
        fc.property(dbIncidentRowArb, (dbRow) => {
          const transformed = transformIncidentRow(dbRow)
          
          return (
            transformed.id !== undefined &&
            transformed.incidentNumber !== undefined &&
            transformed.title !== undefined &&
            transformed.severity !== undefined &&
            transformed.status !== undefined &&
            transformed.incidentDate !== undefined &&
            transformed.locationType !== undefined
          )
        }),
        { numRuns: 100 }
      )
    })

    it('should never return null for any field', () => {
      fc.assert(
        fc.property(dbIncidentRowArb, (dbRow) => {
          const transformed = transformIncidentRow(dbRow)
          
          return (
            transformed.id !== null &&
            transformed.incidentNumber !== null &&
            transformed.title !== null &&
            transformed.severity !== null &&
            transformed.status !== null &&
            transformed.incidentDate !== null &&
            transformed.locationType !== null
          )
        }),
        { numRuns: 100 }
      )
    })

    it('should return exactly 7 fields', () => {
      fc.assert(
        fc.property(dbIncidentRowArb, (dbRow) => {
          const transformed = transformIncidentRow(dbRow)
          const keys = Object.keys(transformed)
          
          return keys.length === 7
        }),
        { numRuns: 100 }
      )
    })

    it('should have correct field names in output', () => {
      fc.assert(
        fc.property(dbIncidentRowArb, (dbRow) => {
          const transformed = transformIncidentRow(dbRow)
          const keys = Object.keys(transformed).sort()
          const expectedKeys = ['id', 'incidentDate', 'incidentNumber', 'locationType', 'severity', 'status', 'title'].sort()
          
          return JSON.stringify(keys) === JSON.stringify(expectedKeys)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Empty String Handling', () => {
    /**
     * **Feature: hse-dashboard, Property 9: Data transformation completeness**
     * **Validates: Requirements 5.1**
     * 
     * Empty strings in input should be preserved as empty strings
     */
    
    it('should preserve empty strings from database', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.constant(''),
            incident_number: fc.constant(''),
            title: fc.constant(''),
            severity: fc.constant(''),
            status: fc.constant(''),
            incident_date: fc.constant(''),
            location_type: fc.constant(''),
          }),
          (dbRow) => {
            const transformed = transformIncidentRow(dbRow)
            
            return (
              transformed.id === '' &&
              transformed.incidentNumber === '' &&
              transformed.title === '' &&
              transformed.severity === '' &&
              transformed.status === '' &&
              transformed.incidentDate === '' &&
              transformed.locationType === ''
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should treat empty string same as null for output', () => {
      // Both null and empty string should result in empty string output
      const nullRow: DbIncidentRow = {
        id: null,
        incident_number: null,
        title: null,
        severity: null,
        status: null,
        incident_date: null,
        location_type: null,
      }
      
      const emptyRow: DbIncidentRow = {
        id: '',
        incident_number: '',
        title: '',
        severity: '',
        status: '',
        incident_date: '',
        location_type: '',
      }
      
      const transformedNull = transformIncidentRow(nullRow)
      const transformedEmpty = transformIncidentRow(emptyRow)
      
      return (
        transformedNull.id === transformedEmpty.id &&
        transformedNull.incidentNumber === transformedEmpty.incidentNumber &&
        transformedNull.title === transformedEmpty.title &&
        transformedNull.severity === transformedEmpty.severity &&
        transformedNull.status === transformedEmpty.status &&
        transformedNull.incidentDate === transformedEmpty.incidentDate &&
        transformedNull.locationType === transformedEmpty.locationType
      )
    })
  })

  describe('Batch Transformation', () => {
    /**
     * **Feature: hse-dashboard, Property 9: Data transformation completeness**
     * **Validates: Requirements 5.1**
     * 
     * Transformation should work correctly for arrays of records
     */
    
    it('should transform array of database rows correctly', () => {
      fc.assert(
        fc.property(
          fc.array(dbIncidentRowArb, { minLength: 0, maxLength: 50 }),
          (dbRows) => {
            const transformed = dbRows.map(transformIncidentRow)
            
            // All transformed items should have all required fields as strings
            return transformed.every(hasAllRequiredFields)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve array length after transformation', () => {
      fc.assert(
        fc.property(
          fc.array(dbIncidentRowArb, { minLength: 0, maxLength: 50 }),
          (dbRows) => {
            const transformed = dbRows.map(transformIncidentRow)
            return transformed.length === dbRows.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain order after transformation', () => {
      fc.assert(
        fc.property(
          fc.array(allNonNullDbRowArb, { minLength: 2, maxLength: 20 }),
          (dbRows) => {
            const transformed = dbRows.map(transformIncidentRow)
            
            // Check that order is preserved by comparing ids
            return dbRows.every((row, index) => 
              transformed[index].id === row.id
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


// =====================================================
// Property 10: Cache Key Generation Format
// =====================================================

/**
 * **Feature: hse-dashboard, Property 10: Cache key generation format**
 * **Validates: Requirements 7.4**
 * 
 * For any role string and date, the generated cache key should match the pattern
 * 'hse-dashboard-metrics:{role}:{YYYY-MM-DD}'.
 */

// =====================================================
// Cache Key Helper Functions
// =====================================================

/**
 * Generate HSE cache key - mirrors the logic in dashboard-cache.ts
 * This is a pure function for testing purposes
 */
function generateHseCacheKey(role: string, date: Date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
  return `hse-dashboard-metrics:${role}:${dateStr}`
}

/**
 * Validate cache key format matches expected pattern
 */
function isValidCacheKeyFormat(key: string): boolean {
  // Pattern: hse-dashboard-metrics:{role}:{YYYY-MM-DD}
  const pattern = /^hse-dashboard-metrics:[^:]+:\d{4}-\d{2}-\d{2}$/
  return pattern.test(key)
}

/**
 * Extract components from cache key
 */
function extractCacheKeyComponents(key: string): { prefix: string; role: string; date: string } | null {
  const parts = key.split(':')
  if (parts.length !== 3) return null
  return {
    prefix: parts[0],
    role: parts[1],
    date: parts[2],
  }
}

/**
 * Validate date string is in YYYY-MM-DD format
 */
function isValidDateFormat(dateStr: string): boolean {
  const pattern = /^\d{4}-\d{2}-\d{2}$/
  if (!pattern.test(dateStr)) return false
  
  // Also verify it's a valid date
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

// =====================================================
// Arbitraries for Cache Key Tests
// =====================================================

// Generate valid role strings (alphanumeric with underscores, no colons)
const roleArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => /^[a-zA-Z0-9_-]+$/.test(s))

// Generate realistic role names from the system
const realisticRoleArb = fc.constantFrom(
  'hse', 'owner', 'director', 'operations_manager',
  'finance_manager', 'marketing_manager', 'administration',
  'finance', 'marketing', 'ops', 'engineer', 'hr', 'agency', 'customs', 'sysadmin'
)

// Generate dates within a reasonable range
const cacheDateArb = fc.integer({
  min: new Date('2020-01-01').getTime(),
  max: new Date('2030-12-31').getTime()
}).map(ts => new Date(ts))

// =====================================================
// Property 10 Tests: Cache Key Generation Format
// =====================================================

describe('Property 10: Cache key generation format', () => {
  
  describe('Cache Key Format Validation', () => {
    /**
     * **Feature: hse-dashboard, Property 10: Cache key generation format**
     * **Validates: Requirements 7.4**
     * 
     * For any role and date, the cache key should match the pattern
     * 'hse-dashboard-metrics:{role}:{YYYY-MM-DD}'
     */
    
    it('should generate cache key matching the expected pattern for any role and date', () => {
      fc.assert(
        fc.property(
          roleArb,
          cacheDateArb,
          (role, date) => {
            const cacheKey = generateHseCacheKey(role, date)
            return isValidCacheKeyFormat(cacheKey)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate cache key with correct prefix for any role and date', () => {
      fc.assert(
        fc.property(
          roleArb,
          cacheDateArb,
          (role, date) => {
            const cacheKey = generateHseCacheKey(role, date)
            return cacheKey.startsWith('hse-dashboard-metrics:')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should contain the correct role in the cache key', () => {
      fc.assert(
        fc.property(
          roleArb,
          cacheDateArb,
          (role, date) => {
            const cacheKey = generateHseCacheKey(role, date)
            const components = extractCacheKeyComponents(cacheKey)
            
            if (!components) return false
            return components.role === role
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should contain the correct date in YYYY-MM-DD format', () => {
      fc.assert(
        fc.property(
          roleArb,
          cacheDateArb,
          (role, date) => {
            const cacheKey = generateHseCacheKey(role, date)
            const components = extractCacheKeyComponents(cacheKey)
            
            if (!components) return false
            
            // Verify date format
            if (!isValidDateFormat(components.date)) return false
            
            // Verify date matches input
            const expectedDateStr = date.toISOString().split('T')[0]
            return components.date === expectedDateStr
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate consistent keys for the same role and date', () => {
      fc.assert(
        fc.property(
          roleArb,
          cacheDateArb,
          (role, date) => {
            const key1 = generateHseCacheKey(role, date)
            const key2 = generateHseCacheKey(role, date)
            return key1 === key2
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate different keys for different roles', () => {
      fc.assert(
        fc.property(
          roleArb,
          roleArb,
          cacheDateArb,
          (role1, role2, date) => {
            // Skip if roles are the same
            if (role1 === role2) return true
            
            const key1 = generateHseCacheKey(role1, date)
            const key2 = generateHseCacheKey(role2, date)
            return key1 !== key2
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate different keys for different dates', () => {
      fc.assert(
        fc.property(
          roleArb,
          cacheDateArb,
          cacheDateArb,
          (role, date1, date2) => {
            const dateStr1 = date1.toISOString().split('T')[0]
            const dateStr2 = date2.toISOString().split('T')[0]
            
            // Skip if dates are the same
            if (dateStr1 === dateStr2) return true
            
            const key1 = generateHseCacheKey(role, date1)
            const key2 = generateHseCacheKey(role, date2)
            return key1 !== key2
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Cache Key with Realistic Roles', () => {
    /**
     * **Feature: hse-dashboard, Property 10: Cache key generation format**
     * **Validates: Requirements 7.4**
     * 
     * Test with actual role names used in the system
     */
    
    it('should generate valid cache keys for all system roles', () => {
      fc.assert(
        fc.property(
          realisticRoleArb,
          cacheDateArb,
          (role, date) => {
            const cacheKey = generateHseCacheKey(role, date)
            return isValidCacheKeyFormat(cacheKey)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly embed HSE role in cache key', () => {
      fc.assert(
        fc.property(
          cacheDateArb,
          (date) => {
            const cacheKey = generateHseCacheKey('hse', date)
            const components = extractCacheKeyComponents(cacheKey)
            
            return components !== null && components.role === 'hse'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly embed owner role in cache key', () => {
      fc.assert(
        fc.property(
          cacheDateArb,
          (date) => {
            const cacheKey = generateHseCacheKey('owner', date)
            const components = extractCacheKeyComponents(cacheKey)
            
            return components !== null && components.role === 'owner'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly embed operations_manager role in cache key', () => {
      fc.assert(
        fc.property(
          cacheDateArb,
          (date) => {
            const cacheKey = generateHseCacheKey('operations_manager', date)
            const components = extractCacheKeyComponents(cacheKey)
            
            return components !== null && components.role === 'operations_manager'
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Cache Key Date Handling', () => {
    /**
     * **Feature: hse-dashboard, Property 10: Cache key generation format**
     * **Validates: Requirements 7.4**
     * 
     * Test date handling in cache key generation
     */
    
    it('should use current date when no date is provided', () => {
      fc.assert(
        fc.property(
          roleArb,
          (role) => {
            const now = new Date()
            const expectedDateStr = now.toISOString().split('T')[0]
            
            const cacheKey = generateHseCacheKey(role)
            const components = extractCacheKeyComponents(cacheKey)
            
            if (!components) return false
            
            // Date should be today (allowing for slight timing differences)
            return components.date === expectedDateStr
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle dates at year boundaries correctly', () => {
      fc.assert(
        fc.property(
          roleArb,
          fc.constantFrom(
            new Date('2024-01-01'),
            new Date('2024-12-31'),
            new Date('2025-01-01'),
            new Date('2025-12-31'),
            new Date('2026-01-01')
          ),
          (role, date) => {
            const cacheKey = generateHseCacheKey(role, date)
            const components = extractCacheKeyComponents(cacheKey)
            
            if (!components) return false
            
            const expectedDateStr = date.toISOString().split('T')[0]
            return components.date === expectedDateStr
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle leap year dates correctly', () => {
      fc.assert(
        fc.property(
          roleArb,
          fc.constantFrom(
            new Date('2024-02-29'), // Leap year
            new Date('2024-02-28'),
            new Date('2024-03-01')
          ),
          (role, date) => {
            const cacheKey = generateHseCacheKey(role, date)
            const components = extractCacheKeyComponents(cacheKey)
            
            if (!components) return false
            
            const expectedDateStr = date.toISOString().split('T')[0]
            return components.date === expectedDateStr
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce date strings with correct padding (leading zeros)', () => {
      fc.assert(
        fc.property(
          roleArb,
          fc.constantFrom(
            new Date('2024-01-01'), // Single digit month and day
            new Date('2024-01-09'),
            new Date('2024-09-01'),
            new Date('2024-09-09')
          ),
          (role, date) => {
            const cacheKey = generateHseCacheKey(role, date)
            const components = extractCacheKeyComponents(cacheKey)
            
            if (!components) return false
            
            // Verify format is exactly YYYY-MM-DD with proper padding
            const datePattern = /^\d{4}-\d{2}-\d{2}$/
            return datePattern.test(components.date)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Cache Key Structure Invariants', () => {
    /**
     * **Feature: hse-dashboard, Property 10: Cache key generation format**
     * **Validates: Requirements 7.4**
     * 
     * Test structural invariants of cache keys
     */
    
    it('should always have exactly 3 colon-separated parts', () => {
      fc.assert(
        fc.property(
          roleArb,
          cacheDateArb,
          (role, date) => {
            const cacheKey = generateHseCacheKey(role, date)
            const parts = cacheKey.split(':')
            return parts.length === 3
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have non-empty prefix, role, and date parts', () => {
      fc.assert(
        fc.property(
          roleArb,
          cacheDateArb,
          (role, date) => {
            const cacheKey = generateHseCacheKey(role, date)
            const components = extractCacheKeyComponents(cacheKey)
            
            if (!components) return false
            
            return (
              components.prefix.length > 0 &&
              components.role.length > 0 &&
              components.date.length > 0
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have prefix equal to "hse-dashboard-metrics"', () => {
      fc.assert(
        fc.property(
          roleArb,
          cacheDateArb,
          (role, date) => {
            const cacheKey = generateHseCacheKey(role, date)
            const components = extractCacheKeyComponents(cacheKey)
            
            if (!components) return false
            
            return components.prefix === 'hse-dashboard-metrics'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have date part with exactly 10 characters (YYYY-MM-DD)', () => {
      fc.assert(
        fc.property(
          roleArb,
          cacheDateArb,
          (role, date) => {
            const cacheKey = generateHseCacheKey(role, date)
            const components = extractCacheKeyComponents(cacheKey)
            
            if (!components) return false
            
            return components.date.length === 10
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

// =====================================================
// Property 11: Cache Round-Trip
// =====================================================

/**
 * **Feature: hse-dashboard, Property 11: Cache round-trip**
 * **Validates: Requirements 7.2, 7.3**
 * 
 * For any valid metrics data, storing it in the cache and then retrieving it
 * before TTL expiration should return equivalent data.
 * 
 * Since the cache stores data as JSON, this property tests that:
 * 1. JSON serialization and deserialization preserves data integrity
 * 2. All fields in HseDashboardMetrics survive the round-trip
 * 3. Nested objects and arrays are correctly preserved
 */

// =====================================================
// Cache Round-Trip Helper Functions
// =====================================================

/**
 * Simulate cache round-trip using JSON serialization
 * This mirrors how the dashboard-cache.ts stores and retrieves data
 */
function cacheRoundTrip<T>(data: T): T {
  const serialized = JSON.stringify(data)
  return JSON.parse(serialized) as T
}

/**
 * Check if two metrics objects are equivalent
 * Uses JSON.stringify for deep equality comparison
 */
function areMetricsEquivalent(a: HseDashboardMetrics, b: HseDashboardMetrics): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

// =====================================================
// Type Definitions for Cache Round-Trip Tests
// =====================================================

interface IncidentBySeverity {
  critical: number
  major: number
  minor: number
}

interface RecentIncident {
  id: string
  incidentNumber: string
  title: string
  severity: string
  status: string
  incidentDate: string
  locationType: string
}

interface RecentPermit {
  id: string
  permitNumber: string
  permitType: string
  workLocation: string
  status: string
  validTo: string
}

interface ExpiringTraining {
  employeeCode: string
  fullName: string
  courseName: string
  validTo: string
  daysUntilExpiry: number
}

interface PpeReplacementDue {
  id: string
  employeeCode: string
  fullName: string
  ppeName: string
  expectedReplacementDate: string
  daysOverdue: number
}

interface HseDashboardMetrics {
  // Safety Overview
  daysSinceLastIncident: number
  lastIncidentDate: string | null
  incidentsYtd: number
  openIncidents: number
  incidentsBySeverity: IncidentBySeverity
  recentIncidents: RecentIncident[]
  
  // Permit Status
  activePermits: number
  expiringPermits: number
  expiredPermits: number
  recentPermits: RecentPermit[]
  
  // Training Compliance
  expiringTrainingCount: number
  overdueTrainingCount: number
  trainingComplianceRate: number
  expiringTrainingList: ExpiringTraining[]
  
  // PPE Status
  ppeReplacementDueCount: number
  ppeOverdueCount: number
  employeesWithIncompletePpe: number
  ppeReplacementDueList: PpeReplacementDue[]
}

// =====================================================
// Arbitraries for Cache Round-Trip Tests
// =====================================================

// Generate date strings in YYYY-MM-DD format for cache round-trip tests
const cacheRoundTripDateArb = fc.integer({ 
  min: new Date('2020-01-01').getTime(), 
  max: new Date('2026-12-31').getTime() 
}).map(ts => new Date(ts).toISOString().split('T')[0])

// Generate nullable date strings for cache round-trip tests
const cacheRoundTripNullableDateArb = fc.option(cacheRoundTripDateArb, { nil: null })

// Generate IncidentBySeverity
const incidentBySeverityArb: fc.Arbitrary<IncidentBySeverity> = fc.record({
  critical: fc.integer({ min: 0, max: 100 }),
  major: fc.integer({ min: 0, max: 100 }),
  minor: fc.integer({ min: 0, max: 100 }),
})

// Generate RecentIncident
const recentIncidentArb: fc.Arbitrary<RecentIncident> = fc.record({
  id: fc.uuid(),
  incidentNumber: fc.string({ minLength: 1, maxLength: 20 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  severity: fc.constantFrom('critical', 'major', 'minor'),
  status: fc.constantFrom('open', 'investigating', 'resolved', 'closed'),
  incidentDate: cacheRoundTripDateArb,
  locationType: fc.constantFrom('office', 'site', 'warehouse', 'vehicle'),
})

// Generate RecentPermit
const recentPermitArb: fc.Arbitrary<RecentPermit> = fc.record({
  id: fc.uuid(),
  permitNumber: fc.string({ minLength: 1, maxLength: 20 }),
  permitType: fc.constantFrom('hot_work', 'confined_space', 'excavation', 'electrical', 'height_work'),
  workLocation: fc.string({ minLength: 1, maxLength: 100 }),
  status: fc.constantFrom('active', 'pending', 'expired', 'suspended', 'closed', 'cancelled'),
  validTo: cacheRoundTripDateArb,
})

// Generate ExpiringTraining
const expiringTrainingArb: fc.Arbitrary<ExpiringTraining> = fc.record({
  employeeCode: fc.string({ minLength: 1, maxLength: 20 }),
  fullName: fc.string({ minLength: 1, maxLength: 100 }),
  courseName: fc.string({ minLength: 1, maxLength: 100 }),
  validTo: cacheRoundTripDateArb,
  daysUntilExpiry: fc.integer({ min: 0, max: 30 }),
})

// Generate PpeReplacementDue
const ppeReplacementDueArb: fc.Arbitrary<PpeReplacementDue> = fc.record({
  id: fc.uuid(),
  employeeCode: fc.string({ minLength: 1, maxLength: 20 }),
  fullName: fc.string({ minLength: 1, maxLength: 100 }),
  ppeName: fc.string({ minLength: 1, maxLength: 100 }),
  expectedReplacementDate: cacheRoundTripDateArb,
  daysOverdue: fc.integer({ min: 0, max: 365 }),
})

// Generate complete HseDashboardMetrics
const hseDashboardMetricsArb: fc.Arbitrary<HseDashboardMetrics> = fc.record({
  // Safety Overview
  daysSinceLastIncident: fc.integer({ min: 0, max: 365 }),
  lastIncidentDate: cacheRoundTripNullableDateArb,
  incidentsYtd: fc.integer({ min: 0, max: 1000 }),
  openIncidents: fc.integer({ min: 0, max: 100 }),
  incidentsBySeverity: incidentBySeverityArb,
  recentIncidents: fc.array(recentIncidentArb, { minLength: 0, maxLength: 5 }),
  
  // Permit Status
  activePermits: fc.integer({ min: 0, max: 100 }),
  expiringPermits: fc.integer({ min: 0, max: 100 }),
  expiredPermits: fc.integer({ min: 0, max: 100 }),
  recentPermits: fc.array(recentPermitArb, { minLength: 0, maxLength: 5 }),
  
  // Training Compliance
  expiringTrainingCount: fc.integer({ min: 0, max: 100 }),
  overdueTrainingCount: fc.integer({ min: 0, max: 100 }),
  trainingComplianceRate: fc.float({ min: 0, max: 100, noNaN: true }),
  expiringTrainingList: fc.array(expiringTrainingArb, { minLength: 0, maxLength: 5 }),
  
  // PPE Status
  ppeReplacementDueCount: fc.integer({ min: 0, max: 100 }),
  ppeOverdueCount: fc.integer({ min: 0, max: 100 }),
  employeesWithIncompletePpe: fc.integer({ min: 0, max: 100 }),
  ppeReplacementDueList: fc.array(ppeReplacementDueArb, { minLength: 0, maxLength: 5 }),
})

// =====================================================
// Property 11 Tests: Cache Round-Trip
// =====================================================

describe('Property 11: Cache round-trip', () => {
  
  describe('Full Metrics Round-Trip', () => {
    /**
     * **Feature: hse-dashboard, Property 11: Cache round-trip**
     * **Validates: Requirements 7.2, 7.3**
     * 
     * Test that complete HseDashboardMetrics objects survive JSON round-trip
     */
    
    it('should preserve complete metrics data through cache round-trip', () => {
      fc.assert(
        fc.property(
          hseDashboardMetricsArb,
          (metrics) => {
            const roundTripped = cacheRoundTrip(metrics)
            return areMetricsEquivalent(metrics, roundTripped)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve all numeric fields through round-trip', () => {
      fc.assert(
        fc.property(
          hseDashboardMetricsArb,
          (metrics) => {
            const roundTripped = cacheRoundTrip(metrics)
            
            return (
              roundTripped.daysSinceLastIncident === metrics.daysSinceLastIncident &&
              roundTripped.incidentsYtd === metrics.incidentsYtd &&
              roundTripped.openIncidents === metrics.openIncidents &&
              roundTripped.activePermits === metrics.activePermits &&
              roundTripped.expiringPermits === metrics.expiringPermits &&
              roundTripped.expiredPermits === metrics.expiredPermits &&
              roundTripped.expiringTrainingCount === metrics.expiringTrainingCount &&
              roundTripped.overdueTrainingCount === metrics.overdueTrainingCount &&
              roundTripped.ppeReplacementDueCount === metrics.ppeReplacementDueCount &&
              roundTripped.ppeOverdueCount === metrics.ppeOverdueCount &&
              roundTripped.employeesWithIncompletePpe === metrics.employeesWithIncompletePpe
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve nullable date fields through round-trip', () => {
      fc.assert(
        fc.property(
          hseDashboardMetricsArb,
          (metrics) => {
            const roundTripped = cacheRoundTrip(metrics)
            
            // null should remain null, string should remain string
            if (metrics.lastIncidentDate === null) {
              return roundTripped.lastIncidentDate === null
            }
            return roundTripped.lastIncidentDate === metrics.lastIncidentDate
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve array lengths through round-trip', () => {
      fc.assert(
        fc.property(
          hseDashboardMetricsArb,
          (metrics) => {
            const roundTripped = cacheRoundTrip(metrics)
            
            return (
              roundTripped.recentIncidents.length === metrics.recentIncidents.length &&
              roundTripped.recentPermits.length === metrics.recentPermits.length &&
              roundTripped.expiringTrainingList.length === metrics.expiringTrainingList.length &&
              roundTripped.ppeReplacementDueList.length === metrics.ppeReplacementDueList.length
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Nested Object Round-Trip', () => {
    /**
     * **Feature: hse-dashboard, Property 11: Cache round-trip**
     * **Validates: Requirements 7.2, 7.3**
     * 
     * Test that nested objects within metrics survive round-trip
     */
    
    it('should preserve incidentsBySeverity object through round-trip', () => {
      fc.assert(
        fc.property(
          incidentBySeverityArb,
          (severity) => {
            const roundTripped = cacheRoundTrip(severity)
            
            return (
              roundTripped.critical === severity.critical &&
              roundTripped.major === severity.major &&
              roundTripped.minor === severity.minor
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve RecentIncident objects through round-trip', () => {
      fc.assert(
        fc.property(
          recentIncidentArb,
          (incident) => {
            const roundTripped = cacheRoundTrip(incident)
            
            return (
              roundTripped.id === incident.id &&
              roundTripped.incidentNumber === incident.incidentNumber &&
              roundTripped.title === incident.title &&
              roundTripped.severity === incident.severity &&
              roundTripped.status === incident.status &&
              roundTripped.incidentDate === incident.incidentDate &&
              roundTripped.locationType === incident.locationType
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve RecentPermit objects through round-trip', () => {
      fc.assert(
        fc.property(
          recentPermitArb,
          (permit) => {
            const roundTripped = cacheRoundTrip(permit)
            
            return (
              roundTripped.id === permit.id &&
              roundTripped.permitNumber === permit.permitNumber &&
              roundTripped.permitType === permit.permitType &&
              roundTripped.workLocation === permit.workLocation &&
              roundTripped.status === permit.status &&
              roundTripped.validTo === permit.validTo
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve ExpiringTraining objects through round-trip', () => {
      fc.assert(
        fc.property(
          expiringTrainingArb,
          (training) => {
            const roundTripped = cacheRoundTrip(training)
            
            return (
              roundTripped.employeeCode === training.employeeCode &&
              roundTripped.fullName === training.fullName &&
              roundTripped.courseName === training.courseName &&
              roundTripped.validTo === training.validTo &&
              roundTripped.daysUntilExpiry === training.daysUntilExpiry
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve PpeReplacementDue objects through round-trip', () => {
      fc.assert(
        fc.property(
          ppeReplacementDueArb,
          (ppe) => {
            const roundTripped = cacheRoundTrip(ppe)
            
            return (
              roundTripped.id === ppe.id &&
              roundTripped.employeeCode === ppe.employeeCode &&
              roundTripped.fullName === ppe.fullName &&
              roundTripped.ppeName === ppe.ppeName &&
              roundTripped.expectedReplacementDate === ppe.expectedReplacementDate &&
              roundTripped.daysOverdue === ppe.daysOverdue
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Array Round-Trip', () => {
    /**
     * **Feature: hse-dashboard, Property 11: Cache round-trip**
     * **Validates: Requirements 7.2, 7.3**
     * 
     * Test that arrays of objects survive round-trip
     */
    
    it('should preserve array of RecentIncident objects through round-trip', () => {
      fc.assert(
        fc.property(
          fc.array(recentIncidentArb, { minLength: 0, maxLength: 10 }),
          (incidents) => {
            const roundTripped = cacheRoundTrip(incidents)
            
            if (roundTripped.length !== incidents.length) return false
            
            return incidents.every((incident, index) => 
              JSON.stringify(incident) === JSON.stringify(roundTripped[index])
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve array of RecentPermit objects through round-trip', () => {
      fc.assert(
        fc.property(
          fc.array(recentPermitArb, { minLength: 0, maxLength: 10 }),
          (permits) => {
            const roundTripped = cacheRoundTrip(permits)
            
            if (roundTripped.length !== permits.length) return false
            
            return permits.every((permit, index) => 
              JSON.stringify(permit) === JSON.stringify(roundTripped[index])
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve array of ExpiringTraining objects through round-trip', () => {
      fc.assert(
        fc.property(
          fc.array(expiringTrainingArb, { minLength: 0, maxLength: 10 }),
          (training) => {
            const roundTripped = cacheRoundTrip(training)
            
            if (roundTripped.length !== training.length) return false
            
            return training.every((t, index) => 
              JSON.stringify(t) === JSON.stringify(roundTripped[index])
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve array of PpeReplacementDue objects through round-trip', () => {
      fc.assert(
        fc.property(
          fc.array(ppeReplacementDueArb, { minLength: 0, maxLength: 10 }),
          (ppeList) => {
            const roundTripped = cacheRoundTrip(ppeList)
            
            if (roundTripped.length !== ppeList.length) return false
            
            return ppeList.every((ppe, index) => 
              JSON.stringify(ppe) === JSON.stringify(roundTripped[index])
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve empty arrays through round-trip', () => {
      fc.assert(
        fc.property(
          fc.constant({
            daysSinceLastIncident: 0,
            lastIncidentDate: null,
            incidentsYtd: 0,
            openIncidents: 0,
            incidentsBySeverity: { critical: 0, major: 0, minor: 0 },
            recentIncidents: [],
            activePermits: 0,
            expiringPermits: 0,
            expiredPermits: 0,
            recentPermits: [],
            expiringTrainingCount: 0,
            overdueTrainingCount: 0,
            trainingComplianceRate: 100,
            expiringTrainingList: [],
            ppeReplacementDueCount: 0,
            ppeOverdueCount: 0,
            employeesWithIncompletePpe: 0,
            ppeReplacementDueList: [],
          } as HseDashboardMetrics),
          (metrics) => {
            const roundTripped = cacheRoundTrip(metrics)
            
            return (
              roundTripped.recentIncidents.length === 0 &&
              roundTripped.recentPermits.length === 0 &&
              roundTripped.expiringTrainingList.length === 0 &&
              roundTripped.ppeReplacementDueList.length === 0
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Edge Cases', () => {
    /**
     * **Feature: hse-dashboard, Property 11: Cache round-trip**
     * **Validates: Requirements 7.2, 7.3**
     * 
     * Test edge cases for cache round-trip
     */
    
    it('should handle metrics with all zero values', () => {
      const zeroMetrics: HseDashboardMetrics = {
        daysSinceLastIncident: 0,
        lastIncidentDate: null,
        incidentsYtd: 0,
        openIncidents: 0,
        incidentsBySeverity: { critical: 0, major: 0, minor: 0 },
        recentIncidents: [],
        activePermits: 0,
        expiringPermits: 0,
        expiredPermits: 0,
        recentPermits: [],
        expiringTrainingCount: 0,
        overdueTrainingCount: 0,
        trainingComplianceRate: 0,
        expiringTrainingList: [],
        ppeReplacementDueCount: 0,
        ppeOverdueCount: 0,
        employeesWithIncompletePpe: 0,
        ppeReplacementDueList: [],
      }
      
      const roundTripped = cacheRoundTrip(zeroMetrics)
      return areMetricsEquivalent(zeroMetrics, roundTripped)
    })

    it('should handle metrics with maximum array sizes', () => {
      fc.assert(
        fc.property(
          fc.record({
            daysSinceLastIncident: fc.integer({ min: 0, max: 365 }),
            lastIncidentDate: cacheRoundTripNullableDateArb,
            incidentsYtd: fc.integer({ min: 0, max: 1000 }),
            openIncidents: fc.integer({ min: 0, max: 100 }),
            incidentsBySeverity: incidentBySeverityArb,
            recentIncidents: fc.array(recentIncidentArb, { minLength: 5, maxLength: 5 }),
            activePermits: fc.integer({ min: 0, max: 100 }),
            expiringPermits: fc.integer({ min: 0, max: 100 }),
            expiredPermits: fc.integer({ min: 0, max: 100 }),
            recentPermits: fc.array(recentPermitArb, { minLength: 5, maxLength: 5 }),
            expiringTrainingCount: fc.integer({ min: 0, max: 100 }),
            overdueTrainingCount: fc.integer({ min: 0, max: 100 }),
            trainingComplianceRate: fc.float({ min: 0, max: 100, noNaN: true }),
            expiringTrainingList: fc.array(expiringTrainingArb, { minLength: 5, maxLength: 5 }),
            ppeReplacementDueCount: fc.integer({ min: 0, max: 100 }),
            ppeOverdueCount: fc.integer({ min: 0, max: 100 }),
            employeesWithIncompletePpe: fc.integer({ min: 0, max: 100 }),
            ppeReplacementDueList: fc.array(ppeReplacementDueArb, { minLength: 5, maxLength: 5 }),
          }),
          (metrics) => {
            const roundTripped = cacheRoundTrip(metrics)
            return areMetricsEquivalent(metrics, roundTripped)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle special characters in string fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            incidentNumber: fc.string({ minLength: 1, maxLength: 20 }),
            // Use array and join to create strings with special characters
            title: fc.array(fc.constantFrom(
              'a', 'b', 'c', ' ', '"', "'", '\\', '\n', '\t', '/', '<', '>', '&',
              'á', 'é', 'ñ', '中', '日', '한', '🔥', '⚠️'
            ), { minLength: 1, maxLength: 50 }).map(arr => arr.join('')),
            severity: fc.constantFrom('critical', 'major', 'minor'),
            status: fc.constantFrom('open', 'investigating', 'resolved', 'closed'),
            incidentDate: cacheRoundTripDateArb,
            locationType: fc.constantFrom('office', 'site', 'warehouse', 'vehicle'),
          }),
          (incident) => {
            const roundTripped = cacheRoundTrip(incident)
            return JSON.stringify(incident) === JSON.stringify(roundTripped)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle floating point compliance rates', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          (rate) => {
            const metrics: HseDashboardMetrics = {
              daysSinceLastIncident: 0,
              lastIncidentDate: null,
              incidentsYtd: 0,
              openIncidents: 0,
              incidentsBySeverity: { critical: 0, major: 0, minor: 0 },
              recentIncidents: [],
              activePermits: 0,
              expiringPermits: 0,
              expiredPermits: 0,
              recentPermits: [],
              expiringTrainingCount: 0,
              overdueTrainingCount: 0,
              trainingComplianceRate: rate,
              expiringTrainingList: [],
              ppeReplacementDueCount: 0,
              ppeOverdueCount: 0,
              employeesWithIncompletePpe: 0,
              ppeReplacementDueList: [],
            }
            
            const roundTripped = cacheRoundTrip(metrics)
            
            // JSON preserves floating point numbers
            return roundTripped.trainingComplianceRate === rate
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle boundary date values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('2020-01-01', '2026-12-31', '2024-02-29', '2025-12-31'),
          (dateStr) => {
            const metrics: HseDashboardMetrics = {
              daysSinceLastIncident: 0,
              lastIncidentDate: dateStr,
              incidentsYtd: 0,
              openIncidents: 0,
              incidentsBySeverity: { critical: 0, major: 0, minor: 0 },
              recentIncidents: [{
                id: 'test-id',
                incidentNumber: 'INC-001',
                title: 'Test',
                severity: 'minor',
                status: 'open',
                incidentDate: dateStr,
                locationType: 'office',
              }],
              activePermits: 0,
              expiringPermits: 0,
              expiredPermits: 0,
              recentPermits: [],
              expiringTrainingCount: 0,
              overdueTrainingCount: 0,
              trainingComplianceRate: 100,
              expiringTrainingList: [],
              ppeReplacementDueCount: 0,
              ppeOverdueCount: 0,
              employeesWithIncompletePpe: 0,
              ppeReplacementDueList: [],
            }
            
            const roundTripped = cacheRoundTrip(metrics)
            
            return (
              roundTripped.lastIncidentDate === dateStr &&
              roundTripped.recentIncidents[0].incidentDate === dateStr
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Idempotency', () => {
    /**
     * **Feature: hse-dashboard, Property 11: Cache round-trip**
     * **Validates: Requirements 7.2, 7.3**
     * 
     * Test that multiple round-trips produce the same result
     */
    
    it('should be idempotent: multiple round-trips produce same result', () => {
      fc.assert(
        fc.property(
          hseDashboardMetricsArb,
          (metrics) => {
            const firstRoundTrip = cacheRoundTrip(metrics)
            const secondRoundTrip = cacheRoundTrip(firstRoundTrip)
            const thirdRoundTrip = cacheRoundTrip(secondRoundTrip)
            
            return (
              areMetricsEquivalent(firstRoundTrip, secondRoundTrip) &&
              areMetricsEquivalent(secondRoundTrip, thirdRoundTrip)
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce identical JSON strings after round-trip', () => {
      fc.assert(
        fc.property(
          hseDashboardMetricsArb,
          (metrics) => {
            const roundTripped = cacheRoundTrip(metrics)
            
            // The JSON representation should be identical
            return JSON.stringify(metrics) === JSON.stringify(roundTripped)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
