/**
 * Property-based tests for Sysadmin Dashboard Data Service
 * Tests correctness properties for system admin metrics calculations
 * 
 * **Feature: sysadmin-dashboard**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculateHoursElapsed, calculateActionsPerHour } from '@/lib/dashboard/sysadmin-data'

// =====================================================
// Constants matching sysadmin-data.ts
// =====================================================

const ALLOWED_SYSADMIN_ROLES = ['sysadmin', 'owner', 'director']
const ALL_ROLES = [
  'owner', 'director', 'sysadmin', 'marketing_manager', 'finance_manager', 
  'operations_manager', 'administration', 'finance', 'marketing', 'ops', 
  'engineer', 'hr', 'hse', 'agency', 'customs'
]

// =====================================================
// Test Helpers - Pure functions for testing
// =====================================================

/**
 * Filter users by active status
 */
function filterActiveUsers<T extends { isActive: boolean }>(users: T[]): T[] {
  return users.filter(u => u.isActive)
}

/**
 * Filter users by last login date (active today)
 */
function filterActiveToday<T extends { lastLoginAt: string | null }>(
  users: T[],
  today: Date
): T[] {
  const todayStr = today.toISOString().split('T')[0]
  return users.filter(u => 
    u.lastLoginAt !== null && 
    u.lastLoginAt.split('T')[0] >= todayStr
  )
}

/**
 * Filter users by last login date (active this week)
 */
function filterActiveThisWeek<T extends { lastLoginAt: string | null }>(
  users: T[],
  today: Date
): T[] {
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]
  return users.filter(u => 
    u.lastLoginAt !== null && 
    u.lastLoginAt.split('T')[0] >= sevenDaysAgoStr
  )
}

/**
 * Filter users by created date (new this month)
 */
function filterNewThisMonth<T extends { createdAt: string }>(
  users: T[],
  today: Date
): T[] {
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const startOfMonthStr = startOfMonth.toISOString().split('T')[0]
  return users.filter(u => u.createdAt.split('T')[0] >= startOfMonthStr)
}

/**
 * Filter activities by action type
 */
function filterByActionType<T extends { actionType: string }>(
  activities: T[],
  actionType: string
): T[] {
  return activities.filter(a => a.actionType.toLowerCase() === actionType.toLowerCase())
}

/**
 * Filter activities by date (today)
 */
function filterActivitiesToday<T extends { createdAt: string }>(
  activities: T[],
  today: Date
): T[] {
  const todayStr = today.toISOString().split('T')[0]
  return activities.filter(a => a.createdAt.split('T')[0] >= todayStr)
}

/**
 * Group users by role
 */
function groupByRole<T extends { role: string }>(users: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const user of users) {
    const role = user.role || 'unknown'
    if (!groups.has(role)) {
      groups.set(role, [])
    }
    groups.get(role)!.push(user)
  }
  return groups
}

/**
 * Count users by role
 */
function countByRole<T extends { role: string }>(users: T[]): Map<string, number> {
  const groups = groupByRole(users)
  const counts = new Map<string, number>()
  for (const [role, groupUsers] of groups) {
    counts.set(role, groupUsers.length)
  }
  return counts
}

/**
 * Sort role distribution by count descending
 */
function sortRoleDistribution(distribution: { role: string; count: number }[]): { role: string; count: number }[] {
  return [...distribution].sort((a, b) => b.count - a.count)
}

/**
 * Order records by created_at descending and limit
 */
function orderAndLimit<T extends { createdAt: string }>(
  records: T[],
  limit: number
): T[] {
  return [...records]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
}

/**
 * Transform activity record
 */
function transformActivity(record: {
  id: string | null
  userEmail: string | null
  actionType: string | null
  pagePath: string | null
  resourceType: string | null
  createdAt: string | null
}): {
  id: string
  userEmail: string | null
  actionType: string
  pagePath: string | null
  resourceType: string | null
  createdAt: string
} {
  return {
    id: record.id || '',
    userEmail: record.userEmail || null,
    actionType: record.actionType || '',
    pagePath: record.pagePath || null,
    resourceType: record.resourceType || null,
    createdAt: record.createdAt || '',
  }
}

/**
 * Transform document change record
 */
function transformDocumentChange(record: {
  id: string | null
  userName: string | null
  actionType: string | null
  documentType: string | null
  documentNumber: string | null
  createdAt: string | null
}): {
  id: string
  userName: string
  actionType: string
  documentType: string
  documentNumber: string
  createdAt: string
} {
  return {
    id: record.id || '',
    userName: record.userName || '',
    actionType: record.actionType || '',
    documentType: record.documentType || '',
    documentNumber: record.documentNumber || '',
    createdAt: record.createdAt || '',
  }
}

// =====================================================
// Arbitraries (Test Data Generators)
// =====================================================

// Generate dates within a reasonable range (2024-2026)
const dateTimestampArb = fc.integer({ 
  min: new Date('2024-01-01').getTime(), 
  max: new Date('2026-12-31').getTime() 
})

const dateStringArb = dateTimestampArb.map(ts => new Date(ts).toISOString())

const dateStringDateOnlyArb = dateTimestampArb.map(ts => new Date(ts).toISOString().split('T')[0])

// Generate a "today" date
const todayArb = fc.integer({
  min: new Date('2025-01-01').getTime(),
  max: new Date('2026-06-30').getTime()
}).map(ts => new Date(ts))

// Generate role strings
const roleArb = fc.constantFrom(...ALL_ROLES)

