# Implementation Plan: Agency Cost & Revenue Management

## Overview

This implementation plan covers the Agency Cost & Revenue Management module (v0.75). The plan follows an incremental approach, starting with database schema and types, then building utility functions, server actions, and finally UI components.

## Tasks

- [x] 1. Database Schema and Type Definitions
  - [x] 1.1 Create database migration for agency_charge_types table with default charge types
    - Create table with charge_code, charge_name, charge_category, charge_type, default_currency, is_taxable, display_order, is_active
    - Insert default charge types for freight, origin, destination, documentation, customs, and other categories
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Create database migration for shipment_costs table
    - Create table with all fields including booking_id, charge_type_id, currency, amounts, tax fields, vendor fields, payment tracking
    - Add foreign key constraints and indexes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 1.3 Create database migration for shipment_revenue table
    - Create table with all fields including booking_id, charge_type_id, currency, amounts, tax fields, billing_status, invoice_id
    - Add foreign key constraints and indexes
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 1.4 Create database migration for agency_vendor_invoices table
    - Create table with invoice_number, vendor_id, dates, amounts, payment tracking, cost_ids
    - Add foreign key constraints and indexes
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 1.5 Create shipment_profitability view
    - Create view aggregating costs and revenue per booking
    - Calculate total_revenue, total_cost, gross_profit, profit_margin_pct
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 1.6 Add TypeScript type definitions to types/agency.ts
    - Add all interfaces for charge types, costs, revenue, vendor invoices, profitability
    - Add database row types, form data types, and filter types
    - Add status type constants and labels
    - _Requirements: All_

- [x] 2. Core Utility Functions
  - [x] 2.1 Create lib/cost-revenue-utils.ts with calculation functions
    - Implement convertToIdr(amount, currency, exchangeRate)
    - Implement calculateTax(amount, taxRate, isTaxable)
    - Implement calculateTotalWithTax(amount, taxRate, isTaxable)
    - Implement calculateProfitMargin(revenue, cost)
    - Implement calculateDaysUntilDue(dueDate)
    - Implement getMarginIndicator(margin, target)
    - _Requirements: 2.2, 2.3, 5.4, 4.4, 8.1, 8.2, 8.3, 9.3_

  - [x] 2.2 Write property tests for currency conversion
    - **Property 1: Currency Conversion Consistency**
    - Test with random amounts and exchange rates
    - Verify amount_idr = amount * exchange_rate
    - **Validates: Requirements 2.2, 3.2, 7.3**

  - [x] 2.3 Write property tests for tax calculation
    - **Property 2: Tax Calculation Accuracy**
    - Test with random amounts and tax rates
    - Verify tax_amount and total_amount calculations
    - Test taxable vs non-taxable items
    - **Validates: Requirements 2.3, 3.3, 8.2, 8.3, 8.4**

  - [x] 2.4 Write property tests for profitability calculation
    - **Property 3: Profitability Calculation Correctness**
    - Test with random sets of costs and revenue
    - Verify aggregation and margin calculations
    - Test edge case of zero revenue
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

  - [x] 2.5 Implement row-to-entity transformation functions
    - Implement transformChargeTypeRow, transformCostRow, transformRevenueRow
    - Implement transformVendorInvoiceRow, transformProfitabilityRow
    - _Requirements: All_

  - [x] 2.6 Implement validation functions
    - Implement validateCostData, validateRevenueData, validateVendorInvoiceData
    - Implement validateChargeTypeData
    - _Requirements: 1.2, 2.1, 3.1, 4.1_

- [x] 3. Checkpoint - Core utilities complete
  - Ensure all property tests pass, ask the user if questions arise.

- [x] 4. Server Actions for Charge Types
  - [x] 4.1 Create app/actions/charge-type-actions.ts
    - Implement getChargeTypes(category?, type?)
    - Implement getChargeTypeById(id)
    - Implement createChargeType(data)
    - Implement updateChargeType(id, data)
    - Implement deleteChargeType(id) - soft delete
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 4.2 Write property test for charge type ordering
    - **Property 4: Charge Type Ordering Consistency**
    - Generate random charge types with display_order
    - Verify output is always sorted by display_order
    - **Validates: Requirements 1.4**

  - [x] 4.3 Write property test for soft-delete preservation
    - **Property 5: Soft-Delete Data Preservation**
    - Test that deleted charge types remain retrievable
    - **Validates: Requirements 1.5**

