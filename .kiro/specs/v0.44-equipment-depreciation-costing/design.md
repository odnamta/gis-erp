# Design Document: Equipment Depreciation & Costing

## Overview

This document describes the technical design for the Equipment Depreciation & Costing feature (v0.44) in Gama ERP. The feature enables comprehensive asset financial management through depreciation tracking, Total Cost of Ownership (TCO) analysis, and cost breakdown reporting.

The system builds on the existing Equipment Asset Registry (v0.41), Maintenance Tracking (v0.42), and Utilization Tracking (v0.43) modules, adding depreciation-specific tables, calculation functions, and costing UI components.

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Gama ERP Application                         │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  Costing        │  │  Depreciation   │  │  Cost Breakdown │     │
│  │  Dashboard      │  │  Schedule       │  │  Analysis       │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
│           │                    │                    │               │
│           └────────────────────┼────────────────────┘               │
│                                │                                    │
│                    ┌───────────▼───────────┐                       │
│                    │  Depreciation Utils   │                       │
│                    │  (lib/depreciation-   │                       │
│                    │   utils.ts)           │                       │
│                    └───────────┬───────────┘                       │
│                                │                                    │
│                    ┌───────────▼───────────┐                       │
│                    │  Supabase Client      │                       │
│                    └───────────┬───────────┘                       │
└────────────────────────────────┼────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      Supabase DB        │
                    │  ┌──────────────────┐   │
                    │  │ asset_depreciation│  │
                    │  │ asset_cost_tracking│ │
                    │  │ asset_tco_summary │   │
                    │  │ (materialized)    │   │
                    │  └──────────────────┘   │
                    └─────────────────────────┘
```


### Component Architecture

```
app/(main)/equipment/
├── costing/
│   └── page.tsx                    # Costing dashboard with tabs
├── [id]/
│   ├── depreciation/
│   │   └── page.tsx                # Asset depreciation schedule
│   └── costs/
│       └── page.tsx                # Asset cost history

components/costing/
├── index.ts                        # Barrel export
├── costing-summary-cards.tsx       # KPI summary cards
├── tco-analysis-table.tsx          # TCO by asset table
├── depreciation-schedule.tsx       # Depreciation projection
├── depreciation-history.tsx        # Historical depreciation records
├── cost-breakdown-chart.tsx        # Cost distribution visualization
├── cost-history-table.tsx          # Cost records table
└── batch-depreciation-dialog.tsx   # Monthly batch processing dialog

lib/
├── depreciation-utils.ts           # Calculation functions
└── depreciation-actions.ts         # Server actions

types/
└── depreciation.ts                 # TypeScript types
```

## Components and Interfaces

### TypeScript Types

```typescript
// types/depreciation.ts

import { DepreciationMethod } from './assets';

// Cost type options
export type CostType = 
  | 'purchase' 
  | 'maintenance' 
  | 'fuel' 
  | 'insurance' 
  | 'registration' 
  | 'depreciation' 
  | 'other';

// Reference type for cost tracking
export type CostReferenceType = 
  | 'maintenance_record' 
  | 'daily_log' 
  | 'depreciation' 
  | 'manual';

