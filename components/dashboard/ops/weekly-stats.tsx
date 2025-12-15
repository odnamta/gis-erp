'use client'

import { TrendingUp, TrendingDown, Minus, Clock, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WeeklyStats } from '@/lib/ops-dashboard-utils'

interface WeeklyStatsCardProps {
  stats: WeeklyStats
}

export function WeeklyStatsCard({ stats }: WeeklyStatsCardProps) {
  const getTrendIcon = () => {
    switch (stats.trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getTrendText = () => {
    const diff = stats.completedThisWeek - stats.completedLastWeek
    if (diff === 0) return 'Same as last week'
    if (diff > 0) return `+${diff} from last week`
    return `${diff} from last week`
  }

  const getTrendColor = () => {
    switch (stats.trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Weekly Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Completed This Week */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Completed This Week</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{stats.completedThisWeek}</span>
              {getTrendIcon()}
            </div>
            <p className={`text-xs ${getTrendColor()}`}>{getTrendText()}</p>
          </div>

          {/* Last Week */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Last Week</p>
            <span className="text-2xl font-bold">{stats.completedLastWeek}</span>
            <p className="text-xs text-muted-foreground">Cost entries completed</p>
          </div>

          {/* Average Completion Time */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Avg. Completion Time</p>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.avgCompletionDays}</span>
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground">From approval to completion</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
