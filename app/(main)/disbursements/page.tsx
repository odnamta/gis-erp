import { redirect } from 'next/navigation'
import { getUserProfile } from '@/lib/permissions-server'
import { createClient } from '@/lib/supabase/server'
import { DisbursementsClient } from './disbursements-client'

export const metadata = {
  title: 'Disbursements | Gama ERP',
  description: 'Cash disbursement management (BKK)',
}

async function fetchBKKRecords(): Promise<{ data: unknown; error: unknown }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (supabase as any)
    .from('bkk_records')
    .select(`
      *,
      job_orders (jo_number, customer_name),
      vendors (name, vendor_code),
      created_by_profile:user_profiles!bkk_records_created_by_fkey (full_name),
      approved_by_profile:user_profiles!bkk_records_approved_by_fkey (full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(200)
  
  return result
}

export default async function DisbursementsPage() {
  const profile = await getUserProfile()

  // Check permissions
  const allowedRoles = ['owner', 'director', 'finance_manager', 'operations_manager', 'finance', 'administration']
  if (!allowedRoles.includes(profile?.role || '')) {
    redirect('/dashboard')
  }

  const { data: bkks, error } = await fetchBKKRecords()

  if (error) {
    console.error('Error fetching BKKs:', error)
  }

  return <DisbursementsClient initialData={bkks || []} userRole={profile?.role || 'viewer'} />
}
