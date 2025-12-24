# Design Document: Agency Cost & Revenue Management

## Overview

This design document describes the implementation of the Agency Cost & Revenue Management module (v0.75) for the Gama ERP system. The module provides comprehensive financial tracking at the shipment level, enabling the agency department to manage costs from vendors, revenue to customers, and calculate profitability per booking.

The system integrates with existing freight bookings, bills of lading, job orders, and invoices to provide a complete financial picture of each shipment.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Agency Cost & Revenue Module                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  Charge Types    │  │  Shipment Costs  │  │  Shipment Revenue    │  │
│  │  (Catalog)       │  │  (Expenses)      │  │  (Billing)           │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│           │                     │                        │              │
│           └─────────────────────┼────────────────────────┘              │
│                                 │                                        │
│                    ┌────────────▼────────────┐                          │
│                    │  Profitability Engine   │                          │
│                    │  (Calculations & Views) │                          │
│                    └────────────┬────────────┘                          │
│                                 │                                        │
│  ┌──────────────────┐          │          ┌──────────────────────────┐ │
│  │  Vendor Invoices │──────────┴──────────│  Financials UI           │ │
│  │  (Payables)      │                     │  (P&L Dashboard)         │ │
│  └──────────────────┘                     └──────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────┐
            │ Bookings  │   │ Job Orders│   │ Invoices  │
            └───────────┘   └───────────┘   └───────────┘
```

### Data Flow

1. **Cost Entry Flow**: User adds cost → System calculates tax/IDR → Links to vendor → Updates profitability
2. **Revenue Entry Flow**: User adds revenue → System calculates tax/IDR → Links to invoice → Updates profitability
3. **Vendor Invoice Flow**: User records invoice → Links to costs → Tracks payment status
4. **Profitability Flow**: System aggregates costs/revenue → Calculates margin → Displays in UI

## Components and Interfaces

### 1. Charge Type Catalog Component

Manages the predefined catalog of charge types used for categorizing costs and revenue.

```typescript
// Charge category types
type ChargeCategory = 'freight' | 'origin' | 'destination' | 'documentation' | 'customs' | 'other';

// Charge type classification
type ChargeTypeClass = 'revenue' | 'cost' | 'both';

