# Requirements Document

## Introduction

This document defines the requirements for the HR Manpower Cost Tracking module (v0.32) in Gama ERP. The module provides labor cost analysis by department for overhead allocation purposes. It aggregates payroll data into a materialized summary table and presents it through a dashboard with visualizations and export capabilities.

## Glossary

- **Manpower_Cost_System**: The module responsible for tracking, summarizing, and analyzing labor costs by department
- **Manpower_Cost_Summary**: A materialized table storing aggregated payroll costs per department per period
- **Department**: An organizational unit that employees belong to (e.g., Operations, Finance, Marketing)
- **Period**: A specific month and year for which costs are calculated (e.g., December 2025)
- **Total_Company_Cost**: The full cost of an employee to the company (gross salary + company contributions like BPJS)
- **Cost_Per_Employee**: Average total company cost divided by employee count in a department
- **Overhead_Allocation**: The process of distributing indirect costs (like manpower) to cost centers or projects

## Requirements

### Requirement 1: Manpower Cost Summary Table

**User Story:** As a system administrator, I want manpower costs to be stored in a summary table, so that queries for cost analysis are fast and efficient.

#### Acceptance Criteria

1. THE Manpower_Cost_System SHALL create a manpower_cost_summary table with columns: id, department_id, period_year, period_month, employee_count, total_base_salary, total_allowances, total_overtime, total_gross, total_deductions, total_net, total_company_contributions, total_company_cost, avg_salary, cost_per_employee, calculated_at, created_at
2. THE Manpower_Cost_System SHALL enforce a unique constraint on (department_id, period_year, period_month)
3. THE Manpower_Cost_System SHALL create indexes on (period_year, period_month) and (department_id) for query performance

### Requirement 2: Automatic Summary Refresh

**User Story:** As an HR administrator, I want manpower cost summaries to be automatically calculated from payroll data, so that I always have accurate cost information.

#### Acceptance Criteria

1. THE Manpower_Cost_System SHALL provide a refresh_manpower_cost_summary function that accepts year and month parameters
2. WHEN the refresh function is called, THE Manpower_Cost_System SHALL delete existing summary records for the specified period
3. WHEN the refresh function is called, THE Manpower_Cost_System SHALL aggregate payroll_records data grouped by department
4. THE Manpower_Cost_System SHALL calculate employee_count as the count of distinct employees per department
5. THE Manpower_Cost_System SHALL calculate total_gross as the sum of gross_salary from payroll_records
6. THE Manpower_Cost_System SHALL calculate total_deductions as the sum of total_deductions from payroll_records
7. THE Manpower_Cost_System SHALL calculate total_net as the sum of net_salary from payroll_records
8. THE Manpower_Cost_System SHALL calculate total_company_cost as the sum of total_company_cost from payroll_records
9. THE Manpower_Cost_System SHALL calculate avg_salary as total_gross divided by employee_count
10. THE Manpower_Cost_System SHALL calculate cost_per_employee as total_company_cost divided by employee_count
11. THE Manpower_Cost_System SHALL record calculated_at timestamp when summary is refreshed

### Requirement 3: Manpower Cost Dashboard

**User Story:** As a finance manager, I want to view a dashboard showing manpower costs by department, so that I can analyze labor expenses and plan budgets.

#### Acceptance Criteria

1. THE Manpower_Cost_System SHALL display a dashboard at route /hr/manpower-cost
2. THE Manpower_Cost_System SHALL provide a period selector to choose year and month
3. THE Manpower_Cost_System SHALL display the total company manpower cost prominently at the top
4. THE Manpower_Cost_System SHALL display a department breakdown table with columns: Department, Staff Count, Base Salary, Benefits (allowances + company contributions), Total Cost, Avg/Employee
5. THE Manpower_Cost_System SHALL display a total row summing all departments
6. THE Manpower_Cost_System SHALL format all monetary values in Indonesian Rupiah (Rp)

### Requirement 4: Cost Distribution Visualization

**User Story:** As a finance manager, I want to see visual charts of cost distribution, so that I can quickly understand how labor costs are allocated across departments.

#### Acceptance Criteria

1. THE Manpower_Cost_System SHALL display a horizontal bar chart showing cost percentage by department
2. THE Manpower_Cost_System SHALL calculate percentage as (department_total_cost / company_total_cost) * 100
3. THE Manpower_Cost_System SHALL display department name and percentage label on each bar
4. THE Manpower_Cost_System SHALL order departments by cost percentage descending

### Requirement 5: Cost Trend Analysis

**User Story:** As a finance manager, I want to see manpower cost trends over time, so that I can identify patterns and forecast future expenses.

#### Acceptance Criteria

1. THE Manpower_Cost_System SHALL display a line chart showing total company cost for the last 6 months
2. THE Manpower_Cost_System SHALL label the x-axis with month abbreviations (Jul, Aug, Sep, etc.)
3. THE Manpower_Cost_System SHALL label the y-axis with cost values in millions (e.g., 180M, 200M)
4. THE Manpower_Cost_System SHALL handle periods with no data gracefully (show zero or skip)

### Requirement 6: Export to Excel

**User Story:** As a finance manager, I want to export manpower cost data to Excel, so that I can perform additional analysis and share reports.

#### Acceptance Criteria

1. THE Manpower_Cost_System SHALL provide an "Export to Excel" button on the dashboard
2. WHEN the export button is clicked, THE Manpower_Cost_System SHALL generate an Excel file containing the department breakdown data
3. THE Excel file SHALL include columns: Department, Employee Count, Base Salary, Allowances, Overtime, Gross Salary, Deductions, Net Salary, Company Contributions, Total Company Cost, Avg Salary, Cost Per Employee
4. THE Excel file SHALL include a total row at the bottom
5. THE Excel file SHALL be named "manpower-cost-{year}-{month}.xlsx"

### Requirement 7: Overhead Allocation Integration

**User Story:** As a finance manager, I want manpower cost data to be available for overhead allocation, so that labor costs can be distributed to projects and cost centers.

#### Acceptance Criteria

1. THE Manpower_Cost_System SHALL provide a function to get manpower cost summary by department for a given period
2. THE Manpower_Cost_System SHALL return data in a format suitable for overhead allocation calculations
3. THE Manpower_Cost_System SHALL include department_id for linking to overhead allocation rules

### Requirement 8: Access Control

**User Story:** As a system administrator, I want manpower cost data to be restricted to authorized users, so that sensitive salary information is protected.

#### Acceptance Criteria

1. THE Manpower_Cost_System SHALL restrict dashboard access to users with 'finance', 'manager', or 'super_admin' roles
2. THE Manpower_Cost_System SHALL restrict export functionality to users with 'finance' or 'super_admin' roles
3. THE Manpower_Cost_System SHALL apply Row Level Security (RLS) policies to the manpower_cost_summary table
