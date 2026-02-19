import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { guardPage } from '@/lib/auth-utils'
import { QuotationList } from '@/components/quotations/quotation-list'
import { ExplorerReadOnlyBanner } from '@/components/layout/explorer-read-only-banner'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { QuotationWithRelations } from '@/types/quotation'

export const metadata = {
  title: 'Quotations | Gama ERP',
  description: 'Manage quotations and RFQ responses',
}

async function QuotationsContent() {
  const supabase = await createClient()
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }
  
  // Check user role - ops cannot access quotations (revenue hiding)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const { explorerReadOnly } = await guardPage(profile?.role !== 'ops')
  
  // Fetch quotations with relations
  const { data: quotations, error } = await supabase
    .from('quotations')
    .select(`
      *,
      customer:customers(id, name, email),
      project:projects(id, name)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching quotations:', error)
    return <div className="text-red-500">Error loading quotations</div>
  }
  
  // Fetch customers for filter
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  
  return (
    <>
      {explorerReadOnly && <ExplorerReadOnlyBanner />}
      <QuotationList
        quotations={(quotations || []) as unknown as QuotationWithRelations[]}
        customers={customers || []}
        userRole={profile?.role}
      />
    </>
  )
}

export default function QuotationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quotations</h1>
          <p className="text-muted-foreground">
            Manage RFQ responses and quotations
          </p>
        </div>
        <Button asChild>
          <Link href="/quotations/new">
            <Plus className="mr-2 h-4 w-4" />
            New Quotation
          </Link>
        </Button>
      </div>
      
      <Suspense fallback={<div className="text-muted-foreground">Loading quotations...</div>}>
        <QuotationsContent />
      </Suspense>
    </div>
  )
}
