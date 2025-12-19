# Design Document: Invoice Splitting

## Overview

This feature enables generating multiple invoices from a single Job Order (JO) based on contract payment terms. The system supports preset payment structures (Single, DP+Final, DP+Delivery+Final) and custom configurations. Each invoice term has a trigger condition that determines when it can be invoiced, and the system tracks total invoiced amounts against the JO's invoiceable revenue.

## Architecture

The invoice splitting feature integrates with the existing JO and Invoice modules:

```
┌─────────────────────────────────────────────────────────────────┐
│                        JO Detail Page                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │  Invoice Terms      │    │  Invoices Section               │ │
│  │  Configuration      │───▶│  (Generated from Terms)         │ │
│  │  - Preset Selection │    │  - Term Status Display          │ │
│  │  - Custom Terms     │    │  - Create/View Actions          │ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Invoice Generation                           │
├─────────────────────────────────────────────────────────────────┤
│  - Calculate term amount (revenue × percentage)                 │
│  - Apply VAT (11%)                                              │
│  - Create invoice with term metadata                            │
│  - Update JO total_invoiced                                     │
│  - Mark term as invoiced                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### New Components

1. **InvoiceTermsSection** (`components/job-orders/invoice-terms-section.tsx`)
   - Displays and manages invoice terms configuration
   - Handles preset selection and custom term editing
   - Shows validation status for percentage totals

2. **InvoiceTermsTable** (`components/job-orders/invoice-terms-table.tsx`)
   - Displays terms with status, amounts, and actions
   - Shows Create Invoice / View Invoice buttons based on term status

3. **InvoiceTermForm** (`components/job-orders/invoice-term-form.tsx`)
   - Form for adding/editing custom invoice terms
   - Fields: term name, percentage, description, trigger

### Modified Components

1. **JODetailView** (`components/job-orders/jo-detail-view.tsx`)
   - Add InvoiceTermsSection before existing invoice generation button
   - Replace single "Generate Invoice" button with term-based invoice generation

### Server Actions

1. **saveInvoiceTerms** (`app/(main)/job-orders/actions.ts`)
   - Validates percentage total equals 100%
   - Saves terms to JO's invoice_terms JSONB field
   - Prevents modification if any invoices exist

2. **generateSplitInvoice** (`app/(main)/invoices/actions.ts`)
   - Creates invoice for specific term
   - Calculates amount based on term percentage
   - Updates term status and JO total_invoiced

### Utility Functions

1. **invoice-terms-utils.ts** (`lib/invoice-terms-utils.ts`)
   - `getPresetTerms(preset: PresetType)`: Returns terms for preset
   - `validateTermsTotal(terms: InvoiceTerm[])`: Validates 100% total
   - `calculateTermAmount(revenue: number, percentage: number)`: Calculates term amount
   - `getTermStatus(term: InvoiceTerm, joStatus: string)`: Determines term status
   - `calculateVAT(amount: number)`: Returns VAT at 11%

## Data Models

### InvoiceTerm Type

```typescript
interface InvoiceTerm {
  term: string           // 'down_payment' | 'delivery' | 'final' | 'full' | custom
  percentage: number     // 0-100
  description: string    // Human-readable description
  trigger: TriggerType   // 'jo_created' | 'surat_jalan' | 'berita_acara' | 'delivery'
  invoiced: boolean      // Whether invoice has been generated
  invoice_id?: string    // Reference to generated invoice
}

