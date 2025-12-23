// Financial Analytics Types for v0.62

// Budget Categories
export type BudgetCategory = 
  | 'revenue' 
  | 'direct_cost' 
  | 'overhead' 
  | 'salary' 
  | 'equipment' 
  | 'other';

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  'revenue',
  'direct_cost',
  'overhead',
  'salary',
  'equipment',
  'other'
];

// Cash Flow Types
export type CashFlowType = 'inflow' | 'outflow';

export type InflowCategory = 
  | 'customer_payment' 
  | 'loan' 
  | 'other_income';

export type OutflowCategory = 
  | 'vendor_payment' 
  | 'salary' 
  | 'tax' 
  | 'loan_repayment' 
  | 'capex' 
  | 'other_expense';

export type CashFlowCategory = InflowCategory | OutflowCategory;

export const INFLOW_CATEGORIES: InflowCategory[] = [
  'customer_payment',
  'loan',
  'other_income'
];

export const OUTFLOW_CATEGORIES: OutflowCategory[] = [
  'vendor_payment',
  'salary',
  'tax',
  'loan_repayment',
  'capex',
  'other_expense'
];

// Budget Item
export interface BudgetItem {
  id: string;
  budget_year: number;
  budget_month: number;
  category: BudgetCategory;
  subcategory: string | null;
  description: string;
  budget_amount: number;
  department: string | null;
  project_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// Monthly Actual
export interface MonthlyActual {
  id: string;
  actual_year: number;
  actual_month: number;
  category: BudgetCategory;
  subcategory: string | null;
  actual_amount: number;
  department: string | null;
  last_updated: string;
}


// Cash Flow Transaction
export interface CashFlowTransaction {
  id: string;
  transaction_date: string;
  flow_type: CashFlowType;
  category: CashFlowCategory;
  description: string | null;
  amount: number;
  invoice_id: string | null;
  bkk_id: string | null;
  bkm_id: string | null;
  bank_account: string | null;
  created_at: string;
}

// Cash Flow Forecast
export interface CashFlowForecast {
  id: string;
  forecast_date: string;
  flow_type: CashFlowType;
  category: CashFlowCategory;
  description: string | null;
  expected_amount: number;
  probability_percentage: number;
  weighted_amount: number | null;
  invoice_id: string | null;
  recurring_item: boolean;
  notes: string | null;
  created_at: string;
}

// Customer Profitability (from view)
export interface CustomerProfitability {
  customer_id: string;
  customer_name: string;
  total_jobs: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  profit_margin_pct: number;
  avg_job_revenue: number;
  ytd_revenue: number;
  ytd_profit: number;
}

// Job Type Profitability (from view)
export interface JobTypeProfitability {
  cargo_type: string;
  total_jobs: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  profit_margin_pct: number;
  avg_job_revenue: number;
}

// Monthly P&L Summary (from view)
export interface MonthlyPLSummary {
  month: string;
  revenue: number;
  direct_cost: number;
  gross_profit: number;
  gross_margin_pct: number;
}

// Variance Status
export type VarianceStatus = 'favorable' | 'unfavorable' | 'warning' | 'neutral';

// Budget vs Actual Item (computed)
export interface BudgetVsActualItem {
  category: BudgetCategory;
  subcategory: string | null;
  description: string;
  budget_amount: number;
  actual_amount: number;
  variance: number;
  variance_pct: number;
  status: VarianceStatus;
}

// Cash Position (computed)
export interface CashPosition {
  current_balance: number;
  net_cash_flow_mtd: number;
  total_inflows_mtd: number;
  total_outflows_mtd: number;
  forecast_30_days: number;
  forecast_60_days: number;
  forecast_90_days: number;
}

// Chart Data Types
export interface CashFlowChartData {
  date: string;
  actual_balance: number | null;
  forecast_balance: number | null;
  inflows: number;
  outflows: number;
}

export interface RevenueTrendData {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface CostBreakdownData {
  category: string;
  amount: number;
  percentage: number;
}

// Profit Margin Status
export type ProfitMarginStatus = 'positive' | 'neutral';

// Financial Analytics Data (combined for dashboard)
export interface FinancialAnalyticsData {
  cashPosition: CashPosition;
  budgetVsActual: BudgetVsActualItem[];
  customerProfitability: CustomerProfitability[];
  jobTypeProfitability: JobTypeProfitability[];
  monthlyPL: MonthlyPLSummary[];
  cashFlowTransactions: CashFlowTransaction[];
  cashFlowForecast: CashFlowForecast[];
}

// Input types for creating records
export interface CreateBudgetItemInput {
  budget_year: number;
  budget_month: number;
  category: BudgetCategory;
  subcategory?: string | null;
  description: string;
  budget_amount: number;
  department?: string | null;
  project_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

export interface CreateCashFlowTransactionInput {
  transaction_date: string;
  flow_type: CashFlowType;
  category: CashFlowCategory;
  description?: string | null;
  amount: number;
  invoice_id?: string | null;
  bkk_id?: string | null;
  bkm_id?: string | null;
  bank_account?: string | null;
}

export interface CreateCashFlowForecastInput {
  forecast_date: string;
  flow_type: CashFlowType;
  category: CashFlowCategory;
  description?: string | null;
  expected_amount: number;
  probability_percentage?: number;
  invoice_id?: string | null;
  recurring_item?: boolean;
  notes?: string | null;
}
