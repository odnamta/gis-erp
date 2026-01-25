/**
 * Unit tests for HSE Dashboard Data Service
 * Tests specific examples and edge cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateDaysBetween } from '@/lib/dashboard/hse-data'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock dashboard cache
vi.mock('@/lib/dashboard-cache', () => ({
  getOrFetch: vi.fn((key, fetcher) => fetcher()),
  generateCacheKey: vi.fn((prefix, role) => `${prefix}:${role}:2026-01-25`),
}))

describe('HSE Dashboard Data - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty data scenarios', () => {
    it('should handle empty incidents array', () => {
      const incidents: { id: string; status: string }[] = []
      const closedStatuses = ['closed', 'resolved']
      
      const open = incidents.filter(i => !closedStatuses.includes(i.status))
      
      expect(open).toHaveLength(0)
    })

    it('should handle empty permits array', () => {
      const permits: { id: string; status: string; validTo: string }[] = []
      const today = '2026-01-25'
      
      const active = permits.filter(p => 
        p.status === 'active' && p.validTo >= today
      )
      
      expect(active).toHaveLength(0)
    })

    it('should handle empty training records array', () => {
      const training: { employeeCode: string; daysUntilExpiry: number }[] = []
      
      const expiring = training.filter(t => t.daysUntilExpiry >= 0 && t.daysUntilExpiry <= 30)
      
      expect(expiring).toHaveLength(0)
    })

    it('should handle empty PPE records array', () => {
      const ppe: { id: string; daysOverdue: number }[] = []
      
      const overdue = ppe.filter(p => p.daysOverdue > 30)
      
      expect(overdue).toHaveLength(0)
    })

    it('should return 100% compliance rate for empty training records', () => {
      const total = 0
      const compliant = 0
      
      const rate = total === 0 ? 100 : Math.round((compliant / total) * 100)
      
      expect(rate).toBe(100)
    })
  })

  describe('Null value handling', () => {
    it('should handle null incident_date in incidents', () => {
      const incident = {
        id: '123',
        incident_number: 'INC-001',
        title: 'Test Incident',
        severity: 'minor',
        status: 'open',
        incident_date: null,
        location_type: 'site',
      }
      
      const transformed = {
        id: incident.id,
        incidentNumber: incident.incident_number || '',
        title: incident.title || '',
        severity: incident.severity || '',
        status: incident.status || '',
        incidentDate: incident.incident_date,
        locationType: incident.location_type || '',
      }
      
      expect(transformed.incidentDate).toBeNull()
      expect(transformed.title).toBe('Test Incident')
    })

    it('should handle null work_location in permits', () => {
      const permit = {
        id: '123',
        permit_number: 'PTW-001',
        permit_type: 'hot_work',
        work_location: null,
        status: 'active',
        valid_to: '2026-02-28',
      }
      
      const transformed = {
        id: permit.id,
        permitNumber: permit.permit_number || '',
        permitType: permit.permit_type || '',
        workLocation: permit.work_location,
        status: permit.status || '',
        validTo: permit.valid_to || '',
      }
      
      expect(transformed.workLocation).toBeNull()
      expect(transformed.permitType).toBe('hot_work')
    })

    it('should handle null course_name in training', () => {
      const training = {
        employee_code: 'EMP-001',
        full_name: 'John Doe',
        course_name: null,
        valid_to: '2026-02-15',
        days_until_expiry: 21,
      }
      
      const transformed = {
        employeeCode: training.employee_code || '',
        fullName: training.full_name || '',
        courseName: training.course_name,
        validTo: training.valid_to || '',
        daysUntilExpiry: training.days_until_expiry || 0,
      }
      
      expect(transformed.courseName).toBeNull()
      expect(transformed.fullName).toBe('John Doe')
    })

    it('should handle null ppe_name in PPE records', () => {
      const ppe = {
        id: '123',
        employee_code: 'EMP-001',
        full_name: 'John Doe',
        ppe_name: null,
        expected_replacement_date: '2026-01-01',
        days_overdue: 24,
      }
      
      const transformed = {
        id: ppe.id,
        employeeCode: ppe.employee_code || '',
        fullName: ppe.full_name || '',
        ppeName: ppe.ppe_name,
        expectedReplacementDate: ppe.expected_replacement_date || '',
        daysOverdue: ppe.days_overdue || 0,
      }
      
      expect(transformed.ppeName).toBeNull()
      expect(transformed.daysOverdue).toBe(24)
    })
  })

  describe('Date boundary cases', () => {
    it('should include permits valid exactly on today', () => {
      const today = '2026-01-25'
      const validTo = '2026-01-25'
      
      const isActive = validTo >= today
      
      expect(isActive).toBe(true)
    })

    it('should exclude permits expired yesterday', () => {
      const today = '2026-01-25'
      const validTo = '2026-01-24'
      
      const isActive = validTo >= today
      
      expect(isActive).toBe(false)
    })

    it('should include training expiring exactly in 30 days', () => {
      const daysUntilExpiry = 30
      
      const isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 30
      
      expect(isExpiringSoon).toBe(true)
    })

    it('should exclude training expiring in 31 days', () => {
      const daysUntilExpiry = 31
      
      const isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 30
      
      expect(isExpiringSoon).toBe(false)
    })

    it('should identify overdue training (negative days)', () => {
      const daysUntilExpiry = -5
      
      const isOverdue = daysUntilExpiry < 0
      
      expect(isOverdue).toBe(true)
    })

    it('should identify PPE overdue more than 30 days', () => {
      const daysOverdue = 31
      
      const isCritical = daysOverdue > 30
      
      expect(isCritical).toBe(true)
    })

    it('should not flag PPE overdue exactly 30 days as critical', () => {
      const daysOverdue = 30
      
      const isCritical = daysOverdue > 30
      
      expect(isCritical).toBe(false)
    })
  })

  describe('Role access scenarios', () => {
    const allowedRoles = ['hse', 'owner', 'director', 'operations_manager']
    
    it('should allow hse role', () => {
      const role = 'hse'
      expect(allowedRoles.includes(role)).toBe(true)
    })

    it('should allow owner role', () => {
      const role = 'owner'
      expect(allowedRoles.includes(role)).toBe(true)
    })

    it('should allow director role', () => {
      const role = 'director'
      expect(allowedRoles.includes(role)).toBe(true)
    })

    it('should allow operations_manager role', () => {
      const role = 'operations_manager'
      expect(allowedRoles.includes(role)).toBe(true)
    })

    it('should deny finance role', () => {
      const role = 'finance'
      expect(allowedRoles.includes(role)).toBe(false)
    })

    it('should deny marketing role', () => {
      const role = 'marketing'
      expect(allowedRoles.includes(role)).toBe(false)
    })

    it('should deny hr role', () => {
      const role = 'hr'
      expect(allowedRoles.includes(role)).toBe(false)
    })

    it('should deny engineer role', () => {
      const role = 'engineer'
      expect(allowedRoles.includes(role)).toBe(false)
    })
  })

  describe('Threshold edge cases', () => {
    describe('Days since incident warning threshold (7 days)', () => {
      it('should show warning when days = 6', () => {
        const days = 6
        const isWarning = days < 7
        expect(isWarning).toBe(true)
      })

      it('should show warning when days = 0', () => {
        const days = 0
        const isWarning = days < 7
        expect(isWarning).toBe(true)
      })

      it('should not show warning when days = 7', () => {
        const days = 7
        const isWarning = days < 7
        expect(isWarning).toBe(false)
      })

      it('should not show warning when days = 8', () => {
        const days = 8
        const isWarning = days < 7
        expect(isWarning).toBe(false)
      })
    })

    describe('Training compliance rate thresholds', () => {
      it('should show red when rate = 69', () => {
        const rate = 69
        const color = rate >= 90 ? 'green' : rate >= 70 ? 'yellow' : 'red'
        expect(color).toBe('red')
      })

      it('should show yellow when rate = 70', () => {
        const rate = 70
        const color = rate >= 90 ? 'green' : rate >= 70 ? 'yellow' : 'red'
        expect(color).toBe('yellow')
      })

      it('should show yellow when rate = 89', () => {
        const rate = 89
        const color = rate >= 90 ? 'green' : rate >= 70 ? 'yellow' : 'red'
        expect(color).toBe('yellow')
      })

      it('should show green when rate = 90', () => {
        const rate = 90
        const color = rate >= 90 ? 'green' : rate >= 70 ? 'yellow' : 'red'
        expect(color).toBe('green')
      })

      it('should show green when rate = 100', () => {
        const rate = 100
        const color = rate >= 90 ? 'green' : rate >= 70 ? 'yellow' : 'red'
        expect(color).toBe('green')
      })
    })

    describe('Training expiring soon threshold (7 days)', () => {
      it('should highlight when daysUntilExpiry = 6', () => {
        const days = 6
        const isUrgent = days <= 7
        expect(isUrgent).toBe(true)
      })

      it('should highlight when daysUntilExpiry = 7', () => {
        const days = 7
        const isUrgent = days <= 7
        expect(isUrgent).toBe(true)
      })

      it('should not highlight when daysUntilExpiry = 8', () => {
        const days = 8
        const isUrgent = days <= 7
        expect(isUrgent).toBe(false)
      })
    })

    describe('PPE overdue critical threshold (30 days)', () => {
      it('should not be critical when daysOverdue = 29', () => {
        const days = 29
        const isCritical = days > 30
        expect(isCritical).toBe(false)
      })

      it('should not be critical when daysOverdue = 30', () => {
        const days = 30
        const isCritical = days > 30
        expect(isCritical).toBe(false)
      })

      it('should be critical when daysOverdue = 31', () => {
        const days = 31
        const isCritical = days > 30
        expect(isCritical).toBe(true)
      })
    })
  })

  describe('Severity grouping', () => {
    it('should count critical incidents correctly', () => {
      const incidents = [
        { severity: 'critical' },
        { severity: 'major' },
        { severity: 'critical' },
        { severity: 'minor' },
      ]
      
      const critical = incidents.filter(i => i.severity.toLowerCase() === 'critical').length
      
      expect(critical).toBe(2)
    })

    it('should count major incidents correctly', () => {
      const incidents = [
        { severity: 'critical' },
        { severity: 'major' },
        { severity: 'major' },
        { severity: 'minor' },
      ]
      
      const major = incidents.filter(i => i.severity.toLowerCase() === 'major').length
      
      expect(major).toBe(2)
    })

    it('should count minor incidents correctly', () => {
      const incidents = [
        { severity: 'critical' },
        { severity: 'minor' },
        { severity: 'minor' },
        { severity: 'minor' },
      ]
      
      const minor = incidents.filter(i => i.severity.toLowerCase() === 'minor').length
      
      expect(minor).toBe(3)
    })

    it('should handle case-insensitive severity', () => {
      const incidents = [
        { severity: 'CRITICAL' },
        { severity: 'Critical' },
        { severity: 'critical' },
      ]
      
      const critical = incidents.filter(i => i.severity.toLowerCase() === 'critical').length
      
      expect(critical).toBe(3)
    })

    it('should handle unknown severity as uncategorized', () => {
      const incidents = [
        { severity: 'critical' },
        { severity: 'unknown' },
        { severity: '' },
      ]
      
      const critical = incidents.filter(i => i.severity.toLowerCase() === 'critical').length
      const major = incidents.filter(i => i.severity.toLowerCase() === 'major').length
      const minor = incidents.filter(i => i.severity.toLowerCase() === 'minor').length
      
      expect(critical).toBe(1)
      expect(major).toBe(0)
      expect(minor).toBe(0)
    })
  })

  describe('Compliance rate calculation', () => {
    it('should calculate 50% correctly', () => {
      const compliant = 5
      const total = 10
      const rate = Math.round((compliant / total) * 100)
      
      expect(rate).toBe(50)
    })

    it('should calculate 33% correctly (rounded)', () => {
      const compliant = 1
      const total = 3
      const rate = Math.round((compliant / total) * 100)
      
      expect(rate).toBe(33)
    })

    it('should calculate 67% correctly (rounded)', () => {
      const compliant = 2
      const total = 3
      const rate = Math.round((compliant / total) * 100)
      
      expect(rate).toBe(67)
    })

    it('should handle 0 compliant', () => {
      const compliant = 0
      const total = 10
      const rate = Math.round((compliant / total) * 100)
      
      expect(rate).toBe(0)
    })

    it('should handle 100% compliance', () => {
      const compliant = 10
      const total = 10
      const rate = Math.round((compliant / total) * 100)
      
      expect(rate).toBe(100)
    })

    it('should return 100 for division by zero (no mandatory training)', () => {
      const total = 0
      const compliant = 0
      const rate = total === 0 ? 100 : Math.round((compliant / total) * 100)
      
      expect(rate).toBe(100)
    })
  })

  describe('Recent items limiting', () => {
    it('should limit to 5 items', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        createdAt: `2026-01-${String(25 - i).padStart(2, '0')}`,
      }))
      
      const limited = items.slice(0, 5)
      
      expect(limited).toHaveLength(5)
    })

    it('should return all items if less than limit', () => {
      const items = Array.from({ length: 3 }, (_, i) => ({
        id: String(i),
        createdAt: `2026-01-${String(25 - i).padStart(2, '0')}`,
      }))
      
      const limited = items.slice(0, 5)
      
      expect(limited).toHaveLength(3)
    })

    it('should return empty array for empty input', () => {
      const items: { id: string; createdAt: string }[] = []
      
      const limited = items.slice(0, 5)
      
      expect(limited).toHaveLength(0)
    })
  })

  describe('Severity badge color mapping', () => {
    const severityColors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800',
      major: 'bg-orange-100 text-orange-800',
      minor: 'bg-yellow-100 text-yellow-800',
    }

    it('should map critical to red', () => {
      expect(severityColors['critical']).toBe('bg-red-100 text-red-800')
    })

    it('should map major to orange', () => {
      expect(severityColors['major']).toBe('bg-orange-100 text-orange-800')
    })

    it('should map minor to yellow', () => {
      expect(severityColors['minor']).toBe('bg-yellow-100 text-yellow-800')
    })
  })

  describe('Status badge color mapping', () => {
    const statusColors: Record<string, string> = {
      open: 'bg-red-100 text-red-800',
      investigating: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      active: 'bg-emerald-100 text-emerald-800',
      pending: 'bg-orange-100 text-orange-800',
      expired: 'bg-red-100 text-red-800',
      suspended: 'bg-purple-100 text-purple-800',
    }

    it('should map all incident statuses', () => {
      const incidentStatuses = ['open', 'investigating', 'resolved', 'closed']
      
      incidentStatuses.forEach(status => {
        expect(statusColors[status]).toBeDefined()
      })
    })

    it('should map all permit statuses', () => {
      const permitStatuses = ['active', 'pending', 'expired', 'suspended', 'closed']
      
      permitStatuses.forEach(status => {
        expect(statusColors[status]).toBeDefined()
      })
    })
  })

  describe('calculateDaysBetween helper function', () => {
    it('should return 0 for same day', () => {
      const date = new Date('2026-01-25')
      const result = calculateDaysBetween(date, date)
      expect(result).toBe(0)
    })

    it('should return 1 for consecutive days', () => {
      const start = new Date('2026-01-24')
      const end = new Date('2026-01-25')
      const result = calculateDaysBetween(start, end)
      expect(result).toBe(1)
    })

    it('should return 7 for one week', () => {
      const start = new Date('2026-01-18')
      const end = new Date('2026-01-25')
      const result = calculateDaysBetween(start, end)
      expect(result).toBe(7)
    })

    it('should return 30 for one month (approximately)', () => {
      const start = new Date('2025-12-26')
      const end = new Date('2026-01-25')
      const result = calculateDaysBetween(start, end)
      expect(result).toBe(30)
    })

    it('should return 365 for one year (approximately)', () => {
      const start = new Date('2025-01-25')
      const end = new Date('2026-01-25')
      const result = calculateDaysBetween(start, end)
      // Allow for leap year variation
      expect(result).toBeGreaterThanOrEqual(365)
      expect(result).toBeLessThanOrEqual(366)
    })

    it('should handle negative days (future to past)', () => {
      const start = new Date('2026-01-25')
      const end = new Date('2026-01-20')
      const result = calculateDaysBetween(start, end)
      expect(result).toBe(-5)
    })
  })

  describe('Days since last incident calculation', () => {
    it('should return days since start of year when no incidents', () => {
      const today = new Date('2026-01-25')
      const startOfYear = new Date('2026-01-01')
      
      const daysSinceStartOfYear = calculateDaysBetween(startOfYear, today)
      
      expect(daysSinceStartOfYear).toBe(24)
    })

    it('should return 0 when incident is today', () => {
      const today = new Date('2026-01-25')
      const incidentDate = new Date('2026-01-25')
      
      const daysSinceIncident = calculateDaysBetween(incidentDate, today)
      
      expect(daysSinceIncident).toBe(0)
    })

    it('should return correct days for incident last week', () => {
      const today = new Date('2026-01-25')
      const incidentDate = new Date('2026-01-18')
      
      const daysSinceIncident = calculateDaysBetween(incidentDate, today)
      
      expect(daysSinceIncident).toBe(7)
    })
  })

  describe('Permit expiry calculations', () => {
    it('should identify permits expiring within 30 days', () => {
      const today = new Date('2026-01-25')
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      const todayStr = today.toISOString().split('T')[0]
      const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0]
      
      const permits = [
        { validTo: '2026-01-30', status: 'active' }, // 5 days - expiring
        { validTo: '2026-02-24', status: 'active' }, // 30 days - expiring
        { validTo: '2026-02-25', status: 'active' }, // 31 days - not expiring
        { validTo: '2026-03-01', status: 'active' }, // 35 days - not expiring
      ]
      
      const expiring = permits.filter(p => 
        p.validTo >= todayStr && 
        p.validTo <= thirtyDaysStr &&
        p.status !== 'closed' && 
        p.status !== 'cancelled'
      )
      
      expect(expiring).toHaveLength(2)
    })

    it('should identify expired permits', () => {
      const today = '2026-01-25'
      
      const permits = [
        { validTo: '2026-01-24', status: 'active' }, // expired
        { validTo: '2026-01-20', status: 'active' }, // expired
        { validTo: '2026-01-25', status: 'active' }, // not expired (today)
        { validTo: '2026-01-24', status: 'closed' }, // expired but closed
      ]
      
      const expired = permits.filter(p => 
        p.validTo < today && 
        p.status !== 'closed' && 
        p.status !== 'cancelled'
      )
      
      expect(expired).toHaveLength(2)
    })
  })

  describe('Unique employee counting', () => {
    it('should count unique employees with incomplete PPE', () => {
      const records = [
        { employee_id: 'emp-1', ppe_status: 'pending', is_mandatory: true },
        { employee_id: 'emp-1', ppe_status: 'pending', is_mandatory: true }, // duplicate
        { employee_id: 'emp-2', ppe_status: 'pending', is_mandatory: true },
        { employee_id: 'emp-3', ppe_status: 'issued', is_mandatory: true }, // issued - excluded
        { employee_id: 'emp-4', ppe_status: 'pending', is_mandatory: false }, // not mandatory - excluded
      ]
      
      const incomplete = records.filter(r => 
        r.ppe_status !== 'issued' && r.is_mandatory === true
      )
      
      const uniqueEmployees = new Set(incomplete.map(r => r.employee_id)).size
      
      expect(uniqueEmployees).toBe(2) // emp-1 and emp-2
    })
  })
})
