# Implementation Plan: v0.45 Equipment - Job Integration

## Overview

This implementation plan covers the integration of equipment assignment with job orders, enabling tracking of equipment usage per job and calculating equipment costs. The implementation follows an incremental approach, building from database schema through utility functions, server actions, and finally UI components.

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Create job_equipment_usage table with all columns and constraints
    - Create table with foreign keys to job_orders and assets
    - Add generated columns for usage_days, km_used, hours_used, total_cost
    - Add unique constraint on (job_order_id, asset_id, usage_start)
    - _Requirements: 1.1, 1.4, 1.5, 2.5, 8.6_
  - [x] 1.2 Create equipment_rates table
    - Create table with asset_id and category_id references
    - Add rate_type, rate_amount, effective dates
    - Add includes_operator and includes_fuel flags
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_
  - [x] 1.3 Add equipment_cost column to job_orders table
    - Alter job_orders to add equipment_cost column
    - _Requirements: 2.6_
  - [x] 1.4 Create indexes for performance
    - Index on job_equipment_usage(job_order_id)
    - Index on job_equipment_usage(asset_id)
    - Index on equipment_rates(asset_id)
    - Index on equipment_rates(category_id)
    - _Requirements: 6.1_
  - [x] 1.5 Insert default equipment rates
    - Insert default daily rates for TRUCK, TRAILER, CRANE categories
    - _Requirements: 3.2_

- [x] 2. TypeScript Types and Interfaces
  - [x] 2.1 Create types/job-equipment.ts with all interfaces
    - Define JobEquipmentUsage, EquipmentRate, JobEquipmentSummary
    - Define input types: AddEquipmentInput, CompleteEquipmentUsageInput
    - Define row types and transform functions
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2_

- [x] 3. Core Utility Functions
  - [x] 3.1 Create lib/job-equipment-utils.ts with calculation functions
    - Implement calculateUsageDays function
    - Implement calculateMeterUsage function
    - Implement calculateDepreciationCost function
    - Implement calculateTotalCost function
    - Implement calculateBillingAmount function
    - Implement calculateEquipmentMargin function
    - _Requirements: 1.4, 1.5, 2.1, 2.5, 4.1, 4.2, 4.3, 7.3, 7.4_
  - [x] 3.2 Write property test for usage days calculation
    - **Property 1: Usage Days Calculation**
    - **Validates: Requirements 1.4**
  - [x] 3.3 Write property test for meter usage calculation
    - **Property 2: Meter Usage Calculation**
    - **Validates: Requirements 1.5**
  - [x] 3.4 Write property test for depreciation cost calculation
    - **Property 3: Depreciation Cost Calculation**
    - **Validates: Requirements 2.1**
  - [x] 3.5 Write property test for total cost calculation
    - **Property 4: Total Cost Calculation**
    - **Validates: Requirements 2.5**
  - [x] 3.6 Write property test for billing calculation
    - **Property 6: Billing Calculation by Rate Type**
    - **Validates: Requirements 4.1, 4.2, 4.3**
  - [x] 3.7 Write property test for margin calculation
    - **Property 7: Equipment Margin Calculation**
    - **Validates: Requirements 7.3, 7.4_

- [x] 4. Validation Functions
  - [x] 4.1 Implement validation functions in lib/job-equipment-utils.ts
    - Implement validateEquipmentUsageInput function
    - Implement validateMeterReadings function
    - Implement validateUsageDates function
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 4.2 Write property test for meter reading validation
    - **Property 8: Meter Reading Validation**
    - **Validates: Requirements 8.4, 8.5**
  - [x] 4.3 Write property test for usage date validation
    - **Property 9: Usage Date Validation**
    - **Validates: Requirements 8.3**

- [x] 5. Checkpoint - Core Functions Complete
  - All 34 property tests pass

