# Implementation Plan: Finance Dashboard Enhanced (v0.9.8)

## Overview

This implementation plan covers the enhanced Finance Dashboard for Feri (Finance Manager). The approach builds upon the existing finance dashboard infrastructure, adding new database views, utility functions, and UI components for comprehensive AR/AP visibility, cash flow monitoring, and revenue trend visualization.

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Create dashboard_configs table migration
    - Create table with user_id, role, layout JSONB, refresh_interval columns
    - Add unique constraints on user_id and role
    - Add RLS policies for user access
    - _Requirements: 9.1_

  - [x] 1.2 Create finance_dashboard_summary materialized view
    - Create materialized view with AR, AP, cash, revenue, profit, BKK aggregations
    - Create refresh_finance_dashboard() function
    - _Requirements: 9.2, 9.6_

  - [x] 1.3 Create aging breakdown views
    - Create ar_aging_breakdown view with bucket classification
    - Create ap_aging_breakdown view with bucket classification
    - _Requirements: 9.3, 9.4_

  - [x] 1.4 Create monthly_revenue_trend view
    - Create view aggregating revenue and collected by month for last 6 months
    - _Requirements: 9.5_

  - [x] 1.5 Create performance indexes
    - Add index on invoices(due_date) for outstanding invoices
    - Add index on vendor_invoices(due_date)
    - Add index on payments(payment_date)
    - Add index on vendor_payments(payment_date)
    - _Requirements: 9.7_

- [x] 2. Utility Functions
  - [x] 2.1 Create finance-dashboard-enhanced-utils.ts
    - Implement calculateNetCash function
    - Implement calculateRevenueMTD function
    - Implement calculateProfitMargin function
    - Implement calculatePercentageChange function
    - Implement isStale function for staleness detection
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.3_

  - [x] 2.2 Write property tests for financial calculations
    - **Property 1: Net Cash Calculation**
    - **Property 2: Revenue MTD Calculation**
    - **Property 3: Profit Margin Calculation**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**

  - [x] 2.3 Implement AR aggregation utilities
    - Implement calculateTotalAR function
    - Implement calculateOverdueAR function
    - Implement classifyAgingBucket function
    - Implement groupByAgingBucket function
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x] 2.4 Write property tests for AR aggregation
    - **Property 4: AR Aggregation and Aging Classification**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6**

  - [x] 2.5 Implement AP aggregation utilities
    - Implement calculateTotalAP function
    - Implement calculateOverdueAP function
    - Implement calculatePendingVerification function
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 2.6 Write property tests for AP aggregation
    - **Property 5: AP Aggregation and Aging Classification**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [x] 2.7 Implement BKK aggregation utilities
    - Implement calculatePendingBKKCount function
    - Implement calculatePendingBKKAmount function
    - Implement getPendingBKKList function with limit and sorting
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 2.8 Write property tests for BKK aggregation
    - **Property 6: BKK Aggregation**
    - **Property 7: BKK List Limiting and Sorting**
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [x] 2.9 Implement revenue trend utilities
    - Implement groupRevenueByMonth function
    - Implement filterLast6Months function
    - _Requirements: 5.1, 5.2_

  - [x] 2.10 Write property tests for revenue trend
    - **Property 8: Revenue Trend Aggregation**
    - **Validates: Requirements 5.1, 5.2**

  - [x] 2.11 Write property test for staleness detection
    - **Property 9: Staleness Detection**
    - **Validates: Requirements 7.3**

- [x] 3. Checkpoint - Utility Functions Complete
  - Ensure all utility tests pass, ask the user if questions arise.

