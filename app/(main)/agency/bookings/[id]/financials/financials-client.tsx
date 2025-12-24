'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BookingStatusBadge } from '@/components/agency/booking-status-badge';
import { ProfitabilitySummary } from '@/components/cost-revenue/profitability-summary';
import { CostsTable } from '@/components/cost-revenue/costs-table';
import { RevenueTable } from '@/components/cost-revenue/revenue-table';
import { VendorInvoicesList } from '@/components/cost-revenue/vendor-invoices-list';
import { CostForm } from '@/components/cost-revenue/cost-form';
import { RevenueForm } from '@/components/cost-revenue/revenue-form';
import {
  FreightBooking,
  BookingFinancialSummary,
  ShipmentCost,
  ShipmentRevenue,
  AgencyVendorInvoice,
  AgencyChargeType,
  ShipmentCostFormData,
  ShipmentRevenueFormData,
} from '@/types/agency';
import {
  createShipmentCost,
  updateShipmentCost,
  deleteShipmentCost,
  updateCostPaymentStatus,
} from '@/app/actions/shipment-cost-actions';
import {
  createShipmentRevenue,
  updateShipmentRevenue,
  deleteShipmentRevenue,
  updateRevenueBillingStatus,
} from '@/app/actions/shipment-revenue-actions';
import {
  deleteVendorInvoice,
  updateVendorInvoicePayment,
} from '@/app/actions/vendor-invoice-actions';
import { DEFAULT_MARGIN_TARGET } from '@/lib/cost-revenue-utils';
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  Receipt,
  FileText,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';


interface FinancialsClientProps {
  booking: FreightBooking;
  financialSummary: BookingFinancialSummary | null;
  costs: ShipmentCost[];
  revenue: ShipmentRevenue[];
  vendorInvoices: AgencyVendorInvoice[];
  chargeTypes: AgencyChargeType[];
}

