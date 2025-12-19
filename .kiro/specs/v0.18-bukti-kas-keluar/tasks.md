# Implementation Plan: Bukti Kas Keluar (BKK) System

## Overview

This implementation plan covers the complete BKK (Cash Disbursement) system, from database setup through UI components and dashboard integration. Tasks are ordered to build incrementally, with core utilities and database first, followed by server actions, then UI components.

## Tasks

- [x] 1. Database Setup and Types
  - [x] 1.1 Create bukti_kas_keluar table migration
    - Create table with all columns as specified in design
    - Add indexes for jo_id, status, and pjo_cost_item_id
    - Add RLS policies for role-based access
    - _Requirements: 1.2, 1.6, 2.2, 2.4, 3.3, 4.6_

  - [x] 1.2 Add BKK types to types/database.ts
    - Add BKKStatus type
    - Add BKKReleaseMethod type
    - Add BKK interface
    - Add BKKWithRelations interface
    - Add input types (CreateBKKInput, ReleaseBKKInput, SettleBKKInput)
    - Add calculated types (AvailableBudget, SettlementDifference, BKKSummaryTotals)
    - _Requirements: All_

- [x] 2. Core Utility Functions
  - [x] 2.1 Create lib/bkk-utils.ts with core functions
    - Implement generateBKKNumber(year, sequence)
    - Implement calculateAvailableBudget(budgetAmount, existingBKKs)
    - Implement calculateSettlementDifference(releasedAmount, spentAmount)
    - Implement isValidStatusTransition(currentStatus, newStatus)
    - Implement calculateBKKSummary(bkks)
    - Implement getAvailableActions(status, userRole)
    - _Requirements: 1.2, 1.3, 4.3, 4.4, 5.3, 5.4, 5.5, 5.6, 7.1_

  - [x] 2.2 Write property test for BKK number generation
    - **Property 1: BKK Number Format Validity**
    - **Validates: Requirements 1.2**

  - [x] 2.3 Write property test for status transitions
    - **Property 2: Status Transition Validity**
    - **Validates: Requirements 2.1, 2.5, 3.1, 4.1**

  - [x] 2.4 Write property test for budget calculation
    - **Property 5: Budget Calculation Correctness**
    - **Validates: Requirements 1.3, 1.4, 7.1, 7.2**

  - [x] 2.5 Write property test for settlement difference
    - **Property 6: Settlement Difference Calculation**
    - **Validates: Requirements 4.3, 4.4**

  - [x] 2.6 Write property test for BKK summary calculation
    - **Property 8: BKK Summary Calculation**
    - **Validates: Requirements 5.3**

- [x] 3. Checkpoint - Core utilities complete
  - Ensure all utility tests pass, ask the user if questions arise.

- [x] 4. Server Actions
  - [x] 4.1 Create app/(main)/job-orders/bkk-actions.ts
    - Implement createBKK with validation and number generation
    - Implement getBKKsByJobOrder
    - Implement getBKKById
    - _Requirements: 1.2, 1.5, 1.6_

  - [x] 4.2 Implement approval workflow actions
    - Implement approveBKK with status transition validation
    - Implement rejectBKK with rejection_reason requirement
    - Implement cancelBKK with permission check
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.3 Implement release and settlement actions
    - Implement releaseBKK with release_method validation
    - Implement settleBKK with cost item synchronization
    - Update pjo_cost_items.actual_amount on settlement
    - Set cost item status based on budget comparison
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.6, 4.7, 4.8, 4.9_

  - [x] 4.4 Implement dashboard query actions
    - Implement getPendingBKKs for finance dashboard
    - Implement getBKKSummary for JO detail
    - _Requirements: 5.3, 6.1, 6.2_

  - [x] 4.5 Write property test for state consistency
    - **Property 3: State Consistency After Transitions**
    - **Validates: Requirements 1.6, 2.2, 2.4, 3.3, 4.6**

  - [x] 4.6 Write property test for input validation
    - **Property 4: Input Validation Completeness**
    - **Validates: Requirements 1.5, 2.3, 3.2, 4.2**

  - [x] 4.7 Write property test for cost item synchronization
    - **Property 7: Cost Item Synchronization After Settlement**
    - **Validates: Requirements 4.7, 4.8, 4.9**

- [x] 5. Checkpoint - Server actions complete
  - Ensure all server action tests pass, ask the user if questions arise.

- [x] 6. UI Components - Status and Display
  - [x] 6.1 Create components/ui/bkk-status-badge.tsx
    - Implement status badge with colors per design
    - Add tooltip with status details on hover
    - _Requirements: 8.1, 8.2_

  - [x] 6.2 Create components/bkk/bkk-summary.tsx
    - Display total requested, released, settled, pending return
    - _Requirements: 5.3_

  - [x] 6.3 Create components/bkk/bkk-list.tsx
    - Display BKK table with all columns
    - Show appropriate action buttons based on status
    - _Requirements: 5.2, 5.4, 5.5, 5.6_

  - [x] 6.4 Write property test for action availability
    - **Property 9: Action Availability Based on Status**
    - **Validates: Requirements 5.4, 5.5, 5.6**

- [x] 7. UI Components - Forms
  - [x] 7.1 Create components/bkk/bkk-form.tsx
    - Cost item selector with budget display
    - Purpose and amount input fields
    - Budget warning when exceeding available
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

  - [x] 7.2 Create components/bkk/bkk-settle-form.tsx
    - Display released amount
    - Amount spent input
    - Difference calculation display
    - Receipt upload functionality
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [x] 7.3 Create components/bkk/bkk-detail-view.tsx
    - Display all BKK information
    - Show workflow history (request, approval, release, settlement)
    - Display receipts gallery
    - _Requirements: 3.4_

  - [x] 7.4 Create components/bkk/bkk-section.tsx
    - Container for BKK list and summary on JO detail
    - Request BKK button
    - _Requirements: 1.1, 5.1_

- [x] 8. Pages
  - [x] 8.1 Create app/(main)/job-orders/[id]/bkk/new/page.tsx
    - BKK request form page
    - Load cost items for the JO
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 8.2 Create app/(main)/job-orders/[id]/bkk/[bkkId]/page.tsx
    - BKK detail view page
    - _Requirements: 3.4, 5.6_

  - [x] 8.3 Create app/(main)/job-orders/[id]/bkk/[bkkId]/settle/page.tsx
    - Settlement form page
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 8.4 Integrate BKK section into JO detail page
    - Add BKKSection component to jo-detail-view.tsx
    - _Requirements: 5.1_

- [x] 9. Finance Dashboard Integration
  - [x] 9.1 Create components/dashboard/finance/pending-bkk-table.tsx
    - Display pending BKK approvals
    - Approve/Reject action buttons
    - Rejection reason dialog
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 9.2 Integrate pending BKK table into finance dashboard
    - Add to finance-dashboard.tsx
    - _Requirements: 6.1_

- [x] 10. Budget Validation Integration
  - [x] 10.1 Add BKK disbursement display to cost items
    - Show total disbursed from BKKs on cost item display in JO detail
    - _Requirements: 7.2_

  - [x] 10.2 Implement cost item status check for BKK creation
    - Prevent BKK creation for confirmed/exceeded cost items (in bkk-form.tsx)
    - _Requirements: 7.3_

- [x] 11. Final Checkpoint
  - All 31 tests pass
  - Complete workflow implemented: request → approve → release → settle

## Notes

- All tasks including property-based tests are required
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
