# Design Document

## Overview

The Quotation Module introduces a pre-award workflow stage between Project and PJO. This design reuses existing classification and engineering utilities from v0.21/v0.22 but moves the logic to the Quotation entity where it belongs in the business workflow.

### Architecture Approach
- **Reuse**: `lib/market-classification-utils.ts`, `lib/engineering-utils.ts`, `types/engineering.ts`
- **Extend**: `engineering_assessments` table to support `quotation_id`
- **New**: `quotations`, `quotation_revenue_items`, `quotation_cost_items`, `pursuit_costs` tables
- **Modify**: `proforma_job_orders` to add `quotation_id` reference

## Database Schema

### Table: quotations

```sql
CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number VARCHAR(50) NOT NULL UNIQUE,
  
  -- References
  customer_id UUID NOT NULL REFERENCES customers(id),
  project_id UUID REFERENCES projects(id),
  
  -- Basic Info
  title VARCHAR(255) NOT NULL,
  commodity VARCHAR(255),
  
  -- RFQ Details
  rfq_number VARCHAR(100),
  rfq_date DATE,
  rfq_received_date DATE,
  rfq_deadline DATE,
  
  -- Route
  origin VARCHAR(255) NOT NULL,
  origin_lat DECIMAL(10, 8),
  origin_lng DECIMAL(11, 8),
  origin_place_id VARCHAR(255),
  destination VARCHAR(255) NOT NULL,
  destination_lat DECIMAL(10, 8),
  destination_lng DECIMAL(11, 8),
  destination_place_id VARCHAR(255),
  
  -- Cargo Specifications (for classification)
  cargo_weight_kg DECIMAL(15, 2),
  cargo_length_m DECIMAL(10, 2),
  cargo_width_m DECIMAL(10, 2),
  cargo_height_m DECIMAL(10, 2),
  cargo_value DECIMAL(15, 2),
  
  -- Route Characteristics (for classification)
  is_new_route BOOLEAN DEFAULT FALSE,
  terrain_type VARCHAR(20) CHECK (terrain_type IN ('normal', 'mountain', 'unpaved', 'narrow')),
  requires_special_permit BOOLEAN DEFAULT FALSE,
  is_hazardous BOOLEAN DEFAULT FALSE,
  duration_days INTEGER,
  
  -- Classification (auto-calculated)
  market_type VARCHAR(20) CHECK (market_type IN ('simple', 'complex')),
  complexity_score INTEGER DEFAULT 0,
  complexity_factors JSONB,
  
  -- Engineering Review
  requires_engineering BOOLEAN DEFAULT FALSE,
  engineering_status VARCHAR(20) DEFAULT 'not_required' 
    CHECK (engineering_status IN ('not_required', 'pending', 'in_progress', 'completed', 'waived')),
  engineering_assigned_to UUID REFERENCES user_profiles(id),
  engineering_assigned_at TIMESTAMPTZ,
  engineering_completed_at TIMESTAMPTZ,
  engineering_completed_by UUID REFERENCES user_profiles(id),
  engineering_notes TEXT,
  engineering_waived_reason TEXT,
  
  -- Multi-shipment
  estimated_shipments INTEGER DEFAULT 1,
  
  -- Financial Summary (calculated)
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  total_cost DECIMAL(15, 2) DEFAULT 0,
  total_pursuit_cost DECIMAL(15, 2) DEFAULT 0,
  gross_profit DECIMAL(15, 2) DEFAULT 0,
  profit_margin DECIMAL(5, 2) DEFAULT 0,
  
  -- Status Workflow
  status VARCHAR(20) DEFAULT 'draft' 
    CHECK (status IN ('draft', 'engineering_review', 'ready', 'submitted', 'won', 'lost', 'cancelled')),
  
  -- Submission
  submitted_at TIMESTAMPTZ,
  submitted_to VARCHAR(255),
  
  -- Outcome
  outcome_date DATE,
  outcome_reason TEXT,
  
  -- Audit
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Notes
  notes TEXT
);

-- Indexes
CREATE INDEX idx_quotations_customer ON quotations(customer_id);
CREATE INDEX idx_quotations_project ON quotations(project_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_market_type ON quotations(market_type);
CREATE INDEX idx_quotations_created_at ON quotations(created_at DESC);
```

