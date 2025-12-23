import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ResourceForm } from '@/components/resource-scheduling/resource-form'
import { createClient } from '@/lib/supabase/server'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function NewResourcePage() {
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
          <Link href="/engineering/resources">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Resource</h1>
          <p className="text-muted-foreground">
            Add a new engineering resource
          </p>
        </div>
      </div>

      <ResourceForm 
        employees={employees || []} 
        assets={assets || []} 
      />
    </div>
  )
}
