import { createClient } from '@/lib/supabase/server'
import { PJOListClient } from './pjo-list-client'
import { getUserProfile } from '@/lib/permissions-server'
import { PJOWithRelations } from '@/types'

export default async function ProformaJOPage() {
  const supabase = await createClient()
  const profile = await getUserProfile()

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
    <PJOListClient
      pjos={(pjos || []) as unknown as PJOWithRelations[]}
      canSeeRevenue={profile?.can_see_revenue ?? false}
      canCreatePJO={profile?.can_create_pjo ?? false}
    />
  )
}
