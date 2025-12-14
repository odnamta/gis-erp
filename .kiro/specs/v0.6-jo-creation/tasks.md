# Implementation Plan: v0.6 - Job Order Creation from Completed PJO

## Summary

This implementation plan covers the JO creation feature from approved PJOs. Based on code analysis, the core functionality is already implemented. Remaining tasks focus on adding utility functions for property-based testing, enhancing the JO table with margin column, and adding revenue/cost breakdown to JO detail view.

---

- [x] 1. Core JO Creation Infrastructure (Already Implemented)
  - Server actions for JO creation (`convertToJobOrder`)
  - Server actions for status transitions (`markCompleted`, `submitToFinance`)
  - Conversion readiness check (`checkConversionReadiness`)
  - JO number generation (`generateJONumber`)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2_

- [x] 2. PJO Conversion UI (Already Implemented)
  - ConversionStatus component with readiness check
  - Create Job Order button with blockers display
  - Financial summary before conversion
  - Link to existing JO when already converted
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Job Order List Page (Already Implemented)
  - JO table with columns (JO Number, Date, Customer, Project, Revenue, Profit, Status)
  - IDR formatting for monetary values
  - Navigation to JO detail page
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 4. Job Order Detail Page (Already Implemented)
  - JO detail view with basic info, logistics, financials
  - Link to source PJO
  - Status action buttons (Mark Completed, Submit to Finance)
  - Timeline section
  - _Requirements: 5.1, 5.2, 5.3, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 5. Status Workflow (Already Implemented)
  - Status transitions (active -> completed -> submitted_to_finance)
  - Validation for status transitions
  - Timestamp recording for status changes
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6. Add Margin Column to JO Table
  - [x] 6.1 Update JO table to display margin percentage with one decimal place
    - Add margin column between Profit and Status columns
    - Format as percentage with one decimal place (e.g., "15.5%")
    - Color code: green for positive, red for negative
    - _Requirements: 4.4_

- [x] 7. Add Revenue/Cost Breakdown to JO Detail
  - [x] 7.1 Fetch and display PJO revenue items in JO detail view
    - Query pjo_revenue_items via the linked PJO
    - Display as a table with description, quantity, unit, unit_price, subtotal
    - _Requirements: 5.4_
  - [x] 7.2 Fetch and display PJO cost items with actual amounts in JO detail view
    - Query pjo_cost_items via the linked PJO
    - Display as a table with category, description, estimated, actual, variance
    - _Requirements: 5.5_

- [x] 8. Create JO Utility Functions for Testing
  - [x] 8.1 Implement `canCreateJobOrder(pjo)` utility function
    - Returns true only when status is "approved" AND all_costs_confirmed is true AND converted_to_jo is false
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 8.2 Implement `calculateJOFinancials(revenueItems, costItems)` utility function
    - Calculate final_revenue, final_cost, final_profit, final_margin
    - Handle zero revenue case for margin calculation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 8.3 Implement `getAvailableJOActions(status)` utility function
    - Return available actions based on current JO status
    - "Mark as Completed" only for "active" status
    - "Submit to Finance" only for "completed" status
    - _Requirements: 6.2, 6.4, 6.5, 6.6_
  - [x] 8.4 Implement `canTransitionJOStatus(currentStatus, newStatus)` utility function
    - Validate allowed status transitions
    - Prevent transitions back from "submitted_to_finance"
    - _Requirements: 7.6_
  - [x] 8.5 Implement `formatMargin(margin)` utility function
    - Format margin as percentage with one decimal place
    - _Requirements: 4.4_
  - [x] 8.6 Implement `canEditJO(userRole)` utility function
    - Return true only for "admin" or "manager" roles
    - _Requirements: 8.2, 8.4_

- [x] 9. Property-Based Tests for JO Utilities
  - [x] 9.1 Write property test for `canCreateJobOrder`
    - **Property 1: JO Creation Readiness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
  - [x] 9.2 Write property test for `calculateJOFinancials` - revenue calculation
    - **Property 2: Final Revenue Calculation**
    - **Validates: Requirements 2.1**
  - [x] 9.3 Write property test for `calculateJOFinancials` - cost calculation
    - **Property 3: Final Cost Calculation**
    - **Validates: Requirements 2.2**
  - [x] 9.4 Write property test for `calculateJOFinancials` - profit and margin
    - **Property 4: Profit and Margin Calculation**
    - **Validates: Requirements 2.3, 2.4, 2.5**
  - [x] 9.5 Write property test for `generateJONumber` format
    - **Property 5: JO Number Format**
    - **Validates: Requirements 2.6**
  - [x] 9.6 Write property test for `getAvailableJOActions`
    - **Property 7: JO Status Actions**
    - **Validates: Requirements 6.2, 6.4, 6.5, 6.6**
  - [x] 9.7 Write property test for `canTransitionJOStatus`
    - **Property 8: Status Transition Validation**
    - **Validates: Requirements 7.6**
  - [x] 9.8 Write property test for `formatMargin`
    - **Property 9: Margin Formatting**
    - **Validates: Requirements 4.4**
  - [x] 9.9 Write property test for `canEditJO`
    - **Property 10: JO Access Control**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
