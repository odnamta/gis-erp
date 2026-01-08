import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { JOSummaryClient } from './jo-summary-client'
import { ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { getUserProfile } from '@/lib/permissions-server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { buildJOSummaryReport, JOSummaryReport, JOStatus } from '@/lib/reports/jo-summary-utils'
import { startOfYear, endOfYear } from 'date-fns'

export const metadata = {
  title: 'Job Order Summary | Gama ERP',
  description: 'Overview of all job orders',
}

async function fetchReportData(): Promise<JOSummaryReport | null> {
  const supabase = await createClient()
  const now = new Date()
  const startDate = startOfYear(now).toISOString().split('T')[0]
  const endDate = endOfYear(now).toISOString().split('T')[0]

  const { data: joData, error } = await supabase
    .from('job_orders')
    .select(`
      id,
      jo_number,
      status,
      final_revenue,
      final_cost,
      completed_at,
      proforma_job_orders!inner (
        projects!inner (
          name,
          customers!inner (name)
        )
      )
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  if (error) {
    console.error('Error fetching JO summary:', error)
    return null
  }

  const items = (joData || []).map(jo => {
    const revenue = jo.final_revenue || 0
    const cost = jo.final_cost || 0
    return {
      joId: jo.id,
      joNumber: jo.jo_number,
      customerName: (jo as any).proforma_job_orders?.projects?.customers?.name || 'Unknown',
      projectName: (jo as any).proforma_job_orders?.projects?.name || 'Unknown',
      status: jo.status as JOStatus,
      revenue,
      cost,
      margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
      completedDate: jo.completed_at ? new Date(jo.completed_at) : undefined,
    }
  })

  return buildJOSummaryReport(items, { startDate: new Date(startDate), endDate: new Date(endDate) })
}

async function JOSummaryContent() {
  const profile = await getUserProfile()

  if (profile && !canAccessReport(profile.role, 'jo-summary')) {
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

  return <JOSummaryClient initialData={initialData} userId={profile?.user_id ?? undefined} />
}

export default function JOSummaryPage() {
  return (
    <Suspense fallback={<ReportSkeleton columns={7} summaryCards={4} />}>
      <JOSummaryContent />
    </Suspense>
  )
}