### Table: quotation_revenue_items

```sql
CREATE TABLE quotation_revenue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  
  category VARCHAR(50) NOT NULL 
    CHECK (category IN ('transportation', 'handling', 'documentation', 'escort', 'permit', 'other')),
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) DEFAULT 1,
  unit VARCHAR(50),
  unit_price DECIMAL(15, 2) NOT NULL,
  subtotal DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  display_order INTEGER DEFAULT 0,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotation_revenue_items_quotation ON quotation_revenue_items(quotation_id);
```

### Table: quotation_cost_items

```sql
CREATE TABLE quotation_cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  
  category VARCHAR(50) NOT NULL 
    CHECK (category IN ('trucking', 'shipping', 'port', 'handling', 'crew', 'fuel', 'toll', 'permit', 'escort', 'insurance', 'documentation', 'other')),
  description VARCHAR(255) NOT NULL,
  estimated_amount DECIMAL(15, 2) NOT NULL,
  
  vendor_id UUID REFERENCES vendors(id),
  vendor_name VARCHAR(255),
  
  display_order INTEGER DEFAULT 0,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotation_cost_items_quotation ON quotation_cost_items(quotation_id);
```

### Table: pursuit_costs

```sql
CREATE TABLE pursuit_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  
  category VARCHAR(50) NOT NULL 
    CHECK (category IN ('travel', 'accommodation', 'survey', 'canvassing', 'entertainment', 'facilitator_fee', 'documentation', 'other')),
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  cost_date DATE NOT NULL,
  
  -- Who incurred the cost
  incurred_by UUID REFERENCES user_profiles(id),
  
  -- Department allocation (percentages)
  marketing_portion DECIMAL(5, 2) DEFAULT 100,
  engineering_portion DECIMAL(5, 2) DEFAULT 0,
  
  receipt_url TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pursuit_costs_quotation ON pursuit_costs(quotation_id);
CREATE INDEX idx_pursuit_costs_date ON pursuit_costs(cost_date);
```


### Modify: engineering_assessments

```sql
-- Add quotation_id column (nullable for backward compatibility)
ALTER TABLE engineering_assessments 
ADD COLUMN quotation_id UUID REFERENCES quotations(id);

-- Create index
CREATE INDEX idx_engineering_assessments_quotation ON engineering_assessments(quotation_id);

-- Update constraint: either pjo_id or quotation_id must be set
ALTER TABLE engineering_assessments
ADD CONSTRAINT chk_assessment_parent 
CHECK (pjo_id IS NOT NULL OR quotation_id IS NOT NULL);
```

### Modify: proforma_job_orders

```sql
-- Add quotation_id reference
ALTER TABLE proforma_job_orders 
ADD COLUMN quotation_id UUID REFERENCES quotations(id);

-- Create index
CREATE INDEX idx_pjo_quotation ON proforma_job_orders(quotation_id);
```

## RLS Policies

```sql
-- quotations: Same pattern as PJOs
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quotations" ON quotations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert quotations" ON quotations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin', 'manager', 'sales')
    )
  );

CREATE POLICY "Authorized users can update quotations" ON quotations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin', 'manager', 'sales')
    )
  );

CREATE POLICY "Admin can delete quotations" ON quotations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Similar policies for quotation_revenue_items, quotation_cost_items, pursuit_costs
```


## Component Architecture

### New Components

