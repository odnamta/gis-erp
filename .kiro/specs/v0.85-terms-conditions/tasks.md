# Implementation Plan: Terms & Conditions System

## Overview

This implementation plan covers the T&C acceptance system for GAMA ERP. Tasks are ordered to build incrementally: database schema first, then core logic, then UI components, and finally integration.

## Tasks

- [x] 1. Database schema extension
  - [x] 1.1 Create migration to add tc_accepted_at and tc_version columns to user_profiles
    - Add tc_accepted_at TIMESTAMPTZ DEFAULT NULL
    - Add tc_version TEXT DEFAULT NULL
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Terms content module
  - [x] 2.1 Create lib/terms-conditions.ts with TERMS_VERSION and TERMS_CONTENT
    - Define TERMS_VERSION = '1.0.0'
    - Define TERMS_CONTENT with all 10 required sections in markdown
    - Export hasAcceptedCurrentTerms function
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 2.2 Write property test for hasAcceptedCurrentTerms
    - **Property 1: Version Comparison Consistency**
    - **Validates: Requirements 2.4, 5.2, 5.3, 5.4**
  
  - [x] 2.3 Write unit test for TERMS_CONTENT sections
    - **Property 3: Terms Content Contains All Required Sections**
    - **Validates: Requirements 2.2, 2.3**

- [x] 3. Server action for acceptance
  - [x] 3.1 Create app/(main)/actions/accept-terms.ts server action
    - Verify user authentication
    - Update user_profiles with current timestamp and TERMS_VERSION
    - Return success/error response
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 3.2 Write unit tests for acceptTerms action
    - Test authentication check
    - Test successful update
    - Test error handling
    - _Requirements: 4.4, 4.5, 4.6_

- [x] 4. Terms modal component
  - [x] 4.1 Create components/terms-conditions-modal.tsx
    - Use shadcn/ui Dialog, ScrollArea, Checkbox, Button
    - Render TERMS_CONTENT with react-markdown
    - Implement non-dismissible modal (no close button, no backdrop click)
    - Disable Accept button until checkbox is checked
    - Call acceptTerms on accept, handle errors
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [x] 4.2 Write property test for button state
    - **Property 2: Accept Button State Tied to Checkbox**
    - **Validates: Requirements 3.3**
  
  - [x] 4.3 Write unit tests for modal component
    - Test content rendering
    - Test checkbox/button interaction
    - Test non-dismissible behavior
    - Test error display
    - _Requirements: 3.1, 3.2, 3.4, 3.6_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Layout integration
  - [x] 6.1 Update app/(main)/layout.tsx to check T&C acceptance
    - Fetch user's tc_accepted_at and tc_version
    - Compare with current TERMS_VERSION using hasAcceptedCurrentTerms
    - Render TermsConditionsModal if acceptance required
    - Pass callback to refresh state after acceptance
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3_
  
  - [x] 6.2 Write integration tests for layout
    - Test modal shown for users without acceptance
    - Test modal not shown for users with current version
    - Test modal shown for users with outdated version
    - _Requirements: 5.2, 5.3, 5.4_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
