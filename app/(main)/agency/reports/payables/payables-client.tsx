'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  AgencyVendorInvoice,
  VendorInvoiceFilters,
  VendorInvoicePaymentStatus,
  VENDOR_INVOICE_PAYMENT_STATUSES,
  VENDOR_INVOICE_PAYMENT_STATUS_LABELS,
  ServiceProvider,
} from '@/types/agency';
import {
  getVendorInvoices,
  updateVendorInvoicePayment,
} from '@/app/actions/vendor-invoice-actions';
import { calculateDaysUntilDue, isOverdue } from '@/lib/cost-revenue-utils';
import {
  Search,
  X,
  Loader2,
  Building2,
  Calendar,
  CreditCard,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PayablesClientProps {
  initialInvoices: AgencyVendorInvoice[];
  vendors: ServiceProvider[];
}

export function PayablesClient({
  initialInvoices,
  vendors,
}: PayablesClientProps) {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<AgencyVendorInvoice[]>(initialInvoices);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<VendorInvoiceFilters>({
    vendorId: undefined,
    paymentStatus: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    dueDateFrom: undefined,
    dueDateTo: undefined,
  });

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<AgencyVendorInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

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

  // Calculate summary statistics
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const totalOutstanding = totalInvoiced - totalPaid;
  const overdueInvoices = invoices.filter(
    (inv) => inv.dueDate && isOverdue(inv.dueDate) && inv.paymentStatus !== 'paid'
  );
  const overdueAmount = overdueInvoices.reduce(
    (sum, inv) => sum + ((inv.totalAmount || 0) - (inv.paidAmount || 0)),
    0
  );
  const unpaidCount = invoices.filter((inv) => inv.paymentStatus === 'unpaid').length;
  const partialCount = invoices.filter((inv) => inv.paymentStatus === 'partial').length;
  const paidCount = invoices.filter((inv) => inv.paymentStatus === 'paid').length;

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getVendorInvoices(filters);
      if (result.success && result.data) {
        setInvoices(result.data);
      }
    } catch (error) {
      console.error('Failed to search invoices:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const handleFilterChange = (
    key: keyof VendorInvoiceFilters,
    value: string | VendorInvoicePaymentStatus | undefined
  ) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
  };

  const handleClearFilters = async () => {
    const clearedFilters: VendorInvoiceFilters = {
      vendorId: undefined,
      paymentStatus: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      dueDateFrom: undefined,
      dueDateTo: undefined,
    };
    setFilters(clearedFilters);
    setIsLoading(true);
    try {
      const result = await getVendorInvoices(clearedFilters);
      if (result.success && result.data) {
        setInvoices(result.data);
      }
    } catch (error) {
      console.error('Failed to clear filters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasActiveFilters =
    filters.vendorId ||
    filters.paymentStatus ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.dueDateFrom ||
    filters.dueDateTo;

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

  const handleRecordPayment = (invoice: AgencyVendorInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(String((invoice.totalAmount || 0) - (invoice.paidAmount || 0)));
    setPaymentDialogOpen(true);
  };

  const handleSubmitPayment = async () => {
    if (!selectedInvoice) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount',
        variant: 'destructive',
      });
      return;
    }

    const newPaidAmount = (selectedInvoice.paidAmount || 0) + amount;
    if (newPaidAmount > (selectedInvoice.totalAmount || 0)) {
      toast({
        title: 'Amount Exceeds Total',
        description: 'Payment amount cannot exceed the outstanding balance',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const result = await updateVendorInvoicePayment(selectedInvoice.id, newPaidAmount);
      if (result.success) {
        toast({
          title: 'Payment Recorded',
          description: `Payment of ${formatCurrency(amount, selectedInvoice.currency)} recorded successfully`,
        });
        // Refresh the list
        const refreshResult = await getVendorInvoices(filters);
        if (refreshResult.success && refreshResult.data) {
          setInvoices(refreshResult.data);
        }
        setPaymentDialogOpen(false);
        setSelectedInvoice(null);
        setPaymentAmount('');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to record payment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to record payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to record payment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleViewDocument = (invoice: AgencyVendorInvoice) => {
    if (invoice.documentUrl) {
      window.open(invoice.documentUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Vendor Payables</h1>
        <p className="text-muted-foreground">
          Track and manage vendor invoices and payments
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span>Total Invoiced</span>
            </div>
            <div className="text-lg font-semibold">{formatCurrency(totalInvoiced)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CreditCard className="h-4 w-4 text-green-600" />
              <span>Total Paid</span>
            </div>
            <div className="text-lg font-semibold text-green-600">
              {formatCurrency(totalPaid)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4 text-orange-600" />
              <span>Outstanding</span>
            </div>
            <div className="text-lg font-semibold text-orange-600">
              {formatCurrency(totalOutstanding)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span>Overdue</span>
            </div>
            <div className="text-lg font-semibold text-red-600">
              {formatCurrency(overdueAmount)}
            </div>
            <div className="text-xs text-muted-foreground">
              {overdueInvoices.length} invoice{overdueInvoices.length !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span>Unpaid</span>
            </div>
            <div className="text-lg font-semibold">{unpaidCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span className="h-3 w-3 rounded-full bg-green-500" />
              <span>Paid</span>
            </div>
            <div className="text-lg font-semibold">{paidCount}</div>
            <div className="text-xs text-muted-foreground">{partialCount} partial</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-[200px]">
              <label className="text-sm text-muted-foreground mb-1 block">Vendor</label>
              <Select
                value={filters.vendorId || 'all'}
                onValueChange={(value) =>
                  handleFilterChange('vendorId', value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.providerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[150px]">
              <label className="text-sm text-muted-foreground mb-1 block">Status</label>
              <Select
                value={filters.paymentStatus || 'all'}
                onValueChange={(value) =>
                  handleFilterChange(
                    'paymentStatus',
                    value === 'all' ? undefined : (value as VendorInvoicePaymentStatus)
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {VENDOR_INVOICE_PAYMENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {VENDOR_INVOICE_PAYMENT_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[140px]">
              <label className="text-sm text-muted-foreground mb-1 block">Invoice From</label>
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            <div className="w-[140px]">
              <label className="text-sm text-muted-foreground mb-1 block">Invoice To</label>
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>

            <div className="w-[140px]">
              <label className="text-sm text-muted-foreground mb-1 block">Due From</label>
              <Input
                type="date"
                value={filters.dueDateFrom || ''}
                onChange={(e) => handleFilterChange('dueDateFrom', e.target.value)}
              />
            </div>

            <div className="w-[140px]">
              <label className="text-sm text-muted-foreground mb-1 block">Due To</label>
              <Input
                type="date"
                value={filters.dueDateTo || ''}
                onChange={(e) => handleFilterChange('dueDateTo', e.target.value)}
              />
            </div>

            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={handleClearFilters} disabled={isLoading}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Vendor Invoices ({invoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/50">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No vendor invoices found</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={handleClearFilters} className="mt-2">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const outstanding = (invoice.totalAmount || 0) - (invoice.paidAmount || 0);
                    const isInvoiceOverdue =
                      invoice.dueDate &&
                      isOverdue(invoice.dueDate) &&
                      invoice.paymentStatus !== 'paid';

                    return (
                      <TableRow
                        key={invoice.id}
                        className={cn(isInvoiceOverdue && 'bg-red-50')}
                      >
                        <TableCell className="font-medium">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{invoice.vendorName || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{formatDate(invoice.invoiceDate)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {invoice.dueDate ? (
                            <div className="space-y-1">
                              <span>{formatDate(invoice.dueDate)}</span>
                              {getDueDateIndicator(invoice)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(invoice.totalAmount, invoice.currency)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(invoice.paidAmount, invoice.currency)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-medium',
                            outstanding > 0 ? 'text-orange-600' : 'text-green-600'
                          )}
                        >
                          {formatCurrency(outstanding, invoice.currency)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getPaymentStatusBadge(invoice.paymentStatus)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {invoice.paymentStatus !== 'paid' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleRecordPayment(invoice)}
                                title="Record Payment"
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            )}
                            {invoice.documentUrl && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewDocument(invoice)}
                                title="View Document"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Vendor:</span>
                  <p className="font-medium">{selectedInvoice.vendorName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Amount:</span>
                  <p className="font-medium">
                    {formatCurrency(selectedInvoice.totalAmount, selectedInvoice.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Already Paid:</span>
                  <p className="font-medium text-green-600">
                    {formatCurrency(selectedInvoice.paidAmount, selectedInvoice.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Outstanding:</span>
                  <p className="font-medium text-orange-600">
                    {formatCurrency(
                      (selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0),
                      selectedInvoice.currency
                    )}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Payment Amount ({selectedInvoice.currency})</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter payment amount"
                  min={0}
                  max={(selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={isSubmittingPayment}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitPayment} disabled={isSubmittingPayment}>
              {isSubmittingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Recording...
                </>
              ) : (
                'Record Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
