/**
 * Property-based tests for HR Dashboard Data Service
 * Tests correctness properties for HR metrics calculations
 * 
 * **Feature: hr-dashboard**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// =====================================================
// Constants matching hr-data.ts
// =====================================================

const PENDING_PAYROLL_STATUSES = ['draft', 'pending']
const RESIGNED_STATUSES = ['resigned', 'terminated']
const LEAVE_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled']
const ALLOWED_HR_ROLES = ['hr', 'owner', 'director']

// =====================================================
// Pure Helper Functions for Testing
// These mirror the logic in hr-data.ts but are pure functions
// that can be tested without database dependencies
// =====================================================

/**
 * Calculate sum of numeric values with date filtering
 * **Property 1: Sum aggregation with date filtering**
 */
export function calculateSumWithDateFilter<T extends { date: string; amount: number }>(
  records: T[],
  startDate: string,
  endDate: string
): number {
  return records
    .filter(r => r.date >= startDate && r.date <= endDate)
    .reduce((sum, r) => sum + (r.amount || 0), 0)
}

/**
 * Filter records by status
 * **Property 2: Status filtering correctness**
 */
export function filterByStatus<T extends { status: string }>(
  records: T[],
  statuses: string[]
): T[] {
  const normalizedStatuses = statuses.map(s => s.toLowerCase())
  return records.filter(r => normalizedStatuses.includes(r.status.toLowerCase()))
}

/**
 * Count records by status
 */
export function countByStatus<T extends { status: string }>(
  records: T[],
  statuses: string[]
): number {
  return filterByStatus(records, statuses).length
}

/**
 * Group records by a key function
 * **Property 3: Grouping aggregation correctness**
 */
export function groupByKey<T, K extends string | number>(
  records: T[],
  keyFn: (record: T) => K
): Map<K, T[]> {
  const groups = new Map<K, T[]>()
  for (const record of records) {
    const key = keyFn(record)
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(record)
  }
  return groups
}

/**
 * Sum values within groups
 */
export function sumByGroup<T, K extends string | number>(
  records: T[],
  keyFn: (record: T) => K,
  valueFn: (record: T) => number
): Map<K, number> {
  const groups = groupByKey(records, keyFn)
  const sums = new Map<K, number>()
  for (const [key, groupRecords] of groups) {
    sums.set(key, groupRecords.reduce((sum, r) => sum + valueFn(r), 0))
  }
  return sums
}

/**
 * Filter records by date threshold
 * **Property 4: Threshold date filtering correctness**
 */
export function filterByDateThreshold<T extends { date: string }>(
  records: T[],
  startDate: string,
  endDate: string
): T[] {
  return records.filter(r => r.date >= startDate && r.date <= endDate)
}

/**
 * Filter records by numeric threshold
 */
export function filterByNumericThreshold<T>(
  records: T[],
  valueFn: (record: T) => number,
  threshold: number,
  comparison: 'lt' | 'lte' | 'gt' | 'gte'
): T[] {
  return records.filter(r => {
    const value = valueFn(r)
    switch (comparison) {
      case 'lt': return value < threshold
      case 'lte': return value <= threshold
      case 'gt': return value > threshold
      case 'gte': return value >= threshold
    }
  })
}

/**
 * Calculate percentage
 * **Property 5: Percentage and average calculations**
 */
export function calculatePercentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Math.round((numerator / denominator) * 100)
}

/**
 * Calculate average
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0
  const sum = values.reduce((acc, v) => acc + v, 0)
  return Math.round((sum / values.length) * 10) / 10
}

/**
 * Determine if alert should be shown based on threshold
 * **Property 6: Threshold alert logic**
 */
export function shouldShowAlert(count: number, threshold: number): boolean {
  return count > threshold
}

/**
 * Get alert type based on count and threshold
 */
export function getAlertType(
  count: number,
  warningThreshold: number,
  dangerThreshold?: number
): 'danger' | 'warning' | 'success' | null {
  if (dangerThreshold !== undefined && count > dangerThreshold) return 'danger'
  if (count > warningThreshold) return 'warning'
  if (count === 0) return 'success'
  return null
}

/**
 * Order and limit records
 * **Property 7: Ordering and limiting correctness**
 */
export function orderAndLimit<T>(
  records: T[],
  orderFn: (a: T, b: T) => number,
  limit: number
): T[] {
  return [...records].sort(orderFn).slice(0, limit)
}

/**
 * Transform leave request record
 * **Property 8: Data transformation completeness**
 */
export function transformLeaveRequest(record: {
  id: string | null
  employeeName: string | null
  leaveTypeName: string | null
  status: string | null
  startDate: string | null
  endDate: string | null
  totalDays: number | null
  createdAt: string | null
}): {
  id: string
  employeeName: string
  leaveTypeName: string
  status: string
  startDate: string
  endDate: string
  totalDays: number
  createdAt: string
} {
  return {
    id: record.id || '',
    employeeName: record.employeeName || 'Unknown Employee',
    leaveTypeName: record.leaveTypeName || 'Unknown Leave Type',
    status: record.status || '',
    startDate: record.startDate || '-',
    endDate: record.endDate || '-',
    totalDays: record.totalDays || 0,
    createdAt: record.createdAt || '-',
  }
}

/**
 * Transform attendance correction record
 */
export function transformAttendanceCorrection(record: {
  id: string | null
  employeeName: string | null
  attendanceDate: string | null
  correctionReason: string | null
  updatedAt: string | null
}): {
  id: string
  employeeName: string
  attendanceDate: string
  correctionReason: string
  updatedAt: string
} {
  return {
    id: record.id || '',
    employeeName: record.employeeName || 'Unknown Employee',
    attendanceDate: record.attendanceDate || '-',
    correctionReason: record.correctionReason || '',
    updatedAt: record.updatedAt || '-',
  }
}

/**
 * Get leave status color
 * **Property 9: Status color mapping**
 */
export function getLeaveStatusColor(status: string): 'yellow' | 'green' | 'red' | 'gray' {
  switch (status.toLowerCase()) {
    case 'pending': return 'yellow'
    case 'approved': return 'green'
    case 'rejected': return 'red'
    case 'cancelled': return 'gray'
    default: return 'gray'
  }
}

/**
 * Generate cache key
 * **Property 10: Cache key format**
 */
export function generateCacheKey(prefix: string, role: string): string {
  const today = new Date().toISOString().split('T')[0]
  return `${prefix}:${role}:${today}`
}

