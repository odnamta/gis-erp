import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { AssignClient } from './assign-client';
import { deriveAvailabilityStatus } from '@/lib/utilization-utils';
import { Asset } from '@/types/assets';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssignAssetPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch asset
  const { data: assetData, error: assetError } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .single();

  if (assetError || !assetData) {
    notFound();
  }

  const asset = assetData as unknown as Asset;

  // Check for open assignments
  const { data: openAssignments } = await supabase
    .from('asset_assignments')
    .select('id')
    .eq('asset_id', id)
    .is('assigned_to', null);

  const hasOpenAssignment = (openAssignments?.length ?? 0) > 0;
  const availabilityStatus = deriveAvailabilityStatus(asset.status || 'available', hasOpenAssignment);

  // Fetch active job orders for assignment
  const { data: jobOrders } = await supabase
    .from('job_orders')
    .select('id, jo_number, customers(name)')
    .eq('status', 'active')
    .order('jo_number', { ascending: false })
    .limit(50);

  const formattedJobOrders = (jobOrders || []).map((jo: { id: string; jo_number: string; customers: { name: string } | null }) => ({
    id: jo.id,
    jo_number: jo.jo_number,
    customer_name: jo.customers?.name,
  }));

  return (
    <AssignClient
      asset={asset}
      availabilityStatus={availabilityStatus}
      jobOrders={formattedJobOrders}
    />
  );
}
