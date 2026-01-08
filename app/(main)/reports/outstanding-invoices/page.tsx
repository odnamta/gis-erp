import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { OutstandingInvoicesClient } from './outstanding-invoices-client'
import { ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { getUserProfile } from '@/lib/permissions-server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { buildOutstandingInvoicesReport, calculateDaysOutstanding, getAgingBucket, OutstandingInvoicesReport } from '@/lib/reports/outstanding-invoices-utils'

export const metadata = {
  title: 'Outstanding Invoices | Gama ERP',
  description: 'All unpaid invoices with aging breakdown',
}

async function fetchReportData(): Promise<OutstandingInvoicesReport | null> {
  const supabase = await createClient()

  const { data: invoiceData, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      total_amount,
      invoice_date,
      due_date,
      job_orders!inner (
        jo_number,
        proforma_job_orders!inner (
          projects!inner (
            customers!inner (name)
          )
        )
      )
    `)
    .in('status', ['draft', 'sent', 'overdue'])

  if (error) {
    console.error('Error fetching outstanding invoices:', error)
    return null
  }

  const items = ((invoiceData || []) as any[]).map(inv => {
    const daysOutstanding = calculateDaysOutstanding(new Date(inv.due_date))
    return {
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      customerName: inv.job_orders?.proforma_job_orders?.projects?.customers?.name || 'Unknown',
      joNumber: inv.job_orders?.jo_number || 'Unknown',
      invoiceDate: new Date(inv.invoice_date),
      dueDate: new Date(inv.due_date),
      amount: inv.total_amount || 0,
      daysOutstanding,
      agingBucket: getAgingBucket(daysOutstanding),
    }
  })

  return buildOutstandingInvoicesReport(items)
}

async function OutstandingInvoicesContent() {
  const profile = await getUserProfile()

  if (profile && !canAccessReport(profile.role, 'outstanding-invoices')) {
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

  return <OutstandingInvoicesClient initialData={initialData} userId={profile?.user_id ?? undefined} />
}

export default function OutstandingInvoicesPage() {
  return (
    <Suspense fallback={<ReportSkeleton columns={7} summaryCards={2} />}>
      <OutstandingInvoicesContent />
    </Suspense>
  )
}
