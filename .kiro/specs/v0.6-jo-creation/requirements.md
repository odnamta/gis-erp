# Requirements Document: v0.6 - Job Order Creation from Completed PJO

## Introduction

This feature enables the creation of Job Orders (JO) from approved PJOs that have all costs confirmed. When Operations completes filling actual costs, Admin can convert the PJO to a Job Order with one click. The JO captures final financial amounts (using actual costs), links back to the source PJO, and follows a status workflow from active through completion to finance submission.

## Glossary

- **PJO**: Proforma Job Order - a quotation document with estimated and actual costs
- **JO**: Job Order - the actual work order created from an approved PJO
- **Final Revenue**: Sum of all revenue item subtotals from the source PJO
- **Final Cost**: Sum of all actual_amount values from PJO cost items
- **Final Profit**: Final Revenue minus Final Cost
- **Final Margin**: (Final Profit / Final Revenue) × 100, expressed as percentage
- **Conversion**: The process of creating a JO from a completed PJO
- **Submit to Finance**: Action that marks JO ready for invoice creation

## Requirements

### Requirement 1: Conversion Trigger

**User Story:** As Admin, I want to see a prominent button to create a Job Order when a PJO is ready, so that I can proceed with the workflow efficiently.

#### Acceptance Criteria

1. WHEN a user views a PJO detail page with status "approved" AND all_costs_confirmed is true THEN the System SHALL display a prominent "Create Job Order" button
2. WHEN a PJO status is not "approved" THEN the System SHALL hide the "Create Job Order" button
3. WHEN a PJO has all_costs_confirmed as false THEN the System SHALL hide the "Create Job Order" button
4. WHEN a PJO has already been converted to a JO THEN the System SHALL hide the "Create Job Order" button and display a link to the existing JO
5. WHEN the "Create Job Order" button is displayed THEN the System SHALL show it with a checkmark icon (✓) to indicate readiness

### Requirement 2: Job Order Creation

**User Story:** As Admin, I want the system to automatically calculate final amounts when creating a JO, so that financial data is accurate.

#### Acceptance Criteria

1. WHEN a user clicks "Create Job Order" THEN the System SHALL calculate final_revenue as the sum of all pjo_revenue_items subtotals
2. WHEN creating a JO THEN the System SHALL calculate final_cost as the sum of all pjo_cost_items actual_amount values
3. WHEN creating a JO THEN the System SHALL calculate final_profit as (final_revenue - final_cost)
4. WHEN creating a JO THEN the System SHALL calculate final_margin as (final_profit / final_revenue × 100) when final_revenue is greater than zero
5. WHEN final_revenue is zero THEN the System SHALL set final_margin to zero
6. WHEN creating a JO THEN the System SHALL generate a unique jo_number in format "JO-NNNN/CARGO/MM/YYYY"
7. WHEN creating a JO THEN the System SHALL copy commodity, quantity, quantity_unit, pol, pod, etd, eta, and carrier_type from the source PJO

### Requirement 3: PJO Status Update

**User Story:** As Admin, I want the PJO status to update automatically after conversion, so that the workflow state is clear.

#### Acceptance Criteria

1. WHEN a JO is successfully created THEN the System SHALL update the source PJO status to "converted"
2. WHEN a JO is created THEN the System SHALL set the PJO converted_to_jo_id field to the new JO's ID
3. WHEN conversion fails THEN the System SHALL display an error message and leave the PJO status unchanged
4. WHEN a PJO is converted THEN the System SHALL prevent any further modifications to the PJO

### Requirement 4: Job Order List Page

**User Story:** As Admin, I want to view all Job Orders with their financial summary, so that I can monitor active work.

#### Acceptance Criteria

