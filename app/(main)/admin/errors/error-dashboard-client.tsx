'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { AlertCircle, CheckCircle, Clock, Eye, Search, XCircle } from 'lucide-react'
import { updateErrorStatusAction } from '@/app/actions/error-tracking-actions'
import type { ErrorStatus } from '@/types/error-handling'

interface ErrorRecord {
  id: string
  error_code?: string
  error_hash?: string | null
  timestamp?: string
  error_type?: string
  error_message?: string
  error_stack?: string | null
  module?: string | null
  status?: ErrorStatus | null
  occurrence_count?: number | null
  first_seen_at?: string | null
  last_seen_at?: string | null
  // Allow additional fields from database
  [key: string]: unknown
}

interface ErrorSummary {
  total: number
  byStatus: Record<ErrorStatus, number>
  topErrors: Array<{
    error_hash: string | null
    error_message: string
    occurrence_count: number
  }>
}

interface Props {
  initialErrors: ErrorRecord[]
  initialSummary: ErrorSummary | null
  currentUser: { id: string; email: string | null; role: string }
}

const statusColors: Record<ErrorStatus, string> = {
  new: 'bg-red-100 text-red-800',
  investigating: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  ignored: 'bg-gray-100 text-gray-800',
}

const statusIcons: Record<ErrorStatus, React.ReactNode> = {
  new: <AlertCircle className="h-4 w-4" />,
  investigating: <Clock className="h-4 w-4" />,
  resolved: <CheckCircle className="h-4 w-4" />,
  ignored: <XCircle className="h-4 w-4" />,
}

export function ErrorDashboardClient({ initialErrors, initialSummary }: Props) {
  const [errors, setErrors] = useState(initialErrors)
  const [summary] = useState(initialSummary)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedError, setSelectedError] = useState<ErrorRecord | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const filteredErrors = errors.filter((error) => {
    const matchesStatus = statusFilter === 'all' || error.status === statusFilter
    const matchesSearch = searchQuery === '' || 
      error.error_message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      error.error_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (error.module?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    return matchesStatus && matchesSearch
  })

  const handleStatusUpdate = async (errorId: string, newStatus: ErrorStatus) => {
    setIsUpdating(true)
    const result = await updateErrorStatusAction(
      errorId,
      newStatus,
      newStatus === 'resolved' ? resolutionNotes : undefined
    )
    
    if (result.success) {
      setErrors(errors.map(e => 
        e.id === errorId ? { ...e, status: newStatus } : e
      ))
      setIsDetailOpen(false)
      setResolutionNotes('')
    }
    setIsUpdating(false)
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.byStatus.new}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Investigating</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{summary.byStatus.investigating}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.byStatus.resolved}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Error List</CardTitle>
          <CardDescription>View and manage application errors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search errors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="ignored">Ignored</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredErrors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No errors found
                  </TableCell>
                </TableRow>
              ) : (
                filteredErrors.map((error) => (
                  <TableRow key={error.id}>
                    <TableCell className="font-mono text-xs">{error.error_code}</TableCell>
                    <TableCell>{error.error_type}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{error.error_message}</TableCell>
                    <TableCell>{error.module || '-'}</TableCell>
                    <TableCell>{error.occurrence_count || 1}</TableCell>
                    <TableCell>
                      {error.status && (
                        <Badge className={statusColors[error.status]}>
                          {statusIcons[error.status]}
                          <span className="ml-1">{error.status}</span>
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(error.last_seen_at)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedError(error)
                          setIsDetailOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Error Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
            <DialogDescription>
              {selectedError?.error_code}
            </DialogDescription>
          </DialogHeader>
          
          {selectedError && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <p className="text-sm text-muted-foreground">{selectedError.error_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Module</label>
                  <p className="text-sm text-muted-foreground">{selectedError.module || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">First Seen</label>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedError.first_seen_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Seen</label>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedError.last_seen_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Occurrences</label>
                  <p className="text-sm text-muted-foreground">{selectedError.occurrence_count || 1}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm">
                    {selectedError.status && (
                      <Badge className={statusColors[selectedError.status]}>
                        {selectedError.status}
                      </Badge>
                    )}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Message</label>
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded mt-1">
                  {selectedError.error_message}
                </p>
              </div>

              {selectedError.error_stack && (
                <div>
                  <label className="text-sm font-medium">Stack Trace</label>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto max-h-[200px]">
                    {selectedError.error_stack}
                  </pre>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Update Status</label>
                <div className="flex gap-2 mt-2">
                  {(['new', 'investigating', 'resolved', 'ignored'] as ErrorStatus[]).map((status) => (
                    <Button
                      key={status}
                      variant={selectedError.status === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedError.id, status)}
                      disabled={isUpdating || selectedError.status === status}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedError.status !== 'resolved' && (
                <div>
                  <label className="text-sm font-medium">Resolution Notes</label>
                  <Textarea
                    placeholder="Add notes when resolving..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
