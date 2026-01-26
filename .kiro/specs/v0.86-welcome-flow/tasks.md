# Implementation Plan: Welcome Flow (v0.86)

## Overview

This plan implements a role-specific welcome modal that appears after T&C acceptance for first-time users. The implementation follows the existing T&C modal pattern with modifications for dismissibility and role-specific content.

## Tasks

- [x] 1. Database schema and type updates
  - [x] 1.1 Create migration to add welcome_shown_at column to user_profiles
    - Add TIMESTAMPTZ column with NULL default
    - Add column comment for documentation
    - _Requirements: 1.1, 1.2_
  
  - [x] 1.2 Update UserProfile type in types/permissions.ts
    - Add welcome_shown_at: string | null field
    - _Requirements: 1.1_

- [x] 2. Welcome content definition
  - [x] 2.1 Create lib/welcome-content.ts with role-specific content
    - Define QuickAction and WelcomeContent interfaces
    - Define WELCOME_CONTENT for all 15 roles with Indonesian text
    - Define DEFAULT_WELCOME_CONTENT fallback
    - Implement getWelcomeContent(role) function
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 2.2 Write property tests for welcome content
    - **Property 1: Welcome content structure validity**
    - **Property 2: Default content fallback**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 3. Server action implementation
  - [x] 3.1 Create app/(main)/actions/mark-welcome-shown.ts
    - Implement markWelcomeShown server action
    - Verify user authentication
    - Update welcome_shown_at with current timestamp
    - Return success/error result
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 3.2 Write unit tests for markWelcomeShown action
    - Test authentication check
    - Test successful update
    - Test error handling
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4. Welcome modal components
  - [x] 4.1 Create components/welcome-modal.tsx
    - Use shadcn/ui Dialog component (dismissible)
    - Display role-specific title and description
    - Render 2-3 quick action buttons
    - Handle dismiss and quick action clicks
    - Show loading state during action
    - Display error message on failure
    - _Requirements: 3.3, 3.4, 4.1, 4.2, 4.4_
  
  - [x] 4.2 Create components/welcome-wrapper.tsx
    - Manage modal open/close state
    - Call markWelcomeShown on dismiss
    - Handle navigation for quick actions
    - Refresh page after successful dismiss
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. Integration with main layout
  - [x] 5.1 Create shouldShowWelcome helper function in lib/welcome-content.ts
    - Check tc_accepted_at is not null
    - Check welcome_shown_at is null
    - Return boolean for display logic
    - _Requirements: 3.1, 3.2, 6.1, 6.2_
  
  - [x] 5.2 Update app/(main)/layout.tsx to include WelcomeWrapper
    - Add needsWelcome check after T&C check
    - Pass role and needsWelcome to WelcomeWrapper
    - Ensure welcome modal shows after T&C modal
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 5.3 Write property tests for display logic
    - **Property 3: Welcome modal display logic**
    - **Validates: Requirements 3.1, 3.2, 6.1, 6.2**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integration testing
  - [x] 7.1 Write integration tests for welcome flow
    - Test modal appears after T&C acceptance
    - Test quick action navigation works
    - Test dismiss updates database
    - Test modal doesn't reappear on refresh
    - **Property 4: Mark welcome shown round-trip**
    - **Validates: Requirements 1.3, 4.3, 5.1, 5.3**

- [x] 8. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive testing
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Follow existing T&C modal pattern in components/terms-conditions-modal.tsx
- Use Indonesian language for all user-facing text
