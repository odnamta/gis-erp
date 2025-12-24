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
  ShipmentRevenue,
  REVENUE_BILLING_STATUS_LABELS,
  REVENUE_BILLING_STATUS_COLORS,
  RevenueBillingStatus,
} from '@/types/agency';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Send,
  CheckCircle,
} from 'lucide-react';

interface RevenueTableProps {
  revenue: ShipmentRevenue[];
  onEdit?: (revenue: ShipmentRevenue) => void;
  onDelete?: (revenue: ShipmentRevenue) => void;
  onMarkBilled?: (revenue: ShipmentRevenue) => void;
  onMarkPaid?: (revenue: ShipmentRevenue) => void;
  showActions?: boolean;
}

export function RevenueTable({
  revenue,
  onEdit,
  onDelete,
  onMarkBilled,
  onMarkPaid,
  showActions = true,
}: RevenueTableProps) {
  const formatCurrency = (value: number, currency: string = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency === 'IDR' ? 'IDR' : currency,
      minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    }).format(value);
  };

  const getBillingStatusBadge = (status: RevenueBillingStatus) => {
    const colorClass = REVENUE_BILLING_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
    return (
      <Badge variant="secondary" className={colorClass}>
        {REVENUE_BILLING_STATUS_LABELS[status] || status}
      </Badge>
    );
  };

  // Calculate totals
  const totals = revenue.reduce(
    (acc, rev) => ({
      amountIdr: acc.amountIdr + (rev.amountIdr || 0),
      taxAmount: acc.taxAmount + (rev.taxAmount || 0),
      totalAmount: acc.totalAmount + (rev.totalAmount || 0),
    }),
    { amountIdr: 0, taxAmount: 0, totalAmount: 0 }
  );

  if (revenue.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Charge</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={showActions ? 6 : 5} className="h-24 text-center text-muted-foreground">
                No revenue recorded yet.
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
            <TableHead>Currency</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Tax</TableHead>
            <TableHead>Status</TableHead>
            {showActions && <TableHead className="w-[50px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {revenue.map((rev) => (
            <TableRow key={rev.id}>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">
                    {rev.chargeType?.chargeName || 'Unknown Charge'}
                  </div>
                  {rev.description && (
                    <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {rev.description}
                    </div>
                  )}
                  {rev.invoice && (
                    <div className="text-xs text-muted-foreground">
                      Invoice: {rev.invoice.invoiceNumber}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {rev.currency !== 'IDR' && (
                    <div className="text-sm">
                      {formatCurrency(rev.amount, rev.currency)}
                    </div>
                  )}
                  <div className={rev.currency !== 'IDR' ? 'text-xs text-muted-foreground' : 'text-sm'}>
                    {formatCurrency(rev.amountIdr, 'IDR')}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(rev.amountIdr, 'IDR')}
              </TableCell>
              <TableCell className="text-right">
                {rev.isTaxable ? formatCurrency(rev.taxAmount, 'IDR') : '-'}
              </TableCell>
              <TableCell>
                {getBillingStatusBadge(rev.billingStatus)}
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
                        <DropdownMenuItem onClick={() => onEdit(rev)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {onMarkBilled && rev.billingStatus === 'unbilled' && (
                        <DropdownMenuItem onClick={() => onMarkBilled(rev)}>
                          <Send className="mr-2 h-4 w-4" />
                          Mark as Billed
                        </DropdownMenuItem>
                      )}
                      {onMarkPaid && rev.billingStatus === 'billed' && (
                        <DropdownMenuItem onClick={() => onMarkPaid(rev)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark as Paid
                        </DropdownMenuItem>
                      )}
                      {onDelete && rev.billingStatus === 'unbilled' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(rev)}
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
            <TableCell colSpan={2} className="font-medium">
              Total
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(totals.amountIdr, 'IDR')}
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(totals.taxAmount, 'IDR')}
            </TableCell>
            <TableCell className="font-semibold text-green-600">
              {formatCurrency(totals.totalAmount, 'IDR')}
            </TableCell>
            {showActions && <TableCell></TableCell>}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
