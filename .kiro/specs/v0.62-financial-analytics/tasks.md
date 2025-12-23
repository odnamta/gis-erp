# Implementation Plan: Financial Analytics Module (v0.62)

## Overview

This implementation plan covers the Financial Analytics module for the Executive Dashboard. The module provides cash flow tracking, budget vs actual analysis, and profitability reports. Implementation follows the established patterns from v0.61 Executive Dashboard KPI.

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Create budget_items table with all required fields and unique constraint
    - Create table with budget_year, budget_month, category, subcategory, description, budget_amount, department, project_id, notes, created_by
    - Add unique constraint on (budget_year, budget_month, category, subcategory, department)
    - Create index on (budget_year, budget_month)
    - _Requirements: 1.1, 1.6, 1.7_
  - [x] 1.2 Create monthly_actuals table with all required fields and unique constraint
    - Create table with actual_year, actual_month, category, subcategory, actual_amount, department
    - Add unique constraint on (actual_year, actual_month, category, subcategory, department)
    - Create index on (actual_year, actual_month)
    - _Requirements: 1.2, 1.6, 1.7_
  - [x] 1.3 Create cash_flow_transactions table with all required fields
    - Create table with transaction_date, flow_type, category, description, amount, invoice_id, bkk_id, bkm_id, bank_account
    - Create index on transaction_date
    - _Requirements: 1.3, 1.7_
  - [x] 1.4 Create cash_flow_forecast table with all required fields
    - Create table with forecast_date, flow_type, category, description, expected_amount, probability_percentage, weighted_amount, invoice_id, recurring_item, notes
    - Create index on forecast_date
    - _Requirements: 1.4, 1.7_
  - [x] 1.5 Create profitability views
    - Create customer_profitability view joining customers and job_orders
    - Create job_type_profitability view joining job_orders and proforma_job_orders
    - Create monthly_pl_summary view aggregating job_orders by month
    - _Requirements: 1.5_

- [x] 2. TypeScript Types and Utility Functions
  - [x] 2.1 Create TypeScript type definitions
    - Create types/financial-analytics.ts with all interfaces
    - Define BudgetCategory, CashFlowType, InflowCategory, OutflowCategory types
    - Define BudgetItem, MonthlyActual, CashFlowTransaction, CashFlowForecast interfaces
    - Define CustomerProfitability, JobTypeProfitability, MonthlyPLSummary interfaces
    - Define computed types: BudgetVsActualItem, CashPosition, chart data types
    - _Requirements: 2.2, 2.3, 2.4, 4.2_
  - [x] 2.2 Implement core calculation utility functions
    - Implement calculateVariance(budget, actual) returning variance and variance_pct
    - Implement calculateWeightedAmount(expected, probability) 
    - Implement calculateProfitMargin(revenue, cost)
    - Implement getVarianceStatus(category, variance_pct)
    - _Requirements: 3.2, 5.2, 5.3, 5.4, 5.5, 6.3_
  - [x] 2.3 Write property tests for calculation functions
    - **Property 7: Variance Calculation**
    - **Property 5: Weighted Amount Calculation**
    - **Property 11: Profit Margin Calculation**
    - **Validates: Requirements 3.2, 5.2, 5.3, 6.3**
  - [x] 2.4 Implement aggregation utility functions
    - Implement calculateNetCashFlow(transactions) for MTD calculation
    - Implement calculateCashPosition(transactions, forecasts, currentDate)
    - Implement aggregateCashFlowByDate(transactions, forecasts, startDate, endDate)
    - Implement groupBudgetVsActual(budgetItems, actualItems)
    - _Requirements: 2.5, 5.6, 5.7_
  - [x] 2.5 Write property tests for aggregation functions
    - **Property 4: Net Cash Flow Calculation**
    - **Property 9: Gross Profit Calculation**
    - **Validates: Requirements 2.5, 5.7**

- [x] 3. Checkpoint - Verify utility functions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Server Actions Implementation
  - [x] 4.1 Implement budget item CRUD actions
    - Implement createBudgetItem with validation and unique constraint handling
    - Implement updateBudgetItem
    - Implement fetchBudgetItems(year, month)
    - _Requirements: 4.1, 4.3, 4.4, 4.5_
  - [x] 4.2 Write property tests for budget item actions
    - **Property 1: Unique Constraint Enforcement**
    - **Property 6: Budget Category Validation**
    - **Validates: Requirements 1.6, 4.2, 4.5**
  - [x] 4.3 Implement cash flow transaction actions
    - Implement createCashFlowTransaction with category validation
    - Implement fetchCashFlowTransactions(startDate, endDate)
    - _Requirements: 2.2, 2.3, 2.4, 2.6_
  - [x] 4.4 Write property tests for cash flow actions
    - **Property 2: Cash Flow Transaction Recording**
    - **Property 3: Cash Flow Category Validation**
    - **Validates: Requirements 2.2, 2.3, 2.4**
  - [x] 4.5 Implement cash flow forecast actions
    - Implement createCashFlowForecast with weighted amount calculation
    - Implement fetchCashFlowForecast(startDate, endDate)
    - _Requirements: 3.1, 3.2, 3.6_
  - [x] 4.6 Implement profitability data fetching
    - Implement fetchCustomerProfitability()
    - Implement fetchJobTypeProfitability()
    - Implement fetchMonthlyPLSummary()
    - _Requirements: 6.1, 6.2, 6.4, 7.1, 7.2, 8.1, 8.2_
  - [x] 4.7 Write property tests for profitability functions
    - **Property 10: Customer Ranking by Profitability**
    - **Property 12: Average Job Revenue Calculation**
    - **Property 13: YTD Aggregation**
    - **Property 14: Profit Margin Indicator**
    - **Validates: Requirements 6.1, 6.4, 6.5, 6.6, 7.3**
  - [x] 4.8 Implement main data fetching action
    - Implement fetchFinancialAnalyticsData(year, month) combining all data
    - _Requirements: 11.2, 11.3_
  - [x] 4.9 Write property test for date filtering
    - **Property 15: Date Filter Data Refresh**
    - **Validates: Requirements 11.2**