// Asset Depreciation Record
export interface AssetDepreciation {
  id: string;
  assetId: string;
  depreciationDate: string;
  depreciationMethod: DepreciationMethod;
  periodStart: string;
  periodEnd: string;
  beginningBookValue: number;
  depreciationAmount: number;
  endingBookValue: number;
  accumulatedDepreciation: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

// Database row format
export interface AssetDepreciationRow {
  id: string;
  asset_id: string;
  depreciation_date: string;
  depreciation_method: DepreciationMethod;
  period_start: string;
  period_end: string;
  beginning_book_value: number;
  depreciation_amount: number;
  ending_book_value: number;
  accumulated_depreciation: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// Asset Cost Tracking Record
export interface AssetCostTracking {
  id: string;
  assetId: string;
  costType: CostType;
  costDate: string;
  amount: number;
  referenceType?: CostReferenceType;
  referenceId?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

// Database row format
export interface AssetCostTrackingRow {
  id: string;
  asset_id: string;
  cost_type: CostType;
  cost_date: string;
  amount: number;
  reference_type: CostReferenceType | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}
```


```typescript
// TCO Summary (from materialized view)
export interface AssetTCOSummary {
  assetId: string;
  assetCode: string;
  assetName: string;
  categoryName: string;
  purchaseDate?: string;
  purchasePrice: number;
  currentBookValue: number;
  totalKm: number;
  totalHours: number;
  purchaseCost: number;
  totalMaintenanceCost: number;
  totalFuelCost: number;
  totalDepreciation: number;
  totalInsuranceCost: number;
  totalRegistrationCost: number;
  totalOtherCost: number;
  totalTCO: number;
  costPerKm?: number;
  costPerHour?: number;
}

// Database row format for TCO view
export interface AssetTCOSummaryRow {
  asset_id: string;
  asset_code: string;
  asset_name: string;
  category_name: string;
  purchase_date: string | null;
  purchase_price: number;
  current_book_value: number;
  total_km: number;
  total_hours: number;
  purchase_cost: number;
  total_maintenance_cost: number;
  total_fuel_cost: number;
  total_depreciation: number;
  total_insurance_cost: number;
  total_registration_cost: number;
  total_other_cost: number;
  total_tco: number;
  cost_per_km: number | null;
  cost_per_hour: number | null;
}

// Depreciation Schedule Projection
export interface DepreciationProjection {
  periodNumber: number;
  periodStart: string;
  periodEnd: string;
  beginningBookValue: number;
  depreciationAmount: number;
  endingBookValue: number;
  accumulatedDepreciation: number;
  isFullyDepreciated: boolean;
}

// Cost Breakdown Summary
export interface CostBreakdown {
  costType: CostType;
  totalAmount: number;
  percentage: number;
  recordCount: number;
}

// Dashboard Stats
export interface CostingDashboardStats {
  totalFleetValue: number;
  totalAccumulatedDepreciation: number;
  totalTCO: number;
  averageCostPerKm: number;
  assetCount: number;
}

// Batch Processing Result
export interface BatchDepreciationResult {
  processedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: { assetId: string; error: string }[];
}

// Input types
export interface DepreciationInput {
  assetId: string;
  periodStart: string;
  periodEnd: string;
}

export interface CostTrackingInput {
  assetId: string;
  costType: CostType;
  costDate: string;
  amount: number;
  referenceType?: CostReferenceType;
  referenceId?: string;
  notes?: string;
}

// Filter state
export interface CostingFilterState {
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
}
```


### Utility Functions

```typescript
// lib/depreciation-utils.ts

import { DepreciationMethod } from '@/types/assets';
import { 
  CostType, 
  DepreciationProjection, 
  CostBreakdown,
  CostingDashboardStats,
  AssetTCOSummary 
} from '@/types/depreciation';

// Valid cost types
export const COST_TYPES: { value: CostType; label: string }[] = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'registration', label: 'Registration' },
  { value: 'depreciation', label: 'Depreciation' },
  { value: 'other', label: 'Other' },
];

/**
 * Calculate straight-line monthly depreciation
 * Formula: (purchase_price - salvage_value) / useful_life_years / 12
 */
export function calculateStraightLineDepreciation(
  purchasePrice: number | null | undefined,
  salvageValue: number,
  usefulLifeYears: number | null | undefined,
  currentBookValue: number
): number {
  if (!purchasePrice || purchasePrice <= 0) return 0;
  if (!usefulLifeYears || usefulLifeYears <= 0) return 0;
  if (currentBookValue <= salvageValue) return 0;
  
  const annualDepreciation = (purchasePrice - salvageValue) / usefulLifeYears;
  const monthlyDepreciation = annualDepreciation / 12;
  
  // Limit to not go below salvage value
  const maxDepreciation = currentBookValue - salvageValue;
  return Math.min(Math.round(monthlyDepreciation * 100) / 100, maxDepreciation);
}

/**
 * Calculate declining balance monthly depreciation
 * Formula: book_value * (rate / 12) where rate = 2 / useful_life_years
 */
export function calculateDecliningBalanceDepreciation(
  bookValue: number | null | undefined,
  salvageValue: number,
  usefulLifeYears: number | null | undefined
): number {
  if (!bookValue || bookValue <= 0) return 0;
  if (!usefulLifeYears || usefulLifeYears <= 0) return 0;
  if (bookValue <= salvageValue) return 0;
  
  const annualRate = 2 / usefulLifeYears; // Double declining balance
  const monthlyRate = annualRate / 12;
  const monthlyDepreciation = bookValue * monthlyRate;
  
  // Limit to not go below salvage value
  const maxDepreciation = bookValue - salvageValue;
  return Math.min(Math.round(monthlyDepreciation * 100) / 100, maxDepreciation);
}

/**
 * Calculate depreciation based on method
 */
export function calculateDepreciation(
  method: DepreciationMethod,
  purchasePrice: number | null | undefined,
  bookValue: number | null | undefined,
  salvageValue: number,
  usefulLifeYears: number | null | undefined
): number {
  const currentBookValue = bookValue ?? purchasePrice ?? 0;
  
  if (method === 'straight_line') {
    return calculateStraightLineDepreciation(
      purchasePrice,
      salvageValue,
      usefulLifeYears,
      currentBookValue
    );
  } else if (method === 'declining_balance') {
    return calculateDecliningBalanceDepreciation(
      currentBookValue,
      salvageValue,
      usefulLifeYears
    );
  }
  
  return 0;
}
```


```typescript
/**
 * Generate depreciation schedule projection
 */
export function generateDepreciationSchedule(
  method: DepreciationMethod,
  purchasePrice: number | null | undefined,
  currentBookValue: number,
  salvageValue: number,
  usefulLifeYears: number | null | undefined,
  accumulatedDepreciation: number,
  periodsToProject: number = 60 // 5 years default
): DepreciationProjection[] {
  const projections: DepreciationProjection[] = [];
  
  if (!purchasePrice || !usefulLifeYears) return projections;
  
  let bookValue = currentBookValue;
  let accumulated = accumulatedDepreciation;
  const today = new Date();
  
  for (let i = 0; i < periodsToProject; i++) {
    const periodStart = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const periodEnd = new Date(today.getFullYear(), today.getMonth() + i + 1, 0);
    
    const depreciation = calculateDepreciation(
      method,
      purchasePrice,
      bookValue,
      salvageValue,
      usefulLifeYears
    );
    
    const endingBookValue = bookValue - depreciation;
    accumulated += depreciation;
    
    projections.push({
      periodNumber: i + 1,
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
      beginningBookValue: Math.round(bookValue * 100) / 100,
      depreciationAmount: depreciation,
      endingBookValue: Math.round(endingBookValue * 100) / 100,
      accumulatedDepreciation: Math.round(accumulated * 100) / 100,
      isFullyDepreciated: endingBookValue <= salvageValue,
    });
    
    if (endingBookValue <= salvageValue) break;
    bookValue = endingBookValue;
  }
  
  return projections;
}

/**
 * Calculate cost breakdown percentages
 */
export function calculateCostBreakdown(
  costs: { costType: CostType; amount: number }[]
): CostBreakdown[] {
  const grouped = costs.reduce((acc, cost) => {
    if (!acc[cost.costType]) {
      acc[cost.costType] = { total: 0, count: 0 };
    }
    acc[cost.costType].total += cost.amount;
    acc[cost.costType].count += 1;
    return acc;
  }, {} as Record<CostType, { total: number; count: number }>);
  
  const totalAmount = Object.values(grouped).reduce((sum, g) => sum + g.total, 0);
  
  return Object.entries(grouped).map(([costType, data]) => ({
    costType: costType as CostType,
    totalAmount: Math.round(data.total * 100) / 100,
    percentage: totalAmount > 0 
      ? Math.round((data.total / totalAmount) * 1000) / 10 
      : 0,
    recordCount: data.count,
  }));
}

/**
 * Calculate dashboard stats from TCO summaries
 */
export function calculateCostingDashboardStats(
  summaries: AssetTCOSummary[]
): CostingDashboardStats {
  if (summaries.length === 0) {
    return {
      totalFleetValue: 0,
      totalAccumulatedDepreciation: 0,
      totalTCO: 0,
      averageCostPerKm: 0,
      assetCount: 0,
    };
  }
  
  const totalFleetValue = summaries.reduce((sum, s) => sum + s.currentBookValue, 0);
  const totalDepreciation = summaries.reduce((sum, s) => sum + s.totalDepreciation, 0);
  const totalTCO = summaries.reduce((sum, s) => sum + s.totalTCO, 0);
  const totalKm = summaries.reduce((sum, s) => sum + s.totalKm, 0);
  
  return {
    totalFleetValue: Math.round(totalFleetValue * 100) / 100,
    totalAccumulatedDepreciation: Math.round(totalDepreciation * 100) / 100,
    totalTCO: Math.round(totalTCO * 100) / 100,
    averageCostPerKm: totalKm > 0 
      ? Math.round((totalTCO / totalKm) * 100) / 100 
      : 0,
    assetCount: summaries.length,
  };
}

/**
 * Calculate cost per km
 */
export function calculateCostPerKm(totalCost: number, totalKm: number): number | undefined {
  if (totalKm <= 0 || totalCost <= 0) return undefined;
  return Math.round((totalCost / totalKm) * 100) / 100;
}

/**
 * Calculate cost per hour
 */
export function calculateCostPerHour(totalCost: number, totalHours: number): number | undefined {
  if (totalHours <= 0 || totalCost <= 0) return undefined;
  return Math.round((totalCost / totalHours) * 100) / 100;
}

/**
 * Validate depreciation amount
 */
export function validateDepreciationAmount(
  amount: number,
  beginningBookValue: number,
  salvageValue: number
): { valid: boolean; error?: string } {
  if (amount < 0) {
    return { valid: false, error: 'Depreciation amount cannot be negative' };
  }
  if (amount > beginningBookValue - salvageValue) {
    return { valid: false, error: 'Depreciation would reduce book value below salvage value' };
  }
  return { valid: true };
}

/**
 * Validate cost amount
 */
export function validateCostAmount(amount: number): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'Cost amount must be positive' };
  }
  return { valid: true };
}

