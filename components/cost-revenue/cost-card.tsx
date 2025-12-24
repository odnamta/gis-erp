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
  ShipmentCost,
  COST_PAYMENT_STATUS_LABELS,
  COST_PAYMENT_STATUS_COLORS,
  CostPaymentStatus,
} from '@/types/agency';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Building2,
  Receipt,
  CreditCard,
  CheckCircle,
} from 'lucide-react';

interface CostCardProps {
  cost: ShipmentCost;
  onEdit?: (cost: ShipmentCost) => void;
  onDelete?: (cost: ShipmentCost) => void;
  onMarkPaid?: (cost: ShipmentCost) => void;
  showActions?: boolean;
}

export function CostCard({
  cost,
  onEdit,
  onDelete,
  onMarkPaid,
  showActions = true,
}: CostCardProps) {
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

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Charge Type and Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">
                {cost.chargeType?.chargeName || 'Unknown Charge'}
              </span>
              {getPaymentStatusBadge(cost.paymentStatus)}
            </div>

            {/* Description */}
            {cost.description && (
              <p className="text-sm text-muted-foreground truncate">
                {cost.description}
              </p>
            )}

            {/* Vendor Info */}
            {cost.vendorName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span className="truncate">{cost.vendorName}</span>
              </div>
            )}

            {/* Vendor Invoice */}
            {cost.vendorInvoiceNumber && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Receipt className="h-3.5 w-3.5" />
                <span>Invoice: {cost.vendorInvoiceNumber}</span>
              </div>
            )}

            {/* Amount Details */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {cost.currency !== 'IDR' && (
                <span className="text-muted-foreground">
                  {formatCurrency(cost.amount, cost.currency)}
                </span>
              )}
              <span className="font-medium">
                {formatCurrency(cost.amountIdr, 'IDR')}
              </span>
              {cost.isTaxable && cost.taxAmount > 0 && (
                <span className="text-muted-foreground">
                  + Tax: {formatCurrency(cost.taxAmount, 'IDR')}
                </span>
              )}
            </div>

            {/* Payment Info */}
            {cost.paymentStatus !== 'unpaid' && cost.paidAmount > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CreditCard className="h-3.5 w-3.5" />
                <span>Paid: {formatCurrency(cost.paidAmount, 'IDR')}</span>
                {cost.paidDate && (
                  <span className="text-muted-foreground">
                    on {new Date(cost.paidDate).toLocaleDateString('id-ID')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Total Amount */}
          <div className="text-right shrink-0">
            <div className="text-lg font-semibold">
              {formatCurrency(cost.totalAmount, 'IDR')}
            </div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>

          {/* Actions */}
          {showActions && (onEdit || onDelete || onMarkPaid) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
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
          )}
        </div>
      </CardContent>
    </Card>
  );
}
