'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrivalNoticeStatusBadge } from '@/components/agency/bl-status-badge';
import {
  ArrivalNotice,
  ArrivalNoticeStatus,
} from '@/types/agency';
import {
  markConsigneeNotified,
  markCargoCleared,
  markCargoDelivered,
  deleteArrivalNotice,
} from '@/app/actions/bl-documentation-actions';
import {
  ArrowLeft,
  Edit,
  Ship,
  Package,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Loader2,
  Bell,
  CheckCircle,
  Truck,
  Trash2,
  AlertTriangle,
  FileText,
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


interface ArrivalNoticeDetailProps {
  notice: ArrivalNotice;
}

export function ArrivalNoticeDetail({ notice }: ArrivalNoticeDetailProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const canEdit = notice.status === 'pending';
  const canDelete = notice.status === 'pending';

  // Get available status actions based on current status
  const getAvailableActions = (status: ArrivalNoticeStatus) => {
    switch (status) {
      case 'pending':
        return ['notify'];
      case 'notified':
        return ['clear'];
      case 'cleared':
        return ['deliver'];
      default:
        return [];
    }
  };

  const availableActions = getAvailableActions(notice.status);

  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  // Calculate free time status
  const getFreeTimeStatus = () => {
    if (!notice.freeTimeExpires) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(notice.freeTimeExpires);
    expiryDate.setHours(0, 0, 0, 0);
    
    const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining < 0) {
      return {
        status: 'expired',
        label: `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} ago`,
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200',
        icon: AlertTriangle,
      };
    } else if (daysRemaining === 0) {
      return {
        status: 'expiring',
        label: 'Expires today',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 border-orange-200',
        icon: AlertTriangle,
      };
    } else if (daysRemaining <= 3) {
      return {
        status: 'warning',
        label: `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 border-yellow-200',
        icon: Clock,
      };
    } else {
      return {
        status: 'ok',
        label: `${daysRemaining} days remaining`,
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
        icon: CheckCircle,
      };
    }
  };

  const freeTimeStatus = getFreeTimeStatus();

  // Calculate total estimated charges
  const getTotalCharges = () => {
    if (!notice.estimatedCharges || notice.estimatedCharges.length === 0) return 0;
    return notice.estimatedCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
  };

  const handleStatusChange = async (action: string) => {
    setIsLoading(true);
    try {
      let result;
      switch (action) {
        case 'notify':
          result = await markConsigneeNotified(notice.id, 'Current User');
          break;
        case 'clear':
          result = await markCargoCleared(notice.id);
          break;
        case 'deliver':
          result = await markCargoDelivered(notice.id);
          break;
        default:
          toast.error('Invalid action');
          return;
      }

      if (result.success) {
        const actionLabels: Record<string, string> = {
          notify: 'Consignee notified',
          clear: 'Cargo cleared',
          deliver: 'Cargo delivered',
        };
        toast.success(actionLabels[action] || 'Status updated successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update status');
      }
    } catch (error) {
      console.error(`Error updating status:`, error);
      toast.error('Failed to update status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const result = await deleteArrivalNotice(notice.id);
      if (result.success) {
        toast.success('Arrival Notice deleted successfully');
        router.push('/agency/arrivals');
      } else {
        toast.error(result.error || 'Failed to delete Arrival Notice');
      }
    } catch (error) {
      console.error('Error deleting Arrival Notice:', error);
      toast.error('Failed to delete Arrival Notice');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/agency/arrivals">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{notice.noticeNumber}</h1>
              <ArrivalNoticeStatusBadge status={notice.status} />
            </div>
            {notice.bl && (
              <p className="text-muted-foreground">
                B/L: <Link href={`/agency/bl/${notice.blId}`} className="text-blue-600 hover:underline">{notice.bl.blNumber}</Link>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Link href={`/agency/arrivals/${notice.id}/edit`}>
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
                  <AlertDialogTitle>Delete Arrival Notice?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    arrival notice {notice.noticeNumber}.
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

      {/* Free Time Alert */}
      {freeTimeStatus && notice.status !== 'delivered' && (
        <Card className={freeTimeStatus.bgColor}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <freeTimeStatus.icon className={`h-5 w-5 ${freeTimeStatus.color}`} />
              <div>
                <p className={`font-medium ${freeTimeStatus.color}`}>
                  Free Time: {freeTimeStatus.label}
                </p>
                <p className="text-sm text-muted-foreground">
                  Expires: {formatDate(notice.freeTimeExpires)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Actions */}
      {availableActions.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              {availableActions.includes('notify') && (
                <Button onClick={() => handleStatusChange('notify')} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
                  Notify Consignee
                </Button>
              )}
              {availableActions.includes('clear') && (
                <Button onClick={() => handleStatusChange('clear')} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Mark Cleared
                </Button>
              )}
              {availableActions.includes('deliver') && (
                <Button onClick={() => handleStatusChange('deliver')} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}
                  Mark Delivered
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Timestamps */}
      {(notice.notifiedAt || notice.clearedAt || notice.deliveredAt) && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-6 text-sm">
              {notice.notifiedAt && (
                <div>
                  <span className="text-muted-foreground">Notified: </span>
                  <span className="font-medium">{formatDate(notice.notifiedAt)}</span>
                  {notice.notifiedBy && <span className="text-muted-foreground"> by {notice.notifiedBy}</span>}
                </div>
              )}
              {notice.clearedAt && (
                <div>
                  <span className="text-muted-foreground">Cleared: </span>
                  <span className="font-medium">{formatDate(notice.clearedAt)}</span>
                </div>
              )}
              {notice.deliveredAt && (
                <div>
                  <span className="text-muted-foreground">Delivered: </span>
                  <span className="font-medium">{formatDate(notice.deliveredAt)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="cargo">Cargo</TabsTrigger>
          <TabsTrigger value="charges">Charges ({notice.estimatedCharges?.length || 0})</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          {/* Vessel & Voyage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ship className="h-5 w-5" />
                Vessel & Voyage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Vessel Name</p>
                  <p className="font-medium">{notice.vesselName}</p>
                </div>
                {notice.voyageNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">Voyage Number</p>
                    <p className="font-medium">{notice.voyageNumber}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Port & Terminal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Port & Terminal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Port of Discharge</p>
                  <p className="font-medium">{notice.portOfDischarge}</p>
                </div>
                {notice.terminal && (
                  <div>
                    <p className="text-sm text-muted-foreground">Terminal</p>
                    <p className="font-medium">{notice.terminal}</p>
                  </div>
                )}
                {notice.berth && (
                  <div>
                    <p className="text-sm text-muted-foreground">Berth</p>
                    <p className="font-medium">{notice.berth}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule & Free Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">ETA</p>
                  <p className="font-medium">{formatDate(notice.eta)}</p>
                </div>
                {notice.ata && (
                  <div>
                    <p className="text-sm text-muted-foreground">ATA</p>
                    <p className="font-medium">{formatDate(notice.ata)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Free Time</p>
                  <p className="font-medium">{notice.freeTimeDays} days</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Free Time Expires</p>
                  <p className="font-medium">{formatDate(notice.freeTimeExpires)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {notice.bl && (
                  <div>
                    <p className="text-sm text-muted-foreground">Bill of Lading</p>
                    <Link href={`/agency/bl/${notice.blId}`} className="font-medium text-blue-600 hover:underline">
                      {notice.bl.blNumber}
                    </Link>
                  </div>
                )}
                {notice.booking && (
                  <div>
                    <p className="text-sm text-muted-foreground">Booking</p>
                    <Link href={`/agency/bookings/${notice.bookingId}`} className="font-medium text-blue-600 hover:underline">
                      {notice.booking.bookingNumber}
                    </Link>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(notice.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cargo" className="space-y-6">
          {/* Cargo Description */}
          {notice.cargoDescription && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Cargo Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{notice.cargoDescription}</p>
              </CardContent>
            </Card>
          )}

          {/* Containers */}
          <Card>
            <CardHeader>
              <CardTitle>Containers ({notice.containerNumbers?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {!notice.containerNumbers || notice.containerNumbers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No containers listed</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-3">
                  {notice.containerNumbers.map((containerNo, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg font-mono text-center">
                      {containerNo}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charges" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Estimated Charges
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!notice.estimatedCharges || notice.estimatedCharges.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No charges estimated</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {notice.estimatedCharges.map((charge, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-medium">{charge.chargeType}</span>
                        <span>
                          {charge.currency} {charge.amount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total Estimated Charges</span>
                      <span className="text-lg font-bold">
                        {getTotalCharges().toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Note: Amounts may be in different currencies
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-6">
          {/* Delivery Instructions */}
          {notice.deliveryInstructions && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{notice.deliveryInstructions}</p>
              </CardContent>
            </Card>
          )}

          {/* Delivery Address */}
          {notice.deliveryAddress && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Address</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{notice.deliveryAddress}</p>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {notice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{notice.notes}</p>
              </CardContent>
            </Card>
          )}

          {!notice.deliveryInstructions && !notice.deliveryAddress && !notice.notes && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">No delivery information provided</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
