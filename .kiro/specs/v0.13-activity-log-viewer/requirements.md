# Requirements Document

## Introduction

This document specifies the requirements for the Activity Log Viewer feature (v0.13) in Gama ERP. The system provides a UI for viewing, filtering, and exporting activity logs that track user actions across the application. The activity_log table already exists; this feature adds the user interface and access control.

## Glossary

- **Activity_Log**: Database table storing all tracked user actions with timestamps, user info, and entity references
- **Action_Type**: The type of action performed (login, created, updated, deleted, approved, rejected, status_changed, payment_recorded)
- **Document_Type**: The entity type affected (pjo, jo, invoice, customer, project, user, system)
- **Activity_Log_Page**: The settings page displaying filterable activity logs
- **Export_CSV**: Functionality to download filtered activity logs as CSV file

## Requirements

### Requirement 1

**User Story:** As an owner or admin, I want to view all system activity logs, so that I can audit user actions across the entire system.

#### Acceptance Criteria

1. WHEN an owner or admin navigates to Settings > Activity Log THEN the Activity_Log_Page SHALL display all activity records
2. WHEN displaying activity logs THEN the Activity_Log_Page SHALL show timestamp, user name, action type, entity reference, and details
3. WHEN displaying timestamps THEN the Activity_Log_Page SHALL show relative time for recent entries (e.g., "Today 08:35", "Yesterday 16:45", "2 days ago")
4. WHEN displaying activity logs THEN the Activity_Log_Page SHALL order records by created_at descending (newest first)
5. WHEN activity logs are loading THEN the Activity_Log_Page SHALL display a loading skeleton

### Requirement 2

**User Story:** As a manager, I want to view my own activity logs and my team's actions, so that I can track department activities.

#### Acceptance Criteria

1. WHEN a manager navigates to Activity Log THEN the Activity_Log_Page SHALL display the manager's own actions
2. WHEN a manager views activity logs THEN the Activity_Log_Page SHALL also display actions from users in their department (if applicable)
3. WHEN filtering by user THEN the Activity_Log_Page SHALL only show users the manager has access to view

### Requirement 3

**User Story:** As a regular user (ops, finance, sales), I want to view my own activity logs, so that I can review my recent actions.

#### Acceptance Criteria

1. WHEN a non-admin user navigates to Activity Log THEN the Activity_Log_Page SHALL display only their own actions
2. WHEN a non-admin user attempts to filter by other users THEN the Activity_Log_Page SHALL NOT show the user filter option
3. WHEN displaying own actions THEN the Activity_Log_Page SHALL show all action types the user has performed

### Requirement 4

**User Story:** As a user, I want to filter activity logs by action type, so that I can find specific types of actions.

#### Acceptance Criteria

1. WHEN viewing activity logs THEN the Activity_Log_Page SHALL display an action type filter dropdown
2. WHEN the action filter is set to "All Actions" THEN the Activity_Log_Page SHALL display all action types
3. WHEN the action filter is set to a specific type THEN the Activity_Log_Page SHALL display only matching records
4. WHEN filtering THEN the Activity_Log_Page SHALL support these action types: login, logout, created, updated, deleted, approved, rejected, status_changed, payment_recorded

### Requirement 5

**User Story:** As a user, I want to filter activity logs by entity type, so that I can focus on specific business objects.

#### Acceptance Criteria

1. WHEN viewing activity logs THEN the Activity_Log_Page SHALL display an entity type filter dropdown
2. WHEN the entity filter is set to "All Entities" THEN the Activity_Log_Page SHALL display all entity types
3. WHEN the entity filter is set to a specific type THEN the Activity_Log_Page SHALL display only matching records
4. WHEN filtering THEN the Activity_Log_Page SHALL support these entity types: pjo, jo, invoice, customer, project

### Requirement 6

**User Story:** As an owner or admin, I want to filter activity logs by user, so that I can audit specific user actions.

#### Acceptance Criteria

1. WHEN an owner or admin views activity logs THEN the Activity_Log_Page SHALL display a user filter dropdown
2. WHEN the user filter is set to "All Users" THEN the Activity_Log_Page SHALL display actions from all users
3. WHEN the user filter is set to a specific user THEN the Activity_Log_Page SHALL display only that user's actions
4. WHEN displaying user options THEN the Activity_Log_Page SHALL show user names from user_profiles

