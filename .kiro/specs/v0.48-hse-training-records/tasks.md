# Implementation Plan: HSE Training Records

## Overview

This implementation plan covers the HSE Training Records module (v0.48) for Gama ERP. The module enables tracking of employee safety training including certifications, refresher schedules, and compliance status. Implementation follows the established patterns from v0.47 HSE Safety Documentation.

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Create safety_training_courses table with all fields and default courses
    - Create table with course_code, course_name, description, training_type, duration_hours, validity_months, is_mandatory, applicable_roles, applicable_departments, prerequisite_courses, internal_training, external_provider, requires_assessment, passing_score, is_active
    - Insert default courses: Safety Induction, Defensive Driving, First Aid & CPR, Fire Safety & Extinguisher, Lifting & Rigging Safety, Confined Space Entry, Working at Heights, Hazardous Materials Handling
    - _Requirements: 1.1, 1.9_

  - [x] 1.2 Create employee_training_records table
    - Create table with employee_id, course_id, training_date, completion_date, training_location, trainer_name, training_provider, status, assessment_score, assessment_passed, certificate_number, certificate_url, valid_from, valid_to, training_cost, notes, recorded_by, timestamps
    - Add foreign key constraints to employees and safety_training_courses
    - Create indexes on employee_id, course_id, valid_to
    - _Requirements: 2.1_

  - [x] 1.3 Create training_sessions and training_session_participants tables
    - Create training_sessions with session_code, course_id, session_date, start_time, end_time, location, trainer_name, trainer_employee_id, max_participants, status, notes, created_by
    - Create training_session_participants with session_id, employee_id, attendance_status, training_record_id
    - Add unique constraint on (session_id, employee_id)
    - Create index on session_date
    - _Requirements: 3.1, 3.5_

  - [x] 1.4 Create database views for compliance and expiring training
    - Create training_compliance view joining employees, departments, courses, and records
    - Create expiring_training view for records expiring within 60 days
    - _Requirements: 4.1, 5.1_

- [x] 2. Type Definitions and Utilities
  - [x] 2.1 Create TypeScript types for training module
    - Create types/training.ts with TrainingType, TrainingRecordStatus, SessionStatus, AttendanceStatus, ComplianceStatus enums
    - Define TrainingCourse, TrainingRecord, TrainingSession, SessionParticipant, ComplianceEntry, ExpiringTraining interfaces
    - Define input types: CreateCourseInput, CreateRecordInput, CreateSessionInput, AddParticipantInput
    - Define row types and transform functions
    - _Requirements: 1.1, 2.1, 3.1, 3.5_

  - [x] 2.2 Implement training utility functions
    - Implement validateCourseInput, validateRecordInput, validateSessionInput
    - Implement calculateComplianceStatus, calculateOverallCompliance, countFullyCompliant, countNonCompliant
    - Implement calculateValidTo, getDaysUntilExpiry, isExpiringSoon
    - Implement calculateAssessmentResult
    - Implement status helper functions (getComplianceStatusIcon, getComplianceStatusColor, etc.)
    - _Requirements: 1.3, 2.2, 3.3, 3.6, 4.1, 4.2, 4.3, 4.4, 4.6_

  - [x] 2.3 Write property test for compliance status calculation
    - **Property 1: Compliance Status Calculation**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [x] 2.4 Write property test for validity date calculation
    - **Property 2: Validity Date Calculation**
    - **Validates: Requirements 1.4, 2.3**

  - [x] 2.5 Write property test for assessment result determination
    - **Property 3: Assessment Result Determination**
    - **Validates: Requirements 2.4, 2.5**

  - [x] 2.6 Write property test for compliance percentage calculation
    - **Property 4: Compliance Percentage Calculation**
    - **Validates: Requirements 4.6, 4.7, 4.8, 4.9**

  - [x] 2.7 Write property test for expiring training filter
    - **Property 5: Expiring Training Filter**
    - **Validates: Requirements 5.1, 5.3, 5.4, 5.5**

  - [x] 2.8 Write property test for status/type validation
    - **Property 8: Status/Type Validation**
    - **Validates: Requirements 1.3, 2.2, 3.3, 3.6**

- [x] 3. Checkpoint - Core utilities complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Server Actions Implementation
  - [x] 4.1 Implement course server actions
    - Implement createCourse with validation and code generation
    - Implement updateCourse and toggleCourseActive
    - Implement getCourses with filters and getCourseById
    - _Requirements: 1.2, 1.8_

  - [x] 4.2 Implement training record server actions
    - Implement createTrainingRecord with prerequisite validation
    - Implement updateTrainingRecord and completeTrainingRecord
    - Implement validity calculation on completion
    - Implement assessment result calculation
    - Implement getTrainingRecords and getEmployeeTrainingRecords
    - _Requirements: 1.7, 2.3, 2.4, 2.5, 2.7_

  - [x] 4.3 Write property test for prerequisite validation
    - **Property 9: Prerequisite Validation**
    - **Validates: Requirements 1.7**

  - [x] 4.4 Implement session server actions
    - Implement createSession with code generation
    - Implement updateSession, completeSession (with auto-record creation), cancelSession
    - Implement getSessions and getUpcomingSessions
    - _Requirements: 3.2, 3.7_

  - [x] 4.5 Implement participant server actions
    - Implement addParticipant with capacity check and duplicate prevention
    - Implement removeParticipant and updateAttendance
    - Implement getSessionParticipants
    - _Requirements: 3.4, 3.8_

  - [x] 4.6 Write property test for session capacity enforcement
    - **Property 6: Session Capacity Enforcement**
    - **Validates: Requirements 3.4, 3.8**

  - [x] 4.7 Write property test for session completion auto-record creation
    - **Property 7: Session Completion Auto-Record Creation**
    - **Validates: Requirements 3.7**

  - [x] 4.8 Implement compliance server actions
    - Implement getComplianceMatrix with filters
    - Implement getExpiringTraining with configurable threshold
    - Implement getTrainingStatistics
    - _Requirements: 4.5, 5.2, 6.1_

