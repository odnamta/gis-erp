# Implementation Plan: PJO Itemized Financials & Budget Control

## Phase 1: Database & Types (P0)

- [x] 1. Database migrations
  - [x] 1.1 Create pjo_revenue_items table with indexes
    - _Requirements: REQ-1.1, REQ-1.2, REQ-1.3_
  - [x] 1.2 Create pjo_cost_items table with indexes
    - _Requirements: REQ-2.1, REQ-2.2, REQ-2.3_
  - [x] 1.3 Alter job_orders table with new columns
    - _Requirements: REQ-6.3, REQ-6.4, REQ-7.1_
  - [x] 1.4 Alter proforma_job_orders table with new columns
    - _Requirements: REQ-6.5_

- [x] 2. TypeScript types
  - [x] 2.1 Add CostCategory, CostItemStatus, RevenueSourceType, JOStatus types
    - _Requirements: REQ-2.3, REQ-3.4_
  - [x] 2.2 Add PJORevenueItem interface
    - _Requirements: REQ-1.2_
  - [x] 2.3 Add PJOCostItem interface
    - _Requirements: REQ-2.2, REQ-3.3_
  - [x] 2.4 Add JobOrder and JobOrderWithRelations interfaces
    - _Requirements: REQ-6.4, REQ-7.2_

## Phase 2: Utility Functions (P0)

- [x] 3. New utility functions in lib/pjo-utils.ts
  - [x] 3.1 Implement calculateRevenueTotal(items)
    - _Requirements: REQ-1.4_
  - [x] 3.2 Implement calculateCostTotal(items, type)
    - _Requirements: REQ-2.4_
  - [x] 3.3 Implement analyzeBudget(costItems) returning BudgetAnalysis
    - _Requirements: REQ-4.3_
  - [x] 3.4 Implement determineCostStatus(estimated, actual)
    - _Requirements: REQ-3.4_
  - [x] 3.5 Implement generateJONumber(sequence, date)
    - _Requirements: REQ-6.3_

- [x] 4. Property tests for new utilities
  - [x] 4.1 Test calculateRevenueTotal with various item combinations
  - [x] 4.2 Test calculateCostTotal for estimated vs actual
  - [x] 4.3 Test analyzeBudget returns correct counts and flags
  - [x] 4.4 Test determineCostStatus for all status outcomes
  - [x] 4.5 Test generateJONumber format (JO-NNNN/CARGO/MM/YYYY)

## Phase 3: Revenue Items (P0)

- [x] 5. Revenue item server actions
  - [x] 5.1 Create app/(main)/proforma-jo/revenue-actions.ts
  - [x] 5.2 Implement createRevenueItem(pjoId, data)
    - _Requirements: REQ-1.1_
  - [x] 5.3 Implement updateRevenueItem(id, data) with draft-only check
    - _Requirements: REQ-1.5_
  - [x] 5.4 Implement deleteRevenueItem(id) with draft-only check
    - _Requirements: REQ-1.5_
  - [x] 5.5 Implement getRevenueItems(pjoId)

- [x] 6. Revenue item components
  - [x] 6.1 Create components/pjo/revenue-item-form.tsx (dialog)
    - Form fields: description, quantity, unit, unit_price, notes
    - Zod validation schema
    - _Requirements: REQ-1.2_
  - [x] 6.2 Create components/pjo/revenue-items-section.tsx
    - Table display with subtotals
    - Add/Edit/Delete buttons (disabled when not draft)
    - Total revenue display
    - _Requirements: REQ-1.3, REQ-1.4, REQ-1.5, REQ-1.6_

## Phase 4: Cost Items - Estimation (P0)

- [x] 7. Cost item server actions
  - [x] 7.1 Create app/(main)/proforma-jo/cost-actions.ts
  - [x] 7.2 Implement createCostItem(pjoId, data)
    - _Requirements: REQ-2.1_
  - [x] 7.3 Implement updateCostEstimate(id, data) with draft-only check
    - _Requirements: REQ-2.5_
  - [x] 7.4 Implement deleteCostItem(id) with draft-only check
    - _Requirements: REQ-2.5_
  - [x] 7.5 Implement getCostItems(pjoId)

- [x] 8. Cost item components (estimation view)
  - [x] 8.1 Create components/pjo/cost-item-form.tsx (dialog)
    - Form fields: category dropdown, description, estimated_amount, notes
    - Zod validation schema
    - _Requirements: REQ-2.2, REQ-2.3_
  - [x] 8.2 Create components/pjo/cost-items-section.tsx
    - Table with category, description, estimated amount
    - Add/Edit/Delete buttons (disabled when not draft)
    - Total estimated cost, profit, margin display
    - _Requirements: REQ-2.4, REQ-2.5, REQ-2.6_

## Phase 5: Cost Confirmation - Operations (P0)

