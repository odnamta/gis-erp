# Implementation Plan: Bug Report & Improvement Request System

## Overview

This implementation plan covers the v0.81 Bug Report & Improvement Request System. The system will be built incrementally, starting with database schema, then core utilities, followed by UI components, and finally the admin dashboard.

## Tasks

- [ ] 1. Database Schema and Types Setup
  - [ ] 1.1 Create database migration for feedback tables
    - Create feedback_submissions table with all fields
    - Create feedback_comments table
    - Create feedback_status_history table
    - Create ticket number sequence and trigger
    - Create status change logging trigger
    - Create indexes for performance
    - Create views for dashboard queries
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.3_

  - [ ] 1.2 Create TypeScript types for feedback system
    - Define FeedbackType, Severity, Priority, FeedbackStatus enums
    - Define BrowserInfo, Screenshot interfaces
    - Define FeedbackSubmission, FeedbackComment, FeedbackStatusHistory interfaces
    - Define FeedbackSummary interface
    - Define form data interfaces
    - _Requirements: 2.1, 3.1_

  - [ ] 1.3 Create Supabase storage bucket for screenshots
    - Create 'feedback' storage bucket
    - Configure public access for screenshot URLs
    - _Requirements: 4.7_

- [ ] 2. Core Utility Functions
  - [ ] 2.1 Implement feedback-utils.ts utility functions
    - Implement captureBrowserContext function
    - Implement detectModuleFromUrl function
    - Implement getTicketPrefix function
    - Implement getSeverityColor function
    - Implement getStatusVariant function
    - Implement validateFeedbackForm function
    - Implement getModuleOptions function
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 2.2, 2.3, 2.4, 3.5_

  - [ ] 2.2 Write property tests for feedback utilities
    - **Property 5: Module Detection from URL Path**
    - **Property 6: Browser Context Capture Completeness**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

  - [ ] 2.3 Write property tests for form validation
    - **Property 2: Form Validation - Title Required and Length Limited**
    - **Property 3: Form Validation - Bug Severity Required**
    - **Property 4: Form Validation - Improvement Desired Behavior Required**
    - **Validates: Requirements 2.2, 2.3, 2.8, 3.5**

- [ ] 3. Server Actions Implementation
  - [ ] 3.1 Implement feedback submission server actions
    - Implement submitFeedback action with context capture
    - Implement uploadScreenshot action for storage
    - Implement getMySubmissions action
    - Implement getMyOpenTicketCount action
    - _Requirements: 2.7, 3.8, 4.7, 5.8, 11.1_

  - [ ] 3.2 Write property tests for ticket number generation
    - **Property 1: Ticket Number Format Consistency**
    - **Validates: Requirements 2.7, 3.8, 6.2, 6.3, 6.4**

  - [ ] 3.3 Implement admin feedback management actions
    - Implement getAllFeedback action with filters
    - Implement getFeedbackSummary action
    - Implement updateFeedbackStatus action
    - Implement assignFeedback action
    - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.4, 8.7_

  - [ ] 3.4 Write property tests for filtering and sorting
    - **Property 8: Feedback Filtering Correctness**
    - **Property 9: Feedback Search Correctness**
    - **Property 10: Feedback Sorting Order**
    - **Validates: Requirements 7.3, 7.4, 7.5**

  - [ ] 3.5 Write property tests for summary statistics
    - **Property 11: Summary Statistics Calculation**
    - **Validates: Requirements 7.1**

  - [ ] 3.6 Implement comment server actions
    - Implement addFeedbackComment action
    - Implement getFeedbackComments action with visibility filtering
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 3.7 Write property tests for comments
    - **Property 15: Comment Visibility and Permissions**
    - **Property 16: Comment Ordering and Counting**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [ ] 4. Checkpoint - Core functionality complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. UI Components - Feedback Submission
  - [ ] 5.1 Create FeedbackButton component
    - Implement floating button with fixed positioning
    - Add open ticket count badge
    - Implement badge visibility logic (hide when zero)
    - Add click handler to open modal
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

  - [ ] 5.2 Write property test for badge count
    - **Property 17: Open Ticket Badge Count**
    - **Validates: Requirements 1.4**

  - [ ] 5.3 Create ScreenshotCapture component
    - Implement capture button with html2canvas
    - Implement file upload functionality
    - Implement thumbnail preview display
    - Implement screenshot removal
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ] 5.4 Write property test for screenshot array
    - **Property 7: Screenshot Array Integrity**
    - **Validates: Requirements 4.5, 4.6, 4.8**

  - [ ] 5.5 Create FeedbackModal component
    - Implement tabbed interface (Bug, Improvement, Question)
    - Implement bug report form with severity selection
    - Implement improvement request form with module dropdown
    - Implement question form
    - Integrate ScreenshotCapture component
    - Display auto-captured context information
    - Implement form validation and submission
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.7_

  - [ ] 5.6 Integrate FeedbackButton into main layout
    - Add FeedbackButton to authenticated layout
    - Ensure visibility across all pages
    - _Requirements: 1.2_

- [ ] 6. Checkpoint - Submission UI complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Admin Dashboard Implementation
  - [ ] 7.1 Create FeedbackDashboard page and component
    - Create /admin/feedback route
    - Implement summary statistics cards
    - Implement feedback list with required columns
    - Implement filter controls (type, status, severity, module)
    - Implement search functionality
    - Implement sorting by severity and date
    - Implement pagination
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7_

  - [ ] 7.2 Write property test for pagination
    - **Property 12: Pagination Correctness**
    - **Validates: Requirements 7.7**

  - [ ] 7.3 Create FeedbackDetail component
    - Display full submission details
    - Display screenshots gallery
    - Implement status update controls
    - Implement assignment dropdown
    - Implement resolution notes field
    - Implement duplicate marking
    - _Requirements: 7.6, 8.1, 8.5, 8.6, 8.7_

  - [ ] 7.4 Write property tests for status management
    - **Property 13: Status Enum Validation**
    - **Property 14: Resolution Metadata Setting**
    - **Validates: Requirements 8.2, 8.4, 8.6**

  - [ ] 7.5 Create FeedbackComments component
    - Display comment thread in chronological order
    - Implement add comment form
    - Implement internal comment toggle for admins
    - Display comment count
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 8. User Submissions View
  - [ ] 8.1 Create user feedback submissions page
    - Create /feedback or /my-feedback route
    - Display user's own submissions list
    - Implement click to view details
    - Allow adding comments to own submissions
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ] 8.2 Implement badge click navigation
    - Navigate to user submissions when badge clicked
    - _Requirements: 11.5_

- [ ] 9. Notifications Integration
  - [ ] 9.1 Implement feedback notifications
    - Notify admins on new submission
    - Notify submitter on status change
    - Notify on new comments
    - Use existing notification system
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 10. Navigation and Permissions
  - [ ] 10.1 Add admin dashboard to navigation
    - Add Feedback menu item for admin/super_admin roles
    - Configure route permissions
    - _Requirements: 7.1_

- [ ] 11. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all acceptance criteria are met
  - Test end-to-end flows

## Notes

- All tasks including property tests are required for comprehensive testing
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The system uses existing Supabase infrastructure and notification system
