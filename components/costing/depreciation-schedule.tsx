'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DepreciationProjection } from '@/types/depreciation';
import { formatIDR, formatDate } from '@/lib/pjo-utils';

interface DepreciationScheduleProps {
  projections: DepreciationProjection[];
  showAll?: boolean;
}

export function DepreciationSchedule({ projections, showAll = false }: DepreciationScheduleProps) {
  if (projections.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No depreciation schedule available. Asset may be fully depreciated or missing configuration.
      </div>
    );
  }

  const displayData = showAll ? projections : projections.slice(0, 12);
  const fullyDepreciatedIndex = projections.findIndex(p => p.isFullyDepreciated);

  return (
    <div className="space-y-4">
      {fullyDepreciatedIndex >= 0 && (
        <div className="text-sm text-muted-foreground">
          Asset will be fully depreciated in period {fullyDepreciatedIndex + 1} ({formatDate(projections[fullyDepreciatedIndex].periodEnd)})
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Period</TableHead>
              <TableHead>Period End</TableHead>
              <TableHead className="text-right">Beginning Value</TableHead>
              <TableHead className="text-right">Depreciation</TableHead>
              <TableHead className="text-right">Ending Value</TableHead>
              <TableHead className="text-right">Accumulated</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((item) => (
              <TableRow key={item.periodNumber} className={item.isFullyDepreciated ? 'bg-muted/50' : ''}>
                <TableCell className="font-medium">{item.periodNumber}</TableCell>
                <TableCell>{formatDate(item.periodEnd)}</TableCell>
                <TableCell className="text-right">{formatIDR(item.beginningBookValue)}</TableCell>
                <TableCell className="text-right">{formatIDR(item.depreciationAmount)}</TableCell>
                <TableCell className="text-right">{formatIDR(item.endingBookValue)}</TableCell>
                <TableCell className="text-right">{formatIDR(item.accumulatedDepreciation)}</TableCell>
                <TableCell>
                  {item.isFullyDepreciated ? (
                    <Badge variant="secondary">Fully Depreciated</Badge>
                  ) : (
                    <Badge variant="outline">Active</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!showAll && projections.length > 12 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing first 12 periods of {projections.length} total
        </div>
      )}
    </div>
  );
}
