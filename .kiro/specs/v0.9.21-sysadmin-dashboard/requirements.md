# Requirements Document

## Introduction

This document defines the requirements for the System Admin Dashboard feature (v0.9.21) in GAMA ERP. The System Admin Dashboard provides system administrators (primary user: Dio) with a centralized view of system health, user management, and activity monitoring. Unlike business-focused dashboards, this dashboard focuses on IT/system management metrics including user statistics, system activity, and administrative quick actions.

## Glossary

- **Sysadmin_Dashboard**: The main dashboard page for system administrators showing user statistics, system activity, and admin quick actions
- **Sysadmin_Data_Service**: Server-side service that fetches and caches system admin metrics
- **Dashboard_Cache**: 5-minute in-memory cache system for dashboard data
- **Current_User**: The authenticated user viewing the dashboard
- **User_Profile**: A record in user_profiles table containing user information and role
- **User_Activity_Log**: A record tracking user actions including page views, logins, and CRUD operations
- **Activity_Log**: A record tracking document-level changes for audit purposes

## Requirements

### Requirement 1: User Statistics Overview

**User Story:** As a system administrator, I want to see user statistics, so that I can monitor user adoption and activity levels.

#### Acceptance Criteria

1. WHEN the Sysadmin_Dashboard loads, THE Sysadmin_Data_Service SHALL fetch the total count of users from user_profiles
2. WHEN the Sysadmin_Dashboard loads, THE Sysadmin_Data_Service SHALL fetch the count of active users (is_active = true) from user_profiles
3. WHEN the Sysadmin_Dashboard loads, THE Sysadmin_Data_Service SHALL fetch the count of users who logged in today (last_login_at >= today) from user_profiles
4. WHEN the Sysadmin_Dashboard loads, THE Sysadmin_Data_Service SHALL fetch the count of users who logged in this week (last_login_at >= 7 days ago) from user_profiles
5. WHEN the Sysadmin_Dashboard loads, THE Sysadmin_Data_Service SHALL fetch the count of new users created this month (created_at >= start of month) from user_profiles
6. THE Sysadmin_Dashboard SHALL display user statistics in card format showing total, active, active today, active this week, and new this month counts

### Requirement 2: User Distribution by Role

**User Story:** As a system administrator, I want to see user distribution by role, so that I can understand the composition of system users.

#### Acceptance Criteria

1. WHEN the Sysadmin_Dashboard loads, THE Sysadmin_Data_Service SHALL fetch user counts grouped by role from user_profiles
2. THE Sysadmin_Dashboard SHALL display role distribution as a list showing role name and user count
3. THE Sysadmin_Dashboard SHALL sort roles by user count in descending order
4. THE Sysadmin_Dashboard SHALL only count active users (is_active = true) in role distribution

### Requirement 3: System Activity Metrics

**User Story:** As a system administrator, I want to see system activity metrics, so that I can monitor system usage and identify potential issues.

#### Acceptance Criteria

1. WHEN the Sysadmin_Dashboard loads, THE Sysadmin_Data_Service SHALL fetch the count of login actions today (action_type = 'login' AND created_at >= today) from user_activity_log
2. WHEN the Sysadmin_Dashboard loads, THE Sysadmin_Data_Service SHALL fetch the count of page views today (action_type = 'page_view' AND created_at >= today) from user_activity_log
3. WHEN the Sysadmin_Dashboard loads, THE Sysadmin_Data_Service SHALL fetch the total count of actions today from user_activity_log
4. WHEN the Sysadmin_Dashboard loads, THE Sysadmin_Data_Service SHALL calculate actions per hour as (total actions today / hours elapsed today)
5. THE Sysadmin_Dashboard SHALL display system activity metrics in card format showing logins today, page views today, total actions today, and actions per hour

### Requirement 4: Recent Activity Log

**User Story:** As a system administrator, I want to see recent activity, so that I can monitor user behavior and troubleshoot issues.

#### Acceptance Criteria

