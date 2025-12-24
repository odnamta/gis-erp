# Requirements Document

## Introduction

This document defines the requirements for v0.70: n8n Automation - Scheduled Tasks. This feature implements scheduled automation tasks for daily operations, maintenance reminders, and periodic data processing. Scheduled tasks enable proactive business operations by automatically checking for overdue invoices, expiring documents, due maintenance, and generating periodic reports and KPI snapshots.

## Glossary

- **Scheduled_Task**: A registered automation task with a cron schedule that executes periodically
- **Task_Execution**: A record of a single run of a scheduled task including status, duration, and results
- **Cron_Expression**: A time-based scheduling format (e.g., "0 8 * * *" for daily at 8 AM)
- **Task_Code**: A unique identifier for a scheduled task (e.g., DAILY_OVERDUE_CHECK)
- **Execution_Status**: The state of a task run: running, completed, failed, or timeout
- **Trigger_Type**: How a task execution was initiated: schedule, manual, or retry
- **KPI_Snapshot**: A point-in-time capture of key performance indicators for trend analysis
- **Depreciation_Run**: A batch process that calculates and records asset depreciation

## Requirements

### Requirement 1: Scheduled Task Registry

**User Story:** As a system administrator, I want to register and manage scheduled tasks, so that I can configure automated operations that run on defined schedules.

#### Acceptance Criteria

1. THE Scheduled_Task_Registry SHALL store task configurations including task_code, task_name, description, and cron_expression
2. WHEN a scheduled task is registered, THE System SHALL generate a unique task_code identifier
3. THE Scheduled_Task_Registry SHALL support timezone configuration with default 'Asia/Jakarta'
4. THE Scheduled_Task_Registry SHALL store n8n_workflow_id and webhook_url for execution
5. THE Scheduled_Task_Registry SHALL support task_parameters as JSON for customization
6. THE Scheduled_Task_Registry SHALL track is_active status, last_run_at, last_run_status, and last_run_duration_ms
7. WHEN a task completes, THE System SHALL calculate and store next_run_at based on cron_expression
8. WHEN retrieving tasks, THE System SHALL filter by active status

### Requirement 2: Task Execution History

**User Story:** As a system administrator, I want to track execution history for all scheduled tasks, so that I can monitor performance and troubleshoot failures.

#### Acceptance Criteria

1. THE Task_Execution_History SHALL record task_id, started_at, completed_at, and status for each run
2. THE Task_Execution_History SHALL track status transitions: running → completed | failed | timeout
3. WHEN an execution completes, THE System SHALL store records_processed count and result_summary
4. WHEN an execution fails, THE System SHALL store error_message with details
5. THE Task_Execution_History SHALL calculate and store execution_time_ms
6. THE Task_Execution_History SHALL record triggered_by: schedule, manual, or retry
7. WHEN querying execution history, THE System SHALL support filtering by task_id, status, and date range

### Requirement 3: Daily Overdue Invoice Check

**User Story:** As a finance manager, I want the system to automatically check for overdue invoices daily, so that I can take timely collection actions.

#### Acceptance Criteria

1. THE Daily_Overdue_Check SHALL execute at 8 AM Jakarta time daily
2. WHEN checking invoices, THE System SHALL identify invoices with status 'sent' or 'partial' where due_date is past
3. THE System SHALL group overdue invoices by severity: critical (>60 days), high (31-60 days), medium (15-30 days), low (1-14 days)
4. WHEN an invoice is identified as overdue, THE System SHALL update its status to 'overdue'
5. WHEN critical overdue invoices are found, THE System SHALL send INVOICE_OVERDUE_CRITICAL notification to finance_manager
6. THE System SHALL create follow-up tasks for overdue invoices with appropriate priority
7. WHEN the check completes, THE System SHALL send a daily summary email to finance team

### Requirement 4: Daily Document Expiry Check

**User Story:** As an administrator, I want the system to automatically check for expiring documents daily, so that renewals can be processed before expiration.

#### Acceptance Criteria

1. THE Daily_Expiry_Check SHALL execute at 7 AM Jakarta time daily
2. WHEN checking documents, THE System SHALL identify documents expiring within 30 days
3. WHEN checking permits, THE System SHALL identify permits expiring within 30 days
4. WHEN checking certifications, THE System SHALL identify certifications expiring within 30 days
5. WHEN expiring items are found, THE System SHALL send DOCUMENT_EXPIRING notification to responsible parties
6. THE System SHALL group expiring items by urgency: expired, expiring_this_week, expiring_this_month
7. WHEN the check completes, THE System SHALL log records_processed and result_summary

### Requirement 5: Daily Maintenance Due Check

**User Story:** As an operations manager, I want the system to automatically check for due maintenance daily, so that equipment stays in optimal condition.

#### Acceptance Criteria

