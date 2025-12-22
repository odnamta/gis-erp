# Requirements Document

## Introduction

This document defines the requirements for the Equipment Depreciation & Costing feature (v0.44) in Gama ERP. This feature enables tracking of asset depreciation using multiple methods (straight-line, declining balance), Total Cost of Ownership (TCO) analysis, and monthly depreciation batch processing to provide comprehensive asset financial management.

## Glossary

- **Depreciation**: The systematic allocation of an asset's cost over its useful life
- **Straight-Line Depreciation**: Method that allocates equal depreciation expense each period
- **Declining Balance Depreciation**: Accelerated method that applies a fixed rate to the declining book value
- **Book Value**: Original cost minus accumulated depreciation
- **Salvage Value**: Estimated residual value at the end of useful life
- **TCO (Total Cost of Ownership)**: Total cost including purchase, maintenance, fuel, and depreciation
- **Useful Life**: Expected period the asset will be productive
- **Accumulated Depreciation**: Total depreciation recorded since acquisition

## Requirements

### Requirement 1: Asset Depreciation Table

**User Story:** As a finance manager, I want to track depreciation records for each asset, so that I can monitor asset value changes over time and ensure accurate financial reporting.

#### Acceptance Criteria

1. THE System SHALL create an asset_depreciation table with fields for asset_id, depreciation_date, depreciation_method, period_start, period_end, beginning_book_value, depreciation_amount, ending_book_value, and accumulated_depreciation
2. WHEN a depreciation record is created, THE System SHALL validate that depreciation_amount is non-negative
3. WHEN a depreciation record is created, THE System SHALL validate that ending_book_value equals beginning_book_value minus depreciation_amount
4. WHEN a depreciation record is created, THE System SHALL validate that ending_book_value is not less than the asset's salvage_value
5. THE System SHALL enforce a unique constraint on (asset_id, period_start, period_end) to prevent duplicate depreciation records
6. THE System SHALL create appropriate indexes for efficient querying on asset_id and depreciation_date

### Requirement 2: Asset Cost Tracking Table

**User Story:** As a finance manager, I want to track all costs associated with each asset, so that I can calculate Total Cost of Ownership and make informed decisions about asset management.

#### Acceptance Criteria

1. THE System SHALL create an asset_cost_tracking table with fields for asset_id, cost_type, cost_date, amount, reference_type, reference_id, and notes
2. THE System SHALL support cost_type values: 'purchase', 'maintenance', 'fuel', 'insurance', 'registration', 'depreciation', 'other'
3. WHEN a cost record is created, THE System SHALL validate that amount is positive
4. THE System SHALL allow linking costs to reference records (maintenance_records, asset_daily_logs) via reference_type and reference_id
5. THE System SHALL create appropriate indexes for efficient querying on asset_id, cost_type, and cost_date

### Requirement 3: Straight-Line Depreciation Calculation

**User Story:** As a finance manager, I want to calculate depreciation using the straight-line method, so that I can allocate asset costs evenly over the useful life.

#### Acceptance Criteria

1. WHEN calculating straight-line depreciation, THE System SHALL use the formula: (purchase_price - salvage_value) / useful_life_years / 12 for monthly depreciation
2. WHEN the asset has no purchase_price, THE System SHALL return zero depreciation
3. WHEN the asset has no useful_life_years or useful_life_years is zero, THE System SHALL return zero depreciation
4. WHEN the calculated depreciation would reduce book_value below salvage_value, THE System SHALL limit depreciation to (book_value - salvage_value)
5. WHEN the book_value equals salvage_value, THE System SHALL return zero depreciation (fully depreciated)

### Requirement 4: Declining Balance Depreciation Calculation

**User Story:** As a finance manager, I want to calculate depreciation using the declining balance method, so that I can apply accelerated depreciation for assets that lose value faster in early years.

#### Acceptance Criteria

1. WHEN calculating declining balance depreciation, THE System SHALL use the formula: book_value * (depreciation_rate / 12) for monthly depreciation
2. THE System SHALL use a default depreciation rate of 2 / useful_life_years (double declining balance)
3. WHEN the asset has no book_value or book_value is zero, THE System SHALL return zero depreciation
4. WHEN the calculated depreciation would reduce book_value below salvage_value, THE System SHALL limit depreciation to (book_value - salvage_value)
5. WHEN the book_value equals salvage_value, THE System SHALL return zero depreciation (fully depreciated)

### Requirement 5: Monthly Depreciation Batch Processing

**User Story:** As a system administrator, I want to run monthly depreciation batch processing, so that depreciation is calculated and recorded automatically for all active assets.

#### Acceptance Criteria