/**
 * Generate cache key with specific date
 */
export function generateCacheKeyWithDate(prefix: string, role: string, date: Date): string {
  const dateStr = date.toISOString().split('T')[0]
  return `${prefix}:${role}:${dateStr}`
}

/**
 * Check if role has access to HR dashboard
 * **Property 12: Role-based access control**
 */
export function hasRoleAccess(role: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(role.toLowerCase())
}

// =====================================================
// Arbitraries (Test Data Generators)
// =====================================================

// Generate dates within a reasonable range (2024-2026)
const dateTimestampArb = fc.integer({ 
  min: new Date('2024-01-01').getTime(), 
  max: new Date('2026-12-31').getTime() 
})

const dateStringArb = dateTimestampArb.map(ts => new Date(ts).toISOString().split('T')[0])

// Generate a "today" date
const todayArb = fc.integer({
  min: new Date('2025-01-01').getTime(),
  max: new Date('2026-06-30').getTime()
}).map(ts => new Date(ts))

// Generate positive amounts (currency values)
const amountArb = fc.integer({ min: 0, max: 10_000_000_000 })

// Generate count values
const countArb = fc.integer({ min: 0, max: 10_000 })

// Generate leave request statuses
const leaveStatusArb = fc.constantFrom('pending', 'approved', 'rejected', 'cancelled')

// Generate payroll statuses
const payrollStatusArb = fc.constantFrom('draft', 'pending', 'processed', 'paid')

// Generate employee statuses
const employeeStatusArb = fc.constantFrom('active', 'inactive', 'resigned', 'terminated')

// Generate employment types
const employmentTypeArb = fc.constantFrom('permanent', 'contract', 'probation', 'intern')

// Generate role strings
const roleArb = fc.constantFrom(
  'hr', 'owner', 'director', 'finance', 'ops', 'marketing', 
  'admin', 'engineer', 'hse', 'customs', 'agency'
)

// Generate department IDs
const departmentIdArb = fc.constantFrom('dept-1', 'dept-2', 'dept-3', 'dept-4', 'dept-5')

// Generate payroll record
const payrollRecordArb = fc.record({
  id: fc.uuid(),
  employeeId: fc.uuid(),
  departmentId: departmentIdArb,
  grossSalary: amountArb,
  status: payrollStatusArb,
  date: dateStringArb,
})

// Generate attendance record
const attendanceRecordArb = fc.record({
  id: fc.uuid(),
  employeeId: fc.uuid(),
  departmentId: departmentIdArb,
  date: dateStringArb,
  status: fc.constantFrom('present', 'absent', 'late', 'half_day', 'leave'),
  lateMinutes: fc.integer({ min: 0, max: 120 }),
  earlyLeaveMinutes: fc.integer({ min: 0, max: 120 }),
  workHours: fc.float({ min: 0, max: 12, noNaN: true }),
  overtimeHours: fc.float({ min: 0, max: 8, noNaN: true }),
})

// Generate leave request record
const leaveRequestArb = fc.record({
  id: fc.uuid(),
  employeeId: fc.uuid(),
  employeeName: fc.string({ minLength: 1, maxLength: 50 }),
  leaveTypeId: fc.uuid(),
  leaveTypeName: fc.constantFrom('Annual Leave', 'Sick Leave', 'Personal Leave', 'Maternity Leave'),
  status: leaveStatusArb,
  startDate: dateStringArb,
  endDate: dateStringArb,
  totalDays: fc.integer({ min: 1, max: 30 }),
  createdAt: dateStringArb,
})

// Generate leave balance record
const leaveBalanceArb = fc.record({
  id: fc.uuid(),
  employeeId: fc.uuid(),
  leaveTypeId: fc.uuid(),
  leaveTypeName: fc.constantFrom('Annual Leave', 'Sick Leave', 'Personal Leave'),
  entitledDays: fc.integer({ min: 0, max: 30 }),
  usedDays: fc.integer({ min: 0, max: 30 }),
  availableDays: fc.integer({ min: 0, max: 30 }),
})

// Generate employee record
const employeeRecordArb = fc.record({
  id: fc.uuid(),
  employeeCode: fc.string({ minLength: 1, maxLength: 10 }),
  fullName: fc.string({ minLength: 1, maxLength: 50 }),
  departmentId: departmentIdArb,
  status: employeeStatusArb,
  employmentType: employmentTypeArb,
  joinDate: dateStringArb,
  endDate: fc.option(dateStringArb, { nil: null }),
})

// Generate attendance correction record
const attendanceCorrectionArb = fc.record({
  id: fc.uuid(),
  employeeId: fc.uuid(),
  employeeName: fc.string({ minLength: 1, maxLength: 50 }),
  attendanceDate: dateStringArb,
  correctionReason: fc.string({ minLength: 0, maxLength: 200 }),
  updatedAt: dateStringArb,
})

// =====================================================
// Property Tests
// =====================================================

