/**
 * Manpower Cost Utils Unit Tests
 * Feature: hr-manpower-cost-tracking
 */

import { describe, it, expect } from 'vitest';
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
  formatPeriodName,
} from '@/lib/manpower-cost-utils';
import { ManpowerCostSummary, ManpowerCostWithDepartment } from '@/types/manpower-cost';

// Helper to create mock summary
function createMockSummary(overrides: Partial<ManpowerCostSummary> = {}): ManpowerCostSummary {
  return {
    id: 'test-id',
    department_id: 'dept-1',
    period_year: 2025,
    period_month: 12,
    employee_count: 10,
    total_base_salary: 50000000,
    total_allowances: 10000000,
    total_overtime: 5000000,
    total_gross: 65000000,
    total_deductions: 5000000,
    total_net: 60000000,
    total_company_contributions: 8000000,
    total_company_cost: 73000000,
    avg_salary: 6500000,
    cost_per_employee: 7300000,
    calculated_at: '2025-12-21T00:00:00Z',
    created_at: '2025-12-21T00:00:00Z',
    ...overrides,
  };
}

function createMockSummaryWithDept(
  overrides: Partial<ManpowerCostWithDepartment> = {}
): ManpowerCostWithDepartment {
  return {
    ...createMockSummary(overrides),
    department: {
      id: overrides.department_id || 'dept-1',
      name: 'Operations',
    },
    ...overrides,
  };
}

describe('calculatePercentage', () => {
  it('should calculate correct percentage', () => {
    expect(calculatePercentage(25, 100)).toBe(25);
    expect(calculatePercentage(50, 200)).toBe(25);
    expect(calculatePercentage(100, 100)).toBe(100);
  });

  it('should return 0 when total is 0', () => {
    expect(calculatePercentage(100, 0)).toBe(0);
    expect(calculatePercentage(0, 0)).toBe(0);
  });

  it('should handle decimal percentages', () => {
    expect(calculatePercentage(1, 3)).toBeCloseTo(33.333, 2);
  });
});

describe('formatManpowerCurrency', () => {
  it('should format positive amounts with Rp prefix', () => {
    expect(formatManpowerCurrency(1000000)).toBe('Rp 1.000.000');
    expect(formatManpowerCurrency(0)).toBe('Rp 0');
  });

  it('should format negative amounts with minus sign', () => {
    expect(formatManpowerCurrency(-1000000)).toBe('-Rp 1.000.000');
  });

  it('should handle large numbers', () => {
    const result = formatManpowerCurrency(1000000000);
    expect(result.startsWith('Rp ')).toBe(true);
  });
});

describe('generateExportFilename', () => {
  it('should generate correct filename format', () => {
    expect(generateExportFilename(2025, 12)).toBe('manpower-cost-2025-12.xlsx');
    expect(generateExportFilename(2025, 1)).toBe('manpower-cost-2025-01.xlsx');
    expect(generateExportFilename(2025, 6)).toBe('manpower-cost-2025-06.xlsx');
  });

  it('should zero-pad single digit months', () => {
    for (let month = 1; month <= 9; month++) {
      const filename = generateExportFilename(2025, month);
      expect(filename).toContain(`-0${month}.xlsx`);
    }
  });
});

describe('sortByTotalCostDesc', () => {
  it('should sort departments by total_company_cost descending', () => {
    const departments: ManpowerCostWithDepartment[] = [
      createMockSummaryWithDept({ total_company_cost: 100 }),
      createMockSummaryWithDept({ total_company_cost: 300 }),
      createMockSummaryWithDept({ total_company_cost: 200 }),
    ];

    const sorted = sortByTotalCostDesc(departments);

    expect(sorted[0].total_company_cost).toBe(300);
    expect(sorted[1].total_company_cost).toBe(200);
    expect(sorted[2].total_company_cost).toBe(100);
  });

  it('should not mutate original array', () => {
    const departments: ManpowerCostWithDepartment[] = [
      createMockSummaryWithDept({ total_company_cost: 100 }),
      createMockSummaryWithDept({ total_company_cost: 300 }),
    ];

    const original = [...departments];
    sortByTotalCostDesc(departments);

    expect(departments[0].total_company_cost).toBe(original[0].total_company_cost);
  });

  it('should handle empty array', () => {
    expect(sortByTotalCostDesc([])).toEqual([]);
  });
});

describe('calculateTotalRow', () => {
  it('should sum all numeric fields correctly', () => {
    const summaries: ManpowerCostSummary[] = [
      createMockSummary({ employee_count: 10, total_gross: 100, total_company_cost: 150 }),
      createMockSummary({ employee_count: 5, total_gross: 50, total_company_cost: 75 }),
    ];

    const totals = calculateTotalRow(summaries);

    expect(totals.employee_count).toBe(15);
    expect(totals.total_gross).toBe(150);
    expect(totals.total_company_cost).toBe(225);
  });

  it('should calculate averages correctly', () => {
    const summaries: ManpowerCostSummary[] = [
      createMockSummary({ employee_count: 10, total_gross: 1000, total_company_cost: 1500 }),
      createMockSummary({ employee_count: 10, total_gross: 1000, total_company_cost: 1500 }),
    ];

    const totals = calculateTotalRow(summaries);

    expect(totals.avg_salary).toBe(100); // 2000 / 20
    expect(totals.cost_per_employee).toBe(150); // 3000 / 20
  });

  it('should return zeros for empty array', () => {
    const totals = calculateTotalRow([]);

    expect(totals.employee_count).toBe(0);
    expect(totals.total_gross).toBe(0);
    expect(totals.avg_salary).toBe(0);
  });
});

