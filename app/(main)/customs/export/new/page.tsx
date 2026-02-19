import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PEBForm } from '@/components/peb'
import { getExportTypes, getCustomsOffices } from '@/lib/peb-actions'
import { ArrowLeft, FileText } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/auth-utils'
import { canCreatePEB } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

async function getJobOrders() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('job_orders')
    .select('id, jo_number')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  return data || []
}

async function getCustomers() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('customers')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  return data || []
}

export default async function NewPEBPage() {
  const profile = await getCurrentUserProfile()
  if (!canCreatePEB(profile)) {
    redirect('/customs/export')
  }

  const [exportTypesResult, customsOfficesResult, jobOrders, customers] = await Promise.all([
    getExportTypes(),
    getCustomsOffices(),
    getJobOrders(),
    getCustomers(),
  ])

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/customs/export">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">New Export Document (PEB)</h1>
            <p className="text-muted-foreground">Create a new customs export declaration</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <PEBForm
        exportTypes={exportTypesResult.data || []}
        customsOffices={customsOfficesResult.data || []}
        jobOrders={jobOrders}
        customers={customers}
      />
    </div>
  )
}
