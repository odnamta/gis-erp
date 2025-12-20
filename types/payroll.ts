// HR Payroll Types

import { Employee } from './employees';

// Component types
export type ComponentType = 'earning' | 'deduction' | 'benefit';
export type CalculationType = 'fixed' | 'percentage' | 'formula';
export type PercentageOf = 'base_salary' | 'gross_salary';

// Status types
export type PayrollPeriodStatus = 'draft' | 'processing' | 'approved' | 'paid' | 'closed';
export type PayrollRecordStatus = 'calculated' | 'approved' | 'paid';

// Payroll component interface
export interface PayrollComponent {
  id: string;
  component_code: string;
  component_name: string;
  component_type: ComponentType;
  calculation_type: CalculationType;
  percentage_of?: PercentageOf;
  percentage_rate?: number;
  default_amount?: number;
  is_taxable: boolean;
  is_mandatory: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

// Employee payroll setup interface
export interface EmployeePayrollSetup {
  id: string;
  employee_id: string;
  component_id: string;
  custom_amount?: number;
  custom_rate?: number;
  is_active: boolean;
  effective_from?: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
  component?: PayrollComponent;
}

// Payroll period interface
export interface PayrollPeriod {
  id: string;
  period_name: string;
  period_year: number;
  period_month: number;
  start_date: string;
  end_date: string;
  pay_date: string;
  status: PayrollPeriodStatus;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_company_cost: number;
  employee_count: number;
  processed_by?: string;
  processed_at?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

// Payroll component item (for JSONB storage)
export interface PayrollComponentItem {
  component_id: string;
  component_code: string;
  component_name: string;
  amount: number;
}

// Payroll record interface
export interface PayrollRecord {
  id: string;
  period_id: string;
  employee_id: string;
  work_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  overtime_hours: number;
  earnings: PayrollComponentItem[];
  deductions: PayrollComponentItem[];
  company_contributions: PayrollComponentItem[];
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  total_company_cost: number;
  bank_name?: string;
  bank_account?: string;
  bank_account_name?: string;
  status: PayrollRecordStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  employee?: Employee;
  period?: PayrollPeriod;
}

// Salary slip interface
export interface SalarySlip {
  id: string;
  payroll_record_id: string;
  slip_number: string;
  pdf_url?: string;
  generated_at: string;
  payroll_record?: PayrollRecord;
}

// Form data types
export interface PayrollPeriodFormData {
  period_year: number;
  period_month: number;
  pay_date: string;
}

export interface EmployeePayrollSetupFormData {
  component_id: string;
  custom_amount?: number;
  custom_rate?: number;
  effective_from?: string;
  effective_to?: string;
}

// Filter types
export interface PayrollPeriodFilters {
  year?: number;
  status?: PayrollPeriodStatus;
}

export interface PayrollRecordFilters {
  period_id?: string;
  employee_id?: string;
  department_id?: string;
  status?: PayrollRecordStatus;
}

// Summary types
export interface PayrollSummary {
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_company_cost: number;
  employee_count: number;
}

export interface DepartmentManpowerCost {
  department_id: string;
  department_name: string;
  employee_count: number;
  total_gross: number;
  total_net: number;
  total_company_cost: number;
}

// Attendance summary for payroll calculation
export interface AttendanceSummaryForPayroll {
  work_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  overtime_hours: number;
}

// Calculation result types
export interface PayrollCalculationResult {
  earnings: PayrollComponentItem[];
  deductions: PayrollComponentItem[];
  company_contributions: PayrollComponentItem[];
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  total_company_cost: number;
}

// BPJS types for calculation
export type BPJSType = 'kesehatan' | 'jht' | 'jp' | 'jkk' | 'jkm';

// BPJS rates (Indonesian statutory rates)
export const BPJS_RATES = {
  kesehatan: {
    employee: 1.0,  // 1%
    company: 4.0,   // 4%
    max_base: 12000000, // Maximum base salary for BPJS Kesehatan
  },
  jht: {
    employee: 2.0,  // 2%
    company: 3.7,   // 3.7%
  },
  jp: {
    employee: 1.0,  // 1%
    company: 2.0,   // 2%
    max_base: 9559600, // Maximum base salary for BPJS JP (2024)
  },
  jkk: {
    company: 0.24,  // 0.24% (varies by risk class, using lowest)
  },
  jkm: {
    company: 0.3,   // 0.3%
  },
} as const;

// Month names in Indonesian
export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
] as const;
