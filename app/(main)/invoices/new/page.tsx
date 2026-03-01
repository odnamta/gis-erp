import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getInvoiceDataFromJO } from '../actions'
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { getCompanySetting } from '@/app/(main)/settings/company/actions'
import { DEFAULT_SETTINGS } from '@/types/company-settings'

interface NewInvoicePageProps {
  searchParams: Promise<{ joId?: string }>
}

export default async function NewInvoicePage({ searchParams }: NewInvoicePageProps) {
  const { joId } = await searchParams

  if (!joId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create Invoice</h2>
          <p className="text-muted-foreground">Select a Job Order to create an invoice</p>
        </div>
        <div className="rounded-lg border p-6 text-center space-y-3">
          <p className="text-muted-foreground">
            Untuk membuat invoice, pilih Job Order yang sudah selesai dari halaman Job Orders,
            atau gunakan tombol &quot;Create Invoice&quot; di halaman Berita Acara / Surat Jalan.
          </p>
          <Link href="/job-orders" className="inline-flex items-center text-primary hover:underline font-medium">
            Lihat daftar Job Orders &rarr;
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
