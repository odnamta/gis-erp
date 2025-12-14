# Requirements Document: v0.4.4 - Cost Items with Budget Control System

## Introduction

This feature adds a Cost Items section to the PJO form, enabling Marketing/Admin to set estimated costs that become budget caps for Operations. The system tracks cost status and provides real-time financial summaries including profit and margin calculations.

## Glossary

- **PJO**: Proforma Job Order - a quotation document created by Admin
- **Cost Item**: A line item representing an estimated expense category
- **Budget Cap**: The estimated_amount set by Admin, which Operations cannot exceed without justification
- **Estimated Cost**: The budgeted amount set during PJO creation
- **Actual Cost**: The real cost entered by Operations (future feature)
- **Cost Status**: The state of a cost item (estimated, confirmed, at_risk, exceeded)

## Requirements

### Requirement 1: Cost Items Table Display

**User Story:** As an Admin, I want to add cost items to a PJO, so that I can set budget caps for each expense category.

#### Acceptance Criteria

1. WHEN the PJO form loads THEN the System SHALL display a Cost Items section after the Revenue Items section
2. WHEN displaying the Cost Items table THEN the System SHALL show columns for line number, category, description, estimated amount, and status
3. WHEN a cost item exists THEN the System SHALL display its status with appropriate icon (⏳ Estimated, ✅ Confirmed, ⚠️ At Risk, 🚫 Exceeded)
4. WHEN cost items are present THEN the System SHALL display the total estimated cost below the table

### Requirement 2: Add Cost Item

**User Story:** As an Admin, I want to add new cost items to the PJO, so that I can budget for different expense categories.

#### Acceptance Criteria

1. WHEN a user clicks the "Add Item" button THEN the System SHALL create a new row with default values (quantity: 1, status: estimated)
2. WHEN a new row is created THEN the System SHALL focus the category dropdown for immediate selection
3. WHEN adding a cost item THEN the System SHALL provide a category dropdown with options: trucking, port_charges, documentation, handling, crew, fuel, tolls, other
4. WHEN a cost item is added THEN the System SHALL recalculate the total estimated cost immediately

### Requirement 3: Cost Item Fields

**User Story:** As an Admin, I want to enter cost details for each item, so that Operations knows the budget for each category.

#### Acceptance Criteria

1. WHEN editing a cost item THEN the System SHALL allow selection of category from predefined dropdown
2. WHEN editing a cost item THEN the System SHALL allow entry of description text
3. WHEN editing a cost item THEN the System SHALL allow entry of estimated_amount as currency
4. WHEN estimated_amount changes THEN the System SHALL recalculate total estimated cost immediately
5. WHEN displaying currency values THEN the System SHALL format amounts as IDR (Indonesian Rupiah)

### Requirement 4: Delete Cost Item

**User Story:** As an Admin, I want to remove cost items, so that I can correct mistakes in the budget.

#### Acceptance Criteria

1. WHEN a user clicks the delete button on a cost item THEN the System SHALL remove that item from the list
2. WHEN a cost item is deleted THEN the System SHALL recalculate total estimated cost
3. WHEN a cost item is deleted THEN the System SHALL renumber remaining items sequentially

### Requirement 5: Financial Summary

**User Story:** As an Admin, I want to see a financial summary, so that I can understand the profitability of the PJO.

#### Acceptance Criteria

1. WHEN revenue and cost items exist THEN the System SHALL display a Financial Summary section
2. WHEN displaying summary THEN the System SHALL show Total Revenue from revenue items
3. WHEN displaying summary THEN the System SHALL show Total Estimated Cost from cost items
4. WHEN displaying summary THEN the System SHALL calculate and show Estimated Profit (revenue - cost)
5. WHEN displaying summary THEN the System SHALL calculate and show Estimated Margin as percentage ((profit / revenue) * 100)
6. WHEN revenue is zero THEN the System SHALL display margin as 0%

### Requirement 6: Validation

**User Story:** As an Admin, I want the system to validate cost items, so that I cannot submit incomplete budget data.

#### Acceptance Criteria

1. WHEN submitting a PJO THEN the System SHALL require at least one cost item
2. WHEN validating a cost item THEN the System SHALL require category to be selected
3. WHEN validating a cost item THEN the System SHALL require description to be non-empty
4. WHEN validating a cost item THEN the System SHALL require estimated_amount to be greater than zero
5. WHEN validation fails THEN the System SHALL display inline error messages
6. WHEN validation fails THEN the System SHALL prevent form submission

### Requirement 7: Data Persistence

**User Story:** As an Admin, I want cost items to be saved with the PJO, so that the budget is preserved for Operations.

#### Acceptance Criteria

1. WHEN creating a new PJO THEN the System SHALL save all cost items to pjo_cost_items table
2. WHEN saving a cost item THEN the System SHALL set status to 'estimated'
3. WHEN saving a cost item THEN the System SHALL record estimated_by as current user ID
4. WHEN saving a PJO THEN the System SHALL calculate and store total_cost_estimated on the PJO record
5. WHEN saving a PJO THEN the System SHALL calculate and store estimated_profit on the PJO record
6. WHEN saving a PJO THEN the System SHALL calculate and store estimated_margin on the PJO record
7. WHEN updating an existing PJO THEN the System SHALL sync cost items (insert new, update existing, delete removed)

### Requirement 8: Load Existing Cost Items

**User Story:** As an Admin, I want to see existing cost items when editing a PJO, so that I can modify the budget.

#### Acceptance Criteria

1. WHEN loading a PJO for edit THEN the System SHALL fetch all associated cost items
2. WHEN displaying loaded cost items THEN the System SHALL show current status for each item
3. WHEN displaying loaded cost items THEN the System SHALL preserve the original estimated_amount values

