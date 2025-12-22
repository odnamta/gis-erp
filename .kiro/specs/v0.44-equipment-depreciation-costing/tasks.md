# Implementation Plan: Equipment Depreciation & Costing

## Overview

This implementation plan breaks down the Equipment Depreciation & Costing feature (v0.44) into discrete coding tasks. The plan follows an incremental approach, building from database schema through utility functions, server actions, and UI components.

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Create asset_depreciation table
    - Create table with asset_id, depreciation_date, depreciation_method, period_start, period_end
    - Add beginning_book_value, depreciation_amount, ending_book_value, accumulated_depreciation
    - Add CHECK constraint for non-negative depreciation_amount
    - Add CHECK constraint for ending = beginning - depreciation
    - Add UNIQUE constraint on (asset_id, period_start, period_end)
    - Create indexes for asset_id, depreciation_date, and period
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_
  - [x] 1.2 Create asset_cost_tracking table
    - Create table with asset_id, cost_type, cost_date, amount, reference_type, reference_id
    - Add CHECK constraint for positive amount
    - Create indexes for asset_id, cost_type, and cost_date
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 1.3 Create materialized view and database views
    - Create asset_tco_summary materialized view with all cost aggregations
    - Create refresh_asset_tco_summary function
    - Create depreciation_history view
    - Create cost_history view
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 2. TypeScript Types and Utility Functions
  - [x] 2.1 Create depreciation types file
    - Define CostType, CostReferenceType types
    - Define AssetDepreciation, AssetCostTracking interfaces
    - Define AssetTCOSummary, DepreciationProjection interfaces
    - Define CostBreakdown, CostingDashboardStats interfaces
    - Define row types and input types
    - _Requirements: 1.1, 2.1, 6.1_
  - [x] 2.2 Create depreciation utility functions
    - Implement calculateStraightLineDepreciation
    - Implement calculateDecliningBalanceDepreciation
    - Implement calculateDepreciation (method dispatcher)
    - Implement generateDepreciationSchedule
    - Implement calculateCostBreakdown
    - Implement calculateCostingDashboardStats
    - Implement calculateCostPerKm, calculateCostPerHour
    - Implement validation functions
    - Implement transform functions for database rows
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 6.3, 6.4_
  - [x] 2.3 Write property tests for depreciation utility functions
    - **Property 1: Straight-Line Depreciation Formula**
    - **Property 2: Declining Balance Depreciation Formula**
    - **Property 3: Zero Depreciation Conditions**
    - **Property 4: Book Value Consistency**
    - **Property 5: Salvage Value Floor**
    - **Property 6: Non-Negative Depreciation**
    - **Property 7: Positive Cost Amount**
    - **Property 8: TCO Calculation**
    - **Property 9: Cost Per Km Calculation**
    - **Property 10: Cost Per Hour Calculation**
    - **Property 11: Cost Breakdown Percentages**
    - **Property 12: Depreciation Eligibility**
    - **Validates: Requirements 1.2, 1.3, 1.4, 2.3, 3.1-3.5, 4.1-4.5, 5.1, 6.2, 6.3, 6.4, 9.2**

- [x] 3. Server Actions for Depreciation
  - [x] 3.1 Create depreciation server actions file
    - Implement recordDepreciation function with validation
    - Implement getDepreciationHistory function
    - Implement getAssetDepreciationSchedule function
    - _Requirements: 1.2, 1.3, 1.4, 8.1, 8.2, 8.3_
  - [x] 3.2 Implement batch depreciation processing
    - Implement runMonthlyDepreciation function
    - Process all eligible assets
    - Update asset book_value and accumulated_depreciation
    - Create cost_tracking records for depreciation
    - Return batch processing summary
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - [x] 3.3 Write unit tests for depreciation actions
    - Test depreciation recording with valid data
    - Test batch processing with multiple assets
    - Test skip logic for already depreciated assets
    - _Requirements: 5.6, 5.7_

- [x] 4. Server Actions for Cost Tracking
  - [x] 4.1 Implement cost tracking server actions
    - Implement recordCost function with validation
    - Implement getCostHistory function with filters
    - Implement getCostBreakdown function
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 9.1, 9.4, 9.5_
  - [x] 4.2 Implement TCO query functions
    - Implement getTCOSummary function
    - Implement refreshTCOView function
    - _Requirements: 6.1, 6.2, 6.6_
  - [x] 4.3 Write unit tests for cost tracking actions
    - Test cost recording with valid data
    - Test cost breakdown calculation
    - _Requirements: 2.3, 9.2_