export function FinancialsClient({
  booking,
  financialSummary,
  costs,
  revenue,
  vendorInvoices,
  chargeTypes,
}: FinancialsClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Dialog states
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [revenueDialogOpen, setRevenueDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<ShipmentCost | null>(null);
  const [editingRevenue, setEditingRevenue] = useState<ShipmentRevenue | null>(null);

  // Default financial summary if not available
  const summary: BookingFinancialSummary = financialSummary || {
    totalRevenue: 0,
    totalRevenueTax: 0,
    totalCost: 0,
    totalCostTax: 0,
    grossProfit: 0,
    profitMarginPct: 0,
    targetMarginPct: DEFAULT_MARGIN_TARGET,
    isTargetMet: false,
    unbilledRevenue: 0,
    unpaidCosts: 0,
  };

  // Cost handlers
  const handleAddCost = () => {
    setEditingCost(null);
    setCostDialogOpen(true);
  };

  const handleEditCost = (cost: ShipmentCost) => {
    setEditingCost(cost);
    setCostDialogOpen(true);
  };

  const handleCostSubmit = async (data: ShipmentCostFormData) => {
    setIsLoading(true);
    try {
      if (editingCost) {
        const result = await updateShipmentCost(editingCost.id, data);
        if (result.success) {
          toast.success('Cost updated successfully');
          setCostDialogOpen(false);
          setEditingCost(null);
          router.refresh();
        } else {
          toast.error(result.error || 'Failed to update cost');
        }
      } else {
        const result = await createShipmentCost({ ...data, bookingId: booking.id });
        if (result.success) {
          toast.success('Cost added successfully');
          setCostDialogOpen(false);
          router.refresh();
        } else {
          toast.error(result.error || 'Failed to add cost');
        }
      }
    } catch (error) {
      console.error('Error saving cost:', error);
      toast.error('Failed to save cost');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCost = async (cost: ShipmentCost) => {
    if (!confirm('Are you sure you want to delete this cost?')) return;

    setIsLoading(true);
    try {
      const result = await deleteShipmentCost(cost.id);
      if (result.success) {
        toast.success('Cost deleted successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete cost');
      }
    } catch (error) {
      console.error('Error deleting cost:', error);
      toast.error('Failed to delete cost');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkCostPaid = async (cost: ShipmentCost) => {
    setIsLoading(true);
    try {
      const result = await updateCostPaymentStatus(cost.id, 'paid');
      if (result.success) {
        toast.success('Cost marked as paid');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating cost payment status:', error);
      toast.error('Failed to update payment status');
    } finally {
      setIsLoading(false);
    }
  };


  // Revenue handlers
  const handleAddRevenue = () => {
    setEditingRevenue(null);
    setRevenueDialogOpen(true);
  };

  const handleEditRevenue = (rev: ShipmentRevenue) => {
    setEditingRevenue(rev);
    setRevenueDialogOpen(true);
  };

  const handleRevenueSubmit = async (data: ShipmentRevenueFormData) => {
    setIsLoading(true);
    try {
      if (editingRevenue) {
        const result = await updateShipmentRevenue(editingRevenue.id, data);
        if (result.success) {
          toast.success('Revenue updated successfully');
          setRevenueDialogOpen(false);
          setEditingRevenue(null);
          router.refresh();
        } else {
          toast.error(result.error || 'Failed to update revenue');
        }
      } else {
        const result = await createShipmentRevenue({ ...data, bookingId: booking.id });
        if (result.success) {
          toast.success('Revenue added successfully');
          setRevenueDialogOpen(false);
          router.refresh();
        } else {
          toast.error(result.error || 'Failed to add revenue');
        }
      }
    } catch (error) {
      console.error('Error saving revenue:', error);
      toast.error('Failed to save revenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRevenue = async (rev: ShipmentRevenue) => {
    if (!confirm('Are you sure you want to delete this revenue?')) return;

    setIsLoading(true);
    try {
      const result = await deleteShipmentRevenue(rev.id);
      if (result.success) {
        toast.success('Revenue deleted successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete revenue');
      }
    } catch (error) {
      console.error('Error deleting revenue:', error);
      toast.error('Failed to delete revenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkRevenueBilled = async (rev: ShipmentRevenue) => {
    setIsLoading(true);
    try {
      const result = await updateRevenueBillingStatus(rev.id, 'billed');
      if (result.success) {
        toast.success('Revenue marked as billed');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update billing status');
      }
    } catch (error) {
      console.error('Error updating revenue billing status:', error);
      toast.error('Failed to update billing status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkRevenuePaid = async (rev: ShipmentRevenue) => {
    setIsLoading(true);
    try {
      const result = await updateRevenueBillingStatus(rev.id, 'paid');
      if (result.success) {
        toast.success('Revenue marked as paid');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update billing status');
      }
    } catch (error) {
      console.error('Error updating revenue billing status:', error);
      toast.error('Failed to update billing status');
    } finally {
      setIsLoading(false);
    }
  };


  // Vendor invoice handlers
  const handleDeleteVendorInvoice = async (invoice: AgencyVendorInvoice) => {
    if (!confirm('Are you sure you want to delete this vendor invoice?')) return;

    setIsLoading(true);
    try {
      const result = await deleteVendorInvoice(invoice.id);
      if (result.success) {
        toast.success('Vendor invoice deleted successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete vendor invoice');
      }
    } catch (error) {
      console.error('Error deleting vendor invoice:', error);
      toast.error('Failed to delete vendor invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordVendorPayment = async (invoice: AgencyVendorInvoice) => {
    const paidAmount = prompt(
      `Enter payment amount (current: ${invoice.paidAmount}, total: ${invoice.totalAmount}):`,
      String(invoice.totalAmount)
    );
    if (paidAmount === null) return;

    const amount = parseFloat(paidAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateVendorInvoicePayment(invoice.id, amount);
      if (result.success) {
        toast.success('Payment recorded successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewVendorDocument = (invoice: AgencyVendorInvoice) => {
    if (invoice.documentUrl) {
      window.open(invoice.documentUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/agency/bookings/${booking.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Financials: {booking.bookingNumber}</h1>
              <BookingStatusBadge status={booking.status} />
            </div>
            <p className="text-muted-foreground">
              Manage costs, revenue, and profitability for this booking
            </p>
          </div>
        </div>
      </div>

      {/* Profitability Summary */}
      <ProfitabilitySummary summary={summary} />

      {/* Revenue Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Revenue
          </CardTitle>
          <Button onClick={handleAddRevenue} disabled={isLoading}>
            <Plus className="h-4 w-4 mr-2" />
            Add Revenue
          </Button>
        </CardHeader>
        <CardContent>
          <RevenueTable
            revenue={revenue}
            onEdit={handleEditRevenue}
            onDelete={handleDeleteRevenue}
            onMarkBilled={handleMarkRevenueBilled}
            onMarkPaid={handleMarkRevenuePaid}
          />
        </CardContent>
      </Card>


      {/* Costs Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-red-600" />
            Costs
          </CardTitle>
          <Button onClick={handleAddCost} disabled={isLoading}>
            <Plus className="h-4 w-4 mr-2" />
            Add Cost
          </Button>
        </CardHeader>
        <CardContent>
          <CostsTable
            costs={costs}
            onEdit={handleEditCost}
            onDelete={handleDeleteCost}
            onMarkPaid={handleMarkCostPaid}
          />
        </CardContent>
      </Card>

      {/* Vendor Invoices Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Vendor Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VendorInvoicesList
            invoices={vendorInvoices}
            onDelete={handleDeleteVendorInvoice}
            onRecordPayment={handleRecordVendorPayment}
            onViewDocument={handleViewVendorDocument}
          />
        </CardContent>
      </Card>

      {/* Cost Dialog */}
      <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCost ? 'Edit Cost' : 'Add Cost'}
            </DialogTitle>
          </DialogHeader>
          <CostForm
            bookingId={booking.id}
            cost={editingCost}
            chargeTypes={chargeTypes}
            onSubmit={handleCostSubmit}
            onCancel={() => {
              setCostDialogOpen(false);
              setEditingCost(null);
            }}
            isLoading={isLoading}
            mode={editingCost ? 'edit' : 'create'}
          />
        </DialogContent>
      </Dialog>

      {/* Revenue Dialog */}
      <Dialog open={revenueDialogOpen} onOpenChange={setRevenueDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRevenue ? 'Edit Revenue' : 'Add Revenue'}
            </DialogTitle>
          </DialogHeader>
          <RevenueForm
            bookingId={booking.id}
            revenue={editingRevenue}
            chargeTypes={chargeTypes}
            onSubmit={handleRevenueSubmit}
            onCancel={() => {
              setRevenueDialogOpen(false);
              setEditingRevenue(null);
            }}
            isLoading={isLoading}
            mode={editingRevenue ? 'edit' : 'create'}
          />
        </DialogContent>
      </Dialog>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
    </div>
  );
}
