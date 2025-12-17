'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Download, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { UserProfile } from '@/types/permissions'
import {
  ActivityLogEntry,
  ActivityLogFilters,
  ActivityLogUser,
  ACTION_TYPE_OPTIONS,
  ENTITY_TYPE_OPTIONS,
  DATE_RANGE_OPTIONS,
  DateRange,
} from '@/types/activity-log'
import {
  formatActionType,
  formatEntityType,
  formatRelativeTime,
  formatDetails,
  getEntityUrl,
  hasViewableEntity,
  exportToCsv,
} from '@/lib/activity-log-utils'
import { getActivityLogs, getActivityLogsForExport } from './actions'

interface ActivityLogClientProps {
  initialLogs: ActivityLogEntry[]
  initialTotal: number
  users: ActivityLogUser[]
  userProfile: UserProfile
}

const PAGE_SIZE = 25

export function ActivityLogClient({
  initialLogs,
  initialTotal,
  users,
  userProfile,
}: ActivityLogClientProps) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>(initialLogs)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [isExporting, setIsExporting] = useState(false)

  const [filters, setFilters] = useState<ActivityLogFilters>({
    actionType: 'all',
    entityType: 'all',
    userId: 'all',
    dateRange: 'last7',
  })

  const canFilterByUser = userProfile.role === 'owner' || userProfile.role === 'admin'
  const canExport = userProfile.role === 'owner' || userProfile.role === 'admin'

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const fetchLogs = (newFilters: ActivityLogFilters, newPage: number) => {
    startTransition(async () => {
      const result = await getActivityLogs(newFilters, newPage, PAGE_SIZE)
      setLogs(result.logs)
      setTotal(result.total)
    })
  }

  const handleFilterChange = (key: keyof ActivityLogFilters, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    setPage(1)
    fetchLogs(newFilters, 1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchLogs(filters, newPage)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const allLogs = await getActivityLogsForExport(filters)
      exportToCsv(allLogs)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Activity Log</CardTitle>
        {canExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Select
            value={filters.actionType || 'all'}
            onValueChange={(value) => handleFilterChange('actionType', value)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canFilterByUser && (
            <Select
              value={filters.userId || 'all'}
              onValueChange={(value) => handleFilterChange('userId', value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={filters.entityType || 'all'}
            onValueChange={(value) => handleFilterChange('entityType', value)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.dateRange}
            onValueChange={(value) => handleFilterChange('dateRange', value as DateRange)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Time</TableHead>
                <TableHead className="w-[150px]">User</TableHead>
                <TableHead className="w-[120px]">Action</TableHead>
                <TableHead className="w-[140px]">Entity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No activity logs found
                  </TableCell>
                </TableRow>
              ) : (
                // Data rows
                logs.map((log) => {
                  const entityUrl = getEntityUrl(log.document_type, log.document_id)
                  const showViewLink = hasViewableEntity(log.action_type, log.document_type) && entityUrl

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelativeTime(log.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.user_name.split('@')[0]}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                          {formatActionType(log.action_type)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {log.document_number ? (
                          <span className="font-mono text-sm">
                            {log.document_number}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {formatDetails(log.details)}
                      </TableCell>
                      <TableCell>
                        {showViewLink && (
                          <Link href={entityUrl}>
                            <Button variant="ghost" size="sm" className="h-8 px-2">
                              <ExternalLink className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} entries
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || isPending}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages || isPending}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
