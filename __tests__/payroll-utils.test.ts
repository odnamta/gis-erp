/**
 * Payroll Utils Unit Tests
 * Feature: hr-payroll
 */

import { describe, it, expect } from 'vitest';
import {
  generatePeriodName,
  getPeriodDates,
  formatPayrollCurrency,
  formatPayrollCurrencyCompact,
  calculateBPJS,
  calculateEarnings,
  calculateDeductions,
  calculateCompanyContributions,
  calculateFullPayroll,
  sumComponentAmounts,
  validatePayrollPeriod,
  getDefaultAttendanceSummary,
  calculateSimplifiedPPh21,
  getPayrollStatusColor,
} from '@/lib/payroll-utils';
import { PayrollComponent, EmployeePayrollSetup, BPJS_RATES } from '@/types/payroll';

// Mock components for testing
const mockComponents: PayrollComponent[] = [
  {
    id: 'comp-1',
    component_code: 'base_salary',
    component_name: 'Base Salary',
    component_type: 'earning',
    calculation_type: 'fixed',
    is_taxable: true,
    is_mandatory: true,
    is_active: true,
    display_order: 1,
    created_at: '2025-01-01',
  },
  {
    id: 'comp-2',
    component_code: 'transport',
    component_name: 'Transport Allowance',
    component_type: 'earning',
    calculation_type: 'fixed',
    default_amount: 500000,
    is_taxable: true,
    is_mandatory: false,
    is_active: true,
    display_order: 2,
    created_at: '2025-01-01',
  },
  {
    id: 'comp-3',
    component_code: 'overtime',
    component_name: 'Overtime Pay',
    component_type: 'earning',
    calculation_type: 'formula',
    is_taxable: true,
    is_mandatory: false,
    is_active: true,
    display_order: 3,
    created_at: '2025-01-01',
  },
  {
    id: 'comp-4',
    component_code: 'bpjs_kes_emp',
    component_name: 'BPJS Kesehatan (Employee)',
    component_type: 'deduction',
    calculation_type: 'percentage',
    percentage_of: 'base_salary',
    percentage_rate: 1,
    is_taxable: false,
    is_mandatory: true,
    is_active: true,
    display_order: 10,
    created_at: '2025-01-01',
  },
  {
    id: 'comp-5',
    component_code: 'bpjs_jht_emp',
    component_name: 'BPJS JHT (Employee)',
    component_type: 'deduction',
    calculation_type: 'percentage',
    percentage_of: 'base_salary',
    percentage_rate: 2,
    is_taxable: false,
    is_mandatory: true,
    is_active: true,
    display_order: 11,
    created_at: '2025-01-01',
  },
  {
    id: 'comp-6',
    component_code: 'bpjs_jp_emp',
    component_name: 'BPJS JP (Employee)',
    component_type: 'deduction',
    calculation_type: 'percentage',
    percentage_of: 'base_salary',
    percentage_rate: 1,
    is_taxable: false,
    is_mandatory: true,
    is_active: true,
    display_order: 12,
    created_at: '2025-01-01',
  },
  {
    id: 'comp-7',
    component_code: 'pph21',
    component_name: 'PPh 21',
    component_type: 'deduction',
    calculation_type: 'formula',
    is_taxable: false,
    is_mandatory: true,
    is_active: true,
    display_order: 13,
    created_at: '2025-01-01',
  },
  {
    id: 'comp-8',
    component_code: 'bpjs_kes_com',
    component_name: 'BPJS Kesehatan (Company)',
    component_type: 'benefit',
    calculation_type: 'percentage',
    percentage_of: 'base_salary',
    percentage_rate: 4,
    is_taxable: false,
    is_mandatory: true,
    is_active: true,
    display_order: 20,
    created_at: '2025-01-01',
  },
  {
    id: 'comp-9',
    component_code: 'bpjs_jht_com',
    component_name: 'BPJS JHT (Company)',
    component_type: 'benefit',
    calculation_type: 'percentage',
    percentage_of: 'base_salary',
    percentage_rate: 3.7,
    is_taxable: false,
    is_mandatory: true,
    is_active: true,
    display_order: 21,
    created_at: '2025-01-01',
  },
];

