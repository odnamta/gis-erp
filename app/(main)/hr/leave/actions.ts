'use server';

// =====================================================
// v0.30: HR - LEAVE MANAGEMENT - Server Actions
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  LeaveRequestFormData,
  LeaveRequestFilters,
} from '@/types/leave';
import { calculateWorkingDays, validateLeaveRequest, calculateCarryOver } from '@/lib/leave-utils';

// =====================================================
// Leave Types
// =====================================================

/**
 * Get all active leave types
 */
export async function getLeaveTypes(): Promise<LeaveType[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('leave_types')
    .select('*')
    .eq('is_active', true)
    .order('type_name');
  
  if (error) {
    console.error('Error fetching leave types:', error);
    throw new Error('Failed to fetch leave types');
  }
  
  return data || [];
}

/**
 * Get a single leave type by ID
 */
export async function getLeaveType(id: string): Promise<LeaveType | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('leave_types')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching leave type:', error);
    return null;
  }
  
  return data;
}

// =====================================================
// Leave Balances
// =====================================================

/**
 * Get leave balances for an employee
 */
export async function getLeaveBalances(
  employeeId: string,
  year?: number
): Promise<LeaveBalance[]> {
  const supabase = await createClient();
  const targetYear = year || new Date().getFullYear();
  
  const { data, error } = await supabase
    .from('leave_balances')
    .select(`
      *,
      leave_type:leave_types(*)
    `)
    .eq('employee_id', employeeId)
    .eq('year', targetYear);
  
  if (error) {
    console.error('Error fetching leave balances:', error);
    throw new Error('Failed to fetch leave balances');
  }
  
  return data || [];
}

/**
 * Get a specific leave balance
 */
export async function getLeaveBalance(
  employeeId: string,
  leaveTypeId: string,
  year?: number
): Promise<LeaveBalance | null> {
  const supabase = await createClient();
  const targetYear = year || new Date().getFullYear();
  
  const { data, error } = await supabase
    .from('leave_balances')
    .select(`
      *,
      leave_type:leave_types(*)
    `)
    .eq('employee_id', employeeId)
    .eq('leave_type_id', leaveTypeId)
    .eq('year', targetYear)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching leave balance:', error);
    return null;
  }
  
  return data;
}

/**
 * Initialize leave balances for an employee for a given year
 */
export async function initializeYearlyBalances(
  employeeId: string,
  year: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  try {
    // Get all active leave types
    const { data: leaveTypes, error: typesError } = await supabase
      .from('leave_types')
      .select('*')
      .eq('is_active', true);
    
    if (typesError) throw typesError;
    
    // Get previous year balances for carry-over calculation
    const { data: prevBalances } = await supabase
      .from('leave_balances')
      .select(`
        *,
        leave_type:leave_types(*)
      `)
      .eq('employee_id', employeeId)
      .eq('year', year - 1);
    
    const prevBalanceMap = new Map(
      prevBalances?.map(b => [b.leave_type_id, b]) || []
    );
    
    // Create balances for each leave type
    for (const leaveType of leaveTypes || []) {
      const prevBalance = prevBalanceMap.get(leaveType.id);
      let carriedOver = 0;
      
      // Calculate carry-over if applicable
      if (prevBalance && leaveType.allow_carry_over) {
        carriedOver = calculateCarryOver(prevBalance, leaveType);
      }
      
      // Upsert the balance
      const { error: upsertError } = await supabase
        .from('leave_balances')
        .upsert({
          employee_id: employeeId,
          leave_type_id: leaveType.id,
          year: year,
          entitled_days: leaveType.default_days_per_year,
          carried_over_days: carriedOver,
          used_days: 0,
          pending_days: 0,
        }, {
          onConflict: 'employee_id,leave_type_id,year',
        });
      
      if (upsertError) throw upsertError;
    }
    
    revalidatePath('/hr/leave');
    revalidatePath('/hr/my-leave');
    
    return { success: true };
  } catch (error) {
    console.error('Error initializing yearly balances:', error);
    return { success: false, error: 'Failed to initialize leave balances' };
  }
}

// =====================================================
// Leave Requests
// =====================================================

/**
 * Get holidays for working days calculation
 */
