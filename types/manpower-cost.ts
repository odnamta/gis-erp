// HR Manpower Cost Tracking Types

// Department type for manpower cost (inline to avoid circular dependencies)
export interface Department {
  id: string;
  department_code: string;
  department_name: string;
  is_active: boolean | null;
  manager_id: string | null;
  parent_department_id: string | null;
  created_at: string | null;
}

// Simplified department info for display
export interface DepartmentInfo {
  id: string;
  name: string;
}

// Manpower cost summary interface (matches database table)
export interface ManpowerCostSummary {
  id: string;
  department_id: string;
  period_year: number;
  period_month: number;
  employee_count: number;
  total_base_salary: number;
  total_allowances: number;
  total_overtime: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_company_contributions: number;
  total_company_cost: number;
  avg_salary: number;
  cost_per_employee: number;
  calculated_at: string | null;
  created_at: string;
}

// Manpower cost with department details for display
export interface ManpowerCostWithDepartment extends ManpowerCostSummary {
  department: DepartmentInfo;
}

// Totals for all departments combined
export interface ManpowerCostTotals {
  employee_count: number;
  total_base_salary: number;
  total_allowances: number;
  total_overtime: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_company_contributions: number;
  total_company_cost: number;
  avg_salary: number;
  cost_per_employee: number;
}

// Department cost with percentage for charts
export interface DepartmentCostPercentage {
  department_id: string;
  department_name: string;
  total_cost: number;
  percentage: number;
}

// Trend data point for line chart
export interface ManpowerCostTrendPoint {
  period_year: number;
  period_month: number;
  month_label: string;
  total_company_cost: number;
}

// Export row format for Excel
export interface ManpowerCostExportRow {
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
}

// Filter parameters
export interface ManpowerCostFilters {
  year: number;
  month: number;
}

// Dashboard data structure
export interface ManpowerCostDashboardData {
  summaries: ManpowerCostWithDepartment[];
  totals: ManpowerCostTotals;
  percentages: DepartmentCostPercentage[];
  trendData: ManpowerCostTrendPoint[];
}

// Month abbreviations for charts
export const MONTH_ABBREVIATIONS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const;

// Month names in Indonesian
export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
] as const;
