'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ShippingInstructionStatusBadge } from '@/components/agency/bl-status-badge';
import {
  ShippingInstruction,
  BillOfLading,
  BL_TYPE_LABELS,
  FREIGHT_TERMS_LABELS,
  SIStatus,
} from '@/types/agency';
import {
  submitShippingInstruction,
  confirmShippingInstruction,
  amendShippingInstruction,
  deleteShippingInstruction,
} from '@/app/actions/bl-documentation-actions';
import {
  ArrowLeft,
  Edit,
  Package,
  Users,
  FileText,
  Loader2,
  Calendar,
  Send,
  CheckCircle,
  Trash2,
  CreditCard,
  CheckSquare,
  Link as LinkIcon,
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

interface SIDetailProps {
  si: ShippingInstruction;
  availableBLs: BillOfLading[];
}

export function SIDetail({ si, availableBLs }: SIDetailProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedBLId, setSelectedBLId] = useState<string>('');

  const canEdit = si.status === 'draft';
  const canDelete = si.status === 'draft' || si.status === 'submitted';

  // Get available status actions based on current status
  const getAvailableActions = (status: SIStatus) => {
    switch (status) {
      case 'draft':
        return ['submit'];
      case 'submitted':
        return ['confirm', 'amend'];
      case 'confirmed':
        return ['amend'];
      default:
        return [];
    }
  };

  const availableActions = getAvailableActions(si.status);

  // Filter B/Ls that can be linked (same booking or no booking restriction)
  const linkableBLs = availableBLs.filter(bl => 
    bl.bookingId === si.bookingId || !si.bookingId
  );

  const handleStatusChange = async (action: string) => {
    if (action === 'confirm') {
      setShowConfirmDialog(true);
      return;
    }

    setIsLoading(true);
    try {
      let result;
      switch (action) {
        case 'submit':
          result = await submitShippingInstruction(si.id);
          break;
        case 'amend':
          result = await amendShippingInstruction(si.id);
          break;
        default:
          toast.error('Invalid action');
          return;
      }

      if (result.success) {
        toast.success(`SI ${action}ed successfully`);
        router.refresh();
      } else {
        toast.error(result.error || `Failed to ${action} SI`);
      }
    } catch (error) {
      console.error(`Error ${action}ing SI:`, error);
      toast.error(`Failed to ${action} SI`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmWithBL = async () => {
    if (!selectedBLId) {
      toast.error('Please select a Bill of Lading to link');
      return;
    }

    setIsLoading(true);
    try {
      const result = await confirmShippingInstruction(si.id, selectedBLId);
      if (result.success) {
        toast.success('SI confirmed and linked to B/L successfully');
        setShowConfirmDialog(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to confirm SI');
      }
    } catch (error) {
      console.error('Error confirming SI:', error);
      toast.error('Failed to confirm SI');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const result = await deleteShippingInstruction(si.id);
      if (result.success) {
        toast.success('SI deleted successfully');
        router.push('/agency/si');
      } else {
        toast.error(result.error || 'Failed to delete SI');
      }
    } catch (error) {
      console.error('Error deleting SI:', error);
      toast.error('Failed to delete SI');
    } finally {
      setIsLoading(false);
    }
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

  // Common documents labels
  const documentLabels: Record<string, string> = {
    commercial_invoice: 'Commercial Invoice',
    packing_list: 'Packing List',
    certificate_of_origin: 'Certificate of Origin',
    bill_of_lading: 'Bill of Lading',
    insurance_certificate: 'Insurance Certificate',
    inspection_certificate: 'Inspection Certificate',
    phytosanitary_certificate: 'Phytosanitary Certificate',
    fumigation_certificate: 'Fumigation Certificate',
    weight_certificate: 'Weight Certificate',
    quality_certificate: 'Quality Certificate',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/agency/si">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{si.siNumber}</h1>
              <ShippingInstructionStatusBadge status={si.status} />
            </div>
            {si.booking && (
              <p className="text-muted-foreground">
                Booking: {si.booking.bookingNumber}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Link href={`/agency/si/${si.id}/edit`}>
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
                  <AlertDialogTitle>Delete Shipping Instruction?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    SI {si.siNumber}.
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
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              {availableActions.includes('submit') && (
                <Button onClick={() => handleStatusChange('submit')} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Submit to Carrier
                </Button>
              )}
              {availableActions.includes('confirm') && (
                <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700" disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Confirm & Link B/L
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Shipping Instruction</DialogTitle>
                      <DialogDescription>
                        Select a Bill of Lading to link with this SI. This will mark the SI as confirmed.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Select value={selectedBLId} onValueChange={setSelectedBLId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a Bill of Lading" />
                        </SelectTrigger>
                        <SelectContent>
                          {linkableBLs.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No B/Ls available for this booking
                            </SelectItem>
                          ) : (
                            linkableBLs.map((bl) => (
                              <SelectItem key={bl.id} value={bl.id}>
                                {bl.blNumber} - {bl.vesselName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleConfirmWithBL} 
                        disabled={isLoading || !selectedBLId}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LinkIcon className="h-4 w-4 mr-2" />}
                        Confirm & Link
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {availableActions.includes('amend') && (
                <Button 
                  variant="outline" 
                  onClick={() => handleStatusChange('amend')} 
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                  Amend
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Timestamps */}
      {(si.submittedAt || si.confirmedAt) && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-6 text-sm">
              {si.submittedAt && (
                <div>
                  <span className="text-muted-foreground">Submitted: </span>
                  <span className="font-medium">{formatDate(si.submittedAt)}</span>
                </div>
              )}
              {si.confirmedAt && (
                <div>
                  <span className="text-muted-foreground">Confirmed: </span>
                  <span className="font-medium">{formatDate(si.confirmedAt)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked B/L */}
      {si.bl && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">Linked to Bill of Lading:</span>
              <Link 
                href={`/agency/bl/${si.bl.id}`}
                className="font-medium text-green-700 hover:underline"
              >
                {si.bl.blNumber}
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="parties">Parties</TabsTrigger>
          <TabsTrigger value="cargo">Cargo</TabsTrigger>
          <TabsTrigger value="bl">B/L Request</TabsTrigger>
          <TabsTrigger value="lc">LC & Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          {/* SI Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                SI Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SI Number</span>
                <span className="font-mono font-medium">{si.siNumber}</span>
              </div>
              {si.booking && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking</span>
                  <Link href={`/agency/bookings/${si.bookingId}`} className="text-blue-600 hover:underline">
                    {si.booking.bookingNumber}
                  </Link>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{formatDate(si.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
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
              <p className="font-medium">{si.shipperName}</p>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{si.shipperAddress}</p>
              {si.shipperContact && (
                <p className="text-sm text-muted-foreground mt-2">Contact: {si.shipperContact}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consignee</CardTitle>
            </CardHeader>
            <CardContent>
              {si.consigneeToOrder ? (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="font-medium">TO ORDER</p>
                  {si.toOrderText && (
                    <p className="text-sm text-muted-foreground mt-1">{si.toOrderText}</p>
                  )}
                </div>
              ) : (
                <>
                  <p className="font-medium">{si.consigneeName || '-'}</p>
                  {si.consigneeAddress && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{si.consigneeAddress}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {(si.notifyPartyName || si.notifyPartyAddress) && (
            <Card>
              <CardHeader>
                <CardTitle>Notify Party</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{si.notifyPartyName || '-'}</p>
                {si.notifyPartyAddress && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{si.notifyPartyAddress}</p>
                )}
              </CardContent>
            </Card>
          )}

          {(si.secondNotifyName || si.secondNotifyAddress) && (
            <Card>
              <CardHeader>
                <CardTitle>Second Notify Party</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{si.secondNotifyName || '-'}</p>
                {si.secondNotifyAddress && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{si.secondNotifyAddress}</p>
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
                <p className="font-medium whitespace-pre-line">{si.cargoDescription}</p>
              </div>
              {si.marksAndNumbers && (
                <div>
                  <p className="text-sm text-muted-foreground">Marks & Numbers</p>
                  <p className="font-medium whitespace-pre-line">{si.marksAndNumbers}</p>
                </div>
              )}
              {si.hsCode && (
                <div>
                  <p className="text-sm text-muted-foreground">HS Code</p>
                  <p className="font-medium">{si.hsCode}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cargo Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Packages</p>
                  <p className="font-medium">
                    {si.numberOfPackages?.toLocaleString() || '-'}
                    {si.packageType && ` ${si.packageType}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gross Weight</p>
                  <p className="font-medium">
                    {si.grossWeightKg?.toLocaleString() || '-'} kg
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Weight</p>
                  <p className="font-medium">
                    {si.netWeightKg?.toLocaleString() || '-'} kg
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Measurement</p>
                  <p className="font-medium">
                    {si.measurementCbm?.toLocaleString() || '-'} CBM
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bl" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                B/L Type Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requested B/L Type</span>
                <Badge variant="outline">
                  {si.blTypeRequested ? BL_TYPE_LABELS[si.blTypeRequested] : '-'}
                </Badge>
              </div>
              {si.blTypeRequested === 'original' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Originals Required</span>
                    <span className="font-medium">{si.originalsRequired}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Copies Required</span>
                    <span className="font-medium">{si.copiesRequired}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Freight Terms</span>
                <Badge variant="outline">{FREIGHT_TERMS_LABELS[si.freightTerms]}</Badge>
              </div>
            </CardContent>
          </Card>

          {si.specialInstructions && (
            <Card>
              <CardHeader>
                <CardTitle>Special Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{si.specialInstructions}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="lc" className="space-y-6">
          {(si.lcNumber || si.lcIssuingBank || si.lcTerms) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Letter of Credit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {si.lcNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">LC Number</span>
                    <span className="font-medium">{si.lcNumber}</span>
                  </div>
                )}
                {si.lcIssuingBank && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Issuing Bank</span>
                    <span className="font-medium">{si.lcIssuingBank}</span>
                  </div>
                )}
                {si.lcTerms && (
                  <div>
                    <p className="text-sm text-muted-foreground">LC Terms</p>
                    <p className="font-medium mt-1">{si.lcTerms}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {si.documentsRequired && si.documentsRequired.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Documents Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {si.documentsRequired.map((doc, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-green-600" />
                      <span>{documentLabels[doc] || doc}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {!si.lcNumber && !si.lcIssuingBank && !si.lcTerms && (!si.documentsRequired || si.documentsRequired.length === 0) && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No LC requirements or documents specified
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
