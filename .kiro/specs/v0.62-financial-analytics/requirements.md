# Requirements Document

## Introduction

This document defines the requirements for the Financial Analytics module (v0.62) of the Executive Dashboard. The module provides deep-dive financial analytics with cash flow tracking, budget vs actual analysis, and profitability reports for executive decision-making at PT. Gama Intisamudera.

## Glossary

- **Financial_Analytics_Module**: The system component providing comprehensive financial analysis, cash flow tracking, and profitability reporting
- **Budget_Item**: A planned financial allocation for a specific category, period, and department
- **Monthly_Actual**: Aggregated actual expense data for a specific category and period
- **Cash_Flow_Transaction**: A recorded inflow or outflow of cash with categorization and references
- **Cash_Flow_Forecast**: A projected future cash movement with probability weighting
- **Customer_Profitability**: Analysis of revenue, costs, and profit margins by customer
- **Budget_Variance**: The difference between budgeted and actual amounts for a category
- **P&L_Summary**: Profit and Loss summary showing revenue, costs, and margins

## Requirements

### Requirement 1: Database Schema Setup

**User Story:** As a system administrator, I want the financial analytics database tables created, so that the system can store and query financial data.

#### Acceptance Criteria

1. THE Financial_Analytics_Module SHALL create a `budget_items` table with fields for budget_year, budget_month, category, subcategory, description, budget_amount, department, project_id, notes, and created_by
2. THE Financial_Analytics_Module SHALL create a `monthly_actuals` table with fields for actual_year, actual_month, category, subcategory, actual_amount, and department
3. THE Financial_Analytics_Module SHALL create a `cash_flow_transactions` table with fields for transaction_date, flow_type, category, description, amount, and reference IDs (invoice_id, bkk_id, bkm_id)
4. THE Financial_Analytics_Module SHALL create a `cash_flow_forecast` table with fields for forecast_date, flow_type, category, expected_amount, probability_percentage, and weighted_amount
5. THE Financial_Analytics_Module SHALL create views for customer_profitability, job_type_profitability, and monthly_pl_summary
6. THE Financial_Analytics_Module SHALL enforce unique constraints on budget_items and monthly_actuals for period/category/department combinations
7. THE Financial_Analytics_Module SHALL create appropriate indexes for performance optimization

### Requirement 2: Cash Flow Tracking

**User Story:** As a finance executive, I want to track cash inflows and outflows, so that I can monitor the company's liquidity position.

#### Acceptance Criteria

1. WHEN the Cash Flow tab is accessed, THE Financial_Analytics_Module SHALL display the current cash balance
2. WHEN a cash transaction occurs, THE Financial_Analytics_Module SHALL record it with flow_type ('inflow' or 'outflow'), category, and amount
3. THE Financial_Analytics_Module SHALL categorize inflows as 'customer_payment', 'loan', or 'other_income'
4. THE Financial_Analytics_Module SHALL categorize outflows as 'vendor_payment', 'salary', 'tax', 'loan_repayment', 'capex', or 'other_expense'
5. WHEN displaying cash flow, THE Financial_Analytics_Module SHALL show net cash flow for the month-to-date period
6. THE Financial_Analytics_Module SHALL link cash transactions to source documents (invoices, BKK, BKM) where applicable

### Requirement 3: Cash Flow Forecasting

**User Story:** As a finance executive, I want to forecast future cash flows, so that I can plan for liquidity needs.

#### Acceptance Criteria

1. THE Financial_Analytics_Module SHALL allow creation of cash flow forecasts with expected amounts and probability percentages
2. WHEN a probability percentage is provided, THE Financial_Analytics_Module SHALL calculate weighted_amount as expected_amount * (probability_percentage / 100)
3. THE Financial_Analytics_Module SHALL display forecasts for the next 30, 60, and 90 days
4. THE Financial_Analytics_Module SHALL display a cash flow chart showing actual transactions and forecasted amounts
5. WHEN displaying the chart, THE Financial_Analytics_Module SHALL visually distinguish between actual and forecast data
6. THE Financial_Analytics_Module SHALL support recurring forecast items

### Requirement 4: Budget Management

**User Story:** As a finance manager, I want to create and manage budgets, so that I can plan financial allocations.

#### Acceptance Criteria

1. THE Financial_Analytics_Module SHALL allow creation of budget items with year, month, category, subcategory, and amount
2. THE Financial_Analytics_Module SHALL support budget categories: 'revenue', 'direct_cost', 'overhead', 'salary', 'equipment', 'other'
3. THE Financial_Analytics_Module SHALL allow budget items to be associated with specific departments
4. THE Financial_Analytics_Module SHALL allow budget items to be associated with specific projects
5. WHEN a duplicate budget item is created (same period/category/subcategory/department), THE Financial_Analytics_Module SHALL reject the creation with an error message

