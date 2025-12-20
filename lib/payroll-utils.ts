// Payroll Utility Functions

import {
  PayrollComponent,
  PayrollComponentItem,
  EmployeePayrollSetup,
  PayrollPeriodFormData,
  AttendanceSummaryForPayroll,
  PayrollCalculationResult,
  BPJSType,
  BPJS_RATES,
  MONTH_NAMES_ID,
} from '@/types/payroll';

/**
 * Generate period name from year and month
 * @param year - The year (e.g., 2025)
 * @param month - The month (1-12)
 * @returns Period name (e.g., "Desember 2025")
 */
export function generatePeriodName(year: number, month: number): string {
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12');
  }
  return `${MONTH_NAMES_ID[month - 1]} ${year}`;
}

/**
 * Get start and end dates for a period
 * @param year - The year
 * @param month - The month (1-12)
 * @returns Object with start_date and end_date
 */
export function getPeriodDates(year: number, month: number): { start_date: string; end_date: string } {
  // Use UTC to avoid timezone issues
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0)); // Last day of month
  
  const formatDate = (date: Date) => {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  
  return {
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
  };
}

/**
 * Format currency for display (Indonesian Rupiah)
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export function formatPayrollCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format currency in compact form (e.g., "Rp 185.5M")
 * @param amount - The amount to format
 * @returns Compact formatted string
 */
