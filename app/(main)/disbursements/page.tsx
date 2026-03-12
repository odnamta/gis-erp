import type { ComponentProps } from 'react'
import { getUserProfile } from '@/lib/permissions-server'
import { guardPage, profileHasRole } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { DisbursementsClient } from './disbursements-client'
import { ExplorerReadOnlyBanner } from '@/components/layout/explorer-read-only-banner'
import { getBKKDashboardStats } from './actions'

export const metadata = {
  title: 'Disbursements | Gama ERP',
  description: 'Cash disbursement management (BKK)',
}

async function fetchBKKRecords() {
  const supabase = await createClient()
  const result = await (supabase
    .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select(`
      *,
      job_orders:jo_id (jo_number, customer_name),
      vendors:vendor_id (vendor_name, vendor_code),
      requested_by_profile:user_profiles!bukti_kas_keluar_requested_by_fkey (full_name),
      approved_by_profile:user_profiles!bukti_kas_keluar_approved_by_fkey (full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(200) as any) // eslint-disable-line @typescript-eslint/no-explicit-any

  return result
}

export default async function DisbursementsPage() {
  const profile = await getUserProfile()

  // Check permissions
  const allowedRoles = ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'finance', 'administration']
  const { explorerReadOnly } = await guardPage(profileHasRole(profile, allowedRoles))

  const [{ data: bkks, error }, serverStats] = await Promise.all([
    fetchBKKRecords(),
    getBKKDashboardStats(),
  ])

  if (error) {
  }

  return (
    <>
      {explorerReadOnly && <ExplorerReadOnlyBanner />}
      <DisbursementsClient initialData={(bkks ?? []) as unknown as ComponentProps<typeof DisbursementsClient>['initialData']} userRole={profile?.role || 'viewer'} serverStats={serverStats} />
    </>
  )
}
