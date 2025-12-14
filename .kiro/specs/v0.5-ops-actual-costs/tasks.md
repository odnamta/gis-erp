# Implementation Plan

- [x] 1. Create core utility functions for cost calculations
  - [x] 1.1 Create calculateCostStatus function in lib/pjo-utils.ts
    - Implement status logic: confirmed (≤90%), at_risk (90-100%), exceeded (>100%)
    - Return status, variance, and variance percentage
    - _Requirements: 10.2, 4.1, 4.3, 5.1_
  - [x] 1.2 Write property test for status calculation
    - **Property 1: Status Calculation**
    - **Validates: Requirements 4.1, 4.3, 5.1, 10.2**
  - [x] 1.3 Create calculateVariance function
    - Calculate variance as (actual - estimated)
    - Calculate variance percentage as ((actual - estimated) / estimated) * 100
    - _Requirements: 2.4, 3.2, 4.2_
  - [x] 1.4 Write property test for variance calculation
    - **Property 2: Variance Calculation**
    - **Validates: Requirements 2.4, 3.2, 4.2**
  - [x] 1.5 Create canEditCostItems permission function
    - Check user role is 'ops' or 'admin'
    - Check PJO status is 'approved'
    - Check PJO not converted to JO
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 1.6 Write property test for edit permission
    - **Property 4: Edit Permission**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create server actions for cost confirmation
  - [x] 3.1 Create confirmCostItem server action in app/(main)/proforma-jo/actions.ts
    - Update pjo_cost_items with actual_amount, status, confirmed_by, confirmed_at
    - Save justification for exceeded items
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 10.1_
  - [x] 3.2 Create checkAllCostsConfirmed helper function
    - Query cost items to check if all have actual amounts
    - Calculate total_cost_actual as sum of actual amounts
    - Determine has_cost_overruns flag
    - Update PJO record when all confirmed
    - _Requirements: 7.4, 10.3, 10.4, 10.5_
  - [x] 3.3 Write property test for total cost calculation
    - **Property 6: Total Cost Calculation**
    - **Validates: Requirements 10.4**
  - [x] 3.4 Write property test for has overruns flag
    - **Property 7: Has Overruns Flag**
    - **Validates: Requirements 10.5**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create the costs page route and server component
  - [x] 5.1 Create app/(main)/proforma-jo/[id]/costs/page.tsx
    - Fetch PJO with project/customer relations
    - Fetch all cost items for the PJO
    - Validate PJO exists and is approved
    - Determine canEdit based on user role and PJO status
    - Pass data to client component
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6. Create client components for cost entry
  - [x] 6.1 Create CostItemRow component in components/pjo/cost-item-row.tsx
    - Display category, description, budget amount
    - Actual amount input field with IDR formatting
    - Real-time variance and status display
    - Justification textarea (shown when exceeded)
    - Confirm button with loading state
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4_
  - [x] 6.2 Create BudgetWarning component in components/pjo/budget-warning.tsx
    - Yellow warning for at_risk status (90-100%)
    - Red error for exceeded status (>100%)
    - Display variance amount and percentage
    - _Requirements: 4.1, 4.2, 5.1, 5.5_
  - [x] 6.3 Create ProgressIndicator component in components/pjo/progress-indicator.tsx
    - Display "X of Y cost items confirmed"
    - Success message when all confirmed
    - Warning badge if has overruns
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 6.4 Write property test for progress calculation
    - **Property 5: Progress Calculation**
    - **Validates: Requirements 7.1**

- [x] 7. Create main costs client component
  - [x] 7.1 Create CostsClient component in app/(main)/proforma-jo/[id]/costs/costs-client.tsx
    - PJO header with number, status, project, customer, commodity
    - Cost items table with all CostItemRow components
    - Progress indicator
    - Create Job Order button (enabled when all confirmed)
    - Handle confirm actions and state updates
    - _Requirements: 1.2, 2.1, 8.1, 8.2, 8.3, 8.4_

- [x] 8. Implement justification validation
  - [x] 8.1 Add justification validation logic to CostItemRow
    - Require minimum 10 characters for exceeded items
    - Show character count feedback
    - Disable Confirm button until valid
    - _Requirements: 5.2, 5.3, 5.4_
  - [x] 8.2 Write property test for justification validation
    - **Property 3: Justification Validation**
    - **Validates: Requirements 5.3, 5.4, 6.2**

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Add navigation and access control
  - [x] 10.1 Add "Fill Actual Costs" link to PJO detail page for approved PJOs
    - Show link only when PJO status is approved
    - Show link only when not yet converted to JO
    - _Requirements: 1.1_
  - [x] 10.2 Implement read-only mode for unauthorized users
    - Hide input fields and Confirm buttons
    - Display actual amounts as text if already confirmed
    - _Requirements: 9.2, 1.4_
  - [x] 10.3 Add disabled state after JO conversion
    - Show all data in read-only mode
    - Display message that costs are locked
    - _Requirements: 6.7, 9.4_

- [x] 11. Add currency formatting utility
  - [x] 11.1 Ensure formatCurrency function handles IDR formatting correctly
    - Format with "Rp " prefix and period separators
    - Handle edge cases (0, negative, large numbers)
    - _Requirements: 2.2_
  - [x] 11.2 Write property test for currency formatting
    - **Property 8: Currency Formatting**
    - **Validates: Requirements 2.2**

- [x] 12. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
