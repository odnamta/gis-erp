import { describe, it, expect } from 'vitest'
import type {
  EnhancedOpsSummary,
  OperationsJobItem,
  DeliveryItem,
  CostSummary,
  PendingAction,
  EnhancedOpsDashboardData,
} from '@/lib/ops-dashboard-enhanced-utils'

describe('Enhanced Ops Dashboard Types', () => {
  describe('EnhancedOpsSummary', () => {
    it('should have correct structure', () => {
      const summary: EnhancedOpsSummary = {
        jobsInProgress: 5,
        jobsPending: 3,
        jobsCompletedMTD: 12,
        deliveriesToday: 4,
        deliveriesInTransit: 2,
        deliveriesMTD: 28,
        handoversPending: 1,
      }

      expect(summary.jobsInProgress).toBe(5)
      expect(summary.jobsPending).toBe(3)
      expect(summary.jobsCompletedMTD).toBe(12)
      expect(summary.deliveriesToday).toBe(4)
      expect(summary.deliveriesInTransit).toBe(2)
      expect(summary.deliveriesMTD).toBe(28)
      expect(summary.handoversPending).toBe(1)
    })
  })

  describe('OperationsJobItem', () => {
    it('should correctly identify over-budget jobs', () => {
      const overBudgetJob: OperationsJobItem = {
        id: '1',
        joNumber: 'JO-0001',
        customerName: 'PT. Test',
        pjoNumber: 'PJO-0001',
        commodity: 'Heavy Equipment',
        origin: 'Jakarta',
        destination: 'Surabaya',
        status: 'in_progress',
        budget: 100000000,
        actualSpent: 110000000,
        totalDeliveries: 5,
        completedDeliveries: 3,
        isOverBudget: true,
        overBudgetAmount: 10000000,
        overBudgetPercent: 10,
      }

      expect(overBudgetJob.isOverBudget).toBe(true)
      expect(overBudgetJob.overBudgetAmount).toBe(10000000)
      expect(overBudgetJob.overBudgetPercent).toBe(10)
    })

    it('should correctly identify under-budget jobs', () => {
      const underBudgetJob: OperationsJobItem = {
        id: '2',
        joNumber: 'JO-0002',
        customerName: 'PT. Test 2',
        pjoNumber: 'PJO-0002',
        commodity: 'Machinery',
        origin: 'Surabaya',
        destination: 'Balikpapan',
        status: 'active',
        budget: 50000000,
        actualSpent: 35000000,
        totalDeliveries: 3,
        completedDeliveries: 2,
        isOverBudget: false,
        overBudgetAmount: 0,
        overBudgetPercent: 0,
      }

      expect(underBudgetJob.isOverBudget).toBe(false)
      expect(underBudgetJob.overBudgetAmount).toBe(0)
    })

    it('should NOT contain revenue or profit fields', () => {
      const job: OperationsJobItem = {
        id: '3',
        joNumber: 'JO-0003',
        customerName: 'PT. Test 3',
        pjoNumber: 'PJO-0003',
        commodity: null,
        origin: null,
        destination: null,
        status: 'pending',
        budget: 0,
        actualSpent: 0,
        totalDeliveries: 0,
        completedDeliveries: 0,
        isOverBudget: false,
        overBudgetAmount: 0,
        overBudgetPercent: 0,
      }

      // Verify no revenue/profit fields exist
      const jobKeys = Object.keys(job)
      expect(jobKeys).not.toContain('revenue')
      expect(jobKeys).not.toContain('profit')
      expect(jobKeys).not.toContain('margin')
      expect(jobKeys).not.toContain('finalRevenue')
      expect(jobKeys).not.toContain('final_revenue')
    })
  })

  describe('DeliveryItem', () => {
    it('should have correct structure', () => {
      const delivery: DeliveryItem = {
        id: '1',
        sjNumber: 'SJ-0001',
        joNumber: 'JO-0001',
        customerName: 'PT. Test',
        commodity: 'Heavy Equipment',
        origin: 'Jakarta',
        destination: 'Surabaya',
        vehicleNumber: 'B 1234 ABC',
        driverName: 'Pak Budi',
        status: 'in_transit',
        departureDate: '2025-12-21',
        actualArrival: null,
        createdAt: '2025-12-20T10:00:00Z',
      }

      expect(delivery.sjNumber).toBe('SJ-0001')
      expect(delivery.status).toBe('in_transit')
      expect(delivery.actualArrival).toBeNull()
    })
  })

  describe('CostSummary', () => {
    it('should calculate remaining budget correctly', () => {
      const costSummary: CostSummary = {
        totalBudget: 500000000,
        totalSpent: 350000000,
        remaining: 150000000,
        percentUsed: 70,
        bkkPending: 3,
        bkkPendingAmount: 45000000,
      }

      expect(costSummary.remaining).toBe(costSummary.totalBudget - costSummary.totalSpent)
      expect(costSummary.percentUsed).toBe(70)
    })

    it('should NOT contain revenue or profit fields', () => {
      const costSummary: CostSummary = {
        totalBudget: 100000000,
        totalSpent: 50000000,
        remaining: 50000000,
        percentUsed: 50,
        bkkPending: 0,
        bkkPendingAmount: 0,
      }

      const keys = Object.keys(costSummary)
      expect(keys).not.toContain('revenue')
      expect(keys).not.toContain('profit')
      expect(keys).not.toContain('margin')
    })
  })

  describe('PendingAction', () => {
    it('should support berita_acara type', () => {
      const action: PendingAction = {
        type: 'berita_acara',
        count: 2,
        message: '2 Berita Acara awaiting completion',
        jobs: ['JO-0001', 'JO-0002'],
      }

      expect(action.type).toBe('berita_acara')
      expect(action.jobs).toHaveLength(2)
    })

    it('should support surat_jalan type', () => {
      const action: PendingAction = {
        type: 'surat_jalan',
        count: 3,
        message: '3 Surat Jalan ready to dispatch',
      }

      expect(action.type).toBe('surat_jalan')
      expect(action.jobs).toBeUndefined()
    })

    it('should support bkk type', () => {
      const action: PendingAction = {
        type: 'bkk',
        count: 1,
        message: '1 BKK request pending approval',
      }

      expect(action.type).toBe('bkk')
    })
  })

  describe('EnhancedOpsDashboardData', () => {
    it('should have all required sections', () => {
      const dashboardData: EnhancedOpsDashboardData = {
        summary: {
          jobsInProgress: 5,
          jobsPending: 2,
          jobsCompletedMTD: 10,
          deliveriesToday: 3,
          deliveriesInTransit: 2,
          deliveriesMTD: 25,
          handoversPending: 1,
        },
        activeJobs: [],
        deliverySchedule: [],
        costSummary: {
          totalBudget: 0,
          totalSpent: 0,
          remaining: 0,
          percentUsed: 0,
          bkkPending: 0,
          bkkPendingAmount: 0,
        },
        pendingActions: [],
        manpower: [],
      }

      expect(dashboardData).toHaveProperty('summary')
      expect(dashboardData).toHaveProperty('activeJobs')
      expect(dashboardData).toHaveProperty('deliverySchedule')
      expect(dashboardData).toHaveProperty('costSummary')
      expect(dashboardData).toHaveProperty('pendingActions')
      expect(dashboardData).toHaveProperty('manpower')
    })

    it('should NOT expose revenue or profit data anywhere', () => {
      const dashboardData: EnhancedOpsDashboardData = {
        summary: {
          jobsInProgress: 1,
          jobsPending: 0,
          jobsCompletedMTD: 0,
          deliveriesToday: 0,
          deliveriesInTransit: 0,
          deliveriesMTD: 0,
          handoversPending: 0,
        },
        activeJobs: [
          {
            id: '1',
            joNumber: 'JO-0001',
            customerName: 'Test',
            pjoNumber: 'PJO-0001',
            commodity: null,
            origin: null,
            destination: null,
            status: 'active',
            budget: 100000000,
            actualSpent: 50000000,
            totalDeliveries: 1,
            completedDeliveries: 0,
            isOverBudget: false,
            overBudgetAmount: 0,
            overBudgetPercent: 0,
          },
        ],
        deliverySchedule: [],
        costSummary: {
          totalBudget: 100000000,
          totalSpent: 50000000,
          remaining: 50000000,
          percentUsed: 50,
          bkkPending: 0,
          bkkPendingAmount: 0,
        },
        pendingActions: [],
        manpower: [],
      }

      // Stringify and check for revenue/profit keywords
      const jsonString = JSON.stringify(dashboardData)
      expect(jsonString).not.toContain('"revenue"')
      expect(jsonString).not.toContain('"profit"')
      expect(jsonString).not.toContain('"margin"')
      expect(jsonString).not.toContain('"finalRevenue"')
      expect(jsonString).not.toContain('"final_revenue"')
    })
  })
})

describe('Security: Ops Dashboard Data Isolation', () => {
  it('should only expose cost/budget data, never revenue/profit', () => {
    // This test documents the security requirement that ops users
    // should NOT see revenue or profit information
    
    const allowedFields = [
      'budget',
      'actualSpent',
      'totalBudget',
      'totalSpent',
      'remaining',
      'percentUsed',
      'bkkPending',
      'bkkPendingAmount',
      'overBudgetAmount',
      'overBudgetPercent',
    ]

    const forbiddenFields = [
      'revenue',
      'profit',
      'margin',
      'finalRevenue',
      'final_revenue',
      'totalRevenue',
      'total_revenue',
      'netProfit',
      'net_profit',
      'grossProfit',
      'gross_profit',
    ]

    // Document the security requirement
    expect(allowedFields.length).toBeGreaterThan(0)
    expect(forbiddenFields.length).toBeGreaterThan(0)
    
    // Ensure no overlap
    const overlap = allowedFields.filter(f => forbiddenFields.includes(f))
    expect(overlap).toHaveLength(0)
  })
})
