# Requirements: PJO Revenue Line Items v0.4.3

## Introduction

This feature adds inline revenue line item management directly within the PJO create/edit form. Users can add, edit, and delete revenue items with real-time subtotal and total calculations, replacing the separate revenue items management flow with an integrated form experience.

## Glossary

- **PJO**: Proforma Job Order - a quotation/estimate document
- **Revenue Item**: A line item representing a billable service or product
- **Subtotal**: Calculated value of quantity × unit_price for a single line item
- **Total Revenue**: Sum of all revenue item subtotals
- **Unit**: Measurement unit for the service (TRIP, LOT, CASE, UNIT, KG, M3)

---

## Requirements

### Requirement 1: Revenue Items Section in PJO Form

**User Story:** As an admin, I want to add revenue line items directly in the PJO form, so that I can create complete quotations in a single workflow.

#### Acceptance Criteria

1. WHEN a user opens the PJO create form THEN the system SHALL display a "Revenue Items" section after the logistics information
2. WHEN a user opens the PJO edit form THEN the system SHALL load and display existing revenue items for that PJO
3. WHEN displaying the revenue items section THEN the system SHALL show a table with columns: line number, description, quantity, unit, unit price, subtotal, and delete action
4. WHEN the revenue items section is empty THEN the system SHALL display an "Add Item" button to create the first row

### Requirement 2: Add Revenue Line Item

**User Story:** As an admin, I want to add new revenue line items to the PJO, so that I can itemize all billable services.

#### Acceptance Criteria

1. WHEN a user clicks the "Add Item" button THEN the system SHALL add a new row with default values (quantity: 1, empty description, empty unit price)
2. WHEN a new row is added THEN the system SHALL focus the description input field
3. WHEN adding a row THEN the system SHALL assign the next sequential line number
4. THE system SHALL allow adding multiple revenue items without limit

### Requirement 3: Revenue Item Fields

**User Story:** As an admin, I want to enter details for each revenue item, so that the quotation accurately reflects the services offered.

#### Acceptance Criteria

1. WHEN entering a revenue item THEN the system SHALL provide a text input for description (required)
2. WHEN entering a revenue item THEN the system SHALL provide a number input for quantity with default value of 1
3. WHEN entering a revenue item THEN the system SHALL provide a dropdown for unit with options: TRIP, TRIPS, LOT, CASE, UNIT, KG, M3
4. WHEN entering a revenue item THEN the system SHALL provide a currency input for unit price formatted as IDR
5. WHEN quantity or unit price changes THEN the system SHALL auto-calculate subtotal as quantity × unit_price
6. THE subtotal field SHALL be read-only and display formatted as IDR (Rp XX.XXX.XXX)

### Requirement 4: Delete Revenue Line Item

**User Story:** As an admin, I want to remove revenue line items, so that I can correct mistakes or remove unnecessary items.

#### Acceptance Criteria

1. WHEN a user clicks the delete button on a row THEN the system SHALL remove that row from the form
2. WHEN a row is deleted THEN the system SHALL recalculate the total revenue
3. WHEN a row is deleted THEN the system SHALL renumber remaining rows sequentially
4. IF only one row exists THEN the system SHALL still allow deletion (form can have zero items temporarily)

### Requirement 5: Total Revenue Calculation

**User Story:** As an admin, I want to see the total revenue update in real-time, so that I can verify the quotation amount.

#### Acceptance Criteria

1. WHEN any revenue item subtotal changes THEN the system SHALL recalculate total revenue as sum of all subtotals
2. WHEN displaying total revenue THEN the system SHALL format as IDR (Rp XX.XXX.XXX)
3. WHEN the revenue items list is empty THEN the system SHALL display total revenue as Rp 0

### Requirement 6: Form Validation

**User Story:** As an admin, I want the system to validate revenue items before submission, so that incomplete data is not saved.

#### Acceptance Criteria

1. WHEN submitting the PJO form THEN the system SHALL require at least one revenue item
2. WHEN submitting the PJO form THEN the system SHALL require description for each revenue item
3. WHEN submitting the PJO form THEN the system SHALL require unit_price greater than 0 for each revenue item
4. IF validation fails THEN the system SHALL display specific error messages for each invalid field
5. IF validation fails THEN the system SHALL prevent form submission

### Requirement 7: Data Persistence

**User Story:** As an admin, I want revenue items to be saved with the PJO, so that the data persists correctly.

#### Acceptance Criteria

1. WHEN creating a new PJO THEN the system SHALL save the PJO header first and obtain the pjo_id
2. WHEN creating a new PJO THEN the system SHALL save all revenue items with the obtained pjo_id
3. WHEN creating a new PJO THEN the system SHALL update the PJO total_revenue field with the sum of subtotals
4. WHEN editing an existing PJO THEN the system SHALL delete removed items, update modified items, and insert new items
5. WHEN editing an existing PJO THEN the system SHALL recalculate and update the PJO total_revenue field

### Requirement 8: Revenue Source Linking (Outstanding from v0.4.1)

**User Story:** As an admin, I want to link revenue items to their source documents, so that we can track where pricing came from for AI analysis.

#### Acceptance Criteria

1. WHEN adding a revenue item THEN the system SHALL provide an optional source type dropdown with options: quotation, contract, manual
2. WHEN a source type is selected THEN the system SHALL allow entering an optional source reference ID
3. WHEN displaying revenue items THEN the system SHALL show the source type if linked
4. THE source linking SHALL be optional and default to "manual" if not specified

### Requirement 9: Variance Analysis Dashboard (Outstanding from v0.4.1)

**User Story:** As a manager, I want to see a variance analysis summary, so that I can quickly identify budget issues across all PJOs.

#### Acceptance Criteria

1. WHEN viewing the PJO list page THEN the system SHALL display summary cards at the top showing: total PJOs, over-budget count, total variance amount
2. WHEN a PJO has cost overruns THEN the system SHALL include it in the over-budget count
3. WHEN calculating total variance THEN the system SHALL sum all positive variances (actual - estimated) from exceeded cost items
4. THE dashboard SHALL update when PJO data changes

---

## Acceptance Criteria Summary

### Core Features
- Revenue items section in PJO create/edit form
- Add/delete revenue line items
- Auto-calculate subtotals and total
- Form validation (at least 1 item, required fields)
- Save revenue items to pjo_revenue_items table
- Update PJO.total_revenue on save

### UX Enhancements
- Currency formatting as IDR
- Sequential line numbering
- Focus management on add
- Keyboard navigation between rows (Tab/Enter)
- Duplicate row functionality

### Outstanding Items (from v0.4.1)
- Revenue source linking (quotation/contract/manual)
- Variance analysis dashboard with summary cards
