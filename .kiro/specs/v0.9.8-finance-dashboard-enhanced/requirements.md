# Requirements Document

## Introduction

This document defines the requirements for an enhanced Finance Dashboard for Feri (Finance Manager) at PT. Gama Intisamudera. The dashboard provides comprehensive visibility into Accounts Receivable (AR), Accounts Payable (AP), cash flow, and profitability metrics, enabling the finance team to monitor the company's financial health at a glance without operational details they don't need.

## Glossary

- **Finance_Dashboard**: The main dashboard interface displayed to users with the finance role
- **AR (Accounts_Receivable)**: Money owed to the company by customers for invoices issued
- **AP (Accounts_Payable)**: Money the company owes to vendors for services/goods received
- **Aging_Bucket**: A time-based categorization of outstanding invoices (current, 1-30 days, 31-60 days, 61-90 days, over 90 days)
- **MTD (Month_To_Date)**: Cumulative total from the first day of the current month to the current date
- **BKK (Bukti_Kas_Keluar)**: Cash disbursement voucher requiring approval before payment
- **Materialized_View**: A database view that stores query results for faster access
- **Cash_Position**: The net difference between cash received and cash paid out
- **Revenue_Trend**: Historical revenue data displayed over a time period

## Requirements

### Requirement 1: Financial Summary Cards

**User Story:** As a finance manager, I want to see key financial metrics at a glance, so that I can quickly assess the company's financial position.

#### Acceptance Criteria

1. WHEN the Finance_Dashboard loads, THE System SHALL display a Cash Position card showing cash received MTD and cash paid out MTD
2. WHEN the Finance_Dashboard loads, THE System SHALL display a Revenue MTD card with the total invoiced amount for the current month
3. WHEN the Finance_Dashboard loads, THE System SHALL display a Profit MTD card showing net profit and profit margin percentage
4. WHEN the Finance_Dashboard loads, THE System SHALL display a Net Cash card showing the difference between cash received and cash paid MTD
5. WHEN revenue data is available for the previous month, THE System SHALL display a percentage comparison to the previous month on the Revenue MTD card

### Requirement 2: Accounts Receivable Overview

**User Story:** As a finance manager, I want to see AR status and aging breakdown, so that I can identify collection priorities and overdue accounts.

#### Acceptance Criteria

1. WHEN the Finance_Dashboard loads, THE System SHALL display the total AR outstanding amount
2. WHEN the Finance_Dashboard loads, THE System SHALL display the overdue AR amount with visual highlighting
3. WHEN the Finance_Dashboard loads, THE System SHALL display the count of outstanding invoices
4. WHEN the Finance_Dashboard loads, THE System SHALL display an AR Aging_Bucket breakdown chart showing amounts in each aging category
5. WHEN a user clicks on the AR section, THE System SHALL navigate to the detailed AR view
6. WHEN invoices are overdue by more than 90 days, THE System SHALL display a warning indicator on that Aging_Bucket

### Requirement 3: Accounts Payable Overview

**User Story:** As a finance manager, I want to see AP status and aging breakdown, so that I can manage vendor payments and avoid late fees.

#### Acceptance Criteria

1. WHEN the Finance_Dashboard loads, THE System SHALL display the total AP outstanding amount
2. WHEN the Finance_Dashboard loads, THE System SHALL display the overdue AP amount with visual highlighting
3. WHEN the Finance_Dashboard loads, THE System SHALL display the count of vendor invoices pending verification
4. WHEN the Finance_Dashboard loads, THE System SHALL display an AP Aging_Bucket breakdown chart showing amounts in each aging category
5. WHEN a user clicks on the AP section, THE System SHALL navigate to the detailed AP view

### Requirement 4: Pending Approvals Section

**User Story:** As a finance manager, I want to see pending BKK requests, so that I can be aware of cash disbursements awaiting approval.

#### Acceptance Criteria

1. WHEN the Finance_Dashboard loads, THE System SHALL display the count of pending BKK requests
2. WHEN the Finance_Dashboard loads, THE System SHALL display the total amount of pending BKK requests
3. WHEN pending BKK requests exist, THE System SHALL display a list of up to 5 most recent pending requests with BKK number, JO reference, and amount
4. WHEN a user clicks on a pending BKK item, THE System SHALL navigate to the BKK detail view
5. WHEN a user clicks "Review All Pending", THE System SHALL navigate to the BKK list filtered by pending status

### Requirement 5: Revenue Trend Chart

**User Story:** As a finance manager, I want to see revenue trends over time, so that I can identify patterns and forecast cash flow.

#### Acceptance Criteria

1. WHEN the Finance_Dashboard loads, THE System SHALL display a line chart showing revenue for the last 6 months
2. WHEN the Finance_Dashboard loads, THE System SHALL display both invoiced revenue and collected amounts on the chart
3. WHEN a user hovers over a data point, THE System SHALL display the exact values for that month
4. WHEN a user clicks "View Full Report", THE System SHALL navigate to the detailed revenue report

### Requirement 6: Quick Actions

**User Story:** As a finance manager, I want quick access to common tasks, so that I can efficiently perform routine operations.

#### Acceptance Criteria

1. WHEN the Finance_Dashboard loads, THE System SHALL display a "Record Payment" quick action button
2. WHEN the Finance_Dashboard loads, THE System SHALL display a "Record Vendor Invoice" quick action button
3. WHEN the Finance_Dashboard loads, THE System SHALL display an "Approve BKK" quick action button
4. WHEN the Finance_Dashboard loads, THE System SHALL display a "Run AR Report" quick action button
5. WHEN a user clicks a quick action button, THE System SHALL navigate to the corresponding functionality

### Requirement 7: Dashboard Data Refresh

**User Story:** As a finance manager, I want the dashboard data to be current, so that I can make decisions based on accurate information.

#### Acceptance Criteria

1. WHEN the Finance_Dashboard loads, THE System SHALL display the last update timestamp
2. WHEN a user clicks the refresh button, THE System SHALL refresh all dashboard data
3. WHEN the Materialized_View data is older than 5 minutes, THE System SHALL automatically refresh the view on dashboard load
4. WHEN data is being refreshed, THE System SHALL display a loading indicator

### Requirement 8: Role-Based Access Control

**User Story:** As a system administrator, I want to restrict dashboard access by role, so that users only see information appropriate to their responsibilities.

#### Acceptance Criteria

1. WHEN a user with the finance role accesses the dashboard, THE System SHALL display the Finance_Dashboard
2. WHEN a user without finance, owner, admin, or manager role attempts to view AR/AP totals, THE System SHALL deny access
3. WHEN a user without finance, owner, or admin role attempts to view cash position details, THE System SHALL deny access
4. WHEN a user without finance, owner, or admin role attempts to view profit margins, THE System SHALL deny access

### Requirement 9: Database Schema Support

**User Story:** As a developer, I want optimized database structures, so that the dashboard loads quickly with accurate data.

#### Acceptance Criteria

1. THE System SHALL create a dashboard_configs table to store user dashboard preferences
2. THE System SHALL create a finance_dashboard_summary Materialized_View for aggregated metrics
3. THE System SHALL create an ar_aging_breakdown view for AR aging calculations
4. THE System SHALL create an ap_aging_breakdown view for AP aging calculations
5. THE System SHALL create a monthly_revenue_trend view for revenue history
6. THE System SHALL create a refresh_finance_dashboard function to update the Materialized_View
7. THE System SHALL create appropriate indexes on invoices and vendor_invoices tables for due_date queries