```
components/quotations/
├── quotation-list.tsx           # List view with filters
├── quotation-detail-view.tsx    # Detail page layout
├── quotation-form.tsx           # Create/Edit form
├── quotation-status-badge.tsx   # Status indicator
├── quotation-financial-summary.tsx  # Revenue/Cost/Profit display
├── quotation-cargo-specs.tsx    # Cargo specification form section
├── quotation-route-specs.tsx    # Route characteristics form section
├── quotation-classification-display.tsx  # Shows market type, score, factors
├── quotation-revenue-items.tsx  # Revenue line items table
├── quotation-cost-items.tsx     # Cost line items table
├── pursuit-costs-section.tsx    # Pursuit costs management
├── convert-to-pjo-dialog.tsx    # Conversion wizard
└── quotation-engineering-section.tsx  # Engineering review (reuses existing components)
```

### Reused Components

```
components/engineering/
├── engineering-status-banner.tsx    # Reuse with quotation context
├── engineering-assessments-section.tsx  # Reuse with quotation_id
├── assign-engineering-dialog.tsx    # Reuse
├── complete-assessment-dialog.tsx   # Reuse
├── complete-review-dialog.tsx       # Reuse
└── waive-review-dialog.tsx          # Reuse

components/ui/
├── engineering-status-badge.tsx     # Reuse
└── market-type-badge.tsx            # Reuse
```

### Page Structure

```
app/(main)/quotations/
├── page.tsx                    # List page
├── new/page.tsx                # Create page
├── [id]/page.tsx               # Detail page
├── [id]/edit/page.tsx          # Edit page
├── actions.ts                  # Server actions
└── quotation-utils.ts          # Quotation-specific utilities
```

## Utility Functions

### New: lib/quotation-utils.ts

```typescript
// Quotation number generation
export function generateQuotationNumber(date: Date): string
// Format: QUO-YYYY-NNNN

// Status workflow validation
export function canTransitionStatus(current: QuotationStatus, target: QuotationStatus): boolean

// Financial calculations
export function calculateQuotationTotals(quotation: Quotation): QuotationFinancials
export function calculatePursuitCostPerShipment(totalPursuitCost: number, shipments: number): number

// Conversion helpers
export function prepareQuotationForPJO(quotation: Quotation): PJOCreateInput
export function splitQuotationByShipments(quotation: Quotation, shipments: number): PJOCreateInput[]
```


### Extend: lib/engineering-utils.ts

```typescript
// Add support for quotation context
export function checkEngineeringRequired(complexityScore: number | null | undefined): boolean
// Already works - no changes needed

export function determineRequiredAssessments(complexityFactors: ComplexityFactor[]): AssessmentType[]
// Already works - no changes needed

// New: Create assessments for quotation
export function createQuotationAssessments(
  quotationId: string,
  assessmentTypes: AssessmentType[]
): Promise<EngineeringAssessment[]>
```

### Extend: lib/market-classification-utils.ts

```typescript
// Already works with any input that has cargo/route specs
export function calculateMarketClassification(
  input: PJOClassificationInput,  // Works for quotations too
  criteria: ComplexityCriteria[]
): MarketClassification
```

## Types

### New: types/quotation.ts

```typescript
export type QuotationStatus = 
  | 'draft' 
  | 'engineering_review' 
  | 'ready' 
  | 'submitted' 
  | 'won' 
  | 'lost' 
  | 'cancelled';

export type RevenueCategory = 
  | 'transportation' 
  | 'handling' 
  | 'documentation' 
  | 'escort' 
  | 'permit' 
  | 'other';

export type QuotationCostCategory = 
  | 'trucking' 
  | 'shipping' 
  | 'port' 
  | 'handling' 
  | 'crew' 
  | 'fuel' 
  | 'toll' 
  | 'permit' 
  | 'escort' 
  | 'insurance' 
  | 'documentation' 
  | 'other';

export type PursuitCostCategory = 
  | 'travel' 
  | 'accommodation' 
  | 'survey' 
  | 'canvassing' 
  | 'entertainment' 
  | 'facilitator_fee' 
  | 'documentation' 
  | 'other';


export interface Quotation {
  id: string;
  quotation_number: string;
  customer_id: string;
  project_id?: string;
  title: string;
  // ... all fields from schema
}

export interface QuotationRevenueItem {
  id: string;
  quotation_id: string;
  category: RevenueCategory;
  description: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  subtotal: number;
  display_order: number;
}

export interface QuotationCostItem {
  id: string;
  quotation_id: string;
  category: QuotationCostCategory;
  description: string;
  estimated_amount: number;
  vendor_id?: string;
  vendor_name?: string;
  display_order: number;
}

export interface PursuitCost {
  id: string;
  quotation_id: string;
  category: PursuitCostCategory;
  description: string;
  amount: number;
  cost_date: string;
  incurred_by?: string;
  marketing_portion: number;
  engineering_portion: number;
}

export interface QuotationFinancials {
  total_revenue: number;
  total_cost: number;
  total_pursuit_cost: number;
  gross_profit: number;
  profit_margin: number;
  pursuit_cost_per_shipment: number;
}
```

