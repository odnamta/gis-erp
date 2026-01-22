# Requirements Document

## Introduction

This document specifies the requirements for the User Activity Tracking feature (v0.13.1) in Gama ERP. The system tracks user interactions including page views and key actions (create, update, delete) to provide visibility into user adoption and identify UX issues.

**Note**: This feature creates a NEW `user_activity_log` table separate from the existing `activity_log` table. The existing `activity_log` table is a document-focused audit trail (tracking document changes), while `user_activity_log` focuses on user behavior tracking (page views, sessions, adoption metrics).

The activity viewer will be a new page at `/settings/activity` displaying metrics and charts for user activity data.

## Glossary

- **User_Activity_Log**: Database table storing tracked user activities including page views and actions
- **Activity_Logger**: Server-side utility function for logging user activities
- **Page_View**: A tracked event when a user navigates to a page
- **Action_Event**: A tracked event when a user performs a key action (create, update, delete, approve, etc.)
- **Activity_Viewer**: Page at /settings/activity displaying activity metrics and timeline
- **Session_ID**: Unique identifier for a user's browsing session
- **Rate_Limiter**: Mechanism to prevent excessive logging of repeated page views

## Requirements

### Requirement 1: Activity Log Table

**User Story:** As a system administrator, I want a database table to store user activities, so that I can track how users interact with the ERP.

#### Acceptance Criteria

1. THE Database SHALL have a user_activity_log table with columns: id, user_id, user_email, action_type, resource_type, resource_id, page_path, metadata, ip_address, user_agent, session_id, created_at
2. THE user_activity_log table SHALL have indexes on user_id, created_at, action_type, and resource_type for efficient querying
3. THE user_activity_log table SHALL have RLS enabled with policies allowing users to view only their own activity
4. THE user_activity_log table SHALL have an RLS policy allowing owner, director, and sysadmin roles to view all activities
5. THE user_activity_log table SHALL allow authenticated users to insert activity records

### Requirement 2: Activity Logger Utility

**User Story:** As a developer, I want a server-side utility to log activities, so that I can easily add tracking to server actions.

#### Acceptance Criteria

1. THE Activity_Logger SHALL provide a logActivity function accepting userId, actionType, resourceType, resourceId, and metadata parameters
2. WHEN logActivity is called THEN the Activity_Logger SHALL insert a record into user_activity_log asynchronously
3. THE Activity_Logger SHALL automatically capture user_email from the user profile
4. THE Activity_Logger SHALL support action types: page_view, create, update, delete, login, logout, approve, reject
5. THE Activity_Logger SHALL support resource types: customer, pjo, job_order, invoice, disbursement, employee, project, quotation
6. IF logActivity fails THEN the Activity_Logger SHALL log the error but NOT throw an exception to avoid disrupting user actions

### Requirement 3: Page View Tracking

**User Story:** As an administrator, I want to track page views automatically, so that I can understand which pages users visit most.

#### Acceptance Criteria

1. WHEN a user navigates to a page THEN the Middleware SHALL log a page_view activity
2. THE Middleware SHALL exclude static assets, API routes, and authentication routes from page view tracking
3. THE Middleware SHALL implement rate limiting to log maximum one page view per page per user per minute
4. WHEN logging page views THEN the Middleware SHALL capture page_path, user_id, and session_id
5. THE Middleware SHALL NOT slow down page navigation noticeably (non-blocking logging)

### Requirement 4: Action Tracking in Customer Module

**User Story:** As an administrator, I want to track customer-related actions, so that I can see how users manage customer data.

#### Acceptance Criteria

1. WHEN a customer is created successfully THEN the System SHALL log a create action with resource_type customer
2. WHEN a customer is updated successfully THEN the System SHALL log an update action with resource_type customer
3. WHEN a customer is deleted successfully THEN the System SHALL log a delete action with resource_type customer
4. WHEN logging customer actions THEN the System SHALL include customer name in metadata

### Requirement 5: Action Tracking in PJO Module

**User Story:** As an administrator, I want to track PJO-related actions, so that I can monitor the quotation-to-order workflow.

#### Acceptance Criteria

1. WHEN a PJO is created successfully THEN the System SHALL log a create action with resource_type pjo
2. WHEN a PJO is updated successfully THEN the System SHALL log an update action with resource_type pjo
3. WHEN a PJO is approved THEN the System SHALL log an approve action with resource_type pjo
4. WHEN a PJO is rejected THEN the System SHALL log a reject action with resource_type pjo
5. WHEN logging PJO actions THEN the System SHALL include pjo_number in metadata

