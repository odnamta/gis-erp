# Implementation Plan: HSE Audit & Inspection

## Overview

This implementation plan breaks down the HSE Audit & Inspection module into discrete coding tasks. The approach follows a bottom-up strategy: database schema first, then utility functions, server actions, and finally UI components. Property-based tests are integrated alongside implementation to catch errors early.

## Tasks

- [x] 1. Set up database schema and types
  - [x] 1.1 Create database migration for audit_types, audits, and audit_findings tables
    - Apply migration with all tables, indexes, sequences, triggers, and views
    - Include default audit types (WORKPLACE, VEHICLE, OFFICE, WAREHOUSE, ENV, ANNUAL)
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 3.1, 4.1_

  - [x] 1.2 Create TypeScript type definitions in types/audit.ts
    - Define AuditType, Audit, AuditFinding interfaces
    - Define ChecklistTemplate, ChecklistSection, ChecklistItem types
    - Define AuditStatus, AuditRating, FindingSeverity, FindingStatus enums
    - Define dashboard and view types
    - _Requirements: 1.1, 3.1, 4.1_

- [x] 2. Implement core utility functions
  - [x] 2.1 Create lib/audit-utils.ts with validation functions
    - Implement validateAuditType, validateAudit, validateFinding
    - Implement isValidCategory, isValidSeverity, isValidChecklistTemplate
    - _Requirements: 1.2, 1.3, 1.5, 4.1_

  - [x] 2.2 Write property tests for validation functions
    - **Property 3: Category Validation**
    - **Property 4: Checklist Template Structure Validation**
    - **Property 12: Finding Severity Validation**
    - **Validates: Requirements 1.3, 1.5, 4.1**

  - [x] 2.3 Implement score calculation functions
    - Implement calculateAuditScore with weighted responses
    - Implement determineAuditRating with threshold logic
    - _Requirements: 3.5, 3.6_

  - [x] 2.4 Write property tests for score calculation
    - **Property 9: Audit Score Calculation**
    - **Property 10: Audit Rating Determination**
    - **Validates: Requirements 3.5, 3.6**

  - [x] 2.5 Implement scheduling utility functions
    - Implement calculateNextDueDate
    - Implement isAuditOverdue
    - Implement getAuditsDueSoon
    - _Requirements: 2.1, 2.4_

  - [x] 2.6 Write property tests for scheduling functions
    - **Property 6: Next Due Date Calculation**
    - **Property 7: Due Soon Audit Identification**
    - **Validates: Requirements 2.1, 2.4, 6.1**

  - [x] 2.7 Implement finding utility functions
    - Implement sortFindingsBySeverity
    - Implement calculateDaysOverdue
    - Implement countFindingsBySeverity
    - Implement filterOpenFindings
    - _Requirements: 4.7, 5.6, 5.7, 6.2, 6.3_

  - [x] 2.8 Write property tests for finding functions
    - **Property 14: Finding Sort Order**
    - **Property 18: Overdue Days Calculation**
    - **Property 19: Open Findings Identification**
    - **Property 20: Critical Findings Count**
    - **Validates: Requirements 4.7, 5.6, 5.7, 6.2, 6.3**

  - [x] 2.9 Implement dashboard metrics calculation
    - Implement calculateDashboardMetrics
    - Implement calculateAverageScore
    - Implement filterCriticalMajorFindings
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

  - [x] 2.10 Write property tests for dashboard metrics
    - **Property 21: Average Score Calculation**
    - **Property 22: Critical and Major Findings Filter**
    - **Validates: Requirements 6.4, 6.6**

  - [x] 2.11 Implement list filtering functions
    - Implement filterAudits (by type, status, date range, location)
    - Implement filterFindings (by severity, status, responsible)
    - _Requirements: 7.1, 7.3_

  - [x] 2.12 Write property tests for filtering functions
    - **Property 23: Audit List Filtering**
    - **Property 24: Finding List Filtering**
    - **Validates: Requirements 7.1, 7.3**

- [x] 3. Checkpoint - Ensure all utility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement server actions
  - [x] 4.1 Create lib/audit-actions.ts with audit type CRUD
    - Implement createAuditType, updateAuditType, deactivateAuditType
    - Implement getAuditTypes, getActiveAuditTypes
    - _Requirements: 1.1, 1.2, 1.6_

  - [x] 4.2 Write property tests for audit type actions
    - **Property 1: Audit Type Creation Preserves Fields**
    - **Property 2: Audit Type Code Uniqueness**
    - **Property 5: Audit Type Deactivation**
    - **Validates: Requirements 1.1, 1.2, 1.6**

  - [x] 4.3 Implement audit CRUD actions
    - Implement createAudit, updateAudit, completeAudit, cancelAudit
    - Implement getAudit, getAudits, getAuditsByType
    - _Requirements: 3.1, 3.3, 3.9_

  - [x] 4.4 Write property tests for audit actions
    - **Property 8: Audit Number Format**
    - **Property 11: Audit Completion State**
    - **Validates: Requirements 3.1, 3.9**

  - [x] 4.5 Implement finding CRUD actions
    - Implement createFinding with parent audit count update
    - Implement updateFinding, closeFinding, verifyFinding
    - Implement getFindings, getFindingsByAudit
    - _Requirements: 4.1, 4.4, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 4.6 Write property tests for finding actions
    - **Property 13: Finding Count Increment**
    - **Property 15: Finding Closure Requirements**
    - **Property 16: Finding Closure Metadata**
    - **Property 17: Finding Verification Metadata**
    - **Validates: Requirements 4.6, 5.2, 5.3, 5.5**

  - [x] 4.7 Implement query actions for views
    - Implement getAuditSchedule
    - Implement getOpenFindings
    - Implement getAuditDashboardData
    - _Requirements: 2.3, 5.7, 6.1, 6.2, 6.3, 6.4, 7.4, 7.5_