type TriggerType = 'jo_created' | 'surat_jalan' | 'berita_acara' | 'delivery'
type PresetType = 'single' | 'dp_final' | 'dp_delivery_final' | 'custom'
type TermStatus = 'pending' | 'ready' | 'locked' | 'invoiced'
```

### Database Schema Changes

**job_orders table additions:**
```sql
invoice_terms JSONB DEFAULT '[]'
total_invoiced DECIMAL(15,2) DEFAULT 0
invoiceable_amount DECIMAL(15,2)  -- equals final_revenue
```

**invoices table additions:**
```sql
invoice_term VARCHAR(50)      -- 'down_payment', 'delivery', 'final', 'full'
term_percentage DECIMAL(5,2)  -- 30, 50, 20, or 100
term_description VARCHAR(200)
```

### Preset Templates

```typescript
const INVOICE_TERM_PRESETS = {
  single: [
    { term: 'full', percentage: 100, description: 'Full Payment', trigger: 'jo_created' }
  ],
  dp_final: [
    { term: 'down_payment', percentage: 30, description: 'Down Payment', trigger: 'jo_created' },
    { term: 'final', percentage: 70, description: 'Final Payment', trigger: 'delivery' }
  ],
  dp_delivery_final: [
    { term: 'down_payment', percentage: 30, description: 'Down Payment', trigger: 'jo_created' },
    { term: 'delivery', percentage: 50, description: 'Upon Delivery', trigger: 'surat_jalan' },
    { term: 'final', percentage: 20, description: 'After Handover', trigger: 'berita_acara' }
  ]
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Percentage Validation
*For any* set of invoice terms, the validation function SHALL return true if and only if the sum of all term percentages equals exactly 100.
**Validates: Requirements 1.4, 1.5**

### Property 2: Preset Terms Generation
*For any* preset type selection, the generated terms SHALL have percentages that sum to exactly 100 and match the predefined template structure.
**Validates: Requirements 1.2, 2.2, 2.3, 2.4**

### Property 3: Term Status Determination
*For any* invoice term, the status SHALL be:
- "invoiced" if term.invoiced is true
- "ready" if trigger condition is met and term.invoiced is false
- "locked" if trigger condition is not met
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: Invoice Amount Calculation
*For any* JO revenue and term percentage, the generated invoice SHALL have:
- subtotal = revenue × (percentage / 100)
- tax_amount = subtotal × 0.11
- total_amount = subtotal + tax_amount
**Validates: Requirements 3.4, 3.5**

### Property 5: Total Invoiced Tracking
*For any* sequence of invoice generations from a JO's terms, the JO's total_invoiced SHALL equal the sum of all generated invoice total_amounts.
**Validates: Requirements 4.1, 4.2**

### Property 6: Term Immutability After Invoicing
*For any* JO with at least one generated invoice, attempts to modify invoice_terms SHALL be rejected.
**Validates: Requirements 1.6**

### Property 7: Term Amount Recalculation
*For any* term percentage change, the displayed term amount SHALL equal (JO revenue × new percentage / 100).
**Validates: Requirements 5.2, 5.3, 5.4**

## Error Handling

| Error Condition | Response |
|----------------|----------|
| Terms total ≠ 100% | Display validation error, prevent save |
| Modify terms after invoicing | Display error "Cannot modify terms after invoices have been generated" |
| Generate invoice for locked term | Display error with required trigger condition |
| Generate duplicate invoice for term | Prevent action, term already marked as invoiced |
| JO not in invoiceable status | Hide invoice generation options |

## Testing Strategy

### Unit Tests
- Test preset template generation
- Test percentage validation logic
- Test term status determination
- Test amount calculations with VAT

### Property-Based Tests
Using **fast-check** library for property-based testing:

1. **Property 1 Test**: Generate random arrays of percentages, verify validation correctly identifies 100% totals
2. **Property 2 Test**: For each preset type, verify generated terms sum to 100%
3. **Property 3 Test**: Generate random term states and JO statuses, verify correct status determination
4. **Property 4 Test**: Generate random revenues and percentages, verify invoice amounts are calculated correctly
5. **Property 5 Test**: Generate random sequences of term invoicing, verify cumulative tracking
6. **Property 6 Test**: Generate JOs with/without invoices, verify modification behavior
7. **Property 7 Test**: Generate random percentage changes, verify amount recalculation

Each property-based test SHALL:
- Run a minimum of 100 iterations
- Be tagged with format: `**Feature: invoice-splitting, Property {number}: {property_text}**`
- Reference the correctness property from this design document
