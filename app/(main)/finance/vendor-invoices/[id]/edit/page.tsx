import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { VendorInvoiceForm } from '@/components/vendor-invoices'
import { getVendorInvoiceById } from '@/app/(main)/finance/vendor-invoices/actions'
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';

export const metadata: Metadata = {
  title: 'Edit Vendor Invoice | Gama ERP',
  description: 'Edit vendor invoice details',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditVendorInvoicePage({ params }: PageProps) {

  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(!!profile);
  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation');
    redirect('/finance/vendor-invoices');
  }
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const invoice = await getVendorInvoiceById(id)
  if (!invoice) {
    notFound()
  }

  // Can only edit invoices in certain statuses
  if (!['received', 'disputed'].includes(invoice.status)) {
    redirect(`/finance/vendor-invoices/${id}`)
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Vendor Invoice</h1>
        <p className="text-muted-foreground">
          {invoice.internal_ref} - {invoice.invoice_number}
        </p>
      </div>

      <VendorInvoiceForm invoice={invoice} />
    </div>
  )
}