// Charge type entity
interface AgencyChargeType {
  id: string;
  chargeCode: string;
  chargeName: string;
  chargeCategory: ChargeCategory;
  chargeType: ChargeTypeClass;
  defaultCurrency: string;
  isTaxable: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

// Functions
function getChargeTypes(category?: ChargeCategory, type?: ChargeTypeClass): AgencyChargeType[];
function getChargeTypeById(id: string): AgencyChargeType | null;
function getChargeTypesByCategory(category: ChargeCategory): AgencyChargeType[];
```

### 2. Shipment Cost Component

Manages cost line items associated with bookings.

```typescript
// Payment status for costs
type CostPaymentStatus = 'unpaid' | 'partial' | 'paid';

// Shipment cost entity
interface ShipmentCost {
  id: string;
  bookingId?: string;
  blId?: string;
  jobOrderId?: string;
  chargeTypeId: string;
  description?: string;
  currency: string;
  unitPrice: number;
  quantity: number;
  amount: number;
  exchangeRate: number;
  amountIdr: number;
  isTaxable: boolean;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  vendorId?: string;
  vendorName?: string;
  vendorInvoiceNumber?: string;
  vendorInvoiceDate?: string;
  paymentStatus: CostPaymentStatus;
  paidAmount: number;
  paidDate?: string;
  paymentReference?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  // Joined fields
  chargeType?: AgencyChargeType;
  vendor?: ServiceProvider;
}

// Form data for creating/updating costs
interface ShipmentCostFormData {
  bookingId?: string;
  blId?: string;
  jobOrderId?: string;
  chargeTypeId: string;
  description?: string;
  currency: string;
  unitPrice: number;
  quantity: number;
  exchangeRate?: number;
  isTaxable?: boolean;
  taxRate?: number;
  vendorId?: string;
  vendorName?: string;
  vendorInvoiceNumber?: string;
  vendorInvoiceDate?: string;
  notes?: string;
}

// Functions
function createShipmentCost(data: ShipmentCostFormData): Promise<ShipmentCost>;
function updateShipmentCost(id: string, data: Partial<ShipmentCostFormData>): Promise<ShipmentCost>;
function deleteShipmentCost(id: string): Promise<void>;
function getShipmentCosts(bookingId: string): Promise<ShipmentCost[]>;
function updateCostPaymentStatus(id: string, status: CostPaymentStatus, paidAmount?: number): Promise<void>;
```

### 3. Shipment Revenue Component

Manages revenue line items associated with bookings.

```typescript
// Billing status for revenue
type RevenueBillingStatus = 'unbilled' | 'billed' | 'paid';

// Shipment revenue entity
interface ShipmentRevenue {
  id: string;
  bookingId?: string;
  blId?: string;
  jobOrderId?: string;
  invoiceId?: string;
  chargeTypeId: string;
  description?: string;
  currency: string;
  unitPrice: number;
  quantity: number;
  amount: number;
  exchangeRate: number;
  amountIdr: number;
  isTaxable: boolean;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  billingStatus: RevenueBillingStatus;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  // Joined fields
  chargeType?: AgencyChargeType;
  invoice?: { id: string; invoiceNumber: string };
}

// Form data for creating/updating revenue
interface ShipmentRevenueFormData {
  bookingId?: string;
  blId?: string;
  jobOrderId?: string;
  invoiceId?: string;
  chargeTypeId: string;
  description?: string;
  currency: string;
  unitPrice: number;
  quantity: number;
  exchangeRate?: number;
  isTaxable?: boolean;
  taxRate?: number;
  notes?: string;
}

// Functions
function createShipmentRevenue(data: ShipmentRevenueFormData): Promise<ShipmentRevenue>;
function updateShipmentRevenue(id: string, data: Partial<ShipmentRevenueFormData>): Promise<ShipmentRevenue>;
function deleteShipmentRevenue(id: string): Promise<void>;
function getShipmentRevenue(bookingId: string): Promise<ShipmentRevenue[]>;
function updateRevenueBillingStatus(id: string, status: RevenueBillingStatus, invoiceId?: string): Promise<void>;
```

### 4. Vendor Invoice Component

Manages vendor invoices and links them to cost items.

```typescript
// Vendor invoice payment status
type VendorInvoicePaymentStatus = 'unpaid' | 'partial' | 'paid';

// Vendor invoice entity
interface AgencyVendorInvoice {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  vendorName?: string;
  invoiceDate: string;
  dueDate?: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentStatus: VendorInvoicePaymentStatus;
  paidAmount: number;
  costIds: string[];
  documentUrl?: string;
  notes?: string;
  createdAt: string;
  // Joined fields
  vendor?: ServiceProvider;
  costs?: ShipmentCost[];
}

// Form data for creating/updating vendor invoices
interface VendorInvoiceFormData {
  invoiceNumber: string;
  vendorId: string;
  vendorName?: string;
  invoiceDate: string;
  dueDate?: string;
  currency?: string;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  costIds?: string[];
  documentUrl?: string;
  notes?: string;
}

// Functions
function createVendorInvoice(data: VendorInvoiceFormData): Promise<AgencyVendorInvoice>;
function updateVendorInvoice(id: string, data: Partial<VendorInvoiceFormData>): Promise<AgencyVendorInvoice>;
function deleteVendorInvoice(id: string): Promise<void>;
function getVendorInvoices(filters?: VendorInvoiceFilters): Promise<AgencyVendorInvoice[]>;
function getVendorInvoicesByBooking(bookingId: string): Promise<AgencyVendorInvoice[]>;
function updateVendorInvoicePayment(id: string, paidAmount: number): Promise<void>;
```

### 5. Profitability Engine

Calculates and provides profitability metrics for shipments.

```typescript
// Shipment profitability summary
interface ShipmentProfitability {
  bookingId: string;
  bookingNumber: string;
  customerId?: string;
  customerName?: string;
  jobOrderId?: string;
  joNumber?: string;
  totalRevenue: number;
  revenueTax: number;
  totalCost: number;
  costTax: number;
  grossProfit: number;
  profitMarginPct: number;
  status: string;
}

// Financial summary for a booking
interface BookingFinancialSummary {
  totalRevenue: number;
  totalRevenueTax: number;
  totalCost: number;
  totalCostTax: number;
  grossProfit: number;
  profitMarginPct: number;
  targetMarginPct: number;
  isTargetMet: boolean;
  unbilledRevenue: number;
  unpaidCosts: number;
}

// Functions
function calculateBookingFinancials(bookingId: string): Promise<BookingFinancialSummary>;
function getShipmentProfitability(filters?: ProfitabilityFilters): Promise<ShipmentProfitability[]>;
function calculateProfitMargin(revenue: number, cost: number): number;
function getUnbilledRevenue(filters?: { customerId?: string; dateFrom?: string; dateTo?: string }): Promise<ShipmentRevenue[]>;
```

### 6. Currency Conversion Utilities

Handles multi-currency calculations.

```typescript
// Currency conversion result
interface CurrencyConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  targetCurrency: string;
  exchangeRate: number;
}

