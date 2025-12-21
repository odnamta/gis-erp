'use client'

import { RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getTimeSinceUpdate } from '@/lib/finance-dashboard-enhanced-utils'

interface DashboardHeaderProps {
  userName?: string
  calculatedAt: string
  isStale: boolean
  isRefreshing?: boolean
  onRefresh?: () => void
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardHeader({
  userName,
  calculatedAt,
  isStale,
  isRefreshing = false,
  onRefresh,
}: DashboardHeaderProps) {
  const greeting = getGreeting()
  const timeSinceUpdate = getTimeSinceUpdate(calculatedAt)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}{userName ? `, ${userName}` : ''}
        </h1>
        <p className="text-muted-foreground">
          Finance Dashboard Overview
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Last Updated */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isStale && (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
              <AlertCircle className="h-3 w-3" />
              Stale
            </Badge>
          )}
          <span>Updated {timeSinceUpdate}</span>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        )}
      </div>
    </div>
  )
}
