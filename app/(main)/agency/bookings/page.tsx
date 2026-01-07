import { Suspense } from 'react';
import { BookingsClient } from './bookings-client';
import { getBookings, getBookingStats } from '@/app/actions/booking-actions';
import { getShippingLines } from '@/app/actions/agency-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BookingsPage() {
  const [bookings, stats, shippingLinesResult] = await Promise.all([
    getBookings({}),
    getBookingStats(),
    getShippingLines(),
  ]);

  // Extract data from ActionResult
  const shippingLines = shippingLinesResult.success ? shippingLinesResult.data || [] : [];

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <BookingsClient
        initialBookings={bookings}
        initialStats={stats}
        shippingLines={shippingLines}
      />
    </Suspense>
  );
}
