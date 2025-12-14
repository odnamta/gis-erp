# Requirements: PJO Itemized Financials & Budget Control

## Overview
Enhance the PJO module to support itemized revenue and cost tracking, implement budget control for operations, and enable automatic conversion to Job Orders.

## User Stories

### Revenue Management

**REQ-1: Revenue Line Items**
- **1.1** As an admin, I want to add multiple revenue line items to a PJO so that I can itemize different charges
- **1.2** Each revenue item must have: description, quantity, unit, unit_price
- **1.3** Subtotal auto-calculates as quantity × unit_price
- **1.4** Total revenue auto-calculates from sum of all line item subtotals
- **1.5** Revenue items can be edited/deleted only when PJO is in draft status
- **1.6** Revenue items are locked once PJO is approved

### Cost Estimation (Marketing/Admin)

**REQ-2: Cost Line Items**
- **2.1** As an admin, I want to add multiple cost items with estimates so that I can budget each expense category
- **2.2** Each cost item must have: category, description, estimated_amount
- **2.3** Cost categories: trucking, port_charges, documentation, handling, customs, insurance, storage, labor, fuel, tolls, other
- **2.4** Total estimated cost auto-calculates from sum of all estimated amounts
- **2.5** Cost items can be edited/deleted only when PJO is in draft status
- **2.6** Estimated amounts become the maximum budget cap after approval

### Cost Confirmation (Operations)

**REQ-3: Actual Cost Entry**
- **3.1** As operations, I want to fill actual costs for each item after PJO approval so that we track real expenses
- **3.2** Actual amount field is only editable when PJO status is approved
- **3.3** System auto-calculates variance (actual - estimated) and variance percentage
- **3.4** Cost item status auto-updates: confirmed (within budget), exceeded (over budget), under_budget
- **3.5** When actual exceeds estimated, justification text is required
- **3.6** System shows warning when actual reaches 90% of estimated

### Budget Control

**REQ-4: Budget Enforcement**
- **4.1** Estimated cost = maximum budget for operations
- **4.2** Display budget health indicators: ✅ under budget, ⚠️ over budget, ⏳ pending
- **4.3** Show budget summary: total budget, confirmed actual, items pending
- **4.4** Flag PJOs with cost overruns for review

### PJO Submission Validation

**REQ-5: Submission Requirements**
- **5.1** PJO submission requires at least 1 revenue item
- **5.2** PJO submission requires at least 1 cost item
- **5.3** Total estimated cost must be less than total revenue (positive margin)
- **5.4** Show validation errors if requirements not met

### PJO to Job Order Conversion

**REQ-6: Auto-Conversion**
- **6.1** System checks conversion readiness when all cost items have actual amounts
- **6.2** Conversion triggers when: all costs confirmed, PJO approved, revenue unchanged
- **6.3** Generate JO number format: JO-NNNN/CARGO/MM/YYYY
- **6.4** JO captures final figures: final_revenue, final_cost, final_profit, final_margin
- **6.5** Link JO back to source PJO

### Job Order Management

**REQ-7: JO Workflow**
- **7.1** JO statuses: active, completed, submitted_to_finance, invoiced, closed
- **7.2** JO list page showing all job orders with status, customer, revenue, profit
- **7.3** JO detail page showing all captured data from PJO
- **7.4** "Submit to Finance" action moves JO to submitted_to_finance status

### Data Structure for AI Analysis

**REQ-8: AI-Ready Data**
- **8.1** Store route information (POL, POD) with cost data
- **8.2** Store cargo details (type, quantity, carrier) with cost data
- **8.3** Store time context (month, quarter, year) for trend analysis
- **8.4** Flag over-budget items for pattern analysis

## Acceptance Criteria

### Must Have (P0)
- [ ] Can add multiple revenue line items to a PJO
- [ ] Can add multiple cost items with estimates to a PJO
- [ ] Revenue and cost totals auto-calculate from line items
- [ ] PJO submission requires at least 1 revenue and 1 cost item
- [ ] Operations can fill actual costs after PJO approval
- [ ] System warns when actual exceeds estimated
- [ ] Justification required for over-budget items
- [ ] All existing tests continue to pass
- [ ] New tests for line item functionality

### Should Have (P1)
- [ ] Auto-convert PJO to JO when all costs confirmed
- [ ] JO list and detail pages functional
- [ ] Submit to Finance workflow works
- [ ] Budget summary visible on PJO detail

### Nice to Have (P2/P3)
- [ ] Revenue linked to quotation/contract records
- [ ] Date format displays as DD/MM/YYYY
- [ ] Variance analysis dashboard
