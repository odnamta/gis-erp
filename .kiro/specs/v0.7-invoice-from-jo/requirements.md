# Requirements Document

## Introduction

This document specifies the requirements for creating invoices from Job Orders (JO) in the Gama ERP system. The Invoice from JO feature enables administration staff to generate invoices for completed job orders that have been submitted to finance. The system will auto-generate invoice numbers, copy revenue items as invoice line items, calculate VAT (11%), track payment status, and maintain the relationship between invoices and their source job orders.

## Glossary

- **Invoice**: A billing document sent to customers requesting payment for services rendered
- **Job Order (JO)**: An active work order created from an approved PJO, containing final revenue and cost figures
- **Invoice Number**: A unique identifier following the format `INV-YYYY-NNNN` (e.g., INV-2025-0001)
- **Invoice Line Item**: An individual billable item on an invoice, copied from PJO revenue items
- **Due Date**: The date by which payment is expected from the customer
- **Subtotal**: The sum of all invoice line item amounts before tax
- **VAT (PPN)**: Value Added Tax at 11% rate applied to the subtotal
- **Grand Total**: The sum of subtotal and VAT amount
- **Invoice Status**: The current state of an invoice (draft, sent, paid, overdue, cancelled)
- **Submitted to Finance**: A JO status indicating the job is ready for invoicing

## Requirements

### Requirement 1

**User Story:** As an admin user, I want to generate an invoice from a submitted Job Order, so that I can bill the customer for services rendered.

#### Acceptance Criteria

1. WHEN an admin views a JO with status "submitted_to_finance" THEN the Invoice_System SHALL display a "Generate Invoice" button
2. WHEN an admin clicks "Generate Invoice" THEN the Invoice_System SHALL display an invoice form pre-populated with JO and customer data
3. WHEN the invoice form is displayed THEN the Invoice_System SHALL auto-generate the next sequential invoice number in format INV-YYYY-NNNN
4. WHEN the invoice form is displayed THEN the Invoice_System SHALL set invoice_date to the current date
5. WHEN the invoice form is displayed THEN the Invoice_System SHALL set due_date to 30 days from the current date
6. WHEN an admin attempts to generate an invoice from a JO that is not "submitted_to_finance" THEN the Invoice_System SHALL prevent the action and display an error message

### Requirement 2

**User Story:** As an admin user, I want invoice line items to be automatically copied from PJO revenue items, so that I do not have to re-enter billing details.

#### Acceptance Criteria

1. WHEN generating an invoice THEN the Invoice_System SHALL copy all pjo_revenue_items as invoice_line_items
2. WHEN copying revenue items THEN the Invoice_System SHALL preserve description, quantity, unit, and unit_price for each line item
3. WHEN copying revenue items THEN the Invoice_System SHALL assign sequential line_number values starting from 1
4. WHEN copying revenue items THEN the Invoice_System SHALL calculate subtotal as quantity multiplied by unit_price for each line item
5. WHEN displaying the invoice form THEN the Invoice_System SHALL allow editing of line item descriptions, quantities, and unit prices

### Requirement 3

**User Story:** As an admin user, I want VAT to be automatically calculated, so that invoices include correct tax amounts.

#### Acceptance Criteria

1. WHEN calculating invoice totals THEN the Invoice_System SHALL compute subtotal as the sum of all line item subtotals
2. WHEN calculating invoice totals THEN the Invoice_System SHALL apply a VAT rate of 11%
3. WHEN calculating invoice totals THEN the Invoice_System SHALL compute vat_amount as subtotal multiplied by 0.11
4. WHEN calculating invoice totals THEN the Invoice_System SHALL compute grand_total as subtotal plus vat_amount
5. WHEN line items are modified THEN the Invoice_System SHALL recalculate subtotal, vat_amount, and grand_total automatically

### Requirement 4

**User Story:** As an admin user, I want to save the invoice and update the Job Order status, so that the billing record is persisted and the JO reflects its invoiced state.

#### Acceptance Criteria

1. WHEN an admin saves the invoice THEN the Invoice_System SHALL persist the invoice with status "draft"
2. WHEN an admin saves the invoice THEN the Invoice_System SHALL persist all invoice_line_items linked to the invoice
3. WHEN an invoice is successfully created THEN the Invoice_System SHALL update the JO status to "invoiced"
4. WHEN an invoice is successfully created THEN the Invoice_System SHALL link the invoice to the JO via jo_id

### Requirement 5

**User Story:** As an admin user, I want to view and manage all invoices, so that I can track billing and payment status.

#### Acceptance Criteria

1. WHEN an admin navigates to the invoices page THEN the Invoice_System SHALL display a table of all invoices with columns for invoice number, customer, JO number, subtotal, VAT, grand total, due date, and status
2. WHEN displaying the invoice list THEN the Invoice_System SHALL sort invoices by creation date in descending order
3. WHEN an admin clicks on an invoice row THEN the Invoice_System SHALL navigate to the invoice detail page
4. WHEN displaying invoice data THEN the Invoice_System SHALL format monetary values in Indonesian Rupiah (IDR) format

### Requirement 6

**User Story:** As an admin user, I want to view detailed invoice information, so that I can review all billing details and line items.

#### Acceptance Criteria

1. WHEN an admin views an invoice detail page THEN the Invoice_System SHALL display invoice number, invoice date, customer name, JO number, and status
2. WHEN displaying invoice details THEN the Invoice_System SHALL show all invoice_line_items in a table with line number, description, quantity, unit, unit price, and subtotal
3. WHEN displaying invoice details THEN the Invoice_System SHALL show subtotal, VAT amount, and grand total
4. WHEN displaying invoice details THEN the Invoice_System SHALL provide a link to navigate to the source Job Order

### Requirement 7

**User Story:** As an admin user, I want to manage invoice status through its lifecycle, so that I can track sending and payment.

#### Acceptance Criteria

1. WHEN an admin sends an invoice in "draft" status THEN the Invoice_System SHALL update the status to "sent" and record the sent_at timestamp
2. WHEN an admin records payment for a "sent" invoice THEN the Invoice_System SHALL update the status to "paid" and record the paid_at timestamp
3. WHEN an invoice is marked as "paid" THEN the Invoice_System SHALL update the linked JO status to "closed"
4. WHEN an admin cancels an invoice THEN the Invoice_System SHALL update the status to "cancelled" and revert the JO status to "submitted_to_finance"
5. WHEN an invoice due date has passed and status is "sent" THEN the Invoice_System SHALL allow marking the invoice as "overdue"

### Requirement 8

**User Story:** As an admin user, I want to filter and search invoices, so that I can quickly find specific billing records.

#### Acceptance Criteria

1. WHEN an admin filters by status THEN the Invoice_System SHALL display only invoices matching the selected status
2. WHEN an admin searches by invoice number THEN the Invoice_System SHALL display invoices with matching invoice numbers
3. WHEN an admin searches by customer name THEN the Invoice_System SHALL display invoices for customers with matching names

### Requirement 9

**User Story:** As a system user, I want invoice data to be persisted correctly, so that billing records are accurate and reliable.

#### Acceptance Criteria

1. WHEN an invoice is created THEN the Invoice_System SHALL persist the invoice to the database with all required fields
2. WHEN an invoice is updated THEN the Invoice_System SHALL update the updated_at timestamp
3. WHEN serializing invoice data for storage THEN the Invoice_System SHALL encode monetary values as DECIMAL(15,2)
4. WHEN deserializing invoice data for display THEN the Invoice_System SHALL parse stored values back to their original representation
