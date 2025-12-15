# Implementation Plan

- [x] 1. Create admin dashboard utility functions
  - [x] 1.1 Create `lib/admin-dashboard-utils.ts` with type definitions
    - Define interfaces: AdminKPIs, PipelineStage, PendingWorkItem, RecentDocument, AgingBucket
    - Define types: AdminPeriodType, WorkItemType, ActionType
    - _Requirements: 2.1, 3.1, 4.1, 5.1, 6.1_

  - [x] 1.2 Implement period filter functions
    - Implement `getAdminPeriodDates()` for This Week, This Month, This Quarter
    - Implement `getAdminPreviousPeriodDates()` for comparison
    - _Requirements: 1.3_

  - [x] 1.3 Write property test for period date calculation
    - **Property 1: Period dates are valid ranges**
    - **Validates: Requirements 1.3**

  - [x] 1.4 Implement KPI calculation functions
    - Implement `countPJOsPendingApproval()` - filter by status 'pending_approval'
    - Implement `countPJOsReadyForJO()` - approved + all costs confirmed + not converted
    - Implement `countJOsInProgress()` - filter by status 'active'
    - Implement `countInvoicesUnpaid()` - filter by status 'sent' or 'overdue'
    - Implement `calculatePeriodRevenue()` - sum paid invoice amounts in period
    - Implement `countDocumentsCreated()` - count PJOs + JOs + Invoices in period
    - Implement `calculateAdminKPIs()` - aggregate all KPIs
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 1.5 Write property test for KPI calculations
    - **Property 2: KPI values are non-negative**
    - **Property 3: Document count equals sum of individual counts**
    - **Validates: Requirements 2.2-2.7**

  - [x] 1.6 Implement pipeline calculation functions
    - Implement `calculatePipelineStages()` - count PJOs by status
    - Calculate percentages for each stage
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 1.7 Write property test for pipeline calculations
    - **Property 4: Pipeline percentages are calculated correctly**
    - **Property 5: Pipeline counts PJOs correctly by status and conversion**
    - **Validates: Requirements 3.2, 3.3**

  - [x] 1.8 Implement pending work queue functions
    - Implement `determineActionNeeded()` - determine action based on item state
    - Implement `calculateDaysPending()` - days since last update
    - Implement `getPendingWorkItems()` - collect all pending items
    - Implement `sortByDaysPendingDesc()` - sort oldest first
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 1.9 Write property test for pending work queue
    - **Property 6: Pending work sorted by days descending**
    - **Property 7: All items have valid action types**
    - **Validates: Requirements 4.3, 4.4**

  - [x] 1.10 Implement invoice aging functions
    - Implement `calculateAgingBuckets()` - group invoices by days past due
    - Implement `getAgingBucket()` - determine bucket for single invoice
    - Buckets: Current, 1-30, 31-60, 61-90, 90+
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 1.11 Write property test for aging calculations
    - **Property 8: Aging buckets are mutually exclusive**
    - **Property 9: All unpaid invoices assigned to exactly one bucket**
    - **Property 10: Bucket amounts sum to total unpaid**
    - **Validates: Requirements 6.1, 6.2**

  - [x] 1.12 Implement recent documents functions
    - Implement `getRecentDocuments()` - combine and sort by date
    - Implement `filterDocumentsByType()` - filter by PJO/JO/Invoice
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 1.13 Write property test for recent documents
    - **Property 11: Recent documents sorted by date descending**
    - **Property 12: Filter returns only matching types**
    - **Property 13: Days pending calculation**
    - **Validates: Requirements 5.3, 5.4**

- [x] 2. Checkpoint - Ensure all utility tests pass
  - All 25 tests pass

- [x] 3. Create admin dashboard UI components
  - [x] 3.1 Create `components/dashboard/admin/admin-period-filter.tsx`
    - Dropdown with period options (This Week, This Month, This Quarter)
    - _Requirements: 1.3_

  - [x] 3.2 Create `components/dashboard/admin/admin-kpi-cards.tsx`
    - 6 KPI cards in responsive grid
    - Cards: PJOs Pending, Ready for JO, JOs In Progress, Invoices Unpaid, Revenue, Docs Created
    - Loading skeleton states
    - _Requirements: 2.1-2.7_

  - [x] 3.3 Create `components/dashboard/admin/pjo-status-pipeline.tsx`
    - Horizontal pipeline with status stages
    - Show count and percentage per stage
    - Clickable stages (link to filtered PJO list)
    - _Requirements: 3.1-3.4_

  - [x] 3.4 Create `components/dashboard/admin/pending-work-queue.tsx`
    - Table with Type, Number, Customer, Action Needed, Days Pending
    - Quick action buttons per row
    - Empty state message
    - _Requirements: 4.1-4.6_

  - [x] 3.5 Create `components/dashboard/admin/invoice-aging-summary.tsx`
    - Display aging buckets with count and amount
    - Warning colors for overdue buckets
    - Clickable buckets
    - _Requirements: 6.1-6.4_

  - [x] 3.6 Create `components/dashboard/admin/recent-documents-table.tsx`
    - Table with Type, Number, Customer, Status, Created, Updated
    - Type filter dropdown (All, PJO, JO, Invoice)
    - Links to document detail pages
    - _Requirements: 5.1-5.5_

  - [x] 3.7 Create `components/dashboard/admin/quick-actions-panel.tsx`
    - Quick action buttons: New PJO, New Customer, View All PJOs/JOs/Invoices
    - _Requirements: 7.1, 7.2_

  - [x] 3.8 Create `components/dashboard/admin/admin-dashboard.tsx`
    - Main container composing all components
    - Period filter state management
    - Welcome message with admin name
    - Layout matching the wireframe
    - _Requirements: 1.1, 1.2_

- [x] 4. Integrate admin dashboard with routing
  - [x] 4.1 Create server action for admin dashboard data
    - Add `fetchAdminDashboardData()` in `app/(main)/dashboard/actions.ts`
    - Fetch PJOs, JOs, Invoices with customer joins
    - _Requirements: 1.1, 8.2_

  - [x] 4.2 Update dashboard page to route admin users
    - Modify `app/(main)/dashboard/page.tsx` to render AdminDashboard for role='admin'
    - _Requirements: 1.1_

  - [x] 4.3 Write property test for dashboard routing
    - **Property 13: Admin role renders AdminDashboard** (covered by routing logic)
    - **Validates: Requirements 1.1**

- [x] 5. Final Checkpoint - Ensure all tests pass
  - All 25 tests pass