- [x] 5. Server Actions for Shipment Costs
  - [x] 5.1 Create app/actions/shipment-cost-actions.ts
    - Implement getShipmentCosts(bookingId)
    - Implement createShipmentCost(data) with auto-calculation of amount_idr, tax_amount, total_amount
    - Implement updateShipmentCost(id, data)
    - Implement deleteShipmentCost(id)
    - Implement updateCostPaymentStatus(id, status, paidAmount?, paidDate?, reference?)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 5.2 Write property test for cost payment status validity
    - **Property 6: Cost Payment Status Validity**
    - Test that payment_status only accepts valid values
    - **Validates: Requirements 2.6**

  - [x] 5.3 Write property test for default tax rate
    - **Property 9: Default Tax Rate Application**
    - Test that new costs default to 11% tax rate
    - **Validates: Requirements 8.1**

- [x] 6. Server Actions for Shipment Revenue
  - [x] 6.1 Create app/actions/shipment-revenue-actions.ts
    - Implement getShipmentRevenue(bookingId)
    - Implement createShipmentRevenue(data) with auto-calculation
    - Implement updateShipmentRevenue(id, data)
    - Implement deleteShipmentRevenue(id)
    - Implement updateRevenueBillingStatus(id, status, invoiceId?)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 6.2 Write property test for revenue billing status validity
    - **Property 7: Revenue Billing Status Validity**
    - Test that billing_status only accepts valid values
    - **Validates: Requirements 3.4**

- [x] 7. Server Actions for Vendor Invoices
  - [x] 7.1 Create app/actions/vendor-invoice-actions.ts
    - Implement getVendorInvoices(filters?)
    - Implement getVendorInvoicesByBooking(bookingId)
    - Implement createVendorInvoice(data)
    - Implement updateVendorInvoice(id, data)
    - Implement deleteVendorInvoice(id)
    - Implement updateVendorInvoicePayment(id, paidAmount)
    - Implement linkCostsToInvoice(invoiceId, costIds)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 7.2 Write property test for due date calculation
    - **Property 8: Vendor Invoice Due Date Calculation**
    - Test days until due and days overdue calculations
    - **Validates: Requirements 4.4**

- [x] 8. Server Actions for Profitability
  - [x] 8.1 Create app/actions/profitability-actions.ts
    - Implement getBookingFinancialSummary(bookingId)
    - Implement getShipmentProfitability(filters?)
    - Implement getUnbilledRevenue(filters?)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 9.1, 9.2, 10.1, 10.2, 10.3_

  - [x] 8.2 Write property test for profitability filter
    - **Property 10: Profitability Filter Correctness**
    - Test that filters correctly narrow results
    - **Validates: Requirements 9.2**

  - [x] 8.3 Write property test for unbilled revenue identification
    - **Property 12: Unbilled Revenue Identification**
    - Test that only unbilled items are returned
    - **Validates: Requirements 10.1, 10.2**

- [x] 9. Checkpoint - Server actions complete
  - Ensure all property tests pass, ask the user if questions arise.

