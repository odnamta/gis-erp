'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  NotificationLogEntry,
  NotificationStats,
  NotificationChannel,
  NotificationStatus,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  CHANNEL_LABELS,
  STATUS_LABELS,
} from '@/types/notification-workflows'
import {
  getRecentLogs,
  getStatusLabel,
} from '@/lib/notification-log-utils'
import {
  getNotificationStats,
  getDeliveryHealth,
  DeliveryHealth,
} from '@/lib/notification-stats-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Clock,
  AlertTriangle,
  BarChart3,
  Activity,
  TrendingUp,
  TrendingDown,
  Eye,
} from 'lucide-react'
import { format } from 'date-fns'

const CHANNEL_ICONS: Record<NotificationChannel, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
  in_app: <Bell className="h-4 w-4" />,
  push: <Smartphone className="h-4 w-4" />,
}

const STATUS_VARIANTS: Record<NotificationStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  sent: 'secondary',
  delivered: 'default',
  failed: 'destructive',
  bounced: 'destructive',
}

const HEALTH_COLORS: Record<DeliveryHealth, string> = {
  healthy: 'text-green-600',
  warning: 'text-yellow-600',
  critical: 'text-red-600',
  unknown: 'text-gray-400',
}

const HEALTH_ICONS: Record<DeliveryHealth, React.ReactNode> = {
  healthy: <CheckCircle className="h-5 w-5 text-green-600" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
  critical: <XCircle className="h-5 w-5 text-red-600" />,
  unknown: <Clock className="h-5 w-5 text-gray-400" />,
}

