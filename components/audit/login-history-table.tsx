'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  LoginHistoryEntry,
  PaginatedLoginHistory,
  LoginStatus,
  LoginHistoryFilters,
} from '@/types/login-history'
import {
  formatLoginStatus,
  formatLoginMethod,
  formatSessionDuration,
  formatLoginTimestamp,
  formatDeviceInfo,
  formatLocationInfo,
} from '@/lib/login-history-utils'
import {
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
  CheckCircle,
  XCircle,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  CalendarIcon,
  User,
  FileText,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { DateRange } from 'react-day-picker'

interface LoginHistoryTableProps {
  data: PaginatedLoginHistory
  filters: LoginHistoryFilters
  onFiltersChange: (filters: LoginHistoryFilters) => void
  onPageChange: (page: number) => void
  loading?: boolean
  users?: Array<{ id: string; email: string }>
}

function getStatusIcon(status: LoginStatus) {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />
  }
}

function getStatusBadgeVariant(status: LoginStatus): 'success' | 'destructive' {
  return status === 'success' ? 'success' : 'destructive'
}

function getDeviceIcon(deviceType: string | null) {
  switch (deviceType) {
    case 'desktop':
      return <Monitor className="h-4 w-4 text-muted-foreground" />
    case 'mobile':
      return <Smartphone className="h-4 w-4 text-muted-foreground" />
    case 'tablet':
      return <Tablet className="h-4 w-4 text-muted-foreground" />
    default:
      return <Monitor className="h-4 w-4 text-muted-foreground" />
  }
}

function LoginHistoryRow({ entry, userEmail }: { entry: LoginHistoryEntry; userEmail?: string }) {
  return (
    <TableRow className={cn(
      entry.status === 'failed' && 'bg-red-50/50'
    )}>
      <TableCell>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {userEmail || entry.user_id.substring(0, 8) + '...'}
          </span>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-sm">
            {formatLoginTimestamp(entry.login_at)}
          </span>
          {entry.logout_at && (
            <span className="text-xs text-muted-foreground">
              Out: {formatLoginTimestamp(entry.logout_at)}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {getStatusIcon(entry.status)}
          <Badge variant={getStatusBadgeVariant(entry.status)}>
            {formatLoginStatus(entry.status)}
          </Badge>
        </div>
        {entry.failure_reason && (
          <span className="mt-1 block text-xs text-red-600">
            {entry.failure_reason}
          </span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline">
          {formatLoginMethod(entry.login_method)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {getDeviceIcon(entry.device_type)}
          <div className="flex flex-col">
            <span className="text-sm">{formatDeviceInfo(entry)}</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {formatSessionDuration(entry.session_duration_minutes)}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {(entry.country || entry.city) && (
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{formatLocationInfo(entry)}</span>
          </div>
        )}
        {entry.ip_address && (
          <span className="text-xs text-muted-foreground">
            {entry.ip_address}
          </span>
        )}
      </TableCell>
    </TableRow>
  )
}

const statusOptions: Array<{ value: LoginStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
]

export function LoginHistoryTable({
  data,
  filters,
  onFiltersChange,
  onPageChange,
  loading = false,
  users = [],
}: LoginHistoryTableProps) {
  const { data: entries, page, page_size, total, total_pages } = data
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    filters.start_date && filters.end_date
      ? {
          from: new Date(filters.start_date),
          to: new Date(filters.end_date),
        }
      : undefined
  )

  // Create a map of user IDs to emails for display
  const userMap = new Map(users.map((u) => [u.id, u.email]))

  const handleUserChange = (userId: string) => {
    onFiltersChange({
      ...filters,
      user_id: userId === 'all' ? undefined : userId,
    })
  }

  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      status: status === 'all' ? undefined : (status as LoginStatus),
    })
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
    onFiltersChange({
      ...filters,
      start_date: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
      end_date: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
    })
  }

  const clearFilters = () => {
    setDateRange(undefined)
    onFiltersChange({})
  }

  const hasActiveFilters =
    filters.user_id ||
    filters.status ||
    filters.start_date ||
    filters.end_date

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        {/* User Filter */}
        <Select
          value={filters.user_id || 'all'}
          onValueChange={handleUserChange}
        >
          <SelectTrigger className="w-full lg:w-[250px]">
            <SelectValue placeholder="Filter by user" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={(filters.status as string) || 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-full lg:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.value !== 'all' && getStatusIcon(option.value as LoginStatus)}
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal lg:w-[280px]',
                !dateRange && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'LLL dd, y')} -{' '}
                    {format(dateRange.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(dateRange.from, 'LLL dd, y')
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={handleDateRangeChange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 px-3"
          >
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
              <TableHead className="w-[200px]">User</TableHead>
              <TableHead className="w-[180px]">Login Time</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[100px]">Method</TableHead>
              <TableHead className="w-[200px]">Device</TableHead>
              <TableHead className="w-[120px]">Duration</TableHead>
              <TableHead>Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8" />
                    No login history found
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <LoginHistoryRow
                  key={entry.id}
                  entry={entry}
                  userEmail={userMap.get(entry.user_id)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total_pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * page_size + 1} to{' '}
            {Math.min(page * page_size, total)} of {total} entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === total_pages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(total_pages)}
              disabled={page === total_pages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
