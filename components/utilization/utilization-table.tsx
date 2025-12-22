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
import { Progress } from '@/components/ui/progress';
import { UtilizationSummary } from '@/types/utilization';
import {
  getUtilizationCategory,
  getUtilizationCategoryLabel,
  getUtilizationCategoryBadgeVariant,
  formatUtilizationRate,
  formatKm,
  formatHours,
} from '@/lib/utilization-utils';

interface UtilizationTableProps {
  data: UtilizationSummary[];
  onAssetClick?: (assetId: string) => void;
}

export function UtilizationTable({ data, onAssetClick }: UtilizationTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No utilization data available for this period.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-center">Op Days</TableHead>
            <TableHead className="text-center">Idle Days</TableHead>
            <TableHead className="text-center">Util Rate</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="text-right">Total KM</TableHead>
            <TableHead className="text-right">Total Hours</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            const category = getUtilizationCategory(item.utilizationRate);
            return (
              <TableRow
                key={item.assetId}
                className={onAssetClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                onClick={() => onAssetClick?.(item.assetId)}
              >
                <TableCell className="font-medium">{item.assetCode}</TableCell>
                <TableCell>{item.assetName}</TableCell>
                <TableCell className="text-center">{item.operatingDays}</TableCell>
                <TableCell className="text-center">{item.idleDays}</TableCell>
                <TableCell className="text-center font-medium">
                  {formatUtilizationRate(item.utilizationRate)}
                </TableCell>
                <TableCell className="w-32">
                  <Progress value={item.utilizationRate} className="h-2" />
                </TableCell>
                <TableCell className="text-right">{formatKm(item.totalKm)}</TableCell>
                <TableCell className="text-right">{formatHours(item.totalHours)}</TableCell>
                <TableCell>
                  <Badge variant={getUtilizationCategoryBadgeVariant(category)}>
                    {getUtilizationCategoryLabel(category)}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