describe('getMonthAbbreviation', () => {
  it('should return correct abbreviations', () => {
    expect(getMonthAbbreviation(1)).toBe('Jan');
    expect(getMonthAbbreviation(6)).toBe('Jun');
    expect(getMonthAbbreviation(12)).toBe('Dec');
  });

  it('should return empty string for invalid months', () => {
    expect(getMonthAbbreviation(0)).toBe('');
    expect(getMonthAbbreviation(13)).toBe('');
    expect(getMonthAbbreviation(-1)).toBe('');
  });
});

describe('formatChartAxisValue', () => {
  it('should format billions with B suffix', () => {
    expect(formatChartAxisValue(1500000000)).toBe('1.5B');
    expect(formatChartAxisValue(2000000000)).toBe('2.0B');
  });

  it('should format millions with M suffix', () => {
    expect(formatChartAxisValue(200000000)).toBe('200M');
    expect(formatChartAxisValue(1500000)).toBe('2M');
  });

  it('should format thousands with K suffix', () => {
    expect(formatChartAxisValue(50000)).toBe('50K');
    expect(formatChartAxisValue(1500)).toBe('2K');
  });

  it('should return raw number for small values', () => {
    expect(formatChartAxisValue(500)).toBe('500');
    expect(formatChartAxisValue(0)).toBe('0');
  });
});

describe('validatePeriod', () => {
  it('should return true for valid periods', () => {
    expect(validatePeriod(2025, 1)).toBe(true);
    expect(validatePeriod(2025, 12)).toBe(true);
    expect(validatePeriod(2000, 6)).toBe(true);
    expect(validatePeriod(2099, 6)).toBe(true);
  });

  it('should return false for invalid years', () => {
    expect(validatePeriod(1999, 6)).toBe(false);
    expect(validatePeriod(2100, 6)).toBe(false);
  });

  it('should return false for invalid months', () => {
    expect(validatePeriod(2025, 0)).toBe(false);
    expect(validatePeriod(2025, 13)).toBe(false);
  });

  it('should return false for non-integers', () => {
    expect(validatePeriod(2025.5, 6)).toBe(false);
    expect(validatePeriod(2025, 6.5)).toBe(false);
  });
});

describe('getLastNMonths', () => {
  it('should return correct number of months', () => {
    const months = getLastNMonths(2025, 12, 6);
    expect(months.length).toBe(6);
  });

  it('should return months in chronological order', () => {
    const months = getLastNMonths(2025, 3, 4);
    
    expect(months[0]).toEqual({ year: 2024, month: 12 });
    expect(months[1]).toEqual({ year: 2025, month: 1 });
    expect(months[2]).toEqual({ year: 2025, month: 2 });
    expect(months[3]).toEqual({ year: 2025, month: 3 });
  });

  it('should handle year boundary correctly', () => {
    const months = getLastNMonths(2025, 2, 4);
    
    expect(months[0]).toEqual({ year: 2024, month: 11 });
    expect(months[1]).toEqual({ year: 2024, month: 12 });
    expect(months[2]).toEqual({ year: 2025, month: 1 });
    expect(months[3]).toEqual({ year: 2025, month: 2 });
  });

  it('should end with the specified month', () => {
    const months = getLastNMonths(2025, 6, 3);
    const lastMonth = months[months.length - 1];
    
    expect(lastMonth.year).toBe(2025);
    expect(lastMonth.month).toBe(6);
  });
});

describe('calculateDepartmentPercentages', () => {
  it('should calculate correct percentages', () => {
    const summaries: ManpowerCostWithDepartment[] = [
      createMockSummaryWithDept({ 
        department_id: 'dept-1', 
        total_company_cost: 60,
        department: { id: 'dept-1', name: 'Operations' }
      }),
      createMockSummaryWithDept({ 
        department_id: 'dept-2', 
        total_company_cost: 40,
        department: { id: 'dept-2', name: 'Finance' }
      }),
    ];

    const percentages = calculateDepartmentPercentages(summaries);

    expect(percentages[0].percentage).toBe(60);
    expect(percentages[1].percentage).toBe(40);
  });

  it('should sort by percentage descending', () => {
    const summaries: ManpowerCostWithDepartment[] = [
      createMockSummaryWithDept({ total_company_cost: 20 }),
      createMockSummaryWithDept({ total_company_cost: 80 }),
    ];

    const percentages = calculateDepartmentPercentages(summaries);

    expect(percentages[0].percentage).toBe(80);
    expect(percentages[1].percentage).toBe(20);
  });

  it('should handle empty array', () => {
    expect(calculateDepartmentPercentages([])).toEqual([]);
  });
});

describe('formatPeriodName', () => {
  it('should format period name correctly', () => {
    expect(formatPeriodName(2025, 12)).toBe('December 2025');
    expect(formatPeriodName(2025, 1)).toBe('January 2025');
    expect(formatPeriodName(2025, 6)).toBe('June 2025');
  });

  it('should handle invalid months', () => {
    expect(formatPeriodName(2025, 0)).toBe('2025');
    expect(formatPeriodName(2025, 13)).toBe('2025');
  });
});
