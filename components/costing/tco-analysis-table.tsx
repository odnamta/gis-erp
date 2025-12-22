'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AssetTCOSummary } from '@/types/depreciation';
import { formatIDR } from '@/lib/pjo-utils';

interface TCOAnalysisTableProps {
  data: AssetTCOSummary[];
  onAssetClick?: (assetId: string) => void;
}

export function TCOAnalysisTable({ data, onAssetClick }: TCOAnalysisTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No TCO data available.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Purchase</TableHead>
            <TableHead className="text-right">Maintenance</TableHead>
            <TableHead className="text-right">Fuel</TableHead>
            <TableHead className="text-right">Depreciation</TableHead>
            <TableHead className="text-right">Other</TableHead>
            <TableHead className="text-right">Total TCO</TableHead>
            <TableHead className="text-right">Cost/Km</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={item.assetId}
              className={onAssetClick ? 'cursor-pointer hover:bg-muted/50' : ''}
              onClick={() => onAssetClick?.(item.assetId)}
            >
              <TableCell>
                <div>
                  <div className="font-medium">{item.assetCode}</div>
                  <div className="text-xs text-muted-foreground">{item.assetName}</div>
                </div>
              </TableCell>
              <TableCell>{item.categoryName}</TableCell>
              <TableCell className="text-right">{formatIDR(item.purchaseCost)}</TableCell>
              <TableCell className="text-right">{formatIDR(item.totalMaintenanceCost)}</TableCell>
              <TableCell className="text-right">{formatIDR(item.totalFuelCost)}</TableCell>
              <TableCell className="text-right">{formatIDR(item.totalDepreciation)}</TableCell>
              <TableCell className="text-right">
                {formatIDR(item.totalInsuranceCost + item.totalRegistrationCost + item.totalOtherCost)}
              </TableCell>
              <TableCell className="text-right font-medium">{formatIDR(item.totalTCO)}</TableCell>
              <TableCell className="text-right">
                {item.costPerKm ? formatIDR(item.costPerKm) : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
