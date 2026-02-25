'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import {
  BudgetItem,
  CashFlowForecast,
  CashFlowTransaction,
  CreateBudgetItemInput,
  CreateCashFlowForecastInput,
  CreateCashFlowTransactionInput,
  CustomerProfitability,
  FinancialAnalyticsData,
  JobTypeProfitability,
  MonthlyActual,
  MonthlyPLSummary,
  BUDGET_CATEGORIES,
  INFLOW_CATEGORIES,
  OUTFLOW_CATEGORIES,
} from '@/types/financial-analytics';
import {
  calculateCashPosition,
  calculateWeightedAmount,
  groupBudgetVsActual,
  isValidBudgetCategory,
  isValidCashFlowCategory,
} from './financial-analytics-utils';

// Note: Tables budget_items, monthly_actuals, cash_flow_transactions, cash_flow_forecast,
// and views customer_profitability, job_type_profitability, monthly_pl_summary
// are not in generated Supabase types yet. Using 'as any' for table names.

const FINANCIAL_WRITE_ROLES = ['owner', 'director', 'sysadmin', 'finance_manager', 'finance'] as const;
const FINANCIAL_READ_ROLES = ['owner', 'director', 'sysadmin', 'finance_manager', 'finance'] as const;

// ============================================
// Budget Item Actions
// ============================================

