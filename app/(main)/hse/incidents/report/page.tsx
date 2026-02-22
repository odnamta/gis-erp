import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getIncidentCategories } from '@/lib/incident-actions';
import { ReportClient } from './report-client';

export const dynamic = 'force-dynamic';

export default async function ReportIncidentPage() {
  const supabase = await createClient();

  const [categoriesResult, employeesResult, jobOrdersResult, assetsResult] = await Promise.all([
    getIncidentCategories(),
    supabase.from('employees').select('id, full_name').eq('status', 'active').order('full_name'),
    supabase.from('job_orders').select('id, jo_number').in('status', ['active', 'completed']).order('created_at', { ascending: false }).limit(50),
    supabase.from('assets').select('id, asset_code, asset_name').eq('is_active', true).order('asset_code'),
  ]);

  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <ReportClient
        categories={categoriesResult.data || []}
        employees={employeesResult.data || []}
        jobOrders={jobOrdersResult.data || []}
        assets={assetsResult.data || []}
      />
    </Suspense>
  );
}
