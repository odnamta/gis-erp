'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookingStatusBadge } from '@/components/agency/booking-status-badge';
import { BookingStatusHistoryTimeline } from '@/components/agency/booking-status-history';
import { AmendmentDialog } from '@/components/agency/amendment-dialog';
import {
  FreightBooking,
  BookingContainer,
  BookingAmendment,
  BookingStatusHistory,
  BookingFinancialSummary,
  CONTAINER_STATUS_LABELS,
  AMENDMENT_STATUS_LABELS,
  AMENDMENT_TYPE_LABELS,
  ContainerStatus,
  AmendmentStatus,
  AmendmentType,
} from '@/types/agency';
import {
  submitBookingRequest,
  confirmBooking,
  cancelBooking,
  markAsShipped,
  completeBooking,
  requestAmendment,
} from '@/app/actions/booking-actions';
import { getNextValidStatuses, formatCurrency, getCutoffWarningLevel, getDaysUntilCutoff } from '@/lib/booking-utils';
import { ProfitabilitySummaryCompact } from '@/components/cost-revenue/profitability-summary';
import {
  ArrowLeft,
  Edit,
  Ship,
  Package,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Truck,
  Loader2,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface BookingDetailProps {
  booking: FreightBooking;
  containers: BookingContainer[];
  amendments: BookingAmendment[];
  statusHistory: BookingStatusHistory[];
  financialSummary?: BookingFinancialSummary;
}

export function BookingDetail({
  booking,
  containers,
  amendments,
  statusHistory,
  financialSummary,
}: BookingDetailProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [amendmentDialogOpen, setAmendmentDialogOpen] = useState(false);

  const nextStatuses = getNextValidStatuses(booking.status);
  const cutoffWarning = booking.cutoffDate ? getCutoffWarningLevel(booking.cutoffDate) : 'none';
  const daysUntilCutoff = booking.cutoffDate ? getDaysUntilCutoff(booking.cutoffDate) : null;

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true);
    try {
      let result;
      switch (newStatus) {
        case 'requested':
          result = await submitBookingRequest(booking.id);
          break;
        case 'confirmed':
          result = await confirmBooking(booking.id);
          break;
        case 'cancelled':
          result = await cancelBooking(booking.id);
          break;
        case 'shipped':
          result = await markAsShipped(booking.id);
          break;
        case 'completed':
          result = await completeBooking(booking.id);
          break;
        default:
          toast.error('Invalid status transition');
          return;
      }

      if (result.success) {
        toast.success(`Booking ${newStatus}`);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmendmentSubmit = async (data: Parameters<typeof requestAmendment>[1]) => {
    setIsLoading(true);
    try {
      const result = await requestAmendment(booking.id, data);
      if (result.success) {
        toast.success('Amendment requested');
        setAmendmentDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to request amendment');
      }
    } catch (error) {
      console.error('Error requesting amendment:', error);
      toast.error('Failed to request amendment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/agency/bookings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{booking.bookingNumber}</h1>
              <BookingStatusBadge status={booking.status} />
            </div>
            {booking.carrierBookingNumber && (
              <p className="text-muted-foreground">
                Carrier Ref: {booking.carrierBookingNumber}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/agency/bookings/${booking.id}/financials`}>
            <Button variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Financials
            </Button>
          </Link>
          {booking.status === 'draft' && (
            <Link href={`/agency/bookings/${booking.id}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
          {['confirmed', 'amended'].includes(booking.status) && (
            <Button variant="outline" onClick={() => setAmendmentDialogOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Request Amendment
            </Button>
          )}
        </div>
      </div>

      {/* Cutoff Warning */}
      {cutoffWarning !== 'none' && daysUntilCutoff !== null && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            cutoffWarning === 'alert'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
          }`}
        >
          <AlertTriangle className="h-5 w-5" />
          <span>
            {daysUntilCutoff <= 0
              ? 'Cutoff date has passed!'
              : `Cutoff in ${daysUntilCutoff} day${daysUntilCutoff !== 1 ? 's' : ''}`}
          </span>
        </div>
      )}

      {/* Financial Summary */}
      {financialSummary && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <TrendingUp className="h-4 w-4" />
                <span>Financial Summary</span>
              </div>
              <Link href={`/agency/bookings/${booking.id}/financials`}>
                <Button variant="ghost" size="sm" className="text-xs">
                  View Details →
                </Button>
              </Link>
            </div>
            <ProfitabilitySummaryCompact
              totalRevenue={financialSummary.totalRevenue}
              totalCost={financialSummary.totalCost}
              grossProfit={financialSummary.grossProfit}
              profitMarginPct={financialSummary.profitMarginPct}
              targetMargin={financialSummary.targetMarginPct}
            />
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {nextStatuses.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              {nextStatuses.includes('requested') && (
                <Button onClick={() => handleStatusChange('requested')} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Submit Request
                </Button>
              )}
              {nextStatuses.includes('confirmed') && (
                <Button onClick={() => handleStatusChange('confirmed')} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Booking
                </Button>
              )}
              {nextStatuses.includes('shipped') && (
                <Button onClick={() => handleStatusChange('shipped')} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
                  <Truck className="h-4 w-4 mr-2" />
                  Mark as Shipped
                </Button>
              )}
              {nextStatuses.includes('completed') && (
                <Button onClick={() => handleStatusChange('completed')} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete
                </Button>
              )}
              {nextStatuses.includes('cancelled') && (
                <Button variant="destructive" onClick={() => handleStatusChange('cancelled')} disabled={isLoading}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="containers">Containers ({containers.length})</TabsTrigger>
          <TabsTrigger value="amendments">Amendments ({amendments.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          {/* Route & Schedule */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Route
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Origin</p>
                    <p className="font-medium">
                      {booking.originPort?.portName || 'N/A'}
                      {booking.originPort?.portCode && ` (${booking.originPort.portCode})`}
                    </p>
                  </div>
                  <Ship className="h-5 w-5 text-muted-foreground" />
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Destination</p>
                    <p className="font-medium">
                      {booking.destinationPort?.portName || 'N/A'}
                      {booking.destinationPort?.portCode && ` (${booking.destinationPort.portCode})`}
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Shipping Line</p>
                  <p className="font-medium">{booking.shippingLine?.lineName || 'N/A'}</p>
                </div>
                {booking.vesselName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Vessel / Voyage</p>
                    <p className="font-medium">
                      {booking.vesselName} {booking.voyageNumber && `/ ${booking.voyageNumber}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {booking.etd && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ETD</span>
                    <span className="font-medium">{format(new Date(booking.etd), 'dd MMM yyyy')}</span>
                  </div>
                )}
                {booking.eta && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ETA</span>
                    <span className="font-medium">{format(new Date(booking.eta), 'dd MMM yyyy')}</span>
                  </div>
                )}
                {booking.cutoffDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cutoff</span>
                    <span className={`font-medium ${cutoffWarning === 'alert' ? 'text-red-600' : cutoffWarning === 'warning' ? 'text-yellow-600' : ''}`}>
                      {format(new Date(booking.cutoffDate), 'dd MMM yyyy')}
                      {booking.cutoffTime && ` ${booking.cutoffTime}`}
                    </span>
                  </div>
                )}
                {booking.siCutoff && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SI Cutoff</span>
                    <span className="font-medium">{format(new Date(booking.siCutoff), 'dd MMM yyyy HH:mm')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cargo & Freight */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Cargo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{booking.cargoDescription}</p>
                </div>
                {booking.hsCode && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">HS Code</span>
                    <span className="font-medium">{booking.hsCode}</span>
                  </div>
                )}
                {booking.grossWeightKg && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Weight</span>
                    <span className="font-medium">{booking.grossWeightKg.toLocaleString()} kg</span>
                  </div>
                )}
                {booking.volumeCbm && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volume</span>
                    <span className="font-medium">{booking.volumeCbm} CBM</span>
                  </div>
                )}
                {booking.dangerousGoods && (
                  <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm font-medium text-orange-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Dangerous Goods
                    </p>
                    <p className="text-sm text-orange-700 mt-1">
                      UN{booking.dangerousGoods.unNumber} - Class {booking.dangerousGoods.class}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Freight
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {booking.incoterm && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Incoterm</span>
                    <Badge variant="outline">{booking.incoterm}</Badge>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Freight Terms</span>
                  <span className="font-medium capitalize">{booking.freightTerms}</span>
                </div>
                {booking.totalFreight && (
                  <div className="flex justify-between text-lg">
                    <span className="text-muted-foreground">Total Freight</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(booking.totalFreight, booking.freightCurrency)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Parties */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Parties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                {booking.shipperName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Shipper</p>
                    <p className="font-medium">{booking.shipperName}</p>
                    {booking.shipperAddress && (
                      <p className="text-sm text-muted-foreground mt-1">{booking.shipperAddress}</p>
                    )}
                  </div>
                )}
                {booking.consigneeName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Consignee</p>
                    <p className="font-medium">{booking.consigneeName}</p>
                    {booking.consigneeAddress && (
                      <p className="text-sm text-muted-foreground mt-1">{booking.consigneeAddress}</p>
                    )}
                  </div>
                )}
                {booking.notifyParty && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notify Party</p>
                    <p className="font-medium">{booking.notifyParty}</p>
                    {booking.notifyAddress && (
                      <p className="text-sm text-muted-foreground mt-1">{booking.notifyAddress}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="containers">
          <Card>
            <CardHeader>
              <CardTitle>Containers</CardTitle>
            </CardHeader>
            <CardContent>
              {containers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No containers added</p>
              ) : (
                <div className="space-y-4">
                  {containers.map((container) => (
                    <div key={container.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{container.containerType}</Badge>
                          {container.containerNumber && (
                            <span className="font-mono font-medium">{container.containerNumber}</span>
                          )}
                        </div>
                        <Badge>{CONTAINER_STATUS_LABELS[container.status as ContainerStatus]}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        {container.sealNumber && (
                          <div>
                            <span className="text-muted-foreground">Seal: </span>
                            <span>{container.sealNumber}</span>
                          </div>
                        )}
                        {container.grossWeightKg && (
                          <div>
                            <span className="text-muted-foreground">Weight: </span>
                            <span>{container.grossWeightKg.toLocaleString()} kg</span>
                          </div>
                        )}
                        {container.packagesCount && (
                          <div>
                            <span className="text-muted-foreground">Packages: </span>
                            <span>{container.packagesCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amendments">
          <Card>
            <CardHeader>
              <CardTitle>Amendments</CardTitle>
            </CardHeader>
            <CardContent>
              {amendments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No amendments</p>
              ) : (
                <div className="space-y-4">
                  {amendments.map((amendment) => (
                    <div key={amendment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Amendment #{amendment.amendmentNumber}</span>
                          <Badge variant="outline">
                            {AMENDMENT_TYPE_LABELS[amendment.amendmentType as AmendmentType]}
                          </Badge>
                        </div>
                        <Badge
                          className={
                            amendment.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : amendment.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }
                        >
                          {AMENDMENT_STATUS_LABELS[amendment.status as AmendmentStatus]}
                        </Badge>
                      </div>
                      <p className="text-sm">{amendment.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Requested: {format(new Date(amendment.requestedAt), 'dd MMM yyyy HH:mm')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <BookingStatusHistoryTimeline history={statusHistory} />
        </TabsContent>
      </Tabs>

      {/* Amendment Dialog */}
      <AmendmentDialog
        open={amendmentDialogOpen}
        onOpenChange={setAmendmentDialogOpen}
        onSubmit={handleAmendmentSubmit}
        bookingNumber={booking.bookingNumber}
        currentValues={{
          etd: booking.etd,
          eta: booking.eta,
          cutoffDate: booking.cutoffDate,
          containerQuantity: booking.containerQuantity,
          grossWeightKg: booking.grossWeightKg,
          vesselName: booking.vesselName,
          voyageNumber: booking.voyageNumber,
          freightRate: booking.freightRate,
          totalFreight: booking.totalFreight,
          consigneeName: booking.consigneeName,
          consigneeAddress: booking.consigneeAddress,
        }}
        isLoading={isLoading}
      />
    </div>
  );
}
