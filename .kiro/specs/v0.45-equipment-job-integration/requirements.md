# Requirements Document

## Introduction

This document defines the requirements for v0.45 Equipment - Job Integration feature. This feature integrates equipment assignment with job orders, enabling tracking of which equipment was used for each job and calculating equipment costs per job. It builds upon the existing asset management (v0.41), maintenance tracking (v0.42), utilization tracking (v0.43), and depreciation/costing (v0.44) features.

## Glossary

- **Job_Equipment_Usage**: A record tracking equipment usage for a specific job order, including usage period, meter readings, and allocated costs
- **Equipment_Rate**: A pricing configuration for equipment rental/usage, either asset-specific or category-based
- **Rate_Type**: The billing method for equipment ('daily', 'hourly', 'per_km', 'per_trip')
- **Usage_Period**: The date range during which equipment is assigned to and used for a job
- **Equipment_Cost**: The total cost of using equipment on a job, including depreciation, fuel, maintenance, and operator costs
- **Billing_Amount**: The amount charged to the customer for equipment usage
- **Equipment_Margin**: The difference between billing amount and equipment cost

## Requirements

### Requirement 1: Job Equipment Usage Tracking

**User Story:** As an operations manager, I want to track which equipment is used for each job order, so that I can accurately allocate equipment costs and monitor utilization.

#### Acceptance Criteria

1. WHEN equipment is added to a job order, THE Job_Equipment_Usage_System SHALL create a usage record linking the asset to the job with a start date
2. WHEN equipment usage is recorded, THE Job_Equipment_Usage_System SHALL capture starting meter readings (km and/or hours) if applicable
3. WHEN equipment usage is completed, THE Job_Equipment_Usage_System SHALL record the end date and ending meter readings
4. THE Job_Equipment_Usage_System SHALL calculate usage_days as the difference between end date and start date plus one
5. THE Job_Equipment_Usage_System SHALL calculate km_used and hours_used from meter readings when both start and end values are provided
6. WHEN equipment is added to a job, THE Job_Equipment_Usage_System SHALL automatically create an asset assignment record

### Requirement 2: Equipment Cost Calculation

**User Story:** As a finance manager, I want equipment costs automatically calculated for each job, so that I can accurately determine job profitability.

#### Acceptance Criteria

1. WHEN equipment usage is completed, THE Cost_Calculator SHALL calculate depreciation cost based on book value, useful life, and usage days
2. THE Cost_Calculator SHALL support recording fuel costs for the equipment usage period
3. THE Cost_Calculator SHALL support recording maintenance costs allocated to the job
4. THE Cost_Calculator SHALL support recording operator costs for the equipment usage period
5. THE Cost_Calculator SHALL calculate total_cost as the sum of depreciation, fuel, maintenance, and operator costs
6. WHEN equipment costs are calculated, THE Cost_Calculator SHALL update the job order's equipment_cost field with the total

### Requirement 3: Equipment Rates Management

**User Story:** As an administrator, I want to configure equipment rates for billing purposes, so that I can accurately charge customers for equipment usage.

#### Acceptance Criteria

1. THE Equipment_Rate_System SHALL support asset-specific rates that override category defaults
2. THE Equipment_Rate_System SHALL support category-based default rates
3. THE Equipment_Rate_System SHALL support multiple rate types: daily, hourly, per_km, and per_trip
4. THE Equipment_Rate_System SHALL track rate effective dates with from and to date ranges
5. WHEN looking up a rate, THE Equipment_Rate_System SHALL prioritize asset-specific rates over category defaults
6. THE Equipment_Rate_System SHALL support indicating whether rates include operator and/or fuel

### Requirement 4: Equipment Billing Calculation

**User Story:** As an administrator, I want billing amounts calculated based on configured rates, so that I can invoice customers accurately for equipment usage.

#### Acceptance Criteria

1. WHEN a daily rate is configured, THE Billing_Calculator SHALL calculate billing_amount as daily_rate multiplied by usage_days
2. WHEN an hourly rate is configured, THE Billing_Calculator SHALL calculate billing_amount as hourly_rate multiplied by hours_used
3. WHEN a per_km rate is configured, THE Billing_Calculator SHALL calculate billing_amount as per_km_rate multiplied by km_used
4. THE Billing_Calculator SHALL support overriding calculated billing with a manual billing amount
5. THE Billing_Calculator SHALL track whether equipment usage is billable or non-billable

### Requirement 5: Job Equipment Tab UI

**User Story:** As an operations user, I want to view and manage equipment used for a job in a dedicated tab, so that I can easily track equipment allocation and costs.

#### Acceptance Criteria

1. WHEN viewing a job order, THE Job_Equipment_Tab SHALL display a summary showing equipment count, total days, total km, and total cost
2. THE Job_Equipment_Tab SHALL list all equipment used for the job with usage period, meter readings, and cost breakdown
3. THE Job_Equipment_Tab SHALL display totals for equipment cost, equipment billing, and equipment margin
4. THE Job_Equipment_Tab SHALL provide an "Add Equipment" action to assign new equipment to the job
5. THE Job_Equipment_Tab SHALL provide an "Edit" action for each equipment usage record
6. WHEN adding equipment, THE Job_Equipment_Tab SHALL show available assets filtered by status

### Requirement 6: Job Equipment Summary View

**User Story:** As a manager, I want to see equipment usage summaries across jobs, so that I can analyze equipment utilization and profitability.

#### Acceptance Criteria

1. THE Job_Equipment_Summary_View SHALL aggregate equipment count, total days, total km, and total cost per job
2. THE Job_Equipment_Summary_View SHALL include customer name for context
3. THE Job_Equipment_Summary_View SHALL include total billing amount per job

### Requirement 7: Profit Integration

**User Story:** As a finance manager, I want equipment costs and billing integrated into job profitability calculations, so that I can see the true profit margin including equipment.

#### Acceptance Criteria

1. WHEN calculating job profit, THE Profit_Calculator SHALL include equipment_cost in the total job cost
2. WHEN calculating job revenue, THE Profit_Calculator SHALL include equipment billing amounts
3. THE Profit_Calculator SHALL calculate equipment margin as billing minus cost
4. THE Profit_Calculator SHALL display equipment margin percentage

### Requirement 8: Data Validation

**User Story:** As a system administrator, I want data validation to ensure accurate equipment tracking, so that reports and calculations are reliable.

#### Acceptance Criteria

1. WHEN adding equipment to a job, THE Validation_System SHALL require a valid asset_id and job_order_id
2. WHEN adding equipment to a job, THE Validation_System SHALL require a usage_start date
3. WHEN completing equipment usage, THE Validation_System SHALL require usage_end date to be on or after usage_start
4. WHEN recording meter readings, THE Validation_System SHALL require end_km to be greater than or equal to start_km
5. WHEN recording meter readings, THE Validation_System SHALL require end_hours to be greater than or equal to start_hours
6. THE Validation_System SHALL prevent duplicate equipment usage records for the same asset, job, and start date combination