async function getHolidays(year: number): Promise<string[]> {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('holidays')
    .select('date')
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`);
  
  return data?.map(h => h.date) || [];
}

/**
 * Submit a new leave request
 */
export async function submitLeaveRequest(
  employeeId: string,
  data: LeaveRequestFormData
): Promise<{ success: boolean; data?: LeaveRequest; error?: string }> {
  const supabase = await createClient();
  
  try {
    // Get leave type
    const leaveType = await getLeaveType(data.leave_type_id);
    if (!leaveType) {
      return { success: false, error: 'Invalid leave type' };
    }
    
    // Get current balance
    const year = new Date(data.start_date).getFullYear();
    const balance = await getLeaveBalance(employeeId, data.leave_type_id, year);
    
    // Get holidays for working days calculation
    const holidays = await getHolidays(year);
    
    // Validate the request
    const validation = validateLeaveRequest(data, leaveType, balance, holidays);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join('. ') };
    }
    
    // Calculate total days
    let totalDays: number;
    if (data.is_half_day) {
      totalDays = 0.5;
    } else {
      totalDays = calculateWorkingDays(data.start_date, data.end_date, holidays);
    }
    
    // Create the request
    const { data: request, error: insertError } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: employeeId,
        leave_type_id: data.leave_type_id,
        start_date: data.start_date,
        end_date: data.end_date,
        total_days: totalDays,
        is_half_day: data.is_half_day,
        half_day_type: data.half_day_type,
        reason: data.reason,
        emergency_contact: data.emergency_contact,
        handover_to: data.handover_to || null,
        handover_notes: data.handover_notes,
        attachment_url: data.attachment_url,
        status: 'pending',
      })
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    // Update pending days in balance
    if (balance) {
      const { error: updateError } = await supabase
        .from('leave_balances')
        .update({
          pending_days: balance.pending_days + totalDays,
        })
        .eq('id', balance.id);
      
      if (updateError) throw updateError;
    }
    
    // Get employee info for notification
    const { data: employee } = await supabase
      .from('employees')
      .select('full_name, reporting_to')
      .eq('id', employeeId)
      .single();
    
    // Send notification to manager
    if (employee?.reporting_to) {
      const { data: manager } = await supabase
        .from('employees')
        .select('user_id')
        .eq('id', employee.reporting_to)
        .single();
      
      if (manager?.user_id) {
        await supabase.from('notifications').insert({
          user_id: manager.user_id,
          title: 'Leave Request Pending',
          message: `${employee.full_name} has requested ${totalDays} days of ${leaveType.type_name}.`,
          type: 'approval',
          entity_type: 'leave_request',
          entity_id: request.id,
        });
      }
    }
    
    revalidatePath('/hr/leave');
    revalidatePath('/hr/my-leave');
    
    return { success: true, data: request };
  } catch (error) {
    console.error('Error submitting leave request:', error);
    return { success: false, error: 'Failed to submit leave request' };
  }
}

/**
 * Approve a leave request
 */
export async function approveLeaveRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  try {
    // Get the request
    const { data: request, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (request.status !== 'pending') {
      return { success: false, error: 'Request is not pending' };
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Update request status
    const { error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', requestId);
    
    if (updateError) throw updateError;
    
    // Update balance: move from pending to used
    const year = new Date(request.start_date).getFullYear();
    const { data: balance } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', request.employee_id)
      .eq('leave_type_id', request.leave_type_id)
      .eq('year', year)
      .single();
    
    if (balance) {
      const { error: balanceError } = await supabase
        .from('leave_balances')
        .update({
          pending_days: balance.pending_days - request.total_days,
          used_days: balance.used_days + request.total_days,
        })
        .eq('id', balance.id);
      
      if (balanceError) throw balanceError;
    }
    
    // Mark attendance records as leave
    await markAttendanceAsLeave(
      request.employee_id,
      request.start_date,
      request.end_date,
      request.leave_type_id
    );
    
    // Notify employee
    const { data: employee } = await supabase
      .from('employees')
      .select('user_id')
      .eq('id', request.employee_id)
      .single();
    
    if (employee?.user_id) {
      await supabase.from('notifications').insert({
        user_id: employee.user_id,
        title: 'Leave Approved',
        message: `Your leave request from ${request.start_date} to ${request.end_date} has been approved.`,
        type: 'info',
        entity_type: 'leave_request',
        entity_id: requestId,
      });
    }
    
    revalidatePath('/hr/leave');
    revalidatePath('/hr/my-leave');
    
    return { success: true };
  } catch (error) {
    console.error('Error approving leave request:', error);
    return { success: false, error: 'Failed to approve leave request' };
  }
}

/**
 * Reject a leave request
 */
export async function rejectLeaveRequest(
  requestId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  if (!reason || reason.trim() === '') {
    return { success: false, error: 'Rejection reason is required' };
  }
  
  try {
    // Get the request
    const { data: request, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (request.status !== 'pending') {
      return { success: false, error: 'Request is not pending' };
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Update request status
    const { error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', requestId);
    
    if (updateError) throw updateError;
    
    // Return pending days to available
    const year = new Date(request.start_date).getFullYear();
    const { data: balance } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', request.employee_id)
      .eq('leave_type_id', request.leave_type_id)
      .eq('year', year)
      .single();
    
    if (balance) {
      const { error: balanceError } = await supabase
        .from('leave_balances')
        .update({
          pending_days: balance.pending_days - request.total_days,
        })
        .eq('id', balance.id);
      
      if (balanceError) throw balanceError;
    }
    
    // Notify employee
    const { data: employee } = await supabase
      .from('employees')
      .select('user_id')
      .eq('id', request.employee_id)
      .single();
    
    if (employee?.user_id) {
      await supabase.from('notifications').insert({
        user_id: employee.user_id,
        title: 'Leave Rejected',
        message: `Your leave request has been rejected. Reason: ${reason}`,
        type: 'warning',
        entity_type: 'leave_request',
        entity_id: requestId,
      });
    }
    
    revalidatePath('/hr/leave');
    revalidatePath('/hr/my-leave');
    
    return { success: true };
  } catch (error) {
    console.error('Error rejecting leave request:', error);
    return { success: false, error: 'Failed to reject leave request' };
  }
}

/**
 * Cancel a leave request
 */
export async function cancelLeaveRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  try {
    // Get the request
    const { data: request, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (request.status !== 'pending') {
      return { success: false, error: 'Only pending requests can be cancelled' };
    }
    
    // Update request status
    const { error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: 'cancelled',
      })
      .eq('id', requestId);
    
    if (updateError) throw updateError;
    
    // Return pending days to available
    const year = new Date(request.start_date).getFullYear();
    const { data: balance } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', request.employee_id)
      .eq('leave_type_id', request.leave_type_id)
      .eq('year', year)
      .single();
    
    if (balance) {
      const { error: balanceError } = await supabase
        .from('leave_balances')
        .update({
          pending_days: balance.pending_days - request.total_days,
        })
        .eq('id', balance.id);
      
      if (balanceError) throw balanceError;
    }
    
    revalidatePath('/hr/leave');
    revalidatePath('/hr/my-leave');
    
    return { success: true };
  } catch (error) {
    console.error('Error cancelling leave request:', error);
    return { success: false, error: 'Failed to cancel leave request' };
  }
}

/**
 * Mark attendance records as leave for approved requests
 */
async function markAttendanceAsLeave(
  employeeId: string,
  startDate: string,
  endDate: string,
  leaveTypeId: string
): Promise<void> {
  const supabase = await createClient();
  
  // Get leave type name
  const { data: leaveType } = await supabase
    .from('leave_types')
    .select('type_name')
    .eq('id', leaveTypeId)
    .single();
  
  // Get all dates in range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Skip weekends
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = current.toISOString().split('T')[0];
      
      // Upsert attendance record
      await supabase
        .from('attendance_records')
        .upsert({
          employee_id: employeeId,
          date: dateStr,
          status: 'leave',
          notes: leaveType?.type_name || 'Leave',
        }, {
          onConflict: 'employee_id,date',
        });
    }
    current.setDate(current.getDate() + 1);
  }
}

// =====================================================
// Query Operations
// =====================================================

/**
 * Get leave requests with filters
 */
export async function getLeaveRequests(
  filters?: LeaveRequestFilters
): Promise<LeaveRequest[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('leave_requests')
    .select(`
      *,
      employee:employees(id, full_name, department, user_id),
      leave_type:leave_types(*),
      handover_employee:employees!leave_requests_handover_to_fkey(id, full_name)
    `)
    .order('created_at', { ascending: false });
  
  if (filters?.employee_id) {
    query = query.eq('employee_id', filters.employee_id);
  }
  
  if (filters?.leave_type_id) {
    query = query.eq('leave_type_id', filters.leave_type_id);
  }
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters?.start_date) {
    query = query.gte('start_date', filters.start_date);
  }
  
  if (filters?.end_date) {
    query = query.lte('end_date', filters.end_date);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching leave requests:', error);
    throw new Error('Failed to fetch leave requests');
  }
  
  return data || [];
}

/**
 * Get employee's own leave requests
 */
export async function getMyLeaveRequests(
  employeeId: string
): Promise<LeaveRequest[]> {
  return getLeaveRequests({ employee_id: employeeId });
}

/**
 * Get count of pending requests
 */
export async function getPendingRequestsCount(): Promise<number> {
  const supabase = await createClient();
  
  const { count, error } = await supabase
    .from('leave_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  if (error) {
    console.error('Error fetching pending count:', error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Get a single leave request by ID
 */
export async function getLeaveRequest(id: string): Promise<LeaveRequest | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('leave_requests')
    .select(`
      *,
      employee:employees(id, full_name, department, user_id),
      leave_type:leave_types(*),
      handover_employee:employees!leave_requests_handover_to_fkey(id, full_name)
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching leave request:', error);
    return null;
  }
  
  return data;
}

/**
 * Get all employees for dropdown selection
 */
export async function getEmployeesForSelect(): Promise<{ id: string; full_name: string; department: string }[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('employees')
    .select('id, full_name, department')
    .eq('is_active', true)
    .order('full_name');
  
  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get current employee ID from user
 */
export async function getCurrentEmployeeId(): Promise<string | null> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single();
  
  return employee?.id || null;
}
