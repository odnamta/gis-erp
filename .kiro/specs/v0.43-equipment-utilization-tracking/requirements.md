# Requirements Document

## Introduction

This document defines the requirements for the Equipment Utilization Tracking feature (v0.43) in Gama ERP. This feature enables tracking of equipment utilization including job assignments, operating hours/kilometers, and idle time to understand asset productivity and optimize fleet management.

## Glossary

- **Asset**: A piece of equipment (truck, crane, forklift, etc.) owned or managed by the company
- **Assignment**: The allocation of an asset to a job order, project, employee, or location for a specific period
- **Daily_Log**: A record of an asset's status, meter readings, and fuel consumption for a single day
- **Utilization_Rate**: The percentage of time an asset is actively operating versus total available time
- **Meter_Reading**: Odometer (km) or hour meter reading for tracking usage
- **Availability_Status**: Whether an asset is available, assigned, or unavailable for new assignments

## Requirements

### Requirement 1: Asset Assignment Management

**User Story:** As an operations manager, I want to assign assets to job orders, so that I can track which equipment is being used for each job and ensure proper resource allocation.

#### Acceptance Criteria

1. WHEN an operations user selects an available asset, THE System SHALL display an assignment form with options for job order, project, employee, or location assignment types
2. WHEN assigning an asset to a job order, THE System SHALL validate that the asset status is 'active' and not already assigned
3. WHEN a conflicting assignment exists (asset already assigned without end date), THE System SHALL prevent the new assignment and display an error message
4. WHEN an assignment is created, THE System SHALL record the start date, optional end date, and initial meter readings (km and hours)
5. WHEN an assignment is created, THE System SHALL update the asset's assigned_to_job_id field
6. WHEN completing an assignment, THE System SHALL record the end date and final meter readings
7. WHEN completing an assignment, THE System SHALL calculate km_used and hours_used from start and end readings
8. WHEN completing an assignment, THE System SHALL clear the asset's assigned_to_job_id field

### Requirement 2: Daily Utilization Logging

**User Story:** As an operations staff member, I want to log daily equipment status and readings, so that we can track detailed utilization patterns and fuel consumption.

#### Acceptance Criteria

1. WHEN logging daily utilization, THE System SHALL allow selection of status: operating, idle, maintenance, repair, or standby
2. WHEN logging daily utilization, THE System SHALL record start and end odometer readings for the day
3. WHEN logging daily utilization, THE System SHALL record start and end hour meter readings for the day
4. WHEN logging daily utilization, THE System SHALL optionally record fuel consumption (liters and cost)
5. WHEN logging daily utilization, THE System SHALL optionally record operator name or employee reference
6. WHEN a daily log is saved, THE System SHALL calculate km_today and hours_today from the readings
7. WHEN a daily log is saved with end_km, THE System SHALL update the asset's current_units field
8. IF a daily log already exists for the same asset and date, THEN THE System SHALL update the existing record (upsert behavior)

### Requirement 3: Utilization Dashboard

**User Story:** As a manager, I want to view a utilization dashboard, so that I can monitor fleet productivity and identify underutilized assets.

#### Acceptance Criteria

1. WHEN viewing the utilization dashboard, THE System SHALL display summary cards showing average utilization rate, operating count, idle count, and maintenance count
2. WHEN viewing the utilization dashboard, THE System SHALL display a table of all assets with their utilization metrics for the selected period
3. WHEN displaying asset utilization, THE System SHALL show operating days, idle days, and calculated utilization rate percentage
4. WHEN displaying asset utilization, THE System SHALL show a visual progress bar representing the utilization rate
5. WHEN displaying asset utilization, THE System SHALL categorize utilization as High (≥75%), Normal (50-74%), Low (25-49%), or Very Low (<25%)
6. WHEN viewing the utilization dashboard, THE System SHALL display a trend chart showing utilization over the past 6 months
7. WHEN a month filter is selected, THE System SHALL refresh all metrics for the selected month

### Requirement 4: Asset Availability View

**User Story:** As an operations planner, I want to see which assets are available for assignment, so that I can quickly allocate equipment to new jobs.

#### Acceptance Criteria

1. WHEN viewing asset availability, THE System SHALL display all assets with their availability status (available, assigned, unavailable)
2. WHEN an asset has status other than 'active', THE System SHALL show availability_status as 'unavailable'
3. WHEN an asset has an open assignment (no end date), THE System SHALL show availability_status as 'assigned'
4. WHEN an asset is active with no open assignments, THE System SHALL show availability_status as 'available'
5. WHEN an asset is assigned, THE System SHALL display the current job order number
6. WHEN filtering by category, THE System SHALL show only assets in the selected category
7. WHEN clicking an available asset, THE System SHALL provide a quick-assign action

### Requirement 5: Utilization Reporting

**User Story:** As a finance manager, I want to generate utilization reports, so that I can analyze asset productivity and fuel efficiency for cost optimization.

#### Acceptance Criteria

1. WHEN generating a monthly utilization report, THE System SHALL include operating days, idle days, maintenance days, and utilization rate per asset
2. WHEN generating a monthly utilization report, THE System SHALL include total kilometers and hours per asset
3. WHEN generating a monthly utilization report, THE System SHALL include total fuel consumption and cost per asset
4. WHEN generating a monthly utilization report, THE System SHALL calculate fuel efficiency (km per liter) where applicable
5. WHEN exporting the report, THE System SHALL generate an Excel file with all utilization data
6. THE System SHALL provide a materialized view for efficient monthly aggregation queries

### Requirement 6: Database Schema

**User Story:** As a system administrator, I want proper database tables and views for utilization tracking, so that data is stored efficiently and queries perform well.

#### Acceptance Criteria

1. THE System SHALL create an asset_assignments table with fields for asset_id, assignment_type, job_order_id, project_id, employee_id, location_id, assigned_from, assigned_to, start/end meter readings, and calculated usage
2. THE System SHALL create an asset_daily_logs table with fields for asset_id, log_date, status, meter readings, fuel data, and operator information
3. THE System SHALL enforce a unique constraint on asset_daily_logs for (asset_id, log_date)
4. THE System SHALL create computed columns for km_used, hours_used, km_today, and hours_today
5. THE System SHALL create a materialized view asset_utilization_monthly for aggregated monthly statistics
6. THE System SHALL create a view current_asset_assignments showing active assignments with asset and job details
7. THE System SHALL create a view asset_availability showing availability status for all non-disposed assets
8. THE System SHALL create appropriate indexes for efficient querying on asset_id, job_order_id, dates, and log_date
