# Design: PJO Itemized Financials & Budget Control

## 1. Database Schema

### 1.1 New Table: pjo_revenue_items
```sql
CREATE TABLE pjo_revenue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pjo_id UUID NOT NULL REFERENCES proforma_job_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  source_type TEXT CHECK (source_type IN ('quotation', 'contract', 'manual')),
  source_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pjo_revenue_items_pjo_id ON pjo_revenue_items(pjo_id);
```

### 1.2 New Table: pjo_cost_items
```sql
CREATE TABLE pjo_cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pjo_id UUID NOT NULL REFERENCES proforma_job_orders(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'trucking', 'port_charges', 'documentation', 'handling',
    'customs', 'insurance', 'storage', 'labor', 'fuel', 'tolls', 'other'
  )),
  description TEXT NOT NULL,
  estimated_amount DECIMAL(15,2) NOT NULL,
  actual_amount DECIMAL(15,2),
  variance DECIMAL(15,2) GENERATED ALWAYS AS (
    CASE WHEN actual_amount IS NOT NULL 
    THEN actual_amount - estimated_amount 
    ELSE NULL END
  ) STORED,
  variance_pct DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN actual_amount IS NOT NULL AND estimated_amount > 0
    THEN ((actual_amount - estimated_amount) / estimated_amount) * 100
    ELSE NULL END
  ) STORED,
  status TEXT NOT NULL DEFAULT 'estimated' CHECK (status IN (
    'estimated', 'confirmed', 'exceeded', 'under_budget'
  )),
  estimated_by UUID,
  confirmed_by UUID,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  justification TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pjo_cost_items_pjo_id ON pjo_cost_items(pjo_id);
CREATE INDEX idx_pjo_cost_items_status ON pjo_cost_items(status);
```

### 1.3 New Table: job_orders
```sql
CREATE TABLE job_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jo_number TEXT UNIQUE NOT NULL,
  pjo_id UUID NOT NULL REFERENCES proforma_job_orders(id),
  project_id UUID REFERENCES projects(id),
  customer_id UUID REFERENCES customers(id),
  
  final_revenue DECIMAL(15,2) NOT NULL,
  final_cost DECIMAL(15,2) NOT NULL,
  final_profit DECIMAL(15,2) GENERATED ALWAYS AS (final_revenue - final_cost) STORED,
  final_margin DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN final_revenue > 0 
    THEN ((final_revenue - final_cost) / final_revenue) * 100 
    ELSE 0 END
  ) STORED,
  
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'completed', 'submitted_to_finance', 'invoiced', 'closed'
  )),
  
  converted_from_pjo_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  submitted_to_finance_at TIMESTAMP WITH TIME ZONE,
  submitted_by UUID,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_orders_pjo_id ON job_orders(pjo_id);
CREATE INDEX idx_job_orders_status ON job_orders(status);
CREATE INDEX idx_job_orders_project_id ON job_orders(project_id);
```

### 1.4 Alter: proforma_job_orders
```sql
ALTER TABLE proforma_job_orders 
ADD COLUMN total_revenue_calculated DECIMAL(15,2) DEFAULT 0,
ADD COLUMN total_cost_estimated DECIMAL(15,2) DEFAULT 0,
ADD COLUMN total_cost_actual DECIMAL(15,2) DEFAULT 0,
ADD COLUMN all_costs_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN converted_to_jo BOOLEAN DEFAULT FALSE,
ADD COLUMN converted_to_jo_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN job_order_id UUID REFERENCES job_orders(id);
```

## 2. TypeScript Types