### Requirement 6: Action Tracking in Job Orders Module

**User Story:** As an administrator, I want to track job order actions, so that I can monitor operational activities.

#### Acceptance Criteria

1. WHEN a job order is created successfully THEN the System SHALL log a create action with resource_type job_order
2. WHEN a job order is updated successfully THEN the System SHALL log an update action with resource_type job_order
3. WHEN a job order is completed THEN the System SHALL log an update action with status change in metadata
4. WHEN logging job order actions THEN the System SHALL include jo_number in metadata

### Requirement 7: Action Tracking in Invoices Module

**User Story:** As an administrator, I want to track invoice actions, so that I can monitor billing activities.

#### Acceptance Criteria

1. WHEN an invoice is created successfully THEN the System SHALL log a create action with resource_type invoice
2. WHEN an invoice is updated successfully THEN the System SHALL log an update action with resource_type invoice
3. WHEN an invoice is sent THEN the System SHALL log an update action with status sent in metadata
4. WHEN logging invoice actions THEN the System SHALL include invoice_number in metadata

### Requirement 8: Action Tracking in Disbursements Module

**User Story:** As an administrator, I want to track disbursement actions, so that I can monitor financial approvals.

#### Acceptance Criteria

1. WHEN a disbursement is created successfully THEN the System SHALL log a create action with resource_type disbursement
2. WHEN a disbursement is approved THEN the System SHALL log an approve action with resource_type disbursement
3. WHEN a disbursement is released THEN the System SHALL log an update action with status released in metadata
4. WHEN logging disbursement actions THEN the System SHALL include disbursement reference in metadata

### Requirement 9: Action Tracking in HR Employees Module

**User Story:** As an administrator, I want to track employee management actions, so that I can audit HR activities.

#### Acceptance Criteria

1. WHEN an employee is created successfully THEN the System SHALL log a create action with resource_type employee
2. WHEN an employee is updated successfully THEN the System SHALL log an update action with resource_type employee
3. WHEN logging employee actions THEN the System SHALL include employee name in metadata

### Requirement 10: Activity Viewer Page

**User Story:** As an owner or administrator, I want to view an activity viewer page, so that I can understand user adoption and behavior.

#### Acceptance Criteria

1. WHEN an owner, director, or sysadmin navigates to /settings/activity THEN the Activity_Viewer SHALL display
2. THE Activity_Viewer SHALL show daily active users count for the current day
3. THE Activity_Viewer SHALL show an activity timeline with the last 50 actions
4. THE Activity_Viewer SHALL allow filtering by user, action type, and date range
5. THE Activity_Viewer SHALL display a bar chart showing actions per day for the last 7 days
6. WHEN a non-admin user attempts to access /settings/activity THEN the System SHALL redirect to their dashboard

### Requirement 11: Activity Timeline Display

**User Story:** As an administrator, I want to see a timeline of recent activities, so that I can monitor what users are doing.

#### Acceptance Criteria

1. THE Activity_Timeline SHALL display user email, action type, resource type, and timestamp for each activity
2. THE Activity_Timeline SHALL show relative timestamps (e.g., "2 minutes ago", "1 hour ago")
3. THE Activity_Timeline SHALL display page path for page_view actions
4. THE Activity_Timeline SHALL display resource identifier for action events
5. WHEN clicking on a resource in the timeline THEN the Activity_Viewer SHALL navigate to that resource if applicable

### Requirement 12: Activity Filtering

**User Story:** As an administrator, I want to filter activities, so that I can focus on specific users or action types.

#### Acceptance Criteria

1. THE Activity_Viewer SHALL provide a user filter dropdown showing all users with activity
2. THE Activity_Viewer SHALL provide an action type filter with options: All, page_view, create, update, delete, approve, reject
3. THE Activity_Viewer SHALL provide a date range filter with options: Today, Last 7 days, Last 30 days
4. WHEN filters are applied THEN the Activity_Viewer SHALL update the timeline and chart accordingly
5. WHEN filters are applied THEN the Activity_Viewer SHALL update the daily active users count accordingly

### Requirement 13: Performance Requirements

**User Story:** As a user, I want activity tracking to not slow down my work, so that I can use the ERP efficiently.

#### Acceptance Criteria

1. THE Activity_Logger SHALL execute asynchronously without blocking the main action response
2. THE Middleware page view tracking SHALL add less than 50ms latency to page loads
3. THE Activity_Dashboard SHALL load within 2 seconds for the default view
4. THE user_activity_log table SHALL use appropriate indexes to ensure query performance