/**
 * Check if cost type is valid
 */
export function isValidCostType(type: string): type is CostType {
  return ['purchase', 'maintenance', 'fuel', 'insurance', 'registration', 'depreciation', 'other'].includes(type);
}
```


```typescript
/**
 * Transform database row to interface
 */
export function transformDepreciationRow(row: AssetDepreciationRow): AssetDepreciation {
  return {
    id: row.id,
    assetId: row.asset_id,
    depreciationDate: row.depreciation_date,
    depreciationMethod: row.depreciation_method,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    beginningBookValue: row.beginning_book_value,
    depreciationAmount: row.depreciation_amount,
    endingBookValue: row.ending_book_value,
    accumulatedDepreciation: row.accumulated_depreciation,
    notes: row.notes ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
  };
}

export function transformCostTrackingRow(row: AssetCostTrackingRow): AssetCostTracking {
  return {
    id: row.id,
    assetId: row.asset_id,
    costType: row.cost_type,
    costDate: row.cost_date,
    amount: row.amount,
    referenceType: row.reference_type ?? undefined,
    referenceId: row.reference_id ?? undefined,
    notes: row.notes ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
  };
}

export function transformTCOSummaryRow(row: AssetTCOSummaryRow): AssetTCOSummary {
  return {
    assetId: row.asset_id,
    assetCode: row.asset_code,
    assetName: row.asset_name,
    categoryName: row.category_name,
    purchaseDate: row.purchase_date ?? undefined,
    purchasePrice: row.purchase_price,
    currentBookValue: row.current_book_value,
    totalKm: row.total_km,
    totalHours: row.total_hours,
    purchaseCost: row.purchase_cost,
    totalMaintenanceCost: row.total_maintenance_cost,
    totalFuelCost: row.total_fuel_cost,
    totalDepreciation: row.total_depreciation,
    totalInsuranceCost: row.total_insurance_cost,
    totalRegistrationCost: row.total_registration_cost,
    totalOtherCost: row.total_other_cost,
    totalTCO: row.total_tco,
    costPerKm: row.cost_per_km ?? undefined,
    costPerHour: row.cost_per_hour ?? undefined,
  };
}

