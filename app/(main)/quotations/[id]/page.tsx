import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { QuotationDetailView } from '@/components/quotations/quotation-detail-view'
import { QuotationWithRelations } from '@/types/quotation'

export const metadata = {
  title: 'Quotation Details | Gama ERP',
}

interface PageProps {
  params: Promise<{ id: string }>
}

async function QuotationContent({ id }: { id: string }) {
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
  
  // Fetch quotation with relations
  const { data: quotation, error } = await supabase
    .from('quotations')
    .select(`
      *,
      customer:customers(id, name, email, phone, address),
      project:projects(id, name),
      revenue_items:quotation_revenue_items(*),
      cost_items:quotation_cost_items(*),
      pursuit_costs:pursuit_costs(*),
      created_by_user:user_profiles!quotations_created_by_fkey(id, full_name, email)
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single()
  
  if (error || !quotation) {
    notFound()
  }
  
  return (
    <QuotationDetailView 
      quotation={quotation as unknown as QuotationWithRelations} 
      userRole={profile?.role}
      userId={user.id}
    />
  )
}

export default async function QuotationDetailPage({ params }: PageProps) {
  const { id } = await params
  
  return (
    <Suspense fallback={<div className="text-muted-foreground">Loading quotation...</div>}>
      <QuotationContent id={id} />
    </Suspense>
  )
}
