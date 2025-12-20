# Implementation Plan: HR Basic Payroll

## Overview

This implementation plan covers the HR Basic Payroll module (v0.31) for Gama ERP. The module enables salary calculation, payroll processing, and salary slip generation. Implementation follows an incremental approach, building from database schema through utilities, server actions, and UI components.

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Create payroll_components table with default data
    - Create table with all columns (component_code, component_name, component_type, calculation_type, etc.)
    - Insert default earning components (base_salary, transport, meal, position, overtime)
    - Insert default deduction components (bpjs_kes_emp, bpjs_jht_emp, bpjs_jp_emp, pph21)
    - Insert default benefit components (bpjs_kes_com, bpjs_jht_com, bpjs_jkk, bpjs_jkm)
    - Add RLS policies for read access
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.2 Create employee_payroll_setup table
    - Create table with employee_id, component_id, custom_amount, custom_rate
    - Add unique constraint on (employee_id, component_id)
    - Add effective date range columns
    - Add indexes for employee_id
    - Add RLS policies
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.3 Create payroll_periods table
    - Create table with period_name, period_year, period_month, dates, status, totals
    - Add unique constraint on (period_year, period_month)
    - Add indexes for year/month and status
    - Add RLS policies
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 1.4 Create payroll_records table
    - Create table with period_id, employee_id, work data, earnings/deductions JSONB, totals
    - Add unique constraint on (period_id, employee_id)
    - Add indexes for period_id and employee_id
    - Add RLS policies
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.10_

  - [x] 1.5 Create salary_slips table with auto-numbering
    - Create table with payroll_record_id, slip_number, pdf_url
    - Create sequence for slip numbers
    - Create trigger function for auto-generating SLIP-YYYY-MM-NNNN format
    - Add RLS policies
    - _Requirements: 7.1, 7.5_

- [x] 2. TypeScript Types and Utility Functions
  - [x] 2.1 Create TypeScript type definitions
    - Create types/payroll.ts with PayrollComponent, PayrollPeriod, PayrollRecord interfaces
    - Add EmployeePayrollSetup, SalarySlip, PayrollComponentItem types
    - Add form data and filter types
    - _Requirements: 1.3, 3.1, 4.10_

  - [x] 2.2 Implement calculateEarnings utility function
    - Create lib/payroll-utils.ts
    - Implement function to calculate all earning components
    - Handle fixed amounts and employee overrides
    - Handle overtime calculation
    - _Requirements: 4.2, 4.5_

  - [x] 2.3 Write property test for gross salary calculation
    - **Property 1: Gross Salary Calculation**
    - **Validates: Requirements 4.5**

  - [x] 2.4 Implement calculateDeductions utility function
    - Calculate BPJS employee contributions
    - Calculate PPh 21 (simplified)
    - Handle employee-specific overrides
    - _Requirements: 4.3, 4.6_

  - [x] 2.5 Write property tests for deductions and net salary
    - **Property 2: Net Salary Calculation**
    - **Property 3: Total Deductions Calculation**
    - **Validates: Requirements 4.6, 4.7**

  - [x] 2.6 Implement calculateCompanyContributions utility function
    - Calculate BPJS company contributions
    - Calculate total company cost
    - _Requirements: 4.4, 4.8_

  - [x] 2.7 Write property test for company cost calculation
    - **Property 4: Company Cost Calculation**
    - **Validates: Requirements 4.8**

  - [x] 2.8 Implement BPJS calculation utilities
    - Implement calculateBPJS function with correct statutory rates
    - Handle different BPJS types (kesehatan, jht, jp, jkk, jkm)
    - _Requirements: 1.5, 1.6_

  - [x] 2.9 Write property tests for percentage and BPJS calculations
    - **Property 5: Percentage Component Calculation**
    - **Property 10: BPJS Calculation Accuracy**
    - **Validates: Requirements 4.9, 1.5, 1.6**

  - [x] 2.10 Implement helper utilities
    - generatePeriodName function
    - formatPayrollCurrency function
    - validatePayrollPeriod function
    - getAttendanceSummary function
    - _Requirements: 3.1, 4.1_

