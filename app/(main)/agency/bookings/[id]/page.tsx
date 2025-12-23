import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { BookingDetail } from './booking-detail';
import {
  getBooking,
  getBookingContainers,
  getBookingAmendments,
  getStatusHistory,
} from '@/app/actions/booking-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface BookingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { id } = await params;
  
  const [booking, containers, amendments, statusHistory] = await Promise.all([
    getBooking(id),
    getBookingContainers(id),
    getBookingAmendments(id),
    getStatusHistory(id),
  ]);

  if (!booking) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <BookingDetail
        booking={booking}
        containers={containers}
        amendments={amendments}
        statusHistory={statusHistory}
      />
    </Suspense>
  );
}