- [x] 10. UI Components - Forms and Cards
  - [x] 10.1 Create components/cost-revenue/cost-form.tsx
    - Form for adding/editing shipment costs
    - Charge type selector, currency/amount inputs, vendor selector
    - Auto-calculate IDR amount and tax
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.1, 7.2, 8.1_

  - [x] 10.2 Create components/cost-revenue/revenue-form.tsx
    - Form for adding/editing shipment revenue
    - Charge type selector, currency/amount inputs
    - Auto-calculate IDR amount and tax
    - _Requirements: 3.1, 3.2, 3.3, 7.1, 7.2, 8.1_

  - [x] 10.3 Create components/cost-revenue/vendor-invoice-form.tsx
    - Form for adding/editing vendor invoices
    - Vendor selector, date inputs, amount fields
    - Cost linking interface
    - _Requirements: 4.1, 4.2, 4.5_

  - [x] 10.4 Create components/cost-revenue/cost-card.tsx
    - Display cost line item with charge type, amount, vendor, status
    - Payment status badge
    - Edit/delete actions
    - _Requirements: 6.3_

  - [x] 10.5 Create components/cost-revenue/revenue-card.tsx
    - Display revenue line item with charge type, amount, status
    - Billing status badge
    - Edit/delete actions
    - _Requirements: 6.2_

  - [x] 10.6 Create components/cost-revenue/vendor-invoice-card.tsx
    - Display vendor invoice with number, vendor, amount, due date, status
    - Days until due / overdue indicator
    - Payment actions
    - _Requirements: 6.4, 4.4_

- [x] 11. UI Components - Tables and Lists
  - [x] 11.1 Create components/cost-revenue/costs-table.tsx
    - Table displaying all costs for a booking
    - Columns: charge, vendor, currency, amount, tax, status
    - Totals row
    - _Requirements: 6.3_

  - [x] 11.2 Create components/cost-revenue/revenue-table.tsx
    - Table displaying all revenue for a booking
    - Columns: charge, currency, amount, tax, status
    - Totals row
    - _Requirements: 6.2_

  - [x] 11.3 Create components/cost-revenue/vendor-invoices-list.tsx
    - List of vendor invoices for a booking
    - Due date indicators
    - Payment status
    - _Requirements: 6.4_

  - [x] 11.4 Create components/cost-revenue/profitability-summary.tsx
    - Summary cards: total revenue, total cost, gross profit, margin
    - Margin indicator (green/red based on target)
    - _Requirements: 6.1, 9.3, 9.4_

  - [x] 11.5 Write property test for margin indicator logic
    - **Property 11: Margin Target Indicator Logic**
    - Test indicator color based on margin vs target
    - **Validates: Requirements 9.3**

- [x] 12. Booking Financials Page
  - [x] 12.1 Create app/(main)/agency/bookings/[id]/financials/page.tsx
    - Server component to fetch booking and financial data
    - _Requirements: 6.1_

  - [x] 12.2 Create app/(main)/agency/bookings/[id]/financials/financials-client.tsx
    - Client component with profitability summary
    - Revenue table with add button
    - Costs table with add button
    - Vendor invoices list
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 12.3 Add financials tab/link to booking detail page
    - Add navigation to financials from booking detail
    - _Requirements: 6.1_

- [x] 13. Profitability Reports Page
  - [x] 13.1 Create app/(main)/agency/reports/profitability/page.tsx
    - Server component for profitability report
    - _Requirements: 9.1_

  - [x] 13.2 Create app/(main)/agency/reports/profitability/profitability-client.tsx
    - Client component with filters (customer, date range, status)
    - Profitability table with all bookings
    - Margin indicators
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 13.3 Create app/(main)/agency/reports/unbilled/page.tsx
    - Unbilled revenue report page
    - Grouped by booking with totals
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 14. Vendor Payables Page
  - [x] 14.1 Create app/(main)/agency/reports/payables/page.tsx
    - Server component for vendor payables report
    - _Requirements: 4.3, 4.4_

  - [x] 14.2 Create app/(main)/agency/reports/payables/payables-client.tsx
    - Client component with vendor invoice list
    - Filter by vendor, status, due date
    - Payment tracking
    - _Requirements: 4.3, 4.4_

- [x] 15. Navigation and Integration
  - [x] 15.1 Add navigation links for new pages
    - Add Financials link to booking detail
    - Add Profitability Report to agency reports menu
    - Add Unbilled Revenue to agency reports menu
    - Add Vendor Payables to agency reports menu
    - _Requirements: All_

  - [x] 15.2 Update booking detail to show financial summary
    - Add mini profitability summary to booking detail page
    - Link to full financials view
    - _Requirements: 6.1_

- [x] 16. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including property-based tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows the existing patterns in the codebase for agency module components