/**
 * Get period dates for a given month
 */
export function getMonthPeriod(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Check if asset is eligible for depreciation
 */
export function isEligibleForDepreciation(
  status: string,
  depreciationStartDate: string | null | undefined,
  processingDate: Date
): boolean {
  if (status !== 'active') return false;
  if (!depreciationStartDate) return false;
  
  const startDate = new Date(depreciationStartDate);
  return startDate <= processingDate;
}
```

## Data Models

### Database Schema

```sql
-- =====================================================
-- v0.44: EQUIPMENT - DEPRECIATION & COSTING
-- =====================================================

-- Asset depreciation records
CREATE TABLE asset_depreciation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id),
  depreciation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  depreciation_method VARCHAR(30) NOT NULL, -- 'straight_line', 'declining_balance'
  
  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Values
  beginning_book_value DECIMAL(15,2) NOT NULL,
  depreciation_amount DECIMAL(15,2) NOT NULL CHECK (depreciation_amount >= 0),
  ending_book_value DECIMAL(15,2) NOT NULL,
  accumulated_depreciation DECIMAL(15,2) NOT NULL,
  
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate depreciation for same period
  UNIQUE(asset_id, period_start, period_end),
  
  -- Ensure ending = beginning - depreciation
  CHECK (ending_book_value = beginning_book_value - depreciation_amount)
);

