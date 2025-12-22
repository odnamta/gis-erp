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
import { AssetCostTracking, CostType, CostReferenceType } from '@/types/depreciation';
import { formatIDR, formatDate } from '@/lib/pjo-utils';

interface CostHistoryTableProps {
  records: AssetCostTracking[];
}

const costTypeLabels: Record<CostType, string> = {
  purchase: 'Purchase',
  maintenance: 'Maintenance',
  fuel: 'Fuel',
  depreciation: 'Depreciation',
  insurance: 'Insurance',
  registration: 'Registration',
  other: 'Other',
};

const costTypeBadgeVariants: Record<CostType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  purchase: 'default',
  maintenance: 'secondary',
  fuel: 'outline',
  depreciation: 'secondary',
  insurance: 'outline',
  registration: 'outline',
  other: 'outline',
};

const referenceTypeLabels: Record<CostReferenceType, string> = {
  maintenance_record: 'Maintenance',
  daily_log: 'Daily Log',
  depreciation: 'Depreciation',
  manual: 'Manual Entry',
};

export function CostHistoryTable({ records }: CostHistoryTableProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No cost records available.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{formatDate(record.costDate)}</TableCell>
              <TableCell>
                <Badge variant={costTypeBadgeVariants[record.costType]}>
                  {costTypeLabels[record.costType]}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatIDR(record.amount)}
              </TableCell>
              <TableCell>
                {record.referenceType ? (
                  <span className="text-xs text-muted-foreground">
                    {referenceTypeLabels[record.referenceType]}
                  </span>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {record.notes || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
