// =====================================================
// v0.44: EQUIPMENT - DEPRECIATION & COSTING UTILITIES
// =====================================================

import { DepreciationMethod } from '@/types/assets';
import { 
  CostType, 
  DepreciationProjection, 
  CostBreakdown,
  CostingDashboardStats,
  AssetTCOSummary,
  ValidationResult,
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
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */
export function calculateStraightLineDepreciation(
  purchasePrice: number | null | undefined,
  salvageValue: number,
  usefulLifeYears: number | null | undefined,
  currentBookValue: number
): number {
  // Req 3.2: Return 0 if no purchase_price
  if (!purchasePrice || purchasePrice <= 0) return 0;
  // Req 3.3: Return 0 if no useful_life_years or <= 0
  if (!usefulLifeYears || usefulLifeYears <= 0) return 0;
  // Req 3.5: Return 0 if fully depreciated
  if (currentBookValue <= salvageValue) return 0;
  
  // Req 3.1: Formula
  const annualDepreciation = (purchasePrice - salvageValue) / usefulLifeYears;
  const monthlyDepreciation = annualDepreciation / 12;
  
  // Req 3.4: Limit to not go below salvage value
  const maxDepreciation = currentBookValue - salvageValue;
  return Math.min(Math.round(monthlyDepreciation * 100) / 100, maxDepreciation);
}

/**
 * Calculate declining balance monthly depreciation
 * Formula: book_value * (rate / 12) where rate = 2 / useful_life_years
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
 */
export function calculateDecliningBalanceDepreciation(
  bookValue: number | null | undefined,
  salvageValue: number,
  usefulLifeYears: number | null | undefined
): number {
  // Req 4.3: Return 0 if no book_value or <= 0
  if (!bookValue || bookValue <= 0) return 0;
  // Return 0 if no useful_life_years or <= 0
  if (!usefulLifeYears || usefulLifeYears <= 0) return 0;
  // Req 4.5: Return 0 if fully depreciated
  if (bookValue <= salvageValue) return 0;
  
  // Req 4.2: Default rate = 2 / useful_life_years (double declining balance)
  const annualRate = 2 / usefulLifeYears;
  // Req 4.1: Monthly rate
  const monthlyRate = annualRate / 12;
  const monthlyDepreciation = bookValue * monthlyRate;
  
  // Req 4.4: Limit to not go below salvage value
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


/**
 * Generate depreciation schedule projection
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
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
    
    // Req 8.3: Stop when fully depreciated
    if (endingBookValue <= salvageValue) break;
    bookValue = endingBookValue;
  }
  
  return projections;
}

/**
 * Calculate cost breakdown percentages
 * **Validates: Requirements 9.1, 9.2**
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
 * **Validates: Requirements 7.1**
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
 * **Validates: Requirements 6.3**
 */
export function calculateCostPerKm(totalCost: number, totalKm: number): number | undefined {
  if (totalKm <= 0 || totalCost <= 0) return undefined;
  return Math.round((totalCost / totalKm) * 100) / 100;
}

/**
 * Calculate cost per hour
 * **Validates: Requirements 6.4**
 */
export function calculateCostPerHour(totalCost: number, totalHours: number): number | undefined {
  if (totalHours <= 0 || totalCost <= 0) return undefined;
  return Math.round((totalCost / totalHours) * 100) / 100;
}


/**
 * Validate depreciation amount
 * **Validates: Requirements 1.2, 1.3, 1.4**
 */
export function validateDepreciationAmount(
  amount: number,
  beginningBookValue: number,
  salvageValue: number
): ValidationResult {
  // Req 1.2: Non-negative
  if (amount < 0) {
    return { valid: false, error: 'Depreciation amount cannot be negative' };
  }
  // Req 1.4: Cannot reduce below salvage value
  if (amount > beginningBookValue - salvageValue) {
    return { valid: false, error: 'Depreciation would reduce book value below salvage value' };
  }
  return { valid: true };
}

/**
 * Validate cost amount
 * **Validates: Requirements 2.3**
 */
export function validateCostAmount(amount: number): ValidationResult {
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
 * **Validates: Requirements 5.1**
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

/**
 * Calculate TCO from cost components
 * **Validates: Requirements 6.2**
 */
export function calculateTCO(
  purchaseCost: number,
  maintenanceCost: number,
  fuelCost: number,
  depreciationCost: number,
  insuranceCost: number,
  registrationCost: number,
  otherCost: number
): number {
  return Math.round((
    purchaseCost + 
    maintenanceCost + 
    fuelCost + 
    depreciationCost + 
    insuranceCost + 
    registrationCost + 
    otherCost
  ) * 100) / 100;
}

/**
 * Calculate sum of cost breakdown percentages
 * **Validates: Property 11**
 */
export function sumCostBreakdownPercentages(breakdown: CostBreakdown[]): number {
  return breakdown.reduce((sum, b) => sum + b.percentage, 0);
}

/**
 * Get cost type label
 */
export function getCostTypeLabel(type: CostType): string {
  const found = COST_TYPES.find(t => t.value === type);
  return found?.label ?? type;
}

/**
 * Format depreciation method for display
 */
export function formatDepreciationMethod(method: DepreciationMethod): string {
  switch (method) {
    case 'straight_line':
      return 'Straight Line';
    case 'declining_balance':
      return 'Declining Balance';
    case 'units_of_production':
      return 'Units of Production';
    default:
      return method;
  }
}