- [x] 5. Integration with Existing Modules
  - [x] 5.1 Update maintenance actions for cost tracking
    - Add cost_tracking record when maintenance is completed
    - Link via reference_type 'maintenance_record'
    - _Requirements: 10.1_
  - [x] 5.2 Update daily log actions for fuel cost tracking
    - Add cost_tracking record when daily log with fuel cost is saved
    - Link via reference_type 'daily_log'
    - _Requirements: 10.2_

- [x] 6. Checkpoint - Core Logic Complete
  - All tests pass (depreciation-actions: 27 tests, utilization-actions: 12 tests)


- [x] 7. UI Components - Costing Dashboard
  - [x] 7.1 Create costing summary cards component
    - Display total fleet value, accumulated depreciation, total TCO, average cost per km
    - Use existing Card component pattern from dashboard
    - _Requirements: 7.1_
  - [x] 7.2 Create TCO analysis table component
    - Display asset list with all cost components
    - Show purchase cost, maintenance, fuel, depreciation, insurance, registration, other
    - Show total TCO and cost per km/hour
    - _Requirements: 7.2_
  - [x] 7.3 Create depreciation schedule component
    - Display projected monthly depreciation
    - Show beginning value, depreciation, ending value per period
    - Highlight fully depreciated point
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 7.4 Create depreciation history component
    - Display historical depreciation records
    - Filter by asset and date range
    - _Requirements: 7.3_
  - [x] 7.5 Create cost breakdown chart component
    - Display pie chart or bar chart of costs by type
    - Show percentage of total for each category
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 7.6 Create cost history table component
    - Display cost records with date, type, amount
    - Filter by asset, type, and date range
    - _Requirements: 7.4_
  - [x] 7.7 Create batch depreciation dialog component
    - Month selector for batch processing
    - Show processing progress and results
    - _Requirements: 5.7_
  - [x] 7.8 Create costing dashboard page
    - Combine all components with tabs (TCO Analysis, Depreciation, Cost Breakdown)
    - Add category and date range filters
    - Add export button
    - Route: /equipment/costing
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 8. UI Components - Asset Detail Integration
  - [x] 8.1 Create asset depreciation page
    - Route: /equipment/[id]/depreciation
    - Show depreciation schedule projection
    - Show depreciation history
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 8.2 Create asset costs page
    - Route: /equipment/[id]/costs
    - Show cost history for asset
    - Show cost breakdown for asset
    - _Requirements: 9.4_
  - [x] 8.3 Update equipment detail page
    - Add costing section with TCO summary
    - Add depreciation status indicator
    - Add links to depreciation and costs pages
    - _Requirements: 10.3_

- [x] 9. Export Functionality
  - [x] 9.1 Implement Excel export for costing report
    - Export TCO data to Excel
    - Export depreciation schedule to Excel
    - Export cost breakdown to Excel
    - Use existing export pattern from reports module
    - _Requirements: 7.7_

- [x] 10. Checkpoint - Feature Complete
  - All UI components created and integrated

- [x] 11. Navigation and Integration
  - [x] 11.1 Add costing routes to navigation
    - Add "Costing" link under Equipment menu
    - Add breadcrumbs for costing pages
    - _Requirements: 7.1_
  - [x] 11.2 Update asset fields usage
    - Ensure proper use of purchase_price, book_value, salvage_value
    - Ensure proper use of depreciation_method, useful_life_years
    - Ensure proper update of accumulated_depreciation
    - _Requirements: 10.4, 10.5_

- [x] 12. Final Checkpoint
  - All tasks complete
  - All tests pass (depreciation-utils: 29 tests, depreciation-actions: 27 tests)
  - UI components created and integrated
  - Navigation updated

## Notes

- All tasks including property tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with minimum 100 iterations
- Use `Math.fround()` for float constraints in fast-check to avoid 32-bit float errors
- Unit tests validate specific examples and edge cases
- The implementation builds on existing Equipment Asset Registry (v0.41), Maintenance Tracking (v0.42), and Utilization Tracking (v0.43) modules
- Currency format: IDR (use `formatIDR()` from `lib/pjo-utils.ts`)
- Date format: DD/MM/YYYY (use `formatDate()` from `lib/pjo-utils.ts`)
