import { notFound } from 'next/navigation'
import { getInvoice, getRevenueReconciliation } from '../actions'
import { InvoiceDetailView } from '@/components/invoices/invoice-detail-view'
import { createClient } from '@/lib/supabase/server'

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params
  const invoice = await getInvoice(id)

  if (!invoice) {
    notFound()
  }

  // Get current user's role
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let userRole = 'viewer'

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      userRole = profile.role
    }
  }

  // Fetch revenue reconciliation data if linked to a JO
  const reconciliation = invoice.jo_id
    ? await getRevenueReconciliation(invoice.jo_id)
    : null

  return (
    <InvoiceDetailView
      invoice={invoice}
      userRole={userRole}
      reconciliation={reconciliation}
    />
  )
}
