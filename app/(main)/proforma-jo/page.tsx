import { createClient } from '@/lib/supabase/server'
import { PJOListClient } from './pjo-list-client'
import { getUserProfile } from '@/lib/permissions-server'
import { guardPage } from '@/lib/auth-utils'
import { ExplorerReadOnlyBanner } from '@/components/layout/explorer-read-only-banner'
import { PJOWithRelations } from '@/types'

export default async function ProformaJOPage() {
  const supabase = await createClient()
  const profile = await getUserProfile()
  const { explorerReadOnly } = await guardPage(!!profile)

  // company_name exists in DB but not in generated Supabase types
  const { data: pjos } = await supabase
    .from('proforma_job_orders')
    .select(`
      *,
      projects (
        id,
        name,
        customers (
          id,
          name,
          company_name
        )
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <>
      {explorerReadOnly && <ExplorerReadOnlyBanner />}
      <PJOListClient
        pjos={(pjos || []) as unknown as PJOWithRelations[]}
        canSeeRevenue={explorerReadOnly ? false : (profile?.can_see_revenue ?? false)}
        canCreatePJO={explorerReadOnly ? false : (profile?.can_create_pjo ?? false)}
      />
    </>
  )
}
