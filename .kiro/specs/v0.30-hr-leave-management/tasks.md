# Implementation Plan: HR Leave Management

## Overview

This implementation plan covers the HR Leave Management module (v0.30) for Gama ERP. The module enables employees to request leave with an approval workflow, balance tracking, and attendance integration. Implementation follows an incremental approach, building from database schema through utilities, server actions, and UI components.

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Create leave_types table with default data
    - Create table with all columns (type_code, type_name, default_days_per_year, carry-over settings, etc.)
    - Insert default leave types (annual, sick, maternity, paternity, marriage, bereavement, unpaid)
    - Add RLS policies for read access
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Create leave_balances table
    - Create table with employee_id, leave_type_id, year, entitled/used/pending/carried_over days
    - Add generated column for available_days calculation
    - Add unique constraint on (employee_id, leave_type_id, year)
    - Add indexes for employee_id and year
    - Add RLS policies
    - _Requirements: 2.1, 2.2_

  - [x] 1.3 Create leave_requests table with auto-numbering
    - Create table with all columns (request_number, dates, status, approval fields, etc.)
    - Create sequence for request numbers
    - Create trigger function for auto-generating LV-YYYY-NNNN format
    - Add indexes for employee_id, status, and date range
    - Add RLS policies
    - _Requirements: 3.1, 3.2_

- [x] 2. TypeScript Types and Utility Functions
  - [x] 2.1 Create TypeScript type definitions
    - Create types/leave.ts with LeaveType, LeaveBalance, LeaveRequest interfaces
    - Add LeaveRequestFormData and LeaveRequestStatus types
    - Add filter types for list queries
    - _Requirements: 1.2, 2.1, 3.1_

  - [x] 2.2 Implement calculateWorkingDays utility function
    - Create lib/leave-utils.ts
    - Implement function to count days excluding weekends
    - Integrate with holidays list to exclude holidays
    - Handle edge cases (same day, weekend-only ranges)
    - _Requirements: 3.3, 3.4_

  - [x] 2.3 Write property test for working days calculation
    - **Property 2: Working Days Calculation Excludes Non-Working Days**
    - **Validates: Requirements 3.3, 3.4**

  - [x] 2.4 Implement validateLeaveRequest utility function
    - Validate sufficient balance
    - Validate advance notice requirements
    - Validate attachment requirements
    - Validate date range (end >= start)
    - Return validation result with error messages
    - _Requirements: 1.3, 1.4, 1.5, 3.6, 3.7_

  - [x] 2.5 Write property tests for validation functions
    - **Property 3: Balance Validation Rejects Insufficient Balance**
    - **Property 9: Advance Notice Validation**
    - **Property 10: Attachment Requirement Validation**
    - **Validates: Requirements 1.3, 1.4, 1.5, 3.6, 3.7**

  - [x] 2.6 Implement balance calculation utilities
    - Implement calculateCarryOver function
    - Implement helper for available days verification
    - _Requirements: 2.2, 2.4_

  - [x] 2.7 Write property tests for balance calculations
    - **Property 1: Available Balance Calculation**
    - **Property 12: Carry-Over Calculation**
    - **Validates: Requirements 2.2, 2.4**

- [x] 3. Checkpoint - Verify utilities and database
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Server Actions - Core Operations
  - [x] 4.1 Implement getLeaveTypes and getLeaveBalances actions
    - Create app/(main)/hr/leave/actions.ts
    - Implement getLeaveTypes to fetch active leave types
    - Implement getLeaveBalances for employee/year
    - _Requirements: 2.1, 7.1_

  - [x] 4.2 Implement initializeYearlyBalances action
    - Fetch all active leave types
    - Get previous year balances for carry-over calculation
    - Create/upsert balances for new year
    - _Requirements: 2.3, 2.4_

  - [x] 4.3 Implement submitLeaveRequest action
    - Validate request using utility functions
    - Calculate total working days
    - Create leave request record
    - Update pending_days in balance
    - Send notification to manager
    - _Requirements: 3.1, 3.2, 3.6, 3.7, 3.8, 4.1_

  - [x] 4.4 Write property test for submission balance update
    - **Property 4: Successful Submission Updates Pending Days**
    - **Validates: Requirements 3.8**

  - [x] 4.5 Implement approveLeaveRequest action
    - Validate request is pending
    - Update status to approved with approver/timestamp
    - Move days from pending to used in balance
    - Mark attendance records as leave
    - Notify employee
    - _Requirements: 4.3, 4.4, 4.5, 4.8_

  - [x] 4.6 Write property test for approval balance transfer
    - **Property 5: Approval Moves Days from Pending to Used**
    - **Validates: Requirements 4.4**

  - [x] 4.7 Implement rejectLeaveRequest action
    - Validate request is pending
    - Require rejection reason
    - Update status to rejected
    - Return pending days to available
    - Notify employee
    - _Requirements: 4.6, 4.7, 4.8_

  - [x] 4.8 Write property test for rejection balance return
    - **Property 6: Rejection Returns Pending Days**
    - **Validates: Requirements 4.7**

  - [x] 4.9 Implement cancelLeaveRequest action
    - Validate request is pending (not approved/rejected)
    - Update status to cancelled
    - Return pending days to available
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 4.10 Write property tests for cancellation
    - **Property 7: Cancellation Returns Pending Days and Updates Status**
    - **Property 8: Only Pending Requests Can Be Cancelled**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [x] 5. Checkpoint - Verify server actions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Server Actions - Query Operations
  - [x] 6.1 Implement getLeaveRequests with filters
    - Support filtering by employee, leave type, status, date range
    - Include related data (employee, leave_type, handover_employee)
    - Order by created_at descending
    - _Requirements: 6.2, 6.4_

  - [x] 6.2 Write property test for filter accuracy
    - **Property 14: Filter Results Accuracy**
    - **Validates: Requirements 6.2**

  - [x] 6.3 Implement getMyLeaveRequests action
    - Fetch requests for current employee
    - Include leave type details
    - _Requirements: 7.2_

  - [x] 6.4 Implement getPendingRequestsCount action
    - Count pending requests for manager view
    - _Requirements: 6.3_

