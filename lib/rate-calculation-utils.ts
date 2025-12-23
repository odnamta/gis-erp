// =====================================================
// v0.71: RATE CALCULATION UTILITY FUNCTIONS
// =====================================================

import {
  ShippingRate,
  FreightCostResult,
  SurchargeItem,
} from '@/types/agency';

/**
 * Calculate the total rate from ocean freight and surcharges
 * Property 4: Total Rate Calculation
 * 
 * @param oceanFreight - Base ocean freight rate
 * @param baf - Bunker Adjustment Factor
 * @param caf - Currency Adjustment Factor
 * @param pss - Peak Season Surcharge
 * @param ens - Equipment Surcharge
 * @param otherSurcharges - Array of additional surcharges
 * @returns Total rate as sum of all components
 */
export function calculateTotalRate(
  oceanFreight: number,
  baf: number = 0,
  caf: number = 0,
  pss: number = 0,
  ens: number = 0,
  otherSurcharges: SurchargeItem[] = []
): number {
  const otherTotal = otherSurcharges.reduce((sum, s) => sum + (s.amount || 0), 0);
  return oceanFreight + baf + caf + pss + ens + otherTotal;
}

/**
 * Calculate total freight cost for a shipment
 * Property 5: Freight Cost Calculation with Quantity
 * 
 * For any shipping rate and positive quantity:
 * - oceanFreight = rate.oceanFreight × quantity
 * - surcharges = (rate.baf + rate.caf + rate.pss + rate.ens) × quantity
 * - total = oceanFreight + surcharges
 * - currency = rate.currency
 * 
 * @param rate - The shipping rate to calculate from
 * @param quantity - Number of containers/units (default: 1)
 * @returns FreightCostResult with breakdown
 */
export function calculateTotalFreightCost(
  rate: ShippingRate,
  quantity: number = 1
): FreightCostResult {
  // Ensure quantity is at least 1
  const qty = Math.max(1, quantity);
  
  const oceanFreight = rate.oceanFreight * qty;
  
  // Calculate surcharges
  const baseSurcharges = (rate.baf || 0) + (rate.caf || 0) + (rate.pss || 0) + (rate.ens || 0);
  const otherSurchargesTotal = (rate.otherSurcharges || []).reduce((sum, s) => sum + (s.amount || 0), 0);
  const surcharges = (baseSurcharges + otherSurchargesTotal) * qty;
  
  return {
    oceanFreight,
    surcharges,
    total: oceanFreight + surcharges,
    currency: rate.currency || 'USD',
  };
}

/**
 * Check if a shipping rate is currently valid
 * 
 * @param rate - The shipping rate to check
 * @param date - The date to check against (default: current date)
 * @returns true if the rate is active and within validity period
 */
export function isRateValid(rate: ShippingRate, date?: Date): boolean {
  if (!rate.isActive) {
    return false;
  }
  
  const checkDate = date || new Date();
  const validFrom = new Date(rate.validFrom);
  const validTo = new Date(rate.validTo);
  
  // Set time to start/end of day for comparison
  validFrom.setHours(0, 0, 0, 0);
  validTo.setHours(23, 59, 59, 999);
  checkDate.setHours(12, 0, 0, 0); // Middle of day for comparison
  
  return checkDate >= validFrom && checkDate <= validTo;
}

/**
 * Calculate the number of days until a rate expires
 * 
 * @param rate - The shipping rate
 * @returns Number of days until expiry, or -1 if already expired
 */
export function daysUntilExpiry(rate: ShippingRate): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const validTo = new Date(rate.validTo);
  validTo.setHours(0, 0, 0, 0);
  
  const diffTime = validTo.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 0 ? diffDays : -1;
}

/**
 * Format a freight cost result for display
 * 
 * @param result - The freight cost calculation result
 * @returns Formatted string representation
 */
export function formatFreightCost(result: FreightCostResult): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: result.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(result.total);
}

/**
 * Compare two rates and return the cheaper one
 * 
 * @param rate1 - First rate to compare
 * @param rate2 - Second rate to compare
 * @returns The rate with lower total_rate
 */
export function getCheaperRate(rate1: ShippingRate, rate2: ShippingRate): ShippingRate {
  return rate1.totalRate <= rate2.totalRate ? rate1 : rate2;
}

/**
 * Calculate percentage difference between two rates
 * 
 * @param baseRate - The base rate for comparison
 * @param compareRate - The rate to compare against
 * @returns Percentage difference (positive = compareRate is more expensive)
 */
export function calculateRateDifference(baseRate: ShippingRate, compareRate: ShippingRate): number {
  if (baseRate.totalRate === 0) return 0;
  return ((compareRate.totalRate - baseRate.totalRate) / baseRate.totalRate) * 100;
}

/**
 * Get surcharges breakdown from a rate
 * 
 * @param rate - The shipping rate
 * @returns Object with named surcharges and their values
 */
export function getSurchargesBreakdown(rate: ShippingRate): Record<string, number> {
  const breakdown: Record<string, number> = {
    'BAF (Bunker Adjustment)': rate.baf || 0,
    'CAF (Currency Adjustment)': rate.caf || 0,
    'PSS (Peak Season)': rate.pss || 0,
    'ENS (Equipment)': rate.ens || 0,
  };
  
  // Add other surcharges
  if (rate.otherSurcharges && rate.otherSurcharges.length > 0) {
    for (const surcharge of rate.otherSurcharges) {
      breakdown[surcharge.name] = surcharge.amount;
    }
  }
  
  return breakdown;
}

/**
 * Validate that a rate's total matches the sum of its components
 * 
 * @param rate - The shipping rate to validate
 * @returns true if total_rate equals calculated total
 */
export function validateRateTotal(rate: ShippingRate): boolean {
  const calculatedTotal = calculateTotalRate(
    rate.oceanFreight,
    rate.baf,
    rate.caf,
    rate.pss,
    rate.ens,
    rate.otherSurcharges
  );
  
  // Allow for small floating point differences
  return Math.abs(rate.totalRate - calculatedTotal) < 0.01;
}
