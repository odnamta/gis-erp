import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils'
import { ExplorerReadOnlyBanner } from '@/components/layout/explorer-read-only-banner'
import { ProjectsClient } from './projects-client'

interface ProjectsPageProps {
  searchParams: Promise<{ add?: string; customer_id?: string }>
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const profile = await getCurrentUserProfile()
  const { explorerReadOnly } = await guardPage(!!profile)
  const params = await searchParams
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('*, customers(name)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return (
    <>
      {explorerReadOnly && <ExplorerReadOnlyBanner />}
      <ProjectsClient
        projects={projects || []}
        customers={customers || []}
        openAddDialog={params.add === 'true'}
        preselectedCustomerId={params.customer_id}
      />
    </>
  )
}
