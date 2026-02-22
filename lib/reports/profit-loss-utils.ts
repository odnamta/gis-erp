// Profit & Loss Report Utility Functions

import { RevenueGroup, CostGroup, PLReportData, DateRange } from '@/types/reports'

// Revenue category mapping
const REVENUE_CATEGORIES: Record<string, string> = {
  trucking: 'Trucking Services',
  port_handling: 'Port Handling',
  documentation: 'Documentation Services',
  handling: 'Handling Services',
  other: 'Other Services',
}

// Cost category mapping
const COST_CATEGORIES: Record<string, string> = {
  trucking: 'Trucking & Vehicle',
  port_charges: 'Port Charges',
  labor: 'Crew & Allowances',
  fuel: 'Fuel',
  tolls: 'Tolls',
  documentation: 'Documentation',
  handling: 'Handling',
  customs: 'Customs',
  insurance: 'Insurance',
  storage: 'Storage',
  other: 'Other',
}

interface RevenueItem {
  description: string
  subtotal: number
  unit?: string
}

interface CostItem {
  category: string
  actual_amount: number | null
  estimated_amount: number
}

/**
 * Group revenue items by category
 */
export function groupRevenueByCategory(items: RevenueItem[]): RevenueGroup[] {
  const grouped: Record<string, number> = {}
  
  for (const item of items) {
    // Try to categorize based on description keywords
    let category = 'other'
    const desc = item.description.toLowerCase()
    
    if (desc.includes('truck') || desc.includes('transport') || desc.includes('delivery')
      || desc.includes('kirim') || desc.includes('angkut') || desc.includes('mobilisasi')
      || desc.includes('trailer') || desc.includes('lowbed') || desc.includes('flatbed')
      || desc.includes('truk') || desc.includes('kendaraan')) {
      category = 'trucking'
    } else if (desc.includes('port') || desc.includes('terminal') || desc.includes('pelabuhan')
      || desc.includes('dermaga') || desc.includes('sandar')) {
      category = 'port_handling'
    } else if (desc.includes('doc') || desc.includes('clearance') || desc.includes('permit')
      || desc.includes('izin') || desc.includes('dokumen') || desc.includes('surat')
      || desc.includes('perizinan') || desc.includes('administrasi')) {
      category = 'documentation'
    } else if (desc.includes('handling') || desc.includes('loading') || desc.includes('unloading')
      || desc.includes('bongkar') || desc.includes('muat') || desc.includes('crane')
      || desc.includes('lifting') || desc.includes('rigger')) {
      category = 'handling'
    }
    
    grouped[category] = (grouped[category] || 0) + item.subtotal
  }
  
  return Object.entries(grouped)
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => ({
      category: REVENUE_CATEGORIES[category] || category,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * Group cost items by category
 */
export function groupCostsByCategory(items: CostItem[]): CostGroup[] {
  const grouped: Record<string, number> = {}
  
  for (const item of items) {
    const category = item.category || 'other'
    const amount = item.actual_amount ?? item.estimated_amount
    grouped[category] = (grouped[category] || 0) + amount
  }
  
  return Object.entries(grouped)
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => ({
      category: COST_CATEGORIES[category] || category,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * Calculate P&L summary from revenue and cost groups
 */
export function calculatePLSummary(
  revenue: RevenueGroup[],
  costs: CostGroup[]
): { totalRevenue: number; totalCost: number; grossProfit: number; grossMargin: number } {
  const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0)
  const totalCost = costs.reduce((sum, c) => sum + c.amount, 0)
  const grossProfit = totalRevenue - totalCost
  
  // Handle zero revenue edge case - return 0% margin instead of NaN/Infinity
  const grossMargin = totalRevenue === 0 ? 0 : (grossProfit / totalRevenue) * 100
  
  return {
    totalRevenue,
    totalCost,
    grossProfit,
    grossMargin,
  }
}

/**
 * Build complete P&L report data
 */
export function buildPLReportData(
  revenueItems: RevenueItem[],
  costItems: CostItem[],
  period: DateRange
): PLReportData {
  const revenue = groupRevenueByCategory(revenueItems)
  const costs = groupCostsByCategory(costItems)
  const summary = calculatePLSummary(revenue, costs)
  
  return {
    period,
    revenue,
    costs,
    ...summary,
  }
}

/**
 * Get display name for a cost category
 */
export function getCostCategoryDisplayName(category: string): string {
  return COST_CATEGORIES[category] || category
}

/**
 * Get display name for a revenue category
 */
export function getRevenueCategoryDisplayName(category: string): string {
  return REVENUE_CATEGORIES[category] || category
}
