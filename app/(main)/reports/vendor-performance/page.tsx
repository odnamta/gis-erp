import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { VendorPerformanceClient } from './vendor-performance-client'
import { ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { getUserProfile } from '@/lib/permissions-server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { buildVendorPerformanceReport, VendorPerformanceReport } from '@/lib/reports/vendor-performance-utils'
import { startOfYear, endOfYear } from 'date-fns'

export const metadata = {
  title: 'Cost Category Analysis | Gama ERP',
  description: 'Spend analysis by cost category',
}

async function fetchReportData(): Promise<VendorPerformanceReport | null> {
  const supabase = await createClient()
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
    .not('category', 'is', null)

  if (error) {
    console.error('Error fetching vendor performance:', error)
    return null
  }

  const costItems = ((costData || []) as any[]).map(item => ({
    vendorName: item.category || 'Unknown',
    amount: item.actual_amount ?? item.estimated_amount ?? 0,
    joId: item.proforma_job_orders?.job_orders?.[0]?.id || item.proforma_job_orders?.id || '',
  }))

  return buildVendorPerformanceReport(costItems, { startDate: new Date(startDate), endDate: new Date(endDate) })
}

async function VendorPerformanceContent() {
  const profile = await getUserProfile()

  if (profile && !canAccessReport(profile.role, 'vendor-performance')) {
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

  return <VendorPerformanceClient initialData={initialData} userId={profile?.user_id ?? undefined} />
}

export default function VendorPerformancePage() {
  return (
    <Suspense fallback={<ReportSkeleton columns={5} summaryCards={3} />}>
      <VendorPerformanceContent />
    </Suspense>
  )
}
