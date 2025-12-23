import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { EditBookingClient } from './edit-booking-client';
import { getBooking, getBookingContainers } from '@/app/actions/booking-actions';
import { getShippingLines, getPorts } from '@/app/actions/agency-actions';
import { createClient } from '@/lib/supabase/server';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getCustomers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('customers')
    .select('id, name')
    .order('name');
  return data || [];
}

async function getJobOrders() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('job_orders')
    .select('id, jo_number')
    .in('status', ['active', 'in_progress'])
    .order('created_at', { ascending: false });
  return (data || []).map(jo => ({ id: jo.id, joNumber: jo.jo_number }));
}

interface EditBookingPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBookingPage({ params }: EditBookingPageProps) {
  const { id } = await params;
  
  const [booking, containers, shippingLines, ports, customers, jobOrders] = await Promise.all([
    getBooking(id),
    getBookingContainers(id),
    getShippingLines(),
    getPorts(),
    getCustomers(),
    getJobOrders(),
  ]);

  if (!booking) {
    notFound();
  }

  // Only allow editing draft bookings
  if (booking.status !== 'draft') {
    redirect(`/agency/bookings/${id}`);
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <EditBookingClient
        booking={booking}
        containers={containers}
        shippingLines={shippingLines}
        ports={ports}
        customers={customers}
        jobOrders={jobOrders}
      />
    </Suspense>
  );
}
