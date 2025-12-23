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
  Phone,
  Mail,
  MapPin,
  Building2,
  FileText,
  Briefcase,
  Globe,
} from 'lucide-react';
import { ServiceProvider, PROVIDER_TYPE_LABELS } from '@/types/agency';
import { deleteServiceProvider } from '@/app/actions/agency-actions';
import { useToast } from '@/hooks/use-toast';

interface ServiceProviderDetailProps {
  serviceProvider: ServiceProvider;
}

export function ServiceProviderDetail({ serviceProvider }: ServiceProviderDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteServiceProvider(serviceProvider.id);
    if (result.success) {
      toast({ title: 'Success', description: 'Service provider deleted' });
      router.push('/agency/service-providers');
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to delete', variant: 'destructive' });
      setIsDeleting(false);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" onClick={() => router.push('/agency/service-providers')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Service Providers
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{serviceProvider.providerName}</h1>
            {serviceProvider.isPreferred && <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">{serviceProvider.providerCode}</p>
            <Badge variant="secondary">{PROVIDER_TYPE_LABELS[serviceProvider.providerType]}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/agency/service-providers/${serviceProvider.id}/edit`)}>
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
        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {serviceProvider.address && <p>{serviceProvider.address}</p>}
            <p>
              {[serviceProvider.city, serviceProvider.province, serviceProvider.country].filter(Boolean).join(', ')}
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {serviceProvider.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${serviceProvider.phone}`} className="hover:underline">{serviceProvider.phone}</a>
              </div>
            )}
            {serviceProvider.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${serviceProvider.email}`} className="hover:underline">{serviceProvider.email}</a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating */}
        <Card>
          <CardHeader>
            <CardTitle>Rating & Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {serviceProvider.serviceRating ? (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${star <= Math.round(serviceProvider.serviceRating!) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                  />
                ))}
                <span className="ml-2 font-medium">{serviceProvider.serviceRating.toFixed(1)}</span>
              </div>
            ) : (
              <p className="text-muted-foreground">No rating yet</p>
            )}
            {serviceProvider.paymentTerms && (
              <div>
                <p className="text-sm text-muted-foreground">Payment Terms</p>
                <p className="font-medium">{serviceProvider.paymentTerms}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Business Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {serviceProvider.npwp && (
              <div>
                <p className="text-sm text-muted-foreground">NPWP</p>
                <p className="font-medium">{serviceProvider.npwp}</p>
              </div>
            )}
            {serviceProvider.siup && (
              <div>
                <p className="text-sm text-muted-foreground">SIUP</p>
                <p className="font-medium">{serviceProvider.siup}</p>
              </div>
            )}
            {!serviceProvider.npwp && !serviceProvider.siup && (
              <p className="text-muted-foreground">No documents on file</p>
            )}
          </CardContent>
        </Card>

        {/* Services & Rates */}
        {serviceProvider.servicesDetail.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Services & Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-medium">Service</th>
                      <th className="text-left py-2 px-4 font-medium">Unit</th>
                      <th className="text-right py-2 px-4 font-medium">Rate</th>
                      <th className="text-left py-2 px-4 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceProvider.servicesDetail.map((service, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-2 px-4">{service.service}</td>
                        <td className="py-2 px-4">{service.unit}</td>
                        <td className="py-2 px-4 text-right">{formatCurrency(service.rate, service.currency)}</td>
                        <td className="py-2 px-4 text-muted-foreground">{service.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Coverage Areas */}
        {serviceProvider.coverageAreas.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Coverage Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {serviceProvider.coverageAreas.map((area, index) => (
                  <Badge key={index} variant="outline">
                    {area.city}, {area.province}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contacts */}
        {serviceProvider.contacts.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {serviceProvider.contacts.map((contact, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.role}</p>
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3" />
                        <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3" />
                        <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {serviceProvider.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{serviceProvider.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{serviceProvider.providerName}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
