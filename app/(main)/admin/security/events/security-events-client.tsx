'use client'

import { useState, useCallback, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  getSecurityEvents,
  markEventInvestigated,
  SecurityEventFilters,
  PaginatedSecurityEvents,
} from '@/app/actions/security-events'
import type { SecurityEvent, SecurityEventType, SecuritySeverity } from '@/lib/security/types'
import {
  RefreshCw,
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  FileText,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface SecurityEventsClientProps {
  initialData: PaginatedSecurityEvents
  stats: {
    totalEvents: number
    byType: Record<string, number>
    bySeverity: Record<SecuritySeverity, number>
    investigatedCount: number
    uninvestigatedCount: number
  }
  currentUser: {
    id: string
    email: string
    role: string
  }
}

const eventTypeOptions: Array<{ value: SecurityEventType | 'all'; label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: 'brute_force', label: 'Brute Force' },
  { value: 'sql_injection_attempt', label: 'SQL Injection' },
  { value: 'xss_attempt', label: 'XSS Attempt' },
  { value: 'unauthorized_access', label: 'Unauthorized Access' },
  { value: 'suspicious_activity', label: 'Suspicious Activity' },
  { value: 'account_lockout', label: 'Account Lockout' },
  { value: 'rate_limit_exceeded', label: 'Rate Limit Exceeded' },
  { value: 'invalid_api_key', label: 'Invalid API Key' },
  { value: 'session_hijack_attempt', label: 'Session Hijack' },
]