-- Asset cost tracking
CREATE TABLE asset_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id),
  cost_type VARCHAR(30) NOT NULL, -- 'purchase', 'maintenance', 'fuel', 'insurance', 'registration', 'depreciation', 'other'
  cost_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  
  -- Reference to source record
  reference_type VARCHAR(30), -- 'maintenance_record', 'daily_log', 'depreciation', 'manual'
  reference_id UUID,
  
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_asset_depreciation_asset ON asset_depreciation(asset_id);
CREATE INDEX idx_asset_depreciation_date ON asset_depreciation(depreciation_date);
CREATE INDEX idx_asset_depreciation_period ON asset_depreciation(period_start, period_end);
CREATE INDEX idx_asset_cost_tracking_asset ON asset_cost_tracking(asset_id);
CREATE INDEX idx_asset_cost_tracking_type ON asset_cost_tracking(cost_type);
CREATE INDEX idx_asset_cost_tracking_date ON asset_cost_tracking(cost_date);
```


```sql
-- TCO Summary materialized view
CREATE MATERIALIZED VIEW asset_tco_summary AS
SELECT 
  a.id as asset_id,
  a.asset_code,
  a.asset_name,
  ac.category_name,
  a.purchase_date,
  COALESCE(a.purchase_price, 0) as purchase_price,
  COALESCE(a.book_value, a.purchase_price, 0) as current_book_value,
  
  -- Usage from utilization
  COALESCE(u.total_km, 0) as total_km,
  COALESCE(u.total_hours, 0) as total_hours,
  
  -- Costs by type
  COALESCE(a.purchase_price, 0) as purchase_cost,
  COALESCE(SUM(ct.amount) FILTER (WHERE ct.cost_type = 'maintenance'), 0) as total_maintenance_cost,
  COALESCE(SUM(ct.amount) FILTER (WHERE ct.cost_type = 'fuel'), 0) as total_fuel_cost,
  COALESCE(SUM(ct.amount) FILTER (WHERE ct.cost_type = 'depreciation'), 0) as total_depreciation,
  COALESCE(SUM(ct.amount) FILTER (WHERE ct.cost_type = 'insurance'), 0) as total_insurance_cost,
  COALESCE(SUM(ct.amount) FILTER (WHERE ct.cost_type = 'registration'), 0) as total_registration_cost,
  COALESCE(SUM(ct.amount) FILTER (WHERE ct.cost_type = 'other'), 0) as total_other_cost,
  
  -- Total TCO
  COALESCE(a.purchase_price, 0) + COALESCE(SUM(ct.amount), 0) as total_tco,
  
  -- Cost efficiency
  CASE 
    WHEN COALESCE(u.total_km, 0) > 0 THEN 
      ROUND((COALESCE(a.purchase_price, 0) + COALESCE(SUM(ct.amount), 0))::NUMERIC / u.total_km, 2)
    ELSE NULL
  END as cost_per_km,
  CASE 
    WHEN COALESCE(u.total_hours, 0) > 0 THEN 
      ROUND((COALESCE(a.purchase_price, 0) + COALESCE(SUM(ct.amount), 0))::NUMERIC / u.total_hours, 2)
    ELSE NULL
  END as cost_per_hour

