# Requirements Document

## Introduction

This document defines the requirements for implementing a comprehensive System Audit & Logging module for Gama ERP. The module provides audit logging, system activity tracking, login history, and data access logging for security, compliance, and debugging purposes. This enables administrators to track all significant system activities, investigate security incidents, and maintain compliance with data governance requirements.

## Glossary

- **Audit_Log**: A record of user actions on business entities including create, update, and delete operations with before/after values
- **System_Log**: Application-level logs for errors, warnings, and informational messages for debugging and monitoring
- **Login_History**: Records of user authentication events including successful logins, logouts, and failed attempts
- **Data_Access_Log**: Records of data exports, bulk queries, and sensitive data access for compliance tracking
- **Audit_Trigger**: A database trigger that automatically captures changes to critical tables
- **Changed_Fields**: Array of field names that were modified during an update operation
- **Retention_Policy**: Rules defining how long audit records are kept before archival or deletion

## Requirements

### Requirement 1: Audit Log Recording

**User Story:** As a system administrator, I want all significant user actions automatically logged, so that I can track who did what and when for security and compliance purposes.

#### Acceptance Criteria

1. WHEN a user creates, updates, or deletes a record in a critical table, THE Audit_Log SHALL record the action with timestamp, user details, and entity information
2. WHEN a record is updated, THE Audit_Log SHALL capture both old_values and new_values as JSON objects
3. WHEN a record is updated, THE Audit_Log SHALL identify and store the list of changed_fields
4. THE Audit_Log SHALL capture the user's IP address, user agent, and session information when available
5. WHEN an action fails, THE Audit_Log SHALL record the error status and error message
6. THE Audit_Trigger SHALL automatically log changes to job_orders, invoices, and quotations tables

### Requirement 2: System Logging

**User Story:** As a developer, I want application errors and events logged systematically, so that I can debug issues and monitor system health.

#### Acceptance Criteria

1. THE System_Log SHALL support log levels: error, warn, info, and debug
2. WHEN an error occurs, THE System_Log SHALL capture the error type, message, and stack trace
3. THE System_Log SHALL record the source module and function name for each log entry
4. THE System_Log SHALL support attaching arbitrary JSON data to log entries for context
5. WHEN a request causes a log entry, THE System_Log SHALL include the request_id for correlation

### Requirement 3: Login History Tracking

**User Story:** As a security administrator, I want to track all login attempts, so that I can detect suspicious activity and investigate security incidents.

#### Acceptance Criteria

1. WHEN a user successfully logs in, THE Login_History SHALL record the login event with timestamp and method
2. WHEN a user logs out, THE Login_History SHALL update the record with logout time and calculate session duration
3. THE Login_History SHALL capture device information including device_type, browser, and operating system
4. WHEN a login attempt fails, THE Login_History SHALL record the failure with the reason
5. THE Login_History SHALL capture geographic information (country, city) when available from IP address

### Requirement 4: Data Access Logging

**User Story:** As a compliance officer, I want to track when users access or export sensitive data, so that I can ensure data governance compliance.

#### Acceptance Criteria

1. WHEN a user exports data, THE Data_Access_Log SHALL record the export with data type, format, and record count
2. WHEN a user accesses sensitive entity data, THE Data_Access_Log SHALL record the access type and entity details
3. THE Data_Access_Log SHALL capture the user's stated reason for access when provided
4. THE Data_Access_Log SHALL record the IP address of the accessing user

### Requirement 5: Audit Log Search and Query

**User Story:** As an administrator, I want to search and filter audit logs, so that I can investigate specific activities and generate compliance reports.

#### Acceptance Criteria

1. WHEN searching audit logs, THE System SHALL support filtering by user_id, user_email, or user_role
2. WHEN searching audit logs, THE System SHALL support filtering by entity_type and entity_id
3. WHEN searching audit logs, THE System SHALL support filtering by date range (start and end timestamps)
4. WHEN searching audit logs, THE System SHALL support filtering by action type (create, update, delete)
5. WHEN searching audit logs, THE System SHALL support filtering by module
6. THE System SHALL return audit log results sorted by timestamp in descending order by default

### Requirement 6: Login History Query

**User Story:** As a security administrator, I want to query login history, so that I can analyze user access patterns and detect anomalies.

#### Acceptance Criteria

1. WHEN querying login history, THE System SHALL support filtering by user_id
2. WHEN querying login history, THE System SHALL support filtering by status (success, failed)
3. WHEN querying login history, THE System SHALL support filtering by date range
4. WHEN querying login history, THE System SHALL support filtering by login_method
5. THE System SHALL calculate and return session statistics including average session duration

### Requirement 7: System Log Query

**User Story:** As a developer, I want to search system logs, so that I can diagnose issues and monitor application behavior.

#### Acceptance Criteria

1. WHEN querying system logs, THE System SHALL support filtering by log level
2. WHEN querying system logs, THE System SHALL support filtering by source module
3. WHEN querying system logs, THE System SHALL support filtering by date range
4. WHEN querying system logs, THE System SHALL support text search in message content
5. THE System SHALL return system log results sorted by timestamp in descending order

### Requirement 8: Retention and Archival

**User Story:** As a system administrator, I want audit logs managed according to retention policies, so that storage is optimized while compliance requirements are met.

#### Acceptance Criteria

1. THE System SHALL define configurable retention periods for each log type
2. THE System SHALL provide a mechanism to archive logs older than the retention period
3. THE System SHALL provide storage size monitoring for audit tables
4. WHEN logs are archived, THE System SHALL maintain a record of the archival operation
