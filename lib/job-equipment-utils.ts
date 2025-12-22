// =====================================================
// v0.45: EQUIPMENT - JOB INTEGRATION UTILITY FUNCTIONS
// =====================================================

import {
  RateType,
  UsageRateType,
  AddEquipmentInput,
  ValidationResult,
  EquipmentCostSummary,
  JobEquipmentUsage,
} from '@/types/job-equipment';

// =====================================================
// CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate usage days between two dates (inclusive)
 * Property 1: For any valid usage start date and usage end date (where end >= start),
 * the calculated usage_days SHALL equal (end_date - start_date + 1)
 */
export function calculateUsageDays(
  usageStart: string,
  usageEnd: string | null | undefined
): number {
  const start = new Date(usageStart);
  start.setHours(0, 0, 0, 0);
  
  const end = usageEnd ? new Date(usageEnd) : new Date();
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

/**
 * Calculate meter usage (km or hours)
 * Property 2: For any valid meter readings where end >= start,
 * usage SHALL equal (end - start)
 */
export function calculateMeterUsage(
  startValue: number | null | undefined,
  endValue: number | null | undefined
): number | null {
  if (startValue == null || endValue == null) {
    return null;
  }
  return endValue - startValue;
}

/**
 * Calculate depreciation cost for equipment usage
 * Property 3: For any asset with book_value > 0 and useful_life_years > 0,
 * depreciation_cost SHALL equal (book_value / (useful_life_years * 365)) * usage_days
 */
export function calculateDepreciationCost(
  bookValue: number,
  usefulLifeYears: number,
  usageDays: number
): number {
  if (bookValue <= 0 || usefulLifeYears <= 0 || usageDays <= 0) {
    return 0;
  }
  
  const dailyDepreciation = bookValue / (usefulLifeYears * 365);
  return Math.round(dailyDepreciation * usageDays * 100) / 100;
}

/**
 * Calculate total equipment cost
 * Property 4: total_cost SHALL equal the sum of depreciation_cost, fuel_cost,
 * maintenance_cost, and operator_cost
 */
export function calculateTotalCost(
  depreciationCost: number,
  fuelCost: number,
  maintenanceCost: number,
  operatorCost: number
): number {
  return (
    (depreciationCost || 0) +
    (fuelCost || 0) +
    (maintenanceCost || 0) +
    (operatorCost || 0)
  );
}

/**
 * Calculate billing amount based on rate type
 * Property 6: Billing calculation by rate type
 * - If rate_type is 'daily', billing_amount SHALL equal daily_rate * usage_days
 * - If rate_type is 'hourly', billing_amount SHALL equal hourly_rate * hours_used
 * - If rate_type is 'per_km', billing_amount SHALL equal per_km_rate * km_used
 */
export function calculateBillingAmount(
  rateType: RateType | UsageRateType,
  rateAmount: number,
  usageDays: number,
  hoursUsed: number | null | undefined,
  kmUsed: number | null | undefined
): number {
  if (rateAmount <= 0) {
    return 0;
  }

  switch (rateType) {
    case 'daily':
      return Math.round(rateAmount * usageDays * 100) / 100;
    case 'hourly':
      if (hoursUsed == null || hoursUsed <= 0) return 0;
      return Math.round(rateAmount * hoursUsed * 100) / 100;
    case 'per_km':
      if (kmUsed == null || kmUsed <= 0) return 0;
      return Math.round(rateAmount * kmUsed * 100) / 100;
    case 'per_trip':
      return rateAmount;
    case 'actual':
      // For 'actual' rate type, billing is calculated separately
      return 0;
    default:
      return 0;
  }
}

/**
 * Calculate equipment margin
 * Property 7: equipment_margin SHALL equal (billing_amount - total_cost)
 * and margin_percent SHALL equal ((billing_amount - total_cost) / billing_amount) * 100
 * when billing_amount > 0
 */
export function calculateEquipmentMargin(
  billingAmount: number,
  totalCost: number
): { margin: number; marginPercent: number } {
  const margin = (billingAmount || 0) - (totalCost || 0);
  const marginPercent =
    billingAmount > 0 ? Math.round((margin / billingAmount) * 10000) / 100 : 0;

  return { margin, marginPercent };
}

/**
 * Calculate equipment cost summary for a job
 */
export function calculateEquipmentCostSummary(
  usages: JobEquipmentUsage[]
): EquipmentCostSummary {
  const depreciationTotal = usages.reduce(
    (sum, u) => sum + (u.depreciationCost || 0),
    0
  );
  const fuelTotal = usages.reduce((sum, u) => sum + (u.fuelCost || 0), 0);
  const maintenanceTotal = usages.reduce(
    (sum, u) => sum + (u.maintenanceCost || 0),
    0
  );
  const operatorTotal = usages.reduce(
    (sum, u) => sum + (u.operatorCost || 0),
    0
  );
  const totalEquipmentCost = usages.reduce(
    (sum, u) => sum + (u.totalCost || 0),
    0
  );
  const totalBilling = usages
    .filter((u) => u.isBillable)
    .reduce((sum, u) => sum + (u.billingAmount || 0), 0);

  const { margin, marginPercent } = calculateEquipmentMargin(
    totalBilling,
    totalEquipmentCost
  );

  return {
    totalEquipmentCost,
    totalBilling,
    equipmentMargin: margin,
    equipmentMarginPercent: marginPercent,
    depreciationTotal,
    fuelTotal,
    maintenanceTotal,
    operatorTotal,
  };
}

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/**
 * Validate equipment usage input
 * Property 8, 9, 10: Validates required fields and constraints
 */
export function validateEquipmentUsageInput(
  input: AddEquipmentInput
): ValidationResult {
  if (!input.jobOrderId) {
    return { valid: false, error: 'Job order ID is required' };
  }

  if (!input.assetId) {
    return { valid: false, error: 'Asset ID is required' };
  }

  if (!input.usageStart) {
    return { valid: false, error: 'Usage start date is required' };
  }

  // Validate date format
  const startDate = new Date(input.usageStart);
  if (isNaN(startDate.getTime())) {
    return { valid: false, error: 'Invalid usage start date format' };
  }

  // Validate daily rate if provided
  if (input.dailyRate !== undefined && input.dailyRate < 0) {
    return { valid: false, error: 'Daily rate cannot be negative' };
  }

  return { valid: true };
}

/**
 * Validate meter readings
 * Property 8: The system SHALL reject updates where end_km < start_km
 * or end_hours < start_hours
 */
export function validateMeterReadings(
  startKm: number | null | undefined,
  endKm: number | null | undefined,
  startHours: number | null | undefined,
  endHours: number | null | undefined
): ValidationResult {
  // Validate km readings
  if (startKm != null && endKm != null && endKm < startKm) {
    return {
      valid: false,
      error: 'End km cannot be less than start km',
    };
  }

  // Validate hour readings
  if (startHours != null && endHours != null && endHours < startHours) {
    return {
      valid: false,
      error: 'End hours cannot be less than start hours',
    };
  }

  // Validate non-negative values
  if (startKm != null && startKm < 0) {
    return { valid: false, error: 'Start km cannot be negative' };
  }

  if (endKm != null && endKm < 0) {
    return { valid: false, error: 'End km cannot be negative' };
  }

  if (startHours != null && startHours < 0) {
    return { valid: false, error: 'Start hours cannot be negative' };
  }

  if (endHours != null && endHours < 0) {
    return { valid: false, error: 'End hours cannot be negative' };
  }

  return { valid: true };
}

/**
 * Validate usage dates
 * Property 9: The system SHALL reject updates where usage_end < usage_start
 */
export function validateUsageDates(
  usageStart: string,
  usageEnd: string | null | undefined
): ValidationResult {
  if (!usageStart) {
    return { valid: false, error: 'Usage start date is required' };
  }

  const startDate = new Date(usageStart);
  if (isNaN(startDate.getTime())) {
    return { valid: false, error: 'Invalid usage start date format' };
  }

  if (usageEnd) {
    const endDate = new Date(usageEnd);
    if (isNaN(endDate.getTime())) {
      return { valid: false, error: 'Invalid usage end date format' };
    }

    // Normalize dates to compare only date parts
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (endDate < startDate) {
      return {
        valid: false,
        error: 'Usage end date cannot be before start date',
      };
    }
  }

  return { valid: true };
}

// =====================================================
// FORMATTING FUNCTIONS
// =====================================================

/**
 * Format currency for display (Indonesian Rupiah)
 */
export function formatEquipmentCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatEquipmentPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Get rate type display label
 */
export function getRateTypeLabel(rateType: RateType | UsageRateType): string {
  const labels: Record<string, string> = {
    daily: 'Per Hari',
    hourly: 'Per Jam',
    per_km: 'Per KM',
    per_trip: 'Per Trip',
    actual: 'Aktual',
  };
  return labels[rateType] || rateType;
}

/**
 * Get margin status color based on percentage
 */
export function getMarginStatusColor(marginPercent: number): string {
  if (marginPercent >= 20) return 'text-green-600';
  if (marginPercent >= 10) return 'text-yellow-600';
  if (marginPercent >= 0) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Get margin status badge variant
 */
export function getMarginStatusBadge(
  marginPercent: number
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (marginPercent >= 20) return 'default';
  if (marginPercent >= 10) return 'secondary';
  if (marginPercent >= 0) return 'outline';
  return 'destructive';
}
