// =====================================================
// v0.30: HR - LEAVE MANAGEMENT - Utility Functions
// =====================================================

import {
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  LeaveRequestFormData,
  LeaveValidationResult,
  FormattedLeaveRequest,
} from '@/types/leave';
import { format, parseISO, differenceInDays, isWeekend, eachDayOfInterval, isSameDay } from 'date-fns';

/**
 * Calculate working days between two dates (excluding weekends and holidays)
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - End date string (YYYY-MM-DD)
 * @param holidays - Array of holiday date strings (YYYY-MM-DD)
 * @returns Number of working days
 */
export function calculateWorkingDays(
  startDate: string,
  endDate: string,
  holidays: string[] = []
): number {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  // Handle invalid date range
  if (end < start) {
    return 0;
  }

  // Get all days in the range
  const allDays = eachDayOfInterval({ start, end });

  // Convert holidays to Date objects for comparison
  const holidayDates = holidays.map(h => parseISO(h));

  // Count working days (not weekend and not holiday)
  const workingDays = allDays.filter(day => {
    // Skip weekends
    if (isWeekend(day)) {
      return false;
    }
    // Skip holidays
    if (holidayDates.some(holiday => isSameDay(day, holiday))) {
      return false;
    }
    return true;
  });

  return workingDays.length;
}

/**
 * Check if a date is a working day
 * @param date - Date to check
 * @param holidays - Array of holiday date strings
 * @returns True if working day
 */
export function isWorkingDay(date: Date, holidays: string[] = []): boolean {
  if (isWeekend(date)) {
    return false;
  }
  const holidayDates = holidays.map(h => parseISO(h));
  return !holidayDates.some(holiday => isSameDay(date, holiday));
}

/**
 * Get all dates between start and end (inclusive)
 * @param startDate - Start date string
 * @param endDate - End date string
 * @returns Array of date strings
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (end < start) {
    return [];
  }

  const days = eachDayOfInterval({ start, end });
  return days.map(day => format(day, 'yyyy-MM-dd'));
}

/**
 * Validate a leave request before submission
 * @param data - Leave request form data
 * @param leaveType - Leave type configuration
 * @param balance - Current leave balance
 * @param holidays - Array of holiday date strings
 * @returns Validation result with errors
 */
export function validateLeaveRequest(
  data: LeaveRequestFormData,
  leaveType: LeaveType,
  balance: LeaveBalance | null,
  holidays: string[] = []
): LeaveValidationResult {
  const errors: string[] = [];

  // Validate date range
  const startDate = parseISO(data.start_date);
  const endDate = parseISO(data.end_date);

  if (endDate < startDate) {
    errors.push('End date must be on or after start date');
  }

  // Calculate total days
  let totalDays: number;
  if (data.is_half_day) {
    totalDays = 0.5;
    // Validate half day type is provided
    if (!data.half_day_type) {
      errors.push('Please select morning or afternoon for half-day leave');
    }
  } else {
    totalDays = calculateWorkingDays(data.start_date, data.end_date, holidays);
  }

  // Validate sufficient balance
  if (balance) {
    if (balance.available_days < totalDays) {
      errors.push(`Insufficient leave balance. Available: ${balance.available_days} days`);
    }
  } else if (leaveType.default_days_per_year > 0) {
    // No balance record exists - might need initialization
    errors.push('Leave balance not initialized for this year');
  }

  // Validate advance notice
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysInAdvance = differenceInDays(startDate, today);

  if (daysInAdvance < leaveType.min_days_advance) {
    errors.push(
      `Leave must be requested at least ${leaveType.min_days_advance} days in advance`
    );
  }

  // Validate attachment requirement
  if (leaveType.requires_attachment && !data.attachment_url) {
    errors.push(`${leaveType.type_name} requires an attachment (e.g., medical certificate)`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate carry-over days for year transition
 * @param balance - Previous year balance
 * @param leaveType - Leave type configuration
 * @returns Number of days to carry over
 */
export function calculateCarryOver(
  balance: LeaveBalance,
  leaveType: LeaveType
): number {
  if (!leaveType.allow_carry_over) {
    return 0;
  }

  const unusedDays = balance.entitled_days + balance.carried_over_days - balance.used_days;
  return Math.min(Math.max(0, unusedDays), leaveType.max_carry_over_days);
}

/**
 * Format leave request for display
 * @param request - Leave request with joined relations
 * @returns Formatted leave request
 */
export function formatLeaveRequest(request: LeaveRequest): FormattedLeaveRequest {
  const startDate = parseISO(request.start_date);
  const endDate = parseISO(request.end_date);

  let dateRange: string;
  if (request.start_date === request.end_date) {
    dateRange = format(startDate, 'd MMM yyyy');
    if (request.is_half_day) {
      dateRange += ` (${request.half_day_type})`;
    }
  } else {
    dateRange = `${format(startDate, 'd MMM')} - ${format(endDate, 'd MMM yyyy')}`;
  }

  return {
    ...request,
    employee_name: request.employee?.full_name || 'Unknown',
    department: request.employee?.department || 'Unknown',
    leave_type_name: request.leave_type?.type_name || 'Unknown',
    date_range: dateRange,
    handover_name: request.handover_employee?.full_name,
  };
}

/**
 * Get status display properties
 * @param status - Leave request status
 * @returns Display properties for the status
 */
export function getLeaveStatusDisplay(status: string): {
  label: string;
  color: string;
  icon: string;
} {
  switch (status) {
    case 'pending':
      return { label: 'Pending', color: 'yellow', icon: '⏳' };
    case 'approved':
      return { label: 'Approved', color: 'green', icon: '✅' };
    case 'rejected':
      return { label: 'Rejected', color: 'red', icon: '❌' };
    case 'cancelled':
      return { label: 'Cancelled', color: 'gray', icon: '🚫' };
    default:
      return { label: status, color: 'gray', icon: '❓' };
  }
}

/**
 * Format days display (handles half days)
 * @param days - Number of days
 * @returns Formatted string
 */
export function formatDays(days: number): string {
  if (days === 0.5) {
    return '½ day';
  }
  if (days === 1) {
    return '1 day';
  }
  if (days % 1 === 0.5) {
    return `${Math.floor(days)}½ days`;
  }
  return `${days} days`;
}

/**
 * Check if a leave request can be cancelled
 * @param request - Leave request
 * @param currentUserId - Current user's employee ID
 * @returns True if can be cancelled
 */
export function canCancelLeaveRequest(
  request: LeaveRequest,
  currentUserId: string
): boolean {
  return request.status === 'pending' && request.employee_id === currentUserId;
}

/**
 * Check if a leave request can be approved/rejected
 * @param request - Leave request
 * @returns True if can be approved/rejected
 */
export function canApproveRejectLeaveRequest(request: LeaveRequest): boolean {
  return request.status === 'pending';
}
