import { Suspense } from 'react';
import { NewBookingClient } from './new-booking-client';
import { getShippingLines } from '@/app/actions/shipping-line-actions';
import { getPorts } from '@/app/actions/port-actions';
import { createClient } from '@/lib/supabase/server';
import { Loader2 } from 'lucide-react';
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';

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

export default async function NewBookingPage() {

  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(!!profile);
  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation');
    redirect('/agency/bookings');
  }
  const [shippingLinesResult, portsResult, customers, jobOrders] = await Promise.all([
    getShippingLines(),
    getPorts(),
    getCustomers(),
    getJobOrders(),
  ]);

  const shippingLines = shippingLinesResult.success ? shippingLinesResult.data || [] : [];
  const ports = portsResult.success ? portsResult.data || [] : [];

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewBookingClient
        shippingLines={shippingLines}
        ports={ports}
        customers={customers}
        jobOrders={jobOrders}
      />
    </Suspense>
  );
}
