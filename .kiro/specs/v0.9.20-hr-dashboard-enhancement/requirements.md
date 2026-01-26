# Requirements Document

## Introduction

This document defines the requirements for the HR Dashboard Enhancement feature (v0.9.20) in GAMA ERP. The enhanced HR Dashboard provides HR personnel (primary user: Rania) with a comprehensive view of payroll metrics, leave balance tracking, attendance analytics, employee lifecycle events, and recent activity. The dashboard follows existing patterns established by the HSE Dashboard, Customs Dashboard, and other role-specific dashboards.

## Glossary

- **HR_Dashboard**: The main dashboard page for HR personnel showing payroll, leave, attendance, and employee lifecycle metrics
- **HR_Data_Service**: Server-side service that fetches and caches HR metrics
- **Dashboard_Cache**: 5-minute in-memory cache system for dashboard data
- **Current_User**: The authenticated user viewing the dashboard
- **Payroll_Record**: A record containing salary and compensation data for an employee in a specific period
- **Leave_Balance**: A record tracking entitled, used, pending, and available leave days for an employee
- **Attendance_Record**: A record of employee clock-in/out times and attendance status
- **Employee_Lifecycle**: Events related to employee status changes (probation, contract renewal, anniversary, resignation)

## Requirements

### Requirement 1: Payroll Overview Metrics

**User Story:** As an HR officer, I want to see a payroll overview, so that I can monitor salary expenses and pending adjustments.

#### Acceptance Criteria

1. WHEN the HR_Dashboard loads, THE HR_Data_Service SHALL calculate the total payroll this month by summing gross_salary from payroll_records for the current month
2. WHEN the HR_Dashboard loads, THE HR_Data_Service SHALL fetch payroll breakdown grouped by department
3. WHEN the HR_Dashboard loads, THE HR_Data_Service SHALL calculate total overtime hours this month from attendance_records
4. WHEN the HR_Dashboard loads, THE HR_Data_Service SHALL fetch the count of pending payroll adjustments (payroll_records with status = 'draft' or 'pending')
5. THE HR_Dashboard SHALL display total payroll formatted as currency using formatCurrency from lib/utils/format.ts
6. THE HR_Dashboard SHALL display payroll by department as a breakdown list

### Requirement 2: Leave Balance Tracking

**User Story:** As an HR officer, I want to track leave balances, so that I can monitor leave utilization and identify employees with low balances.

#### Acceptance Criteria

1. WHEN the HR_Dashboard loads, THE HR_Data_Service SHALL calculate total leave days used this month from approved leave_requests
2. WHEN the HR_Dashboard loads, THE HR_Data_Service SHALL fetch leave balance summary grouped by leave_type
3. WHEN the HR_Dashboard loads, THE HR_Data_Service SHALL fetch the count of employees with available_days < 5 from leave_balances
4. WHEN the HR_Dashboard loads, THE HR_Data_Service SHALL calculate leave utilization rate as (used_days / entitled_days) * 100
5. THE HR_Dashboard SHALL display employees with low leave balance count with a WARNING indicator
6. THE HR_Dashboard SHALL display leave utilization rate as a percentage

### Requirement 3: Attendance Analytics

**User Story:** As an HR officer, I want to analyze attendance patterns, so that I can identify trends and address attendance issues.

#### Acceptance Criteria

1. WHEN the HR_Dashboard loads, THE HR_Data_Service SHALL fetch the count of late arrivals this month (late_minutes > 0) from attendance_records
2. WHEN the HR_Dashboard loads, THE HR_Data_Service SHALL fetch the count of early departures this month (early_leave_minutes > 0) from attendance_records
3. WHEN the HR_Dashboard loads, THE HR_Data_Service SHALL calculate average work hours per day from attendance_records this month
4. WHEN the HR_Dashboard loads, THE HR_Data_Service SHALL fetch attendance counts grouped by department
5. THE HR_Dashboard SHALL display late arrivals count with appropriate indicator (WARNING if > 10)
6. THE HR_Dashboard SHALL display average work hours formatted to one decimal place

### Requirement 4: Employee Lifecycle Events

**User Story:** As an HR officer, I want to track employee lifecycle events, so that I can proactively manage probation reviews, contract renewals, and anniversaries.

#### Acceptance Criteria