- [x] 5. Checkpoint - Verify server actions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. UI Components - Core Display
  - [x] 6.1 Create Cash Position Card component
    - Display current balance, net cash flow MTD, inflows, outflows
    - Use Card component from shadcn/ui
    - _Requirements: 2.1, 2.5_
  - [x] 6.2 Create Budget vs Actual Table component
    - Display comparison table with budget, actual, variance, variance_pct columns
    - Implement color-coded status indicators (green for favorable, warning for >10% unfavorable)
    - Group by category (Revenue, Direct Costs, Gross Profit)
    - _Requirements: 5.1, 5.4, 5.5, 5.6, 5.7_
  - [x] 6.3 Create Customer Profitability Table component
    - Display ranked list with total_jobs, total_revenue, total_cost, total_profit, profit_margin_pct
    - Display YTD revenue and profit
    - Display average job revenue
    - Implement positive indicator for margin > 20%
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6_
  - [x] 6.4 Create Job Type Profitability Table component
    - Display grouped by cargo_type
    - Display total_jobs, total_revenue, total_cost, total_profit, profit_margin_pct
    - Display average job revenue
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 6.5 Create Monthly P&L Summary component
    - Display revenue, direct_cost, gross_profit, gross_margin_pct for each month
    - _Requirements: 8.1, 8.2_

- [x] 7. UI Components - Charts
  - [x] 7.1 Create Cash Flow Chart component
    - Display line chart with actual transactions and forecast
    - Visually distinguish actual vs forecast (solid vs dashed line)
    - Support 30/60/90 day forecast display
    - _Requirements: 3.3, 3.4, 3.5, 9.1_
  - [x] 7.2 Create Revenue Trend Chart component
    - Display line chart showing revenue over time
    - _Requirements: 8.3, 9.2_
  - [x] 7.3 Create Cost Breakdown Pie Chart component
    - Display pie chart with cost categories
    - _Requirements: 9.3_
  - [x] 7.4 Create Customer Pareto Chart component
    - Display top customers by profitability
    - _Requirements: 9.4_

- [x] 8. UI Components - Tabs and Page
  - [x] 8.1 Create Overview Tab component
    - Combine Cash Position, Budget vs Actual summary, Top Customers
    - _Requirements: 2.1, 5.1, 6.1_
  - [x] 8.2 Create Cash Flow Tab component
    - Display Cash Position Card and Cash Flow Chart
    - _Requirements: 2.1, 3.3, 3.4_
  - [x] 8.3 Create Budget vs Actual Tab component
    - Display full Budget vs Actual Table
    - _Requirements: 5.1_
  - [x] 8.4 Create Customer P&L Tab component
    - Display Customer Profitability and Job Type Profitability tables
    - _Requirements: 6.1, 7.1_
  - [x] 8.5 Create Reports Tab component
    - Display Monthly P&L Summary and export options
    - _Requirements: 8.1, 10.1, 10.2_
  - [x] 8.6 Create Date Range Selector component
    - Month/year dropdown selector
    - Default to current month
    - _Requirements: 11.1, 11.3_
  - [x] 8.7 Create Financial Analytics Client component
    - Combine all tabs with Tabs component
    - Handle date range selection and data refresh
    - _Requirements: 11.2_
  - [x] 8.8 Create Financial Analytics Page (server component)
    - Fetch initial data
    - Render client component
    - _Requirements: 11.3_

- [x] 9. Checkpoint - Verify UI components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Export Functionality
  - [x] 10.1 Implement PDF export for financial reports
    - Generate PDF with company branding
    - Include selected date range
    - _Requirements: 10.1, 10.3, 10.4_
  - [x] 10.2 Implement Excel export for financial data
    - Generate Excel file with all data
    - Include selected date range
    - _Requirements: 10.2, 10.3_
  - [x] 10.3 Create Export Dialog component
    - Allow selection of report type and format
    - Trigger export action
    - _Requirements: 10.1, 10.2_

- [ ] 11. Navigation Integration
  - [ ] 11.1 Add Financial Analytics route to navigation
    - Add link in executive dashboard navigation
    - Ensure proper permissions check
    - _Requirements: 2.1_

- [ ] 12. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all acceptance criteria are met
  - Test end-to-end flow

## Notes

- All tasks are required including property-based tests
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Implementation follows patterns established in v0.61 Executive Dashboard KPI
