# Requirements Document

## Introduction

This document defines the requirements for the HSE Audit & Inspection module (v0.50) in the Gama ERP system. The module enables safety audits and inspections with configurable checklists, findings management, and corrective action tracking to ensure workplace safety compliance.

## Glossary

- **Audit**: A systematic examination of safety practices, procedures, and conditions against established standards
- **Inspection**: A routine check of specific areas, equipment, or vehicles for safety compliance
- **Audit_Type**: A predefined category of audit/inspection with associated checklist template and scheduling frequency
- **Finding**: A non-conformance or observation discovered during an audit/inspection
- **Corrective_Action**: A remedial measure required to address a finding
- **Checklist_Template**: A structured set of questions/items used to conduct an audit
- **Severity**: Classification of finding importance (critical, major, minor, observation)
- **HSE_Officer**: Personnel responsible for conducting audits and managing safety compliance
- **Auditor**: The person conducting the audit or inspection

## Requirements

### Requirement 1: Audit Type Management

**User Story:** As an HSE officer, I want to configure different types of audits and inspections, so that I can standardize safety checks across the organization.

#### Acceptance Criteria

1. THE Audit_Type_Manager SHALL allow creation of audit types with type_code, type_name, description, and category
2. WHEN creating an audit type, THE System SHALL validate that type_code is unique
3. THE Audit_Type_Manager SHALL support categories: safety_audit, workplace_inspection, vehicle_inspection, equipment_inspection, environmental_audit
4. WHERE frequency scheduling is enabled, THE Audit_Type_Manager SHALL allow setting frequency_days for recurring audits
5. THE Audit_Type_Manager SHALL allow configuring checklist templates as structured JSON with sections and items
6. WHEN an audit type is deactivated, THE System SHALL set is_active to false and exclude it from new audit creation

### Requirement 2: Audit Scheduling

**User Story:** As an HSE manager, I want to see upcoming and overdue audits, so that I can ensure safety inspections are conducted on time.

#### Acceptance Criteria

1. THE Audit_Scheduler SHALL calculate next_due date based on last_conducted date plus frequency_days
2. WHEN an audit is overdue, THE Dashboard SHALL highlight it with visual warning indicator
3. THE Audit_Schedule_View SHALL display all recurring audit types with their last conducted date and next due date
4. WHEN a scheduled audit date arrives, THE System SHALL display it in the "Due Soon" section
5. THE Audit_Scheduler SHALL allow manual scheduling of ad-hoc audits without frequency requirements

### Requirement 3: Conduct Audit

**User Story:** As an auditor, I want to conduct audits using predefined checklists, so that I can systematically evaluate safety compliance.

#### Acceptance Criteria

1. WHEN starting a new audit, THE System SHALL generate a unique audit_number in format AUD-YYYY-NNNNN
2. THE Audit_Form SHALL display the checklist template from the selected audit type
3. WHEN conducting an audit, THE Auditor SHALL be able to record responses for each checklist item
4. THE Audit_Form SHALL allow capturing location, department, and related asset or job order
5. WHEN all checklist items are completed, THE System SHALL calculate overall_score as a percentage
6. THE System SHALL determine overall_rating as 'pass', 'conditional_pass', or 'fail' based on score thresholds
7. WHEN conducting an audit, THE Auditor SHALL be able to add findings directly from the checklist interface
8. THE Audit_Form SHALL allow uploading photos and documents as evidence
9. WHEN an audit is completed, THE System SHALL update status to 'completed' and record completed_at timestamp

### Requirement 4: Finding Management

**User Story:** As an HSE officer, I want to document and track audit findings, so that safety issues are properly addressed.

#### Acceptance Criteria

1. WHEN creating a finding, THE System SHALL require severity classification (critical, major, minor, observation)
2. THE Finding_Form SHALL capture finding_description, location_detail, and category
3. THE Finding_Form SHALL allow uploading photos as evidence
4. WHEN a finding is created, THE System SHALL allow assigning a responsible person and due date
5. THE Finding_Form SHALL capture risk_level and potential_consequence for risk assessment
6. WHEN a finding is created, THE System SHALL increment the appropriate findings count on the parent audit (critical_findings, major_findings, minor_findings, observations)
7. THE Finding_List SHALL display findings sorted by severity (critical first) then by due date

### Requirement 5: Corrective Action Tracking

**User Story:** As an HSE manager, I want to track corrective actions to closure, so that I can ensure all findings are properly resolved.

#### Acceptance Criteria

1. WHEN a finding status changes to 'in_progress', THE System SHALL record that work has begun on the corrective action
2. WHEN closing a finding, THE System SHALL require closure_evidence documentation
3. WHEN a finding is closed, THE System SHALL record closed_by user and closed_at timestamp
4. WHERE verification is required, THE System SHALL allow a different user to verify the closure
5. WHEN a finding is verified, THE System SHALL record verified_by user and verified_at timestamp
6. IF a finding due date passes without closure, THEN THE System SHALL mark it as overdue in the findings view
7. THE Open_Findings_View SHALL display all findings not in 'closed' or 'verified' status with days_overdue calculation

### Requirement 6: Audit Dashboard

**User Story:** As an HSE manager, I want a dashboard showing audit status and findings, so that I can monitor safety compliance at a glance.

#### Acceptance Criteria

1. THE Dashboard SHALL display count of audits due soon (within 7 days)
2. THE Dashboard SHALL display total count of open findings
3. THE Dashboard SHALL display count of critical findings requiring immediate attention
4. THE Dashboard SHALL display average audit score for the current month
5. THE Dashboard SHALL show upcoming audits section with overdue items highlighted
6. THE Dashboard SHALL show critical and major open findings with responsible person and due date
7. WHEN clicking on a dashboard item, THE System SHALL navigate to the relevant detail view

### Requirement 7: Audit Reports and Views

**User Story:** As an HSE manager, I want to view audit history and findings reports, so that I can analyze safety trends.

#### Acceptance Criteria

1. THE Audit_List SHALL display all audits with filtering by type, status, date range, and location
2. THE Audit_Detail_View SHALL show complete audit information including checklist responses and findings
3. THE Finding_List SHALL display all findings with filtering by severity, status, and responsible person
4. THE System SHALL provide an open_audit_findings view showing all unresolved findings with audit context
5. THE System SHALL provide an audit_schedule view showing recurring audit types with next due dates
