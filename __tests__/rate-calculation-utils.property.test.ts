/**
 * Property-based tests for rate-calculation-utils.ts
 * Feature: v0.71-agency-shipping-line-agent-management
 * 
 * Tests Properties 4 and 5 from the design document
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateTotalRate,
  calculateTotalFreightCost,
  isRateValid,
  validateRateTotal,
} from '@/lib/rate-calculation-utils';
import {
  ShippingRate,
  SurchargeItem,
  CONTAINER_TYPES,
  SHIPPING_TERMS,
} from '@/types/agency';

// =====================================================
// GENERATORS
// =====================================================

const positiveNumber = fc.double({ min: 0, max: 100000, noNaN: true });
const nonNegativeNumber = fc.double({ min: 0, max: 10000, noNaN: true });
const positiveInteger = fc.integer({ min: 1, max: 100 });

const surchargeItemArb: fc.Arbitrary<SurchargeItem> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  amount: nonNegativeNumber,
  currency: fc.constantFrom('USD', 'EUR', 'IDR'),
});

const containerTypeArb = fc.constantFrom(...CONTAINER_TYPES);
const shippingTermsArb = fc.constantFrom(...SHIPPING_TERMS);

// Generate valid date range
const dateRangeArb = fc.tuple(
  fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
  fc.integer({ min: 1, max: 365 })
).map(([startDate, days]) => {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);
  return {
    validFrom: startDate.toISOString().split('T')[0],
    validTo: endDate.toISOString().split('T')[0],
  };
});

const shippingRateArb: fc.Arbitrary<ShippingRate> = fc.tuple(
  fc.uuid(),
  fc.uuid(),
  fc.uuid(),
  fc.uuid(),
  containerTypeArb,
  positiveNumber,
  fc.constantFrom('USD', 'EUR', 'IDR'),
  nonNegativeNumber,
  nonNegativeNumber,
  nonNegativeNumber,
  nonNegativeNumber,
  fc.integer({ min: 1, max: 60 }),
  fc.constantFrom('weekly', 'bi-weekly', 'monthly'),
  shippingTermsArb,
  fc.boolean(),
).map(([id, lineId, originId, destId, containerType, oceanFreight, currency, baf, caf, pss, ens, transitDays, frequency, terms, isActive]) => ({
  id,
  shippingLineId: lineId,
  originPortId: originId,
  destinationPortId: destId,
  containerType,
  oceanFreight,
  currency,
  baf,
  caf,
  pss,
  ens,
  otherSurcharges: [] as SurchargeItem[],
  totalRate: oceanFreight + baf + caf + pss + ens,
  transitDays,
  frequency,
  validFrom: '2025-01-01',
  validTo: '2025-12-31',
  terms,
  notes: undefined as string | undefined,
  isActive,
  createdAt: new Date().toISOString(),
}));

// =====================================================
// PROPERTY 4: TOTAL RATE CALCULATION
// =====================================================

describe('Property 4: Total Rate Calculation', () => {
  /**
   * For any shipping rate, the total_rate SHALL equal the sum of
   * ocean_freight plus all surcharges (baf + caf + pss + ens + sum of other_surcharges).
   * Validates: Requirements 5.5
   */

  it('calculateTotalRate equals sum of ocean freight and all surcharges', () => {
    fc.assert(
      fc.property(
        positiveNumber,
        nonNegativeNumber,
        nonNegativeNumber,
        nonNegativeNumber,
        nonNegativeNumber,
        fc.array(surchargeItemArb, { maxLength: 5 }),
        (oceanFreight, baf, caf, pss, ens, otherSurcharges) => {
          const total = calculateTotalRate(oceanFreight, baf, caf, pss, ens, otherSurcharges);
          const otherTotal = otherSurcharges.reduce((sum, s) => sum + s.amount, 0);
          const expected = oceanFreight + baf + caf + pss + ens + otherTotal;
          
          expect(total).toBeCloseTo(expected, 5);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateTotalRate with no surcharges equals ocean freight', () => {
    fc.assert(
      fc.property(positiveNumber, (oceanFreight) => {
        const total = calculateTotalRate(oceanFreight, 0, 0, 0, 0, []);
        expect(total).toBeCloseTo(oceanFreight, 5);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('calculateTotalRate is commutative for surcharges', () => {
    fc.assert(
      fc.property(
        positiveNumber,
        nonNegativeNumber,
        nonNegativeNumber,
        (oceanFreight, surcharge1, surcharge2) => {
          const total1 = calculateTotalRate(oceanFreight, surcharge1, surcharge2, 0, 0, []);
          const total2 = calculateTotalRate(oceanFreight, surcharge2, surcharge1, 0, 0, []);
          expect(total1).toBeCloseTo(total2, 5);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validateRateTotal returns true for correctly calculated rates', () => {
    fc.assert(
      fc.property(shippingRateArb, (rate) => {
        expect(validateRateTotal(rate)).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('total rate is always >= ocean freight', () => {
    fc.assert(
      fc.property(
        positiveNumber,
        nonNegativeNumber,
        nonNegativeNumber,
        nonNegativeNumber,
        nonNegativeNumber,
        (oceanFreight, baf, caf, pss, ens) => {
          const total = calculateTotalRate(oceanFreight, baf, caf, pss, ens, []);
          expect(total).toBeGreaterThanOrEqual(oceanFreight);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 5: FREIGHT COST CALCULATION WITH QUANTITY
// =====================================================

describe('Property 5: Freight Cost Calculation with Quantity', () => {
  /**
   * For any shipping rate and positive quantity, the calculated freight cost SHALL have:
   * - oceanFreight equal to rate.oceanFreight × quantity
   * - surcharges equal to (rate.baf + rate.caf + rate.pss + rate.ens + other) × quantity
   * - total equal to oceanFreight + surcharges
   * - currency equal to rate.currency
   * Validates: Requirements 9.1, 9.2, 9.3, 9.4
   */

  it('oceanFreight equals rate.oceanFreight × quantity', () => {
    fc.assert(
      fc.property(
        shippingRateArb,
        positiveInteger,
        (rate, quantity) => {
          const result = calculateTotalFreightCost(rate, quantity);
          const expected = rate.oceanFreight * quantity;
          expect(result.oceanFreight).toBeCloseTo(expected, 5);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('surcharges equals sum of all surcharges × quantity', () => {
    fc.assert(
      fc.property(
        shippingRateArb,
        positiveInteger,
        (rate, quantity) => {
          const result = calculateTotalFreightCost(rate, quantity);
          const baseSurcharges = (rate.baf || 0) + (rate.caf || 0) + (rate.pss || 0) + (rate.ens || 0);
          const otherTotal = (rate.otherSurcharges || []).reduce((sum, s) => sum + s.amount, 0);
          const expected = (baseSurcharges + otherTotal) * quantity;
          expect(result.surcharges).toBeCloseTo(expected, 5);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('total equals oceanFreight + surcharges', () => {
    fc.assert(
      fc.property(
        shippingRateArb,
        positiveInteger,
        (rate, quantity) => {
          const result = calculateTotalFreightCost(rate, quantity);
          expect(result.total).toBeCloseTo(result.oceanFreight + result.surcharges, 5);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('currency equals rate.currency', () => {
    fc.assert(
      fc.property(
        shippingRateArb,
        positiveInteger,
        (rate, quantity) => {
          const result = calculateTotalFreightCost(rate, quantity);
          expect(result.currency).toBe(rate.currency);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('quantity of 1 returns same as rate values', () => {
    fc.assert(
      fc.property(shippingRateArb, (rate) => {
        const result = calculateTotalFreightCost(rate, 1);
        expect(result.oceanFreight).toBeCloseTo(rate.oceanFreight, 5);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('doubling quantity doubles the total', () => {
    fc.assert(
      fc.property(
        shippingRateArb,
        positiveInteger.filter(n => n <= 50), // Keep reasonable to avoid overflow
        (rate, quantity) => {
          const result1 = calculateTotalFreightCost(rate, quantity);
          const result2 = calculateTotalFreightCost(rate, quantity * 2);
          expect(result2.total).toBeCloseTo(result1.total * 2, 5);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('total is always non-negative', () => {
    fc.assert(
      fc.property(
        shippingRateArb,
        positiveInteger,
        (rate, quantity) => {
          const result = calculateTotalFreightCost(rate, quantity);
          expect(result.total).toBeGreaterThanOrEqual(0);
          expect(result.oceanFreight).toBeGreaterThanOrEqual(0);
          expect(result.surcharges).toBeGreaterThanOrEqual(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles zero quantity by using minimum of 1', () => {
    fc.assert(
      fc.property(shippingRateArb, (rate) => {
        const resultZero = calculateTotalFreightCost(rate, 0);
        const resultOne = calculateTotalFreightCost(rate, 1);
        expect(resultZero.total).toBeCloseTo(resultOne.total, 5);
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// RATE VALIDITY TESTS
// =====================================================

describe('Rate Validity', () => {
  it('isRateValid returns false for inactive rates', () => {
    fc.assert(
      fc.property(
        shippingRateArb.map(r => ({ ...r, isActive: false })),
        (rate) => {
          expect(isRateValid(rate)).toBe(false);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isRateValid returns true for active rates within validity period', () => {
    const today = new Date();
    const validRate: ShippingRate = {
      id: 'test-id',
      shippingLineId: 'line-id',
      originPortId: 'origin-id',
      destinationPortId: 'dest-id',
      containerType: '20GP',
      oceanFreight: 1000,
      currency: 'USD',
      baf: 100,
      caf: 50,
      pss: 0,
      ens: 0,
      otherSurcharges: [],
      totalRate: 1150,
      validFrom: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      validTo: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      terms: 'CY-CY',
      isActive: true,
      createdAt: today.toISOString(),
    };
    
    expect(isRateValid(validRate)).toBe(true);
  });

  it('isRateValid returns false for expired rates', () => {
    const expiredRate: ShippingRate = {
      id: 'test-id',
      shippingLineId: 'line-id',
      originPortId: 'origin-id',
      destinationPortId: 'dest-id',
      containerType: '20GP',
      oceanFreight: 1000,
      currency: 'USD',
      baf: 100,
      caf: 50,
      pss: 0,
      ens: 0,
      otherSurcharges: [],
      totalRate: 1150,
      validFrom: '2020-01-01',
      validTo: '2020-12-31',
      terms: 'CY-CY',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    
    expect(isRateValid(expiredRate)).toBe(false);
  });
});
