import { redirect } from 'next/navigation'
import { getUserProfile } from '@/lib/permissions-server'
import { guardPage } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { CostEntryClient } from './cost-entry-client'
import { ExplorerReadOnlyBanner } from '@/components/layout/explorer-read-only-banner'

export const metadata = {
  title: 'Cost Entry | Gama ERP',
  description: 'Confirm actual costs for approved PJOs',
}

async function fetchPJOsForCostEntry() {
  const supabase = await createClient()

  // Fetch approved PJOs that need cost confirmation (not yet converted to JO, or still pending confirmation)
  const { data, error } = await supabase
    .from('proforma_job_orders')
    .select(`
      id,
      pjo_number,
      status,
      commodity,
      total_expenses,
      jo_date,
      pol,
      pod,
      created_at,
      updated_at,
      converted_to_jo,
      projects:project_id (
        id,
        name,
        customers:customer_id (
          id,
          name
        )
      ),
      pjo_cost_items (
        id,
        category,
        description,
        estimated_amount,
        actual_amount,
        status
      )
    `)
    .eq('is_active', true)
    .in('status', ['approved', 'checked'])
    .order('updated_at', { ascending: false })
    .limit(100)

  return { data, error }
}

export default async function CostEntryPage() {
  const profile = await getUserProfile()

  const allowedRoles = ['owner', 'director', 'operations_manager', 'ops']
  const { explorerReadOnly } = await guardPage(allowedRoles.includes(profile?.role || ''))

  const { data: pjos, error } = await fetchPJOsForCostEntry()

  if (error) {
    console.error('Error fetching PJOs for cost entry:', error)
  }

  return (
    <>
      {explorerReadOnly && <ExplorerReadOnlyBanner />}
      <CostEntryClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pjos={(pjos as any) || []}
        userRole={profile?.role || 'ops'}
      />
    </>
  )
}