- [x] 7. UI Components - Balance and Status
  - [x] 7.1 Create leave-status-badge.tsx component
    - Display status with appropriate colors (pending=yellow, approved=green, rejected=red, cancelled=gray)
    - _Requirements: 6.4, 7.2_

  - [x] 7.2 Create leave-balance-cards.tsx component
    - Display balance cards for each leave type
    - Show entitled, used, pending, available days
    - Visual progress indicator for usage
    - _Requirements: 2.1, 7.1_

  - [x] 7.3 Create leave-type-select.tsx component
    - Dropdown for selecting leave type
    - Show available balance for each type
    - Indicate if attachment required
    - _Requirements: 1.3, 3.1_

- [x] 8. UI Components - Forms and Dialogs
  - [x] 8.1 Create leave-request-form.tsx component
    - Leave type selection with balance display
    - Date pickers for start/end date
    - Half-day checkbox with morning/afternoon selection
    - Calculated total days display
    - Reason, emergency contact, handover fields
    - Attachment upload (conditional on leave type)
    - Advance notice warning
    - Submit validation
    - _Requirements: 3.1, 3.5, 8.1_

  - [x] 8.2 Write property test for half-day support
    - **Property 13: Half-Day Support**
    - **Validates: Requirements 2.5, 3.5**

  - [x] 8.3 Create approve-reject-dialog.tsx component
    - Approve button
    - Reject button with reason input
    - Confirmation before action
    - _Requirements: 4.3, 4.6_

  - [x] 8.4 Create leave-filters.tsx component
    - Employee filter (for admin view)
    - Leave type filter
    - Status filter
    - Date range filter
    - _Requirements: 6.2_

- [x] 9. UI Components - List Views
  - [x] 9.1 Create leave-request-card.tsx component
    - Display request details (number, employee, type, dates, duration)
    - Show reason and handover info
    - Attachment link if present
    - Action buttons based on status and user role
    - _Requirements: 6.4, 8.3_

  - [x] 9.2 Create leave-request-list.tsx component
    - Pending requests section with approve/reject actions
    - Recent requests table
    - Pagination support
    - _Requirements: 6.1, 6.4_

  - [x] 9.3 Create my-leave-view.tsx component
    - Balance cards section
    - Request history table
    - Cancel action for pending requests
    - View details for completed requests
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 10. Checkpoint - Verify UI components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Page Routes
  - [x] 11.1 Create admin leave requests page
    - Route: /hr/leave
    - Integrate leave-request-list with filters
    - Show pending count badge
    - New request button
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 11.2 Create employee my-leave page
    - Route: /hr/my-leave
    - Integrate my-leave-view component
    - Request leave button
    - _Requirements: 7.1, 7.2_

  - [x] 11.3 Create leave request form page
    - Route: /hr/leave/request
    - Integrate leave-request-form
    - Redirect on success
    - _Requirements: 3.1_

- [x] 12. Navigation and Permissions
  - [x] 12.1 Add leave management to HR navigation
    - Add "Leave Requests" link for admin/manager
    - Add "My Leave" link for all employees
    - _Requirements: 6.1, 7.1_

  - [x] 12.2 Implement permission checks
    - Admin/Manager can view all requests and approve/reject
    - Employees can only view/manage their own requests
    - _Requirements: 4.2, 5.1_

- [x] 13. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including property-based tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation builds incrementally: database → types → utilities → actions → components → pages