- [x] 9. Cost confirmation server actions
  - [x] 9.1 Implement confirmActualCost(id, data) in cost-actions.ts
    - Validate PJO is approved
    - Require justification if actual > estimated
    - Update status based on variance
    - _Requirements: REQ-3.1, REQ-3.2, REQ-3.4, REQ-3.5_
  - [x] 9.2 Implement updatePJOTotals(pjoId) to recalculate all_costs_confirmed
    - _Requirements: REQ-4.3_

- [x] 10. Cost confirmation components
  - [x] 10.1 Create components/pjo/cost-confirmation-section.tsx
    - Table: category, description, budget (estimated), actual input, variance, status
    - Justification textarea (shown when actual > estimated)
    - Budget health indicators (✅ ⚠️ ⏳)
    - _Requirements: REQ-3.2, REQ-3.3, REQ-3.5, REQ-4.1, REQ-4.2_
  - [x] 10.2 Create components/pjo/budget-summary.tsx
    - Total budget, confirmed actual, items pending count
    - Overall budget health status
    - _Requirements: REQ-4.3_

## Phase 6: Update PJO Form & Detail (P0)

- [x] 11. Update PJO detail view (form kept for backward compatibility)
  - [x] 11.1 PJO detail view shows revenue items section
  - [x] 11.2 PJO detail view shows cost items section
  - [x] 11.3 Submission validates line items exist
    - _Requirements: REQ-5.1, REQ-5.2, REQ-5.3, REQ-5.4_

- [x] 12. Update PJO detail view
  - [x] 12.1 Modify pjo-detail-view.tsx to show revenue items table
  - [x] 12.2 Show cost items table (estimation view for non-ops)
  - [x] 12.3 Show cost confirmation section (for ops when approved)
  - [x] 12.4 Add budget summary component
  - [x] 12.5 Add conversion status indicator

## Phase 7: PJO to JO Conversion (P1)

- [x] 13. Conversion server actions
  - [x] 13.1 Create app/(main)/proforma-jo/conversion-actions.ts
  - [x] 13.2 Implement checkConversionReadiness(pjoId)
    - Check all costs confirmed
    - Check PJO approved
    - Return blockers list and summary
    - _Requirements: REQ-6.1, REQ-6.2_
  - [x] 13.3 Implement convertToJobOrder(pjoId)
    - Generate JO number
    - Create JobOrder record with final figures
    - Update PJO with converted_to_jo flag and job_order_id
    - _Requirements: REQ-6.3, REQ-6.4, REQ-6.5_

- [x] 14. Conversion UI
  - [x] 14.1 Create components/pjo/conversion-status.tsx
    - Show readiness status
    - List blockers if not ready
    - "Convert to Job Order" button when ready
    - _Requirements: REQ-6.1, REQ-6.2_
  - [x] 14.2 Add conversion status to PJO detail page

## Phase 8: Job Order Module (P1)

- [x] 15. JO server actions
  - [x] 15.1 Create app/(main)/job-orders/actions.ts
  - [x] 15.2 Implement getJobOrders() with relations
  - [x] 15.3 Implement getJobOrder(id) with relations
  - [x] 15.4 Implement submitToFinance(joId)
    - _Requirements: REQ-7.4_
  - [x] 15.5 Implement markCompleted(joId)

- [x] 16. JO components
  - [x] 16.1 Create components/ui/jo-status-badge.tsx
    - _Requirements: REQ-7.1_
  - [x] 16.2 Create components/job-orders/jo-table.tsx
    - Columns: JO number, date, customer, project, revenue, profit, status
    - _Requirements: REQ-7.2_
  - [x] 16.3 Create components/job-orders/jo-detail-view.tsx
    - Display all JO data
    - Show source PJO link
    - Action buttons based on status
    - _Requirements: REQ-7.3_

- [x] 17. JO pages
  - [x] 17.1 Create app/(main)/job-orders/page.tsx (list)
  - [x] 17.2 Create app/(main)/job-orders/[id]/page.tsx (detail)
  - [x] 17.3 Add "Job Orders" to sidebar navigation

## Phase 9: Testing & Polish (P0/P1)

- [x] 18. Unit tests
  - [x] 18.1 Test calculateRevenueTotal
  - [x] 18.2 Test calculateCostTotal
  - [x] 18.3 Test determineCostStatus
  - [x] 18.4 Test analyzeBudget
  - [x] 18.5 Test generateJONumber

- [x] 19. Integration tests 
  - [x] 19.1 Test full PJO workflow: create → add items → submit → approve
  - [x] 19.2 Test cost confirmation workflow
  - [x] 19.3 Test PJO to JO conversion workflow

- [x] 20. Final checkpoint
  - [x] 20.1 Verify all existing tests still pass (103 tests)
  - [x] 20.2 Verify build passes
  - [x] 20.3 Manual QA of full workflow
  - [x] 20.4 Update steering docs if needed

## Data Migration Note

After implementing, existing PJOs with single total_revenue/total_expenses values will need migration:
1. Create one revenue item per PJO with total_revenue as subtotal
2. Create one cost item per PJO with total_expenses as estimated_amount
3. This can be done via SQL migration or manual data entry
