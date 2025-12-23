# Requirements Document

## Introduction

This document defines the requirements for the Engineering Resource Scheduling module in Gama ERP. The system enables scheduling of engineering resources including personnel, equipment, and tools for project assignments, with calendar visualization, availability tracking, and utilization reporting.

## Glossary

- **Resource_Scheduler**: The system component responsible for managing engineering resource assignments and availability
- **Engineering_Resource**: A schedulable entity (personnel, equipment, tool, or vehicle) that can be assigned to projects
- **Resource_Assignment**: A scheduled allocation of a resource to a specific project, survey, JMP, or assessment
- **Resource_Availability**: The calendar-based availability status of a resource for a given date
- **Resource_Calendar**: The visual component displaying resource schedules across time periods
- **Utilization_Calculator**: The component that computes resource utilization percentages
- **Conflict_Detector**: The component that identifies scheduling conflicts when resources are double-booked

## Requirements

### Requirement 1: Resource Management

**User Story:** As an engineering manager, I want to manage engineering resources (personnel, equipment, tools, vehicles), so that I can track what resources are available for project assignments.

#### Acceptance Criteria

1. WHEN an administrator creates a new resource, THE Resource_Scheduler SHALL store the resource with type, code, name, and capacity information
2. WHEN a personnel resource is created, THE Resource_Scheduler SHALL allow linking to an existing employee record
3. WHEN an equipment resource is created, THE Resource_Scheduler SHALL allow linking to an existing asset record
4. WHEN a resource has skills or certifications, THE Resource_Scheduler SHALL store them as structured data
5. WHEN a resource is marked unavailable, THE Resource_Scheduler SHALL record the reason and expected return date
6. THE Resource_Scheduler SHALL generate unique resource codes for each resource type
7. WHEN listing resources, THE Resource_Scheduler SHALL support filtering by resource type, availability status, and skills

### Requirement 2: Resource Assignment

**User Story:** As an engineering coordinator, I want to assign resources to projects, surveys, JMPs, and assessments, so that I can plan and track resource allocation.

#### Acceptance Criteria

1. WHEN creating an assignment, THE Resource_Scheduler SHALL require a resource, target (project/survey/JMP/assessment), and date range
2. WHEN an assignment is created, THE Resource_Scheduler SHALL calculate planned hours based on the date range and resource capacity
3. WHEN an assignment overlaps with existing assignments, THE Conflict_Detector SHALL warn the user about the conflict
4. WHEN an assignment is created for an unavailable date, THE Conflict_Detector SHALL prevent the assignment and display the unavailability reason
5. WHEN an assignment status changes, THE Resource_Scheduler SHALL update the status to one of: scheduled, in_progress, completed, or cancelled
6. WHEN an assignment is completed, THE Resource_Scheduler SHALL allow recording actual hours worked
7. THE Resource_Scheduler SHALL support assigning the same resource to multiple non-overlapping assignments

### Requirement 3: Resource Availability Calendar

**User Story:** As an engineering manager, I want to view resource availability on a calendar, so that I can quickly identify available resources for upcoming work.

#### Acceptance Criteria

1. WHEN viewing the calendar, THE Resource_Calendar SHALL display resources as rows and dates as columns
2. WHEN a resource has an assignment on a date, THE Resource_Calendar SHALL show the assignment with visual indication of utilization level
3. WHEN a resource is unavailable on a date, THE Resource_Calendar SHALL display the unavailability type (leave, training, maintenance, holiday)
4. WHEN navigating the calendar, THE Resource_Calendar SHALL support week and month views
5. WHEN clicking a calendar cell, THE Resource_Calendar SHALL show assignment details or allow creating a new assignment
6. THE Resource_Calendar SHALL display remaining available hours for each resource per day
7. WHEN filtering the calendar, THE Resource_Calendar SHALL support filtering by resource type and skills

### Requirement 4: Availability Management

**User Story:** As an engineering coordinator, I want to mark resources as unavailable for specific dates, so that they are not scheduled during those periods.

#### Acceptance Criteria

1. WHEN marking a resource unavailable, THE Resource_Scheduler SHALL require a date, unavailability type, and optional notes
2. WHEN a resource has approved leave, THE Resource_Scheduler SHALL automatically mark those dates as unavailable
3. WHEN equipment has scheduled maintenance, THE Resource_Scheduler SHALL automatically mark those dates as unavailable
4. WHEN bulk marking unavailability, THE Resource_Scheduler SHALL support date ranges
5. WHEN an unavailability conflicts with existing assignments, THE Resource_Scheduler SHALL warn the user and list affected assignments
6. THE Resource_Scheduler SHALL support unavailability types: leave, training, maintenance, holiday, and other

### Requirement 5: Utilization Reporting

**User Story:** As an engineering manager, I want to view resource utilization reports, so that I can optimize resource allocation and identify capacity issues.

#### Acceptance Criteria

1. WHEN viewing utilization, THE Utilization_Calculator SHALL compute utilization percentage as (assigned hours / available hours) × 100
2. WHEN a resource is over-allocated, THE Utilization_Calculator SHALL highlight utilization above 100%
3. WHEN viewing weekly utilization, THE Utilization_Calculator SHALL aggregate planned and actual hours by week
4. THE Utilization_Calculator SHALL display utilization by resource type (personnel, equipment, tools)
5. WHEN filtering utilization reports, THE Utilization_Calculator SHALL support date range and resource type filters
6. THE Utilization_Calculator SHALL show comparison between planned hours and actual hours for completed assignments

### Requirement 6: Conflict Detection

**User Story:** As an engineering coordinator, I want the system to detect scheduling conflicts, so that I can avoid double-booking resources.

#### Acceptance Criteria

1. WHEN an assignment is created, THE Conflict_Detector SHALL check for overlapping assignments on the same resource
2. WHEN a conflict is detected, THE Conflict_Detector SHALL display the conflicting assignment details
3. WHEN checking availability, THE Conflict_Detector SHALL consider both assignments and unavailability records
4. IF a resource's daily capacity would be exceeded, THEN THE Conflict_Detector SHALL warn about over-allocation
5. THE Conflict_Detector SHALL allow forcing an assignment despite conflicts with explicit user confirmation

### Requirement 7: Skills Management

**User Story:** As an administrator, I want to manage resource skills and certifications, so that I can match resources to project requirements.

#### Acceptance Criteria

1. THE Resource_Scheduler SHALL maintain a master list of skills with codes, names, and categories
2. WHEN assigning skills to a resource, THE Resource_Scheduler SHALL allow selecting from the master skill list
3. WHEN searching for resources, THE Resource_Scheduler SHALL support filtering by required skills
4. WHEN a certification has an expiry date, THE Resource_Scheduler SHALL track and display expiry status
5. THE Resource_Scheduler SHALL provide default engineering skills: Lifting Engineering, Transport Engineering, Structural Analysis, CAD/Drawing, Route Survey, Rigging Supervision, Crane Operation, Modular Trailer Operation
