import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ARAgingClient } from './ar-aging-client'
import { ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { getUserProfile } from '@/lib/permissions-server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { buildARAgingReportData, InvoiceData } from '@/lib/reports/ar-aging-utils'
import { ARAgingReportData } from '@/types/reports'

export const metadata = {
  title: 'AR Aging Report | Gama ERP',
  description: 'Outstanding invoices by age',
}

async function fetchReportData(): Promise<ARAgingReportData | null> {
  const supabase = await createClient()

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      invoice_date,
      due_date,
      total_amount,
      customers (name)
    `)
    .in('status', ['sent', 'overdue'])
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching AR aging data:', error)
    return null
  }

  return buildARAgingReportData(invoices as unknown as InvoiceData[] || [])
}

async function ARAgingContent() {
  const profile = await getUserProfile()

  if (profile && !canAccessReport(profile.role, 'ar-aging')) {
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

  return <ARAgingClient initialData={initialData} userId={profile?.user_id ?? undefined} />
}

export default function ARAgingPage() {
  return (
    <Suspense fallback={<ReportSkeleton showFilters={false} columns={6} summaryCards={5} />}>
      <ARAgingContent />
    </Suspense>
  )
}
