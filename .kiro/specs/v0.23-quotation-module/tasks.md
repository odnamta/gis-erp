# Implementation Tasks

## Task 1: Database Schema - Core Tables
- [x] Create `quotations` table with all fields from design
- [x] Create `quotation_revenue_items` table
- [x] Create `quotation_cost_items` table
- [x] Create `pursuit_costs` table
- [x] Add indexes for performance
- [x] Apply migration via Supabase MCP

**Requirements**: REQ-1, REQ-2, REQ-3, REQ-5, REQ-6, REQ-7

**Test**: Verify tables exist with correct columns and constraints

---

## Task 2: Database Schema - Modifications
- [x] Add `quotation_id` column to `engineering_assessments` table
- [x] Add `quotation_id` column to `proforma_job_orders` table
- [x] Add constraint to `engineering_assessments` (either pjo_id or quotation_id required)
- [x] Create indexes for new columns
- [x] Apply migration via Supabase MCP

**Requirements**: REQ-4, REQ-9, REQ-12

**Test**: Verify columns added, constraints work, existing data unaffected

---

## Task 3: RLS Policies
- [x] Create RLS policies for `quotations` table (view, insert, update, delete)
- [x] Create RLS policies for `quotation_revenue_items` table
- [x] Create RLS policies for `quotation_cost_items` table
- [x] Create RLS policies for `pursuit_costs` table
- [x] Ensure ops role cannot access quotations
- [x] Apply migration via Supabase MCP

**Requirements**: REQ-13

**Test**: Verify role-based access works correctly

---


## Task 4: TypeScript Types
- [x] Create `types/quotation.ts` with all type definitions
- [x] Add QuotationStatus, RevenueCategory, QuotationCostCategory, PursuitCostCategory types
- [x] Add Quotation, QuotationRevenueItem, QuotationCostItem, PursuitCost interfaces
- [x] Add QuotationFinancials interface
- [x] Update `types/database.ts` after migration (optional - regenerate with Supabase CLI)

**Requirements**: REQ-1, REQ-5, REQ-6, REQ-7

**Test**: TypeScript compilation passes

---

## Task 5: Quotation Utilities
- [x] Create `lib/quotation-utils.ts`
- [x] Implement `generateQuotationNumber()` - format QUO-YYYY-NNNN
- [x] Implement `canTransitionStatus()` - status workflow validation
- [x] Implement `calculateQuotationTotals()` - financial calculations
- [x] Implement `calculatePursuitCostPerShipment()`
- [x] Implement `prepareQuotationForPJO()` - conversion helper
- [x] Implement `splitQuotationByShipments()` - multi-PJO conversion

**Requirements**: REQ-1, REQ-8, REQ-9, REQ-10

**Test**: `__tests__/quotation-utils.test.ts` with property-based tests

---

## Task 6: Quotation Server Actions - CRUD
- [x] Create `app/(main)/quotations/actions.ts`
- [x] Implement `createQuotation()` - auto-generate number, calculate classification
- [x] Implement `updateQuotation()` - recalculate classification on cargo/route changes
- [x] Implement `deleteQuotation()` - soft delete
- [x] Implement `getQuotation()` - fetch with related data
- [x] Implement `listQuotations()` - with filters

**Requirements**: REQ-1, REQ-2, REQ-3, REQ-11

**Test**: `__tests__/quotation-actions.test.ts`

---

## Task 7: Revenue & Cost Item Actions
- [x] Implement `addRevenueItem()`, `updateRevenueItem()`, `deleteRevenueItem()`
- [x] Implement `addCostItem()`, `updateCostItem()`, `deleteCostItem()`
- [x] Recalculate quotation totals after each change
- [x] Validate category values

**Requirements**: REQ-5, REQ-6

**Test**: Add tests to `__tests__/quotation-actions.test.ts`

---

## Task 8: Pursuit Costs Actions
- [x] Implement `addPursuitCost()`, `updatePursuitCost()`, `deletePursuitCost()`
- [x] Recalculate total_pursuit_cost after each change
- [x] Calculate pursuit_cost_per_shipment

**Requirements**: REQ-7

**Test**: `__tests__/pursuit-costs.test.ts`

---


## Task 9: Status Workflow Actions
- [x] Implement `submitQuotation()` - validate engineering complete, set submitted_at
- [x] Implement `markQuotationWon()` - require outcome_date
- [x] Implement `markQuotationLost()` - require outcome_date and reason
- [x] Implement `cancelQuotation()`
- [x] Validate status transitions

**Requirements**: REQ-8

**Test**: Add status transition tests

---

## Task 10: Engineering Actions for Quotations
- [x] Create `app/(main)/quotations/engineering-actions.ts`
- [x] Implement `initializeQuotationEngineeringReview()` - create assessments with quotation_id
- [x] Implement `completeQuotationEngineeringReview()` - update quotation status
- [x] Implement `waiveQuotationEngineeringReview()` - record reason
- [x] Reuse existing engineering utility functions

**Requirements**: REQ-4

**Test**: `__tests__/quotation-engineering-actions.test.ts`

---

## Task 11: Convert to PJO Action
- [x] Implement `convertToPJO()` in actions.ts
- [x] Support single PJO creation
- [x] Support split by estimated_shipments
- [x] Copy customer_id, project_id, commodity, origin, destination, cargo specs
- [x] Set PJO market_type and complexity_score as inherited (read-only)
- [x] Set PJO engineering_status to 'not_required'
- [x] Allocate pursuit_cost_per_shipment to each PJO
- [x] Set quotation_id reference on PJO

