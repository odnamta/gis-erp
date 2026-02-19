import { redirect } from 'next/navigation'
import { getUserProfile } from '@/lib/permissions-server'
import { guardPage } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { DisbursementsClient } from './disbursements-client'
import { ExplorerReadOnlyBanner } from '@/components/layout/explorer-read-only-banner'

export const metadata = {
  title: 'Disbursements | Gama ERP',
  description: 'Cash disbursement management (BKK)',
}

async function fetchBKKRecords() {
  const supabase = await createClient()
  const result = await supabase
    .from('bkk_records')
    .select(`
      *,
      job_orders (jo_number),
      vendors (vendor_name, vendor_code),
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
  const { explorerReadOnly } = await guardPage(allowedRoles.includes(profile?.role || ''))

  const { data: bkks, error } = await fetchBKKRecords()

  if (error) {
    console.error('Error fetching BKKs:', error)
  }

  return (
    <>
      {explorerReadOnly && <ExplorerReadOnlyBanner />}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <DisbursementsClient initialData={(bkks as any) || []} userRole={profile?.role || 'viewer'} />
    </>
  )
}
