# Implementation Plan: PJO Revenue Line Items v0.4.3

## Phase 1: Revenue Items Table Component

- [x] 1. Create RevenueItemsTable component
  - [x] 1.1 Create components/pjo/revenue-items-table.tsx with table structure
    - Implement table with columns: #, Description, Qty, Unit, Unit Price, Subtotal, Actions
    - Use shadcn/ui Table, Input, Select, Button components
    - _Requirements: 1.3, 3.1, 3.2, 3.3, 3.4_
  - [x] 1.2 Implement add item functionality
    - Add "Add Item" button that creates new row with defaults (qty: 1)
    - Focus description input on new row
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 1.3 Implement delete item functionality
    - Add delete button per row
    - Renumber remaining rows after deletion
    - _Requirements: 4.1, 4.3, 4.4_
  - [x] 1.4 Implement auto-calculation
    - Calculate subtotal as quantity × unit_price on change
    - Calculate and display total revenue
    - Format all currency values as IDR
    - _Requirements: 3.5, 3.6, 5.1, 5.2, 5.3_
  - [x] 1.5 Implement keyboard navigation
    - Tab moves to next field in row, then to next row
    - Enter on last field adds new row
    - _Requirements: UX Enhancements_
  - [x] 1.6 Implement duplicate row functionality
    - Add duplicate button per row (copy icon)
    - Duplicates row values and inserts below current row
    - _Requirements: UX Enhancements_
  - [x] 1.7 Write property test for subtotal calculation
    - **Property 1: Subtotal Calculation Consistency**
    - **Validates: Requirements 3.5**
  - [x] 1.8 Write property test for total sum
    - **Property 2: Total Revenue Sum Consistency**
    - **Validates: Requirements 4.2, 5.1**
  - [x] 1.9 Write property test for line numbering
    - **Property 3: Sequential Line Numbering After Deletion**
    - **Validates: Requirements 4.3**

- [x] 2. Checkpoint - Verify component works
  - All tests pass (121 tests)

## Phase 2: Integrate into PJO Form

- [x] 3. Update PJO form with revenue items section
  - [x] 3.1 Add revenue_items to form schema with validation
    - Extend pjoSchema with revenue_items array
    - Add validation: at least 1 item, description required, unit_price > 0
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 3.2 Add RevenueItemsTable to PJO form between Logistics and Financials
    - Wire up useFieldArray for revenue_items
    - Pass items and onChange handler
    - _Requirements: 1.1, 1.4_
  - [x] 3.3 Update Financials section to show calculated total (read-only)
    - Remove manual total_revenue input
    - Display calculated total from revenue items
    - _Requirements: 5.1, 5.2_
  - [x] 3.4 Display validation errors inline
    - Show error messages for invalid fields
    - Prevent submission on validation failure
    - _Requirements: 6.4, 6.5_
  - [x] 3.5 Write property test for validation
    - **Property 4: Validation Prevents Invalid Submission**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.5**

- [x] 4. Checkpoint - Verify form integration
  - Build succeeds, all tests pass

## Phase 3: Server Actions for Persistence

- [x] 5. Update createPJO action
  - [x] 5.1 Modify createPJO to accept revenue_items array
    - Update PJOFormData type to include revenue_items
    - _Requirements: 7.1_
  - [x] 5.2 Save PJO header first, then insert revenue items
    - Insert all revenue items with obtained pjo_id
    - Calculate and set total_revenue on PJO
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 6. Update updatePJO action
  - [x] 6.1 Implement diff logic for revenue items
    - Identify items to delete (in DB but not in form)
    - Identify items to update (in both with changes)
    - Identify items to insert (in form but not in DB)
    - _Requirements: 7.4_
  - [x] 6.2 Execute delete/update/insert operations
    - Delete removed items
    - Update modified items
    - Insert new items
    - Recalculate and update total_revenue
    - _Requirements: 7.4, 7.5_

- [x] 7. Load existing items in edit mode
  - [x] 7.1 Fetch revenue items when loading PJO for edit
    - Query pjo_revenue_items by pjo_id
    - Pass items to form as default values
    - _Requirements: 1.2_
  - [x] 7.2 Write property test for round-trip persistence
    - **Property 5: Data Persistence Round-Trip**
    - **Validates: Requirements 7.2, 7.4**
  - [x] 7.3 Write property test for total sync
    - **Property 6: Total Revenue Sync on Save**
    - **Validates: Requirements 7.3, 7.5**

- [x] 8. Checkpoint - Verify persistence works
  - Build succeeds, all tests pass

## Phase 4: Outstanding Items from Previous Specs

- [x] 9. Revenue source linking (from v0.4.1 P2)
  - [x] 9.1 Add source type selector to revenue item form
    - Add dropdown for source_type: quotation, contract, manual
    - Add optional source_id field for linking to source document
    - _Requirements: v0.4.1 REQ-8 (AI-Ready Data)_
  - [x] 9.2 Display source info in revenue items table
    - Show source type badge if linked
    - _Requirements: v0.4.1 REQ-8_

- [x] 10. Variance analysis dashboard (from v0.4.1 P2)
  - [x] 10.1 Create components/pjo/variance-dashboard.tsx
    - Show cost variance summary across all PJOs
    - Display over-budget items count and total variance
    - _Requirements: v0.4.1 REQ-4.4, REQ-8.4_
  - [x] 10.2 Add variance dashboard to PJO list page
    - Show summary cards at top of PJO list
    - Include: total PJOs, over-budget count, total variance amount
    - _Requirements: v0.4.1 REQ-4.4_
  - [x] 10.3 Add variance trend chart to dashboard
    - Show variance trend by month (last 6 months bar chart)
    - _Requirements: v0.4.1 REQ-8.4_
  - [ ] 10.4 Add variance by category chart to dashboard
    - Show variance by month/category if time permits
    - _Requirements: v0.4.1 REQ-8_

- [x] 11. Final Checkpoint
  - Build succeeds, 133 tests pass (all 6 property tests included)

## Notes

- The pjo_revenue_items table already exists with RLS policies
- subtotal column is auto-generated in DB (quantity * unit_price)
- Use formatIDR from lib/pjo-utils.ts for currency formatting
- Property tests use fast-check library (already installed)