1. WHEN a user navigates to /job-orders THEN the System SHALL display a table of all Job Orders
2. WHEN displaying the JO list THEN the System SHALL show columns for JO Number, PJO Reference, Customer, Revenue, Cost, Profit, Margin, and Status
3. WHEN displaying monetary values THEN the System SHALL format them as IDR (Rp XX.XXX.XXX)
4. WHEN displaying margin THEN the System SHALL show it as a percentage with one decimal place
5. WHEN a user clicks on a JO row THEN the System SHALL navigate to the JO detail page

### Requirement 5: Job Order Detail Page

**User Story:** As Admin, I want to view complete JO details including financial breakdowns, so that I can review the work order.

#### Acceptance Criteria

1. WHEN a user navigates to /job-orders/[id] THEN the System SHALL display the JO detail page
2. WHEN displaying JO details THEN the System SHALL show JO number, status, jo_date, and all shipment details (commodity, quantity, POL, POD, ETD, ETA)
3. WHEN displaying JO details THEN the System SHALL show a link to the source PJO
4. WHEN displaying JO details THEN the System SHALL show revenue breakdown from PJO revenue items
5. WHEN displaying JO details THEN the System SHALL show cost breakdown from PJO cost items with actual amounts
6. WHEN displaying JO details THEN the System SHALL show final revenue, final cost, final profit, and final margin

### Requirement 6: Job Order Status Workflow

**User Story:** As Admin, I want to progress a JO through its workflow stages, so that I can track work completion.

#### Acceptance Criteria

1. WHEN a JO is created THEN the System SHALL set initial status to "active"
2. WHEN a JO has status "active" THEN the System SHALL display a "Mark as Completed" button
3. WHEN a user clicks "Mark as Completed" THEN the System SHALL update status to "completed"
4. WHEN a JO has status "completed" THEN the System SHALL display a "Submit to Finance" button
5. WHEN a JO has status other than "active" THEN the System SHALL hide the "Mark as Completed" button
6. WHEN a JO has status other than "completed" THEN the System SHALL hide the "Submit to Finance" button

### Requirement 7: Submit to Finance

**User Story:** As Admin, I want to submit a completed JO to Finance, so that invoice creation can proceed.

#### Acceptance Criteria

1. WHEN a user clicks "Submit to Finance" THEN the System SHALL update JO status to "submitted_to_finance"
2. WHEN submitting to finance THEN the System SHALL set submitted_to_finance flag to true
3. WHEN submitting to finance THEN the System SHALL record submitted_to_finance_at as the current timestamp
4. WHEN submitting to finance THEN the System SHALL record submitted_by as the current user ID
5. WHEN submission is successful THEN the System SHALL display a success message and redirect to invoice creation flow
6. WHEN a JO is submitted to finance THEN the System SHALL prevent status from being changed back to "completed" or "active"

### Requirement 8: Access Control

**User Story:** As a system administrator, I want to restrict JO actions to authorized users, so that workflow integrity is maintained.

#### Acceptance Criteria

1. WHEN a user with role "admin" or "ops" accesses JO pages THEN the System SHALL allow viewing JO details
2. WHEN a user with role "admin" accesses a JO THEN the System SHALL allow status transitions
3. WHEN a user with role "ops" accesses a JO THEN the System SHALL display status action buttons in read-only mode
4. WHEN a user with role "manager" accesses a JO THEN the System SHALL allow viewing and status transitions
5. WHEN a user with other roles accesses JO pages THEN the System SHALL display JO data in read-only mode

### Requirement 9: Data Integrity

**User Story:** As Admin, I want JO data to be reliably persisted, so that financial records are accurate.

#### Acceptance Criteria

1. WHEN creating a JO THEN the System SHALL insert a record into job_orders with all required fields
2. WHEN creating a JO THEN the System SHALL use a database transaction to ensure PJO update and JO creation are atomic
3. WHEN displaying JO financial data THEN the System SHALL query the source PJO's revenue and cost items for breakdowns
4. WHEN a JO references a PJO THEN the System SHALL maintain referential integrity via pjo_id foreign key
5. WHEN calculating totals THEN the System SHALL use DECIMAL precision to avoid floating-point errors