- [x] 5. Checkpoint - Ensure all action tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement UI components - Dashboard
  - [x] 6.1 Create audit summary cards component
    - Display due soon count, open findings, critical findings, average score
    - components/hse/audits/audit-summary-cards.tsx
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 6.2 Create upcoming audits list component
    - Display scheduled audits with overdue highlighting
    - Include "Start Audit" action button
    - components/hse/audits/upcoming-audits-list.tsx
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 6.3 Create critical findings list component
    - Display critical and major open findings
    - Include responsible person and due date
    - components/hse/audits/critical-findings-list.tsx
    - _Requirements: 6.6_

  - [x] 6.4 Create audit dashboard page
    - Combine summary cards, upcoming audits, critical findings
    - Add tab navigation for Dashboard, Audits, Findings, Schedule
    - app/(main)/hse/audits/page.tsx
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 7. Implement UI components - Audit Management
  - [x] 7.1 Create audit list component with filters
    - Display audits in table with type, date, location, score, status
    - Add filters for type, status, date range, location
    - components/hse/audits/audit-list.tsx
    - _Requirements: 7.1_

  - [x] 7.2 Create checklist form component
    - Render checklist template with response inputs
    - Support yes/no, rating, text, select item types
    - Allow adding findings from checklist items
    - components/hse/audits/checklist-form.tsx
    - _Requirements: 3.2, 3.3, 3.7_

  - [x] 7.3 Create audit form component
    - Form for creating/editing audits
    - Include audit type selection, location, department, asset, job order
    - Integrate checklist form for conducting audits
    - components/hse/audits/audit-form.tsx
    - _Requirements: 3.2, 3.3, 3.4, 3.8_

  - [x] 7.4 Create audit detail view component
    - Display complete audit information
    - Show checklist responses and findings
    - Display score and rating
    - components/hse/audits/audit-detail-view.tsx
    - _Requirements: 7.2_

  - [x] 7.5 Create new audit page
    - Page for starting a new audit
    - app/(main)/hse/audits/new/page.tsx
    - _Requirements: 3.1_

  - [x] 7.6 Create audit detail page
    - Page for viewing audit details
    - app/(main)/hse/audits/[id]/page.tsx
    - _Requirements: 7.2_

- [x] 8. Implement UI components - Finding Management
  - [x] 8.1 Create finding list component with filters
    - Display findings with severity badge, description, responsible, due date
    - Add filters for severity, status, responsible person
    - components/hse/audits/finding-list.tsx
    - _Requirements: 4.7, 7.3_

  - [x] 8.2 Create finding form component
    - Form for creating/editing findings
    - Include severity, category, description, location, risk assessment
    - Allow assigning responsible person and due date
    - components/hse/audits/finding-form.tsx
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 8.3 Create finding closure dialog component
    - Dialog for closing findings with evidence
    - Require closure evidence text
    - components/hse/audits/finding-closure-dialog.tsx
    - _Requirements: 5.2, 5.3_

  - [x] 8.4 Create finding verification component
    - Allow verification of closed findings
    - Prevent self-verification
    - components/hse/audits/finding-verification.tsx
    - _Requirements: 5.4, 5.5_

  - [x] 8.5 Create findings tab page
    - Page showing all findings with filters
    - app/(main)/hse/audits/findings/page.tsx
    - _Requirements: 7.3_

- [x] 9. Implement UI components - Configuration
  - [x] 9.1 Create audit type form component
    - Form for creating/editing audit types
    - Include type code, name, category, frequency
    - components/hse/audits/audit-type-form.tsx
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 9.2 Create checklist template editor component
    - Visual editor for checklist templates
    - Add/remove sections and items
    - Configure item types and weights
    - components/hse/audits/checklist-template-editor.tsx
    - _Requirements: 1.5_

  - [x] 9.3 Create audit schedule view component
    - Display recurring audit types with schedule
    - Show last conducted and next due dates
    - Allow manual scheduling
    - components/hse/audits/audit-schedule-view.tsx
    - _Requirements: 2.3, 2.5_

  - [x] 9.4 Create audit types configuration page
    - Page for managing audit types
    - app/(main)/hse/audits/types/page.tsx
    - _Requirements: 1.1, 1.6_

- [x] 10. Implement navigation and integration
  - [x] 10.1 Add HSE audits to navigation
    - Add "Audits & Inspections" link under HSE section
    - Update lib/navigation.ts
    - _Requirements: 6.7_

  - [x] 10.2 Add audit-related permissions
    - Define permissions for audit management
    - Update lib/permissions.ts
    - _Requirements: All_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including property-based tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use fast-check library with minimum 100 iterations
- Unit tests validate specific examples and edge cases