describe('generatePeriodName', () => {
  it('should generate correct period name for December 2025', () => {
    expect(generatePeriodName(2025, 12)).toBe('Desember 2025');
  });

  it('should generate correct period name for January 2025', () => {
    expect(generatePeriodName(2025, 1)).toBe('Januari 2025');
  });

  it('should throw error for invalid month', () => {
    expect(() => generatePeriodName(2025, 0)).toThrow('Month must be between 1 and 12');
    expect(() => generatePeriodName(2025, 13)).toThrow('Month must be between 1 and 12');
  });
});

describe('getPeriodDates', () => {
  it('should return correct dates for December 2025', () => {
    const dates = getPeriodDates(2025, 12);
    expect(dates.start_date).toBe('2025-12-01');
    expect(dates.end_date).toBe('2025-12-31');
  });

  it('should return correct dates for February 2024 (leap year)', () => {
    const dates = getPeriodDates(2024, 2);
    expect(dates.start_date).toBe('2024-02-01');
    expect(dates.end_date).toBe('2024-02-29');
  });

  it('should return correct dates for February 2025 (non-leap year)', () => {
    const dates = getPeriodDates(2025, 2);
    expect(dates.start_date).toBe('2025-02-01');
    expect(dates.end_date).toBe('2025-02-28');
  });
});

describe('formatPayrollCurrency', () => {
  it('should format currency correctly', () => {
    // Format varies by locale, just check it contains the amount
    const formatted = formatPayrollCurrency(10000000);
    expect(formatted).toContain('10');
    expect(formatted).toContain('000');
    expect(formatPayrollCurrency(0)).toContain('0');
  });
});

describe('formatPayrollCurrencyCompact', () => {
  it('should format millions correctly', () => {
    expect(formatPayrollCurrencyCompact(185500000)).toBe('Rp 185.5M');
  });

  it('should format billions correctly', () => {
    expect(formatPayrollCurrencyCompact(1500000000)).toBe('Rp 1.5B');
  });

  it('should format thousands correctly', () => {
    expect(formatPayrollCurrencyCompact(500000)).toBe('Rp 500.0K');
  });
});

describe('calculateBPJS', () => {
  const baseSalary = 10000000; // 10 million

  it('should calculate BPJS Kesehatan employee contribution (1%)', () => {
    const amount = calculateBPJS(baseSalary, 'kesehatan', true);
    expect(amount).toBe(100000); // 1% of 10M
  });

  it('should calculate BPJS Kesehatan company contribution (4%)', () => {
    const amount = calculateBPJS(baseSalary, 'kesehatan', false);
    expect(amount).toBe(400000); // 4% of 10M
  });

  it('should cap BPJS Kesehatan at maximum base', () => {
    const highSalary = 20000000; // 20 million (above max)
    const amount = calculateBPJS(highSalary, 'kesehatan', true);
    expect(amount).toBe(120000); // 1% of 12M (max base)
  });

  it('should calculate BPJS JHT employee contribution (2%)', () => {
    const amount = calculateBPJS(baseSalary, 'jht', true);
    expect(amount).toBe(200000); // 2% of 10M
  });

  it('should calculate BPJS JHT company contribution (3.7%)', () => {
    const amount = calculateBPJS(baseSalary, 'jht', false);
    expect(amount).toBe(370000); // 3.7% of 10M
  });

  it('should return 0 for JKK employee (company-only)', () => {
    const amount = calculateBPJS(baseSalary, 'jkk', true);
    expect(amount).toBe(0);
  });

  it('should calculate BPJS JKK company contribution (0.24%)', () => {
    const amount = calculateBPJS(baseSalary, 'jkk', false);
    expect(amount).toBe(24000); // 0.24% of 10M
  });

  it('should return 0 for zero salary', () => {
    expect(calculateBPJS(0, 'kesehatan', true)).toBe(0);
  });
});

