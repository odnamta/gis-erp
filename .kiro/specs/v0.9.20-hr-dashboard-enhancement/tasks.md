# Implementation Plan: HR Dashboard Enhancement

## Overview

This implementation plan covers the HR Dashboard Enhancement feature (v0.9.20) for GAMA ERP. The enhanced dashboard provides HR personnel with comprehensive payroll metrics, leave balance tracking, attendance analytics, employee lifecycle events, and recent activity. Implementation follows existing patterns from the HSE Dashboard and Customs Dashboard.

## Tasks

- [x] 1. Create Enhanced HR Data Service
  - [x] 1.1 Create lib/dashboard/hr-data.ts with interfaces and main data fetcher
    - Define HrDashboardMetrics interface with all new metrics
    - Define PayrollByDepartment, LeaveBalanceSummary, AttendanceByDepartment interfaces
    - Define RecentLeaveRequest, RecentAttendanceCorrection interfaces
    - Implement getHrDashboardMetrics function with cache integration
    - Use Promise.all for parallel database queries
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4_

  - [x] 1.2 Write property tests for sum aggregation with date filtering
    - **Property 1: Sum aggregation with date filtering**
    - **Validates: Requirements 1.1, 1.3, 2.1**

  - [x] 1.3 Write property tests for status filtering
    - **Property 2: Status filtering correctness**
    - **Validates: Requirements 1.4, 3.1, 3.2, 4.4**

  - [x] 1.4 Write property tests for grouping aggregation
    - **Property 3: Grouping aggregation correctness**
    - **Validates: Requirements 1.2, 2.2, 3.4**

- [x] 2. Implement Threshold and Calculation Logic
  - [x] 2.1 Add threshold date filtering to hr-data.ts
    - Implement low leave balance count (available_days < 5)
    - Implement probation ending within 30 days
    - Implement contract renewals due within 30 days
    - _Requirements: 2.3, 4.1, 4.2_

  - [x] 2.2 Add percentage and average calculations to hr-data.ts
    - Calculate leave utilization rate with division by zero handling
    - Calculate average work hours per day
    - _Requirements: 2.4, 3.3_

  - [x] 2.3 Write property tests for threshold date filtering
    - **Property 4: Threshold date filtering correctness**
    - **Validates: Requirements 2.3, 4.1, 4.2**

  - [x] 2.4 Write property tests for percentage calculations
    - **Property 5: Percentage and average calculations**
    - **Validates: Requirements 2.4, 3.3**

- [x] 3. Implement Recent Activity Queries
  - [x] 3.1 Add recent leave requests query to hr-data.ts
    - Fetch 5 most recent leave requests with employee and leave type joins
    - Order by created_at descending
    - Transform to RecentLeaveRequest interface
    - _Requirements: 5.1, 5.2_

  - [x] 3.2 Add recent attendance corrections query to hr-data.ts
    - Fetch 5 most recent attendance corrections (is_corrected = true)
    - Order by updated_at descending
    - Transform to RecentAttendanceCorrection interface
    - _Requirements: 5.4, 5.5_

  - [x] 3.3 Write property tests for ordering and limiting
    - **Property 7: Ordering and limiting correctness**
    - **Validates: Requirements 5.2, 5.5**

  - [x] 3.4 Write property tests for data transformation
    - **Property 8: Data transformation completeness**
    - **Validates: Requirements 5.1, 5.4**

- [x] 4. Checkpoint - Verify Data Service
  - Ensure all data service functions work correctly
  - Run property tests to verify correctness
  - Ask the user if questions arise

- [x] 5. Enhance HR Dashboard Page
  - [x] 5.1 Update app/(main)/dashboard/hr/page.tsx with new layout
    - Update header with "HR Dashboard" title and Users icon
    - Add subtitle "Employee management and workforce analytics"
    - Update role-based access control (hr, owner, director)
    - Fetch metrics using getHrDashboardMetrics
    - Use formatCurrency and formatDate from lib/utils/format.ts
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 10.1, 10.2, 10.3, 10.4_

  - [x] 5.2 Write property tests for role-based access control
    - **Property 12: Role-based access control**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [x] 6. Implement Payroll Overview Section
  - [x] 6.1 Add Payroll Overview cards to dashboard page
    - Display total payroll this month formatted as currency
    - Display overtime hours this month
    - Display pending payroll adjustments count
    - Display payroll by department breakdown list
    - _Requirements: 1.5, 1.6_

