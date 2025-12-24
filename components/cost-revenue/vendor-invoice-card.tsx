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
  AgencyVendorInvoice,
  VENDOR_INVOICE_PAYMENT_STATUS_LABELS,
  VendorInvoicePaymentStatus,
} from '@/types/agency';
import { calculateDaysUntilDue, isOverdue } from '@/lib/cost-revenue-utils';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Building2,
  Calendar,
  CreditCard,
  AlertTriangle,
  Clock,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';

interface VendorInvoiceCardProps {
  invoice: AgencyVendorInvoice;
  onEdit?: (invoice: AgencyVendorInvoice) => void;
  onDelete?: (invoice: AgencyVendorInvoice) => void;
  onRecordPayment?: (invoice: AgencyVendorInvoice) => void;
  onViewDocument?: (invoice: AgencyVendorInvoice) => void;
  showActions?: boolean;
}

export function VendorInvoiceCard({
  invoice,
  onEdit,
  onDelete,
  onRecordPayment,
  onViewDocument,
  showActions = true,
}: VendorInvoiceCardProps) {
  const formatCurrency = (value: number, currency: string = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency === 'IDR' ? 'IDR' : currency,
      minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPaymentStatusBadge = (status: VendorInvoicePaymentStatus) => {
    const colors: Record<VendorInvoicePaymentStatus, string> = {
      unpaid: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
    };
    return (
      <Badge variant="secondary" className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {VENDOR_INVOICE_PAYMENT_STATUS_LABELS[status] || status}
      </Badge>
    );
  };

  const getDueDateIndicator = () => {
    if (!invoice.dueDate) return null;
    
    const daysUntilDue = calculateDaysUntilDue(invoice.dueDate);
    const overdue = isOverdue(invoice.dueDate);
    
    if (invoice.paymentStatus === 'paid') {
      return null;
    }
    
    if (overdue) {
      const daysOverdue = Math.abs(daysUntilDue);
      return (
        <div className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue</span>
        </div>
      );
    }
    
    if (daysUntilDue <= 7) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-yellow-600">
          <Clock className="h-3.5 w-3.5" />
          <span>Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>Due in {daysUntilDue} days</span>
      </div>
    );
  };

  const remainingAmount = invoice.totalAmount - invoice.paidAmount;

  return (
    <Card className={`hover:shadow-sm transition-shadow ${
      isOverdue(invoice.dueDate) && invoice.paymentStatus !== 'paid' 
        ? 'border-red-200' 
        : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Invoice Number and Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{invoice.invoiceNumber}</span>
              {getPaymentStatusBadge(invoice.paymentStatus)}
            </div>

            {/* Vendor */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span className="truncate">{invoice.vendorName || 'Unknown Vendor'}</span>
            </div>

            {/* Dates */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Issued: {formatDate(invoice.invoiceDate)}</span>
              </div>
              {invoice.dueDate && (
                <div className="flex items-center gap-1.5">
                  <span>Due: {formatDate(invoice.dueDate)}</span>
                </div>
              )}
            </div>

            {/* Due Date Indicator */}
            {getDueDateIndicator()}

            {/* Payment Progress */}
            {invoice.paymentStatus === 'partial' && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Progress</span>
                  <span className="font-medium">
                    {Math.round((invoice.paidAmount / invoice.totalAmount) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{
                      width: `${(invoice.paidAmount / invoice.totalAmount) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Paid: {formatCurrency(invoice.paidAmount, invoice.currency)}</span>
                  <span>Remaining: {formatCurrency(remainingAmount, invoice.currency)}</span>
                </div>
              </div>
            )}

            {/* Linked Costs Count */}
            {invoice.costIds && invoice.costIds.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {invoice.costIds.length} linked cost{invoice.costIds.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Total Amount */}
          <div className="text-right shrink-0">
            <div className="text-lg font-semibold">
              {formatCurrency(invoice.totalAmount, invoice.currency)}
            </div>
            <div className="text-xs text-muted-foreground">Total</div>
            {invoice.paymentStatus === 'paid' && (
              <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                <CheckCircle className="h-3 w-3" />
                <span>Paid</span>
              </div>
            )}
          </div>

          {/* Actions */}
          {showActions && (onEdit || onDelete || onRecordPayment || onViewDocument) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(invoice)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onRecordPayment && invoice.paymentStatus !== 'paid' && (
                  <DropdownMenuItem onClick={() => onRecordPayment(invoice)}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Record Payment
                  </DropdownMenuItem>
                )}
                {onViewDocument && invoice.documentUrl && (
                  <DropdownMenuItem onClick={() => onViewDocument(invoice)}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Document
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(invoice)}
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
