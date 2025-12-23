import { Suspense } from 'react';
import { NewSIClient } from './new-si-client';
import { getBookings, getBooking } from '@/app/actions/booking-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface NewSIPageProps {
  searchParams: Promise<{ bookingId?: string }>;
}

export default async function NewSIPage({ searchParams }: NewSIPageProps) {
  const params = await searchParams;
  const bookingId = params.bookingId;

  // Get confirmed bookings that can have SIs created
  const [bookings, preselectedBooking] = await Promise.all([
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

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewSIClient
        bookings={allBookings}
        preselectedBooking={preselectedBooking}
      />
    </Suspense>
  );
}