- [x] 3. Checkpoint - Verify utilities and database
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Server Actions - Core Operations
  - [x] 4.1 Implement getPayrollComponents and getEmployeePayrollSetup actions
    - Create app/(main)/hr/payroll/actions.ts
    - Implement getPayrollComponents to fetch active components
    - Implement getEmployeePayrollSetup for employee-specific config
    - _Requirements: 1.3, 2.1_

  - [x] 4.2 Implement updateEmployeePayrollSetup action
    - Upsert employee payroll setup
    - Handle effective dates
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 4.3 Implement createPayrollPeriod action
    - Validate period doesn't exist
    - Generate period name
    - Create period record
    - _Requirements: 3.1, 3.2_

  - [x] 4.4 Write property test for unique period constraint
    - **Property 7: Unique Period Constraint**
    - **Validates: Requirements 3.2**

  - [x] 4.5 Implement getPayrollPeriods and getPayrollPeriodWithRecords actions
    - Fetch all periods with employee counts
    - Fetch single period with all records
    - _Requirements: 8.1, 9.1, 9.2_

  - [x] 4.6 Implement calculateEmployeePayroll action
    - Get employee data and attendance summary
    - Calculate earnings, deductions, company contributions
    - Create/update payroll record
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

  - [x] 4.7 Implement calculateAllPayroll action
    - Get all active employees
    - Calculate payroll for each (skip existing)
    - Update period totals
    - Return count processed
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 4.8 Write property test for period totals accuracy
    - **Property 6: Period Totals Accuracy**
    - **Validates: Requirements 3.4**

  - [x] 4.9 Implement approvePayrollPeriod action
    - Validate period is in processing status
    - Update period status to approved
    - Update all records status to approved
    - Record approver and timestamp
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 4.10 Write property test for approved period immutability
    - **Property 8: Approved Period Immutability**
    - **Validates: Requirements 6.4**

- [x] 5. Checkpoint - Verify server actions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Server Actions - Salary Slips and Reports
  - [x] 6.1 Implement generateSalarySlip action
    - Generate unique slip number
    - Create salary slip record
    - Generate PDF (placeholder for now)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 6.2 Write property test for slip number format
    - **Property 9: Slip Number Format**
    - **Validates: Requirements 7.1**

  - [x] 6.3 Implement getManpowerCostByDepartment action
    - Aggregate payroll records by department
    - Return department costs summary
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 7. UI Components - Status and Summary
  - [x] 7.1 Create payroll-status-badge.tsx component
    - Display status with appropriate colors (draft=gray, processing=blue, approved=green, paid=purple, closed=slate)
    - _Requirements: 8.2_

  - [x] 7.2 Create payroll-summary-cards.tsx component
    - Display summary cards: Total Gross, Total Deductions, Total Net, Company Cost
    - Format currency values
    - _Requirements: 9.1_

- [x] 8. UI Components - Lists and Tables
  - [x] 8.1 Create payroll-period-list.tsx component
    - Display periods table with: period name, employee count, gross, net, status
    - Action buttons based on status
    - New period button
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 8.2 Create payroll-period-form.tsx component
    - Year/month selection
    - Pay date picker
    - Validation
    - _Requirements: 3.1_

  - [x] 8.3 Create payroll-record-table.tsx component
    - Display employee records: code, name, department, gross, deductions, net, status
    - Generate slip action button
    - _Requirements: 9.2, 9.5_

  - [x] 8.4 Create payroll-record-detail.tsx component
    - Display detailed breakdown of earnings, deductions, company contributions
    - Employee and bank details
    - _Requirements: 7.2, 7.3_

- [x] 9. UI Components - Processing View
  - [x] 9.1 Create payroll-processing-view.tsx component
    - Summary cards section
    - Employee records table
    - Calculate All button
    - Approve Period button
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 9.2 Create salary-slip-preview.tsx component
    - Preview slip content before PDF generation
    - Employee details, period, earnings, deductions, net
    - _Requirements: 7.2, 7.3, 7.4_

  - [x] 9.3 Create employee-payroll-setup.tsx component
    - List of components with custom amounts
    - Edit custom amount/rate
    - Effective date range
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 10. Checkpoint - Verify UI components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Page Routes
  - [x] 11.1 Create payroll periods list page
    - Route: /hr/payroll
    - Integrate payroll-period-list
    - New period dialog
    - _Requirements: 8.1, 8.3_

  - [x] 11.2 Create payroll processing page
    - Route: /hr/payroll/[period_id]
    - Integrate payroll-processing-view
    - Handle calculate and approve actions
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 11.3 Create employee payroll setup page
    - Route: /hr/employees/[id]/payroll
    - Integrate employee-payroll-setup
    - _Requirements: 2.1, 2.2_

- [x] 12. Navigation and Permissions
  - [x] 12.1 Add payroll to HR navigation
    - Add "Payroll" link for admin/manager/finance
    - _Requirements: 8.1_

  - [x] 12.2 Implement permission checks
    - Admin/Manager/Finance can view and process payroll
    - Only Manager can approve payroll
    - Employees can view their own salary slips
    - _Requirements: 6.1_

- [x] 13. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including property-based tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation builds incrementally: database → types → utilities → actions → components → pages
- BPJS rates are based on Indonesian statutory requirements (may need updates)
- PPh 21 calculation is simplified; full implementation may require tax bracket logic

