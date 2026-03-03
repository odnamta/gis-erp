import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils'
import { ExplorerReadOnlyBanner } from '@/components/layout/explorer-read-only-banner'
import { CustomersClient } from './customers-client'

export default async function CustomersPage() {
  const profile = await getCurrentUserProfile()
  const { explorerReadOnly } = await guardPage(!!profile)
  const supabase = await createClient()

  const [customersResult, projectCountResult, invoiceCountResult] = await Promise.all([
    supabase
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('projects')
      .select('customer_id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true }),
  ])

  if (customersResult.error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground">Manage customer accounts and contacts</p>
        </div>
        <div className="rounded-md border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">Failed to load customers: {customersResult.error.message}</p>
        </div>
      </div>
    )
  }

  const stats = {
    totalCustomers: customersResult.data?.length || 0,
    totalProjects: projectCountResult.count || 0,
    totalInvoices: invoiceCountResult.count || 0,
  }

  return (
    <>
      {explorerReadOnly && <ExplorerReadOnlyBanner />}
      <CustomersClient customers={customersResult.data || []} stats={stats} />
    </>
  )
}
