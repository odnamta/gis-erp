'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  RefreshCw,
  Mail,
  MessageSquare,
  Bell,
  Smartphone,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react'
import {
  NotificationStats,
  NotificationChannel,
  NotificationStatus,
  CHANNEL_LABELS,
  STATUS_LABELS,
} from '@/types/notification-workflows'
import {
  getNotificationStats,
  getChannelPercentage,
  getStatusPercentage,
  getDeliveryHealth,
  DeliveryHealth,
} from '@/lib/notification-stats-utils'

interface NotificationStatsCardProps {
  startDate?: string
  endDate?: string
  showChannelBreakdown?: boolean
  showStatusBreakdown?: boolean
  showErrors?: boolean
  compact?: boolean
}

const ChannelIcon = ({ channel }: { channel: NotificationChannel }) => {
  switch (channel) {
    case 'email':
      return <Mail className="h-4 w-4" />
    case 'whatsapp':
      return <MessageSquare className="h-4 w-4" />
    case 'in_app':
      return <Bell className="h-4 w-4" />
    case 'push':
      return <Smartphone className="h-4 w-4" />
    default:
      return null
  }
}

const HealthBadge = ({ health }: { health: DeliveryHealth }) => {
  const config: Record<DeliveryHealth, { label: string; className: string; icon: React.ReactNode }> = {
    healthy: {
      label: 'Healthy',
      className: 'bg-green-100 text-green-800 border-green-200',
      icon: <CheckCircle className="h-3 w-3" />,
    },
    warning: {
      label: 'Warning',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    critical: {
      label: 'Critical',
      className: 'bg-red-100 text-red-800 border-red-200',
      icon: <XCircle className="h-3 w-3" />,
    },
    unknown: {
      label: 'Insufficient Data',
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: <Activity className="h-3 w-3" />,
    },
  }

  const { label, className, icon } = config[health]

  return (
    <Badge variant="outline" className={`${className} flex items-center gap-1`}>
      {icon}
      {label}
    </Badge>
  )
}

const channelColors: Record<NotificationChannel, string> = {
  email: 'bg-blue-500',
  whatsapp: 'bg-green-500',
  in_app: 'bg-purple-500',
  push: 'bg-orange-500',
}

const statusColors: Record<NotificationStatus, string> = {
  pending: 'bg-yellow-500',
  sent: 'bg-blue-500',
  delivered: 'bg-green-500',
  failed: 'bg-red-500',
  bounced: 'bg-orange-500',
}

export function NotificationStatsCard({
  startDate,
  endDate,
  showChannelBreakdown = true,
  showStatusBreakdown = true,
  showErrors = true,
  compact = false,
}: NotificationStatsCardProps) {
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const loadStats = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await getNotificationStats({
        start_date: startDate,
        end_date: endDate,
      })

      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        })
        return
      }

      setStats(data)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load notification statistics',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate, toast])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          No statistics available
        </CardContent>
      </Card>
    )
  }

  const health = getDeliveryHealth(stats)

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Notification Stats</CardTitle>
            <HealthBadge health={health} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{stats.total_sent}</p>
              <p className="text-xs text-muted-foreground">Total Sent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.success_rate}%</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.failure_rate}%</p>
              <p className="text-xs text-muted-foreground">Failure Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Notification Statistics</CardTitle>
            <CardDescription>
              Overview of notification delivery performance
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <HealthBadge health={health} />
            <Button variant="outline" size="sm" onClick={loadStats} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-3xl font-bold">{stats.total_sent}</p>
            <p className="text-sm text-muted-foreground">Total Sent</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <p className="text-3xl font-bold text-green-600">{stats.success_rate}%</p>
            </div>
            <p className="text-sm text-muted-foreground">Success Rate</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <p className="text-3xl font-bold text-red-600">{stats.failure_rate}%</p>
            </div>
            <p className="text-sm text-muted-foreground">Failure Rate</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{stats.by_status.delivered}</p>
            <p className="text-sm text-muted-foreground">Delivered</p>
          </div>
        </div>

        {/* Channel Breakdown */}
        {showChannelBreakdown && (
          <div>
            <h4 className="text-sm font-medium mb-3">Channel Breakdown</h4>
            <div className="space-y-3">
              {(Object.keys(stats.by_channel) as NotificationChannel[]).map((channel) => {
                const count = stats.by_channel[channel]
                const percentage = getChannelPercentage(stats, channel)
                return (
                  <div key={channel} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <ChannelIcon channel={channel} />
                        <span>{CHANNEL_LABELS[channel]}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Status Breakdown */}
        {showStatusBreakdown && (
          <div>
            <h4 className="text-sm font-medium mb-3">Status Breakdown</h4>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(stats.by_status) as NotificationStatus[]).map((status) => {
                const count = stats.by_status[status]
                const percentage = getStatusPercentage(stats, status)
                return (
                  <div
                    key={status}
                    className="text-center p-2 rounded-lg border"
                  >
                    <div className={`w-3 h-3 rounded-full ${statusColors[status]} mx-auto mb-1`} />
                    <p className="text-lg font-semibold">{count}</p>
                    <p className="text-xs text-muted-foreground">{STATUS_LABELS[status]}</p>
                    <p className="text-xs text-muted-foreground">{percentage}%</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Common Errors */}
        {showErrors && stats.common_errors.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Common Errors
            </h4>
            <div className="space-y-2">
              {stats.common_errors.slice(0, 5).map((error, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-red-50 border border-red-100 rounded-md"
                >
                  <span className="text-sm text-red-800 truncate flex-1 mr-2">
                    {error.error}
                  </span>
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                    {error.count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Errors Message */}
        {showErrors && stats.common_errors.length === 0 && stats.total_sent > 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-md">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800">No errors recorded</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
