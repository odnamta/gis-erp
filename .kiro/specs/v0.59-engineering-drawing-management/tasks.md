# Implementation Plan: Engineering Drawing Management

## Overview

This plan implements the Engineering Drawing Management module for Gama ERP, enabling engineers to manage CAD files, track revisions, and distribute drawings through formal workflows.

## Tasks

- [x] 1. Set up database schema and types
  - [x] 1.1 Apply database migration for drawing tables
    - Create drawing_categories, drawings, drawing_revisions, drawing_transmittals tables
    - Create sequences for drawing and transmittal numbers
    - Create indexes and drawing_register view
    - Insert default categories (GA, LP, TP, RP, SP, SD, FD, AS)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Create TypeScript types in `types/drawing.ts`
    - Define DrawingCategory, Drawing, DrawingRevision, DrawingTransmittal interfaces
    - Define status, file type, change reason, and purpose enums
    - Define form input and filter types
    - _Requirements: 2.1, 3.1, 4.1, 5.1_

- [x] 2. Implement core utility functions
  - [x] 2.1 Create `lib/drawing-utils.ts` with number generation and validation
    - Implement generateDrawingNumber, generateTransmittalNumber
    - Implement getNextRevision for A→B→C sequence
    - Implement isValidDrawingFileType, getFileExtension
    - Implement validateDrawingInput, validateRevisionInput, validateTransmittalInput
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 5.1, 5.2_

  - [x] 2.2 Write property tests for drawing number generation
    - **Property 1: Drawing Number Format and Uniqueness**
    - **Validates: Requirements 2.1**

  - [x] 2.3 Write property tests for file type validation
    - **Property 2: File Type Validation**
    - **Validates: Requirements 2.2**

  - [x] 2.4 Write property tests for drawing input validation
    - **Property 3: Drawing Input Validation**
    - **Validates: Requirements 2.3**

  - [x] 2.5 Implement revision utilities
    - Implement getNextRevision function
    - Implement revision validation
    - _Requirements: 3.1, 3.2_

  - [x] 2.6 Write property tests for revision number sequence
    - **Property 4: Revision Number Sequence**
    - **Validates: Requirements 3.2**

  - [x] 2.7 Write property tests for revision validation
    - **Property 7: Revision Requires Change Description**
    - **Validates: Requirements 3.1**

- [x] 3. Implement workflow and status utilities
  - [x] 3.1 Create workflow transition functions
    - Implement isValidStatusTransition
    - Implement getAllowedNextStatuses
    - Define valid transition map
    - _Requirements: 4.1_

  - [x] 3.2 Write property tests for status transitions
    - **Property 8: Valid Status Transitions**
    - **Validates: Requirements 4.1**

- [x] 4. Implement filtering and sorting utilities
  - [x] 4.1 Create filter and sort functions
    - Implement filterDrawings with search, category, project, status filters
    - Implement sortDrawingsByNumber
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.5_

  - [x] 4.2 Write property tests for filtering
    - **Property 13: Filter Results Match Criteria**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

  - [x] 4.3 Write property tests for sorting
    - **Property 14: Drawings Sorted by Number**
    - **Validates: Requirements 7.5**

- [x] 5. Checkpoint - Ensure utility tests pass
  - All 24 tests pass ✅

- [x] 6. Implement server actions
  - [x] 6.1 Create `lib/drawing-actions.ts` with drawing CRUD
    - Implement createDrawing with auto-number generation
    - Implement updateDrawing, deleteDrawing
    - Implement uploadDrawingFile to Supabase storage
    - Implement getDrawings, getDrawingById, getCategories
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_

  - [x] 6.2 Implement revision actions
    - Implement createRevision with archive logic
    - Implement getDrawingRevisions
    - Ensure only one revision is current
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 6.3 Write property tests for single current revision invariant
    - **Property 5: Single Current Revision Invariant**
    - **Validates: Requirements 3.6**

  - [x] 6.4 Write property tests for revision archiving
    - **Property 6: Revision Creation Archives Previous**
    - **Validates: Requirements 3.3**

  - [x] 6.5 Implement workflow actions
    - Implement submitForReview, submitForApproval, approveDrawing, issueDrawing
    - Implement supersedeDrawing
    - Record actor and timestamp on each transition
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 6.6 Write property tests for workflow recording
    - **Property 9: Workflow Transitions Record Actor and Timestamp**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5**

  - [x] 6.7 Write property tests for superseded exclusion
    - **Property 10: Superseded Drawings Excluded from Register**
    - **Validates: Requirements 4.6, 7.1**

  - [x] 6.8 Implement transmittal actions
    - Implement createTransmittal with auto-number generation
    - Implement sendTransmittal, acknowledgeTransmittal
    - Implement getTransmittals, getTransmittalById
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 6.9 Write property tests for transmittal number format
    - **Property 11: Transmittal Number Format**
    - **Validates: Requirements 5.1**

  - [x] 6.10 Write property tests for transmittal validation
    - **Property 12: Transmittal Input Validation**
    - **Validates: Requirements 5.2, 5.3**