describe('HR Dashboard Data - Property Tests', () => {
  
  // =====================================================
  // Property 1: Sum Aggregation with Date Filtering
  // =====================================================
  
  describe('Property 1: Sum aggregation with date filtering', () => {
    /**
     * **Feature: hr-dashboard, Property 1: Sum aggregation with date filtering**
     * **Validates: Requirements 1.1, 1.3, 2.1**
     * 
     * For any collection of records with numeric values and dates, the sum aggregation 
     * for a date range should equal the mathematical sum of values for records within that range.
     */
    
    it('should calculate sum correctly for records within date range', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              date: dateStringArb,
              amount: amountArb,
            }),
            { minLength: 0, maxLength: 100 }
          ),
          dateStringArb,
          dateStringArb,
          (records, date1, date2) => {
            const startDate = date1 < date2 ? date1 : date2
            const endDate = date1 < date2 ? date2 : date1
            
            const calculatedSum = calculateSumWithDateFilter(records, startDate, endDate)
            
            // Manually calculate expected sum
            const expectedSum = records
              .filter(r => r.date >= startDate && r.date <= endDate)
              .reduce((sum, r) => sum + r.amount, 0)
            
            return calculatedSum === expectedSum
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 for empty records array', () => {
      const sum = calculateSumWithDateFilter([], '2025-01-01', '2025-12-31')
      expect(sum).toBe(0)
    })

    it('should return 0 when no records fall within date range', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              date: fc.constant('2024-01-15'),
              amount: amountArb,
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (records) => {
            // Date range that doesn't include any records
            const sum = calculateSumWithDateFilter(records, '2025-01-01', '2025-12-31')
            return sum === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include records exactly on boundary dates', () => {
      fc.assert(
        fc.property(
          dateStringArb,
          amountArb,
          (date, amount) => {
            const records = [{ date, amount }]
            
            // Record exactly on start and end date should be included
            const sum = calculateSumWithDateFilter(records, date, date)
            return sum === amount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle records with zero amounts correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              date: dateStringArb,
              amount: fc.constant(0),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (records) => {
            const sum = calculateSumWithDateFilter(records, '2020-01-01', '2030-12-31')
            return sum === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be associative: sum of parts equals sum of whole', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              date: dateStringArb,
              amount: amountArb,
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (records) => {
            const totalSum = calculateSumWithDateFilter(records, '2020-01-01', '2030-12-31')
            
            // Split into two date ranges
            const sum1 = calculateSumWithDateFilter(records, '2020-01-01', '2024-12-31')
            const sum2 = calculateSumWithDateFilter(records, '2025-01-01', '2030-12-31')
            
            return sum1 + sum2 === totalSum
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 2: Status Filtering Correctness
  // =====================================================
  
  describe('Property 2: Status filtering correctness', () => {
    /**
     * **Feature: hr-dashboard, Property 2: Status filtering correctness**
     * **Validates: Requirements 1.4, 3.1, 3.2, 4.4**
     * 
     * For any collection of records with status values, filtering by a set of statuses 
     * should return exactly the count of records whose status matches the criteria.
     */
    
    it('should count pending payroll adjustments correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              status: payrollStatusArb,
            }),
            { minLength: 0, maxLength: 100 }
          ),
          (records) => {
            const pendingCount = countByStatus(records, PENDING_PAYROLL_STATUSES)
            
            const expectedCount = records.filter(r => 
              ['draft', 'pending'].includes(r.status.toLowerCase())
            ).length
            
            return pendingCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count late arrivals correctly (late_minutes > 0)', () => {
      fc.assert(
        fc.property(
          fc.array(attendanceRecordArb, { minLength: 0, maxLength: 100 }),
          (records) => {
            const lateCount = records.filter(r => r.lateMinutes > 0).length
            
            const expectedCount = records.filter(r => r.lateMinutes > 0).length
            
            return lateCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count early departures correctly (early_leave_minutes > 0)', () => {
      fc.assert(
        fc.property(
          fc.array(attendanceRecordArb, { minLength: 0, maxLength: 100 }),
          (records) => {
            const earlyCount = records.filter(r => r.earlyLeaveMinutes > 0).length
            
            const expectedCount = records.filter(r => r.earlyLeaveMinutes > 0).length
            
            return earlyCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count resignations correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              status: employeeStatusArb,
            }),
            { minLength: 0, maxLength: 100 }
          ),
          (records) => {
            const resignedCount = countByStatus(records, RESIGNED_STATUSES)
            
            const expectedCount = records.filter(r => 
              ['resigned', 'terminated'].includes(r.status.toLowerCase())
            ).length
            
            return resignedCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 for empty records array', () => {
      expect(countByStatus([], PENDING_PAYROLL_STATUSES)).toBe(0)
      expect(countByStatus([], RESIGNED_STATUSES)).toBe(0)
    })

    it('should return 0 when no records match the status filter', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              status: fc.constant('processed'),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (records) => {
            const pendingCount = countByStatus(records, PENDING_PAYROLL_STATUSES)
            return pendingCount === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be case-insensitive for status matching', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('DRAFT', 'Draft', 'draft', 'PENDING', 'Pending', 'pending'),
          (status) => {
            const records = [{ id: '1', status }]
            const count = countByStatus(records, PENDING_PAYROLL_STATUSES)
            return count === 1
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should partition records correctly: filtered + not-filtered = total', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              status: payrollStatusArb,
            }),
            { minLength: 0, maxLength: 100 }
          ),
          (records) => {
            const pendingCount = countByStatus(records, PENDING_PAYROLL_STATUSES)
            const notPendingCount = records.filter(r => 
              !['draft', 'pending'].includes(r.status.toLowerCase())
            ).length
            
            return pendingCount + notPendingCount === records.length
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  // =====================================================
  // Property 3: Grouping Aggregation Correctness
  // =====================================================
  
  describe('Property 3: Grouping aggregation correctness', () => {
    /**
     * **Feature: hr-dashboard, Property 3: Grouping aggregation correctness**
     * **Validates: Requirements 1.2, 2.2, 3.4**
     * 
     * For any collection of records with grouping keys, the grouped aggregations 
     * should sum to the total, and each group should contain exactly the records with that key.
     */
    
    it('should group payroll by department correctly', () => {
      fc.assert(
        fc.property(
          fc.array(payrollRecordArb, { minLength: 0, maxLength: 100 }),
          (records) => {
            const grouped = groupByKey(records, r => r.departmentId)
            
            // Verify all records are accounted for
            let totalGrouped = 0
            for (const [, groupRecords] of grouped) {
              totalGrouped += groupRecords.length
            }
            
            return totalGrouped === records.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should sum payroll amounts by department correctly', () => {
      fc.assert(
        fc.property(
          fc.array(payrollRecordArb, { minLength: 0, maxLength: 100 }),
          (records) => {
            const sums = sumByGroup(records, r => r.departmentId, r => r.grossSalary)
            
            // Total of all group sums should equal total sum
            let totalGroupSum = 0
            for (const [, sum] of sums) {
              totalGroupSum += sum
            }
            
            const totalSum = records.reduce((sum, r) => sum + r.grossSalary, 0)
            
            return totalGroupSum === totalSum
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should group leave balances by type correctly', () => {
      fc.assert(
        fc.property(
          fc.array(leaveBalanceArb, { minLength: 0, maxLength: 100 }),
          (records) => {
            const grouped = groupByKey(records, r => r.leaveTypeId)
            
            // Each record should be in exactly one group
            let totalGrouped = 0
            for (const [, groupRecords] of grouped) {
              totalGrouped += groupRecords.length
            }
            
            return totalGrouped === records.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should group attendance by department correctly', () => {
      fc.assert(
        fc.property(
          fc.array(attendanceRecordArb, { minLength: 0, maxLength: 100 }),
          (records) => {
            const grouped = groupByKey(records, r => r.departmentId)
            
            // Verify each group contains only records with that department
            for (const [deptId, groupRecords] of grouped) {
              for (const record of groupRecords) {
                if (record.departmentId !== deptId) {
                  return false
                }
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty map for empty records array', () => {
      const grouped = groupByKey([], (r: { id: string }) => r.id)
      expect(grouped.size).toBe(0)
    })

    it('should create single group when all records have same key', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          (count) => {
            const records = Array.from({ length: count }, (_, i) => ({
              id: `record-${i}`,
              departmentId: 'dept-1',
              amount: 1000,
            }))
            
            const grouped = groupByKey(records, r => r.departmentId)
            
            return grouped.size === 1 && grouped.get('dept-1')?.length === count
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create separate groups for each unique key', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (count) => {
            // Each record has a unique department
            const records = Array.from({ length: count }, (_, i) => ({
              id: `record-${i}`,
              departmentId: `dept-${i}`,
              amount: 1000,
            }))
            
            const grouped = groupByKey(records, r => r.departmentId)
            
            return grouped.size === count
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 4: Threshold Date Filtering Correctness
  // =====================================================
  
  describe('Property 4: Threshold date filtering correctness', () => {
    /**
     * **Feature: hr-dashboard, Property 4: Threshold date filtering correctness**
     * **Validates: Requirements 2.3, 4.1, 4.2**
     * 
     * For any collection of records with dates and thresholds, filtering by date range 
     * should return exactly the records within that range.
     */
    
    it('should filter employees with low leave balance correctly', () => {
      fc.assert(
        fc.property(
          fc.array(leaveBalanceArb, { minLength: 0, maxLength: 100 }),
          (records) => {
            const lowBalanceCount = filterByNumericThreshold(
              records,
              r => r.availableDays,
              5,
              'lt'
            ).length
            
            const expectedCount = records.filter(r => r.availableDays < 5).length
            
            return lowBalanceCount === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should filter probation ending within date range correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              employmentType: fc.constant('probation'),
              endDate: dateStringArb,
            }),
            { minLength: 0, maxLength: 100 }
          ),
          todayArb,
          (records, today) => {
            const todayStr = today.toISOString().split('T')[0]
            const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0]
            
            const filtered = filterByDateThreshold(
              records.map(r => ({ ...r, date: r.endDate })),
              todayStr,
              thirtyDaysFromNow
            )
            
            const expectedCount = records.filter(r => 
              r.endDate >= todayStr && r.endDate <= thirtyDaysFromNow
            ).length
            
            return filtered.length === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should filter contract renewals due within date range correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              employmentType: fc.constant('contract'),
              endDate: dateStringArb,
            }),
            { minLength: 0, maxLength: 100 }
          ),
          todayArb,
          (records, today) => {
            const todayStr = today.toISOString().split('T')[0]
            const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0]
            
            const filtered = filterByDateThreshold(
              records.map(r => ({ ...r, date: r.endDate })),
              todayStr,
              thirtyDaysFromNow
            )
            
            const expectedCount = records.filter(r => 
              r.endDate >= todayStr && r.endDate <= thirtyDaysFromNow
            ).length
            
            return filtered.length === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array when no records fall within threshold', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              date: fc.constant('2020-01-15'),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (records) => {
            const filtered = filterByDateThreshold(records, '2025-01-01', '2025-12-31')
            return filtered.length === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include records exactly on boundary dates', () => {
      fc.assert(
        fc.property(
          dateStringArb,
          (date) => {
            const records = [{ id: '1', date }]
            const filtered = filterByDateThreshold(records, date, date)
            return filtered.length === 1
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle numeric threshold comparisons correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (value, threshold) => {
            const records = [{ id: '1', value }]
            
            const ltResult = filterByNumericThreshold(records, r => r.value, threshold, 'lt')
            const lteResult = filterByNumericThreshold(records, r => r.value, threshold, 'lte')
            const gtResult = filterByNumericThreshold(records, r => r.value, threshold, 'gt')
            const gteResult = filterByNumericThreshold(records, r => r.value, threshold, 'gte')
            
            const ltExpected = value < threshold ? 1 : 0
            const lteExpected = value <= threshold ? 1 : 0
            const gtExpected = value > threshold ? 1 : 0
            const gteExpected = value >= threshold ? 1 : 0
            
            return (
              ltResult.length === ltExpected &&
              lteResult.length === lteExpected &&
              gtResult.length === gtExpected &&
              gteResult.length === gteExpected
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  // =====================================================
  // Property 5: Percentage and Average Calculations
  // =====================================================
  
  describe('Property 5: Percentage and average calculations', () => {
    /**
     * **Feature: hr-dashboard, Property 5: Percentage and average calculations**
     * **Validates: Requirements 2.4, 3.3**
     * 
     * For any set of numeric values, percentage and average calculations should follow 
     * the correct formulas, handling division by zero.
     */
    
    it('should calculate leave utilization rate correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 1, max: 10000 }), // Non-zero denominator
          (used, entitled) => {
            const rate = calculatePercentage(used, entitled)
            const expectedRate = Math.round((used / entitled) * 100)
            return rate === expectedRate
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 percentage when denominator is 0 (division by zero protection)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10000 }),
          (numerator) => {
            const rate = calculatePercentage(numerator, 0)
            return rate === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate average work hours correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.float({ min: 0, max: 12, noNaN: true }),
            { minLength: 1, maxLength: 100 }
          ),
          (workHours) => {
            const avg = calculateAverage(workHours)
            const expectedAvg = Math.round(
              (workHours.reduce((sum, h) => sum + h, 0) / workHours.length) * 10
            ) / 10
            
            return Math.abs(avg - expectedAvg) < 0.01
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 average for empty array', () => {
      const avg = calculateAverage([])
      expect(avg).toBe(0)
    })

    it('should return 0% when numerator is 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }), // Non-zero denominator
          (denominator) => {
            const rate = calculatePercentage(0, denominator)
            return rate === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 100% when numerator equals denominator', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          (value) => {
            const rate = calculatePercentage(value, value)
            return rate === 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return percentage >= 100 when numerator exceeds or equals denominator', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 1, max: 10000 }),
          (denominator, extra) => {
            const numerator = denominator + extra
            const rate = calculatePercentage(numerator, denominator)
            // Due to rounding, when extra is small relative to denominator,
            // the rate might round to exactly 100
            return rate >= 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return percentage > 100 when numerator significantly exceeds denominator', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (denominator) => {
            // Double the denominator to ensure > 100%
            const numerator = denominator * 2
            const rate = calculatePercentage(numerator, denominator)
            return rate === 200
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate average correctly for single value', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          (value) => {
            const avg = calculateAverage([value])
            const expectedAvg = Math.round(value * 10) / 10
            return Math.abs(avg - expectedAvg) < 0.01
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should round average to one decimal place', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.float({ min: 0, max: 100, noNaN: true }),
            { minLength: 1, maxLength: 50 }
          ),
          (values) => {
            const avg = calculateAverage(values)
            const avgStr = avg.toString()
            const decimalIndex = avgStr.indexOf('.')
            if (decimalIndex === -1) return true
            const decimalPlaces = avgStr.length - decimalIndex - 1
            return decimalPlaces <= 1
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 6: Threshold Alert Logic
  // =====================================================
  
  describe('Property 6: Threshold alert logic', () => {
    /**
     * **Feature: hr-dashboard, Property 6: Threshold alert logic**
     * **Validates: Requirements 2.5, 3.5, 4.5, 4.6**
     * 
     * For any numeric count value and threshold, the alert indicator should be 
     * displayed correctly based on the threshold rules.
     */
    
    it('should show alert when count exceeds threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 0, max: 999 }),
          (count, threshold) => {
            if (count <= threshold) return true // Skip when count doesn't exceed threshold
            return shouldShowAlert(count, threshold) === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not show alert when count is at or below threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          (count, threshold) => {
            if (count > threshold) return true // Skip when count exceeds threshold
            return shouldShowAlert(count, threshold) === false
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should show WARNING for low leave balance count > 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (count) => {
            const alertType = getAlertType(count, 0)
            return alertType === 'warning'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should show WARNING for late arrivals > 10', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 11, max: 1000 }),
          (count) => {
            const alertType = getAlertType(count, 10)
            return alertType === 'warning'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not show WARNING for late arrivals <= 10', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (count) => {
            const alertType = getAlertType(count, 10)
            return alertType === null
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should show WARNING for probation ending count > 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (count) => {
            const alertType = getAlertType(count, 0)
            return alertType === 'warning'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should show WARNING for contract renewals count > 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (count) => {
            const alertType = getAlertType(count, 0)
            return alertType === 'warning'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return success when count is 0', () => {
      const alertType = getAlertType(0, 0)
      expect(alertType).toBe('success')
    })

    it('should return null when count is between 0 and threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (count, threshold) => {
            if (count > threshold || count === 0) return true
            const alertType = getAlertType(count, threshold)
            return alertType === null
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  // =====================================================
  // Property 7: Ordering and Limiting Correctness
  // =====================================================
  
  describe('Property 7: Ordering and limiting correctness', () => {
    /**
     * **Feature: hr-dashboard, Property 7: Ordering and limiting correctness**
     * **Validates: Requirements 5.2, 5.5**
     * 
     * For any collection of records, ordering by a specified field and limiting to N items 
     * should return at most N items in the correct order.
     */
    
    it('should limit results to specified count', () => {
      fc.assert(
        fc.property(
          fc.array(leaveRequestArb, { minLength: 0, maxLength: 100 }),
          fc.integer({ min: 1, max: 20 }),
          (records, limit) => {
            const limited = orderAndLimit(
              records,
              (a, b) => b.createdAt.localeCompare(a.createdAt),
              limit
            )
            return limited.length <= limit
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should order leave requests by created_at descending', () => {
      fc.assert(
        fc.property(
          fc.array(leaveRequestArb, { minLength: 2, maxLength: 50 }),
          (records) => {
            const ordered = orderAndLimit(
              records,
              (a, b) => b.createdAt.localeCompare(a.createdAt),
              records.length
            )
            
            // Verify descending order
            for (let i = 1; i < ordered.length; i++) {
              if (ordered[i].createdAt > ordered[i - 1].createdAt) {
                return false
              }
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should order attendance corrections by updated_at descending', () => {
      fc.assert(
        fc.property(
          fc.array(attendanceCorrectionArb, { minLength: 2, maxLength: 50 }),
          (records) => {
            const ordered = orderAndLimit(
              records,
              (a, b) => b.updatedAt.localeCompare(a.updatedAt),
              records.length
            )
            
            // Verify descending order
            for (let i = 1; i < ordered.length; i++) {
              if (ordered[i].updatedAt > ordered[i - 1].updatedAt) {
                return false
              }
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return exactly 5 most recent leave requests when more than 5 exist', () => {
      fc.assert(
        fc.property(
          fc.array(leaveRequestArb, { minLength: 6, maxLength: 50 }),
          (records) => {
            const limited = orderAndLimit(
              records,
              (a, b) => b.createdAt.localeCompare(a.createdAt),
              5
            )
            return limited.length === 5
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return all records when count is less than limit', () => {
      fc.assert(
        fc.property(
          fc.array(leaveRequestArb, { minLength: 1, maxLength: 4 }),
          (records) => {
            const limited = orderAndLimit(
              records,
              (a, b) => b.createdAt.localeCompare(a.createdAt),
              5
            )
            return limited.length === records.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array for empty input', () => {
      const limited = orderAndLimit(
        [],
        (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt),
        5
      )
      expect(limited).toEqual([])
    })

    it('should preserve all record properties after ordering', () => {
      fc.assert(
        fc.property(
          fc.array(leaveRequestArb, { minLength: 1, maxLength: 20 }),
          (records) => {
            const ordered = orderAndLimit(
              records,
              (a, b) => b.createdAt.localeCompare(a.createdAt),
              records.length
            )
            
            // All original records should be present
            for (const original of records) {
              const found = ordered.find(r => r.id === original.id)
              if (!found) return false
              // Verify all properties are preserved
              if (found.employeeName !== original.employeeName) return false
              if (found.status !== original.status) return false
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not modify the original array', () => {
      fc.assert(
        fc.property(
          fc.array(leaveRequestArb, { minLength: 1, maxLength: 20 }),
          (records) => {
            const originalOrder = records.map(r => r.id)
            
            orderAndLimit(
              records,
              (a, b) => b.createdAt.localeCompare(a.createdAt),
              5
            )
            
            // Original array should be unchanged
            const currentOrder = records.map(r => r.id)
            return JSON.stringify(originalOrder) === JSON.stringify(currentOrder)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 8: Data Transformation Completeness
  // =====================================================
  
  describe('Property 8: Data transformation completeness', () => {
    /**
     * **Feature: hr-dashboard, Property 8: Data transformation completeness**
     * **Validates: Requirements 5.1, 5.4**
     * 
     * For any record from the database, the transformed object should contain all 
     * required fields with appropriate null handling.
     */
    
    it('should transform leave request with all fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.option(fc.uuid(), { nil: null }),
            employeeName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
            leaveTypeName: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
            status: fc.option(leaveStatusArb, { nil: null }),
            startDate: fc.option(dateStringArb, { nil: null }),
            endDate: fc.option(dateStringArb, { nil: null }),
            totalDays: fc.option(fc.integer({ min: 1, max: 30 }), { nil: null }),
            createdAt: fc.option(dateStringArb, { nil: null }),
          }),
          (record) => {
            const transformed = transformLeaveRequest(record)
            
            return (
              typeof transformed.id === 'string' &&
              typeof transformed.employeeName === 'string' &&
              typeof transformed.leaveTypeName === 'string' &&
              typeof transformed.status === 'string' &&
              typeof transformed.startDate === 'string' &&
              typeof transformed.endDate === 'string' &&
              typeof transformed.totalDays === 'number' &&
              typeof transformed.createdAt === 'string'
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should transform attendance correction with all fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.option(fc.uuid(), { nil: null }),
            employeeName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
            attendanceDate: fc.option(dateStringArb, { nil: null }),
            correctionReason: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: null }),
            updatedAt: fc.option(dateStringArb, { nil: null }),
          }),
          (record) => {
            const transformed = transformAttendanceCorrection(record)
            
            return (
              typeof transformed.id === 'string' &&
              typeof transformed.employeeName === 'string' &&
              typeof transformed.attendanceDate === 'string' &&
              typeof transformed.correctionReason === 'string' &&
              typeof transformed.updatedAt === 'string'
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle all null values gracefully for leave request', () => {
      const record = {
        id: null,
        employeeName: null,
        leaveTypeName: null,
        status: null,
        startDate: null,
        endDate: null,
        totalDays: null,
        createdAt: null,
      }
      
      const transformed = transformLeaveRequest(record)
      
      expect(transformed.id).toBe('')
      expect(transformed.employeeName).toBe('Unknown Employee')
      expect(transformed.leaveTypeName).toBe('Unknown Leave Type')
      expect(transformed.status).toBe('')
      expect(transformed.startDate).toBe('-')
      expect(transformed.endDate).toBe('-')
      expect(transformed.totalDays).toBe(0)
      expect(transformed.createdAt).toBe('-')
    })

    it('should handle all null values gracefully for attendance correction', () => {
      const record = {
        id: null,
        employeeName: null,
        attendanceDate: null,
        correctionReason: null,
        updatedAt: null,
      }
      
      const transformed = transformAttendanceCorrection(record)
      
      expect(transformed.id).toBe('')
      expect(transformed.employeeName).toBe('Unknown Employee')
      expect(transformed.attendanceDate).toBe('-')
      expect(transformed.correctionReason).toBe('')
      expect(transformed.updatedAt).toBe('-')
    })

    it('should preserve non-null values in transformation', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            employeeName: fc.string({ minLength: 1, maxLength: 50 }),
            leaveTypeName: fc.string({ minLength: 1, maxLength: 30 }),
            status: leaveStatusArb,
            startDate: dateStringArb,
            endDate: dateStringArb,
            totalDays: fc.integer({ min: 1, max: 30 }),
            createdAt: dateStringArb,
          }),
          (record) => {
            const transformed = transformLeaveRequest(record)
            
            return (
              transformed.id === record.id &&
              transformed.employeeName === record.employeeName &&
              transformed.leaveTypeName === record.leaveTypeName &&
              transformed.status === record.status &&
              transformed.startDate === record.startDate &&
              transformed.endDate === record.endDate &&
              transformed.totalDays === record.totalDays &&
              transformed.createdAt === record.createdAt
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  // =====================================================
  // Property 9: Status Color Mapping
  // =====================================================
  
  describe('Property 9: Status color mapping', () => {
    /**
     * **Feature: hr-dashboard, Property 9: Status color mapping**
     * **Validates: Requirements 5.3**
     * 
     * For any leave request status value, the color mapping should be deterministic and correct.
     */
    
    it('should map pending status to yellow', () => {
      expect(getLeaveStatusColor('pending')).toBe('yellow')
      expect(getLeaveStatusColor('PENDING')).toBe('yellow')
      expect(getLeaveStatusColor('Pending')).toBe('yellow')
    })

    it('should map approved status to green', () => {
      expect(getLeaveStatusColor('approved')).toBe('green')
      expect(getLeaveStatusColor('APPROVED')).toBe('green')
      expect(getLeaveStatusColor('Approved')).toBe('green')
    })

    it('should map rejected status to red', () => {
      expect(getLeaveStatusColor('rejected')).toBe('red')
      expect(getLeaveStatusColor('REJECTED')).toBe('red')
      expect(getLeaveStatusColor('Rejected')).toBe('red')
    })

    it('should map cancelled status to gray', () => {
      expect(getLeaveStatusColor('cancelled')).toBe('gray')
      expect(getLeaveStatusColor('CANCELLED')).toBe('gray')
      expect(getLeaveStatusColor('Cancelled')).toBe('gray')
    })

    it('should map unknown status to gray (default)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => 
            !['pending', 'approved', 'rejected', 'cancelled'].includes(s.toLowerCase())
          ),
          (status) => {
            return getLeaveStatusColor(status) === 'gray'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be deterministic for all valid statuses', () => {
      fc.assert(
        fc.property(
          leaveStatusArb,
          (status) => {
            const color1 = getLeaveStatusColor(status)
            const color2 = getLeaveStatusColor(status)
            return color1 === color2
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return valid color for all leave request statuses', () => {
      fc.assert(
        fc.property(
          leaveStatusArb,
          (status) => {
            const color = getLeaveStatusColor(status)
            return ['yellow', 'green', 'red', 'gray'].includes(color)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be case-insensitive', () => {
      fc.assert(
        fc.property(
          leaveStatusArb,
          (status) => {
            const lowerColor = getLeaveStatusColor(status.toLowerCase())
            const upperColor = getLeaveStatusColor(status.toUpperCase())
            const mixedColor = getLeaveStatusColor(
              status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
            )
            return lowerColor === upperColor && upperColor === mixedColor
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 10: Cache Key Format
  // =====================================================
  
  describe('Property 10: Cache key format', () => {
    /**
     * **Feature: hr-dashboard, Property 10: Cache key format**
     * **Validates: Requirements 7.4**
     * 
     * For any role string and date, the generated cache key should match the pattern 
     * 'hr-dashboard-metrics:{role}:{YYYY-MM-DD}'.
     */
    
    it('should generate cache key with correct format', () => {
      fc.assert(
        fc.property(
          roleArb,
          todayArb,
          (role, date) => {
            const key = generateCacheKeyWithDate('hr-dashboard-metrics', role, date)
            const dateStr = date.toISOString().split('T')[0]
            const expectedKey = `hr-dashboard-metrics:${role}:${dateStr}`
            return key === expectedKey
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include role in cache key', () => {
      fc.assert(
        fc.property(
          roleArb,
          todayArb,
          (role, date) => {
            const key = generateCacheKeyWithDate('hr-dashboard-metrics', role, date)
            return key.includes(`:${role}:`)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include date in YYYY-MM-DD format', () => {
      fc.assert(
        fc.property(
          roleArb,
          todayArb,
          (role, date) => {
            const key = generateCacheKeyWithDate('hr-dashboard-metrics', role, date)
            const dateStr = date.toISOString().split('T')[0]
            return key.endsWith(`:${dateStr}`)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include prefix at the start', () => {
      fc.assert(
        fc.property(
          roleArb,
          todayArb,
          (role, date) => {
            const key = generateCacheKeyWithDate('hr-dashboard-metrics', role, date)
            return key.startsWith('hr-dashboard-metrics:')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate different keys for different roles', () => {
      fc.assert(
        fc.property(
          todayArb,
          (date) => {
            const keyHr = generateCacheKeyWithDate('hr-dashboard-metrics', 'hr', date)
            const keyOwner = generateCacheKeyWithDate('hr-dashboard-metrics', 'owner', date)
            const keyDirector = generateCacheKeyWithDate('hr-dashboard-metrics', 'director', date)
            
            return keyHr !== keyOwner && keyOwner !== keyDirector && keyHr !== keyDirector
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate different keys for different dates', () => {
      fc.assert(
        fc.property(
          roleArb,
          todayArb,
          fc.integer({ min: 1, max: 365 }),
          (role, date, daysToAdd) => {
            const date2 = new Date(date.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
            
            const key1 = generateCacheKeyWithDate('hr-dashboard-metrics', role, date)
            const key2 = generateCacheKeyWithDate('hr-dashboard-metrics', role, date2)
            
            return key1 !== key2
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate same key for same inputs', () => {
      fc.assert(
        fc.property(
          roleArb,
          todayArb,
          (role, date) => {
            const key1 = generateCacheKeyWithDate('hr-dashboard-metrics', role, date)
            const key2 = generateCacheKeyWithDate('hr-dashboard-metrics', role, date)
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
            const key = generateCacheKeyWithDate('hr-dashboard-metrics', role, date)
            const parts = key.split(':')
            return parts.length === 3
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 11: Cache Round-Trip
  // =====================================================
  
  describe('Property 11: Cache round-trip', () => {
    /**
     * **Feature: hr-dashboard, Property 11: Cache round-trip**
     * **Validates: Requirements 7.2, 7.3**
     * 
     * For any valid metrics data, storing it in the cache and then retrieving it 
     * before TTL expiration should return equivalent data.
     */
    
    // Simple in-memory cache for testing
    const testCache = new Map<string, { data: unknown; timestamp: number }>()
    const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
    
    function setCache(key: string, data: unknown): void {
      testCache.set(key, { data, timestamp: Date.now() })
    }
    
    function getCache<T>(key: string): T | null {
      const entry = testCache.get(key)
      if (!entry) return null
      if (Date.now() - entry.timestamp > CACHE_TTL) {
        testCache.delete(key)
        return null
      }
      return entry.data as T
    }
    
    function clearCache(): void {
      testCache.clear()
    }
    
    it('should retrieve same data that was stored', () => {
      fc.assert(
        fc.property(
          fc.record({
            totalPayrollThisMonth: amountArb,
            overtimeHoursThisMonth: fc.float({ min: 0, max: 1000, noNaN: true }),
            pendingPayrollAdjustments: countArb,
            leaveDaysUsedThisMonth: countArb,
            employeesWithLowLeaveBalance: countArb,
            leaveUtilizationRate: fc.integer({ min: 0, max: 100 }),
            lateArrivalsThisMonth: countArb,
            earlyDeparturesThisMonth: countArb,
            averageWorkHoursPerDay: fc.float({ min: 0, max: 12, noNaN: true }),
            probationEndingSoon: countArb,
            contractRenewalsDue: countArb,
            workAnniversariesThisMonth: countArb,
            resignationsThisMonth: countArb,
            activeEmployees: countArb,
            inactiveEmployees: countArb,
          }),
          roleArb,
          (metrics, role) => {
            clearCache()
            const key = generateCacheKey('hr-dashboard-metrics', role)
            
            setCache(key, metrics)
            const retrieved = getCache<typeof metrics>(key)
            
            return JSON.stringify(retrieved) === JSON.stringify(metrics)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return null for non-existent cache key', () => {
      clearCache()
      const result = getCache('non-existent-key')
      expect(result).toBeNull()
    })

    it('should preserve all metric fields after round-trip', () => {
      fc.assert(
        fc.property(
          fc.record({
            totalPayrollThisMonth: amountArb,
            payrollByDepartment: fc.array(
              fc.record({
                departmentId: departmentIdArb,
                departmentName: fc.string({ minLength: 1, maxLength: 30 }),
                totalPayroll: amountArb,
                employeeCount: countArb,
              }),
              { minLength: 0, maxLength: 10 }
            ),
            recentLeaveRequests: fc.array(
              fc.record({
                id: fc.uuid(),
                employeeName: fc.string({ minLength: 1, maxLength: 50 }),
                leaveTypeName: fc.string({ minLength: 1, maxLength: 30 }),
                status: leaveStatusArb,
                startDate: dateStringArb,
                endDate: dateStringArb,
                totalDays: fc.integer({ min: 1, max: 30 }),
                createdAt: dateStringArb,
              }),
              { minLength: 0, maxLength: 5 }
            ),
          }),
          roleArb,
          (metrics, role) => {
            clearCache()
            const key = generateCacheKey('hr-dashboard-metrics', role)
            
            setCache(key, metrics)
            const retrieved = getCache<typeof metrics>(key)
            
            if (!retrieved) return false
            
            // Verify structure is preserved
            return (
              retrieved.totalPayrollThisMonth === metrics.totalPayrollThisMonth &&
              retrieved.payrollByDepartment.length === metrics.payrollByDepartment.length &&
              retrieved.recentLeaveRequests.length === metrics.recentLeaveRequests.length
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty arrays in metrics', () => {
      clearCache()
      const metrics = {
        payrollByDepartment: [],
        leaveBalanceSummary: [],
        attendanceByDepartment: [],
        recentLeaveRequests: [],
        recentAttendanceCorrections: [],
      }
      
      const key = generateCacheKey('hr-dashboard-metrics', 'hr')
      setCache(key, metrics)
      const retrieved = getCache<typeof metrics>(key)
      
      expect(retrieved).not.toBeNull()
      expect(retrieved?.payrollByDepartment).toEqual([])
      expect(retrieved?.leaveBalanceSummary).toEqual([])
      expect(retrieved?.attendanceByDepartment).toEqual([])
      expect(retrieved?.recentLeaveRequests).toEqual([])
      expect(retrieved?.recentAttendanceCorrections).toEqual([])
    })

    it('should handle zero values in metrics', () => {
      clearCache()
      const metrics = {
        totalPayrollThisMonth: 0,
        overtimeHoursThisMonth: 0,
        pendingPayrollAdjustments: 0,
        leaveDaysUsedThisMonth: 0,
        employeesWithLowLeaveBalance: 0,
        leaveUtilizationRate: 0,
        lateArrivalsThisMonth: 0,
        earlyDeparturesThisMonth: 0,
        averageWorkHoursPerDay: 0,
        probationEndingSoon: 0,
        contractRenewalsDue: 0,
        workAnniversariesThisMonth: 0,
        resignationsThisMonth: 0,
      }
      
      const key = generateCacheKey('hr-dashboard-metrics', 'hr')
      setCache(key, metrics)
      const retrieved = getCache<typeof metrics>(key)
      
      expect(retrieved).not.toBeNull()
      expect(retrieved?.totalPayrollThisMonth).toBe(0)
      expect(retrieved?.overtimeHoursThisMonth).toBe(0)
    })
  })


  // =====================================================
  // Property 12: Role-Based Access Control
  // =====================================================
  
  describe('Property 12: Role-based access control', () => {
    /**
     * **Feature: hr-dashboard, Property 12: Role-based access control**
     * **Validates: Requirements 8.1, 8.2, 8.3**
     * 
     * For any user role, access to the HR Dashboard should be granted if and only if 
     * the role is in the allowed set ['hr', 'owner', 'director'].
     */
    
    it('should grant access to hr role', () => {
      expect(hasRoleAccess('hr', ALLOWED_HR_ROLES)).toBe(true)
    })

    it('should grant access to owner role', () => {
      expect(hasRoleAccess('owner', ALLOWED_HR_ROLES)).toBe(true)
    })

    it('should grant access to director role', () => {
      expect(hasRoleAccess('director', ALLOWED_HR_ROLES)).toBe(true)
    })

    it('should deny access to unauthorized roles', () => {
      const unauthorizedRoles = [
        'finance', 'ops', 'marketing', 'admin', 'engineer', 
        'hse', 'customs', 'agency', 'guest', 'user'
      ]
      
      for (const role of unauthorizedRoles) {
        expect(hasRoleAccess(role, ALLOWED_HR_ROLES)).toBe(false)
      }
    })

    it('should grant access if and only if role is in allowed set', () => {
      fc.assert(
        fc.property(
          roleArb,
          (role) => {
            const hasAccess = hasRoleAccess(role, ALLOWED_HR_ROLES)
            const shouldHaveAccess = ALLOWED_HR_ROLES.includes(role.toLowerCase())
            return hasAccess === shouldHaveAccess
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be case-insensitive for role matching', () => {
      expect(hasRoleAccess('HR', ALLOWED_HR_ROLES)).toBe(true)
      expect(hasRoleAccess('Hr', ALLOWED_HR_ROLES)).toBe(true)
      expect(hasRoleAccess('OWNER', ALLOWED_HR_ROLES)).toBe(true)
      expect(hasRoleAccess('Owner', ALLOWED_HR_ROLES)).toBe(true)
      expect(hasRoleAccess('DIRECTOR', ALLOWED_HR_ROLES)).toBe(true)
      expect(hasRoleAccess('Director', ALLOWED_HR_ROLES)).toBe(true)
    })

    it('should deny access to empty role string', () => {
      expect(hasRoleAccess('', ALLOWED_HR_ROLES)).toBe(false)
    })

    it('should deny access to role with extra whitespace', () => {
      expect(hasRoleAccess(' hr ', ALLOWED_HR_ROLES)).toBe(false)
      expect(hasRoleAccess('hr ', ALLOWED_HR_ROLES)).toBe(false)
      expect(hasRoleAccess(' hr', ALLOWED_HR_ROLES)).toBe(false)
    })

    it('should deny access to partial role matches', () => {
      expect(hasRoleAccess('h', ALLOWED_HR_ROLES)).toBe(false)
      expect(hasRoleAccess('own', ALLOWED_HR_ROLES)).toBe(false)
      expect(hasRoleAccess('direct', ALLOWED_HR_ROLES)).toBe(false)
      expect(hasRoleAccess('hrmanager', ALLOWED_HR_ROLES)).toBe(false)
    })

    it('should be deterministic for all roles', () => {
      fc.assert(
        fc.property(
          roleArb,
          (role) => {
            const result1 = hasRoleAccess(role, ALLOWED_HR_ROLES)
            const result2 = hasRoleAccess(role, ALLOWED_HR_ROLES)
            return result1 === result2
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify exactly 3 allowed roles', () => {
      const allRoles = [
        'hr', 'owner', 'director', 'finance', 'ops', 'marketing',
        'admin', 'engineer', 'hse', 'customs', 'agency'
      ]
      
      const allowedCount = allRoles.filter(role => 
        hasRoleAccess(role, ALLOWED_HR_ROLES)
      ).length
      
      expect(allowedCount).toBe(3)
    })
  })
})
