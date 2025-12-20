# Requirements Document

## Introduction

This document defines the requirements for the HR Basic Payroll module (v0.31) in Gama ERP. The module enables salary calculation, payroll processing, and salary slip generation for employees. It integrates with the attendance system to calculate work days and supports Indonesian statutory deductions (BPJS, PPh 21).

## Glossary

- **Payroll_System**: The module responsible for calculating salaries, managing payroll periods, and generating salary slips
- **Payroll_Component**: A type of earning, deduction, or company benefit (e.g., base salary, transport allowance, BPJS)
- **Payroll_Period**: A monthly period for which payroll is processed (e.g., December 2025)
- **Payroll_Record**: An individual employee's calculated salary for a specific period
- **Salary_Slip**: A PDF document showing an employee's earnings and deductions for a period
- **Employee_Payroll_Setup**: Custom payroll component overrides for specific employees
- **BPJS**: Indonesian social security (Kesehatan for health, JHT/JP/JKK/JKM for employment)
- **PPh_21**: Indonesian income tax withheld from employee salaries

## Requirements

### Requirement 1: Payroll Components Configuration

**User Story:** As an HR administrator, I want to configure different payroll components (earnings, deductions, benefits), so that the system can calculate salaries correctly based on company policies.

#### Acceptance Criteria

1. THE Payroll_System SHALL support three component types: 'earning', 'deduction', and 'benefit' (company contribution)
2. THE Payroll_System SHALL support three calculation types: 'fixed' (fixed amount), 'percentage' (percentage of base/gross), and 'formula' (custom calculation)
3. WHEN a component is configured, THE Payroll_System SHALL store: component_code, component_name, component_type, calculation_type, percentage_of, percentage_rate, default_amount, is_taxable, is_mandatory, and display_order
4. THE Payroll_System SHALL include default earning components: Base Salary, Transport Allowance, Meal Allowance, Position Allowance, Overtime Pay
5. THE Payroll_System SHALL include default deduction components: BPJS Kesehatan (Employee), BPJS JHT (Employee 2%), BPJS JP (Employee 1%), PPh 21
6. THE Payroll_System SHALL include default benefit components: BPJS Kesehatan (Company), BPJS JHT (Company 3.7%), BPJS JKK, BPJS JKM

### Requirement 2: Employee Payroll Setup

**User Story:** As an HR administrator, I want to configure custom payroll amounts for specific employees, so that I can handle individual salary structures and allowances.

#### Acceptance Criteria

1. THE Payroll_System SHALL allow overriding default component amounts for individual employees
2. WHEN an employee has a custom setup, THE Payroll_System SHALL use the custom_amount or custom_rate instead of the default
3. THE Payroll_System SHALL support effective date ranges for employee payroll setups
4. THE Payroll_System SHALL use the employee's base_salary from the employees table as the default base salary

### Requirement 3: Payroll Period Management

**User Story:** As an HR administrator, I want to create and manage monthly payroll periods, so that I can process salaries on a regular schedule.

#### Acceptance Criteria

1. THE Payroll_System SHALL support creating payroll periods with: period_name, period_year, period_month, start_date, end_date, pay_date
2. THE Payroll_System SHALL enforce unique periods per year/month combination
3. THE Payroll_System SHALL track period status: 'draft', 'processing', 'approved', 'paid', 'closed'
4. THE Payroll_System SHALL calculate and store period totals: total_gross, total_deductions, total_net, total_company_cost
5. THE Payroll_System SHALL record who processed and approved each period with timestamps

### Requirement 4: Payroll Calculation

**User Story:** As an HR administrator, I want to calculate employee salaries based on attendance and configured components, so that employees are paid accurately.

#### Acceptance Criteria