### Requirement 7

**User Story:** As a user, I want to filter activity logs by date range, so that I can focus on a specific time period.

#### Acceptance Criteria

1. WHEN viewing activity logs THEN the Activity_Log_Page SHALL display a date range filter
2. WHEN the date filter is set to "Last 7 days" THEN the Activity_Log_Page SHALL display records from the past 7 days
3. WHEN the date filter is set to "Last 30 days" THEN the Activity_Log_Page SHALL display records from the past 30 days
4. WHEN the date filter is set to "Last 90 days" THEN the Activity_Log_Page SHALL display records from the past 90 days
5. WHEN the date filter is set to "All time" THEN the Activity_Log_Page SHALL display all records

### Requirement 8

**User Story:** As a user, I want to click on an entity reference to navigate to that entity, so that I can view the affected record.

#### Acceptance Criteria

1. WHEN displaying an activity log with a document_id THEN the Activity_Log_Page SHALL show a "View" link
2. WHEN a user clicks the View link for a PJO THEN the Activity_Log_Page SHALL navigate to /pjo/{id}
3. WHEN a user clicks the View link for a JO THEN the Activity_Log_Page SHALL navigate to /jo/{id}
4. WHEN a user clicks the View link for an Invoice THEN the Activity_Log_Page SHALL navigate to /invoices/{id}
5. WHEN a user clicks the View link for a Customer THEN the Activity_Log_Page SHALL navigate to /customers/{id}
6. WHEN a user clicks the View link for a Project THEN the Activity_Log_Page SHALL navigate to /projects/{id}
7. WHEN the document_type is "login" or "logout" THEN the Activity_Log_Page SHALL NOT show a View link

### Requirement 9

**User Story:** As an owner or admin, I want to export activity logs to CSV, so that I can analyze or archive the data externally.

#### Acceptance Criteria

1. WHEN an owner or admin views activity logs THEN the Activity_Log_Page SHALL display an "Export CSV" button
2. WHEN the Export CSV button is clicked THEN the Activity_Log_Page SHALL download a CSV file with current filter applied
3. WHEN exporting THEN the CSV SHALL include columns: timestamp, user, action, entity_type, entity_number, details
4. WHEN exporting THEN the filename SHALL be "activity-log-{date}.csv"
5. WHEN a non-admin user views activity logs THEN the Activity_Log_Page SHALL NOT display the Export CSV button

### Requirement 10

**User Story:** As a user, I want to see human-readable action descriptions, so that I can understand what happened.

#### Acceptance Criteria

1. WHEN displaying action types THEN the Activity_Log_Page SHALL show human-readable labels (e.g., "Created", "Approved", "Status Changed")
2. WHEN displaying entity types THEN the Activity_Log_Page SHALL show human-readable labels (e.g., "PJO", "Job Order", "Invoice")
3. WHEN displaying details THEN the Activity_Log_Page SHALL format JSON details as readable text (e.g., "status: paid")
4. WHEN details contain status changes THEN the Activity_Log_Page SHALL show "from → to" format

### Requirement 11

**User Story:** As a user, I want activity logs to be paginated, so that the page loads quickly with large datasets.

#### Acceptance Criteria

1. WHEN displaying activity logs THEN the Activity_Log_Page SHALL paginate results with 25 records per page
2. WHEN more records exist THEN the Activity_Log_Page SHALL display pagination controls
3. WHEN a user changes page THEN the Activity_Log_Page SHALL load the corresponding records
4. WHEN filters change THEN the Activity_Log_Page SHALL reset to page 1

### Requirement 12

**User Story:** As a user, I want to access the Activity Log from the Settings menu, so that I can easily find it.

#### Acceptance Criteria

1. WHEN viewing the Settings page THEN the navigation SHALL include a link to Activity Log
2. WHEN the Activity Log link is clicked THEN the browser SHALL navigate to /settings/activity-log
3. WHEN a user without settings access tries to access the page directly THEN the Activity_Log_Page SHALL redirect to dashboard