### 2.1 New Types (types/database.ts)
```typescript
export type CostCategory = 
  | 'trucking' | 'port_charges' | 'documentation' | 'handling'
  | 'customs' | 'insurance' | 'storage' | 'labor' | 'fuel' | 'tolls' | 'other'

export type CostItemStatus = 'estimated' | 'confirmed' | 'exceeded' | 'under_budget'

export type RevenueSourceType = 'quotation' | 'contract' | 'manual'

export type JOStatus = 'active' | 'completed' | 'submitted_to_finance' | 'invoiced' | 'closed'

export interface PJORevenueItem {
  id: string
  pjo_id: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  subtotal: number
  source_type?: RevenueSourceType
  source_id?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface PJOCostItem {
  id: string
  pjo_id: string
  category: CostCategory
  description: string
  estimated_amount: number
  actual_amount?: number
  variance?: number
  variance_pct?: number
  status: CostItemStatus
  estimated_by?: string
  confirmed_by?: string
  confirmed_at?: string
  justification?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface JobOrder {
  id: string
  jo_number: string
  pjo_id: string
  project_id?: string
  customer_id?: string
  final_revenue: number
  final_cost: number
  final_profit: number
  final_margin: number
  status: JOStatus
  converted_from_pjo_at: string
  completed_at?: string
  submitted_to_finance_at?: string
  submitted_by?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface JobOrderWithRelations extends JobOrder {
  proforma_job_orders?: ProformaJobOrder
  projects?: Project
  customers?: Customer
}
```

## 3. Component Architecture

### 3.1 New Components
```
components/pjo/
├── revenue-items-section.tsx    # Revenue line items CRUD
├── revenue-item-form.tsx        # Add/Edit revenue item dialog
├── cost-items-section.tsx       # Cost items CRUD (estimation view)
├── cost-item-form.tsx           # Add/Edit cost item dialog
├── cost-confirmation-section.tsx # Operations actual cost entry
├── budget-summary.tsx           # Budget health display
├── conversion-status.tsx        # PJO→JO conversion readiness

components/job-orders/
├── jo-table.tsx                 # JO list table
├── jo-detail-view.tsx           # JO detail display
├── jo-status-badge.tsx          # JO status badge

components/ui/
├── jo-status-badge.tsx          # Reusable JO status badge
```

### 3.2 Updated Components
- `pjo-form.tsx` - Replace single revenue/expense fields with line item sections
- `pjo-detail-view.tsx` - Add line items display, budget summary, conversion status

## 4. Server Actions

### 4.1 Revenue Item Actions (app/(main)/proforma-jo/revenue-actions.ts)
```typescript
'use server'

export async function createRevenueItem(pjoId: string, data: RevenueItemFormData)
export async function updateRevenueItem(id: string, data: Partial<RevenueItemFormData>)
export async function deleteRevenueItem(id: string)
export async function getRevenueItems(pjoId: string): Promise<PJORevenueItem[]>
```

### 4.2 Cost Item Actions (app/(main)/proforma-jo/cost-actions.ts)
```typescript
'use server'

export async function createCostItem(pjoId: string, data: CostItemFormData)
export async function updateCostEstimate(id: string, data: Partial<CostItemFormData>)
export async function confirmActualCost(id: string, data: CostConfirmationData)
export async function deleteCostItem(id: string)
export async function getCostItems(pjoId: string): Promise<PJOCostItem[]>
```

### 4.3 Conversion Actions (app/(main)/proforma-jo/conversion-actions.ts)
```typescript
'use server'

export async function checkConversionReadiness(pjoId: string): Promise<ConversionReadiness>
export async function convertToJobOrder(pjoId: string): Promise<JobOrder>
```

### 4.4 Job Order Actions (app/(main)/job-orders/actions.ts)
```typescript
'use server'

export async function getJobOrders(): Promise<JobOrderWithRelations[]>
export async function getJobOrder(id: string): Promise<JobOrderWithRelations>
export async function submitToFinance(joId: string): Promise<JobOrder>
export async function markCompleted(joId: string): Promise<JobOrder>
```

## 5. Utility Functions (lib/pjo-utils.ts)

### 5.1 New Functions
```typescript
// Calculate totals from line items
export function calculateRevenueTotal(items: PJORevenueItem[]): number
export function calculateCostTotal(items: PJOCostItem[], type: 'estimated' | 'actual'): number

// Budget analysis
export function analyzeBudget(costItems: PJOCostItem[]): BudgetAnalysis

// Cost status determination
export function determineCostStatus(estimated: number, actual: number): CostItemStatus

// Generate JO number
export function generateJONumber(sequence: number, date: Date): string
```

## 6. Page Structure

### 6.1 New Pages
```
app/(main)/job-orders/
├── page.tsx                     # JO list
├── actions.ts                   # JO server actions
├── jo-list-client.tsx           # Client component
├── [id]/
│   └── page.tsx                 # JO detail
```