1. WHEN the HR_Dashboard loads, THE HR_Data_Service SHALL fetch the count of employees with probation ending within 30 days (employment_type = 'probation' AND end_date within 30 days)
2. WHEN the HR_Dashboard loads, THE HR_Data_Service SHALL fetch the count of employees with contracts due for renewal within 30 days (employment_type = 'contract' AND end_date within 30 days)
3. WHEN the HR_Dashboard loads, THE HR_Data_Service SHALL fetch the count of employees with work anniversaries this month
4. WHEN the HR_Dashboard loads, THE HR_Data_Service SHALL fetch the count of resignations/terminations this month (status IN 'resigned', 'terminated' AND updated_at this month)
5. THE HR_Dashboard SHALL display probation ending count with a WARNING indicator if count > 0
6. THE HR_Dashboard SHALL display contract renewals due count with a WARNING indicator if count > 0

### Requirement 5: Recent Activity List

**User Story:** As an HR officer, I want to see recent HR activity, so that I can quickly review and follow up on recent requests and changes.

#### Acceptance Criteria

1. THE HR_Dashboard SHALL display a Recent Leave Requests list showing employee name, leave type, status, start_date, end_date
2. THE HR_Dashboard SHALL display the 5 most recent leave requests ordered by created_at descending
3. THE HR_Dashboard SHALL display status with color-coded badges (pending=yellow, approved=green, rejected=red)
4. THE HR_Dashboard SHALL display a Recent Attendance Corrections list showing employee name, date, correction reason
5. THE HR_Dashboard SHALL display the 5 most recent attendance corrections (is_corrected = true) ordered by updated_at descending
6. THE HR_Dashboard SHALL format dates using the centralized formatDate utility from lib/utils/format.ts

### Requirement 6: Quick Actions

**User Story:** As an HR officer, I want quick access to common HR tasks, so that I can efficiently manage HR activities.

#### Acceptance Criteria

1. THE HR_Dashboard SHALL display a Quick Actions section with navigation links
2. WHEN a user clicks "Add Employee", THE HR_Dashboard SHALL navigate to /hr/employees/new
3. WHEN a user clicks "Process Payroll", THE HR_Dashboard SHALL navigate to /hr/payroll
4. WHEN a user clicks "Approve Leave", THE HR_Dashboard SHALL navigate to /hr/leave?status=pending
5. WHEN a user clicks "View Attendance", THE HR_Dashboard SHALL navigate to /hr/attendance
6. WHEN a user clicks "Generate Reports", THE HR_Dashboard SHALL navigate to /hr/reports

### Requirement 7: Data Caching

**User Story:** As a system, I want to cache dashboard data, so that page loads are fast and database queries are minimized.

#### Acceptance Criteria

1. THE HR_Data_Service SHALL use the Dashboard_Cache with a 5-minute TTL
2. WHEN cached data exists and is not expired, THE HR_Data_Service SHALL return cached data without querying the database
3. WHEN cached data is expired or missing, THE HR_Data_Service SHALL fetch fresh data and update the cache
4. THE HR_Data_Service SHALL generate cache keys using the pattern 'hr-dashboard-metrics:{role}:{date}'

### Requirement 8: Role-Based Access Control

**User Story:** As a system administrator, I want to restrict dashboard access to authorized roles, so that sensitive HR data is protected.

#### Acceptance Criteria

1. WHEN a user with role 'hr' accesses the HR_Dashboard, THE HR_Dashboard SHALL display the full dashboard
2. WHEN a user with role 'owner' or 'director' accesses the HR_Dashboard, THE HR_Dashboard SHALL display the full dashboard
3. WHEN a user with an unauthorized role accesses the HR_Dashboard, THE HR_Dashboard SHALL redirect to the default dashboard
4. IF a user is not authenticated, THEN THE HR_Dashboard SHALL redirect to the login page

### Requirement 9: Mobile Responsiveness

**User Story:** As an HR officer working remotely, I want to access the dashboard on mobile devices, so that I can monitor HR metrics from anywhere.

#### Acceptance Criteria

1. THE HR_Dashboard SHALL display metrics in a responsive grid that adapts to screen size
2. WHEN viewed on mobile devices, THE HR_Dashboard SHALL stack cards vertically for readability
3. THE HR_Dashboard SHALL maintain touch-friendly tap targets (minimum 44px) for all interactive elements
4. THE HR_Dashboard SHALL prioritize critical alerts (probation ending, contract renewals, low leave balance) at the top on mobile view

### Requirement 10: Visual Identity

**User Story:** As an HR officer, I want a consistent visual identity, so that the dashboard is recognizable and easy to navigate.

#### Acceptance Criteria

1. THE HR_Dashboard SHALL display a header with "HR Dashboard" title and Users icon
2. THE HR_Dashboard SHALL display a subtitle "Employee management and workforce analytics"
3. THE HR_Dashboard SHALL use a blue color scheme consistent with the existing HR dashboard
4. THE HR_Dashboard SHALL use consistent card styling with other role-specific dashboards
