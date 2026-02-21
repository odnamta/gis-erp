import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { RevenueByProjectClient } from './revenue-project-client'
import { ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { getUserProfile } from '@/lib/permissions-server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { buildRevenueByProjectReport, RevenueByProjectReport } from '@/lib/reports/revenue-project-utils'
import { startOfYear, endOfYear } from 'date-fns'

export const metadata = {
  title: 'Revenue by Project | Gama ERP',
  description: 'Revenue and profit analysis by project',
}

async function fetchReportData(): Promise<RevenueByProjectReport | null> {
  const supabase = await createClient()
  const now = new Date()
  const startDate = startOfYear(now).toISOString().split('T')[0]
  const endDate = endOfYear(now).toISOString().split('T')[0]

  const { data: joData, error } = await supabase
    .from('job_orders')
    .select(`
      id,
      final_revenue,
      final_cost,
      proforma_job_orders!inner (
        projects!inner (
          id,
          name,
          customers!inner (name)
        )
      )
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .in('status', ['completed', 'invoiced', 'closed'])

  if (error) {
    console.error('Error fetching revenue by project:', error)
    return null
  }

  const transformedData = (joData || []).map(jo => ({
    projectId: (jo as any).proforma_job_orders?.projects?.id || '',
    projectName: (jo as any).proforma_job_orders?.projects?.name || 'Unknown',
    customerName: (jo as any).proforma_job_orders?.projects?.customers?.name || 'Unknown',
    revenue: jo.final_revenue || 0,
    cost: jo.final_cost || 0,
  }))

  return buildRevenueByProjectReport(transformedData, { startDate: new Date(startDate), endDate: new Date(endDate) })
}

async function RevenueByProjectContent() {
  const profile = await getUserProfile()

  if (profile && !canAccessReport(profile.role, 'revenue-by-project')) {
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

  return <RevenueByProjectClient initialData={initialData} userId={profile?.user_id ?? undefined} />
}

export default function RevenueByProjectPage() {
  return (
    <Suspense fallback={<ReportSkeleton columns={5} summaryCards={4} />}>
      <RevenueByProjectContent />
    </Suspense>
  )
}
