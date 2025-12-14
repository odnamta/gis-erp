import { redirect, notFound } from 'next/navigation'
import { getInvoiceDataFromJO } from '../actions'
import { InvoiceForm } from '@/components/invoices/invoice-form'

interface NewInvoicePageProps {
  searchParams: Promise<{ joId?: string }>
}

export default async function NewInvoicePage({ searchParams }: NewInvoicePageProps) {
  const { joId } = await searchParams

  if (!joId) {
    redirect('/job-orders')
  }

  const result = await getInvoiceDataFromJO(joId)

  if (result.error) {
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

  if (!result.data) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Create Invoice</h2>
        <p className="text-muted-foreground">
          Generate invoice from Job Order {result.data.joNumber}
        </p>
      </div>

      <InvoiceForm initialData={result.data} />
    </div>
  )
}
