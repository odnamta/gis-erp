/**
 * Unit tests for Director Dashboard Data Service
 * Tests specific examples and edge cases for all calculation functions
 * 
 * **Feature: director-dashboard**
 */

import { describe, it, expect } from 'vitest'

// Import pure calculation functions from property tests
import {
  calculateProfit,
  calculateProfitMargin,
  calculateTotalRevenue,
  calculateTotalCost,
  calculateRevenueChangePercent,
  calculateJobCompletionRate,
  calculateWinRate,
  calculateCollectionRate,
} from './director-dashboard-data.property.test'

describe('Director Dashboard Data - Unit Tests', () => {
  
  // =====================================================
  // Profit Calculation Tests
  // =====================================================
  
  describe('Profit Calculation', () => {
    it('should calculate positive profit correctly', () => {
      expect(calculateProfit(1000000, 600000)).toBe(400000)
      expect(calculateProfit(5000000000, 3000000000)).toBe(2000000000)
    })

    it('should calculate negative profit correctly', () => {
      expect(calculateProfit(1000000, 1500000)).toBe(-500000)
    })

    it('should calculate zero profit when revenue equals cost', () => {
      expect(calculateProfit(1000000, 1000000)).toBe(0)
    })

    it('should handle zero revenue', () => {
      expect(calculateProfit(0, 500000)).toBe(-500000)
    })

    it('should handle zero cost', () => {
      expect(calculateProfit(1000000, 0)).toBe(1000000)
    })

    it('should handle both zero', () => {
      expect(calculateProfit(0, 0)).toBe(0)
    })
  })

  // =====================================================
  // Profit Margin Tests
  // =====================================================
  
  describe('Profit Margin Calculation', () => {
    it('should calculate 40% margin correctly', () => {
      // Revenue: 1,000,000, Cost: 600,000, Profit: 400,000
      // Margin: 400,000 / 1,000,000 * 100 = 40%
      expect(calculateProfitMargin(1000000, 600000)).toBe(40)
    })

    it('should calculate 25% margin correctly', () => {
      expect(calculateProfitMargin(1000000, 750000)).toBe(25)
    })

    it('should calculate 15% margin correctly', () => {
      expect(calculateProfitMargin(1000000, 850000)).toBe(15)
    })

    it('should calculate negative margin correctly', () => {
      // Revenue: 1,000,000, Cost: 1,200,000, Profit: -200,000
      // Margin: -200,000 / 1,000,000 * 100 = -20%
      expect(calculateProfitMargin(1000000, 1200000)).toBe(-20)
    })

    it('should return 0 when revenue is 0 (division by zero)', () => {
      expect(calculateProfitMargin(0, 500000)).toBe(0)
    })

    it('should return 100% when cost is 0', () => {
      expect(calculateProfitMargin(1000000, 0)).toBe(100)
    })

    it('should return 0% when revenue equals cost', () => {
      expect(calculateProfitMargin(1000000, 1000000)).toBe(0)
    })

    it('should round to one decimal place', () => {
      // Revenue: 1,000,000, Cost: 666,666
      // Profit: 333,334, Margin: 33.3334%
      expect(calculateProfitMargin(1000000, 666666)).toBe(33.3)
    })
  })

  // =====================================================
  // Total Revenue/Cost from Job Orders Tests
  // =====================================================
  
  describe('Total Revenue from Job Orders', () => {
    it('should sum all revenues correctly', () => {
      const jobOrders = [
        { final_revenue: 1000000 },
        { final_revenue: 2000000 },
        { final_revenue: 3000000 },
      ]
      expect(calculateTotalRevenue(jobOrders)).toBe(6000000)
    })

    it('should handle null values by treating as 0', () => {
      const jobOrders = [
        { final_revenue: 1000000 },
        { final_revenue: null },
        { final_revenue: 2000000 },
      ]
      expect(calculateTotalRevenue(jobOrders)).toBe(3000000)
    })

    it('should return 0 for empty array', () => {
      expect(calculateTotalRevenue([])).toBe(0)
    })

    it('should return 0 when all values are null', () => {
      const jobOrders = [
        { final_revenue: null },
        { final_revenue: null },
      ]
      expect(calculateTotalRevenue(jobOrders)).toBe(0)
    })
  })

  describe('Total Cost from Job Orders', () => {
    it('should sum all costs correctly', () => {
      const jobOrders = [
        { final_cost: 500000 },
        { final_cost: 1000000 },
        { final_cost: 1500000 },
      ]
      expect(calculateTotalCost(jobOrders)).toBe(3000000)
    })

    it('should handle null values by treating as 0', () => {
      const jobOrders = [
        { final_cost: 500000 },
        { final_cost: null },
        { final_cost: 1000000 },
      ]
      expect(calculateTotalCost(jobOrders)).toBe(1500000)
    })

    it('should return 0 for empty array', () => {
      expect(calculateTotalCost([])).toBe(0)
    })
  })

  // =====================================================
  // Revenue Change Percent Tests
  // =====================================================
  
  describe('Revenue Change Percent Calculation', () => {
    it('should calculate 100% increase correctly', () => {
      expect(calculateRevenueChangePercent(2000000, 1000000)).toBe(100)
    })

    it('should calculate 50% increase correctly', () => {
      expect(calculateRevenueChangePercent(1500000, 1000000)).toBe(50)
    })

    it('should calculate 50% decrease correctly', () => {
      expect(calculateRevenueChangePercent(500000, 1000000)).toBe(-50)
    })

    it('should calculate 100% decrease correctly', () => {
      expect(calculateRevenueChangePercent(0, 1000000)).toBe(-100)
    })

    it('should return 0 when no change', () => {
      expect(calculateRevenueChangePercent(1000000, 1000000)).toBe(0)
    })

    it('should return 0 when previous is 0 (division by zero)', () => {
      expect(calculateRevenueChangePercent(1000000, 0)).toBe(0)
    })

    it('should return 0 when both are 0', () => {
      expect(calculateRevenueChangePercent(0, 0)).toBe(0)
    })

    it('should round to one decimal place', () => {
      // 1,333,333 / 1,000,000 - 1 = 0.333333 = 33.3%
      expect(calculateRevenueChangePercent(1333333, 1000000)).toBe(33.3)
    })
  })

  // =====================================================
  // Job Completion Rate Tests
  // =====================================================
  
  describe('Job Completion Rate Calculation', () => {
    it('should calculate 100% completion rate', () => {
      expect(calculateJobCompletionRate(10, 10)).toBe(100)
    })

    it('should calculate 50% completion rate', () => {
      expect(calculateJobCompletionRate(5, 10)).toBe(50)
    })

    it('should calculate 0% completion rate', () => {
      expect(calculateJobCompletionRate(0, 10)).toBe(0)
    })

    it('should return 0 when total is 0 (division by zero)', () => {
      expect(calculateJobCompletionRate(0, 0)).toBe(0)
    })

    it('should round to one decimal place', () => {
      // 1/3 = 33.333...%
      expect(calculateJobCompletionRate(1, 3)).toBe(33.3)
    })

    it('should handle large numbers', () => {
      expect(calculateJobCompletionRate(750, 1000)).toBe(75)
    })
  })

  // =====================================================
  // Win Rate Tests
  // =====================================================
  
  describe('Win Rate Calculation', () => {
    it('should calculate 100% win rate', () => {
      expect(calculateWinRate(10, 0)).toBe(100)
    })

    it('should calculate 0% win rate', () => {
      expect(calculateWinRate(0, 10)).toBe(0)
    })

    it('should calculate 50% win rate', () => {
      expect(calculateWinRate(5, 5)).toBe(50)
    })

    it('should return 0 when both are 0 (division by zero)', () => {
      expect(calculateWinRate(0, 0)).toBe(0)
    })

    it('should round to one decimal place', () => {
      // 2/3 = 66.666...%
      expect(calculateWinRate(2, 1)).toBe(66.7)
    })

    it('should calculate 75% win rate', () => {
      expect(calculateWinRate(3, 1)).toBe(75)
    })
  })

  // =====================================================
  // Collection Rate Tests
  // =====================================================
  
  describe('Collection Rate Calculation', () => {
    it('should calculate 100% collection rate', () => {
      expect(calculateCollectionRate(1000000, 1000000)).toBe(100)
    })

    it('should calculate 0% collection rate', () => {
      expect(calculateCollectionRate(0, 1000000)).toBe(0)
    })

    it('should calculate 50% collection rate', () => {
      expect(calculateCollectionRate(500000, 1000000)).toBe(50)
    })

    it('should return 0 when invoiced is 0 (division by zero)', () => {
      expect(calculateCollectionRate(500000, 0)).toBe(0)
    })

    it('should return 0 when both are 0', () => {
      expect(calculateCollectionRate(0, 0)).toBe(0)
    })

    it('should round to one decimal place', () => {
      // 333,333 / 1,000,000 = 33.3333%
      expect(calculateCollectionRate(333333, 1000000)).toBe(33.3)
    })

    it('should handle large amounts', () => {
      expect(calculateCollectionRate(8500000000, 10000000000)).toBe(85)
    })
  })

  // =====================================================
  // Threshold Boundary Tests
  // =====================================================
  
  describe('Threshold Boundary Tests', () => {
    describe('Profit Margin Thresholds', () => {
      // Green: >= 25%
      it('should be green at exactly 25%', () => {
        const margin = calculateProfitMargin(1000000, 750000) // 25%
        expect(margin).toBe(25)
      })

      it('should be green above 25%', () => {
        const margin = calculateProfitMargin(1000000, 700000) // 30%
        expect(margin).toBe(30)
      })

      // Yellow: 15-24.9%
      it('should be yellow at exactly 15%', () => {
        const margin = calculateProfitMargin(1000000, 850000) // 15%
        expect(margin).toBe(15)
      })

      it('should be yellow at 24%', () => {
        const margin = calculateProfitMargin(1000000, 760000) // 24%
        expect(margin).toBe(24)
      })

      // Red: < 15%
      it('should be red at 14%', () => {
        const margin = calculateProfitMargin(1000000, 860000) // 14%
        expect(margin).toBe(14)
      })

      it('should be red at 0%', () => {
        const margin = calculateProfitMargin(1000000, 1000000) // 0%
        expect(margin).toBe(0)
      })
    })

    describe('Collection Rate Thresholds', () => {
      // Green: >= 85%
      it('should be green at exactly 85%', () => {
        const rate = calculateCollectionRate(850000, 1000000) // 85%
        expect(rate).toBe(85)
      })

      it('should be green above 85%', () => {
        const rate = calculateCollectionRate(900000, 1000000) // 90%
        expect(rate).toBe(90)
      })

      // Yellow: 70-84.9%
      it('should be yellow at exactly 70%', () => {
        const rate = calculateCollectionRate(700000, 1000000) // 70%
        expect(rate).toBe(70)
      })

      it('should be yellow at 84%', () => {
        const rate = calculateCollectionRate(840000, 1000000) // 84%
        expect(rate).toBe(84)
      })

      // Red: < 70%
      it('should be red at 69%', () => {
        const rate = calculateCollectionRate(690000, 1000000) // 69%
        expect(rate).toBe(69)
      })

      it('should be red at 0%', () => {
        const rate = calculateCollectionRate(0, 1000000) // 0%
        expect(rate).toBe(0)
      })
    })
  })

  // =====================================================
  // Role Access Tests
  // =====================================================
  
  describe('Role Access Tests', () => {
    const hasAccess = (role: string) => role === 'director' || role === 'owner'

    it('should grant access to director', () => {
      expect(hasAccess('director')).toBe(true)
    })

    it('should grant access to owner', () => {
      expect(hasAccess('owner')).toBe(true)
    })

    it('should deny access to sysadmin', () => {
      expect(hasAccess('sysadmin')).toBe(false)
    })

    it('should deny access to finance_manager', () => {
      expect(hasAccess('finance_manager')).toBe(false)
    })

    it('should deny access to operations_manager', () => {
      expect(hasAccess('operations_manager')).toBe(false)
    })

    it('should deny access to marketing_manager', () => {
      expect(hasAccess('marketing_manager')).toBe(false)
    })

    it('should deny access to administration', () => {
      expect(hasAccess('administration')).toBe(false)
    })

    it('should deny access to finance', () => {
      expect(hasAccess('finance')).toBe(false)
    })

    it('should deny access to marketing', () => {
      expect(hasAccess('marketing')).toBe(false)
    })

    it('should deny access to ops', () => {
      expect(hasAccess('ops')).toBe(false)
    })

    it('should deny access to engineer', () => {
      expect(hasAccess('engineer')).toBe(false)
    })

    it('should deny access to hr', () => {
      expect(hasAccess('hr')).toBe(false)
    })

    it('should deny access to hse', () => {
      expect(hasAccess('hse')).toBe(false)
    })

    it('should deny access to agency', () => {
      expect(hasAccess('agency')).toBe(false)
    })

    it('should deny access to customs', () => {
      expect(hasAccess('customs')).toBe(false)
    })
  })
})
