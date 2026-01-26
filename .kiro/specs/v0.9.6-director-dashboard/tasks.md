# Implementation Plan: Director Dashboard

## Overview

This implementation plan covers the Director Dashboard feature (v0.9.6) for GAMA ERP. The dashboard provides business-focused metrics and operational oversight for director role users, emphasizing business performance, operational KPIs, pipeline visibility, and financial health indicators. Implementation follows established patterns from other dashboard implementations.

## Tasks

- [x] 1. Create Director Data Service
  - [x] 1.1 Create lib/dashboard/director-data.ts with interfaces and main data fetcher
    - Define DirectorDashboardMetrics interface
    - Define RecentCompletedJob, RecentWonQuotation, PipelineSummary interfaces
    - Implement getDirectorDashboardMetrics function with cache integration
    - Use Promise.all for parallel database queries
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3, 7.4_
  
  - [x] 1.2 Write property tests for profit calculation
    - **Property 1: Profit calculation correctness**
    - **Validates: Requirements 1.1, 1.2, 1.3**
  
  - [x] 1.3 Write property tests for revenue change calculation
    - **Property 2: Revenue change calculation**
    - **Validates: Requirements 1.4, 1.6**

- [x] 2. Implement Rate Calculations
  - [x] 2.1 Add job completion rate calculation to director-data.ts
    - Calculate (completed jobs this month / total jobs this month) * 100
    - Handle division by zero case
    - _Requirements: 2.3_
  
  - [x] 2.2 Add win rate calculation to director-data.ts
    - Calculate (won quotations / (won + lost quotations)) * 100
    - Handle division by zero case
    - _Requirements: 3.5_
  
  - [x] 2.3 Add collection rate calculation to director-data.ts
    - Calculate (amount paid / total invoiced) * 100
    - Handle division by zero case
    - _Requirements: 4.3_
  
  - [x] 2.4 Write property tests for rate calculations
    - **Property 3: Job completion rate calculation**
    - **Property 4: Win rate calculation**
    - **Property 5: Collection rate calculation**
    - **Validates: Requirements 2.3, 3.5, 4.3**

- [x] 3. Implement Pipeline and Financial Health Queries
  - [x] 3.1 Add pipeline summary queries to director-data.ts
    - Fetch quotation counts by status (draft, submitted, won, lost)
    - Fetch PJO counts by status (draft, pending_approval, approved)
    - Fetch won quotation value this month
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 3.2 Add financial health queries to director-data.ts
    - Fetch AR outstanding (unpaid invoices)
    - Fetch AR overdue (past due date)
    - _Requirements: 4.1, 4.2_
  
  - [x] 3.3 Add pending approvals queries to director-data.ts
    - Fetch pending PJO approvals count
    - Fetch pending BKK approvals count
    - _Requirements: 2.4, 2.5_

- [x] 4. Implement Recent Activity Queries
  - [x] 4.1 Add recent completed jobs query to director-data.ts
    - Fetch 5 most recent completed jobs with customer name and amount
    - Order by completed_at descending
    - _Requirements: 6.1_
  
  - [x] 4.2 Add recent won quotations query to director-data.ts
    - Fetch 5 most recent won quotations with customer name and value
    - Order by outcome_date descending
    - _Requirements: 6.2_
  
  - [x] 4.3 Write property tests for recent items ordering
    - **Property 9: Recent items ordering and limiting**
    - **Validates: Requirements 6.1, 6.2**

- [x] 5. Checkpoint - Verify Data Service
  - Ensure all data service functions work correctly
  - Run property tests to verify correctness
  - Ask the user if questions arise

- [x] 6. Create Director Dashboard Page
  - [x] 6.1 Create app/(main)/dashboard/director/page.tsx with full implementation
    - Add role-based access control (director, owner only)
    - Fetch metrics using getDirectorDashboardMetrics
    - Implement header with briefcase icon and indigo theme
    - Use formatCurrency from lib/utils/format.ts
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4_
  
  - [x] 6.2 Write property tests for role-based access control
    - **Property 8: Role-based access control**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [x] 7. Implement Business Performance Section
  - [x] 7.1 Add Business Performance cards to dashboard page
    - Display total revenue formatted as currency
    - Display total profit formatted as currency
    - Display profit margin with color coding (green >= 25%, yellow 15-25%, red < 15%)
    - Display MoM revenue change with trend indicator
    - _Requirements: 1.5, 1.6, 1.7_
  
  - [x] 7.2 Write property tests for currency formatting
    - **Property 6: Currency formatting correctness**
    - **Validates: Requirements 1.5, 6.4**
  
  - [x] 7.3 Write property tests for threshold color coding
    - **Property 7: Threshold color coding**
    - **Validates: Requirements 1.7, 4.5**

- [x] 8. Implement Operational KPIs Section
  - [x] 8.1 Add Operational KPIs cards to dashboard page
    - Display active jobs count
    - Display completed jobs this month
    - Display job completion rate percentage
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 8.2 Add Pending Approvals alert to dashboard page
    - Display pending PJO approvals count
    - Display pending BKK approvals count
    - Show warning indicator if total > 5
    - _Requirements: 2.4, 2.5, 2.6_

- [x] 9. Implement Pipeline Overview Section
  - [x] 9.1 Add Pipeline Overview to dashboard page
    - Display quotation counts by status
    - Display PJO counts by status
    - Display win rate percentage
    - Display won value this month
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 10. Implement Financial Health Section
  - [x] 10.1 Add Financial Health cards to dashboard page
    - Display AR outstanding formatted as currency
    - Display AR overdue with red warning if > 0
    - Display collection rate with color coding (green >= 85%, yellow 70-85%, red < 70%)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 11. Implement Quick Actions Section
  - [x] 11.1 Add Quick Actions component to dashboard page
    - Add "View Reports" link to /reports
    - Add "Pending Approvals" link to appropriate page
    - Add "Active Jobs" link to /job-orders?status=active
    - Do NOT include user management links (owner-only)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 12. Implement Recent Activity Section
  - [x] 12.1 Add Recent Completed Jobs list to dashboard page
    - Display job number, customer name, amount, relative date
    - Format amounts as currency
    - Format dates as relative time
    - _Requirements: 6.1, 6.3, 6.4_
  
  - [x] 12.2 Add Recent Won Quotations list to dashboard page
    - Display quotation number, customer name, value, relative date
    - Format amounts as currency
    - Format dates as relative time
    - _Requirements: 6.2, 6.3, 6.4_

- [x] 13. Checkpoint - Verify Dashboard UI
  - Ensure all sections render correctly
  - Verify navigation links work
  - Test with director and owner roles
  - Test mobile responsiveness
  - Ask the user if questions arise

- [x] 14. Write Unit Tests
  - [x] 14.1 Write unit tests for director-data.ts
    - Test empty data scenarios
    - Test null value handling
    - Test division by zero cases
    - Test threshold boundary cases
    - Test role access scenarios
    - _Requirements: All_
  
  - [x] 14.2 Write property tests for cache round-trip
    - **Property 10: Cache round-trip**
    - **Validates: Requirements 7.2, 7.3**

- [x] 15. Final Checkpoint - Complete Testing
  - Run all tests (npm run test)
  - Run build (npm run build)
  - Verify no TypeScript errors
  - Ask the user if questions arise

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Follow existing patterns from lib/dashboard/finance-manager-data.ts
- Use centralized formatters from lib/utils/format.ts
- Dashboard should be mobile-friendly for remote access
- Director dashboard does NOT include user management (owner-only feature)
