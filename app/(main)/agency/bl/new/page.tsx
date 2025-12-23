import { Suspense } from 'react';
import { NewBLClient } from './new-bl-client';
import { getShippingLines } from '@/app/actions/agency-actions';
import { getBookings, getBooking } from '@/app/actions/booking-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface NewBLPageProps {
  searchParams: Promise<{ bookingId?: string }>;
}

export default async function NewBLPage({ searchParams }: NewBLPageProps) {
  const params = await searchParams;
  const bookingId = params.bookingId;

  // Get confirmed bookings that can have B/Ls created
  const [shippingLinesResult, bookings, preselectedBooking] = await Promise.all([
    getShippingLines(),
    getBookings({ status: 'confirmed' }),
    bookingId ? getBooking(bookingId) : Promise.resolve(null),
  ]);

  // Also include shipped and completed bookings
  const additionalBookings = await Promise.all([
    getBookings({ status: 'shipped' }),
    getBookings({ status: 'completed' }),
  ]);

  const allBookings = [
    ...bookings,
    ...additionalBookings[0],
    ...additionalBookings[1],
  ];

  // Extract shipping lines from result
  const shippingLines = shippingLinesResult.success ? shippingLinesResult.data || [] : [];

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewBLClient
        shippingLines={shippingLines}
        bookings={allBookings}
        preselectedBooking={preselectedBooking}
      />
    </Suspense>
  );
}