describe('calculateEarnings', () => {
  it('should calculate base salary correctly', () => {
    const earnings = calculateEarnings(10000000, mockComponents, [], 0);
    const baseSalary = earnings.find(e => e.component_code === 'base_salary');
    expect(baseSalary?.amount).toBe(10000000);
  });

  it('should include fixed allowances', () => {
    const earnings = calculateEarnings(10000000, mockComponents, [], 0);
    const transport = earnings.find(e => e.component_code === 'transport');
    expect(transport?.amount).toBe(500000);
  });

  it('should calculate overtime correctly', () => {
    const earnings = calculateEarnings(10000000, mockComponents, [], 10);
    const overtime = earnings.find(e => e.component_code === 'overtime');
    // (10M / 173) * 1.5 * 10 = ~867,052
    expect(overtime?.amount).toBeGreaterThan(800000);
    expect(overtime?.amount).toBeLessThan(900000);
  });

  it('should use custom amount from employee setup', () => {
    const setup: EmployeePayrollSetup[] = [{
      id: 'setup-1',
      employee_id: 'emp-1',
      component_id: 'comp-2', // transport
      custom_amount: 750000,
      is_active: true,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    }];
    const earnings = calculateEarnings(10000000, mockComponents, setup, 0);
    const transport = earnings.find(e => e.component_code === 'transport');
    expect(transport?.amount).toBe(750000);
  });
});

describe('calculateDeductions', () => {
  it('should calculate BPJS deductions correctly', () => {
    // Using 10M base salary
    const baseSalary = 10000000;
    const grossSalary = 10500000; // base + transport
    const deductions = calculateDeductions(grossSalary, baseSalary, mockComponents, []);
    
    const bpjsKes = deductions.find(d => d.component_code === 'bpjs_kes_emp');
    expect(bpjsKes?.amount).toBe(100000); // 1% of base
    
    const bpjsJht = deductions.find(d => d.component_code === 'bpjs_jht_emp');
    expect(bpjsJht?.amount).toBe(200000); // 2% of base
    
    // BPJS JP is capped at max base of ~9.5M, so 1% of 9.5M = ~95,596
    const bpjsJp = deductions.find(d => d.component_code === 'bpjs_jp_emp');
    expect(bpjsJp?.amount).toBe(95596); // 1% of capped base
  });

  it('should calculate PPh 21 for high income', () => {
    const deductions = calculateDeductions(25000000, 20000000, mockComponents, []);
    const pph21 = deductions.find(d => d.component_code === 'pph21');
    expect(pph21?.amount).toBeGreaterThan(0);
  });

  it('should return 0 PPh 21 for income below PTKP', () => {
    const deductions = calculateDeductions(4000000, 4000000, mockComponents, []);
    const pph21 = deductions.find(d => d.component_code === 'pph21');
    expect(pph21).toBeUndefined(); // No PPh 21 if below threshold
  });
});

describe('calculateCompanyContributions', () => {
  it('should calculate company BPJS contributions correctly', () => {
    const contributions = calculateCompanyContributions(10500000, 10000000, mockComponents, []);
    
    const bpjsKes = contributions.find(c => c.component_code === 'bpjs_kes_com');
    expect(bpjsKes?.amount).toBe(400000); // 4% of base
    
    const bpjsJht = contributions.find(c => c.component_code === 'bpjs_jht_com');
    expect(bpjsJht?.amount).toBe(370000); // 3.7% of base
  });
});

