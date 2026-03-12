'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import type { PayrollComponentItem } from '@/types/payroll';

export interface MyPayrollRecord {
  id: string;
  period_id: string;
  work_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  overtime_hours: number;
  earnings: PayrollComponentItem[];
  deductions: PayrollComponentItem[];
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  status: string;
  created_at: string;
  period: {
    id: string;
    period_name: string;
    period_year: number;
    period_month: number;
    pay_date: string;
    status: string;
  };
}

/**
 * Get the current employee's ID by looking up user profile -> employee record
 */
async function getMyEmployeeId(): Promise<string | null> {
  const profile = await getUserProfile();
  if (!profile) return null;

  const supabase = await createClient();

  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', profile.id)
    .eq('is_active', true)
    .single();

  return employee?.id ?? null;
}

/**
 * Get current employee's payroll records from the last 12 months,
 * joined with payroll_periods. Ordered by period_year DESC, period_month DESC.
 */
export async function getMyPayrollHistory(): Promise<MyPayrollRecord[]> {
  const employeeId = await getMyEmployeeId();
  if (!employeeId) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payroll_records')
    .select(`
      id,
      period_id,
      work_days,
      present_days,
      absent_days,
      leave_days,
      overtime_hours,
      earnings,
      deductions,
      gross_salary,
      total_deductions,
      net_salary,
      status,
      created_at,
      period:payroll_periods(
        id,
        period_name,
        period_year,
        period_month,
        pay_date,
        status
      )
    `)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(12);

  if (error || !data) {
    return [];
  }

  // Sort by period year/month descending (in case ordering by created_at doesn't match)
  const records = (data as unknown as MyPayrollRecord[]).filter(r => r.period);
  records.sort((a, b) => {
    if (a.period.period_year !== b.period.period_year) {
      return b.period.period_year - a.period.period_year;
    }
    return b.period.period_month - a.period.period_month;
  });

  return records;
}

/**
 * Get a single payroll record for the current employee and a specific period.
 * Returns null if the record doesn't belong to the current employee.
 */
export async function getMyPayrollRecord(periodId: string): Promise<MyPayrollRecord | null> {
  const employeeId = await getMyEmployeeId();
  if (!employeeId) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payroll_records')
    .select(`
      id,
      period_id,
      work_days,
      present_days,
      absent_days,
      leave_days,
      overtime_hours,
      earnings,
      deductions,
      gross_salary,
      total_deductions,
      net_salary,
      status,
      created_at,
      period:payroll_periods(
        id,
        period_name,
        period_year,
        period_month,
        pay_date,
        status
      )
    `)
    .eq('employee_id', employeeId)
    .eq('period_id', periodId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as MyPayrollRecord;
}
