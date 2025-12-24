'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  RefreshCw,
  Search,
  Mail,
  MessageSquare,
  Bell,
  Smartphone,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'
import {
  NotificationLogEntry,
  NotificationChannel,
  NotificationStatus,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  CHANNEL_LABELS,
  STATUS_LABELS,
} from '@/types/notification-workflows'
import { getRecentLogs, getStatusColor } from '@/lib/notification-log-utils'
import { format } from 'date-fns'
import Link from 'next/link'

interface NotificationLogViewerProps {
  entityType?: string
  entityId?: string
  userId?: string
  pageSize?: number
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

const StatusIcon = ({ status }: { status: NotificationStatus }) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />
    case 'sent':
      return <CheckCircle className="h-4 w-4 text-blue-500" />
    case 'delivered':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />
    case 'bounced':
      return <AlertCircle className="h-4 w-4 text-orange-500" />
    default:
      return null
  }
}

const StatusBadge = ({ status }: { status: NotificationStatus }) => {
  const colorMap: Record<NotificationStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    sent: 'bg-blue-100 text-blue-800 border-blue-200',
    delivered: 'bg-green-100 text-green-800 border-green-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    bounced: 'bg-orange-100 text-orange-800 border-orange-200',
  }

  return (
    <Badge variant="outline" className={`${colorMap[status]} flex items-center gap-1`}>
      <StatusIcon status={status} />
      {STATUS_LABELS[status]}
    </Badge>
  )
}

export function NotificationLogViewer({
  entityType,
  entityId,
  userId,
  pageSize = 20,
}: NotificationLogViewerProps) {
  const [logs, setLogs] = useState<NotificationLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [channelFilter, setChannelFilter] = useState<NotificationChannel | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLog, setSelectedLog] = useState<NotificationLogEntry | null>(null)
  const { toast } = useToast()

  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, total: totalCount, error } = await getRecentLogs({
        limit: pageSize,
        offset: page * pageSize,
        channel: channelFilter !== 'all' ? channelFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      })

      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        })
        return
      }

      // Apply client-side search filter if needed
      let filteredData = data
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filteredData = data.filter(
          (log) =>
            log.subject?.toLowerCase().includes(query) ||
            log.body?.toLowerCase().includes(query) ||
            log.recipient_email?.toLowerCase().includes(query) ||
            log.recipient_phone?.includes(query)
        )
      }

      setLogs(filteredData)
      setTotal(totalCount)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load notification logs',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, channelFilter, statusFilter, searchQuery, toast])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const totalPages = Math.ceil(total / pageSize)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm')
  }

  const getEntityLink = (log: NotificationLogEntry) => {
    if (!log.entity_type || !log.entity_id) return null

    const linkMap: Record<string, string> = {
      job_order: `/job-orders/${log.entity_id}`,
      invoice: `/invoices/${log.entity_id}`,
      incident: `/hse/incidents/${log.entity_id}`,
      document: `/documents/${log.entity_id}`,
      maintenance: `/equipment/maintenance/${log.entity_id}`,
      pjo: `/pjo/${log.entity_id}`,
    }

    return linkMap[log.entity_type] || null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Notification Log</CardTitle>
            <CardDescription>
              View and track all sent notifications
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by subject, body, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select
            value={channelFilter}
            onValueChange={(value) => {
              setChannelFilter(value as NotificationChannel | 'all')
              setPage(0)
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              {NOTIFICATION_CHANNELS.map((channel) => (
                <SelectItem key={channel} value={channel}>
                  <div className="flex items-center gap-2">
                    <ChannelIcon channel={channel} />
                    {CHANNEL_LABELS[channel]}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as NotificationStatus | 'all')
              setPage(0)
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {NOTIFICATION_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={status} />
                    {STATUS_LABELS[status]}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No notification logs found
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Channel</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject/Title</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[150px]">Sent At</TableHead>
                  <TableHead className="w-[100px]">Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const entityLink = getEntityLink(log)
                  return (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedLog(log)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ChannelIcon channel={log.channel} />
                          <span className="text-sm">{CHANNEL_LABELS[log.channel]}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {log.recipient_email || log.recipient_phone || log.recipient_user_id || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm truncate max-w-[300px]">
                          {log.subject || log.body?.substring(0, 50) || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={log.status} />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(log.sent_at || log.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {entityLink ? (
                          <Link
                            href={entityLink}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                          >
                            {log.entity_type}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} entries
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && <ChannelIcon channel={selectedLog.channel} />}
              Notification Details
            </DialogTitle>
            <DialogDescription>
              {selectedLog && formatDate(selectedLog.created_at)}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Channel</label>
                  <p className="flex items-center gap-2">
                    <ChannelIcon channel={selectedLog.channel} />
                    {CHANNEL_LABELS[selectedLog.channel]}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <StatusBadge status={selectedLog.status} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Recipient</label>
                  <p className="text-sm">
                    {selectedLog.recipient_email || selectedLog.recipient_phone || selectedLog.recipient_user_id || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">External ID</label>
                  <p className="text-sm font-mono">{selectedLog.external_id || '-'}</p>
                </div>
              </div>

              {selectedLog.subject && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Subject</label>
                  <p className="text-sm">{selectedLog.subject}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Body</label>
                <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {selectedLog.body || '-'}
                </div>
              </div>

              {selectedLog.error_message && (
                <div>
                  <label className="text-sm font-medium text-red-600">Error Message</label>
                  <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <label className="text-muted-foreground">Created</label>
                  <p>{formatDate(selectedLog.created_at)}</p>
                </div>
                <div>
                  <label className="text-muted-foreground">Sent</label>
                  <p>{formatDate(selectedLog.sent_at)}</p>
                </div>
                <div>
                  <label className="text-muted-foreground">Delivered</label>
                  <p>{formatDate(selectedLog.delivered_at)}</p>
                </div>
              </div>

              {selectedLog.entity_type && selectedLog.entity_id && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Related Entity</label>
                  <div className="mt-1">
                    {getEntityLink(selectedLog) ? (
                      <Link
                        href={getEntityLink(selectedLog)!}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        {selectedLog.entity_type}: {selectedLog.entity_id}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <p className="text-sm">
                        {selectedLog.entity_type}: {selectedLog.entity_id}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
