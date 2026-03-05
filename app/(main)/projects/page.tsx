import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils'
import { ExplorerReadOnlyBanner } from '@/components/layout/explorer-read-only-banner'
import { ProjectsClient } from './projects-client'

interface ProjectsPageProps {
  searchParams: Promise<{ add?: string; customer_id?: string }>
}

export interface ProjectStats {
  total: number
  active: number
  completed: number
  onHold: number
  customerCount: number
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

  // Compute stats from projects
  const allProjects = projects || []
  const stats: ProjectStats = {
    total: allProjects.length,
    active: allProjects.filter(p => p.status === 'active').length,
    completed: allProjects.filter(p => p.status === 'completed').length,
    onHold: allProjects.filter(p => p.status === 'on_hold').length,
    customerCount: new Set(allProjects.map(p => p.customer_id).filter(Boolean)).size,
  }

  return (
    <>
      {explorerReadOnly && <ExplorerReadOnlyBanner />}
      <ProjectsClient
        projects={allProjects}
        customers={customers || []}
        stats={stats}
        openAddDialog={params.add === 'true'}
        preselectedCustomerId={params.customer_id}
      />
    </>
  )
}
