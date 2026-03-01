import { redirect, notFound } from 'next/navigation'
import { getUserProfile } from '@/lib/permissions-server'
import { createClient } from '@/lib/supabase/server'
import { DisbursementDetail, BKKRecord } from './disbursement-detail'

export const metadata = {
  title: 'Disbursement Details | Gama ERP',
  description: 'View disbursement details',
}

interface PageProps {
  params: Promise<{ id: string }>
}

async function fetchBKKRecord(id: string): Promise<{ data: BKKRecord | null; error: unknown }> {
  const supabase = await createClient()
  const result = await (supabase
    .from('bukti_kas_keluar' as any)
    .select(`
      *,
      job_orders:jo_id (id, jo_number, customer_name, status),
      vendors:vendor_id (id, vendor_name, vendor_code, bank_name, bank_account, bank_account_name),
      requested_by_profile:user_profiles!bukti_kas_keluar_requested_by_fkey (id, full_name, email),
      approved_by_profile:user_profiles!bukti_kas_keluar_approved_by_fkey (id, full_name, email),
      released_by_profile:user_profiles!bukti_kas_keluar_released_by_fkey (id, full_name, email),
      settled_by_profile:user_profiles!bukti_kas_keluar_settled_by_fkey (id, full_name, email)
    `)
    .eq('id', id)
    .single() as any)

  return result as { data: BKKRecord | null; error: unknown }
}

export default async function DisbursementDetailPage({ params }: PageProps) {
  const { id } = await params
  const profile = await getUserProfile()

  // Check permissions
  const allowedRoles = ['owner', 'director', 'finance_manager', 'operations_manager', 'finance', 'administration']
  if (!allowedRoles.includes(profile?.role || '')) {
    redirect('/dashboard')
  }

  const { data: bkk, error } = await fetchBKKRecord(id)

  if (error || !bkk) {
    notFound()
  }

  return (
    <DisbursementDetail
      bkk={bkk}
      userRole={profile?.role || 'viewer'}
      userId={profile?.id || ''}
    />
  )
}
