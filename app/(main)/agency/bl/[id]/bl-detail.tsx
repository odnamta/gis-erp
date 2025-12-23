'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BillOfLadingStatusBadge } from '@/components/agency/bl-status-badge';
import { BLPrintView } from '@/components/agency/bl-print-view';
import {
  BillOfLading,
  BL_TYPE_LABELS,
  FREIGHT_TERMS_LABELS,
  BLStatus,
} from '@/types/agency';
import {
  submitBillOfLading,
  issueBillOfLading,
  releaseBillOfLading,
  surrenderBillOfLading,
  deleteBillOfLading,
} from '@/app/actions/bl-documentation-actions';
import {
  ArrowLeft,
  Edit,
  Ship,
  Package,
  Users,
  FileText,
  Printer,
  Loader2,
  MapPin,
  Calendar,
  Send,
  CheckCircle,
  Unlock,
  Flag,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BLDetailProps {
  bl: BillOfLading;
}

export function BLDetail({ bl }: BLDetailProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const canEdit = bl.status === 'draft' || bl.status === 'submitted';
  const canDelete = bl.status === 'draft' || bl.status === 'submitted';

  // Get available status actions based on current status
  const getAvailableActions = (status: BLStatus) => {
    switch (status) {
      case 'draft':
        return ['submit'];
      case 'submitted':
        return ['issue'];
      case 'issued':
        return ['release', 'surrender'];
      default:
        return [];
    }
  };

  const availableActions = getAvailableActions(bl.status);

  const handleStatusChange = async (action: string) => {
    setIsLoading(true);
    try {
      let result;
      switch (action) {
        case 'submit':
          result = await submitBillOfLading(bl.id);
          break;
        case 'issue':
          result = await issueBillOfLading(bl.id);
          break;
        case 'release':
          result = await releaseBillOfLading(bl.id);
          break;
        case 'surrender':
          result = await surrenderBillOfLading(bl.id);
          break;
        default:
          toast.error('Invalid action');
          return;
      }

      if (result.success) {
        toast.success(`B/L ${action}ed successfully`);
        router.refresh();
      } else {
        toast.error(result.error || `Failed to ${action} B/L`);
      }
    } catch (error) {
      console.error(`Error ${action}ing B/L:`, error);
      toast.error(`Failed to ${action} B/L`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const result = await deleteBillOfLading(bl.id);
      if (result.success) {
        toast.success('B/L deleted successfully');
        router.push('/agency/bl');
      } else {
        toast.error(result.error || 'Failed to delete B/L');
      }
    } catch (error) {
      console.error('Error deleting B/L:', error);
      toast.error('Failed to delete B/L');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Print View (hidden until print) */}
      {showPrintView && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto print:relative print:z-auto">
          <div className="p-4 print:hidden">
            <Button variant="outline" onClick={() => setShowPrintView(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <BLPrintView ref={printRef} bl={bl} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/agency/bl">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{bl.blNumber}</h1>
              <BillOfLadingStatusBadge status={bl.status} />
            </div>
            {bl.carrierBlNumber && (
              <p className="text-muted-foreground">
                Carrier Ref: {bl.carrierBlNumber}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          {canEdit && (
            <Link href={`/agency/bl/${bl.id}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Bill of Lading?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    B/L {bl.blNumber}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Status Actions */}
      {availableActions.length > 0 && (
        <Card className="print:hidden">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              {availableActions.includes('submit') && (
                <Button onClick={() => handleStatusChange('submit')} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Submit to Carrier
                </Button>
              )}
              {availableActions.includes('issue') && (
                <Button onClick={() => handleStatusChange('issue')} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Issue B/L
                </Button>
              )}
              {availableActions.includes('release') && (
                <Button onClick={() => handleStatusChange('release')} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
                  Telex Release
                </Button>
              )}
              {availableActions.includes('surrender') && (
                <Button onClick={() => handleStatusChange('surrender')} disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Flag className="h-4 w-4 mr-2" />}
                  Surrender
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Timestamps */}
      {(bl.issuedAt || bl.releasedAt) && (
        <Card className="print:hidden">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-6 text-sm">
              {bl.issuedAt && (
                <div>
                  <span className="text-muted-foreground">Issued: </span>
                  <span className="font-medium">{formatDate(bl.issuedAt)}</span>
                </div>
              )}
              {bl.releasedAt && (
                <div>
                  <span className="text-muted-foreground">Released: </span>
                  <span className="font-medium">{formatDate(bl.releasedAt)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="details" className="print:hidden">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="parties">Parties</TabsTrigger>
          <TabsTrigger value="cargo">Cargo</TabsTrigger>
          <TabsTrigger value="containers">Containers ({bl.containers?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          {/* B/L Type & Reference */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  B/L Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">B/L Type</span>
                  <Badge variant="outline">{BL_TYPE_LABELS[bl.blType]}</Badge>
                </div>
                {bl.blType === 'original' && bl.originalCount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Originals</span>
                    <span className="font-medium">{bl.originalCount}</span>
                  </div>
                )}
                {bl.booking && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Booking</span>
                    <Link href={`/agency/bookings/${bl.bookingId}`} className="text-blue-600 hover:underline">
                      {bl.booking.bookingNumber}
                    </Link>
                  </div>
                )}
                {bl.shippingLine && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping Line</span>
                    <span className="font-medium">{bl.shippingLine.lineName}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ship className="h-5 w-5" />
                  Vessel & Voyage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vessel</span>
                  <span className="font-medium">{bl.vesselName}</span>
                </div>
                {bl.voyageNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Voyage</span>
                    <span className="font-medium">{bl.voyageNumber}</span>
                  </div>
                )}
                {bl.flag && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Flag</span>
                    <span className="font-medium">{bl.flag}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Route */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Route
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Port of Loading</p>
                  <p className="font-medium">{bl.portOfLoading}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Port of Discharge</p>
                  <p className="font-medium">{bl.portOfDischarge}</p>
                </div>
                {bl.placeOfReceipt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Place of Receipt</p>
                    <p className="font-medium">{bl.placeOfReceipt}</p>
                  </div>
                )}
                {bl.placeOfDelivery && (
                  <div>
                    <p className="text-sm text-muted-foreground">Place of Delivery</p>
                    <p className="font-medium">{bl.placeOfDelivery}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dates & Terms */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {bl.shippedOnBoardDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipped on Board</span>
                    <span className="font-medium">{formatDate(bl.shippedOnBoardDate)}</span>
                  </div>
                )}
                {bl.blDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">B/L Date</span>
                    <span className="font-medium">{formatDate(bl.blDate)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{formatDate(bl.createdAt)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Freight Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Terms</span>
                  <Badge variant="outline">{FREIGHT_TERMS_LABELS[bl.freightTerms]}</Badge>
                </div>
                {bl.freightAmount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">
                      {bl.freightCurrency || 'USD'} {bl.freightAmount.toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="parties" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Shipper
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{bl.shipperName}</p>
              {bl.shipperAddress && (
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{bl.shipperAddress}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consignee</CardTitle>
            </CardHeader>
            <CardContent>
              {bl.consigneeToOrder ? (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="font-medium">TO ORDER</p>
                  <p className="text-sm text-muted-foreground">Negotiable B/L</p>
                </div>
              ) : (
                <>
                  <p className="font-medium">{bl.consigneeName || '-'}</p>
                  {bl.consigneeAddress && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{bl.consigneeAddress}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {(bl.notifyPartyName || bl.notifyPartyAddress) && (
            <Card>
              <CardHeader>
                <CardTitle>Notify Party</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{bl.notifyPartyName || '-'}</p>
                {bl.notifyPartyAddress && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{bl.notifyPartyAddress}</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cargo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Cargo Description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Description of Goods</p>
                <p className="font-medium whitespace-pre-line">{bl.cargoDescription}</p>
              </div>
              {bl.marksAndNumbers && (
                <div>
                  <p className="text-sm text-muted-foreground">Marks & Numbers</p>
                  <p className="font-medium whitespace-pre-line">{bl.marksAndNumbers}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cargo Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Packages</p>
                  <p className="font-medium">
                    {bl.numberOfPackages?.toLocaleString() || '-'}
                    {bl.packageType && ` ${bl.packageType}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gross Weight</p>
                  <p className="font-medium">
                    {bl.grossWeightKg?.toLocaleString() || '-'} kg
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Measurement</p>
                  <p className="font-medium">
                    {bl.measurementCbm?.toLocaleString() || '-'} CBM
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Containers</p>
                  <p className="font-medium">{bl.containers?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {bl.remarks && (
            <Card>
              <CardHeader>
                <CardTitle>Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{bl.remarks}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="containers">
          <Card>
            <CardHeader>
              <CardTitle>Container Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!bl.containers || bl.containers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No containers added</p>
              ) : (
                <div className="space-y-4">
                  {bl.containers.map((container, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{container.containerNo}</span>
                          <Badge variant="outline">{container.type}</Badge>
                        </div>
                        {container.sealNo && (
                          <span className="text-sm text-muted-foreground">
                            Seal: {container.sealNo}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Packages: </span>
                          <span>{container.packages?.toLocaleString() || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Weight: </span>
                          <span>{container.weightKg?.toLocaleString() || '-'} kg</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
