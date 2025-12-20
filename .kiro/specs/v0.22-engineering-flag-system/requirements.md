# Requirements Document

## Introduction

The Engineering Flag System enables automatic flagging of complex PJOs (Proforma Job Orders) for engineering review. When a PJO meets certain complexity criteria (e.g., heavy cargo, oversized dimensions, challenging routes), it requires engineering assessment before approval can proceed. This system blocks PJO approval until engineering review is completed or waived by authorized personnel.

## Glossary

- **PJO**: Proforma Job Order - a quotation document that requires approval before conversion to a Job Order
- **Engineering_Review**: A formal assessment process conducted by engineering staff to evaluate technical feasibility and risks
- **Engineering_Assessment**: An individual evaluation task within an engineering review (e.g., route survey, technical review)
- **Complexity_Score**: A numeric value calculated from cargo and route characteristics that determines if engineering review is required
- **Risk_Level**: A classification of project risk (low, medium, high, critical)
- **Engineering_Status**: The current state of engineering review (not_required, pending, in_progress, completed, waived)

## Requirements

### Requirement 1: Database Schema for Engineering Fields

**User Story:** As a system administrator, I want the database to store engineering review information, so that engineering assessments can be tracked and managed.

#### Acceptance Criteria

1. THE Database SHALL store engineering fields on proforma_job_orders including requires_engineering, engineering_status, engineering_assigned_to, engineering_assigned_at, engineering_completed_at, engineering_completed_by, engineering_notes, and engineering_waived_reason
2. THE Database SHALL have an engineering_assessments table with fields for pjo_id, assessment_type, status, assigned_to, findings, recommendations, risk_level, additional_cost_estimate, and cost_justification
3. THE Database SHALL enforce referential integrity between engineering_assessments and proforma_job_orders via foreign key constraint
4. THE Database SHALL have indexes on engineering_assessments for pjo_id, status, and assigned_to columns

### Requirement 2: Automatic Engineering Flag Detection

**User Story:** As an administrator, I want PJOs to be automatically flagged for engineering review when they meet complexity criteria, so that complex projects receive proper technical assessment.

#### Acceptance Criteria

1. WHEN a PJO has complexity_score >= 20 THEN THE System SHALL automatically set requires_engineering to true
2. WHEN requires_engineering is set to true THEN THE System SHALL set engineering_status to 'pending'
3. WHEN a PJO is created or updated with complexity factors THEN THE System SHALL recalculate whether engineering review is required
4. THE System SHALL support complexity factors including heavy_cargo, over_width, over_length, over_height, new_route, challenging_terrain, and special_permits

### Requirement 3: Engineering Review Assignment

**User Story:** As a manager, I want to assign engineering reviews to specific users, so that the right person can conduct the technical assessment.

#### Acceptance Criteria

1. WHEN a manager assigns an engineering review THEN THE System SHALL update engineering_assigned_to and engineering_assigned_at on the PJO
2. WHEN an engineering review is assigned THEN THE System SHALL create default assessment records based on the PJO's complexity factors
3. WHEN complexity factors include new_route or challenging_terrain THEN THE System SHALL create a route_survey assessment
4. WHEN complexity factors include special_permits THEN THE System SHALL create a permit_check assessment
5. WHEN complexity factors include over_length, over_width, or over_height THEN THE System SHALL create a jmp_creation assessment
6. THE System SHALL always create a technical_review assessment for any engineering review

### Requirement 4: Engineering Assessment Management

**User Story:** As an engineering staff member, I want to manage individual assessments within a review, so that I can document findings for each aspect of the project.

#### Acceptance Criteria

