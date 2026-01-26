/**
 * Unit tests for Sysadmin Dashboard Data Service
 * Tests specific examples and edge cases
 * 
 * **Feature: sysadmin-dashboard**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateHoursElapsed, calculateActionsPerHour } from '@/lib/dashboard/sysadmin-data'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock dashboard cache
vi.mock('@/lib/dashboard-cache', () => ({
  getOrFetch: vi.fn((key, fetcher) => fetcher()),
  generateCacheKey: vi.fn((prefix, role) => `${prefix}:${role}:2026-01-26`),
}))

// =====================================================
// Constants
// =====================================================

const ALLOWED_SYSADMIN_ROLES = ['sysadmin', 'owner', 'director']
const ALL_ROLES = [
  'owner', 'director', 'sysadmin', 'marketing_manager', 'finance_manager', 
  'operations_manager', 'administration', 'finance', 'marketing', 'ops', 
  'engineer', 'hr', 'hse', 'agency', 'customs'
]

// =====================================================
// Test Helper Functions
// =====================================================

/**
 * Check if a role has access to sysadmin dashboard
 */
function hasRoleAccess(role: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(role)
}

/**
 * Filter users by active status
 */
function filterActiveUsers<T extends { isActive: boolean }>(users: T[]): T[] {
  return users.filter(u => u.isActive)
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
 * Count users by role and return sorted distribution
 */
function getRoleDistribution<T extends { role: string }>(users: T[]): { role: string; count: number }[] {
  const groups = groupByRole(users)
  const distribution = Array.from(groups.entries())
    .map(([role, groupUsers]) => ({ role, count: groupUsers.length }))
    .sort((a, b) => b.count - a.count)
  return distribution
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


/**
 * Get action type badge color
 */
function getActionTypeColor(actionType: string): string {
  const type = actionType.toLowerCase()
  switch (type) {
    case 'login':
      return 'green'
    case 'page_view':
      return 'blue'
    case 'create':
      return 'purple'
    case 'update':
      return 'yellow'
    case 'delete':
      return 'red'
    case 'approve':
    case 'reject':
      return 'orange'
    default:
      return 'gray'
  }
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


describe('Sysadmin Dashboard Data - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =====================================================
  // Empty Data Scenarios
  // =====================================================

  describe('Empty data scenarios', () => {
    it('should handle empty users array', () => {
      const users: { id: string; isActive: boolean }[] = []
      const activeCount = filterActiveUsers(users).length
      expect(activeCount).toBe(0)
    })

    it('should handle empty activities array', () => {
      const activities: { id: string; actionType: string; createdAt: string }[] = []
      const loginCount = activities.filter(a => a.actionType === 'login').length
      expect(loginCount).toBe(0)
    })

    it('should handle empty document changes array', () => {
      const changes: { id: string; createdAt: string }[] = []
      const limited = orderAndLimit(changes, 10)
      expect(limited).toHaveLength(0)
    })

    it('should return empty role distribution for empty users', () => {
      const users: { id: string; role: string }[] = []
      const distribution = getRoleDistribution(users)
      expect(distribution).toHaveLength(0)
    })

    it('should return 0 for total users with empty array', () => {
      const users: { id: string }[] = []
      expect(users.length).toBe(0)
    })

    it('should return 0 for active users with empty array', () => {
      const users: { id: string; isActive: boolean }[] = []
      const activeCount = filterActiveUsers(users).length
      expect(activeCount).toBe(0)
    })

    it('should return 0 for active today with empty array', () => {
      const users: { id: string; lastLoginAt: string | null }[] = []
      const today = '2026-01-26'
      const activeTodayCount = users.filter(u => 
        u.lastLoginAt !== null && u.lastLoginAt >= today
      ).length
      expect(activeTodayCount).toBe(0)
    })

    it('should return 0 for logins today with empty activities', () => {
      const activities: { id: string; actionType: string; createdAt: string }[] = []
      const today = '2026-01-26'
      const loginsTodayCount = activities.filter(a => 
        a.actionType === 'login' && a.createdAt >= today
      ).length
      expect(loginsTodayCount).toBe(0)
    })

    it('should return 0 for page views today with empty activities', () => {
      const activities: { id: string; actionType: string; createdAt: string }[] = []
      const today = '2026-01-26'
      const pageViewsTodayCount = activities.filter(a => 
        a.actionType === 'page_view' && a.createdAt >= today
      ).length
      expect(pageViewsTodayCount).toBe(0)
    })

    it('should return 0 for total actions today with empty activities', () => {
      const activities: { id: string; createdAt: string }[] = []
      const today = '2026-01-26'
      const totalActionsTodayCount = activities.filter(a => a.createdAt >= today).length
      expect(totalActionsTodayCount).toBe(0)
    })

    it('should return empty array for recent activities with empty input', () => {
      const activities: { id: string; createdAt: string }[] = []
      const limited = orderAndLimit(activities, 20)
      expect(limited).toHaveLength(0)
    })

    it('should return empty array for recent document changes with empty input', () => {
      const changes: { id: string; createdAt: string }[] = []
      const limited = orderAndLimit(changes, 10)
      expect(limited).toHaveLength(0)
    })
  })


  // =====================================================
  // Single Record Scenarios
  // =====================================================

  describe('Single record scenarios', () => {
    it('should count single active user correctly', () => {
      const users = [{ id: '1', isActive: true }]
      const activeCount = filterActiveUsers(users).length
      expect(activeCount).toBe(1)
    })

    it('should count single inactive user correctly', () => {
      const users = [{ id: '1', isActive: false }]
      const activeCount = filterActiveUsers(users).length
      expect(activeCount).toBe(0)
    })

    it('should handle single user in role distribution', () => {
      const users = [{ id: '1', role: 'sysadmin' }]
      const distribution = getRoleDistribution(users)
      expect(distribution).toHaveLength(1)
      expect(distribution[0].role).toBe('sysadmin')
      expect(distribution[0].count).toBe(1)
    })

    it('should handle single activity record', () => {
      const activities = [{ id: '1', actionType: 'login', createdAt: '2026-01-26T10:00:00Z' }]
      const limited = orderAndLimit(activities, 20)
      expect(limited).toHaveLength(1)
      expect(limited[0].id).toBe('1')
    })

    it('should handle single document change record', () => {
      const changes = [{ id: '1', createdAt: '2026-01-26T10:00:00Z' }]
      const limited = orderAndLimit(changes, 10)
      expect(limited).toHaveLength(1)
      expect(limited[0].id).toBe('1')
    })

    it('should count single login today correctly', () => {
      const today = '2026-01-26'
      const activities = [{ id: '1', actionType: 'login', createdAt: '2026-01-26T10:00:00Z' }]
      const loginsTodayCount = activities.filter(a => 
        a.actionType === 'login' && a.createdAt >= today
      ).length
      expect(loginsTodayCount).toBe(1)
    })

    it('should count single page view today correctly', () => {
      const today = '2026-01-26'
      const activities = [{ id: '1', actionType: 'page_view', createdAt: '2026-01-26T10:00:00Z' }]
      const pageViewsTodayCount = activities.filter(a => 
        a.actionType === 'page_view' && a.createdAt >= today
      ).length
      expect(pageViewsTodayCount).toBe(1)
    })

    it('should handle single user logged in today', () => {
      const today = '2026-01-26'
      const users = [{ id: '1', lastLoginAt: '2026-01-26T10:00:00Z' }]
      const activeTodayCount = users.filter(u => 
        u.lastLoginAt !== null && u.lastLoginAt >= today
      ).length
      expect(activeTodayCount).toBe(1)
    })

    it('should handle single new user this month', () => {
      const startOfMonth = '2026-01-01'
      const users = [{ id: '1', createdAt: '2026-01-15T10:00:00Z' }]
      const newThisMonthCount = users.filter(u => u.createdAt >= startOfMonth).length
      expect(newThisMonthCount).toBe(1)
    })
  })


  // =====================================================
  // Division by Zero Scenarios (Actions Per Hour)
  // =====================================================

  describe('Division by zero scenarios (Actions Per Hour)', () => {
    it('should return 0 when hours elapsed is 0', () => {
      const result = calculateActionsPerHour(100, 0)
      expect(result).toBe(0)
    })

    it('should return 0 when hours elapsed is negative', () => {
      const result = calculateActionsPerHour(100, -5)
      expect(result).toBe(0)
    })

    it('should return 0 when total actions is 0', () => {
      const result = calculateActionsPerHour(0, 5)
      expect(result).toBe(0)
    })

    it('should return 0 when both are 0', () => {
      const result = calculateActionsPerHour(0, 0)
      expect(result).toBe(0)
    })

    it('should calculate correctly with positive values', () => {
      // 100 actions / 5 hours = 20 actions per hour
      const result = calculateActionsPerHour(100, 5)
      expect(result).toBe(20)
    })

    it('should round to one decimal place', () => {
      // 100 actions / 3 hours = 33.333... -> 33.3
      const result = calculateActionsPerHour(100, 3)
      expect(result).toBe(33.3)
    })

    it('should handle very small hours elapsed', () => {
      // 10 actions / 0.1 hours = 100 actions per hour
      const result = calculateActionsPerHour(10, 0.1)
      expect(result).toBe(100)
    })

    it('should handle large action counts', () => {
      // 100000 actions / 24 hours = 4166.666... -> 4166.7
      const result = calculateActionsPerHour(100000, 24)
      expect(result).toBe(4166.7)
    })

    it('should handle fractional results correctly', () => {
      // 7 actions / 3 hours = 2.333... -> 2.3
      const result = calculateActionsPerHour(7, 3)
      expect(result).toBe(2.3)
    })

    it('should handle 1 action per hour exactly', () => {
      const result = calculateActionsPerHour(5, 5)
      expect(result).toBe(1)
    })
  })

  // =====================================================
  // Hours Elapsed Calculation
  // =====================================================

  describe('Hours elapsed calculation', () => {
    it('should return at least 1 when start and end are the same', () => {
      const now = new Date('2026-01-26T10:00:00Z')
      const result = calculateHoursElapsed(now, now)
      expect(result).toBe(1)
    })

    it('should return at least 1 for very small time differences', () => {
      const start = new Date('2026-01-26T10:00:00Z')
      const end = new Date('2026-01-26T10:00:01Z') // 1 second later
      const result = calculateHoursElapsed(start, end)
      expect(result).toBe(1)
    })

    it('should calculate 1 hour correctly', () => {
      const start = new Date('2026-01-26T10:00:00Z')
      const end = new Date('2026-01-26T11:00:00Z')
      const result = calculateHoursElapsed(start, end)
      expect(result).toBe(1)
    })

    it('should calculate 12 hours correctly', () => {
      const start = new Date('2026-01-26T00:00:00Z')
      const end = new Date('2026-01-26T12:00:00Z')
      const result = calculateHoursElapsed(start, end)
      expect(result).toBe(12)
    })

    it('should calculate 24 hours correctly', () => {
      const start = new Date('2026-01-26T00:00:00Z')
      const end = new Date('2026-01-27T00:00:00Z')
      const result = calculateHoursElapsed(start, end)
      expect(result).toBe(24)
    })

    it('should handle fractional hours', () => {
      const start = new Date('2026-01-26T10:00:00Z')
      const end = new Date('2026-01-26T10:30:00Z') // 30 minutes = 0.5 hours
      const result = calculateHoursElapsed(start, end)
      // Should return at least 1 (minimum value)
      expect(result).toBe(1)
    })

    it('should handle 2.5 hours correctly', () => {
      const start = new Date('2026-01-26T10:00:00Z')
      const end = new Date('2026-01-26T12:30:00Z')
      const result = calculateHoursElapsed(start, end)
      expect(result).toBe(2.5)
    })

    it('should always return a positive number', () => {
      const start = new Date('2026-01-26T10:00:00Z')
      const end = new Date('2026-01-26T08:00:00Z') // end before start
      const result = calculateHoursElapsed(start, end)
      expect(result).toBeGreaterThan(0)
    })
  })


  // =====================================================
  // Role Distribution Sorting
  // =====================================================

  describe('Role distribution sorting', () => {
    it('should sort roles by count descending', () => {
      const users = [
        { id: '1', role: 'ops' },
        { id: '2', role: 'ops' },
        { id: '3', role: 'ops' },
        { id: '4', role: 'finance' },
        { id: '5', role: 'finance' },
        { id: '6', role: 'hr' },
      ]
      const distribution = getRoleDistribution(users)
      
      expect(distribution[0].role).toBe('ops')
      expect(distribution[0].count).toBe(3)
      expect(distribution[1].role).toBe('finance')
      expect(distribution[1].count).toBe(2)
      expect(distribution[2].role).toBe('hr')
      expect(distribution[2].count).toBe(1)
    })

    it('should handle all users with same role', () => {
      const users = [
        { id: '1', role: 'sysadmin' },
        { id: '2', role: 'sysadmin' },
        { id: '3', role: 'sysadmin' },
      ]
      const distribution = getRoleDistribution(users)
      
      expect(distribution).toHaveLength(1)
      expect(distribution[0].role).toBe('sysadmin')
      expect(distribution[0].count).toBe(3)
    })

    it('should handle each user with different role', () => {
      const users = [
        { id: '1', role: 'owner' },
        { id: '2', role: 'director' },
        { id: '3', role: 'sysadmin' },
      ]
      const distribution = getRoleDistribution(users)
      
      expect(distribution).toHaveLength(3)
      // All have count 1, so order may vary but all should be present
      const roles = distribution.map(d => d.role)
      expect(roles).toContain('owner')
      expect(roles).toContain('director')
      expect(roles).toContain('sysadmin')
    })

    it('should handle empty role as unknown', () => {
      const users = [
        { id: '1', role: '' },
        { id: '2', role: '' },
      ]
      const distribution = getRoleDistribution(users)
      
      expect(distribution).toHaveLength(1)
      expect(distribution[0].role).toBe('unknown')
      expect(distribution[0].count).toBe(2)
    })

    it('should count only active users in role distribution', () => {
      const users = [
        { id: '1', role: 'ops', isActive: true },
        { id: '2', role: 'ops', isActive: true },
        { id: '3', role: 'ops', isActive: false },
        { id: '4', role: 'finance', isActive: true },
        { id: '5', role: 'finance', isActive: false },
      ]
      const activeUsers = filterActiveUsers(users)
      const distribution = getRoleDistribution(activeUsers)
      
      expect(distribution[0].role).toBe('ops')
      expect(distribution[0].count).toBe(2)
      expect(distribution[1].role).toBe('finance')
      expect(distribution[1].count).toBe(1)
    })

    it('should handle all 15 roles correctly', () => {
      const users = ALL_ROLES.map((role, i) => ({ id: String(i), role }))
      const distribution = getRoleDistribution(users)
      
      expect(distribution).toHaveLength(15)
      // Each role should have count 1
      distribution.forEach(d => {
        expect(d.count).toBe(1)
      })
    })

    it('should maintain stable sort for equal counts', () => {
      const users = [
        { id: '1', role: 'hr' },
        { id: '2', role: 'finance' },
        { id: '3', role: 'ops' },
      ]
      const distribution = getRoleDistribution(users)
      
      // All have count 1
      expect(distribution).toHaveLength(3)
      distribution.forEach(d => {
        expect(d.count).toBe(1)
      })
    })
  })


  // =====================================================
  // Data Transformation with Null Values
  // =====================================================

  describe('Data transformation with null values', () => {
    describe('Activity record transformation', () => {
      it('should transform activity with all fields present', () => {
        const record = {
          id: 'act-123',
          userEmail: 'user@test.com',
          actionType: 'login',
          pagePath: '/dashboard',
          resourceType: 'job_order',
          createdAt: '2026-01-26T10:00:00Z',
        }
        
        const transformed = transformActivity(record)
        
        expect(transformed.id).toBe('act-123')
        expect(transformed.userEmail).toBe('user@test.com')
        expect(transformed.actionType).toBe('login')
        expect(transformed.pagePath).toBe('/dashboard')
        expect(transformed.resourceType).toBe('job_order')
        expect(transformed.createdAt).toBe('2026-01-26T10:00:00Z')
      })

      it('should transform activity with all null fields', () => {
        const record = {
          id: null,
          userEmail: null,
          actionType: null,
          pagePath: null,
          resourceType: null,
          createdAt: null,
        }
        
        const transformed = transformActivity(record)
        
        expect(transformed.id).toBe('')
        expect(transformed.userEmail).toBeNull()
        expect(transformed.actionType).toBe('')
        expect(transformed.pagePath).toBeNull()
        expect(transformed.resourceType).toBeNull()
        expect(transformed.createdAt).toBe('')
      })

      it('should transform activity with partial null fields', () => {
        const record = {
          id: 'act-456',
          userEmail: null,
          actionType: 'page_view',
          pagePath: null,
          resourceType: 'invoice',
          createdAt: null,
        }
        
        const transformed = transformActivity(record)
        
        expect(transformed.id).toBe('act-456')
        expect(transformed.userEmail).toBeNull()
        expect(transformed.actionType).toBe('page_view')
        expect(transformed.pagePath).toBeNull()
        expect(transformed.resourceType).toBe('invoice')
        expect(transformed.createdAt).toBe('')
      })

      it('should handle null userEmail correctly', () => {
        const record = {
          id: 'act-789',
          userEmail: null,
          actionType: 'create',
          pagePath: '/customers',
          resourceType: 'customer',
          createdAt: '2026-01-26T10:00:00Z',
        }
        
        const transformed = transformActivity(record)
        
        expect(transformed.userEmail).toBeNull()
      })

      it('should handle null pagePath correctly', () => {
        const record = {
          id: 'act-101',
          userEmail: 'user@test.com',
          actionType: 'update',
          pagePath: null,
          resourceType: 'vendor',
          createdAt: '2026-01-26T10:00:00Z',
        }
        
        const transformed = transformActivity(record)
        
        expect(transformed.pagePath).toBeNull()
      })

      it('should handle null resourceType correctly', () => {
        const record = {
          id: 'act-102',
          userEmail: 'user@test.com',
          actionType: 'delete',
          pagePath: '/settings',
          resourceType: null,
          createdAt: '2026-01-26T10:00:00Z',
        }
        
        const transformed = transformActivity(record)
        
        expect(transformed.resourceType).toBeNull()
      })
    })

    describe('Document change record transformation', () => {
      it('should transform document change with all fields present', () => {
        const record = {
          id: 'doc-123',
          userName: 'John Doe',
          actionType: 'create',
          documentType: 'job_order',
          documentNumber: 'JO-0001/CARGO/I/2026',
          createdAt: '2026-01-26T10:00:00Z',
        }
        
        const transformed = transformDocumentChange(record)
        
        expect(transformed.id).toBe('doc-123')
        expect(transformed.userName).toBe('John Doe')
        expect(transformed.actionType).toBe('create')
        expect(transformed.documentType).toBe('job_order')
        expect(transformed.documentNumber).toBe('JO-0001/CARGO/I/2026')
        expect(transformed.createdAt).toBe('2026-01-26T10:00:00Z')
      })

      it('should transform document change with all null fields', () => {
        const record = {
          id: null,
          userName: null,
          actionType: null,
          documentType: null,
          documentNumber: null,
          createdAt: null,
        }
        
        const transformed = transformDocumentChange(record)
        
        expect(transformed.id).toBe('')
        expect(transformed.userName).toBe('')
        expect(transformed.actionType).toBe('')
        expect(transformed.documentType).toBe('')
        expect(transformed.documentNumber).toBe('')
        expect(transformed.createdAt).toBe('')
      })

      it('should transform document change with partial null fields', () => {
        const record = {
          id: 'doc-456',
          userName: null,
          actionType: 'update',
          documentType: null,
          documentNumber: 'INV-2026-0001',
          createdAt: null,
        }
        
        const transformed = transformDocumentChange(record)
        
        expect(transformed.id).toBe('doc-456')
        expect(transformed.userName).toBe('')
        expect(transformed.actionType).toBe('update')
        expect(transformed.documentType).toBe('')
        expect(transformed.documentNumber).toBe('INV-2026-0001')
        expect(transformed.createdAt).toBe('')
      })

      it('should handle null userName correctly', () => {
        const record = {
          id: 'doc-789',
          userName: null,
          actionType: 'delete',
          documentType: 'invoice',
          documentNumber: 'INV-2026-0002',
          createdAt: '2026-01-26T10:00:00Z',
        }
        
        const transformed = transformDocumentChange(record)
        
        expect(transformed.userName).toBe('')
      })

      it('should handle null documentNumber correctly', () => {
        const record = {
          id: 'doc-101',
          userName: 'Jane Smith',
          actionType: 'approve',
          documentType: 'pjo',
          documentNumber: null,
          createdAt: '2026-01-26T10:00:00Z',
        }
        
        const transformed = transformDocumentChange(record)
        
        expect(transformed.documentNumber).toBe('')
      })
    })
  })


  // =====================================================
  // Role Access Scenarios
  // =====================================================

  describe('Role access scenarios', () => {
    it('should allow sysadmin role', () => {
      expect(hasRoleAccess('sysadmin', ALLOWED_SYSADMIN_ROLES)).toBe(true)
    })

    it('should allow owner role', () => {
      expect(hasRoleAccess('owner', ALLOWED_SYSADMIN_ROLES)).toBe(true)
    })

    it('should allow director role', () => {
      expect(hasRoleAccess('director', ALLOWED_SYSADMIN_ROLES)).toBe(true)
    })

    it('should deny finance role', () => {
      expect(hasRoleAccess('finance', ALLOWED_SYSADMIN_ROLES)).toBe(false)
    })

    it('should deny finance_manager role', () => {
      expect(hasRoleAccess('finance_manager', ALLOWED_SYSADMIN_ROLES)).toBe(false)
    })

    it('should deny operations_manager role', () => {
      expect(hasRoleAccess('operations_manager', ALLOWED_SYSADMIN_ROLES)).toBe(false)
    })

    it('should deny marketing_manager role', () => {
      expect(hasRoleAccess('marketing_manager', ALLOWED_SYSADMIN_ROLES)).toBe(false)
    })

    it('should deny administration role', () => {
      expect(hasRoleAccess('administration', ALLOWED_SYSADMIN_ROLES)).toBe(false)
    })

    it('should deny marketing role', () => {
      expect(hasRoleAccess('marketing', ALLOWED_SYSADMIN_ROLES)).toBe(false)
    })

    it('should deny ops role', () => {
      expect(hasRoleAccess('ops', ALLOWED_SYSADMIN_ROLES)).toBe(false)
    })

    it('should deny engineer role', () => {
      expect(hasRoleAccess('engineer', ALLOWED_SYSADMIN_ROLES)).toBe(false)
    })

    it('should deny hr role', () => {
      expect(hasRoleAccess('hr', ALLOWED_SYSADMIN_ROLES)).toBe(false)
    })

    it('should deny hse role', () => {
      expect(hasRoleAccess('hse', ALLOWED_SYSADMIN_ROLES)).toBe(false)
    })

    it('should deny agency role', () => {
      expect(hasRoleAccess('agency', ALLOWED_SYSADMIN_ROLES)).toBe(false)
    })

    it('should deny customs role', () => {
      expect(hasRoleAccess('customs', ALLOWED_SYSADMIN_ROLES)).toBe(false)
    })

    it('should deny empty string role', () => {
      expect(hasRoleAccess('', ALLOWED_SYSADMIN_ROLES)).toBe(false)
    })

    it('should deny unknown roles', () => {
      expect(hasRoleAccess('admin', ALLOWED_SYSADMIN_ROLES)).toBe(false)
      expect(hasRoleAccess('superuser', ALLOWED_SYSADMIN_ROLES)).toBe(false)
      expect(hasRoleAccess('guest', ALLOWED_SYSADMIN_ROLES)).toBe(false)
    })

    it('should be case-sensitive', () => {
      expect(hasRoleAccess('SYSADMIN', ALLOWED_SYSADMIN_ROLES)).toBe(false)
      expect(hasRoleAccess('Sysadmin', ALLOWED_SYSADMIN_ROLES)).toBe(false)
      expect(hasRoleAccess('OWNER', ALLOWED_SYSADMIN_ROLES)).toBe(false)
      expect(hasRoleAccess('DIRECTOR', ALLOWED_SYSADMIN_ROLES)).toBe(false)
    })
  })


  // =====================================================
  // Action Type Color Mapping
  // =====================================================

  describe('Action type color mapping', () => {
    it('should map login to green', () => {
      expect(getActionTypeColor('login')).toBe('green')
    })

    it('should map page_view to blue', () => {
      expect(getActionTypeColor('page_view')).toBe('blue')
    })

    it('should map create to purple', () => {
      expect(getActionTypeColor('create')).toBe('purple')
    })

    it('should map update to yellow', () => {
      expect(getActionTypeColor('update')).toBe('yellow')
    })

    it('should map delete to red', () => {
      expect(getActionTypeColor('delete')).toBe('red')
    })

    it('should map approve to orange', () => {
      expect(getActionTypeColor('approve')).toBe('orange')
    })

    it('should map reject to orange', () => {
      expect(getActionTypeColor('reject')).toBe('orange')
    })

    it('should map unknown action types to gray', () => {
      expect(getActionTypeColor('unknown')).toBe('gray')
      expect(getActionTypeColor('')).toBe('gray')
      expect(getActionTypeColor('custom_action')).toBe('gray')
    })

    it('should be case-insensitive for login', () => {
      expect(getActionTypeColor('LOGIN')).toBe('green')
      expect(getActionTypeColor('Login')).toBe('green')
      expect(getActionTypeColor('LoGiN')).toBe('green')
    })

    it('should be case-insensitive for page_view', () => {
      expect(getActionTypeColor('PAGE_VIEW')).toBe('blue')
      expect(getActionTypeColor('Page_View')).toBe('blue')
    })

    it('should be case-insensitive for create', () => {
      expect(getActionTypeColor('CREATE')).toBe('purple')
      expect(getActionTypeColor('Create')).toBe('purple')
    })

    it('should be case-insensitive for update', () => {
      expect(getActionTypeColor('UPDATE')).toBe('yellow')
      expect(getActionTypeColor('Update')).toBe('yellow')
    })

    it('should be case-insensitive for delete', () => {
      expect(getActionTypeColor('DELETE')).toBe('red')
      expect(getActionTypeColor('Delete')).toBe('red')
    })

    it('should be case-insensitive for approve', () => {
      expect(getActionTypeColor('APPROVE')).toBe('orange')
      expect(getActionTypeColor('Approve')).toBe('orange')
    })

    it('should be case-insensitive for reject', () => {
      expect(getActionTypeColor('REJECT')).toBe('orange')
      expect(getActionTypeColor('Reject')).toBe('orange')
    })
  })


  // =====================================================
  // Ordering and Limiting
  // =====================================================

  describe('Ordering and limiting', () => {
    it('should order activities by created_at descending', () => {
      const activities = [
        { id: '1', createdAt: '2026-01-26T08:00:00Z' },
        { id: '2', createdAt: '2026-01-26T12:00:00Z' },
        { id: '3', createdAt: '2026-01-26T10:00:00Z' },
      ]
      const ordered = orderAndLimit(activities, 20)
      
      expect(ordered[0].id).toBe('2') // 12:00
      expect(ordered[1].id).toBe('3') // 10:00
      expect(ordered[2].id).toBe('1') // 08:00
    })

    it('should limit to 20 for recent activities', () => {
      const activities = Array.from({ length: 30 }, (_, i) => ({
        id: String(i),
        createdAt: `2026-01-26T${String(i % 24).padStart(2, '0')}:00:00Z`,
      }))
      const limited = orderAndLimit(activities, 20)
      
      expect(limited).toHaveLength(20)
    })

    it('should limit to 10 for recent document changes', () => {
      const changes = Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        createdAt: `2026-01-26T${String(i % 24).padStart(2, '0')}:00:00Z`,
      }))
      const limited = orderAndLimit(changes, 10)
      
      expect(limited).toHaveLength(10)
    })

    it('should return all items if less than limit', () => {
      const activities = [
        { id: '1', createdAt: '2026-01-26T10:00:00Z' },
        { id: '2', createdAt: '2026-01-26T11:00:00Z' },
      ]
      const limited = orderAndLimit(activities, 20)
      
      expect(limited).toHaveLength(2)
    })

    it('should return the most recent items', () => {
      const activities = [
        { id: 'old-1', createdAt: '2026-01-25T10:00:00Z' },
        { id: 'old-2', createdAt: '2026-01-25T11:00:00Z' },
        { id: 'new-1', createdAt: '2026-01-26T10:00:00Z' },
        { id: 'new-2', createdAt: '2026-01-26T11:00:00Z' },
        { id: 'new-3', createdAt: '2026-01-26T12:00:00Z' },
      ]
      const limited = orderAndLimit(activities, 3)
      
      expect(limited).toHaveLength(3)
      expect(limited[0].id).toBe('new-3')
      expect(limited[1].id).toBe('new-2')
      expect(limited[2].id).toBe('new-1')
    })

    it('should handle duplicate timestamps', () => {
      const activities = [
        { id: '1', createdAt: '2026-01-26T10:00:00Z' },
        { id: '2', createdAt: '2026-01-26T10:00:00Z' },
        { id: '3', createdAt: '2026-01-26T10:00:00Z' },
      ]
      const limited = orderAndLimit(activities, 20)
      
      expect(limited).toHaveLength(3)
    })

    it('should preserve all fields when ordering', () => {
      const activities = [
        { id: '1', userEmail: 'a@test.com', actionType: 'login', createdAt: '2026-01-26T08:00:00Z' },
        { id: '2', userEmail: 'b@test.com', actionType: 'page_view', createdAt: '2026-01-26T10:00:00Z' },
      ]
      const ordered = orderAndLimit(activities, 20)
      
      expect(ordered[0].id).toBe('2')
      expect(ordered[0].userEmail).toBe('b@test.com')
      expect(ordered[0].actionType).toBe('page_view')
    })
  })


  // =====================================================
  // Date Boundary Cases
  // =====================================================

  describe('Date boundary cases', () => {
    it('should include users logged in exactly at start of today', () => {
      const today = '2026-01-26'
      const users = [
        { id: '1', lastLoginAt: '2026-01-26T00:00:00Z' },
        { id: '2', lastLoginAt: '2026-01-25T23:59:59Z' },
      ]
      const activeTodayCount = users.filter(u => 
        u.lastLoginAt !== null && u.lastLoginAt >= today
      ).length
      expect(activeTodayCount).toBe(1)
    })

    it('should include activities exactly at start of today', () => {
      const today = '2026-01-26'
      const activities = [
        { id: '1', actionType: 'login', createdAt: '2026-01-26T00:00:00Z' },
        { id: '2', actionType: 'login', createdAt: '2026-01-25T23:59:59Z' },
      ]
      const loginsTodayCount = activities.filter(a => 
        a.actionType === 'login' && a.createdAt >= today
      ).length
      expect(loginsTodayCount).toBe(1)
    })

    it('should include users created exactly at start of month', () => {
      const startOfMonth = '2026-01-01'
      const users = [
        { id: '1', createdAt: '2026-01-01T00:00:00Z' },
        { id: '2', createdAt: '2025-12-31T23:59:59Z' },
      ]
      const newThisMonthCount = users.filter(u => u.createdAt >= startOfMonth).length
      expect(newThisMonthCount).toBe(1)
    })

    it('should include users logged in within 7 days', () => {
      const today = new Date('2026-01-26')
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]
      
      const users = [
        { id: '1', lastLoginAt: '2026-01-19T00:00:00Z' }, // Exactly 7 days ago
        { id: '2', lastLoginAt: '2026-01-18T23:59:59Z' }, // More than 7 days ago
        { id: '3', lastLoginAt: '2026-01-20T00:00:00Z' }, // Within 7 days
      ]
      const activeThisWeekCount = users.filter(u => 
        u.lastLoginAt !== null && u.lastLoginAt >= sevenDaysAgoStr
      ).length
      expect(activeThisWeekCount).toBe(2)
    })

    it('should handle null lastLoginAt correctly', () => {
      const today = '2026-01-26'
      const users = [
        { id: '1', lastLoginAt: null },
        { id: '2', lastLoginAt: '2026-01-26T10:00:00Z' },
      ]
      const activeTodayCount = users.filter(u => 
        u.lastLoginAt !== null && u.lastLoginAt >= today
      ).length
      expect(activeTodayCount).toBe(1)
    })

    it('should handle users who never logged in', () => {
      const today = '2026-01-26'
      const users = [
        { id: '1', lastLoginAt: null },
        { id: '2', lastLoginAt: null },
        { id: '3', lastLoginAt: null },
      ]
      const activeTodayCount = users.filter(u => 
        u.lastLoginAt !== null && u.lastLoginAt >= today
      ).length
      expect(activeTodayCount).toBe(0)
    })
  })


  // =====================================================
  // Activity Filtering by Action Type
  // =====================================================

  describe('Activity filtering by action type', () => {
    it('should count logins correctly', () => {
      const activities = [
        { id: '1', actionType: 'login', createdAt: '2026-01-26T10:00:00Z' },
        { id: '2', actionType: 'page_view', createdAt: '2026-01-26T10:00:00Z' },
        { id: '3', actionType: 'login', createdAt: '2026-01-26T11:00:00Z' },
        { id: '4', actionType: 'create', createdAt: '2026-01-26T12:00:00Z' },
      ]
      const loginCount = activities.filter(a => a.actionType === 'login').length
      expect(loginCount).toBe(2)
    })

    it('should count page views correctly', () => {
      const activities = [
        { id: '1', actionType: 'page_view', createdAt: '2026-01-26T10:00:00Z' },
        { id: '2', actionType: 'page_view', createdAt: '2026-01-26T10:00:00Z' },
        { id: '3', actionType: 'login', createdAt: '2026-01-26T11:00:00Z' },
        { id: '4', actionType: 'page_view', createdAt: '2026-01-26T12:00:00Z' },
      ]
      const pageViewCount = activities.filter(a => a.actionType === 'page_view').length
      expect(pageViewCount).toBe(3)
    })

    it('should count total actions correctly', () => {
      const activities = [
        { id: '1', actionType: 'login', createdAt: '2026-01-26T10:00:00Z' },
        { id: '2', actionType: 'page_view', createdAt: '2026-01-26T10:00:00Z' },
        { id: '3', actionType: 'create', createdAt: '2026-01-26T11:00:00Z' },
        { id: '4', actionType: 'update', createdAt: '2026-01-26T12:00:00Z' },
        { id: '5', actionType: 'delete', createdAt: '2026-01-26T13:00:00Z' },
      ]
      expect(activities.length).toBe(5)
    })

    it('should filter activities by date and action type', () => {
      const today = '2026-01-26'
      const activities = [
        { id: '1', actionType: 'login', createdAt: '2026-01-26T10:00:00Z' },
        { id: '2', actionType: 'login', createdAt: '2026-01-25T10:00:00Z' },
        { id: '3', actionType: 'page_view', createdAt: '2026-01-26T11:00:00Z' },
      ]
      const loginsTodayCount = activities.filter(a => 
        a.actionType === 'login' && a.createdAt >= today
      ).length
      expect(loginsTodayCount).toBe(1)
    })

    it('should handle mixed action types', () => {
      const activities = [
        { id: '1', actionType: 'login' },
        { id: '2', actionType: 'page_view' },
        { id: '3', actionType: 'create' },
        { id: '4', actionType: 'update' },
        { id: '5', actionType: 'delete' },
        { id: '6', actionType: 'approve' },
        { id: '7', actionType: 'reject' },
      ]
      
      expect(activities.filter(a => a.actionType === 'login').length).toBe(1)
      expect(activities.filter(a => a.actionType === 'page_view').length).toBe(1)
      expect(activities.filter(a => a.actionType === 'create').length).toBe(1)
      expect(activities.filter(a => a.actionType === 'update').length).toBe(1)
      expect(activities.filter(a => a.actionType === 'delete').length).toBe(1)
      expect(activities.filter(a => a.actionType === 'approve').length).toBe(1)
      expect(activities.filter(a => a.actionType === 'reject').length).toBe(1)
    })
  })
})
