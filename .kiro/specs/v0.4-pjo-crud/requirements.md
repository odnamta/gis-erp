# Requirements Document

## Introduction

This feature implements Proforma Job Order (PJO) Management for Gama ERP. A PJO is a quotation/cost estimate created before actual work begins. PJOs are linked to projects and include logistics details, financial calculations, and an approval workflow. After approval, a PJO can be converted into a Job Order (JO).

## Glossary

- **PJO**: Proforma Job Order - a quotation/cost estimate created before actual work
- **JO**: Job Order - actual work order created after PJO approval
- **Project**: A work engagement linked to a customer, containing multiple PJOs
- **Customer**: A client company that owns projects
- **POL**: Point of Loading - origin location for cargo transport
- **POD**: Point of Destination - delivery location for cargo transport
- **ETD**: Estimated Time of Departure
- **ETA**: Estimated Time of Arrival
- **Carrier Type**: Vehicle type used for transport (FUSO, TRAILER 20FT, TRAILER 40FT)
- **Commodity**: The goods being transported
- **IDR**: Indonesian Rupiah currency
- **Status**: PJO lifecycle state (draft, pending_approval, approved, rejected)

## Requirements

### Requirement 1

**User Story:** As a user, I want to view a list of all PJOs with key information, so that I can monitor quotations and their statuses.

#### Acceptance Criteria

1. WHEN a user navigates to the PJO list page THEN the Gama ERP System SHALL fetch and display all PJOs from the database ordered by creation date descending
2. WHEN PJOs are displayed THEN the Gama ERP System SHALL show PJO number, date, customer name, project name, total revenue, profit, and status in a table format
3. WHEN displaying monetary values THEN the Gama ERP System SHALL format amounts in Indonesian Rupiah format with period separators (e.g., Rp 30.000.000)
4. WHEN the PJO table is loading THEN the Gama ERP System SHALL display a loading indicator
5. WHEN no PJOs exist in the database THEN the Gama ERP System SHALL display an empty state message with a prompt to create the first PJO
6. IF fetching PJOs fails THEN the Gama ERP System SHALL display an error message to the user

### Requirement 2

**User Story:** As a user, I want to filter PJOs by status and date range, so that I can find specific quotations quickly.

#### Acceptance Criteria

1. WHEN a user selects a status filter THEN the Gama ERP System SHALL display only PJOs matching that status
2. WHEN a user selects a date range filter THEN the Gama ERP System SHALL display only PJOs with jo_date within that range
3. WHEN both filters are applied THEN the Gama ERP System SHALL display PJOs matching both criteria
4. WHEN filters are cleared THEN the Gama ERP System SHALL display all PJOs

### Requirement 3

**User Story:** As a user, I want to create a new PJO with all required details, so that I can prepare quotations for projects.

#### Acceptance Criteria

1. WHEN a user navigates to the create PJO page THEN the Gama ERP System SHALL display a form with four sections: Basic Info, Logistics, Financials, and Notes
2. WHEN displaying the Basic Info section THEN the Gama ERP System SHALL show fields for jo_date (defaulting to today), project selection dropdown, commodity text input, quantity number input, and quantity_unit dropdown with options TRIP, TRIPS, LOT, CASE
3. WHEN displaying the Logistics section THEN the Gama ERP System SHALL show fields for POL text input, POD text input, ETD date picker, ETA date picker, and carrier_type dropdown
4. WHEN displaying the Financials section THEN the Gama ERP System SHALL show fields for total_revenue currency input, total_expenses currency input, auto-calculated profit display, and auto-calculated margin percentage display
5. WHEN a user enters revenue and expenses THEN the Gama ERP System SHALL automatically calculate profit as revenue minus expenses
6. WHEN a user enters revenue and expenses THEN the Gama ERP System SHALL automatically calculate margin percentage as profit divided by revenue multiplied by 100
7. WHEN displaying the Notes section THEN the Gama ERP System SHALL show a textarea for additional notes
8. WHEN a user selects a project THEN the Gama ERP System SHALL associate the PJO with that project and its customer
9. WHEN a user submits the form with valid data THEN the Gama ERP System SHALL insert the PJO into the database with status set to draft
10. WHEN a PJO is successfully created THEN the Gama ERP System SHALL redirect to the PJO detail page and show a success toast
11. IF creating a PJO fails THEN the Gama ERP System SHALL display an error toast with the failure reason

### Requirement 4

**User Story:** As a user, I want the system to auto-generate unique PJO numbers, so that quotations have consistent identifiers.

#### Acceptance Criteria

