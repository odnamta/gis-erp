# Implementation Plan: Onboarding Checklist System

## Overview

This implementation plan covers the v0.36 Onboarding Checklist System for GAMA ERP. The system guides new users through setup tasks and feature exploration based on their role, with automatic progress tracking and gamification elements.

## Tasks

- [x] 1. Database Schema and Migrations
  - [x] 1.1 Create onboarding_steps table with all fields
    - Include step_code, step_name, description, category, step_order
    - Include applicable_roles array, completion_type, completion fields
    - Include UI hints (icon, action_label, action_route)
    - Include points, is_required, is_active flags
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  - [x] 1.2 Create user_onboarding_progress table
    - Include user_id, step_id foreign keys with unique constraint
    - Include status, started_at, completed_at, current_count
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 1.3 Create user_onboarding_status table
    - Include total_steps, completed_steps, skipped_steps, total_points
    - Include is_onboarding_complete, show_onboarding_widget flags
    - _Requirements: 2.5, 2.6_
  - [x] 1.4 Create initialization trigger function
    - Trigger on user_profiles INSERT
    - Create status record and progress entries for applicable steps
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 1.5 Insert default onboarding steps
    - Profile setup steps (complete_profile, set_preferences)
    - Explore steps (dashboard, customers, quotations, jobs, invoices, vendors)
    - First action steps (first_quotation, first_customer, first_payment, etc.)
    - Advanced steps (global_search, view_reports, customize_dashboard)
    - _Requirements: 1.1, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2. TypeScript Types and Utility Functions
  - [x] 2.1 Create onboarding types file
    - Define OnboardingStep, OnboardingProgress, OnboardingStatus interfaces
    - Define OnboardingCategory, CompletionType, ProgressStatus types
    - Define UserOnboardingData composite interface
    - _Requirements: 1.1, 2.1, 2.5_
  - [x] 2.2 Create onboarding utility functions
    - filterStepsByRole: Filter steps based on user role
    - calculatePercentComplete: Calculate completion percentage
    - calculateTotalPoints: Sum points from completed steps
    - groupStepsByCategory: Group steps into category buckets
    - getNextSteps: Get next N pending steps
    - validateCompletionType: Validate step has required fields for its type
    - _Requirements: 1.2, 2.5, 6.2, 6.3, 7.1, 9.2, 10.1_
  - [x] 2.3 Write property tests for utility functions
    - **Property 1: Role-Based Step Filtering**
    - **Property 2: Completion Type Validation**
    - **Property 9: Summary Consistency**
    - **Property 10: Category Grouping**
    - **Property 11: Next Steps Selection**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 2.5, 6.3, 7.1, 9.2, 10.1, 10.5**

- [x] 3. Checkpoint - Verify types and utilities
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Server Actions for Progress Management
  - [x] 4.1 Create getUserOnboardingProgress action
    - Fetch status and progress with step details
    - Group steps by category
    - Calculate percentComplete and find nextStep
    - _Requirements: 2.1, 2.5, 6.2, 6.3, 7.1_
  - [x] 4.2 Create completeOnboardingStep action
    - Update progress status to completed
    - Set completed_at timestamp
    - Update status summary (completed_steps, total_points)
    - Check if onboarding is complete
    - _Requirements: 2.3, 2.6, 9.1_
  - [x] 4.3 Create trackRouteVisit action
    - Find steps with matching completion_route and auto_route type
    - Complete pending steps that match
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 4.4 Create trackAction action
    - Find steps with matching completion_table and auto_count type
    - Increment current_count
    - Set status to in_progress or completed based on count
    - Only track create actions
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 4.5 Create skipOnboarding action
    - Mark all pending/in_progress steps as skipped
    - Set is_onboarding_complete to true
    - Set show_onboarding_widget to false
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 4.6 Create hideOnboardingWidget action
    - Set show_onboarding_widget to false
    - _Requirements: 8.4, 8.5_
  - [x] 4.7 Write property tests for server actions
    - **Property 3: Progress Initialization Consistency**
    - **Property 4: Status Transition Validity**
    - **Property 5: Route-Based Auto-Completion**
    - **Property 6: Count-Based Completion**
    - **Property 7: Skip Onboarding Behavior**
    - **Property 8: Points Accumulation**
    - **Validates: Requirements 2.1, 2.2, 2.6, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 8.1, 8.2, 8.3, 9.1, 9.3**

- [x] 5. Checkpoint - Verify server actions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Onboarding Widget Component
  - [x] 6.1 Create OnboardingProgressBar component
    - Display progress bar with percentage
    - Show completed/total steps count
    - Optionally show points earned
    - _Requirements: 6.2, 9.4_
  - [x] 6.2 Create OnboardingStepCard component
    - Display step name and description
    - Show status indicator (checkbox, in-progress, completed)
    - Show action button for pending steps
    - Show completion date for completed steps
    - _Requirements: 6.3, 7.2, 7.3_
  - [x] 6.3 Create OnboardingWidget component
    - Fetch user onboarding progress
    - Display progress bar
    - Display next 2-3 pending steps
    - Include Hide button and View All Steps link
    - Conditionally render based on show_onboarding_widget
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [x] 6.4 Write unit tests for widget components
    - Test progress bar rendering
    - Test step card states
    - Test widget conditional rendering
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 7. Onboarding Full Page
  - [x] 7.1 Create onboarding page route at /onboarding
    - Server component to fetch onboarding data
    - Display welcome message with user name
    - _Requirements: 7.1_
  - [x] 7.2 Create OnboardingCategorySection component
    - Display category header with completion count
    - List all steps in category
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 7.3 Implement full page layout
    - Overall progress bar at top
    - Steps grouped by category
    - Skip Onboarding and Continue Later buttons
    - _Requirements: 7.1, 7.4, 7.5, 7.6_
  - [x] 7.4 Write unit tests for onboarding page
    - Test category grouping display
    - Test button actions
    - _Requirements: 7.1, 7.5, 7.6_

- [x] 8. Dashboard Integration
  - [x] 8.1 Add OnboardingWidget to dashboard layout
    - Import and render widget in dashboard sidebar/header area
    - Pass current user ID
    - _Requirements: 6.1_
  - [x] 8.2 Implement route tracking middleware
    - Track route visits for auto_route completion
    - Call trackRouteVisit on navigation
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 8.3 Write integration tests for dashboard
    - Test widget appears for new users
    - Test widget hidden when flag is false
    - _Requirements: 6.1, 8.5_

- [x] 9. Action Tracking Integration
  - [x] 9.1 Add action tracking to record creation flows
    - Track quotation creation
    - Track customer creation
    - Track payment recording
    - Track surat jalan creation
    - Track BKK creation
    - _Requirements: 5.1, 5.2_
  - [x] 9.2 Write integration tests for action tracking
    - Test count increment on record creation
    - Test step completion when count reaches target
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 10. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify onboarding flow works end-to-end
  - Test with different user roles

## Notes

- All tasks including tests are required for comprehensive validation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The system uses fast-check for property-based testing
