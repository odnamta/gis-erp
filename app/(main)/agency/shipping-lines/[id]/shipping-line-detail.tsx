'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Star,
  Globe,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Ship,
  ExternalLink,
  User,
} from 'lucide-react';
import { ShippingLine, SERVICE_TYPE_LABELS } from '@/types/agency';
import { deleteShippingLine, toggleShippingLinePreferred } from '@/app/actions/agency-actions';
import { useToast } from '@/hooks/use-toast';

interface ShippingLineDetailProps {
  shippingLine: ShippingLine;
}

export function ShippingLineDetail({ shippingLine }: ShippingLineDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleTogglePreferred = async () => {
    const result = await toggleShippingLinePreferred(shippingLine.id);
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Preferred status updated',
      });
      router.refresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update preferred status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteShippingLine(shippingLine.id);
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Shipping line deleted',
      });
      router.push('/agency/shipping-lines');
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete shipping line',
        variant: 'destructive',
      });
      setIsDeleting(false);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/agency/shipping-lines')}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shipping Lines
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{shippingLine.lineName}</h1>
            {shippingLine.isPreferred && (
              <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            )}
          </div>
          <p className="text-muted-foreground">{shippingLine.lineCode}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTogglePreferred}>
            <Star className="mr-2 h-4 w-4" />
            {shippingLine.isPreferred ? 'Remove Preferred' : 'Mark Preferred'}
          </Button>
          <Button variant="outline" onClick={() => router.push(`/agency/shipping-lines/${shippingLine.id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {shippingLine.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a
                  href={shippingLine.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {shippingLine.website}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {shippingLine.bookingPortalUrl && (
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <a
                  href={shippingLine.bookingPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Booking Portal
                </a>
              </div>
            )}
            {shippingLine.trackingUrl && (
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <a
                  href={shippingLine.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Tracking Portal
                </a>
              </div>
            )}
            {(shippingLine.headOfficeAddress || shippingLine.headOfficeCountry) && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  {shippingLine.headOfficeAddress && <p>{shippingLine.headOfficeAddress}</p>}
                  {shippingLine.headOfficeCountry && (
                    <p className="text-muted-foreground">{shippingLine.headOfficeCountry}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Local Representative */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Local Representative
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {shippingLine.localAgentName ? (
              <>
                <p className="font-medium">{shippingLine.localAgentName}</p>
                {shippingLine.localAgentAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p>{shippingLine.localAgentAddress}</p>
                  </div>
                )}
                {shippingLine.localAgentPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${shippingLine.localAgentPhone}`} className="hover:underline">
                      {shippingLine.localAgentPhone}
                    </a>
                  </div>
                )}
                {shippingLine.localAgentEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${shippingLine.localAgentEmail}`} className="hover:underline">
                      {shippingLine.localAgentEmail}
                    </a>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No local representative assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Services & Rating */}
        <Card>
          <CardHeader>
            <CardTitle>Services & Rating</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {shippingLine.servicesOffered.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Services Offered</p>
                <div className="flex flex-wrap gap-2">
                  {shippingLine.servicesOffered.map((service) => (
                    <Badge key={service} variant="secondary">
                      {SERVICE_TYPE_LABELS[service]}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {shippingLine.serviceRating && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Service Rating</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= Math.round(shippingLine.serviceRating!)
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 font-medium">{shippingLine.serviceRating.toFixed(1)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commercial Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Commercial Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {shippingLine.paymentTerms && (
              <div>
                <p className="text-sm text-muted-foreground">Payment Terms</p>
                <p className="font-medium">{shippingLine.paymentTerms}</p>
              </div>
            )}
            {shippingLine.creditLimit && (
              <div>
                <p className="text-sm text-muted-foreground">Credit Limit</p>
                <p className="font-medium">{formatCurrency(shippingLine.creditLimit)}</p>
              </div>
            )}
            {shippingLine.creditDays && (
              <div>
                <p className="text-sm text-muted-foreground">Credit Days</p>
                <p className="font-medium">{shippingLine.creditDays} days</p>
              </div>
            )}
            {!shippingLine.paymentTerms && !shippingLine.creditLimit && !shippingLine.creditDays && (
              <p className="text-muted-foreground">No commercial terms specified</p>
            )}
          </CardContent>
        </Card>

        {/* Contacts */}
        {shippingLine.contacts.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {shippingLine.contacts.map((contact, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.role}</p>
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3" />
                        <a href={`tel:${contact.phone}`} className="hover:underline">
                          {contact.phone}
                        </a>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3" />
                        <a href={`mailto:${contact.email}`} className="hover:underline">
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.notes && (
                      <p className="text-sm text-muted-foreground">{contact.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Routes Served */}
        {shippingLine.routesServed.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Routes Served</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-medium">Origin</th>
                      <th className="text-left py-2 px-4 font-medium">Destination</th>
                      <th className="text-left py-2 px-4 font-medium">Frequency</th>
                      <th className="text-left py-2 px-4 font-medium">Transit Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shippingLine.routesServed.map((route, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-2 px-4">{route.originPort}</td>
                        <td className="py-2 px-4">{route.destinationPort}</td>
                        <td className="py-2 px-4">{route.frequency || '-'}</td>
                        <td className="py-2 px-4">{route.transitDays ? `${route.transitDays} days` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {shippingLine.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{shippingLine.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shipping Line</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{shippingLine.lineName}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
