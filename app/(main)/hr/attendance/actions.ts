'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  AttendanceRecord,
  AttendanceRecordInput,
  AttendanceSummary,
  MonthlySummary,
  AttendanceFilters,
  AttendanceStatus,
} from '@/types/attendance';

/**
 * Get attendance records with filters
 */
export async function getAttendanceRecords(
  filters: AttendanceFilters
): Promise<{ data: AttendanceRecord[] | null; error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from('attendance_records')
    .select(`
      *,
      employee:employees(
        id,
        employee_code,
        full_name,
        department_id,
        department:departments(id, department_name)
      )
    `)
    .order('attendance_date', { ascending: false });

  // Filter by specific date
  if (filters.date) {
    query = query.eq('attendance_date', filters.date);
  }

  // Filter by date range
  if (filters.dateFrom) {
    query = query.gte('attendance_date', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('attendance_date', filters.dateTo);
  }

  // Filter by employee
  if (filters.employeeId) {
    query = query.eq('employee_id', filters.employeeId);
  }

  // Filter by status
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching attendance records:', error);
    return { data: null, error: error.message };
  }

  // Post-filter by department if needed (due to nested filter limitation)
  let filteredData = data as AttendanceRecord[];
  if (filters.departmentId) {
    filteredData = filteredData.filter(
      (r) => r.employee?.department_id === filters.departmentId
    );
  }

  return { data: filteredData, error: null };
}

/**
 * Get attendance summary for a specific date
 */
export async function getAttendanceSummary(
  date: string
): Promise<{ data: AttendanceSummary | null; error: string | null }> {
  const supabase = await createClient();

  // Get total active employees
  const { count: totalEmployees } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  // Get attendance records for the date
  const { data: records, error } = await supabase
    .from('attendance_records')
    .select('status')
    .eq('attendance_date', date);

  if (error) {
    console.error('Error fetching attendance summary:', error);
    return { data: null, error: error.message };
  }

  const statusCounts = {
    present: 0,
    late: 0,
    absent: 0,
    onLeave: 0,
    holiday: 0,
  };

  for (const record of records || []) {
    switch (record.status) {
      case 'present':
        statusCounts.present++;
        break;
      case 'late':
        statusCounts.late++;
        break;
      case 'absent':
        statusCounts.absent++;
        break;
      case 'on_leave':
        statusCounts.onLeave++;
        break;
      case 'holiday':
        statusCounts.holiday++;
        break;
    }
  }

  // Calculate absent (employees without any record, excluding on_leave and holiday)
  const recordedCount = records?.length || 0;
  const accountedFor = statusCounts.present + statusCounts.late + statusCounts.absent + statusCounts.onLeave + statusCounts.holiday;
  statusCounts.absent = Math.max(0, (totalEmployees || 0) - accountedFor);

  return {
    data: {
      total: totalEmployees || 0,
      ...statusCounts,
    },
    error: null,
  };
}

/**
 * Create or update attendance record (admin/manual entry)
 */
