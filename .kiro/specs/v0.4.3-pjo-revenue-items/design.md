# Design: PJO Revenue Line Items v0.4.3

## Overview

This feature integrates revenue line item management directly into the PJO create/edit form. Instead of managing revenue items separately, users can add, edit, and delete line items inline with real-time calculations. The form handles the complexity of saving items with the correct pjo_id and keeping totals synchronized.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PJO Form                                  │
├─────────────────────────────────────────────────────────────────┤
│  Basic Info Section                                              │
│  Logistics Section                                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Revenue Items Section (NEW)                                ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │  RevenueItemsTable Component                            │││
│  │  │  - useFieldArray for dynamic rows                       │││
│  │  │  - Auto-calculate subtotals                             │││
│  │  │  - Real-time total                                      │││
│  │  └─────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
│  Financials Section (total_revenue now read-only from items)    │
│  Notes Section                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### New Component: RevenueItemsTable

```typescript
// components/pjo/revenue-items-table.tsx

interface RevenueItem {
  id?: string           // UUID from DB (undefined for new items)
  description: string
  quantity: number
  unit: string
  unit_price: number
  subtotal: number      // Calculated: quantity * unit_price
}

interface RevenueItemsTableProps {
  items: RevenueItem[]
  onChange: (items: RevenueItem[]) => void
  disabled?: boolean
  errors?: Record<number, { description?: string; unit_price?: string }>
}

// Component renders:
// - Table with columns: #, Description, Qty, Unit, Unit Price, Subtotal, Actions
// - Add Item button
// - Total row at bottom
```

### Updated: PJO Form Schema

```typescript
// Extended schema to include revenue items
const pjoSchemaWithItems = pjoSchema.extend({
  revenue_items: z.array(z.object({
    id: z.string().optional(),
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unit: z.string().min(1, 'Unit is required'),
    unit_price: z.number().min(1, 'Unit price must be greater than 0'),
  })).min(1, 'At least one revenue item is required'),
})
```

### Updated: Server Actions

```typescript
// app/(main)/proforma-jo/actions.ts

interface RevenueItemInput {
  id?: string
  description: string
  quantity: number
  unit: string
  unit_price: number
}

interface PJOFormDataWithItems extends PJOFormData {
  revenue_items: RevenueItemInput[]
}

// createPJO: Save PJO first, then insert all revenue items
// updatePJO: Diff existing vs new items, delete/update/insert accordingly
```

## Data Models

### Existing Table: pjo_revenue_items

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| pjo_id | uuid | Foreign key to proforma_job_orders |
| description | text | Item description |
| quantity | numeric | Quantity (default 1) |
| unit | text | Unit of measure |
| unit_price | numeric | Price per unit |
| subtotal | numeric | Generated: quantity * unit_price |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Update timestamp |

### Unit Options

```typescript
const UNIT_OPTIONS = [
  { value: 'TRIP', label: 'TRIP' },
  { value: 'TRIPS', label: 'TRIPS' },
  { value: 'LOT', label: 'LOT' },
  { value: 'CASE', label: 'CASE' },
  { value: 'UNIT', label: 'UNIT' },
  { value: 'KG', label: 'KG' },
  { value: 'M3', label: 'M3' },
]
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Subtotal Calculation Consistency

*For any* revenue item with quantity Q and unit_price P, the subtotal SHALL equal Q × P.

**Validates: Requirements 3.5**

### Property 2: Total Revenue Sum Consistency

*For any* list of revenue items, the total revenue SHALL equal the sum of all item subtotals.

**Validates: Requirements 4.2, 5.1**

### Property 3: Sequential Line Numbering After Deletion

*For any* list of N revenue items after deletion, the line numbers SHALL be 1, 2, 3, ..., N with no gaps.

**Validates: Requirements 4.3**

### Property 4: Validation Prevents Invalid Submission

*For any* form submission attempt with invalid data (empty description, zero/negative unit_price, or no items), the system SHALL prevent submission and display errors.

**Validates: Requirements 6.1, 6.2, 6.3, 6.5**

### Property 5: Data Persistence Round-Trip

*For any* set of revenue items saved with a PJO, fetching the PJO in edit mode SHALL return the same items with matching descriptions, quantities, units, and unit_prices.

**Validates: Requirements 7.2, 7.4**

### Property 6: Total Revenue Sync on Save

*For any* PJO save operation, the PJO.total_revenue field SHALL equal the sum of all revenue item subtotals.

**Validates: Requirements 7.3, 7.5**

## Error Handling

| Scenario | Handling |
|----------|----------|
| No revenue items on submit | Show error: "At least one revenue item is required" |
| Empty description | Show inline error on specific row |
| Zero/negative unit_price | Show inline error on specific row |
| Database save failure | Show toast error, keep form data |
| Network error | Show toast error, allow retry |

## Testing Strategy

### Unit Tests
- RevenueItemsTable component renders correctly
- Add item creates row with defaults
- Delete item removes row
- Subtotal calculates correctly
- Total updates on changes

### Property-Based Tests (using fast-check)
- Property 1: Subtotal calculation for random quantity/price combinations
- Property 2: Total sum for random lists of items
- Property 3: Line numbering after random deletions
- Property 4: Validation rejects invalid inputs
- Property 5: Round-trip persistence
- Property 6: Total revenue sync

### Integration Tests
- Create PJO with revenue items saves correctly
- Edit PJO loads existing items
- Edit PJO with changes persists correctly
