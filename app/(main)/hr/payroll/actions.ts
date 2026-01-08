'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Json } from '@/types/database';
import {
  PayrollComponent,
  PayrollPeriod,
  PayrollRecord,
  PayrollPeriodFormData,
  EmployeePayrollSetup,
  SalarySlip,
  DepartmentManpowerCost,
  PayrollComponentItem,
} from '@/types/payroll';
import {
  generatePeriodName,
  getPeriodDates,
  calculateFullPayroll,
  validatePayrollPeriod,
  getDefaultAttendanceSummary,
} from '@/lib/payroll-utils';

// ============================================
// Payroll Components
// ============================================

/**
 * Get all active payroll components
 */
export async function getPayrollComponents(): Promise<PayrollComponent[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('payroll_components')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching payroll components:', error);
    return [];
  }

  return (data || []) as unknown as PayrollComponent[];
}

// ============================================
// Employee Payroll Setup
// ============================================

/**
 * Get employee payroll setup (custom component overrides)
 */
export async function getEmployeePayrollSetup(
  employeeId: string
): Promise<EmployeePayrollSetup[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('employee_payroll_setup')
    .select(`
      *,
      component:payroll_components(*)
    `)
    .eq('employee_id', employeeId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching employee payroll setup:', error);
    return [];
  }

  return (data || []) as unknown as EmployeePayrollSetup[];
}

/**
 * Update employee payroll setup
 */
export async function updateEmployeePayrollSetup(
  employeeId: string,
  componentId: string,
  data: { custom_amount?: number; custom_rate?: number; effective_from?: string; effective_to?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('employee_payroll_setup')
    .upsert({
      employee_id: employeeId,
      component_id: componentId,
      custom_amount: data.custom_amount,
      custom_rate: data.custom_rate,
      effective_from: data.effective_from,
      effective_to: data.effective_to,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'employee_id,component_id',
    });

  if (error) {
    console.error('Error updating employee payroll setup:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr/payroll');
  return { success: true };
}

// ============================================
// Payroll Periods
// ============================================

/**
 * Get all payroll periods
 */
export async function getPayrollPeriods(): Promise<PayrollPeriod[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });

  if (error) {
    console.error('Error fetching payroll periods:', error);
    return [];
  }

  return (data || []) as unknown as PayrollPeriod[];
}

/**
 * Get a single payroll period by ID
 */
export async function getPayrollPeriod(periodId: string): Promise<PayrollPeriod | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('id', periodId)
    .single();

  if (error) {
    console.error('Error fetching payroll period:', error);
    return null;
  }

  return data as unknown as PayrollPeriod;
}

/**
 * Create a new payroll period
 */
export async function createPayrollPeriod(
  formData: PayrollPeriodFormData
): Promise<{ success: boolean; data?: PayrollPeriod; error?: string }> {
  const supabase = await createClient();
  
  // Validate input
  const validation = validatePayrollPeriod(formData);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }

  // Check if period already exists
  const { data: existing } = await supabase
    .from('payroll_periods')
    .select('id')
    .eq('period_year', formData.period_year)
    .eq('period_month', formData.period_month)
    .single();

  if (existing) {
    return { 
      success: false, 
      error: `Payroll period for ${generatePeriodName(formData.period_year, formData.period_month)} already exists` 
    };
  }

  // Get period dates
  const { start_date, end_date } = getPeriodDates(formData.period_year, formData.period_month);
  const periodName = generatePeriodName(formData.period_year, formData.period_month);

  // Create period
  const { data, error } = await supabase
    .from('payroll_periods')
    .insert({
      period_name: periodName,
      period_year: formData.period_year,
      period_month: formData.period_month,
      start_date,
      end_date,
      pay_date: formData.pay_date,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating payroll period:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr/payroll');
  return { success: true, data: data as unknown as PayrollPeriod };
}

// ============================================
// Payroll Records
// ============================================

/**
 * Get payroll records for a period
 */
export async function getPayrollRecords(periodId: string): Promise<PayrollRecord[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('payroll_records')
    .select(`
      *,
      employee:employees(
        id,
        employee_code,
        full_name,
        department:departments(id, department_name),
        position:positions(id, position_name),
        base_salary,
        bank_name,
        bank_account,
        bank_account_name
      )
    `)
    .eq('period_id', periodId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching payroll records:', error);
    return [];
  }

  return (data || []) as unknown as PayrollRecord[];
}

/**
 * Get a single payroll record
 */
export async function getPayrollRecord(recordId: string): Promise<PayrollRecord | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('payroll_records')
    .select(`
      *,
      employee:employees(
        id,
        employee_code,
        full_name,
        department:departments(id, department_name),
        position:positions(id, position_name),
        base_salary,
        bank_name,
        bank_account,
        bank_account_name
      ),
      period:payroll_periods(*)
    `)
    .eq('id', recordId)
    .single();

  if (error) {
    console.error('Error fetching payroll record:', error);
    return null;
  }

  return data as unknown as PayrollRecord;
}

