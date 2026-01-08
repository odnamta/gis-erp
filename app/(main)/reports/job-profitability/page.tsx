import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { JobProfitabilityClient } from './profitability-client'
import { ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { getUserProfile } from '@/lib/permissions-server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { JobProfitabilityData } from '@/lib/reports/profitability-utils'

export const metadata = {
  title: 'Job Profitability Report | Gama ERP',
  description: 'Net profit and margin analysis by job',
}

type JobOrderRow = {
  id: string
  jo_number: string
  final_revenue: number | null
  final_cost: number | null
  equipment_cost: number | null
  status: string
  created_at: string | null
  customers: { id: string; name: string } | null
  projects: { id: string; name: string } | null
}

async function fetchReportData(): Promise<JobProfitabilityData[]> {
  const supabase = await createClient()

  const { data: jobOrders, error } = await supabase
    .from('job_orders')
    .select(`
      id,
      jo_number,
      final_revenue,
      final_cost,
      equipment_cost,
      status,
      created_at,
      customers (id, name),
      projects (id, name)
    `)
    .in('status', ['completed', 'submitted_to_finance', 'invoiced', 'closed'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching job orders:', error)
    return []
  }

  // Transform to profitability data
  const profitabilityData = ((jobOrders || []) as unknown as JobOrderRow[]).map(job => {
    const revenue = job.final_revenue ?? 0
    const directCost = job.final_cost ?? 0
    const equipmentCost = job.equipment_cost ?? 0
    const overhead = 0
    const netProfit = revenue - directCost - equipmentCost - overhead
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

    return {
      joId: job.id,
      joNumber: job.jo_number,
      customerName: job.customers?.name ?? 'Unknown',
      projectName: job.projects?.name ?? 'Unknown',
      revenue,
      directCost,
      equipmentCost,
      overhead,
      netProfit,
      netMargin,
      createdAt: new Date(job.created_at || new Date()),
    }
  })

  return profitabilityData
}

async function JobProfitabilityContent() {
  const profile = await getUserProfile()

  // Check permissions
  if (profile && !canAccessReport(profile.role, 'profit-loss')) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back to Reports</Link>
          </Button>
        </div>
        <ReportEmptyState
          title="Access Denied"
          message="You don't have permission to view this report."
        />
      </div>
    )
  }

  // Fetch data on server
  const initialData = await fetchReportData()

  return (
    <JobProfitabilityClient
      initialData={initialData}
      userId={profile?.user_id ?? undefined}
    />
  )
}

export default function JobProfitabilityPage() {
  return (
    <Suspense fallback={<ReportSkeleton variant="profitability" />}>
      <JobProfitabilityContent />
    </Suspense>
  )
}
