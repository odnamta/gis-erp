'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { BudgetAnalysis } from '@/types'
import { formatIDR } from '@/lib/pjo-utils'

interface BudgetSummaryProps {
  budget: BudgetAnalysis
  totalRevenue: number
}

export function BudgetSummary({ budget, totalRevenue }: BudgetSummaryProps) {
  // Use snake_case properties with fallback to camelCase or defaults
  const totalActual = budget.total_actual ?? budget.totalActual ?? 0
  const totalEstimated = budget.total_estimated ?? budget.totalEstimated ?? 0
  const totalVariance = budget.total_variance ?? budget.variance ?? 0
  const itemsConfirmed = budget.items_confirmed ?? budget.confirmedCount ?? 0
  const itemsPending = budget.items_pending ?? budget.pendingCount ?? 0
  const itemsOverBudget = budget.items_over_budget ?? budget.exceededCount ?? 0
  const itemsUnderBudget = budget.items_under_budget ?? budget.underBudgetCount ?? 0
  const allConfirmed = budget.all_confirmed ?? budget.allConfirmed ?? false
  const hasOverruns = budget.has_overruns ?? (itemsOverBudget > 0)
  
  const actualProfit = totalRevenue - totalActual
  const actualMargin = totalRevenue > 0 ? (actualProfit / totalRevenue) * 100 : 0
  const estimatedProfit = totalRevenue - totalEstimated
  const estimatedMargin = totalRevenue > 0 ? (estimatedProfit / totalRevenue) * 100 : 0
  
  const totalItems = itemsConfirmed + itemsPending
  const confirmationProgress = totalItems > 0
    ? (itemsConfirmed / totalItems) * 100
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Budget Summary
          {allConfirmed ? (
            <span className="flex items-center gap-1 text-green-600 text-sm font-normal">
              <CheckCircle className="h-4 w-4" />
              All costs confirmed
            </span>
          ) : hasOverruns ? (
            <span className="flex items-center gap-1 text-amber-600 text-sm font-normal">
              <AlertTriangle className="h-4 w-4" />
              {itemsOverBudget} item(s) over budget
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground text-sm font-normal">
              <Clock className="h-4 w-4" />
              {itemsPending} item(s) pending
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Confirmation Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Cost Confirmation Progress</span>
            <span>{itemsConfirmed} / {totalItems} items</span>
          </div>
          <Progress value={confirmationProgress} className="h-2" />
        </div>

        {/* Financial Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-lg font-semibold">{formatIDR(totalRevenue)}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Budget (Estimated)</p>
            <p className="text-lg font-semibold">{formatIDR(totalEstimated)}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Actual Cost</p>
            <p className="text-lg font-semibold">
              {itemsConfirmed > 0 ? formatIDR(totalActual) : '-'}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Variance</p>
            <p className={`text-lg font-semibold ${
              totalVariance > 0 ? 'text-amber-600' : 
              totalVariance < 0 ? 'text-green-600' : ''
            }`}>
              {itemsConfirmed > 0 
                ? `${totalVariance >= 0 ? '+' : ''}${formatIDR(totalVariance)}`
                : '-'
              }
            </p>
          </div>
        </div>

        {/* Profit Comparison */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Estimated Profit</p>
            <p className={`text-xl font-bold ${estimatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatIDR(estimatedProfit)}
            </p>
            <p className="text-sm text-muted-foreground">
              Margin: {estimatedMargin.toFixed(1)}%
            </p>
          </div>
          
          {allConfirmed && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Actual Profit</p>
              <p className={`text-xl font-bold ${actualProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatIDR(actualProfit)}
              </p>
              <p className="text-sm text-muted-foreground">
                Margin: {actualMargin.toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        {/* Status Breakdown */}
        <div className="flex gap-4 pt-4 border-t text-sm">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>{itemsUnderBudget + (itemsConfirmed - itemsOverBudget - itemsUnderBudget)} within budget</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>{itemsOverBudget} over budget</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{itemsPending} pending</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
