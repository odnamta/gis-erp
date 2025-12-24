'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  FileText,
} from 'lucide-react';

interface VendorInvoicesListProps {
  invoices: AgencyVendorInvoice[];
  onEdit?: (invoice: AgencyVendorInvoice) => void;
  onDelete?: (invoice: AgencyVendorInvoice) => void;
  onRecordPayment?: (invoice: AgencyVendorInvoice) => void;
  onViewDocument?: (invoice: AgencyVendorInvoice) => void;
  showActions?: boolean;
}

export function VendorInvoicesList({
  invoices,
  onEdit,
  onDelete,
  onRecordPayment,
  onViewDocument,
  showActions = true,
}: VendorInvoicesListProps) {
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

  const getDueDateIndicator = (invoice: AgencyVendorInvoice) => {
    if (!invoice.dueDate || invoice.paymentStatus === 'paid') return null;
    
    const daysUntilDue = calculateDaysUntilDue(invoice.dueDate);
    const overdue = isOverdue(invoice.dueDate);
    
    if (overdue) {
      const daysOverdue = Math.abs(daysUntilDue);
      return (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertTriangle className="h-3 w-3" />
          <span>{daysOverdue}d overdue</span>
        </div>
      );
    }
    
    if (daysUntilDue <= 7) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-yellow-600">
          <Clock className="h-3 w-3" />
          <span>Due in {daysUntilDue}d</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Due in {daysUntilDue}d</span>
      </div>
    );
  };

  // Calculate totals
  const totals = invoices.reduce(
    (acc, inv) => ({
      totalAmount: acc.totalAmount + (inv.totalAmount || 0),
      paidAmount: acc.paidAmount + (inv.paidAmount || 0),
    }),
    { totalAmount: 0, paidAmount: 0 }
  );

  const unpaidTotal = totals.totalAmount - totals.paidAmount;

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No vendor invoices recorded yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Invoiced</div>
            <div className="text-lg font-semibold">{formatCurrency(totals.totalAmount, 'IDR')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Paid</div>
            <div className="text-lg font-semibold text-green-600">{formatCurrency(totals.paidAmount, 'IDR')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Outstanding</div>
            <div className="text-lg font-semibold text-red-600">{formatCurrency(unpaidTotal, 'IDR')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <div className="space-y-2">
        {invoices.map((invoice) => (
          <Card
            key={invoice.id}
            className={`${
              isOverdue(invoice.dueDate) && invoice.paymentStatus !== 'paid'
                ? 'border-red-200'
                : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Invoice Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{invoice.invoiceNumber}</span>
                    {getPaymentStatusBadge(invoice.paymentStatus)}
                    {getDueDateIndicator(invoice)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="truncate">{invoice.vendorName || 'Unknown Vendor'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(invoice.invoiceDate)}</span>
                    </div>
                  </div>
                  {invoice.costIds && invoice.costIds.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {invoice.costIds.length} linked cost{invoice.costIds.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Right: Amount */}
                <div className="text-right shrink-0">
                  <div className="font-semibold">
                    {formatCurrency(invoice.totalAmount, invoice.currency)}
                  </div>
                  {invoice.paymentStatus === 'partial' && (
                    <div className="text-xs text-muted-foreground">
                      Paid: {formatCurrency(invoice.paidAmount, invoice.currency)}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {showActions && (onEdit || onDelete || onRecordPayment || onViewDocument) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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
        ))}
      </div>
    </div>
  );
}
