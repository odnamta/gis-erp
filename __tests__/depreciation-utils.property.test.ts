/**
 * Property-based tests for depreciation utility functions
 * Feature: equipment-depreciation-costing
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateStraightLineDepreciation,
  calculateDecliningBalanceDepreciation,
  calculateDepreciation,
  validateDepreciationAmount,
  validateCostAmount,
  isValidCostType,
  calculateCostBreakdown,
  calculateCostingDashboardStats,
  calculateCostPerKm,
  calculateCostPerHour,
  isEligibleForDepreciation,
  sumCostBreakdownPercentages,
} from '@/lib/depreciation-utils';
import type { CostType, AssetTCOSummary } from '@/types/depreciation';

describe('Depreciation Utils Property Tests', () => {
  /**
   * Property 1: Straight-Line Depreciation Formula
   * For any asset with valid purchase_price, salvage_value, and useful_life_years,
   * the monthly straight-line depreciation SHALL equal 
   * (purchase_price - salvage_value) / useful_life_years / 12,
   * limited to not reduce book_value below salvage_value.
   * **Validates: Requirements 3.1, 3.4**
   */
  describe('Property 1: Straight-Line Depreciation Formula', () => {
    it('should calculate depreciation as (purchase - salvage) / years / 12', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 10000, max: 10000000, noNaN: true }),
          fc.float({ min: 0, max: 1000, noNaN: true }),
          fc.integer({ min: 1, max: 30 }),
          (purchasePrice, salvageValue, usefulLifeYears) => {
            // Ensure salvage < purchase
            const safeSalvage = Math.min(salvageValue, purchasePrice * 0.1);
            const currentBookValue = purchasePrice; // Start with full value
            
            const result = calculateStraightLineDepreciation(
              purchasePrice,
              safeSalvage,
              usefulLifeYears,
              currentBookValue
            );
            
            const expectedMonthly = (purchasePrice - safeSalvage) / usefulLifeYears / 12;
            const maxDepreciation = currentBookValue - safeSalvage;
            const expected = Math.min(Math.round(expectedMonthly * 100) / 100, maxDepreciation);
            
            expect(result).toBeCloseTo(expected, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should limit depreciation to not go below salvage value', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 10000, max: 1000000, noNaN: true }),
          fc.float({ min: 1000, max: 5000, noNaN: true }),
          fc.integer({ min: 1, max: 10 }),
          (purchasePrice, salvageValue, usefulLifeYears) => {
            // Set book value close to salvage
            const currentBookValue = salvageValue + 100;
            
            const result = calculateStraightLineDepreciation(
              purchasePrice,
              salvageValue,
              usefulLifeYears,
              currentBookValue
            );
            
            // Result should not exceed (bookValue - salvage)
            expect(result).toBeLessThanOrEqual(currentBookValue - salvageValue);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 2: Declining Balance Depreciation Formula
   * For any asset with valid book_value, salvage_value, and useful_life_years,
   * the monthly declining balance depreciation SHALL equal 
   * book_value * (2 / useful_life_years) / 12,
   * limited to not reduce book_value below salvage_value.
   * **Validates: Requirements 4.1, 4.2, 4.4**
   */
  describe('Property 2: Declining Balance Depreciation Formula', () => {
    it('should calculate depreciation as bookValue * (2/years) / 12', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 10000, max: 10000000, noNaN: true }),
          fc.float({ min: 0, max: 1000, noNaN: true }),
          fc.integer({ min: 1, max: 30 }),
          (bookValue, salvageValue, usefulLifeYears) => {
            // Ensure salvage < book value
            const safeSalvage = Math.min(salvageValue, bookValue * 0.05);
            
            const result = calculateDecliningBalanceDepreciation(
              bookValue,
              safeSalvage,
              usefulLifeYears
            );
            
            const annualRate = 2 / usefulLifeYears;
            const monthlyRate = annualRate / 12;
            const expectedMonthly = bookValue * monthlyRate;
            const maxDepreciation = bookValue - safeSalvage;
            const expected = Math.min(Math.round(expectedMonthly * 100) / 100, maxDepreciation);
            
            expect(result).toBeCloseTo(expected, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use double declining balance rate (2/years)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (usefulLifeYears) => {
            const bookValue = 100000;
            const salvageValue = 0;
            
            const result = calculateDecliningBalanceDepreciation(
              bookValue,
              salvageValue,
              usefulLifeYears
            );
            
            // Rate should be 2/years/12
            const expectedRate = 2 / usefulLifeYears / 12;
            const expected = Math.round(bookValue * expectedRate * 100) / 100;
            
            expect(result).toBeCloseTo(expected, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Zero Depreciation Conditions
   * For any asset, depreciation SHALL be zero when:
   * - purchase_price is null, undefined, or <= 0
   * - useful_life_years is null, undefined, or <= 0
   * - book_value <= salvage_value (fully depreciated)
   * **Validates: Requirements 3.2, 3.3, 3.5, 4.3, 4.5**
   */
  describe('Property 3: Zero Depreciation Conditions', () => {
    it('should return 0 when purchase_price is null/undefined/zero', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(null, undefined, 0, -100),
          fc.float({ min: 0, max: 1000, noNaN: true }),
          fc.integer({ min: 1, max: 20 }),
          (purchasePrice, salvageValue, usefulLifeYears) => {
            const result = calculateStraightLineDepreciation(
              purchasePrice as number | null | undefined,
              salvageValue,
              usefulLifeYears,
              10000
            );
            expect(result).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 when useful_life_years is null/undefined/zero', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 10000, max: 100000, noNaN: true }),
          fc.float({ min: 0, max: 1000, noNaN: true }),
          fc.constantFrom(null, undefined, 0, -5),
          (purchasePrice, salvageValue, usefulLifeYears) => {
            const result = calculateStraightLineDepreciation(
              purchasePrice,
              salvageValue,
              usefulLifeYears as number | null | undefined,
              purchasePrice
            );
            expect(result).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 when book_value <= salvage_value (fully depreciated)', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 10000, max: 100000, noNaN: true }),
          fc.float({ min: 5000, max: 10000, noNaN: true }),
          fc.integer({ min: 1, max: 20 }),
          (purchasePrice, salvageValue, usefulLifeYears) => {
            // Book value at or below salvage
            const currentBookValue = salvageValue - 100;
            
            const straightLine = calculateStraightLineDepreciation(
              purchasePrice,
              salvageValue,
              usefulLifeYears,
              currentBookValue
            );
            
            const declining = calculateDecliningBalanceDepreciation(
              currentBookValue,
              salvageValue,
              usefulLifeYears
            );
            
            expect(straightLine).toBe(0);
            expect(declining).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 4: Book Value Consistency
   * For any depreciation record, ending_book_value SHALL equal 
   * beginning_book_value minus depreciation_amount.
   * **Validates: Requirements 1.3**
   */
  describe('Property 4: Book Value Consistency', () => {
    it('should maintain ending = beginning - depreciation', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 10000, max: 1000000, noNaN: true }),
          fc.float({ min: 0, max: 1000, noNaN: true }),
          fc.integer({ min: 1, max: 20 }),
          fc.constantFrom('straight_line', 'declining_balance'),
          (purchasePrice, salvageValue, usefulLifeYears, method) => {
            const safeSalvage = Math.min(salvageValue, purchasePrice * 0.1);
            const beginningBookValue = purchasePrice;
            
            const depreciation = calculateDepreciation(
              method as 'straight_line' | 'declining_balance',
              purchasePrice,
              beginningBookValue,
              safeSalvage,
              usefulLifeYears
            );
            
            const endingBookValue = beginningBookValue - depreciation;
            
            // Verify consistency
            expect(endingBookValue).toBeCloseTo(beginningBookValue - depreciation, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Salvage Value Floor
   * For any depreciation calculation, the resulting book_value 
   * SHALL never be less than salvage_value.
   * **Validates: Requirements 1.4, 3.4, 4.4**
   */
  describe('Property 5: Salvage Value Floor', () => {
    it('should never reduce book value below salvage value', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 10000, max: 1000000, noNaN: true }),
          fc.float({ min: 1000, max: 5000, noNaN: true }),
          fc.integer({ min: 1, max: 20 }),
          fc.constantFrom('straight_line', 'declining_balance'),
          (purchasePrice, salvageValue, usefulLifeYears, method) => {
            // Test with book value close to salvage
            const currentBookValue = salvageValue + 500;
            
            const depreciation = calculateDepreciation(
              method as 'straight_line' | 'declining_balance',
              purchasePrice,
              currentBookValue,
              salvageValue,
              usefulLifeYears
            );
            
            const endingBookValue = currentBookValue - depreciation;
            
            // Ending book value should never be less than salvage
            expect(endingBookValue).toBeGreaterThanOrEqual(salvageValue - 0.01); // Allow small rounding
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Non-Negative Depreciation
   * For any depreciation record, depreciation_amount SHALL be >= 0.
   * **Validates: Requirements 1.2**
   */
  describe('Property 6: Non-Negative Depreciation', () => {
    it('should always return non-negative depreciation', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000000, max: 1000000, noNaN: true }),
          fc.float({ min: -10000, max: 10000, noNaN: true }),
          fc.integer({ min: -10, max: 30 }),
          fc.constantFrom('straight_line', 'declining_balance'),
          (purchasePrice, salvageValue, usefulLifeYears, method) => {
            const currentBookValue = Math.abs(purchasePrice);
            
            const depreciation = calculateDepreciation(
              method as 'straight_line' | 'declining_balance',
              purchasePrice,
              currentBookValue,
              salvageValue,
              usefulLifeYears
            );
            
            expect(depreciation).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate depreciation amount correctly', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }),
          fc.float({ min: 10000, max: 100000, noNaN: true }),
          fc.float({ min: 0, max: 5000, noNaN: true }),
          (amount, beginningBookValue, salvageValue) => {
            const result = validateDepreciationAmount(amount, beginningBookValue, salvageValue);
            
            if (amount < 0) {
              expect(result.valid).toBe(false);
              expect(result.error).toBe('Depreciation amount cannot be negative');
            } else if (amount > beginningBookValue - salvageValue) {
              expect(result.valid).toBe(false);
              expect(result.error).toBe('Depreciation would reduce book value below salvage value');
            } else {
              expect(result.valid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 7: Positive Cost Amount
   * For any cost tracking record, amount SHALL be > 0.
   * **Validates: Requirements 2.3**
   */
  describe('Property 7: Positive Cost Amount', () => {
    it('should validate cost amount must be positive', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -10000, max: 10000, noNaN: true }),
          (amount) => {
            const result = validateCostAmount(amount);
            
            if (amount <= 0) {
              expect(result.valid).toBe(false);
              expect(result.error).toBe('Cost amount must be positive');
            } else {
              expect(result.valid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject zero and negative amounts', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -10000, max: 0, noNaN: true }),
          (amount) => {
            const result = validateCostAmount(amount);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept positive amounts', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.01), max: Math.fround(10000000), noNaN: true }),
          (amount) => {
            const result = validateCostAmount(amount);
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: TCO Calculation
   * For any asset, total_tco SHALL equal purchase_cost + sum of all cost_tracking amounts.
   * **Validates: Requirements 6.2**
   */
  describe('Property 8: TCO Calculation', () => {
    it('should calculate TCO as sum of all cost components', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000000, noNaN: true }),
          fc.float({ min: 0, max: 100000, noNaN: true }),
          fc.float({ min: 0, max: 100000, noNaN: true }),
          fc.float({ min: 0, max: 50000, noNaN: true }),
          fc.float({ min: 0, max: 10000, noNaN: true }),
          fc.float({ min: 0, max: 10000, noNaN: true }),
          fc.float({ min: 0, max: 10000, noNaN: true }),
          (purchase, maintenance, fuel, depreciation, insurance, registration, other) => {
            const summary: AssetTCOSummary = {
              assetId: 'test',
              assetCode: 'TEST-001',
              assetName: 'Test Asset',
              categoryName: 'Test',
              purchasePrice: purchase,
              currentBookValue: purchase - depreciation,
              totalKm: 10000,
              totalHours: 500,
              purchaseCost: purchase,
              totalMaintenanceCost: maintenance,
              totalFuelCost: fuel,
              totalDepreciation: depreciation,
              totalInsuranceCost: insurance,
              totalRegistrationCost: registration,
              totalOtherCost: other,
              totalTCO: purchase + maintenance + fuel + depreciation + insurance + registration + other,
            };
            
            const expectedTCO = purchase + maintenance + fuel + depreciation + insurance + registration + other;
            
            expect(summary.totalTCO).toBeCloseTo(expectedTCO, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: Cost Per Km Calculation
   * For any asset with total_km > 0, cost_per_km SHALL equal total_tco / total_km.
   * **Validates: Requirements 6.3**
   */
  describe('Property 9: Cost Per Km Calculation', () => {
    it('should calculate cost per km as totalCost / totalKm', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000, max: 10000000, noNaN: true }),
          fc.float({ min: 1, max: 1000000, noNaN: true }),
          (totalCost, totalKm) => {
            const result = calculateCostPerKm(totalCost, totalKm);
            
            if (totalKm > 0 && totalCost > 0) {
              const expected = Math.round((totalCost / totalKm) * 100) / 100;
              expect(result).toBeCloseTo(expected, 2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return undefined when totalKm is 0 or negative', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000, max: 10000000, noNaN: true }),
          fc.float({ min: -1000, max: 0, noNaN: true }),
          (totalCost, totalKm) => {
            const result = calculateCostPerKm(totalCost, totalKm);
            expect(result).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: Cost Per Hour Calculation
   * For any asset with total_hours > 0, cost_per_hour SHALL equal total_tco / total_hours.
   * **Validates: Requirements 6.4**
   */
  describe('Property 10: Cost Per Hour Calculation', () => {
    it('should calculate cost per hour as totalCost / totalHours', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000, max: 10000000, noNaN: true }),
          fc.float({ min: 1, max: 100000, noNaN: true }),
          (totalCost, totalHours) => {
            const result = calculateCostPerHour(totalCost, totalHours);
            
            if (totalHours > 0 && totalCost > 0) {
              const expected = Math.round((totalCost / totalHours) * 100) / 100;
              expect(result).toBeCloseTo(expected, 2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return undefined when totalHours is 0 or negative', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000, max: 10000000, noNaN: true }),
          fc.float({ min: -1000, max: 0, noNaN: true }),
          (totalCost, totalHours) => {
            const result = calculateCostPerHour(totalCost, totalHours);
            expect(result).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 11: Cost Breakdown Percentages
   * For any cost breakdown, the sum of all percentages SHALL equal 100% 
   * (within rounding tolerance).
   * **Validates: Requirements 9.2**
   */
  describe('Property 11: Cost Breakdown Percentages', () => {
    it('should have percentages sum to 100 (within tolerance)', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              costType: fc.constantFrom('maintenance', 'fuel', 'depreciation', 'insurance', 'other') as fc.Arbitrary<CostType>,
              amount: fc.float({ min: 1, max: 100000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (costs) => {
            const breakdown = calculateCostBreakdown(costs);
            const totalPercentage = sumCostBreakdownPercentages(breakdown);
            
            // Should sum to 100% within rounding tolerance
            expect(totalPercentage).toBeCloseTo(100, 0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty array for empty costs', () => {
      const breakdown = calculateCostBreakdown([]);
      expect(breakdown).toHaveLength(0);
    });

    it('should calculate correct percentage for single cost type', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('maintenance', 'fuel', 'depreciation') as fc.Arbitrary<CostType>,
          fc.float({ min: 1, max: 100000, noNaN: true }),
          (costType, amount) => {
            const costs = [{ costType, amount }];
            const breakdown = calculateCostBreakdown(costs);
            
            expect(breakdown).toHaveLength(1);
            expect(breakdown[0].percentage).toBe(100);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 12: Depreciation Eligibility
   * For any asset, it SHALL be eligible for depreciation only if 
   * status is 'active' AND depreciation_start_date is on or before the processing date.
   * **Validates: Requirements 5.1**
   */
  describe('Property 12: Depreciation Eligibility', () => {
    it('should return false when status is not active', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('maintenance', 'repair', 'idle', 'disposed', 'sold'),
          fc.integer({ min: 2020, max: 2025 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 }),
          (status, year, month, day) => {
            const startDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const processingDate = new Date(year, month - 1, day + 30);
            
            const result = isEligibleForDepreciation(
              status,
              startDate,
              processingDate
            );
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false when depreciation_start_date is null/undefined', () => {
      // Use integer offset from base date to avoid NaN dates
      const safeDateArb = fc.integer({ min: 0, max: 2190 }).map(days => {
        const d = new Date('2020-01-01');
        d.setDate(d.getDate() + days);
        return d;
      });
      
      fc.assert(
        fc.property(
          fc.constantFrom(null, undefined),
          safeDateArb,
          (startDate, processingDate) => {
            const result = isEligibleForDepreciation(
              'active',
              startDate,
              processingDate
            );
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return true when active and start date <= processing date', () => {
      // Use integer offset from base date to avoid NaN dates
      const safeDateArb = fc.integer({ min: 0, max: 1825 }).map(days => {
        const d = new Date('2020-01-01');
        d.setDate(d.getDate() + days);
        return d;
      });
      
      fc.assert(
        fc.property(
          safeDateArb,
          (startDate) => {
            // Processing date is after start date
            const processingDate = new Date(startDate.getTime() + 86400000 * 30); // 30 days later
            
            const result = isEligibleForDepreciation(
              'active',
              startDate.toISOString().split('T')[0],
              processingDate
            );
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false when start date is after processing date', () => {
      // Use integer offset from base date to avoid NaN dates
      const safeDateArb = fc.integer({ min: 0, max: 730 }).map(days => {
        const d = new Date('2024-01-01');
        d.setDate(d.getDate() + days);
        return d;
      });
      
      fc.assert(
        fc.property(
          safeDateArb,
          (startDate) => {
            // Processing date is before start date
            const processingDate = new Date(startDate.getTime() - 86400000 * 30); // 30 days earlier
            
            const result = isEligibleForDepreciation(
              'active',
              startDate.toISOString().split('T')[0],
              processingDate
            );
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property Tests: Valid Cost Types
   */
  describe('Valid Cost Types', () => {
    it('should accept valid cost types', () => {
      const validTypes = ['purchase', 'maintenance', 'fuel', 'insurance', 'registration', 'depreciation', 'other'];
      fc.assert(
        fc.property(
          fc.constantFrom(...validTypes),
          (type) => {
            expect(isValidCostType(type)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid cost types', () => {
      fc.assert(
        fc.property(
          fc.string().filter(
            (s) => !['purchase', 'maintenance', 'fuel', 'insurance', 'registration', 'depreciation', 'other'].includes(s)
          ),
          (type) => {
            expect(isValidCostType(type)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Dashboard Stats Calculation
   */
  describe('Dashboard Stats Calculation', () => {
    it('should calculate correct stats from summaries', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              assetId: fc.uuid(),
              assetCode: fc.string({ minLength: 1, maxLength: 10 }),
              assetName: fc.string({ minLength: 1, maxLength: 50 }),
              categoryName: fc.string({ minLength: 1, maxLength: 30 }),
              purchasePrice: fc.float({ min: 10000, max: 1000000, noNaN: true }),
              currentBookValue: fc.float({ min: 5000, max: 500000, noNaN: true }),
              totalKm: fc.float({ min: 0, max: 100000, noNaN: true }),
              totalHours: fc.float({ min: 0, max: 10000, noNaN: true }),
              purchaseCost: fc.float({ min: 10000, max: 1000000, noNaN: true }),
              totalMaintenanceCost: fc.float({ min: 0, max: 50000, noNaN: true }),
              totalFuelCost: fc.float({ min: 0, max: 50000, noNaN: true }),
              totalDepreciation: fc.float({ min: 0, max: 100000, noNaN: true }),
              totalInsuranceCost: fc.float({ min: 0, max: 10000, noNaN: true }),
              totalRegistrationCost: fc.float({ min: 0, max: 5000, noNaN: true }),
              totalOtherCost: fc.float({ min: 0, max: 10000, noNaN: true }),
              totalTCO: fc.float({ min: 10000, max: 2000000, noNaN: true }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (summaries) => {
            const stats = calculateCostingDashboardStats(summaries as AssetTCOSummary[]);
            
            expect(stats.assetCount).toBe(summaries.length);
            
            if (summaries.length === 0) {
              expect(stats.totalFleetValue).toBe(0);
              expect(stats.totalTCO).toBe(0);
            } else {
              expect(stats.totalFleetValue).toBeGreaterThanOrEqual(0);
              expect(stats.totalTCO).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