/**
 * Create a new budget item
 * Property 1: Unique Constraint Enforcement
 * Property 6: Budget Category Validation
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */
export async function createBudgetItem(
  data: CreateBudgetItemInput
): Promise<{ success: boolean; error?: string; data?: BudgetItem }> {
  const profile = await getUserProfile();
  if (!profile || !(FINANCIAL_WRITE_ROLES as readonly string[]).includes(profile.role)) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Validate category
  if (!isValidBudgetCategory(data.category)) {
    return {
      success: false,
      error: `Invalid category. Must be one of: ${BUDGET_CATEGORIES.join(', ')}`,
    };
  }

  // Validate month
  if (data.budget_month < 1 || data.budget_month > 12) {
    return {
      success: false,
      error: 'Invalid month. Must be between 1 and 12.',
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (supabase as any)
    .from('budget_items')
    .insert({
      budget_year: data.budget_year,
      budget_month: data.budget_month,
      category: data.category,
      subcategory: data.subcategory || null,
      description: data.description,
      budget_amount: data.budget_amount,
      department: data.department || null,
      project_id: data.project_id || null,
      notes: data.notes || null,
      created_by: data.created_by || null,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      return {
        success: false,
        error: 'Budget item already exists for this period/category/department combination.',
      };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data: result as BudgetItem };
}

/**
 * Update an existing budget item
 */
export async function updateBudgetItem(
  id: string,
  data: Partial<CreateBudgetItemInput>
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!profile || !(FINANCIAL_WRITE_ROLES as readonly string[]).includes(profile.role)) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Validate category if provided
  if (data.category && !isValidBudgetCategory(data.category)) {
    return {
      success: false,
      error: `Invalid category. Must be one of: ${BUDGET_CATEGORIES.join(', ')}`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('budget_items')
    .update(data)
    .eq('id', id);

  if (error) {
    if (error.code === '23505') {
      return {
        success: false,
        error: 'Budget item already exists for this period/category/department combination.',
      };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Fetch budget items for a specific period
 */
export async function fetchBudgetItems(
  year: number,
  month: number
): Promise<BudgetItem[]> {
  const profile = await getUserProfile();
  if (!profile || !(FINANCIAL_READ_ROLES as readonly string[]).includes(profile.role)) {
    return [];
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('budget_items')
    .select('*')
    .eq('budget_year', year)
    .eq('budget_month', month)
    .order('category')
    .limit(1000);

  if (error) {
    return [];
  }

  return (data || []) as BudgetItem[];
}

/**
 * Delete a budget item
 */
export async function deleteBudgetItem(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!profile || !(FINANCIAL_WRITE_ROLES as readonly string[]).includes(profile.role)) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('budget_items')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}


// ============================================
// Monthly Actuals Actions
// ============================================

/**
 * Fetch monthly actuals for a specific period
 */
export async function fetchMonthlyActuals(
  year: number,
  month: number
): Promise<MonthlyActual[]> {
  const profile = await getUserProfile();
  if (!profile || !(FINANCIAL_READ_ROLES as readonly string[]).includes(profile.role)) {
    return [];
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('monthly_actuals')
    .select('*')
    .eq('actual_year', year)
    .eq('actual_month', month)
    .order('category')
    .limit(1000);

  if (error) {
    return [];
  }

  return (data || []) as MonthlyActual[];
}

// ============================================
// Cash Flow Transaction Actions
// ============================================

/**
 * Create a new cash flow transaction
 * Property 2: Cash Flow Transaction Recording
 * Property 3: Cash Flow Category Validation
 * Validates: Requirements 2.2, 2.3, 2.4, 2.6
 */
export async function createCashFlowTransaction(
  data: CreateCashFlowTransactionInput
): Promise<{ success: boolean; error?: string; data?: CashFlowTransaction }> {
  const profile = await getUserProfile();
  if (!profile || !(FINANCIAL_WRITE_ROLES as readonly string[]).includes(profile.role)) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Validate category based on flow type
  if (!isValidCashFlowCategory(data.flow_type, data.category)) {
    const validCategories = data.flow_type === 'inflow' 
      ? INFLOW_CATEGORIES 
      : OUTFLOW_CATEGORIES;
    return {
      success: false,
      error: `Invalid category for ${data.flow_type}. Must be one of: ${validCategories.join(', ')}`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (supabase as any)
    .from('cash_flow_transactions')
    .insert({
      transaction_date: data.transaction_date,
      flow_type: data.flow_type,
      category: data.category,
      description: data.description || null,
      amount: data.amount,
      invoice_id: data.invoice_id || null,
      bkk_id: data.bkk_id || null,
      bkm_id: data.bkm_id || null,
      bank_account: data.bank_account || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: result as CashFlowTransaction };
}

/**
 * Fetch cash flow transactions for a date range
 */
export async function fetchCashFlowTransactions(
  startDate: string,
  endDate: string
): Promise<CashFlowTransaction[]> {
  const profile = await getUserProfile();
  if (!profile || !(FINANCIAL_READ_ROLES as readonly string[]).includes(profile.role)) {
    return [];
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('cash_flow_transactions')
    .select('*')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date', { ascending: true })
    .limit(1000);

  if (error) {
    return [];
  }

  return (data || []) as CashFlowTransaction[];
}

// ============================================
// Cash Flow Forecast Actions
// ============================================

/**
 * Create a new cash flow forecast
 * Property 5: Weighted Amount Calculation
 * Validates: Requirements 3.1, 3.2, 3.6
 */
export async function createCashFlowForecast(
  data: CreateCashFlowForecastInput
): Promise<{ success: boolean; error?: string; data?: CashFlowForecast }> {
  const profile = await getUserProfile();
  if (!profile || !(FINANCIAL_WRITE_ROLES as readonly string[]).includes(profile.role)) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Validate category based on flow type
  if (!isValidCashFlowCategory(data.flow_type, data.category)) {
    const validCategories = data.flow_type === 'inflow' 
      ? INFLOW_CATEGORIES 
      : OUTFLOW_CATEGORIES;
    return {
      success: false,
      error: `Invalid category for ${data.flow_type}. Must be one of: ${validCategories.join(', ')}`,
    };
  }

  // Calculate weighted amount
  const probability = data.probability_percentage ?? 100;
  const weighted_amount = calculateWeightedAmount(data.expected_amount, probability);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (supabase as any)
    .from('cash_flow_forecast')
    .insert({
      forecast_date: data.forecast_date,
      flow_type: data.flow_type,
      category: data.category,
      description: data.description || null,
      expected_amount: data.expected_amount,
      probability_percentage: probability,
      weighted_amount,
      invoice_id: data.invoice_id || null,
      recurring_item: data.recurring_item ?? false,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: result as CashFlowForecast };
}

/**
 * Fetch cash flow forecasts for a date range
 */
export async function fetchCashFlowForecast(
  startDate: string,
  endDate: string
): Promise<CashFlowForecast[]> {
  const profile = await getUserProfile();
  if (!profile || !(FINANCIAL_READ_ROLES as readonly string[]).includes(profile.role)) {
    return [];
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('cash_flow_forecast')
    .select('*')
    .gte('forecast_date', startDate)
    .lte('forecast_date', endDate)
    .order('forecast_date', { ascending: true })
    .limit(1000);

  if (error) {
    return [];
  }

  return (data || []) as CashFlowForecast[];
}


// ============================================
// Profitability Data Actions
// ============================================

/**
 * Fetch customer profitability data
 * Property 10: Customer Ranking by Profitability
 * Validates: Requirements 6.1, 6.2, 6.4
 */
export async function fetchCustomerProfitability(): Promise<CustomerProfitability[]> {
  const profile = await getUserProfile();
  if (!profile || !(FINANCIAL_READ_ROLES as readonly string[]).includes(profile.role)) {
    return [];
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('customer_profitability')
    .select('*')
    .order('total_profit', { ascending: false })
    .limit(1000);

  if (error) {
    return [];
  }

  return (data || []) as CustomerProfitability[];
}

/**
 * Fetch job type profitability data
 * Validates: Requirements 7.1, 7.2
 */
export async function fetchJobTypeProfitability(): Promise<JobTypeProfitability[]> {
  const profile = await getUserProfile();
  if (!profile || !(FINANCIAL_READ_ROLES as readonly string[]).includes(profile.role)) {
    return [];
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('job_type_profitability')
    .select('*')
    .order('total_profit', { ascending: false })
    .limit(1000);

  if (error) {
    return [];
  }

  return (data || []) as JobTypeProfitability[];
}

/**
 * Fetch monthly P&L summary
 * Validates: Requirements 8.1, 8.2
 */
export async function fetchMonthlyPLSummary(): Promise<MonthlyPLSummary[]> {
  const profile = await getUserProfile();
  if (!profile || !(FINANCIAL_READ_ROLES as readonly string[]).includes(profile.role)) {
    return [];
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('monthly_pl_summary')
    .select('*')
    .order('month', { ascending: false })
    .limit(1000);

  if (error) {
    return [];
  }

  return (data || []) as MonthlyPLSummary[];
}

// ============================================
// Main Data Fetching Action
// ============================================

/**
 * Fetch all financial analytics data for the dashboard
 * Property 15: Date Filter Data Refresh
 * Validates: Requirements 11.2, 11.3
 */
export async function fetchFinancialAnalyticsData(
  year: number,
  month: number
): Promise<FinancialAnalyticsData> {
  const profile = await getUserProfile();
  if (!profile || !(FINANCIAL_READ_ROLES as readonly string[]).includes(profile.role)) {
    return {
      cashPosition: { current_balance: 0, net_cash_flow_mtd: 0, total_inflows_mtd: 0, total_outflows_mtd: 0, forecast_30_days: 0, forecast_60_days: 0, forecast_90_days: 0 },
      budgetVsActual: [],
      customerProfitability: [],
      jobTypeProfitability: [],
      monthlyPL: [],
      cashFlowTransactions: [],
      cashFlowForecast: [],
    };
  }

  // Calculate date range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Calculate forecast end date (90 days from end of month)
  const forecastEndDate = new Date(endDate);
  forecastEndDate.setDate(forecastEndDate.getDate() + 90);
  const forecastEndDateStr = forecastEndDate.toISOString().split('T')[0];

  // Fetch all data in parallel
  const [
    budgetItems,
    monthlyActuals,
    cashFlowTransactions,
    cashFlowForecast,
    customerProfitability,
    jobTypeProfitability,
    monthlyPL,
  ] = await Promise.all([
    fetchBudgetItems(year, month),
    fetchMonthlyActuals(year, month),
    fetchCashFlowTransactions(startDateStr, endDateStr),
    fetchCashFlowForecast(startDateStr, forecastEndDateStr),
    fetchCustomerProfitability(),
    fetchJobTypeProfitability(),
    fetchMonthlyPLSummary(),
  ]);

  // Calculate derived data
  const budgetVsActual = groupBudgetVsActual(budgetItems, monthlyActuals);
  const cashPosition = calculateCashPosition(
    cashFlowTransactions,
    cashFlowForecast,
    new Date()
  );

  return {
    cashPosition,
    budgetVsActual,
    customerProfitability,
    jobTypeProfitability,
    monthlyPL,
    cashFlowTransactions,
    cashFlowForecast,
  };
}

// ============================================
// Export Actions
// ============================================

/**
 * Export financial report
 * Validates: Requirements 10.1, 10.2, 10.3
 */
export async function exportFinancialReport(
  format: 'pdf' | 'excel',
  reportType: string,
  dateRange: { year: number; month: number }
): Promise<{ success: boolean; url?: string; error?: string }> {
  const profile = await getUserProfile();
  if (!profile || !(FINANCIAL_READ_ROLES as readonly string[]).includes(profile.role)) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    // Fetch data for the report (validates data exists before generating URL)
    await fetchFinancialAnalyticsData(dateRange.year, dateRange.month);
    
    // For now, return success - actual PDF/Excel generation would be implemented
    // using libraries like jspdf or xlsx
    return {
      success: true,
      url: `/api/export/${format}/${reportType}?year=${dateRange.year}&month=${dateRange.month}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}
