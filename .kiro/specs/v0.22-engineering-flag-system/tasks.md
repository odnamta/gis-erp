# Implementation Plan: Engineering Flag System

## Overview

This implementation plan covers the Engineering Flag System for PJOs. The system automatically flags complex projects for engineering review and blocks approval until the review is completed or waived.

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Apply migration to add engineering fields to proforma_job_orders table
    - Add requires_engineering, engineering_status, engineering_assigned_to, engineering_assigned_at, engineering_completed_at, engineering_completed_by, engineering_notes, engineering_waived_reason columns
    - _Requirements: 1.1_
  - [x] 1.2 Apply migration to create engineering_assessments table
    - Create table with all required fields and indexes
    - Add foreign key constraint to proforma_job_orders
    - _Requirements: 1.2, 1.3, 1.4_

- [x] 2. TypeScript Types and Utilities
  - [x] 2.1 Create engineering types file
    - Create `types/engineering.ts` with EngineeringStatus, AssessmentType, RiskLevel, EngineeringDecision types
    - Add EngineeringAssessment interface and related types
    - Add label constants for UI display
    - _Requirements: 2.4, 5.2_
  - [x] 2.2 Update database types
    - Update `types/database.ts` to include engineering fields on PJO type
    - Add EngineeringAssessment table type
    - _Requirements: 1.1, 1.2_
  - [x] 2.3 Create engineering utility functions
    - Create `lib/engineering-utils.ts` with core functions
    - Implement checkEngineeringRequired, determineRequiredAssessments, calculateEngineeringStatus, canApprovePJO, calculateTotalAdditionalCosts
    - _Requirements: 2.1, 2.2, 3.2, 3.3, 3.4, 3.5, 3.6, 4.4, 4.5, 4.6, 7.1, 7.3, 7.4_
  - [x] 2.4 Write property tests for engineering utilities
    - **Property 1: Engineering flag based on complexity score**
    - **Property 5: Assessment creation based on complexity factors**
    - **Property 8: Engineering status calculation from assessments**
    - **Property 15: Approval blocking logic**
    - **Validates: Requirements 2.1, 3.2-3.6, 4.4-4.6, 7.1-7.4**

- [x] 3. Checkpoint - Verify utilities work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Server Actions
  - [x] 4.1 Create engineering server actions file
    - Create `app/(main)/proforma-jo/engineering-actions.ts`
    - Implement initializeEngineeringReview action
    - _Requirements: 3.1, 3.2_
  - [x] 4.2 Implement assessment management actions
    - Implement startAssessment, completeAssessment actions
    - Update engineering status on assessment changes
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 4.3 Implement review completion action
    - Implement completeEngineeringReview action
    - Handle cost application when enabled
    - _Requirements: 5.1, 5.3, 5.4, 5.5_
  - [x] 4.4 Implement waiver action
    - Implement waiveEngineeringReview action
    - Add permission check for manager role
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 4.5 Implement fetch actions
    - Implement getEngineeringAssessments action
    - _Requirements: 9.1_
  - [x] 4.6 Write unit tests for server actions
    - Test assignment creates assessments
    - Test completion updates status
    - Test waiver requires reason and permission
    - **Validates: Requirements 3.1, 4.1-4.3, 5.1, 5.3, 6.1-6.4**

- [x] 5. Update PJO Actions for Engineering Integration
  - [x] 5.1 Update PJO creation/update to check engineering requirement
    - Modify createPJO and updatePJO to set requires_engineering based on complexity score
    - Set engineering_status to 'pending' when flagged
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 5.2 Update approvePJO to check engineering status
    - Add engineering status check before allowing approval
    - Return blocking reason when approval is blocked
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 5.3 Write property tests for approval blocking
    - **Property 15: Approval blocking logic**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [x] 6. Checkpoint - Verify server actions work correctly
  - All 54 tests pass (30 engineering-utils + 24 engineering-actions)

- [x] 7. UI Components - Status Display
  - [x] 7.1 Create engineering status badge component
    - Create `components/ui/engineering-status-badge.tsx`
    - Display status with appropriate colors and icons
    - _Requirements: 8.1_
  - [x] 7.2 Create engineering status banner component
    - Create `components/engineering/engineering-status-banner.tsx`
    - Display status, assigned reviewer, assignment date, complexity reasons
    - Show approval blocked warning when pending/in_progress
    - Provide action buttons based on permissions
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [x] 7.3 Create assessment card component
    - Create `components/engineering/assessment-card.tsx`
    - Display assessment type, status, assigned user, findings
    - Show risk level badge and additional cost estimate
    - _Requirements: 9.2, 9.3_
  - [x] 7.4 Create engineering assessments section component
    - Create `components/engineering/engineering-assessments-section.tsx`
    - List all assessments with add assessment button
    - _Requirements: 9.1, 9.4_

- [x] 8. UI Components - Dialogs
  - [x] 8.1 Create complete assessment dialog
    - Create `components/engineering/complete-assessment-dialog.tsx`
    - Form for findings, recommendations, risk level, additional cost
    - _Requirements: 4.2_
  - [x] 8.2 Create complete review dialog
    - Create `components/engineering/complete-review-dialog.tsx`
    - Show assessment summary, overall risk level, decision, notes
    - Option to apply additional costs to PJO
    - _Requirements: 5.1, 5.4_
  - [x] 8.3 Create waive review dialog
    - Create `components/engineering/waive-review-dialog.tsx`
    - Require waiver reason
    - _Requirements: 6.1_
  - [x] 8.4 Create approval blocked dialog
    - Create `components/engineering/approval-blocked-dialog.tsx`
    - Show reason for blocking and options
    - _Requirements: 7.2_
  - [x] 8.5 Create assign engineering dialog
    - Create `components/engineering/assign-engineering-dialog.tsx`
    - Select user to assign engineering review
    - _Requirements: 3.1_

- [x] 9. Integrate with PJO Detail View
  - [x] 9.1 Update PJO detail view to show engineering section
    - Modify `components/pjo/pjo-detail-view.tsx`
    - Add engineering status banner when requires_engineering is true
    - Add engineering assessments section
    - _Requirements: 8.1, 9.1_
  - [x] 9.2 Update approval button logic
    - Disable approve button when engineering is pending/in_progress
    - Show approval blocked dialog when clicked
    - _Requirements: 7.1, 7.2_
  - [x] 9.3 Add engineering action buttons to PJO actions
    - Add "Assign Engineering" button for managers
    - Add "Complete Review" button for assigned engineering staff
    - Add "Waive Review" button for managers
    - _Requirements: 8.4_

- [x] 10. Checkpoint - Verify UI components work correctly
  - All 54 tests pass (30 engineering-utils + 24 engineering-actions)

- [x] 11. Notifications Integration
  - [x] 11.1 Add notification on engineering assignment
    - Send notification to assigned user when review is assigned
    - Include PJO number and link
    - _Requirements: 10.1, 10.3_
  - [x] 11.2 Add notification on engineering completion
    - Send notification to PJO creator when review is completed
    - Include PJO number, decision, and link
    - _Requirements: 10.2, 10.3_
  - [x] 11.3 Write property tests for notifications
    - **Property 16: Notification creation**
    - **Validates: Requirements 10.1, 10.2, 10.3**

- [x] 12. Final Checkpoint - Full Integration Testing
  - All engineering tests pass (79 tests: 30 utils + 24 actions + 25 notifications)
  - Workflow verified: flag → assign → assess → complete/waive → approve

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
