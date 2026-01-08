import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/permissions-server'
import { getOpsDashboardData } from '@/lib/ops-dashboard-utils'
import { getEnhancedOpsDashboardData } from '@/lib/ops-dashboard-enhanced-utils'
import {
  fetchFinanceDashboardData,
  fetchSalesDashboardData,
  fetchManagerDashboardData,
  fetchAdminDashboardData,
  fetchDashboardKPIs,
  fetchBudgetAlerts,
  fetchExceededBudgetCount,
  fetchRecentActivity,
  fetchOperationsQueue,
  fetchManagerMetrics,
} from '@/app/(main)/dashboard/actions'
import { getSalesEngineeringDashboardData } from '@/app/(main)/dashboard/sales-engineering-actions'

/**
 * API endpoint for fetching preview dashboard data
 * Only accessible by owner/director roles
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user has preview access
    await requireRole(['owner', 'director'])

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    if (!role) {
      return NextResponse.json({ error: 'Role parameter required' }, { status: 400 })
    }

    // Fetch data based on requested role
    switch (role) {
      case 'ops': {
        const [opsData, enhancedOpsData] = await Promise.all([
          getOpsDashboardData(),
          getEnhancedOpsDashboardData(),
        ])
        return NextResponse.json({ opsData, enhancedOpsData })
      }

      case 'finance': {
        const financeData = await fetchFinanceDashboardData()
        return NextResponse.json({ financeData })
      }

      case 'marketing': {
        const [salesData, salesEngineeringData] = await Promise.all([
          fetchSalesDashboardData(),
          getSalesEngineeringDashboardData(),
        ])
        return NextResponse.json({ salesData, salesEngineeringData })
      }

      case 'marketing_manager':
      case 'finance_manager':
      case 'operations_manager': {
        const managerData = await fetchManagerDashboardData()
        return NextResponse.json({ managerData })
      }

      case 'administration': {
        const adminData = await fetchAdminDashboardData()
        return NextResponse.json({ adminData })
      }

      default: {
        // Default dashboard data
        const [kpis, alerts, alertCount, activities, queue, metrics] = await Promise.all([
          fetchDashboardKPIs(),
          fetchBudgetAlerts(),
          fetchExceededBudgetCount(),
          fetchRecentActivity(),
          fetchOperationsQueue(),
          fetchManagerMetrics(),
        ])
        return NextResponse.json({
          defaultData: { kpis, alerts, alertCount, activities, queue, metrics }
        })
      }
    }
  } catch (error) {
    console.error('Preview dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preview data' },
      { status: 500 }
    )
  }
}
