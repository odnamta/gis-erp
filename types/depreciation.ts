// =====================================================
// v0.44: EQUIPMENT - DEPRECIATION & COSTING TYPES
// =====================================================

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

// Validation result
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Depreciation history view row (with joined fields)
export interface DepreciationHistoryRow extends AssetDepreciationRow {
  asset_code: string;
  asset_name: string;
  salvage_value: number;
  category_name: string;
}

// Cost history view row (with joined fields)
export interface CostHistoryRow extends AssetCostTrackingRow {
  asset_code: string;
  asset_name: string;
  category_name: string;
}

// Transform functions: Row to Interface
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
