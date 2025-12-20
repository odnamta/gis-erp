import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { QuotationForm } from '@/components/quotations/quotation-form'

export const metadata = {
  title: 'Edit Quotation | Gama ERP',
}

interface PageProps {
  params: Promise<{ id: string }>
}

async function EditQuotationContent({ id }: { id: string }) {
  const supabase = await createClient()
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }
  
  // Check user role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  
  if (profile?.role === 'ops') {
    redirect('/dashboard')
  }
  
  // Fetch quotation
  const { data: quotation, error } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()
  
  if (error || !quotation) {
    notFound()
  }
  
  // Check if editable
  if (quotation.status !== 'draft' && quotation.status !== 'engineering_review') {
    redirect(`/quotations/${id}`)
  }
  
  // Fetch customers
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  
  // Fetch projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, customer_id')
    .eq('status', 'active')
    .order('name')
  
  return (
    <QuotationForm 
      customers={customers || []} 
      projects={projects || []}
      quotation={quotation}
    />
  )
}

export default async function EditQuotationPage({ params }: PageProps) {
  const { id } = await params
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Quotation</h1>
        <p className="text-muted-foreground">Update quotation details</p>
      </div>
      
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <EditQuotationContent id={id} />
      </Suspense>
    </div>
  )
}
