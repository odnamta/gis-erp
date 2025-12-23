import { Suspense } from 'react';
import { NewBookingClient } from './new-booking-client';
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

export default async function NewBookingPage() {
  const [shippingLines, ports, customers, jobOrders] = await Promise.all([
    getShippingLines(),
    getPorts(),
    getCustomers(),
    getJobOrders(),
  ]);

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
