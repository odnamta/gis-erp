# Implementation Plan: HR Manpower Cost Tracking

## Overview

This implementation plan covers the HR Manpower Cost Tracking module (v0.32) which provides labor cost analysis by department. The implementation follows a database-first approach, then utilities, server actions, and finally UI components.

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Create manpower_cost_summary table with all columns
    - Create table with: id, department_id, period_year, period_month, employee_count, total_base_salary, total_allowances, total_overtime, total_gross, total_deductions, total_net, total_company_contributions, total_company_cost, avg_salary, cost_per_employee, calculated_at, created_at
    - Add unique constraint on (department_id, period_year, period_month)
    - Add foreign key to departments table
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 Create indexes for query performance
    - Create index on (period_year, period_month)
    - Create index on (department_id)
    - _Requirements: 1.3_
  - [x] 1.3 Create refresh_manpower_cost_summary SQL function
    - Function accepts year and month parameters
    - Deletes existing records for the period
    - Aggregates payroll_records data grouped by department
    - Calculates all summary fields including averages
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_
  - [x] 1.4 Create RLS policies for manpower_cost_summary
    - Enable RLS on table
    - Create SELECT policy for finance, manager, super_admin roles
    - Create ALL policy for super_admin only
    - _Requirements: 8.1, 8.3_

- [x] 2. TypeScript Types and Utility Functions
  - [x] 2.1 Create TypeScript interfaces in types/manpower-cost.ts
    - ManpowerCostSummary interface
    - ManpowerCostWithDepartment interface
    - ManpowerCostTotals interface
    - DepartmentCostPercentage interface
    - ManpowerCostTrendPoint interface
    - ManpowerCostExportRow interface
    - ManpowerCostFilters interface
    - _Requirements: 1.1, 3.4, 4.1, 5.1, 6.3_
  - [x] 2.2 Implement utility functions in lib/manpower-cost-utils.ts
    - calculatePercentage function
    - formatManpowerCurrency function
    - generateExportFilename function
    - sortByTotalCostDesc function
    - calculateTotalRow function
    - getMonthAbbreviation function
    - formatChartAxisValue function
    - validatePeriod function
    - getLastNMonths function
    - _Requirements: 3.5, 3.6, 4.2, 4.4, 5.2, 5.3, 6.5_
  - [x] 2.3 Write property tests for utility functions
    - **Property 5: Total Row Calculation**
    - **Property 6: Percentage Calculation**
    - **Property 7: Department Ordering**
    - **Property 8: Currency Formatting**
    - **Property 9: Export Filename Format**
    - **Validates: Requirements 3.5, 3.6, 4.2, 4.4, 6.5**

- [x] 3. Checkpoint - Verify database and utilities
  - Ensure database migration applied successfully
  - Ensure all utility tests pass
  - Ask the user if questions arise

- [x] 4. Server Actions
  - [x] 4.1 Create server actions file at app/(main)/hr/manpower-cost/actions.ts
    - refreshManpowerCostSummary action
    - getManpowerCostSummary action
    - getTotalCompanyCost action
    - getCostTrendData action
    - getDepartmentCostPercentages action
    - getManpowerCostForOverhead action
    - _Requirements: 2.1, 3.2, 4.1, 5.1, 7.1, 7.2, 7.3_
  - [x] 4.2 Implement Excel export action
    - exportManpowerCostToExcel action
    - Generate Excel file with all columns
    - Include total row at bottom
    - Return proper filename
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 4.3 Add role-based access control to actions
    - Check user role before returning data
    - Restrict export to finance and super_admin
    - _Requirements: 8.1, 8.2_
  - [x] 4.4 Write unit tests for server actions
    - Test data retrieval functions
    - Test export functionality
    - Test access control
    - _Requirements: 2.1, 6.2, 8.1, 8.2_

- [x] 5. UI Components - Dashboard Structure
  - [x] 5.1 Create manpower cost page at app/(main)/hr/manpower-cost/page.tsx
    - Server component that fetches initial data
    - Pass data to client dashboard component
    - _Requirements: 3.1_
  - [x] 5.2 Create ManpowerCostDashboard component
    - Main container component
    - Manages period state (year/month)
    - Coordinates data fetching for child components
    - _Requirements: 3.1, 3.2_
  - [x] 5.3 Create ManpowerCostHeader component
    - Period selector (year and month dropdowns)
    - Export to Excel button
    - Refresh data button
    - _Requirements: 3.2, 6.1_
  - [x] 5.4 Create ManpowerCostSummaryCard component
    - Display total company manpower cost prominently
    - Format in Indonesian Rupiah
    - _Requirements: 3.3, 3.6_

- [x] 6. UI Components - Data Display
  - [x] 6.1 Create DepartmentBreakdownTable component
    - Table with columns: Department, Staff Count, Base Salary, Benefits, Total Cost, Avg/Employee
    - Total row at bottom summing all departments
    - Format all monetary values in Rupiah
    - _Requirements: 3.4, 3.5, 3.6_
  - [x] 6.2 Create CostDistributionChart component
    - Horizontal bar chart showing cost percentage by department
    - Display department name and percentage on each bar
    - Order departments by percentage descending
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 6.3 Create CostTrendChart component
    - Line chart showing last 6 months of total company cost
    - X-axis with month abbreviations
    - Y-axis with values in millions
    - Handle missing data gracefully
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 6.4 Create barrel export in components/manpower-cost/index.ts
    - Export all components
    - _Requirements: N/A (code organization)_

- [x] 7. Checkpoint - Verify UI components
  - Ensure dashboard renders correctly
  - Ensure charts display properly
  - Ensure export works
  - Ask the user if questions arise

- [x] 8. Navigation and Integration
  - [x] 8.1 Add manpower cost link to HR navigation
    - Add link in sidebar under HR section
    - Use appropriate icon (e.g., DollarSign or PieChart)
    - _Requirements: 3.1_
  - [x] 8.2 Add permission check for navigation item
    - Only show to finance, manager, super_admin roles
    - _Requirements: 8.1_
  - [x] 8.3 Integrate with overhead allocation module
    - Ensure getManpowerCostForOverhead returns correct format
    - Test integration with existing overhead allocation
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 9. Final Checkpoint
  - Ensure all tests pass
  - Verify dashboard with real payroll data
  - Test export functionality
  - Verify role-based access control
  - Ask the user if questions arise

## Notes

- All tasks including tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- This module depends on v0.31 HR Basic Payroll being complete