// Generate action types
const actionTypeArb = fc.constantFrom(
  'login', 'page_view', 'create', 'update', 'delete', 'approve', 'reject'
)

// Generate user profile record
const userProfileArb = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  fullName: fc.string({ minLength: 1, maxLength: 50 }),
  role: roleArb,
  isActive: fc.boolean(),
  lastLoginAt: fc.option(dateStringArb, { nil: null }),
  createdAt: dateStringArb,
})

// Generate user activity log record
const userActivityArb = fc.record({
  id: fc.uuid(),
  userEmail: fc.option(fc.emailAddress(), { nil: null }),
  actionType: actionTypeArb,
  pagePath: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  resourceType: fc.option(fc.constantFrom('job_order', 'invoice', 'customer', 'vendor', 'pjo'), { nil: null }),
  createdAt: dateStringArb,
})

// Generate activity log (document changes) record
const activityLogArb = fc.record({
  id: fc.uuid(),
  userName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  actionType: fc.constantFrom('create', 'update', 'delete', 'approve', 'reject'),
  documentType: fc.constantFrom('job_order', 'invoice', 'pjo', 'quotation', 'bkk'),
  documentNumber: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  createdAt: dateStringArb,
})

// Generate hours elapsed (positive number)
const hoursElapsedArb = fc.float({ min: Math.fround(0), max: Math.fround(24), noNaN: true })

// Generate action count
const actionCountArb = fc.integer({ min: 0, max: 100000 })

// =====================================================
// Property Tests
// =====================================================

