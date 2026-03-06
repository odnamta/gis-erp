import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getInvoiceDataFromJO, getInvoiceableJobOrders } from '../actions'
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { getCompanySetting } from '@/app/(main)/settings/company/actions'
import { DEFAULT_SETTINGS } from '@/types/company-settings'
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';
import { JOSelector } from './jo-selector'

interface NewInvoicePageProps {
  searchParams: Promise<{ joId?: string }>
}

export default async function NewInvoicePage({ searchParams }: NewInvoicePageProps) {

  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(!!profile);
  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation');
    redirect('/invoices');
  }
  const { joId } = await searchParams

  if (!joId) {
    const jobOrders = await getInvoiceableJobOrders()

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create Invoice</h2>
          <p className="text-muted-foreground">Pilih Job Order untuk membuat invoice</p>
        </div>
        <div className="rounded-lg border p-6 space-y-4">
          <label className="text-sm font-medium">Job Order</label>
          <JOSelector jobOrders={jobOrders} />
          <p className="text-xs text-muted-foreground">
            Menampilkan JO dengan status: Submitted to Finance, Completed, atau Invoiced
          </p>
          <Link href="/job-orders" className="inline-flex items-center text-sm text-primary hover:underline">
            Atau lihat daftar Job Orders &rarr;
          </Link>
        </div>
      </div>
    )
  }

  const result = await getInvoiceDataFromJO(joId)

  if (!result.success) {
    // Show error page or redirect
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create Invoice</h2>
          <p className="text-muted-foreground">Generate invoice from Job Order</p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-destructive">{result.error}</p>
        </div>
      </div>
    )
  }

  // Get VAT rate from company settings
  const vatRateSetting = await getCompanySetting('vat_rate')
  const vatRate = vatRateSetting ? parseFloat(vatRateSetting) / 100 : DEFAULT_SETTINGS.vat_rate / 100

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Create Invoice</h2>
        <p className="text-muted-foreground">
          Generate invoice from Job Order {result.data.joNumber}
        </p>
      </div>

      <InvoiceForm initialData={result.data} vatRate={vatRate} />
    </div>
  )
}
