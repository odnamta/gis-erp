import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ResourceForm } from '@/components/resource-scheduling/resource-form'
import { getResourceById } from '@/lib/resource-scheduling-actions'
import { createClient } from '@/lib/supabase/server'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface EditResourcePageProps {
  params: Promise<{ id: string }>
}

export default async function EditResourcePage({ params }: EditResourcePageProps) {
  const { id } = await params
  const resource = await getResourceById(id)

  if (!resource) {
    notFound()
  }

  const supabase = await createClient()

  // Fetch employees for linking
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name')
    .eq('is_active', true)
    .order('full_name')

  // Fetch assets for linking
  const { data: assets } = await supabase
    .from('assets')
    .select('id, asset_code, asset_name')
    .eq('is_active', true)
    .order('asset_code')

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/engineering/resources/${id}`}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Resource</h1>
          <p className="text-muted-foreground">
            {resource.resource_code} - {resource.resource_name}
          </p>
        </div>
      </div>

      <ResourceForm 
        resource={resource} 
        employees={employees || []} 
        assets={assets || []} 
      />
    </div>
  )
}