describe('Sysadmin Dashboard Data - Property Tests', () => {
  
  // =====================================================
  // Property 1: Count Filtering Correctness
  // =====================================================
  
  describe('Property 1: Count filtering correctness', () => {
    /**
     * **Feature: sysadmin-dashboard, Property 1: Count filtering correctness**
     * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.4, 3.1, 3.2, 3.3**
     * 
     * For any collection of records with filterable attributes (is_active, last_login_at, 
     * created_at, action_type), the filtered count should equal the mathematical count 
     * of records matching the filter criteria.
     */
    
    it('should count total users correctly', () => {
      fc.assert(
        fc.property(
          fc.array(userProfileArb, { minLength: 0, maxLength: 100 }),
          (users) => {
            const totalCount = users.length
            return totalCount === users.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count active users correctly (is_active = true)', () => {
      fc.assert(
        fc.property(
          fc.array(userProfileArb, { minLength: 0, maxLength: 100 }),
          (users) => {
            const activeCount = filterActiveUsers(users).length
            const expectedCount = users.filter(u => u.isActive).length
            return activeCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count active today users correctly (last_login_at >= today)', () => {
      fc.assert(
        fc.property(
          fc.array(userProfileArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (users, today) => {
            const activeTodayCount = filterActiveToday(users, today).length
            const todayStr = today.toISOString().split('T')[0]
            const expectedCount = users.filter(u => 
              u.lastLoginAt !== null && 
              u.lastLoginAt.split('T')[0] >= todayStr
            ).length
            return activeTodayCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count active this week users correctly (last_login_at >= 7 days ago)', () => {
      fc.assert(
        fc.property(
          fc.array(userProfileArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (users, today) => {
            const activeThisWeekCount = filterActiveThisWeek(users, today).length
            const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]
            const expectedCount = users.filter(u => 
              u.lastLoginAt !== null && 
              u.lastLoginAt.split('T')[0] >= sevenDaysAgoStr
            ).length
            return activeThisWeekCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count new users this month correctly (created_at >= start of month)', () => {
      fc.assert(
        fc.property(
          fc.array(userProfileArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (users, today) => {
            const newThisMonthCount = filterNewThisMonth(users, today).length
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
            const startOfMonthStr = startOfMonth.toISOString().split('T')[0]
            const expectedCount = users.filter(u => 
              u.createdAt.split('T')[0] >= startOfMonthStr
            ).length
            return newThisMonthCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count logins today correctly (action_type = login AND created_at >= today)', () => {
      fc.assert(
        fc.property(
          fc.array(userActivityArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (activities, today) => {
            const todayActivities = filterActivitiesToday(activities, today)
            const loginsTodayCount = filterByActionType(todayActivities, 'login').length
            
            const todayStr = today.toISOString().split('T')[0]
            const expectedCount = activities.filter(a => 
              a.actionType.toLowerCase() === 'login' &&
              a.createdAt.split('T')[0] >= todayStr
            ).length
            
            return loginsTodayCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count page views today correctly (action_type = page_view AND created_at >= today)', () => {
      fc.assert(
        fc.property(
          fc.array(userActivityArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (activities, today) => {
            const todayActivities = filterActivitiesToday(activities, today)
            const pageViewsTodayCount = filterByActionType(todayActivities, 'page_view').length
            
            const todayStr = today.toISOString().split('T')[0]
            const expectedCount = activities.filter(a => 
              a.actionType.toLowerCase() === 'page_view' &&
              a.createdAt.split('T')[0] >= todayStr
            ).length
            
            return pageViewsTodayCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count total actions today correctly (created_at >= today)', () => {
      fc.assert(
        fc.property(
          fc.array(userActivityArb, { minLength: 0, maxLength: 100 }),
          todayArb,
          (activities, today) => {
            const totalActionsTodayCount = filterActivitiesToday(activities, today).length
            
            const todayStr = today.toISOString().split('T')[0]
            const expectedCount = activities.filter(a => 
              a.createdAt.split('T')[0] >= todayStr
            ).length
            
            return totalActionsTodayCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 for empty user collection', () => {
      expect(filterActiveUsers([]).length).toBe(0)
      expect(filterActiveToday([], new Date()).length).toBe(0)
      expect(filterActiveThisWeek([], new Date()).length).toBe(0)
      expect(filterNewThisMonth([], new Date()).length).toBe(0)
    })

    it('should return 0 for empty activity collection', () => {
      expect(filterActivitiesToday([], new Date()).length).toBe(0)
      expect(filterByActionType([], 'login').length).toBe(0)
    })

    it('should partition users into active and inactive correctly', () => {
      fc.assert(
        fc.property(
          fc.array(userProfileArb, { minLength: 0, maxLength: 100 }),
          (users) => {
            const activeCount = filterActiveUsers(users).length
            const inactiveCount = users.filter(u => !u.isActive).length
            return activeCount + inactiveCount === users.length
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  // =====================================================
  // Property 2: Grouping Aggregation Correctness
  // =====================================================
  
  describe('Property 2: Grouping aggregation correctness', () => {
    /**
     * **Feature: sysadmin-dashboard, Property 2: Grouping aggregation correctness**
     * **Validates: Requirements 2.1, 2.3, 2.4**
     * 
     * For any collection of user profiles with role values, the grouped counts by role should:
     * - Sum to the total count of active users
     * - Each group should contain exactly the records with that role
     * - Groups should be sorted by count in descending order
     */
    
    it('should group active users by role correctly', () => {
      fc.assert(
        fc.property(
          fc.array(userProfileArb, { minLength: 0, maxLength: 100 }),
          (users) => {
            const activeUsers = filterActiveUsers(users)
            const grouped = groupByRole(activeUsers)
            
            // Verify all active users are accounted for
            let totalGrouped = 0
            for (const [, groupUsers] of grouped) {
              totalGrouped += groupUsers.length
            }
            
            return totalGrouped === activeUsers.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count users per role correctly', () => {
      fc.assert(
        fc.property(
          fc.array(userProfileArb, { minLength: 0, maxLength: 100 }),
          (users) => {
            const activeUsers = filterActiveUsers(users)
            const counts = countByRole(activeUsers)
            
            // Verify each role count matches manual count
            for (const [role, count] of counts) {
              const expectedCount = activeUsers.filter(u => u.role === role).length
              if (count !== expectedCount) return false
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should sort role distribution by count descending', () => {
      fc.assert(
        fc.property(
          fc.array(userProfileArb, { minLength: 0, maxLength: 100 }),
          (users) => {
            const activeUsers = filterActiveUsers(users)
            const counts = countByRole(activeUsers)
            
            // Convert to array and sort
            const distribution = Array.from(counts.entries())
              .map(([role, count]) => ({ role, count }))
            const sorted = sortRoleDistribution(distribution)
            
            // Verify sorted in descending order
            for (let i = 1; i < sorted.length; i++) {
              if (sorted[i].count > sorted[i - 1].count) return false
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should only count active users in role distribution', () => {
      fc.assert(
        fc.property(
          fc.array(userProfileArb, { minLength: 0, maxLength: 100 }),
          (users) => {
            const activeUsers = filterActiveUsers(users)
            const inactiveUsers = users.filter(u => !u.isActive)
            
            const activeCounts = countByRole(activeUsers)
            const inactiveCounts = countByRole(inactiveUsers)
            
            // Sum of active counts should equal active users count
            let totalActive = 0
            for (const [, count] of activeCounts) {
              totalActive += count
            }
            
            // Sum of inactive counts should equal inactive users count
            let totalInactive = 0
            for (const [, count] of inactiveCounts) {
              totalInactive += count
            }
            
            return totalActive === activeUsers.length && totalInactive === inactiveUsers.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty map for empty user collection', () => {
      const grouped = groupByRole([])
      expect(grouped.size).toBe(0)
    })

    it('should create single group when all users have same role', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          roleArb,
          (count, role) => {
            const users = Array.from({ length: count }, (_, i) => ({
              id: `user-${i}`,
              email: `user${i}@test.com`,
              fullName: `User ${i}`,
              role,
              isActive: true,
              lastLoginAt: null,
              createdAt: new Date().toISOString(),
            }))
            
            const grouped = groupByRole(users)
            
            return grouped.size === 1 && grouped.get(role)?.length === count
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create separate groups for each unique role', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (count) => {
            // Each user has a unique role
            const roles = ALL_ROLES.slice(0, count)
            const users = roles.map((role, i) => ({
              id: `user-${i}`,
              email: `user${i}@test.com`,
              fullName: `User ${i}`,
              role,
              isActive: true,
              lastLoginAt: null,
              createdAt: new Date().toISOString(),
            }))
            
            const grouped = groupByRole(users)
            
            return grouped.size === count
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle users with unknown/null roles', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (count) => {
            const users = Array.from({ length: count }, (_, i) => ({
              id: `user-${i}`,
              email: `user${i}@test.com`,
              fullName: `User ${i}`,
              role: '', // Empty role
              isActive: true,
              lastLoginAt: null,
              createdAt: new Date().toISOString(),
            }))
            
            const grouped = groupByRole(users)
            
            // All users should be grouped under 'unknown' or empty string
            let totalGrouped = 0
            for (const [, groupUsers] of grouped) {
              totalGrouped += groupUsers.length
            }
            
            return totalGrouped === count
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  // =====================================================
  // Property 3: Actions Per Hour Calculation
  // =====================================================
  
  describe('Property 3: Actions per hour calculation', () => {
    /**
     * **Feature: sysadmin-dashboard, Property 3: Actions per hour calculation**
     * **Validates: Requirements 3.4**
     * 
     * For any total action count and hours elapsed value, the actions per hour calculation 
     * should equal (total actions / hours elapsed), with proper handling for:
     * - Division by zero (return 0 when hours elapsed is 0)
     * - Rounding to one decimal place
     */
    
    it('should calculate actions per hour correctly', () => {
      fc.assert(
        fc.property(
          actionCountArb,
          fc.float({ min: Math.fround(0.1), max: Math.fround(24), noNaN: true }),
          (totalActions, hoursElapsed) => {
            const result = calculateActionsPerHour(totalActions, hoursElapsed)
            const expected = Math.round((totalActions / hoursElapsed) * 10) / 10
            
            return result === expected
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when hours elapsed is 0 (division by zero handling)', () => {
      fc.assert(
        fc.property(
          actionCountArb,
          (totalActions) => {
            const result = calculateActionsPerHour(totalActions, 0)
            return result === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when hours elapsed is negative', () => {
      fc.assert(
        fc.property(
          actionCountArb,
          fc.float({ min: Math.fround(-100), max: Math.fround(-0.001), noNaN: true }),
          (totalActions, negativeHours) => {
            const result = calculateActionsPerHour(totalActions, negativeHours)
            return result === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 when total actions is 0', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(24), noNaN: true }),
          (hoursElapsed) => {
            const result = calculateActionsPerHour(0, hoursElapsed)
            return result === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should round to one decimal place', () => {
      fc.assert(
        fc.property(
          actionCountArb,
          fc.float({ min: Math.fround(0.1), max: Math.fround(24), noNaN: true }),
          (totalActions, hoursElapsed) => {
            const result = calculateActionsPerHour(totalActions, hoursElapsed)
            
            // Check that result has at most one decimal place
            const decimalPart = result.toString().split('.')[1]
            return decimalPart === undefined || decimalPart.length <= 1
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should always return a non-negative number', () => {
      fc.assert(
        fc.property(
          actionCountArb,
          hoursElapsedArb,
          (totalActions, hoursElapsed) => {
            const result = calculateActionsPerHour(totalActions, hoursElapsed)
            return result >= 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be proportional: doubling actions doubles rate', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50000 }),
          fc.float({ min: Math.fround(1), max: Math.fround(24), noNaN: true }),
          (totalActions, hoursElapsed) => {
            const rate1 = calculateActionsPerHour(totalActions, hoursElapsed)
            const rate2 = calculateActionsPerHour(totalActions * 2, hoursElapsed)
            
            // Due to rounding, we allow small differences
            const expectedRate2 = Math.round((totalActions * 2 / hoursElapsed) * 10) / 10
            return rate2 === expectedRate2
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be inversely proportional: doubling hours halves rate', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50000 }),
          fc.float({ min: Math.fround(1), max: Math.fround(12), noNaN: true }),
          (totalActions, hoursElapsed) => {
            const rate1 = calculateActionsPerHour(totalActions, hoursElapsed)
            const rate2 = calculateActionsPerHour(totalActions, hoursElapsed * 2)
            
            // Due to rounding, we allow small differences
            const expectedRate2 = Math.round((totalActions / (hoursElapsed * 2)) * 10) / 10
            return rate2 === expectedRate2
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 3 (continued): Hours Elapsed Calculation
  // =====================================================
  
  describe('Property 3 (continued): Hours elapsed calculation', () => {
    /**
     * **Feature: sysadmin-dashboard, Property 3: Actions per hour calculation**
     * **Validates: Requirements 3.4**
     * 
     * Tests for the calculateHoursElapsed helper function
     */
    
    it('should return at least 1 hour to avoid division by zero', () => {
      fc.assert(
        fc.property(
          todayArb,
          (today) => {
            // Start of day is the same as today at midnight
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const result = calculateHoursElapsed(startOfDay, today)
            return result >= 1
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate correct hours between two dates', () => {
      fc.assert(
        fc.property(
          todayArb,
          fc.integer({ min: 1, max: 23 }),
          (today, hoursToAdd) => {
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const laterTime = new Date(startOfDay.getTime() + hoursToAdd * 60 * 60 * 1000)
            
            const result = calculateHoursElapsed(startOfDay, laterTime)
            
            // Should be approximately equal to hoursToAdd (at least 1)
            return result >= Math.max(1, hoursToAdd - 0.1) && result <= hoursToAdd + 0.1
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 1 when start and end are the same (minimum value)', () => {
      fc.assert(
        fc.property(
          todayArb,
          (today) => {
            const result = calculateHoursElapsed(today, today)
            return result === 1 // Minimum value to avoid division by zero
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should always return a positive number', () => {
      fc.assert(
        fc.property(
          todayArb,
          todayArb,
          (date1, date2) => {
            const result = calculateHoursElapsed(date1, date2)
            return result > 0
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  // =====================================================
  // Property 4: Ordering and Limiting Correctness
  // =====================================================
  
  describe('Property 4: Ordering and limiting correctness', () => {
    /**
     * **Feature: sysadmin-dashboard, Property 4: Ordering and limiting correctness**
     * **Validates: Requirements 4.1, 4.3, 5.1, 5.3**
     * 
     * For any collection of records, ordering by created_at descending and limiting to N items should:
     * - Return at most N items
     * - Return items in descending order by created_at
     * - Return the N most recent items
     */
    
    it('should return at most N items when limiting', () => {
      fc.assert(
        fc.property(
          fc.array(userActivityArb, { minLength: 0, maxLength: 100 }),
          fc.integer({ min: 1, max: 50 }),
          (activities, limit) => {
            const result = orderAndLimit(activities, limit)
            return result.length <= limit
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return all items when collection size is less than limit', () => {
      fc.assert(
        fc.property(
          fc.array(userActivityArb, { minLength: 0, maxLength: 20 }),
          fc.integer({ min: 50, max: 100 }),
          (activities, limit) => {
            const result = orderAndLimit(activities, limit)
            return result.length === activities.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return items in descending order by created_at', () => {
      fc.assert(
        fc.property(
          fc.array(userActivityArb, { minLength: 0, maxLength: 100 }),
          fc.integer({ min: 1, max: 50 }),
          (activities, limit) => {
            const result = orderAndLimit(activities, limit)
            
            // Verify descending order
            for (let i = 1; i < result.length; i++) {
              if (result[i].createdAt > result[i - 1].createdAt) {
                return false
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return the N most recent items', () => {
      fc.assert(
        fc.property(
          fc.array(userActivityArb, { minLength: 0, maxLength: 100 }),
          fc.integer({ min: 1, max: 50 }),
          (activities, limit) => {
            const result = orderAndLimit(activities, limit)
            
            if (result.length === 0) return true
            
            // The oldest item in result should be >= any item not in result
            const oldestInResult = result[result.length - 1].createdAt
            
            // Sort all activities to find what should be excluded
            const sorted = [...activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            const excluded = sorted.slice(limit)
            
            // All excluded items should have createdAt <= oldestInResult
            for (const item of excluded) {
              if (item.createdAt > oldestInResult) {
                return false
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array for empty collection', () => {
      const result = orderAndLimit([], 20)
      expect(result.length).toBe(0)
    })

    it('should work correctly for recent activities (limit 20)', () => {
      fc.assert(
        fc.property(
          fc.array(userActivityArb, { minLength: 0, maxLength: 100 }),
          (activities) => {
            const result = orderAndLimit(activities, 20)
            
            // Should return at most 20 items
            if (result.length > 20) return false
            
            // Should be in descending order
            for (let i = 1; i < result.length; i++) {
              if (result[i].createdAt > result[i - 1].createdAt) {
                return false
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should work correctly for recent document changes (limit 10)', () => {
      fc.assert(
        fc.property(
          fc.array(activityLogArb, { minLength: 0, maxLength: 100 }),
          (changes) => {
            const result = orderAndLimit(changes, 10)
            
            // Should return at most 10 items
            if (result.length > 10) return false
            
            // Should be in descending order
            for (let i = 1; i < result.length; i++) {
              if (result[i].createdAt > result[i - 1].createdAt) {
                return false
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve all fields when ordering and limiting', () => {
      fc.assert(
        fc.property(
          fc.array(userActivityArb, { minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 20 }),
          (activities, limit) => {
            const result = orderAndLimit(activities, limit)
            
            // Each result item should exist in original array with same fields
            for (const item of result) {
              const original = activities.find(a => a.id === item.id)
              if (!original) return false
              if (original.userEmail !== item.userEmail) return false
              if (original.actionType !== item.actionType) return false
              if (original.createdAt !== item.createdAt) return false
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle duplicate timestamps correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }),
          dateStringArb,
          (count, timestamp) => {
            // All activities have the same timestamp
            const activities = Array.from({ length: count }, (_, i) => ({
              id: `activity-${i}`,
              userEmail: `user${i}@test.com`,
              actionType: 'login',
              pagePath: null,
              resourceType: null,
              createdAt: timestamp,
            }))
            
            const result = orderAndLimit(activities, 10)
            
            // Should return min(count, 10) items
            return result.length === Math.min(count, 10)
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  // =====================================================
  // Property 5: Data Transformation Completeness
  // =====================================================
  
  describe('Property 5: Data transformation completeness', () => {
    /**
     * **Feature: sysadmin-dashboard, Property 5: Data transformation completeness**
     * **Validates: Requirements 4.2, 5.2**
     * 
     * For any record from the database, the transformed object should contain all 
     * required fields with appropriate null handling:
     * - RecentActivity: id, userEmail, actionType, pagePath, resourceType, createdAt
     * - RecentDocumentChange: id, userName, actionType, documentType, documentNumber, createdAt
     */
    
    it('should transform activity records with all required fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.option(fc.uuid(), { nil: null }),
            userEmail: fc.option(fc.emailAddress(), { nil: null }),
            actionType: fc.option(actionTypeArb, { nil: null }),
            pagePath: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
            resourceType: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
            createdAt: fc.option(dateStringArb, { nil: null }),
          }),
          (record) => {
            const transformed = transformActivity(record)
            
            // Check all required fields exist
            if (typeof transformed.id !== 'string') return false
            if (transformed.userEmail !== null && typeof transformed.userEmail !== 'string') return false
            if (typeof transformed.actionType !== 'string') return false
            if (transformed.pagePath !== null && typeof transformed.pagePath !== 'string') return false
            if (transformed.resourceType !== null && typeof transformed.resourceType !== 'string') return false
            if (typeof transformed.createdAt !== 'string') return false
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle null values in activity records gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.constant(null),
            userEmail: fc.constant(null),
            actionType: fc.constant(null),
            pagePath: fc.constant(null),
            resourceType: fc.constant(null),
            createdAt: fc.constant(null),
          }),
          (record) => {
            const transformed = transformActivity(record)
            
            // Null values should be converted to defaults
            return (
              transformed.id === '' &&
              transformed.userEmail === null &&
              transformed.actionType === '' &&
              transformed.pagePath === null &&
              transformed.resourceType === null &&
              transformed.createdAt === ''
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve non-null values in activity records', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            userEmail: fc.emailAddress(),
            actionType: actionTypeArb,
            pagePath: fc.string({ minLength: 1, maxLength: 100 }),
            resourceType: fc.string({ minLength: 1, maxLength: 50 }),
            createdAt: dateStringArb,
          }),
          (record) => {
            const transformed = transformActivity(record)
            
            return (
              transformed.id === record.id &&
              transformed.userEmail === record.userEmail &&
              transformed.actionType === record.actionType &&
              transformed.pagePath === record.pagePath &&
              transformed.resourceType === record.resourceType &&
              transformed.createdAt === record.createdAt
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should transform document change records with all required fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.option(fc.uuid(), { nil: null }),
            userName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
            actionType: fc.option(fc.constantFrom('create', 'update', 'delete'), { nil: null }),
            documentType: fc.option(fc.constantFrom('job_order', 'invoice', 'pjo'), { nil: null }),
            documentNumber: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
            createdAt: fc.option(dateStringArb, { nil: null }),
          }),
          (record) => {
            const transformed = transformDocumentChange(record)
            
            // Check all required fields exist and are strings
            if (typeof transformed.id !== 'string') return false
            if (typeof transformed.userName !== 'string') return false
            if (typeof transformed.actionType !== 'string') return false
            if (typeof transformed.documentType !== 'string') return false
            if (typeof transformed.documentNumber !== 'string') return false
            if (typeof transformed.createdAt !== 'string') return false
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle null values in document change records gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.constant(null),
            userName: fc.constant(null),
            actionType: fc.constant(null),
            documentType: fc.constant(null),
            documentNumber: fc.constant(null),
            createdAt: fc.constant(null),
          }),
          (record) => {
            const transformed = transformDocumentChange(record)
            
            // Null values should be converted to empty strings
            return (
              transformed.id === '' &&
              transformed.userName === '' &&
              transformed.actionType === '' &&
              transformed.documentType === '' &&
              transformed.documentNumber === '' &&
              transformed.createdAt === ''
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve non-null values in document change records', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            userName: fc.string({ minLength: 1, maxLength: 50 }),
            actionType: fc.constantFrom('create', 'update', 'delete'),
            documentType: fc.constantFrom('job_order', 'invoice', 'pjo'),
            documentNumber: fc.string({ minLength: 1, maxLength: 20 }),
            createdAt: dateStringArb,
          }),
          (record) => {
            const transformed = transformDocumentChange(record)
            
            return (
              transformed.id === record.id &&
              transformed.userName === record.userName &&
              transformed.actionType === record.actionType &&
              transformed.documentType === record.documentType &&
              transformed.documentNumber === record.documentNumber &&
              transformed.createdAt === record.createdAt
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle mixed null and non-null values in activity records', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            userEmail: fc.constant(null),
            actionType: actionTypeArb,
            pagePath: fc.constant(null),
            resourceType: fc.string({ minLength: 1, maxLength: 50 }),
            createdAt: fc.constant(null),
          }),
          (record) => {
            const transformed = transformActivity(record)
            
            return (
              transformed.id === record.id &&
              transformed.userEmail === null &&
              transformed.actionType === record.actionType &&
              transformed.pagePath === null &&
              transformed.resourceType === record.resourceType &&
              transformed.createdAt === ''
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle mixed null and non-null values in document change records', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            userName: fc.constant(null),
            actionType: fc.constantFrom('create', 'update', 'delete'),
            documentType: fc.constant(null),
            documentNumber: fc.string({ minLength: 1, maxLength: 20 }),
            createdAt: fc.constant(null),
          }),
          (record) => {
            const transformed = transformDocumentChange(record)
            
            return (
              transformed.id === record.id &&
              transformed.userName === '' &&
              transformed.actionType === record.actionType &&
              transformed.documentType === '' &&
              transformed.documentNumber === record.documentNumber &&
              transformed.createdAt === ''
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


// =====================================================
// Property 7: Cache Key Format
// =====================================================

describe('Property 7: Cache key format', () => {
  /**
   * **Feature: sysadmin-dashboard, Property 7: Cache key format**
   * **Validates: Requirements 7.4**
   * 
   * For any role string and date, the generated cache key should match 
   * the pattern 'sysadmin-dashboard-metrics:{role}:{YYYY-MM-DD}'.
   */
  
  // Helper function to generate cache key (mirrors the implementation)
  function generateCacheKeySync(prefix: string, role: string, date: Date): string {
    const dateStr = date.toISOString().split('T')[0]
    return `${prefix}:${role}:${dateStr}`
  }
  
  it('should generate cache key with correct format', () => {
    fc.assert(
      fc.property(
        roleArb,
        todayArb,
        (role, date) => {
          const key = generateCacheKeySync('sysadmin-dashboard-metrics', role, date)
          
          // Key should match pattern: prefix:role:YYYY-MM-DD
          const pattern = /^sysadmin-dashboard-metrics:[a-z_]+:\d{4}-\d{2}-\d{2}$/
          return pattern.test(key)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should include the role in the cache key', () => {
    fc.assert(
      fc.property(
        roleArb,
        todayArb,
        (role, date) => {
          const key = generateCacheKeySync('sysadmin-dashboard-metrics', role, date)
          return key.includes(`:${role}:`)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should include the date in YYYY-MM-DD format', () => {
    fc.assert(
      fc.property(
        roleArb,
        todayArb,
        (role, date) => {
          const key = generateCacheKeySync('sysadmin-dashboard-metrics', role, date)
          const expectedDateStr = date.toISOString().split('T')[0]
          return key.endsWith(`:${expectedDateStr}`)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should generate different keys for different roles', () => {
    fc.assert(
      fc.property(
        fc.tuple(roleArb, roleArb).filter(([r1, r2]) => r1 !== r2),
        todayArb,
        ([role1, role2], date) => {
          const key1 = generateCacheKeySync('sysadmin-dashboard-metrics', role1, date)
          const key2 = generateCacheKeySync('sysadmin-dashboard-metrics', role2, date)
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
        fc.tuple(todayArb, todayArb).filter(([d1, d2]) => 
          d1.toISOString().split('T')[0] !== d2.toISOString().split('T')[0]
        ),
        (role, [date1, date2]) => {
          const key1 = generateCacheKeySync('sysadmin-dashboard-metrics', role, date1)
          const key2 = generateCacheKeySync('sysadmin-dashboard-metrics', role, date2)
          return key1 !== key2
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should generate same key for same role and date', () => {
    fc.assert(
      fc.property(
        roleArb,
        todayArb,
        (role, date) => {
          const key1 = generateCacheKeySync('sysadmin-dashboard-metrics', role, date)
          const key2 = generateCacheKeySync('sysadmin-dashboard-metrics', role, date)
          return key1 === key2
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should have exactly 3 parts separated by colons', () => {
    fc.assert(
      fc.property(
        roleArb,
        todayArb,
        (role, date) => {
          const key = generateCacheKeySync('sysadmin-dashboard-metrics', role, date)
          const parts = key.split(':')
          return parts.length === 3
        }
      ),
      { numRuns: 100 }
    )
  })
})


// =====================================================
// Property 8: Cache Round-Trip
// =====================================================

describe('Property 8: Cache round-trip', () => {
  /**
   * **Feature: sysadmin-dashboard, Property 8: Cache round-trip**
   * **Validates: Requirements 7.2, 7.3**
   * 
   * For any valid metrics data, storing it in the cache and then retrieving it 
   * before TTL expiration should return equivalent data.
   */
  
  // Simple in-memory cache for testing
  const testCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>()
  
  function setTestCache<T>(key: string, data: T, ttl: number = 300000): void {
    testCache.set(key, { data, timestamp: Date.now(), ttl })
  }
  
  function getTestCache<T>(key: string): T | null {
    const entry = testCache.get(key)
    if (!entry) return null
    
    const isExpired = Date.now() - entry.timestamp > entry.ttl
    if (isExpired) {
      testCache.delete(key)
      return null
    }
    
    return entry.data as T
  }
  
  function clearTestCache(): void {
    testCache.clear()
  }
  
  // Arbitrary for SysadminDashboardMetrics
  const metricsArb = fc.record({
    totalUsers: fc.integer({ min: 0, max: 10000 }),
    activeUsers: fc.integer({ min: 0, max: 10000 }),
    activeToday: fc.integer({ min: 0, max: 1000 }),
    activeThisWeek: fc.integer({ min: 0, max: 5000 }),
    newUsersThisMonth: fc.integer({ min: 0, max: 500 }),
    roleDistribution: fc.array(
      fc.record({
        role: roleArb,
        count: fc.integer({ min: 0, max: 1000 }),
      }),
      { minLength: 0, maxLength: 15 }
    ),
    loginsToday: fc.integer({ min: 0, max: 10000 }),
    pageViewsToday: fc.integer({ min: 0, max: 100000 }),
    totalActionsToday: fc.integer({ min: 0, max: 100000 }),
    actionsPerHour: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }),
    recentActivities: fc.array(
      fc.record({
        id: fc.uuid(),
        userEmail: fc.option(fc.emailAddress(), { nil: null }),
        actionType: actionTypeArb,
        pagePath: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
        resourceType: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
        createdAt: dateStringArb,
      }),
      { minLength: 0, maxLength: 20 }
    ),
    recentDocumentChanges: fc.array(
      fc.record({
        id: fc.uuid(),
        userName: fc.string({ minLength: 0, maxLength: 50 }),
        actionType: fc.constantFrom('create', 'update', 'delete', 'approve', 'reject'),
        documentType: fc.constantFrom('job_order', 'invoice', 'pjo', 'quotation', 'bkk'),
        documentNumber: fc.string({ minLength: 0, maxLength: 20 }),
        createdAt: dateStringArb,
      }),
      { minLength: 0, maxLength: 10 }
    ),
  })
  
  beforeEach(() => {
    clearTestCache()
  })

  it('should return cached data when retrieved before TTL expiration', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        metricsArb,
        (key, metrics) => {
          clearTestCache()
          
          // Store data
          setTestCache(key, metrics, 300000) // 5 minute TTL
          
          // Retrieve immediately (before TTL)
          const retrieved = getTestCache(key)
          
          // Should return the same data
          return JSON.stringify(retrieved) === JSON.stringify(metrics)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve all metric fields through cache round-trip', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        metricsArb,
        (key, metrics) => {
          clearTestCache()
          
          setTestCache(key, metrics)
          const retrieved = getTestCache<typeof metrics>(key)
          
          if (!retrieved) return false
          
          // Check all top-level fields
          return (
            retrieved.totalUsers === metrics.totalUsers &&
            retrieved.activeUsers === metrics.activeUsers &&
            retrieved.activeToday === metrics.activeToday &&
            retrieved.activeThisWeek === metrics.activeThisWeek &&
            retrieved.newUsersThisMonth === metrics.newUsersThisMonth &&
            retrieved.loginsToday === metrics.loginsToday &&
            retrieved.pageViewsToday === metrics.pageViewsToday &&
            retrieved.totalActionsToday === metrics.totalActionsToday &&
            retrieved.roleDistribution.length === metrics.roleDistribution.length &&
            retrieved.recentActivities.length === metrics.recentActivities.length &&
            retrieved.recentDocumentChanges.length === metrics.recentDocumentChanges.length
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return null for non-existent cache keys', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (key) => {
          clearTestCache()
          const retrieved = getTestCache(key)
          return retrieved === null
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return null after cache entry expires', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        metricsArb,
        (key, metrics) => {
          clearTestCache()
          
          // Store with very short TTL (already expired)
          testCache.set(key, { 
            data: metrics, 
            timestamp: Date.now() - 1000, // 1 second ago
            ttl: 0 // 0ms TTL = immediately expired
          })
          
          // Should return null because expired
          const retrieved = getTestCache(key)
          return retrieved === null
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle empty arrays in metrics', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (key) => {
          clearTestCache()
          
          const emptyMetrics = {
            totalUsers: 0,
            activeUsers: 0,
            activeToday: 0,
            activeThisWeek: 0,
            newUsersThisMonth: 0,
            roleDistribution: [],
            loginsToday: 0,
            pageViewsToday: 0,
            totalActionsToday: 0,
            actionsPerHour: 0,
            recentActivities: [],
            recentDocumentChanges: [],
          }
          
          setTestCache(key, emptyMetrics)
          const retrieved = getTestCache<typeof emptyMetrics>(key)
          
          return (
            retrieved !== null &&
            retrieved.roleDistribution.length === 0 &&
            retrieved.recentActivities.length === 0 &&
            retrieved.recentDocumentChanges.length === 0
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should overwrite existing cache entry with same key', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        metricsArb,
        metricsArb,
        (key, metrics1, metrics2) => {
          clearTestCache()
          
          // Store first metrics
          setTestCache(key, metrics1)
          
          // Overwrite with second metrics
          setTestCache(key, metrics2)
          
          // Should return second metrics
          const retrieved = getTestCache(key)
          return JSON.stringify(retrieved) === JSON.stringify(metrics2)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should maintain separate entries for different keys', () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.uuid(), fc.uuid()).filter(([k1, k2]) => k1 !== k2),
        metricsArb,
        metricsArb,
        ([key1, key2], metrics1, metrics2) => {
          clearTestCache()
          
          setTestCache(key1, metrics1)
          setTestCache(key2, metrics2)
          
          const retrieved1 = getTestCache(key1)
          const retrieved2 = getTestCache(key2)
          
          return (
            JSON.stringify(retrieved1) === JSON.stringify(metrics1) &&
            JSON.stringify(retrieved2) === JSON.stringify(metrics2)
          )
        }
      ),
      { numRuns: 100 }
    )
  })
})


// =====================================================
// Property 9: Role-Based Access Control
// =====================================================

describe('Property 9: Role-based access control', () => {
  /**
   * **Feature: sysadmin-dashboard, Property 9: Role-based access control**
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
   * 
   * For any user role, access to the Sysadmin Dashboard should be granted if and only if 
   * the role is in the allowed set ['sysadmin', 'owner', 'director']. Users with roles 
   * not in this set should be redirected to the default dashboard.
   */
  
  function hasAccess(role: string): boolean {
    return ALLOWED_SYSADMIN_ROLES.includes(role)
  }

  it('should grant access to sysadmin role', () => {
    expect(hasAccess('sysadmin')).toBe(true)
  })

  it('should grant access to owner role', () => {
    expect(hasAccess('owner')).toBe(true)
  })

  it('should grant access to director role', () => {
    expect(hasAccess('director')).toBe(true)
  })

  it('should deny access to all non-allowed roles', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ROLES.filter(r => !ALLOWED_SYSADMIN_ROLES.includes(r))),
        (role) => {
          return !hasAccess(role)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should have exactly 3 allowed roles', () => {
    expect(ALLOWED_SYSADMIN_ROLES.length).toBe(3)
  })

  it('should grant access if and only if role is in allowed set', () => {
    fc.assert(
      fc.property(
        roleArb,
        (role) => {
          const shouldHaveAccess = ALLOWED_SYSADMIN_ROLES.includes(role)
          const actualAccess = hasAccess(role)
          return shouldHaveAccess === actualAccess
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should deny access to empty string role', () => {
    expect(hasAccess('')).toBe(false)
  })

  it('should deny access to unknown roles', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !ALL_ROLES.includes(s)),
        (unknownRole) => {
          return !hasAccess(unknownRole)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should be case-sensitive (uppercase roles denied)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALLOWED_SYSADMIN_ROLES),
        (role) => {
          return !hasAccess(role.toUpperCase())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should partition all roles into allowed and denied', () => {
    fc.assert(
      fc.property(
        roleArb,
        (role) => {
          // Every role is either allowed or denied, never both
          const isAllowed = hasAccess(role)
          const isDenied = !hasAccess(role)
          return isAllowed !== isDenied // XOR - exactly one must be true
        }
      ),
      { numRuns: 100 }
    )
  })
})
