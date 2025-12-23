import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { EditSIClient } from './edit-si-client';
import { getShippingInstruction } from '@/app/actions/bl-documentation-actions';
import { getBookings } from '@/app/actions/booking-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface EditSIPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSIPage({ params }: EditSIPageProps) {
  const { id } = await params;
  
  const si = await getShippingInstruction(id);

  if (!si) {
    notFound();
  }

  // Only allow editing draft SIs
  if (si.status !== 'draft') {
    redirect(`/agency/si/${id}`);
  }

  // Get bookings for the form
  const [confirmedBookings, shippedBookings, completedBookings] = await Promise.all([
    getBookings({ status: 'confirmed' }),
    getBookings({ status: 'shipped' }),
    getBookings({ status: 'completed' }),
  ]);

  const allBookings = [
    ...confirmedBookings,
    ...shippedBookings,
    ...completedBookings,
  ];

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <EditSIClient si={si} bookings={allBookings} />
    </Suspense>
  );
}