### Requirement 5: Budget vs Actual Analysis

**User Story:** As a finance executive, I want to compare budgeted amounts against actual spending, so that I can identify variances and take corrective action.

#### Acceptance Criteria

1. WHEN the Budget vs Actual tab is accessed, THE Financial_Analytics_Module SHALL display a comparison table with budget, actual, variance, and variance percentage columns
2. THE Financial_Analytics_Module SHALL calculate variance as (budget_amount - actual_amount)
3. THE Financial_Analytics_Module SHALL calculate variance percentage as ((budget_amount - actual_amount) / budget_amount) * 100
4. WHEN variance is favorable (actual under budget for costs, actual over budget for revenue), THE Financial_Analytics_Module SHALL display a green indicator
5. WHEN variance is unfavorable by more than 10%, THE Financial_Analytics_Module SHALL display a warning indicator
6. THE Financial_Analytics_Module SHALL group budget vs actual data by category (Revenue, Direct Costs, Gross Profit)
7. THE Financial_Analytics_Module SHALL calculate and display gross profit and gross margin percentage

### Requirement 6: Customer Profitability Analysis

**User Story:** As a sales executive, I want to analyze profitability by customer, so that I can focus on the most profitable relationships.

#### Acceptance Criteria

1. WHEN the Customer P&L tab is accessed, THE Financial_Analytics_Module SHALL display a ranked list of customers by profitability
2. THE Financial_Analytics_Module SHALL display for each customer: total jobs, total revenue, total cost, total profit, and profit margin percentage
3. THE Financial_Analytics_Module SHALL calculate profit margin as ((revenue - cost) / revenue) * 100
4. THE Financial_Analytics_Module SHALL display year-to-date (YTD) revenue and profit for each customer
5. THE Financial_Analytics_Module SHALL display average job revenue per customer
6. WHEN profit margin exceeds 20%, THE Financial_Analytics_Module SHALL display a positive indicator

### Requirement 7: Job Type Profitability Analysis

**User Story:** As an operations executive, I want to analyze profitability by job type, so that I can optimize service offerings.

#### Acceptance Criteria

1. THE Financial_Analytics_Module SHALL provide profitability analysis grouped by cargo_type
2. THE Financial_Analytics_Module SHALL display for each job type: total jobs, total revenue, total cost, total profit, and profit margin percentage
3. THE Financial_Analytics_Module SHALL display average job revenue per job type

### Requirement 8: Monthly P&L Summary

**User Story:** As a finance executive, I want to view monthly profit and loss summaries, so that I can track financial performance over time.

#### Acceptance Criteria

1. THE Financial_Analytics_Module SHALL display monthly P&L data for the current year and previous year
2. THE Financial_Analytics_Module SHALL show revenue, direct cost, gross profit, and gross margin percentage for each month
3. THE Financial_Analytics_Module SHALL display a revenue trend chart over time

### Requirement 9: Financial Charts and Visualizations

**User Story:** As an executive, I want visual representations of financial data, so that I can quickly understand trends and patterns.

#### Acceptance Criteria

1. THE Financial_Analytics_Module SHALL display a cash flow chart with actual and forecast lines
2. THE Financial_Analytics_Module SHALL display a revenue trend line chart
3. THE Financial_Analytics_Module SHALL display a cost breakdown pie chart
4. THE Financial_Analytics_Module SHALL display a customer profitability pareto chart (top customers)
5. WHEN hovering over chart elements, THE Financial_Analytics_Module SHALL display detailed tooltips with values

### Requirement 10: Export Functionality

**User Story:** As a finance executive, I want to export financial reports, so that I can share them with stakeholders.

#### Acceptance Criteria

1. THE Financial_Analytics_Module SHALL provide PDF export for financial reports
2. THE Financial_Analytics_Module SHALL provide Excel export for financial data
3. WHEN exporting, THE Financial_Analytics_Module SHALL include the selected date range and filters
4. THE Financial_Analytics_Module SHALL include company branding in PDF exports

### Requirement 11: Date Range and Filtering

**User Story:** As a user, I want to filter financial data by date range, so that I can analyze specific periods.

#### Acceptance Criteria

1. THE Financial_Analytics_Module SHALL provide a month/year selector for filtering data
2. WHEN a date range is selected, THE Financial_Analytics_Module SHALL refresh all displayed data for that period
3. THE Financial_Analytics_Module SHALL default to the current month when first accessed
4. THE Financial_Analytics_Module SHALL allow comparison between different periods
