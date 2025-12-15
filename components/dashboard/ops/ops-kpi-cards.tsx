'use client'

import { Clock, Truck, CheckCircle, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OpsKPIs } from '@/lib/ops-dashboard-utils'

interface OpsKPICardsProps {
  kpis: OpsKPIs
}

export function OpsKPICards({ kpis }: OpsKPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Pending Cost Entry */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Cost Entry</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">{kpis.pendingCostEntries}</div>
            {kpis.urgentCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {kpis.urgentCount} urgent
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">PJOs awaiting your input</p>
        </CardContent>
      </Card>

      {/* In Progress Jobs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Progress Jobs</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.inProgressJobs}</div>
          <p className="text-xs text-muted-foreground">Active job orders</p>
        </CardContent>
      </Card>

      {/* Completed This Week */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed This Week</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.completedThisWeek}</div>
          <p className="text-xs text-muted-foreground">Cost entries completed</p>
        </CardContent>
      </Card>

      {/* Over Budget Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Over Budget</CardTitle>
          <AlertTriangle className={`h-4 w-4 ${kpis.overBudgetItems > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${kpis.overBudgetItems > 0 ? 'text-red-500' : ''}`}>
            {kpis.overBudgetItems}
          </div>
          <p className="text-xs text-muted-foreground">Items exceeding budget</p>
        </CardContent>
      </Card>
    </div>
  )
}
