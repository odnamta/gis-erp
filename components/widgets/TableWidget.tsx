'use client';

/**
 * TableWidget Component
 * v0.34: Dashboard Widgets & Customization
 * 
 * Displays tabular data with sortable columns.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TableWidgetProps, TableColumn } from '@/types/widgets';

type SortDirection = 'asc' | 'desc' | null;

const statusColors: Record<string, string> = {
  'on-track': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  behind: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

function formatCellValue(value: unknown, key: string): React.ReactNode {
  if (value === null || value === undefined) {
    return '-';
  }

  // Handle status columns
  if (key === 'status' && typeof value === 'string') {
    return (
      <Badge 
        variant="secondary" 
        className={cn('text-xs', statusColors[value] || statusColors.info)}
      >
        {value.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  }

  // Handle numeric values (likely currency)
  if (typeof value === 'number') {
    if (key.includes('revenue') || key.includes('cost') || key.includes('amount')) {
      return `Rp ${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  }

  return String(value);
}

export function TableWidget({ data, isLoading, error, config, onRefresh }: TableWidgetProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (column: TableColumn) => {
    if (!column.sortable) return;

    if (sortColumn === column.key) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column.key);
      setSortDirection('asc');
    }
  };

  const getSortedRows = () => {
    if (!data || !sortColumn || !sortDirection) {
      return data?.rows || [];
    }

    return [...data.rows].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full border-destructive/50">
        <CardContent className="p-4 h-full">
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">Failed to load table</p>
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{config.widget.widget_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No data to display</p>
        </CardContent>
      </Card>
    );
  }

  const sortedRows = getSortedRows();

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{config.widget.widget_name}</CardTitle>
          {data.totalCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {data.totalCount} rows
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <ScrollArea className="h-[200px]">
          <Table>
            <TableHeader>
              <TableRow>
                {data.columns.map(column => (
                  <TableHead 
                    key={column.key}
                    className={cn(
                      'text-xs',
                      column.sortable && 'cursor-pointer hover:bg-muted/50'
                    )}
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center gap-1">
                      {column.label}
                      {column.sortable && (
                        <span className="ml-1">
                          {sortColumn === column.key ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row, index) => (
                <TableRow key={row.id?.toString() || index}>
                  {data.columns.map(column => (
                    <TableCell key={column.key} className="text-xs py-2">
                      {formatCellValue(row[column.key], column.key)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default TableWidget;
