# Implementation Plan: System Admin Dashboard (v0.9.21)

## Overview

This implementation plan creates a System Admin Dashboard for IT/system management, focusing on user statistics, system activity monitoring, and administrative quick actions. The implementation follows existing dashboard patterns (HR, HSE, Customs, Engineering) using TypeScript, Next.js 15, and Supabase.

## Tasks

- [x] 1. Create data service for sysadmin dashboard metrics
  - [x] 1.1 Create lib/dashboard/sysadmin-data.ts with interfaces and main data fetcher
    - Define SysadminDashboardMetrics, RoleDistribution, RecentActivity, RecentDocumentChange interfaces
    - Implement getSysadminDashboardMetrics function with parallel Supabase queries
    - Use dashboard-cache with 5-minute TTL and key pattern 'sysadmin-dashboard-metrics:{role}:{date}'
    - Query user_profiles for user statistics (total, active, active today/week, new this month)
    - Query user_profiles for role distribution (grouped by role, sorted by count desc)
    - Query user_activity_log for system activity (logins, page views, total actions today)
    - Query user_activity_log for recent activities (last 20, ordered by created_at desc)
    - Query activity_log for recent document changes (last 10, ordered by created_at desc)
    - Calculate actions per hour (total actions / hours elapsed, handle division by zero)
    - _Requirements: 1.1-1.5, 2.1-2.4, 3.1-3.4, 4.1-4.3, 5.1-5.3, 7.1-7.4_

  - [x] 1.2 Write property tests for sysadmin data utilities
    - **Property 1: Count filtering correctness**
    - **Property 2: Grouping aggregation correctness**
    - **Property 3: Actions per hour calculation**
    - **Property 4: Ordering and limiting correctness**
    - **Property 5: Data transformation completeness**
    - **Validates: Requirements 1.1-1.5, 2.1-2.4, 3.1-3.4, 4.1-4.3, 5.1-5.3**

  - [x] 1.3 Write unit tests for sysadmin data service
    - Test empty data scenarios (no users, no activities)
    - Test single record scenarios
    - Test division by zero for actions per hour
    - Test role distribution sorting
    - Test data transformation with null values
    - _Requirements: 1.1-1.5, 2.1-2.4, 3.1-3.4_

- [x] 2. Checkpoint - Verify data service
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create sysadmin dashboard page
  - [x] 3.1 Create app/(main)/dashboard/sysadmin/page.tsx
    - Add role-based access control (allow sysadmin, owner, director)
    - Redirect unauthorized roles to /dashboard
    - Redirect unauthenticated users to /login
    - Fetch metrics using getSysadminDashboardMetrics
    - _Requirements: 8.1-8.5_

  - [x] 3.2 Implement dashboard header and quick actions
    - Display header with "System Admin Dashboard" title and Settings icon
    - Display subtitle "System health and user management"
    - Add Quick Actions section with links to User Management, Activity Logs, System Settings
    - Use gray/slate color scheme
    - _Requirements: 6.1-6.5, 10.1-10.4_

  - [x] 3.3 Implement user statistics section
    - Display Total Users, Active Users, Active Today, Active This Week, New This Month
    - Use Card components with appropriate icons
    - Format numbers appropriately
    - _Requirements: 1.6_

  - [x] 3.4 Implement system activity section
    - Display Logins Today, Page Views Today, Total Actions Today, Actions/Hour
    - Use Card components with appropriate icons
    - Format actions per hour to one decimal place
    - _Requirements: 3.5_

  - [x] 3.5 Implement role distribution section
    - Display list of roles with user counts
    - Sort by count descending
    - Use appropriate styling for role names
    - _Requirements: 2.2, 2.3_

  - [x] 3.6 Implement recent activity section
    - Display last 20 activities from user_activity_log
    - Show user_email, action_type, page_path/resource_type, created_at
    - Use color-coded badges for action types (login=green, page_view=blue, create=purple, update=yellow, delete=red)
    - Format timestamps using formatDateTime
    - _Requirements: 4.1-4.5_

  - [x] 3.7 Implement recent document changes section
    - Display last 10 entries from activity_log
    - Show user_name, action_type, document_type, document_number, created_at
    - Format timestamps using formatDateTime
    - _Requirements: 5.1-5.4_

  - [x] 3.8 Implement responsive layout
    - Use responsive grid that adapts to screen size
    - Stack cards vertically on mobile
    - Ensure touch-friendly tap targets (min 44px)
    - _Requirements: 9.1-9.3_

  - [x] 3.9 Write property tests for UI components
    - **Property 6: Action type color mapping**
    - **Property 9: Role-based access control**
    - **Validates: Requirements 4.5, 8.1-8.4**

- [x] 4. Checkpoint - Verify dashboard page
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Write cache-related tests
  - [x] 5.1 Write property tests for caching
    - **Property 7: Cache key format**
    - **Property 8: Cache round-trip**
    - **Validates: Requirements 7.2-7.4**

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Follow existing dashboard patterns from HR, HSE, Customs, Engineering dashboards
- Use TypeScript strict mode throughout
- Use shadcn/ui components for consistent styling
