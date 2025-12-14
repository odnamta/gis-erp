import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PJODetailView } from '@/components/pjo/pjo-detail-view'
import { ArrowLeft } from 'lucide-react'

interface PJODetailPageProps {
  params: Promise<{ id: string }>
}

export default async function PJODetailPage({ params }: PJODetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: pjo, error } = await supabase
    .from('proforma_job_orders')
    .select(`
      *,
      projects (
        id,
        name,
        customers (
          id,
          name
        )
      )
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error || !pjo) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/proforma-jo">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <span className="text-muted-foreground">Back to PJO List</span>
      </div>

      <PJODetailView pjo={pjo} />
    </div>
  )
}
