'use client';

import { Card, CardContent } from '@/components/ui/card';
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
  FileText,
  CheckCircle,
  Send,
} from 'lucide-react';

interface RevenueCardProps {
  revenue: ShipmentRevenue;
  onEdit?: (revenue: ShipmentRevenue) => void;
  onDelete?: (revenue: ShipmentRevenue) => void;
  onMarkBilled?: (revenue: ShipmentRevenue) => void;
  onMarkPaid?: (revenue: ShipmentRevenue) => void;
  showActions?: boolean;
}

export function RevenueCard({
  revenue,
  onEdit,
  onDelete,
  onMarkBilled,
  onMarkPaid,
  showActions = true,
}: RevenueCardProps) {
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

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Charge Type and Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">
                {revenue.chargeType?.chargeName || 'Unknown Charge'}
              </span>
              {getBillingStatusBadge(revenue.billingStatus)}
            </div>

            {/* Description */}
            {revenue.description && (
              <p className="text-sm text-muted-foreground truncate">
                {revenue.description}
              </p>
            )}

            {/* Invoice Link */}
            {revenue.invoice && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span>Invoice: {revenue.invoice.invoiceNumber}</span>
              </div>
            )}

            {/* Amount Details */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {revenue.currency !== 'IDR' && (
                <span className="text-muted-foreground">
                  {formatCurrency(revenue.amount, revenue.currency)}
                </span>
              )}
              <span className="font-medium">
                {formatCurrency(revenue.amountIdr, 'IDR')}
              </span>
              {revenue.isTaxable && revenue.taxAmount > 0 && (
                <span className="text-muted-foreground">
                  + Tax: {formatCurrency(revenue.taxAmount, 'IDR')}
                </span>
              )}
            </div>

            {/* Quantity Info */}
            {revenue.quantity !== 1 && (
              <div className="text-sm text-muted-foreground">
                {revenue.quantity} × {formatCurrency(revenue.unitPrice, revenue.currency)}
              </div>
            )}
          </div>

          {/* Total Amount */}
          <div className="text-right shrink-0">
            <div className="text-lg font-semibold text-green-600">
              {formatCurrency(revenue.totalAmount, 'IDR')}
            </div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>

          {/* Actions */}
          {showActions && (onEdit || onDelete || onMarkBilled || onMarkPaid) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(revenue)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onMarkBilled && revenue.billingStatus === 'unbilled' && (
                  <DropdownMenuItem onClick={() => onMarkBilled(revenue)}>
                    <Send className="mr-2 h-4 w-4" />
                    Mark as Billed
                  </DropdownMenuItem>
                )}
                {onMarkPaid && revenue.billingStatus === 'billed' && (
                  <DropdownMenuItem onClick={() => onMarkPaid(revenue)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as Paid
                  </DropdownMenuItem>
                )}
                {onDelete && revenue.billingStatus === 'unbilled' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(revenue)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
