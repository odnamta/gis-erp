// =====================================================
// v0.45: EQUIPMENT - JOB INTEGRATION PROPERTY TESTS
// Feature: v0.45-equipment-job-integration
// =====================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateUsageDays,
  calculateMeterUsage,
  calculateDepreciationCost,
  calculateTotalCost,
  calculateBillingAmount,
  calculateEquipmentMargin,
  validateMeterReadings,
  validateUsageDates,
  validateEquipmentUsageInput,
} from '@/lib/job-equipment-utils';

// Helper to generate valid date strings
const dateArbitrary = fc.integer({ min: 0, max: 3650 }).map(days => {
  const date = new Date('2020-01-01');
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
});

// Helper to generate date pairs where end >= start
const datePairArbitrary = fc.tuple(
  fc.integer({ min: 0, max: 1825 }), // days from base date for start
  fc.integer({ min: 0, max: 365 })   // days to add for end
).map(([startDays, daysToAdd]) => {
  const baseDate = new Date('2020-01-01');
  const start = new Date(baseDate);
  start.setDate(start.getDate() + startDays);
  const end = new Date(start);
  end.setDate(end.getDate() + daysToAdd);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    expectedDays: daysToAdd + 1,
  };
});

describe('v0.45 Job Equipment Utils - Property Tests', () => {
  // =====================================================
  // Property 1: Usage Days Calculation
  // =====================================================
  describe('Property 1: Usage Days Calculation', () => {
    it('should calculate usage_days as (end_date - start_date + 1) for valid date ranges', () => {
      fc.assert(
        fc.property(datePairArbitrary, ({ start, end, expectedDays }) => {
          const result = calculateUsageDays(start, end);
          expect(result).toBe(expectedDays);
        }),
        { numRuns: 100 }
      );
    });

    it('should return at least 1 day for same-day usage', () => {
      fc.assert(
        fc.property(dateArbitrary, (date) => {
          const result = calculateUsageDays(date, date);
          expect(result).toBe(1);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle null end date by using current date', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          (daysAgo) => {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysAgo);
            const start = startDate.toISOString().split('T')[0];
            const result = calculateUsageDays(start, null);
            expect(result).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =====================================================
  // Property 2: Meter Usage Calculation
  // =====================================================
  describe('Property 2: Meter Usage Calculation', () => {
    it('should calculate km_used as (end_km - start_km) for valid readings', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 500000 }),
          fc.integer({ min: 0, max: 100000 }),
          (startKm, kmDiff) => {
            const endKm = startKm + kmDiff;
            const result = calculateMeterUsage(startKm, endKm);
            expect(result).toBe(kmDiff);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate hours_used as (end_hours - start_hours) for valid readings', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 50000, noNaN: true }),
          fc.float({ min: 0, max: 1000, noNaN: true }),
          (startHours, hoursDiff) => {
            const endHours = startHours + hoursDiff;
            const result = calculateMeterUsage(startHours, endHours);
            expect(result).toBeCloseTo(hoursDiff, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null when start value is null', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100000 }), (endValue) => {
          const result = calculateMeterUsage(null, endValue);
          expect(result).toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    it('should return null when end value is null', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100000 }), (startValue) => {
          const result = calculateMeterUsage(startValue, null);
          expect(result).toBeNull();
        }),
        { numRuns: 100 }
      );
    });
  });

  // =====================================================
  // Property 3: Depreciation Cost Calculation
  // =====================================================
  describe('Property 3: Depreciation Cost Calculation', () => {
    it('should calculate depreciation as (book_value / (useful_life_years * 365)) * usage_days', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000000, max: 10000000000, noNaN: true }),
          fc.integer({ min: 1, max: 30 }),
          fc.integer({ min: 1, max: 365 }),
          (bookValue, usefulLifeYears, usageDays) => {
            const result = calculateDepreciationCost(bookValue, usefulLifeYears, usageDays);
            const expected = (bookValue / (usefulLifeYears * 365)) * usageDays;
            // Allow for rounding differences
            expect(result).toBeCloseTo(expected, 0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 when book_value is 0 or negative', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000000, max: 0, noNaN: true }),
          fc.integer({ min: 1, max: 30 }),
          fc.integer({ min: 1, max: 365 }),
          (bookValue, usefulLifeYears, usageDays) => {
            const result = calculateDepreciationCost(bookValue, usefulLifeYears, usageDays);
            expect(result).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 when useful_life_years is 0 or negative', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000000, max: 10000000000, noNaN: true }),
          fc.integer({ min: -30, max: 0 }),
          fc.integer({ min: 1, max: 365 }),
          (bookValue, usefulLifeYears, usageDays) => {
            const result = calculateDepreciationCost(bookValue, usefulLifeYears, usageDays);
            expect(result).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always return non-negative values', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10000000000, noNaN: true }),
          fc.integer({ min: 0, max: 30 }),
          fc.integer({ min: 0, max: 365 }),
          (bookValue, usefulLifeYears, usageDays) => {
            const result = calculateDepreciationCost(bookValue, usefulLifeYears, usageDays);
            expect(result).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =====================================================
  // Property 4: Total Cost Calculation
  // =====================================================
  describe('Property 4: Total Cost Calculation', () => {
    it('should calculate total_cost as sum of all cost components', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100000000, noNaN: true }),
          fc.float({ min: 0, max: 100000000, noNaN: true }),
          fc.float({ min: 0, max: 100000000, noNaN: true }),
          fc.float({ min: 0, max: 100000000, noNaN: true }),
          (depreciation, fuel, maintenance, operator) => {
            const result = calculateTotalCost(depreciation, fuel, maintenance, operator);
            const expected = depreciation + fuel + maintenance + operator;
            expect(result).toBeCloseTo(expected, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero values correctly', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100000000, noNaN: true }),
          (singleCost) => {
            const result = calculateTotalCost(singleCost, 0, 0, 0);
            expect(result).toBeCloseTo(singleCost, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =====================================================
  // Property 6: Billing Calculation by Rate Type
  // =====================================================
  describe('Property 6: Billing Calculation by Rate Type', () => {
    it('should calculate daily billing as rate * usage_days', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100000, max: 50000000, noNaN: true }),
          fc.integer({ min: 1, max: 365 }),
          (dailyRate, usageDays) => {
            const result = calculateBillingAmount('daily', dailyRate, usageDays, null, null);
            const expected = dailyRate * usageDays;
            expect(result).toBeCloseTo(expected, 0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate hourly billing as rate * hours_used', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 10000, max: 5000000, noNaN: true }),
          fc.float({ min: 0.5, max: 1000, noNaN: true }),
          (hourlyRate, hoursUsed) => {
            const result = calculateBillingAmount('hourly', hourlyRate, 1, hoursUsed, null);
            const expected = hourlyRate * hoursUsed;
            expect(result).toBeCloseTo(expected, 0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate per_km billing as rate * km_used', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000, max: 100000, noNaN: true }),
          fc.integer({ min: 1, max: 10000 }),
          (perKmRate, kmUsed) => {
            const result = calculateBillingAmount('per_km', perKmRate, 1, null, kmUsed);
            const expected = perKmRate * kmUsed;
            expect(result).toBeCloseTo(expected, 0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 for hourly rate when hours_used is null or 0', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 10000, max: 5000000, noNaN: true }),
          (hourlyRate) => {
            const resultNull = calculateBillingAmount('hourly', hourlyRate, 1, null, null);
            const resultZero = calculateBillingAmount('hourly', hourlyRate, 1, 0, null);
            expect(resultNull).toBe(0);
            expect(resultZero).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 for per_km rate when km_used is null or 0', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000, max: 100000, noNaN: true }),
          (perKmRate) => {
            const resultNull = calculateBillingAmount('per_km', perKmRate, 1, null, null);
            const resultZero = calculateBillingAmount('per_km', perKmRate, 1, null, 0);
            expect(resultNull).toBe(0);
            expect(resultZero).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =====================================================
  // Property 7: Equipment Margin Calculation
  // =====================================================
  describe('Property 7: Equipment Margin Calculation', () => {
    it('should calculate margin as (billing - cost)', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000000000, noNaN: true }),
          fc.float({ min: 0, max: 1000000000, noNaN: true }),
          (billing, cost) => {
            const { margin } = calculateEquipmentMargin(billing, cost);
            expect(margin).toBeCloseTo(billing - cost, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate margin_percent as ((billing - cost) / billing) * 100 when billing > 0', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 1000000000, noNaN: true }),
          fc.float({ min: 0, max: 1000000000, noNaN: true }),
          (billing, cost) => {
            const { marginPercent } = calculateEquipmentMargin(billing, cost);
            const expected = ((billing - cost) / billing) * 100;
            expect(marginPercent).toBeCloseTo(expected, 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 margin_percent when billing is 0', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000000000, noNaN: true }),
          (cost) => {
            const { marginPercent } = calculateEquipmentMargin(0, cost);
            expect(marginPercent).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =====================================================
  // Property 8: Meter Reading Validation
  // =====================================================
  describe('Property 8: Meter Reading Validation', () => {
    it('should reject when end_km < start_km', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 500000 }),
          fc.integer({ min: 1, max: 1000 }),
          (startKm, diff) => {
            const endKm = startKm - diff;
            const result = validateMeterReadings(startKm, endKm, null, null);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('km');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject when end_hours < start_hours', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 50000, noNaN: true }),
          fc.float({ min: 1, max: 100, noNaN: true }),
          (startHours, diff) => {
            const endHours = startHours - diff;
            const result = validateMeterReadings(null, null, startHours, endHours);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('hours');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid meter readings where end >= start', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 500000 }),
          fc.integer({ min: 0, max: 100000 }),
          fc.float({ min: 0, max: 50000, noNaN: true }),
          fc.float({ min: 0, max: 1000, noNaN: true }),
          (startKm, kmDiff, startHours, hoursDiff) => {
            const endKm = startKm + kmDiff;
            const endHours = startHours + hoursDiff;
            const result = validateMeterReadings(startKm, endKm, startHours, endHours);
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject negative meter values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -100000, max: -1 }),
          (negativeValue) => {
            const result = validateMeterReadings(negativeValue, 1000, null, null);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =====================================================
  // Property 9: Usage Date Validation
  // =====================================================
  describe('Property 9: Usage Date Validation', () => {
    it('should reject when usage_end < usage_start', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 365, max: 1825 }), // days from base for end
          fc.integer({ min: 1, max: 365 }),     // days to subtract for start (making start > end)
          (endDays, daysBefore) => {
            const baseDate = new Date('2020-01-01');
            const endDate = new Date(baseDate);
            endDate.setDate(endDate.getDate() + endDays);
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() + daysBefore);
            
            const start = startDate.toISOString().split('T')[0];
            const end = endDate.toISOString().split('T')[0];
            
            const result = validateUsageDates(start, end);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('before');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid date ranges where end >= start', () => {
      fc.assert(
        fc.property(datePairArbitrary, ({ start, end }) => {
          const result = validateUsageDates(start, end);
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should accept same-day usage', () => {
      fc.assert(
        fc.property(dateArbitrary, (date) => {
          const result = validateUsageDates(date, date);
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should accept null end date', () => {
      fc.assert(
        fc.property(dateArbitrary, (start) => {
          const result = validateUsageDates(start, null);
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject empty start date', () => {
      const result = validateUsageDates('', null);
      expect(result.valid).toBe(false);
    });
  });

  // =====================================================
  // Equipment Usage Input Validation
  // =====================================================
  describe('Equipment Usage Input Validation', () => {
    it('should reject missing job order ID', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          dateArbitrary,
          (assetId, usageStart) => {
            const result = validateEquipmentUsageInput({
              jobOrderId: '',
              assetId,
              usageStart,
            });
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Job order');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject missing asset ID', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          dateArbitrary,
          (jobOrderId, usageStart) => {
            const result = validateEquipmentUsageInput({
              jobOrderId,
              assetId: '',
              usageStart,
            });
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Asset');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject negative daily rate', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          dateArbitrary,
          fc.float({ min: -1000000, max: -1, noNaN: true }),
          (jobOrderId, assetId, usageStart, dailyRate) => {
            const result = validateEquipmentUsageInput({
              jobOrderId,
              assetId,
              usageStart,
              dailyRate,
            });
            expect(result.valid).toBe(false);
            expect(result.error).toContain('rate');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid input', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          dateArbitrary,
          fc.float({ min: 0, max: 100000000, noNaN: true }),
          (jobOrderId, assetId, usageStart, dailyRate) => {
            const result = validateEquipmentUsageInput({
              jobOrderId,
              assetId,
              usageStart,
              dailyRate,
            });
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