1. THE Sysadmin_Dashboard SHALL display a Recent Activity list showing the 20 most recent actions from user_activity_log
2. THE Sysadmin_Dashboard SHALL display each activity with user_email, action_type, page_path or resource_type, and created_at
3. THE Sysadmin_Dashboard SHALL order activities by created_at descending (most recent first)
4. THE Sysadmin_Dashboard SHALL format timestamps using the centralized formatDateTime utility from lib/utils/format.ts
5. THE Sysadmin_Dashboard SHALL display action_type with color-coded badges (login=green, page_view=blue, create=purple, update=yellow, delete=red)

### Requirement 5: Recent Document Activity

**User Story:** As a system administrator, I want to see recent document changes, so that I can audit system modifications.

#### Acceptance Criteria

1. THE Sysadmin_Dashboard SHALL display a Recent Document Changes list showing the 10 most recent entries from activity_log
2. THE Sysadmin_Dashboard SHALL display each entry with user_name, action_type, document_type, document_number, and created_at
3. THE Sysadmin_Dashboard SHALL order entries by created_at descending (most recent first)
4. THE Sysadmin_Dashboard SHALL format timestamps using the centralized formatDateTime utility

### Requirement 6: Quick Actions

**User Story:** As a system administrator, I want quick access to admin functions, so that I can efficiently manage the system.

#### Acceptance Criteria

1. THE Sysadmin_Dashboard SHALL display a Quick Actions section with navigation links
2. WHEN a user clicks "User Management", THE Sysadmin_Dashboard SHALL navigate to /settings/users
3. WHEN a user clicks "View Activity Logs", THE Sysadmin_Dashboard SHALL navigate to /settings/activity
4. WHEN a user clicks "System Settings", THE Sysadmin_Dashboard SHALL navigate to /settings
5. WHEN a user clicks "View All Users", THE Sysadmin_Dashboard SHALL navigate to /settings/users

### Requirement 7: Data Caching

**User Story:** As a system, I want to cache dashboard data, so that page loads are fast and database queries are minimized.

#### Acceptance Criteria

1. THE Sysadmin_Data_Service SHALL use the Dashboard_Cache with a 5-minute TTL
2. WHEN cached data exists and is not expired, THE Sysadmin_Data_Service SHALL return cached data without querying the database
3. WHEN cached data is expired or missing, THE Sysadmin_Data_Service SHALL fetch fresh data and update the cache
4. THE Sysadmin_Data_Service SHALL generate cache keys using the pattern 'sysadmin-dashboard-metrics:{role}:{date}'

### Requirement 8: Role-Based Access Control

**User Story:** As a system administrator, I want to restrict dashboard access to authorized roles, so that sensitive system data is protected.

#### Acceptance Criteria

1. WHEN a user with role 'sysadmin' accesses the Sysadmin_Dashboard, THE Sysadmin_Dashboard SHALL display the full dashboard
2. WHEN a user with role 'owner' accesses the Sysadmin_Dashboard, THE Sysadmin_Dashboard SHALL display the full dashboard
3. WHEN a user with role 'director' accesses the Sysadmin_Dashboard, THE Sysadmin_Dashboard SHALL display the full dashboard
4. WHEN a user with an unauthorized role accesses the Sysadmin_Dashboard, THE Sysadmin_Dashboard SHALL redirect to the default dashboard
5. IF a user is not authenticated, THEN THE Sysadmin_Dashboard SHALL redirect to the login page

### Requirement 9: Mobile Responsiveness

**User Story:** As a system administrator working remotely, I want to access the dashboard on mobile devices, so that I can monitor system health from anywhere.

#### Acceptance Criteria

1. THE Sysadmin_Dashboard SHALL display metrics in a responsive grid that adapts to screen size
2. WHEN viewed on mobile devices, THE Sysadmin_Dashboard SHALL stack cards vertically for readability
3. THE Sysadmin_Dashboard SHALL maintain touch-friendly tap targets (minimum 44px) for all interactive elements

### Requirement 10: Visual Identity

**User Story:** As a system administrator, I want a consistent visual identity, so that the dashboard is recognizable and easy to navigate.

#### Acceptance Criteria

1. THE Sysadmin_Dashboard SHALL display a header with "System Admin Dashboard" title and Settings icon
2. THE Sysadmin_Dashboard SHALL display a subtitle "System health and user management"
3. THE Sysadmin_Dashboard SHALL use a gray/slate color scheme appropriate for system administration
4. THE Sysadmin_Dashboard SHALL use consistent card styling with other role-specific dashboards