FROM assets a
JOIN asset_categories ac ON a.category_id = ac.id
LEFT JOIN asset_cost_tracking ct ON a.id = ct.asset_id
LEFT JOIN (
  SELECT 
    asset_id,
    SUM(total_km) as total_km,
    SUM(total_hours) as total_hours
  FROM asset_utilization_monthly
  GROUP BY asset_id
) u ON a.id = u.asset_id
WHERE a.status NOT IN ('disposed', 'sold')
GROUP BY a.id, a.asset_code, a.asset_name, ac.category_name, a.purchase_date, 
         a.purchase_price, a.book_value, u.total_km, u.total_hours;

CREATE UNIQUE INDEX idx_tco_summary_asset ON asset_tco_summary(asset_id);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_asset_tco_summary()
RETURNS void AS $
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY asset_tco_summary;
END;
$ LANGUAGE plpgsql;

-- View for depreciation history with asset details
CREATE OR REPLACE VIEW depreciation_history AS
SELECT 
  ad.*,
  a.asset_code,
  a.asset_name,
  a.salvage_value,
  ac.category_name
FROM asset_depreciation ad
JOIN assets a ON ad.asset_id = a.id
JOIN asset_categories ac ON a.category_id = ac.id
ORDER BY ad.depreciation_date DESC;

-- View for cost history with asset details
CREATE OR REPLACE VIEW cost_history AS
SELECT 
  ct.*,
  a.asset_code,
  a.asset_name,
  ac.category_name
FROM asset_cost_tracking ct
JOIN assets a ON ct.asset_id = a.id
JOIN asset_categories ac ON a.category_id = ac.id
ORDER BY ct.cost_date DESC;
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do.*

### Property 1: Straight-Line Depreciation Formula

*For any* asset with valid purchase_price, salvage_value, and useful_life_years, the monthly straight-line depreciation SHALL equal (purchase_price - salvage_value) / useful_life_years / 12, limited to not reduce book_value below salvage_value.

**Validates: Requirements 3.1, 3.4**

### Property 2: Declining Balance Depreciation Formula

*For any* asset with valid book_value, salvage_value, and useful_life_years, the monthly declining balance depreciation SHALL equal book_value * (2 / useful_life_years) / 12, limited to not reduce book_value below salvage_value.

**Validates: Requirements 4.1, 4.2, 4.4**

### Property 3: Zero Depreciation Conditions

*For any* asset, depreciation SHALL be zero when:
- purchase_price is null, undefined, or <= 0
- useful_life_years is null, undefined, or <= 0
- book_value <= salvage_value (fully depreciated)

