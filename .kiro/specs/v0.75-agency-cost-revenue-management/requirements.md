# Requirements Document

## Introduction

This document defines the requirements for the Agency Cost & Revenue Management module (v0.75). The system provides comprehensive management of agency costs, revenue, and profitability per shipment with vendor invoice tracking. This enables the agency department to track financial performance at the shipment level, manage vendor payables, and ensure accurate billing to customers.

## Glossary

- **Shipment_Cost**: A cost line item associated with a booking, representing expenses incurred from vendors
- **Shipment_Revenue**: A revenue line item associated with a booking, representing charges billed to customers
- **Charge_Type**: A predefined category of charge (e.g., Ocean Freight, THC, B/L Fee) that can be either cost, revenue, or both
- **Vendor_Invoice**: An invoice received from a vendor/service provider for services rendered
- **Profitability_View**: A calculated view showing revenue minus costs and profit margin percentage
- **Exchange_Rate**: The conversion rate used to convert foreign currency amounts to IDR
- **Billing_Status**: The status of a revenue item (unbilled, billed, paid)
- **Payment_Status**: The status of a cost item or vendor invoice (unpaid, partial, paid)

## Requirements

### Requirement 1: Charge Type Catalog Management

**User Story:** As an agency administrator, I want to manage a catalog of standard charge types, so that costs and revenue can be consistently categorized across all shipments.

#### Acceptance Criteria

1. THE System SHALL provide a predefined catalog of charge types including freight, origin, destination, documentation, customs, and other categories
2. WHEN a charge type is created, THE System SHALL require charge_code, charge_name, charge_category, and charge_type fields
3. THE System SHALL classify each charge type as 'revenue', 'cost', or 'both' to indicate valid usage contexts
4. WHEN displaying charge types, THE System SHALL order them by display_order field for consistent presentation
5. THE System SHALL support soft-delete of charge types via is_active flag to preserve historical data integrity

### Requirement 2: Shipment Cost Management

**User Story:** As an agency operator, I want to record and track costs associated with each shipment, so that I can monitor expenses and manage vendor payments.

#### Acceptance Criteria

1. WHEN adding a cost line, THE System SHALL require linking to a booking, charge type, and amount
2. WHEN a cost is recorded in foreign currency, THE System SHALL calculate amount_idr using the provided exchange_rate
3. WHEN a cost is marked as taxable, THE System SHALL calculate tax_amount based on tax_rate and compute total_amount
4. THE System SHALL allow associating costs with a vendor and tracking vendor invoice details
5. WHEN updating payment status, THE System SHALL track paid_amount, paid_date, and payment_reference
6. THE System SHALL support payment statuses of 'unpaid', 'partial', and 'paid'

### Requirement 3: Shipment Revenue Management

**User Story:** As an agency operator, I want to record revenue charges for each shipment, so that I can track what to bill customers and monitor collection status.

#### Acceptance Criteria

1. WHEN adding a revenue line, THE System SHALL require linking to a booking, charge type, and amount
2. WHEN revenue is recorded in foreign currency, THE System SHALL calculate amount_idr using the provided exchange_rate
3. WHEN revenue is marked as taxable, THE System SHALL calculate tax_amount based on tax_rate and compute total_amount
4. THE System SHALL track billing_status as 'unbilled', 'billed', or 'paid'
5. WHEN revenue is invoiced, THE System SHALL allow linking to the customer invoice record

### Requirement 4: Vendor Invoice Management

**User Story:** As an agency finance user, I want to record and track vendor invoices, so that I can manage payables and ensure timely payments.

#### Acceptance Criteria

1. WHEN creating a vendor invoice, THE System SHALL require invoice_number, vendor_id, invoice_date, and total_amount
2. THE System SHALL allow linking multiple cost lines to a single vendor invoice
3. WHEN a vendor invoice is paid, THE System SHALL update payment_status and track paid_amount
4. THE System SHALL calculate and display days until due_date or days overdue
5. THE System SHALL support document attachment for vendor invoice files

### Requirement 5: Shipment Profitability Calculation

**User Story:** As an agency manager, I want to view profitability metrics for each shipment, so that I can assess financial performance and identify issues.

#### Acceptance Criteria

1. THE System SHALL calculate total_revenue as the sum of all revenue line amounts_idr for a booking
2. THE System SHALL calculate total_cost as the sum of all cost line amounts_idr for a booking
3. THE System SHALL calculate gross_profit as total_revenue minus total_cost
4. THE System SHALL calculate profit_margin_pct as (gross_profit / total_revenue) * 100 when total_revenue > 0
5. WHEN total_revenue is zero, THE System SHALL display profit_margin_pct as 0

### Requirement 6: Shipment Financials UI

**User Story:** As an agency user, I want a comprehensive financial view for each booking, so that I can see all costs, revenue, and profitability in one place.

#### Acceptance Criteria

1. WHEN viewing booking financials, THE System SHALL display summary cards showing total revenue, total cost, gross profit, and margin percentage
2. THE System SHALL display a revenue table with charge description, currency, amount, tax, and billing status
3. THE System SHALL display a cost table with charge description, vendor, amount, tax, and payment status
4. THE System SHALL display a vendor invoices section with invoice number, vendor, amount, due date, and status
5. THE System SHALL provide actions to add new cost and revenue lines from the financials view

### Requirement 7: Multi-Currency Support

**User Story:** As an agency operator, I want to record costs and revenue in different currencies, so that I can accurately track international shipment finances.

#### Acceptance Criteria

1. THE System SHALL support recording amounts in any currency with a currency code field
2. WHEN a non-IDR currency is used, THE System SHALL require an exchange_rate to be provided
3. THE System SHALL calculate and store amount_idr for all line items regardless of original currency
4. WHEN displaying financial summaries, THE System SHALL use amount_idr for all calculations

### Requirement 8: Tax Calculation

**User Story:** As an agency finance user, I want automatic tax calculations on costs and revenue, so that I can ensure accurate financial reporting.

#### Acceptance Criteria

1. THE System SHALL default tax_rate to 11% (Indonesian VAT) for taxable items
2. WHEN is_taxable is true, THE System SHALL calculate tax_amount as amount * (tax_rate / 100)
3. THE System SHALL calculate total_amount as amount + tax_amount
4. THE System SHALL allow marking individual line items as non-taxable when applicable

### Requirement 9: Profitability Reports

**User Story:** As an agency manager, I want profitability reports across shipments, so that I can analyze overall financial performance.

#### Acceptance Criteria

1. THE System SHALL provide a shipment profitability view aggregating all bookings with their financial metrics
2. WHEN filtering the profitability view, THE System SHALL support filtering by customer, date range, and status
3. THE System SHALL display profit margin with visual indicators (green for target met, red for below target)
4. THE System SHALL support a default profit margin target of 20%

### Requirement 10: Unbilled Revenue Tracking

**User Story:** As an agency finance user, I want to track unbilled revenue, so that I can ensure all services are properly invoiced.

#### Acceptance Criteria

1. THE System SHALL identify revenue lines with billing_status = 'unbilled'
2. WHEN displaying unbilled revenue, THE System SHALL group by booking and show total unbilled amount
3. THE System SHALL provide a report of all unbilled revenue across bookings
