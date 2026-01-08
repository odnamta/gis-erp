import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { CostAnalysisClient } from './cost-analysis-client'
import { ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { getUserProfile } from '@/lib/permissions-server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { buildCostAnalysisReport, CostAnalysisItem } from '@/lib/reports/cost-analysis-utils'
import { startOfYear, endOfYear } from 'date-fns'

export const metadata = {
  title: 'Cost Analysis Report | Gama ERP',
  description: 'Detailed cost breakdown by category',
}

async function fetchReportData(): Promise<{ items: CostAnalysisItem[]; totalCost: number }> {
  const supabase = await createClient()

  // Default to this year's data
  const now = new Date()
  const startDate = startOfYear(now).toISOString().split('T')[0]
  const endDate = endOfYear(now).toISOString().split('T')[0]

  const { data: costData, error } = await supabase
    .from('pjo_cost_items')
    .select(`
      category,
      actual_amount,
      estimated_amount,
      proforma_job_orders!inner (
        id,
        created_at,
        job_orders (id)
      )
    `)
    .gte('proforma_job_orders.created_at', startDate)
    .lte('proforma_job_orders.created_at', endDate)

  if (error) {
    console.error('Error fetching cost data:', error)
    return { items: [], totalCost: 0 }
  }

  type CostDataRow = {
    category: string
    actual_amount: number | null
    estimated_amount: number | null
    proforma_job_orders?: { id: string; job_orders?: { id: string } | null }
  }

  const costItems = ((costData || []) as unknown as CostDataRow[]).map(item => ({
    category: item.category,
    amount: item.actual_amount ?? item.estimated_amount ?? 0,
    joId: item.proforma_job_orders?.job_orders?.id || item.proforma_job_orders?.id || '',
  }))

  const report = buildCostAnalysisReport(costItems, {
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  })

  return {
    items: report.items,
    totalCost: report.totalCost,
  }
}

async function CostAnalysisContent() {
  const profile = await getUserProfile()

  // Check permissions
  if (profile && !canAccessReport(profile.role, 'cost-analysis')) {
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
    <CostAnalysisClient
      initialData={initialData}
      userId={profile?.user_id ?? undefined}
    />
  )
}

export default function CostAnalysisPage() {
  return (
    <Suspense fallback={<ReportSkeleton columns={5} summaryCards={3} />}>
      <CostAnalysisContent />
    </Suspense>
  )
}
