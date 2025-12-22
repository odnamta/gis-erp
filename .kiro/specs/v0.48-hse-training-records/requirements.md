# Requirements Document

## Introduction

This document defines the requirements for the HSE Training Records module (v0.48) in Gama ERP. The module enables tracking of employee safety training including certifications, refresher schedules, and compliance status. It provides a comprehensive system for managing training courses, recording individual training completions, scheduling batch training sessions, and monitoring overall training compliance across the organization.

## Glossary

- **Training_System**: The HSE Training Records module that manages all training-related functionality
- **Training_Course**: A defined safety training program with specific requirements, duration, and validity period
- **Training_Record**: An individual employee's completion record for a specific training course
- **Training_Session**: A scheduled batch training event where multiple employees can participate
- **Compliance_Matrix**: A grid view showing training status for all employees across all required courses
- **Compliance_Status**: The current state of an employee's training relative to requirements (valid, expiring_soon, expired, not_trained)
- **Validity_Period**: The duration in months for which a training certification remains valid
- **Mandatory_Training**: Training courses that are required for all applicable employees
- **Assessment**: An evaluation component of training that determines pass/fail status

## Requirements

### Requirement 1: Training Course Management

**User Story:** As an HSE administrator, I want to manage a library of safety training courses, so that I can define what training is available and required for employees.

#### Acceptance Criteria

1. THE Training_System SHALL store training courses with course_code, course_name, description, training_type, duration_hours, validity_months, is_mandatory, applicable_roles, applicable_departments, prerequisite_courses, internal_training, external_provider, requires_assessment, passing_score, and is_active fields
2. WHEN a training course is created, THE Training_System SHALL generate a unique course_code
3. THE Training_System SHALL support training types: 'induction', 'refresher', 'specialized', 'certification', 'toolbox'
4. WHEN validity_months is NULL, THE Training_System SHALL treat the training as having no expiry
5. WHEN is_mandatory is TRUE, THE Training_System SHALL include the course in compliance calculations for all applicable employees
6. WHEN applicable_departments is empty, THE Training_System SHALL apply the course to all departments
7. WHEN prerequisite_courses is specified, THE Training_System SHALL validate that employees have completed prerequisites before recording completion
8. THE Training_System SHALL allow courses to be marked as active or inactive
9. THE Training_System SHALL provide default courses: Safety Induction, Defensive Driving, First Aid & CPR, Fire Safety & Extinguisher, Lifting & Rigging Safety, Confined Space Entry, Working at Heights, Hazardous Materials Handling

### Requirement 2: Individual Training Record Management

**User Story:** As an HSE administrator, I want to record individual employee training completions, so that I can track who has completed what training and when it expires.

#### Acceptance Criteria

1. THE Training_System SHALL store training records with employee_id, course_id, training_date, completion_date, training_location, trainer_name, training_provider, status, assessment_score, assessment_passed, certificate_number, certificate_url, valid_from, valid_to, training_cost, notes, and recorded_by fields
2. THE Training_System SHALL support training record statuses: 'scheduled', 'in_progress', 'completed', 'failed', 'cancelled'
3. WHEN a training record is marked as completed, THE Training_System SHALL calculate valid_to based on the course's validity_months from valid_from date
4. WHEN a course requires_assessment is TRUE, THE Training_System SHALL require assessment_score and assessment_passed fields
5. WHEN assessment_score is below passing_score, THE Training_System SHALL set assessment_passed to FALSE and status to 'failed'
6. THE Training_System SHALL allow certificate upload via certificate_url
7. WHEN a training record is created or updated, THE Training_System SHALL record the updated_at timestamp

### Requirement 3: Batch Training Session Management

**User Story:** As an HSE administrator, I want to schedule batch training sessions, so that I can efficiently train multiple employees at once.

#### Acceptance Criteria