export async function upsertAttendanceRecord(
  data: AttendanceRecordInput
): Promise<{ success: boolean; record?: AttendanceRecord; error?: string }> {
  const supabase = await createClient();

  // Validate required fields
  if (!data.employee_id) {
    return { success: false, error: 'Employee is required' };
  }
  if (!data.attendance_date) {
    return { success: false, error: 'Date is required' };
  }

  // Validate clock times if both provided
  if (data.clock_in && data.clock_out) {
    const clockIn = new Date(data.clock_in);
    const clockOut = new Date(data.clock_out);
    if (clockOut <= clockIn) {
      return { success: false, error: 'Clock-out time must be after clock-in time' };
    }
  }

  // Get current user for correction tracking
  const { data: { user } } = await supabase.auth.getUser();
  let correctedBy = null;
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    correctedBy = profile?.id;
  }

  // Check if record exists
  const { data: existing } = await supabase
    .from('attendance_records')
    .select('id')
    .eq('employee_id', data.employee_id)
    .eq('attendance_date', data.attendance_date)
    .single();

  const recordData = {
    employee_id: data.employee_id,
    attendance_date: data.attendance_date,
    clock_in: data.clock_in || null,
    clock_out: data.clock_out || null,
    status: data.status || 'present',
    late_minutes: data.late_minutes || 0,
    early_leave_minutes: data.early_leave_minutes || 0,
    notes: data.notes || null,
    is_corrected: existing ? true : data.is_corrected || false,
    corrected_by: existing ? correctedBy : data.corrected_by || null,
    correction_reason: data.correction_reason || null,
    updated_at: new Date().toISOString(),
  };

  const { data: record, error } = await supabase
    .from('attendance_records')
    .upsert(recordData, {
      onConflict: 'employee_id,attendance_date',
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting attendance record:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr/attendance');
  revalidatePath('/hr/my-attendance');

  return { success: true, record: record as AttendanceRecord };
}

/**
 * Mark employee as absent
 */
export async function markAbsent(
  employeeId: string,
  date: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('attendance_records')
    .upsert({
      employee_id: employeeId,
      attendance_date: date,
      status: 'absent',
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'employee_id,attendance_date',
    });

  if (error) {
    console.error('Error marking absent:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr/attendance');

  return { success: true };
}

/**
 * Get monthly attendance summary for an employee
 */
export async function getMonthlyAttendanceSummary(
  employeeId: string,
  year: number,
  month: number
): Promise<{ data: MonthlySummary | null; error: string | null }> {
  const supabase = await createClient();

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data: records, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate);

  if (error) {
    console.error('Error fetching monthly summary:', error);
    return { data: null, error: error.message };
  }

  const summary: MonthlySummary = {
    daysWorked: 0,
    lateDays: 0,
    totalHours: 0,
    overtimeHours: 0,
    absentDays: 0,
  };

  for (const record of records || []) {
    if (['present', 'late'].includes(record.status || '')) {
      summary.daysWorked++;
      summary.totalHours += Number(record.work_hours) || 0;
      summary.overtimeHours += Number(record.overtime_hours) || 0;
    }
    if (record.status === 'late') {
      summary.lateDays++;
    }
    if (record.status === 'absent') {
      summary.absentDays++;
    }
  }

  // Round hours to 2 decimal places
  summary.totalHours = Math.round(summary.totalHours * 100) / 100;
  summary.overtimeHours = Math.round(summary.overtimeHours * 100) / 100;

  return { data: summary, error: null };
}

/**
 * Get attendance records for an employee in a month (for calendar view)
 */
export async function getMonthlyAttendanceRecords(
  employeeId: string,
  year: number,
  month: number
): Promise<{ data: AttendanceRecord[] | null; error: string | null }> {
  const supabase = await createClient();

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate)
    .order('attendance_date');

  if (error) {
    console.error('Error fetching monthly records:', error);
    return { data: null, error: error.message };
  }

  return { data: data as AttendanceRecord[], error: null };
}

/**
 * Get all employees with their attendance for a date (admin view)
 */
export async function getEmployeesWithAttendance(
  date: string,
  departmentId?: string
): Promise<{
  data: Array<{
    employee: {
      id: string;
      employee_code: string;
      full_name: string;
      department_id: string | null;
      department_name: string | null;
    };
    attendance: AttendanceRecord | null;
  }> | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // Get all active employees
  let employeeQuery = supabase
    .from('employees')
    .select(`
      id,
      employee_code,
      full_name,
      department_id,
      department:departments(department_name)
    `)
    .eq('status', 'active')
    .order('employee_code');

  if (departmentId) {
    employeeQuery = employeeQuery.eq('department_id', departmentId);
  }

  const { data: employees, error: empError } = await employeeQuery;

  if (empError) {
    console.error('Error fetching employees:', empError);
    return { data: null, error: empError.message };
  }

  // Get attendance records for the date
  const { data: attendanceRecords, error: attError } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('attendance_date', date);

  if (attError) {
    console.error('Error fetching attendance:', attError);
    return { data: null, error: attError.message };
  }

  // Map attendance to employees
  const attendanceMap = new Map<string, AttendanceRecord>();
  for (const record of attendanceRecords || []) {
    attendanceMap.set(record.employee_id, record as AttendanceRecord);
  }

  const result = (employees || []).map((emp) => ({
    employee: {
      id: emp.id,
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      department_id: emp.department_id,
      department_name: (emp.department as { department_name: string } | null)?.department_name || null,
    },
    attendance: attendanceMap.get(emp.id) || null,
  }));

  return { data: result, error: null };
}

/**
 * Delete attendance record (admin only)
 */
export async function deleteAttendanceRecord(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('attendance_records')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting attendance record:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr/attendance');

  return { success: true };
}
