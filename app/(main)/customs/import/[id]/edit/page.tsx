import { notFound, redirect } from 'next/navigation'
import { PIBForm } from '@/components/pib'
import { getPIBDocument, getCustomsOffices, getImportTypes } from '@/lib/pib-actions'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/auth-utils'
import { canEditPIB } from '@/lib/permissions'
import { FileText } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getFormData(id: string) {
  const supabase = await createClient()

  const [pibResult, officesResult, typesResult, jobOrdersResult, customersResult] =
    await Promise.all([
      getPIBDocument(id),
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
    pib: pibResult.data,
    error: pibResult.error,
    customsOffices: officesResult.data || [],
    importTypes: typesResult.data || [],
    jobOrders: jobOrdersResult.data || [],
    customers: customersResult.data || [],
  }
}

export default async function EditPIBPage({ params }: PageProps) {
  // Permission check
  const profile = await getCurrentUserProfile()
  if (!canEditPIB(profile)) {
    redirect('/customs/import')
  }

  const { id } = await params
  const { pib, error, customsOffices, importTypes, jobOrders, customers } =
    await getFormData(id)

  if (error || !pib) {
    notFound()
  }

  // Only draft PIBs can be edited
  if (pib.status !== 'draft') {
    redirect(`/customs/import/${id}`)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Edit Import Document</h1>
          <p className="text-muted-foreground">{pib.internal_ref}</p>
        </div>
      </div>

      {/* Form */}
      <PIBForm
        pib={pib}
        customsOffices={customsOffices}
        importTypes={importTypes}
        jobOrders={jobOrders}
        customers={customers}
        mode="edit"
      />
    </div>
  )
}
