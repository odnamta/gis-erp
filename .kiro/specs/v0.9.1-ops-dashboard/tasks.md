# Implementation Plan

- [x] 1. Create ops dashboard data utilities
  - [x] 1.1 Create `lib/ops-dashboard-utils.ts` with data fetching functions
    - Implement `getOpsKPIs()` for KPI card data
    - Implement `getPendingCostEntries()` with urgency calculation
    - Implement `getActiveJobs()` for active JO list
    - Implement `getWeeklyStats()` for performance metrics
    - _Requirements: 2.1, 3.1, 6.1, 6.2, 7.1_
  - [x] 1.2 Write property tests for data utilities
    - **Property 2: Pending cost entries filter correctly**
    - **Property 4: Active jobs filter correctly**
    - **Property 8: Urgency calculation**
    - **Property 9: Pending entries sort order**
    - **Property 10: Weekly trend calculation**
    - **Validates: Requirements 2.1, 3.1, 6.3, 7.1, 7.2**

- [x] 2. Create ops dashboard components
  - [x] 2.1 Create `components/dashboard/ops/ops-kpi-cards.tsx`
    - 4 KPI cards: Pending Cost Entry, In Progress Jobs, Completed This Week, Over Budget Items
    - Include urgent count badge on Pending card
    - _Requirements: 1.3, 7.3_
  - [x] 2.2 Create `components/dashboard/ops/pending-costs-table.tsx`
    - Table with PJO number, project, customer, progress, action columns
    - Urgent badge for items > 3 days old
    - "Enter" button linking to cost entry page
    - _Requirements: 2.2, 2.3, 2.4, 7.1_
  - [x] 2.3 Create `components/dashboard/ops/active-jobs-table.tsx`
    - Table with JO number, commodity, route (POL → POD), status, action columns
    - "View" button linking to JO detail page
    - _Requirements: 3.2, 3.3_
  - [x] 2.4 Create `components/dashboard/ops/weekly-stats.tsx`
    - Show completed this week vs last week
    - Show average completion time
    - Trend indicator (up/down/stable)
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 2.5 Create `components/dashboard/ops/ops-dashboard.tsx`
    - Main container composing all ops components
    - NO revenue, profit, or margin data anywhere
    - _Requirements: 1.2_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement dashboard routing
  - [x] 4.1 Update `app/(main)/dashboard/page.tsx` with role-based rendering
    - Check user role from permission context
    - Render OpsDashboard for ops users
    - Render existing dashboard for admin/manager/finance
    - _Requirements: 1.1_
  - [x] 4.2 Write property test for dashboard routing
    - **Property 1: Ops users cannot see financial data**
    - **Validates: Requirements 1.2, 1.4**

- [x] 5. Update navigation filtering
  - [x] 5.1 Update `lib/navigation.ts` to filter menu items by role
    - Hide Customers, Invoices, Reports for ops users
    - Show Dashboard, Projects, PJOs, Job Orders for ops users
    - _Requirements: 5.1, 5.2_
  - [x] 5.2 Update `components/layout/sidebar.tsx` to use filtered navigation
    - Apply navigation filter based on user permissions
    - _Requirements: 5.1, 5.2_
  - [x] 5.3 Write property test for navigation filtering
    - **Property 7: Navigation filtering for ops role**
    - **Validates: Requirements 5.1, 5.2**

- [x] 6. Implement route protection
  - [x] 6.1 Update `middleware.ts` to redirect ops users from restricted pages
    - Redirect from /customers, /invoices, /reports to /dashboard
    - Show toast notification on redirect
    - _Requirements: 5.3_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement quick cost entry modal
  - [x] 8.1 Create `components/dashboard/ops/quick-cost-modal.tsx`
    - Modal dialog for entering cost without navigation
    - Show budget cap and current variance
    - Inline justification field when exceeded
    - _Requirements: 8.1, 8.3_
  - [x] 8.2 Add optimistic update to pending costs table
    - Update progress count immediately on submission
    - Revalidate data in background
    - _Requirements: 8.2_
  - [x] 8.3 Write property test for justification validation
    - **Property 6: Justification required for exceeded costs**
    - **Validates: Requirements 4.4**

- [x] 9. Add budget visibility to cost entry
  - [x] 9.1 Ensure cost entry page shows budget cap for each item
    - Display estimated_amount as "Budget" column
    - _Requirements: 4.1_
  - [x] 9.2 Ensure variance is displayed with warning indicator
    - Show variance calculation
    - Red warning when actual > budget
    - _Requirements: 4.2, 4.3_
  - [x] 9.3 Write property test for variance calculation
    - **Property 5: Budget variance calculation**
    - **Validates: Requirements 4.2, 4.3**

- [x] 10. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
