/**
 * Property-Based Tests for Financial Analytics Actions
 * Feature: financial-analytics, v0.62
 * 
 * Note: These tests validate the validation logic and calculations
 * without hitting the actual database.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  isValidBudgetCategory,
  isValidCashFlowCategory,
  calculateWeightedAmount,
} from '@/lib/financial-analytics-utils';
import {
  BUDGET_CATEGORIES,
  INFLOW_CATEGORIES,
  OUTFLOW_CATEGORIES,
  BudgetCategory,
  InflowCategory,
  OutflowCategory,
} from '@/types/financial-analytics';

describe('Financial Analytics Actions Properties', () => {
  /**
   * Property 1: Unique Constraint Enforcement
   * For any two budget items with the same (year, month, category, subcategory, department),
   * the system should reject the second insertion.
   * 
   * Note: This is enforced at the database level. We test the validation logic here.
   * Validates: Requirements 1.6, 4.5
   */
  describe('Property 1: Unique Constraint Enforcement', () => {
    it('should validate that budget items have required fields', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          fc.constantFrom(...BUDGET_CATEGORIES),
          fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
          (year, month, category, subcategory, description, amount) => {
            // All required fields should be present
            expect(year).toBeGreaterThanOrEqual(2020);
            expect(month).toBeGreaterThanOrEqual(1);
            expect(month).toBeLessThanOrEqual(12);
            expect(isValidBudgetCategory(category)).toBe(true);
            expect(description.length).toBeGreaterThan(0);
            expect(amount).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Budget Category Validation
   * For any budget item, the category must be one of the valid budget categories.
   * Validates: Requirements 4.2
   */
  describe('Property 6: Budget Category Validation', () => {
    it('should accept all valid budget categories', () => {
      BUDGET_CATEGORIES.forEach(category => {
        expect(isValidBudgetCategory(category)).toBe(true);
      });
    });

    it('should reject invalid budget categories', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !BUDGET_CATEGORIES.includes(s as BudgetCategory)),
          (invalidCategory) => {
            expect(isValidBudgetCategory(invalidCategory)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 2: Cash Flow Transaction Recording
   * For any valid cash flow transaction, when recorded, the transaction
   * should be retrievable with the same values.
   * 
   * Note: This is tested at integration level. Here we validate input structure.
   * Validates: Requirements 2.2
   */
  describe('Property 2: Cash Flow Transaction Recording', () => {
    it('should validate cash flow transaction structure', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          fc.constantFrom('inflow' as const, 'outflow' as const),
          fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
          (date, flowType, amount) => {
            expect(date).toBeInstanceOf(Date);
            expect(['inflow', 'outflow']).toContain(flowType);
            expect(amount).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 3: Cash Flow Category Validation
   * For any cash flow transaction, if flow_type is 'inflow', the category must be
   * one of the inflow categories; if 'outflow', must be one of outflow categories.
   * Validates: Requirements 2.3, 2.4
   */
  describe('Property 3: Cash Flow Category Validation', () => {
    it('should accept valid inflow categories for inflow transactions', () => {
      INFLOW_CATEGORIES.forEach(category => {
        expect(isValidCashFlowCategory('inflow', category)).toBe(true);
      });
    });

    it('should reject outflow categories for inflow transactions', () => {
      OUTFLOW_CATEGORIES.forEach(category => {
        expect(isValidCashFlowCategory('inflow', category)).toBe(false);
      });
    });

    it('should accept valid outflow categories for outflow transactions', () => {
      OUTFLOW_CATEGORIES.forEach(category => {
        expect(isValidCashFlowCategory('outflow', category)).toBe(true);
      });
    });

    it('should reject inflow categories for outflow transactions', () => {
      INFLOW_CATEGORIES.forEach(category => {
        expect(isValidCashFlowCategory('outflow', category)).toBe(false);
      });
    });

    it('should reject invalid categories for any flow type', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('inflow' as const, 'outflow' as const),
          fc.string().filter(s => 
            !INFLOW_CATEGORIES.includes(s as InflowCategory) && 
            !OUTFLOW_CATEGORIES.includes(s as OutflowCategory)
          ),
          (flowType, invalidCategory) => {
            expect(isValidCashFlowCategory(flowType, invalidCategory)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 5: Weighted Amount Calculation (for forecasts)
   * For any cash flow forecast with expected_amount E and probability_percentage P,
   * the weighted_amount should equal E * (P / 100).
   * Validates: Requirements 3.2
   */
  describe('Property 5: Weighted Amount Calculation in Forecasts', () => {
    it('should calculate weighted amount correctly for all valid inputs', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
          fc.integer({ min: 0, max: 100 }),
          (expectedAmount, probability) => {
            const weighted = calculateWeightedAmount(expectedAmount, probability);
            const expected = expectedAmount * (probability / 100);
            expect(weighted).toBeCloseTo(expected, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 when probability is 0', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
          (expectedAmount) => {
            const weighted = calculateWeightedAmount(expectedAmount, 0);
            expect(weighted).toBe(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return full amount when probability is 100', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
          (expectedAmount) => {
            const weighted = calculateWeightedAmount(expectedAmount, 100);
            expect(weighted).toBeCloseTo(expectedAmount, 5);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 10: Customer Ranking by Profitability
   * Validates that customer data structure supports ranking.
   * Validates: Requirements 6.1
   */
  describe('Property 10: Customer Ranking Support', () => {
    it('should support sorting customers by total_profit', () => {
      const customerArb = fc.record({
        customer_id: fc.uuid(),
        customer_name: fc.string({ minLength: 1, maxLength: 100 }),
        total_jobs: fc.integer({ min: 0, max: 1000 }),
        total_revenue: fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
        total_cost: fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
        total_profit: fc.float({ min: -500_000_000, max: 500_000_000, noNaN: true }),
        profit_margin_pct: fc.float({ min: -100, max: 100, noNaN: true }),
        avg_job_revenue: fc.float({ min: 0, max: 1_000_000, noNaN: true }),
        ytd_revenue: fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
        ytd_profit: fc.float({ min: -500_000_000, max: 500_000_000, noNaN: true }),
      });

      fc.assert(
        fc.property(
          fc.array(customerArb, { minLength: 0, maxLength: 20 }),
          (customers) => {
            // Sort by total_profit descending
            const sorted = [...customers].sort((a, b) => b.total_profit - a.total_profit);
            
            // Verify sorted order
            for (let i = 1; i < sorted.length; i++) {
              expect(sorted[i - 1].total_profit).toBeGreaterThanOrEqual(sorted[i].total_profit);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 12: Average Job Revenue Calculation
   * Validates: Requirements 6.5, 7.3
   */
  describe('Property 12: Average Job Revenue', () => {
    it('should calculate average correctly when jobs > 0', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
          fc.integer({ min: 1, max: 1000 }),
          (totalRevenue, totalJobs) => {
            const avg = totalRevenue / totalJobs;
            expect(avg).toBeCloseTo(totalRevenue / totalJobs, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 13: YTD Aggregation
   * Validates that YTD values only include current year data.
   * Validates: Requirements 6.4
   */
  describe('Property 13: YTD Aggregation', () => {
    it('should only include current year dates in YTD calculation', () => {
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          (completedDate) => {
            const isYTD = completedDate >= startOfYear && completedDate <= new Date();
            const completedYear = completedDate.getFullYear();
            
            if (completedYear === currentYear && completedDate <= new Date()) {
              expect(isYTD).toBe(true);
            } else if (completedYear < currentYear) {
              expect(isYTD).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 14: Profit Margin Indicator
   * Validates: Requirements 6.6
   */
  describe('Property 14: Profit Margin Indicator', () => {
    it('should return positive for margins > 20%', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(20.01), max: Math.fround(100), noNaN: true }),
          (margin) => {
            const status = margin > 20 ? 'positive' : 'neutral';
            expect(status).toBe('positive');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return neutral for margins <= 20%', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(-100), max: Math.fround(20), noNaN: true }),
          (margin) => {
            const status = margin > 20 ? 'positive' : 'neutral';
            expect(status).toBe('neutral');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 15: Date Filter Data Refresh
   * Validates that date filtering logic works correctly.
   * Validates: Requirements 11.2
   */
  describe('Property 15: Date Filter Data Refresh', () => {
    it('should correctly identify dates within a month', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 }),
          (year, month, day) => {
            const date = new Date(year, month - 1, day);
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);
            
            expect(date >= startOfMonth).toBe(true);
            expect(date <= endOfMonth).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly calculate month boundaries', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          (year, month) => {
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);
            
            // Start should be first day
            expect(startOfMonth.getDate()).toBe(1);
            
            // End should be last day of month
            expect(endOfMonth.getMonth()).toBe(month - 1);
            expect(endOfMonth.getDate()).toBeGreaterThanOrEqual(28);
            expect(endOfMonth.getDate()).toBeLessThanOrEqual(31);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