1. THE Daily_Maintenance_Check SHALL execute at 6 AM Jakarta time daily
2. WHEN checking maintenance, THE System SHALL identify equipment with upcoming maintenance within 7 days
3. WHEN checking maintenance, THE System SHALL identify equipment with overdue maintenance
4. WHEN maintenance is due, THE System SHALL send MAINTENANCE_DUE notification to operations team
5. THE System SHALL prioritize overdue maintenance as critical
6. WHEN the check completes, THE System SHALL log equipment_count and maintenance_items_found

### Requirement 6: Weekly KPI Snapshot

**User Story:** As a manager, I want the system to capture weekly KPI snapshots, so that I can track performance trends over time.

#### Acceptance Criteria

1. THE Weekly_KPI_Snapshot SHALL execute at midnight on Monday (start of week)
2. WHEN capturing KPIs, THE System SHALL record revenue metrics for the previous week
3. WHEN capturing KPIs, THE System SHALL record operational metrics (jobs completed, on-time delivery rate)
4. WHEN capturing KPIs, THE System SHALL record financial metrics (AR aging, collection rate)
5. THE System SHALL store KPI snapshots with week_number and year for historical analysis
6. WHEN the snapshot completes, THE System SHALL calculate week-over-week trends
7. THE System SHALL support querying historical KPI data for trend visualization

### Requirement 7: Monthly Depreciation Run

**User Story:** As a finance manager, I want the system to automatically calculate monthly depreciation, so that asset values are accurately tracked.

#### Acceptance Criteria

1. THE Monthly_Depreciation_Run SHALL execute at 1 AM on the first day of each month
2. WHEN running depreciation, THE System SHALL process all active assets with depreciation enabled
3. THE System SHALL calculate depreciation using the asset's configured method (straight-line, declining balance)
4. WHEN depreciation is calculated, THE System SHALL update asset book_value
5. WHEN depreciation is calculated, THE System SHALL create depreciation_records for audit trail
6. THE System SHALL skip assets that are fully depreciated (book_value = 0)
7. WHEN the run completes, THE System SHALL log assets_processed and total_depreciation_amount

### Requirement 8: Task Manual Trigger

**User Story:** As a system administrator, I want to manually trigger scheduled tasks, so that I can run tasks on-demand for testing or urgent needs.

#### Acceptance Criteria

1. WHEN manually triggering a task, THE System SHALL validate the task exists and is active
2. WHEN manually triggering a task, THE System SHALL create a task_execution record with triggered_by='manual'
3. THE System SHALL execute the task immediately regardless of schedule
4. WHEN manual execution completes, THE System SHALL NOT update next_run_at (preserve schedule)
5. THE System SHALL return execution_id for tracking the manual run

### Requirement 9: Task Enable/Disable

**User Story:** As a system administrator, I want to enable or disable scheduled tasks, so that I can control which automations are active.

#### Acceptance Criteria

1. WHEN disabling a task, THE System SHALL set is_active to false
2. WHEN a task is disabled, THE System SHALL skip it during scheduled execution
3. WHEN enabling a task, THE System SHALL set is_active to true and calculate next_run_at
4. THE System SHALL log task status changes for audit purposes
5. WHEN listing tasks, THE System SHALL indicate active/inactive status clearly

### Requirement 10: Default Scheduled Tasks

**User Story:** As a system administrator, I want pre-configured scheduled tasks for common operations, so that I can quickly enable standard automations.

#### Acceptance Criteria

1. THE System SHALL provide default task DAILY_OVERDUE_CHECK with cron "0 8 * * *"
2. THE System SHALL provide default task DAILY_EXPIRY_CHECK with cron "0 7 * * *"
3. THE System SHALL provide default task DAILY_MAINTENANCE_CHECK with cron "0 6 * * *"
4. THE System SHALL provide default task WEEKLY_KPI_SNAPSHOT with cron "0 0 * * 1"
5. THE System SHALL provide default task MONTHLY_DEPRECIATION with cron "0 1 1 * *"
6. THE System SHALL provide default task DAILY_BACKUP with cron "0 2 * * *"
7. THE System SHALL provide default task HOURLY_GPS_SYNC with cron "0 * * * *"
8. THE System SHALL provide default task DAILY_REPORT_GENERATION with cron "0 5 * * *"

### Requirement 11: Execution Error Handling

**User Story:** As a system administrator, I want failed task executions to be handled gracefully, so that issues are logged and can be investigated.

#### Acceptance Criteria

1. WHEN a task execution fails, THE System SHALL set status to 'failed' and store error_message
2. WHEN a task times out (exceeds 5 minutes), THE System SHALL set status to 'timeout'
3. THE System SHALL send alert notification to system administrators on task failure
4. WHEN a task fails, THE System SHALL NOT affect other scheduled tasks
5. THE System SHALL support retry of failed executions with triggered_by='retry'
