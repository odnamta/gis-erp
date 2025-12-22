# Implementation Plan: Equipment Utilization Tracking

## Overview

This implementation plan breaks down the Equipment Utilization Tracking feature (v0.43) into discrete coding tasks. The plan follows an incremental approach, building from database schema through utility functions, server actions, and UI components.

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Create asset_assignments table with all fields and computed columns
    - Create table with asset_id, assignment_type, job_order_id, project_id, employee_id, location_id
    - Add assigned_from, assigned_to, start/end meter readings
    - Add computed columns km_used and hours_used
    - Create indexes for asset_id, job_order_id, and period
    - _Requirements: 6.1, 6.8_
  - [x] 1.2 Create asset_daily_logs table with unique constraint
    - Create table with asset_id, log_date, status, meter readings, fuel data
    - Add computed columns km_today and hours_today
    - Add UNIQUE constraint on (asset_id, log_date)
    - Create indexes for asset_id and log_date
    - _Requirements: 6.2, 6.3, 6.4, 6.8_
  - [x] 1.3 Create materialized view and database views
    - Create asset_utilization_monthly materialized view with aggregations
    - Create refresh_asset_utilization function
    - Create current_asset_assignments view
    - Create asset_availability view
    - _Requirements: 6.5, 6.6, 6.7_

- [x] 2. TypeScript Types and Utility Functions
  - [x] 2.1 Create utilization types file
    - Define AssignmentType, DailyLogStatus, UtilizationCategory, AvailabilityStatus types
    - Define AssetAssignment, AssetDailyLog, UtilizationSummary interfaces
    - Define AssetAvailability, UtilizationDashboardStats interfaces
    - Define row types and input types
    - _Requirements: 1.1, 2.1_
  - [x] 2.2 Create utilization utility functions
    - Implement getUtilizationCategory and getUtilizationCategoryLabel
    - Implement calculateKmUsed, calculateHoursUsed, calculateFuelEfficiency
    - Implement calculateUtilizationRate
    - Implement deriveAvailabilityStatus and validateAssignment
    - Implement transform functions for database rows
    - Implement calculateDashboardStats
    - _Requirements: 1.2, 1.3, 1.7, 2.6, 3.3, 3.5, 4.2, 4.3, 4.4, 5.4_
  - [x] 2.3 Write property tests for utilization utility functions
    - **Property 1: Assignment Validation**
    - **Property 2: Usage Calculation Consistency**
    - **Property 3: Availability Status Derivation**
    - **Property 4: Utilization Category Classification**
    - **Property 6: Utilization Rate Calculation**
    - **Property 7: Fuel Efficiency Calculation**
    - **Property 10: Valid Status Values**
    - **Validates: Requirements 1.2, 1.3, 1.7, 2.1, 2.6, 3.3, 3.5, 4.2, 4.3, 4.4, 5.4**

- [x] 3. Server Actions for Assignment Management
  - [x] 3.1 Create utilization server actions file
    - Implement assignAssetToJob function with validation
    - Implement completeAssignment function
    - Implement getAssetAssignments function
    - Implement getCurrentAssignments function
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  - [x] 3.2 Write unit tests for assignment actions
    - Test assignment creation with valid data
    - Test assignment rejection for inactive assets
    - Test assignment rejection for already assigned assets
    - Test assignment completion with meter readings
    - _Requirements: 1.2, 1.3, 1.6, 1.7_

- [x] 4. Server Actions for Daily Logging
  - [x] 4.1 Implement daily log server actions
    - Implement logDailyUtilization function with upsert behavior
    - Implement getDailyLogs function
    - Implement updateAssetOdometer helper
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  - [x] 4.2 Write property test for daily log upsert
    - **Property 5: Daily Log Upsert Behavior**
    - **Validates: Requirements 2.8**