const severityOptions: Array<{ value: SecuritySeverity | 'all'; label: string }> = [
  { value: 'all', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const investigatedOptions = [
  { value: 'all', label: 'All Events' },
  { value: 'true', label: 'Investigated' },
  { value: 'false', label: 'Not Investigated' },
]

function getSeverityIcon(severity: SecuritySeverity) {
  switch (severity) {
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-red-600" />
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />
    case 'medium':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    case 'low':
      return <Info className="h-4 w-4 text-blue-500" />
  }
}

function getSeverityBadgeVariant(severity: SecuritySeverity): 'destructive' | 'default' | 'secondary' | 'outline' {
  switch (severity) {
    case 'critical':
      return 'destructive'
    case 'high':
      return 'default'
    case 'medium':
      return 'secondary'
    case 'low':
      return 'outline'
  }
}

function formatEventType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function SecurityEventsClient({
  initialData,
  stats,
}: SecurityEventsClientProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<PaginatedSecurityEvents>(initialData)
  const [filters, setFilters] = useState<SecurityEventFilters>({})
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null)
  const [investigateDialogOpen, setInvestigateDialogOpen] = useState(false)
  const [investigationNotes, setInvestigationNotes] = useState('')

  const fetchData = useCallback(
    async (newFilters: SecurityEventFilters, page: number = 1) => {
      startTransition(async () => {
        const result = await getSecurityEvents(newFilters, { page, pageSize: 25 })
        if (result.success && result.data) {
          setData(result.data)
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to fetch security events',
            variant: 'destructive',
          })
        }
      })
    },
    [toast]
  )

  const handleFiltersChange = useCallback(
    (newFilters: SecurityEventFilters) => {
      setFilters(newFilters)
      fetchData(newFilters, 1)
    },
    [fetchData]
  )

  const handlePageChange = useCallback(
    (page: number) => {
      fetchData(filters, page)
    },
    [fetchData, filters]
  )

  const handleEventTypeChange = (value: string) => {
    const newFilters = {
      ...filters,
      eventType: value === 'all' ? undefined : (value as SecurityEventType),
    }
    handleFiltersChange(newFilters)
  }

  const handleSeverityChange = (value: string) => {
    const newFilters = {
      ...filters,
      severity: value === 'all' ? undefined : (value as SecuritySeverity),
    }
    handleFiltersChange(newFilters)
  }

  const handleInvestigatedChange = (value: string) => {
    const newFilters = {
      ...filters,
      investigated: value === 'all' ? undefined : value === 'true',
    }
    handleFiltersChange(newFilters)
  }

  const clearFilters = () => {
    setFilters({})
    fetchData({}, 1)
  }

  const handleRefresh = () => {
    fetchData(filters, data.page)
  }

  const handleViewEvent = (event: SecurityEvent) => {
    setSelectedEvent(event)
  }

  const handleInvestigateClick = (event: SecurityEvent) => {
    setSelectedEvent(event)
    setInvestigationNotes('')
    setInvestigateDialogOpen(true)
  }

  const handleInvestigateSubmit = async () => {
    if (!selectedEvent) return

    startTransition(async () => {
      const result = await markEventInvestigated(selectedEvent.id, investigationNotes)
      if (result.success) {
        toast({
          title: 'Event Investigated',
          description: 'The security event has been marked as investigated',
        })
        setInvestigateDialogOpen(false)
        setSelectedEvent(null)
        fetchData(filters, data.page)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to mark event as investigated',
          variant: 'destructive',
        })
      }
    })
  }

  const hasActiveFilters = filters.eventType || filters.severity || filters.investigated !== undefined

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.bySeverity.critical}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.bySeverity.high}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investigated</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.investigatedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <XCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.uninvestigatedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Security Events</CardTitle>
              <CardDescription>View and investigate security events</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isPending}
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', isPending && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center">
            <Select
              value={filters.eventType || 'all'}
              onValueChange={handleEventTypeChange}
            >
              <SelectTrigger className="w-full lg:w-[200px]">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                {eventTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.severity || 'all'}
              onValueChange={handleSeverityChange}
            >
              <SelectTrigger className="w-full lg:w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                {severityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {option.value !== 'all' && getSeverityIcon(option.value as SecuritySeverity)}
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.investigated === undefined ? 'all' : String(filters.investigated)}
              onValueChange={handleInvestigatedChange}
            >
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Investigation Status" />
              </SelectTrigger>
              <SelectContent>
                {investigatedOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-3">
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[150px]">Type</TableHead>
                  <TableHead className="w-[100px]">Severity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[120px]">IP Address</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="h-8 w-8" />
                        No security events found
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.data.map((event) => (
                    <TableRow
                      key={event.id}
                      className={cn(
                        event.severity === 'critical' && 'bg-red-50/50',
                        event.severity === 'high' && 'bg-orange-50/50'
                      )}
                    >
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatEventType(event.event_type)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(event.severity)}
                          <Badge variant={getSeverityBadgeVariant(event.severity)}>
                            {event.severity.charAt(0).toUpperCase() + event.severity.slice(1)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate" title={event.description}>
                        {event.description}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {event.ip_address || '-'}
                      </TableCell>
                      <TableCell>
                        {event.investigated ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Done
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewEvent(event)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!event.investigated && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleInvestigateClick(event)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(data.page - 1) * data.pageSize + 1} to{' '}
                {Math.min(data.page * data.pageSize, data.total)} of {data.total} events
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={data.page === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.page - 1)}
                  disabled={data.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {data.page} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.page + 1)}
                  disabled={data.page === data.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.totalPages)}
                  disabled={data.page === data.totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent && !investigateDialogOpen} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Security Event Details</DialogTitle>
            <DialogDescription>
              Event ID: {selectedEvent?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Timestamp</Label>
                  <p className="font-medium">
                    {format(new Date(selectedEvent.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Event Type</Label>
                  <p className="font-medium">{formatEventType(selectedEvent.event_type)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Severity</Label>
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(selectedEvent.severity)}
                    <span className="font-medium">
                      {selectedEvent.severity.charAt(0).toUpperCase() + selectedEvent.severity.slice(1)}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">IP Address</Label>
                  <p className="font-medium">{selectedEvent.ip_address || 'N/A'}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="font-medium">{selectedEvent.description}</p>
              </div>
              {selectedEvent.request_path && (
                <div>
                  <Label className="text-muted-foreground">Request Path</Label>
                  <p className="font-mono text-sm">{selectedEvent.request_path}</p>
                </div>
              )}
              {selectedEvent.user_agent && (
                <div>
                  <Label className="text-muted-foreground">User Agent</Label>
                  <p className="text-sm text-muted-foreground">{selectedEvent.user_agent}</p>
                </div>
              )}
              {selectedEvent.payload_sample && (
                <div>
                  <Label className="text-muted-foreground">Payload Sample</Label>
                  <pre className="mt-1 rounded bg-muted p-2 text-xs overflow-x-auto">
                    {selectedEvent.payload_sample}
                  </pre>
                </div>
              )}
              {selectedEvent.action_taken && (
                <div>
                  <Label className="text-muted-foreground">Action Taken</Label>
                  <p className="font-medium">{selectedEvent.action_taken}</p>
                </div>
              )}
              {selectedEvent.investigated && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <Label className="text-green-700">Investigation Notes</Label>
                  <p className="mt-1 text-green-800">{selectedEvent.investigation_notes || 'No notes provided'}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedEvent && !selectedEvent.investigated && (
              <Button onClick={() => handleInvestigateClick(selectedEvent)}>
                Mark as Investigated
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Investigate Dialog */}
      <Dialog open={investigateDialogOpen} onOpenChange={setInvestigateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Event as Investigated</DialogTitle>
            <DialogDescription>
              Add investigation notes for this security event
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Investigation Notes</Label>
              <Textarea
                id="notes"
                placeholder="Enter your investigation findings..."
                value={investigationNotes}
                onChange={(e) => setInvestigationNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvestigateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvestigateSubmit} disabled={isPending}>
              {isPending ? 'Saving...' : 'Mark as Investigated'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
