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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { AuditLogEntry, PaginatedAuditLogs } from '@/types/audit'
import {
  formatAction,
  formatModule,
  formatAuditLogDescription,
  getChangedFieldDetails,
} from '@/lib/system-audit-utils'
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  User,
  Clock,
  FileText,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface AuditLogTableProps {
  data: PaginatedAuditLogs
  onPageChange: (page: number) => void
  loading?: boolean
}

function getActionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  switch (action.toLowerCase()) {
    case 'create':
    case 'insert':
      return 'success'
    case 'update':
      return 'warning'
    case 'delete':
      return 'destructive'
    case 'approve':
      return 'success'
    case 'reject':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function getStatusBadgeVariant(status: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'success':
      return 'default'
    case 'failure':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function formatTimestamp(timestamp: string): string {
  return format(new Date(timestamp), 'MMM dd, yyyy HH:mm:ss')
}

function JsonDiffView({
  oldValues,
  newValues,
  changedFields,
}: {
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  changedFields: string[] | null
}) {
  const changes = getChangedFieldDetails(oldValues, newValues)
  const changedFieldSet = new Set(changedFields || [])

  if (changes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No changes recorded
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {changes.map((change) => (
        <div
          key={change.field}
          className={cn(
            'rounded-md border p-2 text-sm',
            changedFieldSet.has(change.field)
              ? 'border-yellow-200 bg-yellow-50'
              : 'border-gray-200 bg-gray-50'
          )}
        >
          <div className="font-medium text-gray-700">{change.field}</div>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div>
              <span className="text-xs text-muted-foreground">Old:</span>
              <pre className="mt-0.5 overflow-auto rounded bg-red-50 p-1 text-xs text-red-700">
                {change.old_value !== null && change.old_value !== undefined
                  ? JSON.stringify(change.old_value, null, 2)
                  : 'null'}
              </pre>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">New:</span>
              <pre className="mt-0.5 overflow-auto rounded bg-green-50 p-1 text-xs text-green-700">
                {change.new_value !== null && change.new_value !== undefined
                  ? JSON.stringify(change.new_value, null, 2)
                  : 'null'}
              </pre>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function AuditLogRow({ entry }: { entry: AuditLogEntry }) {
  const [isOpen, setIsOpen] = useState(false)
  const description = formatAuditLogDescription(entry)
  const hasDetails =
    entry.old_values || entry.new_values || entry.changed_fields?.length

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow className="group">
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
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{entry.timestamp ? formatTimestamp(entry.timestamp) : '-'}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {entry.user_email || 'System'}
              </span>
              {entry.user_role && (
                <span className="text-xs text-muted-foreground">
                  {entry.user_role}
                </span>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={getActionBadgeVariant(entry.action || 'view')}>
            {formatAction(entry.action || 'view')}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {(entry.entity_type || 'unknown').replace(/_/g, ' ')}
            </span>
            {entry.entity_reference && (
              <span className="text-xs text-muted-foreground">
                {entry.entity_reference}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <span className="text-sm text-muted-foreground">
            {entry.module ? formatModule(entry.module) : '-'}
          </span>
        </TableCell>
        <TableCell>
          <div className="max-w-[200px] truncate text-sm">
            {description.summary}
          </div>
          {description.changed_fields_summary && (
            <div className="text-xs text-muted-foreground">
              {description.changed_fields_summary}
            </div>
          )}
        </TableCell>
        <TableCell>
          {entry.status && (
            <Badge variant={getStatusBadgeVariant(entry.status)}>
              {entry.status}
            </Badge>
          )}
        </TableCell>
      </TableRow>
      {hasDetails && (
        <CollapsibleContent asChild>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableCell colSpan={8} className="p-4">
              <div className="space-y-4">
                {/* Entry Details */}
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  {entry.entity_id && (
                    <div>
                      <span className="text-muted-foreground">Entity ID:</span>
                      <span className="ml-2 font-mono text-xs">
                        {entry.entity_id}
                      </span>
                    </div>
                  )}
                  {entry.ip_address && (
                    <div>
                      <span className="text-muted-foreground">IP Address:</span>
                      <span className="ml-2">{entry.ip_address}</span>
                    </div>
                  )}
                  {entry.request_method && entry.request_path && (
                    <div>
                      <span className="text-muted-foreground">Request:</span>
                      <span className="ml-2 font-mono text-xs">
                        {entry.request_method} {entry.request_path}
                      </span>
                    </div>
                  )}
                  {entry.session_id && (
                    <div>
                      <span className="text-muted-foreground">Session:</span>
                      <span className="ml-2 font-mono text-xs">
                        {entry.session_id.substring(0, 8)}...
                      </span>
                    </div>
                  )}
                </div>

                {/* Changed Fields */}
                {entry.changed_fields && entry.changed_fields.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium">Changed Fields</h4>
                    <div className="flex flex-wrap gap-1">
                      {entry.changed_fields.map((field) => (
                        <Badge
                          key={field}
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700"
                        >
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Values Diff */}
                {(entry.old_values || entry.new_values) && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium">Value Changes</h4>
                    <JsonDiffView
                      oldValues={entry.old_values ?? null}
                      newValues={entry.new_values ?? null}
                      changedFields={entry.changed_fields ?? null}
                    />
                  </div>
                )}

                {/* Error Message */}
                {entry.error_message && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-2">
                    <span className="text-sm font-medium text-red-700">
                      Error:
                    </span>
                    <span className="ml-2 text-sm text-red-600">
                      {entry.error_message}
                    </span>
                  </div>
                )}

                {/* Description */}
                {entry.description && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      {entry.description}
                    </span>
                  </div>
                )}
              </div>
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

export function AuditLogTable({
  data,
  onPageChange,
  loading = false,
}: AuditLogTableProps) {
  const entries = data.data ?? data.logs ?? []
  const page = data.page ?? 1
  const page_size = data.page_size ?? data.pageSize ?? 10
  const total = data.total ?? 0
  const total_pages = data.total_pages ?? data.totalPages ?? 1

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[200px]">User</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
              <TableHead className="w-[150px]">Entity</TableHead>
              <TableHead className="w-[120px]">Module</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8" />
                    No audit logs found
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <AuditLogRow key={entry.id} entry={entry} />
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
