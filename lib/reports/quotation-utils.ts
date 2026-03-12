// Quotation Conversion Report Utility Functions

import {
  StatusCount,
  ConversionRate,
  PipelineMetric,
  QuotationConversionReportData,
  DateRange,
  PJOStatusForReport,
} from '@/types/reports'
import { differenceInDays } from 'date-fns'

const STATUS_ORDER: PJOStatusForReport[] = ['draft', 'pending_approval', 'approved', 'rejected', 'converted']

interface PJOData {
  id: string
  status: string
  converted_to_jo: boolean | null
  created_at: string | null
  approved_at: string | null
  converted_to_jo_at: string | null
}

/**
 * Count PJOs by status
 */
export function countByStatus(pjos: PJOData[]): StatusCount[] {
  const counts: Record<PJOStatusForReport, number> = {
    draft: 0,
    pending_approval: 0,
    approved: 0,
    rejected: 0,
    converted: 0,
  }
  
  for (const pjo of pjos) {
    // Check if converted first
    if (pjo.converted_to_jo) {
      counts.converted++
    } else if (pjo.status in counts) {
      counts[pjo.status as PJOStatusForReport]++
    }
  }
  
  const total = pjos.length || 1 // Avoid division by zero
  
  return STATUS_ORDER.map((status) => ({
    status,
    count: counts[status],
    percentage: (counts[status] / total) * 100,
  }))
}

/**
 * Calculate conversion rate between two stages
 */
export function calculateConversionRate(fromCount: number, toCount: number): number {
  if (fromCount === 0) return 0
  return (toCount / fromCount) * 100
}

/**
 * Calculate average days spent in each stage
 */
export function calculateAverageDaysInStage(pjos: PJOData[]): PipelineMetric[] {
  const metrics: PipelineMetric[] = []
  
  // Draft to Pending Approval (using created_at as baseline)
  // This is approximated since we don't track when status changed to pending
  
  // Pending to Approved
  const approvedPJOs = pjos.filter(p => p.approved_at && p.created_at)
  if (approvedPJOs.length > 0) {
    const totalDays = approvedPJOs.reduce((sum, pjo) => {
      const created = new Date(pjo.created_at!)
      const approved = new Date(pjo.approved_at!)
      return sum + differenceInDays(approved, created)
    }, 0)
    metrics.push({
      stage: 'Creation to Approval',
      averageDays: Math.round(totalDays / approvedPJOs.length),
    })
  }
  
  // Approved to Converted
  const convertedPJOs = pjos.filter(p => p.converted_to_jo_at && p.approved_at)
  if (convertedPJOs.length > 0) {
    const totalDays = convertedPJOs.reduce((sum, pjo) => {
      const approved = new Date(pjo.approved_at!)
      const converted = new Date(pjo.converted_to_jo_at!)
      return sum + differenceInDays(converted, approved)
    }, 0)
    metrics.push({
      stage: 'Approval to Conversion',
      averageDays: Math.round(totalDays / convertedPJOs.length),
    })
  }
  
  // Total cycle time
  const fullyConvertedPJOs = pjos.filter(p => p.converted_to_jo_at && p.created_at)
  if (fullyConvertedPJOs.length > 0) {
    const totalDays = fullyConvertedPJOs.reduce((sum, pjo) => {
      const created = new Date(pjo.created_at!)
      const converted = new Date(pjo.converted_to_jo_at!)
      return sum + differenceInDays(converted, created)
    }, 0)
    metrics.push({
      stage: 'Total Cycle Time',
      averageDays: Math.round(totalDays / fullyConvertedPJOs.length),
    })
  }
  
  return metrics
}

/**
 * Build complete quotation conversion report data
 */
export function buildQuotationConversionReportData(
  pjos: PJOData[],
  period: DateRange
): QuotationConversionReportData {
  const statusCounts = countByStatus(pjos)
  
  // Calculate conversion rates
  const _draftCount = statusCounts.find(s => s.status === 'draft')?.count || 0
  const pendingCount = statusCounts.find(s => s.status === 'pending_approval')?.count || 0
  const approvedCount = statusCounts.find(s => s.status === 'approved')?.count || 0
  const convertedCount = statusCounts.find(s => s.status === 'converted')?.count || 0
  const rejectedCount = statusCounts.find(s => s.status === 'rejected')?.count || 0
  
  const totalSubmitted = pendingCount + approvedCount + convertedCount + rejectedCount
  const totalApproved = approvedCount + convertedCount
  
  const conversionRates: ConversionRate[] = [
    {
      from: 'Submitted',
      to: 'Approved',
      rate: calculateConversionRate(totalSubmitted, totalApproved),
    },
    {
      from: 'Approved',
      to: 'Converted to JO',
      rate: calculateConversionRate(totalApproved, convertedCount),
    },
  ]
  
  const pipelineMetrics = calculateAverageDaysInStage(pjos)
  
  const overallConversionRate = calculateConversionRate(pjos.length, convertedCount)
  
  return {
    period,
    statusCounts,
    conversionRates,
    pipelineMetrics,
    totals: {
      totalPJOs: pjos.length,
      overallConversionRate,
    },
  }
}

/**
 * Get status display name
 */
export function getStatusDisplayName(status: PJOStatusForReport): string {
  const names: Record<PJOStatusForReport, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    converted: 'Converted to JO',
  }
  return names[status]
}

/**
 * Get status color class
 */
export function getStatusColorClass(status: PJOStatusForReport): string {
  const colors: Record<PJOStatusForReport, string> = {
    draft: 'bg-gray-100 text-gray-800',
    pending_approval: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    converted: 'bg-blue-100 text-blue-800',
  }
  return colors[status]
}