1. WHEN a new PJO is created THEN the Gama ERP System SHALL auto-generate a PJO number in the format NNNN/CARGO/MM/YYYY where NNNN is a 4-digit sequence, MM is the Roman numeral month, and YYYY is the year
2. WHEN generating a PJO number THEN the Gama ERP System SHALL query the last PJO number for the current month and increment the sequence by 1
3. WHEN no PJOs exist for the current month THEN the Gama ERP System SHALL start the sequence at 0001
4. WHEN generating the month portion THEN the Gama ERP System SHALL use Roman numerals (I, II, III, IV, V, VI, VII, VIII, IX, X, XI, XII)

### Requirement 5

**User Story:** As a user, I want to view detailed PJO information, so that I can review all quotation data and related records.

#### Acceptance Criteria

1. WHEN a user clicks on a PJO number or view button THEN the Gama ERP System SHALL navigate to the PJO detail page
2. WHEN the PJO detail page loads THEN the Gama ERP System SHALL display all PJO fields in read-only card format organized by section
3. WHEN viewing a PJO THEN the Gama ERP System SHALL display the related project name with a link to the project detail page
4. WHEN viewing a PJO THEN the Gama ERP System SHALL display the related customer name with a link to the customer detail page
5. WHEN viewing a PJO THEN the Gama ERP System SHALL display action buttons appropriate to the current status
6. IF the PJO ID does not exist THEN the Gama ERP System SHALL display a 404 error page

### Requirement 6

**User Story:** As a user, I want to edit an existing PJO, so that I can update quotation details before approval.

#### Acceptance Criteria

1. WHEN a user clicks edit on a draft PJO THEN the Gama ERP System SHALL navigate to the edit page with the form pre-filled with existing data
2. WHEN editing a PJO THEN the Gama ERP System SHALL allow changing all fields except pjo_number and created_by
3. WHEN a PJO is successfully updated THEN the Gama ERP System SHALL redirect to the PJO detail page and show a success toast
4. IF updating a PJO fails THEN the Gama ERP System SHALL display an error toast with the failure reason
5. WHEN a PJO status is not draft THEN the Gama ERP System SHALL disable the edit action

### Requirement 7

**User Story:** As a user, I want to submit a draft PJO for approval, so that managers can review and approve quotations.

#### Acceptance Criteria

1. WHEN viewing a draft PJO THEN the Gama ERP System SHALL display a "Submit for Approval" button
2. WHEN a user clicks "Submit for Approval" THEN the Gama ERP System SHALL change the PJO status to pending_approval
3. WHEN a PJO is submitted for approval THEN the Gama ERP System SHALL refresh the page and show a success toast
4. WHEN a PJO status is not draft THEN the Gama ERP System SHALL hide the "Submit for Approval" button

### Requirement 8

**User Story:** As a manager, I want to approve or reject PJOs, so that I can control which quotations proceed to job orders.

#### Acceptance Criteria

1. WHEN a manager views a pending_approval PJO THEN the Gama ERP System SHALL display "Approve" and "Reject" buttons
2. WHEN a manager clicks "Approve" THEN the Gama ERP System SHALL change the PJO status to approved and record the approver
3. WHEN a manager clicks "Reject" THEN the Gama ERP System SHALL prompt for a rejection reason before changing status to rejected
4. WHEN a PJO is approved or rejected THEN the Gama ERP System SHALL refresh the page and show a success toast
5. WHEN a PJO status is not pending_approval THEN the Gama ERP System SHALL hide the approval action buttons

### Requirement 9

**User Story:** As a user, I want visual status indicators on PJOs, so that I can quickly identify quotation states.

#### Acceptance Criteria

1. WHEN displaying draft status THEN the Gama ERP System SHALL show a gray badge
2. WHEN displaying pending_approval status THEN the Gama ERP System SHALL show a yellow badge
3. WHEN displaying approved status THEN the Gama ERP System SHALL show a green badge
4. WHEN displaying rejected status THEN the Gama ERP System SHALL show a red badge

### Requirement 10

**User Story:** As a user, I want to delete a PJO, so that I can remove incorrect or cancelled quotations.

#### Acceptance Criteria

1. WHEN a user clicks delete on a draft PJO THEN the Gama ERP System SHALL display a confirmation dialog
2. WHEN a user confirms deletion THEN the Gama ERP System SHALL remove the PJO from the database
3. WHEN a PJO is successfully deleted THEN the Gama ERP System SHALL refresh the list and show a success toast
4. WHEN a PJO status is not draft THEN the Gama ERP System SHALL disable the delete action
5. IF deleting a PJO fails THEN the Gama ERP System SHALL display an error toast with the failure reason

### Requirement 11

**User Story:** As a user viewing a project, I want to see its PJOs, so that I can understand the project's quotation history.

#### Acceptance Criteria

1. WHEN viewing project detail THEN the Gama ERP System SHALL display a list of PJOs for that project
2. WHEN viewing project PJOs THEN the Gama ERP System SHALL show PJO number, date, status, and total revenue
3. WHEN a user clicks "Add PJO" on project detail THEN the Gama ERP System SHALL navigate to create PJO page with that project pre-selected