## Server Actions

### app/(main)/quotations/actions.ts

```typescript
'use server'

// CRUD
export async function createQuotation(data: QuotationCreateInput): Promise<ActionResult<Quotation>>
export async function updateQuotation(id: string, data: QuotationUpdateInput): Promise<ActionResult<Quotation>>
export async function deleteQuotation(id: string): Promise<ActionResult<void>>

// Status transitions
export async function submitQuotation(id: string, submittedTo: string): Promise<ActionResult<Quotation>>
export async function markQuotationWon(id: string, outcomeDate: string): Promise<ActionResult<Quotation>>
export async function markQuotationLost(id: string, outcomeDate: string, reason: string): Promise<ActionResult<Quotation>>
export async function cancelQuotation(id: string): Promise<ActionResult<Quotation>>


// Revenue items
export async function addRevenueItem(quotationId: string, data: RevenueItemInput): Promise<ActionResult<QuotationRevenueItem>>
export async function updateRevenueItem(id: string, data: RevenueItemInput): Promise<ActionResult<QuotationRevenueItem>>
export async function deleteRevenueItem(id: string): Promise<ActionResult<void>>

// Cost items
export async function addCostItem(quotationId: string, data: CostItemInput): Promise<ActionResult<QuotationCostItem>>
export async function updateCostItem(id: string, data: CostItemInput): Promise<ActionResult<QuotationCostItem>>
export async function deleteCostItem(id: string): Promise<ActionResult<void>>

// Pursuit costs
export async function addPursuitCost(quotationId: string, data: PursuitCostInput): Promise<ActionResult<PursuitCost>>
export async function updatePursuitCost(id: string, data: PursuitCostInput): Promise<ActionResult<PursuitCost>>
export async function deletePursuitCost(id: string): Promise<ActionResult<void>>

// Conversion
export async function convertToPJO(quotationId: string, options: ConvertOptions): Promise<ActionResult<PJO[]>>
```

### app/(main)/quotations/engineering-actions.ts

```typescript
'use server'

// Reuse patterns from app/(main)/proforma-jo/engineering-actions.ts
// but operate on quotation_id instead of pjo_id

export async function initializeQuotationEngineeringReview(quotationId: string, assignedTo: string): Promise<ActionResult>
export async function completeQuotationEngineeringReview(quotationId: string, data: ReviewCompletionData): Promise<ActionResult>
export async function waiveQuotationEngineeringReview(quotationId: string, reason: string): Promise<ActionResult>
```

## Notification Triggers

### Extend: lib/notifications/notification-triggers.ts

```typescript
// Quotation-specific notifications

interface QuotationData {
  id: string;
  quotation_number: string;
  customer_name?: string;
  total_revenue?: number;
  created_by?: string;
}

export async function notifyQuotationEngineeringAssigned(data: {
  quotation_id: string;
  quotation_number: string;
  assigned_to: string;
  complexity_score?: number;
}): Promise<void>

export async function notifyQuotationEngineeringCompleted(data: {
  quotation_id: string;
  quotation_number: string;
  decision: string;
  overall_risk_level: string;
  created_by?: string;
}): Promise<void>

export async function notifyQuotationWon(quotation: QuotationData): Promise<void>
// Recipients: admin, finance roles

export async function notifyQuotationDeadlineApproaching(quotation: QuotationData): Promise<void>
// Recipients: quotation creator
// Triggered: 3 days before rfq_deadline
```


