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
import { Input } from '@/components/ui/input'
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
import {
  SystemLogEntry,
  PaginatedSystemLogs,
  SystemLogLevel,
  SystemLogFilters,
} from '@/types/system-log'
import {
  formatLogLevel,
  formatLogTimestamp,
  formatStackTrace,
} from '@/lib/system-log-utils'
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Search,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SystemLogTableProps {
  data: PaginatedSystemLogs
  filters: SystemLogFilters
  onFiltersChange: (filters: SystemLogFilters) => void
  onPageChange: (page: number) => void
  loading?: boolean
}

function getLevelIcon(level: SystemLogLevel) {
  switch (level) {
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    case 'warn':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    case 'info':
      return <Info className="h-4 w-4 text-blue-500" />
    case 'debug':
      return <Bug className="h-4 w-4 text-gray-500" />
  }
}

function getLevelBadgeClass(level: SystemLogLevel): string {
  switch (level) {
    case 'error':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'warn':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'info':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'debug':
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function SystemLogRow({ entry }: { entry: SystemLogEntry }) {
  const [isOpen, setIsOpen] = useState(false)
  const hasDetails = entry.error_stack || entry.data && Object.keys(entry.data).length > 0

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow className={cn(
        'group',
        entry.level === 'error' && 'bg-red-50/50',
        entry.level === 'warn' && 'bg-yellow-50/50'
      )}>
        <TableCell className="w-[40px]">
          {hasDetails && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          )}
        </TableCell>
        <TableCell className="whitespace-nowrap">
          <span className="text-sm text-muted-foreground">
            {formatLogTimestamp(entry.timestamp)}
          </span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {getLevelIcon(entry.level)}
            <Badge
              variant="outline"
              className={cn('font-medium', getLevelBadgeClass(entry.level))}
            >
              {formatLogLevel(entry.level)}
            </Badge>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{entry.source}</span>
            {entry.module && (
              <span className="text-xs text-muted-foreground">
                {entry.module}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="max-w-[400px]">
          <div className="truncate text-sm">{entry.message}</div>
          {entry.error_type && (
            <span className="text-xs font-medium text-red-600">
              {entry.error_type}
            </span>
          )}
        </TableCell>
        <TableCell>
          {entry.function_name && (
            <span className="font-mono text-xs text-muted-foreground">
              {entry.function_name}
            </span>
          )}
        </TableCell>
        <TableCell>
          {entry.request_id && (
            <span className="font-mono text-xs text-muted-foreground">
              {entry.request_id.substring(0, 8)}...
            </span>
          )}
        </TableCell>
      </TableRow>
      {hasDetails && (
        <CollapsibleContent asChild>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableCell colSpan={7} className="p-4">
              <div className="space-y-4">
                {/* Stack Trace */}
                {entry.error_stack && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-red-700">
                      Stack Trace
                    </h4>
                    <pre className="overflow-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
                      {formatStackTrace(entry.error_stack, 20)}
                    </pre>
                  </div>
                )}

                {/* Additional Data */}
                {entry.data && Object.keys(entry.data).length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium">Additional Data</h4>
                    <pre className="overflow-auto rounded-md bg-gray-100 p-3 text-xs">
                      {JSON.stringify(entry.data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Context Info */}
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  {entry.user_id && (
                    <div>
                      <span className="text-muted-foreground">User ID:</span>
                      <span className="ml-2 font-mono text-xs">
                        {entry.user_id}
                      </span>
                    </div>
                  )}
                  {entry.request_id && (
                    <div>
                      <span className="text-muted-foreground">Request ID:</span>
                      <span className="ml-2 font-mono text-xs">
                        {entry.request_id}
                      </span>
                    </div>
                  )}
                  {entry.function_name && (
                    <div>
                      <span className="text-muted-foreground">Function:</span>
                      <span className="ml-2 font-mono text-xs">
                        {entry.function_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

const levelOptions: Array<{ value: SystemLogLevel | 'all'; label: string }> = [
  { value: 'all', label: 'All Levels' },
  { value: 'error', label: 'Error' },
  { value: 'warn', label: 'Warning' },
  { value: 'info', label: 'Info' },
  { value: 'debug', label: 'Debug' },
]

export function SystemLogTable({
  data,
  filters,
  onFiltersChange,
  onPageChange,
  loading = false,
}: SystemLogTableProps) {
  const { data: entries, page, page_size, total, total_pages } = data

  const handleLevelChange = (level: string) => {
    onFiltersChange({
      ...filters,
      level: level === 'all' ? undefined : (level as SystemLogLevel),
    })
  }

  const handleSearchChange = (search: string) => {
    onFiltersChange({
      ...filters,
      search: search || undefined,
    })
  }

  const handleSourceChange = (source: string) => {
    onFiltersChange({
      ...filters,
      source: source || undefined,
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search in messages..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={(filters.level as string) || 'all'}
          onValueChange={handleLevelChange}
        >
          <SelectTrigger className="w-full lg:w-[150px]">
            <SelectValue placeholder="Log level" />
          </SelectTrigger>
          <SelectContent>
            {levelOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.value !== 'all' && getLevelIcon(option.value as SystemLogLevel)}
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Filter by source..."
          value={filters.source || ''}
          onChange={(e) => handleSourceChange(e.target.value)}
          className="w-full lg:w-[200px]"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[100px]">Level</TableHead>
              <TableHead className="w-[150px]">Source</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-[150px]">Function</TableHead>
              <TableHead className="w-[100px]">Request ID</TableHead>
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
                    No system logs found
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <SystemLogRow key={entry.id} entry={entry} />
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
