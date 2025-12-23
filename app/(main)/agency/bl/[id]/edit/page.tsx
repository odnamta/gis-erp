import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { EditBLClient } from './edit-bl-client';
import { getBillOfLading } from '@/app/actions/bl-documentation-actions';
import { getShippingLines } from '@/app/actions/agency-actions';
import { getBookings } from '@/app/actions/booking-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface EditBLPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBLPage({ params }: EditBLPageProps) {
  const { id } = await params;
  
  const [bl, shippingLinesResult, confirmedBookings, shippedBookings, completedBookings] = await Promise.all([
    getBillOfLading(id),
    getShippingLines(),
    getBookings({ status: 'confirmed' }),
    getBookings({ status: 'shipped' }),
    getBookings({ status: 'completed' }),
  ]);

  if (!bl) {
    notFound();
  }

  // Only allow editing draft or submitted B/Ls per Requirement 6.6
  const editableStatuses = ['draft', 'submitted'];
  if (!editableStatuses.includes(bl.status)) {
    redirect(`/agency/bl/${id}`);
  }

  // Combine all bookings
  const allBookings = [
    ...confirmedBookings,
    ...shippedBookings,
    ...completedBookings,
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
      <EditBLClient
        bl={bl}
        shippingLines={shippingLines}
        bookings={allBookings}
      />
    </Suspense>
  );
}
