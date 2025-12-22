'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter, X } from 'lucide-react';
import { AssetDailyLog } from '@/types/utilization';
import { formatDate, formatIDR } from '@/lib/pjo-utils';
import {
  getDailyLogStatusLabel,
  getDailyLogStatusBadgeVariant,
  formatKm,
  formatHours,
  formatFuelLiters,
} from '@/lib/utilization-utils';

interface DailyLogTableProps {
  logs: AssetDailyLog[];
  dateFrom?: string;
  dateTo?: string;
  onFilterChange: (dateFrom?: string, dateTo?: string) => void;
}

export function DailyLogTable({
  logs,
  dateFrom,
  dateTo,
  onFilterChange,
}: DailyLogTableProps) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = dateFrom || dateTo;

  const clearFilters = () => {
    onFilterChange(undefined, undefined);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Daily Logs ({logs.length})</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-1" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1">Active</Badge>
          )}
        </Button>
      </CardHeader>

      {showFilters && (
        <CardContent className="border-b pb-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom || ''}
                onChange={(e) => onFilterChange(e.target.value || undefined, dateTo)}
              />
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo || ''}
                onChange={(e) => onFilterChange(dateFrom, e.target.value || undefined)}
              />
            </div>

            <div className="flex items-end">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      )}

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">KM Today</TableHead>
              <TableHead className="text-right">Hours Today</TableHead>
              <TableHead className="text-right">Fuel (L)</TableHead>
              <TableHead className="text-right">Fuel Cost</TableHead>
              <TableHead>Operator</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No daily logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{formatDate(log.logDate)}</TableCell>
                  <TableCell>
                    <Badge variant={getDailyLogStatusBadgeVariant(log.status)}>
                      {getDailyLogStatusLabel(log.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {log.kmToday !== undefined ? formatKm(log.kmToday) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.hoursToday !== undefined ? formatHours(log.hoursToday) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.fuelLiters !== undefined ? formatFuelLiters(log.fuelLiters) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.fuelCost !== undefined ? formatIDR(log.fuelCost) : '-'}
                  </TableCell>
                  <TableCell>{log.operatorName || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
