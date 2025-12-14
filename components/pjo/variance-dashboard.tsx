'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, TrendingUp, FileText, DollarSign } from 'lucide-react'
import { formatIDR } from '@/lib/pjo-utils'
import { PJOWithRelations } from '@/types'
import { format, parseISO, startOfMonth } from 'date-fns'

interface VarianceDashboardProps {
  pjos: PJOWithRelations[]
}

interface VarianceStats {
  totalPJOs: number
  overBudgetCount: number
  totalVariance: number
  totalRevenue: number
  totalCost: number
  avgMargin: number
}

interface MonthlyVariance {
  month: string
  variance: number
  count: number
}

function calculateVarianceStats(pjos: PJOWithRelations[]): VarianceStats {
  const totalPJOs = pjos.length
  
  // Count PJOs with cost overruns
  const overBudgetCount = pjos.filter(pjo => pjo.has_cost_overruns === true).length
  
  // Calculate total variance (sum of positive variances from exceeded cost items)
  // This is approximated from the PJO data - actual variance would need cost items
  let totalVariance = 0
  let totalRevenue = 0
  let totalCost = 0
  
  pjos.forEach(pjo => {
    const revenue = pjo.total_revenue_calculated || pjo.total_revenue || 0
    const estimatedCost = pjo.total_cost_estimated || pjo.total_expenses || 0
    const actualCost = pjo.total_cost_actual || 0
    
    totalRevenue += revenue
    totalCost += actualCost > 0 ? actualCost : estimatedCost
    
    // Calculate variance (actual - estimated) for exceeded items
    if (actualCost > estimatedCost) {
      totalVariance += actualCost - estimatedCost
    }
  })
  
  const avgMargin = totalRevenue > 0 
    ? ((totalRevenue - totalCost) / totalRevenue) * 100 
    : 0

  return {
    totalPJOs,
    overBudgetCount,
    totalVariance,
    totalRevenue,
    totalCost,
    avgMargin,
  }
}

function calculateMonthlyVariance(pjos: PJOWithRelations[]): MonthlyVariance[] {
  const monthlyData: Record<string, { variance: number; count: number }> = {}
  
  pjos.forEach(pjo => {
    if (!pjo.created_at) return
    
    const date = parseISO(pjo.created_at)
    const monthKey = format(startOfMonth(date), 'yyyy-MM')
    
    const estimatedCost = pjo.total_cost_estimated || pjo.total_expenses || 0
    const actualCost = pjo.total_cost_actual || 0
    const variance = actualCost > estimatedCost ? actualCost - estimatedCost : 0
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { variance: 0, count: 0 }
    }
    monthlyData[monthKey].variance += variance
    if (variance > 0) monthlyData[monthKey].count += 1
  })
  
  // Sort by month and take last 6 months
  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, data]) => ({
      month: format(parseISO(key + '-01'), 'MMM'),
      variance: data.variance,
      count: data.count,
    }))
}

export function VarianceDashboard({ pjos }: VarianceDashboardProps) {
  const stats = calculateVarianceStats(pjos)
  const monthlyVariance = useMemo(() => calculateMonthlyVariance(pjos), [pjos])
  const maxVariance = Math.max(...monthlyVariance.map(m => m.variance), 1)
  
  return (
    <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total PJOs</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalPJOs}</div>
          <p className="text-xs text-muted-foreground">
            Active proforma job orders
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Over Budget</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {stats.overBudgetCount}
          </div>
          <p className="text-xs text-muted-foreground">
            PJOs with cost overruns
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Variance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.totalVariance > 0 ? 'text-destructive' : 'text-green-600'}`}>
            {stats.totalVariance > 0 ? '+' : ''}{formatIDR(stats.totalVariance)}
          </div>
          <p className="text-xs text-muted-foreground">
            Sum of budget overruns
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.avgMargin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
            {stats.avgMargin.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Average profit margin
          </p>
        </CardContent>
      </Card>
    </div>

    {/* Variance Trend Chart */}
    {monthlyVariance.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Variance Trend (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {monthlyVariance.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center justify-end h-24">
                  {data.variance > 0 ? (
                    <div
                      className="w-full bg-destructive/80 rounded-t transition-all hover:bg-destructive"
                      style={{ height: `${(data.variance / maxVariance) * 100}%`, minHeight: '4px' }}
                      title={`${formatIDR(data.variance)} (${data.count} PJOs)`}
                    />
                  ) : (
                    <div className="w-full bg-green-500/30 rounded-t h-1" title="No overruns" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{data.month}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Monthly budget overruns</span>
            <span>Max: {formatIDR(maxVariance)}</span>
          </div>
        </CardContent>
      </Card>
    )}
    </div>
  )
}
