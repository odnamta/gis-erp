/**
 * Property-Based Tests for Financial Analytics Utility Functions
 * Feature: financial-analytics, v0.62
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateVariance,
  calculateWeightedAmount,
  calculateProfitMargin,
  getVarianceStatus,
  calculateNetCashFlow,
  calculateGrossProfit,
  isValidBudgetCategory,
  isValidCashFlowCategory,
  getProfitMarginStatus,
  calculateAverageJobRevenue,
  sortCustomersByProfitability,
} from '@/lib/financial-analytics-utils';
import {
  BUDGET_CATEGORIES,
  INFLOW_CATEGORIES,
  OUTFLOW_CATEGORIES,
  CashFlowTransaction,
} from '@/types/financial-analytics';

describe('Financial Analytics Properties', () => {
  /**
   * Property 7: Variance Calculation
   * For any budget amount B and actual amount A, the variance should equal (B - A)
   * and the variance percentage should equal ((B - A) / B) * 100 when B is non-zero.
   * Validates: Requirements 5.2, 5.3
   */
  it('Property 7: Variance Calculation', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
        fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
        (budget, actual) => {
          const result = calculateVariance(budget, actual);
          
          // Variance should equal budget - actual
          expect(result.variance).toBeCloseTo(budget - actual, 5);
          
          // Variance percentage calculation
          if (budget !== 0) {
            const expectedPct = ((budget - actual) / budget) * 100;
            expect(result.variance_pct).toBeCloseTo(expectedPct, 5);
          } else {
            expect(result.variance_pct).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Weighted Amount Calculation
   * For any cash flow forecast with expected_amount E and probability_percentage P,
   * the weighted_amount should equal E * (P / 100).
   * Validates: Requirements 3.2
   */
  it('Property 5: Weighted Amount Calculation', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
        fc.integer({ min: 0, max: 100 }),
        (expectedAmount, probability) => {
          const result = calculateWeightedAmount(expectedAmount, probability);
          const expected = expectedAmount * (probability / 100);
          expect(result).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: Profit Margin Calculation
   * For any entity with revenue R and cost C, the profit margin percentage
   * should equal ((R - C) / R) * 100 when R is non-zero, and 0 when R is zero.
   * Validates: Requirements 6.3
   */
  it('Property 11: Profit Margin Calculation', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
        fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
        (revenue, cost) => {
          const result = calculateProfitMargin(revenue, cost);
          
          if (revenue === 0) {
            expect(result).toBe(0);
          } else {
            const expected = ((revenue - cost) / revenue) * 100;
            expect(result).toBeCloseTo(expected, 5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * Property 8: Variance Status Determination
   * For cost categories: if actual < budget (positive variance), status is 'favorable'
   * For revenue category: if actual > budget (negative variance), status is 'favorable'
   * Validates: Requirements 5.4, 5.5
   */
  it('Property 8: Variance Status Determination - Cost Categories', () => {
    const costCategories = BUDGET_CATEGORIES.filter(c => c !== 'revenue');
    
    fc.assert(
      fc.property(
        fc.constantFrom(...costCategories),
        fc.float({ min: -100, max: 100, noNaN: true }),
        (category, variancePct) => {
          const status = getVarianceStatus(category, variancePct);
          
          // For costs: positive variance (actual < budget) is favorable
          if (variancePct < -10) {
            expect(status).toBe('warning');
          } else if (variancePct < 0) {
            expect(status).toBe('unfavorable');
          } else {
            expect(status).toBe('favorable');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: Variance Status Determination - Revenue Category', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -100, max: 100, noNaN: true }),
        (variancePct) => {
          const status = getVarianceStatus('revenue', variancePct);
          
          // For revenue: positive variance (actual < budget) is unfavorable
          if (variancePct > 10) {
            expect(status).toBe('warning');
          } else if (variancePct > 0) {
            expect(status).toBe('unfavorable');
          } else {
            expect(status).toBe('favorable');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Net Cash Flow Calculation
   * For any set of cash flow transactions, the net cash flow should equal
   * the sum of all inflow amounts minus the sum of all outflow amounts.
   * Validates: Requirements 2.5
   */
  it('Property 4: Net Cash Flow Calculation', () => {
    const transactionArb = fc.record({
      id: fc.uuid(),
      transaction_date: fc.date().map(d => d.toISOString().split('T')[0]),
      flow_type: fc.constantFrom('inflow' as const, 'outflow' as const),
      category: fc.constantFrom('customer_payment', 'vendor_payment'),
      description: fc.constant(null),
      amount: fc.float({ min: 0, max: 1_000_000, noNaN: true }),
      invoice_id: fc.constant(null),
      bkk_id: fc.constant(null),
      bkm_id: fc.constant(null),
      bank_account: fc.constant(null),
      created_at: fc.date().map(d => d.toISOString()),
    }) as fc.Arbitrary<CashFlowTransaction>;

    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 0, maxLength: 50 }),
        (transactions) => {
          const result = calculateNetCashFlow(transactions);
          
          const expectedInflows = transactions
            .filter(t => t.flow_type === 'inflow')
            .reduce((sum, t) => sum + t.amount, 0);
          
          const expectedOutflows = transactions
            .filter(t => t.flow_type === 'outflow')
            .reduce((sum, t) => sum + t.amount, 0);
          
          expect(result).toBeCloseTo(expectedInflows - expectedOutflows, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: Gross Profit Calculation
   * For any set of revenue R and direct costs C, gross profit should equal (R - C)
   * and gross margin percentage should equal ((R - C) / R) * 100 when R is non-zero.
   * Validates: Requirements 5.7
   */
  it('Property 9: Gross Profit Calculation', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
        fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
        (revenue, directCost) => {
          const result = calculateGrossProfit(revenue, directCost);
          
          expect(result.grossProfit).toBeCloseTo(revenue - directCost, 5);
          
          if (revenue !== 0) {
            const expectedMargin = ((revenue - directCost) / revenue) * 100;
            expect(result.grossMarginPct).toBeCloseTo(expectedMargin, 5);
          } else {
            expect(result.grossMarginPct).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: Budget Category Validation
   * For any budget item, the category must be one of the valid budget categories.
   * Validates: Requirements 4.2
   */
  it('Property 6: Budget Category Validation', () => {
    // Valid categories should pass
    BUDGET_CATEGORIES.forEach(category => {
      expect(isValidBudgetCategory(category)).toBe(true);
    });

    // Invalid categories should fail
    fc.assert(
      fc.property(
        fc.string().filter(s => !BUDGET_CATEGORIES.includes(s as any)),
        (invalidCategory) => {
          expect(isValidBudgetCategory(invalidCategory)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 3: Cash Flow Category Validation
   * For any cash flow transaction, if flow_type is 'inflow', the category must be
   * one of the inflow categories; if 'outflow', must be one of outflow categories.
   * Validates: Requirements 2.3, 2.4
   */
  it('Property 3: Cash Flow Category Validation - Inflow', () => {
    // Valid inflow categories should pass
    INFLOW_CATEGORIES.forEach(category => {
      expect(isValidCashFlowCategory('inflow', category)).toBe(true);
    });

    // Outflow categories should fail for inflow
    OUTFLOW_CATEGORIES.forEach(category => {
      expect(isValidCashFlowCategory('inflow', category)).toBe(false);
    });
  });

  it('Property 3: Cash Flow Category Validation - Outflow', () => {
    // Valid outflow categories should pass
    OUTFLOW_CATEGORIES.forEach(category => {
      expect(isValidCashFlowCategory('outflow', category)).toBe(true);
    });

    // Inflow categories should fail for outflow
    INFLOW_CATEGORIES.forEach(category => {
      expect(isValidCashFlowCategory('outflow', category)).toBe(false);
    });
  });

  /**
   * Property 14: Profit Margin Indicator
   * For any profit margin percentage M, if M > 20, the status should be 'positive';
   * otherwise 'neutral'.
   * Validates: Requirements 6.6
   */
  it('Property 14: Profit Margin Indicator', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -100, max: 100, noNaN: true }),
        (marginPct) => {
          const status = getProfitMarginStatus(marginPct);
          
          if (marginPct > 20) {
            expect(status).toBe('positive');
          } else {
            expect(status).toBe('neutral');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: Average Job Revenue Calculation
   * For any entity with total_revenue R and total_jobs J, the average job revenue
   * should equal R / J when J is non-zero.
   * Validates: Requirements 6.5, 7.3
   */
  it('Property 12: Average Job Revenue Calculation', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
        fc.integer({ min: 0, max: 1000 }),
        (totalRevenue, totalJobs) => {
          const result = calculateAverageJobRevenue(totalRevenue, totalJobs);
          
          if (totalJobs === 0) {
            expect(result).toBe(0);
          } else {
            expect(result).toBeCloseTo(totalRevenue / totalJobs, 5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: Customer Ranking by Profitability
   * For any list of customers with profitability data, the list should be sorted
   * in descending order by total_profit.
   * Validates: Requirements 6.1
   */
  it('Property 10: Customer Ranking by Profitability', () => {
    const customerArb = fc.record({
      customer_id: fc.uuid(),
      customer_name: fc.string(),
      total_jobs: fc.integer({ min: 0, max: 100 }),
      total_revenue: fc.float({ min: 0, max: 1_000_000, noNaN: true }),
      total_cost: fc.float({ min: 0, max: 1_000_000, noNaN: true }),
      total_profit: fc.float({ min: -500_000, max: 500_000, noNaN: true }),
      profit_margin_pct: fc.float({ min: -100, max: 100, noNaN: true }),
      avg_job_revenue: fc.float({ min: 0, max: 100_000, noNaN: true }),
      ytd_revenue: fc.float({ min: 0, max: 1_000_000, noNaN: true }),
      ytd_profit: fc.float({ min: -500_000, max: 500_000, noNaN: true }),
    });

    fc.assert(
      fc.property(
        fc.array(customerArb, { minLength: 0, maxLength: 20 }),
        (customers) => {
          const sorted = sortCustomersByProfitability(customers);
          
          // Verify sorted in descending order by total_profit
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i - 1].total_profit).toBeGreaterThanOrEqual(sorted[i].total_profit);
          }
          
          // Verify same length (no items lost)
          expect(sorted.length).toBe(customers.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
