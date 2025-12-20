import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QuotationForm } from '@/components/quotations/quotation-form'

export const metadata = {
  title: 'New Quotation | Gama ERP',
}

async function NewQuotationContent() {
  const supabase = await createClient()
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }
  
  // Check user role - ops cannot access quotations
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  
  if (profile?.role === 'ops') {
    redirect('/dashboard')
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
    />
  )
}

export default function NewQuotationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Quotation</h1>
        <p className="text-muted-foreground">Create a new quotation for an RFQ</p>
      </div>
      
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <NewQuotationContent />
      </Suspense>
    </div>
  )
}
