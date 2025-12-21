# Implementation Plan: Guided Tours System (v0.37)

## Overview

This implementation plan breaks down the Guided Tours feature into discrete coding tasks. The system will be built incrementally: database schema first, then utility functions, then React components, and finally integration.

## Tasks

- [x] 1. Database Schema and Migrations
  - [x] 1.1 Create guided_tours table migration
    - Create table with all required fields (id, tour_code, tour_name, description, applicable_roles, start_route, steps, estimated_minutes, is_active, display_order, created_at)
    - Add unique constraint on tour_code
    - Add RLS policies for read access
    - _Requirements: 1.1, 1.3, 1.5_

  - [x] 1.2 Create user_tour_progress table migration
    - Create table with fields (id, user_id, tour_id, status, current_step, started_at, completed_at)
    - Add foreign key references to user_profiles and guided_tours
    - Add unique constraint on (user_id, tour_id)
    - Add index on user_id
    - Add RLS policies
    - _Requirements: 1.2, 1.4_

  - [x] 1.3 Insert default tours seed data
    - Insert dashboard_tour for all roles
    - Insert quotation_tour for owner, admin, sales
    - Insert invoice_tour for owner, admin, finance
    - Insert bkk_tour for owner, admin, ops, finance
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. TypeScript Types and Interfaces
  - [x] 2.1 Create types/guided-tours.ts
    - Define TourStep interface
    - Define GuidedTour interface
    - Define TourStatus type
    - Define TourProgress interface
    - Define TourWithProgress interface
    - Define database row types for mapping
    - _Requirements: 1.1, 1.2_

- [x] 3. Core Utility Functions
  - [x] 3.1 Create lib/guided-tours-utils.ts with data fetching functions
    - Implement getAvailableTours(userId) - fetch tours filtered by role with progress
    - Implement getTourByCode(tourCode) - fetch single tour by code
    - Implement mapDbRowToTour() - transform DB row to TypeScript interface
    - _Requirements: 3.1, 7.1, 7.2, 7.3_

  - [x] 3.2 Write property test for role-based filtering
    - **Property 1: Role-Based Tour Filtering**
    - **Validates: Requirements 3.1, 7.1, 7.2, 7.3**

  - [x] 3.3 Implement tour progress functions
    - Implement startTour(userId, tourId) - create/update progress to in_progress
    - Implement advanceTourStep(userId, tourId) - increment step or complete
    - Implement goBackTourStep(userId, tourId) - decrement step
    - Implement skipTour(userId, tourId) - set status to skipped
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2_

  - [x] 3.4 Write property tests for tour navigation
    - **Property 5: Step Advancement Increments Progress**
    - **Property 6: Step Back Decrements Progress**
    - **Property 7: Status Transitions**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 6.1, 6.2**

  - [x] 3.5 Implement navigation button visibility logic
    - Create getNavigationState(stepIndex, totalSteps) function
    - Return showBack, showNext, showFinish, showSkip booleans
    - _Requirements: 4.4_

  - [x] 3.6 Write property test for navigation button visibility
    - **Property 4: Navigation Button Visibility Rules**
    - **Validates: Requirements 4.4**

- [x] 4. Checkpoint - Core utilities complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. React Hook and Context
  - [x] 5.1 Create hooks/use-tour.ts
    - Implement useTour(tourCode) hook
    - Manage isActive, currentStep, stepIndex, totalSteps state
    - Implement start(), next(), back(), skip() methods
    - Handle route navigation for steps with nextRoute
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.4_

  - [x] 5.2 Write property test for resume from saved step
    - **Property 8: Resume From Saved Step**
    - **Validates: Requirements 6.4**

  - [x] 5.3 Create components/guided-tours/tour-provider.tsx
    - Create TourContext with active tour state
    - Provide tour control methods to children
    - Handle tour lifecycle (start, advance, complete)
    - _Requirements: 4.1, 4.2_

- [x] 6. Tour UI Components
  - [x] 6.1 Create components/guided-tours/tour-tooltip.tsx
    - Render floating tooltip positioned relative to target element
    - Display step number, total steps, title, content
    - Use Radix UI Popover or custom positioning
    - _Requirements: 4.1, 4.3_

  - [x] 6.2 Write property test for tour data completeness
    - **Property 3: Tour Data Completeness**
    - **Validates: Requirements 3.2, 4.3**

  - [x] 6.3 Create components/guided-tours/tour-highlight.tsx
    - Render overlay that highlights target element
    - Use CSS to dim background and spotlight target
    - Handle missing target elements gracefully
    - _Requirements: 4.2, 4.5_

  - [x] 6.4 Create components/guided-tours/tour-navigation.tsx
    - Render Back, Skip Tour, Next/Finish buttons
    - Use getNavigationState() for visibility logic
    - Connect to tour context methods
    - _Requirements: 4.4_

  - [x] 6.5 Create components/guided-tours/index.ts barrel export
    - Export all guided-tours components
    - _Requirements: N/A_

- [x] 7. Tour Launcher Page
  - [x] 7.1 Create components/guided-tours/tour-card.tsx
    - Display tour name, description, estimated duration
    - Show completion status (not started, in progress, completed)
    - Render Start Tour or Continue button based on status
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [x] 7.2 Create app/(main)/help/tours/page.tsx
    - Fetch available tours for current user
    - Render list of TourCard components
    - Order by display_order
    - _Requirements: 3.1, 3.6_

  - [x] 7.3 Write property test for tour ordering
    - **Property 2: Tour Ordering Consistency**
    - **Validates: Requirements 3.6**

- [x] 8. Checkpoint - UI components complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Integration and Wiring
  - [x] 9.1 Add TourProvider to main layout
    - Wrap app in TourProvider context
    - Ensure tour state persists across route changes
    - _Requirements: 5.5, 6.4_

  - [x] 9.2 Add navigation link to tours page
    - Add "Guided Tours" link to help menu or sidebar
    - _Requirements: 3.1_

  - [x] 9.3 Integrate with onboarding system
    - Add tour suggestions to onboarding completion
    - Optionally add link to Tour Launcher in onboarding widget
    - _Requirements: 8.1, 8.2_

- [x] 10. Final Checkpoint
  - All 29 property tests pass
  - All 8 correctness properties are tested
  - All acceptance criteria are met
  - Database types updated with guided_tours and user_tour_progress tables

## Notes

- All tasks including property-based tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript strict mode and follows existing project patterns