// Functions
function convertToIdr(amount: number, currency: string, exchangeRate: number): number;
function calculateTax(amount: number, taxRate: number, isTaxable: boolean): number;
function calculateTotalWithTax(amount: number, taxRate: number, isTaxable: boolean): { amount: number; tax: number; total: number };
```

## Data Models

### Database Schema

```sql
-- Agency charge types catalog
CREATE TABLE agency_charge_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_code VARCHAR(30) UNIQUE NOT NULL,
  charge_name VARCHAR(100) NOT NULL,
  charge_category VARCHAR(50) NOT NULL,
  charge_type VARCHAR(20) NOT NULL,
  default_currency VARCHAR(10) DEFAULT 'IDR',
  is_taxable BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipment costs
CREATE TABLE shipment_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES freight_bookings(id),
  bl_id UUID REFERENCES bills_of_lading(id),
  job_order_id UUID REFERENCES job_orders(id),
  charge_type_id UUID NOT NULL REFERENCES agency_charge_types(id),
  description VARCHAR(200),
  currency VARCHAR(10) DEFAULT 'IDR',
  unit_price DECIMAL(18,2) NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  amount DECIMAL(18,2) NOT NULL,
  exchange_rate DECIMAL(15,6) DEFAULT 1,
  amount_idr DECIMAL(18,2),
  is_taxable BOOLEAN DEFAULT TRUE,
  tax_rate DECIMAL(5,2) DEFAULT 11,
  tax_amount DECIMAL(18,2),
  total_amount DECIMAL(18,2),
  vendor_id UUID REFERENCES agency_service_providers(id),
  vendor_name VARCHAR(200),
  vendor_invoice_number VARCHAR(100),
  vendor_invoice_date DATE,
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  paid_amount DECIMAL(18,2) DEFAULT 0,
  paid_date DATE,
  payment_reference VARCHAR(100),
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipment revenue
CREATE TABLE shipment_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES freight_bookings(id),
  bl_id UUID REFERENCES bills_of_lading(id),
  job_order_id UUID REFERENCES job_orders(id),
  invoice_id UUID REFERENCES invoices(id),
  charge_type_id UUID NOT NULL REFERENCES agency_charge_types(id),
  description VARCHAR(200),
  currency VARCHAR(10) DEFAULT 'IDR',
  unit_price DECIMAL(18,2) NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  amount DECIMAL(18,2) NOT NULL,
  exchange_rate DECIMAL(15,6) DEFAULT 1,
  amount_idr DECIMAL(18,2),
  is_taxable BOOLEAN DEFAULT TRUE,
  tax_rate DECIMAL(5,2) DEFAULT 11,
  tax_amount DECIMAL(18,2),
  total_amount DECIMAL(18,2),
  billing_status VARCHAR(20) DEFAULT 'unbilled',
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agency vendor invoices
CREATE TABLE agency_vendor_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) NOT NULL,
  vendor_id UUID NOT NULL REFERENCES agency_service_providers(id),
  vendor_name VARCHAR(200),
  invoice_date DATE NOT NULL,
  due_date DATE,
  currency VARCHAR(10) DEFAULT 'IDR',
  subtotal DECIMAL(18,2),
  tax_amount DECIMAL(18,2),
  total_amount DECIMAL(18,2),
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  paid_amount DECIMAL(18,2) DEFAULT 0,
  cost_ids JSONB DEFAULT '[]',
  document_url VARCHAR(500),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipment profitability view
