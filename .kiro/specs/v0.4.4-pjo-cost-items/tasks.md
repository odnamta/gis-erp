# Implementation Plan: v0.4.4 - Cost Items with Budget Control System

## Phase 1: Cost Items Table Component

- [x] 1. Create CostItemsTable component
  - [x] 1.1 Create components/pjo/cost-items-table.tsx with table structure
    - Implement table with columns: #, Category, Description, Estimated Amount, Status, Actions
    - Use shadcn/ui Table, Input, Select, Button components
    - Add COST_CATEGORIES constant with options: trucking, port_charges, documentation, handling, crew, fuel, tolls, other
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3_
  - [x] 1.2 Implement status display with icons
    - ⏳ Estimated (gray) - Clock icon
    - ✅ Confirmed (green) - CheckCircle icon
    - ⚠️ At Risk (yellow) - AlertTriangle icon (when actual > 90% of estimated)
    - 🚫 Exceeded (red) - XCircle icon
    - _Requirements: 1.3_
  - [x] 1.3 Implement add item functionality
    - Add "Add Item" button that creates new row with defaults (status: 'estimated')
    - Focus category dropdown on new row
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 1.4 Implement delete item functionality
    - Add delete button per row
    - Renumber remaining rows after deletion
    - _Requirements: 4.1, 4.3_
  - [x] 1.5 Implement auto-calculation
    - Calculate and display total estimated cost
    - Format all currency values as IDR
    - _Requirements: 1.4, 2.4, 3.4, 3.5_
  - [x] 1.6 Export helper functions for testing
    - calculateTotalEstimatedCost(items)
    - getSequentialLineNumbers(items)
    - getStatusIcon(status, actualAmount?, estimatedAmount?)
    - _Requirements: Testing support_
  - [x] 1.7 Write property test for total cost calculation
    - **Property 1: Total Estimated Cost Sum Consistency**
    - **Validates: Requirements 1.4, 2.4, 3.4, 4.2**
  - [x] 1.8 Write property test for line numbering
    - **Property 2: Sequential Line Numbering After Deletion**
    - **Validates: Requirements 4.3**
  - [x] 1.9 Write property test for status icon mapping
    - **Property 5: Status Icon Mapping Consistency**
    - **Validates: Requirements 1.3**

- [x] 2. Checkpoint - Verify component works
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Financial Summary Component

- [x] 3. Create FinancialSummary component
  - [x] 3.1 Create components/pjo/financial-summary.tsx
    - Display Total Revenue, Total Estimated Cost, Estimated Profit, Estimated Margin
    - Format all values as IDR currency
    - Show margin as percentage with 1 decimal place
    - Handle edge case: margin = 0% when revenue is 0
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 3.2 Export calculation functions for testing
    - calculateProfit(revenue, cost)
    - calculateMargin(revenue, cost)
    - _Requirements: Testing support_
  - [x] 3.3 Write property test for financial calculations
    - **Property 3: Financial Summary Calculation Consistency**
    - **Validates: Requirements 5.4, 5.5, 5.6**

- [x] 4. Checkpoint - Verify financial summary works
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Integrate into PJO Form

- [x] 5. Update PJO form with cost items section
  - [x] 5.1 Add cost_items to form schema with validation
    - Extend pjoSchema with cost_items array
    - Add validation: at least 1 item, category required, description required, estimated_amount > 0
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 5.2 Add CostItemsTable to PJO form after Revenue Items
    - Wire up useFieldArray for cost_items
    - Pass items and onChange handler
    - _Requirements: 1.1_
  - [x] 5.3 Add FinancialSummary below Cost Items
    - Pass totalRevenue from revenue items
    - Pass totalEstimatedCost from cost items
    - _Requirements: 5.1_
  - [x] 5.4 Display validation errors inline
    - Show error messages for invalid fields
    - Prevent submission on validation failure
    - _Requirements: 6.5, 6.6_
  - [x] 5.5 Write property test for validation
    - **Property 4: Validation Prevents Invalid Submission**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 6. Checkpoint - Verify form integration
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Server Actions for Persistence

- [x] 7. Update createPJO action
  - [x] 7.1 Modify createPJO to accept cost_items array
    - Update PJOFormData type to include cost_items
    - _Requirements: 7.1_
  - [x] 7.2 Save PJO header first, then insert cost items
    - Insert all cost items with obtained pjo_id
    - Set status = 'estimated' for all items
    - Set estimated_by = current user ID
    - Calculate and set total_cost_estimated on PJO
    - Calculate and set profit on PJO (revenue - cost)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 8. Update updatePJO action
  - [x] 8.1 Implement diff logic for cost items
    - Identify items to delete (in DB but not in form)
    - Identify items to update (in both with changes)
    - Identify items to insert (in form but not in DB)
    - _Requirements: 7.7_
  - [x] 8.2 Execute delete/update/insert operations
    - Delete removed items
    - Update modified items (preserve status if already confirmed)
    - Insert new items with status = 'estimated'
    - Recalculate and update total_cost_estimated and profit
    - _Requirements: 7.7_

- [x] 9. Load existing items in edit mode
  - [x] 9.1 Fetch cost items when loading PJO for edit
    - Query pjo_cost_items by pjo_id
    - Pass items to form as default values
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 9.2 Write property test for round-trip persistence
    - **Property 6: Data Persistence Round-Trip**
    - **Validates: Requirements 7.1, 7.2, 7.4, 8.1, 8.3**

- [x] 10. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- The pjo_cost_items table already exists with RLS policies
- variance and variance_pct columns are auto-generated in DB
- Use formatIDR from lib/pjo-utils.ts for currency formatting
- Property tests use fast-check library (already installed)
- Follow the same patterns as RevenueItemsTable for consistency

