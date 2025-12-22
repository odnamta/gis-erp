// =====================================================
// v0.45: EQUIPMENT - JOB INTEGRATION TYPES
// =====================================================

// Rate type options for equipment billing
export type RateType = 'daily' | 'hourly' | 'per_km' | 'per_trip';

// Usage rate type (how cost is calculated for a specific usage)
export type UsageRateType = 'actual' | 'daily' | 'hourly' | 'per_km';

// Job Equipment Usage interface
export interface JobEquipmentUsage {
  id: string;
  jobOrderId: string;
  assetId: string;
  assignmentId?: string;
  usageStart: string;
  usageEnd?: string;
  startKm?: number;
  endKm?: number;
  kmUsed?: number;
  startHours?: number;
  endHours?: number;
  hoursUsed?: number;
  depreciationCost: number;
  fuelCost: number;
  maintenanceCost: number;
  operatorCost: number;
  totalCost: number;
  dailyRate?: number;
  rateType: UsageRateType;
  isBillable: boolean;
  billingAmount?: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  asset?: {
    assetCode: string;
    assetName: string;
    registrationNumber?: string;
    bookValue?: number;
    usefulLifeYears?: number;
    categoryId?: string;
  };
  jobOrder?: {
    joNumber: string;
    customerName?: string;
  };
}

// Database row format for JobEquipmentUsage
export interface JobEquipmentUsageRow {
  id: string;
  job_order_id: string;
  asset_id: string;
  assignment_id: string | null;
  usage_start: string;
  usage_end: string | null;
  start_km: number | null;
  end_km: number | null;
  km_used: number | null;
  start_hours: number | null;
  end_hours: number | null;
  hours_used: number | null;
  depreciation_cost: number;
  fuel_cost: number;
  maintenance_cost: number;
  operator_cost: number;
  total_cost: number;
  daily_rate: number | null;
  rate_type: string;
  is_billable: boolean;
  billing_amount: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Extended row with joined asset data
export interface JobEquipmentUsageWithAssetRow extends JobEquipmentUsageRow {
  asset_code: string;
  asset_name: string;
  registration_number: string | null;
  book_value: number | null;
  useful_life_years: number | null;
  category_id: string | null;
}

// Equipment Rate interface
export interface EquipmentRate {
  id: string;
  assetId?: string;
  categoryId?: string;
  rateType: RateType;
  rateAmount: number;
  minDays?: number;
  includesOperator: boolean;
  includesFuel: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
}

// Database row format for EquipmentRate
export interface EquipmentRateRow {
  id: string;
  asset_id: string | null;
  category_id: string | null;
  rate_type: string;
  rate_amount: number;
  min_days: number | null;
  includes_operator: boolean;
  includes_fuel: boolean;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  created_at: string;
}

// Job Equipment Summary (aggregated view)
export interface JobEquipmentSummary {
  jobOrderId: string;
  joNumber: string;
  customerName: string;
  equipmentCount: number;
  totalEquipmentDays: number;
  totalKm: number;
  totalHours: number;
  totalEquipmentCost: number;
  totalBilling: number;
  equipmentMargin: number;
  equipmentMarginPercent: number;
}

// Input types for adding equipment to job
export interface AddEquipmentInput {
  jobOrderId: string;
  assetId: string;
  usageStart: string;
  startKm?: number;
  startHours?: number;
  dailyRate?: number;
  rateType?: UsageRateType;
  isBillable?: boolean;
  notes?: string;
}

// Input types for completing equipment usage
export interface CompleteEquipmentUsageInput {
  usageId: string;
  usageEnd: string;
  endKm?: number;
  endHours?: number;
  fuelCost?: number;
  operatorCost?: number;
  maintenanceCost?: number;
  billingAmount?: number;
}

// Equipment cost summary for a job
export interface EquipmentCostSummary {
  totalEquipmentCost: number;
  totalBilling: number;
  equipmentMargin: number;
  equipmentMarginPercent: number;
  depreciationTotal: number;
  fuelTotal: number;
  maintenanceTotal: number;
  operatorTotal: number;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// =====================================================
// TRANSFORM FUNCTIONS
// =====================================================

/**
 * Transform database row to JobEquipmentUsage interface
 */
export function transformJobEquipmentUsageRow(
  row: JobEquipmentUsageRow
): JobEquipmentUsage {
  return {
    id: row.id,
    jobOrderId: row.job_order_id,
    assetId: row.asset_id,
    assignmentId: row.assignment_id ?? undefined,
    usageStart: row.usage_start,
    usageEnd: row.usage_end ?? undefined,
    startKm: row.start_km ?? undefined,
    endKm: row.end_km ?? undefined,
    kmUsed: row.km_used ?? undefined,
    startHours: row.start_hours ?? undefined,
    endHours: row.end_hours ?? undefined,
    hoursUsed: row.hours_used ?? undefined,
    depreciationCost: row.depreciation_cost,
    fuelCost: row.fuel_cost,
    maintenanceCost: row.maintenance_cost,
    operatorCost: row.operator_cost,
    totalCost: row.total_cost,
    dailyRate: row.daily_rate ?? undefined,
    rateType: row.rate_type as UsageRateType,
    isBillable: row.is_billable,
    billingAmount: row.billing_amount ?? undefined,
    notes: row.notes ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Transform database row with asset data to JobEquipmentUsage interface
 */
export function transformJobEquipmentUsageWithAssetRow(
  row: JobEquipmentUsageWithAssetRow
): JobEquipmentUsage {
  return {
    ...transformJobEquipmentUsageRow(row),
    asset: {
      assetCode: row.asset_code,
      assetName: row.asset_name,
      registrationNumber: row.registration_number ?? undefined,
      bookValue: row.book_value ?? undefined,
      usefulLifeYears: row.useful_life_years ?? undefined,
      categoryId: row.category_id ?? undefined,
    },
  };
}

/**
 * Transform database row to EquipmentRate interface
 */
export function transformEquipmentRateRow(
  row: EquipmentRateRow
): EquipmentRate {
  return {
    id: row.id,
    assetId: row.asset_id ?? undefined,
    categoryId: row.category_id ?? undefined,
    rateType: row.rate_type as RateType,
    rateAmount: row.rate_amount,
    minDays: row.min_days ?? undefined,
    includesOperator: row.includes_operator,
    includesFuel: row.includes_fuel,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

/**
 * Calculate usage days between two dates (inclusive)
 * If usageEnd is null, uses current date
 */
export function calculateUsageDays(
  usageStart: string,
  usageEnd: string | null | undefined
): number {
  const start = new Date(usageStart);
  const end = usageEnd ? new Date(usageEnd) : new Date();
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}
