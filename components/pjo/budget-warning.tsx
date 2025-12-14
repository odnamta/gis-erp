'use client'

import { CostItemStatus } from '@/types'
import { formatIDR } from '@/lib/pjo-utils'
import { AlertTriangle, XCircle } from 'lucide-react'

interface BudgetWarningProps {
  status: CostItemStatus
  variance: number
  variancePct: number
  estimatedAmount: number
}

export function BudgetWarning({ status, variance, variancePct, estimatedAmount }: BudgetWarningProps) {
  if (status === 'confirmed' || status === 'estimated') {
    return null
  }

  const usagePercent = ((estimatedAmount + variance) / estimatedAmount) * 100

  if (status === 'at_risk') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>
          Approaching budget limit: {usagePercent.toFixed(1)}% used
        </span>
      </div>
    )
  }

  if (status === 'exceeded') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
        <XCircle className="h-4 w-4 flex-shrink-0" />
        <span>
          Budget exceeded by {formatIDR(variance)} ({variancePct.toFixed(1)}%)
        </span>
      </div>
    )
  }

  return null
}

interface BudgetSummaryWarningProps {
  hasOverruns: boolean
  overrunCount: number
  totalVariance: number
}

export function BudgetSummaryWarning({ hasOverruns, overrunCount, totalVariance }: BudgetSummaryWarningProps) {
  if (!hasOverruns) return null

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-md text-red-800">
      <XCircle className="h-5 w-5 flex-shrink-0" />
      <div>
        <p className="font-medium">Budget Overruns Detected</p>
        <p className="text-sm">
          {overrunCount} item{overrunCount > 1 ? 's' : ''} exceeded budget by total of {formatIDR(totalVariance)}
        </p>
      </div>
    </div>
  )
}
