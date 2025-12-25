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
import { AlertCircle, CheckCircle, Clock, Eye, RefreshCw, Search, XCircle } from 'lucide-react'
import { retryJobAction, markJobResolvedAction } from '@/app/actions/job-failure-actions'
import { useToast } from '@/hooks/use-toast'
import type { JobStatus } from '@/types/job-failure'

interface JobFailure {
  id: string
  job_type: string
  job_id: string | null
  failed_at: string
  error_message: string
  error_stack: string | null
  job_data: Record<string, unknown> | null
  retry_count: number
  max_retries: number
  next_retry_at: string | null
  status: JobStatus
  resolved_at: string | null
}

interface JobStats {
  total: number
  byStatus: Record<JobStatus, number>
  byJobType: Record<string, number>
}

interface Props {
  initialFailures: JobFailure[]
  initialStats: JobStats | null
  currentUser: { id: string; email: string | null; role: string }
}

const statusColors: Record<JobStatus, string> = {
  failed: 'bg-red-100 text-red-800',
  retrying: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  abandoned: 'bg-gray-100 text-gray-800',
}

const statusIcons: Record<JobStatus, React.ReactNode> = {
  failed: <AlertCircle className="h-4 w-4" />,
  retrying: <Clock className="h-4 w-4" />,
  resolved: <CheckCircle className="h-4 w-4" />,
  abandoned: <XCircle className="h-4 w-4" />,
}

export function JobFailuresClient({ initialFailures, initialStats, currentUser }: Props) {
  const [failures, setFailures] = useState(initialFailures)
  const [stats] = useState(initialStats)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedJob, setSelectedJob] = useState<JobFailure | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const filteredFailures = failures.filter((failure) => {
    const matchesStatus = statusFilter === 'all' || failure.status === statusFilter
    const matchesSearch = searchQuery === '' || 
      failure.job_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      failure.error_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (failure.job_id?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    return matchesStatus && matchesSearch
  })

  const handleRetry = async (failureId: string) => {
    setIsProcessing(true)
    const result = await retryJobAction(failureId)
    
    if (result.success) {
      setFailures(failures.map(f => 
        f.id === failureId ? { ...f, status: 'retrying' as JobStatus, retry_count: f.retry_count + 1 } : f
      ))
      toast({
        title: 'Retry Scheduled',
        description: 'Job has been scheduled for retry',
      })
    } else {
      toast({
        title: 'Retry Failed',
        description: result.error || 'Failed to schedule retry',
        variant: 'destructive',
      })
    }
    setIsProcessing(false)
  }

  const handleResolve = async (failureId: string) => {
    setIsProcessing(true)
    const result = await markJobResolvedAction(failureId)
    
    if (result.success) {
      setFailures(failures.map(f => 
        f.id === failureId ? { ...f, status: 'resolved' as JobStatus } : f
      ))
      toast({
        title: 'Job Resolved',
        description: 'Job has been marked as resolved',
      })
      setIsDetailOpen(false)
    } else {
      toast({
        title: 'Failed',
        description: result.error || 'Failed to resolve job',
        variant: 'destructive',
      })
    }
    setIsProcessing(false)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const canRetry = (failure: JobFailure) => {
    return failure.status === 'failed' && failure.retry_count < failure.max_retries
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Failures</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.byStatus.failed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retrying</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.byStatus.retrying}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.byStatus.resolved}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Failures List */}
      <Card>
        <CardHeader>
          <CardTitle>Job Failures</CardTitle>
          <CardDescription>Failed background jobs with retry management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
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
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="retrying">Retrying</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Type</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Failed At</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFailures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No job failures found
                  </TableCell>
                </TableRow>
              ) : (
                filteredFailures.map((failure) => (
                  <TableRow key={failure.id}>
                    <TableCell className="font-medium">{failure.job_type}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{failure.error_message}</TableCell>
                    <TableCell>{failure.retry_count}/{failure.max_retries}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[failure.status]}>
                        {statusIcons[failure.status]}
                        <span className="ml-1">{failure.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(failure.failed_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedJob(failure)
                            setIsDetailOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canRetry(failure) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetry(failure.id)}
                            disabled={isProcessing}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Job Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Failure Details</DialogTitle>
            <DialogDescription>{selectedJob?.job_type}</DialogDescription>
          </DialogHeader>
          
          {selectedJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Job ID</label>
                  <p className="text-sm text-muted-foreground font-mono">{selectedJob.job_id || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm">
                    <Badge className={statusColors[selectedJob.status]}>
                      {selectedJob.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Failed At</label>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedJob.failed_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Retry Count</label>
                  <p className="text-sm text-muted-foreground">{selectedJob.retry_count}/{selectedJob.max_retries}</p>
                </div>
                {selectedJob.next_retry_at && (
                  <div>
                    <label className="text-sm font-medium">Next Retry</label>
                    <p className="text-sm text-muted-foreground">{formatDate(selectedJob.next_retry_at)}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Error Message</label>
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded mt-1">
                  {selectedJob.error_message}
                </p>
              </div>

              {selectedJob.error_stack && (
                <div>
                  <label className="text-sm font-medium">Stack Trace</label>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto max-h-[200px]">
                    {selectedJob.error_stack}
                  </pre>
                </div>
              )}

              {selectedJob.job_data && Object.keys(selectedJob.job_data).length > 0 && (
                <div>
                  <label className="text-sm font-medium">Job Data</label>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto max-h-[150px]">
                    {JSON.stringify(selectedJob.job_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedJob && canRetry(selectedJob) && (
              <Button
                variant="outline"
                onClick={() => handleRetry(selectedJob.id)}
                disabled={isProcessing}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
            {selectedJob && selectedJob.status !== 'resolved' && (
              <Button
                onClick={() => handleResolve(selectedJob.id)}
                disabled={isProcessing}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark Resolved
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
