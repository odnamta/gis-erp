'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { AttendanceRecord, AttendanceStatus, WorkSchedule } from '@/types/attendance';
import { calculateLateMinutes, determineAttendanceStatus, getTodayDateString } from '@/lib/attendance-utils';
import { parseTimeString } from '@/lib/attendance-utils';

/**
 * Get the current user's employee record
 */
async function getCurrentEmployee() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { employee: null, error: 'Not authenticated' };
  }
  
  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  
  if (!profile) {
    return { employee: null, error: 'User profile not found' };
  }
  
  // Get employee linked to this user profile
  const { data: employee, error } = await supabase
    .from('employees')
    .select('id, employee_code, full_name, schedule_id, department_id')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .single();
  
  if (error || !employee) {
    return { employee: null, error: 'Employee record not found' };
  }
  
  return { employee, error: null };
}

/**
 * Get employee's work schedule (or default if not assigned)
 */
async function getEmployeeSchedule(employeeScheduleId: string | null): Promise<WorkSchedule | null> {
  const supabase = await createClient();
  
  if (employeeScheduleId) {
    const { data } = await supabase
      .from('work_schedules')
      .select('*')
      .eq('id', employeeScheduleId)
      .eq('is_active', true)
      .single();
    
    if (data) return data as WorkSchedule;
  }
  
  // Get default schedule
  const { data: defaultSchedule } = await supabase
    .from('work_schedules')
    .select('*')
    .eq('is_default', true)
    .eq('is_active', true)
    .single();
  
  return defaultSchedule as WorkSchedule | null;
}

/**
 * Clock in for current user
 */
export async function clockIn(location?: string): Promise<{
  success: boolean;
  record?: AttendanceRecord;
  error?: string;
}> {
  const supabase = await createClient();
  
  // Get current employee
  const { employee, error: empError } = await getCurrentEmployee();
  if (!employee) {
    return { success: false, error: empError || 'Employee not found' };
  }
  
  const today = getTodayDateString();
  const now = new Date();
  
  // Check if already clocked in today
  const { data: existing } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employee.id)
    .eq('attendance_date', today)
    .single();
  
  if (existing?.clock_in) {
    return {
      success: false,
      error: `You have already clocked in today at ${new Date(existing.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
    };
  }
  
  // Get schedule to determine if late
  const schedule = await getEmployeeSchedule(employee.schedule_id);
  if (!schedule) {
    return { success: false, error: 'No work schedule configured' };
  }
  
  // Calculate late status
  const clockInTime = parseTimeString(
    `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
    now
  );
  const lateMinutes = calculateLateMinutes(clockInTime, schedule);
  const status: AttendanceStatus = lateMinutes > 0 ? 'late' : 'present';
  
  // Create or update attendance record
  const { data, error } = await supabase
    .from('attendance_records')
    .upsert({
      employee_id: employee.id,
      attendance_date: today,
      clock_in: now.toISOString(),
      clock_in_location: location || null,
      status,
      late_minutes: lateMinutes,
    }, {
      onConflict: 'employee_id,attendance_date',
    })
    .select()
    .single();
  
  if (error) {
    return { success: false, error: 'Failed to record clock-in. Please try again.' };
  }
  
  revalidatePath('/hr/attendance');
  revalidatePath('/hr/my-attendance');
  revalidatePath('/dashboard');
  
  return { success: true, record: data as AttendanceRecord };
}

/**
 * Clock out for current user
 */
export async function clockOut(location?: string): Promise<{
  success: boolean;
  record?: AttendanceRecord;
  error?: string;
}> {
  const supabase = await createClient();
  
  // Get current employee
  const { employee, error: empError } = await getCurrentEmployee();
  if (!employee) {
    return { success: false, error: empError || 'Employee not found' };
  }
  
  const today = getTodayDateString();
  const now = new Date();
  
  // Check if clocked in today
  const { data: existing } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employee.id)
    .eq('attendance_date', today)
    .single();
  
  if (!existing?.clock_in) {
    return { success: false, error: 'You must clock in before clocking out' };
  }
  
  if (existing.clock_out) {
    return {
      success: false,
      error: `You have already clocked out today at ${new Date(existing.clock_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
    };
  }
  
  // Update with clock out time (work_hours calculated by trigger)
  const { data, error } = await supabase
    .from('attendance_records')
    .update({
      clock_out: now.toISOString(),
      clock_out_location: location || null,
      updated_at: now.toISOString(),
    })
    .eq('id', existing.id)
    .select()
    .single();
  
  if (error) {
    return { success: false, error: 'Failed to record clock-out. Please try again.' };
  }
  
  revalidatePath('/hr/attendance');
  revalidatePath('/hr/my-attendance');
  revalidatePath('/dashboard');
  
  return { success: true, record: data as AttendanceRecord };
}

/**
 * Get today's attendance for current user
 */
export async function getTodayAttendance(): Promise<AttendanceRecord | null> {
  const supabase = await createClient();
  
  // Get current employee
  const { employee } = await getCurrentEmployee();
  if (!employee) {
    return null;
  }
  
  const today = getTodayDateString();
  
  const { data } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employee.id)
    .eq('attendance_date', today)
    .single();
  
  return data as AttendanceRecord | null;
}

/**
 * Get today's attendance for a specific employee (admin use)
 */
export async function getTodayAttendanceForEmployee(
  employeeId: string
): Promise<AttendanceRecord | null> {
  const supabase = await createClient();
  const today = getTodayDateString();
  
  const { data } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('attendance_date', today)
    .single();
  
  return data as AttendanceRecord | null;
}

/**
 * Get current employee info (for widget display)
 */
export async function getCurrentEmployeeInfo(): Promise<{
  id: string;
  employee_code: string;
  full_name: string;
} | null> {
  const { employee } = await getCurrentEmployee();
  if (!employee) return null;
  
  return {
    id: employee.id,
    employee_code: employee.employee_code,
    full_name: employee.full_name,
  };
}