## Correctness Properties

### Property 1: Quotation Number Uniqueness
```
∀ q1, q2 ∈ Quotations: q1.id ≠ q2.id → q1.quotation_number ≠ q2.quotation_number
```

### Property 2: Classification Consistency
```
∀ q ∈ Quotations:
  q.complexity_score >= 20 → q.market_type = 'complex'
  q.complexity_score < 20 → q.market_type = 'simple'
```

### Property 3: Engineering Requirement
```
∀ q ∈ Quotations:
  q.complexity_score >= 20 → q.requires_engineering = true
  q.complexity_score < 20 → q.requires_engineering = false
```

### Property 4: Status Workflow Validity
```
Valid transitions:
  draft → engineering_review (if requires_engineering)
  draft → ready (if !requires_engineering)
  engineering_review → ready (if engineering_status = 'completed' OR 'waived')
  ready → submitted
  submitted → won | lost
  any → cancelled
```

### Property 5: Engineering Blocking
```
∀ q ∈ Quotations:
  q.requires_engineering = true ∧ q.engineering_status ∉ {'completed', 'waived'}
  → q.status cannot transition to 'submitted'
```

### Property 6: Financial Calculation Accuracy
```
∀ q ∈ Quotations:
  q.total_revenue = Σ(revenue_items.subtotal)
  q.total_cost = Σ(cost_items.estimated_amount)
  q.total_pursuit_cost = Σ(pursuit_costs.amount)
  q.gross_profit = q.total_revenue - q.total_cost
  q.profit_margin = (q.gross_profit / q.total_revenue) × 100
```

### Property 7: Pursuit Cost Per Shipment
```
∀ q ∈ Quotations where q.estimated_shipments > 0:
  pursuit_cost_per_shipment = q.total_pursuit_cost / q.estimated_shipments
```

### Property 8: PJO Inheritance
```
∀ pjo ∈ PJOs where pjo.quotation_id IS NOT NULL:
  pjo.market_type = quotation.market_type (read-only)
  pjo.complexity_score = quotation.complexity_score (read-only)
  pjo.engineering_status = 'not_required'
```


### Property 9: Legacy PJO Support
```
∀ pjo ∈ PJOs where pjo.quotation_id IS NULL:
  pjo.market_type, pjo.complexity_score are self-contained (editable)
  pjo.engineering_status follows existing v0.22 logic
```

### Property 10: Revenue Item Subtotal
```
∀ item ∈ QuotationRevenueItems:
  item.subtotal = item.quantity × item.unit_price
```

### Property 11: Role-Based Access
```
View quotations: owner, admin, manager, finance, sales
Create/Edit quotations: owner, admin, manager, sales
Delete quotations: owner, admin
Submit/Mark Won/Lost: owner, admin, manager
Ops role: NO access to quotations
```

### Property 12: Conversion Creates Valid PJO
```
∀ conversion from Quotation q to PJO p:
  p.quotation_id = q.id
  p.customer_id = q.customer_id
  p.market_type = q.market_type
  p.complexity_score = q.complexity_score
  p.engineering_status = 'not_required'
```

## Testing Strategy

### Unit Tests
- `__tests__/quotation-utils.test.ts` - Number generation, status transitions, financial calculations
- `__tests__/quotation-classification.test.ts` - Classification at quotation level
- `__tests__/pursuit-costs.test.ts` - Pursuit cost calculations

### Integration Tests
- `__tests__/quotation-actions.test.ts` - Server actions
- `__tests__/quotation-engineering-actions.test.ts` - Engineering workflow
- `__tests__/quotation-to-pjo.test.ts` - Conversion logic

### Property-Based Tests
- All 12 correctness properties above
- Reuse existing classification property tests with quotation context
