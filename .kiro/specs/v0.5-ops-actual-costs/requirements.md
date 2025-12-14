# Requirements Document: v0.5 - Operations Actual Cost Entry

## Introduction

This feature enables the Operations team to fill actual costs for approved PJOs. After Admin creates a PJO with estimated costs (budget caps), and the PJO is approved, Operations enters the real expenses incurred. The system enforces budget control by warning when costs approach or exceed estimates, requiring justification for overruns, and tracking confirmation progress until all costs are confirmed and the PJO is ready for Job Order conversion.

## Glossary

- **PJO**: Proforma Job Order - a quotation document with estimated costs
- **Actual Cost**: The real expense amount entered by Operations after work is performed
- **Budget Cap**: The estimated_amount set by Admin, which serves as the maximum budget
- **Variance**: The difference between actual and estimated amounts (actual - estimated)
- **Cost Status**: The state of a cost item based on actual vs estimated comparison
  - **estimated**: No actual amount entered yet (⏳)
  - **confirmed**: Actual ≤ 90% of estimated (✅)
  - **at_risk**: Actual > 90% but ≤ 100% of estimated (⚠️)
  - **exceeded**: Actual > estimated, requires justification (🚫)
- **Justification**: Required explanation text when actual cost exceeds budget
- **all_costs_confirmed**: PJO flag indicating all cost items have actual amounts entered

## Requirements

### Requirement 1: Actual Costs Page

**User Story:** As Operations, I want a dedicated page to fill actual costs for an approved PJO, so that I can record real expenses against the budget.

#### Acceptance Criteria

1. WHEN a user navigates to /proforma-jo/[id]/costs THEN the System SHALL display the actual costs entry page
2. WHEN the page loads THEN the System SHALL display PJO header information including PJO number, status, project name, customer name, and commodity
3. WHEN the PJO status is not "approved" THEN the System SHALL display a message indicating costs can only be filled for approved PJOs
4. WHEN the PJO has been converted to a Job Order THEN the System SHALL display the cost items in read-only mode
5. WHEN the page loads THEN the System SHALL fetch all cost items associated with the PJO

### Requirement 2: Cost Items Table Display

**User Story:** As Operations, I want to see all cost items with their budget and current status, so that I can understand what needs to be filled.

#### Acceptance Criteria

1. WHEN displaying the cost items table THEN the System SHALL show columns for category, description, budget (estimated_amount), actual amount input, variance, and status
2. WHEN displaying budget amounts THEN the System SHALL format values as IDR (Rp XX.XXX.XXX)
3. WHEN a cost item has no actual amount THEN the System SHALL display an empty input field with status "⏳ Pending"
4. WHEN a cost item has an actual amount THEN the System SHALL display the variance calculated as (actual - estimated)
5. WHEN variance is negative THEN the System SHALL display it in green indicating under budget
6. WHEN variance is positive THEN the System SHALL display it in red indicating over budget

### Requirement 3: Actual Amount Entry

**User Story:** As Operations, I want to enter actual amounts for each cost item, so that I can record the real expenses.

#### Acceptance Criteria

1. WHEN entering an actual amount THEN the System SHALL provide a currency input field formatted as IDR
2. WHEN an actual amount is entered THEN the System SHALL immediately calculate and display the variance
3. WHEN an actual amount is entered THEN the System SHALL immediately update the status indicator
4. WHEN the actual amount field is cleared THEN the System SHALL reset the status to "estimated" (pending)

### Requirement 4: Budget Warning at 90%

**User Story:** As Operations, I want to see a warning when actual cost approaches the budget limit, so that I can be aware before exceeding.

#### Acceptance Criteria

1. WHEN actual amount exceeds 90% of estimated amount but is within budget THEN the System SHALL display a yellow warning indicator
2. WHEN displaying the warning THEN the System SHALL show the percentage of budget used
3. WHEN the warning is displayed THEN the System SHALL set status to "at_risk"
4. WHILE the warning is displayed THEN the System SHALL allow the user to continue entering the actual amount

### Requirement 5: Budget Exceeded Handling

