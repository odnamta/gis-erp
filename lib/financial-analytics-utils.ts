// Financial Analytics Utility Functions for v0.62

import {
  BudgetCategory,
  BudgetItem,
  BudgetVsActualItem,
  CashFlowChartData,
  CashFlowForecast,
  CashFlowTransaction,
  CashPosition,
  CostBreakdownData,
  INFLOW_CATEGORIES,
  InflowCategory,
  MonthlyActual,
  OUTFLOW_CATEGORIES,
  OutflowCategory,
  ProfitMarginStatus,
  VarianceStatus,
  BUDGET_CATEGORIES,
  CashFlowType,
  CashFlowCategory,
} from '@/types/financial-analytics';

/**
 * Calculate variance between budget and actual amounts
 * Property 7: Variance Calculation
 * Validates: Requirements 5.2, 5.3
 */
export function calculateVariance(
  budget: number,
  actual: number
): { variance: number; variance_pct: number } {
  const variance = budget - actual;
  const variance_pct = budget !== 0 ? (variance / budget) * 100 : 0;
  return { variance, variance_pct };
}

/**
 * Calculate weighted forecast amount
 * Property 5: Weighted Amount Calculation
 * Validates: Requirements 3.2
 */
export function calculateWeightedAmount(
  expected_amount: number,
  probability_percentage: number
): number {
  return expected_amount * (probability_percentage / 100);
}

/**
 * Calculate profit margin percentage
 * Property 11: Profit Margin Calculation
 * Validates: Requirements 6.3
 */
export function calculateProfitMargin(revenue: number, cost: number): number {
  if (revenue === 0) return 0;
  return ((revenue - cost) / revenue) * 100;
}

/**
 * Determine variance status based on category and variance percentage
 * Property 8: Variance Status Determination
 * Validates: Requirements 5.4, 5.5
 */
export function getVarianceStatus(
  category: BudgetCategory,
  variance_pct: number
): VarianceStatus {
  const isRevenueCategory = category === 'revenue';

  if (isRevenueCategory) {
    // For revenue: negative variance (actual < budget) is unfavorable
    // variance_pct = (budget - actual) / budget * 100
    // If actual < budget, variance_pct > 0, which is unfavorable for revenue
    if (variance_pct > 10) return 'warning';
    if (variance_pct > 0) return 'unfavorable';
    return 'favorable';
  } else {
    // For costs: negative variance (actual > budget) is unfavorable
    // If actual > budget, variance_pct < 0, which is unfavorable for costs
    if (variance_pct < -10) return 'warning';
    if (variance_pct < 0) return 'unfavorable';
    return 'favorable';
  }
}


/**
 * Get profit margin indicator status
 * Property 14: Profit Margin Indicator
 * Validates: Requirements 6.6
 */
export function getProfitMarginStatus(margin_pct: number): ProfitMarginStatus {
  return margin_pct > 20 ? 'positive' : 'neutral';
}

/**
 * Calculate average job revenue
 * Property 12: Average Job Revenue Calculation
 * Validates: Requirements 6.5, 7.3
 */
export function calculateAverageJobRevenue(
  total_revenue: number,
  total_jobs: number
): number {
  if (total_jobs === 0) return 0;
  return total_revenue / total_jobs;
}

/**
 * Validate budget category
 * Property 6: Budget Category Validation
 * Validates: Requirements 4.2
 */
export function isValidBudgetCategory(category: string): category is BudgetCategory {
  return BUDGET_CATEGORIES.includes(category as BudgetCategory);
}

/**
 * Validate cash flow category based on flow type
 * Property 3: Cash Flow Category Validation
 * Validates: Requirements 2.3, 2.4
 */
export function isValidCashFlowCategory(
  flowType: CashFlowType,
  category: string
): boolean {
  if (flowType === 'inflow') {
    return INFLOW_CATEGORIES.includes(category as InflowCategory);
  } else {
    return OUTFLOW_CATEGORIES.includes(category as OutflowCategory);
  }
}

