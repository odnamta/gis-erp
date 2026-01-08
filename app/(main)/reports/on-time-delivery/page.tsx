import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { OnTimeDeliveryClient } from './on-time-delivery-client'
import { ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { getUserProfile } from '@/lib/permissions-server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { buildOnTimeDeliveryReport, classifyDelivery, OnTimeDeliveryReport } from '@/lib/reports/on-time-delivery-utils'
import { startOfYear, endOfYear } from 'date-fns'

export const metadata = {
  title: 'On-Time Delivery Report | Gama ERP',
  description: 'Delivery performance metrics',
}

async function fetchReportData(): Promise<OnTimeDeliveryReport | null> {
  const supabase = await createClient()
  const now = new Date()
  const startDate = startOfYear(now).toISOString().split('T')[0]
  const endDate = endOfYear(now).toISOString().split('T')[0]

  const { data: joData, error } = await supabase
    .from('job_orders')
    .select(`
      id,
      jo_number,
      created_at,
      completed_at,
      proforma_job_orders!inner (
        projects!inner (
          customers!inner (name)
        )
      )
    `)
    .gte('completed_at', startDate)
    .lte('completed_at', endDate)
    .not('completed_at', 'is', null)

  if (error) {
    console.error('Error fetching on-time delivery data:', error)
    return null
  }

  const items = (joData || [])
    .filter(jo => jo.created_at && jo.completed_at)
    .map(jo => {
      const createdDate = new Date(jo.created_at!)
      const scheduledDate = new Date(createdDate.getTime() + 14 * 24 * 60 * 60 * 1000)
      const completedDate = new Date(jo.completed_at!)
      const classification = classifyDelivery(scheduledDate, completedDate)

      return {
        joId: jo.id,
        joNumber: jo.jo_number,
        customerName: (jo as any).proforma_job_orders?.projects?.customers?.name || 'Unknown',
        scheduledDate,
        completedDate,
        ...classification,
      }
    })

  return buildOnTimeDeliveryReport(items, { startDate: new Date(startDate), endDate: new Date(endDate) })
}

async function OnTimeDeliveryContent() {
  const profile = await getUserProfile()

  if (profile && !canAccessReport(profile.role, 'on-time-delivery')) {
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

  return <OnTimeDeliveryClient initialData={initialData} userId={profile?.user_id ?? undefined} />
}

export default function OnTimeDeliveryPage() {
  return (
    <Suspense fallback={<ReportSkeleton columns={6} summaryCards={4} />}>
      <OnTimeDeliveryContent />
    </Suspense>
  )
}
