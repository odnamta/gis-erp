import { redirect } from 'next/navigation'
import { PIBForm } from '@/components/pib'
import { getCustomsOffices, getImportTypes } from '@/lib/pib-actions'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/auth-utils'
import { canCreatePIB } from '@/lib/permissions'
import { FileText } from 'lucide-react'

async function getFormData() {
  const supabase = await createClient()

  const [officesResult, typesResult, jobOrdersResult, customersResult] = await Promise.all([
    getCustomsOffices(),
    getImportTypes(),
    supabase
      .from('job_orders')
      .select('id, jo_number')
      .eq('status', 'active')
      .order('jo_number', { ascending: false }),
    supabase
      .from('customers')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
  ])

  return {
    customsOffices: officesResult.data,
    importTypes: typesResult.data,
    jobOrders: jobOrdersResult.data || [],
    customers: customersResult.data || [],
  }
}

export default async function NewPIBPage() {
  // Permission check
  const profile = await getCurrentUserProfile()
  if (!canCreatePIB(profile)) {
    redirect('/customs/import')
  }

  const { customsOffices, importTypes, jobOrders, customers } = await getFormData()

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">New Import Document</h1>
          <p className="text-muted-foreground">
            Create a new PIB (Pemberitahuan Impor Barang)
          </p>
        </div>
      </div>

      {/* Form */}
      <PIBForm
        customsOffices={customsOffices}
        importTypes={importTypes}
        jobOrders={jobOrders}
        customers={customers}
        mode="create"
      />
    </div>
  )
}
