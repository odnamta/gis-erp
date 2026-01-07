'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  CheckSquare, 
  Send, 
  Receipt, 
  Mail, 
  DollarSign, 
  Calculator,
  Activity
} from 'lucide-react'
import { ActivityEntry } from '@/types'
import { formatActivityMessage, formatRelativeTime } from '@/lib/dashboard-utils'

interface RecentActivityProps {
  activities: ActivityEntry[]
  isLoading?: boolean
}

const iconMap: Record<string, React.ElementType> = {
  pjo_approved: CheckCircle,
  pjo_rejected: XCircle,
  jo_created: FileText,
  jo_completed: CheckSquare,
  jo_submitted_to_finance: Send,
  invoice_created: Receipt,
  invoice_sent: Mail,
  invoice_paid: DollarSign,
  cost_confirmed: Calculator,
}

const iconColorMap: Record<string, string> = {
  pjo_approved: 'text-green-600',
  pjo_rejected: 'text-red-600',
  jo_created: 'text-blue-600',
  jo_completed: 'text-green-600',
  jo_submitted_to_finance: 'text-purple-600',
  invoice_created: 'text-blue-600',
  invoice_sent: 'text-yellow-600',
  invoice_paid: 'text-green-600',
  cost_confirmed: 'text-blue-600',
}

export function RecentActivity({ activities, isLoading = false }: RecentActivityProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>Latest system actions</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = iconMap[activity.action_type] || Activity
              const iconColor = iconColorMap[activity.action_type] || 'text-muted-foreground'
              
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`p-2 rounded-full bg-muted ${iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {formatActivityMessage(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No recent activity
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