**User Story:** As Operations, I want to provide justification when actual cost exceeds budget, so that overruns are documented for review.

#### Acceptance Criteria

1. WHEN actual amount exceeds estimated amount THEN the System SHALL display a red error indicator
2. WHEN actual exceeds budget THEN the System SHALL display a justification text input field
3. WHEN actual exceeds budget THEN the System SHALL require justification text with minimum 10 characters
4. WHEN justification is not provided for exceeded item THEN the System SHALL prevent confirmation of that item
5. WHEN displaying exceeded status THEN the System SHALL show the variance amount and percentage over budget

### Requirement 6: Confirm Cost Item

**User Story:** As Operations, I want to confirm each cost item after entering the actual amount, so that the expense is officially recorded.

#### Acceptance Criteria

1. WHEN a cost item has a valid actual amount THEN the System SHALL display a "Confirm" button
2. WHEN actual exceeds budget and justification is provided THEN the System SHALL enable the "Confirm" button
3. WHEN a user clicks "Confirm" THEN the System SHALL save the actual_amount to the database
4. WHEN confirming a cost item THEN the System SHALL record confirmed_by as the current user ID
5. WHEN confirming a cost item THEN the System SHALL record confirmed_at as the current timestamp
6. WHEN confirming a cost item THEN the System SHALL save the justification text for exceeded items
7. WHEN a cost item is confirmed THEN the System SHALL disable editing of that item's actual amount

### Requirement 7: Progress Tracking

**User Story:** As Operations, I want to see my progress in confirming cost items, so that I know how many items remain.

#### Acceptance Criteria

1. WHEN displaying the costs page THEN the System SHALL show a progress indicator with format "X of Y cost items confirmed"
2. WHEN a cost item is confirmed THEN the System SHALL update the progress indicator immediately
3. WHEN all cost items are confirmed THEN the System SHALL display a success message "All costs confirmed - Ready for Job Order conversion"
4. WHEN all cost items are confirmed THEN the System SHALL update the PJO all_costs_confirmed flag to true

### Requirement 8: Job Order Conversion Readiness

**User Story:** As Operations, I want to see when a PJO is ready for Job Order conversion, so that I can proceed with the workflow.

#### Acceptance Criteria

1. WHEN all cost items are confirmed THEN the System SHALL display a "Create Job Order" button
2. WHEN the PJO has cost overruns THEN the System SHALL display a warning that the JO will include exceeded items
3. WHEN a user clicks "Create Job Order" THEN the System SHALL navigate to the JO creation flow
4. WHEN the PJO is not fully confirmed THEN the System SHALL disable the "Create Job Order" button

### Requirement 9: Access Control

**User Story:** As a system administrator, I want to restrict actual cost entry to authorized users, so that only Operations and Admin can fill costs.

#### Acceptance Criteria

1. WHEN a user with role "ops" or "admin" accesses the costs page THEN the System SHALL allow editing of actual amounts
2. WHEN a user with other roles accesses the costs page THEN the System SHALL display cost items in read-only mode
3. WHEN the PJO status is not "approved" THEN the System SHALL prevent editing of actual amounts
4. WHEN the PJO has been converted to a Job Order THEN the System SHALL prevent editing of actual amounts

### Requirement 10: Data Persistence

**User Story:** As Operations, I want my entered costs to be saved reliably, so that data is not lost.

#### Acceptance Criteria

1. WHEN confirming a cost item THEN the System SHALL update the pjo_cost_items record with actual_amount, status, confirmed_by, confirmed_at, and justification
2. WHEN calculating status THEN the System SHALL use the formula: confirmed if actual ≤ 90% estimated, at_risk if 90% < actual ≤ 100%, exceeded if actual > estimated
3. WHEN all cost items are confirmed THEN the System SHALL update proforma_job_orders.all_costs_confirmed to true
4. WHEN all cost items are confirmed THEN the System SHALL calculate and store total_cost_actual on the PJO record
5. WHEN any cost item exceeds budget THEN the System SHALL set proforma_job_orders.has_cost_overruns to true