/**
 * Calculate net cash flow from transactions
 * Property 4: Net Cash Flow Calculation
 * Validates: Requirements 2.5
 */
export function calculateNetCashFlow(transactions: CashFlowTransaction[]): number {
  return transactions.reduce((net, tx) => {
    if (tx.flow_type === 'inflow') {
      return net + tx.amount;
    } else {
      return net - tx.amount;
    }
  }, 0);
}

/**
 * Calculate gross profit and margin
 * Property 9: Gross Profit Calculation
 * Validates: Requirements 5.7
 */
export function calculateGrossProfit(
  revenue: number,
  directCost: number
): { grossProfit: number; grossMarginPct: number } {
  const grossProfit = revenue - directCost;
  const grossMarginPct = revenue !== 0 ? (grossProfit / revenue) * 100 : 0;
  return { grossProfit, grossMarginPct };
}

/**
 * Calculate cash position from transactions and forecasts
 */
export function calculateCashPosition(
  transactions: CashFlowTransaction[],
  forecasts: CashFlowForecast[],
  currentDate: Date
): CashPosition {
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  
  // Filter MTD transactions
  const mtdTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.transaction_date);
    return txDate >= startOfMonth && txDate <= currentDate;
  });

  // Calculate MTD values
  const total_inflows_mtd = mtdTransactions
    .filter(tx => tx.flow_type === 'inflow')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const total_outflows_mtd = mtdTransactions
    .filter(tx => tx.flow_type === 'outflow')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const net_cash_flow_mtd = total_inflows_mtd - total_outflows_mtd;

  // Calculate current balance (sum of all transactions)
  const current_balance = calculateNetCashFlow(transactions);

  // Calculate forecasts for 30, 60, 90 days
  const forecast30Date = new Date(currentDate);
  forecast30Date.setDate(forecast30Date.getDate() + 30);
  
  const forecast60Date = new Date(currentDate);
  forecast60Date.setDate(forecast60Date.getDate() + 60);
  
  const forecast90Date = new Date(currentDate);
  forecast90Date.setDate(forecast90Date.getDate() + 90);

  const calculateForecastNet = (endDate: Date) => {
    return forecasts
      .filter(f => {
        const fDate = new Date(f.forecast_date);
        return fDate > currentDate && fDate <= endDate;
      })
      .reduce((sum, f) => {
        const amount = f.weighted_amount ?? f.expected_amount;
        return f.flow_type === 'inflow' ? sum + amount : sum - amount;
      }, 0);
  };

  return {
    current_balance,
    net_cash_flow_mtd,
    total_inflows_mtd,
    total_outflows_mtd,
    forecast_30_days: current_balance + calculateForecastNet(forecast30Date),
    forecast_60_days: current_balance + calculateForecastNet(forecast60Date),
    forecast_90_days: current_balance + calculateForecastNet(forecast90Date),
  };
}


/**
 * Aggregate cash flow data by date for chart display
 */
export function aggregateCashFlowByDate(
  transactions: CashFlowTransaction[],
  forecasts: CashFlowForecast[],
  startDate: Date,
  endDate: Date
): CashFlowChartData[] {
  const currentDate = new Date();
  
  // Create a map of dates to data
  const dateMap = new Map<string, CashFlowChartData>();
  
  // Initialize all dates in range
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    dateMap.set(dateStr, {
      date: dateStr,
      actual_balance: null,
      forecast_balance: null,
      inflows: 0,
      outflows: 0,
    });
    current.setDate(current.getDate() + 1);
  }

  // Aggregate transactions
  transactions.forEach(tx => {
    const dateStr = tx.transaction_date.split('T')[0];
    const data = dateMap.get(dateStr);
    if (data) {
      if (tx.flow_type === 'inflow') {
        data.inflows += tx.amount;
      } else {
        data.outflows += tx.amount;
      }
    }
  });

  // Calculate running balance for actuals
  let runningBalance = 0;
  const sortedDates = Array.from(dateMap.keys()).sort();
  
  sortedDates.forEach(dateStr => {
    const data = dateMap.get(dateStr)!;
    const date = new Date(dateStr);
    
    runningBalance += data.inflows - data.outflows;
    
    if (date <= currentDate) {
      data.actual_balance = runningBalance;
    }
  });

  // Add forecast data
  forecasts.forEach(f => {
    const dateStr = f.forecast_date.split('T')[0];
    const data = dateMap.get(dateStr);
    if (data) {
      const amount = f.weighted_amount ?? f.expected_amount;
      if (f.flow_type === 'inflow') {
        data.inflows += amount;
      } else {
        data.outflows += amount;
      }
    }
  });

  // Calculate forecast balance
  let forecastBalance = runningBalance;
  sortedDates.forEach(dateStr => {
    const data = dateMap.get(dateStr)!;
    const date = new Date(dateStr);
    
    if (date > currentDate) {
      forecastBalance += data.inflows - data.outflows;
      data.forecast_balance = forecastBalance;
    }
  });

  return sortedDates.map(dateStr => dateMap.get(dateStr)!);
}