1. WHEN calculating payroll, THE Payroll_System SHALL retrieve work data from attendance: work_days, present_days, absent_days, leave_days, overtime_hours
2. WHEN calculating payroll, THE Payroll_System SHALL apply all active earning components for the employee
3. WHEN calculating payroll, THE Payroll_System SHALL apply all active deduction components for the employee
4. WHEN calculating payroll, THE Payroll_System SHALL calculate company contributions (benefits) separately
5. THE Payroll_System SHALL calculate gross_salary as the sum of all earnings
6. THE Payroll_System SHALL calculate total_deductions as the sum of all deductions
7. THE Payroll_System SHALL calculate net_salary as gross_salary minus total_deductions
8. THE Payroll_System SHALL calculate total_company_cost as gross_salary plus company contributions
9. WHEN a percentage-based component is calculated, THE Payroll_System SHALL apply the percentage to the specified base (base_salary or gross_salary)
10. THE Payroll_System SHALL store earnings, deductions, and company_contributions as JSONB arrays with component details

### Requirement 5: Batch Payroll Processing

**User Story:** As an HR administrator, I want to calculate payroll for all employees at once, so that I can efficiently process monthly salaries.

#### Acceptance Criteria

1. THE Payroll_System SHALL provide a "Calculate All" function to process all active employees for a period
2. WHEN calculating all, THE Payroll_System SHALL skip employees who already have a calculated record for the period
3. WHEN calculating all, THE Payroll_System SHALL update period totals after completion
4. THE Payroll_System SHALL return the count of employees processed

### Requirement 6: Payroll Approval Workflow

**User Story:** As a manager, I want to review and approve payroll before payment, so that I can ensure accuracy and authorization.

#### Acceptance Criteria

1. THE Payroll_System SHALL require approval before a period can be marked as 'paid'
2. WHEN a period is approved, THE Payroll_System SHALL record the approver and timestamp
3. WHEN a period is approved, THE Payroll_System SHALL update all payroll records status to 'approved'
4. THE Payroll_System SHALL NOT allow modifications to approved periods

### Requirement 7: Salary Slip Generation

**User Story:** As an employee, I want to receive a salary slip showing my earnings and deductions, so that I can understand my compensation.

#### Acceptance Criteria

1. THE Payroll_System SHALL generate salary slips with unique slip numbers in format SLIP-YYYY-MM-NNNN
2. THE Salary_Slip SHALL display: employee details, period, earnings breakdown, deductions breakdown, net salary
3. THE Salary_Slip SHALL display company contributions for transparency
4. THE Salary_Slip SHALL be generated as a PDF document
5. THE Payroll_System SHALL store the PDF URL for each generated slip

### Requirement 8: Payroll Periods List View

**User Story:** As an HR administrator, I want to view all payroll periods with summary information, so that I can manage payroll processing efficiently.

#### Acceptance Criteria

1. THE Payroll_System SHALL display periods with: period name, employee count, gross total, net total, status
2. THE Payroll_System SHALL show action buttons based on status: Process (draft), View (closed)
3. THE Payroll_System SHALL allow creating new periods
4. THE Payroll_System SHALL order periods by year and month descending

### Requirement 9: Payroll Processing View

**User Story:** As an HR administrator, I want to view and manage individual employee payroll records within a period, so that I can review and adjust calculations.

#### Acceptance Criteria

1. THE Payroll_System SHALL display summary cards: Total Gross, Total Deductions, Total Net, Company Cost
2. THE Payroll_System SHALL display a table of all employees with: code, name, department, gross, deductions, net, status
3. THE Payroll_System SHALL provide a "Calculate All" button for batch processing
4. THE Payroll_System SHALL provide an "Approve Period" button for authorization
5. THE Payroll_System SHALL provide a "Generate Slip" action for each employee record

### Requirement 10: Manpower Cost Reporting

**User Story:** As a finance manager, I want to view manpower costs by department, so that I can analyze labor expenses and budget accordingly.

#### Acceptance Criteria

1. THE Payroll_System SHALL provide a function to get manpower cost by department for a given period
2. THE Payroll_System SHALL return: department name, employee count, total gross, total net, total company cost
3. THE Payroll_System SHALL support filtering by year and month