- [x] 5. Checkpoint - Server actions complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. UI Components - Course Management
  - [x] 6.1 Create course list and card components
    - Create components/training/course-list.tsx
    - Create components/training/course-card.tsx with training type badge
    - Display course details: name, type, duration, validity, mandatory flag
    - _Requirements: 1.8_

  - [x] 6.2 Create course form component
    - Create components/training/course-form.tsx
    - Include all course fields with appropriate inputs
    - Add prerequisite course selector (multi-select)
    - Add department/role applicability selectors
    - _Requirements: 1.1, 1.5, 1.6, 1.7_

  - [x] 6.3 Create course pages
    - Create app/(main)/hse/training/courses/page.tsx (list)
    - Create app/(main)/hse/training/courses/new/page.tsx (create)
    - Create app/(main)/hse/training/courses/[id]/page.tsx (detail/edit)
    - _Requirements: 1.8_

- [x] 7. UI Components - Training Records
  - [x] 7.1 Create training record list and card components
    - Create components/training/record-list.tsx with filters
    - Create components/training/record-card.tsx
    - Create components/training/training-status-badge.tsx
    - Display employee, course, dates, status, validity
    - _Requirements: 2.1, 2.2_

  - [x] 7.2 Create training record form component
    - Create components/training/record-form.tsx
    - Include employee selector, course selector, dates, assessment fields
    - Add certificate upload field
    - Show assessment fields conditionally based on course.requires_assessment
    - _Requirements: 2.1, 2.4, 2.6_

  - [x] 7.3 Create training record pages
    - Create app/(main)/hse/training/records/page.tsx (list)
    - Create app/(main)/hse/training/records/new/page.tsx (create)
    - Create app/(main)/hse/training/records/[id]/page.tsx (detail/edit)
    - _Requirements: 2.1_

- [x] 8. UI Components - Training Sessions
  - [x] 8.1 Create session list and card components
    - Create components/training/session-list.tsx
    - Create components/training/session-card.tsx
    - Display date, time, course, location, trainer, participant count
    - _Requirements: 3.1, 6.3_

  - [x] 8.2 Create session form and participant components
    - Create components/training/session-form.tsx
    - Create components/training/participant-list.tsx with attendance status
    - Create components/training/add-participant-dialog.tsx
    - _Requirements: 3.1, 3.5, 3.6_

  - [x] 8.3 Create session pages
    - Create app/(main)/hse/training/sessions/page.tsx (list)
    - Create app/(main)/hse/training/sessions/new/page.tsx (create)
    - Create app/(main)/hse/training/sessions/[id]/page.tsx (detail with participants)
    - _Requirements: 3.1, 6.4_

- [x] 9. Checkpoint - CRUD components complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. UI Components - Compliance Dashboard
  - [x] 10.1 Create compliance matrix component
    - Create components/training/compliance-matrix.tsx
    - Display employee rows x course columns grid
    - Create components/training/compliance-status-icon.tsx
    - Show compliance percentage per employee
    - Add legend for status icons
    - _Requirements: 4.5, 6.5_

  - [x] 10.2 Create compliance summary cards
    - Create components/training/compliance-summary-cards.tsx
    - Display: overall compliance %, fully compliant count, expiring (30 days), non-compliant
    - _Requirements: 6.1_

  - [x] 10.3 Create expiring training list component
    - Create components/training/expiring-training-list.tsx
    - Display employee, department, course, valid_to, days until expiry
    - Sort by valid_to ascending
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 10.4 Create training dashboard page
    - Create app/(main)/hse/training/page.tsx
    - Create app/(main)/hse/training/training-client.tsx
    - Implement tabs: Compliance Matrix, Training Schedule, Records, Courses
    - Display summary cards at top
    - Display upcoming sessions section
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 11. Permission Integration
  - [x] 11.1 Add training permissions to permission system
    - Add training-related permissions to lib/permissions.ts
    - Implement permission checks in server actions
    - Add PermissionGate wrappers to UI components
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 11.2 Write property test for permission validation
    - **Property 10: Permission Validation**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 12. Navigation Integration
  - [x] 12.1 Add training routes to HSE navigation
    - Update lib/navigation.ts to include training routes under HSE
    - Add Training menu item to HSE section
    - _Requirements: 6.2_

- [x] 13. Final Checkpoint
  - All tests pass (2601 tests)
  - All UI components implemented
  - Navigation integrated
  - Permissions configured

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Follow existing patterns from v0.47 HSE Safety Documentation for consistency
