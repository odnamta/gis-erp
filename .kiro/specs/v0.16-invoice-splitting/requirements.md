# Requirements Document

## Introduction

This document specifies the requirements for enabling invoice splitting functionality in Gama ERP. The feature allows generating multiple invoices from a single Job Order (JO) based on contract payment terms. Common scenarios include Down Payment, Progress Payment, and Final Payment structures commonly used in logistics contracts.

## Glossary

- **Job Order (JO)**: An active work order linked to an approved PJO representing actual logistics work being performed
- **Invoice Term**: A payment milestone defined in a contract specifying when and how much to invoice (e.g., Down Payment 30%)
- **Invoice Splitting**: The process of generating multiple invoices from a single JO based on predefined payment terms
- **Term Trigger**: The event or condition that enables an invoice term to be invoiced (e.g., JO Created, Surat Jalan issued, Berita Acara signed)
- **Surat Jalan**: Delivery note document confirming goods have been delivered
- **Berita Acara**: Handover document confirming project completion and acceptance
- **VAT (Value Added Tax)**: Indonesian tax at 11% applied to invoice amounts
- **Invoiceable Amount**: The total revenue from a JO that can be invoiced (equals final_revenue)

## Requirements

### Requirement 1

**User Story:** As an admin user, I want to define invoice payment terms on a Job Order, so that I can structure invoicing according to contract agreements.

#### Acceptance Criteria

1. WHEN an admin views a JO detail page THEN the System SHALL display an Invoice Terms section showing current payment structure
2. WHEN an admin selects a payment structure preset THEN the System SHALL populate invoice terms with the corresponding percentages and triggers
3. WHEN an admin selects "Custom" payment structure THEN the System SHALL allow adding, editing, and removing individual invoice terms
4. WHEN invoice terms are saved THEN the System SHALL validate that total percentage equals exactly 100%
5. WHEN invoice terms total does not equal 100% THEN the System SHALL display an error message and prevent saving
6. WHEN at least one invoice has been generated from a JO THEN the System SHALL prevent modification of existing invoice terms

### Requirement 2

**User Story:** As an admin user, I want to use preset invoice term templates, so that I can quickly configure common payment structures.

#### Acceptance Criteria

1. WHEN an admin opens the payment structure dropdown THEN the System SHALL display preset options: Single Invoice (100%), DP + Final (30/70), DP + Delivery + Final (30/50/20), and Custom
2. WHEN an admin selects "Single Invoice" preset THEN the System SHALL create one term with 100% percentage and "jo_created" trigger
3. WHEN an admin selects "DP + Final" preset THEN the System SHALL create two terms: 30% Down Payment with "jo_created" trigger and 70% Final with "delivery" trigger
4. WHEN an admin selects "DP + Delivery + Final" preset THEN the System SHALL create three terms: 30% Down Payment with "jo_created" trigger, 50% Upon Delivery with "surat_jalan" trigger, and 20% Final with "berita_acara" trigger

### Requirement 3

**User Story:** As an admin user, I want to generate invoices for individual payment terms, so that I can bill customers according to the agreed payment schedule.

#### Acceptance Criteria

1. WHEN a term has trigger condition met and no invoice exists THEN the System SHALL display a "Create Invoice" button for that term
2. WHEN a term has trigger condition not met THEN the System SHALL display the term as "Locked" with the required trigger condition
3. WHEN a term already has an invoice generated THEN the System SHALL display the invoice number and status with a "View" link
4. WHEN an admin clicks "Create Invoice" for a term THEN the System SHALL generate an invoice with the term's percentage of the JO revenue
5. WHEN an invoice is generated for a term THEN the System SHALL calculate VAT at 11% and add it to the invoice total
6. WHEN an invoice is generated THEN the System SHALL update the term's invoiced status to true and store the invoice reference

### Requirement 4

**User Story:** As an admin user, I want to track total invoiced amount on a Job Order, so that I can monitor invoicing progress against the contract value.

#### Acceptance Criteria

1. WHEN viewing a JO with invoice terms THEN the System SHALL display total invoiced amount versus total invoiceable amount
2. WHEN an invoice is generated for a term THEN the System SHALL update the JO's total_invoiced field with the cumulative invoiced amount
3. WHEN viewing the invoices section THEN the System SHALL display each term's amount, status, and invoice reference in a table format

### Requirement 5

**User Story:** As an admin user, I want to create custom invoice term configurations, so that I can handle non-standard payment arrangements.

#### Acceptance Criteria

1. WHEN an admin adds a custom term THEN the System SHALL allow specifying term name, percentage, description, and trigger condition
2. WHEN an admin edits a custom term percentage THEN the System SHALL recalculate the term amount based on JO revenue
3. WHEN an admin removes a custom term THEN the System SHALL remove it from the terms list and update the total percentage display
4. WHEN custom terms are configured THEN the System SHALL display real-time validation of total percentage with warning if not 100%

### Requirement 6

**User Story:** As a system administrator, I want the database schema to support invoice splitting, so that invoice terms and relationships are properly stored.

#### Acceptance Criteria

1. WHEN the migration runs THEN the System SHALL add invoice_terms JSONB column to job_orders table with default empty array
2. WHEN the migration runs THEN the System SHALL add total_invoiced DECIMAL(15,2) column to job_orders table with default 0
3. WHEN the migration runs THEN the System SHALL add invoiceable_amount DECIMAL(15,2) column to job_orders table
4. WHEN the migration runs THEN the System SHALL add invoice_term VARCHAR(50) column to invoices table
5. WHEN the migration runs THEN the System SHALL add term_percentage DECIMAL(5,2) column to invoices table
6. WHEN the migration runs THEN the System SHALL add term_description VARCHAR(200) column to invoices table
