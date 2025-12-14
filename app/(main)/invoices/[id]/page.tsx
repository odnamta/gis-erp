import { notFound } from 'next/navigation'
import { getInvoice } from '../actions'
import { InvoiceDetailView } from '@/components/invoices/invoice-detail-view'

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params
  const invoice = await getInvoice(id)

  if (!invoice) {
    notFound()
  }

  return <InvoiceDetailView invoice={invoice} />
}