1. WHEN an assessment is started THEN THE System SHALL update the assessment status to 'in_progress'
2. WHEN an assessment is completed THEN THE System SHALL record findings, recommendations, risk_level, and optional additional_cost_estimate
3. WHEN an assessment is completed THEN THE System SHALL update completed_at and completed_by fields
4. WHEN any assessment status changes THEN THE System SHALL recalculate the overall engineering_status on the PJO
5. IF all assessments are completed THEN THE System SHALL set engineering_status to 'completed'
6. IF any assessment is in_progress and none are pending THEN THE System SHALL set engineering_status to 'in_progress'

### Requirement 5: Engineering Review Completion

**User Story:** As an engineering staff member, I want to complete the overall engineering review with a summary decision, so that the PJO can proceed to approval.

#### Acceptance Criteria

1. WHEN completing an engineering review THEN THE System SHALL require overall_risk_level, decision, and engineering_notes
2. THE System SHALL support decisions of 'approved', 'approved_with_conditions', 'not_recommended', and 'rejected'
3. WHEN completing a review THEN THE System SHALL update engineering_completed_at and engineering_completed_by
4. WHEN completing a review with apply_additional_costs enabled THEN THE System SHALL create a cost item on the PJO with the total additional costs from assessments
5. WHEN a cost item is added from engineering THEN THE System SHALL recalculate PJO totals

### Requirement 6: Engineering Review Waiver

**User Story:** As a manager, I want to waive engineering review when appropriate, so that low-risk projects can proceed without delay.

#### Acceptance Criteria

1. WHEN a manager waives engineering review THEN THE System SHALL require a waiver reason
2. WHEN engineering review is waived THEN THE System SHALL set engineering_status to 'waived'
3. WHEN engineering review is waived THEN THE System SHALL record engineering_waived_reason, engineering_completed_at, and engineering_completed_by
4. THE System SHALL restrict waiver capability to users with manager role or higher

### Requirement 7: Approval Blocking

**User Story:** As a system user, I want PJO approval to be blocked when engineering review is pending, so that complex projects cannot be approved without proper assessment.

#### Acceptance Criteria

1. WHEN a user attempts to approve a PJO that requires_engineering is true AND engineering_status is 'pending' or 'in_progress' THEN THE System SHALL block the approval
2. WHEN approval is blocked THEN THE System SHALL display a clear message explaining why approval is blocked
3. WHEN engineering_status is 'completed' or 'waived' THEN THE System SHALL allow approval to proceed
4. WHEN requires_engineering is false THEN THE System SHALL allow approval without engineering check

### Requirement 8: Engineering Status Display

**User Story:** As a user viewing a PJO, I want to see the engineering review status prominently displayed, so that I understand the current state of technical assessment.

#### Acceptance Criteria

1. WHEN a PJO requires engineering review THEN THE System SHALL display an engineering status banner on the PJO detail page
2. THE Engineering_Status_Banner SHALL show the current status, assigned reviewer, assignment date, and reasons for engineering requirement
3. WHEN engineering is pending or in_progress THEN THE Banner SHALL display a warning that approval is blocked
4. THE System SHALL provide buttons to view assessments, complete review (engineering only), and waive review (manager+)

### Requirement 9: Engineering Assessments Section

**User Story:** As an engineering staff member, I want to view and manage all assessments for a PJO in one place, so that I can efficiently complete my review.

#### Acceptance Criteria

1. THE System SHALL display an engineering assessments section on PJO detail when requires_engineering is true
2. THE Assessments_Section SHALL list all assessments with their type, status, assigned user, and completion date
3. FOR each completed assessment THE System SHALL display findings, recommendations, risk_level, and additional_cost_estimate
4. THE System SHALL provide actions to start, complete, or edit assessments based on user permissions

### Requirement 10: Notifications

**User Story:** As a user involved in engineering review, I want to receive notifications about review assignments and completions, so that I can take timely action.

#### Acceptance Criteria

1. WHEN an engineering review is assigned THEN THE System SHALL send a notification to the assigned user
2. WHEN an engineering review is completed THEN THE System SHALL send a notification to the PJO creator
3. THE Notification SHALL include the PJO number and a link to the PJO detail page
