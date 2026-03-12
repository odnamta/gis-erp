'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrFetch, generateCacheKey } from '@/lib/dashboard-cache'

export interface HRDashboardMetrics {
  // Employee metrics
  totalEmployees: number
  activeEmployees: number
  inactiveEmployees: number

  // Attendance metrics
  attendanceToday: number
  attendanceRate: number
  presentToday: number
  absentToday: number

  // Leave metrics
  pendingLeaveRequests: number
  approvedLeavesToday: number

  // Skills/Training metrics
  employeesWithSkills: number
  skillCoverageRate: number
  expiringCertifications: number

  // Quick stats
  newHiresThisMonth: number
  upcomingBirthdays: number
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getHRDashboardMetrics(): Promise<HRDashboardMetrics> {
  const cacheKey = await generateCacheKey('hr-dashboard-metrics', 'hr')

  return getOrFetch(cacheKey, async () => {
    const supabase = await createClient()
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfNextWeek = new Date(today)
    startOfNextWeek.setDate(today.getDate() + 7)

    // Run all queries in parallel for performance
    const [
      totalEmployeesResult,
      activeEmployeesResult,
      attendanceTodayResult,
      pendingLeaveResult,
      approvedLeaveTodayResult,
      employeeSkillsResult,
      expiringCertsResult,
      newHiresResult,
      upcomingBirthdaysResult,
    ] = await Promise.all([
      // Total employees (including inactive)
      supabase
        .from('employees')
        .select('id', { count: 'exact', head: true }),

      // Active employees only
      supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),

      // Attendance today
      supabase
        .from('attendance_records')
        .select('status')
        .eq('attendance_date', todayStr),

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
        .lte('start_date', todayStr)
        .gte('end_date', todayStr),

      // Employees with skills assigned
      supabase
        .from('employee_skills')
        .select('employee_id')
        .not('employee_id', 'is', null),

      // Expiring certifications (next 30 days)
      supabase
        .from('employee_skills')
        .select('id', { count: 'exact', head: true })
        .not('expiry_date', 'is', null)
        .gte('expiry_date', todayStr)
        .lte('expiry_date', new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),

      // New hires this month
      supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .gte('hire_date', startOfMonth.toISOString().split('T')[0])
        .eq('status', 'active'),

      // Upcoming birthdays (next 7 days)
      supabase
        .from('employees')
        .select('date_of_birth')
        .eq('status', 'active')
        .not('date_of_birth', 'is', null),
    ])

    // Calculate attendance metrics
    const attendanceData = attendanceTodayResult.data || []
    const presentToday = attendanceData.filter(a => a.status === 'present').length
    const totalAttendanceToday = attendanceData.length
    const attendanceRate = totalAttendanceToday > 0
      ? Math.round((presentToday / totalAttendanceToday) * 100)
      : 0
    const absentToday = attendanceData.filter(a => a.status === 'absent').length

    // Calculate unique employees with skills
    const uniqueEmployeesWithSkills = new Set(
      (employeeSkillsResult.data || []).map(es => es.employee_id)
    ).size

    const activeCount = activeEmployeesResult.count || 0
    const skillCoverageRate = activeCount > 0
      ? Math.round((uniqueEmployeesWithSkills / activeCount) * 100)
      : 0

    // Calculate upcoming birthdays
    const todayMonth = today.getMonth() + 1
    const todayDate = today.getDate()
    const _nextWeekDate = startOfNextWeek.getDate()

    const upcomingBirthdays = (upcomingBirthdaysResult.data || []).filter(emp => {
      if (!emp.date_of_birth) return false
      const birthDate = new Date(emp.date_of_birth)
      const birthMonth = birthDate.getMonth() + 1
      const birthDay = birthDate.getDate()

      // Check if birthday is in next 7 days
      if (birthMonth === todayMonth) {
        return birthDay >= todayDate && birthDay <= todayDate + 7
      }
      return false
    }).length

    return {
      totalEmployees: totalEmployeesResult.count || 0,
      activeEmployees: activeCount,
      inactiveEmployees: (totalEmployeesResult.count || 0) - activeCount,
      attendanceToday: totalAttendanceToday,
      attendanceRate,
      presentToday,
      absentToday,
      pendingLeaveRequests: pendingLeaveResult.count || 0,
      approvedLeavesToday: approvedLeaveTodayResult.count || 0,
      employeesWithSkills: uniqueEmployeesWithSkills,
      skillCoverageRate,
      expiringCertifications: expiringCertsResult.count || 0,
      newHiresThisMonth: newHiresResult.count || 0,
      upcomingBirthdays,
    }
  }, CACHE_TTL)
}