- [x] 4. Permission Updates
  - [x] 4.1 Add finance dashboard permissions
    - Add 'finance_dashboard.view' permission
    - Add 'finance_dashboard.view_cash_position' permission
    - Add 'finance_dashboard.view_profit_margins' permission
    - Update permission checks in lib/permissions.ts
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 4.2 Write property tests for permissions
    - **Property 10: Role-Based Access Control**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [x] 5. Server Actions
  - [x] 5.1 Create finance dashboard server actions
    - Create getFinanceDashboardEnhancedData action
    - Create refreshFinanceDashboard action
    - Create getCashFlowProjection action
    - Implement staleness check and auto-refresh logic
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 5.2 Write unit tests for server actions
    - Test data fetching with mock Supabase client
    - Test refresh logic
    - Test error handling
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 6. UI Components - Summary Cards
  - [x] 6.1 Create CashPositionCard component
    - Display cash received MTD and cash paid out MTD
    - Format currency values
    - _Requirements: 1.1_

  - [x] 6.2 Create RevenueMTDCard component
    - Display total invoiced amount for current month
    - Display percentage comparison to previous month
    - Show trend indicator (up/down/stable)
    - _Requirements: 1.2, 1.5_

  - [x] 6.3 Create ProfitMTDCard component
    - Display net profit amount
    - Display profit margin percentage
    - _Requirements: 1.3_

  - [x] 6.4 Create NetCashCard component
    - Display net cash (received - paid)
    - Show positive/negative indicator
    - _Requirements: 1.4_

- [x] 7. UI Components - AR/AP Sections
  - [x] 7.1 Create AROverviewCard component
    - Display total outstanding, overdue amount, invoice count
    - Integrate AgingBreakdownChart for AR
    - Add "View AR Details" link
    - Highlight overdue amount in red
    - Show warning indicator for 90+ days bucket
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 7.2 Create APOverviewCard component
    - Display total outstanding, overdue amount, pending verification count
    - Integrate AgingBreakdownChart for AP
    - Add "View AP Details" link
    - Highlight overdue amount in red
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 7.3 Create AgingBreakdownChart component
    - Create horizontal bar chart for aging buckets
    - Support both AR and AP data
    - Format currency values
    - Color-code buckets (green for current, yellow/orange/red for overdue)
    - _Requirements: 2.4, 3.4_

- [x] 8. UI Components - Bottom Section
  - [x] 8.1 Create PendingApprovalsCard component
    - Display BKK count badge and total amount
    - List up to 5 pending BKKs with number, JO reference, amount
    - Add click handler for individual BKK items
    - Add "Review All Pending" link
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 8.2 Create RevenueTrendChart component
    - Create line chart showing 6 months of data
    - Display both revenue and collected lines
    - Add tooltip for hover values
    - Add legend
    - Add "View Full Report" link
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9. UI Components - Quick Actions and Header
  - [x] 9.1 Create QuickActionsBar component
    - Add "Record Payment" button linking to payment form
    - Add "Record Vendor Invoice" button linking to vendor invoice form
    - Add "Approve BKK" button linking to BKK approvals
    - Add "Run AR Report" button linking to AR report
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 9.2 Create DashboardHeader component
    - Display time-based greeting
    - Display last updated timestamp
    - Add refresh button with loading state
    - _Requirements: 7.1, 7.2, 7.4_

- [x] 10. Main Dashboard Assembly
  - [x] 10.1 Create FinanceDashboardEnhanced component
    - Assemble all child components
    - Implement responsive grid layout
    - Handle loading and error states
    - _Requirements: 1.1-9.7_

  - [x] 10.2 Update dashboard page routing
    - Update /dashboard page to show FinanceDashboardEnhanced for finance role
    - Integrate with existing dashboard selector
    - _Requirements: 8.1_

- [x] 11. Checkpoint - UI Components Complete
  - Ensure all components render correctly, ask the user if questions arise.

- [x] 12. Integration and Polish
  - [x] 12.1 Wire up data fetching
    - Connect server actions to dashboard components
    - Implement refresh functionality
    - Add loading states during data fetch
    - _Requirements: 7.1, 7.2, 7.4_

  - [x] 12.2 Add navigation links
    - Ensure AR section links to /invoices with appropriate filters
    - Ensure AP section links to /finance/vendor-invoices
    - Ensure BKK items link to /finance/bkk/[id]
    - Ensure quick actions navigate correctly
    - _Requirements: 2.5, 3.5, 4.4, 4.5, 5.4, 6.5_

  - [x] 12.3 Write integration tests
    - Test dashboard renders with mock data
    - Test navigation links
    - Test refresh functionality
    - _Requirements: 1.1-9.7_

- [x] 13. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation builds on existing finance dashboard components where possible