1. THE Training_System SHALL store training sessions with session_code, course_id, session_date, start_time, end_time, location, trainer_name, trainer_employee_id, max_participants, status, notes, and created_by fields
2. WHEN a training session is created, THE Training_System SHALL generate a unique session_code
3. THE Training_System SHALL support session statuses: 'scheduled', 'in_progress', 'completed', 'cancelled'
4. THE Training_System SHALL enforce max_participants limit when registering employees
5. THE Training_System SHALL store session participants with session_id, employee_id, attendance_status, and training_record_id
6. THE Training_System SHALL support attendance statuses: 'registered', 'attended', 'absent', 'cancelled'
7. WHEN a session is marked as completed, THE Training_System SHALL auto-create training records for all participants with 'attended' status
8. THE Training_System SHALL prevent duplicate participant registration for the same session

### Requirement 4: Training Compliance Monitoring

**User Story:** As an HSE manager, I want to view training compliance status across all employees, so that I can identify gaps and ensure regulatory compliance.

#### Acceptance Criteria

1. THE Training_System SHALL calculate compliance_status for each employee-course combination as: 'not_trained', 'valid', 'expiring_soon', 'expired'
2. WHEN valid_to is NULL, THE Training_System SHALL treat the training as 'valid'
3. WHEN valid_to is in the past, THE Training_System SHALL mark compliance_status as 'expired'
4. WHEN valid_to is within 30 days, THE Training_System SHALL mark compliance_status as 'expiring_soon'
5. THE Training_System SHALL display a compliance matrix showing all employees against all required courses
6. THE Training_System SHALL calculate overall compliance percentage as (compliant_items / total_required_items) * 100
7. THE Training_System SHALL count fully compliant employees (100% compliance on all mandatory training)
8. THE Training_System SHALL highlight non-compliant employees (missing or expired mandatory training)
9. THE Training_System SHALL only include active employees and active courses in compliance calculations

### Requirement 5: Expiring Training Alerts

**User Story:** As an HSE administrator, I want to see which training certifications are expiring soon, so that I can schedule refresher training proactively.

#### Acceptance Criteria

1. THE Training_System SHALL display a list of training records expiring within 60 days
2. THE Training_System SHALL show employee name, department, course name, valid_to date, and days until expiry
3. THE Training_System SHALL sort expiring training by valid_to date ascending (soonest first)
4. THE Training_System SHALL only include completed training records with non-null valid_to dates
5. THE Training_System SHALL only include active employees in expiring training alerts

### Requirement 6: Training Dashboard

**User Story:** As an HSE manager, I want a dashboard overview of training status, so that I can quickly assess the organization's training health.

#### Acceptance Criteria

1. THE Training_System SHALL display summary cards showing: overall compliance percentage, fully compliant employee count, expiring within 30 days count, non-compliant count
2. THE Training_System SHALL provide tabs for: Compliance Matrix, Training Schedule, Records, Courses
3. THE Training_System SHALL display upcoming training sessions with date, time, course name, location, trainer, and participant count
4. THE Training_System SHALL provide actions to view session details and add participants
5. THE Training_System SHALL display a legend explaining compliance status icons: ✅ Valid, ⚠️ Expiring Soon, ❌ Expired/Missing, N/A Not Required

### Requirement 7: Role-Based Access Control

**User Story:** As a system administrator, I want to control who can manage training records, so that data integrity is maintained.

#### Acceptance Criteria

1. WHEN a user has 'hse' or 'admin' or 'super_admin' role, THE Training_System SHALL allow creating and editing training courses
2. WHEN a user has 'hse' or 'admin' or 'super_admin' role, THE Training_System SHALL allow recording training completions
3. WHEN a user has 'hse' or 'admin' or 'super_admin' role, THE Training_System SHALL allow scheduling training sessions
4. WHEN a user has 'manager' role, THE Training_System SHALL allow viewing compliance reports for their department
5. THE Training_System SHALL allow all authenticated users to view their own training records