### 6.2 Updated Pages
- `/proforma-jo/new` - Use new form with line items
- `/proforma-jo/[id]` - Show line items, budget summary, conversion status
- `/proforma-jo/[id]/edit` - Edit with line items

## 7. Validation Schemas

### 7.1 Revenue Item Schema
```typescript
const revenueItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().min(1, "Unit is required"),
  unit_price: z.number().min(0, "Unit price cannot be negative"),
  source_type: z.enum(['quotation', 'contract', 'manual']).optional(),
  notes: z.string().optional()
})
```

### 7.2 Cost Item Schema
```typescript
const costItemSchema = z.object({
  category: z.enum([
    'trucking', 'port_charges', 'documentation', 'handling',
    'customs', 'insurance', 'storage', 'labor', 'fuel', 'tolls', 'other'
  ]),
  description: z.string().min(1, "Description is required"),
  estimated_amount: z.number().positive("Amount must be positive"),
  notes: z.string().optional()
})

const costConfirmationSchema = z.object({
  actual_amount: z.number().min(0, "Amount cannot be negative"),
  justification: z.string().optional(),
  notes: z.string().optional()
})
```

## 8. UI Wireframes

### 8.1 Revenue Items Section
```
┌─────────────────────────────────────────────────────────────────┐
│ Revenue Items                                            [+ Add] │
├─────────────────────────────────────────────────────────────────┤
│ Description          │ Qty │ Unit │ Unit Price    │ Subtotal    │
│ Freight SBY-JKT      │ 1   │ Trip │ Rp 15.000.000 │ Rp 15.000.000 │ [✏️][🗑️]
│ Handling Fee         │ 20  │ CBM  │ Rp 50.000     │ Rp 1.000.000  │ [✏️][🗑️]
├─────────────────────────────────────────────────────────────────┤
│                                    Total: Rp 16.000.000         │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Cost Items Section (Estimation)
```
┌─────────────────────────────────────────────────────────────────┐
│ Cost Estimation                                          [+ Add] │
├─────────────────────────────────────────────────────────────────┤
│ Category      │ Description         │ Estimated Amount          │
│ Trucking      │ SBY - Tanjung Perak │ Rp 5.000.000             │ [✏️][🗑️]
│ Port Charges  │ THC + Lift On       │ Rp 2.500.000             │ [✏️][🗑️]
├─────────────────────────────────────────────────────────────────┤
│                              Total Estimated: Rp 7.500.000      │
│                              Estimated Profit: Rp 8.500.000     │
│                              Estimated Margin: 53.13%           │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 Cost Confirmation Section (Operations)
```
┌─────────────────────────────────────────────────────────────────────┐
│ Cost Confirmation                                   Budget: ⚠️ 1 over │
├─────────────────────────────────────────────────────────────────────┤
│ Category   │ Description    │ Budget      │ Actual      │ Var  │ St │
│ Trucking   │ SBY - T.Perak  │ Rp 5.000.000│ Rp 4.800.000│ -4%  │ ✅ │
│ Port       │ THC + Lift On  │ Rp 2.500.000│ Rp 2.600.000│ +4%  │ ⚠️ │
│            │ Justification: Holiday surcharge                       │
│ Docs       │ B/L + COO      │ Rp 750.000  │ [________]  │ -    │ ⏳ │
├─────────────────────────────────────────────────────────────────────┤
│ Confirmed: 2/3 items │ Budget: Rp 8.250.000 │ Actual: Rp 7.400.000 │
└─────────────────────────────────────────────────────────────────────┘
```

## 9. Data Flow

### 9.1 PJO Creation Flow
1. User creates PJO with basic info (project, dates, logistics)
2. User adds revenue items (line by line)
3. User adds cost items with estimates
4. System calculates totals, profit, margin
5. User submits for approval

### 9.2 Cost Confirmation Flow
1. Manager approves PJO
2. Operations views approved PJO
3. For each cost item, Operations enters actual amount
4. If actual > estimated, system requires justification
5. System updates cost item status
6. When all items confirmed, system checks conversion readiness

### 9.3 Conversion Flow
1. System detects all costs confirmed
2. System validates: approved status, revenue unchanged
3. System generates JO number
4. System creates JobOrder with final figures
5. System links JO to PJO
6. PJO marked as converted
