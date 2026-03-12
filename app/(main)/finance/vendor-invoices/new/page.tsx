import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VendorInvoiceForm } from '@/components/vendor-invoices'
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';

export const metadata: Metadata = {
  title: 'New Vendor Invoice | Gama ERP',
  description: 'Record a new vendor invoice',
}

export default async function NewVendorInvoicePage() {

  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(!!profile);
  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation');
    redirect('/finance/vendor-invoices');
  }
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Record Vendor Invoice</h1>
        <p className="text-muted-foreground">
          Enter details of a new vendor invoice
        </p>
      </div>

      <VendorInvoiceForm />
    </div>
  )
}