- [x] 6. Server Actions
  - [x] 6.1 Create lib/job-equipment-actions.ts with CRUD operations
    - Implement addEquipmentToJob function
    - Implement completeEquipmentUsage function
    - Implement getJobEquipmentUsage function
    - Implement updateJobEquipmentCost function
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 2.1, 2.2, 2.3, 2.4, 2.6_
  - [x] 6.2 Implement rate lookup function
    - Implement getEquipmentRate with asset-specific priority
    - Fall back to category rate if no asset rate
    - _Requirements: 3.1, 3.2, 3.5_
  - [x] 6.3 Write property test for rate lookup priority
    - **Property 5: Rate Lookup Priority**
    - **Validates: Requirements 3.1, 3.5**
    - Included in unit tests (job-equipment-actions.test.ts)
  - [x] 6.4 Write unit tests for server actions
    - Test addEquipmentToJob creates usage and assignment
    - Test completeEquipmentUsage calculates costs
    - Test getJobEquipmentUsage returns correct data
    - _Requirements: 1.1, 1.6, 2.1_
    - 20 unit tests pass

- [x] 7. Checkpoint - Server Actions Complete
  - All 54 tests pass (34 property + 20 unit)

- [x] 8. Job Equipment Tab UI Components
  - [x] 8.1 Create components/job-equipment/job-equipment-summary-cards.tsx
    - Display equipment count, total days, total km, total cost
    - _Requirements: 5.1_
  - [x] 8.2 Create components/job-equipment/job-equipment-list.tsx
    - List all equipment with usage period, meters, cost breakdown
    - Include edit action for each record
    - _Requirements: 5.2, 5.5_
  - [x] 8.3 Create components/job-equipment/job-equipment-totals.tsx
    - Display total cost, total billing, equipment margin
    - _Requirements: 5.3_
  - [x] 8.4 Create components/job-equipment/add-equipment-dialog.tsx
    - Form to add equipment to job
    - Filter available assets by status
    - _Requirements: 5.4, 5.6_
  - [x] 8.5 Create components/job-equipment/complete-usage-dialog.tsx
    - Form to complete equipment usage with end readings and costs
    - _Requirements: 1.3, 2.2, 2.3, 2.4_
  - [x] 8.6 Create components/job-equipment/index.ts barrel export
    - Export all job equipment components
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 9. Job Order Equipment Tab Page
  - [x] 9.1 Create app/(main)/job-orders/[id]/equipment/page.tsx
    - Server component to fetch job and equipment data
    - _Requirements: 5.1, 5.2_
  - [x] 9.2 Create app/(main)/job-orders/[id]/equipment/equipment-client.tsx
    - Client component with summary, list, and totals
    - Handle add and complete equipment actions
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Job Equipment Summary View
  - [x] 10.1 Create database view for job equipment summary
    - Aggregate equipment count, days, km, cost per job
    - Include customer name and billing total
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 10.2 Add getJobEquipmentSummary function to actions
    - Query the summary view
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 11. Profit Integration
  - [x] 11.1 Update job profit calculation to include equipment
    - Include equipment_cost in total job cost
    - Include equipment billing in revenue calculation
    - Updated lib/reports/profitability-utils.ts
    - Updated app/(main)/reports/job-profitability/page.tsx
    - _Requirements: 7.1, 7.2_
  - [x] 11.2 Write unit tests for profit integration
    - Test equipment cost included in job cost
    - Test equipment billing included in revenue
    - Added tests to __tests__/profitability-utils.test.ts
    - _Requirements: 7.1, 7.2_

- [x] 12. Final Checkpoint
  - All 80 tests pass (34 property + 20 unit + 26 profitability)
  - Database schema verified via MCP
  - UI components created and exported
  - Calculations verified accurate

## Summary

All v0.45 Equipment - Job Integration tasks have been completed:

1. **Database**: Created `job_equipment_usage` and `equipment_rates` tables, added `equipment_cost` column to `job_orders`, created `job_equipment_summary_view`
2. **Types**: Created `types/job-equipment.ts` with all interfaces
3. **Utils**: Created `lib/job-equipment-utils.ts` with calculation and validation functions
4. **Actions**: Created `lib/job-equipment-actions.ts` with CRUD operations
5. **Tests**: 80 tests pass (34 property + 20 unit + 26 profitability)
6. **UI**: Created 6 components in `components/job-equipment/`
7. **Pages**: Created equipment tab at `app/(main)/job-orders/[id]/equipment/`
8. **Profit Integration**: Updated profitability utils and report page to include equipment cost

## Notes

- All tasks including tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