/**
 * Group budget items with actuals for comparison
 * Property 15: Date Filter Data Refresh (partial)
 * Validates: Requirements 5.6, 11.2
 */
export function groupBudgetVsActual(
  budgetItems: BudgetItem[],
  actualItems: MonthlyActual[]
): BudgetVsActualItem[] {
  const result: BudgetVsActualItem[] = [];
  
  // Create a map of actuals by key
  const actualsMap = new Map<string, number>();
  actualItems.forEach(actual => {
    const key = `${actual.category}|${actual.subcategory || ''}`;
    actualsMap.set(key, (actualsMap.get(key) || 0) + actual.actual_amount);
  });

  // Process budget items
  budgetItems.forEach(budget => {
    const key = `${budget.category}|${budget.subcategory || ''}`;
    const actual_amount = actualsMap.get(key) || 0;
    const { variance, variance_pct } = calculateVariance(budget.budget_amount, actual_amount);
    const status = getVarianceStatus(budget.category, variance_pct);

    result.push({
      category: budget.category,
      subcategory: budget.subcategory,
      description: budget.description,
      budget_amount: budget.budget_amount,
      actual_amount,
      variance,
      variance_pct,
      status,
    });
  });

  return result;
}

/**
 * Calculate cost breakdown for pie chart
 */
export function calculateCostBreakdown(
  budgetVsActual: BudgetVsActualItem[]
): CostBreakdownData[] {
  const costItems = budgetVsActual.filter(item => item.category !== 'revenue');
  const totalCost = costItems.reduce((sum, item) => sum + item.actual_amount, 0);

  return costItems.map(item => ({
    category: item.description || item.category,
    amount: item.actual_amount,
    percentage: totalCost > 0 ? (item.actual_amount / totalCost) * 100 : 0,
  }));
}

/**
 * Sort customers by profitability (descending)
 * Property 10: Customer Ranking by Profitability
 * Validates: Requirements 6.1
 */
export function sortCustomersByProfitability<T extends { total_profit: number }>(
  customers: T[]
): T[] {
  return [...customers].sort((a, b) => b.total_profit - a.total_profit);
}

/**
 * Format currency for display (Indonesian Rupiah)
 */
export function formatCurrencyIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: BudgetCategory): string {
  const names: Record<BudgetCategory, string> = {
    revenue: 'Revenue',
    direct_cost: 'Direct Costs',
    overhead: 'Overhead',
    salary: 'Salary',
    equipment: 'Equipment',
    other: 'Other',
  };
  return names[category] || category;
}

/**
 * Get cash flow category display name
 */
export function getCashFlowCategoryDisplayName(category: CashFlowCategory): string {
  const names: Record<CashFlowCategory, string> = {
    customer_payment: 'Customer Payment',
    loan: 'Loan',
    other_income: 'Other Income',
    vendor_payment: 'Vendor Payment',
    salary: 'Salary',
    tax: 'Tax',
    loan_repayment: 'Loan Repayment',
    capex: 'Capital Expenditure',
    other_expense: 'Other Expense',
  };
  return names[category] || category;
}
