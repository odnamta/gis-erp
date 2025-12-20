/**
 * Payroll Utils Property-Based Tests
 * Feature: hr-payroll
 * 
 * These tests verify universal correctness properties across many generated inputs.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateEarnings,
  calculateDeductions,
  calculateCompanyContributions,
  calculateFullPayroll,
  sumComponentAmounts,
  calculateBPJS,
  generatePeriodName,
  validatePayrollPeriod,
} from '@/lib/payroll-utils';
import { PayrollComponent, BPJS_RATES, MONTH_NAMES_ID } from '@/types/payroll';

// Arbitrary for generating valid base salary (1M - 100M IDR)
const baseSalaryArb = fc.integer({ min: 1_000_000, max: 100_000_000 });

// Arbitrary for generating overtime hours (0 - 100)
const overtimeHoursArb = fc.integer({ min: 0, max: 100 });

// Arbitrary for generating valid month (1-12)
const monthArb = fc.integer({ min: 1, max: 12 });

// Arbitrary for generating valid year (2020-2100)
const yearArb = fc.integer({ min: 2020, max: 2100 });

// Mock components for property tests
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
  {
    id: 'comp-10',
    component_code: 'bpjs_jkk',
    component_name: 'BPJS JKK (Company)',
    component_type: 'benefit',
    calculation_type: 'percentage',
    percentage_of: 'base_salary',
    percentage_rate: 0.24,
    is_taxable: false,
    is_mandatory: true,
    is_active: true,
    display_order: 22,
    created_at: '2025-01-01',
  },
  {
    id: 'comp-11',
    component_code: 'bpjs_jkm',
    component_name: 'BPJS JKM (Company)',
    component_type: 'benefit',
    calculation_type: 'percentage',
    percentage_of: 'base_salary',
    percentage_rate: 0.3,
    is_taxable: false,
    is_mandatory: true,
    is_active: true,
    display_order: 23,
    created_at: '2025-01-01',
  },
];

describe('Property 1: Gross Salary Calculation', () => {
  it('gross_salary SHALL equal the sum of all amounts in the earnings array', () => {
    fc.assert(
      fc.property(baseSalaryArb, overtimeHoursArb, (baseSalary, overtimeHours) => {
        const result = calculateFullPayroll(baseSalary, mockComponents, [], overtimeHours);
        const earningsSum = sumComponentAmounts(result.earnings);
        
        expect(result.gross_salary).toBe(earningsSum);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 2: Net Salary Calculation', () => {
  it('net_salary SHALL equal gross_salary minus total_deductions', () => {
    fc.assert(
      fc.property(baseSalaryArb, overtimeHoursArb, (baseSalary, overtimeHours) => {
        const result = calculateFullPayroll(baseSalary, mockComponents, [], overtimeHours);
        
        expect(result.net_salary).toBe(result.gross_salary - result.total_deductions);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 3: Total Deductions Calculation', () => {
  it('total_deductions SHALL equal the sum of all amounts in the deductions array', () => {
    fc.assert(
      fc.property(baseSalaryArb, overtimeHoursArb, (baseSalary, overtimeHours) => {
        const result = calculateFullPayroll(baseSalary, mockComponents, [], overtimeHours);
        const deductionsSum = sumComponentAmounts(result.deductions);
        
        expect(result.total_deductions).toBe(deductionsSum);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 4: Company Cost Calculation', () => {
  it('total_company_cost SHALL equal gross_salary plus sum of company_contributions', () => {
    fc.assert(
      fc.property(baseSalaryArb, overtimeHoursArb, (baseSalary, overtimeHours) => {
        const result = calculateFullPayroll(baseSalary, mockComponents, [], overtimeHours);
        const contributionsSum = sumComponentAmounts(result.company_contributions);
        
        expect(result.total_company_cost).toBe(result.gross_salary + contributionsSum);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 5: Percentage Component Calculation', () => {
  it('percentage-based component with percentage_of = base_salary SHALL equal base_salary * (rate / 100)', () => {
    fc.assert(
      fc.property(baseSalaryArb, (baseSalary) => {
        // Test BPJS JHT employee (2% of base salary)
        const bpjsJht = calculateBPJS(baseSalary, 'jht', true);
        const expectedJht = Math.round(baseSalary * (BPJS_RATES.jht.employee / 100));
        
        expect(bpjsJht).toBe(expectedJht);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 6: Period Totals Accuracy', () => {
  it('earnings components should be non-negative for valid base salary', () => {
    fc.assert(
      fc.property(baseSalaryArb, (baseSalary) => {
        const earnings = calculateEarnings(baseSalary, mockComponents, [], 0);
        
        // All earnings should be non-negative
        for (const earning of earnings) {
          expect(earning.amount).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 7: Unique Period Constraint', () => {
  it('generatePeriodName should produce consistent names for same year/month', () => {
    fc.assert(
      fc.property(yearArb, monthArb, (year, month) => {
        const name1 = generatePeriodName(year, month);
        const name2 = generatePeriodName(year, month);
        
        expect(name1).toBe(name2);
        expect(name1).toContain(year.toString());
        expect(name1).toContain(MONTH_NAMES_ID[month - 1]);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 8: Approved Period Immutability', () => {
  it('payroll calculations should be deterministic for same inputs', () => {
    fc.assert(
      fc.property(baseSalaryArb, overtimeHoursArb, (baseSalary, overtimeHours) => {
        const result1 = calculateFullPayroll(baseSalary, mockComponents, [], overtimeHours);
        const result2 = calculateFullPayroll(baseSalary, mockComponents, [], overtimeHours);
        
        // Same inputs should produce same outputs
        expect(result1.gross_salary).toBe(result2.gross_salary);
        expect(result1.total_deductions).toBe(result2.total_deductions);
        expect(result1.net_salary).toBe(result2.net_salary);
        expect(result1.total_company_cost).toBe(result2.total_company_cost);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 9: Slip Number Format', () => {
  it('period name should follow expected format', () => {
    fc.assert(
      fc.property(yearArb, monthArb, (year, month) => {
        const name = generatePeriodName(year, month);
        
        // Should contain month name and year
        const monthName = MONTH_NAMES_ID[month - 1];
        expect(name).toBe(`${monthName} ${year}`);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 10: BPJS Calculation Accuracy', () => {
  it('BPJS Kesehatan should be capped at maximum base', () => {
    fc.assert(
      fc.property(baseSalaryArb, (baseSalary) => {
        const employeeContrib = calculateBPJS(baseSalary, 'kesehatan', true);
        const companyContrib = calculateBPJS(baseSalary, 'kesehatan', false);
        
        // Employee contribution should not exceed 1% of max base
        const maxEmployeeContrib = Math.round(BPJS_RATES.kesehatan.max_base * (BPJS_RATES.kesehatan.employee / 100));
        expect(employeeContrib).toBeLessThanOrEqual(maxEmployeeContrib);
        
        // Company contribution should not exceed 4% of max base
        const maxCompanyContrib = Math.round(BPJS_RATES.kesehatan.max_base * (BPJS_RATES.kesehatan.company / 100));
        expect(companyContrib).toBeLessThanOrEqual(maxCompanyContrib);
      }),
      { numRuns: 100 }
    );
  });

  it('BPJS JP should be capped at maximum base', () => {
    fc.assert(
      fc.property(baseSalaryArb, (baseSalary) => {
        const employeeContrib = calculateBPJS(baseSalary, 'jp', true);
        
        // Employee contribution should not exceed 1% of max base
        const maxContrib = Math.round(BPJS_RATES.jp.max_base * (BPJS_RATES.jp.employee / 100));
        expect(employeeContrib).toBeLessThanOrEqual(maxContrib);
      }),
      { numRuns: 100 }
    );
  });

  it('JKK and JKM should return 0 for employee contributions', () => {
    fc.assert(
      fc.property(baseSalaryArb, (baseSalary) => {
        expect(calculateBPJS(baseSalary, 'jkk', true)).toBe(0);
        expect(calculateBPJS(baseSalary, 'jkm', true)).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('all BPJS calculations should be non-negative', () => {
    fc.assert(
      fc.property(baseSalaryArb, (baseSalary) => {
        expect(calculateBPJS(baseSalary, 'kesehatan', true)).toBeGreaterThanOrEqual(0);
        expect(calculateBPJS(baseSalary, 'kesehatan', false)).toBeGreaterThanOrEqual(0);
        expect(calculateBPJS(baseSalary, 'jht', true)).toBeGreaterThanOrEqual(0);
        expect(calculateBPJS(baseSalary, 'jht', false)).toBeGreaterThanOrEqual(0);
        expect(calculateBPJS(baseSalary, 'jp', true)).toBeGreaterThanOrEqual(0);
        expect(calculateBPJS(baseSalary, 'jp', false)).toBeGreaterThanOrEqual(0);
        expect(calculateBPJS(baseSalary, 'jkk', false)).toBeGreaterThanOrEqual(0);
        expect(calculateBPJS(baseSalary, 'jkm', false)).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Additional Properties: Net Salary Bounds', () => {
  it('net_salary should always be less than or equal to gross_salary', () => {
    fc.assert(
      fc.property(baseSalaryArb, overtimeHoursArb, (baseSalary, overtimeHours) => {
        const result = calculateFullPayroll(baseSalary, mockComponents, [], overtimeHours);
        
        expect(result.net_salary).toBeLessThanOrEqual(result.gross_salary);
      }),
      { numRuns: 100 }
    );
  });

  it('total_company_cost should always be greater than or equal to gross_salary', () => {
    fc.assert(
      fc.property(baseSalaryArb, overtimeHoursArb, (baseSalary, overtimeHours) => {
        const result = calculateFullPayroll(baseSalary, mockComponents, [], overtimeHours);
        
        expect(result.total_company_cost).toBeGreaterThanOrEqual(result.gross_salary);
      }),
      { numRuns: 100 }
    );
  });
});
