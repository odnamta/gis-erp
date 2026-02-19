import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PEBForm } from '@/components/peb'
import { getPEBDocument, getExportTypes, getCustomsOffices } from '@/lib/peb-actions'
import { ArrowLeft, FileText } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/auth-utils'
import { canEditPEB } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getJobOrders() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('job_orders')
    .select('id, jo_number')
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

export default async function EditPEBPage({ params }: PageProps) {
  const profile = await getCurrentUserProfile()
  if (!canEditPEB(profile)) {
    redirect('/customs/export')
  }

  const { id } = await params
  const result = await getPEBDocument(id)

  if (result.error || !result.data) {
    notFound()
  }

  const peb = result.data

  // Only draft PEBs can be edited
  if (peb.status !== 'draft') {
    redirect(`/customs/export/${id}`)
  }

  const [exportTypesResult, customsOfficesResult, jobOrders, customers] = await Promise.all([
    getExportTypes(),
    getCustomsOffices(),
    getJobOrders(),
    getCustomers(),
  ])

  const initialData = {
    id: peb.id,
    exporter_name: peb.exporter_name,
    exporter_npwp: peb.exporter_npwp || '',
    exporter_address: peb.exporter_address || '',
    consignee_name: peb.consignee_name || '',
    consignee_country: peb.consignee_country || '',
    consignee_address: peb.consignee_address || '',
    export_type_id: peb.export_type_id || '',
    customs_office_id: peb.customs_office_id || '',
    transport_mode: peb.transport_mode || 'sea',
    vessel_name: peb.vessel_name || '',
    voyage_number: peb.voyage_number || '',
    bill_of_lading: peb.bill_of_lading || '',
    awb_number: peb.awb_number || '',
    port_of_loading: peb.port_of_loading || '',
    port_of_discharge: peb.port_of_discharge || '',
    final_destination: peb.final_destination || '',
    etd_date: peb.etd_date || '',
    total_packages: peb.total_packages || undefined,
    package_type: peb.package_type || '',
    gross_weight_kg: peb.gross_weight_kg || undefined,
    currency: peb.currency || 'USD',
    fob_value: peb.fob_value || 0,
    job_order_id: peb.job_order_id || '',
    customer_id: peb.customer_id || '',
    notes: peb.notes || '',
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/customs/export/${id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Edit {peb.internal_ref}</h1>
            <p className="text-muted-foreground">Update export document details</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <PEBForm
        initialData={initialData}
        exportTypes={exportTypesResult.data || []}
        customsOffices={customsOfficesResult.data || []}
        jobOrders={jobOrders}
        customers={customers}
      />
    </div>
  )
}
