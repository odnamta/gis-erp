'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookingStatusBadge } from './booking-status-badge';
import { FreightBooking } from '@/types/agency';
import { formatBookingDate, formatRoute, getCutoffWarningLevel, getCutoffWarningMessage } from '@/lib/booking-utils';
import { Ship, MapPin, Calendar, Package, AlertTriangle, AlertCircle, Eye, Edit } from 'lucide-react';
import Link from 'next/link';

interface BookingCardProps {
  booking: FreightBooking;
}

export function BookingCard({ booking }: BookingCardProps) {
  const cutoffWarning = booking.cutoffDate ? getCutoffWarningLevel(booking.cutoffDate) : 'none';
  const cutoffMessage = booking.cutoffDate ? getCutoffWarningMessage(booking.cutoffDate) : null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{booking.bookingNumber}</h3>
              <BookingStatusBadge status={booking.status} />
            </div>
            {booking.customer?.name && (
              <p className="text-sm text-muted-foreground mt-1">{booking.customer.name}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/agency/bookings/${booking.id}`}>
              <Button variant="ghost" size="icon">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            {booking.status === 'draft' && (
              <Link href={`/agency/bookings/${booking.id}/edit`}>
                <Button variant="ghost" size="icon">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Route */}
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>
            {booking.originPort?.portCode || 'N/A'} → {booking.destinationPort?.portCode || 'N/A'}
          </span>
        </div>

        {/* Shipping Line */}
        <div className="flex items-center gap-2 text-sm">
          <Ship className="h-4 w-4 text-muted-foreground" />
          <span>{booking.shippingLine?.lineName || 'N/A'}</span>
        </div>

        {/* ETD */}
        {booking.etd && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>ETD: {formatBookingDate(booking.etd)}</span>
          </div>
        )}

        {/* Cargo */}
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{booking.cargoDescription}</span>
        </div>

        {/* Cutoff Warning */}
        {cutoffWarning !== 'none' && cutoffMessage && (
          <div className={`flex items-center gap-2 text-sm ${
            cutoffWarning === 'alert' ? 'text-red-600' : 'text-yellow-600'
          }`}>
            {cutoffWarning === 'alert' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <span>{cutoffMessage}</span>
          </div>
        )}

        {/* Freight */}
        {booking.totalFreight && (
          <div className="pt-2 border-t">
            <span className="text-sm font-medium">
              {booking.freightCurrency} {booking.totalFreight.toLocaleString()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
