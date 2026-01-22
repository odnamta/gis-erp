# Implementation Plan: User Activity Tracking (v0.13.1)

## Overview

This plan implements user activity tracking for GAMA ERP, including database setup, activity logging utility, middleware page view tracking, action logging integration, and an activity viewer page.

## Tasks

- [x] 1. Set up database schema and types
  - [x] 1.1 Create user_activity_log table migration
    - Run SQL to create table with all columns (id, user_id, user_email, action_type, resource_type, resource_id, page_path, metadata, ip_address, user_agent, session_id, created_at)
    - Create indexes on user_id, created_at, action_type, resource_type
    - Enable RLS and create policies for user access and admin access
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 1.2 Create TypeScript types for activity tracking
    - Create `types/activity.ts` with UserActivityLog, ActionType, ResourceType, ActivityFilters, DailyActivityCount interfaces
    - _Requirements: 2.4, 2.5_

- [x] 2. Implement activity logger utility
  - [x] 2.1 Create activity logger module
    - Create `lib/activity-logger.ts` with logActivity and logPageView functions
    - Implement async non-blocking logging pattern
    - Add user_email lookup from user_profiles
    - Add error handling that logs but doesn't throw
    - _Requirements: 2.1, 2.2, 2.3, 2.6_
  
  - [x] 2.2 Write property test for activity logging consistency
    - **Property 2: Activity Logging Consistency**
    - **Validates: Requirements 2.2, 2.3**

- [x] 3. Implement middleware page view tracking
  - [x] 3.1 Update middleware with page view tracking
    - Add rate limiter with in-memory cache (1-minute TTL)
    - Add excluded paths list (/_next, /api, /auth, /login, /favicon.ico, /static)
    - Integrate logPageView call for non-excluded paths
    - Ensure non-blocking execution
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 3.2 Write property test for page view rate limiting
    - **Property 3: Page View Rate Limiting**
    - **Validates: Requirements 3.3**
  
  - [x] 3.3 Write property test for page view exclusion
    - **Property 4: Page View Exclusion**
    - **Validates: Requirements 3.2**

- [x] 4. Checkpoint - Verify core logging infrastructure
  - Ensure activity logger works correctly
  - Verify page views are being logged
  - Check rate limiting is working
  - Ask the user if questions arise

- [x] 5. Add activity logging to server actions
  - [x] 5.1 Add logging to customer actions
    - Update `app/(main)/customers/actions.ts`
    - Log create, update, delete actions with customer name in metadata
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 5.2 Add logging to PJO actions
    - Update `app/(main)/proforma-jo/actions.ts`
    - Log create, update, approve, reject actions with pjo_number in metadata
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 5.3 Add logging to job order actions
    - Update `app/(main)/job-orders/actions.ts`
    - Log create, update, complete actions with jo_number in metadata
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 5.4 Add logging to invoice actions
    - Update `app/(main)/invoices/actions.ts`
    - Log create, update, send actions with invoice_number in metadata
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 5.5 Add logging to disbursement actions
    - Update `app/(main)/disbursements/actions.ts`
    - Log create, approve, release actions with reference in metadata
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 5.6 Add logging to employee actions
    - Update `app/(main)/hr/employees/actions.ts`
    - Log create, update actions with employee name in metadata
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 6. Checkpoint - Verify action logging
  - Test creating/updating records in each module
  - Verify activities are logged with correct metadata
  - Ask the user if questions arise

- [x] 7. Create activity viewer page
  - [x] 7.1 Create activity viewer page
    - Create `app/(main)/settings/activity/page.tsx`
    - Add role-based access check (owner, director, sysadmin only)
    - _Requirements: 10.1, 10.6_
  
  - [x] 7.2 Create activity timeline component
    - Create `components/activity/activity-timeline.tsx`
    - Display user email, action type, resource type, timestamp
    - Show relative timestamps using date-fns
    - Add clickable resource links
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [x] 7.3 Create activity chart component
    - Create `components/activity/activity-chart.tsx`
    - Display bar chart of actions per day (last 7 days)
    - Use simple HTML/CSS or lightweight chart approach
    - _Requirements: 10.5_
  
  - [x] 7.4 Implement dashboard filters and metrics
    - Add user filter dropdown
    - Add action type filter
    - Add date range filter (Today, Last 7 days, Last 30 days)
    - Display daily active users count
    - Fetch and display last 50 activities
    - _Requirements: 10.2, 10.3, 10.4, 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [x] 7.5 Write property test for filter correctness
    - **Property 6: Filter Correctness**
    - **Validates: Requirements 10.4, 12.4, 12.5**
  
  - [x] 7.6 Write property test for RLS access control
    - **Property 1: RLS Access Control**
    - **Validates: Requirements 1.3, 1.4, 10.6**

- [x] 8. Create utility functions
  - [x] 8.1 Create resource URL generator
    - Create utility function to generate navigation URLs for resources
    - Handle all resource types (customer, pjo, job_order, invoice, disbursement, employee)
    - _Requirements: 11.5_
  
  - [x] 8.2 Write property test for resource URL generation
    - **Property 8: Resource Navigation URL Generation**
    - **Validates: Requirements 11.5**

- [x] 9. Final checkpoint - Build and test
  - Run `npm run build` to verify no build errors
  - Test as different user roles
  - Verify activity viewer at /settings/activity shows correct data
  - Verify non-admins cannot access activity viewer page
  - Ask the user if questions arise

## Notes

- All tasks including property tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- The activity logger uses fire-and-forget pattern to avoid impacting user experience
- Rate limiting uses in-memory cache which resets on server restart (acceptable for this use case)

