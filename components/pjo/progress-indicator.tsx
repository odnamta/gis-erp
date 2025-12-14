'use client'

import { Progress } from '@/components/ui/progress'
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react'

interface ProgressIndicatorProps {
  confirmed: number
  total: number
  allConfirmed: boolean
  hasOverruns: boolean
}

export function ProgressIndicator({ confirmed, total, allConfirmed, hasOverruns }: ProgressIndicatorProps) {
  const percentage = total > 0 ? (confirmed / total) * 100 : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {allConfirmed ? (
            hasOverruns ? (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )
          ) : (
            <Clock className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="font-medium">
            {confirmed} of {total} cost items confirmed
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          {percentage.toFixed(0)}%
        </span>
      </div>
      
      <Progress value={percentage} className="h-2" />
      
      {allConfirmed && (
        <div className={`text-sm ${hasOverruns ? 'text-yellow-600' : 'text-green-600'}`}>
          {hasOverruns ? (
            '⚠️ All costs confirmed with budget overruns - Review required before JO conversion'
          ) : (
            '✅ All costs confirmed - Ready for Job Order conversion'
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Calculate progress from cost items
 */
export function calculateProgress(costItems: { actual_amount: number | null; confirmed_at: string | null }[]): {
  confirmed: number
  total: number
} {
  const confirmed = costItems.filter(item => item.actual_amount !== null && item.confirmed_at !== null).length
  return { confirmed, total: costItems.length }
}