export function formatPayrollCurrencyCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(1)}K`;
  }
  return `Rp ${amount}`;
}

/**
 * Calculate BPJS amount based on type and base salary
 * @param baseSalary - The base salary
 * @param type - BPJS type
 * @param isEmployee - Whether this is employee contribution (true) or company (false)
 * @returns Calculated BPJS amount
 */
export function calculateBPJS(
  baseSalary: number,
  type: BPJSType,
  isEmployee: boolean
): number {
  if (baseSalary <= 0) return 0;

  let base = baseSalary;
  let rate = 0;

  switch (type) {
    case 'kesehatan':
      // BPJS Kesehatan has a maximum base
      base = Math.min(baseSalary, BPJS_RATES.kesehatan.max_base);
      rate = isEmployee ? BPJS_RATES.kesehatan.employee : BPJS_RATES.kesehatan.company;
      break;
    case 'jht':
      rate = isEmployee ? BPJS_RATES.jht.employee : BPJS_RATES.jht.company;
      break;
    case 'jp':
      // BPJS JP has a maximum base
      base = Math.min(baseSalary, BPJS_RATES.jp.max_base);
      rate = isEmployee ? BPJS_RATES.jp.employee : BPJS_RATES.jp.company;
      break;
    case 'jkk':
      if (isEmployee) return 0; // JKK is company-only
      rate = BPJS_RATES.jkk.company;
      break;
    case 'jkm':
      if (isEmployee) return 0; // JKM is company-only
      rate = BPJS_RATES.jkm.company;
      break;
  }

  return Math.round(base * (rate / 100));
}

/**
 * Calculate earnings for an employee
 * @param baseSalary - Employee's base salary
 * @param components - All earning components
 * @param employeeSetup - Employee-specific overrides
 * @param overtimeHours - Overtime hours worked
 * @returns Array of earning items
 */
export function calculateEarnings(
  baseSalary: number,
  components: PayrollComponent[],
  employeeSetup: EmployeePayrollSetup[],
  overtimeHours: number = 0
): PayrollComponentItem[] {
  const earnings: PayrollComponentItem[] = [];
  const earningComponents = components.filter(c => c.component_type === 'earning' && c.is_active);

  for (const component of earningComponents) {
    const setup = employeeSetup.find(s => s.component_id === component.id && s.is_active);
    let amount = 0;

    if (component.component_code === 'base_salary') {
      // Base salary comes from employee record
      amount = baseSalary;
    } else if (component.component_code === 'overtime') {
      // Overtime calculation: (base_salary / 173) * 1.5 * hours
      // 173 is average working hours per month
      if (overtimeHours > 0 && baseSalary > 0) {
        const hourlyRate = baseSalary / 173;
        amount = Math.round(hourlyRate * 1.5 * overtimeHours);
      }
    } else if (component.calculation_type === 'fixed') {
      // Use custom amount if set, otherwise default
      amount = setup?.custom_amount ?? component.default_amount ?? 0;
    } else if (component.calculation_type === 'percentage') {
      const rate = setup?.custom_rate ?? component.percentage_rate ?? 0;
      const base = component.percentage_of === 'base_salary' ? baseSalary : 0;
      amount = Math.round(base * (rate / 100));
    }

    if (amount > 0) {
      earnings.push({
        component_id: component.id,
        component_code: component.component_code,
        component_name: component.component_name,
        amount,
      });
    }
  }

  return earnings;
}

/**
 * Calculate deductions for an employee
 * @param grossSalary - Employee's gross salary
 * @param baseSalary - Employee's base salary
 * @param components - All deduction components
 * @param employeeSetup - Employee-specific overrides
 * @returns Array of deduction items
 */
export function calculateDeductions(
  grossSalary: number,
  baseSalary: number,
  components: PayrollComponent[],
  employeeSetup: EmployeePayrollSetup[]
): PayrollComponentItem[] {
  const deductions: PayrollComponentItem[] = [];
  const deductionComponents = components.filter(c => c.component_type === 'deduction' && c.is_active);

  for (const component of deductionComponents) {
    const setup = employeeSetup.find(s => s.component_id === component.id && s.is_active);
    let amount = 0;

    if (component.component_code === 'bpjs_kes_emp') {
      amount = calculateBPJS(baseSalary, 'kesehatan', true);
    } else if (component.component_code === 'bpjs_jht_emp') {
      amount = calculateBPJS(baseSalary, 'jht', true);
    } else if (component.component_code === 'bpjs_jp_emp') {
      amount = calculateBPJS(baseSalary, 'jp', true);
    } else if (component.component_code === 'pph21') {
      // Simplified PPh 21 calculation
      // In reality, this requires complex tax bracket calculations
      // For now, we'll use a simplified 5% of taxable income
      amount = calculateSimplifiedPPh21(grossSalary, baseSalary);
    } else if (component.calculation_type === 'fixed') {
      amount = setup?.custom_amount ?? component.default_amount ?? 0;
    } else if (component.calculation_type === 'percentage') {
      const rate = setup?.custom_rate ?? component.percentage_rate ?? 0;
      const base = component.percentage_of === 'base_salary' ? baseSalary : grossSalary;
      amount = Math.round(base * (rate / 100));
    }

    if (amount > 0) {
      deductions.push({
        component_id: component.id,
        component_code: component.component_code,
        component_name: component.component_name,
        amount,
      });
    }
  }

  return deductions;
}

/**
 * Simplified PPh 21 calculation
 * Note: Real PPh 21 requires PTKP, tax brackets, and annual calculation
 * This is a simplified monthly estimate
 */
export function calculateSimplifiedPPh21(grossSalary: number, baseSalary: number): number {
  // PTKP (Penghasilan Tidak Kena Pajak) monthly for single person: ~4.5M
  const monthlyPTKP = 4_500_000;
  
  // Taxable income
  const taxableIncome = grossSalary - monthlyPTKP;
  
  if (taxableIncome <= 0) return 0;
  
  // Simplified tax brackets (monthly)
  // 5% for first 5M, 15% for 5M-20M, 25% for 20M-40M, 30% above
  let tax = 0;
  let remaining = taxableIncome;
  
  // 5% bracket (0 - 5M monthly ≈ 0 - 60M annual)
  const bracket1 = Math.min(remaining, 5_000_000);
  tax += bracket1 * 0.05;
  remaining -= bracket1;
  
  if (remaining > 0) {
    // 15% bracket (5M - 20M monthly)
    const bracket2 = Math.min(remaining, 15_000_000);
    tax += bracket2 * 0.15;
    remaining -= bracket2;
  }
  
  if (remaining > 0) {
    // 25% bracket (20M - 40M monthly)
    const bracket3 = Math.min(remaining, 20_000_000);
    tax += bracket3 * 0.25;
    remaining -= bracket3;
  }
  
  if (remaining > 0) {
    // 30% bracket (above 40M monthly)
    tax += remaining * 0.30;
  }
  
  return Math.round(tax);
}

/**
 * Calculate company contributions (benefits)
 * @param grossSalary - Employee's gross salary
 * @param baseSalary - Employee's base salary
 * @param components - All benefit components
 * @param employeeSetup - Employee-specific overrides
 * @returns Array of company contribution items
 */
export function calculateCompanyContributions(
  grossSalary: number,
  baseSalary: number,
  components: PayrollComponent[],
  employeeSetup: EmployeePayrollSetup[]
): PayrollComponentItem[] {
  const contributions: PayrollComponentItem[] = [];
  const benefitComponents = components.filter(c => c.component_type === 'benefit' && c.is_active);

  for (const component of benefitComponents) {
    const setup = employeeSetup.find(s => s.component_id === component.id && s.is_active);
    let amount = 0;

    if (component.component_code === 'bpjs_kes_com') {
      amount = calculateBPJS(baseSalary, 'kesehatan', false);
    } else if (component.component_code === 'bpjs_jht_com') {
      amount = calculateBPJS(baseSalary, 'jht', false);
    } else if (component.component_code === 'bpjs_jkk') {
      amount = calculateBPJS(baseSalary, 'jkk', false);
    } else if (component.component_code === 'bpjs_jkm') {
      amount = calculateBPJS(baseSalary, 'jkm', false);
    } else if (component.calculation_type === 'fixed') {
      amount = setup?.custom_amount ?? component.default_amount ?? 0;
    } else if (component.calculation_type === 'percentage') {
      const rate = setup?.custom_rate ?? component.percentage_rate ?? 0;
      const base = component.percentage_of === 'base_salary' ? baseSalary : grossSalary;
      amount = Math.round(base * (rate / 100));
    }

    if (amount > 0) {
      contributions.push({
        component_id: component.id,
        component_code: component.component_code,
        component_name: component.component_name,
        amount,
      });
    }
  }

  return contributions;
}

/**
 * Calculate full payroll for an employee
 * @param baseSalary - Employee's base salary
 * @param components - All payroll components
 * @param employeeSetup - Employee-specific overrides
 * @param overtimeHours - Overtime hours worked
 * @returns Complete payroll calculation result
 */
export function calculateFullPayroll(
  baseSalary: number,
  components: PayrollComponent[],
  employeeSetup: EmployeePayrollSetup[],
  overtimeHours: number = 0
): PayrollCalculationResult {
  // Calculate earnings
  const earnings = calculateEarnings(baseSalary, components, employeeSetup, overtimeHours);
  const grossSalary = sumComponentAmounts(earnings);

  // Calculate deductions
  const deductions = calculateDeductions(grossSalary, baseSalary, components, employeeSetup);
  const totalDeductions = sumComponentAmounts(deductions);

  // Calculate company contributions
  const companyContributions = calculateCompanyContributions(grossSalary, baseSalary, components, employeeSetup);
  const totalCompanyContributions = sumComponentAmounts(companyContributions);

  // Calculate net salary and total company cost
  const netSalary = grossSalary - totalDeductions;
  const totalCompanyCost = grossSalary + totalCompanyContributions;

  return {
    earnings,
    deductions,
    company_contributions: companyContributions,
    gross_salary: grossSalary,
    total_deductions: totalDeductions,
    net_salary: netSalary,
    total_company_cost: totalCompanyCost,
  };
}

/**
 * Sum amounts from component items
 * @param items - Array of component items
 * @returns Total amount
 */
export function sumComponentAmounts(items: PayrollComponentItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

/**
 * Validate payroll period data
 * @param data - Period form data
 * @returns Validation result
 */
export function validatePayrollPeriod(
  data: PayrollPeriodFormData
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.period_year || data.period_year < 2020 || data.period_year > 2100) {
    errors.push('Invalid year');
  }

  if (!data.period_month || data.period_month < 1 || data.period_month > 12) {
    errors.push('Invalid month');
  }

  if (!data.pay_date) {
    errors.push('Pay date is required');
  } else {
    const payDate = new Date(data.pay_date);
    const { end_date } = getPeriodDates(data.period_year, data.period_month);
    const endDate = new Date(end_date);
    
    if (payDate < endDate) {
      errors.push('Pay date must be on or after the period end date');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get default attendance summary (full month)
 * @param year - The year
 * @param month - The month
 * @returns Default attendance summary
 */
export function getDefaultAttendanceSummary(
  year: number,
  month: number
): AttendanceSummaryForPayroll {
  // Calculate working days in the month (excluding weekends)
  const { start_date, end_date } = getPeriodDates(year, month);
  const start = new Date(start_date);
  const end = new Date(end_date);
  
  let workDays = 0;
  const current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return {
    work_days: workDays,
    present_days: workDays, // Assume full attendance by default
    absent_days: 0,
    leave_days: 0,
    overtime_hours: 0,
  };
}

/**
 * Get payroll period status color
 * @param status - Period status
 * @returns Tailwind color class
 */
export function getPayrollStatusColor(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'paid':
      return 'bg-purple-100 text-purple-800';
    case 'closed':
      return 'bg-slate-100 text-slate-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get payroll record status color
 * @param status - Record status
 * @returns Tailwind color class
 */
export function getPayrollRecordStatusColor(status: string): string {
  switch (status) {
    case 'calculated':
      return 'bg-blue-100 text-blue-800';
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'paid':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
