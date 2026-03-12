'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReportColumn, RowHighlight } from '@/types/reports'
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/reports/report-utils'

interface ReportTableProps<T> {
  columns: ReportColumn<T>[]
  data: T[]
  pageSize?: number
  onRowClick?: (row: T) => void
  highlightCondition?: (row: T) => RowHighlight
  emptyMessage?: string
}

export function ReportTable<T extends object>({
  columns,
  data,
  pageSize = 25,
  onRowClick,
  highlightCondition,
  emptyMessage = 'No data available',
}: ReportTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  
  const totalPages = Math.ceil(data.length / pageSize) || 1
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const pageData = data.slice(startIndex, endIndex)

  const formatValue = (value: unknown, columnFormat?: ReportColumn<T>['format']): string => {
    if (value === null || value === undefined) return '-'
    
    switch (columnFormat) {
      case 'currency':
        return formatCurrency(Number(value))
      case 'percentage':
        return formatPercentage(Number(value))
      case 'number':
        return formatNumber(Number(value))
      case 'date':
        if (value instanceof Date) {
          return format(value, 'dd/MM/yyyy')
        }
        return String(value)
      default:
        return String(value)
    }
  }

  const getValue = (row: T, key: string): unknown => {
    const keys = key.split('.')
    let value: unknown = row
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k]
      } else {
        return undefined
      }
    }
    return value
  }

  const getRowHighlightClass = (highlight: RowHighlight): string => {
    switch (highlight) {
      case 'warning':
        return 'bg-yellow-50 hover:bg-yellow-100'
      case 'critical':
        return 'bg-red-50 hover:bg-red-100'
      default:
        return ''
    }
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className={cn(
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center'
                  )}
                  style={{ width: column.width }}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.map((row, rowIndex) => {
              const highlight = highlightCondition?.(row) ?? null
              return (
                <TableRow
                  key={rowIndex}
                  className={cn(
                    getRowHighlightClass(highlight),
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={String(column.key)}
                      className={cn(
                        column.align === 'right' && 'text-right',
                        column.align === 'center' && 'text-center'
                      )}
                    >
                      {formatValue(getValue(row, String(column.key)), column.format as ReportColumn<T>['format'])}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
