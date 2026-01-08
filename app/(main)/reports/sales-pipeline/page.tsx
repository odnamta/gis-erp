import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { SalesPipelineClient } from './sales-pipeline-client'
import { ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { getUserProfile } from '@/lib/permissions-server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { buildSalesPipelineReport, SalesPipelineReport } from '@/lib/reports/sales-pipeline-utils'
import { startOfYear, endOfYear } from 'date-fns'
import { PJOStatusForReport } from '@/types/reports'

export const metadata = {
  title: 'Sales Pipeline Analysis | Gama ERP',
  description: 'PJO pipeline stages and weighted values',
}

async function fetchReportData(): Promise<SalesPipelineReport | null> {
  const supabase = await createClient()
  const now = new Date()
  const startDate = startOfYear(now).toISOString().split('T')[0]
  const endDate = endOfYear(now).toISOString().split('T')[0]

  const { data: pjoData, error } = await supabase
    .from('proforma_job_orders')
    .select('id, status, total_revenue')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  if (error) {
    console.error('Error fetching sales pipeline:', error)
    return null
  }

  const pjos = (pjoData || []).map(pjo => ({
    status: pjo.status as PJOStatusForReport,
    value: pjo.total_revenue || 0,
  }))

  return buildSalesPipelineReport(pjos, { startDate: new Date(startDate), endDate: new Date(endDate) })
}

async function SalesPipelineContent() {
  const profile = await getUserProfile()

  if (profile && !canAccessReport(profile.role, 'sales-pipeline')) {
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

  return <SalesPipelineClient initialData={initialData} userId={profile?.user_id ?? undefined} />
}

export default function SalesPipelinePage() {
  return (
    <Suspense fallback={<ReportSkeleton columns={6} summaryCards={3} />}>
      <SalesPipelineContent />
    </Suspense>
  )
}
