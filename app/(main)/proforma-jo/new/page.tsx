import { createClient } from '@/lib/supabase/server'
import { PJOForm } from '@/components/pjo/pjo-form'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface NewPJOPageProps {
  searchParams: Promise<{ project_id?: string }>
}

export default async function NewPJOPage({ searchParams }: NewPJOPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      customers (
        id,
        name
      )
    `)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/proforma-jo">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Create New PJO</h1>
      </div>

      <PJOForm
        projects={projects || []}
        preselectedProjectId={params.project_id}
        mode="create"
      />
    </div>
  )
}
