'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ShipmentCost,
  COST_PAYMENT_STATUS_LABELS,
  COST_PAYMENT_STATUS_COLORS,
  CostPaymentStatus,
} from '@/types/agency';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
} from 'lucide-react';

interface CostsTableProps {
  costs: ShipmentCost[];
  onEdit?: (cost: ShipmentCost) => void;
  onDelete?: (cost: ShipmentCost) => void;
  onMarkPaid?: (cost: ShipmentCost) => void;
  showActions?: boolean;
}

export function CostsTable({
  costs,
  onEdit,
  onDelete,
  onMarkPaid,
  showActions = true,
}: CostsTableProps) {
  const formatCurrency = (value: number, currency: string = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency === 'IDR' ? 'IDR' : currency,
      minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    }).format(value);
  };

  const getPaymentStatusBadge = (status: CostPaymentStatus) => {
    const colorClass = COST_PAYMENT_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
    return (
      <Badge variant="secondary" className={colorClass}>
        {COST_PAYMENT_STATUS_LABELS[status] || status}
      </Badge>
    );
  };

  // Calculate totals
  const totals = costs.reduce(
    (acc, cost) => ({
      amountIdr: acc.amountIdr + (cost.amountIdr || 0),
      taxAmount: acc.taxAmount + (cost.taxAmount || 0),
      totalAmount: acc.totalAmount + (cost.totalAmount || 0),
    }),
    { amountIdr: 0, taxAmount: 0, totalAmount: 0 }
  );

  if (costs.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Charge</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={showActions ? 7 : 6} className="h-24 text-center text-muted-foreground">
                No costs recorded yet.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Charge</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Tax</TableHead>
            <TableHead>Status</TableHead>
            {showActions && <TableHead className="w-[50px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {costs.map((cost) => (
            <TableRow key={cost.id}>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">
                    {cost.chargeType?.chargeName || 'Unknown Charge'}
                  </div>
                  {cost.description && (
                    <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {cost.description}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {cost.vendorName || '-'}
                </span>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {cost.currency !== 'IDR' && (
                    <div className="text-sm">
                      {formatCurrency(cost.amount, cost.currency)}
                    </div>
                  )}
                  <div className={cost.currency !== 'IDR' ? 'text-xs text-muted-foreground' : 'text-sm'}>
                    {formatCurrency(cost.amountIdr, 'IDR')}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(cost.amountIdr, 'IDR')}
              </TableCell>
              <TableCell className="text-right">
                {cost.isTaxable ? formatCurrency(cost.taxAmount, 'IDR') : '-'}
              </TableCell>
              <TableCell>
                {getPaymentStatusBadge(cost.paymentStatus)}
              </TableCell>
              {showActions && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(cost)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {onMarkPaid && cost.paymentStatus !== 'paid' && (
                        <DropdownMenuItem onClick={() => onMarkPaid(cost)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark as Paid
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(cost)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3} className="font-medium">
              Total
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(totals.amountIdr, 'IDR')}
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(totals.taxAmount, 'IDR')}
            </TableCell>
            <TableCell className="font-semibold">
              {formatCurrency(totals.totalAmount, 'IDR')}
            </TableCell>
            {showActions && <TableCell></TableCell>}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
