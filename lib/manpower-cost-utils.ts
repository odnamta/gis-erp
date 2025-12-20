// Manpower Cost Utility Functions

import {
  ManpowerCostSummary,
  ManpowerCostWithDepartment,
  ManpowerCostTotals,
  DepartmentCostPercentage,
  MONTH_ABBREVIATIONS,
} from '@/types/manpower-cost';

/**
 * Calculate percentage of department cost relative to total
 * @param departmentCost - Cost for a single department
 * @param totalCost - Total cost across all departments
 * @returns Percentage value (0-100)
 */
export function calculatePercentage(
  departmentCost: number,
  totalCost: number
): number {
  if (totalCost <= 0) return 0;
  return (departmentCost / totalCost) * 100;
}

/**
 * Format currency in Indonesian Rupiah
 * @param amount - Numeric amount to format
 * @returns Formatted string with "Rp " prefix
 */
export function formatManpowerCurrency(amount: number): string {
  if (amount < 0) {
    return `-Rp ${Math.abs(amount).toLocaleString('id-ID')}`;
  }
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

/**
 * Generate export filename for Excel download
 * @param year - Period year
 * @param month - Period month (1-12)
 * @returns Filename in format "manpower-cost-YYYY-MM.xlsx"
 */
export function generateExportFilename(year: number, month: number): string {
  const paddedMonth = month.toString().padStart(2, '0');
  return `manpower-cost-${year}-${paddedMonth}.xlsx`;
}

/**
 * Sort departments by total company cost in descending order
 * @param departments - Array of department cost summaries
 * @returns Sorted array (new array, does not mutate input)
 */
export function sortByTotalCostDesc(
  departments: ManpowerCostWithDepartment[]
): ManpowerCostWithDepartment[] {
  return [...departments].sort(
    (a, b) => b.total_company_cost - a.total_company_cost
  );
}

/**
 * Calculate total row from department summaries
 * @param summaries - Array of department cost summaries
 * @returns Totals object with summed values
 */
export function calculateTotalRow(
  summaries: ManpowerCostSummary[]
): ManpowerCostTotals {
  const totals: ManpowerCostTotals = {
    employee_count: 0,
    total_base_salary: 0,
    total_allowances: 0,
    total_overtime: 0,
    total_gross: 0,
    total_deductions: 0,
    total_net: 0,
    total_company_contributions: 0,
    total_company_cost: 0,
    avg_salary: 0,
    cost_per_employee: 0,
  };

  for (const summary of summaries) {
    totals.employee_count += summary.employee_count;
    totals.total_base_salary += summary.total_base_salary;
    totals.total_allowances += summary.total_allowances;
    totals.total_overtime += summary.total_overtime;
    totals.total_gross += summary.total_gross;
    totals.total_deductions += summary.total_deductions;
    totals.total_net += summary.total_net;
    totals.total_company_contributions += summary.total_company_contributions;
    totals.total_company_cost += summary.total_company_cost;
  }

  // Calculate averages
  if (totals.employee_count > 0) {
    totals.avg_salary = totals.total_gross / totals.employee_count;
    totals.cost_per_employee = totals.total_company_cost / totals.employee_count;
  }

  return totals;
}

/**
 * Get month abbreviation for chart labels
 * @param month - Month number (1-12)
 * @returns Three-letter month abbreviation
 */
export function getMonthAbbreviation(month: number): string {
  if (month < 1 || month > 12) return '';
  return MONTH_ABBREVIATIONS[month - 1];
}

/**
 * Format large numbers for chart axis (e.g., 180M, 1.5B)
 * @param value - Numeric value to format
 * @returns Formatted string with suffix
 */
export function formatChartAxisValue(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(0)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toString();
}

/**
 * Validate period parameters
 * @param year - Year to validate
 * @param month - Month to validate
 * @returns True if valid, false otherwise
 */
export function validatePeriod(year: number, month: number): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    year >= 2000 &&
    year <= 2099 &&
    month >= 1 &&
    month <= 12
  );
}

/**
 * Get last N months from a given period
 * @param endYear - End year
 * @param endMonth - End month (1-12)
 * @param count - Number of months to retrieve
 * @returns Array of {year, month} objects in chronological order
 */
export function getLastNMonths(
  endYear: number,
  endMonth: number,
  count: number
): Array<{ year: number; month: number }> {
  const months: Array<{ year: number; month: number }> = [];
  
  let year = endYear;
  let month = endMonth;
  
  for (let i = 0; i < count; i++) {
    months.unshift({ year, month });
    month--;
    if (month < 1) {
      month = 12;
      year--;
    }
  }
  
  return months;
}

/**
 * Calculate department cost percentages for chart
 * @param summaries - Array of department cost summaries
 * @returns Array of department percentages sorted by percentage descending
 */
export function calculateDepartmentPercentages(
  summaries: ManpowerCostWithDepartment[]
): DepartmentCostPercentage[] {
  const totalCost = summaries.reduce(
    (sum, s) => sum + s.total_company_cost,
    0
  );

  return summaries
    .map((s) => ({
      department_id: s.department_id,
      department_name: s.department?.name || 'Unknown',
      total_cost: s.total_company_cost,
      percentage: calculatePercentage(s.total_company_cost, totalCost),
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

/**
 * Format period display name
 * @param year - Period year
 * @param month - Period month (1-12)
 * @returns Formatted period name (e.g., "December 2025")
 */
export function formatPeriodName(year: number, month: number): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  if (month < 1 || month > 12) return `${year}`;
  return `${monthNames[month - 1]} ${year}`;
}
