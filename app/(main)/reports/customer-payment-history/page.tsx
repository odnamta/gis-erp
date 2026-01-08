import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { PaymentHistoryClient } from './payment-history-client'
import { ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { getUserProfile } from '@/lib/permissions-server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { buildCustomerPaymentReport, CustomerPaymentReport } from '@/lib/reports/payment-history-utils'
import { startOfYear, endOfYear } from 'date-fns'

export const metadata = {
  title: 'Customer Payment History | Gama ERP',
  description: 'Payment patterns and slow payer analysis',
}

async function fetchReportData(): Promise<CustomerPaymentReport | null> {
  const supabase = await createClient()
  const now = new Date()
  const startDate = startOfYear(now).toISOString().split('T')[0]
  const endDate = endOfYear(now).toISOString().split('T')[0]

  const { data: invoiceData, error } = await supabase
    .from('invoices')
    .select(`
      id,
      total_amount,
      status,
      invoice_date,
      job_orders!inner (
        proforma_job_orders!inner (
          projects!inner (
            customers!inner (id, name)
          )
        )
      )
    `)
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)

  if (error) {
    console.error('Error fetching payment history:', error)
    return null
  }

  const payments = (invoiceData || []).map(inv => {
    const isPaid = inv.status === 'paid'
    const daysToPay = isPaid ? 30 : null

    return {
      customerId: (inv as any).job_orders?.proforma_job_orders?.projects?.customers?.id || '',
      customerName: (inv as any).job_orders?.proforma_job_orders?.projects?.customers?.name || 'Unknown',
      invoiceAmount: inv.total_amount || 0,
      paidAmount: isPaid ? (inv.total_amount || 0) : 0,
      daysToPay,
    }
  })

  return buildCustomerPaymentReport(payments, { startDate: new Date(startDate), endDate: new Date(endDate) })
}

async function PaymentHistoryContent() {
  const profile = await getUserProfile()

  if (profile && !canAccessReport(profile.role, 'customer-payment-history')) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back to Reports</Link>
          </Button>
        </div>
        <ReportEmptyState title="Access Denied" message="You don't have permission to view this report." />
      </div>
    )
  }

  const initialData = await fetchReportData()

  return <PaymentHistoryClient initialData={initialData} userId={profile?.user_id ?? undefined} />
}

export default function CustomerPaymentHistoryPage() {
  return (
    <Suspense fallback={<ReportSkeleton columns={5} summaryCards={3} />}>
      <PaymentHistoryContent />
    </Suspense>
  )
}
