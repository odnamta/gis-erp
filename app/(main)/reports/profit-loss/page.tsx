import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ProfitLossClient } from './profit-loss-client'
import { ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { getUserProfile } from '@/lib/permissions-server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { buildPLReportData } from '@/lib/reports/profit-loss-utils'
import { startOfYear, endOfYear } from 'date-fns'
import { PLReportData } from '@/types/reports'

export const metadata = {
  title: 'Profit & Loss Statement | Gama ERP',
  description: 'Revenue, costs, and margins by period',
}

async function fetchReportData(): Promise<PLReportData | null> {
  const supabase = await createClient()
  const now = new Date()
  const startDate = startOfYear(now).toISOString().split('T')[0]
  const endDate = endOfYear(now).toISOString().split('T')[0]

  const { data: revenueData, error: revenueError } = await supabase
    .from('pjo_revenue_items')
    .select(`
      description,
      subtotal,
      unit,
      proforma_job_orders!inner (created_at, status)
    `)
    .gte('proforma_job_orders.created_at', startDate)
    .lte('proforma_job_orders.created_at', endDate)
    .in('proforma_job_orders.status', ['approved', 'converted'])

  if (revenueError) {
    console.error('Error fetching revenue data:', revenueError)
    return null
  }

  const { data: costData, error: costError } = await supabase
    .from('pjo_cost_items')
    .select(`
      category,
      actual_amount,
      estimated_amount,
      proforma_job_orders!inner (created_at, status)
    `)
    .gte('proforma_job_orders.created_at', startDate)
    .lte('proforma_job_orders.created_at', endDate)
    .in('proforma_job_orders.status', ['approved', 'converted'])

  if (costError) {
    console.error('Error fetching cost data:', costError)
    return null
  }

  const revenueItems = ((revenueData || []) as any[]).map(item => ({
    description: item.description,
    subtotal: item.subtotal ?? 0,
    unit: item.unit,
  }))

  const costItems = ((costData || []) as any[]).map(item => ({
    category: item.category,
    actual_amount: item.actual_amount,
    estimated_amount: item.estimated_amount,
  }))

  return buildPLReportData(revenueItems, costItems, {
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  })
}

async function ProfitLossContent() {
  const profile = await getUserProfile()

  if (profile && !canAccessReport(profile.role, 'profit-loss')) {
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

  return <ProfitLossClient initialData={initialData} userId={profile?.user_id ?? undefined} />
}

export default function ProfitLossPage() {
  return (
    <Suspense fallback={<ReportSkeleton summaryCards={4} />}>
      <ProfitLossContent />
    </Suspense>
  )
}