CREATE OR REPLACE VIEW shipment_profitability AS
SELECT 
  fb.id as booking_id,
  fb.booking_number,
  fb.customer_id,
  c.name as customer_name,
  fb.job_order_id,
  jo.jo_number,
  COALESCE(SUM(sr.amount_idr), 0) as total_revenue,
  COALESCE(SUM(sr.tax_amount), 0) as revenue_tax,
  COALESCE(SUM(sc.amount_idr), 0) as total_cost,
  COALESCE(SUM(sc.tax_amount), 0) as cost_tax,
  COALESCE(SUM(sr.amount_idr), 0) - COALESCE(SUM(sc.amount_idr), 0) as gross_profit,
  CASE 
    WHEN SUM(sr.amount_idr) > 0 
    THEN ROUND((SUM(sr.amount_idr) - SUM(sc.amount_idr)) / SUM(sr.amount_idr) * 100, 2)
    ELSE 0 
  END as profit_margin_pct,
  fb.status
FROM freight_bookings fb
LEFT JOIN customers c ON fb.customer_id = c.id
LEFT JOIN job_orders jo ON fb.job_order_id = jo.id
LEFT JOIN shipment_revenue sr ON sr.booking_id = fb.id
LEFT JOIN shipment_costs sc ON sc.booking_id = fb.id
GROUP BY fb.id, fb.booking_number, fb.customer_id, c.name, fb.job_order_id, jo.jo_number, fb.status;

