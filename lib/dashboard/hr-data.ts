'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrFetch, generateCacheKey } from '@/lib/dashboard-cache'
import { formatDate } from '@/lib/utils/format'

// =====================================================
// INTERFACES
// =====================================================

export interface PayrollByDepartment {
  departmentId: string
  departmentName: string
  totalPayroll: number
  employeeCount: number
}

export interface LeaveBalanceSummary {
  leaveTypeId: string
  leaveTypeName: string
  totalEntitled: number
  totalUsed: number
  totalAvailable: number
}

export interface AttendanceByDepartment {
  departmentId: string
  departmentName: string
  presentCount: number
  absentCount: number
  lateCount: number
}

export interface RecentLeaveRequest {
  id: string
  employeeName: string
  leaveTypeName: string
  status: string
  startDate: string
  endDate: string
  totalDays: number
  createdAt: string
}

export interface RecentAttendanceCorrection {
  id: string
  employeeName: string
  attendanceDate: string
  correctionReason: string
  updatedAt: string
}

export interface HrDashboardMetrics {
  // Payroll Overview
  totalPayrollThisMonth: number
  payrollByDepartment: PayrollByDepartment[]
  overtimeHoursThisMonth: number
  pendingPayrollAdjustments: number
  
  // Leave Balance Tracking
  leaveDaysUsedThisMonth: number
  leaveBalanceSummary: LeaveBalanceSummary[]
  employeesWithLowLeaveBalance: number
  leaveUtilizationRate: number
  
  // Attendance Analytics
  lateArrivalsThisMonth: number
  earlyDeparturesThisMonth: number
  averageWorkHoursPerDay: number
  attendanceByDepartment: AttendanceByDepartment[]
  
  // Employee Lifecycle
  probationEndingSoon: number
  contractRenewalsDue: number
  workAnniversariesThisMonth: number
  resignationsThisMonth: number
  
  // Recent Activity
  recentLeaveRequests: RecentLeaveRequest[]
  recentAttendanceCorrections: RecentAttendanceCorrection[]
  
  // Existing metrics (preserved from hr-dashboard-data.ts)
  activeEmployees: number
  inactiveEmployees: number
  attendanceRate: number
  presentToday: number
  absentToday: number
  pendingLeaveRequests: number
  approvedLeavesToday: number
  newHiresThisMonth: number
  upcomingBirthdays: number
  expiringCertifications: number
}

// =====================================================
// CONSTANTS
// =====================================================

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const PENDING_PAYROLL_STATUSES = ['draft', 'pending']
const RESIGNED_STATUSES = ['resigned', 'terminated']

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get start of current month
 */
function getStartOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

/**
 * Get end of current month
 */
function getEndOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0)
}

/**
 * Get current year
 */
function getCurrentYear(): number {
  return new Date().getFullYear()
}

/**
 * Get current month (1-12)
 */
function getCurrentMonth(): number {
  return new Date().getMonth() + 1
}

/**
 * Calculate date 30 days from now
 */
function getThirtyDaysFromNow(): Date {
  const now = new Date()
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
}

// =====================================================
// MAIN DATA FETCHER
// =====================================================

