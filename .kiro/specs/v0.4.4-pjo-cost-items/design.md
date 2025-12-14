# Design Document: v0.4.4 - Cost Items with Budget Control System

## Overview

This feature adds a Cost Items section to the PJO form, enabling Admin to set estimated costs (budget caps) for each expense category. The system provides real-time financial summaries including profit and margin calculations, with status tracking for budget control.

## Architecture

The feature follows the existing pattern established by Revenue Items:
- Client-side component for inline editing (`CostItemsTable`)
- Integration with PJO form via React Hook Form
- Server actions for CRUD operations
- Financial summary component for profit/margin display

```
┌─────────────────────────────────────────────────────────────┐
│                      PJO Form                                │
├─────────────────────────────────────────────────────────────┤
│  Customer/Project Selection                                  │
│  Logistics Details                                           │
│  Revenue Items Table (existing)                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Cost Items Table (NEW)                                  ││
│  │ - Category dropdown                                     ││
│  │ - Description input                                     ││
│  │ - Estimated amount input                                ││
│  │ - Status display                                        ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Financial Summary (NEW)                                 ││
│  │ - Total Revenue                                         ││
│  │ - Total Estimated Cost                                  ││
│  │ - Estimated Profit                                      ││
│  │ - Estimated Margin %                                    ││
│  └─────────────────────────────────────────────────────────┘│
│  Notes                                                       │
│  Submit Button                                               │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### CostItemsTable Component

```typescript
// components/pjo/cost-items-table.tsx

export interface CostItemRow {
  id?: string
  category: CostCategory
  description: string
  estimated_amount: number
  status: CostItemStatus
  actual_amount?: number
  estimated_by?: string
}

export type CostCategory = 
  | 'trucking' 
  | 'port_charges' 
  | 'documentation' 
  | 'handling' 
  | 'crew'
  | 'fuel' 
  | 'tolls' 
  | 'other'

export type CostItemStatus = 
  | 'estimated'    // ⏳ Initial state
  | 'confirmed'    // ✅ Actual ≤ estimated
  | 'at_risk'      // ⚠️ Actual > 90% of estimated (UI only)
  | 'exceeded'     // 🚫 Actual > estimated

interface CostItemsTableProps {
  items: CostItemRow[]
  onChange: (items: CostItemRow[]) => void
  errors?: Record<number, { category?: string; description?: string; estimated_amount?: string }>
  disabled?: boolean
}
```

### FinancialSummary Component

```typescript
// components/pjo/financial-summary.tsx

interface FinancialSummaryProps {
  totalRevenue: number
  totalEstimatedCost: number
}

// Calculated values:
// - estimatedProfit = totalRevenue - totalEstimatedCost
// - estimatedMargin = totalRevenue > 0 ? (estimatedProfit / totalRevenue) * 100 : 0
```

### Server Action Updates

```typescript
// app/(main)/proforma-jo/actions.ts

interface CostItemInput {
  id?: string
  category: CostCategory
  description: string
  estimated_amount: number
}

// createPJO: Add cost_items parameter
// updatePJO: Add diff logic for cost items (insert/update/delete)
```

## Data Models

### Existing Database Table: pjo_cost_items

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| pjo_id | uuid | Foreign key to proforma_job_orders |
| category | text | Cost category (trucking, port_charges, etc.) |
| description | text | Item description |
| estimated_amount | numeric | Budget cap set by Admin |
| actual_amount | numeric | Actual cost (set by Operations, nullable) |
| variance | numeric | Generated: actual - estimated |
| variance_pct | numeric | Generated: ((actual - estimated) / estimated) * 100 |
| status | text | estimated, confirmed, exceeded, under_budget |
| estimated_by | uuid | User who set the estimate |
| confirmed_by | uuid | User who confirmed actual (nullable) |
| confirmed_at | timestamptz | When actual was confirmed (nullable) |
| justification | text | Required when exceeded (nullable) |
| notes | text | Additional notes (nullable) |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### PJO Fields Used

| Field | Description |
|-------|-------------|
| total_revenue_calculated | Sum of revenue items |
| total_cost_estimated | Sum of cost item estimated_amounts |
| total_cost_actual | Sum of cost item actual_amounts |
| profit | Calculated: revenue - cost |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Total Estimated Cost Sum Consistency

*For any* array of cost items, the total estimated cost SHALL equal the sum of all estimated_amount values.

**Validates: Requirements 1.4, 2.4, 3.4, 4.2**

### Property 2: Sequential Line Numbering After Deletion

*For any* array of cost items after deletion, the line numbers SHALL be sequential starting from 1 (1, 2, 3, ..., n).

**Validates: Requirements 4.3**

### Property 3: Financial Summary Calculation Consistency

*For any* total revenue and total estimated cost values:
- Estimated profit SHALL equal total revenue minus total estimated cost
- Estimated margin SHALL equal (profit / revenue) * 100 when revenue > 0, or 0 when revenue = 0

**Validates: Requirements 5.4, 5.5, 5.6**

### Property 4: Validation Prevents Invalid Submission

*For any* cost items array:
- Validation SHALL fail if array is empty
- Validation SHALL fail if any item has no category selected
- Validation SHALL fail if any item has empty description
- Validation SHALL fail if any item has estimated_amount ≤ 0
- Validation SHALL pass only when all items have valid category, non-empty description, and estimated_amount > 0

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 5: Status Icon Mapping Consistency

*For any* cost item status value, the displayed icon SHALL match:
- 'estimated' → ⏳ (gray)
- 'confirmed' → ✅ (green)
- 'exceeded' → 🚫 (red)
- UI-only 'at_risk' when actual > 90% of estimated → ⚠️ (yellow)

**Validates: Requirements 1.3**

### Property 6: Data Persistence Round-Trip

*For any* valid cost items saved to the database:
- Loading the PJO SHALL return all saved cost items
- Each loaded item SHALL preserve: category, description, estimated_amount, status
- PJO total_cost_estimated SHALL equal sum of cost item estimated_amounts

**Validates: Requirements 7.1, 7.2, 7.4, 8.1, 8.3**

## Error Handling

| Error Condition | Handling |
|-----------------|----------|
| Empty cost items | Display validation error, prevent submission |
| Missing category | Highlight field, show "Category is required" |
| Empty description | Highlight field, show "Description is required" |
| Invalid amount (≤0) | Highlight field, show "Amount must be greater than 0" |
| Database save failure | Show toast error, preserve form state |
| Load failure | Show error message, allow retry |

## Testing Strategy

### Unit Tests
- CostItemsTable component renders correctly
- Add/delete/edit operations work
- Status icons display correctly
- Financial summary calculations

### Property-Based Tests (using fast-check)

1. **Property 1**: Total cost sum consistency
   - Generate random arrays of cost items
   - Verify total equals sum of estimated_amounts

2. **Property 2**: Line numbering after deletion
   - Generate random item counts and deletion indices
   - Verify sequential numbering after deletion

3. **Property 3**: Financial summary calculations
   - Generate random revenue and cost values
   - Verify profit and margin calculations

4. **Property 4**: Validation logic
   - Generate valid and invalid cost items
   - Verify validation accepts/rejects correctly

5. **Property 5**: Status icon mapping
   - Generate all possible status values
   - Verify correct icon returned

6. **Property 6**: Round-trip persistence
   - Generate random cost items
   - Simulate save/load cycle
   - Verify data preservation

