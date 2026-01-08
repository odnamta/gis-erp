import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { RevenueByCustomerClient } from './revenue-customer-client'
import { ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { getUserProfile } from '@/lib/permissions-server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { buildRevenueByCustomerReport, RevenueByCustomerItem } from '@/lib/reports/revenue-customer-utils'
import { startOfYear, endOfYear } from 'date-fns'

export const metadata = {
  title: 'Revenue by Customer Report | Gama ERP',
  description: 'Revenue breakdown by customer from completed JOs',
}

async function fetchReportData(): Promise<{
  items: RevenueByCustomerItem[]
  totalRevenue: number
  customerCount: number
}> {
  const supabase = await createClient()

  // Default to this year's data
  const now = new Date()
  const startDate = startOfYear(now).toISOString().split('T')[0]
  const endDate = endOfYear(now).toISOString().split('T')[0]

  // Fetch JO data with customer info and revenue
  const { data: joData, error } = await supabase
    .from('job_orders')
    .select(`
      id,
      final_revenue,
      proforma_job_orders!inner (
        projects!inner (
          customers!inner (
            id,
            name
          )
        )
      )
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .in('status', ['completed', 'invoiced', 'closed'])

  if (error) {
    console.error('Error fetching revenue data:', error)
    return { items: [], totalRevenue: 0, customerCount: 0 }
  }

  type JODataRow = {
    id: string
    final_revenue: number | null
    proforma_job_orders?: {
      projects?: {
        customers?: { id: string; name: string }
      }
    }
  }

  const transformedData = ((joData || []) as unknown as JODataRow[]).map(jo => ({
    customerId: jo.proforma_job_orders?.projects?.customers?.id || '',
    customerName: jo.proforma_job_orders?.projects?.customers?.name || 'Unknown',
    revenue: jo.final_revenue || 0,
  }))

  const report = buildRevenueByCustomerReport(transformedData, {
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  })

  return {
    items: report.items,
    totalRevenue: report.totalRevenue,
    customerCount: report.customerCount,
  }
}

async function RevenueByCustomerContent() {
  const profile = await getUserProfile()

  // Check permissions
  if (profile && !canAccessReport(profile.role, 'revenue-customer')) {
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
    <RevenueByCustomerClient
      initialData={initialData}
      userId={profile?.user_id ?? undefined}
    />
  )
}

export default function RevenueByCustomerPage() {
  return (
    <Suspense fallback={<ReportSkeleton columns={4} summaryCards={3} />}>
      <RevenueByCustomerContent />
    </Suspense>
  )
}