**Requirements**: REQ-9

**Test**: `__tests__/quotation-to-pjo.test.ts`

---

## Task 12: Quotation List Page
- [x] Create `app/(main)/quotations/page.tsx`
- [x] Create `components/quotations/quotation-list.tsx`
- [x] Display columns: quotation_number, customer, title, market_type, total_revenue, status
- [x] Add filters: status, market_type, customer, date range
- [x] Add summary cards: count by status, pipeline value, win rate
- [x] Show engineering review indicator

**Requirements**: REQ-11

**Test**: Manual UI testing

---

## Task 13: Quotation Detail Page
- [x] Create `app/(main)/quotations/[id]/page.tsx`
- [x] Create `components/quotations/quotation-detail-view.tsx`
- [x] Display all quotation information
- [x] Show financial summary section
- [x] Show classification display (market type, score, factors)
- [x] Show engineering section (reuse existing components)
- [x] Add action buttons based on status

**Requirements**: REQ-10, REQ-3, REQ-4

**Test**: Manual UI testing

---


## Task 14: Quotation Form Components
- [x] Create `app/(main)/quotations/new/page.tsx`
- [x] Create `app/(main)/quotations/[id]/edit/page.tsx`
- [x] Create `components/quotations/quotation-form.tsx`
- [x] Create `components/quotations/quotation-cargo-specs.tsx`
- [x] Create `components/quotations/quotation-route-specs.tsx`
- [x] Auto-calculate classification on cargo/route changes
- [x] Display classification result in real-time

**Requirements**: REQ-1, REQ-2, REQ-3

**Test**: Manual UI testing

---

## Task 15: Revenue & Cost Items UI
- [x] Create `components/quotations/quotation-revenue-items.tsx`
- [x] Create `components/quotations/quotation-cost-items.tsx`
- [x] Add/Edit/Delete functionality
- [x] Display subtotals and totals
- [x] Category dropdowns with validation

**Requirements**: REQ-5, REQ-6

**Test**: Manual UI testing

---

## Task 16: Pursuit Costs UI
- [x] Create `components/quotations/pursuit-costs-section.tsx`
- [x] Add/Edit/Delete functionality
- [x] Display total and per-shipment calculation
- [x] Category dropdown
- [x] Date picker for cost_date

**Requirements**: REQ-7

**Test**: Manual UI testing

---

## Task 17: Engineering Integration UI
- [x] Create `components/quotations/quotation-engineering-section.tsx`
- [x] Reuse `engineering-status-banner.tsx` with quotation context
- [x] Reuse `engineering-assessments-section.tsx` with quotation_id
- [x] Reuse dialog components (assign, complete, waive)
- [x] Block submission if engineering not complete

**Requirements**: REQ-4

**Test**: Manual UI testing

---

## Task 18: Convert to PJO Dialog
- [x] Create `components/quotations/convert-to-pjo-dialog.tsx`
- [x] Option: Create single PJO or split by shipments
- [x] Preview what will be created
- [x] Show pursuit cost allocation
- [x] Confirm and execute conversion

**Requirements**: REQ-9

**Test**: Manual UI testing

---


## Task 19: Notification Triggers
- [x] Add `notifyQuotationEngineeringAssigned()` to notification-triggers.ts
- [x] Add `notifyQuotationEngineeringCompleted()` to notification-triggers.ts
- [x] Add `notifyQuotationWon()` to notification-triggers.ts
- [x] Add `notifyQuotationDeadlineApproaching()` to notification-triggers.ts
- [x] Call notifications from appropriate actions

**Requirements**: REQ-14

**Test**: `__tests__/notification-triggers.test.ts` - add quotation notification tests

---

## Task 20: PJO Legacy Support
- [x] Update PJO detail view to show "Inherited from Quotation" indicator when quotation_id is set
- [x] Make classification fields read-only when quotation_id is set
- [x] Allow creating PJOs without quotation (legacy flow)
- [x] Update PJO form to handle both modes

**Requirements**: REQ-12

**Test**: Verify legacy PJOs still work, new PJOs from quotations show inherited data

---

## Task 21: Navigation & Permissions
- [x] Add "Quotations" to main navigation
- [x] Hide from ops role
- [x] Add permission checks to all actions
- [x] Restrict profit margin visibility to owner, admin, manager, finance

**Requirements**: REQ-13

**Test**: Verify navigation and permissions work correctly

---

## Task 22: Property-Based Tests
- [x] Add tests for Property 1: Quotation Number Uniqueness
- [x] Add tests for Property 2: Classification Consistency
- [x] Add tests for Property 3: Engineering Requirement
- [x] Add tests for Property 4: Status Workflow Validity
- [x] Add tests for Property 5: Engineering Blocking
- [x] Add tests for Property 6: Financial Calculation Accuracy
- [x] Add tests for Property 7: Pursuit Cost Per Shipment
- [x] Add tests for Property 8: PJO Inheritance
- [x] Add tests for Property 9: Legacy PJO Support
- [x] Add tests for Property 10: Revenue Item Subtotal
- [x] Add tests for Property 11: Role-Based Access
- [x] Add tests for Property 12: Conversion Creates Valid PJO

**Requirements**: All

**Test**: Run all property-based tests - 41 tests passing

---

## Task 23: Documentation
- [x] Update README with Quotation module information
- [x] Update steering document with new workflow
- [x] Add inline code comments

**Requirements**: All

**Test**: Documentation review
