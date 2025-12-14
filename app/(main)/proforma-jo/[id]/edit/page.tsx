import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PJOForm } from '@/components/pjo/pjo-form'
import { ArrowLeft } from 'lucide-react'

interface EditPJOPageProps {
  params: Promise<{ id: string }>
}

export default async function EditPJOPage({ params }: EditPJOPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: pjo, error } = await supabase
    .from('proforma_job_orders')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error || !pjo) {
    notFound()
  }

  // Only draft PJOs can be edited
  if (pjo.status !== 'draft') {
    redirect(`/proforma-jo/${id}`)
  }

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
          <Link href={`/proforma-jo/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit PJO: {pjo.pjo_number}</h1>
      </div>

      <PJOForm projects={projects || []} pjo={pjo} mode="edit" />
    </div>
  )
}
