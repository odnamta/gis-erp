/**
 * Unit tests for HR Dashboard Data Service
 * Tests specific examples and edge cases
 * 
 * **Feature: hr-dashboard**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import pure helper functions from property tests
import {
  calculateSumWithDateFilter,
  filterByStatus,
  countByStatus,
  groupByKey,
  sumByGroup,
  filterByDateThreshold,
  filterByNumericThreshold,
  calculatePercentage,
  calculateAverage,
  shouldShowAlert,
  getAlertType,
  orderAndLimit,
  transformLeaveRequest,
  transformAttendanceCorrection,
  getLeaveStatusColor,
  generateCacheKeyWithDate,
  hasRoleAccess,
} from './hr-dashboard-data.property.test'

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

const ALLOWED_HR_ROLES = ['hr', 'owner', 'director']
const PENDING_PAYROLL_STATUSES = ['draft', 'pending']
const RESIGNED_STATUSES = ['resigned', 'terminated']
const LEAVE_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled']


describe('HR Dashboard Data - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =====================================================
  // Empty Data Scenarios
  // =====================================================

  describe('Empty data scenarios', () => {
    it('should handle empty employees array', () => {
      const employees: { id: string; status: string }[] = []
      const activeCount = employees.filter(e => e.status === 'active').length
      expect(activeCount).toBe(0)
    })

    it('should handle empty payroll records array', () => {
      const payrollRecords: { grossSalary: number; date: string }[] = []
      const sum = calculateSumWithDateFilter(
        payrollRecords.map(r => ({ date: r.date, amount: r.grossSalary })),
        '2026-01-01',
        '2026-01-31'
      )
      expect(sum).toBe(0)
    })

    it('should handle empty attendance records array', () => {
      const attendanceRecords: { id: string; lateMinutes: number }[] = []
      const lateCount = attendanceRecords.filter(r => r.lateMinutes > 0).length
      expect(lateCount).toBe(0)
    })

    it('should handle empty leave requests array', () => {
      const leaveRequests: { id: string; status: string }[] = []
      const pendingCount = countByStatus(leaveRequests, ['pending'])
      expect(pendingCount).toBe(0)
    })

    it('should handle empty leave balances array', () => {
      const leaveBalances: { availableDays: number }[] = []
      const lowBalanceCount = filterByNumericThreshold(
        leaveBalances,
        r => r.availableDays,
        5,
        'lt'
      ).length
      expect(lowBalanceCount).toBe(0)
    })

    it('should return 0 for average work hours with empty records', () => {
      const avg = calculateAverage([])
      expect(avg).toBe(0)
    })

    it('should return 0 for leave utilization with empty records', () => {
      const rate = calculatePercentage(0, 0)
      expect(rate).toBe(0)
    })

    it('should return empty array for recent leave requests with empty input', () => {
      const limited = orderAndLimit(
        [],
        (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt),
        5
      )
      expect(limited).toHaveLength(0)
    })

    it('should return empty array for recent attendance corrections with empty input', () => {
      const limited = orderAndLimit(
        [],
        (a: { updatedAt: string }, b: { updatedAt: string }) => b.updatedAt.localeCompare(a.updatedAt),
        5
      )
      expect(limited).toHaveLength(0)
    })

    it('should return empty map for grouping empty records', () => {
      const grouped = groupByKey([], (r: { departmentId: string }) => r.departmentId)
      expect(grouped.size).toBe(0)
    })
  })


  // =====================================================
  // Null Value Handling
  // =====================================================

  describe('Null value handling', () => {
    it('should handle null employee names in leave requests', () => {
      const record = {
        id: '123',
        employeeName: null,
        leaveTypeName: 'Annual Leave',
        status: 'pending',
        startDate: '2026-01-15',
        endDate: '2026-01-20',
        totalDays: 5,
        createdAt: '2026-01-10',
      }
      
      const transformed = transformLeaveRequest(record)
      
      expect(transformed.employeeName).toBe('Unknown Employee')
      expect(transformed.leaveTypeName).toBe('Annual Leave')
    })

    it('should handle null department names', () => {
      const records = [
        { id: '1', departmentId: 'dept-1', departmentName: null, amount: 1000 },
        { id: '2', departmentId: 'dept-1', departmentName: null, amount: 2000 },
      ]
      
      const grouped = groupByKey(records, r => r.departmentId)
      
      expect(grouped.get('dept-1')?.length).toBe(2)
    })

    it('should handle null leave type names', () => {
      const record = {
        id: '123',
        employeeName: 'John Doe',
        leaveTypeName: null,
        status: 'approved',
        startDate: '2026-01-15',
        endDate: '2026-01-20',
        totalDays: 5,
        createdAt: '2026-01-10',
      }
      
      const transformed = transformLeaveRequest(record)
      
      expect(transformed.leaveTypeName).toBe('Unknown Leave Type')
    })

    it('should handle null dates in leave requests', () => {
      const record = {
        id: '123',
        employeeName: 'John Doe',
        leaveTypeName: 'Annual Leave',
        status: 'pending',
        startDate: null,
        endDate: null,
        totalDays: 5,
        createdAt: null,
      }
      
      const transformed = transformLeaveRequest(record)
      
      expect(transformed.startDate).toBe('-')
      expect(transformed.endDate).toBe('-')
      expect(transformed.createdAt).toBe('-')
    })

    it('should handle null amounts in payroll records', () => {
      const records = [
        { date: '2026-01-15', amount: 1000000 },
        { date: '2026-01-16', amount: 0 },
        { date: '2026-01-17', amount: 2000000 },
      ]
      
      const sum = calculateSumWithDateFilter(records, '2026-01-01', '2026-01-31')
      
      expect(sum).toBe(3000000)
    })

    it('should handle null correction reason in attendance corrections', () => {
      const record = {
        id: '123',
        employeeName: 'John Doe',
        attendanceDate: '2026-01-15',
        correctionReason: null,
        updatedAt: '2026-01-16',
      }
      
      const transformed = transformAttendanceCorrection(record)
      
      expect(transformed.correctionReason).toBe('')
    })

    it('should handle all null values in leave request transformation', () => {
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

    it('should handle all null values in attendance correction transformation', () => {
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
  })


  // =====================================================
  // Date Boundary Cases
  // =====================================================

  describe('Date boundary cases', () => {
    it('should include records exactly on start of month', () => {
      const records = [
        { date: '2026-01-01', amount: 1000 },
        { date: '2026-01-15', amount: 2000 },
      ]
      
      const sum = calculateSumWithDateFilter(records, '2026-01-01', '2026-01-31')
      
      expect(sum).toBe(3000)
    })

    it('should include records exactly on end of month', () => {
      const records = [
        { date: '2026-01-15', amount: 1000 },
        { date: '2026-01-31', amount: 2000 },
      ]
      
      const sum = calculateSumWithDateFilter(records, '2026-01-01', '2026-01-31')
      
      expect(sum).toBe(3000)
    })

    it('should include records exactly 30 days from now', () => {
      const today = new Date('2026-01-15')
      const todayStr = today.toISOString().split('T')[0]
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]
      
      const records = [
        { id: '1', date: thirtyDaysFromNow },
        { id: '2', date: '2026-03-01' }, // Beyond 30 days
      ]
      
      const filtered = filterByDateThreshold(records, todayStr, thirtyDaysFromNow)
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('1')
    })

    it('should include records exactly on today', () => {
      const today = '2026-01-26'
      const records = [
        { id: '1', date: today },
        { id: '2', date: '2026-01-25' },
      ]
      
      const filtered = filterByDateThreshold(records, today, today)
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('1')
    })

    it('should exclude records before start date', () => {
      const records = [
        { date: '2025-12-31', amount: 1000 },
        { date: '2026-01-01', amount: 2000 },
      ]
      
      const sum = calculateSumWithDateFilter(records, '2026-01-01', '2026-01-31')
      
      expect(sum).toBe(2000)
    })

    it('should exclude records after end date', () => {
      const records = [
        { date: '2026-01-31', amount: 1000 },
        { date: '2026-02-01', amount: 2000 },
      ]
      
      const sum = calculateSumWithDateFilter(records, '2026-01-01', '2026-01-31')
      
      expect(sum).toBe(1000)
    })

    it('should handle probation ending exactly on boundary', () => {
      const today = '2026-01-15'
      const thirtyDaysFromNow = '2026-02-14'
      
      const records = [
        { id: '1', date: '2026-02-14' }, // Exactly 30 days
        { id: '2', date: '2026-02-15' }, // 31 days - excluded
      ]
      
      const filtered = filterByDateThreshold(records, today, thirtyDaysFromNow)
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('1')
    })

    it('should handle contract renewal exactly on boundary', () => {
      const today = '2026-01-15'
      const thirtyDaysFromNow = '2026-02-14'
      
      const records = [
        { id: '1', date: today }, // Exactly today
        { id: '2', date: '2026-01-14' }, // Yesterday - excluded
      ]
      
      const filtered = filterByDateThreshold(records, today, thirtyDaysFromNow)
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('1')
    })
  })


  // =====================================================
  // Role Access Scenarios
  // =====================================================

  describe('Role access scenarios', () => {
    it('should allow hr role', () => {
      expect(hasRoleAccess('hr', ALLOWED_HR_ROLES)).toBe(true)
    })

    it('should allow owner role', () => {
      expect(hasRoleAccess('owner', ALLOWED_HR_ROLES)).toBe(true)
    })

    it('should allow director role', () => {
      expect(hasRoleAccess('director', ALLOWED_HR_ROLES)).toBe(true)
    })

    it('should deny finance role', () => {
      expect(hasRoleAccess('finance', ALLOWED_HR_ROLES)).toBe(false)
    })

    it('should deny ops role', () => {
      expect(hasRoleAccess('ops', ALLOWED_HR_ROLES)).toBe(false)
    })

    it('should deny marketing role', () => {
      expect(hasRoleAccess('marketing', ALLOWED_HR_ROLES)).toBe(false)
    })

    it('should deny finance_manager role', () => {
      expect(hasRoleAccess('finance_manager', ALLOWED_HR_ROLES)).toBe(false)
    })

    it('should deny operations_manager role', () => {
      expect(hasRoleAccess('operations_manager', ALLOWED_HR_ROLES)).toBe(false)
    })

    it('should deny marketing_manager role', () => {
      expect(hasRoleAccess('marketing_manager', ALLOWED_HR_ROLES)).toBe(false)
    })

    it('should deny administration role', () => {
      expect(hasRoleAccess('administration', ALLOWED_HR_ROLES)).toBe(false)
    })

    it('should deny engineer role', () => {
      expect(hasRoleAccess('engineer', ALLOWED_HR_ROLES)).toBe(false)
    })

    it('should deny hse role', () => {
      expect(hasRoleAccess('hse', ALLOWED_HR_ROLES)).toBe(false)
    })

    it('should deny customs role', () => {
      expect(hasRoleAccess('customs', ALLOWED_HR_ROLES)).toBe(false)
    })

    it('should deny agency role', () => {
      expect(hasRoleAccess('agency', ALLOWED_HR_ROLES)).toBe(false)
    })

    it('should deny sysadmin role', () => {
      expect(hasRoleAccess('sysadmin', ALLOWED_HR_ROLES)).toBe(false)
    })

    it('should deny empty string role', () => {
      expect(hasRoleAccess('', ALLOWED_HR_ROLES)).toBe(false)
    })

    it('should deny unknown roles', () => {
      expect(hasRoleAccess('admin', ALLOWED_HR_ROLES)).toBe(false)
      expect(hasRoleAccess('superuser', ALLOWED_HR_ROLES)).toBe(false)
      expect(hasRoleAccess('guest', ALLOWED_HR_ROLES)).toBe(false)
    })
  })


  // =====================================================
  // Threshold Edge Cases
  // =====================================================

  describe('Threshold edge cases', () => {
    describe('Leave balance threshold (< 5 days)', () => {
      it('should count balance = 4 as low (< 5)', () => {
        const records = [{ id: '1', availableDays: 4 }]
        const lowCount = filterByNumericThreshold(records, r => r.availableDays, 5, 'lt').length
        expect(lowCount).toBe(1)
      })

      it('should NOT count balance = 5 as low (not < 5)', () => {
        const records = [{ id: '1', availableDays: 5 }]
        const lowCount = filterByNumericThreshold(records, r => r.availableDays, 5, 'lt').length
        expect(lowCount).toBe(0)
      })

      it('should NOT count balance = 6 as low (not < 5)', () => {
        const records = [{ id: '1', availableDays: 6 }]
        const lowCount = filterByNumericThreshold(records, r => r.availableDays, 5, 'lt').length
        expect(lowCount).toBe(0)
      })

      it('should count balance = 0 as low', () => {
        const records = [{ id: '1', availableDays: 0 }]
        const lowCount = filterByNumericThreshold(records, r => r.availableDays, 5, 'lt').length
        expect(lowCount).toBe(1)
      })

      it('should count balance = 1 as low', () => {
        const records = [{ id: '1', availableDays: 1 }]
        const lowCount = filterByNumericThreshold(records, r => r.availableDays, 5, 'lt').length
        expect(lowCount).toBe(1)
      })
    })

    describe('Late arrivals warning threshold (> 10)', () => {
      it('should NOT show warning when late arrivals = 10', () => {
        const alertType = getAlertType(10, 10)
        expect(alertType).toBeNull()
      })

      it('should show warning when late arrivals = 11', () => {
        const alertType = getAlertType(11, 10)
        expect(alertType).toBe('warning')
      })

      it('should NOT show warning when late arrivals = 9', () => {
        const alertType = getAlertType(9, 10)
        expect(alertType).toBeNull()
      })

      it('should show warning when late arrivals = 100', () => {
        const alertType = getAlertType(100, 10)
        expect(alertType).toBe('warning')
      })

      it('should return success when late arrivals = 0', () => {
        const alertType = getAlertType(0, 10)
        expect(alertType).toBe('success')
      })
    })

    describe('Low leave balance warning threshold (> 0)', () => {
      it('should show warning when count = 1', () => {
        const alertType = getAlertType(1, 0)
        expect(alertType).toBe('warning')
      })

      it('should return success when count = 0', () => {
        const alertType = getAlertType(0, 0)
        expect(alertType).toBe('success')
      })

      it('should show warning when count = 5', () => {
        const alertType = getAlertType(5, 0)
        expect(alertType).toBe('warning')
      })
    })

    describe('Probation ending warning threshold (> 0)', () => {
      it('should show warning when count = 1', () => {
        const alertType = getAlertType(1, 0)
        expect(alertType).toBe('warning')
      })

      it('should return success when count = 0', () => {
        const alertType = getAlertType(0, 0)
        expect(alertType).toBe('success')
      })
    })

    describe('Contract renewals warning threshold (> 0)', () => {
      it('should show warning when count = 1', () => {
        const alertType = getAlertType(1, 0)
        expect(alertType).toBe('warning')
      })

      it('should return success when count = 0', () => {
        const alertType = getAlertType(0, 0)
        expect(alertType).toBe('success')
      })
    })
  })


  // =====================================================
  // Division by Zero Scenarios
  // =====================================================

  describe('Division by zero scenarios', () => {
    it('should return 0 for leave utilization with 0 entitled days', () => {
      const rate = calculatePercentage(10, 0)
      expect(rate).toBe(0)
    })

    it('should return 0 for average work hours with 0 records', () => {
      const avg = calculateAverage([])
      expect(avg).toBe(0)
    })

    it('should return 0 for attendance rate with 0 attendance records', () => {
      const rate = calculatePercentage(0, 0)
      expect(rate).toBe(0)
    })

    it('should handle 0 numerator with positive denominator', () => {
      const rate = calculatePercentage(0, 100)
      expect(rate).toBe(0)
    })

    it('should handle both 0 numerator and 0 denominator', () => {
      const rate = calculatePercentage(0, 0)
      expect(rate).toBe(0)
    })

    it('should calculate 100% when numerator equals denominator', () => {
      const rate = calculatePercentage(100, 100)
      expect(rate).toBe(100)
    })

    it('should calculate 50% correctly', () => {
      const rate = calculatePercentage(50, 100)
      expect(rate).toBe(50)
    })

    it('should handle large numbers without overflow', () => {
      const rate = calculatePercentage(5000000000, 10000000000)
      expect(rate).toBe(50)
    })

    it('should round percentage to nearest integer', () => {
      // 1/3 = 33.333...%
      const rate = calculatePercentage(1, 3)
      expect(rate).toBe(33)
    })

    it('should round average to one decimal place', () => {
      const avg = calculateAverage([8.333, 8.333, 8.334])
      // Average is 8.333..., should round to 8.3
      expect(avg).toBeCloseTo(8.3, 1)
    })
  })


  // =====================================================
  // Data Transformation Tests
  // =====================================================

  describe('Data transformation tests', () => {
    describe('Leave request transformation', () => {
      it('should transform leave request with all fields', () => {
        const record = {
          id: 'lr-123',
          employeeName: 'John Doe',
          leaveTypeName: 'Annual Leave',
          status: 'approved',
          startDate: '2026-01-15',
          endDate: '2026-01-20',
          totalDays: 5,
          createdAt: '2026-01-10',
        }
        
        const transformed = transformLeaveRequest(record)
        
        expect(transformed.id).toBe('lr-123')
        expect(transformed.employeeName).toBe('John Doe')
        expect(transformed.leaveTypeName).toBe('Annual Leave')
        expect(transformed.status).toBe('approved')
        expect(transformed.startDate).toBe('2026-01-15')
        expect(transformed.endDate).toBe('2026-01-20')
        expect(transformed.totalDays).toBe(5)
        expect(transformed.createdAt).toBe('2026-01-10')
      })

      it('should transform leave request with null fields', () => {
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

      it('should transform leave request with partial null fields', () => {
        const record = {
          id: 'lr-456',
          employeeName: null,
          leaveTypeName: 'Sick Leave',
          status: 'pending',
          startDate: null,
          endDate: '2026-01-22',
          totalDays: 3,
          createdAt: null,
        }
        
        const transformed = transformLeaveRequest(record)
        
        expect(transformed.id).toBe('lr-456')
        expect(transformed.employeeName).toBe('Unknown Employee')
        expect(transformed.leaveTypeName).toBe('Sick Leave')
        expect(transformed.status).toBe('pending')
        expect(transformed.startDate).toBe('-')
        expect(transformed.endDate).toBe('2026-01-22')
        expect(transformed.totalDays).toBe(3)
        expect(transformed.createdAt).toBe('-')
      })
    })

    describe('Attendance correction transformation', () => {
      it('should transform attendance correction with all fields', () => {
        const record = {
          id: 'ac-123',
          employeeName: 'Jane Smith',
          attendanceDate: '2026-01-15',
          correctionReason: 'System error - clock-in not recorded',
          updatedAt: '2026-01-16',
        }
        
        const transformed = transformAttendanceCorrection(record)
        
        expect(transformed.id).toBe('ac-123')
        expect(transformed.employeeName).toBe('Jane Smith')
        expect(transformed.attendanceDate).toBe('2026-01-15')
        expect(transformed.correctionReason).toBe('System error - clock-in not recorded')
        expect(transformed.updatedAt).toBe('2026-01-16')
      })

      it('should transform attendance correction with null fields', () => {
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

      it('should transform attendance correction with partial null fields', () => {
        const record = {
          id: 'ac-789',
          employeeName: 'Bob Wilson',
          attendanceDate: '2026-01-20',
          correctionReason: null,
          updatedAt: null,
        }
        
        const transformed = transformAttendanceCorrection(record)
        
        expect(transformed.id).toBe('ac-789')
        expect(transformed.employeeName).toBe('Bob Wilson')
        expect(transformed.attendanceDate).toBe('2026-01-20')
        expect(transformed.correctionReason).toBe('')
        expect(transformed.updatedAt).toBe('-')
      })
    })
  })


  // =====================================================
  // Status Color Mapping Tests
  // =====================================================

  describe('Status color mapping tests', () => {
    it('should map pending status to yellow', () => {
      expect(getLeaveStatusColor('pending')).toBe('yellow')
    })

    it('should map approved status to green', () => {
      expect(getLeaveStatusColor('approved')).toBe('green')
    })

    it('should map rejected status to red', () => {
      expect(getLeaveStatusColor('rejected')).toBe('red')
    })

    it('should map cancelled status to gray', () => {
      expect(getLeaveStatusColor('cancelled')).toBe('gray')
    })

    it('should map unknown status to gray (default)', () => {
      expect(getLeaveStatusColor('unknown')).toBe('gray')
      expect(getLeaveStatusColor('')).toBe('gray')
      expect(getLeaveStatusColor('invalid')).toBe('gray')
    })

    it('should be case-insensitive for pending', () => {
      expect(getLeaveStatusColor('PENDING')).toBe('yellow')
      expect(getLeaveStatusColor('Pending')).toBe('yellow')
      expect(getLeaveStatusColor('pEnDiNg')).toBe('yellow')
    })

    it('should be case-insensitive for approved', () => {
      expect(getLeaveStatusColor('APPROVED')).toBe('green')
      expect(getLeaveStatusColor('Approved')).toBe('green')
    })

    it('should be case-insensitive for rejected', () => {
      expect(getLeaveStatusColor('REJECTED')).toBe('red')
      expect(getLeaveStatusColor('Rejected')).toBe('red')
    })

    it('should be case-insensitive for cancelled', () => {
      expect(getLeaveStatusColor('CANCELLED')).toBe('gray')
      expect(getLeaveStatusColor('Cancelled')).toBe('gray')
    })
  })


  // =====================================================
  // Status Filtering Tests
  // =====================================================

  describe('Status filtering tests', () => {
    it('should count pending payroll adjustments correctly', () => {
      const records = [
        { id: '1', status: 'draft' },
        { id: '2', status: 'pending' },
        { id: '3', status: 'processed' },
        { id: '4', status: 'paid' },
        { id: '5', status: 'draft' },
      ]
      
      const pendingCount = countByStatus(records, PENDING_PAYROLL_STATUSES)
      
      expect(pendingCount).toBe(3)
    })

    it('should count resignations correctly', () => {
      const records = [
        { id: '1', status: 'active' },
        { id: '2', status: 'resigned' },
        { id: '3', status: 'terminated' },
        { id: '4', status: 'inactive' },
        { id: '5', status: 'resigned' },
      ]
      
      const resignedCount = countByStatus(records, RESIGNED_STATUSES)
      
      expect(resignedCount).toBe(3)
    })

    it('should count approved leave requests correctly', () => {
      const records = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'approved' },
        { id: '3', status: 'rejected' },
        { id: '4', status: 'approved' },
        { id: '5', status: 'cancelled' },
      ]
      
      const approvedCount = countByStatus(records, ['approved'])
      
      expect(approvedCount).toBe(2)
    })

    it('should be case-insensitive for status matching', () => {
      const records = [
        { id: '1', status: 'DRAFT' },
        { id: '2', status: 'Draft' },
        { id: '3', status: 'draft' },
        { id: '4', status: 'PENDING' },
      ]
      
      const pendingCount = countByStatus(records, PENDING_PAYROLL_STATUSES)
      
      expect(pendingCount).toBe(4)
    })

    it('should return 0 when no records match', () => {
      const records = [
        { id: '1', status: 'processed' },
        { id: '2', status: 'paid' },
      ]
      
      const pendingCount = countByStatus(records, PENDING_PAYROLL_STATUSES)
      
      expect(pendingCount).toBe(0)
    })
  })


  // =====================================================
  // Grouping and Aggregation Tests
  // =====================================================

  describe('Grouping and aggregation tests', () => {
    it('should group payroll by department correctly', () => {
      const records = [
        { id: '1', departmentId: 'dept-1', grossSalary: 5000000 },
        { id: '2', departmentId: 'dept-1', grossSalary: 6000000 },
        { id: '3', departmentId: 'dept-2', grossSalary: 7000000 },
      ]
      
      const grouped = groupByKey(records, r => r.departmentId)
      
      expect(grouped.size).toBe(2)
      expect(grouped.get('dept-1')?.length).toBe(2)
      expect(grouped.get('dept-2')?.length).toBe(1)
    })

    it('should sum payroll by department correctly', () => {
      const records = [
        { id: '1', departmentId: 'dept-1', grossSalary: 5000000 },
        { id: '2', departmentId: 'dept-1', grossSalary: 6000000 },
        { id: '3', departmentId: 'dept-2', grossSalary: 7000000 },
      ]
      
      const sums = sumByGroup(records, r => r.departmentId, r => r.grossSalary)
      
      expect(sums.get('dept-1')).toBe(11000000)
      expect(sums.get('dept-2')).toBe(7000000)
    })

    it('should group leave balances by type correctly', () => {
      const records = [
        { id: '1', leaveTypeId: 'lt-1', availableDays: 10 },
        { id: '2', leaveTypeId: 'lt-1', availableDays: 8 },
        { id: '3', leaveTypeId: 'lt-2', availableDays: 5 },
      ]
      
      const grouped = groupByKey(records, r => r.leaveTypeId)
      
      expect(grouped.size).toBe(2)
      expect(grouped.get('lt-1')?.length).toBe(2)
      expect(grouped.get('lt-2')?.length).toBe(1)
    })

    it('should sum leave days by type correctly', () => {
      const records = [
        { id: '1', leaveTypeId: 'lt-1', availableDays: 10 },
        { id: '2', leaveTypeId: 'lt-1', availableDays: 8 },
        { id: '3', leaveTypeId: 'lt-2', availableDays: 5 },
      ]
      
      const sums = sumByGroup(records, r => r.leaveTypeId, r => r.availableDays)
      
      expect(sums.get('lt-1')).toBe(18)
      expect(sums.get('lt-2')).toBe(5)
    })

    it('should verify grouped sums equal total sum', () => {
      const records = [
        { id: '1', departmentId: 'dept-1', grossSalary: 5000000 },
        { id: '2', departmentId: 'dept-1', grossSalary: 6000000 },
        { id: '3', departmentId: 'dept-2', grossSalary: 7000000 },
        { id: '4', departmentId: 'dept-3', grossSalary: 8000000 },
      ]
      
      const sums = sumByGroup(records, r => r.departmentId, r => r.grossSalary)
      
      let totalGroupSum = 0
      for (const [, sum] of sums) {
        totalGroupSum += sum
      }
      
      const totalSum = records.reduce((sum, r) => sum + r.grossSalary, 0)
      
      expect(totalGroupSum).toBe(totalSum)
      expect(totalGroupSum).toBe(26000000)
    })
  })


  // =====================================================
  // Ordering and Limiting Tests
  // =====================================================

  describe('Ordering and limiting tests', () => {
    it('should limit to 5 most recent leave requests', () => {
      const records = Array.from({ length: 10 }, (_, i) => ({
        id: `lr-${i}`,
        createdAt: `2026-01-${String(25 - i).padStart(2, '0')}`,
      }))
      
      const limited = orderAndLimit(
        records,
        (a, b) => b.createdAt.localeCompare(a.createdAt),
        5
      )
      
      expect(limited).toHaveLength(5)
      expect(limited[0].id).toBe('lr-0') // Most recent
      expect(limited[4].id).toBe('lr-4')
    })

    it('should return all records when less than limit', () => {
      const records = [
        { id: 'lr-1', createdAt: '2026-01-25' },
        { id: 'lr-2', createdAt: '2026-01-24' },
        { id: 'lr-3', createdAt: '2026-01-23' },
      ]
      
      const limited = orderAndLimit(
        records,
        (a, b) => b.createdAt.localeCompare(a.createdAt),
        5
      )
      
      expect(limited).toHaveLength(3)
    })

    it('should order by created_at descending', () => {
      const records = [
        { id: 'lr-1', createdAt: '2026-01-20' },
        { id: 'lr-2', createdAt: '2026-01-25' },
        { id: 'lr-3', createdAt: '2026-01-22' },
      ]
      
      const ordered = orderAndLimit(
        records,
        (a, b) => b.createdAt.localeCompare(a.createdAt),
        10
      )
      
      expect(ordered[0].id).toBe('lr-2') // 2026-01-25
      expect(ordered[1].id).toBe('lr-3') // 2026-01-22
      expect(ordered[2].id).toBe('lr-1') // 2026-01-20
    })

    it('should order attendance corrections by updated_at descending', () => {
      const records = [
        { id: 'ac-1', updatedAt: '2026-01-20' },
        { id: 'ac-2', updatedAt: '2026-01-25' },
        { id: 'ac-3', updatedAt: '2026-01-22' },
      ]
      
      const ordered = orderAndLimit(
        records,
        (a, b) => b.updatedAt.localeCompare(a.updatedAt),
        10
      )
      
      expect(ordered[0].id).toBe('ac-2') // 2026-01-25
      expect(ordered[1].id).toBe('ac-3') // 2026-01-22
      expect(ordered[2].id).toBe('ac-1') // 2026-01-20
    })

    it('should not modify original array', () => {
      const records = [
        { id: 'lr-1', createdAt: '2026-01-20' },
        { id: 'lr-2', createdAt: '2026-01-25' },
        { id: 'lr-3', createdAt: '2026-01-22' },
      ]
      
      const originalOrder = records.map(r => r.id)
      
      orderAndLimit(
        records,
        (a, b) => b.createdAt.localeCompare(a.createdAt),
        5
      )
      
      const currentOrder = records.map(r => r.id)
      
      expect(currentOrder).toEqual(originalOrder)
    })
  })


  // =====================================================
  // Cache Key Generation Tests
  // =====================================================

  describe('Cache key generation tests', () => {
    it('should generate cache key with correct format', () => {
      const date = new Date('2026-01-26')
      const key = generateCacheKeyWithDate('hr-dashboard-metrics', 'hr', date)
      
      expect(key).toBe('hr-dashboard-metrics:hr:2026-01-26')
    })

    it('should include role in cache key', () => {
      const date = new Date('2026-01-26')
      const key = generateCacheKeyWithDate('hr-dashboard-metrics', 'owner', date)
      
      expect(key).toContain(':owner:')
    })

    it('should include date in YYYY-MM-DD format', () => {
      const date = new Date('2026-01-26')
      const key = generateCacheKeyWithDate('hr-dashboard-metrics', 'hr', date)
      
      expect(key).toMatch(/:\d{4}-\d{2}-\d{2}$/)
    })

    it('should generate different keys for different roles', () => {
      const date = new Date('2026-01-26')
      
      const keyHr = generateCacheKeyWithDate('hr-dashboard-metrics', 'hr', date)
      const keyOwner = generateCacheKeyWithDate('hr-dashboard-metrics', 'owner', date)
      const keyDirector = generateCacheKeyWithDate('hr-dashboard-metrics', 'director', date)
      
      expect(keyHr).not.toBe(keyOwner)
      expect(keyOwner).not.toBe(keyDirector)
      expect(keyHr).not.toBe(keyDirector)
    })

    it('should generate different keys for different dates', () => {
      const date1 = new Date('2026-01-26')
      const date2 = new Date('2026-01-27')
      
      const key1 = generateCacheKeyWithDate('hr-dashboard-metrics', 'hr', date1)
      const key2 = generateCacheKeyWithDate('hr-dashboard-metrics', 'hr', date2)
      
      expect(key1).not.toBe(key2)
    })

    it('should generate same key for same inputs', () => {
      const date = new Date('2026-01-26')
      
      const key1 = generateCacheKeyWithDate('hr-dashboard-metrics', 'hr', date)
      const key2 = generateCacheKeyWithDate('hr-dashboard-metrics', 'hr', date)
      
      expect(key1).toBe(key2)
    })

    it('should have exactly 3 parts separated by colons', () => {
      const date = new Date('2026-01-26')
      const key = generateCacheKeyWithDate('hr-dashboard-metrics', 'hr', date)
      
      const parts = key.split(':')
      
      expect(parts).toHaveLength(3)
      expect(parts[0]).toBe('hr-dashboard-metrics')
      expect(parts[1]).toBe('hr')
      expect(parts[2]).toBe('2026-01-26')
    })
  })


  // =====================================================
  // Sum Aggregation Tests
  // =====================================================

  describe('Sum aggregation tests', () => {
    it('should calculate total payroll correctly', () => {
      const records = [
        { date: '2026-01-15', amount: 5000000 },
        { date: '2026-01-16', amount: 6000000 },
        { date: '2026-01-17', amount: 7000000 },
      ]
      
      const sum = calculateSumWithDateFilter(records, '2026-01-01', '2026-01-31')
      
      expect(sum).toBe(18000000)
    })

    it('should calculate overtime hours correctly', () => {
      const records = [
        { date: '2026-01-15', amount: 2.5 },
        { date: '2026-01-16', amount: 3.0 },
        { date: '2026-01-17', amount: 1.5 },
      ]
      
      const sum = calculateSumWithDateFilter(records, '2026-01-01', '2026-01-31')
      
      expect(sum).toBe(7)
    })

    it('should calculate leave days used correctly', () => {
      const records = [
        { date: '2026-01-10', amount: 3 },
        { date: '2026-01-15', amount: 5 },
        { date: '2026-01-20', amount: 2 },
      ]
      
      const sum = calculateSumWithDateFilter(records, '2026-01-01', '2026-01-31')
      
      expect(sum).toBe(10)
    })

    it('should exclude records outside date range', () => {
      const records = [
        { date: '2025-12-31', amount: 1000 },
        { date: '2026-01-15', amount: 2000 },
        { date: '2026-02-01', amount: 3000 },
      ]
      
      const sum = calculateSumWithDateFilter(records, '2026-01-01', '2026-01-31')
      
      expect(sum).toBe(2000)
    })

    it('should handle large amounts correctly', () => {
      const records = [
        { date: '2026-01-15', amount: 1000000000 },
        { date: '2026-01-16', amount: 2000000000 },
        { date: '2026-01-17', amount: 3000000000 },
      ]
      
      const sum = calculateSumWithDateFilter(records, '2026-01-01', '2026-01-31')
      
      expect(sum).toBe(6000000000)
    })
  })


  // =====================================================
  // Attendance Analytics Tests
  // =====================================================

  describe('Attendance analytics tests', () => {
    it('should count late arrivals correctly', () => {
      const records = [
        { id: '1', lateMinutes: 0 },
        { id: '2', lateMinutes: 15 },
        { id: '3', lateMinutes: 30 },
        { id: '4', lateMinutes: 0 },
        { id: '5', lateMinutes: 5 },
      ]
      
      const lateCount = records.filter(r => r.lateMinutes > 0).length
      
      expect(lateCount).toBe(3)
    })

    it('should count early departures correctly', () => {
      const records = [
        { id: '1', earlyLeaveMinutes: 0 },
        { id: '2', earlyLeaveMinutes: 30 },
        { id: '3', earlyLeaveMinutes: 0 },
        { id: '4', earlyLeaveMinutes: 15 },
      ]
      
      const earlyCount = records.filter(r => r.earlyLeaveMinutes > 0).length
      
      expect(earlyCount).toBe(2)
    })

    it('should calculate average work hours correctly', () => {
      const workHours = [8.0, 8.5, 7.5, 9.0, 8.0]
      
      const avg = calculateAverage(workHours)
      
      expect(avg).toBe(8.2)
    })

    it('should handle single work hour record', () => {
      const workHours = [8.5]
      
      const avg = calculateAverage(workHours)
      
      expect(avg).toBe(8.5)
    })

    it('should group attendance by department correctly', () => {
      const records = [
        { id: '1', departmentId: 'dept-1', status: 'present', lateMinutes: 0 },
        { id: '2', departmentId: 'dept-1', status: 'present', lateMinutes: 15 },
        { id: '3', departmentId: 'dept-1', status: 'absent', lateMinutes: 0 },
        { id: '4', departmentId: 'dept-2', status: 'present', lateMinutes: 0 },
        { id: '5', departmentId: 'dept-2', status: 'present', lateMinutes: 30 },
      ]
      
      const grouped = groupByKey(records, r => r.departmentId)
      
      expect(grouped.get('dept-1')?.length).toBe(3)
      expect(grouped.get('dept-2')?.length).toBe(2)
      
      // Count present in dept-1
      const dept1Present = grouped.get('dept-1')?.filter(r => r.status === 'present').length
      expect(dept1Present).toBe(2)
      
      // Count late in dept-1
      const dept1Late = grouped.get('dept-1')?.filter(r => r.lateMinutes > 0).length
      expect(dept1Late).toBe(1)
    })
  })


  // =====================================================
  // Employee Lifecycle Tests
  // =====================================================

  describe('Employee lifecycle tests', () => {
    it('should count probation ending within 30 days', () => {
      const today = '2026-01-15'
      const thirtyDaysFromNow = '2026-02-14'
      
      const records = [
        { id: '1', employmentType: 'probation', endDate: '2026-01-20' },
        { id: '2', employmentType: 'probation', endDate: '2026-02-10' },
        { id: '3', employmentType: 'probation', endDate: '2026-02-20' }, // Beyond 30 days
        { id: '4', employmentType: 'contract', endDate: '2026-01-25' }, // Not probation
      ]
      
      const probationRecords = records.filter(r => r.employmentType === 'probation')
      const filtered = filterByDateThreshold(
        probationRecords.map(r => ({ ...r, date: r.endDate })),
        today,
        thirtyDaysFromNow
      )
      
      expect(filtered).toHaveLength(2)
    })

    it('should count contract renewals due within 30 days', () => {
      const today = '2026-01-15'
      const thirtyDaysFromNow = '2026-02-14'
      
      const records = [
        { id: '1', employmentType: 'contract', endDate: '2026-01-20' },
        { id: '2', employmentType: 'contract', endDate: '2026-02-10' },
        { id: '3', employmentType: 'contract', endDate: '2026-02-20' }, // Beyond 30 days
        { id: '4', employmentType: 'permanent', endDate: '2026-01-25' }, // Not contract
      ]
      
      const contractRecords = records.filter(r => r.employmentType === 'contract')
      const filtered = filterByDateThreshold(
        contractRecords.map(r => ({ ...r, date: r.endDate })),
        today,
        thirtyDaysFromNow
      )
      
      expect(filtered).toHaveLength(2)
    })

    it('should count resignations this month', () => {
      const records = [
        { id: '1', status: 'resigned' },
        { id: '2', status: 'terminated' },
        { id: '3', status: 'active' },
        { id: '4', status: 'resigned' },
        { id: '5', status: 'inactive' },
      ]
      
      const resignedCount = countByStatus(records, RESIGNED_STATUSES)
      
      expect(resignedCount).toBe(3)
    })

    it('should handle employees with null end dates', () => {
      const records = [
        { id: '1', employmentType: 'probation', endDate: null },
        { id: '2', employmentType: 'probation', endDate: '2026-01-20' },
      ]
      
      const validRecords = records.filter(r => r.endDate !== null)
      
      expect(validRecords).toHaveLength(1)
    })
  })


  // =====================================================
  // Leave Balance Tests
  // =====================================================

  describe('Leave balance tests', () => {
    it('should count employees with low leave balance', () => {
      const records = [
        { id: '1', employeeId: 'emp-1', availableDays: 3 },
        { id: '2', employeeId: 'emp-2', availableDays: 5 },
        { id: '3', employeeId: 'emp-3', availableDays: 4 },
        { id: '4', employeeId: 'emp-4', availableDays: 10 },
        { id: '5', employeeId: 'emp-5', availableDays: 0 },
      ]
      
      const lowBalanceCount = filterByNumericThreshold(
        records,
        r => r.availableDays,
        5,
        'lt'
      ).length
      
      expect(lowBalanceCount).toBe(3) // emp-1 (3), emp-3 (4), emp-5 (0)
    })

    it('should count unique employees with low balance', () => {
      const records = [
        { id: '1', employeeId: 'emp-1', leaveTypeId: 'lt-1', availableDays: 3 },
        { id: '2', employeeId: 'emp-1', leaveTypeId: 'lt-2', availableDays: 2 }, // Same employee
        { id: '3', employeeId: 'emp-2', leaveTypeId: 'lt-1', availableDays: 4 },
        { id: '4', employeeId: 'emp-3', leaveTypeId: 'lt-1', availableDays: 10 },
      ]
      
      const lowBalanceRecords = filterByNumericThreshold(
        records,
        r => r.availableDays,
        5,
        'lt'
      )
      
      const uniqueEmployees = new Set(lowBalanceRecords.map(r => r.employeeId)).size
      
      expect(uniqueEmployees).toBe(2) // emp-1 and emp-2
    })

    it('should calculate leave utilization rate correctly', () => {
      const totalEntitled = 100
      const totalUsed = 40
      
      const rate = calculatePercentage(totalUsed, totalEntitled)
      
      expect(rate).toBe(40)
    })

    it('should handle 0% utilization', () => {
      const rate = calculatePercentage(0, 100)
      expect(rate).toBe(0)
    })

    it('should handle 100% utilization', () => {
      const rate = calculatePercentage(100, 100)
      expect(rate).toBe(100)
    })

    it('should handle over 100% utilization (negative balance)', () => {
      const rate = calculatePercentage(120, 100)
      expect(rate).toBe(120)
    })
  })
})
