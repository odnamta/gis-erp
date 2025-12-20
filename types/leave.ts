// =====================================================
// v0.30: HR - LEAVE MANAGEMENT - Type Definitions
// =====================================================

import { Employee } from './attendance';

export interface LeaveType {
  id: string;
  type_code: string;
  type_name: string;
  default_days_per_year: number;
  allow_carry_over: boolean;
  max_carry_over_days: number;
  requires_approval: boolean;
  requires_attachment: boolean;
  min_days_advance: number;
  is_paid: boolean;
  is_active: boolean;
  created_at: string;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  entitled_days: number;
  used_days: number;
  pending_days: number;
  carried_over_days: number;
  available_days: number;
  created_at: string;
  updated_at: string;
  leave_type?: LeaveType;
  employee?: Employee;
}

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type HalfDayType = 'morning' | 'afternoon';

export interface LeaveRequest {
  id: string;
  request_number: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  is_half_day: boolean;
  half_day_type?: HalfDayType;
  reason?: string;
  attachment_url?: string;
  emergency_contact?: string;
  handover_to?: string;
  handover_notes?: string;
  status: LeaveRequestStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined relations
  employee?: Employee;
  leave_type?: LeaveType;
  handover_employee?: Employee;
  approver?: {
    id: string;
    full_name: string;
  };
}

export interface LeaveRequestFormData {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  half_day_type?: HalfDayType;
  reason?: string;
  emergency_contact?: string;
  handover_to?: string;
  handover_notes?: string;
  attachment_url?: string;
}

export interface LeaveRequestFilters {
  employee_id?: string;
  leave_type_id?: string;
  status?: LeaveRequestStatus;
  start_date?: string;
  end_date?: string;
}

export interface LeaveValidationResult {
  valid: boolean;
  errors: string[];
}

export interface LeaveBalanceSummary {
  leave_type: LeaveType;
  balance: LeaveBalance | null;
}

// For display purposes
export interface FormattedLeaveRequest extends LeaveRequest {
  employee_name: string;
  department: string;
  leave_type_name: string;
  date_range: string;
  handover_name?: string;
}