-- Indexes
CREATE INDEX idx_shipment_costs_booking ON shipment_costs(booking_id);
CREATE INDEX idx_shipment_costs_vendor ON shipment_costs(vendor_id);
CREATE INDEX idx_shipment_costs_payment ON shipment_costs(payment_status);
CREATE INDEX idx_shipment_revenue_booking ON shipment_revenue(booking_id);
CREATE INDEX idx_shipment_revenue_invoice ON shipment_revenue(invoice_id);
CREATE INDEX idx_shipment_revenue_billing ON shipment_revenue(billing_status);
CREATE INDEX idx_vendor_invoices_vendor ON agency_vendor_invoices(vendor_id);
CREATE INDEX idx_vendor_invoices_payment ON agency_vendor_invoices(payment_status);
```

### TypeScript Type Definitions

```typescript
// Database row types (snake_case for Supabase)
interface AgencyChargeTypeRow {
  id: string;
  charge_code: string;
  charge_name: string;
  charge_category: string;
  charge_type: string;
  default_currency: string;
  is_taxable: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

interface ShipmentCostRow {
  id: string;
  booking_id?: string;
  bl_id?: string;
  job_order_id?: string;
  charge_type_id: string;
  description?: string;
  currency: string;
  unit_price: number;
  quantity: number;
  amount: number;
  exchange_rate: number;
  amount_idr: number;
  is_taxable: boolean;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  vendor_id?: string;
  vendor_name?: string;
  vendor_invoice_number?: string;
  vendor_invoice_date?: string;
  payment_status: string;
  paid_amount: number;
  paid_date?: string;
  payment_reference?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

interface ShipmentRevenueRow {
  id: string;
  booking_id?: string;
  bl_id?: string;
  job_order_id?: string;
  invoice_id?: string;
  charge_type_id: string;
  description?: string;
  currency: string;
  unit_price: number;
  quantity: number;
  amount: number;
  exchange_rate: number;
  amount_idr: number;
  is_taxable: boolean;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  billing_status: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

interface AgencyVendorInvoiceRow {
  id: string;
  invoice_number: string;
  vendor_id: string;
  vendor_name?: string;
  invoice_date: string;
  due_date?: string;
  currency: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_status: string;
  paid_amount: number;
  cost_ids: string[];
  document_url?: string;
  notes?: string;
  created_at: string;
}

interface ShipmentProfitabilityRow {
  booking_id: string;
  booking_number: string;
  customer_id?: string;
  customer_name?: string;
  job_order_id?: string;
  jo_number?: string;
  total_revenue: number;
  revenue_tax: number;
  total_cost: number;
  cost_tax: number;
  gross_profit: number;
  profit_margin_pct: number;
  status: string;
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Currency Conversion Consistency

*For any* cost or revenue line item with a non-IDR currency, the calculated `amount_idr` SHALL equal `amount * exchange_rate`, ensuring consistent currency conversion across all financial calculations.

**Validates: Requirements 2.2, 3.2, 7.3**

### Property 2: Tax Calculation Accuracy

*For any* cost or revenue line item where `is_taxable` is true, the `tax_amount` SHALL equal `amount * (tax_rate / 100)` and `total_amount` SHALL equal `amount + tax_amount`. When `is_taxable` is false, `tax_amount` SHALL be 0 and `total_amount` SHALL equal `amount`.

**Validates: Requirements 2.3, 3.3, 8.2, 8.3, 8.4**

### Property 3: Profitability Calculation Correctness

*For any* booking with associated costs and revenue:
- `total_revenue` SHALL equal the sum of all `amount_idr` from revenue items
- `total_cost` SHALL equal the sum of all `amount_idr` from cost items
- `gross_profit` SHALL equal `total_revenue - total_cost`
- `profit_margin_pct` SHALL equal `(gross_profit / total_revenue) * 100` when `total_revenue > 0`, otherwise 0

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 4: Charge Type Ordering Consistency

*For any* list of charge types returned by the system, the items SHALL be ordered by `display_order` in ascending order, ensuring consistent presentation across all views.

**Validates: Requirements 1.4**

### Property 5: Soft-Delete Data Preservation

*For any* charge type that is soft-deleted (is_active set to false), the record SHALL remain in the database and be retrievable for historical reference, preserving data integrity.

**Validates: Requirements 1.5**

### Property 6: Cost Payment Status Validity

*For any* shipment cost, the `payment_status` field SHALL only contain one of the valid values: 'unpaid', 'partial', or 'paid'.

**Validates: Requirements 2.6**

### Property 7: Revenue Billing Status Validity

*For any* shipment revenue, the `billing_status` field SHALL only contain one of the valid values: 'unbilled', 'billed', or 'paid'.

**Validates: Requirements 3.4**

### Property 8: Vendor Invoice Due Date Calculation

*For any* vendor invoice with a `due_date`, the system SHALL correctly calculate the number of days until due (positive) or days overdue (negative) based on the current date.

**Validates: Requirements 4.4**

### Property 9: Default Tax Rate Application

*For any* new cost or revenue line item where `tax_rate` is not explicitly provided, the system SHALL default to 11% (Indonesian VAT rate).

**Validates: Requirements 8.1**

### Property 10: Profitability Filter Correctness

*For any* filter applied to the profitability view (customer, date range, status), the returned results SHALL only include bookings that match all specified filter criteria.

**Validates: Requirements 9.2**

### Property 11: Margin Target Indicator Logic

*For any* booking's profit margin, the visual indicator SHALL be green when `profit_margin_pct >= target_margin_pct` (default 20%) and red when below target.

**Validates: Requirements 9.3**

### Property 12: Unbilled Revenue Identification

*For any* query for unbilled revenue, the results SHALL include all and only revenue items where `billing_status = 'unbilled'`, correctly grouped by booking with accurate totals.

**Validates: Requirements 10.1, 10.2**

## Error Handling

### Validation Errors

| Error Condition | Error Code | User Message |
|----------------|------------|--------------|
| Missing required charge type fields | CHARGE_TYPE_INVALID | Please provide charge code, name, category, and type |
| Missing booking reference for cost | COST_BOOKING_REQUIRED | Cost must be linked to a booking |
| Missing charge type for cost/revenue | CHARGE_TYPE_REQUIRED | Please select a charge type |
| Missing amount for cost/revenue | AMOUNT_REQUIRED | Please enter an amount |
| Invalid exchange rate | EXCHANGE_RATE_INVALID | Exchange rate must be greater than 0 |
| Missing exchange rate for foreign currency | EXCHANGE_RATE_REQUIRED | Exchange rate is required for non-IDR currencies |
| Invalid payment status | PAYMENT_STATUS_INVALID | Invalid payment status value |
| Invalid billing status | BILLING_STATUS_INVALID | Invalid billing status value |
| Missing vendor invoice required fields | VENDOR_INVOICE_INVALID | Please provide invoice number, vendor, date, and amount |
| Duplicate vendor invoice number | VENDOR_INVOICE_DUPLICATE | This invoice number already exists for this vendor |

### Business Logic Errors

| Error Condition | Error Code | User Message |
|----------------|------------|--------------|
| Paid amount exceeds total | OVERPAYMENT | Paid amount cannot exceed total amount |
| Deleting cost linked to vendor invoice | COST_LINKED | Cannot delete cost linked to a vendor invoice |
| Deleting revenue that is billed | REVENUE_BILLED | Cannot delete revenue that has been invoiced |

### Database Errors

| Error Condition | Error Code | User Message |
|----------------|------------|--------------|
| Foreign key violation | FK_VIOLATION | Referenced record does not exist |
| Unique constraint violation | UNIQUE_VIOLATION | A record with this identifier already exists |
| Database connection error | DB_ERROR | Unable to save changes. Please try again |

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **Charge Type Catalog**
   - Verify default charge types are seeded correctly
   - Test charge type CRUD operations
   - Test soft-delete behavior

2. **Cost/Revenue Calculations**
   - Test currency conversion with various exchange rates
   - Test tax calculation with different tax rates
   - Test edge cases: zero amounts, very large amounts, decimal precision

3. **Profitability Calculations**
   - Test with no costs/revenue (empty booking)
   - Test with only costs (negative profit)
   - Test with only revenue (100% margin)
   - Test with zero revenue (margin = 0)

4. **Vendor Invoice**
   - Test due date calculations (future, today, past)
   - Test payment status transitions
   - Test linking/unlinking costs

### Property-Based Tests

Property-based tests will use fast-check to verify universal properties:

1. **Currency Conversion Property** (Property 1)
   - Generate random amounts and exchange rates
   - Verify amount_idr = amount * exchange_rate
   - Test with various currency codes

2. **Tax Calculation Property** (Property 2)
   - Generate random amounts and tax rates
   - Verify tax_amount and total_amount calculations
   - Test taxable vs non-taxable items

3. **Profitability Calculation Property** (Property 3)
   - Generate random sets of costs and revenue
   - Verify aggregation and margin calculations
   - Test edge case of zero revenue

4. **Ordering Property** (Property 4)
   - Generate random charge types with display_order
   - Verify output is always sorted

5. **Filter Property** (Property 10)
   - Generate random bookings with various attributes
   - Apply random filters
   - Verify all results match filter criteria

### Test Configuration

- Property-based testing library: fast-check
- Minimum iterations per property test: 100
- Test file location: `__tests__/cost-revenue-utils.property.test.ts`
- Each test tagged with: **Feature: agency-cost-revenue-management, Property N: [property_text]**

### Integration Tests

1. **End-to-end cost entry flow**
   - Create booking → Add costs → Update payment → Verify profitability

2. **End-to-end revenue flow**
   - Create booking → Add revenue → Link to invoice → Verify billing status

3. **Vendor invoice workflow**
   - Create costs → Create vendor invoice → Link costs → Record payment
