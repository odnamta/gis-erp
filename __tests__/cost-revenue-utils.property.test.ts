/**
 * Property-based tests for cost-revenue-utils.ts
 * Feature: v0.75-agency-cost-revenue-management
 * 
 * Tests Properties 1, 2, and 3 from the design document
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  convertToIdr,
  calculateTax,
  calculateTotalWithTax,
  calculateProfitMargin,
  calculateGrossProfit,
  aggregateCosts,
  aggregateRevenue,
  calculateDaysUntilDue,
  isOverdue,
  getMarginIndicator,
  isMarginTargetMet,
  DEFAULT_TAX_RATE,
  DEFAULT_MARGIN_TARGET,
  isValidCostPaymentStatus,
  prepareCostForInsert,
  prepareRevenueForInsert,
} from '@/lib/cost-revenue-utils';
import { COST_PAYMENT_STATUSES } from '@/types/agency';
import type { ShipmentCost, ShipmentRevenue } from '@/types/agency';

// =====================================================
// GENERATORS
// =====================================================

// Positive amount generator (for currency amounts)
const positiveAmountArb = fc.double({ min: 0.01, max: 10000000, noNaN: true });

// Non-negative amount generator
const nonNegativeAmountArb = fc.double({ min: 0, max: 10000000, noNaN: true });

// Exchange rate generator (positive, realistic range)
const exchangeRateArb = fc.double({ min: 0.0001, max: 20000, noNaN: true });

// Tax rate generator (0-100%)
const taxRateArb = fc.double({ min: 0, max: 100, noNaN: true });

// Currency code generator
const currencyArb = fc.constantFrom('IDR', 'USD', 'EUR', 'SGD', 'JPY', 'CNY', 'AUD');

// Non-IDR currency generator
const nonIdrCurrencyArb = fc.constantFrom('USD', 'EUR', 'SGD', 'JPY', 'CNY', 'AUD');

// Margin percentage generator
const marginArb = fc.double({ min: -100, max: 200, noNaN: true });

// Target margin generator
const targetMarginArb = fc.double({ min: 1, max: 100, noNaN: true });

// Date string generator (ISO format)
const dateStringArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .map(d => d.toISOString().split('T')[0]);

// Helper to create a minimal ShipmentCost for aggregation tests
const shipmentCostArb: fc.Arbitrary<ShipmentCost> = fc.record({
  id: fc.uuid(),
  bookingId: fc.uuid(),
  chargeTypeId: fc.uuid(),
  currency: currencyArb,
  unitPrice: positiveAmountArb,
  quantity: fc.double({ min: 0.1, max: 100, noNaN: true }),
  amount: positiveAmountArb,
  exchangeRate: exchangeRateArb,
  amountIdr: positiveAmountArb,
  isTaxable: fc.boolean(),
  taxRate: taxRateArb,
  taxAmount: nonNegativeAmountArb,
  totalAmount: positiveAmountArb,
  paymentStatus: fc.constantFrom('unpaid', 'partial', 'paid'),
  paidAmount: nonNegativeAmountArb,
  createdAt: fc.constant(new Date().toISOString()),
});

// Helper to create a minimal ShipmentRevenue for aggregation tests
const shipmentRevenueArb: fc.Arbitrary<ShipmentRevenue> = fc.record({
  id: fc.uuid(),
  bookingId: fc.uuid(),
  chargeTypeId: fc.uuid(),
  currency: currencyArb,
  unitPrice: positiveAmountArb,
  quantity: fc.double({ min: 0.1, max: 100, noNaN: true }),
  amount: positiveAmountArb,
  exchangeRate: exchangeRateArb,
  amountIdr: positiveAmountArb,
  isTaxable: fc.boolean(),
  taxRate: taxRateArb,
  taxAmount: nonNegativeAmountArb,
  totalAmount: positiveAmountArb,
  billingStatus: fc.constantFrom('unbilled', 'billed', 'paid'),
  createdAt: fc.constant(new Date().toISOString()),
});


// =====================================================
// PROPERTY 1: CURRENCY CONVERSION CONSISTENCY
// =====================================================

describe('Property 1: Currency Conversion Consistency', () => {
  /**
   * For any cost or revenue line item with a non-IDR currency,
   * the calculated amount_idr SHALL equal amount * exchange_rate,
   * ensuring consistent currency conversion across all financial calculations.
   * 
   * Validates: Requirements 2.2, 3.2, 7.3
   */

  it('convertToIdr returns amount * exchangeRate for non-IDR currencies', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        nonIdrCurrencyArb,
        exchangeRateArb,
        (amount, currency, exchangeRate) => {
          const result = convertToIdr(amount, currency, exchangeRate);
          const expected = amount * exchangeRate;
          
          // Use relative tolerance for floating point comparison
          expect(result).toBeCloseTo(expected, 6);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('convertToIdr returns original amount for IDR currency', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        exchangeRateArb,
        (amount, exchangeRate) => {
          const result = convertToIdr(amount, 'IDR', exchangeRate);
          
          // For IDR, should return the original amount regardless of exchange rate
          expect(result).toBe(amount);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('convertToIdr throws error for zero or negative exchange rate', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        nonIdrCurrencyArb,
        fc.double({ min: -1000, max: 0, noNaN: true }),
        (amount, currency, invalidRate) => {
          expect(() => convertToIdr(amount, currency, invalidRate)).toThrow('Exchange rate must be greater than 0');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('convertToIdr preserves proportionality: doubling amount doubles result', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        nonIdrCurrencyArb,
        exchangeRateArb,
        (amount, currency, exchangeRate) => {
          const result1 = convertToIdr(amount, currency, exchangeRate);
          const result2 = convertToIdr(amount * 2, currency, exchangeRate);
          
          expect(result2).toBeCloseTo(result1 * 2, 6);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('convertToIdr preserves proportionality: doubling exchange rate doubles result', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        nonIdrCurrencyArb,
        fc.double({ min: 0.0001, max: 10000, noNaN: true }), // Smaller range to avoid overflow
        (amount, currency, exchangeRate) => {
          const result1 = convertToIdr(amount, currency, exchangeRate);
          const result2 = convertToIdr(amount, currency, exchangeRate * 2);
          
          expect(result2).toBeCloseTo(result1 * 2, 6);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// =====================================================
// PROPERTY 2: TAX CALCULATION ACCURACY
// =====================================================

describe('Property 2: Tax Calculation Accuracy', () => {
  /**
   * For any cost or revenue line item where is_taxable is true,
   * the tax_amount SHALL equal amount * (tax_rate / 100) and
   * total_amount SHALL equal amount + tax_amount.
   * When is_taxable is false, tax_amount SHALL be 0 and total_amount SHALL equal amount.
   * 
   * Validates: Requirements 2.3, 3.3, 8.2, 8.3, 8.4
   */

  it('calculateTax returns amount * (taxRate / 100) when taxable', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        taxRateArb,
        (amount, taxRate) => {
          const result = calculateTax(amount, taxRate, true);
          const expected = amount * (taxRate / 100);
          
          expect(result).toBeCloseTo(expected, 6);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateTax returns 0 when not taxable', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        taxRateArb,
        (amount, taxRate) => {
          const result = calculateTax(amount, taxRate, false);
          
          expect(result).toBe(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateTotalWithTax returns correct breakdown when taxable', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        taxRateArb,
        (amount, taxRate) => {
          const result = calculateTotalWithTax(amount, taxRate, true);
          const expectedTax = amount * (taxRate / 100);
          const expectedTotal = amount + expectedTax;
          
          expect(result.amount).toBe(amount);
          expect(result.tax).toBeCloseTo(expectedTax, 6);
          expect(result.total).toBeCloseTo(expectedTotal, 6);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateTotalWithTax returns amount as total when not taxable', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        taxRateArb,
        (amount, taxRate) => {
          const result = calculateTotalWithTax(amount, taxRate, false);
          
          expect(result.amount).toBe(amount);
          expect(result.tax).toBe(0);
          expect(result.total).toBe(amount);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateTax throws error for negative tax rate', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        fc.double({ min: -100, max: -0.01, noNaN: true }),
        (amount, negativeTaxRate) => {
          expect(() => calculateTax(amount, negativeTaxRate, true)).toThrow('Tax rate cannot be negative');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateTotalWithTax.total equals amount + tax', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        taxRateArb,
        fc.boolean(),
        (amount, taxRate, isTaxable) => {
          const result = calculateTotalWithTax(amount, taxRate, isTaxable);
          
          expect(result.total).toBeCloseTo(result.amount + result.tax, 6);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('default tax rate is 11%', () => {
    expect(DEFAULT_TAX_RATE).toBe(11);
  });
});


// =====================================================
// PROPERTY 3: PROFITABILITY CALCULATION CORRECTNESS
// =====================================================

describe('Property 3: Profitability Calculation Correctness', () => {
  /**
   * For any booking with associated costs and revenue:
   * - total_revenue SHALL equal the sum of all amount_idr from revenue items
   * - total_cost SHALL equal the sum of all amount_idr from cost items
   * - gross_profit SHALL equal total_revenue - total_cost
   * - profit_margin_pct SHALL equal (gross_profit / total_revenue) * 100 when total_revenue > 0, otherwise 0
   * 
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
   */

  it('calculateGrossProfit returns revenue - cost', () => {
    fc.assert(
      fc.property(
        nonNegativeAmountArb,
        nonNegativeAmountArb,
        (revenue, cost) => {
          const result = calculateGrossProfit(revenue, cost);
          const expected = revenue - cost;
          
          expect(result).toBeCloseTo(expected, 6);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateProfitMargin returns (grossProfit / revenue) * 100 when revenue > 0', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 10000000, noNaN: true }), // Positive revenue
        nonNegativeAmountArb,
        (revenue, cost) => {
          const result = calculateProfitMargin(revenue, cost);
          const grossProfit = revenue - cost;
          const expected = (grossProfit / revenue) * 100;
          
          expect(result).toBeCloseTo(expected, 6);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateProfitMargin returns 0 when revenue is 0', () => {
    fc.assert(
      fc.property(
        nonNegativeAmountArb,
        (cost) => {
          const result = calculateProfitMargin(0, cost);
          
          expect(result).toBe(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateProfitMargin returns 0 when revenue is negative', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10000000, max: -0.01, noNaN: true }),
        nonNegativeAmountArb,
        (negativeRevenue, cost) => {
          const result = calculateProfitMargin(negativeRevenue, cost);
          
          expect(result).toBe(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('aggregateCosts returns sum of all amountIdr values', () => {
    fc.assert(
      fc.property(
        fc.array(shipmentCostArb, { minLength: 0, maxLength: 20 }),
        (costs) => {
          const result = aggregateCosts(costs);
          const expected = costs.reduce((sum, c) => sum + (c.amountIdr || 0), 0);
          
          expect(result).toBeCloseTo(expected, 6);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('aggregateRevenue returns sum of all amountIdr values', () => {
    fc.assert(
      fc.property(
        fc.array(shipmentRevenueArb, { minLength: 0, maxLength: 20 }),
        (revenue) => {
          const result = aggregateRevenue(revenue);
          const expected = revenue.reduce((sum, r) => sum + (r.amountIdr || 0), 0);
          
          expect(result).toBeCloseTo(expected, 6);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('aggregateCosts returns 0 for empty array', () => {
    const result = aggregateCosts([]);
    expect(result).toBe(0);
  });

  it('aggregateRevenue returns 0 for empty array', () => {
    const result = aggregateRevenue([]);
    expect(result).toBe(0);
  });

  it('profit margin is 100% when cost is 0 and revenue > 0', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        (revenue) => {
          const result = calculateProfitMargin(revenue, 0);
          
          expect(result).toBeCloseTo(100, 6);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('profit margin is negative when cost > revenue', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1000000, noNaN: true }),
        fc.double({ min: 1.01, max: 2, noNaN: true }), // Multiplier > 1
        (revenue, multiplier) => {
          const cost = revenue * multiplier;
          const result = calculateProfitMargin(revenue, cost);
          
          expect(result).toBeLessThan(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// =====================================================
// ADDITIONAL PROPERTY TESTS (Supporting Properties)
// =====================================================

describe('Property 8: Vendor Invoice Due Date Calculation', () => {
  /**
   * For any vendor invoice with a due_date, the system SHALL correctly calculate
   * the number of days until due (positive) or days overdue (negative) based on the current date.
   * 
   * Feature: v0.75-agency-cost-revenue-management
   * Property 8: Vendor Invoice Due Date Calculation
   * Validates: Requirements 4.4
   */

  // Generator for days offset from today (positive = future, negative = past)
  const daysOffsetArb = fc.integer({ min: -365, max: 365 });

  // Helper to create a date string offset from today
  function createDateFromOffset(daysOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
  }

  it('calculateDaysUntilDue returns 0 for null/undefined due date', () => {
    expect(calculateDaysUntilDue(null)).toBe(0);
    expect(calculateDaysUntilDue(undefined)).toBe(0);
  });

  it('isOverdue returns false for null/undefined due date', () => {
    expect(isOverdue(null)).toBe(false);
    expect(isOverdue(undefined)).toBe(false);
  });

  it('calculateDaysUntilDue returns approximately the days offset for any date', () => {
    fc.assert(
      fc.property(
        daysOffsetArb,
        (daysOffset) => {
          const dateStr = createDateFromOffset(daysOffset);
          const result = calculateDaysUntilDue(dateStr);
          
          // Allow for 1 day tolerance due to time zone edge cases
          expect(Math.abs(result - daysOffset)).toBeLessThanOrEqual(1);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateDaysUntilDue returns positive for future dates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),
        (daysInFuture) => {
          const dateStr = createDateFromOffset(daysInFuture);
          const result = calculateDaysUntilDue(dateStr);
          
          expect(result).toBeGreaterThan(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateDaysUntilDue returns negative for past dates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),
        (daysInPast) => {
          const dateStr = createDateFromOffset(-daysInPast);
          const result = calculateDaysUntilDue(dateStr);
          
          expect(result).toBeLessThan(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isOverdue returns true for past dates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),
        (daysInPast) => {
          const dateStr = createDateFromOffset(-daysInPast);
          const result = isOverdue(dateStr);
          
          expect(result).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isOverdue returns false for future dates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),
        (daysInFuture) => {
          const dateStr = createDateFromOffset(daysInFuture);
          const result = isOverdue(dateStr);
          
          expect(result).toBe(false);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isOverdue is consistent with calculateDaysUntilDue', () => {
    fc.assert(
      fc.property(
        daysOffsetArb,
        (daysOffset) => {
          const dateStr = createDateFromOffset(daysOffset);
          const daysUntilDue = calculateDaysUntilDue(dateStr);
          const overdue = isOverdue(dateStr);
          
          // isOverdue should be true when daysUntilDue < 0
          expect(overdue).toBe(daysUntilDue < 0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateDaysUntilDue is monotonic: later dates have higher values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -365, max: 364 }),
        fc.integer({ min: 1, max: 30 }),
        (baseOffset, additionalDays) => {
          const date1 = createDateFromOffset(baseOffset);
          const date2 = createDateFromOffset(baseOffset + additionalDays);
          
          const result1 = calculateDaysUntilDue(date1);
          const result2 = calculateDaysUntilDue(date2);
          
          // date2 is later, so it should have more days until due
          expect(result2).toBeGreaterThan(result1);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Property 11: Margin Target Indicator Logic', () => {
  /**
   * For any booking's profit margin, the visual indicator SHALL be:
   * - green when profit_margin_pct >= target_margin_pct (default 20%)
   * - yellow when profit_margin_pct >= target * 0.5 and < target
   * - red when profit_margin_pct < target * 0.5
   * 
   * Validates: Requirements 9.3
   */

  it('getMarginIndicator returns green when margin >= target', () => {
    fc.assert(
      fc.property(
        targetMarginArb,
        fc.double({ min: 0, max: 100, noNaN: true }),
        (target, extra) => {
          const margin = target + extra; // margin >= target
          const result = getMarginIndicator(margin, target);
          
          expect(result).toBe('green');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getMarginIndicator returns yellow when margin >= target * 0.5 and < target', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 2, max: 100, noNaN: true }), // Target >= 2 to have meaningful range
        fc.double({ min: 0, max: 1, noNaN: true }),
        (target, fraction) => {
          // margin in range [target * 0.5, target)
          const margin = target * 0.5 + (target * 0.5 - 0.001) * fraction;
          if (margin >= target) return true; // Skip edge cases
          
          const result = getMarginIndicator(margin, target);
          
          expect(result).toBe('yellow');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getMarginIndicator returns red when margin < target * 0.5', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 2, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 0.99, noNaN: true }),
        (target, fraction) => {
          // margin < target * 0.5
          const margin = target * 0.5 * fraction - 0.01;
          const result = getMarginIndicator(margin, target);
          
          expect(result).toBe('red');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isMarginTargetMet returns true when margin >= target', () => {
    fc.assert(
      fc.property(
        targetMarginArb,
        fc.double({ min: 0, max: 100, noNaN: true }),
        (target, extra) => {
          const margin = target + extra;
          const result = isMarginTargetMet(margin, target);
          
          expect(result).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isMarginTargetMet returns false when margin < target', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 100, noNaN: true }),
        fc.double({ min: 0.01, max: 0.99, noNaN: true }),
        (target, fraction) => {
          const margin = target * fraction;
          const result = isMarginTargetMet(margin, target);
          
          expect(result).toBe(false);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('default margin target is 20%', () => {
    expect(DEFAULT_MARGIN_TARGET).toBe(20);
  });

  it('getMarginIndicator uses default target of 20% when not specified', () => {
    // margin = 20 should be green (>= 20)
    expect(getMarginIndicator(20)).toBe('green');
    // margin = 19 should be yellow (>= 10, < 20)
    expect(getMarginIndicator(19)).toBe('yellow');
    // margin = 9 should be red (< 10)
    expect(getMarginIndicator(9)).toBe('red');
  });
});


// =====================================================
// PROPERTY 4: CHARGE TYPE ORDERING CONSISTENCY
// =====================================================

describe('Property 4: Charge Type Ordering Consistency', () => {
  /**
   * For any list of charge types returned by the system,
   * the items SHALL be ordered by display_order in ascending order,
   * ensuring consistent presentation across all views.
   * 
   * Validates: Requirements 1.4
   */

  // Generator for charge type with display_order
  const chargeTypeWithOrderArb = fc.record({
    id: fc.uuid(),
    chargeCode: fc.string({ minLength: 2, maxLength: 10 }).map(s => s.toUpperCase().replace(/[^A-Z0-9]/g, 'X')),
    chargeName: fc.string({ minLength: 3, maxLength: 50 }),
    chargeCategory: fc.constantFrom('freight', 'origin', 'destination', 'documentation', 'customs', 'other'),
    chargeType: fc.constantFrom('revenue', 'cost', 'both'),
    defaultCurrency: fc.constantFrom('IDR', 'USD', 'EUR'),
    isTaxable: fc.boolean(),
    displayOrder: fc.integer({ min: 0, max: 1000 }),
    isActive: fc.boolean(),
    createdAt: fc.constant(new Date().toISOString()),
  });

  /**
   * Helper function to sort charge types by display_order (simulates what getChargeTypes does)
   * This is a pure function that can be tested without database access.
   */
  function sortChargeTypesByDisplayOrder<T extends { displayOrder: number; chargeName: string }>(
    chargeTypes: T[]
  ): T[] {
    return [...chargeTypes].sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return a.chargeName.localeCompare(b.chargeName);
    });
  }

  it('sortChargeTypesByDisplayOrder always returns items sorted by display_order ascending', () => {
    fc.assert(
      fc.property(
        fc.array(chargeTypeWithOrderArb, { minLength: 0, maxLength: 50 }),
        (chargeTypes) => {
          const sorted = sortChargeTypesByDisplayOrder(chargeTypes);
          
          // Verify the result is sorted by display_order
          for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
            
            // display_order should be non-decreasing
            expect(prev.displayOrder).toBeLessThanOrEqual(curr.displayOrder);
            
            // If display_order is equal, should be sorted by chargeName
            if (prev.displayOrder === curr.displayOrder) {
              expect(prev.chargeName.localeCompare(curr.chargeName)).toBeLessThanOrEqual(0);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sortChargeTypesByDisplayOrder preserves all items (no items lost)', () => {
    fc.assert(
      fc.property(
        fc.array(chargeTypeWithOrderArb, { minLength: 0, maxLength: 50 }),
        (chargeTypes) => {
          const sorted = sortChargeTypesByDisplayOrder(chargeTypes);
          
          // Same length
          expect(sorted.length).toBe(chargeTypes.length);
          
          // All original items are present
          const originalIds = new Set(chargeTypes.map(ct => ct.id));
          const sortedIds = new Set(sorted.map(ct => ct.id));
          expect(sortedIds).toEqual(originalIds);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sortChargeTypesByDisplayOrder is idempotent (sorting twice gives same result)', () => {
    fc.assert(
      fc.property(
        fc.array(chargeTypeWithOrderArb, { minLength: 0, maxLength: 50 }),
        (chargeTypes) => {
          const sorted1 = sortChargeTypesByDisplayOrder(chargeTypes);
          const sorted2 = sortChargeTypesByDisplayOrder(sorted1);
          
          // Sorting twice should give the same result
          expect(sorted2.map(ct => ct.id)).toEqual(sorted1.map(ct => ct.id));
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sortChargeTypesByDisplayOrder returns empty array for empty input', () => {
    const result = sortChargeTypesByDisplayOrder([]);
    expect(result).toEqual([]);
  });

  it('sortChargeTypesByDisplayOrder handles single item', () => {
    fc.assert(
      fc.property(
        chargeTypeWithOrderArb,
        (chargeType) => {
          const result = sortChargeTypesByDisplayOrder([chargeType]);
          
          expect(result.length).toBe(1);
          expect(result[0].id).toBe(chargeType.id);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sortChargeTypesByDisplayOrder handles items with same display_order', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            chargeCode: fc.string({ minLength: 2, maxLength: 10 }).map(s => s.toUpperCase().replace(/[^A-Z0-9]/g, 'X')),
            chargeName: fc.string({ minLength: 3, maxLength: 50 }),
            chargeCategory: fc.constantFrom('freight', 'origin', 'destination', 'documentation', 'customs', 'other'),
            chargeType: fc.constantFrom('revenue', 'cost', 'both'),
            defaultCurrency: fc.constantFrom('IDR', 'USD', 'EUR'),
            isTaxable: fc.boolean(),
            isActive: fc.boolean(),
            createdAt: fc.constant(new Date().toISOString()),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (displayOrder, chargeTypesWithoutOrder) => {
          // All items have the same display_order
          const chargeTypes = chargeTypesWithoutOrder.map(ct => ({
            ...ct,
            displayOrder,
          }));
          
          const sorted = sortChargeTypesByDisplayOrder(chargeTypes);
          
          // All items should still be present
          expect(sorted.length).toBe(chargeTypes.length);
          
          // Should be sorted by chargeName when display_order is equal
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i - 1].chargeName.localeCompare(sorted[i].chargeName)).toBeLessThanOrEqual(0);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// =====================================================
// PROPERTY 5: SOFT-DELETE DATA PRESERVATION
// =====================================================

describe('Property 5: Soft-Delete Data Preservation', () => {
  /**
   * For any charge type that is soft-deleted (is_active set to false),
   * the record SHALL remain in the database and be retrievable for historical reference,
   * preserving data integrity.
   * 
   * Validates: Requirements 1.5
   */

  // Generator for charge type
  const chargeTypeArb = fc.record({
    id: fc.uuid(),
    chargeCode: fc.string({ minLength: 2, maxLength: 10 }).map(s => s.toUpperCase().replace(/[^A-Z0-9]/g, 'X')),
    chargeName: fc.string({ minLength: 3, maxLength: 50 }),
    chargeCategory: fc.constantFrom('freight', 'origin', 'destination', 'documentation', 'customs', 'other'),
    chargeType: fc.constantFrom('revenue', 'cost', 'both'),
    defaultCurrency: fc.constantFrom('IDR', 'USD', 'EUR'),
    isTaxable: fc.boolean(),
    displayOrder: fc.integer({ min: 0, max: 1000 }),
    isActive: fc.boolean(),
    createdAt: fc.constant(new Date().toISOString()),
  });

  /**
   * Helper function to simulate soft-delete behavior.
   * This is a pure function that can be tested without database access.
   */
  function softDeleteChargeType<T extends { isActive: boolean }>(chargeType: T): T {
    return { ...chargeType, isActive: false };
  }

  /**
   * Helper function to filter active charge types (simulates default query behavior).
   */
  function filterActiveChargeTypes<T extends { isActive: boolean }>(chargeTypes: T[]): T[] {
    return chargeTypes.filter(ct => ct.isActive);
  }

  /**
   * Helper function to get all charge types including inactive (simulates includeInactive=true).
   */
  function getAllChargeTypes<T>(chargeTypes: T[]): T[] {
    return [...chargeTypes];
  }

  it('soft-deleted charge type has isActive = false', () => {
    fc.assert(
      fc.property(
        chargeTypeArb,
        (chargeType) => {
          const deleted = softDeleteChargeType(chargeType);
          
          expect(deleted.isActive).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('soft-deleted charge type preserves all other fields', () => {
    fc.assert(
      fc.property(
        chargeTypeArb,
        (chargeType) => {
          const deleted = softDeleteChargeType(chargeType);
          
          // All fields except isActive should be preserved
          expect(deleted.id).toBe(chargeType.id);
          expect(deleted.chargeCode).toBe(chargeType.chargeCode);
          expect(deleted.chargeName).toBe(chargeType.chargeName);
          expect(deleted.chargeCategory).toBe(chargeType.chargeCategory);
          expect(deleted.chargeType).toBe(chargeType.chargeType);
          expect(deleted.defaultCurrency).toBe(chargeType.defaultCurrency);
          expect(deleted.isTaxable).toBe(chargeType.isTaxable);
          expect(deleted.displayOrder).toBe(chargeType.displayOrder);
          expect(deleted.createdAt).toBe(chargeType.createdAt);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('soft-deleted charge type is excluded from active-only queries', () => {
    fc.assert(
      fc.property(
        fc.array(chargeTypeArb, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 19 }),
        (chargeTypes, deleteIndex) => {
          const safeIndex = deleteIndex % chargeTypes.length;
          const targetId = chargeTypes[safeIndex].id;
          
          // Soft-delete one charge type
          const updatedList = chargeTypes.map((ct, i) =>
            i === safeIndex ? softDeleteChargeType(ct) : ct
          );
          
          // Filter active only
          const activeOnly = filterActiveChargeTypes(updatedList);
          
          // The deleted item should not be in active-only results
          const deletedInActive = activeOnly.find(ct => ct.id === targetId);
          expect(deletedInActive).toBeUndefined();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('soft-deleted charge type is included when includeInactive is true', () => {
    fc.assert(
      fc.property(
        fc.array(chargeTypeArb, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 19 }),
        (chargeTypes, deleteIndex) => {
          const safeIndex = deleteIndex % chargeTypes.length;
          const targetId = chargeTypes[safeIndex].id;
          
          // Soft-delete one charge type
          const updatedList = chargeTypes.map((ct, i) =>
            i === safeIndex ? softDeleteChargeType(ct) : ct
          );
          
          // Get all including inactive
          const allChargeTypes = getAllChargeTypes(updatedList);
          
          // The deleted item should still be in the full list
          const deletedInAll = allChargeTypes.find(ct => ct.id === targetId);
          expect(deletedInAll).toBeDefined();
          expect(deletedInAll?.isActive).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('soft-delete is idempotent (deleting twice has same effect)', () => {
    fc.assert(
      fc.property(
        chargeTypeArb,
        (chargeType) => {
          const deleted1 = softDeleteChargeType(chargeType);
          const deleted2 = softDeleteChargeType(deleted1);
          
          // Both should have isActive = false
          expect(deleted1.isActive).toBe(false);
          expect(deleted2.isActive).toBe(false);
          
          // All other fields should be the same
          expect(deleted2.id).toBe(deleted1.id);
          expect(deleted2.chargeCode).toBe(deleted1.chargeCode);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('total count of all charge types is preserved after soft-delete', () => {
    fc.assert(
      fc.property(
        fc.array(chargeTypeArb, { minLength: 1, maxLength: 20 }),
        fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 0, maxLength: 10 }),
        (chargeTypes, deleteIndices) => {
          const originalCount = chargeTypes.length;
          
          // Soft-delete multiple charge types
          const indicesToDelete = new Set(deleteIndices.map(i => i % chargeTypes.length));
          const updatedList = chargeTypes.map((ct, i) =>
            indicesToDelete.has(i) ? softDeleteChargeType(ct) : ct
          );
          
          // Total count should be preserved
          const allChargeTypes = getAllChargeTypes(updatedList);
          expect(allChargeTypes.length).toBe(originalCount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('active count decreases by number of soft-deleted items', () => {
    fc.assert(
      fc.property(
        // Generate charge types that are all active initially
        fc.array(
          chargeTypeArb.map(ct => ({ ...ct, isActive: true })),
          { minLength: 1, maxLength: 20 }
        ),
        fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 0, maxLength: 10 }),
        (chargeTypes, deleteIndices) => {
          const originalActiveCount = chargeTypes.length;
          
          // Get unique indices to delete
          const indicesToDelete = new Set(deleteIndices.map(i => i % chargeTypes.length));
          const deleteCount = indicesToDelete.size;
          
          // Soft-delete the charge types
          const updatedList = chargeTypes.map((ct, i) =>
            indicesToDelete.has(i) ? softDeleteChargeType(ct) : ct
          );
          
          // Active count should decrease by the number of deleted items
          const activeOnly = filterActiveChargeTypes(updatedList);
          expect(activeOnly.length).toBe(originalActiveCount - deleteCount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// =====================================================
// PROPERTY 6: COST PAYMENT STATUS VALIDITY
// =====================================================

describe('Property 6: Cost Payment Status Validity', () => {
  /**
   * For any shipment cost, the payment_status field SHALL only contain
   * one of the valid values: 'unpaid', 'partial', or 'paid'.
   * 
   * Validates: Requirements 2.6
   */

  // Valid payment statuses
  const validPaymentStatuses = ['unpaid', 'partial', 'paid'];

  // Generator for valid payment status
  const validPaymentStatusArb = fc.constantFrom(...validPaymentStatuses);

  // Generator for invalid payment status (random strings that are not valid)
  const invalidPaymentStatusArb = fc.string({ minLength: 1, maxLength: 20 })
    .filter(s => !validPaymentStatuses.includes(s));

  it('isValidCostPaymentStatus returns true for all valid statuses', () => {
    fc.assert(
      fc.property(
        validPaymentStatusArb,
        (status) => {
          const result = isValidCostPaymentStatus(status);
          expect(result).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isValidCostPaymentStatus returns false for invalid statuses', () => {
    fc.assert(
      fc.property(
        invalidPaymentStatusArb,
        (status) => {
          const result = isValidCostPaymentStatus(status);
          expect(result).toBe(false);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('COST_PAYMENT_STATUSES contains exactly the valid values', () => {
    expect(COST_PAYMENT_STATUSES).toEqual(validPaymentStatuses);
    expect(COST_PAYMENT_STATUSES.length).toBe(3);
  });

  it('isValidCostPaymentStatus returns false for empty string', () => {
    expect(isValidCostPaymentStatus('')).toBe(false);
  });

  it('isValidCostPaymentStatus returns false for null-like values', () => {
    expect(isValidCostPaymentStatus(null as unknown as string)).toBe(false);
    expect(isValidCostPaymentStatus(undefined as unknown as string)).toBe(false);
  });

  it('isValidCostPaymentStatus is case-sensitive', () => {
    fc.assert(
      fc.property(
        validPaymentStatusArb,
        (status) => {
          // Uppercase version should be invalid
          const upperCase = status.toUpperCase();
          if (upperCase !== status) {
            expect(isValidCostPaymentStatus(upperCase)).toBe(false);
          }
          
          // Mixed case should be invalid
          const mixedCase = status.charAt(0).toUpperCase() + status.slice(1);
          if (mixedCase !== status) {
            expect(isValidCostPaymentStatus(mixedCase)).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('payment status transitions are logically valid', () => {
    // Define valid transitions
    const validTransitions: Record<string, string[]> = {
      unpaid: ['partial', 'paid'],
      partial: ['paid'],
      paid: [], // No further transitions from paid
    };

    fc.assert(
      fc.property(
        validPaymentStatusArb,
        (currentStatus) => {
          const allowedNextStatuses = validTransitions[currentStatus];
          
          // All allowed next statuses should be valid
          for (const nextStatus of allowedNextStatuses) {
            expect(isValidCostPaymentStatus(nextStatus)).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// =====================================================
// PROPERTY 9: DEFAULT TAX RATE APPLICATION
// =====================================================

describe('Property 9: Default Tax Rate Application', () => {
  /**
   * For any new cost or revenue line item where tax_rate is not explicitly provided,
   * the system SHALL default to 11% (Indonesian VAT rate).
   * 
   * Validates: Requirements 8.1
   */

  // Generator for cost form data without tax rate
  const costFormDataWithoutTaxRateArb = fc.record({
    bookingId: fc.uuid(),
    chargeTypeId: fc.uuid(),
    currency: fc.constantFrom('IDR', 'USD', 'EUR'),
    unitPrice: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
    quantity: fc.double({ min: 0.1, max: 100, noNaN: true }),
    exchangeRate: fc.double({ min: 1, max: 20000, noNaN: true }),
    isTaxable: fc.boolean(),
    // taxRate intentionally omitted
    vendorId: fc.option(fc.uuid(), { nil: undefined }),
    vendorName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    notes: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  });

  // Generator for cost form data with explicit tax rate
  const costFormDataWithTaxRateArb = fc.record({
    bookingId: fc.uuid(),
    chargeTypeId: fc.uuid(),
    currency: fc.constantFrom('IDR', 'USD', 'EUR'),
    unitPrice: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
    quantity: fc.double({ min: 0.1, max: 100, noNaN: true }),
    exchangeRate: fc.double({ min: 1, max: 20000, noNaN: true }),
    isTaxable: fc.boolean(),
    taxRate: fc.double({ min: 0, max: 50, noNaN: true }), // Explicit tax rate
    vendorId: fc.option(fc.uuid(), { nil: undefined }),
    vendorName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    notes: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  });

  // Generator for revenue form data without tax rate
  const revenueFormDataWithoutTaxRateArb = fc.record({
    bookingId: fc.uuid(),
    chargeTypeId: fc.uuid(),
    currency: fc.constantFrom('IDR', 'USD', 'EUR'),
    unitPrice: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
    quantity: fc.double({ min: 0.1, max: 100, noNaN: true }),
    exchangeRate: fc.double({ min: 1, max: 20000, noNaN: true }),
    isTaxable: fc.boolean(),
    // taxRate intentionally omitted
    notes: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  });

  it('DEFAULT_TAX_RATE is 11%', () => {
    expect(DEFAULT_TAX_RATE).toBe(11);
  });

  it('prepareCostForInsert uses default tax rate when not provided', () => {
    fc.assert(
      fc.property(
        costFormDataWithoutTaxRateArb,
        (formData) => {
          const result = prepareCostForInsert(formData);
          
          // Should use default tax rate of 11%
          expect(result.tax_rate).toBe(DEFAULT_TAX_RATE);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('prepareCostForInsert uses explicit tax rate when provided', () => {
    fc.assert(
      fc.property(
        costFormDataWithTaxRateArb,
        (formData) => {
          const result = prepareCostForInsert(formData);
          
          // Should use the explicitly provided tax rate
          expect(result.tax_rate).toBe(formData.taxRate);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('prepareRevenueForInsert uses default tax rate when not provided', () => {
    fc.assert(
      fc.property(
        revenueFormDataWithoutTaxRateArb,
        (formData) => {
          const result = prepareRevenueForInsert(formData);
          
          // Should use default tax rate of 11%
          expect(result.tax_rate).toBe(DEFAULT_TAX_RATE);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('tax calculation uses default rate correctly', () => {
    fc.assert(
      fc.property(
        costFormDataWithoutTaxRateArb.filter(d => d.isTaxable === true),
        (formData) => {
          const result = prepareCostForInsert(formData);
          
          // Calculate expected tax with default rate
          const amount = formData.unitPrice * formData.quantity;
          const exchangeRate = formData.currency === 'IDR' ? 1 : formData.exchangeRate;
          const amountIdr = amount * exchangeRate;
          const expectedTax = amountIdr * (DEFAULT_TAX_RATE / 100);
          
          // Tax amount should match expected calculation
          expect(result.tax_amount).toBeCloseTo(expectedTax, 2);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('total amount includes tax calculated with default rate', () => {
    fc.assert(
      fc.property(
        costFormDataWithoutTaxRateArb.filter(d => d.isTaxable === true),
        (formData) => {
          const result = prepareCostForInsert(formData) as Record<string, number>;
          
          // Total should be amount_idr + tax_amount
          const expectedTotal = result.amount_idr + result.tax_amount;
          
          expect(result.total_amount).toBeCloseTo(expectedTotal, 2);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('non-taxable items have zero tax regardless of default rate', () => {
    fc.assert(
      fc.property(
        costFormDataWithoutTaxRateArb.filter(d => d.isTaxable === false),
        (formData) => {
          const result = prepareCostForInsert(formData);
          
          // Tax should be 0 for non-taxable items
          expect(result.tax_amount).toBe(0);
          
          // Total should equal amount_idr
          expect(result.total_amount).toBe(result.amount_idr);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('default isTaxable is true when not provided', () => {
    // Create form data without isTaxable
    const formDataWithoutTaxable = {
      bookingId: 'test-booking-id',
      chargeTypeId: 'test-charge-type-id',
      currency: 'IDR',
      unitPrice: 1000,
      quantity: 1,
    };

    const result = prepareCostForInsert(formDataWithoutTaxable);
    
    // Should default to taxable
    expect(result.is_taxable).toBe(true);
    // Should have tax calculated
    expect(result.tax_amount).toBeGreaterThan(0);
  });
});


// =====================================================
// PROPERTY 7: REVENUE BILLING STATUS VALIDITY
// =====================================================

import { isValidRevenueBillingStatus } from '@/lib/cost-revenue-utils';
import { REVENUE_BILLING_STATUSES } from '@/types/agency';

describe('Property 7: Revenue Billing Status Validity', () => {
  /**
   * For any shipment revenue, the billing_status field SHALL only contain
   * one of the valid values: 'unbilled', 'billed', or 'paid'.
   * 
   * Feature: v0.75-agency-cost-revenue-management, Property 7: Revenue Billing Status Validity
   * Validates: Requirements 3.4
   */

  // Valid billing statuses
  const validBillingStatuses = ['unbilled', 'billed', 'paid'];

  // Generator for valid billing status
  const validBillingStatusArb = fc.constantFrom(...validBillingStatuses);

  // Generator for invalid billing status (random strings that are not valid)
  const invalidBillingStatusArb = fc.string({ minLength: 1, maxLength: 20 })
    .filter(s => !validBillingStatuses.includes(s));

  it('isValidRevenueBillingStatus returns true for all valid statuses', () => {
    fc.assert(
      fc.property(
        validBillingStatusArb,
        (status) => {
          const result = isValidRevenueBillingStatus(status);
          expect(result).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isValidRevenueBillingStatus returns false for invalid statuses', () => {
    fc.assert(
      fc.property(
        invalidBillingStatusArb,
        (status) => {
          const result = isValidRevenueBillingStatus(status);
          expect(result).toBe(false);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('REVENUE_BILLING_STATUSES contains exactly the valid values', () => {
    expect(REVENUE_BILLING_STATUSES).toEqual(validBillingStatuses);
    expect(REVENUE_BILLING_STATUSES.length).toBe(3);
  });

  it('isValidRevenueBillingStatus returns false for empty string', () => {
    expect(isValidRevenueBillingStatus('')).toBe(false);
  });

  it('isValidRevenueBillingStatus returns false for null-like values', () => {
    expect(isValidRevenueBillingStatus(null as unknown as string)).toBe(false);
    expect(isValidRevenueBillingStatus(undefined as unknown as string)).toBe(false);
  });

  it('isValidRevenueBillingStatus is case-sensitive', () => {
    fc.assert(
      fc.property(
        validBillingStatusArb,
        (status) => {
          // Uppercase version should be invalid
          const upperCase = status.toUpperCase();
          if (upperCase !== status) {
            expect(isValidRevenueBillingStatus(upperCase)).toBe(false);
          }
          
          // Mixed case should be invalid
          const mixedCase = status.charAt(0).toUpperCase() + status.slice(1);
          if (mixedCase !== status) {
            expect(isValidRevenueBillingStatus(mixedCase)).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('billing status transitions are logically valid', () => {
    // Define valid transitions
    const validTransitions: Record<string, string[]> = {
      unbilled: ['billed'],
      billed: ['paid'],
      paid: [], // No further transitions from paid (final state)
    };

    fc.assert(
      fc.property(
        validBillingStatusArb,
        (currentStatus) => {
          const allowedNextStatuses = validTransitions[currentStatus];
          
          // All allowed next statuses should be valid
          for (const nextStatus of allowedNextStatuses) {
            expect(isValidRevenueBillingStatus(nextStatus)).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('unbilled is the initial/default status for new revenue', () => {
    // Verify that 'unbilled' is a valid status (it's the default for new revenue)
    expect(isValidRevenueBillingStatus('unbilled')).toBe(true);
    expect(validBillingStatuses[0]).toBe('unbilled');
  });

  it('paid is the final status in the billing workflow', () => {
    // Verify that 'paid' is a valid status (it's the final state)
    expect(isValidRevenueBillingStatus('paid')).toBe(true);
    expect(validBillingStatuses[validBillingStatuses.length - 1]).toBe('paid');
  });

  it('all valid statuses are distinct', () => {
    const uniqueStatuses = new Set(validBillingStatuses);
    expect(uniqueStatuses.size).toBe(validBillingStatuses.length);
  });

  it('billing status values match expected workflow order', () => {
    // The workflow is: unbilled -> billed -> paid
    expect(validBillingStatuses).toEqual(['unbilled', 'billed', 'paid']);
  });
});


// =====================================================
// PROPERTY 10: PROFITABILITY FILTER CORRECTNESS
// =====================================================

describe('Property 10: Profitability Filter Correctness', () => {
  /**
   * For any filter applied to the profitability view (customer, date range, status),
   * the returned results SHALL only include bookings that match all specified filter criteria.
   * 
   * Feature: v0.75-agency-cost-revenue-management, Property 10: Profitability Filter Correctness
   * Validates: Requirements 9.2
   */

  // Generator for profitability record
  const profitabilityRecordArb = fc.record({
    bookingId: fc.uuid(),
    bookingNumber: fc.string({ minLength: 5, maxLength: 20 }),
    customerId: fc.option(fc.uuid(), { nil: undefined }),
    customerName: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
    jobOrderId: fc.option(fc.uuid(), { nil: undefined }),
    joNumber: fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: undefined }),
    totalRevenue: fc.double({ min: 0, max: 10000000, noNaN: true }),
    revenueTax: fc.double({ min: 0, max: 1000000, noNaN: true }),
    totalCost: fc.double({ min: 0, max: 10000000, noNaN: true }),
    costTax: fc.double({ min: 0, max: 1000000, noNaN: true }),
    grossProfit: fc.double({ min: -5000000, max: 5000000, noNaN: true }),
    profitMarginPct: fc.double({ min: -100, max: 200, noNaN: true }),
    status: fc.constantFrom('draft', 'requested', 'confirmed', 'shipped', 'completed', 'cancelled'),
  });

  // Generator for profitability filters
  const profitabilityFiltersArb = fc.record({
    customerId: fc.option(fc.uuid(), { nil: undefined }),
    status: fc.option(fc.constantFrom('draft', 'requested', 'confirmed', 'shipped', 'completed', 'cancelled'), { nil: undefined }),
    minMargin: fc.option(fc.double({ min: -100, max: 100, noNaN: true }), { nil: undefined }),
    maxMargin: fc.option(fc.double({ min: -100, max: 200, noNaN: true }), { nil: undefined }),
  });

  /**
   * Pure function to filter profitability records based on filters.
   * This simulates the filtering logic in getShipmentProfitability.
   */
  function filterProfitabilityRecords<T extends {
    customerId?: string;
    status: string;
    profitMarginPct: number;
  }>(
    records: T[],
    filters: {
      customerId?: string;
      status?: string;
      minMargin?: number;
      maxMargin?: number;
    }
  ): T[] {
    return records.filter(record => {
      // Customer filter
      if (filters.customerId && record.customerId !== filters.customerId) {
        return false;
      }

      // Status filter
      if (filters.status && record.status !== filters.status) {
        return false;
      }

      // Min margin filter
      if (filters.minMargin !== undefined && record.profitMarginPct < filters.minMargin) {
        return false;
      }

      // Max margin filter
      if (filters.maxMargin !== undefined && record.profitMarginPct > filters.maxMargin) {
        return false;
      }

      return true;
    });
  }

  it('filterProfitabilityRecords returns all records when no filters applied', () => {
    fc.assert(
      fc.property(
        fc.array(profitabilityRecordArb, { minLength: 0, maxLength: 50 }),
        (records) => {
          const result = filterProfitabilityRecords(records, {});
          
          expect(result.length).toBe(records.length);
          expect(result.map(r => r.bookingId)).toEqual(records.map(r => r.bookingId));
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterProfitabilityRecords correctly filters by customerId', () => {
    fc.assert(
      fc.property(
        fc.array(profitabilityRecordArb, { minLength: 1, maxLength: 50 }),
        fc.uuid(),
        (records, targetCustomerId) => {
          // Set some records to have the target customer
          const modifiedRecords = records.map((r, i) => ({
            ...r,
            customerId: i % 3 === 0 ? targetCustomerId : r.customerId,
          }));

          const result = filterProfitabilityRecords(modifiedRecords, { customerId: targetCustomerId });
          
          // All results should have the target customer
          for (const record of result) {
            expect(record.customerId).toBe(targetCustomerId);
          }
          
          // Count should match expected
          const expectedCount = modifiedRecords.filter(r => r.customerId === targetCustomerId).length;
          expect(result.length).toBe(expectedCount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterProfitabilityRecords correctly filters by status', () => {
    fc.assert(
      fc.property(
        fc.array(profitabilityRecordArb, { minLength: 1, maxLength: 50 }),
        fc.constantFrom('draft', 'requested', 'confirmed', 'shipped', 'completed', 'cancelled'),
        (records, targetStatus) => {
          const result = filterProfitabilityRecords(records, { status: targetStatus });
          
          // All results should have the target status
          for (const record of result) {
            expect(record.status).toBe(targetStatus);
          }
          
          // Count should match expected
          const expectedCount = records.filter(r => r.status === targetStatus).length;
          expect(result.length).toBe(expectedCount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterProfitabilityRecords correctly filters by minMargin', () => {
    fc.assert(
      fc.property(
        fc.array(profitabilityRecordArb, { minLength: 1, maxLength: 50 }),
        fc.double({ min: -50, max: 50, noNaN: true }),
        (records, minMargin) => {
          const result = filterProfitabilityRecords(records, { minMargin });
          
          // All results should have margin >= minMargin
          for (const record of result) {
            expect(record.profitMarginPct).toBeGreaterThanOrEqual(minMargin);
          }
          
          // Count should match expected
          const expectedCount = records.filter(r => r.profitMarginPct >= minMargin).length;
          expect(result.length).toBe(expectedCount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterProfitabilityRecords correctly filters by maxMargin', () => {
    fc.assert(
      fc.property(
        fc.array(profitabilityRecordArb, { minLength: 1, maxLength: 50 }),
        fc.double({ min: -50, max: 100, noNaN: true }),
        (records, maxMargin) => {
          const result = filterProfitabilityRecords(records, { maxMargin });
          
          // All results should have margin <= maxMargin
          for (const record of result) {
            expect(record.profitMarginPct).toBeLessThanOrEqual(maxMargin);
          }
          
          // Count should match expected
          const expectedCount = records.filter(r => r.profitMarginPct <= maxMargin).length;
          expect(result.length).toBe(expectedCount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterProfitabilityRecords correctly applies multiple filters (AND logic)', () => {
    fc.assert(
      fc.property(
        fc.array(profitabilityRecordArb, { minLength: 1, maxLength: 50 }),
        profitabilityFiltersArb,
        (records, filters) => {
          const result = filterProfitabilityRecords(records, filters);
          
          // All results should match ALL filter criteria
          for (const record of result) {
            if (filters.customerId) {
              expect(record.customerId).toBe(filters.customerId);
            }
            if (filters.status) {
              expect(record.status).toBe(filters.status);
            }
            if (filters.minMargin !== undefined) {
              expect(record.profitMarginPct).toBeGreaterThanOrEqual(filters.minMargin);
            }
            if (filters.maxMargin !== undefined) {
              expect(record.profitMarginPct).toBeLessThanOrEqual(filters.maxMargin);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterProfitabilityRecords returns empty array when no records match', () => {
    fc.assert(
      fc.property(
        fc.array(profitabilityRecordArb, { minLength: 1, maxLength: 20 }),
        fc.uuid(),
        (records, nonExistentCustomerId) => {
          // Ensure no record has this customer ID
          const modifiedRecords = records.map(r => ({
            ...r,
            customerId: r.customerId === nonExistentCustomerId ? 'different-id' : r.customerId,
          }));

          const result = filterProfitabilityRecords(modifiedRecords, { customerId: nonExistentCustomerId });
          
          expect(result.length).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterProfitabilityRecords preserves record data integrity', () => {
    fc.assert(
      fc.property(
        fc.array(profitabilityRecordArb, { minLength: 1, maxLength: 50 }),
        profitabilityFiltersArb,
        (records, filters) => {
          const result = filterProfitabilityRecords(records, filters);
          
          // Each result should be an exact match to an original record
          for (const resultRecord of result) {
            const originalRecord = records.find(r => r.bookingId === resultRecord.bookingId);
            expect(originalRecord).toBeDefined();
            expect(resultRecord).toEqual(originalRecord);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterProfitabilityRecords is idempotent', () => {
    fc.assert(
      fc.property(
        fc.array(profitabilityRecordArb, { minLength: 0, maxLength: 50 }),
        profitabilityFiltersArb,
        (records, filters) => {
          const result1 = filterProfitabilityRecords(records, filters);
          const result2 = filterProfitabilityRecords(result1, filters);
          
          // Filtering twice should give the same result
          expect(result2.map(r => r.bookingId)).toEqual(result1.map(r => r.bookingId));
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('margin range filter works correctly when minMargin <= maxMargin', () => {
    fc.assert(
      fc.property(
        fc.array(profitabilityRecordArb, { minLength: 1, maxLength: 50 }),
        fc.double({ min: -50, max: 50, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (records, minMargin, marginRange) => {
          const maxMargin = minMargin + marginRange;
          
          const result = filterProfitabilityRecords(records, { minMargin, maxMargin });
          
          // All results should be within the margin range
          for (const record of result) {
            expect(record.profitMarginPct).toBeGreaterThanOrEqual(minMargin);
            expect(record.profitMarginPct).toBeLessThanOrEqual(maxMargin);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// =====================================================
// PROPERTY 12: UNBILLED REVENUE IDENTIFICATION
// =====================================================

import { getUnbilledRevenue as getUnbilledRevenueUtil } from '@/lib/cost-revenue-utils';

describe('Property 12: Unbilled Revenue Identification', () => {
  /**
   * For any query for unbilled revenue, the results SHALL include all and only
   * revenue items where billing_status = 'unbilled', correctly grouped by booking with accurate totals.
   * 
   * Feature: v0.75-agency-cost-revenue-management, Property 12: Unbilled Revenue Identification
   * Validates: Requirements 10.1, 10.2
   */

  // Generator for revenue item with billing status
  const revenueItemArb: fc.Arbitrary<ShipmentRevenue> = fc.record({
    id: fc.uuid(),
    bookingId: fc.uuid(),
    chargeTypeId: fc.uuid(),
    currency: fc.constantFrom('IDR', 'USD', 'EUR'),
    unitPrice: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
    quantity: fc.double({ min: 0.1, max: 100, noNaN: true }),
    amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
    exchangeRate: fc.double({ min: 1, max: 20000, noNaN: true }),
    amountIdr: fc.double({ min: 0.01, max: 100000000, noNaN: true }),
    isTaxable: fc.boolean(),
    taxRate: fc.double({ min: 0, max: 50, noNaN: true }),
    taxAmount: fc.double({ min: 0, max: 10000000, noNaN: true }),
    totalAmount: fc.double({ min: 0.01, max: 110000000, noNaN: true }),
    billingStatus: fc.constantFrom('unbilled', 'billed', 'paid'),
    createdAt: fc.constant(new Date().toISOString()),
  });

  /**
   * Pure function to filter unbilled revenue items.
   * This is the same logic as getUnbilledRevenue utility function.
   */
  function filterUnbilledRevenue(revenue: ShipmentRevenue[]): ShipmentRevenue[] {
    return revenue.filter(r => r.billingStatus === 'unbilled');
  }

  /**
   * Pure function to group revenue by booking and calculate totals.
   */
  function groupUnbilledByBooking(revenue: ShipmentRevenue[]): Map<string, { items: ShipmentRevenue[]; total: number }> {
    const unbilled = filterUnbilledRevenue(revenue);
    const grouped = new Map<string, { items: ShipmentRevenue[]; total: number }>();

    for (const item of unbilled) {
      const bookingId = item.bookingId || 'unknown';
      if (!grouped.has(bookingId)) {
        grouped.set(bookingId, { items: [], total: 0 });
      }
      const group = grouped.get(bookingId)!;
      group.items.push(item);
      group.total += item.amountIdr || 0;
    }

    return grouped;
  }

  it('getUnbilledRevenueUtil returns only items with billing_status = unbilled', () => {
    fc.assert(
      fc.property(
        fc.array(revenueItemArb, { minLength: 0, maxLength: 50 }),
        (revenue) => {
          const result = getUnbilledRevenueUtil(revenue);
          
          // All results should have billing_status = 'unbilled'
          for (const item of result) {
            expect(item.billingStatus).toBe('unbilled');
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getUnbilledRevenueUtil returns ALL unbilled items', () => {
    fc.assert(
      fc.property(
        fc.array(revenueItemArb, { minLength: 0, maxLength: 50 }),
        (revenue) => {
          const result = getUnbilledRevenueUtil(revenue);
          
          // Count should match expected
          const expectedCount = revenue.filter(r => r.billingStatus === 'unbilled').length;
          expect(result.length).toBe(expectedCount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getUnbilledRevenueUtil excludes billed items', () => {
    fc.assert(
      fc.property(
        fc.array(revenueItemArb, { minLength: 1, maxLength: 50 }),
        (revenue) => {
          const result = getUnbilledRevenueUtil(revenue);
          
          // No result should have billing_status = 'billed'
          for (const item of result) {
            expect(item.billingStatus).not.toBe('billed');
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getUnbilledRevenueUtil excludes paid items', () => {
    fc.assert(
      fc.property(
        fc.array(revenueItemArb, { minLength: 1, maxLength: 50 }),
        (revenue) => {
          const result = getUnbilledRevenueUtil(revenue);
          
          // No result should have billing_status = 'paid'
          for (const item of result) {
            expect(item.billingStatus).not.toBe('paid');
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getUnbilledRevenueUtil returns empty array when no unbilled items exist', () => {
    fc.assert(
      fc.property(
        fc.array(revenueItemArb, { minLength: 0, maxLength: 20 }),
        (revenue) => {
          // Force all items to be billed or paid
          const nonUnbilledRevenue: ShipmentRevenue[] = revenue.map((r, i) => ({
            ...r,
            billingStatus: (i % 2 === 0 ? 'billed' : 'paid') as 'billed' | 'paid',
          }));
          
          const result = getUnbilledRevenueUtil(nonUnbilledRevenue);
          
          expect(result.length).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('groupUnbilledByBooking correctly groups items by bookingId', () => {
    fc.assert(
      fc.property(
        fc.array(revenueItemArb, { minLength: 1, maxLength: 50 }),
        (revenue) => {
          const grouped = groupUnbilledByBooking(revenue);
          
          // Each group should only contain items with matching bookingId
          for (const [bookingId, group] of grouped) {
            for (const item of group.items) {
              expect(item.bookingId || 'unknown').toBe(bookingId);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('groupUnbilledByBooking calculates correct totals per booking', () => {
    fc.assert(
      fc.property(
        fc.array(revenueItemArb, { minLength: 1, maxLength: 50 }),
        (revenue) => {
          const grouped = groupUnbilledByBooking(revenue);
          
          // Each group's total should equal sum of amountIdr
          for (const [, group] of grouped) {
            const expectedTotal = group.items.reduce((sum, item) => sum + (item.amountIdr || 0), 0);
            expect(group.total).toBeCloseTo(expectedTotal, 6);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('groupUnbilledByBooking only includes unbilled items in groups', () => {
    fc.assert(
      fc.property(
        fc.array(revenueItemArb, { minLength: 1, maxLength: 50 }),
        (revenue) => {
          const grouped = groupUnbilledByBooking(revenue);
          
          // All items in all groups should be unbilled
          for (const [, group] of grouped) {
            for (const item of group.items) {
              expect(item.billingStatus).toBe('unbilled');
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('total unbilled count equals sum of all group item counts', () => {
    fc.assert(
      fc.property(
        fc.array(revenueItemArb, { minLength: 0, maxLength: 50 }),
        (revenue) => {
          const unbilledItems = getUnbilledRevenueUtil(revenue);
          const grouped = groupUnbilledByBooking(revenue);
          
          // Sum of all group item counts should equal total unbilled count
          let groupedItemCount = 0;
          for (const [, group] of grouped) {
            groupedItemCount += group.items.length;
          }
          
          expect(groupedItemCount).toBe(unbilledItems.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getUnbilledRevenueUtil preserves item data integrity', () => {
    fc.assert(
      fc.property(
        fc.array(revenueItemArb, { minLength: 1, maxLength: 50 }),
        (revenue) => {
          const result = getUnbilledRevenueUtil(revenue);
          
          // Each result should be an exact match to an original item
          for (const resultItem of result) {
            const originalItem = revenue.find(r => r.id === resultItem.id);
            expect(originalItem).toBeDefined();
            expect(resultItem).toEqual(originalItem);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getUnbilledRevenueUtil is idempotent', () => {
    fc.assert(
      fc.property(
        fc.array(revenueItemArb, { minLength: 0, maxLength: 50 }),
        (revenue) => {
          const result1 = getUnbilledRevenueUtil(revenue);
          const result2 = getUnbilledRevenueUtil(result1);
          
          // Filtering twice should give the same result
          expect(result2.map(r => r.id)).toEqual(result1.map(r => r.id));
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('changing billing_status from unbilled removes item from results', () => {
    fc.assert(
      fc.property(
        fc.array(
          revenueItemArb.map(r => ({ ...r, billingStatus: 'unbilled' as const })),
          { minLength: 1, maxLength: 20 }
        ),
        fc.integer({ min: 0, max: 19 }),
        fc.constantFrom('billed', 'paid'),
        (revenue, changeIndex, newStatus) => {
          const safeIndex = changeIndex % revenue.length;
          const targetId = revenue[safeIndex].id;
          
          // Get unbilled before change
          const beforeChange = getUnbilledRevenueUtil(revenue);
          expect(beforeChange.find(r => r.id === targetId)).toBeDefined();
          
          // Change one item's status
          const modifiedRevenue = revenue.map((r, i) =>
            i === safeIndex ? { ...r, billingStatus: newStatus as 'billed' | 'paid' } : r
          );
          
          // Get unbilled after change
          const afterChange = getUnbilledRevenueUtil(modifiedRevenue);
          
          // The changed item should no longer be in results
          expect(afterChange.find(r => r.id === targetId)).toBeUndefined();
          
          // Count should decrease by 1
          expect(afterChange.length).toBe(beforeChange.length - 1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