export default function NotificationLogsPage() {
  const _router = useRouter()
  const { toast } = useToast()

  const [logs, setLogs] = useState<NotificationLogEntry[]>([])
  const [totalLogs, setTotalLogs] = useState(0)
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  // Filters
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(0)
  const pageSize = 20

  // Detail dialog
  const [selectedLog, setSelectedLog] = useState<NotificationLogEntry | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Load data
  useEffect(() => {
    loadLogs()
    loadStats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload logs when filters change
  useEffect(() => {
    loadLogs()
  }, [channelFilter, statusFilter, page]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadLogs = async () => {
    setIsLoading(true)
    const { data, total, error } = await getRecentLogs({
      limit: pageSize,
      offset: page * pageSize,
      channel: channelFilter !== 'all' ? (channelFilter as NotificationChannel) : undefined,
      status: statusFilter !== 'all' ? (statusFilter as NotificationStatus) : undefined,
    })

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      })
    } else {
      setLogs(data)
      setTotalLogs(total)
    }
    setIsLoading(false)
  }

  const loadStats = async () => {
    setIsLoadingStats(true)
    const { data, error } = await getNotificationStats()

    if (error) {
      toast({
        title: 'Error loading statistics',
        description: error,
        variant: 'destructive',
      })
    } else {
      setStats(data)
    }
    setIsLoadingStats(false)
  }

  const handleRefresh = () => {
    loadLogs()
    loadStats()
  }

  const handleViewDetail = (log: NotificationLogEntry) => {
    setSelectedLog(log)
    setDetailDialogOpen(true)
  }

  const totalPages = Math.ceil(totalLogs / pageSize)
  const deliveryHealth = stats ? getDeliveryHealth(stats) : 'unknown'

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notification Logs</h1>
          <p className="text-muted-foreground mt-1">
            Monitor notification delivery and statistics
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <Select value={channelFilter} onValueChange={(v) => { setChannelFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    {NOTIFICATION_CHANNELS.map((channel) => (
                      <SelectItem key={channel} value={channel}>
                        {CHANNEL_LABELS[channel]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {NOTIFICATION_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex-1" />
                <p className="text-sm text-muted-foreground self-center">
                  {totalLogs} total logs
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No logs found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Notification logs will appear here
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Subject/Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[60px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.created_at), 'MMM d, HH:mm')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {CHANNEL_ICONS[log.channel]}
                              <span className="text-sm">{CHANNEL_LABELS[log.channel]}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.recipient_email || log.recipient_phone || 'User'}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">
                            {log.subject || '(No subject)'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANTS[log.status]}>
                              {getStatusLabel(log.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetail(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Page {page + 1} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.max(0, page - 1))}
                          disabled={page === 0}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                          disabled={page >= totalPages - 1}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-6">
          {isLoadingStats ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : stats ? (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Sent</CardDescription>
                    <CardTitle className="text-3xl">{stats.total_sent}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Success Rate</CardDescription>
                    <CardTitle className="text-3xl flex items-center gap-2">
                      {stats.success_rate}%
                      {stats.success_rate >= 90 ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Failure Rate</CardDescription>
                    <CardTitle className="text-3xl">{stats.failure_rate}%</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Delivery Health</CardDescription>
                    <CardTitle className="flex items-center gap-2">
                      {HEALTH_ICONS[deliveryHealth]}
                      <span className={`capitalize ${HEALTH_COLORS[deliveryHealth]}`}>
                        {deliveryHealth}
                      </span>
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Channel Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Channel Breakdown</CardTitle>
                  <CardDescription>Notifications sent per channel</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {NOTIFICATION_CHANNELS.map((channel) => {
                    const count = stats.by_channel[channel]
                    const percentage = stats.total_sent > 0
                      ? Math.round((count / stats.total_sent) * 100)
                      : 0
                    return (
                      <div key={channel} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {CHANNEL_ICONS[channel]}
                            <span className="text-sm font-medium">{CHANNEL_LABELS[channel]}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Status Breakdown</CardTitle>
                  <CardDescription>Notifications by delivery status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {NOTIFICATION_STATUSES.map((status) => {
                      const count = stats.by_status[status]
                      const percentage = stats.total_sent > 0
                        ? Math.round((count / stats.total_sent) * 100)
                        : 0
                      return (
                        <div key={status} className="text-center p-4 bg-muted rounded-lg">
                          <p className="text-2xl font-bold">{count}</p>
                          <p className="text-sm text-muted-foreground">{STATUS_LABELS[status]}</p>
                          <p className="text-xs text-muted-foreground">{percentage}%</p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Common Errors */}
              {stats.common_errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Common Errors
                    </CardTitle>
                    <CardDescription>Most frequent delivery errors</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.common_errors.map((error, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between p-3 bg-muted rounded-lg"
                        >
                          <p className="text-sm font-mono flex-1 mr-4">{error.error}</p>
                          <Badge variant="destructive">{error.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No statistics available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Statistics will appear once notifications are sent
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Log Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
            <DialogDescription>
              Full details of the notification log entry
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Channel</p>
                  <div className="flex items-center gap-2 mt-1">
                    {CHANNEL_ICONS[selectedLog.channel]}
                    <span className="font-medium">{CHANNEL_LABELS[selectedLog.channel]}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={STATUS_VARIANTS[selectedLog.status]} className="mt-1">
                    {getStatusLabel(selectedLog.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium mt-1">
                    {format(new Date(selectedLog.created_at), 'PPpp')}
                  </p>
                </div>
                {selectedLog.sent_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Sent</p>
                    <p className="font-medium mt-1">
                      {format(new Date(selectedLog.sent_at), 'PPpp')}
                    </p>
                  </div>
                )}
                {selectedLog.delivered_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Delivered</p>
                    <p className="font-medium mt-1">
                      {format(new Date(selectedLog.delivered_at), 'PPpp')}
                    </p>
                  </div>
                )}
                {selectedLog.external_id && (
                  <div>
                    <p className="text-sm text-muted-foreground">External ID</p>
                    <p className="font-mono text-sm mt-1">{selectedLog.external_id}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Recipient</p>
                <p className="font-medium mt-1">
                  {selectedLog.recipient_email || selectedLog.recipient_phone || 'User ID: ' + selectedLog.recipient_user_id}
                </p>
              </div>

              {selectedLog.subject && (
                <div>
                  <p className="text-sm text-muted-foreground">Subject</p>
                  <p className="font-medium mt-1">{selectedLog.subject}</p>
                </div>
              )}

              {selectedLog.body && (
                <div>
                  <p className="text-sm text-muted-foreground">Body</p>
                  <div className="bg-muted p-3 rounded-lg mt-1 max-h-[200px] overflow-auto">
                    <pre className="text-sm whitespace-pre-wrap">{selectedLog.body}</pre>
                  </div>
                </div>
              )}

              {selectedLog.error_message && (
                <div>
                  <p className="text-sm text-muted-foreground text-destructive">Error</p>
                  <div className="bg-destructive/10 p-3 rounded-lg mt-1">
                    <p className="text-sm text-destructive">{selectedLog.error_message}</p>
                  </div>
                </div>
              )}

              {selectedLog.entity_type && selectedLog.entity_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Related Entity</p>
                  <p className="font-medium mt-1">
                    {selectedLog.entity_type}: {selectedLog.entity_id}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