1. WHEN running monthly depreciation batch, THE System SHALL process all assets with status 'active' and depreciation_start_date on or before the processing month
2. WHEN processing an asset, THE System SHALL use the asset's configured depreciation_method (straight_line or declining_balance)
3. WHEN processing an asset, THE System SHALL create a depreciation record with period_start as first day of month and period_end as last day of month
4. WHEN processing an asset, THE System SHALL update the asset's accumulated_depreciation and book_value fields
5. WHEN processing an asset, THE System SHALL create a corresponding cost_tracking record with cost_type 'depreciation'
6. IF a depreciation record already exists for the asset and period, THEN THE System SHALL skip that asset and continue processing
7. WHEN batch processing completes, THE System SHALL return a summary with processed_count, skipped_count, and error_count

### Requirement 6: TCO Summary View

**User Story:** As a finance manager, I want to view Total Cost of Ownership summary for each asset, so that I can analyze the true cost of owning and operating equipment.

#### Acceptance Criteria

1. THE System SHALL create a materialized view asset_tco_summary that aggregates all costs by asset
2. THE System SHALL include purchase_cost, total_maintenance_cost, total_fuel_cost, total_depreciation, total_insurance_cost, total_registration_cost, total_other_cost, and total_tco
3. THE System SHALL calculate cost_per_km as total_tco / total_km where total_km > 0
4. THE System SHALL calculate cost_per_hour as total_tco / total_hours where total_hours > 0
5. THE System SHALL include asset details: asset_code, asset_name, category_name, purchase_date, current_book_value
6. THE System SHALL provide a function to refresh the materialized view

### Requirement 7: Costing Dashboard

**User Story:** As a finance manager, I want to view a costing dashboard, so that I can monitor asset costs, depreciation, and TCO across the fleet.

#### Acceptance Criteria

1. WHEN viewing the costing dashboard, THE System SHALL display summary cards showing total fleet value, total accumulated depreciation, total TCO, and average cost per km
2. WHEN viewing the costing dashboard, THE System SHALL display a TCO Analysis tab with asset TCO table showing all cost components
3. WHEN viewing the costing dashboard, THE System SHALL display a Depreciation tab with depreciation schedule and history
4. WHEN viewing the costing dashboard, THE System SHALL display a Cost Breakdown tab with cost distribution by category
5. WHEN filtering by category, THE System SHALL refresh all metrics for the selected category
6. WHEN filtering by date range, THE System SHALL refresh all metrics for the selected period
7. WHEN exporting the report, THE System SHALL generate an Excel file with all costing data

### Requirement 8: Depreciation Schedule View

**User Story:** As a finance manager, I want to view the depreciation schedule for each asset, so that I can forecast future depreciation and plan for asset replacement.

#### Acceptance Criteria

1. WHEN viewing an asset's depreciation schedule, THE System SHALL display projected monthly depreciation for the remaining useful life
2. WHEN viewing an asset's depreciation schedule, THE System SHALL show beginning book value, depreciation amount, and ending book value for each period
3. WHEN viewing an asset's depreciation schedule, THE System SHALL highlight when the asset will be fully depreciated
4. WHEN the asset uses straight-line method, THE System SHALL show equal monthly amounts
5. WHEN the asset uses declining balance method, THE System SHALL show decreasing monthly amounts

### Requirement 9: Cost Breakdown Analysis

**User Story:** As a finance manager, I want to analyze cost breakdown by category, so that I can identify cost drivers and optimize asset management.

#### Acceptance Criteria

1. WHEN viewing cost breakdown, THE System SHALL display costs grouped by cost_type (maintenance, fuel, depreciation, etc.)
2. WHEN viewing cost breakdown, THE System SHALL show percentage of total for each cost category
3. WHEN viewing cost breakdown, THE System SHALL display a pie chart or bar chart visualization
4. WHEN filtering by asset, THE System SHALL show cost breakdown for the selected asset only
5. WHEN filtering by date range, THE System SHALL show costs within the selected period

### Requirement 10: Integration with Existing Modules

**User Story:** As a system administrator, I want depreciation and costing to integrate with existing modules, so that data flows seamlessly across the system.

#### Acceptance Criteria

1. WHEN a maintenance record is completed, THE System SHALL automatically create a cost_tracking record with cost_type 'maintenance'
2. WHEN a daily log with fuel cost is saved, THE System SHALL automatically create a cost_tracking record with cost_type 'fuel'
3. WHEN viewing an asset detail page, THE System SHALL display a costing section with TCO summary and depreciation status
4. THE System SHALL use existing asset fields: purchase_price, book_value, salvage_value, depreciation_method, useful_life_years, accumulated_depreciation
5. THE System SHALL update asset.book_value when depreciation is recorded

