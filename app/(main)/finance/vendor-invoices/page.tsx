import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { guardPage } from '@/lib/auth-utils'
import { VendorInvoiceList } from '@/components/vendor-invoices'
import { ExplorerReadOnlyBanner } from '@/components/layout/explorer-read-only-banner'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { canViewVendorInvoices } from '@/lib/vendor-invoice-utils'

export const metadata: Metadata = {
  title: 'Vendor Invoices | Gama ERP',
  description: 'Manage vendor invoices and accounts payable',
}

export default async function VendorInvoicesPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const { explorerReadOnly } = await guardPage(!!profile && canViewVendorInvoices(profile.role))

  return (
    <div className="container mx-auto py-6 space-y-6">
      {explorerReadOnly && <ExplorerReadOnlyBanner />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendor Invoices</h1>
          <p className="text-muted-foreground">
            Track and manage vendor invoices (accounts payable)
          </p>
        </div>
        <Link href="/finance/vendor-invoices/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Record Invoice
          </Button>
        </Link>
      </div>

      <VendorInvoiceList />
    </div>
  )
}
