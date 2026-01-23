# Implementation Plan: Marketing Manager Dashboard Real Data

## Overview

Convert the Marketing Manager dashboard from mock/placeholder data to real Supabase queries, following the established pattern from the Finance Manager dashboard. Implementation uses TypeScript with server-side data fetching and 5-minute caching.

## Tasks

- [x] 1. Create the Marketing Manager data service
  - [x] 1.1 Create `lib/dashboard/marketing-manager-data.ts` with MarketingManagerMetrics interface
    - Define interface with all metric fields (pipeline, customers, engineering, recent activity)
    - Export interface for use in dashboard page
    - _Requirements: 1.1-1.6, 2.1-2.2, 3.1-3.4, 4.1, 5.1-5.3, 6.1-6.2_
  
  - [x] 1.2 Implement `getMarketingManagerMetrics()` function with parallel Supabase queries
    - Use Promise.all for parallel query execution
    - Query quotations for MTD counts, pipeline breakdown, and recent items
    - Query customers for total and MTD counts
    - Query route_surveys for active survey count
    - Query journey_management_plans for active JMP count
    - _Requirements: 1.1-1.6, 2.1-2.2, 4.1, 5.1-5.3, 6.1-6.2_
  
  - [x] 1.3 Implement metric calculations (win rate, revenue aggregation)
    - Calculate win rate as won/(won+lost)*100, handle division by zero
    - Calculate quotation value MTD (sum of total_revenue)
    - Calculate revenue MTD from won quotations (permission-gated)
    - Calculate average deal size (permission-gated)
    - _Requirements: 1.2, 1.5, 1.6, 3.2, 3.3, 3.4_
  
  - [x] 1.4 Integrate caching using dashboard-cache.ts utilities
    - Use generateCacheKey with 'marketing-manager-metrics' prefix
    - Use getOrFetch with 5-minute TTL
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 1.5 Write property test for win rate calculation
    - **Property 3: Win Rate Calculation**
    - **Validates: Requirements 1.5, 1.6**

  - [x] 1.6 Write property test for MTD filtering logic
    - **Property 1: MTD Quotation Count Accuracy**
    - **Property 2: MTD Quotation Value Aggregation**
    - **Validates: Requirements 1.1, 1.2**

- [x] 2. Checkpoint - Verify data service
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Update the Marketing Manager dashboard page
  - [x] 3.1 Import and call `getMarketingManagerMetrics()` in the server component
    - Import the data service function
    - Fetch metrics in the page component
    - _Requirements: 8.1_
  
  - [x] 3.2 Replace mock values with real data in Marketing section
    - Update "Active Quotations" card with `activeQuotations`
    - Update "Win Rate" card with `winRatePercent`
    - Update "Pipeline Value" card with `pipelineValue` formatted as IDR
    - _Requirements: 8.2, 8.3_
  
  - [x] 3.3 Replace mock values with real data in Engineering section
    - Update "Pending Reviews" card with `pendingEngineeringReview`
    - Update "Active Surveys" card with `activeSurveys`
    - Update "JMP Status" card with `activeJMPs`
    - _Requirements: 8.2_
  
  - [x] 3.4 Add customer metrics section (optional enhancement)
    - Display total customers and new customers MTD
    - _Requirements: 2.1, 2.2_

  - [x] 3.5 Write unit tests for dashboard page rendering
    - Test that page renders with metrics data
    - Test currency formatting displays correctly
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [x] 4. Checkpoint - Verify dashboard integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add recent activity display
  - [x] 5.1 Create recent quotations list component
    - Display last 5 quotations with number, title, customer, status, date
    - Link to quotation detail page
    - _Requirements: 6.1_
  
  - [x] 5.2 Create recent customers list component
    - Display last 5 customers with name and created date
    - Link to customer detail page
    - _Requirements: 6.2_

  - [x] 5.3 Write property test for recent items ordering
    - **Property 8: Recent Items Ordering**
    - **Validates: Requirements 6.1, 6.2**

- [x] 6. Final verification and build
  - [x] 6.1 Run `npm run build` to verify no TypeScript errors
    - Fix any type inference issues with explicit casts if needed
  
  - [x] 6.2 Test dashboard as marketing_manager role
    - Verify all metrics display real data
    - Verify revenue metrics show for marketing_manager (can_see_revenue = true)
    - Verify dashboard loads within 2 seconds

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive testing
- Each task references specific requirements for traceability
- Follow the pattern from `lib/dashboard/finance-manager-data.ts` for consistency
- Use explicit type casts for Supabase queries to avoid "type instantiation too deep" errors
- Currency formatting should use existing `formatCurrency` utility from `lib/utils/format.ts`
