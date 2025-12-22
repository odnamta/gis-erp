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
import { AssetDepreciation } from '@/types/depreciation';
import { formatIDR, formatDate } from '@/lib/pjo-utils';

interface DepreciationHistoryProps {
  records: AssetDepreciation[];
}

const methodLabels: Record<string, string> = {
  straight_line: 'Straight Line',
  declining_balance: 'Declining Balance',
};

export function DepreciationHistory({ records }: DepreciationHistoryProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No depreciation history available.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Beginning Value</TableHead>
            <TableHead className="text-right">Depreciation</TableHead>
            <TableHead className="text-right">Ending Value</TableHead>
            <TableHead className="text-right">Accumulated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{formatDate(record.depreciationDate)}</TableCell>
              <TableCell>
                <span className="text-xs">
                  {formatDate(record.periodStart)} - {formatDate(record.periodEnd)}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {methodLabels[record.depreciationMethod] || record.depreciationMethod}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{formatIDR(record.beginningBookValue)}</TableCell>
              <TableCell className="text-right text-orange-600">
                -{formatIDR(record.depreciationAmount)}
              </TableCell>
              <TableCell className="text-right">{formatIDR(record.endingBookValue)}</TableCell>
              <TableCell className="text-right font-medium">
                {formatIDR(record.accumulatedDepreciation)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