export async function getHrDashboardMetrics(
  role: string = 'hr'
): Promise<HrDashboardMetrics> {
  const cacheKey = await generateCacheKey('hr-dashboard-metrics', role)
  
  return getOrFetch(cacheKey, async () => {
    const supabase = await createClient()
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const startOfMonth = getStartOfMonth().toISOString().split('T')[0]
    const endOfMonth = getEndOfMonth().toISOString().split('T')[0]
    const currentYear = getCurrentYear()
    const currentMonth = getCurrentMonth()
    const thirtyDaysFromNow = getThirtyDaysFromNow().toISOString().split('T')[0]
    
    // Run all queries in parallel for performance
    const [
      // Payroll metrics
      totalPayrollResult,
      payrollByDepartmentResult,
      overtimeHoursResult,
      pendingPayrollResult,
      
      // Leave balance metrics
      leaveDaysUsedResult,
      leaveBalanceSummaryResult,
      lowLeaveBalanceResult,
      leaveUtilizationResult,
      
      // Attendance analytics
      lateArrivalsResult,
      earlyDeparturesResult,
      workHoursResult,
      attendanceByDepartmentResult,
      
      // Employee lifecycle
      probationEndingResult,
      contractRenewalsResult,
      workAnniversariesResult,
      resignationsResult,
      
      // Recent activity
      recentLeaveRequestsResult,
      recentAttendanceCorrectionsResult,
      
      // Existing metrics (preserved)
      activeEmployeesResult,
      totalEmployeesResult,
      attendanceTodayResult,
      pendingLeaveRequestsResult,
      approvedLeaveTodayResult,
      newHiresResult,
      upcomingBirthdaysResult,
      expiringCertificationsResult,
    ] = await Promise.all([
      // Total payroll this month - join with payroll_periods
      supabase
        .from('payroll_records')
        .select('gross_salary, payroll_periods!inner(year, month)')
        .eq('payroll_periods.year', currentYear)
        .eq('payroll_periods.month', currentMonth),
      
      // Payroll by department
      supabase
        .from('payroll_records')
        .select(`
          gross_salary,
          employee_id,
          employees!inner(department_id, departments(id, department_name)),
          payroll_periods!inner(year, month)
        `)
        .eq('payroll_periods.year', currentYear)
        .eq('payroll_periods.month', currentMonth),
      
      // Overtime hours this month
      supabase
        .from('attendance_records')
        .select('overtime_hours')
        .gte('attendance_date', startOfMonth)
        .lte('attendance_date', endOfMonth),
      
      // Pending payroll adjustments
      supabase
        .from('payroll_records')
        .select('id', { count: 'exact', head: true })
        .in('status', PENDING_PAYROLL_STATUSES),
      
      // Leave days used this month (approved leave requests)
      supabase
        .from('leave_requests')
        .select('total_days')
        .eq('status', 'approved')
        .gte('start_date', startOfMonth),
      
      // Leave balance summary by type
      supabase
        .from('leave_balances')
        .select(`
          leave_type_id,
          entitled_days,
          used_days,
          available_days,
          leave_types(id, type_name)
        `)
        .eq('year', currentYear),
      
      // Employees with low leave balance (< 5 days)
      supabase
        .from('leave_balances')
        .select('employee_id')
        .eq('year', currentYear)
        .lt('available_days', 5),
      
      // Leave utilization (for rate calculation)
      supabase
        .from('leave_balances')
        .select('entitled_days, used_days')
        .eq('year', currentYear),
      
      // Late arrivals this month
      supabase
        .from('attendance_records')
        .select('id', { count: 'exact', head: true })
        .gte('attendance_date', startOfMonth)
        .lte('attendance_date', endOfMonth)
        .gt('late_minutes', 0),
      
      // Early departures this month
      supabase
        .from('attendance_records')
        .select('id', { count: 'exact', head: true })
        .gte('attendance_date', startOfMonth)
        .lte('attendance_date', endOfMonth)
        .gt('early_leave_minutes', 0),
      
      // Work hours for average calculation
      supabase
        .from('attendance_records')
        .select('work_hours')
        .gte('attendance_date', startOfMonth)
        .lte('attendance_date', endOfMonth)
        .gt('work_hours', 0),
      
      // Attendance by department this month
      supabase
        .from('attendance_records')
        .select(`
          status,
          late_minutes,
          employees!inner(department_id, departments(id, department_name))
        `)
        .gte('attendance_date', startOfMonth)
        .lte('attendance_date', endOfMonth),
      
      // Probation ending within 30 days
      supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('employment_type', 'probation')
        .eq('status', 'active')
        .gte('end_date', today)
        .lte('end_date', thirtyDaysFromNow),
      
      // Contract renewals due within 30 days
      supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('employment_type', 'contract')
        .eq('status', 'active')
        .gte('end_date', today)
        .lte('end_date', thirtyDaysFromNow),
      
      // Work anniversaries this month
      supabase
        .from('employees')
        .select('join_date')
        .eq('status', 'active')
        .not('join_date', 'is', null),
      
      // Resignations/terminations this month
      supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .in('status', RESIGNED_STATUSES)
        .gte('updated_at', startOfMonth),
      
      // Recent leave requests (5 most recent)
      supabase
        .from('leave_requests')
        .select(`
          id,
          status,
          start_date,
          end_date,
          total_days,
          created_at,
          employees!leave_requests_employee_id_fkey(full_name),
          leave_types(type_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Recent attendance corrections (5 most recent)
      supabase
        .from('attendance_records')
        .select(`
          id,
          attendance_date,
          correction_reason,
          updated_at,
          employees!attendance_records_employee_id_fkey(full_name)
        `)
        .eq('is_corrected', true)
        .order('updated_at', { ascending: false })
        .limit(5),
      
      // Active employees
      supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      
      // Total employees
      supabase
        .from('employees')
        .select('id', { count: 'exact', head: true }),
      
      // Attendance today
      supabase
        .from('attendance_records')
        .select('status')
        .eq('attendance_date', today),
      
      // Pending leave requests
      supabase
        .from('leave_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      
      // Approved leave for today
      supabase
        .from('leave_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today),
      
      // New hires this month
      supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .gte('join_date', startOfMonth)
        .eq('status', 'active'),
      
      // Upcoming birthdays (next 7 days)
      supabase
        .from('employees')
        .select('date_of_birth')
        .eq('status', 'active')
        .not('date_of_birth', 'is', null),
      
      // Expiring certifications (next 30 days)
      supabase
        .from('employee_skills')
        .select('id', { count: 'exact', head: true })
        .not('expiry_date', 'is', null)
        .gte('expiry_date', today)
        .lte('expiry_date', thirtyDaysFromNow),
    ])
    
    // Calculate total payroll this month
    let totalPayrollThisMonth = 0
    if (totalPayrollResult.data) {
      totalPayrollThisMonth = totalPayrollResult.data.reduce(
        (sum, record) => sum + (Number(record.gross_salary) || 0),
        0
      )
    }
    
    // Calculate payroll by department
    const departmentPayrollMap = new Map<string, { name: string; total: number; employees: Set<string> }>()
    if (payrollByDepartmentResult.data) {
      for (const record of payrollByDepartmentResult.data) {
        const employees = record.employees as { department_id: string; departments: { id: string; department_name: string } | null } | null
        const deptId = employees?.departments?.id || 'unknown'
        const deptName = employees?.departments?.department_name || 'Unknown Department'
        const employeeId = record.employee_id || ''
        
        if (!departmentPayrollMap.has(deptId)) {
          departmentPayrollMap.set(deptId, { name: deptName, total: 0, employees: new Set() })
        }
        
        const dept = departmentPayrollMap.get(deptId)!
        dept.total += Number(record.gross_salary) || 0
        if (employeeId) {
          dept.employees.add(employeeId)
        }
      }
    }
    
    const payrollByDepartment: PayrollByDepartment[] = Array.from(departmentPayrollMap.entries())
      .map(([deptId, data]) => ({
        departmentId: deptId,
        departmentName: data.name,
        totalPayroll: data.total,
        employeeCount: data.employees.size,
      }))
      .sort((a, b) => b.totalPayroll - a.totalPayroll)
    
    // Calculate overtime hours this month
    let overtimeHoursThisMonth = 0
    if (overtimeHoursResult.data) {
      overtimeHoursThisMonth = overtimeHoursResult.data.reduce(
        (sum, record) => sum + (Number(record.overtime_hours) || 0),
        0
      )
    }
    
    // Calculate leave days used this month
    let leaveDaysUsedThisMonth = 0
    if (leaveDaysUsedResult.data) {
      leaveDaysUsedThisMonth = leaveDaysUsedResult.data.reduce(
        (sum, record) => sum + (Number(record.total_days) || 0),
        0
      )
    }
    
    // Calculate leave balance summary by type
    const leaveTypeMap = new Map<string, { name: string; entitled: number; used: number; available: number }>()
    if (leaveBalanceSummaryResult.data) {
      for (const balance of leaveBalanceSummaryResult.data) {
        const leaveTypes = balance.leave_types as { id: string; type_name: string } | null
        const typeId = leaveTypes?.id || balance.leave_type_id || 'unknown'
        const typeName = leaveTypes?.type_name || 'Unknown Leave Type'
        
        if (!leaveTypeMap.has(typeId)) {
          leaveTypeMap.set(typeId, { name: typeName, entitled: 0, used: 0, available: 0 })
        }
        
        const type = leaveTypeMap.get(typeId)!
        type.entitled += Number(balance.entitled_days) || 0
        type.used += Number(balance.used_days) || 0
        type.available += Number(balance.available_days) || 0
      }
    }
    
    const leaveBalanceSummary: LeaveBalanceSummary[] = Array.from(leaveTypeMap.entries())
      .map(([typeId, data]) => ({
        leaveTypeId: typeId,
        leaveTypeName: data.name,
        totalEntitled: data.entitled,
        totalUsed: data.used,
        totalAvailable: data.available,
      }))
    
    // Count unique employees with low leave balance
    const employeesWithLowLeaveBalance = new Set(
      (lowLeaveBalanceResult.data || []).map(r => r.employee_id)
    ).size
    
    // Calculate leave utilization rate
    let leaveUtilizationRate = 0
    if (leaveUtilizationResult.data && leaveUtilizationResult.data.length > 0) {
      const totalEntitled = leaveUtilizationResult.data.reduce(
        (sum, r) => sum + (Number(r.entitled_days) || 0),
        0
      )
      const totalUsed = leaveUtilizationResult.data.reduce(
        (sum, r) => sum + (Number(r.used_days) || 0),
        0
      )
      if (totalEntitled > 0) {
        leaveUtilizationRate = Math.round((totalUsed / totalEntitled) * 100)
      }
    }
    
    // Calculate average work hours per day
    let averageWorkHoursPerDay = 0
    if (workHoursResult.data && workHoursResult.data.length > 0) {
      const totalWorkHours = workHoursResult.data.reduce(
        (sum, r) => sum + (Number(r.work_hours) || 0),
        0
      )
      averageWorkHoursPerDay = Math.round((totalWorkHours / workHoursResult.data.length) * 10) / 10
    }
    
    // Calculate attendance by department
    const deptAttendanceMap = new Map<string, { name: string; present: number; absent: number; late: number }>()
    if (attendanceByDepartmentResult.data) {
      for (const record of attendanceByDepartmentResult.data) {
        const employees = record.employees as { department_id: string; departments: { id: string; department_name: string } | null } | null
        const deptId = employees?.departments?.id || 'unknown'
        const deptName = employees?.departments?.department_name || 'Unknown Department'
        
        if (!deptAttendanceMap.has(deptId)) {
          deptAttendanceMap.set(deptId, { name: deptName, present: 0, absent: 0, late: 0 })
        }
        
        const dept = deptAttendanceMap.get(deptId)!
        if (record.status === 'present') {
          dept.present++
        } else if (record.status === 'absent') {
          dept.absent++
        }
        if ((record.late_minutes || 0) > 0) {
          dept.late++
        }
      }
    }
    
    const attendanceByDepartment: AttendanceByDepartment[] = Array.from(deptAttendanceMap.entries())
      .map(([deptId, data]) => ({
        departmentId: deptId,
        departmentName: data.name,
        presentCount: data.present,
        absentCount: data.absent,
        lateCount: data.late,
      }))
    
    // Calculate work anniversaries this month
    let workAnniversariesThisMonth = 0
    if (workAnniversariesResult.data) {
      workAnniversariesThisMonth = workAnniversariesResult.data.filter(emp => {
        if (!emp.join_date) return false
        const joinDate = new Date(emp.join_date)
        const joinMonth = joinDate.getMonth() + 1
        // Count if join month matches current month and they've been here at least 1 year
        return joinMonth === currentMonth && joinDate.getFullYear() < currentYear
      }).length
    }
    
    // Transform recent leave requests
    const recentLeaveRequests: RecentLeaveRequest[] = (recentLeaveRequestsResult.data || []).map(request => {
      const employees = request.employees as { full_name: string } | null
      const leaveTypes = request.leave_types as { type_name: string } | null
      return {
        id: request.id,
        employeeName: employees?.full_name || 'Unknown Employee',
        leaveTypeName: leaveTypes?.type_name || 'Unknown Leave Type',
        status: request.status || '',
        startDate: formatDate(request.start_date),
        endDate: formatDate(request.end_date),
        totalDays: Number(request.total_days) || 0,
        createdAt: formatDate(request.created_at),
      }
    })
    
    // Transform recent attendance corrections
    const recentAttendanceCorrections: RecentAttendanceCorrection[] = (recentAttendanceCorrectionsResult.data || []).map(record => {
      const employees = record.employees as { full_name: string } | null
      return {
        id: record.id,
        employeeName: employees?.full_name || 'Unknown Employee',
        attendanceDate: formatDate(record.attendance_date),
        correctionReason: record.correction_reason || '',
        updatedAt: formatDate(record.updated_at),
      }
    })
    
    // Calculate existing metrics (preserved)
    const activeEmployees = activeEmployeesResult.count || 0
    const totalEmployees = totalEmployeesResult.count || 0
    const inactiveEmployees = totalEmployees - activeEmployees
    
    // Attendance today metrics
    const attendanceData = attendanceTodayResult.data || []
    const presentToday = attendanceData.filter(a => a.status === 'present').length
    const absentToday = attendanceData.filter(a => a.status === 'absent').length
    const totalAttendanceToday = attendanceData.length
    const attendanceRate = totalAttendanceToday > 0
      ? Math.round((presentToday / totalAttendanceToday) * 100)
      : 0
    
    // Calculate upcoming birthdays (next 7 days)
    const todayDate = now.getDate()
    const upcomingBirthdays = (upcomingBirthdaysResult.data || []).filter(emp => {
      if (!emp.date_of_birth) return false
      const birthDate = new Date(emp.date_of_birth)
      const birthMonth = birthDate.getMonth() + 1
      const birthDay = birthDate.getDate()
      
      // Check if birthday is in next 7 days
      if (birthMonth === currentMonth) {
        return birthDay >= todayDate && birthDay <= todayDate + 7
      }
      return false
    }).length
    
    return {
      // Payroll Overview
      totalPayrollThisMonth,
      payrollByDepartment,
      overtimeHoursThisMonth,
      pendingPayrollAdjustments: pendingPayrollResult.count || 0,
      
      // Leave Balance Tracking
      leaveDaysUsedThisMonth,
      leaveBalanceSummary,
      employeesWithLowLeaveBalance,
      leaveUtilizationRate,
      
      // Attendance Analytics
      lateArrivalsThisMonth: lateArrivalsResult.count || 0,
      earlyDeparturesThisMonth: earlyDeparturesResult.count || 0,
      averageWorkHoursPerDay,
      attendanceByDepartment,
      
      // Employee Lifecycle
      probationEndingSoon: probationEndingResult.count || 0,
      contractRenewalsDue: contractRenewalsResult.count || 0,
      workAnniversariesThisMonth,
      resignationsThisMonth: resignationsResult.count || 0,
      
      // Recent Activity
      recentLeaveRequests,
      recentAttendanceCorrections,
      
      // Existing metrics (preserved)
      activeEmployees,
      inactiveEmployees,
      attendanceRate,
      presentToday,
      absentToday,
      pendingLeaveRequests: pendingLeaveRequestsResult.count || 0,
      approvedLeavesToday: approvedLeaveTodayResult.count || 0,
      newHiresThisMonth: newHiresResult.count || 0,
      upcomingBirthdays,
      expiringCertifications: expiringCertificationsResult.count || 0,
    }
  }, CACHE_TTL)
}
