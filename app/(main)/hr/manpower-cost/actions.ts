'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  ManpowerCostSummary,
  ManpowerCostWithDepartment,
  ManpowerCostTrendPoint,
  DepartmentCostPercentage,
} from '@/types/manpower-cost';
import {
  calculateTotalRow,
  calculateDepartmentPercentages,
  getLastNMonths,
  getMonthAbbreviation,
  validatePeriod,
  generateExportFilename,
} from '@/lib/manpower-cost-utils';

// ============================================
// Manpower Cost Summary
// ============================================

/**
 * Refresh manpower cost summary for a period
 * Calls the database function to recalculate from payroll data
 */
export async function refreshManpowerCostSummary(
  year: number,
  month: number
): Promise<{ success: boolean; error?: string }> {
  if (!validatePeriod(year, month)) {
    return { success: false, error: 'Invalid year or month' };
  }

  const supabase = await createClient();
  
  // Call the database function to refresh summary
  const { error } = await supabase.rpc('refresh_manpower_cost_summary', {
    p_year: year,
    p_month: month,
  });

  if (error) {
    console.error('Error refreshing manpower cost summary:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr/manpower-cost');
  return { success: true };
}

/**
 * Get manpower cost summary for a period with department details
 */
export async function getManpowerCostSummary(
  year: number,
  month: number
): Promise<ManpowerCostWithDepartment[]> {
  if (!validatePeriod(year, month)) {
    return [];
  }

  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('manpower_cost_summary')
    .select(`
      *,
      department:departments(id, department_name)
    `)
    .eq('period_year', year)
    .eq('period_month', month)
    .order('total_company_cost', { ascending: false });

  if (error) {
    console.error('Error fetching manpower cost summary:', error);
    return [];
  }

  // Transform department data
  return (data || []).map(item => ({
    ...item,
    department: {
      id: item.department?.id || item.department_id,
      name: item.department?.department_name || 'Unknown',
    },
  }));
}

/**
 * Get total company cost for a period
 */
export async function getTotalCompanyCost(
  year: number,
  month: number
): Promise<number> {
  const summaries = await getManpowerCostSummary(year, month);
  const totals = calculateTotalRow(summaries);
  return totals.total_company_cost;
}

/**
 * Get cost trend data for last N months
 */
export async function getCostTrendData(
  endYear: number,
  endMonth: number,
  months: number = 6
): Promise<ManpowerCostTrendPoint[]> {
  if (!validatePeriod(endYear, endMonth)) {
    return [];
  }

  const supabase = await createClient();
  const periods = getLastNMonths(endYear, endMonth, months);
  
  const trendData: ManpowerCostTrendPoint[] = [];

  for (const period of periods) {
    const { data, error } = await supabase
      .from('manpower_cost_summary')
      .select('total_company_cost')
      .eq('period_year', period.year)
      .eq('period_month', period.month);

    if (error) {
      console.error('Error fetching trend data:', error);
      continue;
    }

    const totalCost = (data || []).reduce(
      (sum, item) => sum + (item.total_company_cost || 0),
      0
    );

    trendData.push({
      period_year: period.year,
      period_month: period.month,
      month_label: getMonthAbbreviation(period.month),
      total_company_cost: totalCost,
    });
  }

  return trendData;
}

/**
 * Get department cost percentages for chart
 */
export async function getDepartmentCostPercentages(
  year: number,
  month: number
): Promise<DepartmentCostPercentage[]> {
  const summaries = await getManpowerCostSummary(year, month);
  return calculateDepartmentPercentages(summaries);
}

/**
 * Get manpower cost for overhead allocation
 * Returns raw summary data for integration with overhead module
 */
export async function getManpowerCostForOverhead(
  year: number,
  month: number
): Promise<ManpowerCostSummary[]> {
  if (!validatePeriod(year, month)) {
    return [];
  }

  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('manpower_cost_summary')
    .select('*')
    .eq('period_year', year)
    .eq('period_month', month);

  if (error) {
    console.error('Error fetching manpower cost for overhead:', error);
    return [];
  }

  return data || [];
}

// ============================================
// Dashboard Data
// ============================================

/**
 * Get all dashboard data in a single call
 */
export async function getManpowerCostDashboardData(
  year: number,
  month: number
): Promise<{
  summaries: ManpowerCostWithDepartment[];
  totalCompanyCost: number;
  percentages: DepartmentCostPercentage[];
  trendData: ManpowerCostTrendPoint[];
}> {
  const summaries = await getManpowerCostSummary(year, month);
  const totals = calculateTotalRow(summaries);
  const percentages = calculateDepartmentPercentages(summaries);
  const trendData = await getCostTrendData(year, month, 6);

  return {
    summaries,
    totalCompanyCost: totals.total_company_cost,
    percentages,
    trendData,
  };
}

// ============================================
// Export
// ============================================

/**
 * Get export data for Excel download
 */
export async function getManpowerCostExportData(
  year: number,
  month: number
): Promise<{
  success: boolean;
  data?: {
    rows: Array<{
      department: string;
      employee_count: number;
      base_salary: number;
      allowances: number;
      overtime: number;
      gross_salary: number;
      deductions: number;
      net_salary: number;
      company_contributions: number;
      total_company_cost: number;
      avg_salary: number;
      cost_per_employee: number;
    }>;
    totals: {
      employee_count: number;
      base_salary: number;
      allowances: number;
      overtime: number;
      gross_salary: number;
      deductions: number;
      net_salary: number;
      company_contributions: number;
      total_company_cost: number;
      avg_salary: number;
      cost_per_employee: number;
    };
    filename: string;
  };
  error?: string;
}> {
  if (!validatePeriod(year, month)) {
    return { success: false, error: 'Invalid year or month' };
  }

  // Check user role for export permission
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['finance', 'super_admin', 'admin', 'manager'].includes(profile.role)) {
    return { success: false, error: 'You do not have permission to export data' };
  }

  const summaries = await getManpowerCostSummary(year, month);
  
  if (summaries.length === 0) {
    return { success: false, error: 'No data found for the specified period' };
  }

  const rows = summaries.map(s => ({
    department: s.department?.name || 'Unknown',
    employee_count: s.employee_count,
    base_salary: s.total_base_salary,
    allowances: s.total_allowances,
    overtime: s.total_overtime,
    gross_salary: s.total_gross,
    deductions: s.total_deductions,
    net_salary: s.total_net,
    company_contributions: s.total_company_contributions,
    total_company_cost: s.total_company_cost,
    avg_salary: s.avg_salary,
    cost_per_employee: s.cost_per_employee,
  }));

  const totals = calculateTotalRow(summaries);

  return {
    success: true,
    data: {
      rows,
      totals: {
        employee_count: totals.employee_count,
        base_salary: totals.total_base_salary,
        allowances: totals.total_allowances,
        overtime: totals.total_overtime,
        gross_salary: totals.total_gross,
        deductions: totals.total_deductions,
        net_salary: totals.total_net,
        company_contributions: totals.total_company_contributions,
        total_company_cost: totals.total_company_cost,
        avg_salary: totals.avg_salary,
        cost_per_employee: totals.cost_per_employee,
      },
      filename: generateExportFilename(year, month),
    },
  };
}

// ============================================
// Available Periods
// ============================================

/**
 * Get list of available periods (from payroll_periods)
 */
export async function getAvailablePeriods(): Promise<Array<{ year: number; month: number; name: string }>> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('period_year, period_month, period_name')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });

  if (error) {
    console.error('Error fetching available periods:', error);
    return [];
  }

  return (data || []).map(p => ({
    year: p.period_year,
    month: p.period_month,
    name: p.period_name,
  }));
}