- [x] 5. Server Actions for Utilization Data
  - [x] 5.1 Implement utilization query functions
    - Implement getUtilizationSummary function for monthly data
    - Implement getAvailableAssets function with category filter
    - Implement getUtilizationTrend function for 6-month trend
    - Implement refreshUtilizationView function
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 4.1, 4.6, 5.1, 5.2, 5.3_
  - [x] 5.2 Write property test for category filter
    - **Property 8: Category Filter Correctness**
    - **Validates: Requirements 4.6**
  - [x] 5.3 Write property test for monthly aggregation
    - **Property 9: Monthly Report Aggregation**
    - **Validates: Requirements 5.2**

- [x] 6. Checkpoint - Core Logic Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. UI Components - Summary and Dashboard
  - [x] 7.1 Create utilization summary cards component
    - Display average utilization rate, operating count, idle count, maintenance count
    - Use existing Card component pattern from dashboard
    - _Requirements: 3.1_
  - [x] 7.2 Create utilization table component
    - Display asset list with utilization metrics
    - Show progress bar for utilization rate
    - Show utilization category badge (High/Normal/Low/Very Low)
    - _Requirements: 3.2, 3.3, 3.4, 3.5_
  - [x] 7.3 Create utilization trend chart component
    - Display 6-month utilization trend line chart
    - Use recharts library (already in project)
    - _Requirements: 3.6_
  - [x] 7.4 Create utilization dashboard page
    - Combine summary cards, table, and chart
    - Add month filter selector
    - Add export button
    - Route: /equipment/utilization
    - _Requirements: 3.1, 3.2, 3.7_

- [-] 8. UI Components - Assignment Management
  - [x] 8.1 Create assignment form component
    - Assignment type selector (job order, project, employee, location)
    - Job order combobox with search
    - Date pickers for start/end dates
    - Meter reading inputs
    - _Requirements: 1.1, 1.4_
  - [x] 8.2 Create assignment list component
    - Display current assignments with asset and job details
    - Show km/hours used for completed assignments
    - Add complete assignment action
    - _Requirements: 1.6, 1.7_
  - [x] 8.3 Create asset assignment page
    - Route: /equipment/[id]/assign
    - Show asset details header
    - Display assignment form
    - _Requirements: 1.1_

- [x] 9. UI Components - Daily Logging
  - [x] 9.1 Create daily log form component
    - Status selector dropdown
    - Date picker
    - Meter reading inputs (start/end km, start/end hours)
    - Fuel consumption inputs (liters, cost)
    - Operator name/employee selector
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 9.2 Create daily log table component
    - Display logs with date, status, km, hours, fuel
    - Filter by date range
    - _Requirements: 2.1_
  - [x] 9.3 Create asset daily logs page
    - Route: /equipment/[id]/logs
    - Show asset details header
    - Display log form and table
    - _Requirements: 2.1_

- [x] 10. UI Components - Availability View
  - [x] 10.1 Create availability list component
    - Display assets with availability status badge
    - Show current job for assigned assets
    - Category filter dropdown
    - Quick-assign button for available assets
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  - [x] 10.2 Integrate availability into equipment pages
    - Add availability tab/section to equipment list
    - Link quick-assign to assignment form
    - _Requirements: 4.7_

- [x] 11. Export Functionality
  - [x] 11.1 Implement Excel export for utilization report
    - Export monthly utilization data to Excel
    - Include all metrics: days, km, hours, fuel, efficiency
    - Use existing export pattern from reports module
    - _Requirements: 5.5_

- [x] 12. Checkpoint - Feature Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Navigation and Integration
  - [x] 13.1 Add utilization routes to navigation
    - Add "Utilization" link under Equipment menu
    - Add breadcrumbs for utilization pages
    - _Requirements: 3.1_
  - [x] 13.2 Update equipment detail page
    - Add links to assignment and daily logs pages
    - Show current assignment status
    - _Requirements: 1.1, 2.1_

- [x] 14. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all acceptance criteria are met

## Notes

- All tasks including property tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation builds on existing Equipment Asset Registry (v0.41) and Maintenance Tracking (v0.42) modules