- [x] 7. Checkpoint - Ensure action tests pass
  - All tests pass ✅

- [x] 8. Implement drawing list UI
  - [x] 8.1 Create `components/drawings/drawing-status-cards.tsx`
    - Display count cards for each status
    - _Requirements: 7.1_

  - [x] 8.2 Create `components/drawings/drawing-list.tsx`
    - Display drawing register table with columns
    - Implement search and filter controls
    - Link to drawing detail page
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4_

  - [x] 8.3 Create `app/(main)/engineering/drawings/page.tsx`
    - Wire up drawing list with data fetching
    - Add "New Drawing" button
    - _Requirements: 7.1_

- [x] 9. Implement drawing form and detail UI
  - [x] 9.1 Create `components/drawings/file-upload.tsx`
    - File input with drag-and-drop
    - File type validation feedback
    - _Requirements: 2.2_

  - [x] 9.2 Create `components/drawings/drawing-form.tsx`
    - Form fields for title, category, scale, paper size
    - Project/JO/assessment/survey/JMP selectors
    - File upload integration
    - _Requirements: 2.3, 2.4, 2.5, 2.6_

  - [x] 9.3 Create `app/(main)/engineering/drawings/new/page.tsx`
    - New drawing page with form
    - _Requirements: 2.1_

  - [x] 9.4 Create `components/drawings/revision-history.tsx`
    - Table showing all revisions with change descriptions
    - _Requirements: 3.5_

  - [x] 9.5 Create `components/drawings/revision-form.tsx`
    - Dialog for creating new revision
    - Change description and reason fields
    - Optional file upload
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 9.6 Create `components/drawings/workflow-actions.tsx`
    - Buttons for workflow transitions based on current status
    - Confirmation dialogs
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 9.7 Create `components/drawings/drawing-detail-view.tsx`
    - Tabs for details, revisions, transmittals
    - Display file preview/download
    - Workflow action buttons
    - _Requirements: 3.5, 4.1_

  - [x] 9.8 Create `app/(main)/engineering/drawings/[id]/page.tsx`
    - Drawing detail page
    - _Requirements: 7.4_

  - [x] 9.9 Create `app/(main)/engineering/drawings/[id]/edit/page.tsx`
    - Edit drawing page
    - _Requirements: 2.3_

- [x] 10. Implement transmittal UI
  - [x] 10.1 Create `components/drawings/drawing-selector.tsx`
    - Multi-select component for choosing drawings
    - Show drawing number, title, current revision
    - Allow specifying copy count
    - _Requirements: 5.4_

  - [x] 10.2 Create `components/drawings/transmittal-form.tsx`
    - Recipient company, name, email fields
    - Purpose selector
    - Drawing selector integration
    - Cover letter textarea
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [x] 10.3 Create `components/drawings/transmittal-list.tsx`
    - Table of transmittals with status
    - Filter by project
    - _Requirements: 5.1, 5.6, 5.7_

  - [x] 10.4 Create `components/drawings/transmittal-detail.tsx`
    - Display transmittal details and included drawings
    - Send and acknowledge actions
    - _Requirements: 5.6, 5.7_

  - [x] 10.5 Create `app/(main)/engineering/drawings/transmittals/page.tsx`
    - Transmittal list page
    - _Requirements: 5.1_

  - [x] 10.6 Create `app/(main)/engineering/drawings/transmittals/new/page.tsx`
    - New transmittal page
    - _Requirements: 5.1_

  - [x] 10.7 Create `app/(main)/engineering/drawings/transmittals/[id]/page.tsx`
    - Transmittal detail page
    - _Requirements: 5.6, 5.7_

- [x] 11. Add navigation and integration
  - [x] 11.1 Update engineering navigation
    - Add "Drawings" menu item under Engineering
    - Add "Transmittals" submenu
    - _Requirements: 7.1_

- [x] 12. Final checkpoint - Ensure all tests pass
  - All 24 property tests pass ✅

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases

## Completion Summary

**Status: COMPLETE** ✅

All 12 main tasks and their subtasks have been implemented:
- Database schema applied via MCP
- TypeScript types created
- Utility functions with validation
- Server actions for CRUD and workflow
- 24 property-based tests (all passing)
- 12 UI components
- 7 pages
- Navigation updated
