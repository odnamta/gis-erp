/**
 * Manpower Cost Utils Property-Based Tests
 * Feature: hr-manpower-cost-tracking
 * 
 * These tests verify universal correctness properties across many generated inputs.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculatePercentage,
  formatManpowerCurrency,
  generateExportFilename,
  sortByTotalCostDesc,
  calculateTotalRow,
  getMonthAbbreviation,
  formatChartAxisValue,
  validatePeriod,
  getLastNMonths,
  calculateDepartmentPercentages,
} from '@/lib/manpower-cost-utils';
import { ManpowerCostSummary, ManpowerCostWithDepartment } from '@/types/manpower-cost';

// Arbitrary for generating valid amounts (0 - 10B IDR)
const amountArb = fc.integer({ min: 0, max: 10_000_000_000 });

// Arbitrary for generating positive amounts (1 - 10B IDR)
const positiveAmountArb = fc.integer({ min: 1, max: 10_000_000_000 });

// Arbitrary for generating valid month (1-12)
const monthArb = fc.integer({ min: 1, max: 12 });

// Arbitrary for generating valid year (2000-2099)
const yearArb = fc.integer({ min: 2000, max: 2099 });

// Arbitrary for generating employee count (1-1000)
const employeeCountArb = fc.integer({ min: 1, max: 1000 });

// Arbitrary for generating a ManpowerCostSummary
const manpowerCostSummaryArb = fc.record({
  id: fc.uuid(),
  department_id: fc.uuid(),
  period_year: yearArb,
  period_month: monthArb,
  employee_count: employeeCountArb,
  total_base_salary: amountArb,
  total_allowances: amountArb,
  total_overtime: amountArb,
  total_gross: amountArb,
  total_deductions: amountArb,
  total_net: amountArb,
  total_company_contributions: amountArb,
  total_company_cost: amountArb,
  avg_salary: amountArb,
  cost_per_employee: amountArb,
  calculated_at: fc.constant(new Date().toISOString()),
  created_at: fc.constant(new Date().toISOString()),
});

// Arbitrary for generating ManpowerCostWithDepartment
const manpowerCostWithDeptArb = fc.record({
  id: fc.uuid(),
  department_id: fc.uuid(),
  period_year: yearArb,
  period_month: monthArb,
  employee_count: employeeCountArb,
  total_base_salary: amountArb,
  total_allowances: amountArb,
  total_overtime: amountArb,
  total_gross: amountArb,
  total_deductions: amountArb,
  total_net: amountArb,
  total_company_contributions: amountArb,
  total_company_cost: positiveAmountArb, // Ensure positive for sorting tests
  avg_salary: amountArb,
  cost_per_employee: amountArb,
  calculated_at: fc.constant(new Date().toISOString()),
  created_at: fc.constant(new Date().toISOString()),
  department: fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
  }),
});

describe('Property 5: Total Row Calculation', () => {
  /**
   * Feature: hr-manpower-cost-tracking, Property 5: Total Row Calculation
   * For any set of department summaries, the calculateTotalRow function SHALL return
   * totals where each sum field equals the sum of that field across all input summaries.
   * Validates: Requirements 3.5
   */
  it('total row sums should equal sum of all department values', () => {
    fc.assert(
      fc.property(fc.array(manpowerCostSummaryArb, { minLength: 0, maxLength: 20 }), (summaries) => {
        const totals = calculateTotalRow(summaries);
        
        // Calculate expected sums manually
        const expectedEmployeeCount = summaries.reduce((sum, s) => sum + s.employee_count, 0);
        const expectedBaseSalary = summaries.reduce((sum, s) => sum + s.total_base_salary, 0);
        const expectedAllowances = summaries.reduce((sum, s) => sum + s.total_allowances, 0);
        const expectedOvertime = summaries.reduce((sum, s) => sum + s.total_overtime, 0);
        const expectedGross = summaries.reduce((sum, s) => sum + s.total_gross, 0);
        const expectedDeductions = summaries.reduce((sum, s) => sum + s.total_deductions, 0);
        const expectedNet = summaries.reduce((sum, s) => sum + s.total_net, 0);
        const expectedContributions = summaries.reduce((sum, s) => sum + s.total_company_contributions, 0);
        const expectedCompanyCost = summaries.reduce((sum, s) => sum + s.total_company_cost, 0);
        
        expect(totals.employee_count).toBe(expectedEmployeeCount);
        expect(totals.total_base_salary).toBe(expectedBaseSalary);
        expect(totals.total_allowances).toBe(expectedAllowances);
        expect(totals.total_overtime).toBe(expectedOvertime);
        expect(totals.total_gross).toBe(expectedGross);
        expect(totals.total_deductions).toBe(expectedDeductions);
        expect(totals.total_net).toBe(expectedNet);
        expect(totals.total_company_contributions).toBe(expectedContributions);
        expect(totals.total_company_cost).toBe(expectedCompanyCost);
      }),
      { numRuns: 100 }
    );
  });

  it('average calculations should be correct when employee_count > 0', () => {
    fc.assert(
      fc.property(
        fc.array(manpowerCostSummaryArb, { minLength: 1, maxLength: 20 }),
        (summaries) => {
          const totals = calculateTotalRow(summaries);
          
          if (totals.employee_count > 0) {
            expect(totals.avg_salary).toBe(totals.total_gross / totals.employee_count);
            expect(totals.cost_per_employee).toBe(totals.total_company_cost / totals.employee_count);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty array should return zero totals', () => {
    const totals = calculateTotalRow([]);
    
    expect(totals.employee_count).toBe(0);
    expect(totals.total_gross).toBe(0);
    expect(totals.total_company_cost).toBe(0);
    expect(totals.avg_salary).toBe(0);
    expect(totals.cost_per_employee).toBe(0);
  });
});

describe('Property 6: Percentage Calculation', () => {
  /**
   * Feature: hr-manpower-cost-tracking, Property 6: Percentage Calculation
   * For any department cost and company total cost where total > 0,
   * calculatePercentage(departmentCost, totalCost) SHALL return (departmentCost / totalCost) * 100.
   * Validates: Requirements 4.2
   */
  it('percentage should equal (departmentCost / totalCost) * 100', () => {
    fc.assert(
      fc.property(amountArb, positiveAmountArb, (departmentCost, totalCost) => {
        const percentage = calculatePercentage(departmentCost, totalCost);
        const expected = (departmentCost / totalCost) * 100;
        
        expect(percentage).toBeCloseTo(expected, 10);
      }),
      { numRuns: 100 }
    );
  });

  it('percentage should be 0 when totalCost is 0', () => {
    fc.assert(
      fc.property(amountArb, (departmentCost) => {
        const percentage = calculatePercentage(departmentCost, 0);
        expect(percentage).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('percentage should be between 0 and 100 when departmentCost <= totalCost', () => {
    fc.assert(
      fc.property(positiveAmountArb, (totalCost) => {
        const departmentCost = Math.floor(Math.random() * totalCost);
        const percentage = calculatePercentage(departmentCost, totalCost);
        
        expect(percentage).toBeGreaterThanOrEqual(0);
        expect(percentage).toBeLessThanOrEqual(100);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 7: Department Ordering', () => {
  /**
   * Feature: hr-manpower-cost-tracking, Property 7: Department Ordering
   * For any array of department summaries, sortByTotalCostDesc SHALL return an array
   * where each element's total_company_cost is >= the next element's total_company_cost.
   * Validates: Requirements 4.4
   */
  it('sorted array should be in descending order by total_company_cost', () => {
    fc.assert(
      fc.property(
        fc.array(manpowerCostWithDeptArb, { minLength: 0, maxLength: 20 }),
        (departments) => {
          const sorted = sortByTotalCostDesc(departments as ManpowerCostWithDepartment[]);
          
          for (let i = 0; i < sorted.length - 1; i++) {
            expect(sorted[i].total_company_cost).toBeGreaterThanOrEqual(
              sorted[i + 1].total_company_cost
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sorting should not change array length', () => {
    fc.assert(
      fc.property(
        fc.array(manpowerCostWithDeptArb, { minLength: 0, maxLength: 20 }),
        (departments) => {
          const sorted = sortByTotalCostDesc(departments as ManpowerCostWithDepartment[]);
          expect(sorted.length).toBe(departments.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sorting should not mutate original array', () => {
    fc.assert(
      fc.property(
        fc.array(manpowerCostWithDeptArb, { minLength: 1, maxLength: 20 }),
        (departments) => {
          const original = [...departments];
          sortByTotalCostDesc(departments as ManpowerCostWithDepartment[]);
          
          // Original array should be unchanged
          expect(departments).toEqual(original);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 8: Currency Formatting', () => {
  /**
   * Feature: hr-manpower-cost-tracking, Property 8: Currency Formatting
   * For any non-negative number, formatManpowerCurrency SHALL return a string
   * that starts with "Rp " and contains properly formatted digits.
   * Validates: Requirements 3.6
   */
  it('formatted currency should start with "Rp "', () => {
    fc.assert(
      fc.property(amountArb, (amount) => {
        const formatted = formatManpowerCurrency(amount);
        expect(formatted.startsWith('Rp ')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('negative amounts should be formatted with minus sign', () => {
    fc.assert(
      fc.property(positiveAmountArb, (amount) => {
        const formatted = formatManpowerCurrency(-amount);
        expect(formatted.startsWith('-Rp ')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('zero should be formatted as "Rp 0"', () => {
    const formatted = formatManpowerCurrency(0);
    expect(formatted).toBe('Rp 0');
  });
});

describe('Property 9: Export Filename Format', () => {
  /**
   * Feature: hr-manpower-cost-tracking, Property 9: Export Filename Format
   * For any valid year (2000-2099) and month (1-12), generateExportFilename SHALL return
   * a string matching the pattern "manpower-cost-{year}-{month}.xlsx" where month is zero-padded.
   * Validates: Requirements 6.5
   */
  it('filename should match pattern manpower-cost-YYYY-MM.xlsx', () => {
    fc.assert(
      fc.property(yearArb, monthArb, (year, month) => {
        const filename = generateExportFilename(year, month);
        const paddedMonth = month.toString().padStart(2, '0');
        const expected = `manpower-cost-${year}-${paddedMonth}.xlsx`;
        
        expect(filename).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('filename should always end with .xlsx', () => {
    fc.assert(
      fc.property(yearArb, monthArb, (year, month) => {
        const filename = generateExportFilename(year, month);
        expect(filename.endsWith('.xlsx')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('month should always be zero-padded to 2 digits', () => {
    fc.assert(
      fc.property(yearArb, monthArb, (year, month) => {
        const filename = generateExportFilename(year, month);
        // Extract month part from filename
        const match = filename.match(/manpower-cost-\d{4}-(\d{2})\.xlsx/);
        expect(match).not.toBeNull();
        expect(match![1].length).toBe(2);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Additional Properties: Utility Functions', () => {
  it('getMonthAbbreviation should return 3-letter abbreviation for valid months', () => {
    fc.assert(
      fc.property(monthArb, (month) => {
        const abbrev = getMonthAbbreviation(month);
        expect(abbrev.length).toBe(3);
      }),
      { numRuns: 100 }
    );
  });

  it('getMonthAbbreviation should return empty string for invalid months', () => {
    expect(getMonthAbbreviation(0)).toBe('');
    expect(getMonthAbbreviation(13)).toBe('');
    expect(getMonthAbbreviation(-1)).toBe('');
  });

  it('validatePeriod should return true for valid year/month combinations', () => {
    fc.assert(
      fc.property(yearArb, monthArb, (year, month) => {
        expect(validatePeriod(year, month)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('validatePeriod should return false for invalid inputs', () => {
    expect(validatePeriod(1999, 6)).toBe(false); // Year too low
    expect(validatePeriod(2100, 6)).toBe(false); // Year too high
    expect(validatePeriod(2025, 0)).toBe(false); // Month too low
    expect(validatePeriod(2025, 13)).toBe(false); // Month too high
    expect(validatePeriod(2025.5, 6)).toBe(false); // Non-integer year
    expect(validatePeriod(2025, 6.5)).toBe(false); // Non-integer month
  });

  it('getLastNMonths should return correct number of months', () => {
    fc.assert(
      fc.property(yearArb, monthArb, fc.integer({ min: 1, max: 24 }), (year, month, count) => {
        const months = getLastNMonths(year, month, count);
        expect(months.length).toBe(count);
      }),
      { numRuns: 100 }
    );
  });

  it('getLastNMonths should return months in chronological order', () => {
    fc.assert(
      fc.property(yearArb, monthArb, fc.integer({ min: 2, max: 12 }), (year, month, count) => {
        const months = getLastNMonths(year, month, count);
        
        for (let i = 0; i < months.length - 1; i++) {
          const current = months[i].year * 12 + months[i].month;
          const next = months[i + 1].year * 12 + months[i + 1].month;
          expect(next).toBeGreaterThan(current);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('getLastNMonths should end with the specified month', () => {
    fc.assert(
      fc.property(yearArb, monthArb, fc.integer({ min: 1, max: 12 }), (year, month, count) => {
        const months = getLastNMonths(year, month, count);
        const lastMonth = months[months.length - 1];
        
        expect(lastMonth.year).toBe(year);
        expect(lastMonth.month).toBe(month);
      }),
      { numRuns: 100 }
    );
  });

  it('formatChartAxisValue should format large numbers with suffix', () => {
    expect(formatChartAxisValue(1_500_000_000)).toBe('1.5B');
    expect(formatChartAxisValue(200_000_000)).toBe('200M');
    expect(formatChartAxisValue(50_000)).toBe('50K');
    expect(formatChartAxisValue(500)).toBe('500');
  });

  it('calculateDepartmentPercentages should sum to approximately 100%', () => {
    fc.assert(
      fc.property(
        fc.array(manpowerCostWithDeptArb, { minLength: 1, maxLength: 10 }),
        (departments) => {
          const percentages = calculateDepartmentPercentages(departments as ManpowerCostWithDepartment[]);
          const totalPercentage = percentages.reduce((sum, p) => sum + p.percentage, 0);
          
          // Should sum to approximately 100% (allowing for floating point errors)
          expect(totalPercentage).toBeCloseTo(100, 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});
