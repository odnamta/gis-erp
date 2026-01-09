import { redirect, notFound } from 'next/navigation'
import { getUserProfile } from '@/lib/permissions-server'
import { createClient } from '@/lib/supabase/server'
import { DisbursementDetail } from './disbursement-detail'

export const metadata = {
  title: 'Disbursement Details | Gama ERP',
  description: 'View disbursement details',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DisbursementDetailPage({ params }: PageProps) {
  const { id } = await params
  const profile = await getUserProfile()

  // Check permissions
  const allowedRoles = ['owner', 'director', 'finance_manager', 'operations_manager', 'finance', 'administration']
  if (!allowedRoles.includes(profile?.role || '')) {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const { data: bkk, error } = await supabase
    .from('bkk_records')
    .select(`
      *,
      job_orders (id, jo_number, customer_name, status),
      vendors (id, name, vendor_code, bank_name, bank_account, bank_account_name),
      created_by_profile:user_profiles!bkk_records_created_by_fkey (id, full_name, email),
      approved_by_profile:user_profiles!bkk_records_approved_by_fkey (id, full_name, email),
      released_by_profile:user_profiles!bkk_records_released_by_fkey (id, full_name, email),
      settled_by_profile:user_profiles!bkk_records_settled_by_fkey (id, full_name, email)
    ` as '*')
    .eq('id', id)
    .single()

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
