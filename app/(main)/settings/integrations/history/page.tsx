'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  IntegrationConnection,
  SyncLog,
  SyncStatus,
  VALID_SYNC_STATUSES,
} from '@/types/integration'
import { listConnections } from '@/lib/integration-actions'
import { listSyncLogs, getSyncStats } from '@/lib/sync-log-actions'
import {
  formatSyncStatus,
  getSyncStatusColor,
} from '@/lib/integration-utils'
import {
  calculateSyncDuration,
  formatSyncDuration,
} from '@/lib/sync-log-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  ArrowLeft,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Activity,
  FileText,
  AlertCircle,
} from 'lucide-react'


// Status icons
const STATUS_ICONS: Record<SyncStatus, React.ReactNode> = {
  running: <Clock className="h-4 w-4 animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  partial: <AlertTriangle className="h-4 w-4" />,
}

// Sync type labels
const SYNC_TYPE_LABELS: Record<string, string> = {
  push: 'Push',
  pull: 'Pull',
  full_sync: 'Full Sync',
}

export default function SyncHistoryPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [connections, setConnections] = useState<IntegrationConnection[]>([])
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [stats, setStats] = useState<{
    total_syncs: number;
    successful_syncs: number;
    failed_syncs: number;
    partial_syncs: number;
    total_records_processed: number;
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionFilter, setConnectionFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadLogs()
  }, [connectionFilter, statusFilter, fromDate, toDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setIsLoading(true)
    
    // Load connections for filter dropdown
    const connResult = await listConnections()
    if (connResult.success && connResult.data) {
      setConnections(connResult.data)
    }

    // Load stats
    const statsResult = await getSyncStats()
    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data)
    }

    await loadLogs()
    setIsLoading(false)
  }

  const loadLogs = async () => {
    const filters: {
      connection_id?: string;
      status?: SyncStatus;
      from_date?: string;
      to_date?: string;
    } = {}

    if (connectionFilter !== 'all') {
      filters.connection_id = connectionFilter
    }
    if (statusFilter !== 'all') {
      filters.status = statusFilter as SyncStatus
    }
    if (fromDate) {
      filters.from_date = new Date(fromDate).toISOString()
    }
    if (toDate) {
      filters.to_date = new Date(toDate + 'T23:59:59').toISOString()
    }

    const result = await listSyncLogs(Object.keys(filters).length > 0 ? filters : undefined)
    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load sync logs',
        variant: 'destructive',
      })
    } else {
      setLogs(result.data || [])
    }
  }

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const getConnectionName = (connectionId: string): string => {
    const conn = connections.find(c => c.id === connectionId)
    return conn?.connection_name || connectionId
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }


  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/settings/integrations')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          <h1 className="text-2xl font-bold">Sync History</h1>
          <p className="text-muted-foreground mt-1">
            View synchronization logs and error details
          </p>
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Syncs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{stats.total_syncs}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Successful
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{stats.successful_syncs}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold">{stats.failed_syncs}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Records Processed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" />
                <span className="text-2xl font-bold">{stats.total_records_processed.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Select value={connectionFilter} onValueChange={setConnectionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Connection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Connections</SelectItem>
                {connections.map((conn) => (
                  <SelectItem key={conn.id} value={conn.id}>
                    {conn.connection_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {VALID_SYNC_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatSyncStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">From:</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">To:</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No sync logs found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sync operations will appear here once executed
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Connection</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const isExpanded = expandedLogs.has(log.id)
                  const hasErrors = log.error_details && log.error_details.length > 0
                  const duration = calculateSyncDuration(log)

                  return (
                    <Collapsible key={log.id} open={isExpanded} onOpenChange={() => toggleExpanded(log.id)} asChild>
                      <>
                        <TableRow className={hasErrors ? 'cursor-pointer hover:bg-muted/50' : ''}>
                          <TableCell>
                            {hasErrors && (
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{getConnectionName(log.connection_id)}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {SYNC_TYPE_LABELS[log.sync_type] || log.sync_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getSyncStatusColor(log.status)}>
                              <span className="flex items-center gap-1">
                                {STATUS_ICONS[log.status]}
                                {formatSyncStatus(log.status)}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className="text-green-600">{log.records_created} created</span>
                              {' / '}
                              <span className="text-blue-600">{log.records_updated} updated</span>
                              {log.records_failed > 0 && (
                                <>
                                  {' / '}
                                  <span className="text-red-600">{log.records_failed} failed</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatSyncDuration(duration)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(log.started_at)}
                            </span>
                          </TableCell>
                        </TableRow>
                        {hasErrors && (
                          <CollapsibleContent asChild>
                            <TableRow className="bg-red-50/50">
                              <TableCell colSpan={7} className="p-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                                    <AlertCircle className="h-4 w-4" />
                                    Error Details ({log.error_details!.length} errors)
                                  </div>
                                  <div className="max-h-[200px] overflow-y-auto space-y-2">
                                    {log.error_details!.map((error, idx) => (
                                      <div key={idx} className="bg-white p-3 rounded border border-red-200 text-sm">
                                        <div className="flex items-center justify-between mb-1">
                                          <code className="text-xs bg-red-100 px-2 py-0.5 rounded">
                                            {error.error_code}
                                          </code>
                                          <span className="text-xs text-muted-foreground">
                                            Record: {error.record_id}
                                          </span>
                                        </div>
                                        <p className="text-red-700">{error.error_message}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        )}
                      </>
                    </Collapsible>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