- [x] 7. Implement Leave Balance Section
  - [x] 7.1 Add Leave Balance cards to dashboard page
    - Display leave days used this month
    - Display employees with low leave balance with WARNING indicator
    - Display leave utilization rate as percentage
    - Display leave balance summary by type
    - _Requirements: 2.5, 2.6_

  - [x] 7.2 Write property tests for threshold alert logic
    - **Property 6: Threshold alert logic**
    - **Validates: Requirements 2.5, 3.5, 4.5, 4.6**

- [x] 8. Implement Attendance Analytics Section
  - [x] 8.1 Add Attendance Analytics cards to dashboard page
    - Display late arrivals this month with WARNING indicator if > 10
    - Display early departures this month
    - Display average work hours formatted to one decimal place
    - Display attendance by department breakdown
    - _Requirements: 3.5, 3.6_

- [x] 9. Implement Employee Lifecycle Section
  - [x] 9.1 Add Employee Lifecycle cards to dashboard page
    - Display probation ending soon count with WARNING indicator
    - Display contract renewals due count with WARNING indicator
    - Display work anniversaries this month
    - Display resignations/terminations this month
    - _Requirements: 4.5, 4.6_

- [x] 10. Implement Quick Actions Section
  - [x] 10.1 Add Quick Actions component to dashboard page
    - Add "Add Employee" link to /hr/employees/new
    - Add "Process Payroll" link to /hr/payroll
    - Add "Approve Leave" link to /hr/leave?status=pending
    - Add "View Attendance" link to /hr/attendance
    - Add "Generate Reports" link to /hr/reports
    - Style with consistent card layout
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 11. Implement Recent Activity Lists
  - [x] 11.1 Add Recent Leave Requests list component
    - Display employee name, leave type, status, start_date, end_date
    - Add LeaveStatusBadge component with color coding
    - Format dates using formatDate utility
    - _Requirements: 5.1, 5.3, 5.6_

  - [x] 11.2 Write property tests for status color mapping
    - **Property 9: Status color mapping**
    - **Validates: Requirements 5.3**

  - [x] 11.3 Add Recent Attendance Corrections list component
    - Display employee name, attendance date, correction reason
    - Format dates using formatDate utility
    - _Requirements: 5.4, 5.6_

- [x] 12. Checkpoint - Verify Dashboard UI
  - Ensure all sections render correctly
  - Verify navigation links work
  - Test with different roles
  - Test mobile responsiveness
  - Ask the user if questions arise

- [x] 13. Implement Cache Key Generation
  - [x] 13.1 Verify cache key generation in hr-data.ts
    - Use generateCacheKey from dashboard-cache.ts
    - Format: 'hr-dashboard-metrics:{role}:{date}'
    - _Requirements: 7.4_

  - [x] 13.2 Write property tests for cache key format
    - **Property 10: Cache key format**
    - **Validates: Requirements 7.4**

  - [x] 13.3 Write property tests for cache round-trip
    - **Property 11: Cache round-trip**
    - **Validates: Requirements 7.2, 7.3**

- [x] 14. Write Unit Tests
  - [x] 14.1 Write unit tests for hr-data.ts
    - Test empty data scenarios
    - Test null value handling
    - Test date boundary cases
    - Test role access scenarios
    - Test threshold edge cases (balance=4,5,6; late=10,11)
    - Test division by zero scenarios
    - _Requirements: All_

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
- Follow existing patterns from lib/dashboard/hse-data.ts and lib/dashboard/customs-data.ts
- Use centralized formatters from lib/utils/format.ts
- Dashboard should be mobile-friendly for remote access
- Preserve existing metrics from hr-dashboard-data.ts while adding new ones
