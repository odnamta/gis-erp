'use client';

import { useRouter } from 'next/navigation';
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
import { Star, MoreVertical, Pencil, Trash2, Eye, Phone, Mail, MapPin } from 'lucide-react';
import { ServiceProvider, PROVIDER_TYPE_LABELS } from '@/types/agency';

interface ServiceProviderCardProps {
  serviceProvider: ServiceProvider;
  onDelete: (provider: ServiceProvider) => void;
}

export function ServiceProviderCard({ serviceProvider, onDelete }: ServiceProviderCardProps) {
  const router = useRouter();

  const formatLocation = () => {
    const parts = [serviceProvider.city, serviceProvider.province, serviceProvider.country].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{serviceProvider.providerName}</CardTitle>
              {serviceProvider.isPreferred && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{serviceProvider.providerCode}</p>
              <Badge variant="outline" className="text-xs">
                {PROVIDER_TYPE_LABELS[serviceProvider.providerType]}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/agency/service-providers/${serviceProvider.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/agency/service-providers/${serviceProvider.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(serviceProvider)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location */}
        {formatLocation() && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{formatLocation()}</span>
          </div>
        )}

        {/* Services */}
        {serviceProvider.servicesDetail.length > 0 && (
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Services:</span>
            <div className="flex flex-wrap gap-1">
              {serviceProvider.servicesDetail.slice(0, 3).map((service, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {service.service}
                </Badge>
              ))}
              {serviceProvider.servicesDetail.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{serviceProvider.servicesDetail.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Coverage Areas */}
        {serviceProvider.coverageAreas.length > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">Coverage:</span>{' '}
            <span>
              {serviceProvider.coverageAreas.slice(0, 2).map(a => a.city).join(', ')}
              {serviceProvider.coverageAreas.length > 2 && ` +${serviceProvider.coverageAreas.length - 2} more`}
            </span>
          </div>
        )}

        {/* Rating */}
        {serviceProvider.serviceRating && (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground">Rating:</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3.5 w-3.5 ${
                    star <= Math.round(serviceProvider.serviceRating!)
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="ml-1 font-medium">{serviceProvider.serviceRating.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* Contact Info */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground pt-2 border-t">
          {serviceProvider.phone && (
            <a 
              href={`tel:${serviceProvider.phone}`}
              className="flex items-center gap-1 hover:text-primary"
            >
              <Phone className="h-3.5 w-3.5" />
              {serviceProvider.phone}
            </a>
          )}
          {serviceProvider.email && (
            <a 
              href={`mailto:${serviceProvider.email}`}
              className="flex items-center gap-1 hover:text-primary"
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