**Validates: Requirements 3.2, 3.3, 3.5, 4.3, 4.5**

### Property 4: Book Value Consistency

*For any* depreciation record, ending_book_value SHALL equal beginning_book_value minus depreciation_amount.

**Validates: Requirements 1.3**

### Property 5: Salvage Value Floor

*For any* depreciation calculation, the resulting book_value SHALL never be less than salvage_value.

**Validates: Requirements 1.4, 3.4, 4.4**

### Property 6: Non-Negative Depreciation

*For any* depreciation record, depreciation_amount SHALL be >= 0.

**Validates: Requirements 1.2**

### Property 7: Positive Cost Amount

*For any* cost tracking record, amount SHALL be > 0.

**Validates: Requirements 2.3**

### Property 8: TCO Calculation

*For any* asset, total_tco SHALL equal purchase_cost + sum of all cost_tracking amounts.

**Validates: Requirements 6.2**

### Property 9: Cost Per Km Calculation

*For any* asset with total_km > 0, cost_per_km SHALL equal total_tco / total_km.

**Validates: Requirements 6.3**

### Property 10: Cost Per Hour Calculation

*For any* asset with total_hours > 0, cost_per_hour SHALL equal total_tco / total_hours.

**Validates: Requirements 6.4**

### Property 11: Cost Breakdown Percentages

*For any* cost breakdown, the sum of all percentages SHALL equal 100% (within rounding tolerance).

**Validates: Requirements 9.2**

### Property 12: Depreciation Eligibility

*For any* asset, it SHALL be eligible for depreciation only if status is 'active' AND depreciation_start_date is on or before the processing date.

**Validates: Requirements 5.1**


## Error Handling

### Depreciation Errors

| Error Condition | Error Message | HTTP Status |
|----------------|---------------|-------------|
| Asset not found | "Asset not found" | 404 |
| Asset not active | "Asset is not active" | 400 |
| No depreciation start date | "Asset has no depreciation start date" | 400 |
| Already depreciated for period | "Depreciation already recorded for this period" | 409 |
| Invalid depreciation amount | "Depreciation amount cannot be negative" | 400 |
| Would exceed salvage value | "Depreciation would reduce book value below salvage value" | 400 |

### Cost Tracking Errors

| Error Condition | Error Message | HTTP Status |
|----------------|---------------|-------------|
| Asset not found | "Asset not found" | 404 |
| Invalid cost type | "Invalid cost type" | 400 |
| Invalid amount | "Cost amount must be positive" | 400 |
| Reference not found | "Referenced record not found" | 404 |

### Batch Processing Errors

| Error Condition | Error Message | HTTP Status |
|----------------|---------------|-------------|
| Invalid month | "Invalid month format" | 400 |
| Database error | "Failed to process depreciation batch" | 500 |

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **Utility function tests** (`__tests__/depreciation-utils.test.ts`)
   - Test `calculateStraightLineDepreciation` with various inputs
   - Test `calculateDecliningBalanceDepreciation` with various inputs
   - Test `generateDepreciationSchedule` with both methods
   - Test `calculateCostBreakdown` with sample data
   - Test transform functions with sample data

2. **Validation tests**
   - Test `validateDepreciationAmount` with valid and invalid values
   - Test `validateCostAmount` with valid and invalid values
   - Test `isValidCostType` with valid and invalid types

### Property-Based Tests

Property-based tests will use `fast-check` library to verify universal properties:

1. **Property tests** (`__tests__/depreciation-utils.property.test.ts`)
   - Each property from the Correctness Properties section
   - Minimum 100 iterations per property
   - Use `Math.fround()` for float constraints to avoid 32-bit float errors
   - Tag format: `Feature: equipment-depreciation-costing, Property N: description`

### Test Configuration

Property tests should be annotated with requirement references:
```typescript
// Example property test annotation
// **Validates: Requirements 3.1, 3.4**
test.prop([fc.float(), fc.float(), fc.integer()])('Property 1: Straight-Line Depreciation Formula', ...);
```