/**
 * Calculate payroll for a single employee
 */
export async function calculateEmployeePayroll(
  periodId: string,
  employeeId: string
): Promise<{ success: boolean; data?: PayrollRecord; error?: string }> {
  const supabase = await createClient();
  
  // Get period
  const period = await getPayrollPeriod(periodId);
  if (!period) {
    return { success: false, error: 'Payroll period not found' };
  }

  if (period.status !== 'draft' && period.status !== 'processing') {
    return { success: false, error: 'Cannot modify an approved payroll period' };
  }

  // Get employee
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .eq('status', 'active')
    .single();

  if (empError || !employee) {
    return { success: false, error: 'Employee not found or not active' };
  }

  // Get payroll components
  const components = await getPayrollComponents();
  
  // Get employee-specific setup
  const employeeSetup = await getEmployeePayrollSetup(employeeId);

  // Get attendance summary (default for now)
  const attendance = getDefaultAttendanceSummary(period.period_year, period.period_month);

  // Calculate payroll
  const baseSalary = employee.base_salary || 0;
  const calculation = calculateFullPayroll(
    baseSalary,
    components,
    employeeSetup,
    attendance.overtime_hours
  );

  // Upsert payroll record
  const { data, error } = await supabase
    .from('payroll_records')
    .upsert({
      period_id: periodId,
      employee_id: employeeId,
      work_days: attendance.work_days,
      present_days: attendance.present_days,
      absent_days: attendance.absent_days,
      leave_days: attendance.leave_days,
      overtime_hours: attendance.overtime_hours,
      earnings: calculation.earnings as unknown as Json,
      deductions: calculation.deductions as unknown as Json,
      company_contributions: calculation.company_contributions as unknown as Json,
      gross_salary: calculation.gross_salary,
      total_deductions: calculation.total_deductions,
      net_salary: calculation.net_salary,
      total_company_cost: calculation.total_company_cost,
      bank_name: employee.bank_name,
      bank_account: employee.bank_account,
      bank_account_name: employee.bank_account_name,
      status: 'calculated',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'period_id,employee_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Error calculating employee payroll:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/hr/payroll/${periodId}`);
  return { success: true, data: data as unknown as PayrollRecord };
}

/**
 * Calculate payroll for all active employees
 */
export async function calculateAllPayroll(
  periodId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createClient();
  
  // Get period
  const period = await getPayrollPeriod(periodId);
  if (!period) {
    return { success: false, count: 0, error: 'Payroll period not found' };
  }

  if (period.status !== 'draft' && period.status !== 'processing') {
    return { success: false, count: 0, error: 'Cannot modify an approved payroll period' };
  }

  // Update period status to processing
  await supabase
    .from('payroll_periods')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', periodId);

  // Get all active employees
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id')
    .eq('status', 'active');

  if (empError || !employees || employees.length === 0) {
    return { success: false, count: 0, error: 'No active employees found' };
  }

  // Get existing records to skip
  const { data: existingRecords } = await supabase
    .from('payroll_records')
    .select('employee_id')
    .eq('period_id', periodId);

  const existingEmployeeIds = new Set(existingRecords?.map(r => r.employee_id) || []);

  // Calculate for each employee
  let processedCount = 0;
  for (const emp of employees) {
    if (!existingEmployeeIds.has(emp.id)) {
      const result = await calculateEmployeePayroll(periodId, emp.id);
      if (result.success) {
        processedCount++;
      }
    }
  }

  // Update period totals
  await updatePeriodTotals(periodId);

  revalidatePath('/hr/payroll');
  revalidatePath(`/hr/payroll/${periodId}`);
  
  return { success: true, count: processedCount };
}

/**
 * Update period totals from records
 */
async function updatePeriodTotals(periodId: string): Promise<void> {
  const supabase = await createClient();
  
  const { data: records } = await supabase
    .from('payroll_records')
    .select('gross_salary, total_deductions, net_salary, total_company_cost')
    .eq('period_id', periodId);

  if (!records || records.length === 0) return;

  const totals = records.reduce(
    (acc, r) => ({
      total_gross: acc.total_gross + (r.gross_salary || 0),
      total_deductions: acc.total_deductions + (r.total_deductions || 0),
      total_net: acc.total_net + (r.net_salary || 0),
      total_company_cost: acc.total_company_cost + (r.total_company_cost || 0),
    }),
    { total_gross: 0, total_deductions: 0, total_net: 0, total_company_cost: 0 }
  );

  await supabase
    .from('payroll_periods')
    .update({
      ...totals,
      employee_count: records.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', periodId);
}

/**
 * Approve payroll period
 */
export async function approvePayrollPeriod(
  periodId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get period
  const period = await getPayrollPeriod(periodId);
  if (!period) {
    return { success: false, error: 'Payroll period not found' };
  }

  if (period.status !== 'processing' && period.status !== 'draft') {
    return { success: false, error: 'Period must be in processing or draft status to approve' };
  }

  // Update period status
  const { error: periodError } = await supabase
    .from('payroll_periods')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', periodId);

  if (periodError) {
    console.error('Error approving payroll period:', periodError);
    return { success: false, error: periodError.message };
  }

  // Update all records status
  await supabase
    .from('payroll_records')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('period_id', periodId);

  revalidatePath('/hr/payroll');
  revalidatePath(`/hr/payroll/${periodId}`);
  
  return { success: true };
}

// ============================================
// Salary Slips
// ============================================

/**
 * Generate salary slip for a payroll record
 */
export async function generateSalarySlip(
  payrollRecordId: string
): Promise<{ success: boolean; data?: SalarySlip; error?: string }> {
  const supabase = await createClient();
  
  // Check if slip already exists
  const { data: existing } = await supabase
    .from('salary_slips')
    .select('*')
    .eq('payroll_record_id', payrollRecordId)
    .single();

  if (existing) {
    return { success: true, data: existing as unknown as SalarySlip };
  }

  // Create salary slip (slip_number is auto-generated by trigger)
  const { data, error } = await supabase
    .from('salary_slips')
    .insert({
      payroll_record_id: payrollRecordId,
      slip_number: '', // Will be auto-generated
    })
    .select()
    .single();

  if (error) {
    console.error('Error generating salary slip:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr/payroll');
  return { success: true, data: data as unknown as SalarySlip };
}

/**
 * Get salary slip for a payroll record
 */
export async function getSalarySlip(payrollRecordId: string): Promise<SalarySlip | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('salary_slips')
    .select('*')
    .eq('payroll_record_id', payrollRecordId)
    .single();

  if (error) {
    return null;
  }

  return data as unknown as SalarySlip;
}

// ============================================
// Reports
// ============================================

/**
 * Get manpower cost by department
 */
export async function getManpowerCostByDepartment(
  year: number,
  month: number
): Promise<DepartmentManpowerCost[]> {
  const supabase = await createClient();
  
  // Get period
  const { data: period } = await supabase
    .from('payroll_periods')
    .select('id')
    .eq('period_year', year)
    .eq('period_month', month)
    .single();

  if (!period) {
    return [];
  }

  // Get records with department info
  const { data: records, error } = await supabase
    .from('payroll_records')
    .select(`
      gross_salary,
      net_salary,
      total_company_cost,
      employee:employees(
        department:departments(id, department_name)
      )
    `)
    .eq('period_id', period.id);

  if (error || !records) {
    console.error('Error fetching manpower costs:', error);
    return [];
  }

  // Aggregate by department
  const deptMap = new Map<string, DepartmentManpowerCost>();

  for (const record of records) {
    const dept = (record.employee as { department?: { id: string; department_name: string } })?.department;
    const deptId = dept?.id || 'unknown';
    const deptName = dept?.department_name || 'Unknown';

    if (!deptMap.has(deptId)) {
      deptMap.set(deptId, {
        department_id: deptId,
        department_name: deptName,
        employee_count: 0,
        total_gross: 0,
        total_net: 0,
        total_company_cost: 0,
      });
    }

    const existing = deptMap.get(deptId)!;
    existing.employee_count++;
    existing.total_gross += record.gross_salary || 0;
    existing.total_net += record.net_salary || 0;
    existing.total_company_cost += record.total_company_cost || 0;
  }

  return Array.from(deptMap.values()).sort((a, b) => 
    a.department_name.localeCompare(b.department_name)
  );
}
