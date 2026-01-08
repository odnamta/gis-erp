import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { BudgetVarianceClient } from './budget-variance-client'
import { ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { getUserProfile } from '@/lib/permissions-server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { buildBudgetVarianceReportData } from '@/lib/reports/budget-variance-utils'
import { startOfYear, endOfYear } from 'date-fns'
import { BudgetVarianceItem } from '@/types/reports'

export const metadata = {
  title: 'Budget Variance Report | Gama ERP',
  description: 'Estimated vs actual costs per PJO',
}

async function fetchReportData(): Promise<{
  items: BudgetVarianceItem[]
  summary: { totalEstimated: number; totalActual: number; totalVariance: number; itemsWithWarning: number }
}> {
  const supabase = await createClient()
  const now = new Date()
  const startDate = startOfYear(now).toISOString().split('T')[0]
  const endDate = endOfYear(now).toISOString().split('T')[0]

  const { data: pjos, error } = await supabase
    .from('proforma_job_orders')
    .select(`
      id,
      pjo_number,
      total_cost_estimated,
      total_cost_actual,
      customers (name)
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .in('status', ['approved', 'converted'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching budget variance data:', error)
    return { items: [], summary: { totalEstimated: 0, totalActual: 0, totalVariance: 0, itemsWithWarning: 0 } }
  }

  const data = buildBudgetVarianceReportData(pjos || [], {
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  })

  return { items: data.items, summary: data.summary }
}

async function BudgetVarianceContent() {
  const profile = await getUserProfile()

  if (profile && !canAccessReport(profile.role, 'budget-variance')) {
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

  return <BudgetVarianceClient initialData={initialData} userId={profile?.user_id ?? undefined} />
}

export default function BudgetVariancePage() {
  return (
    <Suspense fallback={<ReportSkeleton columns={6} summaryCards={4} />}>
      <BudgetVarianceContent />
    </Suspense>
  )
}
