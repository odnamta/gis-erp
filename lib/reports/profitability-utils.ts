// Job Profitability Report Utility Functions

import { JobOrderWithRelations } from '@/types'

export interface JobProfitabilityData {
  joId: string
  joNumber: string
  customerName: string
  projectName: string
  revenue: number
  directCost: number
  equipmentCost: number
  overhead: number
  netProfit: number
  netMargin: number
  createdAt: Date
}

export interface ProfitabilityFilters {
  dateFrom?: Date
  dateTo?: Date
  customerId?: string
  minMargin?: number
  maxMargin?: number
}

export interface ProfitabilitySummary {
  totalJobs: number
  totalRevenue: number
  totalDirectCost: number
  totalEquipmentCost: number
  totalOverhead: number
  totalNetProfit: number
  averageMargin: number
}

/**
 * Calculate net profit: revenue - direct cost - equipment cost - overhead
 */
export function calculateNetProfit(revenue: number, directCost: number, equipmentCost: number, overhead: number): number {
  return revenue - directCost - equipmentCost - overhead
}

/**
 * Calculate net margin as percentage: (netProfit / revenue) * 100
 * Returns 0 if revenue is zero to avoid division by zero
 */
export function calculateNetMargin(netProfit: number, revenue: number): number {
  if (revenue === 0) return 0
  return (netProfit / revenue) * 100
}

/**
 * Filter jobs by date range (inclusive)
 */
export function filterJobsByDateRange(
  jobs: JobProfitabilityData[],
  dateFrom?: Date,
  dateTo?: Date
): JobProfitabilityData[] {
  return jobs.filter((job) => {
    if (dateFrom && job.createdAt < dateFrom) return false
    if (dateTo && job.createdAt > dateTo) return false
    return true
  })
}

/**
 * Filter jobs by customer ID
 */
export function filterJobsByCustomer(
  jobs: JobProfitabilityData[],
  customerId: string
): JobProfitabilityData[] {
  return jobs.filter((job) => job.joId.includes(customerId) || job.customerName === customerId)
}

/**
 * Filter jobs by margin range (inclusive)
 */
export function filterJobsByMarginRange(
  jobs: JobProfitabilityData[],
  minMargin?: number,
  maxMargin?: number
): JobProfitabilityData[] {
  return jobs.filter((job) => {
    if (minMargin !== undefined && job.netMargin < minMargin) return false
    if (maxMargin !== undefined && job.netMargin > maxMargin) return false
    return true
  })
}

/**
 * Calculate profitability summary from a set of jobs
 */
export function calculateProfitabilitySummary(jobs: JobProfitabilityData[]): ProfitabilitySummary {
  if (jobs.length === 0) {
    return {
      totalJobs: 0,
      totalRevenue: 0,
      totalDirectCost: 0,
      totalEquipmentCost: 0,
      totalOverhead: 0,
      totalNetProfit: 0,
      averageMargin: 0,
    }
  }

  const totalRevenue = jobs.reduce((sum, job) => sum + job.revenue, 0)
  const totalDirectCost = jobs.reduce((sum, job) => sum + job.directCost, 0)
  const totalEquipmentCost = jobs.reduce((sum, job) => sum + job.equipmentCost, 0)
  const totalOverhead = jobs.reduce((sum, job) => sum + job.overhead, 0)
  const totalNetProfit = jobs.reduce((sum, job) => sum + job.netProfit, 0)
  
  // Average margin is calculated from total profit / total revenue, not average of individual margins
  const averageMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0

  return {
    totalJobs: jobs.length,
    totalRevenue,
    totalDirectCost,
    totalEquipmentCost,
    totalOverhead,
    totalNetProfit,
    averageMargin,
  }
}

/**
 * Sort jobs by net margin in descending order (highest margin first)
 */
export function sortJobsByMargin(jobs: JobProfitabilityData[]): JobProfitabilityData[] {
  return [...jobs].sort((a, b) => b.netMargin - a.netMargin)
}

/**
 * Apply all filters to jobs
 */
export function applyProfitabilityFilters(
  jobs: JobProfitabilityData[],
  filters: ProfitabilityFilters
): JobProfitabilityData[] {
  let result = jobs

  if (filters.dateFrom || filters.dateTo) {
    result = filterJobsByDateRange(result, filters.dateFrom, filters.dateTo)
  }

  if (filters.customerId) {
    result = filterJobsByCustomer(result, filters.customerId)
  }

  if (filters.minMargin !== undefined || filters.maxMargin !== undefined) {
    result = filterJobsByMarginRange(result, filters.minMargin, filters.maxMargin)
  }

  return result
}

/**
 * Validate profitability filters
 */
export function validateProfitabilityFilters(
  filters: ProfitabilityFilters
): { valid: boolean; error?: string } {
  if (filters.dateFrom && filters.dateTo && filters.dateTo < filters.dateFrom) {
    return { valid: false, error: 'End date must be after start date' }
  }

  if (
    filters.minMargin !== undefined &&
    filters.maxMargin !== undefined &&
    filters.maxMargin < filters.minMargin
  ) {
    return { valid: false, error: 'Maximum margin must be greater than minimum margin' }
  }

  return { valid: true }
}

/**
 * Transform job order data to profitability data
 */
export function transformJobToProfitabilityData(
  job: JobOrderWithRelations & { overhead_total?: number; equipment_cost?: number }
): JobProfitabilityData {
  const revenue = job.final_revenue ?? 0
  const directCost = job.final_cost ?? 0
  const equipmentCost = job.equipment_cost ?? 0
  const overhead = job.overhead_total ?? 0
  const netProfit = calculateNetProfit(revenue, directCost, equipmentCost, overhead)
  const netMargin = calculateNetMargin(netProfit, revenue)

  return {
    joId: job.id,
    joNumber: job.jo_number,
    customerName: job.customers?.name ?? 'Unknown',
    projectName: job.projects?.name ?? 'Unknown',
    revenue,
    directCost,
    equipmentCost,
    overhead,
    netProfit,
    netMargin,
    createdAt: new Date(job.created_at || new Date()),
  }
}