describe('calculateFullPayroll', () => {
  it('should calculate complete payroll correctly', () => {
    const result = calculateFullPayroll(10000000, mockComponents, [], 0);
    
    // Gross = base + transport = 10M + 500K = 10.5M
    expect(result.gross_salary).toBe(10500000);
    
    // Net = gross - deductions
    expect(result.net_salary).toBe(result.gross_salary - result.total_deductions);
    
    // Company cost = gross + company contributions
    const totalContributions = sumComponentAmounts(result.company_contributions);
    expect(result.total_company_cost).toBe(result.gross_salary + totalContributions);
  });

  it('should satisfy Property 1: gross_salary equals sum of earnings', () => {
    const result = calculateFullPayroll(15000000, mockComponents, [], 5);
    const earningsSum = sumComponentAmounts(result.earnings);
    expect(result.gross_salary).toBe(earningsSum);
  });

  it('should satisfy Property 2: net_salary equals gross minus deductions', () => {
    const result = calculateFullPayroll(12000000, mockComponents, [], 0);
    expect(result.net_salary).toBe(result.gross_salary - result.total_deductions);
  });

  it('should satisfy Property 3: total_deductions equals sum of deductions', () => {
    const result = calculateFullPayroll(12000000, mockComponents, [], 0);
    const deductionsSum = sumComponentAmounts(result.deductions);
    expect(result.total_deductions).toBe(deductionsSum);
  });

  it('should satisfy Property 4: company_cost equals gross plus contributions', () => {
    const result = calculateFullPayroll(12000000, mockComponents, [], 0);
    const contributionsSum = sumComponentAmounts(result.company_contributions);
    expect(result.total_company_cost).toBe(result.gross_salary + contributionsSum);
  });
});

describe('validatePayrollPeriod', () => {
  it('should validate correct period data', () => {
    const result = validatePayrollPeriod({
      period_year: 2025,
      period_month: 12,
      pay_date: '2026-01-05',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid year', () => {
    const result = validatePayrollPeriod({
      period_year: 2019,
      period_month: 12,
      pay_date: '2020-01-05',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid year');
  });

  it('should reject invalid month', () => {
    const result = validatePayrollPeriod({
      period_year: 2025,
      period_month: 13,
      pay_date: '2026-01-05',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid month');
  });

  it('should reject pay date before period end', () => {
    const result = validatePayrollPeriod({
      period_year: 2025,
      period_month: 12,
      pay_date: '2025-12-15', // Before Dec 31
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Pay date must be on or after the period end date');
  });
});

describe('getDefaultAttendanceSummary', () => {
  it('should calculate working days correctly', () => {
    const summary = getDefaultAttendanceSummary(2025, 12);
    // December 2025 has 23 working days (excluding weekends)
    expect(summary.work_days).toBeGreaterThan(20);
    expect(summary.work_days).toBeLessThanOrEqual(23);
    expect(summary.present_days).toBe(summary.work_days);
    expect(summary.absent_days).toBe(0);
    expect(summary.leave_days).toBe(0);
  });
});

describe('calculateSimplifiedPPh21', () => {
  it('should return 0 for income below PTKP', () => {
    expect(calculateSimplifiedPPh21(4000000, 4000000)).toBe(0);
  });

  it('should calculate tax for income above PTKP', () => {
    // Gross 10M, PTKP 4.5M, taxable 5.5M
    // 5M at 5% = 250K, 0.5M at 15% = 75K = 325K
    const tax = calculateSimplifiedPPh21(10000000, 10000000);
    expect(tax).toBeGreaterThan(300000);
    expect(tax).toBeLessThan(400000);
  });
});

describe('getPayrollStatusColor', () => {
  it('should return correct colors for each status', () => {
    expect(getPayrollStatusColor('draft')).toContain('gray');
    expect(getPayrollStatusColor('processing')).toContain('blue');
    expect(getPayrollStatusColor('approved')).toContain('green');
    expect(getPayrollStatusColor('paid')).toContain('purple');
    expect(getPayrollStatusColor('closed')).toContain('slate');
  });
});
